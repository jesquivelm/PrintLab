-- Cantidad de cajas cotizada, subtotal de cajas cotizado y costo de caja real (vigente)
-- del proceso de Empaque. El cotizador ya calculaba cajas y subtotal al vuelo pero nunca
-- los guardaba; y no existia columna para el costo real de caja capturado en produccion.
-- Mismas columnas en flexo_calculations, flexo_products y flexo_orders (alineacion de columnas).
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['flexo_calculations', 'flexo_products', 'flexo_orders']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_cantidad_cajas NUMERIC(14,4)', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_subtotal_cajas NUMERIC(14,6)', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empaque_costo_caja_vigente NUMERIC(14,6)', t);
    END LOOP;
END $$;
