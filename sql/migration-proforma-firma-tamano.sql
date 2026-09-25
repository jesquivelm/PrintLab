-- Migración: Tamaño y posición de Firma del Vendedor en proformas.
ALTER TABLE quote_proformas DROP COLUMN IF EXISTS firma_tamano;
ALTER TABLE quote_proformas ADD COLUMN IF NOT EXISTS firma_ancho NUMERIC(6,2) DEFAULT 160;
ALTER TABLE quote_proformas ADD COLUMN IF NOT EXISTS firma_alto NUMERIC(6,2) DEFAULT 100;
ALTER TABLE quote_proformas ADD COLUMN IF NOT EXISTS firma_offset_x NUMERIC(6,2) DEFAULT 0;
ALTER TABLE quote_proformas ADD COLUMN IF NOT EXISTS firma_offset_y NUMERIC(6,2) DEFAULT 35;
ALTER TABLE quote_proformas ALTER COLUMN firma_alto SET DEFAULT 100;
ALTER TABLE quote_proformas ALTER COLUMN firma_offset_y SET DEFAULT 35;
-- Preferencia por usuario del vendedor (se guarda al posicionar su firma).
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS firma_ancho NUMERIC(6,2);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS firma_alto NUMERIC(6,2);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS firma_offset_x NUMERIC(6,2);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS firma_offset_y NUMERIC(6,2);