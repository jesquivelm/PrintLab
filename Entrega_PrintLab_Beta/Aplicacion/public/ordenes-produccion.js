const CONFIG_ENDPOINT = '/api/config/shell';
const PRESENTATION_KEY = 'ordenes-produccion';

const ordersSearchInput = document.getElementById('ordersSearchInput');
const ordersTableBody = document.getElementById('ordersTableBody');

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

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
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
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        return false;
    }
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function applyBrowserConfig(config) {
    browserConfig = config || {};
    const root = document.documentElement;
    const presentation = getPresentationConfig(browserConfig, PRESENTATION_KEY);
    root.style.setProperty('--tab-color', presentation.tabColor);
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

async function loadOrders(search = '') {
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('q', search);
    const response = await fetch(`/api/ordenes-produccion?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar las ordenes.');
    }
    const items = payload.items || [];
    const openIcon = getOpenIconConfig();
    ordersTableBody.innerHTML = items.length ? items.map((item) => {
        const route = `/orden-produccion/${encodeURIComponent(item.order_code)}`;
        return `
        <tr>
            <td>${escapeHtml(item.order_code)}</td>
            <td>${escapeHtml(item.quote_code)}</td>
            <td>${escapeHtml(item.line_code)}</td>
            <td>${escapeHtml(item.customer_name)}</td>
            <td>${escapeHtml(item.job_name)}</td>
            <td>${escapeHtml(formatDate(item.created_at))}</td>
            <td><a class="browser-open-link" href="${route}" data-route="${route}" data-label="Orden ${escapeHtml(item.order_code)}" aria-label="Abrir orden ${escapeHtml(item.order_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir orden', 'table-icon-media')}</a></td>
        </tr>
    `;
    }).join('') : '<tr><td colspan="7">No hay ordenes registradas.</td></tr>';
}

ordersSearchInput?.addEventListener('input', () => {
    loadOrders(ordersSearchInput.value).catch((error) => {
        ordersTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});

ordersTableBody?.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    if (openRouteInShell(link.dataset.route, link.dataset.label)) {
        event.preventDefault();
    }
});

async function init() {
    try {
        await loadConfig();
        await loadOrders();
    } catch (error) {
        ordersTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
