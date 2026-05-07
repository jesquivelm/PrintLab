const CONFIG_ENDPOINT = '/api/config/general';
const QUOTES_ENDPOINT = '/api/cotizaciones';
const SMART_CATALOGS_ENDPOINT = '/api/cotizaciones-inteligentes/catalogos';
const PARTNERS_ENDPOINT = '/api/socios';
const SESSION_STORAGE_KEY = 'erp-user-session';
const LAUNCHER_POSITION_KEY = 'quote-request-launcher-position-v2';
const DEFAULT_ICON_MAP = {
    processLauncher: { value: '/assets/icons/exclusive-launcher.png', color: '#1e516d', size: 48 },
    quoteRequestSubmit: { value: 'âž¤', color: '#ffffff', size: 18 },
    quoteRequestAdvanced: { value: 'âš™', color: '#5f7288', size: 18 },
    quoteRequestAttachment: { value: 'â—‰', color: '#1e516d', size: 18 },
    quoteRequestRecord: { value: 'â—', color: '#1e516d', size: 18 },
    quoteRequestRecordStop: { value: 'â– ', color: '#ef4444', size: 18 },
    quoteRequestAttachmentDelete: { value: 'X', color: '#b94848', size: 18 },
    // New keys for premium sync
    crearCotizacion: { value: 'âž¤', color: '#1e516d', size: 24 },
    procesoAvanzadoFlotante: { value: 'âš™', color: '#5f7288', size: 20 },
    proformaView: { value: 'ðŸ‘', color: '#1e516d', size: 18 },
    proformaClose: { value: 'âœ“', color: '#1e516d', size: 18 }
};
const STATIC_MATERIALS = [
    'OPP Blanco',
    'OPP Transparente',
    'Papel Couche',
    'Papel Térmico',
    'Papel Transfer',
    'PET Blanco',
    'PET Transparente',
    'Vinil Blanco',
    'Vinil Transparente'
];
const DEFAULT_SURFACES = ['Botella', 'Caja', 'Carton', 'Envase', 'Frasco', 'Pouch', 'Tapa', 'Vidrio'];
const DEFAULT_PRODUCT_TYPES = ['Etiquetas', 'Cinta Continua', 'Empaque Flexible', 'Código de Barras', 'Números de Carrera'];

const rowsBody = document.getElementById('quotesTableBody');
const quotesTableWrap = document.querySelector('.quote-browser-table-wrap');
const quotesScrollBottomIndicator = document.getElementById('quotesScrollBottomIndicator');
const quotesSearchInput = document.getElementById('quotesSearchInput');
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
const customerLookupPanel = document.getElementById('quoteCustomerLookupPanel');
const customerLookupResults = document.getElementById('quoteCustomerLookupResults');
const fixedSizeSelect = document.getElementById('requestFixedSize');
const materialInput = document.getElementById('requestMaterial');
const materialSuggestions = document.getElementById('materialSuggestions');
const surfaceInput = document.getElementById('requestSurface');
const surfaceSuggestions = document.getElementById('surfaceSuggestions');
const requestProductTypeSelect = document.getElementById('requestProductType');
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
const numberingRangeStartInput = document.getElementById('numberingRangeStart');
const numberingRangeEndInput = document.getElementById('numberingRangeEnd');
const numberingDetailInput = document.getElementById('numberingDetail');
const numberingAttachmentInput = document.getElementById('numberingAttachmentInput');
const numberingAttachmentMeta = document.getElementById('numberingAttachmentMeta');
const attachmentsInput = document.getElementById('requestAttachments');
const attachmentsPreview = document.getElementById('requestAttachmentsPreview');
const attachmentPreviewModal = document.getElementById('attachmentPreviewModal');
const attachmentPreviewTitle = document.getElementById('attachmentPreviewTitle');
const attachmentPreviewContent = document.getElementById('attachmentPreviewContent');
const attachmentPreviewClose = document.getElementById('attachmentPreviewClose');
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
    return session ? { 'x-erp-session': JSON.stringify(session) } : {};
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
const quoteLineCache = new Map();
const quoteLineLoading = new Set();
const quoteLineLookup = new Map();
let selectedQuoteContextCode = '';
let selectedQuoteContextLineId = 0;
let partnerLookupAbort = null;
let materialItems = STATIC_MATERIALS.map((name) => ({ code: '', name }));
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

function renderRequestQuantityRepeater(values = null) {
    if (!requestQuantityRepeater) return;
    const source = Array.isArray(values) ? values : readRequestedQuantities();
    const normalized = source
        .map((value) => parseRequestedQuantityValue(value))
        .filter((value) => value > 0)
        .slice(0, 6);
    if (!normalized.length) normalized.push(0);

    // Clear and set container styles directly — no external CSS dependency
    requestQuantityRepeater.innerHTML = '';
    requestQuantityRepeater.style.cssText = 'display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;gap:6px;width:100%;overflow:visible;';

    normalized.forEach((value, index) => {
        const isLast = index === normalized.length - 1;
        const hasValue = value > 0;

        // Input
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.dataset.requestQuantityIndex = String(index);
        input.setAttribute('aria-label', `Cantidad ${index + 1}`);
        input.placeholder = '999 999';
        input.value = hasValue ? formatNumber(value) : '';
        input.style.cssText = 'width:110px;min-width:110px;max-width:110px;height:36px;padding:6px 10px;border:1px solid #c9d6e2;border-radius:10px;background:#fff;color:#17354a;font:inherit;font-size:13px;text-align:center;font-variant-numeric:tabular-nums;box-sizing:border-box;flex-shrink:0;';
        requestQuantityRepeater.appendChild(input);

        // Add button — only on last field, only if it has a value, and max 6
        if (isLast && hasValue && normalized.length < 6) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.dataset.addRequestQuantity = 'true';
            addBtn.setAttribute('aria-label', 'Agregar cantidad');
            addBtn.title = 'Agregar cantidad';
            addBtn.textContent = '+';
            addBtn.style.cssText = 'width:32px;min-width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#1e6fa8;font-size:20px;font-weight:700;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;';
            addBtn.addEventListener('mouseenter', () => { addBtn.style.color = '#0b81b8'; });
            addBtn.addEventListener('mouseleave', () => { addBtn.style.color = '#1e6fa8'; });
            requestQuantityRepeater.appendChild(addBtn);
        }

        // Delete button — only on last field, only if more than 1 field
        if (isLast && normalized.length > 1) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.dataset.removeRequestQuantity = 'true';
            delBtn.setAttribute('aria-label', 'Eliminar ultima cantidad');
            delBtn.title = 'Eliminar ultima cantidad';
            delBtn.textContent = 'x';
            delBtn.style.cssText = 'width:32px;min-width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#a74343;font-size:22px;font-weight:400;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;';
            delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#d03535'; });
            delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#a74343'; });
            requestQuantityRepeater.appendChild(delBtn);
        }
    });
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

function getSelectedNumberingValue() {
    return form?.querySelector('input[name="numbering"]:checked')?.value || '';
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
            title: 'Sin numeración configurada',
            detail: 'Haz clic en “Numeración” para definir tipo, rango y adjunto Excel.'
        };
    }
    const from = normalizeText(numberingRangeStartInput?.value);
    const to = normalizeText(numberingRangeEndInput?.value);
    const detail = normalizeText(numberingDetailInput?.value);
    const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const fragments = [];
    if (from || to) fragments.push(`Rango ${from || '...'} a ${to || '...'}`);
    if (detail) fragments.push(detail);
    if (attachmentIndex >= 0) fragments.push(`Adjunto: ${pendingAttachments[attachmentIndex]?.fileName || 'Excel cargado'}`);
    return {
        title: numberingType,
        detail: fragments.join(' · ') || 'Configuración lista para cotizar.'
    };
}

function renderNumberingSummary() {
    if (!numberingSummary) return;
    const summary = buildNumberingSummaryText();
    numberingSummary.innerHTML = `<strong>${escapeHtml(summary.title)}</strong><span>${escapeHtml(summary.detail)}</span>`;
    if (numberingAttachmentMeta) {
        const attachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
        numberingAttachmentMeta.textContent = attachmentIndex >= 0
            ? `Archivo cargado: ${pendingAttachments[attachmentIndex]?.fileName || 'Excel adjunto'}`
            : 'Puedes adjuntar un Excel o CSV con la secuencia.';
    }
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

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible completar la solicitud.');
    }
    return payload;
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
        sapStatusNote.textContent = `${config.lastSyncMessage || 'Configuracion lista.'} Ultimo cierre: ${lastSync}.`;
    }
    if (sapLocalCounts) {
        sapLocalCounts.innerHTML = [
            ['Socios', counts.businessPartners || 0],
            ['Articulos', counts.items || 0],
            ['Bodegas', counts.warehouses || 0],
            ['Ordenes', counts.orders || 0],
            ['Facturas', counts.invoices || 0]
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
    const route = entity === 'inventory-exit' ? '/api/sap/inventory/exit' : `/api/sap/${entity}`;
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

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
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

function iconConfigFor(key, canonicalKey = null) {
    const icons = loadedConfig?.icons || {};
    const general = loadedConfig?.general || {};
    const propKey = canonicalKey || key;
    
    const internalKey = key.replace(/\s+/g, '').replace(/[Ã¡Ã©Ã­Ã³Ãº]/g, (m) => ({ 'Ã¡': 'a', 'Ã©': 'e', 'Ã­': 'i', 'Ã³': 'o', 'Ãº': 'u' }[m]));
    const fallback = DEFAULT_ICON_MAP[key] || DEFAULT_ICON_MAP[internalKey] || DEFAULT_ICON_MAP[propKey] || { value: '', color: '#6b7580', size: 24 };
    
    const value = normalizeText(icons[key]) || fallback.value;
    const suffix = propKey.charAt(0).toUpperCase() + propKey.slice(1).replace(/\s+/g, '');
    const color = general[`iconColor${suffix}`] || fallback.color;
    const size = Number(general[`iconSize${suffix}`]) || fallback.size;
    return { value, color, size };
}

function getResolvedIcon(keys, canonicalKey) {
    for (const key of keys) {
        const icons = loadedConfig?.icons || {};
        if (icons[key]) return iconConfigFor(key, canonicalKey);
    }
    return iconConfigFor(canonicalKey || keys[keys.length - 1]);
}

function applyConfiguredIcons() {
    const primaryConf = iconConfigFor('processLauncher');
    
    // Check multiple potential keys for each action, using a canonical key for properties
    const submitConf = getResolvedIcon(['crear cotizaciÃ³n', 'crear cotizacion', 'solicitud de cotizaciÃ³n', 'solicitud de cotizacion', 'quoteRequestSubmit'], 'quoteRequestSubmit');
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
    const qtyAddConf = getResolvedIcon(['icons.quantity.add', 'quantityAdd', 'tableAdd'], 'quantityAdd');
    const qtyDelConf = getResolvedIcon(['icons.quantity.delete', 'lineDelete', 'loginRepositoryDelete'], 'lineDelete');
    document.querySelectorAll('[data-qty-icon="add"]').forEach((span) => {
        if (qtyAddConf.value) {
            span.parentElement.style.color = qtyAddConf.color || '#1e6fa8';
            renderIcon(span, qtyAddConf.value, qtyAddConf.color || '#1e6fa8', qtyAddConf.size || 18);
        }
    });
    document.querySelectorAll('[data-qty-icon="delete"]').forEach((span) => {
        if (qtyDelConf.value) {
            span.parentElement.style.color = qtyDelConf.color || '#a74343';
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
    const autoSelection = raw.CODEX_AUTO_SELECTION || {};
    const autoWarnings = Array.isArray(autoSelection.warnings)
        ? autoSelection.warnings.filter(Boolean)
        : String(raw['REQ | Advertencias Automáticas'] || '')
            .split('|')
            .map((item) => normalizeText(item))
            .filter(Boolean);
    const fallbackTotal = pickFirstMeaningfulNumber(
        line.subtotal_1,
        line.total_cost,
        raw['PRECIO TOTAL AL FINALIZAR'],
        raw['GENERAL | 9 | TOTAL | DOL'],
        raw['GENERAL | 7 | TOTAL | DOL'],
        raw['GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS']
    );
    return {
        id: quoteTreeLineSequence,
        quoteId: quoteCode || line.quote_code || '',
        linea: line.line_code || '',
        originalLinea: line.line_code || '',
        lineOrder: Number(line.line_order) || index + 1,
        departamento: line.department || 'Flexografia',
        nombreTrabajo: line.job_name || 'Nuevo cálculo',
        material: line.material_name || '',
        materialCode: line.material_code || raw['Material Convencional | Id Material'] || raw['Material Digital | Id Material'] || '',
        medida: [raw['DIMENSIONES ETIQUETA | ANCHO'], raw['DIMENSIONES ETIQUETA | LARGO']].filter((value) => value || value === 0).join(' x '),
        machineName: line.machine_name || raw['CONV | MAQUINA'] || raw['DIGITAL | MAQUINA'] || '',
        processType: line.process_type || raw['Proceso Productivo'] || '',
        processSequenceText: raw['CODEX_PROCESS_SEQUENCE_TEXT'] || raw['BOT | Process Sequence'] || '',
        estado: line.status || raw['SOLICITUD ESTADO'] || raw['ESTADO LINEA'] || 'Borrador',
        finalizadaOrden: Boolean(line.finalized_for_order || raw['CODEX_FINALIZED_FOR_ORDER']),
        subtotal1: fallbackTotal ?? '',
        productId: line.product_code || '',
        quantity: pickFirstMeaningfulNumber(line.quantity, raw['Cantidad Productos']),
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

function quoteTreeLineTitle(row) {
    return [
        row.nombreTrabajo || 'Nuevo cálculo',
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
    const name = row.nombreTrabajo || 'Sin nombre';
    const material = row.material || '';
    return [name, material].filter(Boolean).join(' · ');
}

function buildLineMeta(row) {
    const parts = [];
    if (row.linea) parts.push(row.linea);
    if (row.quantity) parts.push(`Cantidad ${formatNumber(row.quantity)}`);
    if (row.processSequenceText) parts.push(row.processSequenceText);
    else if (row.processType) parts.push(row.processType);
    if (row.medida) parts.push(row.medida);
    if (row.machineName) parts.push(row.machineName);
    if (row.materialCode) parts.push(row.materialCode);
    return parts.filter(Boolean).join(' · ');
}

function renderAutoSelectionSummary(row) {
    const summaryItems = [
        row.autoRoute ? `Ruta ${row.autoRoute}` : '',
        row.autoMaterialFamily ? `Familia ${row.autoMaterialFamily}` : '',
        row.autoMaterialCode ? `Material ${row.autoMaterialCode}` : '',
        row.autoMachineName ? `Máquina ${row.autoMachineName}` : '',
        row.autoDieCode ? `Troquel ${row.autoDieCode}` : (row.autoRoute ? 'Troquel estimado/no requerido' : ''),
        row.autoLabelsPerRoll ? `${formatNumber(row.autoLabelsPerRoll)} etiq./rollo` : ''
    ].filter(Boolean);
    const warningMarkup = (row.autoWarnings || []).slice(0, 3).map((warning) => `
        <div class="quote-line-auto-warning">${escapeHtml(warning)}</div>
    `).join('');
    return `
        <div class="quote-line-auto-block">
            ${summaryItems.length ? `<div class="quote-line-auto-summary">${summaryItems.map((item) => `<span class="quote-line-auto-chip">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
            ${row.autoMountingSummary ? `<div class="quote-line-auto-mounting">${escapeHtml(row.autoMountingSummary)}</div>` : ''}
            ${row.autoTechnicalComment ? `<div class="quote-line-auto-comment">${escapeHtml(row.autoTechnicalComment)}</div>` : ''}
            ${warningMarkup ? `<div class="quote-line-auto-warnings">${warningMarkup}</div>` : ''}
        </div>
    `;
}

function lineMenuIconConfig(key, fallbackValue, fallbackColor = '#46515d', fallbackSize = 18) {
    const iconKeyMap = {
        duplicate: ['lineDuplicate'],
        copy: ['lineCopy'],
        product: ['lineCreateProduct', 'dashboardProducts'],
        createQuote: ['lineCreateQuote'],
        export: ['lineExport'],
        attachments: ['lineAttachments'],
        delete: ['lineDelete', 'loginRepositoryDelete', 'adminUserDelete']
    };
    const canonicalMap = {
        duplicate: 'lineDuplicate',
        copy: 'lineCopy',
        product: 'lineCreateProduct',
        createQuote: 'lineCreateQuote',
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

// Drag state for line reordering
let lineDragState = null;
let lineDragDropInitialized = false;

function renderQuoteLineCard(row, index, totalLines) {
    quoteLineLookup.set(row.id, row);
    const lineTitle = buildLineTitle(row, index);
    const lineMeta = buildLineMeta(row);
    const openConf = getResolvedIcon(['browserOpen', 'tableOpen'], 'tableOpen');
    const openColor = loadedConfig?.general?.iconColorBrowserOpen || loadedConfig?.general?.iconColorTableOpen || '#0b81b8';
    const openHover = loadedConfig?.general?.iconColorHoverBrowserOpen || loadedConfig?.general?.iconColorHoverTableOpen || '#07638c';
    const openSize = Number(loadedConfig?.general?.iconSizeBrowserOpen || loadedConfig?.general?.iconSizeTableOpen) || openConf.size || 18;
    const canCreateProduct = canCreateModule('productos');
    return `
        <article class="quote-master-line" data-line-id="${row.id}" data-line-index="${index}" data-quote-id="${escapeHtml(row.quoteId)}" draggable="true">
            <div class="quote-master-line-order" title="Arrastrar para reordenar">
                <span class="quote-master-line-num">${index + 1}</span>
                <span class="quote-master-drag-handle" aria-hidden="true">&#8942;&#8942;</span>
            </div>
            <div class="quote-master-line-body">
                <div class="quote-master-line-title">${escapeHtml(lineTitle)}</div>
                ${lineMeta ? `<div class="quote-master-line-meta">${escapeHtml(lineMeta)}</div>` : ''}
                ${renderAutoSelectionSummary(row)}
            </div>
            <div class="quote-master-line-right">
                <span class="quote-master-line-total">${escapeHtml(formatMoney(row.subtotal1))}</span>
                <div class="quote-line-actions row-tools row-tools-row-end">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <button type="button" class="quote-line-icon-btn quote-line-edit-btn" data-line-action="edit" data-line-id="${row.id}" title="Editar cálculo" aria-label="Editar" style="--icon-color:${escapeHtml(openColor)};--icon-hover-color:${escapeHtml(openHover)};--config-icon-size:${escapeHtml(String(openSize))}px;">${iconMarkup(openConf.value, 'Editar cálculo', 'table-icon-media')}</button>
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <div class="quote-line-menu-wrap" data-line-menu-id="${row.id}">
                        <button type="button" class="quote-line-icon-btn quote-line-menu-trigger" data-line-menu-toggle="${row.id}" title="Más opciones" aria-label="Más opciones" aria-haspopup="true" aria-expanded="false">&#8942;</button>
                        <div class="quote-line-menu-panel" data-line-menu-panel="${row.id}" hidden>
                            <div class="row-action-menu-list">
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="duplicate" data-line-id="${row.id}">${lineMenuIconMarkup('duplicate', 'Duplicar Línea', '⎘')}<span>Duplicar Línea</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="copy" data-line-id="${row.id}">${lineMenuIconMarkup('copy', 'Copiar Línea a Otra Cotización', '⎘')}<span>Copiar Línea a Otra Cotización</span></button>
                                ${canCreateProduct ? `<button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-product" data-line-id="${row.id}">${lineMenuIconMarkup('product', 'Convertir en producto', '▣')}<span>Convertir en producto</span></button>` : ''}
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="create-quote" data-line-id="${row.id}">${lineMenuIconMarkup('createQuote', 'Crear nueva cotización a partir de esta línea', '▣')}<span>Crear nueva cotización a partir de esta línea</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="export" data-line-id="${row.id}">${lineMenuIconMarkup('export', 'Exportar Línea a Excel', '⭳')}<span>Exportar Línea a Excel</span></button>
                                <button type="button" class="row-action-menu-item quote-line-menu-item" data-line-action="attachments" data-line-id="${row.id}">${lineMenuIconMarkup('attachments', 'Ver Adjuntos', '📎')}<span>Ver Adjuntos</span></button>
                                <div class="row-action-menu-section-divider" aria-hidden="true"></div>
                                <button type="button" class="row-action-menu-item quote-line-menu-item is-toggle" data-line-action="finalize" data-line-id="${row.id}">
                                    <span class="row-action-menu-toggle"><span class="row-action-check ${row.finalizadaOrden ? 'is-checked' : ''}" aria-hidden="true"></span><span>${row.finalizadaOrden ? 'Desmarcar Finalizado' : 'Finalizar Cálculo'}</span></span>
                                </button>
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
    const footer = `
        <div class="quote-master-lines-footer">
            <button type="button" class="quote-line-action-btn quote-line-proforma-btn" data-print-proforma="${escapeHtml(quoteCode)}" title="Ver Proforma">
                <span class="quote-line-action-icon" aria-hidden="true">↓</span> Ver Proforma
            </button>
            ${canCreateQuoteLines ? `<button type="button" class="quote-line-action-btn quote-line-add-btn" data-add-line="${escapeHtml(quoteCode)}" title="Agregar línea de cálculo">
                <span class="quote-line-action-icon" aria-hidden="true">+</span> Agregar línea
            </button>` : ''}
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
    return `<div class="quote-master-lines">${lines.map((line, index) => renderQuoteLineCard(line, index, lines.length)).join('')}</div>${footer}`;
}

function renderQuoteParentRow(item) {
    const quoteCode = item.quote_code || '';
    const isExpanded = expandedQuoteCodes.has(quoteCode);
    const cachedLines = quoteLineCache.get(quoteCode) || [];
    const lineCount = Math.max(0, Number(item.line_count || cachedLines.length || 0));
    const total = cachedLines.length
        ? formatMoney(quoteTotalFromLines(cachedLines))
        : (lineCount > 0 ? formatMoney(item.quote_total) : '—');
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
    const vendor = item.salesperson_name || '';
    const createdOn = formatDate(item.created_on);
    const dueOn = formatDate(item.due_on);
    return `
        <tr class="quote-master-row ${isExpanded ? 'is-expanded' : ''}" data-quote-code="${escapeHtml(quoteCode)}">
            <td class="quote-master-td-toggle">
                <button type="button" class="quote-master-toggle" data-toggle-quote="${escapeHtml(quoteCode)}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="${isExpanded ? 'Contraer' : 'Expandir'} cotización">
                    <span class="quote-master-toggle-glyph" aria-hidden="true">&#9656;</span>
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
                    ${vendor ? `<span class="quote-master-info-sep">·</span><span class="quote-master-info-vendor">${escapeHtml(vendor)}</span>` : ''}
                </div>
            </td>
            <td class="quote-master-td-date">${escapeHtml(createdOn)}</td>
            <td class="quote-master-td-date">${escapeHtml(dueOn)}</td>
            <td class="quote-master-td-total">${escapeHtml(total)}</td>
            <td class="quote-master-td-actions">
                <div class="quote-browser-actions row-tools row-tools-row-end">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <button type="button" class="browser-open-link" data-open-quote="${escapeHtml(quoteCode)}" aria-label="Abrir cotizacion" title="Abrir cotización" style="--icon-color:${escapeHtml(openColor)};--icon-hover-color:${escapeHtml(openHover)};--config-icon-size:${escapeHtml(String(openSize))}px;">${iconMarkup(openConf.value, 'Abrir cotizacion', 'table-icon-media')}</button>
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <button type="button" class="browser-open-link browser-open-link-danger" data-delete-quote="${escapeHtml(quoteCode)}" aria-label="Eliminar cotizacion" title="Eliminar cotización" style="--icon-color:${escapeHtml(deleteColor)};--icon-hover-color:${escapeHtml(deleteHover)};--config-icon-size:${escapeHtml(String(deleteSize))}px;">${iconMarkup(deleteConf.value, 'Eliminar cotizacion', 'table-icon-media')}</button>
                </div>
            </td>
        </tr>
        ${isExpanded ? `<tr class="quote-master-lines-row"><td colspan="7">${renderQuoteLinesPanel(quoteCode)}</td></tr>` : ''}
    `;
}

async function refreshQuoteLines(quoteCode) {
    await fetchQuoteLines(quoteCode, { force: true });
    renderQuotesTable(getFilteredQuotes());
}

function openQuoteDocument(quoteCode) {
    if (!quoteCode) return;
    const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
    if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) {
        window.location.href = route;
    }
}

function openLineCalculation(row) {
    if (!row?.quoteId || !row?.linea) return;
    const route = `/calculo-flexografia?${new URLSearchParams({
        lineId: row.linea,
        quoteId: row.quoteId,
        productId: row.productId || '',
        department: row.departamento || ''
    }).toString()}`;
    if (!openRouteInShell(route, `Cálculo ${row.linea}`)) {
        window.location.href = route;
    }
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

async function duplicateQuoteLine(row) {
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/duplicar`, { method: 'POST' });
    await refreshQuoteLines(row.quoteId);
}

async function createQuoteFromLine(row) {
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/nueva-cotizacion`, { method: 'POST' });
    await loadQuotes();
    const code = payload?.cotizacion?.quote_code;
    if (code) openQuoteDocument(code);
}

async function createProductFromLine(row) {
    if (!canCreateModule('productos')) {
        throw new Error('Tu permiso permite ver productos, pero no crear productos desde cotizaciones.');
    }
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/producto`, {
        method: 'POST',
        headers: sessionHeader()
    });
    const code = payload?.producto?.product_code;
    if (code) {
        const route = '/productos';
        if (!openRouteInShell(route, 'Productos')) {
            window.location.href = route;
        }
    }
}

async function toggleLineFinalized(row) {
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
    const confirmed = window.confirm(`Se eliminará la línea ${row.linea}. ¿Deseas continuar?`);
    if (!confirmed) return;
    await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}`, { method: 'DELETE' });
    await refreshQuoteLines(row.quoteId);
}

async function handleQuoteLineAction(action, row) {
    if (!row) return;
    if (action === 'edit') return openLineCalculation(row);
    if (action === 'move-up') return moveQuoteLine(row, -1);
    if (action === 'move-down') return moveQuoteLine(row, 1);
    if (action === 'duplicate') return duplicateQuoteLine(row);
    if (action === 'copy') return openQuoteDocument(row.quoteId);
    if (action === 'create-product') return createProductFromLine(row);
    if (action === 'create-quote') return createQuoteFromLine(row);
    if (action === 'export') {
        window.open(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/exportar`, '_blank', 'noopener');
        return;
    }
    if (action === 'attachments') return openQuoteDocument(row.quoteId);
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
    const payload = await fetchJson(`${QUOTES_ENDPOINT}?${params.toString()}`);
    quoteCatalog = Array.isArray(payload.cotizaciones) ? payload.cotizaciones : [];
    if (selectedQuoteContextCode && !quoteCatalog.some((item) => item.quote_code === selectedQuoteContextCode)) {
        selectedQuoteContextCode = '';
        selectedQuoteContextLineId = 0;
    }
    renderQuotesTable(getFilteredQuotes());
}

async function loadConfig() {
    loadedConfig = await fetchJson(CONFIG_ENDPOINT);
    applyConfiguredIcons();
    renderRequestQuantityRepeater();
    renderRequestProductTypeOptions();
    renderShapePicker();
    if (quoteCatalog.length) {
        renderQuotesTable(getFilteredQuotes());
    }
}

function applyExternalConfigUpdate(config) {
    if (config && typeof config === 'object') {
        loadedConfig = config;
        applyConfiguredIcons();
        renderRequestQuantityRepeater();
        renderRequestProductTypeOptions();
        renderShapePicker();
        if (quoteCatalog.length) renderQuotesTable(getFilteredQuotes());
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
        const families = Array.isArray(payload?.materialFamilies) ? payload.materialFamilies : [];
        smartCatalogMeta = {
            digitalThreshold: Number(payload?.digitalThreshold || 100000) || 100000,
            labelsPerRollDefault: Number(payload?.labelsPerRollDefault || 1000) || 1000
        };
        if (families.length) {
            materialItems = families.map((item) => ({
                code: item.code || item.name || '',
                name: item.name || item.code || ''
            }));
        }
    } catch (error) {
        materialItems = STATIC_MATERIALS.map((name) => ({ code: '', name }));
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
    panel.innerHTML = items.map((item) => `
        <button type="button" class="quote-request-lookup-item" data-value="${escapeHtml(item.name)}" data-code="${escapeHtml(item.code || '')}">
            <span class="quote-request-lookup-name">${escapeHtml(item.name)}</span>
            <span class="quote-request-lookup-code">${escapeHtml(item.code || '')}</span>
        </button>
    `).join('');
    panel.hidden = false;
}

function showMaterialSuggestions() {
    const term = normalizeText(materialInput?.value).toLowerCase();
    const items = materialItems
        .filter((item) => !term || item.name.toLowerCase().includes(term))
        .slice(0, 12);
    renderInlineSuggestionList(materialSuggestions, items, 'No hay materiales disponibles.');
}

function showSurfaceSuggestions() {
    const term = normalizeText(surfaceInput?.value).toLowerCase();
    const items = surfaceItems
        .filter((item) => !term || item.toLowerCase().includes(term))
        .slice(0, 12)
        .map((item) => ({ name: item, code: '' }));
    renderInlineSuggestionList(surfaceSuggestions, items, 'No hay superficies disponibles.');
}

function hideInlinePanels() {
    if (materialSuggestions) materialSuggestions.hidden = true;
    if (surfaceSuggestions) surfaceSuggestions.hidden = true;
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
}

function applyPartnerSelection(code, name) {
    customerCodeInput.value = code || '';
    customerNameInput.value = name || '';
    if (customerLookupPanel) customerLookupPanel.hidden = true;
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
    customerCodeInput.value = '';
    pendingAttachments.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    });
    pendingAttachments = [];
    renderAttachments();
    hideInlinePanels();
    setStatus('');
    syncToggleChipState();
    applyConfiguredIcons();
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

function renderShapePicker() {
    if (!shapePicker) return;
    const general = loadedConfig?.general || {};
    const shapes = [
        { value: 'Circular', label: general.dieShapeLabel1 || 'Circular', image: general.dieShapeImage1 || '' },
        { value: 'Cuadrado', label: general.dieShapeLabel2 || 'Cuadrado', image: general.dieShapeImage2 || '' },
        { value: 'Rectangular', label: general.dieShapeLabel3 || 'Rectangular', image: general.dieShapeImage3 || '' },
        { value: 'Ovalado', label: general.dieShapeLabel4 || 'Ovalado', image: general.dieShapeImage4 || '' },
        { value: 'Especial', label: general.dieShapeLabel5 || 'Especial', image: general.dieShapeImage5 || '' }
    ];
    shapePicker.innerHTML = shapes.map((shape, index) => `
        <label class="quote-request-shape-card ${index === 0 ? 'is-selected' : ''}">
            <input type="radio" name="die_shape" value="${escapeHtml(shape.value)}" ${index === 0 ? 'checked' : ''}>
            <span class="quote-request-shape-media">${shape.image ? `<img src="${escapeHtml(shape.image)}" alt="${escapeHtml(shape.label)}">` : `<span class="quote-request-shape-fallback" data-shape="${escapeHtml(shape.value)}"></span>`}</span>
            <span class="quote-request-shape-name">${escapeHtml(shape.label)}</span>
        </label>
    `).join('');
    syncToggleChipState(shapePicker);
}

function collectRequestPayload() {
    const selectedShape = form.querySelector('input[name="die_shape"]:checked')?.value || '';
    const selectedSize = fixedSizeSelect?.selectedOptions?.[0];
    const numbering = getSelectedNumberingValue();
    const stamping = form.querySelector('input[name="stamping"]:checked')?.value || '';
    const lamination = form.querySelector('input[name="lamination"]:checked')?.value || '';
    const varnish = form.querySelector('input[name="varnish"]:checked')?.value || '';
    const stampingWidth = normalizeText(stampingWidthInput?.value);
    const placement = form.querySelector('input[name="placement"]:checked')?.value || '';
    const productType = requestProductTypeSelect?.value || '';
    const quantities = readRequestedQuantities();
    const numberingFrom = normalizeText(numberingRangeStartInput?.value);
    const numberingTo = normalizeText(numberingRangeEndInput?.value);
    const numberingDetail = normalizeText(numberingDetailInput?.value);
    const numberingAttachmentIndex = findPendingAttachmentIndex((item) => item?.slot === 'numbering');
    const numberingAttachment = numberingAttachmentIndex >= 0 ? pendingAttachments[numberingAttachmentIndex] : null;
    const numberingSummary = numbering
        ? [numbering, numberingFrom || numberingTo ? `Desde ${numberingFrom || '...'} hasta ${numberingTo || '...'}` : '', numberingDetail].filter(Boolean).join(' | ')
        : '';

    return {
        customer_code: normalizeText(customerCodeInput.value),
        customer_name: normalizeText(customerNameInput.value),
        job_name: normalizeText(document.getElementById('requestJobName')?.value),
        quantity: quantities.map((item) => formatNumber(item)).join(', '),
        quantities,
        product_type: normalizeText(productType),
        material_name: normalizeText(materialInput?.value),
        applicationType: normalizeText(surfaceInput?.value),
        outputType: placement,
        widthInches: Number(selectedSize?.dataset.width || 0) || null,
        lengthInches: Number(selectedSize?.dataset.length || 0) || null,
        request_meta: {
            'REQ | Tipo de Producto': normalizeText(productType),
            'REQ | Cantidades': quantities.map((item) => formatNumber(item)).join(', '),
            'REQ | Ruta Solicitada': 'Automática',
            'REQ | Forma': selectedShape,
            'REQ | Barniz': varnish,
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
            'REQ | Medida Fija': normalizeText(fixedSizeSelect?.value),
            'REQ | Numeracion Aviso': numbering ? 'Revisar proceso adicional de impresion para numerado.' : '',
            'CODEX_UI_STATE': {
                productType: normalizeText(productType),
                quantities,
                dieShape: selectedShape,
                widthInches: Number(selectedSize?.dataset.width || 0) || null,
                lengthInches: Number(selectedSize?.dataset.length || 0) || null,
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

function validateQuickRequestStep(stepNumber) {
    const payload = collectRequestPayload();
    payload.quantities = parseRequestedQuantities(payload.quantities);
    const errors = [];
    clearQuickRequestValidationState();

    if (stepNumber === 1) {
        if (!payload.customer_name) markQuickRequestInvalid(customerNameInput, errors, 'Nombre del cliente');
        if (!payload.job_name) markQuickRequestInvalid(document.getElementById('requestJobName'), errors, 'Nombre del producto');
        if (!payload.product_type) markQuickRequestInvalid(requestProductTypeSelect, errors, 'Tipo de producto');
        if (!payload.quantities.length) {
            markQuickRequestInvalid(requestQuantityRepeater, errors, 'Cantidad');
            requestQuantityRepeater?.querySelectorAll('input[data-request-quantity-index]')?.forEach((input) => input.classList.add('is-invalid'));
        }
    }

    if (stepNumber === 2) {
        if (!fixedSizeSelect?.value) markQuickRequestInvalid(fixedSizeSelect, errors, 'Medida');
        const selectedShape = form?.querySelector('input[name="die_shape"]:checked')?.value || '';
        if (!selectedShape) {
            markQuickRequestInvalid(shapePicker, errors, 'Forma');
        }
    }

    if (stepNumber === 3) {
        if (!payload.material_name) markQuickRequestInvalid(materialInput, errors, 'Material');
    }

    if (stepNumber === 4) {
        if (!payload.applicationType) markQuickRequestInvalid(surfaceInput, errors, 'Superficie de aplicación');
        if (!payload.outputType) markQuickRequestInvalid(form?.querySelector('input[name="placement"]'), errors, 'Colocación');
    }

    if (errors.length > 0) {
        showQuickRequestErrors(errors);
        throw new Error('Por favor, completa los campos requeridos.');
    }
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

    check(payload.customer_name, customerNameInput, 'Nombre del socio');
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
        check(payload.material_name, materialInput, 'Material');
        check(payload.applicationType, surfaceInput, 'Superficie de aplicaciÃ³n');
        check(fixedSizeSelect?.value, fixedSizeSelect, 'Medida');
    }

    check(payload.outputType, form.querySelector('input[name="placement"]'), 'Colocacion');
    if (errors.length > 0) {
        showQuickRequestErrors(errors);
        throw new Error('Por favor, completa los campos requeridos.');
    }

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
    const status = options.status || 'Solicitud';
    const quoteResponse = await fetchJson(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_code: payload.customer_code,
            customer_name: payload.customer_name,
            status: 'Borrador'
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_code: payload.customer_code,
                customer_name: payload.customer_name,
                job_name: payload.job_name,
                quantity: quantityValue,
                material_name: payload.material_name,
                material_code: payload.material_name,
                applicationType: payload.applicationType,
                outputType: payload.outputType,
                widthInches: payload.widthInches,
                lengthInches: payload.lengthInches,
                status,
                line_order: index + 1,
                request_meta: {
                    ...payload.request_meta,
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
    const draft = await createQuickQuoteDraft(payload, { status: 'Solicitud' });
    const proformaData = await fetchJson(`/api/proformas/${encodeURIComponent(draft.quoteCode)}`);
    quoteRequestWizardState.previewQuoteCode = draft.quoteCode;
    quoteRequestWizardState.previewFirstLineCode = draft.firstLineCode;
    quoteRequestWizardState.previewFingerprint = fingerprint;
    quoteRequestWizardState.previewProforma = proformaData;
    quoteRequestWizardState.previewDirty = false;
    quoteRequestWizardState.keepPreviewQuote = false;
    renderQuickRequestSummary(payload, proformaData);
    await loadQuotes();
    setStatus(`Cotización ${draft.quoteCode} lista para revisar o imprimir.`, 'saved');
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
        if (nextStep === totalSteps) {
            await ensureQuickRequestPreview();
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
    try {
        const payload = validateQuickRequest(forAdvanced);
        setStatus(forAdvanced ? 'Preparando proceso avanzado...' : 'Creando cotización...', 'saving');
        const draft = await createQuickQuoteDraft(payload, { status: forAdvanced ? 'Borrador' : 'Solicitud' });
        const { quoteCode, quantities } = draft;
        await loadQuotes();
        if (forAdvanced) {
            const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
            if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) {
                window.location.href = route;
            }
            return;
        }
        setStatus(`Cotizacion ${quoteCode} creada con ${quantities.length} cantidad(es).`, 'saved');
        resetFormState();
        closePopover(true);
    } catch (error) {
        setStatus(error.message, 'error');
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
    syncToggleChipState();
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
    resetFormState();
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
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
    wizardBackButton?.addEventListener('click', () => {
        goToQuickRequestStep(quoteRequestWizardState.currentStep - 1).catch((error) => setStatus(error.message, 'error'));
    });
    wizardNextButton?.addEventListener('click', () => {
        goToQuickRequestStep(quoteRequestWizardState.currentStep + 1).catch((error) => setStatus(error.message, 'error'));
    });
    wizardPrintButton?.addEventListener('click', async () => {
        try {
            const previewState = await ensureQuickRequestPreview();
            previewState.keepPreviewQuote = true;
            const route = `/proforma?codigo=${encodeURIComponent(previewState.previewQuoteCode)}`;
            await loadQuotes();
            if (!openRouteInShell(route, `Proforma ${previewState.previewQuoteCode}`)) {
                window.location.href = route;
            }
            closePopover(true);
        } catch (error) {
            setStatus(error.message, 'error');
        }
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
        if (!numberingPopover?.hidden) {
            if (event.target === numberingPopoverTrigger || numberingPopoverTrigger?.contains(event.target)) return;
            if (numberingPopover.contains(event.target)) return;
            closeNumberingPopover();
        }
        // Close any open line submenus when clicking outside
        if (!event.target.closest('[data-line-menu-id]')) {
            rowsBody?.querySelectorAll('[data-line-menu-panel]').forEach((p) => { p.hidden = true; });
            rowsBody?.querySelectorAll('[data-line-menu-toggle]').forEach((t) => { t.setAttribute('aria-expanded', 'false'); });
        }
    });
    
    // Real-time error clearing
    requestQuantityRepeater?.addEventListener('input', (event) => {
        const input = event.target.closest('input[data-request-quantity-index]');
        if (!input) return;
        // Clear invalid state
        input.style.borderColor = '#c9d6e2';
        input.style.boxShadow = '';
        requestQuantityRepeater.style.outline = '';
        requestQuantityRepeater.classList.remove('is-invalid');
        // Show/hide + button based on whether this field has a value
        const hasValue = parseRequestedQuantityValue(input.value) > 0;
        const existingAdd = requestQuantityRepeater.querySelector('[data-add-request-quantity]');
        const existingDel = requestQuantityRepeater.querySelector('[data-remove-request-quantity]');
        const allInputs = Array.from(requestQuantityRepeater.querySelectorAll('input[data-request-quantity-index]'));
        const isLast = allInputs.indexOf(input) === allInputs.length - 1;
        if (isLast) {
            if (hasValue && allInputs.length < 6) {
                if (!existingAdd) {
                    const addBtn = document.createElement('button');
                    addBtn.type = 'button';
                    addBtn.dataset.addRequestQuantity = 'true';
                    addBtn.setAttribute('aria-label', 'Agregar cantidad');
                    addBtn.title = 'Agregar cantidad';
                    addBtn.textContent = '+';
                    addBtn.style.cssText = 'width:32px;min-width:32px;height:32px;border:1px solid #c9d6e2;border-radius:8px;background:#fff;color:#1e6fa8;font-size:20px;font-weight:700;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;';
                    addBtn.addEventListener('mouseenter', () => { addBtn.style.background = '#e8f4fb'; addBtn.style.borderColor = '#29a6db'; });
                    addBtn.addEventListener('mouseleave', () => { addBtn.style.background = '#fff'; addBtn.style.borderColor = '#c9d6e2'; });
                    if (existingDel) requestQuantityRepeater.insertBefore(addBtn, existingDel);
                    else requestQuantityRepeater.appendChild(addBtn);
                }
            } else {
                existingAdd?.remove();
            }
        }
        invalidateQuickRequestPreview();
    });
    requestQuantityRepeater?.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-add-request-quantity]');
        if (addButton) {
            const quantities = readRequestedQuantities();
            if (quantities.length >= 6) return;
            quantities.push(0);
            renderRequestQuantityRepeater(quantities);
            const inputs = requestQuantityRepeater.querySelectorAll('input[data-request-quantity-index]');
            inputs[inputs.length - 1]?.focus();
            invalidateQuickRequestPreview();
            return;
        }
        const removeButton = event.target.closest('[data-remove-request-quantity]');
        if (removeButton) {
            const quantities = readRequestedQuantities();
            if (quantities.length <= 1) return;
            quantities.pop();
            renderRequestQuantityRepeater(quantities);
            invalidateQuickRequestPreview();
        }
    });
    form?.addEventListener('input', (event) => {
        if (event.target.classList.contains('is-invalid')) {
            event.target.classList.remove('is-invalid');
        }
        invalidateQuickRequestPreview();
        renderAutomaticRoutePreview();
    });
    form?.addEventListener('change', (event) => {
        if (event.target.matches('.quote-request-toggle-chip input, .quote-request-shape-card input')) {
            syncToggleChipState();
        }
        if (event.target.matches('input[name="numbering"]')) {
            renderNumberingSummary();
        }
        if (event.target.classList.contains('is-invalid')) {
            event.target.classList.remove('is-invalid');
        }
        invalidateQuickRequestPreview();
        renderAutomaticRoutePreview();
    });
    [numberingRangeStartInput, numberingRangeEndInput, numberingDetailInput].forEach((input) => {
        input?.addEventListener('input', renderNumberingSummary);
    });
    numberingAttachmentInput?.addEventListener('change', () => {
        handleNumberingAttachmentChange().catch((error) => setStatus(error.message, 'error'));
    });

    customerNameInput?.addEventListener('input', (e) => searchPartners(e.target.value).catch(console.error));
    customerLookupResults?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) applyPartnerSelection(item.dataset.partnerCode, item.dataset.partnerName);
    });

    materialInput?.addEventListener('input', showMaterialSuggestions);
    materialInput?.addEventListener('focus', showMaterialSuggestions);
    materialSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            materialInput.value = item.dataset.value;
            hideInlinePanels();
        }
    });

    surfaceInput?.addEventListener('input', showSurfaceSuggestions);
    surfaceInput?.addEventListener('focus', showSurfaceSuggestions);
    surfaceSuggestions?.addEventListener('click', (e) => {
        const item = e.target.closest('.quote-request-lookup-item');
        if (item) {
            surfaceInput.value = item.dataset.value;
            hideInlinePanels();
        }
    });

    rowsBody?.addEventListener('click', (e) => {
        // Line submenu toggle
        const menuToggle = e.target.closest('[data-line-menu-toggle]');
        if (menuToggle) {
            e.stopPropagation();
            const lineId = menuToggle.dataset.lineMenuToggle;
            const panel = rowsBody.querySelector(`[data-line-menu-panel="${lineId}"]`);
            if (!panel) return;
            const isOpen = !panel.hidden;
            // Close all open menus first
            rowsBody.querySelectorAll('[data-line-menu-panel]').forEach((p) => { p.hidden = true; });
            rowsBody.querySelectorAll('[data-line-menu-toggle]').forEach((t) => { t.setAttribute('aria-expanded', 'false'); });
            if (!isOpen) {
                panel.hidden = false;
                menuToggle.setAttribute('aria-expanded', 'true');
            }
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
            fetchQuoteLines(code).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const proformaButton = e.target.closest('[data-print-proforma]');
        if (proformaButton) {
            const code = proformaButton.dataset.printProforma;
            if (!code) return;
            const route = `/proforma?codigo=${encodeURIComponent(code)}`;
            if (!openRouteInShell(route, `Proforma ${code}`)) window.open(route, '_blank', 'noopener');
            return;
        }
        // Add line button
        const addLineButton = e.target.closest('[data-add-line]');
        if (addLineButton) {
            const code = addLineButton.dataset.addLine;
            if (!code) return;
            const route = `/calculo-flexografia?${new URLSearchParams({ quoteId: code, lineId: '', productId: '', department: 'Flexografia' }).toString()}`;
            if (!openRouteInShell(route, `Nueva línea - ${code}`)) window.location.href = route;
            return;
        }
        const lineActionButton = e.target.closest('[data-line-action]');
        if (lineActionButton) {
            const row = quoteLineLookup.get(Number(lineActionButton.dataset.lineId));
            if (row) {
                selectedQuoteContextCode = row.quoteId || selectedQuoteContextCode;
                selectedQuoteContextLineId = Number(lineActionButton.dataset.lineId) || 0;
            }
            // Close any open menu panel
            rowsBody.querySelectorAll('[data-line-menu-panel]').forEach((p) => { p.hidden = true; });
            rowsBody.querySelectorAll('[data-line-menu-toggle]').forEach((t) => { t.setAttribute('aria-expanded', 'false'); });
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
        // Close open menus on outside click
        rowsBody.querySelectorAll('[data-line-menu-panel]').forEach((p) => { p.hidden = true; });
        rowsBody.querySelectorAll('[data-line-menu-toggle]').forEach((t) => { t.setAttribute('aria-expanded', 'false'); });
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
    if (nuevaCotizacionButton) {
        nuevaCotizacionButton.hidden = !canCreateModule('cotizaciones');
    }
    if (launcherWrap) {
        launcherWrap.hidden = true;
    }
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
