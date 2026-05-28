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
        consumptions: document.getElementById('consumptionReport'),
        yields: document.getElementById('yieldReport'),
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
        els.quotes.innerHTML = table([
            { Indicador: 'Total', Valor: num(q.total) },
            { Indicador: 'Aprobadas/Cerradas', Valor: num(q.approved) },
            { Indicador: 'Rechazadas', Valor: num(q.rejected) },
            { Indicador: 'Sin estado', Valor: num(q.without_status) }
        ]);

        const p = reports.production || {};
        els.production.innerHTML = table([
            { Indicador: 'Órdenes', Valor: num(p.total_orders) },
            { Indicador: 'Con procesos completados', Valor: num(p.with_completed_process) },
            { Indicador: 'Activas', Valor: num(p.active_orders) }
        ]);

        const c = reports.costs || {};
        els.costs.innerHTML = table([
            { Indicador: 'Cálculos', Valor: num(c.calculations) },
            { Indicador: 'Costo total', Valor: `$${num(c.total_cost, 2)}` },
            { Indicador: 'Precio unitario promedio', Valor: `$${num(c.avg_unit_price, 4)}` }
        ]);

        const cons = reports.consumptions || {};
        els.consumptions.innerHTML = table([
            { Indicador: 'Solicitudes', Valor: num(cons.total_requests) },
            { Indicador: 'Pendientes SAP', Valor: num(cons.pending) },
            { Indicador: 'Enviadas SAP', Valor: num(cons.sent) },
            { Indicador: 'Con error', Valor: num(cons.errors) },
            { Indicador: 'Cantidad solicitada', Valor: num(cons.quantity, 2) }
        ]);

        const y = reports.yields || {};
        els.yields.innerHTML = table([
            { Indicador: 'Pies consumidos', Valor: num(y.feet_consumed, 2) },
            { Indicador: 'Pies útiles', Valor: num(y.useful_feet, 2) },
            { Indicador: 'Merma', Valor: num(y.waste_feet, 2) },
            { Indicador: 'Rendimiento', Valor: `${num(y.yieldPct, 2)}%` }
        ]);

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
