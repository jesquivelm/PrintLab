-- ============================================================================
-- PRINTLAB ERP - Migración: Códigos de Producto Terminado (SKU + Versión)
-- ============================================================================
-- 1. Tabla de departamentos (Offset, Flexografía, Digital, etc.)
-- 2. Tabla de tipos de producto por departamento
-- 3. Secuencias para correlativos de SKU
-- 4. Columna finished_product_sku en flexo_products, flexo_orders, flexo_calculations
-- 5. Secuencias para lotes/versiones por día
-- ============================================================================

-- ============================================================================
-- 1. DEPARTAMENTOS DE PRODUCTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_departments (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales: los 3 departamentos base
INSERT INTO product_departments (code, name, sort_order) VALUES
    ('10', 'Offset', 1),
    ('11', 'Flexografía', 2),
    ('12', 'Digital', 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- ============================================================================
-- 2. TIPOS DE PRODUCTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES product_departments(id),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, department_id)
);

CREATE INDEX IF NOT EXISTS idx_product_types_department ON product_types(department_id);

-- Poblar tipos de producto para Flexografía (departamento code='11')
-- Obtenemos el id del departamento Flexografía de forma dinámica
DO $$
DECLARE
    flexo_id INTEGER;
    offset_id INTEGER;
    digital_id INTEGER;
BEGIN
    SELECT id INTO flexo_id FROM product_departments WHERE code = '11';
    SELECT id INTO offset_id FROM product_departments WHERE code = '10';
    SELECT id INTO digital_id FROM product_departments WHERE code = '12';

    -- Tipos para Flexografía
    INSERT INTO product_types (code, name, department_id, sort_order) VALUES
        ('01', 'ADHESIVO', flexo_id, 1),
        ('02', 'AFICHE', flexo_id, 2),
        ('03', 'BLOCK', flexo_id, 3),
        ('04', 'CAJA', flexo_id, 4),
        ('05', 'CAJESP', flexo_id, 5),
        ('06', 'CAL', flexo_id, 6),
        ('07', 'CARPETA', flexo_id, 7),
        ('08', 'COSIDO', flexo_id, 8),
        ('09', 'CUADERNOS', flexo_id, 9),
        ('10', 'DES', flexo_id, 10),
        ('11', 'ENGRAPADO', flexo_id, 11),
        ('12', 'ESPECIALES', flexo_id, 12),
        ('13', 'ETIQUETA', flexo_id, 13),
        ('14', 'FOLIARES', flexo_id, 14),
        ('15', 'INV', flexo_id, 15),
        ('16', 'MANTELITO', flexo_id, 16),
        ('17', 'MAT POP', flexo_id, 17),
        ('18', 'MENU', flexo_id, 18),
        ('19', 'PEGADO', flexo_id, 19),
        ('20', 'SUB', flexo_id, 20),
        ('21', 'TAR PRE', flexo_id, 21),
        ('22', 'VOLANTE', flexo_id, 22)
    ON CONFLICT (code, department_id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW();

    -- Tipos para Offset
    INSERT INTO product_types (code, name, department_id, sort_order) VALUES
        ('01', 'ADHESIVO', offset_id, 1),
        ('02', 'AFICHE', offset_id, 2),
        ('03', 'BLOCK', offset_id, 3),
        ('04', 'CAJA', offset_id, 4),
        ('05', 'CATALOGO', offset_id, 5),
        ('06', 'FOLLETO', offset_id, 6),
        ('07', 'REVISTA', offset_id, 7),
        ('08', 'TARJETA', offset_id, 8),
        ('09', 'VOLANTE', offset_id, 9)
    ON CONFLICT (code, department_id) DO NOTHING;

    -- Tipos para Digital
    INSERT INTO product_types (code, name, department_id, sort_order) VALUES
        ('01', 'ETIQUETA', digital_id, 1),
        ('02', 'AFICHE', digital_id, 2),
        ('03', 'TARJETA', digital_id, 3),
        ('04', 'VOLANTE', digital_id, 4),
        ('05', 'FOLLETO', digital_id, 5)
    ON CONFLICT (code, department_id) DO NOTHING;
END $$;

-- ============================================================================
-- 3. COLUMNA finished_product_sku EN TABLAS EXISTENTES
-- ============================================================================
ALTER TABLE flexo_products
    ADD COLUMN IF NOT EXISTS finished_product_sku TEXT;

ALTER TABLE flexo_orders
    ADD COLUMN IF NOT EXISTS finished_product_sku TEXT;

ALTER TABLE flexo_calculations
    ADD COLUMN IF NOT EXISTS finished_product_sku TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_products_sku ON flexo_products(finished_product_sku);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_sku ON flexo_orders(finished_product_sku);
CREATE INDEX IF NOT EXISTS idx_flexo_calculations_sku ON flexo_calculations(finished_product_sku);

-- ============================================================================
-- 4. SECUENCIAS PARA CORRELATIVOS DE SKU
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_sku_sequences (
    id SERIAL PRIMARY KEY,
    client_code TEXT NOT NULL,
    department_code TEXT NOT NULL,
    type_code TEXT NOT NULL,
    last_correlative INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_code, department_code, type_code)
);

-- ============================================================================
-- 5. SECUENCIAS PARA VERSIONES / LOTES POR DÍA
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_lot_sequences (
    id SERIAL PRIMARY KEY,
    date_code TEXT NOT NULL UNIQUE,
    last_correlative INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

