-- Aprobación de la configuración de estaciones MES (tinta/anilox por estación de Impresión).
-- Mismo patrón que diseno_aprobado_por/en y tintas_aprobado_por/en.
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estaciones_aprobado_por TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estaciones_aprobado_en TIMESTAMPTZ;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS estaciones_aprobado_por TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS estaciones_aprobado_en TIMESTAMPTZ;
