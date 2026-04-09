const LOGIN_CONFIG_ENDPOINT = '/api/config/general';
const LOGIN_REPOSITORY_ENDPOINT = '/api/login-repository';
const LOGIN_AUTH_ENDPOINT = '/api/auth/login';
const SESSION_STORAGE_KEY = 'erp-user-session';
const REMEMBER_STORAGE_KEY = 'erp-remembered-login';
const LOGIN_ANIM_VARIANTS = ['anim-0', 'anim-1', 'anim-2'];

const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getStoredSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
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
        seguimiento: '/ordenes-produccion',
        solicitudes: '/cotizaciones'
    };
    return map[key] || '/dashboard';
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
    const [configResponse, repositoryResponse] = await Promise.all([
        fetch(LOGIN_CONFIG_ENDPOINT),
        fetch(LOGIN_REPOSITORY_ENDPOINT)
    ]);
    if (!configResponse.ok) {
        throw new Error('No fue posible cargar la configuración del login.');
    }
    const config = await configResponse.json();
    let repositoryImages = [];
    if (repositoryResponse.ok) {
        const repository = await repositoryResponse.json();
        repositoryImages = Array.isArray(repository?.images)
            ? repository.images.map((item) => item?.url).filter(Boolean)
            : [];
    }
    applyLoginBranding(config, repositoryImages);
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
        window.location.href = resolveRouteForLanding(data.user?.defaultLanding || 'dashboard');
    } catch (error) {
        loginStatus.textContent = error.message || 'No fue posible iniciar sesión.';
    }
}

async function bootLogin() {
    loadRememberedCredentials();
    const existingSession = getStoredSession();
    if (existingSession?.username && window.location.search.includes('continue=1')) {
        window.location.href = resolveRouteForLanding(existingSession.defaultLanding || 'dashboard');
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
