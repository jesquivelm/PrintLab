// Servicio de "Solicitud de creación de cliente en SAP": documentos requeridos,
// cola de aprobación de Finanzas via enlace público con token, y notificación por correo.

const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

let pgQuery, sendEmail, crearSocioEnSapPorCodigo, nombreUsuarioRequest, normalizePartnerCode, encolarEnvioSap;

const UPLOADS_DIR = path.join(__dirname, '..', 'storage', 'solicitud-cliente-attachments');
const TOKEN_VALIDEZ_DIAS = 7;

const TIPOS_DOCUMENTO = [
    { tipo: 'formulario_cliente', etiqueta: 'Formulario de Cliente' },
    { tipo: 'solicitud_credito', etiqueta: 'Solicitud de Crédito' },
    { tipo: 'patentes', etiqueta: 'Patentes' },
    { tipo: 'representante_legal', etiqueta: 'Datos del Representante Legal' },
    { tipo: 'rtu', etiqueta: 'RTU (Cédula Jurídica)' }
];
const TIPOS_DOCUMENTO_SET = new Set(TIPOS_DOCUMENTO.map((d) => d.tipo));

async function ensureSolicitudesClienteSchema() {
    await pgQuery(`
        ALTER TABLE business_partners
            DROP CONSTRAINT IF EXISTS business_partners_estado_socio_check
    `);
    await pgQuery(`
        ALTER TABLE business_partners
            ADD CONSTRAINT business_partners_estado_socio_check
            CHECK (estado_socio IS NULL OR (estado_socio = ANY (ARRAY[
                'PROSPECTO'::text,
                'PENDIENTE_INFORMACION'::text,
                'SOLICITUD_CLIENTE'::text,
                'PENDIENTE_APROBACION'::text,
                'SOLICITUD_RECHAZADA'::text,
                'CLIENTE_APROBADO'::text,
                'CLIENTE_CREADO_SAP'::text,
                'ERROR_SINCRONIZACION'::text,
                'REASIGNADO'::text,
                'DESCARTADO'::text
            ])))
    `);

    await pgQuery(`CREATE TABLE IF NOT EXISTS solicitudes_cliente_sap (
        id SERIAL PRIMARY KEY,
        partner_code TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
        token TEXT NOT NULL UNIQUE,
        token_expira_en TIMESTAMP NOT NULL,
        creado_por TEXT NOT NULL DEFAULT '',
        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        resuelto_por TEXT,
        resuelto_en TIMESTAMP,
        motivo_rechazo TEXT
    )`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS solicitudes_cliente_sap_token_idx ON solicitudes_cliente_sap (token)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS solicitudes_cliente_sap_partner_idx ON solicitudes_cliente_sap (partner_code)`);

    await pgQuery(`CREATE TABLE IF NOT EXISTS solicitud_cliente_documentos (
        id SERIAL PRIMARY KEY,
        solicitud_id INTEGER NOT NULL REFERENCES solicitudes_cliente_sap(id) ON DELETE CASCADE,
        tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('formulario_cliente', 'solicitud_credito', 'patentes', 'representante_legal', 'rtu')),
        nombre_archivo TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        tamano_bytes INTEGER,
        subido_en TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    await fsp.mkdir(UPLOADS_DIR, { recursive: true });
}

function generarToken() {
    return crypto.randomBytes(32).toString('hex');
}

function extensionPara(nombreOriginal) {
    const ext = path.extname(nombreOriginal || '');
    return ext && ext.length <= 6 ? ext : '';
}

async function obtenerDestinatariosActivos() {
    const result = await pgQuery(`SELECT full_name AS nombre, email AS correo FROM aviso_finanzas_contacts WHERE is_active = TRUE ORDER BY full_name ASC`);
    return result.rows;
}

// Avisa al vendedor que originó la solicitud que el cliente ya quedó aprobado.
async function avisarVendedorClienteAprobado({ creadoPor, partnerName, partnerCode, cardCode }) {
    const nombre = String(creadoPor || '').trim();
    if (!nombre) return;
    let correo = '';
    try {
        const r = await pgQuery(
            `SELECT email FROM admin_users WHERE full_name = $1 AND is_active = TRUE AND email <> '' ORDER BY id ASC LIMIT 1`,
            [nombre]
        );
        correo = r.rows[0]?.email || '';
    } catch (_) {}
    if (!correo) return;
    const creado = cardCode
        ? `ya quedó creado en SAP con el código <strong>${cardCode}</strong>. Ya podés entrar al cálculo y crear la orden.`
        : `quedó aprobado. La creación en SAP está en proceso y se reintenta automáticamente; podrás crear la orden cuando termine.`;
    try {
        await sendEmail({
            to: correo,
            subject: `Cliente aprobado — ${partnerName || partnerCode}`,
            html: `<p>Hola ${nombre},</p>
<p>La solicitud de creación del cliente <strong>${partnerName || partnerCode}</strong> (${partnerCode}) fue aprobada por Finanzas y ${creado}</p>
<p>Saludos,<br>Equipo PrintLab</p>`,
            text: `Cliente aprobado: ${partnerName || partnerCode} (${partnerCode}). ${cardCode ? 'CardCode ' + cardCode + '. Ya podés crear la orden.' : 'Creación en SAP en proceso.'}`
        });
    } catch (error) {
        console.error('No fue posible avisar al vendedor del cliente aprobado:', error.message);
    }
}

function baseUrlDesde(req) {
    return process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function registerSolicitudesClienteRoutes(deps) {
    const { app, upload } = deps;
    pgQuery = deps.pgQuery;
    sendEmail = deps.sendEmail;
    crearSocioEnSapPorCodigo = deps.crearSocioEnSapPorCodigo;
    nombreUsuarioRequest = deps.nombreUsuarioRequest;
    normalizePartnerCode = deps.normalizePartnerCode;
    encolarEnvioSap = deps.encolarEnvioSap;

    ensureSolicitudesClienteSchema().catch((error) => {
        console.error('Error preparando esquema de solicitudes de cliente:', error.message);
    });

    const uploadDocumentos = upload.fields(TIPOS_DOCUMENTO.map((d) => ({ name: d.tipo, maxCount: 1 })));

    // ── Envío de la solicitud (usuario logueado) ────────────────────────────
    app.post('/api/socios/:codigo/solicitud-cliente', uploadDocumentos, async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            if (!codigo) return res.status(400).json({ error: 'Código inválido.' });

            const partner = await pgQuery(
                `SELECT partner_code, partner_name FROM business_partners WHERE partner_code = $1`,
                [codigo]
            );
            if (!partner.rows.length) return res.status(404).json({ error: 'Socio no encontrado.' });

            const faltantes = TIPOS_DOCUMENTO.filter((d) => !req.files?.[d.tipo]?.[0]);
            if (faltantes.length) {
                return res.status(400).json({ error: `Falta adjuntar: ${faltantes.map((d) => d.etiqueta).join(', ')}.` });
            }

            const token = generarToken();
            const creadoPor = nombreUsuarioRequest(req, '');

            const inserted = await pgQuery(
                `INSERT INTO solicitudes_cliente_sap (partner_code, token, token_expira_en, creado_por)
                 VALUES ($1, $2, NOW() + INTERVAL '${TOKEN_VALIDEZ_DIAS} days', $3)
                 RETURNING id`,
                [codigo, token, creadoPor]
            );
            const solicitudId = inserted.rows[0].id;

            const solicitudDir = path.join(UPLOADS_DIR, String(solicitudId));
            await fsp.mkdir(solicitudDir, { recursive: true });

            for (const doc of TIPOS_DOCUMENTO) {
                const file = req.files[doc.tipo][0];
                const nombreArchivo = path.basename(file.originalname || doc.tipo);
                const rutaArchivo = path.join(solicitudDir, `${doc.tipo}${extensionPara(nombreArchivo)}`);
                await fsp.writeFile(rutaArchivo, file.buffer);
                await pgQuery(
                    `INSERT INTO solicitud_cliente_documentos (solicitud_id, tipo_documento, nombre_archivo, ruta_archivo, tamano_bytes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [solicitudId, doc.tipo, nombreArchivo, rutaArchivo, file.size || null]
                );
            }

            await pgQuery(`UPDATE business_partners SET estado_socio = 'PENDIENTE_APROBACION' WHERE partner_code = $1`, [codigo]);

            const destinatarios = await obtenerDestinatariosActivos();
            let correoEnviado = false;
            if (destinatarios.length) {
                const enlace = `${baseUrlDesde(req)}/finanzas/solicitud/${token}`;
                try {
                    await sendEmail({
                        to: destinatarios.map((d) => d.correo).join(', '),
                        subject: `Nueva solicitud de creación de cliente — ${partner.rows[0].partner_name}`,
                        html: `<p>Hola,</p>
<p>Se recibió una solicitud para crear en SAP al cliente <strong>${partner.rows[0].partner_name}</strong> (${codigo}).</p>
<p>Revisa los datos y documentos adjuntos, y aprueba o rechaza la solicitud desde el siguiente enlace:</p>
<p style="text-align:center;margin:24px 0;">
    <a href="${enlace}" style="display:inline-block;padding:12px 24px;background:#118fc6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Revisar solicitud</a>
</p>
<p><small>O copia este enlace en tu navegador: <a href="${enlace}">${enlace}</a></small></p>
<p>Este enlace es de un solo uso y expira en ${TOKEN_VALIDEZ_DIAS} días.</p>
<p>Saludos,<br>Equipo PrintLab</p>`,
                        text: `Nueva solicitud de creación de cliente: ${partner.rows[0].partner_name} (${codigo}).\nRevisa y decide en: ${enlace}\nEste enlace expira en ${TOKEN_VALIDEZ_DIAS} días.`
                    });
                    correoEnviado = true;
                } catch (error) {
                    console.error('Error enviando correo de solicitud de cliente:', error.message);
                }
            }

            res.json({
                ok: true,
                solicitudId,
                correoEnviado,
                destinatarios: destinatarios.length,
                message: correoEnviado
                    ? 'Solicitud enviada a Finanzas correctamente.'
                    : (destinatarios.length ? 'Solicitud guardada, pero no se pudo enviar el correo a Finanzas.' : 'Solicitud guardada. No hay destinatarios de Finanzas configurados — configúralos en Seguridad.')
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible enviar la solicitud.' });
        }
    });

    // ── Portal público de Finanzas (sin login, acceso por token) ───────────
    async function obtenerSolicitudPorToken(token) {
        const result = await pgQuery(`SELECT * FROM solicitudes_cliente_sap WHERE token = $1`, [token]);
        return result.rows[0] || null;
    }

    app.get('/api/finanzas/solicitud/:token', async (req, res) => {
        try {
            const solicitud = await obtenerSolicitudPorToken(req.params.token);
            if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
            if (new Date(solicitud.token_expira_en) < new Date() && solicitud.estado === 'PENDIENTE') {
                return res.status(410).json({ error: 'Este enlace expiró. Solicita que generen uno nuevo desde PrintLab.' });
            }

            const partner = await pgQuery(
                `SELECT partner_code, partner_name, nombre_comercial, tipo_socio, tax_id, tipo_identificacion,
                        email, email_facturacion, currency_code, sap_card_code, estado_socio
                   FROM business_partners WHERE partner_code = $1`,
                [solicitud.partner_code]
            );
            const contact = await pgQuery(
                `SELECT contact_name, email, phone, mobile, position
                   FROM business_partner_contacts WHERE partner_code = $1 ORDER BY id ASC LIMIT 1`,
                [solicitud.partner_code]
            );
            const address = await pgQuery(
                `SELECT country, state_province, county, address_line, zip_code
                   FROM business_partner_addresses WHERE partner_code = $1 ORDER BY id ASC LIMIT 1`,
                [solicitud.partner_code]
            );
            const documentos = await pgQuery(
                `SELECT tipo_documento, nombre_archivo, tamano_bytes FROM solicitud_cliente_documentos WHERE solicitud_id = $1`,
                [solicitud.id]
            );

            res.json({
                solicitud: {
                    id: solicitud.id,
                    estado: solicitud.estado,
                    creadoEn: solicitud.creado_en,
                    resueltoPor: solicitud.resuelto_por,
                    resueltoEn: solicitud.resuelto_en,
                    motivoRechazo: solicitud.motivo_rechazo
                },
                socio: partner.rows[0] || null,
                contacto: contact.rows[0] || null,
                direccion: address.rows[0] || null,
                documentos: documentos.rows.map((d) => ({
                    tipo: d.tipo_documento,
                    etiqueta: TIPOS_DOCUMENTO.find((t) => t.tipo === d.tipo_documento)?.etiqueta || d.tipo_documento,
                    nombreArchivo: d.nombre_archivo,
                    tamanoBytes: d.tamano_bytes,
                    url: `/api/finanzas/solicitud/${solicitud.token}/documento/${d.tipo_documento}`
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la solicitud.' });
        }
    });

    app.get('/api/finanzas/solicitud/:token/documento/:tipo', async (req, res) => {
        try {
            if (!TIPOS_DOCUMENTO_SET.has(req.params.tipo)) return res.status(400).json({ error: 'Documento inválido.' });
            const solicitud = await obtenerSolicitudPorToken(req.params.token);
            if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });

            const doc = await pgQuery(
                `SELECT nombre_archivo, ruta_archivo FROM solicitud_cliente_documentos WHERE solicitud_id = $1 AND tipo_documento = $2`,
                [solicitud.id, req.params.tipo]
            );
            if (!doc.rows.length) return res.status(404).json({ error: 'Documento no encontrado.' });

            const { nombre_archivo: nombreArchivo, ruta_archivo: rutaArchivo } = doc.rows[0];
            if (!fs.existsSync(rutaArchivo)) return res.status(404).json({ error: 'El archivo ya no está disponible.' });
            res.download(rutaArchivo, nombreArchivo);
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible descargar el documento.' });
        }
    });

    app.post('/api/finanzas/solicitud/:token/aprobar', async (req, res) => {
        try {
            const solicitud = await obtenerSolicitudPorToken(req.params.token);
            if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
            if (solicitud.estado !== 'PENDIENTE') return res.status(400).json({ error: 'Esta solicitud ya fue resuelta.' });

            const resueltoPor = String(req.body?.resueltoPor || '').trim();
            if (!resueltoPor) return res.status(400).json({ error: 'Indica tu nombre para continuar.' });

            // La aprobación de Finanzas siempre queda registrada, aunque SAP no responda
            // en este momento: el socio se envía con respaldo en la cola de reintentos.
            await pgQuery(
                `UPDATE solicitudes_cliente_sap SET estado = 'APROBADA', resuelto_por = $2, resuelto_en = NOW() WHERE id = $1`,
                [solicitud.id, resueltoPor]
            );
            await pgQuery(
                `UPDATE business_partners
                    SET estado_socio = CASE WHEN estado_socio = 'CLIENTE_CREADO_SAP' THEN estado_socio ELSE 'CLIENTE_APROBADO' END
                  WHERE partner_code = $1`,
                [solicitud.partner_code]
            );

            const partnerRow = await pgQuery(`SELECT partner_name FROM business_partners WHERE partner_code = $1`, [solicitud.partner_code]);
            const partnerName = partnerRow.rows[0]?.partner_name || '';

            let cardCode = '';
            let enColaSap = false;
            try {
                const resultado = await crearSocioEnSapPorCodigo(solicitud.partner_code);
                cardCode = resultado.cardCode || '';
            } catch (error) {
                if (error.yaExistia) {
                    cardCode = error.cardCode || '';
                } else {
                    enColaSap = true;
                    try {
                        if (typeof encolarEnvioSap === 'function') {
                            await encolarEnvioSap(pgQuery, {
                                tipo: 'socio',
                                referencia: solicitud.partner_code,
                                creadoPor: resueltoPor
                            });
                        }
                    } catch (colaError) {
                        console.error('No fue posible encolar el envío del socio a SAP:', colaError.message);
                    }
                }
            }

            await avisarVendedorClienteAprobado({
                creadoPor: solicitud.creado_por,
                partnerName,
                partnerCode: solicitud.partner_code,
                cardCode
            });

            res.json({ ok: true, cardCode, enColaSap });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible aprobar la solicitud.' });
        }
    });

    app.post('/api/finanzas/solicitud/:token/rechazar', async (req, res) => {
        try {
            const solicitud = await obtenerSolicitudPorToken(req.params.token);
            if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
            if (solicitud.estado !== 'PENDIENTE') return res.status(400).json({ error: 'Esta solicitud ya fue resuelta.' });

            const resueltoPor = String(req.body?.resueltoPor || '').trim();
            const motivo = String(req.body?.motivo || '').trim();
            if (!resueltoPor) return res.status(400).json({ error: 'Indica tu nombre para continuar.' });
            if (!motivo) return res.status(400).json({ error: 'Indica el motivo del rechazo.' });

            await pgQuery(
                `UPDATE solicitudes_cliente_sap
                    SET estado = 'RECHAZADA', resuelto_por = $2, resuelto_en = NOW(), motivo_rechazo = $3
                  WHERE id = $1`,
                [solicitud.id, resueltoPor, motivo]
            );
            await pgQuery(`UPDATE business_partners SET estado_socio = 'SOLICITUD_RECHAZADA' WHERE partner_code = $1`, [solicitud.partner_code]);

            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible rechazar la solicitud.' });
        }
    });

}

module.exports = { registerSolicitudesClienteRoutes, TIPOS_DOCUMENTO };
