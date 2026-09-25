// ============================================================================
// MÓDULO FACTURACIÓN FEL — PrintLab
// Genera el XML del Documento Tributario Electrónico (DTE) a partir de un
// despacho de producto terminado confirmado, listo para enviarlo a un
// certificador autorizado por la SAT (Guatemala).
// Patrón: módulo autocontenido que recibe { app, pgQuery, withTransaction }.
// ============================================================================

const MODULE_KEY = 'facturacion-fel';
const API = '/api/facturacion-fel';

const ESTADOS_DESPACHO_FACTURABLES = ['DESPACHADO', 'DESPACHADO_PARCIAL'];
const IVA_TASA = 0.12;

// ─── HELPERS BÁSICOS (mismos patrones que services/inventario-pt-service.js) ─

function sanitizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
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
        name: sanitizeText(session && (session.fullName || session.name || session.user || session.username))
    };
}

function escapeXml(value) {
    return sanitizeText(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const PAISES_A_CODIGO_ISO = {
    guatemala: 'GT', honduras: 'HN', 'el salvador': 'SV', nicaragua: 'NI',
    'costa rica': 'CR', panama: 'PA', mexico: 'MX', 'estados unidos': 'US'
};

function paisACodigoIso(valor) {
    const texto = sanitizeText(valor);
    if (!texto) return 'GT';
    if (/^[A-Z]{2}$/.test(texto)) return texto;
    return PAISES_A_CODIGO_ISO[texto.toLowerCase()] || texto.slice(0, 2).toUpperCase();
}

function fechaHoraEmisionGT(fecha = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const utc = fecha.getTime() + fecha.getTimezoneOffset() * 60000;
    const local = new Date(utc - 6 * 3600000);
    const ms = String(local.getMilliseconds()).padStart(3, '0');
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}.${ms}-06:00`;
}

// ─── ESQUEMA ────────────────────────────────────────────────────────────────

const DDL_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS factura_fel_emisor_config (
        id SMALLINT PRIMARY KEY DEFAULT 1,
        nit_emisor TEXT NOT NULL DEFAULT '',
        nombre_emisor TEXT NOT NULL DEFAULT '',
        nombre_comercial TEXT NOT NULL DEFAULT '',
        afiliacion_iva TEXT NOT NULL DEFAULT 'GEN',
        codigo_establecimiento TEXT NOT NULL DEFAULT '1',
        correo_emisor TEXT NOT NULL DEFAULT '',
        direccion TEXT NOT NULL DEFAULT '',
        codigo_postal TEXT NOT NULL DEFAULT '',
        municipio TEXT NOT NULL DEFAULT '',
        departamento TEXT NOT NULL DEFAULT '',
        pais TEXT NOT NULL DEFAULT 'GT',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT factura_fel_emisor_config_id_check CHECK (id = 1)
    )`,
    `INSERT INTO factura_fel_emisor_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS factura_fel_secuencias (
        tipo TEXT PRIMARY KEY,
        last_correlative INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS factura_fel (
        id BIGSERIAL PRIMARY KEY,
        numero_interno TEXT NOT NULL UNIQUE,
        despacho_id BIGINT NOT NULL REFERENCES despacho_pt(id),
        cliente_id UUID REFERENCES business_partners(id),
        orden_produccion_id UUID REFERENCES flexo_orders(id),
        fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        moneda TEXT NOT NULL DEFAULT 'GTQ',
        contacto_nombre TEXT NOT NULL DEFAULT '',
        contacto_email TEXT NOT NULL DEFAULT '',
        contacto_telefono TEXT NOT NULL DEFAULT '',
        notas TEXT NOT NULL DEFAULT '',
        subtotal_gravable NUMERIC(16,4) NOT NULL DEFAULT 0,
        total_iva NUMERIC(16,4) NOT NULL DEFAULT 0,
        gran_total NUMERIC(16,4) NOT NULL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'XML_GENERADO',
        xml_dte TEXT NOT NULL DEFAULT '',
        uuid_autorizacion TEXT,
        serie_dte TEXT,
        numero_dte TEXT,
        fecha_certificacion TIMESTAMPTZ,
        creado_por BIGINT REFERENCES admin_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE factura_fel ADD COLUMN IF NOT EXISTS contacto_nombre TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE factura_fel ADD COLUMN IF NOT EXISTS contacto_email TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE factura_fel ADD COLUMN IF NOT EXISTS contacto_telefono TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE factura_fel ADD COLUMN IF NOT EXISTS notas TEXT NOT NULL DEFAULT ''`,
    `CREATE INDEX IF NOT EXISTS idx_factura_fel_despacho ON factura_fel(despacho_id)`,
    `CREATE INDEX IF NOT EXISTS idx_factura_fel_cliente ON factura_fel(cliente_id)`,
    `CREATE TABLE IF NOT EXISTS factura_fel_detalle (
        id BIGSERIAL PRIMARY KEY,
        factura_fel_id BIGINT NOT NULL REFERENCES factura_fel(id) ON DELETE CASCADE,
        despacho_detalle_id BIGINT REFERENCES despacho_pt_detalle(id),
        producto_id UUID REFERENCES flexo_products(id),
        descripcion TEXT NOT NULL DEFAULT '',
        cantidad NUMERIC(18,4) NOT NULL DEFAULT 0,
        unidad_medida TEXT NOT NULL DEFAULT 'UN',
        precio_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
        monto_descuento NUMERIC(14,4) NOT NULL DEFAULT 0,
        monto_linea NUMERIC(14,4) NOT NULL DEFAULT 0,
        monto_gravable NUMERIC(14,4) NOT NULL DEFAULT 0,
        tasa_impuesto NUMERIC(8,4) NOT NULL DEFAULT 12,
        monto_impuesto NUMERIC(14,4) NOT NULL DEFAULT 0
    )`,
    `ALTER TABLE factura_fel_detalle ADD COLUMN IF NOT EXISTS monto_descuento NUMERIC(14,4) NOT NULL DEFAULT 0`,
    `ALTER TABLE factura_fel_detalle ADD COLUMN IF NOT EXISTS tasa_impuesto NUMERIC(8,4) NOT NULL DEFAULT 12`,
    `CREATE INDEX IF NOT EXISTS idx_factura_fel_detalle_factura ON factura_fel_detalle(factura_fel_id)`,
    `CREATE TABLE IF NOT EXISTS factura_fel_frases (
        id SERIAL PRIMARY KEY,
        codigo_escenario TEXT NOT NULL,
        tipo_frase TEXT NOT NULL,
        descripcion TEXT NOT NULL DEFAULT '',
        activo BOOLEAN NOT NULL DEFAULT true,
        orden INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `INSERT INTO factura_fel_frases (codigo_escenario, tipo_frase, descripcion, orden)
     SELECT '1', '1', 'Frase estándar del régimen general (confirmar con el contador)', 1
     WHERE NOT EXISTS (SELECT 1 FROM factura_fel_frases)`,
    `INSERT INTO factura_fel_frases (codigo_escenario, tipo_frase, descripcion, orden)
     SELECT '1', '2', 'Frase estándar del régimen general (confirmar con el contador)', 2
     WHERE (SELECT COUNT(*) FROM factura_fel_frases) = 1`,
    `CREATE TABLE IF NOT EXISTS factura_fel_certificador_config (
        id SMALLINT PRIMARY KEY DEFAULT 1,
        proveedor TEXT NOT NULL DEFAULT '',
        modo TEXT NOT NULL DEFAULT 'pendiente',
        api_url TEXT NOT NULL DEFAULT '',
        usuario_api TEXT NOT NULL DEFAULT '',
        clave_api TEXT NOT NULL DEFAULT '',
        api_key TEXT NOT NULL DEFAULT '',
        correo_notificaciones TEXT NOT NULL DEFAULT '',
        notas TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT factura_fel_certificador_config_id_check CHECK (id = 1)
    )`,
    `INSERT INTO factura_fel_certificador_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
];

async function ensureFacturaFelSchema(pgQuery) {
    for (const statement of DDL_STATEMENTS) {
        await pgQuery(statement);
    }
}

// ─── SECUENCIA DE NUMERACIÓN INTERNA ────────────────────────────────────────

function escapeRegexLiteral(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generarNumeroFactura(client, prefijo) {
    const safePrefix = sanitizeText(prefijo) || 'FACT-';
    const regexBuscar = `^${escapeRegexLiteral(safePrefix)}[0-9]+$`;
    const result = await client.query(
        `SELECT numero_interno FROM factura_fel WHERE numero_interno ~* $1`,
        [regexBuscar]
    );
    let maxValue = 0;
    let pad = 6;
    const matcher = new RegExp(`^${escapeRegexLiteral(safePrefix)}(\\d+)$`, 'i');
    for (const row of result.rows || []) {
        const match = String(row.numero_interno || '').trim().match(matcher);
        if (!match) continue;
        const numeric = Number(match[1]);
        if (Number.isFinite(numeric)) {
            maxValue = Math.max(maxValue, numeric);
            pad = Math.max(pad, match[1].length);
        }
    }
    return `${safePrefix}${String(maxValue + 1).padStart(pad, '0')}`;
}

async function obtenerPrefijoFactura(loadGeneralConfig) {
    try {
        const config = await loadGeneralConfig();
        const prefijo = sanitizeText(config?.general?.invoiceCodePrefix);
        return prefijo || 'FACT-';
    } catch (error) {
        return 'FACT-';
    }
}

// ─── EMISOR ─────────────────────────────────────────────────────────────────

async function obtenerEmisorConfig(pgQuery) {
    const { rows } = await pgQuery(`SELECT * FROM factura_fel_emisor_config WHERE id = 1`);
    return rows[0];
}

async function actualizarEmisorConfig(pgQuery, datos) {
    const { rows } = await pgQuery(
        `UPDATE factura_fel_emisor_config SET
            nit_emisor = $1, nombre_emisor = $2, nombre_comercial = $3,
            afiliacion_iva = $4, codigo_establecimiento = $5, correo_emisor = $6,
            direccion = $7, codigo_postal = $8, municipio = $9, departamento = $10,
            pais = $11, updated_at = NOW()
         WHERE id = 1
         RETURNING *`,
        [
            sanitizeText(datos.nit_emisor),
            sanitizeText(datos.nombre_emisor),
            sanitizeText(datos.nombre_comercial),
            sanitizeText(datos.afiliacion_iva) || 'GEN',
            sanitizeText(datos.codigo_establecimiento) || '1',
            sanitizeText(datos.correo_emisor),
            sanitizeText(datos.direccion),
            sanitizeText(datos.codigo_postal),
            sanitizeText(datos.municipio),
            sanitizeText(datos.departamento),
            sanitizeText(datos.pais) || 'GT'
        ]
    );
    return rows[0];
}

// ─── FRASES FISCALES ────────────────────────────────────────────────────────

async function listarFrases(pgQuery) {
    const { rows } = await pgQuery(`SELECT * FROM factura_fel_frases ORDER BY orden, id`);
    return rows;
}

async function obtenerFrasesActivas(pgQuery) {
    const { rows } = await pgQuery(
        `SELECT codigo_escenario, tipo_frase FROM factura_fel_frases WHERE activo = true ORDER BY orden, id`
    );
    return rows;
}

async function crearFrase(pgQuery, datos) {
    const { rows } = await pgQuery(
        `INSERT INTO factura_fel_frases (codigo_escenario, tipo_frase, descripcion, activo, orden)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            sanitizeText(datos.codigo_escenario),
            sanitizeText(datos.tipo_frase),
            sanitizeText(datos.descripcion),
            datos.activo !== false,
            Number(datos.orden) || 0
        ]
    );
    return rows[0];
}

async function actualizarFrase(pgQuery, id, datos) {
    const { rows } = await pgQuery(
        `UPDATE factura_fel_frases SET
            codigo_escenario = $1, tipo_frase = $2, descripcion = $3, activo = $4, orden = $5
         WHERE id = $6 RETURNING *`,
        [
            sanitizeText(datos.codigo_escenario),
            sanitizeText(datos.tipo_frase),
            sanitizeText(datos.descripcion),
            datos.activo !== false,
            Number(datos.orden) || 0,
            Number(id)
        ]
    );
    if (!rows[0]) {
        const error = new Error('Frase no encontrada.');
        error.status = 404;
        throw error;
    }
    return rows[0];
}

async function eliminarFrase(pgQuery, id) {
    await pgQuery(`DELETE FROM factura_fel_frases WHERE id = $1`, [Number(id)]);
    return { ok: true };
}

// ─── CONFIGURACIÓN DEL CERTIFICADOR ─────────────────────────────────────────

async function obtenerCertificadorConfig(pgQuery) {
    const { rows } = await pgQuery(`SELECT * FROM factura_fel_certificador_config WHERE id = 1`);
    return rows[0];
}

async function actualizarCertificadorConfig(pgQuery, datos) {
    const { rows } = await pgQuery(
        `UPDATE factura_fel_certificador_config SET
            proveedor = $1, modo = $2, api_url = $3, usuario_api = $4,
            clave_api = $5, api_key = $6, correo_notificaciones = $7, notas = $8,
            updated_at = NOW()
         WHERE id = 1
         RETURNING *`,
        [
            sanitizeText(datos.proveedor),
            sanitizeText(datos.modo) || 'pendiente',
            sanitizeText(datos.api_url),
            sanitizeText(datos.usuario_api),
            sanitizeText(datos.clave_api),
            sanitizeText(datos.api_key),
            sanitizeText(datos.correo_notificaciones),
            sanitizeText(datos.notas)
        ]
    );
    return rows[0];
}

// ─── RECEPTOR (SOCIO DE NEGOCIO) ────────────────────────────────────────────

async function obtenerReceptor(pgQuery, clienteId) {
    const { rows } = await pgQuery(
        `SELECT id, partner_code, partner_name, tax_id, currency_code, is_tax_exempt
           FROM business_partners WHERE id = $1`,
        [clienteId]
    );
    const socio = rows[0];
    if (!socio) {
        const error = new Error('El despacho no tiene un cliente asociado válido.');
        error.status = 422;
        throw error;
    }
    const direccion = await pgQuery(
        `SELECT address_line, county, district, state_province, country, zip_code
           FROM business_partner_addresses
          WHERE partner_code = $1
          ORDER BY (address_type ILIKE 'facturaci%') DESC, id ASC
          LIMIT 1`,
        [socio.partner_code]
    );
    return { socio, direccion: direccion.rows[0] || null };
}

// ─── DESPACHO Y SU DETALLE FACTURABLE ───────────────────────────────────────

async function obtenerDespachoFacturable(pgQuery, despachoId) {
    const { rows } = await pgQuery(`SELECT * FROM despacho_pt WHERE id = $1`, [despachoId]);
    const despacho = rows[0];
    if (!despacho) {
        const error = new Error('Despacho no encontrado.');
        error.status = 404;
        throw error;
    }
    if (!ESTADOS_DESPACHO_FACTURABLES.includes(despacho.estado)) {
        const error = new Error(`El despacho debe estar DESPACHADO o DESPACHADO_PARCIAL para poder facturarse. Estado actual: ${despacho.estado}.`);
        error.status = 422;
        throw error;
    }
    const detalle = await pgQuery(
        `SELECT x.id AS despacho_detalle_id, x.producto_id, x.cantidad_despachada, x.unidad,
                p.product_name, p.product_code, p.price_unit, p.source_calculation_code
           FROM despacho_pt_detalle x
           JOIN flexo_products p ON p.id = x.producto_id
          WHERE x.despacho_id = $1
          ORDER BY x.id`,
        [despachoId]
    );
    if (!detalle.rows.length) {
        const error = new Error('El despacho no tiene líneas de producto.');
        error.status = 422;
        throw error;
    }
    const yaFacturado = await pgQuery(
        `SELECT id, numero_interno FROM factura_fel WHERE despacho_id = $1 AND estado <> 'ANULADA'`,
        [despachoId]
    );
    if (yaFacturado.rows.length) {
        const error = new Error(`Este despacho ya tiene una factura FEL generada (${yaFacturado.rows[0].numero_interno}).`);
        error.status = 422;
        throw error;
    }
    return { despacho, detalle: detalle.rows };
}

// ─── ARMADO DEL XML DTE (esquema dte:GTDocumento 0.2.0 de la SAT) ──────────

// El precio unitario del producto (flexo_products.price_unit) ya incluye IVA y ya
// refleja el descuento pactado en la cotización (total_cost = (subtotal_cost -
// discount_amount) * (1 + tax_percent/100), verificado contra datos reales de
// flexo_calculations). Por eso "monto_linea" (el Total cobrado) se calcula igual
// que antes; lo que agregamos aquí es mostrar el descuento y la tasa de IVA reales
// de la cotización de origen (en vez de asumir 12% fijo y descuento 0), y respetar
// la exención de impuestos del cliente (business_partners.is_tax_exempt).
function calcularLineaFactura({ precioUnitario, cantidad, calculoOrigen, exento }) {
    const montoLinea = round2(precioUnitario * cantidad);
    let tasaImpuesto = (calculoOrigen && calculoOrigen.tax_percent != null)
        ? toNumber(calculoOrigen.tax_percent)
        : IVA_TASA * 100;
    if (exento) tasaImpuesto = 0;
    const factorImpuesto = 1 + (tasaImpuesto / 100);
    const montoGravable = round2(montoLinea / factorImpuesto);
    const montoImpuesto = round2(montoLinea - montoGravable);
    let montoDescuento = 0;
    if (calculoOrigen && toNumber(calculoOrigen.discount_amount) > 0 && toNumber(calculoOrigen.quantity) > 0) {
        const descuentoPorUnidad = toNumber(calculoOrigen.discount_amount) / toNumber(calculoOrigen.quantity);
        montoDescuento = round2(descuentoPorUnidad * cantidad * factorImpuesto);
    }
    return {
        precio_unitario: precioUnitario,
        cantidad,
        monto_descuento: montoDescuento,
        monto_linea: montoLinea,
        monto_gravable: montoGravable,
        tasa_impuesto: tasaImpuesto,
        monto_impuesto: montoImpuesto
    };
}

async function obtenerCalculoOrigen(queryFn, sourceCalculationCode) {
    if (!sourceCalculationCode) return null;
    const { rows } = await queryFn(
        `SELECT discount_amount, tax_percent, quantity FROM flexo_calculations WHERE calculation_code = $1 LIMIT 1`,
        [sourceCalculationCode]
    );
    return rows[0] || null;
}

async function construirLineasFactura(queryFn, detalle, exento) {
    const lineas = [];
    for (const linea of detalle) {
        const cantidad = toNumber(linea.cantidad_despachada);
        const precioUnitario = toNumber(linea.price_unit);
        const calculoOrigen = await obtenerCalculoOrigen(queryFn, linea.source_calculation_code);
        const calculo = calcularLineaFactura({ precioUnitario, cantidad, calculoOrigen, exento });
        lineas.push({
            despacho_detalle_id: linea.despacho_detalle_id,
            producto_id: linea.producto_id,
            descripcion: linea.product_name || linea.product_code || 'Producto',
            unidad_medida: linea.unidad || 'UN',
            ...calculo
        });
    }
    return lineas;
}

function construirXmlDte({ emisor, receptor, direccionReceptor, lineas, totales, moneda, fechaEmision, frases }) {
    const itemsXml = lineas.map((linea, index) => `
                    <dte:Item BienOServicio="B" NumeroLinea="${index + 1}">
                        <dte:Cantidad>${linea.cantidad.toFixed(2)}</dte:Cantidad>
                        <dte:UnidadMedida>${escapeXml(linea.unidad_medida)}</dte:UnidadMedida>
                        <dte:Descripcion>${escapeXml(linea.descripcion)}</dte:Descripcion>
                        <dte:PrecioUnitario>${linea.precio_unitario.toFixed(4)}</dte:PrecioUnitario>
                        <dte:Precio>${(linea.monto_linea + linea.monto_descuento).toFixed(2)}</dte:Precio>
                        <dte:Descuento>${linea.monto_descuento.toFixed(2)}</dte:Descuento>
                        <dte:Impuestos>
                            <dte:Impuesto>
                                <dte:NombreCorto>IVA</dte:NombreCorto>
                                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                                <dte:MontoGravable>${linea.monto_gravable.toFixed(2)}</dte:MontoGravable>
                                <dte:MontoImpuesto>${linea.monto_impuesto.toFixed(2)}</dte:MontoImpuesto>
                            </dte:Impuesto>
                        </dte:Impuestos>
                        <dte:Total>${linea.monto_linea.toFixed(2)}</dte:Total>
                    </dte:Item>`).join('');

    const idReceptor = receptor.tax_id && receptor.tax_id.trim() && receptor.tax_id.trim() !== '000000000000'
        ? receptor.tax_id.trim()
        : 'CF';

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" xmlns:xd="http://www.w3.org/2000/09/xmldsig#" Version="0.1">
    <dte:SAT ClaseDocumento="dte">
        <dte:DTE ID="DatosCertificados">
            <dte:DatosEmision ID="DatosEmision">
                <dte:DatosGenerales CodigoMoneda="${escapeXml(moneda)}" FechaHoraEmision="${fechaEmision}" Tipo="FACT"/>
                <dte:Emisor AfiliacionIVA="${escapeXml(emisor.afiliacion_iva)}" CodigoEstablecimiento="${escapeXml(emisor.codigo_establecimiento)}" CorreoEmisor="${escapeXml(emisor.correo_emisor)}" NITEmisor="${escapeXml(emisor.nit_emisor)}" NombreComercial="${escapeXml(emisor.nombre_comercial)}" NombreEmisor="${escapeXml(emisor.nombre_emisor)}">
                    <dte:DireccionEmisor>
                        <dte:Direccion>${escapeXml(emisor.direccion)}</dte:Direccion>
                        <dte:CodigoPostal>${escapeXml(emisor.codigo_postal)}</dte:CodigoPostal>
                        <dte:Municipio>${escapeXml(emisor.municipio)}</dte:Municipio>
                        <dte:Departamento>${escapeXml(emisor.departamento)}</dte:Departamento>
                        <dte:Pais>${escapeXml(emisor.pais)}</dte:Pais>
                    </dte:DireccionEmisor>
                </dte:Emisor>
                <dte:Receptor CorreoReceptor="" IDReceptor="${escapeXml(idReceptor)}" NombreReceptor="${escapeXml(receptor.partner_name)}">
                    <dte:DireccionReceptor>
                        <dte:Direccion>${escapeXml(direccionReceptor ? direccionReceptor.address_line : '')}</dte:Direccion>
                        <dte:CodigoPostal>${escapeXml(direccionReceptor ? direccionReceptor.zip_code : '')}</dte:CodigoPostal>
                        <dte:Municipio>${escapeXml(direccionReceptor ? direccionReceptor.county : '')}</dte:Municipio>
                        <dte:Departamento>${escapeXml(direccionReceptor ? direccionReceptor.state_province : '')}</dte:Departamento>
                        <dte:Pais>${escapeXml(paisACodigoIso(direccionReceptor && direccionReceptor.country))}</dte:Pais>
                    </dte:DireccionReceptor>
                </dte:Receptor>
                <dte:Frases>${(frases && frases.length ? frases : [{ codigo_escenario: '1', tipo_frase: '1' }, { codigo_escenario: '1', tipo_frase: '2' }]).map((frase) => `
                    <dte:Frase CodigoEscenario="${escapeXml(frase.codigo_escenario)}" TipoFrase="${escapeXml(frase.tipo_frase)}"/>`).join('')}
                </dte:Frases>
                <dte:Items>${itemsXml}
                </dte:Items>
                <dte:Totales>
                    <dte:TotalImpuestos>
                        <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${totales.total_iva.toFixed(2)}"/>
                    </dte:TotalImpuestos>
                    <dte:GranTotal>${totales.gran_total.toFixed(2)}</dte:GranTotal>
                </dte:Totales>
            </dte:DatosEmision>
        </dte:DTE>
    </dte:SAT>
</dte:GTDocumento>`;
}

// ─── GENERACIÓN Y PERSISTENCIA ──────────────────────────────────────────────

async function generarFacturaDesdeDespacho(pgQuery, withTransaction, despachoId, usuario, loadGeneralConfig) {
    const { despacho, detalle } = await obtenerDespachoFacturable(pgQuery, despachoId);
    const { socio, direccion } = await obtenerReceptor(pgQuery, despacho.cliente_id);
    const emisor = await obtenerEmisorConfig(pgQuery);
    const frases = await obtenerFrasesActivas(pgQuery);
    const prefijo = await obtenerPrefijoFactura(loadGeneralConfig);

    const lineas = await construirLineasFactura(pgQuery, detalle, socio.is_tax_exempt);
    const totales = {
        subtotal_gravable: round2(lineas.reduce((acc, l) => acc + l.monto_gravable, 0)),
        total_iva: round2(lineas.reduce((acc, l) => acc + l.monto_impuesto, 0)),
        gran_total: round2(lineas.reduce((acc, l) => acc + l.monto_linea, 0))
    };
    const moneda = sanitizeText(socio.currency_code) || 'GTQ';
    const fechaEmision = fechaHoraEmisionGT();

    const xml = construirXmlDte({ emisor, receptor: socio, direccionReceptor: direccion, lineas, totales, moneda, fechaEmision, frases });

    return withTransaction(async (client) => {
        const numeroInterno = await generarNumeroFactura(client, prefijo);
        const cabeceraResult = await client.query(
            `INSERT INTO factura_fel
             (numero_interno, despacho_id, cliente_id, orden_produccion_id, moneda,
              subtotal_gravable, total_iva, gran_total, estado, xml_dte, creado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'XML_GENERADO', $9, $10)
             RETURNING *`,
            [
                numeroInterno, despacho.id, despacho.cliente_id, despacho.pedido_id, moneda,
                totales.subtotal_gravable, totales.total_iva, totales.gran_total, xml, usuario.id
            ]
        );
        const factura = cabeceraResult.rows[0];
        for (const linea of lineas) {
            await client.query(
                `INSERT INTO factura_fel_detalle
                 (factura_fel_id, despacho_detalle_id, producto_id, descripcion, cantidad,
                  unidad_medida, precio_unitario, monto_descuento, monto_linea, monto_gravable,
                  tasa_impuesto, monto_impuesto)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    factura.id, linea.despacho_detalle_id, linea.producto_id, linea.descripcion,
                    linea.cantidad, linea.unidad_medida, linea.precio_unitario, linea.monto_descuento,
                    linea.monto_linea, linea.monto_gravable, linea.tasa_impuesto, linea.monto_impuesto
                ]
            );
        }
        return { ...factura, detalle: lineas };
    });
}

async function generarNumeroDespachoDirecto(client) {
    const result = await client.query(
        `INSERT INTO factura_fel_secuencias (tipo, last_correlative)
         VALUES ('DESPACHO_FEL_DIRECTO', 1)
         ON CONFLICT (tipo)
         DO UPDATE SET last_correlative = factura_fel_secuencias.last_correlative + 1,
                       updated_at = NOW()
         RETURNING last_correlative`,
        []
    );
    const correlativo = Number(result.rows[0].last_correlative);
    return `DPF-${String(correlativo).padStart(6, '0')}`;
}

async function generarFacturaDesdeInventario(pgQuery, withTransaction, datos, usuario, loadGeneralConfig) {
    const clienteId = sanitizeText(datos.cliente_id);
    if (!clienteId) {
        const error = new Error('cliente_id es obligatorio.');
        error.status = 422;
        throw error;
    }
    const lineasSolicitadas = Array.isArray(datos.lineas) ? datos.lineas : [];
    if (!lineasSolicitadas.length) {
        const error = new Error('Debe incluir al menos una línea de producto.');
        error.status = 422;
        throw error;
    }
    const prefijo = await obtenerPrefijoFactura(loadGeneralConfig);
    const advertencias = [];

    return withTransaction(async (client) => {
        const socioResult = await client.query(
            `SELECT id, partner_code, partner_name, tax_id, currency_code, is_tax_exempt
               FROM business_partners WHERE id = $1`,
            [clienteId]
        );
        const socio = socioResult.rows[0];
        if (!socio) {
            const error = new Error('Cliente no encontrado.');
            error.status = 404;
            throw error;
        }
        const direccionResult = await client.query(
            `SELECT address_line, county, district, state_province, country, zip_code
               FROM business_partner_addresses
              WHERE partner_code = $1
              ORDER BY (address_type ILIKE 'facturaci%') DESC, id ASC
              LIMIT 1`,
            [socio.partner_code]
        );
        const direccion = direccionResult.rows[0] || null;

        const emisorResult = await client.query(`SELECT * FROM factura_fel_emisor_config WHERE id = 1`);
        const emisor = emisorResult.rows[0];
        const frasesResult = await client.query(
            `SELECT codigo_escenario, tipo_frase FROM factura_fel_frases WHERE activo = true ORDER BY orden, id`
        );

        let bodegaId = null;
        const detalleParaInsertar = [];
        const lineasFactura = [];

        for (const linea of lineasSolicitadas) {
            const inventarioId = Number(linea.inventario_pt_id);
            const cantidad = toNumber(linea.cantidad);
            if (!inventarioId || cantidad <= 0) {
                const error = new Error('Cada línea requiere inventario_pt_id y una cantidad mayor a 0.');
                error.status = 422;
                throw error;
            }
            const invResult = await client.query(
                `SELECT * FROM inventario_producto_terminado WHERE id = $1 FOR UPDATE`,
                [inventarioId]
            );
            const inventario = invResult.rows[0];
            if (!inventario) {
                const error = new Error(`La existencia ${inventarioId} no existe.`);
                error.status = 404;
                throw error;
            }
            const disponible = toNumber(inventario.cantidad_fisica) - toNumber(inventario.cantidad_reservada)
                - toNumber(inventario.cantidad_bloqueada) - toNumber(inventario.cantidad_en_despacho);
            if (cantidad > disponible) {
                const error = new Error(`La existencia ${inventarioId} solo tiene ${disponible} unidades disponibles.`);
                error.status = 422;
                throw error;
            }
            if (inventario.cliente_id && inventario.cliente_id !== clienteId) {
                const otroClienteResult = await client.query(
                    `SELECT partner_name FROM business_partners WHERE id = $1`,
                    [inventario.cliente_id]
                );
                const otroNombre = otroClienteResult.rows[0]?.partner_name || 'otro cliente';
                advertencias.push(`La existencia ${inventarioId} está asociada a "${otroNombre}", no al cliente seleccionado en esta factura.`);
            }
            const productoResult = await client.query(
                `SELECT id, product_code, product_name, price_unit, source_calculation_code FROM flexo_products WHERE id = $1`,
                [inventario.producto_id]
            );
            const producto = productoResult.rows[0];
            if (!producto) {
                const error = new Error(`El producto asociado a la existencia ${inventarioId} no fue encontrado.`);
                error.status = 422;
                throw error;
            }

            const nuevaFisica = toNumber(inventario.cantidad_fisica) - cantidad;
            await client.query(
                `UPDATE inventario_producto_terminado
                    SET cantidad_fisica = $2, actualizado_por = $3, updated_at = NOW()
                  WHERE id = $1`,
                [inventarioId, nuevaFisica, usuario.id]
            );

            if (!bodegaId) bodegaId = inventario.bodega_id;

            detalleParaInsertar.push({
                inventario_pt_id: inventarioId,
                producto_id: inventario.producto_id,
                lote_id: inventario.lote_id,
                cantidad,
                unidad: inventario.unidad_inventario || 'UN'
            });

            const precioUnitario = toNumber(producto.price_unit);
            const calculoOrigen = await obtenerCalculoOrigen(
                (sql, params) => client.query(sql, params),
                producto.source_calculation_code
            );
            const calculo = calcularLineaFactura({ precioUnitario, cantidad, calculoOrigen, exento: socio.is_tax_exempt });
            lineasFactura.push({
                despacho_detalle_id: null,
                producto_id: inventario.producto_id,
                descripcion: producto.product_name || producto.product_code || 'Producto',
                unidad_medida: inventario.unidad_inventario || 'UN',
                ...calculo
            });
        }

        const numeroDespacho = await generarNumeroDespachoDirecto(client);
        const despachoResult = await client.query(
            `INSERT INTO despacho_pt (numero_despacho, cliente_id, bodega_id, estado, observaciones, creado_por)
             VALUES ($1, $2, $3, 'DESPACHADO', $4, $5)
             RETURNING *`,
            [numeroDespacho, clienteId, bodegaId, 'Generado automáticamente desde el creador de Facturación FEL', usuario.id]
        );
        const despacho = despachoResult.rows[0];

        for (let i = 0; i < detalleParaInsertar.length; i += 1) {
            const item = detalleParaInsertar[i];
            const detalleResult = await client.query(
                `INSERT INTO despacho_pt_detalle
                 (despacho_id, producto_id, lote_id, inventario_pt_id, cantidad_despachada, unidad)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [despacho.id, item.producto_id, item.lote_id, item.inventario_pt_id, item.cantidad, item.unidad]
            );
            lineasFactura[i].despacho_detalle_id = detalleResult.rows[0].id;
        }

        const totales = {
            subtotal_gravable: round2(lineasFactura.reduce((acc, l) => acc + l.monto_gravable, 0)),
            total_iva: round2(lineasFactura.reduce((acc, l) => acc + l.monto_impuesto, 0)),
            gran_total: round2(lineasFactura.reduce((acc, l) => acc + l.monto_linea, 0))
        };
        const moneda = sanitizeText(datos.moneda) || sanitizeText(socio.currency_code) || 'GTQ';
        const contactoNombre = sanitizeText(datos.contacto_nombre);
        const contactoEmail = sanitizeText(datos.contacto_email);
        const contactoTelefono = sanitizeText(datos.contacto_telefono);
        const notas = sanitizeText(datos.notas);
        const fechaEmision = fechaHoraEmisionGT();
        const xml = construirXmlDte({
            emisor, receptor: socio, direccionReceptor: direccion, lineas: lineasFactura,
            totales, moneda, fechaEmision, frases: frasesResult.rows
        });

        const numeroInterno = await generarNumeroFactura(client, prefijo);
        const cabeceraResult = await client.query(
            `INSERT INTO factura_fel
             (numero_interno, despacho_id, cliente_id, orden_produccion_id, moneda,
              contacto_nombre, contacto_email, contacto_telefono, notas,
              subtotal_gravable, total_iva, gran_total, estado, xml_dte, creado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'XML_GENERADO', $13, $14)
             RETURNING *`,
            [
                numeroInterno, despacho.id, clienteId, null, moneda,
                contactoNombre, contactoEmail, contactoTelefono, notas,
                totales.subtotal_gravable, totales.total_iva, totales.gran_total, xml, usuario.id
            ]
        );
        const factura = cabeceraResult.rows[0];
        for (const linea of lineasFactura) {
            await client.query(
                `INSERT INTO factura_fel_detalle
                 (factura_fel_id, despacho_detalle_id, producto_id, descripcion, cantidad,
                  unidad_medida, precio_unitario, monto_descuento, monto_linea, monto_gravable,
                  tasa_impuesto, monto_impuesto)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    factura.id, linea.despacho_detalle_id, linea.producto_id, linea.descripcion,
                    linea.cantidad, linea.unidad_medida, linea.precio_unitario, linea.monto_descuento,
                    linea.monto_linea, linea.monto_gravable, linea.tasa_impuesto, linea.monto_impuesto
                ]
            );
        }
        return { ...factura, detalle: lineasFactura, numero_despacho: numeroDespacho, advertencias };
    });
}

async function listarInventarioDisponible(pgQuery, filtros = {}) {
    const condiciones = [
        '(i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) > 0'
    ];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.cliente_id) add('i.cliente_id = $', filtros.cliente_id);
    if (filtros.texto) add('(p.product_code ILIKE $ OR p.product_name ILIKE $)'.replace(/\$/g, `$${params.length + 1}`), `%${filtros.texto}%`);
    const { rows } = await pgQuery(
        `SELECT i.id AS inventario_pt_id, i.producto_id, i.lote_id, i.bodega_id, i.cliente_id,
                i.unidad_inventario,
                (i.cantidad_fisica - i.cantidad_reservada - i.cantidad_bloqueada - i.cantidad_en_despacho) AS cantidad_disponible,
                p.product_code, p.product_name, p.price_unit,
                l.codigo_lote, b.nombre AS bodega_nombre, bp.partner_name AS cliente_nombre
           FROM inventario_producto_terminado i
           JOIN flexo_products p ON p.id = i.producto_id
           LEFT JOIN lote_producto_terminado l ON l.id = i.lote_id
           LEFT JOIN bodega_pt b ON b.id = i.bodega_id
           LEFT JOIN business_partners bp ON bp.id = i.cliente_id
          WHERE ${condiciones.join(' AND ')}
          ORDER BY p.product_code
          LIMIT 300`,
        params
    );
    return rows;
}

async function buscarClientes(pgQuery, texto = '') {
    const params = [];
    let where = '1=1';
    if (texto) {
        params.push(`%${texto}%`);
        where = `(bp.partner_code ILIKE $1 OR bp.partner_name ILIKE $1)`;
    }
    const { rows } = await pgQuery(
        `SELECT bp.id, bp.partner_code, bp.partner_name, bp.tax_id, bp.currency_code
           FROM business_partners bp
          WHERE ${where}
          ORDER BY bp.partner_name
          LIMIT 100`,
        params
    );
    return rows;
}

async function listarContactosCliente(pgQuery, clienteId) {
    const { rows } = await pgQuery(
        `SELECT c.contact_name, c.first_name, c.last_name, c.email, c.phone, c.mobile, c."position"
           FROM business_partner_contacts c
           JOIN business_partners bp ON bp.partner_code = c.partner_code
          WHERE bp.id = $1
          ORDER BY c.is_legal_representative DESC NULLS LAST, c.contact_name`,
        [clienteId]
    );
    return rows;
}

async function obtenerReporteria(pgQuery, filtros = {}) {
    const condiciones = ["f.estado <> 'ANULADA'"];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.desde) add('f.fecha_emision >= $', filtros.desde);
    if (filtros.hasta) add('f.fecha_emision <= $', filtros.hasta);
    const where = condiciones.join(' AND ');

    const resumen = await pgQuery(
        `SELECT COUNT(*) AS cantidad_facturas,
                COALESCE(SUM(gran_total), 0) AS total_facturado,
                COALESCE(SUM(total_iva), 0) AS total_iva
           FROM factura_fel f
          WHERE ${where}`,
        params
    );
    const porCliente = await pgQuery(
        `SELECT bp.partner_name AS cliente_nombre, COUNT(*) AS cantidad_facturas,
                COALESCE(SUM(f.gran_total), 0) AS total_facturado
           FROM factura_fel f
           LEFT JOIN business_partners bp ON bp.id = f.cliente_id
          WHERE ${where}
          GROUP BY bp.partner_name
          ORDER BY total_facturado DESC
          LIMIT 50`,
        params
    );
    const porDia = await pgQuery(
        `SELECT DATE(f.fecha_emision) AS fecha, COUNT(*) AS cantidad_facturas,
                COALESCE(SUM(f.gran_total), 0) AS total_facturado
           FROM factura_fel f
          WHERE ${where}
          GROUP BY DATE(f.fecha_emision)
          ORDER BY fecha DESC
          LIMIT 90`,
        params
    );
    return { resumen: resumen.rows[0], por_cliente: porCliente.rows, por_dia: porDia.rows };
}

async function listarFacturas(pgQuery, filtros = {}) {
    const condiciones = ['1=1'];
    const params = [];
    const add = (condicion, valor) => {
        params.push(valor);
        condiciones.push(condicion.replace('$', `$${params.length}`));
    };
    if (filtros.despacho_id) add('f.despacho_id = $', Number(filtros.despacho_id));
    if (filtros.cliente_id) add('f.cliente_id = $', filtros.cliente_id);
    const { rows } = await pgQuery(
        `SELECT f.*, bp.partner_name AS cliente_nombre, d.numero_despacho
           FROM factura_fel f
           LEFT JOIN business_partners bp ON bp.id = f.cliente_id
           LEFT JOIN despacho_pt d ON d.id = f.despacho_id
          WHERE ${condiciones.join(' AND ')}
          ORDER BY f.created_at DESC
          LIMIT 200`,
        params
    );
    return rows;
}

async function obtenerFactura(pgQuery, id) {
    const { rows } = await pgQuery(
        `SELECT f.*, bp.partner_name AS cliente_nombre, d.numero_despacho
           FROM factura_fel f
           LEFT JOIN business_partners bp ON bp.id = f.cliente_id
           LEFT JOIN despacho_pt d ON d.id = f.despacho_id
          WHERE f.id = $1`,
        [id]
    );
    const factura = rows[0];
    if (!factura) {
        const error = new Error('Factura FEL no encontrada.');
        error.status = 404;
        throw error;
    }
    const detalle = await pgQuery(`SELECT * FROM factura_fel_detalle WHERE factura_fel_id = $1 ORDER BY id`, [id]);
    return { ...factura, detalle: detalle.rows };
}

// ─── RUTAS ──────────────────────────────────────────────────────────────────

function registerFacturaFelRoutes({ app, pgQuery, withTransaction, loadGeneralConfig }) {
    const permitir = (req, res, acceso) => {
        if (!moduleAccess(readSession(req), MODULE_KEY, acceso)) {
            res.status(403).json({ error: `No tiene permiso de ${acceso} para el módulo ${MODULE_KEY}.` });
            return false;
        }
        return true;
    };

    const capturar = (res, error, fallback) => {
        res.status(Number(error.status) || 500).json({ error: error.message || fallback });
    };

    app.get(`${API}/emisor`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json(await obtenerEmisorConfig(pgQuery));
        } catch (error) { capturar(res, error, 'No fue posible cargar la configuración del emisor.'); }
    });

    app.put(`${API}/emisor`, async (req, res) => {
        try {
            if (!permitir(req, res, 'edit')) return;
            res.json(await actualizarEmisorConfig(pgQuery, req.body || {}));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la configuración del emisor.'); }
    });

    app.get(`${API}`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json({ rows: await listarFacturas(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las facturas.'); }
    });

    app.post(`${API}/generar`, async (req, res) => {
        try {
            if (!permitir(req, res, 'create')) return;
            const despachoId = Number(req.body && req.body.despacho_id);
            if (!despachoId) {
                res.status(422).json({ error: 'despacho_id es obligatorio.' });
                return;
            }
            const usuario = sessionUser(req);
            res.status(201).json(await generarFacturaDesdeDespacho(pgQuery, withTransaction, despachoId, usuario, loadGeneralConfig));
        } catch (error) { capturar(res, error, 'No fue posible generar la factura FEL.'); }
    });

    app.post(`${API}/generar-desde-inventario`, async (req, res) => {
        try {
            if (!permitir(req, res, 'create')) return;
            const usuario = sessionUser(req);
            res.status(201).json(await generarFacturaDesdeInventario(pgQuery, withTransaction, req.body || {}, usuario, loadGeneralConfig));
        } catch (error) { capturar(res, error, 'No fue posible generar la factura FEL desde el inventario.'); }
    });

    app.get(`${API}/inventario-disponible`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json({ rows: await listarInventarioDisponible(pgQuery, req.query) });
        } catch (error) { capturar(res, error, 'No fue posible cargar el inventario disponible.'); }
    });

    app.get(`${API}/clientes`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json({ rows: await buscarClientes(pgQuery, req.query.texto) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los clientes.'); }
    });

    app.get(`${API}/clientes/:id/contactos`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json({ rows: await listarContactosCliente(pgQuery, req.params.id) });
        } catch (error) { capturar(res, error, 'No fue posible cargar los contactos del cliente.'); }
    });

    app.get(`${API}/reporteria`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json(await obtenerReporteria(pgQuery, req.query));
        } catch (error) { capturar(res, error, 'No fue posible cargar la reportería.'); }
    });

    app.get(`${API}/frases`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json({ rows: await listarFrases(pgQuery) });
        } catch (error) { capturar(res, error, 'No fue posible cargar las frases fiscales.'); }
    });

    app.post(`${API}/frases`, async (req, res) => {
        try {
            if (!permitir(req, res, 'edit')) return;
            res.status(201).json(await crearFrase(pgQuery, req.body || {}));
        } catch (error) { capturar(res, error, 'No fue posible crear la frase fiscal.'); }
    });

    app.patch(`${API}/frases/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, 'edit')) return;
            res.json(await actualizarFrase(pgQuery, req.params.id, req.body || {}));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la frase fiscal.'); }
    });

    app.delete(`${API}/frases/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, 'edit')) return;
            res.json(await eliminarFrase(pgQuery, req.params.id));
        } catch (error) { capturar(res, error, 'No fue posible eliminar la frase fiscal.'); }
    });

    app.get(`${API}/certificador`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json(await obtenerCertificadorConfig(pgQuery));
        } catch (error) { capturar(res, error, 'No fue posible cargar la configuración del certificador.'); }
    });

    app.put(`${API}/certificador`, async (req, res) => {
        try {
            if (!permitir(req, res, 'edit')) return;
            res.json(await actualizarCertificadorConfig(pgQuery, req.body || {}));
        } catch (error) { capturar(res, error, 'No fue posible actualizar la configuración del certificador.'); }
    });

    app.get(`${API}/:id`, async (req, res) => {
        try {
            if (!permitir(req, res, 'view')) return;
            res.json(await obtenerFactura(pgQuery, Number(req.params.id)));
        } catch (error) { capturar(res, error, 'No fue posible cargar la factura.'); }
    });
}

module.exports = { ensureFacturaFelSchema, registerFacturaFelRoutes };
