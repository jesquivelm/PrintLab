# Wizard de creación de Socios/Prospectos

## Objetivo

Convertir la creación de "Nuevo Socio" (hoy un modal de un solo formulario) en un wizard de 7 pasos que permita guardar un **PROSPECTO** sin exigir toda la información de un cliente definitivo, y sin crear/sincronizar nada en SAP al guardar.

## Alcance confirmado

**Dentro de alcance:**
- Wizard de 7 pasos dentro del mismo popover `#nuevoSocioPopover`.
- Nuevos campos: tipo de socio, tipo de identificación, nombre comercial, estado del socio.
- Quitar la llamada automática a SAP que hoy se dispara al crear un socio.
- Paso 6 (Manejo y Entrega) obligatorio, con autocompletado desde el contacto principal para agilizar la carga.

**Fuera de alcance (confirmado con el usuario):**
- Botones/flujo de "Solicitud de creación de cliente", aprobación y "Crear en SAP" — la sincronización con SAP se hará después desde el proceso de creación de orden, no desde Socios.
- Corregir el bug preexistente `CardType='S'` en `services/sap-service-layer.js`.
- "Contacto de contraseñas" — no se implementa; se asume error de transcripción del requerimiento original.
- Reestructurar `public/socios-documento.html` más allá de reflejar los campos nuevos en sus secciones actuales.
- CRUD de múltiples contactos/direcciones por socio (no existe hoy, no se agrega).

## Patrón de UI a reutilizar

El wizard "Nueva Solicitud" de `public/cotizaciones.html` / `public/cotizaciones.js` (`.quote-request-section[data-step]`, `.quote-request-wizard-footer`, `goToQuickRequestStep`, `validateQuickRequestStep`). Se reutilizan las mismas clases; no se crea CSS nuevo de wizard.

## Cambios de base de datos

Nueva migración sobre `business_partners` (no se toca `business_partner_contacts`, `business_partner_addresses`, ni la tabla `socio` del subsistema flexo-engine, que es un concepto distinto):

| Columna | Tipo | Notas |
|---|---|---|
| `tipo_socio` | TEXT | `'EMPRESA'` \| `'PERSONA'` |
| `tipo_identificacion` | TEXT | `'NIT'` \| `'DPI'` \| `'PASAPORTE'` \| `'OTRO'`. El número sigue en `tax_id` (no se renombra). |
| `nombre_comercial` | TEXT | |
| `estado_socio` | TEXT, nullable, `CHECK` | `PROSPECTO`, `PENDIENTE_INFORMACION`, `SOLICITUD_CLIENTE`, `PENDIENTE_APROBACION`, `CLIENTE_APROBADO`, `CLIENTE_CREADO_SAP`, `ERROR_SINCRONIZACION`. Filas existentes quedan `NULL` (no se asume su estado retroactivamente). Los estados posteriores a `PROSPECTO` no tienen UI en este trabajo, pero quedan definidos para no duplicar nomenclatura después. |
| `porcentaje_adelantos` | NUMERIC(12,4) | Hoy el campo existe en el HTML del detalle (`#adelantosPorcentaje`) pero nunca se guarda. Se agrega columna real. |
| `porcentaje_faltantes` | NUMERIC(12,4) | Igual que arriba (`#faltantesPorcentaje`). |

`allowed_percentage` (ya existe) se reutiliza para "% Excedentes"; no se duplica.

## Los 7 pasos

1. **Tipo e Identificación** — `tipo_socio`, `tipo_identificacion` (default NIT si EMPRESA / DPI si PERSONA, editable), `tax_id`. **Obligatorio para avanzar.**
2. **Datos Generales** — `partner_name` (etiqueta "Razón Social" si EMPRESA, "Nombre Completo" si PERSONA), `nombre_comercial`, `email_facturacion`, `sector`, `sub_sector`. **`partner_name` obligatorio**; el resto puede quedar pendiente.
3. **Contacto Principal** — nombre, apellido (si aplica), tipo+número de identificación, celular, teléfono, correo, cargo, representante legal + checkbox "El socio es el contacto principal": copia `partner_name` → nombre del contacto; copia identificación **solo si `tipo_socio = PERSONA`** (nunca copia NIT de empresa como identificación personal). No bloquea el avance.
4. **Dirección** — país, departamento, cantón (etiqueta se mantiene igual, sin cambiar a "Municipio"), zona, detalle, mapa (se conserva `updateContactMap()` sin tocar geolocalización). No bloquea el avance.
5. **Condiciones Comerciales** — moneda (select poblado desde Configuración General → Monedas), días de crédito (select con las mismas opciones que `PAYMENT_TERM_OPTIONS` de `public/proforma.js`), socio exento (`is_tax_exempt`). No bloquea el avance. (Se removió de aquí "Permite excedentes Sí/No + %" porque es el mismo dato que "Excedentes + % Excedentes" del Paso 6 — se evita duplicar el campo.)
6. **Manejo y Entrega — OBLIGATORIO:**
   - **Manejo**: Excedentes (select, obligatorio) + % Excedentes (`allowed_percentage`, `display-input` con sufijo `%`; deshabilitado/0 si la opción elegida es "No Facturar Excedentes..."). Adelantos (select, obligatorio) + % Adelantos (`porcentaje_adelantos`, `display-input`). Faltantes (select, obligatorio) + % Faltantes (`porcentaje_faltantes`, `display-input`).
   - **Entrega**: Entrega de muestras (obligatorio), Indicaciones (obligatorio).
   - **Contacto de Visto Bueno** y **Contacto de Producto** (en ese orden): Contacto (select Vendedor/Email/Cliente/No necesita, obligatorio). Si se elige "Cliente", Teléfono/Correo se autocompletan con los del contacto principal del Paso 3 (editable). Si se elige "No necesita", Teléfono/Correo/Detalle dejan de ser obligatorios para ese sub-grupo. En cualquier otro caso, Teléfono y Correo son obligatorios.
   - No se implementa "contacto de contraseñas".
7. **Revisión y Guardado** — resumen de completos/pendientes de los Pasos 2, 4 y 5 (no bloquean), estado inicial `PROSPECTO`. Botones Anterior / Guardar como prospecto. Guardar llama `POST /api/socios` (mismo endpoint) **sin** la llamada automática a `createBusinessPartnerInSap`.

## Validación

Bloquean "Siguiente"/"Guardar": Paso 1 completo, Paso 2 (`partner_name`), Paso 6 completo según las reglas de arriba. Todo lo demás se marca "pendiente" en el Paso 7 sin bloquear el guardado.

## Archivos a modificar

- `public/socios.html` — modal → wizard de 7 pasos.
- `public/socios.js` — estado/navegación del wizard, validación, copiar contacto principal, autocompletar VB/Producto, envío final.
- `services/socios-service.js` — quitar la llamada a SAP en `POST /api/socios`; aceptar y persistir los campos nuevos.
- Nueva migración SQL en `sql/`.
- `public/socios-documento.html` / `.js` — mostrar los campos nuevos en las secciones existentes.

## Pruebas planeadas

- Crear prospecto tipo Empresa con NIT; tipo Persona con DPI.
- Checkbox "El socio es el contacto principal" y que el NIT de empresa no se copie como identificación del contacto.
- Autocompletado de Teléfono/Correo en Visto Bueno/Producto al elegir "Cliente".
- Que no se dispare ninguna llamada a SAP al guardar.
- Orden Visto Bueno → Producto.
- Que el consecutivo/código interno (`partner_code`) no cambie de lógica.
- Que los datos no se pierdan al avanzar/retroceder entre pasos.
- Que el detalle del socio muestre los campos nuevos correctamente.
- Arranque de servidor y prueba de los endpoints modificados.
