
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

const ORDER_VISIBLE_PROCESSES = ['diseno', 'preprensa', 'visto bueno', 'visto_bueno', 'planchas', 'tintas', 'impresion', 'rebobinado', 'empaque'];

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

function populateSamplesContactDropdown(contacts) {
    cachedClientContacts = contacts;
    if (!samplesApprovalInput) return;
    const currentVal = samplesApprovalInput.value;
    const options = contacts.map(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    samplesApprovalInput.innerHTML = '<option value=""></option>' + options;
    if (currentVal) samplesApprovalInput.value = currentVal;
}

function fillSamplesContactFields(contactName) {
    if (!contactName) return;
    const contact = cachedClientContacts.find(c => {
        const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
        return name === contactName;
    });
    if (!contact) return;
    if (samplesPhoneInput && !samplesPhoneInput.value) samplesPhoneInput.value = contact.phone || contact.mobile || '';
    if (samplesEmailInput && !samplesEmailInput.value) samplesEmailInput.value = contact.email || '';
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

const ADMIN_TOOLS_PERMISSION_KEYWORDS = ['admin', 'implement'];

function hasAdminToolsAccess() {
    const session = readUserSession();
    const permissionName = String(session?.permissionName || '').toLowerCase();
    if (!permissionName) return false;
    return ADMIN_TOOLS_PERMISSION_KEYWORDS.some(function (keyword) {
        return permissionName.includes(keyword);
    });
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
        var machineProcessKeys = ['planchas', 'impresion', 'acabados', 'barnizado', 'laminado', 'troquelado', 'estampado', 'embosado', 'numeracion', 'rebobinado'];
        if (machineProcessKeys.includes(s.processKey) && s.planned && s.planned.machineName) {
            detailRows += '<span class="flow-detail-row"><i class="ti ti-cpu" style="font-size:11px;"></i>' + escapeHtml(s.planned.machineName) + '</span>';
        }
        // Planchas: show source info (inventory vs. external)
        if (s.processKey === 'planchas') {
            var planSource = (s.actual && s.actual.planSourceLabel) || (s.planned && s.planned.planSource);
            var planDias = (s.actual && s.actual.diasEstimados) || (s.planned && s.planned.diasEstimados);
            if (planSource) detailRows += '<span class="flow-detail-row"><i class="ti ti-layers-subtract" style="font-size:11px;"></i>' + escapeHtml(planSource) + '</span>';
            if (planDias > 0) detailRows += '<span class="flow-detail-row"><i class="ti ti-calendar" style="font-size:11px;"></i>' + planDias + (planDias === 1 ? ' día est.' : ' días est.') + '</span>';
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
    'WAITING_PLATES': 'Esp. planchas',
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
        if ((step.processKey === 'impresion' || step.processKey === 'planchas') && planned.machineName) html += '<div class="cmp-row"><span class="cmp-row-label">Máquina</span><span class="cmp-row-val" style="font-size:10px;">' + escapeHtml(planned.machineName) + '</span></div>';
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
    activeFlowTab = 'flujo';
    var tabBar = document.getElementById('orderFlowTabs');
    if (tabBar) tabBar.querySelectorAll('.tl-tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.flowTab === 'flujo'); });
    var flowBody = document.getElementById('orderFlowBody');
    var tabContent = document.getElementById('orderFlowTabContent');
    if (flowBody) flowBody.style.display = '';
    if (tabContent) tabContent.style.display = 'none';
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
    const panel = popover?.querySelector?.('.calc-popover-panel');
    if (!popover || !panel) return;
    const button = headerTabButtonFor(id);
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const panelWidth = panel.offsetWidth || 320;
    const panelHeight = panel.offsetHeight || 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const gap = 2;
    const tabExtension = 20;
    const tabBridge = Math.max(1, rect.height + gap + tabExtension);
    panel.style.position = 'fixed';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.removeProperty('--tab-left');
    panel.style.removeProperty('--tab-width');
    panel.style.removeProperty('--tab-offset');
    panel.style.removeProperty('--tab-bridge-height');
    panel.classList.remove('panel-left-side');
    if (spaceBelow >= panelHeight + gap + 16) {
        let left = rect.right - panelWidth;
        const maxLeft = window.innerWidth - panelWidth - margin;
        if (left > maxLeft) left = maxLeft;
        if (left < margin) left = margin;
        panel.style.top = `${rect.bottom + gap}px`;
        panel.style.left = `${left}px`;
        panel.style.setProperty('--tab-left', `${rect.right - left - rect.width}px`);
        panel.style.setProperty('--tab-width', `${rect.width}px`);
        panel.style.setProperty('--tab-offset', `${-(rect.height + gap)}px`);
        panel.style.setProperty('--tab-bridge-height', `${tabBridge}px`);
    } else {
        let left = rect.left - panelWidth - 8;
        if (left < margin) left = margin;
        panel.style.top = `${rect.top}px`;
        panel.style.left = `${left}px`;
        panel.classList.add('panel-left-side');
    }
    const maxWidth = window.innerWidth - margin * 2;
    if (panelWidth > maxWidth) {
        panel.style.width = `${maxWidth}px`;
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        panel.style.filter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.30)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.40))';
    } else {
        panel.style.filter = 'drop-shadow(0 2px 8px rgba(15, 23, 42, 0.08)) drop-shadow(0 8px 24px rgba(15, 23, 42, 0.10))';
    }
}

function positionDeliveriesPopover() {
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
    sourceQuoteButton?.setAttribute('title', 'Abrir cotización origen');
    if (pantonesButton) renderIconButton(pantonesButton, iconConfigFor('orderPantones', DEFAULT_ICONS.pantones));
    pantonesButton?.setAttribute('title', 'Detalle de pantones');
    renderIconButton(deliveriesButton, iconConfigFor('orderDeliveries', DEFAULT_ICONS.deliveries));
    deliveriesButton?.setAttribute('title', 'Detalle de entregas');
    renderIconButton(numberingButton, iconConfigFor('orderNumbering', DEFAULT_ICONS.numbering));
    renderIconButton(attachmentsButton, iconConfigFor('orderAttachments', icons.lineAttachments || DEFAULT_ICONS.attachments));
    attachmentsButton?.setAttribute('title', 'Ver adjuntos');
    renderIconButton(stateButton, iconConfigFor('orderStatus', DEFAULT_ICONS.status));
    stateButton?.setAttribute('title', 'Control de planificación');
    if (svgTestButton) {
        const testIconSize = stateButton?.style.getPropertyValue('--config-icon-size') || `${Number(currentConfig.general?.iconSizeOrderStatus) || 40}px`;
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

function outputTypePreviewHtml(outputType) {
    const match = getOutputTypeImage(outputType);
    const imageUrl = pickFirst(match?.image_url, match?.imageUrl);
    return imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="Tipo de salida" class="production-output-image">`
        : 'Sin imagen';
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
    if (dieCode) tags.push('Troquelado (' + dieCode + ')');
    else if (raw['ACABADOS | TROQUELADO'] || raw['TROQUELADO']) tags.push('Troquelado');
    else if (!tags.length && isNoPrint(detail, raw)) tags.push('Troquelado');
    function finishTag(prefix, val) {
        var s = String(val).trim();
        if (!s) return '';
        if (s.toLowerCase().startsWith(prefix.toLowerCase())) return s;
        return prefix + ' ' + s;
    }
    if (laminate)  tags.push(finishTag('Laminado', laminate));
    if (varnish)   tags.push(finishTag('Barniz', varnish));
    if (foil)      tags.push(finishTag('Estampado', foil));
    if (emboss)    tags.push(finishTag('Embosado', emboss));
    if (numbering) tags.push('Numerado');
    if (rewinding) tags.push('Rebobinado');
    return [...new Set(tags)];
}

function populateEditableForms(raw = {}) {
    const lineRaw = raw.line_snapshot?.raw_data || {};
    if (samplesModeInput) samplesModeInput.value = pickFirst(lineRaw['MUESTRAS | TIPO']);
    if (samplesApprovalInput) samplesApprovalInput.value = pickFirst(lineRaw['MUESTRAS | VISTO BUENO'], lineRaw['MUESTRAS | DESTINATARIO VISTO BUENO']);
    if (samplesContactInput) samplesContactInput.value = pickFirst(lineRaw['MUESTRAS | CONTACTO']);
    if (samplesPhoneInput) samplesPhoneInput.value = pickFirst(lineRaw['MUESTRAS | TELEFONO']);
    if (samplesEmailInput) samplesEmailInput.value = pickFirst(lineRaw['MUESTRAS | EMAIL']);
    if (samplesAddressInput) samplesAddressInput.value = pickFirst(lineRaw['MUESTRAS | DIRECCION']);
    if (samplesDetailInput) samplesDetailInput.value = pickFirst(lineRaw['MUESTRAS | DETALLE']);
    if (deliveryModeInput) deliveryModeInput.value = pickFirst(lineRaw['ENTREGA | TIPO']);
    if (deliveryContactInput) deliveryContactInput.value = pickFirst(lineRaw['ENTREGA | CONTACTO']);
    if (deliveryPhoneInput) deliveryPhoneInput.value = pickFirst(lineRaw['ENTREGA | TELEFONO']);
    if (deliveryEmailInput) deliveryEmailInput.value = pickFirst(lineRaw['ENTREGA | EMAIL']);
    if (deliveryDetailInput) deliveryDetailInput.value = pickFirst(lineRaw['ENTREGA | DETALLE'], lineRaw['ENTREGA | DIRECCION'], lineRaw['ENTREGA | COMENTARIOS']);
    if (sellerCommentsInput) sellerCommentsInput.value = pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']);
    if (artworkHolderInput) artworkHolderInput.value = pickFirst(lineRaw['ARTE EN PODER DE']);
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

function buildDeliverySummary(lineRaw, quote) {
    const tipo = pickFirst(lineRaw['ENTREGA | TIPO'], quote.delivery_time);
    const contacto = pickFirst(lineRaw['ENTREGA | CONTACTO'], quote.contact_name);
    const telefono = pickFirst(lineRaw['ENTREGA | TELEFONO']);
    const email = pickFirst(lineRaw['ENTREGA | EMAIL']);
    const direccion = pickFirst(lineRaw['ENTREGA | DIRECCION']);
    const detalle = pickFirst(lineRaw['ENTREGA | DETALLE']);
    const comentarios = pickFirst(lineRaw['ENTREGA | COMENTARIOS']);

    if (!tipo && !contacto && !detalle) return '';

    const leftLines = [];
    if (tipo) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Tipo</span><span class="production-summary-value">${escapeHtml(tipo)}</span></div>`);
    if (contacto) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Contacto</span><span class="production-summary-value">${escapeHtml(contacto)}</span></div>`);
    if (telefono) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Teléfono</span><span class="production-summary-value">${escapeHtml(telefono)}</span></div>`);
    if (email) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Correo</span><span class="production-summary-value">${escapeHtml(email)}</span></div>`);
    if (direccion) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Dirección</span><span class="production-summary-value">${escapeHtml(direccion)}</span></div>`);

    const rightLines = [];
    if (detalle) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Detalle</span><span class="production-summary-value">${escapeHtml(detalle)}</span></div>`);
    if (comentarios) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Comentarios</span><span class="production-summary-value">${escapeHtml(comentarios)}</span></div>`);

    return `
        <div class="production-summary-two-col">
            <div class="production-summary-subsection">
                <div class="production-summary-subsection-title">Forma de Entrega</div>
                ${leftLines.length ? leftLines.join('') : '<div class="production-summary-item"><span class="production-summary-value production-contact-missing-label">&#9888; Sin información de entrega</span></div>'}
            </div>
            <div class="production-summary-subsection">
                ${rightLines.length ? '<div class="production-summary-subsection-title">Detalle de Entrega</div>' + rightLines.join('') : ''}
            </div>
        </div>
    `;
}

function buildSamplesSummary(lineRaw) {
    const envioTipo = pickFirst(lineRaw['MUESTRAS | TIPO']);
    const envioContacto = pickFirst(lineRaw['MUESTRAS | CONTACTO']);
    const envioTelefono = pickFirst(lineRaw['MUESTRAS | TELEFONO']);
    const envioEmail = pickFirst(lineRaw['MUESTRAS | EMAIL']);
    const envioDireccion = pickFirst(lineRaw['MUESTRAS | DIRECCION']);
    const destinoTipo = pickFirst(lineRaw['MUESTRAS | VISTO BUENO']);
    const detalle = pickFirst(lineRaw['MUESTRAS | DETALLE']);

    if (!envioTipo && !destinoTipo && !detalle && !envioContacto && !envioTelefono && !envioEmail && !envioDireccion) return '';

    const leftLines = [];
    if (envioTipo) leftLines.push(`<div class="production-summary-item"><span class="production-summary-label">Tipo</span><span class="production-summary-value">${escapeHtml(envioTipo)}</span></div>`);

    const rightLines = [];
    if (envioContacto) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Contacto</span><span class="production-summary-value">${escapeHtml(envioContacto)}</span></div>`);
    if (envioTelefono) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Teléfono</span><span class="production-summary-value">${escapeHtml(envioTelefono)}</span></div>`);
    if (envioEmail) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Correo</span><span class="production-summary-value">${escapeHtml(envioEmail)}</span></div>`);
    if (envioDireccion) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Dirección</span><span class="production-summary-value">${escapeHtml(envioDireccion)}</span></div>`);
    if (destinoTipo) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Destinatario</span><span class="production-summary-value">${escapeHtml(destinoTipo)}</span></div>`);
    if (detalle) rightLines.push(`<div class="production-summary-item"><span class="production-summary-label">Detalle</span><span class="production-summary-value">${escapeHtml(detalle)}</span></div>`);

    return `
        <div class="production-summary-two-col">
            <div class="production-summary-subsection">
                <div class="production-summary-subsection-title">Envío de Muestras</div>
                ${leftLines.join('')}
            </div>
            <div class="production-summary-subsection">
                <div class="production-summary-subsection-title">Destinatario de Visto Bueno</div>
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
    const productionEndDateRaw = raw.planning_control?.productionEndDate || null;
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
    renderCustomerContact(contactCol, { customerContact, customerPhone, customerEmail });
    var contactEditBtn = contactCol?.querySelector('.production-contact-edit-btn');
    if (contactEditBtn) renderIconButton(contactEditBtn, iconConfigFor('orderEdit', '✏️', '#64748b', 16));
    document.getElementById('orderClientInfoGrid').hidden = false;

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

    samplesSummary.innerHTML = buildSamplesSummary(lineRaw);

    var frontBackProductCards = document.getElementById('orderFrontBackProductCards');
    var frontBackLayout = document.getElementById('orderFrontBackLayout');
    var orderLayout = document.querySelector('#orderContent > .production-order-layout-refined');

    if (frontBackObj) {
        orderLayout?.classList.add('is-frontback-order');
        if (frontBackLayout) frontBackLayout.hidden = false;
        if (frontBackProductCards) frontBackProductCards.hidden = false;
        renderFrontBackLayout({ raw, frontBackObj, sourceQuoteCode, order });
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
    setText('orderConsumptionText', totalFeet > 0 ? parseNumber(totalFeet, ' ft') : '', 'Sin consumo');
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
    setText('orderInkConfigText', inkConfig, 'Sin configuración');
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

    deliverySummary.innerHTML = buildDeliverySummary(lineRaw, quote);

    setText('orderCodeText', order.order_code, 'Sin orden');
    setText('orderQuoteText', sourceQuoteCode || 'Sin cotización');
    setText('orderLineText', sourceLineCode || 'Sin línea');
    setText('orderStateText', stateText, 'Pendiente');
    applyOrderState(document.getElementById('orderStateText'), stateText);
    var groupPill = document.getElementById('orderGroupPill');
    if (groupPill) {
        groupPill.hidden = true;
    }
    setText('orderCreatedText', formatDate(order.created_at || raw.created_on, true), 'Sin fecha');
    setText('orderPromisedDateText', formatDate(promisedDateRaw), 'Pendiente');
    applyScheduleState(document.getElementById('orderPromisedDateText'), promisedDateRaw);
    const scheduledDateText = document.getElementById('orderScheduledDateText');
    const productionEndDateInput = document.getElementById('orderProductionEndDateInput');
    if (productionEndDateInput) {
        productionEndDateInput.value = normalizeDateInputValue(productionEndDateRaw);
        productionEndDateInput.classList.toggle('is-alert', Boolean(raw.planning_control?.productionScheduleAlert));
    }
    if (scheduledDateText && scheduledDateText.type === 'date') {
        scheduledDateText.value = normalizeDateInputValue(scheduledDateRaw);
    } else {
        setText('orderScheduledDateText', formatDate(scheduledDateRaw), 'Pendiente');
        applyScheduleState(scheduledDateText, scheduledDateRaw);
    }
    if (scheduledDateInput) scheduledDateInput.value = normalizeDateInputValue(scheduledDateRaw);

    artSummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Comentarios', value: pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']) },
        { label: 'Orden de Arte', value: pickFirst(lineRaw['ORDEN DE ARTE']) },
        { label: 'Arte en Poder de', value: pickFirst(lineRaw['ARTE EN PODER DE']) }
    ]);
    if (artSummary && artForm && artToggleButton) {
        artSummary.hidden = false;
        artForm.hidden = true;
        setToggleIcon(artToggleButton, false);
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

function renderCreationSummary(data) {
    if (!data || typeof data !== 'object') return '';
    function row(key, val) {
        if (val === null || val === undefined || val === '') return '';
        return '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(key) + ':</span><span class="production-creation-summary-value">' + escapeHtml(String(Array.isArray(val) ? val.join(', ') : val)) + '</span></div>';
    }
    function section(title) {
        return '<div class="production-creation-summary-section">' + escapeHtml(title) + '</div>';
    }
    let html = section('General');
    html += row('Orden', data.orden);
    html += row('Cotización', data.cotizacion);
    html += row('Línea', data.linea);
    html += row('Cliente', data.cliente);
    html += row('Producto', data.producto);
    html += row('Es Frente/Dorso', data.es_frente_dorso ? 'Sí' : 'No');
    html += row('Cantidad', data.cantidad);
    html += row('Costo Total', data.costo_total);
    html += row('Precio Unitario', data.precio_unitario);
    html += section('Producción');
    html += row('Máquina', data.maquina);
    html += row('Sustrato', data.sustrato);
    html += row('Tintas', data.tintas);
    html += row('Pantones', data.pantones);
    html += row('Pies Totales', data.pies_totales);
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
    html += row('Ancho de Core', data.ancho_core);
    html += row('Diámetro de Core', data.diametro_core);
    html += row('Etiquetas por Rollo', data.etiquetas_por_rollo);
    html += row('Tipo de Salida', data.tipo_salida);
    return html;
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
    currentConfig = config;

    currentLoadedOrder = payload.orden;
    try {
        await refreshOrderAttachments();
    } catch (error) {
        currentOrderAttachments = extractAttachments(currentLoadedOrder?.raw_data || {});
    }
    renderOrder(currentLoadedOrder);
    const adminTools = document.getElementById('orderAdminTools');
    if (adminTools) {
        adminTools.hidden = false;
        const summaryBtn = document.getElementById('orderCreationSummaryButton');
        if (summaryBtn) {
            renderIconButton(summaryBtn, iconConfigFor('orderCreationSummary', '\u2699\uFE0F'));
            summaryBtn.hidden = !hasAdminToolsAccess();
        }
        const printBtn = document.getElementById('orderPrintButton');
        if (printBtn) renderIconButton(printBtn, iconConfigFor('orderPrint', '\uD83D\uDDA8\uFE0F'));
        const pdfBtn = document.getElementById('orderPdfButton');
        if (pdfBtn) renderIconButton(pdfBtn, iconConfigFor('orderPdf', '\uD83D\uDCC4'));
    }
    populateDeliverySelects(config);

    const raw = currentLoadedOrder.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
    const partnerCode = pickFirst(raw.customer_code, quote.customer_code);
    if (partnerCode) {
        loadClientContacts(partnerCode).then(populateSamplesContactDropdown).catch(function () {});
    }
}

samplesToggleButton?.addEventListener('click', () => {
    const opening = samplesForm.hidden;
    toggleSection(samplesSummary, samplesForm, samplesToggleButton, opening);
    if (opening) populateDeliverySelects(currentConfig);
});
samplesForm?.addEventListener('submit', (event) => event.preventDefault());
samplesApprovalInput?.addEventListener('change', () => fillSamplesContactFields(samplesApprovalInput.value));
deliveryToggleButton?.addEventListener('click', () => {
    const opening = deliveryForm.hidden;
    toggleSection(deliverySummary, deliveryForm, deliveryToggleButton, opening);
    if (opening) populateDeliverySelects(currentConfig);
});
deliveryForm?.addEventListener('submit', (event) => event.preventDefault());
artToggleButton?.addEventListener('click', () => toggleSection(artSummary, artForm, artToggleButton, artForm.hidden));
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
                phone: deliveryPhoneInput.value,
                email: deliveryEmailInput.value,
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
document.getElementById('orderPrintButton')?.addEventListener('click', () => {
    window.print();
});
document.getElementById('orderPdfButton')?.addEventListener('click', () => {
    const orderCode = currentLoadedOrder?.raw_data?.order_code || currentOrderCode || 'orden';
    const previousTitle = document.title;
    document.title = `Orden_${orderCode}`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 500);
});
document.getElementById('orderCreationSummaryButton')?.addEventListener('click', () => {
    const summary = currentLoadedOrder?.raw_data?.resumen_creacion;
    const body = document.getElementById('orderCreationSummaryBody');
    if (!summary) {
        if (body) body.innerHTML = '<div class="production-summary-empty">No hay datos de creación disponibles.</div>';
        openPopover('orderCreationSummaryPopover');
        return;
    }
    if (body) body.innerHTML = renderCreationSummary(summary);
    openPopover('orderCreationSummaryPopover');
});
document.getElementById('orderAudioRecordButton')?.addEventListener('click', toggleOrderAudioRecording);
document.getElementById('orderAttachmentFileInput')?.addEventListener('change', handleOrderAttachmentUpload);
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

loadOrder().catch((error) => {
    statusBox.textContent = error.message;
});
