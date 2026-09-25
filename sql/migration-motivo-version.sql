-- ============================================================================
-- PRINTLAB ERP - Migración: Motivo → Versión en el cálculo flexográfico
-- ============================================================================
-- Da identidad tipada y estable a "Motivo" (hoy solo vive como JSON en
-- flexo_calculations.raw_data->'TIPOS DETALLE' / types_detail / ui_state) y
-- agrega "Versión" como sub-entidad real de un motivo (variante de arte que
-- conserva la configuración productiva del motivo: tintas, blanca, pantones).
--
-- Direccionamiento: se reutiliza la misma clave natural que ya usa
-- flexo_products.motivo_indice (quote_code, line_code, motivo_indice) en vez
-- de inventar una convención nueva.
--
-- Aditivo, no destructivo. No reemplaza raw_data/types_detail todavía
-- (transición con escritura dual); ver migration-motivo-version-backfill.sql
-- para poblar estas tablas desde los datos existentes.
-- ============================================================================

-- ============================================================================
-- 1. calculo_motivos: identidad y configuración productiva del motivo
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculo_motivos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code        TEXT NOT NULL,
    line_code         TEXT NOT NULL,
    motivo_indice     INTEGER NOT NULL,
    nombre            TEXT,
    cantidad          NUMERIC(14,4),
    cantidad_tintas   NUMERIC(8,4),
    tinta_blanca      BOOLEAN DEFAULT false,
    doble_blanca      BOOLEAN DEFAULT false,
    cantidad_pantones NUMERIC(8,4),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_calculo_motivos UNIQUE (quote_code, line_code, motivo_indice)
);

CREATE INDEX IF NOT EXISTS idx_calculo_motivos_calculo
    ON calculo_motivos(quote_code, line_code);

-- ============================================================================
-- 2. calculo_versiones: variante de arte dentro de un motivo
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculo_versiones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code     TEXT NOT NULL,
    line_code      TEXT NOT NULL,
    motivo_indice  INTEGER NOT NULL,
    version_indice INTEGER NOT NULL,
    nombre         TEXT,
    descripcion    TEXT,
    cantidad       NUMERIC(14,4),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_calculo_versiones UNIQUE (quote_code, line_code, motivo_indice, version_indice),
    CONSTRAINT fk_calculo_versiones_motivo
        FOREIGN KEY (quote_code, line_code, motivo_indice)
        REFERENCES calculo_motivos(quote_code, line_code, motivo_indice)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calculo_versiones_motivo
    ON calculo_versiones(quote_code, line_code, motivo_indice);

-- ============================================================================
-- 3. calculo_motivo_tintas: estaciones de tinta del motivo (config productiva)
--    Reemplaza el inkStations[] libre en JSON con datos comparables por el
--    motor de cambios. Pantone se vincula al catálogo existente
--    tintas.pantones_biblioteca en vez de texto libre.
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculo_motivo_tintas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code      TEXT NOT NULL,
    line_code       TEXT NOT NULL,
    motivo_indice   INTEGER NOT NULL,
    estacion_indice INTEGER NOT NULL,
    tipo_tinta      TEXT NOT NULL CHECK (tipo_tinta IN ('cmyk', 'blanco', 'pantone')),
    etiqueta        TEXT,
    pantone_id      UUID REFERENCES tintas.pantones_biblioteca(id),
    cobertura_pct   NUMERIC(8,4),
    activo          BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_calculo_motivo_tintas UNIQUE (quote_code, line_code, motivo_indice, estacion_indice),
    CONSTRAINT fk_calculo_motivo_tintas_motivo
        FOREIGN KEY (quote_code, line_code, motivo_indice)
        REFERENCES calculo_motivos(quote_code, line_code, motivo_indice)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calculo_motivo_tintas_motivo
    ON calculo_motivo_tintas(quote_code, line_code, motivo_indice);
CREATE INDEX IF NOT EXISTS idx_calculo_motivo_tintas_pantone
    ON calculo_motivo_tintas(pantone_id);

-- ============================================================================
-- 4. flexo_products: dimensión de versión (junto a motivo_indice/motivo_nombre
--    que ya existen desde migration-motivo-producto.sql)
-- ============================================================================
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS version_indice INTEGER;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS version_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_products_version
    ON flexo_products(quote_code, line_code, motivo_indice, version_indice);

-- ============================================================================
-- 5. flexo_orders: alinear con flexo_products (brecha existente antes de esta
--    migración — flexo_orders no tenía ninguna columna de motivo/versión, lo
--    que rompía la trazabilidad Cálculo → Motivo → Versión al generar la
--    orden de producción).
-- ============================================================================
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS motivo_indice INTEGER;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS motivo_nombre TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS version_indice INTEGER;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS version_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_orders_motivo_version
    ON flexo_orders(quote_code, line_code, motivo_indice, version_indice);
