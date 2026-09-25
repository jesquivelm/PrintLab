-- ============================================================
-- MIGRACIÓN: Adicional por Cambio de Bobina + Velocidades de Impresión
--            + Volteadora en inventario de máquinas
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-cambio-bobina-velocidades-volteadora.sql
-- ============================================================

-- 1) costo_general: campo estándar adicional por cambio de bobina
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS adicional_cambio_bobina_pct NUMERIC(10,4);

-- 2) Tabla de velocidades de impresión (referencia, tab Convencional → Impresión)
CREATE TABLE IF NOT EXISTS costo_velocidad_impresion (
  tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  fila_id      TEXT NOT NULL,
  condicion    TEXT NOT NULL DEFAULT '',
  velocidad_mpm NUMERIC(10,4) NOT NULL DEFAULT 0,
  comentario   TEXT NOT NULL DEFAULT '',
  orden        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, fila_id)
);

-- 3) Volteadora en el inventario de máquinas
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS volteadora BOOLEAN DEFAULT FALSE;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS volteadora_setup_min NUMERIC(10,4) DEFAULT 30;
