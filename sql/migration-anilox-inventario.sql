-- Migración: inventario de anilox por unidad física + historial de uso.
-- Fuente: "Inventario de Anilox.xlsx" (hoja "Hoja1"). Cada fila del Excel es un
-- rodillo anilox físico. Mismo patrón que el inventario de cilindros por unidad
-- (sql/migration-cilindro-inventario-unidades.sql), sin el concepto de "tipo"
-- (no hay Regular/Magnético en anilox).
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-anilox-inventario.sql

-- 1. Catálogo de rodillos anilox (1 fila = 1 unidad física).
CREATE TABLE IF NOT EXISTS anilox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    codigo VARCHAR(60) NOT NULL,
    lineatura INT NOT NULL DEFAULT 0,
    bcm DECIMAL(10,3) NOT NULL DEFAULT 0,
    ancho_util_mm DECIMAL(10,2),
    diametro_mm DECIMAL(10,2),
    longitud_mm DECIMAL(10,2),
    fabricante VARCHAR(120),
    tipo_recubrimiento VARCHAR(80),
    estado VARCHAR(40) NOT NULL DEFAULT 'Disponible',
    fecha_compra DATE,
    vida_util DECIMAL(14,2),
    desgaste DECIMAL(10,2),
    modelo VARCHAR(120),
    numero_serie VARCHAR(120),
    ubicacion VARCHAR(120),
    ultimo_mantenimiento VARCHAR(20) DEFAULT '—',
    notas TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_anilox_tenant ON anilox(tenant_id, activo);

ALTER TABLE anilox ADD COLUMN IF NOT EXISTS lineatura INT NOT NULL DEFAULT 0;
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS bcm DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ancho_util_mm DECIMAL(10,2);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS diametro_mm DECIMAL(10,2);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS longitud_mm DECIMAL(10,2);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS fabricante VARCHAR(120);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS tipo_recubrimiento VARCHAR(80);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS estado VARCHAR(40) NOT NULL DEFAULT 'Disponible';
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS vida_util DECIMAL(14,2);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS desgaste DECIMAL(10,2);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS modelo VARCHAR(120);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(120);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120);
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ultimo_mantenimiento VARCHAR(20) DEFAULT '—';
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE anilox ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN anilox.vida_util IS 'Columna "Vida útil" del Excel de inventario de anilox. Sin unidad definida por el negocio todavía; se conserva el valor original.';
COMMENT ON COLUMN anilox.desgaste IS 'Columna "Desgaste" del Excel de inventario de anilox. Sin unidad definida por el negocio todavía; se conserva el valor original.';

-- 2. Historial de uso del anilox. Base para trazabilidad de producción y desgaste.
--    Sin fórmula de vida útil todavía: primero se captura el consumo.
CREATE TABLE IF NOT EXISTS anilox_uso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    anilox_id UUID NOT NULL REFERENCES anilox(id) ON DELETE CASCADE,
    orden_produccion_id UUID,
    orden_codigo TEXT,
    producto_id UUID,
    producto_codigo TEXT,
    motivo_version TEXT,
    fecha_uso DATE,
    maquina_id UUID,
    maquina_nombre TEXT,
    estacion_numero INTEGER,
    metros_producidos DECIMAL(18,4),
    metros_procesados DECIMAL(18,4),
    cantidad_producida DECIMAL(18,4),
    observaciones TEXT,
    creado_por BIGINT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anilox_uso_anilox ON anilox_uso(anilox_id);
CREATE INDEX IF NOT EXISTS idx_anilox_uso_tenant ON anilox_uso(tenant_id, creado_en);
