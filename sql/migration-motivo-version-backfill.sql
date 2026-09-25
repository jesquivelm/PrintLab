-- ============================================================================
-- PRINTLAB ERP - Backfill: Motivo → Versión desde datos existentes
-- ============================================================================
-- Puebla calculo_motivos / calculo_versiones / calculo_motivo_tintas desde
-- flexo_calculations.ui_state->'types' (la representación JSON completa que
-- ya persiste el motor de cálculo). No modifica ni borra raw_data/ui_state.
--
-- Nota de estructura real (verificada contra datos de la BD local):
--   - types[0] (Motivo 1) NO trae "inkStations" propio: usa la config global
--     de printStages[0].inkStations. types[i>0] sí trae su propio inkStations.
--   - "colors" = tintas convencionales (CMYK), "blancas" = pases de blanco
--     (0/1/2), "pantones" = cantidad de pantones. plates = colors+blancas+pantones.
--
-- Idempotente (ON CONFLICT DO NOTHING) — se puede volver a ejecutar sin
-- duplicar filas.
-- ============================================================================

-- ============================================================================
-- 1. calculo_motivos — un registro por elemento de ui_state->'types'
-- ============================================================================
INSERT INTO calculo_motivos (
    quote_code, line_code, motivo_indice, nombre, cantidad,
    cantidad_tintas, tinta_blanca, doble_blanca, cantidad_pantones
)
SELECT
    fc.quote_code,
    fc.line_code,
    (elem.ordinality - 1)::integer,
    elem.value->>'name',
    NULLIF(elem.value->>'quantity', '')::numeric,
    NULLIF(elem.value->>'colors', '')::numeric,
    COALESCE(NULLIF(elem.value->>'blancas', '')::numeric, 0) > 0,
    COALESCE(NULLIF(elem.value->>'blancas', '')::numeric, 0) >= 2,
    NULLIF(elem.value->>'pantones', '')::numeric
FROM flexo_calculations fc
CROSS JOIN LATERAL jsonb_array_elements(fc.ui_state->'types') WITH ORDINALITY AS elem(value, ordinality)
WHERE fc.quote_code IS NOT NULL
  AND fc.line_code IS NOT NULL
  AND jsonb_typeof(fc.ui_state->'types') = 'array'
ON CONFLICT (quote_code, line_code, motivo_indice) DO NOTHING;

-- ============================================================================
-- 2. calculo_versiones — "Versión 1" implícita por cada motivo (compatibilidad,
--    fase 17 del requerimiento: un cálculo sin versiones creadas por el
--    usuario debe seguir comportándose igual que hoy).
-- ============================================================================
INSERT INTO calculo_versiones (quote_code, line_code, motivo_indice, version_indice, nombre, cantidad)
SELECT quote_code, line_code, motivo_indice, 0, 'Versión 1', cantidad
FROM calculo_motivos
ON CONFLICT (quote_code, line_code, motivo_indice, version_indice) DO NOTHING;

-- ============================================================================
-- 3a. calculo_motivo_tintas — Motivo 1 (índice 0): fuente = printStages[0]
-- ============================================================================
INSERT INTO calculo_motivo_tintas (
    quote_code, line_code, motivo_indice, estacion_indice, tipo_tinta, etiqueta, cobertura_pct, activo
)
SELECT
    fc.quote_code,
    fc.line_code,
    0,
    (ink.ordinality - 1)::integer,
    ink.value->>'inkType',
    ink.value->>'inkLabel',
    NULLIF(ink.value->>'coveragePct', '')::numeric,
    COALESCE((ink.value->>'active')::boolean, true)
FROM flexo_calculations fc
CROSS JOIN LATERAL jsonb_array_elements(fc.ui_state->'printStages'->0->'inkStations') WITH ORDINALITY AS ink(value, ordinality)
WHERE jsonb_typeof(fc.ui_state->'printStages'->0->'inkStations') = 'array'
  AND EXISTS (
      SELECT 1 FROM calculo_motivos m
      WHERE m.quote_code = fc.quote_code AND m.line_code = fc.line_code AND m.motivo_indice = 0
  )
  AND ink.value->>'inkType' IN ('cmyk', 'blanco', 'pantone')
ON CONFLICT (quote_code, line_code, motivo_indice, estacion_indice) DO NOTHING;

-- ============================================================================
-- 3b. calculo_motivo_tintas — Motivo 2+ (índice > 0): fuente = types[i].inkStations
-- ============================================================================
INSERT INTO calculo_motivo_tintas (
    quote_code, line_code, motivo_indice, estacion_indice, tipo_tinta, etiqueta, cobertura_pct, activo
)
SELECT
    fc.quote_code,
    fc.line_code,
    (elem.ordinality - 1)::integer,
    (ink.ordinality - 1)::integer,
    ink.value->>'inkType',
    ink.value->>'inkLabel',
    NULLIF(ink.value->>'coveragePct', '')::numeric,
    COALESCE((ink.value->>'active')::boolean, true)
FROM flexo_calculations fc
CROSS JOIN LATERAL jsonb_array_elements(fc.ui_state->'types') WITH ORDINALITY AS elem(value, ordinality)
CROSS JOIN LATERAL jsonb_array_elements(elem.value->'inkStations') WITH ORDINALITY AS ink(value, ordinality)
WHERE elem.ordinality > 1
  AND jsonb_typeof(elem.value->'inkStations') = 'array'
  AND ink.value->>'inkType' IN ('cmyk', 'blanco', 'pantone')
ON CONFLICT (quote_code, line_code, motivo_indice, estacion_indice) DO NOTHING;

-- ============================================================================
-- 4. Vincular estaciones tipo "pantone" al catálogo tintas.pantones_biblioteca
--    por coincidencia de texto (etiqueta escrita libremente hasta ahora).
--    Lo que no calce queda con pantone_id NULL — no se inventa un match.
-- ============================================================================
UPDATE calculo_motivo_tintas t
SET pantone_id = pb.id
FROM tintas.pantones_biblioteca pb
WHERE t.tipo_tinta = 'pantone'
  AND t.pantone_id IS NULL
  AND t.etiqueta IS NOT NULL
  AND (
      upper(trim(t.etiqueta)) = upper(pb.codigo_pantone)
      OR upper(trim(t.etiqueta)) = upper(pb.nombre)
      OR upper(trim(t.etiqueta)) LIKE '%' || upper(pb.codigo_pantone) || '%'
  );
