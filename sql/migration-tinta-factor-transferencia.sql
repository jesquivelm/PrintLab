-- Migración: agrega Factor de Transferencia genérico a Costos > Convencional > Tintas y Depósito.
-- Antes vivía hardcodeado en el código (0.3) sin campo editable. Idempotente.

ALTER TABLE costo_general
    ADD COLUMN IF NOT EXISTS tinta_factor_transferencia NUMERIC(10,4) NOT NULL DEFAULT 0.3;
