const summaryBox = document.getElementById('planningQueueSummary');
const listBox = document.getElementById('planningQueueList');
const subtitleBox = document.getElementById('planningQueueSubtitle');
const searchInput = document.getElementById('planningQueueSearchInput');
const openGanttButton = document.getElementById('planningQueueOpenGanttButton');
const openPreturnoButton = document.getElementById('planningQueueOpenPreturnoButton');
const RETURN_REASONS = [
    'Falta definir recursos',
    'Faltan tiempos de proceso',
    'Información de arte incompleta',
    'Sustrato pendiente',
    'Troquel o plancha pendiente',
    'Tintas por confirmar',
    'Fecha prometida requiere revisión'
];

let planningItems = [];

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value, withTime = false) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function shellOpen(route, label) {
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        window.location.href = route;
        return;
    }
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
}

function processStateClass(status) {
    const key = String(status || '').toUpperCase();
    if (key === 'RUN' || key === 'SETUP') return 'running';
    if (key === 'PARO') return 'stop';
    if (key === 'COMPLETADO') return 'done';
    return 'pending';
}

function getOrderHealth(item) {
    const processes = Array.isArray(item.preturnoProcesses) ? item.preturnoProcesses : [];
    const hasStop = processes.some((process) => String(process.routeStatus || '').toUpperCase() === 'PARO');
    const hasMissing = processes.some((process) => Array.isArray(process.missingItems) && process.missingItems.length);
    if (hasStop) return { key: 'danger', label: 'Atencion inmediata' };
    if (hasMissing) return { key: 'warn', label: 'Requiere revision' };
    return { key: 'ok', label: 'Lista para lanzar' };
}

function mergePlanningWithPreturno(queueItems, preturnoItems) {
    const preturnoMap = new Map((preturnoItems || []).map((item) => [normalizeKey(item.orderCode), item]));
    return (queueItems || []).map((item) => {
        const preturno = preturnoMap.get(normalizeKey(item.orderCode)) || null;
        const preturnoProcesses = Array.isArray(preturno?.processes) ? preturno.processes : [];
        const missingFromPreturno = Array.from(new Set(preturnoProcesses.flatMap((process) => process.missingItems || [])));
        const readyFromPreturno = Array.from(new Set(preturnoProcesses.flatMap((process) => process.readyItems || [])));
        return {
            ...item,
            preturno,
            preturnoProcesses,
            missingItems: Array.from(new Set([...(item.missingItems || []), ...missingFromPreturno])),
            readyItems: readyFromPreturno,
            attachmentCount: preturnoProcesses.reduce((sum, process) => sum + Number(process.attachmentCount || 0), 0),
            additionalCount: preturnoProcesses.reduce((sum, process) => sum + Number(process.additionalCount || 0), 0)
        };
    });
}

function renderSummary(items) {
    const urgent = items.filter((item) => item.promisedDeliveryDate).length;
    const blocked = items.filter((item) => getOrderHealth(item).key !== 'ok').length;
    const ready = items.filter((item) => getOrderHealth(item).key === 'ok').length;
    const attention = items.filter((item) => getOrderHealth(item).key === 'danger').length;
    summaryBox.innerHTML = `
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Pendientes</div>
            <div class="planning-queue-metric-value">${items.length}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Con fecha prometida</div>
            <div class="planning-queue-metric-value">${urgent}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Listas para lanzar</div>
            <div class="planning-queue-metric-value">${ready}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Con observaciones</div>
            <div class="planning-queue-metric-value">${blocked}</div>
        </article>
        <article class="planning-queue-metric">
            <div class="planning-queue-metric-label">Atencion inmediata</div>
            <div class="planning-queue-metric-value">${attention}</div>
        </article>
    `;
}

function processCard(process) {
    const missing = Array.isArray(process.missingItems) ? process.missingItems : [];
    const ready = Array.isArray(process.readyItems) ? process.readyItems : [];
    return `
        <div class="planning-queue-process-card">
            <div class="planning-queue-process-head">
                <span class="planning-queue-process-name">${escapeHtml(process.processName || 'Proceso')}</span>
                <span class="planning-queue-process-status ${processStateClass(process.routeStatus)}">${escapeHtml(process.routeStatus || 'PENDIENTE')}</span>
            </div>
            <div class="planning-queue-process-lines">
                <div class="planning-queue-process-line"><span>Maquina</span><strong>${escapeHtml(process.machineLabel || 'Sin definir')}</strong></div>
                <div class="planning-queue-process-line"><span>Sustrato</span><strong>${escapeHtml(process.materialLabel || 'Sin definir')}</strong></div>
                <div class="planning-queue-process-line"><span>Troquel / plancha</span><strong>${escapeHtml(process.dieLabel || 'Sin definir')}</strong></div>
                <div class="planning-queue-process-line"><span>Tintas</span><strong>${escapeHtml(String(process.tintCount || 0))}</strong></div>
            </div>
            <div class="planning-queue-process-flags">
                ${ready.length
                    ? ready.map((entry) => `<span class="planning-queue-flag ok">${escapeHtml(entry)} listo</span>`).join('')
                    : '<span class="planning-queue-flag ok">Sin bloqueos criticos</span>'}
                ${missing.map((entry) => `<span class="planning-queue-flag miss">Falta ${escapeHtml(entry)}</span>`).join('')}
            </div>
        </div>
    `;
}

function queueCard(item) {
    const missing = Array.isArray(item.missingItems) ? item.missingItems : [];
    const processList = Array.isArray(item.processList) ? item.processList : [];
    const preturnoProcesses = Array.isArray(item.preturnoProcesses) ? item.preturnoProcesses : [];
    const health = getOrderHealth(item);
    return `
        <article class="planning-queue-card">
            <div class="planning-queue-head">
                <div>
                    <div class="planning-queue-code">${escapeHtml(item.orderCode)}</div>
                    <div class="planning-queue-customer">${escapeHtml(item.customerName || 'Sin cliente')}</div>
                    <div class="planning-queue-meta">
                        <span class="planning-queue-pill">Entrega prometida: ${escapeHtml(formatDate(item.promisedDeliveryDate))}</span>
                        <span class="planning-queue-pill">Trabajo: ${escapeHtml(item.jobName || 'Sin nombre')}</span>
                        <span class="planning-queue-pill">Vendedor: ${escapeHtml(item.salespersonName || 'Sin asignar')}</span>
                        <span class="planning-queue-pill">Adjuntos: ${escapeHtml(String(item.attachmentCount || 0))}</span>
                        <span class="planning-queue-pill">Adicionales: ${escapeHtml(String(item.additionalCount || 0))}</span>
                    </div>
                </div>
                <div class="planning-queue-meta">
                    <span class="planning-queue-health-badge ${health.key}">${escapeHtml(health.label)}</span>
                    ${missing.length
                        ? missing.map((entry) => `<span class="planning-queue-badge-miss">${escapeHtml(entry)}</span>`).join('')
                        : '<span class="planning-queue-badge-ok">Lista para lanzar</span>'}
                </div>
            </div>

            <div class="planning-queue-body">
                <section class="planning-queue-panel">
                    <h3>Base Operativa</h3>
                    <div class="planning-queue-grid">
                        <div class="planning-queue-row"><span>Cotizacion</span><strong>${escapeHtml(item.quoteCode || '')}</strong></div>
                        <div class="planning-queue-row"><span>Linea</span><strong>${escapeHtml(item.lineCode || '')}</strong></div>
                        <div class="planning-queue-row"><span>Cantidad</span><strong>${escapeHtml(String(item.orderedQuantity || 0))}</strong></div>
                        <div class="planning-queue-row"><span>Pies estimados</span><strong>${escapeHtml(String(item.plannedFeet || 0))}</strong></div>
                        <div class="planning-queue-row"><span>Tintas</span><strong>${escapeHtml(String(item.tintCount || 0))}</strong></div>
                        <div class="planning-queue-row"><span>Maquina cotizada</span><strong>${escapeHtml(item.machineName || 'Sin definir')}</strong></div>
                        <div class="planning-queue-row"><span>Sustrato</span><strong>${escapeHtml(item.materialName || 'Sin definir')}</strong></div>
                        <div class="planning-queue-row"><span>Troquel / plancha</span><strong>${escapeHtml(item.dieCode || 'Sin definir')}</strong></div>
                    </div>
                </section>

                <section class="planning-queue-panel">
                    <h3>Procesos y Preturno</h3>
                    <div class="planning-queue-processes">
                        ${processList.length
                            ? processList.map((processKey) => `<span class="planning-queue-process">${escapeHtml(processKey)}</span>`).join('')
                            : '<span class="planning-queue-process">Sin procesos</span>'}
                    </div>
                    <div class="planning-queue-process-grid" style="margin-top:14px">
                        ${preturnoProcesses.length
                            ? preturnoProcesses.map(processCard).join('')
                            : '<div class="planning-queue-text">Todavia no hay detalle de preturno para esta orden.</div>'}
                    </div>
                </section>

                <section class="planning-queue-panel">
                    <h3>Checklist para Planning</h3>
                    <div class="planning-queue-text">${missing.length
                        ? `Pendientes detectados: ${escapeHtml(missing.join(', '))}.`
                        : 'La orden no muestra faltantes criticos para lanzamiento inicial.'}</div>
                    <h3 style="margin-top:14px">Validacion</h3>
                    <div class="planning-queue-text">${escapeHtml(item.createOrderValidation || 'Sin observaciones de creacion.')}</div>
                    <h3 style="margin-top:14px">Comentarios para Planning</h3>
                    <div class="planning-queue-text">${escapeHtml(item.sellerComments || 'Sin comentarios del vendedor.')}</div>
                    <h3 style="margin-top:14px">Resumen de impresion</h3>
                    <div class="planning-queue-text">${escapeHtml(item.printSummary || item.observations || 'Sin notas adicionales.')}</div>
                </section>
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
    const visible = planningItems.filter((item) => [item.orderCode, item.customerName, item.jobName].join(' ').toLowerCase().includes(term));
    const ready = visible.filter((item) => getOrderHealth(item).key === 'ok').length;
    renderSummary(visible);
    subtitleBox.textContent = `Ordenes liberadas por ventas y pendientes de programacion: ${visible.length}. Listas para lanzar: ${ready}.`;
    listBox.innerHTML = visible.length
        ? visible
            .sort((a, b) => {
                const healthRank = { danger: 0, warn: 1, ok: 2 };
                const healthDiff = (healthRank[getOrderHealth(a).key] ?? 9) - (healthRank[getOrderHealth(b).key] ?? 9);
                if (healthDiff !== 0) return healthDiff;
                return String(a.promisedDeliveryDate || '').localeCompare(String(b.promisedDeliveryDate || ''));
            })
            .map(queueCard).join('')
        : '<div class="planning-queue-empty">No hay ordenes pendientes en la cola de planificacion.</div>';
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
    const [queueResponse, preturnoResponse] = await Promise.all([
        fetch('/api/planificacion/lanzamiento'),
        fetch('/api/planificacion/preturno')
    ]);
    const [queuePayload, preturnoPayload] = await Promise.all([
        queueResponse.json(),
        preturnoResponse.json()
    ]);
    if (!queueResponse.ok || !queuePayload.ok) {
        throw new Error(queuePayload.error || 'No se pudo cargar la cola de planificacion.');
    }
    if (!preturnoResponse.ok || !preturnoPayload.ok) {
        throw new Error(preturnoPayload.error || 'No se pudo cargar el detalle de preturno.');
    }
    planningItems = mergePlanningWithPreturno(queuePayload.items || [], preturnoPayload.items || []);
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

listBox?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, order } = button.dataset;
    if (!order) return;

    try {
        if (action === 'open-order') {
            shellOpen(`/orden-produccion/${encodeURIComponent(order)}`, `Orden ${order}`);
            return;
        }
        if (action === 'return-sales') {
            const reason = await askReturnReason(order);
            if (reason === null) return;
            await updatePlanning(order, 'return-sales', reason);
            return;
        }
        if (action === 'launch-gantt') {
            await updatePlanning(order, 'launch-gantt');
        }
    } catch (error) {
        subtitleBox.textContent = error.message;
    }
});

searchInput?.addEventListener('input', renderList);
openGanttButton?.addEventListener('click', () => shellOpen('/planificacion/gantt', 'Gantt'));
openPreturnoButton?.addEventListener('click', () => shellOpen('/planificacion/preturno', 'Preturno'));

refreshQueue().catch((error) => {
    summaryBox.innerHTML = '';
    subtitleBox.textContent = error.message;
    listBox.innerHTML = `<div class="planning-queue-empty">${escapeHtml(error.message)}</div>`;
});
