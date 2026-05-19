const CONFIG_ENDPOINT = '/api/config/shell';
const PRESENTATION_KEY = 'inventario-troqueles';

const troquelesSearchInput = document.getElementById('troquelesSearchInput');
const troquelesTableBody = document.getElementById('troquelesTableBody');

let browserConfig = null;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isShellEmbedded() {
    return window !== window.parent && new URLSearchParams(window.location.search).get('shell') === '1';
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || source.endsWith('.svg');
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

function formatCellValue(value, digits = 4) {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    if (Number.isFinite(numeric) && String(value).trim() !== '') {
        return new Intl.NumberFormat('es-CR', { maximumFractionDigits: digits }).format(numeric);
    }
    return String(value);
}

function getPresentationConfig(config, key) {
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const layout = config.layout || {};
    return {
        tabColor: presentation.tabColor || general.tabColor || '#7f7f7f',
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

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

if (isShellEmbedded()) {
    document.body.classList.add('shell-embedded');
}

async function loadTroqueles(search = '') {
    const params = new URLSearchParams({ limit: '500' });
    if (search) params.set('q', search);

    const response = await fetch(`/api/inventario/troqueles?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los troqueles.');
    }

    const items = payload.items || [];
    const openIcon = getOpenIconConfig();

    troquelesTableBody.innerHTML = items.length ? items.map((item) => {
        const route = `/inventario-troqueles/documento?codigo=${encodeURIComponent(item.codigo)}`;
        return `
        <tr>
            <td>${escapeHtml(item.codigo)}</td>
            <td>${escapeHtml(item.descripcion)}</td>
            <td>${escapeHtml(formatCellValue(item.ancho_etiqueta_in))}</td>
            <td>${escapeHtml(formatCellValue(item.largo_etiqueta_in))}</td>
            <td>${escapeHtml(formatCellValue(item.desarrollo_in))}</td>
            <td>${escapeHtml(formatCellValue(item.dientes, 0))}</td>
            <td>${escapeHtml(formatCellValue(item.cantidad_filas, 0))}</td>
            <td>${escapeHtml(formatCellValue(item.repeticiones, 0))}</td>
            <td>${escapeHtml(item.estado || '—')}</td>
            <td><a class="browser-open-link" href="${route}" data-route="${route}" data-label="Troquel ${escapeHtml(item.codigo)}" aria-label="Abrir troquel ${escapeHtml(item.codigo)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir troquel', 'table-icon-media')}</a></td>
        </tr>`;
    }).join('') : '<tr><td colspan="10">No hay troqueles registrados.</td></tr>';
}

troquelesSearchInput?.addEventListener('input', () => {
    loadTroqueles(troquelesSearchInput.value).catch((error) => {
        troquelesTableBody.innerHTML = `<tr><td colspan="10">${escapeHtml(error.message)}</td></tr>`;
    });
});

troquelesTableBody?.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    if (openRouteInShell(link.dataset.route, link.dataset.label)) {
        event.preventDefault();
    }
});

async function init() {
    try {
        await loadConfig();
        await loadTroqueles();
    } catch (error) {
        troquelesTableBody.innerHTML = `<tr><td colspan="10">${escapeHtml(error.message)}</td></tr>`;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
});

window.addEventListener('focus', () => {
    loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
});

init();
