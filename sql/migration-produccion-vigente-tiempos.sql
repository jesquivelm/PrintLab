-- Parámetros vigentes de proceso (modificados en producción) y resumen de tiempos
-- reales/de proceso por etapa, espejados en flexo_orders y flexo_products.
-- Ver auditoría 2026-08-24: estos datos ya se capturan en production_station_configs
-- y production_order_routes/order_tracking_marks pero no se resumían en la orden/producto.

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        -- Parámetros vigentes de proceso (última config real de estación)
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS anilox_code_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS viscosity_vigente NUMERIC(12,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS temperature_vigente NUMERIC(8,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS ink_type_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS pantone_ref_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS barniz_tipo_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS barniz_zona_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS barniz_zonif_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS uv_power_vigente NUMERIC(8,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS uv_temp_vigente NUMERIC(8,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS vigente_actualizado_en TIMESTAMPTZ', tbl);

        -- Resumen de tiempos por etapa (real = bruto entre marcas, proceso = trabajo efectivo)
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_planeacion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_planeacion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_diseno_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_diseno_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_preprensa_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_preprensa_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_visto_bueno_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_visto_bueno_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_programacion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_programacion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_tintas_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_tintas_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_impresion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_impresion_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_rebobinado_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_rebobinado_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_real_empaque_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_proceso_empaque_horas NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempos_actualizado_en TIMESTAMPTZ', tbl);
    END LOOP;
END $$;
