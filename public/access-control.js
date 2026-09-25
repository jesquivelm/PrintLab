const ERP_ACCESS_SESSION_KEY = 'erp-user-session';
const ERP_SESSION_ACTIVITY_KEY = 'erp-session-activity';
const ERP_INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000;
const ERP_SESSION_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const ERP_ACTIVITY_TOUCH_THROTTLE_MS = 30 * 1000;
const ERP_WATCHDOG_TICK_MS = 60 * 1000;

function readErpAccessSession() {
    try {
        return JSON.parse(localStorage.getItem(ERP_ACCESS_SESSION_KEY) || sessionStorage.getItem(ERP_ACCESS_SESSION_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function getErpSessionStorageArea() {
    try {
        return localStorage.getItem(ERP_ACCESS_SESSION_KEY) ? localStorage : sessionStorage;
    } catch (error) {
        return sessionStorage;
    }
}

function readErpSessionActivity() {
    try {
        const value = Number(getErpSessionStorageArea().getItem(ERP_SESSION_ACTIVITY_KEY));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch (error) {
        return null;
    }
}

function touchErpSessionActivity() {
    try {
        getErpSessionStorageArea().setItem(ERP_SESSION_ACTIVITY_KEY, String(Date.now()));
    } catch (error) {
        // Ignore storage write failure.
    }
}

function clearErpSessionStorage() {
    try {
        localStorage.removeItem(ERP_ACCESS_SESSION_KEY);
        sessionStorage.removeItem(ERP_ACCESS_SESSION_KEY);
        localStorage.removeItem(ERP_SESSION_ACTIVITY_KEY);
        sessionStorage.removeItem(ERP_SESSION_ACTIVITY_KEY);
    } catch (error) {
        // Ignore storage cleanup failure.
    }
}

function notifyErpLogout(session, reason) {
    try {
        const payload = JSON.stringify({ username: session?.username || '', reason: reason || 'manual' });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/auth/logout', new Blob([payload], { type: 'application/json' }));
        } else {
            fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
        }
    } catch (error) {
        // Ignore logout notification failure.
    }
}

function forceErpLogout(reason, expiredKind) {
    const session = readErpAccessSession();
    notifyErpLogout(session, reason);
    clearErpSessionStorage();
    (window.top || window).location.replace(`/login?expired=${encodeURIComponent(expiredKind || 'invalid')}`);
}

async function revalidateErpSession() {
    const session = readErpAccessSession();
    if (!session?.username) return;
    try {
        const response = await fetch('/api/auth/session', {
            headers: { 'x-erp-session': JSON.stringify(session) },
            cache: 'no-store'
        });
        if (response.status === 401) {
            forceErpLogout('sesion_invalida', 'invalid');
            return;
        }
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        if (!data?.user) return;
        const updated = { ...session, ...data.user };
        try {
            getErpSessionStorageArea().setItem(ERP_ACCESS_SESSION_KEY, JSON.stringify(updated));
        } catch (error) {
            // Ignore storage write failure.
        }
        return updated;
    } catch (error) {
        // Error de red: se conserva la sesión actual y se reintenta en el siguiente ciclo.
    }
}

function startErpSessionWatchdog() {
    const session = readErpAccessSession();
    if (!session?.username) return;

    const lastActivity = readErpSessionActivity();
    if (lastActivity && (Date.now() - lastActivity) > ERP_INACTIVITY_LIMIT_MS) {
        forceErpLogout('inactividad', 'inactivity');
        return;
    }
    touchErpSessionActivity();

    let lastTouch = Date.now();
    const onActivity = () => {
        const now = Date.now();
        if (now - lastTouch < ERP_ACTIVITY_TOUCH_THROTTLE_MS) return;
        lastTouch = now;
        touchErpSessionActivity();
    };
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((eventName) => {
        window.addEventListener(eventName, onActivity, { passive: true });
    });

    window.setInterval(() => {
        const last = readErpSessionActivity() || Date.now();
        if ((Date.now() - last) > ERP_INACTIVITY_LIMIT_MS) {
            forceErpLogout('inactividad', 'inactivity');
        }
    }, ERP_WATCHDOG_TICK_MS);

    window.setInterval(revalidateErpSession, ERP_SESSION_REVALIDATE_INTERVAL_MS);
}

function isErpSuperPermission(session) {
    return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(String(session?.permissionName || '').trim());
}

function normalizeErpAccessLevel(value) {
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
    if (normalized === 'edit') return { view: true, create: true, edit: true };
    const parts = normalized.split(/[,\s|/+]+/).filter(Boolean);
    return {
        view: parts.includes('view') || parts.includes('create') || parts.includes('edit'),
        create: parts.includes('create') || parts.includes('edit'),
        edit: parts.includes('edit')
    };
}

function getErpModuleAccessLevel(modules, moduleKey) {
    if (moduleKey === 'productos' && modules && !Object.prototype.hasOwnProperty.call(modules, 'productos')) {
        return normalizeErpAccessLevel(modules.cotizaciones);
    }
    return normalizeErpAccessLevel(modules?.[moduleKey]);
}

function canErpViewModule(moduleKey, modulesOverride) {
    if (!moduleKey || moduleKey === 'dashboard') return true;
    const session = readErpAccessSession();
    const modules = modulesOverride && typeof modulesOverride === 'object'
        ? modulesOverride
        : (session?.modules && typeof session.modules === 'object' ? session.modules : null);
    if (!modules || !Object.keys(modules).length) return true;
    return Boolean(getErpModuleAccessLevel(modules, moduleKey).view);
}

function canErpCreateModule(moduleKey, modulesOverride) {
    if (!moduleKey) return false;
    const session = readErpAccessSession();
    const modules = modulesOverride && typeof modulesOverride === 'object'
        ? modulesOverride
        : (session?.modules && typeof session.modules === 'object' ? session.modules : null);
    if (!modules || !Object.keys(modules).length) return true;
    return Boolean(getErpModuleAccessLevel(modules, moduleKey).create);
}

function canErpEditModule(moduleKey, modulesOverride) {
    if (!moduleKey) return false;
    const session = readErpAccessSession();
    const modules = modulesOverride && typeof modulesOverride === 'object'
        ? modulesOverride
        : (session?.modules && typeof session.modules === 'object' ? session.modules : null);
    if (!modules || !Object.keys(modules).length) return true;
    return Boolean(getErpModuleAccessLevel(modules, moduleKey).edit);
}

function getErpAccessRouteModules(pathname) {
    const path = String(pathname || window.location.pathname || '/').toLowerCase();
    if (path === '/' || path === '/login' || path === '/cambiar-contrasena' || path === '/dashboard') return ['dashboard'];
    if (path === '/socios' || path === '/socios.html' || path === '/socios-documento.html' || path.startsWith('/socios/')) return ['socios'];
    if (path === '/productos' || path === '/productos.html' || path.startsWith('/productos/')) return ['productos'];
    if (path === '/cotizaciones' || path === '/cotizaciones.html' || path === '/index.html' || path.startsWith('/cotizaciones/')) return ['cotizaciones'];
    if (path === '/notificaciones' || path === '/notificaciones.html' || path.startsWith('/notificaciones/') || path.startsWith('/notificaciones')) return ['notificaciones'];
    if (path === '/calculo-flexografia' || path === '/flexo-calculo' || path === '/flexo-calculo.html') return ['calculos'];
    if (path === '/ordenes-produccion' || path === '/ordenes-produccion.html' || path === '/orden-produccion.html' || path.startsWith('/orden-produccion')) return ['ordenes'];
    if (path === '/calidad' || path.startsWith('/calidad/')) return ['calidad'];
    if (path === '/planificacion' || path.startsWith('/planificacion/')) return ['planificacion'];
    if (path === '/produccion' || path === '/produccion.html') return ['produccion'];
    if (path === '/reporteria' || path === '/reporteria.html' || path.startsWith('/reporteria/') || path.startsWith('/reporteria')) return ['reporteria'];
    if (path === '/tintas' || path === '/tintas.html' || path.startsWith('/tintas/') || path.startsWith('/tintas')) return ['tintas'];
    if (path === '/costos' || path === '/costos.html') return ['costos'];
    if (path === '/configuracion-general' || path === '/configuracion-general.html') return ['configuracion-general'];
    if (path === '/vendedores' || path === '/vendedores-mobile.html' || path === '/vendedores/dashboard' || path === '/vendedores-dashboard.html') return ['vendedores'];
    if (path === '/proforma' || path === '/proforma.html') return ['cotizaciones'];
    if (path === '/inventario-materiales' || path === '/catalogo.html') return ['inventario-mp'];
    if (path === '/inventario-troqueles' || path === '/inventario-troqueles.html' || path === '/troquel-documento.html' || path.startsWith('/inventario-troqueles/')) return ['inventario-troqueles'];
    if (path === '/inventario-maquinas') return ['inventario-maquinaria'];
    if (path === '/inventario-sellos') return ['inventario-sellos'];
    if (path === '/inventario-cilindros') return ['inventario-cilindros'];
    if (path === '/inventario-anilox') return ['inventario-anilox'];
    if (path === '/inventario-pt' || path === '/inventario-pt.html') return ['inventario-pt'];
    if (path === '/facturacion-fel' || path.startsWith('/facturacion-fel/')) return ['facturacion-fel'];
    if (path === '/capacitacion' || path === '/capacitacion.html' || path.startsWith('/capacitacion/') || path.startsWith('/capacitacion-') || path.includes('capacitacion')) return ['capacitacion'];
    if (path.startsWith('/inventario-')) return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'inventario-sellos', 'inventario-cilindros', 'inventario-anilox', 'inventario-pt'];
    return [];
}

function ensureErpAccessBlockedStyles() {
    if (document.getElementById('erpAccessBlockedStyles')) return;
    const style = document.createElement('style');
    style.id = 'erpAccessBlockedStyles';
    style.textContent = `
        .erp-access-blocked{display:grid;min-height:100vh;place-items:center;padding:28px;background:linear-gradient(135deg,#eef5f9 0%,#ffffff 58%,#f5efe8 100%);font-family:Segoe UI,Tahoma,sans-serif}
        .erp-access-blocked section{display:grid;gap:10px;max-width:430px;padding:28px;border:1px solid #d6e3eb;border-radius:24px;background:rgba(255,255,255,.92);color:#5c6a76;text-align:center;box-shadow:0 20px 42px rgba(19,39,54,.11)}
        .erp-access-blocked strong{color:#263542;font-size:20px}
        .erp-access-blocked a,.erp-access-blocked button{justify-self:center;margin-top:8px;padding:10px 16px;border:0;border-radius:999px;background:#0b81b8;color:#fff;font:inherit;text-decoration:none;cursor:pointer}
    `;
    document.head.appendChild(style);
}

function showErpAccessChecking(couldNotConfirm) {
    const render = () => {
        ensureErpAccessBlockedStyles();
        document.body.innerHTML = couldNotConfirm
            ? `
            <main class="erp-access-blocked">
                <section>
                    <strong>Seguimos esperando al servidor</strong>
                    <span>La conexión está lenta y todavía no llega tu información. Toca el botón para intentarlo de nuevo.</span>
                    <button type="button" id="erpAccessRetryButton">Actualizar</button>
                </section>
            </main>`
            : `
            <main class="erp-access-blocked">
                <section>
                    <strong>Cargando tu información</strong>
                    <span>Estamos trayendo tus datos desde el servidor. Espera un momento, por favor.</span>
                </section>
            </main>`;
        document.getElementById('erpAccessRetryButton')?.addEventListener('click', () => window.location.reload());
    };
    if (document.body) {
        render();
    } else {
        document.addEventListener('DOMContentLoaded', render, { once: true });
    }
}

function showErpAccessBlocked(moduleName) {
    const render = () => {
        ensureErpAccessBlockedStyles();
        document.body.innerHTML = `
            <main class="erp-access-blocked">
                <section>
                    <strong>Este módulo no está activo para tu usuario</strong>
                    <span>Si lo necesitas, un administrador puede activarlo en tu permiso.</span>
                    <a href="/dashboard" id="erpAccessBlockedBackLink">Volver al Inicio</a>
                </section>
            </main>
        `;
        document.getElementById('erpAccessBlockedBackLink')?.addEventListener('click', (event) => {
            if (window.parent && window.parent !== window && window.location.search.includes('shell=1')) {
                event.preventDefault();
                window.parent.postMessage({ type: 'erp-open-tab', route: '/dashboard?shell=1', label: 'Inicio' }, window.location.origin);
            }
        });
    };
    if (document.body) {
        render();
    } else {
        document.addEventListener('DOMContentLoaded', render, { once: true });
    }
}

(function enforceErpAccess() {
    const session = readErpAccessSession();
    if (!session?.username) {
        (window.top || window).location.replace('/login');
        return;
    }

    const modules = session.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules || !Object.keys(modules).length) return;

    const routeModules = getErpAccessRouteModules(window.location.pathname);
    const allowsRoute = (source) => !routeModules.length || routeModules.some((moduleKey) => Boolean(getErpModuleAccessLevel(source, moduleKey).view));
    if (allowsRoute(modules)) return;

    // Antes de mostrar un bloqueo se confirma con el servidor: la copia local de los
    // permisos puede estar desactualizada y no se debe asustar al usuario sin motivo.
    showErpAccessChecking();
    revalidateErpSession().then((fresh) => {
        const freshModules = fresh?.modules && typeof fresh.modules === 'object' ? fresh.modules : null;
        if (freshModules && (!Object.keys(freshModules).length || allowsRoute(freshModules))) {
            window.location.reload();
            return;
        }
        if (!fresh) {
            showErpAccessChecking(true);
            return;
        }
        showErpAccessBlocked(routeModules.join(', '));
    });
})();

startErpSessionWatchdog();

const ADMIN_TOOLS_PERMISSION_KEYWORDS = ['admin', 'implement'];

function hasAdminToolsAccess() {
    const session = readErpAccessSession();
    const permissionName = String(session?.permissionName || '').toLowerCase();
    if (!permissionName) return false;
    return ADMIN_TOOLS_PERMISSION_KEYWORDS.some(function (keyword) {
        return permissionName.includes(keyword);
    });
}

window.ErpAccess = {
    readSession: readErpAccessSession,
    normalizeLevel: normalizeErpAccessLevel,
    getModuleAccessLevel: getErpModuleAccessLevel,
    getRouteModules: getErpAccessRouteModules,
    canViewModule: canErpViewModule,
    canCreateModule: canErpCreateModule,
    canEditModule: canErpEditModule,
    clearSessionStorage: clearErpSessionStorage,
    revalidateSession: revalidateErpSession,
    notifyLogout: notifyErpLogout
};
