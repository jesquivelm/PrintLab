-- ============================================================================
-- PRINTLAB ERP - ESQUEMA COMPLETO DE BASE DE DATOS
-- Generado: 2026-07-26
-- Motor: PostgreSQL 15+ con extensión pgcrypto
-- Consolidado desde: schema.sql, schema_flexo_core.sql, schema_planificacion.sql,
--                    schema_tintas.sql, y todas las migraciones
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PARTE 1: TIPOS ENUMERADOS GLOBALES
-- ============================================================================

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
      'admin_tenant', 'vendedor', 'cotizador', 'cotizador_avanzado',
      'seguimiento', 'arte', 'preprensa', 'operario', 'calidad',
      'administracion', 'soporte'
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

-- ============================================================================
-- PARTE 2: SISTEMA / CONFIGURACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    records_imported INTEGER NOT NULL DEFAULT 0,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- ============================================================================
-- PARTE 3: MULTI-TENANT Y USUARIOS
-- ============================================================================

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
  must_change_password          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

-- ============================================================================
-- PARTE 4: SOCIOS / CLIENTES / PROVEEDORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT UNIQUE,
    prospect_code TEXT,
    partner_name TEXT,
    salesperson_name TEXT,
    tax_id TEXT,
    email TEXT,
    email_facturacion TEXT,
    currency_code TEXT,
    payment_terms TEXT,
    sector TEXT,
    sub_sector TEXT,
    is_tax_exempt BOOLEAN,
    allowed_percentage NUMERIC(12,4),
    client_type TEXT,
    creation_date DATE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_partner_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT,
    contact_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    fax TEXT,
    position TEXT,
    is_legal_representative BOOLEAN,
    country TEXT,
    state_province TEXT,
    county TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_partner_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT,
    address_name TEXT,
    address_type TEXT,
    country TEXT,
    state_province TEXT,
    county TEXT,
    district TEXT,
    address_line TEXT,
    zip_code TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ============================================================================
-- PARTE 5: CATÁLOGOS - MÁQUINAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_key TEXT UNIQUE,
    machine_name TEXT,
    brand TEXT,
    model TEXT,
    process TEXT,
    subprocess TEXT,
    category TEXT,
    work_unit TEXT,
    setup_base_minutes NUMERIC(12,4),
    setup_per_station_minutes NUMERIC(12,4),
    setup_extra_minutes NUMERIC(12,4),
    production_speed NUMERIC(12,4),
    hourly_machine_cost NUMERIC(12,4),
    hourly_operator_cost NUMERIC(12,4),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  especificaciones            JSONB DEFAULT '{}'::jsonb,
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

-- ============================================================================
-- PARTE 6: CATÁLOGOS - MATERIALES / SUSTRATOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code TEXT UNIQUE,
    material_name TEXT,
    display_name TEXT,
    presentation_type TEXT,
    provider TEXT,
    width_inches NUMERIC(12,4),
    length_value NUMERIC(12,4),
    cost_per_kg_usd NUMERIC(12,4),
    cost_per_linear_meter_usd NUMERIC(12,4),
    cost_per_unit_usd NUMERIC(12,4),
    active BOOLEAN,
    digital_enabled BOOLEAN,
    conventional_enabled BOOLEAN,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ============================================================================
-- PARTE 7: CATÁLOGOS - TROQUELES / DIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_dies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    die_code TEXT UNIQUE,
    description TEXT,
    category TEXT,
    dimensions TEXT,
    teeth NUMERIC(12,4),
    rows_count NUMERIC(12,4),
    repetitions NUMERIC(12,4),
    material_width NUMERIC(12,4),
    status TEXT,
    use_digital BOOLEAN,
    use_conventional BOOLEAN,
    ancho_mm DECIMAL(10,3),
    largo_mm DECIMAL(10,3),
    area_cm2 DECIMAL(12,4) DEFAULT 0,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS troquel (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  codigo                      VARCHAR(20) NOT NULL,
  descripcion                 VARCHAR(200),
  descripcion_cotizaciones    VARCHAR(200),
  clasificacion               VARCHAR(80),
  codigo_cliente              VARCHAR(80),
  codigo_preprensa            VARCHAR(80),
  codigo_proveedor            VARCHAR(80),
  ancho_mm                    DECIMAL(10,3) NOT NULL,
  largo_mm                    DECIMAL(10,3) NOT NULL,
  desarrollo_cm               DECIMAL(10,3),
  desarrollo_in               DECIMAL(10,4),
  elongacion_pct              DECIMAL(10,4),
  elongado                    DECIMAL(10,4),
  ancho_total_troquel_in      DECIMAL(10,4),
  largo_total_troquel_in      DECIMAL(10,4),
  dimensiones_troquel_in      VARCHAR(80),
  ancho_etiqueta_in           DECIMAL(10,4),
  largo_etiqueta_in           DECIMAL(10,4),
  ancho_material_in           DECIMAL(10,4),
  area_etiqueta_excesos_in    DECIMAL(12,6),
  area_etiqueta_in            DECIMAL(12,6),
  area_troquel_in2            DECIMAL(12,6),
  estructura_troquel          VARCHAR(80),
  formato                     VARCHAR(40),
  gap_in                      DECIMAL(10,4),
  montaje_troquel             VARCHAR(80),
  observaciones               TEXT,
  proveedor_troquel           VARCHAR(120),
  tension                     VARCHAR(40),
  tipo_troquel                VARCHAR(80),
  tipo_troquel_2              VARCHAR(80),
  uso_convencional            BOOLEAN,
  uso_digital                 BOOLEAN,
  usuario_creacion            VARCHAR(80),
  vida_util_golpes_restantes  DECIMAL(14,4),
  vida_util_golpes_usados     DECIMAL(14,4),
  vida_util_golpes_total      DECIMAL(14,4),
  reemplaza_a                 VARCHAR(80),
  reemplazado_por             VARCHAR(80),
  image_url                   TEXT,
  cantidad_filas              INT NOT NULL DEFAULT 1,
  dientes                     INT NOT NULL DEFAULT 0,
  repeticiones                INT NOT NULL DEFAULT 1,
  estado                      VARCHAR(30) DEFAULT 'Bueno',
  activo                      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

-- ============================================================================
-- PARTE 8: CATÁLOGOS - PRODUCTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT UNIQUE,
    line_code TEXT,
    quote_code TEXT,
    client_code TEXT,
    client_name TEXT,
    product_name TEXT,
    product_type TEXT,
    department TEXT,
    material_name TEXT,
    quoted_machine TEXT,
    die_code TEXT,
    quantity_products NUMERIC(14,4),
    quantity_types NUMERIC(14,4),
    tint_count NUMERIC(14,4),
    width_inches NUMERIC(12,4),
    length_inches NUMERIC(12,4),
    price_unit NUMERIC(14,4),
    total_price NUMERIC(14,4),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 9: PERFILES DE COSTOS Y CONFIGURACIÓN GENERAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_cost_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT NOT NULL DEFAULT 'default',
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  preprensa_artes                DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_costo_hora_conv     DECIMAL(10,4) NOT NULL DEFAULT 0,
  diseno_artes                   DECIMAL(10,4) NOT NULL DEFAULT 0,
  diseno_costo_hora              DECIMAL(10,4) NOT NULL DEFAULT 0,
  tinta_bcm_generico             DECIMAL(10,4) NOT NULL DEFAULT 2,
  tinta_cobertura_pct            DECIMAL(10,4) NOT NULL DEFAULT 30,
  tinta_densidad                 DECIMAL(10,4) NOT NULL DEFAULT 1.5,
  tinta_costo_lb_cmyk            DECIMAL(12,4) NOT NULL DEFAULT 25,
  tinta_costo_lb_blanco          DECIMAL(12,4) NOT NULL DEFAULT 30,
  tinta_costo_lb_pantone         DECIMAL(12,4) NOT NULL DEFAULT 35,
  rebobinado_tiempo_montaje      DECIMAL(10,4) NOT NULL DEFAULT 10,
  rebobinado_waste_feet          DECIMAL(10,4) NOT NULL DEFAULT 30,
  rebobinado_waste_pct           DECIMAL(10,4) NOT NULL DEFAULT 0.5,
  empaque_cantidad_x_minuto      DECIMAL(10,4) NOT NULL DEFAULT 0,
  empaque_minuto_hombre          DECIMAL(10,4) NOT NULL DEFAULT 0,
  empaque_tiempo_movilizacion    DECIMAL(10,4) NOT NULL DEFAULT 0,
  empaque_tiempo_confeccion      DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_factor_min_tipo_conv DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_costo_hora_digital  DECIMAL(10,4) NOT NULL DEFAULT 0,
  preprensa_factor_min_tipo_digital DECIMAL(10,4) NOT NULL DEFAULT 0,
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

-- ============================================================================
-- PARTE 10: COTIZACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code TEXT UNIQUE,
    customer_code TEXT,
    customer_name TEXT,
    contact_name TEXT,
    email TEXT,
    salesperson_name TEXT,
    phone TEXT,
    status TEXT,
    created_on DATE,
    due_on DATE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code TEXT REFERENCES quotes(quote_code) ON DELETE CASCADE,
    line_code TEXT UNIQUE,
    department TEXT,
    job_name TEXT,
    material_name TEXT,
    status TEXT,
    subtotal_1 NUMERIC(14,4),
    subtotal_2 NUMERIC(14,4),
    subtotal_3 NUMERIC(14,4),
    subtotal_4 NUMERIC(14,4),
    hidden_flag BOOLEAN,
    optional_flag BOOLEAN,
    proof_flag BOOLEAN,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ============================================================================
-- PARTE 11: CÁLCULO FLEXO (CORE DEL COTIZADOR)
-- ============================================================================

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

-- ============================================================================
-- PARTE 12: CANTIDADES DEL CÁLCULO FLEXO
-- ============================================================================

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

-- ============================================================================
-- PARTE 13: LÍNEA DE PROCESOS DEL CÁLCULO
-- ============================================================================

CREATE TABLE IF NOT EXISTS calculo_flexo_proceso (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  calculo_id                    VARCHAR(20) NOT NULL REFERENCES calculo_flexo(id) ON DELETE CASCADE,
  numero_secuencia              SMALLINT NOT NULL,
  bloque_tipo                   VARCHAR(40) NOT NULL,
  bloque_nombre                 VARCHAR(120) NOT NULL,
  proceso                       VARCHAR(120),
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
  tipo_valor                    VARCHAR(20) NOT NULL DEFAULT 'number',
  valor_numero                  DECIMAL(18,6),
  valor_texto                   TEXT,
  valor_booleano                BOOLEAN,
  unidad                        VARCHAR(30),
  creado_en                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 14: CÁLCULOS (LEGACY - esquema original schema.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_code TEXT UNIQUE,
    quote_code TEXT,
    line_code TEXT,
    product_code TEXT,
    customer_code TEXT,
    process_type TEXT,
    machine_name TEXT,
    die_code TEXT,
    material_code TEXT,
    quantity NUMERIC(14,4),
    subtotal_cost NUMERIC(14,4),
    total_cost NUMERIC(14,4),
    unit_price NUMERIC(14,6),
    customer_name TEXT,
    salesperson_name TEXT,
    job_name TEXT,
    department TEXT DEFAULT 'Flexografia',
    line_status TEXT,
    width_inches NUMERIC(12,4),
    length_inches NUMERIC(12,4),
    labels_per_roll NUMERIC(14,4),
    quantity_types NUMERIC(14,4),
    quantity_changes NUMERIC(14,4),
    core_width NUMERIC(12,4),
    core_diameter TEXT,
    cmyk_enabled BOOLEAN DEFAULT false,
    application_type TEXT,
    surface_type TEXT,
    output_type TEXT,
    industrial_subtotal NUMERIC(14,4),
    overhead_cost NUMERIC(14,4),
    margin_amount NUMERIC(14,4),
    prepress_cost NUMERIC(14,4),
    packaging_cost NUMERIC(14,4),
    design_cost NUMERIC(14,4),
    additional_cost NUMERIC(14,4),
    discount_amount NUMERIC(14,4),
    tax_percent NUMERIC(8,4),
    tax_amount NUMERIC(14,4),
    consumo_tinta_por_color_lb NUMERIC(14,6),
    consumo_tinta_total_lb NUMERIC(14,6),
    costo_tinta_por_libra NUMERIC(14,6),
    material_tinta_id TEXT,
    cobertura_tinta_pct NUMERIC(8,4),
    bcm_anilox NUMERIC(12,4),
    factor_transferencia NUMERIC(8,6),
    densidad_tinta NUMERIC(8,4),
    costo_libra_cmyk NUMERIC(14,6),
    costo_libra_blanco NUMERIC(14,6),
    costo_libra_pantone NUMERIC(14,6),
    subtotal_tinta NUMERIC(14,6),
    merma_arranque_pies NUMERIC(14,4),
    merma_tiraje_pies NUMERIC(14,4),
    merma_tiraje_pct NUMERIC(8,4),
    costo_merma NUMERIC(14,6),
    costo_sustrato NUMERIC(14,6),
    pies_totales_sustrato NUMERIC(14,4),
    pies_sustrato_neto NUMERIC(14,4),
    velocidad_maquina_m_min NUMERIC(12,4),
    tiempo_setup_min NUMERIC(12,4),
    tiempo_montaje_min NUMERIC(12,4),
    tiempo_limpieza_min NUMERIC(12,4),
    costo_hora_maquina NUMERIC(14,6),
    costo_hora_operador NUMERIC(14,6),
    subtotal_maquina NUMERIC(14,6),
    subtotal_operador NUMERIC(14,6),
    tiempo_corrida_min NUMERIC(12,4),
    tiempo_total_impresion_min NUMERIC(12,4),
    barniz_material_id TEXT,
    barniz_bcm NUMERIC(12,4),
    barniz_cobertura_pct NUMERIC(8,4),
    barniz_costo_por_kg NUMERIC(14,6),
    barniz_zonificado BOOLEAN DEFAULT false,
    barniz_comentario TEXT,
    barniz_costo_total NUMERIC(14,6),
    barniz_consumo_kg NUMERIC(14,6),
    barniz_consumo_lb NUMERIC(14,6),
    barniz_tiempo_montaje_min NUMERIC(12,4),
    laminado_material_id TEXT,
    laminado_costo_por_pie_lineal NUMERIC(14,6),
    laminado_tiempo_montaje_min NUMERIC(14,4),
    laminado_comentario TEXT,
    laminado_costo_total NUMERIC(14,6),
    embosado_tiempo_montaje_min NUMERIC(12,4),
    embosado_ancho_cliche NUMERIC(12,4),
    embosado_largo_cliche NUMERIC(12,4),
    embosado_costo_cliche NUMERIC(14,6),
    embosado_comentario TEXT,
    troquelado_tiempo_montaje_min NUMERIC(12,4),
    troquelado_merma_ajuste_pies NUMERIC(14,4),
    troquelado_comentario TEXT,
    numerado_tipo TEXT,
    numerado_tiempo_montaje_min NUMERIC(12,4),
    numerado_costo_fijo NUMERIC(14,6),
    numerado_comentario TEXT,
    numerado_adjunto TEXT,
    rebobinado_maquina TEXT,
    rebobinado_tiempo_montaje_min NUMERIC(12,4),
    rebobinado_costo_hora_maquina NUMERIC(14,6),
    rebobinado_costo_operador NUMERIC(14,6),
    rebobinado_velocidad NUMERIC(12,4),
    rebobinado_merma_ajuste_pies NUMERIC(14,4),
    rebobinado_merma_operacion_pct NUMERIC(8,4),
    rebobinado_comentario TEXT,
    rebobinado_tiempo_total_min NUMERIC(12,4),
    rebobinado_costo_total NUMERIC(14,6),
    empaque_cantidad_rollos NUMERIC(14,4),
    empaque_rendimiento_por_hora NUMERIC(14,4),
    empaque_operarios NUMERIC(8,4),
    empaque_costo_por_operador NUMERIC(14,6),
    empaque_costo_externo NUMERIC(14,6),
    empaque_comentario TEXT,
    empaque_adjunto TEXT,
    empaque_horas NUMERIC(12,4),
    empaque_costo_total NUMERIC(14,6),
    merma_total_pies NUMERIC(14,4),
    merma_total_costo NUMERIC(14,6),
    subtotal_financiero NUMERIC(14,6),
    subtotal_rendimiento NUMERIC(14,6),
    precio_millar NUMERIC(14,6),
    total_colones NUMERIC(14,6),
    tipo_cambio_venta NUMERIC(14,6),
    tipo_cambio_compra NUMERIC(14,6),
    costo_minimo NUMERIC(14,6),
    porcentaje_imprevistos NUMERIC(8,4),
    porcentaje_financiero NUMERIC(8,4),
    porcentaje_iva NUMERIC(8,4),
    porcentaje_adicional NUMERIC(8,4),
    tiempo_diseno_horas NUMERIC(12,4),
    tiempo_preprensa_horas NUMERIC(12,4),
    tiempo_acabados_min NUMERIC(12,4),
    tiempo_total_min NUMERIC(12,4),
    material_m2 NUMERIC(14,4),
    material_msi NUMERIC(14,4),
    material_pies_macula NUMERIC(14,4),
    material_ancho NUMERIC(12,4),
    cantidad_tintas NUMERIC(8,4),
    cantidad_pantones NUMERIC(8,4),
    tinta_blanca BOOLEAN DEFAULT false,
    doble_blanca BOOLEAN DEFAULT false,
    analisis_solicitud TEXT,
    analisis_finalizar TEXT,
    analisis_crear_orden TEXT,
    resumen_cotizacion TEXT,
    info_impresion TEXT,
    observaciones TEXT,
    estado_creacion TEXT,
    condicion_pago TEXT,
    tiempo_entrega TEXT,
    moneda TEXT,
    metodo_envio TEXT,
    tipo_orden TEXT,
    laminado_pies_lineales NUMERIC(14,4),
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    estampado_tipo TEXT,
    embosado_tipo TEXT,
    troquel_forma TEXT,
    ruta_calculada TEXT,
    montaje_resumen TEXT,
    sin_impresion BOOLEAN DEFAULT false,
    medida_fija TEXT,
    material_nombre TEXT,
    fecha_vencimiento DATE,
    seleccion_automatica JSONB,
    precio_automatico JSONB,
    ui_state JSONB,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PARTE 15: ÓRDENES DE PRODUCCIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS flexo_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE,
    quote_code TEXT,
    line_code TEXT,
    product_code TEXT,
    machine_name TEXT,
    material_code TEXT,
    die_code TEXT,
    ordered_quantity NUMERIC(14,4),
    delivered_on DATE,
    customer_name TEXT,
    salesperson_name TEXT,
    job_name TEXT,
    process_type TEXT,
    line_status TEXT,
    subtotal_cost NUMERIC(14,4),
    total_cost NUMERIC(14,4),
    unit_price NUMERIC(14,6),
    width_inches NUMERIC(12,4),
    length_inches NUMERIC(12,4),
    labels_per_roll NUMERIC(14,4),
    quantity_types NUMERIC(14,4),
    quantity_changes NUMERIC(14,4),
    core_width NUMERIC(12,4),
    core_diameter TEXT,
    cmyk_enabled BOOLEAN DEFAULT false,
    application_type TEXT,
    output_type TEXT,
    die_teeth NUMERIC(12,4),
    die_rows NUMERIC(12,4),
    die_repeats NUMERIC(12,4),
    material_feet NUMERIC(14,4),
    material_msi NUMERIC(14,4),
    material_m2 NUMERIC(14,4),
    consumo_tinta_por_color_lb NUMERIC(14,6),
    consumo_tinta_total_lb NUMERIC(14,6),
    costo_tinta_por_libra NUMERIC(14,6),
    material_tinta_id TEXT,
    cobertura_tinta_pct NUMERIC(8,4),
    bcm_anilox NUMERIC(12,4),
    factor_transferencia NUMERIC(8,6),
    densidad_tinta NUMERIC(8,4),
    costo_libra_cmyk NUMERIC(14,6),
    costo_libra_blanco NUMERIC(14,6),
    costo_libra_pantone NUMERIC(14,6),
    subtotal_tinta NUMERIC(14,6),
    merma_arranque_pies NUMERIC(14,4),
    merma_tiraje_pies NUMERIC(14,4),
    merma_tiraje_pct NUMERIC(8,4),
    costo_merma NUMERIC(14,6),
    costo_sustrato NUMERIC(14,6),
    pies_totales_sustrato NUMERIC(14,4),
    pies_sustrato_neto NUMERIC(14,4),
    velocidad_maquina_m_min NUMERIC(12,4),
    tiempo_setup_min NUMERIC(12,4),
    tiempo_montaje_min NUMERIC(12,4),
    tiempo_limpieza_min NUMERIC(12,4),
    costo_hora_maquina NUMERIC(14,6),
    costo_hora_operador NUMERIC(14,6),
    subtotal_maquina NUMERIC(14,6),
    subtotal_operador NUMERIC(14,6),
    tiempo_corrida_min NUMERIC(12,4),
    tiempo_total_impresion_min NUMERIC(12,4),
    barniz_material_id TEXT,
    barniz_bcm NUMERIC(12,4),
    barniz_cobertura_pct NUMERIC(8,4),
    barniz_costo_por_kg NUMERIC(14,6),
    barniz_zonificado BOOLEAN DEFAULT false,
    barniz_comentario TEXT,
    barniz_costo_total NUMERIC(14,6),
    barniz_consumo_kg NUMERIC(14,6),
    barniz_consumo_lb NUMERIC(14,6),
    barniz_tiempo_montaje_min NUMERIC(12,4),
    laminado_material_id TEXT,
    laminado_costo_por_pie_lineal NUMERIC(14,6),
    laminado_tiempo_montaje_min NUMERIC(14,6),
    laminado_comentario TEXT,
    laminado_costo_total NUMERIC(14,6),
    embosado_tiempo_montaje_min NUMERIC(12,4),
    embosado_ancho_cliche NUMERIC(12,4),
    embosado_largo_cliche NUMERIC(12,4),
    embosado_costo_cliche NUMERIC(14,6),
    embosado_comentario TEXT,
    troquelado_tiempo_montaje_min NUMERIC(12,4),
    troquelado_merma_ajuste_pies NUMERIC(14,4),
    troquelado_comentario TEXT,
    numerado_tipo TEXT,
    numerado_tiempo_montaje_min NUMERIC(12,4),
    numerado_costo_fijo NUMERIC(14,6),
    numerado_comentario TEXT,
    numerado_adjunto TEXT,
    rebobinado_maquina TEXT,
    rebobinado_tiempo_montaje_min NUMERIC(12,4),
    rebobinado_costo_hora_maquina NUMERIC(14,6),
    rebobinado_costo_operador NUMERIC(14,6),
    rebobinado_velocidad NUMERIC(12,4),
    rebobinado_merma_ajuste_pies NUMERIC(14,4),
    rebobinado_merma_operacion_pct NUMERIC(8,4),
    rebobinado_comentario TEXT,
    rebobinado_tiempo_total_min NUMERIC(12,4),
    rebobinado_costo_total NUMERIC(14,6),
    empaque_cantidad_rollos NUMERIC(14,4),
    empaque_rendimiento_por_hora NUMERIC(14,4),
    empaque_operarios NUMERIC(8,4),
    empaque_costo_por_operador NUMERIC(14,6),
    empaque_costo_externo NUMERIC(14,6),
    empaque_comentario TEXT,
    empaque_adjunto TEXT,
    empaque_horas NUMERIC(12,4),
    empaque_costo_total NUMERIC(14,6),
    merma_total_pies NUMERIC(14,4),
    merma_total_costo NUMERIC(14,6),
    subtotal_financiero NUMERIC(14,6),
    subtotal_rendimiento NUMERIC(14,6),
    precio_millar NUMERIC(14,6),
    total_colones NUMERIC(14,6),
    tipo_cambio_venta NUMERIC(14,6),
    tipo_cambio_compra NUMERIC(14,6),
    costo_minimo NUMERIC(14,6),
    porcentaje_imprevistos NUMERIC(8,4),
    porcentaje_financiero NUMERIC(8,4),
    porcentaje_iva NUMERIC(8,4),
    porcentaje_adicional NUMERIC(8,4),
    tiempo_diseno_horas NUMERIC(12,4),
    tiempo_preprensa_horas NUMERIC(12,4),
    tiempo_acabados_min NUMERIC(12,4),
    tiempo_total_min NUMERIC(12,4),
    material_pies_macula NUMERIC(14,4),
    material_ancho NUMERIC(12,4),
    cantidad_tintas NUMERIC(8,4),
    cantidad_pantones NUMERIC(8,4),
    tinta_blanca BOOLEAN DEFAULT false,
    doble_blanca BOOLEAN DEFAULT false,
    analisis_solicitud TEXT,
    analisis_finalizar TEXT,
    analisis_crear_orden TEXT,
    resumen_cotizacion TEXT,
    info_impresion TEXT,
    observaciones TEXT,
    estado_creacion TEXT,
    condicion_pago TEXT,
    tiempo_entrega TEXT,
    moneda TEXT,
    metodo_envio TEXT,
    tipo_orden TEXT,
    laminado_pies_lineales NUMERIC(14,4),
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    estampado_tipo TEXT,
    embosado_tipo TEXT,
    troquel_forma TEXT,
    ruta_calculada TEXT,
    montaje_resumen TEXT,
    sin_impresion BOOLEAN DEFAULT false,
    medida_fija TEXT,
    material_nombre TEXT,
    fecha_vencimiento DATE,
    seleccion_automatica JSONB,
    precio_automatico JSONB,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 16: PLANIFICACIÓN DE PRODUCCIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_process_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_key TEXT NOT NULL UNIQUE,
    process_name TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    color_hex TEXT NOT NULL DEFAULT '#378ADD',
    icon_key TEXT,
    is_parallel BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_context TEXT NOT NULL DEFAULT 'erp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_machine_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES maquina(id) ON DELETE CASCADE,
    machine_capacity_id UUID REFERENCES maquina_capacidad(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    process_key TEXT NOT NULL,
    process_name TEXT NOT NULL,
    nominal_speed_fpm NUMERIC(12,4) NOT NULL DEFAULT 0,
    setup_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
    setup_per_station_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
    hourly_machine_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    hourly_operator_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    oee_target NUMERIC(8,4) NOT NULL DEFAULT 0.85,
    max_web_width_in NUMERIC(12,4),
    min_web_width_in NUMERIC(12,4),
    supports_die_cut BOOLEAN NOT NULL DEFAULT FALSE,
    supports_varnish_uv BOOLEAN NOT NULL DEFAULT FALSE,
    supports_lamination BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (machine_capacity_id)
);

CREATE TABLE IF NOT EXISTS production_order_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    quote_code TEXT,
    line_code TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    process_key TEXT NOT NULL,
    process_name TEXT NOT NULL,
    machine_profile_id UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
    planned_start_at TIMESTAMPTZ,
    planned_end_at TIMESTAMPTZ,
    start_turn_hour NUMERIC(8,4),
    duration_hours NUMERIC(8,4),
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    dependency_route_id UUID REFERENCES production_order_routes(id) ON DELETE SET NULL,
    transition_cost_min INTEGER NOT NULL DEFAULT 0,
    route_status TEXT NOT NULL DEFAULT 'PENDIENTE',
    source_mode TEXT NOT NULL DEFAULT 'auto',
    route_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_code, sequence_order)
);

CREATE TABLE IF NOT EXISTS production_stop_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_group TEXT NOT NULL,
    reason_code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_route_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
    operator_name TEXT,
    event_type TEXT NOT NULL,
    stop_reason_id UUID REFERENCES production_stop_reasons(id) ON DELETE SET NULL,
    notes TEXT,
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
    feet_consumed NUMERIC(14,4) DEFAULT 0,
    setup_waste_feet NUMERIC(14,4) DEFAULT 0,
    run_waste_feet NUMERIC(14,4) DEFAULT 0,
    useful_feet NUMERIC(14,4) GENERATED ALWAYS AS (COALESCE(feet_consumed,0) - COALESCE(setup_waste_feet,0) - COALESCE(run_waste_feet,0)) STORED,
    final_speed_fpm NUMERIC(12,4),
    anilox_line TEXT,
    cylinder_pressure TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 17: CALENDARIO DE RECURSOS (Finite Capacity Planning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_name TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL DEFAULT 'machine',
    resource_id UUID,
    resource_name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Costa_Rica',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES resource_calendars(id) ON DELETE CASCADE,
    shift_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_hour NUMERIC(5,2) NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
    end_hour NUMERIC(5,2) NOT NULL CHECK (end_hour > 0 AND end_hour <= 24),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (calendar_id, shift_name, day_of_week)
);

CREATE TABLE IF NOT EXISTS resource_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES resource_calendars(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type TEXT NOT NULL DEFAULT 'closure',
    description TEXT,
    override_start_hour NUMERIC(5,2),
    override_end_hour NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (calendar_id, exception_date)
);

CREATE TABLE IF NOT EXISTS production_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_code TEXT NOT NULL UNIQUE,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT 'process',
    process_key TEXT NOT NULL DEFAULT '',
    machine_profile_id UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
    calendar_id UUID REFERENCES resource_calendars(id) ON DELETE SET NULL,
    capacity_units NUMERIC(8,2) NOT NULL DEFAULT 1,
    efficiency_factor NUMERIC(8,4) NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_resource_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES production_resources(id) ON DELETE CASCADE,
    process_key TEXT NOT NULL,
    proficiency NUMERIC(8,4) NOT NULL DEFAULT 1,
    max_parallel_jobs INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource_id, process_key)
);

CREATE TABLE IF NOT EXISTS production_capacity_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_capacity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type TEXT NOT NULL DEFAULT 'automatic',
    scenario_id UUID REFERENCES production_capacity_scenarios(id) ON DELETE SET NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    input_hash TEXT NOT NULL DEFAULT '',
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 18: MES - HISTORIAL DE ESTACIONES Y ESPECIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_station_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
    product_code TEXT,
    machine_name TEXT,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 8),
    ink_type TEXT NOT NULL DEFAULT 'empty',
    viscosity NUMERIC(8,2),
    temperature NUMERIC(8,2),
    anilox_code TEXT,
    pantone_ref TEXT,
    barniz_tipo TEXT,
    barniz_zonif TEXT,
    barniz_zona TEXT,
    uv_power TEXT,
    uv_temp TEXT,
    operator_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_machine_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_profile_id UUID NOT NULL REFERENCES production_machine_profiles(id) ON DELETE CASCADE,
    spec_group TEXT NOT NULL DEFAULT 'dimensiones',
    spec_key TEXT NOT NULL,
    spec_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (machine_profile_id, spec_key)
);

-- ============================================================================
-- PARTE 19: GESTIÓN DE TINTAS (schema tintas)
-- ============================================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_tipo_producto') THEN
  CREATE TYPE tintas_tipo_producto AS ENUM ('TINTA_UV','BARNIZ','PRIMER','ADHESIVO','BASE','BLANCO','TRANSPARENTE','EXTENDER','DILUYENTE','SOLVENTE','LIMPIADOR','ADITIVO','RETARDANTE','ACELERANTE','OTRO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_unidad_medida') THEN
  CREATE TYPE tintas_unidad_medida AS ENUM ('KG','G','LB','OZ','L','ML','GAL');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_estado_producto') THEN
  CREATE TYPE tintas_estado_producto AS ENUM ('ACTIVO','INACTIVO','VENCIDO','BLOQUEADO','DESCONTINUADO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_origen_inventario') THEN
  CREATE TYPE tintas_origen_inventario AS ENUM ('SAP','ERP_LOCAL');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_tipo_movimiento') THEN
  CREATE TYPE tintas_tipo_movimiento AS ENUM ('ENTRADA','SALIDA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','TRANSFERENCIA','CONSUMO_PRODUCCION','DEVOLUCION','MERMA');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_estado_receta') THEN
  CREATE TYPE tintas_estado_receta AS ENUM ('BORRADOR','VIGENTE','ARCHIVADO','OBSOLETO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_tipo_asociacion_producto') THEN
  CREATE TYPE tintas_tipo_asociacion_producto AS ENUM ('RECOMENDADO','OBLIGATORIO');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tinta_estado_consumo') THEN
  CREATE TYPE tintas_estado_consumo AS ENUM ('PENDIENTE','PROCESADO','ANULADO');
END IF; END $$;

-- Tintas: Catálogos base
CREATE TABLE IF NOT EXISTS tintas_familias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas_marcas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    VARCHAR(120) NOT NULL UNIQUE,
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas_fabricantes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    VARCHAR(160) NOT NULL,
  pais      VARCHAR(80),
  contacto  VARCHAR(160),
  telefono  VARCHAR(40),
  email     VARCHAR(160),
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas_ubicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(40) NOT NULL UNIQUE,
  descripcion VARCHAR(160) NOT NULL,
  bodega      VARCHAR(80),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tintas: Inventario
CREATE TABLE IF NOT EXISTS tintas_productos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sap                VARCHAR(40) UNIQUE,
  codigo_interno            VARCHAR(40) NOT NULL UNIQUE,
  origen_inventario         tintas_origen_inventario NOT NULL DEFAULT 'ERP_LOCAL',
  sap_ultima_sincronizacion TIMESTAMPTZ,
  sap_hash_version          VARCHAR(64),
  nombre                    VARCHAR(200) NOT NULL,
  tipo                      tintas_tipo_producto NOT NULL,
  familia_id                UUID REFERENCES tintas_familias(id),
  fabricante_id             UUID REFERENCES tintas_fabricantes(id),
  marca_id                  UUID REFERENCES tintas_marcas(id),
  proveedor_id              UUID REFERENCES business_partners(id),
  color                     VARCHAR(80),
  pantone_base_id           UUID,
  unidad_medida_base        tintas_unidad_medida NOT NULL DEFAULT 'KG',
  peso_por_envase           NUMERIC(14,4),
  vida_util_dias            INTEGER,
  costo_promedio            NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_ultimo              NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_defecto_id      UUID REFERENCES tintas_ubicaciones(id),
  equivalencias             JSONB,
  configuraciones           JSONB,
  observaciones             TEXT,
  estado                    tintas_estado_producto NOT NULL DEFAULT 'ACTIVO',
  creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas_lotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES tintas_productos(id),
  lote              VARCHAR(60) NOT NULL,
  sap_codigo_lote   VARCHAR(60),
  fecha_fabricacion DATE,
  fecha_vencimiento DATE,
  peso_neto         NUMERIC(14,4) NOT NULL,
  peso_disponible   NUMERIC(14,4) NOT NULL,
  unidad_medida     tintas_unidad_medida NOT NULL DEFAULT 'KG',
  costo_lote        NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_id      UUID REFERENCES tintas_ubicaciones(id),
  origen_inventario tintas_origen_inventario NOT NULL DEFAULT 'ERP_LOCAL',
  estado            tintas_estado_producto NOT NULL DEFAULT 'ACTIVO',
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tintas_lote_por_producto UNIQUE (producto_id, lote),
  CONSTRAINT ck_tintas_peso_no_negativo CHECK (peso_disponible >= 0),
  CONSTRAINT ck_tintas_peso_no_excede CHECK (peso_disponible <= peso_neto)
);

CREATE TABLE IF NOT EXISTS tintas_movimientos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id          UUID NOT NULL REFERENCES tintas_productos(id),
  lote_id              UUID REFERENCES tintas_lotes(id),
  tipo                 tintas_tipo_movimiento NOT NULL,
  cantidad             NUMERIC(14,4) NOT NULL,
  unidad_medida        tintas_unidad_medida NOT NULL,
  costo_unitario       NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_total          NUMERIC(14,4) NOT NULL DEFAULT 0,
  ubicacion_origen_id  UUID REFERENCES tintas_ubicaciones(id),
  ubicacion_destino_id UUID REFERENCES tintas_ubicaciones(id),
  orden_produccion_id  UUID REFERENCES flexo_orders(id),
  referencia_documento VARCHAR(80),
  origen_sistema       VARCHAR(20) NOT NULL DEFAULT 'ERP',
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  observaciones        TEXT
);

-- Tintas: Pantones / Formulación
CREATE TABLE IF NOT EXISTS tintas_pantones_biblioteca (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pantone VARCHAR(40) NOT NULL,
  nombre         VARCHAR(160),
  color_hex      VARCHAR(9),
  descripcion    TEXT,
  frecuencia_uso INTEGER NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tintas_pantone_codigo UNIQUE (codigo_pantone)
);

CREATE TABLE IF NOT EXISTS tintas_pantones_recetas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_interno      VARCHAR(40) NOT NULL UNIQUE,
  nombre              VARCHAR(160) NOT NULL,
  pantone_id          UUID REFERENCES tintas_pantones_biblioteca(id),
  cliente_id          UUID REFERENCES business_partners(id),
  producto_id         UUID REFERENCES flexo_products(id),
  orden_produccion_id UUID REFERENCES flexo_orders(id),
  version             INTEGER NOT NULL DEFAULT 1,
  receta_padre_id     UUID REFERENCES tintas_pantones_recetas(id),
  es_vigente          BOOLEAN NOT NULL DEFAULT FALSE,
  estado              tintas_estado_receta NOT NULL DEFAULT 'BORRADOR',
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones       TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tintas_pantones_receta_componentes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id         UUID NOT NULL REFERENCES tintas_pantones_recetas(id) ON DELETE CASCADE,
  producto_tinta_id UUID NOT NULL REFERENCES tintas_productos(id),
  porcentaje        NUMERIC(6,3) NOT NULL,
  orden             INTEGER NOT NULL DEFAULT 0,
  observaciones     TEXT,
  CONSTRAINT ck_tintas_porcentaje_valido CHECK (porcentaje > 0 AND porcentaje <= 100)
);

CREATE TABLE IF NOT EXISTS tintas_pantones_clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES business_partners(id),
  pantone_id UUID NOT NULL REFERENCES tintas_pantones_biblioteca(id),
  exclusivo  BOOLEAN NOT NULL DEFAULT FALSE,
  notas      TEXT,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tintas_pantone_cliente UNIQUE (cliente_id, pantone_id)
);

CREATE TABLE IF NOT EXISTS tintas_pantones_productos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES flexo_products(id),
  pantone_id        UUID NOT NULL REFERENCES tintas_pantones_biblioteca(id),
  tipo_asociacion   tintas_tipo_asociacion_producto NOT NULL DEFAULT 'RECOMENDADO',
  vigente_desde     DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta     DATE,
  CONSTRAINT uq_tintas_pantone_producto UNIQUE (producto_id, pantone_id, vigente_desde)
);

-- Tintas: Consumo por orden
CREATE TABLE IF NOT EXISTS tintas_consumo_orden (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_produccion_id   UUID NOT NULL REFERENCES flexo_orders(id),
  receta_id             UUID REFERENCES tintas_pantones_recetas(id),
  cantidad_producida    NUMERIC(14,4) NOT NULL,
  unidad_medida         tintas_unidad_medida NOT NULL DEFAULT 'KG',
  fecha_cierre          TIMESTAMPTZ,
  costo_total_consumido NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_por_kg          NUMERIC(14,4),
  costo_por_metro       NUMERIC(14,4),
  costo_por_pie_lineal  NUMERIC(14,4),
  costo_por_etiqueta    NUMERIC(14,4),
  costo_por_trabajo     NUMERIC(14,4),
  estado                tintas_estado_consumo NOT NULL DEFAULT 'PENDIENTE',
  observaciones         TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tintas_consumo_por_orden UNIQUE (orden_produccion_id)
);

CREATE TABLE IF NOT EXISTS tintas_consumo_detalle (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumo_id              UUID NOT NULL REFERENCES tintas_consumo_orden(id) ON DELETE CASCADE,
  producto_tinta_id       UUID NOT NULL REFERENCES tintas_productos(id),
  lote_id                 UUID REFERENCES tintas_lotes(id),
  cantidad_calculada      NUMERIC(14,4) NOT NULL,
  cantidad_real_consumida NUMERIC(14,4),
  unidad_medida           tintas_unidad_medida NOT NULL DEFAULT 'KG',
  costo_unitario          NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_total             NUMERIC(14,4) NOT NULL DEFAULT 0,
  movimiento_id           UUID REFERENCES tintas_movimientos(id),
  fecha_hora              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tintas: Auditoría
CREATE TABLE IF NOT EXISTS tintas_auditoria (
  id             BIGSERIAL PRIMARY KEY,
  tabla          VARCHAR(80) NOT NULL,
  registro_id    UUID NOT NULL,
  accion         VARCHAR(10) NOT NULL,
  campo          VARCHAR(80),
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  fecha          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tintas: Sincronización SAP
CREATE TABLE IF NOT EXISTS tintas_sap_sincronizacion_log (
  id            BIGSERIAL PRIMARY KEY,
  entidad       VARCHAR(40) NOT NULL,
  registro_id   UUID NOT NULL,
  direccion     VARCHAR(20) NOT NULL,
  estado        VARCHAR(20) NOT NULL,
  payload       JSONB,
  mensaje_error TEXT,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 20: ÍNDICES
-- ============================================================================

-- Business Partners
CREATE INDEX IF NOT EXISTS idx_business_partners_name ON business_partners(partner_name);

-- Quotes / Cotizaciones
CREATE INDEX IF NOT EXISTS idx_quotes_customer_code ON quotes(customer_code);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_code ON quote_lines(quote_code);
CREATE INDEX IF NOT EXISTS idx_cotizacion_tenant ON cotizacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha ON cotizacion(tenant_id, fecha_creacion DESC);

-- Usuarios / Socios
CREATE INDEX IF NOT EXISTS idx_usuario_tenant ON usuario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_socio_tenant ON socio(tenant_id);

-- Máquinas / Capacidades
CREATE INDEX IF NOT EXISTS idx_maquina_tenant ON maquina(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maquina_capacidad_tenant ON maquina_capacidad(tenant_id);

-- Materiales / Troqueles
CREATE INDEX IF NOT EXISTS idx_material_tenant ON material(tenant_id);
CREATE INDEX IF NOT EXISTS idx_troquel_tenant ON troquel(tenant_id);

-- Cálculo Flexo
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_cotizacion ON calculo_flexo(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_tenant ON calculo_flexo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cantidad_calculo_flexo_calculo ON cantidad_calculo_flexo(calculo_id);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_proceso_calculo ON calculo_flexo_proceso(calculo_id, numero_secuencia);
CREATE INDEX IF NOT EXISTS idx_calculo_flexo_proceso_variable_proceso ON calculo_flexo_proceso_variable(proceso_id);

-- Flexo Calculations (legacy)
CREATE INDEX IF NOT EXISTS idx_flexo_calculations_quote_code ON flexo_calculations(quote_code);
CREATE INDEX IF NOT EXISTS idx_flexo_calculations_quote_line_created ON flexo_calculations(quote_code, line_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fc_customer_name ON flexo_calculations(customer_name);
CREATE INDEX IF NOT EXISTS idx_fc_line_status ON flexo_calculations(line_status);
CREATE INDEX IF NOT EXISTS idx_fc_job_name ON flexo_calculations(job_name);

-- Flexo Orders
CREATE INDEX IF NOT EXISTS idx_flexo_orders_quote_code ON flexo_orders(quote_code);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_created_at ON flexo_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_line_code ON flexo_orders(line_code);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_quote_line ON flexo_orders(quote_code, line_code);

-- Flexo Products
CREATE INDEX IF NOT EXISTS idx_flexo_products_quote_line ON flexo_products(quote_code, line_code);

-- Production Planning
CREATE INDEX IF NOT EXISTS idx_production_order_routes_order ON production_order_routes(order_code, sequence_order);
CREATE INDEX IF NOT EXISTS idx_production_order_routes_capacity ON production_order_routes(route_status, process_key, machine_profile_id);
CREATE INDEX IF NOT EXISTS idx_production_route_events_route ON production_route_events(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_waste_logs_route ON production_waste_logs(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_shifts_calendar ON resource_shifts(calendar_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_resource_calendar_exceptions_calendar ON resource_calendar_exceptions(calendar_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_production_resources_process ON production_resources(process_key, is_active);
CREATE INDEX IF NOT EXISTS idx_production_resource_skills_process ON production_resource_skills(process_key, is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_created ON production_capacity_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_period ON production_capacity_snapshots(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_production_station_configs_order ON production_station_configs(order_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_station_configs_product ON production_station_configs(product_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_machine_specs_profile ON production_machine_specs(machine_profile_id, spec_group);

-- Tintas
CREATE INDEX IF NOT EXISTS idx_tintas_productos_tipo ON tintas_productos(tipo);
CREATE INDEX IF NOT EXISTS idx_tintas_productos_estado ON tintas_productos(estado);
CREATE INDEX IF NOT EXISTS idx_tintas_productos_codigo_sap ON tintas_productos(codigo_sap);
CREATE INDEX IF NOT EXISTS idx_tintas_lotes_producto ON tintas_lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_tintas_lotes_vencimiento ON tintas_lotes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_tintas_lotes_estado ON tintas_lotes(estado);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_producto_fecha ON tintas_movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_lote ON tintas_movimientos(lote_id);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_orden ON tintas_movimientos(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_tintas_mov_tipo ON tintas_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_pantones_bib_codigo ON tintas_pantones_biblioteca(codigo_pantone);
CREATE INDEX IF NOT EXISTS idx_recetas_pantone ON tintas_pantones_recetas(pantone_id);
CREATE INDEX IF NOT EXISTS idx_recetas_cliente ON tintas_pantones_recetas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recetas_producto ON tintas_pantones_recetas(producto_id);
CREATE INDEX IF NOT EXISTS idx_recetas_vigente ON tintas_pantones_recetas(pantone_id, es_vigente) WHERE es_vigente;
CREATE INDEX IF NOT EXISTS idx_receta_comp_receta ON tintas_pantones_receta_componentes(receta_id);
CREATE INDEX IF NOT EXISTS idx_receta_comp_producto ON tintas_pantones_receta_componentes(producto_tinta_id);
CREATE INDEX IF NOT EXISTS idx_consumo_orden_orden ON tintas_consumo_orden(orden_produccion_id);
CREATE INDEX IF NOT EXISTS idx_consumo_orden_receta ON tintas_consumo_orden(receta_id);
CREATE INDEX IF NOT EXISTS idx_consumo_orden_estado ON tintas_consumo_orden(estado);
CREATE INDEX IF NOT EXISTS idx_consumo_det_consumo ON tintas_consumo_detalle(consumo_id);
CREATE INDEX IF NOT EXISTS idx_consumo_det_producto ON tintas_consumo_detalle(producto_tinta_id);
CREATE INDEX IF NOT EXISTS idx_consumo_det_lote ON tintas_consumo_detalle(lote_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON tintas_auditoria(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON tintas_auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_sap_log_entidad_registro ON tintas_sap_sincronizacion_log(entidad, registro_id);
CREATE INDEX IF NOT EXISTS idx_sap_log_estado ON tintas_sap_sincronizacion_log(estado);

-- ============================================================================
-- PARTE 21: VISTAS DE APOYO (TINTAS)
-- ============================================================================

CREATE OR REPLACE VIEW vw_tintas_existencias_actuales AS
SELECT p.id AS producto_id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base,
  COALESCE(SUM(l.peso_disponible), 0) AS existencia_total,
  COUNT(l.id) FILTER (WHERE l.estado = 'ACTIVO') AS lotes_activos
FROM tintas_productos p
LEFT JOIN tintas_lotes l ON l.producto_id = p.id AND l.estado = 'ACTIVO'
GROUP BY p.id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base;

CREATE OR REPLACE VIEW vw_tintas_lotes_proximos_vencer AS
SELECT l.*, p.nombre AS producto_nombre, p.codigo_interno
FROM tintas_lotes l
JOIN tintas_productos p ON p.id = l.producto_id
WHERE l.estado = 'ACTIVO' AND l.fecha_vencimiento IS NOT NULL
  AND l.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '30 days');

CREATE OR REPLACE VIEW vw_tintas_consumo_mensual AS
SELECT date_trunc('month', cd.fecha_hora) AS mes,
  cd.producto_tinta_id, p.nombre AS producto_nombre,
  SUM(cd.cantidad_real_consumida) AS cantidad_total,
  SUM(cd.costo_total) AS costo_total
FROM tintas_consumo_detalle cd
JOIN tintas_productos p ON p.id = cd.producto_tinta_id
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW vw_tintas_mas_utilizadas AS
SELECT p.id AS producto_id, p.nombre,
  COUNT(cd.id) AS veces_utilizada,
  SUM(cd.cantidad_real_consumida) AS cantidad_total_consumida
FROM tintas_consumo_detalle cd
JOIN tintas_productos p ON p.id = cd.producto_tinta_id
GROUP BY p.id, p.nombre
ORDER BY veces_utilizada DESC;

-- ============================================================================
-- RESUMEN DE TABLAS (48 tablas + 4 vistas)
-- ============================================================================
-- SISTEMA:          app_config, import_audit
-- MULTI-TENANT:     tenant, usuario
-- CLIENTES:         business_partners, business_partner_contacts,
--                   business_partner_addresses, socio
-- MÁQUINAS:         flexo_machines, maquina, maquina_capacidad
-- MATERIALES:       flexo_materials, material
-- TROQUELES:        flexo_dies, troquel
-- PRODUCTOS:        flexo_products
-- COSTOS:           flexo_cost_profiles, version_costos, costo_general, costo_acabado
-- COTIZACIONES:     quotes, quote_lines, cotizacion, cotizacion_secuencia
-- CÁLCULO FLEXO:    calculo_flexo, calculo_flexo_secuencia,
--                   cantidad_calculo_flexo, calculo_flexo_proceso,
--                   calculo_flexo_proceso_variable
-- LEGACY:           flexo_calculations, flexo_orders
-- PLANIFICACIÓN:    production_process_definitions, production_machine_profiles,
--                   production_order_routes, production_stop_reasons,
--                   production_route_events, production_waste_logs
-- RECURSOS:         resource_calendars, resource_shifts,
--                   resource_calendar_exceptions, production_resources,
--                   production_resource_skills
-- CAPACIDAD:        production_capacity_scenarios, production_capacity_snapshots
-- MES:              production_station_configs, production_machine_specs
-- TINTAS:           tintas_familias, tintas_marcas, tintas_fabricantes,
--                   tintas_ubicaciones, tintas_productos, tintas_lotes,
--                   tintas_movimientos, tintas_pantones_biblioteca,
--                   tintas_pantones_recetas, tintas_pantones_receta_componentes,
--                   tintas_pantones_clientes, tintas_pantones_productos,
--                   tintas_consumo_orden, tintas_consumo_detalle,
--                   tintas_auditoria, tintas_sap_sincronizacion_log
-- ============================================================================
