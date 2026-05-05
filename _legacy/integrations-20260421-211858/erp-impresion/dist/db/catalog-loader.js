import { getPostgresPool } from "./postgres.js";
function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function pctToPercent(value, fallback = 0) {
    return asNumber(value, fallback) * 100;
}
function normalizeProcessType(value) {
    const normalized = value.toLowerCase();
    if (normalized.includes("digit")) {
        return "digital";
    }
    if (normalized.includes("hibr")) {
        return "hibrido";
    }
    return "convencional";
}
function buildMachineCatalog(machines) {
    return machines.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        procesoProductivo: normalizeProcessType(row.tipo),
        proceso: row.tipo,
        costoMinutoMaquina: asNumber(row.minuto_hombre),
        factorMontajePorEstacion: asNumber(row.factor_montaje_estacion),
        minutosPreprensaPorCambio: asNumber(row.factor_preparacion),
        piesPorMinuto: asNumber(row.factor_tiraje)
    }));
}
function buildMachineProcesses(rows) {
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
        clasificacion: row.clasificacion === "diseno" ||
            row.clasificacion === "planchas" ||
            row.clasificacion === "impresion" ||
            row.clasificacion === "acabados" ||
            row.clasificacion === "soporte"
            ? row.clasificacion
            : undefined
    }));
}
function buildMaterials(rows) {
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
function buildTroqueles(rows) {
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
function findFinishCost(rows, type) {
    return rows.find((row) => row.tipo.toLowerCase() === type.toLowerCase());
}
function buildCosts(general, finishCosts, machines) {
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
            costoTintaPorMsi: 0,
            piesPorMinuto: 180,
            costoLaminadoPorMsi: asNumber(laminado?.costo_x_msi),
            setupLaminado: 0,
            costoBarnizPorMsi: asNumber(barniz?.costo_x_msi),
            costoTroquel: asNumber(troquel?.costo_fijo),
            costoArte: 0,
            costoCyrel: asNumber(general.cyrel_costo_cm2),
            costoMaquila: 0,
            costoFlete: 0,
            costoEmpaque: 0,
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
export async function loadCatalogsFromDatabase() {
    const db = getPostgresPool();
    try {
        const [machinesResult, machineCapabilitiesResult, materialsResult, troquelesResult, generalCostsResult, finishCostsResult] = await Promise.all([
            db.query(`
          select id::text, nombre, tipo::text, minuto_hombre, factor_montaje_estacion, factor_preparacion, factor_tiraje
          from maquina
          where activa = true
          order by nombre
        `),
            db.query(`
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
        `),
            db.query(`
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
        `),
            db.query(`
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
        `),
            db.query(`
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
            preprensa_factor_min_tipo_digital
          from costo_general
          order by actualizado_en desc
          limit 1
        `),
            db.query(`
          select tipo, subtipo, costo_x_msi, costo_x_m2, costo_x_pie, costo_fijo
          from costo_acabado
          order by tipo, subtipo nulls first
        `)
        ]);
        const hasCoreData = machinesResult.rows.length > 0 ||
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
        const costs = buildCosts(generalCostsResult.rows[0] ?? {
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
            preprensa_factor_min_tipo_digital: 0
        }, finishCostsResult.rows, machines);
        const catalogs = {
            costs,
            materials,
            products: [],
            troqueles,
            machines: machineProcesses
        };
        return { catalogs, source: "database" };
    }
    catch {
        return { catalogs: null, source: "files" };
    }
}
