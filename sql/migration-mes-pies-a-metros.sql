-- Fase 1: Pasar de pies/fpm a metros/min en velocidad de maquina y mermas del cierre de orden (MES).
--
-- production_machine_profiles.nominal_speed_fpm: se verifico contra maquina_capacidad.velocidad_produccion
-- (fuente real, ya en m/min) y los valores guardados ya eran metros/min pese al nombre de la columna.
-- Por eso aqui SOLO se renombra, no se convierte (convertir corromperia el dato real).
ALTER TABLE production_machine_profiles RENAME COLUMN nominal_speed_fpm TO velocidad_nominal_m_min;

-- production_waste_logs estaba vacia al momento de esta migracion: se renombra sin necesidad de convertir filas.
ALTER TABLE production_waste_logs RENAME COLUMN feet_consumed TO metros_consumidos;
ALTER TABLE production_waste_logs RENAME COLUMN setup_waste_feet TO merma_setup_metros;
ALTER TABLE production_waste_logs RENAME COLUMN run_waste_feet TO merma_tiraje_metros;
ALTER TABLE production_waste_logs RENAME COLUMN useful_feet TO metros_utiles;
ALTER TABLE production_waste_logs RENAME COLUMN final_speed_fpm TO velocidad_final_m_min;
