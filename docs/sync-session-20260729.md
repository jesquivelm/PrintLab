# Sesión de Sincronización — 29/07/2026

## Objetivo
Sincronizar el proyecto local (`E:\Github\PrintLab`) con el proyecto del cliente (`P:\app`) y sus respectivas bases de datos, para que ambos entornos sean estructuralmente idénticos y se pueda trabajar sin conflictos.

---

## 1. Iconos (general-config.json)

### Problema
El archivo `config/general-config.json` del cliente tenía 18 iconos menos que el local.

### 18 iconos faltantes en cliente
- `sortAsc`, `sortDesc` — emojis de ordenamiento
- `dashboardInks` — icono de tintas en dashboard
- `tintasCalculadora`, `tintasCatalogo`, `tintasInventario`, `tintasPantones`, `tintasRecetas` — iconos del módulo de tintas
- `adminUserActions`, `adminUserActivate`, `adminUserChangePassword`, `adminUserDeactivate`, `adminUserLock`, `adminUserResetPin` — iconos de administración de usuarios
- `orderPdf`, `orderPrint` — iconos de órdenes
- `productCalculationSummary` — icono de resumen de cálculo
- `touchImage` — icono táctil

### Solución
Se inyectaron los 18 valores desde el archivo local al cliente usando script de PowerShell (`Add-Member`).

### Archivos afectados
- `P:\app\config\general-config.json` — modificado (de 2 MB a 7.2 MB)

### Resultado
Cliente pasó de 146 a **164 iconos** (mismos que local).

---

## 2. Archivos de iconos (imágenes)

### Resultado
Todos los archivos de imagen (`public/assets/bootstrap/icons/`) estaban presentes en ambos proyectos. **No hubo cambios.**

---

## 3. Base de datos — Comparación de esquemas

### Local
- Host: `localhost:5432`
- DB: `printlab`
- Usuario: `postgres`
- Password: `Calg.1984`

### Cliente
- Host: `192.168.1.48:5433`
- DB: `printlab`
- Usuario: `postgres`
- Password: `Rmaya!9A`

### Tablas idénticas: 98
La gran mayoría de las tablas ya tenían el mismo esquema en ambas bases.

### Tablas con columnas faltantes en cliente

#### flexo_products
- Local: 168 columnas
- Cliente antes: 23 columnas
- Cliente después: **168 columnas**
- Columnas agregadas (~145): datos de cliente, especificaciones, tintas (barniz, CMYK, pantones, consumo), sustrato/mermas, impresión, laminado, embosado, estampado, troquelado, numerado, rebobinado, empaque, tiempos, financieras, MES, SKU

#### flexo_orders
- Local: 180 columnas
- Cliente antes: 165 columnas
- Cliente después: **180 columnas**
- Columnas agregadas (15): MES (6 columnas de producción), costos financieros (additional_cost, design_cost, discount_amount, industrial_subtotal, margin_amount, overhead_cost, packaging_cost, prepress_cost), `finished_product_sku`

#### flexo_calculations
- Local: 179 columnas
- Cliente antes: 172 columnas
- Cliente después: **179 columnas**
- Columnas agregadas (7): MES (6 columnas de producción), `finished_product_sku`

### Tablas solo en local (creadas en cliente)

| Tabla | Registros migrados |
|---|---|
| `product_departments` | 3 (Offset, Flexografía, Digital) |
| `product_types` | 36 (etiquetas, bolsas, cajas, etc.) |
| `product_lot_sequences` | 1 (secuencia de lote actual) |
| `product_sku_sequences` | 0 (vacía) |
| `production_material_verification` | 0 (vacía) |
| `production_station_configs` | 0 (vacía) |

### Tablas `_old` locales vs tablas sin `_old` del cliente
Las 6 tablas con sufijo `_old` en local son **idénticas en esquema y datos** a sus contrapartes en cliente:
- `flexo_dies_old` ↔ `flexo_dies` (1,374 registros)
- `flexo_cost_profiles_old` ↔ `flexo_cost_profiles` (0 registros)
- `flexo_machines_old` ↔ `flexo_machines` (2 registros)
- `flexo_materials_old` ↔ `flexo_materials` (120 registros)
- `import_audit_old` ↔ `import_audit` (8 registros)
- `quote_lines_old` ↔ `quote_lines` (0 registros)

### Tablas solo en cliente (preservadas sin modificar)
- `tintas_auditoria`, `tintas_fabricantes`, `tintas_familias`, `tintas_marcas`, `tintas_pantones_biblioteca`, `tintas_pantones_clientes`, `tintas_sap_sincronizacion_log`, `tintas_ubicaciones` — todas vacías

### Datos preservados del cliente
- `flexo_dies`: 1,374 troqueles
- Tablas de órdenes, cotizaciones: sin modificar

### Migración ejecutada
Se ejecutó `sql/migration-product-columns.sql` (ADD COLUMN IF NOT EXISTS) en la base de datos del cliente, más comandos adicionales para columnas extra y creación de tablas.

---

## 4. Proyecto — Comparación de código

### package.json
**Idéntico** — mismas dependencias, devDependencies, scripts y versión (v1.0.0).

### Estructura de directorios
- Local tiene archivos de desarrollo adicionales (logs, SQL scripts, debug scripts, CSVs, AGENTS.md, etc.)
- Cliente es una copia más limpia (sin artifacts de desarrollo)

### server.js

| Métrica | Local | Cliente |
|---|---|---|
| Tamaño | 1,180,999 bytes | 1,170,426 bytes |
| Líneas | 23,559 | 23,373 |
| Rutas totales | 251 | 251 (antes 242) |

#### 9 rutas que fueron agregadas al cliente
- `GET /api/productos/departamentos`
- `POST /api/productos/departamentos`
- `PUT /api/productos/departamentos/:id`
- `DELETE /api/productos/departamentos/:id`
- `GET /api/productos/tipos`
- `POST /api/productos/tipos`
- `PUT /api/productos/tipos/:id`
- `DELETE /api/productos/tipos/:id`
- `POST /api/productos/generar-lote`

#### Funciones helper agregadas
- `generateProductLot()`
- `getProductDepartments()`
- `getProductTypesByDepartment()`
- `getProductDepartmentByCode()`
- `getProductTypeByCodeAndDept()`
- `ensureProductSkuSchema()`

### db/postgres.js
- **Local**: 90 líneas, código legible y comentado
- **Cliente antes**: 1 línea, código minificado/obfuscado
- **Cliente después**: idéntico al local (reemplazado)

### services/tintas/
- **Cliente antes**: no existía (pero server.js hacía `require()` → app crash al reiniciar)
- **Cliente después**: copiados `tintas-service.js` y `tintas-errors.js`

---

## 5. Resumen de cambios

### Archivos modificados en cliente (P:\app)
| Archivo | Cambio |
|---|---|
| `config/general-config.json` | +18 iconos |
| `server.js` | +9 rutas, +6 helpers, +1 startup schema |
| `db/postgres.js` | Reemplazado (minificado → legible) |
| `services/tintas/tintas-service.js` | Creado |
| `services/tintas/tintas-errors.js` | Creado |

### Cambios en base de datos del cliente
| Tabla | Cambio |
|---|---|
| `flexo_products` | +145 columnas |
| `flexo_orders` | +15 columnas |
| `flexo_calculations` | +7 columnas |
| `product_departments` | Creada + 3 registros |
| `product_types` | Creada + 36 registros |
| `product_lot_sequences` | Creada + 1 registro |
| `product_sku_sequences` | Creada |
| `production_material_verification` | Creada |
| `production_station_configs` | Creada |
| Índices | +3 (idx_fp_customer_code, idx_fp_process_type, idx_fp_material_code) |

### Archivos modificados en local (E:\Github\PrintLab)
Ninguno — solo se usó como fuente de referencia.

---

## 6. Comandos útiles

```bash
# Conectar a base de datos del cliente
$env:PGPASSWORD = "Rmaya!9A"
psql -h 192.168.1.48 -p 5433 -U postgres -d printlab

# Conectar a base de datos local
$env:PGPASSWORD = "Calg.1984"
psql -h localhost -p 5432 -U postgres -d printlab

# Iniciar servidor local
node server.js

# Probar endpoint de productos
curl -X GET "http://localhost:3000/api/productos/departamentos"

# Probar generación de lote
curl -X POST "http://localhost:3000/api/productos/generar-lote"
```

---

## 7. Próximos pasos recomendados
1. ❏ Probar que el servidor del cliente inicie correctamente (verificar que `require('./services/tintas/tintas-service')` no falla)
2. ❏ Probar los 9 endpoints nuevos en el cliente
3. ❏ Verificar que los iconos de tintas se rendericen correctamente en la UI
4. ❏ Evaluar si las tablas `tintas_*` en el esquema `public` del cliente deben migrarse al esquema `tintas` definido en `sql/schema_tintas.sql`
5. ❏ Cuando sea el momento, limpiar las tablas `_old` del esquema local
