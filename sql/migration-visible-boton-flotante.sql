-- Migración: Agregar columna visible_boton_flotante a costo_proceso_defaults
-- Permite controlar independientemente si un proceso aparece en el botón flotante BDFG.
-- Valor por defecto: true (todos los procesos existentes quedan visibles por defecto).

ALTER TABLE costo_proceso_defaults
    ADD COLUMN IF NOT EXISTS visible_boton_flotante BOOLEAN NOT NULL DEFAULT true;
