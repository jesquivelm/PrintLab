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
const outputTypeInput = document.getElementById('outputType');
const summaryGrid = document.getElementById('summaryGrid');
const globalCostSettings = document.getElementById('globalCostSettings');
const machineCategoryGrid = document.getElementById('machineCategoryGrid');
const previewMetrics = document.getElementById('previewMetrics');
const previewBreakdown = document.getElementById('previewBreakdown');
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
const PRESENTATION_KEY = 'calculos';

let catalogs = null;
let currentCalculation = null;
let currentQuote = null;
let relatedLines = [];
let quantityValues = [''];

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

function captureUiState() {
    return {
        quantities: quantityValues.map((value) => normalizeQuantityValue(value)).filter(Boolean),
        coreWidth: coreWidthInput?.value || '',
        coreDiameter: coreDiameterInput?.value || '',
        applicationMode: applicationModeInput?.value || '',
        environment: environmentInput?.value || '',
        surfaceType: surfaceTypeInput?.value || ''
    };
}

function applyUiState(uiState = {}) {
    ensureQuantityValues(uiState.quantities || [quantityInput?.value || '']);
    if (coreWidthInput) coreWidthInput.value = uiState.coreWidth || '';
    if (coreDiameterInput) coreDiameterInput.value = uiState.coreDiameter || '';
    if (applicationModeInput) applicationModeInput.value = uiState.applicationMode || '';
    if (environmentInput) environmentInput.value = uiState.environment || '';
    if (surfaceTypeInput) surfaceTypeInput.value = uiState.surfaceType || '';
    renderQuantityEditor();
    syncOutputPreview();
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
    applyHeaderConfig(await response.json());
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
    updateHeaderMeta(product.clientName || '', product.salespersonName || '');
    syncOutputPreview();

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
        coreDiameter: currentCalculation.uiState?.coreDiameter || currentCalculation.coreDiameter || ''
    });
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
    const payload = {
        productId: productSelect.value,
        materialId: materialSelect.value,
        dieId: dieSelect.value,
        quantityProducts: quantityInput.value,
        widthInches: widthInput.value,
        lengthInches: lengthInput.value,
        stationCount: stationCountInput.value,
        processType: getEffectiveProcessType(),
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
            labelsPerRoll: labelsPerRollInput.value,
            applicationType: applicationTypeInput.value,
            outputType: outputTypeInput.value,
            uiState: captureUiState(),
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
    calcStatus.textContent = `Cálculo ${currentCalculation.lineCode} guardado correctamente.`;
}

productSelect.addEventListener('change', syncProductData);
machineSelect?.addEventListener('change', syncMachineRules);
processSelect?.addEventListener('change', syncMachineRules);
outputTypeInput?.addEventListener('input', syncOutputPreview);
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
    await loadCatalogs();
    if (params.get('lineId') || params.get('quoteId')) {
        await loadCurrentCalculation();
    } else {
        applyUiState({ quantities: [quantityInput?.value || ''] });
        syncProductData();
        calcStatus.textContent = 'No se recibió una línea específica. Puedes usar esta pantalla para revisar catálogos y generar una vista previa.';
    }
}

init().catch((error) => {
    calcStatus.textContent = error.message;
});



