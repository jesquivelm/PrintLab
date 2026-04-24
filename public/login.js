const LOGIN_CONFIG_ENDPOINT = '/api/config/general';
const LOGIN_REPOSITORY_ENDPOINT = '/api/login-repository';
const LOGIN_AUTH_ENDPOINT = '/api/auth/login';
const SESSION_STORAGE_KEY = 'erp-user-session';
const REMEMBER_STORAGE_KEY = 'erp-remembered-login';
const LOGIN_CONFIG_CACHE_KEY = 'erp-login-config-cache';
const LOGIN_REPOSITORY_CACHE_KEY = 'erp-login-repository-cache';
const LOGIN_CONFIG_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_REPOSITORY_CACHE_TTL_MS = 30 * 60 * 1000;
const LOGIN_ANIM_VARIANTS = ['anim-0', 'anim-1', 'anim-2'];

const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginPasswordToggle = document.getElementById('loginPasswordToggle');
const loginRemember = document.getElementById('loginRemember');
const loginStatus = document.getElementById('loginStatus');
const loginHeroStage = document.getElementById('loginHeroStage');
const loginHeroPlaceholder = document.getElementById('loginHeroPlaceholder');
const loginCompanyName = document.getElementById('loginCompanyName');
const loginBrandLogo = document.getElementById('loginBrandLogo');
const loginHeroTitle = document.getElementById('loginHeroTitle');
const loginHeroText = document.getElementById('loginHeroText');

let loginRepositoryImages = [];
let loginCurrentIndex = 0;
let loginSlideTimer = null;
let loginCurrentSlide = null;
let loginPrevSlide = null;
let loginConfig = null;
let loginPasswordVisible = false;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderLoginPasswordToggle() {
    if (!loginPasswordToggle) return;
    const eyeOpen = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEyIDVjNS41IDAgOS4xIDQuNiAxMCA3Yy0uOSAyLjQtNC41IDctMTAgN3MtOS4xLTQuNi0xMC03Yy45LTIuNCA0LjUtNyAxMC03Wm0wIDlhMiAyIDAgMSAwIDAtNCAyIDIgMCAwIDAgMCA0WiIvPjwvc3ZnPg==';
    const eyeClosed = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTMgM2wxOCAxOE0xMC41OCAxMC41OGEyIDIgMCAwIDAgMi44NCAyLjg0TTkuODggNS4wOGExMC45NCAxMC45NCAwIDAgMSAyLjEyLS4wOGM1LjUgMCA5LjEgNC42IDEwIDdjLS40MyAxLjE2LTEuNDQgMi43OC0zLjI1IDQuMDZNNi42MSA2LjYxQzQuOTIgOC4wMiAzLjk5IDkuNzUgMiAxMmMuOSAyLjQgNC41IDcgMTAgN2ExMC4zNSAxMC4zNSAwIDAgMCA0LjI0LS44OSIvPjwvc3ZnPg==';
    loginPasswordToggle.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${loginPasswordVisible ? eyeClosed : eyeOpen}');mask-image:url('${loginPasswordVisible ? eyeClosed : eyeOpen}');"></span>`;
    loginPasswordToggle.setAttribute('aria-label', loginPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    loginPasswordToggle.title = loginPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
}

function getStoredSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function readCache(key, ttlMs) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const storedAt = Number(parsed?.storedAt || 0);
        if (!storedAt || (Date.now() - storedAt) > ttlMs) {
            return null;
        }
        return parsed.data ?? null;
    } catch (error) {
        return null;
    }
}

function writeCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            storedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn('No fue posible actualizar el caché local.', error);
    }
}

function areJsonEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function preloadLoginImages(images, limit = 3) {
    (Array.isArray(images) ? images : [])
        .filter(Boolean)
        .slice(0, Math.max(0, limit))
        .forEach((url) => {
            const image = new Image();
            image.decoding = 'async';
            image.loading = 'eager';
            image.src = url;
        });
}

function setStoredSession(session, remember) {
    const payload = JSON.stringify(session);
    if (remember) {
        localStorage.setItem(SESSION_STORAGE_KEY, payload);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function loadRememberedCredentials() {
    try {
        const remembered = JSON.parse(localStorage.getItem(REMEMBER_STORAGE_KEY) || 'null');
        if (!remembered) return;
        loginUsername.value = remembered.username || '';
        loginPassword.value = remembered.password || '';
        loginRemember.checked = Boolean(remembered.username || remembered.password);
    } catch (error) {
        console.error(error);
    }
}

function persistRememberedCredentials() {
    if (loginRemember.checked) {
        localStorage.setItem(REMEMBER_STORAGE_KEY, JSON.stringify({
            username: loginUsername.value.trim(),
            password: loginPassword.value
        }));
        return;
    }
    localStorage.removeItem(REMEMBER_STORAGE_KEY);
}

function resolveRouteForLanding(key) {
    const map = {
        dashboard: '/dashboard',
        socios: '/socios',
        productos: '/productos',
        cotizaciones: '/cotizaciones',
        ordenes: '/ordenes-produccion',
        planificacion: '/planificacion/lanzamiento',
        calculos: '/flexo-calculo',
        costos: '/costos.html',
        'inventario-mp': '/inventario-materiales',
        'inventario-troqueles': '/inventario-troqueles',
        'inventario-maquinaria': '/inventario-maquinas',
        'configuracion-general': '/configuracion-general',
        vendedores: '/vendedores',
        sap: '/configuracion-general',
        seguimiento: '/ordenes-produccion',
        solicitudes: '/cotizaciones'
    };
    return map[key] || '/dashboard';
}

function normalizeLoginPermissionLevel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'view' || normalized === 'create' || normalized === 'edit') return normalized;
    return 'none';
}

function getLoginModuleAccessLevel(modules, moduleKey) {
    if (moduleKey === 'productos' && modules && !Object.prototype.hasOwnProperty.call(modules, 'productos')) {
        return normalizeLoginPermissionLevel(modules.cotizaciones);
    }
    return normalizeLoginPermissionLevel(modules?.[moduleKey]);
}

function getLoginRouteModules(route) {
    const pathname = new URL(route || '/', window.location.origin).pathname.toLowerCase();
    if (pathname === '/' || pathname === '/dashboard') return ['dashboard'];
    if (pathname === '/socios' || pathname.startsWith('/socios/')) return ['socios'];
    if (pathname === '/productos' || pathname.startsWith('/productos/')) return ['productos'];
    if (pathname === '/cotizaciones' || pathname.startsWith('/cotizaciones/')) return ['cotizaciones'];
    if (pathname === '/calculo-flexografia' || pathname === '/flexo-calculo') return ['calculos'];
    if (pathname === '/ordenes-produccion' || pathname.startsWith('/orden-produccion')) return ['ordenes'];
    if (pathname === '/planificacion' || pathname.startsWith('/planificacion/')) return ['planificacion'];
    if (pathname === '/costos' || pathname === '/costos.html') return ['costos'];
    if (pathname === '/configuracion-general') return ['configuracion-general'];
    if (pathname === '/vendedores') return ['vendedores'];
    if (pathname === '/inventario-materiales') return ['inventario-mp'];
    if (pathname === '/inventario-troqueles' || pathname.startsWith('/inventario-troqueles/')) return ['inventario-troqueles'];
    if (pathname === '/inventario-maquinas') return ['inventario-maquinaria'];
    if (pathname.startsWith('/inventario-')) return ['inventario-mp', 'inventario-troqueles', 'inventario-maquinaria'];
    return [];
}

function canOpenLoginLanding(session, route) {
    const modules = session?.modules && typeof session.modules === 'object' ? session.modules : null;
    if (!modules) return true;
    const keys = getLoginRouteModules(route);
    return !keys.length || keys.some((key) => key === 'dashboard' || getLoginModuleAccessLevel(modules, key) !== 'none');
}

function resolveAllowedLandingRoute(session) {
    const preferred = resolveRouteForLanding(session?.defaultLanding || 'dashboard');
    return canOpenLoginLanding(session, preferred) ? preferred : '/dashboard';
}

function getSlideSeconds() {
    return Math.max(4, Number(loginConfig?.general?.loginScreensaverSlideSeconds) || 10);
}

function getMotionSeconds() {
    return Math.max(8, Number(loginConfig?.general?.loginScreensaverMotionSeconds) || 16);
}

function getTransitionDuration() {
    return Math.max(800, Math.round(Math.min(getMotionSeconds() * 1000 * 0.28, 3000)));
}

function stopLoginScreensaver() {
    if (loginSlideTimer) {
        window.clearInterval(loginSlideTimer);
        loginSlideTimer = null;
    }
}

function clearLoginStage() {
    if (!loginHeroStage) return;
    loginHeroStage.querySelectorAll('.login-hero-slide').forEach((slide) => slide.remove());
    loginHeroStage.style.backgroundImage = '';
    loginHeroStage.style.backgroundSize = '';
    loginHeroStage.style.backgroundPosition = '';
    loginHeroStage.style.backgroundRepeat = '';
    loginCurrentSlide = null;
    loginPrevSlide = null;
}

function showLoginSlide(index) {
    if (!loginHeroStage || !loginRepositoryImages.length) return;
    loginCurrentIndex = ((index % loginRepositoryImages.length) + loginRepositoryImages.length) % loginRepositoryImages.length;
    const imageUrl = loginRepositoryImages[loginCurrentIndex];
    const transitionMs = getTransitionDuration();
    const motionSeconds = getMotionSeconds();

    if (loginHeroPlaceholder) {
        loginHeroPlaceholder.hidden = true;
    }
    if (loginHeroStage) {
        loginHeroStage.style.setProperty('background-image', `url("${imageUrl}")`, 'important');
        loginHeroStage.style.setProperty('background-size', 'cover', 'important');
        loginHeroStage.style.setProperty('background-position', 'center', 'important');
        loginHeroStage.style.setProperty('background-repeat', 'no-repeat', 'important');
    }

    const slide = document.createElement('img');
    slide.className = `login-hero-slide ${LOGIN_ANIM_VARIANTS[loginCurrentIndex % LOGIN_ANIM_VARIANTS.length]}`;
    slide.src = imageUrl;
    slide.alt = 'Imagen de acceso';
    slide.style.transition = `opacity ${transitionMs / 1000}s ease-in-out`;
    slide.style.animationDuration = `${motionSeconds}s`;
    loginHeroStage.appendChild(slide);

    if (loginPrevSlide) {
        loginPrevSlide.remove();
        loginPrevSlide = null;
    }

    if (loginCurrentSlide) {
        const old = loginCurrentSlide;
        old.style.opacity = '0';
        old.classList.add('leaving');
        loginPrevSlide = old;
        window.setTimeout(() => {
            if (loginPrevSlide === old) {
                old.remove();
                loginPrevSlide = null;
            }
        }, transitionMs + 120);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            slide.classList.add('active');
        });
    });

    loginCurrentSlide = slide;
}

function startLoginScreensaver(images) {
    stopLoginScreensaver();
    clearLoginStage();
    loginRepositoryImages = Array.isArray(images) ? images.filter(Boolean) : [];

    if (!loginRepositoryImages.length) {
        if (loginHeroPlaceholder) {
            loginHeroPlaceholder.hidden = false;
        }
        return;
    }

    showLoginSlide(0);
    preloadLoginImages(loginRepositoryImages.slice(1), 2);

    if (loginRepositoryImages.length > 1) {
        loginSlideTimer = window.setInterval(() => {
            showLoginSlide(loginCurrentIndex + 1);
        }, getSlideSeconds() * 1000);
    }
}

function applyLoginBranding(config, repositoryImages = []) {
    loginConfig = config || {};
    const companyName = config?.branding?.companyName || 'PrintLab';
    const logoUrl = config?.branding?.logoUrl || config?.branding?.companyLogoUrl || '';
    const accent = config?.general?.headerBgEnd || '#118fc6';
    const accentStrong = config?.general?.headerBgStart || '#0b81b8';

    document.documentElement.style.setProperty('--login-accent', accent);
    document.documentElement.style.setProperty('--login-accent-strong', accentStrong);

    if (loginCompanyName) loginCompanyName.textContent = companyName;
    if (loginHeroTitle) loginHeroTitle.textContent = `${companyName} centraliza el trabajo diario con claridad y control.`;
    if (loginHeroText) loginHeroText.textContent = 'Ingresa para continuar con tus módulos asignados y entrar directamente a tu flujo de trabajo.';

    if (loginBrandLogo) {
        loginBrandLogo.innerHTML = logoUrl
            ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}">`
            : `<span style="font-weight:700;color:${accentStrong};">${escapeHtml(companyName.slice(0, 2).toUpperCase())}</span>`;
    }

    startLoginScreensaver(repositoryImages);
}

async function loadConfig() {
    const cachedConfig = readCache(LOGIN_CONFIG_CACHE_KEY, LOGIN_CONFIG_CACHE_TTL_MS);
    const cachedRepository = readCache(LOGIN_REPOSITORY_CACHE_KEY, LOGIN_REPOSITORY_CACHE_TTL_MS);
    const cachedImages = Array.isArray(cachedRepository?.images)
        ? cachedRepository.images.map((item) => item?.url).filter(Boolean)
        : [];

    if (cachedConfig) {
        applyLoginBranding(cachedConfig, cachedImages);
    }

    const [configResponse, repositoryResponse] = await Promise.allSettled([
        fetch(LOGIN_CONFIG_ENDPOINT, { cache: 'no-cache' }),
        fetch(LOGIN_REPOSITORY_ENDPOINT, { cache: 'no-cache' })
    ]);

    const configFetchFailed = configResponse.status !== 'fulfilled' || !configResponse.value.ok;
    if (configFetchFailed && !cachedConfig) {
        throw new Error('No fue posible cargar la configuración del login.');
    }

    const config = !configFetchFailed ? await configResponse.value.json() : cachedConfig;
    let repository = cachedRepository;
    if (repositoryResponse.status === 'fulfilled' && repositoryResponse.value.ok) {
        repository = await repositoryResponse.value.json();
    }

    const repositoryImages = Array.isArray(repository?.images)
        ? repository.images.map((item) => item?.url).filter(Boolean)
        : [];

    if (!areJsonEqual(config, cachedConfig)) {
        writeCache(LOGIN_CONFIG_CACHE_KEY, config);
    }
    if (!areJsonEqual(repository, cachedRepository)) {
        writeCache(LOGIN_REPOSITORY_CACHE_KEY, repository);
    }

    if (!cachedConfig || !areJsonEqual(config, cachedConfig) || !areJsonEqual(repository, cachedRepository)) {
        applyLoginBranding(config, repositoryImages);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
        loginStatus.textContent = 'Ingresa usuario y contraseña.';
        return;
    }

    loginStatus.textContent = 'Validando acceso...';

    try {
        const response = await fetch(LOGIN_AUTH_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error || 'No fue posible iniciar sesión.');
        }
        persistRememberedCredentials();
        setStoredSession(data.user, loginRemember.checked);
        loginStatus.textContent = '';
        window.location.href = resolveAllowedLandingRoute(data.user);
    } catch (error) {
        loginStatus.textContent = error.message || 'No fue posible iniciar sesión.';
    }
}

async function bootLogin() {
    renderLoginPasswordToggle();
    loginPasswordToggle?.addEventListener('click', () => {
        loginPasswordVisible = !loginPasswordVisible;
        if (loginPassword) {
            loginPassword.type = loginPasswordVisible ? 'text' : 'password';
        }
        renderLoginPasswordToggle();
    });
    loadRememberedCredentials();
    const existingSession = getStoredSession();
    if (existingSession?.username && window.location.search.includes('continue=1')) {
        window.location.href = resolveAllowedLandingRoute(existingSession);
        return;
    }
    try {
        await loadConfig();
    } catch (error) {
        loginStatus.textContent = error.message || 'No fue posible preparar la pantalla de acceso.';
    }
}

loginForm?.addEventListener('submit', handleLogin);

bootLogin();
