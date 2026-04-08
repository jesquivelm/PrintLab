import { FlexoRegularEntrada, FlexoRegularResultado } from "./flexo-regular.js";
export interface FlexoRegularParametrosCosto {
    mermaPorcentaje?: number;
    costoMaterialPorMsi?: number;
    costoMaterialPorKg?: number;
    gramaje?: number;
    costoHoraPreprensa?: number;
    minutosPreprensaPorCambio?: number;
    costoMinutoMaquina?: number;
    factorMontajePorEstacion?: number;
    costoTintaPorMsi?: number;
    piesPorMinuto?: number;
    costoLaminadoPorMsi?: number;
    setupLaminado?: number;
    costoBarnizPorMsi?: number;
    costoTroquel?: number;
    costoArte?: number;
    costoCyrel?: number;
    costoMaquila?: number;
    costoFlete?: number;
    costoEmpaque?: number;
    porcentajeImprevistos?: number;
    porcentajeFinancieros?: number;
    porcentajeRendimientoBruto?: number;
    porcentajeComisionVendedor?: number;
    porcentajeComisionDepartamento?: number;
    porcentajeComisionAgencia?: number;
    porcentajeIva?: number;
}
export interface FlexoRegularMetricasProduccion {
    pasosPorLinea: number;
    filas: number;
    largoTotalPulgadas: number;
    piesLineales: number;
    piesLinealesConMerma: number;
    msiBase: number;
    msiConMerma: number;
    areaM2: number;
    pesoKg: number;
    tintasEfectivas: number;
    minutosTiraje: number;
}
export interface FlexoRegularDesglose {
    material: number;
    preprensa: number;
    montaje: number;
    tintas: number;
    tiraje: number;
    laminado: number;
    barniz: number;
    troquel: number;
    arte: number;
    cyrel: number;
    maquila: number;
    flete: number;
    empaque: number;
}
export interface FlexoRegularResumen {
    subtotalCostosSinImpuestos: number;
    subtotalCostosMasImprevistos: number;
    subtotalCostosMasImprevistosYFinancieros: number;
    subtotalConRendimientoBruto: number;
    subtotalAntesIva: number;
    iva: number;
    total: number;
    unitarioSinIva: number;
    unitarioConIva: number;
}
export interface FlexoRegularCalculo extends FlexoRegularResultado {
    metricas?: FlexoRegularMetricasProduccion;
    desglose?: FlexoRegularDesglose;
    resumen?: FlexoRegularResumen;
}
export declare function calcularFlexoRegular(entrada: FlexoRegularEntrada, parametros: FlexoRegularParametrosCosto): FlexoRegularCalculo;
