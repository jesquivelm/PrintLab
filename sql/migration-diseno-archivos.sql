-- ============================================================================
-- MIGRACIÓN: Archivos Técnicos del Panel de Diseño (Fase 2)
-- ----------------------------------------------------------------------------
-- Los archivos NO se guardan en la base de datos. Viven en el sistema de
-- archivos del proyecto (carpeta configurable en Configuración → Seguridad →
-- Rutas de Archivos; por defecto storage/diseno-archivos/<orden>/). Esta tabla
-- es solo el ÍNDICE liviano: metadatos + ruta relativa a la carpeta base.
--
-- Idempotente.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-diseno-archivos.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS diseno_archivos (
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

CREATE INDEX IF NOT EXISTS idx_diseno_archivos_orden
    ON diseno_archivos(orden_codigo, motivo_indice, version_indice);

ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS diseno_aprobado_por TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS diseno_aprobado_en TIMESTAMPTZ;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS diseno_borrador_guardado_en TIMESTAMPTZ;
