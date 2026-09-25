-- ============================================================================
-- MIGRACIÓN: Bloque A — Detalle de estaciones de máquina en los procesos
-- ----------------------------------------------------------------------------
-- Trae el formato de tarjetas de estación del "Detalle de Máquina" del cálculo a
-- las ventanas de Diseño, Preprensa y Tintas (además de Impresión, que ya lo
-- tiene). Para que la planta pueda registrar el valor REAL de cada estación y
-- que ese real se compare contra lo cotizado, se necesitan:
--
--   * production_station_configs.cilindro_code — el cilindro real elegido por
--     estación. La tarjeta ya tenía el selector de cilindro pero el guardado no
--     lo persistía (quedó a medias). Se completa.
--
--   * flexo_orders.cilindro_code_vigente / flexo_products.cilindro_code_vigente
--     — el cilindro real "así se está produciendo hoy", alineado con las demás
--     columnas *_vigente (anilox_code_vigente, viscosity_vigente, etc.).
--
--   * calculo_motivo_tintas.bcm_anilox / factor_transferencia / densidad_tinta
--     — el BCM del anilox, el factor de transferencia y la densidad de tinta
--     COTIZADOS por estación. Hoy solo se guarda cobertura_pct por estación; el
--     resto vivía únicamente en el ui_state del cálculo. Se persisten por
--     estación para que el sembrado de valores_produccion_motivo tenga un
--     cotizado por estación contra el cual comparar el real que carga la planta
--     (campos bcm_est{n} / factor_est{n} / densidad_est{n}).
--
-- Idempotente: se puede ejecutar varias veces.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-bloque-a-estaciones-detalle.sql
-- ============================================================================

ALTER TABLE production_station_configs ADD COLUMN IF NOT EXISTS cilindro_code TEXT;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS cilindro_code_vigente TEXT', tbl);
    END LOOP;
END $$;

ALTER TABLE calculo_motivo_tintas ADD COLUMN IF NOT EXISTS bcm_anilox NUMERIC(10,4);
ALTER TABLE calculo_motivo_tintas ADD COLUMN IF NOT EXISTS factor_transferencia NUMERIC(10,4);
ALTER TABLE calculo_motivo_tintas ADD COLUMN IF NOT EXISTS densidad_tinta NUMERIC(10,4);
