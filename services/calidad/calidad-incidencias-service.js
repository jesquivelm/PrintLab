function erroneo(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'critica'];
const ESTADOS_VALIDOS = ['nueva', 'pendiente_revision', 'en_revision', 'cerrada', 'convertida_nc'];
const CLASIFICACIONES_VALIDAS = ['no_procede', 'observacion', 'correccion', 'no_conformidad', 'otro'];
const TIPOS_EVIDENCIA_VALIDOS = ['foto', 'video', 'pdf', 'correo', 'captura', 'documento', 'audio', 'otro'];

function registrarRutasCalidadIncidencias({
    app, pgQuery, withTransaction, generateNextIncidentCode, recordAuditDiff, writeAttachmentFile
}) {
    const api = '/api/calidad/incidencias';

    app.get(api + '/origenes', async (req, res) => {
        try {
            const resultado = await pgQuery(
                `SELECT codigo, nombre FROM calidad_incidencia_origenes WHERE activo = true ORDER BY orden_visual, nombre`
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/medios-recepcion', async (req, res) => {
        try {
            const resultado = await pgQuery(
                `SELECT codigo, nombre FROM calidad_incidencia_medios_recepcion WHERE activo = true ORDER BY orden_visual, nombre`
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.post(api, async (req, res) => {
        try {
            const body = req.body || {};
            if (!body.origen) throw erroneo(400, 'El origen de la incidencia es requerido.');
            if (!body.descripcion || !String(body.descripcion).trim()) {
                throw erroneo(400, 'La descripción del problema es requerida.');
            }
            const prioridad = PRIORIDADES_VALIDAS.includes(body.prioridad) ? body.prioridad : 'media';
            const usuarioId = body.creado_por_user_id || req.headers['x-usuario-id'] || null;
            const codigo = await generateNextIncidentCode();

            const resultado = await pgQuery(
                `INSERT INTO calidad_incidencias
                    (codigo, creado_por_user_id, creado_por_nombre, departamento_origen, origen, medio_recepcion,
                     prioridad, estado, fecha_evento, descripcion, observaciones_iniciales, responsable_inicial_user_id,
                     cliente_codigo, cliente_nombre, contacto_cliente, cotizacion_codigo, linea_cotizacion_codigo,
                     producto_codigo, orden_produccion_codigo, ruta_produccion_id, evento_produccion_id, genero_paro,
                     maquina, proceso, operador, materia_prima_ref, proveedor_ref,
                     costo_material_desperdiciado, costo_reproceso, costo_horas_maquina, costo_mano_obra,
                     costo_materia_prima_adicional, costo_reposicion, costo_transporte, costo_devolucion,
                     costo_nota_credito, costo_otros)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente_revision',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                         $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
                 RETURNING *`,
                [codigo, usuarioId, body.creado_por_nombre || null, body.departamento_origen || null, body.origen,
                 body.medio_recepcion || null, prioridad, body.fecha_evento || null, body.descripcion,
                 body.observaciones_iniciales || null, body.responsable_inicial_user_id || null,
                 body.cliente_codigo || null, body.cliente_nombre || null, body.contacto_cliente || null,
                 body.cotizacion_codigo || null, body.linea_cotizacion_codigo || null, body.producto_codigo || null,
                 body.orden_produccion_codigo || null, body.ruta_produccion_id || null, body.evento_produccion_id || null,
                 Boolean(body.genero_paro), body.maquina || null, body.proceso || null, body.operador || null,
                 body.materia_prima_ref || null, body.proveedor_ref || null,
                 body.costo_material_desperdiciado || 0, body.costo_reproceso || 0, body.costo_horas_maquina || 0,
                 body.costo_mano_obra || 0, body.costo_materia_prima_adicional || 0, body.costo_reposicion || 0,
                 body.costo_transporte || 0, body.costo_devolucion || 0, body.costo_nota_credito || 0,
                 body.costo_otros || 0]
            );
            const incidencia = resultado.rows[0];

            if (recordAuditDiff) {
                await recordAuditDiff({
                    moduleKey: 'calidad',
                    entityType: 'calidad_incidencia',
                    entityKey: incidencia.codigo,
                    beforeValue: {},
                    afterValue: incidencia,
                    changedBy: usuarioId,
                    route: req.originalUrl
                }).catch((error) => console.error('No fue posible auditar la creación de la incidencia:', error.message));
            }

            res.status(201).json(incidencia);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api, async (req, res) => {
        try {
            const condiciones = [];
            const valores = [];
            const filtro = (campo, valor) => {
                if (valor === undefined || valor === null || valor === '') return;
                valores.push(valor);
                condiciones.push(`${campo} = $${valores.length}`);
            };
            filtro('estado', req.query.estado);
            filtro('origen', req.query.origen);
            filtro('prioridad', req.query.prioridad);
            filtro('cliente_codigo', req.query.cliente_codigo);
            filtro('producto_codigo', req.query.producto_codigo);
            filtro('orden_produccion_codigo', req.query.orden_produccion_codigo);
            filtro('maquina', req.query.maquina);
            filtro('responsable_inicial_user_id', req.query.responsable_inicial_user_id);
            if (req.query.caso_critico === 'true' || req.query.caso_critico === 'false') {
                filtro('caso_critico', req.query.caso_critico === 'true');
            }
            if (req.query.q) {
                valores.push(`%${req.query.q}%`);
                condiciones.push(`(codigo ILIKE $${valores.length} OR descripcion ILIKE $${valores.length} OR cliente_nombre ILIKE $${valores.length})`);
            }
            if (req.query.fecha_desde) {
                valores.push(req.query.fecha_desde);
                condiciones.push(`fecha_creacion >= $${valores.length}`);
            }
            if (req.query.fecha_hasta) {
                valores.push(req.query.fecha_hasta);
                condiciones.push(`fecha_creacion <= $${valores.length}`);
            }
            const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
            const resultado = await pgQuery(
                `SELECT * FROM calidad_incidencias ${where} ORDER BY fecha_creacion DESC LIMIT 300`,
                valores
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/:codigo', async (req, res) => {
        try {
            const cabecera = await pgQuery(`SELECT * FROM calidad_incidencias WHERE codigo = $1`, [req.params.codigo]);
            if (!cabecera.rows.length) throw erroneo(404, `No se encontró la incidencia ${req.params.codigo}.`);
            const adjuntos = await pgQuery(
                `SELECT id, file_name, size_bytes, tipo_evidencia, subido_por_user_id, fecha_subida
                   FROM calidad_incidencia_adjuntos WHERE incidencia_codigo = $1 ORDER BY fecha_subida DESC`,
                [req.params.codigo]
            );
            res.json({ ...cabecera.rows[0], adjuntos: adjuntos.rows });
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.patch(api + '/:codigo', async (req, res) => {
        try {
            const body = req.body || {};
            if (body.estado && !ESTADOS_VALIDOS.includes(body.estado)) {
                throw erroneo(400, `Estado inválido: ${body.estado}`);
            }
            if (body.clasificacion && !CLASIFICACIONES_VALIDAS.includes(body.clasificacion)) {
                throw erroneo(400, `Clasificación inválida: ${body.clasificacion}`);
            }
            if (body.prioridad && !PRIORIDADES_VALIDAS.includes(body.prioridad)) {
                throw erroneo(400, `Prioridad inválida: ${body.prioridad}`);
            }

            const anteriorResult = await pgQuery(`SELECT * FROM calidad_incidencias WHERE codigo = $1`, [req.params.codigo]);
            if (!anteriorResult.rows.length) throw erroneo(404, `No se encontró la incidencia ${req.params.codigo}.`);
            const anterior = anteriorResult.rows[0];
            if (anterior.estado === 'convertida_nc') {
                throw erroneo(409, 'La incidencia ya fue convertida en No Conformidad y no puede editarse desde aquí.');
            }

            const usuarioId = body.usuario_id || req.headers['x-usuario-id'] || null;
            const hayClasificacion = Boolean(body.clasificacion);
            const esCierre = body.estado === 'cerrada' || (hayClasificacion && ['no_procede', 'observacion', 'correccion'].includes(body.clasificacion) && body.cerrar === true);

            const resultado = await pgQuery(
                `UPDATE calidad_incidencias SET
                    estado = COALESCE($2, estado),
                    prioridad = COALESCE($3, prioridad),
                    responsable_inicial_user_id = COALESCE($4, responsable_inicial_user_id),
                    clasificacion = COALESCE($5, clasificacion),
                    clasificado_por_user_id = CASE WHEN $5::text IS NOT NULL THEN $6 ELSE clasificado_por_user_id END,
                    fecha_clasificacion = CASE WHEN $5::text IS NOT NULL THEN NOW() ELSE fecha_clasificacion END,
                    comentario_clasificacion = COALESCE($7, comentario_clasificacion),
                    caso_critico = COALESCE($8, caso_critico),
                    criterio_critico = COALESCE($9, criterio_critico),
                    costo_material_desperdiciado = COALESCE($10, costo_material_desperdiciado),
                    costo_reproceso = COALESCE($11, costo_reproceso),
                    costo_horas_maquina = COALESCE($12, costo_horas_maquina),
                    costo_mano_obra = COALESCE($13, costo_mano_obra),
                    costo_materia_prima_adicional = COALESCE($14, costo_materia_prima_adicional),
                    costo_reposicion = COALESCE($15, costo_reposicion),
                    costo_transporte = COALESCE($16, costo_transporte),
                    costo_devolucion = COALESCE($17, costo_devolucion),
                    costo_nota_credito = COALESCE($18, costo_nota_credito),
                    costo_otros = COALESCE($19, costo_otros),
                    orden_produccion_codigo = COALESCE($20, orden_produccion_codigo),
                    producto_codigo = COALESCE($21, producto_codigo),
                    maquina = COALESCE($22, maquina),
                    proceso = COALESCE($23, proceso),
                    operador = COALESCE($24, operador),
                    cerrado_por_user_id = CASE WHEN $25 THEN COALESCE($6, cerrado_por_user_id) ELSE cerrado_por_user_id END,
                    fecha_cierre = CASE WHEN $25 THEN NOW() ELSE fecha_cierre END,
                    fecha_actualizacion = NOW()
                 WHERE codigo = $1
                 RETURNING *`,
                [req.params.codigo, body.estado || null, body.prioridad || null, body.responsable_inicial_user_id || null,
                 body.clasificacion || null, usuarioId, body.comentario_clasificacion || null,
                 body.caso_critico ?? null, body.criterio_critico || null,
                 body.costo_material_desperdiciado ?? null, body.costo_reproceso ?? null, body.costo_horas_maquina ?? null,
                 body.costo_mano_obra ?? null, body.costo_materia_prima_adicional ?? null, body.costo_reposicion ?? null,
                 body.costo_transporte ?? null, body.costo_devolucion ?? null, body.costo_nota_credito ?? null,
                 body.costo_otros ?? null, body.orden_produccion_codigo || null, body.producto_codigo || null,
                 body.maquina || null, body.proceso || null, body.operador || null, esCierre]
            );
            const actualizada = resultado.rows[0];

            if (recordAuditDiff) {
                await recordAuditDiff({
                    moduleKey: 'calidad',
                    entityType: 'calidad_incidencia',
                    entityKey: actualizada.codigo,
                    beforeValue: anterior,
                    afterValue: actualizada,
                    changedBy: usuarioId,
                    route: req.originalUrl
                }).catch((error) => console.error('No fue posible auditar la actualización de la incidencia:', error.message));
            }

            res.json(actualizada);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.post(api + '/:codigo/adjuntos', async (req, res) => {
        try {
            const body = req.body || {};
            if (!body.file_name || !body.content_base64) {
                throw erroneo(400, 'file_name y content_base64 son requeridos.');
            }
            if (body.tipo_evidencia && !TIPOS_EVIDENCIA_VALIDOS.includes(body.tipo_evidencia)) {
                throw erroneo(400, `Tipo de evidencia inválido: ${body.tipo_evidencia}`);
            }
            const incidenciaResult = await pgQuery(`SELECT codigo FROM calidad_incidencias WHERE codigo = $1`, [req.params.codigo]);
            if (!incidenciaResult.rows.length) throw erroneo(404, `No se encontró la incidencia ${req.params.codigo}.`);

            const usuarioId = body.subido_por_user_id || req.headers['x-usuario-id'] || null;
            const adjunto = await withTransaction(async (client) => {
                const inserted = await client.query(
                    `INSERT INTO calidad_incidencia_adjuntos
                        (incidencia_codigo, file_name, storage_path, size_bytes, content_sha256, tipo_evidencia, subido_por_user_id)
                     VALUES ($1,$2,'',0,'',$3,$4)
                     RETURNING *`,
                    [req.params.codigo, body.file_name, body.tipo_evidencia || null, usuarioId]
                );
                const fila = inserted.rows[0];
                const archivo = writeAttachmentFile({
                    id: fila.id,
                    incidenciaCodigo: req.params.codigo,
                    fileName: body.file_name,
                    contentBase64: body.content_base64
                });
                const actualizado = await client.query(
                    `UPDATE calidad_incidencia_adjuntos SET storage_path = $2, size_bytes = $3, content_sha256 = $4
                     WHERE id = $1 RETURNING *`,
                    [fila.id, archivo.storagePath, archivo.sizeBytes, archivo.contentSha256]
                );
                return actualizado.rows[0];
            });
            res.status(201).json(adjunto);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
}

module.exports = { registrarRutasCalidadIncidencias, erroneo };
