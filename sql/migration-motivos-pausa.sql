-- ============================================================================
-- MIGRACIÓN: Inventario de Motivos de Pausa (Proceso / Calidad) por departamento
-- ----------------------------------------------------------------------------
-- Cada departamento (Diseño, Preprensa, Aprobaciones, Tintas, Impresión,
-- Rebobinado, Empaque) tiene su propia lista de motivos para cuando alguien
-- pausa una orden por "Proceso / Calidad". Antes esa lista estaba escrita fija
-- en el código (public/produccion.html). Ahora vive en esta tabla y se
-- administra desde Configuración General → Producción.
--
-- Por cada motivo se guarda si ese motivo pide registrar merma (antes se
-- llamaba "desperdicio") o no. Diseño, Preprensa y Aprobaciones no manejan
-- material físico, así que sus motivos no piden merma.
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-motivos-pausa.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS motivo_pausa_config (
    id              SERIAL PRIMARY KEY,
    proceso         TEXT NOT NULL,   -- clave del proceso: diseno, preprensa, visto_bueno, tintas, impresion, rebobinado, empaque
    motivo          TEXT NOT NULL,
    solicita_merma  BOOLEAN NOT NULL DEFAULT true,
    activo          BOOLEAN NOT NULL DEFAULT true,
    orden           INTEGER NOT NULL DEFAULT 0,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_por TEXT,
    UNIQUE (proceso, motivo)
);

-- Semilla: los motivos que ya existían fijos en el código.
INSERT INTO motivo_pausa_config (proceso, motivo, solicita_merma, orden) VALUES
    ('diseno',      'Arte incompleto',                 false, 1),
    ('diseno',      'Cliente no aprueba',               false, 2),
    ('diseno',      'Archivo corrupto',                 false, 3),
    ('diseno',      'Cambio de especificación',         false, 4),

    ('preprensa',   'Error de separación de color',     false, 1),
    ('preprensa',   'Archivo de baja resolución',       false, 2),
    ('preprensa',   'Cambio de tinta',                  false, 3),

    ('visto_bueno', 'Muestra fuera de especificación',  false, 1),
    ('visto_bueno', 'Aprobación pendiente de cliente',  false, 2),

    ('tintas',      'Tono fuera de especificación',     true,  1),
    ('tintas',      'Viscosidad incorrecta',            true,  2),
    ('tintas',      'Falta de pigmento',                true,  3),
    ('tintas',      'Contaminación de tinta',            true,  4),
    ('tintas',      'Falta de solvente',                true,  5),

    ('impresion',   'Sello dañado',                     true,  1),
    ('impresion',   'Color fuera de tono',               true,  2),
    ('impresion',   'Desregistro',                      true,  3),
    ('impresion',   'Sustrato dañado',                  true,  4),
    ('impresion',   'Mancha / repinte',                 true,  5),
    ('impresion',   'Falla mecánica',                   true,  6),
    ('impresion',   'Reimprimir sello',                 true,  7),
    ('impresion',   'Cambio de tinta',                  true,  8),
    ('impresion',   'Velocidad fuera de rango',          true,  9),

    ('rebobinado',  'Tensión incorrecta',               true,  1),
    ('rebobinado',  'Desalineación de bobina',           true,  2),
    ('rebobinado',  'Núcleo equivocado',                 true,  3),

    ('empaque',     'Material insuficiente',            true,  1),
    ('empaque',     'Error de conteo',                  true,  2),
    ('empaque',     'Caja equivocada',                  true,  3)
ON CONFLICT (proceso, motivo) DO NOTHING;

COMMIT;
