-- Migración: columnas tipadas para Muestras/Visto Bueno y Entrega en flexo_orders.
-- Reemplazan el uso de raw_data (claves 'MUESTRAS | *' y 'ENTREGA | *') para estos
-- bloques. La dirección se guarda estructurada (nombre, tipo, país, departamento,
-- zona, código postal, línea) igual que el formato de direcciones del socio.
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-orden-entrega-direccion-columns.sql

BEGIN;

ALTER TABLE flexo_orders
  -- Envío de Muestras
  ADD COLUMN IF NOT EXISTS muestras_tipo                     TEXT,
  ADD COLUMN IF NOT EXISTS muestras_detalle                  TEXT,
  -- Dirección estructurada del Destinatario de Visto Bueno (vb_direccion = línea, ya existe)
  ADD COLUMN IF NOT EXISTS vb_direccion_nombre               TEXT,
  ADD COLUMN IF NOT EXISTS vb_direccion_tipo                 TEXT,
  ADD COLUMN IF NOT EXISTS vb_direccion_pais                 TEXT,
  ADD COLUMN IF NOT EXISTS vb_direccion_departamento         TEXT,
  ADD COLUMN IF NOT EXISTS vb_direccion_zona                 TEXT,
  ADD COLUMN IF NOT EXISTS vb_direccion_codigo_postal        TEXT,
  -- Entrega de Producto
  ADD COLUMN IF NOT EXISTS entrega_tipo                      TEXT,
  ADD COLUMN IF NOT EXISTS entrega_contacto                  TEXT,
  ADD COLUMN IF NOT EXISTS entrega_telefono                  TEXT,
  ADD COLUMN IF NOT EXISTS entrega_correo                    TEXT,
  ADD COLUMN IF NOT EXISTS entrega_detalle                   TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion                 TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_nombre          TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_tipo            TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_pais            TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_departamento    TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_zona            TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_codigo_postal   TEXT;

COMMIT;
