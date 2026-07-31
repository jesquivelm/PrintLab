-- MIGRATION: Add V2 production columns to flexo_calculations and flexo_orders
-- Date: 2026-07-25
-- Purpose: Migrate remaining raw_data fields to dedicated columns

-- ============================================================
-- FLEXO_CALCULATIONS
-- ============================================================

-- Costos
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS subtotal_financiero NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS subtotal_rendimiento NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS precio_millar NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS total_colones NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tipo_cambio_venta NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tipo_cambio_compra NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_minimo NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS porcentaje_imprevistos NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS porcentaje_financiero NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS porcentaje_adicional NUMERIC(8,4);

-- Tiempos
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_diseno_horas NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_preprensa_horas NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_acabados_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_total_min NUMERIC(12,4);

-- Materiales
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_m2 NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_msi NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_pies_macula NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_ancho NUMERIC(12,4);

-- Tinta extras
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS cantidad_tintas NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS cantidad_pantones NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tinta_blanca BOOLEAN DEFAULT false;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS doble_blanca BOOLEAN DEFAULT false;

-- Validaciones/Notas
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS analisis_solicitud TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS analisis_finalizar TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS analisis_crear_orden TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS resumen_cotizacion TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS info_impresion TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS estado_creacion TEXT;

-- Orden/Commercial
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS condicion_pago TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS moneda TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS metodo_envio TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tipo_orden TEXT;

-- Laminado
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_pies_lineales NUMERIC(14,4);

-- ============================================================
-- FLEXO_ORDERS
-- ============================================================

-- Costos
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS subtotal_financiero NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS subtotal_rendimiento NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS precio_millar NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS total_colones NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tipo_cambio_venta NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tipo_cambio_compra NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS costo_minimo NUMERIC(14,6);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS porcentaje_imprevistos NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS porcentaje_financiero NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS porcentaje_adicional NUMERIC(8,4);

-- Tiempos
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tiempo_diseno_horas NUMERIC(12,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tiempo_preprensa_horas NUMERIC(12,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tiempo_acabados_min NUMERIC(12,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tiempo_total_min NUMERIC(12,4);

-- Materiales
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS material_m2 NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS material_msi NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS material_pies_macula NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS material_ancho NUMERIC(12,4);

-- Tinta extras
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS cantidad_tintas NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS cantidad_pantones NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tinta_blanca BOOLEAN DEFAULT false;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS doble_blanca BOOLEAN DEFAULT false;

-- Validaciones/Notas
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS analisis_solicitud TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS analisis_finalizar TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS analisis_crear_orden TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS resumen_cotizacion TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS info_impresion TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estado_creacion TEXT;

-- Orden/Commercial
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS condicion_pago TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS moneda TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS metodo_envio TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tipo_orden TEXT;

-- Laminado
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS laminado_pies_lineales NUMERIC(14,4);
