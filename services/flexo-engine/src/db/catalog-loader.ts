import { LoadedCatalogs } from "../catalogs/file-system-catalog-loader.js";
import {
  MachineCatalogItem,
  MachineInventoryProcessItem,
  MaterialCatalogItem,
  ProductCatalogItem,
  TroquelCatalogItem
} from "../catalogs/types.js";
import { FlexoProcesoProductivo } from "../domain/flexo-regular.js";
import { CostCatalogsFile } from "../catalogs/types.js";
import { getPostgresPool } from "./postgres.js";

type DbCatalogsResult = {
  catalogs: LoadedCatalogs | null;
  source: "database" | "files";
};

type DbMachineRow = {
  id: string;
  nombre: string;
  tipo: string;
  minuto_hombre: string | number | null;
  factor_montaje_estacion: string | number | null;
  factor_preparacion: string | number | null;
  factor_tiraje: string | number | null;
};

type DbMachineCapabilityRow = {
  id: string;
  maquina_id: string;
  maquina_nombre: string;
  tipo: string;
  clasificacion: string;
  proceso: string;
  subproceso: string | null;
  unidad_trabajo: string | null;
  tiempo_preparacion_general: string | number | null;
  tiempo_adicional_preparacion: string | number | null;
  tiempo_por_estacion: string | number | null;
  factor_proceso_por_area: string | number | null;
  velocidad_produccion: string | number | null;
  costo_hora_maquina: string | number | null;
  costo_hora_operario: string | number | null;
  formula_tiempo: string | null;
  formula_costo: string | null;
};

type DbMaterialRow = {
  id: string;
  codigo: string;
  nombre: string;
  ancho_mm: string | number | null;
  gramaje_g_m2: string | number | null;
  calibre_micras: string | number | null;
  costo_x_msi: string | number | null;
  costo_x_kg: string | number | null;
  compatible_convencional: boolean;
  compatible_digital: boolean;
  tipo_proforma: string | null;
  activo: boolean;
};

type DbTroquelRow = {
  id: string;
  codigo: string;
  descripcion: string | null;
  ancho_mm: string | number | null;
  largo_mm: string | number | null;
  cantidad_filas: number | null;
  dientes: number | null;
  repeticiones: number | null;
  estado: string | null;
};

type DbGeneralCostRow = {
  pct_imprevistos: string | number;
  pct_financieros: string | number;
  pct_vendedor: string | number;
  pct_departamento_conv: string | number;
  pct_departamento_digital: string | number;
  costo_minimo: string | number;
  pct_iva: string | number;
  cyrel_costo_cm2: string | number;
  preprensa_costo_hora_conv: string | number;
  preprensa_factor_min_tipo_conv: string | number;
  preprensa_costo_hora_digital: string | number;
  preprensa_factor_min_tipo_digital: string | number;
  diseno_costo_hora: string | number;
  tinta_bcm_generico: string | number;
  tinta_cobertura_pct: string | number;
  tinta_densidad: string | number;
  tinta_costo_lb_cmyk: string | number;
  empaque_cantidad_x_minuto: string | number;
  empaque_minuto_hombre: string | number;
  empaque_tiempo_movilizacion: string | number;
  empaque_tiempo_confeccion: string | number;
};

type DbFinishCostRow = {
  tipo: string;
  subtipo: string | null;
  costo_x_msi: string | number | null;
  costo_x_m2: string | number | null;
  costo_x_pie: string | number | null;
  costo_fijo: string | number | null;
};

function asNumber(value: string | number | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pctToPercent(value: string | number | null | undefined, fallback = 0): number {
  return asNumber(value, fallback) * 100;
}

function normalizeProcessType(value: string): FlexoProcesoProductivo {
  const normalized = value.toLowerCase();

  if (normalized.includes("digit")) {
    return "digital";
  }

  if (normalized.includes("hibr")) {
    return "hibrido";
  }

  return "convencional";
}

function buildMachineCatalog(machines: DbMachineRow[]): MachineCatalogItem[] {
  return machines.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    procesoProductivo: normalizeProcessType(row.tipo),
    proceso: row.tipo,
    costoMinutoMaquina: asNumber(row.minuto_hombre),
    factorMontajePorEstacion: asNumber(row.factor_montaje_estacion),
    piesPorMinuto: asNumber(row.factor_tiraje)
  }));
}

function buildMachineProcesses(rows: DbMachineCapabilityRow[]): MachineInventoryProcessItem[] {
  return rows.map((row) => ({
    id: row.id,
    machineId: row.maquina_id,
    marca: "",
    modelo: "",
    proceso: row.proceso,
    subproceso: row.subproceso ?? "",
    nombreMaquina: row.maquina_nombre,
    unidadTrabajo: row.unidad_trabajo ?? undefined,
    tiempoPreparacionGeneral: asNumber(row.tiempo_preparacion_general),
    tiempoPorEstacion: asNumber(row.tiempo_por_estacion),
    tiempoAdicionalPreparacion: asNumber(row.tiempo_adicional_preparacion),
    factorProcesoPorArea: asNumber(row.factor_proceso_por_area),
    tipoConsumo: undefined,
    velocidadProduccion: asNumber(row.velocidad_produccion),
    costoHoraMaquina: asNumber(row.costo_hora_maquina),
    costoHoraOperador: asNumber(row.costo_hora_operario),
    formulaCalculoTiempo: row.formula_tiempo ?? undefined,
    formulaCalculoCosto: row.formula_costo ?? undefined,
    procesoProductivo: normalizeProcessType(row.tipo),
    clasificacion:
      row.clasificacion === "diseno" ||
      row.clasificacion === "planchas" ||
      row.clasificacion === "impresion" ||
      row.clasificacion === "acabados" ||
      row.clasificacion === "soporte"
        ? row.clasificacion
        : undefined
  }));
}

function buildMaterials(rows: DbMaterialRow[]): MaterialCatalogItem[] {
  return rows.map((row) => ({
    id: row.id,
    descripcion: row.nombre,
    procesoProductivo: row.compatible_digital && !row.compatible_convencional ? "digital" : "convencional",
    codigoProducto: row.codigo,
    nombre: row.nombre,
    nombreTecnico: row.nombre,
    ancho: asNumber(row.ancho_mm) / 25.4,
    calibre: asNumber(row.calibre_micras),
    gramaje: asNumber(row.gramaje_g_m2),
    gramajePorM2: asNumber(row.gramaje_g_m2),
    materialActivo: row.activo,
    materialFlexoConv: row.compatible_convencional,
    materialFlexoDigital: row.compatible_digital,
    unidadConsumo: "MSI",
    precioUnitarioCotizacionDol: asNumber(row.costo_x_msi),
    precioKgCotizacionDol: asNumber(row.costo_x_kg),
    costoMaterialPorMsi: asNumber(row.costo_x_msi),
    costoMaterialPorKg: asNumber(row.costo_x_kg),
    familia: row.tipo_proforma ?? undefined
  }));
}

function buildTroqueles(rows: DbTroquelRow[]): TroquelCatalogItem[] {
  return rows.map((row) => {
    const anchoMm = asNumber(row.ancho_mm);
    const largoMm = asNumber(row.largo_mm);
    const areaTroquel = (anchoMm * largoMm) / 1000000;

    return {
      id: row.id,
      descripcion: row.descripcion ?? row.codigo,
      codigoTroquel: row.codigo,
      anchoTroquel: anchoMm / 25.4,
      largoTroquel: largoMm / 25.4,
      anchoEtiqueta: anchoMm / 25.4,
      largoEtiqueta: largoMm / 25.4,
      filas: row.cantidad_filas ?? 1,
      dientes: row.dientes ?? 0,
      repeticiones: row.repeticiones ?? 1,
      areaTroquel,
      clasificacion: row.estado ?? undefined
    };
  });
}

function findFinishCost(rows: DbFinishCostRow[], type: string) {
  return rows.find((row) => row.tipo.toLowerCase() === type.toLowerCase());
}

function calcularCostoTintaPorMsi(general: DbGeneralCostRow): number {
  const bcm = asNumber(general.tinta_bcm_generico);
  const cobertura = asNumber(general.tinta_cobertura_pct);
  const densidad = asNumber(general.tinta_densidad);
  const costoLbCmyk = asNumber(general.tinta_costo_lb_cmyk);
  if (bcm <= 0 || cobertura <= 0 || densidad <= 0 || costoLbCmyk <= 0) return 0;
  const msiPerM2 = 645.16;
  const gPerLb = 453.592;
  return (cobertura / 100) * bcm * densidad * costoLbCmyk * (msiPerM2 / gPerLb);
}

function calcularCostoEmpaque(general: DbGeneralCostRow): number {
  const movilizacion = asNumber(general.empaque_tiempo_movilizacion);
  const confeccion = asNumber(general.empaque_tiempo_confeccion);
  const minutoHombre = asNumber(general.empaque_minuto_hombre);
  if (movilizacion <= 0 || minutoHombre <= 0) return 0;
  return (movilizacion + confeccion) * minutoHombre;
}

function buildCosts(
  general: DbGeneralCostRow,
  finishCosts: DbFinishCostRow[],
  machines: MachineCatalogItem[]
): CostCatalogsFile {
  const laminado = findFinishCost(finishCosts, "laminado");
  const barniz = findFinishCost(finishCosts, "barniz");
  const troquel = findFinishCost(finishCosts, "troquelado") ?? findFinishCost(finishCosts, "troquel");

  return {
    flexoRegular: {
      mermaPorcentaje: 8,
      costoHoraPreprensa: asNumber(general.preprensa_costo_hora_conv),
      minutosPreprensaPorCambio: asNumber(general.preprensa_factor_min_tipo_conv),
      costoMinutoMaquina: asNumber(general.costo_minimo),
      factorMontajePorEstacion: 6,
      costoTintaPorMsi: calcularCostoTintaPorMsi(general),
      piesPorMinuto: 180,
      costoLaminadoPorMsi: asNumber(laminado?.costo_x_msi),
      setupLaminado: 0,
      costoBarnizPorMsi: asNumber(barniz?.costo_x_msi),
      costoTroquel: asNumber(troquel?.costo_fijo),
      costoArte: asNumber(general.diseno_costo_hora),
      costoCyrel: asNumber(general.cyrel_costo_cm2),
      costoMaquila: 0,
      costoFlete: 0,
      costoEmpaque: calcularCostoEmpaque(general),
      porcentajeImprevistos: pctToPercent(general.pct_imprevistos),
      porcentajeFinancieros: pctToPercent(general.pct_financieros),
      porcentajeRendimientoBruto: 35,
      porcentajeComisionVendedor: pctToPercent(general.pct_vendedor),
      porcentajeComisionDepartamento: pctToPercent(general.pct_departamento_conv),
      porcentajeComisionAgencia: 0,
      porcentajeIva: pctToPercent(general.pct_iva),
      machines
    }
  };
}

export async function loadCatalogsFromDatabase(): Promise<DbCatalogsResult> {
  const db = getPostgresPool();

  try {
    const [
      machinesResult,
      machineCapabilitiesResult,
      materialsResult,
      troquelesResult,
      generalCostsResult,
      finishCostsResult
    ] = await Promise.all([
      db.query<DbMachineRow>(
        `
          select id::text, nombre, tipo::text, minuto_hombre, factor_montaje_estacion, factor_preparacion, factor_tiraje
          from maquina
          where activa = true
          order by nombre
        `
      ),
      db.query<DbMachineCapabilityRow>(
        `
          select
            mc.id::text,
            mc.maquina_id::text,
            m.nombre as maquina_nombre,
            m.tipo::text as tipo,
            mc.clasificacion,
            mc.proceso,
            mc.subproceso,
            mc.unidad_trabajo,
            mc.tiempo_preparacion_general,
            mc.tiempo_adicional_preparacion,
            mc.tiempo_por_estacion,
            mc.factor_proceso_por_area,
            mc.velocidad_produccion,
            mc.costo_hora_maquina,
            mc.costo_hora_operario,
            mc.formula_tiempo,
            mc.formula_costo
          from maquina_capacidad mc
          inner join maquina m on m.id = mc.maquina_id
          where mc.activa = true and m.activa = true
          order by m.nombre, mc.proceso, mc.subproceso nulls first
        `
      ),
      db.query<DbMaterialRow>(
        `
          select
            id::text,
            codigo,
            nombre,
            ancho_mm,
            gramaje_g_m2,
            calibre_micras,
            costo_x_msi,
            costo_x_kg,
            compatible_convencional,
            compatible_digital,
            tipo_proforma,
            activo
          from material
          where activo = true
          order by nombre
        `
      ),
      db.query<DbTroquelRow>(
        `
          select
            id::text,
            codigo,
            descripcion,
            ancho_mm,
            largo_mm,
            cantidad_filas,
            dientes,
            repeticiones,
            estado
          from troquel
          where activo = true
          order by codigo
        `
      ),
      db.query<DbGeneralCostRow>(
        `
          select
            pct_imprevistos,
            pct_financieros,
            pct_vendedor,
            pct_departamento_conv,
            pct_departamento_digital,
            costo_minimo,
            pct_iva,
            cyrel_costo_cm2,
            preprensa_costo_hora_conv,
            preprensa_factor_min_tipo_conv,
            preprensa_costo_hora_digital,
            preprensa_factor_min_tipo_digital,
            diseno_costo_hora,
            tinta_bcm_generico,
            tinta_cobertura_pct,
            tinta_densidad,
            tinta_costo_lb_cmyk,
            empaque_cantidad_x_minuto,
            empaque_minuto_hombre,
            empaque_tiempo_movilizacion,
            empaque_tiempo_confeccion
          from costo_general
          order by actualizado_en desc
          limit 1
        `
      ),
      db.query<DbFinishCostRow>(
        `
          select tipo, subtipo, costo_x_msi, costo_x_m2, costo_x_pie, costo_fijo
          from costo_acabado
          order by tipo, subtipo nulls first
        `
      )
    ]);

    const hasCoreData =
      machinesResult.rows.length > 0 ||
      materialsResult.rows.length > 0 ||
      troquelesResult.rows.length > 0 ||
      generalCostsResult.rows.length > 0;

    if (!hasCoreData) {
      return { catalogs: null, source: "files" };
    }

    const machines = buildMachineCatalog(machinesResult.rows);
    const machineProcesses = buildMachineProcesses(machineCapabilitiesResult.rows);
    const materials = buildMaterials(materialsResult.rows);
    const troqueles = buildTroqueles(troquelesResult.rows);
    const costs = buildCosts(
      generalCostsResult.rows[0] ?? {
        pct_imprevistos: 0.03,
        pct_financieros: 0.02,
        pct_vendedor: 0.03,
        pct_departamento_conv: 0.1,
        pct_departamento_digital: 0.1,
        costo_minimo: 0,
        pct_iva: 0.13,
        cyrel_costo_cm2: 0,
        preprensa_costo_hora_conv: 0,
        preprensa_factor_min_tipo_conv: 0,
        preprensa_costo_hora_digital: 0,
        preprensa_factor_min_tipo_digital: 0,
        diseno_costo_hora: 0,
        tinta_bcm_generico: 2,
        tinta_cobertura_pct: 30,
        tinta_densidad: 1.5,
        tinta_costo_lb_cmyk: 25,
        empaque_cantidad_x_minuto: 0,
        empaque_minuto_hombre: 0,
        empaque_tiempo_movilizacion: 0,
        empaque_tiempo_confeccion: 0
      },
      finishCostsResult.rows,
      machines
    );

    const catalogs: LoadedCatalogs = {
      costs,
      materials,
      products: [] as ProductCatalogItem[],
      troqueles,
      machines: machineProcesses
    };

    return { catalogs, source: "database" };
  } catch {
    return { catalogs: null, source: "files" };
  }
}

