-- Migración: columnas de detalle de tipos o motivos y costo por cambio
-- Agrega columnas tipadas a las tablas compartidas (flexo_calculations, flexo_products, flexo_orders).

-- Cantidades derivadas de tipos o motivos
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS quantity_changes_by_types NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS quantity_changes_total NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS quantity_changes_by_types NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS quantity_changes_total NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS quantity_changes_by_types NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS quantity_changes_total NUMERIC(14,4);

-- Configuración de costo por cambio (flexo_calculations)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_time_minutes NUMERIC(8,2);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_machine_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_labor_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_operators INTEGER;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_waste_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS change_additional_prep_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_time_minutes NUMERIC(8,2);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_machine_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_labor_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_operators INTEGER;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_waste_cost NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS change_additional_prep_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_time_minutes NUMERIC(8,2);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_machine_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_labor_hour_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_operators INTEGER;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_waste_cost NUMERIC(14,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS change_additional_prep_cost NUMERIC(14,4);

-- Detalle de tipos o motivos (flexo_calculations)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS types_detail JSONB;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS types_detail JSONB;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS types_detail JSONB;
