const CONFIG_ENDPOINT = '/api/config/general';
const SOCIOS_ENDPOINT = '/api/socios';
const PRESENTATION_KEY = 'socios';

const sociosSearchInput = document.getElementById('sociosSearchInput');
const sociosTableBody = document.getElementById('sociosTableBody');
const nuevoSocioButton = document.getElementById('nuevoSocioButton');
const refreshSociosButton = document.getElementById('refreshSociosButton');
const nuevoSocioPopover = document.getElementById('nuevoSocioPopover');
const cerrarNuevoSocioButton = document.getElementById('cerrarNuevoSocioButton');
const cancelarNuevoSocioButton = document.getElementById('cancelarNuevoSocioButton');
const nuevoSocioForm = document.getElementById('nuevoSocioForm');
const nuevoSocioStatus = document.getElementById('nuevoSocioStatus');
const guardarNuevoSocioButton = document.getElementById('guardarNuevoSocioButton');

let browserConfig = null;
let currentSearch = '';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isShellEmbedded() {
    return window !== window.parent && new URLSearchParams(window.location.search).get('shell') === '1';
}

function isSvgValue(value) {
    return String(value || '').trim().startsWith('data:image/svg+xml');
}

function isImageValue(value) {
    return String(value || '').trim().startsWith('data:image/');
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
        tabColor: presentation.tabColor || general.tabColor || '#7f7f7f',
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

function applyBrowserConfig(config) {
    browserConfig = config || {};
    const root = document.documentElement;
    const presentation = getPresentationConfig(browserConfig, PRESENTATION_KEY);
    root.style.setProperty('--tab-color', presentation.tabColor);
}

async function loadConfig() {
    const response = await fetch(CONFIG_ENDPOINT);
    if (!response.ok) throw new Error('No se pudo cargar la configuracion.');
    applyBrowserConfig(await response.json());
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

async function loadSocios(search = '') {
    currentSearch = search;
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('q', search);

    const response = await fetch(`${SOCIOS_ENDPOINT}?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los socios.');
    }

    const items = payload.socios || [];
    const openIcon = getOpenIconConfig();

    sociosTableBody.innerHTML = items.length ? items.map((item) => {
        const route = `/socios-documento.html?codigo=${encodeURIComponent(item.partner_code)}`;
        return `
        <tr>
            <td>${escapeHtml(item.partner_code)}</td>
            <td>${escapeHtml(item.partner_name)}</td>
            <td>${escapeHtml(item.salesperson_name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.sector)}</td>
            <td>${escapeHtml(formatDate(item.creation_date))}</td>
            <td><a class="browser-open-link" href="${route}" data-route="${route}" data-label="Socio ${escapeHtml(item.partner_code)}" aria-label="Abrir socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir socio', 'table-icon-media')}</a></td>
        </tr>`;
    }).join('') : '<tr><td colspan="7">No hay socios registrados.</td></tr>';
}

function setCreateStatus(message, isError = false) {
    nuevoSocioStatus.hidden = !message;
    nuevoSocioStatus.textContent = message || '';
    nuevoSocioStatus.classList.toggle('is-error', Boolean(message && isError));
    nuevoSocioStatus.classList.toggle('is-success', Boolean(message && !isError));
}

function openCreatePopover() {
    nuevoSocioPopover.hidden = false;
    document.body.classList.add('popover-open');
    setCreateStatus('');
    window.setTimeout(() => {
        nuevoSocioForm?.querySelector('input[name="partner_name"]')?.focus();
    }, 30);
}

function closeCreatePopover() {
    nuevoSocioPopover.hidden = true;
    document.body.classList.remove('popover-open');
    setCreateStatus('');
    nuevoSocioForm?.reset();
    const currencyField = nuevoSocioForm?.elements?.namedItem('currency_code');
    const paymentTermsField = nuevoSocioForm?.elements?.namedItem('payment_terms');
    if (currencyField) currencyField.value = 'USD';
    if (paymentTermsField) paymentTermsField.value = 'Contado';
}

async function createSocio(event) {
    event.preventDefault();
    if (!nuevoSocioForm) return;

    const formData = new FormData(nuevoSocioForm);
    const payload = Object.fromEntries(formData.entries());
    guardarNuevoSocioButton.disabled = true;
    setCreateStatus('Guardando...');

    try {
        const response = await fetch(SOCIOS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok) {
            if (result?.existing?.partner_code) {
                throw new Error(`Ya existe el registro ${result.existing.partner_code} - ${result.existing.partner_name}.`);
            }
            throw new Error(result.error || 'No fue posible crear el socio.');
        }

        setCreateStatus(`Socio ${result?.socio?.partner_code || ''} creado correctamente.`);
        await loadSocios(currentSearch);
        window.setTimeout(() => {
            closeCreatePopover();
        }, 500);
    } catch (error) {
        setCreateStatus(error.message || 'No fue posible crear el socio.', true);
    } finally {
        guardarNuevoSocioButton.disabled = false;
    }
}

sociosSearchInput?.addEventListener('input', () => {
    loadSocios(sociosSearchInput.value).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});

sociosTableBody?.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    if (openRouteInShell(link.dataset.route, link.dataset.label)) {
        event.preventDefault();
    }
});

nuevoSocioButton?.addEventListener('click', openCreatePopover);
refreshSociosButton?.addEventListener('click', () => {
    loadSocios(currentSearch).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});
cerrarNuevoSocioButton?.addEventListener('click', closeCreatePopover);
cancelarNuevoSocioButton?.addEventListener('click', closeCreatePopover);
nuevoSocioPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-popover="true"]')) {
        closeCreatePopover();
    }
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nuevoSocioPopover && !nuevoSocioPopover.hidden) {
        closeCreatePopover();
    }
});
nuevoSocioForm?.addEventListener('submit', createSocio);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadSocios(currentSearch).catch(() => {});
    }
});
window.addEventListener('focus', () => {
    loadSocios(currentSearch).catch(() => {});
});

async function init() {
    try {
        await loadConfig();
        await loadSocios();
    } catch (error) {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
