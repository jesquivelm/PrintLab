-- Migración: Tipo de Core con espesor y precio
-- Cambia opciones_diametro_core de TEXT[] a JSONB con {diametro, espesor, precio}
-- Elimina costo_core de costo_general, flexo_calculations, flexo_products, flexo_orders
-- Agrega tipo_core (JSONB) a flexo_calculations, flexo_products, flexo_orders

BEGIN;

-- 1. Migrar opciones_diametro_core de TEXT[] a JSONB (usando columna temporal)
ALTER TABLE costo_general ADD COLUMN opciones_diametro_core_tmp JSONB;

UPDATE costo_general SET opciones_diametro_core_tmp = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('diametro', v, 'espesor', 0, 'precio', 0)
    ),
    '[{"diametro":"1","espesor":0,"precio":0},{"diametro":"1.5","espesor":0,"precio":0},{"diametro":"3","espesor":0,"precio":0},{"diametro":"6","espesor":0,"precio":0}]'::jsonb
  ) FROM unnest(opciones_diametro_core) AS v
);

ALTER TABLE costo_general DROP COLUMN opciones_diametro_core;
ALTER TABLE costo_general RENAME COLUMN opciones_diametro_core_tmp TO opciones_diametro_core;

-- 2. Eliminar costo_core de costo_general
ALTER TABLE costo_general DROP COLUMN IF EXISTS costo_core;

-- 3. Agregar tipo_core a las tres tablas
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tipo_core JSONB;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tipo_core JSONB;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tipo_core JSONB;

-- 4. Eliminar costo_core de las tres tablas
ALTER TABLE flexo_calculations DROP COLUMN IF EXISTS costo_core;
ALTER TABLE flexo_products DROP COLUMN IF EXISTS costo_core;
ALTER TABLE flexo_orders DROP COLUMN IF EXISTS costo_core;

COMMIT;
