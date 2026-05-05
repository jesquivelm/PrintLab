# Documentación Final - Sistema de Cotizaciones Codexv15

## Índice
1. [Resumen de Acuerdos](#1-resumen-de-acuerdos)
2. [Puntos Confirmados y Acciones](#2-puntos-confirmados-y-acciones)
3. [Implementación Técnica](#3-implementación-técnica)
4. [Cálculos Corregidos](#4-cálculos-corregidos)
5. [Mejoras de UI/UX](#5-mejoras-de-uiux)
6. [Sistema de Alertas](#6-sistema-de-alertas)
7. [Backup y Restauración](#7-backup-y-restauración)
8. [Fórmulas Completas](#8-fórmulas-completas)

---

## 1. Resumen de Acuerdos

### ✅ Lo que se confirmó que está BIEN:

| Item | Estado | Justificación |
|------|--------|--------------|
| **Cálculo de métricas físicas** | ✅ Correcto | Conversión pulgadas→metros, MSI, pies, kg son matemáticamente exactas |
| **Costo de material (cara/adhesivo/liner)** | ✅ Correcto | El `costo_x_kg` o `costo_x_msi` YA incluye el material compuesto completo |
| **Guías laterales** | ✅ Incluido | Ya están en el ancho del troquel/plancha |
| **Mantenimiento/Energía** | ✅ Incluido | Ya están en `costo_hora_maquina` (`hourly_machine_cost`) |
| **Tintas digitales** | ✅ Se cobran | Existen costos diferenciados en la configuración de máquina digital |
| **Procesos adicionales (planchas externas)** | ✅ Manejado | Se puede agregar en "Procesos Adicionales" |

### ⚠️ Lo que requiere CORRECCIÓN OBLIGATORIA:

| Item | Prioridad | Acción | Razón del Usuario |
|------|-----------|--------|-------------------|
| **Planchas por Área** | **P0 (Crítico)** | Calcular `área_cm² × #tintas × $/cm²` | "Sí, oficial, eso tiene que quedarse... no se está cobrando por área" |
| **Macula de Impresión** | **P0 (Crítico)** | Mostrar en sección de Tintas de cada proceso | "Las máculas de impresión tantísimas deben de aparecer en el proceso" |
| **Área de Troquel** | **P1 (Alto)** | Agregar campo `area_cm2` al troquel y mostrarlo | "El área del troquel... debería estar aquí... poderlo multiplicar por la cantidad de tintas" |
| **Ordenar Tintas** | **P1 (Alto)** | Organizar sección de tintas por flujo de cálculo | "La parte de tintas... si la pudieses ordenar... sería espectacular" |
| **Alertas Proforma** | **P1 (Alto)** | Validar campos obligatorios antes de imprimir | "Cuando se va a imprimir una proforma hay que evaluar que toda línea esté completa" |

### 📋 Lo que se deja COMO ESTÁ (por ahora):

| Item | Razón |
|------|-------|
| **Tintas especiales digitales** | Usar "precio promedio estándar" para trabajos <500k. Para >500k, opción de especificar color |
| **Repeticiones** | No cobrar planchas en "Repetición" (las planchas ya existen). Solo cobrar en "Nuevo" |
| **Backup/Restore** | Se implementará después de las correcciones críticas |

---

## 2. Puntos Confirmados y Acciones

### 2.1 Plancas por Área (CRÍTICO)

**Problema identificado**:
- El sistema actual usa `costoCyrel` como **valor fijo** (línea 73 de `flexo-regular-calculator.js`)
- No es proporcional al área real de la plancha

**Cálculo que DEBE usarse**:
```
Costo Pláchas = (Ancho_troquel_cm × Largo_troquel_cm) × #Tintas_Efectivas × $/cm²
```

**Donde**:
- Ancho_troquel_cm = `troquel.ancho_mm / 10`
- Largo_troquel_cm = `troquel.largo_mm / 10`
- #Tintas_Efectivas = CMYK(4) + Pantones + Blanco + DoblePasada
- $/cm² = Configurado en `costo_general.costoCyrelPorCm2` (nuevo campo)

**Para Repeticiones**:
```
SI tipoOrden = "Repetición" o "Repetición con Cambio":
    Costo Pláchas = 0  // No cobrar, las planchas ya existen
SINO:
    Costo Pláchas = Área × #Tintas × $/cm²
```

### 2.2 Área de Troquel (Nuevo Campo)

**Agregar a la tabla `troquel` (o `flexo_dies`):**

```sql
ALTER TABLE flexo_dies ADD COLUMN IF NOT EXISTS area_cm2 DECIMAL(12,4) DEFAULT 0;

-- Trigger para calcular automáticamente
CREATE OR REPLACE FUNCTION calcular_area_troquel() RETURNS TRIGGER AS $$
BEGIN
    NEW.area_cm2 = (COALESCE(NEW.ancho_mm, 0) / 10) * (COALESCE(NEW.largo_mm, 0) / 10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_area_troquel
    BEFORE INSERT OR UPDATE OF ancho_mm, largo_mm
    ON flexo_dies
    FOR EACH ROW EXECUTE FUNCTION calcular_area_troquel();
```

**Mostrar en UI** (`calculo-flexografia/app.js`):
```javascript
// En la sección de sustrato/diseño
const areaTroquelCm2 = r((troquel.ancho_mm / 10) * (troquel.largo_mm / 10), 2);
// Mostrar:
`<span>Área Troquel: ${areaTroquelCm2} cm²</span>`
```

### 2.3 Macula de Impresión (Startup Waste)

**Donde debe aparecer**: En la sección de **Tintas** de cada proceso de impresión (tanto Digital como Convencional).

**Cálculo actual** (en `app.js` línea 2858):
```javascript
const startupWasteFeet = r(macula.totalFeet, 2);  // Pies de desperdicio
```

**Integración en sección Tintas**:
```javascript
// En el renderizado de cada proceso de impresión
function renderTintasSection(proceso) {
    const maculaPies = proceso.startupWasteFeet || 100; // Default 100 pies
    const maculaCosto = maculaPies * (proceso.costoPorPie || 0.50);
    
    return `
    <div class="macula-section">
        <h5>Mácula de Impresión</h5>
        <div>Desperdicio: ${maculaPies} pies</div>
        <div>Costo: $${maculaCosto.toFixed(2)}</div>
        <div class="hint">Se incluye en el consumo total de material</div>
    </div>
    <div class="ink-costs-section">
        <!-- Costos de tintas aquí -->
    </div>
    `;
}
```

### 2.4 Ordenar Sección de Tintas

**Estructura sugerida** (en cada proceso de impresión):

```
┌─────────────────────────────────────────────────────┐
│ PROCESO: Impresión (Digital/Convencional)      │
├─────────────────────────────────────────────────────┤
│                                             │
│ 1. CONFIGURACIÓN DE TINTAS                   │
│    ├─ CMYK: ${#tintas} tintas               │
│    ├─ Blanco: ${blanco ? 'Sí' : 'No'}          │
│    ├─ Pantones: ${#pantones}                │
│    └─ Especiales: ${#especiales}              │
│                                             │
│ 2. MÁCULA DE IMPRESIÓN (Startup Waste)     │
│    ├─ Pies: ${maculaPies}                     │
│    └─ Costo: $${maculaCosto}                 │
│                                             │
│ 3. COSTOS POR TIPO DE TINTA                │
│    ┌─────────────────────────────────────┐  │
│    │ CMYK Estándar: $25/kg           │  │
│    │ Blanco: $30/kg                  │  │
│    │ Pantone: $35/kg (promedio)      │  │
│    │ Especiales: $40/kg (promedio)    │  │
│    └─────────────────────────────────────┘  │
│                                             │
│ 4. CÁLCULO FINAL                          │
│    ├─ Consumo MSI: ${msi}                    │
│    ├─ Tintas: $${costoTintas}                 │
│    └─ Mácula: $${costoMacula}                │
└─────────────────────────────────────────────────────┘
```

### 2.5 Alertas en Proforma

**Validación antes de imprimir** (`proforma.js` o `proforma-print.html`):

```javascript
function validarAntesDeImprimir(quoteCode) {
    const lineas = obtenerLineas(quoteCode);
    const errores = [];
    const advertencias = [];
    
    lineas.forEach((linea, index) => {
        // Campos obligatorios
        if (!linea.materialCode) {
            errores.push(`Línea ${index + 1}: Falta seleccionar material`);
        }
        if (!linea.machineName) {
            errores.push(`Línea ${index + 1}: Falta seleccionar máquina`);
        }
        if (!linea.dieCode && linea.requiereTroquel) {
            errores.push(`Línea ${index + 1}: Falta seleccionar troquel`);
        }
        
        // Campos urgentes (resaltar en rojo)
        if (linea.tipoOrden === 'Nuevo' && !linea.numeroTintas) {
            advertencias.push(`Línea ${index + 1}: No se ha definido cantidad de tintas`);
        }
        
        // Verificar tintas (debe tener al menos 1)
        if (linea.tintasEfectivas <= 0) {
            errores.push(`Línea ${index + 1}: Debe tener al menos 1 tinta`);
        }
    });
    
    if (errores.length > 0) {
        mostrarError(`No se puede imprimir. Faltan campos obligatorios:
${errores.join('\n')}`);
        resaltarCamposEnRojo(errores);
        return false;
    }
    
    if (advertencias.length > 0) {
        const continuar = confirm(`Advertencias:
${advertencias.join('\n')}

¿Desea continuar?`);
        if (!continuar) return false;
    }
    
    return true;
}

// Función para resaltar campos faltantes en rojo
function resaltarCamposEnRojo(errores) {
    errores.forEach(error => {
        const match = error.match(/Línea (\d+)/);
        if (match) {
            const lineaIndex = parseInt(match[1]) - 1;
            const elemento = document.querySelector(`[data-line-index="${lineaIndex}"]`);
            if (elemento) {
                elemento.classList.add('campo-faltante');
                // Estilo: borde rojo
                elemento.style.border = '2px solid #ef4444';
            }
        }
    });
}
```

**Estilo CSS** (ya existe uno "bonito" según el usuario):
```css
.campo-faltante {
    border: 2px solid #ef4444 !important;
    background-color: rgba(239, 68, 68, 0.1);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
```

---

## 3. Implementación Técnica

### 3.1 Tabla de Cambios en Base de Datos

```sql
-- 1. Agregar costo de Cyrel por cm²
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS costo_cyrel_por_cm2 DECIMAL(12,6) DEFAULT 0.05;  -- $0.05/cm²

-- 2. Agregar área a troquel
ALTER TABLE flexo_dies ADD COLUMN IF NOT EXISTS area_cm2 DECIMAL(12,4) DEFAULT 0;

-- 3. Agregar costo de mácula por pie (para digital)
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS digital_macula_costo_por_pie DECIMAL(12,4) DEFAULT 0.50;
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS conv_macula_costo_por_pie DECIMAL(12,4) DEFAULT 0.50;

-- 4. Trigger para área de troquel
CREATE OR REPLACE FUNCTION calcular_area_troquel() RETURNS TRIGGER AS $$
BEGIN
    NEW.area_cm2 = (COALESCE(NEW.ancho_mm, 0) / 10.0) * (COALESCE(NEW.largo_mm, 0) / 10.0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_area_troquel ON flexo_dies;
CREATE TRIGGER trigger_area_troquel
    BEFORE INSERT OR UPDATE OF ancho_mm, largo_mm
    ON flexo_dies
    FOR EACH ROW EXECUTE FUNCTION calcular_area_troquel();
```

### 3.2 Modificación de `flexo-regular-calculator.js`

**Cálculo de Plancas Corregido** (reemplazar líneas 52-57):

```javascript
// Líneas 52-57 ACTUALES (incorrectas):
const costoMontaje = entrada.procesoProductivo === "convencional"
    ? metricas.tintasEfectivas *
        (parametros.factorMontajePorEstacion ?? 6) *
        Math.max(1, entrada.cantidadCambios ?? 1) *
        (parametros.costoMinutoMaquina ?? 0)
    : 0;

// CAMBIO: Cálculo por área de troquel
const costoPlanchasMaterial = (() => {
    if (entrada.procesoProductivo !== "convencional") return 0;
    
    // No cobrar en repeticiones
    if (entrada.tipoOrden === "Repeticion" || entrada.tipoOrden === "Repeticion con Cambio") {
        return 0;  // Las planchas ya existen
    }
    
    const areaTroquelCm2 = (() => {
        const troquel = entrada.troquel;
        if (!troquel) return 1200; // Default 30x40cm = 1200cm²
        return ((troquel.ancho_mm || 300) / 10) * ((troquel.largo_mm || 400) / 10);
    })();
    
    const costoPorCm2 = parametros.costoCyrelPorCm2 ?? 0.05;  // $0.05/cm²
    return areaTroquelCm2 * metricas.tintasEfectivas * costoPorCm2;
})();

// Tiempo de montaje (solo mano de obra)
const costoMontajeTiempo = entrada.procesoProductivo === "convencional"
    ? metricas.tintasEfectivas *
        (parametros.factorMontajePorEstacion ?? 6) *
        Math.max(1, entrada.cantidadCambios ?? 1) *
        (parametros.costoMinutoMaquina ?? 0)
    : 0;

const costoMontaje = costoPlanchasMaterial + costoMontajeTiempo;
```

**Agregar a `parametros` (línea 1-12 de `flexo-regular.js` o donde se definan):**
```javascript
const parametros = {
    // ... existente ...
    costoCyrelPorCm2: 0.05,  // $0.05 por cm²
    digitalMaculaCostoPorPie: 0.50,
    convMaculaCostoPorPie: 0.50,
    // ...
};
```

### 3.3 Modificación de `server.js` (Cálculo en Backend)

**Línea ~3626 (función de cálculo en server.js):**
```javascript
// Reemplazar o agregar:
const costoPlanchasMaterial = (() => {
    if (proceso !== 'convencional') return 0;
    if (tipoOrden === 'Repeticion' || tipoOrden === 'Repeticion con Cambio') return 0;
    
    const areaTroquelCm2 = (troquel?.ancho_mm / 10) * (troquel?.largo_mm / 10) || 1200;
    const costoPorCm2 = row?.costo_cyrel_por_cm2 || 0.05;
    return areaTroquelCm2 * tintasEfectivas * costoPorCm2;
})();

const costoMontajeTotal = costoPlanchasMaterial + costoMontajeOriginal;
```

### 3.4 UI: Mostrar Área de Troquel

**En `calculo-flexografia/app.js` (después de cargar el troquel):**

```javascript
function renderTroquelInfo(troquel) {
    if (!troquel) return '';
    
    const areaCm2 = ((troquel.ancho_mm || 0) / 10) * ((troquel.largo_mm || 0) / 10);
    const areaIn2 = areaCm2 * 0.155; // cm² to in²
    
    return `
    <div class="troquel-info-card">
        <h4>${troquel.descripcion || 'Troquel'}</h4>
        <div class="troquel-details">
            <span>Dimensiones: ${troquel.ancho_mm || 0} × ${troquel.largo_mm || 0} mm</span>
            <span class="highlight">Área: ${areaCm2.toFixed(2)} cm² (${areaIn2.toFixed(2)} in²)</span>
            <span>Uso: ${troquel.veces_usado || 0} veces</span>
        </div>
    </div>
    `;
}
```

---

## 4. Cálculos Corregidos

### 4.1 Fórmula Final de Plancas (Corregida)

```
PARA CONVENCIONAL (Nuevo):
    SI tipoOrden = "Nuevo":
        Área Troquel (cm²) = (ancho_mm / 10) × (largo_mm / 10)
        Costo Pláchas = Área Troquel × #Tintas_Efectivas × $/cm²
    
    SI tipoOrden = "Repetición" o "Repetición con Cambio":
        Costo Pláchas = 0  // No cobrar
    
    Costo Montaje (Tiempo) = #Tintas × Factor_Estación × #Cambios × $/minuto_máquina
    
    COSTO TOTAL PLANCHAS = Costo Pláchas (Material) + Costo Montaje (Tiempo)
```

### 4.2 Fórmula de Mácula (Startup Waste)

```
PARA AMBOS PROCESOS (Digital y Convencional):
    
    Mácula (pies) = startup_waste_feet (default: 100 pies)
    
    COSTO MÁCULA = Mácula (pies) × $/pie
    
    // Se muestra EN LA SECCIÓN DE TINTAS de cada proceso
    // No se oculta en "Material consumido"
```

### 4.3 Fórmula de Tintas (Digital - Promedio)

```
PARA DIGITAL:
    
    SI cantidad < 500,000:
        Costo Tinta CMYK = MSI × $/MSI_CMYK × 4 tintas
        Costo Tinta Blanco = MSI × $/MSI_Blanco × (blanco ? 1.2 : 0)
        Costo Tinta Especial = MSI × $/MSI_Especial_Promedio × #especiales
    
    SI cantidad >= 500,000:
        // Opción de especificar color exacto (Pantone 123, etc.)
        Costo Tinta Especial = MSI × $/MSI_Pantone_123 (específico)
```

---

## 5. Mejoras de UI/UX

### 5.1 Organización de Sección de Tintas

**Estructura sugerida en `calculo-flexografia/app.js`:**

```javascript
function renderImpresionSection(proceso) {
    const isDigital = proceso.procesoProductivo === 'digital';
    const maculaPies = proceso.startupWasteFeet || (isDigital ? 80 : 100);
    const maculaCosto = maculaPies * (isDigital ? 
        proceso.digitalMaculaCostoPorPie : proceso.convMaculaCostoPorPie);
    
    return `
    <div class="proceso-section impresion-section">
        <h3>Impresión ${isDigital ? 'Digital' : 'Convencional'}</h3>
        
        <!-- 1. Configuración de Tintas -->
        <div class="subsection">
            <h4>1. Configuración de Tintas</h4>
            <div class="tintas-config-grid">
                <label>CMYK: <input type="number" value="${proceso.cmykCount || 4}" data-field="cmykCount"></label>
                <label>Blanco: <input type="checkbox" ${proceso.tintaBlanca ? 'checked' : ''} data-field="tintaBlanca"></label>
                <label>Pantones: <input type="number" value="${proceso.pantones || 0}" data-field="pantones"></label>
                ${isDigital ? `
                    <label>Especiales: <input type="number" value="${proceso.especiales || 0}" data-field="especiales"></label>
                ` : ''}
            </div>
        </div>
        
        <!-- 2. Mácula de Impresión (Startup Waste) -->
        <div class="subsection macula-section">
            <h4>2. Mácula de Impresión</h4>
            <div class="macula-info">
                <span>Pies de desperdicio: ${maculaPies} pies</span>
                <span>Costo: $${maculaCosto.toFixed(2)}</span>
                <span class="hint">Se incluye en el consumo total de material</span>
            </div>
        </div>
        
        <!-- 3. Costos por Tipo de Tinta -->
        <div class="subsection ink-costs-section">
            <h4>3. Costos por Tipo de Tinta</h4>
            <table class="ink-costs-table">
                <tr><th>Tipo</th><th>Costo</th><th>Uso en este trabajo</th></tr>
                <tr><td>CMYK Estándar</td><td>$${proceso.cmykCostPerKg}/kg</td><td>${proceso.cmykCount || 4} tintas</td></tr>
                <tr><td>Blanco</td><td>$${proceso.whiteCostPerKg}/kg</td><td>${proceso.tintaBlanca ? 'Sí (1.2×)' : 'No'}</td></tr>
                <tr><td>Pantone</td><td>$${proceso.pantoneCostPerKg}/kg</td><td>${proceso.pantones || 0} colores</td></tr>
                ${isDigital ? `
                    <tr><td>Especiales (Promedio)</td><td>$${proceso.specialCostPerKg}/kg</td><td>${proceso.especiales || 0} colores</td></tr>
                ` : ''}
            </table>
        </div>
        
        <!-- 4. Cálculo Final -->
        <div class="subsection calculation-result">
            <h4>4. Cálculo Final</h4>
            <div>Consumo MSI: ${proceso.msiConMerma}</div>
            <div>Costo Tintas: $${proceso.costoTintas.toFixed(2)}</div>
            <div>Costo Mácula: $${maculaCosto.toFixed(2)}</div>
            <div class="total"><strong>Subtotal Tintas: $${(proceso.costoTintas + maculaCosto).toFixed(2)}</strong></div>
        </div>
    </div>
    `;
}
```

### 5.2 Estilos CSS (Ya Existentes)

El usuario mencionó que ya tiene estilos "muy bonitos" para:
- `.campo-faltante` (resaltar en rojo)
- `.process-section` (tarjetas de procesos)
- `.ink-costs-table` (tablas de costos)

---

## 6. Sistema de Alertas

### 6.1 Validación de Proforma (Antes de Imprimir)

**Archivo**: `proforma.js` o donde se maneje la impresión:

```javascript
async function imprimirProforma(quoteCode) {
    // 1. Validar todas las líneas
    const validacion = await validarLineasCompletas(quoteCode);
    
    if (!validacion.esValido) {
        // Mostrar errores con estilo "bonito"
        mostrarErroresValidacion(validacion.errores);
        return;  // NO imprimir
    }
    
    // 2. Si hay advertencias, confirmar
    if (validacion.advertencias.length > 0) {
        const mensaje = `Advertencias:\n${validacion.advertencias.join('\n')}\n\n¿Desea continuar?`;
        if (!confirm(mensaje)) return;
    }
    
    // 3. Proceder a imprimir
    window.print();
}

async function validarLineasCompletas(quoteCode) {
    const response = await fetch(`/api/cotizaciones/${quoteCode}/validar`);
    const data = await response.json();
    return data;  // { esValido: bool, errores: [], advertencias: [] }
}

// En el backend (server.js), agregar endpoint de validación:
app.get('/api/cotizaciones/:codigo/validar', async (req, res) => {
    const codigo = req.params.codigo;
    const lineas = await obtenerLineas(codigo);
    const errores = [];
    const advertencias = [];
    
    lineas.forEach((linea, index) => {
        // Errores (obligatorios)
        if (!linea.material_code) errores.push(`Línea ${index + 1}: Material no seleccionado`);
        if (!linea.machine_name) errores.push(`Línea ${index + 1}: Máquina no seleccionada`);
        if (linea.tintas_efectivas <= 0) errores.push(`Línea ${index + 1}: Debe tener al menos 1 tinta`);
        if (!linea.die_code && !linea.no_requiere_troquel) {
            errores.push(`Línea ${index + 1}: Troquel no seleccionado`);
        }
        
        // Advertencias (urgentes pero no bloqueantes)
        if (linea.tipo_orden === 'Nuevo' && linea.cantidad_cambios > 3) {
            advertencias.push(`Línea ${index + 1}: Muchos cambios (${linea.cantidad_cambios})`);
        }
        if (linea.tintas_efectivas > 6) {
            advertencias.push(`Línea ${index + 1}: Muchas tintas (${linea.tintas_efectivas})`);
        }
    });
    
    res.json({
        esValido: errores.length === 0,
        errores,
        advertencias
    });
});
```

### 6.2 Resaltar Campos Faltantes (UI)

```javascript
function mostrarErroresValidacion(errores) {
    // Limpiar resaltados anteriores
    document.querySelectorAll('.campo-faltante').forEach(el => el.classList.remove('campo-faltante'));
    
    // Resaltar nuevos
    errores.forEach(error => {
        const matchLinea = error.match(/Línea (\d+)/);
        if (!matchLinea) return;
        
        const lineaIndex = parseInt(matchLinea[1]) - 1;
        const campoFaltante = determinarCampoFaltante(error);
        
        const elemento = document.querySelector(
            `[data-line-index="${lineaIndex}"] [data-field="${campoFaltante}"]`
        );
        
        if (elemento) {
            elemento.classList.add('campo-faltante');
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    // Mostrar modal con errores
    mostrarModalErrores(errores);
}

function determinarCampoFaltante(error) {
    if (error.includes('Material')) return 'materialId';
    if (error.includes('Máquina')) return 'machineId';
    if (error.includes('Tinta')) return 'tintasEfectivas';
    if (error.includes('Troquel')) return 'dieCode';
    return '';
}
```

---

## 7. Backup y Restauración

### 7.1 Funcionalidad Sugerida (Postergada)

El usuario confirmó: **"Creo que con eso claro, podemos avanzar... Eso sí, intentarlo"**

Se implementará después de las correcciones críticas.

**Esquema básico**:
```javascript
// Backup
async function backupQuote(quoteCode) {
    const response = await fetch(`/api/cotizaciones/${quoteCode}/backup`, { method: 'POST' });
    const data = await response.json();
    // Descargar archivo JSON
    descargarArchivo(data.backupFile, `cotizacion_${quoteCode}_backup.json`);
}

// Restore
async function restoreQuote(backupFile) {
    const formData = new FormData();
    formData.append('backup', backupFile);
    
    const response = await fetch(`/api/cotizaciones/restore`, { 
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    if (data.ok) {
        alert('Cotización restaurada exitosamente');
        cargarCotizacion(data.quoteCode);
    }
}
```

---

## 8. Fórmulas Completas

### 8.1 Métricas Físicas ✅ (Sin Cambios)

| Variable | Fórmula | Línea |
|----------|---------|-------|
| MSI | `(ancho_rollo × largo_total_pulg) / 1000` | flexo-regular.js:24 |
| MSI con Merma | `MSI × (1 + %merma/100)` | flexo-regular.js:25 |
| Pies | `largo_total_pulg / 12` | flexo-regular.js:22 |
| Pies con Merma | `Pies × (1 + %merma/100)` | flexo-regular.js:23 |
| Área m² | `(ancho_rollo×0.0254) × (largo_total×0.0254)` | flexo-regular.js:26 |
| Peso kg | `Área_m² × (gramaje/1000) × (1 + %merma/100)` | flexo-regular.js:27 |

### 8.2 Costos Corregidos ⚠️ (CAMBIOS)

| Concepto | Fórmula Anterior (Incorrecta) | Fórmula Nueva (Correcta) | Prioridad |
|-----------|----------------------|-------------------|-----------|
| **Planchas Material** | `costoCyrel` (fijo) | `(ancho_mm/10 × largo_mm/10) × #tintas × $/cm²` | **P0** |
| **Planchas Repetición** | Igual (cobra siempre) | **0** (no cobrar en repetición) | **P0** |
| **Montaje Tiempo** | Incluía material | Solo tiempo: `#tintas × factor × #cambios × $/min` | **P0** |
| **Mácula Digital** | Oculto en material | Mostrar en sección **Tintas** de cada proceso | **P1** |
| **Mácula Convencional** | Oculto en material | Mostrar en sección **Tintas** de cada proceso | **P1** |
| **Tintas Digital** | Mismo $/kg para todas | `$Promedio` para <500k, `$Específico` para >500k | **P1** |
| **Área Troquel** | No se mostraba | `(ancho_mm/10 × largo_mm/10) cm²` | **P1** |

### 8.3 Fórmula Final de Costos (Agrupada)

```
SUBTOTAL COSTOS = 
    Material (MSI × $/MSI) + 
    Preprensa (tiempo_base + cambios) + 
    Placas Material (Área_cm² × #tintas × $/cm²) +  ← NUEVO
    Placas Tiempo (#tintas × factor × #cambios × $/min) +  ← CORREGIDO
    Tintas (MSI × $/MSI × #tintas) + 
    Mácula (pies × $/pie) +  ← NUEVO (en sección Tintas)
    Tiraje (minutos × $/min) + 
    Acabados (barniz, laminado, etc.)

+ Imprevistos (3%)
+ Financieros (2%)
+ Rendimiento (22-28%)
+ Comisiones (3-10%)
+ IVA (12%)

= TOTAL
```

---

## Conclusión

### ✅ Lo que se va a hacer (Priorizado):

| # | Acción | Prioridad | Estado |
|---|--------|-----------|--------|
| 1 | Calcular planchas por área de troquel | **P0** | Pendiente |
| 2 | No cobrar planchas en repeticiones | **P0** | Pendiente |
| 3 | Mostrar área de troquel en UI | **P1** | Pendiente |
| 4 | Mácula de impresión en sección Tintas | **P1** | Pendiente |
| 5 | Ordenar sección de tintas por flujo | **P1** | Pendiente |
| 6 | Validar proforma antes de imprimir | **P1** | Pendiente |
| 7 | Alertas visuales (campos faltantes) | **P2** | Pendiente |
| 8 | Backup/Restore | **P3** | Postergado |

### 📋 Lo que se deja como está:

- Costos de material (ya incluye cara/adhesivo/liner)
- Guías laterales (ya incluidas en ancho de troquel)
- Mantenimiento/Energía (ya en costo_hora_máquina)
- Tintas digitales (usar promedio para <500k)
- Procesos adicionales (para planchas externas)

---

**Documento generado**: 28 de abril de 2026  
**Versión**: Final con acuerdos del usuario  
**Archivos a modificar**:
- `services/flexo-engine/dist/domain/flexo-regular-calculator.js` (líneas 52-57)
- `server.js` (línea ~3626)
- `calculo-flexografia/app.js` (aguregar renderTroquelInfo, renderImpresionSection)
- `sql/schema_flexo_core.sql` (aguardar campos y triggers)
- `proforma.js` (validación antes de imprimir)

¿Procedo a hacer los cambios en el código?
