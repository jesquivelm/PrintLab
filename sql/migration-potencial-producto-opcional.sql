-- =============================================================================
-- Migración: Potencial Comercial — producto opcional
-- La columna producto_nombre deja de ser obligatoria: la descripción pasa a ser
-- el campo identificador de cada línea de potencial comercial.
-- =============================================================================

ALTER TABLE potencial_lineas
    ALTER COLUMN producto_nombre DROP NOT NULL;