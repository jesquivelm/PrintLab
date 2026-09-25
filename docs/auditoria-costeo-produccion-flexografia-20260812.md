# Auditoría de Costeo y Proceso Productivo — Flexografía

**Fecha:** 2026-08-12
**Alcance solicitado:** Todo el sistema de costeo (Flexografía, Convencional, Acabados, Coldfoil) — máquinas, fórmulas de costo y proceso productivo, contrastado contra fuentes oficiales.

---

## 1. Metodología y fuentes usadas

- **Código y configuración del proyecto:** `sql/SCHEMA_REAL_DATABASE.sql`, `server.js` (`DEFAULT_COSTS_CONFIG`, `loadFlexoCatalogsFromDb()`), `public/calculo-flexografia/app.js` (motor de cálculo), `scripts/import-master-data.js`, `docs/regular-spec.md`, `docs/informe-gerencial-proyecto-flexografia-sap.md`, `docs/fusion-inicial.md`.
- **Base de datos local** (`printlab` en `localhost:5432`, credenciales de prueba definidas en `AGENTS.md`): consulta directa a las tablas `maquina` y `maquina_capacidad` para ver qué hay configurado *en la práctica*, no solo el esquema.
- **Fuentes externas oficiales:**
  - HP — ficha técnica HP Indigo 6K / 6K+ (hp.com).
  - Gallus Group / Heidelberg — ficha técnica Gallus Labelmaster.
  - AB Graphic International — Digicon Series 3 / Fast Track Die Cutting (abgint.com).
  - Flexographic Technical Association (FTA) — benchmark de merma de arranque ("makeready waste").
  - Literatura técnica de anilox/BCM y transferencia de tinta (Giugni, Luminite, PFFC, foros técnicos especializados en flexografía).
  - ISO 12647-6 (referencia sobre estandarización de densidad/color en flexo).

**Limitación honesta y central de esta auditoría:** ver sección 2.

---

## 2. Hallazgo crítico — el catálogo de máquinas real NO está en archivos ni en esta base de datos

El esquema (`sql/SCHEMA_REAL_DATABASE.sql:1874-1943`) sí modela correctamente una máquina real: nombre, marca, modelo, velocidad, ancho máximo, costo hora máquina/operario, tiempos de montaje, fórmulas de tiempo/costo, parámetros digitales, merma por máquina, etc. Ese diseño es razonable y está bien alineado con lo que un motor de costeo necesita.

Sin embargo, al consultar la base de datos local que usa este entorno de trabajo, **solo existen 2 máquinas, y ambas parecen datos de prueba, no el catálogo real de planta**:

| Máquina | Tipo | Velocidad configurada | Ancho máx. | Costo hora máquina/operario |
|---|---|---|---|---|
| `BROTECH FS420` | Híbrido | 42 / 26 m/min (CMYK / extendida) | 19" | — |
| `Gallus Labelmaster` | Convencional | 80 (unidad `m/min`) | 17" | $76 / $18 |

Dos problemas concretos:

1. **`BROTECH FS420` no corresponde a ninguna prensa comercial identificable**, y sus valores (`42`, `26`, gramaje CMYK `1.5`, gramaje blanco `4`, factor de merma `1.1`) son **exactamente iguales, dígito por dígito**, a los valores por defecto embebidos en `server.js:1608-1780` (`DEFAULT_COSTS_CONFIG.digital`). Esto indica que la máquina nunca fue calibrada con datos reales — solo heredó el default de fábrica del sistema.
2. `docs/fusion-inicial.md` y `scripts/import-master-data.js:552-609` confirman que las máquinas reales de la planta se llaman **SRI, MÁQUINA P5, INDIGO 6000 (HP Indigo digital) y ABG VERICUT (acabado/troquelado)**, provenientes de un archivo Excel histórico (`Registros Calculos Flexografia Setiembre 2025.xlsx`). **Ninguna de esas cuatro máquinas existe en la base de datos consultada.**

**Consecuencia:** no fue posible auditar los parámetros de las máquinas reales de producción contra sus fichas técnicas oficiales, porque esos datos reales no están cargados en el entorno donde se hizo la auditoría. Lo que sí se pudo hacer es: (a) auditar las **fórmulas** del motor de cálculo (que no dependen de qué máquina se use), y (b) auditar los **valores por defecto** del sistema, y (c) comparar los 2 registros de prueba existentes contra la ficha oficial del modelo que dicen representar, a modo de verificación de plausibilidad.

---

## 3. Auditoría de máquinas configuradas vs. fichas oficiales

### 3.1 `Gallus Labelmaster` (Convencional) — desalineado con la ficha oficial

- **Configurado:** velocidad de producción `80` (unidad declarada `m/min`), ancho máx. `17"`, costo hora máquina `$76`, costo hora operario `$18`, `45 min` de preparación general + `8 min` por estación.
- **Ficha oficial Gallus Group/Heidelberg:** la Gallus Labelmaster alcanza **hasta 200 m/min** con registro absoluto, cilindros de `8" a 25"`, camino de banda corto (1.4 m) para reducir merma.
- **Hallazgo:** `80 m/min` es **60% menor** que la velocidad máxima oficial de la prensa (200 m/min). El ancho de `17"` sí es plausible (modelos Labelmaster 340/440 rondan 13"–17" de ancho útil).
- **No es necesariamente un error** — puede ser una velocidad operativa real y conservadora (sustratos difíciles, trabajos complejos rara vez corren a velocidad máxima de catálogo). Pero como es un dato de prueba y no viene de una calibración documentada, **se recomienda verificar con el equipo de producción si `80` es la velocidad efectiva real de la Gallus en planta o si es un valor placeholder**.

### 3.2 `BROTECH FS420` (Híbrido/Digital) — no verificable, y sospechoso de ser puro placeholder

- No existe una prensa comercial identificable bajo el nombre "BROTECH FS420" en fuentes públicas de fabricantes de equipo de impresión de etiquetas. Es probable que sea un nombre interno/genérico o un registro de prueba.
- Sus valores digitales (`42` / `26` m/min, gramaje `1.5` g/m² CMYK, `4` g/m² blanco, factor de merma `1.1`) **coinciden exactamente con los defaults de fábrica del sistema**, no con una calibración propia.
- Si esta máquina representa en la práctica a la **HP Indigo 6000** mencionada en la documentación interna, hay una discrepancia relevante: la ficha oficial HP Indigo 6K reporta **~30 m/min en modo 4 colores, ~40 m/min en modo EPM (alta productividad), y hasta 60 m/min en modo 1–2 colores**. El sistema tiene `42` como velocidad "CMYK" (por encima del modo 4 colores oficial de 30 m/min) y `26` como velocidad "extendida" (por debajo del modo EPM oficial de 40 m/min) — es decir, **la relación entre los dos modos está invertida respecto a cómo funciona la prensa real** (en la HP Indigo, el modo extendido/EPM es más rápido que el modo estándar, no más lento).

**Recomendación:** si `BROTECH FS420` es en realidad la HP Indigo 6000 de planta, sus velocidades deben recalibrarse contra la ficha técnica real de la unidad instalada (la velocidad efectiva puede diferir de la de catálogo según configuración de estaciones y sustrato, pero la relación "extendida > estándar" debería mantenerse). Si es una máquina distinta, debe documentarse su origen y calibrarse con datos propios en vez de heredar el default del sistema.

### 3.3 Máquinas de acabado (ABG Vericut) — sin datos que auditar

`ABG VERICUT` no aparece en la base de datos consultada, por lo que no hay velocidad, ancho ni costo configurado que comparar. Como referencia para cuando se cargue: la línea Digicon Series 3 / Fast Track Die Cutting de AB Graphic corre en **modo semirrotativo hasta 150–180 m/min**, con anchos de banda de 430–540 mm (~17"–21").

---

## 4. Auditoría de fórmulas de costeo (motor de cálculo)

Esta parte del sistema **sí es auditable de forma independiente de qué máquina se use**, porque las fórmulas están en `public/calculo-flexografia/app.js` y los valores por defecto en `server.js:1608-1780`.

### 4.1 Transferencia de tinta anilox → sustrato — ✅ consistente con estándar de industria

- **Sistema:** `factorTransferencia: 0.3` (30%) para tinta general; `0.35` (35%) para barniz UV.
- **Referencia técnica (Giugni, Luminite y literatura de anilox):** solo **25%–30%** del volumen de tinta cargado en el anilox se transfiere efectivamente al sustrato (25% en película plástica, hasta 30% en papel/cartón).
- **Conclusión:** el valor de `0.3` está exactamente en el límite superior del rango real. Correcto. El `0.35` de barniz no tiene referencia pública exacta, pero es razonable que un barniz de mayor fluidez transfiera un poco más que tinta pigmentada.

### 4.2 Volúmenes de anilox (BCM) por tipo de elemento — ✅ consistente

| Elemento del sistema | BCM configurado | Rango de referencia técnica |
|---|---|---|
| Policromía CMYK | 2 | Imágenes de proceso: 2.0–3.5 BCM |
| Textos/Líneas | 4 | — (dentro de rango razonable entre proceso y sólidos) |
| Fondos Sólidos/Blancos | 7 | Sólidos: 4–8 BCM |
| Barniz UV | 7 | — (consistente con anilox de alto volumen típico para barniz) |

Los 4 valores caen dentro o cerca de los rangos publicados para cada tipo de elemento. No se detectan anomalías.

### 4.3 Fórmula de consumo de tinta convencional — ✅ correcta en su forma, con una nota

Fórmula del sistema (`app.js:2605-2618`):

```
Consumo por color (kg) = (Área impresa in² × Cobertura% × BCM_Anilox × FactorTransferencia × Densidad × 0.001) / 1000
```

Esto es **directamente proporcional al BCM** (a mayor volumen de anilox, mayor consumo), lo cual es físicamente correcto y coincide con la explicación técnica estándar ("a higher BCM indicates larger cells capable of holding and delivering more ink, leading to potentially higher ink consumption"). Una fuente secundaria consultada mostraba una fórmula que *divide* entre BCM en lugar de multiplicar — esa fuente es inconsistente con su propia explicación conceptual (la misma página reconoce que más BCM = más tinta) y se descarta como fórmula de referencia errónea, no como corrección a aplicar aquí.

**Nota de revisión, no error confirmado:** el sistema usa una única `densidadUv: 1.5` g/cm³ aplicada a todos los colores por igual (CMYK, pantone, blanco). En la práctica, la densidad de tinta varía bastante entre colores de proceso (típicamente 1.0–1.2 g/cm³) y tintas blancas/opacas cargadas con TiO₂ (más densas). Aplicar una sola densidad a todos los colores puede sobre- o sub-estimar el consumo real según el color. **Recomendación:** confirmar con el proveedor de tintas si conviene diferenciar densidad por tipo de tinta, en vez de un solo valor global. No se modificó nada — se deja como punto a decidir por Gerencia/Producción.

### 4.4 Merma de montaje y de tiraje — ✅ dentro del benchmark FTA

- **FTA (benchmark de industria):** la merma de arranque ("makeready waste") representa **3%–8% del consumo total de sustrato** por trabajo, y crece con la velocidad de prensa.
- **Sistema** (`maculaTiraje[]`, `server.js:1658-1707`): Impresión 3%, +Troquelado 4%, +Laminado 7%, +Embosado 8% (acumulativo según combinación de procesos activos).

Los porcentajes configurados caen **exactamente dentro del rango de 3%–8%** que reporta la FTA, incluso en su forma acumulativa (más procesos inline = más merma, que es el comportamiento esperado). No se detectan anomalías.

### 4.5 Consumo de tinta digital (HP Indigo / prensas digitales) — razonable, sin referencia exacta para contrastar

- **Sistema:** CMYK `1.5 g/m²`, blanco `4 g/m²`, factor de merma digital `1.1` (10% extra).
- Una fuente de flexografía convencional citaba 0.4–0.7 g/m² para proceso y 0.5–1.0 g/m² para blanco, pero **esa referencia es para tinta flexo convencional, no para ElectroInk de HP Indigo**, que es una tecnología distinta (transferencia electrostática, no anilox) y con consumos por capa reportados en ese orden de magnitud (1–2 g/m² por color, blanco más alto por necesidad de opacidad). Los valores del sistema son plausibles para tecnología Indigo, pero no se encontró una ficha técnica pública de HP con gramaje exacto por m² para confirmarlo con precisión — **se recomienda contrastar contra el reporte de consumo real del equipo (HP Indigo expone estos datos en su software de gestión de prensa) en vez de solo la ficha comercial**.

### 4.6 Secuencia de totales (costo directo → indirectos → margen → impuestos) — ✅ consistente entre documentación y código

`docs/regular-spec.md:75-87` documenta la secuencia: subtotal de costos → imprevistos → financieros → rendimiento bruto → subtotal antes de IVA → IVA → total → unitario. La función `totals()` en `app.js:6541-6592` implementa exactamente esa secuencia (`industrial → overhead → margin → discount → tax → total`). No hay discrepancia entre lo documentado y lo implementado.

---

## 5. Auditoría del proceso productivo documentado vs. implementado

`docs/informe-gerencial-proyecto-flexografia-sap.md` (líneas 45–176) describe el desglose técnico completo del cálculo: Troquel → Sustrato → Diseño/Arte → Preprensa → Planchas → Impresión/Tintas/Macula → Acabados (laminado, barniz, estampado, embosado, numerado, troquelado, rebobinado) → Empaque/Despacho → Escalera comercial.

Se verificó que **cada uno de esos bloques tiene su función correspondiente implementada en `app.js`** (`calcTroquel`, `calcSustrato`, `calcDesign`, `calcPrepress`, `calcPlates`, `calcPrint`, `calcFinishes`, `calcPackaging`, `totals`), con fórmulas que coinciden conceptualmente con lo descrito en el documento gerencial. No se encontraron bloques documentados que falten en el código, ni bloques del código sin respaldo en la documentación.

El mismo documento (línea ~530) deja explícito el criterio de gobierno de datos: SAP gobierna maestros/inventario/documentos oficiales; **la aplicación gobierna fórmulas de producción, matrices de merma, tiempos, máquinas y ficha técnica** — y advierte no usar listas de precio SAP (`ITM1`) como costo técnico real. Este criterio es coherente con lo que se observó en el código: los precios de insumos y parámetros técnicos viven en `DEFAULT_COSTS_CONFIG`/BD local, no en SAP.

`docs/fusion-inicial.md` ya señalaba como brecha pendiente que **"no existe aún importador adaptado a los archivos actuales del proyecto ERP nuevo"** — esto coincide con lo encontrado en la sección 2: la única vía de importar máquinas reales (`scripts/import-master-data.js`) apunta a un archivo Excel histórico de septiembre 2025, y el catálogo cargado en la BD local de prueba no refleja ese importador ni esas máquinas.

---

## 6. Resumen de hallazgos

| # | Hallazgo | Severidad | Acción sugerida |
|---|---|---|---|
| 1 | El catálogo de máquinas reales de planta (SRI, MÁQUINA P5, INDIGO 6000, ABG VERICUT) no está cargado en la base de datos disponible; solo hay 2 registros de prueba | **Alta** — bloquea cualquier auditoría numérica real de máquinas | Cargar/confirmar el catálogo real de máquinas antes de considerar el sistema listo para costeo en producción |
| 2 | `BROTECH FS420` tiene velocidades y gramajes idénticos a los defaults de fábrica del sistema (no calibrados) | Media | Confirmar si representa una máquina real y calibrarla, o eliminarla si es solo dato de prueba |
| 3 | Si `BROTECH FS420` representa la HP Indigo 6000: la relación entre "velocidad CMYK" (42) y "velocidad extendida" (26) está invertida respecto al comportamiento real de la prensa (el modo extendido/EPM debería ser el más rápido) | Media-Alta | Verificar y corregir la calibración de velocidades digitales contra la ficha real del equipo |
| 4 | `Gallus Labelmaster` está configurada a 80 m/min, 60% por debajo de su velocidad máxima oficial (200 m/min) | Baja-Media (puede ser velocidad operativa real y no un error) | Confirmar con producción si 80 m/min es la velocidad efectiva real |
| 5 | Densidad de tinta única (`1.5`) aplicada a todos los colores por igual, sin diferenciar CMYK/pantone/blanco | Baja | Evaluar con proveedor de tintas si conviene una densidad por tipo de tinta |
| 6 | Fórmulas de transferencia de tinta, BCM por tipo de elemento, y porcentajes de merma de tiraje están **correctamente alineados** con los estándares de industria (FTA y literatura técnica de anilox) | — (positivo) | Ninguna — no requiere cambios |
| 7 | La secuencia de costeo (directo → indirectos → margen → impuestos) documentada y la implementada coinciden exactamente | — (positivo) | Ninguna — no requiere cambios |

---

## 7. Lo que esta auditoría NO pudo verificar (limitaciones honestas)

- **No se pudo auditar el catálogo real de máquinas de planta** (SRI, MÁQUINA P5, INDIGO 6000, ABG VERICUT) porque esos registros no existen en la base de datos disponible en este entorno de trabajo. Solo se auditaron 2 registros de prueba.
- **No se pudo verificar el consumo real de tinta reportado por el equipo HP Indigo** (el software de gestión de la prensa suele exponer estos datos con precisión) — la comparación hecha aquí es contra fichas comerciales, no contra telemetría real del equipo.
- **No se pudo verificar la razonabilidad de los precios en dólares** (`costoKgCmyk: 55.1156`, `costoKgBlanco: 66.1387`, `costoKgPantone: 77.1618`, costo hora máquina/operario) contra listas de precio de proveedores actuales — son datos financieros internos, específicos de contrato/proveedor, no comparables contra una fuente pública general.
- **No se auditaron en profundidad** `docs/catalog-integration-plan.md`, `docs/importacion-2026-03-29.md`, `docs/sync-session-20260729.md`, `docs/database-portability.md` — por su título no parecen tratar costeo/máquinas de flexografía directamente, pero no se descarta que contengan información relevante no revisada.
- No se modificó ningún archivo de código ni de configuración como parte de esta auditoría — es un informe de solo lectura.

---

## 8. Conclusión

Las **fórmulas de costeo del motor de cálculo** (transferencia de tinta, volúmenes de anilox, merma de tiraje/montaje, secuencia comercial de totales) están bien alineadas con estándares publicados de la industria flexográfica (FTA y literatura técnica de anilox/BCM) — no se encontraron errores conceptuales en las fórmulas mismas.

El problema real no está en las fórmulas, sino en los **datos de entrada**: el catálogo de máquinas configurado en el entorno auditado no corresponde a las máquinas reales de planta mencionadas en la documentación interna del proyecto, y al menos un registro parece ser un placeholder sin calibrar. Antes de confiar en el costeo para producción, se recomienda priorizar la carga y calibración del catálogo real de máquinas (hallazgo #1) sobre cualquier ajuste a las fórmulas.
