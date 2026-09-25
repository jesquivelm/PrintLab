// Consola de Pruebas SAP (Configuracion > Seguridad > SAP > Envios, panel desplegable).
//
// Permite disparar cada operacion de carga a SAP una por una:
//   - GET  /api/sap/pruebas/operaciones           catalogo de operaciones
//   - GET  /api/sap/pruebas/referencias            ordenes / socios reales de la BD
//   - GET  /api/sap/pruebas/orden/:codigo/materiales  lineas verificadas + marca en_bom
//   - POST /api/sap/pruebas/preview               arma la consulta sin enviarla (dry-run)
//   - POST /api/sap/pruebas/ejecutar              ejecuta (directo o encolado) y cronometra
//   - GET  /api/sap/pruebas/historial             ultimas corridas (sap_outbox + salidas)
//   - GET  /api/sap/pruebas/registros             visor de tablas locales SAP (solo lectura)
//
// Las funciones de envio viven en server.js y se inyectan al registrar las rutas.

// Catalogo: operacion -> metadatos. `fn` y `colaTipo` se completan desde server.js.
const OPERACIONES = [
    { op: 'crear_socio',              etiqueta: 'Crear socio',                 grupo: 'Socio',              ref: 'socio', colaTipo: 'socio' },
    { op: 'actualizar_socio',        etiqueta: 'Actualizar socio',           grupo: 'Socio',              ref: 'socio', colaTipo: 'socio_update' },
    { op: 'crear_articulo',          etiqueta: 'Crear articulo (SKU)',        grupo: 'Articulo',           ref: 'orden', colaTipo: 'articulo' },
    { op: 'actualizar_articulo',     etiqueta: 'Actualizar articulo (SKU)',   grupo: 'Articulo',           ref: 'orden', colaTipo: 'articulo_update' },
    { op: 'crear_orden_venta',       etiqueta: 'Crear Orden de Venta',        grupo: 'Orden de Venta',     ref: 'orden', colaTipo: 'orden_venta' },
    { op: 'actualizar_orden_venta',  etiqueta: 'Actualizar Orden de Venta',   grupo: 'Orden de Venta',     ref: 'orden', colaTipo: 'orden_venta_update' },
    { op: 'crear_bom',               etiqueta: 'Crear BOM',                   grupo: 'BOM',                ref: 'orden', colaTipo: 'bom' },
    { op: 'actualizar_bom',          etiqueta: 'Actualizar BOM',             grupo: 'BOM',                ref: 'orden', colaTipo: 'bom_update' },
    { op: 'crear_orden_produccion',  etiqueta: 'Crear Orden de Produccion',   grupo: 'Orden de Produccion', ref: 'orden', colaTipo: 'orden_produccion' },
    { op: 'actualizar_orden_produccion', etiqueta: 'Actualizar Orden de Produccion', grupo: 'Orden de Produccion', ref: 'orden', colaTipo: 'orden_produccion_update' },
    { op: 'descarga_inventario',     etiqueta: 'Descarga de inventario (materiales)', grupo: 'Inventario', ref: 'orden', colaTipo: 'salida_materiales' },
    { op: 'producto_terminado',      etiqueta: 'Cargar a Producto Terminado', grupo: 'Inventario',         ref: 'orden', colaTipo: 'producto_terminado' },
    { op: 'crear_factura',           etiqueta: 'Crear Factura',              grupo: 'Factura',            ref: 'orden', colaTipo: 'factura' }
];

// operacion -> columna sap_* que confirma que "se hizo".
const CONFIRMA_COLUMNA = {
    crear_socio: { tabla: 'business_partners', columna: 'sap_card_code', clave: 'partner_code' },
    actualizar_socio: { tabla: 'business_partners', columna: 'sap_card_code', clave: 'partner_code' },
    crear_articulo: { tabla: 'flexo_orders', columna: 'sap_articulo_creado', clave: 'order_code' },
    actualizar_articulo: { tabla: 'flexo_orders', columna: 'sap_articulo_creado', clave: 'order_code' },
    crear_orden_venta: { tabla: 'flexo_orders', columna: 'sap_orden_venta_doc_entry', clave: 'order_code' },
    actualizar_orden_venta: { tabla: 'flexo_orders', columna: 'sap_orden_venta_doc_entry', clave: 'order_code' },
    crear_bom: { tabla: 'flexo_orders', columna: 'sap_bom_creado', clave: 'order_code' },
    actualizar_bom: { tabla: 'flexo_orders', columna: 'sap_bom_creado', clave: 'order_code' },
    crear_orden_produccion: { tabla: 'flexo_orders', columna: 'sap_orden_produccion_doc_entry', clave: 'order_code' },
    actualizar_orden_produccion: { tabla: 'flexo_orders', columna: 'sap_orden_produccion_doc_entry', clave: 'order_code' },
    producto_terminado: { tabla: 'flexo_orders', columna: 'sap_producto_terminado_doc_entry', clave: 'order_code' },
    crear_factura: { tabla: 'flexo_orders', columna: 'sap_factura_doc_entry', clave: 'order_code' }
};

const TABLAS_REGISTRO = {
    sap_outbox: 'ORDER BY created_at DESC',
    sap_outbox_attempts: 'ORDER BY created_at DESC',
    sap_envios_pendientes: 'ORDER BY creado_en DESC',
    sap_envios_intentos: 'ORDER BY creado_en DESC',
    sap_salidas_materiales: 'ORDER BY creado_en DESC',
    sap_bom_local: 'ORDER BY enviado_en DESC'
};

function registerPruebasSapRoutes({ app, pgQuery, dispatch = {}, encolarEnvioSap, getRequestUserName = () => '' }) {
    // Une el catalogo estatico con las funciones inyectadas desde server.js.
    function catalogo() {
        return OPERACIONES
            .filter((o) => typeof dispatch[o.op] === 'function')
            .map((o) => ({ op: o.op, etiqueta: o.etiqueta, grupo: o.grupo, ref: o.ref, colaTipo: o.colaTipo }));
    }

    function resolverOp(op) {
        const def = OPERACIONES.find((o) => o.op === op);
        if (!def || typeof dispatch[op] !== 'function') {
            const err = new Error(`Operacion de prueba SAP no valida: ${op}`);
            err.status = 400;
            throw err;
        }
        return def;
    }

    app.get('/api/sap/pruebas/operaciones', (req, res) => {
        res.json({ operaciones: catalogo() });
    });

    app.get('/api/sap/pruebas/referencias', async (req, res) => {
        try {
            const tipo = String(req.query.tipo || 'orden').trim();
            const q = `%${String(req.query.q || '').trim()}%`;
            if (tipo === 'socio') {
                const r = await pgQuery(
                    `SELECT partner_code, partner_name, sap_card_code
                       FROM business_partners
                      WHERE partner_code ILIKE $1 OR partner_name ILIKE $1
                      ORDER BY partner_name ASC LIMIT 50`,
                    [q]
                );
                return res.json({ tipo, filas: r.rows });
            }
            const r = await pgQuery(
                `SELECT order_code, job_name, customer_code, customer_name,
                        finished_product_sku, product_code,
                        sap_articulo_creado, sap_orden_venta_doc_entry, sap_bom_creado,
                        sap_orden_produccion_doc_entry, sap_salida_materiales_doc_entry,
                        sap_producto_terminado_doc_entry, sap_factura_doc_entry
                   FROM flexo_orders
                  WHERE order_code ILIKE $1 OR COALESCE(job_name,'') ILIKE $1 OR COALESCE(customer_name,'') ILIKE $1
                  ORDER BY created_at DESC NULLS LAST LIMIT 50`,
                [q]
            );
            res.json({ tipo: 'orden', filas: r.rows });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar las referencias.' });
        }
    });

    app.get('/api/sap/pruebas/orden/:codigo/materiales', async (req, res) => {
        try {
            const ord = await pgQuery(
                `SELECT finished_product_sku, product_code FROM flexo_orders WHERE order_code = $1 LIMIT 1`,
                [req.params.codigo]
            );
            if (!ord.rows.length) return res.status(404).json({ error: 'Orden no encontrada.' });
            const sku = ord.rows[0].finished_product_sku || ord.rows[0].product_code || '';
            const mats = await pgQuery(
                `SELECT sap_item_code, material_name, planned_quantity, unit_code
                   FROM production_material_verification
                  WHERE order_code = $1 AND COALESCE(sap_item_code, '') <> '' AND planned_quantity > 0
                  ORDER BY material_name ASC`,
                [req.params.codigo]
            );
            const bom = await pgQuery(`SELECT sap_item_code FROM sap_bom_local WHERE sku = $1`, [sku]).catch(() => ({ rows: [] }));
            const enBom = new Set(bom.rows.map((r) => String(r.sap_item_code || '').trim().toUpperCase()));
            res.json({
                sku,
                bomLocalDisponible: enBom.size > 0,
                lineas: mats.rows.map((m) => ({
                    itemCode: m.sap_item_code,
                    nombre: m.material_name,
                    cantidad: Number(m.planned_quantity) || 0,
                    unidad: m.unit_code || '',
                    enBom: enBom.size ? enBom.has(String(m.sap_item_code || '').trim().toUpperCase()) : null
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los materiales de la orden.' });
        }
    });

    function opcionesDesdeBody(body = {}) {
        const opts = {};
        if (body.cantidad != null && body.cantidad !== '') opts.cantidad = Number(body.cantidad);
        if (Array.isArray(body.lineas) && body.lineas.length) opts.lineas = body.lineas;
        return opts;
    }

    app.post('/api/sap/pruebas/preview', async (req, res) => {
        try {
            const def = resolverOp(req.body?.operacion);
            const referencia = String(req.body?.referencia || '').trim();
            if (!referencia) return res.status(400).json({ error: 'Falta la referencia (orden o socio).' });
            const result = await dispatch[def.op](referencia, { ...opcionesDesdeBody(req.body), dryRun: true });
            res.json({ ok: true, operacion: def.op, referencia, preview: result?.preview || result || {} });
        } catch (error) {
            res.status(error.status || 500).json({ ok: false, error: error.message || 'No fue posible armar la consulta.' });
        }
    });

    async function leerConfirmacion(op, referencia) {
        const def = CONFIRMA_COLUMNA[op];
        if (!def) return null;
        try {
            const r = await pgQuery(
                `SELECT ${def.columna} AS valor FROM ${def.tabla} WHERE ${def.clave} = $1 LIMIT 1`,
                [referencia]
            );
            return { tabla: def.tabla, columna: def.columna, valor: r.rows[0]?.valor || '' };
        } catch (_) {
            return null;
        }
    }

    app.post('/api/sap/pruebas/ejecutar', async (req, res) => {
        try {
            const def = resolverOp(req.body?.operacion);
            const referencia = String(req.body?.referencia || '').trim();
            const modo = String(req.body?.modo || 'directo').trim();
            const actor = getRequestUserName(req) || '';
            if (!referencia) return res.status(400).json({ error: 'Falta la referencia (orden o socio).' });

            if (modo === 'cola') {
                const envio = await encolarEnvioSap(pgQuery, {
                    tipo: def.colaTipo, referencia, creadoPor: actor,
                    payload: opcionesDesdeBody(req.body)
                });
                return res.json({ ok: true, modo: 'cola', envio });
            }

            const inicioIso = new Date().toISOString();
            const t0 = Date.now();
            let resultado = null;
            let errorMsg = '';
            let ok = true;
            try {
                resultado = await dispatch[def.op](referencia, {
                    ...opcionesDesdeBody(req.body),
                    permitirAdicional: true, origen: 'consola', actor
                });
            } catch (error) {
                ok = false;
                errorMsg = error.message || 'Error ejecutando la operacion en SAP.';
            }
            const totalMs = Date.now() - t0;

            // sap_outbox generado durante esta llamada (para el tiempo del conector).
            let outbox = null;
            try {
                const r = await pgQuery(
                    `SELECT queue_code, entity_type, action_type, status, last_error,
                            payload, result_payload, created_at, updated_at,
                            EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 AS conector_ms
                       FROM sap_outbox
                      WHERE created_at >= $1
                      ORDER BY created_at DESC LIMIT 1`,
                    [inicioIso]
                );
                outbox = r.rows[0] || null;
            } catch (_) {}

            const confirmacion = await leerConfirmacion(def.op, referencia);

            res.json({
                ok,
                modo: 'directo',
                operacion: def.op,
                referencia,
                totalMs,
                conectorMs: outbox && outbox.conector_ms != null ? Math.round(Number(outbox.conector_ms)) : null,
                queueCode: outbox?.queue_code || '',
                outbox,
                confirmacion,
                respuesta: resultado || {},
                fueraDeBom: resultado?.fueraDeBom || [],
                error: errorMsg
            });
        } catch (error) {
            res.status(error.status || 500).json({ ok: false, error: error.message || 'No fue posible ejecutar la operacion.' });
        }
    });

    app.get('/api/sap/pruebas/historial', async (req, res) => {
        try {
            const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
            const outbox = await pgQuery(
                `SELECT queue_code, module_name, entity_type, action_type, reference_code, status,
                        last_error, created_at, updated_at,
                        EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 AS conector_ms
                   FROM sap_outbox
                  ORDER BY created_at DESC LIMIT $1`,
                [limit]
            );
            const salidas = await pgQuery(
                `SELECT order_code, sku, doc_entry, queue_code, origen, estado, error,
                        jsonb_array_length(lineas) AS lineas, jsonb_array_length(fuera_de_bom) AS fuera_de_bom,
                        creado_por, creado_en
                   FROM sap_salidas_materiales
                  ORDER BY creado_en DESC LIMIT $1`,
                [limit]
            ).catch(() => ({ rows: [] }));
            res.json({ outbox: outbox.rows, salidas: salidas.rows });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el historial de pruebas.' });
        }
    });

    app.get('/api/sap/pruebas/registros', async (req, res) => {
        try {
            const tabla = String(req.query.tabla || '').trim();
            if (!TABLAS_REGISTRO[tabla]) {
                return res.status(400).json({ error: 'Tabla no permitida.', tablas: Object.keys(TABLAS_REGISTRO) });
            }
            const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
            const r = await pgQuery(`SELECT * FROM ${tabla} ${TABLAS_REGISTRO[tabla]} LIMIT $1`, [limit]);
            res.json({
                tabla,
                tablas: Object.keys(TABLAS_REGISTRO),
                columnas: r.fields ? r.fields.map((f) => f.name) : (r.rows[0] ? Object.keys(r.rows[0]) : []),
                filas: r.rows
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible leer la tabla.' });
        }
    });
}

module.exports = { registerPruebasSapRoutes, OPERACIONES };
