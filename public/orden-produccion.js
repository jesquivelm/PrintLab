
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
const artworkLookupButton = document.getElementById('orderArtworkLookupButton');
const orderFlowToggleButton = document.getElementById('orderFlowToggleButton');
const orderFlowBody = document.getElementById('orderFlowBody');
const scheduledDateInput = document.getElementById('orderScheduledDateInput');

const planningStatusText = document.getElementById('orderPlanningStatusText');
const planningMetaText = document.getElementById('orderPlanningMetaText');
const planningReturnReasonText = document.getElementById('orderPlanningReturnReasonText');
const planningSnapshotSummary = document.getElementById('orderPlanningSnapshotSummary');
const planningSnapshotMeta = document.getElementById('orderPlanningSnapshotMeta');
const planningSnapshotList = document.getElementById('orderPlanningSnapshotList');
const deliveriesBody = document.getElementById('orderDeliveriesBody');
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
const artworkNumberInput = document.getElementById('orderArtworkNumberInput');
const artworkHolderInput = document.getElementById('orderArtworkHolderInput');
const artworkFileInput = document.getElementById('orderArtworkFileInput');
const artSection = document.querySelector('.production-art-section');
const observationsSection = document.querySelector('.production-observations-section');

let currentOrderCode = '';
let currentLoadedOrder = null;
let currentConfig = {};
let currentOutputTypes = [];
let currentOrderAttachments = [];
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
    artwork: '↥',
    toggleClosed: '▾',
    toggleOpen: '▴',
    view: '⌕'
};

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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseNumber(value, suffix = '') {
    const num = Number(value);
    if (!Number.isFinite(num)) return value || '';
    return `${num.toLocaleString('es-CR', { maximumFractionDigits: 2 })}${suffix}`;
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
            name: session.name || session.fullName || session.user || session.username || '',
            fullName: session.fullName || session.name || '',
            permissionName: session.permissionName || '',
            modules: session.modules || {}
        })
    };
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
        parts.push(hasCmyk && Number(detail.tintCount) === 4 ? `${tintCountText} Tintas (CMYK)` : `${tintCountText} Tintas`);
    } else if (hasCmyk) {
        parts.push('4 Tintas (CMYK)');
    }
    if (hasWhite) parts.push('Blanco');
    if (hasDoubleWhite) parts.push('Doble Pasada de Blanco');
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
    const control = getPlanningControl(raw);
    const promisedText = control.promisedDeliveryDate ? formatDate(control.promisedDeliveryDate) : 'Sin fecha prometida';
    planningReturnReasonText.hidden = true;
    planningReturnReasonText.textContent = '';
    if (control.planningStatus === 'EN_GANTT') {
        planningStatusText.textContent = `La orden ya fue lanzada a planificación. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.launchedAt ? `Lanzada al Gantt ${formatDate(control.launchedAt, true)} por ${control.launchedBy || 'usuario actual'}.` : 'La orden ya está activa en el Gantt.';
        releasePlanningButton.disabled = true;
        releasePlanningButton.textContent = 'Ya lanzada a planificación';
        return;
    }
    if (control.planningStatus === 'PENDIENTE_PLANIFICACION') {
        planningStatusText.textContent = `Orden liberada por ventas y pendiente de revisión en planificación. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.salesReleasedAt ? `Liberada ${formatDate(control.salesReleasedAt, true)} por ${control.salesReleasedBy || 'usuario actual'}.` : 'Pendiente de análisis por planificación.';
        releasePlanningButton.disabled = true;
        releasePlanningButton.textContent = 'Pendiente en planificación';
        return;
    }
    if (control.planningStatus === 'DEVUELTA_VENTAS') {
        planningStatusText.textContent = `La orden fue devuelta a ventas. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.returnReason || 'Planificación indicó que la orden requiere ajustes antes de reliberarse.';
        planningReturnReasonText.hidden = false;
        planningReturnReasonText.textContent = control.returnReason ? `Última devolución de planificación: ${control.returnReason}` : 'Última devolución de planificación: pendiente de detalle.';
        releasePlanningButton.disabled = false;
        releasePlanningButton.textContent = 'Reliberar a planificación';
        return;
    }
    planningStatusText.textContent = `Pendiente de revisión de ventas. Entrega prometida: ${promisedText}.`;
    planningMetaText.textContent = 'Cuando ventas confirme la orden, la puede enviar a la cola de planificación.';
    releasePlanningButton.disabled = false;
    releasePlanningButton.textContent = 'Liberar a planificación';
}
async function updatePlanningControl(action) {
    if (!currentOrderCode) return;
    releasePlanningButton.disabled = true;
    const previousText = releasePlanningButton.textContent;
    releasePlanningButton.textContent = 'Guardando...';
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
    } catch (error) {
        releasePlanningButton.disabled = false;
        releasePlanningButton.textContent = previousText;
        planningMetaText.textContent = error.message;
    }
}

function renderPlanningSnapshot(raw = {}) {
    const snapshot = raw.planning_snapshot || raw.planningSnapshot || null;
    const processes = Array.isArray(snapshot?.processes) ? snapshot.processes : [];
    if (!snapshot || !processes.length) {
        planningSnapshotSummary.textContent = 'No hay una ruta de planificación estructurada disponible para esta orden.';
        planningSnapshotMeta.textContent = 'Cuando se regenere o se cree una orden nueva, aquí aparecerán los tiempos por proceso.';
        planningSnapshotList.innerHTML = '<div class="production-order-planning-empty">Sin procesos planeados todavía.</div>';
        return;
    }
    planningSnapshotSummary.textContent = `Ruta base con ${processes.length} proceso(s), ${parseNumber(snapshot.baseFeet)} pies estimados y ${parseNumber(snapshot.tintCount)} tinta(s).`;
    planningSnapshotMeta.textContent = `Generada ${formatDate(snapshot.generatedAt, true)}. Base: ${snapshot.processType || 'Sin tipo'}${snapshot.sourceMachineName ? ` · Máquina sugerida: ${snapshot.sourceMachineName}` : ''}.`;
    planningSnapshotList.innerHTML = processes.map((process) => `
        <article class="production-order-planning-step">
            <div class="production-order-planning-step-head">
                <div class="production-order-planning-step-title">${escapeHtml(process.processName || process.processKey || 'Proceso')}</div>
                <div class="production-order-planning-step-badge">${escapeHtml(String(process.sequenceOrder || ''))}</div>
            </div>
            <div class="production-order-planning-step-grid">
                <div><span>Máquina</span><strong>${escapeHtml(process.machineName || 'Sin definir')}</strong></div>
                <div><span>Duración</span><strong>${escapeHtml(parseNumber(process.durationHours, ' h') || '0 h')}</strong></div>
                <div><span>Setup</span><strong>${escapeHtml(parseNumber(process.setupMinutes, ' min') || '0 min')}</strong></div>
                <div><span>Corrida</span><strong>${escapeHtml(parseNumber(process.runMinutes, ' min') || '0 min')}</strong></div>
            </div>
        </article>
    `).join('');
}

function renderOrderFlowSteps(steps = []) {
    if (!orderFlowBody) return;
    if (!steps.length) {
        orderFlowBody.innerHTML = '<div class="production-summary-empty">Sin marcas de seguimiento registradas.</div>';
        return;
    }
    const doneCount = steps.filter((step) => String(step.routeStatus || '').toUpperCase() === 'COMPLETADO').length;
    orderFlowBody.innerHTML = `
        <div class="production-flow-head">
            <strong>${escapeHtml(doneCount)} de ${escapeHtml(steps.length)} completados</strong>
            <span>${escapeHtml(currentOrderCode || '')}</span>
        </div>
        <div class="production-flow-list">
            ${steps.map((step) => {
                const status = String(step.routeStatus || 'PENDIENTE').toUpperCase();
                const isDone = status === 'COMPLETADO';
                const isActive = ['RUN', 'SETUP', 'PARO'].includes(status);
                return `
                    <article class="production-flow-step${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}">
                        <div class="production-flow-marker">${isDone ? '✓' : step.sequenceOrder}</div>
                        <div class="production-flow-copy">
                            <strong>${escapeHtml(step.processName || 'Proceso')}</strong>
                            <span>${escapeHtml(isDone ? `Completado por ${step.completedBy || 'usuario activo'}` : status.toLowerCase())}</span>
                            <small>${escapeHtml(formatDate(step.completedAt || step.startedAt, true) || 'Pendiente')}</small>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

async function openOrderFlowPopover() {
    if (!currentOrderCode) return;
    openPopover('orderFlowPopover');
    if (orderFlowBody) orderFlowBody.innerHTML = '<div class="production-summary-empty">Cargando seguimiento...</div>';
    try {
        const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(currentOrderCode)}/seguimiento`, {
            headers: sessionHeader()
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el seguimiento.');
        renderOrderFlowSteps(Array.isArray(payload.steps) ? payload.steps : []);
    } catch (error) {
        if (orderFlowBody) orderFlowBody.innerHTML = `<div class="production-summary-empty">${escapeHtml(error.message)}</div>`;
    }
}

function openRoute(route, label) {
    if (shellEmbedded) {
        window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
        return;
    }
    window.location.href = route;
}

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

function updateArtworkSectionConstraint() {
    if (!artSection || !observationsSection) return;
    const artRect = artSection.getBoundingClientRect();
    const observationsRect = observationsSection.getBoundingClientRect();
    if (!artworkSectionBaseHeight) {
        artworkSectionBaseHeight = Math.ceil(artRect.height);
    }
    const gap = 12;
    const available = Math.floor(observationsRect.top - artRect.top - gap);
    if ((artForm.hidden || !artworkSectionMaxHeight) && available > artworkSectionBaseHeight) {
        artworkSectionMaxHeight = available;
    }
    if (!artForm.hidden && artworkSectionMaxHeight > artworkSectionBaseHeight) {
        artSection.style.height = `${artworkSectionMaxHeight}px`;
        artSection.style.maxHeight = `${artworkSectionMaxHeight}px`;
    } else {
        artSection.style.height = '';
        artSection.style.maxHeight = '';
    }
}

function buildPantones(raw = {}, detail = {}) {
    const pantones = [raw['PANTONE 1'], raw['PANTONE 2'], raw['PANTONE 3']].filter(Boolean);
    const pantoneCount = Number(detail.pantoneCount || pantones.length || 0);
    return { count: pantoneCount, items: pantones };
}

function buildNotes(value, fallback = 'Sin observaciones registradas.') {
    return escapeHtml(pickFirst(value, fallback)).replace(/\n/g, '<br>');
}

function openPopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    popover.hidden = false;
    popover.classList.add('is-visible');
    document.body.classList.add('popover-open');
}

function closePopover(id) {
    const popover = document.getElementById(id);
    if (!popover) return;
    popover.hidden = true;
    popover.classList.remove('is-visible');
    if (![...document.querySelectorAll('.calc-popover')].some((node) => !node.hidden)) document.body.classList.remove('popover-open');
}

function renderIconButton(button, iconValue) {
    if (!button) return;
    const value = String(iconValue || '').trim();
    if (!value) {
        button.innerHTML = '';
        return;
    }
    if (/^data:image\//i.test(value)) {
        button.innerHTML = `<img src="${escapeHtml(value)}" alt="" class="icon-image">`;
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
    renderIconButton(pantonesButton, icons.orderPantones || DEFAULT_ICONS.pantones);
    renderIconButton(deliveriesButton, icons.orderDeliveries || DEFAULT_ICONS.deliveries);
    renderIconButton(numberingButton, icons.orderNumbering || DEFAULT_ICONS.numbering);
    renderIconButton(attachmentsButton, icons.orderAttachments || icons.lineAttachments || DEFAULT_ICONS.attachments);
    renderIconButton(artworkLookupButton, icons.browserOpen || DEFAULT_ICONS.view);
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
    const target = new Date(dateValue);
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
    if (!artwork) {
        artworkPreview.classList.add('production-art-preview-compact');
        artworkPreview.innerHTML = '<div class="attachments-empty">Toca o arrastra aquí el arte de la orden.</div>';
        updateArtworkSectionConstraint();
        return;
    }
    const value = String(artwork.value || '').trim();
    artworkPreview.classList.remove('production-art-preview-compact');
    if (/^data:image\//i.test(value)) {
        artworkPreview.innerHTML = `<img src="${escapeHtml(value)}" alt="Arte del producto" class="production-art-image">`;
        updateArtworkSectionConstraint();
        return;
    }
    if (artwork.id && /^image\//i.test(String(artwork.mime_type || ''))) {
        artworkPreview.innerHTML = `<img src="/api/adjuntos/${encodeURIComponent(artwork.id)}/download" alt="Arte del producto" class="production-art-image">`;
        updateArtworkSectionConstraint();
        return;
    }
    artworkPreview.innerHTML = `<div class="production-art-copy"><strong>${escapeHtml(artwork.label || 'Referencia')}</strong><span>${escapeHtml(value)}</span></div>`;
    updateArtworkSectionConstraint();
}

function renderDeliveries(raw = {}) {
    const quantities = [raw['CANTIDAD PRODUCTOS 1'], raw['CANTIDAD PRODUCTOS 2'], raw['CANTIDAD PRODUCTOS 3']].filter((value) => value !== undefined && value !== null && value !== '');
    deliveriesBody.innerHTML = quantities.length
        ? quantities.map((value, index) => `<tr><td>Entrega ${index + 1}</td><td>${escapeHtml(parseNumber(value))}</td><td>${index === 0 ? 'Inicial' : 'Pendiente'}</td></tr>`).join('')
        : '<tr><td>Entrega 1</td><td>Pendiente</td><td>Pendiente</td></tr>';
}

function buildFinishTags(raw = {}, detail = {}, dieCode = '') {
    const tags = [];
    const laminate = pickFirst(raw['ACABADOS | LAMINADO'], raw.LAMINADO);
    const varnish = pickFirst(raw['ACABADOS | BARNIZ'], raw.BARNIZ);
    const foil = pickFirst(raw['ACABADOS | FOIL'], raw.FOIL);
    const emboss = pickFirst(raw['ACABADOS | EMBOSADO'], raw.EMBOSADO);
    const numbering = pickFirst(raw['ACABADOS | NUMERADO'], raw.NUMERADO);
    if (dieCode) tags.push(`Troquelado (${dieCode})`); else tags.push('Troquelado');
    if (laminate) tags.push(`Laminado ${laminate}`.trim());
    if (varnish) tags.push(`Barniz ${varnish}`.trim());
    if (foil) tags.push(`Estampado ${foil}`.trim());
    if (emboss) tags.push(`Embosado ${emboss}`.trim());
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
    artworkNumberInput.value = pickFirst(lineRaw['ORDEN DE ARTE']);
    artworkHolderInput.value = pickFirst(lineRaw['ARTE EN PODER DE']);
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
    const attachments = extractAttachments(raw);
    const noPrint = isNoPrint(detail, lineRaw);
    const pantones = buildPantones(lineRaw, detail);
    const dimensions = buildDimensionsText(detail);
    const quantity = parseNumber(raw.totals?.quantity || order.ordered_quantity);
    const linearFeet = Number(detail.materialFeet || 0);
    const wasteFeet = Number(detail.materialFeetWaste || 0);
    const totalFeet = linearFeet + wasteFeet;
    const labelsPerRoll = Number(detail.labelsPerRoll || 0);
    const rollCount = labelsPerRoll > 0 && Number(raw.totals?.quantity || order.ordered_quantity || 0) > 0 ? Math.ceil(Number(raw.totals?.quantity || order.ordered_quantity || 0) / labelsPerRoll) : '';
    const dieCode = pickFirst(detail.dieCode, lineRaw['GENERAL | TROQUEL | ID'], order.die_code);
    const finishes = buildFinishTags(lineRaw, detail, dieCode);
    const localProductCode = pickFirst(line.product_code, detail.productCode);
    const quoteLineCode = pickFirst(raw.source_line_code, detail.lineCode, line.line_code);
    const showProductId = localProductCode && localProductCode !== quoteLineCode;
    const clientProductCode = pickFirst(lineRaw['ID PRODUCTO CLIENTE'], lineRaw['CODIGO PRODUCTO CLIENTE']);
    const productCodes = [clientProductCode ? `(${clientProductCode})` : '', showProductId ? `(${localProductCode})` : ''].filter(Boolean).join(' ');
    const outputType = pickFirst(detail.outputType, lineRaw['TIPO SALIDA']);
    const stateText = pickFirst(raw.status, 'Pendiente');
    const promisedDateRaw = raw.planning_control?.promisedDeliveryDate || quote.due_on;
    const scheduledDateRaw = raw.planning_control?.scheduledDeliveryDate || raw.scheduled_on;
    const numberingValue = pickFirst(lineRaw['ACABADOS | NUMERADO'], lineRaw.NUMERADO);
    const customerId = pickFirst(raw.customer_code, quote.customer_code);
    const customerName = pickFirst(raw.customer_name, quote.customer_name);
    const customerContact = pickFirst(raw.contact_name, quote.contact_name, lineRaw['CLIENTE | CONTACTO NOMBRE COMPLETO']);
    const customerPhone = pickFirst(raw.phone, quote.phone, lineRaw['CLIENTE | CONTACTO TELEFONO']);
    const customerEmail = pickFirst(raw.email, quote.email, lineRaw['CLIENTE | CONTACTO EMAIL']);
    const customerAddress = pickFirst(lineRaw.STREET, lineRaw['CLIENTE | DIRECCION'], lineRaw['DIRECCION ENTREGA']);
    const sellerName = pickFirst(raw.salesperson_name, quote.salesperson_name, detail.salespersonName);

    statusBox.hidden = true;
    contentBox.hidden = false;
    document.title = `${order.order_code} | Orden de Producción`;
    renderPlanningControl(raw);
    renderPlanningSnapshot(raw);
    renderDeliveries(lineRaw);
    renderArtwork(currentOrderAttachments.length ? currentOrderAttachments : attachments);
    populateEditableForms(raw);

    setOptionalText('orderCustomerSummaryText', [customerName, customerId ? `(${customerId})` : ''].filter(Boolean).join(' '));
    setOptionalText('orderCustomerContactText', [customerContact, customerPhone, customerEmail].filter(Boolean).join(' · '));
    setOptionalText('orderCustomerAddressText', customerAddress);
    setOptionalText('orderSellerText', sellerName);
    document.getElementById('orderCustomerContactRow').hidden = ![customerContact, customerPhone, customerEmail].some(Boolean);
    document.getElementById('orderCustomerAddressRow').hidden = !customerAddress;
    if (sourceQuoteButton) {
        sourceQuoteButton.textContent = [pickFirst(raw.source_quote_code, quote.quote_code), pickFirst(raw.source_line_code, detail.lineCode)].filter(Boolean).join(' / ');
    }

    samplesSummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Muestras', value: pickFirst(lineRaw['MUESTRAS | TIPO']) },
        { label: 'Visto Bueno', value: pickFirst(lineRaw['MUESTRAS | VISTO BUENO']) },
        { label: 'Contacto', value: pickFirst(lineRaw['MUESTRAS | CONTACTO']) },
        { label: 'Detalle', value: [pickFirst(lineRaw['MUESTRAS | DETALLE']), pickFirst(lineRaw['MUESTRAS | TELEFONO']), pickFirst(lineRaw['MUESTRAS | EMAIL']), pickFirst(lineRaw['MUESTRAS | DIRECCION'])].filter(Boolean).join(' · ') }
    ]);

    setOptionalText('orderProductCodesText', productCodes);
    setText('orderJobText', [pickFirst(line.job_name, detail.jobName), dimensions ? `(${dimensions})` : ''].filter(Boolean).join(' '), 'Trabajo sin nombre');
    setOptionalText('orderDimensionsText', '');
    setText('orderQuantityInlineText', quantity, 'Sin cantidad');
    setText('orderArtworkInlineText', pickFirst(lineRaw['ORDEN DE ARTE'], lineRaw['ARTE EN PODER DE'], 'Pendiente'), 'Pendiente');
    setText('orderDieReferenceText', dieCode || 'Sin troquel', 'Sin troquel');

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

    setText('orderMachineText', pickFirst(detail.quotedMachine, line.machine_name, order.machine_name), 'Sin máquina');
    setText('orderMaterialText', pickFirst(detail.materialName, line.material_name, order.material_code), 'Sin sustrato');
    setText('orderFeetText', totalFeet > 0 ? `${parseNumber(linearFeet, ' ft')} + ${parseNumber(wasteFeet, ' ft')} = ${parseNumber(totalFeet, ' ft')}` : '', 'Sin consumo registrado');
    setText('orderRollCountText', rollCount ? parseNumber(rollCount) : '', 'Por definir');

    const inkConfig = buildInkConfig(detail, lineRaw);
    document.getElementById('orderInkBlock').hidden = noPrint;
    setText('orderInkConfigText', inkConfig, 'Sin configuración');
    pantonesButton.hidden = pantones.count <= 0;
    pantonesPopoverBody.innerHTML = pantones.count > 0
        ? `<div class="production-order-popover-summary"><strong>${escapeHtml(parseNumber(pantones.count))} Pantones declarados</strong><span>${escapeHtml(pantones.items.length ? pantones.items.join(' / ') : 'Todavía no hay detalle de pantones cargado.')}</span></div>`
        : '<div class="attachments-empty">Esta orden no tiene pantones declarados.</div>';

    setText('orderCoreWidthText', parseNumber(detail.coreWidth), 'Sin dato');
    setText('orderCoreDiameterText', pickFirst(detail.coreDiameter), 'Sin dato');
    setText('orderRollLabelsText', parseNumber(detail.labelsPerRoll), 'Sin dato');
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

    deliverySummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Tipo de Entrega', value: pickFirst(lineRaw['ENTREGA | TIPO'], quote.delivery_time) },
        { label: 'Contacto de Entrega', value: pickFirst(lineRaw['ENTREGA | CONTACTO'], quote.contact_name) },
        { label: 'Detalle de Entrega', value: pickFirst(lineRaw['ENTREGA | DETALLE'], [lineRaw['ENTREGA | EMAIL'], lineRaw['ENTREGA | TELEFONO'], lineRaw['ENTREGA | DIRECCION'], lineRaw['ENTREGA | COMENTARIOS']].filter(Boolean).join(' / ')) }
    ]);

    setText('orderCodeText', order.order_code, 'Sin orden');
    setText('orderStateText', stateText, 'Pendiente');
    applyOrderState(document.getElementById('orderStateText'), stateText);
    setText('orderCreatedText', formatDate(order.created_at || raw.created_on, true), 'Sin fecha');
    setText('orderPromisedDateText', formatDate(promisedDateRaw), 'Pendiente');
    applyScheduleState(document.getElementById('orderPromisedDateText'), promisedDateRaw);
    setText('orderScheduledDateText', formatDate(scheduledDateRaw), 'Pendiente');
    applyScheduleState(document.getElementById('orderScheduledDateText'), scheduledDateRaw);
    if (scheduledDateInput) scheduledDateInput.value = scheduledDateRaw ? String(scheduledDateRaw).slice(0, 10) : '';

    setText('orderQuantityText', quantity, 'Sin cantidad');
    artSummary.innerHTML = buildSummaryLinesOptional([
        { label: 'Comentarios', value: pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']) },
        { label: 'Orden de Arte', value: pickFirst(lineRaw['ORDEN DE ARTE']) },
        { label: 'Arte en Poder de', value: pickFirst(lineRaw['ARTE EN PODER DE']) }
    ]);

    setHtml('orderFinishNotesText', buildNotes(pickFirst(lineRaw['ACABADOS | OBSERVACIONES'])));
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
}

async function loadOrder() {
    const orderCode = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    currentOrderCode = orderCode;
    const [orderResponse, configResponse, catalogsResponse] = await Promise.all([
        fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}`),
        fetch('/api/config/shell'),
        fetch('/api/catalogs')
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

    sourceQuoteButton.onclick = () => openPopover('orderSourceQuotePopover');
}

samplesToggleButton?.addEventListener('click', () => toggleSection(samplesSummary, samplesForm, samplesToggleButton, samplesForm.hidden));
samplesForm?.addEventListener('submit', (event) => event.preventDefault());
deliveryToggleButton?.addEventListener('click', () => toggleSection(deliverySummary, deliveryForm, deliveryToggleButton, deliveryForm.hidden));
deliveryForm?.addEventListener('submit', (event) => event.preventDefault());
artToggleButton?.addEventListener('click', () => toggleSection(artSummary, artForm, artToggleButton, artForm.hidden));
artForm?.addEventListener('submit', (event) => event.preventDefault());

let samplesSaveTimer = null;
let deliverySaveTimer = null;
let artSaveTimer = null;

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
        saveOrderDetails({
            delivery: {
                mode: deliveryModeInput.value,
                contact: deliveryContactInput.value,
                detail: deliveryDetailInput.value
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
                artworkNumber: artworkNumberInput.value,
                artworkHolder: artworkHolderInput.value
            }
        }).catch((error) => {
            statusBox.hidden = false;
            statusBox.textContent = error.message;
        });
    }, 250);
}

[samplesModeInput, samplesApprovalInput, samplesContactInput, samplesPhoneInput, samplesEmailInput, samplesAddressInput, samplesDetailInput]
    .forEach((field) => field?.addEventListener('input', queueSamplesSave));
[deliveryModeInput, deliveryContactInput, deliveryDetailInput]
    .forEach((field) => field?.addEventListener('input', queueDeliverySave));
[sellerCommentsInput, artworkNumberInput, artworkHolderInput]
    .forEach((field) => field?.addEventListener('input', queueArtSave));

releasePlanningButton?.addEventListener('click', () => updatePlanningControl('release-sales'));
openPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/lanzamiento', 'Cola de planificación'));
popoverPlanningQueueButton?.addEventListener('click', () => openRoute('/planificacion/lanzamiento', 'Cola de planificación'));
openPlanningButton?.addEventListener('click', () => openPopover('orderPlanningPopover'));
stateButton?.addEventListener('click', () => openPopover('orderPlanningPopover'));
pantonesButton?.addEventListener('click', () => openPopover('orderPantonesPopover'));
    if (deliveriesButton) {
        deliveriesButton.title = 'Detalle de entregas';
        deliveriesButton.setAttribute('aria-label', 'Detalle de entregas');
        deliveriesButton.addEventListener('click', () => openPopover('orderDeliveriesPopover'));
    }
numberingButton?.addEventListener('click', () => openPopover('orderNumberingPopover'));
attachmentsButton?.addEventListener('click', () => openPopover('orderAttachmentsPopover'));
orderFlowToggleButton?.addEventListener('click', openOrderFlowPopover);
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
artworkLookupButton?.addEventListener('click', () => artworkNumberInput?.focus());
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
