-- Reportería Gerencial · Tablero de KPIs Semanal (División Flexo)
-- Espeja el archivo Excel "KPIs_Flexo_Mayaprin": Registro Semanal, Causas de
-- Paro y Merma, Pareto y Dashboard. Los insumos se autollenan desde lo que ya
-- captura producción (flexo_orders _vigente, orden_proceso, calidad_incidencias);
-- las casillas quedan editables antes de "cerrar" la semana.
--
-- El servidor también crea estas tablas al arrancar (ensure schema autocurativo).
-- Este archivo es para correrla a mano en despliegues del cliente:
--   $env:PGPASSWORD = "..."; psql -U postgres -d printlab -h localhost -f sql/migration-reporteria-kpi-gerencial.sql

BEGIN;

CREATE TABLE IF NOT EXISTS reporteria_kpi_semana (
    id                          BIGSERIAL PRIMARY KEY,
    semana_inicio               DATE NOT NULL UNIQUE,   -- lunes ISO
    semana_fin                  DATE NOT NULL,          -- domingo

    -- Insumos crudos (autollenados; editables mientras la semana no esté cerrada)
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

    -- Indicadores calculados (se congelan al cerrar)
    disponibilidad_pct          NUMERIC(8,5),
    rendimiento_pct             NUMERIC(8,5),
    calidad_pct                 NUMERIC(8,5),
    oee_pct                     NUMERIC(8,5),
    minutos_por_cambio          NUMERIC(10,2),
    merma_total_pct             NUMERIC(8,5),
    otif_pct                    NUMERIC(8,5),
    ppm_reclamos                NUMERIC(14,2),
    reproceso_pct               NUMERIC(8,5),

    -- Qué campos fueron editados a mano (para no pisarlos al recalcular)
    campos_manuales             JSONB NOT NULL DEFAULT '{}'::jsonb,

    cerrada                     BOOLEAN NOT NULL DEFAULT false,
    cerrada_por                 TEXT,
    cerrada_en                  TIMESTAMPTZ,
    preliminar                  BOOLEAN NOT NULL DEFAULT false,
    notas                       TEXT,

    calculada_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bitácora de causas: eventos agregados a mano que complementan los paros/merma
-- que ya llegan de producción.
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
);
CREATE INDEX IF NOT EXISTS idx_reporteria_kpi_evento_fecha ON reporteria_kpi_evento(fecha);

-- Configuración única: metas del dashboard + automatización del envío por correo.
CREATE TABLE IF NOT EXISTS reporteria_kpi_config (
    id                     INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    metas                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    envio_automatico_activo BOOLEAN NOT NULL DEFAULT false,
    envio_dia_semana       INTEGER NOT NULL DEFAULT 1,   -- 1=lunes .. 7=domingo (ISO)
    envio_hora             INTEGER NOT NULL DEFAULT 7,
    envio_minuto           INTEGER NOT NULL DEFAULT 0,
    envio_tipo_reporte     TEXT NOT NULL DEFAULT 'ultima_cerrada'
                           CHECK (envio_tipo_reporte IN ('ultima_cerrada','cerrar_actual','actual_preliminar')),
    envio_formatos         TEXT[] NOT NULL DEFAULT ARRAY['pdf','excel']::TEXT[],
    envio_destinatarios    TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ultimo_envio_en        TIMESTAMPTZ,
    ultima_semana_enviada  DATE,
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO reporteria_kpi_config (id, metas)
VALUES (1, '{
    "oee_pct": 0.65,
    "disponibilidad_pct": 0.85,
    "rendimiento_pct": 0.85,
    "calidad_pct": 0.97,
    "minutos_por_cambio": 45,
    "merma_total_pct": 0.05,
    "otif_pct": 0.95,
    "ppm_reclamos": 3000,
    "reproceso_pct": 0.03
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMIT;
