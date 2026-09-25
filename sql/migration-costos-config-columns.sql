-- Migración: mover la configuración de Costos (antes JSONB en app_config.config_value,
-- config_key='costos') a columnas tipadas en costo_general y a tablas normalizadas
-- para las listas (procesos, depósitos, mácula, acabados, etc).
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-costos-config-columns.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Columnas escalares nuevas en costo_general
-- ---------------------------------------------------------------------------
ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS notas                                   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ancho_rollo_default                     NUMERIC(10,4) NOT NULL DEFAULT 13,
  ADD COLUMN IF NOT EXISTS diametro_core_default                   NUMERIC(10,4) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS opciones_diametro_core                  TEXT[] NOT NULL DEFAULT ARRAY['1','1.5','3','6'],
  ADD COLUMN IF NOT EXISTS cantidad_tipos_default                  INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cmyk_default_activo                     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS margen_comercial_pct                    NUMERIC(6,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS iva_defecto_pct                         NUMERIC(6,2) NOT NULL DEFAULT 13,

  ADD COLUMN IF NOT EXISTS convencional_cobertura_diseno_pct       NUMERIC(10,4) NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS convencional_costo_plancha_in2          NUMERIC(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS convencional_tiempo_estandar_cambio_min NUMERIC(10,4) NOT NULL DEFAULT 0,

  ADD COLUMN IF NOT EXISTS coldfoil_costo_foil_m2                  NUMERIC(12,4) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coldfoil_precio_adhesivo_kg             NUMERIC(12,4) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS coldfoil_gramaje_gm2                    NUMERIC(10,4) NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS coldfoil_merma_adhesivo_pct             NUMERIC(6,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS coldfoil_cobertura_default_pct          NUMERIC(6,2) NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS coldfoil_ancho_bobina_default_in        NUMERIC(10,4) NOT NULL DEFAULT 13,
  ADD COLUMN IF NOT EXISTS coldfoil_margen_lateral_default_in      NUMERIC(10,4) NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS coldfoil_margen_longitudinal_default_in NUMERIC(10,4) NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS coldfoil_separacion_h_default_in        NUMERIC(10,4) NOT NULL DEFAULT 0.125,
  ADD COLUMN IF NOT EXISTS coldfoil_separacion_v_default_in        NUMERIC(10,4) NOT NULL DEFAULT 0.125,
  ADD COLUMN IF NOT EXISTS coldfoil_elemento_ancho_default_in      NUMERIC(10,4) NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS coldfoil_elemento_largo_default_in      NUMERIC(10,4) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS coldfoil_columnas_default                INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS coldfoil_filas_default                   INT NOT NULL DEFAULT 1,

  ADD COLUMN IF NOT EXISTS digital_premier_formula_text            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_premier_explanation             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_premier_comment                 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_premier_modo                    TEXT NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS digital_premier_setup_min               NUMERIC(10,4) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS digital_premier_consumo_gm2             NUMERIC(10,4) NOT NULL DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS digital_premier_costo_kg                NUMERIC(12,4) NOT NULL DEFAULT 9.25,
  ADD COLUMN IF NOT EXISTS digital_premier_costo_m2                NUMERIC(12,6) NOT NULL DEFAULT 0.006013,
  ADD COLUMN IF NOT EXISTS digital_premier_costo_offline_metro     NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_premier_costo_mantenimiento     NUMERIC(12,4) NOT NULL DEFAULT 14,

  ADD COLUMN IF NOT EXISTS digital_tinta_tipo_cobro                TEXT NOT NULL DEFAULT 'consumo',
  ADD COLUMN IF NOT EXISTS digital_tinta_costo_kg                  NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_tinta_costo_kg_blanco           NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_tinta_costo_kg_especial         NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_tinta_tarifa_clic                NUMERIC(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_tinta_modo_clic                 TEXT NOT NULL DEFAULT 'por_estacion',
  ADD COLUMN IF NOT EXISTS digital_tinta_cobertura_cmyk_pct        NUMERIC(6,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS digital_tinta_cobertura_blanco_pct      NUMERIC(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS digital_tinta_cmyk_gm2                  NUMERIC(10,4) NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS digital_tinta_blanco_gm2                NUMERIC(10,4) NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS digital_tinta_factor_merma              NUMERIC(10,4) NOT NULL DEFAULT 1.1,
  ADD COLUMN IF NOT EXISTS digital_tinta_costo_lavado_especial     NUMERIC(12,4) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS digital_tinta_formula_consumo_text      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_tinta_formula_clic_text         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_tinta_explanation               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS digital_tinta_comment                   TEXT NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS digital_velocidad_cmyk_mpm              NUMERIC(10,4) NOT NULL DEFAULT 42,
  ADD COLUMN IF NOT EXISTS digital_velocidad_extendida_mpm         NUMERIC(10,4) NOT NULL DEFAULT 26,
  ADD COLUMN IF NOT EXISTS digital_velocidad_comment               TEXT NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- 2) Tablas normalizadas para las listas de Costos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS costo_proceso_defaults (
  tenant_id             UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  proceso_key           TEXT NOT NULL,
  etiqueta              TEXT NOT NULL DEFAULT '',
  activo                BOOLEAN NOT NULL DEFAULT false,
  crear_habilitado      BOOLEAN NOT NULL DEFAULT false,
  bloqueado             BOOLEAN NOT NULL DEFAULT false,
  repetible             BOOLEAN NOT NULL DEFAULT false,
  gantt_habilitado      BOOLEAN NOT NULL DEFAULT false,
  orden                 INT NOT NULL DEFAULT 0,
  costo_minimo          NUMERIC(12,4) NOT NULL DEFAULT 0,
  tiempo_buffer_minutos NUMERIC(10,4) NOT NULL DEFAULT 0,
  capacidad_minutos     NUMERIC(10,4) NOT NULL DEFAULT 480,
  PRIMARY KEY (tenant_id, proceso_key)
);

CREATE TABLE IF NOT EXISTS costo_deposito_tinta (
  tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id       TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT '',
  bcm           NUMERIC(10,4) NOT NULL DEFAULT 0,
  cobertura_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  gsm           NUMERIC(10,4) NOT NULL DEFAULT 0,
  orden         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_macula_montaje (
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  modo            TEXT NOT NULL CHECK (modo IN ('convencional','digital')),
  fila_id         TEXT NOT NULL,
  detalle         TEXT NOT NULL DEFAULT '',
  por_estacion    NUMERIC(10,4) NOT NULL DEFAULT 0,
  cantidad_tintas NUMERIC(10,4) NOT NULL DEFAULT 0,
  total_pies      NUMERIC(10,4) NOT NULL DEFAULT 0,
  orden           INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, modo, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_macula_tiraje (
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  modo       TEXT NOT NULL CHECK (modo IN ('convencional','digital')),
  fila_id    TEXT NOT NULL,
  detalle    TEXT NOT NULL DEFAULT '',
  porcentaje NUMERIC(6,2) NOT NULL DEFAULT 0,
  orden      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, modo, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_finish_waste (
  tenant_id           UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id             TEXT NOT NULL,
  proceso             TEXT NOT NULL DEFAULT '',
  setup_waste_feet    NUMERIC(10,4) NOT NULL DEFAULT 0,
  operation_waste_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  orden               INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_inline_finish_setup (
  tenant_id            UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id              TEXT NOT NULL,
  proceso              TEXT NOT NULL DEFAULT '',
  minutos_por_estacion NUMERIC(10,4) NOT NULL DEFAULT 0,
  setup_waste_feet     NUMERIC(10,4) NOT NULL DEFAULT 0,
  orden                INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_acabado_barniz (
  tenant_id            UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id              TEXT NOT NULL,
  nombre               TEXT NOT NULL DEFAULT '',
  bcm_anilox           NUMERIC(10,4) NOT NULL DEFAULT 0,
  porcentaje_cobertura NUMERIC(6,2) NOT NULL DEFAULT 0,
  costo_por_kilo       NUMERIC(12,4) NOT NULL DEFAULT 0,
  factor_transferencia NUMERIC(6,4) NOT NULL DEFAULT 0.35,
  densidad             NUMERIC(10,4) NOT NULL DEFAULT 1.05,
  orden                INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_acabado_laminado (
  tenant_id            UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id              TEXT NOT NULL,
  nombre               TEXT NOT NULL DEFAULT '',
  costo_por_pie_lineal NUMERIC(12,4) NOT NULL DEFAULT 0,
  tiempo_montaje       NUMERIC(10,4) NOT NULL DEFAULT 0,
  orden                INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_acabado_estampado (
  tenant_id            UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id              TEXT NOT NULL,
  tipo_foil            TEXT NOT NULL DEFAULT '',
  ancho_foil           NUMERIC(10,4) NOT NULL DEFAULT 0,
  costo_por_pie_lineal NUMERIC(12,4) NOT NULL DEFAULT 0,
  tiempo_montaje       NUMERIC(10,4) NOT NULL DEFAULT 0,
  orden                INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

CREATE TABLE IF NOT EXISTS costo_digital_cobertura_perfil (
  tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id       TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT '',
  cobertura_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  orden         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

-- ---------------------------------------------------------------------------
-- 3) Backfill: copiar los valores actuales desde app_config.config_value
--    (config_key='costos') hacia las columnas/tablas nuevas. No borra el
--    JSONB original (queda como respaldo histórico, pero deja de leerse).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant_id UUID;
  v_cfg JSONB;
BEGIN
  SELECT id INTO v_tenant_id FROM tenant LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No hay tenant activo; se omite el backfill de costos.';
    RETURN;
  END IF;

  INSERT INTO costo_general (tenant_id) VALUES (v_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT config_value INTO v_cfg FROM app_config WHERE config_key = 'costos' LIMIT 1;
  IF v_cfg IS NULL THEN
    RAISE NOTICE 'No hay configuración de costos previa en app_config; se mantienen los defaults.';
    RETURN;
  END IF;

  UPDATE costo_general SET
    notas = COALESCE(v_cfg#>>'{general,notes}', notas),
    ancho_rollo_default = COALESCE((v_cfg#>>'{general,defaultRollWidth}')::numeric, ancho_rollo_default),
    diametro_core_default = COALESCE((v_cfg#>>'{general,defaultCoreDiameter}')::numeric, diametro_core_default),
    opciones_diametro_core = COALESCE(
      (SELECT ARRAY(SELECT jsonb_array_elements_text(v_cfg#>'{general,coreDiameterOptions}'))
       WHERE jsonb_typeof(v_cfg#>'{general,coreDiameterOptions}') = 'array'),
      opciones_diametro_core
    ),
    cantidad_tipos_default = COALESCE((v_cfg#>>'{general,defaultQuantityTypes}')::int, cantidad_tipos_default),
    cmyk_default_activo = COALESCE((v_cfg#>>'{general,defaultCmykEnabled}')::boolean, cmyk_default_activo),
    margen_comercial_pct = COALESCE((v_cfg#>>'{general,defaultMarginPct}')::numeric, margen_comercial_pct),
    iva_defecto_pct = COALESCE((v_cfg#>>'{general,defaultTaxPct}')::numeric, iva_defecto_pct),

    preprensa_artes = COALESCE((v_cfg#>>'{general,defaultPrepressArts}')::numeric, preprensa_artes),
    preprensa_factor_min_tipo_conv = COALESCE((v_cfg#>>'{general,defaultPrepressMinPerChange}')::numeric, preprensa_factor_min_tipo_conv),
    preprensa_costo_hora_conv = COALESCE((v_cfg#>>'{general,defaultPrepressHourCost}')::numeric, preprensa_costo_hora_conv),
    diseno_artes = COALESCE((v_cfg#>>'{general,defaultDisenoArts}')::numeric, diseno_artes),
    diseno_costo_hora = COALESCE((v_cfg#>>'{general,defaultDisenoHourCost}')::numeric, diseno_costo_hora),
    rebobinado_tiempo_montaje = COALESCE((v_cfg#>>'{general,defaultRebobinadoTiempoMontaje}')::numeric, rebobinado_tiempo_montaje),
    rebobinado_waste_feet = COALESCE((v_cfg#>>'{general,defaultRebobinadoWasteFeet}')::numeric, rebobinado_waste_feet),
    rebobinado_waste_pct = COALESCE((v_cfg#>>'{general,defaultRebobinadoWastePct}')::numeric, rebobinado_waste_pct),
    empaque_cantidad_x_minuto = COALESCE((v_cfg#>>'{general,defaultEmpaqueCantidadXMinuto}')::numeric, empaque_cantidad_x_minuto),
    empaque_minuto_hombre = COALESCE((v_cfg#>>'{general,defaultEmpaqueMinutoHombre}')::numeric, empaque_minuto_hombre),
    empaque_tiempo_movilizacion = COALESCE((v_cfg#>>'{general,defaultEmpaqueTiempoMovilizacion}')::numeric, empaque_tiempo_movilizacion),
    empaque_tiempo_confeccion = COALESCE((v_cfg#>>'{general,defaultEmpaqueTiempoConfeccion}')::numeric, empaque_tiempo_confeccion),

    tinta_bcm_generico = COALESCE((v_cfg#>>'{convencional,tintaGeneral,bcmGenerico}')::numeric, tinta_bcm_generico),
    tinta_cobertura_pct = COALESCE((v_cfg#>>'{convencional,tintaGeneral,coberturaTintaPct}')::numeric, tinta_cobertura_pct),
    tinta_densidad = COALESCE((v_cfg#>>'{convencional,tintaGeneral,densidadUv}')::numeric, tinta_densidad),
    tinta_costo_lb_cmyk = COALESCE((v_cfg#>>'{convencional,tintaGeneral,costoLbCmyk}')::numeric, tinta_costo_lb_cmyk),
    tinta_costo_lb_blanco = COALESCE((v_cfg#>>'{convencional,tintaGeneral,costoLbBlanco}')::numeric, tinta_costo_lb_blanco),
    tinta_costo_lb_pantone = COALESCE((v_cfg#>>'{convencional,tintaGeneral,costoLbPantone}')::numeric, tinta_costo_lb_pantone),
    convencional_cobertura_diseno_pct = COALESCE((v_cfg#>>'{convencional,tintaGeneral,coberturaDisenoPct}')::numeric, convencional_cobertura_diseno_pct),
    convencional_costo_plancha_in2 = COALESCE((v_cfg#>>'{convencional,costoPlanchaIn2}')::numeric, convencional_costo_plancha_in2),
    convencional_tiempo_estandar_cambio_min = COALESCE((v_cfg#>>'{convencional,tiempoEstandarCambioMin}')::numeric, convencional_tiempo_estandar_cambio_min),

    coldfoil_costo_foil_m2 = COALESCE((v_cfg#>>'{acabados,coldfoil,costoFoilM2}')::numeric, coldfoil_costo_foil_m2),
    coldfoil_precio_adhesivo_kg = COALESCE((v_cfg#>>'{acabados,coldfoil,precioAdhesivoKg}')::numeric, coldfoil_precio_adhesivo_kg),
    coldfoil_gramaje_gm2 = COALESCE((v_cfg#>>'{acabados,coldfoil,gramajeGm2}')::numeric, coldfoil_gramaje_gm2),
    coldfoil_merma_adhesivo_pct = COALESCE((v_cfg#>>'{acabados,coldfoil,mermaAdhesivoPct}')::numeric, coldfoil_merma_adhesivo_pct),
    coldfoil_cobertura_default_pct = COALESCE((v_cfg#>>'{acabados,coldfoil,coberturaDefaultPct}')::numeric, coldfoil_cobertura_default_pct),
    coldfoil_ancho_bobina_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,anchoBobinaDefaultIn}')::numeric, coldfoil_ancho_bobina_default_in),
    coldfoil_margen_lateral_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,margenLateralDefaultIn}')::numeric, coldfoil_margen_lateral_default_in),
    coldfoil_margen_longitudinal_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,margenLongitudinalDefaultIn}')::numeric, coldfoil_margen_longitudinal_default_in),
    coldfoil_separacion_h_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,separacionHDefaultIn}')::numeric, coldfoil_separacion_h_default_in),
    coldfoil_separacion_v_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,separacionVDefaultIn}')::numeric, coldfoil_separacion_v_default_in),
    coldfoil_elemento_ancho_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,elementoAnchoDefaultIn}')::numeric, coldfoil_elemento_ancho_default_in),
    coldfoil_elemento_largo_default_in = COALESCE((v_cfg#>>'{acabados,coldfoil,elementoLargoDefaultIn}')::numeric, coldfoil_elemento_largo_default_in),
    coldfoil_columnas_default = COALESCE((v_cfg#>>'{acabados,coldfoil,columnasDefault}')::int, coldfoil_columnas_default),
    coldfoil_filas_default = COALESCE((v_cfg#>>'{acabados,coldfoil,filasDefault}')::int, coldfoil_filas_default),

    digital_premier_formula_text = COALESCE(v_cfg#>>'{digital,premier,formulaText}', digital_premier_formula_text),
    digital_premier_explanation = COALESCE(v_cfg#>>'{digital,premier,explanation}', digital_premier_explanation),
    digital_premier_comment = COALESCE(v_cfg#>>'{digital,premier,comment}', digital_premier_comment),
    digital_premier_modo = COALESCE(v_cfg#>>'{digital,premier,mode}', digital_premier_modo),
    digital_premier_setup_min = COALESCE((v_cfg#>>'{digital,premier,setupMin}')::numeric, digital_premier_setup_min),
    digital_premier_consumo_gm2 = COALESCE((v_cfg#>>'{digital,premier,consumptionGm2}')::numeric, digital_premier_consumo_gm2),
    digital_premier_costo_kg = COALESCE((v_cfg#>>'{digital,premier,costPerKg}')::numeric, digital_premier_costo_kg),
    digital_premier_costo_m2 = COALESCE((v_cfg#>>'{digital,premier,costPerM2}')::numeric, digital_premier_costo_m2),
    digital_premier_costo_offline_metro = COALESCE((v_cfg#>>'{digital,premier,offlineCostPerMeter}')::numeric, digital_premier_costo_offline_metro),
    digital_premier_costo_mantenimiento = COALESCE((v_cfg#>>'{digital,premier,maintenanceCost}')::numeric, digital_premier_costo_mantenimiento),

    digital_tinta_tipo_cobro = COALESCE(v_cfg#>>'{digital,tintaGeneral,billingType}', digital_tinta_tipo_cobro),
    digital_tinta_costo_kg = COALESCE((v_cfg#>>'{digital,tintaGeneral,costPerKg}')::numeric, digital_tinta_costo_kg),
    digital_tinta_costo_kg_blanco = COALESCE((v_cfg#>>'{digital,tintaGeneral,whiteCostPerKg}')::numeric, digital_tinta_costo_kg_blanco),
    digital_tinta_costo_kg_especial = COALESCE((v_cfg#>>'{digital,tintaGeneral,specialCostPerKg}')::numeric, digital_tinta_costo_kg_especial),
    digital_tinta_tarifa_clic = COALESCE((v_cfg#>>'{digital,tintaGeneral,clickRate}')::numeric, digital_tinta_tarifa_clic),
    digital_tinta_modo_clic = COALESCE(v_cfg#>>'{digital,tintaGeneral,clickMode}', digital_tinta_modo_clic),
    digital_tinta_cobertura_cmyk_pct = COALESCE((v_cfg#>>'{digital,tintaGeneral,coverageCmykPct}')::numeric, digital_tinta_cobertura_cmyk_pct),
    digital_tinta_cobertura_blanco_pct = COALESCE((v_cfg#>>'{digital,tintaGeneral,coverageWhitePct}')::numeric, digital_tinta_cobertura_blanco_pct),
    digital_tinta_cmyk_gm2 = COALESCE((v_cfg#>>'{digital,tintaGeneral,cmykGm2}')::numeric, digital_tinta_cmyk_gm2),
    digital_tinta_blanco_gm2 = COALESCE((v_cfg#>>'{digital,tintaGeneral,whiteGm2}')::numeric, digital_tinta_blanco_gm2),
    digital_tinta_factor_merma = COALESCE((v_cfg#>>'{digital,tintaGeneral,wasteFactor}')::numeric, digital_tinta_factor_merma),
    digital_tinta_costo_lavado_especial = COALESCE((v_cfg#>>'{digital,tintaGeneral,specialWashCost}')::numeric, digital_tinta_costo_lavado_especial),
    digital_tinta_formula_consumo_text = COALESCE(v_cfg#>>'{digital,tintaGeneral,formulaConsumptionText}', digital_tinta_formula_consumo_text),
    digital_tinta_formula_clic_text = COALESCE(v_cfg#>>'{digital,tintaGeneral,formulaClickText}', digital_tinta_formula_clic_text),
    digital_tinta_explanation = COALESCE(v_cfg#>>'{digital,tintaGeneral,explanation}', digital_tinta_explanation),
    digital_tinta_comment = COALESCE(v_cfg#>>'{digital,tintaGeneral,comment}', digital_tinta_comment),

    digital_velocidad_cmyk_mpm = COALESCE((v_cfg#>>'{digital,velocidad,speedCmykMpm}')::numeric, digital_velocidad_cmyk_mpm),
    digital_velocidad_extendida_mpm = COALESCE((v_cfg#>>'{digital,velocidad,speedExtendedMpm}')::numeric, digital_velocidad_extendida_mpm),
    digital_velocidad_comment = COALESCE(v_cfg#>>'{digital,velocidad,comment}', digital_velocidad_comment),

    actualizado_en = NOW()
  WHERE tenant_id = v_tenant_id;

  -- Procesos del cálculo
  DELETE FROM costo_proceso_defaults WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_proceso_defaults (tenant_id, proceso_key, etiqueta, activo, crear_habilitado, bloqueado, repetible, gantt_habilitado, orden, costo_minimo, tiempo_buffer_minutos, capacidad_minutos)
  SELECT v_tenant_id,
    elem->>'key',
    COALESCE(elem->>'label',''),
    COALESCE((elem->>'active')::boolean, false),
    COALESCE((elem->>'createEnabled')::boolean, false),
    COALESCE((elem->>'locked')::boolean, false),
    COALESCE((elem->>'repeatable')::boolean, false),
    COALESCE((elem->>'ganttEnabled')::boolean, false),
    COALESCE((elem->>'order')::int, (row_number() OVER ())::int * 10),
    COALESCE((elem->>'minimumCost')::numeric, 0),
    COALESCE((elem->>'timeBufferMinutes')::numeric, 0),
    COALESCE((elem->>'capacityMinutes')::numeric, 480)
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{general,processDefaults}', '[]'::jsonb)) elem
  WHERE elem->>'key' IS NOT NULL;

  -- Depósitos de tinta convencional
  DELETE FROM costo_deposito_tinta WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_deposito_tinta (tenant_id, fila_id, tipo, bcm, cobertura_pct, gsm, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'conv-deposito-' || (row_number() OVER ())::text),
    COALESCE(elem->>'tipo',''),
    COALESCE((elem->>'bcm')::numeric, 0),
    COALESCE((elem->>'coveragePct')::numeric, 0),
    COALESCE((elem->>'gsm')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{convencional,tintaGeneral,depositos}', '[]'::jsonb)) elem;

  -- Mácula de montaje (convencional + digital)
  DELETE FROM costo_macula_montaje WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_macula_montaje (tenant_id, modo, fila_id, detalle, por_estacion, cantidad_tintas, total_pies, orden)
  SELECT v_tenant_id, 'convencional',
    COALESCE(elem->>'id', 'conv-montaje-' || (row_number() OVER ())::text),
    COALESCE(elem->>'detalle',''),
    COALESCE((elem->>'porEstacion')::numeric, 0),
    COALESCE((elem->>'cantidadTintas')::numeric, 0),
    COALESCE((elem->>'totalPies')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{convencional,maculaMontaje}', '[]'::jsonb)) elem
  UNION ALL
  SELECT v_tenant_id, 'digital',
    COALESCE(elem->>'id', 'dig-montaje-' || (row_number() OVER ())::text),
    COALESCE(elem->>'detalle',''),
    COALESCE((elem->>'porEstacion')::numeric, 0),
    COALESCE((elem->>'cantidadTintas')::numeric, 0),
    COALESCE((elem->>'totalPies')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{digital,maculaMontaje}', '[]'::jsonb)) elem;

  -- Mácula de tiraje (convencional + digital)
  DELETE FROM costo_macula_tiraje WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_macula_tiraje (tenant_id, modo, fila_id, detalle, porcentaje, orden)
  SELECT v_tenant_id, 'convencional',
    COALESCE(elem->>'id', 'conv-tiraje-' || (row_number() OVER ())::text),
    COALESCE(elem->>'detalle',''),
    COALESCE((elem->>'porcentaje')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{convencional,maculaTiraje}', '[]'::jsonb)) elem
  UNION ALL
  SELECT v_tenant_id, 'digital',
    COALESCE(elem->>'id', 'dig-tiraje-' || (row_number() OVER ())::text),
    COALESCE(elem->>'detalle',''),
    COALESCE((elem->>'porcentaje')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{digital,maculaTiraje}', '[]'::jsonb)) elem;

  -- Merma de acabados (convencional)
  DELETE FROM costo_finish_waste WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_finish_waste (tenant_id, fila_id, proceso, setup_waste_feet, operation_waste_pct, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'conv-finish-' || (row_number() OVER ())::text),
    COALESCE(elem->>'proceso',''),
    COALESCE((elem->>'setupWasteFeet')::numeric, 0),
    COALESCE((elem->>'operationWastePct')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{convencional,finishWaste}', '[]'::jsonb)) elem;

  -- Subprocesos en línea (convencional)
  DELETE FROM costo_inline_finish_setup WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_inline_finish_setup (tenant_id, fila_id, proceso, minutos_por_estacion, setup_waste_feet, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'conv-inline-' || (row_number() OVER ())::text),
    COALESCE(elem->>'proceso',''),
    COALESCE((elem->>'minutosPorEstacion')::numeric, 0),
    COALESCE((elem->>'setupWasteFeet')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{convencional,inlineFinishSetup}', '[]'::jsonb)) elem;

  -- Perfiles de barniz
  DELETE FROM costo_acabado_barniz WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_acabado_barniz (tenant_id, fila_id, nombre, bcm_anilox, porcentaje_cobertura, costo_por_kilo, factor_transferencia, densidad, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'acab-barniz-' || (row_number() OVER ())::text),
    COALESCE(elem->>'nombre',''),
    COALESCE((elem->>'bcmAnilox')::numeric, 0),
    COALESCE((elem->>'porcentajeCobertura')::numeric, 0),
    COALESCE((elem->>'costoPorKilo')::numeric, 0),
    COALESCE((elem->>'factorTransferencia')::numeric, 0.35),
    COALESCE((elem->>'densidad')::numeric, 1.05),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{acabados,barniz}', '[]'::jsonb)) elem;

  -- Perfiles de laminado
  DELETE FROM costo_acabado_laminado WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_acabado_laminado (tenant_id, fila_id, nombre, costo_por_pie_lineal, tiempo_montaje, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'acab-laminado-' || (row_number() OVER ())::text),
    COALESCE(elem->>'nombre',''),
    COALESCE((elem->>'costoPorPieLineal')::numeric, 0),
    COALESCE((elem->>'tiempoMontaje')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{acabados,laminado}', '[]'::jsonb)) elem;

  -- Perfiles de estampado/foil
  DELETE FROM costo_acabado_estampado WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_acabado_estampado (tenant_id, fila_id, tipo_foil, ancho_foil, costo_por_pie_lineal, tiempo_montaje, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'acab-estampado-' || (row_number() OVER ())::text),
    COALESCE(elem->>'tipoFoil',''),
    COALESCE((elem->>'anchoFoil')::numeric, 0),
    COALESCE((elem->>'costoPorPieLineal')::numeric, 0),
    COALESCE((elem->>'tiempoMontaje')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{acabados,estampado}', '[]'::jsonb)) elem;

  -- Perfiles de cobertura de tinta digital
  DELETE FROM costo_digital_cobertura_perfil WHERE tenant_id = v_tenant_id;
  INSERT INTO costo_digital_cobertura_perfil (tenant_id, fila_id, tipo, cobertura_pct, orden)
  SELECT v_tenant_id,
    COALESCE(elem->>'id', 'digital-profile-' || (row_number() OVER ())::text),
    COALESCE(elem->>'tipo',''),
    COALESCE((elem->>'coveragePct')::numeric, 0),
    (row_number() OVER ())::int
  FROM jsonb_array_elements(COALESCE(v_cfg#>'{digital,tintaGeneral,coverageProfiles}', '[]'::jsonb)) elem;

  RAISE NOTICE 'Backfill de configuración de costos completado para tenant %', v_tenant_id;
END $$;

COMMIT;
