/* Panel de Vendedor ("Tu actividad") en el dashboard principal.
   Se muestra únicamente si /api/vendedores/dashboard responde isVendedor:true —
   es decir, únicamente a usuarios con nombre de vendedor (sap_salesperson_name)
   asignado. Reutiliza sessionHeaders()/escapeHtml() ya definidos en dashboard.js.
   loadDashboardVendorPanel() se reexpone como window.dvpReload() para que
   dashboard.js la vuelva a llamar cuando cambia el vendedor previsualizado. */

function dvpMoney(value) {
  const n = Number(value || 0);
  return '$' + Math.round(n).toLocaleString('es-CR');
}

function dvpShortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function dvpCurrentMonthKey(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function dvpMonthTotal(rows, mesKey) {
  const row = (rows || []).find((r) => r.mes === mesKey);
  return row ? Number(row.monto || 0) : 0;
}

function dvpDeltaPct(now, prev) {
  return prev ? ((now - prev) / prev) * 100 : 0;
}

function dvpDeltaHtml(pct) {
  const dir = pct >= 0 ? 'up' : 'down';
  const arrow = pct >= 0 ? '▲' : '▼';
  return '<span class="delta ' + dir + '">' + arrow + ' ' + Math.abs(pct).toFixed(0) + '%</span>';
}

function dvpInitials(s) {
  return String(s || '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function dvpGotoBtn(href, label) {
  return '<a class="dvp-goto" href="' + href + '" data-route="' + href + '" data-label="' + escapeHtml(label || 'Documento') + '" title="Ir al documento">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M9 6l6 6-6 6"/></svg></a>';
}

// Ruta real del calculo de una linea de cotizacion, mismo patron que
// public/reporteria/rentabilidad.js → rutaCalculo().
function dvpRutaCalculo(quoteCode, lineCode) {
  return '/calculo-flexografia?' + new URLSearchParams({ lineId: lineCode || '', quoteId: quoteCode || '', department: 'Flexografia' }).toString();
}

function dvpModalBtn(route, label) {
  return '<button type="button" class="dvp-goto-modal" data-route="' + escapeHtml(route) + '" data-label="' + escapeHtml(label || 'Documento') + '" title="Ver">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M9 6l6 6-6 6"/></svg></button>';
}

// Ventana flotante arrastrable/redimensionable (misma mecanica que
// public/reporteria/rentabilidad.js → abrirVentanaCalculo, reutilizando la
// clase .calc-window de public/styles.css).
let dvpFloatWin = null;
let dvpFloatDrag = null;

function dvpCloseFloatWindow() {
  if (dvpFloatWin) { dvpFloatWin.remove(); dvpFloatWin = null; }
  dvpFloatDrag = null;
  document.removeEventListener('mousemove', dvpMoveFloatWindow);
  document.removeEventListener('mouseup', dvpDropFloatWindow);
  document.removeEventListener('keydown', dvpFloatWindowKeydown);
}

function dvpFloatWindowKeydown(event) {
  if (event.key === 'Escape') dvpCloseFloatWindow();
}

function dvpMoveFloatWindow(event) {
  if (!dvpFloatDrag || !dvpFloatWin) return;
  const maxX = Math.max(8, window.innerWidth - dvpFloatWin.offsetWidth - 8);
  const maxY = Math.max(8, window.innerHeight - dvpFloatWin.offsetHeight - 8);
  dvpFloatWin.style.left = Math.min(Math.max(8, event.clientX - dvpFloatDrag.dx), maxX) + 'px';
  dvpFloatWin.style.top = Math.min(Math.max(8, event.clientY - dvpFloatDrag.dy), maxY) + 'px';
  dvpFloatWin.style.right = 'auto';
  dvpFloatWin.style.transform = 'none';
}

function dvpDropFloatWindow() {
  dvpFloatDrag = null;
  dvpFloatWin?.classList.remove('is-dragging');
}

function dvpStartDragFloatWindow(event) {
  if (event.button !== 0 || !dvpFloatWin) return;
  if (event.target.closest('button, a')) return;
  const rect = dvpFloatWin.getBoundingClientRect();
  dvpFloatWin.style.left = rect.left + 'px';
  dvpFloatWin.style.top = rect.top + 'px';
  dvpFloatWin.style.transform = 'none';
  dvpFloatDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
  dvpFloatWin.classList.add('is-dragging');
  event.preventDefault();
}

function dvpOpenFloatWindow(route, title) {
  if (!route) return;
  dvpCloseFloatWindow();
  const win = document.createElement('section');
  win.className = 'calc-window';
  win.innerHTML =
    '<header class="calc-window-head" data-dvp-drag>' +
      '<span class="calc-window-title">' + escapeHtml(title) + '</span>' +
      '<button type="button" class="calc-window-open">Abrir en pestaña</button>' +
      '<button type="button" class="calc-window-close" aria-label="Cerrar">&times;</button>' +
    '</header>' +
    '<div class="calc-window-body">' +
      '<iframe class="calc-window-frame" title="' + escapeHtml(title) + '" src="' + escapeHtml(route) + '"></iframe>' +
    '</div>';
  document.body.appendChild(win);
  dvpFloatWin = win;
  win.querySelector('.calc-window-close').addEventListener('click', dvpCloseFloatWindow);
  win.querySelector('.calc-window-open').addEventListener('click', () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'erp-open-tab', route, label: title }, window.location.origin);
    } else {
      window.open(route, '_blank', 'noopener');
    }
    dvpCloseFloatWindow();
  });
  win.querySelector('[data-dvp-drag]').addEventListener('mousedown', dvpStartDragFloatWindow);
  document.addEventListener('mousemove', dvpMoveFloatWindow);
  document.addEventListener('mouseup', dvpDropFloatWindow);
  document.addEventListener('keydown', dvpFloatWindowKeydown);
}

function dvpSparkPath(values, w, h) {
  const max = Math.max(...values), min = Math.min(...values);
  const n = values.length;
  const pts = values.map((v, i) => [(i / (n - 1)) * w, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
  let d = 'M ' + pts[0][0] + ',' + pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1];
    const mx = (x0 + x1) / 2;
    d += ' C ' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1;
  }
  return d;
}

function dvpKpiCardHtml(label, val, deltaPctVal, series, color) {
  const w = 190, h = 30;
  const d = dvpSparkPath(series, w, h);
  const dir = deltaPctVal >= 0 ? 'up' : 'down';
  const arrow = deltaPctVal >= 0 ? '▲' : '▼';
  const gid = 'dvpsg' + Math.random().toString(36).slice(2, 8);
  return '<div class="dvp-kpi-card">' +
    '<div class="dvp-kpi-label">' + escapeHtml(label) + '</div>' +
    '<div class="dvp-kpi-val">' + val + '</div>' +
    '<div class="dvp-kpi-delta ' + dir + '">' + arrow + ' ' + Math.abs(deltaPctVal).toFixed(1) + '% vs. mes anterior</div>' +
    '<svg class="dvp-kpi-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.35"/>' +
    '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + d + ' L ' + w + ',' + h + ' L 0,' + h + ' Z" fill="url(#' + gid + ')" stroke="none"/>' +
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>' +
    '</svg></div>';
}

let dvpData = null;
let dvpRange = 'month';
const DVP_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function dvpMonthlySeries(rows, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = dvpCurrentMonthKey(-i);
    out.push({ key, label: DVP_MONTHS[Number(key.split('-')[1]) - 1], val: dvpMonthTotal(rows, key) });
  }
  return out;
}

function dvpYearlySeries(rows) {
  const byYear = {};
  (rows || []).forEach((r) => {
    const year = String(r.mes || '').slice(0, 4);
    if (!year) return;
    byYear[year] = (byYear[year] || 0) + Number(r.monto || 0);
  });
  return Object.keys(byYear).sort().map((year) => ({ key: year, label: year, val: byYear[year] }));
}

function dvpRenderKpis() {
  const thisM = dvpCurrentMonthKey(0), lastM = dvpCurrentMonthKey(-1);
  const cotNow = dvpMonthTotal(dvpData.ventasMensuales.cotizadoAceptado, thisM);
  const cotPrev = dvpMonthTotal(dvpData.ventasMensuales.cotizadoAceptado, lastM);
  const facNow = dvpMonthTotal(dvpData.ventasMensuales.facturado, thisM);
  const facPrev = dvpMonthTotal(dvpData.ventasMensuales.facturado, lastM);
  const cs = getComputedStyle(document.documentElement);
  const primary = cs.getPropertyValue('--app-primary').trim() || '#0277a9';
  const accent = cs.getPropertyValue('--app-accent').trim() || '#fbbf24';
  const cotSeries = dvpMonthlySeries(dvpData.ventasMensuales.cotizadoAceptado, 6).map((p) => p.val);
  const facSeries = dvpMonthlySeries(dvpData.ventasMensuales.facturado, 6).map((p) => p.val);

  document.getElementById('dvpKpiRow').innerHTML =
    dvpKpiCardHtml('Cotizado / Aceptado', dvpMoney(cotNow), dvpDeltaPct(cotNow, cotPrev), cotSeries.length > 1 ? cotSeries : [0, cotNow || 1], primary) +
    dvpKpiCardHtml('Facturado Real', dvpMoney(facNow), dvpDeltaPct(facNow, facPrev), facSeries.length > 1 ? facSeries : [0, facNow || 1], accent) +
    dvpKpiCardHtml('Órdenes en Proceso', String(dvpData.ordenesEnProceso.length), 0, [1, dvpData.ordenesEnProceso.length || 1], primary) +
    dvpKpiCardHtml('Leads Activos', String(dvpData.leads.length), 0, [1, dvpData.leads.length || 1], accent);
}

function dvpRenderStrip() {
  const thisM = dvpCurrentMonthKey(0), lastM = dvpCurrentMonthKey(-1);
  const cotNow = dvpMonthTotal(dvpData.ventasMensuales.cotizadoAceptado, thisM);
  const cotPrev = dvpMonthTotal(dvpData.ventasMensuales.cotizadoAceptado, lastM);
  const facNow = dvpMonthTotal(dvpData.ventasMensuales.facturado, thisM);
  const facPrev = dvpMonthTotal(dvpData.ventasMensuales.facturado, lastM);
  document.getElementById('dvpChips').innerHTML =
    '<div class="dvp-strip-chip"><div class="ic" style="background:var(--app-primary-soft);color:var(--app-primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9M11 19V4M18 19v-7"/></svg></div>' +
    '<div class="tx"><div class="v">' + dvpMoney(cotNow) + dvpDeltaHtml(dvpDeltaPct(cotNow, cotPrev)) + '</div><div class="l">Cotizado este mes</div></div></div>' +
    '<div class="dvp-strip-chip"><div class="ic" style="background:var(--app-accent-soft);color:var(--app-warning)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h13l3 4v12H4z"/><path d="M17 4v4h3"/></svg></div>' +
    '<div class="tx"><div class="v">' + dvpMoney(facNow) + dvpDeltaHtml(dvpDeltaPct(facNow, facPrev)) + '</div><div class="l">Facturado este mes</div></div></div>' +
    '<div class="dvp-strip-chip"><div class="ic" style="background:rgba(220,38,38,.12);color:var(--app-danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></svg></div>' +
    '<div class="tx"><div class="v">' + dvpData.cotizacionesPendientesCotizador.length + '</div><div class="l">Pendientes por cotizar</div></div></div>' +
    '<div class="dvp-strip-chip"><div class="ic" style="background:rgba(22,163,74,.12);color:var(--app-success)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 2.5v3M16 2.5v3M3.5 9.5h17"/></svg></div>' +
    '<div class="tx"><div class="v">' + dvpData.ordenesEnProceso.length + '</div><div class="l">Órdenes en proceso</div></div></div>' +
    '<div class="dvp-strip-chip"><div class="ic" style="background:var(--app-accent-soft);color:var(--app-warning)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M2.7 20c.8-3.6 3.3-5.6 6.3-5.6s5.5 2 6.3 5.6"/></svg></div>' +
    '<div class="tx"><div class="v">' + dvpData.leads.length + '</div><div class="l">Leads activos</div></div></div>';
}

function dvpRenderChart(range) {
  const cot = range === 'month' ? dvpMonthlySeries(dvpData.ventasMensuales.cotizadoAceptado, 6) : dvpYearlySeries(dvpData.ventasMensuales.cotizadoAceptado);
  const fac = range === 'month' ? dvpMonthlySeries(dvpData.ventasMensuales.facturado, 6) : dvpYearlySeries(dvpData.ventasMensuales.facturado);
  const labels = cot.map((p) => p.label);
  const cotVals = cot.map((p) => p.val);
  const facVals = fac.map((p) => p.val);

  const w = 1010, h = 220, padL = 46, padR = 16, padT = 14, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const allVals = [...cotVals, ...facVals, 1];
  const max = Math.max(...allVals) * 1.15;
  const n = Math.max(labels.length, 1);
  const xFor = (i) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const yFor = (v) => padT + plotH - (v / max) * plotH;

  function linePath(vals) {
    if (!vals.length) return { d: '', pts: [] };
    const pts = vals.map((v, i) => [xFor(i), yFor(v)]);
    let d = 'M ' + pts[0][0] + ',' + pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1];
      const mx = (x0 + x1) / 2;
      d += ' C ' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1;
    }
    return { d, pts };
  }
  const cotPath = linePath(cotVals), facPath = linePath(facVals);

  let gridSvg = '';
  for (let i = 0; i <= 4; i++) {
    const gy = padT + (plotH / 4) * i;
    const val = Math.round(max - (max / 4) * i);
    gridSvg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="var(--app-border)" stroke-width="1"/>';
    gridSvg += '<text x="' + (padL - 8) + '" y="' + (gy + 3) + '" font-size="10" text-anchor="end" fill="var(--app-text-muted)">' + (val >= 1000 ? Math.round(val / 1000) + 'k' : val) + '</text>';
  }
  const xLabels = labels.map((l, i) => '<text x="' + xFor(i) + '" y="' + (h - 6) + '" font-size="10.5" text-anchor="middle" fill="var(--app-text-muted)">' + escapeHtml(l) + '</text>').join('');

  if (!cotVals.length) {
    document.getElementById('dvpChartWrap').innerHTML = '<p class="dvp-empty">Sin datos suficientes todavía.</p>';
    return;
  }

  const svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" id="dvpMainChartSvg" style="overflow:visible;display:block">' +
    '<defs><linearGradient id="dvpGradCot" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--app-primary)" stop-opacity="0.28"/><stop offset="100%" stop-color="var(--app-primary)" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="dvpGradFac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--app-accent)" stop-opacity="0.22"/><stop offset="100%" stop-color="var(--app-accent)" stop-opacity="0"/></linearGradient></defs>' +
    gridSvg +
    (cotPath.d ? '<path d="' + cotPath.d + ' L ' + xFor(n - 1) + ',' + (padT + plotH) + ' L ' + padL + ',' + (padT + plotH) + ' Z" fill="url(#dvpGradCot)" stroke="none"/>' : '') +
    (facPath.d ? '<path d="' + facPath.d + ' L ' + xFor(n - 1) + ',' + (padT + plotH) + ' L ' + padL + ',' + (padT + plotH) + ' Z" fill="url(#dvpGradFac)" stroke="none"/>' : '') +
    (cotPath.d ? '<path d="' + cotPath.d + '" fill="none" stroke="var(--app-primary)" stroke-width="2.4" stroke-linecap="round"/>' : '') +
    (facPath.d ? '<path d="' + facPath.d + '" fill="none" stroke="var(--app-accent)" stroke-width="2.4" stroke-linecap="round"/>' : '') +
    cotPath.pts.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === cotPath.pts.length - 1 ? 4 : 0) + '" fill="var(--app-primary)" stroke="var(--app-surface)" stroke-width="2"/>').join('') +
    facPath.pts.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === facPath.pts.length - 1 ? 4 : 0) + '" fill="var(--app-accent)" stroke="var(--app-surface)" stroke-width="2"/>').join('') +
    xLabels +
    '<line id="dvpCrosshair" x1="0" y1="' + padT + '" x2="0" y2="' + (padT + plotH) + '" stroke="var(--app-text-muted)" stroke-width="1" stroke-dasharray="3,3" opacity="0"/>' +
    '<rect id="dvpHoverCatcher" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent"/>' +
    '</svg>';

  const wrap = document.getElementById('dvpChartWrap');
  wrap.innerHTML = svg + '<div class="dvp-chart-tooltip" id="dvpChartTip"></div>';

  const svgEl = document.getElementById('dvpMainChartSvg');
  const catcher = document.getElementById('dvpHoverCatcher');
  const tip = document.getElementById('dvpChartTip');
  const crosshair = document.getElementById('dvpCrosshair');

  catcher.addEventListener('mousemove', (evt) => {
    const rect = svgEl.getBoundingClientRect();
    const scaleX = w / rect.width;
    const relX = (evt.clientX - rect.left) * scaleX;
    let idx = n > 1 ? Math.round((relX - padL) / plotW * (n - 1)) : 0;
    idx = Math.max(0, Math.min(n - 1, idx));
    const px = xFor(idx);
    crosshair.setAttribute('x1', px); crosshair.setAttribute('x2', px); crosshair.setAttribute('opacity', 1);
    const scaleContainer = rect.width / w;
    tip.style.left = (px * scaleContainer) + 'px';
    tip.style.top = (yFor(Math.max(cotVals[idx] || 0, facVals[idx] || 0)) * (rect.height / h)) + 'px';
    tip.style.opacity = 1;
    tip.innerHTML = '<div class="tt-m">' + escapeHtml(labels[idx]) + '</div>' +
      '<div class="tt-row"><i style="background:var(--app-primary)"></i>Cotizado ' + dvpMoney(cotVals[idx]) + '</div>' +
      '<div class="tt-row"><i style="background:var(--app-accent)"></i>Facturado ' + dvpMoney(facVals[idx]) + '</div>';
  });
  catcher.addEventListener('mouseleave', () => { tip.style.opacity = 0; crosshair.setAttribute('opacity', 0); });
}

const DVP_ORDER_STATUS_LABEL = {
  RUN: 'En producción',
  SETUP: 'Preparando',
  PARO: 'Detenida',
  PENDIENTE: 'Pendiente',
  COMPLETADO: 'Por entregar'
};
const DVP_ORDER_STATUS_TONE = {
  RUN: 'var(--app-success)',
  SETUP: 'var(--app-success)',
  PARO: 'var(--app-danger)',
  PENDIENTE: 'var(--app-warning)',
  COMPLETADO: 'var(--app-primary)'
};

function dvpElapsed(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return 'hace ' + Math.max(mins, 1) + ' min';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return 'hace ' + hours + 'h';
  const days = Math.floor(hours / 24);
  if (days < 30) return 'hace ' + days + (days === 1 ? ' día' : ' días');
  const months = Math.floor(days / 30);
  return 'hace ' + months + (months === 1 ? ' mes' : ' meses');
}

function dvpProcessLabel(o) {
  if (!o.current_process_name) return '';
  return o.current_process_name + ' · ' + dvpElapsed(o.current_process_since);
}

function dvpOrderStatusLabel(o) {
  const key = String(o.current_process_status || '').toUpperCase();
  return DVP_ORDER_STATUS_LABEL[key] || o.order_status || 'Sin estado';
}

function dvpRenderOrdenes() {
  const rows = dvpData.ordenesEnProceso;
  const body = document.getElementById('dvpOrdersList');
  document.getElementById('dvpOrdersCount').textContent = rows.length + ' activas';
  if (!rows.length) { body.innerHTML = '<div class="dvp-empty">Sin órdenes en proceso.</div>'; return; }
  body.innerHTML = rows.map((o) => {
    const tone = DVP_ORDER_STATUS_TONE[String(o.current_process_status || '').toUpperCase()] || 'var(--app-warning)';
    return '<div class="dvp-row">' +
    '<div class="badge" style="background:' + tone + '">' + escapeHtml(String(o.order_code || '').slice(-2)) + '</div>' +
    '<div class="body"><div class="t1">' + escapeHtml(o.order_code) + '</div><div class="t2">' + escapeHtml(o.customer_name || 'Sin cliente') + '</div>' +
    (o.current_process_name ? '<div class="t3">' + escapeHtml(dvpProcessLabel(o)) + '</div>' : '') + '</div>' +
    '<div class="meta"><span class="dvp-pill amber">' + escapeHtml(dvpOrderStatusLabel(o)) + '</span></div>' +
    dvpModalBtn('/orden-produccion/' + encodeURIComponent(o.order_code), 'Orden ' + o.order_code) +
    '</div>';
  }).join('');
}

function dvpRenderPendientesCotizador() {
  const body = document.getElementById('dvpCotizadorList');
  if (!body) return;
  const rows = dvpData.cotizacionesPendientesCotizador || [];
  const countEl = document.getElementById('dvpCotizadorCount');
  if (countEl) countEl.textContent = rows.length + ' en cola';
  if (!rows.length) { body.innerHTML = '<div class="dvp-empty">Sin cotizaciones pendientes de cotizar.</div>'; return; }
  body.innerHTML = rows.map((r) => {
    const sent = r.enviada_a_cotizador === true;
    const badgeColor = sent ? 'var(--app-danger)' : 'var(--app-warning)';
    const stateLabel = sent ? 'Esperando cotizador' : 'Sin enviar a Cotizaciones';
    const lineLabel = r.line_code || r.quote_code;
    return '<div class="dvp-row">' +
      '<div class="badge" style="background:' + badgeColor + '">' + dvpInitials(r.customer_name) + '</div>' +
      '<div class="body"><div class="t1">' + escapeHtml(lineLabel) + ' · ' + escapeHtml(r.customer_name || 'Sin cliente') + '</div>' +
      '<div class="t2">' + escapeHtml(stateLabel) + ' · ' + escapeHtml(dvpElapsed(r.solicitada_en)) + '</div></div>' +
      dvpModalBtn(dvpRutaCalculo(r.quote_code, r.line_code), 'Cálculo ' + lineLabel) +
      '</div>';
  }).join('');
}

function dvpRenderFacturas() {
  const rows = dvpData.facturas;
  const body = document.getElementById('dvpFacturasList');
  document.getElementById('dvpFacturasCount').textContent = rows.length + ' recientes';
  if (!rows.length) { body.innerHTML = '<div class="dvp-empty">Sin facturas registradas.</div>'; return; }
  body.innerHTML = rows.slice(0, 8).map((f) => (
    '<div class="dvp-row">' +
    '<div class="badge" style="background:var(--app-primary)">' + dvpInitials(f.card_name) + '</div>' +
    '<div class="body"><div class="t1">' + escapeHtml(f.doc_num) + ' · ' + escapeHtml(f.card_name || 'Sin cliente') + '</div><div class="t2">' + dvpShortDate(f.fecha) + '</div></div>' +
    '<div class="meta"><div class="amt">' + dvpMoney(f.doc_total) + '</div></div>' +
    (f.card_code ? dvpGotoBtn('/socios-documento.html?codigo=' + encodeURIComponent(f.card_code), f.card_name || 'Socio ' + f.card_code) : '') +
    '</div>'
  )).join('');
}

function dvpRenderTopClientes() {
  const rows = dvpData.topClientes;
  const body = document.getElementById('dvpTopList');
  document.getElementById('dvpTopCount').textContent = rows.length;
  if (!rows.length) { body.innerHTML = '<div class="dvp-empty">Sin facturación reciente.</div>'; return; }
  body.innerHTML = rows.map((c) => (
    '<div class="dvp-row">' +
    '<div class="badge" style="background:var(--app-accent);color:var(--app-text)">' + dvpInitials(c.partner_name) + '</div>' +
    '<div class="body"><div class="t1">' + escapeHtml(c.partner_name || c.partner_code || 'Sin nombre') + '</div><div class="t2">' + c.facturas + ' factura(s)</div></div>' +
    '<div class="meta"><div class="amt">' + dvpMoney(c.total) + '</div></div>' +
    dvpGotoBtn('/socios-documento.html?codigo=' + encodeURIComponent(c.partner_code), c.partner_name || c.partner_code) +
    '</div>'
  )).join('');
}

function dvpRenderLeads() {
  const rows = dvpData.leads;
  const strip = document.getElementById('dvpLeadsStrip');
  document.getElementById('dvpLeadsCount').textContent = rows.length + ' nuevos';
  if (!rows.length) { strip.innerHTML = '<div class="dvp-empty">Sin prospectos asignados.</div>'; return; }
  strip.innerHTML = rows.map((l) => (
    '<div class="dvp-lead-card">' +
    '<div class="top"><div class="av">' + dvpInitials(l.partner_name) + '</div><div><div class="name">' + escapeHtml(l.partner_name || 'Sin nombre') + '</div><div class="code">' + escapeHtml(l.partner_code) + '</div></div></div>' +
    '<div class="mail">' + escapeHtml(l.email || 'Sin correo') + '</div>' +
    '<div class="foot"><div class="age">' + dvpShortDate(l.created_at) + '</div>' + dvpGotoBtn('/socios-documento.html?codigo=' + encodeURIComponent(l.partner_code), l.partner_name || l.partner_code) + '</div>' +
    '</div>'
  )).join('');
}

function dvpOpenGotoLink(link) {
  const href = link.getAttribute('data-route') || link.getAttribute('href') || '';
  if (!href) return;
  const label = link.getAttribute('data-label') || link.getAttribute('title') || 'Documento';
  if (typeof window.openTab === 'function' && window === window.top) {
    window.openTab(href, label);
    return;
  }
  const embedded = new URLSearchParams(window.location.search).get('shell') === '1' || window !== window.parent;
  if (embedded) {
    window.parent.postMessage({ type: 'erp-open-tab', route: href, label }, window.location.origin);
    return;
  }
  window.location.href = href;
}

document.addEventListener('click', (event) => {
  const modalBtn = event.target.closest('.dvp-goto-modal');
  if (modalBtn) {
    event.preventDefault();
    dvpOpenFloatWindow(modalBtn.getAttribute('data-route'), modalBtn.getAttribute('data-label') || 'Documento');
    return;
  }
  const link = event.target.closest('.dvp-goto');
  if (!link) return;
  event.preventDefault();
  dvpOpenGotoLink(link);
});

function dvpBindInteractions() {
  const panel = document.getElementById('dvpPanel');
  const strip = document.getElementById('dvpStrip');
  const isFullPage = !!document.getElementById('mactStatus');
  if (isFullPage) {
    document.getElementById('dvpExpandBtn')?.setAttribute('hidden', '');
    panel.classList.add('open');
  } else {
    strip.addEventListener('click', (e) => {
      if (e.target.closest('.dvp-strip-chips')) return;
      panel.classList.toggle('open');
    });
  }
  document.querySelectorAll('#dvpRangeSeg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dvpRangeSeg button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      dvpRange = btn.dataset.range;
      dvpRenderChart(dvpRange);
    });
  });
  document.getElementById('dvpChartLegend').innerHTML =
    '<span><i style="background:var(--app-primary)"></i>Cotizado / Aceptado</span>' +
    '<span><i style="background:var(--app-accent)"></i>Facturado real</span>';
}

let dvpInteractionsBound = false;

// usuarioVendedor: username a previsualizar (solo lo respeta el backend si quien pide es
// Implementador/Administrador — ver isImplementerPermissionName en server.js). Se llama de nuevo
// cada vez que cambia la selección del desplegable "Ver como vendedor" del dashboard principal.
async function loadDashboardVendorPanel(usuarioVendedor) {
  const panel = document.getElementById('dvpPanel');
  if (!panel) return;
  try {
    const url = usuarioVendedor
      ? '/api/vendedores/dashboard?usuarioVendedor=' + encodeURIComponent(usuarioVendedor)
      : '/api/vendedores/dashboard';
    const res = await fetch(url, { headers: sessionHeaders() });
    const payload = await res.json();
    if (!res.ok || !payload.isVendedor) { panel.hidden = true; return; }
    dvpData = payload;
    panel.hidden = false;
    if (!dvpInteractionsBound) { dvpBindInteractions(); dvpInteractionsBound = true; }
    dvpRenderStrip();
    dvpRenderKpis();
    dvpRenderChart(dvpRange);
    dvpRenderOrdenes();
    dvpRenderPendientesCotizador();
    dvpRenderFacturas();
    dvpRenderTopClientes();
    dvpRenderLeads();
  } catch (error) {
    panel.hidden = true;
  }
}

window.dvpReload = loadDashboardVendorPanel;
loadDashboardVendorPanel();
