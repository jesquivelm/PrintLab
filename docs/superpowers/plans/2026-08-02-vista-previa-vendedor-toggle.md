# Toggle "Modo Vista Vendedor" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let implementadores/administradores toggle a "vista vendedor" mode from the dashboard's floating button, so they can preview the "Mi Pipeline de Cotizaciones" section with any real vendedor's data, without impersonating a session.

**Architecture:** A new floating-button action (visible only to super-permission sessions) toggles a client-side boolean stored in `sessionStorage`. When active, the existing `#dashboardSalesPipeline` section gains a vendedor `<select>` and a preview banner, and its data comes from the existing `GET /api/vendedores/mi-pipeline` endpoint via a new optional `salespersonCode` query parameter — honored server-side only when the caller's session permission matches the same super-permission pattern already used elsewhere in the app.

**Tech Stack:** Node.js + Express (`server.js`), PostgreSQL via `pgQuery`, vanilla JS frontend (`public/dashboard.js`, `public/dashboard.html`, `public/styles.css`). No unit test framework in this project — verify manually via running server + curl + browser, per project convention.

## Global Constraints

- All new user-facing text in Spanish.
- Preserve UTF-8/accented characters exactly; do not touch unrelated code.
- This is a preview-only tool: it must never change `session`, `modules`/permissions, or any other module's behavior. Only this dashboard section is affected.
- The `salespersonCode` override on `mi-pipeline` must be checked **server-side** — trusting a client-side gate alone would let anyone see another vendedor's pipeline by editing the request.
- Reuse the existing super-permission pattern (`/administrador(?:es)?|implementador(?:es)?|emergencia/i` against `permissionName`) — do not invent a new permission concept, and do not modify `isSuperAdminPermissionName` (server.js:4333) since other routes depend on its current (narrower) behavior.
- Follow existing patterns: `pgQuery` for DB access, try/catch + `res.status(...).json({error})` on routes, `escapeHtml` for any DB-sourced string inserted into the DOM, the existing `actionIconsMap`/`globalActions` pattern in `public/dashboard.js` for the floating-button action, and the existing `.dashboard-sales-pipeline*` CSS tokens in `public/styles.css` for any new styling (no invented colors).

---

## File Structure

- **Modify `server.js`**: add `isImplementerPermissionName(value)` helper near `isSuperAdminPermissionName` (line 4333); modify `GET /api/vendedores/mi-pipeline` (line 16098) to accept an optional `salespersonCode` query param.
- **Modify `public/dashboard.js`**: add a `toggle-vendor-view` floating-button action gated by the existing `hasSuperPermission()` (line 142); add `viewAsVendorMode`/`viewAsVendorCode` state with `sessionStorage` persistence; rewrite `loadSalesPipeline()` (line 484) to branch on that state, populate a vendor `<select>`, and show a preview banner.
- **Modify `public/dashboard.html`**: add the (hidden-by-default) preview banner and vendor `<select>` inside `#dashboardSalesPipeline` (after line 80).
- **Modify `public/styles.css`**: add CSS for the new banner and select, reusing the existing `.dashboard-sales-pipeline*` tokens.

---

### Task 1: Backend — permission-gated `salespersonCode` override

**Files:**
- Modify: `server.js:4333` area (add helper function)
- Modify: `server.js:16098-16112` (the `mi-pipeline` route's salesperson lookup)

**Interfaces:**
- Consumes: `readErpSessionFromRequest(req)` (existing, returns parsed `x-erp-session` header with `.username`/`.permissionName`), `sanitizeAdminUserText` (existing).
- Produces: `function isImplementerPermissionName(value)` → `boolean`. Query param `salespersonCode` on `GET /api/vendedores/mi-pipeline` — when present and the caller's session permission matches, the response's `salespersonName`/`counts`/`pendientes` describe that salesperson instead of the caller's own.

- [ ] **Step 1: Add the permission helper**

Insert immediately after `isSuperAdminPermissionName` (server.js, ends at line 4336):

```javascript
function isImplementerPermissionName(value) {
    return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(sanitizeAdminUserText(value));
}
```

- [ ] **Step 2: Add the override branch to the route**

Replace the current salesperson-lookup block in `GET /api/vendedores/mi-pipeline` (server.js:16100-16111):

```javascript
        const session = readErpSessionFromRequest(req);
        const username = String(session?.username || '').trim();
        if (!username) return res.json({ isVendedor: false, salespersonName: '', counts: {}, pendientes: [] });

        const userResult = await pgQuery(
            `SELECT sap_salesperson_code, sap_salesperson_name FROM admin_users WHERE username = $1 LIMIT 1`,
            [username]
        );
        const salespersonName = userResult.rows[0]?.sap_salesperson_name || '';
        if (!userResult.rows[0]?.sap_salesperson_code || !salespersonName) {
            return res.json({ isVendedor: false, salespersonName: '', counts: {}, pendientes: [] });
        }
```

with:

```javascript
        const session = readErpSessionFromRequest(req);
        const username = String(session?.username || '').trim();
        if (!username) return res.json({ isVendedor: false, salespersonName: '', counts: {}, pendientes: [] });

        const requestedCode = Number(req.query?.salespersonCode);
        const canOverrideSalesperson = Number.isFinite(requestedCode) && requestedCode > 0 && isImplementerPermissionName(session?.permissionName);

        const salespersonResult = canOverrideSalesperson
            ? await pgQuery(
                `SELECT sap_salesperson_code, sap_salesperson_name FROM admin_users WHERE sap_salesperson_code = $1::bigint LIMIT 1`,
                [requestedCode]
            )
            : await pgQuery(
                `SELECT sap_salesperson_code, sap_salesperson_name FROM admin_users WHERE username = $1 LIMIT 1`,
                [username]
            );
        const salespersonName = salespersonResult.rows[0]?.sap_salesperson_name || '';
        if (!salespersonResult.rows[0]?.sap_salesperson_code || !salespersonName) {
            return res.json({ isVendedor: false, salespersonName: '', counts: {}, pendientes: [] });
        }
```

(The rest of the route — the `quotesResult` query and everything after it — is unchanged; it already only depends on the local `salespersonName` variable.)

- [ ] **Step 3: Verify — non-implementer's override attempt is ignored**

```bash
node server.js
```

```bash
curl.exe -s "http://localhost:3000/api/vendedores/mi-pipeline?salespersonCode=51" -H "x-erp-session: {\"username\":\"jesquiv\",\"permissionName\":\"Vendedor\"}"
```

Expected: same response as calling without `salespersonCode` (i.e. `jesquiv`'s own — likely `isVendedor:false`, since `jesquiv` has no `sap_salesperson_code` per earlier phase's testing), proving the param was ignored because `permissionName` doesn't match the super-permission pattern.

- [ ] **Step 4: Verify — implementer's override is honored**

Find a real `sap_salesperson_code` to test with:

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "SELECT sap_salesperson_code, sap_salesperson_name FROM admin_users WHERE sap_salesperson_code IS NOT NULL LIMIT 3"
```

Use one of the returned codes (call it `<code>`):

```bash
curl.exe -s "http://localhost:3000/api/vendedores/mi-pipeline?salespersonCode=<code>" -H "x-erp-session: {\"username\":\"jesquiv\",\"permissionName\":\"Implementador\"}"
```

Expected: `isVendedor:true` and `salespersonName` matching that code's `sap_salesperson_name` from the psql query — even though `jesquiv` itself has no `sap_salesperson_code`. This proves the override works when the permission matches.

Stop the server after confirming (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: allow implementer-permission sessions to preview another vendedor's pipeline"
```

---

### Task 2: Frontend — floating-button toggle + dashboard selector

**Files:**
- Modify: `public/dashboard.html` (add banner + select markup inside `#dashboardSalesPipeline`, after line 80)
- Modify: `public/dashboard.js` (floating-button action, state, `loadSalesPipeline()` rewrite)
- Modify: `public/styles.css` (new banner/select styles)

**Interfaces:**
- Consumes: `hasSuperPermission()` (existing, `public/dashboard.js:142`), `sessionHeaders()` (existing, line 465), `escapeHtml` (existing), `renderBdfg()` (existing, line 1796), the `salespersonCode` query param added in Task 1.
- Consumes: `GET /api/admin-users` (existing) — response items include `sapSalespersonCode` (number|null) and `sapSalespersonName`/`name` (strings), per `normalizeAdminUserRecord` in server.js.
- Produces: module-level state `viewAsVendorMode` (boolean) and `viewAsVendorCode` (string, numeric salesperson code or `''`), readable/writable only within `dashboard.js`. Produces `refreshSalesPipelineSection()` — the new entry point that replaces direct calls to `loadSalesPipeline()`.

- [ ] **Step 1: Add the banner + select markup**

In `public/dashboard.html`, inside `#dashboardSalesPipeline` (after the `<h2>` at line 80, before the counts `<div>` at line 81):

```html
                    <div id="dashboardSalesPipelinePreviewBanner" class="dashboard-sales-pipeline-preview-banner" hidden>
                        <span>Vista de prueba — viendo como vendedor</span>
                        <select id="dashboardSalesPipelineVendorSelect" class="dashboard-sales-pipeline-vendor-select"></select>
                    </div>
```

- [ ] **Step 2: Add module-level state and sessionStorage helpers**

In `public/dashboard.js`, immediately after `const SALES_PIPELINE_STAGE_LABELS = {...}` (ends at line 482), add:

```javascript
const VIEW_AS_VENDOR_MODE_KEY = 'erp-view-as-vendor-mode';
const VIEW_AS_VENDOR_CODE_KEY = 'erp-view-as-vendor-code';
let viewAsVendorMode = sessionStorage.getItem(VIEW_AS_VENDOR_MODE_KEY) === '1';
let viewAsVendorCode = sessionStorage.getItem(VIEW_AS_VENDOR_CODE_KEY) || '';
let viewAsVendorOptionsCache = null;

function persistViewAsVendorState() {
    sessionStorage.setItem(VIEW_AS_VENDOR_MODE_KEY, viewAsVendorMode ? '1' : '');
    sessionStorage.setItem(VIEW_AS_VENDOR_CODE_KEY, viewAsVendorCode || '');
}

async function loadVendorOptionsForPreview() {
    if (viewAsVendorOptionsCache) return viewAsVendorOptionsCache;
    try {
        const response = await fetch('/api/admin-users', { headers: sessionHeaders() });
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : [];
        viewAsVendorOptionsCache = items
            .filter((user) => Number(user.sapSalespersonCode) > 0)
            .map((user) => ({ code: String(user.sapSalespersonCode), name: user.sapSalespersonName || user.name || `Vendedor ${user.sapSalespersonCode}` }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } catch (error) {
        viewAsVendorOptionsCache = [];
    }
    return viewAsVendorOptionsCache;
}

function toggleViewAsVendorMode() {
    viewAsVendorMode = !viewAsVendorMode;
    if (!viewAsVendorMode) viewAsVendorCode = '';
    persistViewAsVendorState();
    renderBdfg();
    refreshSalesPipelineSection();
}
```

- [ ] **Step 3: Add the floating-button action**

In `getBdfgActions()` (function starting at line 1192), inside the `globalActions` array literal (ends at line 1230), add a new entry right after the `theme` entry (before the closing `];`):

```javascript
        ...(hasSuperPermission() ? [{
            id: 'toggle-vendor-view',
            label: viewAsVendorMode ? 'Salir de vista vendedor' : 'Ver como vendedor',
            description: 'Alternar la vista de prueba del pipeline de un vendedor',
            callback: toggleViewAsVendorMode
        }] : [])
```

(This spreads a 0-or-1-element array into `globalActions`, so the action simply doesn't exist for non-super-permission sessions — matching how `contextualActions` is conditionally built elsewhere in the same function.)

- [ ] **Step 4: Add the icon mapping**

In `renderBdfgRadialMenu()` (starts at line 1843), inside the `actionIconsMap` object literal (starts at line 1865), add an entry alongside the existing `theme` entry:

```javascript
        'toggle-vendor-view': viewAsVendorMode
            ? { key: 'dashboardFabVendorViewActive', literalFallback: '🧑‍💼', color: '#c79b18', size: 20 }
            : { key: 'dashboardFabVendorView', literalFallback: '👁', color: '#5f7392', size: 20 },
```

- [ ] **Step 5: Rewrite `loadSalesPipeline()` into `refreshSalesPipelineSection()`**

Replace the entire `loadSalesPipeline()` function (`public/dashboard.js:484-508`) with:

```javascript
async function renderVendorSelectForPreview() {
    const select = document.getElementById('dashboardSalesPipelineVendorSelect');
    const banner = document.getElementById('dashboardSalesPipelinePreviewBanner');
    if (!select || !banner) return;
    banner.hidden = false;
    const options = await loadVendorOptionsForPreview();
    if (!options.length) {
        select.innerHTML = '<option value="">Sin vendedores disponibles</option>';
        viewAsVendorCode = '';
        persistViewAsVendorState();
        return;
    }
    if (!viewAsVendorCode || !options.some((option) => option.code === viewAsVendorCode)) {
        viewAsVendorCode = options[0].code;
        persistViewAsVendorState();
    }
    select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.code)}"${option.code === viewAsVendorCode ? ' selected' : ''}>${escapeHtml(option.name)}</option>`).join('');
}

async function refreshSalesPipelineSection() {
    const section = document.getElementById('dashboardSalesPipeline');
    const countsMount = document.getElementById('dashboardSalesPipelineCounts');
    const listMount = document.getElementById('dashboardSalesPipelineList');
    const banner = document.getElementById('dashboardSalesPipelinePreviewBanner');
    if (!section || !countsMount || !listMount || !banner) return;

    if (!viewAsVendorMode) {
        banner.hidden = true;
    } else {
        await renderVendorSelectForPreview();
    }

    try {
        const url = viewAsVendorMode && viewAsVendorCode
            ? `/api/vendedores/mi-pipeline?salespersonCode=${encodeURIComponent(viewAsVendorCode)}`
            : '/api/vendedores/mi-pipeline';
        const response = await fetch(url, { headers: sessionHeaders() });
        const payload = await response.json();
        if (!response.ok || !payload.isVendedor) {
            section.hidden = !viewAsVendorMode;
            if (!viewAsVendorMode) return;
            countsMount.innerHTML = '';
            listMount.innerHTML = '<p class="dashboard-sales-pipeline-empty">No fue posible cargar el pipeline de este vendedor.</p>';
            return;
        }
        section.hidden = false;
        countsMount.innerHTML = Object.entries(SALES_PIPELINE_STAGE_LABELS).map(([key, label]) => {
            const value = Number(payload.counts?.[key] || 0);
            return `<div class="dashboard-sales-pipeline-tile"><span class="dashboard-sales-pipeline-tile-value">${value}</span><span class="dashboard-sales-pipeline-tile-label">${label}</span></div>`;
        }).join('');
        const pendientes = Array.isArray(payload.pendientes) ? payload.pendientes : [];
        listMount.innerHTML = pendientes.length
            ? pendientes.map((item) => `<a class="dashboard-sales-pipeline-row" href="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}" data-route="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}"><span>${escapeHtml(item.quoteCode)} · ${escapeHtml(item.customerName || 'Sin cliente')}</span><span>${escapeHtml(SALES_PIPELINE_STAGE_LABELS[item.stage] || item.stage)}</span></a>`).join('')
            : '<p class="dashboard-sales-pipeline-empty">No hay cotizaciones pendientes de acción.</p>';
    } catch (error) {
        section.hidden = !viewAsVendorMode;
    }
}
```

Note the behavior change from the Fase 1 version: when `viewAsVendorMode` is active, the section stays visible (with an empty/error state) even if the fetch fails, instead of hiding — so the implementer always sees the preview UI they just turned on, rather than it silently vanishing.

- [ ] **Step 6: Wire the select's change handler and update the bootstrap call site**

Near the other one-time event bindings in `public/dashboard.js` (find where other `document.getElementById(...).addEventListener(...)` top-level bindings are set up, e.g. near `bindBdfg()` around line 3056), add:

```javascript
document.getElementById('dashboardSalesPipelineVendorSelect')?.addEventListener('change', (event) => {
    viewAsVendorCode = event.target.value || '';
    persistViewAsVendorState();
    refreshSalesPipelineSection();
});
```

Replace the bootstrap call `loadSalesPipeline();` (line 3066) with `refreshSalesPipelineSection();`.

- [ ] **Step 7: Add CSS for the banner and select**

In `public/styles.css`, find the existing `.dashboard-sales-pipeline-*` rules (added in the Fase 1 plan) and add, reusing the same custom properties already used by those rules (e.g. `--app-border`, `--app-surface-soft`, `--app-text-muted`, `--app-primary` — read the existing rules first to confirm exact token names in use):

```css
.dashboard-sales-pipeline-preview-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: 12px;
    border-radius: 10px;
    border: 1px dashed var(--app-border-strong, var(--app-border));
    background: var(--app-surface-soft);
    color: var(--app-text-muted);
    font-size: 13px;
}

.dashboard-sales-pipeline-vendor-select {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--app-border);
    background: var(--app-surface);
    color: var(--app-text);
    font-size: 13px;
}
```

- [ ] **Step 8: Verify — syntax and static serving**

```bash
node --check public/dashboard.js
```

Expected: no output (pass).

```bash
node server.js
```

```bash
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard.js
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/styles.css
```

Expected: `200` for all three. Stop the server after confirming.

- [ ] **Step 9: Commit**

```bash
git add public/dashboard.html public/dashboard.js public/styles.css
git commit -m "feat: add vendor-preview toggle to dashboard floating button"
```

---

### Task 3: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full flow test in a real browser**

With the server running and a real `sap_salesperson_code` value available (per Task 1 Step 4):

1. Log in as a user whose `permissionName` matches the super-permission pattern (e.g. `jesquiv`, per `AGENTS.md`'s test credentials — confirm their actual `permission_name` value first via `psql -c "SELECT full_name, permission_name FROM admin_users u LEFT JOIN admin_permissions p ON p.id = u.permission_id WHERE u.username='jesquiv'"`; if it doesn't match, temporarily point their `permission_id` at one that does, or pick another test user that already qualifies, and revert afterward).
2. Open the dashboard, open the floating button's radial menu, confirm "Ver como vendedor" is present.
3. Click it. Confirm the "Mi Pipeline de Cotizaciones" section appears (it wasn't visible before, since this user isn't a real vendedor) with the preview banner and a populated `<select>`, defaulting to the alphabetically-first vendedor.
4. Change the `<select>` to a different vendedor and confirm the counts/list refresh to that vendedor's real data.
5. Click the floating-button action again (now labeled "Salir de vista vendedor") and confirm the section hides again and the banner/select disappear.
6. Reload the page mid-preview (before step 5) and confirm the mode and selected vendedor survive the reload (via `sessionStorage`).
7. Log in as a normal vendedor account (or a non-super-permission account) and confirm the "Ver como vendedor" floating-button action is **not** present in their menu.

- [ ] **Step 2: Report results**

Report exactly what was tested, what passed, and anything that could not be verified.
