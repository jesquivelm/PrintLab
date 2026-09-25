-- Renombra la columna de merma de arranque de Costos -> Acabados a un nombre en espanol,
-- consistente con el resto del sistema (ya en metros, sin datos reales que perder: todo en 0).

ALTER TABLE costo_finish_waste RENAME COLUMN setup_waste_meters TO merma_setup_metros;
ALTER TABLE costo_inline_finish_setup RENAME COLUMN setup_waste_meters TO merma_setup_metros;
