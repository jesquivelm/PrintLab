-- Migración: Tabla de Turnos y Horarios para Costos
-- Fecha: 2026-08-03

CREATE TABLE IF NOT EXISTS costos_turnos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_min INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 60
    ) STORED,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS costos_proceso_turnos (
    id SERIAL PRIMARY KEY,
    proceso_key TEXT NOT NULL,
    turno_id INTEGER NOT NULL REFERENCES costos_turnos(id) ON DELETE CASCADE,
    fecha_inicio DATE,
    fecha_fin DATE,
    es_temporal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (proceso_key, turno_id, fecha_inicio, fecha_fin)
);

CREATE INDEX IF NOT EXISTS idx_costos_turnos_activo ON costos_turnos(activo);
CREATE INDEX IF NOT EXISTS idx_costos_proceso_turnos_proceso ON costos_proceso_turnos(proceso_key);
CREATE INDEX IF NOT EXISTS idx_costos_proceso_turnos_temporal ON costos_proceso_turnos(es_temporal, fecha_inicio, fecha_fin);
