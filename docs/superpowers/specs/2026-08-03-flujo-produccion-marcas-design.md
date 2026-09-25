# Flujo de Producción — Marcas Faltantes (Planeación y Tintas) — Diseño

Fecha: 2026-08-03
Estado: Aprobado por usuario, pendiente de plan de implementación.

## Resumen

El flujo de seguimiento de una orden (visible en el botón "Control de Planificación" de la orden, en el desplegable de cada fila en Seguimiento/Planificación, y en el chip de estado de la lista de Órdenes de Producción) tiene dos huecos:

1. No existe una marca de planeación **después** de Visto Bueno — hoy la única marca de "planeación" ocurre **antes** de Preprensa y en realidad es una revisión de trazabilidad, mal nombrada.
2. La marca "Tintas" existe como concepto de costeo pero está oculta del checklist de seguimiento; no bloquea nada.

Además, marcar "Empaque" hoy no tiene ningún efecto sobre el inventario de producto terminado (PT) — es un paso manual desconectado.

Esta tarea corrige ambos huecos reutilizando la infraestructura ya existente (`production_order_routes`, `order_tracking_marks`, `PRODUCTION_FLOW_SEQUENCE`) — **no se crean tablas nuevas**. Todo el trabajo es de: (a) relabeling de una marca existente, (b) una marca nueva con su gate de fecha, (c) una marca paralela nueva con su gate de bloqueo, (d) un atajo que conecta "Empaque" con la creación de lote de PT.

## 1. Flujo resultante (con las dos correcciones de nombre del usuario)

```
Orden Creada → Solicitud Vendedor → Seguimiento → [Diseño] → Preprensa → Visto Bueno
   → Planeación → Planchas → Impresión (+ Tintas, paralelo) → Acabados → ... → Rebobinado → Empaque
```

- **"Seguimiento"**: es la marca fija existente, clave interna `planeacion` (server.js:19543-19552 y equivalentes en seguimiento.js/gantt.html). **Solo cambia el texto mostrado al usuario**, de "Planeación"/"Planificación" a **"Seguimiento"**. La clave interna `planeacion` NO se renombra (evita tocar ~10 sitios que la referencian; es un cambio de label, no de identificador). Sigue funcionando igual: da trazabilidad, revisa que la orden esté bien, y la envía a Diseño/Preprensa (lanzamiento a Gantt / `EN_GANTT`).
- **"Planeación"**: marca nueva, clave interna `programacion` (evita colisión visual con la clave `planeacion` ya existente). Posición: justo después de `visto_bueno`, antes de `planchas`. Cubre la planeación del proceso productivo completo (prensa + rebobinado + empaque), no solo prensa.
- **"Tintas"**: ya existe como `process_key` (`tintas`, server.js:7261) pero está en `ORDER_TRACKING_HIDDEN_PROCESS_KEYS` (server.js:7807) y ausente de `PRODUCTION_FLOW_SEQUENCE`. Se saca del set oculto y se agrega como marca **paralela** a Impresión (no ocupa numeración secuencial propia).

## 2. Marca "Planeación" (clave `programacion`)

- Se agrega a `PRODUCTION_FLOW_SEQUENCE`/`PRODUCTION_FLOW_LABELS` (server.js:7294-7326) y a `PLANNING_CLASSIFICATION_PROCESS_KEYS`/labels (server.js:7256-7292), posicionada entre `visto_bueno` y `planchas`.
- Se agrega al seed de `production_process_definitions` (server.js:8653-8668) para que exista también en la variante administrable por BD.
- **Gate obligatorio**: solo se puede marcar como completada si `raw_data.planning_control.scheduledDeliveryDate` (el campo "Fecha de Entrega" ya existente en la UI, `public/orden-produccion.html:633`) tiene valor. Si está vacío, la marca se rechaza con mensaje claro — **validación en servidor**, en el endpoint `POST /api/ordenes-produccion/:codigo/seguimiento/marca` (server.js:19866-19945) y en `.../seguimiento/completar` (server.js:19947-20021), replicando el patrón de gate ya usado ahí para `planeacion`/`solicitud_vendedor`. También se replica en cliente (deshabilitar o mensaje inmediato) en `orden-produccion.js` (`toggleTrackingStep`) y `seguimiento.js` (`:1122-1168`).
- No requiere modal de verificación adicional (a diferencia de la marca `planeacion`/Seguimiento, que sí abre el modal de verificación de materiales) — el único requisito es la fecha ya presente.

## 3. Marca "Tintas" (clave `tintas`, paralela)

- Se remueve `tintas` de `ORDER_TRACKING_HIDDEN_PROCESS_KEYS` (server.js:7807) y de los equivalentes cliente (`lanzamiento.js:434`).
- Se agrega a `PRODUCTION_FLOW_LABELS` como visible, pero **no se le asigna `sequence_order` en la cadena principal** — se renderiza como una fila adicional junto a Impresión en los 3 lugares de UI (timeline de orden, panel de seguimiento, gantt.html), usando el campo `is_parallel` ya existente en `production_process_definitions` (server.js:8360) — hoy escrito pero nunca leído; esta tarea lo empieza a usar.
- **Gate obligatorio**: `impresion` no puede marcarse `COMPLETADO` mientras `tintas` no esté `COMPLETADO`. Se valida en el mismo par de endpoints que el punto 2, más en la vía de sincronización `syncMarkToRouteTable`/`syncRouteStatusToMarkTable` (server.js:9033-9092) para que MES tampoco pueda completar Impresión sin Tintas (aunque Tintas en sí no es una estación operable desde MES).
- Se marca únicamente desde Seguimiento/Planificación (checklist administrativo, como Preprensa/Visto Bueno hoy) — **no se agrega a MES ni se crea un rol de permisos nuevo**. El usuario confirmó que el departamento de Tintas y sus permisos se configurarán después en Control de Acceso; cuando exista ese rol, se puede restringir el toggle sin cambios adicionales a este diseño.
- No requiere fecha ni modal — checkbox simple.

## 4. Empaque → creación automática de lote de PT

- Al marcar `empaque` como completado (vía `.../seguimiento/marca` o `.../seguimiento/completar`), en vez de solo actualizar el estado, el backend abre/requiere un formulario con los mismos campos que "Nuevo Lote" hoy expone en `public/inventario-pt.js:309-338`: Cantidad Producida* , Fecha Producción* (default hoy), Turno, Máquina, Número de Rollos, Número de Cajas, Notas. Producto y Orden de Producción se precargan (de solo lectura) desde la orden — no se piden de nuevo.
- Al enviar el formulario, el servidor llama a `crearLote()` (`services/inventario-pt-service.js:896-942`) con `orden_produccion_id` resuelto de la orden (de donde también se auto-resuelve `producto_id`), y en el mismo request marca `empaque` como `COMPLETADO`. Ambas acciones ocurren atómicamente (una sola transacción) — si falla la creación del lote, la marca de Empaque tampoco se guarda.
- **Alcance explícito**: esto crea solo el registro de **lote** (`lote_producto_terminado`) — no el ingreso físico a bodega (`inventario_producto_terminado`, que requiere `bodega_id` y ocurre en un paso de calidad/bodega posterior, sin cambios). Confirmado con el usuario.
- Se corrige de paso el mapeo `notas` → `observaciones` (hoy el campo "Notas" del formulario manual se pierde silenciosamente porque el cliente envía `notas` y `crearLote` lee `datos.observaciones` — `inventario-pt.js:309-338` vs `inventario-pt-service.js:927`) **únicamente en la ruta nueva que se está construyendo**; no se toca el formulario manual existente de `inventario-pt.js` (fuera de alcance de esta tarea).

## 5. Superficies que deben reflejar el flujo (todas se alimentan de los mismos datos del servidor)

Automático (sin cambio de código, ya leen `steps[]`/`processName`/`routeStatus` del servidor):
- Chip de estado en `public/ordenes-produccion.js` (agregado en la tarea anterior).
- Timeline del botón "Control de Planificación" (`orden-produccion.js: renderFlowTimeline`).
- Panel desplegable de `seguimiento.js: renderFlowPanel`.

Requieren edición puntual (mapas de labels/íconos hardcodeados en cliente, para que las 2 marcas nuevas no aparezcan en blanco o con ícono genérico):
- `public/planificacion/seguimiento.js:3-5` (`LABELS`/`ICONS`/`PROCESS_ICON_KEYS`)
- `public/planificacion/lanzamiento.js:428-434`
- `public/planificacion/gantt.html` (~2600-2705, mapa inline)

No se toca `public/planificacion/seguimiento - copia.js` (archivo de respaldo, no referenciado por ningún HTML — confirmado, código muerto).

MES (`/api/mes/*`, `mes-operario.html`) — sin cambios: ninguna de las dos marcas nuevas es una estación operable desde planta.

## 6. Fuera de alcance (explícito)

- No se crea el rol/permiso "Departamento de Tintas" en `access-control.js` — pendiente de que el usuario lo configure.
- No se automatiza el ingreso físico a bodega de PT (`inventario_producto_terminado`) — sigue manual.
- No se consolida el código duplicado de las 3 implementaciones de timeline/checklist (orden-produccion.js, seguimiento.js, gantt.html) en un módulo compartido — se replican los mapas de labels/íconos en los 3 sitios como ya funciona hoy, sin refactor de arquitectura.
- No se renombra la clave interna `planeacion` — solo su etiqueta visible cambia a "Seguimiento".
- No se corrige el bug `notas`/`observaciones` en el formulario manual existente de `inventario-pt.js` — solo en la ruta nueva de Empaque.

## 7. Pruebas planeadas

- Verificación funcional en BD local (`printlab`) siguiendo el patrón de `CLAUDE.md` (arrancar servidor, `curl` a los endpoints de marca/completar sobre una orden real, revertir datos de prueba al terminar).
- Casos a probar:
  1. Intentar completar "Planeación" sin `scheduledDeliveryDate` → debe rechazarse (servidor).
  2. Completar "Planeación" con fecha ya puesta → debe aceptarse y aparecer en las 3 superficies de UI.
  3. Intentar completar "Impresión" sin "Tintas" completada → debe rechazarse.
  4. Completar "Tintas" y luego "Impresión" → debe aceptarse.
  5. Completar "Empaque" con el formulario de lote → debe crear fila en `lote_producto_terminado` ligada a la orden, y marcar Empaque como completado; si se cancela el formulario, Empaque no debe quedar marcado.
  6. Verificación visual en navegador del chip de la lista de órdenes y del panel de Seguimiento reflejando las marcas nuevas.
