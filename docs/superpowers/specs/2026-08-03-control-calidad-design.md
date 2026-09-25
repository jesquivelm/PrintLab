# Módulo de Control de Calidad — Diseño

Fecha: 2026-08-03
Estado: Aprobado por usuario, pendiente de plan de implementación.

## Resumen

Nuevo módulo `Calidad` con dos piezas independientes bajo el mismo permiso y navegación:

1. **Órdenes de Calidad**: registro de incidencias de calidad (qué pasó, quién es responsable, plan de acción correctiva) con flujo de estados hasta el cierre.
2. **Documentos de Calidad**: generación de Cartilla de Color, Ficha Técnica y Certificado de Calidad ligados a una Orden de Producción existente, con historial versionado.

Regla transversal (ahora en `AGENTS.md`/`CLAUDE.md`): todo campo, tabla, archivo e identificador de código nuevo de este módulo debe estar en español. Nada de `raw_data`/JSON — solo columnas tipadas explícitas.

## 1. Arquitectura y Navegación

- **Permiso nuevo**: módulo `calidad` en `public/access-control.js`, asignable por rol/usuario desde Configuración (mismo mecanismo que `tintas`/`produccion`).
- **Iconos nuevos** en `ICON_LIBRARY` (`public/configuracion-general.html`), grupo/tab `'Calidad'`: `dashboardCalidad` (tarjeta del dashboard principal), `calidadOrdenes`, `calidadCartilla`, `calidadFichaTecnica`, `calidadCertificado`.
- **Tarjeta en dashboard**: nueva entrada en `DASHBOARD_CARDS` (`public/dashboard.js`) + botón `.dashboard-card` en `public/dashboard.html`, `data-route="/calidad"`, `modules: ['calidad']`.
- **Servicio backend**: `services/calidad/calidad-service.js`, exporta `registrarRutasCalidad({ app, pgQuery, withTransaction })`, invocado una vez en `server.js` (mismo patrón que `registerTintasRoutes`). Todas las rutas API bajo `/api/calidad/*`.
- **Páginas** (`public/calidad/`):
  - `dashboard.html` — sub-dashboard con tarjetas: "Órdenes de Calidad" y "Documentos Generados".
  - `ordenes.html` — listado/búsqueda de Órdenes de Calidad.
  - `orden-detalle.html` — crear/ver/editar una Orden de Calidad (`?codigo=OC-000001` o nueva).
  - `documentos.html` — buscador de Orden de Producción + generación de los 3 documentos, y listado histórico.
- **Rutas limpias en `server.js`**: `/calidad`, `/calidad/ordenes`, `/calidad/orden/:codigo`, `/calidad/documentos` (mismo idioma que `/tintas/*`).
- **Documentos imprimibles** (patrón de `proforma-print.html`, sin librería PDF server-side): `public/calidad/cartilla-color-impresion.html`, `ficha-tecnica-impresion.html`, `certificado-calidad-impresion.html`. CSS de impresión + botón "Imprimir/Guardar PDF".
- **Integración con Orden de Producción existente** (`public/orden-produccion.html`/`.js`): 3 botones nuevos ("Generar Cartilla de Color", "Generar Ficha Técnica", "Generar Certificado de Calidad"), visibles solo con permiso `calidad`, que abren las mismas páginas de impresión que desde el módulo Calidad.
- **Numeración**: códigos `OC-000001` para Órdenes de Calidad (secuencia propia, igual patrón que `OP-`/`C-`).

## 2. Órdenes de Calidad — Modelo de Datos y Flujo

Origen: independiente, opcionalmente ligada a una Orden de Producción por código. No es la orden que se reenvía a producción — es un registro de calidad; si la orden original debe rehacerse, eso ocurre por fuera (posible recotización), fuera de este módulo.

### Tabla `calidad_ordenes` (cabecera)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| codigo | TEXT UNIQUE | `OC-000001` |
| orden_produccion_codigo | TEXT NULL | referencia libre a `flexo_orders`, opcional |
| cliente_codigo | TEXT NULL | |
| cliente_nombre | TEXT NULL | |
| fecha_deteccion | DATE | |
| detectado_por | TEXT | |
| descripcion_general | TEXT | |
| estado | TEXT | `ABIERTA` \| `EN_INVESTIGACION` \| `ACCION_CORRECTIVA_DEFINIDA` \| `CERRADA` |
| accion_correctiva | TEXT NULL | |
| accion_preventiva | TEXT NULL | |
| responsable_accion | TEXT NULL | |
| fecha_limite_accion | DATE NULL | |
| fecha_cierre | TIMESTAMPTZ NULL | |
| cerrado_por | TEXT NULL | |
| fecha_creacion | TIMESTAMPTZ DEFAULT NOW() | |
| fecha_actualizacion | TIMESTAMPTZ NULL | |

### Tabla `calidad_orden_lineas` (una fila por producto/línea afectada; una orden puede tener varias)

Snapshot **congelado** al crear la línea — subconjunto técnico curado, no las ~150 columnas completas de `flexo_orders` (se excluyen campos comerciales/costeo, irrelevantes para calidad):

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| orden_calidad_id | INTEGER FK → calidad_ordenes.id | |
| producto_codigo | TEXT NULL | |
| linea_codigo | TEXT NULL | |
| sustrato | TEXT NULL | |
| ancho | NUMERIC NULL | |
| largo | NUMERIC NULL | |
| diametro_core | NUMERIC NULL | |
| cantidad_tintas | INTEGER NULL | |
| tinta_blanca | BOOLEAN NULL | |
| barniz_tipo | TEXT NULL | |
| laminado_tipo | TEXT NULL | |
| troquelado_tipo | TEXT NULL | |
| numerado_tipo | TEXT NULL | |
| rebobinado_notas | TEXT NULL | |
| fecha_creacion | TIMESTAMPTZ DEFAULT NOW() | |

### Tabla `calidad_orden_linea_pantones` (hija de línea, snapshot congelado)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| orden_linea_id | INTEGER FK → calidad_orden_lineas.id | |
| pantone_codigo | TEXT | |
| color_referencia | TEXT NULL | hex/muestra |
| densidad | NUMERIC NULL | |
| anilox_codigo | TEXT NULL | |

### Tabla `calidad_orden_linea_defectos` (hija de línea, varias por línea)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| orden_linea_id | INTEGER FK → calidad_orden_lineas.id | |
| tipo_defecto_id | INTEGER FK → calidad_tipos_defecto.id | |
| descripcion | TEXT NULL | texto libre |
| area_responsable | TEXT NULL | reutiliza catálogo `production_process_definitions`; agregar `Materiales/Sustrato` y `Proveedor Externo` si no existen |
| persona_responsable | TEXT NULL | nombre del operador |

### Tabla `calidad_tipos_defecto` (catálogo configurable)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| nombre | TEXT | |
| activo | BOOLEAN DEFAULT true | |

Valores iniciales a poblar (defectos típicos de impresión flexográfica): Registro, Densidad de Tinta Incorrecta, Pantone Fuera de Tolerancia, Manchado/Mota, Rayado, Pinholing, Migración/Adherencia de Tinta, Burbujas/Delaminación (laminado), Cobertura Despareja de Barniz, Troquelado Desalineado, Rebaba de Corte, Telescoping/Arrugas de Rebobinado, Numerado Ilegible o Faltante, Dimensiones Fuera de Tolerancia, Contaminación/Partículas, Otro.

## 3. Documentos de Calidad — Modelo de Datos

Independientes de las Órdenes de Calidad: se generan directamente desde una Orden de Producción (con o sin incidencia registrada), desde el botón en Orden de Producción o desde el módulo Calidad.

### Tabla `calidad_documentos` (cabecera; cada generación crea una fila nueva versionada, nunca se sobrescribe)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| tipo | TEXT | `cartilla_color` \| `ficha_tecnica` \| `certificado_calidad` |
| orden_produccion_codigo | TEXT | |
| producto_codigo | TEXT NULL | opcional si la orden tiene un solo producto |
| version | INTEGER | autoincremental por combinación (orden, tipo, producto) |
| generado_por | TEXT | |
| generado_en | TIMESTAMPTZ DEFAULT NOW() | |
| cantidad_aprobada | NUMERIC NULL | solo `certificado_calidad` |
| cantidad_rechazada | NUMERIC NULL | solo `certificado_calidad` |
| resultado_inspeccion | TEXT NULL | solo `certificado_calidad`: Aprobado / Aprobado con Observaciones / Rechazado |
| observaciones | TEXT NULL | solo `certificado_calidad` |
| inspeccionado_por | TEXT NULL | solo `certificado_calidad` |
| fecha_inspeccion | DATE NULL | solo `certificado_calidad` |

Para `ficha_tecnica` se reutilizan las mismas columnas de snapshot técnico que `calidad_orden_lineas` (sustrato, ancho, largo, diametro_core, cantidad_tintas, tinta_blanca, barniz_tipo, laminado_tipo, troquelado_tipo, numerado_tipo, rebobinado_notas) directamente en `calidad_documentos` (nullable, solo aplican si `tipo='ficha_tecnica'`). Una única función interna (`construirSnapshotTecnico(ordenCodigo, productoCodigo)`) arma este snapshot y se reutiliza tanto para líneas de Orden de Calidad como para Ficha Técnica.

### Tabla `calidad_documento_pantones` (hija, solo para `cartilla_color`, snapshot congelado)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| documento_id | INTEGER FK → calidad_documentos.id | |
| pantone_codigo | TEXT | |
| color_referencia | TEXT NULL | |
| receta_referencia | TEXT NULL | de `tintas_pantones_recetas` |
| densidad_objetivo | NUMERIC NULL | |
| anilox_codigo | TEXT NULL | |

Todos los documentos quedan versionados y consultables/reimprimibles después, mostrando siempre los datos congelados de esa versión (no los datos actuales de la orden).

## 4. Permisos

Módulo `calidad` en `public/access-control.js`: controla ver/crear/editar Órdenes de Calidad, generar los 3 documentos, y ver historial. Asignable por rol/usuario desde Configuración.

## 5. Plan de Pruebas

- **Migraciones SQL** (`sql/migracion-calidad.sql`): verificación directa contra `printlab` — crear tablas, insertar registros de prueba, confirmar tipos y constraints, limpiar al final.
- **Endpoints API** (`/api/calidad/*`): pruebas con `curl` contra servidor local — crear Orden de Calidad con líneas/defectos, cambiar estados del flujo, generar los 3 documentos y verificar versión incremental.
- **UI**: verificación visual — dashboard con tarjeta e icono nuevos, listado y detalle de Órdenes de Calidad, botones nuevos en Orden de Producción, páginas de impresión con vista previa.
- **Regresión**: confirmar que Orden de Producción existente sigue funcionando igual (los 3 botones nuevos no alteran su lógica actual), y que el catálogo de iconos sigue funcionando para los módulos existentes.

## Decisiones confirmadas por el usuario

- Dos piezas separadas (Órdenes de Calidad / Documentos de Calidad), un solo plan combinado.
- Orden de Calidad: origen independiente, opcionalmente ligada a Orden de Producción.
- Datos heredados de producción: snapshot congelado (no editable, no es la orden que va a producción).
- Defectos: catálogo configurable + texto libre.
- Responsable: área/proceso Y persona específica.
- Flujo de estados completo con acción correctiva/preventiva.
- Una Orden de Calidad puede cubrir múltiples líneas/productos.
- Permiso nuevo dedicado `calidad`.
- Documentos generables desde Orden de Producción y desde el módulo Calidad.
- Certificado de Calidad: datos de inspección capturados manualmente al generar (no depende de Inventario PT).
- Todos los documentos se guardan con historial versionado, congelado al momento de generar.
- Todo nombre de tabla/columna/archivo/identificador de código nuevo, en español (regla ahora en `AGENTS.md`/`CLAUDE.md`).
