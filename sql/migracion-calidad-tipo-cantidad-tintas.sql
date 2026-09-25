-- Corrige cantidad_tintas de integer a numeric(8,4) para coincidir con flexo_orders.cantidad_tintas
ALTER TABLE calidad_orden_lineas ALTER COLUMN cantidad_tintas TYPE NUMERIC(8,4);
ALTER TABLE calidad_documentos ALTER COLUMN cantidad_tintas TYPE NUMERIC(8,4);
