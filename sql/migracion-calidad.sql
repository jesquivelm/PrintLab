-- sql/migracion-calidad.sql
-- Módulo de Control de Calidad: Órdenes de Calidad y Documentos de Calidad

CREATE TABLE IF NOT EXISTS calidad_tipos_defecto (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calidad_ordenes (
    id SERIAL PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    orden_produccion_codigo TEXT,
    cliente_codigo TEXT,
    cliente_nombre TEXT,
    fecha_deteccion DATE NOT NULL DEFAULT CURRENT_DATE,
    detectado_por TEXT,
    descripcion_general TEXT,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','EN_INVESTIGACION','ACCION_CORRECTIVA_DEFINIDA','CERRADA')),
    accion_correctiva TEXT,
    accion_preventiva TEXT,
    responsable_accion TEXT,
    fecha_limite_accion DATE,
    fecha_cierre TIMESTAMPTZ,
    cerrado_por TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_calidad_ordenes_orden_produccion ON calidad_ordenes(orden_produccion_codigo);

CREATE TABLE IF NOT EXISTS calidad_orden_lineas (
    id SERIAL PRIMARY KEY,
    orden_calidad_id INTEGER NOT NULL REFERENCES calidad_ordenes(id) ON DELETE CASCADE,
    producto_codigo TEXT,
    linea_codigo TEXT,
    sustrato TEXT,
    ancho NUMERIC(12,4),
    largo NUMERIC(12,4),
    diametro_core TEXT,
    cantidad_tintas INTEGER,
    tinta_blanca BOOLEAN,
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    troquelado_forma TEXT,
    numerado_tipo TEXT,
    rebobinado_notas TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calidad_orden_lineas_orden ON calidad_orden_lineas(orden_calidad_id);

CREATE TABLE IF NOT EXISTS calidad_orden_linea_pantones (
    id SERIAL PRIMARY KEY,
    orden_linea_id INTEGER NOT NULL REFERENCES calidad_orden_lineas(id) ON DELETE CASCADE,
    pantone_codigo TEXT NOT NULL,
    color_referencia TEXT,
    densidad NUMERIC(10,4),
    anilox_codigo TEXT
);

CREATE TABLE IF NOT EXISTS calidad_orden_linea_defectos (
    id SERIAL PRIMARY KEY,
    orden_linea_id INTEGER NOT NULL REFERENCES calidad_orden_lineas(id) ON DELETE CASCADE,
    tipo_defecto_id INTEGER REFERENCES calidad_tipos_defecto(id),
    descripcion TEXT,
    area_responsable TEXT,
    persona_responsable TEXT
);

CREATE TABLE IF NOT EXISTS calidad_documentos (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('cartilla_color','ficha_tecnica','certificado_calidad')),
    orden_produccion_codigo TEXT NOT NULL,
    producto_codigo TEXT,
    version INTEGER NOT NULL,
    generado_por TEXT,
    generado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sustrato TEXT,
    ancho NUMERIC(12,4),
    largo NUMERIC(12,4),
    diametro_core TEXT,
    cantidad_tintas INTEGER,
    tinta_blanca BOOLEAN,
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    troquelado_forma TEXT,
    numerado_tipo TEXT,
    rebobinado_notas TEXT,
    cantidad_aprobada NUMERIC(14,4),
    cantidad_rechazada NUMERIC(14,4),
    resultado_inspeccion TEXT,
    observaciones TEXT,
    inspeccionado_por TEXT,
    fecha_inspeccion DATE
);
CREATE INDEX IF NOT EXISTS idx_calidad_documentos_orden ON calidad_documentos(orden_produccion_codigo, tipo, producto_codigo);

CREATE TABLE IF NOT EXISTS calidad_documento_pantones (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES calidad_documentos(id) ON DELETE CASCADE,
    pantone_codigo TEXT NOT NULL,
    color_referencia TEXT,
    receta_referencia TEXT,
    densidad_objetivo NUMERIC(10,4),
    anilox_codigo TEXT
);

INSERT INTO calidad_tipos_defecto (nombre) VALUES
    ('Registro'),
    ('Densidad de Tinta Incorrecta'),
    ('Pantone Fuera de Tolerancia'),
    ('Manchado / Mota'),
    ('Rayado'),
    ('Pinholing'),
    ('Migración / Adherencia de Tinta'),
    ('Burbujas / Delaminación'),
    ('Cobertura Despareja de Barniz'),
    ('Troquelado Desalineado'),
    ('Rebaba de Corte'),
    ('Telescoping / Arrugas de Rebobinado'),
    ('Numerado Ilegible o Faltante'),
    ('Dimensiones Fuera de Tolerancia'),
    ('Contaminación / Partículas'),
    ('Otro')
ON CONFLICT (nombre) DO NOTHING;
