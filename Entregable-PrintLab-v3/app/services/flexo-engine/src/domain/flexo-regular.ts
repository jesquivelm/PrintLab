export type FlexoProcesoProductivo = "convencional" | "digital" | "hibrido";

export type FlexoTipoOrden =
  | "Nuevo"
  | "Repeticion"
  | "Repeticion con Cambio"
  | "Pruebas"
  | "Muestras"
  | "Regalias";

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

export function validarFlexoRegular(entrada: FlexoRegularEntrada): FlexoRegularResultado {
  const validaciones: FlexoRegularValidacion[] = [];

  if (!entrada.cantidadProductos || entrada.cantidadProductos <= 0) {
    validaciones.push({
      campo: "cantidadProductos",
      mensaje: "Debe definir la cantidad de productos."
    });
  }

  if (!entrada.tipoOrden) {
    validaciones.push({
      campo: "tipoOrden",
      mensaje: "Debe definir el tipo de orden."
    });
  }

  if (
    (entrada.tipoOrden === "Repeticion" || entrada.tipoOrden === "Repeticion con Cambio") &&
    !entrada.ordenReferencia
  ) {
    validaciones.push({
      campo: "ordenReferencia",
      mensaje: "Debe definir la orden de referencia."
    });
  }

  if (!entrada.materialId) {
    validaciones.push({
      campo: "materialId",
      mensaje: "Debe seleccionar un material valido."
    });
  }

  if (!entrada.tipoProducto) {
    validaciones.push({
      campo: "tipoProducto",
      mensaje: "Debe definir el tipo de producto."
    });
  }

  if (!entrada.dimensiones?.anchoEtiquetaIn || !entrada.dimensiones?.largoEtiquetaIn) {
    validaciones.push({
      campo: "dimensiones",
      mensaje: "Debe definir ancho y largo de etiqueta."
    });
  }

  if (!entrada.tipoEtiquetado) {
    validaciones.push({
      campo: "tipoEtiquetado",
      mensaje: "Debe definir el tipo de etiquetado."
    });
  }

  if (entrada.tipoEtiquetado === "Automatico" && !entrada.tipoSalida) {
    validaciones.push({
      campo: "tipoSalida",
      mensaje: "Debe definir el tipo de salida del rollo."
    });
  }

  const sinImpresion = Boolean(entrada.tintas?.sinImpresion);
  const cantidadTintas =
    (entrada.tintas?.cmyk ? 4 : 0) +
    (entrada.tintas?.pantones ?? 0) +
    (entrada.tintas?.tintaBlanca ? 1 : 0);

  if (sinImpresion && cantidadTintas > 0) {
    validaciones.push({
      campo: "tintas",
      mensaje: "Existe una inconsistencia entre sin impresion y la cantidad de tintas."
    });
  }

  if (!sinImpresion && cantidadTintas <= 0) {
    validaciones.push({
      campo: "tintas",
      mensaje: "Debe definir la cantidad de tintas a imprimir."
    });
  }

  return {
    formatoCotizacion: "regular",
    esValido: validaciones.length === 0,
    validaciones
  };
}
