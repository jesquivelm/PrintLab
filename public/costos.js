const CONFIG_ENDPOINT = "/api/config/shell";
const COSTS_ENDPOINT = "/api/costos-config";
const PRESENTATION_KEY = "costos";
const COSTS_FALLBACK_STORAGE_KEY = "erp-costos-config";
const DEFAULT_FLOATING_SAVE_ICON = "\u{1F4BE}";
const PROCESS_DEFAULTS = [
    { key: "macula", label: "Merma", active: true, createEnabled: true, locked: true, repeatable: false, order: 5 },
    { key: "troquel", label: "Troquel", active: true, createEnabled: false, locked: true, repeatable: false, order: 10 },
    { key: "sustrato", label: "Sustrato", active: true, createEnabled: false, locked: true, repeatable: false, order: 20 },
    { key: "diseno", label: "Dise\u00f1o", active: false, createEnabled: true, locked: false, repeatable: false, order: 30 },
    { key: "preprensa", label: "Preprensa", active: true, createEnabled: true, locked: true, repeatable: false, order: 40 },
    { key: "planchas", label: "Planchas", active: false, createEnabled: false, locked: false, repeatable: false, order: 50 },
    { key: "impresion", label: "Impresi\u00f3n", active: false, createEnabled: true, locked: false, repeatable: false, order: 60 },
    { key: "barnizado", label: "Barnizado", active: false, createEnabled: true, locked: false, repeatable: false, order: 69 },
    { key: "laminado", label: "Laminado", active: false, createEnabled: true, locked: false, repeatable: false, order: 70 },
    { key: "estampado", label: "Estampado", active: false, createEnabled: true, locked: false, repeatable: false, order: 71 },
    { key: "embosado", label: "Embosado", active: false, createEnabled: true, locked: false, repeatable: false, order: 72 },
    { key: "troquelado", label: "Troquelado", active: false, createEnabled: false, locked: false, repeatable: false, order: 73 },
    { key: "rebobinado", label: "Rebobinado", active: false, createEnabled: true, locked: false, repeatable: false, order: 74 },
    { key: "empaque", label: "Empaque", active: false, createEnabled: true, locked: false, repeatable: false, order: 80 },
    { key: "adicionales", label: "Procesos adicionales", active: false, createEnabled: false, locked: false, repeatable: false, order: 90 }
];

const DEFAULT_COSTS_CONFIG = {
    general: {
        notes: "",
        updatedAt: null,
        defaultRollWidth: 13,
        defaultCoreDiameter: 3,
        coreDiameterOptions: ["1", "1.5", "3", "6"],
        defaultQuantityTypes: 1,
        defaultCmykEnabled: "true",
        processDefaults: PROCESS_DEFAULTS.map((item) => ({ ...item, minimumCost: 0, timeBufferMinutes: 0, capacityMinutes: 480 }))
    },
    convencional: {
        tintaGeneral: {
            bcmGenerico: 2,
            coberturaTintaPct: 30,
            coberturaDisenoPct: 60,
            densidadUv: 1.5,
            costoLbCmyk: 25,
            costoLbBlanco: 30,
            costoLbPantone: 35,
            depositos: [
                { id: "conv-deposito-blancos", tipo: "Fondos Sólidos / Blancos", bcm: 7, coveragePct: 100, gsm: 2.5 },
                { id: "conv-deposito-textos", tipo: "Textos y Líneas Gruesas", bcm: 4, coveragePct: 10, gsm: 1.2 },
                { id: "conv-deposito-cmyk", tipo: "Policromía (CMYK)", bcm: 2, coveragePct: 25, gsm: 1 },
                { id: "conv-deposito-barniz", tipo: "Barniz UV", bcm: 7, coveragePct: 100, gsm: 3 }
            ]
        },
        inlineFinishSetup: [
            { id: "conv-inline-impresion", proceso: "Impresión", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-troquelado", proceso: "Troquelado", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-laminado", proceso: "Laminado", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-barniz", proceso: "Barniz", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-embosado", proceso: "Embosado", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-estampado", proceso: "Estampado", minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: "conv-inline-numerado", proceso: "Numerado", minutosPorEstacion: 5, setupWasteFeet: 0 }
        ],
        maculaMontaje: [
            { id: "conv-montaje-impresion", detalle: "Impresión", porEstacion: 65, cantidadTintas: 4, totalPies: 260 },
            { id: "conv-montaje-troquelado", detalle: "Troquelado", porEstacion: 90, cantidadTintas: 4, totalPies: 90 },
            { id: "conv-montaje-laminado", detalle: "Laminado", porEstacion: 65, cantidadTintas: 4, totalPies: 65 },
            { id: "conv-montaje-barniz", detalle: "Barniz", porEstacion: 30, cantidadTintas: 4, totalPies: 30 },
            { id: "conv-montaje-embosado", detalle: "Embosado", porEstacion: 65, cantidadTintas: 4, totalPies: 65 }
        ],
        maculaTiraje: [
            { id: "conv-tiraje-impresion", detalle: "Impresión", porcentaje: 3 },
            { id: "conv-tiraje-impresion-troquelado", detalle: "Impresión + Troquelado", porcentaje: 4 },
            { id: "conv-tiraje-impresion-troquelado-laminado", detalle: "Impresión + Troquelado + Laminado", porcentaje: 7 },
            { id: "conv-tiraje-impresion-troquelado-laminado-embosado", detalle: "Impresión + Troquelado + Laminado + Embosado", porcentaje: 8 }
        ],
        finishWaste: [
            { id: "conv-finish-barnizado", proceso: "Barnizado", setupWasteFeet: 75, operationWastePct: 1.5 },
            { id: "conv-finish-laminado", proceso: "Laminado", setupWasteFeet: 100, operationWastePct: 2.0 },
            { id: "conv-finish-troquelado", proceso: "Troquelado", setupWasteFeet: 150, operationWastePct: 2.5 },
            { id: "conv-finish-estampado", proceso: "Estampado", setupWasteFeet: 250, operationWastePct: 4.0 },
            { id: "conv-finish-embosado", proceso: "Embosado", setupWasteFeet: 125, operationWastePct: 3.0 },
            { id: "conv-finish-rebobinado", proceso: "Rebobinado", setupWasteFeet: 30, operationWastePct: 0.5 }
        ]
    },
    digital: {
        premier: {
            formulaText: "Costo Premier = ((Area m2 x Consumo g/m2) / 1000 x Costo kg) + Setup Premier + Mantenimiento In-line. Si el sustrato viene pretratado, Premier = 0.",
            explanation: "El costo por metro del tratamiento offline no se define aqui como estandar general. Si la planta trata fuera de linea, ese costo operativo debe vivir en la maquina tratadora o ya venir absorbido por el sustrato pretratado.",
            comment: "Costo kg provisional tomado como referencia interna de liquido tipo coating. Si Gerencia define el SKU exacto del Primer, debe reemplazarse aqui y en los sustratos que lo usen.",
            mode: "offline",
            setupMin: 20,
            consumptionGm2: 0.65,
            costPerKg: 9.25,
            costPerM2: 0.006013,
            offlineCostPerMeter: 0,
            maintenanceCost: 14
        },
        tintaGeneral: {
            billingType: "consumo",
            costPerKg: 0,
            whiteCostPerKg: 0,
            specialCostPerKg: 0,
            clickRate: 0,
            clickMode: "por_estacion",
            coverageCmykPct: 30,
            coverageWhitePct: 100,
            cmykGm2: 1.5,
            whiteGm2: 4,
            wasteFactor: 1.1,
            specialWashCost: 18,
            formulaConsumptionText: "Costo Tinta = ((Área Total x Cobertura x Gramaje) / 1000) x Factor Merma x Costo Kg.",
            formulaClickText: "Costo Clics = Cantidad Impresiones x Estaciones Facturables x Tarifa Clic.",
            explanation: "La máquina digital puede cobrar por consumo o por clic. Estos valores funcionan como respaldo general; si la máquina tiene datos propios, la cotización usa primero los de la máquina.",
            comment: "Lavado especial provisional: referencia operativa para limpieza, purga o cambio de color especial. Debe sustituirse por el costo real de cada equipo si la planta lo define.",
            coverageProfiles: [
                { id: "digital-simple", tipo: "Simple / textos / logos", coveragePct: 15 },
                { id: "digital-estandar", tipo: "Estándar / imagen y texto", coveragePct: 30 },
                { id: "digital-complejo", tipo: "Complejo / fondo sólido", coveragePct: 90 },
                { id: "digital-blanco", tipo: "Blanco sobre transparente", coveragePct: 100 }
            ]
        },
        velocidad: {
            speedCmykMpm: 42,
            speedExtendedMpm: 26,
            comment: "Velocidades generales de respaldo. Si la máquina digital tiene sus propios metros por minuto, la cotización toma primero esos valores."
        },
        maculaMontaje: [],
        maculaTiraje: []
    }
};

const tabs = [...document.querySelectorAll(".costs-tab")];
const panels = [...document.querySelectorAll(".costs-panel")];
const saveStatus = document.getElementById("costosSaveStatus");
const generalNotes = document.getElementById("costosGeneralNotes");
const generalDefaultFields = {
    defaultRollWidth: document.getElementById("costosDefaultRollWidth"),
    defaultCoreDiameter: document.getElementById("costosDefaultCoreDiameter"),
    defaultQuantityTypes: document.getElementById("costosDefaultQuantityTypes"),
    defaultCmykEnabled: document.getElementById("costosDefaultCmykEnabled")
};
const coreDiameterOptionsTableBody = document.getElementById("costosCoreDiameterOptionsTableBody");
const addCoreDiameterOptionButton = document.getElementById("costosAddCoreDiameterOption");
const processDefaultsList = document.getElementById("costosProcessDefaultsList");
const maculaMontajeTableBody = document.getElementById("maculaMontajeTableBody");
const maculaTirajeTableBody = document.getElementById("maculaTirajeTableBody");
const depositosTableBody = document.getElementById("costosDepositosTableBody");
const finishWasteTableBody = document.getElementById("costosFinishWasteTableBody");
const inlineFinishSetupTableBody = document.getElementById("inlineFinishSetupTableBody");
const digitalCoverageProfilesTableBody = document.getElementById("costosDigitalCoverageProfilesTableBody");
const inkFields = {
    bcmGenerico: document.getElementById("costosBcmGenerico"),
    coberturaTintaPct: document.getElementById("costosCoberturaTinta"),
    coberturaDisenoPct: document.getElementById("costosCoberturaDiseno"),
    densidadUv: document.getElementById("costosDensidadUv"),
    costoLbCmyk: document.getElementById("costosCostoLbCmyk"),
    costoLbBlanco: document.getElementById("costosCostoLbBlanco"),
    costoLbPantone: document.getElementById("costosCostoLbPantone")
};
const COST_INPUT_FORMATS = {
    costosBcmGenerico: { suffix: "BCM", maximumFractionDigits: 2 },
    costosCoberturaTinta: { suffix: "%", maximumFractionDigits: 2 },
    costosCoberturaDiseno: { suffix: "%", maximumFractionDigits: 2 },
    costosDensidadUv: { maximumFractionDigits: 2 },
    costosCostoLbCmyk: { prefix: "$", suffix: "lb", maximumFractionDigits: 2 },
    costosCostoLbBlanco: { prefix: "$", suffix: "lb", maximumFractionDigits: 2 },
    costosCostoLbPantone: { prefix: "$", suffix: "lb", maximumFractionDigits: 2 }
};
const digitalPremierFields = {
    mode: document.getElementById("costosDigitalPremierMode"),
    setupMin: document.getElementById("costosDigitalPremierSetupMin"),
    consumptionGm2: document.getElementById("costosDigitalPremierConsumptionGm2"),
    costPerKg: document.getElementById("costosDigitalPremierCostPerKg"),
    costPerM2: document.getElementById("costosDigitalPremierCostPerM2"),
    offlineCostPerMeter: document.getElementById("costosDigitalPremierOfflineCostPerMeter"),
    maintenanceCost: document.getElementById("costosDigitalPremierMaintenanceCost"),
    comment: document.getElementById("costosDigitalPremierComment")
};
const digitalInkFields = {
    billingType: document.getElementById("costosDigitalBillingType"),
    costPerKg: document.getElementById("costosDigitalInkCostPerKg"),
    whiteCostPerKg: document.getElementById("costosDigitalWhiteInkCostPerKg"),
    specialCostPerKg: document.getElementById("costosDigitalSpecialInkCostPerKg"),
    clickRate: document.getElementById("costosDigitalClickRate"),
    clickMode: document.getElementById("costosDigitalClickMode"),
    coverageCmykPct: document.getElementById("costosDigitalCoverageCmykPct"),
    coverageWhitePct: document.getElementById("costosDigitalCoverageWhitePct"),
    cmykGm2: document.getElementById("costosDigitalCmykGm2"),
    whiteGm2: document.getElementById("costosDigitalWhiteGm2"),
    wasteFactor: document.getElementById("costosDigitalWasteFactor"),
    specialWashCost: document.getElementById("costosDigitalSpecialWashCost"),
    comment: document.getElementById("costosDigitalInkComment")
};
const digitalSpeedFields = {
    speedCmykMpm: document.getElementById("costosDigitalSpeedCmykMpm"),
    speedExtendedMpm: document.getElementById("costosDigitalSpeedExtendedMpm"),
    comment: document.getElementById("costosDigitalSpeedComment")
};
const digitalPremierFormulaText = document.getElementById("costosDigitalPremierFormulaText");
const digitalPremierExplanationText = document.getElementById("costosDigitalPremierExplanationText");
const digitalInkFormulaConsumptionText = document.getElementById("costosDigitalInkFormulaConsumptionText");
const digitalInkFormulaClickText = document.getElementById("costosDigitalInkFormulaClickText");
const digitalInkExplanationText = document.getElementById("costosDigitalInkExplanationText");

let loadedConfig = null;
let costsState = null;
let costsSaveTimer = null;
let costsSaveInFlight = false;
let costsSaveQueued = false;
let draggedProcessKey = "";

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let repaired = raw;
    for (let index = 0; index < 2; index += 1) {
        try {
            const nextValue = decodeURIComponent(escape(repaired));
            if (!nextValue || nextValue === repaired) break;
            repaired = nextValue;
        } catch (error) {
            break;
        }
    }
    return repaired.trim();
}

function numberValue(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function formatCostInputValue(value, format = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const formatted = new Intl.NumberFormat("es-CR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: format.maximumFractionDigits ?? 2
    }).format(numeric);
    return `${format.prefix ? `${format.prefix} ` : ""}${formatted}${format.suffix ? ` ${format.suffix}` : ""}`.trim();
}

function syncCostInputMask(input) {
    const wrap = input?.closest?.(".costs-input-overlay");
    if (!wrap) return;
    let mask = wrap.querySelector(".costs-input-mask");
    if (!mask) {
        mask = document.createElement("span");
        mask.className = "costs-input-mask";
        wrap.appendChild(mask);
    }
    mask.textContent = formatCostInputValue(input.value, COST_INPUT_FORMATS[input.id] || {});
}

function syncCostInputMasks(root = document) {
    root.querySelectorAll(".costs-input-overlay input").forEach(syncCostInputMask);
}

function booleanValue(value, fallback = false) {
    if (value === true || value === false) return value;
    if (value == null || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
}

function normalizeCoreDiameterOptions(value, fallback = DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, allowEmpty = false) {
    if (Array.isArray(value)) {
        const items = value.map((item) => normalizeText(item)).filter(Boolean);
        return items.length || allowEmpty ? items.slice(0, 5) : [...fallback];
    }
    if (value == null) return [...fallback];
    const text = normalizeText(value);
    if (!text) return allowEmpty ? [] : [...fallback];
    const items = text.split(",").map((item) => normalizeText(item)).filter(Boolean);
    return items.length || allowEmpty ? items.slice(0, 5) : [...fallback];
}

function normalizeProcessDefaults(value) {
    const rows = Array.isArray(value) ? value : [];
    const fallbackByKey = Object.fromEntries(PROCESS_DEFAULTS.map((item) => [item.key, item]));
    const seen = new Set();
    const normalized = rows.map((row, index) => {
        const key = normalizeText(row?.key).toLowerCase();
        const fallback = fallbackByKey[key];
        if (!fallback || seen.has(key)) return null;
        seen.add(key);
        const locked = ["macula", "troquel"].includes(key) ? true : booleanValue(row?.locked, fallback.locked);
        const active = locked ? true : booleanValue(row?.active, fallback.active);
        const createEnabled = key === "macula" ? true : booleanValue(row?.createEnabled ?? row?.create, fallback.createEnabled);
        const repeatable = booleanValue(row?.repeatable, fallback.repeatable);
        return {
            key,
            label: fallback.label,
            active,
            createEnabled: active ? createEnabled : false,
            locked,
            repeatable,
            ganttEnabled: mandatoryGantt ? true : booleanValue(row?.ganttEnabled, row?.ganttEnabled == null ? active : false),
            order: numberValue(row?.order, fallback.order ?? ((index + 1) * 10)),
            minimumCost: Math.max(0, numberValue(row?.minimumCost, 0)),
            timeBufferMinutes: Math.max(0, numberValue(row?.timeBufferMinutes ?? row?.bufferMinutes, 0)),
            capacityMinutes: Math.max(0, numberValue(row?.capacityMinutes ?? row?.capacity, 480))
        };
    }).filter(Boolean);
    PROCESS_DEFAULTS.forEach((item, index) => {
        if (seen.has(item.key)) return;
        normalized.push({
            key: item.key,
            label: item.label,
            active: item.locked ? true : item.active,
            createEnabled: item.key === "macula" ? true : Boolean(item.createEnabled && (item.locked || item.active)),
            locked: item.locked,
            repeatable: item.repeatable,
            ganttEnabled: Boolean(item.active),
            order: item.order ?? ((index + 1) * 10),
            minimumCost: 0,
            timeBufferMinutes: 0,
            capacityMinutes: 480
        });
    });
    return normalized
        .sort((left, right) => numberValue(left.order, 999) - numberValue(right.order, 999))
        .map((item, index) => ({ ...item, order: (index + 1) * 10 }));
}

function syncProcessDefaultOrders() {
    if (!costsState?.general?.processDefaults) return;
    costsState.general.processDefaults = normalizeProcessDefaults(costsState.general.processDefaults)
        .map((item, index) => ({ ...item, order: (index + 1) * 10 }));
}

function moveProcessDefault(fromIndex, toIndex) {
    if (!costsState?.general?.processDefaults) return false;
    const rows = [...costsState.general.processDefaults];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length || fromIndex === toIndex) return false;
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, moved);
    costsState.general.processDefaults = rows.map((item, index) => ({ ...item, order: (index + 1) * 10 }));
    return true;
}

function getPresentationConfig(config, key) {
    const presentation = config?.presentations?.[key] || {};
    const general = config?.general || {};
    const layout = config?.layout || {};
    return {
        tabColor: presentation.tabColor || general.tabColor || "#7f7f7f",
        iconSize: Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20
    };
}

function normalizeFloatingSaveValue(value) {
    const raw = normalizeText(value);
    if (!raw) return DEFAULT_FLOATING_SAVE_ICON;
    if (raw.includes('\uFFFD')) return DEFAULT_FLOATING_SAVE_ICON;
    return raw;
}

function getFloatingSaveIcon(config) {
    const general = config?.general || {};
    return {
        value: normalizeFloatingSaveValue(config?.icons?.floatingSave),
        color: general.iconColorFloatingSave || "#ffffff",
        hover: general.iconColorHoverFloatingSave || "#ffffff",
        size: Number(general.iconSizeFloatingSave) || 20
    };
}

function isSvgValue(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized.startsWith("data:image/svg+xml") || /\.svg(\?|#|$)/i.test(normalized);
}

function applyFloatingSaveButtonIcon(button, iconValue, resolvedSize) {
    if (!button) return;
    const value = normalizeFloatingSaveValue(iconValue);
    if (isSvgValue(value)) {
        button.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${value}');mask-image:url('${value}');width:${resolvedSize}px;height:${resolvedSize}px;"></span>`;
        return;
    }
    if (String(value).startsWith("data:image")) {
        button.innerHTML = `<img src="${value}" alt="" class="icon-image" style="width:${resolvedSize}px;height:${resolvedSize}px;">`;
        return;
    }
    button.innerHTML = `<span class="icon-glyph">${escapeHtml(value)}</span>`;
}

function applyConfig(config) {
    loadedConfig = config || {};
    const root = document.documentElement;
    const presentation = getPresentationConfig(loadedConfig, PRESENTATION_KEY);
    root.style.setProperty("--tab-color", presentation.tabColor);
}

async function loadConfig() {
    const response = await fetch(CONFIG_ENDPOINT);
    if (!response.ok) throw new Error("No se pudo cargar la configuración visual.");
    applyConfig(await response.json());
}

function normalizeCostsConfig(config) {
    const source = config || {};
    const rowsOrDefault = (value, fallback = []) => (Array.isArray(value) && value.length ? value : fallback);
    const inferCoveragePct = (row) => {
        const tipo = normalizeText(row?.tipo);
        if (row?.coveragePct !== undefined && row?.coveragePct !== null && row?.coveragePct !== "") {
            return numberValue(row.coveragePct, 0);
        }
        if (tipo.includes("barniz")) return 100;
        if (tipo.includes("solidos") || tipo.includes("blancos")) return 100;
        if (tipo.includes("textos") || tipo.includes("lineas")) return 10;
        if (tipo.includes("cmyk") || tipo.includes("policromia")) return 25;
        return numberValue(source?.convencional?.tintaGeneral?.coberturaTintaPct, 0);
    };
    const normalizeDepositos = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-deposito-${index + 1}`,
        tipo: normalizeText(row?.tipo),
        bcm: numberValue(row?.bcm, 0),
        coveragePct: inferCoveragePct(row),
        gsm: numberValue(row?.gsm, 0)
    }));
    const normalizeMontaje = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-montaje-${index + 1}`,
        detalle: normalizeText(row?.detalle),
        porEstacion: numberValue(row?.porEstacion, 0),
        cantidadTintas: numberValue(row?.cantidadTintas, 0),
        totalPies: numberValue(row?.totalPies, 0)
    }));
    const normalizeTiraje = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-tiraje-${index + 1}`,
        detalle: normalizeText(row?.detalle),
        porcentaje: numberValue(row?.porcentaje, 0)
    }));
    const normalizeFinishWaste = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-finish-${index + 1}`,
        proceso: normalizeText(row?.proceso),
        setupWasteFeet: numberValue(row?.setupWasteFeet, 0),
        operationWastePct: numberValue(row?.operationWastePct, 0)
    }));
    const normalizeInlineFinishSetup = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-inline-${index + 1}`,
        proceso: normalizeText(row?.proceso),
        minutosPorEstacion: numberValue(row?.minutosPorEstacion, 5),
        setupWasteFeet: numberValue(row?.setupWasteFeet, 0)
    }));
    const normalizeDigitalCoverageProfiles = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `digital-profile-${index + 1}`,
        tipo: normalizeText(row?.tipo),
        coveragePct: numberValue(row?.coveragePct, 0)
    }));

    return {
        general: {
            notes: normalizeText(source?.general?.notes),
            updatedAt: source?.general?.updatedAt || null,
            defaultRollWidth: numberValue(source?.general?.defaultRollWidth, DEFAULT_COSTS_CONFIG.general.defaultRollWidth),
            defaultCoreDiameter: numberValue(source?.general?.defaultCoreDiameter, DEFAULT_COSTS_CONFIG.general.defaultCoreDiameter),
            coreDiameterOptions: normalizeCoreDiameterOptions(source?.general?.coreDiameterOptions, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true),
            defaultQuantityTypes: Math.max(1, numberValue(source?.general?.defaultQuantityTypes, DEFAULT_COSTS_CONFIG.general.defaultQuantityTypes)),
            defaultCmykEnabled: String(source?.general?.defaultCmykEnabled || DEFAULT_COSTS_CONFIG.general.defaultCmykEnabled).trim().toLowerCase() === "false" ? "false" : "true",
            processDefaults: normalizeProcessDefaults(source?.general?.processDefaults || DEFAULT_COSTS_CONFIG.general.processDefaults)
        },
        convencional: {
            tintaGeneral: {
                bcmGenerico: numberValue(source?.convencional?.tintaGeneral?.bcmGenerico, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.bcmGenerico),
                coberturaTintaPct: numberValue(source?.convencional?.tintaGeneral?.coberturaTintaPct, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaTintaPct),
                coberturaDisenoPct: numberValue(source?.convencional?.tintaGeneral?.coberturaDisenoPct, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaDisenoPct),
                densidadUv: numberValue(source?.convencional?.tintaGeneral?.densidadUv, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.densidadUv),
                costoLbCmyk: numberValue(source?.convencional?.tintaGeneral?.costoLbCmyk, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbCmyk),
                costoLbBlanco: numberValue(source?.convencional?.tintaGeneral?.costoLbBlanco, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbBlanco),
                costoLbPantone: numberValue(source?.convencional?.tintaGeneral?.costoLbPantone, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbPantone),
                depositos: normalizeDepositos(rowsOrDefault(source?.convencional?.tintaGeneral?.depositos, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.depositos))
            },
            inlineFinishSetup: normalizeInlineFinishSetup(rowsOrDefault(source?.convencional?.inlineFinishSetup, DEFAULT_COSTS_CONFIG.convencional.inlineFinishSetup)),
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.convencional?.maculaMontaje, DEFAULT_COSTS_CONFIG.convencional.maculaMontaje)),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.convencional?.maculaTiraje, DEFAULT_COSTS_CONFIG.convencional.maculaTiraje)),
            finishWaste: normalizeFinishWaste(rowsOrDefault(source?.convencional?.finishWaste, DEFAULT_COSTS_CONFIG.convencional.finishWaste))
        },
        digital: {
            premier: {
                formulaText: normalizeText(source?.digital?.premier?.formulaText) || DEFAULT_COSTS_CONFIG.digital.premier.formulaText,
                explanation: normalizeText(source?.digital?.premier?.explanation) || DEFAULT_COSTS_CONFIG.digital.premier.explanation,
                comment: normalizeText(source?.digital?.premier?.comment),
                mode: normalizeText(source?.digital?.premier?.mode) === "inline" ? "inline" : DEFAULT_COSTS_CONFIG.digital.premier.mode,
                setupMin: numberValue(source?.digital?.premier?.setupMin, DEFAULT_COSTS_CONFIG.digital.premier.setupMin),
                consumptionGm2: numberValue(source?.digital?.premier?.consumptionGm2, DEFAULT_COSTS_CONFIG.digital.premier.consumptionGm2),
                costPerKg: numberValue(source?.digital?.premier?.costPerKg, DEFAULT_COSTS_CONFIG.digital.premier.costPerKg),
                costPerM2: numberValue(source?.digital?.premier?.costPerM2, DEFAULT_COSTS_CONFIG.digital.premier.costPerM2),
                offlineCostPerMeter: numberValue(source?.digital?.premier?.offlineCostPerMeter, DEFAULT_COSTS_CONFIG.digital.premier.offlineCostPerMeter),
                maintenanceCost: numberValue(source?.digital?.premier?.maintenanceCost, DEFAULT_COSTS_CONFIG.digital.premier.maintenanceCost)
            },
            tintaGeneral: {
                billingType: normalizeText(source?.digital?.tintaGeneral?.billingType) === "clic" ? "clic" : DEFAULT_COSTS_CONFIG.digital.tintaGeneral.billingType,
                costPerKg: numberValue(source?.digital?.tintaGeneral?.costPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.costPerKg),
                whiteCostPerKg: numberValue(source?.digital?.tintaGeneral?.whiteCostPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteCostPerKg),
                specialCostPerKg: numberValue(source?.digital?.tintaGeneral?.specialCostPerKg, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialCostPerKg),
                clickRate: numberValue(source?.digital?.tintaGeneral?.clickRate, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickRate),
                clickMode: normalizeText(source?.digital?.tintaGeneral?.clickMode) === "por_vuelta" ? "por_vuelta" : DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickMode,
                coverageCmykPct: numberValue(source?.digital?.tintaGeneral?.coverageCmykPct, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageCmykPct),
                coverageWhitePct: numberValue(source?.digital?.tintaGeneral?.coverageWhitePct, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageWhitePct),
                cmykGm2: numberValue(source?.digital?.tintaGeneral?.cmykGm2, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.cmykGm2),
                whiteGm2: numberValue(source?.digital?.tintaGeneral?.whiteGm2, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteGm2),
                wasteFactor: numberValue(source?.digital?.tintaGeneral?.wasteFactor, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.wasteFactor),
                specialWashCost: numberValue(source?.digital?.tintaGeneral?.specialWashCost, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialWashCost),
                formulaConsumptionText: normalizeText(source?.digital?.tintaGeneral?.formulaConsumptionText) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaConsumptionText,
                formulaClickText: normalizeText(source?.digital?.tintaGeneral?.formulaClickText) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaClickText,
                explanation: normalizeText(source?.digital?.tintaGeneral?.explanation) || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.explanation,
                comment: normalizeText(source?.digital?.tintaGeneral?.comment),
                coverageProfiles: normalizeDigitalCoverageProfiles(rowsOrDefault(source?.digital?.tintaGeneral?.coverageProfiles, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageProfiles))
            },
            velocidad: {
                speedCmykMpm: numberValue(source?.digital?.velocidad?.speedCmykMpm, DEFAULT_COSTS_CONFIG.digital.velocidad.speedCmykMpm),
                speedExtendedMpm: numberValue(source?.digital?.velocidad?.speedExtendedMpm, DEFAULT_COSTS_CONFIG.digital.velocidad.speedExtendedMpm),
                comment: normalizeText(source?.digital?.velocidad?.comment)
            },
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.digital?.maculaMontaje, DEFAULT_COSTS_CONFIG.digital.maculaMontaje)),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.digital?.maculaTiraje, DEFAULT_COSTS_CONFIG.digital.maculaTiraje))
        }
    };
}

function readLocalCostsConfig() {
    return normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
}

function writeLocalCostsConfig(config) {
    return config;
}

async function loadCosts() {
    try {
        const response = await fetch(COSTS_ENDPOINT);
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
            throw new Error("API no disponible");
        }
        const payload = await response.json();
        costsState = normalizeCostsConfig(payload);
        setSaveStatus("");
    } catch (error) {
        costsState = normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
        setSaveStatus(error.message || "No se pudo cargar la configuración de costos.", true);
    }
    renderCosts();
}

function activateTab(tabKey) {
    tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === tabKey;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === tabKey);
    });
}

function renderInkFields() {
    const ink = costsState?.convencional?.tintaGeneral || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral;
    Object.entries(inkFields).forEach(([key, node]) => {
        if (node) node.value = ink[key] ?? "";
    });
    syncCostInputMasks();
}

function renderDepositosRows() {
    const rows = costsState?.convencional?.tintaGeneral?.depositos || [];
    depositosTableBody.innerHTML = rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="tipo" value="${escapeHtml(row.tipo)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="bcm" value="${escapeHtml(row.bcm)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="coveragePct" value="${escapeHtml(row.coveragePct)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="gsm" value="${escapeHtml(row.gsm)}"></td>
        </tr>
    `).join("");
}

function renderMontajeRows() {
    const rows = costsState?.convencional?.maculaMontaje || [];
    maculaMontajeTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.maculaMontaje" data-index="${index}" data-field="detalle" value="${escapeHtml(row.detalle)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.maculaMontaje" data-index="${index}" data-field="porEstacion" value="${escapeHtml(row.porEstacion)}"></td>
            <td><input type="number" min="0" step="1" data-section="convencional.maculaMontaje" data-index="${index}" data-field="cantidadTintas" value="${escapeHtml(row.cantidadTintas)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.maculaMontaje" data-index="${index}" data-field="totalPies" value="${escapeHtml(row.totalPies)}"></td>
            <td><button type="button" class="browser-open-link costs-row-remove" data-action="remove-montaje" data-index="${index}" aria-label="Quitar fila">×</button></td>
        </tr>
    `).join("") : '<tr><td colspan="5">No hay filas configuradas.</td></tr>';
}

function renderInlineFinishSetupRows() {
    const rows = costsState?.convencional?.inlineFinishSetup || [];
    inlineFinishSetupTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="proceso" value="${escapeHtml(row.proceso)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="minutosPorEstacion" value="${escapeHtml(row.minutosPorEstacion)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.inlineFinishSetup" data-index="${index}" data-field="setupWasteFeet" value="${escapeHtml(row.setupWasteFeet)}"></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
}

function renderTirajeRows() {
    const rows = costsState?.convencional?.maculaTiraje || [];
    maculaTirajeTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.maculaTiraje" data-index="${index}" data-field="detalle" value="${escapeHtml(row.detalle)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.maculaTiraje" data-index="${index}" data-field="porcentaje" value="${escapeHtml(row.porcentaje)}"></td>
            <td><button type="button" class="browser-open-link costs-row-remove" data-action="remove-tiraje" data-index="${index}" aria-label="Quitar fila">×</button></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
}

function renderFinishWasteRows() {
    const rows = costsState?.convencional?.finishWaste || [];
    finishWasteTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.finishWaste" data-index="${index}" data-field="proceso" value="${escapeHtml(row.proceso)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.finishWaste" data-index="${index}" data-field="setupWasteFeet" value="${escapeHtml(row.setupWasteFeet)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.finishWaste" data-index="${index}" data-field="operationWastePct" value="${escapeHtml(row.operationWastePct)}"></td>
        </tr>
    `).join("") : '<tr><td colspan="3">No hay filas configuradas.</td></tr>';
}

function renderDigitalPremierFields() {
    const premier = costsState?.digital?.premier || DEFAULT_COSTS_CONFIG.digital.premier;
    Object.entries(digitalPremierFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = premier[key] ?? "";
    });
    if (digitalPremierFormulaText) digitalPremierFormulaText.textContent = premier.formulaText || "";
    if (digitalPremierExplanationText) digitalPremierExplanationText.textContent = premier.explanation || "";
}

function renderDigitalInkFields() {
    const digitalInk = costsState?.digital?.tintaGeneral || DEFAULT_COSTS_CONFIG.digital.tintaGeneral;
    Object.entries(digitalInkFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = digitalInk[key] ?? "";
    });
    if (digitalInkFormulaConsumptionText) digitalInkFormulaConsumptionText.textContent = digitalInk.formulaConsumptionText || "";
    if (digitalInkFormulaClickText) digitalInkFormulaClickText.textContent = digitalInk.formulaClickText || "";
    if (digitalInkExplanationText) digitalInkExplanationText.textContent = digitalInk.explanation || "";
}

function renderDigitalCoverageProfileRows() {
    if (!digitalCoverageProfilesTableBody) return;
    const rows = costsState?.digital?.tintaGeneral?.coverageProfiles || [];
    digitalCoverageProfilesTableBody.innerHTML = rows.length ? rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="digital.tintaGeneral.coverageProfiles" data-index="${index}" data-field="tipo" value="${escapeHtml(row.tipo)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="digital.tintaGeneral.coverageProfiles" data-index="${index}" data-field="coveragePct" value="${escapeHtml(row.coveragePct)}"></td>
        </tr>
    `).join("") : '<tr><td colspan="2">No hay perfiles configurados.</td></tr>';
}

function renderDigitalSpeedFields() {
    const velocidad = costsState?.digital?.velocidad || DEFAULT_COSTS_CONFIG.digital.velocidad;
    Object.entries(digitalSpeedFields).forEach(([key, node]) => {
        if (!node) return;
        node.value = velocidad[key] ?? "";
    });
}

function renderCosts() {
    generalNotes.value = costsState?.general?.notes || "";
    Object.entries(generalDefaultFields).forEach(([key, node]) => {
        if (!node) return;
        if (key === "defaultCmykEnabled") {
            node.checked = String(costsState?.general?.[key] ?? DEFAULT_COSTS_CONFIG.general[key]).trim().toLowerCase() !== "false";
            return;
        }
        node.value = costsState?.general?.[key] ?? DEFAULT_COSTS_CONFIG.general[key] ?? "";
    });
    renderCoreDiameterOptionsRows();
    renderProcessDefaultRows();
    renderInkFields();
    renderDepositosRows();
    renderInlineFinishSetupRows();
    renderMontajeRows();
    renderTirajeRows();
    renderFinishWasteRows();
    renderDigitalPremierFields();
    renderDigitalInkFields();
    renderDigitalCoverageProfileRows();
    renderDigitalSpeedFields();
}

function renderProcessDefaultRows() {
    if (!processDefaultsList) return;
    const rows = costsState?.general?.processDefaults || [];
    processDefaultsList.innerHTML = rows.map((row, index) => `
        <tr class="costs-process-default-row" data-process-default-row="${index}" data-process-key="${escapeHtml(row.key)}">
            <td class="costs-process-default-number">${index + 1}</td>
            <td>
                <div class="costs-process-default-main">
                    <button type="button" class="costs-process-default-handle" data-action="drag-process" data-index="${index}" draggable="true" aria-label="Mover proceso">⋮⋮</button>
                    <span class="costs-process-default-label">${escapeHtml(row.label)}</span>
                </div>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Activo">
                    <input type="checkbox" data-process-field="active" data-index="${index}"${row.active ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Crear">
                    <input type="checkbox" data-process-field="createEnabled" data-index="${index}"${row.createEnabled ? " checked" : ""}${row.key === "macula" ? " disabled" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Mostrar en Gantt">
                    <input type="checkbox" data-process-field="ganttEnabled" data-index="${index}"${row.ganttEnabled ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="No Eliminar">
                    <input type="checkbox" data-process-field="locked" data-index="${index}"${row.locked ? " checked" : ""}>
                </label>
            </td>
            <td class="costs-process-default-cell-check">
                <label class="costs-process-default-check" aria-label="Permitir repetir">
                    <input type="checkbox" data-process-field="repeatable" data-index="${index}"${row.repeatable ? " checked" : ""}>
                </label>
            </td>
            <td>
                <label class="costs-process-default-cost" aria-label="Costo Mínimo">
                    <span class="costs-process-default-currency">$</span>
                    <input type="number" min="0" step="1" inputmode="numeric" data-process-field="minimumCost" data-index="${index}" value="${escapeHtml(Math.round(Number(row.minimumCost || 0)))}" placeholder="0">
                </label>
            </td>
            <td>
                <label class="costs-process-default-cost has-suffix" aria-label="Buffer de tiempo">
                    <input type="number" min="0" step="1" inputmode="numeric" data-process-field="timeBufferMinutes" data-index="${index}" value="${escapeHtml(Math.round(Number(row.timeBufferMinutes || 0)))}" placeholder="0">
                    <span class="costs-process-default-currency costs-process-default-suffix">min</span>
                </label>
            </td>
            <td>
                <label class="costs-process-default-cost has-suffix" aria-label="Capacidad">
                    <input type="number" min="0" step="1" inputmode="numeric" data-process-field="capacityMinutes" data-index="${index}" value="${escapeHtml(Math.round(Number(row.capacityMinutes || 480)))}" placeholder="480">
                    <span class="costs-process-default-currency costs-process-default-suffix">min</span>
                </label>
            </td>
        </tr>
    `).join("");
}

function renderCoreDiameterOptionsRows() {
    if (!coreDiameterOptionsTableBody) return;
    const rows = Array.isArray(costsState?.general?.coreDiameterOptions)
        ? costsState.general.coreDiameterOptions
        : [];
    coreDiameterOptionsTableBody.innerHTML = (rows.length ? rows : [""]).map((value, index) => `
        <tr class="costs-core-option-row">
            <td>
                <input type="text" class="costs-core-option-input" data-core-diameter-option-input="${index}" value="${escapeHtml(value)}" placeholder="Ej. 1.5">
            </td>
            <td class="costs-core-option-action-cell">
                <button type="button" class="costs-option-remove" data-core-diameter-option-remove="${index}" aria-label="Quitar opción"><span aria-hidden="true">×</span></button>
            </td>
        </tr>
    `).join("");
    if (addCoreDiameterOptionButton) {
        addCoreDiameterOptionButton.disabled = rows.length >= 5;
    }
}

function setSaveStatus(message, isError = false) {
    saveStatus.textContent = message;
    saveStatus.hidden = !message;
    saveStatus.classList.toggle("is-error", Boolean(isError));
}

async function saveCosts() {
    costsState.general.updatedAt = new Date().toISOString();
    setSaveStatus("Guardando...");
    const response = await fetch(COSTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(costsState)
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar la configuración de costos.");
    }
    costsState = normalizeCostsConfig(payload);
    setSaveStatus("Configuración guardada.");
}

function queueCostsSave() {
    if (!costsState) return;
    if (costsSaveInFlight) {
        costsSaveQueued = true;
        return;
    }
    clearTimeout(costsSaveTimer);
    setSaveStatus("Guardando cambios...");
    costsSaveTimer = setTimeout(async () => {
        costsSaveInFlight = true;
        try {
            await saveCosts();
        } catch (error) {
            setSaveStatus(error.message || "No se pudo guardar.", true);
        } finally {
            costsSaveInFlight = false;
            if (costsSaveQueued) {
                costsSaveQueued = false;
                queueCostsSave();
            }
        }
    }, 650);
}

tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

generalNotes?.addEventListener("input", () => {
    if (!costsState) return;
    costsState.general.notes = generalNotes.value;
    queueCostsSave();
});

Object.entries(generalDefaultFields).forEach(([key, node]) => {
    const updateGeneralDefault = () => {
        if (!costsState) return;
        if (key === "defaultCmykEnabled") {
            costsState.general[key] = node.checked ? "true" : "false";
        } else if (key === "defaultQuantityTypes") {
            costsState.general[key] = Math.max(1, numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]));
        } else {
            costsState.general[key] = numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]);
        }
        queueCostsSave();
    };
    node?.addEventListener("input", updateGeneralDefault);
    if (key === "defaultCmykEnabled") node?.addEventListener("change", updateGeneralDefault);
});

coreDiameterOptionsTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest("[data-core-diameter-option-input]");
    if (!target || !costsState) return;
    const index = Number(target.dataset.coreDiameterOptionInput);
    const nextRows = [...(costsState.general.coreDiameterOptions || [])];
    while (nextRows.length <= index) nextRows.push("");
    nextRows[index] = normalizeText(target.value);
    costsState.general.coreDiameterOptions = normalizeCoreDiameterOptions(nextRows, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions, true);
    queueCostsSave();
});

coreDiameterOptionsTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-core-diameter-option-remove]");
    if (!button || !costsState) return;
    const index = Number(button.dataset.coreDiameterOptionRemove);
    costsState.general.coreDiameterOptions = (costsState.general.coreDiameterOptions || []).filter((_, rowIndex) => rowIndex !== index);
    renderCoreDiameterOptionsRows();
    queueCostsSave();
});

processDefaultsList?.addEventListener("input", (event) => {
    const target = event.target.closest("[data-process-field]");
    if (!target || !costsState) return;
    const row = costsState.general.processDefaults?.[Number(target.dataset.index)];
    if (!row) return;
    if (target.dataset.processField === "minimumCost") {
        row.minimumCost = Math.max(0, numberValue(target.value, 0));
    }
    if (target.dataset.processField === "timeBufferMinutes") {
        row.timeBufferMinutes = Math.max(0, numberValue(target.value, 0));
    }
    if (target.dataset.processField === "capacityMinutes") {
        row.capacityMinutes = Math.max(0, numberValue(target.value, 0));
    }
    queueCostsSave();
});

processDefaultsList?.addEventListener("change", (event) => {
    const target = event.target.closest("[data-process-field]");
    if (!target || !costsState) return;
    const row = costsState.general.processDefaults?.[Number(target.dataset.index)];
    if (!row) return;
    if (target.dataset.processField === "active") {
        row.active = target.checked;
        if (!row.active) {
            row.locked = false;
            row.createEnabled = false;
        }
        if (["macula", "troquel"].includes(row.key)) {
            row.active = true;
            row.locked = true;
            if (row.key === "macula") row.createEnabled = true;
        }
    }
    if (target.dataset.processField === "createEnabled") {
        row.createEnabled = row.key === "macula" ? true : target.checked;
        if (row.createEnabled) row.active = true;
    }
    if (target.dataset.processField === "ganttEnabled") {
        row.ganttEnabled = target.checked;
    }
    if (target.dataset.processField === "locked") {
        row.locked = target.checked;
        if (["macula", "troquel"].includes(row.key)) row.locked = true;
        if (row.locked) row.active = true;
    }
    if (target.dataset.processField === "repeatable") {
        row.repeatable = target.checked;
    }
    syncProcessDefaultOrders();
    renderProcessDefaultRows();
    queueCostsSave();
});

processDefaultsList?.addEventListener("click", (event) => {
    const upButton = event.target.closest('[data-action="move-process-up"]');
    if (upButton && moveProcessDefault(Number(upButton.dataset.index), Number(upButton.dataset.index) - 1)) {
        renderProcessDefaultRows();
        queueCostsSave();
        return;
    }
    const downButton = event.target.closest('[data-action="move-process-down"]');
    if (downButton && moveProcessDefault(Number(downButton.dataset.index), Number(downButton.dataset.index) + 1)) {
        renderProcessDefaultRows();
        queueCostsSave();
    }
});

processDefaultsList?.addEventListener("dragstart", (event) => {
    const handle = event.target.closest('[data-action="drag-process"]');
    if (!handle) {
        event.preventDefault();
        return;
    }
    draggedProcessKey = String(handle.closest("[data-process-key]")?.dataset.processKey || "");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedProcessKey);
    handle.closest(".costs-process-default-row")?.classList.add("is-dragging");
});

processDefaultsList?.addEventListener("dragover", (event) => {
    if (!draggedProcessKey) return;
    event.preventDefault();
    const row = event.target.closest(".costs-process-default-row");
    processDefaultsList.querySelectorAll(".costs-process-default-row.is-drop-before").forEach((node) => node.classList.remove("is-drop-before"));
    if (row) row.classList.add("is-drop-before");
});

processDefaultsList?.addEventListener("drop", (event) => {
    if (!draggedProcessKey || !costsState) return;
    event.preventDefault();
    const row = event.target.closest(".costs-process-default-row");
    const fromIndex = (costsState.general.processDefaults || []).findIndex((item) => item.key === draggedProcessKey);
    const toIndex = Number(row?.dataset.processDefaultRow ?? -1);
    processDefaultsList.querySelectorAll(".costs-process-default-row").forEach((node) => node.classList.remove("is-drop-before", "is-dragging"));
    draggedProcessKey = "";
    if (moveProcessDefault(fromIndex, toIndex)) {
        renderProcessDefaultRows();
        queueCostsSave();
    }
});

processDefaultsList?.addEventListener("dragend", () => {
    processDefaultsList.querySelectorAll(".costs-process-default-row").forEach((node) => node.classList.remove("is-drop-before", "is-dragging"));
    draggedProcessKey = "";
});

addCoreDiameterOptionButton?.addEventListener("click", () => {
    if (!costsState) return;
    const nextRows = [...(costsState.general.coreDiameterOptions || [])];
    if (nextRows.length >= 5) return;
    nextRows.push("");
    costsState.general.coreDiameterOptions = nextRows;
    renderCoreDiameterOptionsRows();
});

Object.entries(inkFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.convencional.tintaGeneral[key] = numberValue(node.value, 0);
        syncCostInputMask(node);
        queueCostsSave();
    });
});

depositosTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.tintaGeneral.depositos"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.tintaGeneral.depositos[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

inlineFinishSetupTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.inlineFinishSetup"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.inlineFinishSetup[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

maculaMontajeTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.maculaMontaje"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.maculaMontaje[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

maculaTirajeTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.maculaTiraje"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.maculaTiraje[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

finishWasteTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="convencional.finishWaste"]');
    if (!target || !costsState) return;
    const row = costsState.convencional.finishWaste[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

maculaMontajeTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="remove-montaje"]');
    if (!button || !costsState) return;
    costsState.convencional.maculaMontaje.splice(Number(button.dataset.index), 1);
    renderMontajeRows();
    queueCostsSave();
});

maculaTirajeTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="remove-tiraje"]');
    if (!button || !costsState) return;
    costsState.convencional.maculaTiraje.splice(Number(button.dataset.index), 1);
    renderTirajeRows();
    queueCostsSave();
});

Object.entries(digitalPremierFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.premier[key] = node.tagName === "TEXTAREA" || node.tagName === "SELECT"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.premier[key]);
        queueCostsSave();
    });
});

Object.entries(digitalInkFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.tintaGeneral[key] = node.tagName === "TEXTAREA" || node.tagName === "SELECT"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.tintaGeneral[key]);
        queueCostsSave();
    });
});

Object.entries(digitalSpeedFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.digital.velocidad[key] = node.tagName === "TEXTAREA"
            ? node.value
            : numberValue(node.value, DEFAULT_COSTS_CONFIG.digital.velocidad[key]);
        queueCostsSave();
    });
});

digitalCoverageProfilesTableBody?.addEventListener("input", (event) => {
    const target = event.target.closest('[data-section="digital.tintaGeneral.coverageProfiles"]');
    if (!target || !costsState) return;
    const row = costsState.digital.tintaGeneral.coverageProfiles[Number(target.dataset.index)];
    if (!row) return;
    row[target.dataset.field] = target.type === "number" ? numberValue(target.value, 0) : target.value;
    queueCostsSave();
});

async function init() {
    try {
        await loadConfig();
        await loadCosts();
        activateTab("general");
    } catch (error) {
        costsState = readLocalCostsConfig();
        renderCosts();
        activateTab("general");
        setSaveStatus(error.message || "No se pudo cargar el módulo.", true);
    }
}

init();
