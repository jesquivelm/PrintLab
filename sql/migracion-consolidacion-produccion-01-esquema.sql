-- ═══════════════════════════════════════════════════════════════════════════
-- Consolidación Producción / Planificación — Paso 1: esquema nuevo (ADITIVO)
-- ═══════════════════════════════════════════════════════════════════════════
-- NO renombra ni elimina nada existente. Las tablas actuales
-- (production_order_routes, order_tracking_marks, raw_data.planning_control,
--  resource_calendars, costos_turnos...) siguen intactas y funcionando.
-- El corte al modelo nuevo ocurre en pasos posteriores.
--
-- Requiere: tablas flexo_orders, production_machine_profiles.
-- Probar primero en la base local `printlab`.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. orden_proceso
--    Fuente única del estado y de las fechas por proceso de una orden.
--    Sustituye el rol de production_order_routes (estado + fechas).
--    - fecha_compromiso_*  → meta calculada HACIA ATRÁS desde la entrega
--    - fecha_plan_*         → proyección del motor de capacidad (HACIA ADELANTE)
--    - fecha_real_*         → captura de piso / MES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orden_proceso (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden              TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    codigo_cotizacion         TEXT,
    codigo_linea              TEXT,
    secuencia                 INTEGER NOT NULL DEFAULT 1,
    clave_proceso             TEXT NOT NULL,
    nombre_proceso            TEXT NOT NULL,
    perfil_maquina_id         UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
    depende_de_id             UUID REFERENCES orden_proceso(id) ON DELETE SET NULL,
    estado                    TEXT NOT NULL DEFAULT 'PENDIENTE'
                              CHECK (estado IN ('PENDIENTE','PREPARACION','EN_MARCHA','EN_PARO','COMPLETADO')),
    duracion_horas            NUMERIC(10,4) NOT NULL DEFAULT 0,
    transicion_min            INTEGER NOT NULL DEFAULT 0,
    fecha_compromiso_inicio   TIMESTAMPTZ,
    fecha_compromiso_fin      TIMESTAMPTZ,
    fecha_plan_inicio         TIMESTAMPTZ,
    fecha_plan_fin            TIMESTAMPTZ,
    fecha_real_inicio         TIMESTAMPTZ,
    fecha_real_fin            TIMESTAMPTZ,
    bloqueo_manual            BOOLEAN NOT NULL DEFAULT false,
    origen                    TEXT NOT NULL DEFAULT 'auto',
    color_hex                 TEXT,
    datos_extra               JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (codigo_orden, secuencia)
);

CREATE INDEX IF NOT EXISTS idx_orden_proceso_orden  ON orden_proceso(codigo_orden, secuencia);
CREATE INDEX IF NOT EXISTS idx_orden_proceso_estado ON orden_proceso(estado, clave_proceso, perfil_maquina_id);
CREATE INDEX IF NOT EXISTS idx_orden_proceso_dep    ON orden_proceso(depende_de_id);


-- ─────────────────────────────────────────────────────────────────────────
-- 2. orden_planificacion
--    1:1 con la orden. Reemplaza raw_data.planning_control (JSON) por
--    columnas tipadas.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orden_planificacion (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden                    TEXT NOT NULL UNIQUE REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    estado_planificacion            TEXT NOT NULL DEFAULT 'PENDIENTE_VENTAS'
                                    CHECK (estado_planificacion IN (
                                        'PENDIENTE_VENTAS','PENDIENTE_PLANIFICACION','EN_GANTT',
                                        'DEVUELTA_VENTAS','EN_PRODUCCION','COMPLETADA')),
    liberado_ventas                 BOOLEAN NOT NULL DEFAULT false,
    liberado_ventas_en              TIMESTAMPTZ,
    liberado_ventas_por             TEXT,
    lanzado_gantt                   BOOLEAN NOT NULL DEFAULT false,
    lanzado_gantt_en                TIMESTAMPTZ,
    lanzado_gantt_por               TEXT,
    devuelto_en                     TIMESTAMPTZ,
    devuelto_por                    TEXT,
    motivo_devolucion               TEXT,
    fecha_entrega_prometida         DATE,
    fecha_entrega_programada        DATE,
    dias_buffer_entrega             INTEGER NOT NULL DEFAULT 0,
    fecha_fin_produccion_proyectada TIMESTAMPTZ,
    alerta_atraso                   BOOLEAN NOT NULL DEFAULT false,
    procesos_seleccionados          TEXT[] NOT NULL DEFAULT '{}',
    seleccion_procesos_en           TIMESTAMPTZ,
    seleccion_procesos_por          TEXT,
    fecha_entrega_estimada_min      DATE,
    fecha_entrega_estimada_max      DATE,
    estimacion_confianza            TEXT,
    estimado_en                     TIMESTAMPTZ,
    estimado_por                    TEXT,
    prioridad                       TEXT NOT NULL DEFAULT 'normal',
    creado_en                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. dias_feriados
--    Calendario nacional (Guatemala). El scheduler resta estos días a TODOS
--    los recursos antes de aplicar los turnos de cada calendario y sus
--    excepciones locales (mantenimiento, cierre puntual de una máquina).
--
--    recurrente = true  → fecha fija; el scheduler la expande cada año por (mes, día).
--    recurrente = false → fecha de ese año únicamente (p.ej. Semana Santa).
--
--    Los días que se trabajan o no dentro de un mes (sábados, domingos según
--    carga) NO viven aquí: se definen en los turnos del calendario de cada
--    recurso, que el planificador ajusta por período. Esta tabla es solo el
--    calendario nacional de cierres.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dias_feriados (
    id            SERIAL PRIMARY KEY,
    fecha         DATE NOT NULL,
    nombre        TEXT NOT NULL,
    recurrente    BOOLEAN NOT NULL DEFAULT false,
    activo        BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fecha)
);

-- Semilla — feriados de planta (Guatemala, Ciudad de Guatemala).
-- El año 2026 es solo el ancla de las fechas recurrentes; todas son cierre
-- de día completo.
INSERT INTO dias_feriados (fecha, nombre, recurrente) VALUES
    ('2026-01-01', 'Año Nuevo',                                true),
    ('2026-05-01', 'Día del Trabajo',                          true),
    ('2026-05-10', 'Día de la Madre',                          true),
    ('2026-06-30', 'Día del Ejército',                         true),
    ('2026-08-15', 'Día de la Asunción (Ciudad de Guatemala)', true),
    ('2026-09-15', 'Día de la Independencia',                  true),
    ('2026-10-20', 'Día de la Revolución de 1944',             true),
    ('2026-11-01', 'Día de Todos los Santos',                  true),
    ('2026-12-24', 'Nochebuena',                               true),
    ('2026-12-25', 'Navidad',                                  true),
    ('2026-12-31', 'Fin de Año',                               true)
ON CONFLICT (fecha) DO NOTHING;

-- Semana Santa NO es de fecha fija — se carga por año desde Configuración.
-- La planta cierra jueves y viernes santo. Ejemplo 2026:
INSERT INTO dias_feriados (fecha, nombre, recurrente) VALUES
    ('2026-04-02', 'Jueves Santo',  false),
    ('2026-04-03', 'Viernes Santo', false)
ON CONFLICT (fecha) DO NOTHING;

COMMIT;
