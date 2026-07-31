-- Migración: Agregar columnas propias a flexo_calculations
-- Fase 2: Extraer campos críticos de raw_data a columnas

-- Datos del cliente y trabajo
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS salesperson_name TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS job_name TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Flexografia';
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS line_status TEXT;

-- Especificaciones de la etiqueta
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS width_inches NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS length_inches NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS labels_per_roll NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS quantity_types NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS quantity_changes NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS core_width NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS core_diameter TEXT;

-- Configuración
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS cmyk_enabled BOOLEAN DEFAULT false;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS application_type TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS surface_type TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS output_type TEXT;

-- Resultados del cálculo
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS industrial_subtotal NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS overhead_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS prepress_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS design_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,4);

-- Estado UI (para el frontend)
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS ui_state JSONB;

-- Timestamp de última actualización
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_fc_customer_name ON flexo_calculations(customer_name);
CREATE INDEX IF NOT EXISTS idx_fc_line_status ON flexo_calculations(line_status);
CREATE INDEX IF NOT EXISTS idx_fc_job_name ON flexo_calculations(job_name);

COMMENT ON TABLE flexo_calculations IS 'Cálculos de cotización flexográfica. Columnas = fuente de verdad. raw_data = cache de UI.';
