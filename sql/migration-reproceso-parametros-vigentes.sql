-- ============================================================================
-- MIGRACIÓN: Parámetros VIGENTES de producción para reproceso
-- ----------------------------------------------------------------------------
-- Columnas tipadas y planas sobre flexo_products y flexo_orders (mismo set en
-- ambas, regla de Column Alignment). Sin tablas nuevas, sin raw_data.
--
-- Convención:
--   * Sufijo _vigente = valor real con que se produjo, contra el cotizado que
--     ya existe en la tabla / en flexo_calculations.
--   * Estaciones de tinta 1..8: cada estación tiene su propio bloque de campos
--     (prefijo tinta_est1_ .. tinta_est8_). No se conglomeran.
--
-- Impresión es el proceso contenedor: sustrato, montaje/máquina, estaciones,
-- barniz, laminado, foil/estampado y goma/embosado y troquelado van EN LÍNEA.
-- Rebobinado y Empaque son procesos propios. Preprensa y Diseño son opcionales.
-- Visto Bueno y Numerado quedan fuera. La merma de laminado/foil/troquelado es
-- calculada (cubren el 100 % del sustrato), no se captura.
-- ============================================================================

DO $$
DECLARE
    tbl  TEXT;
    est  INTEGER;
    col  TEXT;
    defs TEXT[];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        -- ────────────────────────────────────────────────────────────────
        -- IMPRESIÓN · Estaciones de tinta 1..8 (bloque propio por estación)
        -- ────────────────────────────────────────────────────────────────
        FOR est IN 1..8 LOOP
            defs := ARRAY[
                'activa BOOLEAN',
                'funcion TEXT',                       -- color / blanco / pantone / barniz / laminado / foil / goma / vacio
                'tipo_tinta TEXT',
                'color_nombre TEXT',
                'pantone_ref TEXT',
                'receta_codigo TEXT',
                'receta_formula TEXT',                -- % de bases de la mezcla
                'tinta_lote TEXT',                    -- lote SAP (tintas.lotes)
                'tinta_lote_costo NUMERIC(14,4)',
                'anilox_codigo TEXT',
                'anilox_lpi NUMERIC(10,2)',
                'anilox_bcm NUMERIC(12,4)',
                'anilox_angulo NUMERIC(6,2)',
                'cobertura_pct NUMERIC(8,4)',
                'factor_transferencia NUMERIC(8,6)',
                'densidad_objetivo NUMERIC(8,4)',
                'densidad_medida NUMERIC(8,4)',
                'delta_e NUMERIC(8,4)',
                'viscosidad_valor NUMERIC(10,2)',
                'viscosidad_copa TEXT',               -- Zahn #2 / Ford #4 / DIN 4 / seg
                'ph NUMERIC(5,2)',
                'temperatura_tinta NUMERIC(8,2)',
                'secuencia_torre INTEGER',            -- posicion fisica del color en la torre
                'presion_anilox_plancha NUMERIC(10,3)',
                'presion_impresion_kiss NUMERIC(10,3)',
                'prueba_adherencia_ok BOOLEAN'
            ];
            FOREACH col IN ARRAY defs LOOP
                EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tinta_est%s_%s', tbl, est, col);
            END LOOP;
        END LOOP;

        -- ────────────────────────────────────────────────────────────────
        -- Bloques planos (una sola columna por campo)
        -- ────────────────────────────────────────────────────────────────
        defs := ARRAY[
            -- ── IMPRESIÓN · Sustrato de la corrida ──
            'sustrato_codigo_vigente TEXT',
            'sustrato_lote_vigente TEXT',
            'sustrato_lote_fecha_ingreso DATE',
            'sustrato_lote_costo NUMERIC(14,4)',
            'sustrato_lote_vencimiento DATE',
            'sustrato_proveedor_vigente TEXT',
            'sustrato_calibre_micras_vigente NUMERIC(10,2)',
            'sustrato_ancho_bobina_vigente_in NUMERIC(10,4)',
            'sustrato_tratamiento_dinas_vigente NUMERIC(6,2)',
            'sustrato_cara_tratada_vigente TEXT',
            'rendimiento_funcional_impresion_pct_vigente NUMERIC(6,2)',

            -- ── IMPRESIÓN · Montaje y máquina ──
            'maquina_impresion_vigente TEXT',
            'repeticion_cilindro_vigente_in NUMERIC(10,4)',
            'dientes_z_engranaje_vigente INTEGER',
            'pistas_a_lo_ancho_vigente INTEGER',
            'repeticiones_a_lo_largo_vigente INTEGER',
            'cinta_montaje_tipo_vigente TEXT',
            'cinta_montaje_durometro_vigente TEXT',
            'tension_desbobinado_vigente NUMERIC(10,3)',
            'tension_interna_vigente NUMERIC(10,3)',
            'tension_rebobinado_impresion_vigente NUMERIC(10,3)',
            'velocidad_impresion_estable_vigente_fpm NUMERIC(12,4)',
            'registro_metodo_vigente TEXT',
            'curado_tipo_vigente TEXT',
            'curado_setpoint_vigente NUMERIC(12,4)',
            'presion_cilindros_vigente_bar NUMERIC(10,3)',

            -- ── IMPRESIÓN · Barniz en línea ──
            'barniz_marca_codigo_vigente TEXT',
            'barniz_lote_vigente TEXT',
            'barniz_anilox_codigo_vigente TEXT',
            'barniz_anilox_lpi_vigente NUMERIC(10,2)',
            'barniz_anilox_bcm_vigente NUMERIC(12,4)',
            'barniz_gramaje_gm2_vigente NUMERIC(10,4)',
            'barniz_viscosidad_vigente NUMERIC(10,2)',
            'barniz_curado_uv_setpoint_vigente NUMERIC(12,4)',
            'barniz_brillo_gu_vigente NUMERIC(8,2)',
            'barniz_estacion_vigente INTEGER',

            -- ── IMPRESIÓN · Laminado en línea (sin merma: cubre 100 % del sustrato) ──
            'laminado_film_tipo_vigente TEXT',
            'laminado_film_calibre_micras_vigente NUMERIC(10,2)',
            'laminado_film_proveedor_vigente TEXT',
            'laminado_film_lote_vigente TEXT',
            'laminado_adhesivo_tipo_vigente TEXT',
            'laminado_adhesivo_gramaje_gm2_vigente NUMERIC(10,4)',
            'laminado_temp_rodillo_vigente NUMERIC(8,2)',
            'laminado_presion_nip_vigente NUMERIC(10,3)',
            'laminado_tension_vigente NUMERIC(10,3)',
            'laminado_cara_vigente TEXT',

            -- ── IMPRESIÓN · Foil / estampado en línea (sin merma) ──
            'foil_tipo_vigente TEXT',
            'foil_color_vigente TEXT',
            'foil_proveedor_vigente TEXT',
            'foil_lote_vigente TEXT',
            'foil_ancho_bobina_vigente_in NUMERIC(10,4)',
            'foil_adhesivo_tipo_vigente TEXT',
            'foil_anilox_codigo_vigente TEXT',
            'foil_gramaje_gm2_vigente NUMERIC(10,4)',
            'foil_cobertura_pct_vigente NUMERIC(8,4)',
            'foil_curado_setpoint_vigente NUMERIC(12,4)',
            'foil_estacion_vigente INTEGER',

            -- ── IMPRESIÓN · Goma / embosado en línea ──
            'embosado_cliche_codigo_vigente TEXT',
            'embosado_tipo_vigente TEXT',
            'embosado_goma_tipo_vigente TEXT',
            'embosado_presion_vigente NUMERIC(10,3)',
            'embosado_temp_vigente NUMERIC(8,2)',
            'embosado_registro_al_impreso_vigente BOOLEAN',
            'embosado_estacion_vigente INTEGER',

            -- ── IMPRESIÓN · Troquelado en línea (sin merma) ──
            'troquel_codigo_vigente TEXT',
            'troquel_tipo_vigente TEXT',
            'troquel_dientes_z_vigente INTEGER',
            'troquel_repeticion_vigente_in NUMERIC(10,4)',
            'troquel_camisa_magnetica_vigente TEXT',
            'troquel_presion_corte_vigente NUMERIC(10,3)',
            'troquel_notas_vigente TEXT',

            -- ── IMPRESIÓN · Resultados de la corrida ──
            'merma_arranque_pies_vigente NUMERIC(14,4)',
            'merma_tiraje_pies_vigente NUMERIC(14,4)',
            'merma_tiraje_pct_vigente NUMERIC(8,4)',
            'pies_buenos_producidos_vigente NUMERIC(14,4)',
            'delta_e_promedio_corrida_vigente NUMERIC(8,4)',
            'delta_e_peor_caso_vigente NUMERIC(8,4)',
            'motivo_paro_dominante_vigente TEXT',
            'muestra_retenida_ref_vigente TEXT',
            'foto_hoja_ok_ruta_vigente TEXT',
            'corrida_operario_vigente TEXT',
            'corrida_turno_vigente TEXT',
            'corrida_fecha_vigente TIMESTAMPTZ',

            -- ── REBOBINADO (proceso propio) ──
            'rebobinado_maquina_vigente TEXT',
            'rebobinado_sentido_salida_vigente INTEGER',
            'etiquetas_por_rollo_vigente NUMERIC(14,4)',
            'rebobinado_diametro_rollo_od_vigente_in NUMERIC(10,4)',
            'core_diametro_id_vigente TEXT',
            'core_ancho_vigente NUMERIC(10,4)',
            'core_material_vigente TEXT',
            'rebobinado_tension_vigente NUMERIC(10,3)',
            'rebobinado_empalmes_max_por_rollo_vigente INTEGER',
            'rebobinado_marca_empalme_tipo_vigente TEXT',
            'rebobinado_tiras_ancho_corte_vigente NUMERIC(10,4)',
            'rebobinado_num_tiras_vigente INTEGER',
            'rebobinado_inspeccion_100_vigente BOOLEAN',
            'rebobinado_num_rollos_producidos_vigente NUMERIC(14,4)',
            'rebobinado_merma_ajuste_pies_vigente NUMERIC(14,4)',
            'rebobinado_merma_operacion_pct_vigente NUMERIC(8,4)',
            'rollos_por_caja_vigente NUMERIC(14,4)',

            -- ── EMPAQUE (proceso propio) ──
            'unidades_por_rollo_vigente NUMERIC(14,4)',
            'empaque_rollos_por_caja_vigente NUMERIC(14,4)',
            'peso_neto_caja_vigente_kg NUMERIC(14,4)',
            'peso_bruto_caja_vigente_kg NUMERIC(14,4)',
            'empaque_caja_tipo_vigente TEXT',
            'empaque_caja_dimensiones_vigente TEXT',
            'empaque_etiqueta_caja_formato_vigente TEXT',
            'lote_producto_terminado_vigente TEXT',
            'empaque_num_cajas_producidas_vigente NUMERIC(14,4)',
            'empaque_remanente_rollos_sueltos_vigente NUMERIC(14,4)',
            'empaque_cajas_por_tarima_vigente INTEGER',
            'empaque_patron_estiba_vigente TEXT',
            'empaque_film_stretch_vigente BOOLEAN',
            'empaque_instrucciones_cliente_vigente TEXT',

            -- ── PREPRENSA (opcional, NULL-able) ──
            'preprensa_archivo_version_vigente TEXT',
            'preprensa_lineatura_lpi_vigente NUMERIC(10,2)',
            'preprensa_forma_punto_vigente TEXT',
            'preprensa_angulos_trama_vigente TEXT',
            'preprensa_curva_perfil_vigente TEXT',
            'preprensa_factor_distorsion_vigente NUMERIC(10,6)',
            'preprensa_fotopolimero_espesor_vigente NUMERIC(10,4)',
            'preprensa_step_repeat_vigente TEXT',
            'preprensa_num_planchas_vigente INTEGER',
            'preprensa_planchas_codigos_vigente TEXT',
            'preprensa_tipo_prueba_color_vigente TEXT',
            'preprensa_min_punto_pct_vigente NUMERIC(6,2)',

            -- ── DISEÑO (opcional, informativo) ──
            'diseno_arte_version_vigente TEXT',
            'diseno_num_colores_vigente INTEGER',
            'diseno_pantones_lista_vigente TEXT',
            'diseno_blanco_respaldo_vigente BOOLEAN',
            'diseno_barniz_como_separacion_vigente BOOLEAN',
            'diseno_dielinea_ref_vigente TEXT',
            'diseno_sangrado_vigente_in NUMERIC(10,4)',
            'diseno_gap_h_vigente_in NUMERIC(10,4)',
            'diseno_gap_v_vigente_in NUMERIC(10,4)',
            'diseno_sentido_lectura_vigente TEXT',
            'diseno_notas_cliente_vigente TEXT',

            -- ── Marca de sincronización del expediente de reproceso ──
            'reproceso_actualizado_en TIMESTAMPTZ'
        ];
        FOREACH col IN ARRAY defs LOOP
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %s', tbl, col);
        END LOOP;
    END LOOP;
END $$;
