const statusBox = document.getElementById('orderStatus');
const contentBox = document.getElementById('orderContent');
const shellEmbedded = new URLSearchParams(window.location.search).get('shell') === '1' || window !== window.parent;
const sourceQuoteButton = document.getElementById('openSourceQuoteButton');
const deliveriesBody = document.getElementById('orderDeliveriesBody');
const artworkPreview = document.getElementById('orderArtworkPreview');
const planningStatusText = document.getElementById('orderPlanningStatusText');
const planningMetaText = document.getElementById('orderPlanningMetaText');
const releasePlanningButton = document.getElementById('orderReleasePlanningButton');
const openPlanningQueueButton = document.getElementById('orderOpenPlanningQueueButton');
const planningReturnReasonText = document.getElementById('orderPlanningReturnReasonText');
const planningSnapshotSummary = document.getElementById('orderPlanningSnapshotSummary');
const planningSnapshotMeta = document.getElementById('orderPlanningSnapshotMeta');
const planningSnapshotList = document.getElementById('orderPlanningSnapshotList');

let currentOrderCode = '';

if (shellEmbedded) {
    document.body.classList.add('shell-embedded');
}

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

function setFieldValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value || '';
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

function getPlanningControl(raw = {}) {
    const existing = raw.planning_control || raw.planningControl || {};
    const promisedDeliveryDate = existing.promisedDeliveryDate || raw.quote_snapshot?.due_on || null;
    const planningStatus = existing.planningStatus
        || (existing.launchedToGantt ? 'EN_GANTT' : existing.salesReleased ? 'PENDIENTE_PLANIFICACION' : 'PENDIENTE_VENTAS');
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
    if (planningReturnReasonText) {
        planningReturnReasonText.hidden = true;
        planningReturnReasonText.textContent = '';
    }
    if (control.planningStatus === 'EN_GANTT') {
        planningStatusText.textContent = `La orden ya fue lanzada a planificación. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.launchedAt
            ? `Lanzada al Gantt ${formatDate(control.launchedAt, true)} por ${control.launchedBy || 'usuario actual'}.`
            : 'La orden ya está activa en el Gantt.';
        releasePlanningButton.disabled = true;
        releasePlanningButton.textContent = 'Ya lanzada al Gantt';
        return;
    }

    if (control.planningStatus === 'PENDIENTE_PLANIFICACION') {
        planningStatusText.textContent = `Orden liberada por ventas y pendiente de revisión en planificación. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.salesReleasedAt
            ? `Liberada ${formatDate(control.salesReleasedAt, true)} por ${control.salesReleasedBy || 'usuario actual'}.`
            : 'Pendiente de análisis por planificación.';
        releasePlanningButton.disabled = true;
        releasePlanningButton.textContent = 'Pendiente en planificación';
        return;
    }

    if (control.planningStatus === 'DEVUELTA_VENTAS') {
        planningStatusText.textContent = `La orden fue devuelta a ventas. Entrega prometida: ${promisedText}.`;
        planningMetaText.textContent = control.returnReason
            ? `Motivo: ${control.returnReason}`
            : 'Planificación indicó que la orden requiere ajustes antes de reliberarse.';
        if (planningReturnReasonText) {
            planningReturnReasonText.hidden = false;
            planningReturnReasonText.textContent = control.returnReason
                ? `Última devolución de planning: ${control.returnReason}`
                : 'Última devolución de planning: pendiente de detalle.';
        }
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el control de planificación.');
        renderPlanningControl(payload.orden?.raw_data || {});
    } catch (error) {
        releasePlanningButton.disabled = false;
        releasePlanningButton.textContent = previousText;
        planningMetaText.textContent = error.message;
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
    const params = new URLSearchParams({
        lineId: lineCode || '',
        quoteId: quoteCode || '',
        productId: productCode || '',
        department: department || ''
    });
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

function applyHeaderConfig(config) {
    const presentation = config.presentations?.ordenes || {};
    const general = config.general || {};
    const branding = config.branding || {};
    const title = presentation.moduleTitle || 'Orden de Produccion';
    document.getElementById('orderPageTitle').textContent = title;
    document.documentElement.style.setProperty('--header-bg-start', presentation.headerBgStart || general.headerBgStart || '#0b81b8');
    document.documentElement.style.setProperty('--header-bg-end', presentation.headerBgEnd || general.headerBgEnd || '#17abdf');
    document.documentElement.style.setProperty(
        '--tab-color',
        pickFirst(general.tabColorOrdersChild, general.tabColorOrdersRoot, presentation.tabColor, general.tabColor, '#7f7f7f')
    );
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
}

function buildInkConfig(detail, raw) {
    const parts = [];
    if (String(raw['CMYK'] || '').toLowerCase() === 'si' || raw['GENERAL | CMYK'] === true) parts.push('CMYK');
    if (String(raw['TINTA BLANCA'] || '').toLowerCase() === 'si' || raw['GENERAL | TINTA BLANCA'] === true) parts.push('Blanco');
    if (String(raw['DOBLE PASADA BLANCA'] || '').toLowerCase() === 'si') parts.push('Doble Pasada');
    if (String(raw['SIN IMPRESION'] || '').toLowerCase() === 'si') parts.push('Sin ImpresiÃ³n');
    if (!parts.length && detail.tintCount) parts.push(`${detail.tintCount} tintas`);
    return parts.join(' / ');
}

function renderDeliveries(raw) {
    const quantities = [raw['CANTIDAD PRODUCTOS 1'], raw['CANTIDAD PRODUCTOS 2'], raw['CANTIDAD PRODUCTOS 3']].filter((value) => value !== undefined && value !== null && value !== '');
    deliveriesBody.innerHTML = quantities.length
        ? quantities.map((value, index) => `<tr><td>Entrega ${index + 1}</td><td>${escapeHtml(parseNumber(value))}</td><td>${index === 0 ? 'Inicial' : 'Pendiente'}</td></tr>`).join('')
        : '<tr><td>Entrega 1</td><td>Pendiente</td><td>Pendiente</td></tr>';
}

function renderArtwork(attachments) {
    const artwork = attachments.find((item) => /arte|imagen|pdf|adjunto/i.test(String(item.label || item.key || '')));
    if (!artwork) {
        artworkPreview.innerHTML = 'Sin arte de referencia.';
        return;
    }
    const value = String(artwork.value || '').trim();
    if (/^data:image\//i.test(value)) {
        artworkPreview.innerHTML = `<img src="${escapeHtml(value)}" alt="Arte del producto" class="production-art-image">`;
        return;
    }
    artworkPreview.innerHTML = `<div class="production-art-copy"><strong>${escapeHtml(artwork.label || 'Referencia')}</strong><span>${escapeHtml(value)}</span></div>`;
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

async function loadOrder() {
    const orderCode = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    currentOrderCode = orderCode;
    const [orderResponse, configResponse] = await Promise.all([
        fetch(`/api/ordenes-produccion/${encodeURIComponent(orderCode)}`),
        fetch('/api/config/general')
    ]);
    const payload = await orderResponse.json();
    const config = configResponse.ok ? await configResponse.json() : {};
    applyHeaderConfig(config);
    if (!orderResponse.ok) {
        throw new Error(payload.error || 'No se pudo cargar la orden.');
    }

    const order = payload.orden;
    const raw = order.raw_data || {};
    const quote = raw.quote_snapshot || {};
    const line = raw.line_summary || {};
    const detail = raw.line_snapshot || {};
    const lineRaw = detail.raw_data || {};
    const attachments = extractAttachments(raw);

    statusBox.hidden = true;
    contentBox.hidden = false;
    document.title = `${order.order_code} | Orden de Produccion`;
    renderPlanningControl(raw);
    renderPlanningSnapshot(raw);

    setFieldValue('orderCustomerSummaryField', `${pickFirst(raw.customer_code, quote.customer_code, '')} ${pickFirst(raw.customer_name, quote.customer_name, '')}`.trim());
    setFieldValue('orderCustomerAddressField', pickFirst(lineRaw.STREET, lineRaw['CLIENTE | DIRECCION'], lineRaw['DIRECCION ENTREGA']));
    setFieldValue('orderSellerField', pickFirst(raw.salesperson_name, quote.salesperson_name, detail.salespersonName));
    setFieldValue('orderQuoteLineField', `${pickFirst(raw.source_quote_code, quote.quote_code)} / ${pickFirst(raw.source_line_code, detail.lineCode)}`);

    setFieldValue('orderStateField', pickFirst(raw.status, 'Pendiente'));
    setFieldValue('orderCreatedField', formatDate(order.created_at || raw.created_on, true));
    setFieldValue('orderExpectedDateField', formatDate(quote.due_on));
    setFieldValue('orderScheduledDateField', '');
    setFieldValue('orderWorkTypeField', pickFirst(detail.orderType, detail.processType, line.process_type));
    setFieldValue('orderCodeField', order.order_code);

    setFieldValue('orderJobField', pickFirst(line.job_name, detail.jobName));
    setFieldValue('orderProductIdField', pickFirst(line.product_code, detail.productCode));
    setFieldValue('orderClientProductCodeField', pickFirst(lineRaw['ID PRODUCTO CLIENTE'], lineRaw['CODIGO PRODUCTO CLIENTE']));
    setFieldValue('orderWidthField', parseNumber(detail.widthInches, ' in'));
    setFieldValue('orderLengthField', parseNumber(detail.lengthInches, ' in'));
    setFieldValue('orderAreaField', parseNumber(detail.areaM2, ' mÂ²'));

    setFieldValue('orderQuantityField', parseNumber(raw.totals?.quantity || order.ordered_quantity));
    setFieldValue('orderOutputTypeField', pickFirst(detail.outputType, lineRaw['TIPO SALIDA']));
    setFieldValue('orderLabelsPerRollField', parseNumber(detail.labelsPerRoll));

    setFieldValue('orderMachineField', pickFirst(detail.quotedMachine, line.machine_name, order.machine_name));
    setFieldValue('orderMaterialField', pickFirst(detail.materialName, line.material_name, order.material_code));
    setFieldValue('orderLinearFeetField', parseNumber(detail.materialFeet, ' ft'));
    setFieldValue('orderWasteFeetField', parseNumber(detail.materialFeetWaste, ' ft'));
    setFieldValue('orderRollCountField', '');
    setFieldValue('orderDieField', pickFirst(detail.dieCode, lineRaw['GENERAL | TROQUEL | ID'], order.die_code));

    setFieldValue('orderFinishLaminateField', pickFirst(lineRaw['ACABADOS | LAMINADO'], lineRaw['LAMINADO']));
    setFieldValue('orderFinishVarnishField', pickFirst(lineRaw['ACABADOS | BARNIZ'], lineRaw['BARNIZ']));
    setFieldValue('orderFinishFoilField', pickFirst(lineRaw['ACABADOS | FOIL'], lineRaw['FOIL']));
    setFieldValue('orderFinishNumberingField', pickFirst(lineRaw['ACABADOS | NUMERADO'], lineRaw['NUMERADO']));
    setFieldValue('orderFinishSummaryField', pickFirst(lineRaw['ACABADOS | GENERAL'], lineRaw['GENERAL | ACABADOS']));
    setFieldValue('orderFinishNotesField', pickFirst(lineRaw['ACABADOS | OBSERVACIONES']));

    setFieldValue('orderInkConfigField', buildInkConfig(detail, lineRaw));
    setFieldValue('orderPantoneCountField', parseNumber(detail.pantoneCount));
    setFieldValue('orderPantonesField', [lineRaw['PANTONE 1'], lineRaw['PANTONE 2'], lineRaw['PANTONE 3']].filter(Boolean).join(' / '));
    setFieldValue('orderCoreWidthField', parseNumber(detail.coreWidth));
    setFieldValue('orderCoreDiameterField', pickFirst(detail.coreDiameter));
    setFieldValue('orderRollLabelsField', parseNumber(detail.labelsPerRoll));

    setFieldValue('orderSamplesModeField', pickFirst(lineRaw['MUESTRAS | TIPO'], 'No definido'));
    setFieldValue('orderSamplesContactField', pickFirst(lineRaw['MUESTRAS | CONTACTO']));
    setFieldValue('orderSamplesDetailField', [lineRaw['MUESTRAS | EMAIL'], lineRaw['MUESTRAS | TELEFONO'], lineRaw['MUESTRAS | DIRECCION']].filter(Boolean).join(' / '));
    setFieldValue('orderDeliveryModeField', pickFirst(lineRaw['ENTREGA | TIPO'], quote.delivery_time));
    setFieldValue('orderDeliveryContactField', pickFirst(lineRaw['ENTREGA | CONTACTO'], quote.contact_name));
    setFieldValue('orderDeliveryDetailField', [lineRaw['ENTREGA | EMAIL'], lineRaw['ENTREGA | TELEFONO'], lineRaw['ENTREGA | DIRECCION'], lineRaw['ENTREGA | COMENTARIOS']].filter(Boolean).join(' / '));

    setFieldValue('orderSellerCommentsField', pickFirst(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']));
    setFieldValue('orderArtworkNumberField', pickFirst(lineRaw['ORDEN DE ARTE']));
    setFieldValue('orderArtworkHolderField', pickFirst(lineRaw['ARTE EN PODER DE']));
    setFieldValue('orderAttachmentsSummaryField', attachments.length ? `${attachments.length} adjunto(s) relacionados` : 'Sin adjuntos relacionados');

    renderDeliveries(lineRaw);
    renderArtwork(attachments);

    sourceQuoteButton.onclick = () => {
        const quoteCode = pickFirst(raw.source_quote_code, quote.quote_code);
        const lineCode = pickFirst(raw.source_line_code, detail.lineCode, line.line_code);
        if (!quoteCode || !lineCode) return;
        const route = buildCalcRoute({
            quoteCode,
            lineCode,
            productCode: pickFirst(line.product_code, detail.productCode, raw.product_code),
            department: pickFirst(line.department, detail.department, detail.processType, line.process_type, 'Flexografia')
        });
        openRoute(route, `Calculo ${lineCode}`);
    };

    releasePlanningButton.onclick = () => updatePlanningControl('release-sales');
    openPlanningQueueButton.onclick = () => openRoute('/planificacion/lanzamiento', 'Cola de planificación');
}

loadOrder().catch((error) => {
    statusBox.textContent = error.message;
});
