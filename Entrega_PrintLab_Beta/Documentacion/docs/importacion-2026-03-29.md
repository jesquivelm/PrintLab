# Importacion 2026-03-29

## Base destino

- Base: `impresiones_elite_erp`
- Tenant: `Impresiones Elite`
- Script usado: `scripts/import-master-data.js`

## Archivos importados

- `Registros Socios Negocios Desde Mayo 2025.xlsx`
- `Socios Negocios-Contactos.xlsx`
- `Socios Negocios-Direccion.xlsx`
- `Inventario Materia Prima.xlsx`
- `Inventario Troqueles.xlsx`
- `Registros Cotizaciones Setiembre 2025.xlsx`
- `Registros Calculos Flexografia Setiembre 2025.xlsx`

## Totales verificados

- `tenant`: 1
- `usuario`: 17
- `socio`: 69
- `business_partners`: 69
- `business_partner_contacts`: 81
- `business_partner_addresses`: 988
- `material`: 120
- `flexo_materials`: 120
- `troquel`: 1374
- `flexo_dies`: 1374
- `maquina`: 2
- `cotizacion`: 129
- `quotes`: 92
- `calculo_flexo`: 83
- `flexo_calculations`: 83
- `cantidad_calculo_flexo`: 161
- `import_audit`: 8

## Notas importantes

- Las maquinas se derivaron desde el archivo de calculos porque no venia un catalogo maestro de maquinas en la carpeta fuente.
- Algunas cotizaciones fueron creadas como placeholder para permitir insertar calculos cuya `ID COTIZACION` no aparecia en el Excel de cotizaciones.
- `TIPO ETIQUETADO`, `TIPO ORDEN` y `TIPO SALIDA` se normalizaron para poder insertarlos en enums de PostgreSQL.
- Los troqueles repetidos por `Id Troquel` se consolidan con `upsert`.

## Pendientes inmediatos

- Reemplazar la derivacion de maquinas por un catalogo maestro real cuando lo tengamos.
- Conectar la UI web a PostgreSQL en vez de seguir leyendo SQLite para varias pantallas.
- Importar o reconstruir lineas visibles de cotizacion en `quote_lines` segun la pantalla principal.
- Afinar moneda, tipo de cambio y campos comerciales avanzados en `cotizacion`.
