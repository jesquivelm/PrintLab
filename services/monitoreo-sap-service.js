// Monitoreo SAP: control total de lo que entra y sale hacia SAP.
//
// - Cada transferencia guarda (o ya guarda) el query que se preguntó, el payload
//   que se envió, la respuesta cruda de SAP y el error real si falló.
// - Endpoints de solo lectura: GET /api/sap/monitoreo/resumen,
//   GET /api/sap/monitoreo/:seccion, GET /api/sap/monitoreo/detalle/:tipo/:id.
// - Secciones: envios, bom, socios, sustratos, tintas, barnices, laminantes,
//   foil, otros.
//
// Las categorías de inventario vienen del mapeo de clasificación
// (inventory_classification_mappings), exactamente el mismo que usa el catálogo
// de materiales del cálculo: un artículo de SAP se clasifica por
// classification_source_value (o por su grupo) y cae en sustrato / tinta /
// barniz / laminado / foil / troquel / otros según ese mapeo. Nada se agrupa
// "a ojo": cada categoría tiene su propia tabla y su propia consulta.

// Definición de las consultas que el sistema hace contra SAP (o contra las
// tablas espejo locales). Se declaran aquí para poder mostrarlas completas al
// usuario: la letra del query que se ejecutó, con su fuente (SAP real vía
// conector DIAPI o tablas espejo locales).
const CONSULTAS_DEFINIDAS = Object.freeze({
    socios: {
        fuente: 'Tablas espejo locales (OCRD/CRD1/OCPR) llenadas por el conector DIAPI',
        sql: [
            'SELECT CardCode, CardName, CardType, Currency, LicTradNum, Phone1, E_Mail, CntctPrsn, SlpCode',
            '  FROM OCRD',
            " WHERE validFor = 'Y'",
            "   AND CardType = 'C'",
            "   AND CardCode LIKE 'C%'",
            ' ORDER BY CardCode ASC'
        ].join('\n')
    },
    inventario: {
        fuente: 'Tablas espejo locales (OITM/OITW/ITM1/OWHS) llenadas por el conector DIAPI',
        sql: [
            'SELECT ItemCode, ItemName, ItemsGroupCode, OnHand, AvailableQuantity, Price, Currency, BuyUnitMsr, SalesUnitMsr, validFor',
            '  FROM OITM',
            " WHERE validFor = 'Y'",
            ' ORDER BY ItemCode ASC'
        ].join('\n')
    },
    lotes: {
        fuente: 'Tablas espejo locales (OBTN) llenadas por el conector DIAPI',
        sql: 'SELECT ItemCode, BatchNum, Quantity, WhsCode FROM OBTN ORDER BY ItemCode ASC'
    },
    vendedores: {
        fuente: 'Tablas espejo locales (OSLP) llenadas por el conector DIAPI',
        sql: 'SELECT SlpCode, SlpName, Active FROM OSLP ORDER BY SlpCode ASC'
    },
    envios: {
        fuente: 'Cola local (sap_envios_pendientes): cada documento se entrega al conector DIAPI y se registra su respuesta completa por intento',
        sql: 'No es una consulta de lectura: cada envío lleva su propio payload (ver el detalle de cada fila).'
    },
    bomExport: {
        fuente: 'SAP B1: ProductTrees (OITT/ITT1) y salidas de inventario (InventoryGenExits / IGN1)',
        sql: [
            'INSERT INTO OITT (Code, Name, Quantity, TreeType)',
            'INSERT INTO ITT1 (Father, Code, Quantity, Warehouse, PriceList)',
            'POST /inventory/exit  (descuento de inventario por consumo real)'
        ].join('\n')
    }
});

const CATEGORIAS_INVENTARIO = Object.freeze([
    { clave: 'sustratos', etiqueta: 'Sustratos', categoria: 'Sustrato' },
    { clave: 'tintas', etiqueta: 'Tintas', categoria: 'TINTAS' },
    { clave: 'barnices', etiqueta: 'Barnices', categoria: 'Barniz' },
    { clave: 'laminantes', etiqueta: 'Laminantes', categoria: 'Laminado' },
    { clave: 'foil', etiqueta: 'Foil', categoria: 'Foil' }
]);

// Etiquetas visibles de las categorías que existen en el mapeo de clasificación
// (por si el cliente agrega categorías nuevas: caen en "Otros" con su etiqueta real).
function clasificarFilaInventario(row, mapeos) {
    const fuente = String(row.classification_source_value || '').trim();
    const grupo = String(row.item_group_code || '').trim();
    const mapeo = mapeos.get(fuente) || mapeos.get(grupo) || null;
    if (mapeo && mapeo.categoria) return mapeo;
    return { clave: 'otros', etiqueta: mapeo?.etiqueta || 'Otros', categoria: '' };
}

function rangoFechas(query = {}) {
    const valores = [];
    const filtros = [];
    const desde = String(query.desde || query.from || '').trim();
    const hasta = String(query.hasta || query.to || '').trim();
    if (desde) {
        valores.push(`${desde}T00:00:00`);
        filtros.push(`started_at >= $${valores.length}::timestamptz`);
    }
    if (hasta) {
        valores.push(`${hasta}T23:59:59.999`);
        filtros.push(`started_at <= $${valores.length}::timestamptz`);
    }
    return { valores, filtros };
}

// ── Envíos a SAP (cola de documentos que PrintLab manda hacia SAP) ───────────
async function listarEnvios(pgQuery, query = {}) {
    const { valores, filtros } = rangoFechas(query);
    if (query.estado) { valores.push(String(query.estado)); filtros.push(`estado = $${valores.length}`); }
    if (query.tipo) { valores.push(String(query.tipo)); filtros.push(`tipo = $${valores.length}`); }
    valores.push(Math.min(Math.max(Number(query.limit) || 300, 1), 1000));
    const filtroBase = filtros.length ? filtros.join(' AND ') : '';
    const result = await pgQuery(`
        SELECT * FROM sap_envios_pendientes
        ${filtroBase ? `WHERE ${filtroBase}` : ''}
        ORDER BY creado_en DESC
        LIMIT $${valores.length}
    `, valores);
    const intentos = await pgQuery(`
        SELECT i.envio_id, i.numero, i.estado, i.error, i.error_clase, i.request, i.response, i.creado_en
          FROM sap_envios_intentos i
          JOIN sap_envios_pendientes e ON e.id = i.envio_id
          ${filtroBase ? `WHERE ${filtroBase}` : ''}
         ORDER BY i.creado_en DESC
    `, filtroBase ? valores : []);
    const intentosPorEnvio = new Map();
    intentos.rows.forEach((intento) => {
        if (!intentosPorEnvio.has(intento.envio_id)) intentosPorEnvio.set(intento.envio_id, []);
        intentosPorEnvio.get(intento.envio_id).push(intento);
    });
    return result.rows.map((envio) => ({
        ...envio,
        intentos: envio.intentos ?? 0,
        historial: intentosPorEnvio.get(envio.id) || []
    }));
}

// ── BOM y descargas de inventario ────────────────────────────────────────────
async function listarBom(pgQuery, query = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 200, 1), 1000);
    const bom = await pgQuery(`
        SELECT id, sku, order_code, sap_item_code, item_name, cantidad, unidad,
               enviado_por, enviado_en
          FROM sap_bom_local
      ORDER BY enviado_en DESC
         LIMIT $1
    `, [limit]);
    const salidas = await pgQuery(`
        SELECT id, order_code, sku, doc_entry, queue_code, lineas, fuera_de_bom,
               origen, estado, error, creado_por, creado_en
          FROM sap_salidas_materiales
      ORDER BY creado_en DESC
         LIMIT $1
    `, [limit]);
    return { bom: bom.rows, salidas: salidas.rows };
}

// ── Importaciones (sap_activity_log: carga, consulta, sincronización, escritura) ──
async function listarActividad(pgQuery, query = {}) {
    const { valores, filtros } = rangoFechas(query);
    if (query.entidad) {
        valores.push(`%${String(query.entidad)}%`);
        filtros.push(`entity_name ILIKE $${valores.length}`);
    }
    if (query.estado) { valores.push(String(query.estado)); filtros.push(`status = $${valores.length}`); }
    valores.push(Math.min(Math.max(Number(query.limit) || 300, 1), 1000));
    const result = await pgQuery(`
        SELECT id, action_type, entity_name, module_name, actor, mode, status,
               internal_method, internal_url, service_method, service_url,
               request_vars, response_summary, error_message, started_at, finished_at
          FROM sap_activity_log
          ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
      ORDER BY started_at DESC
         LIMIT $${valores.length}
    `, valores);
    return result.rows;
}

// ── Catálogos locales espejo, por categoría de inventario ────────────────────
async function cargarMapeos(pgQuery) {
    const result = await pgQuery(`
        SELECT source_value, flexo_category, display_label
          FROM inventory_classification_mappings
         WHERE is_active = TRUE
    `);
    const mapeos = new Map();
    result.rows.forEach((row) => {
        const clave = String(row.flexo_category || '').trim().toLowerCase();
        mapeos.set(String(row.source_value || '').trim(), {
            clave,
            categoria: clave,
            etiqueta: row.display_label || row.flexo_category || ''
        });
    });
    return mapeos;
}

function coincidirCategoria(mapeo, categoriaDeseada) {
    if (!mapeo) return false;
    const categoria = String(mapeo.categoria || '').toLowerCase();
    const deseada = String(categoriaDeseada || '').toLowerCase();
    if (categoria === deseada) return true;
    // Las tintas tienen variantes (Base Agua, Base Aceite, UV...) que comparten el prefijo.
    if (deseada === 'tintas') return categoria.startsWith('tintas');
    return false;
}

const COLUMNA_DETALLE = `
        SELECT item_code, item_name, item_group_code, classification_source_value,
               on_hand, available_quantity, price, currency, buy_unit_msr, sales_unit_msr,
               ancho_mm, gramaje_g_m2, calibre_micras, proveedor, marca, synced_at
          FROM sap_items
`;

async function listarInventarioCategoria(pgQuery, categoriaDeseada, query = {}) {
    const mapeos = await cargarMapeos(pgQuery);
    const search = String(query.search || '').trim();
    const valores = [];
    const filtros = [];
    const filas = [];
    const result = await pgQuery(`${COLUMNA_DETALLE} ORDER BY item_name ASC, item_code ASC`);
    result.rows.forEach((row) => {
        const fuente = String(row.classification_source_value || '').trim();
        const grupo = String(row.item_group_code || '').trim();
        const mapeo = mapeos.get(fuente) || mapeos.get(grupo) || null;
        const esOtros = !categoriaDeseada || categoriaDeseada === 'otros';
        const coincide = esOtros
            ? !CATEGORIAS_INVENTARIO.some(({ categoria }) => coincidirCategoria(mapeo, categoria))
            : coincidirCategoria(mapeo, categoriaDeseada);
        if (!coincide) return;
        if (search && !(`${row.item_code} ${row.item_name}`.toLowerCase().includes(search.toLowerCase()))) return;
        filas.push({ ...row, categoria_etiqueta: mapeo?.etiqueta || 'Sin clasificar' });
    });
    const limit = Math.min(Math.max(Number(query.limit) || 500, 1), 5000);
    return filas.slice(0, limit);
}

// ── Socios con sus direcciones y contactos ───────────────────────────────────
async function listarSocios(pgQuery, query = {}) {
    const search = String(query.search || '').trim();
    const valores = [];
    let where = '';
    if (search) {
        valores.push(`%${search}%`);
        where = `WHERE (p.card_code ILIKE $1 OR p.card_name ILIKE $1)`;
    }
    valores.push(Math.min(Math.max(Number(query.limit) || 500, 1), 5000));
    const socios = await pgQuery(`
        SELECT p.card_code, p.card_name, p.card_type, p.balance, p.currency,
               p.phone1, p.email, p.contact_person, p.synced_at,
               (
                    SELECT json_agg(x ORDER BY x.address_name)
                      FROM (
                        SELECT address_name, address_type, country, state_province, county,
                               district, city, block, building, floor, room, street_number,
                               address_line, zip_code
                          FROM business_partner_addresses a
                         WHERE a.partner_code = p.card_code
                      ) x
               ) AS direcciones,
               (
                    SELECT json_agg(x ORDER BY x.contact_name)
                      FROM (
                        SELECT contact_name, first_name, last_name, email, phone, mobile, fax,
                               position, is_legal_representative
                          FROM business_partner_contacts c
                         WHERE c.partner_code = p.card_code
                      ) x
               ) AS contactos
          FROM sap_business_partners p
          ${where}
      ORDER BY p.card_code ASC
         LIMIT $${valores.length}
    `, valores);
    return socios.rows;
}

// ── Consolidado por sección (lo que consume la pantalla) ─────────────────────
async function cargarSeccion(pgQuery, seccion, query = {}) {
    switch (seccion) {
        case 'envios':
            return { consultas: [{ nombre: 'Envíos a SAP', ...CONSULTAS_DEFINIDAS.envios }], filas: await listarEnvios(pgQuery, query), tipo: 'envios' };
        case 'bom':
            return { consultas: [{ nombre: 'BOM y descargas de inventario', ...CONSULTAS_DEFINIDAS.bomExport }], ...(await listarBom(pgQuery, query)), tipo: 'bom' };
        case 'socios':
            return { consultas: [{ nombre: 'Socios', ...CONSULTAS_DEFINIDAS.socios }], filas: await listarSocios(pgQuery, query), tipo: 'socios' };
        case 'importacion':
            return {
                consultas: [
                    { nombre: 'Socios', ...CONSULTAS_DEFINIDAS.socios },
                    { nombre: 'Inventario', ...CONSULTAS_DEFINIDAS.inventario },
                    { nombre: 'Lotes (tintas)', ...CONSULTAS_DEFINIDAS.lotes },
                    { nombre: 'Vendedores', ...CONSULTAS_DEFINIDAS.vendedores }
                ],
                filas: await listarActividad(pgQuery, query),
                tipo: 'importacion'
            };
        default:
            return null;
    }
}

async function cargarResumen(pgQuery) {
    const [envios, importacion, inventario] = await Promise.all([
        pgQuery(`SELECT estado, count(*)::int AS total FROM sap_envios_pendientes GROUP BY estado`),
        pgQuery(`SELECT status, count(*)::int AS total FROM sap_activity_log GROUP BY status`),
        pgQuery(`SELECT count(*)::int AS total FROM sap_items`)
    ]);
    return {
        envios: envios.rows,
        importacion: importacion.rows,
        inventarioTotal: inventario.rows[0]?.total || 0
    };
}

function registerMonitoreoSapRoutes({ app, pgQuery }) {
    app.get('/api/sap/monitoreo/resumen', async (req, res) => {
        try {
            res.json(await cargarResumen(pgQuery));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el resumen de monitoreo SAP.' });
        }
    });

    app.get('/api/sap/monitoreo/:seccion', async (req, res) => {
        try {
            const seccion = req.params.seccion;
            if (['socios', 'envios', 'bom', 'importacion'].includes(seccion)) {
                const payload = await cargarSeccion(pgQuery, seccion, req.query || {});
                return res.json(payload);
            }
            if (['sustratos', 'tintas', 'barnices', 'laminantes', 'foil', 'otros'].includes(seccion)) {
                const categoriaDeseada = seccion === 'otros' ? 'otros' : seccion.replace(/s$/, '');
                const filas = await listarInventarioCategoria(pgQuery, categoriaDeseada, req.query || {});
                return res.json({ consultas: [{ nombre: 'Inventario', ...CONSULTAS_DEFINIDAS.inventario }], filas, tipo: 'inventario', seccion });
            }
            return res.status(404).json({ error: `Sección de monitoreo no reconocida: ${seccion}` });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la sección de monitoreo SAP.' });
        }
    });

    // Detalle ampliable de una fila: envío (con su historial completo de intentos),
    // importación (con query, payload y respuesta cruda) o artículo de inventario.
    app.get('/api/sap/monitoreo/detalle/:tipo/:id', async (req, res) => {
        try {
            const { tipo, id } = req.params;
            if (tipo === 'envio') {
                const envio = await pgQuery(`SELECT * FROM sap_envios_pendientes WHERE id::text = $1 OR codigo = $1`, [id]);
                if (!envio.rows.length) return res.status(404).json({ error: 'Envío no encontrado.' });
                const historial = await pgQuery(
                    `SELECT numero, estado, error, error_clase, request, response, creado_en
                       FROM sap_envios_intentos WHERE envio_id = $1::uuid ORDER BY numero DESC`,
                    [envio.rows[0].id]
                );
                return res.json({ detalle: { ...envio.rows[0], historial: historial.rows } });
            }
            if (tipo === 'importacion') {
                const row = await pgQuery(`SELECT * FROM sap_activity_log WHERE id::text = $1`, [id]);
                if (!row.rows.length) return res.status(404).json({ error: 'Registro de importación no encontrado.' });
                return res.json({ detalle: row.rows[0] });
            }
            if (tipo === 'inventario') {
                const row = await pgQuery(`SELECT * FROM sap_items WHERE item_code = $1`, [id]);
                if (!row.rows.length) return res.status(404).json({ error: 'Artículo no encontrado.' });
                return res.json({ detalle: row.rows[0] });
            }
            return res.status(400).json({ error: `Tipo de detalle no soportado: ${tipo}` });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el detalle.' });
        }
    });
}

module.exports = {
    CONSULTAS_DEFINIDAS,
    CATEGORIAS_INVENTARIO,
    registerMonitoreoSapRoutes,
    cargarResumen,
    cargarSeccion,
    listarEnvios,
    listarBom,
    listarActividad,
    listarInventarioCategoria,
    listarSocios
};
