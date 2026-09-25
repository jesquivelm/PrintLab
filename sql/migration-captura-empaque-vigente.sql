-- ============================================================================
-- MIGRACIÓN: Captura real de Empaque (valores vigentes) — parte nueva
-- ----------------------------------------------------------------------------
-- Empaque ya tenía columnas _vigente de migration-reproceso-parametros-vigentes
-- (empaque_caja_tipo_vigente, empaque_caja_dimensiones_vigente,
-- empaque_num_cajas_producidas_vigente, empaque_rollos_por_caja_vigente,
-- empaque_cajas_por_tarima_vigente, empaque_remanente_rollos_sueltos_vigente,
-- peso_neto_caja_vigente_kg, peso_bruto_caja_vigente_kg, unidades_por_rollo_vigente,
-- lote_producto_terminado_vigente, empaque_instrucciones_cliente_vigente...).
-- Aquí solo se agrega lo que faltaba, alineado orders/products, en unidades métricas.
--
-- Idempotente.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-captura-empaque-vigente.sql
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        -- ---- Cores ---------------------------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_gancho_core_vigente_mm NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_etiquetas_por_core_vigente NUMERIC(14,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_cantidad_cores_vigente INTEGER', tbl);
        -- ---- Cajas -------------------------------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_caja_cortada_vigente TEXT', tbl);
        -- ---- Peso y cierre -------------------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_peso_total_pt_vigente_kg NUMERIC(14,3)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_cantidad_final_vigente NUMERIC(14,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_faltante_vigente NUMERIC(14,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_operarios_vigente INTEGER', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_disponible_despacho_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_captura_actualizado_en TIMESTAMPTZ', tbl);
    END LOOP;
END $$;
