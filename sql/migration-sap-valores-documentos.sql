-- Migración: valores de documentos SAP en sap_integration_config.
-- Los define el equipo SAP del cliente desde Configuración → SAP → Valores SAP y
-- se usan para llenar grupo de artículo, bodegas, unidad de medida, series de
-- numeración, código de impuesto y condiciones comerciales al crear documentos
-- en SAP (producto terminado, orden de venta, orden de producción, factura,
-- salida y entrada de inventario).
--
-- Idempotente: se puede ejecutar más de una vez sin efectos secundarios.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-sap-valores-documentos.sql

BEGIN;

ALTER TABLE sap_integration_config
  ADD COLUMN IF NOT EXISTS sap_item_group_code               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_finished_goods_warehouse_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_materials_warehouse_code      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_finished_goods_uom_code       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_sales_order_series            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_production_order_series        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_invoice_series                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_inventory_exit_series         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_inventory_entry_series        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_sales_tax_code                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_partner_group_code            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_payment_terms_code            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_price_list_num                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sap_production_requires_bom        BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
