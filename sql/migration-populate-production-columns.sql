-- ============================================================
-- MIGRACIÓN FASE 2: Poblar columnas de producción desde raw_data
-- Solo afecta registros con Datos_Cotizados como objeto (~20)
-- ============================================================

UPDATE flexo_calculations SET
    -- ===== TINTA =====
    consumo_tinta_por_color_lb = (
        SELECT (item->>'inkConsumptionPerColorLb')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS item
        LIMIT 1
    ),
    consumo_tinta_total_lb = (
        SELECT (item->>'inkConsumption')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS item
        LIMIT 1
    ),
    costo_tinta_por_libra = (raw_data->'Datos_Cotizados'->'print'->>'inkCostPerLb')::numeric,
    material_tinta_id = raw_data->'Datos_Cotizados'->'print'->>'inkMaterialId',
    cobertura_tinta_pct = COALESCE(
        (raw_data->'Datos_Cotizados'->'print'->>'inkCoveragePct')::numeric,
        (raw_data->'Datos_Cotizados'->'print'->>'coveragePct')::numeric
    ),
    bcm_anilox = (raw_data->'Datos_Cotizados'->'print'->>'aniloxBcm')::numeric,
    factor_transferencia = (raw_data->'Datos_Cotizados'->'print'->>'transferFactor')::numeric,
    densidad_tinta = (raw_data->'Datos_Cotizados'->'print'->>'inkDensity')::numeric,
    costo_libra_cmyk = (raw_data->'Datos_Cotizados'->'print'->>'inkCostPerLb')::numeric,
    costo_libra_blanco = (raw_data->'Datos_Cotizados'->'print'->>'whiteInkCostPerLb')::numeric,
    costo_libra_pantone = (raw_data->'Datos_Cotizados'->'print'->>'pantoneInkCostPerLb')::numeric,
    subtotal_tinta = (raw_data->'Datos_Cotizados'->'print'->>'inkSubtotal')::numeric,

    -- ===== SUSTRATO (mermas) =====
    merma_arranque_pies = COALESCE(
        (raw_data->'Datos_Cotizados'->'print'->>'maculaSetupFeet')::numeric,
        (raw_data->'Datos_Cotizados'->'print'->>'startupWasteFeet')::numeric
    ),
    merma_tiraje_pies = COALESCE(
        (raw_data->'Datos_Cotizados'->'print'->>'maculaTirajeFeet')::numeric,
        (raw_data->'Datos_Cotizados'->'sustrato'->'macula'->>'tirajeFeet')::numeric
    ),
    merma_tiraje_pct = (raw_data->'Datos_Cotizados'->'macula'->>'tirajePromedioPct')::numeric,
    costo_merma = COALESCE(
        (raw_data->'Datos_Cotizados'->'print'->>'maculaMaterialSubtotal')::numeric,
        (raw_data->'Datos_Cotizados'->'print'->'items'->0->'macula'->>'materialSubtotal')::numeric
    ),
    costo_sustrato = (raw_data->'Datos_Cotizados'->'sustrato'->>'subtotal')::numeric,
    pies_totales_sustrato = COALESCE(
        (raw_data->'Datos_Cotizados'->'sustrato'->>'consumption')::numeric,
        (raw_data->'Datos_Cotizados'->'sustrato'->>'totalLengthFeet')::numeric
    ),
    pies_sustrato_neto = (raw_data->'Datos_Cotizados'->'sustrato'->>'linealFeet')::numeric,

    -- ===== IMPRESIÓN =====
    velocidad_maquina_m_min = COALESCE(
        (raw_data->'Datos_Cotizados'->'print'->>'speedMetersMin')::numeric,
        (raw_data->'Datos_Cotizados'->'print'->>'speedFtMin')::numeric
    ),
    tiempo_setup_min = (raw_data->'Datos_Cotizados'->'print'->>'setupMinutes')::numeric,
    tiempo_montaje_min = (raw_data->'Datos_Cotizados'->'print'->>'mountingMinutes')::numeric,
    tiempo_limpieza_min = (raw_data->'Datos_Cotizados'->'print'->>'cleaningMinutes')::numeric,
    costo_hora_maquina = (raw_data->'Datos_Cotizados'->'print'->>'costHour')::numeric,
    costo_hora_operador = (raw_data->'Datos_Cotizados'->'print'->>'operatorHourCost')::numeric,
    subtotal_maquina = (raw_data->'Datos_Cotizados'->'print'->>'machineSubtotal')::numeric,
    subtotal_operador = (raw_data->'Datos_Cotizados'->'print'->>'operatorSubtotal')::numeric,
    tiempo_corrida_min = (raw_data->'Datos_Cotizados'->'print'->>'runMinutes')::numeric,
    tiempo_total_impresion_min = (raw_data->'Datos_Cotizados'->'print'->>'totalMinutes')::numeric,

    -- ===== BARNIZ (inlineItems where key='barniz') =====
    barniz_material_id = (
        SELECT item->>'materialId'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_bcm = (
        SELECT (item->>'varnishBcm')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_cobertura_pct = (
        SELECT (item->>'coveragePct')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_costo_por_kg = (
        SELECT (item->>'costPerKg')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_zonificado = COALESCE(
        (raw_data->'CONV | BARNIZ | ZONIFICADO')::boolean,
        false
    ),
    barniz_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_costo_total = (
        SELECT (item->>'subtotal')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_consumo_kg = (
        SELECT (item->>'materialConsumptionKg')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_consumo_lb = (
        SELECT (item->>'materialConsumptionLb')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),
    barniz_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'barniz' AND (item->>'active')::text = 'true'
        LIMIT 1
    ),

    -- ===== LAMINADO =====
    laminado_material_id = (
        SELECT item->>'materialId'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'laminado'
        LIMIT 1
    ),
    laminado_costo_por_pie_lineal = (
        SELECT (item->>'costPerFoot')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'laminado'
        LIMIT 1
    ),
    laminado_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'laminado'
        LIMIT 1
    ),
    laminado_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'laminado'
        LIMIT 1
    ),
    laminado_costo_total = (
        SELECT (item->>'subtotal')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'laminado'
        LIMIT 1
    ),

    -- ===== EMBOSADO =====
    embosado_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'embosado'
        LIMIT 1
    ),
    embosado_ancho_cliche = (
        SELECT (item->>'plateWidthIn')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'embosado'
        LIMIT 1
    ),
    embosado_largo_cliche = (
        SELECT (item->>'plateLengthIn')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'embosado'
        LIMIT 1
    ),
    embosado_costo_cliche = (
        SELECT (item->>'plateCost')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'embosado'
        LIMIT 1
    ),
    embosado_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'embosado'
        LIMIT 1
    ),

    -- ===== TROQUELADO =====
    troquelado_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'troquelado'
        LIMIT 1
    ),
    troquelado_merma_ajuste_pies = (
        SELECT (item->>'setupWasteFeet')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'troquelado'
        LIMIT 1
    ),
    troquelado_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'troquelado'
        LIMIT 1
    ),

    -- ===== NUMERADO =====
    numerado_tipo = (
        SELECT item->>'numberingType'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'numerado'
        LIMIT 1
    ),
    numerado_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'numerado'
        LIMIT 1
    ),
    numerado_costo_fijo = (
        SELECT (item->>'fixedCost')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'numerado'
        LIMIT 1
    ),
    numerado_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'numerado'
        LIMIT 1
    ),
    numerado_adjunto = (
        SELECT item->>'attachmentName'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi,
             jsonb_array_elements(COALESCE(pi->'inlineItems', '[]'::jsonb)) AS item
        WHERE item->>'key' = 'numerado'
        LIMIT 1
    ),

    -- ===== REBOBINADO (finishes.items) =====
    rebobinado_maquina = (
        SELECT item->>'machineName'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_tiempo_montaje_min = (
        SELECT (item->>'setupMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_costo_hora_maquina = (
        SELECT (item->>'costHourMachine')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_costo_operador = (
        SELECT (item->>'costHourOperator')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_velocidad = (
        SELECT (item->>'speed')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_merma_ajuste_pies = (
        SELECT (item->>'setupWasteFeet')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_merma_operacion_pct = (
        SELECT (item->>'operationWastePct')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_comentario = (
        SELECT item->>'comment'
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_tiempo_total_min = (
        SELECT (item->>'runMinutes')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),
    rebobinado_costo_total = (
        SELECT (item->>'subtotal')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'finishes'->'items', '[]'::jsonb)) AS item
        WHERE item->>'processKey' = 'rebobinado'
        LIMIT 1
    ),

    -- ===== EMPAQUE =====
    empaque_cantidad_rollos = COALESCE(
        (raw_data->'Datos_Cotizados'->'packaging'->>'rolls')::numeric,
        (raw_data->'Estado_UI'->'packaging'->>'rollCount')::numeric
    ),
    empaque_rendimiento_por_hora = (raw_data->'Estado_UI'->'packaging'->>'yieldPerHour')::numeric,
    empaque_operarios = (raw_data->'Estado_UI'->'packaging'->>'operators')::numeric,
    empaque_costo_por_operador = (raw_data->'Estado_UI'->'packaging'->>'hourCost')::numeric,
    empaque_costo_externo = (raw_data->'Estado_UI'->'packaging'->>'externalCost')::numeric,
    empaque_comentario = raw_data->'Estado_UI'->'packaging'->>'comments',
    empaque_adjunto = raw_data->'Estado_UI'->'packaging'->>'attachmentName',
    empaque_horas = (raw_data->'Datos_Cotizados'->'packaging'->>'hours')::numeric,
    empaque_costo_total = (raw_data->'Datos_Cotizados'->'packaging'->>'subtotal')::numeric,

    -- ===== MERMAS (resumen) =====
    merma_total_pies = (
        SELECT (pi->'macula'->>'totalFeet')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS pi
        LIMIT 1
    ),
    merma_total_costo = (
        SELECT (item->>'maculaMaterialSubtotal')::numeric
        FROM jsonb_array_elements(COALESCE(raw_data->'Datos_Cotizados'->'print'->'items', '[]'::jsonb)) AS item
        LIMIT 1
    ),

    updated_at = NOW()
WHERE raw_data->'Datos_Cotizados' IS NOT NULL
  AND jsonb_typeof(raw_data->'Datos_Cotizados') = 'object';
