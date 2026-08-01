# Fase 1: Persistencia del Seguimiento de Cotizaciones + Panel "Mi Pipeline" en Dashboard

## Contexto

El proyecto necesita, a largo plazo, un panel completo de ventas (leads, pipeline de cotizaciones, seguimiento de órdenes de producción, entregas a tiempo, vistos buenos, metas). Ese alcance se dividió en 4 subproyectos independientes:

1. **Pipeline de Cotizaciones** ← esta fase
2. Leads/Prospectos
3. Seguimiento de Órdenes de Producción (proceso, entregas a tiempo/tarde, vistos buenos, faltantes)
4. Metas y Desempeño de Vendedores

Este documento cubre únicamente el subproyecto 1.

## Hallazgo clave

La funcionalidad de seguimiento de cotización (hitos: Creación → Solicitud del Vendedor → Finalización de Cotización → Envío de Proforma → Finalización Comercial, con aceptar/rechazar/expirar, solicitar cambios, deshacer, crear orden, registrar producto) **ya está completamente implementada y funcional** en `public/calculo-flexografia/app.js` (líneas ~415-9159). No se debe rehacer ni modificar su lógica de interacción.

El problema: toda esa información vive en `localStorage` del navegador (clave `erp-flexo-quote-tracking`), excepto el resultado final del cierre comercial, que se escribe parcialmente en la columna `raw_data` de la línea (`rawData['Cierre_Cotizacion']`, `server.js:22717`) — columna que `AGENTS.md` marca como **deprecada, sin nuevas escrituras permitidas**.

Consecuencias del estado actual:
- El seguimiento no es visible entre dispositivos/usuarios distintos (cada navegador tiene su propia copia).
- El modal de solo-lectura en `public/cotizaciones.js` (función `trackingMilestonesForRow`, líneas ~2448-2472) muestra "Envío de proforma" y "Finalización comercial" siempre como pendientes, porque lee del mismo localStorage que nunca se llenó desde ese contexto.
- No hay forma de construir un panel de dashboard que agregue estos datos, porque no existen en la base de datos.

## Alcance de esta fase

**Se construye:**
1. Tabla nueva en Postgres para persistir el estado real de los hitos.
2. Endpoints GET/POST para leer y marcar hitos.
3. `calculo-flexografia/app.js`: sustituir las funciones de lectura/escritura de `localStorage` por llamadas a los endpoints nuevos. La UI y las reglas de negocio (qué hito habilita cuál, validaciones antes de enviar proforma, etc.) **no cambian**.
4. `cotizaciones.js`: su modal de seguimiento de solo lectura pasa a consultar el mismo endpoint GET, en lugar de `localStorage`.
5. Eliminar la escritura a `rawData['Cierre_Cotizacion']` en `server.js:22717` (queda redundante y viola la regla de no escribir en `raw_data`). La lectura de ese campo como *fallback* histórico se mantiene donde ya existe (`calculo-flexografia/app.js:544` y `:5967`), para no romper el cierre de cotizaciones antiguas creadas antes de esta migración.
6. Nueva sección **"Mi Pipeline de Cotizaciones"** en `public/dashboard.html`/`dashboard.js`, debajo de la cuadrícula de módulos actual, visible solo para usuarios con `sap_salesperson_code` asignado (vendedores).

**Explícitamente fuera de esta fase:**
- Leads/prospectos.
- Vista de jefatura/gerencial (ver cotizaciones de otros vendedores, cambiar de vendedor). Requiere primero agregar una marca de "jefatura" a `admin_users`, que no existe hoy — se abordará en una fase posterior.
- Seguimiento de producción, entregas a tiempo/tarde, vistos buenos.
- Metas y cuotas de venta.
- Cualquier cambio a la lógica de creación de orden de producción o registro de producto (ya funcionan, no se tocan).

## Modelo de datos

Nueva tabla `quote_line_tracking`:

```sql
CREATE TABLE quote_line_tracking (
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quote_code, line_code, milestone_key)
);
CREATE INDEX quote_line_tracking_quote_idx ON quote_line_tracking (quote_code, line_code);
```

Notas:
- El hito `creacion` no se persiste aquí: ya se deriva de datos existentes de la cotización (fecha de creación, vendedor), igual que hoy.
- `outcome`, `reason`, `comments`, `order_code` solo aplican a la fila `milestone_key = 'cierre'`.
- `cr_comment`/`cr_by`/`cr_at` guardan la última "solicitud de cambios" activa sobre ese hito (si el hito se vuelve a marcar `done`, se limpia, igual que en la lógica actual del cliente).

## Endpoints nuevos

- `GET /api/cotizaciones/:quoteCode/lineas/:lineCode/seguimiento`
  Devuelve el arreglo de hitos (auto-derivados + guardados) en el mismo shape que hoy consume `renderQuoteTracking()` en el cliente.

- `POST /api/cotizaciones/:quoteCode/lineas/:lineCode/seguimiento`
  Body: `{ milestoneKey, action: 'complete' | 'undo' | 'request-changes' | 'close', ...datos según action }`.
  Hace upsert en `quote_line_tracking`. Al deshacer (`undo`) un hito, también deshace los posteriores (misma regla que hoy en `undoQuoteTrackingMilestone`).

Ambos respetan el sistema de permisos por módulo (`cotizaciones`) ya existente en `access-control.js`.

## Cambios en frontend

**`public/calculo-flexografia/app.js`**:
- `loadQuoteTrackingMilestones()` → `GET` al endpoint nuevo en vez de leer `localStorage`; conserva el fallback a `raw_data.Cierre_Cotizacion` solo para registros antiguos sin fila en la tabla nueva.
- `saveQuoteTrackingMilestones()` y los handlers (`completeQuoteTrackingMilestone`, `undoQuoteTrackingMilestone`, `submitQuoteTrackingChange`, `submitQuoteClosureReason`) → `POST` al endpoint nuevo en el punto donde hoy llaman a `saveQuoteTrackingMilestones()`.
- Se elimina el uso de `QUOTE_TRACKING_STORAGE_KEY`/`localStorage` para este dato.
- El resto de la lógica (validaciones, notificaciones, creación de orden/producto) permanece intacta.

**`public/cotizaciones.js`**:
- `trackingMilestonesForRow()` deja de leer `readQuoteTrackingStore()` (localStorage) y consulta el `GET` nuevo (con caché simple en memoria mientras el modal está abierto, igual que ya cachea líneas de cotización).

**`server.js`**:
- Se elimina la línea `rawData['Cierre_Cotizacion'] = payload.trackingClosure || null;` (línea 22717) y el campo `trackingClosure` del payload de guardado de línea deja de usarse ahí (el cierre ahora se guarda vía el endpoint POST de seguimiento).

## Nueva sección en Dashboard

`public/dashboard.html` + `dashboard.js`: sección **"Mi Pipeline de Cotizaciones"** debajo de `dashboard-grid`, visible solo si `session.sapSalespersonCode` existe.

Contenido:
- 4-5 tarjetas de conteo: Pendientes (sin solicitud/finalización), Finalizada sin enviar, Enviada (esperando respuesta), Aceptadas (mes actual), Rechazadas/Expiradas (mes actual).
- Lista corta (5-8 filas) de cotizaciones que requieren acción del vendedor (finalizada pero no enviada, o enviada hace más de N días sin cierre), cada una con enlace a la cotización.

Fuente de datos: `GET /api/vendedores/mi-pipeline` (nuevo endpoint) — agrega `quotes` + `quote_line_tracking` filtrando por el vendedor de la sesión (cruce por `sap_salesperson_code` ↔ `quotes.salesperson_name`, igual criterio que ya usa el resto del sistema para vincular vendedor-cotización).

## Pruebas

- Marcar cada hito (solicitud ya viene de SAP, finalización, envío, cierre con los 3 outcomes) desde `calculo-flexografia` y confirmar que persiste recargando la página y desde otro navegador/sesión.
- Confirmar que el modal de seguimiento en `cotizaciones.js` refleja el mismo estado.
- Confirmar que deshacer un hito revierte los posteriores, igual que hoy.
- Confirmar que crear orden de producción y registrar producto siguen funcionando sin cambios.
- Verificar que una cotización cerrada antes de esta migración (con datos solo en `raw_data.Cierre_Cotizacion`) se sigue mostrando correctamente vía el fallback.
- Verificar que el panel del dashboard solo aparece para usuarios con `sap_salesperson_code`, y que solo muestra cotizaciones propias.
