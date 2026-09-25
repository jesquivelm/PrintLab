-- Migración: carga mínima de tinta por estación de máquina de impresión.
-- Configurable por máquina + número de estación, no un valor fijo en código. Idempotente.

CREATE TABLE IF NOT EXISTS maquina_estacion_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
    numero_estacion INTEGER NOT NULL,
    carga_minima_ml NUMERIC(10,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_maquina_estacion UNIQUE (maquina_id, numero_estacion),
    CONSTRAINT ck_numero_estacion_positivo CHECK (numero_estacion > 0)
);

CREATE INDEX IF NOT EXISTS idx_maquina_estacion_config_maquina ON maquina_estacion_config(maquina_id);
