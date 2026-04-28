const CONFIG_ENDPOINT = '/api/config/general';
const THREADS_ENDPOINT = '/api/notification-center/threads';
const SESSION_STORAGE_KEY = 'erp-user-session';

const companyLogo = document.getElementById('notificationsCompanyLogo');
const brandFallback = document.getElementById('notificationsBrandFallback');
const pageTitle = document.getElementById('notificationsPageTitle');
const refreshButton = document.getElementById('notificationsRefreshButton');
const searchInput = document.getElementById('notificationsSearchInput');
const threadList = document.getElementById('notificationsThreadList');
const detailTitle = document.getElementById('notificationsDetailTitle');
const detailSubtitle = document.getElementById('notificationsDetailSubtitle');
const detailMeta = document.getElementById('notificationsDetailMeta');
const statusBox = document.getElementById('notificationsStatus');
const messageList = document.getElementById('notificationsMessageList');
const composeBody = document.getElementById('notificationsComposeBody');
const attachmentInput = document.getElementById('notificationsAttachmentInput');
const attachmentButton = document.getElementById('notificationsAttachmentButton');
const attachmentName = document.getElementById('notificationsAttachmentName');
const sendButton = document.getElementById('notificationsSendButton');
const openDocumentButton = document.getElementById('notificationsOpenDocumentButton');

let currentConfig = null;
let notificationThreads = [];
let filteredNotificationThreads = [];
let selectedThreadCode = '';
let selectedThreadDetail = null;
let selectedThreadMessages = [];
let attachmentDraft = null;

function getThreadCustomerName(thread) {
    return String(thread?.customerName || thread?.snapshot?.customerName || '').trim();
}

function getThreadProductName(thread) {
    return String(thread?.productName || thread?.snapshot?.jobName || '').trim();
}

function getThreadProductSummary(thread) {
    return String(thread?.productSummary || thread?.snapshot?.productSummary || '').trim();
}

function getThreadSellerName(thread) {
    return String(thread?.sellerName || thread?.snapshot?.sellerName || '').trim();
}

function readSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (_) {
        return null;
    }
}

function sessionHeaders() {
    const session = readSession();
    if (!session) return {};
    const compactSession = {
        username: session.username || '',
        name: session.name || '',
        permissionName: session.permissionName || ''
    };
    return { 'x-erp-session': JSON.stringify(compactSession) };
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

function buildBdfgContext() {
    if (!selectedThreadDetail) return null;
    const quoteCode = String(selectedThreadDetail.quoteCode || '').trim();
    return {
        kind: 'notification-thread',
        title: getThreadProductName(selectedThreadDetail) || getThreadCustomerName(selectedThreadDetail) || selectedThreadDetail.documentCode || 'Notificación',
        subtitle: [selectedThreadDetail.documentCode, selectedThreadDetail.lineCode, getThreadCustomerName(selectedThreadDetail)].filter(Boolean).join(' · ') || 'Conversación interna',
        documentRoute: quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}` : '',
        documentLabel: quoteCode ? `Cotización ${quoteCode}` : 'Documento',
        quoteCode,
        lineCode: String(selectedThreadDetail.lineCode || '').trim(),
        status: '',
        dates: {
            createdAt: selectedThreadDetail.createdAt || '',
            updatedAt: selectedThreadDetail.updatedAt || '',
            sentToProductionAt: selectedThreadDetail.lastMessageAt || ''
        }
    };
}

function publishBdfgContext() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-bdfg-context', context: buildBdfgContext() }, window.location.origin);
}

if (isShellEmbedded()) {
    document.body.classList.add('shell-embedded');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toLocaleString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatAttachmentSize(sizeBytes) {
    const size = Number(sizeBytes || 0);
    if (!Number.isFinite(size) || size <= 0) return 'Archivo';
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
}

function currentSessionIdentity() {
    const session = readSession();
    return {
        username: String(session?.username || '').trim().toLowerCase(),
        name: String(session?.name || '').trim().toLowerCase(),
        email: String(session?.email || '').trim().toLowerCase()
    };
}

function isOwnMessage(message) {
    const identity = currentSessionIdentity();
    const senderName = String(message?.senderName || '').trim().toLowerCase();
    const senderEmail = String(message?.senderEmail || '').trim().toLowerCase();
    return Boolean(
        (identity.name && senderName && identity.name === senderName)
        || (identity.email && senderEmail && identity.email === senderEmail)
        || (identity.username && senderName && identity.username === senderName)
    );
}

function setStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.textContent = message || '';
    statusBox.classList.toggle('is-error', Boolean(isError));
}

function applyBranding(config) {
    currentConfig = config || null;
    const branding = config?.branding || {};
    const general = config?.general || {};
    const companyName = String(branding.companyName || general.companyName || 'PrintLab').trim() || 'PrintLab';
    const logoUrl = String(branding.companyLogoUrl || branding.logoUrl || '').trim();
    if (pageTitle) pageTitle.textContent = 'Notificaciones';
    if (brandFallback) {
        brandFallback.textContent = companyName;
        brandFallback.hidden = Boolean(logoUrl);
    }
    if (companyLogo) {
        companyLogo.src = logoUrl || '';
        companyLogo.hidden = !logoUrl;
    }
}

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('No fue posible cargar la configuración.');
        applyBranding(await response.json());
    } catch (_) {
        applyBranding(null);
    }
}

function getThreadSearchText(thread) {
    return [
        thread?.threadCode,
        thread?.documentCode,
        thread?.quoteCode,
        thread?.lineCode,
        getThreadCustomerName(thread),
        getThreadProductName(thread),
        getThreadProductSummary(thread),
        getThreadSellerName(thread),
        thread?.targetUserName,
        thread?.lastMessagePreview
    ].filter(Boolean).join(' ').toLowerCase();
}

function applyThreadFilter() {
    const query = String(searchInput?.value || '').trim().toLowerCase();
    filteredNotificationThreads = notificationThreads.filter((thread) => !query || getThreadSearchText(thread).includes(query));
    renderThreadList();
}

function renderThreadList() {
    if (!threadList) return;
    if (!filteredNotificationThreads.length) {
        threadList.innerHTML = `
            <div class="notifications-empty">
                <strong class="notifications-empty-strong">No hay conversaciones disponibles.</strong>
                <span>No se encontraron hilos con el filtro actual.</span>
            </div>
        `;
        return;
    }
    threadList.innerHTML = filteredNotificationThreads.map((thread) => `
        <button type="button" class="notifications-thread-row${thread.threadCode === selectedThreadCode ? ' is-selected' : ''}" data-thread-code="${escapeHtml(thread.threadCode)}">
            <div class="notifications-thread-head">
                <div class="notifications-thread-main">
                    <span class="notifications-thread-title">${escapeHtml(getThreadCustomerName(thread) || getThreadProductName(thread) || thread.documentCode || 'Conversación')}</span>
                    <span class="notifications-thread-subline">${escapeHtml([thread.documentCode, thread.lineCode, getThreadProductName(thread)].filter(Boolean).join(' · ') || 'Sin detalle')}</span>
                </div>
                ${thread.unreadCount ? `<span class="notifications-unread">${thread.unreadCount}</span>` : ''}
            </div>
            <span class="notifications-thread-preview">${escapeHtml(thread.lastMessagePreview || getThreadProductSummary(thread) || 'Sin mensajes todavía.')}</span>
            <span class="notifications-thread-subline">${escapeHtml(thread.updatedAt ? `Actualizado: ${formatDateTime(thread.updatedAt)}` : `Creado: ${formatDateTime(thread.createdAt)}`)}</span>
        </button>
    `).join('');
}

function renderThreadMeta(thread) {
    if (!detailMeta) return;
    const chips = [
        thread?.documentCode ? `Documento: ${thread.documentCode}` : '',
        thread?.lineCode ? `Línea: ${thread.lineCode}` : '',
        getThreadSellerName(thread) ? `Vendedor: ${getThreadSellerName(thread)}` : '',
        thread?.targetUserName ? `Destino: ${thread.targetUserName}` : '',
        getThreadCustomerName(thread) ? `Cliente: ${getThreadCustomerName(thread)}` : '',
        getThreadProductSummary(thread) ? getThreadProductSummary(thread) : '',
        thread?.updatedAt ? `Actualizado: ${formatDateTime(thread.updatedAt)}` : ''
    ].filter(Boolean);
    detailMeta.innerHTML = chips.map((item) => `<span class="notifications-meta-chip">${escapeHtml(item)}</span>`).join('');
}

function buildAttachmentHref(attachment) {
    const mimeType = String(attachment?.mimeType || 'application/octet-stream').trim() || 'application/octet-stream';
    const contentBase64 = String(attachment?.contentBase64 || '').trim();
    return contentBase64 ? `data:${mimeType};base64,${contentBase64}` : '#';
}

function renderMessageList() {
    if (!messageList) return;
    if (!selectedThreadDetail) {
        messageList.innerHTML = `
            <div class="notifications-empty">
                <strong class="notifications-empty-strong">Todavía no hay una conversación seleccionada.</strong>
                <span>Selecciona un hilo del listado para ver sus mensajes y responder.</span>
            </div>
        `;
        return;
    }
    if (!selectedThreadMessages.length) {
        messageList.innerHTML = `
            <div class="notifications-empty">
                <strong class="notifications-empty-strong">Esta conversación aún no tiene mensajes.</strong>
                <span>Puedes enviar el primer mensaje desde el panel inferior.</span>
            </div>
        `;
        return;
    }
    messageList.innerHTML = selectedThreadMessages.map((message) => {
        const own = isOwnMessage(message);
        const attachments = Array.isArray(message.attachments) ? message.attachments : [];
        return `
            <article class="notifications-message${own ? ' is-own' : ''}">
                <div class="notifications-message-head">
                    <span class="notifications-message-author">${escapeHtml(message.senderName || 'Usuario')}</span>
                    <span class="notifications-message-time">${escapeHtml(formatDateTime(message.sentAt))}</span>
                </div>
                <div class="notifications-message-body">${escapeHtml(message.bodyText || '') || '<span class="notifications-message-empty">Adjunto sin texto.</span>'}</div>
                ${attachments.length ? `
                    <div class="notifications-message-attachments">
                        ${attachments.map((attachment) => `
                            <a class="notifications-message-attachment" href="${escapeHtml(buildAttachmentHref(attachment))}" download="${escapeHtml(attachment.fileName || 'adjunto')}">
                                <span>${escapeHtml(attachment.fileName || 'Adjunto')}</span>
                                <span class="notifications-attachment-name">${escapeHtml(formatAttachmentSize(attachment.sizeBytes))}</span>
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            </article>
        `;
    }).join('');
    messageList.scrollTop = messageList.scrollHeight;
}

function renderThreadDetail() {
    const thread = selectedThreadDetail;
    if (!thread) {
        if (detailTitle) detailTitle.textContent = 'Selecciona una conversación';
        if (detailSubtitle) detailSubtitle.textContent = 'Aquí verás el contexto completo del documento y los mensajes intercambiados.';
        if (openDocumentButton) openDocumentButton.hidden = true;
        renderThreadMeta(null);
        renderMessageList();
        publishBdfgContext();
        return;
    }
    if (detailTitle) {
        detailTitle.textContent = getThreadProductName(thread) || getThreadCustomerName(thread) || thread.documentCode || 'Conversación';
    }
    if (detailSubtitle) {
        detailSubtitle.textContent = [thread.documentCode, thread.lineCode, getThreadCustomerName(thread)].filter(Boolean).join(' · ') || 'Conversación interna';
    }
    if (openDocumentButton) {
        openDocumentButton.hidden = !thread.quoteCode;
    }
    renderThreadMeta(thread);
    renderMessageList();
    publishBdfgContext();
}

async function loadThreads(options = {}) {
    const preserveSelection = options.preserveSelection !== false;
    const response = await fetch(THREADS_ENDPOINT, { headers: sessionHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible cargar las conversaciones.');
    notificationThreads = Array.isArray(payload.items) ? payload.items : [];
    if (!preserveSelection || !notificationThreads.some((item) => item.threadCode === selectedThreadCode)) {
        selectedThreadCode = notificationThreads[0]?.threadCode || '';
    }
    applyThreadFilter();
    if (selectedThreadCode) {
        await loadThread(selectedThreadCode, { silentStatus: true });
    } else {
        selectedThreadDetail = null;
        selectedThreadMessages = [];
        renderThreadDetail();
    }
}

async function loadThread(threadCode, options = {}) {
    if (!threadCode) {
        selectedThreadCode = '';
        selectedThreadDetail = null;
        selectedThreadMessages = [];
        renderThreadDetail();
        return;
    }
    selectedThreadCode = threadCode;
    renderThreadList();
    const headers = sessionHeaders();
    const [detailResponse, messagesResponse] = await Promise.all([
        fetch(`${THREADS_ENDPOINT}/${encodeURIComponent(threadCode)}`, { headers }),
        fetch(`${THREADS_ENDPOINT}/${encodeURIComponent(threadCode)}/messages`, { headers })
    ]);
    const detailPayload = await detailResponse.json().catch(() => ({}));
    const messagesPayload = await messagesResponse.json().catch(() => ({}));
    if (!detailResponse.ok) throw new Error(detailPayload.error || 'No fue posible cargar el detalle de la conversación.');
    if (!messagesResponse.ok) throw new Error(messagesPayload.error || 'No fue posible cargar los mensajes.');
    selectedThreadDetail = detailPayload?.thread || (detailPayload?.id ? detailPayload : null);
    selectedThreadMessages = Array.isArray(messagesPayload.items) ? messagesPayload.items : [];
    renderThreadDetail();
    if (!options.silentStatus) {
        setStatus('Conversación cargada correctamente.');
    }
}

function resetAttachmentDraft() {
    attachmentDraft = null;
    if (attachmentInput) attachmentInput.value = '';
    if (attachmentName) {
        attachmentName.hidden = true;
        attachmentName.textContent = '';
    }
}

async function readAttachmentDraft(file) {
    if (!file) {
        resetAttachmentDraft();
        return;
    }
    const buffer = await file.arrayBuffer();
    const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const parts = String(file.name || '').split('.');
    attachmentDraft = {
        fileName: String(file.name || 'adjunto'),
        mimeType: String(file.type || 'application/octet-stream'),
        fileExt: parts.length > 1 ? parts.pop().toLowerCase() : '',
        sizeBytes: Number(file.size || 0),
        contentBase64
    };
    if (attachmentName) {
        attachmentName.hidden = false;
        attachmentName.textContent = `${attachmentDraft.fileName} · ${formatAttachmentSize(attachmentDraft.sizeBytes)}`;
    }
}

async function sendMessage() {
    if (!selectedThreadCode || !selectedThreadDetail) {
        throw new Error('Debes seleccionar una conversación antes de responder.');
    }
    const bodyText = String(composeBody?.value || '').trim();
    if (!bodyText && !attachmentDraft) {
        throw new Error('Escribe un mensaje o adjunta un archivo antes de enviar.');
    }
    sendButton.disabled = true;
    const response = await fetch(`${THREADS_ENDPOINT}/${encodeURIComponent(selectedThreadCode)}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...sessionHeaders()
        },
        body: JSON.stringify({
            bodyText,
            attachments: attachmentDraft ? [attachmentDraft] : []
        })
    });
    const payload = await response.json().catch(() => ({}));
    sendButton.disabled = false;
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible enviar el mensaje.');
    }
    if (composeBody) composeBody.value = '';
    resetAttachmentDraft();
    await loadThreads({ preserveSelection: true });
    setStatus('Mensaje enviado correctamente.');
}

function openSelectedDocument() {
    const quoteCode = selectedThreadDetail?.quoteCode;
    if (!quoteCode) return;
    const route = `/cotizaciones/documento?codigo=${encodeURIComponent(quoteCode)}`;
    if (!openRouteInShell(route, `Cotización ${quoteCode}`)) {
        window.location.href = route;
    }
}

function bindEvents() {
    refreshButton?.addEventListener('click', async () => {
        try {
            setStatus('Actualizando conversaciones...');
            await loadThreads({ preserveSelection: true });
            setStatus('Conversaciones actualizadas.');
        } catch (error) {
            setStatus(error.message || 'No fue posible actualizar las conversaciones.', true);
        }
    });

    searchInput?.addEventListener('input', () => {
        applyThreadFilter();
    });

    threadList?.addEventListener('click', async (event) => {
        const row = event.target.closest('[data-thread-code]');
        if (!row) return;
        try {
            setStatus('Cargando conversación...');
            await loadThread(row.dataset.threadCode || '');
        } catch (error) {
            setStatus(error.message || 'No fue posible cargar la conversación.', true);
        }
    });

    attachmentButton?.addEventListener('click', () => {
        attachmentInput?.click();
    });

    attachmentInput?.addEventListener('change', async (event) => {
        try {
            await readAttachmentDraft(event.target.files?.[0] || null);
            if (attachmentDraft) setStatus('Adjunto listo para enviar.');
        } catch (error) {
            resetAttachmentDraft();
            setStatus(error.message || 'No fue posible preparar el adjunto.', true);
        }
    });

    sendButton?.addEventListener('click', async () => {
        try {
            await sendMessage();
        } catch (error) {
            setStatus(error.message || 'No fue posible enviar el mensaje.', true);
        }
    });

    openDocumentButton?.addEventListener('click', openSelectedDocument);
}

async function init() {
    const session = readSession();
    if (!session?.username) {
        window.location.replace('/login');
        return;
    }
    bindEvents();
    await loadConfig();
    try {
        setStatus('Cargando conversaciones...');
        await loadThreads({ preserveSelection: false });
        setStatus(notificationThreads.length ? 'Conversaciones cargadas.' : 'Todavía no hay conversaciones registradas.');
    } catch (error) {
        setStatus(error.message || 'No fue posible cargar el centro de notificaciones.', true);
        threadList.innerHTML = `
            <div class="notifications-empty">
                <strong class="notifications-empty-strong">No fue posible cargar las conversaciones.</strong>
                <span>${escapeHtml(error.message || 'Intenta de nuevo en un momento.')}</span>
            </div>
        `;
    }
}

init().catch((error) => {
    setStatus(error.message || 'No fue posible iniciar la pantalla de notificaciones.', true);
});
