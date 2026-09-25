-- Propaga el tipo de bolsa + cantidad + costo real desde el Calculo hacia
-- flexo_calculations, flexo_products y flexo_orders (Column Alignment).
-- empaque_tipo_bolsa: id de costo_acabado_bolsas.fila_id.
-- empaque_costo_bolsas: costo real (no se muestra en Producto/Orden, solo en Calculo/Costos).

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['flexo_calculations', 'flexo_products', 'flexo_orders']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_tipo_bolsa TEXT', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_cantidad_bolsas NUMERIC(12,4) NOT NULL DEFAULT 0', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_costo_bolsas NUMERIC(12,4) NOT NULL DEFAULT 0', t);
    END LOOP;
END $$;
