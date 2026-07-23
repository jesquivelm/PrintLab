const PRODUCT_DOC_CONFIG_ENDPOINT = '/api/config/shell';
const PRODUCT_DOC_SESSION_KEY = 'erp-user-session';

const statusEl = document.getElementById('productDocStatus');
const contentEl = document.getElementById('productDocContent');
const pageTitleEl = document.getElementById('productDocPageTitle');
const nameEl = document.getElementById('productDocName');
const codesEl = document.getElementById('productDocCodes');
const clientEl = document.getElementById('productDocClient');
const measureEl = document.getElementById('productDocMeasure');
const finishesEl = document.getElementById('productDocFinishes');
const clientInfoGridEl = document.getElementById('productDocClientInfoGrid');
const clientContactColEl = document.getElementById('productDocClientContactCol');
const sellerColEl = document.getElementById('productDocSellerCol');
const printMachineEl = document.getElementById('productDocPrintMachine');
const printMaterialEl = document.getElementById('productDocPrintMaterial');
const inkConfigTextEl = document.getElementById('productDocInkConfigText');
const pantonesRowEl = document.getElementById('productDocPantonesRow');
const pantonesTextEl = document.getElementById('productDocPantonesText');
const coreWidthTextEl = document.getElementById('productDocCoreWidthText');
const coreDiameterTextEl = document.getElementById('productDocCoreDiameterText');
const rollLabelsTextEl = document.getElementById('productDocRollLabelsText');
const outputTypeTextEl = document.getElementById('productDocOutputTypeText');
const outputTypeImageEl = document.getElementById('productDocOutputTypeImage');
const printingGridEl = document.getElementById('productDocPrintingGrid');
const historyTableBodyEl = document.getElementById('productDocHistoryTableBody');
const ordersTableBodyEl = document.getElementById('productDocOrdersTableBody');
const attachmentsTableBodyEl = document.getElementById('productDocAttachmentsTableBody');
const attachmentInputEl = document.getElementById('productDocAttachmentInput');
const attachmentAddButtonEl = document.getElementById('productDocAttachmentAddButton');
const rawEl = document.getElementById('productDocRaw');
const quoteButtonEl = document.getElementById('productDocQuoteButton');
const companyLogoEl = document.getElementById('productDocCompanyLogo');
const brandFallbackEl = document.getElementById('productDocBrandFallback');

let config = {};
let productCode = '';
let productDetail = null;
let currentOutputTypes = [];

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
    'CANTIDAD CAMBIOS': 'Cantidad de Cambios',
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
    'CONV | BARNIZ | ZONIFICADO': 'Barniz Zonificado',
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

function formatMeasure(width, length) {
    const widthNumber = Number(width);
    const lengthNumber = Number(length);
    if (!Number.isFinite(widthNumber) || !Number.isFinite(lengthNumber)) return '—';
    const widthText = widthNumber % 1 === 0 ? String(widthNumber) : widthNumber.toLocaleString('es-CR', { maximumFractionDigits: 3 });
    const lengthText = lengthNumber % 1 === 0 ? String(lengthNumber) : lengthNumber.toLocaleString('es-CR', { maximumFractionDigits: 3 });
    return `${widthText}" x ${lengthText}"`;
}

function formatQuantity(value) {
    const raw = normalizeText(value);
    if (!raw) return '—';
    const numeric = Number(String(raw).replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric.toLocaleString('es-CR');
    }
    return raw;
}

function formatFileSize(value) {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return '';
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toLocaleString('es-CR', { maximumFractionDigits: 1 })} MB`;
    if (size >= 1024) return `${(size / 1024).toLocaleString('es-CR', { maximumFractionDigits: 1 })} KB`;
    return `${size.toLocaleString('es-CR')} B`;
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
    return {
        kind: 'product-document',
        title: product.product_name || product.product_code || 'Producto',
        subtitle: [product.client_name, product.line_code].filter(Boolean).join(' · ') || 'Ficha del producto',
        documentRoute: `/producto-documento?codigo=${encodeURIComponent(product.product_code || '')}`,
        documentLabel: `Producto ${product.product_code || ''}`.trim(),
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

function hasMeaningfulFinishValue(value) {
    const text = normalizeText(value).toLowerCase();
    if (!text) return false;
    return !['no', 'false', '0', 'ninguno', 'ninguna', 'n/a', 'na', 'no aplica', 'sin', 'null', 'undefined'].includes(text);
}

function isFinishEnabled(...values) {
    return values.some((value) => {
        if (typeof value === 'boolean') return value;
        return hasMeaningfulFinishValue(value);
    });
}

function getFinishItems(raw = {}) {
    const items = [];
    const push = (label, detail) => {
        const value = [label, detail].filter(Boolean).join(': ');
        if (value && !items.includes(value)) items.push(value);
    };
    if (isFinishEnabled(raw['CONV | BARNIZ | ACTIVO'], raw['BARNIZ | ACTIVO'], raw['REQ | Barniz'], raw['BARNIZ'])) {
        push('Barniz', raw['CONV | BARNIZ | TIPO'] || raw['BARNIZ | TIPO'] || raw['REQ | Barniz'] || raw['BARNIZ']);
    }
    if (isFinishEnabled(raw['CONV | LAMINADO | ACTIVO'], raw['LAMINADO | ACTIVO'], raw['LAMINADO'])) {
        push('Laminado', raw['CONV | LAMINADO | TIPO'] || raw['LAMINADO | TIPO'] || raw['LAMINADO']);
    }
    if (isFinishEnabled(raw['CONV | ESTAMPADO | ACTIVO'], raw['ESTAMPADO | ACTIVO'], raw['REQ | Estampado'], raw['ESTAMPADO'])) {
        push('Foil', raw['CONV | ESTAMPADO | FOIL'] || raw['ESTAMPADO | FOIL'] || raw['REQ | Estampado'] || raw['ESTAMPADO']);
    }
    if (isFinishEnabled(raw['EMBOSADO | ACTIVO'], raw['REQ | Embosado'], raw['EMBOSADO'])) {
        push('Embosado', raw['EMBOSADO | TIPO'] || raw['REQ | Embosado'] || raw['EMBOSADO']);
    }
    if (hasMeaningfulFinishValue(raw['TROQUEL'] || raw['REQ | Troquelado'])) {
        push('Troquelado', raw['TROQUEL'] || raw['REQ | Troquelado']);
    }
    return items;
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

function renderAttachmentsTable(items = []) {
    if (!items.length) {
        attachmentsTableBodyEl.innerHTML = renderEmptyTableRow(6, 'Todavía no hay adjuntos registrados para este producto.');
        return;
    }
    const openIcon = getOpenIconConfig();
    attachmentsTableBodyEl.innerHTML = items.map((item) => {
        const href = item.download_url || item.url || item.value || '#';
        const origin = item.customer_name || item.uploaded_by || (item.is_stored ? 'Cotización' : 'Línea');
        const fileName = item.file_name || 'Adjunto';
        const sizeText = formatFileSize(item.size_bytes);
        const subLabel = [item.quote_code || '', item.line_code || '', sizeText].filter(Boolean).join(' · ');
        return `
            <tr>
                <td>
                    <strong>${escapeHtml(fileName)}</strong>
                    ${subLabel ? `<div class="product-history-meta">${escapeHtml(subLabel)}</div>` : ''}
                </td>
                <td>${escapeHtml(item.quote_code || '')}</td>
                <td>${escapeHtml(item.line_code || '')}</td>
                <td>${escapeHtml(origin)}</td>
                <td>${escapeHtml(formatDate(item.created_at))}</td>
                <td><a class="browser-open-link" href="${escapeHtml(href)}" ${item.download_url ? 'download' : 'target="_blank" rel="noopener noreferrer"'} aria-label="Abrir adjunto ${escapeHtml(fileName)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir adjunto', 'table-icon-media')}</a></td>
            </tr>
        `;
    }).join('');
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

function renderRawData(raw = {}) {
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
        tintas: { label: 'Impresión', keys: ['CANTIDAD TINTAS', 'CANTIDAD TIPOS', 'CANTIDAD CAMBIOS', 'CANTIDAD PRODUCTOS', 'Cantidad Productos', 'CMYK', 'GENERAL | CMYK', 'CANTIDAD ETIQUETAS X ROLLO', 'CONV | PERFIL TINTA | TIPO', 'CONV | PERFIL TINTA | BCM ANILOX', 'CONV | PERFIL TINTA | COBERTURA %', 'CONV | PERFIL TINTA | GSM'] },
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

    rawEl.innerHTML = html || '<div class="product-empty-detail">Este producto no tiene datos adicionales.</div>';
}

async function uploadAttachmentFromProduct(file) {
    const sourceQuote = normalizeText(productDetail?.producto?.quote_code);
    const sourceLine = normalizeText(productDetail?.producto?.line_code);
    if (!sourceQuote || !sourceLine) {
        throw new Error('No se encontró la cotización origen del producto.');
    }
    const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',').pop() : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('No fue posible leer el archivo.'));
        reader.readAsDataURL(file);
    });

    await fetchJson(`/api/cotizaciones/${encodeURIComponent(sourceQuote)}/lineas/${encodeURIComponent(sourceLine)}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileExt: (file.name.split('.').pop() || '').toLowerCase(),
            contentBase64,
            uploadedBy: 'producto'
        })
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

function renderClientInfo(p, raw) {
    if (!clientContactColEl && !sellerColEl) return;
    const seller = raw['VENDEDOR'] || '';
    const phone = raw['CLIENTE | CONTACTO TELEFONO'] || raw['TELEFONO'] || raw['customer_phone'] || '';
    const email = raw['CLIENTE | CONTACTO EMAIL'] || raw['CORREO'] || raw['customer_email'] || '';
    const customerContact = raw['CLIENTE | CONTACTO NOMBRE COMPLETO'] || raw.contact_name || '';

    const contactHtml = customerContact ? `<div class="production-client-info-line production-client-contact-name"><strong>${escapeHtml(customerContact)}</strong></div>` : '';
    const phoneHtml = phone ? `<div class="production-client-info-line"><span class="production-client-info-icon">\u260E</span>${escapeHtml(phone)}</div>` : '';
    const emailHtml = email ? `<div class="production-client-info-line"><span class="production-client-info-icon">\u2709</span>${escapeHtml(email)}</div>` : '';
    if (clientContactColEl) {
        clientContactColEl.innerHTML = contactHtml + phoneHtml + emailHtml;
    }
    if (sellerColEl) {
        sellerColEl.innerHTML = seller ? `<div class="production-client-info-line"><span class="production-client-info-icon">\uD83D\uDC64</span>${escapeHtml(seller)}</div>` : '';
    }

    if (!customerContact) {
        const partnerCode = raw['ID CLIENTE'] || p.client_code || '';
        if (partnerCode) loadClientDefaultContact(partnerCode);
    }
}

async function loadClientDefaultContact(partnerCode) {
    if (!partnerCode) return;
    try {
        const response = await fetch(`/api/socios/${encodeURIComponent(partnerCode)}/contactos`, { headers: sessionHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        const contacts = Array.isArray(data.contactos) ? data.contactos : [];
        if (contacts.length === 1) {
            const c = contacts[0];
            const name = c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
            const phone = c.phone || c.mobile || '';
            const email = c.email || '';
            const parts = [];
            if (name) parts.push(`<div class="production-client-info-line production-client-contact-name"><strong>${escapeHtml(name)}</strong></div>`);
            if (phone) parts.push(`<div class="production-client-info-line"><span class="production-client-info-icon">\u260E</span>${escapeHtml(phone)}</div>`);
            if (email) parts.push(`<div class="production-client-info-line"><span class="production-client-info-icon">\u2709</span>${escapeHtml(email)}</div>`);
            if (parts.length && clientContactColEl) {
                clientContactColEl.innerHTML = parts.join('');
            }
        }
    } catch (_) {}
}

function renderPrintingConfig(p, raw) {
    const inkParts = [];
    const tintCount = raw['CANTIDAD TINTAS'] || raw['tint_count'] || p.tint_count || '';
    const cmyk = raw['CMYK'] || raw['GENERAL | CMYK'] || '';
    const inkGsm = raw['CONV | PERFIL TINTA | GSM'] || '';
    const inkType = raw['CONV | PERFIL TINTA | TIPO'] || '';
    const inkBcm = raw['CONV | PERFIL TINTA | BCM ANILOX'] || '';
    const inkCoverage = raw['CONV | PERFIL TINTA | COBERTURA %'] || '';

    if (tintCount) inkParts.push(`${tintCount} tintas`);
    if (cmyk) inkParts.push(String(cmyk));
    if (inkType) inkParts.push(`${inkType}`);
    if (inkGsm) inkParts.push(`${inkGsm} GSM`);
    if (inkBcm) inkParts.push(`${inkBcm} BCM`);
    if (inkCoverage) inkParts.push(`${inkCoverage}% cobertura`);

    if (printMachineEl) printMachineEl.textContent = p.quoted_machine || raw['MÁQUINA'] || '—';
    if (printMaterialEl) printMaterialEl.textContent = p.material_name || raw['MATERIAL'] || '—';
    if (inkConfigTextEl) inkConfigTextEl.textContent = inkParts.length ? inkParts.join(' · ') : '—';

    const pantones = raw['PANTONES'] || raw['pantones'] || '';
    if (pantonesRowEl && pantonesTextEl) {
        const hasPantones = normalizeText(pantones).length > 0;
        pantonesRowEl.hidden = !hasPantones;
        if (hasPantones) pantonesTextEl.textContent = pantones;
    }

    const dieCode = p.die_code || raw['TROQUEL'] || '';
    const finishItems = getFinishItems({ ...raw, TROQUEL: dieCode });
    if (finishesEl) {
        finishesEl.innerHTML = finishItems.length
            ? finishItems.map((item) => `<span class="production-chip">${escapeHtml(item)}</span>`).join('')
            : '<span class="production-chip production-chip-muted">Sin acabados</span>';
    }
}

function getOutputTypeImage(outputType) {
    const search = String(outputType || '').trim().toLowerCase();
    if (!search) return null;
    return currentOutputTypes.find((item) => {
        const code = String(item.codigo || item.code || item.id || '').trim().toLowerCase();
        const name = String(item.nombre || item.descripcion || item.name || '').trim().toLowerCase();
        return code === search || name === search;
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

function renderRollSpecs(p, raw) {
    if (coreWidthTextEl) coreWidthTextEl.textContent = raw['ANCHO CORE'] || '—';
    if (coreDiameterTextEl) coreDiameterTextEl.textContent = raw['DIAMETRO CORE'] || '—';
    if (rollLabelsTextEl) rollLabelsTextEl.textContent = formatQuantity(raw['CANTIDAD ETIQUETAS X ROLLO'] || '');
    const outputType = raw['TIPO SALIDA'] || '—';
    if (outputTypeTextEl) outputTypeTextEl.textContent = outputType;
    renderOutputTypePreview(outputType);
}

function renderProduct() {
    const p = productDetail?.producto;
    if (!p) return;
    const raw = p.raw_data || {};
    const measure = formatMeasure(p.width_inches, p.length_inches);

    pageTitleEl.textContent = p.product_name || p.product_code || 'Producto';
    nameEl.textContent = p.product_name || p.product_code || 'Producto';
    codesEl.textContent = p.product_code || '';
    const customerId = raw['ID CLIENTE'] || p.client_code || '';
    const partnerRoute = customerId ? `/socios-documento.html?codigo=${encodeURIComponent(customerId)}` : '';
    const idLink = customerId ? `<a class="summary-row-link" href="${escapeHtml(partnerRoute)}" data-route="${escapeHtml(partnerRoute)}" data-label="Cliente ${escapeHtml(customerId)}">(${escapeHtml(customerId)})</a>` : '';
    clientEl.innerHTML = [idLink, escapeHtml(p.client_name || '—')].filter(Boolean).join(' ');
    measureEl.textContent = measure;

    renderClientInfo(p, raw);
    renderPrintingConfig(p, raw);
    renderRollSpecs(p, raw);

    renderHistoryTable(productDetail.historial || []);
    renderOrdersTable(productDetail.ordenes || []);
    renderAttachmentsTable(productDetail.attachments || []);
    renderRawData(raw);
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
    [productDetail, currentOutputTypes] = await Promise.all([
        fetchJson(`/api/productos/${encodeURIComponent(productCode)}`, { headers: sessionHeaders() }),
        fetchJson('/api/inventario/tipos-salida').then((r) => r?.items || []).catch(() => [])
    ]);
    renderProduct();
    quoteButtonEl?.addEventListener('click', () => quoteProduct().catch((error) => setStatus(error.message, 'error')));
    attachmentAddButtonEl?.addEventListener('click', () => attachmentInputEl?.click());
    attachmentInputEl?.addEventListener('change', async () => {
        const file = attachmentInputEl.files?.[0];
        if (!file) return;
        try {
            setStatus('Cargando adjunto...');
            await uploadAttachmentFromProduct(file);
            productDetail = await fetchJson(`/api/productos/${encodeURIComponent(productCode)}`, { headers: sessionHeaders() });
            renderProduct();
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            attachmentInputEl.value = '';
        }
    });
    document.addEventListener('click', (event) => {
        const routeLink = event.target.closest('a[data-route]');
        if (routeLink && openRouteInShell(routeLink.dataset.route, routeLink.dataset.label)) {
            event.preventDefault();
        }
    });
}

init().catch((error) => setStatus(error.message, 'error'));
