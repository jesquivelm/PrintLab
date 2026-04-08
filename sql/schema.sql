CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    records_imported INTEGER NOT NULL DEFAULT 0,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS business_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT UNIQUE,
    prospect_code TEXT,
    partner_name TEXT,
    salesperson_name TEXT,
    tax_id TEXT,
    email TEXT,
    email_facturacion TEXT,
    currency_code TEXT,
    payment_terms TEXT,
    sector TEXT,
    sub_sector TEXT,
    is_tax_exempt BOOLEAN,
    allowed_percentage NUMERIC(12,4),
    client_type TEXT,
    creation_date DATE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_partner_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT,
    contact_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    fax TEXT,
    position TEXT,
    is_legal_representative BOOLEAN,
    country TEXT,
    state_province TEXT,
    county TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_partner_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT,
    address_name TEXT,
    address_type TEXT,
    country TEXT,
    state_province TEXT,
    county TEXT,
    district TEXT,
    address_line TEXT,
    zip_code TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_key TEXT UNIQUE,
    machine_name TEXT,
    brand TEXT,
    model TEXT,
    process TEXT,
    subprocess TEXT,
    category TEXT,
    work_unit TEXT,
    setup_base_minutes NUMERIC(12,4),
    setup_per_station_minutes NUMERIC(12,4),
    setup_extra_minutes NUMERIC(12,4),
    production_speed NUMERIC(12,4),
    hourly_machine_cost NUMERIC(12,4),
    hourly_operator_cost NUMERIC(12,4),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code TEXT UNIQUE,
    material_name TEXT,
    display_name TEXT,
    presentation_type TEXT,
    provider TEXT,
    width_inches NUMERIC(12,4),
    length_value NUMERIC(12,4),
    cost_per_kg_usd NUMERIC(12,4),
    cost_per_linear_meter_usd NUMERIC(12,4),
    cost_per_unit_usd NUMERIC(12,4),
    active BOOLEAN,
    digital_enabled BOOLEAN,
    conventional_enabled BOOLEAN,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_dies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    die_code TEXT UNIQUE,
    description TEXT,
    category TEXT,
    dimensions TEXT,
    teeth NUMERIC(12,4),
    rows_count NUMERIC(12,4),
    repetitions NUMERIC(12,4),
    material_width NUMERIC(12,4),
    status TEXT,
    use_digital BOOLEAN,
    use_conventional BOOLEAN,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT UNIQUE,
    line_code TEXT,
    quote_code TEXT,
    client_code TEXT,
    client_name TEXT,
    product_name TEXT,
    product_type TEXT,
    department TEXT,
    material_name TEXT,
    quoted_machine TEXT,
    die_code TEXT,
    quantity_products NUMERIC(14,4),
    quantity_types NUMERIC(14,4),
    tint_count NUMERIC(14,4),
    width_inches NUMERIC(12,4),
    length_inches NUMERIC(12,4),
    price_unit NUMERIC(14,4),
    total_price NUMERIC(14,4),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_cost_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT NOT NULL DEFAULT 'default',
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code TEXT UNIQUE,
    customer_code TEXT,
    customer_name TEXT,
    contact_name TEXT,
    email TEXT,
    salesperson_name TEXT,
    phone TEXT,
    status TEXT,
    created_on DATE,
    due_on DATE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code TEXT REFERENCES quotes(quote_code) ON DELETE CASCADE,
    line_code TEXT UNIQUE,
    department TEXT,
    job_name TEXT,
    material_name TEXT,
    status TEXT,
    subtotal_1 NUMERIC(14,4),
    subtotal_2 NUMERIC(14,4),
    subtotal_3 NUMERIC(14,4),
    subtotal_4 NUMERIC(14,4),
    hidden_flag BOOLEAN,
    optional_flag BOOLEAN,
    proof_flag BOOLEAN,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_code TEXT UNIQUE,
    quote_code TEXT,
    line_code TEXT,
    product_code TEXT,
    customer_code TEXT,
    process_type TEXT,
    machine_name TEXT,
    die_code TEXT,
    material_code TEXT,
    quantity NUMERIC(14,4),
    subtotal_cost NUMERIC(14,4),
    total_cost NUMERIC(14,4),
    unit_price NUMERIC(14,6),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flexo_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE,
    quote_code TEXT,
    line_code TEXT,
    product_code TEXT,
    machine_name TEXT,
    material_code TEXT,
    die_code TEXT,
    ordered_quantity NUMERIC(14,4),
    delivered_on DATE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_partners_name ON business_partners(partner_name);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_code ON quotes(customer_code);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_code ON quote_lines(quote_code);
CREATE INDEX IF NOT EXISTS idx_flexo_calculations_quote_code ON flexo_calculations(quote_code);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_quote_code ON flexo_orders(quote_code);