-- Actualización: Agregar campo area_cm2 a troqueles
-- Fecha: 28 abril 2026

-- 1. Agregar columna area_cm2 a flexo_dies
ALTER TABLE flexo_dies ADD COLUMN IF NOT EXISTS area_cm2 DECIMAL(12,4) DEFAULT 0;

-- 2. Trigger para calcular automáticamente el área
CREATE OR REPLACE FUNCTION calcular_area_troquel() RETURNS TRIGGER AS $$
BEGIN
    -- Convertir mm a cm (dividir por 10) y calcular área
    NEW.area_cm2 = ROUND(COALESCE(NEW.ancho_mm, 0) / 10.0 * COALESCE(NEW.largo_mm, 0) / 10.0, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el trigger
DROP TRIGGER IF EXISTS trigger_area_troquel ON flexo_dies;
CREATE TRIGGER trigger_area_troquel
    BEFORE INSERT OR UPDATE OF ancho_mm, largo_mm
    ON flexo_dies
    FOR EACH ROW EXECUTE FUNCTION calcular_area_troquel();

-- 4. Actualizar áreas existentes
UPDATE flexo_dies 
SET area_cm2 = ROUND(ancho_mm / 10.0 * largo_mm / 10.0, 4)
WHERE area_cm2 IS NULL OR area_cm2 = 0;

-- 5. Agregar comentario
COMMENT ON COLUMN flexo_dies.area_cm2 IS 'Área del troquel en cm² (calculada automáticamente: ancho_mm/10 × largo_mm/10)';

-- 6. Verificar resultados
-- SELECT die_code, descripcion, ancho_mm, largo_mm, area_cm2 FROM flexo_dies LIMIT 10;
