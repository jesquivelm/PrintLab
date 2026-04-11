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
const searchButton = document.getElementById('dashboardSearchButton');
const favoritesPanel = document.getElementById('dashboardFavorites');
const favoritesBody = document.getElementById('dashboardFavoritesBody');

const HOME_TAB_ID = 'home';
const FAVORITE_DOCUMENTS_STORAGE_KEY = 'erp-favorite-documents';
const DASHBOARD_CARDS = [
{ route: '/socios', label: 'Socios', iconKey: 'dashboardBusinessPartners' },
{ route: '/cotizaciones', label: 'Cotizaciones', iconKey: 'dashboardQuotes' },
{ route: '/inventario-materiales', label: 'Inventarios', iconKey: 'dashboardInventory' },
{ route: '/configuracion-general', label: 'Configuraci\u00f3n', iconKey: 'dashboardSettings' },
{ route: '/ordenes-produccion', label: '\u00d3rdenes', iconKey: 'dashboardOrders' },
{ route: '/planificacion/lanzamiento', label: 'Planificaci\u00f3n', iconKey: 'dashboardPlanning' },
{ route: '/costos.html', label: 'Costos', iconKey: 'dashboardCosts' }
];
const INVENTORY_CARD_ROUTE = '/inventario-materiales';
const INVENTORY_OPTIONS = [
    { route: '/inventario-maquinas', label: 'Inventario de Maquinas' },
    { route: '/inventario-materiales', label: 'Inventario de Materia Prima' },
    { route: '/inventario-troqueles', label: 'Inventario de Troqueles' }
];

let tabs = [{ id: HOME_TAB_ID, label: 'PrintLab', route: '', closable: false, family: 'home', level: 'root' }];
let activeTabId = HOME_TAB_ID;
let loadedConfig = null;
let homeTabLabel = 'PrintLab';
let draggedTabId = null;
let searchPopover = null;
let searchInput = null;
let searchResults = null;
let searchRequestToken = 0;
let inventoryPopover = null;
let favoriteReelBounceTimer = null;
let favoriteDrumState = null;
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
    settings: { family: 'settings', level: 'root' },
    default: { family: 'default', level: 'root' }
};
const TAB_FAMILY_ORDER = ['home', 'quotes', 'orders', 'costs', 'partners', 'inventory', 'settings', 'default'];

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

function getTabFamilyMeta(route) {
    if (!route) return TAB_FAMILY_META.home;
    const pathname = new URL(route, window.location.origin).pathname.toLowerCase();
    if (pathname === '/cotizaciones') return TAB_FAMILY_META.quotes;
    if (pathname.startsWith('/cotizaciones/documento') || pathname.startsWith('/calculo-flexografia')) return TAB_FAMILY_META.quoteChild;
  if (pathname === '/ordenes-produccion') return TAB_FAMILY_META.orders;
  if (pathname === '/planificacion' || pathname.startsWith('/planificacion/')) return TAB_FAMILY_META.orders;
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
        costs: { color: 'tabColorCostsRoot', fallback: '#6D99D6' },
        partners: tab.level === 'child'
            ? { color: 'tabColorPartnersChild', fallback: '#6ABFB6' }
            : { color: 'tabColorPartnersRoot', fallback: '#2C9F95' },
        inventory: tab.level === 'child'
            ? { color: 'tabColorInventoryChild', fallback: '#8FA8DB' }
            : { color: 'tabColorInventoryRoot', fallback: '#5F80C8' },
        settings: tab.level === 'child'
            ? { color: 'tabColorSettingsChild', fallback: '#B29BD8' }
            : { color: 'tabColorSettingsRoot', fallback: '#8B74BB' }
    };
    const meta = keyMap[tab.family];
    if (!meta) return '';
    const accent = general[meta.color] || meta.fallback;
    const text = rgbaFromHex(accent, 1, '#46515d');
    const styleTokens = [
        `--tab-accent:${accent}`,
        `--tab-bg:${rgbaFromHex(accent, tab.level === 'child' ? 0.14 : 0.22, 'rgba(216,221,227,0.82)')}`,
        `--tab-bg-hover:${rgbaFromHex(accent, tab.level === 'child' ? 0.24 : 0.32, 'rgba(216,221,227,0.94)')}`,
        `--tab-bg-active:linear-gradient(180deg, ${rgbaFromHex(accent, tab.level === 'child' ? 0.30 : 0.38, 'rgba(216,221,227,0.92)')} 0%, rgba(255,255,255,0.98) 100%)`,
        `--tab-text:${text}`,
        `--tab-text-active:${text}`
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
    const familyGapCount = tabs.reduce((count, tab, index) => count + (index > 0 && tabs[index - 1]?.family !== tab.family ? 1 : 0), 0);
    const regularTabCount = Math.max(tabs.length - 1, 1);
    const gapWidth = Math.max(regularTabCount, 0) * 6;
    const dividerWidth = familyGapCount * 10;
    const singleRowRequiredWidth = homeWidth + (regularTabCount * configuredTabWidth) + gapWidth + dividerWidth + 8;
    const rowCount = singleRowRequiredWidth <= containerWidth ? 1 : 2;
    const availableWidthForRegularTabs = Math.max(containerWidth - homeWidth - gapWidth - dividerWidth - 8, configuredTabWidth);
    const expandedTabWidth = regularTabCount > 0
        ? Math.floor(availableWidthForRegularTabs / regularTabCount)
        : configuredTabWidth;
    const computedTabWidth = rowCount === 1
        ? Math.max(configuredTabWidth, Math.min(expandedTabWidth, 240))
        : configuredTabWidth;

    tabsBar?.classList.toggle('is-multirow', rowCount > 1);
    tabsContainer?.classList.toggle('is-multirow', rowCount > 1);
    workspaceShell?.classList.toggle('has-tab-wrap', rowCount > 1);

    tabsContainer.innerHTML = tabs.map((tab, index) => `
        <button
            type="button"
            class="dashboard-tab family-${escapeHtml(tab.family || 'default')} level-${escapeHtml(tab.level || 'root')} ${index > 0 && tabs[index - 1]?.family !== tab.family ? 'has-family-gap' : ''} ${tab.id === activeTabId ? 'is-active' : ''} ${tab.id === draggedTabId ? 'is-dragging' : ''} ${tab.id !== HOME_TAB_ID ? 'is-draggable' : ''}"
            data-tab-id="${escapeHtml(tab.id)}"
            draggable="${tab.id !== HOME_TAB_ID ? 'true' : 'false'}"
            style="${escapeHtml(`${getTabFamilyPalette(tab, loadedConfig)};--tab-computed-width:${tab.id === HOME_TAB_ID ? homeWidth : computedTabWidth}px;`)}"
        >
            <span class="dashboard-tab-label">${escapeHtml(getRenderTabLabel(tab, tab.id === HOME_TAB_ID ? homeWidth : computedTabWidth))}</span>
            ${tab.closable ? `<span class="dashboard-tab-close" data-action="close-tab" data-tab-id="${escapeHtml(tab.id)}" style="color:${escapeHtml(closePalette.primary)};--icon-hover-color:${escapeHtml(closePalette.hover)};--config-icon-size:${closePalette.size}px;">
                ${iconMarkup(closeIcon, 'Cerrar tab', 'table-icon-media')}
            </span>` : ''}
        </button>
    `).join('');
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

function openTab(route, label) {
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
    return id;
}

function closeTab(tabId) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;
    const wasActive = activeTabId === tabId;
    disposeTabFrame(tabId);
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

function renderCards() {
    DASHBOARD_CARDS.forEach((card) => {
        const button = document.querySelector(`.dashboard-card[data-route="${card.route}"]`);
        if (!button) return;
        const iconTarget = button.querySelector(`[data-icon-target="${card.iconKey}"]`);
        const iconValue = loadedConfig?.icons?.[card.iconKey] || '□';
        const suffix = card.iconKey.charAt(0).toUpperCase() + card.iconKey.slice(1);
        const color = loadedConfig?.general?.[`iconColor${suffix}`] || '#0b81b8';
        const hover = loadedConfig?.general?.[`iconColorHover${suffix}`] || '#17abdf';
        const size = Number(loadedConfig?.general?.[`iconSize${suffix}`]) || 38;
        if (iconTarget) {
            iconTarget.innerHTML = iconMarkup(iconValue, card.label, 'table-icon-media');
            iconTarget.style.setProperty('--icon-base-color', color);
            iconTarget.style.setProperty('--icon-hover-color', hover);
            iconTarget.style.setProperty('--config-icon-size', `${size}px`);
            const tileSize = Math.max(54, size + 16);
            iconTarget.style.width = `${tileSize}px`;
            iconTarget.style.height = `${tileSize}px`;
            iconTarget.style.flexBasis = `${tileSize}px`;
        }
    });
}

function readFavoriteDocuments() {
    try {
        const raw = JSON.parse(localStorage.getItem(FAVORITE_DOCUMENTS_STORAGE_KEY) || '[]');
        return Array.isArray(raw) ? raw.filter((item) => item && item.id && item.route) : [];
    } catch (error) {
        return [];
    }
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
    if (searchPopover) searchPopover.hidden = true;
}

function ensureInventoryPopover() {
    if (inventoryPopover) return;
    inventoryPopover = document.createElement('div');
    inventoryPopover.className = 'dashboard-inventory-popover';
    inventoryPopover.hidden = true;
    inventoryPopover.innerHTML = `
        <div class="dashboard-inventory-head">
            <div class="dashboard-inventory-title">Inventarios</div>
            <div class="dashboard-inventory-help">Selecciona el inventario que quieres abrir.</div>
        </div>
        <div class="dashboard-inventory-list">
            ${INVENTORY_OPTIONS.map((item) => `
                <button type="button" class="dashboard-inventory-item" data-route="${escapeHtml(item.route)}" data-label="${escapeHtml(item.label)}">
                    ${escapeHtml(item.label)}
                </button>
            `).join('')}
        </div>
    `;
    document.body.appendChild(inventoryPopover);

    inventoryPopover.addEventListener('click', (event) => {
        const option = event.target.closest('[data-route]');
        if (!option) return;
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
        renderSearchResults([], '');
        return;
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

        renderSearchResults([...orderItems, ...quoteItems].slice(0, 20), search);
    } catch (error) {
        if (token !== searchRequestToken) return;
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

    applyIcon(searchButton, loadedConfig.icons?.topSearch || '⌕', loadedConfig.general?.iconColorTopSearch, loadedConfig.general?.iconColorHoverTopSearch, loadedConfig.general?.iconSizeTopSearch, 'Buscar');

    renderCards();
    renderTabs();
    renderFavoriteDocuments();
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
});

tabsContainer.addEventListener('dragend', () => {
    draggedTabId = null;
    renderTabs();
});

document.querySelectorAll('.dashboard-card').forEach((card) => {
    card.addEventListener('click', () => {
        if (card.dataset.route === INVENTORY_CARD_ROUTE) {
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
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === FAVORITE_DOCUMENTS_STORAGE_KEY) {
        renderFavoriteDocuments();
    }
});

window.addEventListener('resize', () => {
    if (favoriteDrumState) drawFavoriteDrum(favoriteDrumState);
});

searchButton?.addEventListener('click', () => {
    ensureSearchPopover();
    const shouldOpen = searchPopover.hidden;
    closeInventoryPopover();
    closeSearchPopover();
    if (!shouldOpen) return;
    searchPopover.hidden = false;
    renderSearchResults([], '');
    requestAnimationFrame(() => searchInput?.focus());
});
document.addEventListener('click', (event) => {
    const inventoryCard = event.target.closest(`.dashboard-card[data-route="${INVENTORY_CARD_ROUTE}"]`);
    if (inventoryPopover && !inventoryPopover.hidden && !inventoryPopover.contains(event.target) && !inventoryCard) {
        closeInventoryPopover();
    }
    if (searchPopover && !searchPopover.hidden && !searchPopover.contains(event.target) && !searchButton?.contains(event.target)) {
        closeSearchPopover();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSearchPopover();
        closeInventoryPopover();
    }
});

applyDashboardConfig().catch(console.error);
renderTabs();
renderFavoriteDocuments();
activateTab(HOME_TAB_ID);
window.addEventListener('resize', renderTabs);
