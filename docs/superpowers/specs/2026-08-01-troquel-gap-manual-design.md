# Troquel: GAP visible + captura manual ("Troquel Nuevo")

## Contexto

En el cálculo de flexografía (`public/calculo-flexografia`), la sección "Troquel" tiene hoy dos modos:

- **Troquel de Inventario**: se elige un troquel existente del catálogo (`troquel` en BD) y sus dimensiones alimentan el resto del cálculo (montaje de planchas, sustrato, etc.).
- **Costo Externo**: solo permite registrar líneas de costo (descripción/costo/comentario), sin capturar medidas del troquel.

La columna `troquel.gap_in` ya existe en la base de datos (`inventory-service.js`, migración `ensureInventorySchema()`), ya está en el formulario de administración de inventario (`catalogo.js`), y el motor de auto-selección del servidor (`estimateMountingLayout()`, `server.js`) ya la consume con un valor por defecto de 0.125" cuando no está definida. Sin embargo:

1. El cálculo del lado del cliente (`resolveDieMetrics()` en `app.js`) **no** extrae `gap_in`, así que nunca llega a `state.form.troquel`.
2. El panel de troquel del cálculo no muestra el GAP.
3. La proforma no muestra ninguna información del troquel salvo el código.
4. No existe forma de capturar las medidas de un troquel que todavía no existe en inventario — la única alternativa manual ("Costo Externo") no captura medidas, solo costo.

## Objetivo

1. Mostrar el GAP del troquel en el panel de cálculo (cuando el troquel viene de inventario) y junto a la información del troquel en la proforma.
2. Agregar una tercera pestaña **"Troquel Nuevo"** en la sección de troquel del cálculo, que permite capturar manualmente las medidas necesarias para que el resto del cálculo funcione igual que si el troquel viniera de inventario — incluyendo GAP.

## Alcance y decisiones ya confirmadas

- El troquel capturado en "Troquel Nuevo" **no se guarda como registro de inventario** (no se crea un `troquel` en la tabla, no se le asigna código, no aparece luego en el buscador de troqueles de otras cotizaciones). Vive únicamente dentro del `uiState` de esa línea de cálculo, igual que las demás secciones editables del formulario (sustrato, planchas, etc.).
- El GAP se interpreta como el **espacio entre cavidades/etiquetas** (gap de avance, ya es la definición usada por `estimateMountingLayout()` en el servidor).

## Diseño

### 1. Exponer GAP en el cálculo (modo Inventario)

**`resolveDieMetrics(die, context)`** (`app.js`, ~línea 1707): agregar extracción de GAP igual que los demás campos:

```js
const gapIn = firstPositiveNumber(die.gapIn, die.gap_in) ; // sin fallback: 0 si no está definido
```

y agregarlo al objeto de retorno como `gapIn: r(gapIn || 0, 4)`.

Esto hace que `applyDieDefaults(dieCode)` (que ya hace `Object.assign(state.form.troquel, metricsValue)`) propague `gapIn` automáticamente a `state.form.troquel.gapIn` sin tocar esa función.

**`renderDieInventoryPanel(troquel)`** (`app.js`, ~línea 7971): agregar una métrica más a la grilla existente (`readonly-grid compact-top troquel-metrics-grid`), después de "Desarrollo":

```
Dimensiones Producto | Dimensiones Etiqueta | Ancho Troquel | Largo Troquel | Área Etiqueta | Desarrollo | GAP
```

Mostrando `${num(gapIn, 3)} in` o `-` si no está definido, igual que las demás métricas de esa grilla.

### 2. Pestaña "Troquel Nuevo"

**`DIE_MODE_OPTIONS`** (`app.js`, ~línea 29): agregar una tercera opción:

```js
const DIE_MODE_OPTIONS = [
  { key: "inventory", label: "Troquel de Inventario" },
  { key: "external", label: "Costo Externo" },
  { key: "manual", label: "Troquel Nuevo" }
];
```

`normalizeDieMode` y `dieModeOptions()` no cambian (ya iteran sobre `DIE_MODE_OPTIONS`), así que la pestaña aparece automáticamente en `renderDieModeSelector()`.

**Enrutamiento del panel** (`app.js`, ~línea 8731, dentro de `sectionBuilders.troquel`): agregar la rama `manual`:

```js
const body = dieMode === "external"
  ? `${selector}${renderDieExternalPanel(troquel)}`
  : dieMode === "inventory"
    ? `${selector}${renderDieInventoryPanel(troquel)}`
    : dieMode === "manual"
      ? `${selector}${renderDieManualPanel(troquel)}`
      : `${selector}${renderDiePendingPanel()}`;
```

El título de la tarjeta (línea ~8739) también debe mostrar `dieDescription` en modo manual, igual que en modo inventario:

```js
card("troquel", nextTitle("Troquel"),
  (dieMode === "inventory" || dieMode === "manual") ? state.form.troquel.dieDescription : "",
  dieMode === "inventory" ? null : troquel.subtotal,
  body)
```

**Nueva función `renderDieManualPanel(troquel)`**: formulario editable con `data-scope="troquel" data-field="..."`, reutilizando el mecanismo genérico de binding que ya usa el resto del formulario (`setNested(scope, field, value)` en el handler de `input`/`change`, ~línea 9479) — no requiere lógica de guardado adicional, ya viaja con `buildSavePayload()` → `uiState.troquel` como el resto de la sección.

Campos del formulario, agrupados por relevancia (determinados leyendo `metrics()` y `buildFormulaIssues()` en `app.js`, que son los que realmente consume el resto del cálculo):

| Campo | `data-field` | Requerido para el cálculo | Notas |
|---|---|---|---|
| Descripción del Troquel | `dieDescription` | No | Texto libre, se usa como título de la tarjeta |
| Ancho Troquel | `widthIn` | Sí | Alimenta planchas (laser), match de forma |
| Largo Troquel | `lengthIn` | Sí | Igual que arriba |
| Ancho Etiqueta | `productWidthIn` | No | Informativo/consistencia visual con modo inventario |
| Largo Etiqueta | `productLengthIn` | No | Igual que arriba |
| Filas | `rows` | Sí | Determina "Etiquetas al Través" (bloquea sustrato si falta) |
| Repeticiones | `repeats` | Sí | Determina "Etiquetas por repetición" y fallback de Desarrollo |
| Desarrollo del Cilindro | `cylinderDevelopmentIn` | Sí (o se autocalcula) | Si se deja en 0, el cálculo ya hace fallback a `Largo × Repeticiones` (ver `metrics()` línea 4638) |
| GAP | `gapIn` | No | El campo pedido en este trabajo |
| Elongación % | `elongationPct` | No | Afecta métricas de plancha láser |
| Dientes | `teeth` | No | Informativo |

Los campos "requeridos" no se bloquean con un modal nuevo — igual que hoy en modo inventario, si faltan, los mensajes ya existentes ("Falta Desarrollo del Cilindro en el troquel.", "Falta Cantidad de Etiquetas al Través en el troquel.") aparecen en las secciones que dependen de esos valores (sustrato, planchas), sin cambios adicionales.

`acrossCount` (usado internamente para "etiquetas al través") no es un campo de captura directa — se deriva de `rows` (mismo comportamiento que el modo inventario, ver `metrics()` línea 4645: `first(form.troquel?.acrossCount, form.troquel?.rows)`).

**Detalle importante de implementación — `widthIn`/`lengthIn` vs `mountWidthIn`/`mountLengthIn`:** cuando el troquel viene de inventario, `resolveDieMetrics()` asigna el mismo valor a ambos pares de campos (`widthIn`/`mountWidthIn` y `lengthIn`/`mountLengthIn`, líneas 1782-1787), porque distintas partes del cálculo leen uno u otro nombre: `metrics()` (fallback de Desarrollo, línea 4638-4643) lee `lengthIn`; `laserPlateMetrics()` (línea 3845-3846) prefiere `mountWidthIn`/`mountLengthIn` y solo cae a `widthIn`/`lengthIn` si faltan. Para que el modo manual funcione igual sin importar qué función consulte, el handler genérico de inputs (`app.js` ~línea 9479, donde ya existen efectos secundarios específicos de `scope === "troquel"` para `dieShape`) debe replicar el valor: al escribir en `data-field="widthIn"` también fijar `state.form.troquel.mountWidthIn` al mismo valor, e igual para `lengthIn` → `mountLengthIn`. Esto evita mantener dos inputs visuales para el mismo dato.

Estilo visual: reutiliza la clase `editable-grid` que ya usan otras secciones (ej. sustrato, `app.js` ~línea 8741) para mantener consistencia visual con el resto del formulario, en vez de crear clases CSS nuevas.

**Limpieza al cambiar de pestaña**: al pasar a "manual" no se requiere limpiar nada de inventario (el código de troquel de inventario, `dieCode`, se conserva pero deja de usarse mientras `dieMode !== "inventory"`, igual que ocurre hoy al pasar a "external").

### 3. GAP en la proforma

**`buildProformaProductSummary()`** (`server.js`, ~línea 5816): leer el `uiState` de la línea (mismo patrón ya usado en otras partes de `server.js`, ej. línea 7984: `lineRaw['Estado_UI'] || lineRaw['CODEX_UI_STATE'] || raw['Estado_UI'] || raw.ui_state || {}`) y extraer `troquel.gapIn`:

```js
const uiState = raw['Estado_UI'] || raw.ui_state || {};
const dieGapIn = parseLegacyNumber(uiState?.troquel?.gapIn) || null;
```

Agregar `dieGapIn` al objeto devuelto por la función.

**`public/proforma.js`** (~línea 483): en la línea de "Ruta" del producto, agregar el GAP junto al código de troquel:

```js
product.dieCode ? `Troquel: ${product.dieCode}${product.dieGapIn ? ` · GAP ${product.dieGapIn}"` : ''}` : ''
```

Si no hay `dieCode` pero sí hay `dieGapIn` (caso de troquel manual sin código), no se muestra nada — el troquel manual no tiene "código" por diseño (no es un registro de inventario), así que esta línea seguirá vacía para troqueles manuales a menos que se decida mostrar la descripción manual en su lugar (ver "Fuera de alcance" abajo).

### Fuera de alcance (para no sobre-construir)

- No se crea un registro de inventario desde "Troquel Nuevo" (decisión ya confirmada).
- No se agrega validación/bloqueo nuevo para los campos requeridos — se apoya en los mensajes de "Falta ..." que ya existen en las secciones dependientes.
- No se muestra el troquel manual en la proforma por código/descripción (solo el GAP si el usuario lo capturó) — mostrar la descripción manual en la línea de "Ruta" del producto de la proforma es una mejora aparte que se puede pedir después si se necesita.
- No se toca el modo "Costo Externo" existente.

## Archivos afectados

- `public/calculo-flexografia/app.js`: `resolveDieMetrics`, `DIE_MODE_OPTIONS`, `sectionBuilders.troquel`, nueva `renderDieManualPanel`, `renderDieInventoryPanel` (agregar métrica GAP).
- `server.js`: `buildProformaProductSummary`.
- `public/proforma.js`: render de la línea de producto.

## Pruebas manuales previstas

1. Seleccionar un troquel de inventario que tenga `gap_in` cargado → verificar que aparece en el panel de cálculo y, tras guardar y abrir la proforma, en la línea del producto.
2. Cambiar a "Troquel Nuevo", llenar Ancho/Largo/Filas/Repeticiones/GAP → verificar que Sustrato y Planchas dejan de mostrar "Falta ..." y calculan con esos valores.
3. Guardar la cotización, recargar la página → verificar que los valores manuales persisten (vía `uiState.troquel`).
4. Abrir la proforma de una línea con troquel manual → verificar que el GAP aparece si se capturó.
