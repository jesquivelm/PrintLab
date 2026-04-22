# PrintLab Theme Foundation

## Objetivo

El sistema visual se basa en tokens compartidos y no en colores escritos a mano por pantalla. El modo claro y oscuro deben cambiar desde `html[data-theme]`, preservando jerarquia, contraste y legibilidad en formularios, tablas, popovers y navegacion.

## Tokens Base

Los tokens oficiales viven en `public/styles.css`.

- `--app-bg`: fondo general de la aplicacion.
- `--app-bg-soft`: fondo secundario para bandas o areas internas.
- `--app-surface`: superficie principal de tarjetas, barras y paneles.
- `--app-surface-raised`: superficie elevada o activa.
- `--app-surface-soft`: fondo suave para inputs, tablas y controles.
- `--app-text`: texto principal.
- `--app-text-soft`: texto secundario.
- `--app-text-muted`: etiquetas, ayudas y metadatos.
- `--app-border`: borde normal.
- `--app-border-strong`: borde con mas presencia.
- `--app-primary`: accion principal y foco.
- `--app-primary-strong`: estado activo o hover principal.
- `--app-primary-soft`: fondo suave de seleccion.
- `--app-accent`: acento secundario, reservado para llamadas puntuales.
- `--app-danger`, `--app-success`, `--app-warning`: estados.
- `--app-ring`: anillo de foco.
- `--app-shadow-sm`, `--app-shadow-md`, `--app-shadow-lg`: elevacion.

## Reglas

- No agregar nuevos colores hexadecimales en pantallas migradas si existe un token equivalente.
- Usar `--app-surface` para paneles, popovers, tarjetas y topbars.
- Usar `--app-surface-soft` para inputs, encabezados de tabla y fondos internos.
- Usar `--app-primary` solo para acciones, seleccion, foco e iconos activos.
- Usar `--app-text-muted` para labels y ayuda, no para texto importante.
- El modo oscuro se activa con `html[data-theme="dark"]`.
- El modo automatico se resuelve desde `theme.js` usando `prefers-color-scheme`.
- Las pantallas nuevas deben cargar `/theme.js` antes de `/styles.css`.

## Migracion Recomendada

1. Migrar estructura global: body, topbar, workspace, navegacion.
2. Migrar componentes compartidos: inputs, tablas, botones, popovers.
3. Migrar modulos por prioridad: dashboard, cotizaciones, catalogos, costos, configuracion.
4. Eliminar colores directos solo despues de verificar visualmente cada modulo.
