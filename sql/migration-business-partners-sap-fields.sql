-- Migración: Ampliación de campos SAP en Socios de Negocio
-- Fecha: 2026-08-14
-- Descripción: Agrega campos faltantes de OCRD, OCPR y CRD1 a las tablas normalizadas
-- Seguro para re-ejecutar (IF NOT EXISTS)

-- ============================================================
-- TABLA: business_partners
-- ============================================================

-- Contacto
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS phone1 TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS phone2 TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS cellular TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS fax TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fiscal
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS vat_group TEXT;

-- Comercial
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS territory TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS owner_code TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS group_code TEXT;

-- Estado
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS valid_for TEXT DEFAULT 'Y';
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS frozen_for TEXT DEFAULT 'N';
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS frozen_from DATE;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS frozen_to DATE;

-- Balance
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2);

-- Dirección facturación (desde OCRD)
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_block TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_zip_code TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_county TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_country TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS billing_building TEXT;

-- Dirección envío (desde OCRD)
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_block TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_zip_code TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_city TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_county TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_country TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS shipping_building TEXT;

-- Defaults de dirección
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS bill_to_default TEXT;
ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS ship_to_default TEXT;

-- ============================================================
-- TABLA: business_partner_contacts
-- ============================================================

ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS sap_contact_code TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS phone2 TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS phone3 TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS notes2 TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE business_partner_contacts ADD COLUMN IF NOT EXISTS county TEXT;

-- ============================================================
-- TABLA: business_partner_addresses
-- ============================================================

ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE business_partner_addresses ADD COLUMN IF NOT EXISTS street_number TEXT;
