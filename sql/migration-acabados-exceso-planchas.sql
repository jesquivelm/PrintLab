-- Migración: agrega Exceso Planchas (margen que el proveedor externo suma al desarrollo de
-- troquel y al ancho de material para dimensionar cada plancha, en pulgadas) a
-- Costos > Acabados > Estándar. Idempotente.

ALTER TABLE costo_general
    ADD COLUMN IF NOT EXISTS acabados_exceso_planchas_in NUMERIC(10,2) NOT NULL DEFAULT 0.50;
