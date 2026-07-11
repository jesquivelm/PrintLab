-- ============================================================================
-- MAYAPRINT FLEXO WEB
-- Esquema nucleo para demo / primera implementacion real en PostgreSQL
-- Base: schema.sql del proyecto + ajustes para la linea de procesos web
-- Alcance: solo flexografia, cotizaciones y catalogos base
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos minimos
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moneda_codigo') THEN
    CREATE TYPE moneda_codigo AS ENUM ('USD', 'CRC', 'GTQ', 'EUR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idioma_codigo') THEN
    CREATE TYPE idioma_codigo AS ENUM ('es', 'en', 'fr', 'de');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM (
      'admin_tenant',
      'vendedor',
      'cotizador',
      'cotizador_avanzado',
      'seguimiento',
      'arte',
      'preprensa',
      'operario',
      'calidad',
      'administracion',
      'soporte'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proceso_productivo') THEN
    CREATE TYPE proceso_productivo AS ENUM ('P5', 'Convencional', 'Digital', 'HP6000', 'Hibrido', 'ABG');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_orden_enum') THEN
    CREATE TYPE tipo_orden_enum AS ENUM ('Nuevo', 'Repeticion', 'RepeticionCambio', 'Pruebas', 'Muestras', 'Regalias');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'formato_cotizacion') THEN
    CREATE TYPE formato_cotizacion AS ENUM ('simple', 'frente_dorso');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cotizacion') THEN
    CREATE TYPE estado_cotizacion AS ENUM ('borrador', 'enviada', 'aprobada', 'vencida', 'convertida');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cotizacion') THEN
    CREATE TYPE tipo_cotizacion AS ENUM ('regular', 'licitacion', 'repeticion');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_etiquetado') THEN
    CREATE TYPE tipo_etiquetado AS ENUM ('Automatico', 'Manual');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_salida_rollo') THEN
    CREATE TYPE tipo_salida_rollo AS ENUM ('D', 'A', 'Indistinto');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tenant y usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(200) NOT NULL,
  subdominio        VARCHAR(100) NOT NULL UNIQUE,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  pais              VARCHAR(10) NOT NULL DEFAULT 'CR',
  zona_horaria      VARCHAR(60) NOT NULL DEFAULT 'America/Costa_Rica',
  moneda_defecto    moneda_codigo NOT NULL DEFAULT 'USD',
  idioma_defecto    idioma_codigo NOT NULL DEFAULT 'es',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email                         VARCHAR(255) NOT NULL,
  password_hash                 VARCHAR(255) NOT NULL,
  nombre                        VARCHAR(100) NOT NULL,
  apellidos                     VARCHAR(100) NOT NULL,
  rol                           rol_usuario NOT NULL,
  activo                        BOOLEAN NOT NULL DEFAULT TRUE,
  puede_ajustar_macula          BOOLEAN NOT NULL DEFAULT FALSE,
  puede_ajustar_costos          BOOLEAN NOT NULL DEFAULT FALSE,
  puede_modificar_precio_venta  BOOLEAN NOT NULL DEFAULT FALSE,
  puede_aprobar_cotizacion      BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS socio (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  codigo                  VARCHAR(20) NOT NULL,
  nombre                  VARCHAR(300) NOT NULL,
  nombre_comercial        VARCHAR(300),
  cedula_juridica         VARCHAR(30),
  condicion_pago          VARCHAR(100) DEFAULT 'Contado',
  limite_credito          DECIMAL(14,2) DEFAULT 0,
  tiene_credito_aprobado  BOOLEAN NOT NULL DEFAULT FALSE,
  pct_descuento           DECIMAL(6,4) DEFAULT 0,
  idioma_defecto          idioma_codigo NOT NULL DEFAULT 'es',
  moneda_defecto          moneda_codigo NOT NULL DEFAULT 'USD',
  codigo_sap              VARCHAR(30),
  activo                  BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

-- ---------------------------------------------------------------------------
-- CatAlogos base
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maquina (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nombre                      VARCHAR(100) NOT NULL,
  tipo                        proceso_productivo NOT NULL,
  activa                      BOOLEAN NOT NULL DEFAULT TRUE,
  minuto_hombre               DECIMAL(10,4) NOT NULL DEFAULT 0,
  factor_tiraje               DECIMAL(10,4) NOT NULL DEFAULT 1,
  factor_montaje_estacion     DECIMAL(10,4) NOT NULL DEFAULT 0,
  factor_preparacion          DECIMAL(10,4) NOT NULL DEFAULT 10,
  macula_default_pies         INT NOT NULL DEFAULT 100,
  factor_tiraje_digital       DECIMAL(10,4),
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);

CREATE TABLE IF NOT EXISTS maquina_capacidad (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  maquina_id                  UUID NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
  clasificacion               VARCHAR(50) NOT NULL,
  proceso                     VARCHAR(100) NOT NULL,
  subproceso                  VARCHAR(100),
  unidad_trabajo              VARCHAR(50),
  tiempo_preparacion_general  DECIMAL(10,4) DEFAULT 0,
  tiempo_adicional_preparacion DECIMAL(10,4) DEFAULT 0,
  tiempo_por_estacion         DECIMAL(10,4) DEFAULT 0,
  factor_proceso_por_area     DECIMAL(10,4) DEFAULT 0,
  velocidad_produccion        DECIMAL(10,4) DEFAULT 0,
  costo_hora_maquina          DECIMAL(12,4) DEFAULT 0,
  costo_hora_operario         DECIMAL(12,4) DEFAULT 0,
  formula_tiempo              TEXT,
  formula_costo               TEXT,
  activa                      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  codigo                      VARCHAR(20) NOT NULL,
  nombre                      VARCHAR(200) NOT NULL,
  ancho_mm                    DECIMAL(10,3) NOT NULL,
  gramaje_g_m2                DECIMAL(10,3),
  calibre_micras              DECIMAL(10,3),
  costo_x_msi                 DECIMAL(12,6) DEFAULT 0,
  costo_x_m2                  DECIMAL(12,6) DEFAULT 0,
  costo_x_kg                  DECIMAL(12,6) DEFAULT 0,
  compatible_convencional     BOOLEAN NOT NULL DEFAULT TRUE,
  compatible_digital          BOOLEAN NOT NULL DEFAULT TRUE,
  tipo_proforma               VARCHAR(100),
  activo                      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS troquel (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  codigo                      VARCHAR(20) NOT NULL,
  descripcion                 VARCHAR(200),
  ancho_mm                    DECIMAL(10,3) NOT NULL,
  largo_mm                    DECIMAL(10,3) NOT NULL,
  cantidad_filas              INT NOT NULL DEFAULT 1,
  dientes                     INT NOT NULL DEFAULT 0,
  repeticiones                INT NOT NULL DEFAULT 1,
  estado                      VARCHAR(30) DEFAULT 'Bueno',
  activo                      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS version_costos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  codigo            VARCHAR(30) NOT NULL,
  descripcion       VARCHAR(200),
  fecha_inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  snapshot_json     JSONB NOT NULL DEFAULT '{}',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS costo_general (
  tenant_id                     UUID PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
  pct_imprevistos               DECIMAL(6,4) NOT NULL DEFAULT 0.03,
  pct_financieros               DECIMAL(6,4) NOT NULL DEFAULT 0.02,
  pct_vendedor                  DECIMAL(6,4) NOT NULL DEFAULT 0.05,
  pct_departamento_conv         DECIMAL(6,4) NOT NULL DEFAULT 0.04,
  pct_departamento_digital      DECIMAL(6,4) NOT NULL DEFAULT 0.04,
  costo_minimo                  DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  pct_iva                       DECIMAL(6,4) NOT NULL DEFAULT 0.13,
  cyrel_costo_cm2               DECIMAL(12,6) NOT NULL DEFAULT 0,
  cyrel_cantidad_minima_cm2     DECIMAL(10,2) NOT NULL DEFAULT 0,
  cyrel_rendimiento             DECIMAL(6,4) NOT NULL DEFAULT 0,
  preprensa_costo_hora_conv     DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_factor_min_tipo_conv DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_costo_hora_digital  DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_factor_min_tipo_digital DECIMAL(10,4) NOT NULL DEFAULT 0,
  empaque_cantidad_x_minuto     DECIMAL(10,4) DEFAULT 0,
  empaque_minuto_hombre         DECIMAL(10,4) DEFAULT 0,
  empaque_tiempo_movilizacion   DECIMAL(10,4) DEFAULT 0,
  empaque_tiempo_confeccion     DECIMAL(10,4) DEFAULT 0,
  dias_habiles_nuevo            INT NOT NULL DEFAULT 10,
  dias_habiles_repeticion       INT NOT NULL DEFAULT 8,
  dias_habiles_pruebas          INT NOT NULL DEFAULT 5,
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS costo_acabado (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tipo                          VARCHAR(50) NOT NULL,
  subtipo                       VARCHAR(100),
  costo_x_msi                   DECIMAL(12,6) DEFAULT 0,
  costo_x_m2                    DECIMAL(12,6) DEFAULT 0,
  costo_x_pie                   DECIMAL(12,6) DEFAULT 0,
  costo_fijo                    DECIMAL(12,4) DEFAULT 0,
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, tipo, subtipo)
);

-- ---------------------------------------------------------------------------
-- Cotizaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizacion (
  id                            VARCHAR(20) PRIMARY KEY,
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  socio_id                      UUID REFERENCES socio(id),
  vendedor_id                   UUID NOT NULL REFERENCES usuario(id),
  cotizador_id                  UUID REFERENCES usuario(id),
  tipo                          tipo_cotizacion NOT NULL DEFAULT 'regular',
  estado                        estado_cotizacion NOT NULL DEFAULT 'borrador',
  contacto_nombre               VARCHAR(200),
  contacto_apellidos            VARCHAR(200),
  contacto_email                VARCHAR(255),
  contacto_telefono             VARCHAR(30),
  fecha_creacion                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vencimiento             DATE,
  opcion_vencimiento            VARCHAR(20) DEFAULT '15 dias',
  moneda                        moneda_codigo NOT NULL DEFAULT 'USD',
  idioma                        idioma_codigo NOT NULL DEFAULT 'es',
  cantidad_decimales            SMALLINT NOT NULL DEFAULT 2,
  condicion_pago                VARCHAR(150),
  tiempo_entrega                VARCHAR(100),
  pct_adelanto                  DECIMAL(6,4) DEFAULT 0,
  pie_pagina                    TEXT,
  titulo_cotizacion             VARCHAR(300),
  version_costos_id             UUID REFERENCES version_costos(id),
  enviada_check                 BOOLEAN NOT NULL DEFAULT FALSE,
  enviada_timestamp             TIMESTAMPTZ,
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por                    UUID REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS cotizacion_secuencia (
  tenant_id                     UUID PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
  ultimo_id                     BIGINT NOT NULL DEFAULT 100000
);

-- ---------------------------------------------------------------------------
-- CAlculo flexo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calculo_flexo (
  id                            VARCHAR(20) PRIMARY KEY,
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  cotizacion_id                 VARCHAR(20) NOT NULL REFERENCES cotizacion(id) ON DELETE CASCADE,
  nombre_trabajo                VARCHAR(300) NOT NULL,
  tipo_producto                 VARCHAR(100),
  codigo_producto               VARCHAR(50),
  version_producto              VARCHAR(50),
  formato                       formato_cotizacion NOT NULL DEFAULT 'simple',
  proceso_productivo            proceso_productivo NOT NULL DEFAULT 'Digital',
  dim_ancho_mm                  DECIMAL(10,4),
  dim_largo_mm                  DECIMAL(10,4),
  cantidad_tintas               SMALLINT DEFAULT 0,
  cantidad_pantones             SMALLINT DEFAULT 0,
  cmyk_check                    BOOLEAN NOT NULL DEFAULT FALSE,
  tinta_blanca_check            BOOLEAN NOT NULL DEFAULT FALSE,
  doble_pasada_check            BOOLEAN NOT NULL DEFAULT FALSE,
  sin_impresion                 BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_orden                    tipo_orden_enum,
  cantidad_tipos                SMALLINT DEFAULT 1,
  cantidad_cambios              SMALLINT DEFAULT 0,
  maquina_digital_id            UUID REFERENCES maquina(id),
  material_conv_id              UUID REFERENCES material(id),
  material_digital_id           UUID REFERENCES material(id),
  troquel_conv_id               UUID REFERENCES troquel(id),
  troquel_digital_id            UUID REFERENCES troquel(id),
  troquelado_check              BOOLEAN NOT NULL DEFAULT FALSE,
  barniz_check                  BOOLEAN NOT NULL DEFAULT FALSE,
  barniz_tipo                   VARCHAR(100),
  laminado_check                BOOLEAN NOT NULL DEFAULT FALSE,
  laminado_tipo                 VARCHAR(100),
  estampado_check               BOOLEAN NOT NULL DEFAULT FALSE,
  estampado_tipo                VARCHAR(100),
  estampado_ancho_mm            DECIMAL(10,4),
  tipo_etiquetado               tipo_etiquetado,
  tipo_salida                   tipo_salida_rollo,
  ancho_core_mm                 DECIMAL(10,4),
  diametro_core                 VARCHAR(30),
  etiquetas_x_rollo             INT,
  requiere_sri                  BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_prueba_color         BOOLEAN NOT NULL DEFAULT FALSE,
  macula_conv_pies_override     INT,
  macula_digital_pies_override  INT,
  cyrel_check                   VARCHAR(20) DEFAULT 'No',
  costo_arte_interno            DECIMAL(12,4) DEFAULT 0,
  costo_troquel_interno         DECIMAL(12,4) DEFAULT 0,
  costo_flete_interno           DECIMAL(12,4) DEFAULT 0,
  costo_maquila_interno         DECIMAL(12,4) DEFAULT 0,
  costo_envio                   DECIMAL(12,4) DEFAULT 0,
  pct_comision_agencia          DECIMAL(6,4) DEFAULT 0,
  elemento_padre_id             VARCHAR(20) REFERENCES calculo_flexo(id),
  facturar_en_juegos            BOOLEAN NOT NULL DEFAULT FALSE,
  linea_opcional_check          BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por                    UUID REFERENCES usuario(id),
  modificado_por                UUID REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS calculo_flexo_secuencia (
  tenant_id                     UUID PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
  ultimo_id                     BIGINT NOT NULL DEFAULT 500000
);

CREATE TABLE IF NOT EXISTS cantidad_calculo_flexo (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  calculo_id                    VARCHAR(20) NOT NULL REFERENCES calculo_flexo(id) ON DELETE CASCADE,
  posicion                      SMALLINT NOT NULL,
  cantidad_productos            INT NOT NULL,
  proceso_productivo            proceso_productivo,
  maquina_id                    UUID REFERENCES maquina(id),
  conv_pies_total               DECIMAL(14,4),
  conv_msi_total                DECIMAL(14,4),
  conv_area_m2                  DECIMAL(14,6),
  digital_pies_total            DECIMAL(14,4),
  digital_msi_total             DECIMAL(14,4),
  digital_area_m2               DECIMAL(14,6),
  costo_material                DECIMAL(14,4) DEFAULT 0,
  costo_preprensa               DECIMAL(14,4) DEFAULT 0,
  costo_montaje                 DECIMAL(14,4) DEFAULT 0,
  costo_tiraje                  DECIMAL(14,4) DEFAULT 0,
  costo_tintas                  DECIMAL(14,4) DEFAULT 0,
  costo_impresion               DECIMAL(14,4) DEFAULT 0,
  costo_troquelado              DECIMAL(14,4) DEFAULT 0,
  costo_barniz                  DECIMAL(14,4) DEFAULT 0,
  costo_laminado                DECIMAL(14,4) DEFAULT 0,
  costo_estampado               DECIMAL(14,4) DEFAULT 0,
  costo_rebobinado              DECIMAL(14,4) DEFAULT 0,
  costo_empaque                 DECIMAL(14,4) DEFAULT 0,
  costo_cyrel                   DECIMAL(14,4) DEFAULT 0,
  subtotal_costos               DECIMAL(14,4) DEFAULT 0,
  subtotal_antes_iv_usd         DECIMAL(14,4),
  impuestos_usd                 DECIMAL(14,4),
  total_con_iv_usd              DECIMAL(14,4),
  precio_millar_usd             DECIMAL(14,6),
  precio_unitario_usd           DECIMAL(14,8),
  tipo_cambio_snap              DECIMAL(10,4),
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (calculo_id, posicion)
);

-- ---------------------------------------------------------------------------
-- NUEVO: linea de procesos del cAlculo
-- Esto no estaba explAcito en el SQL original, pero la UI web ya lo necesita.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calculo_flexo_proceso (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  calculo_id                    VARCHAR(20) NOT NULL REFERENCES calculo_flexo(id) ON DELETE CASCADE,
  numero_secuencia              SMALLINT NOT NULL,
  bloque_tipo                   VARCHAR(40) NOT NULL,    -- design, plates, print, finish, support
  bloque_nombre                 VARCHAR(120) NOT NULL,   -- DiseAo, Planchas, Impresion en P7, Barniz...
  proceso                       VARCHAR(120),            -- Barniz, Troquelado, Grabado lAser...
  subproceso                    VARCHAR(120),
  maquina_id                    UUID REFERENCES maquina(id),
  es_inline                     BOOLEAN NOT NULL DEFAULT FALSE,
  preset_clave                  VARCHAR(80),
  activo                        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (calculo_id, numero_secuencia, bloque_nombre)
);

CREATE TABLE IF NOT EXISTS calculo_flexo_proceso_variable (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id                    UUID NOT NULL REFERENCES calculo_flexo_proceso(id) ON DELETE CASCADE,
  nombre                        VARCHAR(120) NOT NULL,
  tipo_valor                    VARCHAR(20) NOT NULL DEFAULT 'number',  -- number, text, boolean, option
  valor_numero                  DECIMAL(18,6),
  valor_texto                   TEXT,
  valor_booleano                BOOLEAN,
  unidad                        VARCHAR(30),
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- ondices minimos
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuario_tenant ON usuario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_socio_tenant ON socio(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maquina_tenant ON maquina(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maquina_capacidad_tenant ON maquina_capacidad(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_tenant ON material(tenant_id);
CREATE INDEX IF NOT EXISTS idx_troquel_tenant ON troquel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_tenant ON cotizacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha ON cotizacion(tenant_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_cotizacion ON calculo_flexo(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_tenant ON calculo_flexo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cantidad_calculo_flexo_calculo ON cantidad_calculo_flexo(calculo_id);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_proceso_calculo ON calculo_flexo_proceso(calculo_id, numero_secuencia);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_proceso_variable_proceso ON calculo_flexo_proceso_variable(proceso_id);

