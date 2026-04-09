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

const fields = {
    clientCompany: document.getElementById('proformaClientCompany'),
    clientContactName: document.getElementById('proformaClientContact'),
    clientPhone: document.getElementById('proformaClientPhone'),
    clientEmail: document.getElementById('proformaClientEmail'),
    currencyCode: document.getElementById('proformaCurrency'),
    exchangeRate: document.getElementById('proformaExchangeRate'),
    validity: document.getElementById('proformaValidity'),
    priceDisplayMode: document.getElementById('proformaPriceDisplayMode'),
    intro: document.getElementById('proformaIntro'),
    termsConditions: document.getElementById('proformaTermsConditions'),
    paymentTerms: document.getElementById('proformaPaymentTerms'),
    deliveryTime: document.getElementById('proformaDeliveryTime'),
    technicalSpecs: document.getElementById('proformaTechnicalSpecs'),
    qualityPolicies: document.getElementById('proformaQualityPolicies')
};

const docNodes = {
    header: document.getElementById('docHeader'),
    logo: document.getElementById('docLogo'),
    companyName: document.getElementById('docCompanyName'),
    slogan: document.getElementById('docSlogan'),
    quoteCode: document.getElementById('docQuoteCode'),
    issueDate: document.getElementById('docIssueDate'),
    clientBlock: document.getElementById('docClientBlock'),
    sellerBlock: document.getElementById('docSellerBlock'),
    intro: document.getElementById('docIntro'),
    tableHead: document.getElementById('docTableHead'),
    productsBody: document.getElementById('docProductsBody'),
    grandTotal: document.getElementById('docGrandTotal'),
    termsConditions: document.getElementById('docTermsConditions'),
    paymentTerms: document.getElementById('docPaymentTerms'),
    deliveryTime: document.getElementById('docDeliveryTime'),
    technicalSpecs: document.getElementById('docTechnicalSpecs'),
    qualityPolicies: document.getElementById('docQualityPolicies'),
    signatureAsset: document.getElementById('docSignatureAsset'),
    sellerName: document.getElementById('docSellerName'),
    footerDate: document.getElementById('docFooterDate')
};

let proformaState = null;
let saveTimer = null;
let saveInFlight = false;
let saveQueued = false;

function getQuoteCode() {
    return new URLSearchParams(window.location.search).get('codigo') || '';
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

function buildSellerBlock(seller = {}) {
    const parts = [
        seller.name || '',
        'Ejecutivo de Ventas'
    ].filter(Boolean);
    return parts.join('\n');
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
    return [
        client.company || '',
        client.contactName ? `Contacto: ${client.contactName}` : '',
        client.phone ? `Teléfono: ${client.phone}` : '',
        client.email ? `Correo: ${client.email}` : ''
    ].filter(Boolean).join('\n');
}

function getPriceColumns(mode) {
    switch (mode) {
        case 'unit':
            return [{ key: 'unitPrice', label: 'Precio Unitario' }, { key: 'totalPrice', label: 'Total' }];
        case 'thousand':
            return [{ key: 'thousandPrice', label: 'Precio por Millar' }, { key: 'totalPrice', label: 'Total' }];
        case 'product_totals':
        case 'global_totals':
            return [{ key: 'totalPrice', label: 'Total' }];
        default:
            return [
                { key: 'unitPrice', label: 'Precio Unitario' },
                { key: 'thousandPrice', label: 'Precio por Millar' },
                { key: 'totalPrice', label: 'Total' }
            ];
    }
}

function updateHeaderContrast() {
    const image = docNodes.logo?.querySelector('img');
    if (!image || !docNodes.header) {
        docNodes.header?.classList.remove('is-light');
        return;
    }
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const width = Math.max(1, Math.min(48, probe.naturalWidth || 48));
            const height = Math.max(1, Math.min(48, probe.naturalHeight || 48));
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(probe, 0, 0, width, height);
            const pixels = ctx.getImageData(0, 0, width, height).data;
            let sum = 0;
            let count = 0;
            for (let index = 0; index < pixels.length; index += 4) {
                if (pixels[index + 3] < 32) continue;
                sum += (pixels[index] * 0.299) + (pixels[index + 1] * 0.587) + (pixels[index + 2] * 0.114);
                count += 1;
            }
            const luminance = count ? sum / count : 0;
            docNodes.header.classList.toggle('is-light', luminance > 150);
        } catch (error) {
            docNodes.header.classList.remove('is-light');
        }
    };
    probe.onerror = () => docNodes.header.classList.remove('is-light');
    probe.src = image.src;
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
    fields.clientCompany.value = data.client?.company || '';
    fields.clientContactName.value = data.client?.contactName || '';
    fields.clientPhone.value = data.client?.phone || '';
    fields.clientEmail.value = data.client?.email || '';
    fields.currencyCode.innerHTML = (data.currencies || []).map((currency) => `
        <option value="${escapeHtml(currency.code)}">${escapeHtml(`${currency.code} · ${currency.label}`)}</option>
    `).join('');
    fields.currencyCode.value = data.currency?.code || data.currencies?.[0]?.code || 'CRC';
    fields.exchangeRate.value = String(data.currency?.exchangeRate || 1);
    fields.validity.value = data.validity || '';
    fields.priceDisplayMode.innerHTML = (data.priceDisplayModeOptions || []).map((item) => `
        <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
    `).join('');
    fields.priceDisplayMode.value = data.priceDisplayMode || 'both';
    fields.intro.value = data.intro || '';
    fields.termsConditions.value = data.termsConditions || '';
    fields.paymentTerms.value = data.paymentTerms || '';
    fields.deliveryTime.value = data.deliveryTime || '';
    fields.technicalSpecs.value = data.technicalSpecs || '';
    fields.qualityPolicies.value = data.qualityPolicies || '';
}

function renderDocument(data) {
    quoteMetaEl.textContent = `Cotización ${data.quoteCode || ''}`;
    statusChipEl.textContent = data.status === 'closed' ? 'Cerrada' : 'Abierta';
    statusChipEl.classList.toggle('is-closed', data.status === 'closed');

    docNodes.logo.innerHTML = data.company?.logoUrl
        ? `<img src="${escapeHtml(data.company.logoUrl)}" alt="${escapeHtml(data.company?.name || 'Logo')}">`
        : 'Logo';
    docNodes.companyName.textContent = data.company?.name || 'Empresa';
    docNodes.slogan.textContent = data.company?.slogan || '';
    docNodes.quoteCode.textContent = `Cotización ${data.quoteCode || ''}`;
    docNodes.issueDate.textContent = `Fecha de emisión: ${formatDateTime(data.issueDate)}`;
    docNodes.clientBlock.textContent = buildClientBlock(data.client);
    docNodes.sellerBlock.textContent = buildSellerBlock(data.seller);
    docNodes.intro.textContent = data.intro || ' ';
    docNodes.termsConditions.textContent = data.termsConditions || 'Pendiente de definir.';
    docNodes.paymentTerms.textContent = data.paymentTerms || 'Pendiente de definir.';
    docNodes.deliveryTime.textContent = data.deliveryTime || 'Pendiente de definir.';
    docNodes.technicalSpecs.textContent = data.technicalSpecs || 'Pendiente de definir.';
    docNodes.qualityPolicies.textContent = data.qualityPolicies || 'Pendiente de definir.';
    docNodes.sellerName.textContent = data.seller?.name || '';
    docNodes.signatureAsset.innerHTML = data.seller?.signatureUrl
        ? `<img src="${escapeHtml(data.seller.signatureUrl)}" alt="Firma del vendedor">`
        : '';
    docNodes.footerDate.textContent = formatDateTime(data.footer?.generatedOn || data.issueDate);

    const columns = getPriceColumns(data.priceDisplayMode);
    docNodes.tableHead.innerHTML = `
        <th>Producto</th>
        <th>Cantidad</th>
        ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}
    `;
    docNodes.productsBody.innerHTML = (data.products || []).map((product) => `
        <tr>
            <td>
                <span class="proforma-product-name">${escapeHtml(product.name || 'Producto')}</span>
                <span class="proforma-product-desc">${escapeHtml([product.material, product.processType, product.dimensionsText].filter(Boolean).join(' · '))}</span>
            </td>
            <td>${escapeHtml(product.quantity == null ? '' : String(product.quantity))}</td>
            ${columns.map((column) => `<td>${column.key === 'totalPrice' || data.priceDisplayMode !== 'global_totals' ? escapeHtml(formatCurrency(product[column.key], data.currency)) : ''}</td>`).join('')}
        </tr>
    `).join('');
    docNodes.grandTotal.textContent = formatCurrency(data.totals?.grandTotal || 0, data.currency);
    updateHeaderContrast();
}

function collectPayload() {
    return {
        clientCompany: fields.clientCompany.value.trim(),
        clientContactName: fields.clientContactName.value.trim(),
        clientPhone: fields.clientPhone.value.trim(),
        clientEmail: fields.clientEmail.value.trim(),
        currencyCode: fields.currencyCode.value,
        exchangeRate: Number(fields.exchangeRate.value || 1) || 1,
        validity: fields.validity.value.trim(),
        priceDisplayMode: fields.priceDisplayMode.value,
        intro: fields.intro.value.trim(),
        termsConditions: fields.termsConditions.value.trim(),
        paymentTerms: fields.paymentTerms.value.trim(),
        deliveryTime: fields.deliveryTime.value.trim(),
        technicalSpecs: fields.technicalSpecs.value.trim(),
        qualityPolicies: fields.qualityPolicies.value.trim()
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
    renderDocument(payload);
    applyFormState(payload.status === 'closed');
    loadingEl.hidden = true;
    shellEl.hidden = false;
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
    renderDocument(payload);
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
    renderDocument(payload);
    applyFormState(true);
    setSaveStatus('Proforma cerrada');
}

function refreshPreviewFromForm() {
    if (!proformaState) return;
    const currency = (proformaState.currencies || []).find((item) => item.code === fields.currencyCode.value) || proformaState.currency;
    proformaState = {
        ...proformaState,
        client: {
            company: fields.clientCompany.value.trim(),
            contactName: fields.clientContactName.value.trim(),
            phone: fields.clientPhone.value.trim(),
            email: fields.clientEmail.value.trim()
        },
        currency: {
            ...(currency || {}),
            code: fields.currencyCode.value,
            exchangeRate: Number(fields.exchangeRate.value || 1) || 1
        },
        validity: fields.validity.value.trim(),
        priceDisplayMode: fields.priceDisplayMode.value,
        intro: fields.intro.value.trim(),
        termsConditions: fields.termsConditions.value.trim(),
        paymentTerms: fields.paymentTerms.value.trim(),
        deliveryTime: fields.deliveryTime.value.trim(),
        technicalSpecs: fields.technicalSpecs.value.trim(),
        qualityPolicies: fields.qualityPolicies.value.trim()
    };
    renderDocument(proformaState);
}

function bindEvents() {
    Object.values(fields).forEach((field) => {
        field?.addEventListener('input', () => {
            refreshPreviewFromForm();
            queueSave();
        });
        field?.addEventListener('change', () => {
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
