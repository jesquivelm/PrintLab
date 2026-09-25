
const statusBox = document.getElementById('orderStatus');
const contentBox = document.getElementById('orderContent');
const shellEmbedded = new URLSearchParams(window.location.search).get('shell') === '1' || window !== window.parent;

const sourceQuoteButton = document.getElementById('openSourceQuoteButton');
const openPlanningButton = document.getElementById('orderOpenPlanningButton');
const openPlanningQueueButton = document.getElementById('orderOpenPlanningQueueButton');
const popoverPlanningQueueButton = document.getElementById('orderPopoverPlanningQueueButton');
const releasePlanningButton = document.getElementById('orderReleasePlanningButton');
const pantonesButton = document.getElementById('orderPantonesButton');
const numberingButton = document.getElementById('orderNumberingButton');
const menuButton = document.getElementById('orderMenuButton');
const menuNavFlujo = document.getElementById('orderMenuNavFlujo');
const menuNavEntregas = document.getElementById('orderMenuNavEntregas');
const menuNavAdjuntos = document.getElementById('orderMenuNavAdjuntos');
const menuNavSap = document.getElementById('orderMenuNavSap');
const menuNavEstadoSap = document.getElementById('orderMenuNavEstadoSap');
const menuNavProcesos = document.getElementById('orderMenuNavProcesos');
const menuNavEstado = document.getElementById('orderMenuNavEstado');
const menuNavCreacion = document.getElementById('orderMenuNavCreacion');
const svgTestButton = document.getElementById('orderSvgTestButton');
const artworkDeleteButton = document.getElementById('orderArtworkDeleteButton');
const orderFlowBody = document.getElementById('orderFlowBody');
const scheduledDateInput = document.getElementById('orderScheduledDateInput');
const finishNotesInput = document.getElementById('orderFinishNotesInput');
const sapConsumptionForm = document.getElementById('sapConsumptionForm');
const sapConsumptionMaterial = document.getElementById('sapConsumptionMaterial');
const sapConsumptionProcess = document.getElementById('sapConsumptionProcess');
const sapConsumptionQuantity = document.getElementById('sapConsumptionQuantity');
const sapConsumptionReason = document.getElementById('sapConsumptionReason');
const sapConsumptionStatus = document.getElementById('sapConsumptionStatus');
const sapConsumptionHistory = document.getElementById('sapConsumptionHistory');

const planningStatusText = document.getElementById('orderPlanningStatusText');
const planningMetaText = document.getElementById('orderPlanningMetaText');
const planningReturnReasonText = document.getElementById('orderPlanningReturnReasonText');
const planningSnapshotSummary = document.getElementById('orderPlanningSnapshotSummary');
const planningSnapshotMeta = document.getElementById('orderPlanningSnapshotMeta');
const planningSnapshotList = document.getElementById('orderPlanningSnapshotList');
const deliveriesBody = document.getElementById('orderDeliveriesBody');
const deliveriesQuantityText = document.getElementById('orderDeliveriesQuantityText');
const deliveriesMessage = document.getElementById('orderDeliveriesMessage');
const pantonesPopoverBody = document.getElementById('orderPantonesPopoverBody');
const numberingPopoverBody = document.getElementById('orderNumberingPopoverBody');
const attachmentsPopoverBody = document.getElementById('orderAttachmentsPopoverBody');
const sourceQuotePopoverBody = document.getElementById('orderSourceQuotePopoverBody');
const artworkPreview = document.getElementById('orderArtworkPreview');
const outputTypeImage = document.getElementById('orderOutputTypeImage');
const finishList = document.getElementById('orderFinishList');

const samplesSummary = document.getElementById('orderSamplesSummary');
const samplesForm = document.getElementById('orderSamplesForm');
const samplesToggleButton = document.getElementById('orderSamplesToggleButton');
const samplesModeInput = document.getElementById('orderSamplesModeInput');
const samplesApprovalInput = document.getElementById('orderSamplesApprovalInput');
const samplesContactInput = document.getElementById('orderSamplesContactInput');
const samplesPhoneInput = document.getElementById('orderSamplesPhoneInput');
const samplesEmailInput = document.getElementById('orderSamplesEmailInput');
const samplesDetailInput = document.getElementById('orderSamplesDetailInput');

const deliverySummary = document.getElementById('orderDeliverySummary');
const deliveryForm = document.getElementById('orderDeliveryForm');
const deliveryToggleButton = document.getElementById('orderDeliveryToggleButton');
const deliveryModeInput = document.getElementById('orderDeliveryModeInput');
const deliveryContactInput = document.getElementById('orderDeliveryContactInput');
const deliveryPhoneInput = document.getElementById('orderDeliveryPhoneInput');
const deliveryEmailInput = document.getElementById('orderDeliveryEmailInput');
const deliveryDetailInput = document.getElementById('orderDeliveryDetailInput');

const artSummary = document.getElementById('orderArtSummary');
const artForm = document.getElementById('orderArtForm');
const artToggleButton = document.getElementById('orderArtToggleButton');
const sellerCommentsInput = document.getElementById('orderSellerCommentsInput');
const artworkHolderInput = document.getElementById('orderArtworkHolderInput');
const artworkFileInput = document.getElementById('orderArtworkFileInput');
const artSection = document.querySelector('.production-art-section');
const observationsSection = document.querySelector('.production-observations-section');

let currentOrderCode = '';
let currentLoadedOrder = null;
let currentConfig = {};
let currentOutputTypes = [];
let currentOrderAttachments = [];
let currentArtworkAttachment = null;
let currentOrderFlowSteps = [];
let currentOrderFlowPayload = null;
let currentSapConsumptionMaterials = [];
let trackingUserPhotos = new Map();
let sellerGeneroMap = new Map();

function sellerGeneroLookupKey(value) {
    return String(value || '').trim().toLowerCase();
}

function buildSellerGeneroMap(users) {
    const map = new Map();
    (Array.isArray(users) ? users : []).forEach((user) => {
        const genero = String(user.genero || '').trim().toLowerCase();
        if (genero !== 'hombre' && genero !== 'mujer') return;
        [user.name, user.fullName, user.full_name, user.sapSalespersonName, user.sap_salesperson_name].forEach((value) => {
            const key = sellerGeneroLookupKey(value);
            if (key) map.set(key, genero);
        });
    });
    sellerGeneroMap = map;
}

// Ícono de vendedor: hombre/mujer si se conoce el género (Configuración → Seguridad →
// Usuarios), genérico si no.
function sellerIconKeyFor(sellerName) {
    const genero = sellerGeneroMap.get(sellerGeneroLookupKey(sellerName));
    if (genero === 'hombre') return 'orderVendedorHombre';
    if (genero === 'mujer') return 'orderVendedorMujer';
    return 'orderVendedor';
}
let artworkSectionBaseHeight = 0;
let artworkSectionMaxHeight = 0;
let pendingArtworkTarget = null;
let isRecording = false;
let mediaRecorder = null;
let recordingChunks = [];
const SESSION_STORAGE_KEY = 'erp-user-session';

const DEFAULT_ICONS = {
    browserOpen: '↗',
    planning: '◳',
    pantones: '⟳',
    deliveries: '⇄',
    numbering: '#',
    attachments: '📎',
    flow: '≋',
    status: '◉',
    deleteArtwork: '×',
    artwork: '↥',
    toggleClosed: '▾',
    toggleOpen: '▴',
    view: '⌕'
};

const ORDER_VISIBLE_PROCESSES = ['diseno', 'preprensa', 'visto bueno', 'visto_bueno', 'planeacion', 'tintas', 'impresion', 'rebobinado', 'empaque'];

function normalizeProcessName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function isVisibleOrderProcess(value) {
    const name = normalizeProcessName(value);
    if (!name || /acabado/.test(name)) return false;
    return ORDER_VISIBLE_PROCESSES.some((item) => name.includes(item));
}

function parseJsonString(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
}

function populateDeliverySelects(config) {
    const general = config?.general || config || {};
    const sampleModes = parseJsonString(general.deliverySampleModesJson);
    const approvalRecipients = parseJsonString(general.deliveryApprovalRecipientsJson);
    const deliveryMethods = parseJsonString(general.deliveryMethodsJson);

    const samplesModeInput = document.getElementById('orderSamplesModeInput');
    const samplesApprovalInput = document.getElementById('orderSamplesApprovalInput');
    const deliveryModeInput = document.getElementById('orderDeliveryModeInput');

    if (samplesModeInput) {
        const currentVal = samplesModeInput.value;
        samplesModeInput.innerHTML = '<option value=""></option>' + sampleModes.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        if (currentVal) samplesModeInput.value = currentVal;
    }
    if (samplesApprovalInput) {
        const currentVal = samplesApprovalInput.value;
        samplesApprovalInput.innerHTML = '<option value=""></option>' + approvalRecipients.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        if (currentVal) samplesApprovalInput.value = currentVal;
    }
    if (deliveryModeInput) {
        const currentVal = deliveryModeInput.value;
        deliveryModeInput.innerHTML = '<option value=""></option>' + deliveryMethods.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        if (currentVal) deliveryModeInput.value = currentVal;
    }
}

let cachedClientContacts = [];
let cachedClientAddresses = [];

async function loadClientContacts(partnerCode) {
    if (!partnerCode) return [];
    try {
        const response = await fetch(`/api/socios/${encodeURIComponent(partnerCode)}/contactos`, { headers: sessionHeader() });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.contactos) ? data.contactos : [];
    } catch (_) {
        return [];
    }
}

async function loadClientAddresses(partnerCode) {
    if (!partnerCode) return [];
    try {
        const response = await fetch(`/api/socios/${encodeURIComponent(partnerCode)}/direcciones`, { headers: sessionHeader() });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.direcciones) ? data.direcciones : [];
    } catch (_) {
        return [];
    }
}

// El desplegable "Contacto" se llena con los contactos del socio.
// "Destinatario de Visto Bueno" NO: ese usa la lista fija de Configuración
// (deliveryApprovalRecipientsJson) y lo maneja populateDeliverySelects().
function populateSamplesContactDropdown(contacts) {
    cachedClientContacts = contacts;
    const currentValB = samplesContactInput?.value;
    const options = contacts.map(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    if (samplesContactInput) {
        samplesContactInput.innerHTML = '<option value=""></option>' + options;
        if (currentValB) samplesContactInput.value = currentValB;
    }
}

// Se invoca al elegir un contacto en el desplegable (acción explícita del
// usuario): SOBRESCRIBE teléfono/correo con los del contacto, aunque ya
// tuvieran valor. No se llama al cargar la orden.
function fillSamplesContactFields(contactName) {
    if (!contactName) {
        if (samplesPhoneInput) samplesPhoneInput.value = '';
        if (samplesEmailInput) samplesEmailInput.value = '';
        return;
    }
    const contact = cachedClientContacts.find(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
        return name === contactName;
    });
    if (!contact) {
        if (samplesPhoneInput) samplesPhoneInput.value = '';
        if (samplesEmailInput) samplesEmailInput.value = '';
        return;
    }
    if (samplesPhoneInput) samplesPhoneInput.value = contact.phone || contact.mobile || '';
    if (samplesEmailInput) samplesEmailInput.value = contact.email || '';
    fillOrderAddressFromContact('vb', contact).catch(() => null);
}

// ── Bloque de dirección estructurada (Visto Bueno / Entrega) ──────────────
// Usa el catálogo geográfico de los 8 países (tabla divisiones_geograficas,
// sincronizada con Open Admin Data). El componente direccion-pais.js adapta
// etiquetas y niveles según el país elegido; aquí solo se lee/escribe.
function orderDireccionBloque(prefix) {
    const contenedor = orderAddressBlock(prefix);
    if (!contenedor) return null;
    return window.ERPDireccionPais ? window.ERPDireccionPais.preparar(contenedor) : null;
}
function orderAddressBlock(prefix) {
    return document.querySelector(`[data-order-address-block="${prefix}"]`);
}
function orderAddrEl(prefix, field) {
    const block = orderAddressBlock(prefix);
    return block ? block.querySelector(`[data-address-field="${field}"]`) : null;
}
function refreshOrderAddressCatalogs() {
    // Con el catálogo geográfico nuevo, la cascada la maneja direccion-pais.js;
    // aquí solo nos aseguramos de que los bloques estén inicializados.
    ['vb', 'entrega'].forEach((prefix) => orderDireccionBloque(prefix));
}
function populateOrderAddressPickers(addresses) {
    cachedClientAddresses = Array.isArray(addresses) ? addresses : [];
    const options = '<option value="">Seleccionar dirección o crear nueva</option>' + cachedClientAddresses.map((a) => {
        const label = a.address_name || [a.address_line, a.district, a.state_province].filter(Boolean).join(', ') || ('Dirección ' + a.id);
        return `<option value="${escapeHtml(String(a.id))}">${escapeHtml(label)}</option>`;
    }).join('');
    ['vb', 'entrega'].forEach((prefix) => {
        const pick = orderAddrEl(prefix, 'pick');
        if (pick) pick.innerHTML = options;
    });
}
// Códigos de tipo de dirección de SAP: B = Facturación, S = Envío.
// (La traducción de siglas de país la hace direccion-pais.js al colocar la cascada.)
function nombreTipoDireccion(valor) {
    const texto = String(valor || '').trim();
    const upper = texto.toUpperCase();
    if (upper === 'B') return 'Facturación';
    if (upper === 'S') return 'Envío';
    return texto;
}
async function setOrderAddressBlock(prefix, addr) {
    addr = addr || {};
    const setSelect = (field, val) => { const el = orderAddrEl(prefix, field); if (el && el.tagName === 'SELECT') el.value = val || ''; };
    const set = (field, val) => { const el = orderAddrEl(prefix, field); if (el && el.tagName !== 'SELECT') el.value = val || ''; };
    set('addressName', addr.nombre != null ? addr.nombre : addr.address_name);
    setSelect('addressType', nombreTipoDireccion(addr.tipo != null ? addr.tipo : addr.address_type));
    set('zipCode', addr.codigoPostal != null ? addr.codigoPostal : addr.zip_code);
    set('addressLine', addr.linea != null ? addr.linea : (addr.line != null ? addr.line : addr.address_line));
    // País + cascada de niveles los coloca el componente geográfico (etiquetas
    // y niveles dependen del país: GT/SV/CR/PA traen estructura distinta).
    const bloque = orderDireccionBloque(prefix);
    if (bloque) {
        await bloque.colocar({
            pais: addr.pais != null ? addr.pais : addr.country,
            departamento: (addr.departamento != null ? addr.departamento : addr.state_province) || '',
            subnivel: addr.subnivel || '',
            zona: (addr.zona != null ? addr.zona : addr.district) || ''
        });
    }
}
function collectOrderAddress(prefix) {
    const v = (field) => { const el = orderAddrEl(prefix, field); return el ? String(el.value || '').trim() : ''; };
    const bloque = orderDireccionBloque(prefix);
    const niveles = bloque ? bloque.colectar() : {};
    return {
        line: v('addressLine'), nombre: v('addressName'), tipo: v('addressType'),
        pais: niveles.pais || '', departamento: niveles.departamento || '',
        subnivel: niveles.subnivel || '', zona: niveles.zona || '',
        codigoPostal: v('zipCode')
    };
}
async function fillOrderAddressFromContact(prefix, contact) {
    if (!contact) return;
    if (!(contact.street || contact.city || contact.state_province || contact.county || contact.zip_code)) return;
    const lineEl = orderAddrEl(prefix, 'addressLine');
    if (lineEl && !lineEl.value.trim()) lineEl.value = contact.street || '';
    const cpEl = orderAddrEl(prefix, 'zipCode');
    if (cpEl && !cpEl.value.trim()) cpEl.value = contact.zip_code || '';
    const bloque = orderDireccionBloque(prefix);
    if (bloque && contact.state_province && !bloque.colectar().departamento) {
        await bloque.colocar({ pais: bloque.colectar().pais || 'Guatemala', departamento: contact.state_province, subnivel: '', zona: contact.county || '' });
    }
}

function fillDeliveryContactFields(contactName) {
    if (!contactName) {
        if (deliveryPhoneInput) deliveryPhoneInput.value = '';
        if (deliveryEmailInput) deliveryEmailInput.value = '';
        return;
    }
    const contact = cachedClientContacts.find(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
        return name === contactName;
    });
    if (!contact) {
        if (deliveryPhoneInput) deliveryPhoneInput.value = '';
        if (deliveryEmailInput) deliveryEmailInput.value = '';
        return;
    }
    if (deliveryPhoneInput) deliveryPhoneInput.value = contact.phone || contact.mobile || '';
    if (deliveryEmailInput) deliveryEmailInput.value = contact.email || '';
    fillOrderAddressFromContact('entrega', contact).catch(() => null);
}

function formatRouteStatus(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const labels = {
        COMPLETADO: 'Completado',
        PENDIENTE: 'Pendiente',
        RUN: 'En Proceso',
        SETUP: 'Setup',
        PARO: 'Paro'
    };
    return labels[normalized] || (value ? String(value).trim() : 'Pendiente');
}

function findReceivedStep(process = {}) {
    const plannedName = normalizeProcessName(process.processName || process.processKey);
    if (!plannedName) return null;
    return currentOrderFlowSteps.find((step) => {
        const stepName = normalizeProcessName(step.processName || step.processKey);
        return isVisibleOrderProcess(stepName) && (stepName === plannedName || stepName.includes(plannedName) || plannedName.includes(stepName));
    }) || null;
}

function trackingUserLookupKey(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function initialsFromName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
}

function trackingAvatarMarkup(name, photoOverride) {
    const photo = String(photoOverride || '').trim() || trackingUserPhotos.get(trackingUserLookupKey(name));
    const initials = escapeHtml(initialsFromName(name).toUpperCase());
    if (!photo) return initials;
    return `<img class="tracking-avatar-image" src="${escapeHtml(photo)}" alt="${escapeHtml(name || 'Usuario')}" data-tracking-avatar-img><span class="tracking-avatar-fallback" hidden>${initials}</span>`;
}

function bindTrackingAvatarFallback(root = document) {
    root.querySelectorAll?.('[data-tracking-avatar-img]').forEach((image) => {
        image.addEventListener('error', () => {
            image.hidden = true;
            const fallback = image.parentElement?.querySelector('.tracking-avatar-fallback');
            if (fallback) fallback.hidden = false;
        }, { once: true });
    });
}

async function loadTrackingUserPhotos() {
    try {
        const response = await fetch('/api/admin-users', { headers: sessionHeader() });
        const users = response.ok ? await response.json() : [];
        const map = new Map();
        users.forEach((user) => {
            const photo = String(user.photoUrl || user.photo_url || '').trim();
            [user.name, user.fullName, user.full_name, user.username, user.sapSalespersonName, user.sap_salesperson_name].forEach((value) => {
                const key = trackingUserLookupKey(value);
                if (key && photo && !map.has(key)) map.set(key, photo);
            });
        });
        trackingUserPhotos = map;
    } catch (error) {
        trackingUserPhotos = new Map();
    }
}

if (shellEmbedded) document.body.classList.add('shell-embedded');

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value, withTime = false) {
    if (!value) return '';
    const dateOnly = !withTime && String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dateForSchedule(value) {
    const dateOnly = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return new Date(value);
}

function parseNumber(value, suffix = '') {
    const num = Number(value);
    if (!Number.isFinite(num)) return value || '';
    return `${num.toLocaleString('es-CR', { maximumFractionDigits: 2 })}${suffix}`;
}

function normalizeDateInputValue(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    if (!text) return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function pickFirst(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function readUserSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
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
            name: session.fullName || session.name || session.user || session.username || '',
            fullName: session.fullName || session.name || '',
            photoUrl: session.photoUrl || session.photo_url || '',
            permissionName: session.permissionName || ''
        })
    };
}

function currentSessionDisplayName() {
    const session = readUserSession();
    if (!session) return '';
    return [session.fullName, session.name, session.displayName, session.user, session.username, session.email]
        .map(function (value) { return String(value || '').trim(); })
        .find(Boolean) || '';
}

function setText(id, value, fallback = 'Sin definir') {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value || fallback).trim() || fallback;
}

function setOptionalText(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(value || '').trim();
}

function setOptionalHtml(id, html) {
    const node = document.getElementById(id);
    if (!node) return;
    node.innerHTML = html || '';
}

function setHtml(id, value) {
    const node = document.getElementById(id);
    if (node) node.innerHTML = value;
}

function formatDimensionPiece(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    const formatted = num % 1 === 0 ? String(num) : num.toLocaleString('es-CR', { maximumFractionDigits: 3 });
    return `${formatted}"`;
}

function buildDimensionsText(detail = {}) {
    const width = formatDimensionPiece(detail.widthInches);
    const length = formatDimensionPiece(detail.lengthInches);
    if (width && length) return `${width} x ${length}`;
    return width || length || '';
}

/* Formato para el paréntesis del Nombre del Trabajo: número con 2 decimales,
   coma como separador decimal (Costa Rica) y '' como símbolo de pulgadas. */
function formatDimensionPieceForJobName(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '';
    const formatted = num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted}''`;
}

function buildJobNameDimensions(detail = {}) {
    const width = formatDimensionPieceForJobName(detail.widthInches);
    const length = formatDimensionPieceForJobName(detail.lengthInches);
    if (width && length) return `${width} x ${length}`;
    return width || length || '';
}

function popoverDetailRow(label, value, unit, wide) {
    const isEmpty = value === null || value === undefined || value === '';
    const displayValue = isEmpty ? '—' : escapeHtml(String(value));
    const unitText = unit ? ` <span class="production-popover-unit">${escapeHtml(unit)}</span>` : '';
    const wideClass = wide ? ' production-popover-row-wide' : '';
    return `<div class="production-popover-row${wideClass}"><span class="production-popover-label">${escapeHtml(label)}</span><span class="production-popover-field">${displayValue}${unitText}</span></div>`;
}

function popoverDetailSection(title, items) {
    if (!items || !items.length) return '';
    const isLegacy = typeof items[0] === 'string';
    const titleHtml = title ? `<div class="production-popover-section-title">${escapeHtml(title)}</div>` : '';
    if (isLegacy) {
        return `<div class="production-popover-section">${titleHtml}${items.join('')}</div>`;
    }
    if (items.length === 1) {
        return `<div class="production-popover-section">${titleHtml}<div class="production-popover-tab-panel active">${items[0].content}</div></div>`;
    }
    const tabId = 'popTab_' + Math.random().toString(36).slice(2, 8);
    const tabHeaders = items.map((t, i) => `<button type="button" class="production-popover-tab${i === 0 ? ' active' : ''}" data-popover-tab="${tabId}" data-tab-index="${i}">${escapeHtml(t.label)}</button>`).join('');
    const tabPanels = items.map((t, i) => `<div class="production-popover-tab-panel${i === 0 ? ' active' : ''}" data-popover-panel="${tabId}" data-tab-index="${i}">${t.content}</div>`).join('');
    return `<div class="production-popover-section">${titleHtml}<div class="production-popover-tabs">${tabHeaders}</div>${tabPanels}</div>`;
}

function openDetailPopover(bodyId, html) {
    const body = document.getElementById(bodyId);
    if (body) body.innerHTML = html || '<div class="production-summary-empty">Sin datos disponibles.</div>';
    body.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-popover-tab]');
        if (!tabBtn) return;
        const tabGroupId = tabBtn.dataset.popoverTab;
        const idx = tabBtn.dataset.tabIndex;
        body.querySelectorAll(`[data-popover-tab="${tabGroupId}"]`).forEach(b => b.classList.toggle('active', b.dataset.tabIndex === idx));
        body.querySelectorAll(`[data-popover-panel="${tabGroupId}"]`).forEach(p => p.classList.toggle('active', p.dataset.tabIndex === idx));
    });
    const popoverId = bodyId.replace('Body', 'Popover');
    openPopover(popoverId);
}

function formatMoney(val) {
    const n = Number(val);
    if (!n && n !== 0) return '—';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(val, decimals) {
    const n = Number(val);
    if (!n && n !== 0) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
}

// La orden guarda consumo de sustrato en pies (columnas *_pies* del cálculo);
// se muestra en metros — las dimensiones del producto (ancho/largo) se quedan
// en pulgadas, ese es el estándar del negocio, no se convierten.
function feetToMeters(val) {
    const n = Number(val);
    if (!n && n !== 0) return 0;
    return n * 0.3048;
}

function formatMeters(feetVal, decimals) {
    return formatNumber(feetToMeters(feetVal), decimals != null ? decimals : 1);
}

// Tiempo legible para el usuario: minutos sueltos si es < 1 h; "1h 25min" hasta < 1 día;
// "2d 3h 15min" si se pasa de un día. Devuelve '' para 0 / no numérico (para ocultar la fila).
function formatDuracion(minutos) {
    var total = Math.round(Number(minutos) || 0);
    if (total <= 0) return '';
    var dias = Math.floor(total / 1440);
    var horas = Math.floor((total % 1440) / 60);
    var mins = total % 60;
    var partes = [];
    if (dias) partes.push(dias + 'd');
    if (horas) partes.push(horas + 'h');
    if (mins || !partes.length) partes.push(mins + 'min');
    return partes.join(' ');
}

function buildInkConfig(detail = {}, raw = {}) {
    const hasCmyk = String(raw['CMYK'] || '').toLowerCase() === 'si' || raw['GENERAL | CMYK'] === true;
    const hasWhite = String(raw['TINTA BLANCA'] || '').toLowerCase() === 'si' || raw['GENERAL | TINTA BLANCA'] === true;
    const hasDoubleWhite = String(raw['DOBLE PASADA BLANCA'] || '').toLowerCase() === 'si';
    const hasNoPrint = String(raw['SIN IMPRESION'] || '').toLowerCase() === 'si';
    if (hasNoPrint) return 'Sin Impresión';
    const parts = [];
    if (detail.tintCount) {
        const tintCountText = parseNumber(detail.tintCount);
        parts.push(hasCmyk && Number(detail.tintCount) === 4 ? tintCountText + ' Tintas (CMYK)' : tintCountText + ' Tintas');
    } else if (hasCmyk) {
        parts.push('4 Tintas (CMYK)');
    }
    if (hasWhite) parts.push('Blanco');
    if (hasDoubleWhite) parts.push('Doble Pasada de Blanco');
    const uiState = raw['Estado_UI'] || {};
    const stages = Array.isArray(uiState.printStages) ? uiState.printStages : [];
    const inkNames = [];
    stages.forEach(function (stage) {
        if (stage.inkMaterialDesc) inkNames.push(stage.inkMaterialDesc);
        if (hasWhite && stage.whiteInkMaterialDesc && !inkNames.some(function (n) { return n === stage.whiteInkMaterialDesc; })) {
            inkNames.push(stage.whiteInkMaterialDesc);
        }
    });
    if (inkNames.length) parts.push('(' + inkNames.join(', ') + ')');
    return parts.join(' / ');
}

function isNoPrint(detail = {}, raw = {}) {
    return /sin impresión/i.test(buildInkConfig(detail, raw)) || String(raw['SIN IMPRESION'] || '').toLowerCase() === 'si';
}

function getPlanningControl(raw = {}) {
    const existing = raw.planning_control || raw.planningControl || {};
    const promisedDeliveryDate = existing.promisedDeliveryDate || raw.quote_snapshot?.due_on || null;
    const planningStatus = existing.planningStatus || (existing.launchedToGantt ? 'EN_GANTT' : existing.salesReleased ? 'PENDIENTE_PLANIFICACION' : 'PENDIENTE_VENTAS');
    return {
        salesReleased: Boolean(existing.salesReleased),
        salesReleasedAt: existing.salesReleasedAt || null,
        salesReleasedBy: existing.salesReleasedBy || '',
        planningStatus,
        launchedToGantt: Boolean(existing.launchedToGantt || planningStatus === 'EN_GANTT'),
        launchedAt: existing.launchedAt || null,
        launchedBy: existing.launchedBy || '',
        returnedAt: existing.returnedAt || null,
        returnedBy: existing.returnedBy || '',
        returnReason: existing.returnReason || '',
        promisedDeliveryDate
    };
}

function renderPlanningControl(raw = {}) {
    const control = getOrderPlanningControlFromRaw(raw);
    if (!planningStatusText) return;
    if (control.salesReleased) {
        if (control.launchedToGantt) {
            planningStatusText.textContent = 'Lanzada a planificación';
            planningStatusText.style.color = 'var(--app-success, #16a34a)';
            if (releasePlanningButton) {
                releasePlanningButton.disabled = true;
                releasePlanningButton.textContent = 'Ya Lanzada a Planificación';
            }
        } else if (control.planningStatus === 'PENDIENTE_PLANIFICACION') {
            planningStatusText.innerHTML = 'Pendiente en planificación <span class="live-dot" style="width:6px;height:6px;display:inline-block;margin-left:4px;"></span>';
            planningStatusText.style.color = 'var(--app-warning, #b7791f)';
            if (releasePlanningButton) {
                releasePlanningButton.disabled = true;
                releasePlanningButton.textContent = 'Pendiente en Planificación';
            }
        } else {
            planningStatusText.textContent = 'Liberada a planificación';
            planningStatusText.style.color = 'var(--app-primary, #0277a9)';
            if (releasePlanningButton) {
                releasePlanningButton.disabled = false;
                releasePlanningButton.textContent = 'Reliberar a Planificación';
            }
        }
    } else if (control.planningStatus === 'DEVUELTA_VENTAS') {
        planningStatusText.textContent = 'Devuelta por planificación';
        planningStatusText.style.color = 'var(--app-danger, #dc2626)';
        if (releasePlanningButton) {
            releasePlanningButton.disabled = false;
            releasePlanningButton.textContent = 'Reliberar a Planificación';
        }
    } else {
        if (releasePlanningButton) {
            releasePlanningButton.disabled = false;
            releasePlanningButton.textContent = 'Liberar a Planificación';
        }
    }
    if (planningReturnReasonText) {
        planningReturnReasonText.hidden = control.planningStatus !== 'DEVUELTA_VENTAS';
        planningReturnReasonText.textContent = control.returnReason ? 'Última devolución: ' + control.returnReason : '';
    }
}
async function updatePlanningControl(action) {
    if (!currentOrderCode) return;
    var btn = document.getElementById('flowReleasePlanningButton') || releasePlanningButton;
    if (btn) { btn.disabled = true; btn._prevText = btn.textContent; btn.textContent = 'Guardando...'; }
    try {
        const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(currentOrderCode)}/planning-control`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...sessionHeader() },
            body: JSON.stringify({ action })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el control de planificación.');
        currentLoadedOrder = payload.orden;
        renderOrder(currentLoadedOrder);
        notify('Planificación actualizada', action === 'release-sales' ? 'Orden liberada a planificación' : 'Orden lanzada a Gantt', 'success');
    } catch (error) {
        if (btn) { btn.disabled = false; btn.textContent = btn._prevText || 'Liberar a Planificación'; }
        var metaEl = document.getElementById('flowPlanningMetaText') || planningMetaText;
        if (metaEl) metaEl.textContent = error.message;
    }
}

let _cotizadoVsProducido = 'cotizado';

function toggleCotizadoProducido(mode) {
    _cotizadoVsProducido = mode;
    if (currentLoadedOrder) renderPlanningSnapshot(currentLoadedOrder);
}

function renderPlanningSnapshot(raw = {}) {
    if (!planningSnapshotSummary || !planningSnapshotMeta || !planningSnapshotList) return;
    const snapshot = raw.planning_snapshot || raw.planningSnapshot || null;
    const processes = (Array.isArray(snapshot?.processes) ? snapshot.processes : []).filter((process) => isVisibleOrderProcess(process.processName || process.processKey));
    if (!snapshot || !processes.length) {
        planningSnapshotSummary.innerHTML = '<div class="line-tracking-head production-flow-history-head"><strong>Ruta de Planificación</strong><span>0 procesos</span></div>';
        planningSnapshotMeta.textContent = 'Cuando se regenere o se cree una orden nueva, aquí aparecerán los tiempos por proceso.';
        planningSnapshotList.innerHTML = '<div class="production-order-planning-empty">Sin procesos planeados todavía.</div>';
        return;
    }
    const doneCount = processes.filter((process) => findReceivedStep(process)).length;
    planningSnapshotSummary.innerHTML = `
        <div class="line-tracking-head production-flow-history-head">
            <strong>Ruta de Planificación</strong>
            <span>${doneCount} de ${processes.length} marcados</span>
        </div>
    `;
    planningSnapshotMeta.textContent = `Generada ${formatDate(snapshot.generatedAt, true)}. Base: ${snapshot.processType || 'Sin tipo'}${snapshot.sourceMachineName ? ` · Máquina sugerida: ${snapshot.sourceMachineName}` : ''}.`;
    planningSnapshotList.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
            <span style="font-size:12px;color:var(--ink-4);font-family:var(--mono)">Ver:</span>
            <button type="button" class="tl-tab-btn ${_cotizadoVsProducido === 'cotizado' ? 'active' : ''}" onclick="toggleCotizadoProducido('cotizado')" style="font-size:12px;padding:4px 12px;border-radius:999px;border:1px solid var(--ink-6);background:${_cotizadoVsProducido === 'cotizado' ? 'var(--flow-blue);color:#fff' : 'var(--ink-7);color:var(--ink-3)'};cursor:pointer;transition:.15s">Cotizado</button>
            <button type="button" class="tl-tab-btn ${_cotizadoVsProducido === 'producido' ? 'active' : ''}" onclick="toggleCotizadoProducido('producido')" style="font-size:12px;padding:4px 12px;border-radius:999px;border:1px solid var(--ink-6);background:${_cotizadoVsProducido === 'producido' ? 'var(--flow-blue);color:#fff' : 'var(--ink-7);color:var(--ink-3)'};cursor:pointer;transition:.15s">Producido</button>
        </div>
        <div class="production-flow-history">
            ${processes.map((process) => {
                const received = findReceivedStep(process);
                const receivedStatus = formatRouteStatus(received?.routeStatus);
                const receivedUser = received?.completedBy || received?.startedBy || '';
                const receivedDate = formatDate(received?.completedAt || received?.startedAt, true);
                const avatarName = receivedUser || 'Pendiente';
                const plannedDuration = parseNumber(process.durationHours, ' h') || '0 h';
                const plannedSetup = parseNumber(process.setupMinutes, ' min') || '0 min';
                const actualMinutes = received?.actualMinutes || received?.realMinutes || 0;
                const actualDuration = _cotizadoVsProducido === 'producido' && actualMinutes > 0 ? formatFlowMinutes(actualMinutes) : plannedDuration;
                const actualSetup = _cotizadoVsProducido === 'producido' && received?.actualSetupMinutes ? formatFlowMinutes(received.actualSetupMinutes) : plannedSetup;
                return `
                    <article class="line-tracking-item production-flow-history-row${received ? ' is-done' : ''}">
                        <span class="line-tracking-avatar${trackingUserPhotos.get(trackingUserLookupKey(avatarName)) ? ' has-photo' : ''}">${trackingAvatarMarkup(avatarName)}</span>
                        <div class="production-flow-history-body">
                            <div class="production-flow-history-plan">
                                <div class="production-flow-history-title">
                                    <strong>${escapeHtml(process.processName || process.processKey || 'Proceso')}</strong>
                                    ${process.sequenceOrder ? `<span>Proceso ${escapeHtml(String(process.sequenceOrder))}</span>` : ''}
                                </div>
                                <span>Máquina: ${escapeHtml(process.machineName || 'Sin definir')}</span>
                                <span>Duración: ${escapeHtml(actualDuration)}${_cotizadoVsProducido === 'producido' && actualMinutes > 0 ? ' <span style="color:var(--flow-blue);font-size:11px">(real)</span>' : ''}</span>
                                <span>Setup: ${escapeHtml(actualSetup)}</span>
                            </div>
                            <div class="production-flow-history-received">
                                <strong>${escapeHtml(receivedStatus)}</strong>
                                ${receivedUser ? `<span>${escapeHtml(receivedUser)}</span>` : ''}
                                <em>${escapeHtml(receivedDate || 'Pendiente')}</em>
                            </div>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
    bindTrackingAvatarFallback(planningSnapshotList);
}

function formatFlowMinutes(value) {
    const minutes = Number(value || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return '—';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${(minutes / 60).toLocaleString('es-CR', { maximumFractionDigits: 2 })} h`;
}

function formatFlowQuantity(value, unit = '') {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty) || qty <= 0) return '—';
    return `${qty.toLocaleString('es-CR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
}

function flowStatusClass(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'COMPLETADO') return 'is-done';
    if (['RUN', 'SETUP'].includes(normalized)) return 'is-active';
    if (normalized === 'PARO') return 'is-stopped';
    return '';
}

// ── FLOW HISTORY (local) ──
var FLOW_HIST = [];

function flowHistAdd(msg) {
    FLOW_HIST.unshift({ msg: msg, ts: fmtNowShort() });
    if (FLOW_HIST.length > 40) FLOW_HIST.pop();
}

function fmtNowShort() {
    var d = new Date(), ms = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return d.getDate() + ' ' + ms[d.getMonth()] + ' · ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}

function notify(title, msg, type) {
    var colors = { success: ['var(--green)', 'ti-circle-check'], warning: ['var(--amber)', 'ti-alert-triangle'], info: ['var(--blue)', 'ti-info-circle'], danger: ['var(--red)', 'ti-alert-circle'] };
    var c = colors[type] || colors.info;
    var el = document.createElement('div');
    el.className = 'notif-item';
    el.innerHTML = '<i class="ti ' + c[1] + '" style="font-size:18px;color:' + c[0] + ';flex-shrink:0;margin-top:1px;"></i><div><div class="notif-title" style="color:' + c[0] + '">' + title + '</div><div class="notif-body">' + msg + '</div></div>';
    var area = document.getElementById('notif-area') || (function () {
        var a = document.createElement('div'); a.id = 'notif-area'; a.className = 'notif-area';
        document.body.appendChild(a); return a;
    })();
    area.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4500);
}

function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function friendlyNetworkMessage(scope) {
    return scope + ' está tardando más de lo normal. Intenta abrirlo de nuevo en unos segundos.';
}

async function fetchJsonWithRetry(url, options = {}, settings = {}) {
    const retries = Number(settings.retries ?? 2);
    const retryDelay = Number(settings.retryDelay ?? 900);
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
            if (error?.noRetry) throw error;
            lastError = error;
            if (attempt === retries) throw lastError;
        }
        await sleep(retryDelay * (attempt + 1));
    }
    throw lastError || new Error('No fue posible completar la solicitud.');
}

function renderOrderTracking(payload) {
    if (!orderFlowBody) return;
    var steps = Array.isArray(payload && payload.steps) ? payload.steps : [];
    orderFlowBody.innerHTML = renderFlowTimeline(steps);
    bindTrackingAvatarFallback(orderFlowBody);
    if (document.getElementById('orderMenuPopover')?.classList.contains('is-visible')) positionHeaderTabPopover('orderMenuPopover');
}

function renderFlowTimeline(steps, order) {
    if (!steps.length) return '<div class="production-summary-empty">No hay seguimiento registrado.</div>';
    var doneCount = steps.filter(function (s) { return String(s.routeStatus || '').toUpperCase() === 'COMPLETADO'; }).length;
    var total = steps.length;

    // Find next pending step index (first non-done, non-active, non-stopped, non-completed)
    var nextPendingIndex = -1;
    for (var np = 0; np < steps.length; np++) {
        var npStatus = String(steps[np].routeStatus || 'PENDIENTE').toUpperCase();
        if (npStatus !== 'COMPLETADO' && !['RUN', 'SETUP'].includes(npStatus) && npStatus !== 'PARO') {
            nextPendingIndex = np;
            break;
        }
    }

    // Build timeline rows
    var tlHtml = '';
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var status = String(s.routeStatus || 'PENDIENTE').toUpperCase();
        var isDone = status === 'COMPLETADO';
        var isActive = ['RUN', 'SETUP'].includes(status);
        var isStopped = status === 'PARO';
        var isLocked = !isDone && !isActive && !isStopped;
        var isNextPending = i === nextPendingIndex;
        var isLast = i === steps.length - 1;

        var nodeClass = isDone ? 'tl-node done' : (isActive ? 'tl-node avail in-progress' : (isStopped ? 'tl-node warn' : 'tl-node locked'));
        var markerName = String(s.completedBy || s.startedBy || '').trim();
        var markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim();
        var hasMarkerPhoto = Boolean(markerPhoto || trackingUserPhotos.get(trackingUserLookupKey(markerName)));
        var nodeInner = '';
        if (isDone && markerName) {
            nodeClass += ' has-avatar' + (hasMarkerPhoto ? ' has-photo' : '');
            nodeInner = '<span class="tl-avatar-clip">' + trackingAvatarMarkup(markerName, markerPhoto) + '</span><span class="tl-node-badge"><i class="ti ti-check" style="font-size:12px;"></i></span>';
        } else if (isDone) {
            nodeInner = '<i class="ti ti-check" style="font-size:20px;"></i>';
        } else if (isNextPending) {
            nodeInner = '<i class="ti ti-circle-dotted" style="font-size:20px;opacity:.5;"></i><span class="tl-node-badge badge-pending"><i class="ti ti-arrow-right" style="font-size:11px;"></i></span>';
        } else if (isActive) {
            nodeInner = '<div style="width:16px;height:16px;border-radius:50%;background:var(--flow-blue);"></div>';
        } else {
            nodeInner = '<div style="width:12px;height:12px;border-radius:50%;background:var(--ink-5);opacity:.5;"></div>';
        }

        // Connector
        var solid = isDone && !isLast && steps[i + 1] && String(steps[i + 1].routeStatus || '').toUpperCase() === 'COMPLETADO';
        var line = isLast ? '' : '<div class="tl-connector ' + (solid ? 'solid' : 'dashed') + '"></div>';

        // Content
        var detailRows = '';
        var machineProcessKeys = ['sellos', 'impresion', 'acabados', 'barnizado', 'laminado', 'troquelado', 'estampado', 'embosado', 'numeracion', 'rebobinado'];
        if (machineProcessKeys.includes(s.processKey) && s.planned && s.planned.machineName) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-cpu" style="font-size:11px;"></i>' + escapeHtml(s.planned.machineName) + '</span>';
        }
        // Sellos: show source info (inventory vs. external)
        if (s.processKey === 'sellos') {
            var planSource = (s.actual && s.actual.planSourceLabel) || (s.planned && s.planned.planSource);
            var planDias = (s.actual && s.actual.diasEstimados) || (s.planned && s.planned.diasEstimados);
            if (planSource) detailRows += '<span class="flow-detail-row"><i class="ti ti-layers-subtract" style="font-size:11px;"></i>' + escapeHtml(planSource) + '</span>';
            if (planDias > 0) detailRows += '<span class="flow-detail-row"><i class="ti ti-calendar" style="font-size:11px;"></i>' + planDias + (planDias === 1 ? ' día est.' : ' días est.') + '</span>';
        }
        var plannedTime = s.planned && s.planned.minutes > 0 ? fmtFlowTime(s.planned.minutes) : '';
        // Tiempo utilizado (real) del paso — se muestra junto al calculado.
        var realMinFlow = Number(s.actualMinutes || s.realMinutes || 0);
        var usedTime = realMinFlow > 0 ? fmtFlowTime(realMinFlow) : '';
        var showTimeInTitle = isDone && plannedTime && s.processKey !== 'empaque';
        if (plannedTime && !showTimeInTitle) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-clock" style="font-size:11px;"></i>' + plannedTime
                + (usedTime ? ' <span style="color:var(--flow-blue);">· usado ' + usedTime + '</span>' : '') + '</span>';
        } else if (usedTime && showTimeInTitle) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-clock" style="font-size:11px;"></i>usado ' + usedTime + '</span>';
        }

        var contentHtml = '';
        var markerDate = s.completedAt || s.startedAt || '';
        var metaParts = [];
        if (markerName) metaParts.push(escapeHtml(markerName));
        if (markerDate) metaParts.push(formatDate(markerDate, true));
        var metaHtml = metaParts.length ? '<div class="tl-step-meta">' + metaParts.join(' · ') + '</div>' : '';
        var titleStateClass = isDone ? 'done' : (isActive ? 'active' : (isStopped ? 'stopped' : 'pending'));
        var titleText = escapeHtml(s.processName || 'Proceso') + (showTimeInTitle ? ' <span class="tl-title-time">(' + plannedTime + ')</span>' : '');
        var titleHtml = '<div class="tl-step-title ' + titleStateClass + '">' + titleText + '</div>';
        var hintHtml = (!isDone && !isActive && !isStopped) ? '<div class="tl-step-hint">' + (isNextPending ? 'Siguiente paso' : 'Pendiente') + '</div>' : '';
        var detailHtml = detailRows ? '<div class="flow-detail-stack">' + detailRows + '</div>' : '';
        contentHtml = '<div class="tl-step-grid"><div class="tl-step-main">' + titleHtml + metaHtml + hintHtml + detailHtml + '</div></div>';

        tlHtml += '<div class="tl-row">'
            + '<div class="tl-col-left">'
            + '<button type="button" class="' + nodeClass + '" data-tracking-toggle-index="' + i + '" aria-label="' + (isDone ? 'Quitar marca de ' : 'Marcar ') + escapeHtml(s.processName || 'Proceso') + '">'
            + nodeInner + '</button>' + line + '</div>'
            + '<div class="tl-content">' + contentHtml + '</div></div>';

    }

    // History
    if (FLOW_HIST.length > 0) {
        tlHtml += '<div class="hist-section"><div class="hist-header"><i class="ti ti-history" style="font-size:13px;"></i>Historial</div>';
        var shown = Math.min(FLOW_HIST.length, 8);
        for (var h = 0; h < shown; h++) {
            tlHtml += '<div class="hist-row"><span class="hist-date">' + FLOW_HIST[h].ts + '</span><span>' + FLOW_HIST[h].msg + '</span></div>';
        }
        tlHtml += '</div>';
    }

    return '<div class="fp-panel">'
        + '<div class="fp-panel-head"><div><div class="fp-panel-title">Flujo de Producción</div><div class="fp-panel-sub">' + doneCount + ' de ' + total + ' etapas completas</div></div>'
        + '<span class="fp-counter" style="background:' + (doneCount === total ? 'var(--green-light)' : (doneCount > 0 ? 'var(--amber-light)' : 'var(--ink-7)')) + ';color:' + (doneCount === total ? 'var(--green)' : (doneCount > 0 ? 'var(--amber)' : 'var(--ink-4)')) + ';">' + doneCount + '/' + total + '</span>'
        + '</div>'
        + '<div class="fp-progress"><div class="fp-progress-fill" style="width:' + Math.round(doneCount / total * 100) + '%;background:linear-gradient(90deg,var(--green),#34d399);"></div></div>'
        + '<div class="fp-body" style="padding-top:0;">' + tlHtml + '</div>'
        + '</div>';
}

function stepIcon(key) {
    var icons = {
        orden_creada: 'file-plus', solicitud_vendedor: 'send', planeacion: 'player-play',
        diseno: 'vector-bezier', preprensa: 'printer', visto_bueno: 'circle-check',
        programacion: 'calendar-time',
        sellos: 'layers-subtract', tintas: 'droplet', impresion: 'brand-codesandbox',
        acabados: 'scissors', rebobinado: 'refresh', empaque: 'package',
        entrega: 'truck', calidad: 'checkup-list'
    };
    return icons[key] || 'arrow-right';
}

function fmtFlowTime(min) {
    var total = Math.round(Number(min || 0));
    if (!Number.isFinite(total) || total <= 0) return '—';
    if (total < 60) return total + ' min';
    var h = Math.floor(total / 60);
    var m = total % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
}

function fmtFlowDur(min) {
    var total = Math.round(Number(min || 0));
    if (!Number.isFinite(total) || total <= 0) return '\u2014';
    if (total < 60) return total + 'm';
    var h = Math.floor(total / 60);
    var m = total % 60;
    if (h < 24) return h + 'h' + (m ? ' ' + m + 'm' : '');
    var dd = Math.floor(h / 24);
    var rh = h % 24;
    return dd + 'd' + (rh ? ' ' + rh + 'h' : '');
}

var PAUSE_REASON_LABELS = {
    'WAITING_CLIENT_APPROVAL': 'Esp. aprobaci\u00f3n cliente',
    'WAITING_RAW_MATERIAL': 'Esp. materia prima',
    'WAITING_PLATES': 'Esp. sellos',
    'CLIENT_CORRECTIONS': 'Correcciones cliente',
    'FILE_ERROR': 'Error de archivo',
    'PRODUCTION_ISSUE': 'Problema de producci\u00f3n',
    'MACHINE_BREAKDOWN': 'Falla de m\u00e1quina',
    'QUALITY_ISSUE': 'Problema de calidad',
    'OTHER': 'Otro'
};

var activeFlowTab = 'flujo';

function initFlowTabs() {
    var bar = document.getElementById('orderFlowTabs');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.tl-tab-btn');
        if (!btn) return;
        var tab = btn.dataset.flowTab;
        if (tab === activeFlowTab) return;
        activeFlowTab = tab;
        bar.querySelectorAll('.tl-tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.flowTab === tab); });
        var flowBody = document.getElementById('orderFlowBody');
        var tabContent = document.getElementById('orderFlowTabContent');
        if (tab === 'flujo') {
            flowBody.style.display = '';
            tabContent.style.display = 'none';
        } else {
            flowBody.style.display = 'none';
            tabContent.style.display = '';
            renderFlowTabContent(tab);
        }
    });
}

function renderFlowTabContent(tab) {
    var el = document.getElementById('orderFlowTabContent');
    if (!el) return;
    if (tab === 'responsabilidades') renderTabResponsabilidades(el);
    else if (tab === 'pausas') renderTabPausas(el);
    else if (tab === 'auditoria') renderTabAuditoria(el);
    else if (tab === 'pasos') renderTabPasos(el);
}

// Pasos de Producción — bitácora única: una línea por evento (avance, pausa,
// devolución, aprobación, detención). El comentario largo NO va en la fila:
// se abre en un modal chico que se ajusta al texto.
var PASO_GRUPO_META = {
    orden: { lbl: 'Orden', color: '#5c6b7a', bg: 'rgba(92,107,122,0.12)' },
    proceso: { lbl: 'Proceso', color: '#0b81b8', bg: 'rgba(11,129,184,0.12)' },
    pausa: { lbl: 'Pausa', color: '#c07a1e', bg: 'rgba(192,122,30,0.14)' },
    devolucion: { lbl: 'Devolución', color: '#c0392b', bg: 'rgba(192,57,43,0.13)' },
    aprobacion: { lbl: 'Aprobación', color: '#8e44ad', bg: 'rgba(142,68,173,0.13)' }
};
function fmtPasoDur(seg) {
    var s = Math.max(0, Math.round(Number(seg || 0)));
    if (!s) return '';
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), rm = m % 60;
    if (h < 24) return h + 'h' + (rm ? ' ' + rm + 'm' : '');
    var d = Math.floor(h / 24);
    return d + 'd ' + (h % 24) + 'h';
}
var _pasosCache = [];
function renderTabPasos(el) {
    el.innerHTML = '<div class="production-summary-empty" style="padding:30px;text-align:center;">Cargando pasos...</div>';
    if (!currentOrderCode) { el.innerHTML = '<div class="production-summary-empty">Sin orden.</div>'; return; }
    fetch('/api/produccion/pasos?orden=' + encodeURIComponent(currentOrderCode), { headers: sessionHeaderSafe() })
        .then(function (r) { return r.json(); })
        .then(function (p) {
            if (!p || !p.ok) { el.innerHTML = '<div class="production-summary-empty">' + escapeHtml((p && p.error) || 'No se pudo cargar.') + '</div>'; return; }
            _pasosCache = p.pasos || [];
            if (!_pasosCache.length) { el.innerHTML = '<div class="production-summary-empty">Todavía no hay pasos registrados.</div>'; return; }
            var rows = _pasosCache.map(function (paso, i) {
                var meta = PASO_GRUPO_META[paso.grupo] || { lbl: paso.grupo, color: 'var(--ink-4)' };
                var costos = paso.costos ? ('₡' + Number(paso.costos.total || 0).toLocaleString('es-CR')) : '';
                var dur = fmtPasoDur(paso.duracionSeg);
                var tieneDetalle = (paso.comentario && paso.comentario.trim()) || (paso.clasificacion && paso.clasificacion.trim()) || paso.costos;
                return '<tr class="pp-row' + (tieneDetalle ? ' pp-row--click' : '') + '"' + (tieneDetalle ? ' data-paso-idx="' + i + '"' : '') + '>'
                    + '<td class="pp-when">' + escapeHtml(formatDate(paso.en, true)) + '</td>'
                    + '<td><span class="pp-pill" style="background:' + meta.bg + ';color:' + meta.color + ';">' + escapeHtml(meta.lbl) + '</span></td>'
                    + '<td class="pp-proc">' + escapeHtml(paso.procesoLabel || '') + '</td>'
                    + '<td class="pp-title">' + escapeHtml(paso.titulo || '') + (paso.clasificacion ? ' <span class="pp-clas">' + escapeHtml(paso.clasificacion) + '</span>' : '') + '</td>'
                    + '<td class="pp-who">' + escapeHtml(paso.por || '') + '</td>'
                    + '<td class="pp-dur">' + escapeHtml(dur) + '</td>'
                    + '<td class="pp-cost">' + escapeHtml(costos) + '</td>'
                    + '</tr>';
            }).join('');
            el.innerHTML = '<div class="pp-wrap"><table class="pp-tbl"><thead><tr>'
                + '<th>Fecha y hora</th><th>Tipo</th><th>Proceso</th><th>Qué pasó</th><th>Quién</th><th>Duración</th><th>Costo</th>'
                + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
            el.querySelectorAll('.pp-row--click').forEach(function (tr) {
                tr.addEventListener('click', function () { abrirPasoDetalle(Number(tr.dataset.pasoIdx)); });
            });
        })
        .catch(function () { el.innerHTML = '<div class="production-summary-empty">No se pudo cargar los pasos.</div>'; });
}
function abrirPasoDetalle(idx) {
    var paso = _pasosCache[idx];
    if (!paso) return;
    var meta = PASO_GRUPO_META[paso.grupo] || { lbl: paso.grupo, color: 'var(--ink-4)' };
    var costHtml = '';
    if (paso.costos) {
        costHtml = '<div class="pp-modal-costs">'
            + '<span>Tinta extra: <b>₡' + Number(paso.costos.tinta || 0).toLocaleString('es-CR') + '</b></span>'
            + '<span>Tiempo de gente: <b>₡' + Number(paso.costos.tiempo || 0).toLocaleString('es-CR') + '</b></span>'
            + '<span>Máquina detenida: <b>₡' + Number(paso.costos.maquina || 0).toLocaleString('es-CR') + '</b></span>'
            + '<span class="pp-modal-total">Total: <b>₡' + Number(paso.costos.total || 0).toLocaleString('es-CR') + '</b></span>'
            + '</div>';
    }
    var back = document.createElement('div');
    back.className = 'pp-modal-back';
    back.innerHTML = '<div class="pp-modal">'
        + '<div class="pp-modal-hd"><span class="pp-pill" style="background:' + meta.bg + ';color:' + meta.color + ';">' + escapeHtml(meta.lbl) + '</span>'
        + '<button type="button" class="pp-modal-x" aria-label="Cerrar">&times;</button></div>'
        + '<div class="pp-modal-title">' + escapeHtml(paso.titulo || '') + '</div>'
        + '<div class="pp-modal-meta">' + escapeHtml(formatDate(paso.en, true)) + (paso.procesoLabel ? ' · ' + escapeHtml(paso.procesoLabel) : '') + (paso.por ? ' · ' + escapeHtml(paso.por) : '') + '</div>'
        + (paso.clasificacion ? '<div class="pp-modal-clas">' + escapeHtml(paso.clasificacion) + '</div>' : '')
        + (paso.comentario ? '<div class="pp-modal-body">' + escapeHtml(paso.comentario) + '</div>' : '')
        + costHtml
        + '</div>';
    function close() { back.remove(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.pp-modal-x').addEventListener('click', close);
    document.body.appendChild(back);
}

function renderTabResponsabilidades(el) {
    var steps = currentOrderFlowSteps || [];
    if (!steps.length) { el.innerHTML = '<div class="production-summary-empty">Sin datos disponibles.</div>'; return; }
    var depts = {};
    steps.forEach(function (s) {
        var dept = s.department || s.processName || 'Sin departamento';
        if (!depts[dept]) depts[dept] = { real: 0, planned: 0 };
        var realMin = Number(s.actualMinutes || s.realMinutes || 0);
        var plannedMin = Number(s.planned?.minutes || 0);
        if (String(s.routeStatus || '').toUpperCase() === 'COMPLETADO') {
            depts[dept].real += realMin || plannedMin;
        }
        depts[dept].planned += plannedMin;
    });
    var entries = Object.entries(depts).filter(function (e) { return e[1].real > 0 || e[1].planned > 0; });
    if (!entries.length) { el.innerHTML = '<div class="production-summary-empty">Sin datos de tiempos registrados.</div>'; return; }
    var maxTotal = Math.max.apply(null, entries.map(function (e) { return Math.max(e[1].real, e[1].planned); }).concat([1]));
    var W = 300;
    var legend = '<div style="display:flex;gap:14px;padding:12px 16px;font-size:12px;color:var(--ink-4);">'
        + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#378ADD;margin-right:4px;vertical-align:middle;"></span>Real</span>'
        + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--ink-5);margin-right:4px;vertical-align:middle;"></span>Estimado</span>'
        + '</div>';
    var html = legend;
    entries.forEach(function (e) {
        var name = e[0], v = e[1];
        var rw = Math.round(v.real / maxTotal * W);
        var pw = Math.round(v.planned / maxTotal * W);
        html += '<div class="tl-dept-row">'
            + '<div class="tl-dept-name">' + escapeHtml(name) + '</div>'
            + '<div class="tl-dept-bar">'
            + (rw > 0 ? '<div class="tl-dept-seg" style="width:' + rw + 'px;background:#378ADD;" title="Real: ' + fmtFlowDur(v.real) + '"></div>' : '')
            + (pw > rw ? '<div class="tl-dept-seg" style="width:' + (pw - rw) + 'px;background:var(--ink-5);opacity:.4;" title="Estimado: ' + fmtFlowDur(v.planned) + '"></div>' : '')
            + '</div>'
            + '<div class="tl-dept-total">' + fmtFlowDur(v.real) + '</div>'
            + '</div>';
    });
    el.innerHTML = html;
}

function renderTabPausas(el) {
    var steps = currentOrderFlowSteps || [];
    var pauses = [];
    steps.forEach(function (s) {
        var events = s.events || s.routeEvents || [];
        events.forEach(function (ev) {
            if (String(ev.eventType || '').toLowerCase() === 'paro') {
                pauses.push({
                    processName: s.processName || s.processKey,
                    reason: ev.stopReason || ev.notes || 'Sin descripci\u00f3n',
                    reasonCode: ev.stopReasonCode || '',
                    startedAt: ev.eventTimestamp || ev.createdAt || '',
                    user: ev.operatorName || '',
                    step: s
                });
            }
        });
    });
    if (!pauses.length) { el.innerHTML = '<div class="production-summary-empty">No hay pausas registradas.</div>'; return; }
    var html = '';
    pauses.forEach(function (p) {
        var label = PAUSE_REASON_LABELS[p.reasonCode] || p.reasonCode || 'Pausa';
        html += '<div class="tl-pause-card">'
            + '<div class="tl-pause-hdr"><span class="tl-pause-name">' + escapeHtml(p.processName) + '</span><span class="tl-pause-pill">' + escapeHtml(label) + '</span></div>'
            + '<div class="tl-pause-reason">' + escapeHtml(p.reason) + '</div>'
            + '<div class="tl-pause-fields">'
            + '<div><div class="tl-pause-field-label">Inicio</div><div class="tl-pause-field-val">' + formatDate(p.startedAt, true) + '</div></div>'
            + '<div><div class="tl-pause-field-label">Por</div><div class="tl-pause-field-val">' + escapeHtml(p.user || '\u2014') + '</div></div>'
            + '</div></div>';
    });
    el.innerHTML = html;
}

function renderTabAuditoria(el) {
    var steps = currentOrderFlowSteps || [];
    if (!steps.length) { el.innerHTML = '<div class="production-summary-empty">Sin eventos registrados.</div>'; return; }
    var events = [];
    steps.forEach(function (s) {
        var evts = s.events || s.routeEvents || [];
        evts.forEach(function (ev) {
            events.push({
                type: ev.eventType || '',
                timestamp: ev.eventTimestamp || ev.createdAt || '',
                user: ev.operatorName || '',
                processName: s.processName || s.processKey,
                notes: ev.notes || ''
            });
        });
        if (String(s.routeStatus || '').toUpperCase() === 'COMPLETADO' && s.completedAt) {
            events.push({ type: 'COMPLETADO', timestamp: s.completedAt, user: s.completedBy || '', processName: s.processName || s.processKey, notes: '' });
        }
    });
    events.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    if (!events.length) { el.innerHTML = '<div class="production-summary-empty">Sin eventos registrados.</div>'; return; }
    var EVENT_COLORS = { 'setup': '#378ADD', 'run': '#1D9E75', 'completado': '#639922', 'paro': '#EF9F27', 'revertido': '#E24B4A', 'COMPLETADO': '#639922' };
    var EVENT_LABELS = { 'setup': 'Configuraci\u00f3n', 'run': 'En producci\u00f3n', 'completado': 'Completado', 'paro': 'Pausa', 'revertido': 'Revertido', 'COMPLETADO': 'Completado' };
    var html = '<div class="tl-wrap" style="position:relative;padding-left:26px;"><div style="position:absolute;left:9px;top:0;bottom:0;width:1px;background:var(--ink-6);"></div>';
    var shown = Math.min(events.length, 30);
    for (var i = 0; i < shown; i++) {
        var ev = events[i];
        var col = EVENT_COLORS[ev.type] || '#888';
        var label = EVENT_LABELS[ev.type] || ev.type;
        html += '<div style="position:relative;margin-bottom:14px;">'
            + '<div style="position:absolute;left:-20px;top:4px;width:10px;height:10px;border-radius:50%;border:2px solid ' + col + ';background:' + col + '20;"></div>'
            + '<div style="font-size:11px;color:var(--ink-4);">' + formatDate(ev.timestamp, true) + ' \u00b7 ' + escapeHtml(ev.user || '\u2014') + '</div>'
            + '<div style="font-size:13px;color:var(--ink);">' + escapeHtml(ev.processName) + ' \u2014 ' + escapeHtml(label)
            + '<span style="display:inline-block;font-size:10px;padding:1px 7px;border-radius:4px;background:var(--ink-7);color:var(--ink-4);margin-left:5px;vertical-align:middle;">' + escapeHtml(label) + '</span></div>'
            + (ev.notes ? '<div style="font-size:11px;color:var(--ink-4);margin-top:2px;">' + escapeHtml(ev.notes) + '</div>' : '')
            + '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

function renderComparisonView(cmp) {
    if (!cmp || !cmp.length) return '<div class="production-summary-empty">Sin comparación disponible.</div>';
    var html = '<div class="fp-panel">'
        + '<div class="fp-panel-head"><div><div class="fp-panel-title">Planificado vs. Real</div><div class="fp-panel-sub">Cotización contra datos de producción</div></div></div>'
        + '<div style="padding:16px 22px 20px;">';
    cmp.forEach(function (step) {
        var planned = step.planned || {};
        var real = step.real || {};
        var timeOver = Number(real.minutes || 0) > 0 && Number(planned.minutes || 0) > 0 && Number(real.minutes) > Number(planned.minutes);
        var qtyOver = Number(real.quantity || 0) > 0 && Number(planned.quantity || 0) > 0 && Number(real.quantity) > Number(planned.quantity);
        var isDone = String(step.routeStatus || '').toUpperCase() === 'COMPLETADO';

        html += '<div class="step-section">'
            + '<div class="cmp-step-header"><div class="cmp-step-icon" style="background:var(--blue-light);color:var(--blue);"><i class="ti ti-' + stepIcon(step.processKey) + '"></i></div>'
            + escapeHtml(step.processName || 'Proceso') + '</div>'
            + '<div class="cmp-grid">'
            + '<div class="cmp-col planned"><div class="cmp-col-title"><i class="ti ti-clipboard-list"></i>Cotizado</div>';
        if (planned.minutes > 0) html += '<div class="cmp-row"><span class="cmp-row-label">Tiempo</span><span class="cmp-row-val">' + fmtFlowTime(planned.minutes) + '</span></div>';
        if ((step.processKey === 'impresion' || step.processKey === 'sellos') && planned.machineName) html += '<div class="cmp-row"><span class="cmp-row-label">Máquina</span><span class="cmp-row-val" style="font-size:10px;">' + escapeHtml(planned.machineName) + '</span></div>';
        if (planned.quantity > 0) html += '<div class="cmp-row"><span class="cmp-row-label">Cantidad</span><span class="cmp-row-val">' + fmtFlowQty(planned.quantity, planned.unit) + '</span></div>';

        html += '</div><div class="cmp-col real"><div class="cmp-col-title"><i class="ti ti-activity"></i>Real</div>';
        if (planned.minutes > 0) {
            html += '<div class="cmp-row" style="align-items:center;"><span class="cmp-row-label">Tiempo</span>'
                + (isDone
                    ? '<input type="number" class="form-input cmp-real-input" data-cmp-type="time" data-cmp-idx="' + htmlEncode(step.processKey) + '" placeholder="min" value="' + (real.minutes || '') + '" min="0" style="width:72px;padding:3px 7px;font-size:11px;">'
                    : '<span class="cmp-row-val' + (timeOver ? ' over' : '') + '">' + (real.minutes ? fmtFlowTime(real.minutes) : '—') + '</span>')
                + '</div>';
        }
        if (planned.quantity > 0) {
            html += '<div class="cmp-row" style="align-items:center;"><span class="cmp-row-label">Cantidad</span>'
                + (isDone
                    ? '<input type="number" class="form-input cmp-real-input" data-cmp-type="qty" data-cmp-idx="' + htmlEncode(step.processKey) + '" placeholder="' + escapeHtml(planned.unit || '') + '" value="' + (real.quantity || '') + '" min="0" style="width:72px;padding:3px 7px;font-size:11px;">'
                    : '<span class="cmp-row-val' + (qtyOver ? ' over' : '') + '">' + (real.quantity ? fmtFlowQty(real.quantity, planned.unit) : '—') + '</span>')
                + '</div>';
        }
        if (!isDone) html += '<div style="font-size:11px;color:var(--ink-5);margin-top:4px;font-style:italic;">Pendiente de completar</div>';
        html += '</div></div>';
        if (timeOver) {
            var td = real.minutes - planned.minutes;
            html += '<div class="excess-alert" style="background:var(--amber-light);border-color:var(--amber-mid);margin-top:6px;">'
                + '<i class="ti ti-clock excess-alert-icon" style="color:var(--amber);"></i>'
                + '<div><div class="excess-alert-title" style="color:var(--amber);">Exceso de tiempo</div>'
                + '<div class="excess-alert-body">' + fmtFlowTime(td) + ' adicionales sobre el tiempo cotizado.</div></div></div>';
        }
        html += '</div>';
    });
    html += '</div></div>';
    return html;
}

function fmtFlowQty(qty, unit) {
    if (!qty || qty <= 0) return '—';
    return Number(qty).toLocaleString('es-CR', { maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '');
}

function htmlEncode(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── TAB RENDERERS ──
function renderPlanningTab() {
    var root = document.getElementById('flow-planning-root');
    if (!root) return;
    // Copy data from old planning elements
    var raw = (currentLoadedOrder || {}).raw_data || {};
    renderPlanningIntoControls(raw);
}

function renderPlanningIntoControls(raw) {
    var statusEl = document.getElementById('flowPlanningStatusText');
    var metaEl = document.getElementById('flowPlanningMetaText');
    var returnEl = document.getElementById('flowPlanningReturnReasonText');
    var rpb = document.getElementById('flowReleasePlanningButton');
    var lgb = document.getElementById('flowLaunchGanttButton');
    var rsb = document.getElementById('flowReturnSalesButton');
    if (!statusEl) return;

    var control = getOrderPlanningControlFromRaw(raw);
    var statusLabel = control.salesReleased ? (control.launchedToGantt ? 'Lanzada a Gantt' : (control.planningStatus === 'PENDIENTE_PLANIFICACION' ? 'Pendiente en planificación' : 'Liberada')) : 'Pendiente de liberación';
    var statusColor = control.salesReleased ? (control.launchedToGantt ? 'var(--green)' : 'var(--amber)') : 'var(--ink-4)';
    statusEl.textContent = statusLabel;
    statusEl.style.color = statusColor;

    if (metaEl) {
        var metaParts = [];
        if (control.salesReleasedBy) metaParts.push('Liberada por: ' + control.salesReleasedBy);
        if (control.salesReleasedAt) metaParts.push(formatDate(control.salesReleasedAt, true));
        if (control.launchedBy) metaParts.push('Lanzada por: ' + control.launchedBy);
        if (control.returnedBy) metaParts.push('Devuelta por: ' + control.returnedBy);
        if (control.planningStatus === 'DEVUELTA_VENTAS') metaParts.push('Motivo: ' + (control.returnReason || 'Sin motivo'));
        metaEl.textContent = metaParts.join(' · ') || 'Sin información de planificación';
    }

    if (returnEl) {
        returnEl.hidden = control.planningStatus !== 'DEVUELTA_VENTAS' || !control.returnReason;
        if (!returnEl.hidden) returnEl.textContent = 'Motivo de devolución: ' + (control.returnReason || '');
    }

    // Buttons visibility
    if (rpb) {
        rpb.hidden = control.salesReleased && control.planningStatus !== 'DEVUELTA_VENTAS';
        rpb.disabled = control.salesReleased && control.planningStatus !== 'DEVUELTA_VENTAS';
        rpb.textContent = control.planningStatus === 'DEVUELTA_VENTAS' ? 'Reliberar a Planificación' : 'Liberar a Planificación';
    }
    if (lgb) {
        lgb.hidden = !(control.salesReleased && control.planningStatus === 'PENDIENTE_PLANIFICACION');
    }
    if (rsb) {
        rsb.hidden = !(control.salesReleased && control.planningStatus !== 'DEVUELTA_VENTAS' && control.planningStatus !== 'EN_GANTT');
    }

    // Route snapshot
    renderPlanningSnapshotTo(raw);
}

function renderPlanningSnapshotTo(raw) {
    var summaryEl = document.getElementById('flowPlanningSnapshotSummary');
    var metaEl = document.getElementById('flowPlanningSnapshotMeta');
    var listEl = document.getElementById('flowPlanningSnapshotList');
    if (!summaryEl || !metaEl || !listEl) return;

    var snapshot = raw.planning_snapshot || raw.planningSnapshot || null;
    var processes = (Array.isArray(snapshot && snapshot.processes) ? snapshot.processes : []).filter(function (p) {
        return isVisibleOrderProcess(p.processName || p.processKey);
    });

    if (!snapshot || !processes.length) {
        summaryEl.innerHTML = '<div class="line-tracking-head production-flow-history-head"><strong>Ruta de Planificación</strong><span>0 procesos</span></div>';
        metaEl.textContent = 'Cuando se regenere o se cree una orden nueva, aquí aparecerán los tiempos por proceso.';
        listEl.innerHTML = '<div class="production-order-planning-empty">Sin procesos planeados todavía.</div>';
        return;
    }

    var doneCount = 0;
    var listHtml = '<div class="production-flow-history">';
    processes.forEach(function (p) {
        var received = findReceivedStep(p);
        if (received) doneCount++;
        var rStatus = flowStatusLabel(received && received.routeStatus);
        var rUser = (received && (received.completedBy || received.startedBy)) || 'Pendiente';
        var rDate = formatDate(received && (received.completedAt || received.startedAt), true) || '—';
        var pd = parseNumber(p.durationHours, ' h') || '0 h';
        listHtml += '<article class="line-tracking-item production-flow-history-row' + (received ? ' is-done' : '') + '">'
            + '<span class="line-tracking-avatar">' + trackingAvatarMarkup(rUser) + '</span>'
            + '<div class="production-flow-history-body">'
            + '<div class="production-flow-history-plan">'
            + '<div class="production-flow-history-title"><strong>' + escapeHtml(p.processName || p.processKey || 'Proceso') + '</strong>'
            + (p.sequenceOrder ? '<span>Proceso ' + escapeHtml(String(p.sequenceOrder)) + '</span>' : '') + '</div>'
            + '<span>Máquina: ' + escapeHtml(p.machineName || 'Sin definir') + '</span>'
            + '<span>Duración: ' + escapeHtml(pd) + '</span>'
            + (p.setupMinutes ? '<span>Setup: ' + escapeHtml(p.setupMinutes) + ' min</span>' : '') + '</div>'
            + '<div class="production-flow-history-received">'
            + '<strong>' + escapeHtml(rStatus) + '</strong>'
            + '<span>' + escapeHtml(rUser) + '</span>'
            + '<em>' + escapeHtml(rDate) + '</em></div></div></article>';
    });
    listHtml += '</div>';

    summaryEl.innerHTML = '<div class="line-tracking-head production-flow-history-head"><strong>Ruta de Planificación</strong><span>' + doneCount + ' de ' + processes.length + ' marcados</span></div>';
    metaEl.textContent = 'Generada ' + formatDate(snapshot.generatedAt, true) + '. Base: ' + (snapshot.processType || 'Sin tipo') + (snapshot.sourceMachineName ? ' · Máquina sugerida: ' + snapshot.sourceMachineName : '') + '.';
    listEl.innerHTML = listHtml;
    bindTrackingAvatarFallback(listEl);
}

function getOrderPlanningControlFromRaw(raw) {
    var c = raw.planning_control || raw.planningControl || {};
    return {
        salesReleased: Boolean(c.salesReleased),
        salesReleasedAt: c.salesReleasedAt || null,
        salesReleasedBy: c.salesReleasedBy || '',
        planningStatus: c.planningStatus || '',
        launchedToGantt: Boolean(c.launchedToGantt),
        launchedAt: c.launchedAt || null,
        launchedBy: c.launchedBy || '',
        returnedAt: c.returnedAt || null,
        returnedBy: c.returnedBy || '',
        returnReason: c.returnReason || ''
    };
}

function flowStatusLabel(status) {
    var s = String(status || '').toUpperCase();
    if (s === 'COMPLETADO') return 'Completado';
    if (['RUN', 'SETUP'].includes(s)) return 'En proceso';
    if (s === 'PARO') return 'Detenido';
    return 'Pendiente';
}

var VB_FORM_OPEN = null;
var RETURN_FORM_OPEN = false;

function completeStep(idx) {
    var steps = currentOrderFlowPayload && currentOrderFlowPayload.steps;
    if (!steps || !steps[idx]) return;
    var step = steps[idx];
    var processKey = step.processKey || '';
    var notes = prompt('Nota opcional para ' + step.processName + ':', '') || '';
    var currentUser = currentSessionDisplayName();
    step.routeStatus = 'COMPLETADO';
    step.completedBy = currentUser || step.completedBy || '';
    step.completedAt = new Date().toISOString();
    flowHistAdd('✅ <strong>' + step.processName + '</strong> completado');
    notify(step.processName + ' completado', 'Registrado', 'success');
    renderInPlace();
    // Save to backend
    fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento/completar', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ processKey: processKey, notes: notes })
    }).then(function (r) { return r.json(); }).then(function (p) {
        if (!p.ok && p.error) notify('Error', p.error, 'danger');
        else fetchOrderFlowSteps().then(function () { renderOrderTracking(currentOrderFlowPayload); }).catch(function () {});
    }).catch(function (err) {
        notify('Error de red', err.message, 'danger');
    });
}

function showVBForm(idx) {
    VB_FORM_OPEN = idx;
    renderInPlace();
}

function submitVBRevert(targetKey) {
    if (VB_FORM_OPEN === null) return;
    var ta = document.getElementById('vb-reason-ta');
    if (!ta || !ta.value.trim()) { if (ta) { ta.classList.add('error'); ta.focus(); } return; }
    var steps = currentOrderFlowPayload && currentOrderFlowPayload.steps;
    if (!steps) return;
    var reason = ta.value.trim();
    for (var i = 0; i < steps.length; i++) {
        if (steps[i].processKey === targetKey) {
            steps[i].routeStatus = 'PENDIENTE';
            steps[i].completedBy = '';
            steps[i].completedAt = null;
            break;
        }
    }
    flowHistAdd('↩️ <strong>' + steps[VB_FORM_OPEN].processName + '</strong> solicitó correcciones en ' + targetKey + ': "' + reason + '"');
    notify('Correcciones solicitadas', reason, 'warning');
    VB_FORM_OPEN = null;
    renderInPlace();
    fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento/vb-revert', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ targetKey: targetKey, reason: reason })
    }).then(function (r) { return r.json(); }).then(function (p) {
        if (!p.ok && p.error) notify('Error', p.error, 'danger');
    }).catch(function (err) {
        notify('Error de red', err.message, 'danger');
    });
}

function showReturnSalesForm() {
    RETURN_FORM_OPEN = true;
    renderReturnForm();
}

function renderReturnForm() {
    var root = document.getElementById('flow-planning-root');
    if (!root) return;
    var existing = document.getElementById('flow-return-form');
    if (existing) existing.remove();
    if (!RETURN_FORM_OPEN) return;
    var form = document.createElement('div');
    form.id = 'flow-return-form';
    form.className = 'cr-form';
    form.style.margin = '12px 22px';
    form.innerHTML = '<div class="cr-form-title"><i class="ti ti-arrow-back-up"></i>Devolver orden al vendedor</div>'
        + '<textarea id="flow-return-ta" class="cr-textarea" placeholder="Motivo de la devolución..."></textarea>'
        + '<div class="form-actions">'
        + '<button class="btn btn-ghost" onclick="RETURN_FORM_OPEN=false;var f=document.getElementById(\'flow-return-form\');if(f)f.remove();">Cancelar</button>'
        + '<button class="btn btn-danger" onclick="submitReturnSales()"><i class="ti ti-send" style="font-size:12px;"></i>Devolver</button></div>';
    root.parentNode.insertBefore(form, root.nextSibling);
}

function submitReturnSales() {
    var ta = document.getElementById('flow-return-ta');
    if (!ta || !ta.value.trim()) { if (ta) { ta.focus(); return; } return; }
    updatePlanningControlWithReason('return-sales', ta.value.trim());
    RETURN_FORM_OPEN = false;
    var f = document.getElementById('flow-return-form');
    if (f) f.remove();
}

function updatePlanningControlWithReason(action, reason) {
    if (!currentOrderCode) return;
    var btn = document.getElementById('flowReleasePlanningButton');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/planning-control', {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ action: action, reason: reason })
    }).then(function (r) { return r.json(); }).then(function (payload) {
        if (payload.orden) {
            currentLoadedOrder = payload.orden;
            renderOrder(currentLoadedOrder);
            notify('Planificación actualizada', payload.orden ? 'Cambios guardados' : '', 'success');
        }
    }).catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Liberar a Planificación'; }
        notify('Error', err.message, 'danger');
    });
}

function renderInPlace() {
    renderOrderTracking(currentOrderFlowPayload);
}

async function loadFlowTabContent() {
    if (!currentOrderCode) return;
    activeFlowTab = 'flujo';
    var tabBar = document.getElementById('orderFlowTabs');
    if (tabBar) tabBar.querySelectorAll('.tl-tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.flowTab === 'flujo'); });
    var flowBody = document.getElementById('orderFlowBody');
    var tabContent = document.getElementById('orderFlowTabContent');
    if (flowBody) flowBody.style.display = '';
    if (tabContent) tabContent.style.display = 'none';
    if (orderFlowBody) orderFlowBody.innerHTML = '<div class="production-summary-empty" style="padding:40px;text-align:center;">Cargando seguimiento...</div>';
    try {
        await fetchOrderFlowSteps();
        renderOrderTracking(currentOrderFlowPayload);
    } catch (error) {
        if (orderFlowBody) orderFlowBody.innerHTML = '<div class="production-summary-empty">' + escapeHtml(friendlyNetworkMessage('El seguimiento')) + '</div>';
    }
}

function renderCreationSummaryContent() {
    const summary = currentLoadedOrder?.raw_data?.resumen_creacion;
    const sourceRaw = currentLoadedOrder?.raw_data?.line_snapshot?.raw_data || currentLoadedOrder?.raw_data || {};
    const body = document.getElementById('orderCreationSummaryBody');
    var html = '';
    if (summary) {
        html += renderCreationSummary(summary);
    } else {
        html += '<div class="production-summary-empty">No hay datos de creación disponibles.</div>';
    }
    var rawView = renderRawSourceData(sourceRaw);
    if (rawView) {
        html += '<hr class="production-raw-divider">';
        html += rawView;
    }
    if (body) body.innerHTML = html;
}

function renderProcessesComparisonContent() {
    var processesBody = document.getElementById('orderProcessesTabBody');
    if (processesBody) processesBody.innerHTML = renderProcessesTabContent();
}

var activeMenuTab = 'flujo';

function menuNavButtonsMap() {
    return { flujo: menuNavFlujo, entregas: menuNavEntregas, adjuntos: menuNavAdjuntos, sap: menuNavSap, estadosap: menuNavEstadoSap, procesos: menuNavProcesos, estado: menuNavEstado, creacion: menuNavCreacion };
}

function menuPanelsMap() {
    return {
        flujo: document.getElementById('orderMenuPanelFlujo'),
        entregas: document.getElementById('orderMenuPanelEntregas'),
        adjuntos: document.getElementById('orderMenuPanelAdjuntos'),
        sap: document.getElementById('orderMenuPanelSap'),
        estadosap: document.getElementById('orderMenuPanelEstadoSap'),
        procesos: document.getElementById('orderMenuPanelProcesos'),
        estado: document.getElementById('orderMenuPanelEstado'),
        creacion: document.getElementById('orderMenuPanelCreacion')
    };
}

function setActiveMenuTabUI(tab) {
    activeMenuTab = tab;
    var navs = menuNavButtonsMap();
    var panels = menuPanelsMap();
    Object.keys(navs).forEach(function (key) { if (navs[key]) navs[key].classList.toggle('is-active', key === tab); });
    Object.keys(panels).forEach(function (key) { if (panels[key]) panels[key].hidden = key !== tab; });
}

let adjuntosProductoWidget = null;
function montarAdjuntosProductoOrden() {
    const cont = document.getElementById('orderAdjuntosProducto');
    if (!cont || !window.AdjuntosProducto) return;
    const src = (typeof getSourceQuoteContext === 'function' ? getSourceQuoteContext() : {}) || {};
    const contexto = {
        cotizacion: src.quoteCode || '',
        linea: src.lineCode || '',
        orden: currentOrderCode || ''
    };
    if (adjuntosProductoWidget) {
        adjuntosProductoWidget.fijarContexto(contexto);
        return;
    }
    adjuntosProductoWidget = window.AdjuntosProducto.crear({
        contenedor: cont,
        contexto: contexto,
        origenSubida: 'orden',
        titulo: '',
        sessionHeaders: typeof sessionHeader === 'function' ? sessionHeader : (typeof sessionHeaderSafe === 'function' ? sessionHeaderSafe : undefined),
        renderizarIcono: function (el, cual) {
            if (!el || typeof getOrderIcon !== 'function' || typeof renderIcon !== 'function') return;
            var conf;
            if (cual === 'audio') conf = getOrderIcon(['quoteRequestRecord'], 'quoteRequestRecord', '●', '#1e516d', 18);
            else if (cual === 'descargar') conf = getOrderIcon(['attachmentDownload'], 'attachmentDownload', '⇩', '#0b81b8', 16);
            else if (cual === 'ver') return;
            else conf = getOrderIcon(['quoteRequestAttachment', 'lineAttachments'], 'quoteRequestAttachment', '📎', '#1e516d', 18);
            renderIcon(el, conf.value, conf.color, conf.size);
        }
    });
}

async function loadMenuTabContent(tab) {
    if (tab === 'flujo') {
        await loadFlowTabContent();
    } else if (tab === 'adjuntos') {
        montarAdjuntosProductoOrden();
    } else if (tab === 'sap') {
        try {
            await loadSapConsumptionMaterials();
        } catch (error) {
            if (sapConsumptionStatus) sapConsumptionStatus.textContent = friendlyNetworkMessage('Los materiales de descarga');
        }
    } else if (tab === 'estadosap') {
        await renderEstadoSapTab();
    } else if (tab === 'procesos') {
        mostrarPestanaProduccion(pestanaProduccionActiva);
    } else if (tab === 'estado') {
        renderDetencionPanel();
    } else if (tab === 'creacion') {
        renderCreationSummaryContent();
    }
}

// ── Estado de la Orden: detener / anular / reactivar (Nivel 1) ───────────────
var DETENCION_ACCION_LABEL = {
    DETENER: 'Detenida', REANUDAR: 'Reanudada', ANULAR: 'Anulada', REACTIVAR: 'Reactivada'
};
var DETENCION_ICON = {
    DETENER: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>',
    ANULAR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    REANUDAR: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5l12 7-12 7z"/></svg>',
    REACTIVAR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 1 2.5 5.8"/><path d="M4 20v-5.5h5.5"/></svg>'
};
var DETENCION_FORM_TITULO = {
    DETENER: 'Detener la orden', ANULAR: 'Anular la orden',
    REANUDAR: 'Reanudar la orden', REACTIVAR: 'Reactivar la orden'
};
var DETENCION_CONFIRM_TXT = {
    DETENER: 'Confirmar detención', ANULAR: 'Confirmar anulación',
    REANUDAR: 'Confirmar reanudación', REACTIVAR: 'Confirmar reactivación'
};
var detencionClockTimer = null;
var detencionAccionArmada = null;

function detencionFormatDuracion(segundos) {
    var s = Math.max(0, Math.floor(Number(segundos) || 0));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60);
    var partes = [];
    if (d) partes.push(d + ' d');
    if (h) partes.push(h + ' h');
    partes.push(m + ' min');
    return partes.join(' ');
}

function renderDetencionBanner(order) {
    var banner = document.getElementById('orderDetencionBanner');
    if (!banner) return;
    var det = order && order.detencion;
    var estado = (det && det.estado) || order.estado_detencion || '';
    if (estado !== 'DETENIDA' && estado !== 'ANULADA') {
        banner.hidden = true;
        banner.innerHTML = '';
        return;
    }
    banner.hidden = false;
    banner.classList.toggle('is-anulada', estado === 'ANULADA');
    var titulo = estado === 'ANULADA' ? 'Orden anulada' : 'Orden detenida';
    var motivo = (det && det.motivoEtiqueta) || order.detencion_motivo_etiqueta || '';
    var desc = (det && det.descripcion) || order.detencion_descripcion || '';
    var por = (det && det.por) || order.detencion_por || '';
    var desde = det && det.desde ? formatDate(det.desde, true) : '';
    banner.innerHTML =
        '<div class="order-detencion-banner-main">'
        + '<strong>' + escapeHtml(titulo) + (motivo ? ' — ' + escapeHtml(motivo) : '') + '</strong>'
        + (desc ? '<span class="order-detencion-banner-desc">' + escapeHtml(desc) + '</span>' : '')
        + '</div>'
        + '<div class="order-detencion-banner-meta">'
        + (por ? '<span>Por ' + escapeHtml(por) + '</span>' : '')
        + (desde ? '<span>Desde ' + escapeHtml(desde) + '</span>' : '')
        + (det ? '<span data-detencion-clock>' + detencionFormatDuracion(det.segundosTramoActual) + '</span>' : '')
        + '</div>';
}

function detencionStartClock() {
    if (detencionClockTimer) { clearInterval(detencionClockTimer); detencionClockTimer = null; }
    var det = currentLoadedOrder && currentLoadedOrder.detencion;
    if (!det || !det.desde) return;
    var base = Date.now();
    var startSecs = Number(det.segundosTramoActual) || 0;
    var totalBase = Number(det.segundosTotales) || 0;
    detencionClockTimer = setInterval(function () {
        var extra = Math.floor((Date.now() - base) / 1000);
        document.querySelectorAll('[data-detencion-clock]').forEach(function (el) {
            el.textContent = detencionFormatDuracion(startSecs + extra);
        });
        document.querySelectorAll('[data-detencion-clock-total]').forEach(function (el) {
            el.textContent = detencionFormatDuracion(totalBase + extra);
        });
    }, 1000);
}

function renderDetencionPanel() {
    var body = document.getElementById('orderDetencionPanelBody');
    if (!body) return;
    var order = currentLoadedOrder || {};
    var det = order.detencion || null;
    var estado = (det && det.estado) || order.estado_detencion || '';
    var permisos = order.detencion_permisos || { puedeDetener: false, puedeAnular: false, puedeReactivar: false };
    var entregadaOCerrada = /entregad|complet|cerrad/i.test(String(order.order_status || '')) || !!order.delivered_on;
    detencionAccionArmada = null;

    var slug = estado === 'DETENIDA' ? 'detenida' : estado === 'ANULADA' ? 'anulada' : 'activa';
    var valorTxt = estado === 'DETENIDA' ? 'Detenida' : estado === 'ANULADA' ? 'Anulada' : 'Activa';

    var clock = '';
    if (det && det.desde && (estado === 'DETENIDA' || estado === 'ANULADA')) {
        var etiquetaClock = estado === 'ANULADA' ? 'Anulada hace' : 'Detenida hace';
        var extra = '';
        if (estado === 'DETENIDA' && det.vecesDetenida > 1) {
            extra = '<span>' + det.vecesDetenida + ' detenciones · ' + detencionFormatDuracion(det.segundosTotales) + ' en total</span>';
        }
        clock = '<div class="odx-clock">' + etiquetaClock
            + '<b data-detencion-clock>' + detencionFormatDuracion(det.segundosTramoActual) + '</b>' + extra + '</div>';
    } else if (estado === '' && det && det.vecesDetenida > 0) {
        clock = '<div class="odx-clock">Estuvo detenida<b>' + detencionFormatDuracion(det.segundosTotales) + '</b>'
            + '<span>' + det.vecesDetenida + (det.vecesDetenida === 1 ? ' vez' : ' veces') + '</span></div>';
    }

    var html = '<div class="odx-state odx-state--' + slug + '">'
        + '<span class="odx-dot"></span>'
        + '<div class="odx-state-text"><span class="odx-state-label">Estado de la orden</span>'
        + '<strong class="odx-state-value">' + valorTxt + '</strong></div>'
        + clock
        + '</div>';

    // Acciones
    var botones = [];
    if (entregadaOCerrada) {
        botones.push('<p class="odx-note">Esta orden ya fue entregada o cerrada. No se puede detener ni anular.</p>');
    } else {
        if (estado === '' && permisos.puedeDetener) botones.push(botonDetencion('DETENER', 'Detener', 'odx-btn--stop'));
        if (estado === 'DETENIDA' && permisos.puedeDetener) botones.push(botonDetencion('REANUDAR', 'Reanudar', 'odx-btn--go'));
        if ((estado === '' || estado === 'DETENIDA') && permisos.puedeAnular) botones.push(botonDetencion('ANULAR', 'Anular', 'odx-btn--void'));
        if (estado === 'ANULADA' && permisos.puedeReactivar) botones.push(botonDetencion('REACTIVAR', 'Reactivar', 'odx-btn--go'));
        if (!botones.length) botones.push('<p class="odx-note">No tenés permiso para cambiar el estado de esta orden.</p>');
    }
    html += '<div class="odx-actions">' + botones.join('') + '</div>';

    // Ranura del formulario en línea
    html += '<div class="odx-form-wrap" id="orderDetencionFormWrap" hidden></div>';

    // Historial
    var hist = (det && det.historial) || [];
    html += '<div><div class="odx-hist-title">Historial</div>';
    if (!hist.length) {
        html += '<div class="odx-hist-empty">Todavía no hay movimientos.</div>';
    } else {
        html += '<div class="odx-hist">' + hist.map(function (h) {
            var etiqueta = DETENCION_ACCION_LABEL[h.accion] || h.accion;
            var motivo = h.motivoEtiqueta ? '<span class="odx-hist-motivo">' + escapeHtml(h.motivoEtiqueta) + '</span>' : '';
            var dur = (h.tramoSegundos != null) ? '<span class="odx-hist-dur">' + detencionFormatDuracion(h.tramoSegundos) + '</span>' : '';
            var cuerpo = h.descripcion || h.nota || '';
            return '<div class="odx-hist-item odx-hist-item--' + String(h.accion).toLowerCase() + '">'
                + '<div class="odx-hist-head"><span class="odx-hist-accion">' + escapeHtml(etiqueta) + '</span>' + motivo + dur + '</div>'
                + (cuerpo ? '<div class="odx-hist-body">' + escapeHtml(cuerpo) + '</div>' : '')
                + '<div class="odx-hist-meta">' + escapeHtml(h.por || '—') + ' · ' + escapeHtml(formatDate(h.en, true)) + '</div>'
                + '</div>';
        }).join('') + '</div>';
    }
    html += '</div>';

    body.innerHTML = html;
    body.querySelectorAll('[data-detencion-accion]').forEach(function (btn) {
        btn.addEventListener('click', function () { armarDetencionAccion(btn.dataset.detencionAccion); });
    });
    detencionStartClock();
}

function botonDetencion(accion, texto, clase) {
    return '<button type="button" class="odx-btn ' + clase + '" data-detencion-accion="' + accion + '" aria-expanded="false">'
        + DETENCION_ICON[accion] + '<span>' + texto + '</span></button>';
}

function armarDetencionAccion(accion) {
    var wrap = document.getElementById('orderDetencionFormWrap');
    if (!wrap) return;
    var botones = document.querySelectorAll('#orderDetencionPanelBody [data-detencion-accion]');

    // Segundo clic en el mismo botón: cerrar.
    if (detencionAccionArmada === accion) { cerrarDetencionForm(); return; }
    detencionAccionArmada = accion;
    botones.forEach(function (b) { b.setAttribute('aria-expanded', String(b.dataset.detencionAccion === accion)); });

    var order = currentLoadedOrder || {};
    var motivos = order.detencion_motivos || {};
    var pideMotivo = (accion === 'DETENER' || accion === 'ANULAR');
    var confirmClase = accion === 'DETENER' ? 'odx-form-confirm--stop'
        : accion === 'ANULAR' ? 'odx-form-confirm--void' : 'odx-form-confirm--go';

    var campos = '';
    if (pideMotivo) {
        campos += '<label class="odx-field"><span>Motivo</span>'
            + '<select class="odx-input" id="orderDetencionMotivo"><option value="">Elegí un motivo</option>'
            + Object.keys(motivos).map(function (k) { return '<option value="' + escapeHtml(k) + '">' + escapeHtml(motivos[k]) + '</option>'; }).join('')
            + '</select></label>';
        campos += '<label class="odx-field"><span>Qué pasó</span>'
            + '<textarea class="odx-input" id="orderDetencionDescripcion" rows="4" placeholder="Contá qué pasó, con quién hablaste, todo lo que haga falta."></textarea></label>';
    } else {
        campos += '<label class="odx-field"><span>Nota (opcional)</span>'
            + '<textarea class="odx-input" id="orderDetencionDescripcion" rows="3" placeholder="Si querés dejar un comentario, escribilo acá."></textarea></label>';
    }

    wrap.innerHTML = '<div class="odx-form" data-accion="' + accion + '">'
        + '<div class="odx-form-head">' + DETENCION_ICON[accion] + '<span>' + escapeHtml(DETENCION_FORM_TITULO[accion]) + '</span></div>'
        + campos
        + '<div class="odx-form-error" id="orderDetencionFormError" hidden></div>'
        + '<div class="odx-form-actions">'
        + '<button type="button" class="odx-form-cancel" id="orderDetencionFormCancel">Cancelar</button>'
        + '<button type="button" class="odx-form-confirm ' + confirmClase + '" id="orderDetencionFormConfirm">' + escapeHtml(DETENCION_CONFIRM_TXT[accion]) + '</button>'
        + '</div></div>';
    wrap.hidden = false;

    document.getElementById('orderDetencionFormCancel').addEventListener('click', cerrarDetencionForm);
    document.getElementById('orderDetencionFormConfirm').addEventListener('click', confirmarDetencionAccion);

    var first = wrap.querySelector('select, textarea');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, 0);
}

function cerrarDetencionForm() {
    var wrap = document.getElementById('orderDetencionFormWrap');
    detencionAccionArmada = null;
    document.querySelectorAll('#orderDetencionPanelBody [data-detencion-accion]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (wrap) { wrap.hidden = true; wrap.innerHTML = ''; }
}

async function confirmarDetencionAccion() {
    var accion = detencionAccionArmada;
    if (!accion || !currentOrderCode) return;
    var pideMotivo = (accion === 'DETENER' || accion === 'ANULAR');
    var motivoSel = document.getElementById('orderDetencionMotivo');
    var descInput = document.getElementById('orderDetencionDescripcion');
    var errBox = document.getElementById('orderDetencionFormError');
    var confirmBtn = document.getElementById('orderDetencionFormConfirm');
    var payload = { accion: accion };
    if (pideMotivo) {
        if (!motivoSel || !motivoSel.value) { errBox.hidden = false; errBox.textContent = 'Elegí un motivo de la lista.'; return; }
        if (String(descInput.value || '').trim().length < 5) { errBox.hidden = false; errBox.textContent = 'Escribí una descripción de lo que pasó.'; return; }
        payload.motivoCodigo = motivoSel.value;
        payload.descripcion = descInput.value.trim();
    } else {
        payload.nota = String(descInput.value || '').trim();
    }
    errBox.hidden = true;
    confirmBtn.disabled = true;
    try {
        var headers = Object.assign({ 'Content-Type': 'application/json' }, (typeof sessionHeaderSafe === 'function' ? sessionHeaderSafe() : {}));
        var r = await fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/detencion', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });
        var data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No fue posible cambiar el estado de la orden.');
        await loadOrder();
    } catch (error) {
        if (errBox) { errBox.hidden = false; errBox.textContent = error.message || 'No fue posible cambiar el estado de la orden.'; }
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

var ESTADO_SAP_CLASES = {
    creado: { txt: 'Creado en SAP', color: 'var(--green, #16a34a)' },
    en_cola: { txt: 'En cola', color: 'var(--amber, #d97706)' },
    fallido: { txt: 'Falló', color: 'var(--red, #dc2626)' },
    no_iniciado: { txt: 'No iniciado', color: 'var(--ink-4, #8a94a6)' }
};

async function renderEstadoSapTab() {
    var listEl = document.getElementById('estadoSapList');
    var statusEl = document.getElementById('estadoSapStatus');
    var avisoEl = document.getElementById('estadoSapAviso');
    if (!currentOrderCode || !listEl) return;
    if (statusEl) statusEl.textContent = 'Cargando estado en SAP...';
    if (listEl) listEl.innerHTML = '';
    try {
        var r = await fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/estado-sap', { headers: sessionHeaderSafe() });
        var data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No fue posible cargar el estado en SAP.');
        if (statusEl) statusEl.textContent = '';
        if (avisoEl) {
            if (data.avisoFactura) {
                avisoEl.hidden = false;
                avisoEl.textContent = 'Producto terminado listo. Confirmá la factura desde la fila "Factura".';
            } else {
                avisoEl.hidden = true;
            }
        }
        listEl.innerHTML = (data.documentos || []).map(function (d) {
            var meta = ESTADO_SAP_CLASES[d.estado] || ESTADO_SAP_CLASES.no_iniciado;
            var detalle = d.docEntry
                ? ('Doc: ' + escapeHtml(String(d.docEntry)))
                : (d.ultimoError ? escapeHtml(d.ultimoError) : '');
            var puedeReintentar = d.estado === 'fallido' || d.estado === 'no_iniciado' || d.estado === 'en_cola';
            return '<div class="sap-consumption-row">'
                + '<div><strong>' + escapeHtml(d.etiqueta) + '</strong>'
                + '<div style="font-size:11px;color:' + meta.color + ';font-weight:700;">' + meta.txt
                + (d.intentos ? (' · ' + d.intentos + ' intento' + (d.intentos === 1 ? '' : 's')) : '') + '</div>'
                + (detalle ? '<div style="font-size:11px;color:var(--ink-3);margin-top:2px;">' + detalle + '</div>' : '')
                + '</div>'
                + (puedeReintentar
                    ? '<button type="button" class="action-btn" data-estado-sap-retry="' + escapeHtml(d.tipo) + '">Reintentar</button>'
                    : '<span></span>')
                + '</div>';
        }).join('') || '<div class="production-summary-empty">Sin documentos SAP para esta orden.</div>';
    } catch (error) {
        if (statusEl) statusEl.textContent = error.message || 'No fue posible cargar el estado en SAP.';
    }
}

function sessionHeaderSafe() {
    try { return (typeof sessionHeader === 'function') ? sessionHeader() : {}; } catch (_) { return {}; }
}

document.addEventListener('click', function (event) {
    var retryBtn = event.target.closest('[data-estado-sap-retry]');
    if (retryBtn) {
        event.preventDefault();
        var tipo = retryBtn.dataset.estadoSapRetry;
        retryBtn.disabled = true;
        retryBtn.textContent = 'Enviando...';
        fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/estado-sap/' + encodeURIComponent(tipo) + '/reintentar', {
            method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeaderSafe())
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!res.ok) alert(res.j.error || 'No fue posible reintentar.');
            renderEstadoSapTab();
          }).catch(function () { renderEstadoSapTab(); });
        return;
    }
    if (event.target.id === 'estadoSapRefreshBtn') { renderEstadoSapTab(); return; }
    if (event.target.id === 'estadoSapLiveBtn') {
        var btn = event.target;
        btn.disabled = true;
        var prev = btn.textContent;
        btn.textContent = 'Consultando...';
        fetch('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/estado-sap/consultar-vivo', { headers: sessionHeaderSafe() })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var lines = (data.connector || []).map(function (c) {
                    return c.etiqueta + ': ' + c.estadoConector + (c.error ? (' (' + c.error + ')') : '');
                });
                alert('Estado en vivo (conector SAP):\n\n' + (lines.join('\n') || 'Sin registros en la bandeja del conector.'));
            })
            .catch(function () { alert('No fue posible consultar en vivo.'); })
            .finally(function () { btn.disabled = false; btn.textContent = prev; });
    }
});

function switchMenuTab(tab) {
    setActiveMenuTabUI(tab);
    loadMenuTabContent(tab);
    var popover = document.getElementById('orderMenuPopover');
    if (popover && !popover.hidden) positionHeaderTabPopover('orderMenuPopover');
}

async function openOrderMenuPopover() {
    setActiveMenuTabUI('flujo');
    openPopover('orderMenuPopover');
    await loadMenuTabContent('flujo');
}

async function fetchOrderFlowSteps() {
    const payload = await fetchJsonWithRetry('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento', {
        headers: sessionHeader()
    }, { retries: 3, retryDelay: 800 });
    var steps = Array.isArray(payload.steps) ? payload.steps.filter(function (s) { return s.processKey !== 'barnizado' && s.processKey !== 'troquelado'; }) : [];
    payload.steps = steps;
    currentOrderFlowPayload = payload;
    currentOrderFlowSteps = steps;
    return currentOrderFlowSteps;
}

async function toggleTrackingStep(index) {
    var steps = currentOrderFlowPayload && currentOrderFlowPayload.steps;
    if (!steps || !steps[index]) return;
    var step = steps[index];
    var isDone = String(step.routeStatus || '').toUpperCase() === 'COMPLETADO';
    if (step.processKey === 'empaque' && !isDone) {
        showEmpaqueLoteForm(index);
        return;
    }
    var button = orderFlowBody?.querySelector('[data-tracking-toggle-index="' + index + '"]');
    if (button) button.disabled = true;
    await fetchJsonWithRetry('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento/marca', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ processKey: step.processKey, marked: !isDone })
    }, { retries: 2, retryDelay: 700 });
    await fetchOrderFlowSteps();
    renderOrderTracking(currentOrderFlowPayload);
}

var EMPAQUE_FORM_OPEN = null;
var EMPAQUE_ADVERTENCIA_TEXTO = '';

function showEmpaqueAdvertencia() {
    notify('Advertencia de Empaque', EMPAQUE_ADVERTENCIA_TEXTO || 'Sin detalle.', 'warning');
}

function showEmpaqueLoteForm(index) {
    EMPAQUE_FORM_OPEN = index;
    renderEmpaqueLoteForm();
}

function renderEmpaqueLoteForm() {
    var existing = document.getElementById('flow-empaque-form');
    if (existing) existing.remove();
    if (EMPAQUE_FORM_OPEN === null || !orderFlowBody) return;
    var today = new Date().toISOString().slice(0, 10);
    var form = document.createElement('div');
    form.id = 'flow-empaque-form';
    form.className = 'cr-form';
    form.style.margin = '12px 22px';
    form.innerHTML = '<div class="cr-form-title"><i class="ti ti-box"></i>Finalizar Empaque — Datos del Lote</div>'
        + '<label>Cantidad Producida *<input type="number" id="ef-cantidad" class="cr-input" min="0" step="0.01"></label>'
        + '<label>Fecha Producción *<input type="date" id="ef-fecha" class="cr-input" value="' + today + '"></label>'
        + '<label>Turno<input type="text" id="ef-turno" class="cr-input" placeholder="A, B o C"></label>'
        + '<label>Número de Rollos<input type="number" id="ef-rollos" class="cr-input" min="0"></label>'
        + '<label>Número de Cajas<input type="number" id="ef-cajas" class="cr-input" min="0"></label>'
        + '<label>Notas<textarea id="ef-notas" class="cr-textarea"></textarea></label>'
        + '<div class="form-actions">'
        + '<button class="btn btn-ghost" onclick="EMPAQUE_FORM_OPEN=null;var f=document.getElementById(\'flow-empaque-form\');if(f)f.remove();">Cancelar</button>'
        + '<button class="btn btn-commit" id="ef-submit-btn" onclick="submitEmpaqueLote()">Finalizar Empaque</button></div>';
    orderFlowBody.parentNode.insertBefore(form, orderFlowBody.nextSibling);
}

function submitEmpaqueLote() {
    var index = EMPAQUE_FORM_OPEN;
    var steps = currentOrderFlowPayload && currentOrderFlowPayload.steps;
    if (index === null || !steps || !steps[index]) return;
    var cantidad = Number(document.getElementById('ef-cantidad').value);
    var fecha = document.getElementById('ef-fecha').value;
    if (!(cantidad > 0) || !fecha) {
        notify('Finalizar Empaque', 'Debes ingresar la Cantidad Producida y la Fecha de Producción.', 'warning');
        return;
    }
    var submitBtn = document.getElementById('ef-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    fetchJsonWithRetry('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento/marca', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({
            processKey: 'empaque',
            marked: true,
            loteData: {
                cantidad_producida: cantidad,
                fecha_produccion: fecha,
                turno: document.getElementById('ef-turno').value || null,
                numero_rollos: document.getElementById('ef-rollos').value || null,
                numero_cajas: document.getElementById('ef-cajas').value || null,
                notas: document.getElementById('ef-notas').value || null
            }
        })
    }, { retries: 0 }).then(function () {
        EMPAQUE_FORM_OPEN = null;
        var f = document.getElementById('flow-empaque-form');
        if (f) f.remove();
        return fetchOrderFlowSteps();
    }).then(function () {
        renderOrderTracking(currentOrderFlowPayload);
        notify('Empaque completado', 'Lote de producto terminado creado', 'success');
    }).catch(function (error) {
        if (submitBtn) submitBtn.disabled = false;
        notify('Error', error.message || 'No fue posible finalizar Empaque.', 'danger');
    });
}

async function openPlanningControlPopover() {
    if (!currentOrderCode) return;
    await openOrderFlowPopover();
}

function openRoute(route, label, flotante) {
    if (shellEmbedded) {
        window.parent.postMessage({ type: 'erp-open-tab', route, label, flotante: flotante === true }, window.location.origin);
        return;
    }
    window.location.href = route;
}

function buildBdfgContext() {
    if (!currentOrderCode) return null;
    return {
        kind: 'order-document',
        title: 'Orden ' + currentOrderCode,
        subtitle: currentOrderCode,
        orderCode: currentOrderCode,
        documentDescription: 'Abrir la orden de producción actual',
        dates: {
            updatedAt: (currentLoadedOrder && currentLoadedOrder.raw_data && currentLoadedOrder.raw_data.updated_at) || ''
        }
    };
}

function publishBdfgContext() {
    if (!shellEmbedded) return;
    const message = { type: 'erp-bdfg-context', context: buildBdfgContext() };
    window.parent.postMessage(message, window.location.origin);
}

function buildOrderDataLink(route, label, title, flotante) {
    if (!route || !label) return '';
    return `<a class="production-data-link" href="${escapeHtml(route)}" data-order-route="${escapeHtml(route)}" data-order-label="${escapeHtml(title || label)}"${flotante ? ' data-order-flotante="1"' : ''}>${escapeHtml(label)}</a>`;
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('.production-data-link[data-order-route]');
    if (!link) return;
    event.preventDefault();
    openRoute(link.dataset.orderRoute || link.getAttribute('href'), link.dataset.orderLabel || link.textContent.trim(), link.dataset.orderFlotante === '1');
});

function buildCalcRoute({ quoteCode, lineCode, productCode, department }) {
    const params = new URLSearchParams({ lineId: lineCode || '', quoteId: quoteCode || '', productId: productCode || '', department: department || '' });
    return `/calculo-flexografia?${params.toString()}`;
}

function extractAttachments(raw = {}) {
    const direct = Array.isArray(raw.attachments) ? raw.attachments : [];
    if (direct.length) return direct;
    const lineRaw = raw.line_snapshot?.raw_data || {};
    return Object.entries(lineRaw)
        .filter(([key, value]) => typeof value === 'string' && /(adjunt|arte|pdf|imagen|archivo|url|link)/i.test(key) && !/en poder/i.test(key) && value.trim())
        .map(([key, value]) => ({ label: key, value }));
}

function getSourceQuoteContext(order = currentLoadedOrder) {
    const raw = order?.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const detail = raw.line_snapshot || {};
    const line = raw.line_summary || {};
    const quoteCode = pickFirst(raw.source_quote_code, quote.quote_code);
    const lineCode = pickFirst(raw.source_line_code, detail.lineCode, line.line_code);
    return { quoteCode, lineCode };
}

function isArtworkAttachment(item = {}) {
    const note = String(item.notes || '').toLowerCase();
    const label = String(item.label || item.key || item.file_name || '').toLowerCase();
    if (note.includes('adjunto_orden')) return false;
    return note.includes('arte') || label.includes('arte');
}

async function refreshOrderAttachments() {
    const { quoteCode, lineCode } = getSourceQuoteContext();
    const inlineAttachments = extractAttachments(currentLoadedOrder?.raw_data || {});
    if (!quoteCode || !lineCode) {
        currentOrderAttachments = inlineAttachments;
        return currentOrderAttachments;
    }
    const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los adjuntos relacionados.');
    currentOrderAttachments = Array.isArray(payload.items) ? payload.items : [];
    inlineAttachments.forEach((item) => {
        const exists = currentOrderAttachments.some((entry) =>
            String(entry.id || '') === String(item.id || '') &&
            String(entry.label || entry.file_name || '') === String(item.label || item.file_name || '')
        );
        if (!exists) currentOrderAttachments.push(item);
    });
    return currentOrderAttachments;
}

function renderSapConsumptionHistory(items = []) {
    if (!sapConsumptionHistory) return;
    if (!items.length) {
        sapConsumptionHistory.innerHTML = '<div class="production-summary-empty">Sin descargas solicitadas.</div>';
        return;
    }
    sapConsumptionHistory.innerHTML = items.slice(0, 12).map((item) => `
        <div class="sap-consumption-row">
            <div>
                <strong>${escapeHtml(item.material_name || item.sap_item_code || 'Material')}</strong>
                <span>${escapeHtml(item.process_key || '')} · ${parseNumber(item.quantity)} ${escapeHtml(item.unit_code || '')} · ${escapeHtml(item.requested_by || '')}</span>
            </div>
            <div class="sap-consumption-status">${escapeHtml(item.sap_status || 'PENDIENTE')}</div>
        </div>
    `).join('');
}

async function loadSapConsumptionMaterials() {
    if (!currentOrderCode || !sapConsumptionMaterial) return;
    const processKey = sapConsumptionProcess?.value || 'impresion';
    sapConsumptionStatus.textContent = 'Cargando materiales de descarga...';
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(currentOrderCode)}/materiales-consumo?process=${encodeURIComponent(processKey)}`, {
        headers: sessionHeader()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'No fue posible cargar materiales.');
    currentSapConsumptionMaterials = Array.isArray(payload.materials) ? payload.materials : [];
    sapConsumptionMaterial.innerHTML = currentSapConsumptionMaterials.length
        ? currentSapConsumptionMaterials.map((item, index) => `<option value="${index}">${escapeHtml(item.materialName || item.sapItemCode)}${item.sapItemCode ? ` (${escapeHtml(item.sapItemCode)})` : ''}</option>`).join('')
        : '<option value="">Sin materiales autorizados</option>';
    renderSapConsumptionHistory(payload.history || []);
    sapConsumptionStatus.textContent = currentSapConsumptionMaterials.length
        ? 'Materiales filtrados por orden/cotización y proceso.'
        : 'No hay materiales autorizados para este proceso.';
}

async function submitSapConsumption(event) {
    event.preventDefault();
    const selected = currentSapConsumptionMaterials[Number(sapConsumptionMaterial?.value || -1)];
    if (!selected) {
        sapConsumptionStatus.textContent = 'Selecciona un material autorizado.';
        return;
    }
    const quantity = Number(sapConsumptionQuantity?.value || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        sapConsumptionStatus.textContent = 'Indica una cantidad mayor a cero.';
        return;
    }
    sapConsumptionStatus.textContent = 'Registrando descarga pendiente para SAP...';
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(currentOrderCode)}/materiales-consumo`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({
            processKey: sapConsumptionProcess?.value || 'impresion',
            sapItemCode: selected.sapItemCode,
            materialName: selected.materialName,
            materialFamily: selected.materialFamily,
            quantity,
            unitCode: selected.unitCode,
            reason: sapConsumptionReason?.value || ''
        })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'No fue posible registrar la descarga.');
    if (sapConsumptionQuantity) sapConsumptionQuantity.value = '';
    if (sapConsumptionReason) sapConsumptionReason.value = '';
    await loadSapConsumptionMaterials();
    sapConsumptionStatus.textContent = 'Descarga registrada como PENDIENTE para SAP.';
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',').pop() : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
        reader.readAsDataURL(file);
    });
}

async function uploadArtworkFile(file, target = null) {
    if (!file) return;
    const sourceContext = getSourceQuoteContext();
    const quoteCode = target?.quoteCode || sourceContext.quoteCode;
    const lineCode = target?.lineCode || sourceContext.lineCode;
    if (!quoteCode || !lineCode) throw new Error('La orden no tiene una cotización/línea origen válida para guardar el arte.');
    if (!/^image\//i.test(file.type || '')) throw new Error('Solo se permiten imágenes para el arte de la orden.');
    statusBox.hidden = false;
    statusBox.textContent = 'Cargando arte...';
    const contentBase64 = await fileToBase64(file);
    const previewValue = `data:${file.type || 'image/png'};base64,${contentBase64}`;
    const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileName: file.name,
            contentBase64,
            mimeType: file.type || 'image/png',
            fileExt: (file.name.split('.').pop() || '').toLowerCase(),
            notes: 'arte_orden',
            uploadedBy: 'admin'
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo subir el arte.');
    if (target?.dropzone) {
        target.dropzone.innerHTML = `<img src="${escapeHtml(previewValue)}" alt="Arte del producto" class="production-art-image">`;
        target.dropzone.classList.remove('is-dragover');
        statusBox.hidden = true;
        return;
    }
    await refreshOrderAttachments();
    if (payload.adjunto?.id) {
        currentOrderAttachments = currentOrderAttachments.map((item) =>
            String(item.id || '') === String(payload.adjunto.id)
                ? { ...item, value: previewValue, mime_type: item.mime_type || file.type, notes: item.notes || 'arte_orden' }
                : item
        );
    }
    renderArtwork(currentOrderAttachments);
    renderAttachmentsPopover(currentOrderAttachments);
    artworkFileInput.value = '';
    statusBox.hidden = true;
}

function renderAttachmentsPopover(attachments = []) {
    const deleteConf = getOrderIcon(['quoteRequestAttachmentDelete', 'eliminar adjunto solicitud'], 'quoteRequestAttachmentDelete', '×', '#b94848', 18);
    const downloadConf = getOrderIcon(['attachmentDownload'], 'attachmentDownload', '⇩', '#0b81b8', 18);
    attachmentsPopoverBody.innerHTML = attachments.length
        ? attachments.map((item, index) => {
            const label = item.label || item.file_name || item.key || 'Adjunto';
            const value = item.value || item.file_name || '';
            const notes = item.notes ? `<div class="attachment-card-meta">${escapeHtml(String(item.notes))}</div>` : '';
            const mimeType = String(item.mime_type || '').toLowerCase();
            const isImage = mimeType.startsWith('image/') || /^data:image\//i.test(String(value));
            const isAudio = mimeType.startsWith('audio/');
            const imageSrc = isImage ? (value.startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : '')) : '';
            const audioSrc = isAudio ? (value.startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : '')) : '';
            const preview = isImage && imageSrc
                ? `<div class="attachment-card-preview"><img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(label)}" class="attachment-card-thumb"></div>`
                : isAudio && audioSrc
                    ? `<div class="attachment-card-preview attachment-card-preview-audio"><audio controls src="${escapeHtml(audioSrc)}" class="attachment-card-audio"></audio></div>`
                    : '';
            return `
                <article class="attachment-card" data-attachment-index="${index}">
                    ${preview}
                    <div class="attachment-card-main">
                        <strong>${escapeHtml(label)}</strong>
                        ${!isImage && !isAudio ? `<div class="attachment-card-meta">${escapeHtml(String(value))}</div>` : ''}
                        ${notes}
                    </div>
                    <div class="attachment-card-actions">
                        ${item.id ? `<a class="attachment-action-btn" href="/api/adjuntos/${encodeURIComponent(item.id)}/download" target="_blank" rel="noopener noreferrer" aria-label="Descargar adjunto" title="Descargar" data-icon-role="download"></a>` : ''}
                        <button type="button" class="attachment-action-btn attachment-action-delete" data-delete-attachment="${index}" aria-label="Eliminar adjunto" title="Eliminar" data-icon-role="delete"></button>
                    </div>
                </article>
            `;
        }).join('')
        : '<div class="attachments-empty">Esta orden no tiene adjuntos relacionados todavía.</div>';
    attachmentsPopoverBody.querySelectorAll('[data-icon-role="download"]').forEach((el) => {
        renderIcon(el, downloadConf.value, downloadConf.color, downloadConf.size);
    });
    attachmentsPopoverBody.querySelectorAll('[data-icon-role="delete"]').forEach((el) => {
        renderIcon(el, deleteConf.value, deleteConf.color, deleteConf.size);
    });
    attachmentsPopoverBody.querySelectorAll('[data-delete-attachment]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.deleteAttachment);
            if (!Number.isInteger(idx)) return;
            deleteAttachment(idx);
        });
    });
}

function buildAttachmentPreviewContent(item) {
    const label = item.label || item.file_name || item.key || 'Adjunto';
    const value = String(item.value || item.file_name || '');
    const mimeType = String(item.mime_type || '').toLowerCase();
    const nameForExt = String(item.file_name || item.label || value || '').toLowerCase();
    const ext = (nameForExt.match(/\.([a-z0-9]+)$/) || ['', ''])[1];
    const src = value.startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : value);
    const isImage = mimeType.startsWith('image/') || /^data:image\//i.test(value) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
    const isAudio = mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
    const isVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
    if (isImage && src) return `<img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" class="attachment-preview-image">`;
    if (isPdf && src) return `<iframe src="${escapeHtml(src)}" class="attachment-preview-frame" title="${escapeHtml(label)}"></iframe>`;
    if (isAudio && src) return `<audio controls src="${escapeHtml(src)}" class="attachment-preview-audio"></audio>`;
    if (isVideo && src) return `<video controls src="${escapeHtml(src)}" class="attachment-preview-video"></video>`;
    return '<div class="production-summary-empty">Vista previa no disponible para este tipo de archivo.</div>'
        + (src ? `<a class="attachment-action-btn attachment-preview-download-link" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">Abrir / Descargar</a>` : '');
}

function openAttachmentPreview(index) {
    const item = currentOrderAttachments[index];
    if (!item) return;
    const label = item.label || item.file_name || item.key || 'Adjunto';
    const titleEl = document.getElementById('orderAttachmentPreviewTitle');
    if (titleEl) titleEl.textContent = label;
    const bodyEl = document.getElementById('orderAttachmentPreviewBody');
    if (bodyEl) bodyEl.innerHTML = buildAttachmentPreviewContent(item);
    openPopover('orderAttachmentPreviewPopover');
}

attachmentsPopoverBody?.addEventListener('click', (event) => {
    if (event.target.closest('.attachment-card-actions')) return;
    const card = event.target.closest('.attachment-card[data-attachment-index]');
    if (!card) return;
    const idx = Number(card.dataset.attachmentIndex);
    if (!Number.isInteger(idx)) return;
    openAttachmentPreview(idx);
});

function isHeaderTabPopover(popover) {
    return Boolean(popover?.classList?.contains('production-header-tab-popover'));
}

function headerTabButtonFor(id) {
    return id === 'orderMenuPopover' ? menuButton : null;
}

function syncHeaderTabButtons(activeId = '') {
    if (!menuButton) return;
    const active = activeId === 'orderMenuPopover';
    menuButton.classList.toggle('is-active', active);
    menuButton.setAttribute('aria-pressed', active ? 'true' : 'false');
}

// Información de Arte expandida termina donde termina la imagen (y el botón de borrar
// debajo de ella) — ya no se estira hasta Observaciones.
function updateArtworkSectionConstraint() {
    if (!artSection) return;
    artSection.style.height = '';
    artSection.style.maxHeight = '';
    artworkSectionBaseHeight = 0;
    artworkSectionMaxHeight = 0;
}

function buildPantones(raw = {}, detail = {}) {
    const pantones = [raw['PANTONE 1'], raw['PANTONE 2'], raw['PANTONE 3']].filter(Boolean);
    const pantoneCount = Number(detail.pantoneCount || pantones.length || 0);
    return { count: pantoneCount, items: pantones };
}

function openPopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    if (isHeaderTabPopover(popover)) {
        document.querySelectorAll('.production-header-tab-popover').forEach((node) => {
            if (node.id && node.id !== id) closePopover(node.id);
        });
        syncHeaderTabButtons(id);
    }
    popover.hidden = false;
    popover.classList.add('is-visible');
    if (!isHeaderTabPopover(popover)) document.body.classList.add('popover-open');
    if (isHeaderTabPopover(popover)) positionHeaderTabPopover(id);
}

function closePopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    popover.hidden = true;
    popover.classList.remove('is-visible');
    if (isHeaderTabPopover(popover)) syncHeaderTabButtons('');
    if (![...document.querySelectorAll('.calc-popover:not(.production-header-tab-popover)')].some((node) => !node.hidden)) document.body.classList.remove('popover-open');
}

function positionHeaderTabPopover(id) {
    const popover = document.getElementById(id);
    const panel = popover?.querySelector?.('.calc-popover-panel');
    if (!popover || !panel) return;
    const button = headerTabButtonFor(id);
    if (!button) return;
    // Antes de medir, quitamos cualquier max-height forzado en la posición
    // anterior (ver más abajo) — si no, el alto medido queda inflado con el
    // de la pestaña previamente mostrada en vez del contenido actual.
    panel.style.removeProperty('max-height');
    panel.querySelector('.production-menu-popover-body')?.style.removeProperty('max-height');
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const panelWidth = panel.offsetWidth || 320;
    const panelHeight = panel.offsetHeight || 320;
    const gap = 8;
    panel.style.position = 'fixed';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.removeProperty('--tab-left');
    panel.style.removeProperty('--tab-width');
    panel.style.removeProperty('--tab-offset');
    panel.style.removeProperty('--tab-bridge-height');
    panel.classList.add('panel-left-side');
    // El panel se muestra al lado del botón (a su izquierda; a la derecha si
    // no hay espacio a la izquierda), nunca debajo. Verticalmente se ancla
    // por su borde inferior contra el borde inferior del botón y crece hacia
    // arriba —incluso por encima del botón— para aprovechar el espacio
    // disponible de la ventana en vez de recortarse hacia abajo.
    let left = rect.left - panelWidth - gap;
    if (left < margin) left = rect.right + gap;
    const maxLeft = window.innerWidth - panelWidth - margin;
    if (left > maxLeft) left = maxLeft;
    if (left < margin) left = margin;
    let top = rect.bottom - panelHeight;
    const maxTop = window.innerHeight - panelHeight - margin;
    if (top > maxTop) top = maxTop;
    if (top < margin) top = margin;
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    const maxWidth = window.innerWidth - margin * 2;
    if (panelWidth > maxWidth) {
        panel.style.width = `${maxWidth}px`;
    }
    // Menú de la orden: acota el alto a lo que quede desde su borde superior
    // hasta el fondo de la ventana menos un margen inferior prudente, para que
    // el modal no toque el borde de la pantalla (el scroll interno hace el resto).
    if (id === 'orderMenuPopover') {
        const topPx = parseFloat(panel.style.top) || 0;
        const avail = Math.max(280, window.innerHeight - topPx - 24);
        panel.style.setProperty('max-height', `${avail}px`, 'important');
        const menuBody = panel.querySelector('.production-menu-popover-body');
        if (menuBody) menuBody.style.setProperty('max-height', `${avail}px`, 'important');
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        panel.style.filter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.30)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.40))';
    } else {
        panel.style.filter = 'drop-shadow(0 2px 8px rgba(15, 23, 42, 0.08)) drop-shadow(0 8px 24px rgba(15, 23, 42, 0.10))';
    }
}

function iconSuffix(key) {
    return String(key || '').split(/[.\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function iconConfigFor(key, fallbackValue, fallbackColor = '#1e516d', fallbackSize = 18) {
    const general = currentConfig.general || {};
    const suffix = iconSuffix(key);
    return {
        value: currentConfig.icons?.[key] || fallbackValue || '',
        color: general[`iconColor${suffix}`] || fallbackColor,
        hover: general[`iconColorHover${suffix}`] || general[`iconColor${suffix}`] || fallbackColor,
        size: Number(general[`iconSize${suffix}`]) || fallbackSize
    };
}

function renderIconButton(button, iconValue) {
    if (!button) return;
    const config = typeof iconValue === 'object' && iconValue !== null ? iconValue : { value: iconValue };
    const value = String(config.value || '').trim();
    if (config.color) button.style.setProperty('--icon-color', config.color);
    if (config.hover) button.style.setProperty('--icon-hover-color', config.hover);
    if (config.color) button.style.color = config.color;
    if (config.size) {
        button.style.setProperty('--config-icon-size', `${config.size}px`);
        button.style.fontSize = `${config.size}px`;
    }
    if (!value) {
        button.innerHTML = '';
        return;
    }
    const isSvg = /^data:image\/svg\+xml/i.test(value) || /\.svg(\?|#|$)/i.test(value);
    const isImage = /^data:image\//i.test(value) || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value);
    if (isSvg) {
        button.innerHTML = `<span class="icon-svg-mask table-icon-media" style="width:var(--config-icon-size,18px);height:var(--config-icon-size,18px);-webkit-mask-image:url('${escapeHtml(value)}');mask-image:url('${escapeHtml(value)}');"></span>`;
    } else if (isImage) {
        button.innerHTML = `<span class="icon-image-wrap table-icon-media" role="img" aria-label=""><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${escapeHtml(value)}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
    } else {
        button.textContent = value;
    }
}

function renderIcon(target, iconValue, color, size) {
    if (!target) return;
    const host = target.closest('.attachment-action-btn, .quote-request-icon-action, .quote-request-attachment-remove');
    const value = String(iconValue || '').trim();
    const iconSize = Number(size) || 18;
    if (host) {
        host.style.setProperty('--icon-color', color || '');
        host.style.setProperty('--icon-hover-color', color || '');
        host.style.setProperty('--config-icon-size', `${iconSize}px`);
    }
    target.style.color = host ? 'currentColor' : (color || '');
    const isSvg = /^data:image\/svg\+xml/i.test(value) || /\.svg(\?|#|$)/i.test(value);
    const isImage = /^data:image\//i.test(value) || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value);
    if (isSvg) {
        target.innerHTML = `<span class="icon-svg-mask table-icon-media" style="width:${iconSize}px;height:${iconSize}px;-webkit-mask-image:url('${escapeHtml(value)}');mask-image:url('${escapeHtml(value)}');"></span>`;
    } else if (isImage) {
        target.innerHTML = `<span class="icon-image-wrap table-icon-media" role="img" aria-label="" style="width:${iconSize}px;height:${iconSize}px;"><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${escapeHtml(value)}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
    } else {
        target.innerHTML = `<span class="icon-glyph" style="font-size:${iconSize}px;">${escapeHtml(value)}</span>`;
    }
}

let currentProcesosEnVivo = [];
let liveTooltipTimer = null;

const PROCESS_LIVE_SECTION_IDS = {
    barnizado: 'orderBarnizSection',
    estampado: 'orderEstampadoSection',
    laminado: 'orderLaminadoSection',
    troquelado: 'orderTroqueladoSection',
    rebobinado: 'orderRebobinadoSection',
    empaque: 'orderEmpaqueSection'
};

function formatElapsedSince(startIso) {
    const start = startIso ? new Date(startIso).getTime() : NaN;
    if (!Number.isFinite(start)) return 'Sin dato';
    const totalMinutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
}

function showLiveProcessTooltip(anchorEl, proceso) {
    hideLiveProcessTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'production-live-tooltip';
    tooltip.id = 'productionLiveTooltip';
    const statusLabel = { RUN: 'En proceso', SETUP: 'En preparación', PARO: 'En paro' }[proceso.routeStatus] || proceso.routeStatus;
    tooltip.innerHTML = `
        <strong>${escapeHtml(statusLabel)}</strong>
        <div><span>Tiempo transcurrido</span><span id="productionLiveTooltipElapsed"></span></div>
        <div><span>Operario</span><span>${escapeHtml(proceso.operatorName || 'Sin asignar')}</span></div>
        <div><span>Máquina</span><span>${escapeHtml(proceso.machineName || 'Sin asignar')}</span></div>
    `;
    document.body.appendChild(tooltip);
    const rect = anchorEl.getBoundingClientRect();
    tooltip.style.top = `${window.scrollY + rect.bottom + 6}px`;
    tooltip.style.left = `${window.scrollX + rect.left}px`;
    const updateElapsed = () => {
        const el = document.getElementById('productionLiveTooltipElapsed');
        if (el) el.textContent = formatElapsedSince(proceso.actualStartAt);
    };
    updateElapsed();
    liveTooltipTimer = setInterval(updateElapsed, 15000);
}

function hideLiveProcessTooltip() {
    if (liveTooltipTimer) { clearInterval(liveTooltipTimer); liveTooltipTimer = null; }
    document.getElementById('productionLiveTooltip')?.remove();
}

// Ícono verde parpadeante (igual al "En curso" de produccion.html) en el encabezado de cada
// tarjeta de proceso con una ruta SETUP/RUN/PARO ahora mismo; al pasar el mouse muestra tiempo
// transcurrido, operario y máquina.
function renderProcesosEnVivo(procesos) {
    const porClave = new Map((Array.isArray(procesos) ? procesos : []).map((p) => [p.processKey, p]));
    Object.entries(PROCESS_LIVE_SECTION_IDS).forEach(([key, sectionId]) => {
        const section = document.getElementById(sectionId);
        const caption = section?.querySelector('.section-caption');
        if (!caption) return;
        caption.querySelector('.production-live-dot')?.remove();
        const proceso = porClave.get(key);
        if (!proceso || section.hidden) return;
        const dot = document.createElement('span');
        dot.className = 'production-live-dot';
        dot.addEventListener('mouseenter', () => showLiveProcessTooltip(dot, proceso));
        dot.addEventListener('mouseleave', hideLiveProcessTooltip);
        caption.appendChild(dot);
    });
}

// Reparte las tarjetas de Acabados visibles entre exactamente 2 filas (la de arriba se lleva
// el sobrante impar), en vez de dejar que el wrap natural del flex deje una sola tarjeta
// huérfana en la fila de abajo cuando el conteo no es múltiplo del ancho disponible.
function redistributeAcabadosFlex(containerId) {
    // La ficha técnica ahora usa CSS grid (repeat(auto-fill, minmax(...))), que reparte los
    // módulos de forma pareja sin huérfanos ni huecos. Solo limpiamos estilos inline viejos.
    var container = document.getElementById(containerId);
    if (!container) return;
    Array.prototype.forEach.call(container.children, function (el) {
        if (el.tagName === 'SECTION') { el.style.flexBasis = ''; el.style.maxWidth = ''; }
    });
}

// Rediseño de la orden: reubica módulos por DOM (todos los IDs se conservan) sin reescribir el HTML.
// - Muestras/VB (izq) + Arte (der) como fila superior, debajo del nombre de producto.
// - "Máquina de Impresión" pasa a vivir DENTRO del módulo "Impresión" (antes "Motivos"),
//   antes de la tabla de motivos.
function relocateOrderModules() {
    var productRow = document.getElementById('orderProductRow');
    var host = document.getElementById('orderTopModules');
    if (!host && productRow && productRow.parentNode) {
        host = document.createElement('div');
        host.id = 'orderTopModules';
        host.className = 'production-top-modules';
        productRow.parentNode.insertBefore(host, productRow.nextSibling);
    }
    var samples = document.querySelector('.production-samples-section');
    var art = document.querySelector('.production-art-section');
    // Información General (identidad del pedido) va apilada ENCIMA de Muestras, compartiendo
    // su misma columna izquierda — sin tocar la columna de Arte (derecha).
    var infoGeneral = document.getElementById('orderInfoGeneralSection');
    var leftCol = document.getElementById('orderTopLeftCol');
    if (host && samples) {
        if (!leftCol) {
            leftCol = document.createElement('div');
            leftCol.id = 'orderTopLeftCol';
            leftCol.className = 'production-bottom-left-col';
            host.appendChild(leftCol);
        }
        if (infoGeneral && infoGeneral.parentNode !== leftCol) leftCol.appendChild(infoGeneral);
        if (samples.parentNode !== leftCol) leftCol.appendChild(samples);
    }
    if (host && art && art.parentNode !== host) host.appendChild(art);

    var motivosLayout = document.getElementById('orderMotivosLayout');
    var maquina = document.getElementById('orderMaquinaSection');
    var motivosWrap = document.getElementById('orderMotivosTableWrap');
    // "Impresión" pasa a ser un módulo de nivel superior (no anidado dentro de Configuración de
    // Producción) para quitarle el borde de caja-en-caja, y aloja la Máquina de Impresión.
    var config = document.getElementById('orderProductionConfig');
    if (motivosLayout && config && config.parentNode && motivosLayout.parentNode !== config.parentNode) {
        config.parentNode.insertBefore(motivosLayout, config.nextSibling);
    }
    var cap = null, kids = motivosLayout ? motivosLayout.children : [];
    for (var i = 0; i < kids.length; i++) {
        if (kids[i].classList && kids[i].classList.contains('section-caption')) { cap = kids[i]; break; }
    }
    if (cap && (cap.textContent.trim() === 'Artes' || cap.textContent.trim() === 'Motivos')) cap.textContent = 'Impresión';
    // Cabecera de "Impresión": título + Máquina a la izquierda, vista previa del arte a la
    // derecha ocupando todo el alto de ambos.
    var cabecera = document.getElementById('orderImpresionCabecera');
    if (motivosLayout && maquina && motivosWrap && !cabecera) {
        cabecera = document.createElement('div');
        cabecera.id = 'orderImpresionCabecera';
        cabecera.className = 'impresion-cabecera';
        cabecera.innerHTML = '<div id="orderMaquinaArte" class="maquina-arte"></div>';
        motivosLayout.insertBefore(cabecera, motivosWrap);
    }
    if (cabecera && cap && cap.parentNode !== cabecera) cabecera.insertBefore(cap, cabecera.firstChild);
    if (cabecera && maquina && maquina.parentNode !== cabecera) cabecera.insertBefore(maquina, document.getElementById('orderMaquinaArte'));
    if (motivosLayout) motivosLayout.hidden = false;

    // "Configuración de Producción" quedó sin contenido visible (Arte se movió arriba; el resto
    // de los datos ya viven en la ficha técnica y su grid de impresión está oculto). Se elimina.
    if (config) {
        var grid = document.getElementById('orderPrintingGrid');
        var alert = document.getElementById('orderPrintingAlert');
        var gridVacio = !grid || grid.hidden;
        var alertVacio = !alert || alert.hidden || !alert.textContent.trim();
        config.hidden = gridVacio && alertVacio;
    }

    // Entrega ya no puede ir arriba: se pone junto a Observaciones — Observaciones (izq) + Entrega (der).
    var obs = document.querySelector('.production-observations-section');
    var delivery = document.querySelector('.production-delivery-section');
    if (obs && delivery && obs.parentNode) {
        var bottomHost = document.getElementById('orderBottomModules');
        if (!bottomHost) {
            bottomHost = document.createElement('div');
            bottomHost.id = 'orderBottomModules';
            bottomHost.className = 'production-top-modules';
            obs.parentNode.insertBefore(bottomHost, obs);
        }
        if (obs.parentNode !== bottomHost) bottomHost.appendChild(obs);
        if (delivery.parentNode !== bottomHost) bottomHost.appendChild(delivery);
    }

    // La columna de la ficha donde vivía Troquelado se parte en dos: Sellos arriba,
    // Troquelado abajo. Ambos módulos se envuelven en un contenedor vertical que pasa a ser
    // el flex-item de la ficha.
    var flex = document.getElementById('orderAcabadosFlex');
    var sellos = document.getElementById('orderSellosSection');
    var troquel = document.getElementById('orderTroqueladoSection');
    if (flex && sellos && troquel) {
        var plateDieCol = document.getElementById('orderPlateDieCol');
        if (!plateDieCol) {
            plateDieCol = document.createElement('div');
            plateDieCol.id = 'orderPlateDieCol';
            plateDieCol.className = 'production-acabados-flex-item production-plate-die-col';
            flex.insertBefore(plateDieCol, sellos);
        }
        if (sellos.parentNode !== plateDieCol) plateDieCol.appendChild(sellos);
        if (troquel.parentNode !== plateDieCol) plateDieCol.appendChild(troquel);
        plateDieCol.hidden = sellos.hidden && troquel.hidden;
    }
}

function setToggleIcon(button, expanded) {
    renderIconButton(button, expanded ? (currentConfig.icons?.orderToggleOpen || DEFAULT_ICONS.toggleOpen) : (currentConfig.icons?.orderToggleClosed || DEFAULT_ICONS.toggleClosed));
}

function getOrderIcon(keys, canonicalKey, fallbackValue, fallbackColor, fallbackSize) {
    const icons = currentConfig.icons || {};
    for (const key of keys) {
        if (icons[key]) return iconConfigFor(key, icons[key], fallbackColor, fallbackSize);
    }
    return iconConfigFor(canonicalKey, fallbackValue, fallbackColor, fallbackSize);
}

function applyHeaderConfig(config) {
    currentConfig = config || {};
    const presentation = currentConfig.presentations?.ordenes || {};
    const general = currentConfig.general || {};
    const branding = currentConfig.branding || {};
    const icons = currentConfig.icons || {};
    document.getElementById('orderPageTitle').textContent = presentation.moduleTitle || 'Orden de Producción';
    document.documentElement.style.setProperty('--header-bg-start', presentation.headerBgStart || general.headerBgStart || '#0b81b8');
    document.documentElement.style.setProperty('--header-bg-end', presentation.headerBgEnd || general.headerBgEnd || '#17abdf');
    document.documentElement.style.setProperty('--tab-color', pickFirst(general.tabColorOrdersChild, general.tabColorOrdersRoot, general.tabColor, '#7f7f7f'));
    const logo = document.getElementById('orderCompanyLogo');
    const fallback = document.getElementById('orderBrandFallback');
    const logoUrl = presentation.brandLogoUrl || branding.logoUrl || '';
    if (logo) {
        logo.src = logoUrl;
        logo.style.display = logoUrl ? 'block' : 'none';
    }
    if (fallback) {
        fallback.textContent = branding.companyName || 'PrintLab';
        fallback.style.display = logoUrl ? 'none' : 'flex';
    }
    renderIconButton(sourceQuoteButton, icons.browserOpen || icons.quoteLookup || DEFAULT_ICONS.view);
    if (pantonesButton) renderIconButton(pantonesButton, iconConfigFor('orderPantones', DEFAULT_ICONS.pantones));
    pantonesButton?.setAttribute('title', 'Detalle de pantones');
    renderIconButton(menuButton, iconConfigFor('orderCreationSummary', '⚙️'));
    menuButton?.setAttribute('title', 'Menú');
    renderIconButton(menuNavFlujo, iconConfigFor('orderStatus', DEFAULT_ICONS.status));
    renderIconButton(menuNavEntregas, iconConfigFor('orderDeliveries', DEFAULT_ICONS.deliveries));
    renderIconButton(menuNavAdjuntos, iconConfigFor('orderAttachments', icons.lineAttachments || DEFAULT_ICONS.attachments));
    renderIconButton(menuNavSap, iconConfigFor('orderSap', '🏭'));
    renderIconButton(menuNavEstadoSap, iconConfigFor('orderEstadoSap', '📡'));
    renderIconButton(menuNavProcesos, iconConfigFor('orderProcesses', '⇌'));
    renderIconButton(menuNavEstado, iconConfigFor('orderDetencionEstado', '⏻'));
    renderIconButton(menuNavCreacion, iconConfigFor('orderCreationSummary', '⚙️'));
    if (svgTestButton) {
        const testIconSize = `${Number(currentConfig.general?.iconSizeOrderStatus) || 40}px`;
        svgTestButton.style.setProperty('--config-icon-size', testIconSize.trim());
        svgTestButton.style.fontSize = testIconSize.trim();
        svgTestButton.innerHTML = '<img src="/assets/download.svg" alt="" class="production-svg-test-image">';
    }
    renderIconButton(artworkDeleteButton, iconConfigFor('orderArtworkDelete', DEFAULT_ICONS.deleteArtwork, '#b94848'));
    setToggleIcon(samplesToggleButton, false);
    setToggleIcon(deliveryToggleButton, false);
    setToggleIcon(artToggleButton, false);
    const attachmentConf = getOrderIcon(['quoteRequestAttachment', 'lineAttachments'], 'quoteRequestAttachment', '📎', '#1e516d', 18);
    renderIcon(document.querySelector('[data-order-inline-icon="attachment"]'), attachmentConf.value, attachmentConf.color, attachmentConf.size);
    const recordConf = getOrderIcon(['quoteRequestRecord'], 'quoteRequestRecord', '●', '#1e516d', 18);
    renderIcon(document.querySelector('[data-order-inline-icon="record"]'), recordConf.value, recordConf.color, recordConf.size);
}

function buildSummaryLines(entries = [], emptyLabel = 'Sin definir') {
    const lines = entries.filter((entry) => entry.value);
    if (!lines.length) return `<div class="production-summary-empty">${escapeHtml(emptyLabel)}</div>`;
    return lines.map((entry) => `
        <div class="production-summary-line">
            <span class="production-summary-line-label">${escapeHtml(entry.label)}</span>
            <span class="production-summary-line-value">${escapeHtml(entry.value)}</span>
        </div>
    `).join('');
}

function buildSummaryLinesOptional(entries = []) {
    const lines = entries.filter((entry) => entry.value);
    if (!lines.length) return '';
    return lines.map((entry) => `
        <div class="production-summary-line">
            <span class="production-summary-line-label">${escapeHtml(entry.label)}</span>
            <span class="production-summary-line-value">${escapeHtml(entry.value)}</span>
        </div>
    `).join('');
}

function applyScheduleState(node, dateValue) {
    if (!node) return;
    node.classList.remove('is-warning', 'is-alert');
    if (!dateValue) return;
    const target = dateForSchedule(dateValue);
    if (Number.isNaN(target.getTime())) return;
    const diffDays = (target.getTime() - Date.now()) / 86400000;
    if (diffDays <= 2) node.classList.add('is-alert');
    else if (diffDays <= 5) node.classList.add('is-warning');
}

function applyOrderState(node, state) {
    if (!node) return;
    const normalized = String(state || '').toLowerCase();
    node.classList.remove('is-pending', 'is-progress', 'is-alert', 'is-complete');
    if (/detenida|anulada/i.test(normalized)) node.classList.add('is-alert');
    else if (/pend/i.test(normalized)) node.classList.add('is-pending');
    else if (/proceso|planific/i.test(normalized)) node.classList.add('is-progress');
    else if (/devuelta|alerta|error/i.test(normalized)) node.classList.add('is-alert');
    else if (/complet|entreg/i.test(normalized)) node.classList.add('is-complete');
}
function getOutputTypeImage(outputType) {
    const search = String(outputType || '').trim().toLowerCase();
    if (!search) return null;
    return currentOutputTypes.find((item) => {
        const code = String(item.codigo || item.code || item.id || '').trim().toLowerCase();
        const name = String(item.nombre || item.descripcion || item.name || '').trim().toLowerCase();
        const itemId = String(item.id || '').trim().toLowerCase();
        return code === search || name === search || itemId === search;
    }) || null;
}

function renderOutputTypePreview(outputType) {
    const match = getOutputTypeImage(outputType);
    const imageUrl = pickFirst(match?.image_url, match?.imageUrl);
    if (imageUrl) {
        outputTypeImage.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Tipo de salida">`;
        return;
    }
    outputTypeImage.innerHTML = '';
}

function outputTypePreviewHtml(outputType) {
    const match = getOutputTypeImage(outputType);
    const imageUrl = pickFirst(match?.image_url, match?.imageUrl);
    return imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="Tipo de salida">`
        : '';
}

function frontBackMemberMap(raw = {}) {
    const map = {};
    (Array.isArray(raw.related_lines) ? raw.related_lines : []).forEach(function (item) {
        const lineCode = pickFirst(item.summary?.line_code, item.detail?.lineCode);
        if (lineCode) map[lineCode] = item;
    });
    return map;
}

function frontBackSide(frontBackObj = {}, output = {}, index = 0) {
    const lineCode = String(output.lineCode || '').trim();
    const roles = frontBackObj.elementRoles || {};
    const side = String(output.side || roles[lineCode] || '').trim().toLowerCase();
    if (side === 'dorso' || lineCode === String(frontBackObj.backLineCode || '').trim()) return 'dorso';
    if (side === 'frente' || lineCode === String(frontBackObj.frontLineCode || '').trim()) return 'frente';
    return index === 1 ? 'dorso' : 'frente';
}

function frontBackSideLabel(side) {
    return String(side || '').toLowerCase() === 'dorso' ? 'DORSO' : 'FRENTE';
}

function positiveValue(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? value : '';
}

function nonCodeName(value, lineCode) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.toLowerCase() === String(lineCode || '').trim().toLowerCase() ? '' : text;
}

function frontBackLineData(memberInfo = {}, output = {}, order = {}, fallbackDetail = {}) {
    const summary = memberInfo.summary || {};
    const detail = memberInfo.detail || {};
    const raw = detail.raw_data || {};
    const fallbackRaw = fallbackDetail.raw_data || {};
    const lineCode = pickFirst(output.lineCode, summary.line_code, detail.lineCode, raw['ID LINEA']);
    const quantity = Number(output.quantity || summary.quantity || detail.quantityProducts || raw['Cantidad Productos'] || order.ordered_quantity || 0);
    const labelsPerRoll = Number(detail.labelsPerRoll || raw['CANTIDAD ETIQUETAS X ROLLO'] || fallbackDetail.labelsPerRoll || fallbackRaw['CANTIDAD ETIQUETAS X ROLLO'] || 0);
    const rollCount = labelsPerRoll > 0 && quantity > 0 ? Math.ceil(quantity / labelsPerRoll) : '';
    const linearFeet = Number(detail.materialFeet || raw['GENERAL | SUSTRATO | CONSUMO PIES'] || fallbackDetail.materialFeet || fallbackRaw['GENERAL | SUSTRATO | CONSUMO PIES'] || 0);
    const wasteFeet = Number(detail.materialFeetWaste || fallbackDetail.materialFeetWaste || 0);
    const dieCode = pickFirst(detail.dieCode, raw['GENERAL | TROQUEL | ID'], output.dieCode, fallbackDetail.dieCode, fallbackRaw['GENERAL | TROQUEL | ID']);
    const finishes = buildFinishTags(raw, detail, dieCode);
    const widthInches = positiveValue(detail.widthInches) || positiveValue(raw['DIMENSIONES ETIQUETA | ANCHO']) || positiveValue(fallbackDetail.widthInches);
    const lengthInches = positiveValue(detail.lengthInches) || positiveValue(raw['DIMENSIONES ETIQUETA | LARGO']) || positiveValue(fallbackDetail.lengthInches);
    const productName = pickFirst(
        nonCodeName(summary.job_name, lineCode),
        nonCodeName(detail.jobName, lineCode),
        nonCodeName(raw['NOMBRE TRABAJO'], lineCode),
        nonCodeName(raw?.Estado_UI?.header?.jobName, lineCode),
        nonCodeName(output.itemName, lineCode),
        output.itemName,
        lineCode,
        'Producto'
    );
    return {
        summary,
        detail: {
            ...detail,
            widthInches,
            lengthInches,
            coreWidth: pickFirst(detail.coreWidth, raw['ANCHO CORE'], fallbackDetail.coreWidth, fallbackRaw['ANCHO CORE']),
            coreDiameter: pickFirst(detail.coreDiameter, raw['DIAMETRO CORE'], fallbackDetail.coreDiameter, fallbackRaw['DIAMETRO CORE'])
        },
        raw,
        quantity,
        labelsPerRoll,
        rollCount,
        linearFeet,
        wasteFeet,
        totalFeet: linearFeet + wasteFeet,
        dieCode,
        noPrint: isNoPrint(detail, raw),
        machineName: pickFirst(detail.quotedMachine, raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA'], summary.machine_name, output.machineName, fallbackDetail.quotedMachine, fallbackRaw['CONV | MAQUINA'], fallbackRaw['DIGITAL | MAQUINA']),
        materialName: pickFirst(detail.materialName, summary.material_name, raw['GENERAL | MATERIAL'], raw['Material | Tipo Según Proceso Productivo'], output.materialCode, fallbackDetail.materialName, fallbackRaw['GENERAL | MATERIAL'], fallbackRaw['Material | Tipo Según Proceso Productivo']),
        inkConfig: buildInkConfig(detail, raw),
        finishes,
        outputType: pickFirst(detail.outputType, raw['TIPO SALIDA'], fallbackDetail.outputType, fallbackRaw['TIPO SALIDA']),
        productCode: pickFirst(raw['ID PRODUCTO CLIENTE'], raw['CODIGO PRODUCTO CLIENTE'], summary.product_code, detail.productCode, output.itemCode),
        productName
    };
}

const MOTIVO_TINTA_TIPO_LABELS = { proceso: 'Proceso', directo: 'Directo', adicional: 'Adicional', barniz: 'Barniz' };
let currentMotivosDetalle = [];

function fmtInt(v) {
    var n = Number(v);
    return Number.isFinite(n) ? formatNumber(n, 0) : '0';
}

// Punto de color de la tinta (viene del inventario: tintas.productos.color = nombre;
// tintas.pantones_recetas.color_hex = hex). Los nombres CMYK/Blanco se mapean a hex.
var TINTA_COLOR_HEX = {
    'cian': '#00AEEF', 'cyan': '#00AEEF',
    'magenta': '#EC008C',
    'amarillo': '#FFD400', 'yellow': '#FFD400',
    'negro': '#1A1A1A', 'black': '#1A1A1A',
    'blanco': '#FFFFFF', 'white': '#FFFFFF'
};
function resolveTintaColor(raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) return '';
    if (/^#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(v)) return v.charAt(0) === '#' ? v : '#' + v;
    return TINTA_COLOR_HEX[v.toLowerCase()] || '';
}

function motivoTintasTableHtml(motivo) {
    var tintas = Array.isArray(motivo.tintas) ? motivo.tintas : [];
    if (!tintas.length) return '<div class="motivo-empty">Sin tintas configuradas para este arte.</div>';
    var totalText = motivo.consumoTotalKg != null ? formatNumber(motivo.consumoTotalKg, 2) + ' kg' : '—';
    return '<table class="motivo-table motivo-tintas-table">' +
        '<thead><tr><th class="ta-r">#</th><th>Tipo</th><th>Tinta</th><th class="ta-r">Cobertura</th><th class="ta-r">BCM Anilox</th><th class="ta-r">Factor Transf.</th><th class="ta-r">Densidad</th><th class="ta-r">Consumo</th></tr></thead>' +
        '<tbody>' + tintas.map(function (t) {
            var tipoLabel = MOTIVO_TINTA_TIPO_LABELS[t.tipo] || t.tipo || '';
            var hex = resolveTintaColor(t.color);
            var dot = hex
                ? '<span class="motivo-tinta-dot" style="--tinta-dot:' + escapeHtml(hex) + '"></span>'
                : '<span class="motivo-tinta-dot motivo-tinta-dot-none"></span>';
            return '<tr' + (t.activo === false ? ' class="motivo-tinta-inactiva"' : '') + '>' +
                '<td class="ta-r">' + (t.estacion + 1) + '</td>' +
                '<td>' + escapeHtml(tipoLabel) + '</td>' +
                '<td><span class="motivo-tinta-cell">' + dot + escapeHtml(t.etiqueta || '—') + '</span></td>' +
                '<td class="ta-r">' + (t.coberturaPct != null ? formatNumber(t.coberturaPct, 0) + ' %' : '—') + '</td>' +
                '<td class="ta-r">' + (t.bcmAnilox != null ? formatNumber(t.bcmAnilox, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.factorTransferencia != null ? formatNumber(t.factorTransferencia, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.densidad != null ? formatNumber(t.densidad, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.consumoKg != null ? formatNumber(t.consumoKg, 2) + ' kg' : '—') + '</td>' +
            '</tr>';
        }).join('') + '</tbody>' +
        '<tfoot><tr class="motivo-tintas-total"><td colspan="7">Consumo Total</td><td class="ta-r">' + totalText + '</td></tr></tfoot>' +
        '</table>';
}

function motivoVersionesTableHtml(motivo) {
    var versiones = Array.isArray(motivo.versiones) ? motivo.versiones : [];
    if (!versiones.length) return '<div class="motivo-empty">Sin versiones declaradas.</div>';
    return '<table class="motivo-table motivo-versiones-table">' +
        '<thead><tr><th class="ta-r">#</th><th>Nombre</th><th>Descripción</th><th class="ta-r">Cantidad</th><th class="ta-r">Sellos</th></tr></thead>' +
        '<tbody>' + versiones.map(function (v) {
            return '<tr><td class="ta-r">' + (v.indice + 1) + '</td><td>' + escapeHtml(v.nombre || '—') + '</td><td>' + escapeHtml(v.descripcion || '—') + '</td><td class="ta-r">' + fmtInt(v.cantidad) + '</td><td class="ta-r">' + fmtInt(v.sellos) + '</td></tr>';
        }).join('') + '</tbody></table>';
}

function toggleMotivoDetailRow(kind, indice) {
    const row = document.getElementById('motivo' + kind + 'Row-' + indice);
    const btn = document.getElementById('motivo' + kind + 'Btn-' + indice);
    if (!row) return;
    const willShow = row.hidden;
    row.hidden = !willShow;
    if (willShow) {
        const motivo = currentMotivosDetalle.find(function (m) { return m.indice === indice; });
        const cell = row.querySelector('td');
        if (cell) cell.innerHTML = motivo ? (kind === 'Tintas' ? motivoTintasTableHtml(motivo) : motivoVersionesTableHtml(motivo)) : '';
    }
    if (btn) btn.setAttribute('aria-expanded', String(willShow));
}

function toggleMotivoTintas(indice) { toggleMotivoDetailRow('Tintas', indice); }
function toggleMotivoVersiones(indice) { toggleMotivoDetailRow('Versiones', indice); }

function renderMotivosLayout(order) {
    const layout = document.getElementById('orderMotivosLayout');
    const wrap = document.getElementById('orderMotivosTableWrap');
    if (!layout || !wrap) return;
    const motivos = Array.isArray(order?.motivos_detalle) ? order.motivos_detalle : [];
    currentMotivosDetalle = motivos;
    // El módulo "Impresión" (antes "Motivos") queda SIEMPRE visible: aloja la Máquina de
    // Impresión, que debe verse haya o no motivos detallados.
    layout.hidden = false;
    if (!motivos.length) {
        wrap.innerHTML = '';
        return;
    }
    // Cada motivo = una tarjeta: encabezado (pastilla "Motivo N" + "Detalle del Motivo" +
    // franja de stats Cantidad/Proceso/Directo/Adicionales/Sellos) y cuerpo de dos paneles
    // con borde (Versiones · Tintas del Motivo). Al pie, una franja resumen de todos los motivos.
    var stat = function (label, value) {
        return '<div class="motivo-stat"><span class="motivo-stat-label">' + escapeHtml(label) +
            '</span><span class="motivo-stat-value">' + value + '</span></div>';
    };
    var cards = motivos.map(function (motivo) {
        var mLabel = 'Arte ' + (motivo.indice + 1);
        // Junto a la pastilla "Arte N" va el nombre/descripción real del arte. Si el arte
        // no tiene nombre propio (quedó como "Arte N" genérico), no se muestra nada.
        var mCaption = (motivo.nombre && motivo.nombre !== mLabel) ? escapeHtml(motivo.nombre) : '';
        return '<div class="motivo-block">' +
            '<div class="motivo-block-head">' +
                '<div class="motivo-block-head-left">' +
                    '<span class="motivo-tab">' + escapeHtml(mLabel) + '</span>' +
                    '<span class="motivo-head-caption">' + mCaption + '</span>' +
                    ((motivos.length >= 2 && motivo.producto && motivo.producto.codigo)
                        ? '<span class="motivo-head-sku"><span class="production-summary-label">SKU</span>' +
                            buildOrderDataLink('/producto-documento?codigo=' + encodeURIComponent(motivo.producto.codigo), motivo.producto.sku || motivo.producto.codigo, 'SKU ' + (motivo.producto.sku || motivo.producto.codigo), true) +
                          '</span>'
                        : '') +
                '</div>' +
                '<div class="motivo-stats">' +
                    stat('Cantidad', fmtInt(motivo.cantidad)) +
                    stat('Proceso', fmtInt(motivo.proceso)) +
                    stat('Directo', fmtInt(motivo.directo)) +
                    stat('Adicionales', fmtInt(motivo.adicional)) +
                    stat('Sellos', fmtInt(motivo.sellos)) +
                '</div>' +
            '</div>' +
            '<div class="motivo-block-body">' +
                '<div class="motivo-panel">' +
                    '<div class="motivo-panel-title">Versiones</div>' +
                    motivoVersionesTableHtml(motivo) +
                '</div>' +
                '<div class="motivo-panel">' +
                    '<div class="motivo-panel-title">Tintas del Arte</div>' +
                    motivoTintasTableHtml(motivo) +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    // La franja resumen solo tiene sentido con 2+ motivos; con uno solo duplica su encabezado.
    var summary = '';
    if (motivos.length >= 2) {
        var totVersiones = motivos.reduce(function (s, m) { return s + (Array.isArray(m.versiones) ? m.versiones.length : 0); }, 0);
        var totCantidad = motivos.reduce(function (s, m) { return s + (Number(m.cantidad) || 0); }, 0);
        var totSellos = motivos.reduce(function (s, m) { return s + (Number(m.sellos) || 0); }, 0);
        var totConsumo = motivos.reduce(function (s, m) { return s + (Number(m.consumoTotalKg) || 0); }, 0);
        summary =
            '<div class="motivo-summary">' +
                stat('Artes', fmtInt(motivos.length)) +
                stat('Versiones', fmtInt(totVersiones)) +
                stat('Cantidad Total', fmtInt(totCantidad)) +
                stat('Sellos Totales', fmtInt(totSellos)) +
                '<div class="motivo-stat motivo-stat-emphasis"><span class="motivo-stat-label">Consumo Total de Tintas</span>' +
                    '<span class="motivo-stat-value">' + formatNumber(totConsumo, 2) + ' kg</span></div>' +
            '</div>';
    }

    wrap.innerHTML = cards + summary;
}

function renderFrontBackProductCard({ frontBackObj, output, memberInfo, index, sourceQuoteCode, order, fallbackDetail }) {
    const side = frontBackSide(frontBackObj, output, index);
    const lineCode = pickFirst(output.lineCode, memberInfo.summary?.line_code, memberInfo.detail?.lineCode);
    const data = frontBackLineData(memberInfo, output, order, fallbackDetail);
    const dimensions = pickFirst(data.detail.widthInches, data.detail.lengthInches) ? buildDimensionsText(data.detail) : '';
    const lineRoute = buildCalcRoute({
        quoteCode: sourceQuoteCode,
        lineCode,
        productCode: data.productCode,
        department: pickFirst(data.summary.department, data.detail.department, data.raw.DEPARTAMENTO)
    });
    const lineCodeHtml = lineCode
        ? `(${buildOrderDataLink(lineRoute, lineCode, `Cálculo ${lineCode}`)}) - `
        : '';
    const artHolder = pickFirst(data.raw['ARTE EN PODER DE'], '');
    const artComments = pickFirst(data.raw['COMENTARIOS VENDEDOR'], data.raw['OBSERVACIONES VENTAS'], '');

    return `
        <section class="socios-section production-product-section production-frontback-product" data-side="${escapeHtml(side)}">
            <div class="production-frontback-product-head">
                <div class="production-frontback-product-top">
                    <div class="production-frontback-product-meta">
                        <span class="production-frontback-side-chip production-frontback-side-chip--label">${escapeHtml(frontBackSideLabel(side))}</span>
                        <strong class="production-frontback-product-id">${escapeHtml(lineCode)}</strong>
                    </div>
                    <div class="production-frontback-quantity">
                        <span>Cantidad</span>
                        <strong>${escapeHtml(parseNumber(data.quantity) || 'Sin cantidad')}</strong>
                    </div>
                </div>
                <div class="production-frontback-product-name">${escapeHtml(data.productName)}${dimensions ? ` - ${escapeHtml(dimensions)}` : ''}</div>
            </div>
            <div class="production-summary-stack">
                <div class="production-frontback-art-section">
                    <div class="production-frontback-art-row">
                        <div class="production-frontback-art-preview-col">
                            <div class="production-art-preview production-art-preview-compact production-art-dropzone production-frontback-art-dropzone" data-frontback-art-target data-quote="${escapeHtml(sourceQuoteCode)}" data-line="${escapeHtml(lineCode)}" aria-label="Adjuntar arte ${escapeHtml(frontBackSideLabel(side))}">
                                <div class="attachments-empty">Arrastrar arte aquí</div>
                            </div>
                        </div>
                        <div class="production-frontback-art-meta-col">
                            <div class="production-frontback-art-display">
                                <div class="production-frontback-art-field"><span class="production-frontback-art-label">Arte en poder de</span><span class="production-frontback-art-value">${escapeHtml(artHolder || 'Sin asignar')}</span></div>
                                ${artComments ? '<div class="production-frontback-art-field"><span class="production-frontback-art-label">Comentarios</span><span class="production-frontback-art-value">' + escapeHtml(artComments) + '</span></div>' : ''}
                            </div>
                            <div class="production-frontback-art-edit-form" hidden>
                                <div class="production-frontback-art-field"><label class="production-frontback-art-label">Arte en poder de</label><input type="text" list="orderArtworkHolderOptions" value="${escapeHtml(artHolder)}" placeholder="Seleccionar o escribir"></div>
                                <div class="production-frontback-art-field"><label class="production-frontback-art-label">Comentarios</label><textarea rows="2" placeholder="Comentarios de arte">${escapeHtml(artComments)}</textarea></div>
                                <div class="production-frontback-art-edit-actions"><button type="button" class="production-frontback-art-cancel-btn">Cancelar</button></div>
                            </div>
                        </div>
                        <button type="button" class="production-frontback-art-edit-btn production-inline-icon production-inline-icon-ghost" title="Editar arte" aria-label="Editar arte"></button>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderFrontBackLayout({ raw, frontBackObj, sourceQuoteCode, order }) {
    const layout = document.getElementById('orderFrontBackLayout');
    if (!layout) return;
    const memberData = frontBackMemberMap(raw);
    const fallbackDetail = raw.line_snapshot || {};
    const outputs = Array.isArray(frontBackObj.outputs) ? frontBackObj.outputs : [];
    const sortedOutputs = outputs.slice().sort(function (left, right) {
        const leftSide = frontBackSide(frontBackObj, left, outputs.indexOf(left));
        const rightSide = frontBackSide(frontBackObj, right, outputs.indexOf(right));
        if (leftSide === rightSide) return 0;
        return leftSide === 'frente' ? -1 : 1;
    });
    layout.innerHTML = sortedOutputs.map(function (output, index) {
        const lineCode = output.lineCode || '';
        return renderFrontBackProductCard({
            frontBackObj,
            output,
            memberInfo: memberData[lineCode] || { summary: {}, detail: { raw_data: {} } },
            index,
            sourceQuoteCode,
            order,
            fallbackDetail
        });
    }).join('');
}

function frontBackTotalQuantity(frontBackObj = {}, raw = {}) {
    const outputs = Array.isArray(frontBackObj.outputs) ? frontBackObj.outputs : [];
    const outputTotal = outputs.reduce((sum, item) => {
        const qty = Number(item?.quantity || 0);
        return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
    if (outputTotal > 0) return outputTotal;
    const stored = Number(raw.totals?.front_back_total_quantity || raw.production_run?.totals?.outputQuantity || 0);
    return Number.isFinite(stored) ? stored : 0;
}

function renderArtwork(attachments) {
    const artwork = attachments.find((item) => isArtworkAttachment(item));
    currentArtworkAttachment = artwork || null;
    pintarArteEnMaquina();
    if (artworkDeleteButton) artworkDeleteButton.hidden = !artwork;
    if (!artwork) {
        if (artworkPreview) {
            artworkPreview.classList.add('production-art-preview-compact');
            artworkPreview.innerHTML = '<div class="attachments-empty">Arrastra el Arte</div>';
        }
        updateArtworkSectionConstraint();
        return;
    }
    const value = String(artwork.value || '').trim();
    if (artworkPreview) artworkPreview.classList.remove('production-art-preview-compact');
    if (/^data:image\//i.test(value)) {
        if (artworkPreview) artworkPreview.innerHTML = `<img src="${escapeHtml(value)}" alt="Arte del producto" class="production-art-image">`;
        updateArtworkSectionConstraint();
        return;
    }
    if (artwork.id && /^image\//i.test(String(artwork.mime_type || ''))) {
        if (artworkPreview) artworkPreview.innerHTML = `<img src="/api/adjuntos/${encodeURIComponent(artwork.id)}/download" alt="Arte del producto" class="production-art-image">`;
        updateArtworkSectionConstraint();
        return;
    }
    if (artworkPreview) artworkPreview.innerHTML = `<div class="production-art-copy"><strong>${escapeHtml(artwork.label || 'Referencia')}</strong><span>${escapeHtml(value)}</span></div>`;
    updateArtworkSectionConstraint();
}

// Vista previa del arte junto a la Máquina de Impresión: la imagen completa, con su propia
// proporción, ajustada al espacio disponible.
function pintarArteEnMaquina() {
    var caja = document.getElementById('orderMaquinaArte');
    if (!caja) return;
    var arte = currentArtworkAttachment;
    var valor = arte ? String(arte.value || '').trim() : '';
    var src = '';
    if (arte && /^data:image\//i.test(valor)) src = valor;
    else if (arte && arte.id && /^image\//i.test(String(arte.mime_type || ''))) src = '/api/adjuntos/' + encodeURIComponent(arte.id) + '/download';
    if (!src) { caja.innerHTML = ''; return; }
    caja.innerHTML = '<div class="section-caption maquina-arte-titulo">Arte</div><img src="' + escapeHtml(src) + '" alt="Arte del producto">';
}

async function deleteArtwork() {
    const artwork = currentArtworkAttachment;
    if (!artwork) return;
    if (!artwork.id) {
        currentOrderAttachments = currentOrderAttachments.filter((item) => item !== artwork);
        renderArtwork(currentOrderAttachments);
        return;
    }
    const response = await fetch(`/api/adjuntos/${encodeURIComponent(artwork.id)}`, {
        method: 'DELETE',
        headers: sessionHeader()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el arte.');
    await refreshOrderAttachments();
    renderArtwork(currentOrderAttachments);
}

async function deleteAttachment(index) {
    const item = currentOrderAttachments[index];
    if (!item) return;
    if (!item.id) {
        currentOrderAttachments = currentOrderAttachments.filter((_, i) => i !== index);
        renderAttachmentsPopover(currentOrderAttachments);
        renderArtwork(currentOrderAttachments);
        return;
    }
    const response = await fetch(`/api/adjuntos/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: sessionHeader()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el adjunto.');
    await refreshOrderAttachments();
    renderAttachmentsPopover(currentOrderAttachments);
    renderArtwork(currentOrderAttachments);
}

async function toggleOrderAudioRecording() {
    const audioRecordButton = document.getElementById('orderAudioRecordButton');
    const audioRecordIndicator = document.getElementById('orderAudioRecordIndicator');
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
            const { quoteCode, lineCode } = getSourceQuoteContext();
            if (quoteCode && lineCode) {
                try {
                    statusBox.hidden = false;
                    statusBox.textContent = 'Guardando audio...';
                    const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileName,
                            contentBase64: String(dataUrl).split(',').pop() || '',
                            mimeType: blob.type || 'audio/webm',
                            fileExt: 'webm',
                            notes: 'audio_orden',
                            uploadedBy: 'admin'
                        })
                    });
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el audio.');
                    await refreshOrderAttachments();
                    renderAttachmentsPopover(currentOrderAttachments);
                    renderArtwork(currentOrderAttachments);
                } catch (error) {
                    console.error('Error guardando audio:', error);
                }
            }
            stream.getTracks().forEach((track) => track.stop());
            isRecording = false;
            if (audioRecordButton) audioRecordButton.dataset.recording = 'false';
            if (audioRecordIndicator) audioRecordIndicator.hidden = true;
            statusBox.hidden = true;
        };
        mediaRecorder.start();
        isRecording = true;
        if (audioRecordButton) audioRecordButton.dataset.recording = 'true';
        if (audioRecordIndicator) audioRecordIndicator.hidden = false;
    } catch (error) {
        console.error('Error accediendo al microfono:', error);
        statusBox.hidden = false;
        statusBox.textContent = 'No se pudo acceder al micrófono.';
    }
}

async function handleOrderAttachmentUpload(event) {
    const files = event.target?.files;
    if (!files || !files.length) return;
    const { quoteCode, lineCode } = getSourceQuoteContext();
    if (!quoteCode || !lineCode) {
        statusBox.hidden = false;
        statusBox.textContent = 'La orden no tiene cotización/línea origen.';
        return;
    }
    statusBox.hidden = false;
    for (const file of Array.from(files)) {
        statusBox.textContent = `Cargando ${file.name}...`;
        try {
            const contentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
                reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
                reader.readAsDataURL(file);
            });
            const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentBase64,
                    mimeType: file.type || 'application/octet-stream',
                    fileExt: (file.name.split('.').pop() || '').toLowerCase(),
                    notes: 'adjunto_orden',
                    uploadedBy: 'admin'
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No se pudo subir el adjunto.');
        } catch (error) {
            console.error('Error subiendo adjunto:', error);
        }
    }
    await refreshOrderAttachments();
    renderAttachmentsPopover(currentOrderAttachments);
    renderArtwork(currentOrderAttachments);
    event.target.value = '';
    statusBox.hidden = true;
}

function readDeliveryRows(raw = {}, defaultQuantity = '', defaultDate = '') {
    let savedRows = raw['ENTREGA | PROGRAMACION'];
    if (typeof savedRows === 'string') {
        try {
            savedRows = JSON.parse(savedRows);
        } catch (_) {
            savedRows = [];
        }
    }
    if (Array.isArray(savedRows) && savedRows.length) {
        return savedRows
            .map((row) => ({
                quantity: pickFirst(row?.quantity, row?.cantidad),
                date: normalizeDateInputValue(pickFirst(row?.date, row?.fecha))
            }))
            .filter((row) => row.quantity || row.date);
    }

    const quantities = [raw['CANTIDAD PRODUCTOS 1'], raw['CANTIDAD PRODUCTOS 2'], raw['CANTIDAD PRODUCTOS 3']]
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
    if (quantities.length) {
        return quantities.map((value, index) => ({
            quantity: value,
            date: index === 0 ? normalizeDateInputValue(defaultDate) : ''
        }));
    }
    return defaultQuantity ? [{ quantity: defaultQuantity, date: normalizeDateInputValue(defaultDate) }] : [];
}

function renderDeliveries(raw = {}, totalQuantity = '', defaultDate = '', defaultQuantity = '') {
    if (deliveriesQuantityText) deliveriesQuantityText.textContent = totalQuantity || 'Pendiente';
    if (!deliveriesBody) return;
    if (deliveriesMessage) deliveriesMessage.hidden = true;

    const rows = readDeliveryRows(raw, defaultQuantity, defaultDate);
    const editableRows = [...rows, { quantity: '', date: '' }];
    deliveriesBody.innerHTML = editableRows.map((row, index) => `
        <tr data-delivery-row="${index}">
            <td><input type="number" min="0" step="1" inputmode="numeric" data-delivery-field="quantity" value="${escapeHtml(row.quantity)}" placeholder="Cantidad"></td>
            <td><input type="date" data-delivery-field="date" value="${escapeHtml(row.date)}"></td>
        </tr>
    `).join('');
}

function buildFinishTags(raw = {}, detail = {}, dieCode = '') {
    const tags = [];
    const dc = raw['Datos_Cotizados'] || {};
    const FINISH_SKIP_KEYS = new Set(['troquelado']);
    const inlineFinishes = [];
    (Array.isArray(dc?.print?.items) ? dc.print.items : []).forEach(function (printItem) {
        (Array.isArray(printItem?.inlineItems) ? printItem.inlineItems : []).forEach(function (inline) {
            if (inline?.active && (inline.processKey || inline.key || inline.label)) {
                var pk = String(inline.processKey || inline.key || '').toLowerCase();
                if (!FINISH_SKIP_KEYS.has(pk)) {
                    inlineFinishes.push(inline);
                }
            }
        });
    });
    const externalFinishes = (Array.isArray(dc?.finishes?.items) ? dc.finishes.items : []).filter(function (ext) {
        var pk = String(ext.processKey || ext.key || '').toLowerCase();
        return !FINISH_SKIP_KEYS.has(pk);
    });
    const findFinish = function (keys) {
        const v = pickFirst.apply(null, keys.map(function (k) { return raw[k]; }));
        if (v) return v;
        function finishValue(item) {
            if (!item) return '';
            var pk = String(item.processKey || item.key || '').toLowerCase();
            var label = String(item.label || '').trim();
            var mat = String(item.materialName || '').trim();
            var desc = String(item.description || '').trim();
            if (mat && label && mat.toLowerCase() !== label.toLowerCase()) return label + ' ' + mat;
            if (mat) return mat;
            if (desc && label && desc.toLowerCase() !== label.toLowerCase()) return label + ' ' + desc;
            if (desc) return desc;
            if (label) return label;
            return item.processKey || item.key || '';
        }
        for (const inline of inlineFinishes) {
            const k = inline.processKey || inline.key || inline.label || '';
            if (keys.some(function (key) { return k.toLowerCase().includes(key.replace('ACABADOS | ', '').toLowerCase()); })) {
                return finishValue(inline);
            }
        }
        for (const ext of externalFinishes) {
            const ek = ext.processKey || ext.key || ext.label || ext.description || '';
            if (keys.some(function (key) { return ek.toLowerCase().includes(key.replace('ACABADOS | ', '').toLowerCase()); })) {
                return finishValue(ext);
            }
        }
        return '';
    };
    const laminate = findFinish(['ACABADOS | LAMINADO', 'LAMINADO']);
    const varnish = findFinish(['ACABADOS | BARNIZ', 'BARNIZ', 'BARNIZ UV']);
    const foil = findFinish(['ACABADOS | FOIL', 'FOIL', 'ESTAMPADO']);
    const emboss = findFinish(['ACABADOS | EMBOSADO', 'EMBOSADO']);
    const numbering = findFinish(['ACABADOS | NUMERADO', 'NUMERADO']);
    const rewinding = findFinish(['ACABADOS | REBOBINADO', 'REBOBINADO']);
    function finishTag(prefix, val) {
        var s = String(val).trim();
        if (!s) return '';
        if (s.toLowerCase().startsWith(prefix.toLowerCase())) return s;
        return prefix + ' ' + s;
    }
    // Orden del proceso productivo: Barniz -> Estampado -> Laminado -> Troquelado -> Rebobinado -> Numerado.
    if (varnish)   tags.push(finishTag('Barniz', varnish));
    if (foil)      tags.push(finishTag('Estampado', foil));
    if (laminate)  tags.push(finishTag('Laminado', laminate));
    if (dieCode) tags.push('Troquelado (' + dieCode + ')');
    else if (raw['ACABADOS | TROQUELADO'] || raw['TROQUELADO']) tags.push('Troquelado');
    else if (!tags.length && isNoPrint(detail, raw)) tags.push('Troquelado');
    if (emboss)    tags.push(finishTag('Embosado', emboss));
    if (rewinding) {
        var coreWidth = pickFirst(detail.coreWidth, raw['ANCHO CORE']);
        var coreDiameter = pickFirst(detail.coreDiameter, raw['DIAMETRO CORE']);
        var labelsPerRoll = pickFirst(detail.labelsPerRoll, raw['CANTIDAD ETIQUETAS X ROLLO']);
        var coreParts = [];
        if (labelsPerRoll) coreParts.push(labelsPerRoll + ' prod/rollo');
        if (coreWidth) coreParts.push('ancho core ' + coreWidth + '"');
        if (coreDiameter) coreParts.push('diám. core ' + coreDiameter + '"');
        tags.push('Rebobinado' + (coreParts.length ? ' (' + coreParts.join(', ') + ')' : ''));
    }
    if (numbering) tags.push('Numerado');
    return [...new Set(tags)];
}

function populateEditableForms(order = {}) {
    const raw = order.raw_data || order || {};
    const lineRaw = raw.line_snapshot?.raw_data || {};
    // Muestras / Visto Bueno / Entrega: columnas tipadas primero, raw_data como
    // respaldo para órdenes anteriores a la migración.
    if (samplesModeInput) samplesModeInput.value = pickFirst(order.muestras_tipo, lineRaw['MUESTRAS | TIPO']);
    if (samplesApprovalInput) samplesApprovalInput.value = pickFirst(order.vb_destinatario, lineRaw['MUESTRAS | VISTO BUENO'], lineRaw['MUESTRAS | DESTINATARIO VISTO BUENO']);
    if (samplesContactInput) samplesContactInput.value = pickFirst(order.vb_contacto, lineRaw['MUESTRAS | CONTACTO']);
    if (samplesPhoneInput) samplesPhoneInput.value = pickFirst(order.vb_telefono, lineRaw['MUESTRAS | TELEFONO']);
    if (samplesEmailInput) samplesEmailInput.value = pickFirst(order.vb_correo, lineRaw['MUESTRAS | EMAIL']);
    if (samplesDetailInput) samplesDetailInput.value = pickFirst(order.muestras_detalle, lineRaw['MUESTRAS | DETALLE']);
    setOrderAddressBlock('vb', {
        nombre: order.vb_direccion_nombre, tipo: order.vb_direccion_tipo, pais: order.vb_direccion_pais,
        departamento: order.vb_direccion_departamento, subnivel: order.vb_direccion_subnivel, zona: order.vb_direccion_zona,
        codigoPostal: order.vb_direccion_codigo_postal,
        line: pickFirst(order.vb_direccion, lineRaw['MUESTRAS | DIRECCION'])
    });
    if (deliveryModeInput) deliveryModeInput.value = pickFirst(order.entrega_tipo, lineRaw['ENTREGA | TIPO']);
    if (deliveryContactInput) deliveryContactInput.value = pickFirst(order.entrega_contacto, lineRaw['ENTREGA | CONTACTO']);
    if (deliveryPhoneInput) deliveryPhoneInput.value = pickFirst(order.entrega_telefono, lineRaw['ENTREGA | TELEFONO']);
    if (deliveryEmailInput) deliveryEmailInput.value = pickFirst(order.entrega_correo, lineRaw['ENTREGA | EMAIL']);
    if (deliveryDetailInput) deliveryDetailInput.value = pickFirst(order.entrega_detalle, lineRaw['ENTREGA | DETALLE'], lineRaw['ENTREGA | COMENTARIOS']);
    setOrderAddressBlock('entrega', {
        nombre: order.entrega_direccion_nombre, tipo: order.entrega_direccion_tipo, pais: order.entrega_direccion_pais,
        departamento: order.entrega_direccion_departamento, subnivel: order.entrega_direccion_subnivel, zona: order.entrega_direccion_zona,
        codigoPostal: order.entrega_direccion_codigo_postal,
        line: pickFirst(order.entrega_direccion, lineRaw['ENTREGA | DIRECCION'])
    });
    if (sellerCommentsInput) sellerCommentsInput.value = pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']);
    if (artworkHolderInput) {
        const holderVal = pickFirst(lineRaw['ARTE EN PODER DE']) || '';
        // Si la orden vieja guardó un valor escrito a mano que no está en la lista,
        // se conserva como opción extra en vez de perderse.
        if (holderVal && artworkHolderInput.tagName === 'SELECT' && !Array.from(artworkHolderInput.options).some(o => o.value === holderVal)) {
            const extra = document.createElement('option');
            extra.value = holderVal;
            extra.textContent = holderVal;
            artworkHolderInput.appendChild(extra);
        }
        artworkHolderInput.value = holderVal;
    }
    if (finishNotesInput) finishNotesInput.value = pickFirst(lineRaw['ACABADOS | OBSERVACIONES']);
}

function toggleSection(summaryNode, formNode, button, editing) {
    if (!summaryNode || !formNode || !button) return;
    summaryNode.hidden = Boolean(editing);
    formNode.hidden = !editing;
    setToggleIcon(button, editing);
    requestAnimationFrame(updateArtworkSectionConstraint);
}

async function saveOrderDetails(payload) {
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(currentOrderCode)}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...sessionHeader() },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo guardar la orden.');
    currentLoadedOrder = data.orden;
    renderOrder(currentLoadedOrder);
    populateEditableForms(currentLoadedOrder);
}

var CONTACT_ICON_PHONE = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/></svg>';
var CONTACT_ICON_EMAIL = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg>';
var CONTACT_ICON_LOCATION = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>';

function contactValueWithIcon(icon, value) {
    return `<span class="production-contact-icon-value">${icon}<span>${escapeHtml(value)}</span></span>`;
}

// Fila de resumen (Muestras/Visto Bueno y Entrega) con etiqueta de campo,
// para que se distinga qué es cada valor (p. ej. Destinatario vs Contacto).
function summaryRow(label, valueHtml) {
    return `<div class="production-summary-item"><span class="production-summary-label">${escapeHtml(label)}</span><span class="production-summary-value">${valueHtml}</span></div>`;
}

function buildDeliverySummary(lineRaw, quote) {
    const ord = currentLoadedOrder || {};
    const tipo = pickFirst(ord.entrega_tipo, lineRaw['ENTREGA | TIPO'], quote.delivery_time);
    const contacto = pickFirst(ord.entrega_contacto, lineRaw['ENTREGA | CONTACTO'], quote.contact_name);
    const telefono = pickFirst(ord.entrega_telefono, lineRaw['ENTREGA | TELEFONO']);
    const email = pickFirst(ord.entrega_correo, lineRaw['ENTREGA | EMAIL']);
    const direccion = pickFirst(
        [ord.entrega_direccion, ord.entrega_direccion_zona, ord.entrega_direccion_departamento, ord.entrega_direccion_pais].filter(Boolean).join(', '),
        lineRaw['ENTREGA | DIRECCION']
    );
    const detalle = pickFirst(ord.entrega_detalle, lineRaw['ENTREGA | DETALLE']);
    const comentarios = pickFirst(lineRaw['ENTREGA | COMENTARIOS']);

    if (!tipo && !contacto && !detalle) return '';

    // Todo el resumen de entrega repartido en DOS columnas para aprovechar el ancho del
    // contenedor y bajar la altura del módulo.
    const lines = [];
    if (tipo) lines.push(summaryRow('Tipo de Entrega', escapeHtml(tipo)));
    if (contacto) lines.push(summaryRow('Contacto', escapeHtml(contacto)));
    if (telefono) lines.push(summaryRow('Teléfono', contactValueWithIcon(CONTACT_ICON_PHONE, telefono)));
    if (email) lines.push(summaryRow('Correo', contactValueWithIcon(CONTACT_ICON_EMAIL, email)));
    if (direccion) lines.push(summaryRow('Dirección', contactValueWithIcon(CONTACT_ICON_LOCATION, direccion)));
    if (detalle) lines.push(summaryRow('Detalle de Entrega', escapeHtml(detalle)));
    if (comentarios) lines.push(summaryRow('Comentarios', escapeHtml(comentarios)));

    if (!lines.length) lines.push('<div class="production-summary-item"><span class="production-summary-value production-contact-missing-label">&#9888; Sin información de entrega</span></div>');

    const mid = Math.ceil(lines.length / 2);
    return `
        <div class="production-summary-two-col">
            <div class="production-summary-subsection">${lines.slice(0, mid).join('')}</div>
            <div class="production-summary-subsection">${lines.slice(mid).join('')}</div>
        </div>
    `;
}

function buildSamplesSummary(lineRaw) {
    const ord = currentLoadedOrder || {};
    const envioTipo = pickFirst(ord.muestras_tipo, lineRaw['MUESTRAS | TIPO']);
    const envioContacto = pickFirst(ord.vb_contacto, lineRaw['MUESTRAS | CONTACTO']);
    const envioTelefono = pickFirst(ord.vb_telefono, lineRaw['MUESTRAS | TELEFONO']);
    const envioEmail = pickFirst(ord.vb_correo, lineRaw['MUESTRAS | EMAIL']);
    const envioDireccion = pickFirst(
        [ord.vb_direccion, ord.vb_direccion_zona, ord.vb_direccion_departamento, ord.vb_direccion_pais].filter(Boolean).join(', '),
        lineRaw['MUESTRAS | DIRECCION']
    );
    const destinoTipo = pickFirst(ord.vb_destinatario, lineRaw['MUESTRAS | VISTO BUENO']);
    const detalle = pickFirst(ord.muestras_detalle, lineRaw['MUESTRAS | DETALLE']);

    if (!envioTipo && !destinoTipo && !detalle && !envioContacto && !envioTelefono && !envioEmail && !envioDireccion) return '';

    const leftLines = [];
    if (envioTipo) leftLines.push(summaryRow('Tipo de Envío', escapeHtml(envioTipo)));
    if (detalle) leftLines.push(summaryRow('Detalle', escapeHtml(detalle)));

    // Destinatario del Visto Bueno: sin etiquetas, al estilo del bloque de Cliente
    // (nombre en negrita, teléfono y correo con su ícono). Se usa el contacto real como
    // nombre; vb_destinatario a veces guarda un método ("Email", "Físico"), no una persona.
    const METODOS = ['email', 'correo', 'fisico', 'físico', 'digital', 'courier', 'mensajeria', 'mensajería'];
    const destinoEsMetodo = destinoTipo && METODOS.indexOf(String(destinoTipo).trim().toLowerCase()) !== -1;
    const destName = envioContacto || (!destinoEsMetodo ? destinoTipo : '');
    const rightLines = [];
    if (destName) rightLines.push('<div class="production-client-info-line production-client-contact-name"><strong>' + escapeHtml(destName) + '</strong></div>');
    if (!destinoEsMetodo && destinoTipo && envioContacto && destinoTipo !== envioContacto) rightLines.push('<div class="production-client-info-line"><span>' + escapeHtml(destinoTipo) + '</span></div>');
    if (envioTelefono) rightLines.push('<div class="production-client-info-line">' + CONTACT_ICON_PHONE + '<span>' + escapeHtml(envioTelefono) + '</span></div>');
    if (envioEmail) rightLines.push('<div class="production-client-info-line">' + CONTACT_ICON_EMAIL + '<span>' + escapeHtml(envioEmail) + '</span></div>');
    if (envioDireccion) rightLines.push('<div class="production-client-info-line">' + CONTACT_ICON_LOCATION + '<span>' + escapeHtml(envioDireccion) + '</span></div>');

    return `
        <div class="production-summary-two-col">
            <div class="production-summary-subsection">
                ${leftLines.join('')}
            </div>
            <div class="production-summary-subsection production-customer-contact-info">
                ${rightLines.join('')}
            </div>
        </div>
    `;
}

let customerContactSaveTimer = null;

function renderCustomerContact(col, data) {
    var customerContact = data.customerContact || '';
    var customerPhone   = data.customerPhone   || '';
    var customerEmail   = data.customerEmail   || '';
    var hasData = !!(customerContact || customerPhone || customerEmail);
    var ICON_PHONE = '<svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/></svg>';
    var ICON_EMAIL = '<svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg>';
    var ICON_EDIT  = '<svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>';

    var displayLines = [];
    if (customerContact) displayLines.push('<div class="production-client-info-line production-client-contact-name"><strong>' + escapeHtml(customerContact) + '</strong></div>');
    if (customerPhone)   displayLines.push('<div class="production-client-info-line">' + ICON_PHONE + '<span>' + escapeHtml(customerPhone) + '</span></div>');
    if (customerEmail)   displayLines.push('<div class="production-client-info-line">' + ICON_EMAIL + '<span>' + escapeHtml(customerEmail) + '</span></div>');
    if (!hasData)        displayLines.push('<div class="production-client-info-line production-contact-missing"><span class="production-contact-missing-label">&#9888; Sin contacto asignado</span></div>');

    col.innerHTML =
        '<div class="production-customer-contact-display">' +
            '<div class="production-customer-contact-info">' +
                displayLines.join('') +
            '</div>' +
            '<button type="button" class="production-contact-edit-btn production-inline-icon production-inline-icon-ghost" title="Editar contacto del cliente" aria-label="Editar contacto del cliente"></button>' +
        '</div>' +
        '<div class="production-customer-contact-form" hidden>' +
            '<div class="production-contact-form-fields">' +
                '<input class="production-contact-input" data-contact-field="name"  type="text"  placeholder="Nombre del contacto"  value="' + escapeHtml(customerContact) + '">' +
                '<input class="production-contact-input" data-contact-field="phone" type="tel"   placeholder="Telefono"              value="' + escapeHtml(customerPhone)   + '">' +
                '<input class="production-contact-input" data-contact-field="email" type="email" placeholder="Correo electronico"    value="' + escapeHtml(customerEmail)   + '">' +
            '</div>' +
            '<div class="production-contact-form-actions">' +
                '<button type="button" class="production-contact-save-btn">Guardar</button>' +
                '<button type="button" class="production-contact-cancel-btn">Cancelar</button>' +
            '</div>' +
            '<div class="production-contact-form-status" hidden></div>' +
        '</div>';

    var displayDiv = col.querySelector('.production-customer-contact-display');
    var formDiv    = col.querySelector('.production-customer-contact-form');
    var editBtn    = col.querySelector('.production-contact-edit-btn');
    var cancelBtn  = col.querySelector('.production-contact-cancel-btn');
    var saveBtn    = col.querySelector('.production-contact-save-btn');
    var statusDiv  = col.querySelector('.production-contact-form-status');

    editBtn.addEventListener('click', function () {
        displayDiv.hidden = true;
        formDiv.hidden = false;
        col.querySelector('[data-contact-field="name"]').focus();
    });

    cancelBtn.addEventListener('click', function () {
        displayDiv.hidden = false;
        formDiv.hidden = true;
        statusDiv.hidden = true;
    });

    saveBtn.addEventListener('click', function () {
        clearTimeout(customerContactSaveTimer);
        var nameVal  = col.querySelector('[data-contact-field="name"]').value.trim();
        var phoneVal = col.querySelector('[data-contact-field="phone"]').value.trim();
        var emailVal = col.querySelector('[data-contact-field="email"]').value.trim();
        saveBtn.disabled = true;
        statusDiv.hidden = true;
        customerContactSaveTimer = setTimeout(function () {
            saveOrderDetails({ customer: { contact_name: nameVal, phone: phoneVal, email: emailVal } })
                .then(function () {
                    displayDiv.hidden = false;
                    formDiv.hidden = true;
                })
                .catch(function (error) {
                    statusDiv.textContent = error.message || 'No se pudo guardar.';
                    statusDiv.hidden = false;
                })
                .finally(function () {
                    saveBtn.disabled = false;
                });
        }, 200);
    });
}

// ── FICHA TÉCNICA DE PRODUCCIÓN ──────────────────────────────────────────────
// Vuelca inline en el documento toda la configuración cotizada de cada módulo
// productivo (máquina, sustrato, tintas, barniz, laminado, estampado, troquelado,
// rebobinado, empaque). Sin popovers, sin pestañas, sin costos. Los parámetros
// "vigentes" (captura MES) NO van acá — son otra vista. Fase 1: solo datos que
// ya existen en flexo_orders o que se derivan geométricamente.
function ftRow(label, value, unit) {
    var isEmpty = value === null || value === undefined || value === '' || value === '—';
    // Fila sin dato → no se muestra (pedido: la ficha solo lista lo que realmente tiene valor).
    if (isEmpty) return '';
    var safeVal = escapeHtml(String(value));
    var unitHtml = unit ? ' <span class="production-summary-unit">' + escapeHtml(unit) + '</span>' : '';
    return '<div class="production-summary-item"><span class="production-summary-label">' + escapeHtml(label) +
        '</span><span class="production-summary-value">' + safeVal + unitHtml + '</span></div>';
}

function ftFillSection(sectionId, bodyId, show, rowsHtml) {
    var section = document.getElementById(sectionId);
    var body = document.getElementById(bodyId);
    if (body) body.innerHTML = rowsHtml || '';
    if (section) section.hidden = !show;
}

// Tiempos y merma por fase, desglosados por operario (GET /api/mes/sumatoria-fases).
// Vive en el menú Producción → pestaña "Tiempos y Merma"; solo los procesos que capturan
// fases y merma en planta.
var PROCESOS_TIEMPOS_MERMA = [
    { clave: 'impresion', label: 'Impresión' },
    { clave: 'rebobinado', label: 'Rebobinado' }
];
var ETIQUETA_FASE_TIEMPOS = { montaje: 'Montaje', setup: 'Setup', corrida: 'Tiraje / Corrida', tiraje: 'Tiraje', limpieza: 'Limpieza', trabajo: 'Trabajo' };
function formatearMinutosFase(min) {
    var m = Math.round(Number(min) || 0);
    var h = Math.floor(m / 60), r = m % 60;
    return h > 0 ? (h + 'h ' + r + 'min') : (r + ' min');
}
function formatearMermaFase(merma) {
    return Number(merma) > 0 ? formatNumber(merma, 2) + ' m' : '';
}
var pestanaProduccionActiva = 'comparativa';
function iniciarPestanasProduccion() {
    var barra = document.getElementById('orderProduccionTabs');
    if (!barra) return;
    barra.addEventListener('click', function (e) {
        var btn = e.target.closest('.tl-tab-btn');
        if (!btn) return;
        mostrarPestanaProduccion(btn.dataset.produccionTab);
    });
}
function mostrarPestanaProduccion(pestana) {
    pestanaProduccionActiva = pestana === 'tiempos' ? 'tiempos' : 'comparativa';
    var barra = document.getElementById('orderProduccionTabs');
    if (barra) barra.querySelectorAll('.tl-tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.produccionTab === pestanaProduccionActiva); });
    var panelComparativa = document.getElementById('orderProduccionPanelComparativa');
    var panelTiempos = document.getElementById('orderProduccionPanelTiempos');
    if (panelComparativa) panelComparativa.hidden = pestanaProduccionActiva !== 'comparativa';
    if (panelTiempos) panelTiempos.hidden = pestanaProduccionActiva !== 'tiempos';
    if (pestanaProduccionActiva === 'tiempos') cargarTiemposMermaProduccion(currentOrderCode);
    else renderProcessesComparisonContent();
}
async function cargarTiemposMermaProduccion(orderCode) {
    var body = document.getElementById('orderTiemposMermaBody');
    if (!body || !orderCode) return;
    body.innerHTML = '<div class="production-summary-empty">Cargando los tiempos de producción, un momento por favor…</div>';
    var headers = (typeof sessionHeaderSafe === 'function' ? sessionHeaderSafe() : {});
    var fallos = 0;
    var resultados = await Promise.all(PROCESOS_TIEMPOS_MERMA.map(function (p) {
        return fetch('/api/mes/sumatoria-fases?orderCode=' + encodeURIComponent(orderCode) + '&proceso=' + p.clave, { headers: headers })
            .then(function (r) {
                if (r.status === 404) return null;
                if (!r.ok) { fallos++; return null; }
                return r.json();
            })
            .then(function (d) { return (d && d.ok) ? { proceso: p, data: d } : null; })
            .catch(function () { fallos++; return null; });
    }));
    var bloques = resultados.filter(function (r) { return r && r.data && r.data.fases && r.data.fases.length; }).map(function (r) {
        var filas = r.data.fases.map(function (f) {
            var fila = '<tr><td><strong>' + escapeHtml(ETIQUETA_FASE_TIEMPOS[f.fase] || f.fase) + '</strong></td>' +
                '<td>' + formatearMinutosFase(f.minutos) + '</td><td>' + formatearMermaFase(f.merma) + '</td></tr>';
            var operarios = (f.operarios && f.operarios.length > 1) ? f.operarios.map(function (op) {
                return '<tr style="opacity:.75;font-size:12px"><td style="padding-left:22px">' + escapeHtml(op.operador) + '</td>' +
                    '<td>' + formatearMinutosFase(op.minutos) + '</td><td>' + formatearMermaFase(op.merma) + '</td></tr>';
            }).join('') : '';
            return fila + operarios;
        }).join('');
        var total = '<tr><td><strong>Total</strong></td><td><strong>' + formatearMinutosFase(r.data.totalMinutos) + '</strong></td>' +
            '<td><strong>' + formatearMermaFase(r.data.totalMerma) + '</strong></td></tr>';
        return '<div class="cmp-step-header">' + escapeHtml(r.proceso.label) + '</div>' +
            '<div class="socios-table-wrap production-mini-table"><table class="quote-table socios-table">' +
            '<thead><tr><th>Fase</th><th>Tiempo</th><th>Merma</th></tr></thead><tbody>' + filas + total + '</tbody></table></div>';
    });
    if (bloques.length) {
        body.innerHTML = bloques.join('');
    } else if (fallos) {
        body.innerHTML = '<div class="production-summary-empty">No pudimos traer los tiempos en este momento. Revisa la conexión e intenta de nuevo.</div>';
    } else {
        body.innerHTML = '<div class="production-summary-empty">Impresión y Rebobinado todavía no han registrado tiempos en esta orden.</div>';
    }
}

function renderFichaTecnica(rc, ctx) {
    ctx = ctx || {};
    var INCH_TO_M = 0.0254;
    var num = function (v, d) {
        var x = Number(v);
        return (Number.isFinite(x) && x !== 0) ? formatNumber(x, d == null ? 2 : d) : '';
    };
    var mts = function (feet, d) {
        var x = Number(feet);
        return (Number.isFinite(x) && x !== 0) ? formatMeters(x, d == null ? 1 : d) : '';
    };
    var sf = (rc.sustrato_ficha && typeof rc.sustrato_ficha === 'object') ? rc.sustrato_ficha : {};
    var bf = (rc.barniz_ficha && typeof rc.barniz_ficha === 'object') ? rc.barniz_ficha : {};
    var cf = (rc.caja_ficha && typeof rc.caja_ficha === 'object') ? rc.caja_ficha : {};
    var mEsp = (rc.maquina_especificaciones && typeof rc.maquina_especificaciones === 'object') ? rc.maquina_especificaciones : {};
    var mv = (rc.maquina_velocidad && typeof rc.maquina_velocidad === 'object') ? rc.maquina_velocidad : null;
    // Ancho de bobina para las derivaciones de área/peso: del catálogo de materia
    // prima (mm → m), acotado a un rango sano (una banda de flexo no pasa de ~700 mm).
    var anchoBobinaMm = Number(sf.ancho_mm) || 0;
    var anchoBobinaM = (anchoBobinaMm >= 10 && anchoBobinaMm <= 700) ? anchoBobinaMm / 1000 : 0;
    var metrosNetos = feetToMeters(rc.pies_sustrato_neto);
    var metrosTotales = feetToMeters(rc.pies_totales_sustrato);
    var areaSustratoM2 = anchoBobinaM > 0 ? metrosTotales * anchoBobinaM : Number(rc.material_m2) || 0;
    var pesoNetoKg = (anchoBobinaM > 0 && Number(sf.gramaje_g_m2) > 0)
        ? metrosNetos * anchoBobinaM * Number(sf.gramaje_g_m2) / 1000 : 0;
    var motivosList = Array.isArray(currentMotivosDetalle) ? currentMotivosDetalle : [];
    var sellosTotales = motivosList.reduce(function (s, m) { return s + (Number(m.sellos) || 0); }, 0);
    // Consumo total de tinta del trabajo: suma de los consumos por motivo (más fiable
    // que la columna plana, que a veces quedó inconsistente); si no hay motivos, la columna.
    var consumoTintaTotalKg = motivosList.length
        ? motivosList.reduce(function (s, m) { return s + (Number(m.consumoTotalKg) || 0); }, 0)
        : (Number(rc.consumo_tinta_total_kg) || 0);

    // ── Información General (identidad del pedido: lo mismo que se ve en el Cálculo) ──
    // Tipo de Trabajo/Tipo de Producto son cortos → van en pareja; los códigos y la
    // referencia/insumos suelen ser textos largos → van de a uno por fila.
    var infoGeneralRows = [
        (rc.tipo_trabajo || rc.product_type) ? '<div class="production-summary-grid production-summary-grid-two">' +
            ftRow('Tipo de Trabajo', rc.tipo_trabajo || '') +
            ftRow('Tipo de Producto', rc.product_type || '') +
            '</div>' : '',
        (rc.codigo_producto_cliente || rc.finished_product_sku) ? '<div class="production-summary-grid production-summary-grid-two">' +
            ftRow('Código SKU Cliente', rc.codigo_producto_cliente || '') +
            ftRow('Código SKU Local', rc.finished_product_sku || '') +
            '</div>' : '',
        ftRow('Referencia', rc.referencia_cliente || ''),
        ftRow('Insumos que Entrega el Cliente', rc.insumos_cliente || '')
    ].join('');
    ftFillSection('orderInfoGeneralSection', 'orderInfoGeneralBody', Boolean(infoGeneralRows), infoGeneralRows);

    // ── Máquina de Impresión ──
    var velMaqTxt = Number(rc.velocidad_maquina_m_min) > 0
        ? formatNumber(rc.velocidad_maquina_m_min, 1) + ' m/min'
        : (mv ? formatNumber(mv.valor, 1) + ' ' + mv.unidad : '');
    ftFillSection('orderMaquinaSection', 'orderMaquinaBody', Boolean(ctx.machineName),
        '<div class="maquina-datos">' + [
            ftRow('Máquina', ctx.machineName || ''),
            ftRow('Velocidad', velMaqTxt),
            ftRow('Tiempo de Setup', formatDuracion(rc.tiempo_setup_min)),
            ftRow('Tiempo de Montaje', formatDuracion(rc.tiempo_montaje_min)),
            Number(rc.volteadora_minutos) > 0 ? ftRow('Tiempo de Volteadora', formatDuracion(rc.volteadora_minutos)) : '',
            ftRow('Tiempo de Limpieza', formatDuracion(rc.tiempo_limpieza_min)),
            ftRow('Tiempo de Corrida', formatDuracion(rc.tiempo_corrida_min)),
            ftRow('Tiempo Total de Impresión', formatDuracion(rc.tiempo_total_impresion_min))
        ].join('') + '</div>');

    // ── Sustrato ──
    var anchoBobinaTxt = (anchoBobinaMm >= 10 && anchoBobinaMm <= 700)
        ? formatNumber(anchoBobinaMm, 1) + ' mm (' + formatNumber(anchoBobinaMm / 25.4, 2) + ' in)' : '';
    var mermaParosM = Number(rc.merma_paros_m_vigente) || 0;
    ftFillSection('orderSustratoSection', 'orderSustratoBody', Boolean(ctx.materialName), [
        // Información del proceso
        ftRow('Sustrato', ctx.materialName || ''),
        ftRow('Ancho de Bobina', anchoBobinaTxt),
        ftRow('Gramaje', num(sf.gramaje_g_m2, 1), 'g/m²'),
        ftRow('Calibre', num(sf.calibre_micras, 1), 'µm'),
        ftRow('Superficie', sf.tipo_superficie || ''),
        ftRow('Aplicación', sf.ambiente_aplicacion || ''),
        // Consumo: netos → desglose de merma → totales
        '<div class="production-summary-subhead">Consumo</div>',
        ftRow('Metros Netos', metrosNetos > 0 ? num(metrosNetos, 1) : '', 'm'),
        ftRow('Merma de Arranque', mts(rc.merma_arranque_pies), 'm'),
        ftRow('Merma de Tiraje', mts(rc.merma_tiraje_pies), 'm'),
        ftRow('Merma de Tiraje', num(rc.merma_tiraje_pct, 1), '%'),
        ftRow('Merma de Paros', mermaParosM > 0 ? num(mermaParosM, 1) : '', 'm'),
        ftRow('Merma Total', mts(rc.merma_total_pies), 'm'),
        ftRow('Metros Totales', metrosTotales > 0 ? num(metrosTotales, 1) : '', 'm'),
        ftRow('Área de Sustrato', areaSustratoM2 > 0 ? num(areaSustratoM2, 2) : '', 'm²'),
        ftRow('Peso Neto del Pedido', pesoNetoKg > 0 ? num(pesoNetoKg, 2) : '', 'kg')
    ].join(''));

    // ── Tintas ──
    // La sección plana de tintas se eliminó del resumen: la fuente de verdad es la tabla de
    // Motivos/Tintas de arriba (renderMotivoTintasTable). "Consumo por Color" salía de la columna
    // plana rc.consumo_tinta_por_color_kg, que no nace de los motivos y daba datos inconsistentes.
    ftFillSection('orderTintasSection', 'orderTintasBody', false, '');

    // ── Barniz ──
    var barnizShow = Boolean(rc.barniz_tipo) || Number(rc.barniz_costo_total) > 0;
    var barnizLenM = metrosTotales;
    var barnizCobPct = Number(rc.barniz_cobertura_pct) || 0;
    var barnizAreaM2 = (anchoBobinaM > 0)
        ? barnizLenM * anchoBobinaM * (barnizCobPct > 0 ? barnizCobPct / 100 : 1) : 0;
    var barnizEnTintas = '';
    motivosList.some(function (m) {
        return (Array.isArray(m.tintas) ? m.tintas : []).some(function (t) {
            if (t.tipo === 'barniz' && t.etiqueta) { barnizEnTintas = t.etiqueta; return true; }
            return false;
        });
    });
    ftFillSection('orderBarnizSection', 'orderBarnizBody', barnizShow, [
        ftRow('Tipo', rc.barniz_tipo || barnizEnTintas),
        ftRow('Reservado', rc.barniz_zonificado ? 'Sí' : 'No'),
        ftRow('Cobertura', num(rc.barniz_cobertura_pct, 0), '%'),
        ftRow('Factor de Transferencia', num(bf.factorTransferencia, 2)),
        ftRow('Viscosidad', num(bf.viscosidad, 0), 's'),
        ftRow('Temperatura UV', num(bf.tempUv, 0), '°C'),
        '<div class="production-summary-subhead">Consumo</div>',
        ftRow('Longitud de Aplicación', barnizLenM > 0 ? num(barnizLenM, 1) : '', 'm'),
        ftRow('Área de Aplicación', barnizAreaM2 > 0 ? num(barnizAreaM2, 2) : '', 'm²'),
        ftRow('Consumo', num(rc.barniz_consumo_kg, 2), 'kg'),
        ftRow('Tiempo de Montaje', formatDuracion(rc.barniz_tiempo_montaje_min)),
        (rc.barniz_comentario
            ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(rc.barniz_comentario)) + '</span></div>'
            : '')
    ].join(''));

    // ── Estampado ──
    var estampadoTipo = (rc.estampado_tipo && String(rc.estampado_tipo).trim().toLowerCase() !== 'ninguno') ? rc.estampado_tipo : '';
    var estampadoColor = estampadoTipo ? (String(estampadoTipo).replace(/^\s*foil\s+/i, '').trim() || estampadoTipo) : '';
    var estLenM = metrosTotales;
    var estAreaM2 = anchoBobinaM > 0 ? estLenM * anchoBobinaM : 0;
    ftFillSection('orderEstampadoSection', 'orderEstampadoBody', Boolean(estampadoTipo), [
        ftRow('Tipo', estampadoTipo),
        ftRow('Color', estampadoColor !== estampadoTipo ? estampadoColor : ''),
        ftRow('Cantidad (Metros Lineales)', estLenM > 0 ? num(estLenM, 1) : '', 'm'),
        ftRow('Cantidad (Metros Cuadrados)', estAreaM2 > 0 ? num(estAreaM2, 2) : '', 'm²'),
        ftRow('Cantidad de Sellos', Number(rc.estampado_sellos) > 0 ? formatNumber(rc.estampado_sellos, 0) : '')
    ].join(''));

    // ── Laminado ──
    var lamShow = Boolean(rc.laminado_tipo) || Number(rc.laminado_costo_total) > 0;
    var lamLenM = Number(rc.laminado_metros_lineales) || 0;
    var lamAreaM2 = anchoBobinaM > 0 ? lamLenM * anchoBobinaM : 0;
    ftFillSection('orderLaminadoSection', 'orderLaminadoBody', lamShow, [
        ftRow('Material', rc.laminado_tipo || ''),
        '<div class="production-summary-subhead">Consumo</div>',
        ftRow('Consumo (Metros Lineales)', lamLenM > 0 ? num(lamLenM, 1) : '', 'm'),
        ftRow('Consumo (Metros Cuadrados)', lamAreaM2 > 0 ? num(lamAreaM2, 2) : '', 'm²'),
        ftRow('Tiempo de Montaje', formatDuracion(rc.laminado_tiempo_montaje_min)),
        (rc.laminado_comentario
            ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(rc.laminado_comentario)) + '</span></div>'
            : '')
    ].join(''));

    // ── Troquelado ──
    var td = rc.troquel_dimensiones || {};
    var troShow = Boolean(ctx.dieCode) || Boolean(td.ancho_etiqueta_in || td.ancho_total_troquel_in);
    var etiquetaSize = (td.ancho_etiqueta_in && td.largo_etiqueta_in)
        ? num(td.ancho_etiqueta_in, 2) + ' x ' + num(td.largo_etiqueta_in, 2) : '';
    var troquelSize = (td.ancho_total_troquel_in && td.largo_total_troquel_in)
        ? num(td.ancho_total_troquel_in, 2) + ' x ' + num(td.largo_total_troquel_in, 2) : '';
    ftFillSection('orderTroqueladoSection', 'orderTroqueladoBody', troShow, [
        ftRow('Troquel', ctx.dieCode || ''),
        ftRow('Tamaño de Etiqueta', etiquetaSize, 'in'),
        ftRow('Tamaño de Troquel', troquelSize, 'in'),
        ftRow('Tiempo de Montaje', formatDuracion(rc.troquelado_tiempo_montaje_min)),
        ftRow('Merma de Ajuste', num(rc.troquelado_merma_ajuste_metros), 'm')
    ].join(''));

    // ── Sellos ──
    var pf = (rc.sellos_ficha && typeof rc.sellos_ficha === 'object') ? rc.sellos_ficha : null;
    var plaFilas = pf && Array.isArray(pf.filas)
        ? pf.filas.filter(function (f) { return Number(f.sellos) > 0 || Number(f.inTotalMotivo) > 0; })
        : [];
    // Respaldo: si el cálculo no guardó las filas por motivo, se arman con el detalle de
    // motivos (cantidad de sellos por motivo) y el tamaño de sello calculado por el servidor.
    if (pf && !plaFilas.length && Number(pf.inPorSello) > 0 && motivosList.length) {
        plaFilas = motivosList
            .map(function (m) {
                var sellos = Number(m.sellos) || 0;
                return {
                    detalle: m.nombre || ('Arte ' + ((Number(m.indice) || 0) + 1)),
                    sellos: sellos,
                    inPorSello: Number(pf.inPorSello),
                    inTotalMotivo: sellos * Number(pf.inPorSello)
                };
            })
            .filter(function (f) { return f.sellos > 0; });
    }
    // Resumen del proceso de Sellos del cálculo (NO desglosado por motivo). Etiquetas cortas,
    // iguales a la tabla del cálculo (Cant. Sellos / in² x Sello / in² Motivo / in² Acum.)
    // para que no descuadren la columna. En Costo Externo se añaden Descripción y Comentarios;
    // en Inventario NO (no hay proveedor ni comentarios).
    var plaShow = Boolean(pf && (plaFilas.length || (pf.esExterno && (pf.descripcion || pf.comentario))));
    var plaRows = '';
    if (pf) {
        var plaInPorSello = Number((plaFilas[0] && plaFilas[0].inPorSello) || pf.inPorSello) || 0;
        var plaCantidad = plaFilas.reduce(function (s, f) { return s + (Number(f.sellos) || 0); }, 0);
        var plaInMotivo = plaFilas.length
            ? (Number(plaFilas[0].inTotalMotivo) || (Number(plaFilas[0].sellos) || 0) * plaInPorSello)
            : 0;
        var plaInAcum = plaFilas.reduce(function (s, f) {
            return s + (Number(f.inTotalMotivo) || (Number(f.sellos) || 0) * plaInPorSello);
        }, 0);
        plaRows =
            ftRow('Cant. Sellos', plaCantidad > 0 ? fmtInt(plaCantidad) : '') +
            ftRow('in² x Sello', plaInPorSello > 0 ? formatNumber(plaInPorSello, 2) : '', 'in²') +
            ftRow('in² Arte', plaInMotivo > 0 ? formatNumber(plaInMotivo, 2) : '', 'in²') +
            ftRow('in² Acum.', plaInAcum > 0 ? formatNumber(plaInAcum, 2) : '', 'in²') +
            (pf.esExterno ? ftRow('Descripción', pf.descripcion || '') : '') +
            (pf.esExterno ? ftRow('Comentarios', pf.comentario || '') : '');
    }
    ftFillSection('orderSellosSection', 'orderSellosBody', plaShow, plaRows);

    // ── Rebobinado ──
    var rebShow = Boolean(rc.rebobinado_maquina) || Number(rc.rebobinado_tiempo_total_min) > 0 || Number(rc.labels_per_roll) > 0;
    var coreType = (rc.tipo_core && typeof rc.tipo_core === 'object') ? rc.tipo_core : {};
    // Mismo formato de Tipo de Core que el cálculo (app.js):  {diámetro}'' - {espesor}mm
    var coreEsp = Number(coreType.espesor) || 0;
    var tipoCoreTxt = (coreType.descripcion && String(coreType.descripcion).trim())
        || (coreType.diametro ? (coreEsp > 0 ? coreType.diametro + "'' - " + coreEsp + 'mm' : coreType.diametro + "''") : '');
    var outTypeMatch = getOutputTypeImage(ctx.outputType);
    var outTypeText = outTypeMatch ? (outTypeMatch.nombre || outTypeMatch.name || ctx.outputType) : (ctx.outputType || '');
    ftFillSection('orderRebobinadoSection', 'orderRebobinadoBody', rebShow, [
        ftRow('Máquina', rc.rebobinado_maquina || ''),
        ftRow('Velocidad', num(rc.rebobinado_velocidad, 1), 'm/min'),
        ftRow('Cantidad Empalmes Máximo', num(rc.rebobinado_empalmes_maximo, 0)),
        ftRow('Sentido de Bobinado', outTypeText),
        '<div class="production-summary-subhead">Consumo</div>',
        ftRow('Producto por Rollo', Number(rc.labels_per_roll) > 0 ? parseNumber(rc.labels_per_roll) : ''),
        ftRow('Ancho de Core', num(rc.core_width, 2), 'in'),
        ftRow('Tipo de Core', tipoCoreTxt),
        ftRow('Distancia Recorrida', mts(rc.pies_totales_sustrato), 'm'),
        ftRow('Tiempo de Montaje', formatDuracion(rc.rebobinado_tiempo_montaje_min)),
        ftRow('Tiempo Total', formatDuracion(rc.rebobinado_tiempo_total_min)),
        ftRow('Merma de Operación', num(rc.rebobinado_merma_operacion_pct, 1), '%'),
        ftRow('Merma de Ajuste', num(rc.rebobinado_merma_ajuste_metros), 'm'),
        (rc.rebobinado_comentario
            ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(rc.rebobinado_comentario)) + '</span></div>'
            : '')
    ].join(''));

    // ── Empaque ──
    var empRollos = Number(rc.empaque_cantidad_rollos) || 0;
    var empRollosPorCaja = Number(rc.etiquetas_por_caja) || 0;
    var empCajas = (empRollosPorCaja > 0 && empRollos > 0) ? Math.ceil(empRollos / empRollosPorCaja) : 0;
    var empShow = empRollos > 0 || empRollosPorCaja > 0 || Number(rc.empaque_kg_por_caja) > 0 ||
        Boolean(rc.empaque_tipo_caja) || Boolean(rc.empaque_tipo_bolsa) || Boolean(EMPAQUE_ADVERTENCIA_TEXTO);
    var empExterno = Number(rc.empaque_costo_externo) > 0;
    var cajaDimsTxt = (Number(cf.largoInternoCm) > 0 && Number(cf.anchoInternoCm) > 0 && Number(cf.altoInternoCm) > 0)
        ? num(cf.largoInternoCm, 0) + ' x ' + num(cf.anchoInternoCm, 0) + ' x ' + num(cf.altoInternoCm, 0) : '';
    var tarimaRows = [
        ftRow('Alto de Tarima', num(rc.empaque_tarima_alto, 2), 'm'),
        ftRow('Ancho de Tarima', num(rc.empaque_tarima_ancho, 2), 'm'),
        ftRow('Largo de Tarima', num(rc.empaque_tarima_largo, 2), 'm'),
        ftRow('Peso de Tarima', num(rc.empaque_tarima_peso, 2), 'kg')
    ].join('');
    var empCoreRows = [
        ftRow('Ancho de Core', num(rc.core_width, 2), 'in'),
        ftRow('Tipo de Core', tipoCoreTxt),
        ftRow('Etiquetas por Core', Number(rc.labels_per_roll) > 0 ? parseNumber(rc.labels_per_roll) : ''),
        ftRow('Cantidad de Cores', empRollos ? parseNumber(empRollos) : '')
    ].join('');
    var empCajaRows = [
        ftRow('Cantidad de Rollos', empRollos ? parseNumber(empRollos) : ''),
        ftRow('Rollos por Caja', empRollosPorCaja ? parseNumber(empRollosPorCaja) : ''),
        ftRow('Cantidad de Cajas', empCajas ? parseNumber(empCajas) : ''),
        ftRow('Tipo de Caja', rc.empaque_tipo_caja_nombre || rc.empaque_tipo_caja || ''),
        ftRow('Dimensiones Internas de Caja', cajaDimsTxt, 'cm'),
        ftRow('Peso por Caja', num(rc.empaque_kg_por_caja, 2), 'kg')
    ].join('');
    var empProcesoRows = [
        ftRow('Cantidad de Operarios', Number(rc.empaque_operarios) > 0 ? parseNumber(rc.empaque_operarios) : ''),
        ftRow('Rendimiento por Hora', Number(rc.empaque_rendimiento_por_hora) > 0 ? parseNumber(rc.empaque_rendimiento_por_hora) : ''),
        ftRow('Tiempo de Empaque', formatDuracion(Number(rc.empaque_horas) * 60)),
        ftRow('Servicio Externo', empExterno ? 'Sí' : 'No')
    ].join('');
    var empBolsaRows = [
        ftRow('Tipo de Bolsa', rc.empaque_tipo_bolsa_nombre || ''),
        ftRow('Cantidad de Bolsas', Number(rc.empaque_cantidad_bolsas) > 0 ? parseNumber(rc.empaque_cantidad_bolsas) : '')
    ].join('');
    // Empaque en columnas fijas: Proceso · Core · Caja · Bolsa · Tarima. Un grupo sin datos no
    // se renderiza (menos ruido visual); su columna del grid queda vacía.
    var empGrupo = function (titulo, filas) {
        return filas ? '<div class="production-empaque-group"><div class="production-summary-subhead">' + titulo + '</div>' + filas + '</div>' : '';
    };
    ftFillSection('orderEmpaqueSection', 'orderEmpaqueBody', empShow, [
        '<div class="production-empaque-consumo">',
        empGrupo('Proceso', empProcesoRows),
        empGrupo('Consumo · Core', empCoreRows),
        empGrupo('Consumo · Caja', empCajaRows),
        rc.empaque_tipo_bolsa_nombre ? empGrupo('Consumo · Bolsa', empBolsaRows) : '',
        empGrupo('Consumo · Tarima', tarimaRows),
        '</div>',
        (rc.empaque_comentario
            ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(rc.empaque_comentario)) + '</span></div>'
            : '')
    ].join(''));

    redistributeAcabadosFlex('orderAcabadosFlex');
}

function renderOrder(order) {
    const raw = order.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
    const lineRaw = detail.raw_data || {};
    const printing = raw.printing || null;
    let attachments, dimensions;
    try { attachments = extractAttachments(raw); } catch (e) { console.error('extractAttachments error:', e); attachments = []; }
    try { dimensions = buildDimensionsText(detail); } catch (e) { console.error('buildDimensionsText error:', e); dimensions = ''; }
    const quantityValue = raw.totals?.quantity || order.ordered_quantity;
    const quantity = parseNumber(quantityValue);
    const localProductCode = pickFirst(order.product_code, line.product_code, detail.productCode);
    const quoteLineCode = pickFirst(raw.source_line_code, detail.lineCode, line.line_code);
    const showProductId = localProductCode && localProductCode !== quoteLineCode;
    const clientProductCode = pickFirst(lineRaw['ID PRODUCTO CLIENTE'], lineRaw['CODIGO PRODUCTO CLIENTE']);
    const productRoute = localProductCode ? `/producto-documento?codigo=${encodeURIComponent(localProductCode)}` : '';
    // SKU visible = nomenclatura propia (finished_product_sku); el P-000xxx interno solo enruta.
    const productSkuVisible = pickFirst(order.finished_product_sku, line.finished_product_sku, localProductCode);
    const productCodes = [
        clientProductCode ? `<span>(${escapeHtml(clientProductCode)})</span>` : '',
        showProductId ? `<span>(${buildOrderDataLink(productRoute, productSkuVisible, `SKU ${productSkuVisible}`)})</span>` : ''
    ].filter(Boolean).join(' ');
    const detencionEstado = order.estado_detencion || (order.detencion && order.detencion.estado) || '';
    const stateText = detencionEstado === 'DETENIDA' ? 'Detenida'
        : detencionEstado === 'ANULADA' ? 'Anulada'
        : pickFirst(raw.status, 'Pendiente');
    const promisedDateRaw = raw.planning_control?.promisedDeliveryDate || quote.due_on;
    const scheduledDateRaw = raw.planning_control?.scheduledDeliveryDate || raw.scheduled_on;
    const productionEndDateRaw = raw.planning_control?.productionEndDate || null;
    const customerId = pickFirst(raw.customer_code, quote.customer_code);
    const customerName = pickFirst(raw.customer_name, quote.customer_name);
    const customerContact = pickFirst(raw.contact_name, quote.contact_name, lineRaw['CLIENTE | CONTACTO NOMBRE COMPLETO']);
    const customerPhone = pickFirst(raw.phone, quote.phone, lineRaw['CLIENTE | CONTACTO TELEFONO']);
    const customerEmail = pickFirst(raw.email, quote.email, lineRaw['CLIENTE | CONTACTO EMAIL']);
    const customerAddress = pickFirst(lineRaw.STREET, lineRaw['CLIENTE | DIRECCION'], lineRaw['DIRECCION ENTREGA']);
    const sellerNameRaw = pickFirst(raw.salesperson_name, quote.salesperson_name, detail.salespersonName);
    // "admin" es un usuario de sistema, no un vendedor: nunca mostrarlo como vendedor.
    const sellerName = String(sellerNameRaw || '').trim().toLowerCase() === 'admin' ? '' : sellerNameRaw;
    const jobName = pickFirst(line.job_name, detail.jobName, lineRaw['NOMBRE TRABAJO']);

    /* --- Centralized printing data block (raw.printing takes priority) --- */
    var noPrint;
    var linearFeet, wasteFeet, totalFeet;
    var labelsPerRoll, rollCount;
    var dieCode;
    var finishes;
    var numberingValue;
    var outputType;
    var inkTintCount, inkPantoneCount, inkHasCmyk, inkHasWhite, inkHasDoubleWhite, inkNames;
    var pantoneList;
    var frontBackObj;

    if (printing) {
        noPrint = !printing.hasPrint;
        linearFeet = Number(printing.materialFeet || 0);
        wasteFeet = Number(printing.materialFeetWaste || 0);
        totalFeet = linearFeet + wasteFeet;
        labelsPerRoll = Number(printing.labelsPerRoll || 0);
        rollCount = labelsPerRoll > 0 && quantity > 0 ? Math.ceil(quantity / labelsPerRoll) : '';
        dieCode = printing.dieCode || '';
        finishes = Array.isArray(printing.finishes) ? printing.finishes : [];
        numberingValue = printing.numbering || '';
        outputType = printing.outputType || '';
        inkTintCount = Number(printing.tintCount || 0);
        inkPantoneCount = Number(printing.pantoneCount || 0);
        inkHasCmyk = Boolean(printing.hasCmyk);
        inkHasWhite = Boolean(printing.hasWhite);
        inkHasDoubleWhite = Boolean(printing.hasDoubleWhite);
        inkNames = Array.isArray(printing.inkNames) ? printing.inkNames : [];
        pantoneList = Array.isArray(printing.pantones) ? printing.pantones : [];
        frontBackObj = printing.frontBack || null;
    } else {
        noPrint = isNoPrint(detail, lineRaw);
        linearFeet = Number(detail.materialFeet || 0);
        wasteFeet = Number(detail.materialFeetWaste || 0);
        totalFeet = linearFeet + wasteFeet;
        labelsPerRoll = Number(detail.labelsPerRoll || 0);
        rollCount = labelsPerRoll > 0 && quantity > 0 ? Math.ceil(quantity / labelsPerRoll) : '';
        dieCode = pickFirst(detail.dieCode, lineRaw['GENERAL | TROQUEL | ID'], order.die_code);
        finishes = buildFinishTags(lineRaw, detail, dieCode);
        numberingValue = pickFirst(lineRaw['ACABADOS | NUMERADO'], lineRaw.NUMERADO);
        outputType = pickFirst(detail.outputType, lineRaw['TIPO SALIDA']);
        inkTintCount = Number(detail.tintCount || lineRaw['CANTIDAD TINTAS'] || 0);
        inkPantoneCount = Number(detail.pantoneCount || lineRaw['CANTIDAD PANTONES'] || 0);
        inkHasCmyk = String(lineRaw['CMYK'] || '').toLowerCase() === 'si' || lineRaw['GENERAL | CMYK'] === true;
        inkHasWhite = String(lineRaw['TINTA BLANCA'] || '').toLowerCase() === 'si' || lineRaw['GENERAL | TINTA BLANCA'] === true;
        inkHasDoubleWhite = String(lineRaw['DOBLE PASADA BLANCA'] || '').toLowerCase() === 'si';
        inkNames = [];
        pantoneList = [lineRaw['PANTONE 1'], lineRaw['PANTONE 2'], lineRaw['PANTONE 3']].filter(Boolean);
        frontBackObj = (raw.production_run && raw.production_run.mode === 'frente_dorso') ? raw.production_run : null;
    }
    const pantonesCount = inkPantoneCount + (pantoneList.length > 0 ? 0 : 0);
    const frontBackSource = raw.production_run && raw.production_run.mode === 'frente_dorso' ? raw.production_run : null;
    const frontBackGroup = raw.front_back_group || raw.grupo_frente_dorso || {};
    if (frontBackObj || frontBackSource) {
        frontBackObj = {
            ...(frontBackGroup || {}),
            ...(frontBackSource || {}),
            ...(frontBackObj || {}),
            elementRoles: {
                ...((frontBackGroup || {}).elementRoles || {}),
                ...((frontBackSource || {}).elementRoles || {}),
                ...((frontBackObj || {}).elementRoles || {})
            },
            outputs: (frontBackSource?.outputs || frontBackObj?.outputs || [])
        };
    }
    /* --- Normalize finishes order --- */
    var FINISH_ORDER = ['barniz', 'laminado', 'laminante', 'estampado', 'foil', 'embosado', 'troquelado', 'rebobinado', 'numerado'];
    if (Array.isArray(finishes)) {
        finishes.sort(function (a, b) {
            var ai = FINISH_ORDER.findIndex(function (f) { return a.toLowerCase().includes(f); });
            var bi = FINISH_ORDER.findIndex(function (f) { return b.toLowerCase().includes(f); });
            ai = ai >= 0 ? ai : FINISH_ORDER.length;
            bi = bi >= 0 ? bi : FINISH_ORDER.length;
            return ai - bi;
        });
    }
    /* --- end printing data block --- */

    statusBox.hidden = true;
    contentBox.hidden = false;
    document.title = `${order.order_code} | Orden de Producción`;
    try { renderPlanningControl(raw); } catch (e) { console.error('renderPlanningControl error:', e); }
    try { renderPlanningSnapshot(raw); } catch (e) { console.error('renderPlanningSnapshot error:', e); }
    try { renderDeliveries(lineRaw, quantity, scheduledDateRaw, quantityValue); } catch (e) { console.error('renderDeliveries error:', e); }
    try { renderArtwork(currentOrderAttachments.length ? currentOrderAttachments : attachments); } catch (e) { console.error('renderArtwork error:', e); }
    try { populateEditableForms(order); } catch (e) { console.error('populateEditableForms error:', e); }

    const customerRoute = customerId ? `/socios-documento.html?codigo=${encodeURIComponent(customerId)}` : '';
    const customerIdLink = customerId ? buildOrderDataLink(customerRoute, customerId, `Cliente ${customerId}`) : '';
    setOptionalHtml('orderCustomerSummaryText', [customerIdLink, escapeHtml(customerName || '')].filter(Boolean).join(' | '));
    const customerSummaryEl = document.getElementById('orderCustomerSummaryText');
    if (customerSummaryEl) customerSummaryEl.title = [customerId, customerName].filter(Boolean).join(' | ');

    const contactCol = document.getElementById('orderCustomerContactCol');
    try { renderCustomerContact(contactCol, { customerContact, customerPhone, customerEmail }); } catch (e) { console.error('renderCustomerContact error:', e); }
    var contactEditBtn = contactCol?.querySelector('.production-contact-edit-btn');
    if (contactEditBtn) renderIconButton(contactEditBtn, iconConfigFor('orderEdit', '✏️', '#64748b', 16));
    document.getElementById('orderClientInfoGrid').hidden = false;

    const sellerCol = document.getElementById('orderSellerCol');
    if (sellerName) {
        sellerCol.innerHTML = `<div class="production-client-info-line" title="${escapeHtml(sellerName)}"><span id="orderSellerIcon" class="production-client-info-icon"></span><span class="production-client-seller-name">${escapeHtml(sellerName)}</span></div>`;
        renderIconButton(document.getElementById('orderSellerIcon'), iconConfigFor(sellerIconKeyFor(sellerName), '👤', '#86a0b1', 14));
        sellerCol.hidden = false;
    } else {
        sellerCol.hidden = true;
    }

    document.getElementById('orderCustomerAddressRow').hidden = !customerAddress;
    const sourceQuoteCode = pickFirst(raw.source_quote_code, quote.quote_code);
    const sourceLineCode = pickFirst(raw.source_line_code, detail.lineCode);
    const motivosOrden = Array.isArray(order.motivos_detalle) ? order.motivos_detalle : [];
    const productoArteUnico = !showProductId && motivosOrden.length === 1 && motivosOrden[0]?.producto?.codigo ? motivosOrden[0].producto : null;
    const skuArribaLink = showProductId
        ? buildOrderDataLink(productRoute, productSkuVisible, `SKU ${productSkuVisible}`, true)
        : productoArteUnico
            ? buildOrderDataLink(`/producto-documento?codigo=${encodeURIComponent(productoArteUnico.codigo)}`, pickFirst(productoArteUnico.sku, productoArteUnico.codigo), `SKU ${pickFirst(productoArteUnico.sku, productoArteUnico.codigo)}`, true)
            : '';
    if (sourceQuoteButton) {
        const enlacesOrigen = [
            buildOrderDataLink(`/cotizaciones/documento?codigo=${encodeURIComponent(sourceQuoteCode)}`, sourceQuoteCode, `Cotización ${sourceQuoteCode}`, true),
            buildOrderDataLink(buildCalcRoute({ quoteCode: sourceQuoteCode, lineCode: sourceLineCode, productCode: localProductCode, department: pickFirst(line.department, detail.department, lineRaw['DEPARTAMENTO']) }), sourceLineCode, `Cálculo ${sourceLineCode}`, true),
            skuArribaLink
        ].filter(Boolean);
        sourceQuoteButton.innerHTML = enlacesOrigen.join('<span class="production-source-separator">/</span>');
        const sourceQuoteLabel = document.getElementById('orderSourceQuoteLabel');
        if (sourceQuoteLabel) {
            sourceQuoteLabel.textContent = skuArribaLink ? 'Cotización / Línea / SKU' : 'Cotización / Línea';
            sourceQuoteLabel.hidden = !enlacesOrigen.length;
        }
    }

    try { samplesSummary.innerHTML = buildSamplesSummary(lineRaw); } catch (e) { console.error('buildSamplesSummary error:', e); samplesSummary.innerHTML = ''; }

    var frontBackProductCards = document.getElementById('orderFrontBackProductCards');
    var frontBackLayout = document.getElementById('orderFrontBackLayout');
    var orderLayout = document.querySelector('#orderContent > .production-order-layout-refined');

    if (frontBackObj) {
        orderLayout?.classList.add('is-frontback-order');
        if (frontBackLayout) frontBackLayout.hidden = false;
        if (frontBackProductCards) frontBackProductCards.hidden = false;
        try { renderFrontBackLayout({ raw, frontBackObj, sourceQuoteCode, order }); } catch (e) { console.error('renderFrontBackLayout error:', e); }
        var artEditIconConf = iconConfigFor('orderEdit', '✏️', '#64748b', 16);
        document.querySelectorAll('.production-frontback-art-edit-btn').forEach(function (btn) { renderIconButton(btn, artEditIconConf); });
    } else {
        orderLayout?.classList.remove('is-frontback-order');
        if (frontBackLayout) {
            frontBackLayout.hidden = true;
            frontBackLayout.innerHTML = '';
        }
        if (frontBackProductCards) frontBackProductCards.hidden = true;
    }

    try { renderMotivosLayout(order); } catch (e) { console.error('renderMotivosLayout error:', e); }

    const printingAlert = document.getElementById('orderPrintingAlert');
    const printingGrid = document.getElementById('orderPrintingGrid');
    // La línea condensada Sustrato/Tintas/Máquina es redundante con la Ficha
    // Técnica de abajo (Máquina, Sustrato, Tintas, Barniz, ...): se oculta siempre.
    printingGrid.hidden = true;
    if (noPrint) {
        printingAlert.hidden = false;
        printingAlert.textContent = 'Sin Impresión';
    } else {
        printingAlert.hidden = true;
    }

    const rc = order;
    const machineName = printing ? printing.machineName : pickFirst(detail.quotedMachine, line.machine_name, order.machine_name);
    const machineSpeed = rc.velocidad_maquina_m_min;
    const machineSpeedText = machineSpeed ? ` (${formatNumber(machineSpeed, 1)} m/min)` : '';
    setText('orderMachineText', machineName + machineSpeedText, 'Sin máquina');

    const materialName = printing ? printing.materialName : pickFirst(detail.materialName, line.material_name, order.material_code);
    const substrateFeet = rc.pies_totales_sustrato;
    const substrateFeetText = substrateFeet ? ` (${formatMeters(substrateFeet)} m)` : '';
    setText('orderMaterialText', materialName + substrateFeetText, 'Sin sustrato');
    const jobNameDimensions = buildJobNameDimensions(detail);
    const jobNameDisplay = jobName ? (jobNameDimensions ? `${jobName} (${jobNameDimensions})` : jobName) : '';
    setOptionalText('orderJobNameText', jobNameDisplay);

    /* --- Fila: Nombre del Producto + Cantidad --- */
    var productRow = document.getElementById('orderProductRow');
    var productNameDisplay = document.getElementById('orderProductNameDisplay');
    var productQuantityDisplay = document.getElementById('orderProductQuantityDisplay');
    var jobNameTextNode = document.getElementById('orderJobNameText');
    if (productRow && productNameDisplay && productQuantityDisplay) {
        productNameDisplay.textContent = jobNameDisplay;
        productQuantityDisplay.textContent = parseNumber(quantity) || '';
        if (frontBackObj) {
            productRow.hidden = true;
            if (jobNameTextNode) jobNameTextNode.textContent = jobNameDisplay;
        } else {
            productRow.hidden = !jobNameDisplay;
            if (jobNameTextNode) jobNameTextNode.textContent = '';
        }
    }

    setText('orderRollCountText', rc.empaque_cantidad_rollos ? parseNumber(rc.empaque_cantidad_rollos) : '', 'Por definir');

    EMPAQUE_ADVERTENCIA_TEXTO = rc.empaque_advertencia || '';
    var empaqueAdvertenciaPill = document.getElementById('orderEmpaqueAdvertenciaPill');
    if (empaqueAdvertenciaPill) empaqueAdvertenciaPill.hidden = !EMPAQUE_ADVERTENCIA_TEXTO;

    // Ficha Técnica de Producción: toda la configuración cotizada de cada módulo
    // (máquina, sustrato, tintas, barniz, laminado, estampado, troquelado, rebobinado,
    // empaque) volcada inline en el documento, sin popovers. Ver renderFichaTecnica().
    try {
        renderFichaTecnica(rc, {
            machineName: machineName,
            materialName: materialName,
            dieCode: dieCode,
            outputType: outputType,
            pantoneList: pantoneList,
            pantoneCount: inkPantoneCount,
            tintCount: inkTintCount
        });
    } catch (e) { console.error('renderFichaTecnica error:', e); }

    try { relocateOrderModules(); } catch (e) { console.error('relocateOrderModules error:', e); }
    pintarArteEnMaquina();
    redistributeAcabadosFlex('orderAcabadosFlex');
    renderProcesosEnVivo(currentProcesosEnVivo);

    var procesosAdicionalesSection = document.getElementById('orderProcesosAdicionalesSection');
    var procesosAdicionalesList = document.getElementById('orderProcesosAdicionalesList');
    var procesosAdicionales = Array.isArray(order?.procesos_adicionales) ? order.procesos_adicionales : [];
    if (procesosAdicionalesSection && procesosAdicionalesList) {
        procesosAdicionalesSection.hidden = !procesosAdicionales.length;
        procesosAdicionalesList.innerHTML = procesosAdicionales.map(function (p) {
            return '<div class="production-summary-item production-summary-item-full">' +
                '<span class="production-summary-value">' + escapeHtml(p.descripcion || 'Sin descripción') + '</span>' +
                (p.comentario ? '<span class="production-notes-box production-notes-input" style="margin-top:4px;">' + escapeHtml(p.comentario) + '</span>' : '') +
            '</div>';
        }).join('');
    }

    var inkConfig;
    if (printing) {
        var configParts = [];
        if (inkTintCount > 0) configParts.push(inkTintCount + (inkPantoneCount > 0 ? ' (' + inkPantoneCount + ' pantones)' : '') + ' tintas');
        if (inkHasCmyk) configParts.push('CMYK');
        if (inkHasWhite) configParts.push('Blanco' + (inkHasDoubleWhite ? ' doble pasada' : ''));
        if (inkNames.length) configParts.push(inkNames.join(', '));
        inkConfig = configParts.length ? configParts.join(' · ') : 'Estándar';
    } else {
        inkConfig = buildInkConfig(detail, lineRaw);
    }
    setText('orderInkConfigText', inkConfig, 'Sin configuración');
    const inkConsumption = rc.consumo_tinta_total_kg;
    if (inkConsumption) {
        const inkText = document.getElementById('orderInkConfigText');
        if (inkText) inkText.textContent += ` (${formatNumber(inkConsumption, 2)} kg)`;
    }
    const pantonesRow = document.getElementById('orderPantonesRow');
    const hasPantones = pantoneList.length > 0 || inkPantoneCount > 0;
    if (pantonesRow) {
        pantonesRow.hidden = !hasPantones;
        setText('orderPantonesText', hasPantones ? parseNumber(inkPantoneCount) + ' pantones' : '', '');
    }
    pantonesPopoverBody.innerHTML = hasPantones
        ? `<div class="production-order-popover-summary"><strong>${escapeHtml(parseNumber(inkPantoneCount))} Pantones declarados</strong><span>${escapeHtml(pantoneList.length ? pantoneList.join(' / ') : 'Todavía no hay detalle de pantones cargado.')}</span></div>`
        : '<div class="attachments-empty">Esta orden no tiene pantones declarados.</div>';

    setText('orderCoreWidthText', printing ? parseNumber(printing.coreWidth) : parseNumber(detail.coreWidth), 'Sin dato');
    setText('orderCoreDiameterText', printing ? pickFirst(printing.coreDiameter) : pickFirst(detail.coreDiameter), 'Sin dato');
    setText('orderRollLabelsText', printing ? parseNumber(printing.labelsPerRoll) : parseNumber(detail.labelsPerRoll), 'Sin dato');
    var outputTypeMatch = getOutputTypeImage(outputType);
    var outputTypeDisplay = outputTypeMatch ? (outputTypeMatch.nombre || outputTypeMatch.name || outputType) : outputType;
    setOptionalText('orderOutputTypeText', outputTypeDisplay);
    renderOutputTypePreview(outputType);
    finishList.innerHTML = finishes.length
        ? finishes.map((item) => `<span class="production-chip">${escapeHtml(item)}</span>`).join('')
        : '<span class="production-chip production-chip-muted">Sin acabados adicionales</span>';
    document.getElementById('orderNumberingWrap').hidden = true; // Numerado retirado del documento
    setText('orderNumberingSummaryText', numberingValue, 'No definido');
    numberingPopoverBody.innerHTML = `
        <div class="production-order-popover-summary">
            <strong>${escapeHtml(pickFirst(numberingValue, 'Numerado no definido'))}</strong>
            <span>${escapeHtml(pickFirst(lineRaw['ACABADOS | OBSERVACIONES'], 'Sin observaciones para numerado.'))}</span>
            <span>Si necesitas cargar un archivo de datos, este numerado se conecta con los adjuntos de la orden.</span>
        </div>
    `;

    // Numerado (update popover with type)
    const numeradoType = rc.numerado_tipo || numberingValue;
    setText('orderNumberingSummaryText', numeradoType, 'No definido');
    numberingPopoverBody.innerHTML = `
        <div class="production-popover-section">
            <div class="production-popover-section-title">Numerado</div>
            ${popoverDetailRow('Tipo', numeradoType || 'No definido')}
            ${popoverDetailRow('Tiempo Montaje', formatNumber(rc.numerado_tiempo_montaje_min, 0), 'min')}
            ${popoverDetailRow('Costo Fijo', formatMoney(rc.numerado_costo_fijo))}
            ${popoverDetailRow('Comentario', rc.numerado_comentario)}
            ${popoverDetailRow('Adjunto', rc.numerado_adjunto)}
        </div>
    `;

    deliverySummary.innerHTML = buildDeliverySummary(lineRaw, quote);

    setText('orderCodeText', order.order_code, 'Sin orden');
    setText('orderQuoteText', sourceQuoteCode || 'Sin cotización');
    setText('orderLineText', sourceLineCode || 'Sin línea');
    setText('orderStateText', stateText, 'Pendiente');
    applyOrderState(document.getElementById('orderStateText'), stateText);
    renderDetencionBanner(order);
    if (activeMenuTab === 'estado') renderDetencionPanel();

    var groupPill = document.getElementById('orderGroupPill');
    if (groupPill) {
        groupPill.hidden = true;
    }
    setText('orderCreatedText', formatDate(order.created_at || raw.created_on, true), 'Sin Fecha');
    setText('orderPromisedDateText', formatDate(promisedDateRaw), 'Pendiente');
    applyScheduleState(document.getElementById('orderPromisedDateText'), promisedDateRaw);
    const scheduledDateText = document.getElementById('orderScheduledDateText');
    const productionEndDateInput = document.getElementById('orderProductionEndDateInput');
    if (productionEndDateInput) {
        productionEndDateInput.value = normalizeDateInputValue(productionEndDateRaw);
        productionEndDateInput.classList.toggle('is-alert', Boolean(raw.planning_control?.productionScheduleAlert));
    }
    // "Fecha Estimada" es la que calcula producción (Estimar, en Seguimiento) —
    // aquí es solo lectura, no se escribe a mano.
    if (scheduledDateText) {
        scheduledDateText.value = normalizeDateInputValue(scheduledDateRaw);
        scheduledDateText.readOnly = true;
        scheduledDateText.title = 'Se calcula desde el botón Estimar en Seguimiento.';
        applyScheduleState(scheduledDateText, scheduledDateRaw);
    }

    // "Fecha de Entrega" es la fecha que se le promete al cliente — se puede
    // editar aquí a mano hasta que el vendedor libera la orden; desde ahí queda fija
    // (solo la Fecha Estimada sigue cambiando).
    const scheduledDateInput = document.getElementById('orderScheduledDateInput');
    if (scheduledDateInput) {
        scheduledDateInput.value = normalizeDateInputValue(promisedDateRaw);
        applyScheduleState(scheduledDateInput, promisedDateRaw);
        const fechaEntregaBloqueada = order.fecha_entrega_bloqueada === true;
        scheduledDateInput.readOnly = fechaEntregaBloqueada;
        scheduledDateInput.title = fechaEntregaBloqueada
            ? 'La fecha de entrega queda fija desde que el vendedor liberó la orden.'
            : '';
    }

    // El resumen del arte siempre se refresca (por detrás), pero el formulario
    // SOLO se colapsa si el usuario no lo está editando: sobrescribir el bloque
    // abierto mientras escribe hacía "desaparecer" el arte y perdía lo escrito.
    if (artSummary && artForm && artToggleButton) {
        artSummary.innerHTML = buildSummaryLinesOptional([
            { label: 'Comentarios', value: pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']) },
            { label: 'Orden de Arte', value: pickFirst(lineRaw['ORDEN DE ARTE']) },
            { label: 'Arte en Poder de', value: pickFirst(lineRaw['ARTE EN PODER DE']) }
        ]);
        if (artForm.hidden) {
            artSummary.hidden = false;
            setToggleIcon(artToggleButton, false);
        }
    }

    const quoteCurrency = pickFirst(quote.currency, raw.currency, line.currency);
    const quoteQuantity = parseNumber(
        pickFirst(
            raw.totals?.quantity,
            detail.quantity,
            line.quantity,
            lineRaw['CANTIDAD TOTAL'],
            order.ordered_quantity
        )
    );
    const quoteUnitPrice = parseNumber(
        pickFirst(
            detail.unitPrice,
            detail.unit_price,
            line.unit_price,
            quote.unit_price
        ),
        quoteCurrency ? ` ${quoteCurrency}` : ''
    );
    const quoteThousandPrice = parseNumber(
        pickFirst(
            detail.thousandPrice,
            detail.thousand_price,
            line.thousand_price,
            quote.thousand_price
        ),
        quoteCurrency ? ` ${quoteCurrency}` : ''
    );
    const quoteTotal = parseNumber(
        pickFirst(
            raw.totals?.grandTotal,
            raw.totals?.total,
            detail.totalPrice,
            detail.total_price,
            line.total_price,
            quote.total_price
        ),
        quoteCurrency ? ` ${quoteCurrency}` : ''
    );
    sourceQuotePopoverBody.innerHTML = `
        <div class="production-order-popover-summary">
            <strong>${escapeHtml(pickFirst(raw.source_quote_code, quote.quote_code, 'Sin cotización'))} / ${escapeHtml(pickFirst(raw.source_line_code, detail.lineCode, line.line_code, 'Sin línea'))}</strong>
            <span>${escapeHtml(pickFirst(line.job_name, detail.jobName, 'Sin nombre de trabajo'))}</span>
            <span>Cliente: ${escapeHtml(pickFirst(raw.customer_name, quote.customer_name, 'Sin cliente'))}</span>
            <span>Moneda: ${escapeHtml(pickFirst(quoteCurrency, 'Sin moneda'))}</span>
            <span>Cantidad: ${escapeHtml(quoteQuantity || 'Sin cantidad')}</span>
            <span>Precio Unitario: ${escapeHtml(quoteUnitPrice || 'Sin precio unitario')}</span>
            <span>Precio Millar: ${escapeHtml(quoteThousandPrice || 'Sin precio millar')}</span>
            <span>Total: ${escapeHtml(quoteTotal || 'Sin total')}</span>
        </div>
    `;
    renderAttachmentsPopover(currentOrderAttachments.length ? currentOrderAttachments : attachments);
    updateArtworkSectionConstraint();
    loadSapConsumptionMaterials().catch((error) => {
        if (sapConsumptionStatus) sapConsumptionStatus.textContent = error.message;
    });
}

// Comparativa (menú del engranaje, antes "Procesos Productivos") — comparación lado a
// lado entre lo que se cotizó ("Cotizado") y lo que producción capturó realmente
// ("En Producción"). Mientras producción no capture un proceso, ese lado queda
// "Pendiente"; cuando sí hay datos se marca en rojo cada valor que difiere del cotizado.
function cmpProcessRow(label, value, flagged) {
    var v = (value === null || value === undefined || value === '') ? '—' : String(value);
    return '<div class="cmp-row"><span class="cmp-row-label">' + escapeHtml(label) +
        '</span><span class="cmp-row-val' + (flagged ? ' over' : '') + '">' + escapeHtml(v) + '</span></div>';
}

function cmpProcessBlock(title, cotizado, produccion) {
    var left = cotizado.map(function (r) { return cmpProcessRow(r[0], r[1]); }).join('') ||
        '<div class="production-summary-empty">Sin datos.</div>';
    var pill;
    var right;
    if (!produccion || !produccion.length) {
        right = '<div class="production-summary-empty">Pendiente de captura en producción.</div>';
        pill = '<span class="tl-pause-pill">Sin captura</span>';
    } else {
        var cot = {};
        cotizado.forEach(function (r) { cot[r[0]] = (r[1] === null || r[1] === undefined) ? '' : String(r[1]); });
        var anyDiff = false;
        right = produccion.map(function (r) {
            var val = (r[1] === null || r[1] === undefined) ? '' : String(r[1]);
            var diff = Object.prototype.hasOwnProperty.call(cot, r[0]) && val !== '' && val !== cot[r[0]];
            if (diff) anyDiff = true;
            return cmpProcessRow(r[0], r[1], diff);
        }).join('');
        pill = anyDiff
            ? '<span class="tl-pause-pill">Con diferencias</span>'
            : '<span class="tl-pause-pill" style="background:var(--green-light);color:var(--green);">Coincide</span>';
    }
    return '<div class="step-section">' +
        '<div class="cmp-step-header">' + escapeHtml(title) +
        '<span style="margin-left:auto;">' + pill + '</span></div>' +
        '<div class="cmp-grid">' +
        '<div class="cmp-col planned"><div class="cmp-col-title">Cotizado</div>' + left + '</div>' +
        '<div class="cmp-col real"><div class="cmp-col-title">En Producción</div>' + right + '</div>' +
        '</div></div>';
}

// Bloque "Impresión" de Procesos Productivos: dos columnas alineadas fila por
// fila (Cotizado | En Producción). Máquina y Sustrato arriba; luego, por cada
// tinta/estación de cada motivo, los mismos campos que la tabla de Tintas de la
// sección Motivos externa (Cobertura, BCM Anilox, Factor Transf., Densidad,
// Consumo, Tipo) frente a lo que producción capturó (Anilox, Viscosidad,
// Temperatura, Pantone) o "—" mientras no exista. Al ser las mismas filas en
// ambos lados, la comparación es directa.
function impresionComparisonBlock() {
    var rc = currentLoadedOrder || {};
    var printing = (rc.raw_data && rc.raw_data.printing) || {};
    function domText(id) {
        var el = document.getElementById(id);
        return el ? el.textContent.trim() : '';
    }
    var maquina = pickFirst(printing.machineName, rc.machine_name, domText('orderMachineText'));
    var sustrato = pickFirst(printing.materialName, rc.material_name, domText('orderMaterialText'));
    var motivos = Array.isArray(currentMotivosDetalle) ? currentMotivosDetalle : [];
    if (!maquina && !sustrato && !motivos.length) return '';

    var prodHas = rc.anilox_code_vigente || rc.viscosity_vigente != null || rc.temperature_vigente != null || rc.ink_type_vigente || rc.pantone_ref_vigente;

    // Filas alineadas: mismo índice = misma etiqueta en ambas columnas.
    var cot = [];
    var prod = [];
    function pair(label, cotV, prodV) { cot.push([label, cotV]); prod.push([label, prodV]); }
    function subhead(text) { cot.push(['SUBHEAD', text]); prod.push(['SUBHEAD', text]); }

    pair('Máquina', maquina, '');
    pair('Sustrato', sustrato, '');

    var stations = 0;
    motivos.forEach(function (m) {
        var tintas = Array.isArray(m.tintas) ? m.tintas : [];
        tintas.forEach(function (t) {
            var estN = (Number(t.estacion) || 0) + 1;
            var tipoLbl = (typeof MOTIVO_TINTA_TIPO_LABELS !== 'undefined' && MOTIVO_TINTA_TIPO_LABELS[t.tipo]) || t.tipo || '';
            var firstStation = stations === 0 && prodHas;
            stations++;
            subhead('Arte ' + ((Number(m.indice) || 0) + 1) + ' · Estación ' + estN +
                (tipoLbl ? ' · ' + tipoLbl : '') + (t.etiqueta ? ' · ' + escapeHtml(t.etiqueta) : ''));
            pair('Tipo de Tinta', tipoLbl, firstStation ? (rc.ink_type_vigente || '') : '');
            pair('Cobertura', t.coberturaPct != null ? formatNumber(t.coberturaPct, 0) + ' %' : '', '');
            pair('BCM Anilox', t.bcmAnilox != null ? formatNumber(t.bcmAnilox, 2) : '', firstStation ? (rc.anilox_code_vigente || '') : '');
            pair('Factor Transf.', t.factorTransferencia != null ? formatNumber(t.factorTransferencia, 2) : '', '');
            pair('Densidad', t.densidad != null ? formatNumber(t.densidad, 2) : '', '');
            pair('Consumo', t.consumoKg != null ? formatNumber(t.consumoKg, 4) + ' kg' : '', '');
            pair('Pantone', '', firstStation ? (rc.pantone_ref_vigente || '') : '');
            pair('Viscosidad', '', firstStation && rc.viscosity_vigente != null ? formatNumber(rc.viscosity_vigente, 2) : '');
            pair('Temperatura', '', firstStation && rc.temperature_vigente != null ? formatNumber(rc.temperature_vigente, 2) : '');
        });
    });

    if (!stations) {
        subhead('Tintas');
        pair('Cotización', 'Sin tintas configuradas', '');
        if (prodHas) {
            pair('Anilox', '', rc.anilox_code_vigente || '');
            pair('Tipo de Tinta', '', rc.ink_type_vigente || '');
            pair('Pantone', '', rc.pantone_ref_vigente || '');
            pair('Viscosidad', '', rc.viscosity_vigente != null ? formatNumber(rc.viscosity_vigente, 2) : '');
            pair('Temperatura', '', rc.temperature_vigente != null ? formatNumber(rc.temperature_vigente, 2) : '');
        } else {
            pair('Producción', '', 'Pendiente de captura');
        }
    }

    function renderCol(rows, other) {
        return rows.map(function (r, i) {
            if (r[0] === 'SUBHEAD') return '<div class="cmp-subhead">' + escapeHtml(r[1]) + '</div>';
            var v = (r[1] === '' || r[1] == null) ? '—' : String(r[1]);
            var o = other[i] ? ((other[i][1] === '' || other[i][1] == null) ? '' : String(other[i][1])) : '';
            var diff = o !== '' && v !== '—' && v !== o;
            return '<div class="cmp-row"><span class="cmp-row-label">' + escapeHtml(r[0]) +
                '</span><span class="cmp-row-val' + (diff ? ' over' : '') + '">' + escapeHtml(v) + '</span></div>';
        }).join('');
    }

    var pill = prodHas
        ? '<span class="tl-pause-pill">Con captura</span>'
        : '<span class="tl-pause-pill">Sin captura</span>';

    return '<div class="step-section">' +
        '<div class="cmp-step-header">Impresión<span style="margin-left:auto;">' + pill + '</span></div>' +
        '<div class="cmp-grid">' +
        '<div class="cmp-col planned"><div class="cmp-col-title">Cotizado</div>' + renderCol(cot, prod) + '</div>' +
        '<div class="cmp-col real"><div class="cmp-col-title">En Producción</div>' + renderCol(prod, cot) + '</div>' +
        '</div></div>';
}

// Tiempos y Merma por Fase (Montaje/Setup/Corrida/Limpieza de Impresión; Montaje/Tiraje de
// Rebobinado) — antes vivía repetido dentro del modal de Producción; ahora vive solo acá,
// comparando el minutaje cotizado contra el real capturado (columnas *_vigente).
function fmtMinComparativa(min) {
    var n = Number(min);
    if (!n || n <= 0) return '';
    var h = Math.floor(n / 60), m = Math.round(n % 60);
    return h > 0 ? (h + 'h ' + m + 'min') : (m + ' min');
}
function tiemposFaseComparisonBlock() {
    var rc = currentLoadedOrder || {};
    var blocks = [];
    // Impresión: Montaje / Setup / Corrida / Limpieza / Total.
    var impCot = [
        ['Montaje', fmtMinComparativa(rc.tiempo_montaje_min)],
        ['Setup', fmtMinComparativa(rc.tiempo_setup_min)],
        ['Corrida', fmtMinComparativa(rc.tiempo_corrida_min)],
        ['Limpieza', fmtMinComparativa(rc.tiempo_limpieza_min)],
        ['Total', fmtMinComparativa(rc.tiempo_total_impresion_min)]
    ].filter(function (r) { return r[1]; });
    var impProdHas = rc.tiempo_montaje_min_vigente != null || rc.tiempo_setup_min_vigente != null ||
        rc.tiempo_corrida_min_vigente != null || rc.tiempo_limpieza_min_vigente != null;
    var impProd = impProdHas ? [
        ['Montaje', fmtMinComparativa(rc.tiempo_montaje_min_vigente)],
        ['Setup', fmtMinComparativa(rc.tiempo_setup_min_vigente)],
        ['Corrida', fmtMinComparativa(rc.tiempo_corrida_min_vigente)],
        ['Limpieza', fmtMinComparativa(rc.tiempo_limpieza_min_vigente)],
        ['Total', fmtMinComparativa((Number(rc.tiempo_montaje_min_vigente) || 0) + (Number(rc.tiempo_setup_min_vigente) || 0) + (Number(rc.tiempo_corrida_min_vigente) || 0) + (Number(rc.tiempo_limpieza_min_vigente) || 0))]
    ].filter(function (r) { return r[1]; }) : null;
    if (impCot.length) blocks.push(cmpProcessBlock('Tiempos de Impresión', impCot, impProd));
    // Rebobinado: Montaje / Tiraje / Total.
    var reboMontajeCot = rc.rebobinado_tiempo_montaje_min;
    var reboTotalCot = rc.rebobinado_tiempo_total_min;
    var reboTirajeCot = (reboTotalCot != null && reboMontajeCot != null) ? (Number(reboTotalCot) - Number(reboMontajeCot)) : null;
    var reboCot = [
        ['Montaje', fmtMinComparativa(reboMontajeCot)],
        ['Tiraje', fmtMinComparativa(reboTirajeCot)],
        ['Total', fmtMinComparativa(reboTotalCot)]
    ].filter(function (r) { return r[1]; });
    var reboProdHas = rc.rebobinado_tiempo_montaje_min_vigente != null || rc.rebobinado_tiempo_tiraje_min_vigente != null;
    var reboProd = reboProdHas ? [
        ['Montaje', fmtMinComparativa(rc.rebobinado_tiempo_montaje_min_vigente)],
        ['Tiraje', fmtMinComparativa(rc.rebobinado_tiempo_tiraje_min_vigente)],
        ['Total', fmtMinComparativa(rc.rebobinado_tiempo_total_min_vigente)]
    ].filter(function (r) { return r[1]; }) : null;
    if (reboCot.length) blocks.push(cmpProcessBlock('Tiempos de Rebobinado', reboCot, reboProd));
    return blocks.join('');
}

function renderProcessesTabContent() {
    var rc = currentLoadedOrder;
    if (!rc) return '<div class="production-summary-empty">No hay datos disponibles.</div>';
    var blocks = [];
    var pctTxt = function (v) {
        var x = Number(v);
        return (Number.isFinite(x) && x > 0 && x < 100) ? formatNumber(x, 2) + ' %' : '';
    };

    // ── Sustrato: especificación y mermas, cotizado vs capturado en producción ──
    var sf = (rc.sustrato_ficha && typeof rc.sustrato_ficha === 'object') ? rc.sustrato_ficha : {};
    var susCot = [
        ['Calibre', sf.calibre_micras != null && Number(sf.calibre_micras) ? formatNumber(sf.calibre_micras, 1) + ' µm' : ''],
        ['Gramaje', sf.gramaje_g_m2 != null && Number(sf.gramaje_g_m2) ? formatNumber(sf.gramaje_g_m2, 1) + ' g/m²' : ''],
        ['Superficie', sf.tipo_superficie || ''],
        ['Aplicación', sf.ambiente_aplicacion || ''],
        ['Merma de Tiraje', pctTxt(rc.merma_tiraje_pct)],
        ['Merma de Sustrato', pctTxt(rc.merma_sustrato_pct_cotizada)],
        ['Merma de Tinta', pctTxt(rc.merma_tinta_pct_cotizada)]
    ].filter(function (r) { return r[1]; });
    var susProdHas = rc.sustrato_calibre_micras_vigente != null || rc.sustrato_cara_tratada_vigente ||
        rc.merma_tiraje_pct_vigente != null || rc.merma_tinta_pct_vigente != null || rc.sustrato_lote_vigente;
    var susProd = susProdHas ? [
        ['Calibre', rc.sustrato_calibre_micras_vigente != null ? formatNumber(rc.sustrato_calibre_micras_vigente, 1) + ' µm' : ''],
        ['Cara Tratada', rc.sustrato_cara_tratada_vigente || ''],
        ['Lote', rc.sustrato_lote_vigente || ''],
        ['Merma de Tiraje', pctTxt(rc.merma_tiraje_pct_vigente)],
        ['Merma de Tinta', pctTxt(rc.merma_tinta_pct_vigente)]
    ].filter(function (r) { return r[1]; }) : null;
    if (susCot.length) blocks.push(cmpProcessBlock('Sustrato', susCot, susProd));

    var impresion = impresionComparisonBlock();
    if (impresion) blocks.push(impresion);

    var tiemposFase = tiemposFaseComparisonBlock();
    if (tiemposFase) blocks.push(tiemposFase);

    if (rc.barniz_consumo_kg || rc.barniz_tipo) {
        var barCot = [
            ['Tipo', rc.barniz_tipo],
            ['Reservado', rc.barniz_zonificado ? 'Sí' : 'No'],
            ['Consumo', rc.barniz_consumo_kg != null ? formatNumber(rc.barniz_consumo_kg, 2) + ' kg' : ''],
            ['BCM Anilox', rc.barniz_bcm ? formatNumber(rc.barniz_bcm, 2) : ''],
            ['Cobertura', rc.barniz_cobertura_pct != null ? formatNumber(rc.barniz_cobertura_pct, 0) + ' %' : '']
        ];
        var barProdHas = rc.barniz_tipo_vigente || rc.barniz_zona_vigente || rc.barniz_zonif_vigente || rc.uv_power_vigente != null || rc.uv_temp_vigente != null;
        var barProd = barProdHas ? [
            ['Tipo', rc.barniz_tipo_vigente],
            ['Reservado', rc.barniz_zonif_vigente],
            ['Zona', rc.barniz_zona_vigente],
            ['Lámpara UV — Potencia', rc.uv_power_vigente != null ? formatNumber(rc.uv_power_vigente, 2) : ''],
            ['Lámpara UV — Temperatura', rc.uv_temp_vigente != null ? formatNumber(rc.uv_temp_vigente, 2) : '']
        ] : null;
        blocks.push(cmpProcessBlock('Barniz', barCot, barProd));
    }

    if (rc.laminado_metros_lineales || rc.laminado_tipo) {
        var lamProdHas = rc.laminado_film_tipo_vigente || rc.laminado_film_calibre_micras_vigente != null || rc.laminado_temp_rodillo_vigente != null;
        blocks.push(cmpProcessBlock('Laminado', [
            ['Material', pickFirst(rc.laminado_material_nombre, rc.laminado_material_id)],
            ['Tipo', rc.laminado_tipo],
            ['Metros Lineales', rc.laminado_metros_lineales != null ? formatNumber(rc.laminado_metros_lineales, 1) + ' m' : ''],
            ['Tiempo de Montaje', rc.laminado_tiempo_montaje_min != null ? formatNumber(rc.laminado_tiempo_montaje_min, 0) + ' min' : '']
        ], lamProdHas ? [
            ['Tipo de Film', rc.laminado_film_tipo_vigente || ''],
            ['Calibre de Film', rc.laminado_film_calibre_micras_vigente != null ? formatNumber(rc.laminado_film_calibre_micras_vigente, 1) + ' µm' : ''],
            ['Temperatura de Rodillo', rc.laminado_temp_rodillo_vigente != null ? formatNumber(rc.laminado_temp_rodillo_vigente, 1) : ''],
            ['Merma de Laminado', rc.merma_laminado_pct_vigente != null ? formatNumber(rc.merma_laminado_pct_vigente, 0) + ' %' : '']
        ] : null));
    }

    if (rc.troquelado_tiempo_montaje_min || rc.troquelado_merma_ajuste_metros) {
        blocks.push(cmpProcessBlock('Troquelado', [
            ['Tiempo de Montaje', rc.troquelado_tiempo_montaje_min != null ? formatNumber(rc.troquelado_tiempo_montaje_min, 0) + ' min' : ''],
            ['Merma de Ajuste', rc.troquelado_merma_ajuste_metros != null ? formatNumber(rc.troquelado_merma_ajuste_metros, 1) + ' m' : '']
        ], null));
    }

    if (rc.rebobinado_maquina) {
        var reboProdHas2 = rc.rebobinado_maquina_vigente || rc.rebobinado_velocidad_vigente != null || rc.rebobinado_num_rollos_producidos_vigente != null;
        blocks.push(cmpProcessBlock('Rebobinado', [
            ['Máquina', rc.rebobinado_maquina],
            ['Velocidad', rc.rebobinado_velocidad != null ? formatNumber(rc.rebobinado_velocidad, 1) + ' m/min' : '']
        ], reboProdHas2 ? [
            ['Máquina', rc.rebobinado_maquina_vigente || ''],
            ['Velocidad', rc.rebobinado_velocidad_vigente != null ? formatNumber(rc.rebobinado_velocidad_vigente, 1) + ' m/min' : ''],
            ['Rollos Completos Producidos', rc.rebobinado_num_rollos_producidos_vigente != null ? formatNumber(rc.rebobinado_num_rollos_producidos_vigente, 0) : ''],
            ['Etiquetas del Rollo Remanente', rc.rebobinado_etiquetas_rollo_remanente_vigente != null ? formatNumber(rc.rebobinado_etiquetas_rollo_remanente_vigente, 0) : '']
        ] : null));
    }

    if (rc.empaque_cantidad_rollos) {
        var empProdHas = rc.empaque_num_cajas_producidas_vigente != null || rc.empaque_operarios_vigente != null || rc.empaque_cantidad_final_vigente != null;
        blocks.push(cmpProcessBlock('Empaque', [
            ['Cantidad de Rollos', rc.empaque_cantidad_rollos != null ? formatNumber(rc.empaque_cantidad_rollos, 0) : ''],
            ['Cantidad de Cajas', rc.empaque_cantidad_cajas != null ? formatNumber(rc.empaque_cantidad_cajas, 0) : ''],
            ['Operarios', rc.empaque_operarios != null ? formatNumber(rc.empaque_operarios, 0) : ''],
            ['Rendimiento por Hora', rc.empaque_rendimiento_por_hora != null ? formatNumber(rc.empaque_rendimiento_por_hora, 0) : '']
        ], empProdHas ? [
            ['Cajas Utilizadas', rc.empaque_num_cajas_producidas_vigente != null ? formatNumber(rc.empaque_num_cajas_producidas_vigente, 0) : ''],
            ['Operarios', rc.empaque_operarios_vigente != null ? formatNumber(rc.empaque_operarios_vigente, 0) : ''],
            ['Cantidad Final Empacada', rc.empaque_cantidad_final_vigente != null ? formatNumber(rc.empaque_cantidad_final_vigente, 0) : ''],
            ['Faltante vs. Pedido', rc.empaque_faltante_vigente != null ? formatNumber(rc.empaque_faltante_vigente, 0) : '']
        ] : null));
    }

    if (!blocks.length) {
        return '<div class="production-summary-empty">Esta orden no tiene procesos productivos configurados.</div>';
    }
    return blocks.join('');
}

function renderCreationSummary(data) {
    if (!data || typeof data !== 'object') return '';
    function val(v) {
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '';
        if (typeof v === 'object') return '';
        return String(v);
    }
    function row(key, v) {
        var s = val(v);
        if (!s) return '';
        return '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(key) + ':</span><span class="production-creation-summary-value">' + escapeHtml(s) + '</span></div>';
    }
    function section(title) {
        return '<div class="production-creation-summary-section">' + escapeHtml(title) + '</div>';
    }
    function subsec(title) {
        return '<div class="production-creation-summary-subsection">' + escapeHtml(title) + '</div>';
    }
    var html = '';
    html += section('General');
    html += row('Orden', data.orden);
    html += row('Cotización', data.cotizacion);
    html += row('Línea', data.linea);
    html += row('Cliente', data.cliente);
    html += row('Código Cliente', data.codigo_cliente);
    html += row('Contacto', data.contacto?.nombre);
    html += row('Email', data.contacto?.email);
    html += row('Teléfono', data.contacto?.telefono);
    html += row('Vendedor', data.vendedor);
    html += row('Producto', data.producto);
    html += row('Código Producto', data.codigo_producto);
    html += row('Nombre Trabajo', data.nombre_trabajo);
    html += row('Departamento', data.departamento);
    html += row('Tipo Proceso', data.tipo_proceso);
    html += row('Tipo Orden', data.tipo_orden);
    html += row('Estado Línea', data.estado_linea);
    html += row('Tipo Cálculo', data.tipo_calculo);
    html += row('Estado Cotización', data.estado_cotizacion);
    html += row('Fecha Creación', data.fecha_creacion);
    html += row('Fecha Vencimiento', data.fecha_vencimiento);
    html += row('Condiciones Pago', data.condiciones_pago);
    html += row('Tiempo Entrega', data.tiempo_entrega);
    html += row('Tipo Cambio Venta', data.tipo_cambio_venta);
    html += row('Tipo Cambio Compra', data.tipo_cambio_compra);
    html += row('Moneda', data.moneda);
    html += row('Método Envío', data.metodo_envio);
    html += row('Tipo Etiquetado', data.tipo_etiquetado);
    html += row('Es Frente/Dorso', data.es_frente_dorso);
    html += row('Finalizado para Orden', data.finalizado_para_orden);
    html += row('Cantidad', data.cantidad);
    html += row('Cantidad Productos', data.cantidad_productos);
    html += row('Cantidad Tipos', data.cantidad_tipos);
    html += row('Cambios por Tipos', data.cantidad_cambios_por_tipos);
    html += row('Cambios Adicionales', data.cantidad_cambios_adicionales);
    html += row('Cambios Totales', data.cantidad_cambios_totales);

    html += section('Dimensiones');
    html += row('Ancho (pulgadas)', data.dimensiones?.ancho_pulgadas);
    html += row('Largo (pulgadas)', data.dimensiones?.largo_pulgadas);
    html += row('Área (pulgadas)', data.dimensiones?.area_pulgadas);
    html += row('Área (m2)', data.dimensiones?.area_m2);

    html += section('Material');
    html += row('Código', data.material?.codigo);
    html += row('Nombre', data.material?.nombre);
    html += row('Ancho', data.material?.ancho);
    html += row('m2', data.material?.m2);
    html += row('MSI', data.material?.msi);
    html += row('Metros Totales', data.material?.pies_totales ? formatMeters(data.material.pies_totales, 1) : '');
    html += row('Metros Mácula', data.material?.pies_macula ? formatMeters(data.material.pies_macula, 1) : '');
    html += row('Tipo Aplicación', data.material?.tipo_aplicacion);

    html += section('Producción');
    html += row('Máquina', data.maquina);
    html += row('Sustrato', data.sustrato);

    html += section('Impresión');
    html += row('Tintas', data.impresion?.tintas);
    html += row('Pantones', data.impresion?.pantones);
    html += row('Cantidad Pantones', data.impresion?.cantidad_pantones);
    html += row('CMYK', data.impresion?.cmyk);
    html += row('Tinta Blanca', data.impresion?.tinta_blanca);
    html += row('Doble Blanca', data.impresion?.doble_blanca);
    html += row('Nombres Tintas', data.impresion?.nombres_tintas);
    html += row('IDs Material Tintas', data.impresion?.ids_material_tintas);

    html += section('Troquel');
    html += row('Código', data.troquel?.codigo);
    html += row('Dientes', data.troquel?.dientes);
    html += row('Filas', data.troquel?.filas);
    html += row('Repeticiones', data.troquel?.repeticiones);

    html += section('Acabados');
    if (Array.isArray(data.acabados) && data.acabados.length) {
        data.acabados.forEach(function (a) {
            html += row(a.tipo, a.detalle || '—');
        });
    } else {
        html += row('Acabados', 'Sin acabados');
    }
    html += row('Numerado', data.numerado);

    html += section('Rollo');
    html += row('Ancho de Core', data.rollo?.ancho_core);
    html += row('Diámetro de Core', data.rollo?.diametro_core);
    html += row('Etiquetas por Rollo', data.rollo?.etiquetas_por_rollo);
    html += row('Tipo de Salida', data.rollo?.tipo_salida);

    if (data.metricas) {
        html += section('Métricas de Producción');
        html += row('Pasos por Línea', data.metricas.pasos_por_linea);
        html += row('Filas', data.metricas.filas);
        html += row('Largo Total (pulgadas)', data.metricas.largo_total_pulgadas);
        html += row('Metros Lineales', data.metricas.pies_lineales ? formatMeters(data.metricas.pies_lineales, 1) : '');
        html += row('Metros Lineales con Merma', data.metricas.pies_lineales_con_merma ? formatMeters(data.metricas.pies_lineales_con_merma, 1) : '');
        html += row('MSI Base', data.metricas.msi_base);
        html += row('MSI con Merma', data.metricas.msi_con_merma);
        html += row('Área (m²)', data.metricas.area_m2);
        html += row('Peso (kg)', data.metricas.peso_kg);
        html += row('Minutos de Tiraje', data.metricas.minutos_tiraje);
        html += row('Tintas Efectivas', data.metricas.tintas_efectivas);
    }

    html += section('Costos');
    html += subsec('Desglose');
    html += row('Material', data.costos?.desglose?.material);
    html += row('Tintas', data.costos?.desglose?.tintas);
    html += row('Impresión', data.costos?.desglose?.impresion);
    html += row('Preprensa', data.costos?.desglose?.preprensa);
    html += row('Acabados', data.costos?.desglose?.acabados);
    html += row('Empaque', data.costos?.desglose?.empaque);
    html += row('Tiraje', data.costos?.desglose?.tiraje);
    html += subsec('Totales');
    html += row('Subtotal Costos', data.costos?.subtotal_costos);
    html += row('Subtotal Financiero', data.costos?.subtotal_financiero);
    html += row('Subtotal Rendimiento', data.costos?.subtotal_rendimiento);
    html += row('Costo Mínimo', data.costos?.costo_minimo);
    html += row('% Imprevistos', data.costos?.porcentaje_imprevistos);
    html += row('% Financiero', data.costos?.porcentaje_financiero);
    html += row('% Adicional', data.costos?.porcentaje_adicional);
    html += row('Costo Total', data.costos?.costo_total);
    html += row('Metros Totales', data.costos?.pies_totales ? formatMeters(data.costos.pies_totales, 1) : '');

    html += section('Precios');
    html += row('Subtotal antes de IVA', data.precios?.subtotal_antes_iva);
    html += row('Impuesto', data.precios?.impuesto);
    html += row('Total Final', data.precios?.total_final);
    html += row('Precio Unitario', data.precios?.precio_unitario);
    html += row('Precio Millar', data.precios?.precio_millar);
    html += row('Total Colones', data.precios?.total_colones);
    html += row('Tipo de Cambio', data.precios?.tipo_cambio);
    html += row('% IVA', data.precios?.porcentaje_iva);
    html += row('Cyrel', data.precios?.cyrel);

    if (data.frente_dorso) {
        html += section('Frente / Dorso');
        html += row('Modo', data.frente_dorso.modo);
        html += row('Etiqueta', data.frente_dorso.etiqueta);
        html += row('Línea Comercial', data.frente_dorso.linea_comercial);
        html += row('Líneas Miembro', data.frente_dorso.lineas_miembro);
        html += row('Líneas Elemento', data.frente_dorso.lineas_elemento);
        html += row('Línea Frente', data.frente_dorso.linea_frente);
        html += row('Línea Dorso', data.frente_dorso.linea_dorso);
        if (Array.isArray(data.frente_dorso.salidas) && data.frente_dorso.salidas.length) {
            html += subsec('Salidas');
            data.frente_dorso.salidas.forEach(function (s) {
                var parts = [];
                parts.push('Cant: ' + (s.cantidad || 0));
                parts.push('Metros: ' + formatMeters(s.pies || 0, 1));
                if (s.msi) parts.push('MSI: ' + s.msi);
                if (s.area_m2) parts.push('m²: ' + s.area_m2);
                html += row('Línea ' + (s.linea || ''), parts.join(', '));
            });
        }
    }

    if (Array.isArray(data.motivos) && data.motivos.length) {
        html += section('Artes');
        data.motivos.forEach(function (m) {
            var parts = [];
            parts.push('Cant: ' + (m.cantidad || 0));
            parts.push('Tintas: ' + (m.tintas || 0));
            if (m.blanca) parts.push('Blanca: ' + m.blanca);
            if (m.pantones) parts.push('Pantones: ' + m.pantones);
            parts.push('Sellos: ' + (m.sellos || 0));
            if (m.producto_codigo) parts.push('Producto: ' + m.producto_codigo);
            parts.push(m.sku ? ('SKU: ' + m.sku) : 'SKU: pendiente');
            html += row(m.nombre || '', parts.join(', '));
        });
    }

    html += section('Notas');
    html += row('Resumen Cotización', data.notas?.resumen_cotizacion);
    html += row('Info Impresión', data.notas?.info_impresion);
    html += row('Observaciones', data.notas?.observaciones);
    html += row('Estado Creación', data.notas?.estado_creacion);
    html += row('Análisis Solicitud', data.notas?.analisis_solicitud);
    html += row('Análisis Finalizar', data.notas?.analisis_finalizar);
    html += row('Análisis Crear Orden', data.notas?.analisis_crear_orden);

    return html;
}

function renderRawSourceData(raw) {
    if (!raw || typeof raw !== 'object') return '';

    var EXCLUDED = new Set([
        'resumen_creacion', 'Estado_UI', 'Datos_Cotizados',
        'Secuencia_Procesos', 'quote_snapshot', 'line_snapshot',
        'front_back_group', 'grupo_frente_dorso', 'production_run',
        'related_lines', 'traceability', 'printing', 'Mensajes_Validacion',
        'Texto_Secuencia_Procesos', 'Validacion_Bloqueada', 'Cierre_Cotizacion'
    ]);

    var LABELS = {
        'ID COTIZACION': 'ID Cotización',
        'ID LINEA': 'ID Línea',
        'ID CLIENTE': 'ID Cliente',
        'VENDEDOR': 'Vendedor',
        'DEPARTAMENTO': 'Departamento',
        'NOMBRE TRABAJO': 'Nombre Trabajo',
        'CODIGO PRODUCTO': 'Código Producto',
        'TIPO ORDEN': 'Tipo Orden',
        'Proceso Productivo': 'Proceso Productivo',
        'GENERAL | MATERIAL': 'Material',
        'Material Convencional | Id Material': 'Material Convencional ID',
        'Material Digital | Id Material': 'Material Digital ID',
        'Material | Tipo Según Proceso Productivo': 'Tipo Material',
        'CONV | MAQUINA': 'Máquina Convencional',
        'DIGITAL | MAQUINA': 'Máquina Digital',
        'GENERAL | TROQUEL | ID': 'Troquel ID',
        'GENERAL | CMYK': 'CMYK',
        'CMYK': 'CMYK',
        'CANTIDAD TINTAS': 'Cantidad Tintas',
        'CANTIDAD TIPOS': 'Cantidad Tipos',
        'CANTIDAD CAMBIOS': 'Cambios Totales',
        'CANTIDAD CAMBIOS ADICIONALES': 'Cambios Adicionales',
        'CANTIDAD CAMBIOS POR TIPOS': 'Cambios por Tipos',
        'CANTIDAD CAMBIOS TOTALES': 'Cambios Totales',
        'CANTIDAD PRODUCTOS': 'Cantidad Productos',
        'Cantidad Productos': 'Cantidad Productos',
        'DIMENSIONES ETIQUETA | ANCHO': 'Ancho Etiqueta (in)',
        'DIMENSIONES ETIQUETA | LARGO': 'Largo Etiqueta (in)',
        'ANCHO ROLLO': 'Ancho Rollo (in)',
        'SEP HORIZONTAL': 'Separación Horizontal (in)',
        'SEP VERTICAL': 'Separación Vertical (in)',
        'TIPO ETIQUETADO': 'Tipo Etiquetado',
        'AMBIENTE APLICACION': 'Ambiente Aplicación',
        'TIPO SUPERFICIE': 'Tipo Superficie',
        'TIPO SALIDA': 'Tipo Salida',
        'ANCHO CORE': 'Ancho Core (mm)',
        'DIAMETRO CORE': 'Diámetro Core',
        'CANTIDAD ETIQUETAS X ROLLO': 'Etiquetas x Rollo',
        'CONV | PERFIL TINTA | TIPO': 'Perfil Tinta Tipo',
        'CONV | PERFIL TINTA | BCM ANILOX': 'BCM Anilox',
        'CONV | PERFIL TINTA | COBERTURA %': 'Cobertura Tinta %',
        'CONV | PERFIL TINTA | GSM': 'GSM Tinta',
        'CONV | BARNIZ | ACTIVO': 'Barniz Activo',
        'CONV | BARNIZ | ZONIFICADO': 'Barniz Reservado',
        'CONV | BARNIZ | BCM ANILOX': 'Barniz BCM',
        'CONV | BARNIZ | COBERTURA %': 'Barniz Cobertura %',
        'CONV | BARNIZ | GSM': 'Barniz GSM',
        'SOLICITUD ESTADO': 'Estado Solicitud',
        'ESTADO LINEA': 'Estado Línea',
        'Finalizado_Para_Orden': 'Finalizado Para Orden',
        'GENERAL | 5 | SUBTOTAL': 'Subtotal Costos',
        'GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL': 'Subtotal Antes IVA USD',
        'GENERAL | 8 | PORCENTAJE IVA': '% IVA',
        'GENERAL | 9 | Impuestos': 'Impuestos USD',
        'GENERAL | 7 | TOTAL | DOL': 'Total USD',
        'GENERAL | 9 | TOTAL | DOL': 'Total Final USD',
        'GENERAL | 9 | UNITARIO | DOL': 'Unitario USD',
        'GENERAL | 7 | TOTAL | COL': 'Total Colones',
        'GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS': 'Total Colones Ventas',
        'GENERAL | 9 | UNITARIO | COL': 'Unitario Colones',
        'PRECIO TOTAL AL FINALIZAR': 'Precio Total Final',
        'TIPO CAMBIO': 'Tipo Cambio',
        'TIPO CAMBIO VENTA': 'Tipo Cambio Venta',
        'TIPO CAMBIO COMPRA': 'Tipo Cambio Compra'
    };

    function prettyKey(k) { return LABELS[k] || k; }

    function prettyVal(v) {
        if (v === null || v === undefined || v === '') return '—';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
        if (typeof v === 'object') return JSON.stringify(v, null, 1).replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;');
        return String(v);
    }

    var entries = [];
    var seen = new Set();
    Object.keys(raw).forEach(function (k) {
        if (EXCLUDED.has(k)) return;
        var v = raw[k];
        if (v === null || v === undefined || v === '') return;
        if (typeof v === 'object' && !Array.isArray(v)) return;
        var label = prettyKey(k);
        if (seen.has(label)) return;
        seen.add(label);
        entries.push({ key: k, label: label, value: prettyVal(v) });
    });
    entries.sort(function (a, b) { return a.label.localeCompare(b.label); });

    if (!entries.length) return '';

    var html = '<div class="production-raw-origin">';
    html += '<div class="production-raw-origin-header" onclick="this.parentElement.classList.toggle(\'is-open\')">';
    html += '<span class="production-raw-origin-toggle">▶</span> ';
    html += 'Datos de Origen del Cálculo';
    html += '<span class="production-raw-origin-count">(' + entries.length + ' campos)</span>';
    html += '</div>';
    html += '<div class="production-raw-origin-body">';
    entries.forEach(function (e) {
        html += '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(e.label) + '</span><span class="production-creation-summary-value">' + e.value + '</span></div>';
    });
    html += '</div></div>';
    return html;
}

async function loadOrder() {
    const orderCode = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    currentOrderCode = orderCode;
    const [orderResponse, configResponse, catalogsResponse, usersResponse, liveResponse] = await Promise.all([
        fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}`, { headers: (typeof sessionHeaderSafe === 'function' ? sessionHeaderSafe() : {}) }),
        fetch('/api/config/shell'),
        fetch('/api/catalogs?scope=output-types'),
        fetch('/api/admin-users').catch(() => null),
        fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}/procesos-en-vivo`).catch(() => null)
    ]);
    try {
        const liveData = liveResponse && liveResponse.ok ? await liveResponse.json() : null;
        currentProcesosEnVivo = Array.isArray(liveData?.procesos) ? liveData.procesos : [];
    } catch (error) { currentProcesosEnVivo = []; }
    const payload = await orderResponse.json();
    const config = configResponse.ok ? await configResponse.json() : {};
    const catalogs = catalogsResponse.ok ? await catalogsResponse.json() : {};
    try {
        const users = usersResponse && usersResponse.ok ? await usersResponse.json() : [];
        buildSellerGeneroMap(users);
    } catch (error) { /* género de vendedor es opcional, no bloquea la carga */ }

    currentOutputTypes = Array.isArray(catalogs.outputTypes) ? catalogs.outputTypes : [];
    applyHeaderConfig(config);
    if (!orderResponse.ok) throw new Error(payload.error || 'No se pudo cargar la orden.');
    currentConfig = config;

    currentLoadedOrder = payload.orden;
    try {
        await refreshOrderAttachments();
    } catch (error) {
        currentOrderAttachments = extractAttachments(currentLoadedOrder?.raw_data || {});
    }
    populateDeliverySelects(config);
    renderOrder(currentLoadedOrder);
    publishBdfgContext();
    if (menuNavProcesos) menuNavProcesos.hidden = false;
    if (menuNavEstado) menuNavEstado.hidden = false;
    if (menuNavCreacion) menuNavCreacion.hidden = !hasAdminToolsAccess();
    const printBtn = document.getElementById('orderPrintButton');
    if (printBtn) renderIconButton(printBtn, iconConfigFor('orderPrint', '\uD83D\uDDA8\uFE0F'));
    const pdfBtn = document.getElementById('orderPdfButton');
    if (pdfBtn) renderIconButton(pdfBtn, iconConfigFor('orderPdf', '\uD83D\uDCC4'));
    const tieneAccesoCalidad = window.ErpAccess?.canViewModule ? window.ErpAccess.canViewModule('calidad') : true;
    const cartillaBtn = document.getElementById('orderQualityCartillaButton');
    if (cartillaBtn) {
        renderIconButton(cartillaBtn, iconConfigFor('orderQualityCartilla', '\u25C9'));
        cartillaBtn.hidden = !tieneAccesoCalidad;
    }
    const fichaBtn = document.getElementById('orderQualityFichaButton');
    if (fichaBtn) {
        renderIconButton(fichaBtn, iconConfigFor('orderQualityFichaTecnica', '\u2637'));
        fichaBtn.hidden = !tieneAccesoCalidad;
    }
    const certificadoBtn = document.getElementById('orderQualityCertificadoButton');
    if (certificadoBtn) {
        renderIconButton(certificadoBtn, iconConfigFor('orderQualityCertificado', '\u2713'));
        certificadoBtn.hidden = !tieneAccesoCalidad;
    }

    const raw = currentLoadedOrder.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
    const partnerCode = pickFirst(raw.customer_code, quote.customer_code);
    if (partnerCode) {
        loadClientContacts(partnerCode).then(populateSamplesContactDropdown).catch(function () {});
        loadClientAddresses(partnerCode).then(populateOrderAddressPickers).catch(function () {});
    }
    refreshOrderAddressCatalogs();
}

function repopulateSamplesContactDropdown() {
    if (!cachedClientContacts.length) return;
    const currentValB = samplesContactInput?.value;
    const options = cachedClientContacts.map(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    if (samplesContactInput) {
        samplesContactInput.innerHTML = '<option value=""></option>' + options;
        if (currentValB) samplesContactInput.value = currentValB;
    }
}

samplesToggleButton?.addEventListener('click', () => {
    const opening = samplesForm.hidden;
    toggleSection(samplesSummary, samplesForm, samplesToggleButton, opening);
    // Mismo comportamiento que Información de Arte: se abren/cierran juntas.
    if (artForm && artForm.hidden === opening) toggleSection(artSummary, artForm, artToggleButton, opening);
    if (opening) {
        populateDeliverySelects(currentConfig);
        repopulateSamplesContactDropdown();
        refreshOrderAddressCatalogs();
        if (cachedClientAddresses.length) populateOrderAddressPickers(cachedClientAddresses);
    }
});
samplesForm?.addEventListener('submit', (event) => event.preventDefault());
samplesContactInput?.addEventListener('change', () => fillSamplesContactFields(samplesContactInput.value));
deliveryToggleButton?.addEventListener('click', () => {
    const opening = deliveryForm.hidden;
    toggleSection(deliverySummary, deliveryForm, deliveryToggleButton, opening);
    if (opening) {
        populateDeliverySelects(currentConfig);
        if (cachedClientContacts.length && deliveryContactInput) {
            const currentVal = deliveryContactInput.value;
            const options = cachedClientContacts.map(c => {
                const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
                return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
            }).join('');
            deliveryContactInput.innerHTML = '<option value=""></option>' + options;
            if (currentVal) deliveryContactInput.value = currentVal;
        }
        refreshOrderAddressCatalogs();
        if (cachedClientAddresses.length) populateOrderAddressPickers(cachedClientAddresses);
    }
});
deliveryForm?.addEventListener('submit', (event) => event.preventDefault());
deliveryContactInput?.addEventListener('change', () => fillDeliveryContactFields(deliveryContactInput.value));

// Bloque de dirección estructurada: selector de dirección guardada + cascada por país.
// La cascada (n1 → n2 → n3) la maneja direccion-pais.js; aquí solo escuchamos
// el evento "direccion-cambio" para guardar, y "pick" para traer la dirección elegida.
[['vb', samplesForm, queueSamplesSave], ['entrega', deliveryForm, queueDeliverySave]].forEach(([prefix, form, queueSave]) => {
    form?.addEventListener('change', (event) => {
        const target = event.target;
        if (!target || !target.dataset || !target.closest(`[data-order-address-block="${prefix}"]`)) return;
        if (target.dataset.addressField === 'pick') {
            const addr = cachedClientAddresses.find((a) => String(a.id) === String(target.value));
            if (addr) setOrderAddressBlock(prefix, addr);
            queueSave();
        } else if (target.dataset.addressField) {
            queueSave();
        }
    });
    const bloque = orderDireccionBloque(prefix);
    const contenedor = orderAddressBlock(prefix);
    contenedor?.addEventListener('direccion-cambio', () => queueSave());
    contenedor?.addEventListener('input', (event) => {
        if (event.target?.dataset?.addressField) queueSave();
    });
    if (bloque) bloque.colocar({});
});
// Al expandir/contraer Información de Arte, Muestras y Aprobaciones se expande/contrae con
// ella para que las dos columnas crezcan parejas y no queden huecos en blanco.
artToggleButton?.addEventListener('click', () => {
    const abriendo = artForm.hidden;
    toggleSection(artSummary, artForm, artToggleButton, abriendo);
    if (samplesToggleButton && samplesForm && samplesForm.hidden === abriendo) samplesToggleButton.click();
});
artForm?.addEventListener('submit', (event) => event.preventDefault());
document.addEventListener('click', function (e) {
    var editBtn = e.target.closest('.production-frontback-art-edit-btn');
    if (editBtn) {
        var section = editBtn.closest('.production-frontback-art-section');
        if (!section) return;
        var display = section.querySelector('.production-frontback-art-display');
        var form = section.querySelector('.production-frontback-art-edit-form');
        if (display) display.hidden = true;
        if (form) form.hidden = false;
        return;
    }
    var cancelBtn = e.target.closest('.production-frontback-art-cancel-btn');
    if (cancelBtn) {
        var section = cancelBtn.closest('.production-frontback-art-section');
        if (!section) return;
        var display = section.querySelector('.production-frontback-art-display');
        var form = section.querySelector('.production-frontback-art-edit-form');
        if (display) display.hidden = false;
        if (form) form.hidden = true;
    }
});
sapConsumptionProcess?.addEventListener('change', () => {
    loadSapConsumptionMaterials().catch((error) => {
        if (sapConsumptionStatus) sapConsumptionStatus.textContent = error.message;
    });
});
sapConsumptionForm?.addEventListener('submit', (event) => {
    submitSapConsumption(event).catch((error) => {
        if (sapConsumptionStatus) sapConsumptionStatus.textContent = error.message;
    });
});

let samplesSaveTimer = null;
let deliverySaveTimer = null;
let artSaveTimer = null;

function collectDeliveryScheduleRows() {
    const rows = [];
    let invalid = false;
    deliveriesBody?.querySelectorAll('tr[data-delivery-row]').forEach((row) => {
        const quantityInput = row.querySelector('[data-delivery-field="quantity"]');
        const dateInput = row.querySelector('[data-delivery-field="date"]');
        const quantity = String(quantityInput?.value || '').trim();
        const date = String(dateInput?.value || '').trim();
        quantityInput?.classList.remove('is-invalid');
        dateInput?.classList.remove('is-invalid');
        if (!quantity && !date) return;
        if (!quantity || !date) {
            invalid = true;
            if (!quantity) quantityInput?.classList.add('is-invalid');
            if (!date) dateInput?.classList.add('is-invalid');
            return;
        }
        rows.push({ quantity, date });
    });
    return { rows, invalid };
}

function queueSamplesSave() {
    clearTimeout(samplesSaveTimer);
    samplesSaveTimer = setTimeout(() => {
        saveOrderDetails({
            samples: {
                mode: samplesModeInput.value,
                approval: samplesApprovalInput.value,
                contact: samplesContactInput.value,
                phone: samplesPhoneInput.value,
                email: samplesEmailInput.value,
                address: collectOrderAddress('vb'),
                detail: samplesDetailInput.value
            }
        }).catch((error) => {
            statusBox.hidden = false;
            statusBox.textContent = error.message;
        });
    }, 250);
}

function queueDeliverySave() {
    clearTimeout(deliverySaveTimer);
    deliverySaveTimer = setTimeout(() => {
        const schedule = collectDeliveryScheduleRows();
        if (schedule.invalid) {
            if (deliveriesMessage) {
                deliveriesMessage.textContent = 'Cada entrega debe tener cantidad y fecha.';
                deliveriesMessage.hidden = false;
            }
        } else {
            if (deliveriesMessage) deliveriesMessage.hidden = true;
        }
        saveOrderDetails({
            delivery: {
                mode: deliveryModeInput.value,
                contact: deliveryContactInput.value,
                phone: deliveryPhoneInput.value,
                email: deliveryEmailInput.value,
                address: collectOrderAddress('entrega'),
                detail: deliveryDetailInput.value,
                schedule: schedule.invalid ? [] : schedule.rows
            }
        }).catch((error) => {
            statusBox.hidden = false;
            statusBox.textContent = error.message;
        });
    }, 250);
}

function queueArtSave() {
    clearTimeout(artSaveTimer);
    artSaveTimer = setTimeout(() => {
        saveOrderDetails({
            art: {
                comments: sellerCommentsInput.value,
                artworkHolder: artworkHolderInput.value
            }
        }).catch((error) => {
            statusBox.hidden = false;
            statusBox.textContent = error.message;
        });
    }, 250);
}

function queueNotesSave() {
    clearTimeout(artSaveTimer);
    artSaveTimer = setTimeout(() => {
        saveOrderDetails({ notes: { finishNotes: finishNotesInput.value } }).catch((error) => {
            statusBox.hidden = false;
            statusBox.textContent = error.message;
        });
    }, 250);
}

[samplesModeInput, samplesApprovalInput, samplesContactInput, samplesPhoneInput, samplesEmailInput, samplesDetailInput]
    .forEach((field) => {
        field?.addEventListener('input', queueSamplesSave);
        field?.addEventListener('change', queueSamplesSave);
    });
[deliveryModeInput, deliveryContactInput, deliveryPhoneInput, deliveryEmailInput, deliveryDetailInput]
    .forEach((field) => {
        field?.addEventListener('input', queueDeliverySave);
        field?.addEventListener('change', queueDeliverySave);
    });
deliveriesBody?.addEventListener('change', (event) => {
    if (event.target?.matches?.('[data-delivery-field]')) queueDeliverySave();
});
window.addEventListener('resize', () => {
    document.querySelectorAll('.production-header-tab-popover').forEach((popover) => {
        if (!popover.hidden) positionHeaderTabPopover(popover.id);
    });
});
[sellerCommentsInput, artworkHolderInput]
    .forEach((field) => field?.addEventListener('input', queueArtSave));
finishNotesInput?.addEventListener('input', queueNotesSave);

releasePlanningButton?.addEventListener('click', () => updatePlanningControl('release-sales'));
openPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/gantt', 'Planificación'));
popoverPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/gantt', 'Planificación'));
openPlanningButton?.addEventListener('click', openPlanningControlPopover);
menuButton?.addEventListener('click', () => openOrderMenuPopover());
document.querySelector('.production-menu-nav')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-menu-tab]');
    if (!btn || btn.hidden) return;
    const tab = btn.dataset.menuTab;
    if (tab === activeMenuTab) return;
    switchMenuTab(tab);
});
pantonesButton?.addEventListener('click', () => openPopover('orderPantonesPopover'));
numberingButton?.addEventListener('click', () => openPopover('orderNumberingPopover'));
// Respaldo para navegadores sin soporte de `field-sizing: content`: antes de
// imprimir, expandimos cada textarea visible (Observaciones, detalle de
// muestras, detalle de entrega) a su alto real para que no se corte texto
// en el PDF/impresión. Al terminar de imprimir se revierte el alto inline.
const PRINT_TEXTAREA_HEIGHT_CACHE = new Map();
function expandTextareasForPrint() {
    document.querySelectorAll('#orderContent textarea').forEach((el) => {
        PRINT_TEXTAREA_HEIGHT_CACHE.set(el, el.style.height || '');
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    });
}
function restoreTextareasAfterPrint() {
    PRINT_TEXTAREA_HEIGHT_CACHE.forEach((height, el) => { el.style.height = height; });
    PRINT_TEXTAREA_HEIGHT_CACHE.clear();
}

// Antes de imprimir: ocultar Observaciones en blanco (en papel solo gasta espacio).
function markEmptyFieldsForPrint() {
    const obs = document.querySelector('.production-observations-section textarea');
    if (obs) obs.closest('.production-observations-section').classList.toggle('is-empty-print', !String(obs.value).trim());
}
function unmarkEmptyFieldsForPrint() {
    document.querySelectorAll('.is-empty-print').forEach((el) => el.classList.remove('is-empty-print'));
}
window.addEventListener('beforeprint', markEmptyFieldsForPrint);
window.addEventListener('afterprint', unmarkEmptyFieldsForPrint);

// Fechas de Entrega / Estimada en Seguimiento para impresión: etiqueta corta ("Entrega" /
// "Estimada"), el valor real de la fecha a la derecha, o "Pendiente" si no hay fecha. Se
// hace por JS (no por CSS ::after) para que la etiqueta y el valor sean texto real y no se
// dupliquen. Se revierte al terminar de imprimir.
const PRINT_DATE_CACHE = new Map();
function formatDatesForPrint() {
    const fields = document.querySelectorAll('.production-tracking-left .production-date-field');
    const cortos = ['Entrega', 'Estimada'];
    fields.forEach((field, i) => {
        const label = field.querySelector('.production-summary-label');
        const input = field.querySelector('input');
        if (!label || !input) return;
        const span = document.createElement('span');
        span.className = 'production-print-date-value';
        const val = String(input.value || '').trim();
        if (val) {
            const p = val.split('-');
            span.textContent = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : val;
        } else {
            span.textContent = 'Pendiente';
        }
        PRINT_DATE_CACHE.set(field, { label: label.textContent, span });
        label.textContent = cortos[i] || label.textContent;
        input.style.display = 'none';
        field.appendChild(span);
    });
}
function restoreDatesAfterPrint() {
    PRINT_DATE_CACHE.forEach((data, field) => {
        const label = field.querySelector('.production-summary-label');
        if (label) label.textContent = data.label;
        if (data.span && data.span.parentNode) data.span.parentNode.removeChild(data.span);
        const input = field.querySelector('input');
        if (input) input.style.display = '';
    });
    PRINT_DATE_CACHE.clear();
}
window.addEventListener('beforeprint', formatDatesForPrint);
window.addEventListener('afterprint', restoreDatesAfterPrint);

// Trazabilidad de impresión: qué usuario y desde qué equipo se imprimió esta
// hoja, y cuándo — no hay forma real de leer un ID de hardware desde el
// navegador, así que "equipo" es una etiqueta que se genera una sola vez y
// se guarda en este navegador/estación (persiste entre impresiones desde el
// mismo equipo, mismo perfil de navegador).
const PRINT_DEVICE_TAG_KEY = 'printlab-device-tag';
function getOrCreatePrintDeviceTag() {
    try {
        const existing = localStorage.getItem(PRINT_DEVICE_TAG_KEY);
        if (existing) return existing;
        const tag = 'EQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        localStorage.setItem(PRINT_DEVICE_TAG_KEY, tag);
        return tag;
    } catch (error) {
        return '';
    }
}
function updatePrintFooter() {
    const el = document.getElementById('orderPrintFooter');
    if (!el) return;
    const stamp = new Date().toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const user = currentSessionDisplayName() || 'Usuario no identificado';
    const device = getOrCreatePrintDeviceTag();
    el.textContent = ['Impreso ' + stamp, user, device].filter(Boolean).join(' · ');
}
window.addEventListener('beforeprint', expandTextareasForPrint);
window.addEventListener('beforeprint', updatePrintFooter);
window.addEventListener('afterprint', restoreTextareasAfterPrint);

document.getElementById('orderPrintButton')?.addEventListener('click', () => {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode || 'orden';
    const previousTitle = document.title;
    document.title = `Orden_${orderCode}`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 500);
});
document.getElementById('orderPdfButton')?.addEventListener('click', () => {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode || 'orden';
    const previousTitle = document.title;
    document.title = `Orden_${orderCode}`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 500);
});
function calidadGenerarDocumento(tipo) {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode;
    if (!orderCode) { notify('Error', 'No hay una orden cargada.', 'danger'); return; }
    fetch('/api/calidad/documentos', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ tipo: tipo, orden_produccion_codigo: orderCode })
    }).then(function (r) { return r.json(); }).then(function (doc) {
        if (doc.error) { notify('Error', doc.error, 'danger'); return; }
        const paginas = { cartilla_color: '/calidad/cartilla-color-impresion.html', ficha_tecnica: '/calidad/ficha-tecnica-impresion.html', certificado_calidad: '/calidad/certificado-calidad-impresion.html' };
        window.open(paginas[tipo] + '?id=' + doc.id, '_blank');
    }).catch(function (err) {
        notify('Error de red', err.message, 'danger');
    });
}
document.getElementById('orderQualityCartillaButton')?.addEventListener('click', () => calidadGenerarDocumento('cartilla_color'));
document.getElementById('orderQualityFichaButton')?.addEventListener('click', () => calidadGenerarDocumento('ficha_tecnica'));
document.getElementById('orderQualityCertificadoButton')?.addEventListener('click', () => {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode;
    if (!orderCode) { notify('Error', 'No hay una orden cargada.', 'danger'); return; }
    window.open('/calidad/documentos?orden=' + encodeURIComponent(orderCode), '_blank');
});
document.getElementById('orderAudioRecordButton')?.addEventListener('click', toggleOrderAudioRecording);
document.getElementById('orderAttachmentFileInput')?.addEventListener('change', handleOrderAttachmentUpload);
orderFlowBody?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-tracking-toggle-index]');
    if (!button) return;
    const index = Number(button.dataset.trackingToggleIndex);
    if (!Number.isInteger(index)) return;
    toggleTrackingStep(index).catch((error) => {
        notify('Seguimiento', (error && error.noRetry && error.message) ? error.message : friendlyNetworkMessage('La marca'), 'warning');
        renderOrderTracking(currentOrderFlowPayload);
    });
});
scheduledDateInput?.addEventListener('change', () => {
    saveOrderDetails({
        planningControl: {
            promisedDeliveryDate: scheduledDateInput.value || null
        }
    }).catch((error) => {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
    });
});
artworkPreview?.addEventListener('click', () => artworkFileInput?.click());
artworkDeleteButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    deleteArtwork().catch((error) => {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
    });
});
artworkFileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        await uploadArtworkFile(file, pendingArtworkTarget);
    } catch (error) {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
    } finally {
        pendingArtworkTarget = null;
    }
});
artworkPreview?.addEventListener('dragover', (event) => {
    event.preventDefault();
    artworkPreview.classList.add('is-dragover');
});
artworkPreview?.addEventListener('dragleave', () => {
    artworkPreview.classList.remove('is-dragover');
});
artworkPreview?.addEventListener('drop', async (event) => {
    event.preventDefault();
    artworkPreview.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    try {
        await uploadArtworkFile(file);
    } catch (error) {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
    }
});
document.addEventListener('click', (event) => {
    const dropzone = event.target.closest('[data-frontback-art-target]');
    if (!dropzone) return;
    pendingArtworkTarget = {
        quoteCode: dropzone.dataset.quote || '',
        lineCode: dropzone.dataset.line || '',
        dropzone
    };
    artworkFileInput?.click();
});
document.addEventListener('dragover', (event) => {
    const dropzone = event.target.closest('[data-frontback-art-target]');
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.add('is-dragover');
});
document.addEventListener('dragleave', (event) => {
    const dropzone = event.target.closest('[data-frontback-art-target]');
    if (dropzone) dropzone.classList.remove('is-dragover');
});
document.addEventListener('drop', async (event) => {
    const dropzone = event.target.closest('[data-frontback-art-target]');
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    try {
        await uploadArtworkFile(file, {
            quoteCode: dropzone.dataset.quote || '',
            lineCode: dropzone.dataset.line || '',
            dropzone
        });
    } catch (error) {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
    }
});
window.addEventListener('resize', updateArtworkSectionConstraint);

document.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-close-popover]');
    if (closeTarget) {
        closePopover(closeTarget.dataset.closePopover);
        return;
    }
    document.querySelectorAll('.production-header-tab-popover').forEach((popover) => {
        if (popover.hidden) return;
        const panel = popover.querySelector('.calc-popover-panel');
        const button = headerTabButtonFor(popover.id);
        if (panel && panel.contains(event.target)) return;
        if (button && button.contains(event.target)) return;
        closePopover(popover.id);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.calc-popover').forEach((popover) => {
        if (!popover.hidden) closePopover(popover.id);
    });
});

initFlowTabs();
iniciarPestanasProduccion();

loadOrder().catch((error) => {
    statusBox.textContent = error.message;
});

// Cuando esta página se abre como tab dentro del shell del dashboard, el botón
// "Volver" no debe navegar el iframe (eso deja el tab con la etiqueta de la
// orden pero mostrando la lista) — debe pedirle al shell que abra/reutilice el
// tab de la lista, igual que hace el resto de la navegación cross-módulo.
document.getElementById('orderBackButton')?.addEventListener('click', (event) => {
    if (window.parent && window.parent !== window && window.location.search.includes('shell=1')) {
        event.preventDefault();
        window.parent.postMessage({ type: 'erp-open-tab', route: '/ordenes-produccion?shell=1', label: 'Órdenes' }, window.location.origin);
    }
});
