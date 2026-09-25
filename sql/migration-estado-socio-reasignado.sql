-- ============================================================================
-- PRINTLAB ERP - Migración: Estados REASIGNADO y DESCARTADO para prospectos
-- ============================================================================
-- Agrega dos valores nuevos al estado de business_partners, para distinguir
-- un prospecto cuya cotización terminó asociada a otro socio (REASIGNADO) de
-- uno que simplemente no prosperó (DESCARTADO). No se elimina ningún valor
-- existente; los registros actuales no se ven afectados.
-- ============================================================================

ALTER TABLE business_partners
    DROP CONSTRAINT IF EXISTS business_partners_estado_socio_check;

ALTER TABLE business_partners
    ADD CONSTRAINT business_partners_estado_socio_check
    CHECK (estado_socio IS NULL OR (estado_socio = ANY (ARRAY[
        'PROSPECTO'::text,
        'PENDIENTE_INFORMACION'::text,
        'SOLICITUD_CLIENTE'::text,
        'PENDIENTE_APROBACION'::text,
        'CLIENTE_APROBADO'::text,
        'CLIENTE_CREADO_SAP'::text,
        'ERROR_SINCRONIZACION'::text,
        'REASIGNADO'::text,
        'DESCARTADO'::text
    ])));
