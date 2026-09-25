# Módulo de Control de Calidad — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo `Calidad` en PrintLab: (1) Órdenes de Calidad para documentar incidencias con flujo de estados, y (2) generación versionada de Cartilla de Color, Ficha Técnica y Certificado de Calidad ligados a Órdenes de Producción.

**Architecture:** Sigue el patrón exacto de `services/tintas/tintas-service.js` (servicio backend con `registrarRutasCalidad({app, pgQuery, withTransaction, generateNextQualityOrderCode})`, montado en `server.js`) más páginas HTML/JS autocontenidas en `public/calidad/` (patrón `public/tintas/` y `public/inventario-pt.html/js`). Sin librería de PDF — impresión vía CSS `@media print` (patrón `proforma-print.html`).

**Tech Stack:** Node/Express, PostgreSQL (`pg`), JS vanilla sin build step.

## Global Constraints

- Todo nombre de tabla, columna, archivo e identificador de código nuevo debe estar en español (regla en `AGENTS.md`/`CLAUDE.md`).
- Ningún dato nuevo en `raw_data`/JSON — solo columnas tipadas explícitas.
- No renombrar ni tocar código/archivos existentes fuera de los puntos de inserción indicados en cada tarea (STRICT SCOPE).
- Sin comandos `git commit` en este proyecto — no está en GitHub. Cada tarea termina en el paso de verificación, no en commit.
- Verificación de cada tarea sigue el patrón del proyecto (no hay framework de tests): scripts `node` directos contra la BD real `printlab`, y `curl` contra el servidor local, según `AGENTS.md` → TESTING INSTRUCTIONS. Limpiar datos de prueba después de cada verificación.
- Etiquetas y textos de usuario en español, Title Case según `AGENTS.md` → LABEL CAPITALIZATION.

---

## Task 1: Migración SQL

**Files:**
- Create: `sql/migracion-calidad.sql`

**Interfaces:**
- Produces: tablas `calidad_ordenes`, `calidad_orden_lineas`, `calidad_orden_linea_pantones`, `calidad_orden_linea_defectos`, `calidad_tipos_defecto`, `calidad_documentos`, `calidad_documento_pantones` — usadas por todas las tareas siguientes.

- [ ] **Paso 1: Escribir la migración**

```sql
-- sql/migracion-calidad.sql
-- Módulo de Control de Calidad: Órdenes de Calidad y Documentos de Calidad

CREATE TABLE IF NOT EXISTS calidad_tipos_defecto (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calidad_ordenes (
    id SERIAL PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    orden_produccion_codigo TEXT,
    cliente_codigo TEXT,
    cliente_nombre TEXT,
    fecha_deteccion DATE NOT NULL DEFAULT CURRENT_DATE,
    detectado_por TEXT,
    descripcion_general TEXT,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','EN_INVESTIGACION','ACCION_CORRECTIVA_DEFINIDA','CERRADA')),
    accion_correctiva TEXT,
    accion_preventiva TEXT,
    responsable_accion TEXT,
    fecha_limite_accion DATE,
    fecha_cierre TIMESTAMPTZ,
    cerrado_por TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_calidad_ordenes_orden_produccion ON calidad_ordenes(orden_produccion_codigo);

CREATE TABLE IF NOT EXISTS calidad_orden_lineas (
    id SERIAL PRIMARY KEY,
    orden_calidad_id INTEGER NOT NULL REFERENCES calidad_ordenes(id) ON DELETE CASCADE,
    producto_codigo TEXT,
    linea_codigo TEXT,
    sustrato TEXT,
    ancho NUMERIC(12,4),
    largo NUMERIC(12,4),
    diametro_core TEXT,
    cantidad_tintas INTEGER,
    tinta_blanca BOOLEAN,
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    troquelado_forma TEXT,
    numerado_tipo TEXT,
    rebobinado_notas TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calidad_orden_lineas_orden ON calidad_orden_lineas(orden_calidad_id);

CREATE TABLE IF NOT EXISTS calidad_orden_linea_pantones (
    id SERIAL PRIMARY KEY,
    orden_linea_id INTEGER NOT NULL REFERENCES calidad_orden_lineas(id) ON DELETE CASCADE,
    pantone_codigo TEXT NOT NULL,
    color_referencia TEXT,
    densidad NUMERIC(10,4),
    anilox_codigo TEXT
);

CREATE TABLE IF NOT EXISTS calidad_orden_linea_defectos (
    id SERIAL PRIMARY KEY,
    orden_linea_id INTEGER NOT NULL REFERENCES calidad_orden_lineas(id) ON DELETE CASCADE,
    tipo_defecto_id INTEGER REFERENCES calidad_tipos_defecto(id),
    descripcion TEXT,
    area_responsable TEXT,
    persona_responsable TEXT
);

CREATE TABLE IF NOT EXISTS calidad_documentos (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('cartilla_color','ficha_tecnica','certificado_calidad')),
    orden_produccion_codigo TEXT NOT NULL,
    producto_codigo TEXT,
    version INTEGER NOT NULL,
    generado_por TEXT,
    generado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sustrato TEXT,
    ancho NUMERIC(12,4),
    largo NUMERIC(12,4),
    diametro_core TEXT,
    cantidad_tintas INTEGER,
    tinta_blanca BOOLEAN,
    barniz_tipo TEXT,
    laminado_tipo TEXT,
    troquelado_forma TEXT,
    numerado_tipo TEXT,
    rebobinado_notas TEXT,
    cantidad_aprobada NUMERIC(14,4),
    cantidad_rechazada NUMERIC(14,4),
    resultado_inspeccion TEXT,
    observaciones TEXT,
    inspeccionado_por TEXT,
    fecha_inspeccion DATE
);
CREATE INDEX IF NOT EXISTS idx_calidad_documentos_orden ON calidad_documentos(orden_produccion_codigo, tipo, producto_codigo);

CREATE TABLE IF NOT EXISTS calidad_documento_pantones (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES calidad_documentos(id) ON DELETE CASCADE,
    pantone_codigo TEXT NOT NULL,
    color_referencia TEXT,
    receta_referencia TEXT,
    densidad_objetivo NUMERIC(10,4),
    anilox_codigo TEXT
);

INSERT INTO calidad_tipos_defecto (nombre) VALUES
    ('Registro'),
    ('Densidad de Tinta Incorrecta'),
    ('Pantone Fuera de Tolerancia'),
    ('Manchado / Mota'),
    ('Rayado'),
    ('Pinholing'),
    ('Migración / Adherencia de Tinta'),
    ('Burbujas / Delaminación'),
    ('Cobertura Despareja de Barniz'),
    ('Troquelado Desalineado'),
    ('Rebaba de Corte'),
    ('Telescoping / Arrugas de Rebobinado'),
    ('Numerado Ilegible o Faltante'),
    ('Dimensiones Fuera de Tolerancia'),
    ('Contaminación / Partículas'),
    ('Otro')
ON CONFLICT (nombre) DO NOTHING;
```

- [ ] **Paso 2: Aplicar la migración contra la BD local**

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -f sql/migracion-calidad.sql
```

- [ ] **Paso 3: Verificar que las 7 tablas y el catálogo existen**

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "\dt calidad_*"
psql -U postgres -d printlab -h localhost -c "SELECT count(*) FROM calidad_tipos_defecto;"
```

Esperado: 7 tablas listadas, `count = 16` en `calidad_tipos_defecto`.

---

## Task 2: Servicio backend — esqueleto, generador de código OC- y montaje

**Files:**
- Create: `services/calidad/calidad-service.js`
- Modify: `server.js:1275` (agregar prefijo de configuración)
- Modify: `server.js:6128` (agregar `generateNextQualityOrderCode` después de `generateNextOrderCode`)
- Modify: `server.js:36` (import) y `server.js:22505` (invocación)

**Interfaces:**
- Produces: `registrarRutasCalidad({ app, pgQuery, withTransaction, generateNextQualityOrderCode })` — export de `services/calidad/calidad-service.js`, monta rutas bajo `/api/calidad`.
- Produces: `erroneo(status, message)` — helper interno de errores usado en todas las rutas de este servicio.
- Consumes: `generateNextConfiguredCode` (`server.js:5821`), `loadGeneralNomenclature` (`server.js:5816`) — ya existentes, no se modifican.

- [ ] **Paso 1: Agregar el prefijo de configuración**

En `server.js:1275`, después de la línea `orderCodePrefix: 'OP-',`:

```js
        orderCodePrefix: 'OP-',
        qualityOrderCodePrefix: 'OC-',
        plateInventoryCodePrefix: 'PL-',
```

- [ ] **Paso 2: Agregar el generador de código, después de `generateNextOrderCode` (`server.js:6128`)**

```js
async function generateNextQualityOrderCode(client = null) {
    const general = await loadGeneralNomenclature();
    return generateNextConfiguredCode({
        client,
        tableName: 'calidad_ordenes',
        columnName: 'codigo',
        prefix: general.qualityOrderCodePrefix,
        fallbackPrefix: 'OC-',
        padLength: 6
    });
}
```

- [ ] **Paso 3: Crear el esqueleto del servicio**

```js
// services/calidad/calidad-service.js

function erroneo(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function registrarRutasCalidad({ app, pgQuery, withTransaction, generateNextQualityOrderCode }) {
    const api = '/api/calidad';

    app.get(api + '/tipos-defecto', async (req, res) => {
        try {
            const resultado = await pgQuery(
                `SELECT id, nombre FROM calidad_tipos_defecto WHERE activo = true ORDER BY nombre`
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    module.exports.__erroneo = erroneo;
}

module.exports = { registrarRutasCalidad, erroneo };
```

- [ ] **Paso 4: Importar y montar en `server.js`**

En `server.js:36`, junto al import de tintas:

```js
const { registerTintasRoutes } = require('./services/tintas/tintas-service');
const { registrarRutasCalidad } = require('./services/calidad/calidad-service');
```

En `server.js:22505`, después de `registerTintasRoutes({ app, pgQuery, withTransaction });`:

```js
registerTintasRoutes({ app, pgQuery, withTransaction });
registrarRutasCalidad({ app, pgQuery, withTransaction, generateNextQualityOrderCode });
```

- [ ] **Paso 5: Verificar arranque y el primer endpoint**

```bash
$env:PGPASSWORD = "Calg.1984"
node server.js
# En otra terminal:
curl.exe "http://localhost:3000/api/calidad/tipos-defecto"
```

Esperado: el servidor arranca sin errores y el curl devuelve un arreglo JSON con 16 objetos `{id, nombre}`.

---

## Task 3: Crear Orden de Calidad (con líneas, pantones y defectos)

**Files:**
- Modify: `services/calidad/calidad-service.js`

**Interfaces:**
- Consumes: `erroneo`, `generateNextQualityOrderCode` (Task 2).
- Produces: `POST /api/calidad/ordenes` — body `{ orden_produccion_codigo?, cliente_codigo?, cliente_nombre?, fecha_deteccion?, detectado_por?, descripcion_general?, lineas: [{ producto_codigo?, linea_codigo?, sustrato?, ancho?, largo?, diametro_core?, cantidad_tintas?, tinta_blanca?, barniz_tipo?, laminado_tipo?, troquelado_forma?, numerado_tipo?, rebobinado_notas?, pantones: [{pantone_codigo, color_referencia?, densidad?, anilox_codigo?}], defectos: [{tipo_defecto_id?, descripcion?, area_responsable?, persona_responsable?}] }] }` → `201` con la orden creada + líneas. Usado por Task 9 (UI de creación).

- [ ] **Paso 1: Agregar la ruta dentro de `registrarRutasCalidad`, antes del `module.exports.__erroneo = erroneo;`**

```js
    app.post(api + '/ordenes', async (req, res) => {
        try {
            const body = req.body || {};
            if (!Array.isArray(body.lineas) || !body.lineas.length) {
                throw erroneo(400, 'Debe incluir al menos una línea afectada.');
            }
            const codigo = await generateNextQualityOrderCode();
            const resultado = await withTransaction(async (client) => {
                const cabecera = await client.query(
                    `INSERT INTO calidad_ordenes
                        (codigo, orden_produccion_codigo, cliente_codigo, cliente_nombre, fecha_deteccion,
                         detectado_por, descripcion_general, estado)
                     VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7,'ABIERTA')
                     RETURNING *`,
                    [codigo, body.orden_produccion_codigo || null, body.cliente_codigo || null,
                     body.cliente_nombre || null, body.fecha_deteccion || null,
                     body.detectado_por || req.headers['x-usuario-id'] || null, body.descripcion_general || null]
                );
                const ordenCalidadId = cabecera.rows[0].id;
                const lineas = [];
                for (const linea of body.lineas) {
                    const lineaResult = await client.query(
                        `INSERT INTO calidad_orden_lineas
                            (orden_calidad_id, producto_codigo, linea_codigo, sustrato, ancho, largo,
                             diametro_core, cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo,
                             troquelado_forma, numerado_tipo, rebobinado_notas)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                         RETURNING *`,
                        [ordenCalidadId, linea.producto_codigo || null, linea.linea_codigo || null,
                         linea.sustrato || null, linea.ancho || null, linea.largo || null,
                         linea.diametro_core || null, linea.cantidad_tintas || null,
                         linea.tinta_blanca ?? null, linea.barniz_tipo || null, linea.laminado_tipo || null,
                         linea.troquelado_forma || null, linea.numerado_tipo || null, linea.rebobinado_notas || null]
                    );
                    const ordenLineaId = lineaResult.rows[0].id;
                    const pantones = [];
                    for (const pantone of (linea.pantones || [])) {
                        const p = await client.query(
                            `INSERT INTO calidad_orden_linea_pantones
                                (orden_linea_id, pantone_codigo, color_referencia, densidad, anilox_codigo)
                             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                            [ordenLineaId, pantone.pantone_codigo, pantone.color_referencia || null,
                             pantone.densidad || null, pantone.anilox_codigo || null]
                        );
                        pantones.push(p.rows[0]);
                    }
                    const defectos = [];
                    for (const defecto of (linea.defectos || [])) {
                        const d = await client.query(
                            `INSERT INTO calidad_orden_linea_defectos
                                (orden_linea_id, tipo_defecto_id, descripcion, area_responsable, persona_responsable)
                             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                            [ordenLineaId, defecto.tipo_defecto_id || null, defecto.descripcion || null,
                             defecto.area_responsable || null, defecto.persona_responsable || null]
                        );
                        defectos.push(d.rows[0]);
                    }
                    lineas.push({ ...lineaResult.rows[0], pantones, defectos });
                }
                return { ...cabecera.rows[0], lineas };
            });
            res.status(201).json(resultado);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
```

- [ ] **Paso 2: Verificar con curl (servidor corriendo)**

```bash
curl.exe -X POST "http://localhost:3000/api/calidad/ordenes" -H "Content-Type: application/json" -d "{\"cliente_nombre\":\"Cliente Prueba\",\"descripcion_general\":\"Prueba de creacion\",\"lineas\":[{\"producto_codigo\":\"P-000001\",\"sustrato\":\"PET 12um\",\"ancho\":10,\"pantones\":[{\"pantone_codigo\":\"186 C\"}],\"defectos\":[{\"descripcion\":\"Registro fuera de tolerancia\",\"area_responsable\":\"Impresión\",\"persona_responsable\":\"Juan Perez\"}]}]}"
```

Esperado: `201` con `codigo` iniciando en `OC-000001` (o el siguiente disponible), `lineas[0].pantones` y `lineas[0].defectos` poblados.

- [ ] **Paso 3: Limpiar datos de prueba**

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "DELETE FROM calidad_ordenes WHERE cliente_nombre = 'Cliente Prueba';"
```

(el `ON DELETE CASCADE` de las tablas hijas limpia líneas/pantones/defectos automáticamente).

---

## Task 4: Listar, obtener y actualizar estado de Orden de Calidad

**Files:**
- Modify: `services/calidad/calidad-service.js`

**Interfaces:**
- Produces: `GET /api/calidad/ordenes` (query `estado?`, `cliente?`, `orden_produccion_codigo?`, `q?`) → arreglo de cabeceras.
- Produces: `GET /api/calidad/ordenes/:codigo` → cabecera + `lineas` (cada una con `pantones`/`defectos`) o `404`.
- Produces: `PATCH /api/calidad/ordenes/:codigo` → actualiza `estado`/`accion_correctiva`/`accion_preventiva`/`responsable_accion`/`fecha_limite_accion`/`cerrado_por`; si `estado === 'CERRADA'` fija `fecha_cierre = NOW()`.
- Consumes: tablas de Task 1, `erroneo` de Task 2.

- [ ] **Paso 1: Agregar las 3 rutas**

```js
    app.get(api + '/ordenes', async (req, res) => {
        try {
            const condiciones = [];
            const valores = [];
            if (req.query.estado) { valores.push(req.query.estado); condiciones.push(`estado = $${valores.length}`); }
            if (req.query.cliente) { valores.push(`%${req.query.cliente}%`); condiciones.push(`cliente_nombre ILIKE $${valores.length}`); }
            if (req.query.orden_produccion_codigo) { valores.push(req.query.orden_produccion_codigo); condiciones.push(`orden_produccion_codigo = $${valores.length}`); }
            if (req.query.q) {
                valores.push(`%${req.query.q}%`);
                condiciones.push(`(codigo ILIKE $${valores.length} OR descripcion_general ILIKE $${valores.length} OR cliente_nombre ILIKE $${valores.length})`);
            }
            const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
            const resultado = await pgQuery(
                `SELECT * FROM calidad_ordenes ${where} ORDER BY fecha_creacion DESC LIMIT 300`,
                valores
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/ordenes/:codigo', async (req, res) => {
        try {
            const cabecera = await pgQuery(`SELECT * FROM calidad_ordenes WHERE codigo = $1`, [req.params.codigo]);
            if (!cabecera.rows.length) throw erroneo(404, `No se encontró la orden de calidad ${req.params.codigo}.`);
            const lineas = await pgQuery(
                `SELECT * FROM calidad_orden_lineas WHERE orden_calidad_id = $1 ORDER BY id`,
                [cabecera.rows[0].id]
            );
            for (const linea of lineas.rows) {
                const pantones = await pgQuery(`SELECT * FROM calidad_orden_linea_pantones WHERE orden_linea_id = $1`, [linea.id]);
                const defectos = await pgQuery(
                    `SELECT d.*, td.nombre AS tipo_defecto_nombre
                     FROM calidad_orden_linea_defectos d
                     LEFT JOIN calidad_tipos_defecto td ON td.id = d.tipo_defecto_id
                     WHERE d.orden_linea_id = $1`,
                    [linea.id]
                );
                linea.pantones = pantones.rows;
                linea.defectos = defectos.rows;
            }
            res.json({ ...cabecera.rows[0], lineas: lineas.rows });
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.patch(api + '/ordenes/:codigo', async (req, res) => {
        try {
            const body = req.body || {};
            const estadosValidos = ['ABIERTA', 'EN_INVESTIGACION', 'ACCION_CORRECTIVA_DEFINIDA', 'CERRADA'];
            if (body.estado && !estadosValidos.includes(body.estado)) {
                throw erroneo(400, `Estado inválido: ${body.estado}`);
            }
            const esCierre = body.estado === 'CERRADA';
            const resultado = await pgQuery(
                `UPDATE calidad_ordenes SET
                    estado = COALESCE($2, estado),
                    accion_correctiva = COALESCE($3, accion_correctiva),
                    accion_preventiva = COALESCE($4, accion_preventiva),
                    responsable_accion = COALESCE($5, responsable_accion),
                    fecha_limite_accion = COALESCE($6, fecha_limite_accion),
                    cerrado_por = CASE WHEN $7 THEN COALESCE($8, cerrado_por) ELSE cerrado_por END,
                    fecha_cierre = CASE WHEN $7 THEN NOW() ELSE fecha_cierre END,
                    fecha_actualizacion = NOW()
                 WHERE codigo = $1
                 RETURNING *`,
                [req.params.codigo, body.estado || null, body.accion_correctiva || null,
                 body.accion_preventiva || null, body.responsable_accion || null,
                 body.fecha_limite_accion || null, esCierre, body.cerrado_por || req.headers['x-usuario-id'] || null]
            );
            if (!resultado.rows.length) throw erroneo(404, `No se encontró la orden de calidad ${req.params.codigo}.`);
            res.json(resultado.rows[0]);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
```

- [ ] **Paso 2: Verificar el flujo completo con curl**

```bash
curl.exe "http://localhost:3000/api/calidad/ordenes"
curl.exe "http://localhost:3000/api/calidad/ordenes/OC-000001"
curl.exe -X PATCH "http://localhost:3000/api/calidad/ordenes/OC-000001" -H "Content-Type: application/json" -d "{\"estado\":\"EN_INVESTIGACION\"}"
curl.exe -X PATCH "http://localhost:3000/api/calidad/ordenes/OC-000001" -H "Content-Type: application/json" -d "{\"estado\":\"CERRADA\",\"accion_correctiva\":\"Se recalibro registro\",\"cerrado_por\":\"jesquiv\"}"
```

(usar un código real creado en Task 3; si ya se limpió, crear una orden de prueba nueva primero). Esperado: el listado incluye la orden, el detalle trae `lineas` con `pantones`/`defectos`, y el `PATCH` final devuelve `estado: "CERRADA"` con `fecha_cierre` poblada.

- [ ] **Paso 3: Limpiar datos de prueba** (igual que Task 3, paso 3).

---

## Task 5: Snapshot técnico reutilizable

**Files:**
- Modify: `services/calidad/calidad-service.js`

**Interfaces:**
- Produces: `async function generarSnapshotTecnico(pgQuery, ordenCodigo, productoCodigo)` — función interna del módulo (no exportada), retorna `{ sustrato, ancho, largo, diametro_core, cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo, troquelado_forma, numerado_tipo, rebobinado_notas, pantones: [{pantone_codigo, anilox_codigo, color_referencia, receta_referencia, densidad}] }`. Consumida por: la ruta de Task 6 (`POST /api/calidad/documentos` para `ficha_tecnica`/`cartilla_color`) y por `GET /api/calidad/snapshot-tecnico` (usada por Task 9, formulario de Orden de Calidad, para precargar una línea desde una orden de producción existente).
- Consumes: `flexo_orders` (columnas `material_nombre`, `material_code`, `width_inches`, `length_inches`, `core_diameter`, `cantidad_tintas`, `tinta_blanca`, `barniz_tipo`, `laminado_tipo`, `troquel_forma`, `numerado_tipo`, `rebobinado_comentario`), `production_station_configs` (`order_code`, `product_code`, `pantone_ref`, `anilox_code`), `tintas.pantones_biblioteca` (`codigo_pantone`, `color_hex`), `tintas.pantones_recetas` (`pantone_id`, `orden_produccion_id`, `producto_id`, `es_vigente`, `codigo_interno`, `densidad`).

- [ ] **Paso 1: Agregar la función, antes de `function registrarRutasCalidad`**

```js
async function generarSnapshotTecnico(pgQuery, ordenCodigo, productoCodigo) {
    const ordenResult = await pgQuery(
        `SELECT id, material_nombre, material_code, width_inches, length_inches, core_diameter,
                cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo, troquel_forma,
                numerado_tipo, rebobinado_comentario
         FROM flexo_orders WHERE order_code = $1`,
        [ordenCodigo]
    );
    const orden = ordenResult.rows[0];
    if (!orden) throw erroneo(404, `No se encontró la orden de producción ${ordenCodigo}.`);

    const pantonesResult = await pgQuery(
        `SELECT psc.pantone_ref AS pantone_codigo, psc.anilox_code AS anilox_codigo,
                pb.color_hex AS color_referencia, pr.codigo_interno AS receta_referencia, pr.densidad
         FROM production_station_configs psc
         LEFT JOIN tintas.pantones_biblioteca pb ON pb.codigo_pantone = psc.pantone_ref
         LEFT JOIN tintas.pantones_recetas pr ON pr.pantone_id = pb.id AND pr.es_vigente = true
             AND (pr.orden_produccion_id = $2 OR ($3::text IS NOT NULL AND pr.producto_id IN (
                 SELECT id FROM flexo_products WHERE product_code = $3
             )))
         WHERE psc.order_code = $1 AND psc.pantone_ref IS NOT NULL AND psc.pantone_ref <> ''
             AND ($3::text IS NULL OR psc.product_code = $3)`,
        [ordenCodigo, orden.id, productoCodigo || null]
    );

    return {
        sustrato: orden.material_nombre || orden.material_code || null,
        ancho: orden.width_inches,
        largo: orden.length_inches,
        diametro_core: orden.core_diameter,
        cantidad_tintas: orden.cantidad_tintas,
        tinta_blanca: orden.tinta_blanca,
        barniz_tipo: orden.barniz_tipo,
        laminado_tipo: orden.laminado_tipo,
        troquelado_forma: orden.troquel_forma,
        numerado_tipo: orden.numerado_tipo,
        rebobinado_notas: orden.rebobinado_comentario,
        pantones: pantonesResult.rows
    };
}
```

- [ ] **Paso 2: Agregar el endpoint que expone la función, dentro de `registrarRutasCalidad`**

```js
    app.get(api + '/snapshot-tecnico', async (req, res) => {
        try {
            const { orden, producto } = req.query;
            if (!orden) throw erroneo(400, 'El parámetro "orden" es requerido.');
            const snapshot = await generarSnapshotTecnico(pgQuery, orden, producto || null);
            res.json(snapshot);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
```

- [ ] **Paso 3: Verificar contra una orden de producción real**

```bash
curl.exe "http://localhost:3000/api/calidad/snapshot-tecnico?orden=OP-000009"
```

(reemplazar `OP-000009` por un `order_code` real existente en `flexo_orders`). Esperado: `200` con los campos técnicos poblados según los datos reales de esa orden (pueden venir `null` si la orden no tiene barniz/laminado/etc.), y `pantones` como arreglo (vacío si no hay `production_station_configs` para esa orden).

---

## Task 6: Endpoints de Documentos de Calidad (generar + historial)

**Files:**
- Modify: `services/calidad/calidad-service.js`

**Interfaces:**
- Produces: `POST /api/calidad/documentos` — body `{ tipo: 'cartilla_color'|'ficha_tecnica'|'certificado_calidad', orden_produccion_codigo, producto_codigo?, generado_por?, cantidad_aprobada?, cantidad_rechazada?, resultado_inspeccion?, observaciones?, inspeccionado_por?, fecha_inspeccion? }` → `201` con el documento creado (incluye `pantones` si es `cartilla_color`) y `version` autoincremental por `(orden_produccion_codigo, tipo, producto_codigo)`.
- Produces: `GET /api/calidad/documentos` (query `orden_produccion_codigo?`, `tipo?`) → historial ordenado por `generado_en DESC`.
- Produces: `GET /api/calidad/documentos/:id` → documento congelado específico + `pantones` si aplica, usado por las páginas de impresión (Task 11).
- Consumes: `generarSnapshotTecnico` (Task 5).

- [ ] **Paso 1: Agregar las 3 rutas**

```js
    app.post(api + '/documentos', async (req, res) => {
        try {
            const body = req.body || {};
            const tiposValidos = ['cartilla_color', 'ficha_tecnica', 'certificado_calidad'];
            if (!tiposValidos.includes(body.tipo)) throw erroneo(400, `Tipo de documento inválido: ${body.tipo}`);
            if (!body.orden_produccion_codigo) throw erroneo(400, 'orden_produccion_codigo es requerido.');

            let snapshot = null;
            if (body.tipo === 'ficha_tecnica' || body.tipo === 'cartilla_color') {
                snapshot = await generarSnapshotTecnico(pgQuery, body.orden_produccion_codigo, body.producto_codigo || null);
            }

            const documento = await withTransaction(async (client) => {
                const version = await client.query(
                    `SELECT COALESCE(MAX(version), 0) + 1 AS siguiente FROM calidad_documentos
                     WHERE orden_produccion_codigo = $1 AND tipo = $2 AND producto_codigo IS NOT DISTINCT FROM $3`,
                    [body.orden_produccion_codigo, body.tipo, body.producto_codigo || null]
                );
                const siguienteVersion = version.rows[0].siguiente;
                const cabecera = await client.query(
                    `INSERT INTO calidad_documentos
                        (tipo, orden_produccion_codigo, producto_codigo, version, generado_por,
                         sustrato, ancho, largo, diametro_core, cantidad_tintas, tinta_blanca,
                         barniz_tipo, laminado_tipo, troquelado_forma, numerado_tipo, rebobinado_notas,
                         cantidad_aprobada, cantidad_rechazada, resultado_inspeccion, observaciones,
                         inspeccionado_por, fecha_inspeccion)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
                     RETURNING *`,
                    [body.tipo, body.orden_produccion_codigo, body.producto_codigo || null, siguienteVersion,
                     body.generado_por || req.headers['x-usuario-id'] || null,
                     snapshot?.sustrato || null, snapshot?.ancho || null, snapshot?.largo || null,
                     snapshot?.diametro_core || null, snapshot?.cantidad_tintas || null, snapshot?.tinta_blanca ?? null,
                     snapshot?.barniz_tipo || null, snapshot?.laminado_tipo || null, snapshot?.troquelado_forma || null,
                     snapshot?.numerado_tipo || null, snapshot?.rebobinado_notas || null,
                     body.cantidad_aprobada || null, body.cantidad_rechazada || null,
                     body.resultado_inspeccion || null, body.observaciones || null,
                     body.inspeccionado_por || null, body.fecha_inspeccion || null]
                );
                const documentoId = cabecera.rows[0].id;
                const pantones = [];
                if (body.tipo === 'cartilla_color' && snapshot) {
                    for (const pantone of snapshot.pantones) {
                        const p = await client.query(
                            `INSERT INTO calidad_documento_pantones
                                (documento_id, pantone_codigo, color_referencia, receta_referencia, densidad_objetivo, anilox_codigo)
                             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                            [documentoId, pantone.pantone_codigo, pantone.color_referencia || null,
                             pantone.receta_referencia || null, pantone.densidad || null, pantone.anilox_codigo || null]
                        );
                        pantones.push(p.rows[0]);
                    }
                }
                return { ...cabecera.rows[0], pantones };
            });
            res.status(201).json(documento);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/documentos', async (req, res) => {
        try {
            const condiciones = [];
            const valores = [];
            if (req.query.orden_produccion_codigo) { valores.push(req.query.orden_produccion_codigo); condiciones.push(`orden_produccion_codigo = $${valores.length}`); }
            if (req.query.tipo) { valores.push(req.query.tipo); condiciones.push(`tipo = $${valores.length}`); }
            const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
            const resultado = await pgQuery(
                `SELECT * FROM calidad_documentos ${where} ORDER BY generado_en DESC LIMIT 300`,
                valores
            );
            res.json(resultado.rows);
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });

    app.get(api + '/documentos/:id', async (req, res) => {
        try {
            const cabecera = await pgQuery(`SELECT * FROM calidad_documentos WHERE id = $1`, [req.params.id]);
            if (!cabecera.rows.length) throw erroneo(404, `No se encontró el documento ${req.params.id}.`);
            const pantones = await pgQuery(`SELECT * FROM calidad_documento_pantones WHERE documento_id = $1`, [req.params.id]);
            res.json({ ...cabecera.rows[0], pantones: pantones.rows });
        } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
```

- [ ] **Paso 2: Verificar generación y versionado incremental**

```bash
curl.exe -X POST "http://localhost:3000/api/calidad/documentos" -H "Content-Type: application/json" -d "{\"tipo\":\"ficha_tecnica\",\"orden_produccion_codigo\":\"OP-000009\"}"
curl.exe -X POST "http://localhost:3000/api/calidad/documentos" -H "Content-Type: application/json" -d "{\"tipo\":\"ficha_tecnica\",\"orden_produccion_codigo\":\"OP-000009\"}"
curl.exe -X POST "http://localhost:3000/api/calidad/documentos" -H "Content-Type: application/json" -d "{\"tipo\":\"certificado_calidad\",\"orden_produccion_codigo\":\"OP-000009\",\"cantidad_aprobada\":950,\"cantidad_rechazada\":50,\"resultado_inspeccion\":\"Aprobado con Observaciones\",\"inspeccionado_por\":\"jesquiv\"}"
curl.exe "http://localhost:3000/api/calidad/documentos?orden_produccion_codigo=OP-000009"
```

Esperado: la primera llamada crea `version: 1`, la segunda `version: 2` (mismo tipo/orden), el certificado trae los campos de inspección, y el listado muestra las 3 filas.

- [ ] **Paso 3: Limpiar datos de prueba**

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "DELETE FROM calidad_documentos WHERE orden_produccion_codigo = 'OP-000009';"
```

---

## Task 7: Permisos, iconos y tarjeta de dashboard

**Files:**
- Modify: `public/access-control.js:84` (nueva línea de ruta)
- Modify: `public/dashboard.js:183` (nueva línea de ruta), `public/dashboard.js:42` (nueva entrada en `DASHBOARD_CARDS`)
- Modify: `public/dashboard.html:60` (nueva tarjeta)
- Modify: `public/configuracion-general.html:8647` (label), `:8648` (permiso), `:9246` (iconos), `:9402` (tab)

**Interfaces:**
- Produces: módulo de permiso `calidad` reconocible por `canViewModule('calidad')`/`canErpViewModule('calidad')`; icon keys `dashboardCalidad`, `calidadOrdenes`, `calidadCartilla`, `calidadFichaTecnica`, `calidadCertificado`; tarjeta `/calidad` en el dashboard.

- [ ] **Paso 1: Ruta de acceso en `access-control.js`, después de la línea de `/ordenes-produccion` (`access-control.js:84`)**

```js
    if (path === '/ordenes-produccion' || path === '/ordenes-produccion.html' || path === '/orden-produccion.html' || path.startsWith('/orden-produccion')) return ['ordenes'];
    if (path === '/calidad' || path.startsWith('/calidad/')) return ['calidad'];
```

- [ ] **Paso 2: Ruta de acceso en `dashboard.js`, después de la línea de `/ordenes-produccion` (`dashboard.js:183`)**

```js
    if (pathname === '/ordenes-produccion' || pathname === '/ordenes-produccion.html' || pathname === '/orden-produccion.html' || pathname.startsWith('/orden-produccion')) return ['ordenes'];
    if (pathname === '/calidad' || pathname.startsWith('/calidad/')) return ['calidad'];
```

- [ ] **Paso 3: Entrada en `DASHBOARD_CARDS`, después de la entrada de Órdenes (`dashboard.js:42`)**

```js
{ route: '/ordenes-produccion', label: 'Órdenes', iconKey: 'dashboardOrders', modules: ['ordenes'] },
{ route: '/calidad', label: 'Calidad', iconKey: 'dashboardCalidad', modules: ['calidad'] },
```

- [ ] **Paso 4: Tarjeta en `dashboard.html`, después de la tarjeta de Órdenes (`dashboard.html:60`)**

```html
                    <button type="button" class="dashboard-card" data-route="/ordenes-produccion" data-label="&Oacute;rdenes" data-icon-key="dashboardOrders">
                        <span class="dashboard-card-icon" data-icon-target="dashboardOrders"></span>
                        <span class="dashboard-card-title">&Oacute;rdenes</span>
                    </button>
                    <button type="button" class="dashboard-card" data-route="/calidad" data-label="Calidad" data-icon-key="dashboardCalidad">
                        <span class="dashboard-card-icon" data-icon-target="dashboardCalidad"></span>
                        <span class="dashboard-card-title">Calidad</span>
                    </button>
```

- [ ] **Paso 5: `PRESENTATION_LABELS` en `configuracion-general.html:8647`, agregar antes del cierre `}`**

```js
            ordenes: 'Órdenes',
            sap: 'SAP',
            planificacion: 'Planificación',
            seguimiento: 'Seguimiento',
            calidad: 'Calidad'
        };
```

- [ ] **Paso 6: `PERMISSION_PRESENTATION_KEYS` en `configuracion-general.html:8648`**

```js
        const PERMISSION_PRESENTATION_KEYS = ['dashboard', 'socios', 'productos', 'cotizaciones', 'ordenes', 'sap', 'planificacion', 'calculos', 'costos', 'inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'configuracion-general', 'vendedores', 'seguimiento', 'solicitudes', 'calidad'];
```

- [ ] **Paso 7: Iconos en `ICON_LIBRARY`, después de la entrada `tintasCalculadora` (`configuracion-general.html:9246`)**

```js
{ key: 'tintasCalculadora', label: 'Tintas Calculadora', group: 'Tintas', placeholder: '▧', color: '#b7791f', size: 38 },
{ key: 'dashboardCalidad', label: 'Dashboard Calidad', group: 'Dashboard', placeholder: '✓', color: '#16a34a', size: 38 },
{ key: 'calidadOrdenes', label: 'Calidad Órdenes', group: 'Calidad', placeholder: '⚠', color: '#dc2626', size: 38 },
{ key: 'calidadCartilla', label: 'Calidad Cartilla de Color', group: 'Calidad', placeholder: '◉', color: '#0e7a9e', size: 38 },
{ key: 'calidadFichaTecnica', label: 'Calidad Ficha Técnica', group: 'Calidad', placeholder: '☷', color: '#6366f1', size: 38 },
{ key: 'calidadCertificado', label: 'Calidad Certificado', group: 'Calidad', placeholder: '✓', color: '#16a34a', size: 38 },
```

- [ ] **Paso 8: `ICON_TAB_ORDER` en `configuracion-general.html:9402`, agregar `'Calidad'` después de `'Tintas'`**

```js
        const ICON_TAB_ORDER = [
            'General',
            'Dashboard',
            'Tintas',
            'Calidad',
            'Cotizaciones',
            'Órdenes',
            'Seguimiento y Producción',
            'Notificaciones',
            'Botón flotante',
            'Configuración',
            'Modulo Movil',
            'Otros'
        ];
```

- [ ] **Paso 9: Verificación visual**

Iniciar el servidor, entrar como `jesquiv`/`ABC1234abc`, abrir Configuración General → Diseño → Iconos y confirmar que aparece el tab "Calidad" con los 5 iconos nuevos y valores/colores editables. Abrir Configuración General → Permisos y confirmar que aparece la fila "Calidad" en la matriz. Confirmar en el dashboard principal que aparece la tarjeta "Calidad" junto a "Órdenes" (visible porque el usuario admin tiene super-permiso).

---

## Task 8: UI — sub-dashboard de Calidad y listado de Órdenes de Calidad

**Files:**
- Create: `public/calidad/styles.css`
- Create: `public/calidad/dashboard.html`
- Create: `public/calidad/ordenes.html`
- Modify: `server.js:1862` (rutas `/calidad` y `/calidad/ordenes`)

**Interfaces:**
- Produces: rutas `GET /calidad` → `public/calidad/dashboard.html`, `GET /calidad/ordenes` → `public/calidad/ordenes.html`.
- Consumes: `GET /api/calidad/ordenes` (Task 4), icon keys de Task 7.

- [ ] **Paso 1: Rutas en `server.js`, después del bloque `/tintas/*` (`server.js:1862`)**

```js
app.get('/tintas/calculadora', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tintas', 'calculadora.html'));
});
app.get('/calidad', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calidad', 'dashboard.html'));
});
app.get('/calidad/ordenes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calidad', 'ordenes.html'));
});
app.get('/calidad/orden/:codigo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calidad', 'orden-detalle.html'));
});
app.get('/calidad/documentos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calidad', 'documentos.html'));
});
```

- [ ] **Paso 2: Crear `public/calidad/styles.css`**

```css
.calidad-dashboard-grid { display:grid; grid-template-columns:repeat(4,minmax(180px,220px)); justify-content:center; gap:18px; padding:32px 24px; max-width:1200px; margin:0 auto; }
.calidad-dashboard-card { display:grid; justify-items:center; align-content:center; gap:12px; aspect-ratio:1/1; padding:18px; border:1px solid var(--app-border); border-radius:24px; background:var(--app-surface); text-align:center; box-shadow:var(--app-shadow-sm); transition:transform 0.18s ease,box-shadow 0.18s ease,border-color 0.18s ease; cursor:pointer; }
.calidad-dashboard-card:hover, .calidad-dashboard-card:focus-visible { transform:translateY(-2px); box-shadow:var(--app-shadow-md); }
.calidad-dashboard-card-icon { display:inline-flex; align-items:center; justify-content:center; width:54px; height:54px; flex:0 0 54px; color:var(--icon-base-color,var(--app-primary)); border-radius:14px; transition:color 0.18s ease,transform 0.18s ease; }
.calidad-dashboard-card:hover .calidad-dashboard-card-icon, .calidad-dashboard-card:focus-visible .calidad-dashboard-card-icon { color:var(--icon-hover-color,var(--app-primary-strong)); transform:translateY(-1px); }
.calidad-dashboard-card-icon .icon-glyph { color:currentColor; font-size:var(--config-icon-size,38px); }
.calidad-dashboard-card-icon .icon-svg-mask, .calidad-dashboard-card-icon .icon-image { width:var(--config-icon-size,38px); height:var(--config-icon-size,38px); display:block; max-width:100%; max-height:100%; object-fit:contain; }
.calidad-dashboard-card-title { font-size:13px; font-weight:500; color:var(--app-text-muted); }
.calidad-dashboard-card:hover .calidad-dashboard-card-title { color:var(--app-text); }

.calidad-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 24px; flex-wrap:wrap; }
.calidad-toolbar h1 { font-size:18px; margin:0; color:var(--app-text); }
.calidad-search { flex:1; min-width:220px; max-width:360px; padding:8px 12px; border:1px solid var(--app-border); border-radius:8px; background:var(--app-surface); color:var(--app-text); }
.calidad-table-wrap { padding:0 24px 24px; overflow-x:auto; }
.calidad-table { width:100%; border-collapse:collapse; background:var(--app-surface); border:1px solid var(--app-border); border-radius:12px; overflow:hidden; }
.calidad-table th, .calidad-table td { padding:10px 14px; text-align:left; border-bottom:1px solid var(--app-border); font-size:13px; color:var(--app-text); }
.calidad-table th { background:color-mix(in srgb, var(--app-surface) 92%, var(--app-text)); font-weight:600; }
.calidad-table tr:hover td { background:color-mix(in srgb, var(--app-surface) 96%, var(--app-primary)); }
.calidad-table tr { cursor:pointer; }
.calidad-badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; }
.calidad-badge-abierta { background:#fee2e2; color:#b91c1c; }
.calidad-badge-en_investigacion { background:#fef3c7; color:#92400e; }
.calidad-badge-accion_correctiva_definida { background:#dbeafe; color:#1d4ed8; }
.calidad-badge-cerrada { background:#dcfce7; color:#15803d; }
.calidad-btn-nueva { padding:8px 16px; border:none; border-radius:8px; background:var(--app-primary); color:#fff; font-weight:600; cursor:pointer; }
```

- [ ] **Paso 3: Crear `public/calidad/dashboard.html`** (mismo patrón que `public/tintas/dashboard.html`)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calidad - PrintLab</title>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/calidad/styles.css?v=20260803-1">
<script src="/theme.js"></script>
<style>
body { margin:0; background:transparent; }
</style>
</head>
<body>
<section class="calidad-dashboard-grid" id="calidadGrid"></section>
<script>
const CONFIG_ENDPOINT = '/api/config/shell';
const CALIDAD_MODULES = [
  { route:'/calidad/ordenes', label:'Órdenes de Calidad', iconKey:'calidadOrdenes' },
  { route:'/calidad/documentos', label:'Documentos Generados', iconKey:'calidadCartilla' }
];

let loadedConfig = {};

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function iconMarkup(value, altText, extraClass) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(normalized)) {
    return '<span class="icon-svg-mask ' + (extraClass || '') + '" role="img" aria-label="' + escapeHtml(altText) + '" style="-webkit-mask-image:url(\'' + escapeHtml(value) + '\');mask-image:url(\'' + escapeHtml(value) + '\');"></span>';
  }
  if (normalized.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(normalized)) {
    return '<img src="' + escapeHtml(value) + '" alt="' + escapeHtml(altText) + '" class="icon-image ' + (extraClass || '') + '">';
  }
  return '<span class="icon-glyph ' + (extraClass || '') + '">' + escapeHtml(value || '') + '</span>';
}

function renderCalidadCards() {
  const grid = document.getElementById('calidadGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CALIDAD_MODULES.forEach(function(mod) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'calidad-dashboard-card';
    card.dataset.route = mod.route;
    card.dataset.label = mod.label;
    card.dataset.iconKey = mod.iconKey;

    const iconValue = (loadedConfig.icons && loadedConfig.icons[mod.iconKey]) || '✓';
    const suffix = mod.iconKey.charAt(0).toUpperCase() + mod.iconKey.slice(1);
    let color = (loadedConfig.general && loadedConfig.general['iconColor' + suffix]) || '#16a34a';
    const hover = (loadedConfig.general && loadedConfig.general['iconColorHover' + suffix]) || color || '#15803d';
    const configuredSize = Number((loadedConfig.general && loadedConfig.general['iconSize' + suffix])) || 38;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'calidad-dashboard-card-icon';
    iconSpan.innerHTML = iconMarkup(iconValue, mod.label, 'table-icon-media');
    iconSpan.style.setProperty('--icon-base-color', color);
    iconSpan.style.setProperty('--icon-hover-color', hover);
    iconSpan.style.setProperty('--config-icon-size', configuredSize + 'px');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'calidad-dashboard-card-title';
    titleSpan.textContent = mod.label;

    card.appendChild(iconSpan);
    card.appendChild(titleSpan);

    card.addEventListener('click', function() {
      var parent = window.parent;
      if (parent && parent !== window) {
        parent.postMessage({ type:'erp-open-tab', route:mod.route, label:mod.label }, window.location.origin);
      } else {
        window.open(mod.route, '_blank', 'noopener');
      }
    });

    grid.appendChild(card);
  });
}

fetch(CONFIG_ENDPOINT).then(function(r) { return r.json(); }).then(function(cfg) {
  loadedConfig = cfg || {};
  renderCalidadCards();
}).catch(function() { renderCalidadCards(); });
</script>
</body>
</html>
```

- [ ] **Paso 4: Crear `public/calidad/ordenes.html`** (listado con búsqueda, autocontenido)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Órdenes de Calidad - PrintLab</title>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/calidad/styles.css?v=20260803-1">
<script src="/theme.js"></script>
<style>body { margin:0; background:transparent; }</style>
</head>
<body>
<div class="calidad-toolbar">
  <h1>Órdenes de Calidad</h1>
  <input type="text" id="calBusqueda" class="calidad-search" placeholder="Buscar por código, cliente o descripción...">
  <button type="button" class="calidad-btn-nueva" id="calNuevaOrden">+ Nueva Orden de Calidad</button>
</div>
<div class="calidad-table-wrap">
  <table class="calidad-table">
    <thead>
      <tr><th>Código</th><th>Orden de Producción</th><th>Cliente</th><th>Fecha de Detección</th><th>Estado</th></tr>
    </thead>
    <tbody id="calOrdenesBody"></tbody>
  </table>
</div>
<script>
function calEscapar(text) {
  const d = document.createElement('div');
  d.textContent = text == null ? '' : String(text);
  return d.innerHTML;
}
function calFecha(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CR');
}
const ESTADO_LABEL = {
  ABIERTA: 'Abierta',
  EN_INVESTIGACION: 'En Investigación',
  ACCION_CORRECTIVA_DEFINIDA: 'Acción Correctiva Definida',
  CERRADA: 'Cerrada'
};
async function calCargarOrdenes() {
  const q = document.getElementById('calBusqueda').value.trim();
  const url = '/api/calidad/ordenes' + (q ? '?q=' + encodeURIComponent(q) : '');
  const respuesta = await fetch(url);
  const ordenes = await respuesta.json();
  const cuerpo = document.getElementById('calOrdenesBody');
  cuerpo.innerHTML = (ordenes || []).map(function(o) {
    return '<tr onclick="window.location.href=\'/calidad/orden/' + encodeURIComponent(o.codigo) + '\'">' +
      '<td>' + calEscapar(o.codigo) + '</td>' +
      '<td>' + calEscapar(o.orden_produccion_codigo || '—') + '</td>' +
      '<td>' + calEscapar(o.cliente_nombre || '—') + '</td>' +
      '<td>' + calFecha(o.fecha_deteccion) + '</td>' +
      '<td><span class="calidad-badge calidad-badge-' + o.estado.toLowerCase() + '">' + (ESTADO_LABEL[o.estado] || o.estado) + '</span></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="5">Sin órdenes de calidad registradas.</td></tr>';
}
document.getElementById('calBusqueda').addEventListener('input', function() {
  clearTimeout(window.__calBusquedaTimer);
  window.__calBusquedaTimer = setTimeout(calCargarOrdenes, 300);
});
document.getElementById('calNuevaOrden').addEventListener('click', function() {
  window.location.href = '/calidad/orden/nueva';
});
calCargarOrdenes();
</script>
</body>
</html>
```

- [ ] **Paso 5: Verificación visual**

Con el servidor corriendo y una orden de calidad de prueba creada (Task 3), navegar a `http://localhost:3000/calidad` y confirmar que se ven las 2 tarjetas ("Órdenes de Calidad", "Documentos Generados"). Entrar a `http://localhost:3000/calidad/ordenes` y confirmar que la tabla lista la orden de prueba con su badge de estado correcto, y que escribir en el buscador filtra la tabla.

---

## Task 9: UI — formulario de creación/detalle de Orden de Calidad

**Files:**
- Create: `public/calidad/orden-detalle.html`

**Interfaces:**
- Consumes: `POST /api/calidad/ordenes` (Task 3), `GET /api/calidad/ordenes/:codigo` (Task 4), `PATCH /api/calidad/ordenes/:codigo` (Task 4), `GET /api/calidad/tipos-defecto` (Task 2), `GET /api/calidad/snapshot-tecnico` (Task 5).
- Ruta servida: `GET /calidad/orden/:codigo` (ya agregada en Task 8, paso 1) — cuando `:codigo` es literal `nueva`, la página muestra el formulario de creación vacío; con cualquier otro valor, carga la orden existente.

- [ ] **Paso 1: Crear `public/calidad/orden-detalle.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orden de Calidad - PrintLab</title>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/calidad/styles.css?v=20260803-1">
<script src="/theme.js"></script>
<style>
body { margin:0; background:transparent; padding:24px; }
.calidad-form-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; max-width:960px; }
.calidad-form-grid label { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:600; color:var(--app-text-muted); }
.calidad-form-grid input, .calidad-form-grid select, .calidad-form-grid textarea { padding:8px 10px; border:1px solid var(--app-border); border-radius:8px; background:var(--app-surface); color:var(--app-text); font-size:13px; }
.calidad-form-grid textarea { grid-column:1 / -1; min-height:60px; }
.calidad-linea-card { border:1px solid var(--app-border); border-radius:12px; padding:16px; margin:16px 0; background:var(--app-surface); }
.calidad-linea-card h3 { margin:0 0 12px; font-size:14px; }
.calidad-defecto-row, .calidad-pantone-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:8px; margin-bottom:8px; align-items:center; }
.calidad-actions { display:flex; gap:10px; margin-top:16px; }
.calidad-btn-secundario { padding:8px 16px; border:1px solid var(--app-border); border-radius:8px; background:var(--app-surface); color:var(--app-text); cursor:pointer; }
</style>
</head>
<body>
<h1 id="calTituloOrden">Nueva Orden de Calidad</h1>
<div class="calidad-form-grid">
  <label>Orden de Producción (opcional)<input type="text" id="calOrdenProduccion" placeholder="OP-000009"></label>
  <label>Código de Cliente<input type="text" id="calClienteCodigo"></label>
  <label>Nombre de Cliente<input type="text" id="calClienteNombre"></label>
  <label>Fecha de Detección<input type="date" id="calFechaDeteccion"></label>
  <label>Detectado Por<input type="text" id="calDetectadoPor"></label>
  <label>Estado<select id="calEstado" disabled><option value="ABIERTA">Abierta</option><option value="EN_INVESTIGACION">En Investigación</option><option value="ACCION_CORRECTIVA_DEFINIDA">Acción Correctiva Definida</option><option value="CERRADA">Cerrada</option></select></label>
  <label style="grid-column:1 / -1">Descripción General<textarea id="calDescripcionGeneral"></textarea></label>
</div>

<div id="calLineasContainer"></div>
<button type="button" class="calidad-btn-secundario" id="calAgregarLinea">+ Agregar Línea/Producto Afectado</button>

<div id="calAccionCorrectivaBlock" class="calidad-form-grid" style="margin-top:20px;" hidden>
  <label>Acción Correctiva<textarea id="calAccionCorrectiva"></textarea></label>
  <label>Acción Preventiva<textarea id="calAccionPreventiva"></textarea></label>
  <label>Responsable de la Acción<input type="text" id="calResponsableAccion"></label>
  <label>Fecha Límite<input type="date" id="calFechaLimiteAccion"></label>
</div>

<div class="calidad-actions">
  <button type="button" class="calidad-btn-nueva" id="calGuardar">Guardar Orden de Calidad</button>
  <select id="calCambiarEstado" style="display:none;">
    <option value="">Cambiar Estado...</option>
    <option value="EN_INVESTIGACION">En Investigación</option>
    <option value="ACCION_CORRECTIVA_DEFINIDA">Acción Correctiva Definida</option>
    <option value="CERRADA">Cerrada</option>
  </select>
</div>

<script>
const codigoActual = window.location.pathname.split('/').pop();
const esNueva = codigoActual === 'nueva';
let tiposDefecto = [];
let lineas = [];

function calEscapar(text) {
  const d = document.createElement('div');
  d.textContent = text == null ? '' : String(text);
  return d.innerHTML;
}

function calMostrarLineas() {
  const cont = document.getElementById('calLineasContainer');
  cont.innerHTML = lineas.map(function(linea, i) {
    const opcionesDefecto = tiposDefecto.map(function(t) { return '<option value="' + t.id + '">' + calEscapar(t.nombre) + '</option>'; }).join('');
    const defectosHtml = (linea.defectos || []).map(function(d, j) {
      return '<div class="calidad-defecto-row">' +
        '<select data-linea="' + i + '" data-defecto="' + j + '" data-campo="tipo_defecto_id" onchange="calActualizarDefecto(this)"><option value="">Tipo de defecto...</option>' + opcionesDefecto + '</select>' +
        '<input type="text" placeholder="Descripción" data-linea="' + i + '" data-defecto="' + j + '" data-campo="descripcion" oninput="calActualizarDefecto(this)">' +
        '<input type="text" placeholder="Área Responsable" data-linea="' + i + '" data-defecto="' + j + '" data-campo="area_responsable" oninput="calActualizarDefecto(this)">' +
        '<input type="text" placeholder="Persona Responsable" data-linea="' + i + '" data-defecto="' + j + '" data-campo="persona_responsable" oninput="calActualizarDefecto(this)">' +
        '<button type="button" onclick="calQuitarDefecto(' + i + ',' + j + ')">✕</button>' +
      '</div>';
    }).join('');
    return '<div class="calidad-linea-card">' +
      '<h3>Línea ' + (i + 1) + '</h3>' +
      '<div class="calidad-form-grid">' +
        '<label>Código de Producto<input type="text" value="' + calEscapar(linea.producto_codigo) + '" data-linea="' + i + '" data-campo="producto_codigo" oninput="calActualizarLinea(this)"></label>' +
        '<label>Código de Línea<input type="text" value="' + calEscapar(linea.linea_codigo) + '" data-linea="' + i + '" data-campo="linea_codigo" oninput="calActualizarLinea(this)"></label>' +
        '<label>Sustrato<input type="text" value="' + calEscapar(linea.sustrato) + '" data-linea="' + i + '" data-campo="sustrato" oninput="calActualizarLinea(this)"></label>' +
      '</div>' +
      '<h4>Defectos Encontrados</h4>' + defectosHtml +
      '<button type="button" class="calidad-btn-secundario" onclick="calAgregarDefecto(' + i + ')">+ Agregar Defecto</button>' +
    '</div>';
  }).join('');
}

function calActualizarLinea(input) {
  lineas[Number(input.dataset.linea)][input.dataset.campo] = input.value;
}
function calActualizarDefecto(input) {
  const linea = lineas[Number(input.dataset.linea)];
  linea.defectos[Number(input.dataset.defecto)][input.dataset.campo] = input.value;
}
function calAgregarDefecto(i) {
  lineas[i].defectos = lineas[i].defectos || [];
  lineas[i].defectos.push({ tipo_defecto_id: '', descripcion: '', area_responsable: '', persona_responsable: '' });
  calMostrarLineas();
}
function calQuitarDefecto(i, j) {
  lineas[i].defectos.splice(j, 1);
  calMostrarLineas();
}
document.getElementById('calAgregarLinea').addEventListener('click', function() {
  lineas.push({ producto_codigo: '', linea_codigo: '', sustrato: '', pantones: [], defectos: [] });
  calMostrarLineas();
});

document.getElementById('calGuardar').addEventListener('click', async function() {
  const payload = {
    orden_produccion_codigo: document.getElementById('calOrdenProduccion').value.trim() || null,
    cliente_codigo: document.getElementById('calClienteCodigo').value.trim() || null,
    cliente_nombre: document.getElementById('calClienteNombre').value.trim() || null,
    fecha_deteccion: document.getElementById('calFechaDeteccion').value || null,
    detectado_por: document.getElementById('calDetectadoPor').value.trim() || null,
    descripcion_general: document.getElementById('calDescripcionGeneral').value.trim() || null,
    lineas: lineas.map(function(l) {
      return {
        producto_codigo: l.producto_codigo || null,
        linea_codigo: l.linea_codigo || null,
        sustrato: l.sustrato || null,
        pantones: l.pantones || [],
        defectos: (l.defectos || []).filter(function(d) { return d.descripcion || d.tipo_defecto_id; })
      };
    })
  };
  if (!payload.lineas.length) { alert('Agregue al menos una línea afectada.'); return; }
  const respuesta = await fetch('/api/calidad/ordenes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const resultado = await respuesta.json();
  if (!respuesta.ok) { alert('Error: ' + resultado.error); return; }
  window.location.href = '/calidad/orden/' + encodeURIComponent(resultado.codigo);
});

document.getElementById('calCambiarEstado').addEventListener('change', async function() {
  if (!this.value) return;
  const respuesta = await fetch('/api/calidad/ordenes/' + encodeURIComponent(codigoActual), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: this.value })
  });
  if (!respuesta.ok) { alert('Error al cambiar estado.'); return; }
  window.location.reload();
});

async function calCargarInicial() {
  const respuestaTipos = await fetch('/api/calidad/tipos-defecto');
  tiposDefecto = await respuestaTipos.json();

  if (!esNueva) {
    const respuesta = await fetch('/api/calidad/ordenes/' + encodeURIComponent(codigoActual));
    const orden = await respuesta.json();
    if (!respuesta.ok) { alert('Error: ' + orden.error); return; }
    document.getElementById('calTituloOrden').textContent = 'Orden de Calidad ' + orden.codigo;
    document.getElementById('calOrdenProduccion').value = orden.orden_produccion_codigo || '';
    document.getElementById('calClienteCodigo').value = orden.cliente_codigo || '';
    document.getElementById('calClienteNombre').value = orden.cliente_nombre || '';
    document.getElementById('calFechaDeteccion').value = (orden.fecha_deteccion || '').slice(0, 10);
    document.getElementById('calDetectadoPor').value = orden.detectado_por || '';
    document.getElementById('calDescripcionGeneral').value = orden.descripcion_general || '';
    document.getElementById('calEstado').value = orden.estado;
    document.getElementById('calGuardar').style.display = 'none';
    document.getElementById('calCambiarEstado').style.display = orden.estado === 'CERRADA' ? 'none' : 'inline-block';
    document.getElementById('calAccionCorrectivaBlock').hidden = false;
    document.getElementById('calAccionCorrectiva').value = orden.accion_correctiva || '';
    document.getElementById('calAccionPreventiva').value = orden.accion_preventiva || '';
    document.getElementById('calResponsableAccion').value = orden.responsable_accion || '';
    document.getElementById('calFechaLimiteAccion').value = (orden.fecha_limite_accion || '').slice(0, 10);
    lineas = orden.lineas || [];
    document.getElementById('calAgregarLinea').style.display = 'none';
  }
  calMostrarLineas();
}
calCargarInicial();
</script>
</body>
</html>
```

- [ ] **Paso 2: Verificación visual — creación**

Navegar a `http://localhost:3000/calidad/orden/nueva`, llenar cliente, agregar una línea con producto y un defecto, guardar. Confirmar redirección a `/calidad/orden/OC-00000X` mostrando los datos guardados y el `<select>` de cambio de estado visible.

- [ ] **Paso 3: Verificación visual — cambio de estado**

En esa misma orden, usar el `<select>` "Cambiar Estado..." para pasar a `EN_INVESTIGACION`, confirmar que la página recarga y el estado se refleja. Repetir hasta `CERRADA` y confirmar que el selector de estado desaparece.

- [ ] **Paso 4: Limpiar datos de prueba** (igual que Task 3, paso 3, usando el código real creado aquí).

---

## Task 10: UI — página de Documentos (buscar orden, generar, historial)

**Files:**
- Create: `public/calidad/documentos.html`

**Interfaces:**
- Consumes: `POST /api/calidad/documentos`, `GET /api/calidad/documentos` (Task 6).
- Ruta servida: `GET /calidad/documentos` (ya agregada en Task 8, paso 1).

- [ ] **Paso 1: Crear `public/calidad/documentos.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Documentos de Calidad - PrintLab</title>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/calidad/styles.css?v=20260803-1">
<script src="/theme.js"></script>
<style>
body { margin:0; background:transparent; padding:24px; }
.calidad-doc-form { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:20px; }
.calidad-doc-form label { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:600; color:var(--app-text-muted); }
.calidad-doc-form input, .calidad-doc-form select { padding:8px 10px; border:1px solid var(--app-border); border-radius:8px; }
</style>
</head>
<body>
<h1>Documentos de Calidad</h1>
<div class="calidad-doc-form">
  <label>Orden de Producción<input type="text" id="calDocOrden" placeholder="OP-000009"></label>
  <label>Producto (opcional)<input type="text" id="calDocProducto" placeholder="P-000005"></label>
  <button type="button" class="calidad-btn-nueva" id="calDocCartilla">Generar Cartilla de Color</button>
  <button type="button" class="calidad-btn-nueva" id="calDocFicha">Generar Ficha Técnica</button>
  <button type="button" class="calidad-btn-nueva" id="calDocCertificado">Generar Certificado de Calidad</button>
</div>

<div id="calDocCertificadoForm" class="calidad-doc-form" hidden>
  <label>Cantidad Aprobada<input type="number" id="calDocCantidadAprobada" min="0" step="0.0001"></label>
  <label>Cantidad Rechazada<input type="number" id="calDocCantidadRechazada" min="0" step="0.0001"></label>
  <label>Resultado<select id="calDocResultado"><option value="Aprobado">Aprobado</option><option value="Aprobado con Observaciones">Aprobado con Observaciones</option><option value="Rechazado">Rechazado</option></select></label>
  <label>Inspeccionado Por<input type="text" id="calDocInspeccionadoPor"></label>
  <label>Fecha de Inspección<input type="date" id="calDocFechaInspeccion"></label>
  <button type="button" class="calidad-btn-nueva" id="calDocCertificadoConfirmar">Confirmar y Generar</button>
</div>

<h2>Historial</h2>
<div class="calidad-table-wrap" style="padding:0;">
  <table class="calidad-table">
    <thead><tr><th>Tipo</th><th>Orden</th><th>Producto</th><th>Versión</th><th>Generado</th><th></th></tr></thead>
    <tbody id="calDocHistorialBody"></tbody>
  </table>
</div>

<script>
const ETIQUETA_TIPO = { cartilla_color: 'Cartilla de Color', ficha_tecnica: 'Ficha Técnica', certificado_calidad: 'Certificado de Calidad' };
const RUTA_TIPO = { cartilla_color: '/calidad/cartilla-color-impresion.html', ficha_tecnica: '/calidad/ficha-tecnica-impresion.html', certificado_calidad: '/calidad/certificado-calidad-impresion.html' };

function calEscapar(text) {
  const d = document.createElement('div');
  d.textContent = text == null ? '' : String(text);
  return d.innerHTML;
}
function calFechaHora(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CR');
}

async function calCargarHistorial() {
  const orden = document.getElementById('calDocOrden').value.trim();
  const url = '/api/calidad/documentos' + (orden ? '?orden_produccion_codigo=' + encodeURIComponent(orden) : '');
  const respuesta = await fetch(url);
  const documentos = await respuesta.json();
  document.getElementById('calDocHistorialBody').innerHTML = (documentos || []).map(function(d) {
    return '<tr>' +
      '<td>' + calEscapar(ETIQUETA_TIPO[d.tipo] || d.tipo) + '</td>' +
      '<td>' + calEscapar(d.orden_produccion_codigo) + '</td>' +
      '<td>' + calEscapar(d.producto_codigo || '—') + '</td>' +
      '<td>v' + d.version + '</td>' +
      '<td>' + calFechaHora(d.generado_en) + '</td>' +
      '<td><a href="' + calEscapar(RUTA_TIPO[d.tipo]) + '?id=' + encodeURIComponent(d.id) + '" target="_blank">Ver / Imprimir</a></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="6">Sin documentos generados.</td></tr>';
}

async function calGenerarDocumento(tipo, extra) {
  const orden = document.getElementById('calDocOrden').value.trim();
  if (!orden) { alert('Ingrese el código de la Orden de Producción.'); return; }
  const payload = Object.assign({
    tipo: tipo,
    orden_produccion_codigo: orden,
    producto_codigo: document.getElementById('calDocProducto').value.trim() || null
  }, extra || {});
  const respuesta = await fetch('/api/calidad/documentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const resultado = await respuesta.json();
  if (!respuesta.ok) { alert('Error: ' + resultado.error); return; }
  window.open(RUTA_TIPO[tipo] + '?id=' + encodeURIComponent(resultado.id), '_blank');
  calCargarHistorial();
}

document.getElementById('calDocCartilla').addEventListener('click', function() { calGenerarDocumento('cartilla_color'); });
document.getElementById('calDocFicha').addEventListener('click', function() { calGenerarDocumento('ficha_tecnica'); });
document.getElementById('calDocCertificado').addEventListener('click', function() {
  document.getElementById('calDocCertificadoForm').hidden = false;
});
document.getElementById('calDocCertificadoConfirmar').addEventListener('click', function() {
  calGenerarDocumento('certificado_calidad', {
    cantidad_aprobada: Number(document.getElementById('calDocCantidadAprobada').value) || null,
    cantidad_rechazada: Number(document.getElementById('calDocCantidadRechazada').value) || null,
    resultado_inspeccion: document.getElementById('calDocResultado').value,
    inspeccionado_por: document.getElementById('calDocInspeccionadoPor').value.trim() || null,
    fecha_inspeccion: document.getElementById('calDocFechaInspeccion').value || null
  });
  document.getElementById('calDocCertificadoForm').hidden = true;
});
document.getElementById('calDocOrden').addEventListener('change', calCargarHistorial);
calCargarHistorial();
</script>
</body>
</html>
```

- [ ] **Paso 2: Verificación visual**

Navegar a `http://localhost:3000/calidad/documentos`, ingresar un `order_code` real de `flexo_orders`, generar Ficha Técnica y Cartilla de Color (confirmar que abren una pestaña nueva — se implementa en Task 11 — y que el historial se refresca con la nueva versión), y generar un Certificado llenando el formulario adicional.

---

## Task 11: UI — páginas de impresión (Cartilla, Ficha Técnica, Certificado)

**Files:**
- Create: `public/calidad/cartilla-color-impresion.html`
- Create: `public/calidad/ficha-tecnica-impresion.html`
- Create: `public/calidad/certificado-calidad-impresion.html`

**Interfaces:**
- Consumes: `GET /api/calidad/documentos/:id` (Task 6).

- [ ] **Paso 1: Crear `public/calidad/ficha-tecnica-impresion.html`** (patrón de impresión de `proforma-print.html`, adaptado)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script src="/theme.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ficha Técnica — Impresión</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1b2430; background: #e8edf2; }
  #calToolbar { display:flex; gap:10px; align-items:center; padding:14px 20px; background:#1f314b; color:#fff; }
  #calToolbar button { padding:8px 14px; border:none; border-radius:6px; background:#314765; color:#fff; cursor:pointer; }
  #calToolbar button.primary { background:#0b81b8; }
  #calDoc { max-width:800px; margin:24px auto; background:#fff; padding:36px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.12); }
  #calDoc h1 { font-size:20px; margin-bottom:4px; }
  #calDoc .cal-sub { color:#647384; font-size:13px; margin-bottom:20px; }
  .cal-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; margin-bottom:20px; }
  .cal-grid div span.cal-label { display:block; font-size:11px; color:#647384; text-transform:uppercase; }
  .cal-grid div span.cal-value { font-size:14px; font-weight:600; }
  @media print {
    body { background:#fff !important; }
    #calToolbar { display:none !important; }
    #calDoc { box-shadow:none !important; margin:0 auto !important; }
  }
</style>
</head>
<body>
  <div id="calToolbar">
    <span>Ficha Técnica</span>
    <div style="flex:1;"></div>
    <button onclick="window.close()">✕ Cerrar</button>
    <button class="primary" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div id="calDoc">Cargando...</div>
  <script>
    function calEscapar(text) {
      const d = document.createElement('div');
      d.textContent = text == null ? '' : String(text);
      return d.innerHTML;
    }
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');
    fetch('/api/calidad/documentos/' + encodeURIComponent(id)).then(function(r) { return r.json(); }).then(function(doc) {
      document.getElementById('calDoc').innerHTML =
        '<h1>Ficha Técnica</h1>' +
        '<div class="cal-sub">Orden ' + calEscapar(doc.orden_produccion_codigo) + (doc.producto_codigo ? ' — Producto ' + calEscapar(doc.producto_codigo) : '') + ' · Versión ' + doc.version + ' · Generado ' + new Date(doc.generado_en).toLocaleString('es-CR') + '</div>' +
        '<div class="cal-grid">' +
          '<div><span class="cal-label">Sustrato</span><span class="cal-value">' + calEscapar(doc.sustrato || '—') + '</span></div>' +
          '<div><span class="cal-label">Cantidad de Tintas</span><span class="cal-value">' + calEscapar(doc.cantidad_tintas ?? '—') + '</span></div>' +
          '<div><span class="cal-label">Ancho</span><span class="cal-value">' + calEscapar(doc.ancho ?? '—') + ' in</span></div>' +
          '<div><span class="cal-label">Tinta Blanca</span><span class="cal-value">' + (doc.tinta_blanca ? 'Sí' : 'No') + '</span></div>' +
          '<div><span class="cal-label">Largo</span><span class="cal-value">' + calEscapar(doc.largo ?? '—') + ' in</span></div>' +
          '<div><span class="cal-label">Barniz</span><span class="cal-value">' + calEscapar(doc.barniz_tipo || '—') + '</span></div>' +
          '<div><span class="cal-label">Diámetro de Core</span><span class="cal-value">' + calEscapar(doc.diametro_core || '—') + '</span></div>' +
          '<div><span class="cal-label">Laminado</span><span class="cal-value">' + calEscapar(doc.laminado_tipo || '—') + '</span></div>' +
          '<div><span class="cal-label">Troquelado</span><span class="cal-value">' + calEscapar(doc.troquelado_forma || '—') + '</span></div>' +
          '<div><span class="cal-label">Numerado</span><span class="cal-value">' + calEscapar(doc.numerado_tipo || '—') + '</span></div>' +
          '<div><span class="cal-label">Rebobinado</span><span class="cal-value">' + calEscapar(doc.rebobinado_notas || '—') + '</span></div>' +
        '</div>';
      setTimeout(function() {}, 0);
    }).catch(function() {
      document.getElementById('calDoc').innerHTML = '<p>No se pudo cargar el documento.</p>';
    });
  </script>
</body>
</html>
```

- [ ] **Paso 2: Crear `public/calidad/cartilla-color-impresion.html`** (mismo esqueleto de toolbar/print CSS del Paso 1; cambiar título a "Cartilla de Color" y el bloque de contenido por una tabla de pantones)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script src="/theme.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cartilla de Color — Impresión</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1b2430; background: #e8edf2; }
  #calToolbar { display:flex; gap:10px; align-items:center; padding:14px 20px; background:#1f314b; color:#fff; }
  #calToolbar button { padding:8px 14px; border:none; border-radius:6px; background:#314765; color:#fff; cursor:pointer; }
  #calToolbar button.primary { background:#0b81b8; }
  #calDoc { max-width:800px; margin:24px auto; background:#fff; padding:36px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.12); }
  #calDoc h1 { font-size:20px; margin-bottom:4px; }
  #calDoc .cal-sub { color:#647384; font-size:13px; margin-bottom:20px; }
  table.cal-pantones { width:100%; border-collapse:collapse; }
  table.cal-pantones th, table.cal-pantones td { border:1px solid #d7e2ea; padding:8px 10px; font-size:13px; text-align:left; }
  table.cal-pantones th { background:#f2f5f8; }
  .cal-swatch { display:inline-block; width:20px; height:20px; border-radius:4px; border:1px solid #d7e2ea; vertical-align:middle; }
  @media print {
    body { background:#fff !important; }
    #calToolbar { display:none !important; }
    #calDoc { box-shadow:none !important; margin:0 auto !important; }
  }
</style>
</head>
<body>
  <div id="calToolbar">
    <span>Cartilla de Color</span>
    <div style="flex:1;"></div>
    <button onclick="window.close()">✕ Cerrar</button>
    <button class="primary" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div id="calDoc">Cargando...</div>
  <script>
    function calEscapar(text) {
      const d = document.createElement('div');
      d.textContent = text == null ? '' : String(text);
      return d.innerHTML;
    }
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');
    fetch('/api/calidad/documentos/' + encodeURIComponent(id)).then(function(r) { return r.json(); }).then(function(doc) {
      const filas = (doc.pantones || []).map(function(p) {
        const color = p.color_referencia && /^#/.test(p.color_referencia) ? p.color_referencia : '#ffffff';
        return '<tr>' +
          '<td><span class="cal-swatch" style="background:' + calEscapar(color) + '"></span></td>' +
          '<td>' + calEscapar(p.pantone_codigo) + '</td>' +
          '<td>' + calEscapar(p.receta_referencia || '—') + '</td>' +
          '<td>' + calEscapar(p.densidad_objetivo ?? '—') + '</td>' +
          '<td>' + calEscapar(p.anilox_codigo || '—') + '</td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="5">Sin pantones registrados para esta orden.</td></tr>';
      document.getElementById('calDoc').innerHTML =
        '<h1>Cartilla de Color</h1>' +
        '<div class="cal-sub">Orden ' + calEscapar(doc.orden_produccion_codigo) + (doc.producto_codigo ? ' — Producto ' + calEscapar(doc.producto_codigo) : '') + ' · Versión ' + doc.version + ' · Generado ' + new Date(doc.generado_en).toLocaleString('es-CR') + '</div>' +
        '<table class="cal-pantones"><thead><tr><th>Color</th><th>Pantone</th><th>Receta</th><th>Densidad Objetivo</th><th>Anilox</th></tr></thead><tbody>' + filas + '</tbody></table>';
    }).catch(function() {
      document.getElementById('calDoc').innerHTML = '<p>No se pudo cargar el documento.</p>';
    });
  </script>
</body>
</html>
```

- [ ] **Paso 3: Crear `public/calidad/certificado-calidad-impresion.html`** (mismo esqueleto; contenido de certificado)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script src="/theme.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificado de Calidad — Impresión</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1b2430; background: #e8edf2; }
  #calToolbar { display:flex; gap:10px; align-items:center; padding:14px 20px; background:#1f314b; color:#fff; }
  #calToolbar button { padding:8px 14px; border:none; border-radius:6px; background:#314765; color:#fff; cursor:pointer; }
  #calToolbar button.primary { background:#0b81b8; }
  #calDoc { max-width:800px; margin:24px auto; background:#fff; padding:36px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.12); text-align:center; }
  #calDoc h1 { font-size:22px; margin-bottom:20px; }
  .cal-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; margin:24px 0; text-align:left; }
  .cal-grid div span.cal-label { display:block; font-size:11px; color:#647384; text-transform:uppercase; }
  .cal-grid div span.cal-value { font-size:14px; font-weight:600; }
  .cal-resultado { display:inline-block; margin-top:10px; padding:8px 20px; border-radius:999px; font-weight:700; }
  @media print {
    body { background:#fff !important; }
    #calToolbar { display:none !important; }
    #calDoc { box-shadow:none !important; margin:0 auto !important; }
  }
</style>
</head>
<body>
  <div id="calToolbar">
    <span>Certificado de Calidad</span>
    <div style="flex:1;"></div>
    <button onclick="window.close()">✕ Cerrar</button>
    <button class="primary" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div id="calDoc">Cargando...</div>
  <script>
    function calEscapar(text) {
      const d = document.createElement('div');
      d.textContent = text == null ? '' : String(text);
      return d.innerHTML;
    }
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');
    fetch('/api/calidad/documentos/' + encodeURIComponent(id)).then(function(r) { return r.json(); }).then(function(doc) {
      document.getElementById('calDoc').innerHTML =
        '<h1>Certificado de Calidad</h1>' +
        '<div class="cal-sub">Orden ' + calEscapar(doc.orden_produccion_codigo) + (doc.producto_codigo ? ' — Producto ' + calEscapar(doc.producto_codigo) : '') + ' · Versión ' + doc.version + '</div>' +
        '<div class="cal-grid">' +
          '<div><span class="cal-label">Cantidad Aprobada</span><span class="cal-value">' + calEscapar(doc.cantidad_aprobada ?? '—') + '</span></div>' +
          '<div><span class="cal-label">Cantidad Rechazada</span><span class="cal-value">' + calEscapar(doc.cantidad_rechazada ?? '—') + '</span></div>' +
          '<div><span class="cal-label">Inspeccionado Por</span><span class="cal-value">' + calEscapar(doc.inspeccionado_por || '—') + '</span></div>' +
          '<div><span class="cal-label">Fecha de Inspección</span><span class="cal-value">' + calEscapar((doc.fecha_inspeccion || '').slice(0, 10) || '—') + '</span></div>' +
        '</div>' +
        '<span class="cal-resultado" style="background:' + (doc.resultado_inspeccion === 'Rechazado' ? '#fee2e2;color:#b91c1c' : '#dcfce7;color:#15803d') + '">' + calEscapar(doc.resultado_inspeccion || 'Sin resultado') + '</span>' +
        (doc.observaciones ? '<p style="margin-top:20px;text-align:left;">' + calEscapar(doc.observaciones) + '</p>' : '');
    }).catch(function() {
      document.getElementById('calDoc').innerHTML = '<p>No se pudo cargar el documento.</p>';
    });
  </script>
</body>
</html>
```

- [ ] **Paso 4: Verificación visual**

Desde `http://localhost:3000/calidad/documentos`, generar los 3 tipos de documentos y confirmar que cada pestaña nueva muestra los datos correctos (Cartilla con tabla de pantones, Ficha con grid técnico, Certificado con resultado coloreado), y que el botón "Imprimir / Guardar PDF" abre el diálogo de impresión del navegador con el toolbar oculto en la vista previa de impresión.

---

## Task 12: Integración — botones en Orden de Producción existente

**Files:**
- Modify: `public/orden-produccion.html:582`
- Modify: `public/orden-produccion.js:3581` (render de iconos), `public/orden-produccion.js:3873` (listeners)

**Interfaces:**
- Consumes: `POST /api/calidad/documentos` (Task 6), icon keys `calidadCartilla`/`calidadFichaTecnica`/`calidadCertificado` (Task 7).

- [ ] **Paso 1: Agregar los 3 botones en `orden-produccion.html`, dentro de `#orderAdminTools` (línea 582), después de `orderCreationSummaryButton`**

```html
<div id="orderAdminTools" class="production-admin-tools">
    <button type="button" id="orderPrintButton" class="browser-open-link production-admin-tool-btn" aria-label="Imprimir orden" title="Imprimir orden"></button>
    <button type="button" id="orderPdfButton" class="browser-open-link production-admin-tool-btn" aria-label="Descargar PDF" title="Descargar PDF"></button>
    <button type="button" id="orderCreationSummaryButton" class="browser-open-link production-admin-tool-btn" aria-label="Datos de creación" title="Datos de creación" hidden></button>
    <button type="button" id="orderQualityCartillaButton" class="browser-open-link production-admin-tool-btn" aria-label="Generar cartilla de color" title="Generar cartilla de color" hidden></button>
    <button type="button" id="orderQualityFichaButton" class="browser-open-link production-admin-tool-btn" aria-label="Generar ficha técnica" title="Generar ficha técnica" hidden></button>
    <button type="button" id="orderQualityCertificadoButton" class="browser-open-link production-admin-tool-btn" aria-label="Generar certificado de calidad" title="Generar certificado de calidad" hidden></button>
</div>
```

- [ ] **Paso 2: Renderizar iconos y controlar visibilidad por permiso, dentro del bloque de `orden-produccion.js:3569-3581`**

```js
    const adminTools = document.getElementById('orderAdminTools');
    if (adminTools) {
        adminTools.hidden = false;
        const summaryBtn = document.getElementById('orderCreationSummaryButton');
        if (summaryBtn) {
            renderIconButton(summaryBtn, iconConfigFor('orderCreationSummary', '⚙️'));
            summaryBtn.hidden = !hasAdminToolsAccess();
        }
        const printBtn = document.getElementById('orderPrintButton');
        if (printBtn) renderIconButton(printBtn, iconConfigFor('orderPrint', '🖨️'));
        const pdfBtn = document.getElementById('orderPdfButton');
        if (pdfBtn) renderIconButton(pdfBtn, iconConfigFor('orderPdf', '📄'));
        const tieneAccesoCalidad = window.ErpAccess?.canViewModule ? window.ErpAccess.canViewModule('calidad') : true;
        const cartillaBtn = document.getElementById('orderQualityCartillaButton');
        if (cartillaBtn) {
            renderIconButton(cartillaBtn, iconConfigFor('calidadCartilla', '◉'));
            cartillaBtn.hidden = !tieneAccesoCalidad;
        }
        const fichaBtn = document.getElementById('orderQualityFichaButton');
        if (fichaBtn) {
            renderIconButton(fichaBtn, iconConfigFor('calidadFichaTecnica', '☷'));
            fichaBtn.hidden = !tieneAccesoCalidad;
        }
        const certificadoBtn = document.getElementById('orderQualityCertificadoButton');
        if (certificadoBtn) {
            renderIconButton(certificadoBtn, iconConfigFor('calidadCertificado', '✓'));
            certificadoBtn.hidden = !tieneAccesoCalidad;
        }
    }
```

- [ ] **Paso 3: Agregar los listeners, junto a los de `orderPrintButton`/`orderPdfButton` (`orden-produccion.js:3838-3873`)**

```js
function calidadGenerarDocumento(tipo) {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode;
    if (!orderCode) { notify('Error', 'No hay una orden cargada.', 'danger'); return; }
    fetch('/api/calidad/documentos', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ tipo: tipo, orden_produccion_codigo: orderCode })
    }).then(function (r) { return r.json(); }).then(function (doc) {
        if (doc.error) { notify('Error', doc.error, 'danger'); return; }
        const paginas = { cartilla_color: '/calidad/cartilla-color-impresion.html', ficha_tecnica: '/calidad/ficha-tecnica-impresion.html', certificado_calidad: '/calidad/certificado-calidad-impresion.html' };
        window.open(paginas[tipo] + '?id=' + doc.id, '_blank');
    }).catch(function (err) {
        notify('Error de red', err.message, 'danger');
    });
}
document.getElementById('orderQualityCartillaButton')?.addEventListener('click', () => calidadGenerarDocumento('cartilla_color'));
document.getElementById('orderQualityFichaButton')?.addEventListener('click', () => calidadGenerarDocumento('ficha_tecnica'));
document.getElementById('orderQualityCertificadoButton')?.addEventListener('click', () => {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode;
    if (!orderCode) { notify('Error', 'No hay una orden cargada.', 'danger'); return; }
    window.open('/calidad/documentos?orden=' + encodeURIComponent(orderCode), '_blank');
});
```

Nota: el certificado requiere datos de inspección capturados manualmente (Task 6/10), por eso su botón abre la página de Documentos con la orden precargada en vez de generarlo directo; ajustar `documentos.html` (Task 10) para leer `?orden=` de la URL y precargar `#calDocOrden` — agregar al final del script de `documentos.html`:

```js
const ordenPrecargada = new URLSearchParams(window.location.search).get('orden');
if (ordenPrecargada) { document.getElementById('calDocOrden').value = ordenPrecargada; calCargarHistorial(); }
```

- [ ] **Paso 4: Verificación visual — regresión y funcionalidad nueva**

Abrir una orden de producción existente en `http://localhost:3000/orden-produccion.html?codigo=OP-000009` (o la ruta real usada), confirmar que los botones de imprimir/PDF existentes siguen funcionando igual que antes (regresión), que los 3 botones nuevos aparecen con sus iconos, que "Generar Cartilla de Color" y "Generar Ficha Técnica" abren la pestaña de impresión con datos, y que "Generar Certificado de Calidad" abre `/calidad/documentos` con el campo de orden precargado.

---

## Self-Review

**Cobertura del spec:** las 5 secciones de `docs/superpowers/specs/2026-08-03-control-calidad-design.md` están cubiertas — Arquitectura/Navegación (Tasks 2, 7, 8), Órdenes de Calidad (Tasks 3, 4, 9), Documentos de Calidad (Tasks 5, 6, 10, 11), Permisos (Task 7), Integración con Orden de Producción (Task 12). Plan de Pruebas del spec se refleja en los pasos de verificación de cada tarea.

**Placeholders:** ninguno — cada paso de código trae la implementación completa (SQL, JS, HTML).

**Consistencia de tipos/nombres:** verificado que `troquelado_forma`, `diametro_core`, `rebobinado_notas` se usan de forma idéntica en `calidad_orden_lineas`, `calidad_documentos`, `generarSnapshotTecnico` y las páginas de impresión. `erroneo(status, message)` se usa consistentemente en todas las rutas del servicio. Los icon keys (`calidadOrdenes`, `calidadCartilla`, `calidadFichaTecnica`, `calidadCertificado`, `dashboardCalidad`) coinciden entre Task 7 (registro) y Tasks 8/9/10/12 (consumo).

---

## Fases de ejecución sugeridas (para entrega incremental)

- **Fase 1 — Órdenes de Calidad:** Tasks 1, 2, 3, 4, 7, 8, 9.
- **Fase 2 — Documentos de Calidad:** Tasks 5, 6, 10, 11, 12 (Task 1 ya cubre las tablas de ambas fases).
