# Pipeline de Cotizaciones (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing (fully-working, client-only) quote follow-up UI real database persistence, and surface a "Mi Pipeline de Cotizaciones" panel on the dashboard for salespeople.

**Architecture:** Add a new typed Postgres table `quote_line_tracking` (one row per quote line + milestone key), two Express endpoints to read/write it, and rewire the two existing frontend consumers (`calculo-flexografia/app.js`, `cotizaciones.js`) from `localStorage`/`raw_data` to those endpoints without touching their existing interaction logic. Add one aggregation endpoint + one dashboard section for the sales pipeline view.

**Tech Stack:** Node.js + Express (`server.js`), PostgreSQL via `pgQuery` from `./db/postgres`, vanilla JS frontend (no framework, no bundler, no test runner — this repo has no unit test suite; verification is done by running the server and calling endpoints with `curl`, per `AGENTS.md`).

## Global Constraints

- Never write new data into the `raw_data` JSONB column (typed columns only). Reading `raw_data` for backward compatibility is allowed. (AGENTS.md "NO raw_data")
- All new user-facing text (labels, messages) in Spanish.
- Preserve UTF-8 / accented characters exactly; do not touch unrelated code.
- Do not modify the existing tracking UI's interaction logic, validations, notifications, order/product creation flow — only where they read/write persisted state.
- Follow existing patterns: `pgQuery` for DB access, `runStartupSchemaStep(...)` for schema bootstrap, `fetchJson`/`getJson`/`postJson` + `sessionHeader()`/`sessionHeaders()` on the client, `try { } catch { res.status(...).json({error}) }` on Express routes.
- Backups of any file before large edits go in `backups/` per AGENTS.md naming convention (only if doing a broad rewrite of a file section — most edits here are small and don't need one).

---

## File Structure

- **Modify `server.js`**: add `ensureQuoteTrackingSchema()`, `computeQuoteLineTracking()`, `GET/POST /api/cotizaciones/:codigo/lineas/:linea/seguimiento`, `GET /api/vendedores/mi-pipeline`, remove the `raw_data['Cierre_Cotizacion']` write at (current) line 22717, register the new schema step in `initializeStartupSchemas()`.
- **Modify `public/calculo-flexografia/app.js`**: replace the `localStorage`-backed load/save functions for quote tracking with calls to the new endpoints. No changes to rendering/markup/validation functions.
- **Modify `public/cotizaciones.js`**: replace the `localStorage` read in `trackingMilestonesForRow()` with a call to the new `GET` endpoint; make `openLineTrackingModal` async.
- **Modify `public/dashboard.html`**: add the "Mi Pipeline de Cotizaciones" section markup (hidden by default) below `.dashboard-grid`.
- **Modify `public/dashboard.js`**: fetch `/api/vendedores/mi-pipeline` on load, show/populate/hide the new section.

---

### Task 1: Database schema for quote line tracking

**Files:**
- Modify: `server.js` (add function near `ensureAttachmentsSchema`, ~line 6902; register in `initializeStartupSchemas`, ~line 1866)

**Interfaces:**
- Produces: table `quote_line_tracking(id BIGSERIAL, quote_code TEXT, line_code TEXT, milestone_key TEXT, done BOOLEAN, user_name TEXT, occurred_at TIMESTAMPTZ, cr_comment TEXT, cr_by TEXT, cr_at TIMESTAMPTZ, outcome TEXT, reason TEXT, comments TEXT, order_code TEXT, updated_at TIMESTAMPTZ, UNIQUE(quote_code, line_code, milestone_key))`
- Produces: async function `ensureQuoteTrackingSchema()` — no args, no return value, safe to call every startup.

- [ ] **Step 1: Add the schema-ensure function**

Add right after `ensureAttachmentsSchema()` (which ends at line 6925, right before the closing `}` of that section — insert as a new top-level function immediately after it):

```javascript
async function ensureQuoteTrackingSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS quote_line_tracking (
            id BIGSERIAL PRIMARY KEY,
            quote_code TEXT NOT NULL,
            line_code TEXT NOT NULL,
            milestone_key TEXT NOT NULL CHECK (milestone_key IN ('solicitud', 'finalizacion', 'envio', 'cierre')),
            done BOOLEAN NOT NULL DEFAULT false,
            user_name TEXT DEFAULT '',
            occurred_at TIMESTAMPTZ,
            cr_comment TEXT DEFAULT '',
            cr_by TEXT DEFAULT '',
            cr_at TIMESTAMPTZ,
            outcome TEXT CHECK (outcome IN ('accepted', 'rejected', 'expired') OR outcome IS NULL),
            reason TEXT DEFAULT '',
            comments TEXT DEFAULT '',
            order_code TEXT DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (quote_code, line_code, milestone_key)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_quote_line_tracking_line ON quote_line_tracking(quote_code, line_code)`);
}
```

- [ ] **Step 2: Register it in the startup sequence**

In `initializeStartupSchemas()` (~line 1866), add a new line right after the `ensureAttachmentsSchema()` step:

```javascript
    await runStartupSchemaStep('No fue posible preparar el esquema de seguimiento de cotizaciones', () => ensureQuoteTrackingSchema());
```

- [ ] **Step 3: Verify the table is created**

```bash
$env:PGPASSWORD = "Calg.1984"
node server.js
```

In another terminal:

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "\d quote_line_tracking"
```

Expected: table description printed with the 15 columns above, and the unique constraint. Stop the server (Ctrl+C) after confirming.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add quote_line_tracking schema for quote follow-up persistence"
```

---

### Task 2: Backend — compute + GET endpoint for a line's tracking state

**Files:**
- Modify: `server.js` (add helper + route near the other `/api/cotizaciones/:codigo/lineas/:linea/...` routes, e.g. right before line 15903 `adjuntos` GET)

**Interfaces:**
- Consumes: `getQuoteLineContext(quoteCode, lineCode)` (existing, returns `{ quote, line }` where `line.raw_data` holds SAP fields like `raw_data['SOLICITUD ESTADO']`, `raw_data['TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR']`, etc. — same fields already read by `quoteTrackingDefaults()` client-side).
- Consumes: table from Task 1.
- Produces: async function `computeQuoteLineTracking(quoteCode, lineCode)` → `Promise<{ milestones: Array<{key,label,done,user,date,cr:{comment,by,date}|null}>, closure: {outcome,reason,comments,orderCode,by,at}|null }>`. Reused by Task 3 (POST) and Task 6 (dashboard aggregation reads the same table directly by SQL, not this function).
- Produces: route `GET /api/cotizaciones/:codigo/lineas/:linea/seguimiento` → `res.json(computeQuoteLineTracking(...) result)`.

- [ ] **Step 1: Add `computeQuoteLineTracking`**

Insert after `getQuoteLineContext` (ends at server.js line 9678):

```javascript
const QUOTE_TRACKING_MILESTONE_ORDER = ['solicitud', 'finalizacion', 'envio', 'cierre'];

function quoteTrackingAutoState(quote, line) {
    const raw = line?.raw_data || {};
    const sellerName = line?.salesperson_name || raw.VENDEDOR || raw['VENDEDOR | USUARIO'] || quote?.salesperson_name || 'Vendedor';
    const status = String(raw['SOLICITUD ESTADO'] || raw['ESTADO LINEA'] || quote?.status || '').trim().toLowerCase();
    const quoteDone = ['cotizada', 'finalizada', 'proforma', 'enviada', 'cerrada', 'produccion', 'producción'].some((token) => status.includes(token));
    const requestDone = ['pendiente', 'solicitud', 'vendedor', 'cotiz', 'finaliz', 'proforma', 'enviad', 'cerrad'].some((token) => status.includes(token))
        || String(raw['TRAZABILIDAD | SOLICITUD VENDEDOR'] || '').trim().toLowerCase() === 'si';
    return {
        sellerName,
        solicitud: {
            done: requestDone,
            user: requestDone ? (raw['TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR'] || sellerName) : '',
            date: requestDone ? (raw['TRAZABILIDAD | FECHA SOLICITUD VENDEDOR'] || raw['TRAZABILIDAD | FECHA'] || '') : ''
        },
        finalizacion: {
            done: quoteDone,
            user: quoteDone ? sellerName : '',
            date: quoteDone ? (raw['FECHA CREACION DATE'] || raw['FECHA CREACION'] || '') : ''
        }
    };
}

async function computeQuoteLineTracking(quoteCode, lineCode) {
    const context = await getQuoteLineContext(quoteCode, lineCode);
    const auto = quoteTrackingAutoState(context.quote, context.line);
    const storedResult = await pgQuery(
        `SELECT milestone_key, done, user_name, occurred_at, cr_comment, cr_by, cr_at, outcome, reason, comments, order_code
           FROM quote_line_tracking
          WHERE quote_code = $1 AND line_code = $2`,
        [quoteCode, lineCode]
    );
    const storedByKey = new Map(storedResult.rows.map((row) => [row.milestone_key, row]));

    const milestones = QUOTE_TRACKING_MILESTONE_ORDER.map((key) => {
        const stored = storedByKey.get(key);
        if (stored) {
            return {
                key,
                done: stored.done,
                user: stored.user_name || '',
                date: stored.occurred_at ? stored.occurred_at.toISOString() : '',
                cr: stored.cr_comment ? { comment: stored.cr_comment, by: stored.cr_by || '', date: stored.cr_at ? stored.cr_at.toISOString() : '' } : null
            };
        }
        if (key === 'solicitud') return { key, done: auto.solicitud.done, user: auto.solicitud.user, date: auto.solicitud.date, cr: null };
        if (key === 'finalizacion') return { key, done: auto.finalizacion.done, user: auto.finalizacion.user, date: auto.finalizacion.date, cr: null };
        return { key, done: false, user: '', date: '', cr: null };
    });

    const cierreRow = storedByKey.get('cierre');
    const closure = cierreRow && cierreRow.outcome
        ? { outcome: cierreRow.outcome, reason: cierreRow.reason || '', comments: cierreRow.comments || '', orderCode: cierreRow.order_code || '', by: cierreRow.user_name || '', at: cierreRow.occurred_at ? cierreRow.occurred_at.toISOString() : '' }
        : null;

    return { milestones, closure };
}
```

- [ ] **Step 2: Add the GET route**

Insert right before the `adjuntos` GET route (server.js line 15903):

```javascript
app.get('/api/cotizaciones/:codigo/lineas/:linea/seguimiento', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const result = await computeQuoteLineTracking(codigo, linea);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el seguimiento de la línea.' });
    }
});
```

- [ ] **Step 3: Verify with curl**

```bash
node server.js
```

In another terminal (replace `C-000019`/`LC308561` with a real quote/line from the local DB, per AGENTS.md testing instructions):

```bash
curl.exe "http://localhost:3000/api/cotizaciones/C-000019/lineas/LC308561/seguimiento"
```

Expected: JSON with `milestones` (4 items: solicitud, finalizacion, envio, cierre) and `closure: null`. Stop the server after confirming.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add GET endpoint to compute quote line tracking state"
```

---

### Task 3: Backend — POST endpoint to mark/undo/request changes/close a milestone

**Files:**
- Modify: `server.js` (add route right after the GET route from Task 2)

**Interfaces:**
- Consumes: `getRequestUserName(req, fallback)` (existing, server.js:4374) to resolve the acting user's display name from the `x-erp-session` header.
- Consumes: `QUOTE_TRACKING_MILESTONE_ORDER`, `computeQuoteLineTracking` (Task 2).
- Produces: route `POST /api/cotizaciones/:codigo/lineas/:linea/seguimiento` — body `{ milestoneKey: 'solicitud'|'finalizacion'|'envio'|'cierre', action: 'complete'|'undo'|'request-changes'|'close', comment?, outcome?, reason?, comments?, orderCode? }` → returns the same shape as GET (recomputed state).

- [ ] **Step 1: Add the POST route**

```javascript
app.post('/api/cotizaciones/:codigo/lineas/:linea/seguimiento', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const payload = req.body || {};
        const milestoneKey = String(payload.milestoneKey || '').trim();
        const action = String(payload.action || '').trim();
        if (!QUOTE_TRACKING_MILESTONE_ORDER.includes(milestoneKey)) {
            return res.status(400).json({ error: 'Hito de seguimiento inválido.' });
        }
        const actingUser = getRequestUserName(req, 'Vendedor');
        const keyIndex = QUOTE_TRACKING_MILESTONE_ORDER.indexOf(milestoneKey);
        const keysFromHere = QUOTE_TRACKING_MILESTONE_ORDER.slice(keyIndex);

        if (action === 'complete') {
            await pgQuery(
                `INSERT INTO quote_line_tracking (quote_code, line_code, milestone_key, done, user_name, occurred_at, cr_comment, cr_by, cr_at, updated_at)
                 VALUES ($1, $2, $3, true, $4, NOW(), '', '', NULL, NOW())
                 ON CONFLICT (quote_code, line_code, milestone_key) DO UPDATE SET
                    done = true, user_name = EXCLUDED.user_name, occurred_at = NOW(), cr_comment = '', cr_by = '', cr_at = NULL, updated_at = NOW()`,
                [codigo, linea, milestoneKey, actingUser]
            );
        } else if (action === 'undo') {
            await pgQuery(
                `DELETE FROM quote_line_tracking WHERE quote_code = $1 AND line_code = $2 AND milestone_key = ANY($3::text[])`,
                [codigo, linea, keysFromHere]
            );
        } else if (action === 'request-changes') {
            const comment = String(payload.comment || '').trim();
            if (!comment) return res.status(400).json({ error: 'El comentario de la solicitud de cambios es obligatorio.' });
            await pgQuery(
                `DELETE FROM quote_line_tracking WHERE quote_code = $1 AND line_code = $2 AND milestone_key = ANY($3::text[])`,
                [codigo, linea, keysFromHere]
            );
            await pgQuery(
                `INSERT INTO quote_line_tracking (quote_code, line_code, milestone_key, done, user_name, cr_comment, cr_by, cr_at, updated_at)
                 VALUES ($1, $2, $3, false, '', $4, $5, NOW(), NOW())`,
                [codigo, linea, milestoneKey, comment, actingUser]
            );
        } else if (action === 'close') {
            if (milestoneKey !== 'cierre') return res.status(400).json({ error: 'El cierre solo aplica al hito de Finalización Comercial.' });
            const outcome = String(payload.outcome || '').trim();
            if (!['accepted', 'rejected', 'expired'].includes(outcome)) {
                return res.status(400).json({ error: 'Resultado de cierre inválido.' });
            }
            await pgQuery(
                `INSERT INTO quote_line_tracking (quote_code, line_code, milestone_key, done, user_name, occurred_at, outcome, reason, comments, order_code, updated_at)
                 VALUES ($1, $2, 'cierre', true, $3, NOW(), $4, $5, $6, $7, NOW())
                 ON CONFLICT (quote_code, line_code, milestone_key) DO UPDATE SET
                    done = true, user_name = EXCLUDED.user_name, occurred_at = NOW(), outcome = EXCLUDED.outcome, reason = EXCLUDED.reason, comments = EXCLUDED.comments, order_code = EXCLUDED.order_code, updated_at = NOW()`,
                [codigo, linea, actingUser, outcome, String(payload.reason || ''), String(payload.comments || ''), String(payload.orderCode || '')]
            );
        } else {
            return res.status(400).json({ error: 'Acción de seguimiento inválida.' });
        }

        const result = await computeQuoteLineTracking(codigo, linea);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible actualizar el seguimiento de la línea.' });
    }
});
```

- [ ] **Step 2: Verify with curl (mark "envio" as sent, then undo)**

```bash
node server.js
```

```bash
curl.exe -X POST "http://localhost:3000/api/cotizaciones/C-000019/lineas/LC308561/seguimiento" -H "Content-Type: application/json" -d "{\"milestoneKey\":\"envio\",\"action\":\"complete\"}"
```

Expected: JSON where the `envio` milestone has `done: true` and a `user`/`date`.

```bash
curl.exe -X POST "http://localhost:3000/api/cotizaciones/C-000019/lineas/LC308561/seguimiento" -H "Content-Type: application/json" -d "{\"milestoneKey\":\"envio\",\"action\":\"undo\"}"
```

Expected: `envio` back to `done: false`.

Then clean up any leftover rows created by this manual test:

```bash
$env:PGPASSWORD = "Calg.1984"
psql -U postgres -d printlab -h localhost -c "DELETE FROM quote_line_tracking WHERE quote_code = 'C-000019' AND line_code = 'LC308561'"
```

Stop the server after confirming.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add POST endpoint to mark/undo/close quote line tracking milestones"
```

---

### Task 4: Backend — remove the deprecated raw_data write for Cierre_Cotizacion

**Files:**
- Modify: `server.js:22717` (exact line may have shifted after Tasks 1-3 inserted code earlier in the file — search for `rawData['Cierre_Cotizacion']` to locate it)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this is a deletion only.

- [ ] **Step 1: Confirm the line and its context**

```bash
grep -n "Cierre_Cotizacion" server.js
```

Expected: one write site (`rawData['Cierre_Cotizacion'] = payload.trackingClosure || null;`) inside the line-save handler, plus the `CODEX_QUOTE_CLOSURE` mapping entry (line ~10234) — leave the mapping entry alone, it is unrelated field-name metadata.

- [ ] **Step 2: Delete the write**

Remove this block (found via the `if` guard around it):

```javascript
        if (Object.prototype.hasOwnProperty.call(payload, 'trackingClosure')) {
            rawData['Cierre_Cotizacion'] = payload.trackingClosure || null;
        }
```

- [ ] **Step 3: Verify the server still starts and line-save still works**

```bash
node server.js
```

```bash
curl.exe -X POST "http://localhost:3000/api/cotizaciones/C-000019/lineas/LC308561/producto" -H "Content-Type: application/json" -d "{}"
```

Expected: no error (same behavior as before — this endpoint doesn't depend on `trackingClosure`). Stop the server after confirming.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "fix: stop writing tracking closure into deprecated raw_data column"
```

---

### Task 5: Frontend — wire calculo-flexografia/app.js to the backend

**Files:**
- Modify: `public/calculo-flexografia/app.js`

**Interfaces:**
- Consumes: `GET /api/cotizaciones/:codigo/lineas/:linea/seguimiento`, `POST /api/cotizaciones/:codigo/lineas/:linea/seguimiento` (Tasks 2-3).
- Consumes: existing `getJson(url, options)` (line 2782), `postJson(url, body)` (line 2820), `sessionHeaders()` (line ~2812).
- Produces: same public behavior as before for every existing caller — `loadQuoteTrackingMilestones()` keeps returning an array of 5 items (`creacion` + the 4 backend keys) with the same field names (`key,label,icon,user,date,done,fixed,canCR,cr,...`) so `renderQuoteTracking()` and everything else in the file needs zero changes.

- [ ] **Step 1: Replace `loadQuoteTrackingMilestones` to fetch from the backend**

Replace the current localStorage-based body (server.js lines 540-579 in the earlier read, i.e. `public/calculo-flexografia/app.js`) with:

```javascript
async function loadQuoteTrackingMilestones() {
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  const defaults = quoteTrackingDefaults();
  if (!quoteCode || !lineCode) return defaults;
  let remote;
  try {
    remote = await getJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/seguimiento`, { headers: sessionHeaders() });
  } catch (error) {
    return defaults;
  }
  state.quoteTracking.closure = remote.closure || null;
  const remoteByKey = new Map((remote.milestones || []).map((item) => [item.key, item]));
  return defaults.map((item) => {
    const remoteItem = remoteByKey.get(item.key);
    if (!remoteItem) return item;
    return { ...item, done: remoteItem.done, user: remoteItem.user || item.user, date: remoteItem.date || item.date, cr: remoteItem.cr };
  });
}
```

Because this function becomes `async`, update its one call site, `renderQuoteTracking()` (line 7015-7021):

```javascript
async function renderQuoteTracking() {
  if (!els.quoteTrackingMount || !state.form) return;
  const trackingId = quoteTrackingStorageId();
  if (state.quoteTracking.id !== trackingId || !Array.isArray(state.quoteTracking.milestones) || !state.quoteTracking.milestones.length) {
    state.quoteTracking.id = trackingId;
    state.quoteTracking.milestones = await loadQuoteTrackingMilestones();
  }
  /* ...rest of the function is unchanged... */
```

And its own caller, `renderDetailsDemo()` (line 7109: `renderQuoteTracking();`), must `await` it:

```javascript
  await renderQuoteTracking();
```

This requires `renderDetailsDemo` to be `async` too — check its signature at line 7107 (`function renderDetailsDemo(baseResult = totals())`) and change it to `async function renderDetailsDemo(baseResult = totals())`. Then check every call site of `renderDetailsDemo(` in the file and prefix awaited calls with `await` where they are already inside an `async function`; where a caller is not `async`, wrap the call in `renderDetailsDemo(...).catch(() => {})` instead of blocking — do not convert unrelated synchronous call chains to async just for this.

- [ ] **Step 2: Replace `saveQuoteTrackingMilestones` — delete it, and call the POST action inline at each mutation site instead**

Delete the old `saveQuoteTrackingMilestones()` function (localStorage writer). Its 4 call sites become POST calls with the specific action, each awaited before re-rendering:

In `completeQuoteTrackingMilestone(index)` (line 694), replace the body from `markQuoteTrackingItemDone(item);` through `saveQuoteTrackingMilestones();` with:

```javascript
async function completeQuoteTrackingMilestone(index) {
  const item = state.quoteTracking.milestones?.[index];
  if (!item || !quoteTrackingAvailable(index)) return;
  if (["envio", "cierre"].includes(item.key) && await showQuoteProformaBlockMessageIfNeeded()) return;
  if (item.key === "envio") {
    await closeProformaForCurrentQuote("tracking_sent");
  }
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  await postJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/seguimiento`, { milestoneKey: item.key, action: "complete" });
  markQuoteTrackingItemDone(item);
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  renderDetailsDemo(totals());
  scheduleSave();
  if (["finalizacion", "envio", "cierre"].includes(item.key)) {
    notifyQuoteTrackingEvent({ ...item }, "marca").catch(() => showCenterMessage("No fue posible enviar la notificación."));
  }
}
```

In `undoQuoteTrackingMilestone(index)` (line 712), it is currently synchronous; make it `async` and add the POST before the existing loop finishes (after computing `reverted` but before mutating in-memory state — the server call itself doesn't need the reverted list, only the milestone key being undone):

```javascript
async function undoQuoteTrackingMilestone(index) {
  const item = state.quoteTracking.milestones?.[index];
  if (!item) return;
  const { quoteCode, lineCode } = currentQuoteLineIdentity();
  await postJson(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/seguimiento`, { milestoneKey: item.key, action: "undo" });
  const reverted = (state.quoteTracking.milestones || [])
    .slice(index)
    .filter((entry) => entry?.done && !entry.fixed)
    .map((entry) => ({ ...entry }));
  for (let i = state.quoteTracking.milestones.length - 1; i >= index; i -= 1) {
    const entry = state.quoteTracking.milestones[i];
    if (entry?.fixed) continue;
    entry.done = false;
    entry.user = null;
    entry.date = null;
    entry.formOpen = false;
  }
  state.quoteTracking.formOpenKey = "";
  syncLineStatusFromTracking();
  renderDetailsDemo(totals());
  scheduleSave();
  reverted.forEach((entry) => {
    notifyQuoteTrackingEvent(entry, "reversion").catch(() => showCenterMessage("No fue posible enviar la notificación."));
  });
  if (reverted.some((entry) => entry.key === "envio")) {
    reopenProformaForCurrentQuote().catch(() => showCenterMessage("No fue posible reabrir la proforma."));
  }
}
```

Its call site (line ~9130-9132, inside `handleTrackingClick`) currently calls it synchronously:

```javascript
    const undo = event.target.closest("[data-tracking-undo]");
    if (undo) {
      undoQuoteTrackingMilestone(Number(undo.dataset.trackingUndo));
      return;
    }
```

Change to fire-and-forget with error surfacing, matching the pattern used for `complete` right above it:

```javascript
    const undo = event.target.closest("[data-tracking-undo]");
    if (undo) {
      const done = setTrackingButtonLoading(undo, "Deshaciendo...");
      undoQuoteTrackingMilestone(Number(undo.dataset.trackingUndo)).catch((error) => {
        showCenterMessage(error.message || "No fue posible deshacer el hito.");
      }).finally(done);
      return;
    }
```

In `submitQuoteTrackingChange(index)` (line 750), replace `saveQuoteTrackingMilestones();` with a POST call using `action: "request-changes"`, placed right before it:

```javascript
  const { quoteCode: qc, lineCode: lc } = currentQuoteLineIdentity();
  await postJson(`/api/cotizaciones/${encodeURIComponent(qc)}/lineas/${encodeURIComponent(lc)}/seguimiento`, { milestoneKey: item.key, action: "request-changes", comment: value });
```

(Insert this immediately before `state.quoteTracking.formOpenKey = "";` in that function, keeping the rest of the function body unchanged.)

In `submitQuoteClosureReason(index)` (line 817), locate its body (read it first — it wasn't fully shown above) and replace its persistence call with `action: "close"`, sending `{ outcome, reason, comments }` gathered from the same form fields it already reads (`quoteTrackingCloseReason`, `quoteTrackingCloseComments`) plus `orderCode: state.quoteTracking.closure?.orderCode || ''`.

- [ ] **Step 3: Manual verification in the browser**

Start the app (`node server.js`), open a quote line in `calculo-flexografia` that has "Finalización de Cotización" done, open the Seguimiento panel, click "Marcar como enviada" on Envío de Proforma, and confirm:
- The button shows a loading state, then the milestone shows as done with your user name and a timestamp.
- Reload the page — the milestone stays done (this is the actual fix; previously a private-window reload would have kept it via localStorage, but a different browser would not — verify by opening the same quote line in a different browser or an incognito window and confirming the milestone is done there too).
- Click "Deshacer" — it reverts back to pending.

- [ ] **Step 4: Commit**

```bash
git add public/calculo-flexografia/app.js
git commit -m "feat: persist quote line tracking milestones to backend instead of localStorage"
```

---

### Task 6: Frontend — cotizaciones.js reads real tracking state

**Files:**
- Modify: `public/cotizaciones.js`

**Interfaces:**
- Consumes: `GET /api/cotizaciones/:codigo/lineas/:linea/seguimiento` (Task 2), existing `fetchJson(url, options)`.
- Produces: `trackingMilestonesForRow(row)` becomes `async`; `openLineTrackingModal(row)` becomes `async`.

- [ ] **Step 1: Replace the localStorage read in `trackingMilestonesForRow`**

Current function (lines 2448-2472) builds `defaults` then merges `stored = readQuoteTrackingStore()[...]`. Replace the merge source:

```javascript
async function trackingMilestonesForRow(row = {}) {
    const raw = row.rawData || {};
    const session = readUserSession() || {};
    const sellerName = row.lineSummary?.salesperson_name || raw.VENDEDOR || raw['VENDEDOR | USUARIO'] || 'Vendedor';
    const currentUser = session.name || session.fullName || session.username || session.user || sellerName || 'Usuario';
    const status = normalizeProformaIssueText(row.estado || raw['ESTADO LINEA'] || raw['SOLICITUD ESTADO']);
    const quoteDone = ['cotizada', 'finalizada', 'proforma', 'enviada', 'cerrada', 'produccion'].some((item) => status.includes(item));
    const requestDone = ['pendiente', 'solicitud', 'vendedor', 'cotiz', 'finaliz', 'proforma', 'enviad', 'cerrad'].some((item) => status.includes(item))
        || normalizeProformaIssueText(raw['TRAZABILIDAD | SOLICITUD VENDEDOR']) === 'si';
    const requestUser = requestDone ? (raw['TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR'] || sellerName) : '';
    const requestDate = requestDone ? (raw['TRAZABILIDAD | FECHA SOLICITUD VENDEDOR'] || raw['TRAZABILIDAD | FECHA'] || '') : '';
    const defaults = [
        { key: 'creacion', label: 'Creación', user: sellerName, date: formatDate(row.lineSummary?.created_on || raw['FECHA CREACION DATE'] || raw['FECHA CREACION']), done: true },
        { key: 'solicitud', label: 'Solicitud del vendedor', user: requestUser, date: requestDate, done: requestDone },
        { key: 'finalizacion', label: 'Finalización de cotización', user: quoteDone ? currentUser : '', date: quoteDone ? formatDateTimeShort(Date.now()) : '', done: quoteDone },
        { key: 'envio', label: 'Envío de proforma', user: '', date: '', done: false },
        { key: 'cierre', label: 'Finalización comercial', user: '', date: '', done: false }
    ];
    const quoteCode = row.quoteId || '';
    const lineCode = row.linea || '';
    if (!quoteCode || !lineCode) return defaults;
    let remote;
    try {
        remote = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/seguimiento`, { headers: sessionHeader() });
    } catch (error) {
        return defaults;
    }
    const remoteByKey = new Map((remote.milestones || []).map((item) => [item.key, item]));
    return defaults.map((item) => {
        const remoteItem = remoteByKey.get(item.key);
        if (!remoteItem) return item;
        return { ...item, done: remoteItem.done, user: remoteItem.user || item.user, date: remoteItem.date || item.date };
    });
}
```

(`QUOTES_ENDPOINT` is already defined at the top of this file as `const QUOTES_ENDPOINT = '/api/cotizaciones';` — reuse it as shown above.)

- [ ] **Step 2: Make `openLineTrackingModal` async and await the new async function**

Current (lines 2474-2495):

```javascript
function openLineTrackingModal(row) {
    const milestones = trackingMilestonesForRow(row);
    ...
```

Change to:

```javascript
async function openLineTrackingModal(row) {
    const milestones = await trackingMilestonesForRow(row);
    ...
```

Its only call site (line 3169, `if (action === 'tracking') return openLineTrackingModal(row);`) is already inside `async function handleQuoteLineAction(...)` and already `return`s the call, so the promise propagates correctly with no further change needed there.

- [ ] **Step 3: Manual verification**

Start the server, open Cotizaciones, open a line whose "Envío de Proforma" was marked in Task 5's verification step, click the tracking/seguimiento action for that line, and confirm the modal now shows "Envío de proforma" as done with the same user/date shown in `calculo-flexografia`.

- [ ] **Step 4: Commit**

```bash
git add public/cotizaciones.js
git commit -m "fix: cotizaciones seguimiento modal reads real tracking state from backend"
```

---

### Task 7: Backend — vendedor pipeline aggregation endpoint

**Files:**
- Modify: `server.js` (add route near other `/api/vendedores` or salesperson-related routes if any exist — otherwise add near the quote routes)

**Interfaces:**
- Consumes: `readErpSessionFromRequest(req)` (existing, server.js:4363) for `username`.
- Consumes: `admin_users.sap_salesperson_code`, `admin_users.sap_salesperson_name`, `quotes.salesperson_name`, `quote_line_tracking`.
- Produces: route `GET /api/vendedores/mi-pipeline` → `{ isVendedor: boolean, salespersonName: string, counts: { pendiente, finalizadaSinEnviar, enviada, aceptada, rechazada, expirada }, pendientes: Array<{quoteCode, lineCode, customerName, jobName, stage}> }`.

- [ ] **Step 1: Add the route**

```javascript
app.get('/api/vendedores/mi-pipeline', async (req, res) => {
    try {
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

        const quotesResult = await pgQuery(
            `SELECT q.quote_code, q.customer_name, t.line_code, t.milestone_key, t.done, t.outcome
               FROM quotes q
               LEFT JOIN quote_line_tracking t ON t.quote_code = q.quote_code
              WHERE q.salesperson_name = $1`,
            [salespersonName]
        );

        const byLine = new Map();
        for (const row of quotesResult.rows) {
            const lineKey = `${row.quote_code}::${row.line_code || 'sin-linea'}`;
            if (!byLine.has(lineKey)) {
                byLine.set(lineKey, { quoteCode: row.quote_code, customerName: row.customer_name || '', lineCode: row.line_code || '', envioDone: false, cierreDone: false, outcome: null });
            }
            const entry = byLine.get(lineKey);
            if (row.milestone_key === 'envio' && row.done) entry.envioDone = true;
            if (row.milestone_key === 'cierre' && row.done) { entry.cierreDone = true; entry.outcome = row.outcome; }
        }

        const counts = { pendiente: 0, finalizadaSinEnviar: 0, enviada: 0, aceptada: 0, rechazada: 0, expirada: 0 };
        const pendientes = [];
        for (const entry of byLine.values()) {
            if (!entry.lineCode) continue;
            let stage;
            if (entry.cierreDone && entry.outcome === 'accepted') { stage = 'aceptada'; counts.aceptada += 1; }
            else if (entry.cierreDone && entry.outcome === 'rejected') { stage = 'rechazada'; counts.rechazada += 1; }
            else if (entry.cierreDone && entry.outcome === 'expired') { stage = 'expirada'; counts.expirada += 1; }
            else if (entry.envioDone) { stage = 'enviada'; counts.enviada += 1; pendientes.push({ quoteCode: entry.quoteCode, lineCode: entry.lineCode, customerName: entry.customerName, stage }); }
            else { stage = 'pendiente'; counts.pendiente += 1; }
        }

        res.json({ isVendedor: true, salespersonName, counts, pendientes: pendientes.slice(0, 8) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el pipeline de ventas.' });
    }
});
```

- [ ] **Step 2: Verify with curl**

```bash
node server.js
```

```bash
curl.exe "http://localhost:3000/api/vendedores/mi-pipeline" -H "x-erp-session: {\"username\":\"jesquiv\"}"
```

Expected: `{"isVendedor":false,...}` if `jesquiv` has no `sap_salesperson_code` in `admin_users`, or a populated pipeline if it does. Confirm the shape matches the spec above either way. Stop the server after confirming.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add vendedor pipeline aggregation endpoint"
```

---

### Task 8: Frontend — "Mi Pipeline de Cotizaciones" dashboard section

**Files:**
- Modify: `public/dashboard.html` (add section markup after the closing `</section>` of `.dashboard-grid`, still inside `#dashboardHome`)
- Modify: `public/dashboard.js` (fetch + render + show/hide)

**Interfaces:**
- Consumes: `GET /api/vendedores/mi-pipeline` (Task 7), existing `sessionHeaders()` (dashboard.js:465).
- Produces: nothing consumed elsewhere — this is the final UI surface.

- [ ] **Step 1: Add the section markup**

In `public/dashboard.html`, immediately after the `</section>` that closes `class="dashboard-grid"` (the one containing the `dashboard-card` buttons), add:

```html
                <section id="dashboardSalesPipeline" class="dashboard-sales-pipeline" hidden>
                    <h2 class="dashboard-section-title">Mi Pipeline de Cotizaciones</h2>
                    <div id="dashboardSalesPipelineCounts" class="dashboard-sales-pipeline-counts"></div>
                    <div id="dashboardSalesPipelineList" class="dashboard-sales-pipeline-list"></div>
                </section>
```

- [ ] **Step 2: Add fetch + render logic**

In `public/dashboard.js`, add near the other post-login initialization calls (search for where `dashboardHome`/`dashboard-grid` gets populated or where other fetches run after `activeUserSession` is set, and add a call to a new `loadSalesPipeline()` there). Add the function itself anywhere after `sessionHeaders()` (line 465-473):

```javascript
const SALES_PIPELINE_STAGE_LABELS = {
    pendiente: 'Pendientes',
    finalizadaSinEnviar: 'Finalizadas sin enviar',
    enviada: 'Enviadas · esperando respuesta',
    aceptada: 'Aceptadas',
    rechazada: 'Rechazadas',
    expirada: 'Expiradas'
};

async function loadSalesPipeline() {
    const section = document.getElementById('dashboardSalesPipeline');
    const countsMount = document.getElementById('dashboardSalesPipelineCounts');
    const listMount = document.getElementById('dashboardSalesPipelineList');
    if (!section || !countsMount || !listMount) return;
    try {
        const response = await fetch('/api/vendedores/mi-pipeline', { headers: sessionHeaders() });
        const payload = await response.json();
        if (!response.ok || !payload.isVendedor) {
            section.hidden = true;
            return;
        }
        section.hidden = false;
        countsMount.innerHTML = Object.entries(SALES_PIPELINE_STAGE_LABELS).map(([key, label]) => {
            const value = Number(payload.counts?.[key] || 0);
            return `<div class="dashboard-sales-pipeline-tile"><span class="dashboard-sales-pipeline-tile-value">${value}</span><span class="dashboard-sales-pipeline-tile-label">${label}</span></div>`;
        }).join('');
        const pendientes = Array.isArray(payload.pendientes) ? payload.pendientes : [];
        listMount.innerHTML = pendientes.length
            ? pendientes.map((item) => `<a class="dashboard-sales-pipeline-row" href="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}" data-route="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}"><span>${item.quoteCode} · ${item.customerName || 'Sin cliente'}</span><span>${SALES_PIPELINE_STAGE_LABELS[item.stage] || item.stage}</span></a>`).join('')
            : '<p class="dashboard-sales-pipeline-empty">No hay cotizaciones pendientes de acción.</p>';
    } catch (error) {
        section.hidden = true;
    }
}
```

Find the spot in `dashboard.js` where `activeUserSession` is confirmed set and the dashboard home view finishes its initial render (search for where `dashboard-grid` cards get their click handlers wired, or a top-level `async function initDashboard()`/similar bootstrap function), and add `loadSalesPipeline();` there (fire-and-forget, no `await` needed since it manages its own visibility).

- [ ] **Step 3: Minimal styling**

Check `public/styles.css` for the `.dashboard-grid`/`.dashboard-card` rules (used as the visual reference) and add matching rules using the same design tokens (colors/spacing variables) already used by those classes — do not introduce new colors or a different visual language. At minimum: `.dashboard-sales-pipeline` (block spacing matching `.dashboard-grid`'s margin), `.dashboard-sales-pipeline-counts` (flex/grid row of tiles, mirroring existing card spacing), `.dashboard-sales-pipeline-tile`, `.dashboard-sales-pipeline-row` (list row, reuse existing link/hover styling patterns from nearby components), `.dashboard-sales-pipeline-empty`.

- [ ] **Step 4: Manual verification in the browser**

- As a user with `sap_salesperson_code` set and at least one quote via that `salesperson_name`, log in and confirm the section appears below the module buttons with correct counts and clickable rows.
- As a user without `sap_salesperson_code` (e.g. an admin), confirm the section does not appear at all.

- [ ] **Step 5: Commit**

```bash
git add public/dashboard.html public/dashboard.js public/styles.css
git commit -m "feat: add Mi Pipeline de Cotizaciones section to sales dashboard"
```

---

### Task 9: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full flow test**

With the server running, using a real quote/line that has "Finalización de Cotización" already done (per SAP status):
1. Open it in `calculo-flexografia`, mark "Envío de Proforma" as sent.
2. Mark "Finalización Comercial" as Aceptada, confirm, then create the production order from the resulting buttons — confirm this still works exactly as before (no regression).
3. Open the same line's Seguimiento modal from `cotizaciones.js` and confirm it shows the same final state (Aceptada, with the order code linked).
4. Reload both pages and confirm state persists.
5. Log in as the salesperson tied to that quote (or temporarily set `sap_salesperson_code`/`sap_salesperson_name` on a test `admin_users` row to match the quote's `salesperson_name`) and confirm the dashboard's "Mi Pipeline de Cotizaciones" reflects the "aceptada" count.

- [ ] **Step 2: Report results**

Report exactly what was tested, what passed, and anything that could not be verified (e.g. if no test quote had `sap_salesperson_code` configured, say so explicitly rather than assuming the dashboard section works).
