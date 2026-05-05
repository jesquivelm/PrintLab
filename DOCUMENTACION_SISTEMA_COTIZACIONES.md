# Documentación del Sistema de Cotizaciones - ERP Impresión

## Índice
1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Sistema Automático vs Manual](#3-sistema-automático-vs-manual)
4. [Campos Clave y Estructura de Datos](#4-campos-clave-y-estructura-de-datos)
5. [Fórmulas de Cálculo](#5-fórmulas-de-cálculo)
6. [Flujo de Selección Automática](#6-flujo-de-selección-automática)
7. [Override Manual](#7-override-manual)
8. [Estructura de Costos](#8-estructura-de-costos)
9. [Conclusiones y Recomendaciones](#9-conclusiones-y-recomendaciones)

---

## 1. Visión General

El sistema de cotizaciones del ERP de impresión maneja dos modalidades principales:
- **Cotización Convencional** (flexografía tradicional)
- **Cotización Digital** (impresión digital HP6000 y similares)

El sistema cuenta con un motor de cálculo automático que selecciona materiales, máquinas y configuraciones basándose en reglas de negocio, pero permite overrides manuales en cada paso.

### Archivos Principales Analizados:
- `server.js` - API Backend y lógica de negocio (12,637 líneas)
- `public/cotizaciones.js` - Interfaz de usuario para gestión de cotizaciones (2,993 líneas)
- `public/calculo-flexografia/app.js` - Calculadora detallada de flexografía (4,753 líneas)
- `process-quote-service.js` - Servicio de cálculo de procesos (297 líneas)
- `services/flexo-engine/dist/domain/flexo-regular-calculator.js` - Motor de cálculo flexo
- `sql/schema_flexo_core.sql` - Esquema de base de datos

---

## 2. Arquitectura del Sistema

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                      │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ cotizaciones.js   │  │ calculo-flexografia/app.js │  │
│  │ - Lista cotiz.   │  │ - Calculadora detallada    │  │
│  │ - Wizard creación │  │ - Procesos inline          │  │
│  └──────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP/JSON
┌──────────────────────────────▼──────────────────────────────┐
│                   Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ server.js                                           │  │
│  │ - resolveSmartQuoteLineSelection() [Línea 604]      │  │
│  │ - estimateAutomaticQuotePricing() [Línea 741]       │  │
│  │ - API Endpoints /api/cotizaciones                    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL
┌──────────────────────────────▼──────────────────────────────┐
│              PostgreSQL Database                              │
│  - cotizacion          (header de cotización)              │
│  - calculo_flexo        (líneas de cálculo)              │
│  - cantidad_calculo_flexo (cantidades y costos)           │
│  - calculo_flexo_proceso (procesos asociados)             │
│  - maquina, material, troquel (catálogos)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Sistema Automático vs Manual

### 3.1 Selección Automática (CODEX_AUTO_SELECTION)

El sistema tiene un motor de selección inteligente que se ejecuta al crear una nueva línea de cotización.

**Función principal:** `resolveSmartQuoteLineSelection()` (server.js línea 604)

**Lógica de selección automática:**

```javascript
// server.js líneas 604-701
async function resolveSmartQuoteLineSelection(payload = {}) {
    const quantity = parseLegacyNumber(payload.quantity) ?? 0;
    
    // 1. Determinar tipo de proceso basado en cantidad
    const threshold = 100000; // configurable via generalConfig
    const preferredProcess = quantity > 0 && quantity <= threshold 
        ? 'digital' 
        : 'convencional';
    
    // 2. Intentar proceso preferido, si falla, intentar el otro
    const processOrder = preferredProcess === 'digital' 
        ? ['digital', 'convencional'] 
        : ['convencional', 'digital'];
    
    for (const processType of processOrder) {
        // Seleccionar troquel (die)
        const die = selectBestDie({ dies, requestedShape, widthInches, lengthInches, processType });
        
        // Seleccionar mejor combinación: material + máquina + montaje
        const comboSelection = selectBestProductionCombo({
            materials, machines, requestedFamily, processType, 
            widthInches, lengthInches, quantity, labelsPerRoll, die
        });
        
        // Si todo es válido, usar esta selección
        if (material && machine && mounting && (die || dieOptional)) {
            return { selectedProcessType, selectedDie, selectedMaterial, 
                     selectedMachine, selectedMounting, warnings, ... };
        }
    }
    
    // Si el proceso preferido falla, usar "fallback"
    const fallbackApplied = selected.processType !== preferredProcess;
}
```

### 3.2 Lo que Selecciona Automáticamente

| Campo | Descripción | Campo en BD | Valor de Respaldo |
|-------|-------------|--------------|------------------|
| `processType` | Tipo de proceso | `calculo_flexo.proceso_productivo` | Convencional si cantidad > 100k |
| `materialCode` | Código de material | `calculo_flexo.material_conv_id` | Basado en familia solicitada |
| `machineName` | Máquina seleccionada | `calculo_flexo.maquina_digital_id` | Primera máquina compatible |
| `dieCode` | Troquel (die) | `calculo_flexo.troquel_conv_id` | Mejor coincidencia por forma/medida |
| `labelsPerRoll` | Etiquetas por rollo | No guardado directo | 1000 por defecto |
| `mounting` | Configuración de montaje | `raw_data` | Cálculo automático de columnas |

### 3.3 Donde se Guarda la Información Automática

En el campo `raw_data` (JSONB) de la tabla `flexo_calculations`:

```javascript
// server.js línea 9435-9446
rawData['CODEX_AUTO_SELECTION'] = {
    digitalThreshold: 100000,
    processType: 'Convencional',      // Lo que el sistema seleccionó
    dieCode: 'TRQ-001',
    materialCode: 'MAT-123',
    materialFamily: 'BOPP',
    machineName: 'GALLUS RCS 330',
    labelsPerRoll: 1000,
    mounting: { columns: 3, usableWidth: 8.5, linearFeet: 1250 },
    fallbackApplied: false,             // Si usó el proceso no preferido
    warnings: ['Advertencia si algo falló']
};
```

### 3.4 Override Manual

**No existe un "switch" explícito** para cambiar entre automático y manual. En su lugar:

1. El sistema hace selección automática al crear la línea
2. El usuario puede cambiar **cualquier valor manualmente** en la interfaz `calculo-flexografia`
3. Los cambios manuales se guardan en `raw_data` sobrescribiendo los valores automáticos

**Campo clave para etiquetado manual vs automático:**
```sql
-- schema_flexo_core.sql línea 52
tipo_etiquetado AS ENUM ('Automatico', 'Manual')
```

En la práctica, el sistema permite:
- Cambiar manualmente el tipo de proceso
- Cambiar manualmente el material
- Cambiar manualmente la máquina
- Cambiar manualmente el troquel
- Modificar cualquier parámetro de cálculo

---

## 4. Campos Clave y Estructura de Datos

### 4.1 Tabla `cotizacion` (Header)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | VARCHAR(20) PK | Código de cotización (ej: "COT-001") |
| `tenant_id` | UUID | Multi-tenant |
| `socio_id` | UUID FK | Cliente |
| `vendedor_id` | UUID FK | Vendedor |
| `cotizador_id` | UUID FK | Quien cotizó |
| `tipo` | ENUM | regular, licitacion, repeticion |
| `estado` | ENUM | borrador, enviada, aprobada, vencida, convertida |
| `moneda` | ENUM | USD, CRC, GTQ, EUR |
| `fecha_creacion` | TIMESTAMPTZ | Fecha de creación |
| `fecha_vencimiento` | DATE | Fecha vencimiento |
| `version_costos_id` | UUID FK | Versión de costos usada |

### 4.2 Tabla `calculo_flexo` (Línea de Cálculo)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|--------|
| `id` | VARCHAR(20) PK | Código cálculo | "CAL-500001" |
| `cotizacion_id` | VARCHAR(20) FK | Cotización padre | "COT-001" |
| `nombre_trabajo` | VARCHAR(300) | Nombre del trabajo | "Etiquetas Producto X" |
| `proceso_productivo` | ENUM | Digital/Convencional | "Convencional" |
| `dim_ancho_mm` | DECIMAL(10,4) | Ancho etiqueta | 100.5 |
| `dim_largo_mm` | DECIMAL(10,4) | Largo etiqueta | 50.2 |
| `cantidad_tintas` | SMALLINT | # tintas CMYK+Pantones | 4 |
| `cmyk_check` | BOOLEAN | Usa CMYK | true |
| `tinta_blanca_check` | BOOLEAN | Tinta blanca | false |
| `material_conv_id` | UUID FK | Material convencional | - |
| `material_digital_id` | UUID FK | Material digital | - |
| `troquel_conv_id` | UUID FK | Troquel convencional | - |
| `barniz_check` | BOOLEAN | Requiere barniz | true |
| `barniz_tipo` | VARCHAR(100) | Tipo barniz | "Barniz UV" |
| `laminado_check` | BOOLEAN | Requiere laminado | false |
| `estampado_check` | BOOLEAN | Requiere estampado | false |
| `tipo_etiquetado` | ENUM | Automatico/Manual | "Automatico" |
| `tipo_salida` | ENUM | D/A/Indistinto | "D" |
| `etiquetas_x_rollo` | INT | Etiquetas por rollo | 1000 |
| `macula_conv_pies_override` | INT | Override macula convencional | - |

### 4.3 Tabla `cantidad_calculo_flexo` (Costos por Cantidad)

| Campo | Descripción | Fórmula/Origen |
|-------|-------------|-----------------|
| `cantidad_productos` | Cantidad cotizada | Entrada usuario |
| `conv_pies_total` | Pies lineales convencional | (filas × (largo + gap)) / 12 |
| `conv_msi_total` | MSI convencional | (ancho rollo × largo total) / 1000 |
| `costo_material` | Costo material | MSI × precio_msi o KG × precio_kg |
| `costo_preprensa` | Costo preprensa | Minutos × costo_hora |
| `costo_montaje` | Costo planchas | #tintas × estaciones × costo_min |
| `costo_tiraje` | Costo impresión | Minutos × costo_hora_maquina |
| `costo_tintas` | Costo tintas | MSI × costo_msi_tinta × #tintas |
| `costo_troquelado` | Costo troquelado | Fijo o por pie |
| `subtotal_costos` | Subtotal costos | Suma anteriores |
| `precio_millar_usd` | Precio por millar | subtotal_antes_iva / (cantidad/1000) |
| `precio_unitario_usd` | Precio unitario | subtotal_antes_iva / cantidad |

---

## 5. Fórmulas de Cálculo

### 5.1 Métricas Básicas (process-quote-service.js)

```javascript
// Líneas 72-111: calculateMetrics()
function calculateMetrics(input, material) {
    const qty = Math.max(1, asNumber(input.quantity, 0));
    const widthIn = Math.max(0.01, asNumber(input.labelWidthIn, 0));
    const heightIn = Math.max(0.01, asNumber(input.labelHeightIn, 0));
    const rollWidthIn = Math.max(widthIn, asNumber(input.rollWidthIn, widthIn));
    const gapXIn = Math.max(0, asNumber(input.gapHorizontalIn, 0));
    const gapYIn = Math.max(0, asNumber(input.gapVerticalIn, 0));
    const wastePct = Math.max(0, asNumber(input.wastePct, 8)); // 8% default
    const wasteFactor = 1 + wastePct / 100;
    
    // ← FÓRMULA: Cuántas etiquetas caben en el ancho del rollo
    const labelsAcross = Math.max(1, 
        Math.floor((rollWidthIn + gapXIn) / (widthIn + gapXIn)));
    
    // ← FÓRMULA: Cuántas filas necesito
    const rows = Math.ceil(qty / labelsAcross);
    
    // ← FÓRMULA: Largo total en pulgadas
    const totalLengthIn = rows * (heightIn + gapYIn);
    
    // ← FÓRMULA: Pies lineales (feet)
    const feet = totalLengthIn / 12;
    
    // ← FÓRMULA: Pies con merma
    const feetWithWaste = feet * wasteFactor;
    
    // ← FÓRMULA: MSI (Miles de pulgadas cuadradas)
    const msi = (rollWidthIn * totalLengthIn) / 1000;
    const msiWithWaste = msi * wasteFactor;
    
    // ← FÓRMULA: Área en metros cuadrados
    const areaM2 = (rollWidthIn * 0.0254) * (totalLengthIn * 0.0254);
    
    // ← FÓRMULA: Peso en KG
    const grammage = asNumber(material?.gramaje_g_m2, 0);
    const kgWithWaste = areaM2 * (grammage / 1000) * wasteFactor;
    
    return { qty, widthIn, heightIn, rollWidthIn, labelsAcross, rows, 
            totalLengthIn, feet, feetWithWaste, msi, msiWithWaste, 
            areaM2, kgWithWaste, wastePct };
}
```

### 5.2 Costo de Material (process-quote-service.js)

```javascript
// Líneas 121-151: computeMaterialCost()
function computeMaterialCost(material, metrics) {
    const costKg = materialUnitPrice(material, "kg");
    const costMsi = materialUnitPrice(material, "msi");
    
    // ← LÓGICA: Si hay costo por KG y consumo en KG, usar KG
    const useKg = costKg > 0 && metrics.kgWithWaste > 0;
    const mode = useKg ? "kg" : "msi";
    const unitPrice = useKg ? costKg : costMsi;
    const quantityUsed = useKg ? metrics.kgWithWaste : metrics.msiWithWaste;
    
    // ← FÓRMULA: Costo total material = cantidad usada × precio unitario
    const amount = quantityUsed * unitPrice;
    
    return {
        amount: round(amount),
        mode,  // "kg" o "msi"
        unitPrice: round(unitPrice),
        quantityUsed: round(quantityUsed),
        quantityLabel: useKg ? "kg" : "MSI",
        formula: `Subtotal sustrato = ${useKg ? "consumo KG con merma" : "consumo MSI con merma"} × precio unitario`
    };
}
```

### 5.3 Costo de Procesos (process-quote-service.js)

```javascript
// Líneas 197-249: buildStepCost()
function buildStepCost(step, metrics) {
    // ← FÓRMULA: Tiempo preparación
    const setupMinutes = Math.max(0,
        asNumber(step.tiempo_preparacion_general, 0) +
        asNumber(step.tiempo_por_estacion, 0) * stations +
        asNumber(step.tiempo_fijo_min, 0)
    );
    
    // ← FÓRMULA: Tiempo de corrida (runtime)
    // Depende de la unidad de trabajo: MSI, KG, Millares, Pies
    const speed = Math.max(0, asNumber(step.velocidad_produccion, 0));
    const runtimeMinutes = step.comparte_tiempo_linea || speed <= 0 
        ? 0 
        : basis.value / speed;
    
    // ← FÓRMULA: Costo máquina
    const machineHours = (setupMinutes + runtimeMinutes) / 60;
    const machineCost = machineHours * asNumber(step.costo_hora_maquina, 0);
    
    // ← FÓRMULA: Costo operario
    const operatorHours = ((step.comparte_operario ? setupMinutes : setupMinutes + runtimeMinutes) / 60) * people;
    const operatorCost = operatorHours * asNumber(step.costo_hora_operario, 0);
    
    // ← FÓRMULA: Costo variable (por consumo)
    const variableCost = 
        metrics.msiWithWaste * asNumber(step.costo_x_msi, 0) +
        metrics.kgWithWaste * asNumber(step.costo_x_kg, 0) +
        metrics.feetWithWaste * asNumber(step.costo_x_pie, 0) +
        (metrics.qty / 1000) * asNumber(step.costo_x_millar, 0);
    
    return {
        setupMinutes, runtimeMinutes,
        machineCost: round(machineCost),
        operatorCost: round(operatorCost),
        variableCost: round(variableCost),
        fixedCost: round(asNumber(step.costo_fijo, 0)),
        total: round(machineCost + operatorCost + variableCost + fixedCost),
        formulas: {
            setup: "Tiempo preparación = General + (Por estación × Estaciones) + Fijo",
            runtime: "Tiempo corrida = Consumo / Velocidad",
            machine: "Costo máquina = Horas × Costo hora",
            operator: "Costo operario = Horas × Costo hora",
            variable: "Costo variable = (MSI×Costo) + (KG×Costo) + (Pies×Costo) + (Millares×Costo)",
            total: "Subtotal = Máquina + Operario + Variable + Fijo"
        }
    };
}
```

### 5.4 Resumen de Costos y Precios (server.js)

```javascript
// Líneas 808-818: estimateAutomaticQuotePricing()
function estimateAutomaticQuotePricing({...}) {
    // 1. Costo material (ya calculado)
    const materialCost = ...;
    
    // 2. Costo producción (ya calculado de los procesos)
    const productionCost = ...;
    
    // 3. Costo base
    const baseCost = materialCost + productionCost;
    
    // ← FÓRMULA: Subtotal con imprevistos (3%)
    const subtotalWithOverhead = baseCost * (1 + 0.03);
    
    // ← FÓRMULA: Subtotal con gastos financieros (2%)
    const subtotalWithFinancial = subtotalWithOverhead * (1 + 0.02);
    
    // ← FÓRMULA: Subtotal con rendimiento bruto
    // 22% para digital, 28% para convencional
    const profitabilityPct = processType.includes('digit') ? 0.22 : 0.28;
    const subtotalWithProfit = subtotalWithFinancial * (1 + profitabilityPct);
    
    // ← FÓRMULA: Subtotal antes de IVA
    // + Comisión vendedor (3%)
    // + Comisión departamento (10% conv, 8% digital)
    // + Comisión agencia (0% default)
    const subtotalBeforeTax = subtotalWithProfit *
        (1 + 0.03) *  // comisión vendedor
        (1 + (processType.includes('digit') ? 0.08 : 0.10)) * // departamento
        (1 + 0.00); // agencia
    
    // ← FÓRMULA: IVA (12% default)
    const taxPercent = 12;
    const taxAmount = subtotalBeforeTax * (taxPercent / 100);
    
    // ← FÓRMULA: Total
    const totalAmount = subtotalBeforeTax + taxAmount;
    
    // ← FÓRMULA: Precio unitario
    const unitPrice = quantity > 0 ? subtotalBeforeTax / quantity : 0;
    const unitPriceWithTax = quantity > 0 ? totalAmount / quantity : 0;
    
    return { materialCost, productionCost, baseCost, subtotalBeforeTax, 
            taxPercent, taxAmount, totalAmount, unitPrice, unitPriceWithTax };
}
```

### 5.5 Motor Flexo Calculator (flexo-regular-calculator.js)

```javascript
// Líneas 13-43: calcularMetricas()
function calcularMetricas(entrada, parametros) {
    const mermaFactor = 1 + toPercent(parametros.mermaPorcentaje, 8);
    
    // ← FÓRMULA: MSI base
    const msiBase = (anchoRollo * largoTotalPulgadas) / 1000;
    
    // ← FÓRMULA: MSI con merma
    const msiConMerma = msiBase * mermaFactor;
    
    // ← FÓRMULA: Peso KG
    const pesoKg = areaM2 * (parametros.gramaje / 1000) * mermaFactor;
    
    return { msiBase, msiConMerma, areaM2, pesoKg, ... };
}

// Líneas 44-92: calcularDesglose()
function calcularDesglose(entrada, parametros, metricas) {
    // ← FÓRMULA: Costo material
    const costoMaterial = (parametros.costoMaterialPorKg ?? 0) > 0 && (parametros.gramaje ?? 0) > 0
        ? metricas.pesoKg * parametros.costoMaterialPorKg
        : metricas.msiConMerma * parametros.costoMaterialPorMsi;
    
    // ← FÓRMULA: Costo preprensa
    const costoPreprensaBase = parametros.costoHoraPreprensa ?? 0;
    const costoPreprensaCambios = Math.max(0, (entrada.cantidadCambios ?? 1) - 1) *
        (parametros.minutosPreprensaPorCambio ?? 10) *
        (parametros.costoHoraPreprensa / 60);
    
    // ← FÓRMULA: Costo montaje (planchas) - solo convencional
    const costoMontaje = entrada.procesoProductivo === "convencional"
        ? metricas.tintasEfectivas *
            (parametros.factorMontajePorEstacion ?? 6) *
            Math.max(1, entrada.cantidadCambios ?? 1) *
            parametros.costoMinutoMaquina
        : 0;
    
    // ← FÓRMULA: Costo tintas
    const costoTintas = metricas.tintasEfectivas > 0
        ? metricas.msiConMerma * parametros.costoTintaPorMsi * metricas.tintasEfectivas
        : 0;
    
    // ← FÓRMULA: Costo tiraje (impresión)
    const costoTiraje = metricas.minutosTiraje * parametros.costoMinutoMaquina;
    
    return { material: costoMaterial, preprensa: costoPreprensaBase + costoPreprensaCambios, 
            montaje: costoMontaje, tintas: costoTintas, tiraje: costoTiraje, ... };
}
```

---

## 6. Flujo de Selección Automática

### 6.1 Diagrama de Flujo

```
Usuario ingresa cotización
         │
         ▼
┌────────────────────────┐
│ ¿Cantidad <= 100k?    │
│ (threshold config.)    │
└───────────┬────────────┘
            │
     ┌──────┴──────┐
     │              │
   SÍ (Digital)   NO (Convencional)
     │              │
     ▼              ▼
┌─────────────┐  ┌─────────────────┐
│ Buscar      │  │ Buscar           │
│ máquina     │  │ máquina         │
│ digital     │  │ convencional    │
└──────┬──────┘  └────────┬────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│ Buscar material compatible     │
│ (por familia, ancho)          │
└─────────────┬─────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Buscar troquel (die)           │
│ por forma y medidas            │
└─────────────┬─────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Calcular montaje               │
│ (columnas, pies lineales)     │
└─────────────┬─────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ ¿Todo válido?                 │
└───────────┬───────────────────┘
            │
     ┌──────┴──────┐
     │              │
   SÍ              NO
     │              │
     │              ▼
     │    ┌────────────────────┐
     │    │ Intentar proceso   │
     │    │ alternativo        │
     │    │ (fallback)         │
     │    └────────┬─────────┘
     │              │
     ▼              ▼
┌─────────────────────────────────┐
│ Generar CODE_XAUTO_SELECTION   │
│ con warnings si aplica         │
└─────────────┬─────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Calcular precios automáticos   │
│ (estimateAutomaticQuotePricing)│
└─────────────────────────────────┘
```

### 6.2 Parámetros de Configuración

**Tabla `costo_general` (solo algunos campos relevantes):**

| Campo | Valor Default | Descripción |
|-------|----------------|-------------|
| `pct_imprevistos` | 0.03 (3%) | Porcentaje imprevistos |
| `pct_financieros` | 0.02 (2%) | Gastos financieros |
| `pct_vendedor` | 0.05 (5%) | Comisión vendedor |
| `pct_departamento_conv` | 0.04 (4%) | Comisión depto. convencional |
| `pct_departamento_digital` | 0.04 (4%) | Comisión depto. digital |
| `pct_iva` | 0.13 (13%) | IVA |
| `costo_minimo` | 150.00 | Costo mínimo de cotización |

**Umbral digital/convencional:**
- Configurado en `generalConfig.general.quoteAutomaticDigitalMaxQuantity` (default: 100,000 unidades)
- Si cantidad ≤ 100k → Digital
- Si cantidad > 100k → Convencional

---

## 7. Override Manual

### 7.1 Mecánica de Override

**No hay un "switch" visual** para cambiar entre modo automático y manual. En su lugar:

1. **Al crear la línea:** Se ejecuta `resolveSmartQuoteLineSelection()` y se guardan los valores automáticos en `CODEX_AUTO_SELECTION`
2. **El usuario edita:** En la interfaz `calculo-flexografia`, puede cambiar cualquier valor
3. **Al guardar:** Se actualiza `raw_data` con los nuevos valores, manteniendo el respaldo de lo que seleccionó automáticamente

### 7.2 Campos que se Pueden Sobrescribir Manualmente

Desde la interfaz `calculo-flexografia/app.js`:

| Campo | Donde se cambia | Efecto |
|-------|-----------------|--------|
| `processType` | Selector proceso | Cambia convencional ↔ digital |
| `materialId` | Selector material | Cambia el sustrato |
| `machineId` | Selector máquina | Cambia la máquina |
| `dieCode` | Selector troquel | Cambia el troquel |
| `labelsPerRoll` | Input numérico | Etiquetas por rollo |
| `quantity` | Input cantidades | Cantidad a cotizar |
| `overheadPct` | Input % | % imprevistos override |
| `marginPct` | Input % | % rendimiento override |
| `taxPct` | Input % | % impuestos override |

### 7.3 Prioridad de Valores

```
1. Valor manual (usuario cambió el campo)  ← MÁXIMA PRIORIDAD
2. Valor automático calculado
3. Valor por defecto del sistema
4. Valor nulo/cero                           ← MINIMA PRIORIDAD
```

### 7.4 Recomendación: Switch Automático/Manual

**Actualmente NO existe un switch visual.** Se recomienda implementar:

```javascript
// En calculo-flexografia/app.js
const state = {
    calculationMode: 'auto', // 'auto' | 'manual'
    ...
};

// Switch UI
<input type="checkbox" id="autoModeToggle" 
       checked={state.calculationMode === 'auto'}>
<label for="autoModeToggle">
    {state.calculationMode === 'auto' ? 'Automático' : 'Manual'}
</label>

// Lógica
function toggleCalculationMode() {
    if (state.calculationMode === 'auto') {
        // Pasar a manual: mantener valores actuales pero permitir edición libre
        state.calculationMode = 'manual';
    } else {
        // Volver a auto: re-ejecutar resolveSmartQuoteLineSelection
        state.calculationMode = 'auto';
        reapplyAutomaticSelection();
    }
}
```

---

## 8. Estructura de Costos

### 8.1 Jerarquía de Costos

```
Costo Total
├── Material
│   ├── Sustrato (MSI o KG)
│   ├── Gramaje (g/m²)
│   └── Merma (%)
├── Preprensa
│   ├── Hora hombre
│   ├── Minutos por cambio
│   └── # Cambios
├── Montaje (Planchas) - Solo convencional
│   ├── # Tintas efectivas
│   ├── Factor por estación
│   └── Costo minuto máquina
├── Impresión (Tiraje)
│   ├── Setup (preparación)
│   ├── Runtime (minutos)
│   ├── Costo hora máquina
│   └── Costo hora operario
├── Tintas
│   ├── CMYK
│   ├── Pantones
│   ├── Blanco
│   └── Doble pasada
├── Acabados
│   ├── Barniz (MSI × costo_msi)
│   ├── Laminado (MSI × costo_msi + setup)
│   ├── Estampado (fijo + material)
│   ├── Troquelado (fijo)
│   ├── Embosado
│   └── Rebobinado
├── Empaque
│   ├── Cantidad × minuto
│   ├── Movilización
│   └── Confección
├── Otros
│   ├── Arte
│   ├── Cyrel
│   ├── Maquila
│   └── Flete
└── Márgenes y Impuestos
    ├── Imprevistos (3%)
    ├── Financieros (2%)
    ├── Rendimiento bruto (22% dig / 28% conv)
    ├── Comisión vendedor (3%)
    ├── Comisión departamento (8-10%)
    ├── Comisión agencia (0%)
    └── IVA (12%)
```

### 8.2 Fórmula Matemática Completa

```
               ┌─ Material ─────────────────┐
               │  MSI = (ancho × largo) / 1000  │
               │  MSI_merma = MSI × (1 + %merma) │
               │  Costo = MSI_merma × $/MSI    │
               └────────────────────────────────┘
                            │
                            ▼
               ┌─ Preprensa ────────────────┐
               │  Minutos_base = 10          │
               │  Minutos_cambios = (#cambios-1) × 10 │
               │  Costo = (base + cambios) × $/hr ÷ 60 │
               └────────────────────────────────┘
                            │
                            ▼
               ┌─ Montaje (Planchas) ─────┐
               │  #tintas_efectivas =       │
               │    CMYK(4) + Pantones +    │
               │    Blanco(1) + Doble(1)   │
               │  Costo = #tintas ×         │
               │          estaciones ×       │
               │          factor × $/min     │
               └────────────────────────────┘
                            │
                            ▼
               ┌─ Tiraje (Impresión) ─────┐
               │  Setup = general +         │
               │         (estación × #est) + │
               │         fijo                │
               │  Runtime = Pies_merma ÷    │
               │            velocidad         │
               │  Costo = (S+R) × $/hr     │
               └────────────────────────────┘
                            │
                            ▼
               ┌─ Suma Costos Producción ─┐
               │  Subtotal = Material +     │
               │             Preprensa +     │
               │             Montaje +       │
               │             Tiraje +        │
               │             Tintas +        │
               │             Acabados +      │
               │             Empaque + ...   │
               └────────────────────────────┘
                            │
                            ▼
               ┌─ Márgenes ────────────────┐
               │  + Imprevistos (3%)        │
               │  + Financieros (2%)        │
               │  + Rendimiento (22-28%)    │
               │  + Comisión Vendedor (3%)  │
               │  + Comisión Depto (8-10%)  │
               │  + Comisión Agencia (0%)   │
               └────────────────────────────┘
                            │
                            ▼
               ┌─ Impuestos ───────────────┐
               │  IVA = Subtotal × 12%      │
               │  Total = Subtotal + IVA     │
               │  Unitario = Total ÷ cantidad│
               └────────────────────────────┘
```

---

## 9. Conclusiones y Recomendaciones

### 9.1 Hallazgos Principales

1. **No hay un switch visual** entre modo automático y manual. El sistema usa un enfoque de "fallback" donde los valores automáticos se pueden sobrescribir manualmente.

2. **La selección automática** está controlada por `resolveSmartQuoteLineSelection()` y depende principalmente de:
   - Cantidad (threshold de 100k para digital vs convencional)
   - Familia de material solicitada
   - Medidas de la etiqueta
   - Forma/troquel

3. **Los cálculos** están distribuidos en:
   - `process-quote-service.js` - Cálculos generales de procesos
   - `flexo-regular-calculator.js` - Cálculos específicos flexografía
   - `server.js` (`estimateAutomaticQuotePricing`) - Cálculo de precios finales

4. **El campo `tipo_etiquetado`** (Automatico/Manual) existe en la BD pero no parece estar plenamente implementado como un toggle funcional.

### 9.2 Recomendaciones

| Recomendación | Prioridad | Descripción |
|---------------|-----------|-------------|
| **Implementar Switch Auto/Manual** | ALTA | Agregar un toggle visual claro que permita cambiar entre "Usar cálculos automáticos" y "Entrada manual" |
| **Guardar historial de cambios** | MEDIA | Registrar quién cambió qué campo y cuándo (audit trail) |
| **Validación de overrides** | MEDIA | Al cambiar manualmente, mostrar advertencia si el valor se aleja mucho del automático |
| **Botón "Re-apply Auto"** | BAJA | Permitir volver a la selección automática original con un clic |
| **Visualizar diferencias** | MEDIA | Mostrar en la UI qué valores fueron automáticos y cuáles han sido modificados |

### 9.3 Variables Críticas

| Variable | Dónde | Impacto |
|----------|---------|---------|
| `CODEX_AUTO_SELECTION` | `raw_data` JSONB | Guarda qué seleccionó el sistema automáticamente |
| `CODEX_AUTO_PRICING` | `raw_data` JSONB | Guarda los precios calculados automáticamente |
| `tipo_etiquetado` | Campo en BD | Debería indicar si es manual o automático (no implementado del todo) |
| `fallbackApplied` | Dentro de `CODEX_AUTO_SELECTION` | Indica si se usó el proceso no preferido |
| `overheadPct`, `marginPct`, `taxPct` | Inputs en UI | Permiten override de los % automáticos |

---

## Anexos

### A. Ejemplo de `raw_data` Completo

```json
{
  "CODEX_AUTO_SELECTION": {
    "digitalThreshold": 100000,
    "processType": "Convencional",
    "dieCode": "TRQ-001",
    "materialCode": "MAT-BOPP-001",
    "materialFamily": "BOPP",
    "machineName": "GALLUS RCS 330",
    "labelsPerRoll": 1000,
    "mounting": {
      "columns": 3,
      "usableWidth": 8.5,
      "linearFeet": 1250.5
    },
    "fallbackApplied": false,
    "warnings": []
  },
  "CODEX_AUTO_PRICING": {
    "materialCost": 150.50,
    "productionCost": 320.75,
    "baseCost": 471.25,
    "subtotalBeforeTax": 723.45,
    "taxPercent": 12,
    "taxAmount": 86.81,
    "totalAmount": 810.26,
    "unitPrice": 0.72,
    "unitPriceWithTax": 0.81,
    "processBreakdown": [...]
  },
  "GENERAL | 5 | SUBTOTAL": 471.25,
  "GENERAL | 7 | TOTAL | DOL": 723.45,
  "GENERAL | 9 | TOTAL | DOL": 810.26,
  "PRECIO UNITARIO": 0.81,
  "PRECIO TOTAL AL FINALIZAR": 810.26
}
```

### B. Referencias a Líneas de Código Clave

| Funcionalidad | Archivo | Línea |
|---------------|---------|-------|
| Selección automática | server.js | 604-701 |
| Cálculo precios automático | server.js | 741-834 |
| Cálculo métricas | process-quote-service.js | 72-111 |
| Cálculo material | process-quote-service.js | 121-151 |
| Cálculo procesos | process-quote-service.js | 197-249 |
| Motor flexo calc | flexo-regular-calculator.js | 13-135 |
| Normalizar línea (frontend) | cotizaciones.js | 975-1024 |
| Configuración costos | costo_general (BD) | schema_flexo_core.sql:238-262 |

---

**Documento generado:** 28 de abril de 2026  
**Versión del sistema:** Codexv15  
**Autor del análisis:** Asistente IA basado en análisis de código fuente
