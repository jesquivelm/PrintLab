function erroneo(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function generarSnapshotTecnico(pgQuery, ordenCodigo, productoCodigo) {
    const ordenResult = await pgQuery(
        `SELECT id, material_nombre, material_code, width_inches, length_inches, core_diameter,
                cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo, troquel_forma,
                numerado_tipo, rebobinado_comentario
         FROM flexo_orders WHERE order_code = $1`,
        [ordenCodigo]
    );
    const orden = ordenResult.rows[0];
    if (!orden) throw erroneo(404, `No se encontró la orden de producción ${ordenCodigo}.`);

    const pantonesResult = await pgQuery(
        `SELECT psc.pantone_ref AS pantone_codigo, psc.anilox_code AS anilox_codigo,
                pb.color_hex AS color_referencia, pr.codigo_interno AS receta_referencia, pr.densidad
         FROM production_station_configs psc
         LEFT JOIN tintas.pantones_biblioteca pb ON pb.codigo_pantone = psc.pantone_ref
         LEFT JOIN tintas.pantones_recetas pr ON pr.pantone_id = pb.id AND pr.es_vigente = true
             AND (pr.orden_produccion_id = $2 OR ($3::text IS NOT NULL AND pr.producto_id IN (
                 SELECT id FROM flexo_products WHERE product_code = $3
             )))
         WHERE psc.order_code = $1 AND psc.pantone_ref IS NOT NULL AND psc.pantone_ref <> ''
             AND ($3::text IS NULL OR psc.product_code = $3)`,
        [ordenCodigo, orden.id, productoCodigo || null]
    );

    return {
        sustrato: orden.material_nombre || orden.material_code || null,
        ancho: orden.width_inches,
        largo: orden.length_inches,
        diametro_core: orden.core_diameter,
        cantidad_tintas: orden.cantidad_tintas,
        tinta_blanca: orden.tinta_blanca,
        barniz_tipo: orden.barniz_tipo,
        laminado_tipo: orden.laminado_tipo,
        troquelado_forma: orden.troquel_forma,
        numerado_tipo: orden.numerado_tipo,
        rebobinado_notas: orden.rebobinado_comentario,
        pantones: pantonesResult.rows
    };
}

function registrarRutasCalidad({ app, pgQuery, withTransaction, generateNextQualityOrderCode }) {
    const api = '/api/calidad';

    app.get(api + '/tipos-defecto', async (req, res) => {
        try {
            const resultado = await pgQuery(
                `SELECT id, nombre FROM calidad_tipos_defecto WHERE activo = true ORDER BY nombre`
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/snapshot-tecnico', async (req, res) => {
        try {
            const { orden, producto } = req.query;
            if (!orden) throw erroneo(400, 'El parámetro "orden" es requerido.');
            const snapshot = await generarSnapshotTecnico(pgQuery, orden, producto || null);
            res.json(snapshot);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    // Control de parámetros: Objetivo / Tolerancia / Real / Estado (incluye control de blanco).
    async function sembrarParametrosControl(ordenCodigo) {
        const ord = (await pgQuery(
            `SELECT o.order_code, p.product_code, COALESCE(p.motivo_indice, 0) AS motivo_indice
               FROM flexo_orders o
               LEFT JOIN flexo_products p ON p.quote_code = o.quote_code AND p.line_code = o.line_code
              WHERE o.order_code = $1`, [ordenCodigo]
        )).rows;
        if (!ord.length) return;
        const cat = (await pgQuery(
            `SELECT clave, nombre, grupo, unidad, objetivo_defecto, tolerancia_min_defecto, tolerancia_max_defecto
               FROM calidad_parametros_catalogo WHERE activo = true ORDER BY orden`
        )).rows;
        const motivos = [...new Set(ord.map((r) => Number(r.motivo_indice || 0)))];
        const prodPorMotivo = new Map(ord.map((r) => [Number(r.motivo_indice || 0), r.product_code]));
        for (const mi of motivos) {
            for (const c of cat) {
                await pgQuery(
                    `INSERT INTO calidad_parametros_control
                        (orden_produccion_codigo, producto_codigo, motivo_indice, parametro_clave, nombre, grupo, unidad,
                         objetivo, tolerancia_min, tolerancia_max)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                     ON CONFLICT (orden_produccion_codigo, motivo_indice, parametro_clave) DO NOTHING`,
                    [ordenCodigo, prodPorMotivo.get(mi) || null, mi, c.clave, c.nombre, c.grupo, c.unidad,
                        c.objetivo_defecto, c.tolerancia_min_defecto, c.tolerancia_max_defecto]
                );
            }
        }
    }

    app.get(api + '/parametros-control', async (req, res) => {
        try {
            const ordenCodigo = String(req.query.orden || req.query.orderCode || '').trim();
            if (!ordenCodigo) throw erroneo(400, 'El parámetro "orden" es requerido.');
            await sembrarParametrosControl(ordenCodigo);
            const result = await pgQuery(
                `SELECT id, motivo_indice, parametro_clave, nombre, grupo, unidad,
                        objetivo, tolerancia_min, tolerancia_max, valor_real, estado, medido_por, medido_en
                   FROM calidad_parametros_control
                  WHERE orden_produccion_codigo = $1
                  ORDER BY motivo_indice, grupo, nombre`,
                [ordenCodigo]
            );
            res.json({ ok: true, data: result.rows });
        } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message }); }
    });

    app.post(api + '/parametros-control', async (req, res) => {
        try {
            const { orden, orderCode, motivoIndice, parametroClave, valorReal, objetivo, toleranciaMin, toleranciaMax, medidoPor } = req.body || {};
            const ordenCodigo = String(orden || orderCode || '').trim();
            if (!ordenCodigo || !parametroClave) throw erroneo(400, 'Faltan "orden" y "parametroClave".');
            const mi = Number(motivoIndice || 0);
            const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
            const set = [];
            const vals = [ordenCodigo, mi, String(parametroClave)];
            const add = (col, v) => { vals.push(v); set.push(`${col} = $${vals.length}`); };
            if (valorReal !== undefined) { add('valor_real', num(valorReal)); add('medido_por', medidoPor || null); set.push('medido_en = NOW()'); }
            if (objetivo !== undefined) add('objetivo', num(objetivo));
            if (toleranciaMin !== undefined) add('tolerancia_min', num(toleranciaMin));
            if (toleranciaMax !== undefined) add('tolerancia_max', num(toleranciaMax));
            if (!set.length) throw erroneo(400, 'Nada que actualizar.');
            const upd = await pgQuery(
                `UPDATE calidad_parametros_control SET ${set.join(', ')}
                  WHERE orden_produccion_codigo = $1 AND motivo_indice = $2 AND parametro_clave = $3
                  RETURNING id, parametro_clave, nombre, objetivo, tolerancia_min, tolerancia_max, valor_real, estado`,
                vals
            );
            if (!upd.rows.length) throw erroneo(404, 'Parámetro no encontrado para esa orden. Cargá primero la orden (GET).');
            res.json({ ok: true, data: upd.rows[0] });
        } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message }); }
    });

    app.post(api + '/ordenes', async (req, res) => {
        try {
            const body = req.body || {};
            if (!Array.isArray(body.lineas) || !body.lineas.length) {
                throw erroneo(400, 'Debe incluir al menos una línea afectada.');
            }
            const codigo = await generateNextQualityOrderCode();
            const resultado = await withTransaction(async (client) => {
                const cabecera = await client.query(
                    `INSERT INTO calidad_ordenes
                        (codigo, orden_produccion_codigo, cliente_codigo, cliente_nombre, fecha_deteccion,
                         detectado_por, descripcion_general, estado)
                     VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7,'ABIERTA')
                     RETURNING *`,
                    [codigo, body.orden_produccion_codigo || null, body.cliente_codigo || null,
                     body.cliente_nombre || null, body.fecha_deteccion || null,
                     body.detectado_por || req.headers['x-usuario-id'] || null, body.descripcion_general || null]
                );
                const ordenCalidadId = cabecera.rows[0].id;
                const lineas = [];
                for (const linea of body.lineas) {
                    const lineaResult = await client.query(
                        `INSERT INTO calidad_orden_lineas
                            (orden_calidad_id, producto_codigo, linea_codigo, sustrato, ancho, largo,
                             diametro_core, cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo,
                             troquelado_forma, numerado_tipo, rebobinado_notas)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                         RETURNING *`,
                        [ordenCalidadId, linea.producto_codigo || null, linea.linea_codigo || null,
                         linea.sustrato || null, linea.ancho || null, linea.largo || null,
                         linea.diametro_core || null, linea.cantidad_tintas || null,
                         linea.tinta_blanca ?? null, linea.barniz_tipo || null, linea.laminado_tipo || null,
                         linea.troquelado_forma || null, linea.numerado_tipo || null, linea.rebobinado_notas || null]
                    );
                    const ordenLineaId = lineaResult.rows[0].id;
                    const pantones = [];
                    for (const pantone of (linea.pantones || [])) {
                        const p = await client.query(
                            `INSERT INTO calidad_orden_linea_pantones
                                (orden_linea_id, pantone_codigo, color_referencia, densidad, anilox_codigo)
                             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                            [ordenLineaId, pantone.pantone_codigo, pantone.color_referencia || null,
                             pantone.densidad || null, pantone.anilox_codigo || null]
                        );
                        pantones.push(p.rows[0]);
                    }
                    const defectos = [];
                    for (const defecto of (linea.defectos || [])) {
                        const d = await client.query(
                            `INSERT INTO calidad_orden_linea_defectos
                                (orden_linea_id, tipo_defecto_id, descripcion, area_responsable, persona_responsable)
                             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                            [ordenLineaId, defecto.tipo_defecto_id || null, defecto.descripcion || null,
                             defecto.area_responsable || null, defecto.persona_responsable || null]
                        );
                        defectos.push(d.rows[0]);
                    }
                    lineas.push({ ...lineaResult.rows[0], pantones, defectos });
                }
                return { ...cabecera.rows[0], lineas };
            });
            res.status(201).json(resultado);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/ordenes', async (req, res) => {
        try {
            const condiciones = [];
            const valores = [];
            if (req.query.estado) { valores.push(req.query.estado); condiciones.push(`estado = $${valores.length}`); }
            if (req.query.cliente) { valores.push(`%${req.query.cliente}%`); condiciones.push(`cliente_nombre ILIKE $${valores.length}`); }
            if (req.query.orden_produccion_codigo) { valores.push(req.query.orden_produccion_codigo); condiciones.push(`orden_produccion_codigo = $${valores.length}`); }
            if (req.query.q) {
                valores.push(`%${req.query.q}%`);
                condiciones.push(`(codigo ILIKE $${valores.length} OR descripcion_general ILIKE $${valores.length} OR cliente_nombre ILIKE $${valores.length})`);
            }
            const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
            const resultado = await pgQuery(
                `SELECT * FROM calidad_ordenes ${where} ORDER BY fecha_creacion DESC LIMIT 300`,
                valores
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/ordenes/:codigo', async (req, res) => {
        try {
            const cabecera = await pgQuery(`SELECT * FROM calidad_ordenes WHERE codigo = $1`, [req.params.codigo]);
            if (!cabecera.rows.length) throw erroneo(404, `No se encontró la orden de calidad ${req.params.codigo}.`);
            const lineas = await pgQuery(
                `SELECT * FROM calidad_orden_lineas WHERE orden_calidad_id = $1 ORDER BY id`,
                [cabecera.rows[0].id]
            );
            for (const linea of lineas.rows) {
                const pantones = await pgQuery(`SELECT * FROM calidad_orden_linea_pantones WHERE orden_linea_id = $1`, [linea.id]);
                const defectos = await pgQuery(
                    `SELECT d.*, td.nombre AS tipo_defecto_nombre
                     FROM calidad_orden_linea_defectos d
                     LEFT JOIN calidad_tipos_defecto td ON td.id = d.tipo_defecto_id
                     WHERE d.orden_linea_id = $1`,
                    [linea.id]
                );
                linea.pantones = pantones.rows;
                linea.defectos = defectos.rows;
            }
            res.json({ ...cabecera.rows[0], lineas: lineas.rows });
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.patch(api + '/ordenes/:codigo', async (req, res) => {
        try {
            const body = req.body || {};
            const estadosValidos = ['ABIERTA', 'EN_INVESTIGACION', 'ACCION_CORRECTIVA_DEFINIDA', 'CERRADA'];
            if (body.estado && !estadosValidos.includes(body.estado)) {
                throw erroneo(400, `Estado inválido: ${body.estado}`);
            }
            const esCierre = body.estado === 'CERRADA';
            const resultado = await pgQuery(
                `UPDATE calidad_ordenes SET
                    estado = COALESCE($2, estado),
                    accion_correctiva = COALESCE($3, accion_correctiva),
                    accion_preventiva = COALESCE($4, accion_preventiva),
                    responsable_accion = COALESCE($5, responsable_accion),
                    fecha_limite_accion = COALESCE($6, fecha_limite_accion),
                    cerrado_por = CASE WHEN $7 THEN COALESCE($8, cerrado_por) ELSE cerrado_por END,
                    fecha_cierre = CASE WHEN $7 THEN NOW() ELSE fecha_cierre END,
                    fecha_actualizacion = NOW()
                 WHERE codigo = $1
                 RETURNING *`,
                [req.params.codigo, body.estado || null, body.accion_correctiva || null,
                 body.accion_preventiva || null, body.responsable_accion || null,
                 body.fecha_limite_accion || null, esCierre, body.cerrado_por || req.headers['x-usuario-id'] || null]
            );
            if (!resultado.rows.length) throw erroneo(404, `No se encontró la orden de calidad ${req.params.codigo}.`);
            res.json(resultado.rows[0]);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.post(api + '/documentos', async (req, res) => {
        try {
            const body = req.body || {};
            const tiposValidos = ['cartilla_color', 'ficha_tecnica', 'certificado_calidad'];
            if (!tiposValidos.includes(body.tipo)) throw erroneo(400, `Tipo de documento inválido: ${body.tipo}`);
            if (!body.orden_produccion_codigo) throw erroneo(400, 'orden_produccion_codigo es requerido.');

            let snapshot = null;
            if (body.tipo === 'ficha_tecnica' || body.tipo === 'cartilla_color') {
                snapshot = await generarSnapshotTecnico(pgQuery, body.orden_produccion_codigo, body.producto_codigo || null);
            }

            const documento = await withTransaction(async (client) => {
                const version = await client.query(
                    `SELECT COALESCE(MAX(version), 0) + 1 AS siguiente FROM calidad_documentos
                     WHERE orden_produccion_codigo = $1 AND tipo = $2 AND producto_codigo IS NOT DISTINCT FROM $3`,
                    [body.orden_produccion_codigo, body.tipo, body.producto_codigo || null]
                );
                const siguienteVersion = version.rows[0].siguiente;
                const cabecera = await client.query(
                    `INSERT INTO calidad_documentos
                        (tipo, orden_produccion_codigo, producto_codigo, version, generado_por,
                         sustrato, ancho, largo, diametro_core, cantidad_tintas, tinta_blanca,
                         barniz_tipo, laminado_tipo, troquelado_forma, numerado_tipo, rebobinado_notas,
                         cantidad_aprobada, cantidad_rechazada, resultado_inspeccion, observaciones,
                         inspeccionado_por, fecha_inspeccion)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
                     RETURNING *`,
                    [body.tipo, body.orden_produccion_codigo, body.producto_codigo || null, siguienteVersion,
                     body.generado_por || req.headers['x-usuario-id'] || null,
                     snapshot?.sustrato || null, snapshot?.ancho || null, snapshot?.largo || null,
                     snapshot?.diametro_core || null, snapshot?.cantidad_tintas || null, snapshot?.tinta_blanca ?? null,
                     snapshot?.barniz_tipo || null, snapshot?.laminado_tipo || null, snapshot?.troquelado_forma || null,
                     snapshot?.numerado_tipo || null, snapshot?.rebobinado_notas || null,
                     body.cantidad_aprobada ?? null, body.cantidad_rechazada ?? null,
                     body.resultado_inspeccion || null, body.observaciones || null,
                     body.inspeccionado_por || null, body.fecha_inspeccion || null]
                );
                const documentoId = cabecera.rows[0].id;
                const pantones = [];
                if (body.tipo === 'cartilla_color' && snapshot) {
                    for (const pantone of snapshot.pantones) {
                        const p = await client.query(
                            `INSERT INTO calidad_documento_pantones
                                (documento_id, pantone_codigo, color_referencia, receta_referencia, densidad_objetivo, anilox_codigo)
                             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                            [documentoId, pantone.pantone_codigo, pantone.color_referencia || null,
                             pantone.receta_referencia || null, pantone.densidad || null, pantone.anilox_codigo || null]
                        );
                        pantones.push(p.rows[0]);
                    }
                }
                return { ...cabecera.rows[0], pantones };
            });
            res.status(201).json(documento);
        } catch (e) {
            if (e.code === '23505') {
                return res.status(409).json({ error: 'Ya se generó un documento con esta versión, intente de nuevo.' });
            }
            res.status(e.status || 500).json({ error: e.message });
        }
    });

    app.get(api + '/documentos', async (req, res) => {
        try {
            const condiciones = [];
            const valores = [];
            if (req.query.orden_produccion_codigo) { valores.push(req.query.orden_produccion_codigo); condiciones.push(`orden_produccion_codigo = $${valores.length}`); }
            if (req.query.tipo) { valores.push(req.query.tipo); condiciones.push(`tipo = $${valores.length}`); }
            const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
            const resultado = await pgQuery(
                `SELECT * FROM calidad_documentos ${where} ORDER BY generado_en DESC LIMIT 300`,
                valores
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/documentos/:id', async (req, res) => {
        try {
            const cabecera = await pgQuery(`SELECT * FROM calidad_documentos WHERE id = $1`, [req.params.id]);
            if (!cabecera.rows.length) throw erroneo(404, `No se encontró el documento ${req.params.id}.`);
            const pantones = await pgQuery(`SELECT * FROM calidad_documento_pantones WHERE documento_id = $1`, [req.params.id]);
            res.json({ ...cabecera.rows[0], pantones: pantones.rows });
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
}

module.exports = { registrarRutasCalidad, erroneo };
