(function () {
    const THEME_PRESETS = {
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

    const DEFAULT_CONFIG = {
        theme: 'executive',
        colorMode: 'auto',
        mainSize: 86,
        menuDistance: 108,
        miniShape: 'round',
        layout: 'radial',
        mainDay: THEME_PRESETS.executive.day,
        mainNight: THEME_PRESETS.executive.night,
        miniBg: THEME_PRESETS.executive.miniBg,
        miniBgAlpha: THEME_PRESETS.executive.miniBgAlpha,
        miniBgNight: THEME_PRESETS.executive.miniBgNight,
        miniBgNightAlpha: THEME_PRESETS.executive.miniBgNightAlpha,
        miniColor: THEME_PRESETS.executive.miniColor
    };

    function clampNumber(value, fallback, min, max) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        return Math.min(Math.max(numeric, min), max);
    }

    function colorWithAlpha(value, alpha, fallback) {
        const normalized = String(value || '').trim() || String(fallback || '').trim();
        const match = normalized.match(/^#([0-9a-f]{6})$/i);
        if (!match) return normalized;
        const opacity = clampNumber(alpha, 100, 0, 100) / 100;
        const red = parseInt(match[1].slice(0, 2), 16);
        const green = parseInt(match[1].slice(2, 4), 16);
        const blue = parseInt(match[1].slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    }

    function resolveConfig(input = {}) {
        return {
            theme: String(input.theme || DEFAULT_CONFIG.theme).trim().toLowerCase() || DEFAULT_CONFIG.theme,
            colorMode: ['auto', 'day', 'night'].includes(String(input.colorMode || '').trim().toLowerCase())
                ? String(input.colorMode || '').trim().toLowerCase()
                : DEFAULT_CONFIG.colorMode,
            mainSize: clampNumber(input.mainSize, DEFAULT_CONFIG.mainSize, 25, 100),
            menuDistance: clampNumber(input.menuDistance, DEFAULT_CONFIG.menuDistance, 72, 200),
            miniShape: ['round', 'rounded', 'square'].includes(String(input.miniShape || '').trim().toLowerCase())
                ? String(input.miniShape || '').trim().toLowerCase()
                : DEFAULT_CONFIG.miniShape,
            layout: ['radial', 'arc', 'line', 'spiral', 'grid', 'star', 'cascade'].includes(String(input.layout || '').trim().toLowerCase())
                ? String(input.layout || '').trim().toLowerCase()
                : DEFAULT_CONFIG.layout,
            mainDay: String(input.mainDay || DEFAULT_CONFIG.mainDay).trim() || DEFAULT_CONFIG.mainDay,
            mainNight: String(input.mainNight || DEFAULT_CONFIG.mainNight).trim() || DEFAULT_CONFIG.mainNight,
            miniBg: String(input.miniBg || DEFAULT_CONFIG.miniBg).trim() || DEFAULT_CONFIG.miniBg,
            miniBgAlpha: clampNumber(input.miniBgAlpha, DEFAULT_CONFIG.miniBgAlpha, 0, 100),
            miniBgNight: String(input.miniBgNight || input.miniBg || DEFAULT_CONFIG.miniBgNight).trim() || DEFAULT_CONFIG.miniBgNight,
            miniBgNightAlpha: clampNumber(input.miniBgNightAlpha, DEFAULT_CONFIG.miniBgNightAlpha, 0, 100),
            miniColor: String(input.miniColor || DEFAULT_CONFIG.miniColor).trim() || DEFAULT_CONFIG.miniColor
        };
    }

    function computePositions(layout, count, distance, sign) {
        if (layout === 'line') {
            const spacing = Math.max(48, distance * 0.52);
            return Array.from({ length: count }, (_, index) => ({ x: sign * ((index + 1) * spacing), y: 0 }));
        }
        if (layout === 'arc') {
            const start = -145;
            const step = count > 1 ? 110 / (count - 1) : 0;
            return Array.from({ length: count }, (_, index) => {
                const angle = ((start + (index * step)) * Math.PI) / 180;
                return { x: Math.cos(angle) * distance * sign, y: Math.sin(angle) * distance };
            });
        }
        if (layout === 'spiral') {
            return Array.from({ length: count }, (_, index) => {
                const angle = ((-90 + (index * 58)) * Math.PI) / 180;
                const radius = distance + (index * 12);
                return { x: Math.cos(angle) * radius * sign, y: Math.sin(angle) * radius };
            });
        }
        if (layout === 'grid') {
            const spread = distance * 0.72;
            const points = [
                { x: sign * -spread, y: -spread },
                { x: 0, y: -distance },
                { x: sign * spread, y: -spread },
                { x: sign * -distance, y: 0 },
                { x: sign * distance, y: 0 },
                { x: sign * -spread, y: spread },
                { x: 0, y: distance },
                { x: sign * spread, y: spread }
            ];
            return points.slice(0, count);
        }
        if (layout === 'star') {
            return Array.from({ length: count }, (_, index) => {
                const angle = ((-90 + (index * (360 / Math.max(count, 1)))) * Math.PI) / 180;
                const radius = index % 2 === 0 ? distance : distance * 0.72;
                return { x: Math.cos(angle) * radius * sign, y: Math.sin(angle) * radius };
            });
        }
        if (layout === 'cascade') {
            const baseX = Math.max(44, distance * 0.4);
            const stepX = Math.max(40, distance * 0.38);
            const baseY = Math.max(44, distance * 0.4);
            const stepY = Math.max(22, distance * 0.2);
            return Array.from({ length: count }, (_, index) => ({
                x: sign * (baseX + (index * stepX)),
                y: -(baseY + (index * stepY))
            }));
        }
        return Array.from({ length: count }, (_, index) => {
            const angle = ((-90 + (index * (360 / Math.max(count, 1)))) * Math.PI) / 180;
            return { x: Math.cos(angle) * distance * sign, y: Math.sin(angle) * distance };
        });
    }

    class DashboardFloatingButton {
        constructor(elements = {}) {
            this.shell = elements.shell || null;
            this.button = elements.button || null;
            this.icon = elements.icon || null;
            this.badge = elements.badge || null;
            this.radialBridge = elements.radialBridge || null;
            this.bridge = elements.bridge || null;
            this.panel = elements.panel || null;
            this.closeButton = elements.closeButton || null;
            this.open = false;
            this.placement = 'left';
            this.config = { ...DEFAULT_CONFIG };
            this.dragState = null;
            this.toggleHandler = null;
            this.actionHandler = null;
            this.positionHandler = null;
            this.closeHandler = null;
            this.boundFinishDrag = this.finishDrag.bind(this);
            this.bind();
        }

        bind() {
            if (!this.shell || !this.button) return;
            this.button.addEventListener('click', (event) => {
                if (this.dragState?.moved) {
                    this.dragState.moved = false;
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                this.toggleHandler?.(!this.open);
            });

            this.button.addEventListener('dragstart', (event) => {
                event.preventDefault();
            });

            this.radialBridge?.addEventListener('click', (event) => {
                const actionButton = event.target.closest('[data-bdfg-action]');
                if (!actionButton) return;
                event.preventDefault();
                event.stopPropagation();
                this.actionHandler?.(actionButton.dataset.bdfgAction, actionButton);
            });

            this.closeButton?.addEventListener('click', () => {
                this.closeHandler?.();
            });

            this.button.addEventListener('pointerdown', (event) => {
                if (event.button !== 0) return;
                const rect = this.shell.getBoundingClientRect();
                this.dragState = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: rect.left,
                    originY: rect.top,
                    moved: false
                };
                this.button.setPointerCapture(event.pointerId);
                this.shell.classList.add('dragging');
            });

            this.button.addEventListener('pointermove', (event) => {
                if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
                const deltaX = event.clientX - this.dragState.startX;
                const deltaY = event.clientY - this.dragState.startY;
                if (!this.dragState.moved && (Math.abs(deltaX) + Math.abs(deltaY) > 10)) {
                    this.dragState.moved = true;
                }
                if (!this.dragState.moved) return;
                const next = this.clampPosition(this.dragState.originX + deltaX, this.dragState.originY + deltaY);
                this.applyPosition(next);
            });

            this.button.addEventListener('pointerup', this.boundFinishDrag);
            this.button.addEventListener('pointercancel', this.boundFinishDrag);
        }

        onToggle(handler) {
            this.toggleHandler = typeof handler === 'function' ? handler : null;
        }

        onAction(handler) {
            this.actionHandler = typeof handler === 'function' ? handler : null;
        }

        onPosition(handler) {
            this.positionHandler = typeof handler === 'function' ? handler : null;
        }

        onClose(handler) {
            this.closeHandler = typeof handler === 'function' ? handler : null;
        }

        setConfig(nextConfig = {}) {
            this.config = resolveConfig(nextConfig);
            this.applyVisualConfig();
        }

        getResolvedColorMode() {
            if (this.config.colorMode === 'day' || this.config.colorMode === 'night') return this.config.colorMode;
            return document.documentElement?.dataset?.theme === 'dark' ? 'night' : 'day';
        }

        applyVisualConfig() {
            if (!this.button || !this.shell) return;
            const activeMode = this.getResolvedColorMode();
            const mainColor = activeMode === 'night' ? this.config.mainNight : this.config.mainDay;
            const miniBackground = activeMode === 'night'
                ? colorWithAlpha(this.config.miniBgNight, this.config.miniBgNightAlpha, DEFAULT_CONFIG.miniBgNight)
                : colorWithAlpha(this.config.miniBg, this.config.miniBgAlpha, DEFAULT_CONFIG.miniBg);
            const glow = activeMode === 'night'
                ? '0 18px 34px rgba(0,0,0,.42), inset 0 4px 10px rgba(255,255,255,.28), inset 0 -12px 18px rgba(0,0,0,.24)'
                : '0 18px 32px rgba(15,23,42,.18), inset 0 4px 10px rgba(255,255,255,.7), inset 0 -12px 18px rgba(0,0,0,.1)';
            this.shell.style.width = `${this.config.mainSize}px`;
            this.shell.style.height = `${this.config.mainSize}px`;
            this.button.style.width = `${this.config.mainSize}px`;
            this.button.style.height = `${this.config.mainSize}px`;
            this.button.style.setProperty('--dashboard-bdfg-main-size', `${this.config.mainSize}px`);
            this.button.style.setProperty('--dashboard-bdfg-main-color', mainColor);
            this.button.style.setProperty('--dashboard-bdfg-mini-bg', miniBackground);
            this.button.style.setProperty('--dashboard-bdfg-mini-color', this.config.miniColor);
            this.button.style.setProperty('--dashboard-bdfg-shadow', glow);
            this.button.dataset.shape = this.config.miniShape;
        }

        setOpen(open) {
            this.open = open === true;
            if (!this.shell || !this.button) return;
            this.shell.classList.toggle('is-active', this.open);
            this.button.setAttribute('aria-expanded', this.open ? 'true' : 'false');
        }

        setPlacement(placement, vPlacement = 'center') {
            this.placement = placement === 'right' ? 'right' : 'left';
            this.vPlacement = vPlacement; // 'top', 'center', 'bottom'
            if (this.shell) {
                this.shell.dataset.placement = this.placement;
                this.shell.dataset.vPlacement = this.vPlacement;
            }
        }

        renderMainIcon(options = {}) {
            if (!this.icon) return;
            const configuredIconSize = Number(options.size) || 34;
            const iconSize = Math.min(configuredIconSize, Math.max(12, Math.round((this.config.mainSize || DEFAULT_CONFIG.mainSize) * 0.46)));
            const iconColor = String(options.color || '').trim() || 'rgba(255,255,255,.98)';
            const hoverColor = String(options.hoverColor || '').trim() || iconColor;
            this.icon.style.setProperty('--dashboard-bdfg-icon-color', iconColor);
            this.icon.style.setProperty('--dashboard-bdfg-icon-hover-color', hoverColor);
            this.icon.style.width = `${iconSize}px`;
            this.icon.style.height = `${iconSize}px`;
            this.icon.style.setProperty('--dashboard-bdfg-main-icon-size', `${iconSize}px`);
            if (String(options.iconMarkup || '').trim()) {
                this.icon.innerHTML = options.iconMarkup;
                this.icon.querySelectorAll('img').forEach((node) => node.setAttribute('draggable', 'false'));
                return;
            }
            this.icon.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                </svg>
            `;
        }

        renderBadge(count) {
            if (!this.badge) return;
            const visible = Number(count || 0) > 0;
            this.badge.hidden = !visible;
            if (visible) {
                const numeric = Number(count || 0);
                this.badge.classList.toggle('is-dot', numeric > 9);
                this.badge.textContent = numeric > 9 ? '' : String(numeric);
            } else {
                this.badge.classList.remove('is-dot');
            }
        }

        renderItems(items = []) {
            if (!this.radialBridge) return;
            const sign = this.placement === 'left' ? 1 : -1;
            const positions = computePositions(this.config.layout, items.length, this.config.menuDistance, sign);
            const miniBackground = this.getResolvedColorMode() === 'night'
                ? colorWithAlpha(this.config.miniBgNight, this.config.miniBgNightAlpha, DEFAULT_CONFIG.miniBgNight)
                : colorWithAlpha(this.config.miniBg, this.config.miniBgAlpha, DEFAULT_CONFIG.miniBg);
            this.radialBridge.innerHTML = items.map((item, index) => {
                const position = positions[index] || { x: 0, y: 0 };
                const radius = this.config.miniShape === 'round' ? '999px' : this.config.miniShape === 'rounded' ? '18px' : '12px';
                return `
                    <button
                        type="button"
                        class="process-launcher-item"
                        title="${String(item.label || '').replace(/"/g, '&quot;')}"
                        data-bdfg-action="${String(item.id || '').replace(/"/g, '&quot;')}"
                        style="--orb-x:${position.x}px; --orb-y:${position.y}px; --orb-radius:${radius}; --orb-icon-size:${Number(item.size) || 20}px; --orb-icon-hover-color:${item.hoverColor || item.color || this.config.miniColor}; color:${item.color || this.config.miniColor}; background:${item.background || miniBackground};"
                    >
                        ${item.iconMarkup || ''}
                        ${item.badge ? `<span class="dashboard-bdfg-badge dashboard-bdfg-badge-inline">${String(item.badge)}</span>` : ''}
                    </button>
                `;
            }).join('');
        }

        clampPosition(left, top) {
            const width = window.innerWidth || document.documentElement.clientWidth || 1280;
            const height = window.innerHeight || document.documentElement.clientHeight || 720;
            const shellWidth = this.shell?.offsetWidth || this.config.mainSize || 86;
            const shellHeight = this.shell?.offsetHeight || this.config.mainSize || 86;
            return {
                x: Math.min(Math.max(8, left), Math.max(8, width - shellWidth - 8)),
                y: Math.min(Math.max(8, top), Math.max(8, height - shellHeight - 8))
            };
        }

        applyPosition(position) {
            if (!this.shell) return;
            const next = this.clampPosition(Number(position?.x || 14), Number(position?.y || 140));
            this.shell.style.left = `${next.x}px`;
            this.shell.style.top = `${next.y}px`;
            this.shell.style.right = 'auto';
            this.shell.style.bottom = 'auto';
            this.updatePlacement();
        }

        updatePlacement(triggerEl = null) {
            if (!this.shell) return;
            const shellRect = this.shell.getBoundingClientRect();
            const width = window.innerWidth || document.documentElement.clientWidth || 1280;
            const height = window.innerHeight || document.documentElement.clientHeight || 720;
            
            const shellCenterX = shellRect.left + (shellRect.width / 2);
            const shellCenterY = shellRect.top + (shellRect.height / 2);
            
            const openTowardRight = shellCenterX <= (width / 2);
            const openTowardBottom = shellCenterY <= (height / 2);

            this.setPlacement(openTowardRight ? 'left' : 'right', openTowardBottom ? 'top' : 'bottom');

            if (this.bridge) {
                if (triggerEl) {
                    const triggerRect = triggerEl.getBoundingClientRect();
                    const offsetY = triggerRect.top - shellRect.top;
                    this.bridge.style.setProperty('--bridge-offset-y', `${offsetY}px`);
                } else {
                    this.bridge.style.removeProperty('--bridge-offset-y');
                }
            }
        }

        /**
         * Show or hide the side bridge panel.
         * @param {boolean} visible
         */
        showBridge(visible) {
            if (!this.bridge) return;
            this.bridge.hidden = !visible;
        }

        /**
         * Update the header text of the bridge panel.
         * @param {string} title
         * @param {string} [subtitle]
         */
        setTitle(title, subtitle) {
            const titleEl = this.bridge?.querySelector('.dashboard-bdfg-head-copy strong');
            const subtitleEl = this.bridge?.querySelector('.dashboard-bdfg-head-copy span');
            if (titleEl && title != null) titleEl.textContent = String(title);
            if (subtitleEl && subtitle != null) {
                const nextSubtitle = String(subtitle);
                subtitleEl.textContent = nextSubtitle;
                subtitleEl.hidden = !nextSubtitle.trim();
            }
        }

        /**
         * Render a draggable process tray in the bridge panel.
         * Called by the shell (dashboard.js) when receiving an erp-bdfg-context
         * with kind === 'calculo-flexografia' and canEdit === true.
         *
         * @param {Array<{id:string, name:string, icon?:string, color?:string}>} processes
         * @param {{ canEdit?: boolean, title?: string, subtitle?: string }} [options]
         */
        renderProcessTray(processes = [], options = {}) {
            if (!this.panel) return;
            this.bridge?.classList.add('dashboard-bdfg-bridge-processes');

            const canEdit = options.canEdit !== false;
            if (!canEdit || !Array.isArray(processes) || !processes.length) {
                this.clearProcessTray();
                return;
            }

            const title    = String(options.title    || 'Agregar Proceso').trim();
            const subtitle = String(options.subtitle || '').trim();
            this.setTitle(title, subtitle);

            const escapeHtml = (value) => String(value || '').replace(/[<>&"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char]));
            const normalizedProcesses = processes.map((proc) => ({
                id: String(proc?.id || '').trim(),
                name: String(proc?.name || '').trim(),
                icon: String(proc?.icon || '⚙'),
                color: String(proc?.color || '').trim(),
                repeatable: proc?.repeatable === true,
                locked: proc?.locked === true,
                added: proc?.added === true,
                canAdd: proc?.canAdd !== false,
                lineCode: String(proc?.lineCode || options.targetLineCode || '').trim()
            })).filter((proc) => proc.id && proc.name);
            const addableProcesses = normalizedProcesses.filter((proc) => proc.canAdd);
            const existingProcesses = normalizedProcesses.filter((proc) => proc.added && !proc.repeatable);
            const activeTab = addableProcesses.length ? 'add' : 'existing';
            const renderChip = (proc, mode) => `
                <div
                    class="dashboard-bdfg-process-chip${mode === 'existing' ? ' is-existing' : ''}"
                    ${mode === 'add' ? 'draggable="true"' : ''}
                    role="listitem"
                    tabindex="${mode === 'add' ? '0' : '-1'}"
                    data-process-mode="${mode}"
                    data-process-id="${escapeHtml(proc.id)}"
                    data-process-name="${escapeHtml(proc.name)}"
                    data-line-code="${escapeHtml(proc.lineCode)}"
                    title="${escapeHtml(proc.name)}"
                    ${proc.color ? `style="--chip-accent:${escapeHtml(proc.color)};"` : ''}
                >
                    <span class="dashboard-bdfg-process-chip-label">${escapeHtml(proc.name)}</span>
                    <span class="dashboard-bdfg-process-chip-drag" aria-hidden="true">${mode === 'add' ? '&#8942;' : '&#10003;'}</span>
                </div>
            `;

            this.panel.innerHTML = `
                <div class="dashboard-bdfg-process-tray">
                    <div class="dashboard-bdfg-process-tabs" role="tablist" aria-label="Procesos de cálculo">
                        <button type="button" class="dashboard-bdfg-process-tab is-active" role="tab" aria-selected="true" data-process-tab="add">Agregar</button>
                        <button type="button" class="dashboard-bdfg-process-tab" role="tab" aria-selected="false" data-process-tab="existing">Existentes</button>
                    </div>
                    <section class="dashboard-bdfg-process-panel is-active" role="tabpanel" data-process-panel="add">
                        <div class="dashboard-bdfg-process-tray-list" role="list">
                            ${addableProcesses.length
                                ? addableProcesses.map((proc) => renderChip(proc, 'add')).join('')
                                : '<div class="dashboard-bdfg-process-empty">No hay procesos disponibles.</div>'}
                        </div>
                    </section>
                    <section class="dashboard-bdfg-process-panel" role="tabpanel" data-process-panel="existing" hidden>
                        <div class="dashboard-bdfg-process-tray-list" role="list">
                            ${existingProcesses.length
                                ? existingProcesses.map((proc) => renderChip(proc, 'existing')).join('')
                                : '<div class="dashboard-bdfg-process-empty">No hay procesos existentes.</div>'}
                        </div>
                    </section>
                </div>
            `;

            this.panel.querySelectorAll('[data-process-tab]').forEach((button) => {
                button.addEventListener('click', () => {
                    const targetTab = button.dataset.processTab === 'existing' ? 'existing' : 'add';
                    this.panel.querySelectorAll('[data-process-tab]').forEach((tabButton) => {
                        const selected = tabButton.dataset.processTab === targetTab;
                        tabButton.classList.toggle('is-active', selected);
                        tabButton.setAttribute('aria-selected', selected ? 'true' : 'false');
                    });
                    this.panel.querySelectorAll('[data-process-panel]').forEach((panel) => {
                        const selected = panel.dataset.processPanel === targetTab;
                        panel.classList.toggle('is-active', selected);
                        panel.hidden = !selected;
                    });
                });
            });

            this.panel.querySelectorAll('.dashboard-bdfg-process-chip[data-process-mode="add"]').forEach((chip) => {
                let chipWasDragged = false;
                const broadcastToFrames = (type, extra = {}) => {
                    const sendToFrame = (frameWindow) => {
                        if (!frameWindow) return;
                        try { frameWindow.postMessage({ type, ...extra }, window.location.origin); } catch (_) {}
                        try {
                            for (let i = 0; i < frameWindow.frames.length; i += 1) {
                                sendToFrame(frameWindow.frames[i]);
                            }
                        } catch (_) {}
                    };
                    try {
                        const frames = window.frames;
                        for (let i = 0; i < frames.length; i++) {
                            sendToFrame(frames[i]);
                        }
                    } catch (_) {}
                };

                const sendTapAdd = () => {
                    broadcastToFrames('erp-process-tap-add', {
                        processId: chip.dataset.processId,
                        processName: chip.dataset.processName,
                        lineCode: chip.dataset.lineCode || ''
                    });
                };

                chip.addEventListener('dragstart', (e) => {
                    const processId   = chip.dataset.processId;
                    const processName = chip.dataset.processName;
                    chipWasDragged = true;
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', processId);
                    try { e.dataTransfer.setData('application/erp-process', JSON.stringify({ id: processId, name: processName })); } catch (_) {}
                    chip.classList.add('is-dragging');
                    broadcastToFrames('erp-process-drag-start', { processId, processName, lineCode: chip.dataset.lineCode || '' });
                });

                chip.addEventListener('dragend', () => {
                    chip.classList.remove('is-dragging');
                    broadcastToFrames('erp-process-drag-end', { lineCode: chip.dataset.lineCode || '' });
                    setTimeout(() => { chipWasDragged = false; }, 0);
                });

                chip.addEventListener('click', (e) => {
                    if (chipWasDragged) return;
                    e.preventDefault();
                    sendTapAdd();
                });

                chip.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        sendTapAdd();
                    }
                });
            });

            const initialTabButton = this.panel.querySelector(`[data-process-tab="${activeTab}"]`);
            initialTabButton?.click();
            this.showBridge(true);
        }

        /**
         * Remove the process tray and optionally hide the bridge panel.
         * @param {boolean} [hideBridge=true]
         */
        clearProcessTray(hideBridge = true) {
            if (!this.panel) return;
            this.panel.innerHTML = '';
            this.bridge?.classList.remove('dashboard-bdfg-bridge-processes');
            if (hideBridge) this.showBridge(false);
        }

        finishDrag(event) {
            if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
            const currentRect = this.shell.getBoundingClientRect();
            const next = this.clampPosition(currentRect.left, currentRect.top);
            const moved = this.dragState.moved;
            this.dragState = { moved };
            this.applyPosition(next);
            this.shell.classList.remove('dragging');
            this.button.releasePointerCapture?.(event.pointerId);
            if (moved) {
                this.positionHandler?.(next);
            }
            window.setTimeout(() => { this.dragState = null; }, 0);
        }
    }

    window.DashboardFloatingButton = DashboardFloatingButton;
    window.DashboardFloatingButtonThemes = THEME_PRESETS;
    window.DashboardFloatingButtonDefaults = DEFAULT_CONFIG;
})();
