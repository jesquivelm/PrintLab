-- ═══════════════════════════════════════════════════════════════════════════
-- Consolidación Producción / Planificación — Paso 4: vista de lectura única
-- ═══════════════════════════════════════════════════════════════════════════
-- vista_orden_proceso: fuente ÚNICA de lectura del estado y las fechas por
-- proceso. Todos los endpoints que hoy recalculan "qué está pasando" a su
-- manera pasan a leer de aquí (vía el helper cargarSeguimientoOrden()).
--
-- Es un VIEW (sin datos propios). CREATE OR REPLACE → re-ejecutable.
-- Depende solo de orden_proceso y production_machine_profiles.
--
-- Las columnas de atraso quedan en false/null hasta el paso 6
-- (recalcularCompromisos llena fecha_compromiso_*); se encienden solas
-- cuando esas fechas existen.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vista_orden_proceso AS
SELECT
    op.id,
    op.codigo_orden,
    op.codigo_cotizacion,
    op.codigo_linea,
    op.secuencia,
    op.clave_proceso,
    op.nombre_proceso,
    op.estado,
    op.duracion_horas,
    op.transicion_min,
    op.perfil_maquina_id,
    mp.machine_name                          AS nombre_maquina,
    op.depende_de_id,
    dep.estado                               AS estado_dependencia,
    op.fecha_compromiso_inicio,
    op.fecha_compromiso_fin,
    op.fecha_plan_inicio,
    op.fecha_plan_fin,
    op.fecha_real_inicio,
    op.fecha_real_fin,
    op.bloqueo_manual,
    op.color_hex,
    op.origen,
    op.datos_extra,

    -- ¿el proceso está "vivo" ahora mismo? (indicador parpadeante)
    (op.estado IN ('PREPARACION', 'EN_MARCHA', 'EN_PARO'))                     AS activo,

    -- la proyección del motor termina después de la fecha compromiso
    (op.fecha_compromiso_fin IS NOT NULL
        AND op.fecha_plan_fin IS NOT NULL
        AND op.fecha_plan_fin > op.fecha_compromiso_fin)                       AS atraso_proyeccion,

    -- terminó tarde, o venció el compromiso sin completar
    (op.fecha_compromiso_fin IS NOT NULL
        AND (
            (op.fecha_real_fin IS NOT NULL AND op.fecha_real_fin > op.fecha_compromiso_fin)
            OR (op.fecha_real_fin IS NULL AND op.estado <> 'COMPLETADO' AND NOW() > op.fecha_compromiso_fin)
        ))                                                                     AS atraso_real,

    op.creado_en,
    op.actualizado_en,

    -- Suspender Producción: pausa marcada como urgente para que Planificación la revise.
    op.suspendida_produccion,
    op.suspendida_motivo,
    op.suspendida_en,
    op.suspendida_por,
    op.suspendida_revisada_en,
    op.suspendida_revisada_por
FROM orden_proceso op
LEFT JOIN production_machine_profiles mp ON mp.id = op.perfil_maquina_id
LEFT JOIN orden_proceso dep             ON dep.id = op.depende_de_id;
