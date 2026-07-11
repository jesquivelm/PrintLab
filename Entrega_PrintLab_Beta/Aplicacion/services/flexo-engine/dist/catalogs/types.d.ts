import { FlexoProcesoProductivo } from "../domain/flexo-regular.js";
import { FlexoRegularParametrosCosto } from "../domain/flexo-regular-calculator.js";
export interface MaterialCatalogItem {
    id: string;
    descripcion: string;
    procesoProductivo: FlexoProcesoProductivo;
    codigoProducto?: string;
    nombre?: string;
    nombreTecnico?: string;
    familia?: string;
    marca?: string;
    modelo?: string;
    proveedor?: string;
    bodega?: string;
    adhesivo?: string;
    calibre?: number;
    gramaje?: number;
    gramajePorM2?: number;
    ancho?: number;
    largo?: number;
    areaMetros?: number;
    materialActivo?: boolean;
    materialFlexoConv?: boolean;
    materialFlexoDigital?: boolean;
    unidadConsumo?: string;
    precioKgCotizacionDol?: number;
    precioMetroLinealCotizacionDol?: number;
    precioUnitarioCotizacionCol?: number;
    precioUnitarioCotizacionDol?: number;
    costoMaterialPorMsi?: number;
    costoMaterialPorKg?: number;
}
export interface ProductCatalogItem {
    id: string;
    nombre: string;
    tipoProducto: string;
}
export interface MachineCatalogItem {
    id: string;
    nombre: string;
    procesoProductivo: FlexoProcesoProductivo;
    marca?: string;
    modelo?: string;
    proceso?: string;
    clasificacion?: string;
    subprocesos?: string[];
    costoMinutoMaquina?: number;
    factorMontajePorEstacion?: number;
    piesPorMinuto?: number;
    costoHoraPreprensa?: number;
    minutosPreprensaPorCambio?: number;
    costoTintaPorMsi?: number;
}
export interface MachineInventoryProcessItem {
    id: string;
    machineId: string;
    marca: string;
    modelo: string;
    proceso: string;
    subproceso: string;
    nombreMaquina: string;
    unidadTrabajo?: string;
    tiempoPreparacionGeneral?: number;
    tiempoPorEstacion?: number;
    tiempoAdicionalPreparacion?: number;
    factorProcesoPorArea?: number;
    variablesQueAfectanTiempo?: string[];
    tipoConsumo?: string;
    velocidadProduccion?: number;
    costoHoraMaquina?: number;
    costoHoraOperador?: number;
    formulaCalculoTiempo?: string;
    formulaCalculoCosto?: string;
    procesoProductivo?: FlexoProcesoProductivo;
    clasificacion?: "impresion" | "planchas" | "acabados" | "soporte" | "diseno";
}
export interface TroquelCatalogItem {
    id: string;
    descripcion: string;
    codigoTroquel?: string;
    clasificacion?: string;
    ancho?: number;
    largo?: number;
    anchoTroquel?: number;
    largoTroquel?: number;
    anchoEtiqueta?: number;
    largoEtiqueta?: number;
    areaEtiqueta?: number;
    areaEtiquetaConExcesos?: number;
    areaTroquel?: number;
    anchoMaterial?: number;
    filas?: number;
    dientes?: number;
    repeticiones?: number;
    gap?: number;
    proveedor?: string;
    tipoTroquel?: string;
    montajeTroquel?: string;
    estructuraTroquel?: string;
    desarrollo?: number;
    tension?: string;
    elongacion?: string;
    vidaUtilGolpesRestantes?: number;
    vidaUtilGolpesUsados?: number;
    vidaUtilGolpesTotal?: number;
    nombreProducto?: string;
    costoBase?: number;
}
export interface CostCatalogsFile {
    flexoRegular: FlexoRegularParametrosCosto & {
        machines?: MachineCatalogItem[];
    };
}
