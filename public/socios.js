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
const filtrarPendientesSapButton = document.getElementById('filtrarPendientesSapButton');
const sociosActiveFilters = document.getElementById('sociosActiveFilters');
const pruebaDiapiButton = document.getElementById('pruebaDiapiButton');
const pruebaDiapiCantidadButton = document.getElementById('pruebaDiapiCantidadButton');
const sociosImportStatus = document.getElementById('sociosImportStatus');
const nuevoSocioPopover = document.getElementById('nuevoSocioPopover');
const cerrarNuevoSocioButton = document.getElementById('cerrarNuevoSocioButton');
const cancelarNuevoSocioButton = document.getElementById('cancelarNuevoSocioButton');
const nuevoSocioForm = document.getElementById('nuevoSocioForm');
const nuevoSocioStatus = document.getElementById('nuevoSocioStatus');
const guardarNuevoSocioButton = document.getElementById('guardarNuevoSocioButton');
const guardarComoSocioButton = document.getElementById('guardarComoSocioButton');
const solicitudClienteModal = document.getElementById('solicitudClienteModal');
const cerrarSolicitudClienteButton = document.getElementById('cerrarSolicitudClienteButton');
const solicitudClientePartnerLabel = document.getElementById('solicitudClientePartnerLabel');
const solicitudClienteStepPregunta = document.getElementById('solicitudClienteStepPregunta');
const solicitudClienteStepDocs = document.getElementById('solicitudClienteStepDocs');
const solicitudClienteNoBtn = document.getElementById('solicitudClienteNoBtn');
const solicitudClienteSiBtn = document.getElementById('solicitudClienteSiBtn');
const solicitudClienteVolverBtn = document.getElementById('solicitudClienteVolverBtn');
const solicitudClienteEnviarBtn = document.getElementById('solicitudClienteEnviarBtn');
const solicitudClienteStatus = document.getElementById('solicitudClienteStatus');
const solicitudClienteDropzones = document.getElementById('solicitudClienteDropzones');
let solicitudClientePartnerCode = '';
const solicitudClienteFiles = {};
const socioWizardSections = Array.from(nuevoSocioForm?.querySelectorAll('.quote-request-section[data-step]') || []);
const socioWizardProgress = document.getElementById('socioWizardProgress');
const socioWizardBackButton = document.getElementById('socioWizardBackButton');
const socioWizardNextButton = document.getElementById('socioWizardNextButton');
const wizardTipoSocio = document.getElementById('wizardTipoSocio');
const wizardTipoIdentificacion = document.getElementById('wizardTipoIdentificacion');
const wizardTaxId = document.getElementById('wizardTaxId');
const wizardTaxIdHint = document.getElementById('wizardTaxIdHint');
const wizardTaxIdDuplicatePanel = document.getElementById('wizardTaxIdDuplicatePanel');
const wizardTaxIdDuplicateCode = document.getElementById('wizardTaxIdDuplicateCode');
const wizardTaxIdDuplicateName = document.getElementById('wizardTaxIdDuplicateName');
const wizardTaxIdCopyButton = document.getElementById('wizardTaxIdCopyButton');
const wizardTaxIdQuoteButton = document.getElementById('wizardTaxIdQuoteButton');
const wizardPartnerNameLabel = document.getElementById('wizardPartnerNameLabel');
const wizardPartnerNameCaption = document.getElementById('wizardPartnerNameCaption');
const wizardContactSameAsPartner = document.getElementById('wizardContactSameAsPartner');
const wizardPersonaMobile = document.getElementById('wizardPersonaMobile');
const wizardPersonaPhone = document.getElementById('wizardPersonaPhone');
const wizardContactFirstName = document.getElementById('wizardContactFirstName');
const wizardContactLastName = document.getElementById('wizardContactLastName');
const wizardContactIdentificationType = document.getElementById('wizardContactIdentificationType');
const wizardContactIdentification = document.getElementById('wizardContactIdentification');
const wizardContactMobile = document.getElementById('wizardContactMobile');
const wizardContactPhone = document.getElementById('wizardContactPhone');
const wizardContactEmail = document.getElementById('wizardContactEmail');
const wizardContactPosition = document.getElementById('wizardContactPosition');
const wizardContactLegalRepresentative = document.getElementById('wizardContactLegalRepresentative');
const wizardAddressCountry = document.getElementById('wizardAddressCountry');
const wizardAddressDepartamento = document.getElementById('wizardAddressDepartamento');
const wizardAddressMunicipio = document.getElementById('wizardAddressMunicipio');
const wizardAddressZona = document.getElementById('wizardAddressZona');
const wizardAddressZonaHint = document.getElementById('wizardAddressZonaHint');
const wizardAddressLine = document.getElementById('wizardAddressLine');
const wizardCurrencyCode = document.getElementById('wizardCurrencyCode');
const wizardPaymentTerms = document.getElementById('wizardPaymentTerms');
const wizardManejoExcedentes = document.getElementById('wizardManejoExcedentes');
const wizardAllowedPercentage = document.getElementById('wizardAllowedPercentage');
const wizardManejoAdelantos = document.getElementById('wizardManejoAdelantos');
const wizardPorcentajeAdelantos = document.getElementById('wizardPorcentajeAdelantos');
const wizardManejoFaltantes = document.getElementById('wizardManejoFaltantes');
const wizardPorcentajeFaltantes = document.getElementById('wizardPorcentajeFaltantes');
const wizardEntregaMuestras = document.getElementById('wizardEntregaMuestras');
const wizardContactoVBTipo = document.getElementById('wizardContactoVBTipo');
const wizardContactoVBNombreField = document.getElementById('wizardContactoVBNombreField');
const wizardContactoVBNombre = document.getElementById('wizardContactoVBNombre');
const wizardContactoVBTelefono = document.getElementById('wizardContactoVBTelefono');
const wizardContactoVBCorreo = document.getElementById('wizardContactoVBCorreo');
const wizardContactoProductoTipo = document.getElementById('wizardContactoProductoTipo');
const wizardContactoProductoNombreField = document.getElementById('wizardContactoProductoNombreField');
const wizardContactoProductoNombre = document.getElementById('wizardContactoProductoNombre');
const wizardContactoProductoTelefono = document.getElementById('wizardContactoProductoTelefono');
const wizardContactoProductoCorreo = document.getElementById('wizardContactoProductoCorreo');
const wizardReviewSummary = document.getElementById('wizardReviewSummary');
const wizardPersonaOnlyFields = Array.from(document.querySelectorAll('[data-persona-only]'));
const wizardEmpresaOnlyFields = Array.from(document.querySelectorAll('[data-empresa-only]'));
const PAYMENT_TERM_OPTIONS = [
    'Contado', '15 días', '30 días', '45 días', '60 días', '90 días',
    '50% adelanto', '50% contra entrega', 'Trámite de pago', 'Cancelación por adelantado'
];
const COUNTRY_CURRENCY_MAP = {
    'guatemala': 'GTQ',
    'costa rica': 'CRC',
    'honduras': 'HNL',
    'nicaragua': 'NIO',
    'belice': 'BZD',
    'panama': 'PAB',
    'panamá': 'PAB',
    'mexico': 'MXN',
    'méxico': 'MXN',
    'republica dominicana': 'DOP',
    'república dominicana': 'DOP',
    'estados unidos': 'USD'
};
let currencyManuallyChanged = false;
let socioWizardState = { currentStep: 1, totalSteps: socioWizardSections.length || 7 };
let sociosGeneralConfig = null;
const sociosImportPopover = document.getElementById('sociosImportPopover');
const cerrarSociosImportPopoverButton = document.getElementById('cerrarSociosImportPopoverButton');
const cancelarSociosImportPopoverButton = document.getElementById('cancelarSociosImportPopoverButton');
const ejecutarSociosImportButton = document.getElementById('ejecutarSociosImportButton');
const sociosImportPopoverSummary = document.getElementById('sociosImportPopoverSummary');
const sociosImportLimitInput = document.getElementById('sociosImportLimitInput');
const sociosImportPopoverStatus = document.getElementById('sociosImportPopoverStatus');
const pruebaDiapiCantidadPopover = document.getElementById('pruebaDiapiCantidadPopover');
const cerrarPruebaDiapiCantidadPopoverButton = document.getElementById('cerrarPruebaDiapiCantidadPopoverButton');
const cancelarPruebaDiapiCantidadButton = document.getElementById('cancelarPruebaDiapiCantidadButton');
const ejecutarPruebaDiapiCantidadButton = document.getElementById('ejecutarPruebaDiapiCantidadButton');
const pruebaDiapiCantidadTopInput = document.getElementById('pruebaDiapiCantidadTopInput');
const pruebaDiapiCantidadEsperaInput = document.getElementById('pruebaDiapiCantidadEsperaInput');
const pruebaDiapiCantidadQueryPreview = document.getElementById('pruebaDiapiCantidadQueryPreview');
const pruebaDiapiCantidadStatus = document.getElementById('pruebaDiapiCantidadStatus');
const pruebaDiapiCantidadRunsBody = document.getElementById('pruebaDiapiCantidadRunsBody');
const pruebaDiapiCantidadRuns = [];

let browserConfig = null;
let currentSearch = '';
let sociosFiltroPendientesSap = false;
let sociosImportStatusTimer = null;
let sociosImportDiagnosis = null;
let sociosVisibleCount = 0;
let sociosTotalCount = 0;
let sociosOffset = 0;
let sociosLoading = false;
let sociosAllLoaded = false;
const SOCIOS_PAGE_SIZE = 200;
let sociosSortState = { key: 'creation_date', dir: 'desc' };

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
    const atBottom = hasScrollableContent && distanceToBottom <= 8;
    const label = sociosAllLoaded
        ? `${sociosTotalCount.toLocaleString('es-CR')} registros`
        : `${sociosVisibleCount.toLocaleString('es-CR')} de ${sociosTotalCount.toLocaleString('es-CR')} registros`;
    sociosScrollBottomIndicator.textContent = label;
    sociosScrollBottomIndicator.classList.toggle('is-visible', sociosVisibleCount > 0 && (!hasScrollableContent || atBottom));
    if (atBottom && !sociosAllLoaded && !sociosLoading) {
        loadSocios(currentSearch, true).catch(() => {});
    }
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

const ESTADO_SOCIO_BADGES = {
    PROSPECTO: { texto: 'Prospecto', clase: 'is-prospecto' },
    PENDIENTE_INFORMACION: { texto: 'Pendiente de Información', clase: 'is-prospecto' },
    SOLICITUD_CLIENTE: { texto: 'Solicitud de Cliente', clase: 'is-pendiente' },
    PENDIENTE_APROBACION: { texto: 'Pendiente de Aprobación', clase: 'is-pendiente' },
    SOLICITUD_RECHAZADA: { texto: 'Solicitud Rechazada', clase: 'is-rechazada' },
    CLIENTE_APROBADO: { texto: 'Cliente Aprobado', clase: 'is-pendiente' },
    CLIENTE_CREADO_SAP: { texto: 'Cliente en SAP', clase: 'is-sap' },
    ERROR_SINCRONIZACION: { texto: 'Error de Sincronización', clase: 'is-rechazada' },
    REASIGNADO: { texto: 'Reasignado', clase: 'is-prospecto' },
    DESCARTADO: { texto: 'Descartado', clase: 'is-prospecto' }
};

function estadoSocioBadge(estado) {
    const clave = String(estado || '').trim();
    if (!clave) return '';
    const badge = ESTADO_SOCIO_BADGES[clave] || { texto: clave, clase: '' };
    return `<span class="socios-estado-badge ${badge.clase}">${escapeHtml(badge.texto)}</span>`;
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

function getSolicitudClienteIconConfig() {
    const general = browserConfig?.general || {};
    const presentation = getPresentationConfig(browserConfig || {}, PRESENTATION_KEY);
    return {
        value: browserConfig?.icons?.solicitudCliente || browserConfig?.icons?.notificationEmail || browserConfig?.icons?.email || '✉',
        color: firstFilled(general.iconColorSolicitudCliente, general.iconColor, '#0b81b8'),
        hover: firstFilled(general.iconColorHoverSolicitudCliente, '#07638c'),
        size: Number(firstFilled(general.iconSizeSolicitudCliente, presentation.iconSize, 18)) || 18
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
    aplicarFormatoNumeroPais(browserConfig?.general?.formatoNumeroPais);
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
    if (agregarPotencialLineaIcon) {
        agregarPotencialLineaIcon.innerHTML = iconMarkup(addValue, 'Agregar línea', 'table-icon-media');
        agregarPotencialLineaIcon.style.setProperty('--icon-color', addColor);
        agregarPotencialLineaIcon.style.setProperty('--config-icon-size', `${addSize}px`);
    }
    if (nuevoSocioButton) {
        nuevoSocioButton.hidden = window.ErpAccess?.canCreateModule
            ? !window.ErpAccess.canCreateModule('socios')
            : false;
    }
    if (filtrarPendientesSapButton) {
        filtrarPendientesSapButton.hidden = !puedeVerFiltroPendientesSap();
    }
}

// El filtro "Pendientes de SAP" solo lo ven implementadores, administradores,
// emergencia y el permiso de Finanzas.
function puedeVerFiltroPendientesSap() {
    const permiso = String(window.ErpAccess?.readSession?.()?.permissionName || '').trim();
    return /administrador(?:es)?|implementador(?:es)?|emergencia|finanzas/i.test(permiso);
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

async function loadSocios(search = '', append = false) {
    if (sociosLoading) return;
    if (append && sociosAllLoaded) return;
    currentSearch = search;
    sociosLoading = true;
    const offset = append ? sociosOffset : 0;
    if (!append) {
        sociosOffset = 0;
        sociosAllLoaded = false;
    }
    const params = new URLSearchParams({ limit: String(SOCIOS_PAGE_SIZE), offset: String(offset) });
    if (search) params.set('q', search);
    if (sociosFiltroPendientesSap) params.set('estado', 'pendientes-sap');
    if (sociosSortState.key && sociosSortState.dir) {
        params.set('sortKey', sociosSortState.key);
        params.set('sortDir', sociosSortState.dir);
    }

    if (!append && !sociosTableBody.querySelector('[data-open-socio]')) {
        sociosTableBody.innerHTML = '<tr><td colspan="8">Cargando los socios desde el servidor, un momento por favor…</td></tr>';
    }
    const mensajeSinRespuesta = 'No pudimos traer los socios en este momento. Revisa la conexión e intenta de nuevo.';
    let response;
    let payload;
    try {
        response = await fetch(`${SOCIOS_ENDPOINT}?${params.toString()}`);
        payload = await response.json();
    } catch (error) {
        sociosLoading = false;
        throw new Error(mensajeSinRespuesta);
    }
    if (!response.ok) {
        sociosLoading = false;
        throw new Error(payload.error || mensajeSinRespuesta);
    }

    const items = payload.socios || [];
    sociosTotalCount = payload.total || 0;
    sociosOffset = offset + items.length;
    sociosAllLoaded = items.length < SOCIOS_PAGE_SIZE || sociosOffset >= sociosTotalCount;
    sociosVisibleCount = append ? sociosOffset : items.length;
    const openIcon = getOpenIconConfig();
    const deleteIcon = getDeleteIconConfig();
    const solicitudIcon = getSolicitudClienteIconConfig();

    const renderRow = (item) => `
        <tr>
            <td>${escapeHtml(item.partner_code)}</td>
            <td>${escapeHtml(item.partner_name)}${item.clase_cliente ? ` <span class="clase-badge clase-${escapeHtml(item.clase_cliente)}" title="Cliente clase ${escapeHtml(item.clase_cliente)}">${escapeHtml(item.clase_cliente)}</span>` : ''}</td>
            <td>${escapeHtml(item.salesperson_name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.sector)}</td>
            <td title="${escapeHtml(item.created_at_tz || item.creation_date || '')}">${escapeHtml(formatDate(item.creation_date))}</td>
            <td>${estadoSocioBadge(item.estado_socio)}</td>
            <td>
                <div class="quote-browser-actions">
                    <button type="button" class="browser-open-link" data-open-socio="${escapeHtml(item.partner_code)}" aria-label="Abrir socio ${escapeHtml(item.partner_code)}" title="Abrir socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir socio', 'table-icon-media')}</button>
                    <button type="button" class="browser-open-link" data-solicitud-socio="${escapeHtml(item.partner_code)}" data-solicitud-nombre="${escapeHtml(item.partner_name)}" aria-label="Solicitar creación de cliente ${escapeHtml(item.partner_code)}" title="Solicitar creación de cliente en SAP" style="--icon-color:${escapeHtml(solicitudIcon.color)};--icon-hover-color:${escapeHtml(solicitudIcon.hover)};--config-icon-size:${escapeHtml(String(solicitudIcon.size))}px;">${iconMarkup(solicitudIcon.value, 'Solicitar creación de cliente', 'table-icon-media')}</button>
                    <button type="button" class="browser-open-link browser-open-link-danger" data-delete-socio="${escapeHtml(item.partner_code)}" aria-label="Eliminar socio ${escapeHtml(item.partner_code)}" title="Eliminar socio ${escapeHtml(item.partner_code)}" style="--icon-color:${escapeHtml(deleteIcon.color)};--icon-hover-color:${escapeHtml(deleteIcon.hover)};--config-icon-size:${escapeHtml(String(deleteIcon.size))}px;">${iconMarkup(deleteIcon.value, 'Eliminar socio', 'table-icon-media')}</button>
                </div>
            </td>
        </tr>`;

    if (append) {
        const newRows = items.map(renderRow).join('');
        sociosTableBody.innerHTML += newRows;
    } else {
        updateSociosSortIndicators();
        const mensajeVacio = sociosFiltroPendientesSap
            ? 'No hay socios pendientes de enviar a SAP.'
            : 'No hay socios registrados.';
        sociosTableBody.innerHTML = items.length ? items.map(renderRow).join('') : `<tr><td colspan="8">${mensajeVacio}</td></tr>`;
    }
    sociosLoading = false;
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

function parseConfigJsonArray(value) {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim() !== '') : [];
    } catch (e) {
        return [];
    }
}

function fillWizardSelect(select, options, selectedValue) {
    if (!select) return;
    const current = selectedValue !== undefined ? selectedValue : select.value;
    select.innerHTML = '<option value=""></option>' + options.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
    if (current && options.includes(current)) select.value = current;
}

async function loadSociosGeneralConfig() {
    if (sociosGeneralConfig) return sociosGeneralConfig;
    const response = await fetch('/api/config/general');
    if (!response.ok) throw new Error('No se pudo cargar la configuración general.');
    const config = await response.json();
    sociosGeneralConfig = config?.general || config || {};
    return sociosGeneralConfig;
}

function parseConfigJsonObjects(value) {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
    } catch (e) {
        return [];
    }
}

let sociosLocationsCatalog = null;
async function loadLocationsCatalog() {
    if (sociosLocationsCatalog) return sociosLocationsCatalog;
    // Catálogo nuevo: tabla divisiones_geograficas (8 países, sincronizada con Open Admin Data).
    // Para el asistente (que hoy usa Guatemala por defecto) se exponen los
    // niveles 1 y 2 de Guatemala con el mismo formato {nombre} que usaba el catálogo viejo.
    try {
        const [deptosResp, cargaBase] = await Promise.all([
            fetch('/api/geografia/GT/primer-nivel'),
            Promise.resolve(null)
        ]);
        const primer = deptosResp.ok ? (await deptosResp.json()).divisiones || [] : [];
        const municipios = [];
        for (const dep of primer) {
            const hijosResp = await fetch('/api/geografia/GT/hijos/' + encodeURIComponent(dep.id_origen));
            if (hijosResp.ok) {
                ((await hijosResp.json()).divisiones || []).forEach((m) => {
                    municipios.push({ nombre: m.nombre, departamento: dep.nombre });
                });
            }
        }
        sociosLocationsCatalog = {
            departamentos: primer.map((d) => ({ nombre: d.nombre })),
            municipios,
            zonas: []
        };
    } catch (e) {
        sociosLocationsCatalog = { departamentos: [], municipios: [], zonas: [] };
    }
    return sociosLocationsCatalog;
}

async function populateAddressDepartamentos() {
    const catalog = await loadLocationsCatalog();
    if (!wizardAddressDepartamento) return;
    const current = wizardAddressDepartamento.value;
    wizardAddressDepartamento.innerHTML = '<option value=""></option>'
        + catalog.departamentos.map((dep) => `<option value="${escapeHtml(dep.nombre)}">${escapeHtml(dep.nombre)}</option>`).join('');
    if (current && catalog.departamentos.some((dep) => dep.nombre === current)) wizardAddressDepartamento.value = current;
}

function updateAddressMunicipios() {
    if (!wizardAddressMunicipio || !sociosLocationsCatalog) return;
    const departamento = wizardAddressDepartamento?.value || '';
    const current = wizardAddressMunicipio.value;
    const municipios = sociosLocationsCatalog.municipios.filter((mun) => !departamento || mun.departamento === departamento);
    wizardAddressMunicipio.innerHTML = '<option value=""></option>'
        + municipios.map((mun) => `<option value="${escapeHtml(mun.nombre)}">${escapeHtml(mun.nombre)}</option>`).join('');
    if (current && municipios.some((mun) => mun.nombre === current)) wizardAddressMunicipio.value = current;
}

function updateAddressZonas() {
    if (!wizardAddressZona || !sociosLocationsCatalog) return;
    const municipio = wizardAddressMunicipio?.value || '';
    const current = wizardAddressZona.value;
    const zonas = sociosLocationsCatalog.zonas.filter((zona) => zona.municipio === municipio);
    const aplica = Boolean(municipio) && zonas.length > 0;
    const field = document.getElementById('wizardAddressZonaField');
    if (field) field.hidden = !aplica;
    if (!aplica && wizardAddressZona.value) wizardAddressZona.value = '';
    wizardAddressZona.innerHTML = '<option value=""></option>'
        + zonas.map((zona) => `<option value="${escapeHtml(zona.nombre)}">${escapeHtml(zona.nombre)}</option>`).join('');
    if (current && zonas.some((zona) => zona.nombre === current)) wizardAddressZona.value = current;
    wizardAddressZona.disabled = !aplica;
    if (wizardAddressZonaHint) {
        wizardAddressZonaHint.hidden = aplica;
        wizardAddressZonaHint.textContent = aplica ? '' : 'No aplica para este municipio.';
    }
}

function applyCountryCurrencyDefault() {
    if (currencyManuallyChanged || !wizardCurrencyCode) return;
    const country = (wizardAddressCountry?.value || '').trim().toLowerCase();
    const mapped = COUNTRY_CURRENCY_MAP[country];
    if (mapped && Array.from(wizardCurrencyCode.options).some((opt) => opt.value === mapped)) {
        wizardCurrencyCode.value = mapped;
    }
}

async function loadCurrencyCatalog() {
    const response = await fetch('/api/exchange-rates/state');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo de monedas.');
    const state = await response.json();
    const catalog = Array.isArray(state.catalog) ? state.catalog : [];
    const enabled = Array.isArray(state.config?.enabledCurrencies) ? state.config.enabledCurrencies : [];
    const defaultCurrency = state.config?.defaultCurrency || state.config?.baseCurrency || 'USD';
    const options = catalog.filter((item) => enabled.includes(item.code));
    return { options: options.length ? options : catalog, defaultCurrency };
}

async function populateWizardSelects() {
    const config = await loadSociosGeneralConfig();
    fillWizardSelect(wizardManejoExcedentes, parseConfigJsonArray(config.handlingExcessOptionsJson));
    fillWizardSelect(wizardManejoAdelantos, parseConfigJsonArray(config.handlingAdvanceOptionsJson));
    fillWizardSelect(wizardManejoFaltantes, parseConfigJsonArray(config.handlingShortageOptionsJson));
    fillWizardSelect(wizardEntregaMuestras, parseConfigJsonArray(config.deliverySampleModesJson));
    fillWizardSelect(wizardContactoVBTipo, parseConfigJsonArray(config.deliveryApprovalRecipientsJson));
    fillWizardSelect(wizardContactoProductoTipo, parseConfigJsonArray(config.deliveryMethodsJson));
    fillWizardSelect(wizardPaymentTerms, PAYMENT_TERM_OPTIONS, 'Contado');
    await populateAddressDepartamentos();
    updateAddressMunicipios();
    updateAddressZonas();

    try {
        const { options, defaultCurrency } = await loadCurrencyCatalog();
        if (wizardCurrencyCode) {
            wizardCurrencyCode.innerHTML = options.map((row) => `<option value="${escapeHtml(row.code)}">${escapeHtml(row.code)} · ${escapeHtml(row.name || row.code)}</option>`).join('');
            if (options.some((row) => row.code === defaultCurrency)) wizardCurrencyCode.value = defaultCurrency;
            if (options.some((row) => row.code === 'GTQ')) wizardCurrencyCode.value = 'GTQ';
        }
    } catch (error) {
        if (wizardCurrencyCode) wizardCurrencyCode.innerHTML = '<option value="GTQ">GTQ · Quetzal guatemalteco</option>';
    }
    applyCountryCurrencyDefault();
}

function formatWizardPercentMask(rawValue) {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || rawValue === '') return '';
    return `${numeric.toFixed(2)} %`;
}

function syncWizardPercentMask(input, displayId) {
    const mask = document.getElementById(displayId);
    if (!mask || !input) return;
    mask.textContent = formatWizardPercentMask(input.value);
}

function syncAllWizardPercentMasks() {
    syncWizardPercentMask(wizardAllowedPercentage, 'wizardAllowedPercentageDisplay');
    syncWizardPercentMask(wizardPorcentajeAdelantos, 'wizardPorcentajeAdelantosDisplay');
    syncWizardPercentMask(wizardPorcentajeFaltantes, 'wizardPorcentajeFaltantesDisplay');
}

// ─── Paso 7 · Potencial Comercial ───────────────────────────────────────────

const wizardPotencialProbabilidad = document.getElementById('wizardPotencialProbabilidad');
const wizardPotencialTableBody = document.getElementById('wizardPotencialTableBody');
const wizardPotencialEmpty = document.getElementById('wizardPotencialEmpty');
const wizardPotencialTotalEstimado = document.getElementById('wizardPotencialTotalEstimado');
const wizardPotencialForecastEstimado = document.getElementById('wizardPotencialForecastEstimado');
const agregarPotencialLineaButton = document.getElementById('agregarPotencialLineaButton');
const agregarPotencialLineaIcon = document.getElementById('agregarPotencialLineaIcon');
const CURRENCY_SYMBOLS = { GTQ: 'Q', USD: '$' };
function simboloMoneda(codigo) {
    const code = String(codigo || '').trim().toUpperCase();
    return CURRENCY_SYMBOLS[code] || code || 'Q';
}

const FRECUENCIA_OPCIONES_POTENCIAL = [
    ['SEMANAL', 'Semanal'],
    ['MENSUAL', 'Mensual'],
    ['TRIMESTRAL', 'Trimestral'],
    ['SEMESTRAL', 'Semestral'],
    ['ANUAL', 'Anual']
];
const FRECUENCIA_VECES_ANUAL = { SEMANAL: 52, MENSUAL: 12, TRIMESTRAL: 4, SEMESTRAL: 2, ANUAL: 1 };
const ESTACIONALIDAD_OPCIONES_POTENCIAL = [
    ['SIN_ESTACIONALIDAD', 'Sin variación'],
    ['TEMPORADA_ALTA', 'Sube en temporada alta'],
    ['TEMPORADA_BAJA', 'Baja en temporada baja']
];

let sociosPotencialLineas = [];
let sociosPotencialLineaSeq = 0;

const UNIDADES_OPCIONES_POTENCIAL = ['unidades', 'cajas', 'paquetes', 'resmas', 'kilogramos', 'kg', 'libras', 'lb', 'metros', 'm', 'metros cuadrados', 'm²', 'litros', 'galones'];

function monedaEstimacionPotencial() {
    return wizardCurrencyCode?.value || 'GTQ';
}

function valoresLineaPotencial(linea) {
    const volumen = Math.max(0, Number(linea.volumen) || 0);
    const precio = Math.max(0, Number(linea.precio) || 0);
    const vecesAnual = Number(FRECUENCIA_VECES_ANUAL[String(linea.frecuencia || 'MENSUAL')]) || 12;
    const porCompra = Math.round(volumen * precio * 1000000) / 1000000;
    const anual = Math.round(porCompra * vecesAnual * 10000) / 10000;
    const mensual = Math.round(anual * 100) / 1200;
    return { porCompra, mensual, anual, vecesAnual };
}

function formatearMontoPotencial(valor, moneda) {
    const numeric = Number(valor || 0);
    const simbolo = simboloMoneda(moneda);
    if (!Number.isFinite(numeric)) return `${simbolo} 0`;
    return `${simbolo} ${formatoNumeroApp(numeric, 0)}`;
}

function renderFrecuenciaSelect(list) {
    return FRECUENCIA_OPCIONES_POTENCIAL.map(([valor, texto]) => `<option value="${valor}"${list === valor ? ' selected' : ''}>${escapeHtml(texto)}</option>`).join('');
}

function renderEstacionalidadOption(lista) {
    return ESTACIONALIDAD_OPCIONES_POTENCIAL.map(([valor, texto]) => `<option value="${valor}"${lista === valor ? ' selected' : ''}>${escapeHtml(texto)}</option>`).join('');
}

function renderUnidadSelect(unidad) {
    const opciones = UNIDADES_OPCIONES_POTENCIAL.map((opcion) => `<option value="${escapeHtml(opcion)}"${unidad === opcion ? ' selected' : ''}>${escapeHtml(opcion)}</option>`).join('');
    return `<option value=""></option>${opciones}${unidad && !UNIDADES_OPCIONES_POTENCIAL.includes(unidad) ? `<option value="${escapeHtml(unidad)}" selected>${escapeHtml(unidad)}</option>` : ''}`;
}

const SOCIOS_POTENCIAL_DISPLAY_FORMATS = {
    volumen: { decimales: 0 },
    precio: { decimales: 2 }
};

function formatSociosDisplayMaskValue(value, format = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const formatted = formatoNumeroApp(numeric, format.decimales ?? 2);
    return `${format.prefix ? `${format.prefix} ` : ''}${formatted}${format.suffix ? ` ${format.suffix}` : ''}`.trim();
}

function syncSociosDisplayMask(input, format) {
    if (!input) return;
    const mask = input.closest('.display-input-wrap')?.querySelector('.display-input-mask');
    if (!mask) return;
    mask.textContent = formatSociosDisplayMaskValue(input.value, format || {});
}

function syncPotencialRowMasks(row, moneda) {
    if (!row) return;
    syncSociosDisplayMask(row.querySelector('[data-campo="volumen"]'), SOCIOS_POTENCIAL_DISPLAY_FORMATS.volumen);
    syncSociosDisplayMask(row.querySelector('[data-campo="precio"]'), { ...SOCIOS_POTENCIAL_DISPLAY_FORMATS.precio, prefix: simboloMoneda(moneda) });
}

function sociosPotencialRemoveIconHtml() {
    const iconValue = browserConfig?.icons?.lineDelete || browserConfig?.icons?.proformaCurrencyDelete || '🗑';
    const color = firstFilled(browserConfig?.general?.iconColorLineDelete, browserConfig?.general?.iconColor, '#a74343');
    const size = Number(firstFilled(browserConfig?.general?.iconSizeLineDelete, 26)) || 26;
    const markup = iconMarkup(iconValue, 'Quitar línea', 'socios-potencial-remove-icon');
    return `<span style="--icon-color:${escapeHtml(color)};--config-icon-size:${size}px;">${markup}</span>`;
}

function renderLineasPotencial() {
    if (!wizardPotencialTableBody) return;
    const moneda = monedaEstimacionPotencial();
    const removeIconHtml = sociosPotencialRemoveIconHtml();
    wizardPotencialTableBody.innerHTML = sociosPotencialLineas.map((linea) => {
        const valores = valoresLineaPotencial(linea);
        return `
        <tr data-linea-id="${escapeHtml(linea.id)}">
            <td><input class="socios-potencial-input" type="text" data-campo="descripcion" value="${escapeHtml(linea.descripcion)}" placeholder="Descripción" title="Detalle breve que ayude a identificar la línea."></td>
            <td><span class="display-input-wrap"><input class="socios-potencial-input display-input" type="number" min="0" step="1" data-campo="volumen" value="${escapeHtml(linea.volumen)}" placeholder="0" title="Cantidad que compraría en cada pedido. Ejemplo: 100 cajas."><span class="display-input-mask"></span></span></td>
            <td><select class="socios-potencial-input" data-campo="unidad" title="Unidad de medida del volumen. Ejemplo: unidades, cajas, kg, m.">${renderUnidadSelect(linea.unidad)}</select></td>
            <td><select class="socios-potencial-input" data-campo="frecuencia" title="Cada cuánto compraría: semanal, mensual, trimestral, semestral o anual.">${renderFrecuenciaSelect(linea.frecuencia)}</select></td>
            <td><span class="display-input-wrap"><input class="socios-potencial-input display-input" type="number" min="0" step="0.000001" data-campo="precio" value="${escapeHtml(linea.precio)}" placeholder="0.00" title="Precio estimado por unidad. Solo se usa para calcular el potencial."><span class="display-input-mask"></span></span></td>
            <td><select class="socios-potencial-input" data-campo="estacionalidad" title="Si el volumen cambia según la época del año: sube en temporada alta (ej. navidad) o baja en temporada baja.">${renderEstacionalidadOption(linea.estacionalidad)}</select></td>
            <td class="socios-potencial-calc" data-display="porCompra" title="Volumen × precio. Valor estimado por cada compra.">${formatearMontoPotencial(valores.porCompra, moneda)}</td>
            <td class="socios-potencial-calc" data-display="mensual" title="Valor promedio mensual estimado (anual ÷ 12).">${formatearMontoPotencial(valores.mensual, moneda)}</td>
            <td class="socios-potencial-calc" data-display="anual" title="Volumen × precio × frecuencia anual. Estimación del valor anual.">${formatearMontoPotencial(valores.anual, moneda)}</td>
            <td><button type="button" class="socios-potencial-remove" data-quitar-linea="${escapeHtml(linea.id)}" title="Quitar línea" aria-label="Quitar línea">${removeIconHtml}</button></td>
        </tr>`;
    }).join('');
    wizardPotencialTableBody.querySelectorAll('tr[data-linea-id]').forEach((row) => syncPotencialRowMasks(row, moneda));
    recomputarTotalesPotencial();
}

function sincronizarCampoLinea(lineaId, campo, valor) {
    const linea = sociosPotencialLineas.find((l) => l.id === lineaId);
    if (!linea) return;
    linea[campo] = valor;
    const valores = valoresLineaPotencial(linea);
    const moneda = monedaEstimacionPotencial();
    const row = wizardPotencialTableBody?.querySelector(`tr[data-linea-id="${escapeHtml(lineaId)}"]`);
    if (row) {
        if (row.querySelector('[data-display="porCompra"]')) row.querySelector('[data-display="porCompra"]').textContent = formatearMontoPotencial(valores.porCompra, moneda);
        if (row.querySelector('[data-display="mensual"]')) row.querySelector('[data-display="mensual"]').textContent = formatearMontoPotencial(valores.mensual, moneda);
        if (row.querySelector('[data-display="anual"]')) row.querySelector('[data-display="anual"]').textContent = formatearMontoPotencial(valores.anual, moneda);
        if (campo === 'volumen' || campo === 'precio') syncPotencialRowMasks(row, moneda);
    }
    recomputarTotalesPotencial();
}

function agregarLineaPotencial() {
    sociosPotencialLineaSeq += 1;
    sociosPotencialLineas.push({
        id: `potenc-${sociosPotencialLineaSeq}`,
        descripcion: '',
        volumen: '',
        unidad: 'unidades',
        frecuencia: 'MENSUAL',
        precio: '',
        estacionalidad: 'SIN_ESTACIONALIDAD'
    });
    renderLineasPotencial();
}

function quitarLineaPotencial(lineaId) {
    sociosPotencialLineas = sociosPotencialLineas.filter((l) => l.id !== lineaId);
    renderLineasPotencial();
}

function recomputarTotalesPotencial() {
    const moneda = monedaEstimacionPotencial();
    const totalAnual = sociosPotencialLineas.reduce((acumulado, linea) => acumulado + valoresLineaPotencial(linea).anual, 0);
    const probabilidad = Number(wizardPotencialProbabilidad?.value) || 0;
    const forecast = Math.round(totalAnual * probabilidad * 100) / 10000;
    if (wizardPotencialEmpty) wizardPotencialEmpty.hidden = sociosPotencialLineas.length > 0;
    if (wizardPotencialTotalEstimado) wizardPotencialTotalEstimado.textContent = formatearMontoPotencial(totalAnual, moneda);
    if (wizardPotencialForecastEstimado) wizardPotencialForecastEstimado.textContent = formatearMontoPotencial(forecast, moneda);
    return { totalAnual, probabilidad, forecast, moneda };
}

function colectarPotencialPayload() {
    return {
        moneda: monedaEstimacionPotencial(),
        probabilidad_conversion: Number(wizardPotencialProbabilidad?.value) || 0,
        lineas: sociosPotencialLineas
            .map((linea) => ({
                descripcion: linea.descripcion,
                volumen_estimado: Number(linea.volumen) || 0,
                unidad_medida: linea.unidad,
                frecuencia: linea.frecuencia,
                precio_estimado: Number(linea.precio) || 0,
                estacionalidad: linea.estacionalidad
            }))
            .filter((linea) => String(linea.descripcion).trim() !== '')
    };
}

function updateExcedentesGate() {
    const noAplica = /no facturar excedentes/i.test(wizardManejoExcedentes?.value || '');
    if (!wizardAllowedPercentage) return;
    wizardAllowedPercentage.disabled = noAplica;
    if (noAplica) wizardAllowedPercentage.value = '0';
    syncWizardPercentMask(wizardAllowedPercentage, 'wizardAllowedPercentageDisplay');
}

function updateVBRequirement() {
    if (wizardContactoVBTelefono) wizardContactoVBTelefono.required = false;
    if (wizardContactoVBCorreo) wizardContactoVBCorreo.required = false;
}

function getPrimaryContactName() {
    if (wizardTipoSocio?.value === 'PERSONA') {
        return nuevoSocioForm?.elements?.namedItem('partner_name')?.value.trim() || '';
    }
    return [wizardContactFirstName?.value, wizardContactLastName?.value].filter(Boolean).join(' ').trim();
}

function fillFromPrimaryContact(telefonoField, correoField, nombreField, nombreWrapField) {
    const isPersona = wizardTipoSocio?.value === 'PERSONA';
    const telefono = isPersona
        ? (wizardPersonaMobile?.value || wizardPersonaPhone?.value || '')
        : (wizardContactMobile?.value || wizardContactPhone?.value || '');
    const correo = isPersona
        ? (nuevoSocioForm?.elements?.namedItem('email_facturacion')?.value || '')
        : (wizardContactEmail?.value || '');
    if (telefonoField && !telefonoField.value) telefonoField.value = telefono;
    if (correoField && !correoField.value) correoField.value = correo;
    if (nombreField) nombreField.value = getPrimaryContactName();
    if (nombreWrapField) nombreWrapField.hidden = false;
}

const TIPO_IDENTIFICACION_OPCIONES_EMPRESA = [['NIT', 'NIT']];
const TIPO_IDENTIFICACION_OPCIONES_PERSONA = [['DPI', 'DPI'], ['PASAPORTE', 'Pasaporte'], ['OTRO', 'Otro']];

function actualizarOpcionesTipoIdentificacion(isPersona) {
    if (!wizardTipoIdentificacion) return;
    const previo = wizardTipoIdentificacion.value;
    const opciones = isPersona ? TIPO_IDENTIFICACION_OPCIONES_PERSONA : TIPO_IDENTIFICACION_OPCIONES_EMPRESA;
    wizardTipoIdentificacion.innerHTML = opciones.map(([valor, texto]) => `<option value="${valor}">${escapeHtml(texto)}</option>`).join('');
    const disponibles = opciones.map(([valor]) => valor);
    wizardTipoIdentificacion.value = disponibles.includes(previo) ? previo : disponibles[0];
}

function updatePersonaDynamicFields() {
    const isPersona = wizardTipoSocio?.value === 'PERSONA';

    wizardPersonaOnlyFields.forEach((field) => {
        field.hidden = !isPersona;
        field.querySelectorAll('input, select').forEach((input) => { input.disabled = !isPersona; });
    });

    wizardEmpresaOnlyFields.forEach((field) => {
        field.hidden = isPersona;
        field.querySelectorAll('input, select').forEach((input) => { input.disabled = isPersona; });
    });

    if (wizardPartnerNameLabel) {
        wizardPartnerNameLabel.innerHTML = isPersona
            ? 'Nombre de Persona <span class="socios-required-mark">*</span>'
            : 'Razón Social <span class="socios-required-mark">*</span>';
    }
    if (wizardPartnerNameCaption) {
        wizardPartnerNameCaption.textContent = isPersona ? 'Nombre de Persona' : 'Nombre de Empresa / Razón Social';
    }
    actualizarOpcionesTipoIdentificacion(isPersona);
}

function applyContactSameAsPartner() {
    if (!wizardContactSameAsPartner?.checked || wizardTipoSocio?.value === 'PERSONA') return;
    const partnerName = nuevoSocioForm?.elements?.namedItem('partner_name')?.value.trim() || '';
    const parts = partnerName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');

    const overwrite = (field, value) => {
        if (!field || !value) return;
        if (field.value && field.value.trim() !== '') {
            if (!window.confirm(`El campo ya tiene "${field.value}". ¿Deseas reemplazarlo con "${value}"?`)) return;
        }
        field.value = value;
    };

    overwrite(wizardContactFirstName, firstName);
    overwrite(wizardContactLastName, lastName);
}

let taxIdCheckState = { normalized: '', result: null };
let taxIdCheckDebounceTimer = null;

function normalizeTaxIdClient(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function fetchTaxIdCheck(rawValue) {
    const normalized = normalizeTaxIdClient(rawValue);
    if (!normalized) return { exists: false };
    try {
        const response = await fetch(`/api/socios/verificar-identificacion?tax_id=${encodeURIComponent(rawValue)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return { exists: false };
        return data;
    } catch (_) {
        return { exists: false };
    }
}

function hideTaxIdHint() {
    if (!wizardTaxIdHint) return;
    wizardTaxIdHint.hidden = true;
    wizardTaxIdHint.textContent = '';
}

function showTaxIdHint(text) {
    if (!wizardTaxIdHint) return;
    wizardTaxIdHint.textContent = text;
    wizardTaxIdHint.hidden = false;
}

function hideTaxIdDuplicatePanel() {
    if (wizardTaxIdDuplicatePanel) wizardTaxIdDuplicatePanel.hidden = true;
}

function showTaxIdDuplicatePanel(existing) {
    if (!wizardTaxIdDuplicatePanel) return;
    if (wizardTaxIdDuplicateCode) wizardTaxIdDuplicateCode.textContent = existing?.partner_code || '';
    if (wizardTaxIdDuplicateName) wizardTaxIdDuplicateName.textContent = existing?.partner_name || '';
    wizardTaxIdDuplicatePanel.dataset.partnerCode = existing?.partner_code || '';
    wizardTaxIdDuplicatePanel.dataset.partnerName = existing?.partner_name || '';
    wizardTaxIdDuplicatePanel.hidden = false;
}

async function checkTaxIdBeforeAdvance() {
    const rawValue = wizardTaxId?.value || '';
    const normalized = normalizeTaxIdClient(rawValue);
    if (!normalized) return;
    let result;
    if (taxIdCheckState.normalized === normalized && taxIdCheckState.result) {
        result = taxIdCheckState.result;
    } else {
        result = await fetchTaxIdCheck(rawValue);
        taxIdCheckState = { normalized, result };
    }
    if (result?.exists) {
        showTaxIdDuplicatePanel(result.existing);
        throw new Error(`Ya existe un socio con esa identificación: ${result.existing?.partner_code || ''}.`);
    }
    hideTaxIdDuplicatePanel();
}

wizardTaxId?.addEventListener('input', () => {
    hideTaxIdDuplicatePanel();
    hideTaxIdHint();
    const rawValue = wizardTaxId.value;
    const normalized = normalizeTaxIdClient(rawValue);
    taxIdCheckState = { normalized: '', result: null };
    if (taxIdCheckDebounceTimer) window.clearTimeout(taxIdCheckDebounceTimer);
    if (!normalized) return;
    taxIdCheckDebounceTimer = window.setTimeout(async () => {
        const result = await fetchTaxIdCheck(rawValue);
        if (normalizeTaxIdClient(wizardTaxId.value) !== normalized) return;
        taxIdCheckState = { normalized, result };
        if (result?.exists) {
            showTaxIdHint(`Ya registrado: ${result.existing.partner_code} — ${result.existing.partner_name}`);
        } else {
            hideTaxIdHint();
        }
    }, 500);
});

wizardTaxIdCopyButton?.addEventListener('click', async () => {
    const code = wizardTaxIdDuplicatePanel?.dataset.partnerCode || '';
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        const original = wizardTaxIdCopyButton.textContent;
        wizardTaxIdCopyButton.textContent = 'Copiado';
        window.setTimeout(() => { wizardTaxIdCopyButton.textContent = original; }, 2000);
    } catch (_) {
        // Ignorar errores del portapapeles; el código ya está visible en pantalla para copiarlo manualmente.
    }
});

wizardTaxIdQuoteButton?.addEventListener('click', () => {
    const code = wizardTaxIdDuplicatePanel?.dataset.partnerCode || '';
    const name = wizardTaxIdDuplicatePanel?.dataset.partnerName || '';
    if (!code) return;
    const params = new URLSearchParams({ nuevoCalculoClienteCodigo: code, nuevoCalculoClienteNombre: name });
    const route = `/cotizaciones?${params.toString()}`;
    if (!openRouteInShell(route, 'Cotizaciones')) {
        window.location.href = route;
    }
});

function markWizardInvalid(element, errors, label) {
    element?.classList?.add('field-required-input');
    errors.push({ label, element });
}

function clearWizardInvalidState() {
    nuevoSocioForm?.querySelectorAll('.field-required-input').forEach((el) => el.classList.remove('field-required-input'));
    nuevoSocioForm?.querySelectorAll('.field-required-wrap').forEach((el) => el.classList.remove('field-required-wrap'));
}

function focusWizardField(element) {
    if (!element) return;
    const section = element.closest('.quote-request-section[data-step]');
    const targetStep = section ? Number(section.dataset.step) : null;
    if (targetStep && targetStep !== socioWizardState.currentStep) {
        socioWizardState.currentStep = targetStep;
        updateSocioWizard();
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
}

function renderCreateStatusError(error) {
    const fieldErrors = error?.fieldErrors;
    if (!fieldErrors || !fieldErrors.length) {
        setCreateStatus(error?.message || 'No fue posible continuar.', true);
        return;
    }
    nuevoSocioStatus.hidden = false;
    nuevoSocioStatus.classList.add('is-error');
    nuevoSocioStatus.classList.remove('is-success');
    nuevoSocioStatus.textContent = '';
    nuevoSocioStatus.appendChild(document.createTextNode('Faltan: '));
    fieldErrors.forEach((fieldError, idx) => {
        if (fieldError.element) {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'socios-status-field-link';
            link.textContent = fieldError.label;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                focusWizardField(fieldError.element);
            });
            nuevoSocioStatus.appendChild(link);
        } else {
            nuevoSocioStatus.appendChild(document.createTextNode(fieldError.label));
        }
        nuevoSocioStatus.appendChild(document.createTextNode(idx < fieldErrors.length - 1 ? ', ' : '.'));
    });
}

function validateSocioWizardStep(step) {
    const errors = [];
    clearWizardInvalidState();
    const el = (name) => nuevoSocioForm?.elements?.namedItem(name);
    const isPersona = wizardTipoSocio?.value === 'PERSONA';

    if (step === 1) {
        if (!el('tipo_socio')?.value) markWizardInvalid(wizardTipoSocio, errors, 'Tipo de prospecto');
        if (!el('tipo_identificacion')?.value) markWizardInvalid(wizardTipoIdentificacion, errors, 'Tipo de identificación');
        if (!el('tax_id')?.value.trim()) markWizardInvalid(el('tax_id'), errors, 'Número de identificación');
        if (!el('partner_name')?.value.trim()) markWizardInvalid(el('partner_name'), errors, isPersona ? 'Nombre de persona' : 'Razón Social');
        if (isPersona) {
            const tieneContacto = wizardPersonaMobile?.value.trim() || wizardPersonaPhone?.value.trim() || el('email_facturacion')?.value.trim();
            if (!tieneContacto) {
                wizardPersonaMobile?.classList.add('field-required-input');
                wizardPersonaPhone?.classList.add('field-required-input');
                el('email_facturacion')?.classList.add('field-required-input');
                errors.push({ label: 'Celular, teléfono o correo de facturación', element: wizardPersonaMobile });
            }
        } else {
            if (!wizardContactFirstName?.value.trim()) markWizardInvalid(wizardContactFirstName, errors, 'Nombre del contacto principal');
            const tieneContacto = wizardContactMobile?.value.trim() || wizardContactPhone?.value.trim() || wizardContactEmail?.value.trim();
            if (!tieneContacto) {
                wizardContactMobile?.classList.add('field-required-input');
                wizardContactPhone?.classList.add('field-required-input');
                wizardContactEmail?.classList.add('field-required-input');
                errors.push({ label: 'Celular, teléfono o correo del contacto principal', element: wizardContactMobile });
            }
        }
        if (!wizardAddressDepartamento?.value) markWizardInvalid(wizardAddressDepartamento, errors, 'Departamento');
        if (!wizardAddressMunicipio?.value) markWizardInvalid(wizardAddressMunicipio, errors, 'Municipio');
    }

    if (step === 2) {
        if (!sociosPotencialLineas.length) {
            errors.push({ label: 'agrega al menos una línea de potencial comercial', element: agregarPotencialLineaButton });
        } else {
            let faltaDescripcion = false;
            let faltaValor = false;
            let primerDescripcionFaltante = null;
            let primerValorFaltante = null;
            sociosPotencialLineas.forEach((linea) => {
                const row = wizardPotencialTableBody?.querySelector(`tr[data-linea-id="${escapeHtml(linea.id)}"]`);
                const descripcionInput = row?.querySelector('[data-campo="descripcion"]');
                const volumenInput = row?.querySelector('[data-campo="volumen"]');
                const precioInput = row?.querySelector('[data-campo="precio"]');
                const tieneDescripcion = String(linea.descripcion || '').trim() !== '';
                if (!tieneDescripcion) {
                    descripcionInput?.classList.add('field-required-input');
                    faltaDescripcion = true;
                    if (!primerDescripcionFaltante) primerDescripcionFaltante = descripcionInput;
                    return;
                }
                const volumen = Number(linea.volumen) || 0;
                const precio = Number(linea.precio) || 0;
                if (volumen <= 0) {
                    volumenInput?.closest('.display-input-wrap')?.classList.add('field-required-wrap');
                    volumenInput?.classList.add('field-required-input');
                    faltaValor = true;
                    if (!primerValorFaltante) primerValorFaltante = volumenInput;
                }
                if (precio <= 0) {
                    precioInput?.closest('.display-input-wrap')?.classList.add('field-required-wrap');
                    precioInput?.classList.add('field-required-input');
                    faltaValor = true;
                    if (!primerValorFaltante) primerValorFaltante = precioInput;
                }
            });
            if (faltaDescripcion) errors.push({ label: 'la descripción de la línea de potencial comercial', element: primerDescripcionFaltante });
            if (faltaValor) errors.push({ label: 'el volumen o el precio estimado de la línea de potencial comercial', element: primerValorFaltante });
        }
    }

    if (errors.length) {
        const error = new Error(`Faltan: ${errors.map((fieldError) => fieldError.label).join(', ')}.`);
        error.fieldErrors = errors;
        throw error;
    }
}

function renderWizardReviewSummary() {
    if (!wizardReviewSummary) return;
    const el = (name) => nuevoSocioForm?.elements?.namedItem(name)?.value || '';
    const isPersona = wizardTipoSocio?.value === 'PERSONA';
    const grupos = [
        { title: isPersona ? 'Datos de Contacto' : 'Correo de Facturación', rows: isPersona ? [
            ['Correo de facturación', el('email_facturacion')],
            ['Celular', wizardPersonaMobile?.value || ''],
            ['Teléfono', wizardPersonaPhone?.value || '']
        ] : [
            ['Correo de facturación', el('email_facturacion')]
        ] },
        ...(isPersona ? [] : [{ title: 'Contacto Principal', rows: [
            ['Celular', wizardContactMobile?.value || ''],
            ['Correo', wizardContactEmail?.value || '']
        ] }]),
        { title: 'Dirección', rows: [
            ['Zona', wizardAddressZona?.value || '']
        ] },
        { title: 'Condiciones Comerciales', rows: [
            ['Moneda', wizardCurrencyCode?.value || ''],
            ['Días de crédito', wizardPaymentTerms?.value || '']
        ] }
    ];
    const totales = recomputarTotalesPotencial();
    grupos.push({
        title: 'Potencial Comercial',
        rows: [
            ['Líneas de potencial', String(sociosPotencialLineas.filter((l) => String(l.descripcion || '').trim() !== '').length)],
            ['Potencial anual estimado', totales.totalAnual > 0 ? formatearMontoPotencial(totales.totalAnual, totales.moneda) : 'Pendiente'],
            ['Probabilidad de conversión', `${totales.probabilidad} %`],
            ['Forecast estimado', totales.forecast > 0 ? formatearMontoPotencial(totales.forecast, totales.moneda) : 'Pendiente']
        ]
    });
    const conPotencial = sociosPotencialLineas.some((l) => String(l.descripcion || '').trim() !== '');
    wizardReviewSummary.innerHTML = grupos.map((grupo) => `
        <div class="socios-review-step">
            <div class="socios-review-step-title">${escapeHtml(grupo.title)}</div>
            ${grupo.rows.map(([label, value]) => `
                <div class="socios-review-row${value ? '' : ' is-pending'}">
                    <span>${escapeHtml(label)}</span>
                    <span class="socios-review-value">${value ? escapeHtml(value) : 'Pendiente'}</span>
                </div>
            `).join('')}
        </div>
    `).join('') + (conPotencial ? '<p class="socios-review-note">Estos valores son estimaciones calculadas. No representan ventas reales ni facturación.</p>' : '');
}

function updateSocioWizard() {
    const totalSteps = socioWizardState.totalSteps;
    const currentStep = Math.min(Math.max(1, socioWizardState.currentStep), totalSteps);
    socioWizardState.currentStep = currentStep;
    socioWizardSections.forEach((section) => {
        section.hidden = Number(section.dataset.step || 0) !== currentStep;
    });
    if (socioWizardProgress) socioWizardProgress.textContent = `Paso ${currentStep} de ${totalSteps}`;
    if (socioWizardBackButton) socioWizardBackButton.disabled = currentStep === 1;
    if (socioWizardNextButton) socioWizardNextButton.hidden = currentStep === totalSteps;
    if (guardarNuevoSocioButton) guardarNuevoSocioButton.hidden = currentStep !== totalSteps;
    if (guardarComoSocioButton) guardarComoSocioButton.hidden = currentStep !== totalSteps;
    if (currentStep === totalSteps) renderWizardReviewSummary();
}

async function goToSocioWizardStep(targetStep) {
    const totalSteps = socioWizardState.totalSteps;
    let nextStep = Math.min(Math.max(1, Number(targetStep) || 1), totalSteps);
    const currentStep = socioWizardState.currentStep;
    const movingForward = nextStep > currentStep;

    if (movingForward) {
        for (let step = currentStep; step < nextStep; step += 1) {
            validateSocioWizardStep(step);
            if (step === 1) await checkTaxIdBeforeAdvance();
        }
    } else {
        clearWizardInvalidState();
        setCreateStatus('');
    }
    socioWizardState.currentStep = nextStep;
    updateSocioWizard();
}

async function openCreatePopover() {
    nuevoSocioPopover.hidden = false;
    document.body.classList.add('popover-open');
    setCreateStatus('');
    hideTaxIdHint();
    hideTaxIdDuplicatePanel();
    taxIdCheckState = { normalized: '', result: null };
    currencyManuallyChanged = false;
    sociosPotencialLineas = [];
    if (wizardPotencialProbabilidad) wizardPotencialProbabilidad.value = '50';
    socioWizardState.currentStep = 1;
    updatePersonaDynamicFields();
    updateSocioWizard();
    updateExcedentesGate();
    updateVBRequirement();
    if (wizardContactoVBNombreField) wizardContactoVBNombreField.hidden = true;
    if (wizardContactoProductoNombreField) wizardContactoProductoNombreField.hidden = true;
    try {
        await populateWizardSelects();
        updateExcedentesGate();
        renderLineasPotencial();
    } catch (error) {
        setCreateStatus(error.message, true);
    }
    capturarSnapshotNuevoSocio();
    window.setTimeout(() => {
        nuevoSocioForm?.querySelector('select[name="tipo_socio"]')?.focus();
    }, 30);
}

let nuevoSocioSnapshotInicial = '';

function capturarSnapshotNuevoSocio() {
    nuevoSocioSnapshotInicial = nuevoSocioForm ? JSON.stringify(Object.fromEntries(new FormData(nuevoSocioForm).entries())) : '';
}

function nuevoSocioTieneCambiosSinGuardar() {
    if (!nuevoSocioForm) return false;
    const actual = JSON.stringify(Object.fromEntries(new FormData(nuevoSocioForm).entries()));
    if (actual !== nuevoSocioSnapshotInicial) return true;
    return sociosPotencialLineas.some((linea) => String(linea.descripcion || '').trim() !== '' || String(linea.volumen || '').trim() !== '' || String(linea.precio || '').trim() !== '');
}

function requestCloseCreatePopover() {
    if (nuevoSocioTieneCambiosSinGuardar() && !window.confirm('Hay datos sin guardar en este prospecto. Se perderá la información ingresada. ¿Deseas continuar y cerrar?')) {
        return;
    }
    closeCreatePopover();
}

function closeCreatePopover() {
    nuevoSocioPopover.hidden = true;
    document.body.classList.remove('popover-open');
    setCreateStatus('');
    nuevoSocioForm?.reset();
    clearWizardInvalidState();
    hideTaxIdHint();
    hideTaxIdDuplicatePanel();
    taxIdCheckState = { normalized: '', result: null };
    sociosPotencialLineas = [];
    renderLineasPotencial();
    socioWizardState.currentStep = 1;
    updatePersonaDynamicFields();
    updateSocioWizard();
}

function collectSocioWizardPayload() {
    const formData = new FormData(nuevoSocioForm);
    const payload = Object.fromEntries(formData.entries());
    payload.contact_legal_representative = Boolean(wizardContactLegalRepresentative?.checked);
    payload.is_tax_exempt = Boolean(nuevoSocioForm?.elements?.namedItem('is_tax_exempt')?.checked);
    payload.potencial_comercial = colectarPotencialPayload();

    if (wizardTipoSocio?.value === 'PERSONA') {
        const parts = (payload.partner_name || '').split(/\s+/).filter(Boolean);
        payload.contact_first_name = parts[0] || '';
        payload.contact_last_name = parts.slice(1).join(' ');
        payload.contact_identification_type = payload.tipo_identificacion;
        payload.contact_identification = payload.tax_id;
        payload.contact_email = payload.email_facturacion;
        payload.contact_mobile = wizardPersonaMobile?.value || '';
        payload.contact_phone = wizardPersonaPhone?.value || '';
        payload.contact_position = '';
        payload.contact_legal_representative = false;
    }
    return payload;
}

async function createSocio(event) {
    event.preventDefault();
    if (!nuevoSocioForm) return;
    const modoSocio = event.submitter?.id === 'guardarComoSocioButton';

    try {
        for (let step = 1; step < socioWizardState.totalSteps; step += 1) {
            validateSocioWizardStep(step);
            if (step === 1) await checkTaxIdBeforeAdvance();
        }
    } catch (error) {
        renderCreateStatusError(error);
        return;
    }

    const payload = collectSocioWizardPayload();
    guardarNuevoSocioButton.disabled = true;
    if (guardarComoSocioButton) guardarComoSocioButton.disabled = true;
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

        const partnerCode = result?.socio?.partner_code || '';
        const partnerName = result?.socio?.partner_name || '';
        setCreateStatus(`Prospecto ${partnerCode} creado correctamente.`);
        await loadSocios(currentSearch);
        closeCreatePopover();

        if (partnerCode && modoSocio) {
            openSolicitudClienteModal(partnerCode, partnerName, { skipToDocs: true });
        }
    } catch (error) {
        setCreateStatus(error.message || 'No fue posible crear el socio.', true);
    } finally {
        guardarNuevoSocioButton.disabled = false;
        if (guardarComoSocioButton) guardarComoSocioButton.disabled = false;
    }
}

wizardTipoSocio?.addEventListener('change', updatePersonaDynamicFields);
wizardContactSameAsPartner?.addEventListener('change', applyContactSameAsPartner);
wizardManejoExcedentes?.addEventListener('change', updateExcedentesGate);
wizardAllowedPercentage?.addEventListener('input', () => syncWizardPercentMask(wizardAllowedPercentage, 'wizardAllowedPercentageDisplay'));
wizardPorcentajeAdelantos?.addEventListener('input', () => syncWizardPercentMask(wizardPorcentajeAdelantos, 'wizardPorcentajeAdelantosDisplay'));
wizardPorcentajeFaltantes?.addEventListener('input', () => syncWizardPercentMask(wizardPorcentajeFaltantes, 'wizardPorcentajeFaltantesDisplay'));
wizardAddressDepartamento?.addEventListener('change', () => {
    updateAddressMunicipios();
    updateAddressZonas();
});
wizardAddressMunicipio?.addEventListener('change', updateAddressZonas);
wizardAddressCountry?.addEventListener('input', applyCountryCurrencyDefault);
wizardCurrencyCode?.addEventListener('change', () => { currencyManuallyChanged = true; });
wizardContactoVBTipo?.addEventListener('change', () => {
    updateVBRequirement();
    if (wizardContactoVBTipo.value === 'Cliente') {
        fillFromPrimaryContact(wizardContactoVBTelefono, wizardContactoVBCorreo, wizardContactoVBNombre, wizardContactoVBNombreField);
    } else if (wizardContactoVBNombreField) {
        wizardContactoVBNombreField.hidden = true;
    }
});
wizardContactoProductoTipo?.addEventListener('change', () => {
    if (wizardContactoProductoTipo.value === 'Cliente') {
        fillFromPrimaryContact(wizardContactoProductoTelefono, wizardContactoProductoCorreo, wizardContactoProductoNombre, wizardContactoProductoNombreField);
    } else if (wizardContactoProductoNombreField) {
        wizardContactoProductoNombreField.hidden = true;
    }
});
socioWizardBackButton?.addEventListener('click', () => goToSocioWizardStep(socioWizardState.currentStep - 1));
socioWizardNextButton?.addEventListener('click', async () => {
    socioWizardNextButton.disabled = true;
    try {
        await goToSocioWizardStep(socioWizardState.currentStep + 1);
        setCreateStatus('');
    } catch (error) {
        renderCreateStatusError(error);
    } finally {
        socioWizardNextButton.disabled = false;
    }
});

agregarPotencialLineaButton?.addEventListener('click', agregarLineaPotencial);
wizardPotencialTableBody?.addEventListener('input', (event) => {
    const fila = event.target.closest('tr[data-linea-id]');
    const campo = event.target.dataset?.campo;
    if (!fila || !campo) return;
    sincronizarCampoLinea(fila.dataset.lineaId, campo, event.target.value);
});
wizardPotencialTableBody?.addEventListener('change', (event) => {
    const fila = event.target.closest('tr[data-linea-id]');
    const campo = event.target.dataset?.campo;
    if (!fila || !campo) return;
    sincronizarCampoLinea(fila.dataset.lineaId, campo, event.target.value);
});
wizardPotencialTableBody?.addEventListener('click', (event) => {
    const boton = event.target.closest('[data-quitar-linea]');
    if (!boton) return;
    quitarLineaPotencial(boton.dataset.quitarLinea || '');
});
wizardPotencialProbabilidad?.addEventListener('change', recomputarTotalesPotencial);
wizardCurrencyCode?.addEventListener('change', renderLineasPotencial);

function buildImportSummaryText(summary = {}) {
    return [
        `${Number(summary.inserted || 0)} cargados`,
        `${Number(summary.duplicateByCode || 0)} duplicados por código`,
        `${Number(summary.duplicateByTaxId || 0)} duplicados por RTU`,
        `${Number(summary.duplicateByBoth || 0)} duplicados por ambos`,
        `${Number(summary.skippedWithoutTaxId || 0)} sin RTU`,
        `${Number(summary.skippedWithoutCode || 0)} sin código`,
        `${Number(summary.skippedFueraNomenclatura || 0)} fuera de nomenclatura`
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
        ['Duplicados RTU', Number(summary.duplicateByTaxId || 0)],
        ['Duplicados ambos', Number(summary.duplicateByBoth || 0)],
        ['Sin código/ID', Number(summary.skippedWithoutCode || 0) + Number(summary.skippedWithoutTaxId || 0)],
        ['Fuera de nomenclatura', Number(summary.skippedFueraNomenclatura || 0)]
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
        sociosTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
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
    const solicitudButton = event.target.closest('[data-solicitud-socio]');
    if (solicitudButton) {
        event.preventDefault();
        event.stopPropagation();
        openSolicitudClienteModal(solicitudButton.dataset.solicitudSocio || '', solicitudButton.dataset.solicitudNombre || '');
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
        sociosTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
});
function renderSociosActiveFilters() {
    if (!sociosActiveFilters) return;
    if (!sociosFiltroPendientesSap) {
        sociosActiveFilters.hidden = true;
        sociosActiveFilters.innerHTML = '';
        return;
    }
    sociosActiveFilters.hidden = false;
    sociosActiveFilters.innerHTML = `
        <span class="socios-active-filters-label">Filtros:</span>
        <button type="button" class="socios-filter-chip" data-quitar-filtro="pendientes-sap" aria-label="Quitar filtro Pendientes de SAP">
            <span>Pendientes de SAP</span>
            <span class="socios-filter-chip-x" aria-hidden="true">&times;</span>
        </button>`;
}

function aplicarFiltroPendientesSap(activo) {
    sociosFiltroPendientesSap = activo;
    filtrarPendientesSapButton?.classList.toggle('is-active', activo);
    filtrarPendientesSapButton?.setAttribute('aria-pressed', activo ? 'true' : 'false');
    renderSociosActiveFilters();
    loadSocios(currentSearch).catch((error) => {
        sociosTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
}

filtrarPendientesSapButton?.addEventListener('click', () => {
    aplicarFiltroPendientesSap(!sociosFiltroPendientesSap);
});

sociosActiveFilters?.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-quitar-filtro]');
    if (!chip) return;
    if (chip.dataset.quitarFiltro === 'pendientes-sap') aplicarFiltroPendientesSap(false);
});
pruebaDiapiButton?.addEventListener('click', async () => {
    const search = window.prompt('Buscar en SAP via DIAPI (nombre, codigo o identificacion):', '');
    if (search === null) return;
    const term = search.trim();
    if (!term) return;
    pruebaDiapiButton.disabled = true;
    setImportStatus(`Enviando solicitud a DIAPI para "${term}"...`, false, true);
    try {
        const response = await fetch('/api/socios/prueba-diapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search: term, top: 20 })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'No fue posible ejecutar la prueba contra DIAPI.');
        }
        if (payload.pending) {
            setImportStatus(`DIAPI no respondio a tiempo (solicitud ${payload.requestCode || payload.requestId}).`, true, true);
        } else if (!payload.ok) {
            setImportStatus(`DIAPI respondio con error: ${payload.error || 'desconocido'}`, true, true);
        } else {
            const resultRows = Array.isArray(payload.result) ? payload.result : (Array.isArray(payload.result?.value) ? payload.result.value : []);
            const count = resultRows.length;
            setImportStatus(`DIAPI respondio (${payload.requestCode}): ${count} resultado(s).`, false, true);
            console.log('[prueba-diapi] resultado', payload.result);
            window.alert(`DIAPI respondio con ${count} resultado(s). Ver detalle en la consola del navegador (F12).`);
        }
    } catch (error) {
        setImportStatus(error.message || 'No fue posible ejecutar la prueba contra DIAPI.', true, true);
    } finally {
        pruebaDiapiButton.disabled = false;
    }
});
// Duplicado exacto de "Prueba DIAPI": mismo mecanismo, unica diferencia es que
// pregunta una CANTIDAD de socios (y cuanto esperar) en vez de un texto de busqueda,
// mostrando en vivo la consulta SQL que se va a ejecutar contra SAP.
function buildPruebaDiapiCantidadQueryPreview(top) {
    const safeTop = Math.max(1, Math.floor(Number(top) || 0));
    return `SELECT TOP ${safeTop}
       OCRD.CardCode,
       OCRD.CardName,
       OCRD.CardType,
       OCRD.GroupCode,
       OCRD.Phone1,
       OCRD.Cellular,
       OCRD.Fax,
       OCRD.E_Mail AS Email,
       OCRD.IntrntSite AS Website,
       OCRD.CntctPrsn AS ContactPerson,
       OCRD.Notes,
       OCRD.LicTradNum,
       OCRD.LicTradNum AS FederalTaxID,
       OCRD.VatGroup,
       OCRD.SlpCode,
       OSLP.SlpName AS SalesPersonName,
       OCRD.GroupNum,
       OCTG.PymntGroup AS PaymentTermsName,
       OCRD.Territory,
       OCRD.OwnerCode,
       OCRD.CreateDate,
       OCRD.UpdateDate,
       OCRD.validFor AS ValidFor,
       OCRD.frozenFor AS FrozenFor,
       OCRD.Balance,
       OCRD.Currency,
       OCRD.Address AS BillingAddress,
       OCRD.Block AS BillingBlock,
       OCRD.ZipCode AS BillingZipCode,
       OCRD.City AS BillingCity,
       OCRD.County AS BillingCounty,
       OCRD.Country AS BillingCountry,
       OCRD.Building AS BillingBuilding,
       OCRD.MailAddres AS ShippingAddress,
       OCRD.MailBlock AS ShippingBlock,
       OCRD.MailZipCod AS ShippingZipCode,
       OCRD.MailCity AS ShippingCity,
       OCRD.MailCounty AS ShippingCounty,
       OCRD.MailCountr AS ShippingCountry,
       OCRD.MailBuildi AS ShippingBuilding,
       OCRD.BillToDef,
       OCRD.ShipToDef
  FROM OCRD
  LEFT JOIN OSLP ON OSLP.SlpCode = OCRD.SlpCode
  LEFT JOIN OCTG ON OCTG.GroupNum = OCRD.GroupNum
 WHERE 1 = 1 AND CardType = 'C'
 ORDER BY OCRD.CardCode`;
}

function refreshPruebaDiapiCantidadPreview() {
    if (!pruebaDiapiCantidadQueryPreview) return;
    const top = Math.min(Math.max(parseInt(pruebaDiapiCantidadTopInput?.value, 10) || 0, 1), 5000);
    pruebaDiapiCantidadQueryPreview.value = buildPruebaDiapiCantidadQueryPreview(top);
}

function setPruebaDiapiCantidadStatus(message, isError) {
    if (!pruebaDiapiCantidadStatus) return;
    pruebaDiapiCantidadStatus.textContent = message || '';
    pruebaDiapiCantidadStatus.hidden = !message;
    pruebaDiapiCantidadStatus.classList.toggle('is-error', Boolean(isError));
}

function openPruebaDiapiCantidadPopover() {
    if (!pruebaDiapiCantidadPopover) return;
    pruebaDiapiCantidadPopover.hidden = false;
    document.body.classList.add('popover-open');
    setPruebaDiapiCantidadStatus('');
    refreshPruebaDiapiCantidadPreview();
}

function closePruebaDiapiCantidadPopover() {
    if (!pruebaDiapiCantidadPopover) return;
    pruebaDiapiCantidadPopover.hidden = true;
    document.body.classList.remove('popover-open');
}

pruebaDiapiCantidadButton?.addEventListener('click', openPruebaDiapiCantidadPopover);
cerrarPruebaDiapiCantidadPopoverButton?.addEventListener('click', closePruebaDiapiCantidadPopover);
cancelarPruebaDiapiCantidadButton?.addEventListener('click', closePruebaDiapiCantidadPopover);
pruebaDiapiCantidadTopInput?.addEventListener('input', refreshPruebaDiapiCantidadPreview);
pruebaDiapiCantidadPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-prueba-diapi-cantidad-popover="true"]')) {
        closePruebaDiapiCantidadPopover();
    }
});

function escapeHtmlLocal(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildDiapiRunSubtable(headers, rows) {
    if (!rows.length) {
        return '<p class="audit-empty">Sin registros.</p>';
    }
    const headRow = headers.map((h) => `<th>${escapeHtmlLocal(h.label)}</th>`).join('');
    const bodyRows = rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtmlLocal(row[h.key])}</td>`).join('')}</tr>`).join('');
    return `
        <div class="socios-diapi-run-subtable-wrap">
            <table class="permission-admin-table">
                <thead><tr>${headRow}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
}

function renderPruebaDiapiCantidadRuns() {
    if (!pruebaDiapiCantidadRunsBody) return;
    if (!pruebaDiapiCantidadRuns.length) {
        pruebaDiapiCantidadRunsBody.innerHTML = '<tr><td colspan="7" class="audit-empty">Todavía no se ha ejecutado ninguna prueba.</td></tr>';
        return;
    }
    pruebaDiapiCantidadRunsBody.innerHTML = pruebaDiapiCantidadRuns.map((run, index) => {
        const contactos = [];
        const direcciones = [];
        for (const partner of run.resultRows) {
            const cardCode = partner.CardCode || partner.cardCode || '';
            for (const contact of (Array.isArray(partner.ContactEmployees) ? partner.ContactEmployees : [])) {
                contactos.push({
                    cardCode,
                    name: contact.Name || contact.FirstName || '',
                    position: contact.Position || '',
                    tel1: contact.Tel1 || contact.Phone1 || '',
                    cellular: contact.Cellolar || contact.MobilePhone || contact.Mobile || '',
                    email: contact.E_Mail || contact.E_MailL || contact.Email || ''
                });
            }
            for (const address of (Array.isArray(partner.BPAddresses) ? partner.BPAddresses : [])) {
                direcciones.push({
                    cardCode,
                    type: address.AddressType || address.AdresType || '',
                    street: address.Street || address.AddressLine1 || '',
                    city: address.City || '',
                    country: address.Country || ''
                });
            }
        }
        const partnersConContacto = run.resultRows.filter((p) => Array.isArray(p.ContactEmployees) && p.ContactEmployees.length).length;
        const partnersConDireccion = run.resultRows.filter((p) => Array.isArray(p.BPAddresses) && p.BPAddresses.length).length;

        const summaryRow = `
            <tr class="socios-diapi-run-row${run.isError ? ' is-error' : ''}" data-run-toggle="${index}">
                <td>#${pruebaDiapiCantidadRuns.length - index}</td>
                <td>${escapeHtmlLocal(run.time)}</td>
                <td>${escapeHtmlLocal(run.topRequested)}</td>
                <td>${escapeHtmlLocal(run.waitRequestedSec)}s</td>
                <td>${escapeHtmlLocal(run.realElapsedSec)}s (cliente) / ${escapeHtmlLocal(run.serverElapsedSec ?? '?')}s (servidor)</td>
                <td>${escapeHtmlLocal(run.resultRows.length)}</td>
                <td>${escapeHtmlLocal(run.statusText)}</td>
            </tr>
        `;
        const detailRow = `
            <tr class="socios-diapi-run-detail-row" data-run-detail="${index}" hidden>
                <td colspan="7">
                    <strong>Solicitud:</strong> ${escapeHtmlLocal(run.requestCode || '—')}<br>
                    <strong>Consulta ejecutada:</strong>
                    <textarea class="socios-diapi-run-detail-query" rows="8" readonly>${escapeHtmlLocal(run.query)}</textarea>
                    <details class="socios-diapi-run-subsection">
                        <summary>Contactos — ${contactos.length} contacto(s) en total, ${partnersConContacto} de ${run.resultRows.length} socios tienen al menos uno</summary>
                        ${buildDiapiRunSubtable([
                            { key: 'cardCode', label: 'CardCode' },
                            { key: 'name', label: 'Nombre' },
                            { key: 'position', label: 'Cargo' },
                            { key: 'tel1', label: 'Teléfono' },
                            { key: 'cellular', label: 'Celular' },
                            { key: 'email', label: 'Correo' }
                        ], contactos)}
                    </details>
                    <details class="socios-diapi-run-subsection">
                        <summary>Direcciones — ${direcciones.length} dirección(es) en total, ${partnersConDireccion} de ${run.resultRows.length} socios tienen al menos una</summary>
                        ${buildDiapiRunSubtable([
                            { key: 'cardCode', label: 'CardCode' },
                            { key: 'type', label: 'Tipo' },
                            { key: 'street', label: 'Calle' },
                            { key: 'city', label: 'Ciudad' },
                            { key: 'country', label: 'País' }
                        ], direcciones)}
                    </details>
                </td>
            </tr>
        `;
        return summaryRow + detailRow;
    }).join('');
}

pruebaDiapiCantidadRunsBody?.addEventListener('click', (event) => {
    const toggleRow = event.target.closest('[data-run-toggle]');
    if (!toggleRow) return;
    const index = toggleRow.dataset.runToggle;
    const detailRow = pruebaDiapiCantidadRunsBody.querySelector(`[data-run-detail="${index}"]`);
    if (detailRow) detailRow.hidden = !detailRow.hidden;
});

async function executePruebaDiapiCantidad() {
    const top = Math.min(Math.max(parseInt(pruebaDiapiCantidadTopInput?.value, 10) || 0, 1), 5000);
    const esperaSegundos = Math.min(Math.max(parseInt(pruebaDiapiCantidadEsperaInput?.value, 10) || 0, 1), 180);
    const query = buildPruebaDiapiCantidadQueryPreview(top);

    ejecutarPruebaDiapiCantidadButton.disabled = true;
    setPruebaDiapiCantidadStatus(`Enviando solicitud a DIAPI para ${top} socios (esperando hasta ${esperaSegundos}s)...`, false);
    const clientStartedAt = Date.now();
    try {
        const response = await fetch('/api/socios/prueba-diapi-cantidad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ top, timeoutMs: esperaSegundos * 1000 })
        });
        const payload = await response.json().catch(() => ({}));
        const realElapsedSec = Math.round((Date.now() - clientStartedAt) / 100) / 10;
        if (!response.ok) {
            throw new Error(payload.error || 'No fue posible ejecutar la prueba contra DIAPI.');
        }

        const resultRows = Array.isArray(payload.result) ? payload.result : (Array.isArray(payload.result?.value) ? payload.result.value : []);
        const run = {
            time: new Date().toLocaleTimeString('es-GT'),
            topRequested: top,
            waitRequestedSec: esperaSegundos,
            realElapsedSec,
            serverElapsedSec: payload.elapsedSec ?? null,
            requestCode: payload.requestCode || payload.requestId || '',
            query,
            resultRows,
            isError: false,
            statusText: ''
        };

        if (payload.pending) {
            run.isError = true;
            run.statusText = 'No respondió a tiempo';
            setPruebaDiapiCantidadStatus(`DIAPI no respondio a tiempo (solicitud ${payload.requestCode || payload.requestId}). Tiempo real transcurrido: ${realElapsedSec}s.`, true);
        } else if (!payload.ok) {
            run.isError = true;
            run.statusText = `Error: ${payload.error || 'desconocido'}`;
            setPruebaDiapiCantidadStatus(`DIAPI respondio con error: ${payload.error || 'desconocido'} (${realElapsedSec}s)`, true);
        } else {
            run.statusText = 'OK';
            setPruebaDiapiCantidadStatus(`DIAPI respondio (${payload.requestCode}): ${resultRows.length} resultado(s) en ${realElapsedSec}s.`, false);
            console.log('[prueba-diapi-cantidad] resultado', payload.result);
        }

        pruebaDiapiCantidadRuns.unshift(run);
        renderPruebaDiapiCantidadRuns();
    } catch (error) {
        const realElapsedSec = Math.round((Date.now() - clientStartedAt) / 100) / 10;
        setPruebaDiapiCantidadStatus(`${error.message || 'No fue posible ejecutar la prueba contra DIAPI.'} (${realElapsedSec}s)`, true);
        pruebaDiapiCantidadRuns.unshift({
            time: new Date().toLocaleTimeString('es-GT'),
            topRequested: top,
            waitRequestedSec: esperaSegundos,
            realElapsedSec,
            serverElapsedSec: null,
            requestCode: '',
            query,
            resultRows: [],
            isError: true,
            statusText: `Error: ${error.message || 'desconocido'}`
        });
        renderPruebaDiapiCantidadRuns();
    } finally {
        ejecutarPruebaDiapiCantidadButton.disabled = false;
    }
}

ejecutarPruebaDiapiCantidadButton?.addEventListener('click', () => {
    executePruebaDiapiCantidad();
});
cerrarNuevoSocioButton?.addEventListener('click', requestCloseCreatePopover);
cancelarNuevoSocioButton?.addEventListener('click', requestCloseCreatePopover);
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
        requestCloseCreatePopover();
    }
});
sociosImportPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-import-popover="true"]')) {
        closeSociosImportPopover();
    }
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nuevoSocioPopover && !nuevoSocioPopover.hidden) {
        requestCloseCreatePopover();
    }
    if (event.key === 'Escape' && sociosImportPopover && !sociosImportPopover.hidden) {
        closeSociosImportPopover();
    }
    if (event.key === 'Escape' && pruebaDiapiCantidadPopover && !pruebaDiapiCantidadPopover.hidden) {
        closePruebaDiapiCantidadPopover();
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

function openSolicitudClienteModal(partnerCode, partnerName, options = {}) {
    const skipToDocs = Boolean(options.skipToDocs);
    solicitudClientePartnerCode = partnerCode;
    solicitudClientePartnerLabel.textContent = `${partnerCode}${partnerName ? ' - ' + partnerName : ''}`;
    solicitudClienteStepPregunta.hidden = skipToDocs;
    solicitudClienteStepDocs.hidden = !skipToDocs;
    solicitudClienteStatus.textContent = '';
    Object.keys(solicitudClienteFiles).forEach((key) => delete solicitudClienteFiles[key]);
    solicitudClienteDropzones.querySelectorAll('.solicitud-doc-dropzone').forEach((zone) => {
        zone.classList.remove('has-file');
        zone.querySelector('.solicitud-doc-dropzone-text').textContent = 'Arrastra el archivo aquí o toca para buscarlo';
    });
    solicitudClienteDropzones.querySelectorAll('.solicitud-doc-input').forEach((input) => { input.value = ''; });
    updateSolicitudClienteEnviarState();
    solicitudClienteModal.hidden = false;
    document.body.classList.add('popover-open');
}

function closeSolicitudClienteModal() {
    solicitudClienteModal.hidden = true;
    document.body.classList.remove('popover-open');
    openSocioRoute(solicitudClientePartnerCode);
}

function updateSolicitudClienteEnviarState() {
    const tipos = Array.from(solicitudClienteDropzones.querySelectorAll('.solicitud-doc-dropzone')).map((z) => z.dataset.tipo);
    const completo = tipos.every((tipo) => solicitudClienteFiles[tipo]);
    solicitudClienteEnviarBtn.disabled = !completo;
}

function asignarArchivoSolicitud(tipo, file) {
    if (!file) return;
    solicitudClienteFiles[tipo] = file;
    const zone = solicitudClienteDropzones.querySelector(`.solicitud-doc-dropzone[data-tipo="${tipo}"]`);
    if (zone) {
        zone.classList.add('has-file');
        zone.querySelector('.solicitud-doc-dropzone-text').textContent = file.name;
    }
    updateSolicitudClienteEnviarState();
}

cerrarSolicitudClienteButton?.addEventListener('click', closeSolicitudClienteModal);
solicitudClienteNoBtn?.addEventListener('click', closeSolicitudClienteModal);

solicitudClienteSiBtn?.addEventListener('click', () => {
    solicitudClienteStepPregunta.hidden = true;
    solicitudClienteStepDocs.hidden = false;
});

solicitudClienteVolverBtn?.addEventListener('click', () => {
    solicitudClienteStepDocs.hidden = true;
    solicitudClienteStepPregunta.hidden = false;
});

solicitudClienteDropzones?.querySelectorAll('.solicitud-doc-dropzone').forEach((zone) => {
    const tipo = zone.dataset.tipo;
    const input = solicitudClienteDropzones.querySelector(`.solicitud-doc-input[data-tipo-input="${tipo}"]`);
    zone.addEventListener('click', () => input?.click());
    zone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            input?.click();
        }
    });
    zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('is-dragover');
        const file = event.dataTransfer?.files?.[0];
        asignarArchivoSolicitud(tipo, file);
    });
    input?.addEventListener('change', () => asignarArchivoSolicitud(tipo, input.files?.[0]));
});

solicitudClienteEnviarBtn?.addEventListener('click', async () => {
    solicitudClienteEnviarBtn.disabled = true;
    solicitudClienteStatus.textContent = 'Enviando...';
    try {
        const formData = new FormData();
        Object.entries(solicitudClienteFiles).forEach(([tipo, file]) => formData.append(tipo, file));
        const response = await fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(solicitudClientePartnerCode)}/solicitud-cliente`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No fue posible enviar la solicitud.');
        solicitudClienteStatus.textContent = result.message || 'Solicitud enviada correctamente.';
        window.setTimeout(closeSolicitudClienteModal, 900);
    } catch (error) {
        solicitudClienteStatus.textContent = error.message || 'No fue posible enviar la solicitud.';
        solicitudClienteEnviarBtn.disabled = false;
    }
});

async function init() {
    try {
        await loadConfig();
        await loadSocios();
    } catch (error) {
        sociosTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
