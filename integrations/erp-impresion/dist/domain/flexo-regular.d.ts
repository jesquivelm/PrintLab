export type FlexoProcesoProductivo = "convencional" | "digital" | "hibrido";
export type FlexoTipoOrden = "Nuevo" | "Repeticion" | "Repeticion con Cambio" | "Pruebas" | "Muestras" | "Regalias";
export type FlexoTipoEtiquetado = "Manual" | "Automatico";
export interface FlexoRegularDimensiones {
    anchoEtiquetaIn: number;
    largoEtiquetaIn: number;
    anchoRolloIn: number;
    separacionHorizontalIn?: number;
    separacionVerticalIn?: number;
}
export interface FlexoRegularTintas {
    sinImpresion?: boolean;
    cmyk?: boolean;
    pantones?: number;
    tintaBlanca?: boolean;
    doblePasadaBlanco?: boolean;
}
export interface FlexoRegularAcabados {
    laminado?: boolean;
    barniz?: boolean;
    troquel?: boolean;
    arte?: boolean;
    cyrel?: boolean;
    maquila?: boolean;
    flete?: boolean;
    empaque?: boolean;
}
export interface FlexoRegularEntrada {
    clienteId?: string;
    clienteNombre?: string;
    vendedorNombre?: string;
    nombreTrabajo?: string;
    codigoTrabajo?: string;
    versionTrabajo?: string;
    versionCostos?: string;
    fechaCreacion?: string;
    procesoProductivo: FlexoProcesoProductivo;
    tipoOrden: FlexoTipoOrden;
    ordenReferencia?: string;
    tipoProducto: string;
    cantidadProductos: number;
    cantidadCambios?: number;
    cantidadTipos?: number;
    facturarEnJuegos?: boolean;
    dimensiones: FlexoRegularDimensiones;
    materialId: string;
    materialDescripcion?: string;
    tipoEtiquetado: FlexoTipoEtiquetado;
    tipoSalida?: string;
    anchoCoreMm?: number;
    diametroCoreMm?: number;
    etiquetasPorRollo?: number;
    tintas: FlexoRegularTintas;
    acabados?: FlexoRegularAcabados;
}
export interface FlexoRegularValidacion {
    campo: string;
    mensaje: string;
}
export interface FlexoRegularResultado {
    formatoCotizacion: "regular";
    esValido: boolean;
    validaciones: FlexoRegularValidacion[];
}
export declare function validarFlexoRegular(entrada: FlexoRegularEntrada): FlexoRegularResultado;
