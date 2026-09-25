-- Amplía production_station_configs de 8 a 10 estaciones (9 reales de tinta/barniz/goma + Troquel).
ALTER TABLE production_station_configs DROP CONSTRAINT IF EXISTS production_station_configs_slot_number_check;
ALTER TABLE production_station_configs ADD CONSTRAINT production_station_configs_slot_number_check CHECK (slot_number BETWEEN 1 AND 10);
-- Estado de la lámpara UV por estación (manual para tinta/barniz, automático al asignar goma).
ALTER TABLE production_station_configs ADD COLUMN IF NOT EXISTS lamp_on BOOLEAN DEFAULT false;
