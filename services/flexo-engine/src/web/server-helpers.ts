import { resolve } from "node:path";
import { loadCatalogsFromDataDir } from "../catalogs/file-system-catalog-loader.js";
import { loadCatalogsFromDatabase } from "../db/catalog-loader.js";
import {
  MachineCatalogItem,
  MachineInventoryProcessItem,
  MaterialCatalogItem,
  TroquelCatalogItem
} from "../catalogs/types.js";
import {
  FlexoProcesoProductivo,
  FlexoRegularEntrada,
  FlexoTipoEtiquetado,
  FlexoTipoOrden
} from "../domain/flexo-regular.js";
import {
  FlexoRegularParametrosCosto,
  calcularFlexoRegular
} from "../domain/flexo-regular-calculator.js";

async function loadActiveCatalogs() {
  const dbCatalogs = await loadCatalogsFromDatabase();
  if (dbCatalogs.catalogs) {
    return {
      catalogs: dbCatalogs.catalogs,
      source: dbCatalogs.source
    };
  }

  const dataDir = resolve(process.cwd(), "data");
  const catalogs = await loadCatalogsFromDataDir(dataDir);
  return {
    catalogs,
    source: "files" as const
  };
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function findMaterial(
  materials: MaterialCatalogItem[],
  materialId: string
): MaterialCatalogItem | undefined {
  return materials.find((item) => item.id === materialId);
}

function findMachine(
  machines: MachineCatalogItem[],
  machineId: string
): MachineCatalogItem | undefined {
  return machines.find((item) => item.id === machineId);
}

function findTroquel(
  troqueles: TroquelCatalogItem[],
  troquelId: string
): TroquelCatalogItem | undefined {
  return troqueles.find((item) => item.id === troquelId);
}

function normalizeProcessName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildMachineCatalogFromInventory(
  inventory: MachineInventoryProcessItem[],
  fallbackMachines: MachineCatalogItem[] = []
): MachineCatalogItem[] {
  if (!inventory.length) {
    return fallbackMachines;
  }

  const grouped = new Map<string, MachineInventoryProcessItem[]>();
  for (const row of inventory) {
    const bucket = grouped.get(row.machineId) ?? [];
    bucket.push(row);
    grouped.set(row.machineId, bucket);
  }

  const machines: MachineCatalogItem[] = [];
  for (const [machineId, rows] of grouped.entries()) {
    const productionRow =
      rows.find((row) => normalizeProcessName(row.subproceso) === "produccion") ?? rows[0];
    const prepRow =
      rows.find((row) => normalizeProcessName(row.subproceso) === "preparacion") ??
      productionRow;
    const processName = normalizeProcessName(productionRow.proceso);
    const procesoProductivo =
      productionRow.procesoProductivo ??
      (processName.includes("digital") ? "digital" : "convencional");

    machines.push({
      id: machineId,
      nombre: productionRow.nombreMaquina,
      marca: productionRow.marca,
      modelo: productionRow.modelo,
      proceso: productionRow.proceso,
      clasificacion: productionRow.clasificacion,
      subprocesos: rows.map((row) => row.subproceso),
      procesoProductivo,
      costoMinutoMaquina: (productionRow.costoHoraMaquina ?? 0) / 60,
      factorMontajePorEstacion:
        prepRow.tiempoPorEstacion ?? prepRow.tiempoPreparacionGeneral ?? 0,
      piesPorMinuto: productionRow.velocidadProduccion,
      costoHoraPreprensa:
        normalizeProcessName(productionRow.proceso) === "planchas"
          ? productionRow.costoHoraOperador
          : undefined,
      minutosPreprensaPorCambio: prepRow.tiempoPreparacionGeneral,
      costoTintaPorMsi: undefined
    });
  }

  return machines;
}

function normalizeSharedInput(raw: Record<string, unknown>) {
  return {
    clienteId: asString(raw.clienteId),
    clienteNombre: asString(raw.clienteNombre),
    vendedorNombre: asString(raw.vendedorNombre),
    nombreTrabajo: asString(raw.nombreTrabajo),
    codigoTrabajo: asString(raw.codigoTrabajo),
    versionTrabajo: asString(raw.versionTrabajo),
    versionCostos: asString(raw.versionCostos),
    fechaCreacion: asString(raw.fechaCreacion),
    tipoOrden: (asString(raw.tipoOrden) || "Nuevo") as FlexoTipoOrden,
    ordenReferencia: asString(raw.ordenReferencia),
    tipoProducto: asString(raw.tipoProducto),
    cantidadProductos: asNumber(raw.cantidadProductos),
    cantidadCambios: asNumber(raw.cantidadCambios, 1),
    cantidadTipos: asNumber(raw.cantidadTipos, 1),
    facturarEnJuegos: asBoolean(raw.facturarEnJuegos),
    dimensiones: {
      anchoEtiquetaIn: asNumber(raw.anchoEtiquetaIn),
      largoEtiquetaIn: asNumber(raw.largoEtiquetaIn),
      anchoRolloIn: asNumber(raw.anchoRolloIn),
      separacionHorizontalIn: asNumber(raw.separacionHorizontalIn),
      separacionVerticalIn: asNumber(raw.separacionVerticalIn)
    },
    tipoEtiquetado: (asString(raw.tipoEtiquetado) || "Manual") as FlexoTipoEtiquetado,
    tipoSalida: asString(raw.tipoSalida),
    anchoCoreMm: asNumber(raw.anchoCoreMm),
    diametroCoreMm: asNumber(raw.diametroCoreMm),
    etiquetasPorRollo: asNumber(raw.etiquetasPorRollo),
    tintas: {
      sinImpresion: asBoolean(raw.sinImpresion),
      cmyk: asBoolean(raw.cmyk),
      pantones: asNumber(raw.pantones),
      tintaBlanca: asBoolean(raw.tintaBlanca),
      doblePasadaBlanco: asBoolean(raw.doblePasadaBlanco)
    },
    acabados: {
      laminado: asBoolean(raw.laminado),
      barniz: asBoolean(raw.barniz),
      troquel: asBoolean(raw.troquel),
      arte: asBoolean(raw.arte),
      cyrel: asBoolean(raw.cyrel),
      maquila: asBoolean(raw.maquila),
      flete: asBoolean(raw.flete),
      empaque: asBoolean(raw.empaque)
    },
    overrides: {
      mermaPorcentaje: asNumber(raw.mermaPorcentaje, 8),
      costoHoraPreprensa: asNumber(raw.costoHoraPreprensa),
      minutosPreprensaPorCambio: asNumber(raw.minutosPreprensaPorCambio, 10),
      costoTintaPorMsi: asNumber(raw.costoTintaPorMsi),
      costoMinutoMaquina: asNumber(raw.costoMinutoMaquina),
      factorMontajePorEstacion: asNumber(raw.factorMontajePorEstacion),
      piesPorMinuto: asNumber(raw.piesPorMinuto),
      costoBarnizPorMsi: asNumber(raw.costoBarnizPorMsi),
      costoLaminadoPorMsi: asNumber(raw.costoLaminadoPorMsi),
      setupLaminado: asNumber(raw.setupLaminado),
      costoCyrel: asNumber(raw.costoCyrel),
      costoArte: asNumber(raw.costoArte),
      costoMaquila: asNumber(raw.costoMaquila),
      costoFlete: asNumber(raw.costoFlete),
      costoEmpaque: asNumber(raw.costoEmpaque),
      porcentajeImprevistos: asNumber(raw.porcentajeImprevistos, 3),
      porcentajeFinancieros: asNumber(raw.porcentajeFinancieros, 2),
      porcentajeRendimientoBruto: asNumber(raw.porcentajeRendimientoBruto, 35),
      porcentajeComisionVendedor: asNumber(raw.porcentajeComisionVendedor, 3),
      porcentajeComisionDepartamento: asNumber(raw.porcentajeComisionDepartamento, 10),
      porcentajeComisionAgencia: asNumber(raw.porcentajeComisionAgencia, 0),
      porcentajeIva: asNumber(raw.porcentajeIva, 13)
    }
  };
}

function buildInputForProcess(
  raw: Record<string, unknown>,
  procesoProductivo: FlexoProcesoProductivo
): FlexoRegularEntrada {
  const shared = normalizeSharedInput(raw);
  const materialId =
    procesoProductivo === "digital"
      ? asString(raw.materialDigitalId)
      : asString(raw.materialConvencionalId);

  return {
    clienteId: shared.clienteId,
    clienteNombre: shared.clienteNombre,
    vendedorNombre: shared.vendedorNombre,
    nombreTrabajo: shared.nombreTrabajo,
    codigoTrabajo: shared.codigoTrabajo,
    versionTrabajo: shared.versionTrabajo,
    versionCostos: shared.versionCostos,
    fechaCreacion: shared.fechaCreacion,
    procesoProductivo,
    tipoOrden: shared.tipoOrden,
    ordenReferencia: shared.ordenReferencia,
    tipoProducto: shared.tipoProducto,
    cantidadProductos: shared.cantidadProductos,
    cantidadCambios: shared.cantidadCambios,
    cantidadTipos: shared.cantidadTipos,
    facturarEnJuegos: shared.facturarEnJuegos,
    dimensiones: shared.dimensiones,
    materialId,
    tipoEtiquetado: shared.tipoEtiquetado,
    tipoSalida: shared.tipoSalida,
    anchoCoreMm: shared.anchoCoreMm,
    diametroCoreMm: shared.diametroCoreMm,
    etiquetasPorRollo: shared.etiquetasPorRollo,
    tintas: shared.tintas,
    acabados: {
      ...shared.acabados,
      cyrel: procesoProductivo === "digital" ? false : shared.acabados.cyrel
    }
  };
}

function buildParametersForProcess(args: {
  catalogs: Awaited<ReturnType<typeof loadCatalogsFromDataDir>>;
  raw: Record<string, unknown>;
  process: FlexoProcesoProductivo;
  material?: MaterialCatalogItem;
  machine?: MachineCatalogItem;
  troquel?: TroquelCatalogItem;
}): FlexoRegularParametrosCosto {
  const { catalogs, raw, process, material, machine, troquel } = args;
  const shared = normalizeSharedInput(raw);

  return {
    ...catalogs.costs.flexoRegular,
    mermaPorcentaje: shared.overrides.mermaPorcentaje,
    gramaje: material?.gramaje ?? catalogs.costs.flexoRegular.gramaje,
    costoMaterialPorMsi:
      material?.costoMaterialPorMsi ?? catalogs.costs.flexoRegular.costoMaterialPorMsi,
    costoMaterialPorKg:
      material?.costoMaterialPorKg ?? catalogs.costs.flexoRegular.costoMaterialPorKg,
    costoMinutoMaquina:
      machine?.costoMinutoMaquina ??
      shared.overrides.costoMinutoMaquina ??
      catalogs.costs.flexoRegular.costoMinutoMaquina,
    factorMontajePorEstacion:
      machine?.factorMontajePorEstacion ??
      shared.overrides.factorMontajePorEstacion ??
      catalogs.costs.flexoRegular.factorMontajePorEstacion,
    piesPorMinuto:
      machine?.piesPorMinuto ??
      shared.overrides.piesPorMinuto ??
      catalogs.costs.flexoRegular.piesPorMinuto,
    costoHoraPreprensa:
      machine?.costoHoraPreprensa ??
      shared.overrides.costoHoraPreprensa ??
      catalogs.costs.flexoRegular.costoHoraPreprensa,
    minutosPreprensaPorCambio:
      machine?.minutosPreprensaPorCambio ??
      shared.overrides.minutosPreprensaPorCambio ??
      catalogs.costs.flexoRegular.minutosPreprensaPorCambio,
    costoTintaPorMsi:
      machine?.costoTintaPorMsi ??
      shared.overrides.costoTintaPorMsi ??
      catalogs.costs.flexoRegular.costoTintaPorMsi,
    costoBarnizPorMsi:
      shared.overrides.costoBarnizPorMsi || catalogs.costs.flexoRegular.costoBarnizPorMsi,
    costoLaminadoPorMsi:
      shared.overrides.costoLaminadoPorMsi ||
      catalogs.costs.flexoRegular.costoLaminadoPorMsi,
    setupLaminado:
      shared.overrides.setupLaminado || catalogs.costs.flexoRegular.setupLaminado,
    costoCyrel:
      process === "digital"
        ? 0
        : shared.overrides.costoCyrel || catalogs.costs.flexoRegular.costoCyrel,
    costoArte: shared.overrides.costoArte || catalogs.costs.flexoRegular.costoArte,
    costoMaquila:
      shared.overrides.costoMaquila || catalogs.costs.flexoRegular.costoMaquila,
    costoFlete: shared.overrides.costoFlete || catalogs.costs.flexoRegular.costoFlete,
    costoEmpaque:
      shared.overrides.costoEmpaque || catalogs.costs.flexoRegular.costoEmpaque,
    porcentajeImprevistos:
      shared.overrides.porcentajeImprevistos ||
      catalogs.costs.flexoRegular.porcentajeImprevistos,
    porcentajeFinancieros:
      shared.overrides.porcentajeFinancieros ||
      catalogs.costs.flexoRegular.porcentajeFinancieros,
    porcentajeRendimientoBruto:
      shared.overrides.porcentajeRendimientoBruto ||
      catalogs.costs.flexoRegular.porcentajeRendimientoBruto,
    porcentajeComisionVendedor:
      shared.overrides.porcentajeComisionVendedor ||
      catalogs.costs.flexoRegular.porcentajeComisionVendedor,
    porcentajeComisionDepartamento:
      shared.overrides.porcentajeComisionDepartamento ||
      catalogs.costs.flexoRegular.porcentajeComisionDepartamento,
    porcentajeComisionAgencia:
      shared.overrides.porcentajeComisionAgencia ||
      catalogs.costs.flexoRegular.porcentajeComisionAgencia,
    porcentajeIva:
      shared.overrides.porcentajeIva || catalogs.costs.flexoRegular.porcentajeIva,
    costoTroquel: troquel?.costoBase ?? catalogs.costs.flexoRegular.costoTroquel
  };
}

export async function calculateFlexoRegularFromRequest(payload: {
  selectedProcess?: string;
  selectedMachineConvencionalId?: string;
  selectedMachineDigitalId?: string;
  selectedTroquelId?: string;
  input: Record<string, unknown>;
}) {
  const { catalogs, source } = await loadActiveCatalogs();
  const machineCatalog = buildMachineCatalogFromInventory(
    catalogs.machines,
    catalogs.costs.flexoRegular.machines
  );
  const selectedProcess =
    payload.selectedProcess === "digital" ? "digital" : "convencional";
  const troquel = payload.selectedTroquelId
    ? findTroquel(catalogs.troqueles, payload.selectedTroquelId)
    : undefined;

  const conventionalInput = buildInputForProcess(payload.input, "convencional");
  const digitalInput = buildInputForProcess(payload.input, "digital");

  const conventionalMaterial = findMaterial(
    catalogs.materials,
    conventionalInput.materialId
  );
  const digitalMaterial = findMaterial(catalogs.materials, digitalInput.materialId);

  const conventionalMachine = findMachine(
    machineCatalog,
    payload.selectedMachineConvencionalId ?? ""
  );
  const digitalMachine = findMachine(
    machineCatalog,
    payload.selectedMachineDigitalId ?? ""
  );

  const conventionalResult = calcularFlexoRegular(
    conventionalInput,
    buildParametersForProcess({
      catalogs,
      raw: payload.input,
      process: "convencional",
      material: conventionalMaterial,
      machine: conventionalMachine,
      troquel
    })
  );

  const digitalResult = calcularFlexoRegular(
    digitalInput,
    buildParametersForProcess({
      catalogs,
      raw: payload.input,
      process: "digital",
      material: digitalMaterial,
      machine: digitalMachine,
      troquel
    })
  );

  return {
    source,
    catalogs: {
      materials: catalogs.materials,
      products: catalogs.products,
      troqueles: catalogs.troqueles,
      machines: machineCatalog,
      machineProcesses: catalogs.machines
    },
    selection: {
      selectedProcess,
      troquel,
      convencional: {
        material: conventionalMaterial,
        machine: conventionalMachine
      },
      digital: {
        material: digitalMaterial,
        machine: digitalMachine
      }
    },
    calculations: {
      convencional: conventionalResult,
      digital: digitalResult
    },
    activeCalculation:
      selectedProcess === "digital" ? digitalResult : conventionalResult
  };
}

export async function loadWebCatalogs() {
  const { catalogs, source } = await loadActiveCatalogs();
  const machineCatalog = buildMachineCatalogFromInventory(
    catalogs.machines,
    catalogs.costs.flexoRegular.machines
  );

  return {
    source,
    materials: catalogs.materials,
    products: catalogs.products,
    troqueles: catalogs.troqueles,
    machines: machineCatalog,
    machineProcesses: catalogs.machines
  };
}

export async function loadInventoryViews() {
  const { catalogs, source } = await loadActiveCatalogs();
  const machineCatalog = buildMachineCatalogFromInventory(
    catalogs.machines,
    catalogs.costs.flexoRegular.machines
  );

  const costRows = [
    ["Merma", catalogs.costs.flexoRegular.mermaPorcentaje, "%", "General"],
    ["Costo Hora Preprensa", catalogs.costs.flexoRegular.costoHoraPreprensa, "USD", "Produccion"],
    ["Minutos Preprensa por Cambio", catalogs.costs.flexoRegular.minutosPreprensaPorCambio, "min", "Produccion"],
    ["Costo Minuto Maquina", catalogs.costs.flexoRegular.costoMinutoMaquina, "USD", "Produccion"],
    ["Factor Montaje por Estacion", catalogs.costs.flexoRegular.factorMontajePorEstacion, "min", "Produccion"],
    ["Costo Tinta por MSI", catalogs.costs.flexoRegular.costoTintaPorMsi, "USD", "Tintas"],
    ["Pies por Minuto", catalogs.costs.flexoRegular.piesPorMinuto, "pies", "Produccion"],
    ["Costo Laminado por MSI", catalogs.costs.flexoRegular.costoLaminadoPorMsi, "USD", "Acabados"],
    ["Costo Barniz por MSI", catalogs.costs.flexoRegular.costoBarnizPorMsi, "USD", "Acabados"],
    ["Costo Troquel", catalogs.costs.flexoRegular.costoTroquel, "USD", "Acabados"],
    ["Costo Arte", catalogs.costs.flexoRegular.costoArte, "USD", "Diseno"],
    ["Costo Cyrel", catalogs.costs.flexoRegular.costoCyrel, "USD", "Planchas"],
    ["Costo Maquila", catalogs.costs.flexoRegular.costoMaquila, "USD", "General"],
    ["Costo Flete", catalogs.costs.flexoRegular.costoFlete, "USD", "General"],
    ["Costo Empaque", catalogs.costs.flexoRegular.costoEmpaque, "USD", "General"],
    ["Imprevistos", catalogs.costs.flexoRegular.porcentajeImprevistos, "%", "Financiero"],
    ["Financieros", catalogs.costs.flexoRegular.porcentajeFinancieros, "%", "Financiero"],
    ["Rendimiento Bruto", catalogs.costs.flexoRegular.porcentajeRendimientoBruto, "%", "Financiero"],
    ["Comision Vendedor", catalogs.costs.flexoRegular.porcentajeComisionVendedor, "%", "Financiero"],
    ["Comision Departamento", catalogs.costs.flexoRegular.porcentajeComisionDepartamento, "%", "Financiero"],
    ["Comision Agencia", catalogs.costs.flexoRegular.porcentajeComisionAgencia, "%", "Financiero"],
    ["IVA", catalogs.costs.flexoRegular.porcentajeIva, "%", "Financiero"]
  ].map(([concepto, valor, unidad, categoria]) => ({
    concepto,
    valor,
    unidad,
    categoria
  }));

  return {
    source,
    machines: {
      columns: ["nombreMaquina", "marca", "modelo", "proceso", "subproceso", "unidadTrabajo", "velocidadProduccion", "costoHoraMaquina", "costoHoraOperador"],
      rows: catalogs.machines
    },
    machineSummary: {
      columns: ["nombre", "marca", "modelo", "proceso", "clasificacion", "procesoProductivo", "piesPorMinuto", "costoMinutoMaquina"],
      rows: machineCatalog
    },
    materials: {
      columns: ["id", "descripcion", "nombreTecnico", "familia", "ancho", "gramaje", "unidadConsumo", "precioUnitarioCotizacionDol", "precioKgCotizacionDol", "procesoProductivo"],
      rows: catalogs.materials
    },
    troqueles: {
      columns: ["id", "descripcion", "clasificacion", "anchoTroquel", "largoTroquel", "anchoEtiqueta", "largoEtiqueta", "filas", "dientes", "repeticiones", "areaTroquel", "anchoMaterial", "tipoTroquel", "proveedor"],
      rows: catalogs.troqueles
    },
    costs: {
      columns: ["concepto", "valor", "unidad", "categoria"],
      rows: costRows
    }
  };
}
