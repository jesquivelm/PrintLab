# Toggle "Modo Vista Vendedor" para Implementadores

## Contexto

En la Fase 1 del proyecto de panel de ventas ([spec](2026-08-01-pipeline-cotizaciones-vendedor-design.md)) se agregó la sección "Mi Pipeline de Cotizaciones" al dashboard, visible solo para usuarios vendedores (con `sap_salesperson_code` configurado). Los implementadores/administradores nunca la ven, porque no son vendedores — lo que dificulta probar y dar soporte sobre esa sección.

Esta fase agrega una herramienta temporal de control/pruebas: un toggle en el botón flotante que le permite a un implementador **ver** esa sección con los datos de cualquier vendedor real, sin suplantar su sesión ni tocar permisos de ningún otro módulo.

**Explícitamente fuera de alcance:** la vista de "Jefe de Ventas" (KPIs agregados de todos los vendedores) mencionada en la conversación de diseño queda para una fase futura y separada — requiere su propio diseño de qué indicadores mostrar.

## Diseño

### 1. Botón flotante — toggle de 2 estados

- Nueva acción en el arreglo `globalActions` de `getBdfgActions()` (`public/dashboard.js`), agregada **solo si** el permiso de la sesión coincide con el mismo criterio ya usado por `isErpSuperPermission` en `public/access-control.js` (`/administrador(?:es)?|implementador(?:es)?|emergencia/i` sobre `session.permissionName`).
- Funciona como el ícono de tema claro/oscuro: un `callback` que alterna un estado booleano (`viewAsVendorMode`), sin abrir ningún panel/bridge del botón flotante. El ícono/label cambia según el estado activo (ej. ícono normal vs. ícono "activo", igual patrón que `actionIconsMap.theme`).
- Al activarse, dispara un refresco de la sección del dashboard (ver punto 2). Al desactivarse, la sección vuelve a su comportamiento normal (oculta si el usuario real no es vendedor).

### 2. Sección del dashboard — selector de vendedor

- La sección `#dashboardSalesPipeline` (existente, agregada en la Fase 1) se muestra cuando `viewAsVendorMode` está activo, **aunque el usuario real no sea vendedor**.
- Mientras el modo está activo, se agrega dentro de la sección:
  - Un aviso visible: *"Vista de prueba — viendo como vendedor"*.
  - Un `<select>` con la lista de vendedores disponibles (usuarios de `admin_users` con `sap_salesperson_code` no nulo), poblado desde `GET /api/admin-users` (endpoint existente, filtrado en el cliente), ordenado alfabéticamente por nombre, con el primero seleccionado por defecto.
- Cambiar el selector vuelve a pedir el pipeline para el vendedor elegido y re-renderiza la sección.
- Cuando el modo está desactivado, el selector y el aviso desaparecen y la sección vuelve a su comportamiento normal de la Fase 1 (oculta u oculta salvo que el usuario real sea vendedor).

### 3. Backend — parámetro opcional en `mi-pipeline`

`GET /api/vendedores/mi-pipeline` (existente) acepta un query param opcional `salespersonCode`:

- Si `salespersonCode` está presente **y** el permiso de la sesión que llama coincide con el mismo criterio del punto 1 (verificado en el servidor, no solo en el cliente, con una función nueva que replique esa regex — no se reutiliza `isSuperAdminPermissionName` porque esa función no incluye "implementador" y la usan otras rutas que no deben cambiar de comportamiento), el endpoint calcula el pipeline para el `admin_users` cuyo `sap_salesperson_code` coincida, en lugar del usuario de la sesión.
- Si `salespersonCode` está presente pero el permiso no coincide, el parámetro se ignora silenciosamente y el endpoint se comporta como hoy (pipeline del propio usuario de la sesión).
- Sin el parámetro, comportamiento idéntico al actual.

### 4. Persistencia del estado

- `viewAsVendorMode` (on/off) y el último `salespersonCode` elegido se guardan en `sessionStorage` (no en base de datos), para sobrevivir un refresco de la página dentro de la misma pestaña/sesión del navegador, pero sin persistir entre sesiones — es una herramienta temporal de control, no una preferencia permanente.
- No se modifica `session`, `modules`, ni ningún otro dato de permisos. Ningún otro módulo del sistema se ve afectado.

## Pruebas

- Confirmar que el toggle solo aparece en el menú del botón flotante para un usuario con permiso administrador/implementador/emergencia, y no aparece para un vendedor normal.
- Activar el modo, confirmar que aparece la sección con el selector y el aviso, y que el primer vendedor se carga por defecto.
- Cambiar el selector y confirmar que los datos mostrados corresponden al vendedor elegido.
- Confirmar que un usuario sin el permiso requerido que llame `GET /api/vendedores/mi-pipeline?salespersonCode=...` directamente (por ejemplo con curl) recibe su propio pipeline (o `isVendedor:false`), no el del código solicitado.
- Desactivar el modo y confirmar que la sección vuelve a su comportamiento normal de la Fase 1.
- Confirmar que ningún otro módulo (permisos, cotizaciones, órdenes) cambia de comportamiento mientras el modo está activo.
