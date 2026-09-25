# Filtros rápidos y vendedor en Cotizaciones — Implementation Plan

> **For agentic workers:** Execute inline in this session (no test framework exists in this repo — verification is manual/visual per project testing rules).

**Goal:** En `/cotizaciones`, agregar filtros rápidos (Dependientes/Aprobadas) y el nombre del vendedor bajo el cliente, visibles solo para Cotizadores/Implementadores/Vendedores-Cotizadores.

**Architecture:** Todo cliente-side. Reutiliza `quoteStatusInfo()` y el campo `salesperson_name` que ya vienen en `quoteCatalog`. Sin cambios de API/BD.

**Tech Stack:** HTML/CSS/vanilla JS existentes en `public/cotizaciones.html`, `public/cotizaciones.js`, `public/styles.css`.

## Global Constraints

- Campos/labels en español, Title Case ("Dependientes", "Aprobadas", "Vendedor").
- No modificar el endpoint `/api/cotizaciones` ni `loadQuotes()`.
- No agregar botón "Cotizar" nuevo (confirmado innecesario en el spec).
- El grupo `Vendedores` (sin "Cotizadores" en el nombre) no debe ver los nuevos elementos.
- No dejar espacio en blanco/hueco si `salesperson_name` está vacío.

---

### Task 1: Helper de permisos + estado de filtro + lógica de filtrado

**Files:**
- Modify: `public/cotizaciones.js:186-221` (junto a `readUserSession`/`canCreateModule`)
- Modify: `public/cotizaciones.js:3201-3206` (`getFilteredQuotes`)

**Interfaces:**
- Produces: `canSeeCotizadorSeguimiento(): boolean`, variable módulo `quotesQuickFilter` (valores `'todas' | 'dependientes' | 'aprobadas'`), `setQuotesQuickFilter(value: string): void`.

- [ ] **Step 1: Agregar el helper de permisos**

Insertar después de `canCreateModule` (public/cotizaciones.js, tras la función que termina en línea 221):

```js
function canSeeCotizadorSeguimiento() {
    const session = readUserSession();
    const permissionName = String(session?.permissionName || '').trim();
    return /administrador(?:es)?|implementador(?:es)?|emergencia|cotizador(?:es)?/i.test(permissionName);
}
```

- [ ] **Step 2: Agregar estado del filtro rápido**

Cerca de las demás variables de módulo (junto a `let quoteSortState` u otra `let` de estado de la tabla — buscar con `grep -n "^let quote"` si no es evidente), agregar:

```js
let quotesQuickFilter = 'todas';

function setQuotesQuickFilter(value) {
    quotesQuickFilter = value === 'dependientes' || value === 'aprobadas' ? value : 'todas';
    renderQuotesTable(getFilteredQuotes());
    updateQuotesQuickFilterButtons();
}
```

- [ ] **Step 3: Actualizar `getFilteredQuotes` para aplicar el filtro rápido**

Reemplazar el cuerpo actual (public/cotizaciones.js:3201-3206):

```js
function getFilteredQuotes() {
    const term = normalizeText(quotesSearchInput?.value).toLowerCase();
    let items = term
        ? quoteCatalog.filter((item) => [item.quote_code, item.customer_code, item.customer_name, item.contact_name, item.salesperson_name]
            .some((value) => String(value || '').toLowerCase().includes(term)))
        : quoteCatalog;
    if (canSeeCotizadorSeguimiento() && quotesQuickFilter !== 'todas') {
        const wantedState = quotesQuickFilter === 'dependientes' ? 'unsent' : 'pending';
        items = items.filter((item) => quoteStatusInfo(item).state === wantedState);
    }
    return items;
}
```

- [ ] **Step 4: Verificación manual (consola del navegador)**

Con la app corriendo y sesión de un usuario del grupo Cotizadores, en la consola del navegador en `/cotizaciones`:

```js
canSeeCotizadorSeguimiento() // debe devolver true
setQuotesQuickFilter('dependientes'); getFilteredQuotes().every(q => quoteStatusInfo(q).state === 'unsent') // debe devolver true
setQuotesQuickFilter('todas');
```

Con un usuario del grupo Vendedores (sin "Cotizadores"), `canSeeCotizadorSeguimiento()` debe devolver `false`.

- [ ] **Step 5: Commit**

No commitear — el usuario indicó que por ahora no se debe subir nada a git en esta sesión.

---

### Task 2: Fila de botones de filtro rápido (HTML + estilos + wiring)

**Files:**
- Modify: `public/cotizaciones.html:389-398` (entre `.quote-browser-search-row` y la tabla)
- Modify: `public/cotizaciones.js:4837` (`bindEvents`, agregar listeners de los botones)
- Modify: `public/cotizaciones.js` (agregar `updateQuotesQuickFilterButtons` y llamarla desde `init()`)
- Modify: `public/styles.css` (agregar estilos `.quote-quickfilter-*` cerca de `.quote-master-info-block`, línea ~12689)

**Interfaces:**
- Consumes: `canSeeCotizadorSeguimiento()` y `setQuotesQuickFilter(value)` de Task 1.
- Produces: función `updateQuotesQuickFilterButtons(): void` (sincroniza clase `is-active` y visibilidad del contenedor).

- [ ] **Step 1: Agregar el HTML de los botones**

En `public/cotizaciones.html`, insertar esta nueva fila entre el cierre de `.quote-browser-search-row` (línea 398) y `.scroll-bottom-indicator-host` (línea 399):

```html
<div id="quotesQuickFilterRow" class="quote-quickfilter-row" hidden>
<button type="button" class="quote-quickfilter-btn is-active" data-quick-filter="todas">Todas</button>
<button type="button" class="quote-quickfilter-btn" data-quick-filter="dependientes">Dependientes</button>
<button type="button" class="quote-quickfilter-btn" data-quick-filter="aprobadas">Aprobadas</button>
</div>
```

- [ ] **Step 2: Agregar estilos**

En `public/styles.css`, después del bloque `.quote-master-info-arrow` (alrededor de la línea 12689), agregar:

```css
.quote-quickfilter-row {
    display: flex;
    gap: 8px;
    padding: 8px 0 2px;
    flex-wrap: wrap;
}

.quote-quickfilter-btn {
    padding: 6px 14px;
    border: 1px solid var(--app-border, #d6e3eb);
    border-radius: 999px;
    background: var(--app-surface, #fff);
    color: var(--app-text-muted, #5c6a76);
    font-size: 13px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: all .12s;
}

.quote-quickfilter-btn:hover {
    background: var(--app-bg-soft, #f1f5f9);
    color: var(--app-text, #102337);
}

.quote-quickfilter-btn.is-active {
    background: var(--app-text, #102337);
    border-color: var(--app-text, #102337);
    color: var(--app-surface, #fff);
}

.quote-master-info-vendor {
    display: block;
    font-size: 11px;
    color: var(--app-text-muted, #8a96a4);
    font-weight: 600;
    margin-top: 2px;
}
```

Si el proyecto ya usa otros nombres de variables CSS en este archivo (`--app-border`, `--app-surface`, etc. no existieran), usar `grep -n "var(--app-" public/styles.css | head -5` para confirmar los nombres reales antes de pegar el bloque, y ajustarlos si difieren.

- [ ] **Step 3: Agregar `updateQuotesQuickFilterButtons` y llamarla en `init()`**

En `public/cotizaciones.js`, cerca de `setQuotesQuickFilter` (Task 1, Step 2), agregar:

```js
function updateQuotesQuickFilterButtons() {
    const row = document.getElementById('quotesQuickFilterRow');
    if (!row) return;
    row.hidden = !canSeeCotizadorSeguimiento();
    row.querySelectorAll('.quote-quickfilter-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.quickFilter === quotesQuickFilter);
    });
}
```

Buscar la función `async function init()` (public/cotizaciones.js:5596) y agregar la llamada `updateQuotesQuickFilterButtons();` justo después de la primera carga de `loadQuotes()` dentro de esa función (revisar con `grep -n "await loadQuotes" public/cotizaciones.js` para ubicar la línea exacta y colocarla inmediatamente después).

- [ ] **Step 4: Wiring de clicks en `bindEvents()`**

En `public/cotizaciones.js`, dentro de `bindEvents()` (línea 4837), junto al listener de `quotesSearchInput` (línea 4844-4849), agregar:

```js
document.getElementById('quotesQuickFilterRow')?.addEventListener('click', (event) => {
    const btn = event.target.closest('.quote-quickfilter-btn');
    if (!btn) return;
    setQuotesQuickFilter(btn.dataset.quickFilter);
});
```

- [ ] **Step 5: Verificación visual**

Abrir `/cotizaciones` en el navegador con un usuario Cotizadores/Implementadores: la fila de botones debe aparecer, "Todas" activa por defecto, y al hacer clic en "Dependientes"/"Aprobadas" la tabla debe filtrarse y el botón correspondiente marcarse activo. Con un usuario Vendedores (sin "Cotizadores" en el permiso), la fila no debe aparecer.

- [ ] **Step 6: Commit**

No commitear — mismo criterio que Task 1.

---

### Task 3: Nombre del vendedor bajo el cliente en la columna Detalles

**Files:**
- Modify: `public/cotizaciones.js:2696-2713` (`renderQuoteParentRow`)

**Interfaces:**
- Consumes: `canSeeCotizadorSeguimiento()` de Task 1, `item.salesperson_name` (ya presente en cada fila de `quoteCatalog`).

- [ ] **Step 1: Agregar la línea del vendedor en la celda de Detalles**

En `public/cotizaciones.js`, dentro de `renderQuoteParentRow` (línea 2696 en adelante), justo después de la línea 2691 (`const customerName = item.customer_name || '';`), agregar:

```js
const salespersonName = item.salesperson_name || '';
const showVendorLine = canSeeCotizadorSeguimiento() && salespersonName;
```

Y modificar el bloque de la celda `<td class="quote-master-td-info">` (líneas 2707-2713) de:

```html
            <td class="quote-master-td-info">
                <div class="quote-master-info-block">
                    <span class="quote-master-info-name">${escapeHtml(customerName)}</span>
                    ${customerCode ? `<span class="quote-master-info-code">${escapeHtml(customerCode)}</span>` : ''}
                    <span class="quote-status-chip" data-state="${escapeHtml(statusInfo.state)}">${escapeHtml(statusInfo.label)}</span>
                </div>
            </td>
```

a:

```html
            <td class="quote-master-td-info">
                <div class="quote-master-info-block">
                    <span class="quote-master-info-name">${escapeHtml(customerName)}</span>
                    ${customerCode ? `<span class="quote-master-info-code">${escapeHtml(customerCode)}</span>` : ''}
                    <span class="quote-status-chip" data-state="${escapeHtml(statusInfo.state)}">${escapeHtml(statusInfo.label)}</span>
                </div>
                ${showVendorLine ? `<span class="quote-master-info-vendor">Vendedor: ${escapeHtml(salespersonName)}</span>` : ''}
            </td>
```

- [ ] **Step 2: Verificación visual**

En `/cotizaciones` con usuario Cotizadores: cada fila debe mostrar "Vendedor: {nombre}" en una segunda línea debajo del bloque cliente/código/estado, sin romper el wrap del bloque superior. Con usuario Vendedores, esa línea no debe aparecer. Filas sin `salesperson_name` no deben dejar espacio vacío.

- [ ] **Step 3: Commit**

No commitear — mismo criterio que Task 1 y 2.

---

## Verificación final (manual, todas las tasks)

1. Levantar el servidor (`node server.js` o el flujo de preview del proyecto).
2. Iniciar sesión como un usuario del grupo **Cotizadores** (o **Implementadores**) y abrir `/cotizaciones`:
   - Aparecen los 3 botones de filtro rápido.
   - Cada fila muestra el nombre del vendedor bajo el cliente.
   - "Dependientes" muestra solo cotizaciones con chip "No enviado"; "Aprobadas" muestra solo las de chip "Solicitada"; "Todas" quita el filtro.
   - El buscador de texto sigue funcionando combinado con el filtro activo.
3. Iniciar sesión como un usuario del grupo **Vendedores** (sin "Cotizadores" en el permiso) y abrir `/cotizaciones`:
   - No aparecen los botones de filtro.
   - No aparece el nombre del vendedor bajo el cliente.
   - El resto de la página funciona igual que antes.
4. Confirmar que no se rompió el layout de la tabla (columnas, ancho, scroll) para ningún usuario.
