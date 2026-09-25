const PRODUCT_DOC_CONFIG_ENDPOINT = '/api/config/shell';
const PRODUCT_DOC_SESSION_KEY = 'erp-user-session';

const statusEl = document.getElementById('productDocStatus');
const contentEl = document.getElementById('productDocContent');
const pageTitleEl = document.getElementById('productDocPageTitle');
const nameEl = document.getElementById('productDocName');
const codesEl = document.getElementById('productDocCodes');
const tipoProductoEl = document.getElementById('productDocTipoProducto');
const tipoProductoRowEl = document.getElementById('productDocTipoProductoRow');
const skuClienteEl = document.getElementById('productDocSkuCliente');
const skuClienteRowEl = document.getElementById('productDocSkuClienteRow');
const clientEl = document.getElementById('productDocClient');
const clientInfoGridEl = document.getElementById('productDocClientInfoGrid');
const clientContactColEl = document.getElementById('productDocClientContactCol');
const sellerColEl = document.getElementById('productDocSellerCol');
const outputTypeImageEl = document.getElementById('productDocOutputTypeImage');
const menuButtonEl = document.getElementById('productDocMenuButton');
const detailPopoverEl = document.getElementById('productDocDetailPopover');
const historyTableBodyEl = document.getElementById('productDocHistoryTableBody');
const ordersTableBodyEl = document.getElementById('productDocOrdersTableBody');
const attachmentsBodyEl = document.getElementById('productDocAttachmentsPopoverBody');
const attachmentFileInputEl = document.getElementById('productDocAttachmentFileInput');
const audioRecordButtonEl = document.getElementById('productDocAudioRecordButton');
const audioRecordIndicatorEl = document.getElementById('productDocAudioRecordIndicator');
const rawEl = document.getElementById('productDocRaw');
const quoteButtonEl = document.getElementById('productDocQuoteButton');
const companyLogoEl = document.getElementById('productDocCompanyLogo');
const brandFallbackEl = document.getElementById('productDocBrandFallback');

let config = {};
let productCode = '';
let currentProductAttachments = [];
let attachmentsMediaRecorder = null;
let attachmentsRecordingChunks = [];
let attachmentsIsRecording = false;
let productDetail = null;
let currentOutputTypes = [];
let currentMotivosDetalle = [];

var RAW_LABELS = {
    'CMYK': 'CMYK',
    'ID LINEA': 'Id Línea',
    'VENDEDOR': 'Vendedor',
    'ANCHO CORE': 'Ancho de Core',
    'ID CLIENTE': 'Id Cliente',
    'TIPO SALIDA': 'Tipo de Salida',
    'ESTADO LINEA': 'Estado de Línea',
    'DIAMETRO CORE': 'Diámetro de Core',
    'ID COTIZACION': 'Id Cotización',
    'CANTIDAD TIPOS': 'Cantidad de Tipos',
    'NOMBRE TRABAJO': 'Nombre del Trabajo',
    'CANTIDAD TINTAS': 'Cantidad de Tintas',
    'CODIGO PRODUCTO': 'Código de Producto',
    'TIPO ETIQUETADO': 'Tipo de Etiquetado',
    'CANTIDAD CAMBIOS': 'Cambios Totales',
    'CANTIDAD CAMBIOS ADICIONALES': 'Cambios Adicionales',
    'CANTIDAD CAMBIOS POR TIPOS': 'Cambios por Tipos',
    'CANTIDAD CAMBIOS TOTALES': 'Cambios Totales',
    'REQ | Forma': 'Forma',
    'REQ | Barniz': 'Barniz',
    'REQ | Embosado': 'Embosado',
    'REQ | Estampado': 'Estampado',
    'REQ | Colocacion': 'Colocación',
    'REQ | Numeracion': 'Numeración',
    'REQ | Superficie': 'Superficie',
    'REQ | Troquelado': 'Troquelado',
    'REQ | Comentarios': 'Comentarios',
    'REQ | Medida Fija': 'Medida Fija',
    'REQ | Estampado Ancho': 'Ancho de Estampado',
    'REQ | Tipo de Producto': 'Tipo de Producto',
    'GENERAL | CMYK': 'CMYK',
    'GENERAL | 7 | TOTAL | DOL': 'Total Dólares',
    'GENERAL | 9 | TOTAL | DOL': 'Total Dólares Final',
    'GENERAL | 9 | UNITARIO | DOL': 'Unitario Dólares',
    'CONV | BARNIZ | ACTIVO': 'Barniz Activo',
    'CONV | BARNIZ | GSM': 'Barniz GSM',
    'CONV | BARNIZ | COBERTURA %': 'Barniz Cobertura',
    'CONV | PERFIL TINTA | GSM': 'Perfil de Tinta GSM',
    'CONV | PERFIL TINTA | TIPO': 'Perfil de Tinta Tipo',
    'CONV | PERFIL TINTA | BCM ANILOX': 'BCM Anilox',
    'CONV | PERFIL TINTA | COBERTURA %': 'Cobertura de Tinta',
    'DIMENSIONES ETIQUETA | ANCHO': 'Ancho',
    'DIMENSIONES ETIQUETA | LARGO': 'Largo',
    'PRECIO TOTAL AL FINALIZAR': 'Precio Total',
    'CANTIDAD ETIQUETAS X ROLLO': 'Etiquetas por Rollo',
    'SOLICITUD ESTADO': 'Estado de Solicitud',
    'GENERAL | MATERIAL': 'Material',
    'GENERAL | TROQUEL | ID': 'Troquel ID',
    'CONV | MAQUINA': 'Máquina Convencional',
    'DIGITAL | MAQUINA': 'Máquina Digital',
    'CONV | BARNIZ | BCM ANILOX': 'Barniz BCM',
    'CONV | BARNIZ | ZONIFICADO': 'Barniz Reservado',
    'ANCHO ROLLO': 'Ancho Rollo (in)',
    'SEP HORIZONTAL': 'Sep. Horizontal (in)',
    'SEP VERTICAL': 'Sep. Vertical (in)',
    'AMBIENTE APLICACION': 'Ambiente Aplicación',
    'TIPO SUPERFICIE': 'Tipo Superficie',
    'Proceso Productivo': 'Proceso Productivo',
    'Material Convencional | Id Material': 'Material Convencional ID',
    'Material Digital | Id Material': 'Material Digital ID',
    'Material | Tipo Según Proceso Productivo': 'Tipo Material',
    'TIPO ORDEN': 'Tipo Orden',
    'TIPO CAMBIO': 'Tipo Cambio',
    'TIPO CAMBIO VENTA': 'Tipo Cambio Venta',
    'TIPO CAMBIO COMPRA': 'Tipo Cambio Compra',
    'DEPARTAMENTO': 'Departamento',
    'GENERAL | 5 | SUBTOTAL': 'Subtotal Costos',
    'GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL': 'Subtotal Antes IVA USD',
    'GENERAL | 8 | PORCENTAJE IVA': '% IVA',
    'GENERAL | 9 | Impuestos': 'Impuestos USD',
    'GENERAL | 7 | TOTAL | DOL': 'Total USD',
    'GENERAL | 9 | TOTAL | DOL': 'Total Final USD',
    'GENERAL | 9 | UNITARIO | DOL': 'Unitario USD',
    'GENERAL | 7 | TOTAL | COL': 'Total Colones',
    'GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS': 'Total Colones Ventas',
    'GENERAL | 9 | UNITARIO | COL': 'Unitario Colones',
    'Finalizado_Para_Orden': 'Finalizado Para Orden',
    'CANTIDAD PRODUCTOS': 'Cantidad Productos'
};

function buildAsciiSafeSessionHeader(session) {
    if (!session || typeof session !== 'object') return null;
    const username = String(session.username || '').trim();
    const permissionName = String(session.permissionName || '').trim();
    const modules = session.modules && typeof session.modules === 'object' ? session.modules : {};
    const safeModules = {};
    Object.keys(modules).forEach((key) => {
        const value = modules[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            safeModules[String(key)] = {
                view: Boolean(value.view || value.create || value.edit),
                create: Boolean(value.create),
                edit: Boolean(value.edit)
            };
            return;
        }
        if (Array.isArray(value)) {
            safeModules[String(key)] = value.map((item) => String(item || '').trim()).filter(Boolean);
            return;
        }
        safeModules[String(key)] = String(value || '').trim();
    });
    if (!username && !permissionName && !Object.keys(safeModules).length) return null;
    return JSON.stringify({ username, permissionName, modules: safeModules });
}

function sessionHeaders() {
    try {
        const session = JSON.parse(localStorage.getItem(PRODUCT_DOC_SESSION_KEY) || sessionStorage.getItem(PRODUCT_DOC_SESSION_KEY) || 'null');
        const headerValue = buildAsciiSafeSessionHeader(session);
        return headerValue ? { 'x-erp-session': headerValue } : {};
    } catch (_) {
        return {};
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function formatNumber(value, decimals) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('es-CR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';
}

// Igual que orden-produccion.js: la ficha técnica reparte los módulos con el flex/grid del
// CSS; aquí solo se limpian estilos inline viejos que hubieran quedado.
function redistributeAcabadosFlex(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    Array.prototype.forEach.call(container.children, function (el) {
        if (el.tagName === 'SECTION') { el.style.flexBasis = ''; el.style.maxWidth = ''; }
    });
}

// Mismas funciones que orden-produccion.js (production-order-popover-body / calc-popover) —
// el producto usa el mismo mecanismo de popover de detalle por sección, no una tabla aparte.
function popoverDetailRow(label, value, unit) {
    const isEmpty = value === null || value === undefined || value === '';
    const displayValue = isEmpty ? '—' : escapeHtml(String(value));
    const unitText = unit ? ` <span class="production-popover-unit">${escapeHtml(unit)}</span>` : '';
    return `<div class="production-popover-row"><span class="production-popover-label">${escapeHtml(label)}</span><span class="production-popover-field">${displayValue}${unitText}</span></div>`;
}

function popoverDetailSection(title, items) {
    if (!items || !items.length) return '';
    const titleHtml = title ? `<div class="production-popover-section-title">${escapeHtml(title)}</div>` : '';
    const tabId = 'popTab_' + Math.random().toString(36).slice(2, 8);
    const tabHeaders = items.map((t, i) => `<button type="button" class="production-popover-tab${i === 0 ? ' active' : ''}" data-popover-tab="${tabId}" data-tab-index="${i}">${escapeHtml(t.label)}</button>`).join('');
    const tabPanels = items.map((t, i) => `<div class="production-popover-tab-panel${i === 0 ? ' active' : ''}" data-popover-panel="${tabId}" data-tab-index="${i}">${t.content}</div>`).join('');
    return `<div class="production-popover-section">${titleHtml}<div class="production-popover-tabs">${tabHeaders}</div>${tabPanels}</div>`;
}

function openDetailPopover(bodyId, html) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    body.innerHTML = html || '<div class="production-summary-empty">Sin datos disponibles.</div>';
    body.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-popover-tab]');
        if (!tabBtn) return;
        const tabGroupId = tabBtn.dataset.popoverTab;
        const idx = tabBtn.dataset.tabIndex;
        body.querySelectorAll(`[data-popover-tab="${tabGroupId}"]`).forEach((b) => b.classList.toggle('active', b.dataset.tabIndex === idx));
        body.querySelectorAll(`[data-popover-panel="${tabGroupId}"]`).forEach((p) => p.classList.toggle('active', p.dataset.tabIndex === idx));
    }, { once: true });
    const popoverId = bodyId.replace('Body', 'Popover');
    document.getElementById(popoverId)?.removeAttribute('hidden');
}

function closeAllProductDocPopovers() {
    document.querySelectorAll('.calc-popover').forEach((el) => el.setAttribute('hidden', ''));
}

// ── FICHA TÉCNICA DEL SKU ────────────────────────────────────────────────────
// Reusa el mismo esqueleto que la Ficha Técnica de la Orden de Producción
// (renderFichaTecnica() en orden-produccion.js): un módulo por proceso productivo
// (máquina, sustrato, barniz, estampado, laminado, sellos, troquelado,
// rebobinado, empaque), volcado inline con pares "Etiqueta valor" (production-summary-item).
// Es una FICHA DE ESPECIFICACIÓN: solo características por unidad, nada dependiente
// de la tirada (metros netos, mermas, cantidades de rollos/cajas), sin costos.
function ftRow(label, value, unit) {
    var isEmpty = value === null || value === undefined || value === '' || value === '—';
    if (isEmpty) return '';
    var unitHtml = unit ? ' <span class="production-summary-unit">' + escapeHtml(unit) + '</span>' : '';
    return '<div class="production-summary-item"><span class="production-summary-label">' + escapeHtml(label) +
        '</span><span class="production-summary-value">' + escapeHtml(String(value)) + unitHtml + '</span></div>';
}

function ftFillSection(sectionId, bodyId, show, rowsHtml) {
    var section = document.getElementById(sectionId);
    var body = document.getElementById(bodyId);
    if (body) body.innerHTML = rowsHtml || '';
    if (section) section.hidden = !show;
}

function summaryRow(label, valueHtml) {
    return '<div class="production-summary-item"><span class="production-summary-label">' + escapeHtml(label) +
        '</span><span class="production-summary-value">' + valueHtml + '</span></div>';
}

function renderFichaTecnica(p) {
    var raw = p.raw_data || {};
    var num = function (v, d) {
        var x = Number(v);
        return (Number.isFinite(x) && x !== 0) ? formatNumber(x, d == null ? 2 : d) : '';
    };
    // Metros a partir de pies (las columnas *_pies del cálculo se muestran en metros, igual que la Orden).
    var mts = function (feet, d) {
        var x = Number(feet);
        return (Number.isFinite(x) && x !== 0) ? formatNumber(feetToMeters(x), d == null ? 1 : d) : '';
    };
    // % de merma sólo si es un porcentaje plausible (0 < v < 100). Algunas filas de
    // merma_*_pct_cotizada traen valores fuera de rango (dato inconsistente en BD) — se ocultan.
    var pct = function (v) {
        var x = Number(v);
        return (Number.isFinite(x) && x > 0 && x < 100) ? formatNumber(x, 2) : '';
    };
    // Valor "vigente" (captura de producción) si existe y no es 0; si no, el cotizado.
    // Así el SKU se actualiza con lo que produce planta, igual que la Orden.
    var vig = function (vigente, cotizado) {
        var a = Number(vigente);
        return (Number.isFinite(a) && a !== 0) ? vigente : cotizado;
    };
    var sf = (p.sustrato_ficha && typeof p.sustrato_ficha === 'object') ? p.sustrato_ficha : {};
    var bf = (p.barniz_ficha && typeof p.barniz_ficha === 'object') ? p.barniz_ficha : {};
    var cf = (p.caja_ficha && typeof p.caja_ficha === 'object') ? p.caja_ficha : {};
    var mEsp = (p.maquina_especificaciones && typeof p.maquina_especificaciones === 'object') ? p.maquina_especificaciones : {};
    var mv = (p.maquina_velocidad && typeof p.maquina_velocidad === 'object') ? p.maquina_velocidad : null;
    var coreType = (p.tipo_core && typeof p.tipo_core === 'object') ? p.tipo_core : {};
    var td = p.troquel_dimensiones || {};
    var outputType = p.output_type || raw['TIPO SALIDA'] || '';
    var outMatch = getOutputTypeImage(outputType);
    var outText = outMatch ? (outMatch.nombre || outMatch.name || outputType) : (outputType || '');
    var coreDiam = coreType.diametro || (Number(p.core_diameter) > 0 ? p.core_diameter : '');
    var coreEsp = Number(coreType.espesor) || 0;
    // Mismo formato que el cálculo (app.js): descripción, o  {diámetro}'' - {espesor}mm
    var tipoCore = normalizeText(coreType.descripcion)
        || (coreDiam ? (coreEsp > 0 ? coreDiam + "'' - " + coreEsp + 'mm' : coreDiam + "''") : '');
    // Acabados realmente cotizados — las mermas de foil/laminado sólo tienen sentido si el
    // acabado existe; el SKU no debe insinuar procesos que no se cotizaron.
    var estampadoTipo = (p.estampado_tipo && String(p.estampado_tipo).trim().toLowerCase() !== 'ninguno') ? p.estampado_tipo : '';
    var laminadoActivo = Boolean(p.laminado_tipo) || Number(p.laminado_costo_total) > 0;

    // ── Especificación de Etiqueta ── (geometría de la etiqueta; el sentido de
    // bobinado y las unidades por rollo van en Rebobinado)
    ftFillSection('productDocEtiquetaSection', 'productDocEtiquetaBody', true, [
        ftRow('Ancho de Etiqueta', num(p.width_inches, 2), 'in'),
        ftRow('Largo de Etiqueta', num(p.length_inches, 2), 'in'),
        ftRow('Forma', p.troquel_forma || '')
    ].join(''));

    // ── Máquina de Impresión ──
    var maquina = p.quoted_machine || p.machine_name || raw['CONV | MAQUINA'] || raw['DIGITAL | MAQUINA'] || '';
    var velTxt = Number(p.velocidad_maquina_m_min) > 0
        ? formatNumber(p.velocidad_maquina_m_min, 1) + ' m/min'
        : (mv ? formatNumber(mv.valor, 1) + ' ' + mv.unidad : '');
    var pantones = normalizeText(raw['PANTONES'] || raw['pantones']);
    // Sin tiempos: el SKU es especificación, no ejecución (los tiempos implican tirada).
    ftFillSection('productDocMaquinaSection', 'productDocMaquinaBody', Boolean(maquina), [
        ftRow('Máquina', maquina || ''),
        ftRow('Proceso', 'Flexografía UV'),
        ftRow('Número de Estaciones', Number(mEsp.num_estaciones) > 0 ? formatNumber(mEsp.num_estaciones, 0) : ''),
        ftRow('Velocidad', velTxt),
        ftRow('Número de Tintas', Number(p.tint_count) > 0 ? formatNumber(p.tint_count, 0) : ''),
        ftRow('CMYK', (String(raw['CMYK'] || '').toLowerCase() === 'si') ? 'Sí' : ''),
        ftRow('Pantones', pantones)
    ].join(''));

    // ── Sustrato ── (especificación del catálogo de materia prima; solo campos por unidad)
    var sustrato = p.material_name || raw['GENERAL | MATERIAL'] || raw['MATERIAL'] || '';
    var anchoBobinaMm = Number(sf.ancho_mm) > 0 ? Number(sf.ancho_mm) : 0;
    var anchoBobinaTxt = anchoBobinaMm > 0
        ? formatNumber(anchoBobinaMm, 1) + ' mm (' + formatNumber(anchoBobinaMm / 25.4, 2) + ' in)'
        : (num(p.material_ancho, 2) ? num(p.material_ancho, 2) + ' in' : '');
    var mermaRows = [
        ftRow('Merma de Arranque', (p.merma_arranque_m_vigente != null && p.merma_arranque_m_vigente !== '') ? num(p.merma_arranque_m_vigente, 1) : mts(p.merma_arranque_pies), 'm'),
        ftRow('Merma de Tiraje', num(vig(p.merma_tiraje_pct_vigente, p.merma_tiraje_pct), 1), '%'),
        ftRow('Merma de Sustrato', pct(p.merma_sustrato_pct_cotizada), '%'),
        ftRow('Merma de Tinta', pct(vig(p.merma_tinta_pct_vigente, p.merma_tinta_pct_cotizada)), '%'),
        estampadoTipo ? ftRow('Merma de Foil', pct(vig(p.merma_foil_pct_vigente, p.merma_foil_pct_cotizada)), '%') : '',
        laminadoActivo ? ftRow('Merma de Laminado', pct(vig(p.merma_laminado_pct_vigente, p.merma_laminado_pct_cotizada)), '%') : ''
    ].join('');
    ftFillSection('productDocSustratoSection', 'productDocSustratoBody', Boolean(sustrato), [
        ftRow('Sustrato', sustrato || ''),
        ftRow('Ancho de Bobina', anchoBobinaTxt),
        ftRow('Calibre', num(sf.calibre_micras, 1), 'µm'),
        ftRow('Gramaje', num(sf.gramaje_g_m2, 1), 'g/m²'),
        ftRow('Superficie', sf.tipo_superficie || ''),
        ftRow('Aplicación', sf.ambiente_aplicacion || ''),
        ftRow('Clasificación', sf.clasificacion || ''),
        ftRow('Tipo de Transferencia', sf.tipo_transferencia || ''),
        mermaRows ? '<div class="production-summary-subhead">Merma</div>' + mermaRows : ''
    ].join(''));

    // ── Barniz ── (columnas del snapshot + catálogo; si nada de eso está poblado,
    // se rellena desde la estación de barniz del motivo)
    var barnizEst = null;
    (Array.isArray(productDetail && productDetail.motivos_detalle) ? productDetail.motivos_detalle : []).forEach(function (m) {
        (Array.isArray(m.tintas) ? m.tintas : []).forEach(function (t) { if (t.tipo === 'barniz' && !barnizEst) barnizEst = t; });
    });
    var pickBarniz = function (col, est) {
        var c = Number(col);
        if (Number.isFinite(c) && c !== 0) return c;
        return (est != null && Number.isFinite(Number(est))) ? Number(est) : null;
    };
    var barnizTipo = p.barniz_tipo || (barnizEst ? barnizEst.etiqueta : '') || '';
    var barnizBcm = pickBarniz(p.barniz_bcm, barnizEst && barnizEst.bcmAnilox);
    var barnizCob = pickBarniz(p.barniz_cobertura_pct, barnizEst && barnizEst.coberturaPct);
    var barnizFactor = bf.factorTransferencia != null ? bf.factorTransferencia : (barnizEst ? barnizEst.factorTransferencia : null);
    var barnizDens = bf.densidad != null ? bf.densidad : (barnizEst ? barnizEst.densidad : null);
    var barnizShow = Boolean(barnizTipo) || Number(p.barniz_costo_total) > 0 || Boolean(barnizEst);
    ftFillSection('productDocBarnizSection', 'productDocBarnizBody', barnizShow, [
        ftRow('Tipo', barnizTipo),
        ftRow('Reservado', barnizShow ? (p.barniz_zonificado ? 'Sí' : 'No') : ''),
        ftRow('BCM Anilox', num(barnizBcm, 2)),
        ftRow('Cobertura', num(barnizCob, 0), '%'),
        ftRow('Factor de Transferencia', num(barnizFactor, 2)),
        ftRow('Densidad', num(barnizDens, 2)),
        ftRow('Viscosidad', num(vig(p.barniz_viscosidad_vigente, bf.viscosidad), 0), 's'),
        ftRow('Potencia UV', num(vig(p.barniz_curado_uv_setpoint_vigente, bf.potenciaUv), 0), '%'),
        ftRow('Temperatura UV', num(bf.tempUv, 0), '°C'),
        (p.barniz_comentario ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(p.barniz_comentario)) + '</span></div>' : '')
    ].join(''));

    // ── Estampado ── (el nombre del foil lleva el color: "Foil Dorado" → Dorado)
    var estampadoColor = estampadoTipo
        ? String(estampadoTipo).replace(/^\s*foil\s+/i, '').trim() || estampadoTipo
        : '';
    ftFillSection('productDocEstampadoSection', 'productDocEstampadoBody', Boolean(estampadoTipo), [
        ftRow('Tipo', estampadoTipo),
        ftRow('Color', estampadoColor !== estampadoTipo ? estampadoColor : ''),
        ftRow('Cantidad de Sellos', Number(p.estampado_sellos) > 0 ? formatNumber(p.estampado_sellos, 0) : '')
    ].join(''));

    // ── Laminado ──
    ftFillSection('productDocLaminadoSection', 'productDocLaminadoBody', laminadoActivo, [
        ftRow('Material', p.laminado_tipo || ''),
        (p.laminado_comentario ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentario</span><span class="production-summary-value">' + escapeHtml(String(p.laminado_comentario)) + '</span></div>' : '')
    ].join(''));

    // ── Sellos ── (resumen del proceso de sellos del cálculo; conteo e in², sin costos)
    var pf = (p.sellos_ficha && typeof p.sellos_ficha === 'object') ? p.sellos_ficha : null;
    var plaFilas = (pf && Array.isArray(pf.filas)) ? pf.filas.filter(function (f) { return Number(f.sellos) > 0 || Number(f.inTotalMotivo) > 0; }) : [];
    var plaInPorSello = Number((plaFilas[0] && plaFilas[0].inPorSello) || (pf && pf.inPorSello)) || 0;
    var plaCantidad = plaFilas.reduce(function (s, f) { return s + (Number(f.sellos) || 0); }, 0);
    var plaInMotivo = plaFilas.length ? (Number(plaFilas[0].inTotalMotivo) || (Number(plaFilas[0].sellos) || 0) * plaInPorSello) : 0;
    var plaInAcum = plaFilas.reduce(function (s, f) { return s + (Number(f.inTotalMotivo) || (Number(f.sellos) || 0) * plaInPorSello); }, 0);
    var plaShow = Boolean(pf && (plaFilas.length || (pf.esExterno && (pf.descripcion || pf.comentario))));
    ftFillSection('productDocSellosSection', 'productDocSellosBody', plaShow, pf ? [
        ftRow('Origen', pf.origen || ''),
        ftRow('Cant. Sellos', plaCantidad > 0 ? fmtInt(plaCantidad) : ''),
        ftRow('in² x Sello', plaInPorSello > 0 ? formatNumber(plaInPorSello, 2) : '', 'in²'),
        ftRow('in² Arte', plaInMotivo > 0 ? formatNumber(plaInMotivo, 2) : '', 'in²'),
        ftRow('in² Acum.', plaInAcum > 0 ? formatNumber(plaInAcum, 2) : '', 'in²'),
        ftRow('Descripción', pf.esExterno ? (pf.descripcion || '') : ''),
        ftRow('Comentarios', pf.esExterno ? (pf.comentario || '') : '')
    ].join('') : '');

    // ── Troquelado ──
    var troShow = Boolean(p.die_code) || Boolean(td.ancho_etiqueta_in || td.ancho_total_troquel_in);
    var etiquetaSize = (td.ancho_etiqueta_in && td.largo_etiqueta_in)
        ? num(td.ancho_etiqueta_in, 2) + ' x ' + num(td.largo_etiqueta_in, 2) : '';
    var troquelSize = (td.ancho_total_troquel_in && td.largo_total_troquel_in)
        ? num(td.ancho_total_troquel_in, 2) + ' x ' + num(td.largo_total_troquel_in, 2) : '';
    ftFillSection('productDocTroqueladoSection', 'productDocTroqueladoBody', troShow, [
        ftRow('Troquel', p.die_code || ''),
        ftRow('Forma', p.troquel_forma || ''),
        ftRow('Tamaño de Etiqueta', etiquetaSize, 'in'),
        ftRow('Tamaño de Troquel', troquelSize, 'in'),
        ftRow('Merma de Ajuste', num(p.troquelado_merma_ajuste_metros, 1), 'm')
    ].join(''));

    // ── Rebobinado ──
    ftFillSection('productDocRebobinadoSection', 'productDocRebobinadoBody', true, [
        ftRow('Máquina', p.rebobinado_maquina || ''),
        ftRow('Velocidad', num(p.rebobinado_velocidad, 1), 'm/min'),
        ftRow('Cantidad Empalmes Máximo', num(p.rebobinado_empalmes_maximo, 0)),
        ftRow('Producto por Rollo', Number(p.labels_per_roll) > 0 ? formatNumber(p.labels_per_roll, 0) : ''),
        ftRow('Sentido de Bobinado', outText),
        ftRow('Ancho de Core', num(p.core_width, 2), 'in'),
        ftRow('Tipo de Core', tipoCore),
        ftRow('Merma de Operación', num(vig(p.rebobinado_merma_operacion_pct_vigente, p.rebobinado_merma_operacion_pct), 1), '%'),
        ftRow('Merma de Ajuste', (p.rebobinado_merma_ajuste_m_vigente != null && p.rebobinado_merma_ajuste_m_vigente !== '') ? num(p.rebobinado_merma_ajuste_m_vigente, 1) : num(p.rebobinado_merma_ajuste_metros, 1), 'm')
    ].join(''));
    renderOutputTypePreview(outputType);

    // ── Empaque ── (configuración por unidad, en 4 grupos: Proceso · Core · Caja · Tarima)
    var empRollosPorCaja = Number(p.etiquetas_por_caja) || 0;
    var cajaDims = (Number(cf.largoInternoCm) > 0 && Number(cf.anchoInternoCm) > 0 && Number(cf.altoInternoCm) > 0)
        ? num(cf.largoInternoCm, 0) + ' x ' + num(cf.anchoInternoCm, 0) + ' x ' + num(cf.altoInternoCm, 0) : '';
    var tarimaDims = (Number(p.empaque_tarima_largo) > 0 && Number(p.empaque_tarima_ancho) > 0 && Number(p.empaque_tarima_alto) > 0)
        ? num(p.empaque_tarima_largo, 2) + ' x ' + num(p.empaque_tarima_ancho, 2) + ' x ' + num(p.empaque_tarima_alto, 2) : '';
    var empProcesoRows = [
        ftRow('Cantidad de Operarios', num(p.empaque_operarios, 0)),
        ftRow('Rendimiento por Hora', num(p.empaque_rendimiento_por_hora, 0), 'rollos/h'),
        ftRow('Servicio Externo', Number(p.empaque_costo_externo) > 0 ? 'Sí' : 'No')
    ].join('');
    var empCoreRows = [
        ftRow('Ancho de Core', num(p.core_width, 2), 'in'),
        ftRow('Tipo de Core', tipoCore),
        ftRow('Unidades por Rollo', Number(p.labels_per_roll) > 0 ? formatNumber(p.labels_per_roll, 0) : '')
    ].join('');
    var empCajaRows = [
        ftRow('Tipo de Caja', p.empaque_tipo_caja_nombre || p.empaque_tipo_caja || ''),
        ftRow('Dimensiones Internas de Caja', cajaDims, 'cm'),
        ftRow('Rollos por Caja', empRollosPorCaja ? formatNumber(empRollosPorCaja, 0) : ''),
        ftRow('Peso por Caja', num(p.empaque_kg_por_caja, 2), 'kg')
    ].join('');
    var empTarimaRows = [
        ftRow('Dimensiones de Tarima', tarimaDims, 'm'),
        ftRow('Peso de Tarima', num(p.empaque_tarima_peso, 2), 'kg')
    ].join('');
    var empBolsaRows = [
        ftRow('Tipo de Bolsa', p.empaque_tipo_bolsa_nombre || ''),
        ftRow('Cantidad de Bolsas', Number(p.empaque_cantidad_bolsas) > 0 ? formatNumber(p.empaque_cantidad_bolsas, 0) : '')
    ].join('');
    var empGrupo = function (titulo, filas) {
        return filas ? '<div class="production-empaque-group"><div class="production-summary-subhead">' + titulo + '</div>' + filas + '</div>' : '';
    };
    var empShow = Boolean(empProcesoRows || empCoreRows || empCajaRows || empTarimaRows || p.empaque_tipo_bolsa_nombre);
    ftFillSection('productDocEmpaqueSection', 'productDocEmpaqueBody', empShow, [
        '<div class="production-empaque-consumo">',
        empGrupo('Proceso', empProcesoRows),
        empGrupo('Consumo · Core', empCoreRows),
        empGrupo('Consumo · Caja', empCajaRows),
        p.empaque_tipo_bolsa_nombre ? empGrupo('Consumo · Bolsa', empBolsaRows) : '',
        empGrupo('Consumo · Tarima', empTarimaRows),
        '</div>'
    ].join(''));

    // ── Observaciones ── (comentarios de acabados consolidados)
    var obs = [
        ['Barniz', p.barniz_comentario],
        ['Laminado', p.laminado_comentario],
        ['Rebobinado', p.rebobinado_comentario],
        ['Empaque', p.empaque_comentario]
    ].filter(function (o) { return normalizeText(o[1]); })
     .map(function (o) { return '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">' + o[0] + '</span><span class="production-summary-value">' + escapeHtml(String(o[1])) + '</span></div>'; })
     .join('');
    ftFillSection('productDocObservacionesSection', 'productDocObservacionesBody', Boolean(obs), obs);

    // ── Procesos Adicionales ── (mismo render que la Orden, si el producto los trae)
    var procesosAdicionales = Array.isArray(productDetail && productDetail.procesos_adicionales) ? productDetail.procesos_adicionales : [];
    ftFillSection('productDocProcesosAdicionalesSection', 'productDocProcesosAdicionalesList', procesosAdicionales.length,
        procesosAdicionales.map(function (pa) {
            return '<div class="production-summary-item production-summary-item-full">' +
                '<span class="production-summary-value">' + escapeHtml(pa.descripcion || 'Sin descripción') + '</span>' +
                (pa.comentario ? '<span class="production-notes-box production-notes-input" style="margin-top:4px;">' + escapeHtml(pa.comentario) + '</span>' : '') +
            '</div>';
        }).join(''));

    redistributeAcabadosFlex('productDocAcabadosFlex');
}

// Motivos: mismo render que renderMotivosLayout() en orden-produccion.js — tarjeta
// "motivo-block" por motivo (pastilla + franja de stats + paneles Versiones / Tintas
// del Motivo con borde + punto de color por tinta) y franja resumen al pie. El backend
// entrega motivos_detalle con la misma función que la Orden, así que ambas se ven igual.
const MOTIVO_TINTA_TIPO_LABELS = { proceso: 'Proceso', directo: 'Directo', adicional: 'Adicional', barniz: 'Barniz' };

function fmtInt(v) {
    var n = Number(v);
    return Number.isFinite(n) ? formatNumber(n, 0) : '0';
}

// Punto de color de la tinta (inventario: tintas.productos.color = nombre;
// tintas.pantones_recetas.color_hex = hex). Los nombres CMYK/Blanco se mapean a hex.
var TINTA_COLOR_HEX = {
    'cian': '#00AEEF', 'cyan': '#00AEEF',
    'magenta': '#EC008C',
    'amarillo': '#FFD400', 'yellow': '#FFD400',
    'negro': '#1A1A1A', 'black': '#1A1A1A',
    'blanco': '#FFFFFF', 'white': '#FFFFFF'
};
function resolveTintaColor(raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) return '';
    if (/^#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(v)) return v.charAt(0) === '#' ? v : '#' + v;
    return TINTA_COLOR_HEX[v.toLowerCase()] || '';
}

function motivoTintasTableHtml(motivo) {
    var tintas = Array.isArray(motivo.tintas) ? motivo.tintas : [];
    if (!tintas.length) return '<div class="motivo-empty">Sin tintas configuradas para este arte.</div>';
    var totalText = motivo.consumoTotalKg != null ? formatNumber(motivo.consumoTotalKg, 2) + ' kg' : '—';
    return '<table class="motivo-table motivo-tintas-table">' +
        '<thead><tr><th class="ta-r">#</th><th>Tipo</th><th>Tinta</th><th class="ta-r">Cobertura</th><th class="ta-r">BCM Anilox</th><th class="ta-r">Factor Transf.</th><th class="ta-r">Densidad</th><th class="ta-r">Consumo</th></tr></thead>' +
        '<tbody>' + tintas.map(function (t) {
            var tipoLabel = MOTIVO_TINTA_TIPO_LABELS[t.tipo] || t.tipo || '';
            var hex = resolveTintaColor(t.color);
            var dot = hex
                ? '<span class="motivo-tinta-dot" style="background:' + escapeHtml(hex) + '"></span>'
                : '<span class="motivo-tinta-dot motivo-tinta-dot-none"></span>';
            return '<tr' + (t.activo === false ? ' class="motivo-tinta-inactiva"' : '') + '>' +
                '<td class="ta-r">' + (t.estacion + 1) + '</td>' +
                '<td>' + escapeHtml(tipoLabel) + '</td>' +
                '<td><span class="motivo-tinta-cell">' + dot + escapeHtml(t.etiqueta || '—') + '</span></td>' +
                '<td class="ta-r">' + (t.coberturaPct != null ? formatNumber(t.coberturaPct, 0) + ' %' : '—') + '</td>' +
                '<td class="ta-r">' + (t.bcmAnilox != null ? formatNumber(t.bcmAnilox, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.factorTransferencia != null ? formatNumber(t.factorTransferencia, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.densidad != null ? formatNumber(t.densidad, 2) : '—') + '</td>' +
                '<td class="ta-r">' + (t.consumoKg != null ? formatNumber(t.consumoKg, 2) + ' kg' : '—') + '</td>' +
            '</tr>';
        }).join('') + '</tbody>' +
        '<tfoot><tr class="motivo-tintas-total"><td colspan="7">Consumo Total</td><td class="ta-r">' + totalText + '</td></tr></tfoot>' +
        '</table>';
}

function motivoVersionesTableHtml(motivo) {
    var versiones = Array.isArray(motivo.versiones) ? motivo.versiones : [];
    if (!versiones.length) return '<div class="motivo-empty">Sin versiones declaradas.</div>';
    return '<table class="motivo-table motivo-versiones-table">' +
        '<thead><tr><th class="ta-r">#</th><th>Nombre</th><th>Descripción</th><th class="ta-r">Cantidad</th><th class="ta-r">Sellos</th></tr></thead>' +
        '<tbody>' + versiones.map(function (v) {
            return '<tr><td class="ta-r">' + (v.indice + 1) + '</td><td>' + escapeHtml(v.nombre || '—') + '</td><td>' + escapeHtml(v.descripcion || '—') + '</td><td class="ta-r">' + fmtInt(v.cantidad) + '</td><td class="ta-r">' + fmtInt(v.sellos) + '</td></tr>';
        }).join('') + '</tbody></table>';
}

function renderMotivosLayout() {
    var layout = document.getElementById('productDocImpresionModule');
    var wrap = document.getElementById('productDocMotivosTableWrap');
    if (!layout || !wrap) return;
    var motivos = Array.isArray(productDetail && productDetail.motivos_detalle) ? productDetail.motivos_detalle : [];
    currentMotivosDetalle = motivos;
    // El módulo "Impresión" queda SIEMPRE visible: aloja la Máquina de Impresión,
    // que debe verse haya o no motivos detallados.
    layout.hidden = false;
    if (!motivos.length) {
        wrap.innerHTML = '';
        return;
    }
    var stat = function (label, value) {
        return '<div class="motivo-stat"><span class="motivo-stat-label">' + escapeHtml(label) +
            '</span><span class="motivo-stat-value">' + value + '</span></div>';
    };
    var cards = motivos.map(function (motivo) {
        var mLabel = 'Arte ' + (motivo.indice + 1);
        var mCaption = (motivo.nombre && motivo.nombre !== mLabel) ? escapeHtml(motivo.nombre) : 'Detalle del Arte';
        return '<div class="motivo-block">' +
            '<div class="motivo-block-head">' +
                '<div class="motivo-block-head-left">' +
                    '<span class="motivo-tab">' + escapeHtml(mLabel) + '</span>' +
                    '<span class="motivo-head-caption">' + mCaption + '</span>' +
                '</div>' +
                '<div class="motivo-stats">' +
                    stat('Cantidad', fmtInt(motivo.cantidad)) +
                    stat('Proceso', fmtInt(motivo.proceso)) +
                    stat('Directo', fmtInt(motivo.directo)) +
                    stat('Adicionales', fmtInt(motivo.adicional)) +
                    stat('Sellos', fmtInt(motivo.sellos)) +
                '</div>' +
            '</div>' +
            '<div class="motivo-block-body">' +
                '<div class="motivo-panel">' +
                    '<div class="motivo-panel-title">Versiones</div>' +
                    motivoVersionesTableHtml(motivo) +
                '</div>' +
                '<div class="motivo-panel">' +
                    '<div class="motivo-panel-title">Tintas del Arte</div>' +
                    motivoTintasTableHtml(motivo) +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    var summary = '';
    if (motivos.length >= 2) {
        var totVersiones = motivos.reduce(function (s, m) { return s + (Array.isArray(m.versiones) ? m.versiones.length : 0); }, 0);
        var totCantidad = motivos.reduce(function (s, m) { return s + (Number(m.cantidad) || 0); }, 0);
        var totSellos = motivos.reduce(function (s, m) { return s + (Number(m.sellos) || 0); }, 0);
        var totConsumo = motivos.reduce(function (s, m) { return s + (Number(m.consumoTotalKg) || 0); }, 0);
        summary =
            '<div class="motivo-summary">' +
                stat('Artes', fmtInt(motivos.length)) +
                stat('Versiones', fmtInt(totVersiones)) +
                stat('Cantidad Total', fmtInt(totCantidad)) +
                stat('Sellos Totales', fmtInt(totSellos)) +
                '<div class="motivo-stat motivo-stat-emphasis"><span class="motivo-stat-label">Consumo Total de Tintas</span>' +
                    '<span class="motivo-stat-value">' + formatNumber(totConsumo, 2) + ' kg</span></div>' +
            '</div>';
    }

    wrap.innerHTML = cards + summary;
}

function bindProductDocDetailPopovers(p) {
    document.querySelectorAll('[data-close-popover]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-close-popover');
            // La vista previa de adjuntos vive sobre el modal de Detalle: al cerrarla
            // solo se oculta ella, no el modal que hay detrás.
            if (targetId === 'productDocAttachmentPreviewPopover') {
                document.getElementById(targetId)?.setAttribute('hidden', '');
                return;
            }
            closeAllProductDocPopovers();
        });
    });
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-CR');
}

function formatMoney(value) {
    const parsed = Number(String(value ?? 0).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    const number = Number.isFinite(parsed) ? parsed : 0;
    return `$${number.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Dimensiones incorporadas al nombre del producto: 2 decimales, coma decimal
// (Costa Rica) y '' como pulgadas — mismo formato que buildJobNameDimensions()
// en orden-produccion.js, donde el nombre del trabajo lleva las medidas.
function formatProductNameDimPiece(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '';
    return `${num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}''`;
}

function buildProductNameDimensions(width, length) {
    const widthText = formatProductNameDimPiece(width);
    const lengthText = formatProductNameDimPiece(length);
    if (widthText && lengthText) return `${widthText} x ${lengthText}`;
    return widthText || lengthText || '';
}

function initialsFromName(value) {
    const words = normalizeText(value).split(/\s+/).filter(Boolean);
    return (words.slice(0, 2).map((item) => item.charAt(0).toUpperCase()).join('') || 'PL');
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

function canMessageShellParent() {
    return window !== window.parent;
}

function withShellParam(route) {
    const [path, hash = ''] = String(route || '').split('#');
    const joiner = path.includes('?') ? '&' : '?';
    const finalPath = path.includes('shell=1') ? path : `${path}${joiner}shell=1`;
    return hash ? `${finalPath}#${hash}` : finalPath;
}

function openRouteInShell(route, label) {
    if (!canMessageShellParent()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route: withShellParam(route), label }, window.location.origin);
    return true;
}

function buildBdfgContext() {
    const product = productDetail?.producto;
    if (!product) return null;
    const quoteCode = normalizeText(product.quote_code);
    const skuVisible = normalizeText(product.finished_product_sku) || normalizeText(product.product_code);
    return {
        kind: 'product-document',
        title: product.product_name || skuVisible || 'Producto',
        subtitle: [product.client_name, product.line_code].filter(Boolean).join(' · ') || 'Ficha del producto',
        documentRoute: `/producto-documento?codigo=${encodeURIComponent(product.product_code || '')}`,
        documentLabel: `SKU ${skuVisible}`.trim(),
        secondaryRoute: quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}` : '',
        secondaryLabel: quoteCode ? `Cotización ${quoteCode}` : 'Cotización',
        secondaryDescription: 'Abrir la cotización origen del producto',
        quoteCode,
        lineCode: normalizeText(product.line_code),
        productCode: normalizeText(product.product_code),
        dates: {
            createdAt: product.created_at || '',
            quotedAt: product.last_quoted_at || '',
            updatedAt: product.updated_at || ''
        }
    };
}

function publishBdfgContext() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-bdfg-context', context: buildBdfgContext() }, window.location.origin);
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la solicitud.');
    return payload;
}

function setStatus(message, tone = 'info') {
    statusEl.textContent = message || '';
    statusEl.dataset.tone = tone;
    statusEl.hidden = !String(message || '').trim();
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

function getOpenIconConfig() {
    const general = config?.general || {};
    return {
        value: config?.icons?.browserOpen || config?.icons?.tableOpen || '↗',
        color: firstFilled(general.iconColorBrowserOpen, general.iconColorTableOpen, general.iconColor, '#0b81b8'),
        hover: firstFilled(general.iconColorHoverBrowserOpen, general.iconColorHoverTableOpen, '#07638c'),
        size: Number(firstFilled(general.iconSizeBrowserOpen, general.iconSizeTableOpen, 18)) || 18
    };
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
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

function renderEmptyTableRow(colspan, message) {
    return `<tr><td colspan="${colspan}">${escapeHtml(message)}</td></tr>`;
}

function renderHistoryTable(items = []) {
    if (!items.length) {
        historyTableBodyEl.innerHTML = renderEmptyTableRow(6, 'Todavía no hay cotizaciones registradas para este producto.');
        return;
    }
    const openIcon = getOpenIconConfig();
    historyTableBodyEl.innerHTML = items.map((item) => {
        const quoteCode = item.quote_code || '';
        const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
        return `
            <tr>
                <td>${escapeHtml(quoteCode)}</td>
                <td>${escapeHtml(item.line_code || '')}</td>
                <td>${escapeHtml(item.customer_name || '')}</td>
                <td>${escapeHtml(item.job_name || item.action || '')}</td>
                <td>${escapeHtml(formatDate(item.created_at || item.created_on))}</td>
                <td><a class="browser-open-link" href="${escapeHtml(route)}" data-route="${escapeHtml(route)}" data-label="Cotización ${escapeHtml(quoteCode)}" aria-label="Abrir cotización ${escapeHtml(quoteCode)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir cotización', 'table-icon-media')}</a></td>
            </tr>
        `;
    }).join('');
}

function renderOrdersTable(items = []) {
    if (!ordersTableBodyEl) return;
    if (!items.length) {
        ordersTableBodyEl.innerHTML = renderEmptyTableRow(6, 'Todavía no hay órdenes registradas para este producto.');
        return;
    }
    const openIcon = getOpenIconConfig();
    ordersTableBodyEl.innerHTML = items.map((item) => {
        const orderCode = item.order_code || '';
        const route = `/orden-produccion/${encodeURIComponent(orderCode)}`;
        return `
            <tr>
                <td>${escapeHtml(orderCode)}</td>
                <td>${escapeHtml(item.quote_code || '')}</td>
                <td>${escapeHtml(item.line_code || '')}</td>
                <td>${escapeHtml(item.machine_name || '')}</td>
                <td>${escapeHtml(formatDate(item.created_at || item.delivered_on))}</td>
                <td><a class="browser-open-link" href="${escapeHtml(route)}" data-route="${escapeHtml(route)}" data-label="Orden ${escapeHtml(orderCode)}" aria-label="Abrir orden ${escapeHtml(orderCode)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir orden', 'table-icon-media')}</a></td>
            </tr>
        `;
    }).join('');
}

// ── ADJUNTOS ────────────────────────────────────────────────────────────────
// Mismo mecanismo que orden-produccion.js: mismas tarjetas, mismos íconos
// (Configuración → Diseño → Íconos), misma vista previa, misma subida/borrado y
// grabación de audio. Fuente de datos: /api/cotizaciones/:q/lineas/:l/adjuntos.
function getOrderIcon(keys, canonicalKey, fallbackValue, fallbackColor, fallbackSize) {
    const icons = config.icons || {};
    for (const key of keys) {
        if (icons[key]) return iconConfigFor(key, icons[key], fallbackColor, fallbackSize);
    }
    return iconConfigFor(canonicalKey, fallbackValue, fallbackColor, fallbackSize);
}

function renderInlineIcon(target, iconValue, color, size) {
    if (!target) return;
    const host = target.closest('.attachment-action-btn, .quote-request-icon-action, .quote-request-attachment-remove');
    const value = String(iconValue || '').trim();
    const iconSize = Number(size) || 18;
    if (host) {
        host.style.setProperty('--icon-color', color || '');
        host.style.setProperty('--icon-hover-color', color || '');
        host.style.setProperty('--config-icon-size', `${iconSize}px`);
    }
    target.style.color = host ? 'currentColor' : (color || '');
    const isSvg = /^data:image\/svg\+xml/i.test(value) || /\.svg(\?|#|$)/i.test(value);
    const isImage = /^data:image\//i.test(value) || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value);
    if (isSvg) {
        target.innerHTML = `<span class="icon-svg-mask table-icon-media" style="width:${iconSize}px;height:${iconSize}px;-webkit-mask-image:url('${escapeHtml(value)}');mask-image:url('${escapeHtml(value)}');"></span>`;
    } else if (isImage) {
        target.innerHTML = `<span class="icon-image-wrap table-icon-media" role="img" aria-label="" style="width:${iconSize}px;height:${iconSize}px;"><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${escapeHtml(value)}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
    } else {
        target.innerHTML = `<span class="icon-glyph" style="font-size:${iconSize}px;">${escapeHtml(value)}</span>`;
    }
}

function initAttachmentActionIcons() {
    const attachmentConf = getOrderIcon(['quoteRequestAttachment', 'lineAttachments'], 'quoteRequestAttachment', '📎', '#1e516d', 18);
    renderInlineIcon(document.querySelector('[data-order-inline-icon="attachment"]'), attachmentConf.value, attachmentConf.color, attachmentConf.size);
    const recordConf = getOrderIcon(['quoteRequestRecord'], 'quoteRequestRecord', '●', '#1e516d', 18);
    renderInlineIcon(document.querySelector('[data-order-inline-icon="record"]'), recordConf.value, recordConf.color, recordConf.size);
}

function attachmentSourceContext() {
    const p = productDetail?.producto || {};
    return { quoteCode: p.quote_code || '', lineCode: p.line_code || '' };
}

async function refreshProductAttachments() {
    const { quoteCode, lineCode } = attachmentSourceContext();
    const seed = Array.isArray(productDetail?.attachments) ? productDetail.attachments : [];
    if (!quoteCode || !lineCode) {
        currentProductAttachments = seed;
        return currentProductAttachments;
    }
    try {
        const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, { headers: sessionHeaders() });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los adjuntos relacionados.');
        currentProductAttachments = Array.isArray(payload.items) ? payload.items : [];
    } catch (_) {
        currentProductAttachments = seed;
    }
    return currentProductAttachments;
}

function renderAttachments(attachments = []) {
    if (!attachmentsBodyEl) return;
    const deleteConf = getOrderIcon(['quoteRequestAttachmentDelete', 'eliminar adjunto solicitud'], 'quoteRequestAttachmentDelete', '×', '#b94848', 18);
    const downloadConf = getOrderIcon(['attachmentDownload'], 'attachmentDownload', '⇩', '#0b81b8', 18);
    attachmentsBodyEl.innerHTML = attachments.length
        ? attachments.map((item, index) => {
            const label = item.label || item.file_name || item.key || 'Adjunto';
            const value = item.value || item.file_name || '';
            const notes = item.notes ? `<div class="attachment-card-meta">${escapeHtml(String(item.notes))}</div>` : '';
            const mimeType = String(item.mime_type || '').toLowerCase();
            const isImage = mimeType.startsWith('image/') || /^data:image\//i.test(String(value));
            const isAudio = mimeType.startsWith('audio/');
            const imageSrc = isImage ? (String(value).startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : '')) : '';
            const audioSrc = isAudio ? (String(value).startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : '')) : '';
            const preview = isImage && imageSrc
                ? `<div class="attachment-card-preview"><img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(label)}" class="attachment-card-thumb"></div>`
                : isAudio && audioSrc
                    ? `<div class="attachment-card-preview attachment-card-preview-audio"><audio controls src="${escapeHtml(audioSrc)}" class="attachment-card-audio"></audio></div>`
                    : '';
            return `
                <article class="attachment-card" data-attachment-index="${index}">
                    ${preview}
                    <div class="attachment-card-main">
                        <strong>${escapeHtml(label)}</strong>
                        ${!isImage && !isAudio ? `<div class="attachment-card-meta">${escapeHtml(String(value))}</div>` : ''}
                        ${notes}
                    </div>
                    <div class="attachment-card-actions">
                        ${item.id ? `<a class="attachment-action-btn" href="/api/adjuntos/${encodeURIComponent(item.id)}/download" target="_blank" rel="noopener noreferrer" aria-label="Descargar adjunto" title="Descargar" data-icon-role="download"></a>` : ''}
                        <button type="button" class="attachment-action-btn attachment-action-delete" data-delete-attachment="${index}" aria-label="Eliminar adjunto" title="Eliminar" data-icon-role="delete"></button>
                    </div>
                </article>
            `;
        }).join('')
        : '<div class="attachments-empty">Este producto no tiene adjuntos relacionados todavía.</div>';
    attachmentsBodyEl.querySelectorAll('[data-icon-role="download"]').forEach((el) => {
        renderInlineIcon(el, downloadConf.value, downloadConf.color, downloadConf.size);
    });
    attachmentsBodyEl.querySelectorAll('[data-icon-role="delete"]').forEach((el) => {
        renderInlineIcon(el, deleteConf.value, deleteConf.color, deleteConf.size);
    });
    attachmentsBodyEl.querySelectorAll('[data-delete-attachment]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.deleteAttachment);
            if (!Number.isInteger(idx)) return;
            deleteAttachment(idx);
        });
    });
}

async function refreshAndRenderAttachments() {
    await refreshProductAttachments();
    renderAttachments(currentProductAttachments);
}

function buildAttachmentPreviewContent(item) {
    const label = item.label || item.file_name || item.key || 'Adjunto';
    const value = String(item.value || item.file_name || '');
    const mimeType = String(item.mime_type || '').toLowerCase();
    const nameForExt = String(item.file_name || item.label || value || '').toLowerCase();
    const ext = (nameForExt.match(/\.([a-z0-9]+)$/) || ['', ''])[1];
    const src = value.startsWith('data:') ? value : (item.id ? `/api/adjuntos/${encodeURIComponent(item.id)}/download` : value);
    const isImage = mimeType.startsWith('image/') || /^data:image\//i.test(value) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
    const isAudio = mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
    const isVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
    if (isImage && src) return `<img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" class="attachment-preview-image">`;
    if (isPdf && src) return `<iframe src="${escapeHtml(src)}" class="attachment-preview-frame" title="${escapeHtml(label)}"></iframe>`;
    if (isAudio && src) return `<audio controls src="${escapeHtml(src)}" class="attachment-preview-audio"></audio>`;
    if (isVideo && src) return `<video controls src="${escapeHtml(src)}" class="attachment-preview-video"></video>`;
    return '<div class="production-summary-empty">Vista previa no disponible para este tipo de archivo.</div>'
        + (src ? `<a class="attachment-action-btn attachment-preview-download-link" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">Abrir / Descargar</a>` : '');
}

function openAttachmentPreview(index) {
    const item = currentProductAttachments[index];
    if (!item) return;
    const label = item.label || item.file_name || item.key || 'Adjunto';
    const titleEl = document.getElementById('productDocAttachmentPreviewTitle');
    if (titleEl) titleEl.textContent = label;
    const bodyEl = document.getElementById('productDocAttachmentPreviewBody');
    if (bodyEl) bodyEl.innerHTML = buildAttachmentPreviewContent(item);
    document.getElementById('productDocAttachmentPreviewPopover')?.removeAttribute('hidden');
}

async function deleteAttachment(index) {
    const item = currentProductAttachments[index];
    if (!item) return;
    if (!item.id) {
        currentProductAttachments = currentProductAttachments.filter((_, i) => i !== index);
        renderAttachments(currentProductAttachments);
        return;
    }
    const response = await fetch(`/api/adjuntos/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: sessionHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(payload.error || 'No se pudo eliminar el adjunto.', 'error'); return; }
    await refreshAndRenderAttachments();
}

async function handleAttachmentUpload(event) {
    const files = event.target?.files;
    if (!files || !files.length) return;
    const { quoteCode, lineCode } = attachmentSourceContext();
    if (!quoteCode || !lineCode) {
        setStatus('El producto no tiene cotización/línea origen.', 'error');
        return;
    }
    for (const file of Array.from(files)) {
        setStatus(`Cargando ${file.name}...`);
        try {
            const contentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
                reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
                reader.readAsDataURL(file);
            });
            const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
                body: JSON.stringify({
                    fileName: file.name,
                    contentBase64,
                    mimeType: file.type || 'application/octet-stream',
                    fileExt: (file.name.split('.').pop() || '').toLowerCase(),
                    notes: 'adjunto_orden',
                    uploadedBy: 'producto'
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No se pudo subir el adjunto.');
        } catch (error) {
            console.error('Error subiendo adjunto:', error);
        }
    }
    await refreshAndRenderAttachments();
    event.target.value = '';
    setStatus('');
}

async function toggleAttachmentAudioRecording() {
    if (attachmentsIsRecording && attachmentsMediaRecorder) {
        attachmentsMediaRecorder.stop();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        attachmentsRecordingChunks = [];
        attachmentsMediaRecorder = new MediaRecorder(stream);
        attachmentsMediaRecorder.ondataavailable = (event) => {
            if (event.data.size) attachmentsRecordingChunks.push(event.data);
        };
        attachmentsMediaRecorder.onstop = async () => {
            const blob = new Blob(attachmentsRecordingChunks, { type: attachmentsMediaRecorder.mimeType || 'audio/webm' });
            const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.readAsDataURL(blob);
            });
            const { quoteCode, lineCode } = attachmentSourceContext();
            if (quoteCode && lineCode) {
                try {
                    setStatus('Guardando audio...');
                    const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
                        body: JSON.stringify({
                            fileName,
                            contentBase64: String(dataUrl).split(',').pop() || '',
                            mimeType: blob.type || 'audio/webm',
                            fileExt: 'webm',
                            notes: 'audio_orden',
                            uploadedBy: 'producto'
                        })
                    });
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el audio.');
                    await refreshAndRenderAttachments();
                } catch (error) {
                    console.error('Error guardando audio:', error);
                }
            }
            stream.getTracks().forEach((track) => track.stop());
            attachmentsIsRecording = false;
            if (audioRecordButtonEl) audioRecordButtonEl.dataset.recording = 'false';
            if (audioRecordIndicatorEl) audioRecordIndicatorEl.hidden = true;
            setStatus('');
        };
        attachmentsMediaRecorder.start();
        attachmentsIsRecording = true;
        if (audioRecordButtonEl) audioRecordButtonEl.dataset.recording = 'true';
        if (audioRecordIndicatorEl) audioRecordIndicatorEl.hidden = false;
    } catch (error) {
        console.error('Error accediendo al microfono:', error);
        setStatus('No se pudo acceder al micrófono.', 'error');
    }
}

if (attachmentsBodyEl) {
    attachmentsBodyEl.addEventListener('click', (event) => {
        if (event.target.closest('.attachment-card-actions')) return;
        const card = event.target.closest('.attachment-card[data-attachment-index]');
        if (!card) return;
        const idx = Number(card.dataset.attachmentIndex);
        if (!Number.isInteger(idx)) return;
        openAttachmentPreview(idx);
    });
}

function prettifyRawLabel(key) {
    if (RAW_LABELS[key]) return RAW_LABELS[key];
    const text = String(key || '').trim();
    if (!text) return '';
    const lastSegment = text.includes('|') ? text.split('|').pop() : text;
    return lastSegment
        .trim()
        .toLowerCase()
        .replace(/\b(id|cmyk|gsm|bcm|qr)\b/g, (part) => part.toUpperCase())
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function feetToMeters(val) {
    const n = Number(val);
    if (!n && n !== 0) return 0;
    return n * 0.3048;
}

function formatMeters(feetVal, decimals) {
    return formatNumber(feetToMeters(feetVal), decimals != null ? decimals : 1);
}

// Datos de Creación: mismo render que renderCreationSummary() de orden-produccion.js.
// El backend entrega producto.resumen_creacion computado con la misma buildCreationSummary()
// que usa la Orden, así que el detalle del cálculo aparece igual en Producto y en Orden.
function renderCreationSummary(data) {
    if (!data || typeof data !== 'object') return '';
    function val(v) {
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '';
        if (typeof v === 'object') return '';
        return String(v);
    }
    function row(key, v) {
        var s = val(v);
        if (!s) return '';
        return '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(key) + ':</span><span class="production-creation-summary-value">' + escapeHtml(s) + '</span></div>';
    }
    function section(title) {
        return '<div class="production-creation-summary-section">' + escapeHtml(title) + '</div>';
    }
    function subsec(title) {
        return '<div class="production-creation-summary-subsection">' + escapeHtml(title) + '</div>';
    }
    var html = '';
    html += section('General');
    html += row('Cotización', data.cotizacion);
    html += row('Línea', data.linea);
    html += row('Cliente', data.cliente);
    html += row('Código Cliente', data.codigo_cliente);
    html += row('Contacto', data.contacto?.nombre);
    html += row('Email', data.contacto?.email);
    html += row('Teléfono', data.contacto?.telefono);
    html += row('Vendedor', String(data.vendedor || '').toLowerCase() === 'admin' ? '' : data.vendedor);
    html += row('Producto', data.producto);
    // SKU de nuestra nomenclatura, no el product_code interno (P-000xxx).
    html += row('SKU', productDetail?.producto?.finished_product_sku || '');
    html += row('Nombre Trabajo', data.nombre_trabajo);
    html += row('Departamento', data.departamento);
    html += row('Tipo Proceso', data.tipo_proceso);
    html += row('Tipo Orden', data.tipo_orden);
    html += row('Estado Línea', data.estado_linea);
    html += row('Tipo Cálculo', data.tipo_calculo);
    html += row('Estado Cotización', data.estado_cotizacion);
    html += row('Fecha Creación', data.fecha_creacion);
    html += row('Fecha Vencimiento', data.fecha_vencimiento);
    html += row('Condiciones Pago', data.condiciones_pago);
    html += row('Tiempo Entrega', data.tiempo_entrega);
    html += row('Tipo Cambio Venta', data.tipo_cambio_venta);
    html += row('Tipo Cambio Compra', data.tipo_cambio_compra);
    html += row('Moneda', data.moneda);
    html += row('Método Envío', data.metodo_envio);
    html += row('Tipo Etiquetado', data.tipo_etiquetado);
    html += row('Es Frente/Dorso', data.es_frente_dorso);
    html += row('Finalizado para Orden', data.finalizado_para_orden);
    html += row('Cantidad', data.cantidad);
    html += row('Cantidad Productos', data.cantidad_productos);
    html += row('Cantidad Tipos', data.cantidad_tipos);
    html += row('Cambios por Tipos', data.cantidad_cambios_por_tipos);
    html += row('Cambios Adicionales', data.cantidad_cambios_adicionales);
    html += row('Cambios Totales', data.cantidad_cambios_totales);

    html += section('Dimensiones');
    html += row('Ancho (pulgadas)', data.dimensiones?.ancho_pulgadas);
    html += row('Largo (pulgadas)', data.dimensiones?.largo_pulgadas);
    html += row('Área (pulgadas)', data.dimensiones?.area_pulgadas);
    html += row('Área (m2)', data.dimensiones?.area_m2);

    html += section('Material');
    html += row('Código', data.material?.codigo);
    html += row('Nombre', data.material?.nombre);
    html += row('Ancho', data.material?.ancho);
    html += row('m2', data.material?.m2);
    html += row('MSI', data.material?.msi);
    html += row('Metros Totales', data.material?.pies_totales ? formatMeters(data.material.pies_totales, 1) : '');
    html += row('Metros Mácula', data.material?.pies_macula ? formatMeters(data.material.pies_macula, 1) : '');
    html += row('Tipo Aplicación', data.material?.tipo_aplicacion);

    html += section('Producción');
    html += row('Máquina', data.maquina);
    html += row('Sustrato', data.sustrato);

    html += section('Impresión');
    html += row('Tintas', data.impresion?.tintas);
    html += row('Pantones', data.impresion?.pantones);
    html += row('Cantidad Pantones', data.impresion?.cantidad_pantones);
    html += row('CMYK', data.impresion?.cmyk);
    html += row('Tinta Blanca', data.impresion?.tinta_blanca);
    html += row('Doble Blanca', data.impresion?.doble_blanca);
    html += row('Nombres Tintas', data.impresion?.nombres_tintas);
    html += row('IDs Material Tintas', data.impresion?.ids_material_tintas);

    html += section('Troquel');
    html += row('Código', data.troquel?.codigo);
    html += row('Dientes', data.troquel?.dientes);
    html += row('Filas', data.troquel?.filas);
    html += row('Repeticiones', data.troquel?.repeticiones);

    html += section('Acabados');
    if (Array.isArray(data.acabados) && data.acabados.length) {
        data.acabados.forEach(function (a) { html += row(a.tipo, a.detalle || '—'); });
    } else {
        html += row('Acabados', 'Sin acabados');
    }
    html += row('Numerado', data.numerado);

    html += section('Rollo');
    html += row('Ancho de Core', data.rollo?.ancho_core);
    html += row('Diámetro de Core', data.rollo?.diametro_core);
    html += row('Etiquetas por Rollo', data.rollo?.etiquetas_por_rollo);
    html += row('Tipo de Salida', data.rollo?.tipo_salida);

    if (data.metricas) {
        html += section('Métricas de Producción');
        html += row('Pasos por Línea', data.metricas.pasos_por_linea);
        html += row('Filas', data.metricas.filas);
        html += row('Largo Total (pulgadas)', data.metricas.largo_total_pulgadas);
        html += row('Metros Lineales', data.metricas.pies_lineales ? formatMeters(data.metricas.pies_lineales, 1) : '');
        html += row('Metros Lineales con Merma', data.metricas.pies_lineales_con_merma ? formatMeters(data.metricas.pies_lineales_con_merma, 1) : '');
        html += row('MSI Base', data.metricas.msi_base);
        html += row('MSI con Merma', data.metricas.msi_con_merma);
        html += row('Área (m²)', data.metricas.area_m2);
        html += row('Peso (kg)', data.metricas.peso_kg);
        html += row('Minutos de Tiraje', data.metricas.minutos_tiraje);
        html += row('Tintas Efectivas', data.metricas.tintas_efectivas);
    }

    html += section('Costos');
    html += subsec('Desglose');
    html += row('Material', data.costos?.desglose?.material);
    html += row('Tintas', data.costos?.desglose?.tintas);
    html += row('Impresión', data.costos?.desglose?.impresion);
    html += row('Preprensa', data.costos?.desglose?.preprensa);
    html += row('Acabados', data.costos?.desglose?.acabados);
    html += row('Empaque', data.costos?.desglose?.empaque);
    html += row('Tiraje', data.costos?.desglose?.tiraje);
    html += subsec('Totales');
    html += row('Subtotal Costos', data.costos?.subtotal_costos);
    html += row('Subtotal Financiero', data.costos?.subtotal_financiero);
    html += row('Subtotal Rendimiento', data.costos?.subtotal_rendimiento);
    html += row('Costo Mínimo', data.costos?.costo_minimo);
    html += row('% Imprevistos', data.costos?.porcentaje_imprevistos);
    html += row('% Financiero', data.costos?.porcentaje_financiero);
    html += row('% Adicional', data.costos?.porcentaje_adicional);
    html += row('Costo Total', data.costos?.costo_total);
    html += row('Metros Totales', data.costos?.pies_totales ? formatMeters(data.costos.pies_totales, 1) : '');

    html += section('Precios');
    html += row('Subtotal antes de IVA', data.precios?.subtotal_antes_iva);
    html += row('Impuesto', data.precios?.impuesto);
    html += row('Total Final', data.precios?.total_final);
    html += row('Precio Unitario', data.precios?.precio_unitario);
    html += row('Precio Millar', data.precios?.precio_millar);
    html += row('Total Colones', data.precios?.total_colones);
    html += row('Tipo de Cambio', data.precios?.tipo_cambio);
    html += row('% IVA', data.precios?.porcentaje_iva);
    html += row('Cyrel', data.precios?.cyrel);

    if (Array.isArray(data.motivos) && data.motivos.length) {
        html += section('Artes');
        data.motivos.forEach(function (m) {
            var parts = [];
            parts.push('Cant: ' + (m.cantidad || 0));
            parts.push('Tintas: ' + (m.tintas || 0));
            if (m.blanca) parts.push('Blanca: ' + m.blanca);
            if (m.pantones) parts.push('Pantones: ' + m.pantones);
            parts.push('Sellos: ' + (m.sellos || 0));
            if (m.producto_codigo) parts.push('Producto: ' + m.producto_codigo);
            parts.push(m.sku ? ('SKU: ' + m.sku) : 'SKU: pendiente');
            html += row(m.nombre || '', parts.join(', '));
        });
    }

    html += section('Notas');
    html += row('Resumen Cotización', data.notas?.resumen_cotizacion);
    html += row('Info Impresión', data.notas?.info_impresion);
    html += row('Observaciones', data.notas?.observaciones);
    html += row('Estado Creación', data.notas?.estado_creacion);
    html += row('Análisis Solicitud', data.notas?.analisis_solicitud);
    html += row('Análisis Finalizar', data.notas?.analisis_finalizar);
    html += row('Análisis Crear Orden', data.notas?.analisis_crear_orden);

    return html;
}

// Panel "Datos del Cálculo": el resumen de creación (igual que la Orden) y, debajo,
// el volcado de campos crudos si los hubiera.
function renderCalcOrigin(raw) {
    const summaryHtml = renderCreationSummary(productDetail?.resumen_creacion);
    const rawHtml = renderRawData(raw, { returnHtml: true });
    let html = summaryHtml || '';
    if (rawHtml) {
        if (html) html += '<hr class="production-raw-divider">';
        html += rawHtml;
    }
    rawEl.innerHTML = html || '<div class="product-empty-detail">Este producto no tiene datos adicionales.</div>';
}

// ── COMPARATIVA — Cotizado vs En Producción ─────────────────────────────────
// Puerto de renderProcessesTabContent()/cmpProcessBlock()/impresionComparisonBlock()
// de orden-produccion.js, adaptado para el SKU (usa productDetail.producto en vez
// de currentLoadedOrder). El SKU tiene las mismas columnas *_vigente que la orden,
// así que la comparación es idéntica. Mientras planta no capture un proceso, ese
// lado queda "Pendiente"; cuando hay datos, se marca en rojo lo que difiere.
function cmpProcessRow(label, value, flagged) {
    var v = (value === null || value === undefined || value === '') ? '—' : String(value);
    return '<div class="cmp-row"><span class="cmp-row-label">' + escapeHtml(label) +
        '</span><span class="cmp-row-val' + (flagged ? ' over' : '') + '">' + escapeHtml(v) + '</span></div>';
}

function cmpProcessBlock(title, cotizado, produccion) {
    var left = cotizado.map(function (r) { return cmpProcessRow(r[0], r[1]); }).join('') ||
        '<div class="production-summary-empty">Sin datos.</div>';
    var pill;
    var right;
    if (!produccion || !produccion.length) {
        right = '<div class="production-summary-empty">Pendiente de captura en producción.</div>';
        pill = '<span class="tl-pause-pill">Sin captura</span>';
    } else {
        var cot = {};
        cotizado.forEach(function (r) { cot[r[0]] = (r[1] === null || r[1] === undefined) ? '' : String(r[1]); });
        var anyDiff = false;
        right = produccion.map(function (r) {
            var val = (r[1] === null || r[1] === undefined) ? '' : String(r[1]);
            var diff = Object.prototype.hasOwnProperty.call(cot, r[0]) && val !== '' && val !== cot[r[0]];
            if (diff) anyDiff = true;
            return cmpProcessRow(r[0], r[1], diff);
        }).join('');
        pill = anyDiff
            ? '<span class="tl-pause-pill">Con diferencias</span>'
            : '<span class="tl-pause-pill" style="background:rgba(5,150,105,.14);color:#059669;">Coincide</span>';
    }
    return '<div class="step-section">' +
        '<div class="cmp-step-header">' + escapeHtml(title) +
        '<span style="margin-left:auto;">' + pill + '</span></div>' +
        '<div class="cmp-grid">' +
        '<div class="cmp-col planned"><div class="cmp-col-title">Cotizado</div>' + left + '</div>' +
        '<div class="cmp-col real"><div class="cmp-col-title">En Producción</div>' + right + '</div>' +
        '</div></div>';
}

function impresionComparisonBlock(p) {
    var maquina = firstFilled(p.quoted_machine, p.machine_name);
    var sustrato = firstFilled(p.material_name, p.material_nombre);
    var motivos = Array.isArray(currentMotivosDetalle) ? currentMotivosDetalle : [];
    if (!maquina && !sustrato && !motivos.length) return '';

    var prodHas = p.anilox_code_vigente || p.viscosity_vigente != null || p.temperature_vigente != null || p.ink_type_vigente || p.pantone_ref_vigente;

    var cot = [];
    var prod = [];
    function pair(label, cotV, prodV) { cot.push([label, cotV]); prod.push([label, prodV]); }
    function subhead(text) { cot.push(['SUBHEAD', text]); prod.push(['SUBHEAD', text]); }

    pair('Máquina', maquina, '');
    pair('Sustrato', sustrato, '');

    var stations = 0;
    motivos.forEach(function (m) {
        var tintas = Array.isArray(m.tintas) ? m.tintas : [];
        tintas.forEach(function (t) {
            var estN = (Number(t.estacion) || 0) + 1;
            var tipoLbl = MOTIVO_TINTA_TIPO_LABELS[t.tipo] || t.tipo || '';
            var firstStation = stations === 0 && prodHas;
            stations++;
            subhead('Arte ' + ((Number(m.indice) || 0) + 1) + ' · Estación ' + estN +
                (tipoLbl ? ' · ' + tipoLbl : '') + (t.etiqueta ? ' · ' + escapeHtml(t.etiqueta) : ''));
            pair('Tipo de Tinta', tipoLbl, firstStation ? (p.ink_type_vigente || '') : '');
            pair('Cobertura', t.coberturaPct != null ? formatNumber(t.coberturaPct, 0) + ' %' : '', '');
            pair('BCM Anilox', t.bcmAnilox != null ? formatNumber(t.bcmAnilox, 2) : '', firstStation ? (p.anilox_code_vigente || '') : '');
            pair('Factor Transf.', t.factorTransferencia != null ? formatNumber(t.factorTransferencia, 2) : '', '');
            pair('Densidad', t.densidad != null ? formatNumber(t.densidad, 2) : '', '');
            pair('Consumo', t.consumoKg != null ? formatNumber(t.consumoKg, 4) + ' kg' : '', '');
            pair('Pantone', '', firstStation ? (p.pantone_ref_vigente || '') : '');
            pair('Viscosidad', '', firstStation && p.viscosity_vigente != null ? formatNumber(p.viscosity_vigente, 2) : '');
            pair('Temperatura', '', firstStation && p.temperature_vigente != null ? formatNumber(p.temperature_vigente, 2) : '');
        });
    });

    if (!stations) {
        subhead('Tintas');
        pair('Cotización', 'Sin tintas configuradas', '');
        if (prodHas) {
            pair('Anilox', '', p.anilox_code_vigente || '');
            pair('Tipo de Tinta', '', p.ink_type_vigente || '');
            pair('Pantone', '', p.pantone_ref_vigente || '');
            pair('Viscosidad', '', p.viscosity_vigente != null ? formatNumber(p.viscosity_vigente, 2) : '');
            pair('Temperatura', '', p.temperature_vigente != null ? formatNumber(p.temperature_vigente, 2) : '');
        } else {
            pair('Producción', '', 'Pendiente de captura');
        }
    }

    function renderCol(rows, other) {
        return rows.map(function (r, i) {
            if (r[0] === 'SUBHEAD') return '<div class="cmp-subhead">' + escapeHtml(r[1]) + '</div>';
            var v = (r[1] === '' || r[1] == null) ? '—' : String(r[1]);
            var o = other[i] ? ((other[i][1] === '' || other[i][1] == null) ? '' : String(other[i][1])) : '';
            var diff = o !== '' && v !== '—' && v !== o;
            return '<div class="cmp-row"><span class="cmp-row-label">' + escapeHtml(r[0]) +
                '</span><span class="cmp-row-val' + (diff ? ' over' : '') + '">' + escapeHtml(v) + '</span></div>';
        }).join('');
    }

    var pill = prodHas
        ? '<span class="tl-pause-pill">Con captura</span>'
        : '<span class="tl-pause-pill">Sin captura</span>';

    return '<div class="step-section">' +
        '<div class="cmp-step-header">Impresión<span style="margin-left:auto;">' + pill + '</span></div>' +
        '<div class="cmp-grid">' +
        '<div class="cmp-col planned"><div class="cmp-col-title">Cotizado</div>' + renderCol(cot, prod) + '</div>' +
        '<div class="cmp-col real"><div class="cmp-col-title">En Producción</div>' + renderCol(prod, cot) + '</div>' +
        '</div></div>';
}

// Tiempos y Merma por Fase (Montaje/Setup/Corrida/Limpieza de Impresión; Montaje/Tiraje de
// Rebobinado) — mismo bloque que la Comparativa de la orden, aquí con los datos del producto.
function fmtMinComparativaSku(min) {
    var n = Number(min);
    if (!n || n <= 0) return '';
    var h = Math.floor(n / 60), m = Math.round(n % 60);
    return h > 0 ? (h + 'h ' + m + 'min') : (m + ' min');
}
function tiemposFaseComparisonBlockSku(p) {
    var blocks = [];
    var impCot = [
        ['Montaje', fmtMinComparativaSku(p.tiempo_montaje_min)],
        ['Setup', fmtMinComparativaSku(p.tiempo_setup_min)],
        ['Corrida', fmtMinComparativaSku(p.tiempo_corrida_min)],
        ['Limpieza', fmtMinComparativaSku(p.tiempo_limpieza_min)],
        ['Volteadora', fmtMinComparativaSku(p.volteadora_minutos)],
        ['Total', fmtMinComparativaSku(p.tiempo_total_impresion_min)]
    ].filter(function (r) { return r[1]; });
    var impProdHas = p.tiempo_montaje_min_vigente != null || p.tiempo_setup_min_vigente != null ||
        p.tiempo_corrida_min_vigente != null || p.tiempo_limpieza_min_vigente != null;
    var impProd = impProdHas ? [
        ['Montaje', fmtMinComparativaSku(p.tiempo_montaje_min_vigente)],
        ['Setup', fmtMinComparativaSku(p.tiempo_setup_min_vigente)],
        ['Corrida', fmtMinComparativaSku(p.tiempo_corrida_min_vigente)],
        ['Limpieza', fmtMinComparativaSku(p.tiempo_limpieza_min_vigente)],
        ['Total', fmtMinComparativaSku((Number(p.tiempo_montaje_min_vigente) || 0) + (Number(p.tiempo_setup_min_vigente) || 0) + (Number(p.tiempo_corrida_min_vigente) || 0) + (Number(p.tiempo_limpieza_min_vigente) || 0))]
    ].filter(function (r) { return r[1]; }) : null;
    if (impCot.length) blocks.push(cmpProcessBlock('Tiempos de Impresión', impCot, impProd));
    var reboMontajeCot = p.rebobinado_tiempo_montaje_min;
    var reboTotalCot = p.rebobinado_tiempo_total_min;
    var reboTirajeCot = (reboTotalCot != null && reboMontajeCot != null) ? (Number(reboTotalCot) - Number(reboMontajeCot)) : null;
    var reboCot = [
        ['Montaje', fmtMinComparativaSku(reboMontajeCot)],
        ['Tiraje', fmtMinComparativaSku(reboTirajeCot)],
        ['Total', fmtMinComparativaSku(reboTotalCot)]
    ].filter(function (r) { return r[1]; });
    var reboProdHas = p.rebobinado_tiempo_montaje_min_vigente != null || p.rebobinado_tiempo_tiraje_min_vigente != null;
    var reboProd = reboProdHas ? [
        ['Montaje', fmtMinComparativaSku(p.rebobinado_tiempo_montaje_min_vigente)],
        ['Tiraje', fmtMinComparativaSku(p.rebobinado_tiempo_tiraje_min_vigente)],
        ['Total', fmtMinComparativaSku(p.rebobinado_tiempo_total_min_vigente)]
    ].filter(function (r) { return r[1]; }) : null;
    if (reboCot.length) blocks.push(cmpProcessBlock('Tiempos de Rebobinado', reboCot, reboProd));
    return blocks.join('');
}

function renderComparativaContent() {
    var p = productDetail && productDetail.producto;
    if (!p) return '<div class="production-summary-empty">No hay datos disponibles.</div>';
    var blocks = [];
    var pctTxt = function (v) {
        var x = Number(v);
        return (Number.isFinite(x) && x > 0 && x < 100) ? formatNumber(x, 2) + ' %' : '';
    };

    // ── Sustrato: especificación y mermas, cotizado vs capturado en producción ──
    var sf = (p.sustrato_ficha && typeof p.sustrato_ficha === 'object') ? p.sustrato_ficha : {};
    var susCot = [
        ['Calibre', sf.calibre_micras != null && Number(sf.calibre_micras) ? formatNumber(sf.calibre_micras, 1) + ' µm' : ''],
        ['Gramaje', sf.gramaje_g_m2 != null && Number(sf.gramaje_g_m2) ? formatNumber(sf.gramaje_g_m2, 1) + ' g/m²' : ''],
        ['Superficie', sf.tipo_superficie || ''],
        ['Aplicación', sf.ambiente_aplicacion || ''],
        ['Merma de Tiraje', pctTxt(p.merma_tiraje_pct)],
        ['Merma de Sustrato', pctTxt(p.merma_sustrato_pct_cotizada)],
        ['Merma de Tinta', pctTxt(p.merma_tinta_pct_cotizada)]
    ].filter(function (r) { return r[1]; });
    var susProdHas = p.sustrato_calibre_micras_vigente != null || p.sustrato_cara_tratada_vigente ||
        p.merma_tiraje_pct_vigente != null || p.merma_tinta_pct_vigente != null || p.sustrato_lote_vigente;
    var susProd = susProdHas ? [
        ['Calibre', p.sustrato_calibre_micras_vigente != null ? formatNumber(p.sustrato_calibre_micras_vigente, 1) + ' µm' : ''],
        ['Cara Tratada', p.sustrato_cara_tratada_vigente || ''],
        ['Lote', p.sustrato_lote_vigente || ''],
        ['Merma de Tiraje', pctTxt(p.merma_tiraje_pct_vigente)],
        ['Merma de Tinta', pctTxt(p.merma_tinta_pct_vigente)]
    ].filter(function (r) { return r[1]; }) : null;
    if (susCot.length) blocks.push(cmpProcessBlock('Sustrato', susCot, susProd));

    var impresion = impresionComparisonBlock(p);
    if (impresion) blocks.push(impresion);

    var tiemposFase = tiemposFaseComparisonBlockSku(p);
    if (tiemposFase) blocks.push(tiemposFase);

    if (p.barniz_consumo_kg || p.barniz_tipo) {
        var barCot = [
            ['Tipo', p.barniz_tipo],
            ['Reservado', p.barniz_zonificado ? 'Sí' : 'No'],
            ['Consumo', p.barniz_consumo_kg != null ? formatNumber(p.barniz_consumo_kg, 2) + ' kg' : ''],
            ['BCM Anilox', p.barniz_bcm ? formatNumber(p.barniz_bcm, 2) : ''],
            ['Cobertura', p.barniz_cobertura_pct != null ? formatNumber(p.barniz_cobertura_pct, 0) + ' %' : '']
        ];
        var barProdHas = p.barniz_tipo_vigente || p.barniz_zona_vigente || p.barniz_zonif_vigente || p.uv_power_vigente != null || p.uv_temp_vigente != null;
        var barProd = barProdHas ? [
            ['Tipo', p.barniz_tipo_vigente],
            ['Reservado', p.barniz_zonif_vigente],
            ['Zona', p.barniz_zona_vigente],
            ['Lámpara UV — Potencia', p.uv_power_vigente != null ? formatNumber(p.uv_power_vigente, 2) : ''],
            ['Lámpara UV — Temperatura', p.uv_temp_vigente != null ? formatNumber(p.uv_temp_vigente, 2) : '']
        ] : null;
        blocks.push(cmpProcessBlock('Barniz', barCot, barProd));
    }

    if (p.laminado_tipo || p.laminado_metros_lineales) {
        blocks.push(cmpProcessBlock('Laminado', [
            ['Material', firstFilled(p.laminado_material_nombre, p.laminado_tipo, p.laminado_material_id)],
            ['Tipo', p.laminado_tipo]
        ].filter(function (r) { return r[1]; }), null));
    }

    var estampadoTipoCmp = (p.estampado_tipo && String(p.estampado_tipo).trim().toLowerCase() !== 'ninguno') ? p.estampado_tipo : '';
    if (estampadoTipoCmp) {
        blocks.push(cmpProcessBlock('Estampado', [
            ['Tipo', estampadoTipoCmp],
            ['Merma de Foil', pctTxt(p.merma_foil_pct_cotizada)]
        ].filter(function (r) { return r[1]; }),
        p.merma_foil_pct_vigente != null ? [['Merma de Foil', pctTxt(p.merma_foil_pct_vigente)]].filter(function (r) { return r[1]; }) : null));
    }

    if (p.troquelado_merma_ajuste_metros != null || p.die_code) {
        blocks.push(cmpProcessBlock('Troquelado', [
            ['Troquel', p.die_code || ''],
            ['Merma de Ajuste', p.troquelado_merma_ajuste_metros != null ? formatNumber(p.troquelado_merma_ajuste_metros, 1) + ' m' : '']
        ].filter(function (r) { return r[1]; }), null));
    }

    if (p.rebobinado_maquina) {
        var rebCot = [
            ['Máquina', p.rebobinado_maquina],
            ['Velocidad', p.rebobinado_velocidad != null ? formatNumber(p.rebobinado_velocidad, 1) + ' m/min' : ''],
            ['Merma de Operación', pctTxt(p.rebobinado_merma_operacion_pct)],
            ['Merma de Ajuste', p.rebobinado_merma_ajuste_metros != null ? formatNumber(p.rebobinado_merma_ajuste_metros, 1) + ' m' : '']
        ].filter(function (r) { return r[1]; });
        var rebProdHas = p.rebobinado_maquina_vigente || p.rebobinado_merma_operacion_pct_vigente != null || p.rebobinado_merma_ajuste_m_vigente != null || p.rebobinado_num_rollos_producidos_vigente != null;
        var rebProd = rebProdHas ? [
            ['Máquina', p.rebobinado_maquina_vigente || ''],
            ['Velocidad', p.rebobinado_velocidad_vigente != null ? formatNumber(p.rebobinado_velocidad_vigente, 1) + ' m/min' : ''],
            ['Merma de Operación', pctTxt(p.rebobinado_merma_operacion_pct_vigente)],
            ['Merma de Ajuste', p.rebobinado_merma_ajuste_m_vigente != null ? formatNumber(p.rebobinado_merma_ajuste_m_vigente, 1) + ' m' : ''],
            ['Rollos Completos Producidos', p.rebobinado_num_rollos_producidos_vigente != null ? formatNumber(p.rebobinado_num_rollos_producidos_vigente, 0) : ''],
            ['Etiquetas del Rollo Remanente', p.rebobinado_etiquetas_rollo_remanente_vigente != null ? formatNumber(p.rebobinado_etiquetas_rollo_remanente_vigente, 0) : '']
        ].filter(function (r) { return r[1]; }) : null;
        blocks.push(cmpProcessBlock('Rebobinado', rebCot, rebProd));
    }

    if (p.empaque_operarios != null || p.empaque_rendimiento_por_hora != null) {
        var empProdHasSku = p.empaque_num_cajas_producidas_vigente != null || p.empaque_operarios_vigente != null || p.empaque_cantidad_final_vigente != null;
        blocks.push(cmpProcessBlock('Empaque', [
            ['Operarios', p.empaque_operarios != null ? formatNumber(p.empaque_operarios, 0) : ''],
            ['Rendimiento por Hora', p.empaque_rendimiento_por_hora != null ? formatNumber(p.empaque_rendimiento_por_hora, 0) : ''],
            ['Cantidad de Cajas', p.empaque_cantidad_cajas != null ? formatNumber(p.empaque_cantidad_cajas, 0) : '']
        ].filter(function (r) { return r[1]; }), empProdHasSku ? [
            ['Cajas Utilizadas', p.empaque_num_cajas_producidas_vigente != null ? formatNumber(p.empaque_num_cajas_producidas_vigente, 0) : ''],
            ['Operarios', p.empaque_operarios_vigente != null ? formatNumber(p.empaque_operarios_vigente, 0) : ''],
            ['Cantidad Final Empacada', p.empaque_cantidad_final_vigente != null ? formatNumber(p.empaque_cantidad_final_vigente, 0) : ''],
            ['Faltante vs. Pedido', p.empaque_faltante_vigente != null ? formatNumber(p.empaque_faltante_vigente, 0) : '']
        ].filter(function (r) { return r[1]; }) : null));
    }

    if (!blocks.length) {
        return '<div class="production-summary-empty">Este producto no tiene procesos configurados para comparar.</div>';
    }
    return blocks.join('');
}

function renderComparativa() {
    var body = document.getElementById('productDocComparativaBody');
    if (body) body.innerHTML = renderComparativaContent();
}

function renderRawData(raw = {}, options = {}) {
    var normalizedRaw = raw && typeof raw === 'object' ? raw : {};

    var EXCLUDED = new Set([
        'Estado_UI', 'Datos_Cotizados', 'Secuencia_Procesos',
        'quote_snapshot', 'line_snapshot', 'front_back_group',
        'grupo_frente_dorso', 'production_run', 'related_lines',
        'traceability', 'printing', 'Mensajes_Validacion',
        'Texto_Secuencia_Procesos', 'Validacion_Bloqueada',
        'Cierre_Cotizacion', 'resumen_creacion'
    ]);

    function prettyVal(v) {
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '';
        if (typeof v === 'object') return '';
        return String(v);
    }

    function row(key, v) {
        var s = prettyVal(v);
        if (!s) return '';
        return '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(key) + ':</span><span class="production-creation-summary-value">' + escapeHtml(s) + '</span></div>';
    }
    function section(title) {
        return '<div class="production-creation-summary-section">' + escapeHtml(title) + '</div>';
    }
    function subsec(title) {
        return '<div class="production-creation-summary-subsection">' + escapeHtml(title) + '</div>';
    }

    var SECTIONS = {
        general: { label: 'General', keys: ['ID COTIZACION', 'ID LINEA', 'ID CLIENTE', 'VENDEDOR', 'DEPARTAMENTO', 'SOLICITUD ESTADO', 'ESTADO LINEA', 'NOMBRE TRABAJO', 'CODIGO PRODUCTO', 'TIPO ORDEN', 'Proceso Productivo', 'Finalizado_Para_Orden', 'TIPO CAMBIO', 'TIPO CAMBIO VENTA', 'TIPO CAMBIO COMPRA'] },
        producto: { label: 'Producto', keys: ['GENERAL | MATERIAL', 'Material Convencional | Id Material', 'Material Digital | Id Material', 'Material | Tipo Según Proceso Productivo', 'CONV | MAQUINA', 'DIGITAL | MAQUINA', 'GENERAL | TROQUEL | ID'] },
        dimensiones: { label: 'Dimensiones', keys: ['DIMENSIONES ETIQUETA | ANCHO', 'DIMENSIONES ETIQUETA | LARGO', 'ANCHO ROLLO', 'SEP HORIZONTAL', 'SEP VERTICAL'] },
        tintas: { label: 'Impresión', keys: ['CANTIDAD TINTAS', 'CANTIDAD TIPOS', 'CANTIDAD CAMBIOS', 'CANTIDAD CAMBIOS ADICIONALES', 'CANTIDAD CAMBIOS POR TIPOS', 'CANTIDAD PRODUCTOS', 'Cantidad Productos', 'CMYK', 'GENERAL | CMYK', 'CANTIDAD ETIQUETAS X ROLLO', 'CONV | PERFIL TINTA | TIPO', 'CONV | PERFIL TINTA | BCM ANILOX', 'CONV | PERFIL TINTA | COBERTURA %', 'CONV | PERFIL TINTA | GSM'] },
        acabados: { label: 'Acabados', keys: ['CONV | BARNIZ | ACTIVO', 'CONV | BARNIZ | ZONIFICADO', 'CONV | BARNIZ | BCM ANILOX', 'CONV | BARNIZ | COBERTURA %', 'CONV | BARNIZ | GSM', 'CONV | BARNIZ | TIPO', 'REQ | Barniz', 'REQ | Estampado', 'REQ | Estampado Ancho', 'REQ | Embosado', 'REQ | Troquelado', 'REQ | Numeracion', 'REQ | Superficie', 'REQ | Forma'] },
        rollo: { label: 'Rollo', keys: ['ANCHO CORE', 'DIAMETRO CORE', 'TIPO SALIDA', 'TIPO ETIQUETADO', 'AMBIENTE APLICACION', 'TIPO SUPERFICIE'] },
        costos: { label: 'Costos', keys: ['GENERAL | 5 | SUBTOTAL', 'GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL', 'GENERAL | 8 | PORCENTAJE IVA', 'GENERAL | 9 | Impuestos', 'GENERAL | 7 | TOTAL | DOL', 'GENERAL | 9 | TOTAL | DOL', 'GENERAL | 9 | UNITARIO | DOL', 'GENERAL | 7 | TOTAL | COL', 'GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS', 'GENERAL | 9 | UNITARIO | COL', 'PRECIO TOTAL AL FINALIZAR'] }
    };

    var usedKeys = new Set();
    var html = '';

    var sectionKeys = Object.keys(SECTIONS);
    for (var si = 0; si < sectionKeys.length; si++) {
        var sec = SECTIONS[sectionKeys[si]];
        var rows = '';
        for (var ki = 0; ki < sec.keys.length; ki++) {
            var k = sec.keys[ki];
            var v = normalizedRaw[k];
            var s = prettyVal(v);
            if (s) {
                rows += row(prettifyRawLabel(k), s);
                usedKeys.add(k);
            }
        }
        if (rows) {
            html += section(sec.label);
            html += rows;
        }
    }

    var remaining = [];
    Object.keys(normalizedRaw).forEach(function (k) {
        if (usedKeys.has(k) || EXCLUDED.has(k)) return;
        var v = normalizedRaw[k];
        if (v === null || v === undefined || v === '') return;
        if (typeof v === 'object' && !Array.isArray(v)) return;
        remaining.push({ key: k, label: prettifyRawLabel(k), value: prettyVal(v) });
    });

    if (remaining.length) {
        remaining.sort(function (a, b) { return a.label.localeCompare(b.label); });
        html += '<div class="production-raw-origin" style="margin-top:12px;">';
        html += '<div class="production-raw-origin-header" onclick="this.parentElement.classList.toggle(\'is-open\')">';
        html += '<span class="production-raw-origin-toggle">▶</span> ';
        html += 'Todos los campos (' + remaining.length + ')';
        html += '</div>';
        html += '<div class="production-raw-origin-body">';
        for (var ri = 0; ri < remaining.length; ri++) {
            html += '<div class="production-creation-summary-row"><span class="production-creation-summary-key">' + escapeHtml(remaining[ri].label) + '</span><span class="production-creation-summary-value">' + escapeHtml(remaining[ri].value) + '</span></div>';
        }
        html += '</div></div>';
    }

    if (options.returnHtml) return html;
    rawEl.innerHTML = html || '<div class="product-empty-detail">Este producto no tiene datos adicionales.</div>';
    return html;
}


let adjuntosProductoWidget = null;
function montarAdjuntosProducto() {
    const cont = document.getElementById('productDocAdjuntosProducto');
    if (!cont || !window.AdjuntosProducto) return;
    const p = (productDetail && productDetail.producto) || {};
    const ordenes = Array.isArray(productDetail && productDetail.ordenes) ? productDetail.ordenes : [];
    const contexto = {
        cotizacion: p.quote_code || '',
        linea: p.line_code || '',
        orden: (ordenes[0] && ordenes[0].order_code) || '',
        producto: p.product_code || productCode || ''
    };
    if (adjuntosProductoWidget) {
        adjuntosProductoWidget.fijarContexto(contexto);
        return;
    }
    adjuntosProductoWidget = window.AdjuntosProducto.crear({
        contenedor: cont,
        contexto: contexto,
        origenSubida: contexto.orden ? 'orden' : 'cotizacion',
        titulo: 'Adjuntos del Producto',
        sessionHeaders: typeof sessionHeaders === 'function' ? sessionHeaders : undefined,
        renderizarIcono: function (el, cual) {
            if (!el) return;
            var conf;
            if (cual === 'audio') conf = getOrderIcon(['quoteRequestRecord'], 'quoteRequestRecord', '●', '#1e516d', 18);
            else if (cual === 'descargar') conf = getOrderIcon(['attachmentDownload'], 'attachmentDownload', '⇩', '#0b81b8', 16);
            else conf = getOrderIcon(['quoteRequestAttachment', 'lineAttachments'], 'quoteRequestAttachment', '📎', '#1e516d', 18);
            renderInlineIcon(el, conf.value, conf.color, conf.size);
        }
    });
}

function bindTabs() {
    document.querySelectorAll('[data-product-doc-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            const key = button.dataset.productDocTab;
            document.querySelectorAll('[data-product-doc-tab]').forEach((item) => item.classList.toggle('is-active', item === button));
            document.querySelectorAll('[data-product-doc-panel]').forEach((panel) => {
                const active = panel.dataset.productDocPanel === key;
                panel.hidden = !active;
                panel.classList.toggle('is-active', active);
            });
            if (key === 'adjuntos') montarAdjuntosProducto();
        });
    });
}

function applyBranding() {
    const branding = config?.branding || {};
    const companyName = normalizeText(branding.companyName) || 'PrintLab';
    const logoUrl = normalizeText(branding.logoUrl);
    if (companyLogoEl) {
        companyLogoEl.src = logoUrl;
        companyLogoEl.alt = companyName;
        companyLogoEl.style.display = logoUrl ? 'block' : 'none';
    }
    if (brandFallbackEl) {
        brandFallbackEl.textContent = initialsFromName(companyName);
        brandFallbackEl.title = companyName;
        brandFallbackEl.style.display = logoUrl ? 'none' : 'flex';
    }
}

let sellerGeneroMap = new Map();

function sellerGeneroLookupKey(value) {
    return String(value || '').trim().toLowerCase();
}

function buildSellerGeneroMap(users) {
    const map = new Map();
    (Array.isArray(users) ? users : []).forEach((user) => {
        const genero = String(user.genero || '').trim().toLowerCase();
        if (genero !== 'hombre' && genero !== 'mujer') return;
        [user.name, user.fullName, user.full_name, user.sapSalespersonName, user.sap_salesperson_name].forEach((value) => {
            const key = sellerGeneroLookupKey(value);
            if (key) map.set(key, genero);
        });
    });
    sellerGeneroMap = map;
}

// Ícono de vendedor: hombre/mujer si se conoce el género (Configuración → Seguridad →
// Usuarios), genérico si no — mismo criterio que orden-produccion.js.
function sellerIconKeyFor(sellerName) {
    const genero = sellerGeneroMap.get(sellerGeneroLookupKey(sellerName));
    if (genero === 'hombre') return 'orderVendedorHombre';
    if (genero === 'mujer') return 'orderVendedorMujer';
    return 'orderVendedor';
}

// Íconos: mismas funciones que orden-produccion.js — respetan el tamaño y color
// configurados en Configuración → Diseño → Íconos (general.iconSize<Sufijo> /
// iconColor<Sufijo>), no un tamaño fijo.
function iconSuffix(key) {
    return String(key || '').split(/[.\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function iconConfigFor(key, fallbackValue, fallbackColor = '#1e516d', fallbackSize = 18) {
    const general = config.general || {};
    const suffix = iconSuffix(key);
    return {
        value: config.icons?.[key] || fallbackValue || '',
        color: general[`iconColor${suffix}`] || fallbackColor,
        hover: general[`iconColorHover${suffix}`] || general[`iconColor${suffix}`] || fallbackColor,
        size: Number(general[`iconSize${suffix}`]) || fallbackSize
    };
}

function renderIconButton(button, iconValue) {
    if (!button) return;
    const conf = typeof iconValue === 'object' && iconValue !== null ? iconValue : { value: iconValue };
    const value = String(conf.value || '').trim();
    if (conf.color) { button.style.setProperty('--icon-color', conf.color); button.style.color = conf.color; }
    if (conf.hover) button.style.setProperty('--icon-hover-color', conf.hover);
    if (conf.size) {
        button.style.setProperty('--config-icon-size', `${conf.size}px`);
        button.style.fontSize = `${conf.size}px`;
    }
    if (!value) { button.innerHTML = ''; return; }
    const isSvg = /^data:image\/svg\+xml/i.test(value) || /\.svg(\?|#|$)/i.test(value);
    const isImage = /^data:image\//i.test(value) || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value);
    if (isSvg) {
        button.innerHTML = `<span class="icon-svg-mask table-icon-media" style="width:var(--config-icon-size,18px);height:var(--config-icon-size,18px);-webkit-mask-image:url('${escapeHtml(value)}');mask-image:url('${escapeHtml(value)}');"></span>`;
    } else if (isImage) {
        button.innerHTML = `<span class="icon-image-wrap table-icon-media" role="img" aria-label=""><span class="icon-image-fallback" aria-hidden="true">□</span><img src="${escapeHtml(value)}" alt="" class="icon-image" onload="this.parentElement.classList.add('is-loaded')" onerror="this.remove()"></span>`;
    } else {
        button.textContent = value;
    }
}

function renderContactCol(info) {
    if (!clientContactColEl) return;
    const line = (icon, value) => value
        ? `<div class="production-client-info-line"><span class="production-client-info-icon">${icon}</span>${escapeHtml(value)}</div>`
        : '';
    clientContactColEl.innerHTML =
        (info.name ? `<div class="production-client-info-line production-client-contact-name"><strong>${escapeHtml(info.name)}</strong></div>` : '')
        + line('\u260E', info.phone)
        + line('\u2709', info.email);
}

function renderClientInfo(p, raw) {
    if (!clientContactColEl && !sellerColEl) return;
    // Vendedor: el asociado al cliente (business_partners.salesperson_name, vía backend);
    // si no hay, el de la cotización origen. Nunca "admin" — es un usuario de sistema,
    // no un vendedor.
    const notAdmin = (v) => {
        const s = normalizeText(v);
        return s && s.toLowerCase() !== 'admin' ? s : '';
    };
    const seller = notAdmin(p.client_salesperson_name)
        || notAdmin(raw['VENDEDOR'])
        || (productDetail?.historial || []).map((h) => notAdmin(h.salesperson_name)).find(Boolean)
        || '';

    // Fuentes en orden de prioridad: raw del producto → la cotización más reciente
    // que lo generó (quotes.contact_name/phone/email, misma fuente que usa la Orden).
    const quoteContact = (productDetail?.historial || []).find((h) => h.phone || h.email || h.contact_name) || {};
    const contactInfo = {
        name: raw['CLIENTE | CONTACTO NOMBRE COMPLETO'] || raw.contact_name || quoteContact.contact_name || '',
        phone: raw['CLIENTE | CONTACTO TELEFONO'] || raw['TELEFONO'] || raw['customer_phone'] || quoteContact.phone || '',
        email: raw['CLIENTE | CONTACTO EMAIL'] || raw['CORREO'] || raw['customer_email'] || quoteContact.email || ''
    };
    renderContactCol(contactInfo);

    if (sellerColEl) {
        sellerColEl.innerHTML = seller ? `<div class="production-client-info-line"><span id="productDocSellerIcon" class="production-client-info-icon"></span><span class="production-client-seller-name">${escapeHtml(seller)}</span></div>` : '';
        if (seller) renderIconButton(document.getElementById('productDocSellerIcon'), iconConfigFor(sellerIconKeyFor(seller), '\uD83D\uDC64', '#86a0b1', 14));
    }

    // Completar nombre / tel\u00E9fono / correo desde los contactos del socio cuando
    // falte alguno (el raw del producto a menudo trae solo el nombre, o nada).
    if (!contactInfo.name || !contactInfo.phone || !contactInfo.email) {
        const partnerCode = raw['ID CLIENTE'] || p.client_code || '';
        if (partnerCode) enrichContactFromPartner(partnerCode, contactInfo);
    }
}

async function enrichContactFromPartner(partnerCode, info) {
    try {
        const response = await fetch(`/api/socios/${encodeURIComponent(partnerCode)}/contactos`, { headers: sessionHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        const contacts = Array.isArray(data.contactos) ? data.contactos : [];
        if (!contacts.length) return;
        const nameOf = (c) => c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
        const wanted = normalizeText(info.name).toLowerCase();
        // Con nombre conocido: solo el contacto que coincide (no inventar datos de
        // otra persona). Sin nombre: representante legal, si no el primero (la lista
        // ya viene ordenada) — mismo criterio que el contacto por defecto del socio.
        const chosen = wanted
            ? contacts.find((c) => nameOf(c).trim().toLowerCase() === wanted)
            : (contacts.find((c) => c.is_legal_representative) || contacts[0]);
        if (!chosen) return;
        info.name = info.name || nameOf(chosen);
        info.phone = info.phone || chosen.phone || chosen.mobile || '';
        info.email = info.email || chosen.email || '';
        renderContactCol(info);
    } catch (_) {}
}

function getOutputTypeImage(outputType) {
    const search = String(outputType || '').trim().toLowerCase();
    if (!search) return null;
    return currentOutputTypes.find((item) => {
        const code = String(item.codigo || item.code || item.id || '').trim().toLowerCase();
        const name = String(item.nombre || item.descripcion || item.name || '').trim().toLowerCase();
        const itemId = String(item.id || '').trim().toLowerCase();
        return code === search || name === search || itemId === search;
    }) || null;
}

function renderOutputTypePreview(outputType) {
    if (!outputTypeImageEl) return;
    const match = getOutputTypeImage(outputType);
    const imageUrl = match?.image_url || match?.imageUrl;
    if (imageUrl) {
        outputTypeImageEl.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Tipo de salida">`;
        return;
    }
    outputTypeImageEl.innerHTML = '';
}

// Origen del producto: cotización + cálculo que lo generaron, debajo del ID —
// mismo par de enlaces que la Orden muestra bajo el código (openSourceQuoteButton).
function renderSourceLinks(p) {
    const el = document.getElementById('productDocSourceLinks');
    if (!el) return;
    const qc = p.quote_code || '';
    const lc = p.line_code || '';
    const dep = p.department ? `&department=${encodeURIComponent(p.department)}` : '';
    const quoteRoute = qc ? `/cotizaciones/documento?codigo=${encodeURIComponent(qc)}` : '';
    const calcRoute = (qc && lc) ? `/calculo-flexografia?quoteId=${encodeURIComponent(qc)}&lineId=${encodeURIComponent(lc)}${dep}` : '';
    el.innerHTML = [
        qc ? `<a class="production-data-link" href="${escapeHtml(quoteRoute)}" data-route="${escapeHtml(quoteRoute)}" data-label="Cotización ${escapeHtml(qc)}">${escapeHtml(qc)}</a>` : '',
        qc && lc ? '<span class="production-source-separator">/</span>' : '',
        lc ? `<a class="production-data-link" href="${escapeHtml(calcRoute)}" data-route="${escapeHtml(calcRoute)}" data-label="Cálculo ${escapeHtml(lc)}">${escapeHtml(lc)}</a>` : ''
    ].filter(Boolean).join('');
}

function renderArteInfo(raw) {
    const holder = normalizeText(raw['ARTE EN PODER DE'] || raw['ARTWORK HOLDER'] || raw['Arte en Poder de']);
    const comments = normalizeText(raw['COMENTARIOS VENDEDOR'] || raw['COMENTARIOS ARTE'] || raw['OBSERVACIONES VENTAS']);
    const body = document.getElementById('productDocArteBody');
    if (body) {
        body.innerHTML = [
            holder ? summaryRow('Arte en Poder de', escapeHtml(holder)) : '',
            comments ? '<div class="production-summary-item production-summary-item-full"><span class="production-summary-label">Comentarios</span><span class="production-summary-value">' + escapeHtml(comments) + '</span></div>' : ''
        ].join('');
    }
    const section = document.getElementById('productDocArteSection');
    if (section) section.hidden = !(holder || comments);
}

function renderProduct() {
    const p = productDetail?.producto;
    if (!p) return;
    const raw = p.raw_data || {};

    // SKU visible = el código de nuestra nomenclatura (finished_product_sku).
    // El product_code interno (P-000xxx) queda solo para enrutar, no se muestra.
    const skuVisible = p.finished_product_sku || p.product_code || '';
    const baseName = p.product_name || skuVisible || 'Producto';
    const nameDimensions = buildProductNameDimensions(p.width_inches, p.length_inches);
    pageTitleEl.textContent = baseName;
    nameEl.textContent = nameDimensions ? `${baseName} (${nameDimensions})` : baseName;
    codesEl.textContent = skuVisible;
    // Si no hay dato, se oculta la fila completa (etiqueta incluida) — no tiene sentido
    // mostrar una etiqueta sin valor.
    if (tipoProductoRowEl) tipoProductoRowEl.hidden = !p.product_type;
    if (tipoProductoEl) tipoProductoEl.textContent = p.product_type || '';
    if (skuClienteRowEl) skuClienteRowEl.hidden = !p.codigo_producto_cliente;
    if (skuClienteEl) skuClienteEl.textContent = p.codigo_producto_cliente || '';
    const customerId = raw['ID CLIENTE'] || p.client_code || '';
    const partnerRoute = customerId ? `/socios-documento.html?codigo=${encodeURIComponent(customerId)}` : '';
    const idLink = customerId ? `<a class="summary-row-link" href="${escapeHtml(partnerRoute)}" data-route="${escapeHtml(partnerRoute)}" data-label="Cliente ${escapeHtml(customerId)}">(${escapeHtml(customerId)})</a>` : '';
    clientEl.innerHTML = [idLink, escapeHtml(p.client_name || '—')].filter(Boolean).join(' ');

    renderSourceLinks(p);
    renderArteInfo(raw);
    renderClientInfo(p, raw);
    renderMotivosLayout();
    try { renderFichaTecnica(p); } catch (e) { console.error('renderFichaTecnica error:', e); }
    try { bindProductDocDetailPopovers(p); } catch (e) { console.error('bindProductDocDetailPopovers error:', e); }

    renderHistoryTable(productDetail.historial || []);
    renderOrdersTable(productDetail.ordenes || []);
    renderAttachments(productDetail.attachments || []);
    refreshAndRenderAttachments();
    renderCalcOrigin(raw);
    try { renderComparativa(); } catch (e) { console.error('renderComparativa error:', e); }
    contentEl.hidden = false;
    setStatus('');
    publishBdfgContext();
}

async function quoteProduct() {
    if (!productCode) return;
    if (quoteButtonEl) quoteButtonEl.disabled = true;
    try {
        setStatus('Creando cotización desde producto...');
        const payload = await fetchJson(`/api/productos/${encodeURIComponent(productCode)}/cotizar`, {
            method: 'POST',
            headers: sessionHeaders()
        });
        const quoteCode = payload?.cotizacion?.quote_code;
        const lineCode = payload?.linea?.line_code || payload?.calculo?.line_code || '';
        if (quoteCode) {
            const calcRoute = lineCode
                ? `/calculo-flexografia?quoteId=${encodeURIComponent(quoteCode)}&lineId=${encodeURIComponent(lineCode)}`
                : `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
            if (!openRouteInShell(calcRoute, `Cálculo ${quoteCode}`)) window.location.href = calcRoute;
            return;
        }
        setStatus('No fue posible crear la cotización.', 'error');
    } finally {
        if (quoteButtonEl) quoteButtonEl.disabled = false;
    }
}

async function init() {
    if (isShellEmbedded()) document.body.classList.add('shell-embedded');
    bindTabs();
    const params = new URLSearchParams(window.location.search);
    productCode = normalizeText(params.get('codigo'));
    if (!productCode) {
        setStatus('No se indicó un producto.', 'error');
        return;
    }
    config = await fetchJson(PRODUCT_DOC_CONFIG_ENDPOINT).catch(() => ({}));
    applyBranding();
    setStatus('Cargando producto...');
    let adminUsers = [];
    [productDetail, currentOutputTypes, adminUsers] = await Promise.all([
        fetchJson(`/api/productos/${encodeURIComponent(productCode)}`, { headers: sessionHeaders() }),
        fetchJson('/api/inventario/tipos-salida').then((r) => r?.items || []).catch(() => []),
        fetchJson('/api/admin-users').catch(() => [])
    ]);
    buildSellerGeneroMap(adminUsers);
    renderProduct();
    // Engranaje de la cabecera → abre el modal con el Detalle (Cotizaciones / Órdenes /
    // Adjuntos / Datos del Cálculo). Mismo ícono que el menú de la Orden (orderCreationSummary).
    renderIconButton(menuButtonEl, iconConfigFor('orderCreationSummary', '⚙️'));
    menuButtonEl?.addEventListener('click', () => detailPopoverEl?.removeAttribute('hidden'));
    quoteButtonEl?.addEventListener('click', () => quoteProduct().catch((error) => setStatus(error.message, 'error')));
    initAttachmentActionIcons();
    attachmentFileInputEl?.addEventListener('change', handleAttachmentUpload);
    audioRecordButtonEl?.addEventListener('click', toggleAttachmentAudioRecording);
    document.addEventListener('click', (event) => {
        const routeLink = event.target.closest('a[data-route]');
        if (routeLink && openRouteInShell(routeLink.dataset.route, routeLink.dataset.label)) {
            event.preventDefault();
        }
    });
}

init().catch((error) => setStatus(error.message, 'error'));
