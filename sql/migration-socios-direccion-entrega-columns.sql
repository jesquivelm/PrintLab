-- Migración: columnas de dirección de entrega en business_partners.
-- Replican el patrón de contacto_vb_telefono / contacto_vb_correo / contacto_vb_detalle
-- para poder guardar la dirección asociada a cada destino de entrega del socio
-- (Visto Bueno, Producto y Envío de Muestras) y traerla a la orden de producción.
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-socios-direccion-entrega-columns.sql

BEGIN;

ALTER TABLE business_partners
  ADD COLUMN IF NOT EXISTS contacto_vb_direccion        TEXT,
  ADD COLUMN IF NOT EXISTS contacto_producto_direccion  TEXT,
  ADD COLUMN IF NOT EXISTS entrega_muestras_direccion   TEXT;

COMMIT;
