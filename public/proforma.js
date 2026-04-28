const loadingEl = document.getElementById('proformaLoading');
const shellEl = document.getElementById('proformaShell');
const saveStatusEl = document.getElementById('proformaSaveStatus');
const statusChipEl = document.getElementById('proformaStatusChip');
const quoteMetaEl = document.getElementById('proformaQuoteMeta');
const backButton = document.getElementById('proformaBackButton');
const closeButton = document.getElementById('proformaCloseButton');
const refreshButton = document.getElementById('proformaRefreshButton');
const CONFIG_ENDPOINT = '/api/config/general';
let loadedConfig = {};
const PAYMENT_TERM_OPTIONS = [
    'Contado',
    '15 días',
    '30 días',
    '45 días',
    '60 días',
    '90 días',
    '50% adelanto',
    '50% contra entrega',
    'Trámite de pago',
    'Cancelación por adelantado'
];
const DELIVERY_TIME_OPTIONS = [
    '5 días',
    '8 días',
    '15 días',
    '22 días',
    '30 días',
    'De acuerdo a la programación con el cliente',
    'Según lo establecido en el cartel de compra'
];

const fields = {
    clientCompany: document.getElementById('proformaClientCompany'),
    clientContactName: document.getElementById('proformaClientContact'),
    clientPhone: document.getElementById('proformaClientPhone'),
    clientEmail: document.getElementById('proformaClientEmail'),
    currencyCode: document.getElementById('proformaCurrency'),
    validity: document.getElementById('proformaValidity'),
    pricePresentation: document.getElementById('proformaPricePresentation'),
    priceDisplayMode: document.getElementById('proformaPriceDisplayMode'),
    sellerSignatureEnabled: document.getElementById('proformaSellerSignatureEnabled'),
    intro: document.getElementById('proformaIntro'),
    paymentTerms: document.getElementById('proformaPaymentTerms'),
    deliveryTime: document.getElementById('proformaDeliveryTime')
};
const printButton = document.getElementById('proformaPrintButton');
const previewFrame = document.getElementById('proformaPreviewFrame');

let proformaState = null;
let saveTimer = null;
let saveInFlight = false;
let saveQueued = false;

function getQuoteCode() {
    return new URLSearchParams(window.location.search).get('codigo') || '';
}

function setPreviewSrc(code) {
    if (!previewFrame || !code) return;
    const url = `/proforma-print.html?codigo=${encodeURIComponent(code)}&embed=1`;
    if (previewFrame.src !== url) {
        previewFrame.src = url;
    }
}

function reloadPreview() {
    if (!previewFrame) return;
    previewFrame.contentWindow?.location.reload();
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setSaveStatus(text, danger = false) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = text;
    saveStatusEl.style.background = danger ? '#fff1f1' : '#edf6fb';
    saveStatusEl.style.color = danger ? '#973333' : '#1d6288';
}

function formatDateTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-CR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDateOnly(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount, currency) {
    const code = currency?.code || 'CRC';
    try {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: code,
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    } catch (error) {
        const symbol = currency?.symbol || code;
        return `${symbol} ${Number(amount || 0).toFixed(2)}`;
    }
}

function formatQuantity(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return value == null ? '' : String(value);
    return amount.toLocaleString('es-CR', { maximumFractionDigits: 0 });
}

function buildSellerBlock(seller = {}) {
    return [seller.name || '', seller.role || 'Ejecutivo de Ventas'].filter(Boolean).join('\n');
}

function setDocumentSection(node, value) {
    if (!node) return;
    const text = String(value || '').trim();
    node.textContent = text;
    const item = node.closest('.proforma-terms-item');
    if (item) {
        item.hidden = !text;
        return;
    }
    const card = node.closest('.proforma-terms-card');
    if (card) card.hidden = !text;
}

function refreshTermsGridVisibility() {
    const grid = document.querySelector('.proforma-terms-grid');
    if (!grid) return;
    const summaryCard = grid.querySelector('.proforma-terms-card.is-summary');
    if (summaryCard) {
        const visibleItems = [...summaryCard.querySelectorAll('.proforma-terms-item')].filter((item) => !item.hidden);
        summaryCard.hidden = visibleItems.length === 0;
    }
    const visibleCards = [...grid.querySelectorAll('.proforma-terms-card')].filter((card) => !card.hidden);
    grid.hidden = visibleCards.length === 0;
}

function renderIcon(target, iconValue, color, size) {
    if (!target) return;
    const value = String(iconValue || '').trim();
    target.style.color = color || '';
    const isSvg = value.startsWith('data:image/svg+xml') || value.endsWith('.svg');
    if (isSvg) {
        target.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${value}');mask-image:url('${value}');width:${size}px;height:${size}px;"></span>`;
        return;
    }
    if (value.startsWith('data:image')) {
        target.innerHTML = `<img src="${value}" alt="" class="icon-image" style="width:${size}px;height:${size}px;">`;
        return;
    }
    target.innerHTML = `<span class="icon-glyph" style="font-size:${size}px;">${escapeHtml(value)}</span>`;
}

function iconConfigFor(key) {
    const icons = loadedConfig?.icons || {};
    const general = loadedConfig?.general || {};
    const fallbackMap = {
        topBack: { value: '←', color: '#6b7580', size: 18 },
        proformaView: { value: '👁', color: '#1e516d', size: 18 },
        proformaClose: { value: '✓', color: '#1e516d', size: 18 },
        refreshCosts: { value: '↻', color: '#1e516d', size: 18 }
    };
    const fallback = fallbackMap[key] || { value: '', color: '#6b7580', size: 24 };
    const value = icons[key] || fallback.value;
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    const color = general[`iconColor${suffix}`] || fallback.color;
    const size = Number(general[`iconSize${suffix}`]) || fallback.size;
    return { value, color, size };
}

function applyConfiguredIcons() {
    const backConf = iconConfigFor('topBack');
    const closeConf = iconConfigFor('proformaClose');
    const refreshConf = iconConfigFor('refreshCosts');

    renderIcon(document.querySelector('[data-icon="back"]'), backConf.value, backConf.color, backConf.size);
    renderIcon(document.querySelector('[data-icon="close"]'), closeConf.value, closeConf.color, closeConf.size);
    renderIcon(document.querySelector('[data-icon="refresh"]'), refreshConf.value, refreshConf.color, refreshConf.size);
}

function buildClientBlock(client = {}) {
    const company = client.company || '';
    const lines = [
        client.contactName ? `Contacto: ${client.contactName}` : '',
        client.email ? `Correo: ${client.email}` : '',
        client.phone ? `Teléfono: ${client.phone}` : ''
    ].filter(Boolean);
    return `
        <span class="proforma-client-name">${escapeHtml(company || 'Cliente')}</span>
        ${lines.map((line) => `<span class="proforma-client-meta">${escapeHtml(line)}</span>`).join('')}
    `;
}

function getPriceColumns(mode) {
    switch (mode) {
        case 'regular_simple':
            return [
                { key: 'subtotal', label: 'Subtotal' },
                { key: 'taxAmount', label: 'Impuestos' },
                { key: 'totalPrice', label: 'Total' }
            ];
        case 'regular_unit':
            return [
                { key: 'unitPrice', label: 'Precio unitario' },
                { key: 'subtotal', label: 'Subtotal' },
                { key: 'taxAmount', label: 'Impuestos' },
                { key: 'totalPrice', label: 'Total' }
            ];
        case 'regular_thousand':
            return [
                { key: 'subtotal', label: 'Subtotal' },
                { key: 'taxAmount', label: 'Impuestos' },
                { key: 'totalPrice', label: 'Total' },
                { key: 'thousandPrice', label: 'Precio millar' }
            ];
        case 'totalized_simple':
            return [{ key: 'subtotal', label: 'Subtotal' }];
        default:
            return [
                { key: 'unitPrice', label: 'Precio unitario' },
                { key: 'subtotal', label: 'Subtotal' },
                { key: 'taxAmount', label: 'Impuestos' },
                { key: 'totalPrice', label: 'Total' }
            ];
    }
}

function getPriceDisplayOptions() {
    return {
        regular: [
            { value: 'regular_simple', label: 'Regular' },
            { value: 'regular_unit', label: 'Regular Con Precio Unitario' },
            { value: 'regular_thousand', label: 'Regular Con Precio Millar' }
        ],
        totalized: [
            { value: 'totalized_simple', label: 'Totalizado' }
        ]
    };
}

function getPricePresentation(mode) {
    return String(mode || '').startsWith('totalized_') ? 'totalized' : 'regular';
}

function fillSelectOptions(field, options = [], selectedValue = '') {
    if (!field) return;
    const selectedText = String(selectedValue || '').trim();
    const values = [...options];
    if (selectedText && !values.includes(selectedText)) values.push(selectedText);
    field.innerHTML = values.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    field.value = selectedText && values.includes(selectedText) ? selectedText : (values[0] || '');
}

function syncPriceModeOptions(selectedMode) {
    const presentation = fields.pricePresentation?.value || getPricePresentation(selectedMode);
    const optionGroups = getPriceDisplayOptions();
    const options = optionGroups[presentation] || optionGroups.regular;
    if (fields.priceDisplayMode) {
        fields.priceDisplayMode.innerHTML = options.map((item) => `
            <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
        `).join('');
        const safeValue = options.some((item) => item.value === selectedMode) ? selectedMode : options[0]?.value;
        fields.priceDisplayMode.value = safeValue || 'regular_unit';
        fields.priceDisplayMode.disabled = presentation === 'totalized';
    }
}

function normalizeHeaderColor(value) {
    const normalized = String(value || '').trim();
    return /^#([0-9a-fA-F]{6})$/.test(normalized) ? normalized : '#203852';
}

function applyHeaderColor(headerColor) {
    if (!docNodes.header) return;
    const normalized = normalizeHeaderColor(headerColor);
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
    docNodes.header.style.background = normalized;
    docNodes.header.classList.toggle('is-light', luminance > 160);
}

function normalizeLogoMetric(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function applyLogoLayout(company = {}) {
    if (!docNodes.logo) return;
    const showCompanyName = String(company.showCompanyName ?? 'true').trim().toLowerCase() !== 'false';
    const logoWidth = Math.max(40, normalizeLogoMetric(company.logoWidth, 120));
    const logoHeight = Math.max(24, normalizeLogoMetric(company.logoHeight, 74));
    const marginTop = normalizeLogoMetric(company.logoMarginTop, 0);
    const marginLeft = normalizeLogoMetric(company.logoMarginLeft, 0);
    docNodes.logo.style.width = showCompanyName ? `${logoWidth}px` : '100%';
    docNodes.logo.style.minHeight = `${logoHeight}px`;
    docNodes.logo.style.height = `${logoHeight}px`;
    docNodes.logo.style.marginTop = `${marginTop}px`;
    docNodes.logo.style.marginLeft = `${marginLeft}px`;
    docNodes.logo.style.flex = showCompanyName ? '0 0 auto' : '1 1 auto';
    if (docNodes.brandCopy) {
        docNodes.brandCopy.hidden = !showCompanyName;
    }
}

function applyCompanyFont(company = {}) {
    const selected = String(company.fontFamily || 'Cormorant Garamond').trim() || 'Cormorant Garamond';
    const customUrl = String(company.fontUrl || '').trim();
    const custom = customUrl && String(company.fontFamilySource || '').trim() === '__custom__';
    if (docNodes.dynamicCompanyFont) {
        docNodes.dynamicCompanyFont.textContent = custom
            ? `@font-face { font-family: "${selected}"; src: url("${customUrl}") format("woff2"); font-display: swap; }`
            : '';
    }
    if (docNodes.companyName) {
        docNodes.companyName.style.fontFamily = `"${selected}", serif`;
        docNodes.companyName.style.color = normalizeHeaderColor(company.nameColor || '#ffffff');
    }
}

function applyIntroStyle(style = {}) {
    if (!docNodes.intro) return;
    const family = String(style.fontFamily || 'inherit').trim();
    const size = Number(style.fontSize || 15) || 15;
    const color = normalizeHeaderColor(style.color || '#2f3c46');
    docNodes.intro.style.fontFamily = family === 'inherit' ? '' : family;
    docNodes.intro.style.fontSize = `${Math.max(10, Math.min(30, size))}px`;
    docNodes.intro.style.color = color;
}

function applyFormState(readOnly) {
    Object.values(fields).forEach((field) => {
        if (!field) return;
        field.disabled = readOnly;
        field.readOnly = readOnly && field.tagName !== 'SELECT';
    });
    if (closeButton) closeButton.disabled = readOnly;
}

function fillForm(data) {
    if (fields.clientCompany) fields.clientCompany.value = data.client?.company || '';
    if (fields.clientContactName) fields.clientContactName.value = data.client?.contactName || '';
    if (fields.clientPhone) fields.clientPhone.value = data.client?.phone || '';
    if (fields.clientEmail) fields.clientEmail.value = data.client?.email || '';
    fields.currencyCode.innerHTML = (data.currencies || []).map((currency) => `
        <option value="${escapeHtml(currency.code)}">${escapeHtml(`${currency.code} · ${currency.label}`)}</option>
    `).join('');
    fields.currencyCode.value = data.currency?.code || data.currencies?.[0]?.code || 'CRC';
    fields.validity.value = data.validity || '';
    if (fields.sellerSignatureEnabled) fields.sellerSignatureEnabled.checked = data.sellerSignatureEnabled !== false;
    if (fields.pricePresentation) {
        fields.pricePresentation.innerHTML = `
            <option value="regular">Regular</option>
            <option value="totalized">Totalizado</option>
        `;
        fields.pricePresentation.value = data.pricePresentation || getPricePresentation(data.priceDisplayMode);
    }
    syncPriceModeOptions(data.priceDisplayMode || 'regular_unit');
    fields.intro.value = data.intro || '';
    fillSelectOptions(fields.paymentTerms, PAYMENT_TERM_OPTIONS, data.paymentTerms || '');
    fillSelectOptions(fields.deliveryTime, DELIVERY_TIME_OPTIONS, data.deliveryTime || '');
}

function renderDocument(data) {
    if (quoteMetaEl) quoteMetaEl.textContent = `Cotización ${data.quoteCode || ''}`;
    if (statusChipEl) {
        statusChipEl.textContent = data.status === 'closed' ? 'Cerrada' : 'Abierta';
        statusChipEl.classList.toggle('is-closed', data.status === 'closed');
    }

    docNodes.logo.innerHTML = data.company?.logoUrl
        ? `<img src="${escapeHtml(data.company.logoUrl)}" alt="${escapeHtml(data.company?.name || 'Logo')}">`
        : 'Logo';
    docNodes.companyName.textContent = data.company?.name || 'Empresa';
    docNodes.slogan.textContent = data.company?.slogan || '';
    applyCompanyFont(data.company || {});
    applyLogoLayout(data.company || {});
    docNodes.quoteCode.textContent = `Cotización ${data.quoteCode || ''}`;
    docNodes.issueDate.textContent = `Fecha de emisión: ${formatDateOnly(data.issueDate)}`;
    if (docNodes.validity) {
        docNodes.validity.textContent = `Validez: ${data.validity || ''}`;
    }
    docNodes.clientBlock.innerHTML = buildClientBlock(data.client);
    docNodes.intro.textContent = data.intro || ' ';
    setDocumentSection(docNodes.paymentTerms, data.paymentTerms || '');
    setDocumentSection(docNodes.deliveryTime, data.deliveryTime || '');
    setDocumentSection(docNodes.technicalSpecs, data.technicalSpecs || '');
    setDocumentSection(docNodes.qualityPolicies, data.qualityPolicies || '');
    refreshTermsGridVisibility();
    docNodes.sellerName.textContent = data.seller?.name || '';
    if (docNodes.sellerName) {
        docNodes.sellerName.style.color = '#111111';
        docNodes.sellerName.style.fontWeight = '500';
        docNodes.sellerName.style.opacity = '1';
        docNodes.sellerName.style.textShadow = 'none';
    }
    const signatureBlock = docNodes.signatureAsset?.closest('.proforma-signature');
    if (signatureBlock) {
        signatureBlock.hidden = data.sellerSignatureEnabled === false;
    }
    docNodes.signatureAsset.innerHTML = data.seller?.signatureUrl
        ? `<img src="${escapeHtml(data.seller.signatureUrl)}" alt="Firma del vendedor">`
        : '';
    if (docNodes.footerDate) {
        docNodes.footerDate.textContent = formatDateTime(data.footer?.generatedOn || data.issueDate);
    }
    applyIntroStyle(data.introStyle);

    const columns = getPriceColumns(data.priceDisplayMode);
    if (docNodes.totalBox) {
        docNodes.totalBox.hidden = !String(data.priceDisplayMode || '').startsWith('totalized_');
    }
    docNodes.tableHead.innerHTML = `
        <th>Producto</th>
        <th>Cantidad</th>
        ${columns.map((column) => `<th class="proforma-col-${escapeHtml(column.key)}">${escapeHtml(column.label)}</th>`).join('')}
    `;
    docNodes.productsBody.innerHTML = (data.products || []).map((product) => `
        <tr>
            <td>
                <span class="proforma-product-name">${escapeHtml(product.name || 'Producto')}</span>
                <span class="proforma-product-desc">${escapeHtml(product.descriptionText || [product.material, product.machineSummary, product.processType, product.dimensionsText, product.finishesSummary].filter(Boolean).join(' · '))}</span>
                <span class="proforma-product-route">${escapeHtml([
                    product.routeSummary ? `Ruta: ${product.routeSummary}` : '',
                    product.materialCode ? `Material: ${product.materialCode}` : '',
                    product.machineSummary ? `Máquina: ${product.machineSummary}` : '',
                    product.dieCode ? `Troquel: ${product.dieCode}` : ''
                ].filter(Boolean).join(' · '))}</span>
                ${product.mountingSummary ? `<span class="proforma-product-tech">${escapeHtml(product.mountingSummary)}</span>` : ''}
                ${product.technicalComment ? `<span class="proforma-product-tech">${escapeHtml(product.technicalComment)}</span>` : ''}
                ${(product.warnings || []).length ? `<span class="proforma-product-warning">${escapeHtml(product.warnings.slice(0, 2).join(' · '))}</span>` : ''}
            </td>
            <td>${escapeHtml(product.quantity == null ? '' : formatQuantity(product.quantity))}</td>
            ${columns.map((column) => `<td class="proforma-col-${escapeHtml(column.key)}">${escapeHtml(formatCurrency(product[column.key], data.currency))}</td>`).join('')}
        </tr>
    `).join('');
    if (docNodes.totalBox) {
        const totalBoxBody = docNodes.totalBox.querySelector('tbody');
        if (totalBoxBody) {
            totalBoxBody.innerHTML = `
                <tr>
                    <td>Subtotal</td>
                    <td>${escapeHtml(formatCurrency(data.totals?.subtotal || 0, data.currency))}</td>
                </tr>
                <tr>
                    <td>Impuestos de Venta</td>
                    <td>${escapeHtml(formatCurrency(data.totals?.taxAmount || 0, data.currency))}</td>
                </tr>
                <tr>
                    <td>Total</td>
                    <td id="docGrandTotal">${escapeHtml(formatCurrency(data.totals?.grandTotal || 0, data.currency))}</td>
                </tr>
            `;
        }
    }
    applyHeaderColor(data.company?.headerColor);
}

function collectPayload() {
    return {
        clientCompany: fields.clientCompany?.value.trim?.() || proformaState?.client?.company || '',
        clientContactName: fields.clientContactName?.value.trim?.() || proformaState?.client?.contactName || '',
        clientPhone: fields.clientPhone?.value.trim?.() || proformaState?.client?.phone || '',
        clientEmail: fields.clientEmail?.value.trim?.() || proformaState?.client?.email || '',
        currencyCode: fields.currencyCode.value,
        exchangeRate: Number(proformaState?.currency?.exchangeRate || 1) || 1,
        validity: fields.validity.value.trim(),
        pricePresentation: fields.pricePresentation?.value || getPricePresentation(fields.priceDisplayMode.value),
        priceDisplayMode: fields.priceDisplayMode.value,
        sellerSignatureEnabled: fields.sellerSignatureEnabled?.checked !== false,
        intro: fields.intro.value.trim(),
        paymentTerms: fields.paymentTerms.value.trim(),
        deliveryTime: fields.deliveryTime.value.trim()
    };
}

async function loadProforma() {
    const code = getQuoteCode();
    if (!code) {
        throw new Error('No se indicó una cotización.');
    }
    const response = await fetch(`/api/proformas/${encodeURIComponent(code)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || 'No fue posible cargar la proforma.');
    }
    proformaState = payload;
    fillForm(payload);
    applyFormState(payload.status === 'closed');
    if (loadingEl) loadingEl.hidden = true;
    if (shellEl) shellEl.hidden = false;
    setSaveStatus(payload.status === 'closed' ? 'Proforma cerrada' : 'Cambios listos');
}

async function persistProforma() {
    if (!proformaState || proformaState.status === 'closed') return;
    saveInFlight = true;
    setSaveStatus('Guardando...');
    const response = await fetch(`/api/proformas/${encodeURIComponent(proformaState.quoteCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectPayload())
    });
    const payload = await response.json().catch(() => ({}));
    saveInFlight = false;
    if (!response.ok) {
        setSaveStatus(payload?.error || 'Error al guardar', true);
        throw new Error(payload?.error || 'No fue posible guardar la proforma.');
    }
    proformaState = payload;
    reloadPreview();
    setSaveStatus('Guardado');
    if (saveQueued) {
        saveQueued = false;
        queueSave();
    }
}

function queueSave() {
    if (proformaState?.status === 'closed') return;
    if (saveInFlight) {
        saveQueued = true;
        return;
    }
    window.clearTimeout(saveTimer);
    setSaveStatus('Pendiente');
    saveTimer = window.setTimeout(() => {
        persistProforma().catch((error) => console.error(error));
    }, 350);
}

async function closeProforma() {
    if (!proformaState || proformaState.status === 'closed') return;
    const accepted = window.confirm('¿Deseas cerrar esta proforma? La fecha quedará fija y ya no podrás editarla.');
    if (!accepted) return;
    const response = await fetch(`/api/proformas/${encodeURIComponent(proformaState.quoteCode)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        setSaveStatus(payload?.error || 'No fue posible cerrar la proforma.', true);
        return;
    }
    proformaState = payload;
    fillForm(payload);
    reloadPreview();
    applyFormState(true);
    setSaveStatus('Proforma cerrada');
}

function refreshPreviewFromForm() {
    if (!proformaState) return;
    // Solo actualiza el estado local; el iframe se recarga al guardar
    const currency = (proformaState.currencies || []).find((item) => item.code === fields.currencyCode.value) || proformaState.currency;
    proformaState = {
        ...proformaState,
        client: {
            company: fields.clientCompany?.value.trim?.() || proformaState.client?.company || '',
            contactName: fields.clientContactName?.value.trim?.() || proformaState.client?.contactName || '',
            phone: fields.clientPhone?.value.trim?.() || proformaState.client?.phone || '',
            email: fields.clientEmail?.value.trim?.() || proformaState.client?.email || ''
        },
        currency: {
            ...(currency || {}),
            code: fields.currencyCode.value,
            exchangeRate: Number(proformaState.currency?.exchangeRate || currency?.exchangeRate || 1) || 1
        },
        validity: fields.validity.value.trim(),
        pricePresentation: fields.pricePresentation?.value || getPricePresentation(fields.priceDisplayMode.value),
        priceDisplayMode: fields.priceDisplayMode.value,
        sellerSignatureEnabled: fields.sellerSignatureEnabled?.checked !== false,
        intro: fields.intro.value.trim(),
        paymentTerms: fields.paymentTerms.value.trim(),
        deliveryTime: fields.deliveryTime.value.trim()
    };
}

function bindEvents() {
    printButton?.addEventListener('click', () => {
        if (previewFrame?.contentWindow) {
            previewFrame.contentWindow.print();
        } else {
            const code = getQuoteCode();
            if (code) window.open(`/proforma-print.html?codigo=${encodeURIComponent(code)}`, '_blank');
        }
    });
    Object.entries(fields).forEach(([key, field]) => {
        field?.addEventListener('input', () => {
            refreshPreviewFromForm();
            queueSave();
        });
        field?.addEventListener('change', () => {
            if (key === 'pricePresentation') {
                syncPriceModeOptions();
            }
            refreshPreviewFromForm();
            queueSave();
        });
    });
    closeButton?.addEventListener('click', closeProforma);
    refreshButton?.addEventListener('click', () => loadProforma().catch((error) => setSaveStatus(error.message, true)));
    backButton?.addEventListener('click', () => {
        const route = `/?codigo=${encodeURIComponent(getQuoteCode())}`;
        if (!openRouteInShell(route, `Cotización ${getQuoteCode()}`)) {
            window.location.href = route;
        }
    });
}

async function init() {
    bindEvents();
    const code = getQuoteCode();
    setPreviewSrc(code);
    try {
        const [config] = await Promise.all([
            fetch(CONFIG_ENDPOINT).then(r => r.json()),
            loadProforma()
        ]);
        loadedConfig = config;
        applyConfiguredIcons();
    } catch (error) {
        console.error('No se pudo inicializar la proforma:', error);
    }
}

init();
