-- Estado vigente de tinta REAL de un producto (lo que producción configuró en planta, la última
-- vez, por estación) — distinto de calculo_motivo_tintas, que es lo cotizado. Alimentado por
-- POST /api/mes/config-estaciones cuando la config trae product_code; leído por
-- POST /api/productos/:codigo/cotizar para reconstruir las estaciones reales al recotizar.
CREATE TABLE IF NOT EXISTS producto_tintas_real (
    id SERIAL PRIMARY KEY,
    product_code TEXT NOT NULL,
    estacion_indice INTEGER NOT NULL,
    tipo_tinta TEXT NOT NULL,
    tinta_etiqueta TEXT,
    pantone_ref TEXT,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_code, estacion_indice)
);

CREATE INDEX IF NOT EXISTS idx_producto_tintas_real_product ON producto_tintas_real(product_code);
