const CONFIG_ENDPOINT = '/api/config/shell';
const SESSION_STORAGE_KEY = 'erp-user-session';
const DASHBOARD_CONFIG_CACHE_KEY = 'erp-dashboard-config-cache';
const DASHBOARD_CONFIG_CACHE_TTL_MS = 60 * 1000;
const DASHBOARD_CONFIG_CACHE_TEXT_LIMIT = 24000;
const DASHBOARD_CONFIG_CACHE_MAX_PAYLOAD_CHARS = 2 * 1024 * 1024;
const tabsContainer = document.getElementById('dashboardTabs');
const tabsBar = document.querySelector('.dashboard-tabs-bar');
const homePanel = document.getElementById('dashboardHome');
const workspacePanel = document.getElementById('dashboardWorkspace');
const workspaceShell = document.querySelector('.dashboard-workspace-shell');
const pageTitle = document.getElementById('dashboardPageTitle');
const companyLogo = document.getElementById('dashboardCompanyLogo');
const brandFallback = document.getElementById('dashboardBrandFallback');
const favoritesPanel = document.getElementById('dashboardFavorites');
const favoritesBody = document.getElementById('dashboardFavoritesBody');
const bdfgShell = document.getElementById('dashboardBdfgShell');
const bdfgPrimary = document.getElementById('dashboardBdfgPrimary');
const bdfgButton = document.getElementById('dashboardBdfgButton');
const bdfgIcon = document.getElementById('dashboardBdfgIcon');
const bdfgBadge = document.getElementById('dashboardBdfgBadge');
const bdfgBridge = document.getElementById('dashboardBdfgBridge');
const bdfgCloseButton = document.getElementById('dashboardBdfgClose');
const bdfgTitle = document.getElementById('dashboardBdfgTitle');
const bdfgSubtitle = document.getElementById('dashboardBdfgSubtitle');
const bdfgPanel = document.getElementById('dashboardBdfgPanel');
const bdfgRadialBridge = document.getElementById('dashboardBdfgRadialBridge');
const dvpPanel = document.getElementById('dvpPanel');
const dvpPanelHomeParent = document.getElementById('dvpHomeSlot') || (dvpPanel ? dvpPanel.parentElement : null);
document.getElementById('dvpGotoFullBtn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openTab('/mi-actividad.html', 'Tu Actividad');
    setBdfgOpen(false, 'actions');
});
document.getElementById('dvpCloseBtn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    setBdfgOpen(false, 'actions');
});

const HOME_TAB_ID = 'home';
const FAVORITE_DOCUMENTS_STORAGE_KEY = 'erp-favorite-documents';
const BDFG_FAVORITES_PANEL_POSITION_STORAGE_KEY = 'erp-bdfg-favorites-panel-position';
const NOTIFICATION_THREADS_ENDPOINT = '/api/notification-center/threads?limit=24';
const NOTIFICATION_UNREAD_ENDPOINT = '/api/notification-center/unread-count';
const NOTIFICATION_THREAD_ENDPOINT = '/api/notification-center/threads';
const DASHBOARD_CARDS = [
{ route: '/socios', label: 'Socios', iconKey: 'dashboardBusinessPartners', modules: ['socios'] },
{ route: '/productos', label: 'SKU', iconKey: 'dashboardProducts', modules: ['productos'] },
{ route: '/cotizaciones', label: 'Cotizaciones', iconKey: 'dashboardQuotes', modules: ['cotizaciones'] },
{ route: '/costos.html', label: 'Costos', iconKey: 'dashboardCosts', modules: ['costos'] },
{ route: '/reporteria', label: 'Reporter\u00eda', iconKey: 'dashboardReports', modules: ['reporteria'] },
{ route: '/inventario-materiales', label: 'Inventarios', iconKey: 'dashboardInventory', modules: ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'inventario-sellos', 'inventario-cilindros', 'inventario-anilox', 'inventario-pt'] },
{ route: '/configuracion-general', label: 'Configuraci\u00f3n', iconKey: 'dashboardSettings', modules: ['configuracion-general'] },
{ route: '/capacitacion', label: 'Capacitaci\u00f3n', iconKey: 'dashboardCapacitacion', modules: ['capacitacion'] },
{ route: '/ordenes-produccion', label: '\u00d3rdenes', iconKey: 'dashboardOrders', modules: ['ordenes'] },
{ route: '/calidad', label: 'Calidad', iconKey: 'dashboardCalidad', modules: ['calidad'] },
{ route: '/planificacion/seguimiento', label: 'Planificaci\u00f3n', iconKey: 'dashboardPlanning', modules: ['planificacion'] },
{ route: '/produccion.html', label: 'Producci\u00f3n', iconKey: 'dashboardProduction', modules: ['produccion'], fallbackIcon: '\u25A1' },
{ route: '/tintas', label: 'Tintas', iconKey: 'dashboardInks', modules: ['tintas'] },
{ route: '/facturacion-fel', label: 'Contabilidad', iconKey: 'dashboardFacturacionFel', modules: ['facturacion-fel'] },
{ route: '/notificaciones.html', label: 'Notificaciones', iconKey: 'dashboardNotifications', modules: ['notificaciones'] }
];
const INVENTORY_CARD_ROUTE = '/inventario-materiales';
const INVENTORY_OPTIONS = [
    { route: '/inventario-maquinas', label: 'Inventario de M\u00e1quinas', modules: ['inventario-maquinaria'] },
    { route: '/inventario-materiales', label: 'Inventario de Materia Prima', modules: ['inventario-mp'] },
    { route: '/inventario-troqueles', label: 'Inventario de Troqueles', modules: ['inventario-troqueles'] },
    { route: '/inventario-sellos', label: 'Inventario de Sellos', modules: ['inventario-sellos'] },
    { route: '/inventario-cilindros', label: 'Inventario de Cilindros', modules: ['inventario-cilindros'] },
    { route: '/inventario-anilox', label: 'Inventario de Anilox', modules: ['inventario-anilox'] },
    { route: '/inventario-pt', label: 'Inventario de Producto Terminado', modules: ['inventario-pt'] }
];

let tabs = [{ id: HOME_TAB_ID, label: 'PrintLab', route: '', closable: false, family: 'home', level: 'root' }];
let activeTabId = HOME_TAB_ID;
let loadedConfig = null;
let homeTabLabel = 'PrintLab';
let draggedTabId = null;
let searchPopover = null;
let searchInput = null;
let searchResults = null;
let searchPopoverAnchor = null;
let searchRequestToken = 0;
let inventoryPopover = null;

let favoriteReelBounceTimer = null;
let favoriteDrumState = null;
let bdfgMode = 'actions';
let bdfgFavoriteFilter = '';
let bdfgSearchTerm = '';
let bdfgNotificationThreads = [];
let bdfgUnreadCount = 0;
let bdfgNotificationSelectedThreadCode = '';
let bdfgNotificationMessages = [];
let bdfgDragState = null;
let bdfgComponent = null;
let notificationChatWidget = null;
let bdfgUserProfile = null;
let bdfgPreviewGlobal = null;
let bdfgPreviewProfile = null;
const bdfgTabContexts = new Map();
const tabFrames = new Map();
const frameHosts = new Map();
const FLOAT_MIN_W = 860;
const FLOAT_MIN_H = 620;
const FLOAT_DEFAULT_W = 880;
const FLOAT_DEFAULT_H = 720;
const FLOAT_GEOMETRY_STORAGE_KEY = 'erp-dashboard-tab-flotante';
let floatZCounter = 60;
let floatDragState = null;
const TAB_FAMILY_META = {
    home: { family: 'home', level: 'root' },
    quotes: { family: 'quotes', level: 'root' },
    quoteChild: { family: 'quotes', level: 'child' },
    orders: { family: 'orders', level: 'root' },
    orderChild: { family: 'orders', level: 'child' },
    costs: { family: 'costs', level: 'root' },
    partners: { family: 'partners', level: 'root' },
    partnerChild: { family: 'partners', level: 'child' },
    inventory: { family: 'inventory', level: 'root' },
    inventoryChild: { family: 'inventory', level: 'child' },
    planning: { family: 'planning', level: 'root' },
    planningChild: { family: 'planning', level: 'child' },
    products: { family: 'products', level: 'root' },
    productsChild: { family: 'products', level: 'child' },
    settings: { family: 'settings', level: 'root' },
    default: { family: 'default', level: 'root' }
};
const TAB_FAMILY_ORDER = ['home', 'quotes', 'orders', 'planning', 'costs', 'partners', 'products', 'inventory', 'settings', 'default'];

function getStoredSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

const activeUserSession = getStoredSession();
if (!activeUserSession?.username) {
    window.location.replace('/login');
}
const BDFG_POSITION_STORAGE_KEY = `erp-bdfg-position:${String(activeUserSession?.username || 'anon').trim().toLowerCase() || 'anon'}`;
const BDFG_PROFILE_ENDPOINT = '/api/admin-profile';

function normalizePermissionLevel(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
            view: Boolean(value.view || value.create || value.edit),
            create: Boolean(value.create),
            edit: Boolean(value.edit)
        };
    }
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'none') return { view: false, create: false, edit: false };
    if (normalized === 'view') return { view: true, create: false, edit: false };
    if (normalized === 'create') return { view: true, create: true, edit: false };
    if (normalized === 'edit') return { view: true, create: false, edit: true };
    const parts = normalized.split(/[,\s|/+]+/).filter(Boolean);
    return {
        view: parts.includes('view') || parts.includes('create') || parts.includes('edit'),
        create: parts.includes('create'),
        edit: parts.includes('edit')
    };
}

function hasSuperPermission() {
    return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(String(activeUserSession?.permissionName || '').trim());
}

function getSessionModules() {
    const session = getStoredSession();
    const modules = session?.modules || activeUserSession?.modules;
    return modules && typeof modules === 'object' ? modules : null;
}

function canViewModule(moduleKey) {
    if (!moduleKey || moduleKey === 'dashboard') return true;
    if (window.ErpAccess?.canViewModule) return window.ErpAccess.canViewModule(moduleKey);
    const modules = getSessionModules();
    if (!modules) return true;
    if (moduleKey === 'productos' && !Object.prototype.hasOwnProperty.call(modules, 'productos')) {
        return normalizePermissionLevel(modules.cotizaciones).view;
    }
    return normalizePermissionLevel(modules[moduleKey]).view;
}

function canCreateModule(moduleKey) {
    if (!moduleKey) return false;
    if (window.ErpAccess?.canCreateModule) return window.ErpAccess.canCreateModule(moduleKey);
    const modules = getSessionModules();
    if (!modules) return true;
    return normalizePermissionLevel(modules[moduleKey]).create;
}

function canViewAnyModule(moduleKeys = []) {
    return moduleKeys.some((moduleKey) => canViewModule(moduleKey));
}

function getRoutePermissionKeys(route) {
    const pathname = new URL(route || '/', window.location.origin).pathname.toLowerCase();
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/login') return ['dashboard'];
    if (pathname === '/socios' || pathname === '/socios.html' || pathname === '/socios-documento.html' || pathname.startsWith('/socios/')) return ['socios'];
    if (pathname === '/productos' || pathname === '/productos.html' || pathname.startsWith('/productos/')) return ['productos'];
    if (pathname === '/cotizaciones' || pathname === '/cotizaciones.html' || pathname === '/index.html' || pathname.startsWith('/cotizaciones/')) return ['cotizaciones'];
    if (pathname === '/notificaciones' || pathname === '/notificaciones.html' || pathname.startsWith('/notificaciones/') || pathname.startsWith('/notificaciones')) return ['notificaciones'];
    if (pathname === '/mi-actividad' || pathname === '/mi-actividad.html') return ['dashboard'];
    if (pathname === '/calculo-flexografia' || pathname === '/flexo-calculo' || pathname === '/flexo-calculo.html') return ['calculos'];
    if (pathname === '/ordenes-produccion' || pathname === '/ordenes-produccion.html' || pathname === '/orden-produccion.html' || pathname.startsWith('/orden-produccion')) return ['ordenes'];
    if (pathname === '/calidad' || pathname.startsWith('/calidad/')) return ['calidad'];
    if (pathname === '/planificacion' || pathname.startsWith('/planificacion/')) return ['planificacion'];
    if (pathname === '/produccion' || pathname === '/produccion.html') return ['produccion'];
    if (pathname === '/reporteria' || pathname === '/reporteria.html' || pathname.startsWith('/reporteria/') || pathname.startsWith('/reporteria')) return ['reporteria'];
    if (pathname === '/costos' || pathname === '/costos.html') return ['costos'];
    if (pathname === '/configuracion-general' || pathname === '/configuracion-general.html') return ['configuracion-general'];
    if (pathname === '/vendedores' || pathname === '/vendedores-mobile.html') return ['vendedores'];
    if (pathname === '/proforma' || pathname === '/proforma.html') return ['cotizaciones'];
    if (pathname === '/inventario-materiales' || pathname === '/catalogo.html') return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'inventario-sellos', 'inventario-cilindros', 'inventario-anilox', 'inventario-pt'];
    if (pathname === '/inventario-troqueles' || pathname === '/inventario-troqueles.html' || pathname === '/troquel-documento.html' || pathname.startsWith('/inventario-troqueles/')) return ['inventario-troqueles'];
    if (pathname === '/inventario-maquinas') return ['inventario-maquinaria'];
    if (pathname === '/inventario-sellos') return ['inventario-sellos'];
    if (pathname === '/inventario-cilindros') return ['inventario-cilindros'];
    if (pathname === '/inventario-anilox') return ['inventario-anilox'];
    if (pathname.startsWith('/inventario-')) return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'inventario-sellos', 'inventario-cilindros', 'inventario-anilox', 'inventario-pt'];
    if (pathname === '/tintas' || pathname === '/tintas.html' || pathname.startsWith('/tintas/') || pathname.startsWith('/tintas')) return ['tintas'];
    if (pathname === '/facturacion-fel' || pathname.startsWith('/facturacion-fel/')) return ['facturacion-fel'];
    if (pathname === '/capacitacion' || pathname === '/capacitacion.html' || pathname.startsWith('/capacitacion/') || pathname.startsWith('/capacitacion-') || pathname.includes('capacitacion')) return ['capacitacion'];
    return [];
}

function canViewRoute(route) {
    const keys = getRoutePermissionKeys(route);
    return !keys.length || canViewAnyModule(keys);
}

function getBdfgThemePresets() {
    return window.DashboardFloatingButtonThemes || {};
}

function getBdfgDefaultConfig() {
    return window.DashboardFloatingButtonDefaults || {
        theme: 'executive',
        colorMode: 'auto',
        mainSize: 86,
        menuDistance: 108,
        miniShape: 'round',
        layout: 'radial',
        mainDay: '#cbd5e1',
        mainNight: '#334155',
        miniBg: '#ffffff',
        miniBgAlpha: 100,
        miniBgNight: '#ffffff',
        miniBgNightAlpha: 100,
        miniColor: '#1f2937'
    };
}

function sanitizeBdfgColor(value, fallback) {
    const normalized = String(value || '').trim();
    return normalized || fallback;
}

function sanitizeBdfgAlpha(value, fallback = 100) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(100, Math.max(0, numeric));
}

function sanitizeBdfgNumber(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
}

function bdfgColorWithAlpha(value, alpha, fallback = '#ffffff') {
    const normalized = sanitizeBdfgColor(value, fallback);
    const match = normalized.match(/^#([0-9a-f]{6})$/i);
    if (!match) return normalized;
    const opacity = sanitizeBdfgAlpha(alpha, 100) / 100;
    const red = parseInt(match[1].slice(0, 2), 16);
    const green = parseInt(match[1].slice(2, 4), 16);
    const blue = parseInt(match[1].slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function parseBdfgUserConfig(rawValue) {
    if (!rawValue) return {};
    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) return rawValue;
    try {
        const parsed = JSON.parse(String(rawValue));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        return {};
    }
}

function buildBdfgThemeConfig(themeName, fallbackTheme = 'executive') {
    const presets = getBdfgThemePresets();
    const resolvedTheme = presets[themeName] ? themeName : fallbackTheme;
    const preset = presets[resolvedTheme] || presets.executive || {};
    return {
        theme: resolvedTheme,
        mainDay: preset.day || getBdfgDefaultConfig().mainDay,
        mainNight: preset.night || getBdfgDefaultConfig().mainNight,
        miniBg: preset.miniBg || getBdfgDefaultConfig().miniBg,
        miniBgAlpha: Number.isFinite(Number(preset.miniBgAlpha)) ? Number(preset.miniBgAlpha) : getBdfgDefaultConfig().miniBgAlpha,
        miniBgNight: preset.miniBgNight || preset.miniBg || getBdfgDefaultConfig().miniBgNight,
        miniBgNightAlpha: Number.isFinite(Number(preset.miniBgNightAlpha)) ? Number(preset.miniBgNightAlpha) : getBdfgDefaultConfig().miniBgNightAlpha,
        miniColor: preset.miniColor || getBdfgDefaultConfig().miniColor
    };
}

function getEffectiveBdfgConfig() {
    const defaults = getBdfgDefaultConfig();
    const previewGeneral = bdfgPreviewGlobal && typeof bdfgPreviewGlobal === 'object' ? bdfgPreviewGlobal : null;
    const globalSource = previewGeneral || loadedConfig?.general || {};
    const globalTheme = String(globalSource?.bdfgTheme || defaults.theme).trim().toLowerCase() || defaults.theme;
    const globalBase = {
        ...defaults,
        ...buildBdfgThemeConfig(globalTheme, defaults.theme),
        theme: globalTheme,
        colorMode: String(globalSource?.bdfgColorMode || defaults.colorMode).trim().toLowerCase() || defaults.colorMode,
        mainSize: sanitizeBdfgNumber(globalSource?.bdfgMainSize, defaults.mainSize, 25, 100),
        menuDistance: sanitizeBdfgNumber(globalSource?.bdfgMenuDistance, defaults.menuDistance, 72, 200),
        miniShape: String(globalSource?.bdfgMiniShape || defaults.miniShape).trim().toLowerCase() || defaults.miniShape,
        layout: String(globalSource?.bdfgLayout || defaults.layout).trim().toLowerCase() || defaults.layout,
        mainDay: sanitizeBdfgColor(globalSource?.bdfgMainDay, buildBdfgThemeConfig(globalTheme, defaults.theme).mainDay),
        mainNight: sanitizeBdfgColor(globalSource?.bdfgMainNight, buildBdfgThemeConfig(globalTheme, defaults.theme).mainNight),
        miniBg: sanitizeBdfgColor(globalSource?.bdfgMiniBg, buildBdfgThemeConfig(globalTheme, defaults.theme).miniBg),
        miniBgAlpha: sanitizeBdfgAlpha(globalSource?.bdfgMiniBgAlpha, buildBdfgThemeConfig(globalTheme, defaults.theme).miniBgAlpha),
        miniBgNight: sanitizeBdfgColor(globalSource?.bdfgMiniBgNight, buildBdfgThemeConfig(globalTheme, defaults.theme).miniBgNight),
        miniBgNightAlpha: sanitizeBdfgAlpha(globalSource?.bdfgMiniBgNightAlpha, buildBdfgThemeConfig(globalTheme, defaults.theme).miniBgNightAlpha),
        miniColor: sanitizeBdfgColor(globalSource?.bdfgMiniColor, buildBdfgThemeConfig(globalTheme, defaults.theme).miniColor)
    };
    const userConfig = bdfgPreviewProfile && typeof bdfgPreviewProfile === 'object'
        ? bdfgPreviewProfile
        : parseBdfgUserConfig(bdfgUserProfile?.floatingButtonConfig);
    const userEnabled = userConfig.enabled === true || String(userConfig.enabled || '').trim().toLowerCase() === 'true';
    if (!userEnabled) return globalBase;
    const userTheme = String(userConfig.theme || globalBase.theme).trim().toLowerCase() || globalBase.theme;
    const userThemeBase = buildBdfgThemeConfig(userTheme, globalBase.theme);
    return {
        ...globalBase,
        ...userThemeBase,
        theme: userTheme,
        colorMode: String(userConfig.colorMode || globalBase.colorMode).trim().toLowerCase() || globalBase.colorMode,
        mainSize: sanitizeBdfgNumber(userConfig.mainSize, globalBase.mainSize, 25, 100),
        menuDistance: sanitizeBdfgNumber(userConfig.menuDistance, globalBase.menuDistance, 72, 200),
        miniShape: String(userConfig.miniShape || globalBase.miniShape).trim().toLowerCase() || globalBase.miniShape,
        layout: String(userConfig.layout || globalBase.layout).trim().toLowerCase() || globalBase.layout,
        mainDay: sanitizeBdfgColor(userConfig.mainDay, userThemeBase.mainDay),
        mainNight: sanitizeBdfgColor(userConfig.mainNight, userThemeBase.mainNight),
        miniBg: sanitizeBdfgColor(userConfig.miniBg, userThemeBase.miniBg),
        miniBgAlpha: sanitizeBdfgAlpha(userConfig.miniBgAlpha, userThemeBase.miniBgAlpha),
        miniBgNight: sanitizeBdfgColor(userConfig.miniBgNight, userThemeBase.miniBgNight || userThemeBase.miniBg),
        miniBgNightAlpha: sanitizeBdfgAlpha(userConfig.miniBgNightAlpha, userThemeBase.miniBgNightAlpha ?? userThemeBase.miniBgAlpha),
        miniColor: sanitizeBdfgColor(userConfig.miniColor, userThemeBase.miniColor)
    };
}

function getVisibleInventoryOptions() {
    return INVENTORY_OPTIONS.filter((item) => canViewAnyModule(item.modules));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readDashboardConfigCache() {
    try {
        const raw = localStorage.getItem(DASHBOARD_CONFIG_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.storedAt || 0);
        if (age > DASHBOARD_CONFIG_CACHE_TTL_MS) {
            localStorage.removeItem(DASHBOARD_CONFIG_CACHE_KEY);
            return null;
        }
        return parsed.data || null;
    } catch (error) {
        return null;
    }
}

function writeDashboardConfigCache(config) {
    try {
        const payload = JSON.stringify({
            storedAt: Date.now(),
            data: config
        });
        if (payload.length > DASHBOARD_CONFIG_CACHE_MAX_PAYLOAD_CHARS) {
            localStorage.removeItem(DASHBOARD_CONFIG_CACHE_KEY);
            return;
        }
        localStorage.setItem(DASHBOARD_CONFIG_CACHE_KEY, payload);
    } catch (_) {
        try { localStorage.removeItem(DASHBOARD_CONFIG_CACHE_KEY); } catch (_) {}
    }
}

function compactDashboardConfigForCache(value, key = '') {
    if (typeof value === 'string') {
        const text = value.trim();
        if (text.startsWith('/assets/') || text.startsWith('data:image') || text.startsWith('http')) return value;
        const keyText = String(key || '').toLowerCase();
        const assetLike = /(image|imagen|logo|foto|photo|font|background|screensaver|repositorio|repository|icon|icono|dashboard)/.test(keyText);
        if ((assetLike && text.length > DASHBOARD_CONFIG_CACHE_TEXT_LIMIT) || text.length > DASHBOARD_CONFIG_CACHE_TEXT_LIMIT * 4) {
            return '';
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => compactDashboardConfigForCache(item, key)).filter((item) => item !== '');
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .map(([childKey, childValue]) => [childKey, compactDashboardConfigForCache(childValue, childKey)])
                .filter(([, childValue]) => childValue !== '')
        );
    }
    return value;
}

function areDashboardConfigsEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function iconMarkup(value, altText, extraClass = '') {
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

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return '';
}

function getFlexAlign(value, fallback = 'flex-start') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'flex-end';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'flex-start';
    return fallback;
}

function getTextAlign(value, fallback = 'left') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'right';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'left';
    return fallback;
}

function normalizeRoute(route) {
    if (!route) return '';
    const url = new URL(route, window.location.origin);
    if (!url.searchParams.has('shell')) {
        url.searchParams.set('shell', '1');
    }
    return `${url.pathname}${url.search}${url.hash}`;
}

function stripShellRoute(route) {
    if (!route) return '';
    const url = new URL(route, window.location.origin);
    url.searchParams.delete('shell');
    return `${url.pathname}${url.search}${url.hash}`;
}

function isCurrentTabRoute(route) {
    const tab = getActiveTab();
    if (!tab?.route || !route) return false;
    return stripShellRoute(tab.route) === stripShellRoute(route);
}

function sessionHeaders() {
    if (!activeUserSession) return {};
    const compactSession = {
        username: activeUserSession.username || '',
        name: activeUserSession.name || '',
        permissionName: activeUserSession.permissionName || ''
    };
    return { 'x-erp-session': JSON.stringify(compactSession) };
}

const SALES_PIPELINE_STAGE_LABELS = {
    pendiente: 'Pendientes',
    finalizadaSinEnviar: 'Finalizadas sin enviar',
    enviada: 'Enviadas · esperando respuesta',
    aceptada: 'Aceptadas',
    rechazada: 'Rechazadas',
    expirada: 'Expiradas'
};

const VIEW_AS_VENDOR_MODE_KEY = 'erp-view-as-vendor-mode';
const VIEW_AS_VENDOR_CODE_KEY = 'erp-view-as-vendor-code';
let viewAsVendorMode = sessionStorage.getItem(VIEW_AS_VENDOR_MODE_KEY) === '1';
let viewAsVendorCode = sessionStorage.getItem(VIEW_AS_VENDOR_CODE_KEY) || '';
let viewAsVendorOptionsCache = null;

function persistViewAsVendorState() {
    sessionStorage.setItem(VIEW_AS_VENDOR_MODE_KEY, viewAsVendorMode ? '1' : '');
    sessionStorage.setItem(VIEW_AS_VENDOR_CODE_KEY, viewAsVendorCode || '');
}

// Misma regla que adminPermissionRequiresSapSalesperson() en server.js — un usuario cuenta como
// "vendedor" únicamente si su perfil de permiso (Configuración → Seguridad) es Vendedores o
// Vendedores Cotizadores, no por el simple hecho de tener un código de vendedor SAP asignado.
function isVendedorPermissionName(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, ' ');
    return normalized === 'vendedores' || normalized === 'vendedores cotizadores';
}

async function loadVendorOptionsForPreview() {
    if (viewAsVendorOptionsCache) return viewAsVendorOptionsCache;
    try {
        const response = await fetch('/api/admin-users', { headers: sessionHeaders() });
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : [];
        // Incluye a quien tenga el permiso Vendedores/Vendedores Cotizadores, y también a
        // Administradores/Implementadores (roles que también cotizan, ej. jesquiv/Jorge Esquivel) —
        // pero NO a cualquier otro permiso solo por tener un código SAP de prueba residual
        // (ej. Cotizadores/Operadores no son vendedores aunque tengan un código asignado por error).
        viewAsVendorOptionsCache = items
            .filter((user) => user.active !== false && (isVendedorPermissionName(user.permissionName) || isErpSuperPermission({ permissionName: user.permissionName })))
            .map((user) => ({
                // value único por USUARIO — es la clave que se envía al backend, evita
                // colisiones cuando varias personas comparten el mismo nombre.
                value: user.username,
                name: user.name || user.username
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } catch (error) {
        viewAsVendorOptionsCache = [];
    }
    return viewAsVendorOptionsCache;
}

function toggleViewAsVendorMode() {
    viewAsVendorMode = !viewAsVendorMode;
    if (!viewAsVendorMode) viewAsVendorCode = '';
    persistViewAsVendorState();
    renderBdfg();
    refreshSalesPipelineSection();
}

async function renderVendorSelectForPreview() {
    const select = document.getElementById('dashboardSalesPipelineVendorSelect');
    const banner = document.getElementById('dashboardSalesPipelinePreviewBanner');
    if (!select || !banner) return;
    banner.hidden = false;
    const options = await loadVendorOptionsForPreview();
    if (!options.length) {
        select.innerHTML = '<option value="">Sin vendedores disponibles</option>';
        viewAsVendorCode = '';
        persistViewAsVendorState();
        return;
    }
    if (!viewAsVendorCode || !options.some((option) => option.value === viewAsVendorCode)) {
        viewAsVendorCode = options[0].value;
        persistViewAsVendorState();
    }
    select.innerHTML = options.map((option) =>
        `<option value="${escapeHtml(option.value)}"${option.value === viewAsVendorCode ? ' selected' : ''}>${escapeHtml(option.name)}</option>`
    ).join('');
}

async function refreshSalesPipelineSection() {
    const section = document.getElementById('dashboardSalesPipeline');
    const countsMount = document.getElementById('dashboardSalesPipelineCounts');
    const listMount = document.getElementById('dashboardSalesPipelineList');
    const banner = document.getElementById('dashboardSalesPipelinePreviewBanner');
    if (!section || !countsMount || !listMount || !banner) return;

    if (!viewAsVendorMode) {
        banner.hidden = true;
    } else {
        await renderVendorSelectForPreview();
    }

    const selectedOption = viewAsVendorMode
        ? (viewAsVendorOptionsCache || []).find((option) => option.value === viewAsVendorCode)
        : null;
    // Mantiene sincronizado el panel "Tu actividad" (KPIs, órdenes, facturas, leads) con el
    // mismo vendedor previsualizado — ver public/dashboard-vendedor-panel.js.
    window.dvpReload?.(viewAsVendorMode ? selectedOption?.value : undefined);

    try {
        const url = viewAsVendorMode && selectedOption
            ? `/api/vendedores/mi-pipeline?usuarioVendedor=${encodeURIComponent(selectedOption.value)}`
            : '/api/vendedores/mi-pipeline';
        const response = await fetch(url, { headers: sessionHeaders() });
        const payload = await response.json();
        if (!response.ok || !payload.isVendedor) {
            section.hidden = !viewAsVendorMode;
            if (!viewAsVendorMode) return;
            countsMount.innerHTML = '';
            listMount.innerHTML = '<p class="dashboard-sales-pipeline-empty">No fue posible cargar el pipeline de este vendedor.</p>';
            return;
        }
        section.hidden = false;
        countsMount.innerHTML = Object.entries(SALES_PIPELINE_STAGE_LABELS).map(([key, label]) => {
            const value = Number(payload.counts?.[key] || 0);
            return `<div class="dashboard-sales-pipeline-tile"><span class="dashboard-sales-pipeline-tile-value">${value}</span><span class="dashboard-sales-pipeline-tile-label">${label}</span></div>`;
        }).join('');
        const pendientes = Array.isArray(payload.pendientes) ? payload.pendientes : [];
        listMount.innerHTML = pendientes.length
            ? pendientes.map((item) => `<a class="dashboard-sales-pipeline-row" href="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}" data-route="/cotizaciones?codigo=${encodeURIComponent(item.quoteCode)}"><span>${escapeHtml(item.quoteCode)} · ${escapeHtml(item.customerName || 'Sin cliente')}</span><span>${escapeHtml(SALES_PIPELINE_STAGE_LABELS[item.stage] || item.stage)}</span></a>`).join('')
            : '<p class="dashboard-sales-pipeline-empty">No hay cotizaciones pendientes de acción.</p>';
    } catch (error) {
        section.hidden = !viewAsVendorMode;
    }
}

function getTabFamilyMeta(route) {
    if (!route) return TAB_FAMILY_META.home;
    const pathname = new URL(route, window.location.origin).pathname.toLowerCase();
    if (pathname === '/cotizaciones') return TAB_FAMILY_META.quotes;
    if (pathname === '/productos') return TAB_FAMILY_META.products;
    if (pathname.startsWith('/cotizaciones/documento') || pathname.startsWith('/calculo-flexografia')) return TAB_FAMILY_META.quoteChild;
    if (pathname === '/ordenes-produccion') return TAB_FAMILY_META.orders;
    if (pathname === '/planificacion' || pathname.startsWith('/planificacion/')) return TAB_FAMILY_META.planning;
    if (pathname.startsWith('/orden-produccion')) return TAB_FAMILY_META.orderChild;
    if (pathname === '/costos' || pathname === '/costos.html') return TAB_FAMILY_META.costs;
    if (pathname === '/socios') return TAB_FAMILY_META.partners;
    if (pathname.startsWith('/socios-documento')) return TAB_FAMILY_META.partnerChild;
    if (pathname === '/inventario-materiales') return TAB_FAMILY_META.inventory;
    if (pathname.startsWith('/inventario-')) return TAB_FAMILY_META.inventoryChild;
    if (pathname === '/configuracion-general') return TAB_FAMILY_META.settings;
    return TAB_FAMILY_META.default;
}

function hexToRgb(hex) {
    const value = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return null;
    return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16)
    };
}

function rgbaFromHex(hex, alpha, fallback) {
    const rgb = hexToRgb(hex);
    if (!rgb) return fallback;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getTabFamilyPalette(tab, config) {
    const general = config?.general || {};
    const keyMap = {
        quotes: tab.level === 'child'
            ? { color: 'tabColorQuotesChild', fallback: '#F1A451' }
            : { color: 'tabColorQuotesRoot', fallback: '#EE8B2D' },
        orders: tab.level === 'child'
            ? { color: 'tabColorOrdersChild', fallback: '#CEB460' }
            : { color: 'tabColorOrdersRoot', fallback: '#B6922D' },
        costs: tab.level === 'child'
            ? { color: 'tabColorCostsChild', fallback: '#7AB1E8' }
            : { color: 'tabColorCostsRoot', fallback: '#6D99D6' },
        partners: tab.level === 'child'
            ? { color: 'tabColorPartnersChild', fallback: '#6ABFB6' }
            : { color: 'tabColorPartnersRoot', fallback: '#2C9F95' },
        inventory: tab.level === 'child'
            ? { color: 'tabColorInventoryChild', fallback: '#8FA8DB' }
            : { color: 'tabColorInventoryRoot', fallback: '#5F80C8' },
        planning: tab.level === 'child'
            ? { color: 'tabColorPlanningChild', fallback: '#8EB0E0' }
            : { color: 'tabColorPlanningRoot', fallback: '#6B96D1' },
        products: tab.level === 'child'
            ? { color: 'tabColorProductsChild', fallback: '#76EAD2' }
            : { color: 'tabColorProductsRoot', fallback: '#50E3C2' },
        settings: tab.level === 'child'
            ? { color: 'tabColorSettingsChild', fallback: '#B29BD8' }
            : { color: 'tabColorSettingsRoot', fallback: '#8B74BB' }
    };
    const meta = keyMap[tab.family];
    if (!meta) return '';
    const accent = general[meta.color] || meta.fallback;
    const styleTokens = [
        `--tab-accent:${accent}`,
        `--tab-outline-color:${rgbaFromHex(accent, 0.34, accent)}`,
        `--tab-outline-color-active:${rgbaFromHex(accent, 0.44, accent)}`,
        `--tab-outline-color-dark:${rgbaFromHex(accent, 0.58, accent)}`,
        `--tab-outline-color-active-dark:${rgbaFromHex(accent, 0.68, accent)}`,
        `--tab-text:var(--app-text-soft)`,
        `--tab-text-active:var(--app-text)`
    ];
    return styleTokens.join(';');
}

function getFamilyRank(family) {
    const index = TAB_FAMILY_ORDER.indexOf(family);
    return index >= 0 ? index : TAB_FAMILY_ORDER.length;
}

function getFamilyInsertIndex(family) {
    let lastFamilyIndex = -1;
    for (let index = 0; index < tabs.length; index += 1) {
        if (tabs[index]?.family === family) {
            lastFamilyIndex = index;
        }
    }
    if (lastFamilyIndex >= 0) {
        return lastFamilyIndex + 1;
    }
    const familyRank = getFamilyRank(family);
    for (let index = 1; index < tabs.length; index += 1) {
        if (getFamilyRank(tabs[index]?.family) > familyRank) {
            return index;
        }
    }
    return tabs.length;
}

function getCompactTabLabel(tab) {
    const label = String(tab?.label || '').trim();
    if (!label) return '';
    if (tab.family === 'quotes' && tab.level === 'child') {
        return label.replace(/^cotizaci[oó]n\s+/i, '').trim();
    }
    if (tab.family === 'orders' && tab.level === 'child') {
        return label.replace(/^orden\s+/i, '').trim();
    }
    if (tab.family === 'partners' && tab.level === 'child') {
        return label.replace(/^socio\s+/i, '').trim();
    }
    if (tab.family === 'inventory' && tab.level === 'child') {
        return label.replace(/^inventario\s+/i, '').trim();
    }
    const rootShortLabels = {
        quotes: 'Cotiz.',
        orders: '\u00d3rdenes',
        costs: 'Costos',
        partners: 'Socios',
        inventory: 'Inventario',
        planning: 'Planif.',
        products: 'Prod.',
        settings: 'Config.'
    };
    return rootShortLabels[tab.family] || label;
}

function getRenderTabLabel(tab, tabWidth) {
    if (tab.id === HOME_TAB_ID) return homeTabLabel;
    const defaultLabel = String(tab?.label || '').trim();
    if (!defaultLabel) return '';
    if (tabWidth <= 126) {
        const compact = getCompactTabLabel(tab);
        if (compact) return compact;
    }
    return defaultLabel;
}

function renderTabs() {
    if (!tabsContainer) return;
    const closeIcon = loadedConfig?.icons?.dashboardTabClose || loadedConfig?.icons?.popoverClose || '×';
    const closePalette = {
        primary: loadedConfig?.general?.iconColorDashboardTabClose || loadedConfig?.general?.iconColorPopoverClose || '#8c97a2',
        hover: loadedConfig?.general?.iconColorHoverDashboardTabClose || loadedConfig?.general?.iconColorHoverPopoverClose || '#0b81b8',
        size: Number(loadedConfig?.general?.iconSizeDashboardTabClose) || 14
    };
    const containerWidth = Math.max(tabsContainer?.clientWidth || tabsContainer?.parentElement?.clientWidth || 0, 320);
    const configuredTabWidth = Math.max(Number(loadedConfig?.general?.dashboardTabWidth) || 0, 146);
    const homeWidth = 120;
    const visibleTabs = tabs.filter((tab) => tab.id === HOME_TAB_ID || !tab.floating);
    const regularTabCount = Math.max(visibleTabs.length - 1, 0);
    
    // Calculate width to fit in one row
    const availableWidth = containerWidth - homeWidth - (regularTabCount * 2) - 40; // 2px gap, 40px buffer
    const expandedTabWidth = regularTabCount > 0 ? Math.floor(availableWidth / regularTabCount) : configuredTabWidth;
    const computedTabWidth = Math.max(40, Math.min(expandedTabWidth, configuredTabWidth));

    tabsBar?.classList.remove('is-multirow');
    tabsContainer?.classList.remove('is-multirow');
    workspaceShell?.classList.remove('has-tab-wrap');

    tabsContainer.innerHTML = visibleTabs.map((tab, index) => {
        const itemWidth = tab.id === HOME_TAB_ID ? homeWidth : computedTabWidth;
        const hasGap = index > 0 && visibleTabs[index - 1]?.family !== tab.family;
        return `
            <div class="dashboard-tab-item ${hasGap ? 'has-family-gap' : ''}" style="--tab-item-base-width:${itemWidth}px;">
                <button
                    type="button"
                    class="dashboard-tab family-${escapeHtml(tab.family || 'default')} level-${escapeHtml(tab.level || 'root')} ${tab.id === activeTabId ? 'is-active' : ''} ${tab.id === draggedTabId ? 'is-dragging' : ''} ${tab.id !== HOME_TAB_ID ? 'is-draggable' : ''}"
                    data-tab-id="${escapeHtml(tab.id)}"
                    draggable="${tab.id !== HOME_TAB_ID ? 'true' : 'false'}"
                    style="${escapeHtml(`${getTabFamilyPalette(tab, loadedConfig)};--tab-computed-width:${itemWidth}px;`)}"
                >
                    <span class="dashboard-tab-label">${escapeHtml(tab.label)}</span>
                    ${tab.closable ? `<span class="dashboard-tab-close" data-action="close-tab" data-tab-id="${escapeHtml(tab.id)}">×</span>` : ''}
                </button>
            </div>
        `;
    }).join('');
}

function createTabFrame(tab) {
    const host = document.createElement('div');
    host.className = 'dashboard-frame-host';
    host.dataset.tabId = tab.id;
    host.hidden = true;

    const bar = document.createElement('div');
    bar.className = 'dashboard-float-bar';
    const dockGlyph = loadedConfig?.icons?.orderAcoplarTab || '⤓';
    bar.innerHTML = `
        <span class="dashboard-float-title"></span>
        <button type="button" class="dashboard-float-btn" data-float-action="dock" title="Acoplar a la Fila de Tabs" aria-label="Acoplar a la Fila de Tabs">${iconMarkup(dockGlyph, 'Acoplar a la Fila de Tabs')}</button>
        <button type="button" class="dashboard-float-btn" data-float-action="close" title="Cerrar Ventana" aria-label="Cerrar Ventana">×</button>
    `;
    bar.querySelector('.dashboard-float-title').textContent = tab.label || 'Documento';

    const iframe = document.createElement('iframe');
    iframe.className = 'dashboard-frame';
    iframe.title = tab.label || 'Contenido ERP';
    iframe.dataset.tabId = tab.id;
    iframe.style.background = 'var(--app-bg)';
    iframe.style.colorScheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    iframe.src = normalizeRoute(tab.route);

    const resizeGrip = document.createElement('div');
    resizeGrip.className = 'dashboard-float-resize';

    host.appendChild(bar);
    host.appendChild(iframe);
    host.appendChild(resizeGrip);
    workspacePanel.appendChild(host);
    tabFrames.set(tab.id, iframe);
    frameHosts.set(tab.id, host);
    return iframe;
}

function ensureTabFrame(tab) {
    if (!tab || tab.id === HOME_TAB_ID) return null;
    const existing = tabFrames.get(tab.id);
    if (existing) return existing;
    return createTabFrame(tab);
}

// Transiciones del dashboard: velocidad del desvanecimiento de botones y del
// nacimiento de la pestaña. La global vive en Configuración → Diseño → Transiciones;
// cada usuario puede ajustar la suya en su perfil (botón flotante → Mi perfil).
function getTransicionesConfig() {
    const general = loadedConfig?.general || {};
    const usuario = transicionesPreviewPerfil || parseBdfgUserConfig(bdfgUserProfile?.transicionesConfig);
    const usarUsuario = usuario.activar === true || String(usuario.activar || '').trim().toLowerCase() === 'true';
    const fuente = usarUsuario ? usuario : general;
    const desvanecer = sanitizeBdfgNumber(fuente?.transicionDesvanecerMs, 140, 0, 1000);
    const crecer = sanitizeBdfgNumber(fuente?.transicionCrecerMs, 260, 0, 1200);
    const activo = usarUsuario || general.transicionesActivadas !== false;
    return { activo, desvanecer, crecer };
}

let transicionesPreviewPerfil = null;

function aplicarTransicionesPreviewPerfil(preview) {
    transicionesPreviewPerfil = preview && typeof preview === 'object' ? preview : null;
    aplicarTransicionesCss();
}

function aplicarTransicionesCss() {
    const { activo, desvanecer, crecer } = getTransicionesConfig();
    const root = document.documentElement;
    root.style.setProperty('--transicion-desvanecer', `${desvanecer}ms`);
    root.style.setProperty('--transicion-crecer', `${crecer}ms`);
    root.classList.toggle('transiciones-apagadas', !activo);
    sincronizarDesplegablesConTransiciones(activo ? Math.round((desvanecer + crecer) / 2) : 0);
}

function sincronizarDesplegablesConTransiciones(velocidadPromedio) {
    const control = window.ERPSelDesplegable;
    if (!control) return;
    const general = loadedConfig?.general || {};
    const usuario = transicionesPreviewPerfil || parseBdfgUserConfig(bdfgUserProfile?.transicionesConfig);
    const usarUsuario = usuario.activar === true || String(usuario.activar || '').trim().toLowerCase() === 'true';
    const fuente = usarUsuario ? usuario : general;
    if (Number.isFinite(Number(fuente?.transicionDesplegablesMs))) {
        control.definirVelocidad(activo ? Number(fuente.transicionDesplegablesMs) : 0);
    } else {
        control.definirVelocidad(Number.isFinite(Number(velocidadPromedio)) ? velocidadPromedio : 220);
    }
    const estilo = String(fuente?.transicionDesplegablesEstilo || general.transicionDesplegablesEstilo || 'slide').trim().toLowerCase();
    if (['slide', 'despliegue', 'cascada'].includes(estilo)) control.definirEstilo(estilo);
}

function animarEntradaTab(tabId) {
    const host = frameHosts.get(tabId);
    if (!host) return;
    const { activo } = getTransicionesConfig();
    if (!activo) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    host.classList.remove('dashboard-frame-host-entrando');
    void host.offsetWidth;
    host.classList.add('dashboard-frame-host-entrando');
    host.addEventListener('animationend', () => host.classList.remove('dashboard-frame-host-entrando'), { once: true });
}

function desvanecerBotonesDashboard(botonOrigen) {
    const { activo } = getTransicionesConfig();
    if (!activo) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.dashboard-card').forEach((card) => {
        if (card === botonOrigen) {
            card.classList.add('transicion-semilla');
        } else {
            card.classList.add('transicion-desvanecida');
        }
    });
}

function restaurarBotonesDashboard() {
    document.querySelectorAll('.dashboard-card').forEach((card) => {
        card.classList.remove('transicion-desvanecida', 'transicion-semilla');
    });
}

window.addEventListener('resize', restaurarBotonesDashboard);

function showOnlyTabFrame(tabId) {
    frameHosts.forEach((host, id) => {
        const tab = tabs.find((item) => item.id === id);
        host.hidden = tab && tab.floating ? false : id !== tabId;
    });
}

function disposeTabFrame(tabId) {
    const host = frameHosts.get(tabId);
    if (host) host.remove();
    frameHosts.delete(tabId);
    tabFrames.delete(tabId);
}

function anyFloatingTab() {
    return tabs.some((tab) => tab && tab.floating);
}

function syncWorkspaceVisibility() {
    const floatsExist = anyFloatingTab();
    if (activeTabId === HOME_TAB_ID) {
        homePanel.hidden = false;
        workspacePanel.hidden = !floatsExist;
        workspacePanel.classList.toggle('is-floats-only', floatsExist);
    } else {
        homePanel.hidden = true;
        workspacePanel.hidden = false;
        workspacePanel.classList.remove('is-floats-only');
    }
}

function clampNumber(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(Math.max(num, min), Math.max(min, max));
}

function applyFloatGeometry(tab, patch) {
    const host = frameHosts.get(tab.id);
    if (!host || !tab.floating) return;
    const geom = tab.floating;
    if (patch) {
        if (Number.isFinite(patch.w)) geom.w = patch.w;
        if (Number.isFinite(patch.h)) geom.h = patch.h;
        if (Number.isFinite(patch.x)) geom.x = patch.x;
        if (Number.isFinite(patch.y)) geom.y = patch.y;
    }
    const minTop = getFloatMinTop();
    geom.w = clampNumber(geom.w, FLOAT_MIN_W, Math.max(FLOAT_MIN_W, window.innerWidth - 24));
    geom.h = clampNumber(geom.h, FLOAT_MIN_H, Math.max(FLOAT_MIN_H, window.innerHeight - minTop - 12));
    geom.x = clampNumber(geom.x, 12, Math.max(12, window.innerWidth - geom.w - 12));
    geom.y = clampNumber(geom.y, minTop, Math.max(minTop, window.innerHeight - geom.h - 12));
    host.style.width = `${geom.w}px`;
    host.style.height = `${geom.h}px`;
    host.style.left = `${geom.x}px`;
    host.style.top = `${geom.y}px`;
}

function getFloatStorageKey() {
    let userKey = 'anon';
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            userKey = parsed?.username || parsed?.user?.username || parsed?.id || parsed?.userId || 'anon';
        }
    } catch (_) {}
    return `${FLOAT_GEOMETRY_STORAGE_KEY}::${userKey}`;
}

function readFloatGeometryStore() {
    try {
        const raw = localStorage.getItem(getFloatStorageKey());
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
}

function readFloatGeometry(route) {
    const entry = readFloatGeometryStore()[stripShellRoute(route)];
    if (!entry || typeof entry !== 'object') return null;
    return { x: Number(entry.x), y: Number(entry.y), w: Number(entry.w), h: Number(entry.h) };
}

function writeFloatGeometry(route, geometry) {
    if (!geometry) return;
    try {
        const store = readFloatGeometryStore();
        store[stripShellRoute(route)] = {
            x: Math.round(geometry.x),
            y: Math.round(geometry.y),
            w: Math.round(geometry.w),
            h: Math.round(geometry.h)
        };
        localStorage.setItem(getFloatStorageKey(), JSON.stringify(store));
    } catch (_) {}
}

function isPointerOverTabsBar(x, y) {
    const bar = tabsBar?.getBoundingClientRect();
    if (!bar) return false;
    return x >= bar.left && x <= bar.right && y >= bar.top && y <= bar.bottom;
}

function getFloatMinTop() {
    const bar = tabsBar?.getBoundingClientRect();
    return bar && bar.bottom > 0 ? Math.round(bar.bottom + 8) : 128;
}

function onFloatPointerMove(event) {
    if (!floatDragState) return;
    const tab = tabs.find((item) => item.id === floatDragState.tabId);
    if (!tab || !tab.floating) return;
    const dx = event.clientX - floatDragState.startX;
    const dy = event.clientY - floatDragState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) floatDragState.moved = true;
    if (floatDragState.mode === 'move') {
        applyFloatGeometry(tab, { x: floatDragState.baseX + dx, y: floatDragState.baseY + dy });
        tabsBar?.classList.toggle('is-dock-target', !!(floatDragState.moved && isPointerOverTabsBar(event.clientX, event.clientY)));
    } else {
        applyFloatGeometry(tab, { w: floatDragState.baseW + dx, h: floatDragState.baseH + dy });
    }
}

function onFloatPointerUp(event) {
    window.removeEventListener('pointermove', onFloatPointerMove);
    const state = floatDragState;
    floatDragState = null;
    if (!state) return;
    const host = frameHosts.get(state.tabId);
    host?.classList.remove('is-dragging');
    const frameEl = host?.querySelector('.dashboard-frame');
    if (frameEl) frameEl.style.pointerEvents = '';
    tabsBar?.classList.remove('is-dock-target');
    const tab = tabs.find((item) => item.id === state.tabId);
    if (tab && tab.floating) writeFloatGeometry(tab.route, tab.floating);
    if (state.mode === 'move' && state.moved && isPointerOverTabsBar(event.clientX, event.clientY)) {
        dockTab(state.tabId);
    }
}

function bindFloatHost(host, tabId) {
    if (host.dataset.floatBound === '1') return;
    host.dataset.floatBound = '1';
    const bar = host.querySelector('.dashboard-float-bar');
    const resizeGrip = host.querySelector('.dashboard-float-resize');

    host.addEventListener('pointerdown', () => {
        const tab = tabs.find((item) => item.id === tabId);
        if (!tab || !tab.floating) return;
        tab.floating.z = ++floatZCounter;
        host.style.zIndex = String(tab.floating.z);
    }, true);

    bar.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('[data-float-action]');
        if (!actionBtn) return;
        event.preventDefault();
        event.stopPropagation();
        if (actionBtn.dataset.floatAction === 'dock') dockTab(tabId);
        else if (actionBtn.dataset.floatAction === 'close') closeTab(tabId);
    });

    bar.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('[data-float-action]')) return;
        const tab = tabs.find((item) => item.id === tabId);
        if (!tab || !tab.floating) return;
        event.preventDefault();
        floatDragState = {
            mode: 'move',
            tabId,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            baseX: tab.floating.x,
            baseY: tab.floating.y
        };
        host.classList.add('is-dragging');
        try { bar.setPointerCapture(event.pointerId); } catch (_) {}
        const flFrame = host.querySelector('.dashboard-frame');
        if (flFrame) flFrame.style.pointerEvents = 'none';
        window.addEventListener('pointermove', onFloatPointerMove);
        window.addEventListener('pointerup', onFloatPointerUp, { once: true });
    });

    resizeGrip.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const tab = tabs.find((item) => item.id === tabId);
        if (!tab || !tab.floating) return;
        event.preventDefault();
        event.stopPropagation();
        floatDragState = {
            mode: 'resize',
            tabId,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            baseW: tab.floating.w,
            baseH: tab.floating.h
        };
        host.classList.add('is-dragging');
        try { resizeGrip.setPointerCapture(event.pointerId); } catch (_) {}
        const flFrame2 = host.querySelector('.dashboard-frame');
        if (flFrame2) flFrame2.style.pointerEvents = 'none';
        window.addEventListener('pointermove', onFloatPointerMove);
        window.addEventListener('pointerup', onFloatPointerUp, { once: true });
    });
}

function floatTab(tabId, pointerX, pointerY) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab || tab.id === HOME_TAB_ID || tab.floating) return;
    ensureTabFrame(tab);
    const host = frameHosts.get(tabId);
    if (!host) return;

    const saved = readFloatGeometry(tab.route);
    const w = clampNumber(saved?.w ?? FLOAT_DEFAULT_W, FLOAT_MIN_W, window.innerWidth);
    const h = clampNumber(saved?.h ?? FLOAT_DEFAULT_H, FLOAT_MIN_H, window.innerHeight);
    let x = saved?.x;
    let y = saved?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        x = Number.isFinite(pointerX) && pointerX > 0 ? pointerX - w / 2 : (window.innerWidth - w) / 2;
        y = Number.isFinite(pointerY) && pointerY > 0 ? pointerY - 18 : (window.innerHeight - h) / 2;
    }

    tab.floating = { x: 0, y: 0, w, h, z: ++floatZCounter };
    host.classList.add('is-floating');
    host.querySelector('.dashboard-float-title').textContent = tab.label || 'Documento';
    applyFloatGeometry(tab, { x, y });
    host.style.zIndex = String(tab.floating.z);
    bindFloatHost(host, tabId);

    if (activeTabId === tabId) {
        const fallback = tabs.find((item) => item.id !== tabId && item.id !== HOME_TAB_ID && !item.floating)
            || tabs.find((item) => item.id === HOME_TAB_ID);
        activateTab(fallback ? fallback.id : HOME_TAB_ID);
    } else {
        renderTabs();
        syncWorkspaceVisibility();
        showOnlyTabFrame(activeTabId);
        renderBdfg();
    }
}

function dockTab(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab || !tab.floating) return;
    const host = frameHosts.get(tabId);
    if (host) {
        writeFloatGeometry(tab.route, tab.floating);
        host.classList.remove('is-floating', 'is-dragging');
        host.style.left = '';
        host.style.top = '';
        host.style.width = '';
        host.style.height = '';
        host.style.zIndex = '';
    }
    tab.floating = null;
    const fromIndex = tabs.findIndex((item) => item.id === tabId);
    if (fromIndex > 0) {
        const [moved] = tabs.splice(fromIndex, 1);
        tabs.splice(getFamilyInsertIndex(moved.family), 0, moved);
    }
    activateTab(tabId);
    renderBdfg();
}

function moveTab(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId || dragId === HOME_TAB_ID || targetId === HOME_TAB_ID) {
        return;
    }
    const fromIndex = tabs.findIndex((tab) => tab.id === dragId);
    const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const [moved] = tabs.splice(fromIndex, 1);
    const insertAt = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    tabs.splice(insertAt, 0, moved);
}

function activateTab(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;
    activeTabId = tabId;
    renderTabs();
    renderBdfg();
    if (tab.id === HOME_TAB_ID) {
        renderCards();
        syncWorkspaceVisibility();
        showOnlyTabFrame('__none__');
        document.title = homeTabLabel;
        restaurarBotonesDashboard();
        if (favoriteDrumState) {
            requestAnimationFrame(() => drawFavoriteDrum(favoriteDrumState));
        }
        return;
    }
    ensureTabFrame(tab);
    syncWorkspaceVisibility();
    showOnlyTabFrame(tab.id);
    animarEntradaTab(tab.id);
    document.title = `${tab.label} | ERP`;
}

function showAccessDeniedNotice(label = 'este modulo') {
    let notice = document.getElementById('dashboardAccessDeniedNotice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'dashboardAccessDeniedNotice';
        notice.className = 'dashboard-access-toast';
        document.body.appendChild(notice);
    }
    notice.textContent = `Tu permiso actual no permite abrir ${label}.`;
    notice.hidden = false;
    window.clearTimeout(showAccessDeniedNotice.timer);
    showAccessDeniedNotice.timer = window.setTimeout(() => {
        notice.hidden = true;
    }, 3200);
}

function reloadTabFrame(tabId) {
    const iframe = tabFrames.get(tabId);
    if (!iframe) return;
    try {
        iframe.contentWindow.location.reload();
    } catch (error) {
        iframe.src = iframe.src;
    }
}

function openTab(route, label, options) {
    if (!canViewRoute(route)) {
        showAccessDeniedNotice(label || 'este modulo');
        return null;
    }
    const normalizedRoute = normalizeRoute(route);
    // Reutiliza el tab existente solo si la ruta completa coincide (incluye query
    // params tipo ?codigo= / ?orderCode=): cada cotización, cálculo u orden distinta
    // abre su propio tab y no se sobrepone sobre el anterior.
    const existing = tabs.find((tab) => normalizeRoute(tab.route) === normalizedRoute);
    if (existing) {
        if (options && options.reload) reloadTabFrame(existing.id);
        activateTab(existing.id);
        return existing.id;
    }
    const familyMeta = getTabFamilyMeta(normalizedRoute);
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const insertAt = getFamilyInsertIndex(familyMeta.family);
    tabs.splice(insertAt, 0, { id, route: normalizedRoute, label, closable: true, family: familyMeta.family, level: familyMeta.level });
    activateTab(id);
    renderBdfg();
    return id;
}

function abrirTabFlotante(route, label) {
    if (!canViewRoute(route)) {
        showAccessDeniedNotice(label || 'este modulo');
        return null;
    }
    const normalizedRoute = normalizeRoute(route);
    const existente = tabs.find((tab) => normalizeRoute(tab.route) === normalizedRoute);
    if (existente) {
        if (existente.floating) {
            existente.floating.z = ++floatZCounter;
            const host = frameHosts.get(existente.id);
            if (host) host.style.zIndex = String(existente.floating.z);
        } else if (existente.id !== activeTabId) {
            floatTab(existente.id);
        }
        return existente.id;
    }
    const familyMeta = getTabFamilyMeta(normalizedRoute);
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    tabs.splice(getFamilyInsertIndex(familyMeta.family), 0, { id, route: normalizedRoute, label, closable: true, family: familyMeta.family, level: familyMeta.level });
    floatTab(id);
    return id;
}

function closeTab(tabId) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;
    const wasActive = activeTabId === tabId;
    disposeTabFrame(tabId);
    bdfgTabContexts.delete(tabId);
    tabs.splice(index, 1);
    if (!tabs.length) {
        tabs = [{ id: HOME_TAB_ID, label: homeTabLabel, route: '', closable: false, family: 'home', level: 'root' }];
        activateTab(HOME_TAB_ID);
        return;
    }
    if (wasActive) {
        let fallback = null;
        for (let i = Math.min(index, tabs.length - 1); i >= 0; i -= 1) {
            if (tabs[i] && !tabs[i].floating) { fallback = tabs[i]; break; }
        }
        activateTab(fallback ? fallback.id : HOME_TAB_ID);
    } else {
        renderTabs();
        syncWorkspaceVisibility();
        showOnlyTabFrame(activeTabId);
        renderBdfg();
    }
}

function applyIcon(el, value, color, hover, size, altText) {
    if (!el) return;
    el.innerHTML = iconMarkup(value, altText, 'top-icon-media');
    el.style.color = color || '#9ba2ab';
    el.style.setProperty('--icon-hover-color', hover || color || '#0b81b8');
    el.style.setProperty('--config-icon-size', `${size || 20}px`);
    el.style.width = `${size || 20}px`;
    el.style.height = `${size || 20}px`;
}

function getPresentationConfig(config, key) {
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const branding = config.branding || {};
    const layout = config.layout || {};
    return {
        moduleTitle: presentation.moduleTitle || general.moduleTitle || branding.companyName || 'PrintLab',
        titleColor: presentation.titleColor || general.titleColor || '#ffffff',
        titleFontFamily: presentation.titleFontFamily || general.titleFontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        titleFontSize: presentation.titleFontSize || general.titleFontSize || 16,
        brandLogoUrl: presentation.brandLogoUrl || branding.logoUrl || '',
        logoPosition: presentation.logoPosition || general.brandLogoPosition || 'left',
        headerBgStart: presentation.headerBgStart || general.headerBgStart || '#0b81b8',
        headerBgEnd: presentation.headerBgEnd || general.headerBgEnd || '#17abdf',
        tabColor: presentation.tabColor || general.tabColor || '#7f7f7f',
        iconSize: Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20,
        pageMarginTop: Number(presentation.pageMarginTop) || Number(layout.pageMarginTop) || 14,
        pageMarginRight: Number(presentation.pageMarginRight) || Number(layout.pageMarginRight) || 16,
        pageMarginBottom: Number(presentation.pageMarginBottom) || Number(layout.pageMarginBottom) || 8,
        pageMarginLeft: Number(presentation.pageMarginLeft) || Number(layout.pageMarginLeft) || 16,
        brandWidth: Number(presentation.brandWidth) || Number(general.brandWidth) || 116,
        brandColor: presentation.brandColor || general.brandColor || '#ffffff',
        brandFontFamily: presentation.brandFontFamily || general.brandFontFamily || 'Georgia, Times New Roman, serif',
        brandFontSize: Number(presentation.brandFontSize) || Number(general.brandFontSize) || 22,
        brandVerticalAlign: presentation.brandVerticalAlign || general.brandVerticalAlign || 'center',
        brandHorizontalAlign: presentation.brandHorizontalAlign || general.brandHorizontalAlign || 'center',
        brandMarginTop: Number(presentation.brandMarginTop) || 0,
        brandMarginRight: Number(presentation.brandMarginRight) || 0,
        brandMarginBottom: Number(presentation.brandMarginBottom) || 0,
        brandMarginLeft: Number(presentation.brandMarginLeft) || 0,
        titleMarginLeft: presentation.titleMarginLeft ?? general.titleMarginLeft ?? 30,
        titleHorizontalAlign: presentation.titleHorizontalAlign || general.titleHorizontalAlign || 'left',
        titleWidth: Number(presentation.titleWidth) || Number(general.titleWidth) || 0,
        footerBorderColor: presentation.footerBorderColor || presentation.headerBorderColor || general.footerBorderColor || '#11a3dd'
    };
}

// 'pendiente' → todavía no se ha confirmado con el servidor; 'consultando' → en camino;
// 'confirmado' → el servidor respondió; 'sin-respuesta' → la conexión no respondió.
let estadoConsultaModulos = 'pendiente';

async function confirmarModulosConServidor() {
    if (estadoConsultaModulos === 'consultando') return;
    estadoConsultaModulos = 'consultando';
    renderCards();
    const actualizada = window.ErpAccess?.revalidateSession
        ? await window.ErpAccess.revalidateSession().catch(() => null)
        : null;
    estadoConsultaModulos = actualizada ? 'confirmado' : 'sin-respuesta';
    renderCards();
}

function renderAccessEmptyState(visibleCount) {
    const grid = document.querySelector('.dashboard-grid');
    if (!grid) return;
    let empty = document.getElementById('dashboardAccessEmpty');
    if (visibleCount > 0) {
        if (estadoConsultaModulos !== 'consultando') estadoConsultaModulos = 'pendiente';
        empty?.remove();
        return;
    }
    if (!empty) {
        empty = document.createElement('div');
        empty.id = 'dashboardAccessEmpty';
        empty.className = 'dashboard-access-empty';
        grid.insertAdjacentElement('afterend', empty);
        empty.addEventListener('click', (event) => {
            if (!event.target.closest('[data-action="actualizar-modulos"]')) return;
            estadoConsultaModulos = 'pendiente';
            confirmarModulosConServidor();
        });
    }
    if (estadoConsultaModulos === 'pendiente') {
        confirmarModulosConServidor();
        return;
    }
    if (estadoConsultaModulos === 'confirmado') {
        empty.innerHTML = `
            <strong>Tu usuario todavía no tiene módulos activos</strong>
            <span>Si necesitas alguno, un administrador puede activarlo en tu permiso.</span>
            <button type="button" data-action="actualizar-modulos">Actualizar</button>
        `;
        return;
    }
    if (estadoConsultaModulos === 'sin-respuesta') {
        empty.innerHTML = `
            <strong>Seguimos esperando al servidor</strong>
            <span>La conexión está lenta y tus módulos todavía no llegan. Toca el botón para intentarlo de nuevo.</span>
            <button type="button" data-action="actualizar-modulos">Actualizar</button>
        `;
        return;
    }
    empty.innerHTML = `
        <strong>Cargando tu información</strong>
        <span>Estamos trayendo tus módulos desde el servidor. Espera un momento, por favor.</span>
    `;
}

function renderCards() {
    let visibleCount = 0;
    DASHBOARD_CARDS.forEach((card) => {
        const button = document.querySelector(`.dashboard-card[data-route="${card.route}"]`);
        if (!button) return;
        const isAllowed = canViewAnyModule(card.modules);
        button.hidden = !isAllowed;
        if (!isAllowed) {
            button.style.setProperty('display', 'none', 'important');
            return;
        }
        button.style.removeProperty('display');
        visibleCount += 1;
        const iconTarget = button.querySelector(`[data-icon-target="${card.iconKey}"]`);
        const iconValue = loadedConfig?.icons?.[card.iconKey] || card.fallbackIcon || '□';
        const suffix = card.iconKey.charAt(0).toUpperCase() + card.iconKey.slice(1);
        
        // Try to get color from tab colors first if it matches
        let color = loadedConfig?.general?.[`iconColor${suffix}`];
        if (!color) {
            const familyMap = {
                dashboardBusinessPartners: 'Partners',
                dashboardProducts: 'Products',
                dashboardQuotes: 'Quotes',
                dashboardInventory: 'Inventory',
                dashboardSettings: 'Settings',
                dashboardOrders: 'Orders',
                dashboardPlanning: 'Planning',
                dashboardCosts: 'Costs',
                dashboardReports: 'Reports'
            };
            const family = familyMap[card.iconKey];
            if (family) {
                color = loadedConfig?.general?.[`tabColor${family}Root`];
            }
        }
        color = color || '#0b81b8';

        const hover = loadedConfig?.general?.[`iconColorHover${suffix}`] || color || '#17abdf';
        const configuredSize = Number(loadedConfig?.general?.[`iconSize${suffix}`]) || 38;
        if (iconTarget) {
            const cardWidth = button.clientWidth || 190;
            const size = Math.max(24, Math.min(configuredSize, Math.max(42, Math.min(84, Math.floor(cardWidth * 0.42)))));
            const tileSize = Math.max(56, Math.min(cardWidth - 28, size + 18));
            iconTarget.innerHTML = iconMarkup(iconValue, card.label, 'table-icon-media');
            iconTarget.style.setProperty('--icon-base-color', color);
            iconTarget.style.setProperty('--icon-hover-color', hover);
            iconTarget.style.setProperty('--config-icon-size', `${size}px`);
            iconTarget.style.width = `${tileSize}px`;
            iconTarget.style.height = `${tileSize}px`;
            iconTarget.style.flexBasis = `${tileSize}px`;
        }
    });
    renderAccessEmptyState(visibleCount);
}

function readFavoriteDocuments() {
    try {
        const raw = JSON.parse(localStorage.getItem(FAVORITE_DOCUMENTS_STORAGE_KEY) || '[]');
        return Array.isArray(raw)
            ? raw.filter((item) => item && String(item.route || '').trim())
            : [];
    } catch (error) {
        return [];
    }
}

function writeFavoriteDocuments(items) {
    localStorage.setItem(FAVORITE_DOCUMENTS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('erp-favorites-updated', { detail: items }));
}

function getActiveTab() {
    return tabs.find((item) => item.id === activeTabId) || null;
}

function frameWindowContains(frameWindow, targetWindow) {
    if (!frameWindow || !targetWindow) return false;
    if (frameWindow === targetWindow) return true;
    try {
        for (let i = 0; i < frameWindow.frames.length; i += 1) {
            if (frameWindowContains(frameWindow.frames[i], targetWindow)) return true;
        }
    } catch (_) {}
    return false;
}

function getTabIdByFrameWindow(targetWindow) {
    if (!targetWindow) return '';
    for (const [tabId, frame] of tabFrames.entries()) {
        if (frameWindowContains(frame?.contentWindow, targetWindow)) {
            return tabId;
        }
    }
    return '';
}

function setBdfgTabContext(tabId, context) {
    if (!tabId || tabId === HOME_TAB_ID) return;
    if (!context || typeof context !== 'object') {
        bdfgTabContexts.delete(tabId);
        return;
    }
    bdfgTabContexts.set(tabId, { ...context });
}

function getActiveBdfgContext() {
    return bdfgTabContexts.get(activeTabId) || null;
}

function getStatusEntriesFromContext(context) {
    if (!context?.dates || typeof context.dates !== 'object') return [];
    return [
        { label: 'Creación', value: context.dates.createdAt || '' },
        { label: 'Solicitud', value: context.dates.requestedAt || '' },
        { label: 'Cotización', value: context.dates.quotedAt || '' },
        { label: 'Producción', value: context.dates.sentToProductionAt || '' },
        { label: 'Vencimiento', value: context.dates.dueAt || '' },
        { label: 'Actualización', value: context.dates.updatedAt || '' }
    ].filter((item) => String(item.value || '').trim());
}

function formatBdfgDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toLocaleString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function normalizeFavoriteRouteKey(route) {
    return stripShellRoute(route || '').trim();
}

function getActiveFavoritePayload() {
    const tab = getActiveTab();
    if (!tab || tab.id === HOME_TAB_ID || !tab.route) return null;
    const context = getActiveBdfgContext();
    const subtitleParts = String(context?.subtitle || '').split('·').map((part) => part.trim()).filter(Boolean);
    const customerName = firstFilled(
        context?.customerName,
        context?.customer_name,
        context?.clientName,
        context?.client_name,
        subtitleParts[0]
    );
    const productName = firstFilled(
        context?.productName,
        context?.product_name,
        context?.jobName,
        context?.job_name,
        context?.kind === 'product-document' ? context?.title : '',
        subtitleParts[1]
    );
    return {
        route: normalizeFavoriteRouteKey(tab.route),
        label: String(tab.label || 'Documento').trim() || 'Documento',
        code: String(tab.label || 'Documento').trim() || 'Documento',
        customerName: String(customerName || '').trim(),
        productName: String(productName || '').trim(),
        jobName: String(productName || '').trim(),
        updatedAt: Date.now()
    };
}

function isFavoriteRoute(route) {
    const key = normalizeFavoriteRouteKey(route);
    return readFavoriteDocuments().some((item) => normalizeFavoriteRouteKey(item.route) === key);
}

function openNotificationChatWidget() {
    if (!window.NotificationChatWidget) {
        openTab('/notificaciones.html', 'Notificaciones');
        return;
    }
    if (!notificationChatWidget) {
        notificationChatWidget = new window.NotificationChatWidget({
            session: activeUserSession,
            headers: sessionHeaders,
            icons: {
                title: getBdfgIconConfig('notificationChatTitle', 'dashboardNotifications', '✉', '#0b81b8', 18),
                openCenter: getBdfgIconConfig('notificationChatOpenCenter', '', '◱', '#0b81b8', 16),
                attach: getBdfgIconConfig('notificationChatAttach', '', '📎', '#607286', 16),
                send: getBdfgIconConfig('notificationChatSend', '', '➤', '#0b81b8', 16),
                delete: { ...getBdfgIconConfig('lineDelete', '', '🗑', '#607286', 16), color: '#607286', hoverColor: '#344054', size: 16 }
            },
            openRoute: (route, label) => openTab(route, label || 'Documento'),
            openCenter: () => openTab('/notificaciones.html', 'Notificaciones'),
            onUnreadChange: (count) => {
                bdfgUnreadCount = Number(count || 0);
                renderBdfg();
            },
            onChanged: () => loadBdfgNotifications().catch(() => {})
        });
    }
    notificationChatWidget.open().catch(() => {
        openTab('/notificaciones.html', 'Notificaciones');
    });
    setBdfgOpen(false, 'actions');
}

function toggleFavoriteRoute(payload) {
    if (!payload?.route) return false;
    const currentFavorites = readFavoriteDocuments();
    const routeKey = normalizeFavoriteRouteKey(payload.route);
    const exists = currentFavorites.some((item) => normalizeFavoriteRouteKey(item.route) === routeKey);
    const nextFavorites = exists
        ? currentFavorites.filter((item) => normalizeFavoriteRouteKey(item.route) !== routeKey)
        : [{ ...payload, updatedAt: Date.now() }, ...currentFavorites.filter((item) => normalizeFavoriteRouteKey(item.route) !== routeKey)];
    writeFavoriteDocuments(nextFavorites.slice(0, 48));
    return !exists;
}

function getFavoriteDisplayTitle(item) {
    const customerName = firstFilled(item?.customerName, item?.customer_name, item?.clientName, item?.client_name);
    const productName = firstFilled(item?.productName, item?.product_name, item?.jobName, item?.job_name, item?.productCode, item?.product_code);
    return String(customerName || productName || 'Documento favorito').trim();
}

function getFavoriteDisplaySubtitle(item) {
    const customerName = firstFilled(item?.customerName, item?.customer_name, item?.clientName, item?.client_name);
    const productName = firstFilled(item?.productName, item?.product_name, item?.jobName, item?.job_name, item?.productCode, item?.product_code);
    return String(customerName && productName ? productName : '').trim();
}

function getFavoriteOpenLabel(item) {
    return String(item?.label || item?.code || item?.quoteCode || getFavoriteDisplayTitle(item) || 'Documento').trim() || 'Documento';
}

function getActiveRouteModuleKey() {
    const tab = getActiveTab();
    if (!tab?.route) return '';
    const keys = getRoutePermissionKeys(stripShellRoute(tab.route));
    return keys[0] || '';
}

function positionSearchPopover(anchorEl = null) {
    if (!searchPopover || searchPopover.hidden) return;
    const target = anchorEl || searchPopoverAnchor || bdfgButton || bdfgShell;
    const rect = target?.getBoundingClientRect?.();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
    const margin = 12;
    const nextWidth = Math.min(460, Math.max(280, viewportWidth - (margin * 2)));
    searchPopover.style.width = `${nextWidth}px`;
    const popoverHeight = searchPopover.offsetHeight || 320;
    const baseRect = rect && Number.isFinite(rect.left)
        ? rect
        : {
            left: Math.max(margin, viewportWidth - nextWidth - margin),
            top: Math.max(margin, viewportHeight * 0.18),
            bottom: Math.max(margin + 42, viewportHeight * 0.18 + 42),
            width: 42
        };
    let left = baseRect.left + ((baseRect.width || 42) / 2) - (nextWidth / 2);
    left = Math.min(Math.max(margin, left), Math.max(margin, viewportWidth - nextWidth - margin));
    const fitsBelow = baseRect.bottom + 14 + popoverHeight <= viewportHeight - margin;
    const top = fitsBelow
        ? Math.max(margin, baseRect.bottom + 14)
        : Math.max(margin, baseRect.top - popoverHeight - 14);
    searchPopover.style.left = `${left}px`;
    searchPopover.style.top = `${top}px`;
}

function openDashboardSearch(anchorEl = null) {
    ensureSearchPopover();
    closeInventoryPopover();
    closeSearchPopover();
    if (!searchPopover) return;
    searchPopoverAnchor = anchorEl || bdfgButton || bdfgShell || null;
    searchPopover.hidden = false;
    searchPopover.style.visibility = 'hidden';
    renderSearchResults([], '');
    requestAnimationFrame(() => {
        positionSearchPopover(searchPopoverAnchor);
        searchPopover.style.visibility = '';
        searchInput?.focus();
    });
}

function toggleThemeMode() {
    const current = window.PrintLabTheme?.current?.().mode || document.documentElement.dataset.themeMode || 'light';
    window.PrintLabTheme?.apply?.(current === 'dark' ? 'light' : 'dark');
    renderBdfg();
}

function openDashboardUserProfile() {
    closeSearchPopover();
    closeInventoryPopover();
    window.ERPTopbarTools?.openProfilePopover?.();
}

function getTrazabilidadTargetFromContext(context) {
    if (!context || typeof context !== 'object') return null;
    if (context.kind === 'calculo-flexografia' && String(context.lineCode || '').trim()) {
        return { entityType: 'line', entityId: String(context.lineCode).trim() };
    }
    if (context.kind === 'product-document' && String(context.productCode || '').trim()) {
        return { entityType: 'product', entityId: String(context.productCode).trim() };
    }
    if (context.kind === 'order-document' && String(context.orderCode || '').trim()) {
        return { entityType: 'order', entityId: String(context.orderCode).trim() };
    }
    return null;
}

function getBdfgContextSummary() {
    const tab = getActiveTab();
    const context = getActiveBdfgContext();
    if (!tab || tab.id === HOME_TAB_ID) {
        return {
            title: 'Acciones globales',
            subtitle: 'Herramientas disponibles en todo el dashboard'
        };
    }
    return {
        title: context?.title || tab.label || 'Acciones',
        subtitle: context?.subtitle || `Contexto activo: ${tab.label || 'Documento'}`
    };
}

function getBdfgActions() {
    const tab = getActiveTab();
    const context = getActiveBdfgContext();
    const currentFavorite = getActiveFavoritePayload();
    const favoriteActive = currentFavorite ? isFavoriteRoute(currentFavorite.route) : false;
    const currentTheme = window.PrintLabTheme?.current?.().mode || 'light';
    const globalActions = [
        {
            id: 'favorites',
            label: 'Favoritos',
            description: 'Ver, buscar y abrir favoritos guardados',
            mode: 'favorites'
        },
        {
            id: 'notifications',
            label: 'Notificaciones',
            description: 'Abrir el centro de conversaciones y alertas',
            callback: openNotificationChatWidget,
            badge: bdfgUnreadCount > 0 ? (bdfgUnreadCount > 99 ? '99+' : String(bdfgUnreadCount)) : ''
        },
        {
            id: 'search',
            label: 'Búsqueda rápida',
            description: 'Abrir la búsqueda global de órdenes y cotizaciones',
            mode: 'search'
        },
        ...(dvpPanel && !dvpPanel.hidden ? [{
            id: 'tu-actividad',
            label: 'Tu actividad',
            description: 'KPIs, órdenes, facturas, top clientes y leads',
            mode: 'tu-actividad'
        }] : []),
        {
            id: 'profile',
            label: 'Perfil de usuario',
            description: 'Abrir tu perfil y las opciones de sesión',
            callback: openDashboardUserProfile
        },
        {
            id: 'theme',
            label: currentTheme === 'dark' ? 'Modo día' : 'Modo noche',
            description: 'Cambiar el tema sin recargar la pantalla',
            callback: toggleThemeMode
        },
        ...(hasSuperPermission() ? [{
            id: 'toggle-vendor-view',
            label: viewAsVendorMode ? 'Salir de vista vendedor' : 'Ver como vendedor',
            description: 'Alternar la vista de prueba del pipeline de un vendedor',
            callback: toggleViewAsVendorMode
        }] : [])
    ];

    const contextualActions = [];
    if (currentFavorite) {
        contextualActions.push({
            id: 'toggle-favorite',
            label: favoriteActive ? 'Quitar favorito actual' : 'Agregar favorito actual',
            description: favoriteActive ? 'Eliminar este tab de favoritos' : 'Guardar este tab como favorito',
            callback: () => {
                toggleFavoriteRoute(currentFavorite);
                renderBdfg();
            }
        });
    }

    if (context?.documentRoute && canViewRoute(context.documentRoute)) {
        contextualActions.push({
            id: 'open-context-document',
            label: context.documentLabel || 'Abrir documento',
            description: context.documentDescription || 'Abrir el documento asociado al contexto actual',
            route: context.documentRoute,
            routeLabel: context.documentLabel || 'Documento'
        });
    }

    if (context?.secondaryRoute && canViewRoute(context.secondaryRoute)) {
        contextualActions.push({
            id: context.secondaryActionId || 'open-context-secondary',
            label: context.secondaryLabel || 'Abrir relacionado',
            description: context.secondaryDescription || 'Abrir el elemento relacionado del contexto actual',
            route: context.secondaryRoute,
            routeLabel: context.secondaryLabel || 'Relacionado'
        });
    }

    if (getStatusEntriesFromContext(context).length) {
        contextualActions.push({
            id: 'view-context-status',
            label: 'Ver estado',
            description: 'Ver fechas y avance del registro actual',
            mode: 'status'
        });
    }

    if (context?.kind === 'calculo-flexografia' && Array.isArray(context.processes) && context.processes.length) {
        contextualActions.push({
            id: 'calc-processes',
            label: 'Procesos',
            description: 'Ver y agregar procesos del cálculo actual',
            mode: 'calc-processes'
        });
    }

    const trazabilidadTarget = getTrazabilidadTargetFromContext(context);
    if (trazabilidadTarget) {
        contextualActions.push({
            id: 'open-trazabilidad',
            label: 'Ver trazabilidad',
            description: 'Abrir el mapa de trazabilidad del documento actual',
            callback: () => {
                if (typeof window.openTrazabilidad === 'function') {
                    window.openTrazabilidad(trazabilidadTarget);
                    return;
                }
                const url = `/trazabilidad?entityType=${encodeURIComponent(trazabilidadTarget.entityType)}&entityId=${encodeURIComponent(trazabilidadTarget.entityId)}`;
                window.open(url, '_blank');
            }
        });
    }

    switch (tab?.family) {
        case 'quotes':
            if (canViewRoute('/cotizaciones') && !isCurrentTabRoute('/cotizaciones')) {
                contextualActions.push({
                    id: 'open-quotes',
                    label: 'Ir a Cotizaciones',
                    description: 'Abrir el módulo principal de cotizaciones',
                    route: '/cotizaciones',
                    routeLabel: 'Cotizaciones'
                });
            }
            break;
        case 'products':
            if (canViewRoute('/productos') && !isCurrentTabRoute('/productos')) {
                contextualActions.push({
                    id: 'open-products',
                    label: 'Ir a SKU',
                    description: 'Abrir el módulo principal de productos',
                    route: '/productos',
                    routeLabel: 'SKU'
                });
            }
            break;
        case 'orders':
            if (canViewRoute('/ordenes-produccion') && !isCurrentTabRoute('/ordenes-produccion')) {
                contextualActions.push({
                    id: 'open-orders',
                    label: 'Ir a Órdenes',
                    description: 'Abrir el módulo de órdenes de producción',
                    route: '/ordenes-produccion',
                    routeLabel: 'Órdenes'
                });
            }
            break;
        case 'inventory':
            if (getVisibleInventoryOptions().length > 0) {
                contextualActions.push({
                    id: 'open-inventory-menu',
                    label: 'Inventarios',
                    description: 'Abrir el selector de inventarios disponibles',
                    callback: () => {
                        ensureInventoryPopover();
                        closeSearchPopover();
                        if (inventoryPopover) {
                            inventoryPopover.hidden = false;
                            inventoryPopover.style.visibility = 'hidden';
                            requestAnimationFrame(() => {
                                positionInventoryPopover(bdfgButton || bdfgShell);
                                inventoryPopover.style.visibility = '';
                            });
                        }
                    }
                });
            }
            break;
        case 'settings':
            if (canViewRoute('/configuracion-general') && !isCurrentTabRoute('/configuracion-general')) {
                contextualActions.push({
                    id: 'open-settings',
                    label: 'Ir a Configuración',
                    description: 'Abrir la configuración general del sistema',
                    route: '/configuracion-general',
                    routeLabel: 'Configuración'
                });
            }
            break;
        case 'planning':
            if (canViewRoute('/planificacion/seguimiento') && !isCurrentTabRoute('/planificacion/seguimiento')) {
                contextualActions.push({
                    id: 'open-planning',
                    label: 'Ir a Planificación',
                    description: 'Abrir el módulo de planificación y producción',
                    route: '/planificacion/seguimiento',
                    routeLabel: 'Planificación'
                });
            }
            break;
        case 'costs':
            if (canViewRoute('/costos.html') && !isCurrentTabRoute('/costos.html')) {
                contextualActions.push({
                    id: 'open-costs',
                    label: 'Ir a Costos',
                    description: 'Abrir el módulo de costos',
                    route: '/costos.html',
                    routeLabel: 'Costos'
                });
            }
            break;
        default:
            break;
    }

    if ((tab?.family === 'quotes' || tab?.family === 'orders')
        && (typeof canErpCreateModule !== 'function' || canErpCreateModule('calidad'))) {
        contextualActions.push({
            id: 'report-quality-incident',
            label: 'Reportar Incidencia de Calidad',
            description: 'Registrar un problema de calidad reportado por un cliente',
            callback: openQuickQualityIncidentModal
        });
    }

    return { globalActions, contextualActions };
}

function renderBdfgActionsPanel() {
    if (!bdfgPanel) return;
    const context = getBdfgContextSummary();
    const { globalActions, contextualActions } = getBdfgActions();
    bdfgTitle.textContent = context.title;
    bdfgSubtitle.textContent = context.subtitle;
    bdfgSubtitle.hidden = !String(context.subtitle || '').trim();
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-section">
            <div class="dashboard-bdfg-section-title">Global</div>
            <div class="dashboard-bdfg-action-grid">
                ${globalActions.map((action) => `
                    <button type="button" class="dashboard-bdfg-action" data-bdfg-action="${escapeHtml(action.id)}">
                        ${action.badge ? `<span class="dashboard-bdfg-action-badge">${escapeHtml(action.badge)}</span>` : ''}
                        <strong>${escapeHtml(action.label)}</strong>
                        <span>${escapeHtml(action.description)}</span>
                    </button>
                `).join('')}
            </div>
        </section>
        ${contextualActions.length ? `
            <section class="dashboard-bdfg-section">
                <div class="dashboard-bdfg-section-title">Tab actual</div>
                <div class="dashboard-bdfg-action-grid">
                    ${contextualActions.map((action) => `
                        <button type="button" class="dashboard-bdfg-action" data-bdfg-action="${escapeHtml(action.id)}">
                            <strong>${escapeHtml(action.label)}</strong>
                            <span>${escapeHtml(action.description)}</span>
                        </button>
                    `).join('')}
                </div>
            </section>
        ` : ''}
    `;
}

function renderBdfgFavoritesPanel() {
    if (!bdfgPanel) return;
    enableBdfgFavoritesFloatingPanel();
    const favorites = readFavoriteDocuments()
        .filter((item) => canViewRoute(item.route))
        .filter((item) => {
            const query = bdfgFavoriteFilter.trim().toLowerCase();
            if (!query) return true;
            return [
                item.route,
                item.label,
                item.code,
                getFavoriteDisplayTitle(item),
                getFavoriteDisplaySubtitle(item)
            ].filter(Boolean).join(' ').toLowerCase().includes(query);
        })
        .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));
    bdfgTitle.textContent = 'Favoritos';
    bdfgSubtitle.textContent = '';
    bdfgSubtitle.hidden = true;
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-section">
            <input id="dashboardBdfgFavoriteSearch" type="search" class="dashboard-bdfg-search" placeholder="Buscar favorito">
            <div class="dashboard-bdfg-list">
                ${favorites.length ? favorites.map((item, index) => `
                    <article class="dashboard-bdfg-item" data-bdfg-favorite-index="${index}">
                        <div class="dashboard-bdfg-item-head">
                            <strong>${escapeHtml(getFavoriteDisplayTitle(item))}</strong>
                        </div>
                        ${getFavoriteDisplaySubtitle(item) ? `<span>${escapeHtml(getFavoriteDisplaySubtitle(item))}</span>` : ''}
                        <div class="dashboard-bdfg-item-actions">
                            <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-favorite="${escapeHtml(item.route)}" data-bdfg-open-label="${escapeHtml(getFavoriteOpenLabel(item))}">Abrir</button>
                            <button type="button" class="dashboard-bdfg-inline-btn dashboard-bdfg-item-remove" data-bdfg-remove-favorite="${escapeHtml(item.route)}">Quitar</button>
                        </div>
                    </article>
                `).join('') : '<div class="dashboard-bdfg-empty">Todavía no hay favoritos visibles para tu sesión.</div>'}
            </div>
        </section>
    `;
    const searchField = document.getElementById('dashboardBdfgFavoriteSearch');
    if (searchField) {
        searchField.value = bdfgFavoriteFilter;
        searchField.addEventListener('input', () => {
            bdfgFavoriteFilter = searchField.value || '';
            renderBdfgFavoritesPanel();
        });
        requestAnimationFrame(() => searchField.focus());
    }
}

function renderBdfgNotificationsPanel() {
    if (!bdfgPanel) return;
    bdfgTitle.textContent = 'Notificaciones';
    bdfgSubtitle.textContent = '';
    bdfgSubtitle.hidden = true;
    const threads = bdfgNotificationThreads.slice(0, 12);
    const selectedThread = threads.find((thread) => thread.threadCode === bdfgNotificationSelectedThreadCode) || threads[0] || null;
    if (selectedThread && selectedThread.threadCode !== bdfgNotificationSelectedThreadCode) {
        bdfgNotificationSelectedThreadCode = selectedThread.threadCode;
    }
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-chat">
            <div class="dashboard-bdfg-chat-list">
                ${threads.length ? threads.map((thread) => `
                    <button type="button" class="dashboard-bdfg-chat-thread${thread.threadCode === bdfgNotificationSelectedThreadCode ? ' is-selected' : ''}" data-bdfg-thread-code="${escapeHtml(thread.threadCode || '')}">
                        <span class="dashboard-bdfg-chat-avatar">${escapeHtml((thread.sellerName || thread.targetUserName || thread.customerName || 'N').trim().slice(0, 1).toUpperCase())}</span>
                        <span class="dashboard-bdfg-chat-thread-copy">
                            <strong>${escapeHtml(thread.sellerName || thread.targetUserName || thread.customerName || 'Notificación')}</strong>
                            <em>${escapeHtml(thread.lastMessagePreview || [thread.documentCode, thread.lineCode].filter(Boolean).join(' · ') || 'Sin mensajes')}</em>
                        </span>
                        ${thread.unreadCount ? `<span class="dashboard-bdfg-action-badge">${escapeHtml(String(Math.min(thread.unreadCount, 99)))}</span>` : ''}
                    </button>
                `).join('') : '<div class="dashboard-bdfg-empty">No hay conversaciones.</div>'}
            </div>
            <div class="dashboard-bdfg-chat-room">
                ${selectedThread ? `
                    <div class="dashboard-bdfg-chat-room-head">
                        <span class="dashboard-bdfg-chat-avatar">${escapeHtml((selectedThread.sellerName || selectedThread.targetUserName || selectedThread.customerName || 'N').trim().slice(0, 1).toUpperCase())}</span>
                        <span>
                            <strong>${escapeHtml(selectedThread.sellerName || selectedThread.targetUserName || selectedThread.customerName || 'Notificación')}</strong>
                            <em>${escapeHtml([selectedThread.documentCode, selectedThread.lineCode, selectedThread.customerName].filter(Boolean).join(' · ') || 'Conversación interna')}</em>
                        </span>
                    </div>
                    <div class="dashboard-bdfg-chat-messages">
                        ${bdfgNotificationMessages.length ? bdfgNotificationMessages.map((message) => {
                            const own = isOwnBdfgMessage(message);
                            return `
                                <article class="dashboard-bdfg-chat-message${own ? ' is-own' : ''}">
                                    <strong>${escapeHtml(message.senderName || 'Usuario')}</strong>
                                    <span>${escapeHtml(message.bodyText || '')}</span>
                                    <em>${escapeHtml([formatBdfgDate(message.sentAt), own && message.readAt ? `Leído ${formatBdfgDate(message.readAt)}` : ''].filter(Boolean).join(' · '))}</em>
                                </article>
                            `;
                        }).join('') : '<div class="dashboard-bdfg-empty">Selecciona una conversación para ver el historial.</div>'}
                    </div>
                    <form class="dashboard-bdfg-chat-compose" data-bdfg-chat-form>
                        <input type="text" class="dashboard-bdfg-chat-input" data-bdfg-chat-input placeholder="Mensaje">
                        <button type="submit" class="dashboard-bdfg-chat-send" aria-label="Enviar">Enviar</button>
                    </form>
                    <div class="dashboard-bdfg-item-actions">
                        <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-notifications="true">Abrir centro</button>
                        <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-refresh-notifications="true">Actualizar</button>
                    </div>
                ` : `
                    <div class="dashboard-bdfg-empty">No hay conversaciones para mostrar.</div>
                    <div class="dashboard-bdfg-item-actions">
                        <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-notifications="true">Abrir centro</button>
                        <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-refresh-notifications="true">Actualizar</button>
                    </div>
                `}
            </div>
        </section>
    `;
}

function isOwnBdfgMessage(message = {}) {
    const sender = String(message.senderName || '').trim().toLowerCase();
    const current = [activeUserSession?.name, activeUserSession?.username]
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean);
    return Boolean(sender && current.includes(sender));
}

function focusBdfgChatInput() {
    const input = bdfgPanel?.querySelector('[data-bdfg-chat-input]');
    if (input) requestAnimationFrame(() => input.focus());
}

async function loadBdfgNotificationThread(threadCode = '') {
    const code = String(threadCode || '').trim();
    if (!code) return;
    bdfgNotificationSelectedThreadCode = code;
    const response = await fetch(`${NOTIFICATION_THREAD_ENDPOINT}/${encodeURIComponent(code)}/messages`, { headers: sessionHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar la conversación.');
    bdfgNotificationMessages = Array.isArray(payload.items) ? payload.items : [];
    bdfgNotificationThreads = bdfgNotificationThreads.map((thread) => (
        thread.threadCode === code ? { ...thread, unreadCount: 0 } : thread
    ));
    bdfgUnreadCount = Math.max(0, bdfgNotificationThreads.reduce((total, item) => total + Number(item?.unreadCount || 0), 0));
    renderBdfg();
    focusBdfgChatInput();
}

async function sendBdfgChatMessage() {
    const input = bdfgPanel?.querySelector('[data-bdfg-chat-input]');
    const bodyText = String(input?.value || '').trim();
    const code = String(bdfgNotificationSelectedThreadCode || '').trim();
    if (!bodyText || !code) return;
    const response = await fetch(`${NOTIFICATION_THREAD_ENDPOINT}/${encodeURIComponent(code)}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...sessionHeaders()
        },
        body: JSON.stringify({ bodyText })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible enviar el mensaje.');
    if (input) input.value = '';
    await loadBdfgNotificationThread(code);
    await loadBdfgNotifications();
}

function renderBdfgSearchResults(items, term = '') {
    if (!bdfgPanel) return;
    const query = String(term || '').trim();
    const resultsMarkup = !query
        ? '<div class="dashboard-bdfg-empty">Escribe algo para buscar.</div>'
        : !items.length
            ? '<div class="dashboard-bdfg-empty">No encontré resultados con ese texto.</div>'
            : items.map((item) => `
                <article class="dashboard-bdfg-item">
                    <div class="dashboard-bdfg-item-head">
                        <strong>${escapeHtml(item.code)}</strong>
                        <span>${escapeHtml(item.kind)}</span>
                    </div>
                    <span>${escapeHtml(item.subtitle)}</span>
                    ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : ''}
                    ${item.details ? `<span>${escapeHtml(item.details)}</span>` : ''}
                    <div class="dashboard-bdfg-item-actions">
                        <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-search-route="${escapeHtml(item.route)}" data-bdfg-open-search-label="${escapeHtml(item.label)}">Abrir</button>
                    </div>
                </article>
            `).join('');
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-section">
            <input id="dashboardBdfgSearchInput" type="search" class="dashboard-bdfg-search" placeholder="Buscar orden, cotización, cliente o producto">
            <div class="dashboard-bdfg-empty" style="margin-top:2px;">Busca por orden, cotización, cliente o nombre de producto y abre el resultado desde aquí.</div>
            <div class="dashboard-bdfg-list">
                ${resultsMarkup}
            </div>
        </section>
    `;
    const searchField = document.getElementById('dashboardBdfgSearchInput');
    if (searchField) {
        searchField.value = bdfgSearchTerm;
        searchField.addEventListener('input', () => {
            bdfgSearchTerm = searchField.value || '';
            runDashboardSearch(bdfgSearchTerm);
        });
        requestAnimationFrame(() => searchField.focus());
    }
}

function renderBdfgSearchPanel() {
    if (!bdfgPanel) return;
    bdfgTitle.textContent = 'Búsqueda rápida';
    bdfgSubtitle.textContent = 'Órdenes, cotizaciones, clientes y productos';
    bdfgSubtitle.hidden = false;
    renderBdfgSearchResults([], bdfgSearchTerm);
}

function renderBdfgStatusPanel() {
    if (!bdfgPanel) return;
    const context = getActiveBdfgContext();
    const entries = getStatusEntriesFromContext(context);
    bdfgTitle.textContent = context?.title || 'Estado';
    bdfgSubtitle.textContent = context?.subtitle || 'Fechas relevantes del contexto actual';
    bdfgSubtitle.hidden = !String(context?.subtitle || 'Fechas relevantes del contexto actual').trim();
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-section">
            <div class="dashboard-bdfg-list">
                ${entries.length ? entries.map((entry) => `
                    <article class="dashboard-bdfg-item">
                        <div class="dashboard-bdfg-item-head">
                            <strong>${escapeHtml(entry.label)}</strong>
                        </div>
                        <span>${escapeHtml(formatBdfgDate(entry.value))}</span>
                    </article>
                `).join('') : '<div class="dashboard-bdfg-empty">No hay fechas disponibles para este registro.</div>'}
            </div>
        </section>
    `;
}

function readBdfgFavoritesPanelPosition() {
    try {
        const saved = JSON.parse(localStorage.getItem(BDFG_FAVORITES_PANEL_POSITION_STORAGE_KEY) || 'null');
        if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
            return { x: Number(saved.x), y: Number(saved.y) };
        }
    } catch (error) {
        return null;
    }
    return null;
}

function clampBdfgFavoritesPanelPosition(left, top) {
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    const height = window.innerHeight || document.documentElement.clientHeight || 720;
    const panelWidth = bdfgBridge?.offsetWidth || 400;
    const panelHeight = bdfgBridge?.offsetHeight || 320;
    return {
        x: Math.min(Math.max(8, Number(left) || 8), Math.max(8, width - panelWidth - 8)),
        y: Math.min(Math.max(8, Number(top) || 8), Math.max(8, height - panelHeight - 8))
    };
}

function applyBdfgFavoritesPanelPosition(position) {
    if (!bdfgBridge) return null;
    const next = clampBdfgFavoritesPanelPosition(position?.x, position?.y);
    bdfgBridge.style.left = `${next.x}px`;
    bdfgBridge.style.top = `${next.y}px`;
    bdfgBridge.style.right = 'auto';
    bdfgBridge.style.bottom = 'auto';
    return next;
}

function enableBdfgFavoritesFloatingPanel() {
    if (!bdfgBridge) return;
    const currentRect = bdfgBridge.getBoundingClientRect();
    bdfgBridge.classList.add('is-favorites-floating');
    applyBdfgFavoritesPanelPosition(readBdfgFavoritesPanelPosition() || { x: currentRect.left, y: currentRect.top });
}

function disableBdfgFavoritesFloatingPanel() {
    if (!bdfgBridge || !bdfgBridge.classList.contains('is-favorites-floating')) return;
    bdfgBridge.classList.remove('is-favorites-floating', 'is-dragging');
    bdfgBridge.style.left = '';
    bdfgBridge.style.top = '';
    bdfgBridge.style.right = '';
    bdfgBridge.style.bottom = '';
    bdfgDragState = null;
}

function startBdfgFavoritesPanelDrag(event) {
    if (!['favorites', 'calc-processes'].includes(bdfgMode) || !bdfgBridge || event.button !== 0) return;
    const head = event.target.closest('.dashboard-bdfg-head');
    if (!head || event.target.closest('button, input, select, textarea, a')) return;
    const rect = bdfgBridge.getBoundingClientRect();
    bdfgDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        mode: bdfgMode,
        moved: false
    };
    bdfgBridge.setPointerCapture?.(event.pointerId);
    bdfgBridge.classList.add('is-dragging');
    event.preventDefault();
}

function moveBdfgFavoritesPanelDrag(event) {
    if (!bdfgDragState || bdfgDragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - bdfgDragState.startX;
    const dy = event.clientY - bdfgDragState.startY;
    if (!bdfgDragState.moved && (Math.abs(dx) + Math.abs(dy) > 6)) {
        bdfgDragState.moved = true;
    }
    if (!bdfgDragState.moved) return;
    applyBdfgFavoritesPanelPosition({ x: bdfgDragState.originX + dx, y: bdfgDragState.originY + dy });
}

function finishBdfgFavoritesPanelDrag(event) {
    if (!bdfgDragState || bdfgDragState.pointerId !== event.pointerId) return;
    const moved = bdfgDragState.moved;
    const dragMode = bdfgDragState.mode;
    bdfgDragState = null;
    bdfgBridge?.classList.remove('is-dragging');
    if (bdfgBridge?.releasePointerCapture && bdfgBridge.hasPointerCapture?.(event.pointerId)) {
        bdfgBridge.releasePointerCapture(event.pointerId);
    }
    if (!moved || !bdfgBridge) return;
    const rect = bdfgBridge.getBoundingClientRect();
    const next = applyBdfgFavoritesPanelPosition({ x: rect.left, y: rect.top });
    if (next && dragMode === 'favorites') {
        try {
            localStorage.setItem(BDFG_FAVORITES_PANEL_POSITION_STORAGE_KEY, JSON.stringify(next));
        } catch (error) {}
    }
}

function renderBdfgPanel() {
    if (!bdfgBridge || bdfgBridge.hidden) return;
    bdfgBridge.classList.toggle('dashboard-bdfg-bridge-chat', bdfgMode === 'notifications');
    bdfgBridge.classList.toggle('dashboard-bdfg-bridge-activity', bdfgMode === 'tu-actividad');
    if (dvpPanel && dvpPanel.parentElement === bdfgPanel && bdfgMode !== 'tu-actividad') {
        dvpPanelHomeParent?.appendChild(dvpPanel);
    }
    if (!['favorites', 'calc-processes'].includes(bdfgMode)) disableBdfgFavoritesFloatingPanel();
    if (bdfgMode === 'calc-processes') {
        const currentRect = bdfgBridge.getBoundingClientRect();
        bdfgBridge.classList.add('is-favorites-floating');
        applyBdfgFavoritesPanelPosition({ x: currentRect.left, y: currentRect.top });
        const context = getActiveBdfgContext();
        bdfgComponent?.renderProcessTray(context?.processes || [], {
            canEdit: context?.canEdit !== false,
            title: 'Procesos',
            subtitle: '',
            targetLineCode: context?.lineCode || ''
        });
        return;
    }
    bdfgComponent?.clearProcessTray(false);
    if (bdfgMode === 'favorites') {
        renderBdfgFavoritesPanel();
        return;
    }
    if (bdfgMode === 'notifications') {
        renderBdfgNotificationsPanel();
        return;
    }
    if (bdfgMode === 'search') {
        renderBdfgSearchPanel();
        return;
    }
    if (bdfgMode === 'status') {
        renderBdfgStatusPanel();
        return;
    }
    if (bdfgMode === 'tu-actividad') {
        renderBdfgVendorActivityPanel();
        return;
    }
    renderBdfgActionsPanel();
}

function renderBdfgVendorActivityPanel() {
    if (!bdfgPanel || !dvpPanel) {
        renderBdfgActionsPanel();
        return;
    }
    bdfgTitle.textContent = 'Tu actividad';
    bdfgSubtitle.textContent = '';
    bdfgSubtitle.hidden = true;
    if (dvpPanel.parentElement !== bdfgPanel) {
        bdfgPanel.innerHTML = '';
        bdfgPanel.appendChild(dvpPanel);
    }
    dvpPanel.hidden = false;
}

function renderBdfgBadge() {
    if (!bdfgBadge) return;
    const visible = bdfgUnreadCount > 0;
    bdfgBadge.hidden = !visible;
    if (visible) {
        bdfgBadge.textContent = bdfgUnreadCount > 99 ? '99+' : String(bdfgUnreadCount);
    }
    bdfgComponent?.renderBadge(bdfgUnreadCount);
}

function renderBdfg() {
    const effectiveConfig = getEffectiveBdfgConfig();
    bdfgComponent?.setConfig(effectiveConfig);
    renderBdfgBadge();
    updateBdfgPlacement();
    renderBdfgRadialMenu();
    bdfgComponent?.renderMainIcon(getBdfgMainIconConfig());
    bdfgComponent?.setOpen(bdfgShell?.classList.contains('is-active'));
    renderBdfgPanel();
}

function getBdfgIconConfig(primaryKey, fallbackKey = '', literalFallback = '', defaultColor = '#5f7392', defaultSize = 20) {
    const primarySuffix = toIconSuffix(primaryKey);
    const fallbackSuffix = fallbackKey ? toIconSuffix(fallbackKey) : '';
    const value = firstFilled(
        loadedConfig?.icons?.[primaryKey],
        fallbackKey ? loadedConfig?.icons?.[fallbackKey] : '',
        literalFallback
    );
    const color = firstFilled(
        loadedConfig?.general?.[`iconColor${primarySuffix}`],
        fallbackSuffix ? loadedConfig?.general?.[`iconColor${fallbackSuffix}`] : '',
        defaultColor
    );
    const hoverColor = firstFilled(
        loadedConfig?.general?.[`iconColorHover${primarySuffix}`],
        fallbackSuffix ? loadedConfig?.general?.[`iconColorHover${fallbackSuffix}`] : '',
        color
    );
    const size = Number(firstFilled(
        loadedConfig?.general?.[`iconSize${primarySuffix}`],
        fallbackSuffix ? loadedConfig?.general?.[`iconSize${fallbackSuffix}`] : '',
        defaultSize
    )) || defaultSize;
    return { value, color, hoverColor, size };
}

function getBdfgMainIconConfig() {
    const config = getBdfgIconConfig('dashboardFabMain', '', '+', '#ffffff', 34);
    return {
        iconMarkup: iconMarkup(config.value, 'Botón flotante', 'dashboard-bdfg-main-icon'),
        color: config.color,
        hoverColor: config.hoverColor,
        size: config.size
    };
}

function renderBdfgRadialMenu() {
    if (!bdfgRadialBridge) return;
    const { globalActions, contextualActions } = getBdfgActions();
    const effectiveConfig = getEffectiveBdfgConfig();
    const currentFavorite = getActiveFavoritePayload();
    const favoriteActive = currentFavorite ? isFavoriteRoute(currentFavorite.route) : false;
    const currentTheme = window.PrintLabTheme?.current?.().mode || document.documentElement.dataset.themeMode || 'light';
    const currentColorMode = effectiveConfig.colorMode === 'day' || effectiveConfig.colorMode === 'night'
        ? effectiveConfig.colorMode
        : ((document.documentElement?.dataset?.theme === 'dark') || currentTheme === 'dark' ? 'night' : 'day');
    const radialBackground = currentColorMode === 'night'
        ? bdfgColorWithAlpha(
            effectiveConfig.miniBgNight,
            effectiveConfig.miniBgNightAlpha,
            effectiveConfig.miniBgNight || effectiveConfig.miniBg || '#ffffff'
        )
        : bdfgColorWithAlpha(
            effectiveConfig.miniBg,
            effectiveConfig.miniBgAlpha,
            effectiveConfig.miniBg || '#ffffff'
        );
    
    const actionIconsMap = {
        'toggle-favorite': favoriteActive
            ? { key: 'dashboardFabToggleFavoriteActive', fallback: 'favoriteDocumentOn', color: '#c79b18', size: 20 }
            : { key: 'dashboardFabToggleFavorite', fallback: 'favoriteDocumentOff', color: '#a2aab5', size: 20 },
        favorites: { key: 'dashboardFabFavorites', fallback: 'favoriteDocumentOn' },
        notifications: bdfgUnreadCount > 0
            ? { key: 'dashboardFabNotificationsActive', fallback: 'processLauncher', color: '#ef4444', size: 20 }
            : { key: 'dashboardFabNotifications', fallback: 'processLauncher', color: '#0b81b8', size: 20 },
        search: { key: 'dashboardFabSearch', literalFallback: '🔍', color: '#5f7392', size: 20 },
        'tu-actividad': { key: 'dashboardFabVendorActivity', literalFallback: '📈', color: '#0b81b8', size: 20 },
        profile: { key: 'topUser', literalFallback: '◔', color: '#9ba2ab', size: 20 },
        theme: currentTheme === 'dark'
            ? { key: 'dashboardFabThemeDark', literalFallback: '☀', color: '#f59e0b', size: 20 }
            : { key: 'dashboardFabTheme', literalFallback: '☾', color: '#5f7392', size: 20 },
        'toggle-vendor-view': viewAsVendorMode
            ? { key: 'dashboardFabVendorViewActive', literalFallback: '🧑‍💼', color: '#c79b18', size: 20 }
            : { key: 'dashboardFabVendorView', literalFallback: '👁', color: '#5f7392', size: 20 },
        'open-context-document': { key: 'dashboardFabContextDocument', fallback: 'browserOpen', color: '#0b81b8', size: 20 },
        'open-context-secondary': { key: 'dashboardFabContextSecondary', fallback: 'browserOpen', color: '#0b81b8', size: 20 },
        'open-quote-proforma': { key: 'dashboardFabQuoteProforma', fallback: 'proformaView', color: '#0b81b8', size: 20 },
        'view-context-status': { key: 'dashboardFabStatus', literalFallback: '📊' },
        'open-trazabilidad': { key: 'dashboardFabTrazabilidad', literalFallback: '🧭', color: '#0b81b8', size: 20 },
        'calc-processes': { key: 'dashboardFabQuoteCalculation', fallback: 'processLauncher', color: '#0b81b8', size: 20 },
        'open-quotes': { key: 'dashboardFabQuotes', fallback: 'dashboardQuotes', color: '#0b81b8', size: 20 },
        'open-products': { key: 'dashboardFabProducts', fallback: 'dashboardProducts', color: '#0b81b8', size: 20 },
        'open-orders': { key: 'dashboardFabOrders', fallback: 'dashboardOrders', color: '#0b81b8', size: 20 },
        'open-inventory-menu': { key: 'dashboardFabInventory', fallback: 'dashboardInventory', color: '#0b81b8', size: 20 },
        'open-settings': { key: 'dashboardFabSettings', fallback: 'dashboardSettings', color: '#0b81b8', size: 20 },
        'open-planning': { key: 'dashboardFabPlanning', fallback: 'dashboardPlanning', color: '#0b81b8', size: 20 },
        'open-costs': { key: 'dashboardFabCosts', fallback: 'dashboardCosts', color: '#0b81b8', size: 20 },
        'report-quality-incident': { key: 'dashboardCalidad', fallback: 'dashboardCalidad', literalFallback: '⚠', color: '#ba3535', size: 20 }
    };
    
    const mergedActions = [...globalActions, ...contextualActions];
    const allActions = mergedActions.slice(0, 8);
    const calcProcessesAction = mergedActions.find((action) => action.id === 'calc-processes');
    if (calcProcessesAction && !allActions.some((action) => action.id === 'calc-processes')) {
        allActions.push(calcProcessesAction);
    }
    const trazabilidadAction = mergedActions.find((action) => action.id === 'open-trazabilidad');
    if (trazabilidadAction && !allActions.some((action) => action.id === 'open-trazabilidad')) {
        allActions.push(trazabilidadAction);
    }
    const radialItems = allActions.map((action) => {
        const mapping = actionIconsMap[action.id] || { key: 'dashboardFabSearch', literalFallback: '🔍', color: '#5f7392', size: 20 };
        const iconConfig = getBdfgIconConfig(
            mapping.key,
            mapping.fallback || '',
            mapping.literalFallback || mapping.fallback || '',
            mapping.color || '#5f7392',
            mapping.size || 20
        );

        return {
            id: action.id,
            label: action.label,
            badge: action.badge ? escapeHtml(action.badge) : '',
            color: iconConfig.color,
            hoverColor: iconConfig.hoverColor,
            background: radialBackground,
            size: iconConfig.size,
            iconMarkup: iconMarkup(iconConfig.value, action.label, 'dashboard-bdfg-mini-icon')
        };
    });
    bdfgComponent?.renderItems(radialItems);
}

function toIconSuffix(key) {
    if (!key) return '';
    return key.charAt(0).toUpperCase() + key.slice(1);
}

async function loadBdfgNotifications() {
    try {
        const headers = sessionHeaders();
        const response = await fetch(NOTIFICATION_THREADS_ENDPOINT, { headers });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No fue posible cargar notificaciones.');
        bdfgNotificationThreads = Array.isArray(payload.items) ? payload.items : [];
        if (!bdfgNotificationThreads.some((thread) => thread.threadCode === bdfgNotificationSelectedThreadCode)) {
            bdfgNotificationSelectedThreadCode = bdfgNotificationThreads[0]?.threadCode || '';
            bdfgNotificationMessages = [];
        }
        bdfgUnreadCount = bdfgNotificationThreads.reduce((total, item) => total + Number(item?.unreadCount || 0), 0);
    } catch (error) {
        bdfgNotificationThreads = [];
        bdfgUnreadCount = 0;
    }
    renderBdfg();
}

async function loadBdfgUserProfile() {
    try {
        const response = await fetch(BDFG_PROFILE_ENDPOINT, { headers: sessionHeaders() });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el perfil.');
        bdfgUserProfile = payload || {};
    } catch (error) {
        bdfgUserProfile = null;
    }
    renderBdfg();
}

function updateBdfgPlacement(triggerEl = null) {
    bdfgComponent?.updatePlacement(triggerEl);
}

function setBdfgOpen(open, nextMode = bdfgMode, triggerEl = null) {
    if (!bdfgShell || !bdfgButton) return;
    bdfgMode = nextMode;
    
    const willOpenRadial = open;
    const willShowPanel = open && nextMode !== 'actions';
    
    bdfgComponent?.setOpen(willOpenRadial);

    if (bdfgComponent) {
        bdfgComponent.showBridge(willShowPanel);
    } else if (bdfgBridge) {
        bdfgBridge.hidden = !willShowPanel;
    }

    if (open) {
        updateBdfgPlacement(triggerEl);
        loadBdfgNotifications()
            .then(() => {
                if (nextMode === 'notifications' && bdfgNotificationSelectedThreadCode) {
                    return loadBdfgNotificationThread(bdfgNotificationSelectedThreadCode);
                }
                return null;
            })
            .catch(() => {});
        if (willShowPanel) renderBdfgPanel();
    }
}

function clampBdfgPosition(left, top) {
    if (bdfgComponent) return bdfgComponent.clampPosition(left, top);
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    const height = window.innerHeight || document.documentElement.clientHeight || 720;
    const shellWidth = bdfgShell?.offsetWidth || 58;
    const shellHeight = bdfgShell?.offsetHeight || 58;
    return {
        x: Math.min(Math.max(8, left), Math.max(8, width - shellWidth - 8)),
        y: Math.min(Math.max(8, top), Math.max(8, height - shellHeight - 8))
    };
}

function applyBdfgPosition(position) {
    if (bdfgComponent) {
        bdfgComponent.applyPosition(position);
        if (searchPopover && !searchPopover.hidden) positionSearchPopover();
        return;
    }
    if (!bdfgShell) return;
    const next = clampBdfgPosition(Number(position?.x || 14), Number(position?.y || 140));
    bdfgShell.style.left = `${next.x}px`;
    bdfgShell.style.top = `${next.y}px`;
    bdfgShell.style.right = 'auto';
    bdfgShell.style.bottom = 'auto';
    updateBdfgPlacement();
    if (searchPopover && !searchPopover.hidden) positionSearchPopover();
}

function saveBdfgPosition(position) {
    try {
        localStorage.setItem(BDFG_POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch (error) {
        return;
    }
}

function loadBdfgPosition() {
    try {
        const saved = JSON.parse(localStorage.getItem(BDFG_POSITION_STORAGE_KEY) || 'null');
        if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
            applyBdfgPosition(saved);
            return;
        }
    } catch (error) {
        return;
    }
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    const centerX = width / 2;
    applyBdfgPosition({ x: centerX + 480, y: 240 });
}

function applyBdfgGlobalPreview(previewConfig) {
    bdfgPreviewGlobal = previewConfig && typeof previewConfig === 'object' ? { ...previewConfig } : null;
    renderBdfg();
}

function applyBdfgProfilePreview(previewConfig) {
    bdfgPreviewProfile = previewConfig && typeof previewConfig === 'object' ? { ...previewConfig } : null;
    renderBdfg();
}

function closeQuickQualityIncidentModal() {
    document.getElementById('fabQuickIncidentOverlay')?.remove();
}

function openQuickQualityIncidentModal() {
    closeQuickQualityIncidentModal();
    const session = getStoredSession();
    const overlay = document.createElement('div');
    overlay.id = 'fabQuickIncidentOverlay';
    overlay.className = 'fab-quick-incident-overlay';
    overlay.innerHTML = `
        <div class="fab-quick-incident-modal">
            <div class="fab-quick-incident-title">Reportar Incidencia de Calidad</div>
            <label class="fab-quick-incident-field"><span>Cliente</span><input type="text" id="fqiCliente"></label>
            <label class="fab-quick-incident-field"><span>Producto</span><input type="text" id="fqiProducto" placeholder="P-000005"></label>
            <label class="fab-quick-incident-field"><span>Orden de Producción</span><input type="text" id="fqiOrden" placeholder="OP-000009"></label>
            <label class="fab-quick-incident-field"><span>Medio de Recepción</span>
                <select id="fqiMedio"><option value="">—</option></select>
            </label>
            <label class="fab-quick-incident-field"><span>Prioridad</span>
                <select id="fqiPrioridad">
                    <option value="baja">Baja</option>
                    <option value="media" selected>Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                </select>
            </label>
            <label class="fab-quick-incident-field"><span>Descripción del Problema</span><textarea id="fqiDescripcion"></textarea></label>
            <label class="fab-quick-incident-field"><span>Observaciones</span><textarea id="fqiObservaciones"></textarea></label>
            <label class="fab-quick-incident-field"><span>Evidencia (opcional)</span><input type="file" id="fqiArchivo"></label>
            <div class="fab-quick-incident-actions">
                <button type="button" class="action-btn action-btn-primary" id="fqiGuardar">Guardar Incidencia</button>
                <button type="button" class="action-btn" id="fqiCancelar">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeQuickQualityIncidentModal(); });
    document.getElementById('fqiCancelar').addEventListener('click', closeQuickQualityIncidentModal);

    fetch('/api/calidad/incidencias/medios-recepcion').then((r) => r.json()).then((medios) => {
        const select = document.getElementById('fqiMedio');
        (medios || []).forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.codigo;
            opt.textContent = m.nombre;
            select.appendChild(opt);
        });
    }).catch(() => {});

    document.getElementById('fqiGuardar').addEventListener('click', async () => {
        const descripcion = document.getElementById('fqiDescripcion').value.trim();
        if (!descripcion) { alert('Describa el problema reportado por el cliente.'); return; }
        const boton = document.getElementById('fqiGuardar');
        boton.disabled = true;
        try {
            const payload = {
                origen: 'ventas',
                medio_recepcion: document.getElementById('fqiMedio').value || null,
                prioridad: document.getElementById('fqiPrioridad').value,
                descripcion,
                observaciones_iniciales: document.getElementById('fqiObservaciones').value.trim() || null,
                cliente_nombre: document.getElementById('fqiCliente').value.trim() || null,
                producto_codigo: document.getElementById('fqiProducto').value.trim() || null,
                orden_produccion_codigo: document.getElementById('fqiOrden').value.trim() || null,
                creado_por_user_id: session?.id || null,
                creado_por_nombre: session?.name || null,
                departamento_origen: session?.department || 'Ventas'
            };
            const response = await fetch('/api/calidad/incidencias', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.error || 'No fue posible registrar la incidencia.');

            const archivo = document.getElementById('fqiArchivo').files[0];
            if (archivo) {
                const base64 = await new Promise((resolve, reject) => {
                    const lector = new FileReader();
                    lector.onload = () => resolve(String(lector.result).split(',')[1] || '');
                    lector.onerror = reject;
                    lector.readAsDataURL(archivo);
                });
                await fetch(`/api/calidad/incidencias/${encodeURIComponent(resultado.codigo)}/adjuntos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_name: archivo.name, content_base64: base64, tipo_evidencia: 'foto' })
                }).catch(() => {});
            }

            closeQuickQualityIncidentModal();
            alert(`Incidencia ${resultado.codigo} registrada. Calidad la revisará en su bandeja.`);
        } catch (error) {
            alert(error.message || 'No fue posible registrar la incidencia.');
        } finally {
            boton.disabled = false;
        }
    });
}

function handleBdfgAction(actionId, triggerEl = null) {
    const { globalActions, contextualActions } = getBdfgActions();
    const action = [...globalActions, ...contextualActions].find((item) => item.id === actionId);
    if (!action) return;
    if (action.mode) {
        // Toggle behavior: if already open in this mode, close it
        if (bdfgComponent?.open && bdfgMode === action.mode) {
            setBdfgOpen(false, 'actions');
        } else {
            setBdfgOpen(true, action.mode, triggerEl);
            if (action.mode === 'notifications') loadBdfgNotifications().catch(() => {});
        }
        return;
    }
    if (action.route) {
        openTab(action.route, action.routeLabel || action.label || 'Documento');
        setBdfgOpen(false, 'actions');
        return;
    }
    if (typeof action.callback === 'function') {
        action.callback(triggerEl);
    }
}

function bindBdfg() {
    if (!bdfgButton || !bdfgBridge || !bdfgPanel || !bdfgShell) return;
    if (!bdfgComponent && window.DashboardFloatingButton) {
        bdfgComponent = new window.DashboardFloatingButton({
            shell: bdfgShell,
            button: bdfgButton,
            icon: bdfgIcon,
            badge: bdfgBadge,
            radialBridge: bdfgRadialBridge,
            bridge: bdfgBridge,
            panel: bdfgPanel,
            closeButton: bdfgCloseButton
        });
        bdfgComponent.onToggle((open) => setBdfgOpen(open, 'actions'));
        bdfgComponent.onAction((actionId, triggerEl) => handleBdfgAction(actionId, triggerEl));
        bdfgComponent.onClose(() => setBdfgOpen(false, 'actions'));
        bdfgComponent.onPosition((position) => saveBdfgPosition(position));
    }

    bdfgBridge.addEventListener('pointerdown', startBdfgFavoritesPanelDrag);
    bdfgBridge.addEventListener('pointermove', moveBdfgFavoritesPanelDrag);
    bdfgBridge.addEventListener('pointerup', finishBdfgFavoritesPanelDrag);
    bdfgBridge.addEventListener('pointercancel', finishBdfgFavoritesPanelDrag);

    bdfgPanel.addEventListener('click', (event) => {
        const actionButton = event.target.closest('[data-bdfg-action]');
        if (actionButton) {
            event.preventDefault();
            event.stopPropagation();
            handleBdfgAction(actionButton.dataset.bdfgAction, actionButton);
            return;
        }
        const openFavoriteButton = event.target.closest('[data-bdfg-open-favorite]');
        if (openFavoriteButton) {
            event.preventDefault();
            event.stopPropagation();
            openTab(openFavoriteButton.dataset.bdfgOpenFavorite, openFavoriteButton.dataset.bdfgOpenLabel || 'Documento');
            setBdfgOpen(false, 'actions');
            return;
        }
        const removeFavoriteButton = event.target.closest('[data-bdfg-remove-favorite]');
        if (removeFavoriteButton) {
            event.preventDefault();
            event.stopPropagation();
            const routeKey = normalizeFavoriteRouteKey(removeFavoriteButton.dataset.bdfgRemoveFavorite);
            writeFavoriteDocuments(readFavoriteDocuments().filter((item) => normalizeFavoriteRouteKey(item.route) !== routeKey));
            renderBdfgFavoritesPanel();
            renderBdfg();
            return;
        }
        const openSearchRouteButton = event.target.closest('[data-bdfg-open-search-route]');
        if (openSearchRouteButton) {
            event.preventDefault();
            event.stopPropagation();
            openTab(openSearchRouteButton.dataset.bdfgOpenSearchRoute, openSearchRouteButton.dataset.bdfgOpenSearchLabel || 'Documento');
            setBdfgOpen(false, 'actions');
            return;
        }
        if (event.target.closest('[data-bdfg-open-notifications]')) {
            event.preventDefault();
            event.stopPropagation();
            openTab('/notificaciones.html', 'Notificaciones');
            setBdfgOpen(false, 'actions');
            return;
        }
        const threadButton = event.target.closest('[data-bdfg-thread-code]');
        if (threadButton) {
            event.preventDefault();
            event.stopPropagation();
            loadBdfgNotificationThread(threadButton.dataset.bdfgThreadCode || '').catch(() => {});
            return;
        }
        const chatForm = event.target.closest('[data-bdfg-chat-form]');
        if (chatForm) {
            event.preventDefault();
            event.stopPropagation();
            sendBdfgChatMessage().catch(() => {});
            return;
        }
        if (event.target.closest('[data-bdfg-refresh-notifications]')) {
            event.preventDefault();
            event.stopPropagation();
            loadBdfgNotifications().catch(() => {});
        }
    });
    bdfgPanel.addEventListener('submit', (event) => {
        const chatForm = event.target.closest('[data-bdfg-chat-form]');
        if (!chatForm) return;
        event.preventDefault();
        event.stopPropagation();
        sendBdfgChatMessage().catch(() => {});
    });
}

function closeBdfgIfOutside(target) {
    const isRadialActive = bdfgShell?.classList.contains('is-active');
    const isPanelVisible = bdfgBridge && !bdfgBridge.hidden;
    
    if (!isRadialActive && !isPanelVisible) return;
    if (bdfgShell?.contains(target)) return;
    
    setBdfgOpen(false, 'actions');
}

function getFavoriteDrumSettings() {
    const general = loadedConfig?.general || {};
    return {
        spacing: Number(general.favoriteDrumSpacing) || 19,
        radius: Number(general.favoriteDrumRadius) || 88,
        blur: Number(general.favoriteDrumBlur) || 2.5,
        contrast: Number(general.favoriteDrumContrast) || 8,
        fontBoost: Number(general.favoriteDrumFontBoost) || 3,
        shadowOpacity: Number(general.favoriteDrumShadowOpacity) || 45,
        shadowBlur: Number(general.favoriteDrumShadowBlur) || 5,
        shadowOffsetY: Number(general.favoriteDrumShadowOffsetY) || 2,
        shadowColor: general.favoriteDrumShadowColor || '#000000',
        height: Number(general.favoriteDrumHeight) || 220
    };
}

function hexToRgbTuple(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return [0, 0, 0];
    return [rgb.r, rgb.g, rgb.b];
}

function normalizeFavoriteAngle(angle) {
    let result = angle;
    while (result > Math.PI) result -= Math.PI * 2;
    while (result < -Math.PI) result += Math.PI * 2;
    return result;
}

function drawFavoriteDrum(state) {
    if (!state?.favorites?.length) return;
    const settings = getFavoriteDrumSettings();
    const width = Math.max(state.viewport.clientWidth || 0, 320);
    const height = Math.max(settings.height, 180);
    state.viewport.style.setProperty('--favorite-drum-height', `${height}px`);
    if (state.canvas.width !== width) state.canvas.width = width;
    if (state.canvas.height !== height) state.canvas.height = height;
    if (state.offscreen.width !== width) state.offscreen.width = width;
    if (state.offscreen.height !== height) state.offscreen.height = height;

    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = settings.spacing / 100;
    const front = -Math.PI / 2;
    const ctx = state.ctx;
    const octx = state.offscreenCtx;
    ctx.clearRect(0, 0, width, height);

    const entries = state.favorites.map((item, index) => {
        const angle = front + (index * spacing) + state.offset;
        const norm = normalizeFavoriteAngle(angle - front);
        const rawZ = Math.cos(norm);
        const y = centerY + (settings.radius * Math.sin(norm));
        state.smoothZ[index] += (rawZ - state.smoothZ[index]) * 0.16;
        return { item, index, z: state.smoothZ[index], y };
    });

    let activeIndex = 0;
    entries.forEach((entry, index) => {
        if (entry.z > entries[activeIndex].z) activeIndex = index;
    });
    state.activeIndex = activeIndex;

    const [sr, sg, sb] = hexToRgbTuple(settings.shadowColor);
    [...entries].sort((left, right) => left.z - right.z).forEach(({ item, index, z, y }) => {
        if (z <= 0.01) return;
        const frontness = Math.max(0, Math.min(1, z));
        const isActive = index === activeIndex;
        const shaped = isActive ? 1 : Math.pow(frontness, settings.contrast * 0.5);
        const alpha = isActive ? 1 : shaped;
        const blur = isActive ? 0 : settings.blur * (1 - Math.pow(frontness, 2));
        const fontSize = isActive ? 14 + settings.fontBoost : 12 + (2 * frontness);
        const tone = isActive ? 24 : Math.round(40 + (168 * (1 - shaped)));
        const label = item.displayLabel || item.label || item.quoteCode || item.id || 'Favorito';

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${isActive ? '700' : '500'} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
        ctx.fillStyle = `rgb(${tone}, ${tone + 8}, ${tone + 16})`;

        if (isActive) {
            ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, ${settings.shadowOpacity / 100})`;
            ctx.shadowBlur = settings.shadowBlur;
            ctx.shadowOffsetY = settings.shadowOffsetY;
            ctx.fillText(label, centerX, y);
        } else if (blur > 0.35) {
            octx.clearRect(0, 0, width, height);
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';
            octx.font = `${isActive ? '700' : '500'} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
            octx.fillStyle = `rgb(${tone}, ${tone + 8}, ${tone + 16})`;
            octx.fillText(label, centerX, y);
            ctx.filter = `blur(${blur.toFixed(1)}px)`;
            ctx.drawImage(state.offscreen, 0, 0);
            ctx.filter = 'none';
        } else {
            ctx.fillText(label, centerX, y);
        }
        ctx.restore();
    });

}

function animateFavoriteDrum() {
    if (!favoriteDrumState) return;
    const state = favoriteDrumState;
    state.velocity *= 0.84;
    const delta = state.targetOffset - state.offset;
    state.offset += (delta * 0.16) + state.velocity;
    drawFavoriteDrum(state);
    if (Math.abs(delta) < 0.0008 && Math.abs(state.velocity) < 0.0008) {
        state.offset = state.targetOffset;
        state.velocity = 0;
        state.animationFrame = null;
        drawFavoriteDrum(state);
        return;
    }
    state.animationFrame = requestAnimationFrame(animateFavoriteDrum);
}

function queueFavoriteDrumAnimation() {
    if (!favoriteDrumState || favoriteDrumState.animationFrame) return;
    favoriteDrumState.animationFrame = requestAnimationFrame(animateFavoriteDrum);
}

function nudgeFavoriteDrum(direction) {
    if (!favoriteDrumState?.favorites?.length) return;
    const spacing = getFavoriteDrumSettings().spacing / 100;
    favoriteDrumState.targetOffset += direction * spacing;
    queueFavoriteDrumAnimation();
}

function openFavoriteDrumActiveDocument() {
    if (!favoriteDrumState?.favorites?.length) return;
    const active = favoriteDrumState.favorites[favoriteDrumState.activeIndex];
    if (!active?.route) return;
    if (!canViewRoute(active.route)) {
        showAccessDeniedNotice(active.label || active.displayLabel || 'este documento');
        return;
    }
    openTab(active.route, active.label || active.displayLabel || 'Documento');
}

function mountFavoriteDrum(favorites) {
    favoritesBody.innerHTML = `
        <div class="dashboard-favorites-drum-shell">
            <div class="dashboard-favorites-drum-viewport" id="dashboardFavoritesViewport">
                <canvas id="dashboardFavoritesCanvas" class="dashboard-favorites-drum-canvas"></canvas>
            </div>
        </div>
    `;
    const viewport = document.getElementById('dashboardFavoritesViewport');
    const canvas = document.getElementById('dashboardFavoritesCanvas');
    if (!viewport || !canvas) return;

    favoriteDrumState = {
        viewport,
        canvas,
        ctx: canvas.getContext('2d'),
        offscreen: document.createElement('canvas'),
        offscreenCtx: null,
        favorites,
        offset: 0,
        targetOffset: 0,
        velocity: 0,
        smoothZ: new Array(favorites.length).fill(0),
        activeIndex: 0,
        animationFrame: null,
        dragPointerId: null,
        dragStartY: 0,
        dragStartOffset: 0
    };
    favoriteDrumState.offscreenCtx = favoriteDrumState.offscreen.getContext('2d');

    viewport.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) < 1) return;
        event.preventDefault();
        nudgeFavoriteDrum(event.deltaY > 0 ? -1 : 1);
    }, { passive: false });

    viewport.addEventListener('pointerdown', (event) => {
        favoriteDrumState.dragPointerId = event.pointerId;
        favoriteDrumState.dragStartY = event.clientY;
        favoriteDrumState.dragStartOffset = favoriteDrumState.targetOffset;
        viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener('pointermove', (event) => {
        if (!favoriteDrumState || favoriteDrumState.dragPointerId !== event.pointerId) return;
        const spacing = getFavoriteDrumSettings().spacing / 100;
        favoriteDrumState.targetOffset = favoriteDrumState.dragStartOffset + (((event.clientY - favoriteDrumState.dragStartY) / 42) * spacing);
        queueFavoriteDrumAnimation();
    });

    const finishDrag = (event) => {
        if (!favoriteDrumState || favoriteDrumState.dragPointerId !== event.pointerId) return;
        favoriteDrumState.dragPointerId = null;
        const spacing = getFavoriteDrumSettings().spacing / 100;
        favoriteDrumState.targetOffset = Math.round(favoriteDrumState.targetOffset / spacing) * spacing;
        queueFavoriteDrumAnimation();
    };
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('click', (event) => {
        if (!favoriteDrumState?.favorites?.length || favoriteDrumState.activeIndex >= favoriteDrumState.favorites.length) return;
        
        const canvas = favoriteDrumState.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const settings = getFavoriteDrumSettings();
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const spacing = settings.spacing / 100;
        const front = -Math.PI / 2;
        
        const activeItem = favoriteDrumState.favorites[favoriteDrumState.activeIndex];
        const angle = front + (favoriteDrumState.activeIndex * spacing) + favoriteDrumState.offset;
        const norm = normalizeFavoriteAngle(angle - front);
        const itemY = centerY + (settings.radius * Math.sin(norm));
        
        const ctx = favoriteDrumState.ctx;
        const label = activeItem.displayLabel || activeItem.label || activeItem.quoteCode || activeItem.id || 'Favorito';
        ctx.font = `700 ${14 + settings.fontBoost}px "Trebuchet MS", "Segoe UI", sans-serif`;
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 14 + settings.fontBoost;
        
        const textLeft = centerX - (textWidth / 2);
        const textRight = centerX + (textWidth / 2);
        const textTop = itemY - (textHeight / 2);
        const textBottom = itemY + (textHeight / 2);
        
        const clickX = (x / rect.width) * width;
        const clickY = (y / rect.height) * height;
        
        if (clickX >= textLeft && clickX <= textRight && clickY >= textTop && clickY <= textBottom) {
            openFavoriteDrumActiveDocument();
        }
    });

    drawFavoriteDrum(favoriteDrumState);
}

function renderFavoriteDocuments() {
    if (!favoritesPanel || !favoritesBody) return;
    const favorites = readFavoriteDocuments()
        .filter((item) => canViewRoute(item.route))
        .map((item) => ({
            ...item,
            displayLabel: [item.quoteCode || item.id, item.customerName, item.jobName].filter(Boolean).join('  |  ')
        }))
        .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
        .slice(0, 12);

    favoritesPanel.hidden = !favorites.length;
    if (!favorites.length) {
        favoritesBody.innerHTML = '<div class="dashboard-favorites-empty">Todavía no tienes documentos favoritos.</div>';
        return;
    }

    mountFavoriteDrum(favorites);
    return;

    favoritesBody.innerHTML = `
        <div class="dashboard-favorites-reel" id="dashboardFavoritesReel">
            ${favorites.map((item) => `
                <button type="button" class="dashboard-favorites-item" data-route="${escapeHtml(item.route)}" data-label="${escapeHtml(item.label || `Cotización ${item.quoteCode || ''}`)}">
                    <span class="dashboard-favorites-item-text">
                        <strong>${escapeHtml(item.quoteCode || item.id)}</strong>
                        <span>${escapeHtml(item.customerName || 'Sin cliente')}</span>
                        <em>${escapeHtml(item.jobName || 'Sin trabajo')}</em>
                    </span>
                </button>
            `).join('')}
        </div>
    `;
    applyFavoriteReelEffect();
}

function applyFavoriteReelEffect() {
    const reel = document.getElementById('dashboardFavoritesReel');
    if (!reel) return;
    const items = [...reel.querySelectorAll('.dashboard-favorites-item')];
    const reelRect = reel.getBoundingClientRect();
    const center = reelRect.top + (reel.clientHeight / 2);
    const maxDistance = Math.max(reel.clientHeight / 2, 1);
    let closestItem = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + (rect.height / 2);
        const distance = itemCenter - center;
        const ratio = Math.max(-1, Math.min(1, distance / maxDistance));
        const abs = Math.abs(ratio);
        if (abs < closestDistance) {
            closestDistance = abs;
            closestItem = item;
        }
        const rotateX = ratio * -52;
        const translateY = ratio * -10;
        const scale = 1 - (abs * 0.24);
        const opacity = 1 - (abs * 0.62);
        const textScale = 0.74 + ((1 - abs) * 0.42);
        const tone = Math.round(126 - ((1 - abs) * 76));
        item.style.transform = `perspective(1200px) rotateX(${rotateX}deg) translateY(${translateY}px) scale(${scale})`;
        item.style.opacity = `${Math.max(0.18, opacity)}`;
        item.style.filter = `saturate(${1 - (abs * 0.3)}) blur(${abs * 0.6}px)`;
        item.style.setProperty('--reel-text-scale', textScale.toFixed(3));
        item.style.setProperty('--reel-text-color', `rgb(${tone}, ${tone + 8}, ${tone + 18})`);
        item.classList.remove('is-center');
    });
    if (closestItem) closestItem.classList.add('is-center');
}

function triggerFavoriteReelBounce(reel, direction) {
    if (!reel) return;
    if (favoriteReelBounceTimer) {
        clearTimeout(favoriteReelBounceTimer);
        favoriteReelBounceTimer = null;
    }
    reel.classList.remove('is-bounce-top', 'is-bounce-bottom');
    reel.classList.add(direction === 'top' ? 'is-bounce-top' : 'is-bounce-bottom');
    favoriteReelBounceTimer = setTimeout(() => {
        reel.classList.remove('is-bounce-top', 'is-bounce-bottom');
        favoriteReelBounceTimer = null;
    }, 240);
}

function ensureSearchPopover() {
    if (searchPopover) return;
    searchPopover = document.createElement('div');
    searchPopover.className = 'dashboard-search-popover';
    searchPopover.hidden = true;
    searchPopover.innerHTML = `
        <input type="search" class="dashboard-search-input" placeholder="Buscar orden, cotizacion, cliente o producto">
        <div class="dashboard-search-help">Busca por orden, cotizacion, cliente o nombre de producto y abre el resultado desde aqui.</div>
        <div class="dashboard-search-results">
            <div class="dashboard-search-empty">Escribe algo para buscar.</div>
        </div>
    `;
    document.body.appendChild(searchPopover);
    searchInput = searchPopover.querySelector('.dashboard-search-input');
    searchResults = searchPopover.querySelector('.dashboard-search-results');

    searchInput?.addEventListener('input', () => {
        runDashboardSearch(searchInput.value);
    });

    searchResults?.addEventListener('click', (event) => {
        const item = event.target.closest('[data-route]');
        if (!item) return;
        openTab(item.dataset.route, item.dataset.label || item.dataset.code || 'Documento');
        closeSearchPopover();
    });
}

function closeSearchPopover() {
    if (searchPopover) {
        searchPopover.hidden = true;
        searchPopover.style.visibility = '';
    }
    searchPopoverAnchor = null;
}

function ensureInventoryPopover() {
    if (inventoryPopover) return;
    inventoryPopover = document.createElement('div');
    inventoryPopover.className = 'dashboard-inventory-popover';
    inventoryPopover.hidden = true;
    const inventoryItems = getVisibleInventoryOptions();
    inventoryPopover.innerHTML = `
        <div class="dashboard-inventory-head">
            <div class="dashboard-inventory-title">Inventarios</div>
            <div class="dashboard-inventory-help">Selecciona el inventario que quieres abrir.</div>
        </div>
        <div class="dashboard-inventory-list">
            ${inventoryItems.length ? inventoryItems.map((item) => `
                <button type="button" class="dashboard-inventory-item" data-route="${escapeHtml(item.route)}" data-label="${escapeHtml(item.label)}">
                    ${escapeHtml(item.label)}
                </button>
            `).join('') : '<div class="dashboard-inventory-empty">No tienes inventarios asignados.</div>'}
        </div>
    `;
    document.body.appendChild(inventoryPopover);

    inventoryPopover.addEventListener('click', (event) => {
        const option = event.target.closest('[data-route]');
        if (!option) return;
        if (!canViewRoute(option.dataset.route)) {
            showAccessDeniedNotice(option.dataset.label || 'este inventario');
            return;
        }
        openTab(option.dataset.route, option.dataset.label || 'Inventario');
        closeInventoryPopover();
    });
}

function closeInventoryPopover() {
    if (inventoryPopover) inventoryPopover.hidden = true;
}

function positionInventoryPopover(anchorEl) {
    if (!inventoryPopover || inventoryPopover.hidden) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
    const margin = 12;

    let top, left;

    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const popoverWidth = inventoryPopover.offsetWidth || 360;
        const popoverHeight = inventoryPopover.offsetHeight || 200;

        left = rect.left;
        if (left + popoverWidth > viewportWidth - margin) {
            left = Math.max(margin, viewportWidth - popoverWidth - margin);
        }

        const fitsBelow = rect.bottom + 8 + popoverHeight <= viewportHeight - margin;
        top = fitsBelow
            ? rect.bottom + 8
            : Math.max(margin, rect.top - popoverHeight - 8);
    } else {
        left = Math.max(margin, (viewportWidth - 360) / 2);
        top = Math.max(margin, viewportHeight * 0.18);
    }

    inventoryPopover.style.left = `${left}px`;
    inventoryPopover.style.top = `${top}px`;
}

function renderSearchResults(items, term = '') {
    if (!searchResults) return;
    if (!term.trim()) {
        searchResults.innerHTML = '<div class="dashboard-search-empty">Escribe algo para buscar.</div>';
        return;
    }
    if (!items.length) {
        searchResults.innerHTML = '<div class="dashboard-search-empty">No encontre resultados con ese texto.</div>';
        return;
    }
    searchResults.innerHTML = items.map((item) => `
        <button type="button" class="dashboard-search-item" data-route="${escapeHtml(item.route)}" data-label="${escapeHtml(item.label)}" data-code="${escapeHtml(item.code)}">
            <div class="dashboard-search-meta">
                <span class="dashboard-search-kind">${escapeHtml(item.kind)}</span>
                ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : ''}
            </div>
            <div class="dashboard-search-title">${escapeHtml(item.code)}</div>
            <div class="dashboard-search-subtitle">${escapeHtml(item.subtitle)}</div>
            ${item.details ? `<div class="dashboard-search-details">${escapeHtml(item.details)}</div>` : ''}
        </button>
    `).join('');
}

async function runDashboardSearch(term) {
    const search = String(term || '').trim();
    const token = ++searchRequestToken;
    if (!search) {
        if (bdfgMode === 'search') {
            renderBdfgSearchResults([], '');
        }
        renderSearchResults([], '');
        return;
    }

    if (bdfgMode === 'search') {
        renderBdfgSearchResults([], search);
        bdfgPanel.querySelector('.dashboard-bdfg-list').innerHTML = '<div class="dashboard-bdfg-empty">Buscando...</div>';
    }
    if (searchResults) {
        searchResults.innerHTML = '<div class="dashboard-search-empty">Buscando...</div>';
    }

    try {
        const quoteParams = new URLSearchParams({ q: search, limit: '12' });
        const orderParams = new URLSearchParams({ q: search, limit: '12' });
        const [quotesResponse, ordersResponse] = await Promise.all([
            fetch(`/api/cotizaciones-destino?${quoteParams.toString()}`),
            fetch(`/api/ordenes-produccion?${orderParams.toString()}`)
        ]);
        const quotesPayload = await quotesResponse.json();
        const ordersPayload = await ordersResponse.json();
        if (token !== searchRequestToken) return;
        if (!quotesResponse.ok) throw new Error(quotesPayload.error || 'No se pudieron cargar cotizaciones.');
        if (!ordersResponse.ok) throw new Error(ordersPayload.error || 'No se pudieron cargar ordenes.');

        const quoteItems = (quotesPayload.items || []).map((item) => ({
            kind: 'Cotizacion',
            code: item.quote_code,
            subtitle: [item.customer_name, item.job_name || item.product_name].filter(Boolean).join(' | ') || 'Sin detalle',
            details: [
                item.line_code ? `Linea ${item.line_code}` : '',
                item.salesperson_name ? `Vendedor: ${item.salesperson_name}` : '',
                item.machine_name ? `Maquina: ${item.machine_name}` : '',
                item.process_type ? `Proceso: ${item.process_type}` : '',
                item.material_name ? `Material: ${item.material_name}` : '',
                item.die_code ? `Troquel: ${item.die_code}` : ''
            ].filter(Boolean).join(' | '),
            meta: item.status || '',
            route: `/cotizaciones/documento?codigo=${encodeURIComponent(item.quote_code)}`,
            label: `Cotizacion ${item.quote_code}`
        }));

        const orderItems = (ordersPayload.items || []).map((item) => ({
            kind: 'Orden',
            code: item.order_code,
            subtitle: [item.customer_name, item.job_name || item.product_name].filter(Boolean).join(' | ') || 'Sin detalle',
            details: [
                item.line_code ? `Linea ${item.line_code}` : '',
                item.salesperson_name ? `Vendedor: ${item.salesperson_name}` : '',
                item.machine_name ? `Maquina: ${item.machine_name}` : '',
                item.process_type ? `Proceso: ${item.process_type}` : '',
                item.material_name ? `Material: ${item.material_name}` : '',
                item.die_code ? `Troquel: ${item.die_code}` : ''
            ].filter(Boolean).join(' | '),
            meta: item.quote_code ? `Cotizacion ${item.quote_code}` : '',
            route: `/orden-produccion/${encodeURIComponent(item.order_code)}`,
            label: `Orden ${item.order_code}`
        }));

        const finalItems = [...orderItems, ...quoteItems].filter((item) => canViewRoute(item.route)).slice(0, 20);
        if (bdfgMode === 'search') {
            renderBdfgSearchResults(finalItems, search);
        }
        renderSearchResults(finalItems, search);
    } catch (error) {
        if (token !== searchRequestToken) return;
        if (bdfgMode === 'search') {
            renderBdfgSearchResults([], search);
            const searchList = bdfgPanel?.querySelector('.dashboard-bdfg-list');
            if (searchList) {
                searchList.innerHTML = `<div class="dashboard-bdfg-empty">${escapeHtml(error.message || 'No se pudo realizar la búsqueda.')}</div>`;
            }
        }
        if (searchResults) {
            searchResults.innerHTML = `<div class="dashboard-search-empty">${escapeHtml(error.message || 'No se pudo realizar la busqueda.')}</div>`;
        }
    }
}

async function applyDashboardConfig(configOverride = null) {
    const hasOverride = configOverride && typeof configOverride === 'object';
    if (hasOverride) {
        applyDashboardConfigPayload(configOverride);
        const cacheableConfig = compactDashboardConfigForCache(configOverride);
        writeDashboardConfigCache(cacheableConfig);
        return;
    }
    const cachedConfig = readDashboardConfigCache();
    if (cachedConfig) {
        applyDashboardConfigPayload(cachedConfig);
    }
    try {
        const response = await fetch(CONFIG_ENDPOINT, { cache: 'no-cache' });
        if (!response.ok) return;
        const nextConfig = await response.json();
        const cacheableConfig = compactDashboardConfigForCache(nextConfig);
        // ANTES: solo repintaba si cacheableConfig !== cachedConfig
        // PROBLEMA: si el ícono grande se elimina en ambos, siempre parecen iguales
        // FIX: siempre aplicar nextConfig completo y actualizar caché
        writeDashboardConfigCache(cacheableConfig);
        applyDashboardConfigPayload(nextConfig);   // ← siempre repintar con datos frescos
    } catch (_) {}
}

function syncDashboardImageSource(image, nextUrl, altText = '') {
    if (!image) return;
    const cleanUrl = String(nextUrl || '').trim();
    if (!cleanUrl) {
        if (image.getAttribute('src')) image.removeAttribute('src');
        if (image.style.display !== 'none') image.style.display = 'none';
        if (altText && image.alt !== altText) image.alt = altText;
        return;
    }
    if (image.getAttribute('src') !== cleanUrl) image.setAttribute('src', cleanUrl);
    if (image.alt !== altText) image.alt = altText;
    if (image.style.display !== 'block') image.style.display = 'block';
}

function applyDashboardConfigPayload(config) {
    loadedConfig = config || {};
    const presentation = getPresentationConfig(loadedConfig, 'dashboard');
    const general = loadedConfig.general || {};
    const layout = loadedConfig.layout || {};
    const root = document.documentElement;

    const companyName = loadedConfig.branding?.companyName || loadedConfig.general?.companyName || 'PrintLab';
    const configuredTitle = String(presentation.moduleTitle || '').trim();
    const shellTitle = configuredTitle && configuredTitle.toLowerCase() !== 'dashboard'
        ? configuredTitle
        : companyName;
    homeTabLabel = 'PrintLab';
    tabs = tabs.map((tab) => tab.id === HOME_TAB_ID ? { ...tab, label: homeTabLabel, closable: false } : tab);

    pageTitle.textContent = shellTitle;
    root.style.setProperty('--header-bg-start', presentation.headerBgStart);
    root.style.setProperty('--header-bg-end', presentation.headerBgEnd);
    root.style.setProperty('--tab-color', presentation.tabColor);
    root.style.setProperty('--config-icon-size', `${presentation.iconSize}px`);
    root.style.setProperty('--page-margin-top', `${presentation.pageMarginTop}px`);
    root.style.setProperty('--page-margin-right', `${presentation.pageMarginRight}px`);
    root.style.setProperty('--page-margin-bottom', `${presentation.pageMarginBottom}px`);
    root.style.setProperty('--page-margin-left', `${presentation.pageMarginLeft}px`);
    root.style.setProperty('--logo-width', `${Number(layout.logoWidth) || 116}px`);
    root.style.setProperty('--brand-width', `${presentation.brandWidth}px`);
    root.style.setProperty('--brand-color', presentation.brandColor);
    root.style.setProperty('--brand-font-family', presentation.brandFontFamily);
    root.style.setProperty('--brand-font-size', `${presentation.brandFontSize}px`);
    root.style.setProperty('--brand-vertical-align', getFlexAlign(presentation.brandVerticalAlign, 'center'));
    root.style.setProperty('--brand-horizontal-align', getFlexAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-text-align', getTextAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-margin-top', `${presentation.brandMarginTop}px`);
    root.style.setProperty('--brand-margin-right', `${presentation.brandMarginRight}px`);
    root.style.setProperty('--brand-margin-bottom', `${presentation.brandMarginBottom}px`);
    root.style.setProperty('--brand-margin-left', `${presentation.brandMarginLeft}px`);
    root.style.setProperty('--title-margin-left', `${presentation.titleMarginLeft}px`);
    root.style.setProperty('--module-title-font-family', presentation.titleFontFamily);
    root.style.setProperty('--module-title-font-size', `${presentation.titleFontSize}px`);
    root.style.setProperty('--module-title-color', presentation.titleColor);
    root.style.setProperty('--module-title-horizontal-align', getFlexAlign(presentation.titleHorizontalAlign, 'flex-start'));
    root.style.setProperty('--module-title-text-align', getTextAlign(presentation.titleHorizontalAlign, 'left'));
    root.style.setProperty('--module-title-width', presentation.titleWidth ? `${presentation.titleWidth}px` : 'auto');
    root.style.setProperty('--footer-border-color', presentation.footerBorderColor);

    syncDashboardImageSource(companyLogo, presentation.brandLogoUrl, companyName);
    if (brandFallback) {
        brandFallback.textContent = companyName;
        brandFallback.style.display = presentation.brandLogoUrl ? 'none' : 'flex';
    }

    renderCards();
    renderTabs();
    renderFavoriteDocuments();
    renderBdfg();
    aplicarTransicionesCss();
    if (favoriteDrumState) {
        requestAnimationFrame(() => drawFavoriteDrum(favoriteDrumState));
    }
}

tabsContainer?.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-action="close-tab"]');
    if (closeTarget) {
        closeTab(closeTarget.dataset.tabId);
        return;
    }
    const tabButton = event.target.closest('[data-tab-id]');
    if (tabButton) {
        activateTab(tabButton.dataset.tabId);
    }
});

tabsContainer?.addEventListener('dragstart', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!tabButton || tabButton.dataset.tabId === HOME_TAB_ID) return;
    draggedTabId = tabButton.dataset.tabId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedTabId);
    tabButton.classList.add('is-dragging');
});

let dashboardResizeRenderTimer = 0;
window.addEventListener('resize', () => {
    window.clearTimeout(dashboardResizeRenderTimer);
    dashboardResizeRenderTimer = window.setTimeout(() => {
        renderCards();
    }, 120);
});

tabsContainer?.addEventListener('dragover', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!draggedTabId || !tabButton || tabButton.dataset.tabId === HOME_TAB_ID) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
});

tabsContainer?.addEventListener('drop', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!draggedTabId || !tabButton) return;
    event.preventDefault();
    moveTab(draggedTabId, tabButton.dataset.tabId);
    draggedTabId = null;
    renderTabs();
    renderBdfg();
});

tabsContainer?.addEventListener('dragend', (event) => {
    const draggedId = draggedTabId;
    draggedTabId = null;
    if (draggedId && draggedId !== HOME_TAB_ID) {
        const tab = tabs.find((item) => item.id === draggedId);
        const bar = tabsBar?.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        const droppedOutside = !!bar && !(x === 0 && y === 0)
            && (y > bar.bottom + 20 || y < bar.top - 20 || x < bar.left - 20 || x > bar.right + 20);
        if (tab && !tab.floating && droppedOutside) {
            floatTab(draggedId, x, y);
            return;
        }
    }
    renderTabs();
    renderBdfg();
});

function applyDashboardCardsVisibility() {
    document.querySelectorAll('.dashboard-card').forEach((card) => {
        const route = card.dataset.route;
        if (!route) return;
        if (route === INVENTORY_CARD_ROUTE) {
            const hasInventories = getVisibleInventoryOptions().length > 0;
            const canView = canViewRoute(route) && hasInventories;
            card.hidden = !canView;
            if (!canView) card.style.setProperty('display', 'none', 'important');
            else card.style.removeProperty('display');
        } else {
            const canView = canViewRoute(route);
            card.hidden = !canView;
            if (!canView) card.style.setProperty('display', 'none', 'important');
            else card.style.removeProperty('display');
        }
    });
}

document.querySelectorAll('.dashboard-card').forEach((card) => {
    card.addEventListener('click', () => {
        if (!canViewRoute(card.dataset.route)) {
            showAccessDeniedNotice(card.dataset.label || 'este modulo');
            return;
        }
        if (card.dataset.route === INVENTORY_CARD_ROUTE) {
            if (!getVisibleInventoryOptions().length) {
                showAccessDeniedNotice('Inventarios');
                return;
            }
            ensureInventoryPopover();
            const shouldOpen = inventoryPopover.hidden;
            closeSearchPopover();
            closeInventoryPopover();
            if (!shouldOpen) return;
            inventoryPopover.hidden = false;
            inventoryPopover.style.visibility = 'hidden';
            requestAnimationFrame(() => {
                positionInventoryPopover(card);
                inventoryPopover.style.visibility = '';
            });
            return;
        }
        if (card.dataset.openMode === 'window') {
            // Sin 'noopener': así el navegador copia la sesión (sessionStorage) a la pestaña nueva.
            // Igual queda aislada de esta pestaña porque anulamos `opened.opener` justo después.
            const opened = window.open(stripShellRoute(card.dataset.route), '_blank');
            if (opened) opened.opener = null;
            return;
        }
        desvanecerBotonesDashboard(card);
        openTab(card.dataset.route, card.dataset.label);
    });
});

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'erp-open-tab') {
        if (data.flotante === true) {
            abrirTabFlotante(data.route, data.label || 'Documento');
            return;
        }
        openTab(data.route, data.label || 'Documento', { reload: data.reload === true });
        return;
    }
    if (data.type === 'erp-favorites-updated') {
        renderFavoriteDocuments();
        renderBdfg();
        return;
    }
    if (data.type === 'erp-notifications-updated') {
        loadBdfgNotifications().catch(() => {});
        return;
    }
    if (data.type === 'erp-general-config-updated') {
        bdfgPreviewGlobal = null;
        if (data.config && typeof data.config === 'object') {
            loadedConfig = data.config;
            applyDashboardConfig(data.config).catch(console.error);
            return;
        }
        applyDashboardConfig().catch(console.error);
        return;
    }
    if (data.type === 'erp-bdfg-preview-global') {
        applyBdfgGlobalPreview(data.preview || null);
        return;
    }        if (data.type === 'erp-profile-updated') {
            bdfgPreviewProfile = null;
            bdfgUserProfile = data.profile || null;
            aplicarTransicionesCss();
            renderBdfg();
            return;
        }
    if (data.type === 'erp-transiciones-preview-profile') {
        aplicarTransicionesPreviewPerfil(data.preview || null);
        return;
    }
    if (data.type === 'erp-bdfg-preview-profile') {
        applyBdfgProfilePreview(data.preview || null);
        return;
    }
    if (data.type === 'erp-bdfg-context') {
        const tabId = getTabIdByFrameWindow(event.source);
        if (!tabId) return;
        setBdfgTabContext(tabId, data.context || null);
        if (tabId === activeTabId) {
            renderBdfg();
        }
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === FAVORITE_DOCUMENTS_STORAGE_KEY) {
        renderFavoriteDocuments();
        renderBdfg();
    }
    if (event.key === BDFG_POSITION_STORAGE_KEY) {
loadBdfgPosition();
    }
    if (event.key === 'erp-general-config-updated') {
        bdfgPreviewGlobal = null;
        applyDashboardConfig().catch(console.error);
    }
    if (event.key === 'erp-profile-updated') {
        bdfgPreviewProfile = null;
        loadBdfgUserProfile().catch(() => {});
    }
});

window.addEventListener('erp-favorites-updated', () => {
    renderFavoriteDocuments();
    renderBdfg();
});

window.addEventListener('erp-general-config-updated', (event) => {
    bdfgPreviewGlobal = null;
    if (event.detail && typeof event.detail === 'object') {
        loadedConfig = event.detail;
        applyDashboardConfig(event.detail).catch(console.error);
        return;
    }
    applyDashboardConfig().catch(console.error);
});

window.addEventListener('erp-bdfg-preview-global', (event) => {
    applyBdfgGlobalPreview(event.detail || null);
});

window.addEventListener('erp-profile-updated', (event) => {
    bdfgPreviewProfile = null;
    bdfgUserProfile = event.detail || null;
    aplicarTransicionesCss();
    renderBdfg();
});

window.addEventListener('erp-bdfg-preview-profile', (event) => {
    applyBdfgProfilePreview(event.detail || null);
});

window.addEventListener('erp-transiciones-preview-profile', (event) => {
    aplicarTransicionesPreviewPerfil(event.detail || null);
});

window.addEventListener('resize', () => {
    if (favoriteDrumState) drawFavoriteDrum(favoriteDrumState);
    loadBdfgPosition();
    if (bdfgMode === 'favorites' && bdfgBridge?.classList.contains('is-favorites-floating')) {
        const rect = bdfgBridge.getBoundingClientRect();
        applyBdfgFavoritesPanelPosition({ x: rect.left, y: rect.top });
    }
    if (searchPopover && !searchPopover.hidden) {
        requestAnimationFrame(() => positionSearchPopover());
    }
});
window.addEventListener('scroll', () => {
    if (searchPopover && !searchPopover.hidden) {
        requestAnimationFrame(() => positionSearchPopover());
    }
}, true);

const bdfgThemeObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === 'attributes' && mutation.attributeName === 'data-theme')) {
        renderBdfg();
    }
});
bdfgThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

document.addEventListener('click', (event) => {
    const inventoryCard = event.target.closest(`.dashboard-card[data-route="${INVENTORY_CARD_ROUTE}"]`);
    if (inventoryPopover && !inventoryPopover.hidden && !inventoryPopover.contains(event.target) && !inventoryCard) {
        closeInventoryPopover();
    }
    if (searchPopover && !searchPopover.hidden && !searchPopover.contains(event.target)) {
        closeSearchPopover();
    }
    closeBdfgIfOutside(event.target);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSearchPopover();
        closeInventoryPopover();
        setBdfgOpen(false, 'actions');
    }
});

// Impresion nativa del shell (Ctrl+P, menu del navegador, clic derecho -> Imprimir):
// el modulo activo esta en un <iframe>. En beforeprint se marca su contenedor como
// objetivo (lo aprovecha el @media print de dashboard.html para retirar el cromo y
// aplanar el layout) y se fija la altura del iframe a la altura real de su contenido
// EN LAYOUT DE IMPRESION, para que el navegador pueda paginar el documento completo.
// afterprint deja todo exactamente como estaba.
let printReflowState = null;

function measureFramePrintHeight(frame) {
    const cd = frame.contentDocument;
    if (!cd) return 0;
    const restored = [];
    const prevInlineHeight = frame.style.height;
    try {
        // Sonda alta: un <iframe> cuya altura sigue a su contenido es circular (el
        // viewport recorta el contenido que se quiere medir). Se le da un viewport
        // muy alto para que el layout interno fluya completo, se mide, y se revierte.
        frame.style.setProperty('height', '30000px', 'important');
        for (const sheet of cd.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch (_) { continue; }
            for (const rule of rules) {
                if (rule.type === CSSRule.MEDIA_RULE && /(^|[^-])print/.test(rule.media.mediaText)) {
                    restored.push([rule, rule.media.mediaText]);
                    rule.media.mediaText = 'all';
                }
            }
        }
        void cd.documentElement.offsetHeight;
        // Altura EXACTA del contenido en layout de impresion. Se mide el fondo real del
        // contenido que fluye (el contenedor de la ficha), no scrollHeight del documento,
        // que queda "pegado" al viewport por reglas de pantalla y deja hojas en blanco.
        const content = cd.getElementById('orderContent')
            || cd.querySelector('.production-order-card')
            || cd.body;
        const rect = content ? content.getBoundingClientRect() : null;
        const measured = rect ? (rect.top + rect.height) : 0;
        return Math.max(1, Math.ceil(measured));
    } finally {
        restored.forEach(([rule, mediaText]) => { rule.media.mediaText = mediaText; });
        if (prevInlineHeight) frame.style.setProperty('height', prevInlineHeight);
        else frame.style.removeProperty('height');
    }
}

window.addEventListener('beforeprint', () => {
    if (printReflowState) return;
    const frame = tabFrames.get(activeTabId);
    const host = frameHosts.get(activeTabId);
    if (!frame || !host || !frame.contentDocument) return;
    const height = measureFramePrintHeight(frame);
    if (!height) return;
    printReflowState = { frame, host, prevInlineHeight: frame.style.height };
    host.classList.add('is-print-target');
    frame.style.setProperty('height', height + 'px', 'important');
});

window.addEventListener('afterprint', () => {
    if (!printReflowState) return;
    const { frame, host, prevInlineHeight } = printReflowState;
    host.classList.remove('is-print-target');
    if (prevInlineHeight) frame.style.setProperty('height', prevInlineHeight);
    else frame.style.removeProperty('height');
    printReflowState = null;
});

bindBdfg();
loadBdfgPosition();
loadBdfgNotifications().catch(() => {});
setInterval(() => loadBdfgNotifications().catch(() => {}), 45000);

loadBdfgUserProfile().catch(() => {});
applyDashboardConfig().catch(console.error);
renderTabs();
renderFavoriteDocuments();
renderBdfg();
document.getElementById('dashboardSalesPipelineVendorSelect')?.addEventListener('change', (event) => {
    viewAsVendorCode = event.target.value || '';
    persistViewAsVendorState();
    refreshSalesPipelineSection();
});

applyDashboardCardsVisibility();
refreshSalesPipelineSection();
activateTab(HOME_TAB_ID);

// Si la entrada configurada del usuario (Configuración → Seguridad → Entrada
// Predeterminada) es "Tu Actividad", se abre esa pestaña sola junto al Dashboard
// al entrar — mi-actividad.html no es una pagina aparte, vive dentro de este
// mismo sistema de pestañas con iframes (ver openTab()).
if (activeUserSession?.defaultLanding === 'mi-actividad') {
    openTab('/mi-actividad.html', 'Tu Actividad');
}
window.addEventListener('resize', renderTabs);
window.addEventListener('resize', () => {
    tabs.forEach((tab) => { if (tab.floating) applyFloatGeometry(tab); });
});
