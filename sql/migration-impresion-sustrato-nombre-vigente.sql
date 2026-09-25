-- Columna vigente para el sustrato realmente utilizado en Impresión (antes solo se mostraba el
-- nombre cotizado sin poder corregirlo si la planta usó un material distinto al cotizado).
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS impresion_sustrato_nombre_vigente TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS impresion_sustrato_nombre_vigente TEXT;
