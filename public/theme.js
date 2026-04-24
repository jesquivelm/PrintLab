(function () {
    const STORAGE_KEY = 'printlab-theme-mode';
    const MODES = ['light', 'dark'];
    const root = document.documentElement;
    const isEmbedded = window !== window.parent || new URLSearchParams(window.location.search).get('shell') === '1';
    const path = window.location.pathname.toLowerCase();
    const canHostToggle = !isEmbedded && (path === '/dashboard' || path === '/dashboard.html' || path === '/login' || path === '/login.html');

    function systemTheme() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function normalizeMode(mode) {
        if (MODES.includes(mode)) return mode;
        if (mode === 'auto') return systemTheme();
        return 'light';
    }

    function readMode() {
        try {
            return normalizeMode(localStorage.getItem(STORAGE_KEY));
        } catch (_) {
            return 'light';
        }
    }

    function writeMode(mode) {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (_) {
            // Ignore storage failures; the visual theme still applies for this page.
        }
    }

    function resolvedTheme(mode) {
        return normalizeMode(mode);
    }

    function updateButton(button, mode, theme) {
        if (!button) return;
        const next = mode === 'light' ? 'dark' : 'light';
        const labels = {
            light: 'Tema claro',
            dark: 'Tema oscuro'
        };
        button.dataset.themeMode = mode;
        button.dataset.nextThemeMode = next;
        button.setAttribute('aria-label', `${labels[mode]}. Cambiar a ${labels[next].toLowerCase()}`);
        button.setAttribute('title', `${labels[mode]} (${theme})`);
        button.innerHTML = `
            <span class="theme-toggle-icon theme-toggle-icon-sun" aria-hidden="true"></span>
            <span class="theme-toggle-icon theme-toggle-icon-moon" aria-hidden="true"></span>
        `;
    }

    function broadcastMode(mode) {
        document.querySelectorAll('iframe').forEach((iframe) => {
            try {
                iframe.contentWindow?.postMessage({ type: 'printlab-theme-change', mode }, window.location.origin);
            } catch (_) {
                // Some iframes can be cross-origin or unavailable while loading.
            }
        });
    }

    function applyMode(mode, options) {
        const normalized = normalizeMode(mode);
        const theme = resolvedTheme(normalized);
        root.dataset.themeMode = normalized;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => updateButton(button, normalized, theme));
        if (!isEmbedded && options?.broadcast !== false) broadcastMode(normalized);
    }

    function createToggle() {
        if (document.querySelector('[data-theme-toggle]')) return;
        const slot = document.querySelector('[data-theme-toggle-slot]');
        if (!slot && !canHostToggle) return;
        const host = slot || document.body;
        if (!host) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `theme-toggle${slot ? '' : ' theme-toggle-floating'}`;
        button.dataset.themeToggle = 'true';
        button.addEventListener('click', () => {
            const current = normalizeMode(root.dataset.themeMode);
            const next = current === 'light' ? 'dark' : 'light';
            writeMode(next);
            applyMode(next);
        });
        host.appendChild(button);
        updateButton(button, normalizeMode(root.dataset.themeMode), root.dataset.theme || resolvedTheme(readMode()));
    }

    const initialMode = readMode();
    writeMode(initialMode);
    applyMode(initialMode, { broadcast: false });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createToggle);
    } else {
        createToggle();
    }

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) applyMode(readMode(), { broadcast: false });
    });

    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'printlab-theme-change') return;
        applyMode(event.data.mode, { broadcast: false });
    });

    window.PrintLabTheme = {
        apply: function (mode) {
            const normalized = normalizeMode(mode);
            writeMode(normalized);
            applyMode(normalized);
        },
        current: function () {
            return {
                mode: normalizeMode(root.dataset.themeMode),
                theme: root.dataset.theme || resolvedTheme(readMode())
            };
        }
    };
})();
