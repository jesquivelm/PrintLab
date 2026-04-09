const CONFIG_ENDPOINT = '/api/config/general';
const QUOTES_ENDPOINT = '/api/cotizaciones';
const PARTNERS_ENDPOINT = '/api/socios';
const LAUNCHER_POSITION_KEY = 'quote-request-launcher-position-v2';
const DEFAULT_ICON_MAP = {
    processLauncher: { value: '\u25CE', color: '#6b7580', size: 30 },
    quoteRequestSubmit: { value: '\u27A4', color: '#ffffff', size: 18 },
    quoteRequestAdvanced: { value: '\u2699', color: '#5f7288', size: 18 },
    quoteRequestAttachment: { value: '\u25CE', color: '#1e516d', size: 18 },
    quoteRequestRecord: { value: '\u25CF', color: '#1e516d', size: 18 },
    quoteRequestRecordStop: { value: '\u25A0', color: '#ef4444', size: 18 }
};
const STATIC_MATERIALS = [
    'BOPP Blanco',
    'BOPP Transparente',
    'Papel Couche',
    'Papel Termico',
    'Papel Transfer',
    'PET Blanco',
    'PET Transparente',
    'Polipropileno Blanco',
    'Polipropileno Transparente',
    'Vinil Blanco',
    'Vinil Transparente'
];
const DEFAULT_SURFACES = ['Botella', 'Caja', 'Carton', 'Envase', 'Frasco', 'Pouch', 'Tapa', 'Vidrio'];

const rowsBody = document.getElementById('quotesTableBody');
const quotesSearchInput = document.getElementById('quotesSearchInput');
const nuevaCotizacionButton = document.getElementById('nuevaCotizacionButton');
const refreshQuotesButton = document.getElementById('refreshQuotesButton');
const popover = document.getElementById('nuevaCotizacionPopover');
const popoverPanel = popover?.querySelector('.quote-request-popover-panel');
const closeButton = document.getElementById('cerrarNuevaCotizacionButton');
const form = document.getElementById('nuevaCotizacionForm');
const statusNode = document.getElementById('nuevaCotizacionStatus');
const customerNameInput = document.getElementById('nuevoClienteNombre');
const customerCodeInput = document.getElementById('nuevoClienteCodigo');
const customerLookupPanel = document.getElementById('quoteCustomerLookupPanel');
const customerLookupResults = document.getElementById('quoteCustomerLookupResults');
const fixedSizeSelect = document.getElementById('requestFixedSize');
const materialInput = document.getElementById('requestMaterial');
const materialSuggestions = document.getElementById('materialSuggestions');
const surfaceInput = document.getElementById('requestSurface');
const surfaceSuggestions = document.getElementById('surfaceSuggestions');
const attachmentsInput = document.getElementById('requestAttachments');
const attachmentsPreview = document.getElementById('requestAttachmentsPreview');
const audioRecordButton = document.getElementById('audioRecordButton');
const audioRecordIndicator = document.getElementById('audioRecordIndicator');
const launcherWrap = document.getElementById('quoteRequestCreateButtonWrap');
const processLauncherButton = document.getElementById('processLauncherButton');
const processLauncherBridge = document.getElementById('processLauncherBridge');
const createButton = document.getElementById('enviarSolicitudFabButton');
const advancedButton = document.getElementById('modoAvanzadoFabButton');
const shapePicker = document.getElementById('dieShapePicker');

let loadedConfig = {};
let quoteCatalog = [];
let partnerLookupAbort = null;
let materialItems = STATIC_MATERIALS.map((name) => ({ code: '', name }));
let surfaceItems = [...DEFAULT_SURFACES];
let pendingAttachments = [];
let mediaRecorder = null;
let recordingChunks = [];
let isRecording = false;
let dragState = null;

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

function setStatus(message, tone = 'info') {
    if (!statusNode) return;
    statusNode.hidden = !message;
    statusNode.textContent = message || '';
    statusNode.dataset.tone = tone;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible completar la solicitud.');
    }
    return payload;
}

function isShellEmbedded() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shell') === '1' || window !== window.parent;
}

function openRouteInShell(route, label) {
    if (!isShellEmbedded()) return false;
    window.parent.postMessage({ type: 'erp-open-tab', route, label }, window.location.origin);
    return true;
}

function isSvgValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg');
}

function renderIcon(target, iconValue, color, size) {
    if (!target) return;
    const value = String(iconValue || '').trim();
    target.style.color = color || '';
    if (isSvgValue(value)) {
        target.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${value}');mask-image:url('${value}');width:${size}px;height:${size}px;"></span>`;
        return;
    }
    if (value.startsWith('data:image')) {
        target.innerHTML = `<img src="${value}" alt="" class="icon-image" style="width:${size}px;height:${size}px;">`;
        return;
    }
    target.innerHTML = `<span class="icon-glyph" style="font-size:${size}px;">${escapeHtml(value)}</span>`;
}

function iconConfigFor(key) {
    const fallback = DEFAULT_ICON_MAP[key];
    const icons = loadedConfig?.icons || {};
    const general = loadedConfig?.general || {};
    const value = normalizeText(icons[key]) || fallback.value;
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    const color = general[`iconColor${suffix}`] || fallback.color;
    const size = Number(general[`iconSize${suffix}`]) || fallback.size;
    return { value, color, size };
}

function applyConfiguredIcons() {
    const primary = iconConfigFor('processLauncher');
    const submit = iconConfigFor('quoteRequestSubmit');
    const advanced = iconConfigFor('quoteRequestAdvanced');
    const attachment = iconConfigFor('quoteRequestAttachment');
    const record = iconConfigFor(isRecording ? 'quoteRequestRecordStop' : 'quoteRequestRecord');
    renderIcon(document.querySelector('[data-launcher-icon="primary"]'), primary.value, primary.color, primary.size || 24);
    renderIcon(document.querySelector('[data-fab-icon="submit"]'), submit.value, submit.color, submit.size);
    renderIcon(document.querySelector('[data-fab-icon="advanced"]'), advanced.value, advanced.color, advanced.size);
    renderIcon(document.querySelector('[data-inline-icon="attachment"]'), attachment.value, attachment.color, attachment.size);
    renderIcon(document.querySelector('[data-inline-icon="record"]'), record.value, record.color, record.size);
    if (processLauncherButton) {
        processLauncherButton.style.setProperty('--floating-icon-color', primary.color);
        processLauncherButton.style.setProperty('--floating-icon-hover', loadedConfig?.general?.iconColorHoverProcessLauncher || '#0b81b8');
        processLauncherButton.style.setProperty('--floating-icon-size', `${primary.size || 24}px`);
    }
    if (audioRecordButton) {
        audioRecordButton.title = isRecording ? 'Detener Grabacion' : 'Grabar Audio';
        audioRecordButton.setAttribute('aria-label', isRecording ? 'Detener Grabacion' : 'Grabar Audio');
    }
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR');
}

function renderQuotesTable(items) {
    if (!rowsBody) return;
    if (!items.length) {
        rowsBody.innerHTML = '<tr><td colspan="8">No hay cotizaciones.</td></tr>';
        return;
    }
    rowsBody.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.quote_code || '')}</td>
            <td>${escapeHtml(item.customer_code || '')}</td>
            <td>${escapeHtml(item.customer_name || '')}</td>
            <td>${escapeHtml(item.salesperson_name || '')}</td>
            <td>${escapeHtml(formatDate(item.created_on))}</td>
            <td>${escapeHtml(formatDate(item.due_on))}</td>
            <td>${escapeHtml(item.status || '')}</td>
            <td><button type="button" class="copy-popover-send" data-open-quote="${escapeHtml(item.quote_code || '')}">Abrir</button></td>
        </tr>
    `).join('');
}

function getFilteredQuotes() {
    const term = normalizeText(quotesSearchInput?.value).toLowerCase();
    if (!term) return quoteCatalog;
    return quoteCatalog.filter((item) => [item.quote_code, item.customer_code, item.customer_name, item.salesperson_name]
        .some((value) => String(value || '').toLowerCase().includes(term)));
}

async function loadQuotes() {
    const payload = await fetchJson(QUOTES_ENDPOINT);
    quoteCatalog = Array.isArray(payload.cotizaciones) ? payload.cotizaciones : [];
    renderQuotesTable(getFilteredQuotes());
}

async function loadConfig() {
    loadedConfig = await fetchJson(CONFIG_ENDPOINT);
    applyConfiguredIcons();
    renderShapePicker();
}

function renderInlineSuggestionList(panel, items, emptyMessage) {
    if (!panel) return;
    if (!items.length) {
        panel.innerHTML = `<div class="quote-request-lookup-empty">${escapeHtml(emptyMessage)}</div>`;
        panel.hidden = false;
        return;
    }
    panel.innerHTML = items.map((item) => `
        <button type="button" class="quote-request-lookup-item" data-value="${escapeHtml(item.name)}" data-code="${escapeHtml(item.code || '')}">
            <span class="quote-request-lookup-name">${escapeHtml(item.name)}</span>
            <span class="quote-request-lookup-code">${escapeHtml(item.code || '')}</span>
        </button>
    `).join('');
    panel.hidden = false;
}

function showMaterialSuggestions() {
    const term = normalizeText(materialInput?.value).toLowerCase();
    const items = materialItems
        .filter((item) => !term || item.name.toLowerCase().includes(term))
        .slice(0, 12);
    renderInlineSuggestionList(materialSuggestions, items, 'No hay materiales disponibles.');
}

function showSurfaceSuggestions() {
    const term = normalizeText(surfaceInput?.value).toLowerCase();
    const items = surfaceItems
        .filter((item) => !term || item.toLowerCase().includes(term))
        .slice(0, 12)
        .map((item) => ({ name: item, code: '' }));
    renderInlineSuggestionList(surfaceSuggestions, items, 'No hay superficies disponibles.');
}

function hideInlinePanels() {
    if (materialSuggestions) materialSuggestions.hidden = true;
    if (surfaceSuggestions) surfaceSuggestions.hidden = true;
}

async function searchPartners(term) {
    partnerLookupAbort?.abort();
    partnerLookupAbort = new AbortController();
    const query = new URLSearchParams({ limit: '12' });
    if (term) query.set('q', term);
    const response = await fetch(`${PARTNERS_ENDPOINT}?${query.toString()}`, { signal: partnerLookupAbort.signal });
    const payload = await response.json().catch(() => ({ socios: [] }));
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar socios.');
    const items = Array.isArray(payload.socios) ? payload.socios : [];
    customerLookupResults.innerHTML = items.length
        ? items.map((item) => `
            <button type="button" class="quote-request-lookup-item" data-partner-code="${escapeHtml(item.partner_code || '')}" data-partner-name="${escapeHtml(item.partner_name || '')}">
                <span class="quote-request-lookup-name">${escapeHtml(item.partner_name || '')}</span>
                <span class="quote-request-lookup-code">${escapeHtml(item.partner_code || '')}</span>
            </button>
        `).join('')
        : '<div class="quote-request-lookup-empty">No se encontraron socios.</div>';
    customerLookupPanel.hidden = false;
}

function applyPartnerSelection(code, name) {
    customerCodeInput.value = code || '';
    customerNameInput.value = name || '';
    if (customerLookupPanel) customerLookupPanel.hidden = true;
}

function syncToggleChipState(scope = document) {
    scope.querySelectorAll('.quote-request-toggle-chip').forEach((chip) => {
        const input = chip.querySelector('input');
        chip.classList.toggle('is-selected', Boolean(input?.checked));
    });
    scope.querySelectorAll('.quote-request-shape-card').forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('is-selected', Boolean(input?.checked));
    });
}

function readAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',').pop() || '');
        reader.onerror = () => reject(new Error(`No fue posible leer ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function renderAttachments() {
    if (!attachmentsPreview) return;
    if (!pendingAttachments.length) {
        attachmentsPreview.innerHTML = '<div class="quote-request-attachment-empty">No hay adjuntos cargados.</div>';
        return;
    }
    attachmentsPreview.innerHTML = pendingAttachments.map((item, index) => {
        if (item.kind === 'audio') {
            return `
                <div class="quote-request-attachment-card audio">
                    <div class="quote-request-attachment-meta"><strong>${escapeHtml(item.fileName)}</strong><span>${escapeHtml(item.label || 'Audio')}</span></div>
                    <audio controls src="${escapeHtml(item.previewUrl)}"></audio>
                    <button type="button" class="copy-popover-send" data-remove-attachment="${index}">Quitar</button>
                </div>
            `;
        }
        return `
            <div class="quote-request-attachment-card">
                <div class="quote-request-attachment-meta"><strong>${escapeHtml(item.fileName)}</strong><span>${escapeHtml(item.label || '')}</span></div>
                <button type="button" class="copy-popover-send" data-remove-attachment="${index}">Quitar</button>
            </div>
        `;
    }).join('');
}

function formHasContent() {
    if (!form) return false;
    const data = new FormData(form);
    for (const [key, value] of data.entries()) {
        if (key === 'customer_code') continue;
        if (normalizeText(value)) return true;
    }
    return pendingAttachments.length > 0;
}

function resetFormState() {
    form?.reset();
    customerCodeInput.value = '';
    pendingAttachments = [];
    renderAttachments();
    hideInlinePanels();
    setStatus('');
    syncToggleChipState();
    applyConfiguredIcons();
}

function setDefaultLauncherPosition() {
    if (!launcherWrap || !popoverPanel) return;
    const rect = popoverPanel.getBoundingClientRect();
    const left = Math.max(16, Math.min(window.innerWidth - 96, rect.right - 120));
    const top = Math.max(88, rect.top + 120);
    launcherWrap.style.left = `${left}px`;
    launcherWrap.style.top = `${top}px`;
}

function renderShapePicker() {
    if (!shapePicker) return;
    const general = loadedConfig?.general || {};
    const shapes = [
        { value: 'Circular', label: general.dieShapeLabel1 || 'Circular', image: general.dieShapeImage1 || '' },
        { value: 'Cuadrado', label: general.dieShapeLabel2 || 'Cuadrado', image: general.dieShapeImage2 || '' },
        { value: 'Rectangular', label: general.dieShapeLabel3 || 'Rectangular', image: general.dieShapeImage3 || '' },
        { value: 'Ovalado', label: general.dieShapeLabel4 || 'Ovalado', image: general.dieShapeImage4 || '' },
        { value: 'Especial', label: general.dieShapeLabel5 || 'Especial', image: general.dieShapeImage5 || '' }
    ];
    shapePicker.innerHTML = shapes.map((shape, index) => `
        <label class="quote-request-shape-card ${index === 0 ? 'is-selected' : ''}">
            <input type="radio" name="die_shape" value="${escapeHtml(shape.value)}" ${index === 0 ? 'checked' : ''}>
            <span class="quote-request-shape-media">${shape.image ? `<img src="${escapeHtml(shape.image)}" alt="${escapeHtml(shape.label)}">` : `<span class="quote-request-shape-fallback" data-shape="${escapeHtml(shape.value)}"></span>`}</span>
            <span class="quote-request-shape-name">${escapeHtml(shape.label)}</span>
        </label>
    `).join('');
    syncToggleChipState(shapePicker);
}

function collectRequestPayload() {
    const selectedShape = form.querySelector('input[name="die_shape"]:checked')?.value || '';
    const selectedSize = fixedSizeSelect?.selectedOptions?.[0];
    const numbering = form.querySelector('input[name="numbering"]:checked')?.value || '';
    const stamping = form.querySelector('input[name="stamping"]:checked')?.value || '';
    const varnish = form.querySelector('input[name="varnish"]:checked')?.value || '';
    const placement = form.querySelector('input[name="placement"]:checked')?.value || '';
    return {
        customer_code: normalizeText(customerCodeInput.value),
        customer_name: normalizeText(customerNameInput.value),
        job_name: normalizeText(document.getElementById('requestJobName')?.value),
        quantity: normalizeText(document.getElementById('requestQuantity')?.value),
        process_type: normalizeText(document.getElementById('requestProcessType')?.value),
        product_type: normalizeText(document.getElementById('requestProductType')?.value),
        material_name: normalizeText(materialInput?.value),
        applicationType: normalizeText(surfaceInput?.value),
        outputType: placement,
        widthInches: Number(selectedSize?.dataset.width || 0) || null,
        lengthInches: Number(selectedSize?.dataset.length || 0) || null,
        request_meta: {
            'REQ | Tipo de Producto': normalizeText(document.getElementById('requestProductType')?.value),
            'REQ | Forma': selectedShape,
            'REQ | Barniz': varnish,
            'REQ | Estampado': stamping,
            'REQ | Numeracion': numbering,
            'REQ | Embosado': document.getElementById('finishEmbossed')?.checked ? 'Si' : 'No',
            'REQ | Troquelado': document.getElementById('finishDieCut')?.checked ? 'Si' : 'No',
            'REQ | Superficie': normalizeText(surfaceInput?.value),
            'REQ | Colocacion': placement,
            'REQ | Comentarios': normalizeText(document.getElementById('requestComments')?.value),
            'REQ | Medida Fija': normalizeText(fixedSizeSelect?.value),
            'REQ | Numeracion Aviso': numbering ? 'Revisar proceso adicional de impresion para numerado.' : '',
            'CODEX_UI_STATE': {
                productType: normalizeText(document.getElementById('requestProductType')?.value),
                dieShape: selectedShape,
                widthInches: Number(selectedSize?.dataset.width || 0) || null,
                lengthInches: Number(selectedSize?.dataset.length || 0) || null
            }
        }
    };
}

function validateQuickRequest(forAdvanced) {
    const payload = collectRequestPayload();
    if (!payload.customer_name) throw new Error('Debes indicar el nombre del socio.');
    if (!payload.job_name) throw new Error('Debes indicar el nombre del producto.');
    if (!payload.quantity) throw new Error('Debes indicar la cantidad.');
    if (!forAdvanced) {
        if (!payload.process_type) throw new Error('Debes seleccionar el proceso productivo.');
        if (!payload.material_name) throw new Error('Debes indicar el material.');
        if (!payload.applicationType) throw new Error('Debes indicar la superficie de aplicacion.');
        if (!fixedSizeSelect?.value) throw new Error('Debes seleccionar una medida.');
    }
    return payload;
}

async function uploadPendingAttachments(quoteCode, lineCode) {
    for (const attachment of pendingAttachments) {
        await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas/${encodeURIComponent(lineCode)}/adjuntos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileExt: attachment.fileExt,
                contentBase64: attachment.contentBase64,
                notes: attachment.kind === 'audio' ? 'Audio grabado' : 'Adjunto'
            })
        });
    }
}

async function submitQuoteRequest(forAdvanced = false) {
    const payload = validateQuickRequest(forAdvanced);
    setStatus(forAdvanced ? 'Preparando proceso avanzado...' : 'Creando cotizacion...', 'saving');
    const quoteResponse = await fetchJson(QUOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_code: payload.customer_code,
            customer_name: payload.customer_name,
            status: 'Borrador'
        })
    });
    const quoteCode = quoteResponse?.cotizacion?.quote_code;
    if (!quoteCode) throw new Error('La cotizacion se creo sin codigo.');
    const lineResponse = await fetchJson(`${QUOTES_ENDPOINT}/${encodeURIComponent(quoteCode)}/lineas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_code: payload.customer_code,
            customer_name: payload.customer_name,
            job_name: payload.job_name,
            quantity: payload.quantity,
            process_type: payload.process_type || 'Convencional',
            material_name: payload.material_name,
            material_code: payload.material_name,
            applicationType: payload.applicationType,
            outputType: payload.outputType,
            widthInches: payload.widthInches,
            lengthInches: payload.lengthInches,
            status: forAdvanced ? 'Borrador' : 'Solicitud',
            request_meta: payload.request_meta
        })
    });
    const lineCode = lineResponse?.linea?.line_code;
    if (!lineCode) throw new Error('La linea se creo sin codigo.');
    await uploadPendingAttachments(quoteCode, lineCode);
    await loadQuotes();
    if (forAdvanced) {
        const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
        if (!openRouteInShell(route, `Cotizacion ${quoteCode}`)) {
            window.location.href = route;
        }
        return;
    }
    setStatus(`Cotizacion ${quoteCode} creada.`, 'saved');
    resetFormState();
    closePopover(true);
}

function openPopover() {
    popover.hidden = false;
    setDefaultLauncherPosition();
    if (processLauncherBridge) processLauncherBridge.hidden = true;
    if (processLauncherButton) processLauncherButton.setAttribute('aria-expanded', 'false');
    renderAttachments();
    syncToggleChipState();
    setTimeout(() => customerNameInput?.focus(), 30);
}

function closePopover(force = false) {
    if (!force && formHasContent()) {
        const confirmed = window.confirm('Hay datos sin guardar. Quieres cerrar?');
        if (!confirmed) return;
    }
    popover.hidden = true;
    if (processLauncherBridge) processLauncherBridge.hidden = true;
    hideInlinePanels();
    resetFormState();
}

function toggleProcessLauncher(forceOpen) {
    if (!processLauncherBridge || !processLauncherButton) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : processLauncherBridge.hidden;
    processLauncherBridge.hidden = !willOpen;
    processLauncherButton.setAttribute('aria-expanded', String(willOpen));
}

async function toggleAudioRecording() {
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.readAsDataURL(blob);
        });
        pendingAttachments.push({
            kind: 'audio',
            fileName,
            mimeType: blob.type || 'audio/webm',
            fileExt: 'webm',
            contentBase64: String(dataUrl).split(',').pop() || '',
            previewUrl: URL.createObjectURL(blob),
            label: 'Audio grabado'
        });
        stream.getTracks().forEach((track) => track.stop());
        isRecording = false;
        audioRecordButton.dataset.recording = 'false';
        audioRecordIndicator.hidden = true;
        applyConfiguredIcons();
        renderAttachments();
    };
    mediaRecorder.start();
    isRecording = true;
    audioRecordButton.dataset.recording = 'true';
    audioRecordIndicator.hidden = false;
    applyConfiguredIcons();
}

function bindEvents() {
    nuevaCotizacionButton?.addEventListener('click', openPopover);
    refreshQuotesButton?.addEventListener('click', () => loadQuotes().catch((error) => setStatus(error.message, 'error')));
    closeButton?.addEventListener('click', () => closePopover());
    popover?.addEventListener('click', (event) => {
        if (event.target?.dataset?.closeQuoteCreate === 'true') closePopover();
    });
    processLauncherButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleProcessLauncher();
    });
    quotesSearchInput?.addEventListener('input', () => renderQuotesTable(getFilteredQuotes()));
    rowsBody?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-open-quote]');
        if (!button) return;
        const code = button.dataset.openQuote;
        const route = `/cotizaciones/documento?codigo=${encodeURIComponent(code)}`;
        if (!openRouteInShell(route, `Cotizacion ${code}`)) {
            window.location.href = route;
        }
    });
    form?.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('.quote-request-toggle-chip input, .quote-request-shape-card input')) syncToggleChipState();
    });
    customerNameInput?.addEventListener('input', async () => {
        customerCodeInput.value = '';
        try {
            await searchPartners(normalizeText(customerNameInput.value));
        } catch (error) {
            if (customerLookupPanel) customerLookupPanel.hidden = true;
        }
    });
    customerNameInput?.addEventListener('focus', () => searchPartners(normalizeText(customerNameInput.value)).catch(() => {}));
    customerLookupResults?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-partner-code]');
        if (!button) return;
        applyPartnerSelection(button.dataset.partnerCode, button.dataset.partnerName);
    });
    materialInput?.addEventListener('focus', showMaterialSuggestions);
    materialInput?.addEventListener('input', showMaterialSuggestions);
    surfaceInput?.addEventListener('focus', showSurfaceSuggestions);
    surfaceInput?.addEventListener('input', showSurfaceSuggestions);
    materialSuggestions?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-value]');
        if (!button) return;
        materialInput.value = button.dataset.value || '';
        materialSuggestions.hidden = true;
    });
    surfaceSuggestions?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-value]');
        if (!button) return;
        surfaceInput.value = button.dataset.value || '';
        surfaceSuggestions.hidden = true;
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.quote-request-search-wrap') && customerLookupPanel) customerLookupPanel.hidden = true;
        if (!event.target.closest('[data-inline-suggestions]')) hideInlinePanels();
        if (!event.target.closest('#processLauncherPrimary')) toggleProcessLauncher(false);
    });
    attachmentsInput?.addEventListener('change', async () => {
        const files = [...(attachmentsInput.files || [])];
        for (const file of files) {
            pendingAttachments.push({
                kind: 'file',
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileExt: file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '',
                contentBase64: await readAsBase64(file),
                label: `${Math.round(file.size / 1024) || 1} KB`
            });
        }
        attachmentsInput.value = '';
        renderAttachments();
    });
    attachmentsPreview?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-attachment]');
        if (!button) return;
        pendingAttachments.splice(Number(button.dataset.removeAttachment), 1);
        renderAttachments();
    });
    audioRecordButton?.addEventListener('click', () => toggleAudioRecording().catch((error) => setStatus(error.message, 'error')));
    createButton?.addEventListener('click', () => submitQuoteRequest(false).catch((error) => setStatus(error.message, 'error')));
    advancedButton?.addEventListener('click', () => submitQuoteRequest(true).catch((error) => setStatus(error.message, 'error')));
    window.addEventListener('resize', () => {
        if (!popover.hidden && launcherWrap) setDefaultLauncherPosition();
    });
    window.addEventListener('beforeunload', (event) => {
        if (!formHasContent()) return;
        event.preventDefault();
        event.returnValue = '';
    });
}

async function init() {
    renderAttachments();
    bindEvents();
    syncToggleChipState();
    await Promise.all([loadConfig(), loadQuotes()]);
    if (new URLSearchParams(window.location.search).get('openModal') === '1') {
        openPopover();
    }
}

init().catch((error) => {
    console.error(error);
    setStatus(error.message || 'No fue posible inicializar cotizaciones.', 'error');
});
