const CONFIG_ENDPOINT = '/api/config/shell';
const QUOTES_ENDPOINT = '/api/cotizaciones';
const SMART_CATALOGS_ENDPOINT = '/api/cotizaciones-inteligentes/catalogos';
const PARTNERS_ENDPOINT = '/api/socios';
const SESSION_STORAGE_KEY = 'erp-user-session';
const QUOTE_TRACKING_STORAGE_KEY = 'erp-flexo-quote-tracking';
const LAUNCHER_POSITION_KEY = 'quote-request-launcher-position-v2';
const QUOTE_CONFIG_CACHE_KEY = 'erp-quotes-config-cache';
const QUOTE_CONFIG_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const QUOTE_CONFIG_CACHE_TEXT_LIMIT = 24000;
const DEFAULT_ICON_MAP = {
    processLauncher: { value: '/assets/icons/exclusive-launcher.png', color: '#1e516d', size: 48 },
    quoteRequestSubmit: { value: '\u27a4', color: '#ffffff', size: 18 },
    quoteRequestAdvanced: { value: '\u2699', color: '#5f7288', size: 18 },
    quoteRequestAttachment: { value: '\u25c9', color: '#1e516d', size: 18 },
    quoteRequestRecord: { value: '\u25cf', color: '#1e516d', size: 18 },
    quoteRequestRecordStop: { value: '\u25a0', color: '#ef4444', size: 18 },
    quoteRequestAttachmentDelete: { value: 'X', color: '#b94848', size: 18 },
    'quantity.add': { value: '+', color: '#738196', size: 20 },
    'quantity.delete': { value: '×', color: '#b94848', size: 18 },
    'icons.quantity.delete': { value: '×', color: '#a74343', size: 18 },
    // New keys for premium sync
    crearCotizacion: { value: '\u27a4', color: '#1e516d', size: 24 },
    procesoAvanzadoFlotante: { value: '\u2699', color: '#5f7288', size: 20 },
    proformaView: { value: '\ud83d\udc41', color: '#1e516d', size: 18 },
    proformaClose: { value: '\u2713', color: '#1e516d', size: 18 },
    quoteExpand: { value: '▸', color: '#607286', size: 18 },
    quoteCollapse: { value: '▾', color: '#607286', size: 18 },
    lineReorder: { value: '⋮⋮', color: '#607286', size: 18 },
    lineMenu: { value: '⋯', color: '#607286', size: 18 },
    lineEdit: { value: '✏️', color: '#0b81b8', size: 18 },
    lineProforma: { value: '\ud83d\udc41', color: '#1e516d', size: 16 },
    lineAdd: { value: '+', color: '#1e516d', size: 18 }
};
const DEFAULT_SURFACES = ['Botella', 'Caja', 'Carton', 'Envase', 'Frasco', 'Pouch', 'Tapa', 'Vidrio'];
const DEFAULT_PRODUCT_TYPES = ['Etiquetas', 'Cinta Continua', 'Empaque Flexible', 'Código de Barras', 'Números de Carrera'];

const rowsBody = document.getElementById('quotesTableBody');
const quotesTableWrap = document.querySelector('.quote-browser-table-wrap');
const quotesScrollBottomIndicator = document.getElementById('quotesScrollBottomIndicator');
const quotesSearchInput = document.getElementById('quotesSearchInput');
const nuevoCalculoButton = document.getElementById('nuevoCalculoButton');
const nuevaCotizacionButton = document.getElementById('nuevaCotizacionButton');
const refreshQuotesButton = document.getElementById('refreshQuotesButton');
const sapConnectorButton = document.getElementById('sapConnectorButton');
const popover = document.getElementById('nuevaCotizacionPopover');
const popoverPanel = popover?.querySelector('.quote-request-popover-panel');
const closeButton = document.getElementById('cerrarNuevaCotizacionButton');
const form = document.getElementById('nuevaCotizacionForm');
const statusNode = document.getElementById('nuevaCotizacionStatus');
const customerNameInput = document.getElementById('nuevoClienteNombre');
const customerCodeInput = document.getElementById('nuevoClienteCodigo');
const customerContactSelect = document.getElementById('nuevoClienteContacto');
const customerLookupPanel = document.getElementById('quoteCustomerLookupPanel');
const customerLookupResults = document.getElementById('quoteCustomerLookupResults');
const newCalcPopover = document.getElementById('nuevoCalculoPopover');
const newCalcForm = document.getElementById('nuevoCalculoForm');
const newCalcCloseButton = document.getElementById('cerrarNuevoCalculoButton');
const newCalcCancelButton = document.getElementById('cancelarNuevoCalculoButton');
const newCalcSubmitButton = document.getElementById('aceptarNuevoCalculoButton');
const newCalcCustomerNameInput = document.getElementById('nuevoCalculoClienteNombre');
const newCalcCustomerCodeInput = document.getElementById('nuevoCalculoClienteCodigo');
const newCalcContactSelect = document.getElementById('nuevoCalculoContacto');
const newCalcCustomerLookupPanel = document.getElementById('newCalcCustomerLookupPanel');
const newCalcCustomerLookupResults = document.getElementById('newCalcCustomerLookupResults');
const newCalcStatusNode = document.getElementById('nuevoCalculoStatus');
const requestProcessTypeInput = document.getElementById('requestProcessType');
const fixedSizeSelect = document.getElementById('requestFixedSize');
const fixedSizeTrigger = document.getElementById('requestFixedSizeTrigger');
const fixedSizePanel = document.getElementById('requestFixedSizePanel');
const customSizeFields = document.getElementById('requestCustomSizeFields');
const customWidthInput = document.getElementById('requestCustomWidth');
const customHeightInput = document.getElementById('requestCustomHeight');
const materialInput = document.getElementById('requestMaterial');
const materialSuggestions = document.getElementById('materialSuggestions');
const surfaceInput = document.getElementById('requestSurface');
const surfaceSuggestions = document.getElementById('surfaceSuggestions');
const requestProductTypeSelect = document.getElementById('requestProductType');
const requestProductTypeTrigger = document.getElementById('requestProductTypeTrigger');
const requestProductTypePanel = document.getElementById('requestProductTypePanel');
const requestQuantityRepeater = document.getElementById('requestQuantityRepeater');
const stampingWidthInput = document.getElementById('stampingWidth');
const routePreviewConfig = document.getElementById('requestRoutePreviewConfig');
const routePreviewList = document.getElementById('requestRoutePreviewList');
const wizardSections = Array.from(form?.querySelectorAll('.quote-request-section[data-step]') || []);
const wizardProgress = document.getElementById('quoteWizardProgress');
const wizardBackButton = document.getElementById('quoteWizardBackButton');
const wizardNextButton = document.getElementById('quoteWizardNextButton');
const wizardPrintButton = document.getElementById('quoteWizardPrintButton');
const wizardAdvancedButton = document.getElementById('quoteWizardAdvancedButton');
const requestSummaryGrid = document.getElementById('requestSummaryGrid');
const requestTechnicalNotes = document.getElementById('requestTechnicalNotes');
const requestSummaryRows = document.getElementById('requestSummaryRows');
const requestSummaryTotals = document.getElementById('requestSummaryTotals');
const requestSummarySubtotal = document.getElementById('requestSummarySubtotal');
const requestSummaryTax = document.getElementById('requestSummaryTax');
const requestSummaryGrandTotal = document.getElementById('requestSummaryGrandTotal');
const numberingPopoverTrigger = document.getElementById('numberingPopoverTrigger');
const numberingPopover = document.getElementById('numberingPopover');
const numberingPopoverClose = document.getElementById('numberingPopoverClose');
const numberingSummary = document.getElementById('numberingSummary');
const numberingRangeFields = document.getElementById('numberingRangeFields');
const numberingRangeStartInput = document.getElementById('numberingRangeStart');
const numberingRangeEndInput = document.getElementById('numberingRangeEnd');
const numberingDetailInput = document.getElementById('numberingDetail');
const numberingAttachmentInput = document.getElementById('numberingAttachmentInput');
const numberingAttachmentMeta = document.getElementById('numberingAttachmentMeta');
const numberingAttachmentRows = document.getElementById('numberingAttachmentRows');
const attachmentsInput = document.getElementById('requestAttachments');
const attachmentsPreview = document.getElementById('requestAttachmentsPreview');
const attachmentPreviewModal = document.getElementById('attachmentPreviewModal');
const attachmentPreviewTitle = document.getElementById('attachmentPreviewTitle');
const attachmentPreviewContent = document.getElementById('attachmentPreviewContent');
const attachmentPreviewClose = document.getElementById('attachmentPreviewClose');
const frontBackModal = document.getElementById('frontBackModal');
const frontBackCurrent = document.getElementById('frontBackCurrent');
const frontBackOptions = document.getElementById('frontBackOptions');
const frontBackWarning = document.getElementById('frontBackWarning');
const frontBackClose = document.getElementById('frontBackClose');
const frontBackCancel = document.getElementById('frontBackCancel');
const frontBackSave = document.getElementById('frontBackSave');
const frontBackUnlink = document.getElementById('frontBackUnlink');
const audioRecordButton = document.getElementById('audioRecordButton');
const audioRecordIndicator = document.getElementById('audioRecordIndicator');
const launcherWrap = document.getElementById('quoteRequestCreateButtonWrap');
const processLauncherStack = document.getElementById('processLauncherStack');
const processLauncherButton = document.getElementById('processLauncherButton');
const processLauncherBridge = document.getElementById('processLauncherBridge');
const createButton = document.getElementById('enviarSolicitudFabButton');
const advancedButton = document.getElementById('modoAvanzadoFabButton');
const shapePicker = document.getElementById('dieShapePicker');
const launcherErrors = document.getElementById('processLauncherErrors');
const launcherErrorsList = document.getElementById('processLauncherErrorsList');
const sapConfigPopover = document.getElementById('sapConfigPopover');
const cerrarSapConfigButton = document.getElementById('cerrarSapConfigButton');
const sapStatusRow = document.getElementById('sapStatusRow');
const sapStatusNote = document.getElementById('sapStatusNote');
const sapLocalCounts = document.getElementById('sapLocalCounts');
const sapConfigStatus = document.getElementById('sapConfigStatus');
const sapLogList = document.getElementById('sapLogList');
const sapSaveButton = document.getElementById('sapSaveButton');
const sapTestButton = document.getElementById('sapTestButton');
const sapSyncButton = document.getElementById('sapSyncButton');
const sapResetDemoButton = document.getElementById('sapResetDemoButton');
const sapModeSelect = document.getElementById('sapModeSelect');
const sapCompanyInput = document.getElementById('sapCompanyInput');
const sapHostInput = document.getElementById('sapHostInput');
const sapPortInput = document.getElementById('sapPortInput');
const sapProtocolSelect = document.getElementById('sapProtocolSelect');
const sapUserInput = document.getElementById('sapUserInput');
const sapPasswordInput = document.getElementById('sapPasswordInput');
const sapAutoSyncCheckbox = document.getElementById('sapAutoSyncCheckbox');
const sapAllowSelfSignedCheckbox = document.getElementById('sapAllowSelfSignedCheckbox');
const sapKeepDemoCheckbox = document.getElementById('sapKeepDemoCheckbox');
const sapSyncIntervalInput = document.getElementById('sapSyncIntervalInput');
const sapQueryEntity = document.getElementById('sapQueryEntity');
const sapQuerySource = document.getElementById('sapQuerySource');
const sapQueryFilterInput = document.getElementById('sapQueryFilterInput');
const sapQuerySearchInput = document.getElementById('sapQuerySearchInput');
const sapQueryTopInput = document.getElementById('sapQueryTopInput');
const sapRunQueryButton = document.getElementById('sapRunQueryButton');
const sapRefreshLogsButton = document.getElementById('sapRefreshLogsButton');
const sapWriteEntity = document.getElementById('sapWriteEntity');
const sapLoadTemplateButton = document.getElementById('sapLoadTemplateButton');
const sapSendPayloadButton = document.getElementById('sapSendPayloadButton');
const sapPayloadInput = document.getElementById('sapPayloadInput');
const sapQueryResult = document.getElementById('sapQueryResult');
const sapWriteResult = document.getElementById('sapWriteResult');
const disableQuoteRequestLauncherDrag = true;

let visibleQuotesCount = 0;
let smartCatalogMeta = {
    digitalThreshold: 100000,
    labelsPerRollDefault: 1000
};

function readUserSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function normalizePermissionLevel(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
            view: Boolean(value.view || value.create || value.edit),
            create: Boolean(value.create),
            edit: Boolean(value.edit)
        };
    }
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'none') return { view: false, create: false, edit: false };
    if (normalized === 'view') return { view: true, create: false, edit: false };
    if (normalized === 'create') return { view: true, create: true, edit: false };
    if (normalized === 'edit') return { view: true, create: false, edit: true };
    const parts = normalized.split(/[,\s|/+]+/).filter(Boolean);
    return {
        view: parts.includes('view') || parts.includes('create') || parts.includes('edit'),
        create: parts.includes('create'),
        edit: parts.includes('edit')
    };
}

function canCreateModule(moduleKey) {
    if (window.ErpAccess?.canCreateModule) return window.ErpAccess.canCreateModule(moduleKey);
    const session = readUserSession();
    const modules = session?.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules) return true;
    return normalizePermissionLevel(modules[moduleKey]).create;
}

function sessionHeader() {
    const session = readUserSession();
    if (!session) return {};
    return {
        'x-erp-session': JSON.stringify({
            id: session.id || session.userId || session.sessionId || '',
            userId: session.userId || session.id || '',
            username: session.username || session.user || '',
            user: session.user || session.username || '',
            name: session.name || session.fullName || session.user || session.username || '',
            fullName: session.fullName || session.name || '',
            permissionName: session.permissionName || '',
            modules: session.modules || {}
        })
    };
}

function currentUserName() {
    const session = readUserSession();
    return normalizeText(session?.name || session?.fullName || session?.user || session?.username || 'Vendedor');
}

function formatVisibleCountLabel(count, noun) {
    const total = Math.max(0, Number(count) || 0);
    return `${total} ${noun}${total === 1 ? '' : 'es'} mostradas`;
}

function updateQuotesScrollBottomIndicator() {
    if (!quotesTableWrap || !quotesScrollBottomIndicator) return;
    const hasScrollableContent = quotesTableWrap.scrollHeight - quotesTableWrap.clientHeight > 6;
    const distanceToBottom = quotesTableWrap.scrollHeight - quotesTableWrap.scrollTop - quotesTableWrap.clientHeight;
    const shouldShow = visibleQuotesCount > 0 && (!hasScrollableContent || distanceToBottom <= 8);
    quotesScrollBottomIndicator.textContent = formatVisibleCountLabel(visibleQuotesCount, 'cotización');
    quotesScrollBottomIndicator.classList.toggle('is-visible', shouldShow);
}

let loadedConfig = {};
let quoteCatalog = [];
let quoteSearchTimer = null;
let quoteTreeLineSequence = 100000;
const expandedQuoteCodes = new Set();
const expandedFrontBackGroupKeys = new Set();
const quoteLineCache = new Map();
const quoteLineLoading = new Set();
const quoteLineLookup = new Map();
const quoteLineActionLocks = new Set();
let selectedQuoteContextCode = '';
let selectedQuoteContextLineId = 0;
let frontBackModalRow = null;
let lineActionModal = null;
let lineActionState = { row: null, mode: '' };
let lineActionSearchTimer = null;
let partnerLookupAbort = null;
let requestContactAbort = null;
let newCalcPartnerLookupAbort = null;
let newCalcContactAbort = null;
let materialItems = [];
let surfaceItems = [...DEFAULT_SURFACES];
let pendingAttachments = [];
let mediaRecorder = null;
let recordingChunks = [];
let isRecording = false;
let dragState = null;
let activeAttachmentPreviewUrl = '';
let attachmentPreviewState = {
    kind: '',
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0
};
let sapConfigState = null;
let quoteRequestWizardState = {
    currentStep: 1,
    totalSteps: Math.max(1, wizardSections.length || 5),
    previewQuoteCode: '',
    previewFirstLineCode: '',
    previewFingerprint: '',
    previewProforma: null,
    previewDirty: false,
    keepPreviewQuote: false
};

function resolveConfiguredProductTypes() {
    const rawValue = loadedConfig?.general?.quoteProductTypesJson;
    let parsed = rawValue;
    if (typeof parsed === 'string') {
        const trimmed = parsed.trim();
        if (!trimmed) parsed = [];
        else {
            try {
                parsed = JSON.parse(trimmed);
            } catch (_) {
                parsed = trimmed.split(/[\n,;]+/);
            }
        }
    }
    const source = Array.isArray(parsed) ? parsed : [];
    const seen = new Set();
    const items = source
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') return String(item.name || item.label || item.value || '').trim();
            return '';
        })
        .filter((item) => {
            if (!item) return false;
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    return items.length ? items : [...DEFAULT_PRODUCT_TYPES];
}

function renderRequestProductTypeOptions() {
    if (!requestProductTypeSelect) return;
    const options = resolveConfiguredProductTypes();
    const currentValue = normalizeText(requestProductTypeSelect.value);
    requestProductTypeSelect.innerHTML = options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    requestProductTypeSelect.value = options.includes(currentValue) ? currentValue : (options[0] || '');
    renderRequestProductTypePanel(options);
    syncRequestProductTypeTrigger();
}

function syncRequestProductTypeTrigger() {
    const value = requestProductTypeSelect?.value || '';
    const textNode = requestProductTypeTrigger?.querySelector('[data-product-type-text]');
    if (textNode) textNode.textContent = value;
}

function renderRequestProductTypePanel(options = resolveConfiguredProductTypes()) {
    if (!requestProductTypePanel) return;
    const selected = requestProductTypeSelect?.value || '';
    requestProductTypePanel.innerHTML = options.map((item) => `
        <button type="button" class="quote-request-lookup-item${item === selected ? ' is-selected' : ''}" data-product-type-value="${escapeHtml(item)}" role="option" aria-selected="${item === selected ? 'true' : 'false'}">
            <span class="quote-request-lookup-name">${escapeHtml(item)}</span>
        </button>
    `).join('');
}

function positionRequestProductTypePanel() {
    if (!requestProductTypePanel || !requestProductTypeTrigger || requestProductTypePanel.hidden) return;
    if (requestProductTypePanel.parentElement !== document.body) {
        document.body.appendChild(requestProductTypePanel);
    }
    const rect = requestProductTypeTrigger.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(460, window.innerHeight - top - viewportGap));

    requestProductTypePanel.style.setProperty('--quote-product-type-left', `${left}px`);
    requestProductTypePanel.style.setProperty('--quote-product-type-top', `${top}px`);
    requestProductTypePanel.style.setProperty('--quote-product-type-width', `${width}px`);
    requestProductTypePanel.style.setProperty('--quote-product-type-max-height', `${maxHeight}px`);
}

function positionMaterialSuggestionsPanel() {
    if (!materialSuggestions || !materialInput || materialSuggestions.hidden) return;
    if (materialSuggestions.parentElement !== document.body) {
        document.body.appendChild(materialSuggestions);
    }
    const rect = materialInput.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(420, window.innerHeight - top - viewportGap));

    materialSuggestions.style.setProperty('--quote-material-panel-left', `${left}px`);
    materialSuggestions.style.setProperty('--quote-material-panel-top', `${top}px`);
    materialSuggestions.style.setProperty('--quote-material-panel-width', `${width}px`);
    materialSuggestions.style.setProperty('--quote-material-panel-max-height', `${maxHeight}px`);
}

function syncFixedSizeTrigger() {
    if (!fixedSizeSelect || !fixedSizeTrigger) return;
    const textNode = fixedSizeTrigger.querySelector('[data-fixed-size-text]');
    const selected = fixedSizeSelect.selectedOptions?.[0];
    if (textNode) textNode.textContent = selected?.textContent || 'Selecciona una medida';
    toggleCustomSizeFields();
}

function toggleCustomSizeFields() {
    if (!customSizeFields || !fixedSizeSelect) return;
    customSizeFields.hidden = fixedSizeSelect.value !== 'custom';
}

function renderFixedSizePanel() {
    if (!fixedSizePanel || !fixedSizeSelect) return;
    const selected = fixedSizeSelect.value || '';
    fixedSizePanel.innerHTML = Array.from(fixedSizeSelect.options).map((option) => `
        <button type="button" class="quote-request-lookup-item${option.value === selected ? ' is-selected' : ''}" data-fixed-size-value="${escapeHtml(option.value)}" role="option" aria-selected="${option.value === selected ? 'true' : 'false'}">
            <span class="quote-request-lookup-name">${escapeHtml(option.textContent || '')}</span>
        </button>
    `).join('');
}

function positionFixedSizePanel() {
    if (!fixedSizePanel || !fixedSizeTrigger || fixedSizePanel.hidden) return;
    if (fixedSizePanel.parentElement !== document.body) {
        document.body.appendChild(fixedSizePanel);
    }
    const rect = fixedSizeTrigger.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(420, window.innerHeight - top - viewportGap));

    fixedSizePanel.style.setProperty('--quote-fixed-size-left', `${left}px`);
    fixedSizePanel.style.setProperty('--quote-fixed-size-top', `${top}px`);
    fixedSizePanel.style.setProperty('--quote-fixed-size-width', `${width}px`);
    fixedSizePanel.style.setProperty('--quote-fixed-size-max-height', `${maxHeight}px`);
}

function toggleFixedSizePanel(forceOpen = null) {
    if (!fixedSizePanel || !fixedSizeTrigger) return;
    const shouldOpen = forceOpen === null ? fixedSizePanel.hidden : forceOpen;
    fixedSizePanel.hidden = !shouldOpen;
    fixedSizeTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
        renderFixedSizePanel();
        positionFixedSizePanel();
    }
}

function toggleRequestProductTypePanel(forceOpen = null) {
    if (!requestProductTypePanel || !requestProductTypeTrigger) return;
    const shouldOpen = forceOpen === null ? requestProductTypePanel.hidden : forceOpen;
    requestProductTypePanel.hidden = !shouldOpen;
    requestProductTypeTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
        renderRequestProductTypePanel();
        positionRequestProductTypePanel();
    }
}

function parseRequestedQuantityValue(rawValue) {
    const normalized = String(rawValue || '')
        .replace(/\s+/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(/,/g, '');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed);
}

function formatRequestedQuantityValue(value) {
    const parsed = parseRequestedQuantityValue(value);
    return parsed > 0 ? formatNumber(parsed) : '';
}

function readRequestedQuantities() {
    return Array.from(requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]') || [])
        .map((input) => parseRequestedQuantityValue(input.value))
        .filter((value) => value > 0)
        .slice(0, 6);
}

function readRequestQuantityItems() {
    const inputs = Array.from(requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]') || []);
    const items = inputs.map((input, index) => ({
        id: `qty-${index + 1}`,
        value: parseRequestedQuantityValue(input.value)
    })).slice(0, 6);
    return items.length ? items : [{ id: 'qty-1', value: 0 }];
}

function normalizeRequestQuantityItems(values = []) {
    const source = Array.isArray(values) ? values : [];
    const items = source.map((item, index) => ({
        id: item?.id || `qty-${index + 1}`,
        value: parseRequestedQuantityValue(typeof item === 'object' ? item.value : item)
    })).slice(0, 6);
    return items.length ? items : [{ id: 'qty-1', value: 0 }];
}

function getRequestQuantityCapacity() {
    const containerWidth = Math.max(0, requestQuantityRepeater?.clientWidth || 0);
    if (!containerWidth) return 1;
    const layout = { normalWidth: 150, lastWidth: 190, gap: 8 };
    let count = 1;
    while (count < 6) {
        const width = ((count - 1) * layout.normalWidth) + layout.lastWidth + ((count - 1) * layout.gap);
        if (width > containerWidth) return Math.max(1, count - 1);
        count += 1;
    }
    return 6;
}

function renderRequestQuantityRepeater(values = null) {
    if (!requestQuantityRepeater) return;
    const quantities = normalizeRequestQuantityItems(Array.isArray(values) ? values : readRequestQuantityItems());
    const capacity = getRequestQuantityCapacity();
    const addIcon = getResolvedIcon(['quantity.add', 'quantityAdd', 'icons.quantity.add'], 'quantity.add');
    const deleteIcon = getResolvedIcon(['quantity.delete', 'quantityDelete', 'icons.quantity.delete'], 'quantity.delete');
    requestQuantityRepeater.innerHTML = `<div class="quantity-row">${quantities.map((item, index) => {
        const isLast = index === quantities.length - 1;
        return `<div class="quantity-card${isLast ? ' is-last' : ''}">
            <div class="quantity-input-group">
                <input type="text" inputmode="numeric" autocomplete="off" data-request-quantity-index="${index}" aria-label="Cantidad ${index + 1}" placeholder="999 999" value="${item.value ? escapeHtml(formatNumber(item.value)) : ''}">
                ${isLast ? `<button type="button" class="quantity-inline-action quantity-inline-add qty-add-chip" data-action="add-quantity" aria-label="Agregar cantidad" title="Agregar cantidad" style="--quantity-add-icon-color:${escapeHtml(addIcon.color || '#738196')};--quantity-add-icon-hover:${escapeHtml(addIcon.hover || '#0b81b8')};--quantity-add-icon-size:${Number(addIcon.size) || 18}px;"${quantities.length >= capacity ? ' disabled' : ''}><span data-qty-icon="add"></span></button>` : ''}
            </div>
            ${isLast ? `<button type="button" class="quantity-trash-button" data-action="remove-quantity" aria-label="Eliminar ultima cantidad" title="Eliminar ultima cantidad" style="--delete-icon-color:${escapeHtml(deleteIcon.color || '#b6425f')};--delete-icon-hover:${escapeHtml(deleteIcon.hover || '#d03535')};--delete-icon-size:${Number(deleteIcon.size) || 18}px;"${quantities.length <= 1 ? ' disabled' : ''}><span data-qty-icon="delete">x</span></button>` : ''}
        </div>`;
    }).join('')}</div>`;
    const addTarget = requestQuantityRepeater.querySelector('[data-qty-icon="add"]');
    if (addTarget) renderIcon(addTarget, addIcon.value, addIcon.color || '#738196', addIcon.size || 18);
    const deleteTarget = requestQuantityRepeater.querySelector('[data-qty-icon="delete"]');
    if (deleteTarget) renderIcon(deleteTarget, deleteIcon.value, deleteIcon.color || '#b6425f', deleteIcon.size || 18);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function normalizeNumberingValue(value) {
    const raw = normalizeText(value);
    const plain = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (plain.includes('consecut')) return 'Numeracion Consecutiva';
    if (plain.includes('aleator')) return 'Numeracion Aleatoria';
    if (plain.includes('barra')) return 'Código de Barras';
    if (plain.includes('qr')) return 'Código QR';
    return raw;
}

function getSelectedNumberingValue() {
    return normalizeNumberingValue(form?.querySelector('input[name="numbering"]:checked')?.value || '');
}

function isConsecutiveNumbering(value = getSelectedNumberingValue()) {
    return normalizeNumberingValue(value) === 'Numeracion Consecutiva';
}

function getNumberingLabel(value = getSelectedNumberingValue()) {
    const normalized = normalizeNumberingValue(value);
    if (normalized === 'Numeracion Consecutiva') return 'Consecutiva';
    if (normalized === 'Numeracion Aleatoria') return 'Aleatoria';
    if (normalized === 'Código de Barras') return 'Código de Barras';
    if (normalized === 'Código QR') return 'Código QR';
    return normalized || 'Sin numeración';
}

function findPendingAttachmentIndex(predicate) {
    return pendingAttachments.findIndex((item) => {
        try {
            return predicate(item);
        } catch (error) {
            return false;
        }
    });
}

function removePendingAttachmentByIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= pendingAttachments.length) return null;
    const removed = pendingAttachments.splice(index, 1)[0];
    if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
    if (removed?.previewUrl && removed.previewUrl === activeAttachmentPreviewUrl) closeAttachmentPreview();
    return removed;
}

function buildNumberingSummaryText() {
    const numberingType = getSelectedNumberingValue();
    if (!numberingType) {
        return {
            title: 'Sin numeración',
            detail: ''
        };
    }
    const isConsecutive = isConsecutiveNumbering(numberingType);
    const from = isConsecutive ? normalizeText(numberingRangeStartInput?.value) : '';
    const to = isConsecutive ? normalizeText(numberingRangeEndInput?.value) : '';
    const detail = normalizeText(numberingDetailInput?.value);
    const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const fragments = [];
    if (from || to) fragments.push(`Rango ${from || '...'} a ${to || '...'}`);
    if (detail) fragments.push(detail);
    if (attachmentIndex >= 0) fragments.push(`Adjunto: ${pendingAttachments[attachmentIndex]?.fileName || 'Excel cargado'}`);
    return {
        title: getNumberingLabel(numberingType),
        detail: fragments.join(' · ')
    };
}

function renderNumberingAttachmentTable() {
    if (!numberingAttachmentRows) return;
    const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const attachment = attachmentIndex >= 0 ? pendingAttachments[attachmentIndex] : null;
    const addIcon = getResolvedIcon(['quoteRequestAttachment', 'attachment'], 'quoteRequestAttachment');
    const deleteIcon = getResolvedIcon(['quoteRequestAttachmentDelete', 'eliminar adjunto solicitud', 'loginRepositoryDelete'], 'quoteRequestAttachmentDelete');
    numberingAttachmentRows.innerHTML = `
        <div class="quote-request-numbering-attachment-row">
            <label class="quote-request-numbering-attachment-upload" for="numberingAttachmentInput" title="Adjuntar" aria-label="Adjuntar">
                <span data-numbering-attachment-icon="add"></span>
            </label>
            <span class="quote-request-numbering-attachment-name">${escapeHtml(attachment?.fileName || 'Sin adjunto')}</span>
            ${attachment ? '<button type="button" class="quote-request-numbering-attachment-delete" data-remove-numbering-attachment title="Eliminar" aria-label="Eliminar adjunto"><span data-numbering-attachment-icon="delete"></span></button>' : '<span></span>'}
        </div>`;
    const addTarget = numberingAttachmentRows.querySelector('[data-numbering-attachment-icon="add"]');
    const deleteTarget = numberingAttachmentRows.querySelector('[data-numbering-attachment-icon="delete"]');
    if (addTarget) renderIcon(addTarget, addIcon.value, addIcon.color || '#159fdb', addIcon.size || 18);
    if (deleteTarget) renderIcon(deleteTarget, deleteIcon.value, deleteIcon.color || '#5f7487', deleteIcon.size || 18);
}

function renderNumberingSummary() {
    const isConsecutive = isConsecutiveNumbering();
    if (numberingRangeFields) numberingRangeFields.hidden = !isConsecutive;
    if (!isConsecutive) {
        if (numberingRangeStartInput) numberingRangeStartInput.value = '';
        if (numberingRangeEndInput) numberingRangeEndInput.value = '';
    }
    const summary = buildNumberingSummaryText();
    if (numberingSummary) numberingSummary.innerHTML = `<strong>${escapeHtml(summary.title)}</strong><span>${escapeHtml(summary.detail)}</span>`;
    if (numberingAttachmentMeta) {
        const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
        numberingAttachmentMeta.textContent = attachmentIndex >= 0
            ? `Archivo cargado: ${pendingAttachments[attachmentIndex]?.fileName || 'Excel adjunto'}`
            : 'Puedes adjuntar un Excel o CSV con la secuencia.';
    }
    renderNumberingAttachmentTable();
    updateFinishCompactSummaries();
}

function getCheckedFinishValue(name, fallback = '') {
    return form?.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

function updateFinishCompactSummaries() {
    const summaries = {
        varnish: [getCheckedFinishValue('varnish', 'Sin Barniz'), document.getElementById('varnishSonified')?.checked ? 'Zonificado' : ''].filter(Boolean).join(' · '),
        stamping: [getCheckedFinishValue('stamping', 'Ninguno'), normalizeText(stampingWidthInput?.value) ? `${normalizeText(stampingWidthInput?.value)} mm` : ''].filter(Boolean).join(' · '),
        embossed: document.getElementById('finishEmbossed')?.checked ? 'Activo' : 'Sin embosado',
        diecut: document.getElementById('finishDieCut')?.checked ? 'Activo' : 'Sin troquelado',
        numbering: buildNumberingSummaryText().title
    };
    Object.entries(summaries).forEach(([key, value]) => {
        const node = document.querySelector(`[data-finish-key="${key}"] [data-finish-compact-summary]`);
        if (node) node.textContent = value;
    });
}

function initFinishCompactPanels() {
    document.querySelectorAll('[data-finish-key]').forEach((block) => {
        if (block.querySelector('[data-finish-compact-toggle]')) return;
        const title = normalizeText(block.querySelector('h4')?.textContent) || 'Acabado';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quote-request-finish-compact-head';
        button.dataset.finishCompactToggle = '';
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = `<span>${escapeHtml(title)}</span><span class="quote-request-finish-compact-summary" data-finish-compact-summary></span>`;
        block.querySelector('h4')?.after(button);
    });
    updateFinishCompactSummaries();
}

function closeNumberingPopover() {
    if (!numberingPopover || !numberingPopoverTrigger) return;
    numberingPopover.hidden = true;
    numberingPopoverTrigger.setAttribute('aria-expanded', 'false');
}

function openNumberingPopover() {
    if (!numberingPopover || !numberingPopoverTrigger) return;
    numberingPopover.hidden = false;
    numberingPopoverTrigger.setAttribute('aria-expanded', 'true');
    renderNumberingSummary();
}

function toggleNumberingPopover(forceOpen) {
    if (!numberingPopover) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : numberingPopover.hidden;
    if (willOpen) openNumberingPopover();
    else closeNumberingPopover();
}

function setStatus(message, tone = 'info') {
    if (!statusNode) return;
    statusNode.hidden = !message;
    statusNode.textContent = message || '';
    statusNode.dataset.tone = tone;
}

function setNewCalcStatus(message, tone = 'info') {
    if (!newCalcStatusNode) return;
    newCalcStatusNode.hidden = !message;
    newCalcStatusNode.textContent = message || '';
    newCalcStatusNode.dataset.tone = tone;
}

function setButtonBusy(button, busy, busyText = 'Procesando...') {
    if (!button) return;
    if (busy) {
        button.dataset.idleText = button.textContent || '';
        button.textContent = busyText;
        button.disabled = true;
        return;
    }
    button.disabled = false;
    if (button.dataset.idleText) {
        button.textContent = button.dataset.idleText;
        delete button.dataset.idleText;
    }
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible completar la solicitud.');
    }
    return payload;
}

function readQuoteConfigCache() {
    try {
        const raw = localStorage.getItem(QUOTE_CONFIG_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const storedAt = Number(parsed?.storedAt || 0);
        if (!storedAt || Date.now() - storedAt > QUOTE_CONFIG_CACHE_TTL_MS) return null;
        return parsed.data || null;
    } catch (error) {
        return null;
    }
}

function writeQuoteConfigCache(config) {
    try {
        localStorage.setItem(QUOTE_CONFIG_CACHE_KEY, JSON.stringify({
            storedAt: Date.now(),
            data: config
        }));
    } catch (error) {
        console.warn('No fue posible actualizar el caché local de cotizaciones.', error);
    }
}

function compactQuoteConfigForCache(value, key = '') {
    if (typeof value === 'string') {
        const text = value.trim();
        const keyText = String(key || '').toLowerCase();
        const assetLike = /(image|imagen|logo|icon|foto|photo|font|background|screensaver|repositorio|repository)/.test(keyText);
        if ((assetLike && text.length > QUOTE_CONFIG_CACHE_TEXT_LIMIT) || text.length > QUOTE_CONFIG_CACHE_TEXT_LIMIT * 4) {
            return '';
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => compactQuoteConfigForCache(item, key)).filter((item) => item !== '');
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .map(([childKey, childValue]) => [childKey, compactQuoteConfigForCache(childValue, childKey)])
                .filter(([, childValue]) => childValue !== '')
        );
    }
    return value;
}

function areQuoteConfigsEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function setSapConfigStatus(message, tone = 'info') {
    if (!sapConfigStatus) return;
    sapConfigStatus.textContent = message || 'Listo para configurar.';
    sapConfigStatus.dataset.tone = tone;
}

function setSapResult(node, payload) {
    if (!node) return;
    node.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

function escapeText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getSapPayloadTemplate(entity) {
    if (entity === 'invoices') {
        return {
            docEntry: 1041,
            baseLine: 0
        };
    }
    if (entity === 'inventory-exit') {
        return {
            date: new Date().toISOString().slice(0, 10),
            productionOrderId: 'OP-2041',
            comments: 'Consumo de materiales desde ERP',
            materials: [
                { itemCode: 'INS-030', quantity: 120, warehouse: '01' },
                { itemCode: 'INS-020', quantity: 2.5, warehouse: '01' }
            ]
        };
    }
    if (entity === 'inventory-entry') {
        return {
            date: new Date().toISOString().slice(0, 10),
            productionOrderId: 'OP-2041',
            comments: 'Ingreso de producto terminado desde ERP',
            lines: [
                { itemCode: 'TRQ-001', quantity: 2, warehouseCode: '01' }
            ]
        };
    }
    return {
        clientCode: 'C001',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
        notes: 'Generado desde Cotizaciones',
        lines: [
            { itemCode: 'TRQ-001', qty: 2, price: 89500, warehouse: '01' },
            { itemCode: 'SRV-001', qty: 4, price: 12000, warehouse: '01' }
        ]
    };
}

function populateSapConfigForm(config) {
    if (!config || !sapModeSelect || !sapCompanyInput || !sapHostInput || !sapPortInput || !sapProtocolSelect || !sapUserInput || !sapPasswordInput || !sapAutoSyncCheckbox || !sapAllowSelfSignedCheckbox || !sapKeepDemoCheckbox || !sapSyncIntervalInput) return;
    sapModeSelect.value = config.mode || 'demo';
    sapCompanyInput.value = config.sapCompany || '';
    sapHostInput.value = config.sapHost || '';
    sapPortInput.value = config.sapPort || 50000;
    sapProtocolSelect.value = config.sapProtocol || 'https';
    sapUserInput.value = config.sapUser || '';
    sapPasswordInput.value = '';
    sapPasswordInput.placeholder = config.hasPassword ? 'Se conserva la clave actual si lo dejas vacio' : 'Ingresa la clave SAP';
    sapAutoSyncCheckbox.checked = Boolean(config.autoSyncEnabled);
    sapAllowSelfSignedCheckbox.checked = Boolean(config.allowSelfSigned);
    sapKeepDemoCheckbox.checked = Boolean(config.keepDemoEnabled);
    sapSyncIntervalInput.value = config.syncIntervalMinutes || 30;
}

function renderSapStatus(statusPayload) {
    sapConfigState = statusPayload || null;
    const config = statusPayload?.config || {};
    const counts = statusPayload?.localSummary?.counts || {};
    const salespersons = Array.isArray(statusPayload?.localSummary?.salespersons) ? statusPayload.localSummary.salespersons : [];
    const salespersonsLabel = salespersons
        .slice(0, 5)
        .map((item) => {
            const name = item.salespersonName || item.salesperson_name || item.name || '';
            const code = item.salesPersonCode ?? item.sales_person_code ?? '';
            return code !== '' ? `${name} (${code})` : name;
        })
        .filter(Boolean)
        .join(', ');
    const productionCostCenter = statusPayload?.localSummary?.productionCostCenter?.defaultCostCenterCode || '';
    if (sapStatusRow) {
        const modeTone = statusPayload?.mode === 'live' ? 'live' : 'demo';
        const pills = [
            `<span class="sap-config-pill" data-tone="${modeTone}">Modo ${escapeText((statusPayload?.mode === 'live' ? 'LIVE' : 'LOCAL'))}</span>`,
            `<span class="sap-config-pill">${config.isLiveReady ? 'Live listo' : 'Live pendiente'}</span>`,
            `<span class="sap-config-pill">${config.hasPassword ? 'Clave guardada' : 'Sin clave'}</span>`
        ];
        if (config.lastSyncStatus) {
            const tone = config.lastSyncStatus === 'error' ? 'error' : (config.lastSyncStatus === 'success' ? 'live' : 'demo');
            pills.push(`<span class="sap-config-pill" data-tone="${tone}">Sync ${escapeText(config.lastSyncStatus)}</span>`);
        }
        sapStatusRow.innerHTML = pills.join('');
    }
    if (sapStatusNote) {
        const lastSync = config.lastSyncFinishedAt ? new Date(config.lastSyncFinishedAt).toLocaleString('es-CR') : 'Sin sincronizacion';
        const sellerNote = salespersonsLabel ? ` Vendedores locales: ${salespersonsLabel}.` : '';
        const productionNote = productionCostCenter ? ` Centro costo produccion: ${productionCostCenter}.` : '';
        sapStatusNote.textContent = `${config.lastSyncMessage || 'Configuracion lista.'} Ultimo cierre: ${lastSync}.${productionNote}${sellerNote}`;
    }
    if (sapLocalCounts) {
        sapLocalCounts.innerHTML = [
            ['Socios', counts.businessPartners || 0],
            ['Articulos', counts.items || 0],
            ['Bodegas', counts.warehouses || 0],
            ['Ordenes', counts.orders || 0],
            ['Facturas', counts.invoices || 0],
            ['Vendedores', counts.salespersons || 0]
        ].map(([label, value]) => `
            <div class="sap-config-count">
                <strong>${escapeText(String(value))}</strong>
                <span>${escapeText(label)}</span>
            </div>
        `).join('');
    }
    populateSapConfigForm(config);
}

function renderSapLogs(logsPayload) {
    const syncLog = Array.isArray(logsPayload?.syncLog) ? logsPayload.syncLog : [];
    const writeLog = Array.isArray(logsPayload?.writeLog) ? logsPayload.writeLog : [];
    const rows = [
        ...syncLog.map((entry) => ({
            title: `${entry.entity_name} | ${entry.status}`,
            meta: `${entry.mode} | ${entry.records_count || 0} registros | ${entry.started_at ? new Date(entry.started_at).toLocaleString('es-CR') : ''}`,
            detail: entry.message || 'Sin detalle'
        })),
        ...writeLog.map((entry) => ({
            title: `${entry.entity_name} | ${entry.status}`,
            meta: `${entry.mode} | ${entry.created_at ? new Date(entry.created_at).toLocaleString('es-CR') : ''}`,
            detail: entry.error_message || 'Envio registrado correctamente'
        }))
    ].slice(0, 20);
    if (!sapLogList) return;
    if (!rows.length) {
        sapLogList.innerHTML = '<div class="sap-config-empty">Sin actividad reciente.</div>';
        return;
    }
    sapLogList.innerHTML = rows.map((entry) => `
        <div class="sap-config-log-item">
            <strong>${escapeText(entry.title)}</strong>
            <span>${escapeText(entry.meta)}</span>
            <span>${escapeText(entry.detail)}</span>
        </div>
    `).join('');
}

async function loadSapPanelData() {
    const [configPayload, logsPayload] = await Promise.all([
        fetchJson('/api/sap/config'),
        fetchJson('/api/sap/logs')
    ]);
    renderSapStatus(configPayload);
    renderSapLogs(logsPayload);
}

function collectSapConfigPayload() {
    if (!sapModeSelect || !sapCompanyInput || !sapHostInput || !sapPortInput || !sapProtocolSelect || !sapUserInput || !sapPasswordInput || !sapAutoSyncCheckbox || !sapAllowSelfSignedCheckbox || !sapKeepDemoCheckbox || !sapSyncIntervalInput) {
        throw new Error('La configuracion SAP no esta disponible en esta vista.');
    }
    return {
        mode: sapModeSelect.value,
        sapCompany: normalizeText(sapCompanyInput.value),
        sapHost: normalizeText(sapHostInput.value),
        sapPort: Number(sapPortInput.value || 50000),
        sapProtocol: sapProtocolSelect.value || 'https',
        sapUser: normalizeText(sapUserInput.value),
        sapPassword: sapPasswordInput.value,
        autoSyncEnabled: sapAutoSyncCheckbox.checked,
        allowSelfSigned: sapAllowSelfSignedCheckbox.checked,
        keepDemoEnabled: sapKeepDemoCheckbox.checked,
        syncIntervalMinutes: Number(sapSyncIntervalInput.value || 30)
    };
}

async function saveSapConfig() {
    setSapConfigStatus('Guardando configuracion SAP...', 'saving');
    const payload = await fetchJson('/api/sap/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectSapConfigPayload())
    });
    sapPasswordInput.value = '';
    setSapConfigStatus('Configuracion SAP guardada.', 'saved');
    renderSapStatus({
        ...(sapConfigState || {}),
        config: payload.config
    });
    await loadSapPanelData();
}

async function testSapConnection() {
    setSapConfigStatus('Probando conexion SAP...', 'saving');
    const payload = await fetchJson('/api/sap/test', { method: 'POST' });
    setSapConfigStatus(payload.message || 'Conexion validada.', 'saved');
    await loadSapPanelData();
}

async function syncSapData() {
    setSapConfigStatus('Sincronizando tablas SAP...', 'saving');
    const payload = await fetchJson('/api/sap/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityName: 'all' })
    });
    setSapConfigStatus(payload.ok ? 'Sincronizacion completada.' : (payload.error || 'Sincronizacion parcial.'), payload.ok ? 'saved' : 'error');
    setSapResult(sapQueryResult, payload);
    await loadSapPanelData();
}

async function resetSapDemo() {
    setSapConfigStatus('Reiniciando entorno SAP...', 'saving');
    await fetchJson('/api/sap/reset-demo', { method: 'POST' });
    setSapConfigStatus('Entorno SAP reiniciado.', 'saved');
}

function buildSapQueryUrl() {
    const entity = sapQueryEntity.value || 'business-partners';
    const params = new URLSearchParams();
    const source = normalizeText(sapQuerySource.value);
    const search = normalizeText(sapQuerySearchInput.value);
    const filter = normalizeText(sapQueryFilterInput.value);
    const top = normalizeText(sapQueryTopInput.value);
    if (source) params.set('source', source);
    if (search) params.set('search', search);
    if (top) params.set('top', top);
    if (filter) {
        if (entity === 'business-partners') params.set('type', filter);
        if (entity === 'items') params.set('group', filter);
        if (entity === 'orders') params.set('status', filter);
    }
    return `/api/sap/${entity}${params.toString() ? `?${params.toString()}` : ''}`;
}

async function runSapQuery() {
    setSapConfigStatus('Consultando SAP...', 'saving');
    const payload = await fetchJson(buildSapQueryUrl());
    setSapResult(sapQueryResult, payload);
    setSapConfigStatus('Consulta SAP completada.', 'saved');
}

async function runSapWrite() {
    const entity = sapWriteEntity.value || 'orders';
    let parsed;
    try {
        parsed = JSON.parse(sapPayloadInput.value || '{}');
    } catch (error) {
        setSapConfigStatus('El JSON del envio no es valido.', 'error');
        return;
    }
    setSapConfigStatus('Enviando documento a SAP...', 'saving');
    const route = entity === 'inventory-exit'
        ? '/api/sap/inventory/exit'
        : entity === 'inventory-entry'
            ? '/api/sap/inventory/entry'
            : `/api/sap/${entity}`;
    const payload = await fetchJson(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
    });
    setSapResult(sapWriteResult, payload);
    setSapConfigStatus('Envio SAP completado.', 'saved');
    await loadSapPanelData();
}

function loadSapTemplate() {
    if (!sapWriteEntity || !sapPayloadInput) return;
    const template = getSapPayloadTemplate(sapWriteEntity.value || 'orders');
    sapPayloadInput.value = JSON.stringify(template, null, 2);
}

async function refreshSapLogs() {
    const payload = await fetchJson('/api/sap/logs');
    renderSapLogs(payload);
}

async function openSapPopover() {
    if (!sapConfigPopover) return;
    sapConfigPopover.hidden = false;
    setSapConfigStatus('Cargando configuracion SAP...', 'info');
    if (!sapPayloadInput.value.trim()) {
        loadSapTemplate();
    }
    await loadSapPanelData();
}

function closeSapPopover() {
    if (!sapConfigPopover) return;
    sapConfigPopover.hidden = true;
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

function withShellParam(route) {
    try {
        const url = new URL(route, window.location.origin);
        url.searchParams.set('shell', '1');
        return `${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
        return route.includes('?') ? `${route}&shell=1` : `${route}?shell=1`;
    }
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route: withShellParam(route), label }, window.location.origin);
    return true;
}

function getCurrentQuoteBrowserContext() {
    const quoteCode = selectedQuoteContextCode || [...expandedQuoteCodes][0] || '';
    if (!quoteCode) return null;
    const quote = quoteCatalog.find((item) => item.quote_code === quoteCode) || null;
    const line = quoteLineLookup.get(Number(selectedQuoteContextLineId)) || (quoteLineCache.get(quoteCode) || [])[0] || null;
    return {
        kind: 'quotes-browser',
        title: `Cotización ${quoteCode}`,
        subtitle: [
            quote?.customer_name || '',
            line?.nombreTrabajo || ''
        ].filter(Boolean).join(' · ') || 'Contexto activo: Cotizaciones',
        secondaryRoute: quoteCode ? `/proforma?codigo=${encodeURIComponent(quoteCode)}` : '',
        secondaryActionId: 'open-quote-proforma',
        secondaryLabel: 'Ver proforma',
        secondaryDescription: 'Abrir la proforma asociada a esta cotización',
        quoteCode,
        lineCode: String(line?.linea || '').trim(),
        productCode: String(line?.productId || '').trim(),
        status: String(line?.estado || quote?.status || '').trim(),
        canCreateOrder: Boolean(line?.finalizadaOrden),
        dates: {
            createdAt: quote?.created_on || '',
            updatedAt: quote?.updated_at || '',
            dueAt: quote?.due_on || ''
        }
    };
}

function publishBdfgContext() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-bdfg-context', context: getCurrentQuoteBrowserContext() }, window.location.origin);
}

function isSvgValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg');
}

function isImageValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image') || 
           normalized.endsWith('.png') || 
           normalized.endsWith('.jpg') || 
           normalized.endsWith('.jpeg') || 
           normalized.endsWith('.webp') || 
           normalized.endsWith('.gif');
}

function renderIcon(target, iconValue, color, size) {
    if (!target) return;
    const host = target.closest('.quote-request-icon-action, .quote-request-attachment-remove, .process-launcher-icon, .quantity-trash-button, .quantity-inline-action');
    const value = String(iconValue || '').trim();
    if (host) {
        host.style.setProperty('--icon-color', color || '');
        host.style.setProperty('--icon-hover-color', color || '');
    }
    target.style.color = host ? 'currentColor' : (color || '');
    if (isSvgValue(value)) {
        target.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${value}');mask-image:url('${value}');width:${size}px;height:${size}px;"></span>`;
        return;
    }
    if (isImageValue(value)) {
        target.innerHTML = `<img src="${value}" alt="" class="icon-image" style="width:${size}px;height:${size}px;object-fit:contain;">`;
        return;
    }
    target.innerHTML = `<span class="icon-glyph" style="font-size:${size}px;">${escapeHtml(value)}</span>`;
}

function iconMarkup(value, altText, extraClass = '') {
    if (isSvgValue(value)) {
        const safeUrl = escapeHtml(value);
        return `<span class="icon-svg-mask ${extraClass}" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
    }
    if (isImageValue(value)) {
        return `<img src="${escapeHtml(value)}" alt="${escapeHtml(altText)}" class="icon-image ${extraClass}">`;
    }
    return `<span class="icon-glyph ${extraClass}">${escapeHtml(value || '')}</span>`;
}

function iconSuffix(key) {
    return String(key || '')
        .split(/[.\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function readConfiguredIconValue(key) {
    const icons = loadedConfig?.icons || {};
    if (normalizeText(icons[key])) return normalizeText(icons[key]);
    if (key.startsWith('icons.') && normalizeText(loadedConfig?.[key])) return normalizeText(loadedConfig[key]);
    const parts = String(key || '').replace(/^icons\./, '').split('.');
    let current = icons;
    for (const part of parts) {
        current = current?.[part];
    }
    return normalizeText(current);
}

function sanitizeIconValue(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes('\uFFFD') || str.includes('\uFFFd') || str.includes('\uFFfD')) return '';
    return str;
}

function iconConfigFor(key, canonicalKey = null) {
    const general = loadedConfig?.general || {};
    const propKey = canonicalKey || key;
    
    const internalKey = key.replace(/\s+/g, '').replace(/[áéíóú]/g, (m) => ({ 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' }[m]));
    const fallback = DEFAULT_ICON_MAP[key] || DEFAULT_ICON_MAP[internalKey] || DEFAULT_ICON_MAP[propKey] || { value: '', color: '#6b7580', size: 24 };
    
    const value = sanitizeIconValue(readConfiguredIconValue(key)) || sanitizeIconValue(readConfiguredIconValue(propKey)) || fallback.value;
    const suffix = iconSuffix(propKey);
    const color = general[`iconColor${suffix}`] || fallback.color;
    const hover = general[`iconColorHover${suffix}`] || color;
    const size = Number(general[`iconSize${suffix}`]) || fallback.size;
    return { value, color, hover, size };
}

function getResolvedIcon(keys, canonicalKey) {
    for (const key of keys) {
        if (readConfiguredIconValue(key)) return iconConfigFor(key, canonicalKey);
    }
    return iconConfigFor(canonicalKey || keys[keys.length - 1]);
}

function applyConfiguredIcons() {
    const primaryConf = iconConfigFor('processLauncher');
    
    // Check multiple potential keys for each action, using a canonical key for properties
    const submitConf = getResolvedIcon(['crear cotización', 'crear cotizacion', 'solicitud de cotización', 'solicitud de cotizacion', 'quoteRequestSubmit'], 'quoteRequestSubmit');
    const advancedConf = getResolvedIcon(['cotizaciones', 'proceso avanzado flotante', 'proceso avanzado', 'quoteRequestAdvanced'], 'quoteRequestAdvanced');
    const proformaConf = getResolvedIcon(['ver proforma', 'proformaView'], 'proformaView');

    const attachmentConf = iconConfigFor('quoteRequestAttachment');
    const recordConf = iconConfigFor(isRecording ? 'quoteRequestRecordStop' : 'quoteRequestRecord');
    const deleteConf = getResolvedIcon(['eliminar adjunto solicitud', 'quoteRequestAttachmentDelete', 'loginRepositoryDelete'], 'quoteRequestAttachmentDelete');

    renderIcon(document.querySelector('[data-launcher-icon="primary"]'), primaryConf.value, primaryConf.color, primaryConf.size || 24);
    renderIcon(document.querySelector('[data-fab-icon="submit"]'), submitConf.value, submitConf.color, submitConf.size);
    renderIcon(document.querySelector('[data-fab-icon="advanced"]'), advancedConf.value, advancedConf.color, advancedConf.size);
    renderIcon(document.querySelector('[data-fab-icon="proforma"]'), proformaConf.value, proformaConf.color, proformaConf.size);
    renderIcon(document.querySelector('[data-inline-icon="attachment"]'), attachmentConf.value, attachmentConf.color, attachmentConf.size);
    renderIcon(document.querySelector('[data-inline-icon="record"]'), recordConf.value, recordConf.color, recordConf.size);
    document.querySelectorAll('.quote-request-attachment-remove').forEach((button) => renderIcon(button, deleteConf.value, deleteConf.color, deleteConf.size));

    // Iconos de cantidades desde base de datos
    const qtyAddConf = getResolvedIcon(['quantity.add', 'quantityAdd', 'icons.quantity.add'], 'quantity.add');
    const qtyDelConf = getResolvedIcon(['quantity.delete', 'quantityDelete', 'icons.quantity.delete'], 'quantity.delete');
    document.querySelectorAll('[data-qty-icon="add"]').forEach((span) => {
        if (qtyAddConf.value) {
            span.parentElement.style.color = qtyAddConf.color || '#1e6fa8';
            span.parentElement.style.setProperty('--quantity-add-icon-size', `${Number(qtyAddConf.size) || 18}px`);
            renderIcon(span, qtyAddConf.value, qtyAddConf.color || '#1e6fa8', qtyAddConf.size || 18);
        }
    });
    document.querySelectorAll('[data-qty-icon="delete"]').forEach((span) => {
        if (qtyDelConf.value) {
            span.parentElement.style.color = qtyDelConf.color || '#a74343';
            span.parentElement.style.setProperty('--delete-icon-size', `${Number(qtyDelConf.size) || 18}px`);
            renderIcon(span, qtyDelConf.value, qtyDelConf.color || '#a74343', qtyDelConf.size || 18);
        }
    });

    if (processLauncherButton) {
        processLauncherButton.style.setProperty('--floating-icon-color', primaryConf.color);
        processLauncherButton.style.setProperty('--floating-icon-hover', loadedConfig?.general?.iconColorHoverProcessLauncher || '#0b81b8');
        processLauncherButton.style.setProperty('--floating-icon-size', `${primaryConf.size || 24}px`);
    }
    if (audioRecordButton) {
        audioRecordButton.title = isRecording ? 'Detener Grabacion' : 'Grabar Audio';
        audioRecordButton.setAttribute('aria-label', isRecording ? 'Detener Grabacion' : 'Grabar Audio');
    }
    document.querySelectorAll('.quote-request-icon-action').forEach((button) => {
        const conf = button.id === 'audioRecordButton' ? recordConf : attachmentConf;
        button.style.setProperty('--icon-color', conf.color || '#1e516d');
        button.style.setProperty('--icon-hover-color', loadedConfig?.general?.[`iconColorHover${button.id === 'audioRecordButton' ? 'QuoteRequestRecord' : 'QuoteRequestAttachment'}`] || conf.color || '#1e516d');
        if (button.id === 'audioRecordButton') button.style.setProperty('--icon-recording-color', recordConf.color || '#ef4444');
    });
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR');
}

function formatDateTimeShort(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function parseMoneyValue(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value)
        .replace(/[^0-9,.-]/g, '')
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
    const number = parseMoneyValue(value);
    return number
        ? `$${number.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00';
}

function formatCurrencyValue(value, currency = {}) {
    const amount = Number(value || 0);
    const currencyCode = String(currency.code || '').trim().toUpperCase();
    if (currencyCode) {
        try {
            return new Intl.NumberFormat('es-CR', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback handled below.
        }
    }
    const symbol = String(currency.symbol || '$').trim() || '$';
    return `${symbol}${amount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value) {
    const number = pickFirstMeaningfulNumber(value);
    if (number === null || number === undefined) return '';
    return Number(number).toLocaleString('es-CR', { maximumFractionDigits: 0 });
}

function pickFirstMeaningfulNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const text = String(value).trim();
        if (!text) continue;
        const cleaned = text
            .replace(/[^0-9,.-]/g, '')
            .replace(/\s/g, '')
            .replace(/\.(?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');
        if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') continue;
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return value;
    }
    return '';
}

function normalizeQuoteLine(line, quoteCode, index = 0) {
    quoteTreeLineSequence += 1;
    const raw = line.raw_data || {};
    const summary = line.line_summary && typeof line.line_summary === 'object'
        ? line.line_summary
        : (raw.line_summary && typeof raw.line_summary === 'object' ? raw.line_summary : {});
    const calculationBlockMessage = stripNonBlockingSapAccountingWarnings(String(
        raw['ANALISIS CAMPOS CREAR ORDEN']
        || raw['ANALISIS CAMPOS FINALIZAR']
        || raw['ANALISIS CAMPOS PDF']
        || ''
    ).trim());
    const autoSelection = raw.CODEX_AUTO_SELECTION || {};
    const autoWarnings = [];
    const fallbackTotal = pickFirstMeaningfulNumber(
        summary.subtotal_1,
        summary.total_cost,
        line.subtotal_1,
        line.total_cost,
        raw['PRECIO TOTAL AL FINALIZAR'],
        raw['GENERAL | 9 | TOTAL | DOL'],
        raw['GENERAL | 7 | TOTAL | DOL'],
        raw['GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS']
    );
    const measure = summary.measure || [summary.width_in, summary.length_in].filter((value) => value || value === 0).join(' x ');
    return {
        id: quoteTreeLineSequence,
        quoteId: quoteCode || line.quote_code || '',
        linea: summary.line_code || line.line_code || '',
        originalLinea: summary.line_code || line.line_code || '',
        lineOrder: Number(summary.line_order || line.line_order) || index + 1,
        departamento: summary.department || line.department || 'Flexografia',
        nombreTrabajo: summary.job_name || line.job_name || '',
        rawData: raw,
        lineSummary: summary,
        material: summary.material_name || line.material_name || '',
        materialCode: summary.material_code || line.material_code || raw['Material Convencional | Id Material'] || raw['Material Digital | Id Material'] || '',
        medida: measure || [raw['DIMENSIONES ETIQUETA | ANCHO'], raw['DIMENSIONES ETIQUETA | LARGO']].filter((value) => value || value === 0).join(' x '),
        machineName: summary.machine_name || line.machine_name || raw['CONV | MAQUINA'] || raw['DIGITAL | MAQUINA'] || '',
        dieCode: summary.die_code || line.die_code || raw['GENERAL | TROQUEL | ID'] || raw['REQ | Troquelado'] || '',
        processType: summary.process_type || line.process_type || raw['Proceso Productivo'] || '',
        processSequenceText: summary.process_sequence_text || raw['CODEX_PROCESS_SEQUENCE_TEXT'] || raw['BOT | Process Sequence'] || '',
        frontBackGroup: normalizeFrontBackGroupClient(line.grupo_frente_dorso || line.front_back_group || summary.grupo_frente_dorso || summary.front_back_group || raw),
        estado: summary.status || line.status || raw['SOLICITUD ESTADO'] || raw['ESTADO LINEA'] || 'Borrador',
        finalizadaOrden: Boolean(summary.finalized_for_order || line.finalized_for_order || raw['CODEX_FINALIZED_FOR_ORDER']),
        calculationBlockMessage,
        subtotal1: fallbackTotal ?? '',
        productId: summary.product_code || line.product_code || line.line_code || '',
        quantity: pickFirstMeaningfulNumber(summary.quantity, line.quantity, raw['Cantidad Productos']),
        autoRoute: autoSelection.processType || raw['REQ | Ruta Automática'] || line.process_type || '',
        autoMaterialCode: autoSelection.materialCode || raw['REQ | Material Automático'] || line.material_code || '',
        autoMaterialName: line.material_name || raw['GENERAL | MATERIAL'] || '',
        autoMaterialFamily: autoSelection.materialFamily || raw['REQ | Material Comercial'] || '',
        autoMachineName: autoSelection.machineName || raw['REQ | Máquina Automática'] || line.machine_name || '',
        autoDieCode: autoSelection.dieCode || raw['REQ | Troquel Automático'] || line.die_code || '',
        autoLabelsPerRoll: pickFirstMeaningfulNumber(autoSelection.labelsPerRoll, raw['REQ | Etiquetas x Rollo Automática'], raw['CANTIDAD ETIQUETAS X ROLLO']),
        autoMountingSummary: raw['REQ | Montaje Automático'] || '',
        autoTechnicalComment: raw['REQ | Comentario Técnico Automático'] || '',
        autoWarnings,
        autoFallbackApplied: String(raw['REQ | Fallback de Ruta'] || '').trim().toLowerCase() === 'sí'
    };
}

function getQuoteCalculationBlockMessage(quoteCode) {
    const lines = quoteLineCache.get(quoteCode) || [];
    const blockedLine = lines.find((item) => stripNonBlockingSapAccountingWarnings(item?.calculationBlockMessage || ''));
    if (!blockedLine) return '';
    return `La línea ${blockedLine.linea} requiere completar el cálculo. ${stripNonBlockingSapAccountingWarnings(blockedLine.calculationBlockMessage)}`.trim();
}

function ensureQuoteReadyForProforma(quoteCode) {
    const message = getQuoteCalculationBlockMessage(quoteCode);
    if (message) throw new Error(message);
}

function buildLineCalculationRoute({ lineCode, quoteCode, productId = '', department = 'Flexografia', processKey = '' } = {}) {
    if (!lineCode || !quoteCode) return '';
    const query = {
        lineId: lineCode,
        quoteId: quoteCode,
        productId,
        department
    };
    if (processKey) query.jumpProcess = processKey;
    return `/calculo-flexografia?${new URLSearchParams(query).toString()}`;
}

function showCenterMessage(message, options = {}) {
    const text = String(message || '').trim();
    if (!text) return;
    let node = document.getElementById('calcCenterMessage');
    if (!node) {
        node = document.createElement('div');
        node.id = 'calcCenterMessage';
        node.className = 'calc-center-message';
        document.body.appendChild(node);
    }
    const closeButton = '<button type="button" class="calc-center-message-close" data-close-calc-message aria-label="Cerrar">&times;</button>';
    if (options.html) node.innerHTML = `${closeButton}<div class="calc-center-message-content">${text}</div>`;
    else node.innerHTML = `${closeButton}<div class="calc-center-message-content">${escapeHtml(text)}</div>`;
    node.hidden = false;
    clearTimeout(showCenterMessage.timer);
    showCenterMessage.timer = setTimeout(() => { node.hidden = true; }, options.duration || 5200);
}

const PROFORMA_BLOCK_PROCESS_LABELS = [
    { key: 'barnizado', label: 'Barnizado' },
    { key: 'laminado', label: 'Laminado' },
    { key: 'estampado', label: 'Estampado' },
    { key: 'embosado', label: 'Embosado' },
    { key: 'troquelado', label: 'Troquelado' },
    { key: 'rebobinado', label: 'Rebobinado' },
    { key: 'troquel', label: 'Troquel' },
    { key: 'sustrato', label: 'Sustrato' },
    { key: 'diseno', label: 'Diseño' },
    { key: 'preprensa', label: 'Preprensa' },
    { key: 'planchas', label: 'Planchas' },
    { key: 'impresion', label: 'Impresión' },
    { key: 'empaque', label: 'Empaque' },
    { key: 'adicionales', label: 'Procesos adicionales' }
];

function normalizeProformaIssueText(value = '') {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function processKeyFromIssueText(message = '') {
    const text = normalizeProformaIssueText(message);
    if (!text) return '';
    const match = PROFORMA_BLOCK_PROCESS_LABELS.find((item) => {
        const label = normalizeProformaIssueText(item.label);
        return label && text.includes(label);
    });
    return match?.key || '';
}

function isPlateProformaIssue(issue = {}) {
    const text = normalizeProformaIssueText(issue.message || issue);
    const key = String(issue.processKey || processKeyFromIssueText(issue.message || issue) || '').split('-')[0];
    return key === 'planchas' || text.includes('plancha');
}

function processLabelFromKey(processKey = '') {
    const baseKey = String(processKey || '').split('-')[0];
    return PROFORMA_BLOCK_PROCESS_LABELS.find((item) => item.key === baseKey)?.label || baseKey || 'Faltante';
}

function summarizeProformaIssuesByProcess(issues = []) {
    const map = new Map();
    (Array.isArray(issues) ? issues : []).forEach((issue) => {
        const processKey = String(issue?.processKey || processKeyFromIssueText(issue?.message || '') || '').trim();
        const label = processLabelFromKey(processKey);
        const key = processKey || String(issue?.message || '').trim();
        if (!key || map.has(key)) return;
        map.set(key, {
            ...issue,
            processKey,
            message: processKey ? `${label} requiere configuración.` : String(issue?.message || '').trim()
        });
    });
    return [...map.values()];
}

function proformaBlockIssuesFromLine(line = {}) {
    const raw = line.raw_data || line.rawData || {};
    const messages = Array.isArray(raw.CODEX_VALIDATION_MESSAGES)
        ? raw.CODEX_VALIDATION_MESSAGES.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const fallback = String(raw['ANALISIS CAMPOS PDF'] || raw['ANALISIS CAMPOS CREAR ORDEN'] || raw['ANALISIS CAMPOS FINALIZAR'] || '').trim();
    return [...new Set(messages.length ? messages : (fallback ? [fallback] : []))]
        .map((message) => ({ message, processKey: processKeyFromIssueText(message) }))
        .filter((issue) => !isPlateProformaIssue(issue));
}

async function getProformaBlockMessage(quoteCode) {
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}`, { headers: sessionHeader() });
    const lines = Array.isArray(payload?.lineas) ? payload.lineas : [];
    const blocked = lines
        .map((line) => ({
            lineCode: String(line.line_code || line.linea || line.raw_data?.['ID LINEA'] || '').trim(),
            quoteCode,
            productId: line.product_code || '',
            department: line.department || line.raw_data?.DEPARTAMENTO || 'Flexografia',
            issues: proformaBlockIssuesFromLine(line)
        }))
        .filter((item) => item.issues.length);
    if (!blocked.length) return '';
    const rows = blocked.map((item) => {
        const route = buildLineCalculationRoute(item);
        const lineLabel = route
            ? `<a class="summary-row-link" href="${escapeHtml(route)}" data-route="${escapeHtml(route)}" data-label="Cálculo ${escapeHtml(item.lineCode)}">${escapeHtml(item.lineCode || 'sin código')}</a>`
            : escapeHtml(item.lineCode || 'sin código');
        const issues = summarizeProformaIssuesByProcess(item.issues).map((issue) => {
            const issueRoute = buildLineCalculationRoute({ ...item, processKey: issue.processKey });
            const label = processLabelFromKey(issue.processKey);
            const problem = issueRoute
                ? `<a class="summary-row-link" href="${escapeHtml(issueRoute)}" data-route="${escapeHtml(issueRoute)}" data-label="Cálculo ${escapeHtml(item.lineCode)}">${escapeHtml(label)}</a>`
                : escapeHtml(label);
            return `<li>${problem}: ${escapeHtml(issue.message)}</li>`;
        }).join('');
        return `<section class="calc-message-line"><div class="calc-message-line-head">Línea ${lineLabel}</div><ul>${issues}</ul></section>`;
    }).join('');
    const count = blocked.length;
    return `<div class="calc-message-title">Faltantes en líneas de cálculo de esta proforma</div><div class="calc-message-intro">Esta proforma toma datos de ${count} línea${count === 1 ? '' : 's'} de cálculo. Completa o justifica cada faltante antes de continuar.</div><div class="calc-message-list">${rows}</div>`;
}

async function openProformaIfReady(quoteCode) {
    const blockMessage = await getProformaBlockMessage(quoteCode);
    if (blockMessage) {
        showCenterMessage(blockMessage, { html: true, duration: 18000 });
        setStatus('No se puede abrir la proforma: faltan datos en una o más líneas.', 'error');
        return;
    }
    const route = `/proforma?codigo=${encodeURIComponent(quoteCode)}`;
    if (!openRouteInShell(route, `Proforma ${quoteCode}`)) window.location.href = route;
}

document.addEventListener('click', (event) => {
    const closeMessage = event.target.closest?.('.calc-center-message [data-close-calc-message]');
    if (closeMessage) {
        event.preventDefault();
        clearTimeout(showCenterMessage.timer);
        document.getElementById('calcCenterMessage')?.setAttribute('hidden', '');
        return;
    }
    const routeLink = event.target.closest?.('.calc-center-message [data-route]');
    if (!routeLink) return;
    event.preventDefault();
    const route = routeLink.dataset.route || routeLink.getAttribute('href') || '';
    const label = routeLink.dataset.label || routeLink.textContent || 'Cálculo';
    if (!openRouteInShell(route, label)) window.location.href = route;
});

function ensureLineReadyForOrder(row) {
    const message = stripNonBlockingSapAccountingWarnings(row?.calculationBlockMessage || '');
    if (message) throw new Error(message);
}

function isNonBlockingSapAccountingWarning(message = '') {
    const text = String(message || '').trim();
    return /No existe configuración de centro de beneficio para el ejecutivo de ventas indicado/i.test(text)
        || /El ejecutivo de ventas indicado no tiene centro de beneficio configurado/i.test(text);
}

function stripNonBlockingSapAccountingWarnings(message = '') {
    const text = String(message || '').trim();
    if (!text) return '';
    const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    return parts.filter((part) => !isNonBlockingSapAccountingWarning(part)).join(' ').trim();
}

function quoteTreeLineTitle(row) {
    return [
        row.nombreTrabajo || 'Sin nombre',
        row.medida ? `(${row.medida})` : ''
    ].filter(Boolean).join(' ');
}

function quoteTreeLineMeta(row) {
    return [
        row.material || 'Sin material',
        row.machineName || 'Sin máquina',
        row.processType || ''
    ].filter(Boolean).join(' · ');
}

function quoteTotalFromLines(lines = []) {
    return lines.reduce((sum, line) => sum + parseMoneyValue(line.subtotal1), 0);
}

function normalizeFrontBackGroupClient(rowOrRaw = {}) {
    const group = rowOrRaw?.grupoFrenteDorso || rowOrRaw?.grupo_frente_dorso || rowOrRaw?.frontBackGroup || rowOrRaw?.rawData?.grupoFrenteDorso || rowOrRaw?.rawData?.CODEX_FD_GROUP || rowOrRaw?.CODEX_FD_GROUP || rowOrRaw;
    if (!group || typeof group !== 'object') return null;
    const explicitElements = Array.isArray(group.elementLineCodes)
        ? group.elementLineCodes.map(normalizeText).filter(Boolean)
        : Array.isArray(group.elementos)
            ? group.elementos.map((item) => normalizeText(item?.lineCode || item?.linea || item)).filter(Boolean)
            : [];
    const legacyMembers = Array.isArray(group.memberLineCodes)
        ? group.memberLineCodes.map(normalizeText).filter(Boolean)
        : [group.primaryLineCode, group.partnerLineCode].map(normalizeText).filter(Boolean);
    const memberLineCodes = Array.from(new Set((explicitElements.length ? explicitElements : legacyMembers).filter(Boolean)));
    const primaryLineCode = normalizeText(group.groupLineCode || group.lineaGrupo || group.primaryLineCode || memberLineCodes[0]);
    const partnerLineCode = normalizeText(group.partnerLineCode || group.backLineCode || memberLineCodes.find((code) => code !== primaryLineCode));
    const groupId = normalizeText(group.groupId);
    if (!groupId || !primaryLineCode || !memberLineCodes.length) return null;
    const roleText = normalizeText(group.role || group.rol).toLowerCase();
    const role = ['elemento', 'componente', 'frente', 'dorso'].includes(roleText) ? 'elemento' : 'grupo';
    return {
        ...group,
        groupId,
        label: normalizeText(group.label) || 'Grupo Frente/Dorso',
        role,
        groupLineCode: primaryLineCode,
        lineaGrupo: primaryLineCode,
        primaryLineCode,
        partnerLineCode,
        frontLineCode: normalizeText(group.frontLineCode || memberLineCodes[0]),
        backLineCode: normalizeText(group.backLineCode || memberLineCodes[1] || partnerLineCode),
        elementLineCodes: memberLineCodes,
        memberLineCodes,
        allLineCodes: Array.from(new Set([primaryLineCode, ...memberLineCodes].filter(Boolean))),
        elementRole: normalizeText(group.elementRole || group.ladoElemento),
        elementRoles: group.elementRoles && typeof group.elementRoles === 'object' ? group.elementRoles : {},
        warnings: Array.isArray(group.warnings) ? group.warnings.map(normalizeText).filter(Boolean) : []
    };
}

function getFrontBackGroup(row) {
    return normalizeFrontBackGroupClient(row);
}

function frontBackPartnerCode(row) {
    const group = getFrontBackGroup(row);
    if (!group) return '';
    if (row.linea === group.groupLineCode) return group.elementLineCodes.join(' + ');
    return group.groupLineCode;
}

function frontBackChipMarkup(row) {
    const group = getFrontBackGroup(row);
    if (!group) return '';
    const role = group.role === 'grupo' ? 'Grupo' : (group.elementRole ? group.elementRole : 'Elemento');
    const partner = frontBackPartnerCode(row);
    return `<div class="quote-master-line-badges"><span class="quote-line-auto-chip">Grupo frente/dorso · ${escapeHtml(role)}${partner ? ` · ${escapeHtml(partner)}` : ''}</span></div>`;
}

function frontBackGroupKey(group, quoteCode = '') {
    const id = normalizeText(group?.groupId || group?.groupLineCode || group?.lineaGrupo);
    if (!id) return '';
    return [quoteCode, id].filter(Boolean).join('::');
}

function buildFrontBackLineTree(lines = [], quoteCode = '') {
    const byLineCode = new Map(lines.map((line) => [normalizeText(line.linea), line]).filter(([code]) => Boolean(code)));
    const handledChildCodes = new Set();
    const nodes = [];
    lines.forEach((line, sourceIndex) => {
        const group = getFrontBackGroup(line);
        const lineCode = normalizeText(line.linea);
        if (handledChildCodes.has(lineCode)) return;
        if (group?.role === 'elemento' && byLineCode.has(group.groupLineCode)) return;
        const isGroupLine = group?.role === 'grupo';
        if (!isGroupLine) {
            nodes.push({ line, sourceIndex, kind: 'line' });
            return;
        }
        const childCodes = Array.from(new Set((group.elementLineCodes || group.memberLineCodes || []).map(normalizeText).filter(Boolean)));
        const children = childCodes
            .filter((code) => code && code !== lineCode)
            .map((code) => byLineCode.get(code))
            .filter(Boolean);
        children.forEach((child) => handledChildCodes.add(normalizeText(child.linea)));
        const key = frontBackGroupKey(group, quoteCode);
        const expanded = expandedFrontBackGroupKeys.has(key);
        nodes.push({ line, sourceIndex, kind: 'group', group, key, childCount: children.length, expanded });
        if (expanded) {
            children.forEach((child) => {
                nodes.push({
                    line: child,
                    sourceIndex: lines.findIndex((item) => item.id === child.id),
                    kind: 'child',
                    group,
                    key
                });
            });
        }
    });
    return nodes;
}

async function fetchQuoteLines(quoteCode, options = {}) {
    if (!quoteCode) return [];
    if (!options.force && quoteLineCache.has(quoteCode)) return quoteLineCache.get(quoteCode);
    quoteLineLoading.add(quoteCode);
    renderQuotesTable(getFilteredQuotes());
    try {
        const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}`);
        const lines = (payload.lineas || []).map((line, index) => normalizeQuoteLine(line, quoteCode, index));
        quoteLineCache.set(quoteCode, lines);
        return lines;
    } finally {
        quoteLineLoading.delete(quoteCode);
        renderQuotesTable(getFilteredQuotes());
    }
}

function buildLineTitle(row, index) {
    return row.nombreTrabajo || 'Sin nombre';
}

function buildLineMeta(row) {
    return row.linea || '';
}

function isEnabledQuoteDetail(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return false;
    return !['no', 'false', '0', 'sin', 'ninguno', 'n/a'].includes(normalized);
}

function cleanQuoteDetail(value) {
    const text = normalizeText(value);
    if (!text) return '';
    if (!isEnabledQuoteDetail(text)) return '';
    return text;
}

function formatQuoteDimension(value) {
    const text = normalizeText(value);
    if (!text) return '';
    return /["a-z%]/i.test(text) ? text : `${text}"`;
}

function formatQuoteMillimeters(value) {
    const text = normalizeText(value);
    if (!text) return '';
    return /mm$/i.test(text) ? text : `${text} mm`;
}

function buildQuoteFinishLabel(baseLabel, detailParts = []) {
    const normalizedParts = detailParts
        .map((item) => normalizeText(item))
        .filter((item) => !['si', 'sí', 'yes', 'true', '1', 'activo', 'activa'].includes(item.toLowerCase()))
        .filter(Boolean);
    if (!normalizedParts.length) return baseLabel;
    return `${baseLabel} (${normalizedParts.join(', ')})`;
}

function buildQuoteRealDetailItems(row) {
    const raw = row.rawData || {};
    const items = [];
    const width = formatQuoteDimension(raw['DIMENSIONES ETIQUETA | ANCHO']);
    const length = formatQuoteDimension(raw['DIMENSIONES ETIQUETA | LARGO']);
    if (width && length) items.push(`${width} x ${length}`);
    else if (row.medida) items.push(row.medida);
    if (row.quantity) items.push(`Cantidad ${formatNumber(row.quantity)}`);
    if (row.machineName) items.push(`Impresión ${row.machineName}`);

    const dieCode = cleanQuoteDetail(row.dieCode || raw['GENERAL | TROQUEL | ID']);
    const troquelRequested = cleanQuoteDetail(raw['REQ | Troquelado']);
    if (dieCode || troquelRequested) {
        items.push(buildQuoteFinishLabel('Troquelado', [dieCode || troquelRequested]));
    }

    const barnizDetail = cleanQuoteDetail(raw['REQ | Barniz'] || raw['BARNIZ'] || raw['CONV | BARNIZ | TIPO']);
    if (barnizDetail) items.push(buildQuoteFinishLabel('Barniz', [barnizDetail]));

    const laminadoDetail = cleanQuoteDetail(raw['REQ | Laminado'] || raw['LAMINADO'] || raw['CONV | LAMINADO | TIPO']);
    if (laminadoDetail) items.push(buildQuoteFinishLabel('Laminado', [laminadoDetail]));

    const estampadoDetail = cleanQuoteDetail(raw['REQ | Estampado'] || raw['ESTAMPADO'] || raw['CONV | ESTAMPADO | FOIL']);
    const estampadoWidth = formatQuoteMillimeters(raw['REQ | Estampado Ancho']);
    if (estampadoDetail || estampadoWidth) {
        items.push(buildQuoteFinishLabel('Estampado', [estampadoDetail, estampadoWidth]));
    }

    const embossDetail = cleanQuoteDetail(raw['REQ | Embosado'] || raw['EMBOSADO | TIPO'] || raw['EMBOSADO']);
    if (embossDetail) items.push(buildQuoteFinishLabel('Embosado', [embossDetail]));

    const numberingDetail = cleanQuoteDetail(
        raw['REQ | Numeracion Resumen']
        || raw['REQ | Numeracion Detalle']
        || raw['REQ | Numeracion Aviso']
        || raw['REQ | Numeracion']
        || raw['ACABADOS | NUMERADO DETALLE']
        || raw['ACABADOS | NUMERADO']
    );
    if (numberingDetail) items.push(buildQuoteFinishLabel('Numeración', [numberingDetail]));

    return items;
}

function renderQuoteRealSummary(row) {
    const items = buildQuoteRealDetailItems(row);
    if (!items.length) return '';
    return `
        <div class="quote-master-line-badges">
            ${items.map((item) => `<span class="quote-line-auto-chip">${escapeHtml(item)}</span>`).join('')}
        </div>
    `;
}

function firstQuoteDetail(raw, keys = []) {
    for (const key of keys) {
        const value = cleanQuoteDetail(raw?.[key]);
        if (value) return value;
    }
    return '';
}

function formatQuoteLineQuantities(row) {
    const raw = row.rawData || {};
    const source = raw['REQ | Cantidades']
        || raw['REQ | Cantidad de Productos']
        || raw['CANTIDADES']
        || raw['Cantidad de Productos']
        || row.quantity
        || '';
    if (Array.isArray(source)) {
        return source.map((item) => normalizeText(item)).filter(Boolean).join(' - ');
    }
    const text = normalizeText(source);
    if (!text) return '';
    return text
        .split(/[|,;]+/)
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .join(' - ');
}

function formatQuoteLineDie(row) {
    const raw = row.rawData || {};
    const booleanValues = ['si', 'sí', 'yes', 'true', '1', 'activo', 'activa'];
    const dieType = firstQuoteDetail(raw, [
        'REQ | Forma de Troquel',
        'GENERAL | TROQUEL | FORMA',
        'GENERAL | TROQUEL | TIPO'
    ]);
    const rawDieCode = cleanQuoteDetail(row.dieCode || raw['GENERAL | TROQUEL | ID']);
    const dieCode = booleanValues.includes(rawDieCode.toLowerCase()) ? '' : rawDieCode;
    const requested = firstQuoteDetail(raw, ['REQ | Troquelado']);
    const hasRequestedDie = booleanValues.includes(requested.toLowerCase());
    if (dieType && dieCode) return `${dieType} (${dieCode})`;
    return dieType || (dieCode ? `Troquel (${dieCode})` : (hasRequestedDie ? 'Troquelado' : ''));
}

function buildQuoteLineFinishParts(row) {
    const raw = row.rawData || {};
    const parts = [];
    const barniz = firstQuoteDetail(raw, ['REQ | Barniz', 'BARNIZ', 'CONV | BARNIZ | TIPO']);
    if (barniz) parts.push(`Barniz ${barniz}`);
    const laminado = firstQuoteDetail(raw, ['REQ | Laminado', 'LAMINADO', 'CONV | LAMINADO | TIPO']);
    if (laminado) parts.push(`Laminado ${laminado}`);
    const estampado = firstQuoteDetail(raw, ['REQ | Estampado', 'ESTAMPADO', 'CONV | ESTAMPADO | FOIL']);
    if (estampado) parts.push(`Estampado (${estampado})`);
    const embosado = firstQuoteDetail(raw, ['REQ | Embosado', 'EMBOSADO | TIPO', 'EMBOSADO']);
    if (embosado) parts.push(['si', 'sí', 'yes', 'true', '1'].includes(embosado.toLowerCase()) ? 'Embosado' : `Embosado (${embosado})`);
    const numeracion = firstQuoteDetail(raw, ['REQ | Numeracion Resumen', 'REQ | Numeracion Detalle', 'REQ | Numeracion', 'ACABADOS | NUMERADO']);
    if (numeracion) parts.push(`Numeración (${numeracion})`);
    return parts;
}

function isQuoteLineNoPrint(row) {
    const raw = row.rawData || {};
    const values = [
        raw['SIN IMPRESION'],
        raw['SIN IMPRESIÓN'],
        raw['REQ | Sin Impresion'],
        raw['REQ | Sin Impresión'],
        row.processType
    ];
    return values.some((value) => {
        const normalized = normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return ['si', 'sí', 'yes', 'true', '1'].includes(normalized) || normalized === 'sin impresion';
    });
}

function renderQuoteLineDetail(row, index) {
    const raw = row.rawData || {};
    const lineCode = cleanQuoteDetail(row.linea || row.originalLinea || `LC${String(index + 1).padStart(5, '0')}`);
    const productId = cleanQuoteDetail(row.productId);
    const title = cleanQuoteDetail(row.nombreTrabajo) || 'Sin nombre';
    const measure = cleanQuoteDetail(row.medida);
    const quantities = formatQuoteLineQuantities(row);
    const material = cleanQuoteDetail(row.material || raw['REQ | Sustrato'] || raw['SUSTRATO'] || raw['MATERIAL']);
    const machine = cleanQuoteDetail(row.machineName);
    const die = formatQuoteLineDie(row);
    const finishParts = buildQuoteLineFinishParts(row);
    const noPrint = isQuoteLineNoPrint(row);
    const secondLine = [
        quantities ? `Cantidad: ${quantities}` : '',
        material
    ].filter(Boolean).join(' | ');
    const thirdLineParts = [
        machine ? escapeHtml(machine) : (noPrint ? '' : '<span class="is-warning">Sin máquina</span>'),
        die ? escapeHtml(die) : ''
    ].filter(Boolean);
    const thirdLine = thirdLineParts.join(' - ');
    const fourthLine = finishParts.length
        ? finishParts.map((part) => escapeHtml(part)).join(' - ')
        : (die ? '' : '<span class="is-warning">Sin acabados</span>');
    return `
        <div class="quote-master-line-detail">
            <div class="quote-master-line-detail-main">
                ${lineCode ? `<span class="quote-master-line-ref">(${escapeHtml(lineCode)})</span>` : ''}
                <span class="quote-master-line-product">${escapeHtml(title)}</span>
                ${measure ? `<span class="quote-master-line-measure">(${escapeHtml(measure)})</span>` : ''}
            </div>
            ${productId && productId !== lineCode ? `<div class="quote-master-line-detail-row">Producto: ${escapeHtml(productId)}</div>` : ''}
            ${secondLine ? `<div class="quote-master-line-detail-row">${escapeHtml(secondLine)}</div>` : ''}
            ${thirdLine ? `<div class="quote-master-line-detail-row">${thirdLine}</div>` : ''}
            ${fourthLine ? `<div class="quote-master-line-detail-row">${fourthLine}</div>` : ''}
            ${frontBackChipMarkup(row)}
        </div>
    `;
}

function lineMenuIconConfig(key, fallbackValue, fallbackColor = '#46515d', fallbackSize = 18) {
    const iconKeyMap = {
        duplicate: ['lineDuplicate'],
        copy: ['lineCopy'],
        product: ['lineCreateProduct', 'dashboardProducts'],
        createQuote: ['lineCreateQuote'],
        frontBack: ['lineCreateQuote'],
        createOrder: ['lineCreateProductionOrder'],
        export: ['lineExport'],
        attachments: ['lineAttachments'],
        delete: ['lineDelete', 'loginRepositoryDelete', 'adminUserDelete']
    };
    const canonicalMap = {
        duplicate: 'lineDuplicate',
        copy: 'lineCopy',
        product: 'lineCreateProduct',
        createQuote: 'lineCreateQuote',
        frontBack: 'lineCreateQuote',
        createOrder: 'lineCreateProductionOrder',
        export: 'lineExport',
        attachments: 'lineAttachments',
        delete: 'lineDelete'
    };
    const conf = getResolvedIcon(iconKeyMap[key] || [], canonicalMap[key]);
    const suffixMap = {
        duplicate: 'LineDuplicate',
        copy: 'LineCopy',
        product: 'LineCreateProduct',
        createQuote: 'LineCreateQuote',
        frontBack: 'LineCreateQuote',
        createOrder: 'LineCreateProductionOrder',
        export: 'LineExport',
        attachments: 'LineAttachments',
        delete: 'LineDelete'
    };
    const suffix = suffixMap[key] || '';
    const color = loadedConfig?.general?.[`iconColor${suffix}`] || conf.color || fallbackColor;
    const hover = loadedConfig?.general?.[`iconColorHover${suffix}`] || (key === 'delete' ? '#d03535' : '#0b81b8');
    const size = Number(loadedConfig?.general?.[`iconSize${suffix}`]) || conf.size || fallbackSize;
    return {
        value: conf.value || fallbackValue,
        color,
        hover,
        size
    };
}

function lineMenuIconMarkup(key, label, fallbackValue, danger = false) {
    const conf = lineMenuIconConfig(key, fallbackValue, danger ? '#a74343' : '#46515d', 18);
    return `
        <span class="row-action-menu-icon" style="--menu-icon-color:${escapeHtml(conf.color)};--menu-icon-hover-color:${escapeHtml(conf.hover)};--menu-icon-size:${escapeHtml(String(conf.size))}px;--config-icon-size:${escapeHtml(String(conf.size))}px;">
            ${iconMarkup(conf.value, label, 'table-icon-media')}
        </span>
    `;
}

function ensureLineActionModal() {
    if (lineActionModal) return lineActionModal;
    lineActionModal = document.createElement('div');
    lineActionModal.id = 'lineActionModal';
    lineActionModal.className = 'socios-create-popover line-action-popover';
    lineActionModal.hidden = true;
    document.body.appendChild(lineActionModal);
    lineActionModal.addEventListener('click', handleLineActionModalClick);
    lineActionModal.addEventListener('input', handleLineActionModalInput);
    lineActionModal.addEventListener('change', handleLineActionModalChange);
    return lineActionModal;
}

function closeLineActionModal() {
    if (!lineActionModal) return;
    lineActionModal.hidden = true;
    lineActionModal.innerHTML = '';
    lineActionState = { row: null, mode: '' };
    document.body.classList.remove('popover-open');
}

function openLineActionModal(title, bodyHtml) {
    const modal = ensureLineActionModal();
    modal.innerHTML = `
        <div class="socios-create-popover-backdrop" data-line-action-close="true"></div>
        <section class="socios-create-popover-panel line-action-popover-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
            <div class="copy-popover-body line-action-popover-body">
                <div class="copy-popover-header socios-create-header">
                    <div><h2>${escapeHtml(title)}</h2></div>
                    <button type="button" class="calc-popover-close" data-line-action-close="true" aria-label="Cerrar">×</button>
                </div>
                ${bodyHtml}
            </div>
        </section>
    `;
    modal.hidden = false;
    document.body.classList.add('popover-open');
}

function destinationQuoteRowsMarkup(items = []) {
    if (!items.length) return '<tr><td colspan="5">No hay cotizaciones para mostrar.</td></tr>';
    return items.map((item) => `
        <tr>
            <td>${escapeHtml(item.quote_code || '')}</td>
            <td>${escapeHtml(item.customer_name || '')}</td>
            <td>${escapeHtml(item.job_name || item.product_name || '')}</td>
            <td>${escapeHtml(formatDate(item.created_on) || '')}</td>
            <td><button type="button" class="line-action-select" data-select-destination-quote="${escapeHtml(item.quote_code || '')}">Seleccionar</button></td>
        </tr>
    `).join('');
}

async function loadDestinationQuotes(term = '') {
    const results = document.getElementById('lineActionQuoteResults');
    const row = lineActionState.row;
    if (!results || !row) return;
    results.innerHTML = '<tr><td colspan="5">Buscando cotizaciones...</td></tr>';
    const params = new URLSearchParams({ q: term, excludeQuote: row.quoteId || '', limit: '30' });
    const payload = await fetchJson(`/api/cotizaciones-destino?${params.toString()}`, { headers: sessionHeader() });
    results.innerHTML = destinationQuoteRowsMarkup(payload.items || []);
}

function openQuoteDestinationModal(row, mode = 'copy') {
    lineActionState = { row, mode };
    openLineActionModal('Buscar cotización destino', `
        <div class="line-action-search-row">
            <input id="lineActionQuoteSearch" class="copy-popover-search quote-browser-search" type="search" placeholder="Buscar por cotización, cliente, producto o proceso">
            <button type="button" class="action-btn quote-browser-action-btn" data-create-new-quote-from-line>Crear nueva</button>
        </div>
        <div class="copy-popover-table-wrap line-action-table-wrap">
            <table class="copy-popover-table">
                <thead><tr><th>Cotización</th><th>Cliente</th><th>Producto</th><th>Creación</th><th></th></tr></thead>
                <tbody id="lineActionQuoteResults"></tbody>
            </table>
        </div>
    `);
    document.getElementById('lineActionQuoteSearch')?.focus();
    loadDestinationQuotes('').catch((error) => setStatus(error.message, 'error'));
}

async function copyLineToDestinationQuote(targetQuoteCode) {
    const row = lineActionState.row;
    if (!row || !targetQuoteCode) return;
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/copiar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeader() },
        body: JSON.stringify({ targetQuoteCode })
    });
    closeLineActionModal();
    await loadQuotes();
    setStatus(`Línea ${row.linea} copiada a ${targetQuoteCode}.`, 'saved');
}

async function createNewQuoteFromLine(row) {
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/nueva-cotizacion`, {
        method: 'POST',
        headers: sessionHeader()
    });
    closeLineActionModal();
    await loadQuotes();
    setStatus(`Cotización ${payload?.cotizacion?.quote_code || ''} creada desde la línea ${row.linea}.`, 'saved');
}

function attachmentRowsMarkup(items = []) {
    if (!items.length) return '<tr><td colspan="5">Esta línea no tiene adjuntos.</td></tr>';
    return items.map((item) => `
        <tr>
            <td>${escapeHtml(item.classification || item.category || item.notes || item.label || item.key || 'Adjunto')}</td>
            <td>${escapeHtml(item.file_name || item.filename || item.label || item.key || 'Adjunto')}${item.size_bytes ? `<span class="attachment-card-meta">${escapeHtml(formatFileSize(item.size_bytes))}</span>` : ''}</td>
            <td>${escapeHtml(item.uploaded_by || 'admin')}</td>
            <td>${escapeHtml(formatDateTimeShort(item.created_at))}</td>
            <td>${item.isStored ? `<a class="line-action-select" href="/api/adjuntos/${escapeHtml(item.id)}/download" target="_blank" rel="noopener noreferrer">Descargar</a>` : ''}</td>
        </tr>
    `).join('');
}

async function loadLineAttachmentsModal(row) {
    const body = document.getElementById('lineActionAttachmentRows');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="5">Cargando adjuntos...</td></tr>';
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/adjuntos`, { headers: sessionHeader() });
    body.innerHTML = attachmentRowsMarkup(payload.items || []);
}

function openLineAttachmentsModal(row) {
    lineActionState = { row, mode: 'attachments' };
    openLineActionModal(`Adjuntos de ${row.linea || 'línea'}`, `
        <div class="line-action-upload-row">
            <label class="quote-request-field"><span>Clasificación</span><input id="lineActionAttachmentClass" class="quote-request-input" type="text" placeholder="Arte, visto bueno, orden, referencia"></label>
            <input id="lineActionAttachmentFile" type="file" multiple hidden>
            <button type="button" class="action-btn quote-browser-action-btn" data-pick-line-attachment>Elegir archivo</button>
            <button type="button" class="action-btn quote-browser-action-btn" data-upload-line-attachment>Subir</button>
            <span id="lineActionAttachmentName" class="attachment-upload-name">Ningún archivo seleccionado</span>
        </div>
        <div class="copy-popover-table-wrap line-action-table-wrap">
            <table class="copy-popover-table attachments-table">
                <thead><tr><th>Clasificación</th><th>Archivo</th><th>Usuario</th><th>Fecha</th><th></th></tr></thead>
                <tbody id="lineActionAttachmentRows"></tbody>
            </table>
        </div>
    `);
    loadLineAttachmentsModal(row).catch((error) => setStatus(error.message, 'error'));
}

async function uploadLineActionAttachments() {
    const row = lineActionState.row;
    const input = document.getElementById('lineActionAttachmentFile');
    const classification = String(document.getElementById('lineActionAttachmentClass')?.value || '').trim();
    const files = Array.from(input?.files || []);
    if (!row || !files.length) throw new Error('Selecciona al menos un archivo.');
    for (const file of files) {
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/adjuntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileExt: (file.name.split('.').pop() || '').toLowerCase(),
                contentBase64: await readAsBase64(file),
                notes: classification || 'Adjunto'
            })
        });
    }
    if (input) input.value = '';
    const name = document.getElementById('lineActionAttachmentName');
    if (name) name.textContent = 'Ningún archivo seleccionado';
    await loadLineAttachmentsModal(row);
    setStatus('Adjuntos actualizados.', 'saved');
}

function readQuoteTrackingStore() {
    try {
        const parsed = JSON.parse(localStorage.getItem(QUOTE_TRACKING_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
}

function initialsFromName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') : '•';
}

function trackingColorForName(name) {
    const palette = ['#2B7FC7', '#1A9E75', '#7C5CBF', '#C0761F', '#4B6F8F'];
    const total = Array.from(String(name || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[total % palette.length];
}

function trackingMilestonesForRow(row = {}) {
    const raw = row.rawData || {};
    const session = readUserSession() || {};
    const sellerName = row.lineSummary?.salesperson_name || raw.VENDEDOR || raw['VENDEDOR | USUARIO'] || 'Vendedor';
    const currentUser = session.name || session.fullName || session.username || session.user || sellerName || 'Usuario';
    const status = normalizeProformaIssueText(row.estado || raw['ESTADO LINEA'] || raw['SOLICITUD ESTADO']);
    const quoteDone = ['cotizada', 'finalizada', 'proforma', 'enviada', 'cerrada', 'produccion'].some((item) => status.includes(item));
    const requestDone = ['pendiente', 'solicitud', 'vendedor', 'cotiz', 'finaliz', 'proforma', 'enviad', 'cerrad'].some((item) => status.includes(item))
        || normalizeProformaIssueText(raw['TRAZABILIDAD | SOLICITUD VENDEDOR']) === 'si';
    const requestUser = requestDone ? (raw['TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR'] || sellerName) : '';
    const requestDate = requestDone ? (raw['TRAZABILIDAD | FECHA SOLICITUD VENDEDOR'] || raw['TRAZABILIDAD | FECHA'] || '') : '';
    const defaults = [
        { key: 'creacion', label: 'Creación', user: sellerName, date: formatDate(row.lineSummary?.created_on || raw['FECHA CREACION DATE'] || raw['FECHA CREACION']), done: true },
        { key: 'solicitud', label: 'Solicitud del vendedor', user: requestUser, date: requestDate, done: requestDone },
        { key: 'finalizacion', label: 'Finalización de cotización', user: quoteDone ? currentUser : '', date: quoteDone ? formatDateTimeShort(Date.now()) : '', done: quoteDone },
        { key: 'envio', label: 'Envío de proforma', user: '', date: '', done: false },
        { key: 'cierre', label: 'Finalización comercial', user: '', date: '', done: false }
    ];
    const stored = readQuoteTrackingStore()[`${row.quoteId || 'cotizacion'}::${row.linea || 'linea'}`] || {};
    const saved = Array.isArray(stored.milestones) ? stored.milestones : [];
    return defaults.map((item) => {
        const savedItem = saved.find((entry) => entry?.key === item.key);
        return savedItem ? { ...item, ...savedItem, label: item.label } : item;
    });
}

function openLineTrackingModal(row) {
    const milestones = trackingMilestonesForRow(row);
    const doneCount = milestones.filter((item) => item.done).length;
    lineActionState = { row, mode: 'tracking' };
    openLineActionModal(`Seguimiento ${row.linea || ''}`, `
        <div class="line-tracking-head">
            <strong>${escapeHtml(row.quoteId || '')} · ${escapeHtml(row.nombreTrabajo || row.productId || '')}</strong>
            <span>${doneCount} de ${milestones.length} completados</span>
        </div>
        <div class="line-tracking-list">
            ${milestones.map((item) => {
                const name = item.user || 'Pendiente';
                return `<article class="line-tracking-item${item.done ? ' is-done' : ''}">
                    <span class="line-tracking-avatar" style="background:${escapeHtml(trackingColorForName(name))};">${escapeHtml(initialsFromName(name))}</span>
                    <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(name)}</span><em>${escapeHtml(item.date || 'Pendiente')}</em></div>
                </article>`;
            }).join('')}
        </div>
    `);
}

function handleLineActionModalInput(event) {
    if (event.target?.id !== 'lineActionQuoteSearch') return;
    clearTimeout(lineActionSearchTimer);
    lineActionSearchTimer = setTimeout(() => {
        loadDestinationQuotes(event.target.value || '').catch((error) => setStatus(error.message, 'error'));
    }, 220);
}

function handleLineActionModalChange(event) {
    if (event.target?.id !== 'lineActionAttachmentFile') return;
    const files = Array.from(event.target.files || []);
    const name = document.getElementById('lineActionAttachmentName');
    if (name) name.textContent = files.length ? files.map((file) => file.name).join(', ') : 'Ningún archivo seleccionado';
}

function handleLineActionModalClick(event) {
    if (event.target.closest('[data-line-action-close]')) {
        event.preventDefault();
        closeLineActionModal();
        return;
    }
    const selectQuote = event.target.closest('[data-select-destination-quote]');
    if (selectQuote) {
        event.preventDefault();
        copyLineToDestinationQuote(selectQuote.dataset.selectDestinationQuote).catch((error) => setStatus(error.message, 'error'));
        return;
    }
    if (event.target.closest('[data-create-new-quote-from-line]')) {
        event.preventDefault();
        createNewQuoteFromLine(lineActionState.row).catch((error) => setStatus(error.message, 'error'));
        return;
    }
    if (event.target.closest('[data-pick-line-attachment]')) {
        event.preventDefault();
        document.getElementById('lineActionAttachmentFile')?.click();
        return;
    }
    if (event.target.closest('[data-upload-line-attachment]')) {
        event.preventDefault();
        uploadLineActionAttachments().catch((error) => setStatus(error.message, 'error'));
    }
}

// Drag state for line reordering
let lineDragState = null;
let lineDragDropInitialized = false;

function renderQuoteLineCard(row, index, totalLines, treeOptions = {}) {
    quoteLineLookup.set(row.id, row);
    const reorderConf = getResolvedIcon(['lineReorder', 'tableMove'], 'lineReorder');
    const editConf = getResolvedIcon(['lineEdit', 'tableEdit', 'quoteLineEdit'], 'lineEdit');
    if (String(editConf.value || '').includes('icons-lineEdit.svg')) editConf.value = '✏️';
    const menuConf = getResolvedIcon(['lineMenu', 'tableActions'], 'lineMenu');
    const editColor = loadedConfig?.general?.iconColorLineEdit || loadedConfig?.general?.iconColorTableEdit || editConf.color || '#0b81b8';
    const editHover = loadedConfig?.general?.iconColorHoverLineEdit || loadedConfig?.general?.iconColorHoverTableEdit || editConf.hover || '#07638c';
    const editSize = Number(loadedConfig?.general?.iconSizeLineEdit || loadedConfig?.general?.iconSizeTableEdit) || editConf.size || 18;
    const menuColor = loadedConfig?.general?.iconColorLineMenu || menuConf.color || '#607286';
    const menuHover = loadedConfig?.general?.iconColorHoverLineMenu || menuConf.hover || '#0b81b8';
    const menuSize = Number(loadedConfig?.general?.iconSizeLineMenu) || menuConf.size || 18;
    const canCreateProduct = canCreateModule('productos');
    const frontBackGroup = getFrontBackGroup(row);
    const isFrontBackElement = frontBackGroup?.role === 'elemento';
    const displayIndex = Number.isFinite(Number(treeOptions.sourceIndex)) && Number(treeOptions.sourceIndex) >= 0
        ? Number(treeOptions.sourceIndex)
        : index;
    const isTreeGroup = treeOptions.kind === 'group' && Number(treeOptions.childCount || 0) > 0;
    const isTreeChild = treeOptions.kind === 'child';
    const treeClass = isTreeGroup ? ' is-front-back-parent' : (isTreeChild ? ' is-front-back-child' : '');
    const treeAttrs = isTreeGroup
        ? ` data-front-back-group-key="${escapeHtml(treeOptions.groupKey || '')}" aria-expanded="${treeOptions.expanded ? 'true' : 'false'}"`
        : (isTreeChild ? ` data-front-back-parent-key="${escapeHtml(treeOptions.groupKey || '')}"` : '');
    const groupToggle = isTreeGroup
        ? `<button type="button" class="quote-master-line-tree-toggle" data-front-back-toggle="${escapeHtml(treeOptions.groupKey || '')}" aria-expanded="${treeOptions.expanded ? 'true' : 'false'}" aria-label="${treeOptions.expanded ? 'Contraer grupo frente/dorso' : 'Desplegar grupo frente/dorso'}">${treeOptions.expanded ? '▾' : '▸'}</button>`
        : '<span class="quote-master-line-tree-spacer" aria-hidden="true"></span>';
    return `
        <article class="quote-master-line${treeClass}" data-line-id="${row.id}" data-line-index="${displayIndex}" data-quote-id="${escapeHtml(row.quoteId)}"${treeAttrs} draggable="true">
            <div class="quote-master-line-order" title="Arrastrar para reordenar">
                ${groupToggle}
                <span class="quote-master-line-num">${displayIndex + 1}</span>
                <span class="quote-master-drag-handle" aria-hidden="true" style="--icon-color:${escapeHtml(reorderConf.color)};--icon-hover-color:${escapeHtml(reorderConf.hover)};--config-icon-size:${escapeHtml(String(reorderConf.size || 18))}px;">${iconMarkup(reorderConf.value, 'Ordenar línea', 'table-icon-media')}</span>
            </div>
            <div class="quote-master-line-body">
                ${renderQuoteLineDetail(row, index)}
            </div>
            <div class="quote-master-line-right">
                <span class="quote-master-line-total">${escapeHtml(formatMoney(row.subtotal1))}</span>
                <div class="quote-line-actions row-tools row-tools-row-end">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <div class="quote-line-menu-wrap" data-line-menu-id="${row.id}">
                        <button type="button" class="quote-line-icon-btn quote-line-menu-trigger" data-line-menu-toggle="${row.id}" title="Más opciones" aria-label="Más opciones" aria-haspopup="true" aria-expanded="false" style="--icon-color:${escapeHtml(menuColor)};--icon-hover-color:${escapeHtml(menuHover)};--config-icon-size:${escapeHtml(String(menuSize))}px;">${iconMarkup(menuConf.value, 'Más opciones', 'table-icon-media')}</button>
                        <button type="button" class="quote-line-icon-btn quote-line-edit-btn" data-line-action="edit" data-line-id="${row.id}" title="Editar cálculo" aria-label="Editar" style="--icon-color:${escapeHtml(editColor)};--icon-hover-color:${escapeHtml(editHover)};--config-icon-size:${escapeHtml(String(editSize))}px;">${iconMarkup(editConf.value, 'Editar cálculo', 'table-icon-media')}</button>
                        <div class="quote-line-menu-panel" data-line-menu-panel="${row.id}" hidden>
                            <div class="row-action-menu-list">
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="duplicate" data-line-id="${row.id}">${lineMenuIconMarkup('duplicate', 'Duplicar Línea', '⎘')}<span>Duplicar Línea</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="copy" data-line-id="${row.id}">${lineMenuIconMarkup('copy', 'Copiar Línea a Otra Cotización', '⎘')}<span>Copiar Línea a Otra Cotización</span></button>
                                ${canCreateProduct ? `<button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-product" data-line-id="${row.id}">${lineMenuIconMarkup('product', 'Convertir en producto', '▣')}<span>Convertir en producto</span></button>` : ''}
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-quote" data-line-id="${row.id}">${lineMenuIconMarkup('createQuote', 'Crear nueva cotización a partir de esta línea', '▣')}<span>Crear nueva cotización a partir de esta línea</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="front-back" data-line-id="${row.id}">${lineMenuIconMarkup('frontBack', 'Frente/Dorso', 'FD')}<span>${frontBackGroup ? 'Editar Frente/Dorso' : 'Crear Frente/Dorso'}</span></button>
                                ${row.finalizadaOrden && !isFrontBackElement ? `<button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-production-order" data-line-id="${row.id}">${lineMenuIconMarkup('createOrder', 'Crear orden de producción', '⚒')}<span>Crear orden de producción</span></button>` : ''}
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="export" data-line-id="${row.id}">${lineMenuIconMarkup('export', 'Exportar Línea a Excel', '⭳')}<span>Exportar Línea a Excel</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="attachments" data-line-id="${row.id}">${lineMenuIconMarkup('attachments', 'Ver Adjuntos', '📎')}<span>Ver Adjuntos</span></button>
                                <div class="row-action-menu-section-divider" aria-hidden="true"></div>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="tracking" data-line-id="${row.id}">${lineMenuIconMarkup('frontBack', 'Seguimiento', 'FD')}<span>Seguimiento</span></button>
                                <div class="row-action-menu-section-divider" aria-hidden="true"></div>
                                <button type="button" class="row-action-menu-item quote-line-menu-item is-danger" data-line-action="delete" data-line-id="${row.id}">${lineMenuIconMarkup('delete', 'Eliminar Línea', '×', true)}<span>Eliminar Línea</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function renderQuoteLinesPanel(quoteCode) {
    const canCreateQuoteLines = canCreateModule('cotizaciones');
    const proformaConf = getResolvedIcon(['lineProforma', 'proformaView'], 'lineProforma');
    const addConf = getResolvedIcon(['lineAdd', 'tableAdd'], 'lineAdd');
    const escapedCode = escapeHtml(quoteCode);
    const footer = `
        <div class="quote-master-lines-footer">
            ${canCreateQuoteLines ? `<button type="button" class="quote-browser-action-btn quote-line-add-btn" data-add-line="${escapedCode}" title="Agregar línea de cálculo" style="--icon-color:${escapeHtml(addConf.color)};--icon-hover-color:${escapeHtml(addConf.hover)};--config-icon-size:${escapeHtml(String(addConf.size || 18))}px;" onclick="this.disabled=true;this.querySelector('span').textContent='Cargando...';createQuoteLineAndOpenCalculation('${escapedCode}').catch(e=>setStatus(e.message,'error')).finally(()=>{this.disabled=false;this.querySelector('span').innerHTML='${escapeHtml(iconMarkup(addConf.value, 'Agregar línea', 'table-icon-media'))} Agregar línea'})">
                <span class="quote-line-action-icon" aria-hidden="true">${iconMarkup(addConf.value, 'Agregar línea', 'table-icon-media')}</span> Agregar línea
            </button>` : ''}
            <button type="button" class="quote-browser-action-btn quote-line-proforma-btn" data-print-proforma="${escapedCode}" title="Ver Proforma" style="--icon-color:${escapeHtml(proformaConf.color)};--icon-hover-color:${escapeHtml(proformaConf.hover)};--config-icon-size:${escapeHtml(String(proformaConf.size || 16))}px;" onclick="openProformaIfReady('${escapedCode}').catch(e=>setStatus(e.message,'error'))">
                <span class="quote-line-action-icon" aria-hidden="true">${iconMarkup(proformaConf.value, 'Ver Proforma', 'table-icon-media')}</span> Ver Proforma
            </button>
        </div>
    `;
    if (quoteLineLoading.has(quoteCode)) {
        return `<div class="quote-master-line-message">Cargando líneas de cálculo...</div>${footer}`;
    }
    const lines = quoteLineCache.get(quoteCode);
    if (!lines) {
        return `<div class="quote-master-line-message">Abre esta cotización para cargar sus líneas.</div>${footer}`;
    }
    if (!lines.length) {
        return `<div class="quote-master-line-message">Esta cotización todavía no tiene líneas de cálculo.</div>${footer}`;
    }
    const treeNodes = buildFrontBackLineTree(lines, quoteCode);
    return `<div class="quote-master-lines">${treeNodes.map((node, index) => renderQuoteLineCard(node.line, index, lines.length, {
        kind: node.kind,
        sourceIndex: node.sourceIndex,
        groupKey: node.key,
        childCount: node.childCount,
        expanded: node.expanded
    })).join('')}</div>${footer}`;
}

function quoteStatusInfo(item = {}) {
    const raw = normalizeText([item.status, item.line_statuses].filter(Boolean).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (['pendiente', 'solicitud', 'solicitad', 'vendedor'].some((token) => raw.includes(token))) {
        return { label: 'Solicitada', state: 'pending' };
    }
    if (['finaliz', 'proforma', 'enviad', 'cerrad', 'produccion'].some((token) => raw.includes(token)) || /\bcotizada\b/.test(raw)) {
        return { label: 'Cotizada', state: 'quoted' };
    }
    return { label: 'No enviado', state: 'unsent' };
}

function renderQuoteParentRow(item) {
    const quoteCode = item.quote_code || '';
    const isExpanded = expandedQuoteCodes.has(quoteCode);
    const cachedLines = quoteLineCache.get(quoteCode) || [];
    const lineCount = Math.max(0, Number(item.line_count || cachedLines.length || 0));
    const total = cachedLines.length
        ? formatMoney(quoteTotalFromLines(cachedLines))
        : (lineCount > 0 ? formatMoney(item.quote_total) : '—');
    const toggleConf = getResolvedIcon([isExpanded ? 'quoteCollapse' : 'quoteExpand'], isExpanded ? 'quoteCollapse' : 'quoteExpand');
    const openConf = getResolvedIcon(['browserOpen', 'tableOpen'], 'tableOpen');
    const openColor = loadedConfig?.general?.iconColorBrowserOpen || loadedConfig?.general?.iconColorTableOpen || '#0b81b8';
    const openHover = loadedConfig?.general?.iconColorHoverBrowserOpen || loadedConfig?.general?.iconColorHoverTableOpen || '#07638c';
    const openSize = Number(loadedConfig?.general?.iconSizeBrowserOpen || loadedConfig?.general?.iconSizeTableOpen) || openConf.size || 18;
    const deleteConf = getResolvedIcon(['lineDelete', 'loginRepositoryDelete', 'adminUserDelete'], 'lineDelete');
    const deleteColor = loadedConfig?.general?.iconColorLineDelete || '#a74343';
    const deleteHover = loadedConfig?.general?.iconColorHoverLineDelete || '#d03535';
    const deleteSize = Number(loadedConfig?.general?.iconSizeLineDelete) || deleteConf.size || 18;
    const customerName = item.customer_name || '';
    const customerCode = item.customer_code || '';
    const statusInfo = quoteStatusInfo(item);
    const createdOn = formatDate(item.created_on);
    const dueOn = formatDate(item.due_on);
    return `
        <tr class="quote-master-row ${isExpanded ? 'is-expanded' : ''}" data-quote-code="${escapeHtml(quoteCode)}">
            <td class="quote-master-td-toggle">
                <button type="button" class="quote-master-toggle" data-toggle-quote="${escapeHtml(quoteCode)}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="${isExpanded ? 'Contraer' : 'Expandir'} cotización" style="--icon-color:${escapeHtml(toggleConf.color)};--icon-hover-color:${escapeHtml(toggleConf.hover)};--config-icon-size:${escapeHtml(String(toggleConf.size || 18))}px;">
                    <span class="quote-master-toggle-glyph" aria-hidden="true">${iconMarkup(toggleConf.value, isExpanded ? 'Contraer' : 'Expandir', 'table-icon-media')}</span>
                    <span class="quote-master-toggle-count">${lineCount}</span>
                </button>
            </td>
            <td class="quote-master-td-code">
                <button type="button" class="quote-master-code" data-open-quote="${escapeHtml(quoteCode)}">${escapeHtml(quoteCode)}</button>
            </td>
            <td class="quote-master-td-info">
                <div class="quote-master-info-block">
                    <span class="quote-master-info-name">${escapeHtml(customerName)}</span>
                    ${customerCode ? `<span class="quote-master-info-code">${escapeHtml(customerCode)}</span>` : ''}
                    <span class="quote-status-chip" data-state="${escapeHtml(statusInfo.state)}">${escapeHtml(statusInfo.label)}</span>
                </div>
            </td>
            <td class="quote-master-td-date">${escapeHtml(createdOn)}</td>
            <td class="quote-master-td-date">${escapeHtml(dueOn)}</td>
            <td class="quote-master-td-total">${escapeHtml(total)}</td>
            <td class="quote-master-td-actions">
                <div class="quote-browser-actions row-tools row-tools-row-end">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <button type="button" class="browser-open-link" data-open-quote="${escapeHtml(quoteCode)}" aria-label="Abrir cotizacion" title="Abrir cotización" style="--icon-color:${escapeHtml(openColor)};--icon-hover-color:${escapeHtml(openHover)};--config-icon-size:${escapeHtml(String(openSize))}px;">${iconMarkup(openConf.value, 'Abrir cotizacion', 'table-icon-media')}</button>
                    <span class="row-action-divider row-action-divider-hidden" aria-hidden="true"></span>
                    <button type="button" class="browser-open-link browser-open-link-danger" data-delete-quote="${escapeHtml(quoteCode)}" aria-label="Eliminar cotizacion" title="Eliminar cotización" style="--icon-color:${escapeHtml(deleteColor)};--icon-hover-color:${escapeHtml(deleteHover)};--config-icon-size:${escapeHtml(String(deleteSize))}px;">${iconMarkup(deleteConf.value, 'Eliminar cotizacion', 'table-icon-media')}</button>
                </div>
            </td>
        </tr>
        ${isExpanded ? `<tr class="quote-master-lines-row"><td colspan="7">${renderQuoteLinesPanel(quoteCode)}</td></tr>` : ''}
    `;
}

async function refreshQuoteLines(quoteCode) {
    await fetchQuoteLines(quoteCode, { force: true });
    const allQuotes = getFilteredQuotes();
    const quoteIndex = allQuotes.findIndex(q => q.quote_code === quoteCode);
    if (quoteIndex >= 0) {
        const lines = quoteLineCache.get(quoteCode);
        allQuotes[quoteIndex].line_count = lines ? lines.length : 0;
    }
    renderQuotesTable(allQuotes);
    // Renderizar el panel de líneas si la cotización está expandida
    if (expandedQuoteCodes.has(quoteCode)) {
        renderQuoteLinesPanel(quoteCode);
    }
}

function openQuoteDocument(quoteCode, options = {}) {
    if (!quoteCode) return;
    const params = new URLSearchParams({ codigo: quoteCode });
    if (options.copyLine) params.set('copyLine', options.copyLine);
    const route = `/cotizaciones/documento?${params.toString()}`;
    if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) {
        window.location.href = route;
    }
}

function openLineCalculation(row, options = {}) {
    if (!row?.quoteId || !row?.linea) return;
    const route = `/calculo-flexografia?${new URLSearchParams({
        lineId: row.linea,
        quoteId: row.quoteId,
        productId: row.productId || '',
        department: row.departamento || ''
    }).toString()}`;
    if (options.newTab) {
        if (!openRouteInShell(route, `Cálculo ${row.linea}`)) {
            window.open(route, '_blank', 'noopener');
        }
        return;
    }
    if (!openRouteInShell(route, `Cálculo ${row.linea}`)) {
        window.location.href = route;
    }
}

async function createQuoteLineAndOpenCalculation(quoteCode) {
    const currentLines = quoteLineCache.get(quoteCode) || [];
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...sessionHeader()
        },
        body: JSON.stringify({
            line_order: currentLines.length + 1,
            department: 'Flexografia',
            status: 'Borrador'
        })
    });
    const line = payload?.linea ? normalizeQuoteLine(payload.linea, quoteCode) : null;
    if (!line?.quoteId || !line?.linea) {
        throw new Error('No fue posible crear la nueva línea de cálculo.');
    }
    // Recargar las líneas de esta cotización y actualizar la vista
    await fetchQuoteLines(quoteCode, { force: true });
    const allQuotes = getFilteredQuotes();
    const quoteIndex = allQuotes.findIndex(q => q.quote_code === quoteCode);
    if (quoteIndex >= 0) {
        allQuotes[quoteIndex].line_count = (currentLines.length + 1);
    }
    renderQuotesTable(allQuotes);
    // Renderizar el panel de líneas si la cotización está expandida
    if (expandedQuoteCodes.has(quoteCode)) {
        renderQuoteLinesPanel(quoteCode);
    }
    openLineCalculation(line, { newTab: true });
}

async function persistQuoteLineOrder(quoteCode, lines) {
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/orden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lineas: lines.map((line, index) => ({
                line_code: line.originalLinea || line.linea,
                line_order: index + 1
            }))
        })
    });
    await refreshQuoteLines(quoteCode);
}

async function moveQuoteLine(row, direction) {
    const lines = quoteLineCache.get(row.quoteId) || await fetchQuoteLines(row.quoteId);
    const index = lines.findIndex((item) => item.linea === row.linea);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= lines.length) return;
    const nextLines = [...lines];
    const [moved] = nextLines.splice(index, 1);
    nextLines.splice(nextIndex, 0, moved);
    quoteLineCache.set(row.quoteId, nextLines);
    renderQuotesTable(getFilteredQuotes());
    await persistQuoteLineOrder(row.quoteId, nextLines);
}

function quoteLineActionLockKey(action, row) {
    return `${action}:${row?.quoteId || ''}:${row?.linea || row?.id || ''}`;
}

async function runQuoteLineActionLocked(action, row, task) {
    const key = quoteLineActionLockKey(action, row);
    if (quoteLineActionLocks.has(key)) return;
    quoteLineActionLocks.add(key);
    try {
        return await task();
    } finally {
        quoteLineActionLocks.delete(key);
    }
}

async function duplicateQuoteLine(row) {
    return runQuoteLineActionLocked('duplicate', row, async () => {
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/duplicar`, { method: 'POST' });
        await refreshQuoteLines(row.quoteId);
    });
}

async function createQuoteFromLine(row) {
    return openQuoteDestinationModal(row, 'create-quote');
}

async function createProductFromLine(row) {
    throw new Error('Convertir a producto está desactivado: falta definir el flujo final de creación de productos desde cotizaciones.');
}

function frontBackLineOptionMarkup(row, checked = false) {
    return `
        <label class="front-back-option">
            <input type="checkbox" name="frontBackElement" value="${escapeHtml(row.linea)}"${checked ? ' checked' : ''}>
            <span>
                <strong>${escapeHtml(row.linea)} · ${escapeHtml(row.nombreTrabajo || 'Sin nombre')}</strong>
                <span>${escapeHtml([row.material, row.machineName, row.medida].filter(Boolean).join(' · ') || 'Sin detalle técnico')}</span>
            </span>
        </label>
    `;
}

function renderFrontBackModal(row) {
    if (!frontBackModal || !frontBackCurrent || !frontBackOptions) return;
    const lines = quoteLineCache.get(row.quoteId) || [];
    const group = getFrontBackGroup(row);
    const selectedCodes = new Set(group?.elementLineCodes || []);
    const candidates = lines.filter((item) => {
        if (!item.linea || item.linea === row.linea) return false;
        const itemGroup = getFrontBackGroup(item);
        return !itemGroup || itemGroup.groupId === group?.groupId;
    });
    frontBackCurrent.innerHTML = `
        <strong>Línea grupo: ${escapeHtml(row.linea)} · ${escapeHtml(row.nombreTrabajo || 'Sin nombre')}</strong>
        <span>La proforma mostrará solo esta línea. Selecciona exactamente dos elementos productivos: frente y dorso.</span>
    `;
    frontBackOptions.innerHTML = candidates.length
        ? candidates.map((item) => frontBackLineOptionMarkup(item, selectedCodes.has(item.linea))).join('')
        : '<div class="front-back-current"><strong>Sin líneas disponibles</strong><span>Agrega dos líneas de cálculo para poder crear el grupo frente/dorso.</span></div>';
    if (frontBackWarning) {
        const warnings = group?.warnings || [];
        frontBackWarning.hidden = !warnings.length;
        frontBackWarning.textContent = warnings.length ? `Validar compatibilidad: ${warnings.join(' | ')}` : '';
    }
    if (frontBackUnlink) frontBackUnlink.hidden = !group;
    if (frontBackSave) frontBackSave.disabled = candidates.length < 2;
}

function openFrontBackModal(row) {
    if (!frontBackModal) return;
    const group = getFrontBackGroup(row);
    const lines = quoteLineCache.get(row.quoteId) || [];
    const modalRow = group?.role === 'elemento'
        ? (lines.find((item) => item.linea === group.groupLineCode) || row)
        : row;
    frontBackModalRow = modalRow;
    renderFrontBackModal(modalRow);
    frontBackModal.hidden = false;
    document.body.classList.add('popover-open');
}

function closeFrontBackModal() {
    if (!frontBackModal) return;
    frontBackModal.hidden = true;
    frontBackModalRow = null;
    document.body.classList.remove('popover-open');
}

async function saveFrontBackGroup() {
    const row = frontBackModalRow;
    if (!row?.quoteId || !row.linea) return;
    const selected = Array.from(frontBackModal?.querySelectorAll('input[name="frontBackElement"]:checked') || []).map((input) => input.value).filter(Boolean);
    if (selected.length !== 2) throw new Error('Selecciona exactamente dos elementos: frente y dorso.');
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/frente-dorso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            groupLineCode: row.linea,
            elementLineCodes: selected,
            label: 'Grupo Frente/Dorso'
        })
    });
    const savedGroup = payload?.group || {};
    const savedGroupKey = frontBackGroupKey(savedGroup, row.quoteId);
    if (savedGroupKey) expandedFrontBackGroupKeys.add(savedGroupKey);
    closeFrontBackModal();
    await refreshQuoteLines(row.quoteId);
    setStatus('Grupo frente/dorso guardado.', 'saved');
}

async function unlinkFrontBackGroup() {
    const row = frontBackModalRow;
    const group = getFrontBackGroup(row);
    if (!row?.quoteId || !group?.groupId) return;
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/frente-dorso/${encodeURIComponent(group.groupId)}`, {
        method: 'DELETE'
    });
    closeFrontBackModal();
    await refreshQuoteLines(row.quoteId);
    setStatus('Grupo frente/dorso eliminado.', 'saved');
}

async function createProductionOrder(row) {
    ensureLineReadyForOrder(row);
    if (!row?.finalizadaOrden) {
        throw new Error('Debes marcar la línea como finalizada antes de crear la orden de producción.');
    }
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/orden-produccion`, {
        method: 'POST'
    });
    if (payload.orden?.order_code) {
        setStatus(`Orden ${payload.orden.order_code} creada.`, 'saved');
        const route = `/orden-produccion/${encodeURIComponent(payload.orden.order_code)}`;
        if (!openRouteInShell(route, `Orden ${payload.orden.order_code}`)) {
            window.location.href = route;
        }
    }
}

async function toggleLineFinalized(row) {
    if (!row?.finalizadaOrden) ensureLineReadyForOrder(row);
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            finalized_for_order: !row.finalizadaOrden,
            status: row.estado,
            line_order: row.lineOrder,
            job_name: row.nombreTrabajo,
            material_name: row.material,
            process_type: row.processType || 'Convencional',
            product_code: row.productId || row.linea,
            total_cost: parseMoneyValue(row.subtotal1),
            unit_price: parseMoneyValue(row.subtotal1)
        })
    });
    await refreshQuoteLines(row.quoteId);
}

async function deleteQuoteLine(row) {
    return runQuoteLineActionLocked('delete', row, async () => {
        const confirmed = window.confirm(`Se eliminará la línea ${row.linea}. ¿Deseas continuar?`);
        if (!confirmed) return;
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}`, { method: 'DELETE' });
        await refreshQuoteLines(row.quoteId);
    });
}

async function handleQuoteLineAction(action, row) {
    if (!row) return;
    if (action === 'edit') return openLineCalculation(row);
    if (action === 'move-up') return moveQuoteLine(row, -1);
    if (action === 'move-down') return moveQuoteLine(row, 1);
    if (action === 'duplicate') return duplicateQuoteLine(row);
    if (action === 'copy') return openQuoteDestinationModal(row, 'copy');
    if (action === 'create-product') return createProductFromLine(row);
    if (action === 'create-quote') return createQuoteFromLine(row);
    if (action === 'front-back') return openFrontBackModal(row);
    if (action === 'create-production-order') return createProductionOrder(row);
    if (action === 'export') {
        window.open(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/exportar`, '_blank', 'noopener');
        return;
    }
    if (action === 'attachments') return openLineAttachmentsModal(row);
    if (action === 'tracking') return openLineTrackingModal(row);
    if (action === 'finalize') return toggleLineFinalized(row);
    if (action === 'delete') return deleteQuoteLine(row);
}

function renderQuotesTable(items) {
    if (!rowsBody) return;
    visibleQuotesCount = Array.isArray(items) ? items.length : 0;
    quoteLineLookup.clear();
    if (!items.length) {
        rowsBody.innerHTML = '<tr><td colspan="7">No hay cotizaciones.</td></tr>';
        requestAnimationFrame(updateQuotesScrollBottomIndicator);
        publishBdfgContext();
        return;
    }
    rowsBody.innerHTML = items.map(renderQuoteParentRow).join('');
    requestAnimationFrame(updateQuotesScrollBottomIndicator);
    publishBdfgContext();
}

function getFilteredQuotes() {
    const term = normalizeText(quotesSearchInput?.value).toLowerCase();
    if (!term) return quoteCatalog;
    return quoteCatalog.filter((item) => [item.quote_code, item.customer_code, item.customer_name, item.contact_name, item.salesperson_name]
        .some((value) => String(value || '').toLowerCase().includes(term)));
}

async function loadQuotes() {
    const params = new URLSearchParams({ limit: '200' });
    const search = normalizeText(quotesSearchInput?.value);
    if (search) params.set('q', search);
    const payload = await fetchJson(`${QUOTES_ENDPOINT}?${params.toString()}`, { headers: sessionHeader() });
    quoteCatalog = Array.isArray(payload.cotizaciones) ? payload.cotizaciones : [];
    if (selectedQuoteContextCode && !quoteCatalog.some((item) => item.quote_code === selectedQuoteContextCode)) {
        selectedQuoteContextCode = '';
        selectedQuoteContextLineId = 0;
    }
    renderQuotesTable(getFilteredQuotes());
}

async function refreshQuoteConfig(cachedConfig = null) {
    let nextConfig = null;
    try {
        nextConfig = await fetchJson(CONFIG_ENDPOINT, { cache: 'no-cache' });
    } catch (error) {
        if (cachedConfig) return;
        throw error;
    }
    const cacheableConfig = compactQuoteConfigForCache(nextConfig);
    if (!areQuoteConfigsEqual(cacheableConfig, cachedConfig)) {
        writeQuoteConfigCache(cacheableConfig);
    }
    applyQuoteConfig(nextConfig);
}

async function loadConfig() {
    const cachedConfig = readQuoteConfigCache();
    if (cachedConfig) {
        applyQuoteConfig(cachedConfig);
        refreshQuoteConfig(cachedConfig).catch((error) => {
            console.warn('No fue posible refrescar la configuración de cotizaciones.', error);
        });
        return;
    }
    await refreshQuoteConfig(cachedConfig);
}

function applyQuoteConfig(config) {
    loadedConfig = config || {};
    applyConfiguredIcons();
    renderRequestQuantityRepeater();
    syncFixedSizeTrigger();
    renderRequestProductTypeOptions();
    renderShapePicker();
    if (quoteCatalog.length) {
        renderQuotesTable(getFilteredQuotes());
    }
}

function applyExternalConfigUpdate(config) {
    if (config && typeof config === 'object') {
        const cacheableConfig = compactQuoteConfigForCache(config);
        writeQuoteConfigCache(cacheableConfig);
        applyQuoteConfig(config);
        return;
    }
    loadConfig().catch(console.error);
}

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'erp-general-config-updated') applyExternalConfigUpdate(event.data.config);
});

window.addEventListener('storage', (event) => {
    if (event.key === 'erp-general-config-updated') applyExternalConfigUpdate();
});

window.addEventListener('erp-general-config-updated', (event) => {
    applyExternalConfigUpdate(event.detail);
});

async function loadSmartCatalogs() {
    try {
        const payload = await fetchJson(SMART_CATALOGS_ENDPOINT);
        const substrateMaterials = Array.isArray(payload?.substrateMaterials) ? payload.substrateMaterials : [];
        smartCatalogMeta = {
            digitalThreshold: Number(payload?.digitalThreshold || 100000) || 100000,
            labelsPerRollDefault: Number(payload?.labelsPerRollDefault || 1000) || 1000
        };
        const sourceItems = substrateMaterials;
        if (sourceItems.length) {
            const seen = new Set();
            materialItems = sourceItems.map((item) => ({
                code: item.code || item.name || '',
                name: item.name || item.code || ''
            })).filter((item) => {
                const key = `${normalizeText(item.code).toLowerCase()}|${normalizeText(item.name).toLowerCase()}`;
                if (!normalizeText(item.name) || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        } else {
            materialItems = [];
        }
    } catch (error) {
        materialItems = [];
        smartCatalogMeta = {
            digitalThreshold: 100000,
            labelsPerRollDefault: 1000
        };
    }
    renderAutomaticRoutePreview();
}

function renderInlineSuggestionList(panel, items, emptyMessage) {
    if (!panel) return;
    if (!items.length) {
        panel.innerHTML = `<div class="quote-request-lookup-empty">${escapeHtml(emptyMessage)}</div>`;
        panel.hidden = false;
        return;
    }
    panel.innerHTML = items.map((item) => {
        const code = normalizeText(item.code || '');
        const name = normalizeText(item.name || '');
        const showCode = code && code.toLowerCase() !== name.toLowerCase();
        return `
        <button type="button" class="quote-request-lookup-item" data-value="${escapeHtml(item.name)}" data-code="${escapeHtml(item.code || '')}">
            <span class="quote-request-lookup-name">${escapeHtml(item.name)}</span>
            ${showCode ? `<span class="quote-request-lookup-code">${escapeHtml(item.code || '')}</span>` : ''}
        </button>
    `;
    }).join('');
    panel.hidden = false;
}

function showMaterialSuggestions() {
    const term = normalizeText(materialInput?.value).toLowerCase();
    const items = materialItems
        .filter((item) => !term || `${item.name || ''} ${item.code || ''}`.toLowerCase().includes(term))
        .slice(0, 12);
    renderInlineSuggestionList(materialSuggestions, items, 'No hay sustratos disponibles en inventario.');
    positionMaterialSuggestionsPanel();
}

function showSurfaceSuggestions() {
    const items = surfaceItems
        .slice(0, 12)
        .map((item) => ({ name: item, code: '' }));
    renderInlineSuggestionList(surfaceSuggestions, items, 'No hay superficies disponibles.');
}

function hideInlinePanels() {
    if (materialSuggestions) materialSuggestions.hidden = true;
    if (surfaceSuggestions) surfaceSuggestions.hidden = true;
    toggleFixedSizePanel(false);
    toggleRequestProductTypePanel(false);
}

function positionCustomerLookupPanel() {
    if (!customerLookupPanel || !customerNameInput || customerLookupPanel.hidden) return;
    if (customerLookupPanel.parentElement !== document.body) {
        document.body.appendChild(customerLookupPanel);
    }
    const rect = customerNameInput.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(460, window.innerHeight - top - viewportGap));

    customerLookupPanel.style.setProperty('--quote-customer-lookup-left', `${left}px`);
    customerLookupPanel.style.setProperty('--quote-customer-lookup-top', `${top}px`);
    customerLookupPanel.style.setProperty('--quote-customer-lookup-width', `${width}px`);
    customerLookupPanel.style.setProperty('--quote-customer-lookup-max-height', `${maxHeight}px`);
}

function positionNewCalcCustomerLookupPanel() {
    if (!newCalcCustomerLookupPanel || !newCalcCustomerNameInput || newCalcCustomerLookupPanel.hidden) return;
    if (newCalcCustomerLookupPanel.parentElement !== document.body) {
        document.body.appendChild(newCalcCustomerLookupPanel);
    }
    const rect = newCalcCustomerNameInput.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(460, window.innerHeight - top - viewportGap));

    newCalcCustomerLookupPanel.style.setProperty('--quote-new-calc-customer-left', `${left}px`);
    newCalcCustomerLookupPanel.style.setProperty('--quote-new-calc-customer-top', `${top}px`);
    newCalcCustomerLookupPanel.style.setProperty('--quote-new-calc-customer-width', `${width}px`);
    newCalcCustomerLookupPanel.style.setProperty('--quote-new-calc-customer-max-height', `${maxHeight}px`);
}

async function searchPartners(term) {
    partnerLookupAbort?.abort();
    partnerLookupAbort = new AbortController();
    const query = new URLSearchParams({ limit: '12' });
    if (term) query.set('q', term);
    const response = await fetch(`${PARTNERS_ENDPOINT}?${query.toString()}`, { signal: partnerLookupAbort.signal });
    const payload = await response.json().catch(() => ({ socios: [] }));
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar socios.');
    const items = Array.isArray(payload.socios) ? payload.socios : [];
    customerLookupResults.innerHTML = items.length
        ? items.map((item) => `
            <button type="button" class="quote-request-lookup-item" data-partner-code="${escapeHtml(item.partner_code || '')}" data-partner-name="${escapeHtml(item.partner_name || '')}">
                <span class="quote-request-lookup-name">${escapeHtml(item.partner_name || '')}</span>
                <span class="quote-request-lookup-code">${escapeHtml(item.partner_code || '')}</span>
            </button>
        `).join('')
        : '<div class="quote-request-lookup-empty">No se encontraron socios.</div>';
    customerLookupPanel.hidden = false;
    positionCustomerLookupPanel();
}

async function searchNewCalcPartners(term) {
    newCalcPartnerLookupAbort?.abort();
    newCalcPartnerLookupAbort = new AbortController();
    const query = new URLSearchParams({ limit: '12' });
    if (term) query.set('q', term);
    const response = await fetch(`${PARTNERS_ENDPOINT}?${query.toString()}`, { signal: newCalcPartnerLookupAbort.signal });
    const payload = await response.json().catch(() => ({ socios: [] }));
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar socios.');
    const items = Array.isArray(payload.socios) ? payload.socios : [];
    newCalcCustomerLookupResults.innerHTML = items.length
        ? items.map((item) => `
            <button type="button" class="quote-request-lookup-item" data-partner-code="${escapeHtml(item.partner_code || '')}" data-partner-name="${escapeHtml(item.partner_name || '')}">
                <span class="quote-request-lookup-name">${escapeHtml(item.partner_name || '')}</span>
                <span class="quote-request-lookup-code">${escapeHtml(item.partner_code || '')}</span>
            </button>
        `).join('')
        : '<div class="quote-request-lookup-empty">No se encontraron socios.</div>';
    newCalcCustomerLookupPanel.hidden = false;
    positionNewCalcCustomerLookupPanel();
}

function resetContactSelect(select, message = 'Selecciona un cliente') {
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHtml(message)}</option>`;
    select.disabled = true;
}

function contactOptionLabel(contact = {}) {
    return normalizeText(contact.contact_name)
        || [contact.first_name, contact.last_name].map(normalizeText).filter(Boolean).join(' ')
        || normalizeText(contact.email)
        || 'Contacto sin nombre';
}

function renderContactOptions(select, contacts = []) {
    if (!select) return;
    const items = contacts.map((contact) => ({
        name: contactOptionLabel(contact),
        email: normalizeText(contact.email),
        phone: normalizeText(contact.phone || contact.mobile)
    })).filter((item) => item.name);
    if (!items.length) {
        resetContactSelect(select, 'Sin contactos asociados');
        return;
    }
    select.disabled = false;
    select.innerHTML = `<option value="">Selecciona contacto</option>${items.map((item) => `
        <option value="${escapeHtml(item.name)}" data-email="${escapeHtml(item.email)}" data-phone="${escapeHtml(item.phone)}">${escapeHtml(item.name)}</option>
    `).join('')}`;
    if (items.length === 1) select.selectedIndex = 1;
}

async function loadRequestContacts(partnerCode) {
    resetContactSelect(customerContactSelect, partnerCode ? 'Cargando contactos...' : 'Selecciona un cliente');
    if (!partnerCode) return;
    requestContactAbort?.abort();
    requestContactAbort = new AbortController();
    const payload = await fetchJson(`${PARTNERS_ENDPOINT}/${encodeURIComponent(partnerCode)}/contactos`, { signal: requestContactAbort.signal });
    renderContactOptions(customerContactSelect, Array.isArray(payload.contactos) ? payload.contactos : []);
}

async function loadNewCalcContacts(partnerCode) {
    resetContactSelect(newCalcContactSelect, partnerCode ? 'Cargando contactos...' : 'Selecciona un cliente');
    if (!partnerCode) return;
    newCalcContactAbort?.abort();
    newCalcContactAbort = new AbortController();
    const payload = await fetchJson(`${PARTNERS_ENDPOINT}/${encodeURIComponent(partnerCode)}/contactos`, { signal: newCalcContactAbort.signal });
    renderContactOptions(newCalcContactSelect, Array.isArray(payload.contactos) ? payload.contactos : []);
}

function applyPartnerSelection(code, name) {
    customerCodeInput.value = code || '';
    customerNameInput.value = name || '';
    if (customerLookupPanel) customerLookupPanel.hidden = true;
    loadRequestContacts(code).catch((error) => {
        if (error.name !== 'AbortError') setStatus(error.message, 'error');
    });
}

function applyNewCalcPartnerSelection(code, name) {
    newCalcCustomerCodeInput.value = code || '';
    newCalcCustomerNameInput.value = name || '';
    if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
    loadNewCalcContacts(code).catch((error) => {
        if (error.name !== 'AbortError') setNewCalcStatus(error.message, 'error');
    });
}

function selectedContactPayload(select) {
    const option = select?.selectedOptions?.[0];
    return {
        contact_name: normalizeText(select?.value),
        email: normalizeText(option?.dataset?.email),
        phone: normalizeText(option?.dataset?.phone)
    };
}

function syncToggleChipState(scope = document) {
    scope.querySelectorAll('.quote-request-toggle-chip').forEach((chip) => {
        const input = chip.querySelector('input');
        chip.classList.toggle('is-selected', Boolean(input?.checked));
    });
    scope.querySelectorAll('.quote-request-shape-card').forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('is-selected', Boolean(input?.checked));
    });
}

function readAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',').pop() || '');
        reader.onerror = () => reject(new Error(`No fue posible leer ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function formatFileSize(sizeBytes) {
    const size = Number(sizeBytes || 0);
    if (!Number.isFinite(size) || size <= 0) return '1 KB';
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function getAttachmentPreviewKind(item) {
    const mime = String(item?.mimeType || '').toLowerCase();
    const ext = String(item?.fileExt || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    return 'none';
}

function getAttachmentTypeLabel(item) {
    const kind = getAttachmentPreviewKind(item);
    if (kind === 'image') return 'Imagen';
    if (kind === 'video') return 'Video';
    if (kind === 'audio') return 'Audio';
    if (kind === 'pdf') return 'PDF';
    return (String(item?.fileExt || '').toUpperCase() || 'Archivo');
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getAttachmentPreviewTransformNodes() {
    const stage = attachmentPreviewContent?.querySelector('[data-preview-stage]');
    const media = attachmentPreviewContent?.querySelector('[data-preview-media]');
    return { stage, media };
}

function applyAttachmentPreviewTransform() {
    const { stage, media } = getAttachmentPreviewTransformNodes();
    if (!stage || !media) return;
    const zoomValue = attachmentPreviewContent?.querySelector('[data-preview-zoom-value]');
    const baseWidth = media.offsetWidth || 0;
    const baseHeight = media.offsetHeight || 0;
    const maxX = Math.max(0, ((baseWidth * attachmentPreviewState.scale) - stage.clientWidth) / 2);
    const maxY = Math.max(0, ((baseHeight * attachmentPreviewState.scale) - stage.clientHeight) / 2);
    if (attachmentPreviewState.scale <= 1.01) {
        attachmentPreviewState.x = 0;
        attachmentPreviewState.y = 0;
    } else {
        attachmentPreviewState.x = clamp(attachmentPreviewState.x, -maxX, maxX);
        attachmentPreviewState.y = clamp(attachmentPreviewState.y, -maxY, maxY);
    }
    media.style.setProperty('--preview-scale', String(attachmentPreviewState.scale));
    media.style.setProperty('--preview-x', `${attachmentPreviewState.x}px`);
    media.style.setProperty('--preview-y', `${attachmentPreviewState.y}px`);
    media.classList.toggle('is-zoomable', attachmentPreviewState.kind === 'image');
    media.classList.toggle('is-dragging', attachmentPreviewState.dragging);
    if (zoomValue) zoomValue.textContent = `${Math.round(attachmentPreviewState.scale * 100)}%`;
}

function resetAttachmentPreviewTransform(kind = '') {
    attachmentPreviewState = {
        kind,
        scale: 1,
        x: 0,
        y: 0,
        dragging: false,
        pointerId: null,
        startX: 0,
        startY: 0
    };
    requestAnimationFrame(applyAttachmentPreviewTransform);
}

function setAttachmentPreviewScale(nextScale) {
    attachmentPreviewState.scale = clamp(nextScale, 1, 4);
    if (attachmentPreviewState.scale <= 1.01) {
        attachmentPreviewState.x = 0;
        attachmentPreviewState.y = 0;
    }
    applyAttachmentPreviewTransform();
}

function renderExpandedAttachmentPreview(item, kind) {
    if (kind === 'image') {
        return `
            <div class="quote-request-preview-stage" data-preview-stage>
                <div class="quote-request-preview-media" data-preview-media>
                    <img src="${escapeHtml(item.previewUrl || '')}" alt="${escapeHtml(item.fileName || 'Adjunto')}">
                </div>
                <div class="quote-request-preview-controls">
                    <button type="button" class="quote-request-preview-zoom" data-preview-zoom="out" aria-label="Alejar">-</button>
                    <span class="quote-request-preview-zoom-value" data-preview-zoom-value>100%</span>
                    <button type="button" class="quote-request-preview-zoom" data-preview-zoom="reset" aria-label="Restablecer zoom">Reset</button>
                    <button type="button" class="quote-request-preview-zoom" data-preview-zoom="in" aria-label="Acercar">+</button>
                </div>
            </div>
        `;
    }
    if (kind === 'video') {
        return `
            <div class="quote-request-preview-stage" data-preview-stage>
                <div class="quote-request-preview-media" data-preview-media>
                    <video controls src="${escapeHtml(item.previewUrl || '')}"></video>
                </div>
            </div>
        `;
    }
    if (kind === 'audio') {
        return `
            <div class="quote-request-preview-stage" data-preview-stage>
                <div class="quote-request-preview-media" data-preview-media>
                    <audio controls src="${escapeHtml(item.previewUrl || '')}"></audio>
                </div>
            </div>
        `;
    }
    if (kind === 'pdf') {
        return `
            <div class="quote-request-preview-stage" data-preview-stage>
                <div class="quote-request-preview-media" data-preview-media>
                    <iframe src="${escapeHtml(item.previewUrl || '')}#toolbar=0&navpanes=0&scrollbar=0" title="${escapeHtml(item.fileName || 'PDF')}"></iframe>
                </div>
            </div>
        `;
    }
    return `<div class="quote-request-preview-empty"><strong>Sin vista</strong><span>Este archivo no tiene vista disponible.</span></div>`;
}

function getAttachmentOrientationClass(item) {
    return item.previewOrientation || 'landscape';
}

async function resolveAttachmentOrientation(file, previewUrl, mimeType) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
                if (ratio < 0.82) resolve('portrait');
                else if (ratio > 1.18) resolve('landscape');
                else resolve('square');
            };
            image.onerror = () => resolve('landscape');
            image.src = previewUrl;
        });
    }
    return 'landscape';
}

function buildAttachmentPreviewMarkup(item, expanded = false) {
    const kind = getAttachmentPreviewKind(item);
    const previewUrl = escapeHtml(item.previewUrl || '');
    if (expanded) {
        return renderExpandedAttachmentPreview(item, kind);
    }
    if (kind === 'image') {
        return `<img src="${previewUrl}" alt="${escapeHtml(item.fileName || 'Adjunto')}">`;
    }
    if (kind === 'video') {
        return `<video muted playsinline preload="metadata" src="${previewUrl}"></video>`;
    }
    if (kind === 'audio') {
        return `<div class="quote-request-attachment-filetile"><strong>AUDIO</strong><span>${escapeHtml(item.fileExt ? item.fileExt.toUpperCase() : 'WEBM')}</span></div>`;
    }
    if (kind === 'pdf') {
        return `<div class="quote-request-attachment-filetile"><strong>PDF</strong><span>Vista rapida</span></div>`;
    }
    return `<div class="quote-request-attachment-filetile"><strong>${escapeHtml(getAttachmentTypeLabel(item))}</strong><span>Sin vista</span></div>`;
}

function closeAttachmentPreview() {
    if (!attachmentPreviewModal || !attachmentPreviewContent) return;
    attachmentPreviewModal.hidden = true;
    attachmentPreviewContent.innerHTML = '';
    activeAttachmentPreviewUrl = '';
    resetAttachmentPreviewTransform('');
}

function openAttachmentPreview(index) {
    const item = pendingAttachments[Number(index)];
    if (!item || !attachmentPreviewModal || !attachmentPreviewContent) return;
    const kind = getAttachmentPreviewKind(item);
    attachmentPreviewTitle.textContent = item.fileName || 'Vista previa';
    if (kind === 'none') {
        attachmentPreviewContent.innerHTML = `<div class="quote-request-preview-empty"><strong>Sin vista</strong><span>Este archivo no tiene vista disponible.</span></div>`;
    } else {
        attachmentPreviewContent.innerHTML = buildAttachmentPreviewMarkup(item, true);
    }
    activeAttachmentPreviewUrl = item.previewUrl || '';
    attachmentPreviewModal.hidden = false;
    resetAttachmentPreviewTransform(kind);
}

function renderAttachments() {
    if (!attachmentsPreview) return;
    if (!pendingAttachments.length) {
        attachmentsPreview.innerHTML = '<div class="quote-request-attachment-empty">No hay adjuntos cargados.</div>';
        return;
    }
    const deleteConf = getResolvedIcon(['eliminar adjunto solicitud', 'quoteRequestAttachmentDelete', 'loginRepositoryDelete'], 'quoteRequestAttachmentDelete');
    attachmentsPreview.innerHTML = pendingAttachments.map((item, index) => {
        const previewKind = getAttachmentPreviewKind(item);
        const previewClass = previewKind === 'pdf' ? ' is-pdf' : '';
        return `
            <div class="quote-request-attachment-card ${item.kind === 'audio' ? 'audio' : ''}">
                <button type="button" class="quote-request-attachment-preview${previewClass}" data-orientation="${escapeHtml(getAttachmentOrientationClass(item))}" data-preview-attachment="${index}" aria-label="Ver previa de ${escapeHtml(item.fileName)}" title="Ver previa">
                    ${buildAttachmentPreviewMarkup(item)}
                </button>
                <div class="quote-request-attachment-body">
                    <div class="quote-request-attachment-meta">
                        <span class="quote-request-attachment-name">${escapeHtml(item.fileName)}</span>
                        <span class="quote-request-attachment-size">${escapeHtml(item.sizeLabel || item.label || '')}</span>
                        <span class="quote-request-attachment-note">${escapeHtml(item.previewNote || '')}</span>
                    </div>
                    ${item.kind === 'audio' ? `<audio controls src="${escapeHtml(item.previewUrl)}"></audio>` : ''}
                </div>
                <button type="button" class="quote-request-attachment-remove" data-remove-attachment="${index}" aria-label="Eliminar adjunto" title="Eliminar adjunto"></button>
            </div>
        `;
    }).join('');
    attachmentsPreview.querySelectorAll('[data-remove-attachment]').forEach((button) => renderIcon(button, deleteConf.value, deleteConf.color, deleteConf.size));
}

function formHasContent() {
    if (!form) return false;
    if (readRequestedQuantities().length > 0) return true;
    const data = new FormData(form);
    for (const [key, value] of data.entries()) {
        if (key === 'customer_code') continue;
        if (normalizeText(value)) return true;
    }
    return pendingAttachments.length > 0;
}

function resetFormState() {
    form?.reset();
    form?.querySelectorAll('input[name="numbering"]').forEach((input) => {
        input.checked = false;
    });
    customerCodeInput.value = '';
    resetContactSelect(customerContactSelect, 'Selecciona un cliente');
    if (materialInput) materialInput.dataset.materialCode = '';
    if (customWidthInput) customWidthInput.value = '';
    if (customHeightInput) customHeightInput.value = '';
    pendingAttachments.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    });
    pendingAttachments = [];
    renderAttachments();
    hideInlinePanels();
    setStatus('');
    syncToggleChipState();
    applyConfiguredIcons();
    syncFixedSizeTrigger();
    renderRequestProductTypeOptions();
    renderRequestQuantityRepeater([0]);
    closeAttachmentPreview();
    closeNumberingPopover();
    if (numberingAttachmentInput) numberingAttachmentInput.value = '';
    renderNumberingSummary();
    quoteRequestWizardState = {
        currentStep: 1,
        totalSteps: Math.max(1, wizardSections.length || 5),
        previewQuoteCode: '',
        previewFirstLineCode: '',
        previewFingerprint: '',
        previewProforma: null,
        previewDirty: false,
        keepPreviewQuote: false
    };
    renderQuickRequestSummaryPlaceholder('Completa los pasos anteriores para generar el resumen final.');
    updateQuickRequestWizard();
}

function setDefaultLauncherPosition() {
    if (!launcherWrap || !popoverPanel) return;
    const rect = popoverPanel.getBoundingClientRect();
    const left = Math.max(16, Math.min(window.innerWidth - 96, rect.right - 88));
    const top = Math.max(88, rect.bottom - 124);
    launcherWrap.style.left = `${left}px`;
    launcherWrap.style.top = `${top}px`;
    launcherWrap.style.right = 'auto';
    launcherWrap.style.bottom = 'auto';
}

function getShapeOptions() {
    const general = loadedConfig?.general || {};
    return [
        { value: 'Circular', label: general.dieShapeLabel1 || 'Circular', image: general.dieShapeImage1 || '' },
        { value: 'Cuadrado', label: general.dieShapeLabel2 || 'Cuadrado', image: general.dieShapeImage2 || '' },
        { value: 'Rectangular', label: general.dieShapeLabel3 || 'Rectangular', image: general.dieShapeImage3 || '' },
        { value: 'Ovalado', label: general.dieShapeLabel4 || 'Ovalado', image: general.dieShapeImage4 || '' },
        { value: 'Especial', label: general.dieShapeLabel5 || 'Especial', image: general.dieShapeImage5 || '' }
    ];
}

function buildShapeThumbMarkup(shape) {
    return shape.image
        ? `<img src="${escapeHtml(shape.image)}" alt="${escapeHtml(shape.label)}">`
        : `<span class="quote-request-shape-fallback" data-shape="${escapeHtml(shape.value)}"></span>`;
}

function getSelectedShapeInput() {
    return document.querySelector('[data-shape-panel] input[name="die_shape"]:checked')
        || shapePicker?.querySelector('input[name="die_shape"]:checked')
        || null;
}

function syncShapePickerState() {
    if (!shapePicker) return;
    const selectedInput = getSelectedShapeInput();
    const selectedValue = selectedInput?.value || '';
    const selectedLabel = selectedInput?.dataset.label || selectedValue || 'Selecciona una forma';
    const selectedImage = selectedInput?.dataset.image || '';
    const triggerName = shapePicker.querySelector('[data-shape-trigger-label]');
    const triggerThumb = shapePicker.querySelector('[data-shape-trigger-thumb]');
    const trigger = shapePicker.querySelector('[data-shape-trigger]');
    if (triggerName) triggerName.textContent = selectedLabel;
    if (triggerThumb) {
        triggerThumb.innerHTML = buildShapeThumbMarkup({
            value: selectedValue || 'Rectangular',
            label: selectedLabel,
            image: selectedImage
        });
    }
    const panel = document.querySelector('[data-shape-panel]') || shapePicker.querySelector('[data-shape-panel]');
    panel?.querySelectorAll('.quote-request-shape-option').forEach((option) => {
        option.classList.toggle('is-selected', option.dataset.shapeValue === selectedValue);
    });
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
}

function markDieCutWhenShapeSelected() {
    const dieCut = document.getElementById('finishDieCut');
    if (!dieCut || dieCut.checked || !getSelectedShapeInput()?.value) return;
    dieCut.checked = true;
    syncToggleChipState();
    updateFinishCompactSummaries();
}

function positionShapePickerPanel() {
    if (!shapePicker) return;
    const panel = document.querySelector('[data-shape-panel]') || shapePicker.querySelector('[data-shape-panel]');
    const trigger = shapePicker.querySelector('[data-shape-trigger]');
    if (!panel || !trigger || panel.hidden) return;
    if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }
    const rect = trigger.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom - 10;
    const maxHeight = Math.max(150, Math.min(420, window.innerHeight - top - viewportGap));

    panel.style.setProperty('--quote-shape-panel-left', `${left}px`);
    panel.style.setProperty('--quote-shape-panel-top', `${top}px`);
    panel.style.setProperty('--quote-shape-panel-width', `${width}px`);
    panel.style.setProperty('--quote-shape-panel-max-height', `${maxHeight}px`);
}

function toggleShapePickerPanel(forceOpen) {
    if (!shapePicker) return;
    const panel = document.querySelector('[data-shape-panel]') || shapePicker.querySelector('[data-shape-panel]');
    const trigger = shapePicker.querySelector('[data-shape-trigger]');
    if (!panel || !trigger) return;
    const nextState = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
    panel.hidden = !nextState;
    trigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    if (nextState) positionShapePickerPanel();
}

function renderShapePicker() {
    if (!shapePicker) return;
    const shapes = getShapeOptions();
    const selectedValue = getSelectedShapeInput()?.value || shapes[0]?.value || '';
    const detachedPanel = document.querySelector('[data-shape-panel]');
    if (detachedPanel && detachedPanel.parentElement !== shapePicker) detachedPanel.remove();
    shapePicker.innerHTML = `
        <div class="quote-request-field">
            <span>Forma de Troquel</span>
            <div class="quote-request-shape-dropdown">
                <button type="button" class="quote-request-select quote-request-shape-trigger" data-shape-trigger aria-expanded="false">
                    <span class="quote-request-shape-trigger-copy">
                        <span class="quote-request-shape-thumb" data-shape-trigger-thumb></span>
                        <span class="quote-request-shape-trigger-label" data-shape-trigger-label></span>
                    </span>
                </button>
                <div class="quote-request-inline-panel quote-request-shape-panel" data-shape-panel hidden>
                    ${shapes.map((shape) => `
                        <label class="quote-request-shape-option" data-shape-value="${escapeHtml(shape.value)}">
                            <input type="radio" name="die_shape" value="${escapeHtml(shape.value)}" data-label="${escapeHtml(shape.label)}" data-image="${escapeHtml(shape.image)}" ${shape.value === selectedValue ? 'checked' : ''}>
                            <span class="quote-request-shape-thumb">${buildShapeThumbMarkup(shape)}</span>
                            <span class="quote-request-shape-trigger-label">${escapeHtml(shape.label)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    syncShapePickerState();
}

function collectRequestPayload() {
    const selectedShape = getSelectedShapeInput()?.value || '';
    const selectedSize = fixedSizeSelect?.selectedOptions?.[0];
    const isCustomSize = fixedSizeSelect?.value === 'custom';
    const customWidth = Number(customWidthInput?.value || 0) || 0;
    const customHeight = Number(customHeightInput?.value || 0) || 0;
    const widthInches = isCustomSize ? customWidth : (Number(selectedSize?.dataset.width || 0) || null);
    const lengthInches = isCustomSize ? customHeight : (Number(selectedSize?.dataset.length || 0) || null);
    const sizeLabel = isCustomSize
        ? (widthInches && lengthInches ? `Medida especial: ${widthInches} in x ${lengthInches} in` : 'Medida especial')
        : normalizeText(selectedSize?.textContent || fixedSizeSelect?.value);
    const numbering = getSelectedNumberingValue();
    const stamping = form.querySelector('input[name="stamping"]:checked')?.value || '';
    const lamination = form.querySelector('input[name="lamination"]:checked')?.value || '';
    const varnish = form.querySelector('input[name="varnish"]:checked')?.value || '';
    const stampingWidth = normalizeText(stampingWidthInput?.value);
    const placement = form.querySelector('input[name="placement"]:checked')?.value || '';
    const productType = requestProductTypeSelect?.value || '';
    const processType = normalizeText(requestProcessTypeInput?.value) || 'Convencional';
    const quantities = readRequestedQuantities();
    const contact = selectedContactPayload(customerContactSelect);
    const varnishZonificado = document.getElementById('varnishSonified')?.checked ? 'Si' : 'No';
    const numberingIsConsecutive = isConsecutiveNumbering(numbering);
    const numberingFrom = numberingIsConsecutive ? normalizeText(numberingRangeStartInput?.value) : '';
    const numberingTo = numberingIsConsecutive ? normalizeText(numberingRangeEndInput?.value) : '';
    const numberingDetail = normalizeText(numberingDetailInput?.value);
    const numberingAttachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const numberingAttachment = numberingAttachmentIndex >= 0 ? pendingAttachments[numberingAttachmentIndex] : null;
    const numberingSummary = numbering
        ? [getNumberingLabel(numbering), numberingFrom || numberingTo ? `Desde ${numberingFrom || '...'} hasta ${numberingTo || '...'}` : '', numberingDetail].filter(Boolean).join(' | ')
        : '';

    return {
        customer_code: normalizeText(customerCodeInput.value),
        customer_name: normalizeText(customerNameInput.value),
        contact_name: contact.contact_name,
        email: contact.email,
        phone: contact.phone,
        job_name: normalizeText(document.getElementById('requestJobName')?.value),
        quantity: quantities.map((item) => formatNumber(item)).join(', '),
        quantities,
        product_type: normalizeText(productType),
        process_type: processType,
        material_name: normalizeText(materialInput?.value),
        material_code: normalizeText(materialInput?.dataset?.materialCode),
        applicationType: normalizeText(surfaceInput?.value),
        outputType: placement,
        widthInches,
        lengthInches,
        request_meta: {
            'REQ | Tipo de Producto': normalizeText(productType),
            'REQ | Cantidades': quantities.map((item) => formatNumber(item)).join(', '),
            'REQ | Ruta Solicitada': 'Automática',
            'REQ | Cliente Contacto': contact.contact_name,
            'REQ | Forma': selectedShape,
            'REQ | Barniz': varnish,
            'REQ | Barniz Zonificado': varnishZonificado,
            'REQ | Laminado': lamination,
            'REQ | Estampado': stamping,
            'REQ | Estampado Ancho': stampingWidth,
            'REQ | Numeracion': numbering,
            'REQ | Numeracion Desde': numberingFrom,
            'REQ | Numeracion Hasta': numberingTo,
            'REQ | Numeracion Detalle': numberingDetail,
            'REQ | Numeracion Resumen': numberingSummary,
            'REQ | Numeracion Adjunto': numberingAttachment?.fileName || '',
            'REQ | Embosado': document.getElementById('finishEmbossed')?.checked ? 'Si' : 'No',
            'REQ | Troquelado': document.getElementById('finishDieCut')?.checked ? 'Si' : 'No',
            'REQ | Superficie': normalizeText(surfaceInput?.value),
            'REQ | Colocacion': placement,
            'REQ | Comentarios': normalizeText(document.getElementById('requestComments')?.value),
            'REQ | Medida Fija': sizeLabel,
            'REQ | Numeracion Aviso': numbering ? 'Revisar proceso adicional de impresion para numerado.' : '',
            'TRAZABILIDAD | SOLICITUD VENDEDOR': 'Si',
            'TRAZABILIDAD | FECHA SOLICITUD VENDEDOR': new Date().toISOString(),
            'TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR': currentUserName(),
            'CODEX_UI_STATE': {
                request: 'solicitud-vendedor',
                productType: normalizeText(productType),
                quantities,
                dieShape: selectedShape,
                widthInches,
                lengthInches,
                header: {
                    customerName: normalizeText(customerNameInput.value),
                    contactName: contact.contact_name
                },
                numbering: {
                    type: numbering,
                    from: numberingFrom,
                    to: numberingTo,
                    detail: numberingDetail,
                    attachmentName: numberingAttachment?.fileName || ''
                },
                finishes: {
                    varnish,
                    varnishZonificado,
                    varnishSonified: varnishZonificado,
                    laminado: lamination,
                    stamping,
                    stampingWidth
                }
            }
        }
    };
}

function parseRequestedQuantities(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue
            .map((item) => parseRequestedQuantityValue(item))
            .filter((item) => item > 0)
            .slice(0, 6);
    }
    return String(rawValue || '')
        .split(/[\n,;]+/)
        .map((item) => parseRequestedQuantityValue(item))
        .filter((item) => item > 0)
        .slice(0, 6);
}

function renderAutomaticRoutePreview() {
    if (routePreviewList) routePreviewList.innerHTML = '';
    if (routePreviewConfig) routePreviewConfig.textContent = '';
}

function clearQuickRequestValidationState() {
    form?.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    if (launcherErrors) launcherErrors.hidden = true;
}

function showQuickRequestErrors(errors) {
    const message = errors.length ? `Faltan: ${errors.join(', ')}.` : '';
    setStatus(message, 'error');
    if (!launcherErrors || !launcherErrorsList) return;
    const rect = launcherWrap?.getBoundingClientRect?.() || { top: 0 };
    launcherErrors.classList.toggle('is-below', rect.top < (window.innerHeight / 2));
    launcherErrorsList.innerHTML = errors.map((err) => `<li class="process-launcher-errors-item">${escapeHtml(err)}</li>`).join('');
    launcherErrors.hidden = false;
}

function markQuickRequestInvalid(element, errors, label) {
    element?.classList?.add('is-invalid');
    if (label) errors.push(label);
}

function getPlacementField() {
    return form?.querySelector('input[name="placement"]')?.closest('.quote-request-field') || null;
}

function validateQuickRequestStep(stepNumber) {
    const payload = collectRequestPayload();
    payload.quantities = parseRequestedQuantities(payload.quantities);
    const errors = [];
    clearQuickRequestValidationState();

    if (stepNumber === 1) {
        if (!payload.customer_name) markQuickRequestInvalid(customerNameInput, errors, 'Nombre del cliente');
        if (!payload.contact_name) markQuickRequestInvalid(customerContactSelect, errors, 'Contacto');
        if (!payload.job_name) markQuickRequestInvalid(document.getElementById('requestJobName'), errors, 'Nombre del producto');
        if (!payload.product_type) markQuickRequestInvalid(requestProductTypeSelect, errors, 'Tipo de producto');
        if (!payload.quantities.length) {
            errors.push('Cantidad');
            requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]')?.forEach((input) => input.classList.add('is-invalid'));
        }
    }

    if (stepNumber === 2) {
        if (!fixedSizeSelect?.value) markQuickRequestInvalid(fixedSizeTrigger || fixedSizeSelect, errors, 'Medida');
        if (fixedSizeSelect?.value === 'custom') {
            if (!payload.widthInches || payload.widthInches <= 0) markQuickRequestInvalid(customWidthInput, errors, 'Ancho especial');
            if (!payload.lengthInches || payload.lengthInches <= 0) markQuickRequestInvalid(customHeightInput, errors, 'Alto especial');
        }
        const selectedShape = getSelectedShapeInput()?.value || '';
        if (!selectedShape) {
            markQuickRequestInvalid(shapePicker, errors, 'Forma');
        }
        if (!payload.material_name) markQuickRequestInvalid(materialInput, errors, 'Sustrato');
    }

    if (stepNumber === 4) {
        if (!payload.applicationType) markQuickRequestInvalid(surfaceInput, errors, 'Superficie de aplicación');
        if (!payload.outputType) markQuickRequestInvalid(getPlacementField(), errors, 'Colocación');
    }

    if (errors.length > 0) {
        showQuickRequestErrors(errors);
        throw new Error(`Faltan: ${errors.join(', ')}.`);
    }
    setStatus('');
    return payload;
}

function validateQuickRequest(forAdvanced) {
    const payload = collectRequestPayload();
    payload.quantities = parseRequestedQuantities(payload.quantities);
    const errors = [];
    clearQuickRequestValidationState();
    const selectedShape = getSelectedShapeInput()?.value || '';

    const check = (value, el, name) => {
        if (!value) {
            el?.classList.add('is-invalid');
            errors.push(name);
        }
    };

    check(payload.customer_name, customerNameInput, 'Nombre del cliente');
    check(payload.contact_name, customerContactSelect, 'Contacto');
    check(payload.job_name, document.getElementById('requestJobName'), 'Nombre del producto');
    check(payload.product_type, requestProductTypeSelect, 'Tipo de producto');
    if (!payload.quantities.length) {
        requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]')?.forEach((input) => input.classList.add('is-invalid'));
        errors.push('Cantidad válida');
    }
    if (payload.quantities.length > 6) {
        requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]')?.forEach((input) => input.classList.add('is-invalid'));
        errors.push('Máximo 6 cantidades');
    }

    if (!forAdvanced) {
        check(selectedShape, shapePicker, 'Forma');
        check(payload.material_name, materialInput, 'Sustrato');
        check(payload.applicationType, surfaceInput, 'Superficie de aplicación');
        check(fixedSizeSelect?.value, fixedSizeTrigger || fixedSizeSelect, 'Medida');
        if (fixedSizeSelect?.value === 'custom') {
            check(payload.widthInches > 0, customWidthInput, 'Ancho especial');
            check(payload.lengthInches > 0, customHeightInput, 'Alto especial');
        }
    }

    check(payload.outputType, getPlacementField(), 'Colocación');
    if (errors.length > 0) {
        showQuickRequestErrors(errors);
        throw new Error(`Faltan: ${errors.join(', ')}.`);
    }

    setStatus('');
    return payload;
}

function buildQuickRequestFingerprint(payload) {
    return JSON.stringify({
        customer: payload.customer_code || payload.customer_name,
        job: payload.job_name,
        quantity: payload.quantities || [],
        material: payload.material_name,
        surface: payload.applicationType,
        placement: payload.outputType,
        width: payload.widthInches,
        length: payload.lengthInches,
        meta: payload.request_meta || {}
    });
}

async function createQuickQuoteDraft(payload, options = {}) {
    const status = options.status || 'Solicitada';
    const quoteResponse = await fetchJson(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeader() },
        body: JSON.stringify({
            customer_code: payload.customer_code,
            customer_name: payload.customer_name,
            contact_name: payload.contact_name,
            email: payload.email,
            phone: payload.phone,
            salesperson_name: currentUserName(),
            status
        })
    });
    const quoteCode = quoteResponse?.cotizacion?.quote_code;
    if (!quoteCode) throw new Error('La cotización se creó sin código.');
    const quantities = payload.quantities?.length ? payload.quantities : [payload.quantity];
    let firstLineCode = '';
    for (let index = 0; index < quantities.length; index += 1) {
        const quantityValue = quantities[index];
        const lineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
                customer_code: payload.customer_code,
                customer_name: payload.customer_name,
                contact_name: payload.contact_name,
                email: payload.email,
                phone: payload.phone,
                salesperson_name: currentUserName(),
                job_name: payload.job_name,
                quantity: quantityValue,
                material_name: payload.material_name,
                material_code: payload.material_code || payload.material_name,
                applicationType: payload.applicationType,
                outputType: payload.outputType,
                widthInches: payload.widthInches,
                lengthInches: payload.lengthInches,
                status,
                line_order: index + 1,
                request_meta: {
                    ...payload.request_meta,
                    'SOLICITUD ESTADO': status,
                    'REQ | Cantidad Solicitada Original': String(quantityValue),
                    'REQ | Grupo de Cantidades': quantities.join(', ')
                }
            })
        });
        const lineCode = lineResponse?.linea?.line_code;
        if (!lineCode) throw new Error('La línea se creó sin código.');
        if (!firstLineCode) firstLineCode = lineCode;
        await uploadPendingAttachments(quoteCode, lineCode);
    }
    return { quoteCode, firstLineCode, quantities };
}

async function deleteQuickQuoteDraft(quoteCode) {
    if (!quoteCode) return;
    try {
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}`, { method: 'DELETE' });
    } catch (error) {
        console.error('No fue posible eliminar la cotización temporal.', error);
    }
}

function renderQuickRequestSummaryPlaceholder(message) {
    if (requestSummaryGrid) requestSummaryGrid.innerHTML = '';
    if (requestTechnicalNotes) requestTechnicalNotes.textContent = message;
    if (requestSummaryRows) {
        requestSummaryRows.innerHTML = `<tr><td colspan="5" class="quote-request-summary-empty">${escapeHtml(message)}</td></tr>`;
    }
    if (requestSummaryTotals) requestSummaryTotals.hidden = true;
}

function renderQuickRequestSummary(payload, proformaData) {
    const technical = proformaData?.technicalSummary || {};
    const currency = proformaData?.currency || {};
    const totals = proformaData?.totals || {};
    const summaryItems = [
        ['Cliente', payload.customer_name],
        ['Contacto', payload.contact_name],
        ['Producto', payload.job_name],
        ['Forma', technical.shapesText || payload.request_meta?.['REQ | Forma'] || ''],
        ['Medida', technical.measuresText || `${payload.widthInches || ''}" x ${payload.lengthInches || ''}"`],
        ['Material', technical.materialsText || payload.material_name],
        ['Aplicación', technical.applicationsText || payload.applicationType],
        ['Colocación', technical.placementsText || payload.outputType],
        ['Acabados', technical.finishesText || 'Sin acabados especiales'],
        ['Numeración', technical.numberingText || 'Sin numeración'],
        ['Rutas', technical.routesText || 'Pendiente']
    ].filter(([, value]) => normalizeText(value));
    if (requestSummaryGrid) {
        requestSummaryGrid.innerHTML = summaryItems.map(([label, value]) => `
            <div class="quote-request-summary-field">
                <span class="quote-request-summary-label">${escapeHtml(label)}</span>
                <span class="quote-request-summary-value">${escapeHtml(value)}</span>
            </div>
        `).join('');
    }
    const technicalNotes = [
        technical.technicalNotesText,
        ...(Array.isArray(proformaData?.products) ? proformaData.products.flatMap((product) => {
            const notes = [];
            if (product?.technicalComment) notes.push(product.technicalComment);
            if (product?.warnings) notes.push(product.warnings);
            return notes;
        }) : [])
    ].filter(Boolean);
    if (requestTechnicalNotes) {
        requestTechnicalNotes.textContent = technicalNotes.length
            ? [...new Set(technicalNotes)].join('\n')
            : 'La proforma se generó con la selección automática actual.';
    }
    if (requestSummaryRows) {
        const products = Array.isArray(proformaData?.products) ? proformaData.products : [];
        requestSummaryRows.innerHTML = products.length
            ? products.map((product) => `
                <tr>
                    <td>${escapeHtml(formatNumber(product.quantity || 0))}</td>
                    <td><span class="quote-request-summary-route">${escapeHtml(product.routeSummary || 'Pendiente')}</span></td>
                    <td>${escapeHtml(formatCurrencyValue(product.subtotal || 0, currency))}</td>
                    <td>${escapeHtml(formatCurrencyValue(product.taxAmount || 0, currency))}</td>
                    <td>${escapeHtml(formatCurrencyValue(product.totalPrice || 0, currency))}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="quote-request-summary-empty">No hay cantidades calculadas para mostrar.</td></tr>';
    }
    if (requestSummarySubtotal) requestSummarySubtotal.textContent = formatCurrencyValue(totals.subtotal || 0, currency);
    if (requestSummaryTax) requestSummaryTax.textContent = formatCurrencyValue(totals.taxAmount || 0, currency);
    if (requestSummaryGrandTotal) requestSummaryGrandTotal.textContent = formatCurrencyValue(totals.grandTotal || 0, currency);
    if (requestSummaryTotals) requestSummaryTotals.hidden = false;
}

async function ensureQuickRequestPreview() {
    const payload = validateQuickRequest(false);
    const fingerprint = buildQuickRequestFingerprint(payload);
    if (
        quoteRequestWizardState.previewQuoteCode
        && !quoteRequestWizardState.previewDirty
        && quoteRequestWizardState.previewFingerprint === fingerprint
        && quoteRequestWizardState.previewProforma
    ) {
        renderQuickRequestSummary(payload, quoteRequestWizardState.previewProforma);
        return quoteRequestWizardState;
    }
    if (quoteRequestWizardState.previewQuoteCode) {
        await deleteQuickQuoteDraft(quoteRequestWizardState.previewQuoteCode);
    }
    renderQuickRequestSummaryPlaceholder('Generando proforma automática...');
    setStatus('Generando resumen final de la cotización...', 'saving');
    const draft = await createQuickQuoteDraft(payload, { status: 'Solicitada' });
    const proformaData = await fetchJson(`/api/proformas/${encodeURIComponent(draft.quoteCode)}`);
    quoteRequestWizardState.previewQuoteCode = draft.quoteCode;
    quoteRequestWizardState.previewFirstLineCode = draft.firstLineCode;
    quoteRequestWizardState.previewFingerprint = fingerprint;
    quoteRequestWizardState.previewProforma = proformaData;
    quoteRequestWizardState.previewDirty = false;
    quoteRequestWizardState.keepPreviewQuote = false;
    renderQuickRequestSummary(payload, proformaData);
    await loadQuotes();
    setStatus(`Solicitud ${draft.quoteCode} lista para revisar o imprimir.`, 'saved');
    return quoteRequestWizardState;
}

function invalidateQuickRequestPreview() {
    if (!quoteRequestWizardState.previewQuoteCode) return;
    quoteRequestWizardState.previewDirty = true;
    quoteRequestWizardState.keepPreviewQuote = false;
    quoteRequestWizardState.previewFingerprint = '';
    quoteRequestWizardState.previewProforma = null;
}

function updateQuickRequestWizard() {
    const totalSteps = quoteRequestWizardState.totalSteps;
    const currentStep = Math.min(Math.max(1, quoteRequestWizardState.currentStep), totalSteps);
    quoteRequestWizardState.currentStep = currentStep;
    wizardSections.forEach((section) => {
        const step = Number(section.dataset.step || 0);
        section.hidden = step !== currentStep;
    });
    if (wizardProgress) wizardProgress.textContent = `Paso ${currentStep} de ${totalSteps}`;
    if (wizardBackButton) wizardBackButton.hidden = currentStep === 1;
    if (wizardNextButton) wizardNextButton.hidden = currentStep === totalSteps;
    if (wizardPrintButton) wizardPrintButton.hidden = currentStep !== totalSteps;
    if (wizardAdvancedButton) wizardAdvancedButton.hidden = currentStep !== totalSteps;
}

async function goToQuickRequestStep(targetStep) {
    const totalSteps = quoteRequestWizardState.totalSteps;
    const nextStep = Math.min(Math.max(1, Number(targetStep) || 1), totalSteps);
    const currentStep = quoteRequestWizardState.currentStep;
    if (nextStep > currentStep) {
        for (let step = currentStep; step < nextStep; step += 1) {
            validateQuickRequestStep(step);
        }
    }
    quoteRequestWizardState.currentStep = nextStep;
    updateQuickRequestWizard();
}

async function uploadPendingAttachments(quoteCode, lineCode) {
    for (const attachment of pendingAttachments) {
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileExt: attachment.fileExt,
                contentBase64: attachment.contentBase64,
                notes: attachment.notes || (attachment.kind === 'audio' ? 'Audio grabado' : 'Adjunto')
            })
        });
    }
}

async function submitQuoteRequest(forAdvanced = false) {
    const busyButtons = [forAdvanced ? advancedButton : createButton, forAdvanced ? wizardAdvancedButton : wizardPrintButton].filter(Boolean);
    try {
        const payload = validateQuickRequest(forAdvanced);
        busyButtons.forEach((button) => setButtonBusy(button, true, forAdvanced ? 'Preparando...' : 'Creando...'));
        setStatus(forAdvanced ? 'Preparando proceso avanzado...' : 'Creando solicitud...', 'saving');
        const draft = await createQuickQuoteDraft(payload, { status: forAdvanced ? 'Borrador' : 'Solicitada' });
        const { quoteCode, quantities, firstLineCode } = draft;
        await loadQuotes();
        if (forAdvanced) {
            const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
            if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) {
                window.location.href = route;
            }
            return;
        }
        setStatus(`Solicitud ${quoteCode} creada con ${quantities.length} cantidad(es).`, 'saved');
        closePopover(true);
        return;
    } catch (error) {
        setStatus(error.message, 'error');
    } finally {
        busyButtons.forEach((button) => setButtonBusy(button, false));
    }
}

function openPopover() {
    popover.hidden = false;
    setDefaultLauncherPosition();
    if (launcherWrap) launcherWrap.hidden = true;
    if (processLauncherStack) processLauncherStack.classList.remove('is-active');
    if (launcherErrors) launcherErrors.hidden = true;
    if (processLauncherButton) processLauncherButton.setAttribute('aria-expanded', 'false');
    renderAttachments();
    renderNumberingSummary();
    renderRequestQuantityRepeater();
    toggleShapePickerPanel(false);
    syncToggleChipState();
    markDieCutWhenShapeSelected();
    updateQuickRequestWizard();
    setTimeout(() => customerNameInput?.focus(), 30);
}

function closePopover(force = false) {
    if (!force && formHasContent()) {
        const confirmed = window.confirm('Hay datos sin guardar. Quieres cerrar?');
        if (!confirmed) return;
    }
    popover.hidden = true;
    if (processLauncherStack) processLauncherStack.classList.remove('is-active');
    if (launcherErrors) launcherErrors.hidden = true;
    hideInlinePanels();
    toggleShapePickerPanel(false);
    resetFormState();
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function openNewCalcPopover() {
    if (!newCalcPopover) return;
    newCalcForm?.reset();
    if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
    resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
    setNewCalcStatus('');
    newCalcPopover.hidden = false;
    setTimeout(() => newCalcCustomerNameInput?.focus(), 30);
}

function closeNewCalcPopover(force = false) {
    if (!newCalcPopover) return;
    const hasContent = normalizeText(newCalcCustomerNameInput?.value) || normalizeText(newCalcContactSelect?.value);
    if (!force && hasContent && !window.confirm('Hay datos sin guardar. ¿Quieres cerrar?')) return;
    newCalcPopover.hidden = true;
    newCalcForm?.reset();
    if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
    resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
    if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
    setNewCalcStatus('');
}

async function submitNewCalculation() {
    const customerName = normalizeText(newCalcCustomerNameInput?.value);
    const customerCode = normalizeText(newCalcCustomerCodeInput?.value);
    const contact = selectedContactPayload(newCalcContactSelect);
    newCalcForm?.querySelectorAll('.is-invalid').forEach((item) => item.classList.remove('is-invalid'));
    const errors = [];
    if (!customerName || !customerCode) {
        newCalcCustomerNameInput?.classList.add('is-invalid');
        errors.push('Cliente');
    }
    if (!contact.contact_name) {
        newCalcContactSelect?.classList.add('is-invalid');
        errors.push('Contacto');
    }
    if (errors.length) {
        throw new Error(`Faltan: ${errors.join(', ')}.`);
    }
    setButtonBusy(newCalcSubmitButton, true, 'Creando...');
    setNewCalcStatus('Creando cálculo...', 'saving');
    try {
        const quoteResponse = await fetchJson(QUOTES_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
                customer_code: customerCode,
                customer_name: customerName,
                contact_name: contact.contact_name,
                email: contact.email,
                phone: contact.phone,
                salesperson_name: currentUserName(),
                status: 'Borrador'
            })
        });
        const quoteCode = quoteResponse?.cotizacion?.quote_code;
        if (!quoteCode) throw new Error('La cotización se creó sin código.');
        const lineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
                customer_code: customerCode,
                customer_name: customerName,
                contact_name: contact.contact_name,
                email: contact.email,
                phone: contact.phone,
                salesperson_name: currentUserName(),
                job_name: '',
                department: 'Flexografia',
                process_type: 'Convencional',
                status: 'Borrador',
                request_meta: {
                    'REQ | Cliente Contacto': contact.contact_name,
                    'TRAZABILIDAD | ORIGEN': 'Cálculo manual'
                }
            })
        });
        const lineCode = lineResponse?.linea?.line_code || lineResponse?.calculo?.line_code || '';
        if (!lineCode) throw new Error('La línea se creó sin código.');
        await loadQuotes();
        closeNewCalcPopover(true);
        const route = `/calculo-flexografia?${new URLSearchParams({
            lineId: lineCode,
            quoteId: quoteCode,
            productId: '',
            department: 'Flexografia'
        }).toString()}`;
        if (!openRouteInShell(route, `Cálculo ${lineCode}`)) {
            window.location.href = route;
        }
    } finally {
        setButtonBusy(newCalcSubmitButton, false);
    }
}

async function handleNumberingAttachmentChange() {
    const file = numberingAttachmentInput?.files?.[0];
    if (!file) {
        renderNumberingSummary();
        return;
    }
    const previousIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    if (previousIndex >= 0) removePendingAttachmentByIndex(previousIndex);
    const previewUrl = URL.createObjectURL(file);
    const mimeType = file.type || 'application/octet-stream';
    const fileExt = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    pendingAttachments.push({
        kind: 'file',
        slot: 'numbering',
        fileName: file.name,
        mimeType,
        fileExt,
        contentBase64: await readAsBase64(file),
        previewUrl,
        sizeLabel: formatFileSize(file.size),
        previewOrientation: await resolveAttachmentOrientation(file, previewUrl, mimeType),
        previewNote: 'Adjunto de numeración',
        notes: 'Adjunto Excel de numeración'
    });
    numberingAttachmentInput.value = '';
    renderAttachments();
    renderNumberingSummary();
}

function toggleProcessLauncher(forceOpen) {
    if (!processLauncherStack || !processLauncherButton) return;
    const isActive = processLauncherStack.classList.contains('is-active');
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !isActive;
    
    processLauncherStack.classList.toggle('is-active', willOpen);
    processLauncherButton.setAttribute('aria-expanded', String(willOpen));
    if (!willOpen && launcherErrors) launcherErrors.hidden = true;
}

async function toggleAudioRecording() {
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordingChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size) recordingChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.readAsDataURL(blob);
            });
            pendingAttachments.push({
                kind: 'audio',
                fileName,
                mimeType: blob.type || 'audio/webm',
                fileExt: 'webm',
                contentBase64: String(dataUrl).split(',').pop() || '',
                previewUrl: URL.createObjectURL(blob),
                label: 'Audio grabado',
                sizeLabel: formatFileSize(blob.size),
                previewNote: 'Vista disponible'
            });
            stream.getTracks().forEach((track) => track.stop());
            isRecording = false;
            audioRecordButton.dataset.recording = 'false';
            audioRecordIndicator.hidden = true;
            applyConfiguredIcons();
            renderAttachments();
        };
        mediaRecorder.start();
        isRecording = true;
        audioRecordButton.dataset.recording = 'true';
        audioRecordIndicator.hidden = false;
        applyConfiguredIcons();
    } catch (error) {
        console.error('Error accediendo al microfono:', error);
        setStatus('No se pudo acceder al microfono.', 'error');
    }
}

function bindEvents() {
    nuevoCalculoButton?.addEventListener('click', openNewCalcPopover);
    nuevaCotizacionButton?.addEventListener('click', openPopover);
    refreshQuotesButton?.addEventListener('click', () => {
        quoteLineCache.clear();
        loadQuotes().catch((error) => setStatus(error.message, 'error'));
    });
    quotesSearchInput?.addEventListener('input', () => {
        if (quoteSearchTimer) clearTimeout(quoteSearchTimer);
        quoteSearchTimer = setTimeout(() => {
            loadQuotes().catch((error) => setStatus(error.message, 'error'));
        }, 240);
    });
    quotesTableWrap?.addEventListener('scroll', updateQuotesScrollBottomIndicator, { passive: true });
    window.addEventListener('resize', updateQuotesScrollBottomIndicator);
    sapConnectorButton?.addEventListener('click', () => {
        openSapPopover().catch((error) => setSapConfigStatus(error.message, 'error'));
    });
    closeButton?.addEventListener('click', () => closePopover());
    newCalcCloseButton?.addEventListener('click', () => closeNewCalcPopover());
    newCalcCancelButton?.addEventListener('click', () => closeNewCalcPopover());
    newCalcPopover?.addEventListener('click', (event) => {
        if (event.target?.dataset?.closeNewCalc === 'true') closeNewCalcPopover();
    });
    newCalcForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        submitNewCalculation().catch((error) => setNewCalcStatus(error.message, 'error'));
    });
    shapePicker?.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-shape-trigger]');
        if (trigger) {
            event.preventDefault();
            event.stopPropagation();
            toggleShapePickerPanel();
            return;
        }
        const option = event.target.closest('.quote-request-shape-option');
        if (option) {
            const input = option.querySelector('input[name="die_shape"]');
            if (input) {
                input.checked = true;
                syncShapePickerState();
                markDieCutWhenShapeSelected();
                invalidateQuickRequestPreview();
            }
        }
    });
    shapePicker?.addEventListener('change', (event) => {
        if (event.target?.matches?.('input[name="die_shape"]')) {
            syncShapePickerState();
            markDieCutWhenShapeSelected();
            invalidateQuickRequestPreview();
        }
    });
    wizardBackButton?.addEventListener('click', () => {
        goToQuickRequestStep(quoteRequestWizardState.currentStep - 1).catch((error) => setStatus(error.message, 'error'));
    });
    wizardNextButton?.addEventListener('click', () => {
        goToQuickRequestStep(quoteRequestWizardState.currentStep + 1).catch((error) => setStatus(error.message, 'error'));
    });
    wizardPrintButton?.addEventListener('click', () => {
        submitQuoteRequest(false).catch((error) => setStatus(error.message, 'error'));
    });
    wizardAdvancedButton?.addEventListener('click', async () => {
        try {
            const previewState = await ensureQuickRequestPreview();
            previewState.keepPreviewQuote = true;
            const route = `/cotizaciones/documento?codigo=${encodeURIComponent(previewState.previewQuoteCode)}`;
            await loadQuotes();
            if (!openRouteInShell(route, `Cotizacion ${previewState.previewQuoteCode}`)) {
                window.location.href = route;
            }
            closePopover(true);
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });
    popover?.addEventListener('click', (event) => {
        if (event.target?.dataset?.closeQuoteCreate === 'true') closePopover();
    });
    numberingPopoverTrigger?.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleNumberingPopover();
    });
    numberingPopoverClose?.addEventListener('click', () => closeNumberingPopover());
    cerrarSapConfigButton?.addEventListener('click', closeSapPopover);
    sapConfigPopover?.addEventListener('click', (event) => {
        if (event.target?.dataset?.closeSapConfig === 'true') closeSapPopover();
    });
    sapSaveButton?.addEventListener('click', () => saveSapConfig().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapTestButton?.addEventListener('click', () => testSapConnection().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapSyncButton?.addEventListener('click', () => syncSapData().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapResetDemoButton?.addEventListener('click', () => resetSapDemo().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapRunQueryButton?.addEventListener('click', () => runSapQuery().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapRefreshLogsButton?.addEventListener('click', () => refreshSapLogs().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapLoadTemplateButton?.addEventListener('click', loadSapTemplate);
    sapSendPayloadButton?.addEventListener('click', () => runSapWrite().catch((error) => setSapConfigStatus(error.message, 'error')));
    sapWriteEntity?.addEventListener('change', loadSapTemplate);
    frontBackClose?.addEventListener('click', closeFrontBackModal);
    frontBackCancel?.addEventListener('click', closeFrontBackModal);
    frontBackSave?.addEventListener('click', () => saveFrontBackGroup().catch((error) => setStatus(error.message, 'error')));
    frontBackUnlink?.addEventListener('click', () => unlinkFrontBackGroup().catch((error) => setStatus(error.message, 'error')));
    frontBackModal?.addEventListener('click', (event) => {
        if (event.target === frontBackModal) closeFrontBackModal();
    });
    frontBackModal?.addEventListener('change', (event) => {
        const input = event.target?.closest?.('input[name="frontBackElement"]');
        if (!input) return;
        const selected = Array.from(frontBackModal.querySelectorAll('input[name="frontBackElement"]:checked'));
        if (selected.length > 2) input.checked = false;
    });

    processLauncherButton?.addEventListener('click', (event) => {
        if (dragState?.moved) return;
        event.stopPropagation();
        toggleProcessLauncher();
    });

    processLauncherButton?.addEventListener('pointerdown', (event) => {
        if (disableQuoteRequestLauncherDrag) return;
        if (event.button !== 0 || !launcherWrap) return;
        const rect = launcherWrap.getBoundingClientRect();
        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: rect.left,
            originY: rect.top,
            moved: false
        };
        processLauncherButton.setPointerCapture(event.pointerId);
        launcherWrap.classList.add('dragging');
    });

    processLauncherButton?.addEventListener('pointermove', (event) => {
        if (disableQuoteRequestLauncherDrag) return;
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        if (!dragState.moved && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            dragState.moved = true;
        }
        if (dragState.moved) {
            launcherWrap.style.left = `${dragState.originX + dx}px`;
            launcherWrap.style.top = `${dragState.originY + dy}px`;
            launcherWrap.style.right = 'auto';
            launcherWrap.style.bottom = 'auto';
        }
    });

    processLauncherButton?.addEventListener('pointerup', (event) => {
        if (disableQuoteRequestLauncherDrag) return;
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        if (dragState.moved) {
            const rect = launcherWrap.getBoundingClientRect();
            localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
        }
        launcherWrap.classList.remove('dragging');
        dragState = null;
    });

    createButton?.addEventListener('click', () => {
        toggleProcessLauncher(false);
        submitQuoteRequest(false).catch((error) => setStatus(error.message, 'error'));
    });
    advancedButton?.addEventListener('click', () => {
        toggleProcessLauncher(false);
        submitQuoteRequest(true).catch((error) => setStatus(error.message, 'error'));
    });
    
    // Dismiss error panel on click
    launcherErrors?.addEventListener('click', () => {
        launcherErrors.hidden = true;
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);
        const shapeOption = event.target.closest('.quote-request-shape-option');
        if (shapeOption) {
            const input = shapeOption.querySelector('input[name="die_shape"]');
            if (input) {
                input.checked = true;
                syncShapePickerState();
                markDieCutWhenShapeSelected();
                invalidateQuickRequestPreview();
            }
            return;
        }
        if (!event.target.closest('#dieShapePicker') && !event.target.closest('[data-shape-panel]')) toggleShapePickerPanel(false);
        if (!event.target.closest('#requestFixedSizeTrigger') && !event.target.closest('#requestFixedSizePanel')) {
            toggleFixedSizePanel(false);
        }
        if (!event.target.closest('#nuevoCalculoClienteNombre') && !event.target.closest('#newCalcCustomerLookupPanel')) {
            if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
        }
        if (!event.target.closest('.quote-request-product-type-wrap') && !event.target.closest('#requestProductTypePanel')) {
            toggleRequestProductTypePanel(false);
        }
        if (numberingPopover && !numberingPopover.hidden) {
            if (event.target === numberingPopoverTrigger || numberingPopoverTrigger?.contains(event.target)) return;
            if (numberingPopover.contains(event.target)) return;
            closeNumberingPopover();
        }
        const portalLineAction = event.target.closest('.quote-line-menu-panel [data-line-action]');
        if (portalLineAction) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const row = quoteLineLookup.get(Number(portalLineAction.dataset.lineId));
            if (row) {
                selectedQuoteContextCode = row.quoteId || selectedQuoteContextCode;
                selectedQuoteContextLineId = Number(portalLineAction.dataset.lineId) || 0;
            }
            closeQuoteLineMenus();
            handleQuoteLineAction(portalLineAction.dataset.lineAction, row).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        if (!event.target.closest('[data-line-menu-id]') && !event.target.closest('.quote-line-menu-panel')) {
            closeQuoteLineMenus();
        }
    });
    form?.addEventListener('click', (event) => {
        const removeNumberingAttachment = event.target.closest('[data-remove-numbering-attachment]');
        if (removeNumberingAttachment) {
            const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
            if (attachmentIndex >= 0) removePendingAttachmentByIndex(attachmentIndex);
            if (numberingAttachmentInput) numberingAttachmentInput.value = '';
            renderAttachments();
            renderNumberingSummary();
            invalidateQuickRequestPreview();
            return;
        }
        const toggle = event.target.closest('[data-finish-compact-toggle]');
        if (!toggle) return;
        const block = toggle.closest('[data-finish-key]');
        if (!block) return;
        const willOpen = !block.classList.contains('is-compact-open');
        form.querySelectorAll('[data-finish-key].is-compact-open').forEach((item) => {
            item.classList.remove('is-compact-open');
            item.querySelector('[data-finish-compact-toggle]')?.setAttribute('aria-expanded', 'false');
        });
        block.classList.toggle('is-compact-open', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    
    requestQuantityRepeater?.addEventListener('input', (event) => {
        const input = event.target.closest('input[data-request-quantity-index]');
        if (!input) return;
        requestQuantityRepeater.classList.remove('is-invalid');
        invalidateQuickRequestPreview();
    });
    requestQuantityRepeater?.addEventListener('change', (event) => {
        const input = event.target.closest('input[data-request-quantity-index]');
        if (!input) return;
        input.value = formatRequestedQuantityValue(input.value);
        invalidateQuickRequestPreview();
    });
    requestQuantityRepeater?.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-action="add-quantity"]');
        if (addButton) {
            const quantities = readRequestQuantityItems();
            if (quantities.length >= getRequestQuantityCapacity()) return;
            quantities.push({ id: `qty-${quantities.length + 1}`, value: 0 });
            renderRequestQuantityRepeater(quantities);
            const inputs = requestQuantityRepeater.querySelectorAll('input[data-request-quantity-index]');
            inputs[inputs.length - 1]?.focus();
            invalidateQuickRequestPreview();
            return;
        }
        const removeButton = event.target.closest('[data-action="remove-quantity"]');
        if (removeButton) {
            const quantities = readRequestQuantityItems();
            if (quantities.length <= 1) return;
            quantities.pop();
            renderRequestQuantityRepeater(quantities);
            invalidateQuickRequestPreview();
        }
    });

    function closeQuoteLineMenus() {
        document.querySelectorAll('[data-line-menu-panel]').forEach((panel) => {
            panel.hidden = true;
            panel.style.removeProperty('--line-menu-top');
            panel.style.removeProperty('--line-menu-left');
            panel.style.removeProperty('--line-menu-max-height');
            if (panel.__lineMenuHome?.isConnected && panel.parentElement !== panel.__lineMenuHome) {
                panel.__lineMenuHome.appendChild(panel);
            }
        });
        rowsBody?.querySelectorAll('[data-line-menu-toggle]').forEach((toggle) => {
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

function positionQuoteLineMenu(trigger, panel) {
    const GAP = 6;
    const PAD = 10;
    const win = trigger.ownerDocument.defaultView;
    const triggerRect = trigger.getBoundingClientRect();

    // Calcular offset real del frame dentro de la ventana principal
    let frameOffsetTop = 0;
    let frameOffsetLeft = 0;
    try {
        const frameEl = win.frameElement;
        if (frameEl) {
            const frameRect = frameEl.getBoundingClientRect();
            frameOffsetTop  = frameRect.top;
            frameOffsetLeft = frameRect.left;
        }
    } catch(e) {}

    // Usar dimensiones de la ventana principal
    const vh = (win.parent || win).innerHeight;
    const vw = (win.parent || win).innerWidth;

    // Coordenadas del trigger en la ventana principal
    const realTop    = triggerRect.top    + frameOffsetTop;
    const realBottom = triggerRect.bottom + frameOffsetTop;
    const realLeft   = triggerRect.left   + frameOffsetLeft;
    const realRight  = triggerRect.right  + frameOffsetLeft;

    panel.style.removeProperty('--line-menu-max-height');

    const naturalHeight = panel.scrollHeight;
    const naturalWidth  = panel.offsetWidth || 260;

  const spaceBelow = vh - realBottom - PAD;
const spaceAbove = realTop - PAD;

let top;
if (naturalHeight <= spaceBelow) {
    // Cabe completo abajo → abrir abajo
    top = triggerRect.bottom + GAP;
} else if (naturalHeight <= spaceAbove) {
    // Cabe completo arriba → abrir arriba
    top = triggerRect.top - naturalHeight - GAP;
} else {
    // No cabe ni arriba ni abajo → centrar en ventana principal
    const centroVentana = (vh - naturalHeight) / 2;
    let topEnFrame = centroVentana - frameOffsetTop;
    
    // Asegurar que no se corte arriba ni abajo dentro del frame
    const frameHeight = win.innerHeight;
    topEnFrame = Math.max(PAD, topEnFrame);
    topEnFrame = Math.min(frameHeight - naturalHeight - PAD, topEnFrame);
    
    top = topEnFrame;
} 

    // Horizontal: izquierda → derecha → pegado al borde
    const leftOfTrigger  = realLeft  - naturalWidth - GAP;
    const rightOfTrigger = realRight + GAP;
    let left;
    if (leftOfTrigger >= PAD) {
        left = triggerRect.left - naturalWidth - GAP;
    } else if (rightOfTrigger + naturalWidth <= vw - PAD) {
        left = triggerRect.right + GAP;
    } else {
        left = Math.max(PAD - frameOffsetLeft, vw - naturalWidth - PAD - frameOffsetLeft);
    }

    panel.style.setProperty('--line-menu-top',  `${Math.round(top)}px`);
    panel.style.setProperty('--line-menu-left', `${Math.round(left)}px`);
}

function repositionOpenQuoteLineMenu() {
    const panel = document.querySelector('[data-line-menu-panel]:not([hidden])');
    if (!panel) return;
    const trigger = document.querySelector(`[data-line-menu-toggle="${panel.dataset.lineMenuPanel}"]`);
    if (trigger) positionQuoteLineMenu(trigger, panel);
}

    window.addEventListener('resize', repositionOpenQuoteLineMenu);
    window.addEventListener('scroll', repositionOpenQuoteLineMenu, true);

    form?.addEventListener('input', (event) => {
        if (event.target.classList.contains('is-invalid')) {
            event.target.classList.remove('is-invalid');
        }
        updateFinishCompactSummaries();
        invalidateQuickRequestPreview();
        renderAutomaticRoutePreview();
    });
    form?.addEventListener('change', (event) => {
        if (event.target.matches('.quote-request-toggle-chip input, .quote-request-shape-card input')) {
            syncToggleChipState();
        }
        if (event.target.matches('input[name="placement"]')) {
            getPlacementField()?.classList.remove('is-invalid');
        }
        if (event.target.matches('input[name="numbering"]')) {
            renderNumberingSummary();
        }
        if (event.target.classList.contains('is-invalid')) {
            event.target.classList.remove('is-invalid');
        }
        updateFinishCompactSummaries();
        invalidateQuickRequestPreview();
        renderAutomaticRoutePreview();
    });
    [numberingRangeStartInput, numberingRangeEndInput, numberingDetailInput].forEach((input) => {
        input?.addEventListener('input', renderNumberingSummary);
    });
    numberingAttachmentInput?.addEventListener('change', () => {
        handleNumberingAttachmentChange().catch((error) => setStatus(error.message, 'error'));
    });

    customerNameInput?.addEventListener('input', (e) => {
        if (customerCodeInput) customerCodeInput.value = '';
        resetContactSelect(customerContactSelect, 'Selecciona un cliente');
        searchPartners(e.target.value).catch(console.error);
    });
    customerNameInput?.addEventListener('focus', () => {
        if (!customerNameInput.value) return;
        searchPartners(customerNameInput.value).catch(console.error);
    });
    customerContactSelect?.addEventListener('change', () => customerContactSelect.classList.remove('is-invalid'));
    newCalcCustomerNameInput?.addEventListener('input', (event) => {
        if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
        resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
        searchNewCalcPartners(event.target.value).catch((error) => {
            if (error.name !== 'AbortError') setNewCalcStatus(error.message, 'error');
        });
    });
    newCalcCustomerNameInput?.addEventListener('focus', () => {
        if (!newCalcCustomerNameInput.value) return;
        searchNewCalcPartners(newCalcCustomerNameInput.value).catch((error) => {
            if (error.name !== 'AbortError') setNewCalcStatus(error.message, 'error');
        });
    });
    newCalcContactSelect?.addEventListener('change', () => newCalcContactSelect.classList.remove('is-invalid'));
    window.addEventListener('resize', () => {
        positionCustomerLookupPanel();
        positionNewCalcCustomerLookupPanel();
        positionRequestProductTypePanel();
        positionFixedSizePanel();
        positionMaterialSuggestionsPanel();
        positionShapePickerPanel();
        renderRequestQuantityRepeater();
    });
    window.addEventListener('scroll', () => {
        positionCustomerLookupPanel();
        positionNewCalcCustomerLookupPanel();
        positionRequestProductTypePanel();
        positionFixedSizePanel();
        positionMaterialSuggestionsPanel();
        positionShapePickerPanel();
    }, true);
    customerLookupResults?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) applyPartnerSelection(item.dataset.partnerCode, item.dataset.partnerName);
    });
    newCalcCustomerLookupResults?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) applyNewCalcPartnerSelection(item.dataset.partnerCode, item.dataset.partnerName);
    });
    fixedSizeTrigger?.addEventListener('click', () => toggleFixedSizePanel());
    fixedSizePanel?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-fixed-size-value]');
        if (!item || !fixedSizeSelect) return;
        fixedSizeSelect.value = item.dataset.fixedSizeValue || '';
        syncFixedSizeTrigger();
        fixedSizeTrigger.classList.remove('is-invalid');
        renderFixedSizePanel();
        toggleFixedSizePanel(false);
        fixedSizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    fixedSizeSelect?.addEventListener('change', () => {
        syncFixedSizeTrigger();
        invalidateQuickRequestPreview();
    });
    requestProductTypeTrigger?.addEventListener('click', () => toggleRequestProductTypePanel());
    requestProductTypePanel?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-product-type-value]');
        if (!item || !requestProductTypeSelect) return;
        requestProductTypeSelect.value = item.dataset.productTypeValue || '';
        syncRequestProductTypeTrigger();
        renderRequestProductTypePanel();
        toggleRequestProductTypePanel(false);
        requestProductTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    materialInput?.addEventListener('input', () => {
        materialInput.dataset.materialCode = '';
        showMaterialSuggestions();
    });
    materialInput?.addEventListener('focus', showMaterialSuggestions);
    materialSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            materialInput.value = item.dataset.value;
            materialInput.dataset.materialCode = item.dataset.code || '';
            hideInlinePanels();
            invalidateQuickRequestPreview();
        }
    });

    surfaceInput?.addEventListener('input', showSurfaceSuggestions);
    surfaceInput?.addEventListener('focus', showSurfaceSuggestions);
    surfaceSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            surfaceInput.value = item.dataset.value;
            hideInlinePanels();
            invalidateQuickRequestPreview();
        }
    });

    rowsBody?.addEventListener('click', (e) => {
        // Line submenu toggle
const menuToggle = e.target.closest('[data-line-menu-toggle]');
if (menuToggle) {
    e.stopPropagation();
    const lineId = menuToggle.dataset.lineMenuToggle;
    const panel = document.querySelector(`[data-line-menu-panel="${lineId}"]`);
    if (!panel) return;
    const isOpen = !panel.hidden;
    closeQuoteLineMenus();
    if (!isOpen) {
        panel.hidden = false;
        menuToggle.setAttribute('aria-expanded', 'true');
        positionQuoteLineMenu(menuToggle, panel);
    }
    return;
}

        const frontBackToggle = e.target.closest('[data-front-back-toggle]');
        if (frontBackToggle) {
            e.preventDefault();
            e.stopPropagation();
            const key = frontBackToggle.dataset.frontBackToggle || '';
            if (!key) return;
            if (expandedFrontBackGroupKeys.has(key)) {
                expandedFrontBackGroupKeys.delete(key);
            } else {
                expandedFrontBackGroupKeys.add(key);
            }
            renderQuotesTable(getFilteredQuotes());
            return;
        }

        const toggleButton = e.target.closest('[data-toggle-quote]');
        if (toggleButton) {
            const code = toggleButton.dataset.toggleQuote;
            if (!code) return;
            selectedQuoteContextCode = code;
            selectedQuoteContextLineId = 0;
            if (expandedQuoteCodes.has(code)) {
                expandedQuoteCodes.delete(code);
                if (selectedQuoteContextCode === code) {
                    selectedQuoteContextCode = [...expandedQuoteCodes][0] || '';
                }
                renderQuotesTable(getFilteredQuotes());
                return;
            }
            expandedQuoteCodes.add(code);
            renderQuotesTable(getFilteredQuotes());
            fetchQuoteLines(code)
                .then(() => renderQuotesTable(getFilteredQuotes()))
                .catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const proformaButton = e.target.closest('[data-print-proforma]');
        if (proformaButton) {
            const code = proformaButton.dataset.printProforma;
            if (!code) return;
            openProformaIfReady(code).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        // Add line button
        const addLineButton = e.target.closest('[data-add-line]');
        if (addLineButton) {
            const code = addLineButton.dataset.addLine;
            if (!code) return;
            addLineButton.disabled = true;
            createQuoteLineAndOpenCalculation(code)
                .catch((error) => setStatus(error.message, 'error'))
                .finally(() => { addLineButton.disabled = false; });
            return;
        }
        const lineActionButton = e.target.closest('[data-line-action]');
        if (lineActionButton) {
            e.preventDefault();
            e.stopPropagation();
            const row = quoteLineLookup.get(Number(lineActionButton.dataset.lineId));
            if (row) {
                selectedQuoteContextCode = row.quoteId || selectedQuoteContextCode;
                selectedQuoteContextLineId = Number(lineActionButton.dataset.lineId) || 0;
            }
            closeQuoteLineMenus();
            handleQuoteLineAction(lineActionButton.dataset.lineAction, row).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const deleteButton = e.target.closest('[data-delete-quote]');
        if (deleteButton) {
            const code = deleteButton.dataset.deleteQuote;
            if (!code) return;
            const confirmed = window.confirm(`Se eliminara la cotizacion ${code}. Esta accion no se puede deshacer. Deseas continuar?`);
            if (!confirmed) return;
            fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(code)}`, { method: 'DELETE' })
                .then(() => loadQuotes())
                .catch((error) => setStatus(error.message, 'error'));
            return;
        }
        closeQuoteLineMenus();
        const button = e.target.closest('[data-open-quote]');
        if (!button) return;
        const code = button.dataset.openQuote;
        if (!code) return;
        selectedQuoteContextCode = code;
        selectedQuoteContextLineId = 0;
        openQuoteDocument(code);
    });

    audioRecordButton?.addEventListener('click', toggleAudioRecording);

    attachmentsInput?.addEventListener('change', async () => {
        const files = [...(attachmentsInput.files || [])];
        for (const file of files) {
            const previewUrl = URL.createObjectURL(file);
            const mimeType = file.type || 'application/octet-stream';
            const fileExt = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
            pendingAttachments.push({
                kind: 'file',
                fileName: file.name,
                mimeType,
                fileExt,
                contentBase64: await readAsBase64(file),
                previewUrl,
                sizeLabel: formatFileSize(file.size),
                previewOrientation: await resolveAttachmentOrientation(file, previewUrl, mimeType),
                previewNote: getAttachmentPreviewKind({ mimeType, fileExt }) === 'none' ? 'Sin vista' : 'Vista disponible'
            });
        }
        attachmentsInput.value = '';
        renderAttachments();
    });

    attachmentsPreview?.addEventListener('click', (e) => {
        const removeIdx = e.target.closest('[data-remove-attachment]')?.dataset.removeAttachment;
        if (removeIdx !== undefined) {
            const removed = pendingAttachments.splice(Number(removeIdx), 1)[0];
            if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
            if (removed?.previewUrl && removed.previewUrl === activeAttachmentPreviewUrl) closeAttachmentPreview();
            renderAttachments();
            renderNumberingSummary();
            return;
        }
        const previewIdx = e.target.closest('[data-preview-attachment]')?.dataset.previewAttachment;
        if (previewIdx !== undefined) openAttachmentPreview(previewIdx);
    });

    attachmentPreviewClose?.addEventListener('click', closeAttachmentPreview);
    attachmentPreviewModal?.addEventListener('click', (e) => {
        if (e.target === attachmentPreviewModal) closeAttachmentPreview();
    });
    attachmentPreviewContent?.addEventListener('click', (e) => {
        const zoomButton = e.target.closest('[data-preview-zoom]');
        if (!zoomButton || !isZoomablePreviewKind(attachmentPreviewState.kind)) return;
        const action = zoomButton.dataset.previewZoom;
        if (action === 'in') setAttachmentPreviewScale(attachmentPreviewState.scale + 0.25);
        if (action === 'out') setAttachmentPreviewScale(attachmentPreviewState.scale - 0.25);
        if (action === 'reset') resetAttachmentPreviewTransform(attachmentPreviewState.kind);
    });
    attachmentPreviewContent?.addEventListener('wheel', (e) => {
        if (!isZoomablePreviewKind(attachmentPreviewState.kind)) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.18 : 0.18;
        setAttachmentPreviewScale(attachmentPreviewState.scale + delta);
    }, { passive: false });
    attachmentPreviewContent?.addEventListener('pointerdown', (e) => {
        const stage = e.target.closest('[data-preview-stage]');
        if (!stage || !isZoomablePreviewKind(attachmentPreviewState.kind) || attachmentPreviewState.scale <= 1.01) return;
        e.preventDefault();
        attachmentPreviewState.dragging = true;
        attachmentPreviewState.pointerId = e.pointerId;
        attachmentPreviewState.startX = e.clientX - attachmentPreviewState.x;
        attachmentPreviewState.startY = e.clientY - attachmentPreviewState.y;
        stage.setPointerCapture?.(e.pointerId);
        applyAttachmentPreviewTransform();
    });
    attachmentPreviewContent?.addEventListener('pointermove', (e) => {
        if (!attachmentPreviewState.dragging || attachmentPreviewState.pointerId !== e.pointerId) return;
        e.preventDefault();
        attachmentPreviewState.x = e.clientX - attachmentPreviewState.startX;
        attachmentPreviewState.y = e.clientY - attachmentPreviewState.startY;
        applyAttachmentPreviewTransform();
    });
    const stopPreviewDrag = (e) => {
        if (!attachmentPreviewState.dragging) return;
        if (e && attachmentPreviewState.pointerId !== null && e.pointerId !== attachmentPreviewState.pointerId) return;
        attachmentPreviewState.dragging = false;
        attachmentPreviewState.pointerId = null;
        applyAttachmentPreviewTransform();
    };
    attachmentPreviewContent?.addEventListener('pointerup', stopPreviewDrag);
    attachmentPreviewContent?.addEventListener('pointercancel', stopPreviewDrag);
}

async function init() {
    const canFullAccess = canCreateModule('cotizaciones');
    const canCreateCalc = true;
    const canCreateReq  = canCreateModule('solicitudes') || canFullAccess;
    if (nuevoCalculoButton) {
        nuevoCalculoButton.hidden = !canCreateCalc;
    }
    if (nuevaCotizacionButton) {
        nuevaCotizacionButton.hidden = !canCreateReq;
    }
    if (launcherWrap) {
        launcherWrap.hidden = true;
    }
    initFinishCompactPanels();
    renderAttachments();
    renderNumberingSummary();
    renderRequestQuantityRepeater([0]);
    renderAutomaticRoutePreview();
    renderQuickRequestSummaryPlaceholder('Completa los pasos anteriores para generar el resumen final.');
    updateQuickRequestWizard();
    bindEvents();
    syncToggleChipState();
    loadSapTemplate();
    await Promise.all([loadConfig(), loadQuotes(), loadSmartCatalogs()]);

    if (launcherWrap) {
        if (disableQuoteRequestLauncherDrag) {
            localStorage.removeItem(LAUNCHER_POSITION_KEY);
            setDefaultLauncherPosition();
        } else {
            const savedPos = localStorage.getItem(LAUNCHER_POSITION_KEY);
            if (savedPos) {
                try {
                    const pos = JSON.parse(savedPos);
                    if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                        launcherWrap.style.left = `${pos.x}px`;
                        launcherWrap.style.top = `${pos.y}px`;
                        launcherWrap.style.right = 'auto';
                        launcherWrap.style.bottom = 'auto';
                    }
                } catch (e) {
                    console.error('No fue posible restaurar posicion del launcher.', e);
                }
            }
        }
    }
}

init().catch((error) => {
    console.error(error);
    setStatus(error.message || 'No fue posible inicializar cotizaciones.', 'error');
});

// ── Drag & Drop para reordenar líneas de cálculo ──────────────────────────────

function initLineDragDrop() {
    if (!rowsBody) return;
    if (lineDragDropInitialized) return;
    lineDragDropInitialized = true;

    rowsBody.addEventListener('dragstart', (e) => {
        const article = e.target.closest('.quote-master-line[draggable]');
        if (!article) return;
        lineDragState = {
            lineId: Number(article.dataset.lineId),
            quoteId: article.dataset.quoteId,
            sourceIndex: Number(article.dataset.lineIndex)
        };
        article.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', article.dataset.lineId);
    });

    rowsBody.addEventListener('dragend', (e) => {
        rowsBody.querySelectorAll('.quote-master-line').forEach((el) => {
            el.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom');
        });
        lineDragState = null;
    });

    rowsBody.addEventListener('dragover', (e) => {
        const target = e.target.closest('.quote-master-line[draggable]');
        if (!target || !lineDragState) return;
        if (target.dataset.quoteId !== lineDragState.quoteId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        rowsBody.querySelectorAll('.quote-master-line').forEach((el) => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
            target.classList.add('drag-over-top');
        } else {
            target.classList.add('drag-over-bottom');
        }
    });

    rowsBody.addEventListener('dragleave', (e) => {
        const target = e.target.closest('.quote-master-line[draggable]');
        if (target) {
            target.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });

    rowsBody.addEventListener('drop', async (e) => {
        const target = e.target.closest('.quote-master-line[draggable]');
        if (!target || !lineDragState) return;
        if (target.dataset.quoteId !== lineDragState.quoteId) return;
        e.preventDefault();

        const targetIndex = Number(target.dataset.lineIndex);
        const sourceIndex = lineDragState.sourceIndex;
        const quoteId = lineDragState.quoteId;

        rowsBody.querySelectorAll('.quote-master-line').forEach((el) => {
            el.classList.remove('drag-over-top', 'drag-over-bottom', 'is-dragging');
        });

        if (sourceIndex === targetIndex) return;

        const rect = target.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        let destIndex = insertBefore ? targetIndex : targetIndex + 1;
        if (sourceIndex < destIndex) destIndex -= 1;

        const lines = quoteLineCache.get(quoteId) ? [...quoteLineCache.get(quoteId)] : [];
        if (!lines.length) return;

        const [moved] = lines.splice(sourceIndex, 1);
        lines.splice(destIndex, 0, moved);
        quoteLineCache.set(quoteId, lines);
        renderQuotesTable(getFilteredQuotes());

        try {
            await persistQuoteLineOrder(quoteId, lines);
        } catch (err) {
            setStatus('No fue posible guardar el nuevo orden.', 'error');
        }
    });
}

// Initialize drag & drop after DOM is ready
document.addEventListener('DOMContentLoaded', initLineDragDrop);
if (document.readyState !== 'loading') initLineDragDrop();
