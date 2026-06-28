CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS production_process_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_key TEXT NOT NULL UNIQUE,
    process_name TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    color_hex TEXT NOT NULL DEFAULT '#378ADD',
    icon_key TEXT,
    is_parallel BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_context TEXT NOT NULL DEFAULT 'erp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_machine_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES maquina(id) ON DELETE CASCADE,
    machine_capacity_id UUID REFERENCES maquina_capacidad(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    process_key TEXT NOT NULL,
    process_name TEXT NOT NULL,
    nominal_speed_fpm NUMERIC(12,4) NOT NULL DEFAULT 0,
    setup_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
    setup_per_station_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
    hourly_machine_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    hourly_operator_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    oee_target NUMERIC(8,4) NOT NULL DEFAULT 0.85,
    max_web_width_in NUMERIC(12,4),
    min_web_width_in NUMERIC(12,4),
    supports_die_cut BOOLEAN NOT NULL DEFAULT FALSE,
    supports_varnish_uv BOOLEAN NOT NULL DEFAULT FALSE,
    supports_lamination BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (machine_capacity_id)
);

CREATE TABLE IF NOT EXISTS production_order_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    quote_code TEXT,
    line_code TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    process_key TEXT NOT NULL,
    process_name TEXT NOT NULL,
    machine_profile_id UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
    planned_start_at TIMESTAMPTZ,
    planned_end_at TIMESTAMPTZ,
    start_turn_hour NUMERIC(8,4),
    duration_hours NUMERIC(8,4),
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    dependency_route_id UUID REFERENCES production_order_routes(id) ON DELETE SET NULL,
    transition_cost_min INTEGER NOT NULL DEFAULT 0,
    route_status TEXT NOT NULL DEFAULT 'PENDIENTE',
    source_mode TEXT NOT NULL DEFAULT 'auto',
    route_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_code, sequence_order)
);

CREATE TABLE IF NOT EXISTS production_stop_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_group TEXT NOT NULL,
    reason_code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_route_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
    operator_name TEXT,
    event_type TEXT NOT NULL,
    stop_reason_id UUID REFERENCES production_stop_reasons(id) ON DELETE SET NULL,
    notes TEXT,
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
    feet_consumed NUMERIC(14,4) DEFAULT 0,
    setup_waste_feet NUMERIC(14,4) DEFAULT 0,
    run_waste_feet NUMERIC(14,4) DEFAULT 0,
    useful_feet NUMERIC(14,4) GENERATED ALWAYS AS (COALESCE(feet_consumed,0) - COALESCE(setup_waste_feet,0) - COALESCE(run_waste_feet,0)) STORED,
    final_speed_fpm NUMERIC(12,4),
    anilox_line TEXT,
    cylinder_pressure TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_order_routes_order ON production_order_routes(order_code, sequence_order);
CREATE INDEX IF NOT EXISTS idx_production_order_routes_capacity ON production_order_routes(route_status, process_key, machine_profile_id);
CREATE INDEX IF NOT EXISTS idx_production_route_events_route ON production_route_events(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_waste_logs_route ON production_waste_logs(route_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- FASE 1: CALENDARIO DE RECURSOS (Finite Capacity Planning)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS resource_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_name TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL DEFAULT 'machine',
    resource_id UUID,
    resource_name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Costa_Rica',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES resource_calendars(id) ON DELETE CASCADE,
    shift_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_hour NUMERIC(5,2) NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
    end_hour NUMERIC(5,2) NOT NULL CHECK (end_hour > 0 AND end_hour <= 24),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (calendar_id, shift_name, day_of_week)
);

CREATE TABLE IF NOT EXISTS resource_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES resource_calendars(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type TEXT NOT NULL DEFAULT 'closure',
    description TEXT,
    override_start_hour NUMERIC(5,2),
    override_end_hour NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (calendar_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_resource_shifts_calendar ON resource_shifts(calendar_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_resource_calendar_exceptions_calendar ON resource_calendar_exceptions(calendar_id, exception_date);

CREATE TABLE IF NOT EXISTS production_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_code TEXT NOT NULL UNIQUE,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT 'process',
    process_key TEXT NOT NULL DEFAULT '',
    machine_profile_id UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
    calendar_id UUID REFERENCES resource_calendars(id) ON DELETE SET NULL,
    capacity_units NUMERIC(8,2) NOT NULL DEFAULT 1,
    efficiency_factor NUMERIC(8,4) NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_resource_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES production_resources(id) ON DELETE CASCADE,
    process_key TEXT NOT NULL,
    proficiency NUMERIC(8,4) NOT NULL DEFAULT 1,
    max_parallel_jobs INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource_id, process_key)
);

CREATE TABLE IF NOT EXISTS production_capacity_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_capacity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type TEXT NOT NULL DEFAULT 'automatic',
    scenario_id UUID REFERENCES production_capacity_scenarios(id) ON DELETE SET NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    input_hash TEXT NOT NULL DEFAULT '',
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_resources_process ON production_resources(process_key, is_active);
CREATE INDEX IF NOT EXISTS idx_production_resource_skills_process ON production_resource_skills(process_key, is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_created ON production_capacity_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_period ON production_capacity_snapshots(from_date, to_date);

-- ═══════════════════════════════════════════════════════════════════
-- FASE: HISTORIAL DE CONFIGURACIÓN DE ESTACIONES (MES)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_station_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    product_code TEXT,
    machine_name TEXT,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 8),
    ink_type TEXT NOT NULL DEFAULT 'empty',
    viscosity NUMERIC(8,2),
    temperature NUMERIC(8,2),
    anilox_code TEXT,
    pantone_ref TEXT,
    barniz_tipo TEXT,
    barniz_zonif TEXT,
    barniz_zona TEXT,
    uv_power TEXT,
    uv_temp TEXT,
    operator_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_station_configs_order ON production_station_configs(order_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_station_configs_product ON production_station_configs(product_code, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- ESPECIFICACIONES TÉCNICAS DE MÁQUINAS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_machine_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_profile_id UUID NOT NULL REFERENCES production_machine_profiles(id) ON DELETE CASCADE,
    spec_group TEXT NOT NULL DEFAULT 'dimensiones',
    spec_key TEXT NOT NULL,
    spec_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (machine_profile_id, spec_key)
);

CREATE INDEX IF NOT EXISTS idx_production_machine_specs_profile ON production_machine_specs(machine_profile_id, spec_group);
