const ERP_ACCESS_SESSION_KEY = 'erp-user-session';

function readErpAccessSession() {
    try {
        return JSON.parse(localStorage.getItem(ERP_ACCESS_SESSION_KEY) || sessionStorage.getItem(ERP_ACCESS_SESSION_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function normalizeErpAccessLevel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'view' || normalized === 'edit') return normalized;
    return 'none';
}

function getErpAccessRouteModules(pathname) {
    const path = String(pathname || window.location.pathname || '/').toLowerCase();
    if (path === '/' || path === '/login' || path === '/dashboard') return ['dashboard'];
    if (path === '/socios' || path === '/socios.html' || path === '/socios-documento.html' || path.startsWith('/socios/')) return ['socios'];
    if (path === '/cotizaciones' || path === '/cotizaciones.html' || path === '/index.html' || path.startsWith('/cotizaciones/')) return ['cotizaciones'];
    if (path === '/calculo-flexografia' || path === '/flexo-calculo' || path === '/flexo-calculo.html') return ['calculos'];
    if (path === '/ordenes-produccion' || path === '/ordenes-produccion.html' || path === '/orden-produccion.html' || path.startsWith('/orden-produccion')) return ['ordenes'];
    if (path === '/planificacion' || path.startsWith('/planificacion/')) return ['planificacion'];
    if (path === '/costos' || path === '/costos.html') return ['costos'];
    if (path === '/configuracion-general' || path === '/configuracion-general.html') return ['configuracion-general'];
    if (path === '/vendedores' || path === '/vendedores-mobile.html') return ['vendedores'];
    if (path === '/proforma' || path === '/proforma.html') return ['cotizaciones'];
    if (path === '/inventario-materiales' || path === '/catalogo.html') return ['inventario-mp'];
    if (path === '/inventario-troqueles' || path === '/inventario-troqueles.html' || path === '/troquel-documento.html' || path.startsWith('/inventario-troqueles/')) return ['inventario-troqueles'];
    if (path === '/inventario-maquinas') return ['inventario-maquinaria'];
    if (path.startsWith('/inventario-')) return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria'];
    return [];
}

function showErpAccessBlocked(moduleName) {
    const render = () => {
        if (!document.getElementById('erpAccessBlockedStyles')) {
            const style = document.createElement('style');
            style.id = 'erpAccessBlockedStyles';
            style.textContent = `
                .erp-access-blocked{display:grid;min-height:100vh;place-items:center;padding:28px;background:linear-gradient(135deg,#eef5f9 0%,#ffffff 58%,#f5efe8 100%);font-family:Segoe UI,Tahoma,sans-serif}
                .erp-access-blocked section{display:grid;gap:10px;max-width:430px;padding:28px;border:1px solid #d6e3eb;border-radius:24px;background:rgba(255,255,255,.92);color:#5c6a76;text-align:center;box-shadow:0 20px 42px rgba(19,39,54,.11)}
                .erp-access-blocked strong{color:#263542;font-size:20px}
                .erp-access-blocked a{justify-self:center;margin-top:8px;padding:10px 16px;border-radius:999px;background:#0b81b8;color:#fff;text-decoration:none}
            `;
            document.head.appendChild(style);
        }
        document.body.innerHTML = `
            <main class="erp-access-blocked">
                <section>
                    <strong>Acceso no permitido</strong>
                    <span>Tu permiso actual no permite abrir ${moduleName || 'este modulo'}.</span>
                    <a href="/dashboard">Volver al dashboard</a>
                </section>
            </main>
        `;
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
        window.location.replace('/login');
        return;
    }

    const modules = session.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules) return;

    const routeModules = getErpAccessRouteModules(window.location.pathname);
    const isAllowed = !routeModules.length || routeModules.some((moduleKey) => normalizeErpAccessLevel(modules[moduleKey]) !== 'none');
    if (!isAllowed) {
        showErpAccessBlocked(routeModules.join(', '));
    }
})();
