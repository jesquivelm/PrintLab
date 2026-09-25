-- Migración: merma de ajuste (setup waste) de pies a metros.
-- Renombra setup_waste_feet -> setup_waste_meters en costo_finish_waste y
-- costo_inline_finish_setup, convirtiendo los valores existentes (pies * 0.3048 = metros).

ALTER TABLE costo_finish_waste
  RENAME COLUMN setup_waste_feet TO setup_waste_meters;

UPDATE costo_finish_waste
  SET setup_waste_meters = ROUND(setup_waste_meters * 0.3048, 4);

ALTER TABLE costo_inline_finish_setup
  RENAME COLUMN setup_waste_feet TO setup_waste_meters;

UPDATE costo_inline_finish_setup
  SET setup_waste_meters = ROUND(setup_waste_meters * 0.3048, 4);

ALTER TABLE costo_macula_montaje
  RENAME COLUMN total_pies TO total_metros;

UPDATE costo_macula_montaje
  SET total_metros = ROUND(total_metros * 0.3048, 4);
