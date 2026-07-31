-- ============================================================
-- MIGRACIÓN: Columnas de producción para flexo_calculations
-- FASE 1: Agregar ~66 columnas dedicadas
-- ============================================================

-- TINTA
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS consumo_tinta_por_color_lb NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS consumo_tinta_total_lb NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_tinta_por_libra NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_tinta_id TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS cobertura_tinta_pct NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS bcm_anilox NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS factor_transferencia NUMERIC(8,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS densidad_tinta NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_libra_cmyk NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_libra_blanco NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_libra_pantone NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS subtotal_tinta NUMERIC(14,6);

-- SUSTRATO (mermas)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS merma_arranque_pies NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS merma_tiraje_pies NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS merma_tiraje_pct NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_merma NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_sustrato NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS pies_totales_sustrato NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS pies_sustrato_neto NUMERIC(14,4);

-- IMPRESIÓN
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS velocidad_maquina_m_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_setup_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_limpieza_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_hora_maquina NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS costo_hora_operador NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS subtotal_maquina NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS subtotal_operador NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_corrida_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tiempo_total_impresion_min NUMERIC(12,4);

-- BARNIZ (subproceso inline)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_material_id TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_bcm NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_cobertura_pct NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_costo_por_kg NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_zonificado BOOLEAN DEFAULT false;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_comentario TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_costo_total NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_consumo_kg NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_consumo_lb NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_tiempo_montaje_min NUMERIC(12,4);

-- LAMINADO (subproceso inline)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_material_id TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_costo_por_pie_lineal NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_comentario TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_costo_total NUMERIC(14,6);

-- EMBOSADO (subproceso inline)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_ancho_cliche NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_largo_cliche NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_costo_cliche NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_comentario TEXT;

-- TROQUELADO (subproceso inline)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS troquelado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS troquelado_merma_ajuste_pies NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS troquelado_comentario TEXT;

-- NUMERADO (subproceso inline)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS numerado_tipo TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS numerado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS numerado_costo_fijo NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS numerado_comentario TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS numerado_adjunto TEXT;

-- REBOBINADO (proceso adicional externo)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_maquina TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_tiempo_montaje_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_costo_hora_maquina NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_costo_operador NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_velocidad NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_merma_ajuste_pies NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_merma_operacion_pct NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_comentario TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_tiempo_total_min NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_costo_total NUMERIC(14,6);

-- EMPAQUE (proceso adicional externo)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_cantidad_rollos NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_rendimiento_por_hora NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_operarios NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_costo_por_operador NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_costo_externo NUMERIC(14,6);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_comentario TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_adjunto TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_horas NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_costo_total NUMERIC(14,6);

-- MERMAS (resumen)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS merma_total_pies NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS merma_total_costo NUMERIC(14,6);
