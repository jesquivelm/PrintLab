const API = '/api/vendedores';

function sessionHeaders() {
  const session = window.ErpAccess ? window.ErpAccess.readSession() : null;
  if (!session) return {};
  return { 'x-erp-session': JSON.stringify({ username: session.username || '', name: session.name || '', permissionName: session.permissionName || '' }) };
}

function money(value) {
  const n = Number(value || 0);
  return '$' + n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function monthLabel(mesKey) {
  if (!mesKey) return '—';
  const [year, month] = mesKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'short' });
}

function statusPill(status) {
  const normalized = String(status || '').trim().toLowerCase();
  let cls = 'amber';
  if (['produccion', 'en produccion', 'impresion', 'en proceso'].some((s) => normalized.includes(s))) cls = 'green';
  if (['retraso', 'atrasada', 'paro'].some((s) => normalized.includes(s))) cls = 'red';
  return `<span class="pill ${cls}">${status ? esc(status) : 'Sin estado'}</span>`;
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="empty">${esc(message)}</td></tr>`;
}

function currentMonthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthTotal(rows, mesKey) {
  const row = (rows || []).find((r) => r.mes === mesKey);
  return row ? Number(row.monto || 0) : 0;
}

function renderKpis(data) {
  const grid = document.getElementById('kpiGrid');
  const thisMonth = currentMonthKey(0);
  const lastMonth = currentMonthKey(-1);

  const cotizadoNow = monthTotal(data.ventasMensuales.cotizadoAceptado, thisMonth);
  const cotizadoPrev = monthTotal(data.ventasMensuales.cotizadoAceptado, lastMonth);
  const facturadoNow = monthTotal(data.ventasMensuales.facturado, thisMonth);
  const facturadoPrev = monthTotal(data.ventasMensuales.facturado, lastMonth);

  const deltaHtml = (now, prev) => {
    if (prev <= 0) return '';
    const pct = ((now - prev) / prev) * 100;
    const dir = pct >= 0 ? 'up' : 'down';
    const arrow = pct >= 0 ? '▲' : '▼';
    return `<div class="kpi-delta ${dir}">${arrow} ${Math.abs(pct).toFixed(1)}% vs. mes anterior</div>`;
  };

  const cards = [
    { label: 'Cotizado / Aceptado — Este Mes', val: money(cotizadoNow), delta: deltaHtml(cotizadoNow, cotizadoPrev) },
    { label: 'Facturado Real — Este Mes', val: money(facturadoNow), delta: deltaHtml(facturadoNow, facturadoPrev) },
    { label: 'Órdenes en Proceso', val: String(data.ordenesEnProceso.length), delta: '' },
    { label: 'Leads Activos', val: String(data.leads.length), delta: '' }
  ];

  grid.innerHTML = cards.map((c) => `
    <div class="kpi-card">
      <div class="kpi-label">${esc(c.label)}</div>
      <div class="kpi-val">${c.val}</div>
      ${c.delta}
    </div>
  `).join('');
}

function renderOrdenes(rows) {
  const body = document.getElementById('ordenesBody');
  if (!rows.length) { body.innerHTML = emptyRow(4, 'Sin órdenes en proceso.'); return; }
  body.innerHTML = rows.map((o) => `
    <tr>
      <td>${esc(o.order_code)}</td>
      <td>${esc(o.customer_name || '—')}</td>
      <td>${statusPill(o.order_status)}</td>
      <td>${shortDate(o.created_at)}</td>
    </tr>
  `).join('');
}

function renderSeguimiento(rows) {
  const body = document.getElementById('seguimientoBody');
  if (!rows.length) { body.innerHTML = emptyRow(3, 'No hay cotizaciones esperando seguimiento.'); return; }
  body.innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(r.quote_code)} ${esc(r.line_code || '')}</td>
      <td>${esc(r.customer_name || '—')}</td>
      <td>${shortDate(r.enviada_en)}</td>
    </tr>
  `).join('');
}

function renderFacturas(rows) {
  const body = document.getElementById('facturasBody');
  if (!rows.length) { body.innerHTML = emptyRow(5, 'Sin facturas registradas.'); return; }
  body.innerHTML = rows.map((f) => `
    <tr>
      <td>${esc(f.doc_num)}</td>
      <td>${esc(f.card_name || '—')}</td>
      <td>${shortDate(f.fecha)}</td>
      <td>${money(f.doc_total)}</td>
      <td>${esc(f.document_status || '—')}</td>
    </tr>
  `).join('');
}

function renderTopClientes(rows) {
  const body = document.getElementById('topClientesBody');
  if (!rows.length) { body.innerHTML = emptyRow(3, 'Sin facturación reciente.'); return; }
  body.innerHTML = rows.map((c) => `
    <tr>
      <td>${esc(c.partner_name || c.partner_code || '—')}</td>
      <td>${esc(c.facturas)}</td>
      <td>${money(c.total)}</td>
    </tr>
  `).join('');
}

function renderLeads(rows) {
  const body = document.getElementById('leadsBody');
  if (!rows.length) { body.innerHTML = emptyRow(4, 'Sin prospectos asignados.'); return; }
  body.innerHTML = rows.map((l) => `
    <tr>
      <td>${esc(l.partner_code)}</td>
      <td>${esc(l.partner_name || '—')}</td>
      <td>${esc(l.email || '—')}</td>
      <td>${shortDate(l.created_at)}</td>
    </tr>
  `).join('');
}

async function loadDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, { headers: sessionHeaders() });
    const data = await res.json();
    if (!data.isVendedor) {
      document.getElementById('topSub').textContent = 'Tu usuario no tiene un vendedor SAP asignado. Contacta a un administrador.';
      return;
    }
    document.getElementById('topSub').textContent = `Vendedor: ${data.salespersonName}`;
    renderKpis(data);
    renderOrdenes(data.ordenesEnProceso);
    renderSeguimiento(data.cotizacionesPendientesSeguimiento);
    renderFacturas(data.facturas);
    renderTopClientes(data.topClientes);
    renderLeads(data.leads);
  } catch (error) {
    document.getElementById('topSub').textContent = 'No fue posible cargar el dashboard.';
  }
}

loadDashboard();
