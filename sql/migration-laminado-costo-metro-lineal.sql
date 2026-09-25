-- Laminado: el costo del acabado pasa de calcularse "por pie lineal" a "por metro lineal".
-- Renombra las columnas y convierte los valores ya guardados ($/pie -> $/m, dividiendo entre 0.3048)
-- para que representen el mismo precio real, ahora expresado por metro.

ALTER TABLE costo_acabado_laminado RENAME COLUMN costo_por_pie_lineal TO costo_por_metro_lineal;
UPDATE costo_acabado_laminado
   SET costo_por_metro_lineal = costo_por_metro_lineal / 0.3048
 WHERE costo_por_metro_lineal IS NOT NULL;

ALTER TABLE flexo_calculations RENAME COLUMN laminado_costo_por_pie_lineal TO laminado_costo_por_metro_lineal;
UPDATE flexo_calculations
   SET laminado_costo_por_metro_lineal = laminado_costo_por_metro_lineal / 0.3048
 WHERE laminado_costo_por_metro_lineal IS NOT NULL;

ALTER TABLE flexo_orders RENAME COLUMN laminado_costo_por_pie_lineal TO laminado_costo_por_metro_lineal;
UPDATE flexo_orders
   SET laminado_costo_por_metro_lineal = laminado_costo_por_metro_lineal / 0.3048
 WHERE laminado_costo_por_metro_lineal IS NOT NULL;

ALTER TABLE flexo_products RENAME COLUMN laminado_costo_por_pie_lineal TO laminado_costo_por_metro_lineal;
UPDATE flexo_products
   SET laminado_costo_por_metro_lineal = laminado_costo_por_metro_lineal / 0.3048
 WHERE laminado_costo_por_metro_lineal IS NOT NULL;
