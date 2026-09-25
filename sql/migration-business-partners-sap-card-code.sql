-- ============================================================================
-- PRINTLAB ERP - Migración: CardCode de SAP separado del código interno
-- ============================================================================
-- Hoy `partner_code` es el identificador local (usado en cotizaciones, órdenes,
-- contactos, direcciones y transferencia_di) y nunca debe renombrarse una vez
-- asignado, para no romper esos enlaces existentes.
--
-- `sap_card_code` es un campo NUEVO y separado: queda vacío mientras el socio
-- es solo un prospecto, y se llena únicamente cuando se confirma o se crea el
-- Business Partner real en SAP (guarda el CardCode devuelto por SAP/DI API).
-- No reemplaza a `partner_code`; conviven ambos.
-- ============================================================================

ALTER TABLE business_partners
    ADD COLUMN IF NOT EXISTS sap_card_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_partners_sap_card_code_unique
    ON business_partners (UPPER(TRIM(sap_card_code)))
    WHERE sap_card_code IS NOT NULL AND TRIM(sap_card_code) <> '';
