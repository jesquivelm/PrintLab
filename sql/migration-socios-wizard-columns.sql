-- Migración: columnas nuevas en business_partners para el wizard de creación
-- de Socios/Prospectos (tipo de socio/identificación, estado del prospecto,
-- y los campos de Manejo y Entrega que hoy solo viven en raw_data o ni
-- siquiera se guardan).
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-socios-wizard-columns.sql

BEGIN;

ALTER TABLE business_partners
  ADD COLUMN IF NOT EXISTS tipo_socio               TEXT,
  ADD COLUMN IF NOT EXISTS tipo_identificacion       TEXT,
  ADD COLUMN IF NOT EXISTS nombre_comercial          TEXT,
  ADD COLUMN IF NOT EXISTS estado_socio              TEXT,
  ADD COLUMN IF NOT EXISTS manejo_excedentes         TEXT,
  ADD COLUMN IF NOT EXISTS manejo_adelantos          TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_adelantos      NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS manejo_faltantes          TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_faltantes      NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS entrega_muestras          TEXT,
  ADD COLUMN IF NOT EXISTS entrega_indicaciones      TEXT,
  ADD COLUMN IF NOT EXISTS contacto_vb_tipo          TEXT,
  ADD COLUMN IF NOT EXISTS contacto_vb_telefono      TEXT,
  ADD COLUMN IF NOT EXISTS contacto_vb_correo        TEXT,
  ADD COLUMN IF NOT EXISTS contacto_vb_detalle       TEXT,
  ADD COLUMN IF NOT EXISTS contacto_producto_tipo     TEXT,
  ADD COLUMN IF NOT EXISTS contacto_producto_telefono TEXT,
  ADD COLUMN IF NOT EXISTS contacto_producto_correo   TEXT,
  ADD COLUMN IF NOT EXISTS contacto_producto_detalle  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_partners_tipo_socio_check'
  ) THEN
    ALTER TABLE business_partners
      ADD CONSTRAINT business_partners_tipo_socio_check
      CHECK (tipo_socio IS NULL OR tipo_socio IN ('EMPRESA', 'PERSONA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_partners_tipo_identificacion_check'
  ) THEN
    ALTER TABLE business_partners
      ADD CONSTRAINT business_partners_tipo_identificacion_check
      CHECK (tipo_identificacion IS NULL OR tipo_identificacion IN ('NIT', 'DPI', 'PASAPORTE', 'OTRO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_partners_estado_socio_check'
  ) THEN
    ALTER TABLE business_partners
      ADD CONSTRAINT business_partners_estado_socio_check
      CHECK (estado_socio IS NULL OR estado_socio IN (
        'PROSPECTO',
        'PENDIENTE_INFORMACION',
        'SOLICITUD_CLIENTE',
        'PENDIENTE_APROBACION',
        'CLIENTE_APROBADO',
        'CLIENTE_CREADO_SAP',
        'ERROR_SINCRONIZACION'
      ));
  END IF;
END $$;

COMMIT;
