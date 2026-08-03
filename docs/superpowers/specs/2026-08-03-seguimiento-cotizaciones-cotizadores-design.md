# Control de seguimiento de cotizaciones para cotizadores

**Fecha:** 2026-08-03
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto

Los cotizadores necesitan una forma rápida de identificar, dentro del módulo de Cotizaciones que ya usan (`/cotizaciones`), cuáles cotizaciones dependen todavía del vendedor y cuáles ya fueron liberadas por el vendedor y están listas para que el cotizador defina el costo. También necesitan ver de un vistazo a qué vendedor pertenece cada cotización.

Se descartó crear un módulo nuevo (una copia del listado de cotizaciones "para vendedores"): se integra directamente en `/cotizaciones` para evitar duplicar código, evitar restricciones de visibilidad que tendría un módulo aparte, y reutilizar los botones de acción que ya existen por línea (p. ej. "Editar cálculo").

## Alcance

Solo frontend: `public/cotizaciones.html`, `public/cotizaciones.js`, `public/styles.css`. Sin cambios de backend, de API ni de base de datos — toda la información necesaria ya viene en la respuesta actual del listado de cotizaciones (incluye `salesperson_name`, `status`, `line_statuses`, ya usados hoy por `quoteStatusInfo()` y por el buscador).

Fuera de alcance (confirmado explícitamente en la conversación de diseño):
- No se agrega un botón "Cotizar" nuevo. El botón "Editar cálculo" que ya existe por línea (al expandir una cotización) es suficiente.
- No se cambia el buscador actual (ya busca por cotización, cliente y vendedor).
- No se cambian montos totales ni la descripción de la cotización — ya se muestran hoy.
- No se remueven ni modifican restricciones de acceso a la ruta `/cotizaciones` (el grupo Vendedores sigue entrando igual que hoy).

## 1. Mapeo de filtros a estados existentes

`quoteStatusInfo(item)` (public/cotizaciones.js:2663) ya clasifica cada cotización combinando `item.status` e `item.line_statuses` en:

| `state` interno | Etiqueta visual actual (chip) | Significado |
|---|---|---|
| `unsent` | "No enviado" | La cotización todavía depende de que el vendedor la complete/envíe. |
| `pending` | "Solicitada" | El vendedor ya liberó su solicitud (hito "Solicitud del vendedor") — le toca al cotizador definir el costo. |
| `quoted` | "Cotizada" | Ya fue cotizada/enviada/cerrada. |

Los nuevos filtros rápidos reutilizan este mismo cálculo, sin tocar `quoteStatusInfo()` ni el endpoint de listado:

- **"Dependientes"** → `quoteStatusInfo(item).state === 'unsent'`.
- **"Aprobadas"** → `quoteStatusInfo(item).state === 'pending'`. (El nombre del botón difiere de la etiqueta del chip a propósito: desde la perspectiva del cotizador, "aprobada" significa que el vendedor ya aprobó/liberó la información para que él cotice; el chip seguirá diciendo "Solicitada" porque describe el mismo estado desde otro ángulo.)
- **"Todas"** (estado por defecto al cargar la página) → sin filtro adicional.

El filtro rápido se combina con el buscador de texto existente usando lógica AND (ambos deben cumplirse).

## 2. Fila de botones de filtro rápido

Se agrega una fila de botones tipo "pill" entre la barra de búsqueda (`.quote-browser-search-row`) y la tabla, con el mismo lenguaje visual que los tabs de filtro de `public/planificacion/seguimiento.html` (`.process-tab` / `.process-tab.is-active`), adaptado a los tokens de color ya usados en `cotizaciones.html` (`var(--app-text)`, etc.).

Botones: `Todas` | `Dependientes` | `Aprobadas`. Selección única (como un tab), no checkboxes independientes. Al cambiar de filtro se vuelve a llamar `renderQuotesTable(getFilteredQuotes())`, igual que hoy hace el buscador de texto.

Esta fila completa (contenedor y los tres botones) solo se renderiza/muestra para los roles descritos en la sección 4. Para el resto de usuarios permanece oculta (`hidden`), y el filtro interno permanece en `'todas'`, por lo que no hay ningún efecto funcional para ellos.

## 3. Nombre del vendedor en la columna "Detalles"

Hoy `renderQuoteParentRow()` (public/cotizaciones.js:2674) pinta, dentro de `.quote-master-info-block` (una sola línea flex-wrap), el nombre del cliente, su código y el chip de estado.

Se agrega una **segunda línea**, debajo de ese bloque (no inline dentro de él, para no alterar el layout/wrap actual), con el nombre del vendedor:

```
Vendedor: {item.salesperson_name}
```

Estilo: texto pequeño y discreto (mismo tono que `.quote-master-info-code`), en un `<span>` de bloque nuevo (`.quote-master-info-vendor`) debajo del `.quote-master-info-block` existente, dentro de la misma `<td class="quote-master-td-info">`. Solo se pinta si `item.salesperson_name` tiene valor y el usuario tiene permiso (sección 4); si no, no se renderiza el `<span>` (no se deja espacio vacío).

## 4. Visibilidad restringida

Nueva función en `public/cotizaciones.js`:

```js
function canSeeCotizadorSeguimiento() {
    const session = readUserSession();
    const permissionName = String(session?.permissionName || '').trim();
    return /administrador(?:es)?|implementador(?:es)?|emergencia|cotizador(?:es)?/i.test(permissionName);
}
```

Esto reutiliza el mismo patrón de regex que ya existe en `public/access-control.js` (`isErpSuperPermission`), extendido con `cotizador(?:es)?`. Como el nombre de permiso "Vendedores-Cotizadores" contiene la palabra "Cotizadores", esta misma función cubre correctamente ambos grupos (`Cotizadores` y `Vendedores-Cotizadores`) sin necesitar un caso especial. El grupo `Vendedores` (sin sufijo) no calza con el regex y no verá los filtros ni el nombre del vendedor, aunque conserve su acceso actual a `/cotizaciones` para sus propias cotizaciones.

Esta función controla:
- Si se muestra la fila de botones de filtro rápido (sección 2).
- Si se muestra la línea de nombre del vendedor (sección 3).

## 5. Pruebas planeadas

- Verificación visual: cargar `/cotizaciones` con un usuario del grupo Cotizadores (o Implementadores) y confirmar que aparecen los tres botones y el nombre del vendedor debajo del cliente en cada fila.
- Verificación funcional: hacer clic en "Dependientes" y "Aprobadas" y confirmar que la tabla se filtra según el estado esperado, y que combinado con texto en el buscador ambos filtros aplican juntos.
- Verificación de restricción: confirmar (por inspección de `canSeeCotizadorSeguimiento()` con distintos `permissionName` simulados, o con un usuario real del grupo Vendedores) que ni los botones ni el nombre del vendedor aparecen para ese grupo.
- Confirmar que no se rompe el layout existente de la columna Detalles ni el resto de la tabla (orden de columnas, ancho, scroll).
