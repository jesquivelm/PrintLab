-- Migración: Tipos de Trabajo
-- Crea tabla tipotrabajo y agrega columna tipo_trabajo a flexo_orders y flexo_calculations

BEGIN;

-- 1. Crear tabla tipotrabajo
CREATE TABLE IF NOT EXISTS tipotrabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    codigo VARCHAR(60) NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (tenant_id, codigo)
);

-- 2. Agregar columna tipo_trabajo a flexo_calculations
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tipo_trabajo TEXT;

-- 3. Agregar columna tipo_trabajo a flexo_orders
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tipo_trabajo TEXT;

-- 4. Agregar columna tipo_trabajo a flexo_products
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tipo_trabajo TEXT;

COMMIT;
