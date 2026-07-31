-- ============================================================================
-- Migración: expansión de tintas.pantones_recetas y tintas.pantones_receta_componentes
-- Alinea el módulo "Fórmulas de Tinta" del ERP con el flujo real de trabajo
-- (referencia: sistema LITO - TINTAS en FileMaker).
--
-- Seguro de re-ejecutar: usa IF NOT EXISTS / bloques DO en todo lo que puede
-- ya existir. Recomendado correr dentro de una transacción y con respaldo previo.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enums nuevos
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_confidencialidad' AND typnamespace = 'tintas'::regnamespace) THEN
        CREATE TYPE tintas.nivel_confidencialidad AS ENUM ('PUBLICO', 'CLIENTE', 'INTERNO');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tecnologia_tinta' AND typnamespace = 'tintas'::regnamespace) THEN
        CREATE TYPE tintas.tecnologia_tinta AS ENUM ('CONVENCIONAL', 'UV', 'HIBRIDA', 'SOLVENTE', 'AGUA', 'OTRO');
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 2. tintas.pantones_recetas — nuevos campos
-- ----------------------------------------------------------------------------

ALTER TABLE tintas.pantones_recetas
    -- Identificación / clasificación comercial
    ADD COLUMN IF NOT EXISTS nombre_comercial   varchar(200),
    ADD COLUMN IF NOT EXISTS descripcion        text,
    ADD COLUMN IF NOT EXISTS confidencialidad   tintas.nivel_confidencialidad NOT NULL DEFAULT 'INTERNO',
    ADD COLUMN IF NOT EXISTS codigo_cliente     varchar(60),
    ADD COLUMN IF NOT EXISTS codigo_fabricante  varchar(60),
    -- Fallback de cliente para casos históricos que no son un business_partner real
    -- (ej. "PANTONE", "LANCO A MUESTRA SOBRE OPACO"). cliente_id sigue siendo la
    -- referencia formal cuando existe; cliente_nota es texto libre de respaldo.
    ADD COLUMN IF NOT EXISTS cliente_nota       text,
    -- Color / catálogo
    ADD COLUMN IF NOT EXISTS acabado            varchar(30),
    ADD COLUMN IF NOT EXISTS color_hex          varchar(9),
    ADD COLUMN IF NOT EXISTS marca_id           uuid REFERENCES tintas.marcas(id),
    ADD COLUMN IF NOT EXISTS familia_id         uuid REFERENCES tintas.familias(id),
    -- Producción: máquina, anilox, tecnología, sustrato (campo único, no N:M)
    ADD COLUMN IF NOT EXISTS maquina_id         uuid REFERENCES public.maquina(id),
    ADD COLUMN IF NOT EXISTS anilox             varchar(60),
    ADD COLUMN IF NOT EXISTS tecnologia         tintas.tecnologia_tinta,
    ADD COLUMN IF NOT EXISTS sustrato           varchar(30),
    -- Aprobación X-RITE
    ADD COLUMN IF NOT EXISTS aprobado_xrite     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS aprobado_xrite_por bigint REFERENCES public.admin_users(id),
    ADD COLUMN IF NOT EXISTS aprobado_xrite_en  timestamp with time zone,
    -- Base declarada de la fórmula (para no perder precisión frente al % calculado)
    ADD COLUMN IF NOT EXISTS cantidad_base      numeric(14,4),
    ADD COLUMN IF NOT EXISTS unidad_base        tintas.unidad_medida,
    -- Disponible: gramos de tinta YA MEZCLADA en existencia para este Pantone.
    -- Unidad estandarizada a gramos en todo el sistema (no configurable por receta).
    ADD COLUMN IF NOT EXISTS disponible_gramos          numeric(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disponible_actualizado_en   timestamp with time zone,
    -- Parámetros de preparación
    ADD COLUMN IF NOT EXISTS orden_mezcla        varchar(120),
    ADD COLUMN IF NOT EXISTS tiempo_mezclado_min numeric(8,2),
    ADD COLUMN IF NOT EXISTS velocidad_agitacion varchar(60),
    ADD COLUMN IF NOT EXISTS temperatura_c       numeric(6,2),
    ADD COLUMN IF NOT EXISTS tiempo_reposo_min   numeric(8,2),
    ADD COLUMN IF NOT EXISTS filtrado            varchar(60),
    ADD COLUMN IF NOT EXISTS malla               varchar(30),
    ADD COLUMN IF NOT EXISTS instrucciones       text,
    -- Propiedades físicas
    ADD COLUMN IF NOT EXISTS viscosidad          varchar(30),
    ADD COLUMN IF NOT EXISTS ph                  varchar(10),
    ADD COLUMN IF NOT EXISTS densidad            numeric(10,4),
    ADD COLUMN IF NOT EXISTS brillo              varchar(30),
    ADD COLUMN IF NOT EXISTS opacidad            varchar(30),
    ADD COLUMN IF NOT EXISTS tiempo_secado       varchar(30),
    ADD COLUMN IF NOT EXISTS vida_util           varchar(30);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_disponible_gramos_no_negativo'
    ) THEN
        ALTER TABLE tintas.pantones_recetas
            ADD CONSTRAINT ck_disponible_gramos_no_negativo CHECK (disponible_gramos >= 0);
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 3. tintas.pantones_receta_componentes — gramos de referencia originales
--    (el % sigue siendo la fuente de verdad para escalar; esto es respaldo/auditoría)
-- ----------------------------------------------------------------------------

ALTER TABLE tintas.pantones_receta_componentes
    ADD COLUMN IF NOT EXISTS cantidad_referencia numeric(14,4);

-- ----------------------------------------------------------------------------
-- 4. Índices para las FKs nuevas más consultadas
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS ix_pantones_recetas_maquina_id ON tintas.pantones_recetas(maquina_id);
CREATE INDEX IF NOT EXISTS ix_pantones_recetas_marca_id   ON tintas.pantones_recetas(marca_id);
CREATE INDEX IF NOT EXISTS ix_pantones_recetas_familia_id ON tintas.pantones_recetas(familia_id);

COMMIT;

-- ============================================================================
-- Notas:
-- - No se crea tabla de movimientos para "disponible_gramos": es un ajuste manual,
--   no automático. Si el manejo de pantones premezclados se vuelve frecuente,
--   se migra a un historial tipo tintas.movimientos.
-- - No se agregó relación N:M de "procesos compatibles": no está en el flujo real
--   observado (el formulario legado no lo maneja) y se retira del módulo nuevo.
-- - "sustrato" queda como campo único de texto en la receta, no como catálogo N:M,
--   porque cada combinación cliente+sustrato+máquina genera su propia versión de
--   fórmula (ya soportado por receta_padre_id / version).
-- ============================================================================
