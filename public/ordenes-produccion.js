const CONFIG_ENDPOINT = '/api/config/shell';
const PRESENTATION_KEY = 'ordenes-produccion';
const WORK_HOURS = 8;
const QUEUE_DAYS = { normal: 2, cliente_a: 1, urgente: 0 };
const PRIORITY_LABELS = { normal: 'Normal', cliente_a: 'Cliente A', urgente: 'Urgente' };

const ordersSearchInput = document.getElementById('ordersSearchInput');
const ordersSortSelect = document.getElementById('ordersSortSelect');
const ordersSummary = document.getElementById('ordersSummary');
const ordersTableBody = document.getElementById('ordersTableBody');
const listView = document.getElementById('ordersListView');
const semaforoView = document.getElementById('ordersSemaforoView');
const kanbanView = document.getElementById('ordersKanbanView');
const drawer = document.getElementById('ordersEstimateDrawer');
const bufferInput = document.getElementById('estimateBufferInput');
const bufferValue = document.getElementById('estimateBufferValue');
const resultBox = document.getElementById('estimateResultBox');
const saveEstimateButton = document.getElementById('estimateSaveButton');

let browserConfig = null;
let orders = [];
let currentView = 'list';
let currentFilter = 'all';
let selectedOrder = null;
let selectedPriority = 'normal';
let selectedBuffer = 2;
let currentEstimate = null;
const openRows = new Set();

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatDate(value, withTime = false) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatShortDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });
}

function dateInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function isBusinessDay(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
}

function addBusinessDays(value, days) {
    const date = new Date(value);
    let remaining = Math.max(0, Number(days || 0));
    while (remaining > 0) {
        date.setDate(date.getDate() + 1);
        if (isBusinessDay(date)) remaining -= 1;
    }
    return date;
}

function addWorkHours(value, hours) {
    let date = new Date(value);
    let remaining = Math.max(0, Number(hours || 0));
    if (!Number.isFinite(date.getTime())) date = new Date();
    while (!isBusinessDay(date)) date.setDate(date.getDate() + 1);
    if (date.getHours() < 8) date.setHours(8, 0, 0, 0);
    if (date.getHours() >= 16) {
        date.setDate(date.getDate() + 1);
        date.setHours(8, 0, 0, 0);
    }
    while (remaining > 0) {
        if (!isBusinessDay(date)) {
            date.setDate(date.getDate() + 1);
            date.setHours(8, 0, 0, 0);
            continue;
        }
        const available = Math.max(0, 16 - date.getHours() - (date.getMinutes() / 60));
        const chunk = Math.min(remaining, available || WORK_HOURS);
        date = new Date(date.getTime() + chunk * 3600000);
        remaining -= chunk;
        if (remaining > 0 && date.getHours() >= 16) {
            date.setDate(date.getDate() + 1);
            date.setHours(8, 0, 0, 0);
        }
    }
    return date;
}

function getPresentationConfig(config, key) {
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const layout = config.layout || {};
    return {
        tabColor: firstFilled(general.tabColorOrdersRoot, presentation.tabColor, general.tabColor, '#7f7f7f'),
        iconSize: Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20
    };
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || source.endsWith('.svg');
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
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

function getOpenIconConfig() {
    const general = browserConfig?.general || {};
    const presentation = getPresentationConfig(browserConfig || {}, PRESENTATION_KEY);
    return {
        value: browserConfig?.icons?.browserOpen || browserConfig?.icons?.tableOpen || '↗',
        color: firstFilled(general.iconColorBrowserOpen, general.iconColorTableOpen, general.iconColor, '#0b81b8'),
        hover: firstFilled(general.iconColorHoverBrowserOpen, general.iconColorHoverTableOpen, '#07638c'),
        size: Number(firstFilled(general.iconSizeBrowserOpen, general.iconSizeTableOpen, presentation.iconSize, 18)) || 18
    };
}

function openRouteInShell(route, label) {
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function applyBrowserConfig(config) {
    browserConfig = config || {};
    const presentation = getPresentationConfig(browserConfig, PRESENTATION_KEY);
    document.documentElement.style.setProperty('--tab-color', presentation.tabColor);
}

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('No se pudo cargar la configuración.');
        applyBrowserConfig(await response.json());
    } catch (error) {
        console.error(error);
    }
}

function routeForOrder(order) {
    return `/orden-produccion/${encodeURIComponent(order.order_code || '')}`;
}

function orderSteps(order) {
    return Array.isArray(order.steps) ? order.steps : [];
}

function stepStatus(step = {}) {
    const status = String(step.routeStatus || '').toUpperCase();
    if (status === 'COMPLETADO') return 'done';
    if (['RUN', 'SETUP', 'PARO'].includes(status)) return 'running';
    return 'pending';
}

function orderProgress(order) {
    const steps = orderSteps(order);
    if (!steps.length) return 0;
    const done = steps.filter((step) => stepStatus(step) === 'done').length;
    const running = steps.filter((step) => stepStatus(step) === 'running').length;
    return Math.round(((done + running * 0.5) / steps.length) * 100);
}

function currentProcess(order) {
    const steps = orderSteps(order);
    const running = steps.find((step) => stepStatus(step) === 'running');
    if (running) return running.processName || 'En proceso';
    const pending = steps.find((step) => stepStatus(step) === 'pending');
    if (pending) return pending.processName || 'Pendiente';
    return 'Terminada';
}

function preferredDeliveryDate(order) {
    const planning = order.planning || {};
    return planning.estimatedDeliveryDateLate || planning.scheduledDeliveryDate || planning.promisedDeliveryDate || planning.productionEndDate || order.created_at;
}

function orderStatus(order) {
    const steps = orderSteps(order);
    if (steps.length && steps.every((step) => stepStatus(step) === 'done')) return 'done';
    if (steps.some((step) => stepStatus(step) === 'running')) return 'running';
    const days = daysUntil(preferredDeliveryDate(order));
    if (days !== null && days < 0) return 'late';
    if (days !== null && days <= 2) return 'risk';
    return 'ok';
}

function orderSearchText(order) {
    return [
        order.order_code,
        order.quote_code,
        order.line_code,
        order.customer_name,
        order.job_name,
        order.product_name,
        order.salesperson_name,
        order.machine_name,
        order.material_name
    ].join(' ');
}

function filteredOrders() {
    const term = normalizeText(ordersSearchInput?.value || '');
    let visible = orders.filter((order) => {
        if (term && !normalizeText(orderSearchText(order)).includes(term)) return false;
        return currentFilter === 'all' || orderStatus(order) === currentFilter || (currentFilter === 'risk' && orderStatus(order) === 'late');
    });
    const sort = ordersSortSelect?.value || 'date';
    visible = visible.sort((a, b) => {
        if (sort === 'status') {
            const rank = { late: 0, risk: 1, running: 2, ok: 3, done: 4 };
            return (rank[orderStatus(a)] ?? 9) - (rank[orderStatus(b)] ?? 9);
        }
        if (sort === 'progress') return orderProgress(b) - orderProgress(a);
        if (sort === 'code') return String(a.order_code || '').localeCompare(String(b.order_code || ''));
        return String(preferredDeliveryDate(a) || '').localeCompare(String(preferredDeliveryDate(b) || ''));
    });
    return visible;
}

function statusLabel(status) {
    return { done: 'Lista', running: 'En proceso', ok: 'En cola', risk: 'En riesgo', late: 'Atrasada' }[status] || status;
}

function renderSummary() {
    const counts = {
        all: orders.length,
        running: orders.filter((order) => orderStatus(order) === 'running').length,
        risk: orders.filter((order) => ['risk', 'late'].includes(orderStatus(order))).length,
        late: orders.filter((order) => orderStatus(order) === 'late').length,
        estimated: orders.filter((order) => order.planning?.estimatedDeliveryDateLate).length
    };
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    setText('ordersCountAll', counts.all);
    setText('ordersCountLate', counts.late);
    setText('ordersCountRisk', counts.risk);
    setText('ordersCountRunning', counts.running);
    if (ordersSummary) {
        ordersSummary.innerHTML = [
            ['Órdenes', counts.all, ''],
            ['En proceso', counts.running, 'accent'],
            ['En riesgo', counts.risk, 'amber'],
            ['Atrasadas', counts.late, 'red'],
            ['Estimadas', counts.estimated, 'accent']
        ].map(([label, value, cls]) => `
            <article class="orders-summary-stat">
                <span>${escapeHtml(label)}</span>
                <strong class="${escapeHtml(cls)}">${escapeHtml(value)}</strong>
            </article>
        `).join('');
    }
}

function renderPips(order, max = 8) {
    return orderSteps(order).slice(0, max).map((step) => {
        const status = stepStatus(step);
        const cls = status === 'done' ? 'done' : status === 'running' ? 'active' : 'pending';
        return `<span class="orders-step-pip ${cls}" title="${escapeHtml(step.processName || '')}"></span>`;
    }).join('');
}

function estimateButton(order, short = false) {
    const hasEstimate = Boolean(order.planning?.estimatedDeliveryDateLate);
    return `<button type="button" class="orders-estimate-btn${hasEstimate ? ' has-estimate' : ''}" data-action="estimate" data-order="${escapeHtml(order.order_code)}">${hasEstimate ? (short ? 'Est.' : 'Estimada') : 'Estimar'}</button>`;
}

function openLink(order) {
    const openIcon = getOpenIconConfig();
    const route = routeForOrder(order);
    return `<a class="browser-open-link" href="${route}" data-route="${route}" data-label="Orden ${escapeHtml(order.order_code)}" aria-label="Abrir orden ${escapeHtml(order.order_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir orden', 'table-icon-media')}</a>`;
}

function renderOrderCard(order) {
    const status = orderStatus(order);
    const pct = orderProgress(order);
    const delivery = preferredDeliveryDate(order);
    const days = daysUntil(delivery);
    const daysLabel = days === null ? '' : days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`;
    const estimated = order.planning?.estimatedDeliveryDateLate ? `<div class="orders-estimated-note">Rango estimado: ${escapeHtml(formatShortDate(order.planning.estimatedDeliveryDateEarly))} - ${escapeHtml(formatShortDate(order.planning.estimatedDeliveryDateLate))}</div>` : '';
    return `
        <article class="orders-order-row is-${escapeHtml(status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok')}" data-row="${escapeHtml(order.order_code)}">
            <div class="orders-order-head" data-action="toggle" data-order="${escapeHtml(order.order_code)}">
                <div class="orders-code-block">
                    <strong>${escapeHtml(order.order_code)}</strong>
                    <span>${escapeHtml(order.customer_name || 'Sin cliente')}</span>
                    <em>${escapeHtml(order.job_name || order.product_name || 'Sin producto')}</em>
                </div>
                <div class="orders-current-process">${escapeHtml(currentProcess(order))}</div>
                <div class="orders-date-cell">
                    <span>Entrega${daysLabel ? ` · ${escapeHtml(daysLabel)}` : ''}</span>
                    <strong class="${status === 'late' ? 'late' : status === 'risk' ? 'risk' : ''}">${escapeHtml(formatDate(delivery) || 'Sin fecha')}</strong>
                    ${estimated}
                </div>
                <span class="orders-status-badge ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
                ${estimateButton(order)}
                ${openLink(order)}
                <button type="button" class="orders-toggle-btn" aria-label="Expandir orden">⌄</button>
            </div>
            <div class="orders-progress-row">
                <div class="orders-progress-track"><div class="orders-progress-fill ${escapeHtml(status)}" style="width:${pct}%"></div></div>
                <div class="orders-progress-steps">${renderPips(order)}</div>
                <strong>${pct}%</strong>
            </div>
            <div class="orders-order-detail">
                ${renderProcessRows(order)}
            </div>
        </article>
    `;
}

function renderProcessRows(order) {
    const steps = orderSteps(order);
    if (!steps.length) return '<div class="orders-empty-state">No hay procesos configurados.</div>';
    return `
        <div class="orders-process-grid">
            <div class="orders-process-head"><span>Proceso</span><span>Duración</span><span>Máquina</span><span>Estado</span></div>
            ${steps.map((step) => {
                const status = stepStatus(step);
                return `<div class="orders-process-row">
                    <strong>${escapeHtml(step.processName || step.processKey || 'Proceso')}</strong>
                    <span>${escapeHtml(step.durationHours ? `${Number(step.durationHours).toLocaleString('es-CR', { maximumFractionDigits: 1 })} h` : 'Pendiente')}</span>
                    <span>${escapeHtml(step.machineName || '—')}</span>
                    <em class="${escapeHtml(status)}">${escapeHtml({ done: 'Listo', running: 'En proceso', pending: 'Pendiente' }[status])}</em>
                </div>`;
            }).join('')}
        </div>
    `;
}

function renderList() {
    const visible = filteredOrders();
    if (listView) {
        listView.innerHTML = visible.length
            ? visible.map(renderOrderCard).join('')
            : '<div class="orders-empty-state">No hay órdenes que coincidan.</div>';
        openRows.forEach((code) => {
            const row = document.querySelector(`[data-row="${CSS.escape(code)}"]`);
            if (row) row.classList.add('is-open');
        });
    }
}

function renderSemaforo() {
    const visible = filteredOrders();
    if (!semaforoView) return;
    semaforoView.innerHTML = visible.length ? visible.map((order) => {
        const status = orderStatus(order);
        const delivery = preferredDeliveryDate(order);
        return `
            <article class="orders-semaforo-row is-${escapeHtml(status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok')}" data-action="estimate" data-order="${escapeHtml(order.order_code)}">
                <span class="orders-semaforo-dot ${escapeHtml(status)}"></span>
                <strong>${escapeHtml(order.order_code)}</strong>
                <span>${escapeHtml(order.customer_name || 'Sin cliente')}</span>
                <em>${escapeHtml(currentProcess(order))}</em>
                <span>${escapeHtml(formatShortDate(delivery) || 'Sin fecha')}</span>
                ${estimateButton(order, true)}
            </article>
        `;
    }).join('') : '<div class="orders-empty-state">No hay órdenes que coincidan.</div>';
}

function renderKanban() {
    if (!kanbanView) return;
    const columns = { ok: [], running: [], alert: [] };
    filteredOrders().forEach((order) => {
        const status = orderStatus(order);
        if (status === 'done') return;
        if (status === 'running') columns.running.push(order);
        else if (status === 'late' || status === 'risk') columns.alert.push(order);
        else columns.ok.push(order);
    });
    document.getElementById('ordersKanbanOk').textContent = columns.ok.length;
    document.getElementById('ordersKanbanRunning').textContent = columns.running.length;
    document.getElementById('ordersKanbanAlert').textContent = columns.alert.length;
    Object.entries(columns).forEach(([key, items]) => {
        const box = kanbanView.querySelector(`[data-kanban-column="${key}"]`);
        if (!box) return;
        box.innerHTML = items.length ? items.map((order) => {
            const status = orderStatus(order);
            return `
                <article class="orders-kanban-card is-${escapeHtml(status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok')}" data-action="estimate" data-order="${escapeHtml(order.order_code)}">
                    <strong>${escapeHtml(order.order_code)}</strong>
                    <span>${escapeHtml(order.customer_name || 'Sin cliente')}</span>
                    <em>${escapeHtml(currentProcess(order))}</em>
                    <div class="orders-kanban-meta"><span>${escapeHtml(formatShortDate(preferredDeliveryDate(order)) || 'Sin fecha')}</span>${estimateButton(order, true)}</div>
                </article>
            `;
        }).join('') : '<div class="orders-empty-state compact">Sin órdenes</div>';
    });
}

function renderAll() {
    renderSummary();
    if (listView) listView.hidden = currentView !== 'list';
    if (semaforoView) semaforoView.hidden = currentView !== 'sem';
    if (kanbanView) kanbanView.hidden = currentView !== 'kanban';
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === currentView));
    document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button.dataset.filter === currentFilter));
    renderList();
    renderSemaforo();
    renderKanban();
}

function calculateEstimate(order, priority, bufferDays) {
    const steps = orderSteps(order);
    const remaining = steps.filter((step) => stepStatus(step) !== 'done');
    const processHours = remaining.reduce((sum, step) => sum + Math.max(0, Number(step.durationHours || 0)), 0) || Math.max(8, steps.length * 4);
    const queueHours = (QUEUE_DAYS[priority] ?? QUEUE_DAYS.normal) * WORK_HOURS;
    const planning = order.planning || {};
    const plannedBase = planning.productionEndDate || planning.estimatedProductionEndDate;
    const productionEnd = plannedBase ? new Date(plannedBase) : addWorkHours(new Date(), processHours + queueHours);
    const earlyEnd = plannedBase ? new Date(plannedBase) : productionEnd;
    const lateEnd = addBusinessDays(earlyEnd, bufferDays);
    return {
        priority,
        bufferDays,
        processHours,
        queueHours,
        earlyEnd,
        lateEnd,
        confidence: steps.length ? 'Alta' : 'Media'
    };
}

function renderEstimate() {
    if (!selectedOrder) return;
    currentEstimate = calculateEstimate(selectedOrder, selectedPriority, selectedBuffer);
    const priorityLabel = PRIORITY_LABELS[selectedPriority] || 'Normal';
    if (resultBox) {
        resultBox.innerHTML = `
            <div class="orders-estimate-date">${escapeHtml(formatDate(currentEstimate.lateEnd))}</div>
            <div class="orders-estimate-range">Rango visible: ${escapeHtml(formatDate(currentEstimate.earlyEnd))} - ${escapeHtml(formatDate(currentEstimate.lateEnd))}</div>
            <div class="orders-estimate-breakdown">
                <span>Prioridad: <strong>${escapeHtml(priorityLabel)}</strong></span>
                <span>Cola considerada: <strong>${escapeHtml((currentEstimate.queueHours / WORK_HOURS).toLocaleString('es-CR'))} días hábiles</strong></span>
                <span>Producción pendiente: <strong>${escapeHtml(currentEstimate.processHours.toLocaleString('es-CR', { maximumFractionDigits: 1 }))} h</strong></span>
                <span>Colchón posterior: <strong>${escapeHtml(selectedBuffer)} días hábiles</strong></span>
                <span>Confianza: <strong>${escapeHtml(currentEstimate.confidence)}</strong></span>
            </div>
        `;
    }
}

function openEstimate(orderCode) {
    selectedOrder = orders.find((order) => order.order_code === orderCode);
    if (!selectedOrder || !drawer) return;
    const planning = selectedOrder.planning || {};
    selectedPriority = planning.estimatePriority || 'normal';
    selectedBuffer = Number(planning.deliveryBufferBusinessDays ?? 2);
    document.getElementById('estimateOrderCode').textContent = selectedOrder.order_code || 'Orden';
    document.getElementById('estimateOrderMeta').textContent = [selectedOrder.customer_name, selectedOrder.job_name || selectedOrder.product_name].filter(Boolean).join(' · ');
    if (bufferInput) bufferInput.value = selectedBuffer;
    updateBufferLabel();
    document.querySelectorAll('[data-priority]').forEach((button) => button.classList.toggle('is-selected', button.dataset.priority === selectedPriority));
    drawer.hidden = false;
    renderEstimate();
}

function closeEstimate() {
    if (drawer) drawer.hidden = true;
    selectedOrder = null;
    currentEstimate = null;
}

function updateBufferLabel() {
    if (bufferValue) bufferValue.textContent = selectedBuffer === 1 ? '+1 día' : `+${selectedBuffer} días`;
}

async function saveEstimate() {
    if (!selectedOrder || !currentEstimate || !saveEstimateButton) return;
    saveEstimateButton.disabled = true;
    saveEstimateButton.textContent = 'Guardando...';
    try {
        const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(selectedOrder.order_code)}/details`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planningControl: {
                    scheduledDeliveryDate: dateInputValue(currentEstimate.lateEnd),
                    estimatePriority: selectedPriority,
                    deliveryBufferBusinessDays: selectedBuffer,
                    estimatedProductionEndDate: currentEstimate.earlyEnd.toISOString(),
                    estimatedDeliveryDateEarly: currentEstimate.earlyEnd.toISOString(),
                    estimatedDeliveryDateLate: currentEstimate.lateEnd.toISOString(),
                    estimatedAt: new Date().toISOString(),
                    estimatedBy: 'Usuario',
                    estimationConfidence: currentEstimate.confidence
                }
            })
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo guardar la estimación.');
        await loadOrders(ordersSearchInput?.value || '');
        closeEstimate();
    } catch (error) {
        if (resultBox) resultBox.innerHTML = `<div class="orders-estimate-error">${escapeHtml(error.message)}</div>`;
    } finally {
        saveEstimateButton.disabled = false;
        saveEstimateButton.textContent = 'Guardar en la orden';
    }
}

async function loadOrders(search = '') {
    const params = new URLSearchParams({ limit: '300' });
    if (search) params.set('q', search);
    const response = await fetch(`/api/ordenes-produccion?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las órdenes.');
    orders = payload.items || [];
    if (ordersTableBody) ordersTableBody.innerHTML = '';
    renderAll();
}

ordersSearchInput?.addEventListener('input', () => renderAll());
ordersSortSelect?.addEventListener('change', renderAll);

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (link && openRouteInShell(link.dataset.route, link.dataset.label)) {
        event.preventDefault();
        return;
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
        currentFilter = filter.dataset.filter || 'all';
        renderAll();
        return;
    }
    const view = event.target.closest('[data-view]');
    if (view) {
        currentView = view.dataset.view || 'list';
        renderAll();
        return;
    }
    const priority = event.target.closest('[data-priority]');
    if (priority) {
        selectedPriority = priority.dataset.priority || 'normal';
        document.querySelectorAll('[data-priority]').forEach((button) => button.classList.toggle('is-selected', button === priority));
        renderEstimate();
        return;
    }
    const estimateAction = event.target.closest('[data-estimate-action]');
    if (estimateAction?.dataset.estimateAction === 'close') {
        closeEstimate();
        return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    if (actionTarget.dataset.action === 'toggle') {
        const code = actionTarget.dataset.order || '';
        const row = document.querySelector(`[data-row="${CSS.escape(code)}"]`);
        if (!row) return;
        row.classList.toggle('is-open');
        if (row.classList.contains('is-open')) openRows.add(code);
        else openRows.delete(code);
        return;
    }
    if (actionTarget.dataset.action === 'estimate') {
        event.preventDefault();
        event.stopPropagation();
        openEstimate(actionTarget.dataset.order || '');
    }
});

bufferInput?.addEventListener('input', () => {
    selectedBuffer = Number(bufferInput.value || 0);
    updateBufferLabel();
    renderEstimate();
});
saveEstimateButton?.addEventListener('click', saveEstimate);

async function init() {
    try {
        await loadConfig();
        await loadOrders();
    } catch (error) {
        if (listView) listView.innerHTML = `<div class="orders-empty-state">${escapeHtml(error.message)}</div>`;
    }
}

init();
