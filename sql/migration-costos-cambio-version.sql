-- Migración: Tiempo Estándar por Cambio de Versión (Configuración General → Convencional)
-- Dato estándar separado del cambio de Motivo (convencional_tiempo_estandar_cambio_min),
-- usado por el motor de cambios de Motivo/Versión para el caso Versión→Versión (mismo
-- motivo, sin cambio de tinta): montaje + registro + arranque, sin limpieza.
ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS convencional_tiempo_estandar_cambio_version_min NUMERIC(10,4) NOT NULL DEFAULT 0;
