-- Migración: Control de parámetros de calidad — Objetivo / Tolerancia / Real / Estado.
-- Cada parámetro crítico (viscosidad, pH, ΔE, registro, densidad, dyne, brillo, opacidad de
-- blanco, etc.) guarda su objetivo, su tolerancia (min/max), el valor real medido en planta y
-- un estado calculado: OK (dentro de tolerancia), BORDE (cerca del límite), FUERA.
-- El "control de blanco" no es una estructura aparte: son parámetros con grupo = 'blanco'.

-- Catálogo de parámetros estándar + tolerancias por defecto (editable en Configuración).
CREATE TABLE IF NOT EXISTS calidad_parametros_catalogo (
    id SERIAL PRIMARY KEY,
    clave TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    grupo TEXT NOT NULL DEFAULT 'impresion',   -- impresion | color | blanco | sustrato | acabado
    unidad TEXT DEFAULT '',
    objetivo_defecto NUMERIC(14,4),
    tolerancia_min_defecto NUMERIC(14,4),
    tolerancia_max_defecto NUMERIC(14,4),
    activo BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER NOT NULL DEFAULT 100,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores por orden/producto/motivo.
CREATE TABLE IF NOT EXISTS calidad_parametros_control (
    id SERIAL PRIMARY KEY,
    orden_produccion_codigo TEXT NOT NULL,
    producto_codigo TEXT,
    motivo_indice INTEGER NOT NULL DEFAULT 0,
    parametro_clave TEXT NOT NULL,
    nombre TEXT NOT NULL,
    grupo TEXT NOT NULL DEFAULT 'impresion',
    unidad TEXT DEFAULT '',
    objetivo NUMERIC(14,4),
    tolerancia_min NUMERIC(14,4),
    tolerancia_max NUMERIC(14,4),
    valor_real NUMERIC(14,4),
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',   -- PENDIENTE | OK | BORDE | FUERA
    medido_por TEXT,
    medido_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calidad_param UNIQUE (orden_produccion_codigo, motivo_indice, parametro_clave)
);
CREATE INDEX IF NOT EXISTS idx_calidad_param_control_orden ON calidad_parametros_control (orden_produccion_codigo);

-- Estado calculado: FUERA si real fuera de [min,max]; BORDE si dentro pero a <=10% del rango del
-- borde; OK si cómodo; PENDIENTE si no hay valor real.
CREATE OR REPLACE FUNCTION calidad_set_estado_parametro() RETURNS trigger AS $func$
DECLARE
    rango NUMERIC;
    margen NUMERIC;
BEGIN
    IF NEW.valor_real IS NULL THEN
        NEW.estado := 'PENDIENTE';
    ELSIF NEW.tolerancia_min IS NOT NULL AND NEW.valor_real < NEW.tolerancia_min THEN
        NEW.estado := 'FUERA';
    ELSIF NEW.tolerancia_max IS NOT NULL AND NEW.valor_real > NEW.tolerancia_max THEN
        NEW.estado := 'FUERA';
    ELSE
        rango := COALESCE(NEW.tolerancia_max, NEW.valor_real) - COALESCE(NEW.tolerancia_min, NEW.valor_real);
        margen := CASE WHEN rango > 0 THEN rango * 0.10 ELSE 0 END;
        IF margen > 0 AND (
            (NEW.tolerancia_min IS NOT NULL AND NEW.valor_real - NEW.tolerancia_min <= margen) OR
            (NEW.tolerancia_max IS NOT NULL AND NEW.tolerancia_max - NEW.valor_real <= margen)
        ) THEN
            NEW.estado := 'BORDE';
        ELSE
            NEW.estado := 'OK';
        END IF;
    END IF;
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calidad_param_estado ON calidad_parametros_control;
CREATE TRIGGER trg_calidad_param_estado
BEFORE INSERT OR UPDATE OF valor_real, tolerancia_min, tolerancia_max ON calidad_parametros_control
FOR EACH ROW EXECUTE FUNCTION calidad_set_estado_parametro();

-- Semilla del catálogo estándar.
INSERT INTO calidad_parametros_catalogo (clave, nombre, grupo, unidad, objetivo_defecto, tolerancia_min_defecto, tolerancia_max_defecto, orden) VALUES
    ('viscosidad',        'Viscosidad',              'impresion', 'seg',   23,    22,    24,    10),
    ('ph',                'pH',                      'impresion', '',      8.5,   8.3,   8.7,   20),
    ('temp_tinta',        'Temperatura de Tinta',    'impresion', '°C',    23.5,  22,    25,    30),
    ('densidad',          'Densidad',                'color',     '',      1.45,  1.40,  1.50,  40),
    ('delta_e',           'ΔE',                      'color',     '',      0,     0,     2,     50),
    ('tvi',               'TVI / Ganancia de Punto', 'color',     '%',     18,    15,    21,    60),
    ('registro',          'Registro',                'impresion', 'mm',    0,     -0.15, 0.15,  70),
    ('dyne',              'Tratamiento Dyne',        'sustrato',  'din',   40,    38,    99,    80),
    ('brillo',            'Brillo',                  'acabado',   'GU',    80,    75,    99,    90),
    ('blanco_densidad',   'Blanco · Densidad',       'blanco',    '',      1.60,  1.50,  1.80,  110),
    ('blanco_opacidad',   'Blanco · Opacidad',       'blanco',    '%',     75,    70,    99,    120),
    ('blanco_delta_e',    'Blanco · ΔE',             'blanco',    '',      0,     0,     2.5,   130),
    ('blanco_capas',      'Blanco · Nº de Capas',    'blanco',    '',      1,     1,     2,     140)
ON CONFLICT (clave) DO NOTHING;
