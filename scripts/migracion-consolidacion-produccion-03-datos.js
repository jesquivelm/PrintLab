#!/usr/bin/env node
/*
 * Consolidación Producción / Planificación — Paso 3: migración de datos.
 *
 * Migra las órdenes vivas (flexo_orders.delivered_on IS NULL) desde el modelo
 * viejo al nuevo:
 *
 *   production_order_routes            →  orden_proceso
 *   order_tracking_marks              ─┤  (reconciliación: si la marca dice
 *   flexo_orders.raw_data.planning_control  →  orden_planificacion
 *
 * Reglas:
 *  - Si production_order_routes.route_status = COMPLETADO  O  la marca del
 *    proceso está marcada = true  →  estado = COMPLETADO  (gana COMPLETADO).
 *  - RUN→EN_MARCHA, PARO→EN_PARO, SETUP→PREPARACION, resto→PENDIENTE.
 *  - dependency_route_id se remapea a depende_de_id en una segunda pasada.
 *  - Todo el route_payload se conserva en datos_extra.
 *  - Idempotente: por cada orden borra y regenera sus filas nuevas.
 *
 * Uso:
 *   node scripts/migracion-consolidacion-produccion-03-datos.js
 *       → SIMULACRO: hace todo dentro de una transacción y hace ROLLBACK.
 *         Imprime el resumen y las anomalías sin tocar nada.
 *
 *   node scripts/migracion-consolidacion-produccion-03-datos.js --commit
 *       → Aplica de verdad. Solo hace COMMIT si NO hubo anomalías.
 */

const { pool } = require('../db/postgres');

const COMMIT = process.argv.includes('--commit');

const ESTADO_MAP = {
    RUN: 'EN_MARCHA',
    PARO: 'EN_PARO',
    SETUP: 'PREPARACION',
    COMPLETADO: 'COMPLETADO',
    PENDIENTE: 'PENDIENTE'
};

// Misma canonicalización que canonicalPlanningProcessKey() en server.js, para
// poder cruzar process_key de rutas con clave_proceso de marcas.
function normKey(value) {
    const k = String(value || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (!k) return '';
    if (k.includes('disen')) return 'diseno';
    if (k.includes('preprensa')) return 'preprensa';
    if (k.includes('visto') || k.includes('aprobacion')) return 'visto_bueno';
    if (k.includes('plancha')) return 'planchas';
    if (k.includes('tinta')) return 'tintas';
    if (k.includes('acabado')) return 'acabados';
    if (k.includes('impres')) return 'impresion';
    if (k.includes('laminad')) return 'laminado';
    if (k.includes('troquel')) return 'troquelado';
    if (k.includes('estamp')) return 'estampado';
    if (k.includes('barniz')) return 'barnizado';
    if (k.includes('embos') || k.includes('relieve')) return 'embosado';
    if (k.includes('numer')) return 'numeracion';
    if (k.includes('rebobin')) return 'rebobinado';
    if (k.includes('empaque') || k.includes('packing')) return 'empaque';
    return k;
}

function mapEstadoPlanificacion(planningStatus, routes) {
    const ps = String(planningStatus || 'PENDIENTE_VENTAS');
    const anyStarted = routes.some((r) => ['RUN', 'PARO', 'COMPLETADO'].includes(r.route_status));
    const allDone = routes.length > 0 && routes.every((r) => r.route_status === 'COMPLETADO');
    if (allDone) return 'COMPLETADA';
    if (ps === 'EN_GANTT' && anyStarted) return 'EN_PRODUCCION';
    if (['PENDIENTE_VENTAS', 'PENDIENTE_PLANIFICACION', 'EN_GANTT', 'DEVUELTA_VENTAS'].includes(ps)) return ps;
    return 'PENDIENTE_VENTAS';
}

function toDateOrNull(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

// Para columnas DATE: toma solo la parte YYYY-MM-DD del string ISO, sin
// construir un Date (evita el corrimiento de 1 día por zona horaria cuando
// el timestamp es medianoche UTC).
function soloFecha(value) {
    const s = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

async function main() {
    const client = await pool.connect();
    const resumen = {
        ordenes: 0,
        planificaciones: 0,
        procesos: 0,
        reconciliadosPorMarca: 0,
        dependenciasEnlazadas: 0,
        anomalias: []
    };

    try {
        await client.query('BEGIN');

        const { rows: orders } = await client.query(
            `SELECT order_code, quote_code, line_code, created_at, raw_data
               FROM flexo_orders
              WHERE delivered_on IS NULL
              ORDER BY order_code`
        );

        for (const ord of orders) {
            const code = ord.order_code;
            const raw = ord.raw_data || {};
            const pc = raw.planning_control || raw.planningControl || {};

            const { rows: routes } = await client.query(
                `SELECT * FROM production_order_routes WHERE order_code = $1 ORDER BY sequence_order, created_at`,
                [code]
            );
            if (!routes.length) continue;

            const { rows: marks } = await client.query(
                `SELECT clave_proceso, marcado, fecha_marcado FROM order_tracking_marks WHERE codigo_orden = $1`,
                [code]
            );
            const markByKey = new Map();
            marks.forEach((m) => markByKey.set(normKey(m.clave_proceso), m));

            // idempotencia
            await client.query('DELETE FROM orden_proceso WHERE codigo_orden = $1', [code]);
            await client.query('DELETE FROM orden_planificacion WHERE codigo_orden = $1', [code]);

            // ── orden_planificacion ──
            const promised = pc.promisedDeliveryDate || raw.quote_snapshot?.due_on || null;
            await client.query(
                `INSERT INTO orden_planificacion (
                    codigo_orden, estado_planificacion,
                    liberado_ventas, liberado_ventas_en, liberado_ventas_por,
                    lanzado_gantt, lanzado_gantt_en, lanzado_gantt_por,
                    devuelto_en, devuelto_por, motivo_devolucion,
                    fecha_entrega_prometida, fecha_entrega_programada, dias_buffer_entrega,
                    fecha_fin_produccion_proyectada, alerta_atraso,
                    procesos_seleccionados, seleccion_procesos_en, seleccion_procesos_por,
                    fecha_entrega_estimada_min, fecha_entrega_estimada_max, estimacion_confianza,
                    estimado_en, estimado_por, prioridad
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
                [
                    code,
                    mapEstadoPlanificacion(pc.planningStatus, routes),
                    !!pc.salesReleased, toDateOrNull(pc.salesReleasedAt), pc.salesReleasedBy || null,
                    !!pc.launchedToGantt, toDateOrNull(pc.launchedAt), pc.launchedBy || null,
                    toDateOrNull(pc.returnedAt), pc.returnedBy || null, pc.returnReason || null,
                    soloFecha(promised),
                    soloFecha(pc.scheduledDeliveryDate),
                    Number(pc.deliveryBufferBusinessDays || 0),
                    toDateOrNull(pc.productionEndDate),
                    !!pc.productionScheduleAlert,
                    Array.isArray(pc.selectedProcessKeys) ? pc.selectedProcessKeys.map(String) : [],
                    toDateOrNull(pc.processSelectionUpdatedAt), pc.processSelectionUpdatedBy || null,
                    soloFecha(pc.estimatedDeliveryDateEarly),
                    soloFecha(pc.estimatedDeliveryDateLate),
                    pc.estimationConfidence || null,
                    toDateOrNull(pc.estimatedAt), pc.estimatedBy || null,
                    pc.estimatePriority || 'normal'
                ]
            );
            resumen.planificaciones++;

            // ── orden_proceso (primera pasada) ──
            const idMap = new Map(); // route_id viejo -> orden_proceso.id nuevo
            for (const r of routes) {
                const payload = (r.route_payload && typeof r.route_payload === 'object') ? r.route_payload : {};
                const key = normKey(r.process_key) || String(r.process_key || '');
                const mark = markByKey.get(key);
                const markDone = !!(mark && mark.marcado === true);

                let estado = ESTADO_MAP[r.route_status] || 'PENDIENTE';
                let reconciliado = false;
                if (r.route_status !== 'COMPLETADO' && markDone) {
                    estado = 'COMPLETADO';
                    reconciliado = true;
                    resumen.reconciliadosPorMarca++;
                }
                const realFin = r.actual_end_at
                    || (estado === 'COMPLETADO' && markDone ? (mark.fecha_marcado || null) : null);

                const { rows: [ins] } = await client.query(
                    `INSERT INTO orden_proceso (
                        codigo_orden, codigo_cotizacion, codigo_linea, secuencia,
                        clave_proceso, nombre_proceso, perfil_maquina_id,
                        estado, duracion_horas, transicion_min,
                        fecha_plan_inicio, fecha_plan_fin, fecha_real_inicio, fecha_real_fin,
                        bloqueo_manual, origen, color_hex, datos_extra
                     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                     RETURNING id`,
                    [
                        code,
                        r.quote_code || ord.quote_code || null,
                        r.line_code || ord.line_code || null,
                        r.sequence_order,
                        key,
                        r.process_name || key,
                        r.machine_profile_id || null,
                        estado,
                        Number(r.duration_hours || 0),
                        Number(r.transition_cost_min || 0),
                        toDateOrNull(r.planned_start_at),
                        toDateOrNull(r.planned_end_at),
                        toDateOrNull(r.actual_start_at),
                        toDateOrNull(realFin),
                        payload.manualLock === true,
                        r.source_mode || 'auto',
                        payload.colorHex || null,
                        JSON.stringify({
                            ...payload,
                            start_turn_hour: r.start_turn_hour,
                            migrado_de_route_id: r.id,
                            reconciliado_por_marca: reconciliado
                        })
                    ]
                );
                idMap.set(r.id, ins.id);
                resumen.procesos++;
            }

            // ── segunda pasada: dependencias ──
            for (const r of routes) {
                if (!r.dependency_route_id) continue;
                const nuevoDep = idMap.get(r.dependency_route_id);
                const nuevoSelf = idMap.get(r.id);
                if (nuevoDep && nuevoSelf) {
                    await client.query('UPDATE orden_proceso SET depende_de_id = $1 WHERE id = $2', [nuevoDep, nuevoSelf]);
                    resumen.dependenciasEnlazadas++;
                } else {
                    resumen.anomalias.push(`${code}: dependencia sin remapear (route ${r.id} → ${r.dependency_route_id})`);
                }
            }

            // ── verificación por orden ──
            const { rows: [chk] } = await client.query(
                `SELECT
                    (SELECT count(*)::int FROM production_order_routes WHERE order_code = $1) AS rutas_viejas,
                    (SELECT count(*)::int FROM orden_proceso WHERE codigo_orden = $1) AS procesos_nuevos,
                    (SELECT count(*)::int FROM production_order_routes WHERE order_code = $1 AND route_status = 'COMPLETADO') AS done_viejo,
                    (SELECT count(*)::int FROM orden_proceso WHERE codigo_orden = $1 AND estado = 'COMPLETADO') AS done_nuevo`,
                [code]
            );
            if (chk.rutas_viejas !== chk.procesos_nuevos) {
                resumen.anomalias.push(`${code}: rutas ${chk.rutas_viejas} ≠ procesos ${chk.procesos_nuevos}`);
            }
            if (chk.done_nuevo < chk.done_viejo) {
                resumen.anomalias.push(`${code}: COMPLETADO nuevo ${chk.done_nuevo} < viejo ${chk.done_viejo}`);
            }
            resumen.ordenes++;
        }

        // ── conservar la recencia real ──
        // La inserción aplana actualizado_en a un instante; se re-hidrata desde
        // production_order_routes.updated_at para no perder la señal de "qué
        // proceso se tocó más recientemente" (la usa el desempate de /api/mes/contexto).
        await client.query(`
            UPDATE orden_proceso op
               SET actualizado_en = r.updated_at
              FROM production_order_routes r
             WHERE op.datos_extra->>'migrado_de_route_id' ~ '^[0-9a-fA-F-]{36}$'
               AND r.id = (op.datos_extra->>'migrado_de_route_id')::uuid
               AND r.updated_at IS NOT NULL
        `);

        // ── verificación global ──
        const { rows: [tot] } = await client.query(
            `SELECT
                (SELECT count(*)::int FROM production_order_routes r
                    JOIN flexo_orders o ON o.order_code = r.order_code
                   WHERE o.delivered_on IS NULL) AS rutas_vivas,
                (SELECT count(*)::int FROM orden_proceso) AS procesos_nuevos,
                (SELECT count(*)::int FROM orden_planificacion) AS planificaciones`
        );
        if (tot.rutas_vivas !== tot.procesos_nuevos) {
            resumen.anomalias.push(`GLOBAL: rutas vivas ${tot.rutas_vivas} ≠ orden_proceso ${tot.procesos_nuevos}`);
        }

        console.log(`\n─── RESUMEN ${COMMIT ? '(--commit)' : '(SIMULACRO — se hará ROLLBACK)'} ───`);
        console.table({
            'Órdenes migradas': resumen.ordenes,
            'orden_planificacion': resumen.planificaciones,
            'orden_proceso': resumen.procesos,
            'Reconciliados por marca (→COMPLETADO)': resumen.reconciliadosPorMarca,
            'Dependencias enlazadas': resumen.dependenciasEnlazadas,
            'Anomalías': resumen.anomalias.length
        });
        if (resumen.anomalias.length) {
            console.log('\nANOMALÍAS:');
            resumen.anomalias.slice(0, 60).forEach((a) => console.log('  • ' + a));
            if (resumen.anomalias.length > 60) console.log(`  … y ${resumen.anomalias.length - 60} más`);
        }

        if (COMMIT && resumen.anomalias.length === 0) {
            await client.query('COMMIT');
            console.log('\n✅ COMMIT aplicado.');
        } else if (COMMIT) {
            await client.query('ROLLBACK');
            console.log('\n⛔ Hay anomalías — ROLLBACK. Corrige y vuelve a correr.');
            process.exitCode = 1;
        } else {
            await client.query('ROLLBACK');
            console.log('\n↩️  ROLLBACK (simulacro). Corre con --commit cuando el resumen esté limpio.');
        }
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('\nERROR — ROLLBACK:', e.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
