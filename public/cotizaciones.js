const CONFIG_ENDPOINT = '/api/config/general';
const QUOTES_ENDPOINT = '/api/cotizaciones';
const PARTNERS_ENDPOINT = '/api/socios';
const PRESENTATION_KEY = 'cotizaciones';

const DEFAULT_DIE_SHAPES = [
    { key: 'dieShape1', label: 'Circular', fallbackShape: 'Circular' },
    { key: 'dieShape2', label: 'Cuadrado', fallbackShape: 'Cuadrado' },
    { key: 'dieShape3', label: 'Rectangular', fallbackShape: 'Rectangular' },
    { key: 'dieShape4', label: 'Ovalado', fallbackShape: 'Ovalado' },
    { key: 'dieShape5', label: 'Especial', fallbackShape: 'Especial' }
];

const quotesSearchInput = document.getElementById('quotesSearchInput');
const quotesTableBody = document.getElementById('quotesTableBody');
const nuevaCotizacionButton = document.getElementById('nuevaCotizacionButton');
const refreshQuotesButton = document.getElementById('refreshQuotesButton');
const nuevaCotizacionPopover = document.getElementById('nuevaCotizacionPopover');
const cerrarNuevaCotizacionButton = document.getElementById('cerrarNuevaCotizacionButton');
const cancelarNuevaCotizacionButton = document.getElementById('cancelarNuevaCotizacionButton');
const modoAvanzadoButton = document.getElementById('modoAvanzadoButton');
const enviarSolicitudButton = document.getElementById('enviarSolicitudButton');
const nuevaCotizacionForm = document.getElementById('nuevaCotizacionForm');
const nuevaCotizacionStatus = document.getElementById('nuevaCotizacionStatus');
const nuevoClienteNombre = document.getElementById('nuevoClienteNombre');
const nuevoClienteCodigo = document.getElementById('nuevoClienteCodigo');
const requestJobName = document.getElementById('requestJobName');
const requestQuantity = document.getElementById('requestQuantity');
const requestProcessType = document.getElementById('requestProcessType');
const requestFixedSize = document.getElementById('requestFixedSize');
const requestMaterial = document.getElementById('requestMaterial');
const requestSurface = document.getElementById('requestSurface');
const requestComments = document.getElementById('requestComments');
const requestAttachments = document.getElementById('requestAttachments');
const requestAttachmentsPreview = document.getElementById('requestAttachmentsPreview');
const quotePartnerLookupResults = document.getElementById('quotePartnerLookupResults');
const dieShapePicker = document.getElementById('dieShapePicker');

let browserConfig = null;
let partnerLookupTimer = null;
let latestPartnerLookupTerm = '';
let currentQuoteSearch = '';
let requestAttachmentsFiles = [];

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
    renderDieShapeOptions();
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

if (isShellEmbedded()) {
    document.body.classList.add('shell-embedded');
}

function setCreateStatus(message, isError = false) {
    nuevaCotizacionStatus.hidden = !message;
    nuevaCotizacionStatus.textContent = message || '';
    nuevaCotizacionStatus.classList.toggle('is-error', Boolean(message && isError));
    nuevaCotizacionStatus.classList.toggle('is-success', Boolean(message && !isError));
}

function getConfiguredDieShapes() {
    const general = browserConfig?.general || {};
    return DEFAULT_DIE_SHAPES.map((shape, index) => ({
        ...shape,
        label: firstFilled(general[`dieShapeLabel${index + 1}`], shape.label),
        image: firstFilled(general[`dieShapeImage${index + 1}`], '')
    }));
}

function getSelectedRadioValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function getSelectedCheckboxValues(containerId) {
    return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map((input) => input.value);
}

function refreshSelectableStates() {
    document.querySelectorAll('.quote-request-pill').forEach((item) => {
        const input = item.querySelector('input');
        item.classList.toggle('is-selected', Boolean(input?.checked));
    });
    document.querySelectorAll('.quote-request-check').forEach((item) => {
        const input = item.querySelector('input');
        item.classList.toggle('is-selected', Boolean(input?.checked));
    });
    document.querySelectorAll('.quote-request-shape').forEach((item) => {
        const input = item.querySelector('input');
        item.classList.toggle('is-selected', Boolean(input?.checked));
    });
}

function renderDieShapeOptions() {
    if (!dieShapePicker) return;
    const shapes = getConfiguredDieShapes();
    dieShapePicker.innerHTML = shapes.map((shape, index) => `
        <label class="quote-request-shape">
            <input type="radio" name="die_shape" value="${escapeHtml(shape.label)}" ${index === 0 ? '' : ''}>
            <span class="quote-request-shape-media">
                ${shape.image
                    ? `<img src="${escapeHtml(shape.image)}" alt="${escapeHtml(shape.label)}">`
                    : `<span class="quote-request-shape-fallback" data-shape="${escapeHtml(shape.fallbackShape)}"></span>`}
            </span>
            <span class="quote-request-shape-name">${escapeHtml(shape.label)}</span>
        </label>
    `).join('');
    refreshSelectableStates();
}

function renderPartnerLookup(items, emptyMessage) {
    if (!quotePartnerLookupResults) return;
    if (!items.length) {
        quotePartnerLookupResults.innerHTML = `<tr><td colspan="3">${escapeHtml(emptyMessage)}</td></tr>`;
        return;
    }

    quotePartnerLookupResults.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.partner_code)}</td>
            <td>${escapeHtml(item.partner_name)}</td>
            <td>
                <button
                    type="button"
                    class="action-btn quote-create-use-btn"
                    data-partner-code="${escapeHtml(item.partner_code)}"
                    data-partner-name="${escapeHtml(item.partner_name)}"
                >Usar</button>
            </td>
        </tr>
    `).join('');
}

async function searchPartners(term) {
    const normalizedTerm = String(term || '').trim();
    latestPartnerLookupTerm = normalizedTerm;

    if (!normalizedTerm) {
        nuevoClienteCodigo.value = '';
        renderPartnerLookup([], 'Escribe el nombre del cliente para buscar socios.');
        return;
    }

    const params = new URLSearchParams({ q: normalizedTerm, limit: '8' });
    const response = await fetch(`${PARTNERS_ENDPOINT}?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible buscar socios.');
    }

    if (latestPartnerLookupTerm !== normalizedTerm) return;
    renderPartnerLookup(payload.socios || [], 'No se encontraron socios con ese nombre.');
}

function schedulePartnerLookup() {
    clearTimeout(partnerLookupTimer);
    partnerLookupTimer = window.setTimeout(() => {
        searchPartners(nuevoClienteNombre?.value).catch((error) => {
            renderPartnerLookup([], error.message || 'No fue posible buscar socios.');
        });
    }, 220);
}

function updateSummary() {
    const selectedSize = requestFixedSize?.selectedOptions?.[0]?.textContent || '';
    const specials = getSelectedCheckboxValues('requestSpecialFinishesGrid');
    const summaryMap = {
        summaryCustomer: nuevoClienteNombre?.value.trim() || '-',
        summaryJob: requestJobName?.value.trim() || '-',
        summaryQuantity: requestQuantity?.value.trim() || '-',
        summaryShape: getSelectedRadioValue('die_shape') || '-',
        summarySize: selectedSize || '-',
        summaryMaterial: requestMaterial?.value || '-',
        summaryCoating: getSelectedRadioValue('coating') || '-',
        summarySpecialFinishes: specials.length ? specials.join(', ') : '-',
        summarySurface: requestSurface?.value || '-',
        summaryPlacement: getSelectedRadioValue('placement') || '-',
        summaryAttachments: String(requestAttachmentsFiles.length || 0)
    };
    Object.entries(summaryMap).forEach(([id, value]) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    });
    refreshSelectableStates();
    if (enviarSolicitudButton) {
        enviarSolicitudButton.disabled = !isRequestFormValid();
    }
}

function renderAttachmentsPreview() {
    if (!requestAttachmentsPreview) return;
    if (!requestAttachmentsFiles.length) {
        requestAttachmentsPreview.innerHTML = '';
        updateSummary();
        return;
    }
    requestAttachmentsPreview.innerHTML = requestAttachmentsFiles.map((file, index) => `
        <div class="quote-request-attachment-item">
            <span>${escapeHtml(file.name)}</span>
            <button type="button" class="action-btn" data-remove-attachment="${index}">Quitar</button>
        </div>
    `).join('');
    updateSummary();
}

function openCreatePopover() {
    nuevaCotizacionPopover.hidden = false;
    document.body.classList.add('popover-open');
    setCreateStatus('');
    renderPartnerLookup([], 'Escribe el nombre del cliente para buscar socios.');
    updateSummary();
    window.setTimeout(() => {
        nuevoClienteNombre?.focus();
    }, 30);
}

function closeCreatePopover() {
    nuevaCotizacionPopover.hidden = true;
    document.body.classList.remove('popover-open');
    setCreateStatus('');
    nuevaCotizacionForm?.reset();
    nuevoClienteCodigo.value = '';
    requestAttachmentsFiles = [];
    renderAttachmentsPreview();
    renderPartnerLookup([], 'Escribe el nombre del cliente para buscar socios.');
    renderDieShapeOptions();
    updateSummary();
}

function openQuoteEditor(quoteCode) {
    const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
    const label = `Cotizacion ${quoteCode}`;
    if (openRouteInShell(route, label)) return;
    window.location.href = route;
}

async function fetchPartnerDetail(partnerCode) {
    const response = await fetch(`${PARTNERS_ENDPOINT}/${encodeURIComponent(partnerCode)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el socio.');
    return payload;
}

function getRequestFields() {
    const sizeOption = requestFixedSize?.selectedOptions?.[0];
    return {
        customerName: nuevoClienteNombre?.value.trim() || '',
        customerCode: nuevoClienteCodigo?.value.trim() || '',
        jobName: requestJobName?.value.trim() || '',
        quantity: requestQuantity?.value.trim() || '',
        processType: requestProcessType?.value || '',
        dieShape: getSelectedRadioValue('die_shape'),
        fixedSize: requestFixedSize?.value || '',
        widthInches: sizeOption?.dataset.width || '',
        lengthInches: sizeOption?.dataset.length || '',
        material: requestMaterial?.value || '',
        coating: getSelectedRadioValue('coating'),
        specialFinishes: getSelectedCheckboxValues('requestSpecialFinishesGrid'),
        surface: requestSurface?.value || '',
        placement: getSelectedRadioValue('placement'),
        comments: requestComments?.value.trim() || ''
    };
}

function isRequestFormValid() {
    const fields = getRequestFields();
    return Boolean(
        fields.customerName &&
        fields.jobName &&
        fields.quantity &&
        fields.processType &&
        fields.dieShape &&
        fields.fixedSize &&
        fields.material &&
        fields.coating &&
        fields.surface &&
        fields.placement
    );
}

function buildRequestMeta(fields) {
    return {
        'CLIENTE NOMBRE SOLICITUD': fields.customerName,
        'FORMA TROQUEL': fields.dieShape,
        'MEDIDA FIJA': fields.fixedSize,
        'MATERIAL SOLICITADO': fields.material,
        'ACABADO SUPERFICIAL': fields.coating,
        'ACABADOS ESPECIALES': fields.specialFinishes.join(', '),
        'SUPERFICIE APLICACION': fields.surface,
        'COLOCACION': fields.placement,
        'OBSERVACIONES SOLICITUD': fields.comments,
        'SOLICITUD TIPO': 'Primera fase vendedor'
    };
}

async function createQuoteHeader(customerCode, customerName) {
    if (customerCode) {
        const partnerPayload = await fetchPartnerDetail(customerCode);
        const partner = partnerPayload?.socio || {};
        const contacts = Array.isArray(partnerPayload?.contactos) ? partnerPayload.contactos : [];
        const mainContact = contacts[0] || {};
        const contactName = mainContact.contact_name || [mainContact.first_name, mainContact.last_name].filter(Boolean).join(' ');
        const contactEmail = mainContact.email || partner.email || '';
        const primaryPhone = mainContact.mobile || mainContact.phone || '';
        const secondaryPhone = mainContact.mobile && mainContact.phone && mainContact.mobile !== mainContact.phone ? mainContact.phone : '';
        const salespersonName = partner.salesperson_name || '';
        const response = await fetch(QUOTES_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: customerName,
                customer_code: customerCode,
                contact_name: contactName,
                email: contactEmail,
                phone: primaryPhone,
                phone_secondary: secondaryPhone,
                salesperson_name: salespersonName
            })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No fue posible crear la cotizacion.');
        return payload?.cotizacion;
    }

    const response = await fetch(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_name: customerName,
            customer_code: '',
            status: 'Pendiente'
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible crear la cotizacion.');
    return payload?.cotizacion;
}

async function createInitialQuoteLine(quoteCode, fields) {
    const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            job_name: fields.jobName,
            quantity: fields.quantity,
            quantityProducts: fields.quantity,
            process_type: fields.processType,
            material_name: fields.material,
            material_code: fields.material,
            widthInches: fields.widthInches,
            lengthInches: fields.lengthInches,
            applicationType: fields.placement,
            outputType: fields.surface,
            status: 'Pendiente',
            department: 'Flexografia',
            request_meta: buildRequestMeta(fields)
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible crear la linea de la solicitud.');
    return payload?.linea;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const [, contentBase64 = ''] = result.split(',');
            resolve(contentBase64);
        };
        reader.onerror = () => reject(new Error(`No fue posible leer ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

async function uploadRequestAttachments(quoteCode, lineCode) {
    for (const file of requestAttachmentsFiles) {
        const contentBase64 = await fileToBase64(file);
        const response = await fetch(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileExt: file.name.includes('.') ? file.name.split('.').pop() : '',
                contentBase64
            })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `No fue posible subir ${file.name}.`);
    }
}

async function submitQuoteRequest(openAdvanced = false) {
    const fields = getRequestFields();
    if (!fields.customerName) {
        setCreateStatus('Debes indicar el cliente.', true);
        nuevoClienteNombre?.focus();
        return;
    }
    if (!openAdvanced && !isRequestFormValid()) {
        setCreateStatus('Completa todos los campos obligatorios de la solicitud.', true);
        return;
    }

    setCreateStatus(openAdvanced ? 'Abriendo modo avanzado...' : 'Enviando solicitud...');

    try {
        const quote = await createQuoteHeader(fields.customerCode, fields.customerName);
        const quoteCode = quote?.quote_code;
        if (!quoteCode) throw new Error('No se recibio el codigo de la cotizacion creada.');

        if (!openAdvanced) {
            const line = await createInitialQuoteLine(quoteCode, fields);
            const lineCode = line?.line_code;
            if (!lineCode) throw new Error('No se recibio el codigo de la linea creada.');
            if (requestAttachmentsFiles.length) {
                await uploadRequestAttachments(quoteCode, lineCode);
            }
        }

        closeCreatePopover();
        openQuoteEditor(quoteCode);
    } catch (error) {
        setCreateStatus(error.message || 'No fue posible completar la solicitud.', true);
    }
}

async function loadQuotes(search = '') {
    currentQuoteSearch = search;
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('q', search);

    const response = await fetch(`/api/cotizaciones?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las cotizaciones.');

    const items = payload.cotizaciones || [];
    const openIcon = getOpenIconConfig();

    quotesTableBody.innerHTML = items.length ? items.map((item) => {
        const route = `/cotizaciones/documento?codigo=${encodeURIComponent(item.quote_code)}`;
        return `
        <tr>
            <td>${escapeHtml(item.quote_code)}</td>
            <td>${escapeHtml(item.customer_code)}</td>
            <td>${escapeHtml(item.customer_name)}</td>
            <td>${escapeHtml(item.salesperson_name)}</td>
            <td>${escapeHtml(formatDate(item.created_on))}</td>
            <td>${escapeHtml(formatDate(item.due_on))}</td>
            <td>${escapeHtml(item.status)}</td>
            <td><a class="browser-open-link" href="${route}" data-route="${route}" data-quote-code="${escapeHtml(item.quote_code)}" data-label="Cotizacion ${escapeHtml(item.quote_code)}" aria-label="Abrir cotizacion ${escapeHtml(item.quote_code)}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir cotizacion', 'table-icon-media')}</a></td>
        </tr>`;
    }).join('') : '<tr><td colspan="8">No hay cotizaciones registradas.</td></tr>';
}

quotesSearchInput?.addEventListener('input', () => {
    loadQuotes(quotesSearchInput.value).catch((error) => {
        quotesTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
});

refreshQuotesButton?.addEventListener('click', () => {
    loadQuotes(currentQuoteSearch).catch((error) => {
        quotesTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    });
});

quotesTableBody?.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    openQuoteEditor(link.dataset.quoteCode || '');
});

nuevaCotizacionButton?.addEventListener('click', openCreatePopover);
cerrarNuevaCotizacionButton?.addEventListener('click', closeCreatePopover);
cancelarNuevaCotizacionButton?.addEventListener('click', closeCreatePopover);
modoAvanzadoButton?.addEventListener('click', () => {
    submitQuoteRequest(true);
});
nuevaCotizacionForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuoteRequest(false);
});

nuevaCotizacionPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-quote-create="true"]')) {
        closeCreatePopover();
        return;
    }

    const useButton = event.target.closest('[data-partner-code]');
    if (useButton) {
        nuevoClienteCodigo.value = useButton.dataset.partnerCode || '';
        nuevoClienteNombre.value = useButton.dataset.partnerName || '';
        updateSummary();
        return;
    }

    const removeButton = event.target.closest('[data-remove-attachment]');
    if (removeButton) {
        const index = Number(removeButton.dataset.removeAttachment);
        requestAttachmentsFiles = requestAttachmentsFiles.filter((_, fileIndex) => fileIndex !== index);
        renderAttachmentsPreview();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nuevaCotizacionPopover && !nuevaCotizacionPopover.hidden) {
        closeCreatePopover();
    }
});

nuevoClienteNombre?.addEventListener('input', () => {
    nuevoClienteCodigo.value = '';
    schedulePartnerLookup();
    updateSummary();
});

[requestJobName, requestQuantity, requestProcessType, requestFixedSize, requestMaterial, requestSurface, requestComments].forEach((field) => {
    field?.addEventListener('input', updateSummary);
    field?.addEventListener('change', updateSummary);
});

document.addEventListener('change', (event) => {
    if (event.target.matches('input[name="die_shape"], input[name="coating"], input[name="placement"], #requestSpecialFinishesGrid input[type="checkbox"]')) {
        updateSummary();
    }
});

requestAttachments?.addEventListener('change', () => {
    requestAttachmentsFiles = Array.from(requestAttachments.files || []);
    renderAttachmentsPreview();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadQuotes(currentQuoteSearch).catch(() => {});
    }
});

async function init() {
    try {
        await loadConfig();
        await loadQuotes();
        updateSummary();
    } catch (error) {
        quotesTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    }
}

init();
