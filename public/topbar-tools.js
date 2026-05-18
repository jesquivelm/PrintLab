(function () {
    const SESSION_STORAGE_KEY = 'erp-user-session';
    const PROFILE_ENDPOINT = '/api/admin-profile';
    const FAVORITES_STORAGE_KEY = 'erp-favorite-documents';
    let profileAutosaveTimer = null;
    const FLOATING_BUTTON_THEMES = window.DashboardFloatingButtonThemes || {
        ocean: { day: '#60a5fa', night: '#1e3a8a', miniBg: '#ffffff', miniBgAlpha: 100, miniBgNight: '#ffffff', miniBgNightAlpha: 100, miniColor: '#334155' },
        executive: { day: '#cbd5e1', night: '#334155', miniBg: '#ffffff', miniBgAlpha: 100, miniBgNight: '#ffffff', miniBgNightAlpha: 100, miniColor: '#1f2937' },
        graphite: { day: '#94a3b8', night: '#111827', miniBg: '#f8fafc', miniBgAlpha: 100, miniBgNight: '#f8fafc', miniBgNightAlpha: 100, miniColor: '#111827' },
        silver: { day: '#e5e7eb', night: '#4b5563', miniBg: '#ffffff', miniBgAlpha: 100, miniBgNight: '#ffffff', miniBgNightAlpha: 100, miniColor: '#475569' },
        midnight: { day: '#64748b', night: '#020617', miniBg: '#e2e8f0', miniBgAlpha: 100, miniBgNight: '#e2e8f0', miniBgNightAlpha: 100, miniColor: '#0f172a' },
        pearl: { day: '#ffffff', night: '#64748b', miniBg: '#ffffff', miniBgAlpha: 100, miniBgNight: '#ffffff', miniBgNightAlpha: 100, miniColor: '#334155' },
        champagne: { day: '#f8e7c8', night: '#8a6a36', miniBg: '#fff7ed', miniBgAlpha: 100, miniBgNight: '#fff7ed', miniBgNightAlpha: 100, miniColor: '#78350f' },
        aurora: { day: '#22d3ee', night: '#6d28d9', miniBg: '#f8fafc', miniBgAlpha: 100, miniBgNight: '#f8fafc', miniBgNightAlpha: 100, miniColor: '#312e81' },
        emerald: { day: '#34d399', night: '#065f46', miniBg: '#ecfdf5', miniBgAlpha: 100, miniBgNight: '#ecfdf5', miniBgNightAlpha: 100, miniColor: '#064e3b' },
        coffee: { day: '#d6b38a', night: '#6f4e37', miniBg: '#fff7ed', miniBgAlpha: 100, miniBgNight: '#fff7ed', miniBgNightAlpha: 100, miniColor: '#422006' },
        royal: { day: '#93c5fd', night: '#312e81', miniBg: '#eef2ff', miniBgAlpha: 100, miniBgNight: '#eef2ff', miniBgNightAlpha: 100, miniColor: '#312e81' },
        minimal: { day: '#f8fafc', night: '#475569', miniBg: '#ffffff', miniBgAlpha: 100, miniBgNight: '#ffffff', miniBgNightAlpha: 100, miniColor: '#475569' }
    };

    function clampAlpha(value, fallback = 100) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        return Math.min(100, Math.max(0, Math.round(numeric)));
    }

    function clampNumber(value, fallback, min, max) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        return Math.min(max, Math.max(min, numeric));
    }

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
        } catch (_) {
            return null;
        }
    }

    function sessionHeader() {
        const session = readSession();
        if (!session) return {};
        const compactSession = {
            username: session.username || '',
            name: session.name || session.fullName || '',
            permissionName: session.permissionName || ''
        };
        return { 'x-erp-session': JSON.stringify(compactSession) };
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function profileInitials(payload = {}) {
        const source = String(payload.name || payload.username || 'Usuario').trim();
        const parts = source.split(/\s+/).filter(Boolean);
        return (parts.length ? parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') : 'U');
    }

    function updateProfileAvatar(popover, payload = {}) {
        const photo = String(payload.photoUrl || '').trim();
        const image = popover?.querySelector('#globalUserProfilePhoto');
        const initialsNode = popover?.querySelector('#globalUserProfileInitials');
        if (initialsNode) initialsNode.textContent = profileInitials(payload);
        if (!image) return;
        image.onerror = () => {
            image.hidden = true;
            if (initialsNode) initialsNode.hidden = false;
        };
        if (photo) {
            image.src = photo;
            image.hidden = false;
            if (initialsNode) initialsNode.hidden = true;
        } else {
            image.removeAttribute('src');
            image.hidden = true;
            if (initialsNode) initialsNode.hidden = false;
        }
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

    function getFloatingButtonThemeOptions(selected = 'executive') {
        return Object.keys(FLOATING_BUTTON_THEMES).map((key) => `<option value="${escapeHtml(key)}"${key === selected ? ' selected' : ''}>${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))}</option>`).join('');
    }

    function normalizeFloatingButtonConfig(rawConfig = {}) {
        const config = rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig) ? rawConfig : {};
        return {
            enabled: config.enabled === true || String(config.enabled || '').trim().toLowerCase() === 'true',
            theme: String(config.theme || 'executive').trim().toLowerCase() || 'executive',
            colorMode: ['auto', 'day', 'night'].includes(String(config.colorMode || '').trim().toLowerCase())
                ? String(config.colorMode || '').trim().toLowerCase()
                : 'auto',
            mainSize: clampNumber(config.mainSize, 86, 25, 100),
            menuDistance: clampNumber(config.menuDistance, 108, 72, 200),
            mainDay: String(config.mainDay || '').trim(),
            mainNight: String(config.mainNight || '').trim(),
            miniBg: String(config.miniBg || '').trim(),
            miniBgAlpha: clampAlpha(config.miniBgAlpha, 100),
            miniBgNight: String(config.miniBgNight || config.miniBg || '').trim(),
            miniBgNightAlpha: clampAlpha(config.miniBgNightAlpha, 100),
            miniColor: String(config.miniColor || '').trim(),
            miniShape: ['round', 'rounded', 'square'].includes(String(config.miniShape || '').trim().toLowerCase())
                ? String(config.miniShape || '').trim().toLowerCase()
                : 'round',
            layout: ['radial', 'arc', 'line', 'spiral', 'grid', 'star', 'cascade'].includes(String(config.layout || '').trim().toLowerCase())
                ? String(config.layout || '').trim().toLowerCase()
                : 'radial'
        };
    }

    function applyFloatingButtonThemeToForm(form, force = false) {
        if (!form) return;
        const themeKey = String(form.elements.bdfgTheme?.value || 'executive').trim().toLowerCase() || 'executive';
        const preset = FLOATING_BUTTON_THEMES[themeKey];
        if (!preset) return;
        const dayField = form.elements.bdfgMainDay;
        const nightField = form.elements.bdfgMainNight;
        const miniBgField = form.elements.bdfgMiniBg;
        const miniBgAlphaField = form.elements.bdfgMiniBgAlpha;
        const miniBgNightField = form.elements.bdfgMiniBgNight;
        const miniBgNightAlphaField = form.elements.bdfgMiniBgNightAlpha;
        const miniColorField = form.elements.bdfgMiniColor;
        if (force || !String(dayField?.value || '').trim()) dayField.value = preset.day;
        if (force || !String(nightField?.value || '').trim()) nightField.value = preset.night;
        if (force || !String(miniBgField?.value || '').trim()) miniBgField.value = preset.miniBg;
        if (force || !String(miniBgAlphaField?.value || '').trim()) miniBgAlphaField.value = String(clampAlpha(preset.miniBgAlpha, 100));
        if (force || !String(miniBgNightField?.value || '').trim()) miniBgNightField.value = preset.miniBgNight || preset.miniBg;
        if (force || !String(miniBgNightAlphaField?.value || '').trim()) miniBgNightAlphaField.value = String(clampAlpha(preset.miniBgNightAlpha, 100));
        if (force || !String(miniColorField?.value || '').trim()) miniColorField.value = preset.miniColor;
    }

    function emitFloatingButtonProfilePreview(form) {
        if (!form) return;
        const preview = normalizeFloatingButtonConfig({
            enabled: form.elements.bdfgEnabled?.checked,
            theme: form.elements.bdfgTheme?.value,
            colorMode: form.elements.bdfgColorMode?.value,
            mainSize: form.elements.bdfgMainSize?.value,
            menuDistance: form.elements.bdfgMenuDistance?.value,
            mainDay: form.elements.bdfgMainDay?.value,
            mainNight: form.elements.bdfgMainNight?.value,
            miniBg: form.elements.bdfgMiniBg?.value,
            miniBgAlpha: form.elements.bdfgMiniBgAlpha?.value,
            miniBgNight: form.elements.bdfgMiniBgNight?.value,
            miniBgNightAlpha: form.elements.bdfgMiniBgNightAlpha?.value,
            miniColor: form.elements.bdfgMiniColor?.value,
            miniShape: form.elements.bdfgMiniShape?.value,
            layout: form.elements.bdfgLayout?.value
        });
        window.dispatchEvent(new CustomEvent('erp-bdfg-preview-profile', { detail: preview }));
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'erp-bdfg-preview-profile', preview }, window.location.origin);
        }
    }

    function bindFloatingButtonProfileEvents(popover) {
        const form = popover?.querySelector('#globalUserProfileForm');
        if (!form || form.dataset.bdfgBound === 'true') return;
        const tabButtons = [...popover.querySelectorAll('[data-profile-tab]')];
        const tabPanels = [...popover.querySelectorAll('[data-profile-panel]')];
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const tabKey = button.dataset.profileTab || 'perfil';
                tabButtons.forEach((node) => node.classList.toggle('is-active', node === button));
                tabPanels.forEach((panel) => {
                    panel.hidden = panel.dataset.profilePanel !== tabKey;
                });
            });
        });
        form.elements.bdfgTheme?.addEventListener('change', () => {
            applyFloatingButtonThemeToForm(form, true);
            syncProfileRangeValues(form);
            emitFloatingButtonProfilePreview(form);
            scheduleProfileAutosave(form);
        });
        popover.querySelectorAll('[data-profile-range-target]').forEach((range) => {
            range.addEventListener('input', () => {
                const target = form.elements[range.dataset.profileRangeTarget];
                if (target) target.value = range.value;
                emitFloatingButtonProfilePreview(form);
                scheduleProfileAutosave(form);
            });
        });
        ['bdfgEnabled', 'bdfgColorMode', 'bdfgMainSize', 'bdfgMenuDistance', 'bdfgMainDay', 'bdfgMainNight', 'bdfgMiniBg', 'bdfgMiniBgAlpha', 'bdfgMiniBgNight', 'bdfgMiniBgNightAlpha', 'bdfgMiniColor', 'bdfgMiniShape', 'bdfgLayout'].forEach((fieldName) => {
            const field = form.elements[fieldName];
            if (!field) return;
            field.addEventListener('change', () => {
                syncProfileRangeValues(form);
                emitFloatingButtonProfilePreview(form);
                scheduleProfileAutosave(form);
            });
            if (field instanceof HTMLInputElement && field.type !== 'color' && field.type !== 'checkbox') {
                field.addEventListener('input', () => {
                    syncProfileRangeValues(form);
                    emitFloatingButtonProfilePreview(form);
                    scheduleProfileAutosave(form);
                });
            }
        });
        ['email', 'phone', 'phoneSecondary'].forEach((fieldName) => {
            const field = form.elements[fieldName];
            if (!field) return;
            field.addEventListener('change', () => scheduleProfileAutosave(form));
            field.addEventListener('input', () => scheduleProfileAutosave(form));
        });
        form.dataset.bdfgBound = 'true';
    }

    function syncProfileRangeValues(form) {
        form?.querySelectorAll('[data-profile-range-target]').forEach((range) => {
            const target = form.elements[range.dataset.profileRangeTarget];
            if (target) range.value = target.value || range.value;
        });
    }

    function scheduleProfileAutosave(form) {
        clearTimeout(profileAutosaveTimer);
        profileAutosaveTimer = setTimeout(() => {
            saveProfile(form, { auto: true }).catch((error) => {
                const status = document.getElementById('globalUserProfileStatus');
                if (status) status.textContent = error.message || 'No fue posible guardar el perfil.';
            });
        }, 750);
    }

    function readFavoriteDocuments() {
        try {
            const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function writeFavoriteDocuments(items) {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('erp-favorites-updated', { detail: items }));
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'erp-favorites-updated' }, window.location.origin);
        }
    }

    function getCurrentFavoritePayload() {
        const pathname = window.location.pathname || '/dashboard';
        const title = document.querySelector('.brand h1, .dashboard-topbar .brand h1')?.textContent?.trim()
            || document.title.replace(/\s*\|\s*ERP$/i, '').trim()
            || 'Documento';
        return {
            route: pathname + (window.location.search || ''),
            label: title,
            code: title
        };
    }

    function applyFavoriteState(button, isFavorite, iconOn, iconOff) {
        const icon = isFavorite ? iconOn : iconOff;
        applyConfiguredIcon(button, icon);
        button.dataset.favoriteState = isFavorite ? 'on' : 'off';
        button.classList.toggle('is-active-favorite', isFavorite);
        button.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
        button.title = isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos';
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
                    <div class="topbar-profile-identity">
                        <div class="topbar-profile-avatar-shell">
                            <img id="globalUserProfilePhoto" class="topbar-profile-avatar" alt="" hidden>
                            <span id="globalUserProfileInitials" class="topbar-profile-initials">U</span>
                        </div>
                        <div class="topbar-profile-title">
                            <strong id="globalUserPopoverName">Mi perfil</strong>
                            <span id="globalUserPopoverMeta">Información de contacto.</span>
                        </div>
                    </div>
                    <button type="button" class="topbar-profile-close" aria-label="Cerrar">×</button>
                </div>
                <div class="topbar-profile-tabs">
                    <button type="button" class="topbar-profile-tab is-active" data-profile-tab="perfil">Perfil</button>
                    <button type="button" class="topbar-profile-tab" data-profile-tab="boton-flotante">Botón flotante</button>
                </div>
                <form id="globalUserProfileForm" class="topbar-profile-form">
                    <div class="topbar-profile-panel" data-profile-panel="perfil">
                        <div class="topbar-profile-grid">
                            <label class="topbar-profile-field">
                                <span>Correo</span>
                                <input name="email" type="email" autocomplete="email">
                            </label>
                            <label class="topbar-profile-field">
                                <span>Teléfono</span>
                                <input name="phone" type="text" placeholder="Principal">
                            </label>
                            <label class="topbar-profile-field">
                                <span>Tel. adicional</span>
                                <input name="phoneSecondary" type="text" placeholder="Secundario">
                            </label>
                        </div>
                    </div>
                    <div class="topbar-profile-panel" data-profile-panel="boton-flotante" hidden>
                        <div class="topbar-profile-grid">
                            <label>
                                <span>Activar configuración personal</span>
                                <div class="topbar-profile-inline-check">
                                    <input name="bdfgEnabled" type="checkbox">
                                    <strong style="font-size:13px; color:var(--app-text); font-weight:600;">Usar mi configuración</strong>
                                </div>
                            </label>
                            <label>
                                <span>Tema</span>
                                <select name="bdfgTheme">${getFloatingButtonThemeOptions('executive')}</select>
                            </label>
                            <label>
                                <span>Modo día/noche</span>
                                <select name="bdfgColorMode">
                                    <option value="auto">Automático</option>
                                    <option value="day">Día</option>
                                    <option value="night">Noche</option>
                                </select>
                            </label>
                            <label>
                                <span>Diámetro</span>
                                <div class="topbar-profile-range-row">
                                    <input type="range" min="25" max="100" step="1" data-profile-range-target="bdfgMainSize" aria-label="Diámetro">
                                    <input name="bdfgMainSize" type="number" min="25" max="100" step="1">
                                </div>
                            </label>
                            <label>
                                <span>Distancia</span>
                                <div class="topbar-profile-range-row">
                                    <input type="range" min="72" max="200" step="1" data-profile-range-target="bdfgMenuDistance" aria-label="Distancia">
                                    <input name="bdfgMenuDistance" type="number" min="72" max="200" step="1">
                                </div>
                            </label>
                            <div class="topbar-profile-field">
                                <span>Color día</span>
                                <input name="bdfgMainDay" type="color">
                            </div>
                            <div class="topbar-profile-field">
                                <span>Color noche</span>
                                <input name="bdfgMainNight" type="color">
                            </div>
                            <div class="topbar-profile-field">
                                <span>Color botones secundarios día</span>
                                <div class="topbar-profile-color-alpha-row">
                                    <input name="bdfgMiniBg" type="color">
                                    <em class="topbar-profile-alpha-label">Transp.</em>
                                    <input name="bdfgMiniBgAlpha" type="number" min="0" max="100" step="1" value="100" class="topbar-profile-alpha-input">
                                </div>
                            </div>
                            <div class="topbar-profile-field">
                                <span>Color botones secundarios noche</span>
                                <div class="topbar-profile-color-alpha-row">
                                    <input name="bdfgMiniBgNight" type="color">
                                    <em class="topbar-profile-alpha-label">Transp.</em>
                                    <input name="bdfgMiniBgNightAlpha" type="number" min="0" max="100" step="1" value="100" class="topbar-profile-alpha-input">
                                </div>
                            </div>
                            <div class="topbar-profile-field">
                                <span>Color íconos secundarios</span>
                                <input name="bdfgMiniColor" type="color">
                            </div>
                            <label>
                                <span>Forma de botones secundarios</span>
                                <select name="bdfgMiniShape">
                                    <option value="round">Redondo</option>
                                    <option value="rounded">Redondeado</option>
                                    <option value="square">Cuadrado suave</option>
                                </select>
                            </label>
                            <label>
                                <span>Tipo de despliegue</span>
                                <select name="bdfgLayout">
                                    <option value="radial">Radial</option>
                                    <option value="arc">Arco</option>
                                    <option value="line">Línea</option>
                                    <option value="spiral">Espiral</option>
                                    <option value="grid">Cuadrícula alrededor</option>
                                    <option value="star">Estrella</option>
                                    <option value="cascade">Cascada</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <p id="globalUserProfileStatus" class="topbar-profile-status"></p>
                    <div class="topbar-profile-actions">
                        <button type="button" class="action-btn topbar-profile-logout" data-profile-logout="true">Cerrar sesión</button>
                        <button type="button" class="action-btn topbar-profile-cancel">Cancelar</button>
                        <button type="submit" class="action-btn action-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(popover);
        bindFloatingButtonProfileEvents(popover);
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
        if (metaNode) metaNode.textContent = payload.department || payload.process || 'Información de contacto.';
        updateProfileAvatar(popover, payload);
        if (form) {
            form.elements.email.value = payload.email || '';
            form.elements.phone.value = payload.phone || '';
            form.elements.phoneSecondary.value = payload.phoneSecondary || '';
            const floatingConfig = normalizeFloatingButtonConfig(payload.floatingButtonConfig || {});
            form.elements.bdfgEnabled.checked = floatingConfig.enabled;
            form.elements.bdfgTheme.value = floatingConfig.theme;
            form.elements.bdfgColorMode.value = floatingConfig.colorMode;
            form.elements.bdfgMainSize.value = String(floatingConfig.mainSize || 86);
            form.elements.bdfgMenuDistance.value = String(floatingConfig.menuDistance || 108);
            form.elements.bdfgMiniShape.value = floatingConfig.miniShape;
            form.elements.bdfgLayout.value = floatingConfig.layout;
            applyFloatingButtonThemeToForm(form, true);
            if (floatingConfig.mainDay) form.elements.bdfgMainDay.value = floatingConfig.mainDay;
            if (floatingConfig.mainNight) form.elements.bdfgMainNight.value = floatingConfig.mainNight;
            if (floatingConfig.miniBg) form.elements.bdfgMiniBg.value = floatingConfig.miniBg;
            form.elements.bdfgMiniBgAlpha.value = String(clampAlpha(floatingConfig.miniBgAlpha, 100));
            if (floatingConfig.miniBgNight) form.elements.bdfgMiniBgNight.value = floatingConfig.miniBgNight;
            form.elements.bdfgMiniBgNightAlpha.value = String(clampAlpha(floatingConfig.miniBgNightAlpha, 100));
            if (floatingConfig.miniColor) form.elements.bdfgMiniColor.value = floatingConfig.miniColor;
            syncProfileRangeValues(form);
        }
        if (status) status.textContent = '';
        bindFloatingButtonProfileEvents(popover);
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

    function logoutCurrentSession() {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (_) {
            // Ignore storage cleanup failure.
        }
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'erp-session-closed' }, window.location.origin);
            }
        } catch (_) {
            // Ignore parent notification failure.
        }
        window.location.href = '/login';
    }

    async function saveProfile(form, options = {}) {
        const status = document.getElementById('globalUserProfileStatus');
        if (status) status.textContent = options.auto ? 'Guardando automático...' : 'Guardando...';
        const floatingButtonConfig = {
            enabled: form.elements.bdfgEnabled.checked,
            theme: form.elements.bdfgTheme.value,
            colorMode: form.elements.bdfgColorMode.value,
            mainSize: clampNumber(form.elements.bdfgMainSize.value, 86, 25, 100),
            menuDistance: clampNumber(form.elements.bdfgMenuDistance.value, 108, 72, 200),
            mainDay: form.elements.bdfgMainDay.value,
            mainNight: form.elements.bdfgMainNight.value,
            miniBg: form.elements.bdfgMiniBg.value,
            miniBgAlpha: clampAlpha(form.elements.bdfgMiniBgAlpha.value, 100),
            miniBgNight: form.elements.bdfgMiniBgNight.value,
            miniBgNightAlpha: clampAlpha(form.elements.bdfgMiniBgNightAlpha.value, 100),
            miniColor: form.elements.bdfgMiniColor.value,
            miniShape: form.elements.bdfgMiniShape.value,
            layout: form.elements.bdfgLayout.value
        };
        const payload = {
            email: form.elements.email.value,
            phone: form.elements.phone.value,
            phoneSecondary: form.elements.phoneSecondary.value,
            floatingButtonConfig
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
        if (status) status.textContent = options.auto ? 'Cambios guardados.' : 'Perfil actualizado.';
        updateProfileAvatar(document.getElementById('globalUserPopover'), result || payload);
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
        window.dispatchEvent(new CustomEvent('erp-profile-updated', { detail: result || payload }));
        try {
            localStorage.setItem('erp-profile-updated', JSON.stringify({ at: Date.now() }));
        } catch (_) {
            // Ignore storage sync failure.
        }
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'erp-profile-updated', profile: result || payload }, window.location.origin);
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
            if (event.target.closest('[data-profile-logout]')) {
                const confirmed = window.confirm('Se cerrará la sesión actual. ¿Deseas continuar?');
                if (!confirmed) return;
                closeProfilePopover();
                logoutCurrentSession();
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
        const favoriteIconOn = configIcon(config, 'favoriteDocumentOn', '★');
        const favoriteIconOff = configIcon(config, 'favoriteDocumentOff', '☆');
        const userIcon = configIcon(config, 'topUser', '◔');
        favoriteButtons.forEach((button) => {
            const favorites = readFavoriteDocuments();
            const current = getCurrentFavoritePayload();
            const isFavorite = favorites.some((item) => String(item?.route || '').trim() === current.route);
            applyFavoriteState(button, isFavorite, favoriteIconOn, favoriteIconOff);
            button.addEventListener('click', () => {
                const panelId = button.getAttribute('data-topbar-favorite-target');
                const panel = panelId ? document.getElementById(panelId) : null;
                if (panel) {
                    panel.hidden = !panel.hidden;
                    return;
                }
                const payload = getCurrentFavoritePayload();
                const currentFavorites = readFavoriteDocuments();
                const exists = currentFavorites.some((item) => String(item?.route || '').trim() === payload.route);
                const nextFavorites = exists
                    ? currentFavorites.filter((item) => String(item?.route || '').trim() !== payload.route)
                    : [payload, ...currentFavorites.filter((item) => item?.route !== payload.route)].slice(0, 18);
                writeFavoriteDocuments(nextFavorites);
                const nextState = !exists;
                favoriteButtons.forEach((target) => applyFavoriteState(target, nextState, favoriteIconOn, favoriteIconOff));
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

    window.ERPTopbarTools = {
        openProfilePopover
    };
})();
