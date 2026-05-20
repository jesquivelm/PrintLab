const CONFIG_ENDPOINT = '/api/config/shell';
const QUOTES_ENDPOINT = '/api/cotizaciones';

const GENERAL_CONFIG_CACHE_KEY = 'erp-general-config-cache';
const GENERAL_CONFIG_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const QUOTE_TRACKING_STORAGE_KEY = 'erp-flexo-quote-tracking';

const rowsBody = document.getElementById('quoteRows');
const filterInput = document.getElementById('filtroLineas');
const menuToggle = document.getElementById('menuToggle');
const searchButton = document.getElementById('searchButton');
const topBackButton = document.getElementById('topBackButton');
const userButton = document.getElementById('userButton');
const menuPanel = document.getElementById('menuPanel');
const companyLogo = document.getElementById('companyLogo');
const brandFallback = document.getElementById('brandFallback');
const appTitle = document.getElementById('appTitle');
const currentUserName = document.getElementById('currentUserName');
const saveStatus = document.getElementById('saveStatus');
const newQuoteButton = document.getElementById('newQuoteButton');
const saveQuoteButton = document.getElementById('saveQuoteButton');
const menuShortcutButton = document.getElementById('menuShortcutButton');
const openConfigButton = document.getElementById('openConfigButton');
const prevQuoteButton = document.getElementById('prevQuoteButton');
const nextQuoteButton = document.getElementById('nextQuoteButton');
const openQuoteBrowserButton = document.getElementById('openQuoteBrowserButton');
const viewProformaButton = document.getElementById('viewProformaButton');
const configPopover = document.getElementById('configPopover');
const configPopoverFrame = document.getElementById('configPopoverFrame');
const configPopoverNotice = document.getElementById('configPopoverNotice');
const closeConfigPopoverButton = document.getElementById('closeConfigPopoverButton');
const rowActionMenu = document.getElementById('rowActionMenu');
const copyLinePopover = document.getElementById('copyLinePopover');
const copyQuoteSearchInput = document.getElementById('copyQuoteSearchInput');
const copyQuoteResults = document.getElementById('copyQuoteResults');
const closeCopyLinePopoverButton = document.getElementById('closeCopyLinePopoverButton');
const attachmentsPopover = document.getElementById('attachmentsPopover');
const attachmentsList = document.getElementById('attachmentsList');
const closeAttachmentsPopoverButton = document.getElementById('closeAttachmentsPopoverButton');
const attachmentFileInput = document.getElementById('attachmentFileInput');
const attachmentFileName = document.getElementById('attachmentFileName');
const pickAttachmentsButton = document.getElementById('pickAttachmentsButton');
const uploadAttachmentsButton = document.getElementById('uploadAttachmentsButton');
const quoteBrowserPopover = document.getElementById('quoteBrowserPopover');
const quoteBrowserSearchInput = document.getElementById('quoteBrowserSearchInput');
const quoteBrowserResults = document.getElementById('quoteBrowserResults');
const closeQuoteBrowserButton = document.getElementById('closeQuoteBrowserButton');
const MIN_VISIBLE_ROWS = 10;
const MAX_VISIBLE_ROWS = 20;
const PRESENTATION_KEY = 'cotizaciones';
const CLIENT_LOCK_FIELDS = ['clienteCodigo', 'clienteNombre'];

const headerFieldMap = {
    clienteCodigo: 'customer_code',
    clienteNombre: 'customer_name',
    dirigidoA: 'contact_name',
    correoCliente: 'email',
    vendedor: 'salesperson_name',
    telefonoCliente: 'phone'
};

let nextSequence = 1000;
let activeRowId = null;
let topIconPalette = {
    back: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 20 },
    search: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 20 },
    menu: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 20 }
};
let rowIcons = {
    topBack: '\u2190',
    move: '\u22EE\u22EE',
    open: '\u2699',
    plus: '+',
    actions: '\u22EF',
    duplicate: '\u2398',
    copy: '\u2398',
    createQuote: '\u25A3',
    export: '\u2B73',
    attachments: '📎',
    createOrder: '\u2692',
    delete: '\u2715',
    send: '\u27A4',
    quotePrev: '\u2039',
    quoteLookup: '\u2315',
    quoteNext: '\u203A',
    popoverClose: '\u2715',
    attachmentUpload: '\u21E7',
    attachmentDownload: '\u21E9',
    attachmentReplace: '\u21BB'
};
let rowIconPalette = {
    move: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 16 },
    open: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 16 },
    plus: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 16 },
    actions: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    duplicate: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    copy: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    createQuote: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    export: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    attachments: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    createOrder: { primary: '#46515d', secondary: '#ffffff', hover: '#0b81b8', size: 18 },
    delete: { primary: '#a74343', secondary: '#ffffff', hover: '#d03535', size: 18 },
    send: { primary: '#0b81b8', secondary: '#ffffff', hover: '#07638c', size: 16 }
    ,quotePrev: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 18 }
    ,quoteLookup: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 18 }
    ,quoteNext: { primary: '#9ba2ab', secondary: '#ffffff', hover: '#0b81b8', size: 18 }
    ,popoverClose: { primary: '#6b7580', secondary: '#ffffff', hover: '#0b81b8', size: 18 }
    ,attachmentUpload: { primary: '#0b81b8', secondary: '#ffffff', hover: '#07638c', size: 18 }
    ,attachmentDownload: { primary: '#0b81b8', secondary: '#ffffff', hover: '#07638c', size: 18 }
    ,attachmentReplace: { primary: '#0b81b8', secondary: '#ffffff', hover: '#07638c', size: 18 }
};
let quoteRows = [];
let currentQuote = null;
let saveStatusTimer = null;
let quoteSaveTimer = null;
const lineSaveTimers = new Map();
let draggedRowId = null;
let dropTargetRowId = null;
let dropAfterTarget = false;
let actionMenuRowId = null;
let copySourceRowId = null;
let quoteCatalog = [];
let quoteCatalogIndex = -1;
let quoteRefreshPending = false;
let trackingUserPhotos = new Map();
let attachmentsRowId = null;
let attachmentsRefreshTimer = null;
let replaceAttachmentId = null;
let dragPointerHandle = null;
let dragGhostElement = null;
let dragGhostOffsetX = 0;
let dragGhostOffsetY = 0;

function readCache(key, ttlMs) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const storedAt = Number(parsed?.storedAt || 0);
        if (!storedAt || (Date.now() - storedAt) > ttlMs) {
            return null;
        }
        return parsed.data ?? null;
    } catch (error) {
        return null;
    }
}

function writeCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            storedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn('No fue posible actualizar el caché local.', error);
    }
}

function areJsonEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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
        fieldFontFamily: presentation.fieldFontFamily || general.fieldFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fieldHeight: presentation.fieldHeight ?? general.fieldHeight ?? layout.fieldHeight ?? 18,
        fieldFontSize: presentation.fieldFontSize ?? general.fieldFontSize ?? layout.fieldFontSize ?? 12,
        labelAlign: presentation.labelAlign || general.labelAlign || '',
        mediumInputWidth: presentation.mediumInputWidth ?? general.mediumInputWidth ?? 0,
        largeInputWidth: presentation.largeInputWidth ?? general.largeInputWidth ?? 0,
        footerMarginTop: preferCompanyMarginSetting(presentation.footerMarginTop, general.footerMarginTop, 0, presentation),
        footerMarginBottom: preferCompanyMarginSetting(presentation.footerMarginBottom, general.footerMarginBottom, 0, presentation),
        tableHeaderFontFamily: presentation.tableHeaderFontFamily || general.tableHeaderFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        tableHeaderFontSize: presentation.tableHeaderFontSize ?? general.tableHeaderFontSize ?? layout.tableHeaderFontSize ?? 11,
        tableRowHeight: presentation.tableRowHeight ?? general.tableRowHeight ?? layout.tableRowHeight ?? 22,
        tabColor: firstFilled(presentation.tabColor, general.tabColor, layout.tabColor, '#7f7f7f'),
        tabWidth: general.tabWidth ?? layout.tabWidth ?? 88,
        tabHeight: general.tabHeight ?? layout.tabHeight ?? 18,
        iconSize: preferCompanySetting(presentation.iconSize, layout.iconSize ?? general.iconSize, 20),
        pageMarginTop: preferCompanySetting(presentation.pageMarginTop, layout.pageMarginTop ?? general.pageMarginTop, 14),
        pageMarginRight: preferCompanySetting(presentation.pageMarginRight, layout.pageMarginRight ?? general.pageMarginRight, 16),
        pageMarginBottom: preferCompanySetting(presentation.pageMarginBottom, layout.pageMarginBottom ?? general.pageMarginBottom, 8),
        pageMarginLeft: preferCompanySetting(presentation.pageMarginLeft, layout.pageMarginLeft ?? general.pageMarginLeft, 16)
    };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setStatus(message, tone = 'idle') {
    if (!saveStatus) return;
    saveStatus.textContent = message;
    saveStatus.dataset.tone = tone;
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    if (tone !== 'saving') {
        saveStatusTimer = setTimeout(() => {
            saveStatus.textContent = 'Listo.';
            saveStatus.dataset.tone = 'idle';
        }, 2500);
    }
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || source.endsWith('.png') || source.endsWith('.svg') || source.endsWith('.jpg') || source.endsWith('.jpeg') || source.endsWith('.webp');
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || source.endsWith('.svg');
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

function setTopIcon(button, value, altText) {
    if (!button) return;
    button.innerHTML = iconMarkup(value, altText, 'top-icon-media');
}

function styleIconButton(button, palette) {
    if (!button || !palette) return;
    button.style.color = palette.primary || '#9ba2ab';
    button.style.background = 'transparent';
    button.style.setProperty('--icon-hover-color', palette.hover || palette.primary || '#0b81b8');
    button.style.setProperty('--icon-secondary-color', palette.secondary || '#ffffff');
    button.style.setProperty('--config-icon-size', `${palette.size || 20}px`);
    button.style.width = `${palette.size || 20}px`;
    button.style.height = `${palette.size || 20}px`;
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

if (isShellEmbedded()) {
    document.body.classList.add('shell-embedded');
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function buildBdfgContext() {
    if (!currentQuote?.quote_code) return null;
    const activeRow = quoteRows.find((row) => row.id === activeRowId) || quoteRows[0] || null;
    const quoteCode = String(currentQuote.quote_code || '').trim();
    const lineCode = String(activeRow?.linea || activeRow?.originalLinea || '').trim();
    return {
        kind: 'quote-document',
        title: `Cotización ${quoteCode}`,
        subtitle: [
            currentQuote.customer_name || '',
            activeRow?.nombreTrabajo || ''
        ].filter(Boolean).join(' · ') || `Contexto activo: Cotización ${quoteCode}`,
        secondaryRoute: quoteCode ? `/proforma?codigo=${encodeURIComponent(quoteCode)}` : '',
        secondaryActionId: 'open-quote-proforma',
        secondaryLabel: 'Ver proforma',
        secondaryDescription: 'Abrir la proforma asociada a esta cotización',
        quoteCode,
        lineCode,
        productCode: String(activeRow?.productId || '').trim(),
        status: String(activeRow?.estado || currentQuote.status || '').trim(),
        canCreateOrder: Boolean(activeRow?.finalizadaOrden),
        documentDescription: 'Abrir la cotización actual',
        dates: {
            createdAt: currentQuote.created_on || '',
            quotedAt: currentQuote.created_on || '',
            updatedAt: currentQuote.updated_at || '',
            dueAt: currentQuote.due_on || ''
        }
    };
}

function publishBdfgContext() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-bdfg-context', context: buildBdfgContext() }, window.location.origin);
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

function processLabelFromKey(processKey = '') {
    const baseKey = String(processKey || '').split('-')[0];
    return PROFORMA_BLOCK_PROCESS_LABELS.find((item) => item.key === baseKey)?.label || baseKey || 'Faltante';
}

function proformaBlockIssuesFromLine(line = {}) {
    const raw = line.raw_data || {};
    const messages = Array.isArray(raw.CODEX_VALIDATION_MESSAGES)
        ? raw.CODEX_VALIDATION_MESSAGES.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const fallback = String(raw['ANALISIS CAMPOS PDF'] || raw['ANALISIS CAMPOS CREAR ORDEN'] || raw['ANALISIS CAMPOS FINALIZAR'] || '').trim();
    return [...new Set(messages.length ? messages : (fallback ? [fallback] : []))]
        .map((message) => ({ message, processKey: processKeyFromIssueText(message) }))
        .filter((issue) => {
            const text = normalizeProformaIssueText(issue.message || '');
            const key = String(issue.processKey || '').split('-')[0];
            return key !== 'planchas' && !text.includes('plancha');
        });
}

async function getProformaBlockMessage(quoteCode) {
    const detail = await fetchQuoteDetail(quoteCode);
    const lines = Array.isArray(detail?.lineas) ? detail.lineas : [];
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
        const issues = item.issues.map((issue) => {
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

async function openProformaForCurrentQuote() {
    const code = currentQuote?.quote_code || document.getElementById('numeroCotizacion')?.value?.trim();
    if (!code) {
        setStatus('Debes abrir una cotización antes de ver la proforma.', 'error');
        return;
    }
    try {
        const blockMessage = await getProformaBlockMessage(code);
        if (blockMessage) {
            showCenterMessage(blockMessage, { html: true, duration: 18000 });
            setStatus('No se puede abrir la proforma: faltan datos en una o más líneas.', 'error');
            return;
        }
    } catch (error) {
        setStatus(error.message, 'error');
        return;
    }
    const route = `/proforma?codigo=${encodeURIComponent(code)}`;
    if (!openRouteInShell(route, `Proforma ${code}`)) {
        window.open(route, '_blank', 'noopener');
    }
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

async function syncProformaButtonState(code) {
    if (!viewProformaButton) return;
    if (!code) {
        viewProformaButton.textContent = 'Ver Proforma';
        viewProformaButton.disabled = true;
        return;
    }
    viewProformaButton.disabled = false;
    try {
        const response = await fetch(`/api/proformas/${encodeURIComponent(code)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la proforma.');
        viewProformaButton.textContent = payload?.status === 'closed' ? 'Ver Proforma Cerrada' : 'Ver Proforma';
    } catch (error) {
        viewProformaButton.textContent = 'Ver Proforma';
    }
}

function getRowPalette(key, fallbackSize = 18) {
    const palette = rowIconPalette[key] || {};
    return {
        primary: palette.primary || '#9ba2ab',
        secondary: palette.secondary || '#ffffff',
        hover: palette.hover || palette.primary || '#0b81b8',
        size: palette.size || fallbackSize
    };
}

function iconButtonStyle(key, fallbackSize = 18) {
    const palette = getRowPalette(key, fallbackSize);
    return `--config-icon-size:${palette.size}px;color:${escapeHtml(palette.primary)};--icon-hover-color:${escapeHtml(palette.hover)};--icon-secondary-color:${escapeHtml(palette.secondary)};width:${palette.size}px;height:${palette.size}px;flex:0 0 ${palette.size}px;`;
}

function pxSize(value, fallback = 20) {
    const size = Number(value);
    return Number.isFinite(size) && size > 0 ? size : fallback;
}

function getQuoteNumberConfig(config = {}) {
    const general = config.general || {};
    const layout = config.layout || {};
    return {
        fontFamily: general.quoteNumberFontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fontSize: pxSize(general.quoteNumberFontSize || layout.quoteNumberFontSize, 16),
        width: Number(general.quoteNumberWidth) || 0,
        autoWidth: String(general.quoteNumberAutoWidth ?? 'true') === 'true',
        bold: String(general.quoteNumberBold ?? 'false') === 'true',
        verticalAlign: general.quoteNumberVerticalAlign || 'center',
        horizontalAlign: general.quoteNumberHorizontalAlign || 'right',
        paddingTop: Number(general.quoteNumberPaddingTop) || 0,
        paddingRight: Number(general.quoteNumberPaddingRight) || 14,
        paddingBottom: Number(general.quoteNumberPaddingBottom) || 0,
        paddingLeft: Number(general.quoteNumberPaddingLeft) || 14
    };
}

function measureQuoteNumberWidth(text, fontFamily, fontSize, fontWeight) {
    const canvas = measureQuoteNumberWidth._canvas || (measureQuoteNumberWidth._canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    if (!context) {
        return Math.max(112, (String(text || '').length + 4) * Math.max(fontSize * 0.66, 10));
    }
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return Math.max(112, Math.ceil(context.measureText(String(text || '')).width));
}

function syncQuoteNumberFieldAppearance(config = window.__erpGeneralConfig || {}) {
    const root = document.documentElement;
    const fieldWrap = document.querySelector('.field-quote-inline');
    const navWrap = fieldWrap?.querySelector('.quote-nav-wrap');
    const quoteInput = document.getElementById('numeroCotizacion');
    const quoteConfig = getQuoteNumberConfig(config);
    const quoteText = String(quoteInput?.value || currentQuote?.quote_code || '').trim();
    const resolvedWidth = quoteConfig.autoWidth
        ? measureQuoteNumberWidth(quoteText, quoteConfig.fontFamily, quoteConfig.fontSize, quoteConfig.bold ? 700 : 400) + quoteConfig.paddingLeft + quoteConfig.paddingRight + 6
        : Math.max(112, quoteConfig.width || 112);
    const widthValue = `${resolvedWidth}px`;

    root.style.setProperty('--quote-number-font-family', quoteConfig.fontFamily);
    root.style.setProperty('--quote-number-font-size', `${quoteConfig.fontSize}px`);
    root.style.setProperty('--quote-number-font-weight', quoteConfig.bold ? '700' : '400');
    root.style.setProperty('--quote-number-width', widthValue);
    root.style.setProperty('--quote-number-align-self', getFlexAlign(quoteConfig.verticalAlign, 'center'));
    root.style.setProperty('--quote-number-justify', 'center');
    root.style.setProperty('--quote-number-text-align', 'center');
    root.style.setProperty('--quote-number-padding-top', `${quoteConfig.paddingTop}px`);
    root.style.setProperty('--quote-number-padding-right', `${quoteConfig.paddingRight}px`);
    root.style.setProperty('--quote-number-padding-bottom', `${quoteConfig.paddingBottom}px`);
    root.style.setProperty('--quote-number-padding-left', `${quoteConfig.paddingLeft}px`);
    root.style.setProperty('--quote-number-height', `${Math.max(28, 28 + quoteConfig.paddingTop + quoteConfig.paddingBottom)}px`);

    if (fieldWrap) {
        fieldWrap.style.alignSelf = getFlexAlign(quoteConfig.verticalAlign, 'center');
    }
    if (navWrap) {
        navWrap.style.justifyContent = 'center';
    }
    if (quoteInput) {
        quoteInput.style.width = widthValue;
        quoteInput.style.paddingTop = `${quoteConfig.paddingTop}px`;
        quoteInput.style.paddingRight = `${quoteConfig.paddingRight}px`;
        quoteInput.style.paddingBottom = `${quoteConfig.paddingBottom}px`;
        quoteInput.style.paddingLeft = `${quoteConfig.paddingLeft}px`;
        quoteInput.style.height = `${Math.max(28, 28 + quoteConfig.paddingTop + quoteConfig.paddingBottom)}px`;
    }
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function registerTrackingUserPhoto(map, value, photoUrl) {
    const key = trackingUserLookupKey(value);
    const photo = String(photoUrl || '').trim();
    if (key && photo && !map.has(key)) map.set(key, photo);
}

async function loadTrackingUserPhotos() {
    try {
        const response = await fetch('/api/admin-users');
        if (!response.ok) return;
        const users = await response.json();
        const map = new Map();
        (Array.isArray(users) ? users : []).forEach((user) => {
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

function trackingMilestonesForRow(row = {}) {
    const raw = row.rawData || {};
    const sellerName = raw.VENDEDOR || raw['VENDEDOR | USUARIO'] || currentUserName?.textContent || 'Vendedor';
    const currentUser = currentUserName?.textContent || sellerName || 'Usuario';
    const status = normalizeProformaIssueText(row.estado || raw['ESTADO LINEA'] || raw['SOLICITUD ESTADO']);
    const quoteDone = ['cotizada', 'finalizada', 'proforma', 'enviada', 'cerrada', 'produccion'].some((item) => status.includes(item));
    const requestDone = ['pendiente', 'solicitud', 'vendedor', 'cotiz', 'finaliz', 'proforma', 'enviad', 'cerrad'].some((item) => status.includes(item))
        || normalizeProformaIssueText(raw['TRAZABILIDAD | SOLICITUD VENDEDOR']) === 'si';
    const defaults = [
        { key: 'creacion', label: 'Creación', user: sellerName, date: formatDate(currentQuote?.created_on || raw['FECHA CREACION DATE'] || raw['FECHA CREACION']), done: true },
        { key: 'solicitud', label: 'Solicitud del vendedor', user: requestDone ? (raw['TRAZABILIDAD | USUARIO SOLICITUD VENDEDOR'] || sellerName) : '', date: requestDone ? (raw['TRAZABILIDAD | FECHA SOLICITUD VENDEDOR'] || raw['TRAZABILIDAD | FECHA'] || '') : '', done: requestDone },
        { key: 'finalizacion', label: 'Finalización de cotización', user: quoteDone ? currentUser : '', date: quoteDone ? formatDateTimeShort(Date.now()) : '', done: quoteDone },
        { key: 'envio', label: 'Envío de proforma', user: '', date: '', done: false },
        { key: 'cierre', label: 'Finalización comercial', user: '', date: '', done: false }
    ];
    const stored = readQuoteTrackingStore()[`${row.quoteId || currentQuote?.quote_code || 'cotizacion'}::${row.linea || 'linea'}`] || {};
    const saved = Array.isArray(stored.milestones) ? stored.milestones : [];
    return defaults.map((item) => {
        const savedItem = saved.find((entry) => entry?.key === item.key);
        return savedItem ? { ...item, ...savedItem, label: item.label } : item;
    });
}

function openRowTracking(row) {
    const milestones = trackingMilestonesForRow(row);
    const doneCount = milestones.filter((item) => item.done).length;
    const body = `<div class="line-tracking-head"><strong>${escapeHtml(row.quoteId || currentQuote?.quote_code || '')} · ${escapeHtml(row.nombreTrabajo || row.productId || '')}</strong><span>${doneCount} de ${milestones.length} completados</span></div><div class="line-tracking-list">${milestones.map((item) => {
        const name = item.user || 'Pendiente';
        return `<article class="line-tracking-item${item.done ? ' is-done' : ''}"><span class="line-tracking-avatar${trackingPhotoForName(name) ? ' has-photo' : ''}" style="background:${escapeHtml(trackingColorForName(name))};">${trackingAvatarMarkup(name)}</span><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(name)}</span><em>${escapeHtml(item.date || 'Pendiente')}</em></div></article>`;
    }).join('')}</div>`;
    showCenterMessage(body, { html: true, duration: 300000 });
    bindTrackingAvatarFallback();
}

function formatDateForInput(value) {
    if (!value) return '';
    const direct = String(value).trim();
    const latinMatch = direct.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (latinMatch) {
        const [, day, month, year] = latinMatch;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
    if (value === '' || value === null || typeof value === 'undefined') return '';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value);
    return new Intl.NumberFormat('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function parseMoneyInput(value) {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    const normalized = String(value).replace(/[₡$,]/g, '').trim();
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
}

function setFieldValue(id, value) {
    const field = document.getElementById(id);
    if (!field) return;
    field.value = value || '';
}

function setFieldTitle(id, value) {
    const field = document.getElementById(id);
    if (!field) return;
    field.title = String(value || '').trim();
}

function setHeaderLockState(hasLines) {
    CLIENT_LOCK_FIELDS.forEach((id) => {
        const field = document.getElementById(id);
        if (!field) return;
        field.disabled = Boolean(hasLines);
        field.dataset.locked = hasLines ? 'true' : 'false';
    });
}

function collectQuotePayload() {
    return {
        customer_code: document.getElementById('clienteCodigo')?.value?.trim() || '',
        customer_name: document.getElementById('clienteNombre')?.value?.trim() || '',
        contact_name: document.getElementById('dirigidoA')?.value?.trim() || '',
        email: document.getElementById('correoCliente')?.value?.trim() || '',
        salesperson_name: document.getElementById('vendedor')?.value?.trim() || '',
        phone: document.getElementById('telefonoCliente')?.value?.trim() || '',
        created_on: currentQuote?.created_on || '',
        due_on: currentQuote?.due_on || '',
        status: currentQuote?.status || 'Borrador'
    };
}

function createRowSkeleton() {
    nextSequence += 1;
    return {
        id: Date.now() + nextSequence,
        linea: '',
        originalLinea: '',
        departamento: 'Flexografia',
        nombreTrabajo: '',
        material: '',
        materialCode: '',
        estado: 'Borrador',
        subtotal1: '',
        subtotal2: '',
        subtotal3: '',
        subtotal4: '',
        createdOn: currentQuote?.created_on || '',
        dueOn: currentQuote?.due_on || '',
        ocultar: false,
        opcional: false,
        prueba: true,
        route: '/flexo-calculo',
        quoteId: currentQuote?.quote_code || '',
        productId: ''
    };
}

function filteredRows() {
    const term = (filterInput?.value || '').trim().toLowerCase();
    if (!term) return quoteRows;
    return quoteRows.filter((row) => [row.linea, row.originalLinea, row.nombreTrabajo, row.material].join(' ').toLowerCase().includes(term));
}

function moneyPlaceholder(value) {
    return value || value === 0 ? `$${formatMoney(value)}` : '';
}

function quoteCellMarkup(value, className = '') {
    const text = value || value === 0 ? String(value) : '';
    const classes = ['quote-cell-value'];
    if (className) classes.push(className);
    if (!text) classes.push('is-empty');
    return `<span class="${classes.join(' ')}" title="${escapeHtml(text)}">${text ? escapeHtml(text) : '&nbsp;'}</span>`;
}

function normalizeSummaryValue(value) {
    return String(value || '').trim();
}

function isMeaningfulSummaryValue(value) {
    const normalized = normalizeSummaryValue(value).toLowerCase();
    if (!normalized) return false;
    return !['no', 'ninguno', 'sin barniz', 'sin', 'false', 'null'].includes(normalized);
}

function uniqueSummaryParts(parts) {
    const seen = new Set();
    return parts.filter((part) => {
        const normalized = normalizeSummaryValue(part);
        if (!normalized) return false;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function isQuoteSummaryNoPrint(row) {
    const values = [row.noPrint, row.sinImpresion, row.processType, row.routeLabel];
    return values.some((value) => {
        if (value === true) return true;
        const normalized = normalizeSummaryValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return ['si', 'yes', 'true', '1'].includes(normalized) || normalized === 'sin impresion';
    });
}

function isEnabledQuoteDetail(value) {
    const normalized = normalizeSummaryValue(value).toLowerCase();
    if (!normalized) return false;
    return !['no', 'false', '0', 'sin', 'ninguno', 'n/a'].includes(normalized);
}

function cleanQuoteDetail(value) {
    const text = normalizeSummaryValue(value);
    if (!text) return '';
    return isEnabledQuoteDetail(text) ? text : '';
}

function formatQuoteDimension(value) {
    const text = normalizeSummaryValue(value);
    if (!text) return '';
    return /["a-z%]/i.test(text) ? text : `${text}"`;
}

function formatQuoteMillimeters(value) {
    const text = normalizeSummaryValue(value);
    if (!text) return '';
    return /mm$/i.test(text) ? text : `${text} mm`;
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
        return source.map((item) => normalizeSummaryValue(item)).filter(Boolean).join(' - ');
    }
    const text = normalizeSummaryValue(source);
    if (!text) return '';
    return text
        .split(/[|,;]+/)
        .map((item) => normalizeSummaryValue(item))
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
        const normalized = normalizeSummaryValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return ['si', 'sí', 'yes', 'true', '1'].includes(normalized) || normalized === 'sin impresion';
    });
}

function renderLineSummary(row, index) {
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
    const thirdLine = [
        machine ? escapeHtml(machine) : (noPrint ? '' : '<span class="is-warning">Sin máquina</span>'),
        die ? escapeHtml(die) : ''
    ].filter(Boolean).join(' - ');
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
        </div>
    `;
}

function subtotalFieldKeys() {
    return ['subtotal1', 'subtotal2', 'subtotal3', 'subtotal4'];
}

function visibleSubtotalColumns(rows) {
    const keys = subtotalFieldKeys();
    const maxIndex = rows.reduce((highest, row) => {
        const rowHighest = keys.reduce((innerHighest, key, index) => {
            const value = row?.[key];
            return value || value === 0 ? Math.max(innerHighest, index) : innerHighest;
        }, -1);
        return Math.max(highest, rowHighest);
    }, -1);
    return keys.slice(0, Math.max(1, maxIndex + 1));
}

function subtotalHeaderLabel(index, total) {
    return total <= 1 ? 'Monto' : `Monto ${index + 1}`;
}

function renderSubtotalCells(row, subtotalKeys) {
    return subtotalKeys.map((key) => `<td class="money-cell">${quoteCellMarkup(moneyPlaceholder(row[key]), 'is-money')}</td>`).join('');
}

function renderSubtotalHeaderCells(subtotalKeys) {
    return subtotalKeys.map((key, index) => `<th class="money-cell">${subtotalHeaderLabel(index, subtotalKeys.length)}</th>`).join('');
}

function renderDataRow(row, index, subtotalKeys) {
    const canOpenCalc = Boolean(row.route && row.linea && row.quoteId);
    const rowClass = activeRowId === row.id ? 'is-active' : '';
    return `
        <tr data-id="${row.id}" class="${rowClass}">
            <td class="row-number">${index + 1}</td>
            <td>
                <div class="row-tools row-tools-compact row-tools-leading">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    <button type="button" class="row-tool-btn row-tool-grip" data-action="drag-handle" data-id="${row.id}" aria-label="Mover línea" style="${iconButtonStyle('move', 16)}">${iconMarkup(rowIcons.move, 'Mover fila', 'table-icon-media')}</button>
                    <span class="row-action-divider" aria-hidden="true"></span>
                </div>
            </td>
            <td>${quoteCellMarkup(row.linea)}</td>
            <td>${renderLineSummary(row, index)}</td>
            <td class="quote-detail-date-cell is-created">${quoteCellMarkup(formatDate(row.createdOn))}</td>
            <td class="quote-detail-date-cell">${quoteCellMarkup(formatDate(row.dueOn))}</td>
            ${renderSubtotalCells(row, subtotalKeys)}
            <td>
                <div class="row-tools row-tools-row-end">
                    <span class="row-action-divider" aria-hidden="true"></span>
                    ${canOpenCalc ? `<button type="button" class="row-tool-btn row-tool-detail" data-action="open-calc" data-id="${row.id}" aria-label="Abrir cálculo" style="${iconButtonStyle('open', 16)}">${iconMarkup(rowIcons.open, 'Abrir cálculo', 'table-icon-media')}</button>` : '<span class="row-tool-spacer"></span>'}
                    <button type="button" class="row-tool-btn row-tool-actions" data-action="toggle-row-menu" data-id="${row.id}" aria-label="Más opciones" title="Más opciones" style="${iconButtonStyle('actions', 18)}">${iconMarkup(rowIcons.actions, 'Más opciones', 'table-icon-media')}</button>
                </div>
            </td>
        </tr>
    `;
}

function renderBlankRow(isFirstBlank, subtotalColumnCount) {
    const blankSubtotalCells = Array.from({ length: subtotalColumnCount }, () => '<td></td>').join('');
    return `
        <tr class="draft-row">
            <td class="row-number"></td>
            <td>
                <div class="row-tools row-tools-compact row-tools-leading row-tools-add-row">
                    ${isFirstBlank ? `
                        <span class="row-action-divider is-ghost" aria-hidden="true"></span>
                        <span class="row-tool-spacer" aria-hidden="true"></span>
                        <button type="button" class="row-tool-btn row-tool-plus" data-action="add-row" aria-label="Agregar cálculo" style="${iconButtonStyle('plus', 18)}">${iconMarkup(rowIcons.plus, 'Agregar cálculo', 'table-icon-media')}</button>
                    ` : ''}
                </div>
            </td>
            <td></td><td></td><td></td><td></td>${blankSubtotalCells}<td></td>
        </tr>
    `;
}

function renderRows() {
    const rows = filteredRows();
    const subtotalKeys = visibleSubtotalColumns(rows);
    const headerRow = document.querySelector('.quote-browser-table.quote-table-compact thead tr');
    if (headerRow) {
        headerRow.innerHTML = `
            <th class="col-index"></th>
            <th class="col-actions"></th>
            <th>L&iacute;nea</th>
            <th>Descripci&oacute;n</th>
            <th class="quote-detail-created-head">Creación</th>
            <th>Vencimiento</th>
            ${renderSubtotalHeaderCells(subtotalKeys)}
            <th class="col-row-actions"></th>
        `;
    }
    let markup = rows.map((row, index) => renderDataRow(row, index, subtotalKeys)).join('');
    const blankRowCount = Math.max(MIN_VISIBLE_ROWS - rows.length, 0);
    const visibleRowCount = Math.min(Math.max(rows.length, MIN_VISIBLE_ROWS), MAX_VISIBLE_ROWS);
    const tableWrap = rowsBody?.closest('.table-wrap');
    tableWrap?.style.setProperty('--visible-table-rows', String(visibleRowCount));
    tableWrap?.classList.toggle('is-scrollable', rows.length > MAX_VISIBLE_ROWS);
    for (let index = 0; index < blankRowCount; index += 1) {
        markup += renderBlankRow(index === 0, subtotalKeys.length);
    }
    rowsBody.innerHTML = markup;
    bindRowActions();
    publishBdfgContext();
}

function getRowById(rowId) {
    return quoteRows.find((row) => row.id === rowId) || null;
}

function closeRowMenu() {
    actionMenuRowId = null;
    if (rowActionMenu) {
        rowActionMenu.hidden = true;
        rowActionMenu.innerHTML = '';
    }
}

function closeCopyPopover() {
    copySourceRowId = null;
    if (copyLinePopover) {
        copyLinePopover.hidden = true;
        copyLinePopover.classList.remove('is-visible');
    }
    document.body.classList.remove('popover-open');
}

function closeAttachmentsPopover() {
    attachmentsRowId = null;
    replaceAttachmentId = null;
    if (attachmentsPopover) {
        attachmentsPopover.hidden = true;
        attachmentsPopover.classList.remove('is-visible');
    }
    document.body.classList.remove('popover-open');
}

function closeQuoteBrowserPopover() {
    if (quoteBrowserPopover) {
        quoteBrowserPopover.hidden = true;
        quoteBrowserPopover.classList.remove('is-visible');
    }
    document.body.classList.remove('popover-open');
}

async function navigateToQuote(code, options = {}) {
    if (!code) return;
    const detail = await fetchQuoteDetail(code);
    applyQuotePayload(detail);
    const url = `/?codigo=${encodeURIComponent(code)}`;
    if (options.replace) {
        window.history.replaceState({ codigo: code }, '', url);
    } else {
        window.history.pushState({ codigo: code }, '', url);
    }
}

function getRowActionDefinitions() {
    return [];
}

function getRowActionDefinitionsForRow(row) {
    const canCreateOrder = Boolean(row?.finalizadaOrden);
    return [
        ...(canCreateOrder ? [{ dividerBefore: true, key: 'createOrder', label: 'Crear orden de producción', icon: rowIcons.createOrder, action: 'create-production-order' }] : []),
        { key: 'duplicate', label: 'Duplicar Línea', icon: rowIcons.duplicate, action: 'duplicate-line' },
        { key: 'copy', label: 'Copiar Línea a Otra Cotización', icon: rowIcons.copy, action: 'copy-line' },
        { key: 'createQuote', label: 'Crear Nueva Cotización a Partir de Esta Línea', icon: rowIcons.createQuote, action: 'create-quote-from-line' },
        { key: 'export', label: 'Exportar Línea a Excel', icon: rowIcons.export, action: 'export-line' },
        { key: 'attachments', label: 'Ver Adjuntos', icon: rowIcons.attachments, action: 'view-attachments' },
        { dividerBefore: true, key: 'finalize', label: 'Seguimiento', action: 'open-tracking' },
        { dividerBefore: true, key: 'delete', label: 'Eliminar Línea', icon: rowIcons.delete, action: 'delete-line', danger: true }
    ];
}

function buildMenuItemMarkup(item, rowId) {
    if (item.dividerBefore) {
        return `<div class="row-action-menu-section-divider" aria-hidden="true"></div>${buildMenuItemMarkup({ ...item, dividerBefore: false }, rowId)}`;
    }
    if (item.action === 'toggle-finalize-order') {
        return `
            <button type="button" class="row-action-menu-item is-toggle" data-row-action="${item.action}" data-id="${rowId}">
                <span class="row-action-menu-toggle">
                    <span class="row-action-check ${item.checked ? 'is-checked' : ''}" aria-hidden="true"></span>
                    <span>${escapeHtml(item.label)}</span>
                </span>
            </button>
        `;
    }
    const palette = getRowPalette(item.key, 18);
    return `
        <button type="button" class="row-action-menu-item ${item.danger ? 'is-danger' : ''}" data-row-action="${item.action}" data-id="${rowId}" style="--menu-icon-color:${escapeHtml(palette.primary)};--menu-icon-hover-color:${escapeHtml(palette.hover)};--menu-icon-size:${palette.size}px;">
            <span class="row-action-menu-icon" style="--config-icon-size:${palette.size}px;width:${palette.size}px;height:${palette.size}px;flex:0 0 ${palette.size}px;">${iconMarkup(item.icon, item.label, 'table-icon-media')}</span>
            <span>${escapeHtml(item.label)}</span>
        </button>
    `;
}

function openRowMenu(rowId, anchorButton) {
    if (!rowActionMenu || !anchorButton) return;
    const row = getRowById(rowId);
    if (!row) return;
    actionMenuRowId = rowId;
    rowActionMenu.innerHTML = `<div class="row-action-menu-list">${getRowActionDefinitionsForRow(row).map((item) => buildMenuItemMarkup(item, rowId)).join('')}</div>`;

    // Posicionamiento inteligente: igual que positionQuoteLineMenu en cotizaciones.js
    const GAP = 6;
    const PAD = 10;
    const win = window;
    const rect = anchorButton.getBoundingClientRect();

    let frameOffsetTop = 0, frameOffsetLeft = 0;
    try {
        const frameEl = win.frameElement;
        if (frameEl) {
            const frameRect = frameEl.getBoundingClientRect();
            frameOffsetTop  = frameRect.top;
            frameOffsetLeft = frameRect.left;
        }
    } catch(e) {}

    const vh = (win.parent || win).innerHeight;
    const vw = (win.parent || win).innerWidth;

    // Mostrar temporalmente fuera de la vista para poder medir dimensiones reales
    rowActionMenu.style.visibility = 'hidden';
    rowActionMenu.hidden = false;
    const naturalHeight = rowActionMenu.scrollHeight;
    const naturalWidth  = rowActionMenu.offsetWidth || 260;
    rowActionMenu.style.visibility = '';

    const spaceBelow = vh - (rect.bottom + frameOffsetTop) - PAD;
    const spaceAbove = (rect.top  + frameOffsetTop) - PAD;

    let top;
    if (naturalHeight <= spaceBelow) {
        // Cabe completo abajo → abrir abajo
        top = rect.bottom + GAP;
    } else if (naturalHeight <= spaceAbove && (rect.top - naturalHeight - GAP) >= PAD) {
        // Cabe completo arriba → abrir arriba (y no se corta en el tope del frame)
        top = rect.top - naturalHeight - GAP;
    } else {
        // No cabe ni arriba ni abajo → centrar en la ventana/frame
        const centroVentana = (vh - naturalHeight) / 2;
        let topEnFrame = centroVentana - frameOffsetTop;
        const frameHeight = win.innerHeight;
        topEnFrame = Math.max(PAD, topEnFrame);
        topEnFrame = Math.min(frameHeight - naturalHeight - PAD, topEnFrame);
        top = topEnFrame;
    }

    // Horizontal: intentar a la izquierda del trigger → derecha → pegado al borde
    const realLeft  = rect.left  + frameOffsetLeft;
    const realRight = rect.right + frameOffsetLeft;
    let left;
    if (realLeft - naturalWidth - GAP >= PAD) {
        left = rect.left - naturalWidth - GAP;
    } else if (realRight + GAP + naturalWidth <= vw - PAD) {
        left = rect.right + GAP;
    } else {
        left = Math.max(PAD - frameOffsetLeft, vw - naturalWidth - PAD - frameOffsetLeft);
    }

    rowActionMenu.style.top  = `${Math.round(top)}px`;
    rowActionMenu.style.left = `${Math.round(left)}px`;
}

async function reloadCurrentQuote(preferredLineCode = '') {
    if (!currentQuote?.quote_code) return;
    applyQuotePayload(await fetchQuoteDetail(currentQuote.quote_code));
    if (preferredLineCode) {
        const matched = quoteRows.find((row) => row.linea === preferredLineCode);
        if (matched) activeRowId = matched.id;
        renderRows();
    }
}

async function refreshQuoteIfNeeded() {
    if (!currentQuote?.quote_code || quoteRefreshPending) return;
    quoteRefreshPending = true;
    try {
        await reloadCurrentQuote();
    } catch (error) {
        setStatus(error.message, 'error');
    } finally {
        quoteRefreshPending = false;
    }
}

async function duplicateLine(row) {
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/duplicar`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo duplicar la línea.');
    await reloadCurrentQuote(payload.linea?.line_code || payload.linea?.linea || '');
    setStatus('Línea duplicada.', 'saved');
}

async function loadCopyDestinations(term = '') {
    if (!copyQuoteResults) return;
    copyQuoteResults.innerHTML = `<tr><td colspan="5">Buscando cotizaciones...</td></tr>`;
    const params = new URLSearchParams({
        q: term,
        excludeQuote: currentQuote?.quote_code || '',
        limit: '30'
    });
    const response = await fetch(`/api/cotizaciones-destino?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la lista de cotizaciones.');
    const items = payload.items || [];
    if (!items.length) {
        copyQuoteResults.innerHTML = `<tr><td colspan="5">No se encontraron cotizaciones destino.</td></tr>`;
        return;
    }
    copyQuoteResults.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.customer_code || '')}</td>
            <td>${escapeHtml(item.customer_name || '')}</td>
            <td>${escapeHtml(item.job_name || '')}</td>
            <td>${escapeHtml(formatDate(item.created_on) || '')}</td>
            <td>
                <button type="button" class="copy-popover-send" data-action="send-copy-line" data-quote-code="${escapeHtml(item.quote_code)}" aria-label="Enviar a ${escapeHtml(item.quote_code)}" style="--icon-color:${escapeHtml(getRowPalette('send', 16).primary)};--icon-hover-color:${escapeHtml(getRowPalette('send', 16).hover)};">
                    <span style="${iconButtonStyle('send', 16)}">${iconMarkup(rowIcons.send, 'Enviar línea', 'table-icon-media')}</span>
                </button>
            </td>
        </tr>
    `).join('');
}

function openCopyPopover(rowId) {
    copySourceRowId = rowId;
    closeRowMenu();
    if (!copyLinePopover) return;
    copyLinePopover.hidden = false;
    copyLinePopover.classList.add('is-visible');
    document.body.classList.add('popover-open');
    if (copyQuoteSearchInput) copyQuoteSearchInput.value = '';
    loadCopyDestinations('').catch((error) => {
        if (copyQuoteResults) {
            copyQuoteResults.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
        }
    });
}

async function copyLineToQuote(targetQuoteCode) {
    const row = getRowById(copySourceRowId);
    if (!row) return;
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/copiar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetQuoteCode })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo copiar la línea.');
    closeCopyPopover();
    await loadQuoteCatalog('');
    setStatus(`Línea copiada a ${targetQuoteCode}.`, 'saved');
}

async function createQuoteFromLine(row) {
    return openCopyPopover(row.id);
}

function exportLine(row) {
    window.open(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/exportar`, '_blank', 'noopener');
}

async function openAttachments(row) {
    attachmentsRowId = row.id;
    replaceAttachmentId = null;
    if (attachmentFileName) attachmentFileName.textContent = 'Ningun archivo seleccionado';
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/adjuntos`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los adjuntos.');
    const items = payload.items || [];
    if (attachmentsList) {
        attachmentsList.innerHTML = items.length
            ? `<table class="attachments-table"><thead><tr><th>Clasificación</th><th>Archivo</th><th>Usuario</th><th>Fecha</th><th></th></tr></thead><tbody>${items.map((item) => `
                <tr>
                    <td>${escapeHtml(item.classification || item.category || item.label || item.key || 'Adjunto')}</td>
                    <td>${escapeHtml(item.file_name || item.filename || item.original_name || item.label || item.key || 'Adjunto')}${item.size_bytes ? `<span class="attachment-card-meta">${escapeHtml(formatFileSize(item.size_bytes))}</span>` : ''}</td>
                    <td>${escapeHtml(item.uploaded_by || 'admin')}</td>
                    <td>${escapeHtml(formatDateTimeShort(item.created_at))}</td>
                    <td class="attachment-card-actions">
                        ${item.isStored ? `<a class="attachment-action-btn" href="/api/adjuntos/${escapeHtml(item.id)}/download" target="_blank" rel="noopener noreferrer" aria-label="Descargar archivo" style="${iconButtonStyle('attachmentDownload', 18)}">${iconMarkup(rowIcons.attachmentDownload, 'Descargar archivo', 'table-icon-media')}</a>` : ''}
                        ${item.isStored ? `<button type="button" class="attachment-action-btn" data-action="replace-attachment" data-id="${escapeHtml(item.id)}" aria-label="Actualizar archivo" style="${iconButtonStyle('attachmentReplace', 18)}">${iconMarkup(rowIcons.attachmentReplace, 'Actualizar archivo', 'table-icon-media')}</button>` : ''}
                    </td>
                </tr>
            `).join('')}</tbody></table>`
            : '<div class="attachments-empty">Esta línea no tiene adjuntos detectados.</div>';
    }
    if (attachmentsPopover) {
        attachmentsPopover.hidden = false;
        attachmentsPopover.classList.add('is-visible');
        document.body.classList.add('popover-open');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatFileSize(value) {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return '';
    if (size >= 1024 ** 3) return `${Math.round(size / (1024 ** 3))} GB`;
    if (size >= 1024 ** 2) return `${Math.round(size / (1024 ** 2))} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${Math.round(size)} B`;
}

async function uploadSelectedAttachments() {
    const row = getRowById(attachmentsRowId);
    const files = Array.from(attachmentFileInput?.files || []);
    if (!row || !files.length) {
        throw new Error('Selecciona al menos un archivo para subir.');
    }
    for (const file of files) {
        const contentBase64 = await fileToBase64(file);
        const endpoint = replaceAttachmentId
            ? `/api/adjuntos/${encodeURIComponent(replaceAttachmentId)}`
            : `${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/adjuntos`;
        const response = await fetch(endpoint, {
            method: replaceAttachmentId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileExt: (file.name.split('.').pop() || '').toLowerCase(),
                contentBase64
            })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `No se pudo subir ${file.name}.`);
        replaceAttachmentId = null;
    }
    if (attachmentFileInput) attachmentFileInput.value = '';
    if (attachmentFileName) attachmentFileName.textContent = 'Ningun archivo seleccionado';
    await openAttachments(row);
    setStatus('Adjuntos actualizados.', 'saved');
}

async function createProductionOrder(row) {
    if (!row?.finalizadaOrden) {
        throw new Error('Debes marcar la línea como finalizada antes de crear la orden de producción.');
    }
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}/orden-produccion`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo crear la orden de producción.');
    if (payload.orden?.order_code) {
        setStatus(`Orden ${payload.orden.order_code} creada.`, 'saved');
        const route = `/orden-produccion/${encodeURIComponent(payload.orden.order_code)}`;
        if (!openRouteInShell(route, `Orden ${payload.orden.order_code}`)) {
            window.location.href = route;
        }
    }
}

async function deleteLine(row) {
    const confirmed = window.confirm(`¿Quieres eliminar la línea ${row.linea}?`);
    if (!confirmed) return;
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(row.quoteId)}/lineas/${encodeURIComponent(row.linea)}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar la línea.');
    await reloadCurrentQuote();
    setStatus('Línea eliminada.', 'saved');
}

async function handleRowMenuAction(action, rowId) {
    const row = getRowById(rowId);
    if (!row) return;
    closeRowMenu();
    if (action === 'toggle-finalize-order') {
        row.finalizadaOrden = !row.finalizadaOrden;
        renderRows();
        return saveRow(row)
            .then(() => setStatus(`Línea ${row.linea || row.originalLinea} ${row.finalizadaOrden ? 'finalizada' : 'reabierta'}.`, 'saved'));
    }
    if (action === 'open-tracking') return openRowTracking(row);
    if (action === 'duplicate-line') return duplicateLine(row);
    if (action === 'copy-line') return openCopyPopover(rowId);
    if (action === 'create-quote-from-line') return createQuoteFromLine(row);
    if (action === 'export-line') return exportLine(row);
    if (action === 'view-attachments') return openAttachments(row);
    if (action === 'create-production-order') return createProductionOrder(row);
    if (action === 'delete-line') return deleteLine(row);
}

function bindRowActions() {
    rowsBody?.querySelectorAll('[data-action="open-calc"]').forEach((button) => {
        button.onpointerup = (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
            event.preventDefault();
            event.stopPropagation();
            button.dataset.pointerHandled = 'true';
            const rowId = Number(button.dataset.id);
            if (rowId) {
                openCalc(rowId);
            }
        };
        button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.dataset.pointerHandled === 'true') {
                delete button.dataset.pointerHandled;
                return;
            }
            const rowId = Number(button.dataset.id);
            if (rowId) {
                openCalc(rowId);
            }
        };
    });

    rowsBody?.querySelectorAll('.row-tool-detail').forEach((button) => {
        button.onpointerup = (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
            event.preventDefault();
            event.stopPropagation();
            button.dataset.pointerHandled = 'true';
            const rowId = Number(button.dataset.id);
            if (rowId) {
                openCalc(rowId);
            }
        };
        button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.dataset.pointerHandled === 'true') {
                delete button.dataset.pointerHandled;
                return;
            }
            const rowId = Number(button.dataset.id);
            if (rowId) {
                openCalc(rowId);
            }
        };
    });

    rowsBody?.querySelectorAll('[data-action="add-row"]').forEach((button) => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            try {
                const row = await persistNewRow();
                if (row) openCalc(row.id);
            } catch (error) {
                setStatus(error.message, 'error');
            }
        };
    });

    rowsBody?.querySelectorAll('[data-action="toggle-row-menu"]').forEach((button) => {
        button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const rowId = Number(button.dataset.id);
            if (!rowId) return;
            if (actionMenuRowId === rowId && rowActionMenu && !rowActionMenu.hidden) {
                closeRowMenu();
                return;
            }
            openRowMenu(rowId, button);
        };
    });
}

function buildCalcUrl(row) {
    const params = new URLSearchParams({
        lineId: row.linea || '',
        quoteId: row.quoteId || currentQuote?.quote_code || '',
        productId: row.productId || '',
        department: row.departamento || ''
    });
    return `/calculo-flexografia?${params.toString()}`;
}

function updateSummary(quote, resumen) {
    const raw = quote?.raw_data || {};
    const summaryStrip = document.querySelector('.summary-strip-quote');
    if (!summaryStrip) return;
    summaryStrip.innerHTML = `
        <div>Compra: <span id="summaryCompra">${quote?.exchange_buy ? `¢${formatMoney(quote.exchange_buy)}` : '¢457'}</span></div>
        <div>Venta: <span id="summaryVenta">${quote?.exchange_sale ? `¢${formatMoney(quote.exchange_sale)}` : '¢471'}</span></div>
        <div>Creación: ${escapeHtml(raw['PIE COTIZACION | DETALLE COTIZACION | FECHAS'] || formatDate(quote?.created_on))}</div>
        <div>Vencimiento: ${escapeHtml(formatDate(quote?.due_on))}</div>
        <div>Revisión Avanzada: ${escapeHtml(raw['PIE COTIZACION | REVISION AVANZADA'] || '')}</div>
    `;
}

function applyQuotePayload(payload) {
    const quote = payload?.cotizacion || null;
    const lines = payload?.lineas || [];
    const resumen = payload?.resumen || {};
    const firstLineRaw = lines[0]?.raw_data || {};
    currentQuote = quote;

    setFieldValue('numeroCotizacion', quote?.quote_code || '');
    setFieldValue('clienteCodigo', firstFilled(
        quote?.customer_code,
        quote?.customer_id,
        quote?.card_code,
        firstLineRaw?.customer_code,
        firstLineRaw?.customer_id,
        firstLineRaw?.['CLIENTE | CODIGO'],
        firstLineRaw?.['SOCIO | CODIGO'],
        firstLineRaw?.['ID SOCIO']
    ));
    setFieldValue('clienteNombre', quote?.customer_name || '');
    setFieldValue('dirigidoA', quote?.contact_name || '');
    setFieldValue('correoCliente', quote?.email || '');
    setFieldValue('vendedor', quote?.salesperson_name || '');
    setFieldValue('telefonoCliente', quote?.phone || '');
    const phoneTooltip = [quote?.phone, quote?.phone_secondary]
        .map((item) => String(item || '').trim())
        .filter((item, index, array) => item && array.indexOf(item) === index)
        .join(' | ');
    setFieldTitle('telefonoCliente', phoneTooltip);
    syncQuoteNumberFieldAppearance();

    quoteRows = lines.map((line, index) => ({
        autoSelection: line.raw_data?.['CODEX_AUTO_SELECTION'] || {},
        id: index + 1,
        linea: line.line_code || '',
        originalLinea: line.line_code || '',
        lineOrder: Number(line.line_order) || index + 1,
        rawData: line.raw_data || {},
        createdOn: line.created_on || line.raw_data?.['FECHA CREACION DATE'] || line.raw_data?.['FECHA CREACION'] || quote?.created_on || '',
        dueOn: line.due_on || line.raw_data?.['FECHA VENCIMIENTO'] || quote?.due_on || '',
        departamento: line.department || 'Flexografia',
        nombreTrabajo: line.job_name || '',
        material: line.material_name || '',
      medidaFija: line.raw_data?.['REQ | Medida Fija'] || '',
      medida: [line.raw_data?.['DIMENSIONES ETIQUETA | ANCHO'], line.raw_data?.['DIMENSIONES ETIQUETA | LARGO']].filter((value) => value || value === 0).join(' x '),
      machineName: line.machine_name || line.raw_data?.['CONV | MAQUINA'] || line.raw_data?.['DIGITAL | MAQUINA'] || '',
      dieCode: line.die_code || line.raw_data?.['GENERAL | TROQUEL | ID'] || line.raw_data?.['REQ | Troquelado'] || '',
      quantity: line.quantity ?? line.raw_data?.['Cantidad Productos'] ?? '',
      noPrint: ['si', 'sí', 'yes', 'true', '1'].includes(normalizeSummaryValue(line.raw_data?.['SIN IMPRESION'] || line.raw_data?.['SIN IMPRESIÓN']).toLowerCase()),
      barniz: line.raw_data?.['REQ | Barniz'] || '',
      laminado: line.raw_data?.['REQ | Laminado'] || '',
      estampado: line.raw_data?.['REQ | Estampado'] || '',
      embosado: line.raw_data?.['REQ | Embosado'] || '',
      troquelado: line.raw_data?.['REQ | Troquelado'] || '',
      numeracion: line.raw_data?.['REQ | Numeracion'] || line.raw_data?.['REQ | Numeracion Aviso'] || '',
      routeLabel: line.raw_data?.['REQ | Ruta Automática'] || line.process_type || '',
      mountingSummary: line.raw_data?.['REQ | Montaje Automático'] || line.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || '',
      autoWarningsText: '',
      materialCode: line.raw_data?.['Material Convencional | Id Material'] || line.raw_data?.['Material Digital | Id Material'] || '',
      finalizadaOrden: Boolean(line.finalized_for_order || line.raw_data?.['CODEX_FINALIZED_FOR_ORDER']),
      estado: line.status || 'Cotizada',
        subtotal1: line.subtotal_1 ?? '',
        subtotal2: line.subtotal_2 ?? '',
        subtotal3: line.subtotal_3 ?? '',
        subtotal4: line.subtotal_4 ?? '',
        ocultar: Boolean(line.hidden_flag),
        opcional: Boolean(line.optional_flag),
        prueba: Boolean(line.proof_flag),
        route: '/flexo-calculo',
        quoteId: quote?.quote_code || '',
        productId: line.product_code || '',
        processType: line.process_type || '',
        processSequenceText: line.process_sequence_text || line.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || ''
    }));

    setHeaderLockState(quoteRows.length > 0);
    activeRowId = quoteRows[0]?.id || null;
    syncQuoteCatalogIndex();
    updateQuoteRecordStatus();
    updateSummary(quote, resumen);
    renderRows();
    syncProformaButtonState(quote?.quote_code || '');
}

function syncRowOrderState() {
    quoteRows = quoteRows.map((row, index) => ({ ...row, lineOrder: index + 1 }));
}

function moveDraggedRow(dragRowId, targetRowId, placeAfter = false) {
    const currentIndex = quoteRows.findIndex((row) => row.id === dragRowId);
    const targetIndex = quoteRows.findIndex((row) => row.id === targetRowId);
    if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) return false;

    const [row] = quoteRows.splice(currentIndex, 1);
    const adjustedTargetIndex = quoteRows.findIndex((item) => item.id === targetRowId);
    const insertIndex = placeAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    quoteRows.splice(insertIndex, 0, row);
    syncRowOrderState();
    activeRowId = dragRowId;
    renderRows();
    return true;
}

function clearDropIndicators() {
    rowsBody?.querySelectorAll('.drop-before, .drop-after, .is-dragging').forEach((element) => {
        element.classList.remove('drop-before', 'drop-after', 'is-dragging');
    });
}

function destroyDragGhost() {
    if (dragGhostElement) {
        dragGhostElement.remove();
        dragGhostElement = null;
    }
}

function updateDragGhostPosition(clientX, clientY) {
    if (!dragGhostElement) return;
    dragGhostElement.style.setProperty('--drag-x', `${clientX - dragGhostOffsetX}px`);
    dragGhostElement.style.setProperty('--drag-y', `${clientY - dragGhostOffsetY}px`);
}

function createDragGhost(rowElement, clientX, clientY) {
    destroyDragGhost();
    if (!rowElement) return;

    const rect = rowElement.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'row-drag-ghost';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;

    const table = document.createElement('table');
    table.className = 'copy-popover-table quote-browser-table quote-table-compact row-drag-ghost-table';
    const tbody = document.createElement('tbody');
    const rowClone = rowElement.cloneNode(true);
    rowClone.classList.remove('is-active', 'is-dragging', 'drop-before', 'drop-after');

    const sourceInputs = rowElement.querySelectorAll('input, select, textarea');
    const cloneInputs = rowClone.querySelectorAll('input, select, textarea');
    cloneInputs.forEach((input, index) => {
        const source = sourceInputs[index];
        if (!source) return;
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.value = source.value;
        } else if (input instanceof HTMLSelectElement) {
            input.value = source.value;
        }
    });

    tbody.appendChild(rowClone);
    table.appendChild(tbody);
    ghost.appendChild(table);
    document.body.appendChild(ghost);

    dragGhostElement = ghost;
    dragGhostOffsetX = Math.min(40, Math.max(18, clientX - rect.left));
    dragGhostOffsetY = Math.min(rect.height / 2, Math.max(12, clientY - rect.top));
    updateDragGhostPosition(clientX, clientY);
    requestAnimationFrame(() => {
        ghost.classList.add('is-visible');
    });
}

function updateDropIndicator(clientX, clientY, explicitRowElement = null) {
    clearDropIndicators();

    const dragRowElement = rowsBody?.querySelector(`tr[data-id="${draggedRowId}"]`);
    if (dragRowElement) {
        dragRowElement.classList.add('is-dragging');
    }

    let rowElement = explicitRowElement;
    if (rowElement && Number(rowElement.dataset.id) === draggedRowId) {
        rowElement = null;
    }
    if (!rowElement) {
        const hovered = document.elementFromPoint(clientX, clientY) || document.elementFromPoint(48, clientY);
        rowElement = hovered?.closest?.('tr[data-id]');
    }
    if (!rowElement) {
        dropTargetRowId = null;
        return;
    }

    const targetRowId = Number(rowElement.dataset.id);
    if (!targetRowId || targetRowId === draggedRowId) {
        dropTargetRowId = null;
        return;
    }

    const bounds = rowElement.getBoundingClientRect();
    dropAfterTarget = clientY > bounds.top + (bounds.height / 2);
    dropTargetRowId = targetRowId;
    rowElement.classList.add(dropAfterTarget ? 'drop-after' : 'drop-before');
}

function handlePointerDragMove(event) {
    if (!draggedRowId) return;
    event.preventDefault();
    updateDragGhostPosition(event.clientX, event.clientY);
    updateDropIndicator(event.clientX, event.clientY, event.target?.closest?.('tr[data-id]') || null);
}

function finishPointerDrag(event) {
    const dragRowId = draggedRowId;
    const targetRowId = dropTargetRowId;
    const placeAfter = dropAfterTarget;

    draggedRowId = null;
    dropTargetRowId = null;
    dropAfterTarget = false;

    document.removeEventListener('mousemove', handlePointerDragMove);
    document.removeEventListener('mouseup', finishPointerDrag);
    document.removeEventListener('pointermove', handlePointerDragMove);
    document.removeEventListener('pointerup', finishPointerDrag);
    document.removeEventListener('pointercancel', finishPointerDrag);
    if (event?.pointerId !== undefined && dragPointerHandle?.releasePointerCapture && dragPointerHandle.hasPointerCapture?.(event.pointerId)) {
        dragPointerHandle.releasePointerCapture(event.pointerId);
    }
    dragPointerHandle = null;
    destroyDragGhost();
    clearDropIndicators();

    if (!dragRowId || !targetRowId) return;

    const moved = moveDraggedRow(dragRowId, targetRowId, placeAfter);
    if (moved) {
        const row = quoteRows.find((item) => item.id === dragRowId);
        setStatus('Guardando orden de líneas...', 'saving');
        persistRowOrder()
            .then(() => setStatus(`Línea ${row?.linea || ''} reordenada.`, 'saved'))
            .catch((error) => setStatus(error.message, 'error'));
    }
}

function updateRowLocal(rowId, field, value) {
    quoteRows = quoteRows.map((row) => row.id === rowId ? { ...row, [field]: value } : row);
}

function mapLineUpdatePayload(row) {
    return {
        line_code: row.linea,
        line_order: Number(row.lineOrder) || null,
        department: row.departamento,
        job_name: row.nombreTrabajo,
        material_name: row.material,
        status: row.estado,
        finalized_for_order: Boolean(row.finalizadaOrden),
        total_cost: parseMoneyInput(row.subtotal1),
        unit_price: parseMoneyInput(row.subtotal1),
        process_type: row.processType || 'Convencional',
        process_sequence_text: row.processSequenceText || '',
        product_code: row.productId || row.linea
    };
}

async function persistRowOrder() {
    if (!currentQuote?.quote_code) return;
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(currentQuote.quote_code)}/lineas/orden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lineas: quoteRows
                .filter((row) => row.originalLinea || row.linea)
                .map((row, index) => ({
                    line_code: row.originalLinea || row.linea,
                    line_order: index + 1
                }))
        })
    });
    if (!response.ok) throw new Error('No fue posible guardar el orden de las líneas.');
    const payload = await response.json();
    const savedLines = Array.isArray(payload?.lineas) ? payload.lineas : [];
    if (!savedLines.length) return;
    const orderMap = new Map(savedLines.map((line) => [line.line_code, Number(line.line_order) || 0]));
    quoteRows = quoteRows
        .map((row) => ({
            ...row,
            lineOrder: orderMap.get(row.originalLinea || row.linea) || row.lineOrder
        }))
        .sort((a, b) => (Number(a.lineOrder) || 0) - (Number(b.lineOrder) || 0));
    renderRows();
}

async function saveQuoteHeader() {
    if (!currentQuote?.quote_code) return;
    setStatus('Guardando cotización...', 'saving');
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(currentQuote.quote_code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectQuotePayload())
    });
    if (!response.ok) throw new Error('No fue posible guardar la cotización.');
    const payload = await response.json();
    currentQuote = payload.cotizacion || currentQuote;
    setStatus(`Cotización ${currentQuote.quote_code} guardada.`, 'saved');
}

function scheduleQuoteSave() {
    if (!currentQuote?.quote_code) return;
    if (quoteSaveTimer) clearTimeout(quoteSaveTimer);
    quoteSaveTimer = setTimeout(() => {
        saveQuoteHeader().catch((error) => setStatus(error.message, 'error'));
    }, 450);
}

async function createNewQuote() {
    setStatus('Creando cotización nueva...', 'saving');
    const response = await fetch(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...collectQuotePayload(),
            status: 'Borrador'
        })
    });
    if (!response.ok) throw new Error('No fue posible crear la cotización.');
    const payload = await response.json();
    const code = payload?.cotizacion?.quote_code;
    if (!code) throw new Error('La cotización se creó sin código.');
    window.location.href = `/?codigo=${encodeURIComponent(code)}`;
}

async function persistNewRow() {
    if (!currentQuote?.quote_code) {
        await createNewQuote();
        return null;
    }

    setStatus('Creando línea de cálculo...', 'saving');
    const newRow = createRowSkeleton();
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(currentQuote.quote_code)}/lineas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            line_order: quoteRows.length + 1,
            department: newRow.departamento,
            status: newRow.estado
        })
    });
    if (!response.ok) throw new Error('No fue posible crear la línea.');
    const payload = await response.json();
    const linea = payload?.linea;
    if (!linea?.line_code) throw new Error('La línea se creó sin código.');
    const row = {
        ...newRow,
        linea: linea.line_code,
        originalLinea: linea.line_code,
        lineOrder: Number(linea.line_order) || (quoteRows.length + 1),
        createdOn: linea.created_on || linea.raw_data?.['FECHA CREACION DATE'] || linea.raw_data?.['FECHA CREACION'] || currentQuote?.created_on || '',
        dueOn: linea.due_on || linea.raw_data?.['FECHA VENCIMIENTO'] || currentQuote?.due_on || '',
        nombreTrabajo: linea.job_name || '',
        material: linea.material_name || '',
        medidaFija: linea.raw_data?.['REQ | Medida Fija'] || '',
        medida: [linea.raw_data?.['DIMENSIONES ETIQUETA | ANCHO'], linea.raw_data?.['DIMENSIONES ETIQUETA | LARGO']].filter((value) => value || value === 0).join(' x '),
        machineName: linea.machine_name || linea.raw_data?.['CONV | MAQUINA'] || linea.raw_data?.['DIGITAL | MAQUINA'] || '',
        dieCode: linea.die_code || linea.raw_data?.['GENERAL | TROQUEL | ID'] || linea.raw_data?.['REQ | Troquelado'] || '',
        quantity: linea.quantity ?? linea.raw_data?.['Cantidad Productos'] ?? '',
        noPrint: ['si', 'sí', 'yes', 'true', '1'].includes(normalizeSummaryValue(linea.raw_data?.['SIN IMPRESION'] || linea.raw_data?.['SIN IMPRESIÓN']).toLowerCase()),
        barniz: linea.raw_data?.['REQ | Barniz'] || '',
        laminado: linea.raw_data?.['REQ | Laminado'] || '',
        estampado: linea.raw_data?.['REQ | Estampado'] || '',
        embosado: linea.raw_data?.['REQ | Embosado'] || '',
        troquelado: linea.raw_data?.['REQ | Troquelado'] || '',
        numeracion: linea.raw_data?.['REQ | Numeracion'] || linea.raw_data?.['REQ | Numeracion Aviso'] || '',
        routeLabel: linea.raw_data?.['REQ | Ruta Automática'] || linea.process_type || '',
        mountingSummary: linea.raw_data?.['REQ | Montaje Automático'] || linea.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || '',
        autoWarningsText: '',
        estado: linea.status || newRow.estado,
        subtotal1: linea.subtotal_1 ?? '',
        quoteId: currentQuote.quote_code,
        productId: linea.product_code || linea.line_code,
        processType: linea.process_type || newRow.processType || '',
        processSequenceText: linea.process_sequence_text || linea.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || newRow.processSequenceText || ''
    };
    quoteRows = [...quoteRows, row];
    setHeaderLockState(true);
    activeRowId = row.id;
    renderRows();
    setStatus(`Línea ${row.linea} creada.`, 'saved');
    return row;
}

async function saveRow(row) {
    if (!currentQuote?.quote_code || !row?.originalLinea) return;
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(currentQuote.quote_code)}/lineas/${encodeURIComponent(row.originalLinea)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapLineUpdatePayload(row))
    });
    if (!response.ok) throw new Error('No fue posible guardar la línea.');
    const payload = await response.json();
    const saved = payload?.linea;
    if (saved?.line_code) {
        quoteRows = quoteRows.map((item) => item.id === row.id ? {
            ...item,
            linea: saved.line_code,
            originalLinea: saved.line_code,
            nombreTrabajo: saved.job_name || item.nombreTrabajo,
            material: saved.material_name || item.material,
            medidaFija: saved.raw_data?.['REQ | Medida Fija'] || item.medidaFija,
            medida: [saved.raw_data?.['DIMENSIONES ETIQUETA | ANCHO'], saved.raw_data?.['DIMENSIONES ETIQUETA | LARGO']].filter((value) => value || value === 0).join(' x ') || item.medida,
            machineName: saved.machine_name || saved.raw_data?.['CONV | MAQUINA'] || saved.raw_data?.['DIGITAL | MAQUINA'] || item.machineName,
            dieCode: saved.die_code || saved.raw_data?.['GENERAL | TROQUEL | ID'] || saved.raw_data?.['REQ | Troquelado'] || item.dieCode,
            quantity: saved.quantity ?? saved.raw_data?.['Cantidad Productos'] ?? item.quantity,
            noPrint: ['si', 'sí', 'yes', 'true', '1'].includes(normalizeSummaryValue(saved.raw_data?.['SIN IMPRESION'] || saved.raw_data?.['SIN IMPRESIÓN']).toLowerCase()) || item.noPrint,
            barniz: saved.raw_data?.['REQ | Barniz'] || item.barniz,
            laminado: saved.raw_data?.['REQ | Laminado'] || item.laminado,
            estampado: saved.raw_data?.['REQ | Estampado'] || item.estampado,
            embosado: saved.raw_data?.['REQ | Embosado'] || item.embosado,
            troquelado: saved.raw_data?.['REQ | Troquelado'] || item.troquelado,
            numeracion: saved.raw_data?.['REQ | Numeracion'] || saved.raw_data?.['REQ | Numeracion Aviso'] || item.numeracion,
            routeLabel: saved.raw_data?.['REQ | Ruta Automática'] || saved.process_type || item.routeLabel,
            mountingSummary: saved.raw_data?.['REQ | Montaje Automático'] || saved.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || item.mountingSummary,
            autoWarningsText: '',
            materialCode: saved.raw_data?.['Material Convencional | Id Material'] || saved.raw_data?.['Material Digital | Id Material'] || item.materialCode,
            finalizadaOrden: Boolean(saved.finalized_for_order || saved.raw_data?.['CODEX_FINALIZED_FOR_ORDER'] || item.finalizadaOrden),
            estado: saved.status || item.estado,
            lineOrder: Number(saved.line_order) || item.lineOrder,
            createdOn: saved.created_on || saved.raw_data?.['FECHA CREACION DATE'] || saved.raw_data?.['FECHA CREACION'] || item.createdOn,
            dueOn: saved.due_on || saved.raw_data?.['FECHA VENCIMIENTO'] || item.dueOn,
            subtotal1: saved.subtotal_1 ?? item.subtotal1,
            productId: saved.product_code || item.productId,
            processType: saved.process_type || item.processType,
            processSequenceText: saved.process_sequence_text || saved.raw_data?.['CODEX_PROCESS_SEQUENCE_TEXT'] || item.processSequenceText
        } : item);
        renderRows();
    }
}

function scheduleLineSave(rowId) {
    const row = quoteRows.find((item) => item.id === rowId);
    if (!row?.originalLinea) return;
    if (lineSaveTimers.has(rowId)) clearTimeout(lineSaveTimers.get(rowId));
    setStatus(`Guardando línea ${row.linea || row.originalLinea}...`, 'saving');
    const timer = setTimeout(() => {
        saveRow(row)
            .then(() => setStatus(`Línea ${row.linea || row.originalLinea} guardada.`, 'saved'))
            .catch((error) => setStatus(error.message, 'error'));
    }, 450);
    lineSaveTimers.set(rowId, timer);
}

function openCalc(rowId) {
    const row = quoteRows.find((item) => item.id === rowId);
    if (!row) return;
    const source = buildCalcUrl(row);
    const label = `Cálculo ${row.linea || row.nombreTrabajo || ''}`.trim();
    if (openRouteInShell(source, label)) {
        setStatus(`Editando línea ${row.linea || ''}.`, 'saved');
        return;
    }
    window.location.href = source;
    setStatus(`Editando línea ${row.linea || ''}.`, 'saved');
}

function openConfigPopover() {
    if (!configPopover || !configPopoverFrame) {
        window.location.href = '/configuracion-general';
        return;
    }
    if (configPopoverNotice) {
        configPopoverNotice.hidden = false;
    }
    configPopover.hidden = false;
    configPopover.classList.add('is-visible');
    document.body.classList.add('popover-open');
    configPopoverFrame.src = '/configuracion-general?embed=1';
}

function closeConfigPopover() {
    if (!configPopover) return;
    configPopover.hidden = true;
    configPopover.classList.remove('is-visible');
    document.body.classList.remove('popover-open');
    if (configPopoverFrame) {
        configPopoverFrame.src = 'about:blank';
    }
    if (configPopoverNotice) {
        configPopoverNotice.hidden = true;
    }
}

function toggleMenu(forceState) {
    if (!menuPanel) return;
    const shouldOpen = typeof forceState === 'boolean' ? forceState : menuPanel.hidden;
    menuPanel.hidden = !shouldOpen;
    menuToggle.setAttribute('aria-expanded', String(shouldOpen));
}

function applyConfig(config) {
    window.__erpGeneralConfig = config;
    const presentation = getPresentationConfig(config, PRESENTATION_KEY);
    appTitle.textContent = presentation.moduleTitle;
    if (currentUserName) {
        const session = config.session || {};
        const name = session.name || session.fullName || session.currentUser || session.user || session.username || '';
        currentUserName.textContent = name || 'Usuario';
        currentUserName.title = name ? `Sesión: ${name}` : 'Sin sesión activa';
    }

    const globalLogoUrl = (config.branding?.logoUrl || '').trim();
    const logoUrl = presentation.brandLogoUrl || globalLogoUrl;
    const companyName = config.branding?.companyName || 'PrintLab';
    
    if (companyLogo) {
        companyLogo.style.display = logoUrl ? 'block' : 'none';
        companyLogo.src = logoUrl;
        companyLogo.alt = companyName;
    }

    if (typeof brandFallback !== 'undefined' && brandFallback) {
        brandFallback.textContent = companyName;
        const wrap = document.querySelector('.brand-logo-wrap') || companyLogo.parentElement;
        if (wrap) {
            wrap.style.display = 'flex';
            wrap.style.alignItems = 'center';
            wrap.style.gap = '8px';
            const defaultHide = !presentation.brandLogoUrl && Boolean(globalLogoUrl) && presentation.logoPosition !== 'left' && presentation.logoPosition !== 'right';
            const shouldHide = presentation.logoPosition === 'hide_text' || defaultHide;
            brandFallback.style.display = shouldHide ? 'none' : 'flex';
            wrap.style.flexDirection = presentation.logoPosition === 'right' ? 'row-reverse' : 'row';
        }
    }

    if (typeof appTitle !== 'undefined' && appTitle) {
        appTitle.style.alignSelf = presentation.titleVerticalAlign || 'center';
    }

    setTopIcon(topBackButton, config.icons?.topBack || '\u2190', 'Volver');
    setTopIcon(searchButton, config.icons?.topSearch || '\u2315', 'Buscar');
    setTopIcon(menuToggle, config.icons?.topMenu || '\u2261', 'Menú');
    if (openConfigButton) {
        const settingsIcon = config.icons?.dashboardSettings || '\u2692';
        const settingsColor = config.general?.iconColorDashboardSettings || '#0b81b8';
        const settingsHover = config.general?.iconColorHoverDashboardSettings || '#17abdf';
        const settingsSize = pxSize(config.general?.iconSizeDashboardSettings, 18);
        openConfigButton.style.setProperty('--icon-color', settingsColor);
        openConfigButton.style.setProperty('--icon-hover-color', settingsHover);
        openConfigButton.style.setProperty('--config-icon-size', `${settingsSize}px`);
        openConfigButton.innerHTML = `${iconMarkup(settingsIcon, 'Configuración General', 'table-icon-media')}<span>Configuración General</span>`;
    }
    topIconPalette = {
        back: {
            primary: config.general?.iconColorTopBack || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TopBack || '#ffffff',
            hover: config.general?.iconColorHoverTopBack || '#0b81b8',
            size: pxSize(config.general?.iconSizeTopBack, presentation.iconSize)
        },
        search: {
            primary: config.general?.iconColorTopSearch || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TopSearch || '#ffffff',
            hover: config.general?.iconColorHoverTopSearch || '#0b81b8',
            size: pxSize(config.general?.iconSizeTopSearch, presentation.iconSize)
        },
        menu: {
            primary: config.general?.iconColorTopMenu || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TopMenu || '#ffffff',
            hover: config.general?.iconColorHoverTopMenu || '#0b81b8',
            size: pxSize(config.general?.iconSizeTopMenu, presentation.iconSize)
        }
    };
    styleIconButton(topBackButton, topIconPalette.back);
    styleIconButton(searchButton, topIconPalette.search);
    styleIconButton(menuToggle, topIconPalette.menu);
    rowIcons = {
        topBack: config.icons?.topBack || '\u2190',
        move: config.icons?.tableMove || '\u22EE\u22EE',
        open: config.icons?.tableOpen || '\u2699',
        plus: config.icons?.tableAdd || '+',
        actions: config.icons?.lineMenu || config.icons?.tableActions || '\u22EF',
        duplicate: config.icons?.lineDuplicate || '\u2398',
        copy: config.icons?.lineCopy || '\u2398',
        createQuote: config.icons?.lineCreateQuote || '\u25A3',
        export: config.icons?.lineExport || '\u2B73',
        attachments: config.icons?.lineAttachments || '📎',
        createOrder: config.icons?.lineCreateProductionOrder || config.icons?.lineCreateOrder || '\u2692',
        delete: config.icons?.lineDelete || '\u2715',
        send: config.icons?.copyQuoteSend || '\u27A4',
        quotePrev: config.icons?.quotePrev || '\u2039',
        quoteLookup: config.icons?.quoteLookup || '\u2315',
        quoteNext: config.icons?.quoteNext || '\u203A',
        popoverClose: config.icons?.popoverClose || '\u2715',
        attachmentUpload: config.icons?.attachmentUpload || '\u21E7',
        attachmentDownload: config.icons?.attachmentDownload || '\u21E9',
        attachmentReplace: config.icons?.attachmentReplace || '\u21BB'
    };
    rowIconPalette = {
        move: {
            primary: config.general?.iconColorTableMove || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TableMove || '#ffffff',
            hover: config.general?.iconColorHoverTableMove || '#0b81b8',
            size: pxSize(config.general?.iconSizeTableMove, presentation.iconSize)
        },
        open: {
            primary: config.general?.iconColorTableOpen || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TableOpen || '#ffffff',
            hover: config.general?.iconColorHoverTableOpen || '#0b81b8',
            size: pxSize(config.general?.iconSizeTableOpen, presentation.iconSize)
        },
        plus: {
            primary: config.general?.iconColorTableAdd || config.general?.iconColor || '#9ba2ab',
            secondary: config.general?.iconColor2TableAdd || '#ffffff',
            hover: config.general?.iconColorHoverTableAdd || '#0b81b8',
            size: pxSize(config.general?.iconSizeTableAdd, presentation.iconSize)
        },
        actions: {
            primary: config.general?.iconColorLineMenu || config.general?.iconColorTableActions || config.general?.iconColor || '#607286',
            secondary: config.general?.iconColor2LineMenu || config.general?.iconColor2TableActions || '#ffffff',
            hover: config.general?.iconColorHoverLineMenu || config.general?.iconColorHoverTableActions || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineMenu || config.general?.iconSizeTableActions, presentation.iconSize)
        },
        duplicate: {
            primary: config.general?.iconColorLineDuplicate || '#46515d',
            secondary: config.general?.iconColor2LineDuplicate || '#ffffff',
            hover: config.general?.iconColorHoverLineDuplicate || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineDuplicate, presentation.iconSize)
        },
        copy: {
            primary: config.general?.iconColorLineCopy || '#46515d',
            secondary: config.general?.iconColor2LineCopy || '#ffffff',
            hover: config.general?.iconColorHoverLineCopy || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineCopy, presentation.iconSize)
        },
        createQuote: {
            primary: config.general?.iconColorLineCreateQuote || '#46515d',
            secondary: config.general?.iconColor2LineCreateQuote || '#ffffff',
            hover: config.general?.iconColorHoverLineCreateQuote || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineCreateQuote, presentation.iconSize)
        },
        export: {
            primary: config.general?.iconColorLineExport || '#46515d',
            secondary: config.general?.iconColor2LineExport || '#ffffff',
            hover: config.general?.iconColorHoverLineExport || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineExport, presentation.iconSize)
        },
        attachments: {
            primary: config.general?.iconColorLineAttachments || '#46515d',
            secondary: config.general?.iconColor2LineAttachments || '#ffffff',
            hover: config.general?.iconColorHoverLineAttachments || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineAttachments, presentation.iconSize)
        },
        createOrder: {
            primary: config.general?.iconColorLineCreateProductionOrder || config.general?.iconColorLineCreateOrder || '#46515d',
            secondary: config.general?.iconColor2LineCreateProductionOrder || config.general?.iconColor2LineCreateOrder || '#ffffff',
            hover: config.general?.iconColorHoverLineCreateProductionOrder || config.general?.iconColorHoverLineCreateOrder || '#0b81b8',
            size: pxSize(config.general?.iconSizeLineCreateProductionOrder, config.general?.iconSizeLineCreateOrder || presentation.iconSize)
        },
        delete: {
            primary: config.general?.iconColorLineDelete || '#a74343',
            secondary: config.general?.iconColor2LineDelete || '#ffffff',
            hover: config.general?.iconColorHoverLineDelete || '#d03535',
            size: pxSize(config.general?.iconSizeLineDelete, presentation.iconSize)
        },
        send: {
            primary: config.general?.iconColorCopyQuoteSend || '#0b81b8',
            secondary: config.general?.iconColor2CopyQuoteSend || '#ffffff',
            hover: config.general?.iconColorHoverCopyQuoteSend || '#07638c',
            size: pxSize(config.general?.iconSizeCopyQuoteSend, presentation.iconSize)
        },
        quotePrev: {
            primary: config.general?.iconColorQuotePrev || '#9ba2ab',
            secondary: config.general?.iconColor2QuotePrev || '#ffffff',
            hover: config.general?.iconColorHoverQuotePrev || '#0b81b8',
            size: pxSize(config.general?.iconSizeQuotePrev, presentation.iconSize)
        },
        quoteLookup: {
            primary: config.general?.iconColorQuoteLookup || '#9ba2ab',
            secondary: config.general?.iconColor2QuoteLookup || '#ffffff',
            hover: config.general?.iconColorHoverQuoteLookup || '#0b81b8',
            size: pxSize(config.general?.iconSizeQuoteLookup, presentation.iconSize)
        },
        quoteNext: {
            primary: config.general?.iconColorQuoteNext || '#9ba2ab',
            secondary: config.general?.iconColor2QuoteNext || '#ffffff',
            hover: config.general?.iconColorHoverQuoteNext || '#0b81b8',
            size: pxSize(config.general?.iconSizeQuoteNext, presentation.iconSize)
        },
        popoverClose: {
            primary: config.general?.iconColorPopoverClose || '#6b7580',
            secondary: config.general?.iconColor2PopoverClose || '#ffffff',
            hover: config.general?.iconColorHoverPopoverClose || '#0b81b8',
            size: pxSize(config.general?.iconSizePopoverClose, presentation.iconSize)
        },
        attachmentUpload: {
            primary: config.general?.iconColorAttachmentUpload || '#0b81b8',
            secondary: config.general?.iconColor2AttachmentUpload || '#ffffff',
            hover: config.general?.iconColorHoverAttachmentUpload || '#07638c',
            size: pxSize(config.general?.iconSizeAttachmentUpload, presentation.iconSize)
        },
        attachmentDownload: {
            primary: config.general?.iconColorAttachmentDownload || '#0b81b8',
            secondary: config.general?.iconColor2AttachmentDownload || '#ffffff',
            hover: config.general?.iconColorHoverAttachmentDownload || '#07638c',
            size: pxSize(config.general?.iconSizeAttachmentDownload, presentation.iconSize)
        },
        attachmentReplace: {
            primary: config.general?.iconColorAttachmentReplace || '#0b81b8',
            secondary: config.general?.iconColor2AttachmentReplace || '#ffffff',
            hover: config.general?.iconColorHoverAttachmentReplace || '#07638c',
            size: pxSize(config.general?.iconSizeAttachmentReplace, presentation.iconSize)
        }
    };
    setTopIcon(prevQuoteButton, rowIcons.quotePrev, 'Anterior');
    setTopIcon(nextQuoteButton, rowIcons.quoteNext, 'Siguiente');
    setTopIcon(openQuoteBrowserButton, rowIcons.quoteLookup, 'Buscar cotización');
    [prevQuoteButton, nextQuoteButton, openQuoteBrowserButton].forEach((button, index) => {
        const key = index === 0 ? 'quotePrev' : index === 1 ? 'quoteNext' : 'quoteLookup';
        styleIconButton(button, getRowPalette(key, 18));
    });
    if (pickAttachmentsButton) {
        pickAttachmentsButton.innerHTML = iconMarkup(rowIcons.attachmentUpload, 'Elegir archivo', 'table-icon-media');
        const palette = getRowPalette('attachmentUpload', 18);
        pickAttachmentsButton.style.color = palette.primary;
        pickAttachmentsButton.style.setProperty('--icon-hover-color', palette.hover);
        pickAttachmentsButton.style.setProperty('--config-icon-size', `${palette.size}px`);
        pickAttachmentsButton.style.width = `${palette.size}px`;
        pickAttachmentsButton.style.height = `${palette.size}px`;
    }
    if (uploadAttachmentsButton) {
        uploadAttachmentsButton.innerHTML = iconMarkup(rowIcons.attachmentReplace, 'Subir archivo', 'table-icon-media');
        const palette = getRowPalette('attachmentReplace', 18);
        uploadAttachmentsButton.style.color = palette.primary;
        uploadAttachmentsButton.style.setProperty('--icon-hover-color', palette.hover);
        uploadAttachmentsButton.style.setProperty('--config-icon-size', `${palette.size}px`);
        uploadAttachmentsButton.style.width = `${palette.size}px`;
        uploadAttachmentsButton.style.height = `${palette.size}px`;
    }
    document.querySelectorAll('.calc-popover-close').forEach((button) => {
        button.innerHTML = iconMarkup(rowIcons.popoverClose, 'Cerrar', 'table-icon-media');
        const palette = getRowPalette('popoverClose', 18);
        button.style.color = palette.primary;
        button.style.setProperty('--icon-hover-color', palette.hover);
        button.style.setProperty('--config-icon-size', `${palette.size}px`);
    });

    const root = document.documentElement;
    const layout = config.layout || {};

    const pFieldHeight = presentation.fieldHeight;
    const pFieldFontSize = presentation.fieldFontSize;

    root.style.setProperty('--logo-width', `${Number(layout.logoWidth) || 116}px`);
    console.log('Setting --logo-width to:', Number(layout.logoWidth) || 116, 'px');
    root.style.setProperty('--header-label-width', `${layout.headerLabelWidth || 58}px`);
    root.style.setProperty('--field-font-family', presentation.fieldFontFamily);
    root.style.setProperty('--field-height', `${pFieldHeight}px`);
    root.style.setProperty('--field-font-size', `${pFieldFontSize}px`);

    if (presentation.labelAlign) root.style.setProperty('--form-label-align', presentation.labelAlign);
    root.style.setProperty('--form-input-medium', presentation.mediumInputWidth ? `${presentation.mediumInputWidth}px` : '100%');
    root.style.setProperty('--form-input-large', presentation.largeInputWidth ? `${presentation.largeInputWidth}px` : '100%');

    const c1 = presentation.headerBgStart;
    const c2 = presentation.headerBgEnd;
    root.style.setProperty('--header-bg-start', c1);
    root.style.setProperty('--header-bg-end', c2);
    root.style.setProperty('--quote-number-font-size', `${layout.quoteNumberFontSize || 16}px`);
    root.style.setProperty('--table-row-height', `${presentation.tableRowHeight}px`);
    root.style.setProperty('--table-header-font-size', `${presentation.tableHeaderFontSize}px`);
    root.style.setProperty('--table-header-font-family', presentation.tableHeaderFontFamily);
    root.style.setProperty('--table-font-size', `${layout.tableFontSize || 12}px`);
    root.style.setProperty('--tab-width', presentation.tabWidth ? `${presentation.tabWidth}px` : 'auto');
    root.style.setProperty('--tab-height', `${presentation.tabHeight}px`);
    root.style.setProperty('--tab-color', presentation.tabColor || config.general?.tabColor || '#7f7f7f');
    root.style.setProperty('--config-icon-size', `${presentation.iconSize}px`);
    root.style.setProperty('--icon-color', config.general?.iconColor || '#9ba2ab');
    root.style.setProperty('--page-margin-top', `${presentation.pageMarginTop}px`);
    root.style.setProperty('--page-margin-right', `${presentation.pageMarginRight}px`);
    root.style.setProperty('--page-margin-bottom', `${presentation.pageMarginBottom}px`);
    root.style.setProperty('--page-margin-left', `${presentation.pageMarginLeft}px`);
    root.style.setProperty('--brand-width', `${presentation.brandWidth}px`);
    root.style.setProperty('--brand-color', presentation.brandColor || '#ffffff');
    root.style.setProperty('--brand-font-family', presentation.brandFontFamily);
    root.style.setProperty('--brand-font-size', `${presentation.brandFontSize}px`);
    root.style.setProperty('--brand-vertical-align', getFlexAlign(presentation.brandVerticalAlign, 'center'));
    root.style.setProperty('--brand-horizontal-align', getFlexAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-text-align', getTextAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-margin-top', `${presentation.brandMarginTop}px`);
    root.style.setProperty('--brand-margin-right', `${presentation.brandMarginRight}px`);
    root.style.setProperty('--brand-margin-bottom', `${presentation.brandMarginBottom}px`);
    root.style.setProperty('--brand-margin-left', `${presentation.brandMarginLeft}px`);
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
    root.style.setProperty('--app-font-family', config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
    syncQuoteNumberFieldAppearance(config);
}

async function loadConfig() {
    const cachedConfig = readCache(GENERAL_CONFIG_CACHE_KEY, GENERAL_CONFIG_CACHE_TTL_MS);
    if (cachedConfig) {
        applyConfig(cachedConfig);
    }

    const response = await fetch(CONFIG_ENDPOINT, { cache: 'no-cache' });
    if (!response.ok) {
        if (cachedConfig) return;
        throw new Error('No se pudo cargar la configuración.');
    }

    const freshConfig = await response.json();
    if (!areJsonEqual(freshConfig, cachedConfig)) {
        writeCache(GENERAL_CONFIG_CACHE_KEY, freshConfig);
    }
    if (!cachedConfig || !areJsonEqual(freshConfig, cachedConfig)) {
        applyConfig(freshConfig);
    }
}

async function fetchQuoteDetail(code) {
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error('No se pudo cargar la cotización.');
    return response.json();
}

async function loadQuoteCatalog(search = '', updateNavigation = true) {
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('q', search);
    const response = await fetch(`${QUOTES_ENDPOINT}?${params.toString()}`);
    if (!response.ok) throw new Error('No se pudo cargar el catálogo de cotizaciones.');
    const payload = await response.json();
    const items = payload.cotizaciones || [];
    if (updateNavigation) {
        quoteCatalog = items;
        syncQuoteCatalogIndex();
        updateQuoteRecordStatus();
    }
    return items;
}

function syncQuoteCatalogIndex() {
    quoteCatalogIndex = quoteCatalog.findIndex((quote) => quote.quote_code === currentQuote?.quote_code);
}

function updateQuoteRecordStatus() {
    return;
}

async function goToQuoteByCode(code) {
    if (!code) return;
    await navigateToQuote(code);
}

async function moveQuote(step) {
    if (!quoteCatalog.length) {
        await loadQuoteCatalog('');
    }
    syncQuoteCatalogIndex();
    const nextIndex = quoteCatalogIndex + step;
    if (nextIndex < 0 || nextIndex >= quoteCatalog.length) return;
    return goToQuoteByCode(quoteCatalog[nextIndex].quote_code);
}

async function openQuoteBrowser() {
    if (!quoteCatalog.length) {
        await loadQuoteCatalog('');
    }
    if (quoteBrowserPopover) {
        quoteBrowserPopover.hidden = false;
        quoteBrowserPopover.classList.add('is-visible');
        document.body.classList.add('popover-open');
    }
    if (quoteBrowserSearchInput) {
        quoteBrowserSearchInput.value = '';
    }
    renderQuoteBrowserResults(quoteCatalog);
}

function renderQuoteBrowserResults(items = []) {
    if (!quoteBrowserResults) return;
    if (!items.length) {
        quoteBrowserResults.innerHTML = '<tr><td colspan="5">No hay cotizaciones disponibles.</td></tr>';
        return;
    }
    quoteBrowserResults.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.quote_code || '')}</td>
            <td>${escapeHtml(item.customer_code || '')}</td>
            <td>${escapeHtml(item.customer_name || '')}</td>
            <td>${escapeHtml(formatDate(item.created_on) || '')}</td>
            <td><button type="button" class="copy-popover-send" data-action="open-selected-quote" data-quote-code="${escapeHtml(item.quote_code)}">Abrir</button></td>
        </tr>
    `).join('');
}

async function loadInitialQuote() {
    await loadQuoteCatalog('');
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');
    const copyLine = params.get('copyLine');
    if (codigo) {
        applyQuotePayload(await fetchQuoteDetail(codigo));
        window.history.replaceState({ codigo }, '', `/?codigo=${encodeURIComponent(codigo)}`);
        if (copyLine) {
            setTimeout(() => {
                const row = quoteRows.find((item) => String(item.linea || item.originalLinea || '') === copyLine);
                if (row) openCopyPopover(row.id);
            }, 150);
        }
        return;
    }

    const listResponse = await fetch(`${QUOTES_ENDPOINT}?limit=20`);
    if (!listResponse.ok) throw new Error('No se pudo cargar la lista de cotizaciones.');
    const listPayload = await listResponse.json();
    const quotes = listPayload.cotizaciones || [];
    if (!quotes.length) {
        applyQuotePayload({ cotizacion: null, lineas: [], resumen: {} });
        return;
    }

    let chosenPayload = null;
    for (const quote of quotes) {
        const detail = await fetchQuoteDetail(quote.quote_code);
        if ((detail.lineas || []).length) {
            chosenPayload = detail;
            break;
        }
        if (!chosenPayload) {
            chosenPayload = detail;
        }
    }

    applyQuotePayload(chosenPayload || { cotizacion: null, lineas: [], resumen: {} });
    if (chosenPayload?.cotizacion?.quote_code) {
        window.history.replaceState({ codigo: chosenPayload.cotizacion.quote_code }, '', `/?codigo=${encodeURIComponent(chosenPayload.cotizacion.quote_code)}`);
    }
}

rowsBody?.addEventListener('click', async (event) => {
    if (event.target.closest('button, input, select, a, [data-action]')) {
        return;
    }
    const rowElement = event.target.closest('tr[data-id]');
    if (rowElement) {
        const nextRowId = Number(rowElement.dataset.id);
        if (activeRowId === nextRowId) return;
        rowsBody.querySelector(`tr[data-id="${activeRowId}"]`)?.classList.remove('is-active');
        activeRowId = nextRowId;
        rowElement.classList.add('is-active');
    }
});

function startRowDrag(event, handle) {
    const rowElement = handle.closest('tr[data-id]');
    if (!rowElement) return;

    event.preventDefault();
    draggedRowId = Number(rowElement.dataset.id);
    dropTargetRowId = null;
    dropAfterTarget = false;
    clearDropIndicators();
    rowElement.classList.add('is-dragging');
    createDragGhost(rowElement, event.clientX, event.clientY);
    if (event.pointerId !== undefined && handle.setPointerCapture) {
        handle.setPointerCapture(event.pointerId);
        dragPointerHandle = handle;
    }
}

rowsBody?.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-action="drag-handle"]');
    if (!handle) return;
    startRowDrag(event, handle);
    document.addEventListener('pointermove', handlePointerDragMove);
    document.addEventListener('pointerup', finishPointerDrag);
    document.addEventListener('pointercancel', finishPointerDrag);
});

rowsBody?.addEventListener('mousedown', (event) => {
    const handle = event.target.closest('[data-action="drag-handle"]');
    if (!handle || draggedRowId) return;
    startRowDrag(event, handle);
    document.addEventListener('mousemove', handlePointerDragMove);
    document.addEventListener('mouseup', finishPointerDrag);
});

rowsBody?.addEventListener('focusin', (event) => {
    if (event.target.closest('button, [data-action]')) return;
    const rowElement = event.target.closest('tr[data-id]');
    if (!rowElement) return;
    activeRowId = Number(rowElement.dataset.id);
});

rowsBody?.addEventListener('input', (event) => {
    const target = event.target;
    const rowId = Number(target.dataset.id);
    const field = target.dataset.field;
    if (!rowId || !field) return;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    updateRowLocal(rowId, field, value);
    scheduleLineSave(rowId);
});

filterInput?.addEventListener('input', renderRows);
menuToggle?.addEventListener('click', (event) => { event.stopPropagation(); toggleMenu(); });
menuShortcutButton?.addEventListener('click', () => toggleMenu());
newQuoteButton?.addEventListener('click', () => createNewQuote().catch((error) => setStatus(error.message, 'error')));
saveQuoteButton?.addEventListener('click', () => saveQuoteHeader().catch((error) => setStatus(error.message, 'error')));
openConfigButton?.addEventListener('click', () => {
    toggleMenu(false);
    openConfigPopover();
});
viewProformaButton?.addEventListener('click', openProformaForCurrentQuote);
Object.keys(headerFieldMap).forEach((id) => {
    const element = document.getElementById(id);
    if (!element || id === 'numeroCotizacion') return;
    element.addEventListener('input', scheduleQuoteSave);
});

document.addEventListener('click', (event) => {
    if (!menuPanel || menuPanel.hidden) return;
    if (menuPanel.contains(event.target) || menuToggle.contains(event.target)) return;
    if (event.target.closest('a[href]')) return;
    toggleMenu(false);
});

document.addEventListener('click', (event) => {
    if (rowActionMenu && !rowActionMenu.hidden && !rowActionMenu.contains(event.target) && !event.target.closest('[data-action="toggle-row-menu"]')) {
        if (event.target.closest('a[href]')) return;
        closeRowMenu();
    }
});

rowActionMenu?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-row-action]');
    if (!actionButton) return;
    event.preventDefault();
    const rowId = Number(actionButton.dataset.id);
    handleRowMenuAction(actionButton.dataset.rowAction, rowId).catch((error) => setStatus(error.message, 'error'));
});

configPopover?.addEventListener('click', (event) => {
    const actionTarget = event.target.closest('[data-action="close-config-popover"]');
    if (actionTarget) {
        closeConfigPopover();
    }
});

copyLinePopover?.addEventListener('click', (event) => {
    const actionTarget = event.target.closest('[data-action="close-copy-popover"]');
    if (actionTarget) {
        closeCopyPopover();
    }
});

attachmentsPopover?.addEventListener('click', (event) => {
    const actionTarget = event.target.closest('[data-action="close-attachments-popover"]');
    if (actionTarget) {
        closeAttachmentsPopover();
    }
});

quoteBrowserPopover?.addEventListener('click', (event) => {
    const actionTarget = event.target.closest('[data-action="close-quote-browser"]');
    if (actionTarget) {
        closeQuoteBrowserPopover();
    }
});

closeConfigPopoverButton?.addEventListener('click', closeConfigPopover);
closeCopyLinePopoverButton?.addEventListener('click', closeCopyPopover);
closeAttachmentsPopoverButton?.addEventListener('click', closeAttachmentsPopover);
closeQuoteBrowserButton?.addEventListener('click', closeQuoteBrowserPopover);

configPopoverFrame?.addEventListener('load', () => {
    if (configPopoverNotice) {
        configPopoverNotice.hidden = true;
    }
});

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'close-config-popover') {
        closeConfigPopover();
    }
    if (event.data?.type === 'erp-general-config-updated') {
        if (event.data.config && typeof event.data.config === 'object') {
            writeCache(GENERAL_CONFIG_CACHE_KEY, event.data.config);
            applyConfig(event.data.config);
            renderRows();
            return;
        }
        loadConfig().then(renderRows).catch((error) => setStatus(error.message, 'error'));
    }
});

window.addEventListener('storage', (event) => {
    if (event.key !== 'erp-general-config-updated') return;
    loadConfig().then(renderRows).catch((error) => setStatus(error.message, 'error'));
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        refreshQuoteIfNeeded();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && copyLinePopover && !copyLinePopover.hidden) {
        closeCopyPopover();
    }
    if (event.key === 'Escape' && attachmentsPopover && !attachmentsPopover.hidden) {
        closeAttachmentsPopover();
    }
    if (event.key === 'Escape' && rowActionMenu && !rowActionMenu.hidden) {
        closeRowMenu();
    }
    if (event.key === 'Escape' && quoteBrowserPopover && !quoteBrowserPopover.hidden) {
        closeQuoteBrowserPopover();
    }
});

copyQuoteSearchInput?.addEventListener('input', () => {
    loadCopyDestinations(copyQuoteSearchInput.value).catch((error) => {
        if (copyQuoteResults) {
            copyQuoteResults.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
        }
    });
});

copyQuoteResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="send-copy-line"]');
    if (!button) return;
    copyLineToQuote(button.dataset.quoteCode).catch((error) => setStatus(error.message, 'error'));
});

quoteBrowserSearchInput?.addEventListener('input', async () => {
    try {
        const items = await loadQuoteCatalog(quoteBrowserSearchInput.value, false);
        renderQuoteBrowserResults(items);
    } catch (error) {
        if (quoteBrowserResults) {
            quoteBrowserResults.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
        }
    }
});

quoteBrowserResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="open-selected-quote"]');
    if (!button) return;
    closeQuoteBrowserPopover();
    goToQuoteByCode(button.dataset.quoteCode);
});

prevQuoteButton?.addEventListener('click', () => moveQuote(-1));
nextQuoteButton?.addEventListener('click', () => moveQuote(1));
openQuoteBrowserButton?.addEventListener('click', () => openQuoteBrowser().catch((error) => setStatus(error.message, 'error')));
uploadAttachmentsButton?.addEventListener('click', () => uploadSelectedAttachments().catch((error) => setStatus(error.message, 'error')));
pickAttachmentsButton?.addEventListener('click', () => attachmentFileInput?.click());
attachmentFileInput?.addEventListener('change', () => {
    const files = Array.from(attachmentFileInput.files || []);
    const label = files.length ? files.map((file) => file.name).join(', ') : 'Ningun archivo seleccionado';
    if (attachmentFileName) attachmentFileName.textContent = label;
});
attachmentsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="replace-attachment"]');
    if (!button) return;
    replaceAttachmentId = button.dataset.id;
    attachmentFileInput?.click();
});
topBackButton?.addEventListener('click', () => window.history.back());
window.addEventListener('popstate', (event) => {
    const code = event.state?.codigo || new URLSearchParams(window.location.search).get('codigo');
    if (!code) return;
    fetchQuoteDetail(code)
        .then((payload) => applyQuotePayload(payload))
        .catch((error) => setStatus(error.message, 'error'));
});

(async function bootstrap() {
    try {
        await loadConfig();
        await loadTrackingUserPhotos();
        await loadInitialQuote();
        setStatus(currentQuote?.quote_code ? `Cotización ${currentQuote.quote_code} cargada.` : 'No hay cotizaciones aún.', 'saved');
    } catch (error) {
        console.error(error);
        renderRows();
        setStatus(error.message, 'error');
    }
})();
