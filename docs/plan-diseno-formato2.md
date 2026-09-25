# Plan de diseño — Formato 2 (app móvil vendedores PrintLab)

## Sujeto
Vendedores de una imprenta de etiquetas (flexografía). No les gusta usar apps; aprenden
lento. La app debe ser un "bolsillo de trabajo": 3 puertas grandes, cero ambigüedad,
botones del tamaño del pulgar, resultado en ≤2 toques.

## Principios
1. **Tres puertas**: Pedir cotización, Nuevo prospecto, Órdenes. Todo lo demás es secundario.
2. **Números antes que palabras**: los KPIs de "Tu Actividad" son el contenido del inicio.
3. **Cero jerga**: "Pedir cotización" (no "crear línea"), "Prospecto" (no "socio de negocios").
4. **Una pantalla = una tarea**. Sin menús anidados.

## Color (base impresa: tinta sobre papel)
- `--tinta #0e2a3a` texto principal (azul tinta profundo)
- `--papel #f4f7f9` fondo (papel blanco frío, no crema)
- `--cian #0891b2` acción primaria (cian de imprenta)
- `--magenta #d6336c` alertas / seguimiento
- `--ambar #d97706` pendientes
- `--verde #059669` facturado / ok
- Dark mode espejo: papel→#0f1922, tinta→#e8f0f4.

## Tipografía
- **Bahnschrift / Segoe UI Variable Display**: display condensado para números y títulos —
  evoca la tipografía condensada de embalaje y etiquetas.
- **Segoe UI** para cuerpo. Sin serifas, sin monospace.

## Layout
- Header compacto con saludo y nombre del vendedor + campana.
- **Banda de KPIs**: carrusel horizontal con snap (Cotizado este mes, Facturado, Pendientes
  por cotizar, Órdenes en proceso, Leads), cada tarjeta con mini-sparkline como Tu Actividad.
- **3 botones grandes de acción** (filas enteras, tamaño pulgar).
- Secciones apiladas: Órdenes en proceso (anillo de avance), Seguimiento pendiente,
  Top clientes, Leads.
- Tab bar inferior de 3 pestañas: Inicio / Cotizaciones / Prospectos. Sin menú hamburguesa.

## Wireframe
```
┌──────────────────────────┐
│ Hola, José        (bell) │
│ [KPI ◀ carrusel ▶]       │
│ ┌────────┐┌────────┐     │
│ │$Cotiz ▲││$Factr ▲│ …   │
│ └────────┘└────────┘     │
│ ┌──────────────────────┐ │
│ │  ＋ Pedir cotización │ │
│ ├──────────────────────┤ │
│ │  ◉ Nuevo prospecto   │ │
│ ├──────────────────────┤ │
│ │  ▤ Ver mis órdenes   │ │
│ └──────────────────────┘ │
│ Órdenes en proceso (5)   │
│  OP-0231 ▓▓▓░ 60% …      │
│ Seguimiento (2)          │
├──────────────────────────┤
│ ⌂      ⇧      ◉          │
└──────────────────────────┘
```

## Autocrítica vs. plantilla genérica
- NO tarjetas idénticas: los botones de acción son filas enteras, no un grid uniforme.
- NO fondo crema + serif + terracota: papel frío + cian/magenta de imprenta.
- NO eyebrow all-caps sobre cada sección; el número grande condensado es el que habla.
- El carrusel KPI con snap es el momento distintivo de la pantalla de inicio.
