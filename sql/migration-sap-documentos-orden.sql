-- Migración: columnas de trazabilidad de documentos SAP por orden de producción.
-- Complementan sap_orden_venta_doc_entry / sap_producto_terminado_doc_entry /
-- sap_factura_doc_entry con el resto de la secuencia del correo "Plan para conectar
-- con SAP": artículo terminado (OITM), lista de materiales / BOM (OITT), orden de
-- producción (OWOR) y salida de materiales (IGE1). Más el aviso de confirmación
-- de factura del Paso 5.
--
-- Idempotente.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-sap-documentos-orden.sql

BEGIN;

ALTER TABLE flexo_orders
  ADD COLUMN IF NOT EXISTS sap_articulo_creado              TEXT,
  ADD COLUMN IF NOT EXISTS sap_bom_creado                   TEXT,
  ADD COLUMN IF NOT EXISTS sap_orden_produccion_doc_entry   TEXT,
  ADD COLUMN IF NOT EXISTS sap_salida_materiales_doc_entry  TEXT,
  ADD COLUMN IF NOT EXISTS sap_factura_confirmacion         TEXT;

ALTER TABLE sap_integration_config
  ADD COLUMN IF NOT EXISTS sap_factura_automatica BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sap_udf_pl_activos     BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
