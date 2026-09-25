-- Migración: tipo de identificación del contacto principal de un socio
-- (NIT/DPI/Pasaporte/Otro), campo nuevo del wizard de Socios que no existía
-- antes (el formulario anterior solo tenía un campo libre "Identificación").
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-socios-contacto-tipo-identificacion.sql

BEGIN;

ALTER TABLE business_partner_contacts
  ADD COLUMN IF NOT EXISTS identification_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_partner_contacts_identification_type_check'
  ) THEN
    ALTER TABLE business_partner_contacts
      ADD CONSTRAINT business_partner_contacts_identification_type_check
      CHECK (identification_type IS NULL OR identification_type IN ('NIT', 'DPI', 'PASAPORTE', 'OTRO'));
  END IF;
END $$;

COMMIT;
