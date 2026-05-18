const CONFIG_ENDPOINT = '/api/config/general';
const SESSION_STORAGE_KEY = 'erp-user-session';

const companyLogo = document.getElementById('notificationsCompanyLogo');
const brandFallback = document.getElementById('notificationsBrandFallback');
const pageTitle = document.getElementById('notificationsPageTitle');
const chatMount = document.getElementById('notificationsChatMount');

let currentConfig = null;
let notificationChatWidget = null;

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

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function publishNotificationsUpdated() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-notifications-updated' }, window.location.origin);
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function toIconSuffix(key) {
    if (!key) return '';
    return key.charAt(0).toUpperCase() + key.slice(1);
}

function getNotificationIconConfig(primaryKey, fallbackKey = '', literalFallback = '', defaultColor = '#5f7392', defaultSize = 20) {
    const primarySuffix = toIconSuffix(primaryKey);
    const fallbackSuffix = fallbackKey ? toIconSuffix(fallbackKey) : '';
    const value = firstFilled(
        currentConfig?.icons?.[primaryKey],
        fallbackKey ? currentConfig?.icons?.[fallbackKey] : '',
        literalFallback
    );
    const color = firstFilled(
        currentConfig?.general?.[`iconColor${primarySuffix}`],
        fallbackSuffix ? currentConfig?.general?.[`iconColor${fallbackSuffix}`] : '',
        defaultColor
    );
    const hoverColor = firstFilled(
        currentConfig?.general?.[`iconColorHover${primarySuffix}`],
        fallbackSuffix ? currentConfig?.general?.[`iconColorHover${fallbackSuffix}`] : '',
        color
    );
    const size = Number(firstFilled(
        currentConfig?.general?.[`iconSize${primarySuffix}`],
        fallbackSuffix ? currentConfig?.general?.[`iconSize${fallbackSuffix}`] : '',
        defaultSize
    )) || defaultSize;
    return { value, color, hoverColor, size };
}

function applyBranding(config) {
    currentConfig = config || null;
    const branding = config?.branding || {};
    const general = config?.general || {};
    const companyName = String(branding.companyName || general.companyName || 'PrintLab').trim() || 'PrintLab';
    const logoUrl = String(branding.companyLogoUrl || branding.logoUrl || '').trim();
    if (pageTitle) pageTitle.textContent = 'Notificaciones';
    if (brandFallback) {
        brandFallback.textContent = companyName;
        brandFallback.hidden = Boolean(logoUrl);
    }
    if (companyLogo) {
        companyLogo.src = logoUrl || '';
        companyLogo.hidden = !logoUrl;
    }
}

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('No fue posible cargar la configuración.');
        applyBranding(await response.json());
    } catch (_) {
        applyBranding(null);
    }
}

function renderStartupError(message) {
    if (!chatMount) return;
    chatMount.innerHTML = `<div class="notification-chat-window is-embedded"><div class="notification-chat-body"><div class="nc-empty"><i class="ti ti-message-2" aria-hidden="true"></i><p>${String(message || 'No fue posible cargar notificaciones.').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div></div></div>`;
}

async function init() {
    if (isShellEmbedded()) document.body.classList.add('shell-embedded');
    const session = readSession();
    if (!session?.username) {
        window.location.replace('/login');
        return;
    }
    await loadConfig();
    if (!window.NotificationChatWidget || !chatMount) {
        renderStartupError('No fue posible iniciar la ventana de notificaciones.');
        return;
    }
    notificationChatWidget = new window.NotificationChatWidget({
        session,
        headers: sessionHeaders,
        container: chatMount,
        embedded: true,
        showOpenCenter: false,
        showClose: false,
        draggable: false,
        allowMinimize: false,
        icons: {
            title: getNotificationIconConfig('notificationChatTitle', 'dashboardNotifications', '✉', '#0b81b8', 18),
            attach: getNotificationIconConfig('notificationChatAttach', '', '📎', '#607286', 16),
            send: getNotificationIconConfig('notificationChatSend', '', '➤', '#0b81b8', 16),
            delete: { ...getNotificationIconConfig('lineDelete', '', '🗑', '#607286', 16), color: '#607286', hoverColor: '#344054', size: 16 }
        },
        openRoute: (route, label) => {
            if (!openRouteInShell(route, label || 'Documento')) window.location.href = route;
        },
        onUnreadChange: publishNotificationsUpdated,
        onChanged: publishNotificationsUpdated
    });
    await notificationChatWidget.open();
}

init().catch((error) => {
    renderStartupError(error.message || 'No fue posible iniciar la pantalla de notificaciones.');
});
