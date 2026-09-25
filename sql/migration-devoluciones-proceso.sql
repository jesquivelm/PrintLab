-- ============================================================================
-- MIGRACIÓN: Devoluciones de proceso (Impresión ⇄ Tintas ⇄ Preprensa)
-- ----------------------------------------------------------------------------
-- El flujo real de producción no es una línea recta. Cuando la prensa recibe
-- un problema de tinta o de color, pausa la orden y "devuelve" el trabajo al
-- paso de atrás (Tintas). Tintas lo resuelve o lo pasa a Preprensa. Preprensa
-- resuelve y lo regresa a Tintas, y Tintas lo manda de vuelta a la prensa.
--
--   devolucion_proceso        una fila por devolución (el "ticket" que viaja).
--                             Guarda el ciclo completo, los tiempos y los
--                             costos del paro (tinta extra, tiempo de gente,
--                             máquina detenida).
--   devolucion_evento         una fila por salto / acción sobre el ticket
--                             (creada, recibida, aceptada, pasada atrás,
--                             resuelta, devuelta, reanudada...).
--   motivo_devolucion_config  por cada motivo de pausa de un proceso, a qué
--                             paso de atrás se manda por defecto y si cuenta
--                             como devolución (con ticket y costos) o es una
--                             pausa común.
--
-- La pausa en sí ya queda persistida por production_route_events (event_type
-- 'paro') + orden_proceso.estado = 'EN_PARO'. Aquí NO se crea tabla de pausa;
-- el reloj de la pausa se hidrata desde el último evento 'paro' abierto.
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-devoluciones-proceso.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. devolucion_proceso — el ticket de urgencia que viaja entre departamentos
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devolucion_proceso (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden              TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    codigo_cotizacion         TEXT,
    codigo_linea              TEXT,
    -- Proceso que levantó el problema y queda en pausa esperando (normalmente 'impresion').
    proceso_origen            TEXT NOT NULL,
    orden_proceso_origen_id   UUID REFERENCES orden_proceso(id) ON DELETE SET NULL,
    -- Evento 'paro' de production_route_events que disparó la devolución (ancla del reloj de espera).
    evento_paro_id            UUID,
    -- Clasificación elegida en la pausa.
    motivo                    TEXT NOT NULL,
    clasificacion             TEXT,
    comentario_inicial        TEXT,
    -- Estado del ticket y quién lo tiene en las manos ahora (clave de proceso).
    estado                    TEXT NOT NULL DEFAULT 'abierta'
                              CHECK (estado IN ('abierta','resuelta','cancelada')),
    -- 'tintas' | 'preprensa' | ... ; NULL = ya volvió al origen, la prensa puede reanudar.
    tenedor_actual            TEXT,
    -- Marcas de tiempo del ciclo completo.
    creado_por                TEXT,
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resuelto_por              TEXT,
    resuelto_en               TIMESTAMPTZ,
    reanudado_en              TIMESTAMPTZ,
    -- Costos del paro / devolución (moneda del sistema).
    horas_persona             NUMERIC(10,2)  NOT NULL DEFAULT 0,
    costo_tinta               NUMERIC(14,2)  NOT NULL DEFAULT 0,
    costo_tiempo_personal     NUMERIC(14,2)  NOT NULL DEFAULT 0,
    costo_maquina_detenida    NUMERIC(14,2)  NOT NULL DEFAULT 0,
    costo_total               NUMERIC(14,2)  NOT NULL DEFAULT 0,
    -- [{tinta, tipo, kg, costo_unitario, costo}] — se llena desde la calculadora de fórmulas de Tintas.
    tinta_detalle             JSONB NOT NULL DEFAULT '[]'::jsonb,
    segundos_espera_total     INTEGER NOT NULL DEFAULT 0,
    datos_extra               JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devolucion_proceso_orden   ON devolucion_proceso(codigo_orden, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_devolucion_proceso_tenedor ON devolucion_proceso(tenedor_actual, estado);
CREATE INDEX IF NOT EXISTS idx_devolucion_proceso_abierta ON devolucion_proceso(estado, proceso_origen);


-- ─────────────────────────────────────────────────────────────────────────
-- 2. devolucion_evento — cada salto / acción sobre el ticket
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devolucion_evento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucion_id   UUID NOT NULL REFERENCES devolucion_proceso(id) ON DELETE CASCADE,
    secuencia       INTEGER NOT NULL DEFAULT 1,
    accion          TEXT NOT NULL
                    CHECK (accion IN ('creada','recibida','aceptada','pasada_atras',
                                      'resuelta','devuelta','reanudada','reintento','cancelada')),
    proceso         TEXT,           -- quién ejecutó la acción (clave de proceso)
    por             TEXT,
    en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clasificacion   TEXT,
    comentario      TEXT,
    datos_extra     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_devolucion_evento_dev ON devolucion_evento(devolucion_id, secuencia);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. motivo_devolucion_config — motivo → paso de atrás
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motivo_devolucion_config (
    id              SERIAL PRIMARY KEY,
    proceso_origen  TEXT NOT NULL,   -- proceso donde se elige el motivo (p.ej. 'impresion')
    motivo          TEXT NOT NULL,
    destino         TEXT,            -- proceso de atrás al que se manda; NULL = pausa normal, no viaja
    es_devolucion   BOOLEAN NOT NULL DEFAULT true,
    activo          BOOLEAN NOT NULL DEFAULT true,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_por TEXT,
    UNIQUE (proceso_origen, motivo)
);

-- Semilla mínima: los dos motivos de Impresión que el usuario nombró explícitamente.
-- El resto se configura desde Configuración General.
INSERT INTO motivo_devolucion_config (proceso_origen, motivo, destino, es_devolucion) VALUES
    ('impresion', 'Cambio de tinta',     'tintas', true),
    ('impresion', 'Color fuera de tono', 'tintas', true)
ON CONFLICT (proceso_origen, motivo) DO NOTHING;

COMMIT;
