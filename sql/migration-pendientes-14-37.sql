-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Puntos 14-37 — Tablas de producción, seguimiento e inventario
-- Fecha: 2026-08-23
-- ═══════════════════════════════════════════════════════════════

-- ── Puntos 14-15: Trabajos de diseño y preprensa ──
CREATE TABLE IF NOT EXISTS production_prepress_jobs (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    route_id UUID REFERENCES production_order_routes(id),
    proceso TEXT NOT NULL,
    tipo_trabajo TEXT NOT NULL DEFAULT 'general',
    descripcion TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    completado BOOLEAN NOT NULL DEFAULT false,
    completado_por TEXT,
    completado_en TIMESTAMPTZ,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prepress_jobs_order ON production_prepress_jobs(order_code);
CREATE INDEX IF NOT EXISTS idx_prepress_jobs_route ON production_prepress_jobs(route_id);

-- ── Punto 17: Seguimiento del visto bueno ──
CREATE TABLE IF NOT EXISTS production_approval_tracking (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    route_id UUID REFERENCES production_order_routes(id),
    tipo_accion TEXT NOT NULL,
    descripcion TEXT,
    contacto_nombre TEXT,
    contacto_telefono TEXT,
    contacto_correo TEXT,
    resultado TEXT,
    registrado_por TEXT,
    registrado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_tracking_order ON production_approval_tracking(order_code);

-- ── Punto 23: Seguimiento de planchas y troqueles ──
CREATE TABLE IF NOT EXISTS production_tooling_tracking (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    route_id UUID REFERENCES production_order_routes(id),
    tipo_herramental TEXT NOT NULL,
    accion TEXT NOT NULL,
    descripcion TEXT,
    responsable TEXT,
    fecha_estimada DATE,
    fecha_real TIMESTAMPTZ,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tooling_tracking_order ON production_tooling_tracking(order_code);

-- ── Puntos 26-28: Rebobinado — ejecución y cores ──
CREATE TABLE IF NOT EXISTS production_rewind_execution (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    route_id UUID REFERENCES production_order_routes(id),
    machine_name TEXT,
    operator_name TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    total_rolls INTEGER DEFAULT 0,
    total_feet NUMERIC(12,2) DEFAULT 0,
    waste_feet NUMERIC(12,2) DEFAULT 0,
    core_used TEXT,
    cores_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_rewind_rolls (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES production_rewind_execution(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    roll_number INTEGER NOT NULL,
    products_per_roll INTEGER DEFAULT 0,
    feet NUMERIC(12,2) DEFAULT 0,
    diameter_mm NUMERIC(8,2),
    core_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewind_rolls_exec ON production_rewind_rolls(execution_id);
CREATE INDEX IF NOT EXISTS idx_rewind_rolls_order ON production_rewind_rolls(order_code);

-- ── Puntos 29-30: Empaque — ejecución y cajas ──
CREATE TABLE IF NOT EXISTS production_packaging_execution (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    route_id UUID REFERENCES production_order_routes(id),
    operator_name TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    total_boxes INTEGER DEFAULT 0,
    total_pallets INTEGER DEFAULT 0,
    boxes_per_pallet INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_packaging_boxes (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES production_packaging_execution(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    box_number INTEGER NOT NULL,
    products_per_box NUMERIC(12,2) DEFAULT 0,
    rolls_per_box INTEGER DEFAULT 0,
    is_partial BOOLEAN DEFAULT false,
    weight_kg NUMERIC(8,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packaging_boxes_exec ON production_packaging_boxes(execution_id);
CREATE INDEX IF NOT EXISTS idx_packaging_boxes_order ON production_packaging_boxes(order_code);

-- ── Puntos 33-37: Inventario de producto terminado — estructura jerárquica ──
-- Tabla de vinculación producto → rollo → caja → tarima
CREATE TABLE IF NOT EXISTS inventory_finished_goods (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    product_code TEXT,
    quote_code TEXT,
    line_code TEXT,
    customer_name TEXT,
    -- Rollo
    roll_number INTEGER,
    roll_feet NUMERIC(12,2),
    roll_products INTEGER,
    -- Caja
    box_number INTEGER,
    products_per_box NUMERIC(12,2),
    rolls_per_box INTEGER DEFAULT 1,
    is_partial_box BOOLEAN DEFAULT false,
    -- Tarima
    pallet_number INTEGER,
    boxes_per_pallet INTEGER,
    -- Inventario
    quantity_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_available NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_reserved NUMERIC(12,2) DEFAULT 0,
    quantity_dispatched NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'disponible', -- 'disponible', 'reservado', 'despachado', 'agotado', 'danado'
    warehouse_code TEXT,
    location_code TEXT,
    -- Trazabilidad
    registered_by TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_movement_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fg_order ON inventory_finished_goods(order_code);
CREATE INDEX IF NOT EXISTS idx_fg_product ON inventory_finished_goods(product_code);
CREATE INDEX IF NOT EXISTS idx_fg_status ON inventory_finished_goods(status);
CREATE INDEX IF NOT EXISTS idx_fg_customer ON inventory_finished_goods(customer_name);

-- ── Movimientos de inventario producto terminado ──
CREATE TABLE IF NOT EXISTS inventory_finished_goods_movements (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory_finished_goods(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    tipo_movimiento TEXT NOT NULL, -- 'entrada', 'salida', 'reserva', 'liberacion', 'ajuste', 'merma', 'transferencia'
    quantity NUMERIC(12,2) NOT NULL,
    quantity_before NUMERIC(12,2),
    quantity_after NUMERIC(12,2),
    motivo TEXT,
    documento_tipo TEXT,
    documento_id TEXT,
    performed_by TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fg_movements_inv ON inventory_finished_goods_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_fg_movements_order ON inventory_finished_goods_movements(order_code);
