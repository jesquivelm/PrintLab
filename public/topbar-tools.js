(function () {
    const SESSION_STORAGE_KEY = 'erp-user-session';
    const PROFILE_ENDPOINT = '/api/admin-profile';

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
        } catch (_) {
            return null;
        }
    }

    function sessionHeader() {
        const session = readSession();
        return session ? { 'x-erp-session': JSON.stringify(session) } : {};
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function iconMarkup(value, altText, extraClass = '') {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg')) {
            const safeUrl = escapeHtml(value);
            return `<span class="icon-svg-mask ${extraClass}" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
        }
        if (normalized.startsWith('data:image')) {
            return `<img src="${escapeHtml(value)}" alt="${escapeHtml(altText)}" class="icon-image ${extraClass}">`;
        }
        return `<span class="icon-glyph ${extraClass}">${escapeHtml(value || '')}</span>`;
    }

    function configIcon(config, key, fallbackValue) {
        const general = config?.general || {};
        const icons = config?.icons || {};
        const suffix = key.charAt(0).toUpperCase() + key.slice(1);
        return {
            value: icons[key] || fallbackValue,
            color: general[`iconColor${suffix}`] || '#7a8794',
            hover: general[`iconColorHover${suffix}`] || general[`iconColor${suffix}`] || '#0b81b8',
            size: Number(general[`iconSize${suffix}`]) || 20
        };
    }

    function applyConfiguredIcon(button, icon) {
        if (!button || !icon) return;
        button.innerHTML = iconMarkup(icon.value, button.getAttribute('aria-label') || '', 'table-icon-media');
        button.style.setProperty('--icon-color', icon.color);
        button.style.setProperty('--icon-hover-color', icon.hover);
        button.style.setProperty('--config-icon-size', `${icon.size}px`);
    }

    function ensureProfilePopover() {
        let popover = document.getElementById('globalUserPopover');
        if (popover) return popover;
        popover = document.createElement('div');
        popover.id = 'globalUserPopover';
        popover.className = 'topbar-profile-popover';
        popover.hidden = true;
        popover.innerHTML = `
            <div class="topbar-profile-card">
                <div class="topbar-profile-head">
                    <div>
                        <strong id="globalUserPopoverName">Mi perfil</strong>
                        <span id="globalUserPopoverMeta">Actualiza tus datos de acceso.</span>
                    </div>
                    <button type="button" class="topbar-profile-close" aria-label="Cerrar">×</button>
                </div>
                <form id="globalUserProfileForm" class="topbar-profile-form">
                    <label>
                        <span>Cambiar contraseña</span>
                        <input name="password" type="text" autocomplete="new-password">
                    </label>
                    <label>
                        <span>Cambiar foto</span>
                        <input name="photoUrl" type="text" placeholder="URL de la foto">
                    </label>
                    <label>
                        <span>Editar correo</span>
                        <input name="email" type="email" autocomplete="email">
                    </label>
                    <label>
                        <span>Editar teléfonos</span>
                        <input name="phone" type="text" placeholder="Principal">
                    </label>
                    <label>
                        <span>Teléfono adicional</span>
                        <input name="phoneSecondary" type="text" placeholder="Secundario">
                    </label>
                    <p id="globalUserProfileStatus" class="topbar-profile-status"></p>
                    <div class="topbar-profile-actions">
                        <button type="button" class="action-btn topbar-profile-cancel">Cancelar</button>
                        <button type="submit" class="action-btn action-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(popover);
        return popover;
    }

    async function loadProfileIntoPopover(popover) {
        const response = await fetch(PROFILE_ENDPOINT, { headers: sessionHeader() });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el perfil.');
        const form = popover.querySelector('#globalUserProfileForm');
        const status = popover.querySelector('#globalUserProfileStatus');
        const nameNode = popover.querySelector('#globalUserPopoverName');
        const metaNode = popover.querySelector('#globalUserPopoverMeta');
        if (nameNode) nameNode.textContent = payload.name || payload.username || 'Mi perfil';
        if (metaNode) metaNode.textContent = payload.department || payload.process || 'Actualiza tus datos de acceso.';
        if (form) {
            form.elements.password.value = payload.password || '';
            form.elements.photoUrl.value = payload.photoUrl || '';
            form.elements.email.value = payload.email || '';
            form.elements.phone.value = payload.phone || '';
            form.elements.phoneSecondary.value = payload.phoneSecondary || '';
        }
        if (status) status.textContent = '';
    }

    async function openProfilePopover() {
        const popover = ensureProfilePopover();
        popover.hidden = false;
        document.body.classList.add('popover-open');
        try {
            await loadProfileIntoPopover(popover);
        } catch (error) {
            const status = popover.querySelector('#globalUserProfileStatus');
            if (status) status.textContent = error.message || 'No fue posible cargar el perfil.';
        }
    }

    function closeProfilePopover() {
        const popover = document.getElementById('globalUserPopover');
        if (!popover) return;
        popover.hidden = true;
        document.body.classList.remove('popover-open');
    }

    async function saveProfile(form) {
        const status = document.getElementById('globalUserProfileStatus');
        if (status) status.textContent = 'Guardando...';
        const payload = {
            password: form.elements.password.value,
            photoUrl: form.elements.photoUrl.value,
            email: form.elements.email.value,
            phone: form.elements.phone.value,
            phoneSecondary: form.elements.phoneSecondary.value
        };
        const response = await fetch(PROFILE_ENDPOINT, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...sessionHeader()
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No fue posible guardar el perfil.');
        if (status) status.textContent = 'Perfil actualizado.';
        const session = readSession();
        if (session) {
            session.photoUrl = result.photoUrl || session.photoUrl || '';
            try {
                const target = localStorage.getItem(SESSION_STORAGE_KEY) ? localStorage : sessionStorage;
                target.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            } catch (_) {
                // Ignore storage write failure.
            }
        }
    }

    function initProfileEvents() {
        document.addEventListener('click', (event) => {
            if (event.target.closest('[data-user-profile-open]')) {
                openProfilePopover().catch(() => {});
                return;
            }
            if (event.target.closest('.topbar-profile-close') || event.target.closest('.topbar-profile-cancel')) {
                closeProfilePopover();
                return;
            }
            const popover = document.getElementById('globalUserPopover');
            if (popover && !popover.hidden && event.target === popover) {
                closeProfilePopover();
            }
        });
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || form.id !== 'globalUserProfileForm') return;
            event.preventDefault();
            saveProfile(form).catch((error) => {
                const status = document.getElementById('globalUserProfileStatus');
                if (status) status.textContent = error.message || 'No fue posible guardar el perfil.';
            });
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeProfilePopover();
        });
    }

    function initTopbar(config) {
        const favoriteButtons = document.querySelectorAll('[data-topbar-favorite]');
        const userButtons = document.querySelectorAll('[data-user-profile-open]');
        const favoriteIcon = configIcon(config, 'favoriteDocumentOn', '★');
        const userIcon = configIcon(config, 'topUser', '◔');
        favoriteButtons.forEach((button) => {
            applyConfiguredIcon(button, favoriteIcon);
            button.addEventListener('click', () => {
                const panelId = button.getAttribute('data-topbar-favorite-target');
                const panel = panelId ? document.getElementById(panelId) : null;
                if (panel) {
                    panel.hidden = !panel.hidden;
                    return;
                }
                window.location.href = '/dashboard';
            });
        });
        userButtons.forEach((button) => applyConfiguredIcon(button, userIcon));
    }

    async function bootstrap() {
        initProfileEvents();
        try {
            const response = await fetch('/api/config/general');
            const config = response.ok ? await response.json() : {};
            initTopbar(config);
        } catch (_) {
            initTopbar({});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();
