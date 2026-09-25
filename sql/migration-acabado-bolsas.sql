-- Catalogo "Tipos de Bolsa" en Configuracion -> Costos -> Acabados.
-- Mismo patron que costo_acabado_cajas.

CREATE TABLE IF NOT EXISTS costo_acabado_bolsas (
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    fila_id TEXT NOT NULL,
    nombre TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT '',
    ancho_cm NUMERIC(10,2) NOT NULL DEFAULT 0,
    largo_cm NUMERIC(10,2) NOT NULL DEFAULT 0,
    capacidad_cm3 NUMERIC(10,2) NOT NULL DEFAULT 0,
    con_manijas BOOLEAN NOT NULL DEFAULT FALSE,
    color TEXT NOT NULL DEFAULT '',
    proveedor TEXT NOT NULL DEFAULT '',
    fecha_compra DATE,
    fecha_vencimiento DATE,
    costo_por_unidad NUMERIC(12,4) NOT NULL DEFAULT 0,
    orden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, fila_id)
);
