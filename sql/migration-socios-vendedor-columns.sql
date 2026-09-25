-- Migración: columnas de vendedor en business_partners
BEGIN;

ALTER TABLE business_partners
  ADD COLUMN IF NOT EXISTS salesperson_user_code TEXT,
  ADD COLUMN IF NOT EXISTS salesperson_sap_code  TEXT;

COMMIT;
