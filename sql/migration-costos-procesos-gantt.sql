-- Migración: Agregar columnas de Gantt, proceso paralelo y calendario a costo_proceso_defaults
ALTER TABLE costo_proceso_defaults
  ADD COLUMN IF NOT EXISTS color_gantt TEXT NOT NULL DEFAULT '#378ADD',
  ADD COLUMN IF NOT EXISTS proceso_paralelo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calendario_id UUID REFERENCES resource_calendars(id) ON DELETE SET NULL;
