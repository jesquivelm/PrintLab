const params = new URLSearchParams(window.location.search);
const productSelect = document.getElementById('productId');
const materialSelect = document.getElementById('materialId');
const dieSelect = document.getElementById('dieId');
const machineSelect = document.getElementById('machineId');
const processSelect = document.getElementById('processType');
const orderTypeSelect = document.getElementById('orderType');
const quantityInput = document.getElementById('quantityProducts');
const widthInput = document.getElementById('widthInches');
const lengthInput = document.getElementById('lengthInches');
const stationCountInput = document.getElementById('stationCount');
const labelsPerRollInput = document.getElementById('labelsPerRoll');
const applicationTypeInput = document.getElementById('applicationType');
const quantityTypesInput = document.getElementById('quantityTypesInput');
const cmykInput = document.getElementById('cmykInput');
const outputTypeInput = document.getElementById('outputType');
const summaryGrid = document.getElementById('summaryGrid');
const globalCostSettings = document.getElementById('globalCostSettings');
const machineCategoryGrid = document.getElementById('machineCategoryGrid');
const previewMetrics = document.getElementById('previewMetrics');
const previewBreakdown = document.getElementById('previewBreakdown');
const processPanels = document.getElementById('processPanels');
const validationPanels = document.getElementById('validationPanels');
const calcStatus = document.getElementById('calcStatus');
const calculatePreviewButton = document.getElementById('calculatePreview');
const saveCalculationButton = document.getElementById('saveCalculationButton');
const backToQuoteLink = document.getElementById('backToQuoteLink');
const calcTitle = document.getElementById('calcTitle');
const calcCustomerMeta = document.getElementById('calcCustomerMeta');
const calcSellerMeta = document.getElementById('calcSellerMeta');
const calcSearchButton = document.getElementById('calcSearchButton');
const calcMenuToggle = document.getElementById('calcMenuToggle');
const calcMenuPanel = document.getElementById('calcMenuPanel');
const quantityProductsList = document.getElementById('quantityProductsList');
const outputTypePreview = document.getElementById('outputTypePreview');
const coreWidthInput = document.getElementById('coreWidthInput');
const coreDiameterInput = document.getElementById('coreDiameterInput');
const applicationModeInput = document.getElementById('applicationModeInput');
const environmentInput = document.getElementById('environmentInput');
const surfaceTypeInput = document.getElementById('surfaceTypeInput');
const inkProfileTypeInput = document.getElementById('inkProfileType');
const inkCoveragePctInput = document.getElementById('inkCoveragePct');
const inkAniloxBcmInput = document.getElementById('inkAniloxBcm');
const inkGsmInput = document.getElementById('inkGsm');
const inlineVarnishActiveInput = document.getElementById('inlineVarnishActive');
const inlineVarnishCoveragePctInput = document.getElementById('inlineVarnishCoveragePct');
const inlineVarnishGsmInput = document.getElementById('inlineVarnishGsm');
const inlineFinishBox = inlineVarnishActiveInput?.closest('.flexo-inline-finish-box') || null;
const PRESENTATION_KEY = 'calculos';
const COSTS_CONFIG_ENDPOINT = '/api/costos-config';

let catalogs = null;
let currentCalculation = null;
let currentQuote = null;
let relatedLines = [];
let quantityValues = [''];
let loadedConfig = null;
let loadedCostsConfig = null;

function toggleCalcMenu(forceState) {
    if (!calcMenuPanel || !calcMenuToggle) return;
    const shouldOpen = typeof forceState === 'boolean' ? forceState : calcMenuPanel.hidden;
    calcMenuPanel.hidden = !shouldOpen;
    calcMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
}

function setHeaderIcon(button, value, altText) {
    if (!button) return;
    button.innerHTML = `<span class="icon-glyph" aria-hidden="true">${value}</span>`;
    button.setAttribute('aria-label', altText);
}

function getFlexAlign(value, fallback = 'flex-start') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'flex-end';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'flex-start';
    return fallback;
}

function getTextAlign(value, fallback = 'left') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'right';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'left';
    return fallback;
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return '';
}

function normalizeCalcText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function normalizeQuantityValue(value) {
    const digits = String(value ?? '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return String(Number.parseInt(digits, 10));
}

function formatQuantityDisplay(value) {
    const normalized = normalizeQuantityValue(value);
    if (!normalized) return '';
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(Number(normalized));
}

function syncQuantityInput() {
    const primary = normalizeQuantityValue(quantityValues[0] || '');
    quantityInput.value = primary;
}

function ensureQuantityValues(values = []) {
    const normalized = Array.isArray(values)
        ? values.map((value) => normalizeQuantityValue(value)).filter((value, index, source) => value !== '' || index === source.length - 1)
        : [];
    quantityValues = normalized.length ? normalized : [''];
    syncQuantityInput();
}

function renderQuantityEditor() {
    if (!quantityProductsList) return;
    quantityProductsList.innerHTML = quantityValues.map((value, index) => `
        <div class="flexo-quantity-item">
            <input
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                class="flexo-quantity-field"
                data-quantity-index="${index}"
                value="${formatQuantityDisplay(value)}"
                placeholder="0"
                aria-label="Cantidad de productos ${index + 1}"
            >
            <div class="flexo-quantity-actions">
                ${index === quantityValues.length - 1 ? '<button type="button" class="flexo-quantity-add" data-action="add-quantity" aria-label="Agregar cantidad">+</button>' : ''}
                ${index === quantityValues.length - 1 && quantityValues.length > 1 ? '<button type="button" class="flexo-quantity-remove" data-action="remove-quantity" aria-label="Eliminar última cantidad">Eliminar</button>' : ''}
            </div>
        </div>
    `).join('');
    syncQuantityInput();
}

function updateHeaderMeta(customerName = '', sellerName = '') {
    if (calcCustomerMeta) {
        calcCustomerMeta.textContent = `Cliente: ${customerName || 'Sin seleccionar'}`;
    }
    if (calcSellerMeta) {
        calcSellerMeta.textContent = `Vendedor: ${sellerName || 'Sin asignar'}`;
    }
}

function syncOutputPreview() {
    if (!outputTypePreview) return;
    const outputLabel = String(outputTypeInput?.value || '').trim() || 'Salida';
    const outputRecord = (catalogs?.outputTypes || []).find((item) => {
        const name = String(item?.nombre || item?.name || '').trim().toLowerCase();
        const code = String(item?.codigo || item?.code || '').trim().toLowerCase();
        const desc = String(item?.descripcion || item?.description || '').trim().toLowerCase();
        const current = outputLabel.toLowerCase();
        return current && (current === name || current === code || current === desc);
    }) || null;
    const imageUrl = String(outputRecord?.image_url || outputRecord?.imageUrl || '').trim();

    if (imageUrl) {
        outputTypePreview.innerHTML = `
            <div class="flexo-output-badge">${outputLabel}</div>
            <img src="${imageUrl}" alt="${outputLabel}" class="flexo-output-preview-image">
        `;
        return;
    }

    outputTypePreview.innerHTML = `
        <div class="flexo-output-badge">${outputLabel}</div>
        <div class="flexo-output-shape flexo-output-shape-${outputLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"></div>
    `;
}

function parseConfigNumber(value, fallback = null) {
    if (value === '' || value === null || value === undefined) return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function deepClone(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
}

function inferProfileCoverage(row, fallback = null) {
    const normalizedType = normalizeCalcText(row?.tipo);
    if (row?.coveragePct !== undefined && row?.coveragePct !== null && row?.coveragePct !== '') {
        return parseConfigNumber(row.coveragePct, fallback);
    }
    if (normalizedType.includes('barniz')) return 100;
    if (normalizedType.includes('solido') || normalizedType.includes('blanco')) return 100;
    if (normalizedType.includes('texto') || normalizedType.includes('linea')) return 10;
    if (normalizedType.includes('cmyk') || normalizedType.includes('policrom')) return 25;
    return fallback;
}

function getInkProfileRows() {
    const rows = Array.isArray(loadedCostsConfig?.convencional?.tintaGeneral?.depositos)
        ? loadedCostsConfig.convencional.tintaGeneral.depositos
        : [];
    return rows.map((row, index) => ({
        id: String(row?.id || `conv-profile-${index + 1}`),
        tipo: String(row?.tipo || '').trim(),
        bcm: parseConfigNumber(row?.bcm, 0) || 0,
        gsm: parseConfigNumber(row?.gsm, 0) || 0,
        coveragePct: inferProfileCoverage(row, parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.coberturaTintaPct, 0) || 0)
    }));
}

function getPrintableInkProfiles() {
    return getInkProfileRows().filter((row) => !normalizeCalcText(row.tipo).includes('barniz'));
}

function getBarnizInkProfile() {
    return getInkProfileRows().find((row) => normalizeCalcText(row.tipo).includes('barniz')) || null;
}

function inferInkProfileId() {
    const existingPrintState = currentCalculation?.uiState?.print || currentCalculation?.uiState?.printStages?.[0] || {};
    if (existingPrintState.profileId) return String(existingPrintState.profileId);

    const printable = getPrintableInkProfiles();
    if (!printable.length) return '';
    const byMatch = (terms = []) => printable.find((row) => terms.some((term) => normalizeCalcText(row.tipo).includes(term)));

    const useCmyk = Boolean(cmykInput?.checked || currentCalculation?.cmyk || currentCalculation?.uiState?.header?.useCmyk);
    const useWhiteInk = Boolean(
        currentCalculation?.uiState?.header?.useWhiteInk
        || currentCalculation?.raw_data?.['TINTA BLANCA | CHECK']
        || currentCalculation?.raw_data?.['GENERAL | TINTA BLANCA']
    );
    const pantoneCount = parseConfigNumber(currentCalculation?.uiState?.header?.pantoneCount, currentCalculation?.pantoneCount) || 0;
    const tintCount = parseConfigNumber(stationCountInput?.value, currentCalculation?.tintCount) || 0;

    if (useCmyk) return byMatch(['cmyk', 'policrom'])?.id || printable[0].id;
    if (useWhiteInk) return byMatch(['solido', 'blanco'])?.id || printable[0].id;
    if (pantoneCount > 0 || tintCount <= 1) return byMatch(['texto', 'linea'])?.id || printable[0].id;
    if (tintCount >= 4) return byMatch(['cmyk', 'policrom'])?.id || printable[0].id;
    return byMatch(['texto', 'linea'])?.id || printable[0].id;
}

function buildInitialPrintState() {
    const existingPrintState = deepClone(currentCalculation?.uiState?.print || currentCalculation?.uiState?.printStages?.[0] || {}) || {};
    const existingBarniz = deepClone(existingPrintState.inlineFinishes?.barniz || {}) || {};
    const profiles = getInkProfileRows();
    const selectedProfileId = String(existingPrintState.profileId || inferInkProfileId() || '');
    const selectedProfile = profiles.find((row) => row.id === selectedProfileId) || null;
    const barnizProfile = getBarnizInkProfile();
    const rawBarniz = normalizeCalcText(currentCalculation?.raw_data?.['REQ | Barniz']);
    const barnizActive = existingBarniz.active !== undefined
        ? Boolean(existingBarniz.active)
        : Boolean(rawBarniz && !['sin barniz', 'sin', 'no', 'ninguno'].includes(rawBarniz));

    return {
        profileId: selectedProfileId,
        profileLabel: selectedProfile?.tipo || existingPrintState.profileLabel || '',
        coveragePct: parseConfigNumber(existingPrintState.coveragePct, selectedProfile?.coveragePct) || 0,
        aniloxBcm: parseConfigNumber(existingPrintState.aniloxBcm, selectedProfile?.bcm) || 0,
        inkGsm: parseConfigNumber(existingPrintState.inkGsm, selectedProfile?.gsm) || 0,
        barnizActive,
        barnizCoveragePct: parseConfigNumber(existingBarniz.coveragePct, barnizProfile?.coveragePct) || 0,
        barnizGsm: parseConfigNumber(existingBarniz.layerGsm, barnizProfile?.gsm) || 0
    };
}

function renderInkProfileOptions() {
    if (!inkProfileTypeInput) return;
    const rows = getPrintableInkProfiles();
    inkProfileTypeInput.innerHTML = ['<option value="">Seleccionar...</option>']
        .concat(rows.map((row) => `<option value="${row.id}">${row.tipo}</option>`))
        .join('');
}

function syncInlineVarnishState() {
    const active = Boolean(inlineVarnishActiveInput?.checked);
    [inlineVarnishCoveragePctInput, inlineVarnishGsmInput].forEach((input) => {
        if (!input) return;
        input.disabled = !active;
    });
    inlineFinishBox?.classList.toggle('is-disabled', !active);
}

function applySelectedInkProfile(profileId, preserveUserValues = false) {
    const row = getPrintableInkProfiles().find((item) => item.id === String(profileId)) || null;
    if (inkProfileTypeInput) inkProfileTypeInput.value = row?.id || '';
    if (!row) return;
    if (!preserveUserValues || !inkCoveragePctInput?.value) inkCoveragePctInput.value = row.coveragePct;
    if (!preserveUserValues || !inkAniloxBcmInput?.value) inkAniloxBcmInput.value = row.bcm;
    if (!preserveUserValues || !inkGsmInput?.value) inkGsmInput.value = row.gsm;
}

function renderInkProfileEditor() {
    if (inkProfileTypeInput) delete inkProfileTypeInput.dataset.manualChange;
    renderInkProfileOptions();
    const initial = buildInitialPrintState();
    applySelectedInkProfile(initial.profileId, false);
    if (inkCoveragePctInput) inkCoveragePctInput.value = initial.coveragePct;
    if (inkAniloxBcmInput) inkAniloxBcmInput.value = initial.aniloxBcm;
    if (inkGsmInput) inkGsmInput.value = initial.inkGsm;
    if (inlineVarnishActiveInput) inlineVarnishActiveInput.checked = Boolean(initial.barnizActive);
    if (inlineVarnishCoveragePctInput) inlineVarnishCoveragePctInput.value = initial.barnizCoveragePct;
    if (inlineVarnishGsmInput) inlineVarnishGsmInput.value = initial.barnizGsm;
    syncInlineVarnishState();
}

function buildPrintStateFromInputs(existingPrintState = {}) {
    const next = deepClone(existingPrintState) || {};
    const profiles = getInkProfileRows();
    const selectedProfile = profiles.find((row) => row.id === String(inkProfileTypeInput?.value || '')) || null;
    const barnizProfile = getBarnizInkProfile();
    next.profileId = String(inkProfileTypeInput?.value || selectedProfile?.id || '');
    next.profileLabel = selectedProfile?.tipo || next.profileLabel || '';
    next.coveragePct = parseConfigNumber(inkCoveragePctInput?.value, selectedProfile?.coveragePct) || 0;
    next.aniloxBcm = parseConfigNumber(inkAniloxBcmInput?.value, selectedProfile?.bcm) || 0;
    next.inkGsm = parseConfigNumber(inkGsmInput?.value, selectedProfile?.gsm) || 0;
    next.bcmGenerico = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.bcmGenerico, next.bcmGenerico) || 0;
    next.inkDensity = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.densidadUv, next.inkDensity) || 0;
    next.designCoveragePct = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.coberturaDisenoPct, next.designCoveragePct) || 0;
    next.inkCostPerLb = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.costoLbCmyk, next.inkCostPerLb) || 0;
    next.whiteInkCostPerLb = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.costoLbBlanco, next.whiteInkCostPerLb) || 0;
    next.pantoneInkCostPerLb = parseConfigNumber(loadedCostsConfig?.convencional?.tintaGeneral?.costoLbPantone, next.pantoneInkCostPerLb) || 0;
    next.inkProfiles = profiles;
    next.inlineFinishes = deepClone(next.inlineFinishes) || {};
    next.inlineFinishes.barniz = {
        ...(deepClone(next.inlineFinishes.barniz) || {}),
        active: Boolean(inlineVarnishActiveInput?.checked),
        coveragePct: parseConfigNumber(inlineVarnishCoveragePctInput?.value, barnizProfile?.coveragePct) || 0,
        layerGsm: parseConfigNumber(inlineVarnishGsmInput?.value, barnizProfile?.gsm) || 0
    };
    return next;
}

function buildMergedUiState() {
    const captured = captureUiState();
    const existing = deepClone(currentCalculation?.uiState) || {};
    const existingPrint = deepClone(existing.print || existing.printStages?.[0]) || {};
    const printState = buildPrintStateFromInputs(existingPrint);
    const next = {
        ...existing,
        ...captured,
        print: printState
    };
    const otherStages = Array.isArray(existing.printStages) ? existing.printStages.slice(1) : [];
    next.printStages = [deepClone(printState), ...otherStages];
    next.header = {
        ...(deepClone(existing.header) || {}),
        jobName: currentCalculation?.jobName || getSelectedProduct()?.jobName || '',
        lineCode: currentCalculation?.lineCode || params.get('lineId') || '',
        quoteCode: currentCalculation?.quoteCode || params.get('quoteId') || '',
        quantity: parseConfigNumber(quantityInput?.value, currentCalculation?.quantityProducts) || 0,
        processType: getEffectiveProcessType(),
        labelsPerRoll: parseConfigNumber(labelsPerRollInput?.value, currentCalculation?.labelsPerRoll) || 0,
        quantityTypes: parseConfigNumber(quantityTypesInput?.value, currentCalculation?.quantityTypes) || 0,
        quantityChanges: parseConfigNumber(existing.header?.quantityChanges, currentCalculation?.quantityChanges) || 0,
        outputType: outputTypeInput?.value || '',
        applicationType: applicationTypeInput?.value || '',
        useCmyk: Boolean(cmykInput?.checked),
        coreDiameter: coreDiameterInput?.value || '',
        customerCode: currentCalculation?.customerCode || '',
        customerName: currentCalculation?.customerName || '',
        salespersonName: currentCalculation?.salespersonName || '',
        labelWidthIn: parseConfigNumber(widthInput?.value, currentCalculation?.widthInches) || 0,
        labelHeightIn: parseConfigNumber(lengthInput?.value, currentCalculation?.lengthInches) || 0,
        rollWidthIn: parseConfigNumber(coreWidthInput?.value, existing.header?.rollWidthIn) || parseConfigNumber(coreWidthInput?.value, 0) || 0,
        useWhiteInk: Boolean(existing.header?.useWhiteInk),
        pantoneCount: parseConfigNumber(existing.header?.pantoneCount, currentCalculation?.pantoneCount) || 0,
        applicationEnvironment: environmentInput?.value || ''
    };
    return next;
}

function getQuoteDefaultSettings() {
    const general = loadedConfig?.general || {};
    return {
        rollWidth: parseConfigNumber(general.defaultRollWidth, 13),
        coreDiameter: parseConfigNumber(general.defaultCoreDiameter, 3),
        quantityTypes: Math.max(1, parseConfigNumber(general.defaultQuantityTypes, 1) || 1),
        cmyk: String(general.defaultCmykEnabled ?? 'true').trim().toLowerCase() !== 'false'
    };
}

function setFieldAlert(input, invalid, message) {
    const label = input?.closest('label');
    if (!label) return;
    label.classList.toggle('flexo-field-alert', Boolean(invalid));
    if (invalid && message) {
        label.setAttribute('title', message);
    } else {
        label.removeAttribute('title');
    }
}

function updateTechnicalIndicators() {
    const labelsPerRoll = parseConfigNumber(labelsPerRollInput?.value, 0) || 0;
    const coreWidth = parseConfigNumber(coreWidthInput?.value, 0) || 0;
    const coreDiameter = parseConfigNumber(coreDiameterInput?.value, 0);
    const quantityTypes = parseConfigNumber(quantityTypesInput?.value, 0) || 0;
    const applicationType = normalizeCalcText(applicationTypeInput?.value);

    setFieldAlert(labelsPerRollInput, labelsPerRoll <= 0, 'Debes indicar etiquetas por rollo.');
    setFieldAlert(applicationTypeInput, !applicationType, 'Debes indicar el tipo de etiquetado.');
    setFieldAlert(coreWidthInput, coreWidth <= 0, 'Debes indicar un ancho de core válido.');
    setFieldAlert(coreDiameterInput, !coreDiameter || coreDiameter <= 0 || coreDiameter > 10, !coreDiameter || coreDiameter <= 0 ? 'Debes indicar un diámetro de core válido.' : 'El diámetro de core no puede ser mayor a 10.');
    setFieldAlert(quantityTypesInput, quantityTypes <= 0, 'La cantidad de tipos debe ser al menos 1.');
}

function captureUiState() {
    return {
        quantities: quantityValues.map((value) => normalizeQuantityValue(value)).filter(Boolean),
        coreWidth: coreWidthInput?.value || '',
        coreDiameter: coreDiameterInput?.value || '',
        quantityTypes: quantityTypesInput?.value || '',
        cmyk: Boolean(cmykInput?.checked),
        applicationMode: applicationModeInput?.value || '',
        environment: environmentInput?.value || '',
        surfaceType: surfaceTypeInput?.value || ''
    };
}

function applyUiState(uiState = {}) {
    ensureQuantityValues(uiState.quantities || [quantityInput?.value || '']);
    if (coreWidthInput) coreWidthInput.value = uiState.coreWidth || '';
    if (coreDiameterInput) coreDiameterInput.value = uiState.coreDiameter || '';
    if (quantityTypesInput) quantityTypesInput.value = uiState.quantityTypes || '';
    if (cmykInput) cmykInput.checked = Boolean(uiState.cmyk);
    if (applicationModeInput) applicationModeInput.value = uiState.applicationMode || '';
    if (environmentInput) environmentInput.value = uiState.environment || '';
    if (surfaceTypeInput) surfaceTypeInput.value = uiState.surfaceType || '';
    renderQuantityEditor();
    syncOutputPreview();
    updateTechnicalIndicators();
}

function preferCompanySetting(presentationValue, generalValue, defaultValue) {
    if (generalValue === undefined || generalValue === null || generalValue === '') {
        return presentationValue ?? defaultValue;
    }
    if (presentationValue === undefined || presentationValue === null || presentationValue === '' || presentationValue === defaultValue) {
        return generalValue;
    }
    return presentationValue;
}

function hasCustomizedPresentation(presentation = {}) {
    const defaults = {
        brandWidth: 116,
        brandFontFamily: 'Georgia, Times New Roman, serif',
        brandFontSize: 22,
        titleFontSize: 16,
        titleMarginLeft: 30,
        logoPosition: 'left',
        headerBgStart: '',
        headerBgEnd: '',
        headerBorderColor: '',
        footerBorderColor: '',
        fieldHeight: 18,
        fieldFontSize: 12,
        labelAlign: '',
        mediumInputWidth: 0,
        largeInputWidth: 0,
        footerMarginTop: 0,
        footerMarginBottom: 0
    };

    return Object.entries(defaults).some(([key, defaultValue]) => {
        const value = presentation[key];
        return value !== undefined && value !== null && value !== defaultValue;
    });
}

function preferCompanyMarginSetting(presentationValue, generalValue, defaultValue, presentation) {
    if (generalValue === undefined || generalValue === null || generalValue === '') {
        return presentationValue ?? defaultValue;
    }
    if (presentationValue === undefined || presentationValue === null || presentationValue === '') {
        return generalValue;
    }
    if (presentationValue === defaultValue) {
        return hasCustomizedPresentation(presentation) ? presentationValue : generalValue;
    }
    return presentationValue;
}

function getPresentationConfig(config, key) {
    const fallbackTitles = {
        cotizaciones: 'Cotizaciones',
        solicitudes: 'Solicitudes',
        calculos: 'Cálculos',
        socios: 'Socios',
        'inventario-mp': 'Inventario Materia Prima',
        'inventario-troqueles': 'Inventario Troqueles',
        'inventario-maquinaria': 'Inventario Maquinaria'
    };
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const layout = config.layout || {};

    return {
        moduleTitle: firstFilled(presentation.moduleTitle, fallbackTitles[key], general.moduleTitle),
        brandWidth: preferCompanySetting(presentation.brandWidth, general.brandWidth, 116),
        brandFontFamily: preferCompanySetting(presentation.brandFontFamily, general.brandFontFamily, 'Georgia, Times New Roman, serif'),
        brandFontSize: preferCompanySetting(presentation.brandFontSize, general.brandFontSize, 22),
        brandColor: preferCompanySetting(presentation.brandColor, general.brandColor, '#ffffff'),
        brandVerticalAlign: preferCompanySetting(presentation.brandVerticalAlign, general.brandVerticalAlign, 'center'),
        brandHorizontalAlign: preferCompanySetting(presentation.brandHorizontalAlign, general.brandHorizontalAlign, 'left'),
        brandMarginTop: presentation.brandMarginTop ?? 0,
        brandMarginRight: presentation.brandMarginRight ?? 0,
        brandMarginBottom: presentation.brandMarginBottom ?? 0,
        brandMarginLeft: presentation.brandMarginLeft ?? 0,
        titleMarginLeft: presentation.titleMarginLeft ?? 30,
        titleFontFamily: preferCompanySetting(presentation.titleFontFamily, general.titleFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'),
        titleFontSize: presentation.titleFontSize ?? general.titleFontSize ?? 16,
        titleColor: presentation.titleColor || general.titleColor || '#ffffff',
        titleVerticalAlign: preferCompanySetting(presentation.titleVerticalAlign, general.titleVerticalAlign, 'center'),
        titleHorizontalAlign: preferCompanySetting(presentation.titleHorizontalAlign, general.titleHorizontalAlign, 'left'),
        titleWidth: preferCompanySetting(presentation.titleWidth, general.titleWidth, 0),
        brandLogoUrl: firstFilled(presentation.brandLogoUrl, config.branding?.logoUrl),
        logoPosition: preferCompanySetting(presentation.logoPosition, general.brandLogoPosition, 'left'),
        headerBgStart: firstFilled(presentation.headerBgStart, general.headerBgStart, layout.headerBgStart, '#0b81b8'),
        headerBgEnd: firstFilled(presentation.headerBgEnd, general.headerBgEnd, layout.headerBgEnd, '#17abdf'),
        headerBorderColor: firstFilled(presentation.headerBorderColor, general.headerBorderColor, '#11a3dd'),
        footerFontFamily: preferCompanySetting(presentation.footerFontFamily, general.footerFontFamily, 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'),
        footerFontSize: preferCompanySetting(presentation.footerFontSize, general.footerFontSize, 12),
        footerColor: preferCompanySetting(presentation.footerColor, general.footerColor, '#2f3740'),
        footerBorderColor: firstFilled(presentation.footerBorderColor, general.footerBorderColor, '#11a3dd'),
        footerMarginTop: preferCompanyMarginSetting(presentation.footerMarginTop, general.footerMarginTop, 0, presentation),
        footerMarginBottom: preferCompanyMarginSetting(presentation.footerMarginBottom, general.footerMarginBottom, 0, presentation),
        fieldFontFamily: presentation.fieldFontFamily || general.fieldFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        iconSize: preferCompanySetting(presentation.iconSize, layout.iconSize ?? general.iconSize, 20),
        pageMarginTop: preferCompanySetting(presentation.pageMarginTop, layout.pageMarginTop ?? general.pageMarginTop, 14),
        pageMarginRight: preferCompanySetting(presentation.pageMarginRight, layout.pageMarginRight ?? general.pageMarginRight, 16),
        pageMarginBottom: preferCompanySetting(presentation.pageMarginBottom, layout.pageMarginBottom ?? general.pageMarginBottom, 8),
        pageMarginLeft: preferCompanySetting(presentation.pageMarginLeft, layout.pageMarginLeft ?? general.pageMarginLeft, 16)
    };
}

function applyHeaderConfig(config) {
    const presentation = getPresentationConfig(config, PRESENTATION_KEY);
    if (calcTitle) {
        calcTitle.textContent = 'C\u00e1lculo de Flexograf\u00eda';
        calcTitle.style.alignSelf = presentation.titleVerticalAlign || 'center';
    }
    const root = document.documentElement;
    const c1 = presentation.headerBgStart || config.layout?.headerBgStart || '#0b81b8';
    const c2 = presentation.headerBgEnd || config.layout?.headerBgEnd || '#17abdf';
    root.style.setProperty('--app-font-family', config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
    root.style.setProperty('--config-icon-size', `${presentation.iconSize}px`);
    root.style.setProperty('--icon-color', config.general?.iconColor || '#9ba2ab');
    root.style.setProperty('--page-margin-top', `${presentation.pageMarginTop}px`);
    root.style.setProperty('--page-margin-right', `${presentation.pageMarginRight}px`);
    root.style.setProperty('--page-margin-bottom', `${presentation.pageMarginBottom}px`);
    root.style.setProperty('--page-margin-left', `${presentation.pageMarginLeft}px`);
    root.style.setProperty('--logo-width', `${config.layout?.logoWidth || 60}px`);
    root.style.setProperty('--field-font-family', presentation.fieldFontFamily);
    root.style.setProperty('--title-margin-left', `${presentation.titleMarginLeft ?? 30}px`);
    root.style.setProperty('--module-title-font-family', presentation.titleFontFamily);
    root.style.setProperty('--module-title-font-size', `${presentation.titleFontSize}px`);
    root.style.setProperty('--module-title-color', presentation.titleColor || '#ffffff');
    root.style.setProperty('--module-title-horizontal-align', getFlexAlign(presentation.titleHorizontalAlign, 'flex-start'));
    root.style.setProperty('--module-title-text-align', getTextAlign(presentation.titleHorizontalAlign, 'left'));
    root.style.setProperty('--module-title-width', presentation.titleWidth ? `${presentation.titleWidth}px` : 'auto');
    
    root.style.setProperty('--footer-border-color', presentation.footerBorderColor || presentation.headerBorderColor || c1);
    root.style.setProperty('--footer-font-family', presentation.footerFontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
    root.style.setProperty('--footer-font-size', `${presentation.footerFontSize || 12}px`);
    root.style.setProperty('--footer-color', presentation.footerColor || '#2f3740');
    root.style.setProperty('--footer-margin-top', `${presentation.footerMarginTop ?? 0}px`);
    root.style.setProperty('--footer-margin-bottom', `${presentation.footerMarginBottom ?? 0}px`);

    setHeaderIcon(calcSearchButton, config.icons?.topSearch || '\u2315', 'Buscar');
    setHeaderIcon(calcMenuToggle, config.icons?.topMenu || '\u2261', 'Menú');
    if (calcSearchButton) {
        const size = Number(config.general?.iconSizeTopSearch) || presentation.iconSize || 20;
        calcSearchButton.style.color = config.general?.iconColorTopSearch || config.general?.iconColor || '#9ba2ab';
        calcSearchButton.style.width = `${size}px`;
        calcSearchButton.style.height = `${size}px`;
    }
    if (calcMenuToggle) {
        const size = Number(config.general?.iconSizeTopMenu) || presentation.iconSize || 20;
        calcMenuToggle.style.color = config.general?.iconColorTopMenu || config.general?.iconColor || '#9ba2ab';
        calcMenuToggle.style.width = `${size}px`;
        calcMenuToggle.style.height = `${size}px`;
    }
}

async function loadConfig() {
    const response = await fetch('/api/config/general');
    if (!response.ok) throw new Error('No fue posible cargar la configuración.');
    loadedConfig = await response.json();
    applyHeaderConfig(loadedConfig);
}

async function loadCostsConfig() {
    const response = await fetch(COSTS_CONFIG_ENDPOINT);
    if (!response.ok) throw new Error('No fue posible cargar la configuración de costos.');
    loadedCostsConfig = await response.json();
}

function money(value) {
    if (value === '' || value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) return '';
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value));
}

function number(value, maximumFractionDigits = 2) {
    if (value === '' || value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) return '';
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits }).format(Number(value));
}

function percent(value) {
    if (value === '' || value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) return '';
    return `${number(Number(value) * 100)}%`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function multiline(text) {
    return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

function renderKeyValue(container, rows) {
    if (!container) return;
    container.innerHTML = rows.map(([label, value]) => `
        <div class="preview-row">
            <span>${label}</span>
            <strong>${value ?? ''}</strong>
        </div>
    `).join('');
}

function buildOptions(selectElement, items, formatter, selectedValue = '') {
    selectElement.innerHTML = ['<option value="">Seleccionar...</option>']
        .concat(items.map((item) => `<option value="${item.id}" ${String(item.id) === String(selectedValue) ? 'selected' : ''}>${formatter(item)}</option>`))
        .join('');
}

function ensureSelectValue(selectElement, value, label) {
    if (!value) return;
    const existing = Array.from(selectElement.options).find((option) => option.value === String(value));
    if (!existing) {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = label || String(value);
        selectElement.appendChild(option);
    }
    selectElement.value = String(value);
}

function textBlock(title, body) {
    if (!body) return '';
    return `
        <div class="preview-block">
            <h3>${title}</h3>
            <div class="stage-card">
                <span>${multiline(body)}</span>
            </div>
        </div>
    `;
}

function renderProcessPanels(processes = [], title = 'Ruta de procesos') {
    if (!processPanels) return;
    const items = Array.isArray(processes) ? processes.filter(Boolean) : [];
    if (!items.length) {
        processPanels.innerHTML = textBlock('Ruta de procesos', 'No hay procesos estructurados para esta línea todavía.');
        return;
    }
    processPanels.innerHTML = `
        <div class="preview-block">
            <h3>${escapeHtml(title)}</h3>
            <div class="stage-card">
                ${items.map((process, index) => `
                    <div class="preview-row">
                        <span>Paso ${escapeHtml(String(process.sequenceOrder || index + 1))}</span>
                        <strong>${escapeHtml(process.processName || process.name || process.processKey || 'Proceso')}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadCatalogs() {
    const response = await fetch('/api/flexo/catalogos');
    if (!response.ok) throw new Error('No fue posible cargar los catálogos de flexografía.');

    catalogs = await response.json();

    buildOptions(productSelect, catalogs.products || [], (item) => `${item.jobName || item.code || item.id} | ${item.lineId || item.code || item.id}`, params.get('productId') || '');
    buildOptions(materialSelect, (catalogs.materials || []).filter((item) => item.active !== false), (item) => `${item.displayName || item.name || item.id}`);
    buildOptions(dieSelect, (catalogs.dies || []).filter((item) => item.active !== false), (item) => `${item.id} | ${item.description || ''}`);
    buildOptions(machineSelect, (catalogs.machines || []).filter((item) => item.active !== false), (item) => `${item.machineName || item.name} | ${item.process || ''}`);
    syncMachineRules();
}

function getSelectedProduct() {
    return catalogs?.products?.find((item) => item.id === productSelect.value) || null;
}

function getSelectedMachine() {
    const selectedValue = String(machineSelect?.value || '');
    return catalogs?.machines?.find((item) =>
        String(item.id) === selectedValue
        || String(item.machineName || item.name || '').trim() === selectedValue
    ) || null;
}

function isDigitalMachine(machine) {
    const haystack = `${machine?.subprocess || ''} ${machine?.process || ''} ${machine?.type || ''} ${machine?.machineName || ''}`;
    const normalized = String(haystack).toLowerCase();
    return normalized.includes('digit') || normalized.includes('hp');
}

function getEffectiveProcessType() {
    return isDigitalMachine(getSelectedMachine()) ? 'Digital' : (processSelect?.value || 'Convencional');
}

function syncMachineRules() {
    const machine = getSelectedMachine();
    const digital = isDigitalMachine(machine);
    if (digital && processSelect) {
        processSelect.value = 'Digital';
    }
    if (calcStatus && machine) {
        calcStatus.textContent = digital
            ? `Máquina digital seleccionada: ${machine.machineName}. El costo de planchas se desactiva por el proceso de impresión seleccionado, pero preprensa sí se mantiene.`
            : `Máquina seleccionada: ${machine.machineName}.`;
    }
    return { machine, digital };
}

function syncProductData() {
    if (currentCalculation) return;

    const product = getSelectedProduct();
    if (!product) return;

    ensureQuantityValues([product.quantityProducts || '']);
    widthInput.value = product.width || '';
    lengthInput.value = product.length || '';
    stationCountInput.value = product.tintCount || '';
    labelsPerRollInput.value = product.labelsPerRoll || '';
    applicationTypeInput.value = product.applicationType || '';
    outputTypeInput.value = product.outputType || '';
    const defaults = getQuoteDefaultSettings();
    if (coreWidthInput && !normalizeCalcText(coreWidthInput.value)) coreWidthInput.value = defaults.rollWidth || '';
    if (coreDiameterInput && !normalizeCalcText(coreDiameterInput.value)) coreDiameterInput.value = defaults.coreDiameter || '';
    if (quantityTypesInput && !normalizeCalcText(quantityTypesInput.value)) quantityTypesInput.value = defaults.quantityTypes || 1;
    if (cmykInput) cmykInput.checked = defaults.cmyk;
    updateHeaderMeta(product.clientName || '', product.salespersonName || '');
    syncOutputPreview();
    updateTechnicalIndicators();
    renderInkProfileEditor();

    renderKeyValue(summaryGrid, [
        ['Cotización', params.get('quoteId') || product.quoteId || ''],
        ['Línea', params.get('lineId') || product.lineId || ''],
        ['Cliente', product.clientName || ''],
        ['Producto', product.jobName || ''],
        ['Código', product.code || product.id || ''],
        ['Máquina', product.quotedMachine || '']
    ]);
}

function renderCalculation(data) {
    currentCalculation = data.calculo || null;
    currentQuote = data.cotizacion || null;
    relatedLines = data.lineasRelacionadas || [];

    if (!currentCalculation) {
        throw new Error('La respuesta del cálculo vino vacía.');
    }

    ensureSelectValue(productSelect, currentCalculation.lineCode || currentCalculation.calculationCode || currentCalculation.quoteCode, `${currentCalculation.jobName || currentCalculation.lineCode} | ${currentCalculation.lineCode || currentCalculation.quoteCode}`);
    ensureSelectValue(materialSelect, currentCalculation.materialCode || currentCalculation.materialName, `${currentCalculation.materialName || currentCalculation.materialCode} | ${currentCalculation.materialCode || ''}`);
    ensureSelectValue(dieSelect, currentCalculation.dieCode, `${currentCalculation.dieCode || ''} | ${currentCalculation.jobName || ''}`);
    ensureSelectValue(machineSelect, currentCalculation.quotedMachine, `${currentCalculation.quotedMachine || ''}`);

    processSelect.value = String(currentCalculation.processType || '').toLowerCase().includes('digit') ? 'Digital' : 'Convencional';
    syncMachineRules();
    if (orderTypeSelect && currentCalculation.orderType) {
        orderTypeSelect.value = currentCalculation.orderType;
    }
    ensureQuantityValues(currentCalculation.uiState?.quantities || [currentCalculation.quantityProducts || '']);
    widthInput.value = currentCalculation.widthInches || '';
    lengthInput.value = currentCalculation.lengthInches || '';
    stationCountInput.value = currentCalculation.tintCount || '';
    labelsPerRollInput.value = currentCalculation.labelsPerRoll || '';
    applicationTypeInput.value = currentCalculation.applicationType || '';
    outputTypeInput.value = currentCalculation.outputType || '';
    applyUiState({
        ...(currentCalculation.uiState || {}),
        coreWidth: currentCalculation.uiState?.coreWidth || currentCalculation.coreWidth || '',
        coreDiameter: currentCalculation.uiState?.coreDiameter || currentCalculation.coreDiameter || '',
        quantityTypes: currentCalculation.uiState?.quantityTypes || currentCalculation.quantityTypes || '',
        cmyk: currentCalculation.uiState?.cmyk ?? currentCalculation.cmyk ?? getQuoteDefaultSettings().cmyk
    });
    renderInkProfileEditor();
    updateHeaderMeta(currentCalculation.customerName || '', currentCalculation.salespersonName || '');

    if (currentQuote?.quote_code) {
        backToQuoteLink.href = `/?codigo=${encodeURIComponent(currentQuote.quote_code)}`;
    }

    renderKeyValue(summaryGrid, [
        ['Cotización', currentCalculation.quoteCode],
        ['Línea', currentCalculation.lineCode],
        ['Cliente', currentCalculation.customerName],
        ['Vendedor', currentCalculation.salespersonName],
        ['Trabajo', currentCalculation.jobName],
        ['Proceso', currentCalculation.processType],
        ['Tipo cálculo', currentCalculation.calculationType],
        ['Estado', currentCalculation.lineStatus]
    ]);

    renderKeyValue(globalCostSettings, [
        ['Tipo de cambio', number(currentCalculation.exchangeRate, 4)],
        ['Costo mínimo', money(currentCalculation.minimumCost)],
        ['Imprevistos', percent(currentCalculation.contingencyPercent)],
        ['Financieros', percent(currentCalculation.financialPercent)],
        ['Adicional', percent(currentCalculation.extraPercent)],
        ['IVA', percent(currentCalculation.taxPercent)]
    ]);

    machineCategoryGrid.innerHTML = [
        {
            title: 'Material',
            lines: [
                `Código: ${currentCalculation.materialCode || ''}`,
                `Nombre: ${currentCalculation.materialName || ''}`,
                `Ancho: ${number(currentCalculation.materialWidth)} in`,
                `MSI: ${number(currentCalculation.materialMsi)}`,
                `Pies: ${number(currentCalculation.materialFeet)}`
            ]
        },
        {
            title: 'Troquel',
            lines: [
                `Código: ${currentCalculation.dieCode || ''}`,
                `Dientes: ${number(currentCalculation.dieTeeth, 0)}`,
                `Filas: ${number(currentCalculation.dieRows, 0)}`,
                `Repeticiones: ${number(currentCalculation.dieRepeats, 0)}`
            ]
        },
        {
            title: 'Producción',
            lines: [
                `Cantidad: ${number(currentCalculation.quantityProducts, 0)}`,
                `Tintas: ${number(currentCalculation.tintCount, 0)}`,
                `Pantones: ${number(currentCalculation.pantoneCount, 0)}`,
                `Etiquetas por rollo: ${number(currentCalculation.labelsPerRoll, 0)}`,
                `Máquina: ${currentCalculation.quotedMachine || ''}`
            ]
        },
        {
            title: 'Acabado y salida',
            lines: [
                `Tipo etiquetado: ${currentCalculation.applicationType || ''}`,
                `Tipo salida: ${currentCalculation.outputType || ''}`,
                `Core: ${number(currentCalculation.coreWidth)} / ${currentCalculation.coreDiameter || ''}`,
                `Tipos: ${number(currentCalculation.quantityTypes, 0)}`,
                `Cambios: ${number(currentCalculation.quantityChanges, 0)}`
            ]
        }
    ].map((card) => `
        <article class="machine-card">
            <h3>${card.title}</h3>
            <div class="machine-meta">
                ${card.lines.map((line) => `<span>${line}</span>`).join('')}
            </div>
        </article>
    `).join('') + `
        <article class="machine-card">
            <h3>Líneas relacionadas</h3>
            <div class="machine-meta">
                ${(relatedLines.length ? relatedLines : [{ line_code: currentCalculation.lineCode, job_name: currentCalculation.jobName, status: currentCalculation.lineStatus }])
                    .map((line) => `<span>${line.line_code || ''} | ${line.job_name || ''} | ${line.status || ''}</span>`).join('')}
            </div>
        </article>
    `;

    renderKeyValue(previewMetrics, [
        ['Alto', `${number(currentCalculation.widthInches)} in`],
        ['Largo', `${number(currentCalculation.lengthInches)} in`],
        ['Área', `${number(currentCalculation.areaInches, 4)} in²`],
        ['Área m2', number(currentCalculation.areaM2, 6)],
        ['Material m2', number(currentCalculation.materialM2, 6)],
        ['Pies mácula', number(currentCalculation.materialFeetWaste)]
    ]);

    previewBreakdown.innerHTML = `
        <div class="preview-block">
            <h3>Subtotales</h3>
            <div class="preview-row"><span>Costo productivo</span><strong>${money(currentCalculation.subtotalCost)}</strong></div>
            <div class="preview-row"><span>Costos financieros</span><strong>${money(currentCalculation.subtotalFinancial)}</strong></div>
            <div class="preview-row"><span>Rendimiento / venta</span><strong>${money(currentCalculation.subtotalPerformance)}</strong></div>
            <div class="preview-row"><span>Costo cyrel</span><strong>${money(currentCalculation.cyrelCost)}</strong></div>
            <div class="preview-row"><span>Subtotal antes IVA</span><strong>${money(currentCalculation.subtotalBeforeTax)}</strong></div>
            <div class="preview-row"><span>Impuestos</span><strong>${money(currentCalculation.taxAmount)}</strong></div>
            <div class="preview-row"><span>Total final</span><strong>${money(currentCalculation.finalTotal)}</strong></div>
            <div class="preview-row"><span>Unitario</span><strong>${money(currentCalculation.unitPrice)}</strong></div>
            <div class="preview-row"><span>Precio millar</span><strong>${money(currentCalculation.thousandPrice)}</strong></div>
        </div>
        <div class="preview-block">
            <h3>Componentes</h3>
            <div class="preview-row"><span>Material</span><strong>${money(currentCalculation.components.material)}</strong></div>
            <div class="preview-row"><span>Tintas</span><strong>${money(currentCalculation.components.inks)}</strong></div>
            <div class="preview-row"><span>Impresión</span><strong>${money(currentCalculation.components.print)}</strong></div>
            <div class="preview-row"><span>Preprensa</span><strong>${money(currentCalculation.components.prepress)}</strong></div>
            <div class="preview-row"><span>Acabados</span><strong>${money(currentCalculation.components.finishes)}</strong></div>
            <div class="preview-row"><span>Empaque</span><strong>${money(currentCalculation.components.packaging)}</strong></div>
            <div class="preview-row"><span>Tiraje</span><strong>${money(currentCalculation.components.runCost)}</strong></div>
        </div>
        ${textBlock('Resumen cotización', currentCalculation.notes.quoteSummary)}
        ${textBlock('Información de impresión', currentCalculation.notes.printSummary)}
        ${textBlock('Estado de creación', currentCalculation.notes.creationStatus)}
    `;
    renderProcessPanels(currentCalculation.processes, 'Ruta de procesos de la línea');

    validationPanels.innerHTML = [
        ['Validación de solicitud', currentCalculation.validations.solicitud],
        ['Validación de finalización', currentCalculation.validations.finalizar],
        ['Validación para crear orden', currentCalculation.validations.crearOrden],
        ['Observaciones', currentCalculation.notes.observations]
    ].map(([title, body]) => textBlock(title, body)).join('');

    calcStatus.textContent = `Cálculo cargado para ${currentCalculation.quoteCode} / ${currentCalculation.lineCode}.`;
}

async function loadCurrentCalculation() {
    const quoteId = params.get('quoteId') || '';
    const lineId = params.get('lineId') || '';
    if (!quoteId && !lineId) return;

    const response = await fetch(`/api/flexo/calculo?${new URLSearchParams({ quoteId, lineId }).toString()}`);
    if (!response.ok) throw new Error('No fue posible cargar el cálculo real de flexografía.');
    renderCalculation(await response.json());
}

async function calculatePreview() {
    calcStatus.textContent = 'Calculando vista previa operativa...';
    const mergedUiState = buildMergedUiState();
    const payload = {
        productId: productSelect.value,
        materialId: materialSelect.value,
        dieId: dieSelect.value,
        quantityProducts: quantityInput.value,
        widthInches: widthInput.value,
        lengthInches: lengthInput.value,
        stationCount: stationCountInput.value,
        quantityTypes: quantityTypesInput?.value,
        processType: getEffectiveProcessType(),
        cmyk: Boolean(cmykInput?.checked),
        uiState: mergedUiState,
        machineSelections: {
            impresion: machineSelect.value
        }
    };

    try {
        const response = await fetch('/api/flexo/calcular-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('No fue posible calcular la vista previa.');
        const data = await response.json();
        previewMetrics.innerHTML += `
            <div class="preview-block">
                <h3>Vista previa genérica</h3>
                <div class="preview-row"><span>Etiquetas por pasada</span><strong>${number(data.metrics.labelsPerPass)}</strong></div>
                <div class="preview-row"><span>Pies lineales</span><strong>${number(data.metrics.linearFeet)}</strong></div>
                <div class="preview-row"><span>MSI</span><strong>${number(data.metrics.msi)}</strong></div>
            </div>
        `;
        previewBreakdown.innerHTML += `
            <div class="preview-block">
                <h3>Comparación rápida</h3>
                <div class="preview-row"><span>Material estimado</span><strong>${money(data.costBreakdown.material)}</strong></div>
                <div class="preview-row"><span>Subtotal operativo</span><strong>${money(data.costBreakdown.subtotalCost)}</strong></div>
                <div class="preview-row"><span>Total proyectado</span><strong>${money(data.costBreakdown.totalCost)}</strong></div>
                <div class="preview-row"><span>Precio unitario</span><strong>${money(data.costBreakdown.unitPrice)}</strong></div>
                ${data.selection?.digitalPlatesDisabled ? '<div class="preview-row"><span>Planchas</span><strong>Costo desactivado por el proceso de impresión seleccionado</strong></div>' : ''}
            </div>
        `;
        renderProcessPanels(data.processes, 'Ruta de procesos estimada');
        calcStatus.textContent = currentCalculation
            ? `Se agregó una vista previa para comparar contra el cálculo importado de ${currentCalculation.lineCode}.`
            : 'Vista previa generada con catálogos dinámicos.';
    } catch (error) {
        calcStatus.textContent = error.message;
    }
}

async function saveCalculation() {
    const quoteCode = params.get('quoteId') || currentCalculation?.quoteCode;
    const originalLineCode = params.get('lineId') || currentCalculation?.lineCode;
    if (!quoteCode || !originalLineCode) {
        calcStatus.textContent = 'No hay una línea activa para guardar.';
        return;
    }

    calcStatus.textContent = 'Guardando cálculo en la base de datos...';
    const mergedUiState = buildMergedUiState();

    const response = await fetch('/api/flexo/calculo/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteCode,
            originalLineCode,
            lineCode: currentCalculation?.lineCode || originalLineCode,
            customerCode: currentCalculation?.customerCode,
            customerName: currentCalculation?.customerName,
            salespersonName: currentCalculation?.salespersonName,
            department: currentCalculation?.department || 'Flexografia',
            jobName: currentCalculation?.jobName || getSelectedProduct()?.jobName || 'Nuevo cálculo',
            orderType: orderTypeSelect?.value || currentCalculation?.orderType || '',
            lineStatus: currentCalculation?.lineStatus || 'Borrador',
            processType: getEffectiveProcessType(),
            materialId: materialSelect.value,
            materialName: materialSelect.options[materialSelect.selectedIndex]?.text || '',
            dieId: dieSelect.value,
            machineName: machineSelect.options[machineSelect.selectedIndex]?.text?.split('|')[0]?.trim() || machineSelect.value,
            quantityProducts: quantityInput.value,
            widthInches: widthInput.value,
            lengthInches: lengthInput.value,
            stationCount: stationCountInput.value,
            quantityTypes: quantityTypesInput?.value,
            labelsPerRoll: labelsPerRollInput.value,
            cmyk: Boolean(cmykInput?.checked),
            applicationType: applicationTypeInput.value,
            outputType: outputTypeInput.value,
            uiState: mergedUiState,
            finalTotal: currentCalculation?.finalTotal,
            unitPrice: currentCalculation?.unitPrice
        })
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'No fue posible guardar el cálculo.');
    }

    const data = await response.json();
    currentCalculation = data.calculo || currentCalculation;
    renderInkProfileEditor();
    calcStatus.textContent = `Cálculo ${currentCalculation.lineCode} guardado correctamente.`;
}

productSelect.addEventListener('change', syncProductData);
machineSelect?.addEventListener('change', syncMachineRules);
processSelect?.addEventListener('change', syncMachineRules);
outputTypeInput?.addEventListener('input', syncOutputPreview);
[labelsPerRollInput, applicationTypeInput, coreWidthInput, coreDiameterInput, quantityTypesInput]
    .filter(Boolean)
    .forEach((input) => input.addEventListener('input', updateTechnicalIndicators));
cmykInput?.addEventListener('change', () => {
    updateTechnicalIndicators();
    if (!inkProfileTypeInput?.dataset.manualChange) {
        applySelectedInkProfile(inferInkProfileId(), false);
    }
});
inkProfileTypeInput?.addEventListener('change', () => {
    inkProfileTypeInput.dataset.manualChange = 'true';
    applySelectedInkProfile(inkProfileTypeInput.value, false);
});
[inkCoveragePctInput, inkAniloxBcmInput, inkGsmInput, inlineVarnishCoveragePctInput, inlineVarnishGsmInput]
    .filter(Boolean)
    .forEach((input) => input.addEventListener('input', () => {
        if (inkProfileTypeInput) inkProfileTypeInput.dataset.manualChange = 'true';
    }));
inlineVarnishActiveInput?.addEventListener('change', syncInlineVarnishState);
    quantityProductsList?.addEventListener('input', (event) => {
        const input = event.target.closest('[data-quantity-index]');
        if (!input) return;
        const index = Number(input.dataset.quantityIndex);
        if (!Number.isInteger(index) || index < 0) return;
        quantityValues[index] = normalizeQuantityValue(input.value);
        syncQuantityInput();
        input.value = formatQuantityDisplay(quantityValues[index]);
    });
quantityProductsList?.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-action="add-quantity"]');
    if (addButton) {
        quantityValues = [...quantityValues, ''];
        renderQuantityEditor();
        quantityProductsList?.querySelector(`[data-quantity-index="${quantityValues.length - 1}"]`)?.focus();
        return;
    }
    const removeButton = event.target.closest('[data-action="remove-quantity"]');
    if (!removeButton || quantityValues.length <= 1) return;
    quantityValues = quantityValues.slice(0, -1);
    renderQuantityEditor();
});
calcSearchButton?.addEventListener('click', () => {
    productSelect?.focus();
});
calcMenuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCalcMenu();
});
calculatePreviewButton?.addEventListener('click', calculatePreview);
saveCalculationButton.addEventListener('click', () => {
    saveCalculation().catch((error) => {
        calcStatus.textContent = error.message;
    });
});
document.addEventListener('click', (event) => {
    if (!calcMenuPanel?.hidden && !calcMenuPanel.contains(event.target) && !calcMenuToggle?.contains(event.target)) {
        toggleCalcMenu(false);
    }
});

async function init() {
    await loadConfig();
    await loadCostsConfig();
    await loadCatalogs();
    if (params.get('lineId') || params.get('quoteId')) {
        await loadCurrentCalculation();
    } else {
        const defaults = getQuoteDefaultSettings();
        applyUiState({
            quantities: [quantityInput?.value || ''],
            coreWidth: defaults.rollWidth,
            coreDiameter: defaults.coreDiameter,
            quantityTypes: defaults.quantityTypes,
            cmyk: defaults.cmyk
        });
        syncProductData();
        renderInkProfileEditor();
        calcStatus.textContent = 'No se recibió una línea específica. Puedes usar esta pantalla para revisar catálogos y generar una vista previa.';
    }
}

init().catch((error) => {
    calcStatus.textContent = error.message;
});



