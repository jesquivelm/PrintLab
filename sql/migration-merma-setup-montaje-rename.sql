-- Corrige la inversión de nombres en los campos de merma de sustrato de la máquina.
--
-- Terminología correcta (flexografía industrial):
--   Montaje = armar físicamente cada estación (anilox + cilindro + tinta + sustrato).
--             Pérdida de sustrato por estación.
--   Setup   = dejar la máquina completa lista para producir (registro, color, tensión,
--             secado, pruebas). Pérdida de sustrato una sola vez por trabajo.
--
-- Antes de esta migración las columnas estaban al revés:
--   sustrato_setup_merma_*   alimentaba la merma POR ESTACIÓN  (era montaje)
--   sustrato_montaje_merma_* alimentaba la merma por cambio     (era setup/cambio)
--
-- Esta migración INTERCAMBIA los nombres de las columnas (los valores quedan en su
-- lugar). En todas las máquinas actuales setup == montaje, así que ningún cálculo,
-- orden ni producto cambia de número por este intercambio.

BEGIN;

ALTER TABLE maquina RENAME COLUMN sustrato_setup_merma_cantidad   TO sustrato_tmp_merma_cantidad;
ALTER TABLE maquina RENAME COLUMN sustrato_montaje_merma_cantidad TO sustrato_setup_merma_cantidad;
ALTER TABLE maquina RENAME COLUMN sustrato_tmp_merma_cantidad     TO sustrato_montaje_merma_cantidad;

ALTER TABLE maquina RENAME COLUMN sustrato_setup_merma_unidad   TO sustrato_tmp_merma_unidad;
ALTER TABLE maquina RENAME COLUMN sustrato_montaje_merma_unidad TO sustrato_setup_merma_unidad;
ALTER TABLE maquina RENAME COLUMN sustrato_tmp_merma_unidad     TO sustrato_montaje_merma_unidad;

ALTER TABLE maquina RENAME COLUMN sustrato_setup_merma_base   TO sustrato_tmp_merma_base;
ALTER TABLE maquina RENAME COLUMN sustrato_montaje_merma_base TO sustrato_setup_merma_base;
ALTER TABLE maquina RENAME COLUMN sustrato_tmp_merma_base     TO sustrato_montaje_merma_base;

COMMIT;
