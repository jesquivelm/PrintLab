const CONFIG_ENDPOINT = '/api/config/general';
const SOCIOS_ENDPOINT = '/api/socios';
const PRESENTATION_KEY = 'socios';

const sociosSearchInput = document.getElementById('sociosSearchInput');
const sociosTableBody = document.getElementById('sociosTableBody');
const nuevoSocioButton = document.getElementById('nuevoSocioButton');
const importarSociosSapButton = document.getElementById('importarSociosSapButton');
const refreshSociosButton = document.getElementById('refreshSociosButton');
const sociosImportStatus = document.getElementById('sociosImportStatus');
const nuevoSocioPopover = document.getElementById('nuevoSocioPopover');
const cerrarNuevoSocioButton = document.getElementById('cerrarNuevoSocioButton');
const cancelarNuevoSocioButton = document.getElementById('cancelarNuevoSocioButton');
const nuevoSocioForm = document.getElementById('nuevoSocioForm');
const nuevoSocioStatus = document.getElementById('nuevoSocioStatus');
const guardarNuevoSocioButton = document.getElementById('guardarNuevoSocioButton');

let browserConfig = null;
let currentSearch = '';
let sociosImportStatusTimer = null;

function openSocioRoute(partnerCode) {
    if (!partnerCode) return;
    const route = `/socios-documento.html?codigo=${encodeURIComponent(partnerCode)}`;
    const label = `Socio ${partnerCode}`;
    if (!openRouteInShell(route, label)) {
        window.location.href = route;
    }
}

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
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        return false;
    }
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

    sociosTableBody.innerHTML = items.length ? items.map((item) => `
        <tr>
            <td>${escapeHtml(item.partner_code)}</td>
            <td>${escapeHtml(item.partner_name)}</td>
            <td>${escapeHtml(item.salesperson_name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.sector)}</td>
            <td>${escapeHtml(formatDate(item.creation_date))}</td>
            <td><button type="button" class="browser-open-link" data-open-socio="${escapeHtml(item.partner_code)}" aria-label="Abrir socio ${escapeHtml(item.partner_code)}" title="Abrir socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir socio', 'table-icon-media')}</button></td>
        </tr>`).join('') : '<tr><td colspan="7">No hay socios registrados.</td></tr>';
}

function setCreateStatus(message, isError = false) {
    nuevoSocioStatus.hidden = !message;
    nuevoSocioStatus.textContent = message || '';
    nuevoSocioStatus.classList.toggle('is-error', Boolean(message && isError));
    nuevoSocioStatus.classList.toggle('is-success', Boolean(message && !isError));
}

function setImportStatus(message, isError = false, persistent = false) {
    if (!sociosImportStatus) return;
    if (sociosImportStatusTimer) {
        window.clearTimeout(sociosImportStatusTimer);
        sociosImportStatusTimer = null;
    }
    sociosImportStatus.hidden = !message;
    sociosImportStatus.textContent = message || '';
    sociosImportStatus.classList.toggle('is-error', Boolean(message && isError));
    sociosImportStatus.classList.toggle('is-success', Boolean(message && !isError));

    if (message && !persistent) {
        sociosImportStatusTimer = window.setTimeout(() => {
            sociosImportStatus.hidden = true;
            sociosImportStatus.textContent = '';
            sociosImportStatus.classList.remove('is-error', 'is-success');
            sociosImportStatusTimer = null;
        }, 7000);
    }
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

function buildImportSummaryText(summary = {}) {
    return [
        `${Number(summary.inserted || 0)} cargados`,
        `${Number(summary.duplicateByCode || 0)} duplicados por código`,
        `${Number(summary.duplicateByTaxId || 0)} duplicados por ID fiscal`,
        `${Number(summary.duplicateByBoth || 0)} duplicados por ambos`,
        `${Number(summary.skippedWithoutTaxId || 0)} sin ID fiscal`,
        `${Number(summary.skippedWithoutCode || 0)} sin código`
    ].join(' · ');
}

async function importSociosFromSap() {
    if (!importarSociosSapButton) return;
    importarSociosSapButton.disabled = true;
    setImportStatus('Actualizando socios desde SAP...', false, true);

    try {
        const response = await fetch('/api/socios/importar-sap', { method: 'POST' });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || 'No fue posible importar socios desde SAP.');
        }

        await loadSocios(currentSearch);
        setImportStatus(buildImportSummaryText(payload.summary || {}), false, false);
    } catch (error) {
        setImportStatus(error.message || 'No fue posible importar socios desde SAP.', true, false);
    } finally {
        importarSociosSapButton.disabled = false;
    }
}

sociosSearchInput?.addEventListener('input', () => {
    loadSocios(sociosSearchInput.value).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});

sociosTableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-socio]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openSocioRoute(button.dataset.openSocio || '');
});

nuevoSocioButton?.addEventListener('click', openCreatePopover);
importarSociosSapButton?.addEventListener('click', () => {
    importSociosFromSap().catch((error) => {
        setImportStatus(error.message || 'No fue posible importar socios desde SAP.', true, false);
    });
});
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

async function init() {
    try {
        await loadConfig();
        await loadSocios();
    } catch (error) {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
