-- ============================================================
-- MIGRACIÓN: Columnas de cálculo y MES para flexo_products y flexo_orders
-- FASE: Alinear columnas entre productos, órdenes y cálculos
-- ============================================================

-- ============================================================
-- 1. flexo_products: AGREGAR columnas de cálculo faltantes
-- ============================================================

-- Datos del cliente y trabajo
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS salesperson_name TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS process_type TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_code TEXT;

-- Especificaciones de la etiqueta
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS quantity_changes NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS labels_per_roll NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS core_width NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS core_diameter TEXT;

-- Configuración
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS cmyk_enabled BOOLEAN DEFAULT false;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS sin_impresion BOOLEAN DEFAULT false;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tinta_blanca BOOLEAN DEFAULT false;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS doble_blanca BOOLEAN DEFAULT false;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS cantidad_pantones NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS application_type TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS surface_type TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS output_type TEXT;

-- TINTA
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS consumo_tinta_por_color_lb NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS consumo_tinta_total_lb NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_tinta_por_libra NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_tinta_id TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS cobertura_tinta_pct NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS bcm_anilox NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS factor_transferencia NUMERIC(8,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS densidad_tinta NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_libra_cmyk NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_libra_blanco NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_libra_pantone NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_tinta NUMERIC(14,6);

-- SUSTRATO (mermas)
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_arranque_pies NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_tiraje_pies NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_tiraje_pct NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_merma NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_sustrato NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS pies_totales_sustrato NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS pies_sustrato_neto NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_feet NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_msi NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_m2 NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_pies_macula NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_ancho NUMERIC(12,4);

-- IMPRESIÓN
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS velocidad_maquina_m_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_setup_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_limpieza_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_hora_maquina NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_hora_operador NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_maquina NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_operador NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_corrida_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_total_impresion_min NUMERIC(12,4);

-- BARNIZ
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_material_id TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_bcm NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_cobertura_pct NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_costo_por_kg NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_zonificado BOOLEAN DEFAULT false;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_comentario TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_costo_total NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_consumo_kg NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_consumo_lb NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS barniz_tipo TEXT;

-- LAMINADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_material_id TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_costo_por_pie_lineal NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_comentario TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_costo_total NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_pies_lineales NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS laminado_tipo TEXT;

-- EMBOSADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_ancho_cliche NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_largo_cliche NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_costo_cliche NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_comentario TEXT;

-- ESTAMPADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS estampado_tipo TEXT;

-- TROQUELADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS troquelado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS troquelado_merma_ajuste_pies NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS troquelado_comentario TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS troquel_forma TEXT;

-- NUMERADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS numerado_tipo TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS numerado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS numerado_costo_fijo NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS numerado_comentario TEXT;

-- REBOBINADO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_maquina TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_costo_hora_maquina NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_costo_operador NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_velocidad NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_merma_ajuste_pies NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_merma_operacion_pct NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_comentario TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_tiempo_total_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_costo_total NUMERIC(14,6);

-- EMPAQUE
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_cantidad_rollos NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_rendimiento_por_hora NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_operarios NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_costo_por_operador NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_costo_externo NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_comentario TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_horas NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_costo_total NUMERIC(14,6);

-- TIEMPOS
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_diseno_horas NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_preprensa_horas NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_acabados_min NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_total_min NUMERIC(12,4);

-- FINANCIERO
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS industrial_subtotal NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS overhead_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS prepress_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS design_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_financiero NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS subtotal_rendimiento NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS precio_millar NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS total_colones NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tipo_cambio_venta NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tipo_cambio_compra NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS costo_minimo NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS porcentaje_imprevistos NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS porcentaje_financiero NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS porcentaje_adicional NUMERIC(8,4);

-- RESUMEN
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_total_pies NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_total_costo NUMERIC(14,6);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS ruta_calculada TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS montaje_resumen TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS condicion_pago TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS moneda TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS metodo_envio TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS tipo_orden TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS medida_fija TEXT;

-- ============================================================
-- 2. Columnas MES (para flexo_orders y flexo_products)
-- ============================================================

-- flexo_orders: MES columns
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_velocidad_real_fpm NUMERIC(12,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_presion_cilindro_psi NUMERIC(8,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_anilox_linea TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_viscosidad_promedio NUMERIC(8,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_temperatura_promedio NUMERIC(8,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS mes_ultima_sincronizacion TIMESTAMPTZ;

-- flexo_products: MES columns
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_velocidad_real_fpm NUMERIC(12,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_presion_cilindro_psi NUMERIC(8,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_anilox_linea TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_viscosidad_promedio NUMERIC(8,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_temperatura_promedio NUMERIC(8,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS mes_ultima_sincronizacion TIMESTAMPTZ;

-- ============================================================
-- 3. flexo_calculations: MES columns (para consistencia)
-- ============================================================
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_velocidad_real_fpm NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_presion_cilindro_psi NUMERIC(8,2);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_anilox_linea TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_viscosidad_promedio NUMERIC(8,2);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_temperatura_promedio NUMERIC(8,2);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS mes_ultima_sincronizacion TIMESTAMPTZ;

-- ============================================================
-- 4. flexo_orders: AGREGAR columnas faltantes de cálculo
--    para alinear con flexo_calculations
-- ============================================================
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS industrial_subtotal NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS overhead_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS prepress_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS design_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS cantidad_pantones NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS barniz_tipo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS laminado_pies_lineales NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estampado_tipo TEXT;

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fp_customer_code ON flexo_products(customer_code);
CREATE INDEX IF NOT EXISTS idx_fp_process_type ON flexo_products(process_type);
CREATE INDEX IF NOT EXISTS idx_fp_material_code ON flexo_products(material_code);
