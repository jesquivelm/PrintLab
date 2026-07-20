-- ============================================================================
-- MODULO: GESTION DE TINTAS
-- PrintLab ERP - Esquema PostgreSQL adaptado
-- ============================================================================
-- Referencias a tablas existentes de PrintLab:
--   flexo_orders(id) UUID       -> ordenes de produccion
--   flexo_products(id) UUID     -> catalogo de productos terminados
--   business_partners(id) UUID  -> clientes y proveedores
--   admin_users(id) BIGINT      -> usuarios del sistema
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS tintas;

-- ============================================================================
-- 1. TIPOS ENUMERADOS
-- ============================================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_producto') THEN
  CREATE TYPE tintas.tipo_producto AS ENUM ('TINTA_UV','BARNIZ','PRIMER','ADHESIVO','BASE','BLANCO','TRANSPARENTE','EXTENDER','DILUYENTE','SOLVENTE','LIMPIADOR','ADITIVO','RETARDANTE','ACELERANTE','OTRO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidad_medida') THEN
  CREATE TYPE tintas.unidad_medida AS ENUM ('KG','G','LB','OZ','L','ML','GAL');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_producto') THEN
  CREATE TYPE tintas.estado_producto AS ENUM ('ACTIVO','INACTIVO','VENCIDO','BLOQUEADO','DESCONTINUADO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_inventario') THEN
  CREATE TYPE tintas.origen_inventario AS ENUM ('SAP','ERP_LOCAL');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
  CREATE TYPE tintas.tipo_movimiento AS ENUM ('ENTRADA','SALIDA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','TRANSFERENCIA','CONSUMO_PRODUCCION','DEVOLUCION','MERMA');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_receta') THEN
  CREATE TYPE tintas.estado_receta AS ENUM ('BORRADOR','VIGENTE','ARCHIVADO','OBSOLETO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_asociacion_producto') THEN
  CREATE TYPE tintas.tipo_asociacion_producto AS ENUM ('RECOMENDADO','OBLIGATORIO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_consumo') THEN
  CREATE TYPE tintas.estado_consumo AS ENUM ('PENDIENTE','PROCESADO','ANULADO');
END IF; END $$;

-- ============================================================================
-- 2. CATALOGOS BASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.familias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas.marcas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    VARCHAR(120) NOT NULL UNIQUE,
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas.fabricantes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    VARCHAR(160) NOT NULL,
  pais      VARCHAR(80),
  contacto  VARCHAR(160),
  telefono  VARCHAR(40),
  email     VARCHAR(160),
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas.ubicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(40) NOT NULL UNIQUE,
  descripcion VARCHAR(160) NOT NULL,
  bodega      VARCHAR(80),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INVENTARIO DE TINTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.productos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sap                VARCHAR(40) UNIQUE,
  codigo_interno            VARCHAR(40) NOT NULL UNIQUE,
  origen_inventario         tintas.origen_inventario NOT NULL DEFAULT 'ERP_LOCAL',
  sap_ultima_sincronizacion TIMESTAMPTZ,
  sap_hash_version          VARCHAR(64),
  nombre                    VARCHAR(200) NOT NULL,
  tipo                      tintas.tipo_producto NOT NULL,
  familia_id                UUID REFERENCES tintas.familias(id),
  fabricante_id             UUID REFERENCES tintas.fabricantes(id),
  marca_id                  UUID REFERENCES tintas.marcas(id),
  proveedor_id              UUID REFERENCES business_partners(id),
  color                     VARCHAR(80),
  pantone_base_id           UUID,
  unidad_medida_base        tintas.unidad_medida NOT NULL DEFAULT 'KG',
  peso_por_envase           NUMERIC(14,4),
  vida_util_dias            INTEGER,
  costo_promedio            NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_ultimo              NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_defecto_id      UUID REFERENCES tintas.ubicaciones(id),
  equivalencias             JSONB,
  configuraciones           JSONB,
  observaciones             TEXT,
  estado                    tintas.estado_producto NOT NULL DEFAULT 'ACTIVO',
  creado_por                BIGINT REFERENCES admin_users(id),
  creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por           BIGINT REFERENCES admin_users(id),
  actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tintas_productos_tipo ON tintas.productos(tipo);
CREATE INDEX IF NOT EXISTS idx_tintas_productos_estado ON tintas.productos(estado);
CREATE INDEX IF NOT EXISTS idx_tintas_productos_codigo_sap ON tintas.productos(codigo_sap);

CREATE TABLE IF NOT EXISTS tintas.lotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES tintas.productos(id),
  lote              VARCHAR(60) NOT NULL,
  sap_codigo_lote   VARCHAR(60),
  fecha_fabricacion DATE,
  fecha_vencimiento DATE,
  peso_neto         NUMERIC(14,4) NOT NULL,
  peso_disponible   NUMERIC(14,4) NOT NULL,
  unidad_medida     tintas.unidad_medida NOT NULL DEFAULT 'KG',
  costo_lote        NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_id      UUID REFERENCES tintas.ubicaciones(id),
  origen_inventario tintas.origen_inventario NOT NULL DEFAULT 'ERP_LOCAL',
  estado            tintas.estado_producto NOT NULL DEFAULT 'ACTIVO',
  observaciones     TEXT,
  creado_por        BIGINT REFERENCES admin_users(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por   BIGINT REFERENCES admin_users(id),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_lote_por_producto UNIQUE (producto_id, lote),
  CONSTRAINT ck_peso_disponible_no_negativo CHECK (peso_disponible >= 0),
  CONSTRAINT ck_peso_disponible_no_excede CHECK (peso_disponible <= peso_neto)
);

CREATE INDEX IF NOT EXISTS idx_tintas_lotes_producto ON tintas.lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_tintas_lotes_vencimiento ON tintas.lotes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_tintas_lotes_estado ON tintas.lotes(estado);

CREATE TABLE IF NOT EXISTS tintas.movimientos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id          UUID NOT NULL REFERENCES tintas.productos(id),
  lote_id              UUID REFERENCES tintas.lotes(id),
  tipo                 tintas.tipo_movimiento NOT NULL,
  cantidad             NUMERIC(14,4) NOT NULL,
  unidad_medida        tintas.unidad_medida NOT NULL,
  costo_unitario       NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_total          NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_origen_id  UUID REFERENCES tintas.ubicaciones(id),
  ubicacion_destino_id UUID REFERENCES tintas.ubicaciones(id),
  orden_produccion_id  UUID REFERENCES flexo_orders(id),
  referencia_documento VARCHAR(80),
  origen_sistema       VARCHAR(20) NOT NULL DEFAULT 'ERP',
  usuario_id           BIGINT REFERENCES admin_users(id),
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  observaciones        TEXT
);

CREATE INDEX IF NOT EXISTS idx_tintas_mov_producto_fecha ON tintas.movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_lote ON tintas.movimientos(lote_id);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_orden ON tintas.movimientos(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_tipo ON tintas.movimientos(tipo);

-- ============================================================================
-- 4. PANTONES / FORMULACION
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.pantones_biblioteca (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pantone VARCHAR(40) NOT NULL,
  nombre         VARCHAR(160),
  color_hex      VARCHAR(9),
  descripcion    TEXT,
  frecuencia_uso INTEGER NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por     BIGINT REFERENCES admin_users(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT REFERENCES admin_users(id),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pantone_codigo UNIQUE (codigo_pantone)
);

CREATE INDEX IF NOT EXISTS idx_pantones_bib_codigo ON tintas.pantones_biblioteca(codigo_pantone);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_productos_pantone_base' AND table_schema='tintas') THEN
  ALTER TABLE tintas.productos ADD CONSTRAINT fk_productos_pantone_base FOREIGN KEY (pantone_base_id) REFERENCES tintas.pantones_biblioteca(id);
END IF; END $$;

CREATE TABLE IF NOT EXISTS tintas.pantones_recetas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_interno      VARCHAR(40) NOT NULL UNIQUE,
  nombre              VARCHAR(160) NOT NULL,
  pantone_id          UUID REFERENCES tintas.pantones_biblioteca(id),
  cliente_id          UUID REFERENCES business_partners(id),
  producto_id         UUID REFERENCES flexo_products(id),
  orden_produccion_id UUID REFERENCES flexo_orders(id),
  version             INTEGER NOT NULL DEFAULT 1,
  receta_padre_id     UUID REFERENCES tintas.pantones_recetas(id),
  es_vigente          BOOLEAN NOT NULL DEFAULT FALSE,
  estado              tintas.estado_receta NOT NULL DEFAULT 'BORRADOR',
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_creador_id  BIGINT REFERENCES admin_users(id),
  observaciones       TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por     BIGINT REFERENCES admin_users(id),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recetas_pantone ON tintas.pantones_recetas(pantone_id);
CREATE INDEX IF NOT EXISTS idx_recetas_cliente ON tintas.pantones_recetas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON tintas.pantones_recetas(producto_id);
CREATE INDEX IF NOT EXISTS idx_recetas_vigente ON tintas.pantones_recetas(pantone_id, es_vigente) WHERE es_vigente;

CREATE TABLE IF NOT EXISTS tintas.pantones_receta_componentes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id         UUID NOT NULL REFERENCES tintas.pantones_recetas(id) ON DELETE CASCADE,
  producto_tinta_id UUID NOT NULL REFERENCES tintas.productos(id),
  porcentaje        NUMERIC(6,3) NOT NULL,
  orden             INTEGER NOT NULL DEFAULT 0,
  observaciones     TEXT,
  CONSTRAINT ck_porcentaje_valido CHECK (porcentaje > 0 AND porcentaje <= 100)
);

CREATE INDEX IF NOT EXISTS idx_receta_comp_receta ON tintas.pantones_receta_componentes(receta_id);
CREATE INDEX IF NOT EXISTS idx_receta_comp_producto ON tintas.pantones_receta_componentes(producto_tinta_id);

CREATE TABLE IF NOT EXISTS tintas.pantones_clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES business_partners(id),
  pantone_id UUID NOT NULL REFERENCES tintas.pantones_biblioteca(id),
  exclusivo  BOOLEAN NOT NULL DEFAULT FALSE,
  notas      TEXT,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pantone_cliente UNIQUE (cliente_id, pantone_id)
);

CREATE TABLE IF NOT EXISTS tintas.pantones_productos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES flexo_products(id),
  pantone_id        UUID NOT NULL REFERENCES tintas.pantones_biblioteca(id),
  tipo_asociacion   tintas.tipo_asociacion_producto NOT NULL DEFAULT 'RECOMENDADO',
  vigente_desde     DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta     DATE,
  CONSTRAINT uq_pantone_producto UNIQUE (producto_id, pantone_id, vigente_desde)
);

-- ============================================================================
-- 5. CONSUMO POR ORDEN / DESCARGA AUTOMATICA DE INVENTARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.consumo_orden (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_produccion_id   UUID NOT NULL REFERENCES flexo_orders(id),
  receta_id             UUID REFERENCES tintas.pantones_recetas(id),
  cantidad_producida    NUMERIC(14,4) NOT NULL,
  unidad_medida         tintas.unidad_medida NOT NULL DEFAULT 'KG',
  fecha_cierre          TIMESTAMPTZ,
  usuario_id            BIGINT REFERENCES admin_users(id),
  costo_total_consumido NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_por_kg          NUMERIC(14,4),
  costo_por_metro       NUMERIC(14,4),
  costo_por_pie_lineal  NUMERIC(14,4),
  costo_por_etiqueta    NUMERIC(14,4),
  costo_por_trabajo     NUMERIC(14,4),
  estado                tintas.estado_consumo NOT NULL DEFAULT 'PENDIENTE',
  observaciones         TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consumo_por_orden UNIQUE (orden_produccion_id)
);

CREATE INDEX IF NOT EXISTS idx_consumo_orden_orden ON tintas.consumo_orden(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_consumo_orden_receta ON tintas.consumo_orden(receta_id);
CREATE INDEX IF NOT EXISTS idx_consumo_orden_estado ON tintas.consumo_orden(estado);

CREATE TABLE IF NOT EXISTS tintas.consumo_detalle (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumo_id              UUID NOT NULL REFERENCES tintas.consumo_orden(id) ON DELETE CASCADE,
  producto_tinta_id       UUID NOT NULL REFERENCES tintas.productos(id),
  lote_id                 UUID REFERENCES tintas.lotes(id),
  cantidad_calculada      NUMERIC(14,4) NOT NULL,
  cantidad_real_consumida NUMERIC(14,4),
  unidad_medida           tintas.unidad_medida NOT NULL DEFAULT 'KG',
  costo_unitario          NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_total             NUMERIC(14,4) NOT NULL DEFAULT 0,
  movimiento_id           UUID REFERENCES tintas.movimientos(id),
  operador_id             BIGINT REFERENCES admin_users(id),
  fecha_hora              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumo_det_consumo ON tintas.consumo_detalle(consumo_id);
CREATE INDEX IF NOT EXISTS idx_consumo_det_producto ON tintas.consumo_detalle(producto_tinta_id);
CREATE INDEX IF NOT EXISTS idx_consumo_det_lote ON tintas.consumo_detalle(lote_id);

-- ============================================================================
-- 6. AUDITORIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.auditoria (
  id             BIGSERIAL PRIMARY KEY,
  tabla          VARCHAR(80) NOT NULL,
  registro_id    UUID NOT NULL,
  accion         VARCHAR(10) NOT NULL,
  campo          VARCHAR(80),
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  usuario_id     BIGINT REFERENCES admin_users(id),
  fecha          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON tintas.auditoria(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON tintas.auditoria(fecha);

-- ============================================================================
-- 7. SINCRONIZACION SAP
-- ============================================================================

CREATE TABLE IF NOT EXISTS tintas.sap_sincronizacion_log (
  id            BIGSERIAL PRIMARY KEY,
  entidad       VARCHAR(40) NOT NULL,
  registro_id   UUID NOT NULL,
  direccion     VARCHAR(20) NOT NULL,
  estado        VARCHAR(20) NOT NULL,
  payload       JSONB,
  mensaje_error TEXT,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sap_log_entidad_registro ON tintas.sap_sincronizacion_log(entidad, registro_id);
CREATE INDEX IF NOT EXISTS idx_sap_log_estado ON tintas.sap_sincronizacion_log(estado);

-- ============================================================================
-- 8. VISTAS DE APOYO
-- ============================================================================

CREATE OR REPLACE VIEW tintas.vw_existencias_actuales AS
SELECT p.id AS producto_id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base,
  COALESCE(SUM(l.peso_disponible), 0) AS existencia_total,
  COUNT(l.id) FILTER (WHERE l.estado = 'ACTIVO') AS lotes_activos
FROM tintas.productos p
LEFT JOIN tintas.lotes l ON l.producto_id = p.id AND l.estado = 'ACTIVO'
GROUP BY p.id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base;

CREATE OR REPLACE VIEW tintas.vw_lotes_proximos_vencer AS
SELECT l.*, p.nombre AS producto_nombre, p.codigo_interno
FROM tintas.lotes l
JOIN tintas.productos p ON p.id = l.producto_id
WHERE l.estado = 'ACTIVO' AND l.fecha_vencimiento IS NOT NULL
  AND l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '30 days');

CREATE OR REPLACE VIEW tintas.vw_consumo_mensual AS
SELECT date_trunc('month', cd.fecha_hora) AS mes,
  cd.producto_tinta_id, p.nombre AS producto_nombre,
  SUM(cd.cantidad_real_consumida) AS cantidad_total,
  SUM(cd.costo_total) AS costo_total
FROM tintas.consumo_detalle cd
JOIN tintas.productos p ON p.id = cd.producto_tinta_id
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW tintas.vw_tintas_mas_utilizadas AS
SELECT p.id AS producto_id, p.nombre,
  COUNT(cd.id) AS veces_utilizada,
  SUM(cd.cantidad_real_consumida) AS cantidad_total_consumida
FROM tintas.consumo_detalle cd
JOIN tintas.productos p ON p.id = cd.producto_tinta_id
GROUP BY p.id, p.nombre
ORDER BY veces_utilizada DESC;

COMMIT;
