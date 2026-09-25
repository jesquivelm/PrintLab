-- sql/migracion-calidad-version-unica.sql
-- Backstop de unicidad para el versionado de calidad_documentos.
-- Evita duplicados por (orden_produccion_codigo, tipo, producto_codigo, version)
-- ante una posible carrera concurrente que el cálculo de versión en aplicación
-- no alcance a prevenir. Se usa COALESCE(producto_codigo, '') porque Postgres
-- trata cada NULL como distinto en un UNIQUE constraint normal, lo cual
-- anularía el respaldo cuando producto_codigo es NULL (el caso más común).

CREATE UNIQUE INDEX IF NOT EXISTS ux_calidad_documentos_orden_tipo_producto_version
    ON calidad_documentos (orden_produccion_codigo, tipo, COALESCE(producto_codigo, ''), version);
