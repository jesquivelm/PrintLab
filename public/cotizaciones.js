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
const DEFAULT_APPLICATION_OPTIONS = ['Botella', 'Caja', 'Carton', 'Envase', 'Frasco', 'Pouch', 'Tapa', 'Vidrio'];
const DEFAULT_SURFACE_OPTIONS = ['Lisa', 'Rugosa', 'Porosa', 'Húmeda'];
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
const requestManualContact = document.getElementById('requestManualContact');
const requestManualContactName = document.getElementById('requestManualContactName');
const requestManualContactEmail = document.getElementById('requestManualContactEmail');
const requestManualContactPhone = document.getElementById('requestManualContactPhone');
const requestManualContactSave = document.getElementById('requestManualContactSave');
const newCalcManualContact = document.getElementById('newCalcManualContact');
const newCalcManualContactName = document.getElementById('newCalcManualContactName');
const newCalcManualContactEmail = document.getElementById('newCalcManualContactEmail');
const newCalcManualContactPhone = document.getElementById('newCalcManualContactPhone');
const newCalcManualContactSave = document.getElementById('newCalcManualContactSave');
const MANUAL_CONTACT_REFS = {
    [customerContactSelect?.id]: { block: requestManualContact, name: requestManualContactName, email: requestManualContactEmail, phone: requestManualContactPhone, save: requestManualContactSave },
    [newCalcContactSelect?.id]: { block: newCalcManualContact, name: newCalcManualContactName, email: newCalcManualContactEmail, phone: newCalcManualContactPhone, save: newCalcManualContactSave }
};
const newCalcCustomerLookupPanel = document.getElementById('newCalcCustomerLookupPanel');
const newCalcCustomerLookupResults = document.getElementById('newCalcCustomerLookupResults');
const newCalcStatusNode = document.getElementById('nuevoCalculoStatus');
const newCalcFormatRadios = newCalcPopover ? Array.from(newCalcPopover.querySelectorAll('input[name="newCalcFormat"]')) : [];
const newCalcFrontBackFields = document.getElementById('newCalcFrontBackFields');
const newCalcFrenteNombreInput = document.getElementById('nuevoCalculoFrenteNombre');
const newCalcDorsoNombreInput = document.getElementById('nuevoCalculoDorsoNombre');
const requestProcessTypeInput = document.getElementById('requestProcessType');
const fixedSizeSelect = document.getElementById('requestFixedSize');
const fixedSizeTrigger = document.getElementById('requestFixedSizeTrigger');
const fixedSizePanel = document.getElementById('requestFixedSizePanel');
const customSizeFields = document.getElementById('requestCustomSizeFields');
const customWidthInput = document.getElementById('requestCustomWidth');
const customHeightInput = document.getElementById('requestCustomHeight');
const customWidthLabel = document.getElementById('requestCustomWidthLabel');
const customHeightField = document.getElementById('requestCustomHeightField');
const materialInput = document.getElementById('requestMaterial');
const materialSuggestions = document.getElementById('materialSuggestions');
const surfaceInput = document.getElementById('requestSurface');
const surfaceSuggestions = document.getElementById('surfaceSuggestions');
const surfaceTypeInput = document.getElementById('requestSurfaceType');
const surfaceTypeSuggestions = document.getElementById('surfaceTypeSuggestions');
const requestProductTypeSelect = document.getElementById('requestProductType');
const requestProductTypeTrigger = document.getElementById('requestProductTypeTrigger');
const requestProductTypePanel = document.getElementById('requestProductTypePanel');
const requestQuantityRepeater = document.getElementById('requestQuantityRepeater');
const requestStampingMaterialSelect = document.getElementById('requestStampingMaterial');
const requestLaminadoMaterialSelect = document.getElementById('requestLaminadoMaterial');
const routePreviewConfig = document.getElementById('requestRoutePreviewConfig');
const routePreviewList = document.getElementById('requestRoutePreviewList');
const wizardSections = Array.from(form?.querySelectorAll('.quote-request-section[data-step]') || []);
const wizardProgress = document.getElementById('quoteWizardProgress');
const wizardBackButton = document.getElementById('quoteWizardBackButton');
const wizardNextButton = document.getElementById('quoteWizardNextButton');
const wizardPrintButton = document.getElementById('quoteWizardPrintButton');
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
const requestTroquelTrigger = document.getElementById('requestTroquelTrigger');
const requestTroquelCodeInput = document.getElementById('requestTroquelCode');
const requestTroquelDescriptionInput = document.getElementById('requestTroquelDescription');
const requestTroquelShapeInput = document.getElementById('requestTroquelShape');
const requestVarnishMaterialSelect = document.getElementById('requestVarnishMaterial');
const requestClientSkuInput = document.getElementById('requestClientSku');
const requestInsumoArteDigital = document.getElementById('requestInsumoArteDigital');
const requestInsumoMuestrasFisicas = document.getElementById('requestInsumoMuestrasFisicas');
const requestInsumoEnvase = document.getElementById('requestInsumoEnvase');
const requestInkGroup = document.getElementById('requestInkGroup');
const requestUseCmykInput = document.getElementById('requestUseCmyk');
const requestNoPrintInput = document.getElementById('requestNoPrint');
const requestDirectColorInput = document.getElementById('requestDirectColorInput');
const requestDirectColorAdd = document.getElementById('requestDirectColorAdd');
const requestDirectColorMenu = document.getElementById('requestDirectColorMenu');
const requestDirectColorList = document.getElementById('requestDirectColorList');
const requestOutputTypeSelect = document.getElementById('requestOutputType');
const requestOutputTypeFrame = document.getElementById('requestOutputTypeFrame');
const requestLabelingTypeSelect = document.getElementById('requestLabelingType');
const requestReferenciaInput = document.getElementById('requestReferencia');
const requestReferenciaSearchBtn = document.getElementById('requestReferenciaSearchBtn');
const requestReferenciaChanges = document.getElementById('requestReferenciaChanges');
const requestRefCambioMedidas = document.getElementById('requestRefCambioMedidas');
const requestRefCambioArte = document.getElementById('requestRefCambioArte');
const requestRefCambioTextos = document.getElementById('requestRefCambioTextos');
const requestRefCambioOtros = document.getElementById('requestRefCambioOtros');
const requestReferenciaComentario = document.getElementById('requestReferenciaComentario');
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

function canSeeCotizadorSeguimiento() {
    const session = readUserSession();
    const permissionName = String(session?.permissionName || '').trim();
    return /administrador(?:es)?|implementador(?:es)?|emergencia|cotizador(?:es)?/i.test(permissionName);
}

function canUseQuoteQuickFilters() {
    if (canSeeCotizadorSeguimiento()) return true;
    const session = readUserSession();
    const permissionName = String(session?.permissionName || '').trim();
    return /vendedor(?:es)?/i.test(permissionName);
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
let requestProductTypesCatalogo = null;
let quoteCatalog = [];
let cotizacionesCargadas = false;
let quoteSearchTimer = null;
let quoteSortState = { key: null, dir: null };
let quotesQuickFilter = 'todas';

function setQuotesQuickFilter(value) {
    quotesQuickFilter = value === 'crear-orden' || value === 'pendientes' || value === 'sin-enviar' ? value : 'todas';
    renderQuotesTable(getFilteredQuotes());
    updateQuotesQuickFilterButtons();
}

function updateQuotesQuickFilterButtons() {
    const row = document.getElementById('quotesQuickFilterRow');
    if (!row) return;
    row.hidden = !canUseQuoteQuickFilters();
    row.querySelectorAll('.quote-quickfilter-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.quickFilter === quotesQuickFilter);
    });
}

function sortQuotesList(data) {
    if (!quoteSortState.key || !quoteSortState.dir) return data;
    return [...data].sort((a, b) => {
        const key = quoteSortState.key;
        let va = a[key], vb = b[key];
        if (va == null) return 1;
        if (vb == null) return -1;
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        if (va < vb) return quoteSortState.dir === 'asc' ? -1 : 1;
        if (va > vb) return quoteSortState.dir === 'asc' ? 1 : -1;
        const da = a.created_at_tz, db = b.created_at_tz;
        if (da && db) return new Date(db) - new Date(da);
        return 0;
    });
}

function updateQuoteSortIndicators() {
    const ascConf = getResolvedIcon(['sortAsc'], 'sortAsc');
    const descConf = getResolvedIcon(['sortDesc'], 'sortDesc');
    document.querySelectorAll('th[data-sort-key]').forEach(th => {
        const span = th.querySelector('.sort-indicator');
        if (!span) return;
        if (quoteSortState.key === th.dataset.sortKey) {
            th.classList.add('is-sorted');
            const conf = quoteSortState.dir === 'asc' ? ascConf : descConf;
            span.innerHTML = iconMarkup(conf.value, 'Orden ' + (quoteSortState.dir === 'asc' ? 'ascendente' : 'descendente'), 'sort-indicator-icon');
            span.style.setProperty('--icon-color', conf.color);
            span.style.setProperty('--config-icon-size', conf.size + 'px');
        } else {
            th.classList.remove('is-sorted');
            span.innerHTML = '';
            span.style.removeProperty('--icon-color');
            span.style.removeProperty('--config-icon-size');
        }
    });
}
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
let trackingUserPhotos = new Map();
let partnerLookupAbort = null;
let requestContactAbort = null;
let newCalcPartnerLookupAbort = null;
let newCalcContactAbort = null;
let materialItems = [];
let applicationItems = [...DEFAULT_APPLICATION_OPTIONS];
let surfaceTypeItems = [...DEFAULT_SURFACE_OPTIONS];
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
    requestId: createQuoteRequestId(),
    previewQuoteCode: '',
    previewFirstLineCode: '',
    previewFingerprint: '',
    previewProforma: null,
    previewDirty: false,
    keepPreviewQuote: false
};
let quoteRequestSubmitInFlight = false;

function createQuoteRequestId() {
    return `qr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeConfiguredList(rawValue) {
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
    return items;
}

function resolveConfiguredProductTypes() {
    if (Array.isArray(requestProductTypesCatalogo) && requestProductTypesCatalogo.length) {
        return requestProductTypesCatalogo;
    }
    return [...DEFAULT_PRODUCT_TYPES];
}

async function loadRequestProductTypesCatalogo() {
    try {
        const payload = await fetchJson('/api/productos/tipos');
        const tipos = Array.isArray(payload?.tipos) ? payload.tipos : [];
        const flexografia = tipos.filter((item) => String(item.department_name || '').trim().toLowerCase() === 'flexografía' && item.active !== false)
            .map((item) => String(item.name || '').trim())
            .filter(Boolean);
        if (flexografia.length) {
            requestProductTypesCatalogo = flexografia;
        }
        renderRequestProductTypeOptions();
    } catch (error) {
        requestProductTypesCatalogo = null;
    }
}

function resolveConfiguredApplicationOptions() {
    const items = normalizeConfiguredList(loadedConfig?.general?.quoteApplicationOptionsJson);
    return items.length ? items : [...DEFAULT_APPLICATION_OPTIONS];
}

function resolveConfiguredSurfaceOptions() {
    const items = normalizeConfiguredList(loadedConfig?.general?.quoteSurfaceOptionsJson);
    return items.length ? items : [...DEFAULT_SURFACE_OPTIONS];
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

function positionSurfaceSuggestionsPanel(panel, input) {
    if (!panel || !input || panel.hidden) return;
    if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }
    const rect = input.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const top = rect.bottom + 2;
    const maxHeight = Math.max(140, Math.min(420, window.innerHeight - top - viewportGap));

    panel.style.setProperty('--quote-surface-panel-left', `${left}px`);
    panel.style.setProperty('--quote-surface-panel-top', `${top}px`);
    panel.style.setProperty('--quote-surface-panel-width', `${width}px`);
    panel.style.setProperty('--quote-surface-panel-max-height', `${maxHeight}px`);
}

function positionSurfacePanels() {
    positionSurfaceSuggestionsPanel(surfaceSuggestions, surfaceInput);
    positionSurfaceSuggestionsPanel(surfaceTypeSuggestions, surfaceTypeInput);
}

function syncFixedSizeTrigger() {
    if (!fixedSizeSelect || !fixedSizeTrigger) return;
    const textNode = fixedSizeTrigger.querySelector('[data-fixed-size-text]');
    const selected = fixedSizeSelect.selectedOptions?.[0];
    if (textNode) textNode.textContent = selected?.textContent || 'Selecciona una medida';
    toggleCustomSizeFields();
}

function syncCustomUnitMask(input) {
    if (!input) return;
    const wrap = input.closest('.quote-request-unit-wrap');
    const mask = wrap?.querySelector('.quote-request-unit-mask');
    const value = String(input.value || '').trim();
    if (mask) mask.textContent = value ? `${value}in` : '';
    wrap?.classList.toggle('has-value', Boolean(value));
}

function syncCustomSizeUnitMasks() {
    syncCustomUnitMask(customWidthInput);
    syncCustomUnitMask(customHeightInput);
}

function toggleCustomSizeFields() {
    if (!customSizeFields || !fixedSizeSelect) return;
    customSizeFields.hidden = fixedSizeSelect.value !== 'custom';
    syncCustomSizeForShape();
    syncCustomSizeUnitMasks();
}

function renderFixedSizePanel() {
    if (!fixedSizePanel || !fixedSizeSelect) return;
    const selected = fixedSizeSelect.value || '';
    const options = Array.from(fixedSizeSelect.options)
        .filter((option) => option.value)
        .sort((a, b) => (a.value === 'custom' ? -1 : b.value === 'custom' ? 1 : 0));
    fixedSizePanel.innerHTML = options.map((option) => `
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
        varnish: normalizeText(requestVarnishMaterialSelect?.value) || 'Sin Barniz',
        stamping: normalizeText(requestStampingMaterialSelect?.value) || 'Ninguno',
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

function normalizeNetworkErrorMessage(message, fallback = 'No fue posible completar la solicitud.') {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();
    if (!text || (lower.includes('failed') && lower.includes('fetch')) || lower.includes('networkerror') || lower.includes('load failed')) {
        return 'La información está tardando más de lo normal. Intenta abrirla de nuevo en unos segundos.';
    }
    return text || fallback;
}

function setStatus(message, tone = 'info') {
    if (!statusNode) return;
    const safeMessage = normalizeNetworkErrorMessage(message, '');
    statusNode.hidden = !message;
    statusNode.textContent = safeMessage || '';
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}, settings = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const retries = Number(settings.retries ?? (method === 'GET' ? 2 : 0));
    const retryDelay = Number(settings.retryDelay ?? 700);
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(url, options);
            const payload = await response.json().catch(() => ({}));
            if (response.ok) return payload;
            lastError = new Error(payload.error || 'No fue posible completar la solicitud.');
            lastError.noRetry = response.status < 500;
            if (response.status < 500 || attempt === retries) throw lastError;
        } catch (error) {
            if (error?.name === 'AbortError') throw error;
            if (error?.noRetry) throw error;
            lastError = error;
            if (attempt === retries) {
                throw new Error(normalizeNetworkErrorMessage(error?.message || lastError?.message));
            }
        }
        await sleep(retryDelay * (attempt + 1));
    }
    throw new Error(normalizeNetworkErrorMessage(lastError?.message));
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
        if (text.startsWith('/assets/') || text.startsWith('data:image') || text.startsWith('http')) return value;
        const keyText = String(key || '').toLowerCase();
        const assetLike = /(image|imagen|logo|foto|photo|font|background|screensaver|repositorio|repository)/.test(keyText);
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
    return normalized.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(normalized);
}

function isImageValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(normalized);
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
        const safeValue = escapeHtml(value);
        target.innerHTML = `<span class="icon-image-wrap" role="img" aria-label="" style="--config-icon-size:${escapeHtml(String(size || 18))}px;width:${escapeHtml(String(size || 18))}px;height:${escapeHtml(String(size || 18))}px;"><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${safeValue}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
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
        return `<span class="icon-image-wrap ${extraClass}" role="img" aria-label="${escapeHtml(altText)}"><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${escapeHtml(value)}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
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
    if (requestDirectColorAdd) {
        requestDirectColorAdd.style.setProperty('--icon-color', qtyAddConf.color || '#0b81b8');
        requestDirectColorAdd.style.setProperty('--icon-hover-color', qtyAddConf.hover || '#0b6a97');
        renderIcon(requestDirectColorAdd, qtyAddConf.value, qtyAddConf.color || '#0b81b8', qtyAddConf.size || 18);
    }
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

    const general = loadedConfig?.general || {};
    const icons = loadedConfig?.icons || {};
    const addIconValue = icons.tableAdd || icons.quantityAdd || '+';
    const addIconColor = general.iconColorTableAdd || general.iconColorQuantityAdd || general.iconColor || '#178fc7';
    const addIconSize = Number(general.iconSizeTableAdd || general.iconSizeQuantityAdd) || 16;
    [nuevoCalculoButton, nuevaCotizacionButton].forEach((button) => {
        if (!button) return;
        const label = (button.querySelector('.quote-browser-action-label')?.textContent || button.textContent).trim();
        button.innerHTML = `${iconMarkup(addIconValue, label, 'table-icon-media')}<span class="quote-browser-action-label">${escapeHtml(label)}</span>`;
        button.style.setProperty('--icon-color', addIconColor);
        button.style.setProperty('--config-icon-size', `${addIconSize}px`);
    });
    const troquelAddButton = document.getElementById('requestTroquelAddButton');
    if (troquelAddButton) {
        troquelAddButton.innerHTML = iconMarkup(addIconValue, 'Buscar troquel', 'table-icon-media');
        troquelAddButton.style.setProperty('--icon-color', addIconColor);
        troquelAddButton.style.setProperty('--config-icon-size', `${addIconSize}px`);
    }
    if (requestReferenciaSearchBtn) {
        requestReferenciaSearchBtn.innerHTML = iconMarkup(addIconValue, 'Buscar referencia del cliente', 'table-icon-media');
        requestReferenciaSearchBtn.style.setProperty('--icon-color', addIconColor);
        requestReferenciaSearchBtn.style.setProperty('--config-icon-size', `${addIconSize}px`);
    }
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
    const autoSelection = raw.Seleccion_Automatica || {};
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
    const measure = isCircularShapeValue(raw['REQ | Forma'])
        ? (raw['DIMENSIONES ETIQUETA | ANCHO'] ? `Diámetro ${raw['DIMENSIONES ETIQUETA | ANCHO']}` : summary.measure)
        : (summary.measure || [summary.width_in, summary.length_in].filter((value) => value || value === 0).join(' x '));
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
        materialCode: summary.material_code || line.material_code || '',
        medida: measure || '',
        machineName: summary.machine_name || line.machine_name || '',
        dieCode: summary.die_code || line.die_code || '',
        processType: summary.process_type || line.process_type || '',
        processSequenceText: summary.process_sequence_text || line.process_sequence_text || '',
        frontBackGroup: normalizeFrontBackGroupClient(line.grupo_frente_dorso || line.front_back_group || summary.grupo_frente_dorso || summary.front_back_group || raw),
        estado: summary.status || line.status || 'Borrador',
        finalizadaOrden: Boolean(summary.finalized_for_order || line.finalized_for_order),
        ordenCodigo: String(line.order_code || summary.order_code || '').trim(),
        productoCodigos: Array.isArray(line.product_codes) ? line.product_codes.filter(Boolean) : [],
        calculationBlockMessage,
        subtotal1: fallbackTotal ?? '',
        productId: summary.product_code || line.product_code || line.line_code || '',
        quantity: pickFirstMeaningfulNumber(summary.quantity, line.quantity),
        autoRoute: autoSelection.processType || line.process_type || '',
        autoMaterialCode: autoSelection.materialCode || line.material_code || '',
        autoMaterialName: line.material_name || '',
        autoMaterialFamily: autoSelection.materialFamily || '',
        autoMachineName: autoSelection.machineName || line.machine_name || '',
        autoDieCode: autoSelection.dieCode || line.die_code || '',
        autoLabelsPerRoll: pickFirstMeaningfulNumber(autoSelection.labelsPerRoll),
        autoMountingSummary: '',
        autoTechnicalComment: '',
        autoWarnings,
        autoFallbackApplied: false
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
    { key: 'sellos', label: 'Sellos' },
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
    if (text.includes('troquelado')) return 'troquelado';
    if (text.includes('troquel')) return 'troquel';
    if (text.includes('sello') || text.includes('cliche') || text.includes('fotopol')) return 'sellos';
    if (text.includes('impresion') || text.includes('maquina de impresion')) return 'impresion';
    if (text.includes('preprensa')) return 'preprensa';
    if (text.includes('diseno') || text.includes('arte')) return 'diseno';
    if (text.includes('rebob')) return 'rebobinado';
    if (text.includes('barniz')) return 'barnizado';
    if (text.includes('laminad')) return 'laminado';
    if (text.includes('estamp')) return 'estampado';
    if (text.includes('embos')) return 'embosado';
    if (text.includes('empaque') || text.includes('rollo')) return 'empaque';
    if (text.includes('sustrato') || text.includes('material')) return 'sustrato';
    const match = PROFORMA_BLOCK_PROCESS_LABELS.find((item) => {
        const label = normalizeProformaIssueText(item.label);
        return label && text.includes(label);
    });
    return match?.key || '';
}

function processLabelFromKey(processKey = '') {
    const baseKey = String(processKey || '').split('-')[0];
    return PROFORMA_BLOCK_PROCESS_LABELS.find((item) => item.key === baseKey)?.label || baseKey || 'Faltante';
}

function summarizeProformaIssuesByProcess(issues = []) {
    const map = new Map();
    (Array.isArray(issues) ? issues : []).forEach((issue) => {
        const processKey = String(issue?.processKey || processKeyFromIssueText(issue?.message || '') || '').trim();
        const baseKey = processKey.split('-')[0];
        const label = processLabelFromKey(baseKey);
        const key = baseKey || String(issue?.message || '').trim();
        if (!key || map.has(key)) return;
        map.set(key, {
            ...issue,
            processKey: baseKey,
            message: baseKey ? `${label} requiere configuración.` : String(issue?.message || '').trim()
        });
    });
    return [...map.values()];
}

function isFrontBackChildElement(raw = {}, line = {}) {
    const group = raw.grupoFrenteDorso || raw.grupo_frente_dorso || raw.frontBackGroup || raw.Grupo_Frente_Dorso
        || line.grupo_frente_dorso || line.front_back_group;
    if (!group || typeof group !== 'object') return false;
    const role = String(group.role || '').toLowerCase();
    return ['elemento', 'componente', 'frente', 'dorso'].includes(role);
}

function proformaBlockIssuesFromLine(line = {}) {
    const raw = line.raw_data || line.rawData || {};
    const isFrontBackChild = isFrontBackChildElement(raw, line);
    const messages = Array.isArray(raw.Mensajes_Validacion)
        ? raw.Mensajes_Validacion.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const fallback = String(raw['ANALISIS CAMPOS PDF'] || raw['ANALISIS CAMPOS CREAR ORDEN'] || raw['ANALISIS CAMPOS FINALIZAR'] || '').trim();
    return [...new Set(messages.length ? messages : (fallback ? [fallback] : []))]
        .map((message) => ({ message, processKey: processKeyFromIssueText(message) }))
        .filter((issue) => {
            if (isFrontBackChild) {
                const allowed = ['preprensa', 'rebobinado'];
                return allowed.includes(String(issue.processKey || '').split('-')[0]);
            }
            return true;
        });
}

async function getProformaBlockMessage(quoteCode) {
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}`, { headers: sessionHeader() });
    const lines = Array.isArray(payload?.lineas) ? payload.lineas : [];
    const blocked = lines
        .map((line) => ({
            lineCode: String(line.line_code || line.linea || '').trim(),
            quoteCode,
            productId: line.product_code || '',
            department: line.department || 'Flexografia',
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
        showCenterMessage(blockMessage, { html: true, duration: 8000 });
        setStatus('La proforma se abrió con advertencias: hay datos pendientes en algunas líneas.', 'warning');
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
    const group = rowOrRaw?.grupoFrenteDorso || rowOrRaw?.grupo_frente_dorso || rowOrRaw?.frontBackGroup || rowOrRaw?.rawData?.grupoFrenteDorso || rowOrRaw?.rawData?.Grupo_Frente_Dorso || rowOrRaw?.Grupo_Frente_Dorso || rowOrRaw;
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
            children.forEach((child, childIndex) => {
                nodes.push({
                    line: child,
                    sourceIndex: childIndex,
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
    if (isCircularShapeValue(raw['REQ | Forma']) && width) items.push(`Diámetro ${width}`);
    else if (width && length) items.push(`${width} x ${length}`);
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
    if (barniz) {
        const barnizReservado = ['si', 'sí', 'yes', 'true', '1'].includes(
            normalizeText(raw['REQ | Barniz Zonificado'] || raw['CONV | BARNIZ | ZONIFICADO']).toLowerCase()
        );
        parts.push(`Barniz ${barniz}${barnizReservado ? ' reservado' : ''}`);
    }
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

function formatQuoteLineMeasure(row) {
    const raw = row.rawData || {};
    const width = String(raw['DIMENSIONES ETIQUETA | ANCHO'] ?? '').trim();
    const length = String(raw['DIMENSIONES ETIQUETA | LARGO'] ?? '').trim();
    if (isCircularShapeValue(raw['REQ | Forma'] || raw['GENERAL | TROQUEL | FORMA'])) {
        return width ? `Diámetro ${width}` : String(row.medida ?? '').trim();
    }
    if (width && length) return `${width} x ${length}`;
    return String(row.medida ?? '').trim();
}

function renderQuoteLineDetail(row, index) {
    const raw = row.rawData || {};
    const lineCode = cleanQuoteDetail(row.linea || row.originalLinea || `LC${String(index + 1).padStart(5, '0')}`);
    const title = cleanQuoteDetail(row.nombreTrabajo) || 'Sin nombre';
    const measure = cleanQuoteDetail(formatQuoteLineMeasure(row));
    const quantities = formatQuoteLineQuantities(row);
    const material = cleanQuoteDetail(row.material || raw['REQ | Sustrato'] || raw['SUSTRATO'] || raw['MATERIAL']);
    const die = formatQuoteLineDie(row);
    const finishParts = buildQuoteLineFinishParts(row);
    const secondLine = [
        quantities ? `Cantidad: ${quantities}` : '',
        material
    ].filter(Boolean).join(' | ');
    const thirdLine = die ? escapeHtml(die) : '';
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
        frontBack: ['lineFrontBack', 'lineCreateQuote'],
        tracking: ['lineTracking'],
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
        frontBack: 'lineFrontBack',
        tracking: 'lineTracking',
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
        frontBack: 'LineFrontBack',
        tracking: 'LineTracking',
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

async function createNewQuoteFromLine(row, options = {}) {
    const shouldConfirm = options.confirm !== false;
    if (shouldConfirm) {
        const confirmed = window.confirm(`¿Quieres crear una nueva cotización a partir de la línea ${row.linea}?`);
        if (!confirmed) return;
    }
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/nueva-cotizacion`, {
        method: 'POST',
        headers: sessionHeader()
    });
    const newQuoteCode = payload?.cotizacion?.quote_code || '';
    closeLineActionModal();
    await loadQuotes();
    setStatus(`Cotización ${newQuoteCode} creada desde la línea ${row.linea}.`, 'saved');
    if (newQuoteCode && options.openQuote !== false) openQuoteDocument(newQuoteCode);
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
    const cont = document.getElementById('lineActionAdjuntosProducto');
    if (!cont || !window.AdjuntosProducto) return;
    window.AdjuntosProducto.crear({
        contenedor: cont,
        contexto: { cotizacion: row.quoteId || '', linea: row.linea || '' },
        origenSubida: 'cotizacion',
        titulo: '',
        sessionHeaders: typeof sessionHeader === 'function' ? sessionHeader : undefined,
        renderizarIcono: function (el, cual) {
            if (!el) return;
            var conf;
            if (cual === 'audio') conf = iconConfigFor('quoteRequestRecord');
            else if (cual === 'descargar') conf = iconConfigFor('attachmentDownload');
            else conf = iconConfigFor('quoteRequestAttachment');
            renderIcon(el, conf.value, conf.color, conf.size);
        }
    });
}

function openLineAttachmentsModal(row) {
    lineActionState = { row, mode: 'attachments' };
    openLineActionModal(`Adjuntos de ${row.linea || 'línea'}`, `
        <div id="lineActionAdjuntosProducto"></div>
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

function trackingUserLookupKey(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function registerTrackingUserPhoto(map, value, photoUrl) {
    const key = trackingUserLookupKey(value);
    const photo = String(photoUrl || '').trim();
    if (key && photo && !map.has(key)) map.set(key, photo);
}

async function loadTrackingUserPhotos() {
    try {
        const payload = await fetchJson('/api/admin-users', { headers: sessionHeader() });
        const map = new Map();
        const session = readUserSession() || {};
        const sessionPhoto = session.photoUrl || session.photo_url || '';
        [session.name, session.fullName, session.username, session.user].forEach((value) => registerTrackingUserPhoto(map, value, sessionPhoto));
        (Array.isArray(payload) ? payload : []).forEach((user) => {
            const photo = user.photoUrl || user.photo_url || '';
            [user.name, user.fullName, user.full_name, user.username, user.sapSalespersonName, user.sap_salesperson_name].forEach((value) => registerTrackingUserPhoto(map, value, photo));
        });
        trackingUserPhotos = map;
    } catch (_) {
        trackingUserPhotos = new Map();
    }
}

function trackingPhotoForName(name) {
    return trackingUserPhotos.get(trackingUserLookupKey(name)) || '';
}

function trackingAvatarMarkup(name) {
    const photo = trackingPhotoForName(name);
    const initials = initialsFromName(name);
    if (!photo) return escapeHtml(initials);
    return `<img class="tracking-avatar-image" src="${escapeHtml(photo)}" alt="${escapeHtml(name || 'Usuario')}" data-tracking-avatar-img><span class="tracking-avatar-fallback" hidden>${escapeHtml(initials)}</span>`;
}

function bindTrackingAvatarFallback(root = document) {
    root.querySelectorAll?.('[data-tracking-avatar-img]').forEach((image) => {
        image.addEventListener('error', () => {
            image.hidden = true;
            const fallback = image.nextElementSibling;
            if (fallback) fallback.hidden = false;
        }, { once: true });
    });
}

async function trackingMilestonesForRow(row = {}) {
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
    const quoteCode = row.quoteId || '';
    const lineCode = row.linea || '';
    if (!quoteCode || !lineCode) return defaults;
    let remote;
    try {
        remote = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/seguimiento`, { headers: sessionHeader() });
    } catch (error) {
        return defaults;
    }
    const remoteByKey = new Map((remote.milestones || []).map((item) => [item.key, item]));
    return defaults.map((item) => {
        const remoteItem = remoteByKey.get(item.key);
        if (!remoteItem) return item;
        const formattedDate = remoteItem.date ? formatDateTimeShort(remoteItem.date) : '';
        return { ...item, done: remoteItem.done, user: remoteItem.user || item.user, date: formattedDate || item.date };
    });
}

async function openLineTrackingModal(row) {
    const milestones = await trackingMilestonesForRow(row);
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
                const checkBadge = item.done ? '<span class="line-tracking-check" aria-hidden="true">✓</span>' : '';
                return `<article class="line-tracking-item${item.done ? ' is-done' : ''}">
                    <span class="line-tracking-avatar${trackingPhotoForName(name) ? ' has-photo' : ''}" style="background:${escapeHtml(trackingColorForName(name))};">${trackingAvatarMarkup(name)}${checkBadge}</span>
                    <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(name)}</span><em>${escapeHtml(item.date || 'Pendiente')}</em></div>
                </article>`;
            }).join('')}
        </div>
    `);
    bindTrackingAvatarFallback(lineActionModal || document);
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
        runQuoteActionWithFeedback(selectQuote, lineActionState.row, () => copyLineToDestinationQuote(selectQuote.dataset.selectDestinationQuote))
            .catch((error) => setStatus(error.message, 'error'));
        return;
    }
    const createQuoteButton = event.target.closest('[data-create-new-quote-from-line]');
    if (createQuoteButton) {
        event.preventDefault();
        runQuoteActionWithFeedback(createQuoteButton, lineActionState.row, () => createNewQuoteFromLine(lineActionState.row))
            .catch((error) => setStatus(error.message, 'error'));
        return;
    }
    if (event.target.closest('[data-pick-line-attachment]')) {
        event.preventDefault();
        document.getElementById('lineActionAttachmentFile')?.click();
        return;
    }
    const uploadButton = event.target.closest('[data-upload-line-attachment]');
    if (uploadButton) {
        event.preventDefault();
        runQuoteActionWithFeedback(uploadButton, lineActionState.row, uploadLineActionAttachments)
            .catch((error) => setStatus(error.message, 'error'));
    }
}

// Drag state for line reordering
let lineDragState = null;
let lineDragDropInitialized = false;

function quoteLineOrdenProductoMarkup(row) {
    const ordenCodigo = String(row?.ordenCodigo || '').trim();
    const productos = Array.isArray(row?.productoCodigos) ? row.productoCodigos.filter(Boolean) : [];
    const ordenHtml = ordenCodigo
        ? `<a class="quote-master-line-reflink" href="/orden-produccion/${encodeURIComponent(ordenCodigo)}" data-open-order="${escapeHtml(ordenCodigo)}" title="Abrir orden de producción">${escapeHtml(ordenCodigo)}</a>`
        : '';
    const productoHtml = productos.length
        ? productos.map((codigo) => `<a class="quote-master-line-reflink" href="/producto-documento?codigo=${encodeURIComponent(codigo)}" data-open-product="${escapeHtml(codigo)}" title="Abrir producto">${escapeHtml(codigo)}</a>`).join('')
        : '';
    return `
        <div class="quote-master-line-refs">
            <span class="quote-master-line-refcol" data-ref-kind="orden">${ordenHtml}</span>
            <span class="quote-master-line-refcol" data-ref-kind="producto">${productoHtml}</span>
        </div>
    `;
}

function renderQuoteLineCard(row, index, totalLines, treeOptions = {}) {
    quoteLineLookup.set(row.id, row);
    const reorderConf = getResolvedIcon(['lineReorder', 'tableMove'], 'lineReorder');
    const editConf = getResolvedIcon(['browserOpen', 'tableOpen'], 'tableOpen');
    const menuConf = getResolvedIcon(['lineMenu', 'tableActions'], 'lineMenu');
    const editColor = loadedConfig?.general?.iconColorBrowserOpen || loadedConfig?.general?.iconColorTableOpen || editConf.color || '#0b81b8';
    const editHover = loadedConfig?.general?.iconColorHoverBrowserOpen || loadedConfig?.general?.iconColorHoverTableOpen || editConf.hover || '#07638c';
    const editSize = Number(loadedConfig?.general?.iconSizeBrowserOpen || loadedConfig?.general?.iconSizeTableOpen) || editConf.size || 18;
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
    const treeIconKey = treeOptions.expanded ? 'quoteCollapse' : 'quoteExpand';
    const treeToggleConf = getResolvedIcon([treeIconKey], treeIconKey);
    const treeToggleLabel = treeOptions.expanded ? 'Contraer grupo frente/dorso' : 'Desplegar grupo frente/dorso';
    const groupToggle = isTreeGroup
        ? `<button type="button" class="quote-master-line-tree-toggle" data-front-back-toggle="${escapeHtml(treeOptions.groupKey || '')}" aria-expanded="${treeOptions.expanded ? 'true' : 'false'}" aria-label="${treeToggleLabel}" style="--icon-color:${escapeHtml(treeToggleConf.color)};--icon-hover-color:${escapeHtml(treeToggleConf.hover)};--config-icon-size:${escapeHtml(String(treeToggleConf.size || 18))}px;">${iconMarkup(treeToggleConf.value, treeToggleLabel, 'table-icon-media')}</button>`
        : '<span class="quote-master-line-tree-spacer" aria-hidden="true"></span>';
    return `
        <article class="quote-master-line${treeClass}" data-line-id="${row.id}" data-line-index="${displayIndex}" data-quote-id="${escapeHtml(row.quoteId)}"${treeAttrs} draggable="false">
            <div class="quote-master-line-order" title="Arrastrar para reordenar">
                ${groupToggle}
                <span class="quote-master-line-num">${displayIndex + 1}</span>
                <span class="quote-master-drag-handle" aria-hidden="true" style="--icon-color:${escapeHtml(reorderConf.color)};--icon-hover-color:${escapeHtml(reorderConf.hover)};--config-icon-size:${escapeHtml(String(reorderConf.size || 18))}px;">${iconMarkup(reorderConf.value, 'Ordenar línea', 'table-icon-media')}</span>
            </div>
            <div class="quote-master-line-body">
                ${renderQuoteLineDetail(row, index)}
            </div>
            ${quoteLineOrdenProductoMarkup(row)}
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
                                ${canCreateProduct ? `<button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-product" data-line-id="${row.id}">${lineMenuIconMarkup('product', 'Convertir en Producto', '▣')}<span>Convertir en Producto</span></button>` : ''}
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-quote" data-line-id="${row.id}">${lineMenuIconMarkup('createQuote', 'Crear en Nuevo Cálculo', '▣')}<span>Crear en Nuevo Cálculo</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="front-back" data-line-id="${row.id}">${lineMenuIconMarkup('frontBack', 'Frente/Dorso', 'FD')}<span>${frontBackGroup ? 'Editar Frente/Dorso' : 'Crear Frente/Dorso'}</span></button>
                                ${row.finalizadaOrden && !isFrontBackElement && !row.ordenCodigo ? `<button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-production-order" data-line-id="${row.id}">${lineMenuIconMarkup('createOrder', 'Crear Orden de Producción', '⚒')}<span>Crear Orden de Producción</span></button>` : ''}
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="export" data-line-id="${row.id}">${lineMenuIconMarkup('export', 'Exportar Línea a Excel', '⭳')}<span>Exportar Línea a Excel</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="attachments" data-line-id="${row.id}">${lineMenuIconMarkup('attachments', 'Ver Adjuntos', '📎')}<span>Ver Adjuntos</span></button>
                                <div class="row-action-menu-section-divider" aria-hidden="true"></div>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="tracking" data-line-id="${row.id}">${lineMenuIconMarkup('tracking', 'Seguimiento', '◎')}<span>Seguimiento</span></button>
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
            <button type="button" class="quote-browser-action-btn quote-line-proforma-btn" data-print-proforma="${escapedCode}" title="Ver Proforma" style="--icon-color:${escapeHtml(proformaConf.color)};--icon-hover-color:${escapeHtml(proformaConf.hover)};--config-icon-size:${escapeHtml(String(proformaConf.size || 16))}px;">
                <span class="quote-line-action-icon" aria-hidden="true">${iconMarkup(proformaConf.value, 'Ver Proforma', 'table-icon-media')}</span> Ver Proforma
            </button>
            ${canCreateQuoteLines ? `<button type="button" class="quote-browser-action-btn quote-line-add-btn" data-add-line="${escapedCode}" title="Agregar línea de cálculo" style="--icon-color:${escapeHtml(addConf.color)};--icon-hover-color:${escapeHtml(addConf.hover)};--config-icon-size:${escapeHtml(String(addConf.size || 18))}px;">
                <span class="quote-line-action-icon" aria-hidden="true">${iconMarkup(addConf.value, 'Agregar línea', 'table-icon-media')}</span> Agregar línea
            </button>` : ''}
        </div>
    `;
    if (quoteLineLoading.has(quoteCode)) {
        return `<div class="quote-master-lines-bg"><div class="quote-master-line-message">Cargando líneas de cálculo...</div></div>${footer}`;
    }
    const lines = quoteLineCache.get(quoteCode);
    if (!lines) {
        return `<div class="quote-master-lines-bg"><div class="quote-master-line-message">Abre esta cotización para cargar sus líneas.</div></div>${footer}`;
    }
    if (!lines.length) {
        return `<div class="quote-master-lines-bg"><div class="quote-master-line-message">Esta cotización todavía no tiene líneas de cálculo.</div></div>${footer}`;
    }
    const treeNodes = buildFrontBackLineTree(lines, quoteCode);
    return `<div class="quote-master-lines-bg"><div class="quote-master-lines">${treeNodes.map((node, index) => renderQuoteLineCard(node.line, index, lines.length, {
        kind: node.kind,
        sourceIndex: node.sourceIndex,
        groupKey: node.key,
        childCount: node.childCount,
        expanded: node.expanded
    })).join('')}</div></div>${footer}`;
}

function quoteStatusInfo(item = {}) {
    const totalLineas = Math.max(0, Number(item.line_count || 0));
    const faltantes = Array.isArray(item.lineas_sin_cotizar) ? item.lineas_sin_cotizar.filter(Boolean) : [];
    if (totalLineas === 0) {
        return { label: 'Sin l\u00edneas de c\u00e1lculo', state: 'warn' };
    }
    if (!faltantes.length) {
        return { label: 'Cotizada', state: 'quoted' };
    }
    if (faltantes.length === 1) {
        return { label: 'Falta cotizar', state: 'warn', lineCode: String(faltantes[0]) };
    }
    return { label: `Faltan ${faltantes.length} l\u00edneas por cotizar`, state: 'warn' };
}

function renderQuoteParentRow(item) {
    const quoteCode = item.quote_code || '';
    const isExpanded = expandedQuoteCodes.has(quoteCode);
    const cachedLines = quoteLineCache.get(quoteCode) || [];
    const lineCount = Math.max(0, Number(item.line_count || cachedLines.length || 0));
    const total = cachedLines.length
        ? formatMoney(quoteTotalFromLines(cachedLines))
        : (lineCount > 0 ? formatMoney(item.quote_total) : '');
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
    const salespersonName = item.salesperson_name || '';
    const showVendorLine = canSeeCotizadorSeguimiento() && salespersonName;
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
                    <span class="quote-status-chip" data-state="${escapeHtml(statusInfo.state)}">${escapeHtml(statusInfo.label)}${statusInfo.lineCode ? ` <a class="quote-status-chip-link" href="#" data-jump-line-code="${escapeHtml(statusInfo.lineCode)}" data-jump-quote="${escapeHtml(quoteCode)}">${escapeHtml(statusInfo.lineCode)}</a>` : ''}</span>
                </div>
                ${showVendorLine ? `<span class="quote-master-info-vendor">Vendedor: ${escapeHtml(salespersonName)}</span>` : ''}
            </td>
            <td class="quote-master-td-ref" aria-hidden="true"></td>
            <td class="quote-master-td-ref" aria-hidden="true"></td>
            <td class="quote-master-td-date" title="${escapeHtml(item.created_at_tz || item.created_on || '')}">${escapeHtml(createdOn)}</td>
            <td class="quote-master-td-date" title="${escapeHtml(item.due_on || '')}">${escapeHtml(dueOn)}</td>
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
        ${isExpanded ? `<tr class="quote-master-lines-row"><td colspan="9">${renderQuoteLinesPanel(quoteCode)}</td></tr>` : ''}
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

function setQuoteLineActionFeedback(button, row, busy) {
    if (button) {
        if (busy) {
            button.dataset.wasDisabled = button.disabled ? 'true' : 'false';
            button.disabled = true;
            button.classList.add('is-action-busy');
            button.setAttribute('aria-busy', 'true');
        } else {
            button.disabled = button.dataset.wasDisabled === 'true';
            delete button.dataset.wasDisabled;
            button.classList.remove('is-action-busy');
            button.removeAttribute('aria-busy');
        }
    }
    const lineId = row?.id || Number(button?.dataset?.lineId || 0);
    if (!lineId || !rowsBody) return;
    rowsBody.querySelector(`.quote-master-line[data-line-id="${lineId}"]`)?.classList.toggle('is-line-action-busy', busy);
}

async function runQuoteActionWithFeedback(button, row, task) {
    const started = Date.now();
    setQuoteLineActionFeedback(button, row, true);
    try {
        return await task();
    } finally {
        const remaining = 180 - (Date.now() - started);
        if (remaining > 0) await sleep(remaining);
        setQuoteLineActionFeedback(button, row, false);
    }
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
    return runQuoteLineActionLocked('create-quote', row, () => createNewQuoteFromLine(row));
}

async function createProductFromLine(row) {
    if (!row?.quoteId || !row?.linea) {
        throw new Error('Se requiere una cotización y línea válidas para registrar el producto.');
    }
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeader() },
        body: JSON.stringify({})
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo crear el producto.');
    const productCode = payload?.producto?.product_code || '';
    if (productCode && row.raw_data) {
        row.raw_data['CODIGO PRODUCTO'] = productCode;
        if (row.raw_data.line_summary) row.raw_data.line_summary.product_code = productCode;
    }
    if (productCode) row.productId = productCode;
    await refreshQuoteLines(row.quoteId);
    setStatus(productCode ? `Producto ${productCode} creado.` : 'Producto registrado.', 'saved');
    return payload;
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

function confirmarFabricacionTroquelDialog(mensaje) {
    return new Promise((resolve) => {
        document.querySelector('.ct-fabricacion-confirm-dialog')?.remove();
        document.body.classList.add('popover-open');
        const overlay = document.createElement('div');
        overlay.className = 'quote-order-quantity-dialog ct-fabricacion-confirm-dialog';
        overlay.innerHTML = `<div class="quote-order-quantity-panel" role="dialog" aria-modal="true" aria-label="Solicitud de Fabricación de Troquel">
      <div class="quote-order-quantity-title">Troquel Nuevo Requerido</div>
      <p style="font-size:13px;color:var(--app-text-muted,#94a3b8);line-height:1.5;">${escapeHtml(mensaje)}</p>
      <div class="quote-order-quantity-actions">
        <button type="button" class="action-btn" data-action="no-continuar">No Continuar por Ahora</button>
        <button type="button" class="action-btn action-btn-primary" data-action="continuar">Continuar con la Fabricación</button>
      </div>
    </div>`;
        document.body.appendChild(overlay);
        const cerrar = (resultado) => {
            overlay.remove();
            document.body.classList.remove('popover-open');
            resolve(resultado);
        };
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target.closest("[data-action='no-continuar']")) {
                cerrar(false);
                return;
            }
            if (event.target.closest("[data-action='continuar']")) {
                cerrar(true);
            }
        });
    });
}

function preguntarDestinoContactoDialog() {
    return new Promise((resolve) => {
        document.querySelector('.contact-destino-dialog')?.remove();
        document.body.classList.add('popover-open');
        const overlay = document.createElement('div');
        overlay.className = 'quote-order-quantity-dialog contact-destino-dialog';
        overlay.innerHTML = `<div class="quote-order-quantity-panel" role="dialog" aria-modal="true" aria-label="Guardar Contacto en el Socio">
      <div class="quote-order-quantity-title">Guardar Contacto en el Socio</div>
      <p style="font-size:13px;color:var(--app-text-muted,#94a3b8);line-height:1.5;">¿Dónde quieres guardar este contacto?</p>
      <div class="quote-order-quantity-actions">
        <button type="button" class="action-btn" data-action="contactos">Solo en Contactos</button>
        <button type="button" class="action-btn action-btn-primary" data-action="principal">También en Contacto Principal</button>
        <button type="button" class="action-btn" data-action="cancelar">Cancelar</button>
      </div>
    </div>`;
        document.body.appendChild(overlay);
        const cerrar = (resultado) => {
            overlay.remove();
            document.body.classList.remove('popover-open');
            resolve(resultado);
        };
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                cerrar(null);
                return;
            }
            const accion = event.target.closest('[data-action]')?.dataset?.action;
            if (accion === 'contactos') cerrar('contactos');
            if (accion === 'principal') cerrar('principal');
            if (accion === 'cancelar') cerrar(null);
        });
    });
}

async function verificarLicenciaCrearOrden() {
    try {
        const r = await fetch('/api/licenciamiento/estado', { headers: { 'Accept': 'application/json' } });
        if (!r.ok) return;
        const d = await r.json();
        if (d && d.permiteCrearOrden === false) {
            throw new Error('La creación de órdenes está deshabilitada porque la licencia venció. Contacta a tu proveedor para renovarla.');
        }
    } catch (e) {
        if (e instanceof Error && /licencia venci/i.test(e.message)) throw e;
        // cualquier otro error de red: fail-open, el servidor valida de todos modos
    }
}

async function postOrdenProduccionConTroquel(quoteId, linea, body) {
    await verificarLicenciaCrearOrden();
    const url = QUOTES_ENDPOINT + '/' + encodeURIComponent(quoteId) + '/lineas/' + encodeURIComponent(linea) + '/orden-produccion';
    const doPost = (payloadBody) => fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody)
    });
    let payload = await doPost(body);
    if (payload.requiere_confirmacion_troquel) {
        const continuar = await confirmarFabricacionTroquelDialog(payload.mensaje || 'Esta cotización requiere un nuevo troquel. ¿Desea continuar con la solicitud de fabricación del troquel?');
        payload = await doPost({ ...body, confirmar_fabricacion_troquel: continuar });
    }
    return payload;
}

function separarMensajesBloqueo(texto) {
    return String(texto || '')
        .split(/\r?\n|(?<=[.!?])\s+|\s*[·•]\s*/)
        .map((parte) => parte.trim())
        .filter(Boolean);
}

function mostrarErroresCrearOrden(row, mensajes) {
    const existente = document.querySelector('.quote-order-quantity-dialog');
    if (existente) existente.remove();
    document.body.classList.add('popover-open');
    const lista = (Array.isArray(mensajes) ? mensajes : separarMensajesBloqueo(mensajes)).filter(Boolean);
    const itemsHtml = lista.length
        ? '<ul class="quote-order-error-list">' + lista.map((m) => `<li>${escapeHtml(m)}</li>`).join('') + '</ul>'
        : '<p class="quote-order-error-empty">La línea tiene datos pendientes en el cálculo.</p>';
    const overlay = document.createElement('div');
    overlay.className = 'quote-order-quantity-dialog';
    overlay.innerHTML = '<div class="quote-order-quantity-panel" role="dialog" aria-modal="true" aria-label="No se puede crear la orden todavía">' +
        '<div class="quote-order-quantity-title">No se puede crear la orden todavía</div>' +
        '<div class="quote-order-quantity-note">Completá lo siguiente en el cálculo de la línea antes de crear la orden de producción:</div>' +
        itemsHtml +
        '<div class="quote-order-quantity-actions">' +
            '<button type="button" class="action-btn" data-error-action="close">Cerrar</button>' +
            '<button type="button" class="action-btn action-btn-primary" data-error-action="open-calc">Ir al Cálculo</button>' +
        '</div>' +
    '</div>';
    const cerrar = () => {
        overlay.remove();
        document.body.classList.remove('popover-open');
    };
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) { cerrar(); return; }
        const accion = event.target.closest('[data-error-action]')?.dataset.errorAction;
        if (accion === 'close') cerrar();
        if (accion === 'open-calc') { cerrar(); openLineCalculation(row); }
    });
    document.body.appendChild(overlay);
    overlay.querySelector('[data-error-action="open-calc"]')?.focus();
}

async function createProductionOrder(row) {
    const bloqueo = stripNonBlockingSapAccountingWarnings(row?.calculationBlockMessage || '');
    if (bloqueo) {
        mostrarErroresCrearOrden(row, separarMensajesBloqueo(bloqueo));
        return;
    }
    if (!row?.finalizadaOrden) {
        mostrarErroresCrearOrden(row, ['Debes marcar la línea como finalizada antes de crear la orden de producción.']);
        return;
    }
    var quantities = [];
    try {
        var uiState = row.raw_data && (row.raw_data['Estado_UI'] || row.raw_data.CODEX_UI_STATE || {});
        var header = uiState.header || {};
        var rawQty = Array.isArray(header.quantities) ? header.quantities : [];
        if (rawQty.length > 1) {
            quantities = rawQty
                .map(function (q) {
                    var quantity = Number(q?.quantity ?? q?.value ?? q?.qty ?? 0);
                    return { ...q, quantity: quantity };
                })
                .filter(function (q) { return q && Number(q.quantity) > 0; });
        }
    } catch (e) {}
    var selectedQuantity = null;
    if (quantities.length > 1) {
        selectedQuantity = await askProductionOrderQuantity(row, quantities);
        if (!selectedQuantity) return;
    }
    var body = {};
    if (selectedQuantity && selectedQuantity > 0) body.quantity = selectedQuantity;
    var payload;
    try {
        payload = await postOrdenProduccionConTroquel(row.quoteId, row.linea, body);
    } catch (error) {
        const detalle = stripNonBlockingSapAccountingWarnings(error?.message || '') || (error?.message || '');
        mostrarErroresCrearOrden(row, separarMensajesBloqueo(detalle));
        return;
    }
    if (payload.orden?.order_code) {
        setStatus('Orden ' + payload.orden.order_code + ' creada.', 'saved');
        var route = '/orden-produccion/' + encodeURIComponent(payload.orden.order_code);
        if (!openRouteInShell(route, 'Orden ' + payload.orden.order_code)) {
            window.location.href = route;
        }
    }
}

function askProductionOrderQuantity(row, quantities) {
    return new Promise((resolve) => {
        const existing = document.querySelector('.quote-order-quantity-dialog');
        if (existing) existing.remove();
        document.body.classList.add('popover-open');
        var raw = row.raw_data || {};
        var processResult = raw.processResult || raw.process_result || {};
        var totalsData = processResult.totals || {};
        var material = raw['GENERAL | MATERIAL'] || raw.material_name || '';
        var wastePct = totalsData.wastePct != null ? totalsData.wastePct : (totalsData.wastePercent != null ? totalsData.wastePercent : 0);
        var machineHours = totalsData.machineHours != null ? totalsData.machineHours : (totalsData.printHours != null ? totalsData.printHours : 0);
        var defaultUnit = totalsData.unit || totalsData.unitPrice || 0;
        var firstQty = quantities[0] || {};
        var summaryData = {
            unitPrice: firstQty.unitPrice || defaultUnit,
            totalCost: (firstQty.unitPrice || defaultUnit) * (firstQty.quantity || 0),
            machineHours: firstQty.machineHours || machineHours,
            material: firstQty.material || material,
            wastePct: firstQty.wastePct || wastePct
        };
        function formatMoney(val) { return '\u20A1' + Number(val || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        function formatNumber(val, dec) { return Number(val || 0).toLocaleString('es-CR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
        var optionsHtml = quantities.map(function (q, i) {
            return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + escapeHtml(parseNumber(q.quantity)) + ' unidades</option>';
        }).join('');
        var overlay = document.createElement('div');
        overlay.className = 'quote-order-quantity-dialog';
        overlay.innerHTML = '<div class="quote-order-quantity-panel" role="dialog" aria-modal="true" aria-label="Crear Orden de Producción">' +
            '<div class="quote-order-quantity-title">Crear Orden de Producción</div>' +
            '<div class="quote-order-quantity-body">' +
                '<div class="quote-order-quantity-left">' +
                    '<label class="quote-order-quantity-field"><span>Cantidad a producir</span>' +
                        '<select class="quote-order-qty-select" data-qty-select>' + optionsHtml + '</select>' +
                    '</label>' +
                '</div>' +
                '<div class="quote-order-quantity-right">' +
                    '<div class="quote-order-quantity-summary-title">Resumen de la cantidad seleccionada</div>' +
                    '<div class="quote-order-quantity-summary">' +
                        '<div class="quote-order-qty-row"><span>Precio unitario</span><span data-summary-unit>' + formatMoney(summaryData.unitPrice) + '</span></div>' +
                        '<div class="quote-order-qty-row"><span>Costo total</span><span data-summary-total>' + formatMoney(summaryData.totalCost) + '</span></div>' +
                        '<div class="quote-order-qty-row"><span>Tiempo máquina</span><span data-summary-hours>' + formatNumber(summaryData.machineHours, 2) + ' horas</span></div>' +
                        '<div class="quote-order-qty-row"><span>Material</span><span data-summary-material>' + escapeHtml(summaryData.material || '-') + '</span></div>' +
                        '<div class="quote-order-qty-row"><span>Desperdicio</span><span data-summary-waste>' + formatNumber(summaryData.wastePct, 1) + ' %</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="quote-order-quantity-note">La orden se generará utilizando exactamente los parámetros calculados para la cantidad seleccionada.</div>' +
            '<div class="quote-order-quantity-actions">' +
                '<button type="button" class="action-btn" data-quantity-action="cancel">Cancelar</button>' +
                '<button type="button" class="action-btn action-btn-primary" data-quantity-action="confirm">Crear Orden</button>' +
            '</div>' +
        '</div>';
        function updateSummary(idx) {
            var q = quantities[idx] || {};
            var unit = q.unitPrice || defaultUnit;
            var qty = q.quantity || 0;
            var hours = q.machineHours || machineHours;
            var mat = q.material || material;
            var waste = q.wastePct || wastePct;
            overlay.querySelector('[data-summary-unit]').textContent = formatMoney(unit);
            overlay.querySelector('[data-summary-total]').textContent = formatMoney(unit * qty);
            overlay.querySelector('[data-summary-hours]').textContent = formatNumber(hours, 2) + ' horas';
            overlay.querySelector('[data-summary-material]').textContent = mat || '-';
            overlay.querySelector('[data-summary-waste]').textContent = formatNumber(waste, 1) + ' %';
        }
        var close = function (value) {
            overlay.remove();
            document.body.classList.remove('popover-open');
            resolve(value);
        };
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) close(null);
            var action = event.target.closest('[data-quantity-action]')?.dataset.quantityAction;
            if (action === 'cancel') close(null);
            if (action === 'confirm') {
                var select = overlay.querySelector('[data-qty-select]');
                var idx = Number(select?.value || 0);
                var qty = quantities[idx];
                close(qty && qty.quantity > 0 ? qty.quantity : null);
            }
        });
        overlay.addEventListener('change', function (event) {
            if (event.target.matches('[data-qty-select]')) {
                updateSummary(Number(event.target.value || 0));
            }
        });
        document.body.appendChild(overlay);
        overlay.querySelector('[data-quantity-action="confirm"]')?.focus();
    });
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
    const sorted = sortQuotesList(items);
    updateQuoteSortIndicators();
    visibleQuotesCount = Array.isArray(items) ? items.length : 0;
    quoteLineLookup.clear();
    if (!sorted.length) {
        rowsBody.innerHTML = cotizacionesCargadas
            ? '<tr><td colspan="9">No hay cotizaciones.</td></tr>'
            : '<tr><td colspan="9">Cargando las cotizaciones desde el servidor, un momento por favor…</td></tr>';
        requestAnimationFrame(updateQuotesScrollBottomIndicator);
        publishBdfgContext();
        return;
    }
    rowsBody.innerHTML = sorted.map(renderQuoteParentRow).join('');
    requestAnimationFrame(updateQuotesScrollBottomIndicator);
    publishBdfgContext();
}

function quoteNotSentToCotizar(item = {}) {
    return String(item.status || '').trim().toLowerCase() === 'borrador';
}

function getFilteredQuotes() {
    let items = quoteCatalog;
    if (canUseQuoteQuickFilters() && quotesQuickFilter !== 'todas') {
        if (quotesQuickFilter === 'crear-orden') {
            items = items.filter((item) => item.has_pending_order_line === true);
        } else if (quotesQuickFilter === 'sin-enviar') {
            items = items.filter((item) => quoteNotSentToCotizar(item));
        } else {
            items = items.filter((item) => quoteStatusInfo(item).state === 'warn');
        }
    }
    return items;
}

async function loadQuotes() {
    const params = new URLSearchParams({ limit: '200' });
    const search = normalizeText(quotesSearchInput?.value);
    if (search) params.set('q', search);
    let payload;
    try {
        payload = await fetchJson(`${QUOTES_ENDPOINT}?${params.toString()}`, { headers: sessionHeader() });
    } catch (error) {
        const mensajeSinRespuesta = 'No pudimos traer las cotizaciones en este momento. Revisa la conexión e intenta de nuevo.';
        if (!cotizacionesCargadas && rowsBody) {
            rowsBody.innerHTML = `<tr><td colspan="9">${mensajeSinRespuesta}</td></tr>`;
        }
        throw new Error(error?.name === 'TypeError' ? mensajeSinRespuesta : (error?.message || mensajeSinRespuesta));
    }
    cotizacionesCargadas = true;
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
    applicationItems = resolveConfiguredApplicationOptions();
    surfaceTypeItems = resolveConfiguredSurfaceOptions();
    applyConfiguredIcons();
    renderRequestQuantityRepeater();
    syncFixedSizeTrigger();
    renderRequestProductTypeOptions();
    loadRequestProductTypesCatalogo();
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

function showMaterialSuggestions(term = normalizeText(materialInput?.value).toLowerCase()) {
    const items = materialItems
        .filter((item) => !term || `${item.name || ''} ${item.code || ''}`.toLowerCase().includes(term))
        .slice(0, 12);
    renderInlineSuggestionList(materialSuggestions, items, 'No hay sustratos disponibles en inventario.');
    positionMaterialSuggestionsPanel();
}

function renderTextOptionSuggestions(panel, input, items, emptyMessage, term = normalizeText(input?.value).toLowerCase()) {
    if (!panel || !input) return;
    const source = (items || []).map((item) => normalizeText(item)).filter(Boolean);
    const filtered = source
        .filter((item) => !term || item.toLowerCase().includes(term))
        .slice(0, 12);
    if (term && !filtered.length) {
        panel.hidden = true;
        return;
    }
    renderInlineSuggestionList(panel, filtered.map((item) => ({ name: item, code: '' })), emptyMessage);
    positionSurfaceSuggestionsPanel(panel, input);
}

function showSurfaceSuggestions(term) {
    renderTextOptionSuggestions(surfaceSuggestions, surfaceInput, applicationItems, 'No hay aplicaciones disponibles.', term);
}

function showSurfaceTypeSuggestions(term) {
    renderTextOptionSuggestions(surfaceTypeSuggestions, surfaceTypeInput, surfaceTypeItems, 'No hay tipos de superficie disponibles.', term);
}

function hideInlinePanels() {
    if (materialSuggestions) materialSuggestions.hidden = true;
    if (surfaceSuggestions) surfaceSuggestions.hidden = true;
    if (surfaceTypeSuggestions) surfaceTypeSuggestions.hidden = true;
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
    const query = new URLSearchParams({ limit: 'all' });
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
    const query = new URLSearchParams({ limit: 'all' });
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
    const manual = MANUAL_CONTACT_REFS[select.id];
    if (manual?.block) {
        manual.block.hidden = true;
        if (manual.name) manual.name.value = '';
        if (manual.email) manual.email.value = '';
        if (manual.phone) manual.phone.value = '';
        if (manual.save) manual.save.checked = false;
    }
}

function showManualContactPanel(select, hint) {
    const manual = MANUAL_CONTACT_REFS[select?.id];
    if (!manual?.block) return;
    if (hint) {
        const hintNode = manual.block.querySelector('.quote-request-manual-contact-hint');
        if (hintNode) hintNode.textContent = hint;
    }
    manual.block.hidden = false;
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
        showManualContactPanel(select, 'Este cliente no tiene contactos registrados. Ingresa los datos para continuar.');
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
    try {
        const payload = await fetchJson(`${PARTNERS_ENDPOINT}/${encodeURIComponent(partnerCode)}/contactos`, { signal: requestContactAbort.signal });
        renderContactOptions(customerContactSelect, Array.isArray(payload.contactos) ? payload.contactos : []);
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        showManualContactPanel(customerContactSelect, 'No fue posible cargar los contactos del socio. Ingresa los datos para continuar.');
        throw error;
    }
}

async function loadNewCalcContacts(partnerCode) {
    resetContactSelect(newCalcContactSelect, partnerCode ? 'Cargando contactos...' : 'Selecciona un cliente');
    if (!partnerCode) return;
    newCalcContactAbort?.abort();
    newCalcContactAbort = new AbortController();
    try {
        const payload = await fetchJson(`${PARTNERS_ENDPOINT}/${encodeURIComponent(partnerCode)}/contactos`, { signal: newCalcContactAbort.signal });
        renderContactOptions(newCalcContactSelect, Array.isArray(payload.contactos) ? payload.contactos : []);
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        showManualContactPanel(newCalcContactSelect, 'No fue posible cargar los contactos del socio. Ingresa los datos para continuar.');
        throw error;
    }
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
    if (normalizeText(select?.value)) {
        return {
            contact_name: normalizeText(select?.value),
            email: normalizeText(option?.dataset?.email),
            phone: normalizeText(option?.dataset?.phone)
        };
    }
    const manual = MANUAL_CONTACT_REFS[select?.id];
    return {
        contact_name: normalizeText(manual?.name?.value),
        email: normalizeText(manual?.email?.value),
        phone: normalizeText(manual?.phone?.value)
    };
}

async function saveManualContactToPartner(select) {
    const manual = MANUAL_CONTACT_REFS[select?.id];
    if (!manual?.block || manual.block.hidden || !manual.save?.checked) return;
    const name = normalizeText(manual.name?.value);
    const codeInput = select.id === customerContactSelect?.id ? customerCodeInput : newCalcCustomerCodeInput;
    const code = normalizeText(codeInput?.value);
    if (!name || !code) return;
    const destino = await preguntarDestinoContactoDialog();
    if (!destino) return;
    try {
        await fetchJson(`${PARTNERS_ENDPOINT}/${encodeURIComponent(code)}/contactos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({
                contactName: name,
                email: normalizeText(manual.email?.value),
                phone: normalizeText(manual.phone?.value),
                guardarComoPrincipal: destino === 'principal'
            })
        });
        if (select.id === customerContactSelect?.id) {
            loadRequestContacts(code).catch(() => {});
        } else {
            loadNewCalcContacts(code).catch(() => {});
        }
    } catch (error) {
        console.error('No fue posible guardar el contacto en el socio.', error);
    }
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
    if (requestDirectColors.length > 0) return true;
    if (normalizeText(requestReferenciaInput?.value)) return true;
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
    syncTroquelTriggerDisplay();
    customerCodeInput.value = '';
    resetContactSelect(customerContactSelect, 'Selecciona un cliente');
    if (materialInput) materialInput.dataset.materialCode = '';
    if (customWidthInput) customWidthInput.value = '';
    if (customHeightInput) customHeightInput.value = '';
    syncCustomSizeUnitMasks();
    pendingAttachments.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    });
    pendingAttachments = [];
    renderAttachments();
    hideInlinePanels();
    setStatus('');
    syncToggleChipState();
    requestDirectColors = [];
    renderDirectColorList();
    hideDirectColorMenu();
    if (requestUseCmykInput) requestUseCmykInput.checked = true;
    if (requestNoPrintInput) requestNoPrintInput.checked = false;
    syncInkGroupState();
    syncOutputTypePreview();
    if (requestReferenciaInput) requestReferenciaInput.value = '';
    if (requestReferenciaComentario) requestReferenciaComentario.value = '';
    syncReferenciaChangesVisibility();
    closeRequestReferenciaModal();
    closeRequestArteModal();
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
        requestId: createQuoteRequestId(),
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

let cotizacionesTroquelesCatalog = null;
let cotizacionesBarnizOptions = null;
let cotizacionesEstampadoOptions = null;
let cotizacionesLaminadoOptions = null;

async function loadTroquelesCatalog() {
    if (cotizacionesTroquelesCatalog) return cotizacionesTroquelesCatalog;
    try {
        const data = await fetchJson('/api/catalogs');
        cotizacionesTroquelesCatalog = Array.isArray(data?.troqueles) ? data.troqueles : [];
    } catch (error) {
        cotizacionesTroquelesCatalog = [];
    }
    return cotizacionesTroquelesCatalog;
}

async function loadVarnishMaterialOptions() {
    if (!requestVarnishMaterialSelect) return;
    if (!cotizacionesBarnizOptions) {
        try {
            const data = await fetchJson('/api/costos-config');
            cotizacionesBarnizOptions = Array.isArray(data?.acabados?.barniz) ? data.acabados.barniz : [];
        } catch (error) {
            cotizacionesBarnizOptions = [];
        }
    }
    const current = requestVarnishMaterialSelect.value;
    requestVarnishMaterialSelect.innerHTML = ['<option value="">Sin Barniz</option>']
        .concat(cotizacionesBarnizOptions.filter((item) => item?.nombre).map((item) => `<option value="${escapeHtml(item.nombre)}">${escapeHtml(item.nombre)}</option>`))
        .join('');
    if (current && cotizacionesBarnizOptions.some((item) => item.nombre === current)) requestVarnishMaterialSelect.value = current;
}

async function loadStampingOptions() {
    if (!requestStampingMaterialSelect) return;
    if (!cotizacionesEstampadoOptions) {
        try {
            const data = await fetchJson('/api/costos-config');
            cotizacionesEstampadoOptions = Array.isArray(data?.acabados?.estampado) ? data.acabados.estampado : [];
        } catch (error) {
            cotizacionesEstampadoOptions = [];
        }
    }
    const current = requestStampingMaterialSelect.value;
    requestStampingMaterialSelect.innerHTML = ['<option value="">Ninguno</option>']
        .concat(cotizacionesEstampadoOptions.filter((item) => item?.tipoFoil).map((item) => `<option value="${escapeHtml(item.tipoFoil)}">${escapeHtml(item.tipoFoil)}</option>`))
        .join('');
    if (current && cotizacionesEstampadoOptions.some((item) => item.tipoFoil === current)) requestStampingMaterialSelect.value = current;
}

async function loadLaminadoOptions() {
    if (!requestLaminadoMaterialSelect) return;
    if (!cotizacionesLaminadoOptions) {
        try {
            const data = await fetchJson('/api/costos-config');
            cotizacionesLaminadoOptions = Array.isArray(data?.acabados?.laminado) ? data.acabados.laminado : [];
        } catch (error) {
            cotizacionesLaminadoOptions = [];
        }
    }
    const current = requestLaminadoMaterialSelect.value;
    requestLaminadoMaterialSelect.innerHTML = ['<option value="">Sin Laminado</option>']
        .concat(cotizacionesLaminadoOptions.filter((item) => item?.nombre).map((item) => `<option value="${escapeHtml(item.nombre)}">${escapeHtml(item.nombre)}</option>`))
        .join('');
    if (current && cotizacionesLaminadoOptions.some((item) => item.nombre === current)) requestLaminadoMaterialSelect.value = current;
}

function findBarnizOptionByName(name) {
    const value = normalizeText(name);
    if (!value) return null;
    return (cotizacionesBarnizOptions || []).find((item) => item?.nombre === value) || null;
}

function findLaminadoOptionByName(name) {
    const value = normalizeText(name);
    if (!value) return null;
    return (cotizacionesLaminadoOptions || []).find((item) => item?.nombre === value) || null;
}

function findEstampadoOptionByName(name) {
    const value = normalizeText(name);
    if (!value) return null;
    return (cotizacionesEstampadoOptions || []).find((item) => item?.tipoFoil === value) || null;
}

function resolveTroquelImageUrl(die) {
    const source = String(die?.imageUrl || die?.image_url || '').trim();
    if (!source) return '';
    if (/^(data:image\/|https?:\/\/|blob:|\/)/i.test(source)) return source;
    return `/${source.replace(/^\.?\//, '')}`;
}

// ===========================================================================
// NUEVA SOLICITUD · Tintas: CMYK / Sin Impresión / Colores Directos
// ===========================================================================
let requestDirectColors = [];
let requestDirectColorSources = null;

function isValidHexColor(value) {
    return /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(value || '').trim());
}

function normalizeHexColor(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    return isValidHexColor(withHash) ? withHash : '';
}

function directColorSwatchStyle(hex) {
    const clean = normalizeHexColor(hex);
    if (clean) return `background:${clean}`;
    return 'background:repeating-linear-gradient(135deg,#e3ecf2 0 4px,#f4f8fb 4px 8px)';
}

async function loadDirectColorSources() {
    if (requestDirectColorSources) return requestDirectColorSources;
    const [bibliotecaRes, recetasRes] = await Promise.allSettled([
        fetchJson('/api/tintas/pantones/biblioteca'),
        fetchJson('/api/tintas/pantones/recetas?estado=VIGENTE')
    ]);
    const biblioteca = bibliotecaRes.status === 'fulfilled' && Array.isArray(bibliotecaRes.value) ? bibliotecaRes.value : [];
    const recetas = recetasRes.status === 'fulfilled' && Array.isArray(recetasRes.value) ? recetasRes.value : [];
    const merged = [];
    const seen = new Set();
    const push = (nombre, sub, hex, origen) => {
        const name = normalizeText(nombre);
        if (!name) return;
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({ nombre: name, sub: normalizeText(sub), hex: normalizeHexColor(hex), origen });
    };
    biblioteca.forEach((row) => push(row?.codigo_pantone || row?.nombre, row?.nombre, row?.color_hex, 'Pantone'));
    recetas.forEach((row) => push(row?.nombre || row?.codigo_interno, row?.codigo_pantone, row?.color_hex, 'Fórmula'));
    merged.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    requestDirectColorSources = merged;
    return merged;
}

function renderDirectColorList() {
    if (!requestDirectColorList) return;
    if (!requestDirectColors.length) {
        requestDirectColorList.innerHTML = '';
        return;
    }
    const deleteIcon = getResolvedIcon(['quantity.delete', 'quantityDelete', 'icons.quantity.delete'], 'quantity.delete');
    requestDirectColorList.innerHTML = requestDirectColors.map((color, index) => `
        <div class="quote-request-color-chip" data-direct-color-index="${index}">
            <span class="quote-request-color-swatch" style="${directColorSwatchStyle(color.hex)}"></span>
            <span class="quote-request-color-chip-name" title="${escapeHtml(color.nombre)}">${escapeHtml(color.nombre)}</span>
            ${color.origen ? `<span class="quote-request-color-chip-tag">${escapeHtml(color.origen)}</span>` : ''}
            <button type="button" class="quote-request-color-chip-remove" data-remove-direct-color="${index}" title="Quitar color" aria-label="Quitar ${escapeHtml(color.nombre)}" style="--icon-color:${escapeHtml(deleteIcon.color)};--icon-hover-color:${escapeHtml(deleteIcon.hover)};--config-icon-size:${escapeHtml(String(deleteIcon.size || 16))}px;">${iconMarkup(deleteIcon.value, 'Quitar color', 'table-icon-media')}</button>
        </div>
    `).join('');
}

function addDirectColor(nombre, hex = '', origen = 'Manual') {
    const name = normalizeText(nombre);
    if (!name) return;
    if (requestDirectColors.some((color) => color.nombre.toLowerCase() === name.toLowerCase())) {
        hideDirectColorMenu();
        if (requestDirectColorInput) requestDirectColorInput.value = '';
        return;
    }
    requestDirectColors.push({ nombre: name, hex: normalizeHexColor(hex), origen });
    renderDirectColorList();
    if (requestDirectColorInput) requestDirectColorInput.value = '';
    hideDirectColorMenu();
    updateQuickRequestWizard();
    requestDirectColorInput?.focus();
}

function removeDirectColor(index) {
    if (index < 0 || index >= requestDirectColors.length) return;
    requestDirectColors.splice(index, 1);
    renderDirectColorList();
    updateQuickRequestWizard();
}

function hideDirectColorMenu() {
    if (!requestDirectColorMenu) return;
    requestDirectColorMenu.hidden = true;
    requestDirectColorInput?.setAttribute('aria-expanded', 'false');
}

// El desplegable de Colores Directos se saca del flujo del modal (position:fixed +
// reparent a <body>) para que no lo recorte el scroll del contenedor, igual que los
// demás desplegables de esta ventana (Sustrato, Aplicación, etc.).
function positionDirectColorMenu() {
    if (!requestDirectColorMenu || !requestDirectColorInput || requestDirectColorMenu.hidden) return;
    if (requestDirectColorMenu.parentElement !== document.body) document.body.appendChild(requestDirectColorMenu);
    const rect = requestDirectColorInput.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - gap * 2);
    const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap);
    const top = rect.bottom + 4;
    const maxHeight = Math.max(160, Math.min(360, window.innerHeight - top - gap));
    requestDirectColorMenu.style.setProperty('--qr-color-menu-left', `${left}px`);
    requestDirectColorMenu.style.setProperty('--qr-color-menu-top', `${top}px`);
    requestDirectColorMenu.style.setProperty('--qr-color-menu-width', `${width}px`);
    requestDirectColorMenu.style.setProperty('--qr-color-menu-max-height', `${maxHeight}px`);
}

async function showDirectColorMenu(term = '') {
    if (!requestDirectColorMenu || !requestDirectColorInput) return;
    if (requestNoPrintInput?.checked) { hideDirectColorMenu(); return; }
    const sources = requestDirectColorSources || await loadDirectColorSources().catch(() => []);
    const query = normalizeText(term).toLowerCase();
    const chosen = new Set(requestDirectColors.map((color) => color.nombre.toLowerCase()));
    const matches = sources
        .filter((item) => !chosen.has(item.nombre.toLowerCase()))
        .filter((item) => !query || `${item.nombre} ${item.sub}`.toLowerCase().includes(query))
        .slice(0, 60);
    const exact = matches.some((item) => item.nombre.toLowerCase() === query);
    const rows = [];
    if (query && !exact) {
        rows.push(`<button type="button" class="quote-request-color-option is-create" data-direct-color-name="${escapeHtml(term.trim())}" data-direct-color-origin="Manual">
            <span class="quote-request-color-swatch" style="${directColorSwatchStyle('')}"></span>
            <span class="quote-request-color-option-name">Agregar &laquo;${escapeHtml(term.trim())}&raquo;</span>
        </button>`);
    }
    matches.forEach((item) => {
        rows.push(`<button type="button" class="quote-request-color-option" data-direct-color-name="${escapeHtml(item.nombre)}" data-direct-color-hex="${escapeHtml(item.hex)}" data-direct-color-origin="${escapeHtml(item.origen)}">
            <span class="quote-request-color-swatch" style="${directColorSwatchStyle(item.hex)}"></span>
            <span class="quote-request-color-option-name">${escapeHtml(item.nombre)}${item.sub ? ` <span class="quote-request-color-option-tag">${escapeHtml(item.sub)}</span>` : ''}</span>
            <span class="quote-request-color-option-tag">${escapeHtml(item.origen)}</span>
        </button>`);
    });
    if (!rows.length) {
        rows.push(`<div class="quote-request-color-empty">${sources.length ? 'Sin coincidencias. Escribe para agregar un color libre.' : 'No hay Pantones ni fórmulas en el catálogo.'}</div>`);
    }
    requestDirectColorMenu.innerHTML = rows.join('');
    requestDirectColorMenu.hidden = false;
    requestDirectColorInput.setAttribute('aria-expanded', 'true');
    positionDirectColorMenu();
}

function moveDirectColorActive(direction) {
    if (!requestDirectColorMenu || requestDirectColorMenu.hidden) return;
    const options = Array.from(requestDirectColorMenu.querySelectorAll('.quote-request-color-option'));
    if (!options.length) return;
    const currentIndex = options.findIndex((option) => option.classList.contains('is-active'));
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = options.length - 1;
    if (nextIndex >= options.length) nextIndex = 0;
    options.forEach((option) => option.classList.remove('is-active'));
    options[nextIndex].classList.add('is-active');
    options[nextIndex].scrollIntoView({ block: 'nearest' });
}

function commitDirectColorFromInput() {
    const active = requestDirectColorMenu && !requestDirectColorMenu.hidden
        ? requestDirectColorMenu.querySelector('.quote-request-color-option.is-active')
        : null;
    if (active) {
        addDirectColor(active.dataset.directColorName, active.dataset.directColorHex || '', active.dataset.directColorOrigin || 'Manual');
        return;
    }
    addDirectColor(requestDirectColorInput?.value || '', '', 'Manual');
}

function syncCmykToggleVisual() {
    requestUseCmykInput?.closest('.quote-request-ink-toggle')?.classList.toggle('is-on', !!requestUseCmykInput?.checked);
    requestNoPrintInput?.closest('.quote-request-ink-toggle')?.classList.toggle('is-on', !!requestNoPrintInput?.checked);
}

function syncInkGroupState() {
    if (requestInkGroup) requestInkGroup.classList.toggle('is-noprint', !!requestNoPrintInput?.checked);
    if (requestNoPrintInput?.checked) hideDirectColorMenu();
    syncCmykToggleVisual();
}

// ===========================================================================
// NUEVA SOLICITUD · Tipo de Salida con imagen
// ===========================================================================
let requestOutputTypeCatalog = null;

function resolveOutputTypeImageUrl(source) {
    const value = String(source || '').trim();
    if (!value) return '';
    if (/^(data:image\/|https?:\/\/|blob:|\/)/i.test(value)) return value;
    return `/${value.replace(/^\.?\//, '')}`;
}

async function loadOutputTypeOptions() {
    if (!requestOutputTypeSelect) return;
    if (!requestOutputTypeCatalog) {
        try {
            const data = await fetchJson('/api/catalogs');
            requestOutputTypeCatalog = (Array.isArray(data?.outputTypes) ? data.outputTypes : []).map((item) => ({
                id: String(item.id || item.codigo || item.nombre || '').trim(),
                label: normalizeText(item.nombre || item.name || item.codigo || item.id),
                image: resolveOutputTypeImageUrl(item.imageUrl || item.image_url || ''),
                active: item.activo !== false && item.active !== false
            })).filter((item) => item.id && item.active);
            requestOutputTypeCatalog.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
        } catch (error) {
            requestOutputTypeCatalog = [];
        }
    }
    const current = requestOutputTypeSelect.value;
    requestOutputTypeSelect.innerHTML = ['<option value="" selected disabled hidden>Selecciona un tipo</option>']
        .concat(requestOutputTypeCatalog.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`))
        .join('');
    if (current && requestOutputTypeCatalog.some((item) => item.id === current)) requestOutputTypeSelect.value = current;
    syncOutputTypePreview();
}

function syncOutputTypePreview() {
    if (!requestOutputTypeFrame) return;
    const selected = (requestOutputTypeCatalog || []).find((item) => item.id === requestOutputTypeSelect?.value);
    requestOutputTypeFrame.innerHTML = selected && selected.image
        ? `<img src="${escapeHtml(selected.image)}" alt="${escapeHtml(selected.label)}" loading="lazy" decoding="async">`
        : '<span>Sin imagen</span>';
}

// ===========================================================================
// NUEVA SOLICITUD · Referencia: campo + modal de búsqueda + Ver Arte
// (mismo comportamiento que el Cálculo: /api/flexo/referencias-por-cliente)
// ===========================================================================
const requestRefState = { items: [], filter: '', sortDir: 'desc', tipoFilter: 'todo' };
const requestArteState = { open: false, tipo: '', codigo: '', nombre: '', images: [], index: 0, loading: false };
const REQ_REF_TIPO_LABEL = { orden: 'Orden', producto: 'SKU' };

function syncReferenciaChangesVisibility() {
    if (!requestReferenciaChanges) return;
    requestReferenciaChanges.hidden = !normalizeText(requestReferenciaInput?.value);
}

async function fetchRequestReferenciaResults() {
    const customerCode = normalizeText(customerCodeInput?.value);
    if (!customerCode) return [];
    try {
        const payload = await fetchJson(`/api/flexo/referencias-por-cliente?customerCode=${encodeURIComponent(customerCode)}`);
        return Array.isArray(payload?.items) ? payload.items : [];
    } catch (error) {
        return [];
    }
}

function renderRequestRefRows() {
    const term = normalizeText(requestRefState.filter).toLowerCase();
    let items = requestRefState.items.filter((item) => {
        if (requestRefState.tipoFilter !== 'todo' && item.tipo !== requestRefState.tipoFilter) return false;
        if (!term) return true;
        return [REQ_REF_TIPO_LABEL[item.tipo] || item.tipo, item.codigo, item.sku, item.nombre].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
    items = items.slice().sort((a, b) => {
        const da = new Date(a.fecha || 0).getTime();
        const db = new Date(b.fecha || 0).getTime();
        return requestRefState.sortDir === 'asc' ? da - db : db - da;
    });
    if (!items.length) {
        return `<div class="qr-ref-empty">${requestRefState.filter || requestRefState.tipoFilter !== 'todo' ? 'Ninguna referencia coincide con el filtro.' : 'Este cliente no tiene órdenes ni SKU registrados.'}</div>`;
    }
    return items.map((item) => {
        const code = item.sku || item.codigo || '—';
        const art = Number(item.artCount || 0) > 0
            ? `<button type="button" class="qr-ref-art" data-req-ref-arte data-tipo="${escapeHtml(item.tipo)}" data-codigo="${escapeHtml(item.codigo)}" data-nombre="${escapeHtml(item.nombre || '')}" title="Ver arte (${Number(item.artCount)})">🖼 <span>${Number(item.artCount)}</span></button>`
            : '';
        return `<div class="qr-ref-row" data-req-ref-select data-tipo="${escapeHtml(item.tipo)}" data-codigo="${escapeHtml(item.codigo)}" data-sku="${escapeHtml(item.sku || '')}" data-nombre="${escapeHtml(item.nombre || '')}" role="button" tabindex="0">
            <span class="qr-ref-chip${item.tipo === 'orden' ? ' is-orden' : ''}">${escapeHtml(REQ_REF_TIPO_LABEL[item.tipo] || item.tipo)}</span>
            <span class="qr-ref-code">${escapeHtml(code)}</span>
            <span class="qr-ref-name">${escapeHtml(item.nombre || 'Sin nombre')}</span>
            <span class="qr-ref-date">Producido el ${escapeHtml(formatDateLabel(item.fecha) || '—')}</span>
            ${art}
        </div>`;
    }).join('');
}

function formatDateLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderRequestRefModal() {
    const overlay = document.getElementById('qrRefOverlay');
    if (!overlay) return;
    const sortIcon = requestRefState.sortDir === 'asc' ? '▲' : '▼';
    const tipoBtn = (value, label) => `<button type="button" class="qr-ref-tipo-btn${requestRefState.tipoFilter === value ? ' is-active' : ''}" data-req-ref-tipo="${value}">${label}</button>`;
    overlay.querySelector('.qr-ref-modal').innerHTML = `
        <div class="qr-ref-head"><h3>Buscar Referencia del Cliente</h3><button type="button" class="qr-ref-close" data-req-ref-close aria-label="Cerrar">&times;</button></div>
        <div class="qr-ref-toolbar">
            <input type="text" id="qrRefInput" placeholder="Buscar por tipo, código, SKU o nombre…" value="${escapeHtml(requestRefState.filter)}">
            <button type="button" class="qr-ref-tipo-btn" data-req-ref-sort title="Ordenar por fecha">Fecha ${sortIcon}</button>
        </div>
        <div class="qr-ref-tipos">${tipoBtn('todo', 'Todo')}${tipoBtn('orden', 'Órdenes')}${tipoBtn('producto', 'SKU')}</div>
        <div class="qr-ref-body">${renderRequestRefRows()}</div>`;
}

async function openRequestReferenciaModal() {
    const customerCode = normalizeText(customerCodeInput?.value);
    if (!customerCode) {
        setStatus('Primero elige el cliente para buscar sus referencias.', 'error');
        return;
    }
    let overlay = document.getElementById('qrRefOverlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="qrRefOverlay" class="qr-ref-overlay" style="display:none"><div class="qr-ref-modal"></div></div>');
        overlay = document.getElementById('qrRefOverlay');
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target.closest('[data-req-ref-close]')) { closeRequestReferenciaModal(); return; }
            if (event.target.closest('[data-req-ref-sort]')) { requestRefState.sortDir = requestRefState.sortDir === 'asc' ? 'desc' : 'asc'; renderRequestRefModal(); return; }
            const tipo = event.target.closest('[data-req-ref-tipo]');
            if (tipo) { requestRefState.tipoFilter = tipo.dataset.reqRefTipo || 'todo'; renderRequestRefModal(); setTimeout(() => document.getElementById('qrRefInput')?.focus(), 20); return; }
            const arte = event.target.closest('[data-req-ref-arte]');
            if (arte) { event.stopPropagation(); openRequestArteModal(arte.dataset.tipo || '', arte.dataset.codigo || '', arte.dataset.nombre || ''); return; }
            const row = event.target.closest('[data-req-ref-select]');
            if (row) selectRequestReferencia(row.dataset.tipo || '', row.dataset.codigo || '', row.dataset.sku || '', row.dataset.nombre || '');
        });
        overlay.addEventListener('input', (event) => {
            if (event.target.id === 'qrRefInput') {
                requestRefState.filter = event.target.value || '';
                const body = overlay.querySelector('.qr-ref-body');
                if (body) body.innerHTML = renderRequestRefRows();
            }
        });
    }
    requestRefState.filter = '';
    requestRefState.sortDir = 'desc';
    requestRefState.tipoFilter = 'todo';
    overlay.style.display = 'flex';
    overlay.querySelector('.qr-ref-modal').innerHTML = '<div class="qr-ref-empty">Buscando referencias del cliente…</div>';
    requestRefState.items = await fetchRequestReferenciaResults();
    renderRequestRefModal();
    setTimeout(() => document.getElementById('qrRefInput')?.focus(), 30);
}

function closeRequestReferenciaModal() {
    const overlay = document.getElementById('qrRefOverlay');
    if (overlay) overlay.style.display = 'none';
}

function selectRequestReferencia(tipo, codigo, sku, nombre) {
    if (!requestReferenciaInput) return;
    const shown = sku || codigo;
    requestReferenciaInput.value = nombre ? `${shown} — ${nombre}` : shown;
    syncReferenciaChangesVisibility();
    invalidateQuickRequestPreview();
    closeRequestReferenciaModal();
}

async function openRequestArteModal(tipo, codigo, nombre) {
    requestArteState.open = true;
    requestArteState.tipo = tipo;
    requestArteState.codigo = codigo;
    requestArteState.nombre = nombre || '';
    requestArteState.images = [];
    requestArteState.index = 0;
    requestArteState.loading = true;
    let overlay = document.getElementById('qrArteOverlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="qrArteOverlay" class="qr-arte-overlay" style="display:none"><div class="qr-arte-modal"></div></div>');
        overlay = document.getElementById('qrArteOverlay');
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target.closest('[data-qr-arte-close]')) { closeRequestArteModal(); return; }
            const nav = event.target.closest('[data-qr-arte-nav]');
            if (nav && requestArteState.images.length) {
                const dir = Number(nav.dataset.qrArteNav || 0);
                requestArteState.index = (requestArteState.index + dir + requestArteState.images.length) % requestArteState.images.length;
                renderRequestArteModal();
                return;
            }
            const thumb = event.target.closest('[data-qr-arte-thumb]');
            if (thumb) { requestArteState.index = Number(thumb.dataset.qrArteThumb || 0); renderRequestArteModal(); }
        });
    }
    overlay.style.display = 'flex';
    renderRequestArteModal();
    try {
        const key = tipo === 'orden' ? 'orden' : 'producto';
        const payload = await fetchJson(`/api/adjuntos-producto?${key}=${encodeURIComponent(codigo)}`);
        const items = Array.isArray(payload?.items) ? payload.items : [];
        requestArteState.images = items
            .filter((item) => String(item.mime || '').toLowerCase().startsWith('image/'))
            .map((item) => {
                const base = item.descargarUrl || `/api/adjuntos-producto/${item.id}/descargar`;
                return { url: `${base}${base.includes('?') ? '&' : '?'}inline=1`, name: item.nombre || item.nombre_archivo || 'Arte' };
            });
    } catch (error) {
        requestArteState.images = [];
    }
    requestArteState.loading = false;
    if (requestArteState.open) renderRequestArteModal();
}

function renderRequestArteModal() {
    const overlay = document.getElementById('qrArteOverlay');
    if (!overlay) return;
    const modal = overlay.querySelector('.qr-arte-modal');
    const { images, index, loading, nombre, codigo } = requestArteState;
    const current = images[index];
    const title = nombre ? `${nombre} · ${codigo}` : codigo;
    let body;
    if (loading) {
        body = '<div class="qr-arte-empty">Cargando artes…</div>';
    } else if (!images.length) {
        body = '<div class="qr-arte-empty">Esta referencia no tiene artes cargados.</div>';
    } else {
        body = `<div class="qr-arte-stage">
            ${images.length > 1 ? '<button type="button" class="qr-arte-nav prev" data-qr-arte-nav="-1" aria-label="Anterior">‹</button>' : ''}
            <img src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
            ${images.length > 1 ? '<button type="button" class="qr-arte-nav next" data-qr-arte-nav="1" aria-label="Siguiente">›</button>' : ''}
          </div>
          <div class="qr-arte-caption">${escapeHtml(current.name)}${images.length > 1 ? ` · ${index + 1} de ${images.length}` : ''}</div>
          ${images.length > 1 ? `<div class="qr-arte-thumbs">${images.map((img, i) => `<button type="button" class="qr-arte-thumb${i === index ? ' is-active' : ''}" data-qr-arte-thumb="${i}"><img src="${escapeHtml(img.url)}" alt=""></button>`).join('')}</div>` : ''}`;
    }
    modal.innerHTML = `<div class="qr-arte-head"><h3>Arte — ${escapeHtml(title)}</h3><button type="button" class="qr-ref-close" data-qr-arte-close aria-label="Cerrar">&times;</button></div>
        <div class="qr-arte-body">${body}</div>
        <div class="qr-arte-hint">Arrastra la esquina para ampliar la ventana.</div>`;
}

function closeRequestArteModal() {
    requestArteState.open = false;
    const overlay = document.getElementById('qrArteOverlay');
    if (overlay) overlay.style.display = 'none';
}

function computeTroquelFallbackDescription(die) {
    const clasificacion = String(die?.clasificacion || die?.classification || '').trim();
    const forma = String(die?.formato || die?.forma_troquel || die?.formaTroquel || '').trim();
    return [clasificacion, forma].filter(Boolean).join(' ');
}

function extractDieShapeToken(die) {
    const raw = String(die?.clasificacion || die?.classification || die?.formaTroquel || die?.forma_troquel || die?.formato || die?.tipoTroquel2 || die?.tipo_troquel_2 || '').toLowerCase();
    const normalized = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (normalized.includes('circular') || normalized.includes('redond')) return 'Circular';
    if (normalized.includes('cuadrad')) return 'Cuadrado';
    if (normalized.includes('rectangul')) return 'Rectangular';
    if (normalized.includes('ovalad')) return 'Ovalado';
    if (normalized.includes('butt')) return 'Butt Cut';
    return normalized ? 'Especial' : '';
}

function syncTroquelTriggerDisplay() {
    if (!requestTroquelTrigger) return;
    const code = normalizeText(requestTroquelCodeInput?.value);
    const description = normalizeText(requestTroquelDescriptionInput?.value);
    const codeEl = requestTroquelTrigger.querySelector('[data-troquel-code]');
    const descEl = requestTroquelTrigger.querySelector('[data-troquel-desc]');
    const metricsEl = requestTroquelTrigger.querySelector('[data-troquel-metrics]');
    requestTroquelTrigger.classList.toggle('is-empty', !code);
    if (codeEl) codeEl.textContent = code || 'Buscar troquel…';
    if (descEl) descEl.textContent = code && description ? `· ${description}` : '';
    if (metricsEl) metricsEl.textContent = '';
    // El resumen de medidas se guarda en el title (hover), no como línea extra, para
    // que el campo mantenga la misma altura y tipografía que el resto.
    const die = code ? (cotizacionesTroquelesCatalog || []).find((item) => String(item.codigoTroquel || item.codigo || item.id || '') === code) : null;
    if (die) {
        const parts = [];
        const lW = die.anchoEtiquetaIn != null ? Number(die.anchoEtiquetaIn).toFixed(2) : null;
        const lH = die.largoEtiquetaIn != null ? Number(die.largoEtiquetaIn).toFixed(2) : null;
        const dW = die.anchoTroquel != null ? Number(die.anchoTroquel).toFixed(2) : null;
        const dH = die.largoTroquel != null ? Number(die.largoTroquel).toFixed(2) : null;
        if (lW && lH) parts.push(`Etiqueta: ${lW}″ x ${lH}″`);
        if (dW && dH) parts.push(`Troquel: ${dW}″ x ${dH}″`);
        requestTroquelTrigger.title = [code, description, parts.join(' · ')].filter(Boolean).join(' — ');
    } else {
        requestTroquelTrigger.title = code ? [code, description].filter(Boolean).join(' — ') : 'Buscar troquel';
    }
}

function selectTroquelFromCatalog(dieCode) {
    const die = (cotizacionesTroquelesCatalog || []).find((item) => String(item.codigoTroquel || item.codigo || item.id || '') === String(dieCode));
    if (!die) return;
    const code = String(die.codigoTroquel || die.codigo || die.id || '');
    const description = String(die.descripcion || die.description || '').trim() || computeTroquelFallbackDescription(die);
    if (requestTroquelCodeInput) requestTroquelCodeInput.value = code;
    if (requestTroquelDescriptionInput) requestTroquelDescriptionInput.value = description;
    if (requestTroquelShapeInput) requestTroquelShapeInput.value = extractDieShapeToken(die);
    syncTroquelTriggerDisplay();
    closeTroquelCatalogModal();
}

function renderTroquelCatalogRow(die) {
    const code = escapeHtml(die.codigoTroquel || die.codigo || die.id || '');
    const description = escapeHtml(die.descripcion || computeTroquelFallbackDescription(die));
    const imageUrl = resolveTroquelImageUrl(die);
    const imageHtml = imageUrl ? `<div class="troquel-catalog-img"><img src="${escapeHtml(imageUrl)}" alt="${code}" loading="lazy"></div>` : '';
    const labelW = die.anchoEtiquetaIn != null ? Number(die.anchoEtiquetaIn).toFixed(2) : null;
    const labelH = die.largoEtiquetaIn != null ? Number(die.largoEtiquetaIn).toFixed(2) : null;
    const dieW = die.anchoTroquel != null ? Number(die.anchoTroquel).toFixed(2) : null;
    const dieH = die.largoTroquel != null ? Number(die.largoTroquel).toFixed(2) : null;
    let metricsHtml = '';
    const metrics = [];
    if (labelW && labelH) metrics.push(`<span>Etiqueta: ${labelW}″ x ${labelH}″</span>`);
    if (dieW && dieH) metrics.push(`<span>Troquel: ${dieW}″ x ${dieH}″</span>`);
    if (metrics.length) metricsHtml = `<div class="troquel-catalog-metrics">${metrics.join('')}</div>`;
    return `<div class="troquel-catalog-item" data-die-code="${escapeHtml(die.codigoTroquel || die.codigo || die.id || '')}">${imageHtml}<div class="troquel-catalog-info"><div class="troquel-catalog-code">${code}</div><div class="troquel-catalog-desc">${description || 'Sin descripción'}</div>${metricsHtml}</div><div class="troquel-catalog-action"><button type="button" class="troquel-catalog-select-btn" title="Seleccionar troquel" aria-label="Seleccionar troquel">${iconMarkup('+', 'Seleccionar troquel', 'troquel-catalog-select-icon')}</button></div></div>`;
}

const troquelCatalogFilters = { shape: '' };

function renderTroquelShapeChips() {
    const shapes = getShapeOptions();
    const allChip = `<button type="button" class="troquel-catalog-shape-chip${troquelCatalogFilters.shape ? '' : ' is-active'}" data-shape-filter="">Todas</button>`;
    const shapeChips = shapes.map((shape) => `<button type="button" class="troquel-catalog-shape-chip${troquelCatalogFilters.shape === shape.value ? ' is-active' : ''}" data-shape-filter="${escapeHtml(shape.value)}">${escapeHtml(shape.label)}</button>`).join('');
    return allChip + shapeChips;
}

function renderTroquelCatalogModal(dies) {
    const rows = dies.length ? dies.map((die) => renderTroquelCatalogRow(die)).join('') : '<div class="troquel-catalog-empty">No hay troqueles disponibles en el catálogo.</div>';
    return `<div id="troquelCatalogOverlay" class="troquel-catalog-overlay"><div class="troquel-catalog-modal"><div class="troquel-catalog-head"><h3>Catálogo de Troqueles</h3><button type="button" class="troquel-catalog-close" data-close-troquel-catalog aria-label="Cerrar">&times;</button></div><div class="troquel-catalog-shapes" id="troquelCatalogShapes">${renderTroquelShapeChips()}</div><div class="troquel-catalog-search"><div class="troquel-catalog-search-input-wrap"><input type="text" id="troquelCatalogSearch" placeholder="Buscar por código, descripción o medida (ej. 2x2)…"><span class="troquel-catalog-search-icon">&#128269;</span></div><button type="button" id="troquelCatalogSimilarBtn" class="troquel-catalog-similar-btn" title="Buscar troqueles con medidas similares a las del producto">Medidas Similares</button><button type="button" id="troquelCatalogClearBtn" class="troquel-catalog-clear-btn" hidden title="Limpiar filtros">Limpiar Filtros &times;</button></div><div class="troquel-catalog-body"><div class="troquel-catalog-list">${rows}</div><div id="troquelCatalogNoMatches" class="troquel-catalog-empty" hidden>Ningún troquel coincide con el filtro aplicado.</div></div></div></div>`;
}

async function openTroquelCatalogModal() {
    const dies = await loadTroquelesCatalog();
    let overlay = document.getElementById('troquelCatalogOverlay');
    if (overlay) overlay.remove();
    troquelCatalogFilters.shape = normalizeText(requestTroquelShapeInput?.value) || '';
    document.body.insertAdjacentHTML('beforeend', renderTroquelCatalogModal(dies));
    overlay = document.getElementById('troquelCatalogOverlay');
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('[data-close-troquel-catalog]')) {
            closeTroquelCatalogModal();
            return;
        }
        const shapeChip = event.target.closest('[data-shape-filter]');
        if (shapeChip) {
            troquelCatalogFilters.shape = shapeChip.dataset.shapeFilter || '';
            document.querySelectorAll('.troquel-catalog-shape-chip').forEach((chip) => chip.classList.toggle('is-active', chip === shapeChip));
            applyTroquelCatalogFilters();
            return;
        }
        if (event.target.closest('#troquelCatalogSimilarBtn')) {
            applyTroquelSimilarSizeSearch();
            return;
        }
        if (event.target.closest('#troquelCatalogClearBtn')) {
            clearTroquelCatalogFilters();
            return;
        }
        const item = event.target.closest('.troquel-catalog-item');
        if (item) selectTroquelFromCatalog(item.dataset.dieCode);
    });
    const searchInput = document.getElementById('troquelCatalogSearch');
    searchInput?.addEventListener('input', () => applyTroquelCatalogFilters());
    document.body.classList.add('popover-open');
    setTimeout(() => searchInput?.focus(), 100);
}

function closeTroquelCatalogModal() {
    const overlay = document.getElementById('troquelCatalogOverlay');
    if (!overlay) return;
    overlay.remove();
    document.body.classList.remove('popover-open');
}

function parseTroquelDimsQuery(term) {
    const match = String(term || '').trim().match(/^(\d+(?:[.,]\d+)?)[\sx×*]+(\d+(?:[.,]\d+)?)$/i);
    if (!match) return null;
    const a = parseFloat(match[1].replace(',', '.'));
    const b = parseFloat(match[2].replace(',', '.'));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { a, b };
}

function dieMatchesDimsQuery(die, dims, tolerance = 0.15) {
    const labelW = die.anchoEtiquetaIn != null ? Number(die.anchoEtiquetaIn) : null;
    const labelH = die.largoEtiquetaIn != null ? Number(die.largoEtiquetaIn) : null;
    const dieW = die.anchoTroquel != null ? Number(die.anchoTroquel) : null;
    const dieH = die.largoTroquel != null ? Number(die.largoTroquel) : null;
    const close = (x, y) => x != null && Number.isFinite(x) && Math.abs(x - y) <= tolerance;
    return (close(labelW, dims.a) && close(labelH, dims.b))
        || (close(labelW, dims.b) && close(labelH, dims.a))
        || (close(dieW, dims.a) && close(dieH, dims.b))
        || (close(dieW, dims.b) && close(dieH, dims.a));
}

function applyTroquelCatalogFilters() {
    const searchInput = document.getElementById('troquelCatalogSearch');
    const term = String(searchInput?.value || '').trim();
    const lowerTerm = term.toLowerCase();
    const dims = parseTroquelDimsQuery(term);
    const dies = cotizacionesTroquelesCatalog || [];
    let anyVisible = false;
    document.querySelectorAll('.troquel-catalog-item').forEach((item) => {
        const code = item.dataset.dieCode;
        const die = dies.find((d) => String(d.codigoTroquel || d.codigo || d.id || '') === code);
        let visible = true;
        if (troquelCatalogFilters.shape) visible = die ? extractDieShapeToken(die) === troquelCatalogFilters.shape : false;
        if (visible && term) {
            if (dims) visible = die ? dieMatchesDimsQuery(die, dims) : false;
            else visible = (item.textContent || '').toLowerCase().includes(lowerTerm);
        }
        item.style.display = visible ? '' : 'none';
        if (visible) anyVisible = true;
    });
    const noMatches = document.getElementById('troquelCatalogNoMatches');
    if (noMatches) noMatches.hidden = anyVisible || dies.length === 0;
    const clearBtn = document.getElementById('troquelCatalogClearBtn');
    if (clearBtn) clearBtn.hidden = !(term || troquelCatalogFilters.shape);
}

function clearTroquelCatalogFilters() {
    troquelCatalogFilters.shape = '';
    document.querySelectorAll('.troquel-catalog-shape-chip').forEach((chip) => chip.classList.toggle('is-active', !chip.dataset.shapeFilter));
    const searchInput = document.getElementById('troquelCatalogSearch');
    if (searchInput) searchInput.value = '';
    applyTroquelCatalogFilters();
}

function getCurrentRequestDims() {
    const isCustomSize = fixedSizeSelect?.value === 'custom';
    const selectedSize = fixedSizeSelect?.selectedOptions?.[0];
    const customWidth = Number(customWidthInput?.value || 0) || 0;
    const customHeight = Number(customHeightInput?.value || 0) || 0;
    const circular = isCircularRequestShape();
    const width = isCustomSize ? customWidth : (Number(selectedSize?.dataset.width || 0) || 0);
    const length = circular ? width : (isCustomSize ? customHeight : (Number(selectedSize?.dataset.length || 0) || 0));
    if (!width || !length) return null;
    return { width, length };
}

function applyTroquelSimilarSizeSearch() {
    const dims = getCurrentRequestDims();
    const searchInput = document.getElementById('troquelCatalogSearch');
    if (!dims) {
        setStatus('Selecciona primero las medidas del producto para buscar troqueles similares.', 'error');
        return;
    }
    if (searchInput) {
        searchInput.value = `${dims.width}x${dims.length}`;
        applyTroquelCatalogFilters();
    }
}

function getShapeOptions() {
    const general = loadedConfig?.general || {};
    return [
        { value: 'Circular', label: general.dieShapeLabel1 || 'Circular', image: general.dieShapeImage1 || '' },
        { value: 'Cuadrado', label: general.dieShapeLabel2 || 'Cuadrado', image: general.dieShapeImage2 || '' },
        { value: 'Rectangular', label: general.dieShapeLabel3 || 'Rectangular', image: general.dieShapeImage3 || '' },
        { value: 'Ovalado', label: general.dieShapeLabel4 || 'Ovalado', image: general.dieShapeImage4 || '' },
        { value: 'Especial', label: general.dieShapeLabel5 || 'Especial', image: general.dieShapeImage5 || '' },
        { value: 'Butt Cut', label: general.dieShapeLabel6 || 'Butt Cut', image: general.dieShapeImage6 || '/assets/die-shapes/butt-cut.png' }
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

function isCircularShapeValue(value) {
    return normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('circular');
}

function isCircularRequestShape() {
    return isCircularShapeValue(getSelectedShapeInput()?.value || '');
}

function syncCustomSizeForShape() {
    const circular = isCircularRequestShape();
    if (customWidthLabel) customWidthLabel.textContent = circular ? 'Diámetro' : 'Ancho';
    if (customHeightField) customHeightField.hidden = circular;
    if (circular && customHeightInput && customWidthInput) customHeightInput.value = customWidthInput.value;
    syncCustomSizeUnitMasks();
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
    syncCustomSizeForShape();
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
    const selectedShape = normalizeText(requestTroquelShapeInput?.value);
    const dieCode = normalizeText(requestTroquelCodeInput?.value);
    const dieDescription = normalizeText(requestTroquelDescriptionInput?.value);
    const selectedSize = fixedSizeSelect?.selectedOptions?.[0];
    const isCustomSize = fixedSizeSelect?.value === 'custom';
    const customWidth = Number(customWidthInput?.value || 0) || 0;
    const customHeight = Number(customHeightInput?.value || 0) || 0;
    const isCircularShape = isCircularShapeValue(selectedShape);
    const widthInches = isCustomSize ? customWidth : (Number(selectedSize?.dataset.width || 0) || null);
    const lengthInches = isCircularShape ? widthInches : (isCustomSize ? customHeight : (Number(selectedSize?.dataset.length || 0) || null));
    const sizeLabel = isCircularShape
        ? (widthInches ? `Diámetro: ${widthInches} in` : 'Diámetro')
        : (isCustomSize
            ? (widthInches && lengthInches ? `Medida especial: ${widthInches} in x ${lengthInches} in` : 'Medida especial')
            : normalizeText(selectedSize?.textContent || fixedSizeSelect?.value));
    const numbering = getSelectedNumberingValue();
    const stamping = normalizeText(requestStampingMaterialSelect?.value);
    const lamination = normalizeText(requestLaminadoMaterialSelect?.value);
    const varnish = normalizeText(requestVarnishMaterialSelect?.value);
    const outputTypeValue = normalizeText(requestOutputTypeSelect?.value);
    const labelingType = normalizeText(requestLabelingTypeSelect?.value);
    const clientSku = normalizeText(requestClientSkuInput?.value);
    const useCmyk = !!requestUseCmykInput?.checked;
    const noPrint = !!requestNoPrintInput?.checked;
    const insumosCliente = [
        requestInsumoArteDigital?.checked ? 'Arte Digital' : '',
        requestInsumoMuestrasFisicas?.checked ? 'Muestras Físicas' : '',
        requestInsumoEnvase?.checked ? 'Envase' : ''
    ].filter(Boolean);
    const directColors = requestDirectColors.map((color) => ({ nombre: color.nombre, hex: color.hex || '', origen: color.origen || '' }));
    const referenciaText = normalizeText(requestReferenciaInput?.value);
    const referenciaCambios = [
        requestRefCambioMedidas?.checked ? 'Medidas' : '',
        requestRefCambioArte?.checked ? 'Arte' : '',
        requestRefCambioTextos?.checked ? 'Textos' : '',
        requestRefCambioOtros?.checked ? 'Otros' : ''
    ].filter(Boolean);
    const referenciaComentario = normalizeText(requestReferenciaComentario?.value);
    const productType = requestProductTypeSelect?.value || '';
    const processType = normalizeText(requestProcessTypeInput?.value) || 'Convencional';
    const quantities = readRequestedQuantities();
    const contact = selectedContactPayload(customerContactSelect);
    const numberingIsConsecutive = isConsecutiveNumbering(numbering);
    const numberingFrom = numberingIsConsecutive ? normalizeText(numberingRangeStartInput?.value) : '';
    const numberingTo = numberingIsConsecutive ? normalizeText(numberingRangeEndInput?.value) : '';
    const numberingDetail = normalizeText(numberingDetailInput?.value);
    const numberingAttachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const numberingAttachment = numberingAttachmentIndex >= 0 ? pendingAttachments[numberingAttachmentIndex] : null;
    const numberingSummary = numbering
        ? [getNumberingLabel(numbering), numberingFrom || numberingTo ? `Desde ${numberingFrom || '...'} hasta ${numberingTo || '...'}` : '', numberingDetail].filter(Boolean).join(' | ')
        : '';
    const barnizOption = findBarnizOptionByName(varnish);
    const laminadoOption = findLaminadoOptionByName(lamination);
    const estampadoOption = findEstampadoOptionByName(stamping);
    const acabadosMeta = {
        'REQ | Barniz BCM Anilox': barnizOption ? String(barnizOption.bcmAnilox ?? '') : '',
        'REQ | Barniz Cobertura %': barnizOption ? String(barnizOption.porcentajeCobertura ?? '') : '',
        'REQ | Barniz Factor Transferencia': barnizOption ? String(barnizOption.factorTransferencia ?? '') : '',
        'REQ | Barniz Densidad': barnizOption ? String(barnizOption.densidad ?? '') : '',
        'REQ | Barniz Costo por Kilo': barnizOption ? String(barnizOption.costoPorKilo ?? '') : '',
        'REQ | Barniz Viscosidad': barnizOption ? String(barnizOption.visc ?? '') : '',
        'REQ | Barniz Potencia UV': barnizOption ? String(barnizOption.potencia ?? '') : '',
        'REQ | Barniz Temp UV': barnizOption ? String(barnizOption.temp ?? '') : '',
        'REQ | Laminado Costo por Metro Lineal': laminadoOption ? String(laminadoOption.costoPorMetroLineal ?? '') : '',
        'REQ | Laminado Tiempo Montaje': laminadoOption ? String(laminadoOption.tiempoMontaje ?? '') : '',
        'REQ | Estampado Costo por Metro Lineal': estampadoOption ? String(estampadoOption.costoPorMetroLineal ?? '') : '',
        'REQ | Estampado Tiempo Montaje': estampadoOption ? String(estampadoOption.tiempoMontaje ?? '') : ''
    };

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
        applicationEnvironment: normalizeText(surfaceInput?.value),
        surfaceType: normalizeText(surfaceTypeInput?.value),
        outputType: outputTypeValue,
        labelingType,
        client_sku: clientSku,
        use_cmyk: useCmyk,
        no_print: noPrint,
        insumos_cliente: insumosCliente,
        direct_colors: directColors,
        widthInches,
        lengthInches,
        die_code: dieCode,
        die_description: dieDescription,
        request_meta: {
            'REQ | Tipo de Producto': normalizeText(productType),
            'REQ | Cantidades': quantities.map((item) => formatNumber(item)).join(', '),
            'REQ | Ruta Solicitada': 'Automática',
            'REQ | Cliente Contacto': contact.contact_name,
            'REQ | Forma': selectedShape,
            'REQ | Troquel Codigo': dieCode,
            'REQ | Troquel Descripcion': dieDescription,
            'REQ | Barniz': varnish,
            'REQ | Laminado': lamination,
            'REQ | Estampado': stamping,
            ...acabadosMeta,
            'REQ | Numeracion': numbering,
            'REQ | Numeracion Desde': numberingFrom,
            'REQ | Numeracion Hasta': numberingTo,
            'REQ | Numeracion Detalle': numberingDetail,
            'REQ | Numeracion Resumen': numberingSummary,
            'REQ | Numeracion Adjunto': numberingAttachment?.fileName || '',
            'REQ | Embosado': 'No',
            'REQ | Troquelado': 'Si',
            'REQ | Superficie': normalizeText(surfaceInput?.value),
            'REQ | Tipo Superficie': normalizeText(surfaceTypeInput?.value),
            'REQ | Tipo de Salida': outputTypeValue,
            'REQ | Tipo de Etiquetado': labelingType,
            'REQ | SKU Cliente': clientSku,
            'REQ | Referencia': referenciaText,
            'REQ | Referencia Cambios': referenciaCambios.join(', '),
            'REQ | Referencia Comentario': referenciaComentario,
            'REQ | CMYK': useCmyk ? 'Si' : 'No',
            'REQ | Sin Impresion': noPrint ? 'Si' : 'No',
            'REQ | Colores Directos': directColors.map((color) => color.nombre).join(', '),
            'REQ | Insumos Cliente': insumosCliente.join(', '),
            'REQ | Comentarios': normalizeText(document.getElementById('requestComments')?.value),
            'REQ | Medida Fija': sizeLabel,
            'REQ | Numeracion Aviso': numbering ? 'Revisar proceso adicional de impresion para numerado.' : '',
            'TRAZABILIDAD | SOLICITUD VENDEDOR': 'Si',
            'TRAZABILIDAD | FECHA SOLICITUD VENDEDOR': new Date().toISOString(),
            'TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR': currentUserName(),
            'Estado_UI': {
                request: 'solicitud-vendedor',
                productType: normalizeText(productType),
                quantities,
                dieShape: selectedShape,
                dieCode,
                dieDescription,
                widthInches,
                lengthInches,
                outputType: outputTypeValue,
                labelingType,
                clientSku,
                useCmyk,
                noPrint,
                insumosCliente,
                directColors,
                referencia: referenciaText,
                referenciaCambios,
                referenciaComentario,
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
                    laminado: lamination,
                    stamping
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

function getOutputTypeField() {
    return requestOutputTypeSelect?.closest('.quote-request-output-row') || requestOutputTypeSelect?.closest('.quote-request-field') || null;
}

function validateQuickRequestStep(stepNumber) {
    const payload = collectRequestPayload();
    payload.quantities = parseRequestedQuantities(payload.quantities);
    const errors = [];
    clearQuickRequestValidationState();

    if (stepNumber === 1) {
        if (!payload.customer_name) markQuickRequestInvalid(customerNameInput, errors, 'Nombre del cliente');
        if (!payload.contact_name) {
            markQuickRequestInvalid(customerContactSelect, errors, 'Contacto');
            markQuickRequestInvalid(requestManualContactName, errors);
        }
        if (!payload.job_name) markQuickRequestInvalid(document.getElementById('requestJobName'), errors, 'Nombre del producto');
        if (!payload.product_type) markQuickRequestInvalid(requestProductTypeSelect, errors, 'Tipo de producto');
        if (!payload.quantities.length) {
            errors.push('Cantidad');
            requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]')?.forEach((input) => input.classList.add('is-invalid'));
        }
    }

    if (stepNumber === 2) {
        if (!payload.die_code) markQuickRequestInvalid(requestTroquelTrigger, errors, 'Troquel');
        if (!fixedSizeSelect?.value) markQuickRequestInvalid(fixedSizeTrigger || fixedSizeSelect, errors, 'Medida');
        if (fixedSizeSelect?.value === 'custom') {
            if (!payload.widthInches || payload.widthInches <= 0) markQuickRequestInvalid(customWidthInput, errors, isCircularRequestShape() ? 'Diámetro' : 'Ancho especial');
            if (!isCircularRequestShape() && (!payload.lengthInches || payload.lengthInches <= 0)) markQuickRequestInvalid(customHeightInput, errors, 'Alto especial');
        }
        if (!payload.material_name) markQuickRequestInvalid(materialInput, errors, 'Sustrato');
        if (!payload.outputType) markQuickRequestInvalid(getOutputTypeField(), errors, 'Tipo de Salida');
        if (!payload.applicationType) markQuickRequestInvalid(surfaceInput, errors, 'Aplicación');
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

    const check = (value, el, name) => {
        if (!value) {
            el?.classList.add('is-invalid');
            errors.push(name);
        }
    };

    check(payload.customer_name, customerNameInput, 'Nombre del cliente');
    if (!payload.contact_name) {
        customerContactSelect?.classList.add('is-invalid');
        requestManualContactName?.classList.add('is-invalid');
        errors.push('Contacto');
    }
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
        check(payload.die_code, requestTroquelTrigger, 'Troquel');
        check(payload.material_name, materialInput, 'Sustrato');
        check(payload.applicationType, surfaceInput, 'Aplicación');
        check(fixedSizeSelect?.value, fixedSizeTrigger || fixedSizeSelect, 'Medida');
        if (fixedSizeSelect?.value === 'custom') {
            check(payload.widthInches > 0, customWidthInput, isCircularRequestShape() ? 'Diámetro' : 'Ancho especial');
            if (!isCircularRequestShape()) check(payload.lengthInches > 0, customHeightInput, 'Alto especial');
        }
    }

    check(payload.outputType, getOutputTypeField(), 'Tipo de Salida');
    if (errors.length > 0) {
        showQuickRequestErrors(errors);
        throw new Error(`Faltan: ${errors.join(', ')}.`);
    }

    setStatus('');
    return payload;
}

function buildQuickRequestFingerprint(payload) {
    const meta = payload.request_meta || {};
    return JSON.stringify({
        customer: payload.customer_code || payload.customer_name,
        job: payload.job_name,
        quantity: payload.quantities || [],
        material: payload.material_name,
        surface: payload.applicationType,
        surfaceType: payload.surfaceType,
        outputType: payload.outputType,
        labelingType: payload.labelingType,
        clientSku: payload.client_sku,
        useCmyk: payload.use_cmyk,
        noPrint: payload.no_print,
        insumos: (payload.insumos_cliente || []).join(','),
        directColors: (payload.direct_colors || []).map((color) => color.nombre).join(','),
        width: payload.widthInches,
        length: payload.lengthInches,
        productType: payload.product_type,
        shape: meta['REQ | Forma'],
        varnish: meta['REQ | Barniz'],
        lamination: meta['REQ | Laminado'],
        stamping: meta['REQ | Estampado'],
        numbering: meta['REQ | Numeracion Resumen'],
        comments: meta['REQ | Comentarios']
    });
}

function hashQuickRequestFingerprint(value) {
    let hash = 0;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function buildQuickRequestKey(payload) {
    return `${quoteRequestWizardState.requestId}-${hashQuickRequestFingerprint(buildQuickRequestFingerprint(payload))}`;
}

async function createQuickQuoteDraft(payload, options = {}) {
    const status = options.status || 'Solicitada';
    const quantities = payload.quantities?.length ? payload.quantities : [payload.quantity];
    const baseQuantity = parseRequestedQuantityValue(quantities[0]) || 0;
    const requestKey = options.requestKey || buildQuickRequestKey(payload);
    const requestMeta = { ...(payload.request_meta || {}) };
    const uiState = requestMeta.Estado_UI;
    if (uiState && typeof uiState === 'object' && !Array.isArray(uiState)) {
        requestMeta.Estado_UI = {
            ...uiState,
            header: {
                ...(uiState.header || {}),
                quantities: quantities.map((value, index) => ({ id: `qty-${index + 1}`, value }))
            }
        };
    }
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
            request_key: requestKey,
            status
        })
    });
    const quoteCode = quoteResponse?.cotizacion?.quote_code;
    if (!quoteCode) throw new Error('La cotización se creó sin código.');
    let firstLineCode = '';
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
            quantity: baseQuantity,
            quantityProducts: baseQuantity,
            material_name: payload.material_name,
            material_code: payload.material_code || payload.material_name,
            die_code: payload.die_code,
            die_description: payload.die_description,
            applicationType: payload.labelingType || payload.applicationType,
            applicationEnvironment: payload.applicationEnvironment,
            surfaceType: payload.surfaceType,
            outputType: payload.outputType,
            widthInches: payload.widthInches,
            lengthInches: payload.lengthInches,
            status,
            line_order: 1,
            request_meta: {
                ...requestMeta,
                'Clave_Solicitud': requestKey,
                'SOLICITUD ESTADO': status,
                'REQ | Cantidad Solicitada Original': String(baseQuantity),
                'REQ | Grupo de Cantidades': quantities.join(', ')
            }
        })
    });
    firstLineCode = lineResponse?.linea?.line_code;
    if (!firstLineCode) throw new Error('La línea se creó sin código.');
    await uploadPendingAttachments(quoteCode, firstLineCode);
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
    const measureText = isCircularShapeValue(payload.request_meta?.['REQ | Forma'])
        ? (payload.widthInches ? `Diámetro: ${payload.widthInches}"` : '')
        : `${payload.widthInches || ''}" x ${payload.lengthInches || ''}"`;
    const summaryItems = [
        ['Cliente', payload.customer_name],
        ['Contacto', payload.contact_name],
        ['Producto', payload.job_name],
        ['Forma', technical.shapesText || payload.request_meta?.['REQ | Forma'] || ''],
        ['Medida', technical.measuresText || measureText],
        ['Material', technical.materialsText || payload.material_name],
        ['Aplicación', technical.applicationsText || payload.applicationEnvironment || payload.applicationType],
        ['Tipo de Superficie', payload.surfaceType],
        ['Tipo de Salida', technical.placementsText || payload.outputType],
        ['Tipo de Etiquetado', payload.labelingType],
        ['SKU Cliente', payload.client_sku],
        ['Tintas', payload.no_print ? 'Sin impresión' : [payload.use_cmyk ? 'CMYK' : '', (payload.direct_colors || []).map((color) => color.nombre).join(', ')].filter(Boolean).join(' + ')],
        ['Insumos del Cliente', (payload.insumos_cliente || []).join(', ')],
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
    if (quoteRequestSubmitInFlight) return;
    quoteRequestSubmitInFlight = true;
    const busyButtons = [forAdvanced ? advancedButton : createButton, forAdvanced ? null : wizardPrintButton].filter(Boolean);
    try {
        const payload = validateQuickRequest(forAdvanced);
        await saveManualContactToPartner(customerContactSelect);
        const fingerprint = buildQuickRequestFingerprint(payload);
        const requestKey = buildQuickRequestKey(payload);
        busyButtons.forEach((button) => setButtonBusy(button, true, forAdvanced ? 'Preparando...' : 'Creando...'));
        setStatus(forAdvanced ? 'Preparando proceso avanzado...' : 'Creando solicitud...', 'saving');
        let draft = null;
        if (!forAdvanced
            && quoteRequestWizardState.previewQuoteCode
            && !quoteRequestWizardState.previewDirty
            && quoteRequestWizardState.previewFingerprint === fingerprint
        ) {
            draft = {
                quoteCode: quoteRequestWizardState.previewQuoteCode,
                firstLineCode: quoteRequestWizardState.previewFirstLineCode,
                quantities: payload.quantities
            };
        } else {
            if (quoteRequestWizardState.previewQuoteCode) {
                await deleteQuickQuoteDraft(quoteRequestWizardState.previewQuoteCode);
            }
            draft = await createQuickQuoteDraft(payload, { status: forAdvanced ? 'Borrador' : 'Solicitada', requestKey });
        }
        const { quoteCode, quantities, firstLineCode } = draft;
        quoteRequestWizardState.keepPreviewQuote = true;
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
        quoteRequestSubmitInFlight = false;
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
    syncTroquelTriggerDisplay();
    loadVarnishMaterialOptions().catch(() => {});
    loadStampingOptions().catch(() => {});
    loadLaminadoOptions().catch(() => {});
    loadOutputTypeOptions().catch(() => {});
    loadDirectColorSources().catch(() => {});
    syncInkGroupState();
    updateQuickRequestWizard();
    setTimeout(() => customerNameInput?.focus(), 30);
}

function closePopover(force = false) {
    if (!force && formHasContent()) {
        const confirmed = window.confirm('Hay datos sin guardar. Quieres cerrar?');
        if (!confirmed) return;
    }
    const previewQuoteCode = quoteRequestWizardState.previewQuoteCode;
    const keepPreviewQuote = quoteRequestWizardState.keepPreviewQuote;
    if (previewQuoteCode && !keepPreviewQuote) {
        deleteQuickQuoteDraft(previewQuoteCode).catch((error) => console.error('No fue posible eliminar la cotización temporal.', error));
    }
    popover.hidden = true;
    if (processLauncherStack) processLauncherStack.classList.remove('is-active');
    if (launcherErrors) launcherErrors.hidden = true;
    hideInlinePanels();
    toggleShapePickerPanel(false);
    resetFormState();
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function openNewCalcPopover(prefill) {
    if (!newCalcPopover) return;
    newCalcForm?.reset();
    if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
    resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
    setNewCalcStatus('');
    toggleNewCalcFrontBackFields();
    newCalcPopover.hidden = false;
    if (prefill?.code) {
        applyNewCalcPartnerSelection(prefill.code, prefill.name || '');
        setTimeout(() => newCalcContactSelect?.focus(), 30);
    } else {
        setTimeout(() => newCalcCustomerNameInput?.focus(), 30);
    }
}

function checkAutoOpenNewCalcFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('nuevoCalculoClienteCodigo');
    if (!code) return;
    const name = params.get('nuevoCalculoClienteNombre') || '';
    openNewCalcPopover({ code, name });
    params.delete('nuevoCalculoClienteCodigo');
    params.delete('nuevoCalculoClienteNombre');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
}

function toggleNewCalcFrontBackFields() {
    const selected = newCalcFormatRadios.find((r) => r.checked)?.value || 'simple';
    const isFrontBack = selected === 'frente_dorso';
    if (newCalcFrontBackFields) newCalcFrontBackFields.hidden = !isFrontBack;
    if (!isFrontBack) {
        if (newCalcFrenteNombreInput) newCalcFrenteNombreInput.value = '';
        if (newCalcDorsoNombreInput) newCalcDorsoNombreInput.value = '';
    }
}

function closeNewCalcPopover(force = false) {
    if (!newCalcPopover) return;
    const hasContent = normalizeText(newCalcCustomerNameInput?.value) || normalizeText(newCalcContactSelect?.value) || normalizeText(newCalcManualContactName?.value) || normalizeText(newCalcFrenteNombreInput?.value) || normalizeText(newCalcDorsoNombreInput?.value);
    if (!force && hasContent && !window.confirm('Hay datos sin guardar. ¿Quieres cerrar?')) return;
    newCalcPopover.hidden = true;
    newCalcForm?.reset();
    if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
    resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
    if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
    toggleNewCalcFrontBackFields();
    setNewCalcStatus('');
}

async function submitNewCalculation() {
    const customerName = normalizeText(newCalcCustomerNameInput?.value);
    const customerCode = normalizeText(newCalcCustomerCodeInput?.value);
    const contact = selectedContactPayload(newCalcContactSelect);
    const format = newCalcFormatRadios.find((r) => r.checked)?.value || 'simple';
    const frenteNombre = normalizeText(newCalcFrenteNombreInput?.value);
    const dorsoNombre = normalizeText(newCalcDorsoNombreInput?.value);
    newCalcForm?.querySelectorAll('.is-invalid').forEach((item) => item.classList.remove('is-invalid'));
    const errors = [];
    if (!customerName || !customerCode) {
        newCalcCustomerNameInput?.classList.add('is-invalid');
        errors.push('Cliente');
    }
    if (!contact.contact_name) {
        newCalcContactSelect?.classList.add('is-invalid');
        newCalcManualContactName?.classList.add('is-invalid');
        errors.push('Contacto');
    }
    if (format === 'frente_dorso') {
        if (!frenteNombre) {
            newCalcFrenteNombreInput?.classList.add('is-invalid');
            errors.push('Nombre Frente');
        }
        if (!dorsoNombre) {
            newCalcDorsoNombreInput?.classList.add('is-invalid');
            errors.push('Nombre Dorso');
        }
    }
    if (errors.length) {
        throw new Error(`Faltan: ${errors.join(', ')}.`);
    }
    await saveManualContactToPartner(newCalcContactSelect);
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
        const basePayload = {
            customer_code: customerCode,
            customer_name: customerName,
            contact_name: contact.contact_name,
            email: contact.email,
            phone: contact.phone,
            salesperson_name: currentUserName(),
            department: 'Flexografia',
            process_type: 'Convencional',
            status: 'Borrador',
            request_meta: {
                'REQ | Cliente Contacto': contact.contact_name,
                'TRAZABILIDAD | ORIGEN': 'Cálculo manual'
            }
        };
        if (format === 'frente_dorso') {
            setNewCalcStatus('Creando grupo frente/dorso...', 'saving');
            const groupLineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader() },
                body: JSON.stringify({ ...basePayload, job_name: '' })
            });
            const groupLineCode = groupLineResponse?.linea?.line_code || groupLineResponse?.calculo?.line_code || '';
            if (!groupLineCode) throw new Error('La línea grupo se creó sin código.');
            setNewCalcStatus('Creando línea frente...', 'saving');
            const frenteLineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader() },
                body: JSON.stringify({ ...basePayload, job_name: frenteNombre })
            });
            const frenteLineCode = frenteLineResponse?.linea?.line_code || frenteLineResponse?.calculo?.line_code || '';
            if (!frenteLineCode) throw new Error('La línea frente se creó sin código.');
            setNewCalcStatus('Creando línea dorso...', 'saving');
            const dorsoLineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader() },
                body: JSON.stringify({ ...basePayload, job_name: dorsoNombre })
            });
            const dorsoLineCode = dorsoLineResponse?.linea?.line_code || dorsoLineResponse?.calculo?.line_code || '';
            if (!dorsoLineCode) throw new Error('La línea dorso se creó sin código.');
            setNewCalcStatus('Vinculando frente/dorso...', 'saving');
            const groupResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/frente-dorso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader() },
                body: JSON.stringify({
                    groupLineCode,
                    elementLineCodes: [frenteLineCode, dorsoLineCode],
                    label: `${frenteNombre} / ${dorsoNombre}`
                })
            });
            if (!groupResponse?.ok) throw new Error('No se pudo vincular frente/dorso.');
            await loadQuotes();
            closeNewCalcPopover(true);
            const route = `/calculo-flexografia?${new URLSearchParams({
                lineId: groupLineCode,
                quoteId: quoteCode,
                productId: '',
                department: 'Flexografia'
            }).toString()}`;
            if (!openRouteInShell(route, `Cálculo ${groupLineCode}`)) {
                window.location.href = route;
            }
        } else {
            const lineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader() },
                body: JSON.stringify({ ...basePayload, job_name: '' })
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
    document.getElementById('quotesQuickFilterRow')?.addEventListener('click', (event) => {
        const btn = event.target.closest('.quote-quickfilter-btn');
        if (!btn) return;
        setQuotesQuickFilter(btn.dataset.quickFilter);
    });
    rowsBody?.closest('table')?.querySelector('thead')?.addEventListener('click', (event) => {
        const th = event.target.closest('th[data-sort-key]');
        if (!th) return;
        const key = th.dataset.sortKey;
        if (quoteSortState.key === key) {
            quoteSortState.dir = quoteSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            quoteSortState.key = key;
            quoteSortState.dir = 'asc';
        }
        loadQuotes().catch((error) => setStatus(error.message, 'error'));
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
    newCalcFormatRadios.forEach((radio) => {
        radio.addEventListener('change', toggleNewCalcFrontBackFields);
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
        if (!event.target.closest('#nuevoClienteNombre') && !event.target.closest('#quoteCustomerLookupPanel')) {
            if (customerLookupPanel) customerLookupPanel.hidden = true;
        }
        if (!event.target.closest('.quote-request-product-type-wrap') && !event.target.closest('#requestProductTypePanel')) {
            toggleRequestProductTypePanel(false);
        }
        if (!event.target.closest('[data-inline-suggestions="material"]') && !event.target.closest('#materialSuggestions')
            && !event.target.closest('[data-inline-suggestions="surface"]') && !event.target.closest('#surfaceSuggestions')
            && !event.target.closest('[data-inline-suggestions="surface-type"]') && !event.target.closest('#surfaceTypeSuggestions')) {
            if (materialSuggestions) materialSuggestions.hidden = true;
            if (surfaceSuggestions) surfaceSuggestions.hidden = true;
            if (surfaceTypeSuggestions) surfaceTypeSuggestions.hidden = true;
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
            runQuoteActionWithFeedback(portalLineAction, row, () => handleQuoteLineAction(portalLineAction.dataset.lineAction, row))
                .catch((error) => setStatus(error.message, 'error'));
            return;
        }
        if (!event.target.closest('[data-line-menu-id]') && !event.target.closest('.quote-line-menu-panel')) {
            closeQuoteLineMenus();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (customerLookupPanel) customerLookupPanel.hidden = true;
        if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
        hideInlinePanels();
        toggleFixedSizePanel(false);
        toggleRequestProductTypePanel(false);
        toggleShapePickerPanel(false);
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
        if (event.target === requestOutputTypeSelect) {
            getOutputTypeField()?.classList.remove('is-invalid');
            syncOutputTypePreview();
        }
        if (event.target === requestNoPrintInput || event.target === requestUseCmykInput) {
            syncInkGroupState();
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
        showManualContactPanel(customerContactSelect, 'Ingresa el nombre del contacto para continuar.');
        searchPartners(e.target.value).catch(console.error);
    });
    customerNameInput?.addEventListener('focus', () => {
        searchPartners('').catch(console.error);
    });
    customerNameInput?.addEventListener('blur', () => {
        setTimeout(() => {
            if (customerLookupPanel?.contains(document.activeElement)) return;
            if (customerLookupPanel) customerLookupPanel.hidden = true;
        }, 120);
    });
    customerContactSelect?.addEventListener('change', () => customerContactSelect.classList.remove('is-invalid'));
    newCalcCustomerNameInput?.addEventListener('input', (event) => {
        if (newCalcCustomerCodeInput) newCalcCustomerCodeInput.value = '';
        resetContactSelect(newCalcContactSelect, 'Selecciona un cliente');
        showManualContactPanel(newCalcContactSelect, 'Ingresa el nombre del contacto para continuar.');
        searchNewCalcPartners(event.target.value).catch((error) => {
            if (error.name !== 'AbortError') setNewCalcStatus(error.message, 'error');
        });
    });
    newCalcCustomerNameInput?.addEventListener('focus', () => {
        searchNewCalcPartners('').catch((error) => {
            if (error.name !== 'AbortError') setNewCalcStatus(error.message, 'error');
        });
    });
    newCalcCustomerNameInput?.addEventListener('blur', () => {
        setTimeout(() => {
            if (newCalcCustomerLookupPanel?.contains(document.activeElement)) return;
            if (newCalcCustomerLookupPanel) newCalcCustomerLookupPanel.hidden = true;
        }, 120);
    });
    newCalcContactSelect?.addEventListener('change', () => newCalcContactSelect.classList.remove('is-invalid'));
    window.addEventListener('resize', () => {
        positionCustomerLookupPanel();
        positionNewCalcCustomerLookupPanel();
        positionRequestProductTypePanel();
        positionFixedSizePanel();
        positionMaterialSuggestionsPanel();
        positionSurfacePanels();
        positionShapePickerPanel();
        positionDirectColorMenu();
        renderRequestQuantityRepeater();
    });
    window.addEventListener('scroll', () => {
        positionCustomerLookupPanel();
        positionNewCalcCustomerLookupPanel();
        positionRequestProductTypePanel();
        positionFixedSizePanel();
        positionMaterialSuggestionsPanel();
        positionSurfacePanels();
        positionShapePickerPanel();
        positionDirectColorMenu();
    }, true);
    customerLookupResults?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) applyPartnerSelection(item.dataset.partnerCode, item.dataset.partnerName);
    });
    newCalcCustomerLookupResults?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) applyNewCalcPartnerSelection(item.dataset.partnerCode, item.dataset.partnerName);
    });
    requestTroquelTrigger?.addEventListener('click', () => openTroquelCatalogModal().catch(() => {}));
    document.getElementById('requestTroquelAddButton')?.addEventListener('click', () => openTroquelCatalogModal().catch(() => {}));
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
        syncCustomSizeUnitMasks();
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
    materialInput?.addEventListener('focus', () => showMaterialSuggestions(''));
    materialSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            materialInput.value = item.dataset.value;
            materialInput.dataset.materialCode = item.dataset.code || '';
            hideInlinePanels();
            invalidateQuickRequestPreview();
        }
    });

    surfaceInput?.addEventListener('input', () => showSurfaceSuggestions());
    surfaceInput?.addEventListener('focus', () => showSurfaceSuggestions(''));
    surfaceSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            surfaceInput.value = item.dataset.value;
            hideInlinePanels();
            invalidateQuickRequestPreview();
        }
    });
    surfaceTypeInput?.addEventListener('input', () => showSurfaceTypeSuggestions());
    surfaceTypeInput?.addEventListener('focus', () => showSurfaceTypeSuggestions(''));
    surfaceTypeSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            surfaceTypeInput.value = item.dataset.value;
            hideInlinePanels();
            invalidateQuickRequestPreview();
        }
    });
    requestReferenciaSearchBtn?.addEventListener('click', () => { openRequestReferenciaModal().catch(() => {}); });
    requestReferenciaInput?.addEventListener('input', () => { syncReferenciaChangesVisibility(); });
    requestDirectColorInput?.addEventListener('input', () => { showDirectColorMenu(requestDirectColorInput.value); });
    requestDirectColorInput?.addEventListener('focus', () => { showDirectColorMenu(requestDirectColorInput.value); });
    requestDirectColorInput?.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); moveDirectColorActive(1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); moveDirectColorActive(-1); }
        else if (event.key === 'Enter') { event.preventDefault(); commitDirectColorFromInput(); }
        else if (event.key === 'Escape') { hideDirectColorMenu(); }
    });
    requestDirectColorAdd?.addEventListener('click', () => { commitDirectColorFromInput(); });
    requestDirectColorMenu?.addEventListener('click', (event) => {
        const option = event.target.closest('.quote-request-color-option');
        if (!option) return;
        addDirectColor(option.dataset.directColorName, option.dataset.directColorHex || '', option.dataset.directColorOrigin || 'Manual');
    });
    requestDirectColorList?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-direct-color]');
        if (!button) return;
        removeDirectColor(Number(button.dataset.removeDirectColor));
    });
    document.addEventListener('click', (event) => {
        if (!requestDirectColorMenu || requestDirectColorMenu.hidden) return;
        if (event.target.closest('.quote-request-color-field, .quote-request-color-menu')) return;
        hideDirectColorMenu();
    });
    customWidthInput?.addEventListener('input', () => {
        if (isCircularRequestShape() && customHeightInput) customHeightInput.value = customWidthInput.value;
        syncCustomSizeUnitMasks();
        invalidateQuickRequestPreview();
    });
    customHeightInput?.addEventListener('input', () => {
        syncCustomSizeUnitMasks();
        invalidateQuickRequestPreview();
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

        const jumpLineLink = e.target.closest('[data-jump-line-code]');
        if (jumpLineLink) {
            e.preventDefault();
            e.stopPropagation();
            const jumpCode = jumpLineLink.dataset.jumpQuote;
            const jumpLine = jumpLineLink.dataset.jumpLineCode;
            if (!jumpCode || !jumpLine) return;
            const revealLine = () => {
                const target = [...quoteLineLookup.values()].find((row) => String(row.quoteId) === String(jumpCode)
                    && (String(row.linea) === String(jumpLine) || String(row.originalLinea) === String(jumpLine)));
                if (!target) return;
                const card = rowsBody.querySelector(`.quote-master-line[data-line-id="${target.id}"]`);
                if (!card) return;
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('is-line-flash');
                setTimeout(() => card.classList.remove('is-line-flash'), 1600);
            };
            if (expandedQuoteCodes.has(jumpCode)) {
                requestAnimationFrame(revealLine);
                return;
            }
            selectedQuoteContextCode = jumpCode;
            selectedQuoteContextLineId = 0;
            expandedQuoteCodes.add(jumpCode);
            renderQuotesTable(getFilteredQuotes());
            fetchQuoteLines(jumpCode)
                .then(() => {
                    renderQuotesTable(getFilteredQuotes());
                    requestAnimationFrame(revealLine);
                })
                .catch((error) => setStatus(error.message, 'error'));
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
            runQuoteActionWithFeedback(proformaButton, null, () => openProformaIfReady(code))
                .catch((error) => setStatus(error.message, 'error'));
            return;
        }
        // Add line button
        const addLineButton = e.target.closest('[data-add-line]');
        if (addLineButton) {
            const code = addLineButton.dataset.addLine;
            if (!code) return;
            runQuoteActionWithFeedback(addLineButton, null, () => createQuoteLineAndOpenCalculation(code))
                .catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const abrirOrdenLink = e.target.closest('[data-open-order]');
        if (abrirOrdenLink) {
            e.preventDefault();
            e.stopPropagation();
            const codigoOrden = abrirOrdenLink.dataset.openOrder;
            if (!codigoOrden) return;
            const route = '/orden-produccion/' + encodeURIComponent(codigoOrden);
            if (!openRouteInShell(route, 'Orden ' + codigoOrden)) window.location.href = route;
            return;
        }
        const abrirProductoLink = e.target.closest('[data-open-product]');
        if (abrirProductoLink) {
            e.preventDefault();
            e.stopPropagation();
            const codigoProducto = abrirProductoLink.dataset.openProduct;
            if (!codigoProducto) return;
            const route = '/producto-documento?codigo=' + encodeURIComponent(codigoProducto);
            if (!openRouteInShell(route, 'Producto ' + codigoProducto)) window.location.href = route;
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
            runQuoteActionWithFeedback(lineActionButton, row, () => handleQuoteLineAction(lineActionButton.dataset.lineAction, row))
                .catch((error) => setStatus(error.message, 'error'));
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
    await Promise.all([loadConfig(), loadTrackingUserPhotos(), loadQuotes(), loadSmartCatalogs()]);
    updateQuotesQuickFilterButtons();
    checkAutoOpenNewCalcFromUrl();

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

    const clearLineDraggable = () => {
        rowsBody.querySelectorAll('.quote-master-line[draggable="true"]').forEach((el) => {
            el.draggable = false;
        });
    };

    // La línea solo es arrastrable mientras se presiona su asa de reordenamiento;
    // el resto del tiempo permanece no-arrastrable para poder seleccionar y copiar su texto.
    rowsBody.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.quote-master-line-order');
        if (!handle) return;
        const article = handle.closest('.quote-master-line');
        if (article) article.draggable = true;
    });
    document.addEventListener('mouseup', clearLineDraggable);

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
            el.draggable = false;
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
