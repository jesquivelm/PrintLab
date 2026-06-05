const summaryBox = document.getElementById('planningQueueSummary');
const listBox = document.getElementById('planningQueueList');
const subtitleBox = document.getElementById('planningQueueSubtitle');
const searchInput = document.getElementById('planningQueueSearchInput');
const openGanttButton = document.getElementById('planningQueueOpenGanttButton');
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
let planningConfig = { icons: {}, general: {} };

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
    const missing = Array.isArray(item.missingItems) ? item.missingItems : [];
    if (missing.length) return { key: 'warn', label: 'Revisar' };
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
    return `
        <section class="planning-queue-art-slot" aria-label="Arte de la orden">
            <div class="planning-queue-art-head">
                <span>Arte</span>
                <button type="button" class="planning-queue-icon-btn" data-action="refresh-art" data-order="${escapeHtml(item.orderCode)}" title="Actualizar arte" aria-label="Actualizar arte"${iconButtonStyle('planningRefresh')}>${iconMarkup('planningRefresh', '↻', 'Actualizar arte')}</button>
            </div>
            <div class="planning-queue-art-preview">
                ${imageSrc
                    ? `<img src="${escapeHtml(imageSrc)}" alt="Arte de ${escapeHtml(item.orderCode)}"><div class="planning-queue-art-placeholder" hidden>${escapeHtml(fallbackLabel)}</div>`
                    : `<div class="planning-queue-art-placeholder">${escapeHtml(fallbackLabel)}</div>`}
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

function materialChecklist(item) {
    const materials = Array.isArray(item.materialChecklist) ? item.materialChecklist : [];
    if (!materials.length) return '<div class="planning-queue-material-empty">No hay materiales de inventario registrados para validar.</div>';
    const inkRows = materials.filter((material) => normalizeKey(material.materialFamily) === 'tinta' || normalizeKey(material.materialName).includes('tinta'));
    const groupInkRows = isCmykInkGroup(inkRows, item);
    const otherRows = materials.filter((material) => !groupInkRows || !inkRows.includes(material));
    const rows = [];
    if (groupInkRows) {
        const palette = [
            { key: 'C', token: 'cian', color: '#61dce8' },
            { key: 'M', token: 'magenta', color: '#d84aab' },
            { key: 'Y', token: 'amarilla', color: '#f4d735' },
            { key: 'K', token: 'negra', color: '#050505' }
        ];
        const approvalKeys = inkRows.map((row) => row.approvalKey).filter(Boolean);
        rows.push(`
            <label class="planning-queue-material-item planning-queue-material-ink">
                <input type="checkbox" data-material-group="tinta" data-order="${escapeHtml(item.orderCode)}" data-material-keys="${escapeHtml(encodeURIComponent(JSON.stringify(approvalKeys)))}"${inkRows.every((row) => row.checked) ? ' checked' : ''}>
                <span class="planning-queue-material-main">
                    <strong>Tinta</strong>
                    <span>Impresión</span>
                </span>
                <span class="planning-queue-ink-swatches">
                    ${palette.map((ink, index) => {
                        const row = inkRows.find((candidate) => normalizeKey(candidate.materialName).includes(ink.token)) || inkRows[index] || {};
                        const qty = Number(row.plannedQuantity || 0) > 0 ? `${formatNumber(row.plannedQuantity, 2)} ${row.unitCode || 'kg'}` : 'Pendiente';
                        return `<span class="planning-queue-ink-swatch"><i style="background:${ink.color}"></i><em>${escapeHtml(qty)}</em></span>`;
                    }).join('')}
                </span>
            </label>
        `);
    }
    return `
        <div class="planning-queue-material-list">
            ${rows.join('')}
            ${otherRows.map((material) => {
                const qty = Number(material.plannedQuantity || 0) > 0
                    ? `${formatNumber(material.plannedQuantity, 2)} ${material.unitCode || ''}`.trim()
                    : 'Cantidad por definir';
                const meta = [
                    processLabel(material.processKey, material.processKey),
                    qty,
                    material.sapStatus ? `SAP: ${material.sapStatus}` : '',
                    material.requestedAt ? formatDate(material.requestedAt, true) : ''
                ].filter(Boolean).join(' · ');
                return `
                    <label class="planning-queue-material-item">
                        <input type="checkbox" data-material-toggle data-order="${escapeHtml(item.orderCode)}" data-material-key="${escapeHtml(material.approvalKey)}"${material.checked ? ' checked' : ''}>
                        <span class="planning-queue-material-main">
                            <strong>${escapeHtml(material.materialName || material.sapItemCode || 'Material')}</strong>
                            <span>${escapeHtml(meta)}</span>
                            ${material.reason ? `<span>${escapeHtml(material.reason)}</span>` : ''}
                        </span>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

function queueCard(item) {
    const missing = Array.isArray(item.missingItems) ? item.missingItems : [];
    const health = getOrderHealth(item);
    const pendingMaterials = Number(item.pendingMaterials || 0);
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

                <section class="planning-queue-panel planning-queue-material-panel">
                    <h3>Inventario Materia Prima</h3>
                    ${materialChecklist(item)}
                    ${missing.length ? `<div class="planning-queue-process-warning">Pendiente de revisar: ${escapeHtml(missing.join(', '))}.</div>` : ''}
                </section>

                ${artworkSlot(item)}
            </div>

            <div class="planning-queue-card-actions">
                <button type="button" class="action-btn" data-action="open-order" data-order="${escapeHtml(item.orderCode)}">Abrir orden</button>
                <button type="button" class="action-btn" data-action="return-sales" data-order="${escapeHtml(item.orderCode)}">Devolver a ventas</button>
                <button type="button" class="action-btn action-btn-primary" data-action="launch-gantt" data-order="${escapeHtml(item.orderCode)}"${pendingMaterials ? ' disabled title="Aprueba los materiales antes de lanzar"' : ''}>Lanzar al Gantt</button>
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

async function updateMaterialApproval(orderCode, approvalKey, checked) {
    await patchMaterialApproval(orderCode, approvalKey, checked);
    await refreshQueue();
}

async function patchMaterialApproval(orderCode, approvalKey, checked) {
    const response = await fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}/materiales-aprobacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalKey, checked })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo actualizar el material.');
    }
}

function selectedProcessesForCard(card) {
    return Array.from(card.querySelectorAll('[data-process-toggle]:checked'))
        .map((input) => input.dataset.process)
        .filter(Boolean);
}

listBox?.addEventListener('change', async (event) => {
    const materialGroupInput = event.target.closest('[data-material-group]');
    if (materialGroupInput) {
        const card = materialGroupInput.closest('[data-order-card]');
        const orderCode = materialGroupInput.dataset.order || card?.dataset.orderCard;
        let approvalKeys = [];
        try {
            approvalKeys = JSON.parse(decodeURIComponent(materialGroupInput.dataset.materialKeys || '%5B%5D'));
        } catch (error) {
            approvalKeys = [];
        }
        if (!card || !orderCode || !approvalKeys.length) return;
        try {
            for (const approvalKey of approvalKeys) {
                await patchMaterialApproval(orderCode, approvalKey, materialGroupInput.checked);
            }
            await refreshQueue();
        } catch (error) {
            subtitleBox.textContent = error.message;
            await refreshQueue().catch(() => {});
        }
        return;
    }

    const materialInput = event.target.closest('[data-material-toggle]');
    if (materialInput) {
        const card = materialInput.closest('[data-order-card]');
        const orderCode = materialInput.dataset.order || card?.dataset.orderCard;
        const approvalKey = materialInput.dataset.materialKey || '';
        if (!card || !orderCode || !approvalKey) return;
        try {
            await updateMaterialApproval(orderCode, approvalKey, materialInput.checked);
        } catch (error) {
            subtitleBox.textContent = error.message;
            await refreshQueue().catch(() => {});
        }
        return;
    }

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

listBox?.addEventListener('error', (event) => {
    const image = event.target?.closest?.('.planning-queue-art-preview img');
    if (!image) return;
    const fallback = image.nextElementSibling;
    image.remove();
    if (fallback) fallback.hidden = false;
}, true);

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

searchInput?.addEventListener('input', renderList);
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
