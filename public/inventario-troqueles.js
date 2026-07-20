const CONFIG_ENDPOINT = '/api/config/shell';
const TROQUELES_ENDPOINT = '/api/inventario/troqueles';
const PRESENTATION_KEY = 'inventario-troqueles';

const troquelesSearchInput = document.getElementById('troquelesSearchInput');
const troquelesTableBody = document.getElementById('troquelesTableBody');
const troquelesTableHeader = document.getElementById('troquelesTableHeader');
const troquelNewButton = document.getElementById('troquelNewButton');
const troquelCreatePopover = document.getElementById('troquelCreatePopover');
const troquelCreateSaveBtn = document.getElementById('troquelCreateSaveBtn');
const troquelCreateStatus = document.getElementById('troquelCreateStatus');
const modalTroquelFormato = document.getElementById('modalTroquelFormato');
const troquelDetailPopover = document.getElementById('troquelDetailPopover');
const troquelDetailForm = document.getElementById('troquelDetailForm');
const troquelDetailSaveBtn = document.getElementById('troquelDetailSaveBtn');
const troquelDetailTitle = document.getElementById('troquelDetailTitle');
let editingTroquelCode = '';

let browserConfig = null;
let troquelSortState = { key: null, dir: null };

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isShellEmbedded() {
    return window !== window.parent && new URLSearchParams(window.location.search).get('shell') === '1';
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function formatDate(value) {
    if (!value) return '\u2014';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return value; }
}

function formatCellValue(value, digits = 4) {
    if (value === null || value === undefined || value === '') return '\u2014';
    const numeric = Number(value);
    if (Number.isFinite(numeric) && String(value).trim() !== '') {
        return new Intl.NumberFormat('es-CR', { maximumFractionDigits: digits }).format(numeric);
    }
    return String(value);
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

function sortTroquelList(data) {
    const state = troquelSortState;
    if (!state.key) return data;
    const arr = [...data];
    arr.sort((a, b) => {
        const aVal = a[state.key];
        const bVal = b[state.key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return state.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return arr;
}

function getTroquelSortIcon(dir) {
    const config = browserConfig || {};
    const icons = config.icons || {};
    const general = config.general || {};
    const key = dir === 'asc' ? 'sortAsc' : 'sortDesc';
    return {
        value: icons[key] || (dir === 'asc' ? '\u25B2' : '\u25BC'),
        color: firstFilled(general.iconColorSortAsc, general.iconColor, '#607286'),
        size: Number(firstFilled(general.iconSizeSortAsc, '14')) || 14
    };
}

function updateTroquelSortIndicators() {
    const headers = document.querySelectorAll('#troquelesTableHeader th[data-sort-key]');
    headers.forEach((th) => {
        const key = th.dataset.sortKey;
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        th.classList.remove('is-sorted');
        indicator.innerHTML = '';
        if (troquelSortState.key === key && troquelSortState.dir) {
            th.classList.add('is-sorted');
            const icon = getTroquelSortIcon(troquelSortState.dir);
            indicator.innerHTML = iconMarkup(icon.value, troquelSortState.dir === 'asc' ? 'Ascendente' : 'Descendente', '');
            indicator.style.setProperty('--icon-color', icon.color);
            indicator.style.setProperty('--config-icon-size', `${icon.size}px`);
        }
    });
}

function setActionButtonIcon(button, iconValue, label, color, size) {
    if (!button) return;
    const iconMarkupValue = iconMarkup(iconValue, label, 'table-icon-media');
    button.innerHTML = `${iconMarkupValue}<span class="quote-browser-action-label">${escapeHtml(label)}</span>`;
    button.style.setProperty('--icon-color', color || '#178fc7');
    button.style.setProperty('--config-icon-size', `${Number(size) || 18}px`);
    button.setAttribute('aria-label', label);
}

function applyTroquelActionIcons() {
    const general = browserConfig?.general || {};
    const presentation = getPresentationConfig(browserConfig || {}, PRESENTATION_KEY);
    const addValue = browserConfig?.icons?.tableAdd || browserConfig?.icons?.quantityAdd || '+';
    const addColor = firstFilled(general.iconColorTableAdd, general.iconColorQuantityAdd, general.iconColor, '#178fc7');
    const addSize = Number(firstFilled(general.iconSizeTableAdd, general.iconSizeQuantityAdd, presentation.iconSize, 16)) || 16;
    setActionButtonIcon(troquelNewButton, addValue, 'Nuevo Troquel', addColor, addSize);
}

function getOpenIconConfig() {
    const general = browserConfig?.general || {};
    const presentation = getPresentationConfig(browserConfig || {}, PRESENTATION_KEY);
    return {
        value: browserConfig?.icons?.browserOpen || browserConfig?.icons?.tableOpen || '\u2197',
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
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('No se pudo cargar la configuraci\u00f3n.');
        const config = await response.json();
        applyBrowserConfig(config);
        browserConfig = config;
        applyTroquelActionIcons();
    } catch (error) {
        console.error(error);
    }
}

function getShapeOptions() {
    const general = browserConfig?.general || {};
    return [
        { value: 'Circular', label: general.dieShapeLabel1 || 'Circular' },
        { value: 'Cuadrado', label: general.dieShapeLabel2 || 'Cuadrado' },
        { value: 'Rectangular', label: general.dieShapeLabel3 || 'Rectangular' },
        { value: 'Ovalado', label: general.dieShapeLabel4 || 'Ovalado' },
        { value: 'Especial', label: general.dieShapeLabel5 || 'Especial' },
        { value: 'Butt Cut', label: general.dieShapeLabel6 || 'Butt Cut' }
    ];
}

function populateFormatoSelects() {
    const shapes = getShapeOptions();
    const html = '<option value="">Seleccione forma...</option>' +
        shapes.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
    if (modalTroquelFormato) modalTroquelFormato.innerHTML = html;
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

if (isShellEmbedded()) {
    document.body.classList.add('shell-embedded');
}

function openTroquelCreateModal() {
    if (!troquelCreatePopover) return;
    document.getElementById('modalTroquelCodigo').value = '';
    document.getElementById('modalTroquelDescripcion').value = '';
    document.getElementById('modalTroquelDescCotizacion').value = '';
    if (modalTroquelFormato) modalTroquelFormato.value = '';
    document.getElementById('modalTroquelActivo').checked = true;
    document.getElementById('modalTroquelConv').checked = false;
    document.getElementById('modalTroquelDig').checked = false;
    document.getElementById('modalTroquelAnchoEtq').value = '';
    document.getElementById('modalTroquelLargoEtq').value = '';
    document.getElementById('modalTroquelAnchoMat').value = '';
    document.getElementById('modalTroquelDesarrollo').value = '';
    document.getElementById('modalTroquelDientes').value = '';
    document.getElementById('modalTroquelElongacion').value = '';
    document.getElementById('modalTroquelFilas').value = '1';
    document.getElementById('modalTroquelRepeticiones').value = '1';
    document.getElementById('modalTroquelMontaje').value = '';
    document.getElementById('modalTroquelDimensiones').value = '';
    document.getElementById('modalTroquelTension').value = '';
    document.getElementById('modalTroquelElongado').value = '';
    document.getElementById('modalTroquelProveedor').value = '';
    if (troquelCreateStatus) {
        troquelCreateStatus.hidden = true;
        troquelCreateStatus.textContent = '';
    }
    troquelCreatePopover.hidden = false;
    document.body.classList.add('popover-open');
    setTimeout(() => {
        const firstInput = document.getElementById('modalTroquelCodigo');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeTroquelCreateModal() {
    if (!troquelCreatePopover) return;
    troquelCreatePopover.hidden = true;
    document.body.classList.remove('popover-open');
}

function populateDetailFormatoSelect() {
    const select = troquelDetailForm?.elements.namedItem('formato');
    if (!select) return;
    const shapes = getShapeOptions();
    select.innerHTML = '<option value="">Seleccione forma...</option>' +
        shapes.map(s => `<option value="${s.value}">${escapeHtml(s.label)}</option>`).join('');
}

function formatDetailNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    if (Math.abs(numeric % 1) < 0.000001 && numeric < 1e9) return String(Math.round(numeric));
    return new Intl.NumberFormat('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(numeric);
}

function setDetailValue(name, value, isCheckbox) {
    const el = troquelDetailForm?.elements.namedItem(name);
    if (!el) return;
    if (isCheckbox) { el.checked = Boolean(value); return; }
    if (el.tagName === 'SELECT') { el.value = value ?? ''; return; }
    el.value = value ?? '';
}

function getDetailFormData() {
    const data = {};
    const elements = troquelDetailForm?.elements;
    if (!elements) return data;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el.name) continue;
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else if (el.type === 'hidden') data[el.name] = el.value;
        else data[el.name] = el.value;
    }
    return data;
}

async function openTroquelDetailModal(code) {
    if (!troquelDetailPopover || !troquelDetailForm) return;
    editingTroquelCode = code || '';

    if (!code) {
        const empty = { activo: true, cantidad_filas: 1, repeticiones: 1 };
        Object.keys(emptyTroquel()).forEach(function (k) {
            setDetailValue(k, empty[k] !== undefined ? empty[k] : '', k === 'activo' || k === 'uso_convencional' || k === 'uso_digital');
        });
        troquelDetailTitle.textContent = 'Nuevo Troquel';
        troquelDetailPopover.hidden = false;
        document.body.classList.add('popover-open');
        troquelDetailForm.querySelector('input[name="codigo"]')?.focus();
        return;
    }

    troquelDetailTitle.textContent = 'Cargando...';
    troquelDetailPopover.hidden = false;
    document.body.classList.add('popover-open');

    try {
        const response = await fetch(TROQUELES_ENDPOINT + '/' + encodeURIComponent(code));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el troquel.');

        troquelDetailTitle.textContent = (payload.codigo || code) + ' \u2014 ' + (payload.descripcion || '');
        const checkboxKeys = { activo: true, uso_convencional: true, uso_digital: true };
        Object.keys(payload).forEach(function (k) {
            if (k === 'formato') {
                if (troquelDetailForm.elements.namedItem('formato')) {
                    troquelDetailForm.elements.namedItem('formato').value = payload[k] ?? '';
                }
                return;
            }
            setDetailValue(k, payload[k], !!checkboxKeys[k]);
        });
    } catch (err) {
        troquelDetailTitle.textContent = 'Error';
        closeTroquelDetailModal();
        console.error(err);
    }
}

function closeTroquelDetailModal() {
    if (!troquelDetailPopover) return;
    troquelDetailPopover.hidden = true;
    document.body.classList.remove('popover-open');
    editingTroquelCode = '';
}

async function saveTroquelFromDetail() {
    const payload = getDetailFormData();
    const code = payload.codigo;
    if (!code || String(code).trim() === '') {
        alert('El código del troquel es obligatorio.');
        return;
    }
    try {
        const response = await fetch(TROQUELES_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No fue posible guardar el troquel.');
        closeTroquelDetailModal();
        await loadTroqueles(troquelesSearchInput?.value || '');
    } catch (error) {
        alert(error.message);
    }
}

function buildTroquelPayload() {
    function val(id) {
        const el = document.getElementById(id);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value;
    }
    return {
        codigo: val('modalTroquelCodigo'),
        descripcion: val('modalTroquelDescripcion'),
        descripcion_cotizaciones: val('modalTroquelDescCotizacion'),
        formato: val('modalTroquelFormato'),
        activo: val('modalTroquelActivo'),
        uso_convencional: val('modalTroquelConv'),
        uso_digital: val('modalTroquelDig'),
        ancho_etiqueta_in: val('modalTroquelAnchoEtq'),
        largo_etiqueta_in: val('modalTroquelLargoEtq'),
        ancho_material_in: val('modalTroquelAnchoMat'),
        desarrollo_in: val('modalTroquelDesarrollo'),
        dientes: val('modalTroquelDientes'),
        elongacion_pct: val('modalTroquelElongacion'),
        cantidad_filas: val('modalTroquelFilas'),
        repeticiones: val('modalTroquelRepeticiones'),
        montaje_troquel: val('modalTroquelMontaje'),
        dimensiones_troquel_in: val('modalTroquelDimensiones'),
        tension: val('modalTroquelTension'),
        elongado: val('modalTroquelElongado'),
        proveedor_troquel: val('modalTroquelProveedor')
    };
}

async function saveTroquelFromModal() {
    if (!troquelCreateStatus) return;
    troquelCreateStatus.hidden = false;
    troquelCreateStatus.textContent = 'Guardando troquel...';
    troquelCreateStatus.className = 'socios-create-status';

    const payload = buildTroquelPayload();
    if (!payload.codigo || String(payload.codigo).trim() === '') {
        troquelCreateStatus.textContent = 'El c\u00f3digo del troquel es obligatorio.';
        troquelCreateStatus.classList.add('is-error');
        return;
    }

    try {
        const response = await fetch(TROQUELES_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'No fue posible guardar el troquel.');
        }
        troquelCreateStatus.textContent = 'Troquel guardado correctamente.';
        troquelCreateStatus.className = 'socios-create-status is-success';
        troquelCreateStatus.hidden = false;
        setTimeout(() => {
            closeTroquelCreateModal();
            loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
        }, 800);
    } catch (error) {
        troquelCreateStatus.textContent = error.message;
        troquelCreateStatus.classList.add('is-error');
    }
}

async function loadTroqueles(search = '') {
    const params = new URLSearchParams({ limit: '500' });
    if (search) params.set('q', search);

    const response = await fetch(`${TROQUELES_ENDPOINT}?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los troqueles.');
    }

    const items = payload.items || [];
    const openIcon = getOpenIconConfig();

    const sorted = sortTroquelList(items);
    troquelesTableBody.innerHTML = sorted.length ? sorted.map((item) => {
        return `
        <tr data-codigo="${escapeHtml(item.codigo)}">
            <td>${escapeHtml(item.codigo)}</td>
            <td>${escapeHtml(item.descripcion)}</td>
            <td>${escapeHtml(formatCellValue(item.ancho_etiqueta_in))}</td>
            <td>${escapeHtml(formatCellValue(item.largo_etiqueta_in))}</td>
            <td>${escapeHtml(formatCellValue(item.desarrollo_in))}</td>
            <td>${escapeHtml(formatCellValue(item.dientes, 0))}</td>
            <td>${escapeHtml(formatCellValue(item.cantidad_filas, 0))}</td>
            <td>${escapeHtml(formatCellValue(item.repeticiones, 0))}</td>
            <td>${escapeHtml(item.formato || '\u2014')}</td>
            <td>${escapeHtml(item.estado || '\u2014')}</td>
            <td>${escapeHtml(formatDate(item.created_at))}</td>
            <td><button type="button" class="browser-open-link" aria-label="Abrir troquel ${escapeHtml(item.codigo)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir troquel', 'table-icon-media')}</button></td>
        </tr>`;
    }).join('') : '<tr><td colspan="12">No hay troqueles registrados.</td></tr>';
    updateTroquelSortIndicators();
}

troquelesSearchInput?.addEventListener('input', () => {
    loadTroqueles(troquelesSearchInput.value).catch((error) => {
        troquelesTableBody.innerHTML = `<tr><td colspan="12">${escapeHtml(error.message)}</td></tr>`;
    });
});

troquelesTableHeader?.addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort-key]');
    if (!th) return;
    const key = th.dataset.sortKey;
    if (troquelSortState.key === key) {
        troquelSortState.dir = troquelSortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        troquelSortState.key = key;
        troquelSortState.dir = 'asc';
    }
    loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
});

troquelesTableBody?.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-codigo]');
    if (!row) return;
    const codigo = row.dataset.codigo;
    if (!codigo) return;
    openTroquelDetailModal(codigo).catch(function (err) { console.error(err); });
});

troquelNewButton?.addEventListener('click', openTroquelCreateModal);

troquelCreatePopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-troquel-popover="true"]')) {
        closeTroquelCreateModal();
    }
});

troquelCreateSaveBtn?.addEventListener('click', () => {
    saveTroquelFromModal().catch((error) => {
        if (troquelCreateStatus) {
            troquelCreateStatus.hidden = false;
            troquelCreateStatus.textContent = error.message;
            troquelCreateStatus.className = 'socios-create-status is-error';
        }
    });
});

troquelDetailForm?.addEventListener('submit', (event) => {
    event.preventDefault();
});

troquelDetailPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-troquel-detail="true"]')) {
        closeTroquelDetailModal();
    }
});

troquelDetailSaveBtn?.addEventListener('click', () => {
    saveTroquelFromDetail().catch(function (err) { console.error(err); });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && troquelDetailPopover && !troquelDetailPopover.hidden) {
        closeTroquelDetailModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && troquelCreatePopover && !troquelCreatePopover.hidden) {
        closeTroquelCreateModal();
    }
});

let touchImageCache = '';
let touchIconValue = '';

async function loadTouchImage() {
    if (touchImageCache) return touchImageCache;
    try {
        const res = await fetch('/api/config/general');
        if (!res.ok) return '';
        const config = await res.json();
        touchImageCache = config.touchImage || '';
        touchIconValue = config.icons?.touchImage || '';
        return touchImageCache;
    } catch { return ''; }
}

function applyTouchIcon() {
    const btn = document.getElementById('troquelTouchImageBtn');
    if (!btn) return;
    if (touchIconValue && touchIconValue.startsWith('data:image')) {
        btn.innerHTML = `<img src="${escapeHtml(touchIconValue)}" alt="">`;
    } else if (touchIconValue) {
        btn.innerHTML = `<span class="icon-glyph">${escapeHtml(touchIconValue)}</span>`;
    } else {
        btn.innerHTML = '<span class="icon-glyph">\uD83D\uDDBC</span>';
    }
}

document.getElementById('troquelTouchImageBtn')?.addEventListener('click', async () => {
    const modal = document.getElementById('troquelTouchModal');
    const container = document.getElementById('troquelTouchModalImage');
    if (!modal || !container) return;
    const dataUrl = await loadTouchImage();
    if (dataUrl && dataUrl.startsWith('data:image')) {
        container.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Imagen de toque">`;
    } else {
        container.innerHTML = '<div class="troquel-touch-empty">No hay imagen de toque configurada.</div>';
    }
    modal.hidden = false;
    document.body.classList.add('popover-open');
});

function closeTroquelTouchModal() {
    const modal = document.getElementById('troquelTouchModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('popover-open');
}

document.getElementById('troquelTouchModalClose')?.addEventListener('click', closeTroquelTouchModal);
document.getElementById('troquelTouchBackdrop')?.addEventListener('click', closeTroquelTouchModal);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('troquelTouchModal');
        if (modal && !modal.hidden) closeTroquelTouchModal();
    }
});

async function init() {
    try {
        await loadConfig();
        populateFormatoSelects();
        populateDetailFormatoSelect();
        await loadTroqueles();
        await loadTouchImage();
        applyTouchIcon();
    } catch (error) {
        troquelesTableBody.innerHTML = `<tr><td colspan="12">${escapeHtml(error.message)}</td></tr>`;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
});

window.addEventListener('focus', () => {
    loadTroqueles(troquelesSearchInput?.value || '').catch(() => {});
});

init();
