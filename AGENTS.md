# GENERAL INSTRUCTIONS

## CORE PRINCIPLE

* **STRICT SCOPE — DO EXACTLY WHAT IS ASKED, NOTHING MORE.** When the user asks for a specific change, implement ONLY that change. Do not alter, remove, restructure, or refactor anything that was not explicitly requested. Do not touch other elements, files, or code paths. If a task says "wrap X", wrap X and nothing else. If it says "add Y", add Y and leave everything else untouched. Err on the side of doing less, not more. If unsure whether a change is within scope, stop and ask.
* Minimize token usage.
* **BACKUPS**: ALWAYS save backup files to `backups/` folder at the project root. Never leave backup files scattered in source directories. Naming convention: `{filename}.backup.{context}.{YYYYMMDD-HHMMSS}`. Example: `server.js.backup.my-task.20260615-143022`
* Report the estimated percentage of token usage attributable to each section of these instructions whenever possible, for evaluation purposes.
* Always create field names, labels, and user-facing text in Spanish. Avoid English unless technically required.
* Stay strictly within the requested scope.
* Do not modify unrelated files, code, layouts, or logic.
* If requirements are unclear, stop and ask.
* User for login: jesquiv and password: ABC1234abc

---

## ENCODING RULES

Before editing any file:

* Preserve UTF-8 encoding.
* Do not corrupt accented characters or special symbols.

Preserve:

á, é, í, ó, ú, ñ, ¿, ¡, ₡, $, °

If corrupted text is found:

* Report it before making changes.
* Do not perform global encoding repairs unless explicitly authorized.

---

## EXISTING PATTERNS

Before implementing anything:

* Search for existing references and similar implementations.
* Reuse established system patterns whenever possible.
* Do not create alternative solutions when a standard already exists.
* Maintain consistency with the surrounding code and UI.

---

## UI AND LAYOUT

Apply visual changes only when requested.

Preserve:

* Existing structure
* Alignment
* Margins
* Padding
* Component sizing

Do not redesign screens without authorization.

Avoid:

* Unexpected layout shifts
* Element overlap
* Container resizing caused by labels
* Visual inconsistencies

---

## NUMERIC AND CURRENCY FIELDS

Follow the existing system pattern.

* Do not create additional fields.
* Do not place units outside inputs.
* Reuse existing currency and unit rendering behavior.
* Maintain existing formatting standards.

---

## LABEL CAPITALIZATION

All user-facing labels and field names use Title Case:

* First word: always capitalized.
* Second word: capitalize if NOT an article (de, del, la, las, los, un, una, en, por, para, con, sin, a, al, o, y).
* Third and fourth words: same rule — capitalize unless they are articles.
* Units and abbreviations stay lowercase (min, hrs, ft, lb, kg, m/min).

Examples: `Subtotal Máquina`, `Costo Hora`, `Total de Tiempo`, `Pies Totales`, `Consumo por Color`.

---

## ICONS

Use the centralized icon system on Configuration - Design - Icons.

* Do not create temporary or isolated icon implementations.
* Reuse existing icon rendering mechanisms.
* Respect existing icon configuration and styling rules on Configuration - Design - Icons for every icon.

---

## DEVELOPMENT RULES

Always:

* Analyze impact before modifying.
* Avoid breaking existing functionality.
* Avoid assumptions.
* Do not add dependencies without authorization.
* Do not remove working code without justification.
* Do not modify anything outside the requested scope.

If a requirement is unclear:

* Stop and ask.

---

## DATA STORAGE RULES

### NO raw_data

The `raw_data` JSONB column is DEPRECATED. Never write new data into `raw_data`.

All data must be stored in **explicit typed columns** (NUMERIC, TEXT, BOOLEAN, DATE, etc.).

Exception: `raw_data` may be READ for backward compatibility with existing records during the migration period, but no NEW writes to `raw_data` are permitted.

### Data Precedence

When multiple sources provide the same field, use this priority (highest wins):
1. **MES / Production** — actual values captured during production execution
2. **Quote / Calculation** — values from the original quote or calculation
3. **System defaults** — configured defaults in cost profiles or general config

### Column Alignment

Tables that describe the same entity must share the same column names and types:
- `flexo_products`, `flexo_orders`, and `flexo_calculations` must have identical column sets for overlapping concepts (dimensions, ink, varnish, laminating, etc.)
- `production_station_configs` data must be reflected in summary columns on `flexo_orders` and `flexo_products`

When MES data is saved, BOTH the `flexo_orders` row AND the `flexo_products` row must be updated.

---

## TESTING

Testing is mandatory whenever testing is possible.

Testing depth must match the size and risk of the change.

Examples:

* Text change → basic verification.
* UI change → visual verification.
* Logic change → functional verification.
* Data or workflow change → affected workflow verification.

Before completion:

* Verify the requested change works.
* Verify related functionality was not obviously broken.
* Report exactly what was tested.
* Report test results.
* Report what could not be tested.

If testing cannot be performed:

* Explicitly report it.
* Do not assume success.
* Do not claim validation.

---

## TESTING INSTRUCTIONS

### Database

PostgreSQL está disponible en `localhost:5432`, base de datos `printlab`, usuario `postgres`, contraseña `Calg.1984`. La migración de columnas está en `sql/migration-product-columns.sql`. Para ejecutarla:

```
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -f sql/migration-product-columns.sql
```

### Tablas necesarias

La tabla `production_station_configs` debe existir:

```
CREATE TABLE IF NOT EXISTS production_station_configs (
    id SERIAL PRIMARY KEY,
    order_code TEXT,
    product_code TEXT,
    machine_name TEXT,
    slot_number INTEGER,
    ink_type TEXT,
    viscosity NUMERIC(12,4),
    temperature NUMERIC(8,2),
    anilox_code TEXT,
    pantone_ref TEXT,
    barniz_tipo TEXT,
    barniz_zonif BOOLEAN DEFAULT false,
    barniz_zona TEXT,
    uv_power NUMERIC(8,2),
    uv_temp NUMERIC(8,2),
    operator_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pruebas de endpoints

Los tests se ejecutan iniciando el servidor y llamando los endpoints. Ejemplo (reemplazar `C-000019` y `LC308561` por una cotización/línea real que exista en la BD):

```bash
$env:PGPASSWORD = "Calg.1984"
node server.js
# En otra terminal:
curl.exe -X POST "http://localhost:3000/api/cotizaciones/C-000019/lineas/LC308561/producto" -H "Content-Type: application/json" -d "{}"
# Usar el product_code devuelto para:
curl.exe -X POST "http://localhost:3000/api/productos/P-000005/cotizar" -H "Content-Type: application/json" -d "{}"
curl.exe -X POST "http://localhost:3000/api/mes/config-estaciones" -H "Content-Type: application/json" -d "{"""orderCode""":"""OP-000009""","""stations""":[{"""slotNumber""":1,"""inkType""":"""CMYK""","""viscosity""":25.5,"""temperature""":32.1,"""aniloxCode""":"""200L"""}]}"
```

### Pruebas directas a BD (sin servidor HTTP)

Usar `node` con scripts que importan `./db/postgres` directamente. Las pruebas unitarias de migración, INSERTs y UPDATEs se pueden hacer contra la BD real sin arrancar el servidor.

### Crear datos de prueba

Los datos existen en la BD local (`printlab`). Si se necesitan datos frescos:
- Cotizaciones y cálculos: la tabla `quotes` y `flexo_calculations` ya tienen registros.
- Productos: crear desde línea (`POST /api/cotizaciones/:codigo/lineas/:linea/producto`) o insertar directamente.
- Órdenes: `flexo_orders` ya tiene registros.
- Estaciones: insertar directamente en `production_station_configs`.

Siempre limpiar datos de prueba después de validar (`DELETE` o `UPDATE` para revertir).

---

## CODE COMMENTS

* Do not add unnecessary comments.
* Do not leave commented-out code.
* Only add comments when explicitly requested or truly necessary.

---

## HONESTY

Always:

* Report failures immediately.
* Report blockers clearly.
* Report limitations honestly.
* Never claim completion without evidence.
* Never claim validation without testing.
* Never silently change scope.

---

## TASK COMPLETION

Always report:

* Modified files
* What was changed
* What was tested
* Test results
* What could not be tested
* Blockers encountered
* Additional required actions, if any

---

## FINAL PRINCIPLE

It is better to report a real limitation than provide a false confirmation.

It is better to report a blocker than hide it.

Never declare success without evidence.
