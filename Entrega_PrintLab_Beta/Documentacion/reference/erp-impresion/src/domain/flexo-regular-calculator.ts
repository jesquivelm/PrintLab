import { safeDivide, toMoney, toPercent } from "./shared.js";
import {
  FlexoRegularEntrada,
  FlexoRegularResultado,
  validarFlexoRegular
} from "./flexo-regular.js";

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

function getTintasEfectivas(entrada: FlexoRegularEntrada): number {
  const base =
    (entrada.tintas.cmyk ? 4 : 0) +
    (entrada.tintas.pantones ?? 0) +
    (entrada.tintas.tintaBlanca ? 1 : 0);

  const extraBlanco =
    entrada.tintas.tintaBlanca && entrada.tintas.doblePasadaBlanco ? 1 : 0;

  if (entrada.tintas.sinImpresion) {
    return 0;
  }

  return Math.max(1, base + extraBlanco);
}

function calcularMetricas(
  entrada: FlexoRegularEntrada,
  parametros: FlexoRegularParametrosCosto
): FlexoRegularMetricasProduccion {
  const separacionHorizontal = entrada.dimensiones.separacionHorizontalIn ?? 0;
  const separacionVertical = entrada.dimensiones.separacionVerticalIn ?? 0;
  const anchoRollo = Math.max(
    entrada.dimensiones.anchoRolloIn,
    entrada.dimensiones.anchoEtiquetaIn
  );
  const mermaFactor = 1 + toPercent(parametros.mermaPorcentaje, 8);

  const pasosPorLinea = Math.max(
    1,
    Math.floor(
      (anchoRollo + separacionHorizontal) /
        Math.max(0.01, entrada.dimensiones.anchoEtiquetaIn + separacionHorizontal)
    )
  );

  const filas = Math.ceil(entrada.cantidadProductos / pasosPorLinea);
  const largoTotalPulgadas =
    filas * (entrada.dimensiones.largoEtiquetaIn + separacionVertical);
  const piesLineales = largoTotalPulgadas / 12;
  const piesLinealesConMerma = piesLineales * mermaFactor;
  const msiBase = (anchoRollo * largoTotalPulgadas) / 1000;
  const msiConMerma = msiBase * mermaFactor;
  const areaM2 = (anchoRollo * 0.0254) * (largoTotalPulgadas * 0.0254);
  const pesoKg = areaM2 * ((parametros.gramaje ?? 0) / 1000) * mermaFactor;
  const tintasEfectivas = getTintasEfectivas(entrada);
  const minutosTiraje = safeDivide(
    piesLinealesConMerma,
    parametros.piesPorMinuto ?? 180
  );

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

function calcularDesglose(
  entrada: FlexoRegularEntrada,
  parametros: FlexoRegularParametrosCosto,
  metricas: FlexoRegularMetricasProduccion
): FlexoRegularDesglose {
  const costoMaterial =
    (parametros.costoMaterialPorKg ?? 0) > 0 && (parametros.gramaje ?? 0) > 0
      ? metricas.pesoKg * (parametros.costoMaterialPorKg ?? 0)
      : metricas.msiConMerma * (parametros.costoMaterialPorMsi ?? 0);

  const costoPreprensaBase = parametros.costoHoraPreprensa ?? 0;
  const costoPreprensaCambios =
    Math.max(0, (entrada.cantidadCambios ?? 1) - 1) *
    (parametros.minutosPreprensaPorCambio ?? 10) *
    safeDivide(parametros.costoHoraPreprensa ?? 0, 60);

  const costoMontaje =
    entrada.procesoProductivo === "convencional"
      ? metricas.tintasEfectivas *
        (parametros.factorMontajePorEstacion ?? 6) *
        Math.max(1, entrada.cantidadCambios ?? 1) *
        (parametros.costoMinutoMaquina ?? 0)
      : 0;

  const costoTintas =
    metricas.tintasEfectivas > 0
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

  return {
    material: toMoney(costoMaterial),
    preprensa: toMoney(costoPreprensaBase + costoPreprensaCambios),
    montaje: toMoney(costoMontaje),
    tintas: toMoney(costoTintas),
    tiraje: toMoney(costoTiraje),
    laminado: toMoney(costoLaminado),
    barniz: toMoney(costoBarniz),
    troquel: toMoney(costoTroquel),
    arte: toMoney(costoArte),
    cyrel: toMoney(costoCyrel),
    maquila: toMoney(costoMaquila),
    flete: toMoney(costoFlete),
    empaque: toMoney(costoEmpaque)
  };
}

function calcularResumen(
  entrada: FlexoRegularEntrada,
  parametros: FlexoRegularParametrosCosto,
  desglose: FlexoRegularDesglose
): FlexoRegularResumen {
  const subtotalCostosSinImpuestos = Object.values(desglose).reduce(
    (acc, current) => acc + current,
    0
  );
  const subtotalCostosMasImprevistos =
    subtotalCostosSinImpuestos *
    (1 + toPercent(parametros.porcentajeImprevistos, 3));
  const subtotalCostosMasImprevistosYFinancieros =
    subtotalCostosMasImprevistos *
    (1 + toPercent(parametros.porcentajeFinancieros, 2));
  const subtotalConRendimientoBruto =
    subtotalCostosMasImprevistosYFinancieros *
    (1 + toPercent(parametros.porcentajeRendimientoBruto, 35));
  const subtotalAntesIva =
    subtotalConRendimientoBruto *
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
    subtotalCostosMasImprevistosYFinancieros: toMoney(
      subtotalCostosMasImprevistosYFinancieros
    ),
    subtotalConRendimientoBruto: toMoney(subtotalConRendimientoBruto),
    subtotalAntesIva: toMoney(subtotalAntesIva),
    iva: toMoney(iva),
    total: toMoney(total),
    unitarioSinIva: toMoney(unitarioSinIva),
    unitarioConIva: toMoney(unitarioConIva)
  };
}

export function calcularFlexoRegular(
  entrada: FlexoRegularEntrada,
  parametros: FlexoRegularParametrosCosto
): FlexoRegularCalculo {
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
