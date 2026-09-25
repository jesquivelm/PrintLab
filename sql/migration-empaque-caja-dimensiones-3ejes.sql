-- Dimensiones de la Caja pasa de un solo campo de texto libre a tres campos numéricos
-- (Largo/Ancho/Alto, cm), igual al resto de campos de captura de Empaque. El campo
-- combinado empaque_caja_dimensiones_vigente queda huérfano (nunca tuvo datos reales
-- capturados por un operador) y no se usa más desde el código.
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_caja_largo_vigente_cm NUMERIC(10,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_caja_ancho_vigente_cm NUMERIC(10,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_caja_alto_vigente_cm NUMERIC(10,2);

ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_caja_largo_vigente_cm NUMERIC(10,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_caja_ancho_vigente_cm NUMERIC(10,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_caja_alto_vigente_cm NUMERIC(10,2);
