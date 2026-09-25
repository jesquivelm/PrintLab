-- ============================================================================
-- PRINTLAB ERP - Migración: Identificación (tax_id) única por socio
-- ============================================================================
-- Evita que dos socios (business_partners) tengan la misma identificación
-- fiscal, sin importar el formato (espacios, guiones, mayúsculas/minúsculas).
-- Se excluye el valor placeholder "000000000000" (sin identificación real).
--
-- IMPORTANTE: si esta migración falla con "could not create unique index",
-- significa que ya existen socios duplicados por identificación en la BD.
-- Esos casos deben resolverse manualmente (fusionar o marcar cuál registro
-- queda activo) antes de poder aplicar esta restricción.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_partners_tax_id_unique
    ON business_partners (regexp_replace(UPPER(COALESCE(tax_id, '')), '[^A-Z0-9]', '', 'g'))
    WHERE tax_id IS NOT NULL
      AND TRIM(tax_id) <> ''
      AND regexp_replace(UPPER(COALESCE(tax_id, '')), '[^A-Z0-9]', '', 'g') !~ '^0+$';
