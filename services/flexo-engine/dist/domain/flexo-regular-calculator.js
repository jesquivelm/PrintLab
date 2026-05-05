import { safeDivide, toMoney, toPercent } from "./shared.js";
import { validarFlexoRegular } from "./flexo-regular.js";
function getTintasEfectivas(entrada) {
    const base = (entrada.tintas.cmyk ? 4 : 0) +
        (entrada.tintas.pantones ?? 0) +
        (entrada.tintas.tintaBlanca ? 1 : 0);
    const extraBlanco = entrada.tintas.tintaBlanca && entrada.tintas.doblePasadaBlanco ? 1 : 0;
    if (entrada.tintas.sinImpresion) {
        return 0;
    }
    return Math.max(1, base + extraBlanco);
}
function calcularMetricas(entrada, parametros) {
    const separacionHorizontal = entrada.dimensiones.separacionHorizontalIn ?? 0;
    const separacionVertical = entrada.dimensiones.separacionVerticalIn ?? 0;
    const anchoRollo = Math.max(entrada.dimensiones.anchoRolloIn, entrada.dimensiones.anchoEtiquetaIn);
    const mermaFactor = 1 + toPercent(parametros.mermaPorcentaje, 8);
    const pasosPorLinea = Math.max(1, Math.floor((anchoRollo + separacionHorizontal) /
        Math.max(0.01, entrada.dimensiones.anchoEtiquetaIn + separacionHorizontal)));
    const filas = Math.ceil(entrada.cantidadProductos / pasosPorLinea);
    const largoTotalPulgadas = filas * (entrada.dimensiones.largoEtiquetaIn + separacionVertical);
    const piesLineales = largoTotalPulgadas / 12;
    const piesLinealesConMerma = piesLineales * mermaFactor;
    const msiBase = (anchoRollo * largoTotalPulgadas) / 1000;
    const msiConMerma = msiBase * mermaFactor;
    const areaM2 = (anchoRollo * 0.0254) * (largoTotalPulgadas * 0.0254);
    const pesoKg = areaM2 * ((parametros.gramaje ?? 0) / 1000) * mermaFactor;
    const tintasEfectivas = getTintasEfectivas(entrada);
    const minutosTiraje = safeDivide(piesLinealesConMerma, parametros.piesPorMinuto ?? 180);
    return {
        pasosPorLinea,
        filas,
        largoTotalPulgadas: toMoney(largoTotalPulgadas),
        piesLineales: toMoney(piesLineales),
        piesLinealesConMerma: toMoney(piesLinealesConMerma),
        msiBase: toMoney(msiBase),
        msiConMerma: toMoney(msiConMerma),
        areaM2: toMoney(areaM2),
        pesoKg: toMoney(pesoKg),
        tintasEfectivas,
        minutosTiraje: toMoney(minutosTiraje)
    };
}
function calcularDesglose(entrada, parametros, metricas) {
    const costoMaterial = (parametros.costoMaterialPorKg ?? 0) > 0 && (parametros.gramaje ?? 0) > 0
        ? metricas.pesoKg * (parametros.costoMaterialPorKg ?? 0)
        : metricas.msiConMerma * (parametros.costoMaterialPorMsi ?? 0);
    const costoPreprensaBase = parametros.costoHoraPreprensa ?? 0;
    const costoPreprensaCambios = Math.max(0, (entrada.cantidadCambios ?? 1) - 1) *
        (parametros.minutosPreprensaPorCambio ?? 10) *
        safeDivide(parametros.costoHoraPreprensa ?? 0, 60);
    // Material cost of plates (NEW - Area based)
    const costoPlanchasMaterial = (() => {
        if (entrada.procesoProductivo !== "convencional") return 0;
        // Don't charge plates for repeat orders (plates already exist)
        if (entrada.tipoOrden === "Repeticion" || entrada.tipoOrden === "Repeticion con Cambio") {
            return 0;
        }
        
        // Calculate plate area from troquel dimensions (mm to cm)
        const troquel = entrada.troquel;
        const areaTroquelCm2 = troquel ? 
            ((troquel.ancho_mm || 300) / 10) * ((troquel.largo_mm || 400) / 10) : 1200; // Default 30x40cm = 1200cm²
        const costoPorCm2 = parametros.costoCyrelPorCm2 ?? 0.05; // $0.05/cm²
        return areaTroquelCm2 * metricas.tintasEfectivas * costoPorCm2;
    })();

    // Time cost of plate mounting (original, now separated)
    const costoMontajeTiempo = entrada.procesoProductivo === "convencional"
        ? metricas.tintasEfectivas *
            (parametros.factorMontajePorEstacion ?? 6) *
                Math.max(1, entrada.cantidadCambios ?? 1) *
                (parametros.costoMinutoMaquina ?? 0)
        : 0;

    const costoMontaje = costoPlanchasMaterial + costoMontajeTiempo;
    const costoTintas = metricas.tintasEfectivas > 0
        ? metricas.msiConMerma *
            (parametros.costoTintaPorMsi ?? 0) *
            metricas.tintasEfectivas
        : 0;
    const costoTiraje = metricas.minutosTiraje * (parametros.costoMinutoMaquina ?? 0);
    const costoLaminado = entrada.acabados?.laminado
        ? metricas.msiConMerma * (parametros.costoLaminadoPorMsi ?? 0) +
            (parametros.setupLaminado ?? 0)
        : 0;
    const costoBarniz = entrada.acabados?.barniz
        ? metricas.msiConMerma * (parametros.costoBarnizPorMsi ?? 0)
        : 0;
    const costoTroquel = entrada.acabados?.troquel ? parametros.costoTroquel ?? 0 : 0;
    const costoArte = entrada.acabados?.arte ? parametros.costoArte ?? 0 : 0;
    const costoCyrel = entrada.acabados?.cyrel ? parametros.costoCyrel ?? 0 : 0;
    const costoMaquila = entrada.acabados?.maquila ? parametros.costoMaquila ?? 0 : 0;
    const costoFlete = entrada.acabados?.flete ? parametros.costoFlete ?? 0 : 0;
    const costoEmpaque = entrada.acabados?.empaque ? parametros.costoEmpaque ?? 0 : 0;
    
    // NEW: Macula de Impresión (Startup Waste) - goes in Tintas section
    const maculaPies = metricas.startupWasteFeet || (entrada.procesoProductivo === "digital" ? 80 : 100); // Default: Digital 80, Conv 100
    const maculaCosto = maculaPies * (parametros.costoMaculaPorPie || 0.50); // $0.50/pie
    
    return {
        material: toMoney(costoMaterial),
        preprensa: toMoney(costoPreprensaBase + costoPreprensaCambios),
        montaje: toMoney(costoMontaje),  // Total: platosMaterial + montajeTiempo
        platosMaterial: toMoney(costoPlanchasMaterial),  // NEW - Plate material cost by area
        montajeTiempo: toMoney(costoMontajeTiempo),  // NEW - Plate mounting time cost
        tintas: toMoney(costoTintas),
        tiraje: toMoney(costoTiraje),
        laminado: toMoney(costoLaminado),
        barniz: toMoney(costoBarniz),
        troquel: toMoney(costoTroquel),
        arte: toMoney(costoArte),
        // cyrel field removed - replaced by platosMaterial
        macula: toMoney(maculaCosto),  // NEW - Startup waste in Tintas section
        maquila: toMoney(costoMaquila),
        flete: toMoney(costoFlete),
        empaque: toMoney(costoEmpaque)
    };
}
function calcularResumen(entrada, parametros, desglose) {
    const subtotalCostosSinImpuestos = Object.values(desglose).reduce((acc, current) => acc + current, 0);
    const subtotalCostosMasImprevistos = subtotalCostosSinImpuestos *
        (1 + toPercent(parametros.porcentajeImprevistos, 3));
    const subtotalCostosMasImprevistosYFinancieros = subtotalCostosMasImprevistos *
        (1 + toPercent(parametros.porcentajeFinancieros, 2));
    const subtotalConRendimientoBruto = subtotalCostosMasImprevistosYFinancieros *
        (1 + toPercent(parametros.porcentajeRendimientoBruto, 35));
    const subtotalAntesIva = subtotalConRendimientoBruto *
        (1 + toPercent(parametros.porcentajeComisionVendedor, 3)) *
        (1 + toPercent(parametros.porcentajeComisionDepartamento, 10)) *
        (1 + toPercent(parametros.porcentajeComisionAgencia, 0));
    const iva = subtotalAntesIva * toPercent(parametros.porcentajeIva, 12);
    const total = subtotalAntesIva + iva;
    const unitarioSinIva = safeDivide(subtotalAntesIva, entrada.cantidadProductos);
    const unitarioConIva = safeDivide(total, entrada.cantidadProductos);
    return {
        subtotalCostosSinImpuestos: toMoney(subtotalCostosSinImpuestos),
        subtotalCostosMasImprevistos: toMoney(subtotalCostosMasImprevistos),
        subtotalCostosMasImprevistosYFinancieros: toMoney(subtotalCostosMasImprevistosYFinancieros),
        subtotalConRendimientoBruto: toMoney(subtotalConRendimientoBruto),
        subtotalAntesIva: toMoney(subtotalAntesIva),
        iva: toMoney(iva),
        total: toMoney(total),
        unitarioSinIva: toMoney(unitarioSinIva),
        unitarioConIva: toMoney(unitarioConIva)
    };
}
export function calcularFlexoRegular(entrada, parametros) {
    const validacion = validarFlexoRegular(entrada);
    if (!validacion.esValido) {
        return validacion;
    }
    const metricas = calcularMetricas(entrada, parametros);
    const desglose = calcularDesglose(entrada, parametros, metricas);
    const resumen = calcularResumen(entrada, parametros, desglose);
    return {
        ...validacion,
        metricas,
        desglose,
        resumen
    };
}
