ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS rebobinado_empalmes_maximo NUMERIC(10,0);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS rebobinado_empalmes_maximo NUMERIC(10,0);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS rebobinado_empalmes_maximo NUMERIC(10,0);