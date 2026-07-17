(function () {
    const els = {
        form: document.getElementById('reportFilters'),
        dateFrom: document.getElementById('dateFrom'),
        dateTo: document.getElementById('dateTo'),
        status: document.getElementById('reportStatus'),
        kpis: document.getElementById('kpiGrid'),
        quotes: document.getElementById('quotesReport'),
        production: document.getElementById('productionReport'),
        costs: document.getElementById('costReport'),
        costSummary: document.getElementById('costSummaryPanel'),
        consumptions: document.getElementById('consumptionReport'),
        yields: document.getElementById('yieldReport'),
        salesTrend: document.getElementById('salesTrendChart'),
        quoteStatus: document.getElementById('quoteStatusChart'),
        productionLoad: document.getElementById('productionLoadChart'),
        machineLoad: document.getElementById('machineLoadChart'),
        inkConsumption: document.getElementById('inkConsumptionChart'),
        yieldMeter: document.getElementById('yieldMeter'),
        dieUsage: document.getElementById('dieUsageChart'),
        orderStatus: document.getElementById('orderStatusReport'),
        audit: document.getElementById('auditReport')
    };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function num(value, decimals = 0) {
        const numeric = Number(value || 0);
        return numeric.toLocaleString('es-CR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function table(rows) {
        if (!rows.length) return '<div class="report-status">Sin datos para mostrar.</div>';
        const headers = Object.keys(rows[0]);
        return `<table><thead><tr>${headers.map((key) => `<th>${esc(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((key) => `<td>${esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }

    function chartValue(row) {
        return Number(row.hours || row.quantity || row.total || row.orders || row.requests || row.cost || 0);
    }

    function barChart(rows, options = {}) {
        const data = (rows || []).filter((row) => chartValue(row) > 0).slice(0, options.limit || 10);
        if (!data.length) return '<div class="report-empty">Sin datos para graficar.</div>';
        const max = Math.max(...data.map(chartValue), 1);
        return data.map((row, index) => {
            const value = chartValue(row);
            const pct = Math.max(4, Math.round((value / max) * 100));
            const label = row.label || row.process_name || row.process_key || 'Sin dato';
            const suffix = row.hours ? `${num(row.hours, 2)} h` : row.quantity ? num(row.quantity, 2) : num(value);
            return `
                <div class="report-bar-row" style="--bar-pct:${pct}%;--bar-accent:var(--report-accent-${(index % 6) + 1});">
                    <span class="report-bar-label" title="${esc(label)}">${esc(label)}</span>
                    <span class="report-bar-track"><span class="report-bar-fill"></span></span>
                    <strong>${esc(suffix)}</strong>
                </div>
            `;
        }).join('');
    }

    function columnChart(rows) {
        const data = (rows || []).filter((row) => chartValue(row) > 0).slice(0, 14);
        if (!data.length) return '<div class="report-empty">Sin datos para graficar.</div>';
        const max = Math.max(...data.map(chartValue), 1);
        return data.map((row, index) => {
            const value = chartValue(row);
            const pct = Math.max(5, Math.round((value / max) * 100));
            return `
                <div class="report-column" style="--bar-pct:${pct}%;--bar-accent:var(--report-accent-${(index % 6) + 1});">
                    <span>${esc(num(value))}</span>
                    <i></i>
                    <small>${esc(row.label || '')}</small>
                </div>
            `;
        }).join('');
    }

    function metricStack(rows) {
        return rows.map((row) => `<div class="report-metric-row"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join('');
    }

    function renderYieldMeter(value) {
        const safe = Math.max(0, Math.min(100, Number(value || 0)));
        return `<div class="report-meter"><span style="--meter-pct:${safe}%"></span></div><strong>${num(safe, 2)}% rendimiento</strong>`;
    }

    function render(data) {
        const reports = data.reports || {};
        const initial = reports.initial || {};
        els.kpis.innerHTML = [
            ['Cotizaciones', num(initial.quotes)],
            ['Órdenes', num(initial.orders)],
            ['Órdenes activas', num(initial.activeOrders)],
            ['Consumos SAP pendientes', num(initial.pendingSapConsumptions)]
        ].map(([label, value]) => `<article class="report-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');

        const q = reports.quotations || {};
        els.salesTrend.innerHTML = columnChart(reports.quoteTrend || []);
        els.quoteStatus.innerHTML = barChart(reports.quoteStatus || [], { limit: 8 });
        els.quotes.innerHTML = table([
            { Indicador: 'Total', Valor: num(q.total) },
            { Indicador: 'Aprobadas/Cerradas', Valor: num(q.approved) },
            { Indicador: 'Rechazadas', Valor: num(q.rejected) },
            { Indicador: 'Sin estado', Valor: num(q.without_status) }
        ]);

        const p = reports.production || {};
        els.productionLoad.innerHTML = barChart(reports.processLoad || []);
        els.production.innerHTML = table([
            { Indicador: 'Órdenes', Valor: num(p.total_orders) },
            { Indicador: 'Con procesos completados', Valor: num(p.with_completed_process) },
            { Indicador: 'Activas', Valor: num(p.active_orders) }
        ]);

        const c = reports.costs || {};
        els.machineLoad.innerHTML = barChart(reports.machineLoad || []);
        els.costSummary.innerHTML = metricStack([
            { label: 'Cálculos', value: num(c.calculations) },
            { label: 'Costo total', value: `$${num(c.total_cost, 2)}` },
            { label: 'Unitario promedio', value: `$${num(c.avg_unit_price, 4)}` }
        ]);
        els.costs.innerHTML = table([
            { Indicador: 'Cálculos', Valor: num(c.calculations) },
            { Indicador: 'Costo total', Valor: `$${num(c.total_cost, 2)}` },
            { Indicador: 'Precio unitario promedio', Valor: `$${num(c.avg_unit_price, 4)}` }
        ]);

        const cons = reports.consumptions || {};
        els.inkConsumption.innerHTML = barChart(reports.inkConsumption?.length ? reports.inkConsumption : reports.materialFamily || []);
        els.consumptions.innerHTML = table([
            { Indicador: 'Solicitudes', Valor: num(cons.total_requests) },
            { Indicador: 'Pendientes SAP', Valor: num(cons.pending) },
            { Indicador: 'Enviadas SAP', Valor: num(cons.sent) },
            { Indicador: 'Con error', Valor: num(cons.errors) },
            { Indicador: 'Cantidad solicitada', Valor: num(cons.quantity, 2) }
        ]);

        const y = reports.yields || {};
        els.yieldMeter.innerHTML = renderYieldMeter(y.yieldPct);
        els.yields.innerHTML = table([
            { Indicador: 'Pies consumidos', Valor: num(y.feet_consumed, 2) },
            { Indicador: 'Pies útiles', Valor: num(y.useful_feet, 2) },
            { Indicador: 'Merma', Valor: num(y.waste_feet, 2) },
            { Indicador: 'Rendimiento', Valor: `${num(y.yieldPct, 2)}%` }
        ]);

        els.dieUsage.innerHTML = barChart(reports.dieUsage || []);
        els.orderStatus.innerHTML = table((reports.orderStatus || []).map((row) => ({
            Proceso: row.process_name || row.process_key || '',
            Estado: row.route_status || '',
            Total: num(row.total)
        })));

        els.audit.innerHTML = table((reports.audit || []).map((row) => ({
            Módulo: row.module_key || 'Sin módulo',
            Cambios: num(row.total)
        })));

        els.status.textContent = `Actualizado ${new Date().toLocaleString('es-CR')}`;
    }

    async function load() {
        const params = new URLSearchParams();
        if (els.dateFrom.value) params.set('dateFrom', els.dateFrom.value);
        if (els.dateTo.value) params.set('dateTo', els.dateTo.value);
        els.status.textContent = 'Cargando reportería...';
        const response = await fetch(`/api/reporterias/gerencial?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'No fue posible cargar la reportería.');
        render(payload);
    }

    els.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        load().catch((error) => {
            els.status.textContent = error.message;
        });
    });

    load().catch((error) => {
        els.status.textContent = error.message;
    });
})();
