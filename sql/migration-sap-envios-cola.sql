-- Migración: cola local de envíos a SAP (push desde PrintLab, sin middleware).
-- Cada documento a enviar (socio, orden de venta, producto terminado, factura)
-- queda registrado, se reintenta en cada corrida del scheduler hasta max_intentos
-- y guarda el detalle de cada intento (incluida la respuesta cruda de SAP).
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-sap-envios-cola.sql

BEGIN;

CREATE TABLE IF NOT EXISTS sap_envios_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL,
    referencia TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente',
    intentos INTEGER NOT NULL DEFAULT 0,
    max_intentos INTEGER NOT NULL DEFAULT 10,
    proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_error TEXT NOT NULL DEFAULT '',
    ultimo_error_clase TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_por TEXT NOT NULL DEFAULT '',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_en TIMESTAMPTZ NULL,
    fallido_en TIMESTAMPTZ NULL,
    notificado_en TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS sap_envios_pendientes_estado_idx ON sap_envios_pendientes (estado, proximo_intento_en);
CREATE INDEX IF NOT EXISTS sap_envios_pendientes_ref_idx ON sap_envios_pendientes (tipo, referencia);

CREATE TABLE IF NOT EXISTS sap_envios_intentos (
    id BIGSERIAL PRIMARY KEY,
    envio_id UUID NOT NULL REFERENCES sap_envios_pendientes(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL DEFAULT 1,
    estado TEXT NOT NULL DEFAULT '',
    error TEXT NOT NULL DEFAULT '',
    error_clase TEXT NOT NULL DEFAULT '',
    request JSONB NOT NULL DEFAULT '{}'::jsonb,
    response JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sap_envios_intentos_envio_idx ON sap_envios_intentos (envio_id, creado_en DESC);

COMMIT;
