(function () {
    'use strict';

    // Aviso global de licenciamiento. Se muestra una sola vez en el shell (dashboard).
    // Fail-open: si el endpoint falla, no se muestra nada y no se bloquea nada.

    var COLORES = {
        AVISO: { bg: '#fff4e0', border: '#f2c37a', text: '#8a5a12' },
        GRACIA: { bg: '#fde8e6', border: '#f0a9a0', text: '#a5342a' },
        RESTRINGIDO: { bg: '#f3e6f7', border: '#d3a9e0', text: '#6a2585' },
        RESCATE: { bg: '#e4f3fb', border: '#a9d4ea', text: '#0b5f87' }
    };

    function render(est) {
        if (!est || !est.mensaje) return;
        var conf = COLORES[est.estado];
        if (!conf) return;

        var prev = document.getElementById('licencia-aviso-bar');
        if (prev) prev.remove();

        var bar = document.createElement('div');
        bar.id = 'licencia-aviso-bar';
        bar.setAttribute('role', 'status');
        bar.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483000',
            'padding:8px 16px', 'font:600 13px/1.4 -apple-system,\"Segoe UI\",Roboto,Arial,sans-serif',
            'text-align:center', 'background:' + conf.bg, 'color:' + conf.text,
            'border-top:1px solid ' + conf.border, 'box-shadow:0 -2px 10px rgba(0,0,0,0.08)'
        ].join(';');
        bar.textContent = est.mensaje;

        if (est.relojDesfasado) {
            var extra = document.createElement('span');
            extra.style.cssText = 'display:block;font-weight:400;font-size:12px;opacity:0.85';
            extra.textContent = 'El reloj del servidor parece atrasado respecto a la última fecha registrada.';
            bar.appendChild(extra);
        }

        document.body.appendChild(bar);
    }

    function consultar() {
        fetch('/api/licenciamiento/estado', { headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (est) {
                if (!est) return;
                try { window.LICENCIA_ESTADO = est; } catch (e) {}
                render(est);
            })
            .catch(function () { /* fail-open */ });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', consultar);
    } else {
        consultar();
    }
    setInterval(consultar, 30 * 60 * 1000);
})();
