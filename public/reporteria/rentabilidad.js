(function () {
    const els = {
        form: document.getElementById('reportFilters'),
        dateFrom: document.getElementById('dateFrom'),
        dateTo: document.getElementById('dateTo'),
        vendedor: document.getElementById('vendedor'),
        cliente: document.getElementById('cliente'),
        producto: document.getElementById('producto'),
        status: document.getElementById('reportStatus'),
        kpis: document.getElementById('kpiGrid'),
        estructuraStack: document.getElementById('estructuraStack'),
        margenMesChart: document.getElementById('margenMesChart'),
        mesTable: document.getElementById('mesTable'),
        rankingTopTable: document.getElementById('rankingTopTable'),
        rankingBottomTable: document.getElementById('rankingBottomTable'),
        lineasTable: document.getElementById('lineasTable')
    };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function money(value) {
        return '$' + Number(value || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function pct(value) {
        return value == null ? 'Datos insuficientes' : Number(value).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
    }

    function pctMateriaPrima(row, maximo) {
        const texto = pct(row.materiaPrimaPct);
        return row.superaMateriaPrima ? `${texto} · Supera ${num(maximo)}%` : texto;
    }

    function num(value) {
        return Number(value || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 });
    }

    function table(rows) {
        if (!rows.length) return '<div class="report-empty">Sin datos para mostrar.</div>';
        const headers = Object.keys(rows[0]);
        return `<table><thead><tr>${headers.map((key) => `<th>${esc(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((key) => `<td>${esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }

    function barChart(rows) {
        const data = (rows || []).filter((row) => Number(row.value) > 0);
        if (!data.length) return '<div class="report-empty">Sin datos para graficar.</div>';
        const max = Math.max(...data.map((row) => Number(row.value)), 1);
        return data.map((row, index) => {
            const barPct = Math.max(4, Math.round((Number(row.value) / max) * 100));
            return `
                <div class="report-bar-row" style="--bar-pct:${barPct}%;--bar-accent:var(--report-accent-${(index % 6) + 1});">
                    <span class="report-bar-label" title="${esc(row.label)}">${esc(row.label)}</span>
                    <span class="report-bar-track"><span class="report-bar-fill"></span></span>
                    <strong>${esc(row.suffix)}</strong>
                </div>`;
        }).join('');
    }

    function metricStack(rows) {
        return rows.map((row) => `<div class="report-metric-row"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join('');
    }

    function rankingRows(rows, maximo) {
        return (rows || []).map((row) => ({
            'Cotización': `${row.quoteCode || ''} / ${row.lineCode || ''}`,
            'Cliente': row.cliente,
            'Vendedor': row.vendedor,
            'Valor': money(row.venta),
            'Utilidad Bruta %': pct(row.margenPct),
            '% MP': pctMateriaPrima(row, maximo)
        }));
    }

    function render(data) {
        const k = data.kpis || {};
        const maximoMp = k.materiaPrimaMaximaPct;
        const superaMpTotal = k.materiaPrimaPct != null && k.materiaPrimaPct > maximoMp;
        els.kpis.innerHTML = [
            ['Líneas', num(k.lineas)],
            ['Valor Cotizado', money(k.venta)],
            ['Costo Total', money(k.costo)],
            ['Utilidad Bruta', money(k.utilidad)],
            ['Utilidad Bruta Promedio', pct(k.margenPct)],
            ['Markup Promedio', pct(k.markupPct)],
            ['% Materia Prima', pctMateriaPrima({ materiaPrimaPct: k.materiaPrimaPct, superaMateriaPrima: superaMpTotal }, maximoMp)],
            ['% Costo de Conversión', pct(k.costoConversionPct)]
        ].map(([label, value]) => `<article class="report-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');

        els.estructuraStack.innerHTML = metricStack([
            { label: 'Precio de venta', value: money(k.venta) },
            { label: 'Materia prima', value: `${money(k.materiaPrima)} (${pctMateriaPrima({ materiaPrimaPct: k.materiaPrimaPct, superaMateriaPrima: superaMpTotal }, maximoMp)})` },
            { label: 'Costo de conversión', value: money(Number(k.costoDirecto || 0) - Number(k.materiaPrima || 0)) },
            { label: 'Gastos generales (overhead)', value: money(k.overhead) },
            { label: 'Costo total', value: money(k.costo) },
            { label: 'Utilidad bruta', value: money(k.utilidad) }
        ]);

        els.margenMesChart.innerHTML = barChart((data.porMes || []).map((row) => ({
            label: row.mes,
            value: row.margenPct == null ? 0 : row.margenPct,
            suffix: pct(row.margenPct)
        })));

        els.mesTable.innerHTML = table((data.porMes || []).map((row) => ({
            'Mes': row.mes,
            'Venta': money(row.venta),
            'Costo': money(row.costo),
            'Utilidad': money(row.utilidad),
            'Utilidad Bruta %': pct(row.margenPct),
            '% MP': pctMateriaPrima(row, maximoMp)
        })));

        els.rankingTopTable.innerHTML = table(rankingRows(data.rankingTop, maximoMp));
        els.rankingBottomTable.innerHTML = table(rankingRows(data.rankingBottom, maximoMp));

        els.lineasTable.innerHTML = table((data.lineas || []).map((row) => ({
            'Cotización': `${row.quoteCode || ''} / ${row.lineCode || ''}`,
            'Cliente': row.cliente,
            'Vendedor': row.vendedor,
            'Trabajo': row.trabajo,
            'Cantidad': num(row.cantidad),
            'Venta': money(row.venta),
            'Costo': money(row.costo),
            'Utilidad': money(row.utilidad),
            'Utilidad Bruta %': pct(row.margenPct),
            'Markup %': pct(row.markupPct),
            '% MP': pctMateriaPrima(row, maximoMp)
        })));

        marcarFilasConCalculo(els.rankingTopTable, data.rankingTop || []);
        marcarFilasConCalculo(els.rankingBottomTable, data.rankingBottom || []);
        marcarFilasConCalculo(els.lineasTable, data.lineas || []);

        els.status.textContent = `Actualizado ${new Date().toLocaleString('es-CR')}`;
    }

    // Marca la primera celda ("Cotización") de cada fila como abridora del cálculo en ventana.
    function marcarFilasConCalculo(container, rows) {
        if (!container || !Array.isArray(rows)) return;
        const filas = container.querySelectorAll('tbody tr');
        filas.forEach((tr, index) => {
            const row = rows[index];
            const celda = tr.children[0];
            if (!row || !celda) return;
            const quoteCode = String(row.quoteCode || '').trim();
            const lineCode = String(row.lineCode || '').trim();
            if (!quoteCode || !lineCode) return;
            celda.classList.add('report-cell-link');
            celda.setAttribute('role', 'button');
            celda.setAttribute('tabindex', '0');
            celda.dataset.quote = quoteCode;
            celda.dataset.line = lineCode;
            celda.title = 'Abrir cálculo en ventana';
        });
    }

    // --- Ventana flotante arrastrable con el cálculo real (mismo patrón de arrastre que
    // notification-chat-widget.js: offset en mousedown, clamp al viewport, limpieza en mouseup). ---
    let ventanaCalculo = null;
    let arrastreCalculo = null;

    function rutaCalculo(quoteCode, lineCode) {
        return `/calculo-flexografia?${new URLSearchParams({ lineId: lineCode, quoteId: quoteCode, department: 'Flexografia' }).toString()}`;
    }

    function cerrarVentanaCalculo() {
        if (ventanaCalculo) { ventanaCalculo.remove(); ventanaCalculo = null; }
        arrastreCalculo = null;
        document.removeEventListener('mousemove', moverVentanaCalculo);
        document.removeEventListener('mouseup', soltarVentanaCalculo);
        document.removeEventListener('keydown', teclaVentanaCalculo);
    }

    function teclaVentanaCalculo(event) {
        if (event.key === 'Escape') cerrarVentanaCalculo();
    }

    function moverVentanaCalculo(event) {
        if (!arrastreCalculo || !ventanaCalculo) return;
        const maxX = Math.max(8, window.innerWidth - ventanaCalculo.offsetWidth - 8);
        const maxY = Math.max(8, window.innerHeight - ventanaCalculo.offsetHeight - 8);
        ventanaCalculo.style.left = `${Math.min(Math.max(8, event.clientX - arrastreCalculo.dx), maxX)}px`;
        ventanaCalculo.style.top = `${Math.min(Math.max(8, event.clientY - arrastreCalculo.dy), maxY)}px`;
        ventanaCalculo.style.right = 'auto';
        ventanaCalculo.style.transform = 'none';
    }

    function soltarVentanaCalculo() {
        arrastreCalculo = null;
        ventanaCalculo?.classList.remove('is-dragging');
    }

    function iniciarArrastreCalculo(event) {
        if (event.button !== 0 || !ventanaCalculo) return;
        if (event.target.closest('button, a')) return;
        const rect = ventanaCalculo.getBoundingClientRect();
        ventanaCalculo.style.left = `${rect.left}px`;
        ventanaCalculo.style.top = `${rect.top}px`;
        ventanaCalculo.style.transform = 'none';
        arrastreCalculo = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
        ventanaCalculo.classList.add('is-dragging');
        event.preventDefault();
    }

    function abrirVentanaCalculo(quoteCode, lineCode) {
        const qc = String(quoteCode || '').trim();
        const lc = String(lineCode || '').trim();
        if (!qc || !lc) return;
        cerrarVentanaCalculo();
        const ruta = rutaCalculo(qc, lc);
        const win = document.createElement('section');
        win.className = 'calc-window';
        win.innerHTML = `
            <header class="calc-window-head" data-calc-drag>
                <span class="calc-window-title">Cálculo ${esc(qc)} / ${esc(lc)}</span>
                <button type="button" class="calc-window-open">Abrir en pestaña</button>
                <button type="button" class="calc-window-close" aria-label="Cerrar">&times;</button>
            </header>
            <div class="calc-window-body">
                <iframe class="calc-window-frame" title="Cálculo ${esc(qc)} / ${esc(lc)}" src="${esc(ruta)}"></iframe>
            </div>`;
        document.body.appendChild(win);
        ventanaCalculo = win;
        win.querySelector('.calc-window-close').addEventListener('click', cerrarVentanaCalculo);
        win.querySelector('.calc-window-open').addEventListener('click', () => {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'erp-open-tab', route: ruta, label: `Cálculo ${qc}/${lc}` }, window.location.origin);
            } else {
                window.open(ruta, '_blank', 'noopener');
            }
            cerrarVentanaCalculo();
        });
        win.querySelector('[data-calc-drag]').addEventListener('mousedown', iniciarArrastreCalculo);
        document.addEventListener('mousemove', moverVentanaCalculo);
        document.addEventListener('mouseup', soltarVentanaCalculo);
        document.addEventListener('keydown', teclaVentanaCalculo);
    }

    document.addEventListener('click', (event) => {
        const celda = event.target.closest('.report-cell-link');
        if (celda) abrirVentanaCalculo(celda.dataset.quote, celda.dataset.line);
    });
    document.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.classList?.contains('report-cell-link')) {
            event.preventDefault();
            abrirVentanaCalculo(event.target.dataset.quote, event.target.dataset.line);
        }
    });

    async function load() {
        const params = new URLSearchParams();
        if (els.dateFrom.value) params.set('dateFrom', els.dateFrom.value);
        if (els.dateTo.value) params.set('dateTo', els.dateTo.value);
        if (els.vendedor.value.trim()) params.set('vendedor', els.vendedor.value.trim());
        if (els.cliente.value.trim()) params.set('cliente', els.cliente.value.trim());
        if (els.producto.value.trim()) params.set('producto', els.producto.value.trim());
        els.status.textContent = 'Cargando reportería...';
        const response = await fetch(`/api/reporterias/rentabilidad?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'No fue posible cargar la reportería.');
        render(payload);
    }

    els.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        load().catch((error) => { els.status.textContent = error.message; });
    });

    load().catch((error) => { els.status.textContent = error.message; });
})();
