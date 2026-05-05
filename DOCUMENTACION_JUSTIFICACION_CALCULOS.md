# Documentación de Justificación de Cálculos - Sistema de Cotizaciones Flexográficas

## Índice
1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis de Cálculos de Métricas](#2-análisis-de-cálculos-de-métricas)
3. [Análisis de Cálculos de Costos](#3-análisis-de-cálculos-de-costos)
4. [Lo que está Bien](#4-lo-que-está-bien)
5. [Problemas Identificados](#5-problemas-identificados)
6. [Lo que Falta (Gaps)](#6-lo-que-falta-gaps)
7. [Recomendaciones de Mejora](#7-recomendaciones-de-mejora)
8. [Anexos: Fórmulas Detalladas](#8-anexos-fórmulas-detalladas)

---

## 1. Resumen Ejecutivo

El sistema de cotizaciones flexográficas del ERP **Codexv15** implementa cálculos para:
- **Métricas físicas**: MSI, pies, área m², peso kg
- **Costos de materiales**: Por MSI o por KG
- **Costos de procesos**: Preprensa, montaje, impresión, tintas, acabados

**Hallazgo principal**: Los cálculos matemáticos base son **correctos**, pero existen **problemas de modelado** que pueden llevar a cotizaciones inexactas:

| Categoría | Estado | Impacto |
|--------------|--------|---------|
| Conversión de unidades | ✅ Correcto | Bajo |
| Cálculo de área/longitud | ✅ Correcto | Bajo |
| Costo de material | ✅ Correcto en fórmula, ⚠️ Falta desglose adhesivo/liner | Medio |
| Costo de montaje/planchas | ⚠️ **Problema: Solo calcula tiempo, no material de planchas** | **ALTO** |
| Costo de tintas | ⚠️ **Problema: Todas cuestan igual** | **ALTO** |
| Lavados entre tintas | ❌ **Falta implementar** | **ALTO** |
| Costos de muestras | ❌ **Falta** | Medio |
| Mantenimiento/depreciación | ❌ **Falta** | Bajo-Medio |

---

## 2. Análisis de Cálculos de Métricas

### 2.1 MSI (Miles de Pulgadas Cuadradas)

**Archivo**: `services/flexo-engine/dist/domain/flexo-regular-calculator.js`  
**Línea**: 24

```javascript
const msiBase = (anchoRollo * largoTotalPulgadas) / 1000;
const msiConMerma = msiBase * mermaFactor;
```

**Justificación matemática**:
- 1 MSI = 1,000 pulgadas cuadradas
- Fórmula: (Ancho en pulgadas) × (Largo total en pulgadas) ÷ 1,000
- **✅ Correcto**: La fórmula es matemáticamente exacta para calcular MSI.

**Ejemplo numérico**:
```
Ancho rollo = 8.5"
Largo total = 1,250"
MSI Base = (8.5 × 1,250) / 1000 = 10.625 MSI
Con merma 8% = 10.625 × 1.08 = 11.475 MSI
```

### 2.2 Pies Lineales

**Línea**: 22

```javascript
const piesLineales = largoTotalPulgadas / 12;
const piesLinealesConMerma = piesLineales * mermaFactor;
```

**Justificación matemática**:
- 1 pie = 12 pulgadas
- Fórmula: Pulgadas ÷ 12 = Pies
- **✅ Correcto**: Conversión estándar.

### 2.3 Área en Metros Cuadrados

**Línea**: 26

```javascript
const areaM2 = (anchoRollo * 0.0254) * (largoTotalPulgadas * 0.0254);
```

**Justificación matemática**:
- 1 pulgada = 0.0254 metros (exacto)
- Fórmula: (pulgadas × 0.0254)²
- **✅ Correcto**: Conversión exacta de unidades imperiales a métricas.

### 2.4 Peso en Kilogramos

**Línea**: 27

```javascript
const pesoKg = areaM2 * ((parametros.gramaje ?? 0) / 1000) * mermaFactor;
```

**Justificación matemática**:
- Gramaje: g/m²
- Conversión: g/m² ÷ 1000 = kg/m²
- Fórmula: Área(m²) × (Gramaje ÷ 1000) × Merma
- **✅ Correcto**: Conversión de masa apropiada.

### 2.5 Cálculo de Cantidad de Etiquetas por Fila

**Línea**: 18-19

```javascript
const pasosPorLinea = Math.max(1, Math.floor(
    (anchoRollo + separacionHorizontal) / 
    Math.max(0.01, entrada.dimensiones.anchoEtiquetaIn + separacionHorizontal)
);
```

**Justificación**:
- Calcula cuántas etiquetas caben en el ancho del rollo considerando separación
- **✅ Correcto**: Lógica de ajuste es apropiada.

### 2.6 Cálculo de Filas Necesarias

**Línea**: 20

```javascript
const filas = Math.ceil(entrada.cantidadProductos / pasosPorLinea);
```

**Justificación**:
- Redondeo hacia arriba (Math.ceil) porque no puedes imprimir media fila
- **✅ Correcto**: Uso apropiado de función techo.

---

## 3. Análisis de Cálculos de Costos

### 3.1 Costo de Material

**Líneas**: 45-47

```javascript
const costoMaterial = (parametros.costoMaterialPorKg ?? 0) > 0 && (parametros.gramaje ?? 0) > 0
    ? metricas.pesoKg * (parametros.costoMaterialPorKg ?? 0)
    : metricas.msiConMerma * (parametros.costoMaterialPorMsi ?? 0);
```

**Justificación**:
- Si hay costo por kg Y gramaje → usar peso kg
- Si no → usar MSI
- **✅ Correcto**: Lógica de selección de unidad es apropiada.

**PROBLEMA**: No diferencia entre:
- Cara (face stock) y adhesivo
- Liner (release liner)  
- En etiquetas autoadhesivas, el adhesivo puede ser 20-40% del costo del material.

### 3.2 Costo de Preprensa

**Líneas**: 48-51

```javascript
const costoPreprensaBase = parametros.costoHoraPreprensa ?? 0;
const costoPreprensaCambios = Math.max(0, (entrada.cantidadCambios ?? 1) - 1) *
    (parametros.minutosPreprensaPorCambio ?? 10) *
    safeDivide(parametros.costoHoraPreprensa ?? 0, 60);
```

**Justificación**:
- Base + (Cambios - 1) × Tiempo por cambio × (Costo/hora ÷ 60)
- **✅ Correcto**: Cálculo de tiempo-hombre estándar.

### 3.3 Costo de Montaje (Planchas) - ⚠️ PROBLEMA CRÍTICO

**Líneas**: 52-57

```javascript
const costoMontaje = entrada.procesoProductivo === "convencional"
    ? metricas.tintasEfectivas *
        (parametros.factorMontajePorEstacion ?? 6) *
        Math.max(1, entrada.cantidadCambios ?? 1) *
        (parametros.costoMinutoMaquina ?? 0)
    : 0;
```

**Análisis del problema**:

1. **Lo que calcula actualmente**: Tiempo de montaje en minutos × costo por minuto
   - #tintas × factor_estación × #cambios × costo_minuto_máquina
   - Esto es básicamente: **Costo de mano de obra para montar**

2. **Lo que FALTA**: El costo del material de las planchas (clichés/Cyrel)
   - En flexografía, las planchas tienen un costo por área (ej. $X por m² de Cyrel)
   - Fórmula que debería usarse:
     ```
     Costo planchas = (#tintas × área_planchas_cm² × costo_cliché_por_cm²) + 
                     (#tintas × procesamiento_revelado)
     ```
   - O más simple: `costoCyrel` (que existe como campo) debería ser **por área**, no un fijo

3. **Campo `costoCyrel`**: En línea 73 se aplica como costo fijo:
   ```javascript
   const costoCyrel = entrada.acabados?.cyrel ? parametros.costoCyrel ?? 0 : 0;
   ```
   - Esto asume que el costo de Cyrel es un valor único fijo para todo el trabajo
   - **INCORRECTO**: Debería ser proporcional al área de las planchas

**Impacto**: Si una plancha de 30×40cm cuesta $50 y usas 4 tintas = $200. Pero el sistema cobra un fijo de $X, lo cual es inexacto.

### 3.4 Costo de Tintas - ⚠️ PROBLEMA

**Líneas**: 58-62

```javascript
const costoTintas = metricas.tintasEfectivas > 0
    ? metricas.msiConMerma * (parametros.costoTintaPorMsi ?? 0) * metricas.tintasEfectivas
    : 0;
```

**Problema**:
- Asume que **todas las tintas cuestan lo mismo** por MSI
- En realidad:
  - Tintas estándar (process) = $X/MSI
  - Tintas especiales (Pantone) = $X × 1.5/MSI  
  - Tintas metalizadas = $X × 2/MSI
  - Blanco (alta cobertura) = $X × 1.2/MSI
  - Tintas fluorescentes = $X × 2/MSI

**Fórmula que debería usarse**:
```javascript
costoTintas = 
    (msiConMerma × costoTintaCMYK × 4) +  // Asume CMYK base
    (msiConMerma × costoTintaPantone × #pantones) +
    (msiConMerma × costoTintaBlanco × (blanco ? 1 : 0)) +
    (msiConMerma × costoTintaEspecial × #especiales);
```

### 3.5 Costo de Tiraje (Impresión)

**Línea**: 63

```javascript
const costoTiraje = metricas.minutosTiraje * (parametros.costoMinutoMaquina ?? 0);
```

**Justificación**:
- minutosTiraje = piesLinealesConMerma ÷ velocidadPiesPorMinuto
- Costo = minutos × costo_por_minuto
- **✅ Correcto**: Cálculo estándar de tiempo de impresión.

**PROBLEMA**: No considera:
- **Lavados entre tintas**: Si cambias de tinta, hay que lavar (waste time + material)
- **Tiempo de registro inicial**: Ajustar registro al inicio
- **Arranque (startup)**: Las primeras ~100-200 pies de material que salen mal

### 3.6 Acabados (Barniz, Laminado, Troquel, etc.)

**Líneas**: 64-77

```javascript
const costoLaminado = entrada.acabados?.laminado
    ? metricas.msiConMerma * (parametros.costoLaminadoPorMsi ?? 0) + (parametros.setupLaminado ?? 0)
    : 0;
// Similar para barniz
const costoTroquel = entrada.acabados?.troquel ? parametros.costoTroquel ?? 0 : 0;
```

**Justificación**:
- MSI × costo_por_MSI + setup_fijo
- **✅ Correcto para laminado/barniz**: Cálculo de consumo de material.

**PROBLEMAS**:
1. **Troquel**: Solo calcula costo fijo. Debería considerar:
   - Costo del troquel por uso (depreciación)
   - Vida útil: ej. 500,000 golpes
   - Costo por golpe = Costo_troquel ÷ 500,000

2. **Estampado (Foil)**: Solo calcula costo fijo. Debería considerar:
   - Costo del foil por metro
   - Ancho del foil vs ancho de etiqueta

---

## 4. Lo que está Bien ✅

| Cálculo | Justificación | Línea |
|----------|--------------|-------|
| **Conversión pulgadas → metros** | 0.0254 factor exacto | flexo-regular.js:26 |
| **Conversión pulgadas → pies** | ÷12 exacto | flexo-regular.js:22 |
| **MSI** | (ancho × largo) ÷ 1000 exacto | flexo-regular.js:24-25 |
| **Peso kg** | área_m² × (gramaje/1000) × merma | flexo-regular.js:27 |
| **Cálculo de filas** | Math.ceil() apropiado | flexo-regular.js:20 |
| **Etiquetas por fila** | floor((ancho + gap) ÷ (etiqueta + gap)) | flexo-regular.js:18-19 |
| **Merma global** | factor 1 + %merma | flexo-regular.js:17 |
| **Costo material MSI** | msiConMerma × costoPorMsi | flexo-regular.js:47 |
| **Costo material KG** | pesoKg × costoPorKg | flexo-regular.js:46 |
| **Preprensa cambios** | (#cambios-1) × tiempo × costo/60 | flexo-regular.js:49-51 |
| **Tiraje** | minutos × costoMinutoMáquina | flexo-regular.js:63 |
| **Laminado/Barniz** | MSI × costoPorMsi + setup | flexo-regular.js:64-70 |

---

## 5. Problemas Identificados ⚠️

### 5.1 Crítico: Costo de Plancas (Clichés/Cyrel)

**Archivo**: `flexo-regular-calculator.js`  
**Línea**: 52-57

**Problema**: El sistema calcula el **tiempo de montaje** pero NO el **costo del material de las planchas**.

**Cálculo actual**:
```javascript
costoMontaje = #tintas × factor × #cambios × costoMinutoMáquina
// Esto es solo mano de obra
```

**Cálculo que debería ser**:
```javascript
// Material de planchas
areaPlanchasCm2 = anchoPlacaCm × largoPlacaCm × #tintas;
costoMaterialPlanchas = areaPlanchasCm2 × costoPorCm2;

// Procesamiento (revelado, exposición)
costoProcesamiento = #tintas × costoReveladoPorPlaca;

// Montaje (mano de obra)
costoMontajeManoObra = #tintas × factor × #cambios × costoMinutoMáquina;

costoTotalMontaje = costoMaterialPlanchas + costoProcesamiento + costoMontajeManoObra;
```

**Por qué es crítico**: 
- Una plancha Cyrel de 30×40cm puede costar $40-80
- Para 4 tintas = $160-320 de material
- El sistema actual NO está cobrando esto (solo cobra el tiempo de montaje)

### 5.2 Alto: Costo de Tintas (No diferencia tipos)

**Línea**: 58-62

**Problema**: Todas las tintas cuestan igual por MSI.

**Cálculo actual**:
```javascript
costoTintas = msiConMerma × costoTintaPorMsi × #tintasEfectivas
// Asume que todas las tintas cuestan = costoTintaPorMsi
```

**Cálculo que debería ser**:
```javascript
costoTintas = 
    (msiConMerma × costoCMYK × 4) +                          // CMYK base
    (msiConMerma × costoPantone × #pantones) +           // Pantones
    (msiConMerma × costoBlanco × (blanco ? 1.2 : 0)) +   // Blanco (más tinta)
    (msiConMerma × costoMetalizada × #metalizadas);     // Metalizadas (más caras)
```

### 5.3 Alto: Lavados entre Tintas

**Problema**: No está implementado en el cálculo.

En flexografía, cuando cambias de tinta (ej. de Pantone 123 a Pantone 286), necesitas:
1. Lavar la unidad (10-20 minutos)
2. Consumo de solvente/agua
3. Consumo de trapos

**Fórmula sugerida**:
```javascript
lavadosCount = #cambiosDeTinta - 1;  // Solo después de la primera tinta
costoLavados = lavadosCount × (tiempoLavadoMin × costoMinuto) + 
                  (solventePorLavado × #lavados);
```

### 5.4 Alto: Cantidad de Tintas Efectivas

**Línea**: 3-12

**Problema**: El cálculo asume que CMYK siempre cuenta como 4 tintas, pero no considera si realmente usas las 4.

```javascript
const base = (entrada.tintas.cmyk ? 4 : 0) + ...
```

**Escenario problemático**:
- Si el cliente solo quiere **1 tinta Pantone** (sin CMYK)
- El sistema pondrá `base = 1` (Pantone)
- Pero si `cmyk = true`, pondrá `base = 4 + pantones`
- **Confusión**: ¿Qué significa `cmyk: true`? ¿Es "usar proceso CMYK" o "usar 4 tintas"?

**Recomendación**: Cambiar a:
```javascript
const tintasBase = entrada.tintas.cmyk ? (entrada.tintas.cmykCount || 4) : 0;
// Permitir especificar cuántas tintas CMYK realmente usa
```

---

## 6. Lo que Falta (Gaps) ❌

### 6.1 Costos de Materiales Compuestos (Etiquetas)

**Falta**: Diferenciar entre cara (face), adhesivo y liner.

**Estructura actual de materiales** (`sql/schema.sql`):
```sql
CREATE TABLE flexo_materials (
    id UUID PRIMARY KEY,
    material_code TEXT,
    cost_per_kg_usd NUMERIC(12,4),
    cost_per_linear_meter_usd NUMERIC(12,4),
    -- Faltan campos para:
    -- adhesive_cost_per_kg_usd
    -- liner_cost_per_m2_usd
    -- face_stock_cost_per_kg_usd
);
```

**Implementación sugerida**:
```sql
ALTER TABLE flexo_materials ADD COLUMN adhesive_cost_per_kg_usd NUMERIC(12,4) DEFAULT 0;
ALTER TABLE flexo_materials ADD COLUMN liner_cost_per_m2_usd NUMERIC(12,4) DEFAULT 0;
ALTER TABLE flexo_materials ADD COLUMN face_stock_cost_per_kg_usd NUMERIC(12,4);
```

**Fórmula de costo de material para etiquetas adhesivas**:
```
Costo Total = (Face Stock: kg × $/kg) + 
               (Adhesivo: kg × $/kg) + 
               (Liner: m² × $/m²)
```

### 6.2 Desperdicio de Arranque (Startup Waste)

**Código existe pero no está integrado completamente**:
- Campo `startupWasteFeet` existe en `app.js` (línea 2487, 2857, 3080)
- Se usa en el cálculo de longitud total
- **PROBLEMA**: No está incluido en el cálculo de **material consumido** propiamente

**Fórmula actual** (en `app.js:2858`):
```javascript
const totalLengthFeet = r(base.linealFeet + startupWasteFeet, 2);
// Pero el costo de material se calcula sobre totalLengthFeet
// y no se desglosa el desperdicio de arranque como un costo separado
```

**Recomendación**: Desglosar:
```
Material Total = (Neto: linealFeet × costo/pie) + 
                (Arranque: startupWasteFeet × costo/pie)
```

### 6.3 Guías Laterales (Side Guides)

En flexografía, se usan guías laterales para mantener el material alineado.
Esto genera un desperdicio en los bordes (ej. 2-5mm a cada lado).

**Falta**: No está considerado en el cálculo de ancho de material.

**Sugerencia**:
```javascript
anchoUtilMaterial = anchoRollo + (2 × guiaLateralMm × 0.03937); // convertir mm a pulgadas
// O simplemente: anchoMaterial = anchoRollo × 1.02 (2% extra para guías)
```

### 6.4 Costos de Muestras (Proofs)

**Falta**: No hay un campo o cálculo para muestras.

En el proceso de cotización, a menudo se requiere:
- Muestra de color (proof digital)
- Muestra de prensa (press proof)
- Aprobación del cliente

**Implementación sugerida**:
```javascript
costoMuestras = (muestraDigital ? costoMuestraDigital : 0) + 
                (muestraPrensa ? costoMuestraPrensa : 0) + 
                (fleteMuestra ? costoFlete : 0);
```

### 6.5 Mantenimiento y Depreciación de Máquina

**Falta**: No se considera el costo de mantenimiento ni depreciación.

**Sugerencia**:
```javascript
// Costo de mantenimiento (basado en horas de uso)
costoMantenimiento = minutosTiraje × (tasaMantenimientoPorMinuto);

// Depreciación (basado en vida útil)
depreciacionPorHora = costoMaquinaUSD ÷ vidaUtilHoras;
costoDepreciacion = (setupMinutos + runtimeMinutos) × depreciacionPorHora;
```

### 6.6 Energía y Servicios

**Falta**: Costos de:
- Electricidad (kW-h)
- Aire comprimido
- Agua para lavado

**Sugerencia**:
```javascript
consumoElectricidad = (hpMaquina × 0.746) × (tiempoTotalHoras) × costoKwH;
consumoAire = (cfmMaquina × tiempoHoras) × costoPorCf;
consumoAgua = (galonesPorLavado × #lavados) × costoPorGalon;
```

### 6.7 Costos Administrativos

**Falta**: Un porcentaje para gastos administrativos generales.

**Sugerencia**:
```javascript
// En el resumen (calcularResumen), agregar:
const subtotalConAdmin = subtotalCostosSinImpuestos * (1 + porcentajeAdmin);
// Donde porcentajeAdmin podría ser 5-10%
```

### 6.8 Descuentos por Volumen

**Falta**: No hay una tabla de descuentos por cantidad.

**Sugerencia**:
```javascript
descuento = 0;
if (cantidad >= 1000000) descuento = 0.15;  // 15% descuento
else if (cantidad >= 500000) descuento = 0.10; // 10% descuento
else if (cantidad >= 100000) descuento = 0.05;  // 5% descuento

totalConDescuento = total * (1 - descuento);
```

### 6.9 Troquel: Depreciación por Golpe

**Actual** (línea 71):
```javascript
const costoTroquel = entrada.acabados?.troquel ? parametros.costoTroquel ?? 0 : 0;
// Costo fijo
```

**Mejorado**:
```javascript
// Vida útil del troquel: 500,000 golpes (ejemplo)
costoPorGolpe = costoTroquel / 500000;
costoTroquelTrabajo = costoPorGolpe × cantidadProductos;
```

### 6.10 Estampado (Foil Stamping)

**Actual**:
```javascript
// Solo costo fijo
```

**Mejorado**:
```javascript
anchoFoil = anchoEtiqueta + (2 × overlapMm);
largoFoil = largoEtiqueta + (2 × overlapMm);
consumoFoilM2 = (anchoFoil × largoFoil × cantidadProductos) / 1000000; // m²
costoFoil = consumoFoilM2 × costoFoilPorM2;
costoEstampado = costoFoil + costoClichéEstampado + setupFijo;
```

---

## 7. Recomendaciones de Mejora

### 7.1 Priorización

| Prioridad | Item | Impacto en Precisión | Esfuerzo |
|-----------|------|----------------------|---------|
| **P0 (Crítico)** | Calcular costo de material de planchas (Cyrel/clichés) | **+20-30% precisión** | Medio |
| **P0** | Diferenciar costo de tintas por tipo | **+10-15% precisión** | Bajo |
| **P1 (Alto)** | Implementar lavados entre tintas | **+5-10% precisión** | Medio |
| **P1** | Desglose cara/adhesivo/liner | **+5-10% precisión** | Medio |
| **P2 (Medio)** | Troquel: depreciación por golpe | **+3-5% precisión** | Bajo |
| **P2** | Desperdicio de arranque desglosado | **+2-3% precisión** | Bajo |
| **P3 (Bajo)** | Costos de muestras | Cliente satisfecho | Bajo |
| **P3** | Energía y servicios | **+1-2% precisión** | Alto |
| **P3** | Mantenimiento/depreciación | **+1-2% precisión** | Alto |

### 7.2 Cambios Arquitectónicos Sugeridos

#### A. Nueva tabla: `calculo_planchas`

```sql
CREATE TABLE IF NOT EXISTS calculo_planchas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculo_id VARCHAR(20) REFERENCES calculo_flexo(id),
    tintas_count INT,
    area_por_planca_cm2 NUMERIC(10,2),
    costo_material_total NUMERIC(12,4),
    costo_procesamiento NUMERIC(12,4),
    costo_montaje_minutos NUMERIC(10,2),
    costo_total NUMERIC(12,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### B. Modificar `calculoDesglose()` en `flexo-regular-calculator.js`

```javascript
function calcularDesglose(entrada, parametros, metricas) {
    // ... código existente ...
    
    // NUEVO: Costo de planchas por material
    const costoPlanchasMaterial = entrada.procesoProductivo === "convencional"
        ? metricas.tintasEfectivas * 
          (parametros.areaPlancaPromedioCm2 || 1200) *  // 30x40cm = 1200cm²
          (parametros.costoCyrelPorCm2 || 0.05)  // $0.05/cm²
        : 0;
    
    // NUEVO: Costo de lavados
    const costoLavados = (metricas.tintasEfectivas - 1) * 
        (parametros.tiempoLavadoMin || 15) * 
        (parametros.costoMinutoMaquina || 0) +
        (metricas.tintasEfectivas - 1) * 
        (parametros.solventePorLavado || 0.5) *  // galones
        (parametros.costoSolventePorGalon || 5);  // $5/galón
    
    return {
        // ... existente ...
        planchasMaterial: toMoney(costoPlanchasMaterial),  // NUEVO
        lavados: toMoney(costoLavados),  // NUEVO
        // ...
    };
}
```

#### C. Modificar tabla `costo_general`

```sql
ALTER TABLE costo_general ADD COLUMN pct_administrativo DECIMAL(6,4) DEFAULT 0.05;  -- 5%
ALTER TABLE costo_general ADD COLUMN costo_muestra_digital DECIMAL(12,4) DEFAULT 50;
ALTER TABLE costo_general ADD COLUMN costo_muestra_prensa DECIMAL(12,4) DEFAULT 150;
```

### 7.3 Validación de Cálculos

Se recomienda crear una **hoja de cálculo de referencia** (Excel/Google Sheets) con:
1. Fórmulas manuales paso a paso
2. Comparación con resultados del sistema
3. Diferencia absoluta y porcentual

**Proceso de validación**:
```
1. Tomar 10 cotizaciones reales pasadas
2. Re-calcular manualmente usando la hoja de referencia
3. Comparar con lo que calculó el sistema
4. Identificar diferencias > 5%
5. Ajustar fórmulas según sea necesario
```

---

## 8. Anexos: Fórmulas Detalladas

### 8.1 Métricas Físicas

| Variable | Fórmula | Unidades | Línea |
|----------|----------|---------|-------|
| `pasosPorLinea` | `floor((anchoRollo + gapH) ÷ (anchoEtiqueta + gapH))` | unidades | flexo-regular.js:18 |
| `filas` | `ceil(cantidadProductos ÷ pasosPorLinea)` | unidades | flexo-regular.js:20 |
| `largoTotalPulgadas` | `filas × (largoEtiqueta + gapV)` | pulgadas | flexo-regular.js:21 |
| `piesLineales` | `largoTotalPulgadas ÷ 12` | pies | flexo-regular.js:22 |
| `piesLinealesConMerma` | `piesLineales × (1 + merma%/100)` | pies | flexo-regular.js:23 |
| `msiBase` | `(anchoRollo × largoTotalPulgadas) ÷ 1000` | MSI | flexo-regular.js:24 |
| `msiConMerma` | `msiBase × (1 + merma%/100)` | MSI | flexo-regular.js:25 |
| `areaM2` | `(anchoRollo×0.0254) × (largoTotalPulgadas×0.0254)` | m² | flexo-regular.js:26 |
| `pesoKg` | `areaM2 × (gramaje÷1000) × (1 + merma%/100)` | kg | flexo-regular.js:27 |
| `minutosTiraje` | `piesLinealesConMerma ÷ velocidadPiesPorMin` | min | flexo-regular.js:29 |

### 8.2 Costos

| Concepto | Fórmula Actual | Fórmula Recomendada | Línea |
|----------|-------------------|------------------------|-------|
| **Material** | `MSI×$MSI` O `Kg×$Kg` | `Face×$Kg + Adhesivo×$Kg + Liner×$m²` | :45-47 |
| **Preprensa** | `base + (cambios-1)×min×$/hr÷60` | *(sin cambios)* | :48-51 |
| **Montaje (tiempo)** | `tintas×factor×cambios×$/min` | *(sin cambios)* | :52-57 |
| **Montaje (material)** | ❌ NO EXISTE | `tintas×área×$cm² + tintas×$revelado` | - |
| **Tintas** | `MSI×$MSI×tintas` | `MSI×($CMYK×4 + $Pant×pant + $Blanco×blanco)` | :58-62 |
| **Tiraje** | `minutos×$/min` | `minutos×$/min + lavados` | :63 |
| **Laminado** | `MSI×$MSI + setup` | *(sin cambios)* | :64-66 |
| **Barniz** | `MSI×$MSI` | *(sin cambios)* | :68-70 |
| **Troquel** | `costoFijo` | `costoGolpe × cantidad` | :71 |
| **Arte** | `costoFijo` | *(sin cambios)* | :72 |
| **Cyrel** | `costoFijo` | `área×$cm²` | :73 |
| **Maquila** | `costoFijo` | *(sin cambios)* | :74 |
| **Flete** | `costoFijo` | *(sin cambios)* | :75 |
| **Empaque** | `costoFijo` | *(sin cambios)* | :76 |

### 8.3 Resumen de Costos (Margen y Utilidad)

**Líneas**: 93-119 (`calcularResumen`)

```javascript
subtotalCostosSinImpuestos = suma(desglose);  // Material + Preprensa + Montaje + Tintas + Tiraje + Acabados
subtotalConImprevistos = subtotalCostosSinImpuestos × (1 + 3%);
subtotalConFinancieros = subtotalConImprevistos × (1 + 2%);
subtotalConRendimiento = subtotalConFinancieros × (1 + 22÷35%);  // 22% digital, 28% conv
subtotalAntesIva = subtotalConRendimiento × (1 + 3%) × (1 + 10%) × (1 + 0%);  // Comisiones
iva = subtotalAntesIva × 12%;
total = subtotalAntesIva + iva;
unitarioSinIva = subtotalAntesIva ÷ cantidadProductos;
unitarioConIva = total ÷ cantidadProductos;
```

**✅ Correcto**: La estructura de márgenes y impuestos está bien planteada.

**PROBLEMA**: El % de rendimiento (22-35%) es arbitario y no está ligado al costo real del proceso.

**Sugerencia**: 
```javascript
// En lugar de un % fijo:
margenReal = subtotalConFinancieros × (margenMinimo + (riesgoFactor × margenAdicional));
// Donde riesgoFactor se basa en: tipo de trabajo, cliente nuevo vs recurrente, etc.
```

---

## Conclusión

El sistema de cálculos del ERP **Codexv15** tiene una **base matemática sólida** para las conversiones de unidades y cálculos físicos. Sin embargo, presenta **problemas de modelado de costos** que pueden llevar a:

1. **Subcotización de planchas** (no calcula material de Cyrel/clichés)
2. **Subcotización de tintas** (no diferencia tintas caras vs económicas)
3. **Omisión de lavados** entre cambios de tinta
4. **Falta de desglose** de cara/adhesivo/liner en etiquetas

**Impacto estimado**: Las cotizaciones pueden estar **5-20% por debajo** del costo real, especialmente en trabajos con muchas tintas o planchas caras.

**Recomendación**: Priorizar la implementación de cálculo de material de planchas (P0) y diferenciación de tintas (P0) antes de otros cambios.

---

**Documento generado**: 28 de abril de 2026  
**Versión del sistema**: Codexv15  
**Análisis realizado por**: Asistente IA basado en revisión de código fuente  
**Archivos analizados**:
- `services/flexo-engine/dist/domain/flexo-regular-calculator.js`
- `services/flexo-engine/dist/domain/flexo-regular.js`
- `services/flexo-engine/dist/domain/shared.js`
- `server.js` (12,637 líneas)
- `sql/schema.sql`
- `sql/schema_flexo_core.sql`
- `config/general-config.json`
