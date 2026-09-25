-- ============================================================================
-- MÓDULO INVENTARIO DE PRODUCTO TERMINADO (PT) — Impresión Flexográfica
-- Fases 2-4: Bodegas, Ubicaciones, Lotes + Calidad, Inventario, Movimientos,
-- Reservas, Solicitudes de Despacho, Despachos, Integración SAP, Auditoría.
-- Idempotente (IF NOT EXISTS). Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-inventario-pt.sql
-- ============================================================================

-- 1. Catálogo local de bodegas de producto terminado
CREATE TABLE IF NOT EXISTS bodega_pt (
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
);

-- 2. Ubicaciones físicas dentro de cada bodega
CREATE TABLE IF NOT EXISTS ubicacion_pt (
    id BIGSERIAL PRIMARY KEY,
    bodega_id BIGINT NOT NULL REFERENCES bodega_pt(id) ON DELETE CASCADE,
    codigo_ubicacion TEXT NOT NULL,
    nombre TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bodega_id, codigo_ubicacion)
);

-- 3. Lotes de producto terminado (calidad + datos específicos de flexografía)
CREATE TABLE IF NOT EXISTS lote_producto_terminado (
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
);
CREATE INDEX IF NOT EXISTS idx_lote_pt_producto ON lote_producto_terminado(producto_id);
CREATE INDEX IF NOT EXISTS idx_lote_pt_orden ON lote_producto_terminado(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_lote_pt_estado ON lote_producto_terminado(estado_calidad);
CREATE INDEX IF NOT EXISTS idx_lote_pt_cliente ON lote_producto_terminado(cliente_id);

-- 4. Inventario de producto terminado
CREATE TABLE IF NOT EXISTS inventario_producto_terminado (
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
);
CREATE INDEX IF NOT EXISTS idx_inv_pt_producto ON inventario_producto_terminado(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_pt_lote ON inventario_producto_terminado(lote_id);
CREATE INDEX IF NOT EXISTS idx_inv_pt_bodega ON inventario_producto_terminado(bodega_id);
CREATE INDEX IF NOT EXISTS idx_inv_pt_estado ON inventario_producto_terminado(estado);

-- 4b. Vista de disponibilidad: disponible = física - reservada - bloqueada - en despacho
CREATE OR REPLACE VIEW v_inventario_pt_disponible AS
SELECT i.*,
       (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible
  FROM inventario_producto_terminado i;

-- 5. Movimientos de inventario (cada cambio genera un movimiento)
CREATE TABLE IF NOT EXISTS movimientos_inventario_pt (
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
);
CREATE INDEX IF NOT EXISTS idx_mov_pt_inventario ON movimientos_inventario_pt(inventario_pt_id);
CREATE INDEX IF NOT EXISTS idx_mov_pt_fecha ON movimientos_inventario_pt(fecha_movimiento);

-- 6. Reservas de inventario
CREATE TABLE IF NOT EXISTS reservas_inventario_pt (
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
);
CREATE INDEX IF NOT EXISTS idx_res_pt_inventario ON reservas_inventario_pt(inventario_pt_id);
CREATE INDEX IF NOT EXISTS idx_res_pt_estado ON reservas_inventario_pt(estado);

-- 7. Solicitudes de despacho (encabezado)
CREATE TABLE IF NOT EXISTS solicitud_despacho_pt (
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
);
CREATE INDEX IF NOT EXISTS idx_sol_pt_estado ON solicitud_despacho_pt(estado);
CREATE INDEX IF NOT EXISTS idx_sol_pt_cliente ON solicitud_despacho_pt(cliente_id);

-- 7b. Solicitudes de despacho (detalle)
CREATE TABLE IF NOT EXISTS solicitud_despacho_pt_detalle (
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
);
CREATE INDEX IF NOT EXISTS idx_sol_det_solicitud ON solicitud_despacho_pt_detalle(solicitud_id);
ALTER TABLE solicitud_despacho_pt_detalle ADD COLUMN IF NOT EXISTS reserva_id BIGINT REFERENCES reservas_inventario_pt(id) ON DELETE SET NULL;

-- 8. Despachos físicos (encabezado)
CREATE TABLE IF NOT EXISTS despacho_pt (
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
);
CREATE INDEX IF NOT EXISTS idx_des_pt_estado ON despacho_pt(estado);
CREATE INDEX IF NOT EXISTS idx_des_pt_solicitud ON despacho_pt(solicitud_id);

-- 8b. Despachos físicos (detalle)
CREATE TABLE IF NOT EXISTS despacho_pt_detalle (
    id BIGSERIAL PRIMARY KEY,
    despacho_id BIGINT NOT NULL REFERENCES despacho_pt(id) ON DELETE CASCADE,
    solicitud_detalle_id BIGINT REFERENCES solicitud_despacho_pt_detalle(id) ON DELETE SET NULL,
    producto_id UUID NOT NULL,
    lote_id BIGINT,
    inventario_pt_id BIGINT NOT NULL REFERENCES inventario_producto_terminado(id),
    cantidad_despachada NUMERIC(18,4) NOT NULL CHECK (cantidad_despachada > 0),
    unidad VARCHAR(20) NOT NULL DEFAULT 'UN',
    observaciones TEXT
);
CREATE INDEX IF NOT EXISTS idx_des_det_despacho ON despacho_pt_detalle(despacho_id);

-- 9. Integración SAP (cola idempotente con estados y reintentos)
CREATE TABLE IF NOT EXISTS integracion_sap_inventario (
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
);
CREATE INDEX IF NOT EXISTS idx_sap_inv_estado ON integracion_sap_inventario(estado);
CREATE INDEX IF NOT EXISTS idx_sap_inv_despacho ON integracion_sap_inventario(despacho_id);

-- Una sola fila de cola por línea de despacho (idempotencia: evita duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sap_inv_detalle_unico
    ON integracion_sap_inventario(despacho_detalle_id) WHERE despacho_detalle_id IS NOT NULL;

-- 10. Auditoría del módulo
CREATE TABLE IF NOT EXISTS auditoria_inventario_pt (
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
);
CREATE INDEX IF NOT EXISTS idx_aud_pt_fecha ON auditoria_inventario_pt(fecha);
CREATE INDEX IF NOT EXISTS idx_aud_pt_registro ON auditoria_inventario_pt(registro_tipo, registro_id);

-- 11. Correlativos de documentos del módulo
CREATE TABLE IF NOT EXISTS documento_pt_secuencias (
    tipo TEXT PRIMARY KEY,
    last_correlative BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Extensión del catálogo de productos (datos maestros de inventario)
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS codigo_sap TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS unidad_inventario VARCHAR(20) NOT NULL DEFAULT 'UN';
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS unidad_venta VARCHAR(20);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(12,4) NOT NULL DEFAULT 1;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS peso_unitario NUMERIC(12,4);

-- ============================================================================
-- SEMILLA DE DATOS
-- ============================================================================

-- Bodegas por defecto: mapea el catálogo SAP existente y una bodega base
INSERT INTO bodega_pt (codigo_bodega, nombre, codigo_sap, ubicacion)
SELECT w.warehouse_code, w.warehouse_name, w.warehouse_code, w.location
  FROM sap_warehouses w
 WHERE NOT EXISTS (SELECT 1 FROM bodega_pt b WHERE b.codigo_sap = w.warehouse_code);

INSERT INTO bodega_pt (codigo_bodega, nombre, codigo_sap)
SELECT '01', 'Bodega Principal PT', '01'
 WHERE NOT EXISTS (SELECT 1 FROM bodega_pt WHERE codigo_bodega = '01');

-- Permisos del módulo en los roles existentes (super-roles acceso total, resto solo lectura)
UPDATE admin_permissions SET module_permissions = jsonb_set(
    module_permissions,
    '{inventario-pt}',
    CASE
        WHEN permission_name ~* 'administrador|implementador|emergencia'
             THEN '{"view": true, "create": true, "edit": true}'::jsonb
        ELSE '{"view": true, "create": false, "edit": false}'::jsonb
    END,
    true
) WHERE NOT (module_permissions ? 'inventario-pt');
