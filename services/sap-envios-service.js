// Cola local de envíos a SAP (push desde PrintLab, sin middleware).
//
// - encolarEnvioSap(): registra un documento a enviar (socio / orden_venta / ...).
// - startEnviosSapWorker(): en un intervalo, toma los pendientes vencidos, llama a
//   la función directa de SAP correspondiente (dispatchers), registra el intento
//   con la respuesta cruda, y reintenta con backoff hasta max_intentos. Al
//   agotarlos marca 'fallido' y notifica a Finanzas (una sola vez).
// - registerEnviosSapRoutes(): GET /api/sap/envios, GET /api/sap/envios/:id,
//   POST /api/sap/envios/:id/reintentar.

const TIPOS_VALIDOS = new Set([
    'socio', 'articulo', 'orden_venta', 'bom', 'orden_produccion',
    'salida_materiales', 'producto_terminado', 'factura',
    // Actualizaciones (documentos vivos que cambian por mejoras del proceso).
    'socio_update', 'articulo_update', 'bom_update', 'orden_venta_update', 'orden_produccion_update',
    // Tipo de cambio del dólar (una vez al día, referencia = fecha de la tasa).
    'tipo_cambio'
]);
const BACKOFF_MAX_SEC = 3600;

async function leerConfigEnvios(pgQuery) {
    try {
        const r = await pgQuery(`SELECT max_intentos, backoff_base_segundos FROM sap_envios_config WHERE id = 1`);
        if (r.rows.length) {
            return {
                maxIntentos: Number(r.rows[0].max_intentos) || 10,
                backoffBaseSeg: Number(r.rows[0].backoff_base_segundos) || 60
            };
        }
    } catch (_) {}
    return { maxIntentos: 10, backoffBaseSeg: 60 };
}

async function guardarConfigEnvios(pgQuery, { maxIntentos, backoffBaseSeg }) {
    const mi = Math.min(Math.max(Number(maxIntentos) || 10, 1), 100);
    const bb = Math.min(Math.max(Number(backoffBaseSeg) || 60, 10), 3600);
    await pgQuery(
        `INSERT INTO sap_envios_config (id, max_intentos, backoff_base_segundos, actualizado_en)
         VALUES (1, $1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET max_intentos = $1, backoff_base_segundos = $2, actualizado_en = NOW()`,
        [mi, bb]
    );
    return { maxIntentos: mi, backoffBaseSeg: bb };
}

function nuevoCodigoEnvio() {
    return 'SENV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// Clasifica el error para que Finanzas sepa de un vistazo qué está pasando.
function clasificarError(error) {
    const msg = String(error && (error.message || error) || '').toLowerCase();
    if (error && error.yaExistia) return 'ya_existia';
    if (/econnrefused|enotfound|etimedout|ehostunreach|network|socket hang up|fetch failed|getaddrinfo/.test(msg)) return 'sin_conexion';
    if (/orden no encontrada|socio no encontrado|art[ií]culo no encontrado|producto no encontrado|referencia no encontrada|not found/.test(msg)) return 'referencia_no_encontrada';
    if (/cardcode|card code|no tiene un c[oó]digo de sap|todav[ií]a no tiene/.test(msg)) return 'sin_cardcode';
    if (/timeout|no respondi[oó]|no responde|timed out/.test(msg)) return 'middleware_sin_respuesta';
    if (/campo|field|length|longitud|dimension|car[aá]cter|invalid value|value too long|-\d{3,}/.test(msg)) return 'campo_invalido';
    if (/sap|di[- ]?api|service layer|business partner|bad request|400|500/.test(msg)) return 'sap_rechazo';
    return 'desconocido';
}

// Clases de error "definitivas": la referencia local ya no existe, reintentar nunca
// va a funcionar. Se marca 'fallido' de inmediato sin agotar max_intentos.
const CLASES_ERROR_DEFINITIVO = new Set(['referencia_no_encontrada']);

function backoffSegundos(intentos, baseSeg = 60) {
    return Math.min(baseSeg * Math.pow(2, Math.max(0, intentos - 1)), BACKOFF_MAX_SEC);
}

async function encolarEnvioSap(pgQuery, { tipo, referencia, payload = {}, creadoPor = '', maxIntentos = null } = {}) {
    if (!TIPOS_VALIDOS.has(tipo)) throw new Error(`Tipo de envío SAP no válido: ${tipo}`);
    const ref = String(referencia || '').trim();
    if (!ref) throw new Error('El envío a SAP necesita una referencia (código de socio u orden).');
    if (maxIntentos == null) maxIntentos = (await leerConfigEnvios(pgQuery)).maxIntentos;

    // Idempotente: si ya hay uno vivo para el mismo tipo+referencia, se reutiliza.
    const vivo = await pgQuery(
        `SELECT * FROM sap_envios_pendientes
          WHERE tipo = $1 AND referencia = $2 AND estado IN ('pendiente', 'procesando')
          ORDER BY creado_en DESC LIMIT 1`,
        [tipo, ref]
    );
    if (vivo.rows.length) return vivo.rows[0];

    const inserted = await pgQuery(
        `INSERT INTO sap_envios_pendientes (codigo, tipo, referencia, payload, creado_por, max_intentos)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING *`,
        [nuevoCodigoEnvio(), tipo, ref, JSON.stringify(payload || {}), String(creadoPor || ''), Number(maxIntentos) || 10]
    );
    return inserted.rows[0];
}

async function listarEnviosSap(pgQuery, { estado = '', tipo = '', referencia = '', limit = 200 } = {}) {
    const where = [];
    const vals = [];
    if (estado) { vals.push(estado); where.push(`estado = $${vals.length}`); }
    if (tipo) { vals.push(tipo); where.push(`tipo = $${vals.length}`); }
    if (referencia) { vals.push(referencia); where.push(`referencia = $${vals.length}`); }
    vals.push(Math.min(Math.max(Number(limit) || 200, 1), 500));
    const result = await pgQuery(
        `SELECT * FROM sap_envios_pendientes
          ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          ORDER BY (estado IN ('pendiente','procesando')) DESC, creado_en DESC
          LIMIT $${vals.length}`,
        vals
    );
    return result.rows;
}

async function obtenerEnvioSap(pgQuery, id) {
    const envio = await pgQuery(`SELECT * FROM sap_envios_pendientes WHERE id = $1::uuid`, [id]);
    if (!envio.rows.length) return null;
    const historial = await pgQuery(
        `SELECT numero, estado, error, error_clase, request, response, creado_en
           FROM sap_envios_intentos WHERE envio_id = $1::uuid ORDER BY numero DESC`,
        [id]
    );
    return { ...envio.rows[0], historial: historial.rows };
}

async function reintentarEnvioSap(pgQuery, id) {
    const result = await pgQuery(
        `UPDATE sap_envios_pendientes
            SET estado = 'pendiente',
                proximo_intento_en = NOW(),
                max_intentos = GREATEST(max_intentos, intentos + 3),
                fallido_en = NULL,
                notificado_en = NULL,
                actualizado_en = NOW()
          WHERE id = $1::uuid AND estado <> 'enviado'
          RETURNING *`,
        [id]
    );
    return result.rows[0] || null;
}

// Un ciclo del worker: procesa hasta `lote` envíos vencidos.
async function procesarEnviosPendientes(pgQuery, { dispatchers = {}, lote = 5, onFallido = null, onEnviado = null } = {}) {
    const cfg = await leerConfigEnvios(pgQuery);
    // Propaga el max_intentos configurado a los envíos que aún no terminaron.
    await pgQuery(
        `UPDATE sap_envios_pendientes SET max_intentos = $1
          WHERE estado IN ('pendiente', 'procesando') AND max_intentos <> $1`,
        [cfg.maxIntentos]
    ).catch(() => {});

    const due = await pgQuery(
        `SELECT * FROM sap_envios_pendientes
          WHERE estado IN ('pendiente', 'procesando')
            AND intentos < max_intentos
            AND proximo_intento_en <= NOW()
          ORDER BY proximo_intento_en ASC
          LIMIT $1`,
        [lote]
    );

    for (const envio of due.rows) {
        const numero = envio.intentos + 1;
        await pgQuery(
            `UPDATE sap_envios_pendientes SET estado = 'procesando', actualizado_en = NOW() WHERE id = $1::uuid`,
            [envio.id]
        );

        const dispatcher = dispatchers[envio.tipo];
        let ok = false;
        let resultado = null;
        let errorMsg = '';
        let errorClase = '';
        let responseRaw = {};

        if (typeof dispatcher !== 'function') {
            errorMsg = `No hay despachador configurado para envíos de tipo "${envio.tipo}".`;
            errorClase = 'config';
        } else {
            try {
                resultado = await dispatcher(envio.referencia, envio.payload || {});
                ok = true;
                responseRaw = resultado && typeof resultado === 'object' ? resultado : { valor: resultado };
            } catch (error) {
                errorMsg = String(error && (error.message || error) || 'Error desconocido enviando a SAP.');
                errorClase = clasificarError(error);
                responseRaw = error && error.responseBody ? error.responseBody
                    : (error && error.sapResponse ? error.sapResponse : { message: errorMsg });
                // "ya existía" en SAP = éxito para efectos de la cola (ya hay CardCode/DocEntry).
                if (error && error.yaExistia) {
                    ok = true;
                    resultado = { cardCode: error.cardCode || '', docEntry: error.docEntry || '', yaExistia: true };
                    responseRaw = resultado;
                    errorMsg = '';
                    errorClase = '';
                }
            }
        }

        await pgQuery(
            `INSERT INTO sap_envios_intentos (envio_id, numero, estado, error, error_clase, request, response)
             VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
            [envio.id, numero, ok ? 'ok' : 'error', errorMsg, errorClase,
             JSON.stringify(envio.payload || {}), JSON.stringify(responseRaw || {})]
        );

        if (ok) {
            await pgQuery(
                `UPDATE sap_envios_pendientes
                    SET estado = 'enviado', intentos = $2, resultado = $3::jsonb,
                        ultimo_error = '', ultimo_error_clase = '',
                        enviado_en = NOW(), actualizado_en = NOW()
                  WHERE id = $1::uuid`,
                [envio.id, numero, JSON.stringify(resultado || {})]
            );
            if (typeof onEnviado === 'function') {
                try {
                    await onEnviado({ ...envio, resultado: resultado || {}, estado: 'enviado' });
                } catch (notifyError) {
                    console.error('No fue posible notificar el envío SAP completado:', notifyError.message);
                }
            }
            continue;
        }

        const agotado = numero >= envio.max_intentos || CLASES_ERROR_DEFINITIVO.has(errorClase);
        await pgQuery(
            `UPDATE sap_envios_pendientes
                SET estado = $2, intentos = $3, ultimo_error = $4, ultimo_error_clase = $5,
                    proximo_intento_en = NOW() + ($6 || ' seconds')::interval,
                    fallido_en = CASE WHEN $2 = 'fallido' THEN NOW() ELSE fallido_en END,
                    actualizado_en = NOW()
              WHERE id = $1::uuid`,
            [envio.id, agotado ? 'fallido' : 'pendiente', numero, errorMsg, errorClase, String(backoffSegundos(numero, cfg.backoffBaseSeg))]
        );

        if (agotado && typeof onFallido === 'function') {
            try {
                const fresco = await obtenerEnvioSap(pgQuery, envio.id);
                if (fresco && !fresco.notificado_en) {
                    await onFallido(fresco);
                    await pgQuery(`UPDATE sap_envios_pendientes SET notificado_en = NOW() WHERE id = $1::uuid`, [envio.id]);
                }
            } catch (notifyError) {
                console.error('No fue posible notificar el envío SAP fallido:', notifyError.message);
            }
        }
    }

    return due.rows.length;
}

function startEnviosSapWorker({ pgQuery, dispatchers = {}, onFallido = null, onEnviado = null, intervalMs = 60_000 }) {
    let inFlight = false;
    const handle = setInterval(async () => {
        if (inFlight) return;
        inFlight = true;
        try {
            await procesarEnviosPendientes(pgQuery, { dispatchers, onFallido, onEnviado });
        } catch (error) {
            console.error('Worker de envíos SAP:', error.message);
        } finally {
            inFlight = false;
        }
    }, intervalMs);
    if (typeof handle.unref === 'function') handle.unref();
    return handle;
}

function registerEnviosSapRoutes({ app, pgQuery }) {
    app.get('/api/sap/envios/config', async (req, res) => {
        try {
            res.json(await leerConfigEnvios(pgQuery));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la configuración de envíos.' });
        }
    });

    app.put('/api/sap/envios/config', async (req, res) => {
        try {
            const saved = await guardarConfigEnvios(pgQuery, {
                maxIntentos: req.body?.maxIntentos,
                backoffBaseSeg: req.body?.backoffBaseSeg
            });
            res.json({ ok: true, ...saved });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible guardar la configuración de envíos.' });
        }
    });

    app.get('/api/sap/envios', async (req, res) => {
        try {
            res.json({ rows: await listarEnviosSap(pgQuery, req.query || {}) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la cola de envíos a SAP.' });
        }
    });

    app.get('/api/sap/envios/:id', async (req, res) => {
        try {
            const envio = await obtenerEnvioSap(pgQuery, req.params.id);
            if (!envio) return res.status(404).json({ error: 'Envío no encontrado.' });
            res.json({ envio });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el detalle del envío.' });
        }
    });

    app.post('/api/sap/envios/:id/reintentar', async (req, res) => {
        try {
            const envio = await reintentarEnvioSap(pgQuery, req.params.id);
            if (!envio) return res.status(404).json({ error: 'Envío no encontrado o ya enviado.' });
            res.json({ ok: true, envio });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible reencolar el envío.' });
        }
    });
}

module.exports = {
    TIPOS_VALIDOS,
    clasificarError,
    CLASES_ERROR_DEFINITIVO,
    leerConfigEnvios,
    guardarConfigEnvios,
    encolarEnvioSap,
    listarEnviosSap,
    obtenerEnvioSap,
    reintentarEnvioSap,
    procesarEnviosPendientes,
    startEnviosSapWorker,
    registerEnviosSapRoutes
};
