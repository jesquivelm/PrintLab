-- ============================================================================
-- MIGRACIÓN: Panel de Tintas (mismo formato que el Panel de Diseño)
-- ----------------------------------------------------------------------------
-- Aprobación propia de Tintas (independiente de la de Diseño) + archivos
-- técnicos propios de Tintas (mismo patrón que diseno_archivos: índice en BD,
-- archivo en disco).
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-tintas-panel.sql
-- ============================================================================

ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tintas_aprobado_por TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tintas_aprobado_en TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS tintas_archivos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_codigo        TEXT NOT NULL,
    motivo_indice       INTEGER,
    version_indice      INTEGER,
    nombre_archivo      TEXT NOT NULL,
    tipo                TEXT,
    categoria           TEXT,
    estado              TEXT NOT NULL DEFAULT 'referencia',
    ruta_almacenamiento TEXT NOT NULL,
    tamano_bytes        BIGINT NOT NULL DEFAULT 0,
    sha256              TEXT,
    creado_por          TEXT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aprobado_por        TEXT,
    aprobado_en         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tintas_archivos_orden
    ON tintas_archivos(orden_codigo, motivo_indice, version_indice);
