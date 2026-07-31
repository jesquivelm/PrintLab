# PrintLab Theme Foundation

## Objetivo

El sistema visual se basa en tokens compartidos y no en colores escritos a mano por pantalla. El modo claro y oscuro deben cambiar desde `html[data-theme]`, preservando jerarquia, contraste y legibilidad en formularios, tablas, popovers y navegacion.

## Tokens Base

Los tokens oficiales viven en `public/styles.css`.

### Variables CSS - Modo Claro (`:root`)

| Token | Valor | Uso |
|-------|-------|-----|
| `--app-bg` | `#f8fafc` | Fondo general |
| `--app-bg-soft` | `#f1f5f9` | Fondo secundario para bandas o areas internas |
| `--app-surface` | `#ffffff` | Superficies (cards, topbar, paneles) |
| `--app-surface-raised` | `#ffffff` | Superficies elevadas |
| `--app-surface-soft` | `#f1f5f9` | Inputs, tablas, controles |
| `--app-text` | `#0f172a` | Texto principal |
| `--app-text-soft` | `#475569` | Texto secundario |
| `--app-text-muted` | `#64748b` | Labels, ayudas, metadatos |
| `--app-border` | `#e2e8f0` | Borde normal |
| `--app-border-strong` | `#cbd5e1` | Borde con mas presencia |
| `--app-primary` | `#0277a9` | Accion principal y foco |
| `--app-primary-strong` | `#03638c` | Estado activo o hover principal |
| `--app-primary-soft` | `rgba(2,119,169,0.12)` | Fondo suave de seleccion |
| `--app-accent` | `#0277a9` | Acento secundario |
| `--app-danger` | `#dc2626` | Errores |
| `--app-success` | `#16a34a` | Exito |
| `--app-warning` | `#b7791f` | Advertencias |
| `--app-ring` | `#0277a9` | Anillo de foco |
| `--app-shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Elevacion baja |
| `--app-shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` | Elevacion media |
| `--app-shadow-lg` | `0 12px 32px rgba(0,0,0,0.12)` | Elevacion alta |

### Variables CSS - Modo Oscuro (`html[data-theme="dark"]`)

| Token | Valor |
|-------|-------|
| `--app-bg` | `#0f172a` |
| `--app-bg-soft` | `#1e293b` |
| `--app-surface` | `#162033` |
| `--app-surface-raised` | `#1b263b` |
| `--app-surface-soft` | `#1e293b` |
| `--app-text` | `#f8fafc` |
| `--app-text-soft` | `#cbd5e1` |
| `--app-text-muted` | `#94a3b8` |
| `--app-border` | `#26364d` |
| `--app-border-strong` | `#334155` |
| `--app-primary` | `#38bdf8` |
| `--app-primary-strong` | `#7dd3fc` |
| `--app-primary-soft` | `rgba(56,189,248,0.14)` |
| `--app-accent` | `#38bdf8` |
| `--app-danger` | `#f87171` |
| `--app-success` | `#4ade80` |
| `--app-warning` | `#facc15` |
| `--app-ring` | `#38bdf8` |

## Reglas

- No agregar nuevos colores hexadecimales en pantallas migradas si existe un token equivalente.
- Usar `--app-surface` para paneles, popovers, tarjetas y topbars.
- Usar `--app-surface-soft` para inputs, encabezados de tabla y fondos internos.
- Usar `--app-primary` solo para acciones, seleccion, foco e iconos activos.
- Usar `--app-text-muted` para labels y ayuda, no para texto importante.
- El modo oscuro se activa con `html[data-theme="dark"]`.
- El modo automatico se resuelve desde `theme.js` usando `prefers-color-scheme`.
- Las pantallas nuevas deben cargar `/theme.js` antes de `/styles.css`.

## Componentes

### Scrollbar Azul (Detalle de Costos)

Ubicacion: `calculo-flexografia/styles.css` - seccion de detalles del calculo.

```css
/* Light mode */
.details-cost-shell {
  max-height: min(52vh, 520px);
  overflow: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(11, 129, 184, 0.42) transparent;
}

.details-cost-shell::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.details-cost-shell::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(11, 129, 184, 0.38);
}

.details-cost-shell::-webkit-scrollbar-track {
  background: transparent;
}

/* Dark mode: no tiene override. Misma apariencia en ambos temas. */
```

### Campo con Prefijo y Sufijo (display-input-wrap)

Patron reutilizable para campos que muestran simbolos de moneda ($,₡) o unidades (min, ft, kg, BCM, %). La funcion JavaScript `displayInput()` acepta `prefix` y `suffix` como parametros configurables.

Ejemplos de uso:
- `costPerFoot`: `{ prefix: "$", suffix: "/pie" }` → `$0.045/pie`
- `plateCost`: `{ prefix: "$" }` → `$120.00`
- `setupMinutes`: `{ suffix: "min" }` → `45.00 min`
- `costoLbCmyk`: `{ prefix: "$", suffix: "lb" }` → `$3.50 lb`

```css
/* Light mode */
.display-input-wrap {
  position: relative;
  min-width: 0;
  min-height: 42px;
}

.display-input-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.display-input-wrap.has-prefix .display-input-mask,
.display-input-wrap.has-currency .display-input-mask {
  justify-content: flex-start;
}

.display-input {
  font-variant-numeric: tabular-nums;
  color: transparent;
  caret-color: var(--text);
}

/* Campo readonly */
.readonly-display .display-input {
  pointer-events: none;
}

/* Dark mode */
html[data-theme="dark"] .display-input-wrap,
html[data-theme="dark"] .display-input-mask {
  background: color-mix(in srgb, var(--card) 82%, var(--bg)) !important;
  color: var(--text) !important;
  border-color: var(--line) !important;
  box-shadow: none !important;
}

html[data-theme="dark"] .display-input-mask {
  background: #111c30 !important;
  color: var(--text) !important;
}
```

Uso en HTML (generado por JS):
```html
<!-- Campo editable con $ y /pie -->
<div class="display-input-wrap has-prefix">
  <input class="display-input" type="number" step="0.000001" value="0.045">
  <span class="display-input-mask">$0.045/pie</span>
</div>

<!-- Campo readonly -->
<div class="display-input-wrap readonly-display">
  <input class="display-input" type="text" value="$0.045" readonly>
  <span class="display-input-mask">$0.045</span>
</div>
```

### Tabs Unificados (config-tabs)

Patron unico para todos los tabs del proyecto: configuracion, costos, diseno, seguridad, SAP, documentos. Todos comparten el mismo formato visual.

```css
/* Light mode */
.config-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 4px;
  border: 1px solid #d8e2ea;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7fafc 0%, #eef4f8 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}

.config-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  padding: 10px 18px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: #60707f;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  white-space: nowrap;
  transition: background-color 0.18s ease, color 0.18s ease,
              box-shadow 0.18s ease, transform 0.18s ease;
}

.config-tab:hover {
  background: rgba(11,129,184,0.08);
  color: #23516a;
}

.config-tab.active {
  background: linear-gradient(180deg, #24a8df 0%, #118fc6 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(17,143,198,0.24);
}

/* Dark mode */
html[data-theme="dark"] .config-tabs {
  border-color: var(--app-border) !important;
  background: transparent !important;
  box-shadow: none !important;
}

html[data-theme="dark"] .config-tab {
  color: var(--app-text-muted) !important;
}

html[data-theme="dark"] .config-tab:hover {
  background: var(--app-primary-soft) !important;
  color: var(--app-text) !important;
}

html[data-theme="dark"] .config-tab.active {
  background: linear-gradient(180deg, #24a8df 0%, #118fc6 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 18px rgba(17,143,198,0.24) !important;
}
```

### Section Caption Pill (Titulos de Seccion)

Titulos pill azul que aparecen en las secciones de la orden de produccion: "Cliente", "Seguimiento de la Orden", "Configuracion de Produccion", etc.

```css
/* Light mode */
.socios-section .section-caption {
  display: inline-flex;
  align-items: center;
  margin-bottom: 9px;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(11, 129, 184, 0.12) 0%, rgba(11, 129, 184, 0.06) 100%);
  color: #0b6f9b;
  font-weight: 700;
}

/* Dark mode: no tiene override explicito en produccion. */
```

### Production Chip (Acabados)

Etiquetas que aparecen en la orden de produccion para los acabados (barniz, laminado, etc.).

```css
/* Light mode */
.production-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eff6fa;
  color: #335167;
  font-size: 14px;
  font-weight: 600;
}

.production-chip-muted {
  background: #f4f6f8;
  color: #748290;
}

/* Dark mode: no tiene override explicito. */
```

### Pills de Estado (Cotizaciones)

Pills que muestran el estado de una cotizacion: solicitada, cotizada, finalizada, etc.

```css
/* Light mode */
.quote-tracking-status {
  display: inline-flex;
  max-width: 130px;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--color-background-info);  /* #edf7fd */
  color: var(--color-text-info);             /* #0b81b8 */
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dark mode via variables CSS */
/* --color-background-info: rgba(56, 189, 248, 0.14) */
/* --color-text-info: #38bdf8 */
```

### Boton Flotante (FAB)

Boton circular flotante para acciones principales.

```css
/* Light mode */
.floating-action-button {
  touch-action: none;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  min-width: 25px;
  height: 58px;
  min-height: 25px;
  padding: 10px 12px;
  border: 1px solid rgba(11, 129, 184, 0.18);
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(237,247,253,0.98) 100%);
  color: var(--floating-icon-color, #0b81b8);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
}

/* Dark mode */
html[data-theme="dark"] .floating-action-button {
  background: color-mix(in srgb, var(--app-surface) 88%, var(--app-primary-soft));
  color: var(--app-primary);
  border-color: color-mix(in srgb, var(--app-primary) 28%, var(--app-border));
}
```

### Badges (Notificaciones y Tracking)

Badges para indicadores numericos y estados en iconos.

```css
/* Badge de notificacion (campanita del dashboard) */
.dashboard-bdfg-badge {
  position: absolute;
  top: -2px;
  right: -1px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 500;
  border: 1px solid var(--app-surface, #fff);
  box-shadow: 0 6px 12px rgba(127, 29, 29, 0.2);
}

.dashboard-bdfg-badge.is-dot {
  top: 2px;
  right: 3px;
  min-width: 7px;
  width: 7px;
  height: 7px;
  padding: 0;
  border-width: 1px;
}

/* Badge de check (tracking - paso completado) */
.tl-check-badge {
  position: absolute;
  bottom: -2px;
  right: -3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #16a34a;
  border: 2.5px solid var(--color-background-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 3;
}

/* Badge de advertencia (tracking) */
.tl-warn-badge {
  position: absolute;
  bottom: -2px;
  right: -3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #d97706;
  border: 2.5px solid var(--color-background-primary);
}

/* Dark mode: colores fijos (rojo, verde, ambar) que funcionan en ambos temas. */
```

## Migracion Recomendada

1. Migrar estructura global: body, topbar, workspace, navegacion.
2. Migrar componentes compartidos: inputs, tablas, botones, popovers.
3. Migrar modulos por prioridad: dashboard, cotizaciones, catalogos, costos, configuracion.
4. Eliminar colores directos solo despues de verificar visualmente cada modulo.
