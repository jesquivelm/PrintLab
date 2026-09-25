-- ============================================================================
-- MIGRACION: COLORIMETRIA Y FORMULACION DE TINTAS
-- PrintLab ERP - 2026-09
-- Agrega: identificacion del color (HEX/RGB/CMYK/LAB/C*/h°), propiedades
-- fisicas, datos espectrales, color objetivo de recetas, validaciones con
-- espectrofotometro, condiciones de impresion e historial de formulaciones.
-- Idempotente: puede ejecutarse varias veces sin duplicar cambios.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. NUEVOS TIPOS DE TINTA (fuera de transaccion por seguridad en ALTER TYPE)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_producto' AND typnamespace = 'tintas'::regnamespace) THEN
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'PROCESO_CYAN';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'PROCESO_MAGENTA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'PROCESO_AMARILLO';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'PROCESO_NEGRO';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'PANTONE_DIRECTA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'ROJO';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'NARANJA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'VERDE';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'AZUL';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'VIOLETA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'ROSA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'METALICA';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'FLUORESCENTE';
    ALTER TYPE tintas.tipo_producto ADD VALUE IF NOT EXISTS 'ESPECIAL';
  END IF;
END $$;

BEGIN;

-- ---------------------------------------------------------------------------
-- 2. CATALOGO DE TINTAS (tintas.productos): identificacion del color,
--    datos colorimetricos y datos espectrales
-- ---------------------------------------------------------------------------
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS color_hex          VARCHAR(9);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS rgb_r              SMALLINT;
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS rgb_g              SMALLINT;
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS rgb_b              SMALLINT;
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS cmyk_c             NUMERIC(5,2);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS cmyk_m             NUMERIC(5,2);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS cmyk_y             NUMERIC(5,2);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS cmyk_k             NUMERIC(5,2);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS lab_l              NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS lab_a              NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS lab_b              NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS croma_c            NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS matiz_h            NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS origen_color       VARCHAR(40);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS metodo_obtencion   VARCHAR(40);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS color_medido       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS fuerza_tintorea    NUMERIC(8,3);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS opacidad_pct       NUMERIC(8,3);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS transparencia_pct  NUMERIC(8,3);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS concentracion_pct  NUMERIC(8,3);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS densidad           NUMERIC(10,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS viscosidad         NUMERIC(12,4);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS ph                 NUMERIC(6,3);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_instrumento      VARCHAR(120);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_modelo           VARCHAR(120);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_numero_serie     VARCHAR(120);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_iluminante       VARCHAR(20);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_observador       VARCHAR(10);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_geometria        VARCHAR(20);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_condicion        VARCHAR(80);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS espectro_sustrato         VARCHAR(80);
ALTER TABLE tintas.productos ADD COLUMN IF NOT EXISTS curva_espectral           JSONB;

-- ---------------------------------------------------------------------------
-- 3. BIBLIOTECA PANTONE (tintas.pantones_biblioteca)
-- ---------------------------------------------------------------------------
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS rgb_r        SMALLINT;
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS rgb_g        SMALLINT;
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS rgb_b        SMALLINT;
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS cmyk_c       NUMERIC(5,2);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS cmyk_m       NUMERIC(5,2);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS cmyk_y       NUMERIC(5,2);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS cmyk_k       NUMERIC(5,2);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS lab_l        NUMERIC(10,4);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS lab_a        NUMERIC(10,4);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS lab_b        NUMERIC(10,4);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS croma_c      NUMERIC(10,4);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS matiz_h      NUMERIC(10,4);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS fuente       VARCHAR(60);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS iluminante   VARCHAR(20);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS observador   VARCHAR(10);
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS curva_espectral JSONB;
ALTER TABLE tintas.pantones_biblioteca ADD COLUMN IF NOT EXISTS fecha_actualizacion DATE;

-- ---------------------------------------------------------------------------
-- 4. RECETAS: tipo de formula, color objetivo, color final, motivo de cambio
-- ---------------------------------------------------------------------------
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS tipo_formula        VARCHAR(40);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS color_objetivo_hex  VARCHAR(9);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_rgb_r      SMALLINT;
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_rgb_g      SMALLINT;
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_rgb_b      SMALLINT;
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_cmyk_c     NUMERIC(5,2);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_cmyk_m     NUMERIC(5,2);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_cmyk_y     NUMERIC(5,2);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_cmyk_k     NUMERIC(5,2);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_lab_l      NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_lab_a      NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_lab_b      NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_c          NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS objetivo_h          NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS delta_e_objetivo    NUMERIC(6,3);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS fuente_objetivo     VARCHAR(40);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS color_final_hex     VARCHAR(9);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS final_lab_l         NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS final_lab_a         NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS final_lab_b         NUMERIC(10,4);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS delta_e_inicial     NUMERIC(8,3);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS delta_e_final       NUMERIC(8,3);
ALTER TABLE tintas.pantones_recetas ADD COLUMN IF NOT EXISTS motivo_cambio       TEXT;

-- Ingredientes: cantidad con unidad y funcion de cada componente
ALTER TABLE tintas.pantones_receta_componentes ADD COLUMN IF NOT EXISTS cantidad NUMERIC(14,4);
ALTER TABLE tintas.pantones_receta_componentes ADD COLUMN IF NOT EXISTS unidad   VARCHAR(10);
ALTER TABLE tintas.pantones_receta_componentes ADD COLUMN IF NOT EXISTS funcion   VARCHAR(40);

-- ---------------------------------------------------------------------------
-- 5. VALIDACION DEL COLOR (mediciones con espectrofotometro por receta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tintas.receta_validaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id         UUID NOT NULL REFERENCES tintas.pantones_recetas(id) ON DELETE CASCADE,
  objetivo_lab_l    NUMERIC(10,4),
  objetivo_lab_a    NUMERIC(10,4),
  objetivo_lab_b    NUMERIC(10,4),
  obtenido_lab_l    NUMERIC(10,4),
  obtenido_lab_a    NUMERIC(10,4),
  obtenido_lab_b    NUMERIC(10,4),
  hex_obtenido      VARCHAR(9),
  rgb_obtenido_r    SMALLINT,
  rgb_obtenido_g    SMALLINT,
  rgb_obtenido_b    SMALLINT,
  cmyk_obtenido_c   NUMERIC(5,2),
  cmyk_obtenido_m   NUMERIC(5,2),
  cmyk_obtenido_y   NUMERIC(5,2),
  cmyk_obtenido_k   NUMERIC(5,2),
  delta_e76         NUMERIC(8,3),
  delta_e00         NUMERIC(8,3),
  instrumento       VARCHAR(120),
  modelo            VARCHAR(120),
  numero_serie      VARCHAR(120),
  iluminante        VARCHAR(20),
  observador        VARCHAR(10),
  geometria         VARCHAR(20),
  modo_medicion     VARCHAR(60),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  operador          VARCHAR(120),
  sustrato          VARCHAR(80),
  maquina           VARCHAR(120),
  anilox            VARCHAR(60),
  bcm               NUMERIC(10,3),
  viscosidad        NUMERIC(12,4),
  velocidad         NUMERIC(12,2),
  observaciones     TEXT,
  curva_espectral   JSONB,
  creado_por        BIGINT REFERENCES admin_users(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receta_validaciones_receta ON tintas.receta_validaciones(receta_id);

-- ---------------------------------------------------------------------------
-- 6. CONDICIONES DE IMPRESION POR RECETA (1 a 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tintas.receta_condiciones (
  receta_id             UUID PRIMARY KEY REFERENCES tintas.pantones_recetas(id) ON DELETE CASCADE,
  bcm                   NUMERIC(10,3),
  lineatura_anilox      VARCHAR(40),
  viscosidad            NUMERIC(12,4),
  ph                    NUMERIC(6,3),
  velocidad_maquina     NUMERIC(12,2),
  sustrato              VARCHAR(80),
  tratamiento_sustrato  VARCHAR(80),
  tipo_plancha          VARCHAR(60),
  lineatura_plancha     VARCHAR(40),
  deposito_pelicula     NUMERIC(10,3),
  numero_pasadas        INTEGER,
  temperatura_ambiente  NUMERIC(6,2),
  humedad_relativa      NUMERIC(6,2),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. HISTORIAL DE FORMULACIONES (base de conocimiento)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tintas.formulaciones_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id       UUID NOT NULL REFERENCES tintas.pantones_recetas(id) ON DELETE CASCADE,
  fase            VARCHAR(30) NOT NULL,
  descripcion     TEXT,
  snapshot        JSONB,
  lab_l           NUMERIC(10,4),
  lab_a           NUMERIC(10,4),
  lab_b           NUMERIC(10,4),
  delta_e         NUMERIC(8,3),
  usuario_id      BIGINT REFERENCES admin_users(id),
  cliente_id      UUID REFERENCES business_partners(id),
  maquina         VARCHAR(120),
  sustrato        VARCHAR(80),
  anilox          VARCHAR(60),
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formulaciones_historial_receta ON tintas.formulaciones_historial(receta_id);
CREATE INDEX IF NOT EXISTS idx_formulaciones_historial_fase ON tintas.formulaciones_historial(fase);

COMMIT;

-- ---------------------------------------------------------------------------
-- 8. FAMILIAS DE COLOR ESTANDAR (seed, no destruye las existentes)
-- ---------------------------------------------------------------------------
INSERT INTO tintas.familias (nombre) VALUES
  ('Amarillo'), ('Naranja'), ('Rojo'), ('Magenta'), ('Rosa'), ('Violeta'),
  ('Azul'), ('Cyan'), ('Verde'), ('Negro'), ('Blanco'), ('Transparente'),
  ('Metálico'), ('Fluorescente'), ('Especial'), ('Neutro'), ('Otro')
ON CONFLICT (nombre) DO NOTHING;
