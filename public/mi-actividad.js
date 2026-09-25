const CONFIG_ENDPOINT = '/api/config/shell';
const SESSION_STORAGE_KEY = 'erp-user-session';

const companyLogo = document.getElementById('mactCompanyLogo');
const brandFallback = document.getElementById('mactBrandFallback');
const statusEl = document.getElementById('mactStatus');
const innerEl = document.getElementById('mactInner');

function readSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (_) {
        return null;
    }
}

function sessionHeaders() {
    const session = readSession();
    if (!session) return {};
    return {
        'x-erp-session': JSON.stringify({
            username: session.username || '',
            name: session.name || '',
            permissionName: session.permissionName || ''
        })
    };
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const MACT_SIDEBAR_ITEMS = [
    { route: '/socios', label: 'Socios', iconKey: 'dashboardBusinessPartners', modules: ['socios'] },
    { route: '/productos', label: 'SKU', iconKey: 'dashboardProducts', modules: ['productos'] },
    { route: '/cotizaciones', label: 'Cotizaciones', iconKey: 'dashboardQuotes', modules: ['cotizaciones'] },
    { route: '/ordenes-produccion', label: 'Órdenes', iconKey: 'dashboardOrders', modules: ['ordenes'] },
    { route: '/inventario-materiales', label: 'Inventarios', iconKey: 'dashboardInventory', modules: ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'inventario-sellos', 'inventario-cilindros', 'inventario-anilox', 'inventario-pt'] },
    { route: '/configuracion-general', label: 'Configuración', iconKey: 'dashboardSettings', modules: ['configuracion-general'] },
    { route: '/capacitacion', label: 'Capacitación', iconKey: 'dashboardCapacitacion', modules: ['capacitacion'] },
    { route: '/notificaciones.html', label: 'Notificaciones', iconKey: 'dashboardNotifications', modules: ['notificaciones'] }
];

// Mismo iconMarkup()/mecanismo de iconos que public/dashboard.js y public/topbar-tools.js
// (Configuración → Diseño → Iconos), copiado aquí siguiendo la misma convención con la
// que cada pantalla del sistema trae su propia copia local de esta función.
function mactIconMarkup(value, altText, extraClass = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(normalized)) {
        const safeUrl = escapeHtml(value);
        return `<span class="icon-svg-mask ${extraClass}" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
    }
    if (normalized.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(normalized)) {
        return `<img src="${escapeHtml(value)}" alt="${escapeHtml(altText)}" class="icon-image ${extraClass}">`;
    }
    return `<span class="icon-glyph ${extraClass}">${escapeHtml(value || '')}</span>`;
}

function mactNavigate(route, label) {
    if (isShellEmbedded()) {
        window.parent.postMessage({ type: 'erp-open-tab', route, label: label || 'Documento' }, window.location.origin);
        return;
    }
    window.location.href = route;
}

async function renderSidebar() {
    const nav = document.getElementById('mactSidebar');
    if (!nav) return;
    const canView = (modules) => {
        if (window.ErpAccess?.canViewModule) return modules.some((key) => window.ErpAccess.canViewModule(key));
        return true;
    };
    const visibleItems = MACT_SIDEBAR_ITEMS.filter((item) => canView(item.modules));
    if (!visibleItems.length) return;

    let config = {};
    try {
        const response = await fetch('/api/config/general');
        if (response.ok) config = await response.json();
    } catch (_) {
        config = {};
    }

    nav.innerHTML = visibleItems.map((item) => {
        const suffix = item.iconKey.charAt(0).toUpperCase() + item.iconKey.slice(1);
        const iconValue = config?.icons?.[item.iconKey] || '□';
        const color = config?.general?.[`iconColor${suffix}`] || '#7a8794';
        const hover = config?.general?.[`iconColorHover${suffix}`] || color || '#17abdf';
        const fullSize = Number(config?.general?.[`iconSize${suffix}`]) || 20;
        // Mismo ícono/color que el dashboard principal, al doble del tamaño chico
        // anterior, acotado para que quepa en el botón sin importar qué tan grande
        // esté configurado el ícono original.
        const size = Math.max(28, Math.min(48, Math.round(fullSize * 0.6)));
        return `<button type="button" class="mact-sidebar-btn" data-route="${escapeHtml(item.route)}" data-label="${escapeHtml(item.label)}">` +
            `<span class="mact-sidebar-icon" style="--icon-color:${escapeHtml(color)};--icon-hover-color:${escapeHtml(hover)};--config-icon-size:${size}px">${mactIconMarkup(iconValue, item.label, 'table-icon-media')}</span>` +
            `<span class="lbl">${escapeHtml(item.label)}</span>` +
            `</button>`;
    }).join('');
    nav.hidden = false;
    nav.addEventListener('click', (event) => {
        const btn = event.target.closest('.mact-sidebar-btn');
        if (!btn) return;
        mactNavigate(btn.getAttribute('data-route'), btn.getAttribute('data-label'));
    });
}

function applyBranding(config) {
    const branding = config?.branding || {};
    const general = config?.general || {};
    const companyName = String(branding.companyName || general.companyName || 'PrintLab').trim() || 'PrintLab';
    const logoUrl = String(branding.companyLogoUrl || branding.logoUrl || '').trim();
    if (brandFallback) {
        brandFallback.textContent = companyName;
        brandFallback.hidden = Boolean(logoUrl);
    }
    if (companyLogo) {
        companyLogo.src = logoUrl || '';
        companyLogo.hidden = !logoUrl;
    }
}

async function loadBranding() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('No fue posible cargar la configuración.');
        applyBranding(await response.json());
    } catch (_) {
        applyBranding(null);
    }
}

async function loadActivity() {
    try {
        const usuarioVendedor = new URLSearchParams(window.location.search).get('usuarioVendedor') || '';
        const url = usuarioVendedor
            ? '/api/vendedores/dashboard?usuarioVendedor=' + encodeURIComponent(usuarioVendedor)
            : '/api/vendedores/dashboard';
        const res = await fetch(url, { headers: sessionHeaders() });
        const payload = await res.json();
        if (!res.ok || !payload.isVendedor) {
            statusEl.textContent = 'Esta vista está disponible únicamente para usuarios con vendedor asignado.';
            return;
        }
        statusEl.hidden = true;
        innerEl.hidden = false;
        renderSidebar();
        if (usuarioVendedor) window.dvpReload?.(usuarioVendedor);
    } catch (error) {
        statusEl.textContent = 'No fue posible cargar tu actividad.';
    }
}

async function init() {
    if (isShellEmbedded()) document.body.classList.add('shell-embedded');
    const session = readSession();
    if (!session?.username) {
        window.location.replace('/login');
        return;
    }
    loadBranding();
    await loadActivity();
}

init();
