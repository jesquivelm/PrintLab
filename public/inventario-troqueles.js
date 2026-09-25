const CONFIG_ENDPOINT = '/api/config/shell';
const TROQUELES_ENDPOINT = '/api/inventario/troqueles';
const PRESENTATION_KEY = 'inventario-troqueles';

const troquelesSearchInput = document.getElementById('troquelesSearchInput');
const troquelesTableBody = document.getElementById('troquelesTableBody');
const troquelesTableHeader = document.getElementById('troquelesTableHeader');
const troquelNewButton = document.getElementById('troquelNewButton');
const troquelDesdeCalculoButton = document.getElementById('troquelDesdeCalculoButton');
let calculoTroquelSeleccionadoParaVincular = null;
const troquelCreatePopover = document.getElementById('troquelCreatePopover');
const troquelCreateSaveBtn = document.getElementById('troquelCreateSaveBtn');
const troquelCreateStatus = document.getElementById('troquelCreateStatus');
const modalTroquelFormato = document.getElementById('modalTroquelFormato');
const modalTroquelSustrato = document.getElementById('modalTroquelSustrato');
const troquelDetailPopover = document.getElementById('troquelDetailPopover');
const troquelDetailForm = document.getElementById('troquelDetailForm');
const troquelDetailSaveBtn = document.getElementById('troquelDetailSaveBtn');
const troquelDetailTitle = document.getElementById('troquelDetailTitle');
let editingTroquelCode = '';

let browserConfig = null;
let troquelSortState = { key: null, dir: null };

const TROQUEL_DISPLAY_SUFFIXES = {
    desarrollo_in: 'in',
    elongacion_pct: '%',
    ancho_etiqueta_in: 'in',
    largo_etiqueta_in: 'in',
    ancho_material_in: 'in',
    cantidad_filas: '',
    dientes: '',
    repeticiones: '',
    area_etiqueta_in: 'in²',
    area_etiqueta_excesos_in: 'in²',
    area_troquel_in2: 'in²',
    vida_util_golpes_total: 'golpes',
    vida_util_golpes_usados: 'golpes',
    vida_util_golpes_restantes: 'golpes'
};

function formatTroquelDisplayValue(name, rawValue) {
    const trimmed = String(rawValue ?? '').trim();
    const suffix = TROQUEL_DISPLAY_SUFFIXES[name] || '';
    if (!trimmed) return '';
    const numeric = Number(trimmed.replace(',', '.'));
    const formatted = Number.isFinite(numeric)
        ? new Intl.NumberFormat('es-CR', { maximumFractionDigits: 4 }).format(numeric)
        : trimmed;
    return suffix ? `${formatted} ${suffix}` : formatted;
}

function syncTroquelDisplayMasks(scope) {
    if (!scope) return;
    scope.querySelectorAll('.display-input-wrap').forEach((wrap) => {
        const input = wrap.querySelector('.display-input');
        const mask = wrap.querySelector('.display-input-mask');
        if (!input || !mask || !input.name) return;
        mask.textContent = formatTroquelDisplayValue(input.name, input.value);
    });
}

function computeTroquelCalculatedDescription(item) {
    const clasificacion = String(item?.clasificacion || '').trim();
    const forma = String(item?.formato || '').trim();
    const parts = [clasificacion, forma].filter(Boolean);
    let text = parts.join(' ');
    const w = Number(String(item?.ancho_etiqueta_in ?? '').replace(',', '.'));
    const l = Number(String(item?.largo_etiqueta_in ?? '').replace(',', '.'));
    if (Number.isFinite(w) && w > 0 && Number.isFinite(l) && l > 0) {
        const fmt = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 });
        const dims = `(${fmt.format(w)}" x ${fmt.format(l)}")`;
        text = text ? `${text} ${dims}` : dims;
    }
    return text;
}

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

const TROQUEL_CIRCULAR_PITCH_IN = 0.125;
const TROQUEL_SHAPES_WITH_RADIUS = { Cuadrado: true, Rectangular: true, 'Butt Cut': true };
let troquelSustratoOptions = [];
let troquelCreateDesignAdapter = null;
let troquelDetailDesignAdapter = null;

function fmtTroquel(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return numeric.toFixed(3).replace(/\.?0+$/, '');
}

function numVal(el) {
    if (!el) return 0;
    const parsed = parseFloat(String(el.value || '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

async function loadTroquelSustratoOptions() {
    try {
        const response = await fetch('/api/inventario/materiales?limit=500');
        const payload = await response.json();
        const items = payload.items || [];
        troquelSustratoOptions = items.filter((item) => {
            const clave = String(item.familia_proceso || item.clasificacion || '').toLowerCase();
            return clave === 'sustrato' && Number(item.ancho_mm) > 0;
        });
    } catch (error) {
        console.error('No fue posible cargar los sustratos de referencia:', error);
        troquelSustratoOptions = [];
    }
    const html = '<option value="">Seleccione sustrato...</option>' +
        troquelSustratoOptions.map((item) => `<option value="${escapeHtml(item.ancho_mm)}">${escapeHtml(item.nombre || item.codigo || 'Sustrato')} · ${fmtTroquel(item.ancho_mm)} mm</option>`).join('');
    ['modalTroquelSustrato', 'detailTroquelSustrato'].forEach((id) => {
        const select = document.getElementById(id);
        if (select) select.innerHTML = html;
    });
}

function buildTroquelDesignAdapter(kind) {
    if (kind === 'create') {
        return {
            formatoSelect: () => document.getElementById('modalTroquelFormato'),
            w: () => document.getElementById('modalTroquelAnchoEtq'),
            h: () => document.getElementById('modalTroquelLargoEtq'),
            radio: () => document.getElementById('modalTroquelRadio'),
            filas: () => document.getElementById('modalTroquelFilas'),
            repeticiones: () => document.getElementById('modalTroquelRepeticiones'),
            gap: () => document.getElementById('modalTroquelGap'),
            dientes: () => document.getElementById('modalTroquelDientes'),
            desarrollo: () => document.getElementById('modalTroquelDesarrollo'),
            dimensiones: () => document.getElementById('modalTroquelDimensiones'),
            anchoMaterial: () => document.getElementById('modalTroquelAnchoMat'),
            sustratoSelect: () => document.getElementById('modalTroquelSustrato'),
            svg: () => document.getElementById('modalTroquelSvg'),
            mountBtn: () => document.getElementById('modalTroquelAutoMount'),
            mountNote: () => document.getElementById('modalTroquelMountNote'),
            afterSet: () => {}
        };
    }
    return {
        formatoSelect: () => troquelDetailForm?.elements.namedItem('formato'),
        w: () => troquelDetailForm?.elements.namedItem('ancho_etiqueta_in'),
        h: () => troquelDetailForm?.elements.namedItem('largo_etiqueta_in'),
        radio: () => document.getElementById('detailTroquelRadio'),
        filas: () => troquelDetailForm?.elements.namedItem('cantidad_filas'),
        repeticiones: () => troquelDetailForm?.elements.namedItem('repeticiones'),
        gap: () => troquelDetailForm?.elements.namedItem('gap_in'),
        dientes: () => troquelDetailForm?.elements.namedItem('dientes'),
        desarrollo: () => troquelDetailForm?.elements.namedItem('desarrollo_in'),
        dimensiones: () => troquelDetailForm?.elements.namedItem('dimensiones_troquel_in'),
        anchoMaterial: () => troquelDetailForm?.elements.namedItem('ancho_material_in'),
        sustratoSelect: () => document.getElementById('detailTroquelSustrato'),
        svg: () => document.getElementById('detailTroquelSvg'),
        mountBtn: () => document.getElementById('detailTroquelAutoMount'),
        mountNote: () => document.getElementById('detailTroquelMountNote'),
        afterSet: () => syncTroquelDisplayMasks(troquelDetailForm)
    };
}

function drawTroquelDesignSvg(svg, geo) {
    if (!svg) return;
    const { shapeVal, w, h, gap, nx, ny, radio, anchoTotal, largoTotal } = geo;
    if (!(w > 0) || !(h > 0) || !(anchoTotal > 0) || !(largoTotal > 0)) { svg.innerHTML = ''; return; }
    const svgW = 600, svgH = 380, maxW = 420, maxH = 230;
    const scale = Math.min(maxW / Math.max(anchoTotal, 0.001), maxH / Math.max(largoTotal, 0.001));
    const ox = (svgW - anchoTotal * scale) / 2, oy = 60 + (maxH - largoTotal * scale) / 2;
    const px = (v) => ox + v * scale, py = (v) => oy + v * scale;
    let s = '';
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const x = i * (w + gap), y = j * (h + gap);
            const X = px(x), Y = py(y), W = w * scale, H = h * scale;
            if (shapeVal === 'Circular') {
                s += `<circle cx="${X + W / 2}" cy="${Y + H / 2}" r="${Math.min(W, H) / 2}" class="troquel-design-shape"/>`;
            } else if (shapeVal === 'Ovalado') {
                s += `<ellipse cx="${X + W / 2}" cy="${Y + H / 2}" rx="${W / 2}" ry="${H / 2}" class="troquel-design-shape"/>`;
            } else {
                s += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="${(radio || 0) * scale}" class="troquel-design-shape"/>`;
            }
        }
    }
    const dimY = py(largoTotal) + 22;
    s += `<line x1="${px(0)}" y1="${dimY}" x2="${px(anchoTotal)}" y2="${dimY}" class="troquel-design-dim"/>`;
    s += `<text x="${(px(0) + px(anchoTotal)) / 2}" y="${dimY + 14}" text-anchor="middle">Ancho Total ${fmtTroquel(anchoTotal)} in</text>`;
    const dimX = px(anchoTotal) + 40;
    s += `<line x1="${dimX}" y1="${py(0)}" x2="${dimX}" y2="${py(largoTotal)}" class="troquel-design-dim"/>`;
    s += `<text x="${dimX + 6}" y="${(py(0) + py(largoTotal)) / 2}" text-anchor="start">Largo Total ${fmtTroquel(largoTotal)} in</text>`;
    if (nx > 1) {
        const gy = py(0) - 10;
        s += `<line x1="${px(w)}" y1="${gy}" x2="${px(w + gap)}" y2="${gy}" class="troquel-design-gap"/>`;
        s += `<text x="${px(w + gap / 2)}" y="${gy - 6}" text-anchor="middle" class="troquel-design-gap-text">Gap ${fmtTroquel(gap)} in</text>`;
    }
    svg.innerHTML = s;
}

function troquelDesignRecompute(adapter) {
    if (!adapter) return;
    const formatoEl = adapter.formatoSelect();
    const shapeVal = formatoEl ? formatoEl.value : '';
    const radioEl = adapter.radio();
    const radiusApplies = !!TROQUEL_SHAPES_WITH_RADIUS[shapeVal];
    if (radioEl) {
        const wrap = radioEl.closest('.field');
        if (wrap) wrap.classList.toggle('hidden', !radiusApplies);
    }

    const w = numVal(adapter.w());
    const h = numVal(adapter.h());
    const gap = Math.max(0, numVal(adapter.gap()));
    const nx = Math.max(1, Math.round(numVal(adapter.filas()) || 1));
    const ny = Math.max(1, Math.round(numVal(adapter.repeticiones()) || 1));
    const dientes = numVal(adapter.dientes());
    const radio = radiusApplies ? Math.min(numVal(radioEl), (Math.min(w, h) / 2) || 0) : 0;

    const desarrolloEl = adapter.desarrollo();
    const dientesEl = adapter.dientes();
    if (desarrolloEl && dientes > 0) {
        desarrolloEl.value = fmtTroquel(dientes * TROQUEL_CIRCULAR_PITCH_IN);
    } else if (desarrolloEl && numVal(desarrolloEl) > 0) {
        const calcDientes = Math.round(numVal(desarrolloEl) / TROQUEL_CIRCULAR_PITCH_IN);
        if (dientesEl && calcDientes > 0) {
            dientesEl.value = String(calcDientes);
        }
    } else if (h > 0 && ny > 0) {
        const calcDesarrollo = ny * h + Math.max(0, ny - 1) * gap;
        const calcDientes = Math.round(calcDesarrollo / TROQUEL_CIRCULAR_PITCH_IN);
        if (desarrolloEl) desarrolloEl.value = fmtTroquel(calcDesarrollo);
        if (dientesEl && calcDientes > 0) dientesEl.value = String(calcDientes);
    }

    const anchoTotal = nx * w + Math.max(0, nx - 1) * gap;
    const largoTotal = ny * h + Math.max(0, ny - 1) * gap;
    const dimensionesEl = adapter.dimensiones();
    if (dimensionesEl && w > 0 && h > 0) {
        dimensionesEl.value = `${fmtTroquel(anchoTotal)} x ${fmtTroquel(largoTotal)}`;
    }

    adapter.afterSet();
    drawTroquelDesignSvg(adapter.svg(), { shapeVal, w, h, gap, nx, ny, radio, anchoTotal, largoTotal });
}

function troquelDesignAutoMount(adapter) {
    if (!adapter) return;
    const noteEl = adapter.mountNote();
    const h = numVal(adapter.h());
    const dientes = numVal(adapter.dientes());
    const desarrollo = dientes * TROQUEL_CIRCULAR_PITCH_IN;
    const gap = Math.max(0, numVal(adapter.gap()));
    if (!(h > 0) || !(desarrollo > 0)) {
        if (noteEl) noteEl.textContent = 'Complete Largo Etiqueta y Dientes antes de calcular el montaje.';
        return;
    }
    const best = Math.max(1, Math.floor((desarrollo + gap) / (h + gap)));
    const repeticionesEl = adapter.repeticiones();
    const gapEl = adapter.gap();
    if (best > 1) {
        const exactGap = Math.max(0, (desarrollo - best * h) / (best - 1));
        if (repeticionesEl) repeticionesEl.value = String(best);
        if (gapEl) gapEl.value = fmtTroquel(exactGap);
        if (noteEl) noteEl.textContent = `Montaje sugerido: ${best} Repeticiones · Gap requerido: ${fmtTroquel(exactGap)} in.`;
    } else {
        if (repeticionesEl) repeticionesEl.value = '1';
        if (noteEl) noteEl.textContent = `Con el desarrollo actual (${fmtTroquel(desarrollo)} in) solo cabe 1 repetición de ${fmtTroquel(h)} in.`;
    }
    troquelDesignRecompute(adapter);
}

function wireTroquelDesignTool(kind) {
    const adapter = buildTroquelDesignAdapter(kind);
    [adapter.formatoSelect(), adapter.w(), adapter.h(), adapter.radio(), adapter.filas(), adapter.repeticiones(), adapter.gap(), adapter.dientes()].forEach((el) => {
        if (!el) return;
        el.addEventListener('input', () => troquelDesignRecompute(adapter));
        el.addEventListener('change', () => troquelDesignRecompute(adapter));
    });
    adapter.mountBtn()?.addEventListener('click', () => troquelDesignAutoMount(adapter));
    const sustratoSelect = adapter.sustratoSelect();
    sustratoSelect?.addEventListener('change', () => {
        const widthMm = parseFloat(sustratoSelect.value);
        if (!Number.isFinite(widthMm) || widthMm <= 0) return;
        const anchoMaterialEl = adapter.anchoMaterial();
        if (anchoMaterialEl) {
            anchoMaterialEl.value = fmtTroquel(widthMm / 25.4);
            adapter.afterSet();
        }
    });
    return adapter;
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
    calculoTroquelSeleccionadoParaVincular = null;
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
    document.getElementById('modalTroquelGap').value = '';
    document.getElementById('modalTroquelRadio').value = '';
    if (modalTroquelSustrato) modalTroquelSustrato.value = '';
    if (troquelCreateStatus) {
        troquelCreateStatus.hidden = true;
        troquelCreateStatus.textContent = '';
    }
    troquelCreatePopover.hidden = false;
    document.body.classList.add('popover-open');
    troquelDesignRecompute(troquelCreateDesignAdapter);
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

function usarCalculoTroquelParaNuevo(calculo) {
    openTroquelCreateModal();
    calculoTroquelSeleccionadoParaVincular = calculo.codigo_calculo;
    document.getElementById('modalTroquelDescripcion').value = calculo.tipo_producto || '';
    if (modalTroquelFormato) modalTroquelFormato.value = calculo.forma || '';
    document.getElementById('modalTroquelAnchoEtq').value = calculo.ancho_producto_in ?? '';
    document.getElementById('modalTroquelLargoEtq').value = calculo.alto_producto_in ?? '';
    document.getElementById('modalTroquelAnchoMat').value = calculo.ancho_material_in ?? '';
    document.getElementById('modalTroquelDesarrollo').value = calculo.desarrollo_in ?? '';
    document.getElementById('modalTroquelFilas').value = calculo.numero_cavidades ?? '1';
    document.getElementById('modalTroquelRepeticiones').value = calculo.numero_repeticiones ?? '1';
    troquelDesignRecompute(troquelCreateDesignAdapter);
    if (troquelCreateStatus) {
        troquelCreateStatus.hidden = false;
        troquelCreateStatus.className = 'socios-create-status';
        troquelCreateStatus.textContent = 'Datos precargados desde el cálculo ' + calculo.codigo_calculo + '. Complete el código y guarde para crear el troquel físico.';
    }
}

async function abrirSelectorCalculoTroquel() {
    let pendientes = [];
    try {
        const response = await fetch('/api/calculo-troquel/pendientes');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No fue posible obtener los cálculos pendientes.');
        pendientes = payload.pendientes || [];
    } catch (error) {
        alert(error.message);
        return;
    }
    if (!pendientes.length) {
        alert('No hay cálculos de troquel pendientes de fabricación.');
        return;
    }
    document.querySelector('.calculo-troquel-selector-dialog')?.remove();
    document.body.classList.add('popover-open');
    const overlay = document.createElement('div');
    overlay.className = 'quote-order-quantity-dialog calculo-troquel-selector-dialog';
    const items = pendientes.map((c) => (
        '<div class="ct-compatible-item"><div class="ct-compatible-info"><strong>' + escapeHtml(c.codigo_calculo) + '</strong>' +
        '<span>' + escapeHtml(c.quote_code || '') + ' / ' + escapeHtml(c.line_code || '') + '</span>' +
        '<span>Ancho: ' + escapeHtml(String(c.ancho_producto_in ?? '-')) + ' in · Alto: ' + escapeHtml(String(c.alto_producto_in ?? '-')) + ' in</span>' +
        '<span>Estado: ' + escapeHtml(c.estado || '') + '</span></div>' +
        '<button type="button" class="action-btn action-btn-primary" data-codigo-calculo="' + escapeHtml(c.codigo_calculo) + '">Usar</button></div>'
    )).join('');
    overlay.innerHTML = '<div class="quote-order-quantity-panel" role="dialog" aria-modal="true" aria-label="Cálculos de Troquel Pendientes">' +
        '<div class="quote-order-quantity-title">Cálculos de Troquel Pendientes de Fabricación</div>' +
        '<div style="display:grid;gap:10px;max-height:50vh;overflow-y:auto;">' + items + '</div>' +
        '<div class="quote-order-quantity-actions"><button type="button" class="action-btn" data-action="cerrar-selector">Cerrar</button></div></div>';
    document.body.appendChild(overlay);
    const cerrar = () => {
        overlay.remove();
        document.body.classList.remove('popover-open');
    };
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest("[data-action='cerrar-selector']")) {
            cerrar();
            return;
        }
        const usarBtn = event.target.closest('[data-codigo-calculo]');
        if (usarBtn) {
            const calculo = pendientes.find((c) => c.codigo_calculo === usarBtn.dataset.codigoCalculo);
            cerrar();
            if (calculo) usarCalculoTroquelParaNuevo(calculo);
        }
    });
}

troquelDesdeCalculoButton?.addEventListener('click', abrirSelectorCalculoTroquel);

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

function setActiveTroquelDetailTab(tabKey) {
    document.querySelectorAll('.troquel-detail-tab').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.troquelTab === tabKey);
    });
    document.querySelectorAll('.troquel-detail-tab-panel').forEach((panel) => {
        panel.hidden = panel.dataset.troquelTab !== tabKey;
    });
}

document.querySelector('.troquel-detail-tabs')?.addEventListener('click', (event) => {
    const button = event.target.closest('.troquel-detail-tab');
    if (!button) return;
    setActiveTroquelDetailTab(button.dataset.troquelTab || 'general');
});

troquelDetailForm?.addEventListener('input', (event) => {
    if (!event.target.classList.contains('display-input')) return;
    const wrap = event.target.closest('.display-input-wrap');
    const mask = wrap?.querySelector('.display-input-mask');
    if (mask) mask.textContent = formatTroquelDisplayValue(event.target.name, event.target.value);
});

async function openTroquelDetailModal(code) {
    if (!troquelDetailPopover || !troquelDetailForm) return;
    editingTroquelCode = code || '';
    setActiveTroquelDetailTab('general');

    if (!code) {
        const empty = { activo: true, cantidad_filas: 1, repeticiones: 1 };
        Object.keys(emptyTroquel()).forEach(function (k) {
            setDetailValue(k, empty[k] !== undefined ? empty[k] : '', k === 'activo' || k === 'uso_convencional' || k === 'uso_digital');
        });
        troquelDetailTitle.textContent = 'Nuevo Troquel';
        troquelDetailPopover.hidden = false;
        document.body.classList.add('popover-open');
        troquelDetailForm.querySelector('input[name="codigo"]')?.focus();
        document.getElementById('troquelImageUrl').value = '';
        updateTroquelImageBtn('');
        syncTroquelDisplayMasks(troquelDetailForm);
        document.getElementById('detailTroquelRadio').value = '';
        document.getElementById('detailTroquelSustrato').value = '';
        document.getElementById('detailTroquelMountNote').textContent = '—';
        troquelDesignRecompute(troquelDetailDesignAdapter);
        return;
    }

    troquelDetailTitle.textContent = 'Cargando...';
    troquelDetailPopover.hidden = false;
    document.body.classList.add('popover-open');

    try {
        const response = await fetch(TROQUELES_ENDPOINT + '/' + encodeURIComponent(code));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el troquel.');

        const calculatedDesc = computeTroquelCalculatedDescription(payload);
        troquelDetailTitle.textContent = (payload.codigo || code) + ' \u2014 ' + (payload.descripcion || calculatedDesc);
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
        updateTroquelImageBtn(payload.image_url);
        syncTroquelDisplayMasks(troquelDetailForm);
        const descripcionInput = troquelDetailForm.elements.namedItem('descripcion');
        if (descripcionInput) descripcionInput.title = payload.descripcion ? '' : calculatedDesc;
        document.getElementById('detailTroquelRadio').value = '';
        document.getElementById('detailTroquelSustrato').value = '';
        document.getElementById('detailTroquelMountNote').textContent = '—';
        troquelDesignRecompute(troquelDetailDesignAdapter);
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
        proveedor_troquel: val('modalTroquelProveedor'),
        gap_in: val('modalTroquelGap')
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
        if (calculoTroquelSeleccionadoParaVincular) {
            try {
                await fetch('/api/calculo-troquel/' + encodeURIComponent(calculoTroquelSeleccionadoParaVincular) + '/vincular-troquel-fisico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codigo_troquel: payload.codigo })
                });
            } catch (error) {
                console.error('No fue posible vincular el cálculo de troquel:', error);
            }
            calculoTroquelSeleccionadoParaVincular = null;
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

    if (!troquelesTableBody.querySelector('tr[data-codigo]')) {
        troquelesTableBody.innerHTML = '<tr><td colspan="12">Cargando los troqueles desde el servidor, un momento por favor…</td></tr>';
    }
    const mensajeSinRespuesta = 'No pudimos traer los troqueles en este momento. Revisa la conexión e intenta de nuevo.';
    let response;
    let payload;
    try {
        response = await fetch(`${TROQUELES_ENDPOINT}?${params.toString()}`);
        payload = await response.json();
    } catch (error) {
        throw new Error(mensajeSinRespuesta);
    }
    if (!response.ok) {
        throw new Error(payload.error || mensajeSinRespuesta);
    }

    const items = payload.items || [];
    const openIcon = getOpenIconConfig();

    const sorted = sortTroquelList(items);
    troquelesTableBody.innerHTML = sorted.length ? sorted.map((item) => {
        return `
        <tr data-codigo="${escapeHtml(item.codigo)}">
            <td>${escapeHtml(item.codigo)}</td>
            <td>${escapeHtml(item.descripcion || computeTroquelCalculatedDescription(item))}</td>
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

let _troquelIconValue = '';

async function loadTroquelIcon() {
    _troquelIconValue = browserConfig?.icons?.touchImage || '';
    return _troquelIconValue;
}

function updateTroquelImageBtn(dataUrl) {
    const btn = document.getElementById('troquelImageBtn');
    if (!btn) return;
    const general = browserConfig?.general || {};
    const color = firstFilled(general.iconColorTouchImage, general.iconColor, '#80909d');
    const size = Number(firstFilled(general.iconSizeTouchImage, 32)) || 32;
    btn.style.setProperty('--icon-color', color);
    btn.style.setProperty('--config-icon-size', `${size}px`);
    if (isImageValue(dataUrl) || isSvgValue(dataUrl)) {
        btn.innerHTML = iconMarkup(dataUrl, 'Imagen del troquel', 'troquel-image-upload-media');
        btn.classList.add('has-image');
    } else {
        btn.classList.remove('has-image');
        const placeholder = _troquelIconValue || '\uD83D\uDDBC';
        btn.innerHTML = iconMarkup(placeholder, 'Cargar imagen del troquel', 'troquel-image-upload-icon') +
            '<span class="troquel-image-upload-hint">Sin imagen</span>';
    }
}

document.getElementById('troquelImageBtn')?.addEventListener('click', function () {
    document.getElementById('troquelImageInput')?.click();
});

document.getElementById('troquelImageInput')?.addEventListener('change', function (e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        const dataUrl = ev.target?.result;
        if (typeof dataUrl !== 'string') return;
        document.getElementById('troquelImageUrl').value = dataUrl;
        updateTroquelImageBtn(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

async function init() {
    try {
        await loadConfig();
        await loadTroquelIcon();
        populateFormatoSelects();
        populateDetailFormatoSelect();
        await loadTroquelSustratoOptions();
        troquelCreateDesignAdapter = wireTroquelDesignTool('create');
        troquelDetailDesignAdapter = wireTroquelDesignTool('detail');
        await loadTroqueles();
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
