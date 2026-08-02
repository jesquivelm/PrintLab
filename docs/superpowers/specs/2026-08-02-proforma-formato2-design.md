# Proforma: segundo formato de documento (Formato 2)

## Contexto

La Proforma se renderiza hoy completamente en el cliente:

- `public/proforma-print.html` — documento imprimible. `buildPage(data)` (línea ~570) arma el HTML vía template literals y se inyecta en `#pPageWrap`. Se imprime/exporta a PDF con `window.print()` y CSS `@page`/`@media print`.
- `public/proforma.html` + `public/proforma.js` — editor. `renderDocument()` (línea ~420) es un duplicado de `buildPage()` usado para la previsualización embebida dentro del propio editor.
- `server.js` — `buildQuoteProformaPayload(quoteCode, client)` (línea ~6220) arma el payload JSON (empresa, cliente, vendedor, moneda, productos, totales, términos) que consumen ambos renderers. Rutas: `GET/PATCH /api/proformas/:codigo`, `POST /api/proformas/:codigo/close|reopen`.
- Configuración general vive en `config/general-config.json` bajo claves `general.proforma*`, editable en `public/configuracion-general.html` (tab Cotizaciones → subtab Proforma → sub-paneles Empresa / Textos / Configuración).
- Overrides por cotización individual se guardan en la tabla `quote_proformas.raw_data` (JSONB) vía `PATCH /api/proformas/:codigo`.
- El formato actual tiene **una sola plantilla fija**; lo único que varía hoy es el juego de columnas de la tabla de precios según `general.proformaPriceDisplayMode` (`regular_simple` / `regular_unit` / `regular_thousand` / `totalized_simple`).

El cliente pidió un segundo diseño de documento (ver imagen de referencia), inspirado en un formato anterior de la empresa ("mayaprin"), que debe coexistir con el actual sin reemplazarlo ni modificarlo.

## Objetivo

Agregar un **Formato 2** de Proforma, seleccionable independientemente del formato actual ("Clásico"), sin tocar el comportamiento, estilos ni payload del formato Clásico existente.

## Alcance

### Incluido
- Nueva rama de renderizado "Formato 2" en `proforma-print.html` y su espejo de previsualización en `proforma.js`.
- Nueva clave de configuración general `general.proformaFormat` (`'clasico' | 'formato2'`, default `'clasico'`) con su control en `configuracion-general.html`.
- Nuevo campo de texto libre `general.proformaFormat2Terminos` para los términos y condiciones del Formato 2.
- Override por cotización (`proformaFormat`) en el editor de proforma (`proforma.js` / `proforma.html`), persistido en `quote_proformas.raw_data`, con el mismo mecanismo que `sellerSignatureEnabled`/`priceDisplayMode`.
- Resolución del formato efectivo (override de cotización > default general) en `buildQuoteProformaPayload` o en el punto donde hoy se resuelven otros overrides, para que el payload indique qué formato usar.
- Tabla de precios fija de 5 columnas para el Formato 2: Cantidad, Millares, Precio por millar sin IVA, Precio por millar con IVA, Precio total con IVA.

### Excluido (explícitamente fuera de alcance por ahora)
- No se modifica el formato Clásico existente en ningún archivo.
- El Formato 2 **no** respeta `proformaPriceDisplayMode`; su tabla de precios es fija a las 5 columnas indicadas, independientemente del modo configurado.
- No se implementa la sección de "conteos por categoría" (Descripción/Dimensiones/Colores/Materiales/Motivos/Acabados) vista en la imagen de referencia — se usa la línea de descripción combinada de producto que ya existe hoy.
- El encabezado del Formato 2 no reutiliza la configuración de Empresa (logo/color/fuente/contactos); es un encabezado fijo propio.

## Diseño del Formato 2

Estructura del documento, de arriba hacia abajo:

1. **Encabezado fijo**: logo de la empresa (mismo asset ya configurado como logo de empresa, pero layout fijo — no colores/fuente configurables) a la izquierda, "Cotización: [código]" / "Fecha: [fecha]" a la derecha.
2. **Cliente / Atención**: mismos campos y datos que usa hoy el formato Clásico (nombre de cliente, atención).
3. **Intro**: reutiliza el texto configurado en `general.proformaIntroText` (el mismo campo que usa el Clásico).
4. **Descripción del producto**: reutiliza tal cual la línea combinada que ya existe en el Clásico — `p.descriptionText || [material, machineSummary, processType, dimensionsText, finishesSummary].filter(Boolean).join(' · ')`. Sin conteos por categoría.
5. **Tabla de precios**, columnas fijas: Cantidad | Millares | Precio por millar sin IVA | Precio por millar con IVA | Precio total con IVA. Se calcula desde los mismos datos de cantidades/precios de producto que usa hoy el Clásico (derivando "por millar" de la cantidad/1000), sin ramificar por `priceDisplayMode`.
6. **Términos y condiciones**: bloque de texto libre desde `general.proformaFormat2Terminos`, mostrado tal cual lo escriba el usuario en el panel de configuración (respetando saltos de línea como párrafos).
7. **Firma**: misma lógica y toggle que el Clásico — `general.proformaSellerSignatureEnabled` (u override por cotización si existiera), imagen desde `admin_users.signature_url`, nombre + "Ejecutivo de Ventas".

## Selector de formato

### Configuración general (default global)
- Nuevo control en `configuracion-general.html`, dentro de `#proforma-panel-configuracion` (junto a `proformaPriceDisplayField` / firma): selector `general.proformaFormat` con opciones "Clásico" / "Formato 2".
- Nuevo textarea en el mismo panel para `general.proformaFormat2Terminos` (siempre visible, sin ocultarlo condicionalmente, para simplicidad).
- Se guardan junto con el resto de `general.proforma*` vía el flujo existente de `GET/POST /api/config/general`.

### Override por cotización (vista de cálculo / editor de proforma)
- En `proforma.js`/`proforma.html`, nuevo campo `fields.proformaFormat` (select: "Usar default" / "Clásico" / "Formato 2"), junto a los demás campos de override (`sellerSignatureEnabled`, `priceDisplayMode`, etc.).
- Se persiste en `quote_proformas.raw_data.proformaFormat` vía `PATCH /api/proformas/:codigo`, mismo mecanismo que los demás overrides.
- Resolución: si `raw_data.proformaFormat` está definido y no es "usar default", tiene prioridad sobre `general.proformaFormat`.

### Consumo en el renderizado
- `buildQuoteProformaPayload` (server.js) agrega al payload el campo `format` ya resuelto (override > default).
- `proforma-print.html`: en el punto donde hoy se invoca `buildPage(data)`, se rama: si `data.format === 'formato2'` se invoca `buildPageFormat2(data)` (nueva función, mismo archivo, con su propio bloque CSS con prefijo distinto para no colisionar con las clases `.p-*` del Clásico — ej. `.p2-*`). Si no, se mantiene el flujo actual sin cambios.
- `proforma.js`: mismo criterio en `renderDocument()` — rama hacia una nueva función `renderDocumentFormat2()` espejo, para que la previsualización del editor coincida con el documento imprimible.

## Riesgo de colisión / aislamiento
- Todo el CSS nuevo del Formato 2 usa un prefijo de clase distinto (`.p2-*`) para que no se solape ni herede estilos del Clásico (`.p-*`).
- Ninguna función, ruta ni columna existente del Clásico se modifica; solo se agregan ramas condicionales nuevas y campos de configuración nuevos.

## Testing / verificación
No existen tests automatizados para esta parte (HTML/JS de cliente puro). Verificación manual:
1. Configuración general → Proforma → Configuración: seleccionar "Formato 2", guardar, confirmar que el preview vivo lo refleja.
2. Abrir una cotización desde Cálculo → Proforma: confirmar que se renderiza en Formato 2 por default.
3. Cambiar el override de esa cotización a "Clásico": confirmar que esa cotización específica vuelve al formato clásico mientras el resto sigue en Formato 2.
4. Confirmar que el formato Clásico (para cotizaciones sin override, con `general.proformaFormat = 'clasico'`) se ve exactamente igual que antes del cambio (regresión visual).
5. Probar impresión/exportación a PDF del Formato 2 (verificar `@page`/saltos de página con productos largos).
6. Confirmar que la firma aparece/desaparece según el toggle igual que en el Clásico.
