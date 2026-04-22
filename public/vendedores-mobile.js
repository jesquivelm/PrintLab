const CONFIG_ENDPOINT = '/api/config/general';
const QUOTES_ENDPOINT = '/api/cotizaciones';
const PARTNERS_ENDPOINT = '/api/socios';
const ORDERS_ENDPOINT = '/api/ordenes-produccion';
const SELLER_PHOTO_STORAGE_KEY = 'erp-vendedores-photo';

const sellerName = document.getElementById('sellerName');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const refreshTopButton = document.getElementById('refreshTopButton');
const menuToggleButton = document.getElementById('menuToggleButton');
const menuPanel = document.getElementById('menuPanel');
const createProspectButton = document.getElementById('createProspectButton');
const createQuoteButton = document.getElementById('createQuoteButton');
const refreshMobileButton = document.getElementById('refreshMobileButton');
const themeCycleButton = document.getElementById('themeCycleButton');
const activityList = document.getElementById('activityList');
const moduleButtons = Array.from(document.querySelectorAll('.module-icon'));
const sellerPhotoButton = document.getElementById('sellerPhotoButton');
const sellerPhotoInput = document.getElementById('sellerPhotoInput');
const sellerPhotoImage = document.getElementById('sellerPhotoImage');
const sellerPhotoFallback = document.getElementById('sellerPhotoFallback');
const quoteDetailSheet = document.getElementById('quoteDetailSheet');
const detailCloseButton = document.getElementById('detailCloseButton');
const detailTitle = document.getElementById('detailTitle');
const detailBody = document.getElementById('detailBody');
const quickActionSheet = document.getElementById('quickActionSheet');
const quickActionCloseButton = document.getElementById('quickActionCloseButton');
const quickActionTitle = document.getElementById('quickActionTitle');
const quickActionForm = document.getElementById('quickActionForm');
const quickCustomerName = document.getElementById('quickCustomerName');
const quickContactName = document.getElementById('quickContactName');
const quickTaxId = document.getElementById('quickTaxId');
const quickBillingEmail = document.getElementById('quickBillingEmail');
const quickTaxWrapper = document.getElementById('quickTaxWrapper');
const quickBillingEmailWrapper = document.getElementById('quickBillingEmailWrapper');
const quickQuoteFields = document.getElementById('quickQuoteFields');
const quickProductName = document.getElementById('quickProductName');
const quickProductType = document.getElementById('quickProductType');
const quickQuantity = document.getElementById('quickQuantity');
const quickShape = document.getElementById('quickShape');
const quickProcessType = document.getElementById('quickProcessType');
const quickComments = document.getElementById('quickComments');
const quickAttachments = document.getElementById('quickAttachments');
const quickAttachmentsPreview = document.getElementById('quickAttachmentsPreview');
const quickActionStatus = document.getElementById('quickActionStatus');
const quickActionSubmit = document.getElementById('quickActionSubmit');

let configState = null;
let activeFilter = 'quotes';
let dataState = { quotes: [], orders: [], partners: [] };
let refreshTimer = null;
let selectedThemeMode = 'light';
let quickActionMode = 'quote';
let quickSelectedPartner = null;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function isSvgValue(value) {
    return String(value || '').trim().startsWith('data:image/svg+xml');
}

function isImageValue(value) {
    return String(value || '').trim().startsWith('data:image/');
}

function iconMarkup(value, altText) {
    const safe = escapeHtml(value || '');
    if (isSvgValue(value)) {
        return `<span class="menu-item-icon" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safe}');mask-image:url('${safe}');background:currentColor;"></span>`;
    }
    if (isImageValue(value)) {
        return `<img src="${safe}" alt="${escapeHtml(altText)}" class="menu-item-icon">`;
    }
    return `<span class="menu-item-icon" aria-hidden="true">${safe}</span>`;
}

function initialsFromName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function toIconSuffix(key) {
    return String(key || '').charAt(0).toUpperCase() + String(key || '').slice(1);
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function parseRawJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return {};
    }
}

function extractDimension(raw) {
    return firstFilled(raw.DIMENSION, raw.DIMENSIONES, raw['DIMENSION ETIQUETA'], raw.dimension, raw.dimensions, raw.label_dimensions);
}

function extractMaterial(raw) {
    return firstFilled(raw.MATERIAL, raw.SUSTRATO, raw['MATERIAL DESCRIPCION'], raw.material_name, raw.material);
}

function extractFinishes(raw) {
    const finishPairs = [
        ['Barniz', firstFilled(raw.BARNIZ, raw.barniz)],
        ['Laminado', firstFilled(raw.LAMINADO, raw.laminado)],
        ['Estampado', firstFilled(raw.ESTAMPADO, raw.estampado)],
        ['Relieve', firstFilled(raw.EMBOSADO, raw.embosado)],
        ['Numerado', firstFilled(raw.NUMERADO, raw.numerado)]
    ];
    return finishPairs
        .filter(([, value]) => String(value || '').trim() !== '')
        .map(([label, value]) => ({ label, value: String(value).trim() }));
}

function normalizeStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (!value) return { key: 'pending', label: 'Pendiente' };
    if (value.includes('cotiz')) return { key: 'quoted', label: 'Cotizada' };
    if (value.includes('envi') || value.includes('activ') || value.includes('abiert') || value.includes('proceso')) return { key: 'sent', label: 'Enviada' };
    if (value.includes('pend') || value.includes('borr') || value.includes('draft') || value.includes('solicitud')) return { key: 'pending', label: 'Pendiente' };
    if (value.includes('aprob') || value.includes('orden')) return { key: 'quoted', label: 'Cotizada' };
    return { key: 'pending', label: 'Pendiente' };
}

function formatQuantity(value) {
    const numeric = Number(String(value || '').replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) return `${numeric.toLocaleString('es-CR')} unidades`;
    return String(value || '').trim();
}

function buildSummaryLine(item) {
    const parts = [];
    if (item.material) parts.push(item.material);
    if (item.finishes.length) parts.push(...item.finishes);
    return parts.join(' + ');
}

function buildQuoteModel(item) {
    const raw = parseRawJson(item.raw_data);
    const title = firstFilled(raw['NOMBRE TRABAJO'], raw.product_name, raw.product_code, item.customer_name, item.quote_code) || 'Cotización';
    const dimension = extractDimension(raw);
    const quantity = firstFilled(raw.CANTIDAD, raw.quantity, raw.quantityProducts, item.quantity);
    const material = extractMaterial(raw);
    const finishes = extractFinishes(raw).map((entry) => entry.value);
    const status = normalizeStatus(item.status);
    const hasQuoteResult = Number(firstFilled(raw.TOTAL, raw.total_cost, raw.totalCost, item.total_cost, 0)) > 0;
    return {
        code: item.quote_code,
        title,
        dimension,
        quantity,
        material,
        finishes,
        status: status.key === 'pending' && hasQuoteResult ? { key: 'quoted', label: 'Cotizada' } : status,
        createdOn: item.created_on,
        raw
    };
}

function getThemePreference() {
    const query = new URLSearchParams(window.location.search);
    const forcedTheme = query.get('theme');
    if (forcedTheme === 'light' || forcedTheme === 'dark') return forcedTheme;
    const globalTheme = window.PrintLabTheme?.current?.();
    if (globalTheme?.mode === 'light' || globalTheme?.mode === 'dark') return globalTheme.mode;
    try {
        const stored = localStorage.getItem('printlab-theme-mode');
        if (stored === 'light' || stored === 'dark') return stored;
    } catch (_) {
        // Fall back to the configured mobile preference.
    }
    return String(configState?.general?.mobileSellerTheme || 'light') === 'dark' ? 'dark' : 'light';
}

function setQuickStatus(message, isError = false) {
    quickActionStatus.hidden = !message;
    quickActionStatus.textContent = message || '';
    quickActionStatus.className = `quick-status${message ? isError ? ' is-error' : '' : ''}`;
}

function updateMenuThemeButton() {
    const labels = { light: 'Tema: Dia', dark: 'Tema: Noche' };
    setButtonIcon(themeCycleButton, 'mobileTheme', '☼', labels[selectedThemeMode] || 'Tema: Día', true);
}

function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    selectedThemeMode = resolved;
    document.body.dataset.theme = resolved === 'dark' ? 'dark' : 'light';
    document.documentElement.style.setProperty(
        '--mobile-bg',
        resolved === 'dark'
            ? String(configState?.general?.mobileSellerDarkBg || '#16171d')
            : String(configState?.general?.mobileSellerLightBg || '#f6f3ee')
    );
    updateMenuThemeButton();
}

function cycleThemeMode() {
    const next = selectedThemeMode === 'dark' ? 'light' : 'dark';
    if (window.PrintLabTheme?.apply) {
        window.PrintLabTheme.apply(next);
    } else {
        try {
            localStorage.setItem('printlab-theme-mode', next);
        } catch (_) {
            // The visual state still changes for this screen.
        }
        document.documentElement.dataset.themeMode = next;
        document.documentElement.dataset.theme = next;
        document.documentElement.style.colorScheme = next;
    }
    applyTheme(next);
}

function syncMobileThemeFromGlobal() {
    const globalTheme = window.PrintLabTheme?.current?.();
    const next = globalTheme?.theme === 'dark' ? 'dark' : 'light';
    if (next !== selectedThemeMode || document.body.dataset.theme !== next) applyTheme(next);
}

function updatePhotoUi(src) {
    if (src) {
        sellerPhotoImage.src = src;
        sellerPhotoImage.hidden = false;
        sellerPhotoFallback.hidden = true;
        return;
    }
    sellerPhotoImage.hidden = true;
    sellerPhotoFallback.hidden = false;
}

function renderSellerPhoto() {
    const saved = localStorage.getItem(SELLER_PHOTO_STORAGE_KEY);
    const fallbackImage = firstFilled(configState?.general?.mobileSellerProfileImage, configState?.branding?.companyLogoUrl, configState?.branding?.logoUrl);
    updatePhotoUi(saved || fallbackImage || '');
}

function setButtonIcon(button, iconKey, fallback, label, withText = false) {
    if (!button) return;
    const iconValue = configState?.icons?.[iconKey] || fallback;
    const suffix = toIconSuffix(iconKey);
    const colorValue = configState?.general?.[`iconColor${suffix}`] || '';
    const sizeValue = Number(configState?.general?.[`iconSize${suffix}`]) || 0;
    if (colorValue) button.style.color = colorValue;
    if (sizeValue) {
        if (button.classList.contains('module-icon')) button.style.setProperty('--mobile-module-icon-size', `${sizeValue}px`);
        else button.style.setProperty('--mobile-header-icon-size', `${sizeValue}px`);
    }
    if (withText) {
        button.innerHTML = `${iconMarkup(iconValue, label)}<span>${escapeHtml(label)}</span>`;
        return;
    }
    button.innerHTML = iconMarkup(iconValue, label);
}

function applyMobileIcons() {
    setButtonIcon(refreshTopButton, 'mobileRefresh', '↻', 'Refrescar');
    setButtonIcon(menuToggleButton, 'mobileMenu', '⋯', 'Menú');
    setButtonIcon(document.getElementById('moduleQuotesButton'), 'mobileQuotes', '▣', 'Cotizaciones');
    setButtonIcon(document.getElementById('moduleOrdersButton'), 'mobileOrders', '◫', 'Órdenes');
    setButtonIcon(document.getElementById('modulePartnersButton'), 'mobilePartners', '◉', 'Socios');
    setButtonIcon(document.getElementById('moduleAlertsButton'), 'mobileAlerts', '◌', 'Alertas');
    setButtonIcon(createProspectButton, 'mobilePartners', '◉', 'Crear prospecto', true);
    setButtonIcon(createQuoteButton, 'mobileQuotes', '▣', 'Crear cotización', true);
    setButtonIcon(refreshMobileButton, 'mobileRefresh', '↻', 'Refrescar', true);
    updateMenuThemeButton();
}

function renderQuoteList(items) {
    if (!items.length) {
        activityList.innerHTML = '<div class="empty-state">No hay cotizaciones para mostrar.</div>';
        return;
    }
    activityList.innerHTML = items.map((item) => {
        const title = `${item.title}${item.dimension ? ` (${item.dimension})` : ''}`;
        const quantityLine = formatQuantity(item.quantity);
        const summaryLine = buildSummaryLine(item);
        return `
            <article class="quote-card">
                <div class="quote-card-head">
                    <div>
                        <p class="quote-title">${escapeHtml(title)}</p>
                        ${quantityLine ? `<p class="quote-subline">${escapeHtml(quantityLine)}</p>` : ''}
                        ${summaryLine ? `<p class="quote-meta">${escapeHtml(summaryLine)}</p>` : '<p class="quote-meta"></p>'}
                    </div>
                    <span class="status-pill ${item.status.key}">${escapeHtml(item.status.label)}</span>
                </div>
                <div class="quote-actions">
                    <button type="button" class="open-button" data-open-quote="${escapeHtml(item.code)}">Abrir</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderOrdersList(items) {
    if (!items.length) {
        activityList.innerHTML = '<div class="empty-state">No hay órdenes recientes.</div>';
        return;
    }
    activityList.innerHTML = items.map((item) => `
        <article class="quote-card">
            <div class="quote-card-head">
                <div>
                    <p class="quote-title">${escapeHtml(item.product_name || item.quote_code || item.order_code)}</p>
                    <p class="quote-subline">${escapeHtml(item.customer_name || 'Sin cliente')}</p>
                    <p class="quote-meta">${escapeHtml(firstFilled(item.machine_name, item.process_type, 'Producción'))}</p>
                </div>
                <span class="status-pill ${item.planning?.needsAttention ? 'alert' : 'sent'}">${item.planning?.needsAttention ? 'Alerta' : 'Orden'}</span>
            </div>
            <div class="quote-actions">
                <span>${escapeHtml(formatDate(item.created_at))}</span>
                <a class="open-button" href="/orden-produccion/${encodeURIComponent(item.order_code)}?mobilePreview=1">Abrir</a>
            </div>
        </article>
    `).join('');
}

function renderPartnersList(items) {
    if (!items.length) {
        activityList.innerHTML = '<div class="empty-state">No hay socios recientes.</div>';
        return;
    }
    activityList.innerHTML = items.map((item) => `
        <article class="quote-card">
            <div class="quote-card-head">
                <div>
                    <p class="quote-title">${escapeHtml(item.partner_name || item.nombre || 'Socio')}</p>
                    <p class="quote-subline">${escapeHtml(item.partner_code || item.codigo || '')}</p>
                    <p class="quote-meta">${escapeHtml(firstFilled(item.email, item.tax_id, 'Sin detalle adicional'))}</p>
                </div>
                <span class="status-pill sent">Socio</span>
            </div>
            <div class="partner-actions">
                <span></span>
                <button type="button" class="open-button" data-partner-quote="${escapeHtml(item.partner_code || '')}" data-partner-name="${escapeHtml(item.partner_name || item.nombre || '')}">Cotizar</button>
            </div>
        </article>
    `).join('');
}

function renderAlertsList(items) {
    const alertItems = items.filter((item) => item.planning?.needsAttention);
    if (!alertItems.length) {
        activityList.innerHTML = '<div class="empty-state">No hay alertas activas.</div>';
        return;
    }
    renderOrdersList(alertItems);
}

function renderActivity() {
    const term = mobileSearchInput.value.trim().toLowerCase();
    const quotes = [...dataState.quotes]
        .map(buildQuoteModel)
        .filter((item) => [item.code, item.title, item.dimension, item.material, item.finishes.join(' ')].join(' ').toLowerCase().includes(term || ''))
        .sort((a, b) => new Date(b.createdOn || 0).getTime() - new Date(a.createdOn || 0).getTime());
    const orders = (dataState.orders.items || []).filter((item) =>
        [item.order_code, item.customer_name, item.product_name, item.process_type].join(' ').toLowerCase().includes(term || '')
    );
    const partners = dataState.partners.filter((item) =>
        [item.partner_name, item.partner_code, item.email].join(' ').toLowerCase().includes(term || '')
    );
    if (activeFilter === 'quotes') return renderQuoteList(quotes);
    if (activeFilter === 'orders') return renderOrdersList(orders);
    if (activeFilter === 'partners') return renderPartnersList(partners);
    return renderAlertsList(orders);
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Error de carga.');
    return payload;
}

async function loadConfig() {
    configState = await fetchJson(CONFIG_ENDPOINT);
    sellerName.textContent = firstFilled(configState?.general?.mobileSellerName, configState?.session?.currentUser, 'Administrador');
    sellerPhotoFallback.textContent = initialsFromName(sellerName.textContent);
    renderSellerPhoto();
    applyMobileIcons();
    applyTheme(getThemePreference());
}

async function refreshData() {
    const [quotesPayload, ordersPayload, partnersPayload] = await Promise.all([
        fetchJson(`${QUOTES_ENDPOINT}?limit=60`),
        fetchJson(`${ORDERS_ENDPOINT}?limit=30`),
        fetchJson(`${PARTNERS_ENDPOINT}?limit=20`)
    ]);
    dataState = {
        quotes: quotesPayload.cotizaciones || [],
        orders: ordersPayload || { items: [] },
        partners: partnersPayload.socios || []
    };
    renderActivity();
}

function scheduleAutoRefresh() {
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
        refreshData().catch((error) => console.error(error));
    }, 20000);
}

function renderDetailRows(rows) {
    return rows.map((row) => `
        <div class="detail-row">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.value)}</strong>
        </div>
    `).join('');
}

async function openQuoteDetail(quoteCode) {
    const payload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}`);
    const quote = payload.cotizacion || {};
    const line = Array.isArray(payload.lineas) && payload.lineas.length ? payload.lineas[0] : {};
    const raw = parseRawJson(line.raw_data || line.rawData || {});
    const productName = firstFilled(raw['NOMBRE TRABAJO'], line.product_name, line.product_code, quote.customer_name, quoteCode);
    const dimension = extractDimension(raw);
    const title = `${productName}${dimension ? ` (${dimension})` : ''}`;
    const quantity = formatQuantity(firstFilled(raw.CANTIDAD, line.quantity, line.quantityProducts));
    const process = firstFilled(raw['TIPO IMPRESION'], raw.process_type, line.process_type, 'Flexografía');
    const machine = firstFilled(raw.MAQUINA, raw.machine_name, line.machine_name, '');
    const finishes = extractFinishes(raw);
    const subtotal = firstFilled(line.subtotal_1, line.subtotal_cost, payload.resumen?.subtotal1, '');
    const total = firstFilled(line.total_cost, payload.resumen?.subtotal1, '');
    detailTitle.textContent = title;
    const blocks = [];
    blocks.push(`<section class="detail-block"><span class="detail-label">Información general</span><div class="detail-value">${escapeHtml(quantity || 'Sin cantidad')}</div></section>`);
    blocks.push(`<section class="detail-block"><span class="detail-label">Impresión</span>${renderDetailRows([{ label: 'Proceso', value: process || 'Sin dato' }, { label: 'Máquina', value: machine || 'Sin dato' }])}</section>`);
    if (finishes.length) blocks.push(`<section class="detail-block"><span class="detail-label">Acabados</span>${renderDetailRows(finishes)}</section>`);
    blocks.push(`<section class="detail-block"><span class="detail-label">Resumen económico</span>${renderDetailRows([{ label: 'Subtotal', value: subtotal !== '' ? String(subtotal) : '0' }, { label: 'Total', value: total !== '' ? String(total) : '0' }])}</section>`);
    detailBody.innerHTML = blocks.join('');
    quoteDetailSheet.hidden = false;
}

function closeMenu() {
    menuPanel.classList.remove('is-open');
    menuPanel.setAttribute('aria-hidden', 'true');
    menuToggleButton.setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
    const isOpen = menuPanel.classList.contains('is-open');
    if (isOpen) {
        closeMenu();
    } else {
        menuPanel.classList.add('is-open');
        menuPanel.setAttribute('aria-hidden', 'false');
        menuToggleButton.setAttribute('aria-expanded', 'true');
    }
}

function closeDetail() {
    quoteDetailSheet.hidden = true;
}

function openQuickAction(mode, partner = null) {
    quickActionMode = mode;
    quickSelectedPartner = partner;
    quickActionTitle.textContent = mode === 'prospect' ? 'Crear prospecto' : 'Crear cotización';
    quickActionSubmit.textContent = mode === 'prospect' ? 'Crear prospecto' : 'Crear cotización';
    quickTaxWrapper.hidden = mode !== 'prospect';
    quickBillingEmailWrapper.hidden = mode !== 'prospect';
    quickQuoteFields.hidden = mode !== 'quote';
    quickCustomerName.value = partner?.name || '';
    quickContactName.value = '';
    quickTaxId.value = '';
    quickBillingEmail.value = '';
    quickProductName.value = '';
    quickProductType.value = '';
    quickQuantity.value = '';
    quickShape.value = '';
    quickProcessType.value = 'Flexografía';
    quickComments.value = '';
    quickAttachments.value = '';
    quickAttachmentsPreview.textContent = 'Sin adjuntos seleccionados.';
    document.querySelectorAll('.quick-finish').forEach((checkbox) => {
        checkbox.checked = false;
    });
    setQuickStatus('');
    quickActionSheet.hidden = false;
}

function closeQuickAction() {
    quickActionSheet.hidden = true;
}

async function createProspect() {
    const payload = await fetchJson(PARTNERS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            partner_name: quickCustomerName.value.trim(),
            tax_id: quickTaxId.value.trim(),
            email_facturacion: quickBillingEmail.value.trim(),
            contact_name: quickContactName.value.trim(),
            contact_email: quickBillingEmail.value.trim()
        })
    });
    return payload.socio || {};
}

async function createQuote(partner) {
    const quotePayload = await fetchJson(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_name: quickCustomerName.value.trim(),
            customer_code: partner?.partner_code || '',
            contact_name: quickContactName.value.trim(),
            email: partner?.email_facturacion || quickBillingEmail.value.trim(),
            salesperson_name: sellerName.textContent.trim()
        })
    });
    const quote = quotePayload.cotizacion || {};
    const finishes = Array.from(document.querySelectorAll('.quick-finish:checked')).map((item) => item.value);
    const linePayload = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quote.quote_code)}/lineas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product_code: quickProductName.value.trim() || quickProductType.value.trim() || 'Producto',
            product_name: quickProductName.value.trim() || quickProductType.value.trim() || 'Producto',
            quantity: quickQuantity.value || '1',
            process_type: quickProcessType.value,
            total_cost: 0,
            unit_price: 0,
            notes: quickComments.value.trim(),
            raw_data: {
                'NOMBRE TRABAJO': quickProductName.value.trim(),
                'TIPO PRODUCTO': quickProductType.value.trim(),
                'FORMA': quickShape.value.trim(),
                'CANTIDAD': quickQuantity.value || '1',
                'TIPO IMPRESION': quickProcessType.value,
                'ACABADOS': finishes.join(' + '),
                'COMENTARIOS': quickComments.value.trim()
            }
        })
    });
    const line = linePayload.linea || {};
    const files = Array.from(quickAttachments.files || []);
    for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        const contentBase64 = String(dataUrl).split(',')[1] || '';
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quote.quote_code)}/lineas/${encodeURIComponent(line.line_code)}/adjuntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileExt: file.name.includes('.') ? file.name.split('.').pop() : '',
                contentBase64,
                notes: quickComments.value.trim(),
                uploadedBy: sellerName.textContent.trim()
            })
        });
    }
    return quote;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function initEvents() {
    mobileSearchInput.addEventListener('input', renderActivity);
    refreshTopButton.addEventListener('click', () => refreshData().catch(console.error));

    menuToggleButton?.addEventListener('click', () => {
        toggleMenu();
    });

    // Cerrar menú al hacer clic en el backdrop
    menuPanel?.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-menu="true"]')) {
            closeMenu();
        }
    });

    createProspectButton.addEventListener('click', () => {
        closeMenu();
        openQuickAction('prospect');
    });
    createQuoteButton.addEventListener('click', () => {
        closeMenu();
        openQuickAction('quote');
    });
    refreshMobileButton.addEventListener('click', () => {
        closeMenu();
        refreshData().catch(console.error);
    });
    themeCycleButton.addEventListener('click', () => {
        cycleThemeMode();
        closeMenu();
    });
    window.addEventListener('storage', (event) => {
        if (event.key === 'printlab-theme-mode') syncMobileThemeFromGlobal();
    });
    window.addEventListener('message', (event) => {
        if (event.origin === window.location.origin && event.data?.type === 'printlab-theme-change') {
            window.setTimeout(syncMobileThemeFromGlobal, 0);
        }
    });
    new MutationObserver(syncMobileThemeFromGlobal).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    moduleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            moduleButtons.forEach((item) => item.classList.toggle('active', item === button));
            activeFilter = button.dataset.filter || 'quotes';
            renderActivity();
        });
    });

    activityList.addEventListener('click', (event) => {
        const openButton = event.target.closest('[data-open-quote]');
        if (openButton) {
            openQuoteDetail(openButton.dataset.openQuote).catch((error) => {
                detailTitle.textContent = 'No fue posible cargar';
                detailBody.innerHTML = `<section class="detail-block"><div class="detail-value">${escapeHtml(error.message)}</div></section>`;
                quoteDetailSheet.hidden = false;
            });
            return;
        }
        const partnerQuoteButton = event.target.closest('[data-partner-quote]');
        if (partnerQuoteButton) {
            openQuickAction('quote', {
                code: partnerQuoteButton.dataset.partnerQuote,
                name: partnerQuoteButton.dataset.partnerName
            });
        }
    });

    detailCloseButton.addEventListener('click', closeDetail);
    quoteDetailSheet.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-detail="true"]')) closeDetail();
    });

    quickActionCloseButton.addEventListener('click', closeQuickAction);
    quickActionSheet.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-quick-action="true"]')) closeQuickAction();
    });
    quickActionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setQuickStatus('Procesando...');
        try {
            let partner = null;
            if (quickActionMode === 'prospect') {
                partner = await createProspect();
                setQuickStatus(`Prospecto ${partner.partner_name || quickCustomerName.value.trim()} creado.`);
            } else {
                partner = quickSelectedPartner?.code ? { partner_code: quickSelectedPartner.code } : null;
                const quote = await createQuote(partner);
                setQuickStatus(`Cotización ${quote.quote_code || ''} creada.`);
            }
            await refreshData();
            window.setTimeout(closeQuickAction, 600);
        } catch (error) {
            setQuickStatus(error.message || 'No fue posible completar la acción.', true);
        }
    });

    sellerPhotoButton.addEventListener('click', () => sellerPhotoInput.click());
    quickAttachments.addEventListener('change', () => {
        const files = Array.from(quickAttachments.files || []);
        quickAttachmentsPreview.innerHTML = files.length
            ? files.map((file) => `<div>${escapeHtml(file.name)}</div>`).join('')
            : 'Sin adjuntos seleccionados.';
    });
    sellerPhotoInput.addEventListener('change', async () => {
        const file = sellerPhotoInput.files?.[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        localStorage.setItem(SELLER_PHOTO_STORAGE_KEY, dataUrl);
        updatePhotoUi(dataUrl);
    });
}

async function init() {
    initEvents();
    await loadConfig();
    await refreshData();
    scheduleAutoRefresh();
}

init().catch((error) => {
    activityList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'No fue posible abrir la vista móvil.')}</div>`;
});
