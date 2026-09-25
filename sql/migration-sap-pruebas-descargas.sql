-- Consola de Pruebas SAP: copia local del BOM enviado + historial de descargas de inventario.
--
-- Ejecutar:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-sap-pruebas-descargas.sql
--
-- Ambas tablas se crean tambien en ensureSapSchema() (services/sap-service-layer.js);
-- este archivo es para aplicarlas manualmente sin reiniciar el servidor.

-- Copia local de las lineas del BOM (Product Tree) que se enviaron a SAP por SKU.
-- Permite saber que contiene el BOM de un SKU sin consultar SAP en linea.
CREATE TABLE IF NOT EXISTS sap_bom_local (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    order_code TEXT NOT NULL DEFAULT '',
    sap_item_code TEXT NOT NULL DEFAULT '',
    item_name TEXT NOT NULL DEFAULT '',
    cantidad NUMERIC(14,4) NOT NULL DEFAULT 0,
    unidad TEXT NOT NULL DEFAULT '',
    enviado_por TEXT NOT NULL DEFAULT '',
    enviado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sku, sap_item_code)
);
CREATE INDEX IF NOT EXISTS sap_bom_local_sku_idx ON sap_bom_local (sku);

-- Historial de cada descarga de inventario (Inventory Exit) enviada a SAP a nombre de una orden.
-- Una orden puede tener varias descargas; flexo_orders.sap_salida_materiales_doc_entry
-- sigue apuntando a la primera/consolidada por compatibilidad.
CREATE TABLE IF NOT EXISTS sap_salidas_materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    doc_entry TEXT NOT NULL DEFAULT '',
    queue_code TEXT NOT NULL DEFAULT '',
    lineas JSONB NOT NULL DEFAULT '[]'::jsonb,
    fuera_de_bom JSONB NOT NULL DEFAULT '[]'::jsonb,
    origen TEXT NOT NULL DEFAULT 'consola',
    estado TEXT NOT NULL DEFAULT 'enviado',
    error TEXT NOT NULL DEFAULT '',
    creado_por TEXT NOT NULL DEFAULT '',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sap_salidas_materiales_order_idx ON sap_salidas_materiales (order_code, creado_en DESC);
