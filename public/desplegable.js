/* Desplegable animado del sistema (formato estándar del proyecto).
   Convierte todos los <select> de la página en el desplegable animado:
   el panel baja por detrás del campo mientras aparece, con la velocidad
   configurada en Configuración → Diseño → Transiciones.

   El panel NO envuelve al campo ni lo reemplaza: flota sobre la página,
   pegado al campo (posicionamiento fijo). La maquetación de cada pantalla
   queda intacta: ningún campo puede moverse, encogerse o desaparecer. */
(function () {
    'use strict';

    var ESTILO = 'slide';
    var VELOCIDAD_MS = 220;
    var STORAGE_CLAVE = 'erp-desplegable-config';
    var selectoresExcluidos = [];

    var hojaEstilos = document.createElement('style');
    hojaEstilos.textContent = [
        '.desplegable-panel {',
        '  position: fixed; z-index: 16000; min-width: 120px;',
        '  max-height: min(52vh, 340px); overflow: auto;',
        '  padding: 6px; border: 1px solid; border-radius: 10px;',
        '  opacity: 0; visibility: hidden; left: -9999px; top: -9999px;',
        '  box-shadow: 0 16px 40px rgba(15, 38, 56, 0.18);',
        '  scrollbar-width: thin; scrollbar-color: rgba(11, 129, 184, 0.42) transparent;',
        '}',
        '.desplegable-panel::-webkit-scrollbar { width: 8px; height: 8px; }',
        '.desplegable-panel::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(11, 129, 184, 0.38); }',
        '.desplegable-panel::-webkit-scrollbar-track { background: transparent; }',
        '.desplegable-panel.abierto { opacity: 1; visibility: visible; transition: transform var(--desplegable-ms, 220ms) cubic-bezier(0.2, 0.9, 0.25, 1), opacity var(--desplegable-ms, 220ms) ease; }',
        '.desplegable-panel.cerrando { opacity: 0; visibility: hidden; transition: transform 130ms ease-in, opacity 130ms ease-in; }',
        '.desplegable-panel[data-estilo="slide"].abierto { transform: translateY(0); }',
        '.desplegable-panel[data-estilo="despliegue"].abierto { transform: scale(1, 1); transform-origin: top center; }',
        '.desplegable-panel[data-estilo="cascada"].abierto { transform: translateY(0); }',
        '/* Las opciones usan la MISMA letra y color del campo (copiados al abrir):',
        '   nada de azul ni negrita. El toque se da con un velo sutil del propio',
        '   color del texto (color-mix), que funciona igual en claro y en oscuro. */',
        '.desplegable-opcion {',
        '  display: flex; align-items: center; width: 100%; min-height: 34px;',
        '  padding: 6px 10px; border: 0; border-radius: 8px; background: transparent;',
        '  color: inherit; font: inherit; text-align: left;',
        '  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
        '  transition: background 0.14s ease;',
        '}',
        '.desplegable-opcion:hover, .desplegable-opcion:focus-visible { background: color-mix(in srgb, currentColor 9%, transparent); outline: none; }',
        '.desplegable-opcion.seleccionada { background: color-mix(in srgb, currentColor 7%, transparent); }',
        '.desplegable-opcion.desplegable-grupo { font-weight: 700; font-size: 0.86em; letter-spacing: 0.03em; text-transform: uppercase; opacity: 0.72; cursor: default; pointer-events: none; }',
        '.desplegable-panel[data-estilo="cascada"] .desplegable-opcion { opacity: 0; transform: translateY(-5px); transition: opacity var(--desplegable-ms, 220ms) ease, transform var(--desplegable-ms, 220ms) ease; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion { opacity: 1; transform: none; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(1) { transition-delay: 0ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(2) { transition-delay: 20ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(3) { transition-delay: 40ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(4) { transition-delay: 60ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(5) { transition-delay: 80ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(6) { transition-delay: 100ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(7) { transition-delay: 120ms; }',
        '.desplegable-panel[data-estilo="cascada"].abierto .desplegable-opcion:nth-child(n+8) { transition-delay: 140ms; }',
        '.desplegable-vacio { padding: 10px; font-size: 0.86em; opacity: 0.72; }',
        '.desplegable-opcion.desplegable-multiple { padding-left: 26px; position: relative; }',
        '.desplegable-opcion.desplegable-multiple::before { content: ""; position: absolute; left: 8px; top: 50%; width: 12px; height: 12px; transform: translateY(-50%); border: 1px solid color-mix(in srgb, currentColor 45%, transparent); border-radius: 3px; background: transparent; }',
        '.desplegable-opcion.desplegable-multiple.marcada::before { background: linear-gradient(180deg, #38bdf8, #0ea5e9); border-color: #38bdf8; }',
        '.desplegable-campo-activo { border-color: #118fc6 !important; box-shadow: 0 0 0 3px rgba(17, 143, 198, 0.15) !important; }',
        '@media (prefers-reduced-motion: reduce) { .desplegable-panel, .desplegable-opcion { transition: none !important; } }'
    ].join('\n');
    document.head.appendChild(hojaEstilos);

    function leerConfig() {
        try {
            var bruta = JSON.parse(localStorage.getItem(STORAGE_CLAVE) || 'null');
            if (bruta && typeof bruta === 'object') {
                if (bruta.estilo && ['slide', 'despliegue', 'cascada'].includes(bruta.estilo)) ESTILO = bruta.estilo;
                if (Number.isFinite(Number(bruta.velocidadMs))) {
                    VELOCIDAD_MS = Math.max(0, Math.min(Number(bruta.velocidadMs), 1200));
                }
            }
        } catch (_) {}
    }

    function guardarConfig() {
        try { localStorage.setItem(STORAGE_CLAVE, JSON.stringify({ estilo: ESTILO, velocidadMs: VELOCIDAD_MS })); } catch (_) {}
    }

    function aplicarVelocidad() {
        document.documentElement.style.setProperty('--desplegable-ms', VELOCIDAD_MS + 'ms');
    }

    function movimientoReducido() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    var abiertos = new Map();

    // Viste el panel con la letra y los colores EXACTOS del campo en ese momento:
    // misma fuente, mismo tamaño, mismos colores de fondo, borde y texto. Así el
    // panel siempre combina con el tema de la página (claro u oscuro).
    function vestirPanel(select, panel) {
        var estilo = window.getComputedStyle(select);
        panel.style.font = estilo.font;
        panel.style.color = estilo.color;
        panel.style.backgroundColor = estilo.backgroundColor;
        panel.style.borderColor = estilo.borderColor;
        var radio = parseFloat(estilo.borderTopLeftRadius);
        panel.style.borderRadius = (radio > 4 ? Math.min(radio, 12) : 10) + 'px';
    }

    function moverOpciones(select, panel) {
        panel.innerHTML = '';
        var seleccionMultiple = select.multiple;
        Array.from(select.options).forEach(function (opcion) {
            if (opcion.hidden) return;
            if (opcion.parentNode && opcion.parentNode.tagName === 'OPTGROUP') {
                var grupo = document.createElement('div');
                grupo.className = 'desplegable-opcion desplegable-grupo';
                grupo.textContent = opcion.parentNode.label || '';
                panel.appendChild(grupo);
            }
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'desplegable-opcion' + (seleccionMultiple ? ' desplegable-multiple' : '');
            item.textContent = opcion.textContent || '';
            if (seleccionMultiple && opcion.selected) item.classList.add('marcada');
            if (!seleccionMultiple && opcion.selected && opcion.value !== '') item.classList.add('seleccionada');
            item.addEventListener('click', function () {
                if (seleccionMultiple) {
                    opcion.selected = !opcion.selected;
                    item.classList.toggle('marcada', opcion.selected);
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }
                select.value = opcion.value;
                cerrar(select);
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.focus();
            });
            panel.appendChild(item);
        });
        if (!panel.children.length) {
            panel.innerHTML = '<div class="desplegable-vacio">Sin opciones</div>';
        }
    }

    function posicionar(select, panel) {
        var rect = select.getBoundingClientRect();
        var ancho = Math.max(rect.width, 120);
        panel.style.minWidth = ancho + 'px';
        panel.style.maxHeight = '';
        var alto = panel.offsetHeight || panel.scrollHeight || 0;
        var limite = Math.min(340, window.innerHeight * 0.52);
        var espacioAbajo = window.innerHeight - rect.bottom - 8;
        var haciaArriba = espacioAbajo < Math.min(alto, 120) && rect.top > espacioAbajo;
        var maxAlto = haciaArriba ? Math.min(limite, rect.top - 8) : Math.min(limite, espacioAbajo);
        if (alto > maxAlto) panel.style.maxHeight = Math.max(120, maxAlto) + 'px';
        var izquierda = Math.min(Math.max(8, rect.left), window.innerWidth - ancho - 8);
        var arriba = haciaArriba ? Math.max(8, rect.top - Math.min(panel.offsetHeight, maxAlto) - 6) : rect.bottom + 6;
        panel.style.left = izquierda + 'px';
        panel.style.top = arriba + 'px';
        panel.dataset.haciaArriba = haciaArriba ? 'true' : 'false';
    }

    function abrir(select) {
        var panel = panelDe(select);
        if (!panel) return;
        cerrarTodos(sinCerrar(select));
        moverOpciones(select, panel);
        vestirPanel(select, panel);
        panel.dataset.estilo = ESTILO;
        abiertos.set(select, { panel: panel });
        select.classList.add('desplegable-campo-activo');
        panel.classList.remove('cerrando');
        panel.classList.add('abierto');
        posicionar(select, panel);
        var objetivo = panel.querySelector('.desplegable-opcion.seleccionada') || panel.querySelector('.desplegable-opcion:not(.desplegable-grupo)');
        if (objetivo) objetivo.focus();
    }

    function panelDe(select) {
        var panel = select.desplegablePanel;
        if (!panel || !panel.isConnected) {
            panel = document.createElement('div');
            panel.className = 'desplegable-panel';
            panel.dataset.estilo = ESTILO;
            panel.setAttribute('role', 'listbox');
            document.body.appendChild(panel);
            select.desplegablePanel = panel;
        }
        return panel;
    }

    function sinCerrar(excepto) {
        return Array.from(abiertos.keys()).filter(function (select) { return select !== excepto; });
    }

    function cerrar(select) {
        var estado = abiertos.get(select);
        if (!estado) return;
        abiertos.delete(select);
        select.classList.remove('desplegable-campo-activo');
        if (movimientoReducido()) {
            estado.panel.classList.remove('abierto', 'cerrando');
            estado.panel.style.left = '-9999px';
            estado.panel.style.top = '-9999px';
            return;
        }
        estado.panel.classList.remove('abierto');
        estado.panel.classList.add('cerrando');
        window.setTimeout(function () {
            estado.panel.classList.remove('cerrando');
            estado.panel.style.left = '-9999px';
            estado.panel.style.top = '-9999px';
        }, 140);
    }

    function cerrarTodos(lista) {
        (lista || Array.from(abiertos.keys())).forEach(cerrar);
    }

    function preparar(select) {
        if (select.dataset.desplegableListo === 'true') return;
        if (selectoresExcluidos.some(function (selector) {
            try { return select.matches(selector); } catch (_) { return false; }
        })) return;
        select.dataset.desplegableListo = 'true';

        select.addEventListener('mousedown', function (evento) {
            if (!movimientoReducido()) evento.preventDefault();
        });
        select.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'Spacebar') {
                evento.preventDefault();
                if (abiertos.has(select)) cerrar(select); else abrir(select);
                return;
            }
            if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
                evento.preventDefault();
                if (!abiertos.has(select)) abrir(select);
                return;
            }
            if (evento.key === 'Escape' && abiertos.has(select)) {
                evento.stopPropagation();
                cerrar(select);
                select.focus();
            }
        });
        select.addEventListener('click', function () {
            if (movimientoReducido()) return;
            if (abiertos.has(select)) cerrar(select); else abrir(select);
        });
        select.addEventListener('focus', function () {
            if (movimientoReducido()) return;
            if (!abiertos.has(select) && document.activeElement === select) abrir(select);
        });
        select.addEventListener('focus', function () {
            var p = select.desplegablePanel;
            if (p && !p.dataset.teclado) {
                p.dataset.teclado = 'true';
                p.addEventListener('keydown', function (evento) {
                    var items = Array.from(p.querySelectorAll('.desplegable-opcion:not(.desplegable-grupo)'));
                    var actual = items.indexOf(document.activeElement);
                    if (evento.key === 'ArrowDown') {
                        evento.preventDefault();
                        if (actual < items.length - 1) items[actual + 1].focus();
                        return;
                    }
                    if (evento.key === 'ArrowUp') {
                        evento.preventDefault();
                        if (actual > 0) items[actual - 1].focus(); else select.focus();
                    }
                });
            }
        });
    }

    function prepararTodos(raiz) {
        (raiz || document).querySelectorAll('select:not([data-desplegable-listo])').forEach(preparar);
    }

    document.addEventListener('click', function (evento) {
        abiertos.forEach(function (estado, select) {
            if (select.contains(evento.target) || estado.panel.contains(evento.target)) return;
            cerrar(select);
        });
    });

    document.addEventListener('pointerdown', function (evento) {
        abiertos.forEach(function (estado, select) {
            if (select.contains(evento.target) || estado.panel.contains(evento.target)) return;
            cerrar(select);
        });
    }, true);

    window.addEventListener('scroll', function (evento) {
        abiertos.forEach(function (estado, select) {
            if (estado.panel.contains(evento.target)) return;
            cerrar(select);
        });
    }, true);
    window.addEventListener('resize', function () { cerrarTodos(); });

    var observador = new MutationObserver(function () { prepararTodos(); });
    document.addEventListener('DOMContentLoaded', function () {
        prepararTodos();
        observador.observe(document.body, { childList: true, subtree: true });
    });
    if (document.readyState !== 'loading') {
        prepararTodos();
        observador.observe(document.body, { childList: true, subtree: true });
    }

    (function leerExclusiones() {
        var script = document.currentScript || document.querySelector('script[src*="desplegable.js"]');
        var bruto = script ? script.getAttribute('data-desplegable-excluir-selectores') : '';
        selectoresExcluidos = String(bruto || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    })();

    leerConfig();
    aplicarVelocidad();

    window.ERPSelDesplegable = {
        definirEstilo: function (estilo) {
            if (['slide', 'despliegue', 'cascada'].includes(estilo)) {
                ESTILO = estilo;
                guardarConfig();
                aplicarVelocidad();
            }
        },
        definirVelocidad: function (ms) {
            var numero = Number(ms);
            if (Number.isFinite(numero)) {
                VELOCIDAD_MS = Math.max(0, Math.min(numero, 1200));
                guardarConfig();
                aplicarVelocidad();
            }
        },
        prepararTodos: prepararTodos,
        cerrarTodos: cerrarTodos
    };
})();
