-- Reversa de migration-mes-pies-a-metros.sql.

ALTER TABLE production_machine_profiles RENAME COLUMN velocidad_nominal_m_min TO nominal_speed_fpm;

ALTER TABLE production_waste_logs RENAME COLUMN metros_consumidos TO feet_consumed;
ALTER TABLE production_waste_logs RENAME COLUMN merma_setup_metros TO setup_waste_feet;
ALTER TABLE production_waste_logs RENAME COLUMN merma_tiraje_metros TO run_waste_feet;
ALTER TABLE production_waste_logs RENAME COLUMN metros_utiles TO useful_feet;
ALTER TABLE production_waste_logs RENAME COLUMN velocidad_final_m_min TO final_speed_fpm;
