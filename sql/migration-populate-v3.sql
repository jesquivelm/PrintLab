-- Migración FASE 3: Poblar columnas nuevas desde raw_data
-- Fecha: 2026-07-25

-- flexo_calculations
UPDATE flexo_calculations SET
    barniz_tipo = raw_data->>'REQ | Barniz',
    laminado_tipo = raw_data->>'REQ | Laminado',
    estampado_tipo = raw_data->>'REQ | Estampado',
    embosado_tipo = raw_data->>'REQ | Embosado',
    troquel_forma = raw_data->>'REQ | Forma',
    ruta_calculada = raw_data->>'REQ | Ruta Automática',
    montaje_resumen = COALESCE(raw_data->>'REQ | Montaje Automático', raw_data->>'Texto_Secuencia_Procesos'),
    sin_impresion = CASE
        WHEN LOWER(COALESCE(raw_data->>'SIN IMPRESION', raw_data->>'SIN IMPRESIÓN', '')) IN ('si', 'sí', 'yes', 'true', '1') THEN true
        ELSE false
    END,
    medida_fija = raw_data->>'REQ | Medida Fija',
    material_nombre = raw_data->>'GENERAL | MATERIAL',
    fecha_vencimiento = CASE
        WHEN raw_data->>'FECHA VENCIMIENTO' ~ '^\d{4}-\d{2}-\d{2}' THEN (raw_data->>'FECHA VENCIMIENTO')::date
        ELSE NULL
    END,
    seleccion_automatica = raw_data->'Seleccion_Automatica',
    precio_automatico = raw_data->'Precio_Automatico'
WHERE raw_data IS NOT NULL AND raw_data::text <> '{}' AND raw_data::text <> 'null';

-- flexo_orders (copiar desde raw_data si existe, o desde flexo_calculations)
UPDATE flexo_orders o SET
    barniz_tipo = COALESCE(o.raw_data->>'REQ | Barniz', c.barniz_tipo),
    laminado_tipo = COALESCE(o.raw_data->>'REQ | Laminado', c.laminado_tipo),
    estampado_tipo = COALESCE(o.raw_data->>'REQ | Estampado', c.estampado_tipo),
    embosado_tipo = COALESCE(o.raw_data->>'REQ | Embosado', c.embosado_tipo),
    troquel_forma = COALESCE(o.raw_data->>'REQ | Forma', c.troquel_forma),
    ruta_calculada = COALESCE(o.raw_data->>'REQ | Ruta Automática', c.ruta_calculada),
    montaje_resumen = COALESCE(o.raw_data->>'REQ | Montaje Automático', o.raw_data->>'Texto_Secuencia_Procesos', c.montaje_resumen),
    sin_impresion = CASE
        WHEN LOWER(COALESCE(o.raw_data->>'SIN IMPRESION', o.raw_data->>'SIN IMPRESIÓN', '')) IN ('si', 'sí', 'yes', 'true', '1') THEN true
        ELSE COALESCE(c.sin_impresion, false)
    END,
    medida_fija = COALESCE(o.raw_data->>'REQ | Medida Fija', c.medida_fija),
    material_nombre = COALESCE(o.raw_data->>'GENERAL | MATERIAL', c.material_nombre),
    fecha_vencimiento = CASE
        WHEN o.raw_data->>'FECHA VENCIMIENTO' ~ '^\d{4}-\d{2}-\d{2}' THEN (o.raw_data->>'FECHA VENCIMIENTO')::date
        WHEN c.fecha_vencimiento IS NOT NULL THEN c.fecha_vencimiento
        ELSE NULL
    END,
    seleccion_automatica = COALESCE(o.raw_data->'Seleccion_Automatica', c.seleccion_automatica),
    precio_automatico = COALESCE(o.raw_data->'Precio_Automatico', c.precio_automatico)
FROM flexo_calculations c
WHERE o.quote_code = c.quote_code AND o.line_code = c.line_code
  AND o.raw_data IS NOT NULL AND o.raw_data::text <> '{}';
