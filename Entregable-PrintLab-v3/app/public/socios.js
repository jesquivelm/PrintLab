const CONFIG_ENDPOINT = '/api/config/shell';
const SOCIOS_ENDPOINT = '/api/socios';
const PRESENTATION_KEY = 'socios';

const sociosSearchInput = document.getElementById('sociosSearchInput');
const sociosTableBody = document.getElementById('sociosTableBody');
const sociosTableWrap = document.querySelector('.quote-browser-table-wrap');
const sociosScrollBottomIndicator = document.getElementById('sociosScrollBottomIndicator');
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
const sociosImportPopover = document.getElementById('sociosImportPopover');
const cerrarSociosImportPopoverButton = document.getElementById('cerrarSociosImportPopoverButton');
const cancelarSociosImportPopoverButton = document.getElementById('cancelarSociosImportPopoverButton');
const ejecutarSociosImportButton = document.getElementById('ejecutarSociosImportButton');
const sociosImportPopoverSummary = document.getElementById('sociosImportPopoverSummary');
const sociosImportLimitInput = document.getElementById('sociosImportLimitInput');
const sociosImportPopoverStatus = document.getElementById('sociosImportPopoverStatus');

let browserConfig = null;
let currentSearch = '';
let sociosImportStatusTimer = null;
let sociosImportDiagnosis = null;
let sociosVisibleCount = 0;
let sociosSortState = { key: null, dir: null };

function getSociosSortIcon(dir) {
    const config = browserConfig || {};
    const icons = config.icons || {};
    const general = config.general || {};
    const key = dir === 'asc' ? 'sortAsc' : 'sortDesc';
    return {
        value: icons[key] || (dir === 'asc' ? '\u25B2' : '\u25BC'),
        color: firstFilled(general['iconColorSortAsc'], general.iconColor, '#607286'),
        size: Number(firstFilled(general['iconSizeSortAsc'], '14')) || 14
    };
}

function sortSociosList(data) {
    if (!sociosSortState.key || !sociosSortState.dir) return data;
    return [...data].sort((a, b) => {
        const key = sociosSortState.key;
        let va = a[key], vb = b[key];
        if (va == null) return 1;
        if (vb == null) return -1;
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        if (va < vb) return sociosSortState.dir === 'asc' ? -1 : 1;
        if (va > vb) return sociosSortState.dir === 'asc' ? 1 : -1;
        const da = a.created_at_tz, db = b.created_at_tz;
        if (da && db) return new Date(db) - new Date(da);
        return 0;
    });
}

function updateSociosSortIndicators() {
    const ascConf = getSociosSortIcon('asc');
    const descConf = getSociosSortIcon('desc');
    document.querySelectorAll('th[data-sort-key]').forEach(th => {
        const span = th.querySelector('.sort-indicator');
        if (!span) return;
        if (sociosSortState.key === th.dataset.sortKey) {
            th.classList.add('is-sorted');
            const conf = sociosSortState.dir === 'asc' ? ascConf : descConf;
            span.innerHTML = iconMarkup(conf.value, 'Orden ' + (sociosSortState.dir === 'asc' ? 'ascendente' : 'descendente'), 'sort-indicator-icon');
            span.style.setProperty('--icon-color', conf.color);
            span.style.setProperty('--config-icon-size', conf.size + 'px');
        } else {
            th.classList.remove('is-sorted');
            span.innerHTML = '';
            span.style.removeProperty('--icon-color');
            span.style.removeProperty('--config-icon-size');
        }
    });
}

function formatVisibleCountLabel(count, noun) {
    const total = Math.max(0, Number(count) || 0);
    return `${total} ${noun}${total === 1 ? '' : 's'} mostrados`;
}

function updateSociosScrollBottomIndicator() {
    if (!sociosTableWrap || !sociosScrollBottomIndicator) return;
    const hasScrollableContent = sociosTableWrap.scrollHeight - sociosTableWrap.clientHeight > 6;
    const distanceToBottom = sociosTableWrap.scrollHeight - sociosTableWrap.scrollTop - sociosTableWrap.clientHeight;
    const shouldShow = sociosVisibleCount > 0 && (!hasScrollableContent || distanceToBottom <= 8);
    sociosScrollBottomIndicator.textContent = formatVisibleCountLabel(sociosVisibleCount, 'registro');
    sociosScrollBottomIndicator.classList.toggle('is-visible', shouldShow);
}

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
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
}

function isImageValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/') || /\.(svg|png|jpe?g|webp|gif)(\?|#|$)/i.test(normalized);
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

function getDeleteIconConfig() {
    const general = browserConfig?.general || {};
    const presentation = getPresentationConfig(browserConfig || {}, PRESENTATION_KEY);
    return {
        value: browserConfig?.icons?.lineDelete || browserConfig?.icons?.loginRepositoryDelete || browserConfig?.icons?.adminUserDelete || 'X',
        color: firstFilled(general.iconColorLineDelete, general.iconColor, '#a74343'),
        hover: firstFilled(general.iconColorHoverLineDelete, '#d03535'),
        size: Number(firstFilled(general.iconSizeLineDelete, presentation.iconSize, 18)) || 18
    };
}

function setActionButtonIcon(button, iconValue, label, color, size) {
    if (!button) return;
    const iconMarkupValue = iconMarkup(iconValue, label, 'table-icon-media');
    button.innerHTML = `${iconMarkupValue}<span class="quote-browser-action-label">${escapeHtml(label)}</span>`;
    button.style.setProperty('--icon-color', color || '#178fc7');
    button.style.setProperty('--config-icon-size', `${Number(size) || 16}px`);
    button.setAttribute('aria-label', label);
}

function applyBrowserConfig(config) {
    browserConfig = config || {};
    const root = document.documentElement;
    const presentation = getPresentationConfig(browserConfig, PRESENTATION_KEY);
    root.style.setProperty('--tab-color', presentation.tabColor);

    const general = browserConfig?.general || {};
    const addValue = browserConfig?.icons?.tableAdd || browserConfig?.icons?.quantityAdd || '+';
    const refreshValue = browserConfig?.icons?.refreshCosts || browserConfig?.icons?.mobileRefresh || '↻';
    const addColor = firstFilled(general.iconColorTableAdd, general.iconColorQuantityAdd, general.iconColor, '#178fc7');
    const refreshColor = firstFilled(general.iconColorRefreshCosts, general.iconColorMobileRefresh, general.iconColor, '#178fc7');
    const addSize = Number(firstFilled(general.iconSizeTableAdd, general.iconSizeQuantityAdd, presentation.iconSize, 16)) || 16;
    const refreshSize = Number(firstFilled(general.iconSizeRefreshCosts, general.iconSizeMobileRefresh, presentation.iconSize, 16)) || 16;

    setActionButtonIcon(nuevoSocioButton, addValue, 'Nuevo', addColor, addSize);
    setActionButtonIcon(importarSociosSapButton, refreshValue, 'Actualizar desde SAP', refreshColor, refreshSize);
    setActionButtonIcon(refreshSociosButton, refreshValue, 'Refrescar', refreshColor, refreshSize);
    if (nuevoSocioButton) {
        nuevoSocioButton.hidden = window.ErpAccess?.canCreateModule
            ? !window.ErpAccess.canCreateModule('socios')
            : false;
    }
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
    sociosVisibleCount = items.length;
    const openIcon = getOpenIconConfig();
    const deleteIcon = getDeleteIconConfig();

    const displayItems = sortSociosList(items);
    updateSociosSortIndicators();
    sociosTableBody.innerHTML = displayItems.length ? displayItems.map((item) => `
        <tr>
            <td>${escapeHtml(item.partner_code)}</td>
            <td>${escapeHtml(item.partner_name)}</td>
            <td>${escapeHtml(item.salesperson_name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.sector)}</td>
            <td title="${escapeHtml(item.created_at_tz || item.creation_date || '')}">${escapeHtml(formatDate(item.creation_date))}</td>
            <td>
                <div class="quote-browser-actions">
                    <button type="button" class="browser-open-link" data-open-socio="${escapeHtml(item.partner_code)}" aria-label="Abrir socio ${escapeHtml(item.partner_code)}" title="Abrir socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir socio', 'table-icon-media')}</button>
                    <button type="button" class="browser-open-link browser-open-link-danger" data-delete-socio="${escapeHtml(item.partner_code)}" aria-label="Eliminar socio ${escapeHtml(item.partner_code)}" title="Eliminar socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(deleteIcon.color)};--icon-hover-color:${escapeHtml(deleteIcon.hover)};--config-icon-size:${escapeHtml(String(deleteIcon.size))}px;">${iconMarkup(deleteIcon.value, 'Eliminar socio', 'table-icon-media')}</button>
                </div>
            </td>
        </tr>`).join('') : '<tr><td colspan="7">No hay socios registrados.</td></tr>';
    requestAnimationFrame(updateSociosScrollBottomIndicator);
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

        let mensaje = `Socio ${result?.socio?.partner_code || ''} creado correctamente.`;
        if (result?.sap?.enviado) {
            mensaje += ' Sincronizado con SAP.';
        } else if (result?.sap?.error) {
            mensaje += ` SAP: ${result.sap.error}`;
        } else if (result?.sap?.pendiente) {
            mensaje += ' Enviando a SAP...';
        }
        setCreateStatus(mensaje);
        await loadSocios(currentSearch);
        guardarNuevoSocioButton.disabled = false;
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

function setSociosImportPopoverStatus(message, isError = false) {
    if (!sociosImportPopoverStatus) return;
    sociosImportPopoverStatus.hidden = !message;
    sociosImportPopoverStatus.textContent = message || '';
    sociosImportPopoverStatus.classList.toggle('is-error', Boolean(message && isError));
    sociosImportPopoverStatus.classList.toggle('is-success', Boolean(message && !isError));
}

function renderSociosImportDiagnosis(summary = {}) {
    if (!sociosImportPopoverSummary) return;
    const cards = [
        ['Disponibles', Number(summary.importable || 0)],
        ['Total leídos', Number(summary.total || 0)],
        ['Duplicados código', Number(summary.duplicateByCode || 0)],
        ['Duplicados ID', Number(summary.duplicateByTaxId || 0)],
        ['Duplicados ambos', Number(summary.duplicateByBoth || 0)],
        ['Sin código/ID', Number(summary.skippedWithoutCode || 0) + Number(summary.skippedWithoutTaxId || 0)]
    ];
    sociosImportPopoverSummary.innerHTML = cards.map(([label, value]) => `
        <div class="socios-import-diagnosis-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
        </div>
    `).join('');
}

async function runSociosImportDiagnosis() {
    setSociosImportPopoverStatus('Consultando y diagnosticando socios en SAP...');
    sociosImportPopoverSummary.innerHTML = '';
    ejecutarSociosImportButton.disabled = true;

    const response = await fetch('/api/socios/importar-sap/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible diagnosticar socios desde SAP.');
    }

    sociosImportDiagnosis = payload.summary || {};
    renderSociosImportDiagnosis(sociosImportDiagnosis);
    const importable = Number(sociosImportDiagnosis.importable || 0);
    if (sociosImportLimitInput) {
        sociosImportLimitInput.max = String(Math.max(importable, 1));
        sociosImportLimitInput.value = importable ? String(importable) : '';
    }
    ejecutarSociosImportButton.disabled = importable <= 0;
    setSociosImportPopoverStatus(importable > 0 ? 'Diagnóstico listo. Indica cuántos quieres importar.' : 'No hay socios nuevos disponibles para importar.', importable <= 0);
}

function openSociosImportPopover() {
    if (!sociosImportPopover) return;
    sociosImportPopover.hidden = false;
    document.body.classList.add('popover-open');
    sociosImportDiagnosis = null;
    if (sociosImportLimitInput) {
        sociosImportLimitInput.value = '';
        sociosImportLimitInput.removeAttribute('max');
    }
    runSociosImportDiagnosis().catch((error) => {
        setSociosImportPopoverStatus(error.message || 'No fue posible diagnosticar socios desde SAP.', true);
    });
}

function closeSociosImportPopover() {
    if (!sociosImportPopover) return;
    sociosImportPopover.hidden = true;
    document.body.classList.remove('popover-open');
    sociosImportDiagnosis = null;
    setSociosImportPopoverStatus('');
}

async function executeSociosImportFromPopover() {
    const importable = Number(sociosImportDiagnosis?.importable || 0);
    if (importable <= 0) {
        throw new Error('No hay socios nuevos para importar.');
    }

    const requested = Number(sociosImportLimitInput?.value || importable);
    const safeLimit = Math.min(importable, Math.max(1, Math.floor(requested || importable)));

    ejecutarSociosImportButton.disabled = true;
    setSociosImportPopoverStatus(`Importando ${safeLimit} socios desde SAP...`);
    setImportStatus('Importando socios desde SAP...', false, true);

    const response = await fetch('/api/socios/importar-sap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: safeLimit })
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible importar socios desde SAP.');
    }

    await loadSocios(currentSearch);
    setSociosImportPopoverStatus(payload.message || `Importación completada. ${payload.summary?.inserted || 0} socios cargados.`);
    setImportStatus(buildImportSummaryText(payload.summary || {}), false, false);
    ejecutarSociosImportButton.disabled = false;
}

async function deleteSocio(partnerCode) {
    const code = String(partnerCode || '').trim();
    if (!code) return;
    const confirmed = window.confirm(`Se eliminara el socio ${code}. Esta accion no se puede deshacer. Deseas continuar?`);
    if (!confirmed) return;

    const response = await fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(code)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible eliminar el socio.');
    }
    await loadSocios(currentSearch);
    setImportStatus(`Socio ${code} eliminado correctamente.`, false, false);
}

sociosSearchInput?.addEventListener('input', () => {
    loadSocios(sociosSearchInput.value).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});

sociosTableBody?.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-socio]');
    if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        deleteSocio(deleteButton.dataset.deleteSocio || '').catch((error) => {
            setImportStatus(error.message || 'No fue posible eliminar el socio.', true, false);
        });
        return;
    }
    const button = event.target.closest('[data-open-socio]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openSocioRoute(button.dataset.openSocio || '');
});

nuevoSocioButton?.addEventListener('click', openCreatePopover);
importarSociosSapButton?.addEventListener('click', openSociosImportPopover);
refreshSociosButton?.addEventListener('click', () => {
    loadSocios(currentSearch).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    });
});
cerrarNuevoSocioButton?.addEventListener('click', closeCreatePopover);
cancelarNuevoSocioButton?.addEventListener('click', closeCreatePopover);
cerrarSociosImportPopoverButton?.addEventListener('click', closeSociosImportPopover);
cancelarSociosImportPopoverButton?.addEventListener('click', closeSociosImportPopover);
ejecutarSociosImportButton?.addEventListener('click', () => {
    executeSociosImportFromPopover().catch((error) => {
        ejecutarSociosImportButton.disabled = false;
        setSociosImportPopoverStatus(error.message || 'No fue posible importar socios desde SAP.', true);
        setImportStatus(error.message || 'No fue posible importar socios desde SAP.', true, false);
    });
});
nuevoSocioPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-popover="true"]')) {
        closeCreatePopover();
    }
});
sociosImportPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-import-popover="true"]')) {
        closeSociosImportPopover();
    }
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nuevoSocioPopover && !nuevoSocioPopover.hidden) {
        closeCreatePopover();
    }
    if (event.key === 'Escape' && sociosImportPopover && !sociosImportPopover.hidden) {
        closeSociosImportPopover();
    }
});
nuevoSocioForm?.addEventListener('submit', createSocio);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadSocios(currentSearch).catch(() => {});
    }
});

sociosTableBody?.closest('table')?.querySelector('thead')?.addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort-key]');
    if (!th) return;
    const key = th.dataset.sortKey;
    if (sociosSortState.key === key) {
        sociosSortState.dir = sociosSortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sociosSortState.key = key;
        sociosSortState.dir = 'asc';
    }
    loadSocios(currentSearch).catch(() => {});
});

sociosTableWrap?.addEventListener('scroll', updateSociosScrollBottomIndicator, { passive: true });
window.addEventListener('resize', updateSociosScrollBottomIndicator);

async function init() {
    try {
        await loadConfig();
        await loadSocios();
    } catch (error) {
        sociosTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
