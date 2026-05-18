(function () {
    const THREADS_ENDPOINT = '/api/notification-center/threads?limit=80';
    const THREAD_ENDPOINT = '/api/notification-center/threads';
    const DIRECT_THREAD_ENDPOINT = '/api/notification-center/direct-thread';
    const POSITION_KEY = 'erp-notification-chat-position';
    const MAX_ATTACHMENTS = 10;

    function esc(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function initials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return (parts.length ? parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') : 'N');
    }

    function colorForName(name) {
        const palette = [
            ['#E6F1FB', '#0C447C'],
            ['#FBEAF0', '#72243E'],
            ['#FAEEDA', '#633806'],
            ['#E1F5EE', '#085041'],
            ['#EEEAFE', '#49308A']
        ];
        const total = Array.from(String(name || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return palette[total % palette.length];
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value || '');
        return date.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function normalizeText(value) {
        return String(value || '').trim().toLowerCase();
    }

    function threadType(thread) {
        if (thread?.sourceModule === 'ordenes' || /^prod/i.test(String(thread?.documentCode || ''))) return 'prod';
        if (thread?.quoteCode || /^cot/i.test(String(thread?.documentCode || ''))) return 'cot';
        return 'gen';
    }

    function documentRoute(thread) {
        if (thread?.quoteCode) return `/cotizaciones/documento?codigo=${encodeURIComponent(thread.quoteCode)}`;
        if (/^prod/i.test(String(thread?.documentCode || ''))) return `/produccion/orden?codigo=${encodeURIComponent(thread.documentCode)}`;
        return '';
    }

    function chooseContactName(thread, session) {
        const current = [session?.name, session?.username].map(normalizeText).filter(Boolean);
        const candidates = [thread?.sellerName, thread?.targetUserName, thread?.createdByName]
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        return candidates.find((item) => !current.includes(normalizeText(item))) || candidates[0] || 'Notificación';
    }

    function threadLabel(thread) {
        return [thread?.documentCode || thread?.quoteCode, thread?.customerName || thread?.productName]
            .filter(Boolean)
            .join(' · ') || 'Chat general';
    }

    function fileExt(name) {
        const parts = String(name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function attachmentHref(attachment) {
        if (attachment?.downloadUrl) return String(attachment.downloadUrl);
        const mimeType = String(attachment?.mimeType || 'application/octet-stream').trim() || 'application/octet-stream';
        const contentBase64 = String(attachment?.contentBase64 || '').trim();
        return contentBase64 ? `data:${mimeType};base64,${contentBase64}` : '#';
    }

    function attachmentKey(attachment) {
        return String(attachment?.id || attachment?.downloadUrl || attachment?.fileName || '').trim();
    }

    function formatSize(size) {
        const bytes = Number(size || 0);
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    class NotificationChatWidget {
        constructor(options = {}) {
            this.session = options.session || {};
            this.headers = typeof options.headers === 'function' ? options.headers : () => ({});
            this.openRoute = typeof options.openRoute === 'function' ? options.openRoute : null;
            this.onUnreadChange = typeof options.onUnreadChange === 'function' ? options.onUnreadChange : null;
            this.onChanged = typeof options.onChanged === 'function' ? options.onChanged : null;
            this.openCenter = typeof options.openCenter === 'function' ? options.openCenter : null;
            this.icons = options.icons || {};
            this.container = options.container || null;
            this.embedded = Boolean(options.embedded);
            this.showOpenCenter = options.showOpenCenter !== false;
            this.showClose = options.showClose !== false;
            this.draggable = options.draggable !== false && !this.embedded;
            this.allowMinimize = options.allowMinimize !== false && !this.embedded;
            this.threads = [];
            this.contacts = [];
            this.messages = [];
            this.activeContactId = '';
            this.activeThreadCode = '';
            this.expandedContacts = new Set();
            this.searchTerm = '';
            this.minimized = false;
            this.attachmentDrafts = [];
            this.attachmentObjectUrls = new Map();
            this.attachmentLoading = new Set();
            this.isReadingAttachments = false;
            this.isSending = false;
            this.composeStatus = '';
            this.composeError = '';
            this.revealedThreadCode = '';
            this.docSwipe = null;
            this.suppressDocClick = false;
            this.isDeletingThread = false;
            this.drag = null;
            this.root = null;
        }

        async open() {
            this.ensureRoot();
            this.root.hidden = false;
            if (!this.embedded) this.applySavedPosition();
            await this.loadThreads();
            const contact = this.activeContact();
            const thread = this.generalThread(contact);
            if (!this.activeThreadCode && thread?.threadCode) {
                await this.openThread(thread.threadCode);
                return;
            }
            this.render();
        }

        close() {
            if (this.root) this.root.hidden = true;
        }

        ensureRoot() {
            if (this.root) return;
            this.root = document.createElement('section');
            this.root.className = 'notification-chat-window';
            if (this.embedded) this.root.classList.add('is-embedded');
            this.root.hidden = true;
            const centerButton = this.showOpenCenter ? `<button type="button" class="notification-chat-open-center" data-ncw-open-center title="Abrir centro" aria-label="Abrir centro de notificaciones" style="${this.iconStyle('openCenter')}">${this.renderIcon('openCenter')}</button>` : '';
            const closeButton = this.showClose ? '<button type="button" class="notification-chat-close" data-ncw-close aria-label="Cerrar">×</button>' : '';
            this.root.innerHTML = `<div class="notification-chat-dragbar" data-ncw-drag><strong style="${this.iconStyle('title')}">${this.renderIcon('title')}<span>Notificaciones</span></strong><span class="notification-chat-window-actions">${centerButton}${closeButton}</span></div><div class="notification-chat-body" data-ncw-body></div>`;
            (this.container || document.body).appendChild(this.root);
            this.root.addEventListener('click', (event) => this.handleClick(event));
            this.root.addEventListener('input', (event) => this.handleInput(event));
            this.root.addEventListener('change', (event) => this.handleChange(event));
            this.root.addEventListener('submit', (event) => this.handleSubmit(event));
            this.root.addEventListener('pointerdown', (event) => this.startDocSwipe(event));
            if (this.allowMinimize) this.root.querySelector('[data-ncw-drag]')?.addEventListener('dblclick', () => this.toggleMinimized());
            if (this.draggable) this.root.querySelector('[data-ncw-drag]')?.addEventListener('pointerdown', (event) => this.startDrag(event));
            window.addEventListener('pointermove', (event) => this.moveDrag(event));
            window.addEventListener('pointermove', (event) => this.moveDocSwipe(event));
            window.addEventListener('pointerup', () => this.endDrag());
            window.addEventListener('pointerup', () => this.endDocSwipe());
        }

        renderIcon(key, forcedSize = null) {
            const icon = this.icons?.[key] || {};
            const value = String(icon.value || (key === 'attach' ? '📎' : key === 'send' ? '➤' : key === 'delete' ? '🗑' : '✉')).trim();
            const size = Number(forcedSize || icon.size || 16);
            const color = icon.color || 'currentColor';
            if (value.startsWith('data:image')) return `<img class="nc-config-icon" src="${esc(value)}" alt="" style="width:var(--nc-icon-size, ${size}px);height:var(--nc-icon-size, ${size}px);">`;
            if (value.startsWith('http') || value.startsWith('/')) return `<span class="nc-config-icon icon-svg-mask" style="-webkit-mask-image:url('${esc(value)}');mask-image:url('${esc(value)}');width:var(--nc-icon-size, ${size}px);height:var(--nc-icon-size, ${size}px);background:var(--nc-icon-color, ${esc(color)});"></span>`;
            return `<span class="nc-config-icon" style="font-size:var(--nc-icon-size, ${size}px);color:var(--nc-icon-color, ${esc(color)});">${esc(value)}</span>`;
        }

        iconStyle(key, forcedSize = null) {
            const icon = this.icons?.[key] || {};
            const color = icon.color || 'currentColor';
            const hover = icon.hoverColor || icon.hover || color;
            const size = Number(forcedSize || icon.size || 16) || 16;
            return `--nc-icon-color:${esc(color)};--nc-icon-hover-color:${esc(hover)};--nc-icon-size:${size}px;`;
        }

        toggleMinimized() {
            this.minimized = !this.minimized;
            this.root?.classList.toggle('is-minimized', this.minimized);
        }

        applySavedPosition() {
            try {
                const raw = localStorage.getItem(`${POSITION_KEY}:${this.session?.username || 'anon'}`);
                const saved = raw ? JSON.parse(raw) : null;
                if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
                    this.root.style.left = `${Math.max(8, Number(saved.x))}px`;
                    this.root.style.top = `${Math.max(8, Number(saved.y))}px`;
                    this.root.style.right = 'auto';
                    return;
                }
            } catch (error) {
                return;
            }
            this.root.style.left = 'auto';
            this.root.style.right = '28px';
            this.root.style.top = '92px';
        }

        savePosition() {
            if (!this.root || this.embedded) return;
            const rect = this.root.getBoundingClientRect();
            localStorage.setItem(`${POSITION_KEY}:${this.session?.username || 'anon'}`, JSON.stringify({ x: rect.left, y: rect.top }));
        }

        startDrag(event) {
            if (!this.draggable) return;
            if (event.target.closest('button')) return;
            const rect = this.root.getBoundingClientRect();
            this.drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
            this.root.classList.add('is-dragging');
            event.preventDefault();
        }

        moveDrag(event) {
            if (!this.drag || !this.root) return;
            const maxX = Math.max(8, window.innerWidth - this.root.offsetWidth - 8);
            const maxY = Math.max(8, window.innerHeight - this.root.offsetHeight - 8);
            this.root.style.left = `${Math.min(Math.max(8, event.clientX - this.drag.dx), maxX)}px`;
            this.root.style.top = `${Math.min(Math.max(8, event.clientY - this.drag.dy), maxY)}px`;
            this.root.style.right = 'auto';
        }

        endDrag() {
            if (!this.drag) return;
            this.drag = null;
            this.root?.classList.remove('is-dragging');
            this.savePosition();
        }

        startDocSwipe(event) {
            if (event.button !== 0) return;
            const shell = event.target.closest('[data-ncw-swipe]');
            if (!shell || event.target.closest('[data-ncw-delete-thread]')) return;
            const item = shell.querySelector('.nc-doc-item');
            const code = shell.dataset.ncwSwipe || '';
            if (!item || !code) return;
            this.docSwipe = {
                code,
                item,
                startX: event.clientX,
                base: this.revealedThreadCode === code ? -52 : 0,
                offset: this.revealedThreadCode === code ? -52 : 0,
                moved: false
            };
            item.classList.add('is-swiping');
        }

        moveDocSwipe(event) {
            if (!this.docSwipe?.item) return;
            const delta = event.clientX - this.docSwipe.startX;
            if (!this.docSwipe.moved && Math.abs(delta) < 14) return;
            const offset = Math.min(0, Math.max(-58, this.docSwipe.base + delta));
            this.docSwipe.moved = true;
            this.docSwipe.offset = offset;
            this.docSwipe.item.style.transform = `translateX(${offset}px)`;
        }

        endDocSwipe() {
            if (!this.docSwipe?.item) return;
            if (!this.docSwipe.moved) {
                this.docSwipe.item.classList.remove('is-swiping');
                this.docSwipe = null;
                return;
            }
            const finalOffset = this.docSwipe.offset <= -28 ? -52 : 0;
            this.revealedThreadCode = finalOffset ? this.docSwipe.code : '';
            this.docSwipe.item.classList.remove('is-swiping');
            this.docSwipe.item.style.transform = finalOffset ? 'translateX(-52px)' : '';
            this.suppressDocClick = true;
            setTimeout(() => {
                this.suppressDocClick = false;
            }, 0);
            this.docSwipe = null;
        }

        async loadThreads() {
            const response = await fetch(THREADS_ENDPOINT, { headers: this.headers() });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible cargar mensajes.');
            this.threads = Array.isArray(payload.items) ? payload.items : [];
            this.contacts = this.groupContacts();
            const unread = this.threads.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
            this.onUnreadChange?.(unread);
            if (!this.activeContactId && this.contacts[0]) this.activeContactId = this.contacts[0].id;
        }

        groupContacts() {
            const map = new Map();
            this.threads.forEach((thread) => {
                const name = chooseContactName(thread, this.session);
                const key = normalizeText(name) || 'notificacion';
                if (!map.has(key)) {
                    const [bg, fg] = colorForName(name);
                    map.set(key, { id: key, name, role: thread.targetUserName || thread.sellerName || '', bg, fg, threads: [] });
                }
                map.get(key).threads.push(thread);
            });
            return [...map.values()].map((contact) => ({
                ...contact,
                threads: contact.threads.sort((a, b) => new Date(b.updatedAt || b.lastMessageAt || b.createdAt || 0) - new Date(a.updatedAt || a.lastMessageAt || a.createdAt || 0))
            }));
        }

        activeContact() {
            return this.contacts.find((contact) => contact.id === this.activeContactId) || null;
        }

        activeThread() {
            return this.threads.find((thread) => thread.threadCode === this.activeThreadCode) || null;
        }

        generalThread(contact) {
            if (!contact) return null;
            return contact.threads.find((thread) => threadType(thread) === 'gen' || thread.conversationType === 'directa') || null;
        }

        async ensureDirectThread(contact) {
            const existing = this.generalThread(contact);
            if (existing) return existing;
            const response = await fetch(DIRECT_THREAD_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.headers() },
                body: JSON.stringify({ targetName: contact?.name || contact?.id })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible crear la conversación.');
            const thread = payload.thread || payload;
            if (thread?.threadCode) {
                this.threads = [thread, ...this.threads.filter((item) => item.threadCode !== thread.threadCode)];
                this.contacts = this.groupContacts();
            }
            return thread;
        }

        async openGeneralThread(contactId) {
            const contact = this.contacts.find((item) => item.id === contactId);
            if (!contact) return;
            this.activeContactId = contactId;
            const thread = await this.ensureDirectThread(contact);
            if (thread?.threadCode) {
                await this.openThread(thread.threadCode);
            } else {
                this.activeThreadCode = '';
                this.messages = [];
                this.render();
            }
        }

        render() {
            const body = this.root?.querySelector('[data-ncw-body]');
            if (!body) return;
            body.innerHTML = `<div class="nc">
                <div class="nc-left">
                    <div class="nc-left-head">
                        <h3>Notificaciones</h3>
                        <div class="nc-search-wrap"><i class="ti ti-search" aria-hidden="true"></i><input class="nc-search-inp" data-ncw-search type="text" placeholder="Buscar persona..." value="${esc(this.searchTerm)}"></div>
                    </div>
                    <div class="nc-contact-list">${this.renderContacts()}</div>
                </div>
                <div class="nc-right">${this.renderConversation()}</div>
            </div>`;
            const messages = body.querySelector('.nc-messages');
            if (messages) messages.scrollTop = messages.scrollHeight;
            this.hydrateAttachmentUrls().catch(() => {});
        }

        renderContacts() {
            const unreadBadge = (value, className) => {
                const numeric = Number(value || 0);
                if (numeric <= 0) return '';
                return numeric > 9
                    ? `<span class="${className} is-dot" aria-label="${esc(numeric)} sin leer"></span>`
                    : `<span class="${className}">${esc(numeric)}</span>`;
            };
            const query = normalizeText(this.searchTerm);
            const contacts = this.contacts.filter((contact) => !query
                || normalizeText(contact.name).includes(query)
                || contact.threads.some((thread) => normalizeText(threadLabel(thread)).includes(query)));
            if (!contacts.length) return '<div class="nc-empty"><i class="ti ti-message-2" aria-hidden="true"></i><p>No hay conversaciones.</p></div>';
            return contacts.map((contact) => {
                const open = contact.id === this.activeContactId && this.expandedContacts.has(contact.id);
                const unread = contact.threads.reduce((sum, thread) => sum + Number(thread.unreadCount || 0), 0);
                const latest = contact.threads[0] || {};
                const docs = contact.threads.filter((thread) => thread !== this.generalThread(contact)).map((thread) => {
                    const type = threadType(thread);
                    const icon = type === 'cot' ? 'ti-file-invoice' : type === 'prod' ? 'ti-assembly' : 'ti-message-circle';
                    const revealed = this.revealedThreadCode === thread.threadCode;
                    return `<div class="nc-doc-swipe${revealed ? ' is-revealed' : ''}" data-ncw-swipe="${esc(thread.threadCode)}">
                        <div class="nc-doc-swipe-actions"><button type="button" class="nc-doc-delete-btn" data-ncw-delete-thread="${esc(thread.threadCode)}" title="Eliminar conversación" aria-label="Eliminar conversación">${this.renderIcon('delete', 16)}</button></div>
                        <button type="button" class="nc-doc-item${thread.threadCode === this.activeThreadCode ? ' active-doc' : ''}" data-ncw-thread="${esc(thread.threadCode)}"${revealed ? ' style="transform:translateX(-52px)"' : ''}>
                            <span class="nc-doc-icon ${type}"><i class="ti ${icon}" aria-hidden="true"></i></span>
                            <span class="nc-doc-body">
                                <span class="nc-doc-label"><span>${esc(threadLabel(thread))}</span>${unreadBadge(thread.unreadCount, 'nc-doc-unread')}</span>
                                <span class="nc-doc-preview">${esc(thread.lastMessagePreview || 'Sin mensajes recientes')}</span>
                            </span>
                        </button>
                    </div>`;
                }).join('');
                return `<div class="nc-contact-block">
                    <button type="button" class="nc-contact-row${open ? ' active-contact' : ''}" data-ncw-contact="${esc(contact.id)}">
                        <span class="nc-avatar" style="background:${esc(contact.bg)};color:${esc(contact.fg)};">${esc(initials(contact.name))}</span>
                        <span class="nc-contact-info">
                            <span class="nc-contact-name"><span>${esc(contact.name)}</span><span class="nc-contact-meta">${unreadBadge(unread, 'nc-badge')}<span class="nc-contact-time">${esc(formatDate(latest.updatedAt || latest.lastMessageAt || latest.createdAt))}</span><i class="ti ti-chevron-down nc-chevron${open ? ' open' : ''}" aria-hidden="true"></i></span></span>
                            <span class="nc-contact-preview">${esc(open ? contact.role : (latest.lastMessagePreview || 'Sin mensajes'))}</span>
                        </span>
                    </button>
                    ${open && docs ? `<div class="nc-doc-list">${docs}</div>` : ''}
                </div>`;
            }).join('');
        }

        renderConversation() {
            const contact = this.activeContact();
            const thread = this.activeThread();
            if (!contact) {
                return '<div class="nc-empty"><i class="ti ti-message-2" aria-hidden="true"></i><p>No hay conversaciones.</p></div>';
            }
            if (!thread) {
                return this.renderEmptyContact(contact);
            }
            const route = documentRoute(thread);
            const documentText = thread.documentCode || thread.quoteCode || '';
            const customerText = thread.customerName || '';
            const productText = thread.productName || thread.productSummary || '';
            const documentLine = documentText || customerText
                ? `<span class="nc-chat-head-doc-line">${documentText ? `<span class="nc-chat-head-code">${esc(documentText)}</span>` : ''}${documentText && customerText ? '<span class="nc-chat-head-dot">·</span>' : ''}${customerText ? `<strong>${esc(customerText)}</strong>` : ''}</span>`
                : '';
            return `<div class="nc-chat-head">
                    <span class="nc-avatar" style="width:36px;height:36px;font-size:12px;background:${esc(contact.bg)};color:${esc(contact.fg)};">${esc(initials(contact.name))}</span>
                    <span class="nc-chat-head-info"><span class="nc-chat-head-name">${esc(contact.name)}</span><span class="nc-chat-head-sub">${esc(contact.role || 'Conversación')}</span>${documentLine || productText ? `<span class="nc-chat-head-doc">${documentLine}${productText ? `<em>${esc(productText)}</em>` : ''}</span>` : ''}</span>
                    <span class="nc-chat-head-actions">${route ? '<button type="button" class="nc-action-btn primary" data-ncw-open-doc><i class="ti ti-external-link" aria-hidden="true"></i>Abrir</button>' : ''}</span>
                </div>
                <div class="nc-messages">${this.renderMessages()}</div>
                ${this.renderAttachmentDrafts()}
                ${this.renderComposeStatus()}
                <form class="nc-compose" data-ncw-compose>
                    <input type="file" data-ncw-file hidden multiple>
                    <button type="button" class="nc-icon-btn" data-ncw-attach title="Adjuntar" aria-label="Adjuntar archivo" style="${this.iconStyle('attach')}"${this.isSending || this.isReadingAttachments ? ' disabled' : ''}>${this.renderIcon('attach')}</button>
                    <input class="nc-compose-inp" data-ncw-compose-input placeholder="Escribe un mensaje..."${this.isSending ? ' disabled' : ''}>
                    <button type="submit" class="nc-send-btn" aria-label="Enviar" style="${this.iconStyle('send')}"${this.isSending || this.isReadingAttachments ? ' disabled' : ''}>${this.isSending ? '<span class="nc-spinner" aria-hidden="true"></span>' : this.renderIcon('send')}</button>
                </form>`;
        }

        renderEmptyContact(contact) {
            return `<div class="nc-chat-head">
                <span class="nc-avatar" style="width:36px;height:36px;font-size:12px;background:${esc(contact.bg)};color:${esc(contact.fg)};">${esc(initials(contact.name))}</span>
                <span class="nc-chat-head-info"><span class="nc-chat-head-name">${esc(contact.name)}</span><span class="nc-chat-head-sub">${esc(contact.role || '')} · ${contact.threads.length} conversación${contact.threads.length === 1 ? '' : 'es'}</span></span>
            </div><div class="nc-empty"><i class="ti ti-layout-list" aria-hidden="true"></i><p>Selecciona una conversación del panel izquierdo</p></div>`;
        }

        renderMessages() {
            if (!this.messages.length) return '<div class="nc-empty"><i class="ti ti-message-2" aria-hidden="true"></i><p>No hay mensajes en este hilo.</p></div>';
            return this.messages.map((message) => {
                const own = this.isOwn(message);
                const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, MAX_ATTACHMENTS) : [];
                return `<div class="nc-msg-wrap${own ? ' own' : ''}">
                    ${message.bodyText ? `<div class="nc-bubble${own ? ' own' : ''}">${esc(message.bodyText)}</div>` : ''}
                    ${attachments.length ? `<div class="nc-attachment-list">${attachments.map((item) => this.renderAttachmentCard(item)).join('')}</div>` : ''}
                    <div class="nc-msg-meta">${own ? '' : `<span>${esc(message.senderName || 'Usuario')}</span><span>·</span>`}<span>${esc(formatDate(message.sentAt))}</span>${own ? '<i class="ti ti-checks" aria-hidden="true"></i>' : ''}${own && message.readAt ? `<span>Leído ${esc(formatDate(message.readAt))}</span>` : ''}</div>
                </div>`;
            }).join('');
        }

        renderAttachmentDrafts() {
            if (!this.attachmentDrafts.length) return '';
            return `<div class="nc-attachment-tray">${this.attachmentDrafts.map((item, index) => `${this.renderAttachmentCard(item)}<button type="button" class="nc-attachment-remove" data-ncw-remove-attachment="${index}" aria-label="Quitar adjunto">×</button>`).join('')}</div>`;
        }

        renderComposeStatus() {
            if (!this.composeStatus && !this.composeError) return '';
            const kind = this.composeError ? ' error' : '';
            const text = this.composeError || this.composeStatus;
            return `<div class="nc-compose-status${kind}">${this.isSending || this.isReadingAttachments ? '<span class="nc-spinner" aria-hidden="true"></span>' : ''}<span>${esc(text)}</span></div>`;
        }

        renderAttachmentCard(item) {
            const key = attachmentKey(item);
            const cachedHref = key ? this.attachmentObjectUrls.get(key) : '';
            const pendingDownload = Boolean(item.downloadUrl && !cachedHref && !item.contentBase64);
            const href = pendingDownload ? '#' : (cachedHref || attachmentHref(item));
            const isImage = String(item.mimeType || '').startsWith('image/');
            const canPreviewImage = isImage && href && href !== '#';
            return `<a class="nc-attachment-card${isImage ? ' is-image' : ''}" href="${esc(href)}" target="_blank" rel="noopener" download="${esc(item.fileName || 'adjunto')}">
                ${canPreviewImage ? `<img src="${esc(href)}" alt="${esc(item.fileName || 'Imagen')}">` : `<span class="nc-attachment-ext">${esc(isImage ? 'img' : (fileExt(item.fileName) || 'file'))}</span>`}
                <span><strong>${esc(item.fileName || 'Adjunto')}</strong><em>${esc(formatSize(item.sizeBytes))}</em></span>
            </a>`;
        }

        async hydrateAttachmentUrls() {
            const attachments = this.messages
                .flatMap((message) => Array.isArray(message.attachments) ? message.attachments : [])
                .filter((item) => item?.downloadUrl);
            let changed = false;
            await Promise.all(attachments.map(async (item) => {
                const key = attachmentKey(item);
                if (!key || this.attachmentObjectUrls.has(key) || this.attachmentLoading.has(key)) return;
                this.attachmentLoading.add(key);
                try {
                    const response = await fetch(item.downloadUrl, { headers: this.headers() });
                    if (!response.ok) return;
                    const sourceBlob = await response.blob();
                    if (!sourceBlob.size) return;
                    const blob = new Blob([sourceBlob], { type: item.mimeType || sourceBlob.type || 'application/octet-stream' });
                    this.attachmentObjectUrls.set(key, URL.createObjectURL(blob));
                    changed = true;
                } finally {
                    this.attachmentLoading.delete(key);
                }
            }));
            if (changed) this.render();
        }

        isOwn(message) {
            const sender = normalizeText(message?.senderName);
            return Boolean(sender && [this.session?.name, this.session?.username].map(normalizeText).includes(sender));
        }

        async openThread(threadCode) {
            const code = String(threadCode || '').trim();
            if (!code) return;
            this.activeThreadCode = code;
            this.attachmentDrafts = [];
            const response = await fetch(`${THREAD_ENDPOINT}/${encodeURIComponent(code)}/messages`, { headers: this.headers() });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible cargar la conversación.');
            this.messages = Array.isArray(payload.items) ? payload.items : [];
            this.threads = this.threads.map((thread) => thread.threadCode === code ? { ...thread, unreadCount: 0 } : thread);
            this.contacts = this.groupContacts();
            this.render();
            this.onChanged?.();
        }

        async sendMessage() {
            if (this.isSending || this.isReadingAttachments) return;
            const input = this.root?.querySelector('[data-ncw-compose-input]');
            const bodyText = String(input?.value || '').trim();
            const attachments = this.attachmentDrafts.slice(0, MAX_ATTACHMENTS);
            if ((!bodyText && !attachments.length) || !this.activeThreadCode) return;
            const threadCode = this.activeThreadCode;
            this.isSending = true;
            this.composeError = '';
            this.composeStatus = attachments.length ? 'Subiendo adjuntos...' : 'Enviando mensaje...';
            this.render();
            try {
                const response = await fetch(`${THREAD_ENDPOINT}/${encodeURIComponent(threadCode)}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...this.headers() },
                    body: JSON.stringify({ bodyText, attachments })
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(payload.error || 'No fue posible enviar el mensaje.');
                if (input) input.value = '';
                this.attachmentDrafts = [];
                this.composeStatus = 'Actualizando conversación...';
                this.render();
                await this.openThread(threadCode);
                await this.loadThreads();
                this.composeStatus = '';
                this.composeError = '';
                this.onChanged?.();
            } catch (error) {
                this.composeStatus = '';
                this.composeError = error.message || 'No fue posible enviar el mensaje.';
            } finally {
                this.isSending = false;
                this.render();
            }
        }

        async deleteThread(threadCode) {
            const code = String(threadCode || '').trim();
            if (!code || this.isDeletingThread) return;
            const thread = this.threads.find((item) => item.threadCode === code) || null;
            const accepted = window.confirm(`¿Deseas eliminar esta conversación${thread ? ` (${threadLabel(thread)})` : ''}?`);
            if (!accepted) return;
            this.isDeletingThread = true;
            this.composeError = '';
            this.composeStatus = 'Eliminando conversación...';
            this.revealedThreadCode = '';
            this.render();
            try {
                const response = await fetch(`${THREAD_ENDPOINT}/${encodeURIComponent(code)}`, {
                    method: 'DELETE',
                    headers: this.headers()
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(payload.error || 'No fue posible eliminar la conversación.');
                this.threads = this.threads.filter((item) => item.threadCode !== code);
                if (this.activeThreadCode === code) {
                    this.activeThreadCode = '';
                    this.messages = [];
                }
                await this.loadThreads();
                this.contacts = this.groupContacts();
                if (!this.contacts.some((contact) => contact.id === this.activeContactId)) {
                    this.activeContactId = this.contacts[0]?.id || '';
                }
                this.composeStatus = '';
                this.composeError = '';
                this.render();
                this.onChanged?.();
            } catch (error) {
                this.composeStatus = '';
                this.composeError = error.message || 'No fue posible eliminar la conversación.';
                this.render();
            } finally {
                this.isDeletingThread = false;
            }
        }

        async fileToAttachment(file) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(reader.error || new Error('No fue posible leer el archivo.'));
                reader.readAsDataURL(file);
            });
            return {
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                sizeBytes: file.size || 0,
                contentBase64: dataUrl.split(',')[1] || ''
            };
        }

        async addAttachments(files) {
            if (this.isSending || this.isReadingAttachments) return;
            const selected = Array.from(files || []).slice(0, Math.max(0, MAX_ATTACHMENTS - this.attachmentDrafts.length));
            if (!selected.length) return;
            this.isReadingAttachments = true;
            this.composeError = '';
            this.composeStatus = selected.length === 1 ? 'Preparando adjunto...' : 'Preparando adjuntos...';
            this.render();
            try {
                const next = await Promise.all(selected.map((file) => this.fileToAttachment(file)));
                this.attachmentDrafts = this.attachmentDrafts.concat(next).slice(0, MAX_ATTACHMENTS);
                this.composeStatus = next.length === 1 ? 'Adjunto listo para enviar.' : 'Adjuntos listos para enviar.';
            } catch (error) {
                this.composeStatus = '';
                this.composeError = error.message || 'No fue posible preparar el adjunto.';
            } finally {
                this.isReadingAttachments = false;
                this.render();
            }
        }

        handleClick(event) {
            if (event.target.closest('[data-ncw-close]')) {
                this.close();
                return;
            }
            if (event.target.closest('[data-ncw-open-center]')) {
                this.openCenter?.();
                return;
            }
            const deleteThreadButton = event.target.closest('[data-ncw-delete-thread]');
            if (deleteThreadButton) {
                this.deleteThread(deleteThreadButton.dataset.ncwDeleteThread || '').catch(() => {});
                return;
            }
            if (event.target.closest('[data-ncw-attach]')) {
                this.root?.querySelector('[data-ncw-file]')?.click();
                return;
            }
            const removeAttachment = event.target.closest('[data-ncw-remove-attachment]');
            if (removeAttachment) {
                const index = Number(removeAttachment.dataset.ncwRemoveAttachment);
                this.attachmentDrafts = this.attachmentDrafts.filter((_, itemIndex) => itemIndex !== index);
                this.render();
                return;
            }
            const contactButton = event.target.closest('[data-ncw-contact]');
            if (contactButton) {
                const next = contactButton.dataset.ncwContact || '';
                if (this.activeContactId === next && this.expandedContacts.has(next)) {
                    this.expandedContacts.delete(next);
                    this.render();
                    return;
                }
                this.activeContactId = next;
                this.expandedContacts.add(next);
                this.render();
                this.openGeneralThread(next).catch(() => {});
                return;
            }
            const threadButton = event.target.closest('[data-ncw-thread]');
            if (threadButton) {
                if (this.suppressDocClick) {
                    this.suppressDocClick = false;
                    return;
                }
                this.revealedThreadCode = '';
                this.openThread(threadButton.dataset.ncwThread || '').catch(() => {});
                return;
            }
            if (event.target.closest('[data-ncw-open-doc]')) {
                const route = documentRoute(this.activeThread());
                if (route) this.openRoute?.(route, threadLabel(this.activeThread()));
            }
        }

        handleInput(event) {
            if (!event.target.matches('[data-ncw-search]')) return;
            this.searchTerm = event.target.value || '';
            this.render();
            const input = this.root?.querySelector('[data-ncw-search]');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }

        handleChange(event) {
            if (!event.target.matches('[data-ncw-file]')) return;
            this.addAttachments(event.target.files).catch(() => {});
            event.target.value = '';
        }

        handleSubmit(event) {
            if (!event.target.closest('[data-ncw-compose]')) return;
            event.preventDefault();
            this.sendMessage().catch(() => {});
        }
    }

    window.NotificationChatWidget = NotificationChatWidget;
})();
