// ============================================================================
// MÓDULO INVENTARIO DE PRODUCTO TERMINADO (PT) — PrintLab
// Lotes + Calidad, Bodegas, Existencias, Movimientos, Reservas,
// Solicitudes de Despacho, Despachos e Integración SAP.
// Patrón: módulo autocontenido que recibe { app, pgQuery, withTransaction }.
// ============================================================================
const crypto = require('crypto');

const MODULE_KEY = 'inventario-pt';
const API = '/api/inventario-pt';

const ESTADOS_LOTE = ['PENDIENTE', 'EN_INSPECCION', 'APROBADO', 'APROBADO_CON_OBSERVACIONES', 'RECHAZADO', 'BLOQUEADO', 'LIBERADO'];
const ESTADOS_ENTRADA_PERMITIDOS = ['APROBADO', 'APROBADO_CON_OBSERVACIONES', 'LIBERADO'];
const ESTADOS_SOLICITUD = ['BORRADOR', 'PENDIENTE', 'APROBADA', 'RESERVADA', 'EN_PREPARACION', 'PREPARADA', 'DESPACHADA_PARCIAL', 'DESPACHADA', 'CANCELADA'];
const ESTADOS_DESPACHO = ['EN_PREPARACION', 'DESPACHADO_PARCIAL', 'DESPACHADO', 'CANCELADO', 'REVERSADO'];
const ESTADOS_SAP = ['BORRADOR', 'PENDIENTE', 'EN_COLA', 'ENVIANDO', 'PROCESADO', 'PROCESADO_PARCIAL', 'ERROR', 'REINTENTO_PROGRAMADO', 'CANCELADO', 'REVERSADO'];
const TIPOS_MOVIMIENTO = ['ENTRADA_PRODUCCION', 'LIBERACION_CALIDAD', 'BLOQUEO_CALIDAD', 'DESBLOQUEO_CALIDAD', 'RESERVA_PEDIDO', 'MODIFICACION_RESERVA', 'LIBERACION_RESERVA', 'INICIO_DESPACHO', 'CONFIRMACION_DESPACHO', 'CANCELACION_DESPACHO', 'SALIDA_SAP', 'REVERSO_SAP', 'DEVOLUCION_CLIENTE', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'CORRECCION_AUTORIZADA'];
const UNIDADES = ['UN', 'MILLAR', 'ROLLO', 'CAJA', 'PAQUETE', 'METRO', 'KG'];
const SAP_MAX_REINTENTOS = 3;
const SAP_SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;

// ─── HELPERS BÁSICOS ─────────────────────────────────────────────────────────

function sanitizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toJson(value) {
    if (value === null || value === undefined) return null;
    try {
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
        return null;
    }
}

function readSession(req) {
    const raw = String(req.get && req.get('x-erp-session') ? req.get('x-erp-session') : '');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function isSuperPermission(name) {
    return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(sanitizeText(name));
}

function moduleAccess(session, moduleKey, access) {
    if (!session) return true;
    if (isSuperPermission(session.permissionName)) return true;
    const modules = session.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules || !Object.keys(modules).length) return true;
    const level = modules[moduleKey];
    const flags = level && typeof level === 'object'
        ? { view: Boolean(level.view || level.create || level.edit), create: Boolean(level.create || level.edit), edit: Boolean(level.edit) }
        : { view: false, create: false, edit: false };
    if (access === 'view') return flags.view;
    if (access === 'create') return flags.create;
    if (access === 'edit') return flags.edit;
    return false;
}

function sessionUser(req) {
    const session = readSession(req);
    const id = Number(session && (session.id || session.userId || session.sessionId));
    return {
        id: Number.isFinite(id) && id > 0 ? id : null,
        name: sanitizeText(session && (session.fullName || session.name || session.user || session.username)),
        username: sanitizeText(session && (session.username || session.user))
    };
}

function requestIp(req) {
    const forwarded = sanitizeText(req.headers && req.headers['x-forwarded-for']);
    if (forwarded && forwarded.includes(',')) return forwarded.split(',')[0].trim();
    return forwarded || (req.connection && req.connection.remoteAddress) || '';
}

function calcularEstadoInventario(row) {
    const fisica = toNumber(row.cantidad_fisica);
    const reservada = toNumber(row.cantidad_reservada);
    const bloqueada = toNumber(row.cantidad_bloqueada);
    const enDespacho = toNumber(row.cantidad_en_despacho);
    const disponible = fisica - reservada - bloqueada - enDespacho;
    if (fisica <= 0) return 'AGOTADO';
    if (bloqueada >= fisica && bloqueada > 0) return 'BLOQUEADO';
    if (enDespacho >= fisica && enDespacho > 0) return 'EN_DESPACHO';
    if (reservada >= fisica && reservada > 0) return 'RESERVADO';
    if (reservada > 0 || bloqueada > 0 || enDespacho > 0) return 'PARCIALMENTE_RESERVADO';
    return disponible > 0 ? 'DISPONIBLE' : 'AGOTADO';
}

async function generarSecuencia(client, tipo, prefijo, ancho = 6) {
    const result = await client.query(
        `INSERT INTO documento_pt_secuencias (tipo, last_correlative)
         VALUES ($1, 1)
         ON CONFLICT (tipo)
         DO UPDATE SET last_correlative = documento_pt_secuencias.last_correlative + 1,
                       updated_at = NOW()
         RETURNING last_correlative`,
        [tipo]
    );
    const correlative = Number(result.rows[0].last_correlative);
    return `${prefijo}${String(correlative).padStart(ancho, '0')}`;
}

async function generarCodigoLote(client) {
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}`;
    const result = await client.query(
        `INSERT INTO product_lot_sequences (date_code, last_correlative)
         VALUES ($1, 1)
         ON CONFLICT (date_code)
         DO UPDATE SET last_correlative = product_lot_sequences.last_correlative + 1,
                       updated_at = NOW()
         RETURNING last_correlative`,
        [dateCode]
    );
    return `${dateCode}${String(Number(result.rows[0].last_correlative)).padStart(3, '0')}`;
}

async function registrarAuditoria(client, entrada) {
    await client.query(
        `INSERT INTO auditoria_inventario_pt
         (accion, modulo, registro_tipo, registro_id, valor_anterior, valor_nuevo, motivo, usuario_id, nombre_usuario, documento_tipo, documento_id, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
            sanitizeText(entrada.accion),
            sanitizeText(entrada.modulo || MODULE_KEY),
            sanitizeText(entrada.registro_tipo || ''),
            sanitizeText(entrada.registro_id || ''),
            entrada.valor_anterior ? JSON.stringify(entrada.valor_anterior) : null,
            entrada.valor_nuevo ? JSON.stringify(entrada.valor_nuevo) : null,
            sanitizeText(entrada.motivo || ''),
            entrada.usuario_id || null,
            sanitizeText(entrada.nombre_usuario || ''),
            sanitizeText(entrada.documento_tipo || ''),
            entrada.documento_id || null,
            sanitizeText(entrada.ip || '')
        ]
    );
}

async function registrarMovimiento(client, entrada) {
    const inventarioId = Number(entrada.inventario_pt_id);
    const cantidad = toNumber(entrada.cantidad);
    const tipo = sanitizeText(entrada.tipo_movimiento);
    if (!inventarioId || !tipo || cantidad === 0) return;
    const current = await client.query(
        `SELECT cantidad_fisica FROM inventario_producto_terminado WHERE id = $1`,
        [inventarioId]
    );
    const fisica = toNumber(current.rows[0] && current.rows[0].cantidad_fisica);
    const saldoAnterior = entrada.saldo_anterior !== undefined && entrada.saldo_anterior !== null
        ? toNumber(entrada.saldo_anterior)
        : fisica;
    const saldoPosterior = entrada.saldo_posterior !== undefined && entrada.saldo_posterior !== null
        ? toNumber(entrada.saldo_posterior)
        : fisica;
    await client.query(
        `INSERT INTO movimientos_inventario_pt
         (inventario_pt_id, tipo_movimiento, cantidad, unidad, saldo_anterior, saldo_posterior, documento_tipo, documento_id, referencia_externa, usuario_id, motivo, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
            inventarioId,
            tipo,
            cantidad,
            sanitizeText(entrada.unidad || 'UN'),
            saldoAnterior,
            saldoPosterior,
            sanitizeText(entrada.documento_tipo || ''),
            entrada.documento_id || null,
            sanitizeText(entrada.referencia_externa || ''),
            entrada.usuario_id || null,
            sanitizeText(entrada.motivo || ''),
            sanitizeText(entrada.observaciones || '')
        ]
    );
}

async function actualizarEstadoInventario(client, inventarioId) {
    const result = await client.query(
        `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
        [inventarioId]
    );
    if (!result.rows[0]) return null;
    const estado = calcularEstadoInventario(result.rows[0]);
    await client.query(
        `UPDATE inventario_producto_terminado SET estado = $2, updated_at = NOW() WHERE id = $1`,
        [inventarioId, estado]
    );
    return { ...result.rows[0], estado };
}

// ─── ESQUEMA (Fases 2-4) ────────────────────────────────────────────────────

const DDL_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS bodega_pt (
        id BIGSERIAL PRIMARY KEY,
        codigo_bodega TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        codigo_sap TEXT,
        ubicacion TEXT,
        activo BOOLEAN NOT NULL DEFAULT true,
        creado_por BIGINT,
        actualizado_por BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ubicacion_pt (
        id BIGSERIAL PRIMARY KEY,
        bodega_id BIGINT NOT NULL REFERENCES bodega_pt(id) ON DELETE CASCADE,
        codigo_ubicacion TEXT NOT NULL,
        nombre TEXT,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (bodega_id, codigo_ubicacion)
    )`,
    `CREATE TABLE IF NOT EXISTS lote_producto_terminado (
        id BIGSERIAL PRIMARY KEY,
        codigo_lote TEXT NOT NULL UNIQUE,
        orden_produccion_id UUID REFERENCES flexo_orders(id) ON DELETE SET NULL,
        producto_id UUID REFERENCES flexo_products(id) ON DELETE SET NULL,
        cliente_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
        pedido_cliente TEXT,
        fecha_produccion DATE,
        turno TEXT,
        maquina_id UUID REFERENCES maquina(id) ON DELETE SET NULL,
        operador_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
        cantidad_producida NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_aprobada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_rechazada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_enviada_bodega NUMERIC(18,4) NOT NULL DEFAULT 0,
        estado_calidad TEXT NOT NULL DEFAULT 'PENDIENTE',
        fecha_liberacion TIMESTAMPTZ,
        usuario_liberacion BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
        numero_rollos INTEGER,
        cantidad_por_rollo NUMERIC(18,4),
        numero_cajas INTEGER,
        cantidad_por_caja NUMERIC(18,4),
        diametro_rollo_mm NUMERIC(12,4),
        ancho_bobina_mm NUMERIC(12,4),
        nucleo TEXT,
        sentido_embobinado TEXT,
        sentido_salida TEXT,
        calibre_sustrato_micras NUMERIC(12,4),
        numero_diseno TEXT,
        revision_arte TEXT,
        tipo_tinta TEXT,
        tipo_barniz TEXT,
        acabado TEXT,
        fecha_vencimiento DATE,
        especificaciones_embalaje TEXT,
        observaciones TEXT,
        creado_por BIGINT,
        actualizado_por BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lote_pt_producto ON lote_producto_terminado(producto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lote_pt_orden ON lote_producto_terminado(orden_produccion_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lote_pt_estado ON lote_producto_terminado(estado_calidad)`,
    `CREATE INDEX IF NOT EXISTS idx_lote_pt_cliente ON lote_producto_terminado(cliente_id)`,
    `CREATE TABLE IF NOT EXISTS inventario_producto_terminado (
        id BIGSERIAL PRIMARY KEY,
        producto_id UUID NOT NULL REFERENCES flexo_products(id) ON DELETE CASCADE,
        lote_id BIGINT NOT NULL REFERENCES lote_producto_terminado(id) ON DELETE CASCADE,
        orden_produccion_id UUID REFERENCES flexo_orders(id) ON DELETE SET NULL,
        cliente_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
        bodega_id BIGINT NOT NULL REFERENCES bodega_pt(id),
        ubicacion_id BIGINT REFERENCES ubicacion_pt(id) ON DELETE SET NULL,
        unidad_inventario VARCHAR(20) NOT NULL DEFAULT 'UN',
        cantidad_fisica NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_reservada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_bloqueada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_en_despacho NUMERIC(18,4) NOT NULL DEFAULT 0,
        estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
        fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por BIGINT,
        actualizado_por BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT inventario_pt_no_negativo CHECK (
            cantidad_fisica >= 0 AND cantidad_reservada >= 0 AND cantidad_bloqueada >= 0 AND cantidad_en_despacho >= 0
        ),
        UNIQUE (producto_id, lote_id, bodega_id, ubicacion_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_inv_pt_producto ON inventario_producto_terminado(producto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inv_pt_lote ON inventario_producto_terminado(lote_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inv_pt_bodega ON inventario_producto_terminado(bodega_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inv_pt_estado ON inventario_producto_terminado(estado)`,
    `CREATE OR REPLACE VIEW v_inventario_pt_disponible AS
     SELECT i.*,
            (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible
       FROM inventario_producto_terminado i`,
    `CREATE TABLE IF NOT EXISTS movimientos_inventario_pt (
        id BIGSERIAL PRIMARY KEY,
        inventario_pt_id BIGINT NOT NULL REFERENCES inventario_producto_terminado(id) ON DELETE CASCADE,
        tipo_movimiento VARCHAR(50) NOT NULL,
        cantidad NUMERIC(18,4) NOT NULL,
        unidad VARCHAR(20) NOT NULL,
        saldo_anterior NUMERIC(18,4),
        saldo_posterior NUMERIC(18,4),
        documento_tipo VARCHAR(50),
        documento_id BIGINT,
        referencia_externa VARCHAR(100),
        fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        usuario_id BIGINT,
        motivo TEXT,
        observaciones TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mov_pt_inventario ON movimientos_inventario_pt(inventario_pt_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mov_pt_fecha ON movimientos_inventario_pt(fecha_movimiento)`,
    `CREATE TABLE IF NOT EXISTS reservas_inventario_pt (
        id BIGSERIAL PRIMARY KEY,
        numero_reserva TEXT NOT NULL UNIQUE,
        inventario_pt_id BIGINT NOT NULL REFERENCES inventario_producto_terminado(id),
        producto_id UUID NOT NULL,
        lote_id BIGINT NOT NULL,
        cliente_id UUID,
        pedido_id UUID,
        cantidad_reservada NUMERIC(18,4) NOT NULL CHECK (cantidad_reservada >= 0),
        unidad VARCHAR(20) NOT NULL DEFAULT 'UN',
        fecha_reserva TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fecha_expiracion TIMESTAMPTZ,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
        usuario_id BIGINT,
        observaciones TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_res_pt_inventario ON reservas_inventario_pt(inventario_pt_id)`,
    `CREATE INDEX IF NOT EXISTS idx_res_pt_estado ON reservas_inventario_pt(estado)`,
    `CREATE TABLE IF NOT EXISTS solicitud_despacho_pt (
        id BIGSERIAL PRIMARY KEY,
        numero_solicitud TEXT NOT NULL UNIQUE,
        cliente_id UUID,
        pedido_id UUID,
        fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_programada DATE,
        bodega_id BIGINT REFERENCES bodega_pt(id),
        direccion_entrega TEXT,
        transportista TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
        observaciones TEXT,
        creado_por BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sol_pt_estado ON solicitud_despacho_pt(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_sol_pt_cliente ON solicitud_despacho_pt(cliente_id)`,
    `CREATE TABLE IF NOT EXISTS solicitud_despacho_pt_detalle (
        id BIGSERIAL PRIMARY KEY,
        solicitud_id BIGINT NOT NULL REFERENCES solicitud_despacho_pt(id) ON DELETE CASCADE,
        producto_id UUID NOT NULL,
        lote_id BIGINT,
        inventario_pt_id BIGINT,
        cantidad_solicitada NUMERIC(18,4) NOT NULL CHECK (cantidad_solicitada > 0),
        cantidad_reservada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_preparada NUMERIC(18,4) NOT NULL DEFAULT 0,
        cantidad_despachada NUMERIC(18,4) NOT NULL DEFAULT 0,
        unidad VARCHAR(20) NOT NULL DEFAULT 'UN',
        reserva_id BIGINT REFERENCES reservas_inventario_pt(id) ON DELETE SET NULL,
        observaciones TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sol_det_solicitud ON solicitud_despacho_pt_detalle(solicitud_id)`,
    `CREATE TABLE IF NOT EXISTS despacho_pt (
        id BIGSERIAL PRIMARY KEY,
        numero_despacho TEXT NOT NULL UNIQUE,
        solicitud_id BIGINT REFERENCES solicitud_despacho_pt(id) ON DELETE SET NULL,
        cliente_id UUID,
        pedido_id UUID,
        bodega_id BIGINT REFERENCES bodega_pt(id),
        fecha_despacho TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fecha_confirmacion TIMESTAMPTZ,
        transportista TEXT,
        vehiculo TEXT,
        numero_guia TEXT,
        direccion_entrega TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'EN_PREPARACION',
        observaciones TEXT,
        creado_por BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_des_pt_estado ON despacho_pt(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_des_pt_solicitud ON despacho_pt(solicitud_id)`,
    `CREATE TABLE IF NOT EXISTS despacho_pt_detalle (
        id BIGSERIAL PRIMARY KEY,
        despacho_id BIGINT NOT NULL REFERENCES despacho_pt(id) ON DELETE CASCADE,
        solicitud_detalle_id BIGINT REFERENCES solicitud_despacho_pt_detalle(id) ON DELETE SET NULL,
        producto_id UUID NOT NULL,
        lote_id BIGINT,
        inventario_pt_id BIGINT NOT NULL REFERENCES inventario_producto_terminado(id),
        cantidad_despachada NUMERIC(18,4) NOT NULL CHECK (cantidad_despachada > 0),
        unidad VARCHAR(20) NOT NULL DEFAULT 'UN',
        observaciones TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_des_det_despacho ON despacho_pt_detalle(despacho_id)`,
    `CREATE TABLE IF NOT EXISTS integracion_sap_inventario (
        id BIGSERIAL PRIMARY KEY,
        operacion_uuid TEXT NOT NULL UNIQUE,
        despacho_id BIGINT REFERENCES despacho_pt(id) ON DELETE SET NULL,
        despacho_detalle_id BIGINT,
        solicitud_despacho_id BIGINT,
        movimiento_id BIGINT,
        producto_id UUID,
        lote_id BIGINT,
        reserva_id BIGINT,
        tipo_documento_sap VARCHAR(50) NOT NULL DEFAULT 'InventoryGenExits',
        sap_doc_entry BIGINT,
        sap_doc_num BIGINT,
        sap_customer_code VARCHAR(50),
        sap_item_code VARCHAR(100),
        sap_warehouse_code VARCHAR(20),
        sap_batch_number VARCHAR(100),
        cantidad_enviada NUMERIC(18,4) NOT NULL DEFAULT 0,
        unidad VARCHAR(20) NOT NULL DEFAULT 'UN',
        estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
        intentos INTEGER NOT NULL DEFAULT 0,
        fecha_envio TIMESTAMPTZ,
        fecha_respuesta TIMESTAMPTZ,
        mensaje_respuesta TEXT,
        payload_enviado JSONB,
        respuesta_sap JSONB,
        usuario_id BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sap_inv_estado ON integracion_sap_inventario(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_sap_inv_despacho ON integracion_sap_inventario(despacho_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sap_inv_detalle_unico
        ON integracion_sap_inventario(despacho_detalle_id) WHERE despacho_detalle_id IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS auditoria_inventario_pt (
        id BIGSERIAL PRIMARY KEY,
        accion VARCHAR(60) NOT NULL,
        modulo VARCHAR(40) NOT NULL DEFAULT 'inventario-pt',
        registro_tipo VARCHAR(50),
        registro_id TEXT,
        valor_anterior JSONB,
        valor_nuevo JSONB,
        motivo TEXT,
        usuario_id BIGINT,
        nombre_usuario TEXT,
        documento_tipo VARCHAR(50),
        documento_id BIGINT,
        ip TEXT,
        fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_aud_pt_fecha ON auditoria_inventario_pt(fecha)`,
    `CREATE INDEX IF NOT EXISTS idx_aud_pt_registro ON auditoria_inventario_pt(registro_tipo, registro_id)`,
    `CREATE TABLE IF NOT EXISTS documento_pt_secuencias (
        tipo TEXT PRIMARY KEY,
        last_correlative BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS codigo_sap TEXT`,
    `ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS unidad_inventario VARCHAR(20) NOT NULL DEFAULT 'UN'`,
    `ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS unidad_venta VARCHAR(20)`,
    `ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(12,4) NOT NULL DEFAULT 1`,
    `ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS peso_unitario NUMERIC(12,4)`,
    `INSERT INTO bodega_pt (codigo_bodega, nombre, codigo_sap, ubicacion)
     SELECT w.warehouse_code, w.warehouse_name, w.warehouse_code, w.location
       FROM sap_warehouses w
      WHERE NOT EXISTS (SELECT 1 FROM bodega_pt b WHERE b.codigo_sap = w.warehouse_code)`,
    `INSERT INTO bodega_pt (codigo_bodega, nombre, codigo_sap)
     SELECT '01', 'Bodega Principal PT', '01'
      WHERE NOT EXISTS (SELECT 1 FROM bodega_pt WHERE codigo_bodega = '01')`,
    `UPDATE admin_permissions SET module_permissions = jsonb_set(
         module_permissions,
         '{inventario-pt}',
         CASE
             WHEN permission_name ~* 'administrador|implementador|emergencia'
                  THEN '{"view": true, "create": true, "edit": true}'::jsonb
             ELSE '{"view": true, "create": false, "edit": false}'::jsonb
         END,
         true
     ) WHERE NOT (module_permissions ? 'inventario-pt')`
];

async function ensureInventarioPtSchema(pgQuery) {
    for (const statement of DDL_STATEMENTS) {
        await pgQuery(statement);
    }
}

// ─── CATÁLOGOS PARA LA INTERFAZ ─────────────────────────────────────────────

const EXISTENCIAS_SELECT = `
    SELECT i.id,
           i.producto_id, i.lote_id, i.orden_produccion_id, i.cliente_id,
           i.bodega_id, i.ubicacion_id,
           i.unidad_inventario, i.cantidad_fisica, i.cantidad_reservada,
           i.cantidad_bloqueada, i.cantidad_en_despacho, i.estado, i.fecha_ingreso,
           (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible,
           p.product_code, p.product_name, p.codigo_sap, p.finished_product_sku,
           p.unidad_venta, p.factor_conversion, p.peso_unitario,
           bp.partner_name AS cliente_nombre, bp.partner_code,
           l.codigo_lote, l.estado_calidad, l.fecha_liberacion, l.fecha_vencimiento,
           l.cantidad_aprobada, l.cantidad_rechazada,
           o.order_code, o.order_status,
           b.codigo_bodega, b.nombre AS bodega_nombre, b.codigo_sap AS bodega_codigo_sap,
           u.codigo_ubicacion, u.nombre AS ubicacion_nombre
      FROM inventario_producto_terminado i
      JOIN flexo_products p ON p.id = i.producto_id
      JOIN lote_producto_terminado l ON l.id = i.lote_id
      LEFT JOIN business_partners bp ON bp.id = i.cliente_id
      LEFT JOIN flexo_orders o ON o.id = i.orden_produccion_id
      LEFT JOIN bodega_pt b ON b.id = i.bodega_id
      LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id`;

const LOTE_SELECT = `
    SELECT l.*,
           p.product_code, p.product_name, p.codigo_sap, p.finished_product_sku,
           p.unidad_inventario, p.unidad_venta, p.factor_conversion, p.peso_unitario,
           p.material_code, p.die_code, p.core_diameter, p.width_inches, p.labels_per_roll,
           p.cmyk_enabled, p.cantidad_pantones, p.barniz_tipo, p.process_type, p.application_type,
           bp.partner_name AS cliente_nombre, bp.partner_code,
           o.order_code, o.order_status, o.machine_name,
           m.nombre AS maquina_nombre,
           au.full_name AS operador_nombre,
           au2.full_name AS liberado_por_nombre
      FROM lote_producto_terminado l
      LEFT JOIN flexo_products p ON p.id = l.producto_id
      LEFT JOIN business_partners bp ON bp.id = l.cliente_id
      LEFT JOIN flexo_orders o ON o.id = l.orden_produccion_id
      LEFT JOIN maquina m ON m.id = l.maquina_id
      LEFT JOIN admin_users au ON au.id = l.operador_id
      LEFT JOIN admin_users au2 ON au2.id = l.usuario_liberacion`;

async function listarProductos(pgQuery, texto = '') {
    const params = [];
    let where = 'WHERE p.product_code IS NOT NULL';
    if (texto) {
        params.push(`%${texto}%`);
        where += ` AND (p.product_code ILIKE $1 OR p.product_name ILIKE $1 OR p.finished_product_sku ILIKE $1 OR p.codigo_sap ILIKE $1)`;
    }
    const { rows } = await pgQuery(
        `SELECT p.id, p.product_code, p.product_name, p.codigo_sap, p.finished_product_sku,
                p.unidad_inventario, p.unidad_venta, p.factor_conversion, p.peso_unitario,
                p.client_code, p.customer_code, p.client_name
           FROM flexo_products p
           ${where}
          ORDER BY p.product_code
          LIMIT 300`,
        params
    );
    return rows;
}

async function listarOrdenesProduccion(pgQuery, texto = '') {
    const params = [];
    let where = 'WHERE o.order_code IS NOT NULL';
    if (texto) {
        params.push(`%${texto}%`);
        where += ` AND (o.order_code ILIKE $1 OR o.customer_name ILIKE $1 OR o.job_name ILIKE $1 OR o.product_code ILIKE $1)`;
    }
    const { rows } = await pgQuery(
        `SELECT o.id, o.order_code, o.product_code, o.customer_name,
                o.job_name, o.order_status, o.machine_name, o.ordered_quantity,
                o.finished_product_sku
           FROM flexo_orders o
           ${where}
          ORDER BY o.order_code DESC
          LIMIT 300`,
        params
    );
    return rows;
}

async function listarClientes(pgQuery, texto = '') {
    const params = [];
    let where = 'WHERE 1=1';
    if (texto) {
        params.push(`%${texto}%`);
        where += ` AND (bp.partner_code ILIKE $1 OR bp.partner_name ILIKE $1)`;
    }
    const { rows } = await pgQuery(
        `SELECT bp.id, bp.partner_code, bp.partner_name, bp.tax_id, bp.sector
           FROM business_partners bp
           ${where}
          ORDER BY bp.partner_name
          LIMIT 300`,
        params
    );
    return rows;
}

async function listarMaquinas(pgQuery) {
    const { rows } = await pgQuery(
        `SELECT m.id, m.nombre, m.tipo, m.activa
           FROM maquina m
          WHERE m.activa = true
          ORDER BY m.nombre`
    );
    return rows;
}

async function listarUsuarios(pgQuery) {
    const { rows } = await pgQuery(
        `SELECT u.id, u.full_name, u.username, u.department
           FROM admin_users u
          WHERE u.is_active = true
          ORDER BY u.full_name`
    );
    return rows;
}

// ─── BODEGAS Y UBICACIONES ──────────────────────────────────────────────────

async function listarBodegas(pgQuery) {
    const { rows } = await pgQuery(
        `SELECT b.*, COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
                 'id', u.id, 'codigo_ubicacion', u.codigo_ubicacion,
                 'nombre', u.nombre, 'activo', u.activo
             ) ORDER BY u.codigo_ubicacion) FILTER (WHERE u.activo = true)
             FROM ubicacion_pt u WHERE u.bodega_id = b.id
         ), '[]'::jsonb) AS ubicaciones
           FROM bodega_pt b
          ORDER BY b.nombre`
    );
    return rows;
}

async function crearBodega(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const codigoBodega = sanitizeText(datos.codigo_bodega || datos.codigo);
    const nombre = sanitizeText(datos.nombre);
    if (!codigoBodega || !nombre) {
        const error = new Error('codigo_bodega y nombre son obligatorios.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO bodega_pt (codigo_bodega, nombre, codigo_sap, ubicacion, activo, creado_por, actualizado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [codigoBodega, nombre, sanitizeText(datos.codigo_sap) || null, sanitizeText(datos.ubicacion) || null, datos.activo !== false, usuarioId, usuarioId]
        );
        await registrarAuditoria(client, {
            accion: 'CREAR_BODEGA',
            registro_tipo: 'bodega_pt',
            registro_id: String(rows[0].id),
            valor_nuevo: rows[0],
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function actualizarBodega(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM bodega_pt WHERE id = $1`, [id]);
        if (!anterior.rows[0]) {
            const error = new Error('Bodega no encontrada.');
            error.status = 404;
            throw error;
        }
        const campos = ['nombre', 'codigo_sap', 'ubicacion', 'activo'];
        const sets = [];
        const params = [];
        for (const campo of campos) {
            if (Object.prototype.hasOwnProperty.call(datos, campo)) {
                params.push(datos[campo]);
                sets.push(`${campo} = $${params.length}`);
            }
        }
        if (!sets.length) {
            const error = new Error('No se envió ningún campo para actualizar.');
            error.status = 422;
            throw error;
        }
        params.push(id);
        const { rows } = await client.query(
            `UPDATE bodega_pt SET ${sets.join(', ')}, actualizado_por = $${params.length + 1}, updated_at = NOW()
             WHERE id = $${params.length} RETURNING *`,
            [...params, usuarioId]
        );
        await registrarAuditoria(client, {
            accion: 'EDITAR_BODEGA',
            registro_tipo: 'bodega_pt',
            registro_id: String(id),
            valor_anterior: anterior.rows[0],
            valor_nuevo: rows[0],
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function eliminarBodega(pgQuery, withTransaction, id, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const existe = await client.query(
            `SELECT 1 FROM inventario_producto_terminado WHERE bodega_id = $1 LIMIT 1`,
            [id]
        );
        if (existe.rows[0]) {
            const error = new Error('No se puede eliminar la bodega porque tiene existencias asociadas. Puede desactivarla.');
            error.status = 409;
            throw error;
        }
        const anterior = await client.query(`SELECT * FROM bodega_pt WHERE id = $1`, [id]);
        await client.query(`DELETE FROM bodega_pt WHERE id = $1`, [id]);
        await registrarAuditoria(client, {
            accion: 'ELIMINAR_BODEGA',
            registro_tipo: 'bodega_pt',
            registro_id: String(id),
            valor_anterior: anterior.rows[0] || null,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ok: true };
    });
}

async function crearUbicacion(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const bodegaId = Number(datos.bodega_id);
    const codigo = sanitizeText(datos.codigo_ubicacion || datos.codigo);
    if (!bodegaId || !codigo) {
        const error = new Error('bodega_id y codigo_ubicacion son obligatorios.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO ubicacion_pt (bodega_id, codigo_ubicacion, nombre, activo)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [bodegaId, codigo, sanitizeText(datos.nombre) || null, datos.activo !== false]
        );
        await registrarAuditoria(client, {
            accion: 'CREAR_UBICACION',
            registro_tipo: 'ubicacion_pt',
            registro_id: String(rows[0].id),
            valor_nuevo: rows[0],
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function actualizarUbicacion(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM ubicacion_pt WHERE id = $1`, [id]);
        if (!anterior.rows[0]) {
            const error = new Error('Ubicación no encontrada.');
            error.status = 404;
            throw error;
        }
        const sets = [];
        const params = [];
        for (const campo of ['nombre', 'activo']) {
            if (Object.prototype.hasOwnProperty.call(datos, campo)) {
                params.push(datos[campo]);
                sets.push(`${campo} = $${params.length}`);
            }
        }
        if (!sets.length) {
            const error = new Error('No se envió ningún campo para actualizar.');
            error.status = 422;
            throw error;
        }
        params.push(id);
        const { rows } = await client.query(
            `UPDATE ubicacion_pt SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
            params
        );
        await registrarAuditoria(client, {
            accion: 'EDITAR_UBICACION',
            registro_tipo: 'ubicacion_pt',
            registro_id: String(id),
            valor_anterior: anterior.rows[0],
            valor_nuevo: rows[0],
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function eliminarUbicacion(pgQuery, withTransaction, id, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const existe = await client.query(
            `SELECT 1 FROM inventario_producto_terminado WHERE ubicacion_id = $1 LIMIT 1`,
            [id]
        );
        if (existe.rows[0]) {
            const error = new Error('No se puede eliminar la ubicación porque tiene existencias asociadas.');
            error.status = 409;
            throw error;
        }
        const anterior = await client.query(`SELECT * FROM ubicacion_pt WHERE id = $1`, [id]);
        await client.query(`DELETE FROM ubicacion_pt WHERE id = $1`, [id]);
        await registrarAuditoria(client, {
            accion: 'ELIMINAR_UBICACION',
            registro_tipo: 'ubicacion_pt',
            registro_id: String(id),
            valor_anterior: anterior.rows[0] || null,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ok: true };
    });
}

// ─── LOTES Y CALIDAD ────────────────────────────────────────────────────────

function loteFlexoColumns(datos) {
    return {
        numero_rollos: datos.numero_rollos !== undefined && datos.numero_rollos !== '' ? Number(datos.numero_rollos) : null,
        cantidad_por_rollo: datos.cantidad_por_rollo !== undefined && datos.cantidad_por_rollo !== '' ? toNumber(datos.cantidad_por_rollo) : null,
        numero_cajas: datos.numero_cajas !== undefined && datos.numero_cajas !== '' ? Number(datos.numero_cajas) : null,
        cantidad_por_caja: datos.cantidad_por_caja !== undefined && datos.cantidad_por_caja !== '' ? toNumber(datos.cantidad_por_caja) : null,
        diametro_rollo_mm: datos.diametro_rollo_mm !== undefined && datos.diametro_rollo_mm !== '' ? toNumber(datos.diametro_rollo_mm) : null,
        ancho_bobina_mm: datos.ancho_bobina_mm !== undefined && datos.ancho_bobina_mm !== '' ? toNumber(datos.ancho_bobina_mm) : null,
        nucleo: sanitizeText(datos.nucleo) || null,
        sentido_embobinado: sanitizeText(datos.sentido_embobinado) || null,
        sentido_salida: sanitizeText(datos.sentido_salida) || null,
        calibre_sustrato_micras: datos.calibre_sustrato_micras !== undefined && datos.calibre_sustrato_micras !== '' ? toNumber(datos.calibre_sustrato_micras) : null,
        numero_diseno: sanitizeText(datos.numero_diseno) || null,
        revision_arte: sanitizeText(datos.revision_arte) || null,
        tipo_tinta: sanitizeText(datos.tipo_tinta) || null,
        tipo_barniz: sanitizeText(datos.tipo_barniz) || null,
        acabado: sanitizeText(datos.acabado) || null,
        fecha_vencimiento: datos.fecha_vencimiento || null,
        especificaciones_embalaje: sanitizeText(datos.especificaciones_embalaje) || null
    };
}

async function resolverLoteContexto(client, datos) {
    let ordenProduccionId = datos.orden_produccion_id || null;
    let productoId = datos.producto_id || null;
    let clienteId = datos.cliente_id || null;
    let pedidoCliente = sanitizeText(datos.pedido_cliente) || null;

    if (ordenProduccionId) {
        const orden = await client.query(
            `SELECT id, product_code, customer_name, job_name, order_status
               FROM flexo_orders WHERE id = $1`,
            [ordenProduccionId]
        );
        if (!orden.rows[0]) {
            const error = new Error('La orden de producción no existe.');
            error.status = 404;
            throw error;
        }
        if (!productoId) {
            const producto = await client.query(
                `SELECT id FROM flexo_products WHERE product_code = $1 LIMIT 1`,
                [orden.rows[0].product_code]
            );
            productoId = producto.rows[0] ? producto.rows[0].id : null;
        }
        if (!clienteId) {
            const cliente = await client.query(
                `SELECT id FROM business_partners WHERE partner_name = $1 LIMIT 1`,
                [orden.rows[0].customer_name]
            );
            clienteId = cliente.rows[0] ? cliente.rows[0].id : null;
        }
        if (!pedidoCliente) pedidoCliente = orden.rows[0].job_name || null;
    }
    if (!productoId) {
        const error = new Error('producto_id es obligatorio (o una orden de producción válida).');
        error.status = 422;
        throw error;
    }
    const producto = await client.query(`SELECT id FROM flexo_products WHERE id = $1`, [productoId]);
    if (!producto.rows[0]) {
        const error = new Error('El producto no existe.');
        error.status = 404;
        throw error;
    }
    if (clienteId) {
        const cliente = await client.query(`SELECT id FROM business_partners WHERE id = $1`, [clienteId]);
        if (!cliente.rows[0]) clienteId = null;
    }
    return { ordenProduccionId, productoId, clienteId, pedidoCliente };
}

async function crearLote(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const contexto = await resolverLoteContexto(client, datos);
        const cantidadProducida = toNumber(datos.cantidad_producida);
        if (cantidadProducida <= 0) {
            const error = new Error('cantidad_producida debe ser mayor que cero.');
            error.status = 422;
            throw error;
        }
        const codigoLote = await generarCodigoLote(client);
        const flexo = loteFlexoColumns(datos);
        const { rows } = await client.query(
            `INSERT INTO lote_producto_terminado
             (codigo_lote, orden_produccion_id, producto_id, cliente_id, pedido_cliente,
              fecha_produccion, turno, maquina_id, operador_id, cantidad_producida,
              estado_calidad, numero_rollos, cantidad_por_rollo, numero_cajas,
              cantidad_por_caja, diametro_rollo_mm, ancho_bobina_mm, nucleo,
              sentido_embobinado, sentido_salida, calibre_sustrato_micras,
              numero_diseno, revision_arte, tipo_tinta, tipo_barniz, acabado,
              fecha_vencimiento, especificaciones_embalaje, observaciones,
              creado_por, actualizado_por)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDIENTE',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$29)
             RETURNING *`,
            [
                codigoLote, contexto.ordenProduccionId, contexto.productoId, contexto.clienteId, contexto.pedidoCliente,
                datos.fecha_produccion || null, sanitizeText(datos.turno) || null,
                datos.maquina_id || null, datos.operador_id || null, cantidadProducida,
                flexo.numero_rollos, flexo.cantidad_por_rollo, flexo.numero_cajas, flexo.cantidad_por_caja,
                flexo.diametro_rollo_mm, flexo.ancho_bobina_mm, flexo.nucleo,
                flexo.sentido_embobinado, flexo.sentido_salida, flexo.calibre_sustrato_micras,
                flexo.numero_diseno, flexo.revision_arte, flexo.tipo_tinta, flexo.tipo_barniz, flexo.acabado,
                flexo.fecha_vencimiento, flexo.especificaciones_embalaje, sanitizeText(datos.observaciones) || null,
                usuarioId
            ]
        );
        await registrarAuditoria(client, {
            accion: 'CREAR_LOTE',
            registro_tipo: 'lote_producto_terminado',
            registro_id: String(rows[0].id),
            valor_nuevo: rows[0],
            motivo: 'Ingreso desde producción terminada',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function obtenerLote(pgQuery, id) {
    const { rows } = await pgQuery(`${LOTE_SELECT} WHERE l.id = $1`, [id]);
    if (!rows[0]) {
        const error = new Error('Lote no encontrado.');
        error.status = 404;
        throw error;
    }
    const [movimientos, inventarios] = await Promise.all([
        pgQuery(
            `SELECT m.*, b.nombre AS bodega_nombre, u.codigo_ubicacion,
                    au.full_name AS usuario_nombre
               FROM movimientos_inventario_pt m
               JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
               LEFT JOIN bodega_pt b ON b.id = i.bodega_id
               LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id
               LEFT JOIN admin_users au ON au.id = m.usuario_id
              WHERE i.lote_id = $1
              ORDER BY m.fecha_movimiento DESC
              LIMIT 200`,
            [id]
        ),
        pgQuery(
            `SELECT i.id, i.bodega_id, i.ubicacion_id, i.unidad_inventario,
                    i.cantidad_fisica, i.cantidad_reservada, i.cantidad_bloqueada,
                    i.cantidad_en_despacho, i.estado, i.fecha_ingreso,
                    (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible,
                    b.codigo_bodega, b.nombre AS bodega_nombre,
                    u.codigo_ubicacion, u.nombre AS ubicacion_nombre
               FROM inventario_producto_terminado i
               LEFT JOIN bodega_pt b ON b.id = i.bodega_id
               LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id
              WHERE i.lote_id = $1
              ORDER BY i.fecha_ingreso DESC`,
            [id]
        )
    ]);
    return { ...rows[0], movimientos, inventarios };
}

async function actualizarLote(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM lote_producto_terminado WHERE id = $1`, [id]);
        if (!anterior.rows[0]) {
            const error = new Error('Lote no encontrado.');
            error.status = 404;
            throw error;
        }
        const bloqueados = ['codigo_lote', 'estado_calidad', 'fecha_liberacion', 'usuario_liberacion'];
        const campos = ['pedido_cliente', 'fecha_produccion', 'turno', 'maquina_id', 'operador_id', 'observaciones'];
        for (const campo of Object.keys(loteFlexoColumns(datos))) {
            if (Object.prototype.hasOwnProperty.call(datos, campo)) campos.push(campo);
        }
        const sets = [];
        const params = [];
        for (const campo of campos) {
            if (bloqueados.includes(campo)) continue;
            if (!Object.prototype.hasOwnProperty.call(datos, campo)) continue;
            let valor = datos[campo];
            if (campo === 'observaciones') valor = sanitizeText(valor) || null;
            else if (['fecha_produccion', 'fecha_vencimiento'].includes(campo)) valor = valor || null;
            else if (campo in loteFlexoColumns(datos)) valor = loteFlexoColumns({ [campo]: valor })[campo];
            else if (['maquina_id', 'operador_id', 'turno'].includes(campo)) valor = valor || null;
            params.push(valor);
            sets.push(`${campo} = $${params.length}`);
        }
        if (!sets.length) {
            const error = new Error('No se envió ningún campo editable.');
            error.status = 422;
            throw error;
        }
        params.push(id);
        const { rows } = await client.query(
            `UPDATE lote_producto_terminado SET ${sets.join(', ')}, actualizado_por = $${params.length + 1}, updated_at = NOW()
             WHERE id = $${params.length} RETURNING *`,
            [...params, usuarioId]
        );
        await registrarAuditoria(client, {
            accion: 'EDITAR_LOTE',
            registro_tipo: 'lote_producto_terminado',
            registro_id: String(id),
            valor_anterior: anterior.rows[0],
            valor_nuevo: rows[0],
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function registrarCalidad(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    const estado = sanitizeText(datos.estado);
    if (!ESTADOS_LOTE.includes(estado)) {
        const error = new Error(`estado debe ser uno de: ${ESTADOS_LOTE.join(', ')}.`);
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM lote_producto_terminado WHERE id = $1 FOR UPDATE`, [id]);
        if (!anterior.rows[0]) {
            const error = new Error('Lote no encontrado.');
            error.status = 404;
            throw error;
        }
        const lote = anterior.rows[0];
        const cantidadProducida = toNumber(lote.cantidad_producida);
        let cantidadAprobada = lote.cantidad_aprobada;
        let cantidadRechazada = lote.cantidad_rechazada;

        if (['APROBADO', 'APROBADO_CON_OBSERVACIONES'].includes(estado)) {
            const rechazada = toNumber(datos.cantidad_rechazada, toNumber(lote.cantidad_rechazada));
            const aprobada = datos.cantidad_aprobada !== undefined && datos.cantidad_aprobada !== ''
                ? toNumber(datos.cantidad_aprobada)
                : Math.max(0, cantidadProducida - rechazada);
            if (rechazada < 0 || aprobada < 0) {
                const error = new Error('Las cantidades aprobada y rechazada no pueden ser negativas.');
                error.status = 422;
                throw error;
            }
            if (aprobada + rechazada > cantidadProducida) {
                const error = new Error(`La suma de aprobada (${aprobada}) y rechazada (${rechazada}) supera la cantidad producida (${cantidadProducida}).`);
                error.status = 422;
                throw error;
            }
            cantidadAprobada = aprobada;
            cantidadRechazada = rechazada;
        }
        if (estado === 'RECHAZADO') {
            cantidadAprobada = 0;
            cantidadRechazada = toNumber(datos.cantidad_rechazada, cantidadProducida);
        }
        const { rows } = await client.query(
            `UPDATE lote_producto_terminado
                SET estado_calidad = $2,
                    cantidad_aprobada = $3,
                    cantidad_rechazada = $4,
                    observaciones = COALESCE($5, observaciones),
                    actualizado_por = $6,
                    updated_at = NOW()
              WHERE id = $1 RETURNING *`,
            [id, estado, cantidadAprobada, cantidadRechazada, sanitizeText(datos.observaciones) || null, usuarioId]
        );
        await registrarAuditoria(client, {
            accion: 'REGISTRAR_CALIDAD',
            registro_tipo: 'lote_producto_terminado',
            registro_id: String(id),
            valor_anterior: lote,
            valor_nuevo: rows[0],
            motivo: `Control de calidad: ${estado}`,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

async function cambiarEstadoCalidadLote(pgQuery, withTransaction, id, accion, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM lote_producto_terminado WHERE id = $1 FOR UPDATE`, [id]);
        if (!anterior.rows[0]) {
            const error = new Error('Lote no encontrado.');
            error.status = 404;
            throw error;
        }
        const lote = anterior.rows[0];
        let nuevoEstado = null;
        let accionAuditoria = '';
        if (accion === 'liberar') {
            if (!['APROBADO', 'APROBADO_CON_OBSERVACIONES'].includes(lote.estado_calidad)) {
                const error = new Error(`Solo un lote APROBADO puede liberarse. Estado actual: ${lote.estado_calidad}.`);
                error.status = 422;
                throw error;
            }
            nuevoEstado = 'LIBERADO';
            accionAuditoria = 'LIBERAR_LOTE';
        } else if (accion === 'bloquear') {
            if (lote.estado_calidad === 'LIBERADO') nuevoEstado = 'BLOQUEADO';
            else if (lote.estado_calidad === 'BLOQUEADO') nuevoEstado = lote.estado_calidad;
            else nuevoEstado = 'BLOQUEADO';
            accionAuditoria = 'BLOQUEAR_LOTE';
        } else if (accion === 'desbloquear') {
            if (lote.estado_calidad !== 'BLOQUEADO') {
                const error = new Error('El lote no está bloqueado.');
                error.status = 422;
                throw error;
            }
            nuevoEstado = 'APROBADO';
            accionAuditoria = 'DESBLOQUEAR_LOTE';
        } else {
            const error = new Error('Acción no válida. Use liberar, bloquear o desbloquear.');
            error.status = 422;
            throw error;
        }
        const { rows } = await client.query(
            `UPDATE lote_producto_terminado
                SET estado_calidad = $2,
                    fecha_liberacion = CASE WHEN $3 THEN NOW() ELSE fecha_liberacion END,
                    usuario_liberacion = CASE WHEN $3 THEN $4 ELSE usuario_liberacion END,
                    actualizado_por = $4,
                    updated_at = NOW()
              WHERE id = $1 RETURNING *`,
            [id, nuevoEstado, accion === 'liberar', usuarioId]
        );
        if (accion === 'liberar') {
            await registrarMovimiento(client, { tipo_movimiento: 'LIBERACION_CALIDAD' });
        }
        await registrarAuditoria(client, {
            accion: accionAuditoria,
            registro_tipo: 'lote_producto_terminado',
            registro_id: String(id),
            valor_anterior: lote,
            valor_nuevo: rows[0],
            motivo: sanitizeText(datos.motivo) || accionAuditoria,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return rows[0];
    });
}

// ─── EXISTENCIAS / INVENTARIO ───────────────────────────────────────────────

function buildExistenciasWhere(filtros) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.producto_id) add('i.producto_id = $', filtros.producto_id);
    if (filtros.producto_code) add('p.product_code ILIKE $', `%${filtros.producto_code}%`);
    if (filtros.codigo_sap) add('(p.codigo_sap ILIKE $ OR p.finished_product_sku ILIKE $)', `%${filtros.codigo_sap}%`);
    if (filtros.cliente_id) add('i.cliente_id = $', filtros.cliente_id);
    if (filtros.lote_id) add('i.lote_id = $', filtros.lote_id);
    if (filtros.orden_produccion_id) add('i.orden_produccion_id = $', filtros.orden_produccion_id);
    if (filtros.bodega_id) add('i.bodega_id = $', filtros.bodega_id);
    if (filtros.ubicacion_id) add('i.ubicacion_id = $', filtros.ubicacion_id);
    if (filtros.estado) add('i.estado = $', filtros.estado);
    if (filtros.calidad) add('l.estado_calidad = $', filtros.calidad);
    if (filtros.desde) add('i.fecha_ingreso >= $', filtros.desde);
    if (filtros.hasta) add('i.fecha_ingreso <= $', filtros.hasta);
    if (filtros.sap === 'pendiente') add("NOT EXISTS (SELECT 1 FROM integracion_sap_inventario s WHERE s.despacho_detalle_id IN (SELECT d.id FROM despacho_pt_detalle d WHERE d.inventario_pt_id = i.id) AND s.estado IN ('PROCESADO','PROCESADO_PARCIAL','ENVIANDO'))", true);
    if (filtros.disponible) add('(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) >= $', toNumber(filtros.disponible));
    return { condiciones, params };
}

async function listarExistencias(pgQuery, filtros = {}) {
    const { condiciones, params } = buildExistenciasWhere(filtros);
    const limit = Math.min(Math.max(Number(filtros.limit) || 100, 1), 500);
    const offset = Math.max(Number(filtros.offset) || 0, 0);
    const orden = sanitizeText(filtros.sort || 'producto');
    const ordenes = {
        producto: 'p.product_code ASC',
        lote: 'l.codigo_lote DESC',
        fecha: 'i.fecha_ingreso DESC',
        disponible: '(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) ASC',
        fisica: 'i.cantidad_fisica DESC'
    };
    const orderBy = ordenes[orden] || ordenes.producto;
    const { rows } = await pgQuery(
        `${EXISTENCIAS_SELECT}
          WHERE ${condiciones.join(' AND ')}
          ORDER BY ${orderBy}
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );
    const total = await pgQuery(
        `SELECT COUNT(*)::int AS total
           FROM inventario_producto_terminado i
           JOIN flexo_products p ON p.id = i.producto_id
           JOIN lote_producto_terminado l ON l.id = i.lote_id
          WHERE ${condiciones.join(' AND ')}`,
        params
    );
    return { rows, total: Number(total.rows[0].total), limit, offset };
}

async function obtenerExistencia(pgQuery, id) {
    const { rows } = await pgQuery(`${EXISTENCIAS_SELECT} WHERE i.id = $1`, [id]);
    if (!rows[0]) {
        const error = new Error('Existencia no encontrada.');
        error.status = 404;
        throw error;
    }
    const movimientos = await pgQuery(
        `SELECT m.*, au.full_name AS usuario_nombre
           FROM movimientos_inventario_pt m
           LEFT JOIN admin_users au ON au.id = m.usuario_id
          WHERE m.inventario_pt_id = $1
          ORDER BY m.fecha_movimiento DESC
          LIMIT 200`,
        [id]
    );
    const reservas = await pgQuery(
        `SELECT r.*, bp.partner_name AS cliente_nombre, au.full_name AS usuario_nombre
           FROM reservas_inventario_pt r
           LEFT JOIN business_partners bp ON bp.id = r.cliente_id
           LEFT JOIN admin_users au ON au.id = r.usuario_id
          WHERE r.inventario_pt_id = $1
          ORDER BY r.fecha_reserva DESC`,
        [id]
    );
    return { ...rows[0], movimientos: movimientos.rows, reservas: reservas.rows };
}

async function entradaInventario(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const loteId = Number(datos.lote_id);
    const cantidad = toNumber(datos.cantidad);
    const bodegaId = Number(datos.bodega_id);
    if (!loteId || !bodegaId || cantidad <= 0) {
        const error = new Error('lote_id, bodega_id y cantidad (mayor a cero) son obligatorios.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const loteResult = await client.query(
            `SELECT * FROM lote_producto_terminado WHERE id = $1 FOR UPDATE`,
            [loteId]
        );
        const lote = loteResult.rows[0];
        if (!lote) {
            const error = new Error('Lote no encontrado.');
            error.status = 404;
            throw error;
        }
        if (!ESTADOS_ENTRADA_PERMITIDOS.includes(lote.estado_calidad)) {
            const error = new Error(`No se puede ingresar inventario de un lote en estado ${lote.estado_calidad}. Solo APROBADO, APROBADO_CON_OBSERVACIONES o LIBERADO.`);
            error.status = 422;
            throw error;
        }
        const pendienteBodega = toNumber(lote.cantidad_aprobada) - toNumber(lote.cantidad_enviada_bodega);
        if (cantidad > pendienteBodega) {
            const error = new Error(`La cantidad a ingresar (${cantidad}) supera el saldo aprobado pendiente de envío a bodega (${pendienteBodega}).`);
            error.status = 422;
            throw error;
        }
        const bodega = await client.query(`SELECT id FROM bodega_pt WHERE id = $1 AND activo = true`, [bodegaId]);
        if (!bodega.rows[0]) {
            const error = new Error('Bodega no encontrada o inactiva.');
            error.status = 404;
            throw error;
        }
        if (datos.ubicacion_id) {
            const ubicacion = await client.query(
                `SELECT id FROM ubicacion_pt WHERE id = $1 AND bodega_id = $2 AND activo = true`,
                [datos.ubicacion_id, bodegaId]
            );
            if (!ubicacion.rows[0]) {
                const error = new Error('Ubicación no encontrada o no pertenece a la bodega.');
                error.status = 422;
                throw error;
            }
        }
        const producto = await client.query(
            `SELECT unidad_inventario FROM flexo_products WHERE id = $1`,
            [lote.producto_id]
        );
        const unidad = sanitizeText(datos.unidad) || (producto.rows[0] && producto.rows[0].unidad_inventario) || 'UN';
        const upsert = await client.query(
            `INSERT INTO inventario_producto_terminado
             (producto_id, lote_id, orden_produccion_id, cliente_id, bodega_id, ubicacion_id,
              unidad_inventario, cantidad_fisica, estado, creado_por, actualizado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DISPONIBLE', $9, $9)
             ON CONFLICT (producto_id, lote_id, bodega_id, ubicacion_id)
             DO UPDATE SET cantidad_fisica = inventario_producto_terminado.cantidad_fisica + EXCLUDED.cantidad_fisica,
                           unidad_inventario = EXCLUDED.unidad_inventario,
                           actualizado_por = EXCLUDED.actualizado_por,
                           updated_at = NOW()
             RETURNING *`,
            [lote.producto_id, loteId, lote.orden_produccion_id, lote.cliente_id, bodegaId, datos.ubicacion_id || null, unidad, cantidad, usuarioId]
        );
        await client.query(
            `UPDATE lote_producto_terminado
                SET cantidad_enviada_bodega = cantidad_enviada_bodega + $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1`,
            [loteId, cantidad, usuarioId]
        );
        const inventario = upsert.rows[0];
        const saldoAnterior = toNumber(inventario.cantidad_fisica) - cantidad;
        await registrarMovimiento(client, {
            inventario_pt_id: inventario.id,
            tipo_movimiento: 'ENTRADA_PRODUCCION',
            cantidad,
            unidad,
            saldo_anterior: saldoAnterior,
            saldo_posterior: toNumber(inventario.cantidad_fisica),
            documento_tipo: 'lote_producto_terminado',
            documento_id: loteId,
            referencia_externa: lote.codigo_lote,
            usuario_id: usuarioId,
            motivo: 'Entrada desde producción terminada',
            observaciones: sanitizeText(datos.observaciones) || `Ingreso a bodega del lote ${lote.codigo_lote}`
        });
        await registrarAuditoria(client, {
            accion: 'ENTRADA_PRODUCCION',
            registro_tipo: 'inventario_producto_terminado',
            registro_id: String(inventario.id),
            valor_nuevo: inventario,
            motivo: `Entrada de ${cantidad} ${unidad} del lote ${lote.codigo_lote}`,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, inventario.id);
        return { ...inventario, lote: lote.codigo_lote };
    });
}

async function ajustarInventario(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre, esEditAutorizado) {
    const tipo = sanitizeText(datos.tipo || '');
    const cantidad = Math.abs(toNumber(datos.cantidad));
    const motivo = sanitizeText(datos.motivo);
    if (!['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'].includes(tipo)) {
        const error = new Error('tipo debe ser AJUSTE_POSITIVO o AJUSTE_NEGATIVO.');
        error.status = 422;
        throw error;
    }
    if (cantidad <= 0) {
        const error = new Error('cantidad debe ser mayor que cero.');
        error.status = 422;
        throw error;
    }
    if (tipo === 'AJUSTE_NEGATIVO') {
        if (!esEditAutorizado) {
            const error = new Error('No tiene autorización para realizar ajustes negativos. Se requiere permiso de edición del módulo.');
            error.status = 403;
            throw error;
        }
        if (motivo.length < 5) {
            const error = new Error('Los ajustes negativos requieren un motivo detallado (mínimo 5 caracteres).');
            error.status = 422;
            throw error;
        }
    }
    return withTransaction(async (client) => {
        const anterior = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [id]
        );
        if (!anterior.rows[0]) {
            const error = new Error('Existencia no encontrada.');
            error.status = 404;
            throw error;
        }
        const row = anterior.rows[0];
        let nuevaFisica = toNumber(row.cantidad_fisica) + (tipo === 'AJUSTE_POSITIVO' ? cantidad : -cantidad);
        if (nuevaFisica < 0) {
            const error = new Error(`El ajuste dejaría la cantidad física negativa (actual: ${row.cantidad_fisica}, ajuste: -${cantidad}).`);
            error.status = 422;
            throw error;
        }
        const { rows } = await client.query(
            `UPDATE inventario_producto_terminado
                SET cantidad_fisica = $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1 RETURNING *`,
            [id, nuevaFisica, usuarioId]
        );
        await registrarMovimiento(client, {
            inventario_pt_id: id,
            tipo_movimiento: tipo,
            cantidad,
            unidad: row.unidad_inventario,
            saldo_anterior: toNumber(row.cantidad_fisica),
            saldo_posterior: nuevaFisica,
            documento_tipo: 'ajuste_inventario',
            documento_id: id,
            usuario_id: usuarioId,
            motivo,
            observaciones: sanitizeText(datos.observaciones) || `Ajuste ${tipo === 'AJUSTE_POSITIVO' ? 'positivo' : 'negativo'} de inventario`
        });
        await registrarAuditoria(client, {
            accion: tipo,
            registro_tipo: 'inventario_producto_terminado',
            registro_id: String(id),
            valor_anterior: row,
            valor_nuevo: rows[0],
            motivo,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, id);
        return rows[0];
    });
}

async function bloquearCantidadInventario(pgQuery, withTransaction, id, accion, datos, usuarioId, usuarioNombre) {
    const cantidad = Math.abs(toNumber(datos.cantidad));
    const motivo = sanitizeText(datos.motivo);
    if (cantidad <= 0) {
        const error = new Error('cantidad debe ser mayor que cero.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const anterior = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [id]
        );
        if (!anterior.rows[0]) {
            const error = new Error('Existencia no encontrada.');
            error.status = 404;
            throw error;
        }
        const row = anterior.rows[0];
        let nuevaBloqueada;
        if (accion === 'bloquear') {
            const disponible = toNumber(row.cantidad_fisica) - toNumber(row.cantidad_reservada) - toNumber(row.cantidad_en_despacho);
            if (cantidad > disponible) {
                const error = new Error(`No se puede bloquear ${cantidad} unidades. Disponible sin bloqueo: ${disponible}.`);
                error.status = 422;
                throw error;
            }
            nuevaBloqueada = toNumber(row.cantidad_bloqueada) + cantidad;
        } else if (accion === 'desbloquear') {
            if (cantidad > toNumber(row.cantidad_bloqueada)) {
                const error = new Error(`No se puede desbloquear ${cantidad} unidades. Cantidad bloqueada: ${row.cantidad_bloqueada}.`);
                error.status = 422;
                throw error;
            }
            nuevaBloqueada = toNumber(row.cantidad_bloqueada) - cantidad;
        } else {
            const error = new Error('Acción no válida.');
            error.status = 422;
            throw error;
        }
        const { rows } = await client.query(
            `UPDATE inventario_producto_terminado
                SET cantidad_bloqueada = $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1 RETURNING *`,
            [id, nuevaBloqueada, usuarioId]
        );
        const lote = await client.query(`SELECT codigo_lote FROM lote_producto_terminado WHERE id = $1`, [row.lote_id]);
        await registrarMovimiento(client, {
            inventario_pt_id: id,
            tipo_movimiento: accion === 'bloquear' ? 'BLOQUEO_CALIDAD' : 'DESBLOQUEO_CALIDAD',
            cantidad,
            unidad: row.unidad_inventario,
            saldo_anterior: toNumber(row.cantidad_bloqueada),
            saldo_posterior: nuevaBloqueada,
            documento_tipo: 'lote_producto_terminado',
            documento_id: row.lote_id,
            referencia_externa: lote.rows[0] && lote.rows[0].codigo_lote,
            usuario_id: usuarioId,
            motivo,
            observaciones: accion === 'bloquear' ? 'Bloqueo de cantidad' : 'Desbloqueo de cantidad'
        });
        await registrarAuditoria(client, {
            accion: accion === 'bloquear' ? 'BLOQUEAR_CANTIDAD' : 'DESBLOQUEAR_CANTIDAD',
            registro_tipo: 'inventario_producto_terminado',
            registro_id: String(id),
            valor_anterior: row,
            valor_nuevo: rows[0],
            motivo,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, id);
        return rows[0];
    });
}

async function transferirInventario(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const inventarioId = Number(datos.inventario_pt_id);
    const bodegaDestinoId = Number(datos.bodega_destino_id);
    const cantidad = toNumber(datos.cantidad);
    const motivo = sanitizeText(datos.motivo);
    if (!inventarioId || !bodegaDestinoId || cantidad <= 0) {
        const error = new Error('inventario_pt_id, bodega_destino_id y cantidad (mayor a cero) son obligatorios.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const origenResult = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [inventarioId]
        );
        const origen = origenResult.rows[0];
        if (!origen) {
            const error = new Error('Existencia de origen no encontrada.');
            error.status = 404;
            throw error;
        }
        const disponible = toNumber(origen.cantidad_fisica) - toNumber(origen.cantidad_reservada) - toNumber(origen.cantidad_bloqueada) - toNumber(origen.cantidad_en_despacho);
        if (cantidad > disponible) {
            const error = new Error(`Cantidad disponible para transferir: ${disponible} ${origen.unidad_inventario}.`);
            error.status = 422;
            throw error;
        }
        const destinoBodega = await client.query(
            `SELECT id FROM bodega_pt WHERE id = $1 AND activo = true`,
            [bodegaDestinoId]
        );
        if (!destinoBodega.rows[0]) {
            const error = new Error('Bodega de destino no encontrada o inactiva.');
            error.status = 404;
            throw error;
        }
        if (datos.ubicacion_destino_id) {
            const ubicacion = await client.query(
                `SELECT id FROM ubicacion_pt WHERE id = $1 AND bodega_id = $2 AND activo = true`,
                [datos.ubicacion_destino_id, bodegaDestinoId]
            );
            if (!ubicacion.rows[0]) {
                const error = new Error('Ubicación de destino no pertenece a la bodega de destino.');
                error.status = 422;
                throw error;
            }
        }
        const nuevaFisicaOrigen = toNumber(origen.cantidad_fisica) - cantidad;
        await client.query(
            `UPDATE inventario_producto_terminado
                SET cantidad_fisica = $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1`,
            [inventarioId, nuevaFisicaOrigen, usuarioId]
        );
        await registrarMovimiento(client, {
            inventario_pt_id: inventarioId,
            tipo_movimiento: 'TRANSFERENCIA_SALIDA',
            cantidad,
            unidad: origen.unidad_inventario,
            saldo_anterior: toNumber(origen.cantidad_fisica),
            saldo_posterior: nuevaFisicaOrigen,
            documento_tipo: 'bodega_pt',
            documento_id: bodegaDestinoId,
            usuario_id: usuarioId,
            motivo,
            observaciones: `Transferencia hacia bodega ${bodegaDestinoId}`
        });
        const destino = await client.query(
            `INSERT INTO inventario_producto_terminado
             (producto_id, lote_id, orden_produccion_id, cliente_id, bodega_id, ubicacion_id,
              unidad_inventario, cantidad_fisica, estado, creado_por, actualizado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DISPONIBLE', $9, $9)
             ON CONFLICT (producto_id, lote_id, bodega_id, ubicacion_id)
             DO UPDATE SET cantidad_fisica = inventario_producto_terminado.cantidad_fisica + EXCLUDED.cantidad_fisica,
                           actualizado_por = EXCLUDED.actualizado_por,
                           updated_at = NOW()
             RETURNING *`,
            [origen.producto_id, origen.lote_id, origen.orden_produccion_id, origen.cliente_id, bodegaDestinoId, datos.ubicacion_destino_id || null, origen.unidad_inventario, cantidad, usuarioId]
        );
        const saldoAnteriorDestino = toNumber(destino.rows[0].cantidad_fisica) - cantidad;
        await registrarMovimiento(client, {
            inventario_pt_id: destino.rows[0].id,
            tipo_movimiento: 'TRANSFERENCIA_ENTRADA',
            cantidad,
            unidad: origen.unidad_inventario,
            saldo_anterior: saldoAnteriorDestino,
            saldo_posterior: toNumber(destino.rows[0].cantidad_fisica),
            documento_tipo: 'bodega_pt',
            documento_id: bodegaDestinoId,
            usuario_id: usuarioId,
            motivo,
            observaciones: 'Entrada por transferencia'
        });
        await registrarAuditoria(client, {
            accion: 'TRANSFERENCIA',
            registro_tipo: 'inventario_producto_terminado',
            registro_id: String(inventarioId),
            valor_anterior: origen,
            valor_nuevo: { ...origen, cantidad_fisica: nuevaFisicaOrigen },
            motivo,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, inventarioId);
        await actualizarEstadoInventario(client, destino.rows[0].id);
        return { origen_id: inventarioId, destino_id: destino.rows[0].id, cantidad, motivo };
    });
}

async function listarMovimientos(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.inventario_pt_id) add('m.inventario_pt_id = $', filtros.inventario_pt_id);
    if (filtros.tipo_movimiento) add('m.tipo_movimiento = $', filtros.tipo_movimiento);
    if (filtros.producto_id) add('i.producto_id = $', filtros.producto_id);
    if (filtros.lote_id) add('i.lote_id = $', filtros.lote_id);
    if (filtros.desde) add('m.fecha_movimiento >= $', filtros.desde);
    if (filtros.hasta) add('m.fecha_movimiento <= $', filtros.hasta);
    if (filtros.usuario_id) add('m.usuario_id = $', filtros.usuario_id);
    const limit = Math.min(Math.max(Number(filtros.limit) || 200, 1), 500);
    const { rows } = await pgQuery(
        `SELECT m.*, i.producto_id, i.lote_id, i.bodega_id,
                p.product_code, p.product_name, p.codigo_sap,
                l.codigo_lote, b.nombre AS bodega_nombre,
                o.order_code, au.full_name AS usuario_nombre
           FROM movimientos_inventario_pt m
           JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
           JOIN flexo_products p ON p.id = i.producto_id
           JOIN lote_producto_terminado l ON l.id = i.lote_id
           LEFT JOIN flexo_orders o ON o.id = l.orden_produccion_id
           LEFT JOIN bodega_pt b ON b.id = i.bodega_id
           LEFT JOIN admin_users au ON au.id = m.usuario_id
          WHERE ${condiciones.join(' AND ')}
          ORDER BY m.fecha_movimiento DESC
          LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

// ─── RESERVAS ───────────────────────────────────────────────────────────────

async function listarReservas(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.estado) add('r.estado = $', filtros.estado);
    if (filtros.producto_id) add('r.producto_id = $', filtros.producto_id);
    if (filtros.cliente_id) add('r.cliente_id = $', filtros.cliente_id);
    if (filtros.lote_id) add('r.lote_id = $', filtros.lote_id);
    if (filtros.pedido_id) add('r.pedido_id = $', filtros.pedido_id);
    const limit = Math.min(Math.max(Number(filtros.limit) || 200, 1), 500);
    const { rows } = await pgQuery(
        `SELECT r.*, p.product_code, p.product_name, p.codigo_sap,
                l.codigo_lote, bp.partner_name AS cliente_nombre,
                au.full_name AS usuario_nombre,
                b.nombre AS bodega_nombre
           FROM reservas_inventario_pt r
           JOIN flexo_products p ON p.id = r.producto_id
           JOIN lote_producto_terminado l ON l.id = r.lote_id
           LEFT JOIN business_partners bp ON bp.id = r.cliente_id
           LEFT JOIN admin_users au ON au.id = r.usuario_id
           LEFT JOIN inventario_producto_terminado i ON i.id = r.inventario_pt_id
           LEFT JOIN bodega_pt b ON b.id = i.bodega_id
          WHERE ${condiciones.join(' AND ')}
          ORDER BY r.fecha_reserva DESC
          LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

async function crearReserva(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const inventarioId = Number(datos.inventario_pt_id);
    const cantidad = toNumber(datos.cantidad);
    if (!inventarioId || cantidad <= 0) {
        const error = new Error('inventario_pt_id y cantidad (mayor a cero) son obligatorios.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const invResult = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [inventarioId]
        );
        const inventario = invResult.rows[0];
        if (!inventario) {
            const error = new Error('Existencia no encontrada.');
            error.status = 404;
            throw error;
        }
        const lote = await client.query(
            `SELECT estado_calidad, codigo_lote FROM lote_producto_terminado WHERE id = $1`,
            [inventario.lote_id]
        );
        if (!lote.rows[0] || lote.rows[0].estado_calidad !== 'LIBERADO') {
            const error = new Error(`No se puede reservar producto de un lote no liberado (estado: ${lote.rows[0] ? lote.rows[0].estado_calidad : 'desconocido'}).`);
            error.status = 422;
            throw error;
        }
        const disponible = toNumber(inventario.cantidad_fisica) - toNumber(inventario.cantidad_reservada) - toNumber(inventario.cantidad_bloqueada) - toNumber(inventario.cantidad_en_despacho);
        if (cantidad > disponible) {
            const error = new Error(`No se puede crear la reserva. Cantidad solicitada: ${cantidad} ${inventario.unidad_inventario}. Cantidad disponible: ${disponible} ${inventario.unidad_inventario}. La cantidad solicitada supera la disponibilidad.`);
            error.status = 422;
            throw error;
        }
        const numeroReserva = await generarSecuencia(client, 'RESERVA', 'RSV-');
        const nuevaReservada = toNumber(inventario.cantidad_reservada) + cantidad;
        await client.query(
            `UPDATE inventario_producto_terminado
                SET cantidad_reservada = $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1`,
            [inventarioId, nuevaReservada, usuarioId]
        );
        const { rows } = await client.query(
            `INSERT INTO reservas_inventario_pt
             (numero_reserva, inventario_pt_id, producto_id, lote_id, cliente_id, pedido_id,
              cantidad_reservada, unidad, fecha_expiracion, estado, usuario_id, observaciones)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVA', $10, $11)
             RETURNING *`,
            [numeroReserva, inventarioId, inventario.producto_id, inventario.lote_id, datos.cliente_id || inventario.cliente_id || null, datos.pedido_id || null, cantidad, sanitizeText(datos.unidad) || inventario.unidad_inventario, datos.fecha_expiracion || null, usuarioId, sanitizeText(datos.observaciones) || null]
        );
        await registrarMovimiento(client, {
            inventario_pt_id: inventarioId,
            tipo_movimiento: 'RESERVA_PEDIDO',
            cantidad,
            unidad: inventario.unidad_inventario,
            saldo_anterior: toNumber(inventario.cantidad_reservada),
            saldo_posterior: nuevaReservada,
            documento_tipo: 'reservas_inventario_pt',
            documento_id: rows[0].id,
            referencia_externa: numeroReserva,
            usuario_id: usuarioId,
            motivo: sanitizeText(datos.observaciones) || 'Reserva para pedido o cliente',
            observaciones: `Reserva ${numeroReserva}`
        });
        await registrarAuditoria(client, {
            accion: 'RESERVA_PEDIDO',
            registro_tipo: 'reservas_inventario_pt',
            registro_id: String(rows[0].id),
            valor_anterior: inventario,
            valor_nuevo: { ...inventario, cantidad_reservada: nuevaReservada },
            motivo: sanitizeText(datos.observaciones) || 'Reserva para pedido o cliente',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, inventarioId);
        return rows[0];
    });
}

async function liberarReserva(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const reservaResult = await client.query(
            `SELECT * FROM reservas_inventario_pt WHERE id = $1 FOR UPDATE`,
            [id]
        );
        const reserva = reservaResult.rows[0];
        if (!reserva) {
            const error = new Error('Reserva no encontrada.');
            error.status = 404;
            throw error;
        }
        if (!['ACTIVA', 'PARCIAL'].includes(reserva.estado)) {
            const error = new Error(`La reserva está en estado ${reserva.estado} y no puede liberarse.`);
            error.status = 422;
            throw error;
        }
        const invResult = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [reserva.inventario_pt_id]
        );
        const inventario = invResult.rows[0];
        if (!inventario) {
            const error = new Error('La existencia asociada a la reserva ya no existe.');
            error.status = 409;
            throw error;
        }
        const cantidad = toNumber(reserva.cantidad_reservada);
        const nuevaReservada = Math.max(0, toNumber(inventario.cantidad_reservada) - cantidad);
        await client.query(
            `UPDATE inventario_producto_terminado
                SET cantidad_reservada = $2, actualizado_por = $3, updated_at = NOW()
              WHERE id = $1`,
            [reserva.inventario_pt_id, nuevaReservada, usuarioId]
        );
        await client.query(
            `UPDATE reservas_inventario_pt SET estado = 'LIBERADA', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        await registrarMovimiento(client, {
            inventario_pt_id: reserva.inventario_pt_id,
            tipo_movimiento: 'LIBERACION_RESERVA',
            cantidad,
            unidad: reserva.unidad,
            saldo_anterior: toNumber(inventario.cantidad_reservada),
            saldo_posterior: nuevaReservada,
            documento_tipo: 'reservas_inventario_pt',
            documento_id: id,
            referencia_externa: reserva.numero_reserva,
            usuario_id: usuarioId,
            motivo: sanitizeText(datos.motivo) || 'Liberación de reserva',
            observaciones: `Liberación de reserva ${reserva.numero_reserva}`
        });
        await registrarAuditoria(client, {
            accion: 'LIBERACION_RESERVA',
            registro_tipo: 'reservas_inventario_pt',
            registro_id: String(id),
            valor_anterior: reserva,
            valor_nuevo: { ...reserva, estado: 'LIBERADA' },
            motivo: sanitizeText(datos.motivo) || 'Liberación de reserva',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        await actualizarEstadoInventario(client, reserva.inventario_pt_id);
        return { ...reserva, estado: 'LIBERADA' };
    });
}

async function cancelarReserva(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const reservaResult = await client.query(
            `SELECT * FROM reservas_inventario_pt WHERE id = $1 FOR UPDATE`,
            [id]
        );
        const reserva = reservaResult.rows[0];
        if (!reserva) {
            const error = new Error('Reserva no encontrada.');
            error.status = 404;
            throw error;
        }
        if (['UTILIZADA', 'CANCELADA', 'VENCIDA', 'LIBERADA'].includes(reserva.estado)) {
            const error = new Error(`La reserva está en estado ${reserva.estado} y no puede cancelarse.`);
            error.status = 422;
            throw error;
        }
        const invResult = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
            [reserva.inventario_pt_id]
        );
        const inventario = invResult.rows[0];
        const cantidad = toNumber(reserva.cantidad_reservada);
        if (inventario) {
            const nuevaReservada = Math.max(0, toNumber(inventario.cantidad_reservada) - cantidad);
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_reservada = $2, actualizado_por = $3, updated_at = NOW()
                  WHERE id = $1`,
                [reserva.inventario_pt_id, nuevaReservada, usuarioId]
            );
            await registrarMovimiento(client, {
                inventario_pt_id: reserva.inventario_pt_id,
                tipo_movimiento: 'LIBERACION_RESERVA',
                cantidad,
                unidad: reserva.unidad,
                saldo_anterior: toNumber(inventario.cantidad_reservada),
                saldo_posterior: nuevaReservada,
                documento_tipo: 'reservas_inventario_pt',
                documento_id: id,
                referencia_externa: reserva.numero_reserva,
                usuario_id: usuarioId,
                motivo: sanitizeText(datos.motivo) || 'Cancelación de reserva',
                observaciones: `Cancelación de reserva ${reserva.numero_reserva}`
            });
        }
        await client.query(
            `UPDATE reservas_inventario_pt SET estado = 'CANCELADA', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        await registrarAuditoria(client, {
            accion: 'CANCELAR_RESERVA',
            registro_tipo: 'reservas_inventario_pt',
            registro_id: String(id),
            valor_anterior: reserva,
            valor_nuevo: { ...reserva, estado: 'CANCELADA' },
            motivo: sanitizeText(datos.motivo) || 'Cancelación de reserva',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        if (inventario) await actualizarEstadoInventario(client, reserva.inventario_pt_id);
        return { ...reserva, estado: 'CANCELADA' };
    });
}

async function procesarReservasVencidas(pgQuery, withTransaction) {
    return withTransaction(async (client) => {
        const vencidas = await client.query(
            `SELECT * FROM reservas_inventario_pt
              WHERE estado IN ('ACTIVA', 'PARCIAL')
                AND fecha_expiracion IS NOT NULL
                AND fecha_expiracion < NOW()
                FOR UPDATE`,
        );
        let liberadas = 0;
        for (const reserva of vencidas.rows) {
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [reserva.inventario_pt_id]
            );
            const inventario = invResult.rows[0];
            const cantidad = toNumber(reserva.cantidad_reservada);
            if (inventario) {
                const nuevaReservada = Math.max(0, toNumber(inventario.cantidad_reservada) - cantidad);
                await client.query(
                    `UPDATE inventario_producto_terminado
                        SET cantidad_reservada = $2, updated_at = NOW()
                      WHERE id = $1`,
                    [reserva.inventario_pt_id, nuevaReservada]
                );
                await registrarMovimiento(client, {
                    inventario_pt_id: reserva.inventario_pt_id,
                    tipo_movimiento: 'LIBERACION_RESERVA',
                    cantidad,
                    unidad: reserva.unidad,
                    saldo_anterior: toNumber(inventario.cantidad_reservada),
                    saldo_posterior: nuevaReservada,
                    documento_tipo: 'reservas_inventario_pt',
                    documento_id: reserva.id,
                    referencia_externa: reserva.numero_reserva,
                    motivo: 'Vencimiento automático de reserva',
                    observaciones: `Reserva ${reserva.numero_reserva} vencida`
                });
                await actualizarEstadoInventario(client, reserva.inventario_pt_id);
            }
            await client.query(
                `UPDATE reservas_inventario_pt SET estado = 'VENCIDA', updated_at = NOW() WHERE id = $1`,
                [reserva.id]
            );
            await registrarAuditoria(client, {
                accion: 'VENCER_RESERVA',
                registro_tipo: 'reservas_inventario_pt',
                registro_id: String(reserva.id),
                valor_anterior: reserva,
                valor_nuevo: { ...reserva, estado: 'VENCIDA' },
                motivo: 'Vencimiento automático de reserva',
                usuario_id: null
            });
            liberadas += 1;
        }
        return { liberadas };
    });
}

// ─── SOLICITUDES DE DESPACHO ────────────────────────────────────────────────

const SOLICITUD_SELECT = `
    SELECT s.*, bp.partner_name AS cliente_nombre, bp.partner_code,
           o.order_code, b.nombre AS bodega_nombre,
           au.full_name AS creado_por_nombre
      FROM solicitud_despacho_pt s
      LEFT JOIN business_partners bp ON bp.id = s.cliente_id
      LEFT JOIN flexo_orders o ON o.id = s.pedido_id
      LEFT JOIN bodega_pt b ON b.id = s.bodega_id
      LEFT JOIN admin_users au ON au.id = s.creado_por`;

async function listarSolicitudes(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.estado) add('s.estado = $', filtros.estado);
    if (filtros.cliente_id) add('s.cliente_id = $', filtros.cliente_id);
    if (filtros.bodega_id) add('s.bodega_id = $', filtros.bodega_id);
    if (filtros.desde) add('s.fecha_solicitud >= $', filtros.desde);
    if (filtros.hasta) add('s.fecha_solicitud <= $', filtros.hasta);
    const limit = Math.min(Math.max(Number(filtros.limit) || 100, 1), 500);
    const { rows } = await pgQuery(
        `${SOLICITUD_SELECT}
          WHERE ${condiciones.join(' AND ')}
          ORDER BY s.fecha_solicitud DESC, s.id DESC
          LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

async function obtenerSolicitud(pgQuery, id) {
    const { rows } = await pgQuery(`${SOLICITUD_SELECT} WHERE s.id = $1`, [id]);
    if (!rows[0]) {
        const error = new Error('Solicitud no encontrada.');
        error.status = 404;
        throw error;
    }
    const detalle = await pgQuery(
        `SELECT d.*, p.product_code, p.product_name, p.codigo_sap, p.finished_product_sku,
                l.codigo_lote, l.estado_calidad,
                i.cantidad_fisica, i.cantidad_reservada, i.cantidad_bloqueada, i.cantidad_en_despacho,
                (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible,
                b.nombre AS bodega_nombre, u.codigo_ubicacion,
                r.numero_reserva, r.estado AS reserva_estado
           FROM solicitud_despacho_pt_detalle d
           JOIN flexo_products p ON p.id = d.producto_id
           LEFT JOIN lote_producto_terminado l ON l.id = d.lote_id
           LEFT JOIN inventario_producto_terminado i ON i.id = d.inventario_pt_id
           LEFT JOIN bodega_pt b ON b.id = i.bodega_id
           LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id
           LEFT JOIN reservas_inventario_pt r ON r.id = d.reserva_id
          WHERE d.solicitud_id = $1
          ORDER BY d.id`,
        [id]
    );
    return { ...rows[0], detalle: detalle.rows };
}

async function crearSolicitud(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];
    if (!lineas.length) {
        const error = new Error('La solicitud debe incluir al menos una línea.');
        error.status = 422;
        throw error;
    }
    for (const linea of lineas) {
        if (!linea.producto_id || toNumber(linea.cantidad_solicitada) <= 0) {
            const error = new Error('Cada línea requiere producto_id y cantidad_solicitada mayor a cero.');
            error.status = 422;
            throw error;
        }
    }
    return withTransaction(async (client) => {
        const numeroSolicitud = await generarSecuencia(client, 'SOLICITUD', 'SD-');
        const { rows } = await client.query(
            `INSERT INTO solicitud_despacho_pt
             (numero_solicitud, cliente_id, pedido_id, fecha_solicitud, fecha_programada,
              bodega_id, direccion_entrega, transportista, estado, observaciones, creado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BORRADOR', $9, $10)
             RETURNING *`,
            [numeroSolicitud, datos.cliente_id || null, datos.pedido_id || null, datos.fecha_solicitud || new Date().toISOString().slice(0, 10), datos.fecha_programada || null, datos.bodega_id || null, sanitizeText(datos.direccion_entrega) || null, sanitizeText(datos.transportista) || null, sanitizeText(datos.observaciones) || null, usuarioId]
        );
        const detalleGuardado = [];
        for (const linea of lineas) {
            let loteId = linea.lote_id || null;
            let inventarioId = linea.inventario_pt_id || null;
            if (inventarioId) {
                const inventario = await client.query(
                    `SELECT lote_id, bodega_id FROM inventario_producto_terminado WHERE id = $1`,
                    [inventarioId]
                );
                if (inventario.rows[0]) loteId = inventario.rows[0].lote_id;
            }
            const detalle = await client.query(
                `INSERT INTO solicitud_despacho_pt_detalle
                 (solicitud_id, producto_id, lote_id, inventario_pt_id, cantidad_solicitada, unidad, observaciones)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [rows[0].id, linea.producto_id, loteId, inventarioId, toNumber(linea.cantidad_solicitada), sanitizeText(linea.unidad) || 'UN', sanitizeText(linea.observaciones) || null]
            );
            detalleGuardado.push(detalle.rows[0]);
        }
        await registrarAuditoria(client, {
            accion: 'CREAR_SOLICITUD',
            registro_tipo: 'solicitud_despacho_pt',
            registro_id: String(rows[0].id),
            valor_nuevo: rows[0],
            motivo: 'Creación de solicitud de despacho',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...rows[0], detalle: detalleGuardado };
    });
}

async function actualizarSolicitud(pgQuery, withTransaction, id, accion, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const anterior = await client.query(`SELECT * FROM solicitud_despacho_pt WHERE id = $1 FOR UPDATE`, [id]);
        const solicitud = anterior.rows[0];
        if (!solicitud) {
            const error = new Error('Solicitud no encontrada.');
            error.status = 404;
            throw error;
        }
        let nuevoEstado = null;
        if (accion === 'estado') {
            const destino = sanitizeText(datos.estado);
            if (!ESTADOS_SOLICITUD.includes(destino)) {
                const error = new Error(`estado debe ser uno de: ${ESTADOS_SOLICITUD.join(', ')}.`);
                error.status = 422;
                throw error;
            }
            const flujo = {
                BORRADOR: ['PENDIENTE', 'CANCELADA'],
                PENDIENTE: ['APROBADA', 'CANCELADA'],
                APROBADA: ['RESERVADA', 'EN_PREPARACION', 'PREPARADA', 'CANCELADA'],
                RESERVADA: ['EN_PREPARACION', 'PREPARADA', 'CANCELADA'],
                EN_PREPARACION: ['PREPARADA', 'CANCELADA'],
                PREPARADA: ['EN_PREPARACION', 'CANCELADA'],
                DESPACHADA_PARCIAL: ['CANCELADA'],
                DESPACHADA: [],
                CANCELADA: []
            };
            if (!flujo[solicitud.estado] || !flujo[solicitud.estado].includes(destino)) {
                const error = new Error(`No se puede cambiar la solicitud de ${solicitud.estado} a ${destino}.`);
                error.status = 422;
                throw error;
            }
            nuevoEstado = destino;
        } else if (accion === 'datos') {
            const sets = [];
            const params = [];
            for (const campo of ['cliente_id', 'pedido_id', 'fecha_solicitud', 'fecha_programada', 'bodega_id', 'direccion_entrega', 'transportista', 'observaciones']) {
                if (Object.prototype.hasOwnProperty.call(datos, campo)) {
                    params.push(datos[campo] || null);
                    sets.push(`${campo} = $${params.length}`);
                }
            }
            if (sets.length) {
                params.push(id);
                await client.query(
                    `UPDATE solicitud_despacho_pt SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
                    params
                );
            }
        } else {
            const error = new Error('Acción no válida. Use estado o datos.');
            error.status = 422;
            throw error;
        }
        if (nuevoEstado) {
            await client.query(
                `UPDATE solicitud_despacho_pt SET estado = $2, updated_at = NOW() WHERE id = $1`,
                [id, nuevoEstado]
            );
        }
        const nuevo = await client.query(`SELECT * FROM solicitud_despacho_pt WHERE id = $1`, [id]);
        await registrarAuditoria(client, {
            accion: nuevoEstado ? `SOLICITUD_${nuevoEstado}` : 'EDITAR_SOLICITUD',
            registro_tipo: 'solicitud_despacho_pt',
            registro_id: String(id),
            valor_anterior: solicitud,
            valor_nuevo: nuevo.rows[0],
            motivo: sanitizeText(datos.motivo) || 'Cambio de estado de solicitud',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return nuevo.rows[0];
    });
}

async function reservarSolicitud(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const solResult = await client.query(`SELECT * FROM solicitud_despacho_pt WHERE id = $1 FOR UPDATE`, [id]);
        const solicitud = solResult.rows[0];
        if (!solicitud) {
            const error = new Error('Solicitud no encontrada.');
            error.status = 404;
            throw error;
        }
        if (!['APROBADA', 'BORRADOR'].includes(solicitud.estado)) {
            const error = new Error(`La solicitud debe estar APROBADA o en BORRADOR para reservar. Estado actual: ${solicitud.estado}.`);
            error.status = 422;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM solicitud_despacho_pt_detalle WHERE solicitud_id = $1 FOR UPDATE`,
            [id]
        );
        let reservadas = 0;
        for (const linea of lineas.rows) {
            const cantidad = toNumber(linea.cantidad_solicitada) - toNumber(linea.cantidad_reservada);
            if (cantidad <= 0) continue;
            let inventarioId = linea.inventario_pt_id;
            if (!inventarioId) {
                const disponible = await client.query(
                    `SELECT i.*, l.estado_calidad
                       FROM inventario_producto_terminado i
                       JOIN lote_producto_terminado l ON l.id = i.lote_id
                      WHERE i.producto_id = $1
                        AND ($2::uuid IS NULL OR i.lote_id = $2)
                        AND ($3::bigint IS NULL OR i.bodega_id = $3)
                        AND l.estado_calidad = 'LIBERADO'
                      ORDER BY (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) DESC
                      LIMIT 1`,
                    [linea.producto_id, linea.lote_id || null, solicitud.bodega_id || null]
                );
                if (disponible.rows[0]) inventarioId = disponible.rows[0].id;
            }
            if (!inventarioId) {
                const error = new Error(`No hay inventario disponible para la línea del producto ${linea.producto_id}.`);
                error.status = 422;
                throw error;
            }
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [inventarioId]
            );
            const inventario = invResult.rows[0];
            if (!inventario) {
                const error = new Error('La existencia asociada a la línea no existe.');
                error.status = 409;
                throw error;
            }
            const lote = await client.query(`SELECT estado_calidad FROM lote_producto_terminado WHERE id = $1`, [inventario.lote_id]);
            if (!lote.rows[0] || lote.rows[0].estado_calidad !== 'LIBERADO') {
                const error = new Error('La existencia seleccionada proviene de un lote no liberado.');
                error.status = 422;
                throw error;
            }
            const disponible = toNumber(inventario.cantidad_fisica) - toNumber(inventario.cantidad_reservada) - toNumber(inventario.cantidad_bloqueada) - toNumber(inventario.cantidad_en_despacho);
            if (cantidad > disponible) {
                const error = new Error(`No se puede reservar ${cantidad} ${inventario.unidad_inventario}. Cantidad disponible: ${disponible} ${inventario.unidad_inventario}.`);
                error.status = 422;
                throw error;
            }
            const numeroReserva = await generarSecuencia(client, 'RESERVA', 'RSV-');
            const nuevaReservada = toNumber(inventario.cantidad_reservada) + cantidad;
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_reservada = $2, actualizado_por = $3, updated_at = NOW()
                  WHERE id = $1`,
                [inventarioId, nuevaReservada, usuarioId]
            );
            const reserva = await client.query(
                `INSERT INTO reservas_inventario_pt
                 (numero_reserva, inventario_pt_id, producto_id, lote_id, cliente_id, pedido_id,
                  cantidad_reservada, unidad, fecha_expiracion, estado, usuario_id, observaciones)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVA', $10, $11)
                 RETURNING *`,
                [numeroReserva, inventarioId, linea.producto_id, inventario.lote_id, solicitud.cliente_id || null, solicitud.pedido_id || null, cantidad, linea.unidad, datos.fecha_expiracion || null, usuarioId, `Reserva por solicitud ${solicitud.numero_solicitud}`]
            );
            await client.query(
                `UPDATE solicitud_despacho_pt_detalle
                    SET cantidad_reservada = cantidad_reservada + $2,
                        inventario_pt_id = $3,
                        lote_id = $4,
                        reserva_id = $5
                  WHERE id = $1`,
                [linea.id, cantidad, inventarioId, inventario.lote_id, reserva.rows[0].id]
            );
            await registrarMovimiento(client, {
                inventario_pt_id: inventarioId,
                tipo_movimiento: 'RESERVA_PEDIDO',
                cantidad,
                unidad: inventario.unidad_inventario,
                saldo_anterior: toNumber(inventario.cantidad_reservada),
                saldo_posterior: nuevaReservada,
                documento_tipo: 'solicitud_despacho_pt',
                documento_id: id,
                referencia_externa: numeroReserva,
                usuario_id: usuarioId,
                motivo: `Reserva por solicitud ${solicitud.numero_solicitud}`,
                observaciones: `Reserva ${numeroReserva}`
            });
            await actualizarEstadoInventario(client, inventarioId);
            reservadas += 1;
        }
        await client.query(
            `UPDATE solicitud_despacho_pt SET estado = 'RESERVADA', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        const nuevo = await client.query(`SELECT * FROM solicitud_despacho_pt WHERE id = $1`, [id]);
        await registrarAuditoria(client, {
            accion: 'RESERVAR_SOLICITUD',
            registro_tipo: 'solicitud_despacho_pt',
            registro_id: String(id),
            valor_anterior: solicitud,
            valor_nuevo: nuevo.rows[0],
            motivo: `Reserva generada por solicitud ${solicitud.numero_solicitud}`,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...nuevo.rows[0], lineas_reservadas: reservadas };
    });
}

// ─── DESPACHOS ──────────────────────────────────────────────────────────────

const DESPACHO_SELECT = `
    SELECT d.*, bp.partner_name AS cliente_nombre, bp.partner_code,
           o.order_code, b.nombre AS bodega_nombre,
           s.numero_solicitud,
           au.full_name AS creado_por_nombre
      FROM despacho_pt d
      LEFT JOIN business_partners bp ON bp.id = d.cliente_id
      LEFT JOIN flexo_orders o ON o.id = d.pedido_id
      LEFT JOIN bodega_pt b ON b.id = d.bodega_id
      LEFT JOIN solicitud_despacho_pt s ON s.id = d.solicitud_id
      LEFT JOIN admin_users au ON au.id = d.creado_por`;

async function listarDespachos(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.estado) add('d.estado = $', filtros.estado);
    if (filtros.cliente_id) add('d.cliente_id = $', filtros.cliente_id);
    if (filtros.solicitud_id) add('d.solicitud_id = $', filtros.solicitud_id);
    if (filtros.desde) add('d.fecha_despacho >= $', filtros.desde);
    if (filtros.hasta) add('d.fecha_despacho <= $', filtros.hasta);
    const limit = Math.min(Math.max(Number(filtros.limit) || 100, 1), 500);
    const { rows } = await pgQuery(
        `${DESPACHO_SELECT}
          WHERE ${condiciones.join(' AND ')}
          ORDER BY d.fecha_despacho DESC
          LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

async function obtenerDespacho(pgQuery, id) {
    const { rows } = await pgQuery(`${DESPACHO_SELECT} WHERE d.id = $1`, [id]);
    if (!rows[0]) {
        const error = new Error('Despacho no encontrado.');
        error.status = 404;
        throw error;
    }
    const detalle = await pgQuery(
        `SELECT x.*, p.product_code, p.product_name, p.codigo_sap, p.finished_product_sku,
                l.codigo_lote, l.estado_calidad, l.fecha_liberacion,
                i.cantidad_fisica, i.cantidad_reservada, i.cantidad_bloqueada, i.cantidad_en_despacho,
                b.nombre AS bodega_nombre, u.codigo_ubicacion,
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', s.id, 'estado', s.estado, 'sap_doc_entry', s.sap_doc_entry,
                        'sap_doc_num', s.sap_doc_num, 'intentos', s.intentos,
                        'fecha_envio', s.fecha_envio, 'fecha_respuesta', s.fecha_respuesta,
                        'mensaje_respuesta', s.mensaje_respuesta, 'cantidad_enviada', s.cantidad_enviada
                    ))
                      FROM integracion_sap_inventario s
                     WHERE s.despacho_detalle_id = x.id
                ), '[]'::jsonb) AS integracion_sap
           FROM despacho_pt_detalle x
           JOIN flexo_products p ON p.id = x.producto_id
           LEFT JOIN lote_producto_terminado l ON l.id = x.lote_id
           LEFT JOIN inventario_producto_terminado i ON i.id = x.inventario_pt_id
           LEFT JOIN bodega_pt b ON b.id = i.bodega_id
           LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id
           LEFT JOIN integracion_sap_inventario s ON s.despacho_detalle_id = x.id
          WHERE x.despacho_id = $1
          ORDER BY x.id`,
        [id]
    );
    return { ...rows[0], detalle: detalle.rows };
}

async function crearDespacho(pgQuery, withTransaction, datos, usuarioId, usuarioNombre) {
    const solicitudId = Number(datos.solicitud_id) || null;
    const autorizarSinReserva = Boolean(datos.autorizar_sin_reserva);
    if (!solicitudId) {
        const error = new Error('solicitud_id es obligatorio para crear un despacho.');
        error.status = 422;
        throw error;
    }
    return withTransaction(async (client) => {
        const solResult = await client.query(`SELECT * FROM solicitud_despacho_pt WHERE id = $1 FOR UPDATE`, [solicitudId]);
        const solicitud = solResult.rows[0];
        if (!solicitud) {
            const error = new Error('Solicitud no encontrada.');
            error.status = 404;
            throw error;
        }
        if (!['RESERVADA', 'EN_PREPARACION', 'PREPARADA', 'APROBADA'].includes(solicitud.estado)) {
            const error = new Error(`La solicitud debe estar RESERVADA, EN_PREPARACION, PREPARADA o APROBADA para crear un despacho. Estado actual: ${solicitud.estado}.`);
            error.status = 422;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM solicitud_despacho_pt_detalle WHERE solicitud_id = $1 FOR UPDATE`,
            [solicitudId]
        );
        if (!lineas.rows.length) {
            const error = new Error('La solicitud no tiene líneas.');
            error.status = 422;
            throw error;
        }
        const cantidadesPorLinea = {};
        if (Array.isArray(datos.lineas)) {
            for (const linea of datos.lineas) {
                cantidadesPorLinea[Number(linea.solicitud_detalle_id)] = toNumber(linea.cantidad);
            }
        }
        const numeroDespacho = await generarSecuencia(client, 'DESPACHO', 'DP-');
        const { rows } = await client.query(
            `INSERT INTO despacho_pt
             (numero_despacho, solicitud_id, cliente_id, pedido_id, bodega_id,
              transportista, vehiculo, numero_guia, direccion_entrega, estado, observaciones, creado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'EN_PREPARACION', $10, $11)
             RETURNING *`,
            [numeroDespacho, solicitudId, solicitud.cliente_id || null, solicitud.pedido_id || null, solicitud.bodega_id || null, sanitizeText(datos.transportista) || solicitud.transportista || null, sanitizeText(datos.vehiculo) || null, sanitizeText(datos.numero_guia) || null, sanitizeText(datos.direccion_entrega) || solicitud.direccion_entrega || null, sanitizeText(datos.observaciones) || null, usuarioId]
        );
        const detalleGuardado = [];
        for (const linea of lineas.rows) {
            const cantidad = cantidadesPorLinea[linea.id] !== undefined ? cantidadesPorLinea[linea.id] : toNumber(linea.cantidad_solicitada) - toNumber(linea.cantidad_despachada);
            if (cantidad <= 0) continue;
            if (toNumber(linea.cantidad_reservada) <= 0 && !autorizarSinReserva) {
                const error = new Error(`La línea del producto ${linea.producto_id} no tiene reserva. Use autorizar_sin_reserva solo con autorización explícita.`);
                error.status = 422;
                throw error;
            }
            if (cantidad > toNumber(linea.cantidad_reservada) && !autorizarSinReserva) {
                const error = new Error(`La cantidad a despachar (${cantidad}) supera la cantidad reservada (${linea.cantidad_reservada}) de la línea del producto ${linea.producto_id}.`);
                error.status = 422;
                throw error;
            }
            if (!linea.inventario_pt_id) {
                const error = new Error(`La línea del producto ${linea.producto_id} no tiene existencia asignada. Ejecute la reserva primero.`);
                error.status = 422;
                throw error;
            }
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [linea.inventario_pt_id]
            );
            const inventario = invResult.rows[0];
            if (!inventario) {
                const error = new Error('La existencia asociada a la línea ya no existe.');
                error.status = 409;
                throw error;
            }
            const lote = await client.query(
                `SELECT estado_calidad FROM lote_producto_terminado WHERE id = $1`,
                [inventario.lote_id]
            );
            if (!lote.rows[0] || lote.rows[0].estado_calidad !== 'LIBERADO') {
                const error = new Error('No se puede despachar producto de un lote no liberado.');
                error.status = 422;
                throw error;
            }
            const disponible = toNumber(inventario.cantidad_fisica) - toNumber(inventario.cantidad_reservada) - toNumber(inventario.cantidad_bloqueada) - toNumber(inventario.cantidad_en_despacho);
            if (cantidad > disponible) {
                const error = new Error(`No hay disponibilidad suficiente para despachar ${cantidad} ${inventario.unidad_inventario}. Disponible: ${disponible}.`);
                error.status = 422;
                throw error;
            }
            const nuevaEnDespacho = toNumber(inventario.cantidad_en_despacho) + cantidad;
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_en_despacho = $2, actualizado_por = $3, updated_at = NOW()
                  WHERE id = $1`,
                [inventario.id, nuevaEnDespacho, usuarioId]
            );
            const detalle = await client.query(
                `INSERT INTO despacho_pt_detalle
                 (despacho_id, solicitud_detalle_id, producto_id, lote_id, inventario_pt_id, cantidad_despachada, unidad, observaciones)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [rows[0].id, linea.id, linea.producto_id, inventario.lote_id, inventario.id, cantidad, linea.unidad, sanitizeText(linea.observaciones) || null]
            );
            await client.query(
                `UPDATE solicitud_despacho_pt_detalle SET cantidad_preparada = cantidad_preparada + $2 WHERE id = $1`,
                [linea.id, cantidad]
            );
            await registrarMovimiento(client, {
                inventario_pt_id: inventario.id,
                tipo_movimiento: 'INICIO_DESPACHO',
                cantidad,
                unidad: inventario.unidad_inventario,
                saldo_anterior: toNumber(inventario.cantidad_en_despacho),
                saldo_posterior: nuevaEnDespacho,
                documento_tipo: 'despacho_pt',
                documento_id: rows[0].id,
                referencia_externa: numeroDespacho,
                usuario_id: usuarioId,
                motivo: `Preparación de despacho ${numeroDespacho}`,
                observaciones: `Inicio de despacho ${numeroDespacho}`
            });
            await actualizarEstadoInventario(client, inventario.id);
            detalleGuardado.push(detalle.rows[0]);
        }
        if (!detalleGuardado.length) {
            const error = new Error('Ninguna línea pudo incorporarse al despacho.');
            error.status = 422;
            throw error;
        }
        await client.query(
            `UPDATE solicitud_despacho_pt SET estado = 'EN_PREPARACION', updated_at = NOW() WHERE id = $1`,
            [solicitudId]
        );
        await registrarAuditoria(client, {
            accion: 'CREAR_DESPACHO',
            registro_tipo: 'despacho_pt',
            registro_id: String(rows[0].id),
            valor_nuevo: rows[0],
            motivo: `Despacho ${numeroDespacho} desde solicitud ${solicitud.numero_solicitud}`,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...rows[0], detalle: detalleGuardado };
    });
}

async function confirmarDespacho(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const despachoResult = await client.query(`SELECT * FROM despacho_pt WHERE id = $1 FOR UPDATE`, [id]);
        const despacho = despachoResult.rows[0];
        if (!despacho) {
            const error = new Error('Despacho no encontrado.');
            error.status = 404;
            throw error;
        }
        if (!['EN_PREPARACION', 'DESPACHADO_PARCIAL'].includes(despacho.estado)) {
            const error = new Error(`El despacho está en estado ${despacho.estado} y no puede confirmarse.`);
            error.status = 422;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM despacho_pt_detalle WHERE despacho_id = $1 FOR UPDATE`,
            [id]
        );
        if (!lineas.rows.length) {
            const error = new Error('El despacho no tiene líneas.');
            error.status = 422;
            throw error;
        }
        const confirmaciones = [];
        for (const linea of lineas.rows) {
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [linea.inventario_pt_id]
            );
            const inventario = invResult.rows[0];
            if (!inventario) {
                const error = new Error('La existencia asociada al despacho ya no existe.');
                error.status = 409;
                throw error;
            }
            const cantidad = toNumber(linea.cantidad_despachada);
            if (toNumber(inventario.cantidad_en_despacho) < cantidad) {
                const error = new Error(`La existencia tiene ${inventario.cantidad_en_despacho} en despacho, pero se intenta confirmar ${cantidad}.`);
                error.status = 422;
                throw error;
            }
            const fisicaAnterior = toNumber(inventario.cantidad_fisica);
            if (fisicaAnterior < cantidad) {
                const error = new Error(`No se puede confirmar: la cantidad física (${fisicaAnterior}) es menor a la despachada (${cantidad}).`);
                error.status = 422;
                throw error;
            }
            const nuevaEnDespacho = toNumber(inventario.cantidad_en_despacho) - cantidad;
            const nuevaFisica = fisicaAnterior - cantidad;
            let nuevaReservada = toNumber(inventario.cantidad_reservada);
            if (linea.solicitud_detalle_id) {
                const detalleSol = await client.query(
                    `SELECT reserva_id FROM solicitud_despacho_pt_detalle WHERE id = $1`,
                    [linea.solicitud_detalle_id]
                );
                const reservaId = detalleSol.rows[0] && detalleSol.rows[0].reserva_id;
                if (reservaId) {
                    const reserva = await client.query(
                        `SELECT * FROM reservas_inventario_pt WHERE id = $1 FOR UPDATE`,
                        [reservaId]
                    );
                    if (reserva.rows[0] && ['ACTIVA', 'PARCIAL'].includes(reserva.rows[0].estado)) {
                        const tomar = Math.min(cantidad, toNumber(reserva.rows[0].cantidad_reservada));
                        nuevaReservada = Math.max(0, nuevaReservada - tomar);
                        const restante = toNumber(reserva.rows[0].cantidad_reservada) - tomar;
                        const nuevoEstadoReserva = restante <= 0 ? 'UTILIZADA' : 'PARCIAL';
                        await client.query(
                            `UPDATE reservas_inventario_pt
                                SET cantidad_reservada = $2, estado = $3, updated_at = NOW()
                              WHERE id = $1`,
                            [reservaId, restante, nuevoEstadoReserva]
                        );
                    }
                }
            }
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_fisica = $2,
                        cantidad_reservada = $3,
                        cantidad_en_despacho = $4,
                        actualizado_por = $5,
                        updated_at = NOW()
                  WHERE id = $1`,
                [inventario.id, nuevaFisica, nuevaReservada, nuevaEnDespacho, usuarioId]
            );
            if (linea.solicitud_detalle_id) {
                await client.query(
                    `UPDATE solicitud_despacho_pt_detalle SET cantidad_despachada = cantidad_despachada + $2 WHERE id = $1`,
                    [linea.solicitud_detalle_id, cantidad]
                );
            }
            await registrarMovimiento(client, {
                inventario_pt_id: inventario.id,
                tipo_movimiento: 'CONFIRMACION_DESPACHO',
                cantidad,
                unidad: inventario.unidad_inventario,
                saldo_anterior: fisicaAnterior,
                saldo_posterior: nuevaFisica,
                documento_tipo: 'despacho_pt',
                documento_id: id,
                referencia_externa: despacho.numero_despacho,
                usuario_id: usuarioId,
                motivo: `Confirmación de despacho ${despacho.numero_despacho}`,
                observaciones: 'Salida física de producto terminado'
            });
            await actualizarEstadoInventario(client, inventario.id);
            confirmaciones.push({ detalle_id: linea.id, cantidad, fisica_anterior: fisicaAnterior, fisica_posterior: nuevaFisica });
        }
        await client.query(
            `UPDATE despacho_pt SET estado = 'DESPACHADO', fecha_confirmacion = NOW(), updated_at = NOW() WHERE id = $1`,
            [id]
        );
        if (despacho.solicitud_id) {
            const pendiente = await client.query(
                `SELECT COUNT(*)::int AS total
                   FROM solicitud_despacho_pt_detalle
                  WHERE solicitud_id = $1
                    AND cantidad_despachada < cantidad_solicitada`,
                [despacho.solicitud_id]
            );
            const estadoSolicitud = pendiente.rows[0].total > 0 ? 'DESPACHADA_PARCIAL' : 'DESPACHADA';
            await client.query(
                `UPDATE solicitud_despacho_pt SET estado = $2, updated_at = NOW() WHERE id = $1`,
                [despacho.solicitud_id, estadoSolicitud]
            );
        }
        await registrarAuditoria(client, {
            accion: 'CONFIRMAR_DESPACHO',
            registro_tipo: 'despacho_pt',
            registro_id: String(id),
            valor_anterior: despacho,
            valor_nuevo: { ...despacho, estado: 'DESPACHADO' },
            motivo: sanitizeText(datos.motivo) || `Confirmación física del despacho ${despacho.numero_despacho}`,
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...despacho, estado: 'DESPACHADO', confirmaciones };
    });
}

async function cancelarDespacho(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const despachoResult = await client.query(`SELECT * FROM despacho_pt WHERE id = $1 FOR UPDATE`, [id]);
        const despacho = despachoResult.rows[0];
        if (!despacho) {
            const error = new Error('Despacho no encontrado.');
            error.status = 404;
            throw error;
        }
        if (despacho.estado !== 'EN_PREPARACION') {
            const error = new Error(`Solo se puede cancelar un despacho EN_PREPARACION. Estado actual: ${despacho.estado}.`);
            error.status = 422;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM despacho_pt_detalle WHERE despacho_id = $1 FOR UPDATE`,
            [id]
        );
        for (const linea of lineas.rows) {
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [linea.inventario_pt_id]
            );
            const inventario = invResult.rows[0];
            if (!inventario) continue;
            const cantidad = toNumber(linea.cantidad_despachada);
            const nuevaEnDespacho = Math.max(0, toNumber(inventario.cantidad_en_despacho) - cantidad);
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_en_despacho = $2, actualizado_por = $3, updated_at = NOW()
                  WHERE id = $1`,
                [inventario.id, nuevaEnDespacho, usuarioId]
            );
            await registrarMovimiento(client, {
                inventario_pt_id: inventario.id,
                tipo_movimiento: 'CANCELACION_DESPACHO',
                cantidad,
                unidad: inventario.unidad_inventario,
                saldo_anterior: toNumber(inventario.cantidad_en_despacho),
                saldo_posterior: nuevaEnDespacho,
                documento_tipo: 'despacho_pt',
                documento_id: id,
                referencia_externa: despacho.numero_despacho,
                usuario_id: usuarioId,
                motivo: sanitizeText(datos.motivo) || `Cancelación del despacho ${despacho.numero_despacho}`,
                observaciones: 'Liberación de cantidad en despacho'
            });
            await actualizarEstadoInventario(client, inventario.id);
            if (linea.solicitud_detalle_id) {
                await client.query(
                    `UPDATE solicitud_despacho_pt_detalle SET cantidad_preparada = GREATEST(0, cantidad_preparada - $2) WHERE id = $1`,
                    [linea.solicitud_detalle_id, cantidad]
                );
            }
        }
        await client.query(
            `UPDATE despacho_pt SET estado = 'CANCELADO', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        if (despacho.solicitud_id) {
            const hayReservas = await client.query(
                `SELECT COUNT(*)::int AS total FROM solicitud_despacho_pt_detalle WHERE solicitud_id = $1 AND cantidad_reservada > 0`,
                [despacho.solicitud_id]
            );
            const estadoSolicitud = hayReservas.rows[0].total > 0 ? 'RESERVADA' : 'APROBADA';
            await client.query(
                `UPDATE solicitud_despacho_pt SET estado = $2, updated_at = NOW() WHERE id = $1`,
                [despacho.solicitud_id, estadoSolicitud]
            );
        }
        await registrarAuditoria(client, {
            accion: 'CANCELAR_DESPACHO',
            registro_tipo: 'despacho_pt',
            registro_id: String(id),
            valor_anterior: despacho,
            valor_nuevo: { ...despacho, estado: 'CANCELADO' },
            motivo: sanitizeText(datos.motivo) || 'Cancelación de despacho',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...despacho, estado: 'CANCELADO' };
    });
}

async function reversarDespacho(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const despachoResult = await client.query(`SELECT * FROM despacho_pt WHERE id = $1 FOR UPDATE`, [id]);
        const despacho = despachoResult.rows[0];
        if (!despacho) {
            const error = new Error('Despacho no encontrado.');
            error.status = 404;
            throw error;
        }
        if (despacho.estado !== 'DESPACHADO') {
            const error = new Error(`Solo se puede reversar un despacho DESPACHADO. Estado actual: ${despacho.estado}.`);
            error.status = 422;
            throw error;
        }
        const enviadoSap = await client.query(
            `SELECT 1 FROM integracion_sap_inventario
              WHERE despacho_id = $1 AND estado IN ('PROCESADO', 'PROCESADO_PARCIAL', 'ENVIANDO')
              LIMIT 1`,
            [id]
        );
        if (enviadoSap.rows[0]) {
            const error = new Error('No se puede reversar el despacho porque ya fue enviado a SAP. Primero revierta la integración SAP.');
            error.status = 409;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM despacho_pt_detalle WHERE despacho_id = $1 FOR UPDATE`,
            [id]
        );
        for (const linea of lineas.rows) {
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [linea.inventario_pt_id]
            );
            const inventario = invResult.rows[0];
            if (!inventario) {
                const error = new Error('La existencia asociada al despacho ya no existe.');
                error.status = 409;
                throw error;
            }
            const cantidad = toNumber(linea.cantidad_despachada);
            let nuevaReservada = toNumber(inventario.cantidad_reservada);
            if (linea.solicitud_detalle_id) {
                const detalleSol = await client.query(
                    `SELECT reserva_id FROM solicitud_despacho_pt_detalle WHERE id = $1`,
                    [linea.solicitud_detalle_id]
                );
                const reservaId = detalleSol.rows[0] && detalleSol.rows[0].reserva_id;
                if (reservaId) {
                    const reserva = await client.query(
                        `SELECT * FROM reservas_inventario_pt WHERE id = $1 FOR UPDATE`,
                        [reservaId]
                    );
                    if (reserva.rows[0] && ['UTILIZADA', 'PARCIAL'].includes(reserva.rows[0].estado)) {
                        const nuevoEstadoReserva = reserva.rows[0].estado === 'UTILIZADA' ? 'PARCIAL' : 'PARCIAL';
                        await client.query(
                            `UPDATE reservas_inventario_pt
                                SET cantidad_reservada = cantidad_reservada + $2, estado = $3, updated_at = NOW()
                              WHERE id = $1`,
                            [reservaId, cantidad, nuevoEstadoReserva]
                        );
                        nuevaReservada = nuevaReservada + cantidad;
                    }
                }
                await client.query(
                    `UPDATE solicitud_despacho_pt_detalle SET cantidad_despachada = GREATEST(0, cantidad_despachada - $2) WHERE id = $1`,
                    [linea.solicitud_detalle_id, cantidad]
                );
            }
            const fisicaAnterior = toNumber(inventario.cantidad_fisica);
            const nuevaFisica = fisicaAnterior + cantidad;
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_fisica = $2, cantidad_reservada = $3, actualizado_por = $4, updated_at = NOW()
                  WHERE id = $1`,
                [inventario.id, nuevaFisica, nuevaReservada, usuarioId]
            );
            await registrarMovimiento(client, {
                inventario_pt_id: inventario.id,
                tipo_movimiento: 'REVERSO_SAP',
                cantidad,
                unidad: inventario.unidad_inventario,
                saldo_anterior: fisicaAnterior,
                saldo_posterior: nuevaFisica,
                documento_tipo: 'despacho_pt',
                documento_id: id,
                referencia_externa: despacho.numero_despacho,
                usuario_id: usuarioId,
                motivo: sanitizeText(datos.motivo) || 'Reversión de despacho',
                observaciones: `Reversión del despacho ${despacho.numero_despacho}`
            });
            await actualizarEstadoInventario(client, inventario.id);
        }
        await client.query(
            `UPDATE despacho_pt SET estado = 'REVERSADO', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        if (despacho.solicitud_id) {
            await client.query(
                `UPDATE solicitud_despacho_pt SET estado = 'RESERVADA', updated_at = NOW() WHERE id = $1`,
                [despacho.solicitud_id]
            );
        }
        await registrarAuditoria(client, {
            accion: 'REVERSAR_DESPACHO',
            registro_tipo: 'despacho_pt',
            registro_id: String(id),
            valor_anterior: despacho,
            valor_nuevo: { ...despacho, estado: 'REVERSADO' },
            motivo: sanitizeText(datos.motivo) || 'Reversión de despacho',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...despacho, estado: 'REVERSADO' };
    });
}

// ─── INTEGRACIÓN SAP ────────────────────────────────────────────────────────

async function listarIntegracionesSap(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.estado) add('s.estado = $', filtros.estado);
    if (filtros.despacho_id) add('s.despacho_id = $', filtros.despacho_id);
    if (filtros.desde) add('s.created_at >= $', filtros.desde);
    if (filtros.hasta) add('s.created_at <= $', filtros.hasta);
    const limit = Math.min(Math.max(Number(filtros.limit) || 100, 1), 500);
    const { rows } = await pgQuery(
        `SELECT s.id, s.operacion_uuid, s.despacho_id, s.despacho_detalle_id,
                s.solicitud_despacho_id, s.tipo_documento_sap, s.sap_doc_entry, s.sap_doc_num,
                s.sap_customer_code, s.sap_item_code, s.sap_warehouse_code, s.sap_batch_number,
                s.cantidad_enviada, s.unidad, s.estado, s.intentos,
                s.fecha_envio, s.fecha_respuesta, s.mensaje_respuesta, s.updated_at,
                d.numero_despacho, p.product_code, p.product_name, p.codigo_sap,
                l.codigo_lote, au.full_name AS usuario_nombre
           FROM integracion_sap_inventario s
           LEFT JOIN despacho_pt d ON d.id = s.despacho_id
           LEFT JOIN flexo_products p ON p.id = s.producto_id
           LEFT JOIN lote_producto_terminado l ON l.id = s.lote_id
           LEFT JOIN admin_users au ON au.id = s.usuario_id
          WHERE ${condiciones.join(' AND ')}
          ORDER BY s.created_at DESC
          LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

async function construirPayloadSap(client, integracion, productoSap) {
    const producto = await client.query(
        `SELECT p.codigo_sap, p.finished_product_sku, p.customer_code, p.client_code
           FROM flexo_products p WHERE p.id = $1`,
        [integracion.producto_id]
    );
    const itemCode = sanitizeText(productoSap && productoSap.codigo_sap) || sanitizeText(producto.rows[0] && producto.rows[0].codigo_sap) || sanitizeText(producto.rows[0] && producto.rows[0].finished_product_sku);
    const bodega = await client.query(
        `SELECT codigo_sap FROM bodega_pt WHERE id = (
             SELECT bodega_id FROM inventario_producto_terminado WHERE id = $1
         )`,
        [integracion.inventario_pt_id]
    );
    const warehouse = sanitizeText(bodega.rows[0] && bodega.rows[0].codigo_sap) || '01';
    const lote = await client.query(`SELECT codigo_lote FROM lote_producto_terminado WHERE id = $1`, [integracion.lote_id]);
    return {
        date: new Date().toISOString().slice(0, 10),
        comments: `Salida PT ${integracion.numero_despacho || ''} lote ${sanitizeText(lote.rows[0] && lote.rows[0].codigo_lote)}`.trim(),
        materials: [{
            itemCode,
            quantity: toNumber(integracion.cantidad_enviada),
            warehouse
        }]
    };
}

async function enviarDespachoASap(pgQuery, withTransaction, despachoId, usuarioId, usuarioNombre, sapLayer) {
    return withTransaction(async (client) => {
        const despacho = await client.query(`SELECT * FROM despacho_pt WHERE id = $1`, [despachoId]);
        if (!despacho.rows[0]) {
            const error = new Error('Despacho no encontrado.');
            error.status = 404;
            throw error;
        }
        if (despacho.rows[0].estado !== 'DESPACHADO') {
            const error = new Error(`Solo se puede enviar a SAP un despacho DESPACHADO. Estado actual: ${despacho.rows[0].estado}.`);
            error.status = 422;
            throw error;
        }
        const lineas = await client.query(
            `SELECT * FROM despacho_pt_detalle WHERE despacho_id = $1`,
            [despachoId]
        );
        if (!lineas.rows.length) {
            const error = new Error('El despacho no tiene líneas.');
            error.status = 422;
            throw error;
        }
        const resultados = [];
        let totalEnviadas = 0;
        for (const linea of lineas.rows) {
            const existente = await client.query(
                `SELECT * FROM integracion_sap_inventario WHERE despacho_detalle_id = $1`,
                [linea.id]
            );
            let integracion = existente.rows[0];
            if (integracion && ['PROCESADO', 'PROCESADO_PARCIAL', 'ENVIANDO'].includes(integracion.estado)) {
                resultados.push({ linea_id: linea.id, integracion_id: integracion.id, estado: integracion.estado, duplicado_evitado: true });
                continue;
            }
            const inventario = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1`,
                [linea.inventario_pt_id]
            );
            if (!inventario.rows[0]) {
                const error = new Error('La existencia asociada al despacho ya no existe.');
                error.status = 409;
                throw error;
            }
            const cliente = await client.query(
                `SELECT partner_code FROM business_partners WHERE id = $1`,
                [despacho.rows[0].cliente_id]
            );
            const operacionUuid = integracion ? integracion.operacion_uuid : crypto.randomUUID();
            if (!integracion) {
                const nuevo = await client.query(
                    `INSERT INTO integracion_sap_inventario
                     (operacion_uuid, despacho_id, despacho_detalle_id, solicitud_despacho_id,
                      producto_id, lote_id, cantidad_enviada, unidad, sap_customer_code, usuario_id, estado)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ENVIANDO')
                     RETURNING *`,
                    [operacionUuid, despachoId, linea.id, despacho.rows[0].solicitud_id || null, linea.producto_id, linea.lote_id, toNumber(linea.cantidad_despachada), linea.unidad, cliente.rows[0] ? cliente.rows[0].partner_code : null, usuarioId]
                );
                integracion = nuevo.rows[0];
            } else {
                const nuevoUuid = crypto.randomUUID();
                await client.query(
                    `UPDATE integracion_sap_inventario
                        SET estado = 'ENVIANDO', intentos = intentos + 1, operacion_uuid = $2,
                            usuario_id = $3, fecha_respuesta = NULL, updated_at = NOW()
                      WHERE id = $1`,
                    [integracion.id, nuevoUuid, usuarioId]
                );
                integracion = { ...integracion, operacion_uuid: nuevoUuid, intentos: toNumber(integracion.intentos) + 1 };
            }
            const payload = await construirPayloadSap(client, { ...integracion, inventario_pt_id: linea.inventario_pt_id, numero_despacho: despacho.rows[0].numero_despacho }, null);
            await client.query(
                `UPDATE integracion_sap_inventario SET payload_enviado = $2, fecha_envio = NOW(), updated_at = NOW() WHERE id = $1`,
                [integracion.id, JSON.stringify(payload)]
            );
            try {
                const config = await sapLayer.loadSapConfig(pgQuery);
                const respuesta = await sapLayer.createInventoryExit({ pgQuery, config, body: payload });
                const docEntry = toNumber(respuesta && respuesta.DocEntry);
                const docNum = toNumber(respuesta && respuesta.DocNum);
                const loteRow = await client.query(
                    `SELECT codigo_lote FROM lote_producto_terminado WHERE id = $1`,
                    [linea.lote_id]
                );
                await client.query(
                    `UPDATE integracion_sap_inventario
                        SET estado = 'PROCESADO', sap_doc_entry = $2, sap_doc_num = $3,
                            sap_item_code = $4, sap_warehouse_code = $5, sap_batch_number = $6,
                            fecha_respuesta = NOW(), mensaje_respuesta = NULL, respuesta_sap = $7, updated_at = NOW()
                      WHERE id = $1`,
                    [integracion.id, docEntry || null, docNum || null, payload.materials[0].itemCode, payload.materials[0].warehouse, (loteRow.rows[0] && loteRow.rows[0].codigo_lote) || null, JSON.stringify(respuesta)]
                );
                await registrarMovimiento(client, {
                    inventario_pt_id: linea.inventario_pt_id,
                    tipo_movimiento: 'SALIDA_SAP',
                    cantidad: toNumber(linea.cantidad_despachada),
                    unidad: linea.unidad,
                    documento_tipo: 'integracion_sap_inventario',
                    documento_id: integracion.id,
                    referencia_externa: docNum ? String(docNum) : operacionUuid,
                    usuario_id: usuarioId,
                    motivo: 'Salida registrada en SAP',
                    observaciones: `Documento SAP ${docNum ? `DocNum ${docNum}` : 'generado'} (${docEntry ? `DocEntry ${docEntry}` : 'sin DocEntry'})`
                });
                await registrarAuditoria(client, {
                    accion: 'SAP_PROCESADO',
                    registro_tipo: 'integracion_sap_inventario',
                    registro_id: String(integracion.id),
                    valor_nuevo: { estado: 'PROCESADO', sap_doc_entry: docEntry, sap_doc_num: docNum },
                    motivo: 'Salida de inventario confirmada en SAP',
                    usuario_id: usuarioId,
                    nombre_usuario: usuarioNombre
                });
                resultados.push({ linea_id: linea.id, integracion_id: integracion.id, estado: 'PROCESADO', sap_doc_entry: docEntry, sap_doc_num: docNum });
                totalEnviadas += 1;
            } catch (error) {
                const mensaje = sanitizeText(error && error.message) || 'Error desconocido de SAP';
                const esModoDemo = /modo en vivo/i.test(mensaje);
                const nuevoEstado = esModoDemo ? 'PENDIENTE' : 'ERROR';
                const mensajeGuardado = esModoDemo
                    ? 'SAP está en modo demo. El envío queda pendiente para cuando se configure el modo en vivo.'
                    : mensaje;
                await client.query(
                    `UPDATE integracion_sap_inventario
                        SET estado = $2, mensaje_respuesta = $3, fecha_respuesta = NOW(), updated_at = NOW()
                      WHERE id = $1`,
                    [integracion.id, nuevoEstado, mensajeGuardado]
                );
                await registrarAuditoria(client, {
                    accion: esModoDemo ? 'SAP_DEMO_PENDIENTE' : 'SAP_ERROR',
                    registro_tipo: 'integracion_sap_inventario',
                    registro_id: String(integracion.id),
                    valor_nuevo: { estado: nuevoEstado, mensaje: mensajeGuardado },
                    motivo: `Fallo en el envío a SAP (intento ${toNumber(integracion.intentos)})`,
                    usuario_id: usuarioId,
                    nombre_usuario: usuarioNombre
                });
                resultados.push({ linea_id: linea.id, integracion_id: integracion.id, estado: nuevoEstado, error: mensajeGuardado });
            }
        }
        return { despacho_id: despachoId, resultados, total_enviadas: totalEnviadas, total_lineas: lineas.rows.length };
    });
}

async function reintentarIntegracionSap(pgQuery, withTransaction, id, usuarioId, usuarioNombre, sapLayer) {
    return withTransaction(async (client) => {
        const integracionResult = await client.query(
            `SELECT * FROM integracion_sap_inventario WHERE id = $1 FOR UPDATE`,
            [id]
        );
        const integracion = integracionResult.rows[0];
        if (!integracion) {
            const error = new Error('Integración no encontrada.');
            error.status = 404;
            throw error;
        }
        if (!['ERROR', 'PENDIENTE', 'REINTENTO_PROGRAMADO', 'CANCELADO'].includes(integracion.estado)) {
            const error = new Error(`La integración está en estado ${integracion.estado} y no puede reintentarse.`);
            error.status = 422;
            throw error;
        }
        if (integracion.intentos >= SAP_MAX_REINTENTOS) {
            const error = new Error(`La integración superó el máximo de ${SAP_MAX_REINTENTOS} intentos.`);
            error.status = 422;
            throw error;
        }
        const inventario = await client.query(
            `SELECT * FROM inventario_producto_terminado WHERE id = (
                 SELECT inventario_pt_id FROM despacho_pt_detalle WHERE id = $1
             )`,
            [integracion.despacho_detalle_id]
        );
        const payload = integracion.payload_enviado
            ? toJson(integracion.payload_enviado)
            : await construirPayloadSap(client, { ...integracion, inventario_pt_id: inventario.rows[0] && inventario.rows[0].id }, null);
        const nuevosIntentos = toNumber(integracion.intentos) + 1;
        await client.query(
            `UPDATE integracion_sap_inventario
                SET estado = 'ENVIANDO', intentos = $2, fecha_envio = NOW(), updated_at = NOW()
              WHERE id = $1`,
            [id, nuevosIntentos]
        );
        try {
            const config = await sapLayer.loadSapConfig(pgQuery);
            const respuesta = await sapLayer.createInventoryExit({ pgQuery, config, body: payload });
            const docEntry = toNumber(respuesta && respuesta.DocEntry);
            const docNum = toNumber(respuesta && respuesta.DocNum);
            await client.query(
                `UPDATE integracion_sap_inventario
                    SET estado = 'PROCESADO', sap_doc_entry = $2, sap_doc_num = $3,
                        fecha_respuesta = NOW(), mensaje_respuesta = NULL, respuesta_sap = $4, updated_at = NOW()
                  WHERE id = $1`,
                [id, docEntry || null, docNum || null, JSON.stringify(respuesta)]
            );
            if (inventario.rows[0]) {
                await registrarMovimiento(client, {
                    inventario_pt_id: inventario.rows[0].id,
                    tipo_movimiento: 'SALIDA_SAP',
                    cantidad: toNumber(integracion.cantidad_enviada),
                    unidad: integracion.unidad,
                    documento_tipo: 'integracion_sap_inventario',
                    documento_id: id,
                    referencia_externa: docNum ? String(docNum) : integracion.operacion_uuid,
                    usuario_id: usuarioId,
                    motivo: 'Reintento exitoso de salida SAP',
                    observaciones: `Documento SAP DocNum ${docNum || 'n/a'} (DocEntry ${docEntry || 'n/a'})`
                });
            }
            await registrarAuditoria(client, {
                accion: 'SAP_REINTENTO_EXITOSO',
                registro_tipo: 'integracion_sap_inventario',
                registro_id: String(id),
                valor_anterior: integracion,
                valor_nuevo: { estado: 'PROCESADO', sap_doc_entry: docEntry, sap_doc_num: docNum, intentos: nuevosIntentos },
                motivo: `Reintento #${nuevosIntentos} exitoso`,
                usuario_id: usuarioId,
                nombre_usuario: usuarioNombre
            });
            return { ...integracion, estado: 'PROCESADO', sap_doc_entry: docEntry, sap_doc_num: docNum, intentos: nuevosIntentos };
        } catch (error) {
            const mensaje = sanitizeText(error && error.message) || 'Error desconocido de SAP';
            const esModoDemo = /modo en vivo/i.test(mensaje);
            const nuevoEstado = esModoDemo ? 'PENDIENTE' : (nuevosIntentos >= SAP_MAX_REINTENTOS ? 'ERROR' : 'REINTENTO_PROGRAMADO');
            const mensajeGuardado = esModoDemo
                ? 'SAP está en modo demo. El envío queda pendiente para cuando se configure el modo en vivo.'
                : mensaje;
            await client.query(
                `UPDATE integracion_sap_inventario
                    SET estado = $2, mensaje_respuesta = $3, fecha_respuesta = NOW(), updated_at = NOW()
                  WHERE id = $1`,
                [id, nuevoEstado, mensajeGuardado]
            );
            await registrarAuditoria(client, {
                accion: 'SAP_REINTENTO_FALLIDO',
                registro_tipo: 'integracion_sap_inventario',
                registro_id: String(id),
                valor_anterior: integracion,
                valor_nuevo: { estado: nuevoEstado, intentos: nuevosIntentos },
                motivo: `Reintento #${nuevosIntentos} fallido`,
                usuario_id: usuarioId,
                nombre_usuario: usuarioNombre
            });
            return { ...integracion, estado: nuevoEstado, intentos: nuevosIntentos, mensaje_respuesta: mensajeGuardado };
        }
    });
}

async function cancelarIntegracionSap(pgQuery, withTransaction, id, datos, usuarioId, usuarioNombre) {
    return withTransaction(async (client) => {
        const integracionResult = await client.query(
            `SELECT * FROM integracion_sap_inventario WHERE id = $1 FOR UPDATE`,
            [id]
        );
        const integracion = integracionResult.rows[0];
        if (!integracion) {
            const error = new Error('Integración no encontrada.');
            error.status = 404;
            throw error;
        }
        if (['PROCESADO', 'PROCESADO_PARCIAL', 'ENVIANDO'].includes(integracion.estado)) {
            const error = new Error(`La integración está en estado ${integracion.estado} y no puede cancelarse.`);
            error.status = 422;
            throw error;
        }
        await client.query(
            `UPDATE integracion_sap_inventario SET estado = 'CANCELADO', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        await registrarAuditoria(client, {
            accion: 'SAP_CANCELADO',
            registro_tipo: 'integracion_sap_inventario',
            registro_id: String(id),
            valor_anterior: integracion,
            valor_nuevo: { ...integracion, estado: 'CANCELADO' },
            motivo: sanitizeText(datos.motivo) || 'Cancelación de integración SAP',
            usuario_id: usuarioId,
            nombre_usuario: usuarioNombre
        });
        return { ...integracion, estado: 'CANCELADO' };
    });
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

async function dashboardKpis(pgQuery) {
    const [totales, pendientes, sap, dia, bajos, serie, porBodega, actividad] = await Promise.all([
        pgQuery(
            `SELECT COALESCE(SUM(cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(cantidad_reservada), 0) AS reservada,
                    COALESCE(SUM(cantidad_bloqueada), 0) AS bloqueada,
                    COALESCE(SUM(cantidad_en_despacho), 0) AS en_despacho,
                    COALESCE(SUM(cantidad_fisica - cantidad_reservada - cantidad_bloqueada - cantidad_en_despacho), 0) AS disponible,
                    COUNT(*)::int AS registros
               FROM inventario_producto_terminado`
        ),
        pgQuery(
            `SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(cantidad_solicitada - cantidad_despachada), 0) AS pendiente
               FROM solicitud_despacho_pt_detalle d
               JOIN solicitud_despacho_pt s ON s.id = d.solicitud_id
              WHERE s.estado NOT IN ('CANCELADA', 'DESPACHADA')`
        ),
        pgQuery(
            `SELECT COUNT(*) FILTER (WHERE estado IN ('PENDIENTE', 'EN_COLA'))::int AS pendientes,
                    COUNT(*) FILTER (WHERE estado = 'ERROR')::int AS errores,
                    COUNT(*) FILTER (WHERE estado = 'PROCESADO')::int AS procesadas
               FROM integracion_sap_inventario`
        ),
        pgQuery(
            `SELECT COUNT(*)::int AS total
               FROM despacho_pt
              WHERE fecha_despacho::date = CURRENT_DATE`
        ),
        pgQuery(
            `SELECT COUNT(*)::int AS total
               FROM inventario_producto_terminado
              WHERE (cantidad_fisica - cantidad_reservada - cantidad_bloqueada - cantidad_en_despacho) <= $1
                AND cantidad_fisica > 0`,
            [1000]
        ),
        pgQuery(
            `SELECT TO_CHAR(fecha_movimiento, 'YYYY-MM') AS mes,
                    COUNT(*) FILTER (WHERE tipo_movimiento = 'ENTRADA_PRODUCCION')::int AS entradas,
                    COUNT(*) FILTER (WHERE tipo_movimiento = 'CONFIRMACION_DESPACHO')::int AS salidas
               FROM movimientos_inventario_pt
              WHERE fecha_movimiento >= NOW() - INTERVAL '6 months'
              GROUP BY TO_CHAR(fecha_movimiento, 'YYYY-MM')
              ORDER BY mes`
        ),
        pgQuery(
            `SELECT b.nombre AS bodega, COALESCE(SUM(i.cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho), 0) AS disponible
               FROM inventario_producto_terminado i
               JOIN bodega_pt b ON b.id = i.bodega_id
              GROUP BY b.nombre
              ORDER BY disponible DESC`
        ),
        pgQuery(
            `SELECT m.tipo_movimiento, m.cantidad, m.fecha_movimiento,
                    p.product_code, p.product_name, au.full_name AS usuario_nombre
               FROM movimientos_inventario_pt m
               JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
               JOIN flexo_products p ON p.id = i.producto_id
               LEFT JOIN admin_users au ON au.id = m.usuario_id
              ORDER BY m.fecha_movimiento DESC
              LIMIT 15`
        )
    ]);
    return {
        totales: totales.rows[0],
        solicitudes_pendientes: pendientes.rows[0],
        sap: sap.rows[0],
        despachos_del_dia: dia.rows[0].total,
        proximos_agotarse: bajos.rows[0].total,
        serie_mensual: serie.rows,
        inventario_por_bodega: porBodega.rows,
        actividad_reciente: actividad.rows
    };
}

// ─── REPORTES ───────────────────────────────────────────────────────────────

const REPORTE_COLUMNAS = {
    existencias: ['producto', 'codigo_sap', 'cliente', 'lote', 'orden', 'bodega', 'ubicacion', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible', 'unidad', 'estado'],
    por_producto: ['producto', 'codigo_sap', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible'],
    por_cliente: ['cliente', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible'],
    por_lote: ['lote', 'estado_calidad', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible'],
    por_bodega: ['bodega', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible']
};

async function reporte(pgQuery, tipo, filtros = {}) {
    const desde = filtros.desde || null;
    const hasta = filtros.hasta || null;
    if (tipo === 'existencias') {
        const { rows } = await pgQuery(
            `SELECT p.product_code AS producto, p.codigo_sap, bp.partner_name AS cliente,
                    l.codigo_lote AS lote, o.order_code AS orden,
                    b.nombre AS bodega, u.codigo_ubicacion AS ubicacion,
                    i.cantidad_fisica AS fisica, i.cantidad_reservada AS reservada,
                    i.cantidad_bloqueada AS bloqueada, i.cantidad_en_despacho AS en_despacho,
                    (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS disponible,
                    i.unidad_inventario AS unidad, i.estado
               FROM inventario_producto_terminado i
               JOIN flexo_products p ON p.id = i.producto_id
               JOIN lote_producto_terminado l ON l.id = i.lote_id
               LEFT JOIN business_partners bp ON bp.id = i.cliente_id
               LEFT JOIN flexo_orders o ON o.id = i.orden_produccion_id
               LEFT JOIN bodega_pt b ON b.id = i.bodega_id
               LEFT JOIN ubicacion_pt u ON u.id = i.ubicacion_id
              ORDER BY p.product_code, l.codigo_lote`
        );
        return { tipo, columnas: REPORTE_COLUMNAS.existencias, filas: rows };
    }
    if (tipo === 'por_producto') {
        const { rows } = await pgQuery(
            `SELECT p.product_code AS producto, p.codigo_sap,
                    COALESCE(SUM(i.cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(i.cantidad_reservada), 0) AS reservada,
                    COALESCE(SUM(i.cantidad_bloqueada), 0) AS bloqueada,
                    COALESCE(SUM(i.cantidad_en_despacho), 0) AS en_despacho,
                    COALESCE(SUM(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho), 0) AS disponible
               FROM flexo_products p
               LEFT JOIN inventario_producto_terminado i ON i.producto_id = p.id
              GROUP BY p.product_code, p.codigo_sap
              ORDER BY p.product_code`
        );
        return { tipo, columnas: REPORTE_COLUMNAS.por_producto, filas: rows };
    }
    if (tipo === 'por_cliente') {
        const { rows } = await pgQuery(
            `SELECT bp.partner_name AS cliente,
                    COALESCE(SUM(i.cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(i.cantidad_reservada), 0) AS reservada,
                    COALESCE(SUM(i.cantidad_bloqueada), 0) AS bloqueada,
                    COALESCE(SUM(i.cantidad_en_despacho), 0) AS en_despacho,
                    COALESCE(SUM(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho), 0) AS disponible
               FROM business_partners bp
               LEFT JOIN inventario_producto_terminado i ON i.cliente_id = bp.id
              GROUP BY bp.partner_name
             HAVING COALESCE(SUM(i.cantidad_fisica), 0) > 0
              ORDER BY disponible DESC`
        );
        return { tipo, columnas: REPORTE_COLUMNAS.por_cliente, filas: rows };
    }
    if (tipo === 'por_lote') {
        const { rows } = await pgQuery(
            `SELECT l.codigo_lote AS lote, l.estado_calidad,
                    COALESCE(SUM(i.cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(i.cantidad_reservada), 0) AS reservada,
                    COALESCE(SUM(i.cantidad_bloqueada), 0) AS bloqueada,
                    COALESCE(SUM(i.cantidad_en_despacho), 0) AS en_despacho,
                    COALESCE(SUM(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho), 0) AS disponible
               FROM lote_producto_terminado l
               LEFT JOIN inventario_producto_terminado i ON i.lote_id = l.id
              GROUP BY l.codigo_lote, l.estado_calidad
              ORDER BY l.codigo_lote DESC`
        );
        return { tipo, columnas: REPORTE_COLUMNAS.por_lote, filas: rows };
    }
    if (tipo === 'por_bodega') {
        const { rows } = await pgQuery(
            `SELECT b.nombre AS bodega,
                    COALESCE(SUM(i.cantidad_fisica), 0) AS fisica,
                    COALESCE(SUM(i.cantidad_reservada), 0) AS reservada,
                    COALESCE(SUM(i.cantidad_bloqueada), 0) AS bloqueada,
                    COALESCE(SUM(i.cantidad_en_despacho), 0) AS en_despacho,
                    COALESCE(SUM(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho), 0) AS disponible
               FROM bodega_pt b
               LEFT JOIN inventario_producto_terminado i ON i.bodega_id = b.id
              GROUP BY b.nombre
              ORDER BY disponible DESC`
        );
        return { tipo, columnas: REPORTE_COLUMNAS.por_bodega, filas: rows };
    }
    if (tipo === 'movimientos') {
        const params = [];
        let condicion = '1=1';
        if (desde) { params.push(desde); condicion = `m.fecha_movimiento >= $${params.length}`; }
        if (hasta) { params.push(hasta); condicion = condicion === '1=1' ? `m.fecha_movimiento <= $${params.length}` : `${condicion} AND m.fecha_movimiento <= $${params.length}`; }
        const { rows } = await pgQuery(
            `SELECT m.fecha_movimiento AS fecha, m.tipo_movimiento AS tipo, m.cantidad,
                    m.unidad, m.saldo_anterior, m.saldo_posterior,
                    p.product_code AS producto, l.codigo_lote AS lote,
                    au.full_name AS usuario, m.motivo, m.referencia_externa AS referencia
               FROM movimientos_inventario_pt m
               JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
               JOIN flexo_products p ON p.id = i.producto_id
               JOIN lote_producto_terminado l ON l.id = i.lote_id
               LEFT JOIN admin_users au ON au.id = m.usuario_id
              WHERE ${condicion}
              ORDER BY m.fecha_movimiento DESC
              LIMIT 2000`,
            params
        );
        return { tipo, columnas: ['fecha', 'tipo', 'producto', 'lote', 'cantidad', 'unidad', 'saldo_anterior', 'saldo_posterior', 'usuario', 'referencia', 'motivo'], filas: rows };
    }
    if (tipo === 'despachos_pendientes') {
        const { rows } = await pgQuery(
            `SELECT s.numero_solicitud AS solicitud, s.fecha_programada, s.estado,
                    bp.partner_name AS cliente,
                    d.cantidad_solicitada, d.cantidad_reservada, d.cantidad_preparada, d.cantidad_despachada,
                    d.cantidad_solicitada - d.cantidad_despachada AS pendiente,
                    p.product_code AS producto
               FROM solicitud_despacho_pt s
               JOIN solicitud_despacho_pt_detalle d ON d.solicitud_id = s.id
               JOIN flexo_products p ON p.id = d.producto_id
               LEFT JOIN business_partners bp ON bp.id = s.cliente_id
              WHERE s.estado NOT IN ('CANCELADA', 'DESPACHADA')
              ORDER BY s.fecha_programada ASC NULLS LAST, s.id`
        );
        return { tipo, columnas: ['solicitud', 'cliente', 'producto', 'cantidad_solicitada', 'cantidad_reservada', 'cantidad_preparada', 'cantidad_despachada', 'pendiente', 'fecha_programada', 'estado'], filas: rows };
    }
    if (tipo === 'integraciones_sap') {
        const { rows } = await pgQuery(
            `SELECT s.estado, s.intentos, s.cantidad_enviada, s.fecha_envio, s.fecha_respuesta,
                    s.sap_doc_entry, s.sap_doc_num, s.sap_item_code, s.sap_warehouse_code,
                    s.mensaje_respuesta AS mensaje, d.numero_despacho AS despacho,
                    p.product_code AS producto, l.codigo_lote AS lote
               FROM integracion_sap_inventario s
               LEFT JOIN despacho_pt d ON d.id = s.despacho_id
               LEFT JOIN flexo_products p ON p.id = s.producto_id
               LEFT JOIN lote_producto_terminado l ON l.id = s.lote_id
              ORDER BY s.created_at DESC
              LIMIT 2000`
        );
        return { tipo, columnas: ['despacho', 'producto', 'lote', 'cantidad_enviada', 'estado', 'intentos', 'sap_doc_entry', 'sap_doc_num', 'fecha_envio', 'fecha_respuesta', 'mensaje'], filas: rows };
    }
    if (tipo === 'errores_sap') {
        const { rows } = await pgQuery(
            `SELECT s.id, s.estado, s.intentos, s.mensaje_respuesta AS mensaje,
                    s.payload_enviado, s.fecha_envio, s.fecha_respuesta,
                    d.numero_despacho AS despacho, p.product_code AS producto
               FROM integracion_sap_inventario s
               LEFT JOIN despacho_pt d ON d.id = s.despacho_id
               LEFT JOIN flexo_products p ON p.id = s.producto_id
              WHERE s.estado IN ('ERROR', 'REINTENTO_PROGRAMADO')
              ORDER BY s.updated_at DESC`
        );
        return { tipo, columnas: ['despacho', 'producto', 'estado', 'intentos', 'mensaje', 'fecha_envio', 'fecha_respuesta'], filas: rows };
    }
    if (tipo === 'ajustes') {
        const params = [];
        let condicion = "m.tipo_movimiento IN ('AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')";
        if (desde) { params.push(desde); condicion += ` AND m.fecha_movimiento >= $${params.length}`; }
        if (hasta) { params.push(hasta); condicion += ` AND m.fecha_movimiento <= $${params.length}`; }
        const { rows } = await pgQuery(
            `SELECT m.fecha_movimiento AS fecha, m.tipo_movimiento AS tipo, m.cantidad,
                    m.unidad, m.motivo, m.saldo_anterior, m.saldo_posterior,
                    p.product_code AS producto, l.codigo_lote AS lote,
                    au.full_name AS usuario
               FROM movimientos_inventario_pt m
               JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
               JOIN flexo_products p ON p.id = i.producto_id
               JOIN lote_producto_terminado l ON l.id = i.lote_id
               LEFT JOIN admin_users au ON au.id = m.usuario_id
              WHERE ${condicion}
              ORDER BY m.fecha_movimiento DESC
              LIMIT 2000`,
            params
        );
        return { tipo, columnas: ['fecha', 'tipo', 'producto', 'lote', 'cantidad', 'unidad', 'saldo_anterior', 'saldo_posterior', 'usuario', 'motivo'], filas: rows };
    }
    if (tipo === 'proximos_agotarse') {
        const { rows } = await pgQuery(
            `SELECT p.product_code AS producto, p.codigo_sap, bp.partner_name AS cliente,
                    l.codigo_lote AS lote, b.nombre AS bodega,
                    i.cantidad_fisica AS fisica, i.cantidad_reservada AS reservada,
                    i.cantidad_bloqueada AS bloqueada, i.cantidad_en_despacho AS en_despacho,
                    (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS disponible,
                    i.unidad_inventario AS unidad, i.estado
               FROM inventario_producto_terminado i
               JOIN flexo_products p ON p.id = i.producto_id
               JOIN lote_producto_terminado l ON l.id = i.lote_id
               LEFT JOIN business_partners bp ON bp.id = i.cliente_id
               LEFT JOIN bodega_pt b ON b.id = i.bodega_id
              WHERE i.cantidad_fisica > 0
                AND (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) <= 1000
              ORDER BY disponible ASC`
        );
        return { tipo, columnas: ['producto', 'codigo_sap', 'cliente', 'lote', 'bodega', 'fisica', 'reservada', 'bloqueada', 'en_despacho', 'disponible', 'unidad', 'estado'], filas: rows };
    }
    if (tipo === 'trazabilidad_lote') {
        const loteId = filtros.lote_id;
        if (!loteId) {
            const error = new Error('trazabilidad_lote requiere filtro lote_id.');
            error.status = 422;
            throw error;
        }
        const [lote, movimientos, reservas, sap] = await Promise.all([
            pgQuery(`${LOTE_SELECT} WHERE l.id = $1`, [loteId]),
            pgQuery(
                `SELECT m.*, p.product_code, b.nombre AS bodega_nombre, au.full_name AS usuario_nombre
                   FROM movimientos_inventario_pt m
                   JOIN inventario_producto_terminado i ON i.id = m.inventario_pt_id
                   JOIN flexo_products p ON p.id = i.producto_id
                   LEFT JOIN bodega_pt b ON b.id = i.bodega_id
                   LEFT JOIN admin_users au ON au.id = m.usuario_id
                  WHERE i.lote_id = $1
                  ORDER BY m.fecha_movimiento`,
                [loteId]
            ),
            pgQuery(
                `SELECT r.*, bp.partner_name AS cliente_nombre, au.full_name AS usuario_nombre
                   FROM reservas_inventario_pt r
                   LEFT JOIN business_partners bp ON bp.id = r.cliente_id
                   LEFT JOIN admin_users au ON au.id = r.usuario_id
                  WHERE r.lote_id = $1
                  ORDER BY r.fecha_reserva`,
                [loteId]
            ),
            pgQuery(
                `SELECT s.*, d.numero_despacho
                   FROM integracion_sap_inventario s
                   LEFT JOIN despacho_pt d ON d.id = s.despacho_id
                  WHERE s.lote_id = $1
                  ORDER BY s.created_at`,
                [loteId]
            )
        ]);
        return {
            tipo,
            lote: lote.rows[0] || null,
            columnas_movimientos: ['tipo_movimiento', 'cantidad', 'unidad', 'saldo_anterior', 'saldo_posterior', 'fecha_movimiento', 'usuario_nombre', 'motivo', 'observaciones'],
            movimientos: movimientos.rows,
            reservas: reservas.rows,
            integraciones_sap: sap.rows
        };
    }
    const error = new Error(`Tipo de reporte no soportado: ${tipo}.`);
    error.status = 422;
    throw error;
}

function filasACsv(columnas, filas) {
    const escapar = (valor) => {
        if (valor === null || valor === undefined) return '';
        const texto = String(typeof valor === 'object' ? JSON.stringify(valor) : valor);
        return `"${texto.replace(/"/g, '""')}"`;
    };
    const lineas = [columnas.map(escapar).join(',')];
    for (const fila of filas) {
        lineas.push(columnas.map((columna) => escapar(fila[columna])).join(','));
    }
    return lineas.join('\r\n');
}

async function exportarReporte(pgQuery, tipo, filtros) {
    const datos = await reporte(pgQuery, tipo, filtros);
    const formato = sanitizeText(filtros.formato) || 'csv';
    if (formato === 'xlsx') {
        const XLSX = require('xlsx');
        const hoja = XLSX.utils.json_to_sheet(datos.filas);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
        const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
        return { buffer, nombre: `inventario-pt-${tipo}.xlsx`, tipo: 'xlsx' };
    }
    return { buffer: Buffer.from(filasACsv(datos.columnas, datos.filas), 'utf8'), nombre: `inventario-pt-${tipo}.csv`, tipo: 'csv' };
}

// ─── PROGRAMADOR ────────────────────────────────────────────────────────────

function startInventarioPtScheduler({ pgQuery, withTransaction, sapLayer }) {
    let handle = null;
    let ejecutando = false;
    const tick = async () => {
        if (ejecutando) return;
        ejecutando = true;
        try {
            await procesarReservasVencidas(pgQuery, withTransaction);
            if (sapLayer && typeof sapLayer.loadSapConfig === 'function' && typeof sapLayer.createInventoryExit === 'function') {
                const pendientes = await pgQuery(
                    `SELECT id FROM integracion_sap_inventario
                      WHERE estado IN ('ERROR', 'REINTENTO_PROGRAMADO', 'PENDIENTE')
                        AND intentos < $1
                      ORDER BY updated_at ASC
                      LIMIT 10`,
                    [SAP_MAX_REINTENTOS]
                );
                for (const fila of pendientes.rows) {
                    await reintentarIntegracionSap(pgQuery, withTransaction, fila.id, null, 'Programador', sapLayer).catch((error) => {
                        console.error('Reintento automático SAP fallido:', error.message);
                    });
                }
            }
        } catch (error) {
            console.error('Error en el programador de inventario PT:', error.message);
        } finally {
            ejecutando = false;
        }
    };
    tick();
    handle = setInterval(tick, SAP_SCHEDULER_INTERVAL_MS);
    if (handle && typeof handle.unref === 'function') handle.unref();
    return () => clearInterval(handle);
}

// ─── RUTAS ──────────────────────────────────────────────────────────────────

function registerInventarioPtRoutes({ app, pgQuery, withTransaction, sapLayer }) {
    const sapi = sapLayer || {};

    const permitir = (req, res, modulo, acceso, detalle) => {
        if (!moduleAccess(readSession(req), modulo, acceso)) {
            res.status(403).json({ error: `No tiene permiso de ${acceso} para el módulo ${modulo}${detalle ? `. ${detalle}` : ''}.` });
            return false;
        }
        return true;
    };

    const capturar = (res, error, fallback) => {
        res.status(Number(error.status) || 500).json({ error: error.message || fallback });
    };

    // ── Catálogos para la interfaz ──
    app.get(`${API}/catalogos/productos`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarProductos(pgQuery, req.query.texto) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los productos.'); }
    });
    app.get(`${API}/catalogos/ordenes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarOrdenesProduccion(pgQuery, req.query.texto) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las órdenes.'); }
    });
    app.get(`${API}/catalogos/clientes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarClientes(pgQuery, req.query.texto) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los clientes.'); }
    });
    app.get(`${API}/catalogos/maquinas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarMaquinas(pgQuery) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las máquinas.'); }
    });
    app.get(`${API}/catalogos/usuarios`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarUsuarios(pgQuery) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los usuarios.'); }
    });
    app.get(`${API}/catalogos/unidades`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: UNIDADES });
        } catch (error) { capturar(res, error, 'No fue posible cargar las unidades.'); }
    });

    // ── Bodegas y ubicaciones ──
    app.get(`${API}/bodegas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarBodegas(pgQuery) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las bodegas.'); }
    });
    app.post(`${API}/bodegas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearBodega(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear la bodega.'); }
    });
    app.patch(`${API}/bodegas/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await actualizarBodega(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la bodega.'); }
    });
    app.delete(`${API}/bodegas/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await eliminarBodega(pgQuery, withTransaction, Number(req.params.id), usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible eliminar la bodega.'); }
    });
    app.post(`${API}/bodegas/:id/ubicaciones`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearUbicacion(pgQuery, withTransaction, { ...req.body, bodega_id: req.params.id }, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear la ubicación.'); }
    });
    app.patch(`${API}/ubicaciones/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await actualizarUbicacion(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la ubicación.'); }
    });
    app.delete(`${API}/ubicaciones/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await eliminarUbicacion(pgQuery, withTransaction, Number(req.params.id), usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible eliminar la ubicación.'); }
    });

    // ── Lotes y calidad ──
    app.get(`${API}/lotes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            const condiciones = ['1=1'];
            const params = [];
            const add = (condicion, valor) => {
                params.push(valor);
                condiciones.push(condicion.replace('$', `$${params.length}`));
            };
            if (req.query.producto_id) add('l.producto_id = $', req.query.producto_id);
            if (req.query.orden_produccion_id) add('l.orden_produccion_id = $', req.query.orden_produccion_id);
            if (req.query.cliente_id) add('l.cliente_id = $', req.query.cliente_id);
            if (req.query.estado_calidad) add('l.estado_calidad = $', req.query.estado_calidad);
            if (req.query.texto) add('(l.codigo_lote ILIKE $ OR p.product_code ILIKE $ OR p.product_name ILIKE $)', `%${req.query.texto}%`);
            const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
            const { rows } = await pgQuery(
                `${LOTE_SELECT}
                  WHERE ${condiciones.join(' AND ')}
                  ORDER BY l.created_at DESC
                  LIMIT $${params.length + 1}`,
                [...params, limit]
            );
            res.json({ rows });
        } catch (error) { capturar(res, error, 'No fue posible cargar los lotes.'); }
    });
    app.get(`${API}/lotes/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await obtenerLote(pgQuery, Number(req.params.id)));
        } catch (error) { capturar(res, error, 'No fue posible cargar el lote.'); }
    });
    app.post(`${API}/lotes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearLote(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear el lote.'); }
    });
    app.patch(`${API}/lotes/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await actualizarLote(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible actualizar el lote.'); }
    });
    app.post(`${API}/lotes/:id/calidad`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await registrarCalidad(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible registrar el control de calidad.'); }
    });
    app.post(`${API}/lotes/:id/liberar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cambiarEstadoCalidadLote(pgQuery, withTransaction, Number(req.params.id), 'liberar', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible liberar el lote.'); }
    });
    app.post(`${API}/lotes/:id/bloquear`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cambiarEstadoCalidadLote(pgQuery, withTransaction, Number(req.params.id), 'bloquear', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible bloquear el lote.'); }
    });
    app.post(`${API}/lotes/:id/desbloquear`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cambiarEstadoCalidadLote(pgQuery, withTransaction, Number(req.params.id), 'desbloquear', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible desbloquear el lote.'); }
    });

    // ── Existencias ──
    app.get(`${API}/existencias`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await listarExistencias(pgQuery, req.query));
        } catch (error) { capturar(res, error, 'No fue posible cargar las existencias.'); }
    });
    app.get(`${API}/existencias/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await obtenerExistencia(pgQuery, Number(req.params.id)));
        } catch (error) { capturar(res, error, 'No fue posible cargar la existencia.'); }
    });
    app.post(`${API}/entradas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await entradaInventario(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible registrar la entrada.'); }
    });
    app.post(`${API}/existencias/:id/ajustar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            const esEditAutorizado = moduleAccess(readSession(req), MODULE_KEY, 'edit');
            res.json(await ajustarInventario(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name, esEditAutorizado));
        } catch (error) { capturar(res, error, 'No fue posible ajustar la existencia.'); }
    });
    app.post(`${API}/existencias/:id/bloquear`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await bloquearCantidadInventario(pgQuery, withTransaction, Number(req.params.id), 'bloquear', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible bloquear la cantidad.'); }
    });
    app.post(`${API}/existencias/:id/desbloquear`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await bloquearCantidadInventario(pgQuery, withTransaction, Number(req.params.id), 'desbloquear', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible desbloquear la cantidad.'); }
    });
    app.post(`${API}/transferencias`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await transferirInventario(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible realizar la transferencia.'); }
    });

    // ── Movimientos ──
    app.get(`${API}/movimientos`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarMovimientos(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los movimientos.'); }
    });

    // ── Reservas ──
    app.get(`${API}/reservas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarReservas(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las reservas.'); }
    });
    app.post(`${API}/reservas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearReserva(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear la reserva.'); }
    });
    app.post(`${API}/reservas/:id/liberar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await liberarReserva(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible liberar la reserva.'); }
    });
    app.post(`${API}/reservas/:id/cancelar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cancelarReserva(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible cancelar la reserva.'); }
    });
    app.post(`${API}/reservas/procesar-vencidas`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            res.json(await procesarReservasVencidas(pgQuery, withTransaction));
        } catch (error) { capturar(res, error, 'No fue posible procesar las reservas vencidas.'); }
    });

    // ── Solicitudes de despacho ──
    app.get(`${API}/solicitudes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarSolicitudes(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las solicitudes.'); }
    });
    app.get(`${API}/solicitudes/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await obtenerSolicitud(pgQuery, Number(req.params.id)));
        } catch (error) { capturar(res, error, 'No fue posible cargar la solicitud.'); }
    });
    app.post(`${API}/solicitudes`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearSolicitud(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear la solicitud.'); }
    });
    app.patch(`${API}/solicitudes/:id/estado`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await actualizarSolicitud(pgQuery, withTransaction, Number(req.params.id), 'estado', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible cambiar el estado de la solicitud.'); }
    });
    app.patch(`${API}/solicitudes/:id/datos`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await actualizarSolicitud(pgQuery, withTransaction, Number(req.params.id), 'datos', req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la solicitud.'); }
    });
    app.post(`${API}/solicitudes/:id/reservar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await reservarSolicitud(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible reservar la solicitud.'); }
    });

    // ── Despachos ──
    app.get(`${API}/despachos`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarDespachos(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los despachos.'); }
    });
    app.get(`${API}/despachos/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await obtenerDespacho(pgQuery, Number(req.params.id)));
        } catch (error) { capturar(res, error, 'No fue posible cargar el despacho.'); }
    });
    app.post(`${API}/despachos`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await crearDespacho(pgQuery, withTransaction, req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible crear el despacho.'); }
    });
    app.post(`${API}/despachos/:id/confirmar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await confirmarDespacho(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible confirmar el despacho.'); }
    });
    app.post(`${API}/despachos/:id/cancelar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cancelarDespacho(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible cancelar el despacho.'); }
    });
    app.post(`${API}/despachos/:id/reversar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await reversarDespacho(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible reversar el despacho.'); }
    });

    // ── Integración SAP ──
    app.get(`${API}/sap/integraciones`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json({ rows: await listarIntegracionesSap(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las integraciones SAP.'); }
    });
    app.post(`${API}/sap/enviar`, async (req, res) => {
        try {
            if (!permitir(req, res, 'sap', 'create')) return;
            const despachoId = Number(req.body.despacho_id);
            if (!despachoId) return res.status(422).json({ error: 'despacho_id es obligatorio.' });
            const usuario = sessionUser(req);
            res.json(await enviarDespachoASap(pgQuery, withTransaction, despachoId, usuario.id, usuario.name, sapi));
        } catch (error) { capturar(res, error, 'No fue posible enviar el despacho a SAP.'); }
    });
    app.post(`${API}/sap/:id/reintentar`, async (req, res) => {
        try {
            if (!permitir(req, res, 'sap', 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await reintentarIntegracionSap(pgQuery, withTransaction, Number(req.params.id), usuario.id, usuario.name, sapi));
        } catch (error) { capturar(res, error, 'No fue posible reintentar la integración SAP.'); }
    });
    app.post(`${API}/sap/:id/cancelar`, async (req, res) => {
        try {
            if (!permitir(req, res, 'sap', 'edit')) return;
            const usuario = sessionUser(req);
            res.json(await cancelarIntegracionSap(pgQuery, withTransaction, Number(req.params.id), req.body, usuario.id, usuario.name));
        } catch (error) { capturar(res, error, 'No fue posible cancelar la integración SAP.'); }
    });
    app.get(`${API}/sap/:id/payload`, async (req, res) => {
        try {
            if (!permitir(req, res, 'sap', 'view')) return;
            const { rows } = await pgQuery(
                `SELECT id, payload_enviado, respuesta_sap, mensaje_respuesta, estado, intentos
                   FROM integracion_sap_inventario WHERE id = $1`,
                [Number(req.params.id)]
            );
            if (!rows[0]) return res.status(404).json({ error: 'Integración no encontrada.' });
            res.json(rows[0]);
        } catch (error) { capturar(res, error, 'No fue posible cargar el payload.'); }
    });

    // ── Dashboard ──
    app.get(`${API}/dashboard`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await dashboardKpis(pgQuery));
        } catch (error) { capturar(res, error, 'No fue posible cargar el dashboard.'); }
    });

    // ── Reportes ──
    app.get(`${API}/reportes/:tipo`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            res.json(await reporte(pgQuery, sanitizeText(req.params.tipo), req.query));
        } catch (error) { capturar(res, error, 'No fue posible generar el reporte.'); }
    });
    app.get(`${API}/reportes/:tipo/exportar`, async (req, res) => {
        try {
            if (!permitir(req, res, MODULE_KEY, 'view')) return;
            const resultado = await exportarReporte(pgQuery, sanitizeText(req.params.tipo), req.query);
            res.setHeader('Content-Type', resultado.tipo === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${resultado.nombre}"`);
            res.send(resultado.buffer);
        } catch (error) { capturar(res, error, 'No fue posible exportar el reporte.'); }
    });
}

module.exports = {
    ensureInventarioPtSchema,
    registerInventarioPtRoutes,
    startInventarioPtScheduler,
    crearLote
};
