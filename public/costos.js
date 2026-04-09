const CONFIG_ENDPOINT = "/api/config/general";
const COSTS_ENDPOINT = "/api/costos-config";
const PRESENTATION_KEY = "costos";
const COSTS_FALLBACK_STORAGE_KEY = "erp-costos-config";
const DEFAULT_FLOATING_SAVE_ICON = "\u{1F4BE}";

const DEFAULT_COSTS_CONFIG = {
    general: {
        notes: "",
        updatedAt: null,
        defaultRollWidth: 13,
        defaultCoreDiameter: 3,
        coreDiameterOptions: ["1", "1.5", "3", "6"],
        defaultQuantityTypes: 1,
        defaultCmykEnabled: "true"
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
                { id: "conv-deposito-blancos", tipo: "Fondos Sólidos / Blancos", bcm: 7, gsm: 2.5 },
                { id: "conv-deposito-textos", tipo: "Textos y Líneas Gruesas", bcm: 4, gsm: 1.2 },
                { id: "conv-deposito-cmyk", tipo: "Policromía (CMYK)", bcm: 2, gsm: 1 },
                { id: "conv-deposito-barniz", tipo: "Barniz UV", bcm: 7, gsm: 3 }
            ]
        },
        inlineFinishSetup: [
            { id: "conv-inline-impresion", proceso: "Impresión", minutosPorEstacion: 5 },
            { id: "conv-inline-troquelado", proceso: "Troquelado", minutosPorEstacion: 5 },
            { id: "conv-inline-laminado", proceso: "Laminado", minutosPorEstacion: 5 },
            { id: "conv-inline-barniz", proceso: "Barniz", minutosPorEstacion: 5 },
            { id: "conv-inline-embosado", proceso: "Embosado", minutosPorEstacion: 5 },
            { id: "conv-inline-estampado", proceso: "Estampado", minutosPorEstacion: 5 },
            { id: "conv-inline-numerado", proceso: "Numerado", minutosPorEstacion: 5 }
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
    coreDiameterOptions: document.getElementById("costosCoreDiameterOptions"),
    defaultQuantityTypes: document.getElementById("costosDefaultQuantityTypes"),
    defaultCmykEnabled: document.getElementById("costosDefaultCmykEnabled")
};
const maculaMontajeTableBody = document.getElementById("maculaMontajeTableBody");
const maculaTirajeTableBody = document.getElementById("maculaTirajeTableBody");
const depositosTableBody = document.getElementById("costosDepositosTableBody");
const finishWasteTableBody = document.getElementById("costosFinishWasteTableBody");
const inlineFinishSetupTableBody = document.getElementById("inlineFinishSetupTableBody");
const inkFields = {
    bcmGenerico: document.getElementById("costosBcmGenerico"),
    coberturaTintaPct: document.getElementById("costosCoberturaTinta"),
    coberturaDisenoPct: document.getElementById("costosCoberturaDiseno"),
    densidadUv: document.getElementById("costosDensidadUv"),
    costoLbCmyk: document.getElementById("costosCostoLbCmyk"),
    costoLbBlanco: document.getElementById("costosCostoLbBlanco"),
    costoLbPantone: document.getElementById("costosCostoLbPantone")
};

let loadedConfig = null;
let costsState = null;
let savingMode = "api";
let costsSaveTimer = null;
let costsSaveInFlight = false;
let costsSaveQueued = false;

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    return String(value || "").trim();
}

function numberValue(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCoreDiameterOptions(value, fallback = DEFAULT_COSTS_CONFIG.general.coreDiameterOptions) {
    if (Array.isArray(value)) {
        const items = value.map((item) => normalizeText(item)).filter(Boolean);
        return items.length ? items.slice(0, 5) : [...fallback];
    }
    const text = normalizeText(value);
    if (!text) return [...fallback];
    const items = text.split(",").map((item) => normalizeText(item)).filter(Boolean);
    return items.length ? items.slice(0, 5) : [...fallback];
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
    const raw = String(value || "").trim();
    if (!raw) return DEFAULT_FLOATING_SAVE_ICON;
    if (/[ÃƒÃ°Ã¯ï¿½]/.test(raw)) return DEFAULT_FLOATING_SAVE_ICON;
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
    return normalized.startsWith("data:image/svg+xml") || normalized.endsWith(".svg");
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
    const normalizeDepositos = (rows) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeText(row?.id) || `conv-deposito-${index + 1}`,
        tipo: normalizeText(row?.tipo),
        bcm: numberValue(row?.bcm, 0),
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
        minutosPorEstacion: numberValue(row?.minutosPorEstacion, 5)
    }));

    return {
        general: {
            notes: normalizeText(source?.general?.notes),
            updatedAt: source?.general?.updatedAt || null,
            defaultRollWidth: numberValue(source?.general?.defaultRollWidth, DEFAULT_COSTS_CONFIG.general.defaultRollWidth),
            defaultCoreDiameter: numberValue(source?.general?.defaultCoreDiameter, DEFAULT_COSTS_CONFIG.general.defaultCoreDiameter),
            coreDiameterOptions: normalizeCoreDiameterOptions(source?.general?.coreDiameterOptions, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions),
            defaultQuantityTypes: Math.max(1, numberValue(source?.general?.defaultQuantityTypes, DEFAULT_COSTS_CONFIG.general.defaultQuantityTypes)),
            defaultCmykEnabled: String(source?.general?.defaultCmykEnabled || DEFAULT_COSTS_CONFIG.general.defaultCmykEnabled).trim().toLowerCase() === "false" ? "false" : "true"
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
                depositos: normalizeDepositos(source?.convencional?.tintaGeneral?.depositos || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.depositos)
            },
            inlineFinishSetup: normalizeInlineFinishSetup(source?.convencional?.inlineFinishSetup || DEFAULT_COSTS_CONFIG.convencional.inlineFinishSetup),
            maculaMontaje: normalizeMontaje(source?.convencional?.maculaMontaje || DEFAULT_COSTS_CONFIG.convencional.maculaMontaje),
            maculaTiraje: normalizeTiraje(source?.convencional?.maculaTiraje || DEFAULT_COSTS_CONFIG.convencional.maculaTiraje),
            finishWaste: normalizeFinishWaste(source?.convencional?.finishWaste || DEFAULT_COSTS_CONFIG.convencional.finishWaste)
        },
        digital: {
            maculaMontaje: normalizeMontaje(source?.digital?.maculaMontaje || DEFAULT_COSTS_CONFIG.digital.maculaMontaje),
            maculaTiraje: normalizeTiraje(source?.digital?.maculaTiraje || DEFAULT_COSTS_CONFIG.digital.maculaTiraje)
        }
    };
}

function readLocalCostsConfig() {
    try {
        const stored = JSON.parse(localStorage.getItem(COSTS_FALLBACK_STORAGE_KEY) || "null");
        return normalizeCostsConfig(stored || DEFAULT_COSTS_CONFIG);
    } catch (error) {
        return normalizeCostsConfig(DEFAULT_COSTS_CONFIG);
    }
}

function writeLocalCostsConfig(config) {
    localStorage.setItem(COSTS_FALLBACK_STORAGE_KEY, JSON.stringify(config));
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
        savingMode = "api";
        writeLocalCostsConfig(costsState);
        setSaveStatus("");
    } catch (error) {
        costsState = readLocalCostsConfig();
        savingMode = "local";
        setSaveStatus("");
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
}

function renderDepositosRows() {
    const rows = costsState?.convencional?.tintaGeneral?.depositos || [];
    depositosTableBody.innerHTML = rows.map((row, index) => `
        <tr>
            <td><input type="text" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="tipo" value="${escapeHtml(row.tipo)}"></td>
            <td><input type="number" min="0" step="0.01" data-section="convencional.tintaGeneral.depositos" data-index="${index}" data-field="bcm" value="${escapeHtml(row.bcm)}"></td>
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
        </tr>
    `).join("") : '<tr><td colspan="2">No hay filas configuradas.</td></tr>';
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

function renderCosts() {
    generalNotes.value = costsState?.general?.notes || "";
    Object.entries(generalDefaultFields).forEach(([key, node]) => {
        if (!node) return;
        if (key === "coreDiameterOptions") {
            node.value = (costsState?.general?.coreDiameterOptions || DEFAULT_COSTS_CONFIG.general.coreDiameterOptions || []).join(", ");
            return;
        }
        node.value = costsState?.general?.[key] ?? DEFAULT_COSTS_CONFIG.general[key] ?? "";
    });
    renderInkFields();
    renderDepositosRows();
    renderInlineFinishSetupRows();
    renderMontajeRows();
    renderTirajeRows();
    renderFinishWasteRows();
}

function setSaveStatus(message, isError = false) {
    saveStatus.textContent = message;
    saveStatus.hidden = !message;
    saveStatus.classList.toggle("is-error", Boolean(isError));
}

async function saveCosts() {
    costsState.general.updatedAt = new Date().toISOString();
    writeLocalCostsConfig(costsState);
    if (savingMode === "local") {
        setSaveStatus("Guardado localmente.");
        return;
    }

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
    writeLocalCostsConfig(costsState);
    renderCosts();
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
    node?.addEventListener("input", () => {
        if (!costsState) return;
        if (key === "defaultCmykEnabled") {
            costsState.general[key] = node.value === "false" ? "false" : "true";
        } else if (key === "coreDiameterOptions") {
            costsState.general[key] = normalizeCoreDiameterOptions(node.value, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions);
        } else if (key === "defaultQuantityTypes") {
            costsState.general[key] = Math.max(1, numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]));
        } else {
            costsState.general[key] = numberValue(node.value, DEFAULT_COSTS_CONFIG.general[key]);
        }
        queueCostsSave();
    });
});

Object.entries(inkFields).forEach(([key, node]) => {
    node?.addEventListener("input", () => {
        if (!costsState) return;
        costsState.convencional.tintaGeneral[key] = numberValue(node.value, 0);
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

async function init() {
    try {
        await loadConfig();
        await loadCosts();
        activateTab("convencional");
    } catch (error) {
        costsState = readLocalCostsConfig();
        renderCosts();
        activateTab("convencional");
        setSaveStatus(error.message || "No se pudo cargar el módulo.", true);
    }
}

init();
