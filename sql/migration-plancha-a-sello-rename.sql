-- Renombra tabla/columnas/constraints de "plancha" a "sello" para alinear con la
-- nomenclatura real de planta, y actualiza los valores de catalogo/datos correspondientes.
-- Ejecutado 2026-09-05. Respaldo previo: E:\Github\Adicionales\backups\printlab.backup.rename-plancha-sello.20260905-000821.sql

BEGIN;

ALTER TABLE plancha RENAME TO sello;
ALTER TABLE sello RENAME CONSTRAINT plancha_pkey TO sello_pkey;
ALTER TABLE sello RENAME CONSTRAINT plancha_tenant_id_codigo_key TO sello_tenant_id_codigo_key;
ALTER TABLE sello RENAME CONSTRAINT plancha_tenant_id_fkey TO sello_tenant_id_fkey;
ALTER INDEX idx_plancha_tenant RENAME TO idx_sello_tenant;

ALTER TABLE costo_general RENAME COLUMN acabados_exceso_planchas_in TO acabados_exceso_sellos_in;
ALTER TABLE costo_general RENAME COLUMN convencional_costo_plancha_in2 TO convencional_costo_sello_in2;

ALTER TABLE flexo_orders RENAME COLUMN impresion_confirma_planchas_vigente TO impresion_confirma_sellos_vigente;
ALTER TABLE flexo_orders RENAME COLUMN impresion_planchas_estado_vigente TO impresion_sellos_estado_vigente;
ALTER TABLE flexo_orders RENAME COLUMN preprensa_num_planchas_vigente TO preprensa_num_sellos_vigente;
ALTER TABLE flexo_orders RENAME COLUMN preprensa_planchas_codigos_vigente TO preprensa_sellos_codigos_vigente;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est1_presion_anilox_plancha TO tinta_est1_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est2_presion_anilox_plancha TO tinta_est2_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est3_presion_anilox_plancha TO tinta_est3_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est4_presion_anilox_plancha TO tinta_est4_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est5_presion_anilox_plancha TO tinta_est5_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est6_presion_anilox_plancha TO tinta_est6_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est7_presion_anilox_plancha TO tinta_est7_presion_anilox_sello;
ALTER TABLE flexo_orders RENAME COLUMN tinta_est8_presion_anilox_plancha TO tinta_est8_presion_anilox_sello;

ALTER TABLE flexo_products RENAME COLUMN impresion_confirma_planchas_vigente TO impresion_confirma_sellos_vigente;
ALTER TABLE flexo_products RENAME COLUMN impresion_planchas_estado_vigente TO impresion_sellos_estado_vigente;
ALTER TABLE flexo_products RENAME COLUMN preprensa_num_planchas_vigente TO preprensa_num_sellos_vigente;
ALTER TABLE flexo_products RENAME COLUMN preprensa_planchas_codigos_vigente TO preprensa_sellos_codigos_vigente;
ALTER TABLE flexo_products RENAME COLUMN tinta_est1_presion_anilox_plancha TO tinta_est1_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est2_presion_anilox_plancha TO tinta_est2_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est3_presion_anilox_plancha TO tinta_est3_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est4_presion_anilox_plancha TO tinta_est4_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est5_presion_anilox_plancha TO tinta_est5_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est6_presion_anilox_plancha TO tinta_est6_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est7_presion_anilox_plancha TO tinta_est7_presion_anilox_sello;
ALTER TABLE flexo_products RENAME COLUMN tinta_est8_presion_anilox_plancha TO tinta_est8_presion_anilox_sello;

-- Catálogo de procesos y órdenes: el departamento/proceso "Planchas" pasa a "Sellos"
UPDATE proceso_catalogo SET codigo = 'SELLOS', nombre = 'Sellos', descripcion = 'Grabado o exposicion de sellos', proceso_productivo = 'sellos'
  WHERE codigo = 'PLANCHAS';

UPDATE orden_proceso SET clave_proceso = 'sellos', nombre_proceso = 'Sellos' WHERE clave_proceso = 'planchas';

COMMIT;
