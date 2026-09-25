// Reportería Gerencial · Tablero de KPIs Semanal (División Flexo)
// Espeja el Excel "KPIs_Flexo_Mayaprin": Registro Semanal, Causas de Paro y
// Merma, Pareto y Dashboard. Los insumos se autollenan desde lo que ya captura
// producción; quedan editables hasta que la semana se "cierra".

const { query: pgQuery } = require('../db/postgres');
const XLSX = require('xlsx');
const pdf = require('./pdf-service');

// ── Metas por defecto (columna gris editable del Dashboard del Excel) ──────────
const METAS_DEFECTO = {
    oee_pct: 0.65,
    disponibilidad_pct: 0.85,
    rendimiento_pct: 0.85,
    calidad_pct: 0.97,
    minutos_por_cambio: 45,
    merma_total_pct: 0.05,
    otif_pct: 0.95,
    ppm_reclamos: 3000,
    reproceso_pct: 0.03
};

// Indicador: etiqueta, si "más alto es mejor", cómo se formatea, y una nota que
// explica qué es y de dónde sale (tooltip en el reporte).
const INDICADORES = [
    { clave: 'oee_pct', etiqueta: 'OEE %', tipo: 'pct', metaUnidad: '%', mejor: 'alto',
      ayuda: 'Eficiencia General de los Equipos (Overall Equipment Effectiveness) = Disponibilidad × Rendimiento × Calidad.' },
    { clave: 'disponibilidad_pct', etiqueta: 'Disponibilidad %', tipo: 'pct', metaUnidad: '%', mejor: 'alto',
      ayuda: '(Horas planificadas − Horas de paro no planificado) ÷ Horas planificadas. Las horas planificadas vienen de Planificación.' },
    { clave: 'rendimiento_pct', etiqueta: 'Rendimiento %', tipo: 'pct', metaUnidad: '%', mejor: 'alto',
      ayuda: 'Velocidad real promedio ÷ Velocidad teórica del cálculo.' },
    { clave: 'calidad_pct', etiqueta: 'Calidad %', tipo: 'pct', metaUnidad: '%', mejor: 'alto',
      ayuda: 'Unidades buenas ÷ Unidades totales producidas.' },
    { clave: 'minutos_por_cambio', etiqueta: 'Tiempo Promedio por Cambio (min)', tipo: 'num', metaUnidad: 'min', mejor: 'bajo',
      ayuda: 'Horas en cambios ÷ Número de cambios, en minutos. Cada motivo del cálculo implica un cambio.' },
    { clave: 'merma_total_pct', etiqueta: '% Merma Total', tipo: 'pct', metaUnidad: '%', mejor: 'bajo',
      ayuda: '(Merma de arranque + Merma en corrida) ÷ Material usado, todo en metros.' },
    { clave: 'otif_pct', etiqueta: '% OTIF', tipo: 'pct', metaUnidad: '%', mejor: 'alto',
      ayuda: 'OTIF = "A tiempo y completas" (On Time In Full). Órdenes entregadas en la fecha comprometida y completas ÷ Órdenes despachadas.' },
    { clave: 'ppm_reclamos', etiqueta: 'PPM Reclamos', tipo: 'num', metaUnidad: '', mejor: 'bajo',
      ayuda: 'Reclamos de cliente ÷ Órdenes despachadas × 1 000 000. (Pendiente: falta el módulo para registrar reclamos de cliente.)' },
    { clave: 'reproceso_pct', etiqueta: '% Reproceso', tipo: 'pct', metaUnidad: '%', mejor: 'bajo',
      ayuda: 'Cálculos marcados como "Repetición por Error" en la semana ÷ Órdenes despachadas.' }
];

const CAMPOS_INSUMO = [
    'horas_planificadas', 'horas_paro_no_planificado', 'velocidad_teorica_m_min', 'velocidad_real_m_min',
    'unidades_buenas', 'unidades_totales', 'horas_en_cambios', 'numero_cambios',
    'merma_arranque_m', 'merma_corrida_m', 'material_usado_m',
    'ordenes_despachadas', 'ordenes_otif', 'reclamos_cliente', 'reprocesos'
];

// ─────────────────────────────────────────────────────────────────────────────
// Esquema (autocurativo al arrancar)
// ─────────────────────────────────────────────────────────────────────────────
async function ensureReporteriaKpiSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS reporteria_kpi_semana (
            id                          BIGSERIAL PRIMARY KEY,
            semana_inicio               DATE NOT NULL UNIQUE,
            semana_fin                  DATE NOT NULL,
            horas_planificadas          NUMERIC(12,2),
            horas_paro_no_planificado   NUMERIC(12,2),
            velocidad_teorica_m_min     NUMERIC(12,2),
            velocidad_real_m_min        NUMERIC(12,2),
            unidades_buenas             NUMERIC(16,2),
            unidades_totales            NUMERIC(16,2),
            horas_en_cambios            NUMERIC(12,2),
            numero_cambios              INTEGER,
            merma_arranque_m            NUMERIC(16,2),
            merma_corrida_m             NUMERIC(16,2),
            material_usado_m            NUMERIC(16,2),
            ordenes_despachadas         INTEGER,
            ordenes_otif                INTEGER,
            reclamos_cliente            INTEGER,
            reprocesos                  INTEGER,
            disponibilidad_pct          NUMERIC(8,5),
            rendimiento_pct             NUMERIC(8,5),
            calidad_pct                 NUMERIC(8,5),
            oee_pct                     NUMERIC(8,5),
            minutos_por_cambio          NUMERIC(10,2),
            merma_total_pct             NUMERIC(8,5),
            otif_pct                    NUMERIC(8,5),
            ppm_reclamos                NUMERIC(14,2),
            reproceso_pct               NUMERIC(8,5),
            campos_manuales             JSONB NOT NULL DEFAULT '{}'::jsonb,
            cerrada                     BOOLEAN NOT NULL DEFAULT false,
            cerrada_por                 TEXT,
            cerrada_en                  TIMESTAMPTZ,
            preliminar                  BOOLEAN NOT NULL DEFAULT false,
            notas                       TEXT,
            calculada_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS reporteria_kpi_evento (
            id           BIGSERIAL PRIMARY KEY,
            fecha        DATE NOT NULL,
            tipo         TEXT NOT NULL CHECK (tipo IN ('paro','merma')),
            categoria    TEXT NOT NULL,
            cantidad     NUMERIC(14,2) NOT NULL DEFAULT 0,
            unidad       TEXT NOT NULL DEFAULT '',
            comentario   TEXT,
            origen       TEXT NOT NULL DEFAULT 'manual',
            creado_por   TEXT,
            creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_reporteria_kpi_evento_fecha ON reporteria_kpi_evento(fecha)`);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS reporteria_kpi_config (
            id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            metas                   JSONB NOT NULL DEFAULT '{}'::jsonb,
            envio_automatico_activo BOOLEAN NOT NULL DEFAULT false,
            envio_dia_semana        INTEGER NOT NULL DEFAULT 1,
            envio_hora              INTEGER NOT NULL DEFAULT 7,
            envio_minuto            INTEGER NOT NULL DEFAULT 0,
            envio_tipo_reporte      TEXT NOT NULL DEFAULT 'ultima_cerrada'
                                    CHECK (envio_tipo_reporte IN ('ultima_cerrada','cerrar_actual','actual_preliminar')),
            envio_formatos          TEXT[] NOT NULL DEFAULT ARRAY['pdf','excel']::TEXT[],
            envio_destinatarios     TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
            ultimo_envio_en         TIMESTAMPTZ,
            ultima_semana_enviada   DATE,
            actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(
        `INSERT INTO reporteria_kpi_config (id, metas) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(METAS_DEFECTO)]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de semana (ISO: la semana empieza lunes)
// ─────────────────────────────────────────────────────────────────────────────
// Fecha local YYYY-MM-DD (nunca UTC: toISOString desplazaría el día en zonas negativas).
function aFechaISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

// Interpreta 'YYYY-MM-DD' (o Date) como medianoche local, sin corrimiento de zona.
function parseFechaLocal(valor) {
    if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    const m = String(valor).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(valor);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function lunesDe(fecha) {
    const d = parseFechaLocal(fecha);
    const dow = (d.getDay() + 6) % 7; // 0 = lunes
    d.setDate(d.getDate() - dow);
    return d;
}

function semanaDeFecha(fecha) {
    const inicio = lunesDe(fecha);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    return { inicio: aFechaISO(inicio), fin: aFechaISO(fin) };
}

function listarSemanas(cantidad) {
    const semanas = [];
    let cursor = lunesDe(new Date());
    for (let i = 0; i < cantidad; i++) {
        const fin = new Date(cursor);
        fin.setDate(fin.getDate() + 6);
        semanas.push({ inicio: aFechaISO(cursor), fin: aFechaISO(fin) });
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() - 7);
    }
    return semanas.reverse(); // de más antigua a más reciente
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de insumos de una semana desde lo que ya captura producción
// ─────────────────────────────────────────────────────────────────────────────
async function calcularInsumosSemana(semanaInicio, semanaFin) {
    const desde = semanaInicio;
    const hastaExcl = new Date(semanaFin + 'T00:00:00');
    hastaExcl.setDate(hastaExcl.getDate() + 1);
    const hasta = aFechaISO(hastaExcl);

    const ordenes = await pgQuery(`
        WITH imp AS (
            SELECT op.codigo_orden, MAX(op.fecha_real_fin) AS fin_impresion
              FROM orden_proceso op
             WHERE op.clave_proceso = 'impresion'
             GROUP BY op.codigo_orden
        ),
        fin_orden AS (
            SELECT op.codigo_orden, MAX(op.fecha_real_fin) AS fin_ultimo
              FROM orden_proceso op
             WHERE op.estado = 'COMPLETADO'
             GROUP BY op.codigo_orden
        )
        SELECT
            fo.order_code,
            COALESCE(i.fin_impresion, fo.corrida_fecha_vigente) AS momento_semana,
            f.fin_ultimo,
            fo.velocidad_maquina_m_min,
            fo.velocidad_maquina_m_min_vigente,
            fo.tiempo_montaje_min_vigente,
            fo.tiempo_setup_min_vigente,
            COALESCE(fo.impresion_merma_montaje_m_vigente, fo.merma_arranque_m_vigente)   AS merma_montaje_m,
            COALESCE(fo.impresion_merma_corrida_m_vigente, fo.merma_tiraje_m_vigente)     AS merma_corrida_m,
            fo.impresion_sustrato_consumido_m_vigente                                     AS sustrato_m,
            fo.impresion_cantidad_buena_millares_vigente                                  AS buenas_millares,
            fo.impresion_rechazo_millares_vigente                                         AS rechazo_millares,
            pl.fecha_entrega_prometida
          FROM flexo_orders fo
          LEFT JOIN imp i        ON i.codigo_orden = fo.order_code
          LEFT JOIN fin_orden f  ON f.codigo_orden = fo.order_code
          LEFT JOIN orden_planificacion pl ON pl.codigo_orden = fo.order_code
         WHERE COALESCE(i.fin_impresion, fo.corrida_fecha_vigente) >= $1::timestamptz
           AND COALESCE(i.fin_impresion, fo.corrida_fecha_vigente) <  $2::timestamptz
    `, [desde, hasta]);

    const filas = ordenes.rows;
    const cambios = filas.length;
    let velTeoAcum = 0, velTeoN = 0, velRealAcum = 0, velRealN = 0;
    let horasCambios = 0, mermaArranque = 0, mermaCorrida = 0, materialUsado = 0;
    let buenas = 0, totales = 0, despachadas = 0, otif = 0;

    for (const r of filas) {
        if (num(r.velocidad_maquina_m_min) > 0) { velTeoAcum += num(r.velocidad_maquina_m_min); velTeoN++; }
        if (num(r.velocidad_maquina_m_min_vigente) > 0) { velRealAcum += num(r.velocidad_maquina_m_min_vigente); velRealN++; }
        horasCambios += (num(r.tiempo_montaje_min_vigente) + num(r.tiempo_setup_min_vigente)) / 60;
        mermaArranque += num(r.merma_montaje_m);
        mermaCorrida += num(r.merma_corrida_m);
        materialUsado += num(r.sustrato_m);
        buenas += num(r.buenas_millares) * 1000;
        totales += (num(r.buenas_millares) + num(r.rechazo_millares)) * 1000;
        if (r.fin_ultimo && r.fin_ultimo >= parseFechaLocal(desde) && r.fin_ultimo < hastaExcl) {
            despachadas++;
            if (r.fecha_entrega_prometida && aFechaISO(new Date(r.fin_ultimo)) <= aFechaISO(parseFechaLocal(r.fecha_entrega_prometida))) {
                otif++;
            }
        }
    }

    // Paros no planificados: eventos de producción + eventos manuales tipo 'paro' en horas.
    const parosProd = await pgQuery(`
        SELECT COALESCE(SUM(
                   COALESCE((e.event_payload->>'minutos')::numeric, (e.event_payload->>'duracion_min')::numeric, 0)
               ), 0) AS minutos
          FROM production_route_events e
          JOIN orden_proceso op ON op.id = e.orden_proceso_id
         WHERE LOWER(e.event_type) = 'paro'
           AND e.created_at >= $1::timestamptz AND e.created_at < $2::timestamptz
    `, [desde, hasta]);

    const reclamos = await pgQuery(
        `SELECT COUNT(*)::int AS n FROM calidad_incidencias
          WHERE origen = 'cliente'
            AND COALESCE(fecha_evento, fecha_creacion) >= $1::timestamptz
            AND COALESCE(fecha_evento, fecha_creacion) <  $2::timestamptz`,
        [desde, hasta]
    );

    // Reprocesos = cálculos marcados como "Repetición por Error" (tipo de trabajo del cálculo).
    let reprocesos = 0;
    try {
        const rp = await pgQuery(
            `SELECT COUNT(*)::int AS n
               FROM flexo_calculations
              WHERE COALESCE(NULLIF(tipo_trabajo, ''), ui_state->'header'->>'workType') = 'Repetición por Error'
                AND created_at >= $1::timestamptz AND created_at < $2::timestamptz`,
            [desde, hasta]
        );
        reprocesos = num(rp.rows[0] && rp.rows[0].n);
    } catch (error) {
        reprocesos = 0;
    }

    const horasParo = num(parosProd.rows[0] && parosProd.rows[0].minutos) / 60;

    return {
        horas_planificadas: null, // no derivable con confianza aún -> casilla editable
        horas_paro_no_planificado: redondea(horasParo, 2),
        velocidad_teorica_m_min: velTeoN ? redondea(velTeoAcum / velTeoN, 2) : null,
        velocidad_real_m_min: velRealN ? redondea(velRealAcum / velRealN, 2) : null,
        unidades_buenas: buenas || null,
        unidades_totales: totales || null,
        horas_en_cambios: redondea(horasCambios, 2) || null,
        numero_cambios: cambios || null,
        merma_arranque_m: redondea(mermaArranque, 2) || null,
        merma_corrida_m: redondea(mermaCorrida, 2) || null,
        material_usado_m: redondea(materialUsado, 2) || null,
        ordenes_despachadas: despachadas || null,
        ordenes_otif: filas.some((r) => r.fecha_entrega_prometida) ? otif : null,
        reclamos_cliente: num(reclamos.rows[0] && reclamos.rows[0].n),
        reprocesos: reprocesos
    };
}

function redondea(v, decimales) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const f = Math.pow(10, decimales);
    return Math.round(n * f) / f;
}

// Indicadores derivados a partir de los insumos.
function derivar(insumos) {
    const hp = num(insumos.horas_planificadas);
    const paro = num(insumos.horas_paro_no_planificado);
    const disp = hp > 0 ? (hp - paro) / hp : null;

    const vt = num(insumos.velocidad_teorica_m_min);
    const vr = num(insumos.velocidad_real_m_min);
    const rend = vt > 0 ? vr / vt : null;

    const ub = num(insumos.unidades_buenas);
    const ut = num(insumos.unidades_totales);
    const cal = ut > 0 ? ub / ut : null;

    const oee = (disp != null && rend != null && cal != null) ? disp * rend * cal : null;

    const nc = num(insumos.numero_cambios);
    const minCambio = nc > 0 ? (num(insumos.horas_en_cambios) * 60) / nc : null;

    const ma = num(insumos.merma_arranque_m);
    const mc = num(insumos.merma_corrida_m);
    const mat = num(insumos.material_usado_m);
    const mermaPct = mat > 0 ? (ma + mc) / mat : null;

    const od = num(insumos.ordenes_despachadas);
    const otif = insumos.ordenes_otif == null ? null : (od > 0 ? num(insumos.ordenes_otif) / od : null);

    const ppm = od > 0 ? (num(insumos.reclamos_cliente) / od) * 1_000_000 : null;
    const repPct = od > 0 ? num(insumos.reprocesos) / od : null;

    return {
        disponibilidad_pct: disp,
        rendimiento_pct: rend,
        calidad_pct: cal,
        oee_pct: oee,
        minutos_por_cambio: minCambio,
        merma_total_pct: mermaPct,
        otif_pct: otif,
        ppm_reclamos: ppm,
        reproceso_pct: repPct
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistencia de la semana
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerFilaSemana(semanaInicio) {
    const r = await pgQuery(`SELECT * FROM reporteria_kpi_semana WHERE semana_inicio = $1::date`, [semanaInicio]);
    return r.rows[0] || null;
}

// Recalcula y guarda una semana desde el sistema. Sin overrides manuales.
async function recalcularSemana(semanaInicio, { forzar = false } = {}) {
    const { inicio, fin } = semanaDeFecha(semanaInicio);
    const fila = await obtenerFilaSemana(inicio);
    if (fila && fila.cerrada && !forzar) return fila;

    const auto = await calcularInsumosSemana(inicio, fin);
    const insumos = {};
    for (const campo of CAMPOS_INSUMO) {
        insumos[campo] = auto[campo] == null ? null : auto[campo];
    }
    const der = derivar(insumos);

    const columnas = [...CAMPOS_INSUMO, ...Object.keys(der)];
    const valores = [...CAMPOS_INSUMO.map((c) => insumos[c]), ...Object.keys(der).map((c) => der[c])];

    const setList = columnas.map((c, i) => `${c} = $${i + 3}`).join(', ');
    const insCols = ['semana_inicio', 'semana_fin', ...columnas].join(', ');
    const insPlace = ['$1::date', '$2::date', ...columnas.map((_, i) => `$${i + 3}`)].join(', ');

    const r = await pgQuery(
        `INSERT INTO reporteria_kpi_semana (${insCols}, calculada_en)
         VALUES (${insPlace}, NOW())
         ON CONFLICT (semana_inicio) DO UPDATE SET ${setList}, calculada_en = NOW(), actualizado_en = NOW()
         RETURNING *`,
        [inicio, fin, ...valores]
    );
    return r.rows[0];
}

// Lo único editable de una semana es la nota de la reunión. Los indicadores
// vienen del sistema y no se tocan a mano.
async function guardarNotaSemana(semanaInicio, nota) {
    const { inicio } = semanaDeFecha(semanaInicio);
    const fila = await obtenerFilaSemana(inicio);
    if (fila && fila.cerrada) {
        const err = new Error('La semana ya está cerrada.');
        err.status = 409;
        throw err;
    }
    if (!fila) await recalcularSemana(inicio);
    await pgQuery(
        `UPDATE reporteria_kpi_semana SET notas = $2, actualizado_en = NOW() WHERE semana_inicio = $1::date`,
        [inicio, typeof nota === 'string' ? nota.slice(0, 2000) : null]
    );
    return recalcularSemana(inicio);
}

async function cerrarSemana(semanaInicio, usuario, { preliminar = false } = {}) {
    const { inicio } = semanaDeFecha(semanaInicio);
    await recalcularSemana(inicio);
    const r = await pgQuery(
        `UPDATE reporteria_kpi_semana
            SET cerrada = true, cerrada_por = $2, cerrada_en = NOW(), preliminar = $3, actualizado_en = NOW()
          WHERE semana_inicio = $1::date
          RETURNING *`,
        [inicio, usuario || 'sistema', Boolean(preliminar)]
    );
    return r.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Config (metas + automatización)
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerConfig() {
    const r = await pgQuery(`SELECT * FROM reporteria_kpi_config WHERE id = 1`);
    const row = r.rows[0] || {};
    return {
        metas: { ...METAS_DEFECTO, ...(row.metas || {}) },
        automatizacion: {
            activo: Boolean(row.envio_automatico_activo),
            diaSemana: num(row.envio_dia_semana) || 1,
            hora: num(row.envio_hora),
            minuto: num(row.envio_minuto),
            tipoReporte: row.envio_tipo_reporte || 'ultima_cerrada',
            formatos: Array.isArray(row.envio_formatos) ? row.envio_formatos : ['pdf', 'excel'],
            destinatarios: Array.isArray(row.envio_destinatarios) ? row.envio_destinatarios : [],
            ultimoEnvioEn: row.ultimo_envio_en,
            ultimaSemanaEnviada: row.ultima_semana_enviada
        }
    };
}

async function guardarMetas(metas) {
    const limpio = {};
    for (const ind of INDICADORES) {
        if (metas && metas[ind.clave] != null && Number.isFinite(Number(metas[ind.clave]))) {
            limpio[ind.clave] = Number(metas[ind.clave]);
        }
    }
    await pgQuery(
        `UPDATE reporteria_kpi_config SET metas = $1::jsonb, actualizado_en = NOW() WHERE id = 1`,
        [JSON.stringify({ ...METAS_DEFECTO, ...limpio })]
    );
    return obtenerConfig();
}

async function guardarAutomatizacion(a) {
    const formatos = Array.isArray(a.formatos) ? a.formatos.filter((f) => f === 'pdf' || f === 'excel') : ['pdf', 'excel'];
    const destinatarios = Array.isArray(a.destinatarios)
        ? a.destinatarios.map((s) => String(s).trim()).filter((s) => /.+@.+\..+/.test(s))
        : [];
    const tipo = ['ultima_cerrada', 'cerrar_actual', 'actual_preliminar'].includes(a.tipoReporte) ? a.tipoReporte : 'ultima_cerrada';
    await pgQuery(
        `UPDATE reporteria_kpi_config SET
            envio_automatico_activo = $1,
            envio_dia_semana = $2,
            envio_hora = $3,
            envio_minuto = $4,
            envio_tipo_reporte = $5,
            envio_formatos = $6::text[],
            envio_destinatarios = $7::text[],
            actualizado_en = NOW()
          WHERE id = 1`,
        [
            Boolean(a.activo),
            Math.min(7, Math.max(1, num(a.diaSemana) || 1)),
            Math.min(23, Math.max(0, num(a.hora))),
            Math.min(59, Math.max(0, num(a.minuto))),
            tipo,
            formatos.length ? formatos : ['pdf', 'excel'],
            destinatarios
        ]
    );
    return obtenerConfig();
}

// ─────────────────────────────────────────────────────────────────────────────
// Causas / Pareto de la semana
// ─────────────────────────────────────────────────────────────────────────────
// Causas y merma SIEMPRE desde producción (production_route_events). Sin captura
// manual: un reporte no debe poder alterarse a mano.
async function causasDeSemana(semanaInicio, semanaFin) {
    const desde = semanaInicio;
    const hastaExcl = new Date(semanaFin + 'T00:00:00');
    hastaExcl.setDate(hastaExcl.getDate() + 1);
    const hasta = aFechaISO(hastaExcl);

    // Paros: por motivo, horas desde event_payload. La pantalla de producción no guarda
    // stop_reason_id (ese catálogo es otro, sin relación con los motivos configurables de
    // Configuración General → Producción) — el motivo real siempre queda en notes, como
    // "Tipo — Motivo (observación)". Si no hay sr, se saca de ahí.
    const paros = await pgQuery(`
        SELECT COALESCE(NULLIF(sr.description, ''), sr.reason_code,
                   NULLIF(regexp_replace(split_part(e.notes, ' — ', 2), '\\s*\\([^)]*\\)\\s*$', ''), ''),
                   'Sin motivo clasificado') AS categoria,
               COALESCE(NULLIF(sr.reason_group, ''), NULLIF(split_part(e.notes, ' — ', 1), ''), '') AS grupo,
               COUNT(*)::int AS cantidad,
               COALESCE(SUM(
                   COALESCE((e.event_payload->>'minutos')::numeric, (e.event_payload->>'duracion_min')::numeric, 0)
               ), 0) / 60.0 AS horas
          FROM production_route_events e
          LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
         WHERE LOWER(e.event_type) = 'paro'
           AND e.created_at >= $1::timestamptz AND e.created_at < $2::timestamptz
         GROUP BY 1, 2
    `, [desde, hasta]);

    // Merma por causa: desperdicio_m de los eventos (ya en metros).
    const mermas = await pgQuery(`
        SELECT COALESCE(NULLIF(sr.description, ''), sr.reason_code,
                   NULLIF(regexp_replace(split_part(e.notes, ' — ', 2), '\\s*\\([^)]*\\)\\s*$', ''), ''),
                   'Sin motivo clasificado') AS categoria,
               COALESCE(NULLIF(sr.reason_group, ''), NULLIF(split_part(e.notes, ' — ', 1), ''), '') AS grupo,
               COUNT(*)::int AS cantidad,
               COALESCE(SUM(e.desperdicio_m), 0) AS metros
          FROM production_route_events e
          LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
         WHERE COALESCE(e.desperdicio_m, 0) > 0
           AND e.created_at >= $1::timestamptz AND e.created_at < $2::timestamptz
         GROUP BY 1, 2
    `, [desde, hasta]);

    const listaParo = paros.rows
        .map((r) => ({ categoria: r.categoria, grupo: r.grupo, cantidad: num(r.cantidad), horas: redondea(num(r.horas), 2) }))
        .sort((a, b) => b.horas - a.horas);
    const listaMerma = mermas.rows
        .map((r) => ({ categoria: r.categoria, grupo: r.grupo, cantidad: num(r.cantidad), metros: redondea(num(r.metros), 2) }))
        .sort((a, b) => b.metros - a.metros);

    const totalHoras = listaParo.reduce((s, x) => s + x.horas, 0);
    const totalMetros = listaMerma.reduce((s, x) => s + x.metros, 0);
    listaParo.forEach((x) => { x.porcentaje = totalHoras > 0 ? x.horas / totalHoras : 0; });
    listaMerma.forEach((x) => { x.porcentaje = totalMetros > 0 ? x.metros / totalMetros : 0; });

    return {
        paro: listaParo,
        merma: listaMerma,
        totalHorasParo: redondea(totalHoras, 2),
        totalMetrosMerma: redondea(totalMetros, 2)
    };
}

// Bitácora de la semana: cada evento de paro real de producción (solo lectura).
async function listarEventos(semanaInicio, semanaFin) {
    const desde = semanaInicio;
    const hastaExcl = new Date(semanaFin + 'T00:00:00');
    hastaExcl.setDate(hastaExcl.getDate() + 1);
    const hasta = aFechaISO(hastaExcl);
    const r = await pgQuery(`
        SELECT e.id,
               e.created_at::date AS fecha,
               'paro' AS tipo,
               COALESCE(NULLIF(sr.description, ''), sr.reason_code,
                   NULLIF(regexp_replace(split_part(e.notes, ' — ', 2), '\\s*\\([^)]*\\)\\s*$', ''), ''),
                   'Sin motivo clasificado') AS categoria,
               COALESCE(NULLIF(sr.reason_group, ''), NULLIF(split_part(e.notes, ' — ', 1), ''), '') AS grupo,
               ROUND(COALESCE(
                   COALESCE((e.event_payload->>'minutos')::numeric, (e.event_payload->>'duracion_min')::numeric, 0) / 60.0
               , 0), 2) AS horas,
               ROUND(COALESCE(e.desperdicio_m, 0), 2) AS merma_m,
               e.operator_name AS operario,
               e.notes AS comentario
          FROM production_route_events e
          LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
         WHERE LOWER(e.event_type) = 'paro'
           AND e.created_at >= $1::timestamptz AND e.created_at < $2::timestamptz
         ORDER BY e.created_at
    `, [desde, hasta]);
    return r.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload completo para el tablero
// ─────────────────────────────────────────────────────────────────────────────
async function construirTablero({ semanas = 12, semanaInicio = null } = {}) {
    const rango = listarSemanas(semanas);
    // asegura filas para las semanas visibles no cerradas
    for (const s of rango) {
        const fila = await obtenerFilaSemana(s.inicio);
        if (!fila || !fila.cerrada) await recalcularSemana(s.inicio);
    }
    const filas = await pgQuery(
        `SELECT * FROM reporteria_kpi_semana WHERE semana_inicio >= $1::date ORDER BY semana_inicio`,
        [rango[0].inicio]
    );
    const config = await obtenerConfig();

    const semanaActual = semanaDeFecha(new Date());
    const idxActual = filas.rows.findIndex((f) => aFechaISO(new Date(f.semana_inicio)) === semanaActual.inicio);
    const actualCalendario = idxActual >= 0 ? filas.rows[idxActual] : filas.rows[filas.rows.length - 1] || null;

    // Semana "en foco": la seleccionada en el filtro, o la actual del calendario.
    let idxFoco = idxActual;
    if (semanaInicio) {
        const sel = semanaDeFecha(semanaInicio).inicio;
        const i = filas.rows.findIndex((f) => aFechaISO(new Date(f.semana_inicio)) === sel);
        if (i >= 0) idxFoco = i;
    }
    const actual = idxFoco >= 0 ? filas.rows[idxFoco] : actualCalendario;
    const anterior = idxFoco > 0 ? filas.rows[idxFoco - 1] : null;

    const causas = actual ? await causasDeSemana(
        aFechaISO(new Date(actual.semana_inicio)), aFechaISO(new Date(actual.semana_fin))
    ) : { paro: [], merma: [], totalHorasParo: 0, totalMetrosMerma: 0 };

    const eventos = actual ? await listarEventos(
        aFechaISO(new Date(actual.semana_inicio)), aFechaISO(new Date(actual.semana_fin))
    ) : [];

    return {
        ok: true,
        indicadores: INDICADORES,
        camposInsumo: CAMPOS_INSUMO,
        metas: config.metas,
        automatizacion: config.automatizacion,
        semanas: filas.rows,
        actual,
        anterior,
        causas,
        eventos,
        generadoEn: new Date().toISOString()
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentos: Excel y PDF
// ─────────────────────────────────────────────────────────────────────────────
function etiquetaSemana(fila) {
    return `${aFechaISO(new Date(fila.semana_inicio))} a ${aFechaISO(new Date(fila.semana_fin))}`;
}

function fmtPct(v) {
    return v == null || !Number.isFinite(Number(v)) ? '—' : (Number(v) * 100).toFixed(1) + ' %';
}
function fmtNum(v, dec = 1) {
    return v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('es-CR', { maximumFractionDigits: dec });
}
function fmtIndicador(ind, v) {
    return ind.tipo === 'pct' ? fmtPct(v) : fmtNum(v, ind.clave === 'ppm_reclamos' ? 0 : 1);
}
function cumpleMeta(ind, valor, meta) {
    if (valor == null || meta == null) return null;
    // Un cero en reclamos, reprocesos o min por cambio casi siempre significa "sin
    // captura", no "cero real": sin dato evaluado no hay estado de meta.
    if (['ppm_reclamos', 'reproceso_pct', 'minutos_por_cambio'].includes(ind.clave) && Number(valor) === 0) return null;
    return ind.mejor === 'alto' ? Number(valor) >= Number(meta) : Number(valor) <= Number(meta);
}

async function generarExcel({ semanaFila, tablero }) {
    const wb = XLSX.utils.book_new();

    const instr = [
        ['Tablero de KPIs Semanal — División Flexo (Etiquetas Adhesivas)'],
        [''],
        ['Este archivo lo genera el sistema PrintLab a partir de lo que captura producción.'],
        ['Registro Semanal: una fila por semana con los insumos y los indicadores calculados.'],
        ['Causas de Paro y Merma: eventos de la semana. Pareto: esos eventos sumados por categoría.'],
        ['Dashboard: semana actual vs. anterior vs. meta, y la tendencia.'],
        [''],
        ['Semana del informe:', semanaFila ? etiquetaSemana(semanaFila) : '—'],
        ['Estado:', semanaFila ? (semanaFila.cerrada ? (semanaFila.preliminar ? 'Cerrada (preliminar)' : 'Cerrada') : 'Preliminar / no cerrada') : '—'],
        ['Generado:', new Date().toLocaleString('es-CR')]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instr), 'Instrucciones');

    const encRegistro = [
        'Semana (inicio)', 'Semana (fin)', 'Horas planificadas', 'Horas paro no planificado', 'Disponibilidad %',
        'Velocidad teórica (m/min)', 'Velocidad real (m/min)', 'Rendimiento %', 'Unidades buenas', 'Unidades totales',
        'Calidad %', 'OEE %', 'Horas en cambios', '# de cambios', 'Min por cambio',
        'Merma arranque (m)', 'Merma corrida (m)', 'Material usado (m)', '% Merma total',
        'Órdenes despachadas', 'Órdenes OTIF', '% OTIF', 'Reclamos cliente', 'PPM reclamos', 'Reprocesos', '% Reproceso',
        'Cerrada'
    ];
    const filasRegistro = tablero.semanas.map((f) => [
        aFechaISO(new Date(f.semana_inicio)), aFechaISO(new Date(f.semana_fin)),
        f.horas_planificadas, f.horas_paro_no_planificado, f.disponibilidad_pct,
        f.velocidad_teorica_m_min, f.velocidad_real_m_min, f.rendimiento_pct, f.unidades_buenas, f.unidades_totales,
        f.calidad_pct, f.oee_pct, f.horas_en_cambios, f.numero_cambios, f.minutos_por_cambio,
        f.merma_arranque_m, f.merma_corrida_m, f.material_usado_m, f.merma_total_pct,
        f.ordenes_despachadas, f.ordenes_otif, f.otif_pct, f.reclamos_cliente, f.ppm_reclamos, f.reprocesos, f.reproceso_pct,
        f.cerrada ? 'Sí' : 'No'
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([encRegistro, ...filasRegistro]), 'Registro Semanal');

    const causasAoa = [['Tipo', 'Categoría', 'Horas / Metros', 'Cantidad de eventos', '% del total']];
    (tablero.causas.paro || []).forEach((c) => causasAoa.push(['Paro', c.categoria, redondea(c.horas, 2), c.cantidad, redondea(c.porcentaje * 100, 1)]));
    (tablero.causas.merma || []).forEach((c) => causasAoa.push(['Merma', c.categoria, redondea(c.metros, 2), c.cantidad, redondea(c.porcentaje * 100, 1)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(causasAoa), 'Causas y Pareto');

    const dashAoa = [['Indicador', 'Semana actual', 'Semana anterior', 'Meta', 'Cumple meta']];
    const act = semanaFila || tablero.actual;
    const ant = tablero.anterior;
    INDICADORES.forEach((ind) => {
        const va = act ? act[ind.clave] : null;
        const vb = ant ? ant[ind.clave] : null;
        const meta = tablero.metas[ind.clave];
        const ok = cumpleMeta(ind, va, meta);
        dashAoa.push([
            ind.etiqueta,
            fmtIndicador(ind, va),
            fmtIndicador(ind, vb),
            ind.tipo === 'pct' ? fmtPct(meta) : fmtNum(meta, 0),
            ok == null ? '—' : (ok ? 'Sí' : 'No')
        ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashAoa), 'Dashboard');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function generarPdf({ semanaFila, tablero, empresa, logoDataUri }) {
    const act = semanaFila || tablero.actual;
    const ant = tablero.anterior;
    const doc = pdf.nuevoDocumento({
        titulo: 'Informe Gerencial de KPIs — Flexo',
        empresa,
        pie: 'Informe Gerencial de KPIs · Flexo'
    });
    pdf.encabezadoOficial(doc, {
        empresa,
        logoDataUri,
        titulo: 'Informe Gerencial de KPIs — División Flexo',
        subtitulo: act
            ? `Semana ${etiquetaSemana(act)} · ${act.cerrada ? (act.preliminar ? 'cerrada (preliminar)' : 'cerrada') : 'preliminar / no cerrada'}`
            : 'Sin datos de semana'
    });

    pdf.tituloSeccion(doc, 'Dashboard — actual vs. anterior vs. meta');
    pdf.tabla(doc, [
        { clave: 'indicador', titulo: 'Indicador', ancho: 0.34 },
        { clave: 'actual', titulo: 'Semana actual', ancho: 0.17, alinear: 'right' },
        { clave: 'anterior', titulo: 'Semana anterior', ancho: 0.17, alinear: 'right' },
        { clave: 'meta', titulo: 'Meta', ancho: 0.16, alinear: 'right' },
        { clave: 'cumple', titulo: 'Cumple', ancho: 0.16, alinear: 'center' }
    ], INDICADORES.map((ind) => {
        const va = act ? act[ind.clave] : null;
        const vb = ant ? ant[ind.clave] : null;
        const meta = tablero.metas[ind.clave];
        const ok = cumpleMeta(ind, va, meta);
        return {
            indicador: ind.etiqueta,
            actual: fmtIndicador(ind, va),
            anterior: fmtIndicador(ind, vb),
            meta: ind.tipo === 'pct' ? fmtPct(meta) : fmtNum(meta, 0),
            cumple: ok == null ? '—' : (ok ? 'Cumple' : 'No cumple')
        };
    }));

    pdf.tituloSeccion(doc, 'Registro de la semana');
    if (act) {
        const pares = [
            ['Horas planificadas', fmtNum(act.horas_planificadas)],
            ['Horas de paro no planificado', fmtNum(act.horas_paro_no_planificado)],
            ['Velocidad teórica (m/min)', fmtNum(act.velocidad_teorica_m_min)],
            ['Velocidad real (m/min)', fmtNum(act.velocidad_real_m_min)],
            ['Unidades buenas', fmtNum(act.unidades_buenas, 0)],
            ['Unidades totales', fmtNum(act.unidades_totales, 0)],
            ['Horas en cambios', fmtNum(act.horas_en_cambios)],
            ['Número de cambios', fmtNum(act.numero_cambios, 0)],
            ['Merma de arranque (m)', fmtNum(act.merma_arranque_m)],
            ['Merma en corrida (m)', fmtNum(act.merma_corrida_m)],
            ['Material usado (m)', fmtNum(act.material_usado_m)],
            ['Órdenes despachadas', fmtNum(act.ordenes_despachadas, 0)],
            ['Órdenes OTIF', fmtNum(act.ordenes_otif, 0)],
            ['Reclamos de cliente', fmtNum(act.reclamos_cliente, 0)],
            ['Reprocesos', fmtNum(act.reprocesos, 0)]
        ];
        pdf.tabla(doc, [
            { clave: 0, titulo: 'Dato', ancho: 0.6 },
            { clave: 1, titulo: 'Valor', ancho: 0.4, alinear: 'right' }
        ], pares);
    } else {
        pdf.parrafo(doc, 'No hay datos para la semana seleccionada.');
    }

    pdf.tituloSeccion(doc, 'Causas de paro (Pareto)');
    if ((tablero.causas.paro || []).length) {
        pdf.tabla(doc, [
            { clave: 'categoria', titulo: 'Categoría', ancho: 0.55 },
            { clave: 'horas', titulo: 'Horas', ancho: 0.2, alinear: 'right' },
            { clave: 'cant', titulo: 'Eventos', ancho: 0.12, alinear: 'right' },
            { clave: 'pct', titulo: '% del total', ancho: 0.13, alinear: 'right' }
        ], tablero.causas.paro.map((c) => ({
            categoria: c.categoria, horas: fmtNum(c.horas, 2), cant: c.cantidad, pct: (c.porcentaje * 100).toFixed(1) + ' %'
        })));
    } else {
        pdf.parrafo(doc, 'Sin paros registrados en la semana.');
    }

    pdf.tituloSeccion(doc, 'Causas de merma (Pareto)');
    if ((tablero.causas.merma || []).length) {
        pdf.tabla(doc, [
            { clave: 'categoria', titulo: 'Categoría', ancho: 0.55 },
            { clave: 'metros', titulo: 'Metros', ancho: 0.2, alinear: 'right' },
            { clave: 'cant', titulo: 'Eventos', ancho: 0.12, alinear: 'right' },
            { clave: 'pct', titulo: '% del total', ancho: 0.13, alinear: 'right' }
        ], tablero.causas.merma.map((c) => ({
            categoria: c.categoria, metros: fmtNum(c.metros, 2), cant: c.cantidad, pct: (c.porcentaje * 100).toFixed(1) + ' %'
        })));
    } else {
        pdf.parrafo(doc, 'Sin merma por causa registrada en la semana (se captura a mano hasta que producción la desglose).');
    }

    pdf.tituloSeccion(doc, 'Tendencia (últimas semanas)');
    pdf.tabla(doc, [
        { clave: 'semana', titulo: 'Semana', ancho: 0.26 },
        { clave: 'oee', titulo: 'OEE', ancho: 0.123, alinear: 'right' },
        { clave: 'disp', titulo: 'Disp.', ancho: 0.123, alinear: 'right' },
        { clave: 'rend', titulo: 'Rend.', ancho: 0.123, alinear: 'right' },
        { clave: 'cal', titulo: 'Calidad', ancho: 0.123, alinear: 'right' },
        { clave: 'otif', titulo: 'OTIF', ancho: 0.123, alinear: 'right' },
        { clave: 'merma', titulo: 'Merma', ancho: 0.122, alinear: 'right' }
    ], tablero.semanas.slice(-8).map((f) => ({
        semana: aFechaISO(new Date(f.semana_inicio)),
        oee: fmtPct(f.oee_pct), disp: fmtPct(f.disponibilidad_pct), rend: fmtPct(f.rendimiento_pct),
        cal: fmtPct(f.calidad_pct), otif: fmtPct(f.otif_pct), merma: fmtPct(f.merma_total_pct)
    })));

    return pdf.aBuffer(doc);
}

function cuerpoCorreoHtml({ semanaFila, tablero, empresa, logoDataUri }) {
    const act = semanaFila || tablero.actual;
    const ant = tablero.anterior;
    const marca = empresa || 'PrintLab';

    let cumplen = 0, evaluables = 0;
    const filas = INDICADORES.map((ind, i) => {
        const va = act ? act[ind.clave] : null;
        const vb = ant ? ant[ind.clave] : null;
        const meta = tablero.metas[ind.clave];
        const ok = cumpleMeta(ind, va, meta);
        if (ok != null) { evaluables++; if (ok) cumplen++; }
        const pillBg = ok == null ? '#eef1f4' : (ok ? '#e7f5ec' : '#fdece9');
        const pillFg = ok == null ? '#7a8794' : (ok ? '#1a7f47' : '#b23b2c');
        const pillTx = ok == null ? 'Sin Datos' : (ok ? 'Cumple Meta' : 'Bajo Meta');
        const zebra = i % 2 ? '#f7f9fb' : '#ffffff';
        return `<tr style="background:${zebra};">
            <td style="padding:9px 14px;border-bottom:1px solid #edf1f5;font-size:13px;color:#2b3a46;">${ind.etiqueta}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #edf1f5;text-align:right;font-size:14px;font-weight:700;color:#12212e;">${fmtIndicador(ind, va)}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #edf1f5;text-align:right;font-size:12px;color:#7a8794;">${fmtIndicador(ind, vb)}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #edf1f5;text-align:right;font-size:12px;color:#7a8794;">${ind.tipo === 'pct' ? fmtPct(meta) : fmtNum(meta, 0)}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #edf1f5;text-align:center;">
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${pillBg};color:${pillFg};font-size:11px;font-weight:700;">${pillTx}</span>
            </td>
        </tr>`;
    }).join('');

    const estado = act
        ? (act.cerrada ? (act.preliminar ? 'Cerrada · preliminar' : 'Cerrada') : 'Preliminar · semana no cerrada')
        : 'Sin datos de semana';

    const topParos = (tablero.causas && tablero.causas.paro || []).slice(0, 3);
    const bloqueParos = topParos.length ? `
        <tr><td style="padding:22px 28px 6px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0b81b8;">Principales causas de paro</p>
            <table role="presentation" width="100%" style="border-collapse:collapse;">
                ${topParos.map((c) => `<tr>
                    <td style="padding:5px 0;font-size:13px;color:#2b3a46;">${(c.categoria || '').replace(/</g, '&lt;')}</td>
                    <td style="padding:5px 0;font-size:13px;text-align:right;font-weight:600;color:#12212e;">${fmtNum(c.horas, 2)} h · ${(c.porcentaje * 100).toFixed(0)}%</td>
                </tr>`).join('')}
            </table>
        </td></tr>` : '';

    const logo = (typeof logoDataUri === 'string' && /^data:image\/(png|jpe?g);base64,/.test(logoDataUri))
        ? `<img src="${logoDataUri}" alt="${marca}" height="34" style="height:34px;display:block;margin-bottom:8px;">`
        : '';

    return `<div style="margin:0;padding:0;background:#eef2f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:26px 12px;">
    <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Roboto,Arial,sans-serif;box-shadow:0 10px 34px rgba(20,35,55,.12);">
        <tr><td style="background:linear-gradient(135deg,#0b81b8,#0a6c9c);padding:26px 28px;">
            ${logo}
            <div style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.78);">${marca}</div>
            <div style="font-size:21px;font-weight:800;color:#ffffff;margin-top:3px;">Informe Gerencial de KPIs · Flexo</div>
            <div style="font-size:13px;color:rgba(255,255,255,.9);margin-top:6px;">
                Semana ${act ? etiquetaSemana(act) : '—'} &nbsp;·&nbsp; ${estado}
            </div>
        </td></tr>

        <tr><td style="padding:22px 28px 4px;">
            <p style="margin:0;font-size:14px;line-height:1.55;color:#33424f;">
                Estimado equipo directivo, a continuación el resumen semanal de desempeño de la División Flexo.
                Esta semana <b style="color:#12212e;">${evaluables ? cumplen : 0} de ${evaluables || INDICADORES.length}</b>
                indicadores con dato alcanzan su meta. El detalle completo se adjunta en PDF y Excel.
            </p>
        </td></tr>

        <tr><td style="padding:16px 28px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e6ecf1;border-radius:10px;overflow:hidden;">
                <tr style="background:#12212e;">
                    <th style="padding:10px 14px;text-align:left;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#cdd8e1;">Indicador</th>
                    <th style="padding:10px 14px;text-align:right;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#cdd8e1;">Actual</th>
                    <th style="padding:10px 14px;text-align:right;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#cdd8e1;">Anterior</th>
                    <th style="padding:10px 14px;text-align:right;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#cdd8e1;">Meta</th>
                    <th style="padding:10px 14px;text-align:center;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#cdd8e1;">Estado</th>
                </tr>
                ${filas}
            </table>
        </td></tr>

        ${bloqueParos}

        <tr><td style="padding:22px 28px 26px;">
            <p style="margin:0;font-size:11px;line-height:1.6;color:#9aa7b2;">
                Generado automáticamente por el sistema · ${new Date().toLocaleString('es-CR')}.
                Las metas son ajustables por la gerencia y no representan un estándar universal.
            </p>
        </td></tr>
    </table>
    </td></tr>
    </table>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Envío por correo
// ─────────────────────────────────────────────────────────────────────────────
async function prepararSemanaSegunTipo(tipoReporte, usuario) {
    if (tipoReporte === 'ultima_cerrada') {
        const r = await pgQuery(`SELECT * FROM reporteria_kpi_semana WHERE cerrada = true ORDER BY semana_inicio DESC LIMIT 1`);
        return { fila: r.rows[0] || null, preliminar: false };
    }
    const actual = semanaDeFecha(new Date());
    if (tipoReporte === 'cerrar_actual') {
        const fila = await cerrarSemana(actual.inicio, usuario || 'automático', { preliminar: false });
        return { fila, preliminar: false };
    }
    // actual_preliminar
    const fila = await recalcularSemana(actual.inicio);
    return { fila, preliminar: !fila.cerrada };
}

async function enviarInforme({ tipoReporte, formatos, destinatarios, usuario, loadGeneralConfig, sendEmail, semanaInicio }) {
    const cfgGeneral = loadGeneralConfig ? await loadGeneralConfig() : {};
    const empresa = (cfgGeneral.branding && cfgGeneral.branding.companyName) || 'PrintLab';
    const logoDataUri = (cfgGeneral.branding && cfgGeneral.branding.logoUrl) || '';

    let semanaFila;
    let preliminar = false;
    if (semanaInicio) {
        semanaFila = await recalcularSemana(semanaInicio);
        preliminar = !semanaFila.cerrada;
    } else {
        const prep = await prepararSemanaSegunTipo(tipoReporte || 'ultima_cerrada', usuario);
        semanaFila = prep.fila;
        preliminar = prep.preliminar;
    }

    const tablero = await construirTablero({
        semanas: 12,
        semanaInicio: semanaFila ? aFechaISO(new Date(semanaFila.semana_inicio)) : null
    });
    const fmts = (Array.isArray(formatos) && formatos.length ? formatos : ['pdf', 'excel']).filter((f) => f === 'pdf' || f === 'excel');

    const etiqueta = semanaFila ? etiquetaSemana(semanaFila).replace(/ a /, '_a_').replace(/ /g, '') : 'sin-semana';
    const attachments = [];
    if (fmts.includes('pdf')) {
        attachments.push({
            filename: `Informe_KPIs_Flexo_${etiqueta}.pdf`,
            content: await generarPdf({ semanaFila, tablero, empresa, logoDataUri })
        });
    }
    if (fmts.includes('excel')) {
        attachments.push({
            filename: `KPIs_Flexo_${etiqueta}.xlsx`,
            content: await generarExcel({ semanaFila, tablero })
        });
    }

    const lista = (Array.isArray(destinatarios) && destinatarios.length)
        ? destinatarios
        : (await obtenerConfig()).automatizacion.destinatarios;
    if (!lista.length) {
        const err = new Error('No hay destinatarios configurados para el informe.');
        err.status = 400;
        throw err;
    }

    const asuntoSemana = semanaFila ? etiquetaSemana(semanaFila) : 'sin semana cerrada';
    await sendEmail({
        to: lista.join(', '),
        subject: `${empresa} — Informe Gerencial de KPIs (Flexo) · ${asuntoSemana}${preliminar ? ' (preliminar)' : ''}`,
        html: cuerpoCorreoHtml({ semanaFila, tablero, empresa, logoDataUri }),
        text: 'Informe gerencial de KPIs de la División Flexo. Ver el detalle en los archivos adjuntos.',
        attachments
    });

    await pgQuery(
        `UPDATE reporteria_kpi_config SET ultimo_envio_en = NOW(), ultima_semana_enviada = $1, actualizado_en = NOW() WHERE id = 1`,
        [semanaFila ? aFechaISO(new Date(semanaFila.semana_inicio)) : null]
    );

    return { ok: true, destinatarios: lista, formatos: fmts, semana: asuntoSemana, preliminar };
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker de envío automático (revisa cada minuto, como el chequeo de licencia)
// ─────────────────────────────────────────────────────────────────────────────
function startReporteriaKpiWorker({ loadGeneralConfig, sendEmail, intervalMs = 60_000 }) {
    let ocupado = false;
    const tick = async () => {
        if (ocupado) return;
        ocupado = true;
        try {
            const cfg = await obtenerConfig();
            const a = cfg.automatizacion;
            if (!a.activo || !a.destinatarios.length) return;

            const ahora = new Date();
            const diaIso = ((ahora.getDay() + 6) % 7) + 1; // 1=lunes..7=domingo
            if (diaIso !== a.diaSemana) return;
            if (ahora.getHours() !== a.hora) return;
            if (Math.abs(ahora.getMinutes() - a.minuto) > 2) return;

            // Evita doble envío el mismo día.
            if (a.ultimoEnvioEn) {
                const ult = new Date(a.ultimoEnvioEn);
                if (ult.toDateString() === ahora.toDateString()) return;
            }

            await enviarInforme({
                tipoReporte: a.tipoReporte,
                formatos: a.formatos,
                destinatarios: a.destinatarios,
                usuario: 'automático',
                loadGeneralConfig,
                sendEmail
            });
            console.log('[reporteria-kpi] Informe semanal enviado a', a.destinatarios.join(', '));
        } catch (error) {
            console.error('[reporteria-kpi] Falló el envío automático:', error.message);
        } finally {
            ocupado = false;
        }
    };
    const timer = setInterval(tick, intervalMs);
    if (timer.unref) timer.unref();
    return timer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rutas HTTP
// ─────────────────────────────────────────────────────────────────────────────
function registerReporteriaKpiRoutes(app, { loadGeneralConfig, sendEmail }) {
    const actor = (req) => {
        try {
            const s = JSON.parse(req.headers['x-erp-session'] || '{}');
            return s.username || s.fullName || 'sistema';
        } catch (error) {
            return 'sistema';
        }
    };

    app.get('/api/reporterias/kpis-flexo', async (req, res) => {
        try {
            const semanas = Math.min(52, Math.max(4, Number(req.query.semanas) || 12));
            res.json(await construirTablero({ semanas, semanaInicio: req.query.semanaInicio || null }));
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el tablero.' });
        }
    });

    app.post('/api/reporterias/kpis-flexo/recalcular', async (req, res) => {
        try {
            const semana = req.body && req.body.semanaInicio;
            if (semana) await recalcularSemana(semana, { forzar: Boolean(req.body.forzar) });
            else for (const s of listarSemanas(12)) await recalcularSemana(s.inicio);
            res.json(await construirTablero({ semanas: 12 }));
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // Solo la nota de la reunión es editable; los indicadores vienen del sistema.
    app.patch('/api/reporterias/kpis-flexo/semana/:inicio', async (req, res) => {
        try {
            const fila = await guardarNotaSemana(req.params.inicio, req.body && req.body.notas);
            res.json({ ok: true, semana: fila });
        } catch (error) {
            res.status(error.status || 400).json({ ok: false, error: error.message });
        }
    });

    app.post('/api/reporterias/kpis-flexo/semana/:inicio/cerrar', async (req, res) => {
        try {
            const fila = await cerrarSemana(req.params.inicio, actor(req), { preliminar: Boolean(req.body && req.body.preliminar) });
            res.json({ ok: true, semana: fila });
        } catch (error) {
            res.status(error.status || 400).json({ ok: false, error: error.message });
        }
    });

    // Nota: no hay endpoint para agregar/quitar causas. La bitácora de paros y
    // mermas viene siempre de producción y no se puede alterar desde el reporte.

    app.put('/api/reporterias/kpis-flexo/metas', async (req, res) => {
        try {
            res.json({ ok: true, config: await guardarMetas(req.body || {}) });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    });

    app.put('/api/reporterias/kpis-flexo/automatizacion', async (req, res) => {
        try {
            res.json({ ok: true, config: await guardarAutomatizacion(req.body || {}) });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    });

    // Vista previa del correo ejecutivo (se abre en una pestaña antes de activar el envío).
    app.get('/api/reporterias/kpis-flexo/correo-preview', async (req, res) => {
        try {
            const cfgGeneral = loadGeneralConfig ? await loadGeneralConfig() : {};
            const empresa = (cfgGeneral.branding && cfgGeneral.branding.companyName) || 'PrintLab';
            const logoDataUri = (cfgGeneral.branding && cfgGeneral.branding.logoUrl) || '';
            const tablero = await construirTablero({ semanas: 12, semanaInicio: req.query.semanaInicio || null });
            let semanaFila = tablero.actual;
            if (req.query.semanaInicio) semanaFila = await recalcularSemana(req.query.semanaInicio);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(cuerpoCorreoHtml({ semanaFila, tablero, empresa, logoDataUri }));
        } catch (error) {
            res.status(500).send('No fue posible generar la vista previa: ' + error.message);
        }
    });

    app.post('/api/reporterias/kpis-flexo/enviar', async (req, res) => {
        try {
            const r = await enviarInforme({
                tipoReporte: (req.body && req.body.tipoReporte) || 'ultima_cerrada',
                formatos: req.body && req.body.formatos,
                destinatarios: req.body && req.body.destinatarios,
                semanaInicio: req.body && req.body.semanaInicio,
                usuario: actor(req),
                loadGeneralConfig,
                sendEmail
            });
            res.json(r);
        } catch (error) {
            res.status(error.status || 500).json({ ok: false, error: error.message });
        }
    });

    // Descarga directa (para el botón "Descargar" del tablero).
    app.get('/api/reporterias/kpis-flexo/descargar.:formato', async (req, res) => {
        try {
            const formato = req.params.formato === 'xlsx' ? 'excel' : req.params.formato;
            const cfgGeneral = loadGeneralConfig ? await loadGeneralConfig() : {};
            const empresa = (cfgGeneral.branding && cfgGeneral.branding.companyName) || 'PrintLab';
            const logoDataUri = (cfgGeneral.branding && cfgGeneral.branding.logoUrl) || '';
            const tablero = await construirTablero({ semanas: 12, semanaInicio: req.query.semanaInicio || null });
            let semanaFila = tablero.actual;
            if (req.query.semanaInicio) semanaFila = await recalcularSemana(req.query.semanaInicio);

            if (formato === 'pdf') {
                const buf = await generarPdf({ semanaFila, tablero, empresa, logoDataUri });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="Informe_KPIs_Flexo.pdf"');
                return res.send(buf);
            }
            if (formato === 'excel') {
                const buf = await generarExcel({ semanaFila, tablero });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="KPIs_Flexo.xlsx"');
                return res.send(buf);
            }
            res.status(400).json({ ok: false, error: 'Formato no soportado.' });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });
}

module.exports = {
    ensureReporteriaKpiSchema,
    registerReporteriaKpiRoutes,
    startReporteriaKpiWorker,
    // exportados por si se necesitan en pruebas
    construirTablero,
    recalcularSemana,
    enviarInforme
};
