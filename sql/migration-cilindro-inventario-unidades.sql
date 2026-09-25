-- Migración: inventario de cilindros por unidad física + historial de uso.
-- Fuente: "Inventario Cilindros.xlsx" (hoja "Inventario"), 130 filas = 130 unidades físicas
-- (117 regulares + 13 magnéticos). Cada fila del Excel es un cilindro físico; los datos
-- técnicos de la familia (dientes, pulgadas, mm, elongación/encogimiento) se guardan
-- repetidos en cada unidad, tal como vienen en la fuente.
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-cilindro-inventario-unidades.sql

-- 1. Columna "ENCOGIMIENTO" base del Excel (la que no pertenece a config A ni B).
--    NULL cuando la fuente no la trae (familia de 124 dientes).
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento DECIMAL(10,4);
COMMENT ON COLUMN cilindro.encogimiento IS 'Columna "ENCOGIMIENTO" base del Excel de inventario de cilindros (sin config A/B). Significado exacto no confirmado por el usuario; se conserva el valor original. NULL en la familia de 124 dientes porque la fuente no lo trae.';

-- 2. Historial de uso del cilindro. Base para acumular metros/desgaste y trazabilidad
--    de producción. Sin fórmula de vida útil todavía: primero se captura el consumo.
CREATE TABLE IF NOT EXISTS cilindro_uso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    cilindro_id UUID NOT NULL REFERENCES cilindro(id) ON DELETE CASCADE,
    orden_produccion_id UUID,
    orden_codigo TEXT,
    producto_id UUID,
    producto_codigo TEXT,
    motivo_version TEXT,
    fecha_uso DATE,
    maquina_id UUID,
    maquina_nombre TEXT,
    estacion_numero INTEGER,
    desarrollo_utilizado_in DECIMAL(12,4),
    metros_producidos DECIMAL(18,4),
    metros_procesados DECIMAL(18,4),
    cantidad_producida DECIMAL(18,4),
    observaciones TEXT,
    creado_por BIGINT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cilindro_uso_cilindro ON cilindro_uso(cilindro_id);
CREATE INDEX IF NOT EXISTS idx_cilindro_uso_tenant ON cilindro_uso(tenant_id, creado_en);
