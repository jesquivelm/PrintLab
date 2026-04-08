const TROQUELES_ENDPOINT = '/api/inventario/troqueles';

const troquelForm = document.getElementById('troquelForm');
const troquelHeroCode = document.getElementById('troquelHeroCode');
const troquelHeroName = document.getElementById('troquelHeroName');
const troquelImagePreview = document.getElementById('troquelImagePreview');

const query = new URLSearchParams(window.location.search);
let currentTroquelCode = query.get('codigo') || '';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function emptyTroquel() {
    return {
        id: '',
        codigo: '',
        descripcion: '',
        descripcion_cotizaciones: '',
        clasificacion: '',
        estado: '',
        activo: true,
        tipo_troquel: '',
        estructura_troquel: '',
        codigo_cliente: '',
        codigo_preprensa: '',
        usuario_creacion: '',
        desarrollo_in: '',
        elongacion_pct: '',
        montaje_troquel: '',
        dientes: '',
        cantidad_filas: 1,
        repeticiones: 1,
        formato: '',
        tension: '',
        ancho_etiqueta_in: '',
        largo_etiqueta_in: '',
        ancho_material_in: '',
        ancho_total_troquel_in: '',
        largo_total_troquel_in: '',
        dimensiones_troquel_in: '',
        area_etiqueta_excesos_in: '',
        area_etiqueta_in: '',
        area_troquel_in2: '',
        uso_convencional: false,
        uso_digital: false,
        elongado: '',
        codigo_proveedor: '',
        proveedor_troquel: '',
        image_url: '',
        vida_util_golpes_restantes: '',
        vida_util_golpes_usados: '',
        vida_util_golpes_total: '',
        reemplaza_a: '',
        reemplazado_por: '',
        observaciones: ''
    };
}

function formatDisplayNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    if (Math.abs(numeric % 1) < 0.000001) return String(Math.round(numeric));
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(numeric);
}

function setDirectValue(id, value, isCheckbox = false, numeric = false) {
    const element = document.getElementById(id) || troquelForm.elements.namedItem(id);
    if (!element) return;
    if (isCheckbox) {
        element.checked = Boolean(value);
        return;
    }
    element.value = numeric ? formatDisplayNumber(value) : (value ?? '');
}

function renderImagePreview(url, code) {
    const source = String(url || '').trim();
    if (!source) {
        troquelImagePreview.textContent = 'Sin imagen';
        return;
    }
    troquelImagePreview.innerHTML = `<img src="${escapeHtml(source)}" alt="${escapeHtml(code || 'Troquel')}" class="troquel-image-preview-media">`;
}

function renderTroquel(data) {
    const item = { ...emptyTroquel(), ...data };
    troquelHeroCode.textContent = item.codigo || 'Nuevo';
    troquelHeroName.textContent = item.descripcion || 'Nuevo troquel';

    setDirectValue('troquelId', item.id);
    setDirectValue('troquelDescripcionCotizacion', item.descripcion_cotizaciones);
    setDirectValue('troquelAnchoEtiqueta', item.ancho_etiqueta_in, false, true);
    setDirectValue('troquelLargoEtiqueta', item.largo_etiqueta_in, false, true);
    setDirectValue('troquelAnchoMaterial', item.ancho_material_in, false, true);
    setDirectValue('troquelDesarrolloIn', item.desarrollo_in, false, true);
    setDirectValue('troquelElongacion', item.elongacion_pct, false, true);
    setDirectValue('troquelDientes', item.dientes, false, true);
    setDirectValue('troquelFilas', item.cantidad_filas, false, true);
    setDirectValue('troquelRepeticiones', item.repeticiones, false, true);
    setDirectValue('troquelAnchoTotal', item.ancho_total_troquel_in, false, true);
    setDirectValue('troquelLargoTotal', item.largo_total_troquel_in, false, true);
    setDirectValue('troquelEstado', item.estado);
    setDirectValue('troquelClasificacion', item.clasificacion);
    setDirectValue('troquelTipo', item.tipo_troquel);
    setDirectValue('troquelEstructura', item.estructura_troquel);
    setDirectValue('troquelFormato', item.formato);
    setDirectValue('troquelMontaje', item.montaje_troquel);
    setDirectValue('troquelTension', item.tension);
    setDirectValue('troquelAreaEtiquetaExcesos', item.area_etiqueta_excesos_in, false, true);
    setDirectValue('troquelAreaEtiqueta', item.area_etiqueta_in, false, true);
    setDirectValue('troquelAreaTroquel', item.area_troquel_in2, false, true);
    setDirectValue('troquelProveedor', item.proveedor_troquel);
    setDirectValue('troquelCodigoProveedor', item.codigo_proveedor);
    setDirectValue('troquelActivo', item.activo, true);
    setDirectValue('troquelUsoConvencional', item.uso_convencional, true);
    setDirectValue('troquelUsoDigital', item.uso_digital, true);
    setDirectValue('troquelDimensiones', item.dimensiones_troquel_in);
    setDirectValue('troquelCodigoCliente', item.codigo_cliente);
    setDirectValue('troquelCodigoPreprensa', item.codigo_preprensa);
    setDirectValue('troquelUsuarioCreacion', item.usuario_creacion);
    setDirectValue('troquelVidaRestante', item.vida_util_golpes_restantes, false, true);
    setDirectValue('troquelVidaUsada', item.vida_util_golpes_usados, false, true);
    setDirectValue('troquelVidaTotal', item.vida_util_golpes_total, false, true);
    setDirectValue('troquelReemplazaA', item.reemplaza_a);
    setDirectValue('troquelReemplazadoPor', item.reemplazado_por);
    setDirectValue('troquelElongado', item.elongado, false, true);
    setDirectValue('troquelObservaciones', item.observaciones);

    renderImagePreview(item.image_url, item.codigo);
}

async function loadTroquel() {
    if (!currentTroquelCode) {
        renderTroquel(emptyTroquel());
        return;
    }
    const response = await fetch(`${TROQUELES_ENDPOINT}/${encodeURIComponent(currentTroquelCode)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el troquel.');
    renderTroquel(payload);
}

loadTroquel().catch((error) => {
    troquelHeroName.textContent = error.message;
});
