const CONFIG_ENDPOINT = '/api/config/shell';
const PRODUCTS_ENDPOINT = '/api/productos';
const PRESENTATION_KEY = 'ordenes-produccion';

const productsSearchInput = document.getElementById('productsSearchInput');
const productsTableBody = document.getElementById('productsTableBody');

let browserConfig = null;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || source.endsWith('.svg');
}

function isImageValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(normalized);
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

function getPresentationConfig(config, key) {
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const layout = config.layout || {};
    return {
        tabColor: firstFilled(
            general.tabColorOrdersRoot,
            presentation.tabColor,
            general.tabColor,
            '#7f7f7f'
        ),
        iconSize: Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20
    };
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

function productDocumentRoute(productCode) {
    return `/producto-documento?codigo=${encodeURIComponent(productCode || '')}`;
}

function withShellParam(route) {
    const [path, hash = ''] = String(route || '').split('#');
    const joiner = path.includes('?') ? '&' : '?';
    const finalPath = path.includes('shell=1') ? path : `${path}${joiner}shell=1`;
    return hash ? `${finalPath}#${hash}` : finalPath;
}

function openRouteInShell(route, label) {
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        return false;
    }
    window.parent.postMessage({ type: 'erp-open-tab', route: withShellParam(route), label }, window.location.origin);
    return true;
}

function applyBrowserConfig(config) {
    browserConfig = config || {};
    const root = document.documentElement;
    const presentation = getPresentationConfig(browserConfig, PRESENTATION_KEY);
    root.style.setProperty('--tab-color', presentation.tabColor);
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la solicitud.');
    return payload;
}

async function loadConfig() {
    try {
        applyBrowserConfig(await fetchJson(CONFIG_ENDPOINT));
    } catch (error) {
        browserConfig = browserConfig || {};
    }
}

function renderErrorRow(message) {
    productsTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(message)}</td></tr>`;
}

function getProductRowLabel(item) {
    return firstFilled(item.product_name, item.product_code, item.line_code, 'producto');
}

async function loadProducts(search = '') {
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('q', search);
    const payload = await fetchJson(`${PRODUCTS_ENDPOINT}?${params.toString()}`);
    const items = Array.isArray(payload.productos) ? payload.productos : [];
    const openIcon = getOpenIconConfig();
    productsTableBody.innerHTML = items.length ? items.map((item) => {
        const route = productDocumentRoute(item.product_code);
        const label = getProductRowLabel(item);
        return `
        <tr>
            <td>${escapeHtml(item.product_code || '')}</td>
            <td>${escapeHtml(item.quote_code || '')}</td>
            <td>${escapeHtml(item.line_code || '')}</td>
            <td>${escapeHtml(item.client_name || '')}</td>
            <td>${escapeHtml(label)}</td>
            <td>${escapeHtml(formatDate(item.last_quoted_at || item.created_at))}</td>
            <td><a class="browser-open-link" href="${escapeHtml(route)}" data-route="${escapeHtml(route)}" data-label="Producto ${escapeHtml(label)}" aria-label="Abrir producto ${escapeHtml(label)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir producto', 'table-icon-media')}</a></td>
        </tr>
    `;
    }).join('') : '<tr><td colspan="7">No hay productos registrados.</td></tr>';
}

productsSearchInput?.addEventListener('input', () => {
    loadProducts(productsSearchInput.value).catch((error) => {
        renderErrorRow(error.message);
    });
});

productsTableBody?.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    if (openRouteInShell(link.dataset.route, link.dataset.label)) {
        event.preventDefault();
    }
});

async function init() {
    try {
        await loadConfig();
        await loadProducts();
    } catch (error) {
        renderErrorRow(error.message);
    }
}

init();
