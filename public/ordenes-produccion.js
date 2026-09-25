const CONFIG_ENDPOINT = '/api/config/shell';
const PRESENTATION_KEY = 'ordenes-produccion';

const ordersSearchInput = document.getElementById('ordersSearchInput');
const ordersTableBody = document.getElementById('ordersTableBody');

let browserConfig = null;
let ordersSortState = { key: null, dir: null };

function sortOrdersList(data) {
    if (!ordersSortState.key || !ordersSortState.dir) return data;
    return [...data].sort((a, b) => {
        const key = ordersSortState.key;
        let va = a[key], vb = b[key];
        if (va == null) return 1;
        if (vb == null) return -1;
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        if (va < vb) return ordersSortState.dir === 'asc' ? -1 : 1;
        if (va > vb) return ordersSortState.dir === 'asc' ? 1 : -1;
        const da = a.created_at, db = b.created_at;
        if (da && db) return new Date(db) - new Date(da);
        return 0;
    });
}

function getOrdersSortIcon(dir) {
    const config = browserConfig || {};
    const icons = config.icons || {};
    const general = config.general || {};
    const key = dir === 'asc' ? 'sortAsc' : 'sortDesc';
    return {
        value: icons[key] || (dir === 'asc' ? '\u25B2' : '\u25BC'),
        color: firstFilled(general['iconColorSortAsc'], general.iconColor, '#607286'),
        size: Number(firstFilled(general['iconSizeSortAsc'], '14')) || 14
    };
}

function updateOrdersSortIndicators() {
    const ascConf = getOrdersSortIcon('asc');
    const descConf = getOrdersSortIcon('desc');
    document.querySelectorAll('th[data-sort-key]').forEach(th => {
        const span = th.querySelector('.sort-indicator');
        if (!span) return;
        if (ordersSortState.key === th.dataset.sortKey) {
            th.classList.add('is-sorted');
            const conf = ordersSortState.dir === 'asc' ? ascConf : descConf;
            span.innerHTML = iconMarkup(conf.value, 'Orden ' + (ordersSortState.dir === 'asc' ? 'ascendente' : 'descendente'), 'sort-indicator-icon');
            span.style.setProperty('--icon-color', conf.color);
            span.style.setProperty('--config-icon-size', conf.size + 'px');
        } else {
            th.classList.remove('is-sorted');
            span.innerHTML = '';
            span.style.removeProperty('--icon-color');
            span.style.removeProperty('--config-icon-size');
        }
    });
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const ORDER_PLANNING_STATUS_LABELS = {
    PENDIENTE_VENTAS: 'Pendiente de Liberación',
    PENDIENTE_PLANIFICACION: 'Pendiente en Planificación',
    EN_GANTT: 'Lanzada a Gantt',
    DEVUELTA_VENTAS: 'Devuelta a Ventas'
};

function orderStatusInfo(item = {}) {
    const det = (item.detencion && item.detencion.estado) || item.estado_detencion || '';
    if (det === 'DETENIDA') return { label: 'Detenida', state: 'stopped' };
    if (det === 'ANULADA') return { label: 'Anulada', state: 'void' };
    const steps = Array.isArray(item.steps) ? item.steps : [];
    if (!steps.length) {
        const planningStatus = item.planning?.planningStatus || '';
        return { label: ORDER_PLANNING_STATUS_LABELS[planningStatus] || 'Pendiente', state: 'pending' };
    }
    const current = steps.find((step) => String(step.routeStatus || '').toUpperCase() !== 'COMPLETADO');
    if (!current) return { label: 'Completado', state: 'done' };
    const routeStatus = String(current.routeStatus || '').toUpperCase();
    const state = routeStatus === 'PARO' ? 'late' : (['RUN', 'SETUP'].includes(routeStatus) ? 'active' : 'pending');
    return { label: current.processName || '', state };
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

function getDeleteIconConfig() {
    const general = browserConfig?.general || {};
    return {
        value: browserConfig?.icons?.lineDelete || browserConfig?.icons?.loginRepositoryDelete || browserConfig?.icons?.adminUserDelete || '🗑',
        color: firstFilled(general.iconColorLineDelete, '#a74343'),
        hover: firstFilled(general.iconColorHoverLineDelete, '#d03535'),
        size: Number(firstFilled(general.iconSizeLineDelete, 18)) || 18
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
    if (!ordersTableBody.querySelector('a[data-route]')) {
        ordersTableBody.innerHTML = '<tr><td colspan="8">Cargando las órdenes desde el servidor, un momento por favor…</td></tr>';
    }
    const mensajeSinRespuesta = 'No pudimos traer las órdenes en este momento. Revisa la conexión e intenta de nuevo.';
    let response;
    let payload;
    try {
        response = await fetch(`/api/ordenes-produccion?${params.toString()}`);
        payload = await response.json();
    } catch (error) {
        throw new Error(mensajeSinRespuesta);
    }
    if (!response.ok) {
        throw new Error(payload.error || mensajeSinRespuesta);
    }
    const items = payload.items || [];
    const openIcon = getOpenIconConfig();
    const deleteIcon = getDeleteIconConfig();
    const canDelete = hasAdminToolsAccess();
    const displayItems = sortOrdersList(items);
    updateOrdersSortIndicators();
    ordersTableBody.innerHTML = displayItems.length ? displayItems.map((item) => {
        const route = `/orden-produccion/${encodeURIComponent(item.order_code)}`;
        const statusInfo = orderStatusInfo(item);
        const openBtn = `<a class="browser-open-link" href="${route}" data-route="${route}" data-label="Orden ${escapeHtml(item.order_code)}" aria-label="Abrir orden ${escapeHtml(item.order_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir orden', 'table-icon-media')}</a>`;
        const deleteBtn = canDelete ? `<button type="button" class="browser-open-link browser-open-link-danger" data-delete-order="${escapeHtml(item.order_code)}" aria-label="Eliminar orden" title="Eliminar orden" style="--icon-color:${escapeHtml(deleteIcon.color)};--icon-hover-color:${escapeHtml(deleteIcon.hover)};--config-icon-size:${escapeHtml(String(deleteIcon.size))}px;">${iconMarkup(deleteIcon.value, 'Eliminar orden', 'table-icon-media')}</button>` : '';
        return `
        <tr>
            <td>${escapeHtml(item.order_code)}</td>
            <td>${escapeHtml(item.quote_code)}</td>
            <td>${escapeHtml(item.line_code)}</td>
            <td>${escapeHtml(item.customer_name)}</td>
            <td>${escapeHtml(item.job_name)}</td>
            <td title="${escapeHtml(item.created_at || '')}">${escapeHtml(formatDate(item.created_at))}</td>
            <td><span class="order-status-chip" data-state="${escapeHtml(statusInfo.state)}">${escapeHtml(statusInfo.label)}</span></td>
            <td class="order-actions-cell"><div class="order-actions-row">${openBtn}${deleteBtn}</div></td>
        </tr>
    `;
    }).join('') : '<tr><td colspan="8">No hay ordenes registradas.</td></tr>';
}

ordersSearchInput?.addEventListener('input', () => {
    loadOrders(ordersSearchInput.value).catch((error) => {
        ordersTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
});

ordersTableBody?.closest('table')?.querySelector('thead')?.addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort-key]');
    if (!th) return;
    const key = th.dataset.sortKey;
    if (ordersSortState.key === key) {
        ordersSortState.dir = ordersSortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        ordersSortState.key = key;
        ordersSortState.dir = 'asc';
    }
    loadOrders(ordersSearchInput.value).catch((error) => {
        ordersTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
});

ordersTableBody?.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-order]');
    if (deleteButton) {
        const code = deleteButton.dataset.deleteOrder;
        if (!code) return;
        const confirmed = window.confirm(`Se eliminará la orden ${code}. Esta acción no se puede deshacer. ¿Deseas continuar?`);
        if (!confirmed) return;
        fetch(`/api/ordenes-produccion/${encodeURIComponent(code)}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                loadOrders(ordersSearchInput?.value || '');
            })
            .catch(error => {
                console.error(error);
                window.alert(error.message || 'No fue posible eliminar la orden.');
            });
        return;
    }
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
        ordersTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
