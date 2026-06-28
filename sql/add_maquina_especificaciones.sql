-- Add especificaciones JSONB column to maquina table
-- Stores technical specifications for machine inventory

ALTER TABLE maquina ADD COLUMN IF NOT EXISTS especificaciones JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN maquina.especificaciones IS 'Especificaciones técnicas de la máquina (dimensiones, tecnología, eléctrico, etc.)';
