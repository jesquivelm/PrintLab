
const statusBox = document.getElementById('orderStatus');
const contentBox = document.getElementById('orderContent');
const shellEmbedded = new URLSearchParams(window.location.search).get('shell') === '1' || window !== window.parent;

const sourceQuoteButton = document.getElementById('openSourceQuoteButton');
const openPlanningButton = document.getElementById('orderOpenPlanningButton');
const openPlanningQueueButton = document.getElementById('orderOpenPlanningQueueButton');
const popoverPlanningQueueButton = document.getElementById('orderPopoverPlanningQueueButton');
const releasePlanningButton = document.getElementById('orderReleasePlanningButton');
const attachmentsButton = document.getElementById('orderAttachmentsButton');
const pantonesButton = document.getElementById('orderPantonesButton');
const deliveriesButton = document.getElementById('orderDeliveriesButton');
const numberingButton = document.getElementById('orderNumberingButton');
const stateButton = document.getElementById('orderStateButton');
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
const deliveriesPopover = document.getElementById('orderDeliveriesPopover');
const deliveriesPanel = deliveriesPopover?.querySelector('.production-deliveries-popover-panel');
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
const samplesAddressInput = document.getElementById('orderSamplesAddressInput');
const samplesDetailInput = document.getElementById('orderSamplesDetailInput');

const deliverySummary = document.getElementById('orderDeliverySummary');
const deliveryForm = document.getElementById('orderDeliveryForm');
const deliveryToggleButton = document.getElementById('orderDeliveryToggleButton');
const deliveryModeInput = document.getElementById('orderDeliveryModeInput');
const deliveryContactInput = document.getElementById('orderDeliveryContactInput');
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
let artworkSectionBaseHeight = 0;
let artworkSectionMaxHeight = 0;
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

const ORDER_VISIBLE_PROCESSES = ['diseno', 'preprensa', 'visto bueno', 'tintas', 'impresion', 'rebobinado', 'empaque'];

function normalizeProcessName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function isVisibleOrderProcess(value) {
    const name = normalizeProcessName(value);
    if (!name || /plancha|acabado/.test(name)) return false;
    return ORDER_VISIBLE_PROCESSES.some((item) => name.includes(item));
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
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
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
        <div class="production-flow-history">
            ${processes.map((process) => {
                const received = findReceivedStep(process);
                const receivedStatus = formatRouteStatus(received?.routeStatus);
                const receivedUser = received?.completedBy || received?.startedBy || '';
                const receivedDate = formatDate(received?.completedAt || received?.startedAt, true);
                const avatarName = receivedUser || 'Pendiente';
                const plannedDuration = parseNumber(process.durationHours, ' h') || '0 h';
                const plannedSetup = parseNumber(process.setupMinutes, ' min') || '0 min';
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
                                <span>Duración: ${escapeHtml(plannedDuration)}</span>
                                <span>Setup: ${escapeHtml(plannedSetup)}</span>
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
    if (document.getElementById('orderFlowPopover')?.classList.contains('is-visible')) positionHeaderTabPopover('orderFlowPopover');
}

function renderFlowTimeline(steps, order) {
    if (!steps.length) return '<div class="production-summary-empty">No hay seguimiento registrado.</div>';
    var doneCount = steps.filter(function (s) { return String(s.routeStatus || '').toUpperCase() === 'COMPLETADO'; }).length;
    var total = steps.length;

    // Build timeline rows
    var tlHtml = '';
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var status = String(s.routeStatus || 'PENDIENTE').toUpperCase();
        var isDone = status === 'COMPLETADO';
        var isActive = ['RUN', 'SETUP'].includes(status);
        var isStopped = status === 'PARO';
        var isLocked = !isDone && !isActive && !isStopped;
        var isLast = i === steps.length - 1;

        var nodeClass = isDone ? 'tl-node done' : (isActive ? 'tl-node avail in-progress' : (isStopped ? 'tl-node warn' : 'tl-node locked'));
        var markerName = String(s.completedBy || s.startedBy || '').trim();
        var markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim();
        var hasMarkerPhoto = Boolean(markerPhoto || trackingUserPhotos.get(trackingUserLookupKey(markerName)));
        var nodeInner = markerName
            ? '<span class="tl-avatar-clip">' + trackingAvatarMarkup(markerName, markerPhoto) + '</span><span class="tl-node-badge"><i class="ti ti-check" style="font-size:10px;"></i></span>'
            : '<i class="ti ti-check" style="font-size:16px;"></i>';
        if (markerName) nodeClass += ' has-avatar' + (hasMarkerPhoto ? ' has-photo' : '');

        // Connector
        var solid = isDone && !isLast && steps[i + 1] && String(steps[i + 1].routeStatus || '').toUpperCase() === 'COMPLETADO';
        var line = isLast ? '' : '<div class="tl-connector ' + (solid ? 'solid' : 'dashed') + '"></div>';

        // Content
        var detailRows = '';
        var machineProcessKeys = ['planchas', 'impresion', 'acabados', 'barnizado', 'laminado', 'troquelado', 'estampado', 'embosado', 'numeracion', 'rebobinado'];
        if (machineProcessKeys.includes(s.processKey) && s.planned && s.planned.machineName) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-cpu" style="font-size:11px;"></i>' + escapeHtml(s.planned.machineName) + '</span>';
        }
        var plannedTime = s.planned && s.planned.minutes > 0 ? fmtFlowTime(s.planned.minutes) : '';
        var showTimeInTitle = isDone && plannedTime && s.processKey !== 'empaque';
        if (plannedTime && !showTimeInTitle) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-clock" style="font-size:11px;"></i>' + plannedTime + '</span>';
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
        var detailHtml = detailRows ? '<div class="flow-detail-stack">' + detailRows + '</div>' : '';
        contentHtml = '<div class="tl-step-grid"><div class="tl-step-main">' + titleHtml + metaHtml + detailHtml + '</div></div>';

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
        + '<div class="fp-panel-head"><div><div class="fp-panel-title">Flujo de producción</div><div class="fp-panel-sub">' + doneCount + ' de ' + total + ' etapas completas</div></div>'
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
        planchas: 'layers-subtract', tintas: 'droplet', impresion: 'brand-codesandbox',
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
        if (step.processKey === 'impresion' && planned.machineName) html += '<div class="cmp-row"><span class="cmp-row-label">Máquina</span><span class="cmp-row-val" style="font-size:10px;">' + escapeHtml(planned.machineName) + '</span></div>';
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

async function openOrderFlowPopover() {
    if (!currentOrderCode) return;
    openPopover('orderFlowPopover');
    if (orderFlowBody) orderFlowBody.innerHTML = '<div class="production-summary-empty" style="padding:40px;text-align:center;">Cargando seguimiento...</div>';
    try {
        await fetchOrderFlowSteps();
        renderOrderTracking(currentOrderFlowPayload);
    } catch (error) {
        if (orderFlowBody) orderFlowBody.innerHTML = '<div class="production-summary-empty">' + escapeHtml(friendlyNetworkMessage('El seguimiento')) + '</div>';
    }
}

async function fetchOrderFlowSteps() {
    const payload = await fetchJsonWithRetry('/api/ordenes-produccion/' + encodeURIComponent(currentOrderCode) + '/seguimiento', {
        headers: sessionHeader()
    }, { retries: 3, retryDelay: 800 });
    currentOrderFlowPayload = payload;
    currentOrderFlowSteps = Array.isArray(payload.steps) ? payload.steps : [];
    return currentOrderFlowSteps;
}

async function toggleTrackingStep(index) {
    var steps = currentOrderFlowPayload && currentOrderFlowPayload.steps;
    if (!steps || !steps[index]) return;
    var step = steps[index];
    var isDone = String(step.routeStatus || '').toUpperCase() === 'COMPLETADO';
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

async function openPlanningControlPopover() {
    if (!currentOrderCode) return;
    await openOrderFlowPopover();
}

function openRoute(route, label) {
    if (shellEmbedded) {
        window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
        return;
    }
    window.location.href = route;
}

function buildOrderDataLink(route, label, title) {
    if (!route || !label) return '';
    return `<a class="production-data-link" href="${escapeHtml(route)}" data-order-route="${escapeHtml(route)}" data-order-label="${escapeHtml(title || label)}">${escapeHtml(label)}</a>`;
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('.production-data-link[data-order-route]');
    if (!link) return;
    event.preventDefault();
    openRoute(link.dataset.orderRoute || link.getAttribute('href'), link.dataset.orderLabel || link.textContent.trim());
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
        .filter(([key, value]) => typeof value === 'string' && /(adjunt|arte|pdf|imagen|archivo|url|link)/i.test(key) && value.trim())
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
    const mimeType = String(item.mime_type || '').toLowerCase();
    return note.includes('arte') || label.includes('arte') || mimeType.startsWith('image/');
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

async function uploadArtworkFile(file) {
    if (!file) return;
    const { quoteCode, lineCode } = getSourceQuoteContext();
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
    attachmentsPopoverBody.innerHTML = attachments.length
        ? attachments.map((item) => {
            const label = item.label || item.file_name || item.key || 'Adjunto';
            const value = item.value || item.file_name || '';
            const notes = item.notes ? `<div class="attachment-card-meta">${escapeHtml(String(item.notes))}</div>` : '';
            const download = item.id
                ? `<a class="browser-open-link production-inline-icon production-inline-icon-small" href="/api/adjuntos/${encodeURIComponent(item.id)}/download" target="_blank" rel="noopener noreferrer" aria-label="Descargar adjunto"></a>`
                : '';
            return `
                <article class="attachment-card">
                    <div class="attachment-card-main">
                        <strong>${escapeHtml(label)}</strong>
                        <div class="attachment-card-meta">${escapeHtml(String(value))}</div>
                        ${notes}
                    </div>
                    ${download}
                </article>
            `;
        }).join('')
        : '<div class="attachments-empty">Esta orden no tiene adjuntos relacionados todavía.</div>';
}

function isHeaderTabPopover(popover) {
    return Boolean(popover?.classList?.contains('production-header-tab-popover'));
}

function headerTabButtonFor(id) {
    return {
        orderFlowPopover: stateButton,
        orderDeliveriesPopover: deliveriesButton,
        orderAttachmentsPopover: attachmentsButton
    }[id] || null;
}

function syncHeaderTabButtons(activeId = '') {
    ['orderFlowPopover', 'orderDeliveriesPopover', 'orderAttachmentsPopover'].forEach((id) => {
        const button = headerTabButtonFor(id);
        if (!button) return;
        const active = id === activeId;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function updateArtworkSectionConstraint() {
    if (!artSection || !observationsSection) return;
    if (artForm.hidden) {
        artSection.style.height = '';
        artSection.style.maxHeight = '';
        artworkSectionBaseHeight = 0;
        artworkSectionMaxHeight = 0;
        return;
    }
    const artRect = artSection.getBoundingClientRect();
    const observationsRect = observationsSection.getBoundingClientRect();
    const gap = 12;
    const available = Math.floor(observationsRect.top - artRect.top - gap);
    if (available > 0) {
        artSection.style.height = `${available}px`;
        artSection.style.maxHeight = `${available}px`;
    }
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
    if (id === 'orderDeliveriesPopover') positionDeliveriesPopover();
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
    const button = headerTabButtonFor(id);
    const panel = popover?.querySelector?.('.calc-popover-panel');
    if (!popover || !button || !panel) return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(panel.offsetWidth || 620, window.innerWidth - margin * 2);
    const height = Math.min(panel.offsetHeight || 420, window.innerHeight - margin * 2);
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rect.right - width + 18));
    const top = Math.max(margin, Math.min(window.innerHeight - height - margin, rect.bottom + 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}

function positionDeliveriesPopover() {
    if (!deliveriesButton || !deliveriesPanel) return;
    positionHeaderTabPopover('orderDeliveriesPopover');
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

function setToggleIcon(button, expanded) {
    renderIconButton(button, expanded ? (currentConfig.icons?.orderToggleOpen || DEFAULT_ICONS.toggleOpen) : (currentConfig.icons?.orderToggleClosed || DEFAULT_ICONS.toggleClosed));
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
    sourceQuoteButton?.setAttribute('title', 'Abrir cotización origen');
    renderIconButton(pantonesButton, iconConfigFor('orderPantones', DEFAULT_ICONS.pantones));
    pantonesButton?.setAttribute('title', 'Detalle de pantones');
    renderIconButton(deliveriesButton, iconConfigFor('orderDeliveries', DEFAULT_ICONS.deliveries));
    deliveriesButton?.setAttribute('title', 'Detalle de entregas');
    renderIconButton(numberingButton, iconConfigFor('orderNumbering', DEFAULT_ICONS.numbering));
    renderIconButton(attachmentsButton, iconConfigFor('orderAttachments', icons.lineAttachments || DEFAULT_ICONS.attachments));
    attachmentsButton?.setAttribute('title', 'Ver adjuntos');
    renderIconButton(stateButton, iconConfigFor('orderStatus', DEFAULT_ICONS.status));
    stateButton?.setAttribute('title', 'Control de planificación');
    renderIconButton(artworkDeleteButton, iconConfigFor('orderArtworkDelete', DEFAULT_ICONS.deleteArtwork, '#b94848'));
    setToggleIcon(samplesToggleButton, false);
    setToggleIcon(deliveryToggleButton, false);
    setToggleIcon(artToggleButton, false);
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
    if (/pend/i.test(normalized)) node.classList.add('is-pending');
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
        return code === search || name === search;
    }) || null;
}

function renderOutputTypePreview(outputType) {
    const match = getOutputTypeImage(outputType);
    const imageUrl = pickFirst(match?.image_url, match?.imageUrl);
    if (imageUrl) {
        outputTypeImage.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Tipo de salida" class="production-output-image">`;
        return;
    }
    outputTypeImage.textContent = 'Sin imagen';
}

function renderArtwork(attachments) {
    const artwork = attachments.find((item) => isArtworkAttachment(item));
    currentArtworkAttachment = artwork || null;
    if (artworkDeleteButton) artworkDeleteButton.hidden = !artwork;
    if (!artwork) {
        artworkPreview.classList.add('production-art-preview-compact');
        artworkPreview.innerHTML = '<div class="attachments-empty">Arrastra el Arte</div>';
        updateArtworkSectionConstraint();
        return;
    }
    const value = String(artwork.value || '').trim();
    artworkPreview.classList.remove('production-art-preview-compact');
    if (/^data:image\//i.test(value)) {
        artworkPreview.innerHTML = `<img src="${escapeHtml(value)}" alt="Arte del producto" class="production-art-image" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'attachments-empty',textContent:'Arrastra el Arte'}))">`;
        updateArtworkSectionConstraint();
        return;
    }
    if (artwork.id && /^image\//i.test(String(artwork.mime_type || ''))) {
        artworkPreview.innerHTML = `<img src="/api/adjuntos/${encodeURIComponent(artwork.id)}/download" alt="Arte del producto" class="production-art-image" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'attachments-empty',textContent:'Arrastra el Arte'}))">`;
        updateArtworkSectionConstraint();
        return;
    }
    artworkPreview.innerHTML = `<div class="production-art-copy"><strong>${escapeHtml(artwork.label || 'Referencia')}</strong><span>${escapeHtml(value)}</span></div>`;
    updateArtworkSectionConstraint();
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
    const inlineFinishes = [];
    (Array.isArray(dc?.print?.items) ? dc.print.items : []).forEach(function (printItem) {
        (Array.isArray(printItem?.inlineItems) ? printItem.inlineItems : []).forEach(function (inline) {
            if (inline?.active && (inline.processKey || inline.key || inline.label)) {
                inlineFinishes.push(inline);
            }
        });
    });
    const externalFinishes = Array.isArray(dc?.finishes?.items) ? dc.finishes.items : [];
    const findFinish = function (keys) {
        const v = pickFirst.apply(null, keys.map(function (k) { return raw[k]; }));
        if (v) return v;
        for (const inline of inlineFinishes) {
            const k = inline.processKey || inline.key || inline.label || '';
            if (keys.some(function (key) { return k.toLowerCase().includes(key.replace('ACABADOS | ', '').toLowerCase()); })) {
                return inline.label || inline.materialName || inline.processKey || k;
            }
        }
        for (const ext of externalFinishes) {
            const ek = ext.processKey || ext.key || ext.label || ext.description || '';
            if (keys.some(function (key) { return ek.toLowerCase().includes(key.replace('ACABADOS | ', '').toLowerCase()); })) {
                return ext.label || ext.description || ext.processKey || ek;
            }
        }
        return '';
    };
    const laminate = findFinish(['ACABADOS | LAMINADO', 'LAMINADO']);
    const varnish = findFinish(['ACABADOS | BARNIZ', 'BARNIZ', 'BARNIZ UV']);
    const foil = findFinish(['ACABADOS | FOIL', 'FOIL', 'ESTAMPADO']);
    const emboss = findFinish(['ACABADOS | EMBOSADO', 'EMBOSADO']);
    const numbering = findFinish(['ACABADOS | NUMERADO', 'NUMERADO']);
    if (dieCode) tags.push('Troquelado (' + dieCode + ')'); else tags.push('Troquelado');
    if (laminate) tags.push('Laminado ' + String(laminate).trim());
    if (varnish) tags.push('Barniz ' + String(varnish).trim());
    if (foil) tags.push('Estampado ' + String(foil).trim());
    if (emboss) tags.push('Embosado ' + String(emboss).trim());
    if (numbering) tags.push('Numerado');
    if (!tags.length && isNoPrint(detail, raw)) tags.push('Troquelado');
    return [...new Set(tags)];
}

function populateEditableForms(raw = {}) {
    const lineRaw = raw.line_snapshot?.raw_data || {};
    samplesModeInput.value = pickFirst(lineRaw['MUESTRAS | TIPO']);
    samplesApprovalInput.value = pickFirst(lineRaw['MUESTRAS | VISTO BUENO'], lineRaw['MUESTRAS | DESTINATARIO VISTO BUENO']);
    samplesContactInput.value = pickFirst(lineRaw['MUESTRAS | CONTACTO']);
    samplesPhoneInput.value = pickFirst(lineRaw['MUESTRAS | TELEFONO']);
    samplesEmailInput.value = pickFirst(lineRaw['MUESTRAS | EMAIL']);
    samplesAddressInput.value = pickFirst(lineRaw['MUESTRAS | DIRECCION']);
    samplesDetailInput.value = pickFirst(lineRaw['MUESTRAS | DETALLE']);
    deliveryModeInput.value = pickFirst(lineRaw['ENTREGA | TIPO']);
    deliveryContactInput.value = pickFirst(lineRaw['ENTREGA | CONTACTO']);
    deliveryDetailInput.value = pickFirst(lineRaw['ENTREGA | DETALLE'], [lineRaw['ENTREGA | EMAIL'], lineRaw['ENTREGA | TELEFONO'], lineRaw['ENTREGA | DIRECCION'], lineRaw['ENTREGA | COMENTARIOS']].filter(Boolean).join(' / '));
    sellerCommentsInput.value = pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']);
    artworkHolderInput.value = pickFirst(lineRaw['ARTE EN PODER DE']);
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
    populateEditableForms(currentLoadedOrder.raw_data || {});
}

function renderOrder(order) {
    const raw = order.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
    const lineRaw = detail.raw_data || {};
    const printing = raw.printing || null;
    const attachments = extractAttachments(raw);
    const dimensions = buildDimensionsText(detail);
    const quantityValue = raw.totals?.quantity || order.ordered_quantity;
    const quantity = parseNumber(quantityValue);
    const localProductCode = pickFirst(line.product_code, detail.productCode);
    const quoteLineCode = pickFirst(raw.source_line_code, detail.lineCode, line.line_code);
    const showProductId = localProductCode && localProductCode !== quoteLineCode;
    const clientProductCode = pickFirst(lineRaw['ID PRODUCTO CLIENTE'], lineRaw['CODIGO PRODUCTO CLIENTE']);
    const productRoute = localProductCode ? `/producto-documento?codigo=${encodeURIComponent(localProductCode)}` : '';
    const productCodes = [
        clientProductCode ? `<span>(${escapeHtml(clientProductCode)})</span>` : '',
        showProductId ? `<span>(${buildOrderDataLink(productRoute, localProductCode, `Producto ${localProductCode}`)})</span>` : ''
    ].filter(Boolean).join(' ');
    const stateText = pickFirst(raw.status, 'Pendiente');
    const promisedDateRaw = raw.planning_control?.promisedDeliveryDate || quote.due_on;
    const scheduledDateRaw = raw.planning_control?.scheduledDeliveryDate || raw.scheduled_on;
    const customerId = pickFirst(raw.customer_code, quote.customer_code);
    const customerName = pickFirst(raw.customer_name, quote.customer_name);
    const customerContact = pickFirst(raw.contact_name, quote.contact_name, lineRaw['CLIENTE | CONTACTO NOMBRE COMPLETO']);
    const customerPhone = pickFirst(raw.phone, quote.phone, lineRaw['CLIENTE | CONTACTO TELEFONO']);
    const customerEmail = pickFirst(raw.email, quote.email, lineRaw['CLIENTE | CONTACTO EMAIL']);
    const customerAddress = pickFirst(lineRaw.STREET, lineRaw['CLIENTE | DIRECCION'], lineRaw['DIRECCION ENTREGA']);
    const sellerName = pickFirst(raw.salesperson_name, quote.salesperson_name, detail.salespersonName);

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
    /* --- end printing data block --- */

    statusBox.hidden = true;
    contentBox.hidden = false;
    document.title = `${order.order_code} | Orden de Producción`;
    renderPlanningControl(raw);
    renderPlanningSnapshot(raw);
    renderDeliveries(lineRaw, quantity, scheduledDateRaw, quantityValue);
    renderArtwork(currentOrderAttachments.length ? currentOrderAttachments : attachments);
    populateEditableForms(raw);

    setOptionalText('orderCustomerSummaryText', [customerId ? `(${customerId})` : '', customerName].filter(Boolean).join(' '));
    const contactCol = document.getElementById('orderCustomerContactCol');
    if (customerContact || customerPhone || customerEmail) {
        contactCol.innerHTML = [
            customerPhone ? `<div class="production-client-info-line"><svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/></svg><span>${escapeHtml(customerPhone)}</span></div>` : '',
            customerEmail ? `<div class="production-client-info-line"><svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg><span>${escapeHtml(customerEmail)}</span></div>` : ''
        ].filter(Boolean).join('');
    }
    document.getElementById('orderClientInfoGrid').hidden = ![customerContact, customerPhone, customerEmail, sellerName].some(Boolean);

    const sellerCol = document.getElementById('orderSellerCol');
    if (sellerName) {
        sellerCol.innerHTML = `<div class="production-client-info-line"><svg class="production-client-info-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/></svg><span class="production-client-seller-name">${escapeHtml(sellerName)}</span></div>`;
        sellerCol.hidden = false;
    } else {
        sellerCol.hidden = true;
    }

    document.getElementById('orderCustomerAddressRow').hidden = !customerAddress;
    const sourceQuoteCode = pickFirst(raw.source_quote_code, quote.quote_code);
    const sourceLineCode = pickFirst(raw.source_line_code, detail.lineCode);
    if (sourceQuoteButton) {
        sourceQuoteButton.innerHTML = [
            buildOrderDataLink(`/cotizaciones/documento?codigo=${encodeURIComponent(sourceQuoteCode)}`, sourceQuoteCode, `Cotización ${sourceQuoteCode}`),
            sourceQuoteCode && sourceLineCode ? '<span class="production-source-separator">/</span>' : '',
            buildOrderDataLink(buildCalcRoute({ quoteCode: sourceQuoteCode, lineCode: sourceLineCode, productCode: localProductCode, department: pickFirst(line.department, detail.department, lineRaw['DEPARTAMENTO']) }), sourceLineCode, `Cálculo ${sourceLineCode}`)
        ].filter(Boolean).join('');
    }

    samplesSummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Muestras', value: pickFirst(lineRaw['MUESTRAS | TIPO']) },
        { label: 'Visto Bueno', value: pickFirst(lineRaw['MUESTRAS | VISTO BUENO']) },
        { label: 'Contacto', value: pickFirst(lineRaw['MUESTRAS | CONTACTO']) },
        { label: 'Detalle', value: [pickFirst(lineRaw['MUESTRAS | DETALLE']), pickFirst(lineRaw['MUESTRAS | TELEFONO']), pickFirst(lineRaw['MUESTRAS | EMAIL']), pickFirst(lineRaw['MUESTRAS | DIRECCION'])].filter(Boolean).join(' · ') }
    ]);

    setHtml('orderProductCodesText', productCodes);
    var frontBackBlock = document.getElementById('orderFrontBackBlock');
    var frontBackMembers = document.getElementById('orderFrontBackMembers');
    if (frontBackObj) {
        frontBackBlock.style.display = 'flex';
        frontBackBlock.querySelector('.production-order-frontback-badge').textContent = frontBackObj.label || 'Frente / Dorso';
        var outputs = Array.isArray(frontBackObj.outputs) ? frontBackObj.outputs : [];
        frontBackMembers.innerHTML = outputs.map(function (o) {
            var sideClass = String(o.side || o.lineCode || '').toLowerCase().includes('dorso') ? 'production-order-frontback-member-dorso' : 'production-order-frontback-member-frente';
            var label = o.side || o.lineCode || o.productCode || 'Producto';
            return '<span class="production-order-frontback-member ' + sideClass + '">' + escapeHtml(label) + ' (' + parseNumber(o.quantity) + ' uds)</span>';
        }).join('');
    } else {
        frontBackBlock.style.display = 'none';
    }
    setText('orderJobText', [pickFirst(line.job_name, detail.jobName), dimensions ? '(' + dimensions + ')' : ''].filter(Boolean).join(' '), 'Trabajo sin nombre');
    setOptionalText('orderDimensionsText', '');

    const printingAlert = document.getElementById('orderPrintingAlert');
    const printingGrid = document.getElementById('orderPrintingGrid');
    if (noPrint) {
        printingAlert.hidden = false;
        printingAlert.textContent = 'Sin Impresión';
        printingGrid.hidden = true;
    } else {
        printingAlert.hidden = true;
        printingGrid.hidden = false;
    }

    setText('orderMachineText', printing ? printing.machineName : pickFirst(detail.quotedMachine, line.machine_name, order.machine_name), 'Sin máquina');
    setText('orderMaterialText', printing ? printing.materialName : pickFirst(detail.materialName, line.material_name, order.material_code), 'Sin sustrato');
    setText('orderFeetText', totalFeet > 0 ? `${parseNumber(linearFeet, ' ft')} + ${parseNumber(wasteFeet, ' ft')} = ${parseNumber(totalFeet, ' ft')}` : '', 'Sin consumo registrado');
    setText('orderRollCountText', rollCount ? parseNumber(rollCount) : '', 'Por definir');

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
    document.getElementById('orderInkBlock').hidden = noPrint;
    setText('orderInkConfigText', inkConfig, 'Sin configuración');
    pantonesButton.hidden = pantoneList.length <= 0 && inkPantoneCount <= 0;
    pantonesPopoverBody.innerHTML = (pantoneList.length > 0 || inkPantoneCount > 0)
        ? `<div class="production-order-popover-summary"><strong>${escapeHtml(parseNumber(inkPantoneCount))} Pantones declarados</strong><span>${escapeHtml(pantoneList.length ? pantoneList.join(' / ') : 'Todavía no hay detalle de pantones cargado.')}</span></div>`
        : '<div class="attachments-empty">Esta orden no tiene pantones declarados.</div>';

    setText('orderCoreWidthText', printing ? parseNumber(printing.coreWidth) : parseNumber(detail.coreWidth), 'Sin dato');
    setText('orderCoreDiameterText', printing ? pickFirst(printing.coreDiameter) : pickFirst(detail.coreDiameter), 'Sin dato');
    setText('orderRollLabelsText', printing ? parseNumber(printing.labelsPerRoll) : parseNumber(detail.labelsPerRoll), 'Sin dato');
    setOptionalText('orderOutputTypeText', outputType);
    renderOutputTypePreview(outputType);
    finishList.innerHTML = finishes.length
        ? finishes.map((item) => `<span class="production-chip">${escapeHtml(item)}</span>`).join('')
        : '<span class="production-chip production-chip-muted">Sin acabados adicionales</span>';
    document.getElementById('orderNumberingWrap').hidden = !numberingValue;
    setText('orderNumberingSummaryText', numberingValue, 'No definido');
    numberingPopoverBody.innerHTML = `
        <div class="production-order-popover-summary">
            <strong>${escapeHtml(pickFirst(numberingValue, 'Numerado no definido'))}</strong>
            <span>${escapeHtml(pickFirst(lineRaw['ACABADOS | OBSERVACIONES'], 'Sin observaciones para numerado.'))}</span>
            <span>Si necesitas cargar un archivo de datos, este numerado se conecta con los adjuntos de la orden.</span>
        </div>
    `;

    const deliveryText = [
        pickFirst(lineRaw['ENTREGA | TIPO'], quote.delivery_time),
        pickFirst(lineRaw['ENTREGA | CONTACTO'], quote.contact_name),
        pickFirst(lineRaw['ENTREGA | DETALLE']),
        [lineRaw['ENTREGA | EMAIL'], lineRaw['ENTREGA | TELEFONO'], lineRaw['ENTREGA | DIRECCION'], lineRaw['ENTREGA | COMENTARIOS']].filter(Boolean).join(' / ')
    ].filter(Boolean).join(' · ');
    deliverySummary.innerHTML = deliveryText
        ? `<div class="production-summary-line production-delivery-summary-line"><span class="production-summary-line-value">${escapeHtml(deliveryText)}</span></div>`
        : '';

    setText('orderCodeText', order.order_code, 'Sin orden');
    setText('orderQuoteText', sourceQuoteCode || 'Sin cotización');
    setText('orderLineText', sourceLineCode || 'Sin línea');
    setText('orderStateText', stateText, 'Pendiente');
    applyOrderState(document.getElementById('orderStateText'), stateText);
    setText('orderCreatedText', formatDate(order.created_at || raw.created_on, true), 'Sin fecha');
    setText('orderPromisedDateText', formatDate(promisedDateRaw), 'Pendiente');
    applyScheduleState(document.getElementById('orderPromisedDateText'), promisedDateRaw);
    const scheduledDateText = document.getElementById('orderScheduledDateText');
    if (scheduledDateText && scheduledDateText.type === 'date') {
        scheduledDateText.value = normalizeDateInputValue(scheduledDateRaw);
    } else {
        setText('orderScheduledDateText', formatDate(scheduledDateRaw), 'Pendiente');
        applyScheduleState(scheduledDateText, scheduledDateRaw);
    }
    if (scheduledDateInput) scheduledDateInput.value = normalizeDateInputValue(scheduledDateRaw);

    setText('orderQuantityText', quantity, 'Sin cantidad');
    artSummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Comentarios', value: pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']) },
        { label: 'Orden de Arte', value: pickFirst(lineRaw['ORDEN DE ARTE']) },
        { label: 'Arte en Poder de', value: pickFirst(lineRaw['ARTE EN PODER DE']) }
    ]);
    if (artSummary && artForm && artToggleButton) {
        artSummary.hidden = true;
        artForm.hidden = false;
        setToggleIcon(artToggleButton, true);
        requestAnimationFrame(updateArtworkSectionConstraint);
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

async function loadOrder() {
    const orderCode = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    currentOrderCode = orderCode;
    const [orderResponse, configResponse, catalogsResponse] = await Promise.all([
        fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}`),
        fetch('/api/config/shell'),
        fetch('/api/catalogs?scope=output-types')
    ]);
    const payload = await orderResponse.json();
    const config = configResponse.ok ? await configResponse.json() : {};
    const catalogs = catalogsResponse.ok ? await catalogsResponse.json() : {};

    currentOutputTypes = Array.isArray(catalogs.outputTypes) ? catalogs.outputTypes : [];
    applyHeaderConfig(config);
    if (!orderResponse.ok) throw new Error(payload.error || 'No se pudo cargar la orden.');

    currentLoadedOrder = payload.orden;
    try {
        await refreshOrderAttachments();
    } catch (error) {
        currentOrderAttachments = extractAttachments(currentLoadedOrder?.raw_data || {});
    }
    renderOrder(currentLoadedOrder);

    const raw = currentLoadedOrder.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
}

samplesToggleButton?.addEventListener('click', () => toggleSection(samplesSummary, samplesForm, samplesToggleButton, samplesForm.hidden));
samplesForm?.addEventListener('submit', (event) => event.preventDefault());
deliveryToggleButton?.addEventListener('click', () => toggleSection(deliverySummary, deliveryForm, deliveryToggleButton, deliveryForm.hidden));
deliveryForm?.addEventListener('submit', (event) => event.preventDefault());
artToggleButton?.addEventListener('click', () => toggleSection(artSummary, artForm, artToggleButton, artForm.hidden));
artForm?.addEventListener('submit', (event) => event.preventDefault());
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
                address: samplesAddressInput.value,
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
            return;
        }
        if (deliveriesMessage) deliveriesMessage.hidden = true;
        saveOrderDetails({
            delivery: {
                mode: deliveryModeInput.value,
                contact: deliveryContactInput.value,
                detail: deliveryDetailInput.value,
                schedule: schedule.rows
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

[samplesModeInput, samplesApprovalInput, samplesContactInput, samplesPhoneInput, samplesEmailInput, samplesAddressInput, samplesDetailInput]
    .forEach((field) => field?.addEventListener('input', queueSamplesSave));
[deliveryModeInput, deliveryContactInput, deliveryDetailInput]
    .forEach((field) => field?.addEventListener('input', queueDeliverySave));
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
openPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/lanzamiento', 'Cola de planificación'));
popoverPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/lanzamiento', 'Cola de planificación'));
openPlanningButton?.addEventListener('click', openPlanningControlPopover);
stateButton?.addEventListener('click', openOrderFlowPopover);
pantonesButton?.addEventListener('click', () => openPopover('orderPantonesPopover'));
    if (deliveriesButton) {
        deliveriesButton.title = 'Detalle de entregas';
        deliveriesButton.setAttribute('aria-label', 'Detalle de entregas');
        deliveriesButton.addEventListener('click', () => openPopover('orderDeliveriesPopover'));
    }
numberingButton?.addEventListener('click', () => openPopover('orderNumberingPopover'));
attachmentsButton?.addEventListener('click', () => openPopover('orderAttachmentsPopover'));
orderFlowBody?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-tracking-toggle-index]');
    if (!button) return;
    const index = Number(button.dataset.trackingToggleIndex);
    if (!Number.isInteger(index)) return;
    toggleTrackingStep(index).catch((error) => {
        notify('Seguimiento', friendlyNetworkMessage('La marca'), 'warning');
        renderOrderTracking(currentOrderFlowPayload);
    });
});
scheduledDateInput?.addEventListener('change', () => {
    saveOrderDetails({
        planningControl: {
            scheduledDeliveryDate: scheduledDateInput.value || null
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
        await uploadArtworkFile(file);
    } catch (error) {
        statusBox.hidden = false;
        statusBox.textContent = error.message;
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
window.addEventListener('resize', updateArtworkSectionConstraint);

document.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-close-popover]');
    if (closeTarget) closePopover(closeTarget.dataset.closePopover);
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.calc-popover').forEach((popover) => {
        if (!popover.hidden) closePopover(popover.id);
    });
});

loadOrder().catch((error) => {
    statusBox.textContent = error.message;
});
