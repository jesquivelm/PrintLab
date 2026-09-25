-- =============================================================================
-- Migración: Potencial Comercial de Socios/Prospectos
-- Crea las tablas necesarias para estimar potencial comercial, comparar contra
-- ventas reales y dejar estructura preparada para historial importado.
-- =============================================================================

CREATE TABLE IF NOT EXISTS potencial_comercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL UNIQUE,
    moneda TEXT NOT NULL DEFAULT 'USD',
    potencial_anual_calculado NUMERIC(16,4) NOT NULL DEFAULT 0,
    probabilidad_conversion NUMERIC(5,2) NOT NULL DEFAULT 0,
    forecast_calculado NUMERIC(16,4) NOT NULL DEFAULT 0,
    potencial_inicial_total NUMERIC(16,4) NOT NULL DEFAULT 0,
    forecast_inicial NUMERIC(16,4) NOT NULL DEFAULT 0,
    fecha_estimacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_creacion TEXT NOT NULL DEFAULT '',
    metodo_calculo TEXT NOT NULL DEFAULT 'VOLUMEN_PRECIO_FRECUENCIA',
    ajuste_monto NUMERIC(16,4),
    ajuste_motivo TEXT,
    ajuste_usuario TEXT,
    ajuste_fecha TIMESTAMPTZ,
    fecha_conversion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_potencial_comercial_socio FOREIGN KEY (partner_id)
        REFERENCES business_partners (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_potencial_comercial_partner
    ON potencial_comercial (partner_id);

CREATE TABLE IF NOT EXISTS potencial_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL,
    producto_nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    unidad_medida TEXT NOT NULL DEFAULT 'unidades',
    volumen_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
    frecuencia TEXT NOT NULL DEFAULT 'MENSUAL',
    frecuencia_anual NUMERIC(6,2) NOT NULL DEFAULT 12,
    precio_estimado NUMERIC(16,6) NOT NULL DEFAULT 0,
    moneda TEXT NOT NULL DEFAULT 'COP',
    estacionalidad TEXT NOT NULL DEFAULT 'SIN_ESTACIONALIDAD',
    observaciones TEXT NOT NULL DEFAULT '',
    valor_estimado_compra NUMERIC(16,4) NOT NULL DEFAULT 0,
    valor_mensual_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
    valor_anual_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
    usuario_creacion TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_potencial_lineas_socio FOREIGN KEY (partner_id)
        REFERENCES business_partners (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_potencial_lineas_partner ON potencial_lineas (partner_id);
CREATE INDEX IF NOT EXISTS idx_potencial_lineas_producto ON potencial_lineas (LOWER(producto_nombre));

CREATE TABLE IF NOT EXISTS historial_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    monto_total NUMERIC(16,4) NOT NULL DEFAULT 0,
    moneda TEXT NOT NULL DEFAULT 'COP',
    fuente TEXT NOT NULL DEFAULT 'ERP',
    referencia TEXT NOT NULL DEFAULT '',
    observaciones TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_historial_ventas_socio FOREIGN KEY (partner_id)
        REFERENCES business_partners (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_ventas_partner
    ON historial_ventas (partner_id, periodo_inicio DESC);