-- Migración: tintas de libras a kilogramos únicamente
-- Convierte valores existentes y reemplaza/elimina las columnas en libras.
-- Idempotente: puede ejecutarse múltiples veces sin error.

-- ============================================================
-- 1. flexo_calculations, flexo_orders, flexo_products
--    consumo_tinta_por_color_lb / consumo_tinta_total_lb (× 0.45359237)
--    costo_tinta_por_libra, costo_libra_cmyk/blanco/pantone (÷ 0.45359237)
-- ============================================================

DO $$
DECLARE
    t TEXT;
    c TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        -- Consumos: libras -> kilogramos
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = 'consumo_tinta_por_color_lb') THEN
            EXECUTE format('UPDATE %I SET consumo_tinta_por_color_lb = ROUND(consumo_tinta_por_color_lb * 0.45359237, 6) WHERE consumo_tinta_por_color_lb IS NOT NULL', t);
            EXECUTE format('ALTER TABLE %I RENAME COLUMN consumo_tinta_por_color_lb TO consumo_tinta_por_color_kg', t);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = 'consumo_tinta_total_lb') THEN
            EXECUTE format('UPDATE %I SET consumo_tinta_total_lb = ROUND(consumo_tinta_total_lb * 0.45359237, 6) WHERE consumo_tinta_total_lb IS NOT NULL', t);
            EXECUTE format('ALTER TABLE %I RENAME COLUMN consumo_tinta_total_lb TO consumo_tinta_total_kg', t);
        END IF;

        -- Costos por libra -> por kg
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = 'costo_tinta_por_libra') THEN
            EXECUTE format('UPDATE %I SET costo_tinta_por_libra = ROUND(costo_tinta_por_libra / 0.45359237, 6) WHERE costo_tinta_por_libra IS NOT NULL', t);
            EXECUTE format('ALTER TABLE %I RENAME COLUMN costo_tinta_por_libra TO costo_tinta_por_kg', t);
        END IF;

        FOREACH c IN ARRAY ARRAY['costo_libra_cmyk', 'costo_libra_blanco', 'costo_libra_pantone']
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = t AND column_name = c) THEN
                EXECUTE format('UPDATE %I SET %I = ROUND(%I / 0.45359237, 4) WHERE %I IS NOT NULL', t, c, c, c);
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I',
                    t, c, REPLACE(c, 'costo_libra_', 'costo_kg_'));
            END IF;
        END LOOP;

        -- Barniz: ya existe barniz_consumo_kg; se rescata el valor lb y se elimina el duplicado
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = 'barniz_consumo_lb') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = t AND column_name = 'barniz_consumo_kg') THEN
                EXECUTE format('UPDATE %I SET barniz_consumo_kg = ROUND(barniz_consumo_lb * 0.45359237, 6) WHERE barniz_consumo_kg IS NULL AND barniz_consumo_lb IS NOT NULL', t);
            END IF;
            EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS barniz_consumo_lb', t);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 2. costo_general: costos de tinta por libra -> por kilogramo
-- ============================================================

DO $$
DECLARE
    c TEXT;
    v_new NUMERIC;
BEGIN
    FOREACH c IN ARRAY ARRAY['tinta_costo_lb_cmyk', 'tinta_costo_lb_blanco', 'tinta_costo_lb_pantone']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'costo_general' AND column_name = c) THEN
            EXECUTE format('UPDATE costo_general SET %I = ROUND(%I / 0.45359237, 4) WHERE %I IS NOT NULL', c, c, c);
            SELECT COALESCE(ROUND(pg_get_expr(d.adbin, d.adrelid)::text::numeric / 0.45359237, 4), 0)
              INTO v_new
              FROM pg_attrdef d
              JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
             WHERE d.adrelid = 'costo_general'::regclass AND a.attname = c;
            EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', 'costo_general', c, REPLACE(c, 'costo_lb_', 'costo_kg_'));
            EXECUTE format('ALTER TABLE costo_general ALTER COLUMN %I SET DEFAULT %s', REPLACE(c, 'costo_lb_', 'costo_kg_'), COALESCE(v_new, 0));
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 3. Catálogo de materiales: costo_x_libra -> respaldo a costo_x_kg y eliminar
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'material' AND column_name = 'costo_x_libra') THEN
        UPDATE material SET costo_x_kg = ROUND(costo_x_libra / 0.45359237, 6)
        WHERE costo_x_kg IS NULL AND costo_x_libra IS NOT NULL;
        ALTER TABLE material DROP COLUMN IF EXISTS costo_x_libra;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'material' AND column_name = 'comentario_costo_x_libra') THEN
        ALTER TABLE material DROP COLUMN IF EXISTS comentario_costo_x_libra;
    END IF;
END $$;

-- ============================================================
-- 4. Inventario de tintas: normalizar unidades (histórico en LB -> KG)
-- ============================================================

DO $$
BEGIN
    -- Productos de catálogo en unidad base
    UPDATE tintas.productos SET unidad_medida_base = 'KG' WHERE unidad_medida_base = 'LB';

    -- Lotes: peso neto y disponible
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'tintas' AND table_name = 'lotes' AND column_name = 'unidad_medida') THEN
        UPDATE tintas.lotes SET
            peso_neto = ROUND(peso_neto * 0.45359237, 6),
            peso_disponible = ROUND(peso_disponible * 0.45359237, 6),
            unidad_medida = 'KG'
        WHERE unidad_medida = 'LB';
    END IF;

    -- Movimientos de inventario
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'tintas' AND table_name = 'movimientos' AND column_name = 'unidad_medida') THEN
        UPDATE tintas.movimientos SET
            cantidad = ROUND(cantidad * 0.45359237, 6),
            unidad_medida = 'KG'
        WHERE unidad_medida = 'LB';
    END IF;

    -- Detalle de consumos por orden
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'tintas' AND table_name = 'consumo_detalle' AND column_name = 'unidad_medida') THEN
        UPDATE tintas.consumo_detalle SET
            cantidad_calculada = ROUND(cantidad_calculada * 0.45359237, 6),
            cantidad_real_consumida = ROUND(cantidad_real_consumida * 0.45359237, 6),
            unidad_medida = 'KG'
        WHERE unidad_medida = 'LB';
    END IF;

    -- Órdenes de consumo
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'tintas' AND table_name = 'consumo_orden' AND column_name = 'unidad_medida') THEN
        UPDATE tintas.consumo_orden SET
            cantidad_producida = ROUND(cantidad_producida * 0.45359237, 6),
            unidad_medida = 'KG'
        WHERE unidad_medida = 'LB';
    END IF;
END $$;

-- ============================================================
-- 5. Enum unidad_medida: recrear sin 'LB' (permanece G, KG, OZ, ML, L, GAL)
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'unidad_medida' AND e.enumlabel = 'LB') THEN
        DROP VIEW IF EXISTS tintas.vw_existencias_actuales;
        DROP VIEW IF EXISTS tintas.vw_lotes_proximos_vencer;
        CREATE TYPE tintas.unidad_medida_sin_lb AS ENUM ('G', 'KG', 'OZ', 'ML', 'L', 'GAL');
        ALTER TABLE tintas.consumo_detalle   ALTER COLUMN unidad_medida DROP DEFAULT;
        ALTER TABLE tintas.consumo_orden     ALTER COLUMN unidad_medida DROP DEFAULT;
        ALTER TABLE tintas.lotes             ALTER COLUMN unidad_medida DROP DEFAULT;
        ALTER TABLE tintas.productos         ALTER COLUMN unidad_medida_base DROP DEFAULT;
        ALTER TABLE tintas.consumo_detalle  ALTER COLUMN unidad_medida TYPE tintas.unidad_medida_sin_lb USING unidad_medida::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.consumo_orden    ALTER COLUMN unidad_medida TYPE tintas.unidad_medida_sin_lb USING unidad_medida::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.lotes            ALTER COLUMN unidad_medida TYPE tintas.unidad_medida_sin_lb USING unidad_medida::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.movimientos      ALTER COLUMN unidad_medida TYPE tintas.unidad_medida_sin_lb USING unidad_medida::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.pantones_recetas ALTER COLUMN unidad_base TYPE tintas.unidad_medida_sin_lb USING unidad_base::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.productos       ALTER COLUMN unidad_medida_base TYPE tintas.unidad_medida_sin_lb USING unidad_medida_base::text::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.consumo_detalle   ALTER COLUMN unidad_medida SET DEFAULT 'KG'::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.consumo_orden     ALTER COLUMN unidad_medida SET DEFAULT 'KG'::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.lotes             ALTER COLUMN unidad_medida SET DEFAULT 'KG'::tintas.unidad_medida_sin_lb;
        ALTER TABLE tintas.productos         ALTER COLUMN unidad_medida_base SET DEFAULT 'KG'::tintas.unidad_medida_sin_lb;
        DROP TYPE tintas.unidad_medida;
        ALTER TYPE tintas.unidad_medida_sin_lb RENAME TO unidad_medida;
        CREATE OR REPLACE VIEW tintas.vw_existencias_actuales AS
         SELECT p.id AS producto_id,
            p.codigo_interno,
            p.nombre,
            p.tipo,
            p.unidad_medida_base,
            COALESCE(sum(l.peso_disponible), 0::numeric) AS existencia_total,
            count(l.id) FILTER (WHERE l.estado = 'ACTIVO'::tintas.estado_producto) AS lotes_activos
           FROM tintas.productos p
             LEFT JOIN tintas.lotes l ON l.producto_id = p.id AND l.estado = 'ACTIVO'::tintas.estado_producto
          GROUP BY p.id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base;
        CREATE OR REPLACE VIEW tintas.vw_lotes_proximos_vencer AS
         SELECT l.id,
            l.producto_id,
            l.lote,
            l.sap_codigo_lote,
            l.fecha_fabricacion,
            l.fecha_vencimiento,
            l.peso_neto,
            l.peso_disponible,
            l.unidad_medida,
            l.costo_lote,
            l.ubicacion_id,
            l.origen_inventario,
            l.estado,
            l.observaciones,
            l.creado_por,
            l.creado_en,
            l.actualizado_por,
            l.actualizado_en,
            p.nombre AS producto_nombre,
            p.codigo_interno
           FROM tintas.lotes l
             JOIN tintas.productos p ON p.id = l.producto_id
          WHERE l.estado = 'ACTIVO'::tintas.estado_producto AND l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento <= (CURRENT_DATE + '30 days'::interval);
    END IF;
END $$;