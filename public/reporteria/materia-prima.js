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
        composicionChart: document.getElementById('composicionChart'),
        precioComposicion: document.getElementById('precioComposicion'),
        componentesTable: document.getElementById('componentesTable'),
        productoTable: document.getElementById('productoTable'),
        mesTable: document.getElementById('mesTable')
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

    function render(data) {
        const k = data.kpis || {};
        const maximoMp = k.materiaPrimaMaximaPct;
        const pctMp = (valor) => (valor != null && maximoMp != null && valor > maximoMp ? `${pct(valor)} · Supera ${Number(maximoMp).toLocaleString('es-CR', { maximumFractionDigits: 0 })}%` : pct(valor));
        els.kpis.innerHTML = [
            ['Líneas', String(k.lineas || 0)],
            ['Valor Cotizado', money(k.venta)],
            ['Materia Prima Total', money(k.materiaPrima)],
            ['% Materia Prima sobre Venta', pctMp(k.materiaPrimaPct)]
        ].map(([label, value]) => `<article class="report-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');

        const componentes = data.componentes || [];
        els.composicionChart.innerHTML = barChart(componentes.map((row) => ({
            label: row.label,
            value: row.pct == null ? 0 : row.pct,
            suffix: pct(row.pct)
        })));

        const resto = Number(k.venta || 0) - Number(k.materiaPrima || 0);
        els.precioComposicion.innerHTML = metricStack([
            { label: 'Materia prima', value: `${money(k.materiaPrima)} (${pctMp(k.materiaPrimaPct)})` },
            { label: 'Resto (conversión, procesos, utilidad bruta)', value: money(resto > 0 ? resto : 0) },
            { label: 'Precio de venta', value: money(k.venta) }
        ]);

        els.componentesTable.innerHTML = table(componentes.map((row) => ({
            'Componente': row.label,
            'Monto': money(row.monto),
            '% sobre Venta': pct(row.pct)
        })));

        els.productoTable.innerHTML = table((data.porProducto || []).map((row) => ({
            'Producto': row.producto,
            'Nombre': row.nombre || '—',
            'Líneas': row.lineas,
            'Valor Cotizado': money(row.venta),
            'Materia Prima': money(row.materiaPrima),
            '% MP': pctMp(row.materiaPrimaPct)
        })));

        els.mesTable.innerHTML = table((data.porMes || []).map((row) => ({
            'Mes': row.mes,
            'Valor Cotizado': money(row.venta),
            'Materia Prima': money(row.materiaPrima),
            '% MP': pctMp(row.materiaPrimaPct)
        })));

        els.status.textContent = `Actualizado ${new Date().toLocaleString('es-CR')}`;
    }

    async function load() {
        const params = new URLSearchParams();
        if (els.dateFrom.value) params.set('dateFrom', els.dateFrom.value);
        if (els.dateTo.value) params.set('dateTo', els.dateTo.value);
        if (els.vendedor.value.trim()) params.set('vendedor', els.vendedor.value.trim());
        if (els.cliente.value.trim()) params.set('cliente', els.cliente.value.trim());
        if (els.producto.value.trim()) params.set('producto', els.producto.value.trim());
        els.status.textContent = 'Cargando reportería...';
        const response = await fetch(`/api/reporterias/materia-prima?${params.toString()}`);
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
