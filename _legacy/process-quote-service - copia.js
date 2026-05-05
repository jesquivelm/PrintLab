const { listInventory } = require("./inventory-service");

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeDivide(value, divisor, fallback = 0) {
  if (!divisor) return fallback;
  return value / divisor;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function categoryKey(value, name = "") {
  const normalized = normalizeText(value);
  const normalizedName = normalizeText(name);
  if (normalized.includes("sustrato") || normalizedName.includes("sustrato")) return "sustrato";
  if (normalized.includes("diseno") || normalizedName.includes("diseno")) return "diseno";
  if (normalized.includes("preprensa") || normalizedName.includes("preprensa")) return "preprensa";
  if (normalized.includes("plancha") || normalizedName.includes("plancha")) return "planchas";
  if (normalized.includes("impresion") || normalizedName.includes("impresion")) return "impresion";
  if (
    normalized.includes("acabado") ||
    normalized.includes("barniz") ||
    normalized.includes("laminad") ||
    normalized.includes("troquel") ||
    normalized.includes("estamp") ||
    normalized.includes("rebobin") ||
    normalizedName.includes("barniz") ||
    normalizedName.includes("laminad") ||
    normalizedName.includes("troquel") ||
    normalizedName.includes("estamp") ||
    normalizedName.includes("rebobin")
  ) {
    return "acabados";
  }
  if (normalized.includes("empaque") || normalizedName.includes("empaque")) return "empaque";
  if (normalized.includes("extern") || normalizedName.includes("extern")) return "proceso externo";
  if (normalized.includes("calidad") || normalizedName.includes("calidad")) return "calidad";
  return normalized || "otros";
}

function categoryLabel(value, name = "") {
  const key = categoryKey(value, name);
  const labels = {
    sustrato: "Sustrato",
    diseno: "Diseno",
    preprensa: "Preprensa",
    planchas: "Planchas",
    impresion: "Impresion",
    acabados: "Acabados",
    empaque: "Empaque",
    "proceso externo": "Proceso Externo",
    calidad: "Control de Calidad",
    otros: "Otros"
  };
  return labels[key] || labels.otros;
}

function calculateMetrics(input, material) {
  const qty = Math.max(1, asNumber(input.quantity, 0));
  const widthIn = Math.max(0.01, asNumber(input.labelWidthIn, 0));
  const heightIn = Math.max(0.01, asNumber(input.labelHeightIn, 0));
  const rollWidthIn = Math.max(widthIn, asNumber(input.rollWidthIn, widthIn));
  const gapXIn = Math.max(0, asNumber(input.gapHorizontalIn, 0));
  const gapYIn = Math.max(0, asNumber(input.gapVerticalIn, 0));
  const wastePct = Math.max(0, asNumber(input.wastePct, 8));
  const wasteFactor = 1 + wastePct / 100;
  const labelsAcross = Math.max(1, Math.floor((rollWidthIn + gapXIn) / Math.max(0.01, widthIn + gapXIn)));
  const rows = Math.ceil(qty / labelsAcross);
  const totalLengthIn = rows * (heightIn + gapYIn);
  const feet = totalLengthIn / 12;
  const feetWithWaste = feet * wasteFactor;
  const msi = (rollWidthIn * totalLengthIn) / 1000;
  const msiWithWaste = msi * wasteFactor;
  const areaM2 = (rollWidthIn * 0.0254) * (totalLengthIn * 0.0254);
  const grammage = asNumber(
    material?.gramaje_g_m2,
    asNumber(material?.gramajePorM2, asNumber(material?.gramaje, 0))
  );
  const kgWithWaste = areaM2 * (grammage / 1000) * wasteFactor;

  return {
    qty,
    widthIn,
    heightIn,
    rollWidthIn,
    labelsAcross,
    rows,
    totalLengthIn: round(totalLengthIn),
    feet: round(feet),
    feetWithWaste: round(feetWithWaste),
    msi: round(msi),
    msiWithWaste: round(msiWithWaste),
    areaM2: round(areaM2),
    kgWithWaste: round(kgWithWaste),
    wastePct
  };
}

function materialUnitPrice(material, mode) {
  if (!material) return 0;
  if (mode === "kg") {
    return asNumber(material.costo_x_kg, asNumber(material.costoMaterialPorKg, asNumber(material.precioKgCotizacionDol, 0)));
  }
  return asNumber(material.costo_x_msi, asNumber(material.costoMaterialPorMsi, asNumber(material.precioUnitarioCotizacionDol, 0)));
}

function computeMaterialCost(material, metrics) {
  if (!material) {
    return {
      amount: 0,
      mode: "none",
      unitPrice: 0,
      quantityUsed: 0,
      quantityLabel: "",
      materialName: "Sin definir",
      formula: "Subtotal sustrato = 0 porque no hay sustrato seleccionado"
    };
  }

  const costKg = materialUnitPrice(material, "kg");
  const costMsi = materialUnitPrice(material, "msi");
  const useKg = costKg > 0 && metrics.kgWithWaste > 0;
  const mode = useKg ? "kg" : "msi";
  const unitPrice = useKg ? costKg : costMsi;
  const quantityUsed = useKg ? metrics.kgWithWaste : metrics.msiWithWaste;
  const quantityLabel = useKg ? "kg" : "MSI";

  return {
    amount: round(quantityUsed * unitPrice),
    mode,
    unitPrice: round(unitPrice),
    quantityUsed: round(quantityUsed),
    quantityLabel,
    materialName: material.descripcion || material.nombre || material.codigo || "Sustrato",
    formula: `Subtotal sustrato = ${useKg ? "consumo en KG con merma" : "consumo en MSI con merma"} x precio unitario del sustrato`
  };
}

function buildSubstrateStep(materialCost, metrics) {
  return {
    processId: "__substrato__",
    name: "Sustrato",
    category: "sustrato",
    categoryLabel: "Sustrato",
    machineName: "",
    setupMinutes: 0,
    runtimeMinutes: 0,
    machineCost: 0,
    operatorCost: 0,
    variableCost: round(materialCost.amount),
    fixedCost: 0,
    total: round(materialCost.amount),
    inline: false,
    sharedTime: false,
    sharedOperator: false,
    materialName: materialCost.materialName,
    unitPrice: materialCost.unitPrice,
    unitLabel: materialCost.quantityLabel,
    quantityUsed: materialCost.quantityUsed,
    quantityLabel: materialCost.quantityLabel,
    feetWithWaste: metrics.feetWithWaste,
    totalLengthIn: metrics.totalLengthIn,
    formulas: {
      consumption: `Consumo con merma = ${materialCost.quantityLabel} base x (1 + merma %)`,
      total: materialCost.formula
    }
  };
}

function runtimeBasis(metrics, unit) {
  if (unit.includes("msi")) {
    return { value: metrics.msiWithWaste, label: "MSI", formula: "Tiempo de corrida = MSI con merma / Velocidad" };
  }
  if (unit.includes("kg")) {
    return { value: metrics.kgWithWaste, label: "KG", formula: "Tiempo de corrida = KG con merma / Velocidad" };
  }
  if (unit.includes("millar")) {
    return { value: metrics.qty / 1000, label: "Millares", formula: "Tiempo de corrida = (Cantidad / 1000) / Velocidad" };
  }
  return { value: metrics.feetWithWaste, label: "Pies", formula: "Tiempo de corrida = Pies con merma / Velocidad" };
}

function buildStepCost(step, metrics) {
  const stations = Math.max(0, asNumber(step.estaciones, 0));
  const people = Math.max(0, asNumber(step.cantidad_personas, 1));
  const setupMinutes = Math.max(
    0,
    asNumber(step.tiempo_preparacion_general, 0) +
      asNumber(step.tiempo_por_estacion, 0) * stations +
      asNumber(step.tiempo_fijo_min, 0)
  );

  const speed = Math.max(0, asNumber(step.velocidad_produccion, 0));
  const unit = normalizeText(step.unidad_trabajo || "pies");
  const basis = runtimeBasis(metrics, unit);
  const runtimeMinutes = step.comparte_tiempo_linea || speed <= 0 ? 0 : basis.value / speed;
  const machineHours = (setupMinutes + runtimeMinutes) / 60;
  const operatorHours = ((step.comparte_operario ? setupMinutes : setupMinutes + runtimeMinutes) / 60) * people;
  const machineCost = machineHours * asNumber(step.costo_hora_maquina, 0);
  const operatorCost = operatorHours * asNumber(step.costo_hora_operario, 0);
  const variableCost =
    metrics.msiWithWaste * asNumber(step.costo_x_msi, 0) +
    metrics.kgWithWaste * asNumber(step.costo_x_kg, 0) +
    metrics.feetWithWaste * asNumber(step.costo_x_pie, 0) +
    (metrics.qty / 1000) * asNumber(step.costo_x_millar, 0);
  const fixedCost = asNumber(step.costo_fijo, 0);

  return {
    processId: step.processId || step.id || "",
    name: step.name || step.nombre || "Proceso",
    category: categoryKey(step.category || step.categoria || "otros", step.name || step.nombre || ""),
    categoryLabel: categoryLabel(step.category || step.categoria || "otros", step.name || step.nombre || ""),
    machineName: step.machineName || "",
    setupMinutes: round(setupMinutes),
    runtimeMinutes: round(runtimeMinutes),
    machineCost: round(machineCost),
    operatorCost: round(operatorCost),
    variableCost: round(variableCost),
    fixedCost: round(fixedCost),
    total: round(machineCost + operatorCost + variableCost + fixedCost),
    inline: Boolean(step.es_inline),
    sharedTime: Boolean(step.comparte_tiempo_linea),
    sharedOperator: Boolean(step.comparte_operario),
    variableBase: round(basis.value),
    variableUnit: basis.label,
    formulas: {
      setup: "Tiempo preparación = Tiempo preparación general + (Tiempo por estación x Estaciones) + Tiempo fijo",
      runtime: step.comparte_tiempo_linea ? "Tiempo de corrida = 0 porque el proceso comparte tiempo de línea" : basis.formula,
      machine: "Costo máquina = Horas máquina x Costo hora máquina",
      operator: "Costo operario = Horas operario x Costo hora operario",
      variable: "Costo variable = (MSI x Costo x MSI) + (KG x Costo x KG) + (Pies x Costo x Pie) + (Millares x Costo x Millar)",
      total: "Subtotal proceso = Costo máquina + Costo operario + Costo variable + Costo fijo"
    }
  };
}

async function calculateProcessQuote(payload = {}) {
  const materials = await listInventory("materiales", { limit: 5000 });
  const selectedMaterial = materials.find((item) => String(item.id) === String(payload.materialId)) || null;
  const metrics = calculateMetrics(payload, selectedMaterial);
  const materialCost = computeMaterialCost(selectedMaterial, metrics);
  const stepRows = Array.isArray(payload.steps) ? payload.steps : [];
  const processBreakdown = [buildSubstrateStep(materialCost, metrics), ...stepRows.map((step) => buildStepCost(step, metrics))];

  const categoryBreakdown = processBreakdown.reduce((acc, step) => {
    if (step.category === "calidad") return acc;
    const key = step.category;
    if (!acc[key]) {
      acc[key] = { key, label: step.categoryLabel, total: 0 };
    }
    acc[key].total = round(acc[key].total + step.total);
    return acc;
  }, {});

  const subtotal = processBreakdown.reduce((sum, step) => sum + step.total, 0);
  const overheadPct = Math.max(0, asNumber(payload.overheadPct, 0));
  const marginPct = Math.max(0, asNumber(payload.marginPct, 0));
  const taxPct = Math.max(0, asNumber(payload.taxPct, 13));
  const subtotalWithOverhead = subtotal * (1 + overheadPct / 100);
  const subtotalWithMargin = subtotalWithOverhead * (1 + marginPct / 100);
  const tax = subtotalWithMargin * (taxPct / 100);
  const total = subtotalWithMargin + tax;

  return {
    material: selectedMaterial,
    metrics,
    materialCost,
    processBreakdown,
    categoryBreakdown: Object.values(categoryBreakdown),
    summary: {
      subtotal: round(subtotal),
      subtotalWithOverhead: round(subtotalWithOverhead),
      subtotalWithMargin: round(subtotalWithMargin),
      tax: round(tax),
      total: round(total),
      unitPrice: round(safeDivide(total, metrics.qty))
    }
  };
}

module.exports = {
  calculateProcessQuote
};
