-- MIGRATION: Populate V2 production columns from raw_data
-- Date: 2026-07-25
-- Purpose: Migrate remaining raw_data fields to dedicated columns for existing records
-- Uses NULLIF to handle empty strings in raw_data

-- ============================================================
-- FLEXO_CALCULATIONS - Populate from raw_data
-- ============================================================
UPDATE flexo_calculations
SET
    subtotal_financiero = NULLIF(raw_data->>'GENERAL | 2 | SUBTOTAL COSTOS', '')::numeric,
    subtotal_rendimiento = NULLIF(raw_data->>'GENERAL | 3 | SUBTOTAL MAS RENDIMIENTO', '')::numeric,
    precio_millar = NULLIF(raw_data->>'GENERAL | 9 | MILLAR | DOL', '')::numeric,
    total_colones = COALESCE(
        NULLIF(raw_data->>'GENERAL | 7 | SUBTOTAL CALC ANTES IV | COL', '')::numeric,
        NULLIF(raw_data->>'GENERAL | 7 | TOTAL | COL', '')::numeric
    ),
    tipo_cambio_venta = NULLIF(raw_data->>'TIPO CAMBIO VENTA', '')::numeric,
    tipo_cambio_compra = NULLIF(raw_data->>'TIPO CAMBIO COMPRA', '')::numeric,
    costo_minimo = NULLIF(raw_data->>'COSTOS | COSTO MINIMO', '')::numeric,
    porcentaje_imprevistos = NULLIF(raw_data->>'GENERAL | 1 | PORCENTAJE IMPREVISTOS | UTILIZAR', '')::numeric,
    porcentaje_financiero = NULLIF(raw_data->>'GENERAL | 1 | PORCENTAJE COSTOS FINANCIEROS | UTILIZAR', '')::numeric,
    porcentaje_iva = NULLIF(raw_data->>'GENERAL | 8 | PORCENTAJE IVA', '')::numeric,
    porcentaje_adicional = NULLIF(raw_data->>'Porcentaje Adicional', '')::numeric,
    tiempo_diseno_horas = NULLIF(raw_data->>'Tiempos | Diseno Horas', '')::numeric,
    tiempo_preprensa_horas = NULLIF(raw_data->>'Tiempos | Preprensa Horas', '')::numeric,
    tiempo_acabados_min = NULLIF(raw_data->>'Tiempos | Acabados Minutos', '')::numeric,
    tiempo_total_min = NULLIF(raw_data->>'Tiempos | Total Minutos', '')::numeric,
    material_ancho = NULLIF(raw_data->>'GENERAL | MATERIAL | ANCHO', '')::numeric,
    cantidad_pantones = NULLIF(raw_data->>'CANTIDAD PANTONES', '')::numeric,
    tinta_blanca = CASE
        WHEN raw_data->>'TINTA BLANCA' = 'si' OR raw_data->>'TINTA BLANCA' = 'Si' OR raw_data->>'TINTA BLANCA' = 'true' THEN true
        WHEN raw_data->>'GENERAL | TINTA BLANCA' = 'true' THEN true
        ELSE false
    END,
    doble_blanca = CASE
        WHEN raw_data->>'DOBLE PASADA BLANCA' = 'si' OR raw_data->>'DOBLE PASADA BLANCA' = 'Si' OR raw_data->>'DOBLE PASADA BLANCA' = 'true' THEN true
        ELSE false
    END,
    analisis_solicitud = NULLIF(raw_data->>'ANALISIS CAMPOS SOLICITUD', ''),
    analisis_finalizar = NULLIF(raw_data->>'ANALISIS CAMPOS FINALIZAR', ''),
    analisis_crear_orden = NULLIF(raw_data->>'ANALISIS CAMPOS CREAR ORDEN', ''),
    resumen_cotizacion = COALESCE(NULLIF(raw_data->>'Resumen Cotización', ''), NULLIF(raw_data->>'Resumen Cotizacion', '')),
    info_impresion = COALESCE(NULLIF(raw_data->>'INFORMACION IMPRESION COTIZACION | MOSTRAR', ''), NULLIF(raw_data->>'INFORMACION IMPRESION COTIZACION | CALCULO', '')),
    observaciones = NULLIF(raw_data->>'OBSERVACIONES SOLICITUD', ''),
    estado_creacion = NULLIF(raw_data->>'CREACION ESTADO', ''),
    condicion_pago = NULLIF(raw_data->>'CONDICION PAGO', ''),
    tiempo_entrega = NULLIF(raw_data->>'TIEMPO ENTREGA', ''),
    moneda = NULLIF(raw_data->>'MONEDA', ''),
    metodo_envio = NULLIF(raw_data->>'METODO ENVIO', ''),
    tipo_orden = NULLIF(raw_data->>'TIPO ORDEN', '')
WHERE raw_data IS NOT NULL;

-- Numeric fields that need more careful handling (multiple possible sources)
UPDATE flexo_calculations
SET
    material_m2 = COALESCE(
        material_m2,
        NULLIF(raw_data->>'Material | m2 Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | AREA MTS', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | AREA MTS', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_m2 IS NULL
    AND (raw_data ? 'Material | m2 Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | AREA MTS' OR raw_data ? 'DIGITAL | MATERIAL | AREA MTS');

UPDATE flexo_calculations
SET
    material_msi = COALESCE(
        material_msi,
        NULLIF(raw_data->>'Material | MSI Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD MSI INCLUYE MACULA', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD MSI INCLUYE MACULA', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD MSI', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD MSI', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_msi IS NULL
    AND (raw_data ? 'Material | MSI Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | CANTIDAD MSI INCLUYE MACULA' OR raw_data ? 'DIGITAL | MATERIAL | CANTIDAD MSI INCLUYE MACULA');

UPDATE flexo_calculations
SET
    material_pies_macula = COALESCE(
        material_pies_macula,
        NULLIF(raw_data->>'Material | Pies Macula Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD PIES MACULA | CALCULO', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD PIES MACULA | CALCULO', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_pies_macula IS NULL
    AND (raw_data ? 'Material | Pies Macula Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | CANTIDAD PIES MACULA | CALCULO');

UPDATE flexo_calculations
SET
    cantidad_tintas = COALESCE(
        cantidad_tintas,
        NULLIF(raw_data->>'CANTIDAD TINTAS', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | CANTIDAD TINTAS', '')::numeric
    )
WHERE raw_data IS NOT NULL AND cantidad_tintas IS NULL
    AND (raw_data ? 'CANTIDAD TINTAS' OR raw_data ? 'DIGITAL | CANTIDAD TINTAS');

UPDATE flexo_calculations
SET
    laminado_pies_lineales = COALESCE(
        CASE WHEN raw_data->'Datos_Cotizados'->'sustrato' ? 'consumption'
            THEN NULLIF(raw_data->'Datos_Cotizados'->'sustrato'->>'consumption', '')::numeric
        WHEN raw_data->'Datos_Cotizados'->'sustrato' ? 'totalLengthFeet'
            THEN NULLIF(raw_data->'Datos_Cotizados'->'sustrato'->>'totalLengthFeet', '')::numeric
        END,
        pies_totales_sustrato
    )
WHERE raw_data IS NOT NULL
    AND raw_data ? 'Datos_Cotizados'
    AND laminado_pies_lineales IS NULL;

-- ============================================================
-- FLEXO_ORDERS - Populate from raw_data
-- ============================================================
UPDATE flexo_orders
SET
    subtotal_financiero = NULLIF(raw_data->>'GENERAL | 2 | SUBTOTAL COSTOS', '')::numeric,
    subtotal_rendimiento = NULLIF(raw_data->>'GENERAL | 3 | SUBTOTAL MAS RENDIMIENTO', '')::numeric,
    precio_millar = NULLIF(raw_data->>'GENERAL | 9 | MILLAR | DOL', '')::numeric,
    total_colones = COALESCE(
        NULLIF(raw_data->>'GENERAL | 7 | SUBTOTAL CALC ANTES IV | COL', '')::numeric,
        NULLIF(raw_data->>'GENERAL | 7 | TOTAL | COL', '')::numeric
    ),
    tipo_cambio_venta = NULLIF(raw_data->>'TIPO CAMBIO VENTA', '')::numeric,
    tipo_cambio_compra = NULLIF(raw_data->>'TIPO CAMBIO COMPRA', '')::numeric,
    costo_minimo = NULLIF(raw_data->>'COSTOS | COSTO MINIMO', '')::numeric,
    porcentaje_imprevistos = NULLIF(raw_data->>'GENERAL | 1 | PORCENTAJE IMPREVISTOS | UTILIZAR', '')::numeric,
    porcentaje_financiero = NULLIF(raw_data->>'GENERAL | 1 | PORCENTAJE COSTOS FINANCIEROS | UTILIZAR', '')::numeric,
    porcentaje_iva = NULLIF(raw_data->>'GENERAL | 8 | PORCENTAJE IVA', '')::numeric,
    porcentaje_adicional = NULLIF(raw_data->>'Porcentaje Adicional', '')::numeric,
    tiempo_diseno_horas = NULLIF(raw_data->>'Tiempos | Diseno Horas', '')::numeric,
    tiempo_preprensa_horas = NULLIF(raw_data->>'Tiempos | Preprensa Horas', '')::numeric,
    tiempo_acabados_min = NULLIF(raw_data->>'Tiempos | Acabados Minutos', '')::numeric,
    tiempo_total_min = NULLIF(raw_data->>'Tiempos | Total Minutos', '')::numeric,
    material_ancho = NULLIF(raw_data->>'GENERAL | MATERIAL | ANCHO', '')::numeric,
    cantidad_pantones = NULLIF(raw_data->>'CANTIDAD PANTONES', '')::numeric,
    tinta_blanca = CASE
        WHEN raw_data->>'TINTA BLANCA' = 'si' OR raw_data->>'TINTA BLANCA' = 'Si' OR raw_data->>'TINTA BLANCA' = 'true' THEN true
        WHEN raw_data->>'GENERAL | TINTA BLANCA' = 'true' THEN true
        ELSE false
    END,
    doble_blanca = CASE
        WHEN raw_data->>'DOBLE PASADA BLANCA' = 'si' OR raw_data->>'DOBLE PASADA BLANCA' = 'Si' OR raw_data->>'DOBLE PASADA BLANCA' = 'true' THEN true
        ELSE false
    END,
    analisis_solicitud = NULLIF(raw_data->>'ANALISIS CAMPOS SOLICITUD', ''),
    analisis_finalizar = NULLIF(raw_data->>'ANALISIS CAMPOS FINALIZAR', ''),
    analisis_crear_orden = NULLIF(raw_data->>'ANALISIS CAMPOS CREAR ORDEN', ''),
    resumen_cotizacion = COALESCE(NULLIF(raw_data->>'Resumen Cotización', ''), NULLIF(raw_data->>'Resumen Cotizacion', '')),
    info_impresion = COALESCE(NULLIF(raw_data->>'INFORMACION IMPRESION COTIZACION | MOSTRAR', ''), NULLIF(raw_data->>'INFORMACION IMPRESION COTIZACION | CALCULO', '')),
    observaciones = NULLIF(raw_data->>'OBSERVACIONES SOLICITUD', ''),
    estado_creacion = NULLIF(raw_data->>'CREACION ESTADO', ''),
    condicion_pago = NULLIF(raw_data->>'CONDICION PAGO', ''),
    tiempo_entrega = NULLIF(raw_data->>'TIEMPO ENTREGA', ''),
    moneda = NULLIF(raw_data->>'MONEDA', ''),
    metodo_envio = NULLIF(raw_data->>'METODO ENVIO', ''),
    tipo_orden = NULLIF(raw_data->>'TIPO ORDEN', '')
WHERE raw_data IS NOT NULL;

UPDATE flexo_orders
SET
    material_m2 = COALESCE(
        material_m2,
        NULLIF(raw_data->>'Material | m2 Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | AREA MTS', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | AREA MTS', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_m2 IS NULL
    AND (raw_data ? 'Material | m2 Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | AREA MTS' OR raw_data ? 'DIGITAL | MATERIAL | AREA MTS');

UPDATE flexo_orders
SET
    material_msi = COALESCE(
        material_msi,
        NULLIF(raw_data->>'Material | MSI Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD MSI INCLUYE MACULA', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD MSI INCLUYE MACULA', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD MSI', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD MSI', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_msi IS NULL
    AND (raw_data ? 'Material | MSI Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | CANTIDAD MSI INCLUYE MACULA' OR raw_data ? 'DIGITAL | MATERIAL | CANTIDAD MSI INCLUYE MACULA');

UPDATE flexo_orders
SET
    material_pies_macula = COALESCE(
        material_pies_macula,
        NULLIF(raw_data->>'Material | Pies Macula Segun Proceso Productivo', '')::numeric,
        NULLIF(raw_data->>'CONV | MATERIAL | CANTIDAD PIES MACULA | CALCULO', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | MATERIAL | CANTIDAD PIES MACULA | CALCULO', '')::numeric
    )
WHERE raw_data IS NOT NULL AND material_pies_macula IS NULL
    AND (raw_data ? 'Material | Pies Macula Segun Proceso Productivo' OR raw_data ? 'CONV | MATERIAL | CANTIDAD PIES MACULA | CALCULO');

UPDATE flexo_orders
SET
    cantidad_tintas = COALESCE(
        cantidad_tintas,
        NULLIF(raw_data->>'CANTIDAD TINTAS', '')::numeric,
        NULLIF(raw_data->>'DIGITAL | CANTIDAD TINTAS', '')::numeric
    )
WHERE raw_data IS NOT NULL AND cantidad_tintas IS NULL
    AND (raw_data ? 'CANTIDAD TINTAS' OR raw_data ? 'DIGITAL | CANTIDAD TINTAS');

UPDATE flexo_orders
SET
    laminado_pies_lineales = COALESCE(
        CASE WHEN raw_data->'Datos_Cotizados'->'sustrato' ? 'consumption'
            THEN NULLIF(raw_data->'Datos_Cotizados'->'sustrato'->>'consumption', '')::numeric
        WHEN raw_data->'Datos_Cotizados'->'sustrato' ? 'totalLengthFeet'
            THEN NULLIF(raw_data->'Datos_Cotizados'->'sustrato'->>'totalLengthFeet', '')::numeric
        END
    )
WHERE raw_data IS NOT NULL
    AND raw_data ? 'Datos_Cotizados'
    AND laminado_pies_lineales IS NULL;
