const summaryBox = document.getElementById('planningQueueSummary');
const listBox = document.getElementById('planningQueueList');
const subtitleBox = document.getElementById('planningQueueSubtitle');
const searchInput = document.getElementById('planningQueueSearchInput');
const openGanttButton = document.getElementById('planningQueueOpenGanttButton');
const queuePanel = document.getElementById('planningQueuePanel');
const trackingPanel = document.getElementById('planningTrackingPanel');
const trackingListBox = document.getElementById('planningTrackingList');
const trackingSortSelect = document.getElementById('trackingSortSelect');
const trackingSearchInput = document.getElementById('planningTrackingSearchInput');
const trackingSearchClear = document.getElementById('planningTrackingSearchClear');
const RETURN_REASONS = [
    'Falta definir recursos',
    'Faltan tiempos de proceso',
    'Información de arte incompleta',
    'Sustrato pendiente',
    'Troquel o plancha pendiente',
    'Tintas por confirmar',
    'Fecha prometida requiere revisión'
];

const PROCESS_LABELS = {
    diseno: 'Diseño',
    preprensa: 'Preprensa',
    impresion: 'Impresión',
    laminado: 'Laminado',
    troquelado: 'Troquelado',
    estampado: 'Estampado',
    barnizado: 'Barniz',
    embosado: 'Embosado',
    numeracion: 'Numeración',
    rebobinado: 'Rebobinado',
    empaque: 'Empaque',
    inventario_salida: 'Salida de inventario'
};

let planningItems = [];
let trackingItems = [];
let planningConfig = { icons: {}, general: {} };
let activePlanningView = 'queue';
let trackingFilter = 'all';
let trackingProcessFilter = '';
let trackingLoaded = false;
let trackingCurrentView = 'list';
const trackingOpenRows = new Set();

const TRACKING_WORK_HRS = 8;
const TRACKING_WORK_DAYS = new Set([1, 2, 3, 4, 5, 6]);
const TRACKING_Q_FACTOR = { normal: 1, premium: .45, urgent: .05 };
const TRACKING_DEFAULT_Q = { normal: 16, premium: 6, urgent: 0 };
const trackingSoftLocks = {};
const trackingImpacts = {};
let trackingDrawerOrder = null;
let trackingDrawerPriority = 'normal';
let trackingDrawerBuffer = 2;
let trackingDrawerResult = null;
const trackingFlowCache = {};

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function iconMarkup(key, fallback, altText) {
    const value = planningConfig.icons?.[key] || fallback;
    if (/^(\/|data:image\/)/i.test(String(value || ''))) {
        return `<img class="planning-queue-btn-icon" src="${escapeHtml(value)}" alt="${escapeHtml(altText || '')}">`;
    }
    return `<span class="planning-queue-btn-icon" aria-hidden="true">${escapeHtml(value)}</span>`;
}

function iconButtonStyle(key) {
    const suffix = {
        planningRefresh: 'PlanningRefresh',
        planningProcessFlip: 'PlanningProcessFlip',
        planningOpenGantt: 'PlanningOpenGantt'
    }[key] || '';
    if (!suffix) return '';
    const general = planningConfig.general || {};
    const color = general[`iconColor${suffix}`] || '#1e516d';
    const hover = general[`iconColorHover${suffix}`] || '#0b81b8';
    const size = Number(general[`iconSize${suffix}`] || 18) || 18;
    return ` style="--planning-icon-color:${escapeHtml(color)};--planning-icon-hover:${escapeHtml(hover)};--config-icon-size:${escapeHtml(size)}px;"`;
}

function iconStyleValue(key) {
    return iconButtonStyle(key).replace(/^ style="/, '').replace(/"$/, '');
}

function formatDate(value, withTime = false) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNumber(value, decimals = 0) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    const fixed = numeric.toFixed(decimals);
    const [intPart, decimalPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return decimalPart && Number(decimalPart) ? `${grouped}.${decimalPart}` : grouped;
}

function daysUntil(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
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

function shellOpen(route, label) {
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        window.location.href = route;
        return;
    }
    window.parent.postMessage({ type: 'erp-open-tab', route: withShellParam(route), label }, window.location.origin);
}

function planningLink(label, value, route) {
    if (!route || !value) return escapeHtml(value || '');
    return `<a class="planning-queue-doc-link" href="${escapeHtml(route)}" data-route="${escapeHtml(route)}" data-label="${escapeHtml(label)}">${escapeHtml(value)}</a>`;
}

function substrateMaterialFromItem(item) {
    const materials = [
        ...(Array.isArray(item.consumptionMaterials) ? item.consumptionMaterials : []),
        ...(Array.isArray(item.materialChecklist) ? item.materialChecklist : [])
    ];
    return materials.find((material) => {
        const family = normalizeKey(material.materialFamily);
        const name = normalizeKey(material.materialName);
        const unit = normalizeKey(material.unit || material.unitCode || '');
        return family.includes('sustrato') || family.includes('substrato') || unit === 'ft' || (!name.includes('tinta') && unit.includes('pie'));
    }) || null;
}

function substrateNameForItem(item) {
    const material = substrateMaterialFromItem(item);
    const current = String(item.materialName || '').trim();
    if (material?.materialName && (!current || /^\d+$/.test(current))) return material.materialName;
    return current || material?.materialName || 'Sin definir';
}

function substrateFeetForItem(item) {
    const material = substrateMaterialFromItem(item);
    if (Number(item.plannedFeet || 0) > 0) return `${formatNumber(item.plannedFeet, 2)} ft`;
    if (material?.quantityDisplay) return material.quantityDisplay;
    if (Number(material?.plannedQuantity || 0) > 0) return `${formatNumber(material.plannedQuantity, 2)} ${material.unitCode || material.unit || 'ft'}`;
    if (Number(material?.quantity || 0) > 0) return `${formatNumber(material.quantity, 2)} ${material.unit || material.unitCode || 'ft'}`;
    if (Number(item.materialQuantity || 0) > 0) return `${formatNumber(item.materialQuantity, 2)} ft`;
    return 'Pendiente';
}

function processLabel(key, fallback = '') {
    return PROCESS_LABELS[key] || fallback || key || 'Proceso';
}

function sourceLabel(value) {
    const key = normalizeKey(value);
    if (key === 'base') return 'BOM';
    if (key === 'registro') return 'Registro';
    return value || 'Material';
}

function getOrderHealth(item) {
    return { key: 'ok', label: 'Lista' };
}

function renderSummary(items) {
    const urgent = items.filter((item) => item.promisedDeliveryDate).length;
    const blocked = items.filter((item) => getOrderHealth(item).key !== 'ok').length;
    const quoted = items.reduce((sum, item) => sum + (Array.isArray(item.quotedProcessList) ? item.quotedProcessList.length : 0), 0);
    summaryBox.innerHTML = `
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Pendientes</div>
            <div class="planning-queue-metric-value">${items.length}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Con entrega</div>
            <div class="planning-queue-metric-value">${urgent}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Con alerta</div>
            <div class="planning-queue-metric-value">${blocked}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Procesos cobrados</div>
            <div class="planning-queue-metric-value">${quoted}</div>
        </article>
    `;
}

function operationalRows(item) {
    const line = (label, value, options = {}) => `
        <div class="planning-queue-summary-line${options.multiline ? ' is-multiline' : ''}">
            <span>${escapeHtml(label)}:</span>
            <strong>${options.html ? value : escapeHtml(value || 'Pendiente')}</strong>
        </div>`;
    const finishes = String(item.finishSummary || '').split(/\s+·\s+|\n/).map((value) => value.trim()).filter(Boolean);
    const finishHtml = finishes.length
        ? `<span class="planning-queue-finish-list">${finishes.map((value) => `<em>${escapeHtml(value)}</em>`).join('')}</span>`
        : 'Pendiente';
    return `
        <div class="planning-queue-summary-lines">
            ${line('Orden', planningLink(`Orden ${item.orderCode || ''}`, item.orderCode || '', `/orden-produccion/${encodeURIComponent(item.orderCode || '')}`), { html: true })}
            ${line('Cotización', planningLink(`Cotización ${item.quoteCode || ''}`, item.quoteCode || '', item.quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(item.quoteCode)}` : ''), { html: true })}
            ${line('Línea', planningLink(`Línea ${item.lineCode || ''}`, item.lineCode || '', item.quoteCode && item.lineCode ? `/calculo-flexografia?quoteId=${encodeURIComponent(item.quoteCode)}&lineId=${encodeURIComponent(item.lineCode)}` : ''), { html: true })}
            ${line('Nombre Producto', item.jobName || item.productName || 'Sin producto')}
            ${line('Dimensiones', item.dimensionsText || 'Pendiente')}
            ${line('Fin Producción', item.productionEndDate ? formatDate(item.productionEndDate) : 'Pendiente')}
            ${line('Fecha Estimada', item.scheduledDeliveryDate ? formatDate(item.scheduledDeliveryDate) : (item.promisedDeliveryDate ? formatDate(item.promisedDeliveryDate) : 'Pendiente'))}
            <div class="planning-queue-summary-spacer"></div>
            ${line('Máquina', item.machineName || 'Sin definir')}
            ${line('Cantidad', formatNumber(item.orderedQuantity || 0))}
            ${line('Sustrato', substrateNameForItem(item))}
            ${line('Pies', substrateFeetForItem(item))}
            ${line('Tintas', item.tintDescription || `${formatNumber(item.tintCount || 0)}${Number(item.tintCount || 0) === 4 ? ' (CMYK)' : ''}`)}
            <div class="planning-queue-summary-spacer"></div>
            ${line('Acabados', finishHtml, { html: true, multiline: true })}
        </div>
    `;
}

function processChecklist(item) {
    const processes = (Array.isArray(item.processChecklist) ? item.processChecklist : [])
        .filter((process) => process.key !== 'acabados')
        .filter((process) => process.quoted || process.selected || process.base);
    if (!processes.length) {
        return '<div class="planning-queue-text">No hay procesos configurados para planificación.</div>';
    }
    return processes.map((process) => {
        const key = process.key || '';
        const label = processLabel(key, process.label);
        return `
            <label class="planning-queue-process-toggle${process.quoted ? ' was-quoted' : ''}">
                <input type="checkbox" data-process-toggle data-order="${escapeHtml(item.orderCode)}" data-process="${escapeHtml(key)}"${process.selected ? ' checked' : ''}>
                <span>${escapeHtml(label)}</span>
                ${process.quoted ? '<em>Cobrado</em>' : ''}
            </label>
        `;
    }).join('');
}

function processLoadSummary(item) {
    const rows = Array.isArray(item.processLoadSummary) ? item.processLoadSummary : [];
    if (!rows.length) return processChecklist(item);
    return rows.map((row) => {
        const title = [processLabel(row.processKey, row.processName), row.machineName].filter(Boolean).join(' - ');
        return `
            <article class="planning-queue-process-load">
                <div class="planning-queue-process-load-head">
                    <strong>${escapeHtml(title || 'Proceso')}</strong>
                    <span>${escapeHtml(formatDate(row.endDate))}</span>
                </div>
                <div class="planning-queue-process-load-line">${escapeHtml(formatNumber(row.ordersAhead || 0))} órdenes delante</div>
                <div class="planning-queue-process-load-line">${escapeHtml(formatNumber(row.daysAhead || 0, 1))} días</div>
                <div class="planning-queue-process-load-line">Capacidad disponible: ${escapeHtml(formatNumber(row.capacityAvailablePct || 0))}%</div>
            </article>
        `;
    }).join('');
}

function processWarnings(item) {
    const processes = Array.isArray(item.processChecklist) ? item.processChecklist : [];
    const disabledQuoted = processes
        .filter((process) => process.quoted && !process.selected)
        .map((process) => processLabel(process.key, process.label));
    if (!disabledQuoted.length) return '';
    return `<div class="planning-queue-process-warning">El proceso fue cobrado y quedó desactivado: ${escapeHtml(disabledQuoted.join(', '))}.</div>`;
}

function attachmentList(item) {
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    if (!attachments.length) return '<div class="planning-queue-text">Esta orden no tiene adjuntos relacionados todavía.</div>';
    return attachments.map((attachment) => {
        const href = attachment.downloadUrl || attachment.value || '';
        const meta = [attachment.notes, attachment.uploadedBy, formatDate(attachment.createdAt, true)].filter(Boolean).join(' · ');
        return `
            <article class="planning-queue-attachment">
                <div class="planning-queue-attachment-main">
                    <strong>${escapeHtml(attachment.label || 'Adjunto')}</strong>
                    ${meta ? `<span>${escapeHtml(meta)}</span>` : ''}
                </div>
                ${href ? `<a class="action-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}
            </article>
        `;
    }).join('');
}

function artworkSlot(item) {
    const artwork = item.artwork || null;
    const imageSrc = artwork && artwork.isImage ? (artwork.downloadUrl || artwork.value || '') : '';
    const fallbackLabel = artwork ? (artwork.label || 'Arte adjunto') : 'Arte pendiente';
    const escapedOrder = escapeHtml(item.orderCode);
    const escapedFallback = escapeHtml(fallbackLabel);
    return `
        <section class="planning-queue-art-slot" aria-label="Arte de la orden">
            <div class="planning-queue-art-head">
                <span>Arte</span>
                <button type="button" class="planning-queue-icon-btn" data-action="refresh-art" data-order="${escapedOrder}" title="Actualizar arte" aria-label="Actualizar arte"${iconButtonStyle('planningRefresh')}>${iconMarkup('planningRefresh', '↻', 'Actualizar arte')}</button>
            </div>
            <div class="planning-queue-art-preview">
                ${imageSrc
                    ? `<img src="${escapeHtml(imageSrc)}" alt="Arte de ${escapedOrder}" onerror="this.onerror=null;var p=this.parentNode;this.remove();var ph=p&&p.querySelector('.planning-queue-art-placeholder');if(ph){ph.hidden=false;ph.textContent='No se pudo cargar la imagen del arte.'}"><div class="planning-queue-art-placeholder" hidden>${escapedFallback}</div>`
                    : `<div class="planning-queue-art-placeholder">${escapedFallback}</div>`}
            </div>
        </section>
    `;
}

function isCmykInkGroup(inkRows, item) {
    if (inkRows.length !== 4) return false;
    if (normalizeKey(item.tintDescription).includes('cmyk')) return true;
    const names = inkRows.map((row) => normalizeKey(row.materialName));
    return ['cian', 'magenta', 'amarilla', 'negra'].every((token) => names.some((name) => name.includes(token)));
}

function queueCard(item) {
    const health = getOrderHealth(item);
    return `
        <article class="planning-queue-card" data-order-card="${escapeHtml(item.orderCode)}">
            <div class="planning-queue-head">
                <div>
                    <div class="planning-queue-code">${escapeHtml(item.orderCode)}</div>
                    <div class="planning-queue-customer">${escapeHtml(item.customerName || 'Sin cliente')}</div>
                    <div class="planning-queue-meta">
                        <span class="planning-queue-pill">Entrega: ${escapeHtml(formatDate(item.promisedDeliveryDate))}</span>
                        <span class="planning-queue-pill">Trabajo: ${escapeHtml(item.jobName || 'Sin nombre')}</span>
                        ${item.customerCode ? `<span class="planning-queue-pill">Cliente: ${escapeHtml(item.customerCode)}</span>` : ''}
                        ${item.quoteStatus ? `<span class="planning-queue-pill">Cotización: ${escapeHtml(item.quoteStatus)}</span>` : ''}
                        <span class="planning-queue-pill">Vendedor: ${escapeHtml(item.salespersonName || 'Sin asignar')}</span>
                        <button type="button" class="planning-queue-pill" data-action="toggle-attachments" data-order="${escapeHtml(item.orderCode)}">Adjuntos: ${escapeHtml(formatNumber(item.attachmentCount || 0))}</button>
                    </div>
                </div>
                <span class="planning-queue-health-badge ${health.key}">${escapeHtml(health.label)}</span>
            </div>
            <div class="planning-queue-attachments" data-attachments-panel hidden>
                ${attachmentList(item)}
            </div>

            <div class="planning-queue-body">
                <section class="planning-queue-panel planning-queue-panel-compact">
                    <div class="planning-queue-panel-head">
                        <h3>Resumen</h3>
                        <button type="button" class="planning-queue-icon-btn" data-action="flip-processes" data-order="${escapeHtml(item.orderCode)}" title="Ver procesos" aria-label="Ver procesos"${iconButtonStyle('planningProcessFlip')}>${iconMarkup('planningProcessFlip', '↔', 'Ver procesos')}</button>
                    </div>
                    <div class="planning-queue-flip" data-flip-card>
                        <div class="planning-queue-flip-inner">
                            <div class="planning-queue-flip-face planning-queue-flip-front">
                                <div class="planning-queue-grid planning-queue-grid-compact">
                                    ${operationalRows(item)}
                                </div>
                            </div>
                            <div class="planning-queue-flip-face planning-queue-flip-back">
                                <div class="planning-queue-processes planning-queue-process-selector">
                                    ${processLoadSummary(item)}
                                </div>
                                ${processWarnings(item)}
                            </div>
                        </div>
                    </div>
                </section>

                ${artworkSlot(item)}
            </div>

            <div class="planning-queue-card-actions">
                <button type="button" class="action-btn" data-action="open-order" data-order="${escapeHtml(item.orderCode)}">Abrir orden</button>
                <button type="button" class="action-btn" data-action="return-sales" data-order="${escapeHtml(item.orderCode)}">Devolver a ventas</button>
                <button type="button" class="action-btn action-btn-primary" data-action="launch-gantt" data-order="${escapeHtml(item.orderCode)}">Lanzar al Gantt</button>
            </div>
        </article>
    `;
}

function renderList() {
    const term = String(searchInput.value || '').trim().toLowerCase();
    const visible = planningItems.filter((item) => [item.orderCode, item.customerName, item.jobName, item.productName].join(' ').toLowerCase().includes(term));
    const ready = visible.filter((item) => getOrderHealth(item).key === 'ok').length;
    renderSummary(visible);
    subtitleBox.textContent = `Órdenes liberadas por ventas: ${visible.length}. Listas para lanzar: ${ready}.`;
    listBox.innerHTML = visible.length
        ? visible
            .sort((a, b) => {
                const healthRank = { warn: 0, ok: 1 };
                const healthDiff = (healthRank[getOrderHealth(a).key] ?? 9) - (healthRank[getOrderHealth(b).key] ?? 9);
                if (healthDiff !== 0) return healthDiff;
                return String(a.promisedDeliveryDate || '').localeCompare(String(b.promisedDeliveryDate || ''));
            })
            .map(queueCard).join('')
        : '<div class="planning-queue-empty">No hay órdenes pendientes en la cola de planificación.</div>';
}

const TRACKING_PROCESS_ICONS = {
    orden_creada: '•',
    solicitud_vendedor: '›',
    planeacion: '◎',
    diseno: '✎',
    preprensa: '■',
    visto_bueno: '✓',
    impresion: '▣',
    rebobinado: '↻',
    empaque: '□',
    inventario_salida: '↑'
};
const TRACKING_HIDDEN_PROCESS_KEYS = new Set(['inventario_salida', 'planchas', 'tintas']);

function visibleTrackingSteps(steps = []) {
    return steps.filter((step) => !TRACKING_HIDDEN_PROCESS_KEYS.has(step.processKey));
}

function trackingStepStatus(step = {}) {
    const status = normalizeKey(step.routeStatus || step.status);
    if (status.includes('complet')) return 'done';
    if (status === 'run' || status.includes('proceso') || status === 'setup' || status === 'paro') return 'running';
    return 'pending';
}

function trackingOrderStatus(order = {}) {
    const steps = visibleTrackingSteps(Array.isArray(order.steps) ? order.steps : []);
    const productionSteps = steps.filter((step) => !['orden_creada', 'solicitud_vendedor', 'planeacion'].includes(step.processKey));
    const late = daysUntil(order.promisedDeliveryDate || order.scheduledDeliveryDate || order.productionEndDate) < 0;
    if (late && productionSteps.some((step) => trackingStepStatus(step) !== 'done')) return 'late';
    if (productionSteps.length && productionSteps.every((step) => trackingStepStatus(step) === 'done')) return 'done';
    if (productionSteps.some((step) => trackingStepStatus(step) === 'running')) return 'running';
    const days = daysUntil(order.promisedDeliveryDate || order.scheduledDeliveryDate || order.productionEndDate);
    if (days !== null && days <= 2) return 'risk';
    return 'ok';
}

function trackingProgress(steps = []) {
    const visible = visibleTrackingSteps(steps);
    if (!visible.length) return 0;
    const done = visible.filter((step) => trackingStepStatus(step) === 'done').length;
    const running = visible.filter((step) => trackingStepStatus(step) === 'running').length;
    return Math.round(((done + (running * 0.5)) / visible.length) * 100);
}

function trackingCurrentProcess(order = {}) {
    const steps = visibleTrackingSteps(Array.isArray(order.steps) ? order.steps : []);
    const running = steps.find((step) => trackingStepStatus(step) === 'running');
    if (running) return running.processName || processLabel(running.processKey);
    const pending = steps.find((step) => trackingStepStatus(step) === 'pending');
    if (pending) return pending.processName || processLabel(pending.processKey);
    return 'Terminada';
}

function trackingHasPendingProcess(order = {}, processKey = '') {
    if (!processKey) return true;
    return visibleTrackingSteps(Array.isArray(order.steps) ? order.steps : [])
        .some((step) => step.processKey === processKey && trackingStepStatus(step) === 'pending');
}

function trackingSearchText(order = {}) {
    return [
        order.orderCode,
        order.customerName,
        order.jobName,
        order.productName,
        order.salespersonName,
        substrateNameForItem(order),
        order.materialName,
        order.finishSummary
    ].join(' ').toLowerCase();
}

function trackingBuildSteps(o) {
    const steps = Array.isArray(o.steps) ? o.steps : [];
    return steps.filter(s => s.processKey !== 'orden_creada' && s.processKey !== 'solicitud_vendedor' && s.processKey !== 'planeacion');
}

function trackingCalcPct(steps) {
    if (!steps.length) return 0;
    const done = steps.filter(s => (s.routeStatus || '').toUpperCase() === 'COMPLETADO').length;
    const active = steps.filter(s => ['RUN', 'SETUP'].includes((s.routeStatus || '').toUpperCase())).length;
    return Math.round((done + active * .5) / steps.length * 100);
}

function trackingCurrentProcLabel(steps) {
    const a = steps.find(s => ['RUN', 'SETUP'].includes((s.routeStatus || '').toUpperCase()));
    if (a) return a.processName || processLabel(a.processKey) || a.processKey;
    const p = steps.find(s => (s.routeStatus || '').toUpperCase() === 'PENDIENTE');
    return p ? `Siguiente: ${p.processName || processLabel(p.processKey) || p.processKey}` : 'Terminada';
}

function trackingAddWorkHours(from, hours) {
    let d = new Date(from), rem = hours;
    while (!TRACKING_WORK_DAYS.has(d.getDay())) d.setDate(d.getDate() + 1);
    if (d.getHours() < 8) d.setHours(8, 0, 0, 0);
    while (rem > 0) {
        const avail = Math.min(rem, 16 - d.getHours());
        d.setHours(d.getHours() + avail);
        rem -= avail;
        if (rem > 0) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); while (!TRACKING_WORK_DAYS.has(d.getDay())) d.setDate(d.getDate() + 1); }
    }
    return d;
}

function trackingEstimate(order, priority, bufferDays) {
    const steps = trackingBuildSteps(order);
    const qf = TRACKING_Q_FACTOR[priority];
    const dq = TRACKING_DEFAULT_Q[priority];
    let cursor = new Date();
    if (cursor.getHours() >= 16) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(8, 0, 0, 0); }
    if (cursor.getHours() < 8) cursor.setHours(8, 0, 0, 0);
    while (!TRACKING_WORK_DAYS.has(cursor.getDay())) cursor.setDate(cursor.getDate() + 1);
    let totalProc = 0, totalQ = 0;
    const detail = steps.map(s => {
        const procH = s.planned?.minutes ? Math.round(s.planned.minutes / 60) : 8;
        const rawQ = dq;
        const qH = rawQ * qf;
        cursor = trackingAddWorkHours(cursor, qH);
        const start = new Date(cursor);
        cursor = trackingAddWorkHours(cursor, procH);
        totalProc += procH; totalQ += qH;
        return { ...s, procH, qH, start, end: new Date(cursor) };
    });
    const bufH = bufferDays * TRACKING_WORK_HRS;
    const earlyEnd = new Date(cursor);
    const lateEnd = trackingAddWorkHours(cursor, bufH);
    const hasLoad = steps.length >= 3;
    const conf = hasLoad ? 'high' : 'med';
    return { detail, earlyEnd, lateEnd, totalProc, totalQ, bufH, conf, priority, bufferDays };
}

function trackingSimulateImpact() {
    Object.keys(trackingSoftLocks).forEach(code => {
        const order = trackingItems.find(o => o.orderCode === code);
        if (!order) return;
        const lock = trackingSoftLocks[code];
        const shifted = trackingAddWorkHours(new Date(lock.earlyEnd), 2 * TRACKING_WORK_HRS);
        const diffDays = Math.round((shifted - new Date(lock.earlyEnd)) / 86400000);
        if (diffDays >= 1) {
            trackingImpacts[code] = { prevDate: lock.earlyEnd, newDate: shifted, days: diffDays };
            order._impacted = true;
        }
    });
    trackingShowImpactAlert();
}

function trackingShowImpactAlert() {
    const n = Object.keys(trackingImpacts).length;
    if (!n) return;
    const alertBanner = document.getElementById('planningTrackingAlert');
    if (!alertBanner) return;
    document.getElementById('trackingAlertCount').textContent = n;
    document.getElementById('trackingAlertTitle').textContent = `${n} orden${n > 1 ? 'es' : ''} desplazada${n > 1 ? 's' : ''} por una urgencia`;
    document.getElementById('trackingAlertMsg').textContent = 'Revisa las ordenes marcadas en rojo y comunica el cambio al cliente.';
    alertBanner.classList.add('visible');
    document.getElementById('trackingCountImpact').textContent = n;
    renderTrackingAll();
}

function trackingOpenDrawer(code) {
    const order = trackingItems.find(o => o.orderCode === code);
    if (!order) return;
    trackingDrawerOrder = order;
    trackingDrawerResult = null;
    document.getElementById('trackingDrawerCode').textContent = code + ' · ' + (order.customerName || '');
    document.getElementById('trackingResultSection').style.display = 'none';
    document.getElementById('trackingBtnCopy').style.display = 'none';
    document.getElementById('trackingCalcBtnText').textContent = 'Calcular fecha estimada';
    const tier = String(order.customerTier || order.clientTier || '').toUpperCase();
    trackingSetPriority(tier === 'A' ? 'premium' : 'normal');
    trackingUpdateBuffer();
    const steps = trackingBuildSteps(order);
    document.getElementById('trackingDrawerProcesses').innerHTML = steps.length
        ? steps.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid var(--tracking-border,#e4e2dc);background:var(--tracking-surface2,#f9f8f6);font-size:12px">
            <span style="font-size:14px">${escapeHtml(TRACKING_PROCESS_ICONS[s.processKey] || '·')}</span>
            <span style="flex:1;font-weight:500;color:var(--tracking-text,#1a1916)">${escapeHtml(s.processName || processLabel(s.processKey) || s.processKey)}</span>
            ${s.planned?.minutes ? `<span style="color:var(--tracking-text3,#9e9c98);font-family:'DM Mono',monospace;font-size:11px">${Math.round(s.planned.minutes / 60)}h</span>` : ''}
            ${s.planned?.machineName ? `<span style="color:var(--tracking-text3,#9e9c98);font-size:11px">${escapeHtml(s.planned.machineName)}</span>` : ''}
          </div>`).join('')
        : '<div style="color:var(--tracking-text3,#9e9c98);font-size:12px;padding:8px">No hay procesos configurados en esta orden.</div>';
    document.getElementById('trackingDrawerOverlay').classList.add('open');
    document.getElementById('trackingDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function trackingCloseDrawer() {
    document.getElementById('trackingDrawerOverlay').classList.remove('open');
    document.getElementById('trackingDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

function trackingSetPriority(p) {
    trackingDrawerPriority = p;
    document.querySelectorAll('[data-tracking-priority]').forEach(el => {
        el.className = 'tracking-priority-opt' + (el.dataset.trackingPriority === p ? ` sel-${p}` : '');
    });
}

function trackingUpdateBuffer() {
    trackingDrawerBuffer = parseInt(document.getElementById('trackingBufferSlider').value) || 0;
    document.getElementById('trackingBufferVal').textContent = trackingDrawerBuffer === 0 ? '0d' : `+${trackingDrawerBuffer}d`;
}

function trackingRunCalc() {
    if (!trackingDrawerOrder) return;
    const btn = document.getElementById('trackingCalcBtn');
    const sp = document.getElementById('trackingCalcSpinner');
    const tx = document.getElementById('trackingCalcBtnText');
    btn.disabled = true; sp.style.display = 'block'; tx.textContent = 'Calculando...';
    setTimeout(() => {
        try {
            const r = trackingEstimate(trackingDrawerOrder, trackingDrawerPriority, trackingDrawerBuffer);
            trackingDrawerResult = r;
            trackingRenderDrawerResult(r);
        } catch (e) { console.error(e); }
        finally { btn.disabled = false; sp.style.display = 'none'; tx.textContent = 'Recalcular'; }
    }, 500);
}

function trackingRenderDrawerResult(r) {
    const { earlyEnd, lateEnd, totalProc, totalQ, bufH, conf, priority, bufferDays } = r;
    const dateCls = priority === 'premium' ? 'premium' : priority === 'urgent' ? 'urgent' : '';
    const earlyStr = formatDateFull(earlyEnd);
    const lateStr = formatDateFull(lateEnd);
    const confLabel = { high: 'Alta confianza', med: 'Confianza media' }[conf];
    const confDot = conf === 'high' ? '◉' : '◎';
    document.getElementById('trackingResDateBig').textContent = earlyStr;
    document.getElementById('trackingResDateBig').className = 'tracking-result-date-big' + (dateCls ? ' ' + dateCls : '');
    document.getElementById('trackingResRange').textContent = bufferDays > 0 ? `Rango: ${earlyStr} – ${lateStr}` : 'Sin colchón — fecha fija';
    document.getElementById('trackingResConf').textContent = `${confDot} ${confLabel}`;
    document.getElementById('trackingResConf').className = 'tracking-result-confidence ' + conf;
    const breakdown = [];
    if (totalProc > 0) breakdown.push({ cls: 'var(--accent)', name: 'Producción', detail: `${trackingBuildSteps(trackingDrawerOrder).length} procesos en secuencia`, hrs: totalProc });
    if (totalQ > 0) breakdown.push({ cls: '#F5A623', name: 'Espera en cola', detail: priority === 'urgent' ? 'Entrada directa' : priority === 'premium' ? 'Cola reducida ~55%' : 'Cola actual de máquinas', hrs: totalQ });
    if (bufH > 0) breakdown.push({ cls: 'var(--tracking-blue,#185FA5)', name: 'Colchón de seguridad', detail: `${bufferDays}d hábil${bufferDays !== 1 ? 'es' : ''} de margen`, hrs: bufH });
    document.getElementById('trackingResBreakdown').innerHTML = breakdown.map(b => `
      <div class="tracking-breakdown-item">
        <div class="tracking-breakdown-dot" style="background:${b.cls}"></div>
        <div class="tracking-breakdown-label"><strong style="color:var(--tracking-text,#1a1916)">${escapeHtml(b.name)}</strong><br><span style="font-size:10px">${escapeHtml(b.detail)}</span></div>
        <div class="tracking-breakdown-hrs">${Math.round(b.hrs)}h</div>
      </div>`).join('');
    let note = '';
    if (totalQ > totalProc) note = '<div class="tracking-queue-warning"><strong>La cola supera la producción</strong>Considera subir la prioridad si la fecha es crítica para el cliente.</div>';
    if (priority === 'premium') note = '<div class="tracking-premium-note"><strong>Cliente A — prioridad activada</strong>Fecha calculada adelantando ~55% de la cola. Confirma disponibilidad con planificación.</div>';
    if (priority === 'urgent') note = '<div class="tracking-premium-note" style="background:var(--tracking-red-bg,rgba(163,45,45,.1));border-color:var(--tracking-red-border,rgba(163,45,45,.3));color:var(--tracking-red,#A32D2D)"><strong>Urgente — entrada directa</strong>Requiere autorización de planificación. Puede desplazar otras órdenes con bloqueo suave.</div>';
    document.getElementById('trackingResNote').innerHTML = note;
    document.getElementById('trackingResultSection').style.display = 'block';
    document.getElementById('trackingBtnCopy').style.display = 'flex';
    if (document.getElementById('trackingLockToggle').checked) {
        trackingSoftLocks[trackingDrawerOrder.orderCode] = { earlyEnd, lateEnd, priority };
        if (priority === 'urgent') { setTimeout(() => { trackingSimulateImpact(); trackingUpdateSummary(); }, 800); }
    }
}

function formatDateFull(d) {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return capitalize(date.toLocaleDateString('es-CR', { weekday: 'long', day: '2-digit', month: 'long' }));
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function trackingCopyResult() {
    if (!trackingDrawerResult || !trackingDrawerOrder) return;
    const { earlyEnd, lateEnd, bufferDays } = trackingDrawerResult;
    const text = bufferDays > 0
        ? `Estimado de entrega ${trackingDrawerOrder.orderCode} (${trackingDrawerOrder.customerName || ''}): entre el ${formatDateFull(earlyEnd)} y el ${formatDateFull(lateEnd)}.`
        : `Estimado de entrega ${trackingDrawerOrder.orderCode} (${trackingDrawerOrder.customerName || ''}): ${formatDateFull(earlyEnd)}.`;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('trackingBtnCopy');
        btn.textContent = 'Copiado al portapapeles';
        setTimeout(() => { btn.textContent = 'Copiar fecha para comunicar al cliente'; }, 2000);
    }).catch(() => {});
}

function renderTrackingProcessRow(step = {}) {
    const status = trackingStepStatus(step);
    const plannedMinutes = Number(step.planned?.minutes || 0);
    const realMinutes = Number(step.real?.minutes || 0);
    const minutes = Math.max(plannedMinutes, realMinutes);
    const pct = status === 'done' ? 100 : status === 'running' ? 55 : 0;
    const dateValue = step.completedAt || step.startedAt || '';
    const dateText = dateValue ? formatDate(dateValue) : '—';
    const machine = step.planned?.machineName || '';
    const statusLabel = { done: 'Listo', running: 'En proceso', pending: 'Pendiente' }[status] || status;
    const icon = TRACKING_PROCESS_ICONS[step.processKey] || '·';
    return `
        <div class="process-row">
            <div class="process-name-cell">
                <div class="process-icon ${status}">${escapeHtml(icon)}</div>
                <div>
                    <div class="process-label">${escapeHtml(step.processName || processLabel(step.processKey))}</div>
                    ${step.notes ? `<div class="process-sublabel">${escapeHtml(step.notes)}</div>` : ''}
                </div>
            </div>
            <div class="duration-cell">
                <div class="duration-track"><div class="duration-fill ${status}" style="width:${pct}%"></div></div>
                ${minutes ? `<div class="duration-hours">${escapeHtml(formatNumber(minutes / 60, 1))}h</div>` : ''}
            </div>
            <div class="process-date-cell${dateValue ? '' : ' pending'}">${escapeHtml(dateText)}</div>
            <div class="process-machine-cell">${escapeHtml(machine || '—')}</div>
            <div class="process-status-cell"><span class="ps-badge ${status}"><span class="ps-dot"></span>${escapeHtml(statusLabel)}</span></div>
        </div>
    `;
}

function renderTrackingOrderCard(order = {}) {
    const steps = visibleTrackingSteps(Array.isArray(order.steps) ? order.steps : []);
    const status = trackingOrderStatus(order);
    const pct = trackingProgress(steps);
    const days = daysUntil(order.promisedDeliveryDate || order.scheduledDeliveryDate || order.productionEndDate);
    const etaDate = formatDate(order.promisedDeliveryDate || order.scheduledDeliveryDate || order.productionEndDate);
    const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : '';
    const statusLabel = { done: 'Lista', running: 'En proceso', ok: 'En cola', risk: 'En riesgo', late: 'Atrasada' }[status] || status;
    const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
    const daysLabel = days === null ? '' : days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`;
    const imp = trackingImpacts[order.orderCode];
    const sl = trackingSoftLocks[order.orderCode];
    const hasEst = !!sl;
    const impactTag = imp ? `<span class="tracking-impact-tag">↑${imp.days}d</span>` : '';
    const pips = steps.slice(0, 8).map((step) => {
        const state = trackingStepStatus(step);
        const cls = state === 'done' ? 'done' : state === 'running' ? 'active' : status === 'late' ? 'late' : 'pending';
        return `<div class="step-pip ${cls}" title="${escapeHtml(step.processName || processLabel(step.processKey))}"></div>`;
    }).join('');
    const finishes = String(order.finishSummary || '').split(/\s+·\s+|\n/).map((value) => value.trim()).filter(Boolean);
    const finishHtml = finishes.length ? finishes.map((value) => `<div>${escapeHtml(value)}</div>`).join('') : '—';
    return `
        <div class="order-row ${rowCls}${imp ? ' has-impact' : ''}" id="tracking-row-${escapeHtml(order.orderCode)}" data-tracking-row="${escapeHtml(order.orderCode)}">
            <div class="order-head" data-action="toggle-tracking-row" data-order="${escapeHtml(order.orderCode)}">
                <div class="order-code-block">
                    <div class="order-code">${escapeHtml(order.orderCode)}${impactTag}</div>
                    <div class="order-customer">${escapeHtml(order.customerName || 'Sin cliente')}</div>
                    <div class="order-product">${escapeHtml(order.jobName || order.productName || 'Sin producto')}</div>
                </div>
                <div class="order-job">${escapeHtml(trackingCurrentProcess(order))}</div>
                <div class="order-eta">
                    <div class="order-eta-label">Entrega${daysLabel ? ` · ${escapeHtml(daysLabel)}` : ''}</div>
                    <div class="order-eta-date ${etaCls}">${escapeHtml(etaDate || 'Sin fecha')}</div>
                    ${sl ? `<div style="font-size:10px;color:var(--accent);margin-top:2px">Est. ${formatDate(sl.earlyEnd)}</div>` : ''}
                </div>
                <button type="button" class="tracking-btn-estimate${hasEst ? ' has-estimate' : ''}" data-action="open-tracking-drawer" data-order="${escapeHtml(order.orderCode)}">${hasEst ? '◈ Estimada' : '◎ Estimar'}</button>
                <span class="order-status-badge ${status}">${escapeHtml(statusLabel)}</span>
                <div class="order-toggle">⌄</div>
            </div>
            <div class="order-progress-row">
                <div class="order-progress-track"><div class="order-progress-fill ${status}" style="width:${pct}%"></div></div>
                <div class="order-progress-steps">${pips}</div>
                <div class="order-pct">${pct}%</div>
            </div>
            <div class="order-detail">
                <div class="tracking-proc-panel">
                    <div class="tracking-proc-panel-header">
                        <span class="tracking-proc-panel-title">Procesos planificados</span>
                        <button type="button" class="tracking-proc-flip-btn" data-action="tracking-flip-card" data-order="${escapeHtml(order.orderCode)}" title="Ver flujo de producción real">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Ver flujo real
                        </button>
                    </div>
                    <div class="tracking-flip-wrap" id="tracking-flip-${escapeHtml(order.orderCode)}">
                        <div class="tracking-flip-inner">
                            <div class="tracking-flip-face front">
                                <div class="process-timeline" style="padding-top:0">
                                    <div class="process-timeline-header">
                                        <div class="pt-col-head">Proceso</div>
                                        <div class="pt-col-head">Progreso</div>
                                        <div class="pt-col-head">Fecha fin</div>
                                        <div class="pt-col-head">Máquina</div>
                                        <div class="pt-col-head">Estado</div>
                                    </div>
                                    ${steps.length ? steps.map(renderTrackingProcessRow).join('') : '<div class="empty-state">No hay procesos configurados.</div>'}
                                </div>
                            </div>
                            <div class="tracking-flip-face back">
                                <div class="tracking-flow-panel" id="tracking-flow-${escapeHtml(order.orderCode)}">
                                    <div class="tracking-flow-loading"><div class="spinner"></div> Cargando flujo...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${imp ? `<div style="padding:10px 20px;background:var(--tracking-red-bg,rgba(163,45,45,.1));border-top:1px solid var(--tracking-red-border,rgba(163,45,45,.3))">
                    <span style="font-size:12px;color:var(--tracking-red,#A32D2D);font-weight:600">Fecha desplazada por urgencia</span>
                    <span style="font-size:11px;color:var(--tracking-red,#A32D2D);margin-left:8px">Fecha anterior: ${formatDate(imp.prevDate)} → Nueva estimación: ${formatDate(imp.newDate)}</span>
                </div>` : ''}
                <div class="order-info-bar is-production">
                    <div class="info-cell info-cell-job"><div class="info-cell-label">Trabajo / Producto</div><div class="info-cell-value">${escapeHtml(order.jobName || order.productName || '—')}</div></div>
                    <div class="info-cell info-cell-machine"><div class="info-cell-label">Máquina</div><div class="info-cell-value">${escapeHtml(order.machineName || '—')}</div></div>
                    <div class="info-cell is-finishes"><div class="info-cell-label">Acabados</div><div class="info-cell-value">${finishHtml}</div></div>
                    <div class="info-cell info-cell-quantity"><div class="info-cell-label">Cantidad</div><div class="info-cell-value">${escapeHtml(order.orderedQuantity ? formatNumber(order.orderedQuantity) : '—')}</div></div>
                    <div class="info-cell info-cell-substrate"><div class="info-cell-label">Sustrato</div><div class="info-cell-value">${escapeHtml(substrateNameForItem(order) || '—')}</div></div>
                    <div class="info-cell info-cell-action"><div class="info-cell-label">Acciones</div><div class="info-cell-value info-cell-actions"><a class="hdr-btn" href="/orden-produccion/${escapeHtml(order.orderCode)}" data-route="/orden-produccion/${escapeHtml(order.orderCode)}" data-label="Orden ${escapeHtml(order.orderCode)}">Ver orden</a></div></div>
                </div>
            </div>
        </div>
    `;
}

function updateTrackingSummary() {
    const counts = {
        total: trackingItems.length,
        running: trackingItems.filter((item) => trackingOrderStatus(item) === 'running').length,
        risk: trackingItems.filter((item) => trackingOrderStatus(item) === 'risk').length,
        late: trackingItems.filter((item) => trackingOrderStatus(item) === 'late').length,
        done: trackingItems.filter((item) => trackingOrderStatus(item) === 'done').length,
        pending: trackingItems.filter((item) => {
            const steps = visibleTrackingSteps(Array.isArray(item.steps) ? item.steps : []);
            const productionSteps = steps.filter((s) => !['orden_creada', 'solicitud_vendedor', 'planeacion'].includes(s.processKey));
            return productionSteps.length > 0 && productionSteps.every((s) => trackingStepStatus(s) === 'pending');
        }).length,
        impact: Object.keys(trackingImpacts).length
    };
    const set = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    set('trackingStatTotal', counts.total);
    set('trackingStatRunning', counts.running);
    set('trackingStatRisk', counts.risk);
    set('trackingStatLate', counts.late);
    set('trackingStatDone', counts.done);
    set('trackingCountAll', counts.total);
    set('trackingCountRunning', counts.running);
    set('trackingCountRisk', counts.risk);
    set('trackingCountLate', counts.late);
    set('trackingCountDone', counts.done);
    set('trackingCountPending', counts.pending);
    set('trackingCountImpact', counts.impact);
}

function trackingIsPending(order) {
    const steps = visibleTrackingSteps(Array.isArray(order.steps) ? order.steps : []);
    const productionSteps = steps.filter((s) => !['orden_creada', 'solicitud_vendedor', 'planeacion'].includes(s.processKey));
    return productionSteps.length > 0 && productionSteps.every((s) => trackingStepStatus(s) === 'pending');
}

function renderTrackingList() {
    renderTrackingAll();
}

function renderTrackingSemaforo(orders) {
    const box = document.getElementById('trackingSemaforoList');
    if (!box) return;
    const stLabels = { done: 'Lista', running: 'En proceso', ok: 'En cola', risk: 'En riesgo', late: 'Atrasada' };
    if (!orders.length) {
        box.innerHTML = '<div class="empty-state">No hay órdenes que coincidan.</div>';
        return;
    }
    box.innerHTML = orders.map(o => {
        const steps = visibleTrackingSteps(Array.isArray(o.steps) ? o.steps : []);
        const status = trackingOrderStatus(o);
        const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
        const eta = formatDate(o.promisedDeliveryDate || o.scheduledDeliveryDate);
        const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok';
        const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
        const imp = trackingImpacts[o.orderCode];
        const sl = trackingSoftLocks[o.orderCode];
        const hasEst = !!sl;
        const daysLabel = days === null ? '' : days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`;
        const pips = steps.slice(0, 12).map(s => {
            const sc = trackingStepStatus(s);
            const cls = sc === 'done' ? 'done' : sc === 'running' ? 'active' : status === 'late' ? 'late' : 'pending';
            return `<div class="tracking-sem-stage ${cls}" title="${escapeHtml(s.processName || processLabel(s.processKey) || '')}"></div>`;
        }).join('');
        return `<div class="tracking-sem-row ${rowCls}${imp ? ' has-impact' : ''}" data-action="toggle-tracking-row" data-order="${escapeHtml(o.orderCode)}">
      <div>
        <div class="tracking-sem-code">${escapeHtml(o.orderCode)}${imp ? `<span style="font-size:9px;color:#A32D2D;font-weight:700;margin-left:4px">↑${imp.days}d</span>` : ''}</div>
        <div class="tracking-sem-customer">${escapeHtml(o.customerName || '—')}</div>
      </div>
      <div class="tracking-sem-process">${escapeHtml(trackingCurrentProcess(o))}</div>
      <div class="tracking-sem-stages">${pips}</div>
      <div class="tracking-sem-light">
        <div class="tracking-sem-dot ${status}"></div>
        <span class="tracking-sem-label">${escapeHtml(stLabels[status] || status)}</span>
      </div>
      <div class="tracking-sem-dates">
        <div class="tracking-sem-eta ${etaCls}">${eta || '—'}</div>
        <div class="tracking-sem-days">${escapeHtml(daysLabel)}</div>
        ${sl ? `<div class="tracking-sem-est">Est. ${formatDate(sl.earlyEnd)}</div>` : ''}
        ${imp ? `<div style="font-size:10px;color:#A32D2D;font-weight:600">→ ${formatDate(imp.newDate)}</div>` : ''}
      </div>
      <button type="button" class="tracking-sem-btn${hasEst ? ' has-estimate' : ''}" data-action="open-tracking-drawer" data-order="${escapeHtml(o.orderCode)}">${hasEst ? '◈ Est.' : '◎ Estimar'}</button>
    </div>`;
    }).join('');
}

function renderTrackingKanban(orders) {
    const cols = { ok: [], running: [], alert: [] };
    orders.forEach(o => {
        const s = trackingOrderStatus(o);
        if (s === 'done') return;
        if (s === 'late' || s === 'risk' || trackingImpacts[o.orderCode]) cols.alert.push(o);
        else if (s === 'running') cols.running.push(o);
        else cols.ok.push(o);
    });
    ['ok', 'running', 'alert'].forEach(col => {
        const box = document.getElementById(`trackingKcol-${col}`);
        const cnt = document.getElementById(`trackingKcCount-${col}`);
        if (!box || !cnt) return;
        cnt.textContent = cols[col].length;
        if (!cols[col].length) { box.innerHTML = '<div class="tracking-kanban-empty">Sin órdenes</div>'; return; }
        box.innerHTML = cols[col].map(o => {
            const steps = visibleTrackingSteps(Array.isArray(o.steps) ? o.steps : []);
            const status = trackingOrderStatus(o);
            const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
            const eta = formatDate(o.promisedDeliveryDate || o.scheduledDeliveryDate);
            const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok';
            const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
            const imp = trackingImpacts[o.orderCode];
            const sl = trackingSoftLocks[o.orderCode];
            const daysLabel = days === null ? '' : days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`;
            const pips = steps.slice(0, 8).map(s => {
                const sc = trackingStepStatus(s);
                const cls = sc === 'done' ? 'done' : sc === 'running' ? 'active' : 'pending';
                return `<div class="tracking-kc-pip ${cls}" title="${escapeHtml(s.processName || processLabel(s.processKey) || '')}"></div>`;
            }).join('');
            return `<div class="tracking-kanban-card ${rowCls}${imp ? ' has-impact' : ''}" data-action="open-tracking-drawer" data-order="${escapeHtml(o.orderCode)}">
        <div class="tracking-kc-code">${escapeHtml(o.orderCode)}${imp ? `<span class="tracking-impact-tag" style="font-size:9px;padding:1px 5px;margin-left:5px">+${imp.days}d</span>` : ''}</div>
        <div class="tracking-kc-customer">${escapeHtml(o.customerName || '—')}</div>
        <div class="tracking-kc-process">${escapeHtml(trackingCurrentProcess(o))}</div>
        <div class="tracking-kc-pips">${pips}</div>
        ${sl ? `<div class="tracking-kc-est">◈ Est. ${formatDate(sl.earlyEnd)}</div>` : ''}
        ${imp ? `<div class="tracking-kc-impact">Desplazada → ${formatDate(imp.newDate)}</div>` : ''}
        <div class="tracking-kc-bottom">
          <div class="tracking-kc-eta ${etaCls}">${eta || 'Sin fecha'}${daysLabel ? ` · ${escapeHtml(daysLabel)}` : ''}</div>
          <button type="button" class="tracking-kc-btn" data-action="open-tracking-drawer" data-order="${escapeHtml(o.orderCode)}">${sl ? '◈' : '◎'} Estimar</button>
        </div>
      </div>`;
        }).join('');
    });
}

function trackingFlipCard(code) {
    const wrap = document.getElementById(`tracking-flip-${code}`);
    const btn = document.querySelector(`[data-action="tracking-flip-card"][data-order="${code}"]`);
    if (!wrap) return;
    const isFlipped = wrap.classList.toggle('flipped');
    if (btn) {
        btn.classList.toggle('active', isFlipped);
        btn.innerHTML = isFlipped
            ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver planificado'
            : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver flujo real';
    }
    if (isFlipped) {
        const front = wrap.querySelector('.tracking-flip-face.front');
        const back = wrap.querySelector('.tracking-flip-face.back');
        if (front && back) wrap.querySelector('.tracking-flip-inner').style.minHeight = (back.scrollHeight || 200) + 'px';
        trackingLoadFlowPanel(code);
    } else {
        const front = wrap.querySelector('.tracking-flip-face.front');
        if (front) wrap.querySelector('.tracking-flip-inner').style.minHeight = front.scrollHeight + 'px';
    }
}

async function trackingLoadFlowPanel(code) {
    const box = document.getElementById(`tracking-flow-${code}`);
    if (!box) return;
    if (trackingFlowCache[code]) { trackingRenderFlowPanel(box, trackingFlowCache[code]); return; }
    box.innerHTML = '<div class="tracking-flow-loading"><div class="spinner"></div> Cargando flujo...</div>';
    try {
        const res = await fetch(`/api/ordenes-produccion/${encodeURIComponent(code)}/seguimiento`);
        if (!res.ok) throw new Error('no-flow');
        const data = await res.json();
        const steps = data.steps || data.items || [];
        trackingFlowCache[code] = steps;
        trackingRenderFlowPanel(box, steps, data.history || []);
    } catch (e) {
        const order = trackingItems.find(o => o.orderCode === code);
        if (order) {
            const steps = trackingBuildSteps(order).map(s => ({
                processKey: s.processKey,
                processName: s.processName || processLabel(s.processKey) || s.processKey,
                routeStatus: (s.routeStatus || 'PENDIENTE').toUpperCase(),
                completedBy: s.completedBy || '',
                completedByPhoto: s.completedByPhoto || '',
                completedAt: s.completedAt || null,
                startedBy: s.startedBy || '',
                startedAt: s.startedAt || null,
                planned: s.planned || {}
            }));
            trackingFlowCache[code] = steps;
            trackingRenderFlowPanel(box, steps);
        } else {
            box.innerHTML = '<div class="tracking-flow-empty">No se pudo cargar el flujo de producción.</div>';
        }
    }
}

function trackingRenderFlowPanel(box, steps, hist) {
    if (!steps || !steps.length) {
        box.innerHTML = '<div class="tracking-flow-empty">No hay flujo de producción registrado para esta orden.</div>';
        return;
    }
    const doneCount = steps.filter(s => String(s.routeStatus || '').toUpperCase() === 'COMPLETADO').length;
    const total = steps.length;
    const pct = Math.round(doneCount / total * 100);
    const cntBg = doneCount === total ? 'var(--accent-bg,#edf7f3)' : doneCount > 0 ? 'rgba(133,79,11,.1)' : 'var(--tracking-surface2,#f9f8f6)';
    const cntClr = doneCount === total ? 'var(--accent)' : doneCount > 0 ? '#854F0B' : 'var(--tracking-text3,#9e9c98)';
    let tlHtml = '';
    steps.forEach((s, i) => {
        const status = String(s.routeStatus || 'PENDIENTE').toUpperCase();
        const isDone = status === 'COMPLETADO';
        const isActive = ['RUN', 'SETUP'].includes(status);
        const isStopped = status === 'PARO';
        const isLast = i === steps.length - 1;
        const markerName = String(s.completedBy || s.startedBy || '').trim();
        const markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim();
        const initials = markerName ? markerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : (isDone ? '✓' : '');
        let nodeCls = 'tracking-flow-tl-node';
        if (isDone) nodeCls += ' done';
        else if (isActive) nodeCls += ' active';
        else if (isStopped) nodeCls += ' stopped';
        if (markerName) nodeCls += ' has-avatar';
        let nodeInner = '';
        if (markerName) {
            if (markerPhoto) {
                nodeInner = `<img src="${escapeHtml(markerPhoto)}" alt="${escapeHtml(markerName)}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:linear-gradient(135deg,var(--tracking-blue,#185FA5),var(--accent));border-radius:50%;color:#fff">${escapeHtml(initials)}</span>`;
            } else {
                nodeInner = `<span style="font-size:11px;font-weight:700">${escapeHtml(initials)}</span>`;
            }
            nodeInner += '<span class="tracking-flow-tl-badge">✓</span>';
        } else if (isDone) {
            nodeInner = '<span>✓</span>';
        } else if (isActive) {
            nodeInner = '<span style="font-size:9px;font-weight:700">▶</span>';
        } else {
            nodeInner = `<span style="font-size:10px;color:var(--tracking-text3,#9e9c98)">${i + 1}</span>`;
        }
        const nextDone = !isLast && String(steps[i + 1]?.routeStatus || '').toUpperCase() === 'COMPLETADO';
        const connector = isLast ? '' : `<div class="tracking-flow-tl-connector ${isDone && nextDone ? 'solid' : 'dashed'}"></div>`;
        const titleCls = isDone ? 'done' : isActive ? 'active' : isStopped ? 'stopped' : 'pending';
        const markerDate = s.completedAt || s.startedAt || '';
        const metaParts = [];
        if (markerName) metaParts.push(escapeHtml(markerName));
        if (markerDate) metaParts.push(trackingFormatFlowDate(markerDate));
        const metaHtml = metaParts.length ? `<div class="tracking-flow-step-meta">${metaParts.join(' · ')}</div>` : '';
        const machine = s.planned?.machineName || '';
        const machHtml = machine ? `<div class="tracking-flow-step-machine">◼ ${escapeHtml(machine)}</div>` : '';
        const mins = s.planned?.minutes || 0;
        const timeHtml = mins > 0 ? `<div class="tracking-flow-step-hint">⏱ ${trackingFormatFlowMins(mins)}</div>` : '';
        tlHtml += `<div class="tracking-flow-tl-row">
      <div class="tracking-flow-tl-left">
        <div class="${nodeCls}">${nodeInner}</div>
        ${connector}
      </div>
      <div class="tracking-flow-tl-content">
        <div class="tracking-flow-step-name ${titleCls}">${escapeHtml(s.processName || 'Proceso')}</div>
        ${metaHtml}${machHtml}${timeHtml}
      </div>
    </div>`;
    });
    let histHtml = '';
    if (hist && hist.length) {
        const rows = hist.slice(0, 6).map(h => `<div class="tracking-flow-hist-row"><span class="tracking-flow-hist-date">${escapeHtml(h.ts || h.date || '')}</span><span>${escapeHtml(h.msg || h.message || '')}</span></div>`).join('');
        histHtml = `<div class="tracking-flow-hist"><div class="tracking-flow-hist-title">Historial</div>${rows}</div>`;
    }
    box.innerHTML = `
    <div class="tracking-flow-panel-head">
      <div class="tracking-flow-panel-title">Flujo de producción</div>
      <span class="tracking-flow-panel-counter" style="background:${cntBg};color:${cntClr}">${doneCount}/${total}</span>
    </div>
    <div class="tracking-flow-progress"><div class="tracking-flow-progress-fill" style="width:${pct}%"></div></div>
    <div class="tracking-flow-tl">${tlHtml}</div>
    ${histHtml}`;
    setTimeout(() => {
        const wrap = box.closest('.tracking-flip-wrap');
        if (wrap) {
            const inner = wrap.querySelector('.tracking-flip-inner');
            const back = wrap.querySelector('.tracking-flip-face.back');
            if (inner && back) inner.style.minHeight = back.scrollHeight + 'px';
        }
    }, 50);
}

function trackingFormatFlowDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function trackingFormatFlowMins(min) {
    const t = Math.round(Number(min || 0));
    if (!t || t <= 0) return '';
    if (t < 60) return t + ' min';
    const h = Math.floor(t / 60), m = t % 60;
    return h + 'h' + (m ? ' ' + m + 'min' : '');
}

function renderTrackingAll() {
    const term = String(trackingSearchInput?.value || '').trim().toLowerCase();
    const sort = trackingSortSelect?.value || 'eta';
    let visible = trackingItems.filter((item) => {
        const matches = !term || trackingSearchText(item).includes(term);
        if (!matches) return false;
        if (!trackingHasPendingProcess(item, trackingProcessFilter)) return false;
        if (trackingFilter === 'pending') return trackingIsPending(item);
        if (trackingFilter === 'impact') return !!trackingImpacts[item.orderCode];
        return trackingFilter === 'all' || trackingOrderStatus(item) === trackingFilter;
    });
    visible = visible.sort((a, b) => {
        if (sort === 'status') {
            const rank = { late: 0, risk: 1, running: 2, ok: 3, done: 4 };
            return (rank[trackingOrderStatus(a)] ?? 9) - (rank[trackingOrderStatus(b)] ?? 9);
        }
        if (sort === 'progress') return trackingProgress(b.steps || []) - trackingProgress(a.steps || []);
        if (sort === 'code') return String(a.orderCode || '').localeCompare(String(b.orderCode || ''));
        return String(a.promisedDeliveryDate || a.scheduledDeliveryDate || '').localeCompare(String(b.promisedDeliveryDate || b.scheduledDeliveryDate || ''));
    });
    if (trackingCurrentView === 'list') {
        trackingListBox.style.display = 'grid';
        document.getElementById('trackingSemaforoHeader').style.display = 'none';
        document.getElementById('trackingSemaforoList').style.display = 'none';
        document.getElementById('trackingKanbanBoard').style.display = 'none';
        trackingListBox.innerHTML = visible.length
            ? visible.map(renderTrackingOrderCard).join('')
            : '<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No hay órdenes que coincidan.</div></div>';
        trackingOpenRows.forEach((code) => {
            const row = document.getElementById(`tracking-row-${code}`);
            if (row) row.classList.add('is-open');
        });
    } else if (trackingCurrentView === 'sem') {
        trackingListBox.style.display = 'none';
        document.getElementById('trackingSemaforoHeader').style.display = 'grid';
        document.getElementById('trackingSemaforoList').style.display = 'grid';
        document.getElementById('trackingKanbanBoard').style.display = 'none';
        renderTrackingSemaforo(visible);
    } else if (trackingCurrentView === 'kanban') {
        trackingListBox.style.display = 'none';
        document.getElementById('trackingSemaforoHeader').style.display = 'none';
        document.getElementById('trackingSemaforoList').style.display = 'none';
        document.getElementById('trackingKanbanBoard').style.display = 'grid';
        renderTrackingKanban(visible);
    }
}

async function refreshTracking() {
    if (!trackingListBox) return;
    const response = await fetch('/api/planificacion/seguimiento');
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo cargar seguimiento de producción.');
    }
    trackingItems = payload.items || [];
    trackingLoaded = true;
    updateTrackingSummary();
    renderTrackingList();
}

async function setPlanningView(view) {
    activePlanningView = view === 'tracking' ? 'tracking' : 'queue';
    document.querySelectorAll('[data-planning-view]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.planningView === activePlanningView);
    });
    document.querySelectorAll('[data-tracking-process]').forEach((button) => {
        button.classList.toggle('is-visible', activePlanningView === 'tracking');
        button.classList.toggle('is-active', activePlanningView === 'tracking' && button.dataset.trackingProcess === trackingProcessFilter);
    });
    if (queuePanel) queuePanel.hidden = activePlanningView !== 'queue';
    if (trackingPanel) trackingPanel.hidden = activePlanningView !== 'tracking';
    if (activePlanningView === 'tracking' && !trackingLoaded) {
        trackingListBox.innerHTML = '<div class="loading-state"><div class="spinner"></div> Cargando órdenes...</div>';
        await refreshTracking().catch((error) => {
            trackingListBox.innerHTML = `<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-text">${escapeHtml(error.message)}</div></div>`;
        });
    }
    if (activePlanningView === 'tracking') renderTrackingList();
}

function askReturnReason(orderCode) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'planning-queue-return-dialog';
        overlay.innerHTML = `
            <div class="planning-queue-return-panel">
                <div class="planning-queue-return-title">Devolver ${escapeHtml(orderCode)} a ventas</div>
                <div class="planning-queue-return-copy">Selecciona un motivo principal y, si hace falta, agrega un detalle corto para que ventas sepa exactamente qué corregir.</div>
                <div id="planningQueueReturnOptions" class="planning-queue-return-options">
                    ${RETURN_REASONS.map((reason, index) => `
                        <button type="button" class="planning-queue-return-option ${index === 0 ? 'is-selected' : ''}" data-reason="${escapeHtml(reason)}">
                            ${escapeHtml(reason)}
                        </button>
                    `).join('')}
                </div>
                <textarea id="planningQueueReturnDetail" class="planning-queue-return-textarea" placeholder="Detalle opcional para ventas..."></textarea>
                <div class="planning-queue-return-actions">
                    <button type="button" class="action-btn" data-action="cancel">Cancelar</button>
                    <button type="button" class="action-btn action-btn-primary" data-action="confirm">Devolver a ventas</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        let selectedReason = RETURN_REASONS[0];
        const optionsBox = overlay.querySelector('#planningQueueReturnOptions');
        const detailBox = overlay.querySelector('#planningQueueReturnDetail');

        function close(result) {
            overlay.remove();
            resolve(result);
        }

        optionsBox?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-reason]');
            if (!button) return;
            selectedReason = button.dataset.reason || RETURN_REASONS[0];
            optionsBox.querySelectorAll('[data-reason]').forEach((item) => item.classList.toggle('is-selected', item === button));
        });

        overlay.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (event.target === overlay || actionButton?.dataset.action === 'cancel') {
                close(null);
                return;
            }
            if (actionButton?.dataset.action === 'confirm') {
                const detail = String(detailBox?.value || '').trim();
                close(detail ? `${selectedReason}. ${detail}` : selectedReason);
            }
        });

        detailBox?.focus();
    });
}

async function refreshQueue() {
    const queueResponse = await fetch('/api/planificacion/lanzamiento');
    const queuePayload = await queueResponse.json();
    if (!queueResponse.ok || !queuePayload.ok) {
        throw new Error(queuePayload.error || 'No se pudo cargar la cola de planificación.');
    }
    planningItems = queuePayload.items || [];
    renderList();
}

async function updatePlanning(orderCode, action, reason = '') {
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}/planning-control`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo actualizar la orden.');
    }
    await refreshQueue();
    if (action === 'launch-gantt') {
        shellOpen(`/planificacion/gantt?orderCode=${encodeURIComponent(orderCode)}&autoplan=1`, `Gantt ${orderCode}`);
    }
}

async function withButtonBusy(button, label, task) {
    if (!button) return task();
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = label;
    try {
        return await task();
    } finally {
        button.disabled = false;
        button.textContent = previousText;
    }
}

async function updatePlanningProcesses(orderCode, selectedProcessKeys) {
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}/planning-control`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-processes', selectedProcessKeys })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo actualizar procesos.');
    }
    await refreshQueue();
}

function selectedProcessesForCard(card) {
    return Array.from(card.querySelectorAll('[data-process-toggle]:checked'))
        .map((input) => input.dataset.process)
        .filter(Boolean);
}

listBox?.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-process-toggle]');
    if (!input) return;
    const card = input.closest('[data-order-card]');
    const orderCode = input.dataset.order || card?.dataset.orderCard;
    if (!card || !orderCode) return;
    try {
        await updatePlanningProcesses(orderCode, selectedProcessesForCard(card));
    } catch (error) {
        subtitleBox.textContent = error.message;
        await refreshQueue().catch(() => {});
    }
});

listBox?.addEventListener('click', async (event) => {
    const docLink = event.target.closest('.planning-queue-doc-link[data-route]');
    if (docLink) {
        event.preventDefault();
        shellOpen(docLink.dataset.route, docLink.dataset.label || docLink.textContent.trim());
        return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, order } = button.dataset;
    if (!order) return;

    try {
        if (action === 'toggle-attachments') {
            const panel = button.closest('[data-order-card]')?.querySelector('[data-attachments-panel]');
            if (panel) panel.hidden = !panel.hidden;
            return;
        }
        if (action === 'flip-processes') {
            const flip = button.closest('[data-order-card]')?.querySelector('[data-flip-card]');
            if (flip) flip.classList.toggle('is-flipped');
            return;
        }
        if (action === 'refresh-art') {
            await withButtonBusy(button, 'Actualizando...', () => refreshQueue());
            return;
        }
        if (action === 'open-order') {
            button.textContent = 'Abriendo...';
            shellOpen(`/orden-produccion/${encodeURIComponent(order)}`, `Orden ${order}`);
            return;
        }
        if (action === 'return-sales') {
            const reason = await askReturnReason(order);
            if (reason === null) return;
            await withButtonBusy(button, 'Devolviendo...', () => updatePlanning(order, 'return-sales', reason));
            return;
        }
        if (action === 'launch-gantt') {
            await withButtonBusy(button, 'Enviando a Gantt...', () => updatePlanning(order, 'launch-gantt'));
        }
    } catch (error) {
        subtitleBox.textContent = error.message;
    }
});

searchInput?.addEventListener('input', () => {
    renderList();
});
trackingSearchInput?.addEventListener('input', renderTrackingList);
trackingSearchClear?.addEventListener('click', () => {
    if (trackingSearchInput) trackingSearchInput.value = '';
    renderTrackingList();
});
document.querySelectorAll('[data-planning-view]').forEach((button) => {
    button.addEventListener('click', () => {
        if ((button.dataset.planningView || 'queue') === 'tracking') trackingProcessFilter = '';
        setPlanningView(button.dataset.planningView || 'queue');
    });
});
document.querySelectorAll('[data-tracking-process]').forEach((button) => {
    button.addEventListener('click', () => {
        trackingProcessFilter = trackingProcessFilter === button.dataset.trackingProcess ? '' : (button.dataset.trackingProcess || '');
        setPlanningView('tracking');
    });
});
document.getElementById('trackingFilterPills')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tracking-filter]');
    if (!button) return;
    trackingFilter = button.dataset.trackingFilter || 'all';
    document.querySelectorAll('[data-tracking-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderTrackingList();
});
trackingSortSelect?.addEventListener('change', renderTrackingList);
document.querySelectorAll('[data-tracking-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
        trackingCurrentView = btn.dataset.trackingView || 'list';
        document.querySelectorAll('[data-tracking-view]').forEach((b) => b.classList.toggle('active', b === btn));
        renderTrackingList();
    });
});
document.querySelectorAll('[data-tracking-priority]').forEach((el) => {
    el.addEventListener('click', () => trackingSetPriority(el.dataset.trackingPriority));
});
document.getElementById('trackingBufferSlider')?.addEventListener('input', trackingUpdateBuffer);
document.getElementById('trackingDrawerOverlay')?.addEventListener('click', trackingCloseDrawer);
document.getElementById('trackingDrawerClose')?.addEventListener('click', trackingCloseDrawer);
document.getElementById('trackingCalcBtn')?.addEventListener('click', trackingRunCalc);
document.getElementById('trackingBtnCopy')?.addEventListener('click', trackingCopyResult);
document.getElementById('trackingAlertClose')?.addEventListener('click', () => {
    document.getElementById('planningTrackingAlert').classList.remove('visible');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') trackingCloseDrawer(); });
trackingListBox?.addEventListener('click', (event) => {
    const link = event.target.closest('[data-route]');
    if (link) {
        event.preventDefault();
        shellOpen(link.dataset.route, link.dataset.label || link.textContent.trim());
        return;
    }
    const drawerBtn = event.target.closest('[data-action="open-tracking-drawer"]');
    if (drawerBtn) {
        event.stopPropagation();
        trackingOpenDrawer(drawerBtn.dataset.order);
        return;
    }
    const flipBtn = event.target.closest('[data-action="tracking-flip-card"]');
    if (flipBtn) {
        event.stopPropagation();
        trackingFlipCard(flipBtn.dataset.order);
        return;
    }
    const head = event.target.closest('[data-action="toggle-tracking-row"]');
    if (!head) return;
    const orderCode = head.dataset.order || '';
    const row = head.closest('[data-tracking-row]');
    if (!row || !orderCode) return;
    const open = row.classList.toggle('is-open');
    if (open) trackingOpenRows.add(orderCode);
    else trackingOpenRows.delete(orderCode);
});
document.getElementById('trackingSemaforoList')?.addEventListener('click', (event) => {
    const drawerBtn = event.target.closest('[data-action="open-tracking-drawer"]');
    if (drawerBtn) {
        event.stopPropagation();
        trackingOpenDrawer(drawerBtn.dataset.order);
        return;
    }
    const row = event.target.closest('[data-action="toggle-tracking-row"]');
    if (row) {
        const code = row.dataset.order;
        const r = document.getElementById(`tracking-row-${code}`);
        if (r) {
            const open = r.classList.toggle('is-open');
            if (open) trackingOpenRows.add(code); else trackingOpenRows.delete(code);
        }
    }
});
document.getElementById('trackingKanbanBoard')?.addEventListener('click', (event) => {
    const drawerBtn = event.target.closest('[data-action="open-tracking-drawer"]');
    if (drawerBtn) {
        event.stopPropagation();
        trackingOpenDrawer(drawerBtn.dataset.order);
    }
});
openGanttButton?.addEventListener('click', () => {
    const previous = openGanttButton.textContent;
    openGanttButton.textContent = 'Abriendo Gantt...';
    shellOpen('/planificacion/gantt', 'Gantt');
    setTimeout(() => { openGanttButton.textContent = previous; }, 1200);
});

Promise.all([
    fetch('/api/config/shell').then((res) => res.ok ? res.json() : {}).catch(() => ({})),
    refreshQueue()
]).then(([config]) => {
    planningConfig = config || planningConfig;
    if (openGanttButton) {
        openGanttButton.setAttribute('style', iconStyleValue('planningOpenGantt'));
        openGanttButton.innerHTML = `${iconMarkup('planningOpenGantt', '◳', 'Ir a Gantt')} <span>Ir a Gantt</span>`;
    }
    renderList();
}).catch((error) => {
    summaryBox.innerHTML = '';
    subtitleBox.textContent = error.message;
    listBox.innerHTML = `<div class="planning-queue-empty">${escapeHtml(error.message)}</div>`;
});

setInterval(() => {
    if (activePlanningView === 'tracking' && trackingLoaded) {
        refreshTracking().catch(() => {});
    }
}, 60000);
