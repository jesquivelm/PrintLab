const PRODUCTS_ENDPOINT = '/api/productos';
const CONFIG_ENDPOINT_PRODUCTS = '/api/config/general';
const SESSION_STORAGE_KEY_PRODUCTS = 'erp-user-session';

const productsTableBody = document.getElementById('productsTableBody');
const productsSearchInput = document.getElementById('productsSearchInput');
const productsHeaderSearchButton = document.getElementById('productsHeaderSearchButton');
const refreshProductsButton = document.getElementById('refreshProductsButton');
const productsStatus = document.getElementById('productsStatus');
const productsTotalKpi = document.getElementById('productsTotalKpi');
const productsTableWrap = document.querySelector('.quote-browser-table-wrap');
const productsScrollBottomIndicator = document.getElementById('productsScrollBottomIndicator');

let loadedConfig = {};
let productCatalog = [];
let expandedProductCode = '';
let productDetails = new Map();
let productSearchTimer = null;

function readProductsUserSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY_PRODUCTS) || sessionStorage.getItem(SESSION_STORAGE_KEY_PRODUCTS) || 'null');
    } catch (error) {
        return null;
    }
}

function normalizeProductsPermissionLevel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'view' || normalized === 'create' || normalized === 'edit') return normalized;
    return 'none';
}

function canCreateProductsModule(moduleKey) {
    if (window.ErpAccess?.canCreateModule) return window.ErpAccess.canCreateModule(moduleKey);
    const session = readProductsUserSession();
    const modules = session?.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules) return true;
    const level = normalizeProductsPermissionLevel(modules[moduleKey]);
    return level === 'create';
}

function productsSessionHeader() {
    const session = readProductsUserSession();
    return session ? { 'x-erp-session': JSON.stringify(session) } : {};
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR');
}

function parseMoneyValue(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
    const number = parseMoneyValue(value);
    return number ? `$${number.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la solicitud.');
    return payload;
}

function setStatus(message, tone = 'info') {
    if (!productsStatus) return;
    productsStatus.textContent = message || '';
    productsStatus.dataset.tone = tone;
}

function updateProductsKpi(total) {
    if (!productsTotalKpi) return;
    productsTotalKpi.textContent = Number(total || 0).toLocaleString('es-CR');
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

function isSvgValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg');
}

function isImageValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image') || normalized.endsWith('.png') || normalized.endsWith('.jpg') || normalized.endsWith('.jpeg') || normalized.endsWith('.webp') || normalized.endsWith('.gif');
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

function resolveHeaderIcon(key, fallbackValue) {
    const general = loadedConfig?.general || {};
    const icons = loadedConfig?.icons || {};
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    return {
        value: icons[key] || fallbackValue,
        color: general[`iconColor${suffix}`] || general.iconColor || '#7a8794',
        hover: general[`iconColorHover${suffix}`] || general[`iconColor${suffix}`] || general.iconColorHover || '#0b81b8',
        size: Number(general[`iconSize${suffix}`] || general.iconSize) || 20
    };
}

function applyHeaderIcon(button, icon) {
    if (!button || !icon) return;
    button.innerHTML = iconMarkup(icon.value, button.getAttribute('aria-label') || '', 'table-icon-media');
    button.style.setProperty('--icon-color', icon.color);
    button.style.setProperty('--icon-hover-color', icon.hover);
    button.style.setProperty('--config-icon-size', `${icon.size}px`);
}

function iconConfig(key, fallbackValue, fallbackColor = '#0b81b8', fallbackSize = 18) {
    const icons = loadedConfig?.icons || {};
    const general = loadedConfig?.general || {};
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    return {
        value: normalizeText(icons[key]) || fallbackValue,
        color: general[`iconColor${suffix}`] || fallbackColor,
        hover: general[`iconColorHover${suffix}`] || '#07638c',
        size: Number(general[`iconSize${suffix}`]) || fallbackSize
    };
}

function updateProductsScrollBottomIndicator() {
    if (!productsTableWrap || !productsScrollBottomIndicator) return;
    const count = productCatalog.length;
    const hasScrollableContent = productsTableWrap.scrollHeight - productsTableWrap.clientHeight > 6;
    const distanceToBottom = productsTableWrap.scrollHeight - productsTableWrap.scrollTop - productsTableWrap.clientHeight;
    const shouldShow = count > 0 && (!hasScrollableContent || distanceToBottom <= 8);
    productsScrollBottomIndicator.textContent = `${count} producto${count === 1 ? '' : 's'} mostrado${count === 1 ? '' : 's'}`;
    productsScrollBottomIndicator.classList.toggle('is-visible', shouldShow);
}

function getProductMeta(product) {
    return [
        product.material_name || 'Sin material',
        product.quoted_machine || 'Sin maquina',
        product.width_inches && product.length_inches ? `${product.width_inches} x ${product.length_inches}` : '',
        product.tint_count ? `${product.tint_count} tintas` : ''
    ].filter(Boolean).join(' · ');
}

function readonlyField(label, value) {
    return `<div class="product-readonly-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>`;
}

function renderRawData(raw = {}) {
    const priority = [
        'NOMBRE TRABAJO',
        'Proceso Productivo',
        'Cantidad Productos',
        'CANTIDAD TIPOS',
        'CANTIDAD TINTAS',
        'DIMENSIONES ETIQUETA | ANCHO',
        'DIMENSIONES ETIQUETA | LARGO',
        'GENERAL | MATERIAL',
        'GENERAL | TROQUEL | ID',
        'CONV | MAQUINA',
        'DIGITAL | MAQUINA',
        'TIPO ETIQUETADO',
        'TIPO SALIDA',
        'ANCHO CORE',
        'DIAMETRO CORE',
        'GENERAL | CMYK',
        'PRECIO TOTAL AL FINALIZAR',
        'GENERAL | 9 | UNITARIO | DOL',
        'OBSERVACIONES SOLICITUD'
    ];
    const rows = [];
    const seen = new Set();
    priority.forEach((key) => {
        if (raw[key] === undefined || raw[key] === null || raw[key] === '') return;
        seen.add(key);
        rows.push(readonlyField(key, typeof raw[key] === 'object' ? JSON.stringify(raw[key]) : raw[key]));
    });
    Object.entries(raw).forEach(([key, value]) => {
        if (seen.has(key) || value === undefined || value === null || value === '' || typeof value === 'object') return;
        rows.push(readonlyField(key, value));
    });
    return rows.length ? rows.join('') : '<div class="product-empty-detail">Este producto no tiene datos adicionales.</div>';
}

function renderHistory(items = []) {
    const openConf = iconConfig('browserOpen', '\u2197');
    if (!items.length) return '<div class="product-empty-detail">Todavia no hay historial de cotizaciones para este producto.</div>';
    return items.map((item) => `
        <div class="product-history-item">
            <div class="product-history-main">
                <strong>${escapeHtml(item.quote_code || 'Sin codigo')}</strong>
                <span>${escapeHtml(item.line_code || '')}</span>
            </div>
            <div class="product-history-main">
                <strong>${escapeHtml(item.customer_name || 'Sin cliente')}</strong>
                <span>${escapeHtml(item.job_name || item.action || '')}</span>
            </div>
            <div class="product-history-meta">${escapeHtml(formatDate(item.created_at || item.created_on))}</div>
            <button type="button" class="browser-open-link" data-open-quote="${escapeHtml(item.quote_code)}" title="Abrir cotizacion" aria-label="Abrir cotizacion" style="--icon-color:${escapeHtml(openConf.color)};--icon-hover-color:${escapeHtml(openConf.hover)};--config-icon-size:${escapeHtml(String(openConf.size))}px;">${iconMarkup(openConf.value, 'Abrir cotizacion', 'table-icon-media')}</button>
        </div>
    `).join('');
}

function renderProductDetail(product) {
    const detail = productDetails.get(product.product_code);
    if (!detail) return `<div class="product-detail-shell" data-detail-for="${escapeHtml(product.product_code || '')}"><div class="product-empty-detail">Cargando producto...</div></div>`;
    const p = detail.producto || product;
    const canQuoteProduct = canCreateProductsModule('cotizaciones');
    return `
        <div class="product-detail-shell" data-detail-for="${escapeHtml(p.product_code || product.product_code || '')}">
            <section class="socios-section">
                <div class="section-caption">Producto</div>
                <div class="product-detail-head">
                    <div class="product-detail-title">
                        <strong>${escapeHtml(p.product_name || p.product_code)}</strong>
                        <span>Producto congelado desde ${escapeHtml(p.quote_code || 'cotizacion origen')} · ${escapeHtml(p.line_code || 'linea origen')}</span>
                    </div>
                    <div class="product-detail-actions">
                        ${canQuoteProduct ? `<button type="button" class="action-btn quote-browser-action-btn" data-quote-product="${escapeHtml(p.product_code)}">Cotizar</button>` : ''}
                    </div>
                </div>
                <div class="production-summary-stack">
                    <div class="production-product-hero">
                        <div class="production-product-hero-main">
                            <div class="production-product-hero-copy">
                                <span class="production-product-codes">${escapeHtml(p.product_code || '')}</span>
                                <strong class="production-product-name">${escapeHtml(p.product_name || p.product_code || '')}</strong>
                            </div>
                            <span class="production-product-dimensions">${escapeHtml(p.width_inches && p.length_inches ? `${p.width_inches} x ${p.length_inches}` : '')}</span>
                        </div>
                    </div>
                </div>
            </section>
            <section class="socios-section">
                <div class="product-detail-tabs" role="tablist" aria-label="Detalle del producto">
                    <button type="button" class="product-detail-tab is-active" data-product-detail-tab="datos">Ficha</button>
                    <button type="button" class="product-detail-tab" data-product-detail-tab="historial">Cotizaciones</button>
                    <button type="button" class="product-detail-tab" data-product-detail-tab="origen">Datos originales</button>
                </div>
                <div class="product-detail-tab-panel is-active" data-product-detail-panel="datos">
                    <div class="product-detail-grid">
                        ${readonlyField('Cliente', p.client_name)}
                        ${readonlyField('Proceso', p.raw_data?.['Proceso Productivo'] || p.department)}
                        ${readonlyField('Material', p.material_name)}
                        ${readonlyField('Maquina', p.quoted_machine)}
                        ${readonlyField('Cantidad', p.quantity_products)}
                        ${readonlyField('Medida', p.width_inches && p.length_inches ? `${p.width_inches} x ${p.length_inches}` : '')}
                        ${readonlyField('Troquel', p.die_code)}
                        ${readonlyField('Veces cotizado', p.quote_count)}
                    </div>
                </div>
                <div class="product-detail-tab-panel" data-product-detail-panel="historial" hidden>
                    <div class="product-history-list">${renderHistory(detail.historial || [])}</div>
                </div>
                <div class="product-detail-tab-panel" data-product-detail-panel="origen" hidden>
                    <div class="product-raw-grid">${renderRawData(p.raw_data || {})}</div>
                </div>
            </section>
        </div>
    `;
}

function renderProductRow(product) {
    const code = product.product_code || '';
    const isExpanded = expandedProductCode === code;
    const openConf = iconConfig('browserOpen', '\u2197');
    const canQuoteProduct = canCreateProductsModule('cotizaciones');
    return `
        <tr class="quote-master-row ${isExpanded ? 'is-expanded' : ''}" data-product-code="${escapeHtml(code)}">
            <td class="quote-master-td-toggle">
                <button type="button" class="quote-master-toggle" data-toggle-product="${escapeHtml(code)}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="${isExpanded ? 'Contraer' : 'Expandir'} producto">
                    <span class="quote-master-toggle-glyph" aria-hidden="true">&#9656;</span>
                    <span class="quote-master-toggle-count">${Number(product.quote_count || 0)}</span>
                </button>
            </td>
            <td class="quote-master-td-code"><button type="button" class="quote-master-code" data-toggle-product="${escapeHtml(code)}">${escapeHtml(code)}</button></td>
            <td class="quote-master-td-info">
                <div class="quote-master-info-block">
                    <span class="quote-master-info-name">${escapeHtml(product.product_name || code)}</span>
                    <span class="quote-master-info-code">${escapeHtml(getProductMeta(product))}</span>
                </div>
            </td>
            <td class="quote-master-td-info">${escapeHtml(product.client_name || '')}</td>
            <td class="quote-master-td-total">${escapeHtml(formatMoney(product.total_price))}</td>
            <td class="quote-master-td-date">${escapeHtml(formatDate(product.last_quoted_at || product.created_at))}</td>
            <td class="quote-master-td-actions">
                <div class="quote-browser-actions row-tools row-tools-row-end">
                    ${canQuoteProduct ? `<button type="button" class="browser-open-link" data-quote-product="${escapeHtml(code)}" aria-label="Cotizar producto" title="Cotizar producto" style="--icon-color:${escapeHtml(openConf.color)};--icon-hover-color:${escapeHtml(openConf.hover)};--config-icon-size:${escapeHtml(String(openConf.size))}px;">${iconMarkup(openConf.value, 'Cotizar producto', 'table-icon-media')}</button>` : ''}
                </div>
            </td>
        </tr>
        ${isExpanded ? `<tr class="product-detail-row"><td colspan="7">${renderProductDetail(product)}</td></tr>` : ''}
    `;
}

function renderProductsTable() {
    if (!productsTableBody) return;
    if (!productCatalog.length) {
        productsTableBody.innerHTML = '<tr><td colspan="7">No hay productos guardados.</td></tr>';
        requestAnimationFrame(updateProductsScrollBottomIndicator);
        return;
    }
    productsTableBody.innerHTML = productCatalog.map(renderProductRow).join('');
    requestAnimationFrame(updateProductsScrollBottomIndicator);
}

async function loadProducts() {
    const params = new URLSearchParams({ limit: '250' });
    const search = normalizeText(productsSearchInput?.value);
    if (search) params.set('q', search);
    setStatus('Cargando productos...');
    const payload = await fetchJson(`${PRODUCTS_ENDPOINT}?${params.toString()}`);
    productCatalog = Array.isArray(payload.productos) ? payload.productos : [];
    updateProductsKpi(payload.total ?? productCatalog.length);
    setStatus(productCatalog.length ? '' : 'No hay productos guardados.');
    renderProductsTable();
}

async function loadProductDetail(productCode) {
    if (!productCode || productDetails.has(productCode)) return;
    const payload = await fetchJson(`${PRODUCTS_ENDPOINT}/${encodeURIComponent(productCode)}`);
    productDetails.set(productCode, payload);
}

async function toggleProduct(productCode) {
    expandedProductCode = expandedProductCode === productCode ? '' : productCode;
    renderProductsTable();
    if (expandedProductCode) {
        await loadProductDetail(expandedProductCode);
        renderProductsTable();
    }
}

async function quoteProduct(productCode) {
    if (!productCode) return;
    if (!canCreateProductsModule('cotizaciones')) {
        throw new Error('Tu permiso permite ver productos, pero no crear cotizaciones desde productos.');
    }
    setStatus('Creando cotizacion desde producto...');
    const payload = await fetchJson(`${PRODUCTS_ENDPOINT}/${encodeURIComponent(productCode)}/cotizar`, {
        method: 'POST',
        headers: productsSessionHeader()
    });
    await loadProducts();
    const quoteCode = payload?.cotizacion?.quote_code;
    setStatus(quoteCode ? `Cotizacion ${quoteCode} creada.` : 'Cotizacion creada.', 'saved');
    if (quoteCode) {
        const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
        if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) window.location.href = route;
    }
}

async function loadConfig() {
    try {
        loadedConfig = await fetchJson(CONFIG_ENDPOINT_PRODUCTS);
    } catch (error) {
        loadedConfig = {};
    }
    applyHeaderIcon(productsHeaderSearchButton, resolveHeaderIcon('topSearch', '⌕'));
}

function bindEvents() {
    refreshProductsButton?.addEventListener('click', () => loadProducts().catch((error) => setStatus(error.message, 'error')));
    productsHeaderSearchButton?.addEventListener('click', () => {
        productsSearchInput?.focus();
        productsSearchInput?.select?.();
    });
    productsSearchInput?.addEventListener('input', () => {
        clearTimeout(productSearchTimer);
        productSearchTimer = setTimeout(() => loadProducts().catch((error) => setStatus(error.message, 'error')), 220);
    });
    productsTableWrap?.addEventListener('scroll', updateProductsScrollBottomIndicator, { passive: true });
    productsTableBody?.addEventListener('click', (event) => {
        const toggle = event.target.closest('[data-toggle-product]');
        if (toggle) {
            toggleProduct(toggle.dataset.toggleProduct).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const quote = event.target.closest('[data-quote-product]');
        if (quote) {
            quoteProduct(quote.dataset.quoteProduct).catch((error) => setStatus(error.message, 'error'));
            return;
        }
        const openQuote = event.target.closest('[data-open-quote]');
        if (openQuote) {
            const quoteCode = openQuote.dataset.openQuote;
            const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
            if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) window.location.href = route;
            return;
        }
        const detailTab = event.target.closest('[data-product-detail-tab]');
        if (detailTab) {
            const shell = detailTab.closest('.product-detail-shell');
            const tabKey = detailTab.dataset.productDetailTab;
            shell?.querySelectorAll('[data-product-detail-tab]').forEach((button) => {
                button.classList.toggle('is-active', button.dataset.productDetailTab === tabKey);
            });
            shell?.querySelectorAll('[data-product-detail-panel]').forEach((panel) => {
                const isActive = panel.dataset.productDetailPanel === tabKey;
                panel.hidden = !isActive;
                panel.classList.toggle('is-active', isActive);
            });
        }
    });
}

async function init() {
    bindEvents();
    await loadConfig();
    await loadProducts();
}

init().catch((error) => setStatus(error.message, 'error'));
