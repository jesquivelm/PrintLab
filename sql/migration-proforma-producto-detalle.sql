-- Migración: Detalle de Producto editable por proforma.
ALTER TABLE quote_proformas ADD COLUMN IF NOT EXISTS proforma_producto_detalle TEXT;
