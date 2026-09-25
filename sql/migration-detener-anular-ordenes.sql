-- Migración: Detener / Anular / Reactivar una orden de producción (Nivel 1).
--
-- Una orden puede ser DETENIDA (pausa reversible) o ANULADA (ya no se trabaja,
-- pero el registro se conserva y puede REACTIVARSE). Cada acción exige un motivo
-- clasificado + descripción y queda en un historial con quién y cuándo. Mientras
-- la orden está detenida o anulada, ningún proceso de esa orden puede avanzar.
--
-- Columnas tipadas (sin raw_data). Idempotente.

-- ── Rollup en la orden (estado vigente + datos para el letrero rojo y filtros) ──
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estado_detencion TEXT;                       -- NULL = activa | 'DETENIDA' | 'ANULADA'
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_motivo_codigo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_motivo_etiqueta TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_descripcion TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_desde TIMESTAMPTZ;                 -- inicio del tramo detenido/anulado vigente (reloj en vivo)
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_por TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_order_status_previo TEXT;          -- order_status antes de anular, para restaurarlo al reactivar
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS detencion_actualizado_en TIMESTAMPTZ;

COMMENT ON COLUMN flexo_orders.estado_detencion IS 'NULL=activa | DETENIDA (pausa reversible) | ANULADA (no se trabaja, reversible con permiso). Nivel 1 detener/anular.';
COMMENT ON COLUMN flexo_orders.detencion_desde  IS 'Inicio del tramo detenido/anulado vigente; NULL si la orden está activa. Base del reloj en vivo.';

-- ── Historial de acciones (una fila por detener / reanudar / anular / reactivar) ──
CREATE TABLE IF NOT EXISTS orden_detencion_evento (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden          TEXT NOT NULL,
    accion                TEXT NOT NULL,                 -- 'DETENER' | 'REANUDAR' | 'ANULAR' | 'REACTIVAR'
    motivo_codigo         TEXT,                          -- obligatorio en DETENER / ANULAR
    motivo_etiqueta       TEXT,                          -- snapshot de la etiqueta legible del motivo
    descripcion           TEXT,                          -- obligatorio en DETENER / ANULAR
    nota                  TEXT,                          -- opcional en REANUDAR / REACTIVAR
    tramo_segundos        BIGINT,                        -- en REANUDAR / REACTIVAR: duración del tramo detenido/anulado que se cierra
    creado_por            TEXT,
    creado_por_usuario_id BIGINT,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orden_detencion_evento_orden_idx
    ON orden_detencion_evento (codigo_orden, creado_en DESC);

COMMENT ON TABLE orden_detencion_evento IS 'Historial de detener/reanudar/anular/reactivar de cada orden (Nivel 1). Diseñado para mostrarse también dentro del visor de cambios completo cuando exista.';

-- ── Permisos por usuario (tres casillas, se evalúa el usuario, no un grupo) ──
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS puede_detener_ordenes   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS puede_anular_ordenes    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS puede_reactivar_ordenes BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN admin_users.puede_detener_ordenes   IS 'Puede detener una orden y reanudarla (Configuración → Seguridad → Usuarios).';
COMMENT ON COLUMN admin_users.puede_anular_ordenes    IS 'Puede anular una orden.';
COMMENT ON COLUMN admin_users.puede_reactivar_ordenes IS 'Puede reactivar (revivir) una orden anulada.';
