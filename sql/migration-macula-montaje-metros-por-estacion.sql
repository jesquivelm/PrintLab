-- Migración: tabla de merma de montaje a metros por estación.
-- 1) Convierte por_estacion de pies a metros (pies * 0.3048).
-- 2) Elimina las columnas cantidad_tintas y total_metros (total_pies ya fue renombrado a
--    total_metros por migration-merma-ajuste-metros.sql). El cálculo de tintas ya no vive en la
--    tabla: la cantidad de tintas sale de los motivos reales del trabajo.

-- Ejecutar respaldando antes la tabla:
--   pg_dump -U postgres -d printlab -h localhost -t costo_macula_montaje > backup.sql

ALTER TABLE costo_macula_montaje RENAME COLUMN por_estacion TO por_estacion_pies;
ALTER TABLE costo_macula_montaje ADD COLUMN por_estacion NUMERIC(10,4) NOT NULL DEFAULT 0;
UPDATE costo_macula_montaje SET por_estacion = ROUND(por_estacion_pies * 0.3048, 4);
ALTER TABLE costo_macula_montaje DROP COLUMN por_estacion_pies;
ALTER TABLE costo_macula_montaje DROP COLUMN IF EXISTS cantidad_tintas;
ALTER TABLE costo_macula_montaje DROP COLUMN IF EXISTS total_metros;
ALTER TABLE costo_macula_montaje DROP COLUMN IF EXISTS total_pies;
