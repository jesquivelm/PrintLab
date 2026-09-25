-- Cantidad de etiquetas del rollo remanente (huerfano) que deja Rebobinado, capturada por
-- el operario de Rebobinado (su maquina puede contarlas). Empaque la consume en vez de
-- adivinarla. Solo en producto y orden (captura de produccion, no existe en el cotizado).
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_etiquetas_rollo_remanente_vigente NUMERIC(14,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS rebobinado_etiquetas_rollo_remanente_vigente NUMERIC(14,2);
