-- Migración: soporte para Trazabilidad "de oficina" (Diseño, Preprensa, Visto Bueno)
-- 1) Artes reales capturados al completar Diseño/Preprensa (varios por proceso, con imagen de referencia)
-- 2) Destinatario de Visto Bueno con campos propios (reemplaza el texto suelto en raw_data 'MUESTRAS | ...')

CREATE TABLE IF NOT EXISTS produccion_artes (
    id SERIAL PRIMARY KEY,
    orden_codigo TEXT NOT NULL,
    ruta_id UUID,
    proceso_clave TEXT NOT NULL,
    nombre_arte TEXT,
    imagen_url TEXT,
    creado_por TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produccion_artes_orden ON produccion_artes (orden_codigo, proceso_clave);

ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS vb_destinatario TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS vb_contacto TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS vb_telefono TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS vb_correo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS vb_direccion TEXT;
