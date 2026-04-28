const CONFIG_ENDPOINT = '/api/config/general';
const SESSION_STORAGE_KEY = 'erp-user-session';
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

const HOME_TAB_ID = 'home';
const FAVORITE_DOCUMENTS_STORAGE_KEY = 'erp-favorite-documents';
const NOTIFICATION_THREADS_ENDPOINT = '/api/notification-center/threads?limit=24';
const DASHBOARD_CARDS = [
{ route: '/socios', label: 'Socios', iconKey: 'dashboardBusinessPartners', modules: ['socios'] },
{ route: '/productos', label: 'Productos', iconKey: 'dashboardProducts', modules: ['productos'] },
{ route: '/cotizaciones', label: 'Cotizaciones', iconKey: 'dashboardQuotes', modules: ['cotizaciones'] },
{ route: '/notificaciones.html', label: 'Notificaciones', iconKey: 'dashboardNotifications', modules: ['dashboard'] },
{ route: '/inventario-materiales', label: 'Inventarios', iconKey: 'dashboardInventory', modules: ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria'] },
{ route: '/configuracion-general', label: 'Configuraci\u00f3n', iconKey: 'dashboardSettings', modules: ['configuracion-general'] },
{ route: '/ordenes-produccion', label: '\u00d3rdenes', iconKey: 'dashboardOrders', modules: ['ordenes'] },
{ route: '/planificacion/lanzamiento', label: 'Planificaci\u00f3n', iconKey: 'dashboardPlanning', modules: ['planificacion'] },
{ route: '/costos.html', label: 'Costos', iconKey: 'dashboardCosts', modules: ['costos'] }
];
const INVENTORY_CARD_ROUTE = '/inventario-materiales';
const INVENTORY_OPTIONS = [
    { route: '/inventario-maquinas', label: 'Inventario de Maquinas', modules: ['inventario-maquinaria'] },
    { route: '/inventario-materiales', label: 'Inventario de Materia Prima', modules: ['inventario-mp'] },
    { route: '/inventario-troqueles', label: 'Inventario de Troqueles', modules: ['inventario-troqueles'] }
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
let bdfgDragState = null;
let bdfgComponent = null;
let bdfgUserProfile = null;
let bdfgPreviewGlobal = null;
let bdfgPreviewProfile = null;
const bdfgTabContexts = new Map();
const tabFrames = new Map();
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
    const modules = activeUserSession?.modules;
    return modules && typeof modules === 'object' ? modules : null;
}

function canViewModule(moduleKey) {
    if (!moduleKey || moduleKey === 'dashboard') return true;
    if (hasSuperPermission()) return true;
    const modules = getSessionModules();
    if (!modules) return true;
    if (moduleKey === 'productos' && !Object.prototype.hasOwnProperty.call(modules, 'productos')) {
        return normalizePermissionLevel(modules.cotizaciones).view;
    }
    return normalizePermissionLevel(modules[moduleKey]).view;
}

function canCreateModule(moduleKey) {
    if (!moduleKey) return false;
    if (hasSuperPermission()) return true;
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
    if (pathname === '/notificaciones' || pathname === '/notificaciones.html') return ['dashboard'];
    if (pathname === '/calculo-flexografia' || pathname === '/flexo-calculo' || pathname === '/flexo-calculo.html') return ['calculos'];
    if (pathname === '/ordenes-produccion' || pathname === '/ordenes-produccion.html' || pathname === '/orden-produccion.html' || pathname.startsWith('/orden-produccion')) return ['ordenes'];
    if (pathname === '/planificacion' || pathname.startsWith('/planificacion/')) return ['planificacion'];
    if (pathname === '/costos' || pathname === '/costos.html') return ['costos'];
    if (pathname === '/configuracion-general' || pathname === '/configuracion-general.html') return ['configuracion-general'];
    if (pathname === '/vendedores' || pathname === '/vendedores-mobile.html') return ['vendedores'];
    if (pathname === '/proforma' || pathname === '/proforma.html') return ['cotizaciones'];
    if (pathname === '/inventario-materiales' || pathname === '/catalogo.html') return ['inventario-mp'];
    if (pathname === '/inventario-troqueles' || pathname === '/inventario-troqueles.html' || pathname === '/troquel-documento.html' || pathname.startsWith('/inventario-troqueles/')) return ['inventario-troqueles'];
    if (pathname === '/inventario-maquinas') return ['inventario-maquinaria'];
    if (pathname.startsWith('/inventario-')) return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria'];
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
        mainSize: Number(globalSource?.bdfgMainSize) || defaults.mainSize,
        menuDistance: Number(globalSource?.bdfgMenuDistance) || defaults.menuDistance,
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
        mainSize: Number(userConfig.mainSize) || globalBase.mainSize,
        menuDistance: Number(userConfig.menuDistance) || globalBase.menuDistance,
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

function iconMarkup(value, altText, extraClass = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg')) {
        const safeUrl = escapeHtml(value);
        return `<span class="icon-svg-mask ${extraClass}" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
    }
    if (normalized.startsWith('data:image')) {
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

function sessionHeaders() {
    if (!activeUserSession) return {};
    const compactSession = {
        username: activeUserSession.username || '',
        name: activeUserSession.name || '',
        permissionName: activeUserSession.permissionName || ''
    };
    return { 'x-erp-session': JSON.stringify(compactSession) };
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
    const closeIcon = loadedConfig?.icons?.dashboardTabClose || loadedConfig?.icons?.popoverClose || '×';
    const closePalette = {
        primary: loadedConfig?.general?.iconColorDashboardTabClose || loadedConfig?.general?.iconColorPopoverClose || '#8c97a2',
        hover: loadedConfig?.general?.iconColorHoverDashboardTabClose || loadedConfig?.general?.iconColorHoverPopoverClose || '#0b81b8',
        size: Number(loadedConfig?.general?.iconSizeDashboardTabClose) || 14
    };
    const containerWidth = Math.max(tabsContainer?.clientWidth || tabsContainer?.parentElement?.clientWidth || 0, 320);
    const configuredTabWidth = Math.max(Number(loadedConfig?.general?.dashboardTabWidth) || 0, 146);
    const homeWidth = 120;
    const regularTabCount = Math.max(tabs.length - 1, 0);
    
    // Calculate width to fit in one row
    const availableWidth = containerWidth - homeWidth - (regularTabCount * 2) - 40; // 2px gap, 40px buffer
    const expandedTabWidth = regularTabCount > 0 ? Math.floor(availableWidth / regularTabCount) : configuredTabWidth;
    const computedTabWidth = Math.max(40, Math.min(expandedTabWidth, configuredTabWidth));

    tabsBar?.classList.remove('is-multirow');
    tabsContainer?.classList.remove('is-multirow');
    workspaceShell?.classList.remove('has-tab-wrap');

    tabsContainer.innerHTML = tabs.map((tab, index) => {
        const itemWidth = tab.id === HOME_TAB_ID ? homeWidth : computedTabWidth;
        const hasGap = index > 0 && tabs[index - 1]?.family !== tab.family;
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
    const iframe = document.createElement('iframe');
    iframe.className = 'dashboard-frame';
    iframe.title = tab.label || 'Contenido ERP';
    iframe.dataset.tabId = tab.id;
    iframe.src = normalizeRoute(tab.route);
    iframe.hidden = true;
    workspacePanel.appendChild(iframe);
    tabFrames.set(tab.id, iframe);
    return iframe;
}

function ensureTabFrame(tab) {
    if (!tab || tab.id === HOME_TAB_ID) return null;
    const existing = tabFrames.get(tab.id);
    if (existing) return existing;
    return createTabFrame(tab);
}

function showOnlyTabFrame(tabId) {
    tabFrames.forEach((iframe, id) => {
        iframe.hidden = id !== tabId;
    });
}

function disposeTabFrame(tabId) {
    const iframe = tabFrames.get(tabId);
    if (!iframe) return;
    iframe.remove();
    tabFrames.delete(tabId);
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
        homePanel.hidden = false;
        workspacePanel.hidden = true;
        showOnlyTabFrame('__none__');
        document.title = homeTabLabel;
        if (favoriteDrumState) {
            requestAnimationFrame(() => drawFavoriteDrum(favoriteDrumState));
        }
        return;
    }
    homePanel.hidden = true;
    workspacePanel.hidden = false;
    ensureTabFrame(tab);
    showOnlyTabFrame(tab.id);
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

function openTab(route, label) {
    if (!canViewRoute(route)) {
        showAccessDeniedNotice(label || 'este modulo');
        return null;
    }
    const normalizedRoute = normalizeRoute(route);
    const existing = tabs.find((tab) => normalizeRoute(tab.route) === normalizedRoute);
    if (existing) {
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
        activateTab(tabs[Math.max(0, index - 1)].id);
    } else {
        renderTabs();
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

function renderAccessEmptyState(visibleCount) {
    const grid = document.querySelector('.dashboard-grid');
    if (!grid) return;
    let empty = document.getElementById('dashboardAccessEmpty');
    if (visibleCount > 0) {
        empty?.remove();
        return;
    }
    if (!empty) {
        empty = document.createElement('div');
        empty.id = 'dashboardAccessEmpty';
        empty.className = 'dashboard-access-empty';
        grid.insertAdjacentElement('afterend', empty);
    }
    empty.innerHTML = `
        <strong>No tienes modulos visibles asignados.</strong>
        <span>Solicita a un administrador que revise el permiso "${escapeHtml(activeUserSession?.permissionName || 'sin permiso')}".</span>
    `;
}

function renderCards() {
    let visibleCount = 0;
    DASHBOARD_CARDS.forEach((card) => {
        const button = document.querySelector(`.dashboard-card[data-route="${card.route}"]`);
        if (!button) return;
        const isAllowed = canViewAnyModule(card.modules);
        button.hidden = !isAllowed;
        if (!isAllowed) return;
        visibleCount += 1;
        const iconTarget = button.querySelector(`[data-icon-target="${card.iconKey}"]`);
        const iconValue = loadedConfig?.icons?.[card.iconKey] || '□';
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
                dashboardCosts: 'Costs'
            };
            const family = familyMap[card.iconKey];
            if (family) {
                color = loadedConfig?.general?.[`tabColor${family}Root`];
            }
        }
        color = color || '#0b81b8';

        const hover = loadedConfig?.general?.[`iconColorHover${suffix}`] || color || '#17abdf';
        const size = Number(loadedConfig?.general?.[`iconSize${suffix}`]) || 38;
        if (iconTarget) {
            const tileSize = Math.max(54, size + 16);
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

function getTabIdByFrameWindow(targetWindow) {
    if (!targetWindow) return '';
    for (const [tabId, frame] of tabFrames.entries()) {
        if (frame?.contentWindow === targetWindow) {
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
    return {
        route: normalizeFavoriteRouteKey(tab.route),
        label: String(tab.label || 'Documento').trim() || 'Documento',
        code: String(tab.label || 'Documento').trim() || 'Documento',
        updatedAt: Date.now()
    };
}

function isFavoriteRoute(route) {
    const key = normalizeFavoriteRouteKey(route);
    return readFavoriteDocuments().some((item) => normalizeFavoriteRouteKey(item.route) === key);
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
    return String(item?.label || item?.code || item?.quoteCode || item?.id || 'Documento').trim() || 'Documento';
}

function getFavoriteDisplaySubtitle(item) {
    return [item?.customerName, item?.jobName, item?.productName].filter(Boolean).join(' · ');
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
            mode: 'notifications',
            badge: bdfgUnreadCount > 0 ? String(Math.min(bdfgUnreadCount, 99)) : ''
        },
        {
            id: 'search',
            label: 'Búsqueda rápida',
            description: 'Abrir la búsqueda global de órdenes y cotizaciones',
            mode: 'search'
        },
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
        }
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

    switch (tab?.family) {
        case 'quotes':
            if (canViewRoute('/cotizaciones')) {
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
            if (canViewRoute('/productos')) {
                contextualActions.push({
                    id: 'open-products',
                    label: 'Ir a Productos',
                    description: 'Abrir el módulo principal de productos',
                    route: '/productos',
                    routeLabel: 'Productos'
                });
            }
            break;
        case 'orders':
            if (canViewRoute('/ordenes-produccion')) {
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
            if (getVisibleInventoryOptions().length > 1) {
                contextualActions.push({
                    id: 'open-inventory-menu',
                    label: 'Inventarios',
                    description: 'Abrir el selector de inventarios disponibles',
                    callback: () => {
                        ensureInventoryPopover();
                        closeSearchPopover();
                        if (inventoryPopover) inventoryPopover.hidden = false;
                    }
                });
            }
            break;
        case 'settings':
            if (canViewRoute('/configuracion-general')) {
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
            if (canViewRoute('/planificacion/lanzamiento')) {
                contextualActions.push({
                    id: 'open-planning',
                    label: 'Ir a Planificación',
                    description: 'Abrir el módulo principal de planificación',
                    route: '/planificacion/lanzamiento',
                    routeLabel: 'Planificación'
                });
            }
            break;
        case 'costs':
            if (canViewRoute('/costos.html')) {
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
    const favorites = readFavoriteDocuments()
        .filter((item) => canViewRoute(item.route))
        .filter((item) => {
            const query = bdfgFavoriteFilter.trim().toLowerCase();
            if (!query) return true;
            return [
                item.route,
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
                        <span>${escapeHtml(getFavoriteDisplaySubtitle(item) || stripShellRoute(item.route))}</span>
                        <div class="dashboard-bdfg-item-actions">
                            <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-favorite="${escapeHtml(item.route)}" data-bdfg-open-label="${escapeHtml(getFavoriteDisplayTitle(item))}">Abrir</button>
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
    const threads = bdfgNotificationThreads.slice(0, 8);
    bdfgPanel.innerHTML = `
        <section class="dashboard-bdfg-section">
            <div class="dashboard-bdfg-list">
                ${threads.length ? threads.map((thread) => `
                    <article class="dashboard-bdfg-thread">
                        <div class="dashboard-bdfg-thread-head">
                            <strong>${escapeHtml(thread.customerName || thread.productName || thread.documentCode || 'Notificación')}</strong>
                            ${thread.unreadCount ? `<span class="dashboard-bdfg-action-badge">${escapeHtml(String(Math.min(thread.unreadCount, 99)))}</span>` : ''}
                        </div>
                        <span>${escapeHtml([thread.documentCode, thread.lineCode, thread.productName].filter(Boolean).join(' · ') || 'Sin detalle')}</span>
                        <em>${escapeHtml(thread.lastMessagePreview || 'Sin mensajes recientes')}</em>
                    </article>
                `).join('') : '<div class="dashboard-bdfg-empty">No se pudieron cargar notificaciones recientes.</div>'}
            </div>
            <div class="dashboard-bdfg-item-actions">
                <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-open-notifications="true">Abrir centro de notificaciones</button>
                <button type="button" class="dashboard-bdfg-inline-btn" data-bdfg-refresh-notifications="true">Actualizar</button>
            </div>
        </section>
    `;
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

function renderBdfgPanel() {
    if (!bdfgBridge || bdfgBridge.hidden) return;
    if (bdfgMode === 'calc-processes') {
        const context = getActiveBdfgContext();
        bdfgComponent?.renderProcessTray(context?.processes || [], {
            canEdit: context?.canEdit !== false,
            title: 'Procesos',
            subtitle: ''
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
    renderBdfgActionsPanel();
}

function renderBdfgBadge() {
    if (!bdfgBadge) return;
    const visible = bdfgUnreadCount > 0;
    bdfgBadge.hidden = !visible;
    if (visible) {
        bdfgBadge.textContent = String(Math.min(bdfgUnreadCount, 99));
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
        profile: { key: 'topUser', literalFallback: '◔', color: '#9ba2ab', size: 20 },
        theme: currentTheme === 'dark'
            ? { key: 'dashboardFabThemeDark', literalFallback: '☀', color: '#f59e0b', size: 20 }
            : { key: 'dashboardFabTheme', literalFallback: '☾', color: '#5f7392', size: 20 },
        'open-context-document': { key: 'dashboardFabContextDocument', fallback: 'browserOpen', color: '#0b81b8', size: 20 },
        'open-context-secondary': { key: 'dashboardFabContextSecondary', fallback: 'browserOpen', color: '#0b81b8', size: 20 },
        'open-quote-proforma': { key: 'dashboardFabQuoteProforma', fallback: 'proformaView', color: '#0b81b8', size: 20 },
        'view-context-status': { key: 'dashboardFabStatus', literalFallback: '📊' },
        'calc-processes': { key: 'dashboardFabQuoteCalculation', fallback: 'processLauncher', color: '#0b81b8', size: 20 },
        'open-quotes': { key: 'dashboardFabQuotes', fallback: 'dashboardQuotes', color: '#0b81b8', size: 20 },
        'open-products': { key: 'dashboardFabProducts', fallback: 'dashboardProducts', color: '#0b81b8', size: 20 },
        'open-orders': { key: 'dashboardFabOrders', fallback: 'dashboardOrders', color: '#0b81b8', size: 20 },
        'open-inventory-menu': { key: 'dashboardFabInventory', fallback: 'dashboardInventory', color: '#0b81b8', size: 20 },
        'open-settings': { key: 'dashboardFabSettings', fallback: 'dashboardSettings', color: '#0b81b8', size: 20 },
        'open-planning': { key: 'dashboardFabPlanning', fallback: 'dashboardPlanning', color: '#0b81b8', size: 20 },
        'open-costs': { key: 'dashboardFabCosts', fallback: 'dashboardCosts', color: '#0b81b8', size: 20 }
    };
    
    const mergedActions = [...globalActions, ...contextualActions];
    const allActions = mergedActions.slice(0, 7);
    const calcProcessesAction = mergedActions.find((action) => action.id === 'calc-processes');
    if (calcProcessesAction && !allActions.some((action) => action.id === 'calc-processes')) {
        const replaceIndex = allActions.findIndex((action) => action.id === 'theme');
        if (replaceIndex >= 0) {
            allActions.splice(replaceIndex, 1, calcProcessesAction);
        } else if (allActions.length >= 7) {
            allActions[allActions.length - 1] = calcProcessesAction;
        } else {
            allActions.push(calcProcessesAction);
        }
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
        const response = await fetch(NOTIFICATION_THREADS_ENDPOINT, { headers: sessionHeaders() });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No fue posible cargar notificaciones.');
        bdfgNotificationThreads = Array.isArray(payload.items) ? payload.items : [];
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
    
    if (bdfgBridge) {
        bdfgBridge.hidden = !willShowPanel;
    }

    if (open) {
        updateBdfgPlacement(triggerEl);
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
        if (event.target.closest('[data-bdfg-refresh-notifications]')) {
            event.preventDefault();
            event.stopPropagation();
            loadBdfgNotifications().catch(() => {});
        }
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

async function applyDashboardConfig() {
    const response = await fetch(CONFIG_ENDPOINT);
    if (!response.ok) return;
    loadedConfig = await response.json();
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

    if (companyLogo) {
        companyLogo.src = presentation.brandLogoUrl;
        companyLogo.alt = companyName;
        companyLogo.style.display = presentation.brandLogoUrl ? 'block' : 'none';
    }
    if (brandFallback) {
        brandFallback.textContent = companyName;
        brandFallback.style.display = presentation.brandLogoUrl ? 'none' : 'flex';
    }

    renderCards();
    renderTabs();
    renderFavoriteDocuments();
    renderBdfg();
    if (favoriteDrumState) {
        requestAnimationFrame(() => drawFavoriteDrum(favoriteDrumState));
    }
}

tabsContainer.addEventListener('click', (event) => {
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

tabsContainer.addEventListener('dragstart', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!tabButton || tabButton.dataset.tabId === HOME_TAB_ID) return;
    draggedTabId = tabButton.dataset.tabId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedTabId);
    tabButton.classList.add('is-dragging');
});

tabsContainer.addEventListener('dragover', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!draggedTabId || !tabButton || tabButton.dataset.tabId === HOME_TAB_ID) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
});

tabsContainer.addEventListener('drop', (event) => {
    const tabButton = event.target.closest('.dashboard-tab[data-tab-id]');
    if (!draggedTabId || !tabButton) return;
    event.preventDefault();
    moveTab(draggedTabId, tabButton.dataset.tabId);
    draggedTabId = null;
    renderTabs();
    renderBdfg();
});

tabsContainer.addEventListener('dragend', () => {
    draggedTabId = null;
    renderTabs();
    renderBdfg();
});

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
            return;
        }
        openTab(card.dataset.route, card.dataset.label);
    });
});

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'erp-open-tab') {
        openTab(data.route, data.label || 'Documento');
        return;
    }
    if (data.type === 'erp-favorites-updated') {
        renderFavoriteDocuments();
        renderBdfg();
        return;
    }
    if (data.type === 'erp-general-config-updated') {
        bdfgPreviewGlobal = null;
        if (data.config && typeof data.config === 'object') {
            loadedConfig = data.config;
            applyDashboardConfig().catch(console.error);
            return;
        }
        applyDashboardConfig().catch(console.error);
        return;
    }
    if (data.type === 'erp-bdfg-preview-global') {
        applyBdfgGlobalPreview(data.preview || null);
        return;
    }
    if (data.type === 'erp-profile-updated') {
        bdfgPreviewProfile = null;
        bdfgUserProfile = data.profile || null;
        renderBdfg();
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
    }
    applyDashboardConfig().catch(console.error);
});

window.addEventListener('erp-bdfg-preview-global', (event) => {
    applyBdfgGlobalPreview(event.detail || null);
});

window.addEventListener('erp-profile-updated', (event) => {
    bdfgPreviewProfile = null;
    bdfgUserProfile = event.detail || null;
    renderBdfg();
});

window.addEventListener('erp-bdfg-preview-profile', (event) => {
    applyBdfgProfilePreview(event.detail || null);
});

window.addEventListener('resize', () => {
    if (favoriteDrumState) drawFavoriteDrum(favoriteDrumState);
    loadBdfgPosition();
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

bindBdfg();
loadBdfgPosition();
loadBdfgNotifications().catch(() => {});
loadBdfgUserProfile().catch(() => {});
applyDashboardConfig().catch(console.error);
renderTabs();
renderFavoriteDocuments();
renderBdfg();
activateTab(HOME_TAB_ID);
window.addEventListener('resize', renderTabs);
