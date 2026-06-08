const API = '/api';
const LABELS = {diseno:'Diseno',preprensa:'Preprensa',impresion:'Impresion',laminado:'Laminado',troquelado:'Troquelado',estampado:'Estampado',barnizado:'Barniz',embosado:'Embosado',numeracion:'Numeracion',rebobinado:'Rebobinado',empaque:'Empaque'};
const ICONS = {diseno:'✏',preprensa:'■',impresion:'■',laminado:'◧',troquelado:'◈',estampado:'◆',barnizado:'◐',embosado:'◉',numeracion:'#',rebobinado:'↻',empaque:'□'};
const WORK_HRS = 8;
const WORK_DAYS = new Set([1,2,3,4,5,6]);
const Q_FACTOR = {normal:1, premium:.45, urgent:.05};
const DEFAULT_Q = {normal:16, premium:6, urgent:0};
const softLocks = {};
const impacts = {};

let allOrders = [];
let currentFilter = 'all';
let processFilter = '';
let searchTerm = '';
let drawerOrder = null;
let drawerPriority = 'normal';
let drawerBuffer = 2;
let drawerResult = null;
let currentView = 'list';
const openRows = new Set();
const flipState = {};
const flowCache = {};

const orderListEl = document.getElementById('orderList');
const semaforoListEl = document.getElementById('semaforoList');
const semaforoViewEl = document.getElementById('semaforoView');
const kanbanViewEl = document.getElementById('kanbanView');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const refreshBtn = document.getElementById('refreshBtn');
const liveIndicator = document.getElementById('liveIndicator');

function esc(v) { return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function norm(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function fmtDate(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('es-CR', {day:'2-digit',month:'2-digit',year:'numeric'}); }
function fmtShort(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('es-CR', {day:'2-digit',month:'short'}); }
function fmtLong(d) { return d.toLocaleDateString('es-CR', {weekday:'short',day:'2-digit',month:'long'}); }
function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function daysUntil(v) { if (!v) return null; const d = new Date(v); if (isNaN(d)) return null; const n = new Date(); n.setHours(0,0,0,0); d.setHours(0,0,0,0); return Math.round((d - n) / 86400000); }
function formatNumber(v, d) { return Number(v || 0).toLocaleString('es-CR', d != null ? {minimumFractionDigits:d,maximumFractionDigits:d} : {}); }

function addWorkHours(from, hours) {
    let d = new Date(from), rem = hours;
    while (!WORK_DAYS.has(d.getDay())) d.setDate(d.getDate() + 1);
    if (d.getHours() < 8) d.setHours(8,0,0,0);
    while (rem > 0) {
        const avail = Math.min(rem, 16 - d.getHours());
        d.setHours(d.getHours() + avail);
        rem -= avail;
        if (rem > 0) { d.setDate(d.getDate() + 1); d.setHours(8,0,0,0); while (!WORK_DAYS.has(d.getDay())) d.setDate(d.getDate() + 1); }
    }
    return d;
}

function shellOpen(route, label) {
    if (window === window.parent || new URLSearchParams(window.location.search).get('shell') !== '1') {
        window.location.href = route;
        return;
    }
    window.parent.postMessage({ type: 'erp-open-tab', route: route + (route.includes('?') ? '&' : '?') + 'shell=1', label }, window.location.origin);
}

function orderStatus(o) {
    const procs = Array.isArray(o.steps) ? o.steps : [];
    const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
    if (procs.length && procs.every(p => (p.routeStatus || '').toUpperCase() === 'COMPLETADO')) return 'done';
    if (days !== null && days < 0) return 'late';
    if (days !== null && days <= 2) return 'risk';
    if (procs.some(p => (p.routeStatus || '').toUpperCase() === 'RUN' || (p.routeStatus || '').toUpperCase() === 'SETUP')) return 'running';
    return 'ok';
}

function buildSteps(o) {
    const steps = Array.isArray(o.steps) ? o.steps : [];
    return steps.filter(s => {
        if (!s || !s.processKey) return false;
        const key = norm(s.processKey);
        if (key === 'orden_creada' || key === 'solicitud_vendedor' || key === 'planeacion') return false;
        return true;
    });
}

function calcPct(steps) {
    if (!steps.length) return 0;
    const done = steps.filter(s => (s.routeStatus || '').toUpperCase() === 'COMPLETADO').length;
    const active = steps.filter(s => ['RUN','SETUP'].includes((s.routeStatus || '').toUpperCase())).length;
    return Math.round((done + active * .5) / steps.length * 100);
}

function currentProcLabel(steps) {
    const a = steps.find(s => ['RUN','SETUP'].includes((s.routeStatus || '').toUpperCase()));
    if (a) return a.processName || LABELS[a.processKey] || a.processKey;
    const p = steps.find(s => (s.routeStatus || '').toUpperCase() === 'PENDIENTE');
    return p ? `Siguiente: ${p.processName || LABELS[p.processKey] || p.processKey}` : 'Terminada';
}

function trackingStepStatus(step) {
    const s = (step.routeStatus || '').toUpperCase();
    if (s === 'COMPLETADO') return 'done';
    if (s === 'RUN' || s === 'SETUP') return 'active';
    if (s === 'PARO') return 'late';
    return 'pending';
}

function estimate(order, priority, bufferDays) {
    const steps = buildSteps(order);
    const qf = Q_FACTOR[priority];
    const dq = DEFAULT_Q[priority];
    let cursor = new Date();
    if (cursor.getHours() >= 16) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(8,0,0,0); }
    if (cursor.getHours() < 8) cursor.setHours(8,0,0,0);
    while (!WORK_DAYS.has(cursor.getDay())) cursor.setDate(cursor.getDate() + 1);

    let totalProc = 0, totalQ = 0;
    const detail = steps.map(s => {
        const procH = s.planned?.minutes ? Math.round(s.planned.minutes / 60) : 8;
        const rawQ = dq;
        const qH = rawQ * qf;
        cursor = addWorkHours(cursor, qH);
        const start = new Date(cursor);
        cursor = addWorkHours(cursor, procH);
        totalProc += procH; totalQ += qH;
        return { ...s, procH, qH, start, end: new Date(cursor) };
    });

    const bufH = bufferDays * WORK_HRS;
    const earlyEnd = new Date(cursor);
    const lateEnd = addWorkHours(cursor, bufH);
    const hasLoad = steps.length >= 3;
    const conf = hasLoad ? 'high' : 'med';

    return { detail, earlyEnd, lateEnd, totalProc, totalQ, bufH, conf, priority, bufferDays };
}

function simulateImpact() {
    Object.keys(softLocks).forEach(code => {
        const order = allOrders.find(o => o.orderCode === code);
        if (!order) return;
        const lock = softLocks[code];
        const shifted = addWorkHours(new Date(lock.earlyEnd), 2 * WORK_HRS);
        const diffDays = Math.round((shifted - new Date(lock.earlyEnd)) / 86400000);
        if (diffDays >= 1) {
            impacts[code] = { prevDate: lock.earlyEnd, newDate: shifted, days: diffDays };
            order._impacted = true;
        }
    });
    showImpactAlert();
}

function showImpactAlert() {
    const n = Object.keys(impacts).length;
    if (!n) return;
    document.getElementById('alertCount').textContent = n;
    document.getElementById('alertTitle').textContent = `${n} orden${n > 1 ? 'es' : ''} desplazada${n > 1 ? 's' : ''} por una urgencia`;
    document.getElementById('alertMsg').textContent = 'Revisa las ordenes marcadas en rojo y comunica el cambio al cliente.';
    document.getElementById('alertBanner').classList.add('visible');
    document.getElementById('countImpact').textContent = n;
    renderAll();
}

function renderProcessRow(s) {
    const state = trackingStepStatus(s);
    const cls = state === 'done' ? 'done' : state === 'active' ? 'active' : 'pending';
    const pct = state === 'done' ? 100 : state === 'active' ? 55 : 0;
    const hrs = s.planned?.minutes ? `${Math.round(s.planned.minutes / 60)}h` : '';
    const stLabel = {done:'Listo',active:'En proceso',pending:'Pendiente',late:'Atrasado'}[cls] || cls;
    return `<div class="process-row">
      <div class="process-name-cell"><div class="process-icon ${cls}">${esc(ICONS[s.processKey] || '·')}</div>
        <div><div class="process-label">${esc(s.processName || LABELS[s.processKey] || s.processKey)}</div></div></div>
      <div class="duration-cell"><div class="duration-track"><div class="duration-fill ${cls}" style="width:${pct}%"></div></div>${hrs ? `<div class="duration-hours">${esc(hrs)}</div>` : ''}</div>
      <div class="process-date-cell">${esc(s.completedAt ? fmtShort(s.completedAt) : s.startedAt ? fmtShort(s.startedAt) : '—')}</div>
      <div class="process-machine-cell">${esc(s.planned?.machineName || '—')}</div>
      <div><span class="ps-badge ${cls}"><span class="ps-dot"></span>${esc(stLabel)}</span></div>
    </div>`;
}

function renderOrderCard(o) {
    const steps = buildSteps(o);
    const status = orderStatus(o);
    const pct = calcPct(steps);
    const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
    const eta = fmtDate(o.promisedDeliveryDate || o.scheduledDeliveryDate);
    const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : '';
    const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
    const sl = softLocks[o.orderCode];
    const imp = impacts[o.orderCode];
    const hasEst = !!sl;
    const daysLabel = days === null ? '' : days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`;
    const stLabel = {done:'Lista',running:'En proceso',ok:'En cola',risk:'En riesgo',late:'Atrasada'}[status] || status;

    const pips = steps.slice(0, 8).map(s => {
        const sc = trackingStepStatus(s);
        return `<div class="step-pip ${sc}" title="${esc(s.processName || LABELS[s.processKey] || '')}"></div>`;
    }).join('');

    const impactTag = imp ? `<span class="impact-tag">↑${imp.days}d · ${fmtShort(imp.newDate)}</span>` : '';

    return `<div class="order-row ${rowCls}${imp ? ' has-impact' : ''}" id="row-${esc(o.orderCode)}" data-code="${esc(o.orderCode)}" data-status="${esc(status)}">
    <div class="order-head" data-action="toggle-row" data-order="${esc(o.orderCode)}">
      <div>
        <div class="order-code">${esc(o.orderCode)}${impactTag}</div>
        <div class="order-customer">${esc(o.customerName || 'Sin cliente')}</div>
      </div>
      <div class="order-job">${esc(currentProcLabel(steps))}</div>
      <div class="order-eta">
        <div class="order-eta-label">Entrega${daysLabel ? ` · ${daysLabel}` : ''}</div>
        <div class="order-eta-date ${etaCls}">${eta || 'Sin fecha'}</div>
        ${sl ? `<div style="font-size:10px;color:var(--accent);margin-top:2px">Est. ${fmtShort(sl.earlyEnd)}</div>` : ''}
      </div>
      <button type="button" class="btn-estimate${hasEst ? ' has-estimate' : ''}" data-action="open-drawer" data-order="${esc(o.orderCode)}">${hasEst ? '◈ Estimada' : '◎ Estimar'}</button>
      <span class="order-status-badge ${status}">${stLabel}</span>
      <div class="order-toggle">⌄</div>
    </div>
    <div class="order-progress-row">
      <div class="order-progress-track"><div class="order-progress-fill ${status}" style="width:${pct}%"></div></div>
      <div class="order-progress-steps">${pips}</div>
      <div class="order-pct ${status}">${pct}%</div>
    </div>
    <div class="order-detail">
      <div class="proc-panel">
        <div class="proc-panel-header">
          <span class="proc-panel-title">Procesos planificados</span>
          <button type="button" class="proc-flip-btn" data-action="flip-card" data-order="${esc(o.orderCode)}" title="Ver flujo de produccion real">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Ver flujo real
          </button>
        </div>
        <div class="flip-wrap" id="flip-${esc(o.orderCode)}">
          <div class="flip-inner">
            <div class="flip-face front">
              <div class="process-timeline" style="padding-top:0">
                <div class="process-timeline-header">
                  <div class="pt-col-head">Proceso</div><div class="pt-col-head">Progreso</div>
                  <div class="pt-col-head">Fecha fin</div><div class="pt-col-head">Maquina</div><div class="pt-col-head">Estado</div>
                </div>
                ${steps.length ? steps.map(s => renderProcessRow(s)).join('') : '<div style="padding:16px 0;color:var(--text3);font-size:12px">No hay procesos configurados.</div>'}
              </div>
            </div>
            <div class="flip-face back">
              <div class="flow-panel" id="flow-${esc(o.orderCode)}">
                <div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${imp ? `<div style="padding:10px 20px;background:var(--red-bg);border-top:1px solid var(--red-border)">
        <span style="font-size:12px;color:var(--red);font-weight:600">Fecha desplazada por urgencia</span>
        <span style="font-size:11px;color:var(--red);margin-left:8px">Fecha anterior: ${fmtShort(imp.prevDate)} → Nueva estimacion: ${fmtShort(imp.newDate)}</span>
      </div>` : ''}
      <div class="order-info-bar">
        <div class="info-cell"><div class="info-cell-label">Trabajo</div><div class="info-cell-value">${esc(o.jobName || o.productName || '—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Cantidad</div><div class="info-cell-value">${o.orderedQuantity ? Number(o.orderedQuantity).toLocaleString('es-CR') : '—'}</div></div>
        <div class="info-cell"><div class="info-cell-label">Maquina</div><div class="info-cell-value">${esc(o.machineName || '—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Sustrato</div><div class="info-cell-value">${esc(o.materialName || '—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Tintas</div><div class="info-cell-value">${esc(o.tintDescription || '—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Vendedor</div><div class="info-cell-value">${esc(o.salespersonName || '—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Acciones</div><div class="info-cell-value" style="display:flex;gap:6px;margin-top:4px">
          <a class="hdr-btn" href="/orden-produccion/${esc(o.orderCode)}" data-route="/orden-produccion/${esc(o.orderCode)}" data-label="Orden ${esc(o.orderCode)}" style="font-size:11px;padding:4px 10px">Ver orden</a>
          <a class="hdr-btn" href="/planificacion/gantt?orderCode=${esc(o.orderCode)}" data-route="/planificacion/gantt?orderCode=${esc(o.orderCode)}" data-label="Gantt ${esc(o.orderCode)}" style="font-size:11px;padding:4px 10px">Gantt</a>
        </div></div>
      </div>
    </div>
  </div>`;
}

function updateSummary() {
    const t = allOrders.length;
    const run = allOrders.filter(o => orderStatus(o) === 'running').length;
    const risk = allOrders.filter(o => orderStatus(o) === 'risk').length;
    const late = allOrders.filter(o => orderStatus(o) === 'late').length;
    const done = allOrders.filter(o => orderStatus(o) === 'done').length;
    const imp = Object.keys(impacts).length;
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('statTotal', t); set('statRunning', run); set('statRisk', risk); set('statLate', late); set('statDone', done);
    set('countAll', t); set('countLate', late); set('countRisk', risk); set('countRunning', run); set('countDone', done); set('countImpact', imp);
}

function hasPendingStep(order, processKey) {
    if (!processKey) return true;
    const steps = buildSteps(order);
    const filterKey = processKey.replace(/[\s_]+/g, '').toLowerCase();
    // Encontrar el primer paso NO completado (proceso actual activo/pendiente)
    for (const step of steps) {
        const status = (step.routeStatus || '').toUpperCase();
        if (status !== 'COMPLETADO') {
            const key = norm(step.processKey || '').replace(/[\s_]+/g, '');
            return key === filterKey;
        }
    }
    return false; // todos completados
}

function renderAll() {
    const term = norm(searchTerm);
    const sort = sortSelect.value;
    let filtered = allOrders.filter(o => {
        const match = !term || norm([o.orderCode, o.customerName, o.jobName, o.productName].join(' ')).includes(term);
        if (!match) return false;
        if (!hasPendingStep(o, processFilter)) return false;
        if (currentFilter === 'all') return true;
        if (currentFilter === 'impact') return !!impacts[o.orderCode];
        return orderStatus(o) === currentFilter;
    });
    filtered.sort((a, b) => {
        if (sort === 'eta') return String(a.promisedDeliveryDate || '').localeCompare(String(b.promisedDeliveryDate || ''));
        if (sort === 'status') { const r = {late:0,risk:1,running:2,ok:3,done:4}; return (r[orderStatus(a)] ?? 9) - (r[orderStatus(b)] ?? 9); }
        if (sort === 'progress') return calcPct(buildSteps(b)) - calcPct(buildSteps(a));
        return String(a.orderCode || '').localeCompare(String(b.orderCode || ''));
    });
    if (currentView === 'list') renderList(filtered);
    else if (currentView === 'sem') renderSemaforo(filtered);
    else renderKanban(filtered);
}

function renderList(orders) {
    if (!orders.length) {
        orderListEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">◎</div><div style="font-size:14px;color:var(--text3)">No hay ordenes que coincidan.</div></div>';
        return;
    }
    orderListEl.innerHTML = orders.map(renderOrderCard).join('');
    openRows.forEach(code => { const r = document.getElementById(`row-${code}`); if (r) r.classList.add('is-open'); });
}

function renderSemaforo(orders) {
    if (!orders.length) {
        semaforoListEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">◎</div><div style="font-size:14px">No hay ordenes que coincidan.</div></div>';
        return;
    }
    const stLabels = {done:'Lista',running:'En proceso',ok:'En cola',risk:'En riesgo',late:'Atrasada'};
    semaforoListEl.innerHTML = orders.map(o => {
        const steps = buildSteps(o);
        const status = orderStatus(o);
        const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
        const eta = fmtShort(o.promisedDeliveryDate || o.scheduledDeliveryDate);
        const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok';
        const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
        const imp = impacts[o.orderCode];
        const sl = softLocks[o.orderCode];
        const hasEst = !!sl;
        const daysLabel = days === null ? '' : days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`;
        const pips = steps.slice(0, 12).map(s => {
            const sc = trackingStepStatus(s);
            return `<div class="sem-stage ${sc}" title="${esc(s.processName || LABELS[s.processKey] || '')}"></div>`;
        }).join('');
        return `<div class="sem-row ${rowCls}${imp ? ' has-impact' : ''}" data-action="open-drawer" data-order="${esc(o.orderCode)}">
      <div>
        <div class="sem-code">${esc(o.orderCode)}${imp ? `<span style="font-size:9px;color:var(--red);font-weight:700;margin-left:4px">↑${imp.days}d</span>` : ''}</div>
        <div class="sem-customer">${esc(o.customerName || '—')}</div>
      </div>
      <div class="sem-process">${esc(currentProcLabel(steps))}</div>
      <div class="sem-stages">${pips}</div>
      <div class="sem-light">
        <div class="sem-dot ${status}"></div>
        <span class="sem-label">${esc(stLabels[status] || status)}</span>
      </div>
      <div class="sem-dates">
        <div class="sem-eta ${etaCls}">${eta || '—'}</div>
        <div class="sem-days">${esc(daysLabel)}</div>
        ${sl ? `<div class="sem-est">Est. ${fmtShort(sl.earlyEnd)}</div>` : ''}
        ${imp ? `<div style="font-size:10px;color:var(--red);font-weight:600">→ ${fmtShort(imp.newDate)}</div>` : ''}
      </div>
      <button type="button" class="sem-btn${hasEst ? ' has-estimate' : ''}" data-action="open-drawer" data-order="${esc(o.orderCode)}">${hasEst ? '◈ Est.' : '◎ Estimar'}</button>
    </div>`;
    }).join('');
}

function renderKanban(orders) {
    const cols = {ok:[], running:[], alert:[]};
    orders.forEach(o => {
        const s = orderStatus(o);
        if (s === 'done') return;
        if (s === 'late' || s === 'risk' || impacts[o.orderCode]) cols.alert.push(o);
        else if (s === 'running') cols.running.push(o);
        else cols.ok.push(o);
    });
    ['ok','running','alert'].forEach(col => {
        const box = document.getElementById(`kcol-${col}`);
        const cnt = document.getElementById(`kcCount-${col}`);
        cnt.textContent = cols[col].length;
        if (!cols[col].length) { box.innerHTML = '<div class="kanban-empty">Sin ordenes</div>'; return; }
        box.innerHTML = cols[col].map(o => {
            const steps = buildSteps(o);
            const status = orderStatus(o);
            const days = daysUntil(o.promisedDeliveryDate || o.scheduledDeliveryDate);
            const eta = fmtShort(o.promisedDeliveryDate || o.scheduledDeliveryDate);
            const etaCls = status === 'late' ? 'late' : status === 'risk' ? 'risk' : 'ok';
            const rowCls = status === 'late' ? 'is-late' : status === 'risk' ? 'is-risk' : 'is-ok';
            const imp = impacts[o.orderCode];
            const sl = softLocks[o.orderCode];
            const daysLabel = days === null ? '' : days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`;
            const pips = steps.slice(0, 8).map(s => {
                const sc = trackingStepStatus(s);
                return `<div class="kc-pip ${sc}" title="${esc(s.processName || LABELS[s.processKey] || '')}"></div>`;
            }).join('');
            return `<div class="kanban-card ${rowCls}${imp ? ' has-impact' : ''}" data-action="open-drawer" data-order="${esc(o.orderCode)}">
        <div class="kc-code">${esc(o.orderCode)}${imp ? `<span class="impact-tag" style="font-size:9px;padding:1px 5px;margin-left:5px">+${imp.days}d</span>` : ''}</div>
        <div class="kc-customer">${esc(o.customerName || '—')}</div>
        <div class="kc-process">${esc(currentProcLabel(steps))}</div>
        <div class="kc-pips">${pips}</div>
        ${sl ? `<div class="kc-est">◈ Est. ${fmtShort(sl.earlyEnd)}</div>` : ''}
        ${imp ? `<div class="kc-impact">Desplazada → ${fmtShort(imp.newDate)}</div>` : ''}
        <div class="kc-bottom">
          <div class="kc-eta ${etaCls}">${eta || 'Sin fecha'}${daysLabel ? ` · ${daysLabel}` : ''}</div>
          <button type="button" class="kc-btn" data-action="open-drawer" data-order="${esc(o.orderCode)}">${sl ? '◈' : '◎'} Estimar</button>
        </div>
      </div>`;
        }).join('');
    });
}

function openDrawer(code) {
    const order = allOrders.find(o => o.orderCode === code);
    if (!order) return;
    drawerOrder = order;
    drawerResult = null;
    document.getElementById('drawerCode').textContent = code + ' · ' + (order.customerName || '');
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('btnCopy').style.display = 'none';
    document.getElementById('btnGantt').style.display = 'none';
    document.getElementById('btnGantt').href = `/planificacion/gantt?orderCode=${code}`;
    document.getElementById('calcBtnText').textContent = 'Calcular fecha estimada';

    const tier = String(order.customerTier || order.clientTier || '').toUpperCase();
    setPriority(tier === 'A' ? 'premium' : 'normal');
    updateBuffer();

    const steps = buildSteps(order);
    document.getElementById('drawerProcesses').innerHTML = steps.length
        ? steps.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);font-size:12px">
            <span style="font-size:14px">${esc(ICONS[s.processKey] || '·')}</span>
            <span style="flex:1;font-weight:500;color:var(--text)">${esc(s.processName || LABELS[s.processKey] || s.processKey)}</span>
            ${s.planned?.minutes ? `<span style="color:var(--text3);font-family:'DM Mono',monospace;font-size:11px">${Math.round(s.planned.minutes / 60)}h</span>` : ''}
            ${s.planned?.machineName ? `<span style="color:var(--text3);font-size:11px">${esc(s.planned.machineName)}</span>` : ''}
          </div>`).join('')
        : '<div style="color:var(--text3);font-size:12px;padding:8px">No hay procesos configurados en esta orden.</div>';

    document.getElementById('drawerOverlay').classList.add('open');
    document.getElementById('drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(runCalc, 200);
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('open');
    document.getElementById('drawer').classList.remove('open');
    document.body.style.overflow = '';
}

function setPriority(p) {
    drawerPriority = p;
    document.querySelectorAll('.priority-opt').forEach(el => {
        el.className = 'priority-opt' + (el.dataset.priority === p ? ` sel-${p}` : '');
    });
}

function updateBuffer() {
    drawerBuffer = parseInt(document.getElementById('bufferSlider').value) || 0;
    document.getElementById('bufferVal').textContent = drawerBuffer === 0 ? '0d' : `+${drawerBuffer}d`;
}

function runCalc() {
    if (!drawerOrder) return;
    const btn = document.getElementById('calcBtn');
    const sp = document.getElementById('calcSpinner');
    const tx = document.getElementById('calcBtnText');
    btn.disabled = true; sp.style.display = 'block'; tx.textContent = 'Calculando...';
    setTimeout(() => {
        try {
            const r = estimate(drawerOrder, drawerPriority, drawerBuffer);
            drawerResult = r;
            renderDrawerResult(r);
        } catch (e) { console.error(e); }
        finally { btn.disabled = false; sp.style.display = 'none'; tx.textContent = 'Recalcular'; }
    }, 500);
}

function renderDrawerResult(r) {
    const { earlyEnd, lateEnd, totalProc, totalQ, bufH, conf, priority, bufferDays } = r;
    const dateCls = priority === 'premium' ? 'premium' : priority === 'urgent' ? 'urgent' : '';
    const earlyStr = capitalise(fmtLong(earlyEnd));
    const lateStr = capitalise(fmtLong(lateEnd));
    const confLabel = {high:'Alta confianza',med:'Confianza media'}[conf];
    const confDot = conf === 'high' ? '◉' : '◎';

    document.getElementById('resDateBig').textContent = earlyStr;
    document.getElementById('resDateBig').className = 'result-date-big' + (dateCls ? ' ' + dateCls : '');
    document.getElementById('resRange').textContent = bufferDays > 0 ? `Rango: ${earlyStr} – ${lateStr}` : 'Sin colchon — fecha fija';
    document.getElementById('resConf').textContent = `${confDot} ${confLabel}`;
    document.getElementById('resConf').className = 'result-confidence ' + conf;

    const breakdown = [];
    if (totalProc > 0) breakdown.push({cls:'var(--accent)',name:'Produccion',detail:`${buildSteps(drawerOrder).length} procesos en secuencia`,hrs:totalProc});
    if (totalQ > 0) breakdown.push({cls:'#F5A623',name:'Espera en cola',detail:priority==='urgent'?'Entrada directa':priority==='premium'?'Cola reducida ~55%':'Cola actual de maquinas',hrs:totalQ});
    if (bufH > 0) breakdown.push({cls:'var(--blue)',name:'Colchon de seguridad',detail:`${bufferDays}d habil${bufferDays!==1?'es':''} de margen`,hrs:bufH});

    document.getElementById('resBreakdown').innerHTML = breakdown.map(b => `
      <div class="breakdown-item">
        <div class="breakdown-dot" style="background:${b.cls}"></div>
        <div class="breakdown-label"><strong style="color:var(--text)">${esc(b.name)}</strong><br><span style="font-size:10px">${esc(b.detail)}</span></div>
        <div class="breakdown-hrs">${Math.round(b.hrs)}h</div>
      </div>`).join('');

    let note = '';
    if (totalQ > totalProc) note = '<div class="queue-warning"><strong>La cola supera la produccion</strong>Considera subir la prioridad si la fecha es critica para el cliente.</div>';
    if (priority === 'premium') note = '<div class="premium-note"><strong>Cliente A — prioridad activada</strong>Fecha calculada adelantando ~55% de la cola. Confirma disponibilidad con planificacion.</div>';
    if (priority === 'urgent') note = '<div class="premium-note" style="background:var(--red-bg);border-color:var(--red-border);color:var(--red)"><strong>Urgente — entrada directa</strong>Requiere autorizacion de planificacion. Puede desplazar otras ordenes con bloqueo suave.</div>';
    document.getElementById('resNote').innerHTML = note;

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('btnCopy').style.display = 'flex';
    document.getElementById('btnGantt').style.display = 'block';

    if (document.getElementById('lockToggle').checked) {
        softLocks[drawerOrder.orderCode] = { earlyEnd, lateEnd, priority };
        const btn = document.querySelector(`#row-${drawerOrder.orderCode} .btn-estimate`);
        if (btn) { btn.textContent = '◈ Estimada'; btn.classList.add('has-estimate'); }
        if (priority === 'urgent') { setTimeout(() => { simulateImpact(); updateSummary(); }, 800); }
    }
}

function copyResult() {
    if (!drawerResult || !drawerOrder) return;
    const { earlyEnd, lateEnd, bufferDays } = drawerResult;
    const text = bufferDays > 0
        ? `Estimado de entrega ${drawerOrder.orderCode} (${drawerOrder.customerName || ''}): entre el ${capitalise(fmtLong(earlyEnd))} y el ${capitalise(fmtLong(lateEnd))}.`
        : `Estimado de entrega ${drawerOrder.orderCode} (${drawerOrder.customerName || ''}): ${capitalise(fmtLong(earlyEnd))}.`;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('btnCopy');
        btn.textContent = 'Copiado al portapapeles';
        setTimeout(() => { btn.textContent = 'Copiar fecha para comunicar al cliente'; }, 2000);
    }).catch(() => {});
}

async function loadData() {
    refreshBtn.textContent = '...'; refreshBtn.disabled = true;
    try {
        const res = await fetch(`${API}/planificacion/seguimiento`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo cargar seguimiento.');
        allOrders = data.items || [];
        updateSummary(); renderAll();
        liveIndicator.style.background = '#1D9E75';
    } catch (err) {
        liveIndicator.style.background = '#E24B4A';
        orderListEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div style="font-size:14px;color:var(--red)">${esc(err.message)}</div></div>`;
    } finally { refreshBtn.textContent = 'Actualizar'; refreshBtn.disabled = false; }
}

function flipCard(code) {
    const wrap = document.getElementById(`flip-${code}`);
    const btn = document.querySelector(`[data-action="flip-card"][data-order="${code}"]`);
    if (!wrap) return;
    const isFlipped = wrap.classList.toggle('flipped');
    flipState[code] = isFlipped ? 'back' : 'front';
    if (btn) {
        btn.classList.toggle('active', isFlipped);
        btn.innerHTML = isFlipped
            ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver planificado'
            : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver flujo real';
    }
    if (isFlipped) {
        const front = wrap.querySelector('.flip-face.front');
        const back = wrap.querySelector('.flip-face.back');
        if (front && back) wrap.querySelector('.flip-inner').style.minHeight = (back.scrollHeight || 200) + 'px';
        loadFlowPanel(code);
    } else {
        const front = wrap.querySelector('.flip-face.front');
        if (front) wrap.querySelector('.flip-inner').style.minHeight = front.scrollHeight + 'px';
    }
}

async function loadFlowPanel(code) {
    const box = document.getElementById(`flow-${code}`);
    if (!box) return;
    if (flowCache[code]) { renderFlowPanel(box, flowCache[code]); return; }
    box.innerHTML = '<div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div>';
    try {
        const res = await fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento`);
        if (!res.ok) throw new Error('no-flow');
        const data = await res.json();
        const steps = data.steps || data.items || [];
        flowCache[code] = steps;
        renderFlowPanel(box, steps, data.history || []);
    } catch (e) {
        const order = allOrders.find(o => o.orderCode === code);
        if (order) {
            const steps = buildFlowFromOrder(order);
            flowCache[code] = steps;
            renderFlowPanel(box, steps);
        } else {
            box.innerHTML = '<div class="flow-empty">No se pudo cargar el flujo de produccion.</div>';
        }
    }
}

function buildFlowFromOrder(order) {
    const steps = Array.isArray(order.steps) ? order.steps : [];
    return steps.filter(s => s.processKey !== 'orden_creada' && s.processKey !== 'solicitud_vendedor' && s.processKey !== 'planeacion')
        .map(s => ({
            processKey: s.processKey,
            processName: s.processName || LABELS[s.processKey] || s.processKey,
            routeStatus: (s.routeStatus || 'PENDIENTE').toUpperCase(),
            completedBy: s.completedBy || '',
            completedByPhoto: s.completedByPhoto || '',
            completedAt: s.completedAt || null,
            startedBy: s.startedBy || '',
            startedAt: s.startedAt || null,
            planned: s.planned || {}
        }));
}

function renderFlowPanel(box, steps, hist) {
    if (!steps || !steps.length) {
        box.innerHTML = '<div class="flow-empty">No hay flujo de produccion registrado para esta orden.</div>';
        return;
    }
    const doneCount = steps.filter(s => String(s.routeStatus || '').toUpperCase() === 'COMPLETADO').length;
    const total = steps.length;
    const pct = Math.round(doneCount / total * 100);
    const cntBg = doneCount === total ? 'var(--accent-bg)' : doneCount > 0 ? 'var(--amber-bg)' : 'var(--surface2)';
    const cntClr = doneCount === total ? 'var(--accent)' : doneCount > 0 ? 'var(--amber)' : 'var(--text3)';

    let tlHtml = '';
    steps.forEach((s, i) => {
        const status = String(s.routeStatus || 'PENDIENTE').toUpperCase();
        const isDone = status === 'COMPLETADO';
        const isActive = ['RUN','SETUP'].includes(status);
        const isStopped = status === 'PARO';
        const isLast = i === steps.length - 1;

        const markerName = String(s.completedBy || s.startedBy || '').trim();
        const markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim();
        const initials = markerName ? markerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : (isDone ? '✓' : '');
        let nodeCls = 'flow-tl-node';
        if (isDone) nodeCls += ' done';
        else if (isActive) nodeCls += ' active';
        else if (isStopped) nodeCls += ' stopped';
        if (markerName) nodeCls += ' has-avatar';

        let nodeInner = '';
        if (markerName) {
            if (markerPhoto) {
                nodeInner = `<img src="${esc(markerPhoto)}" alt="${esc(markerName)}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:linear-gradient(135deg,var(--blue),var(--accent));border-radius:50%;color:#fff">${esc(initials)}</span>`;
            } else {
                nodeInner = `<span style="font-size:11px;font-weight:700">${esc(initials)}</span>`;
            }
            nodeInner += '<span class="flow-tl-badge">✓</span>';
        } else if (isDone) {
            nodeInner = '<span>✓</span>';
        } else if (isActive) {
            nodeInner = '<span style="font-size:9px;font-weight:700">▶</span>';
        } else {
            nodeInner = `<span style="font-size:10px;color:var(--text3)">${i + 1}</span>`;
        }

        const nextDone = !isLast && String(steps[i + 1]?.routeStatus || '').toUpperCase() === 'COMPLETADO';
        const connector = isLast ? '' : `<div class="flow-tl-connector ${isDone && nextDone ? 'solid' : 'dashed'}"></div>`;

        const titleCls = isDone ? 'done' : isActive ? 'active' : isStopped ? 'stopped' : 'pending';
        const markerDate = s.completedAt || s.startedAt || '';
        const metaParts = [];
        if (markerName) metaParts.push(esc(markerName));
        if (markerDate) metaParts.push(fmtFlowDate(markerDate));
        const metaHtml = metaParts.length ? `<div class="flow-step-meta">${metaParts.join(' · ')}</div>` : '';
        const machine = s.planned?.machineName || '';
        const machHtml = machine ? `<div class="flow-step-machine">◼ ${esc(machine)}</div>` : '';
        const mins = s.planned?.minutes || 0;
        const timeHtml = mins > 0 ? `<div class="flow-step-hint">⏱ ${fmtFlowMins(mins)}</div>` : '';

        tlHtml += `<div class="flow-tl-row">
      <div class="flow-tl-left">
        <button type="button" class="${nodeCls}" data-flow-step-index="${i}"${isDone ? ' disabled' : ''}>${nodeInner}</button>
        ${connector}
      </div>
      <div class="flow-tl-content">
        <div class="flow-step-name ${titleCls}">${esc(s.processName || 'Proceso')}</div>
        ${metaHtml}${machHtml}${timeHtml}
      </div>
    </div>`;
    });

    let histHtml = '';
    if (hist && hist.length) {
        const rows = hist.slice(0, 6).map(h => `<div class="flow-hist-row"><span class="flow-hist-date">${esc(h.ts || h.date || '')}</span><span>${esc(h.msg || h.message || '')}</span></div>`).join('');
        histHtml = `<div class="flow-hist"><div class="flow-hist-title">Historial</div>${rows}</div>`;
    }

    box.innerHTML = `
    <div class="flow-panel-head">
      <div class="flow-panel-title">Flujo de produccion</div>
      <span class="flow-panel-counter" style="background:${cntBg};color:${cntClr}">${doneCount}/${total}</span>
    </div>
    <div class="flow-progress"><div class="flow-progress-fill" style="width:${pct}%"></div></div>
    <div class="flow-tl">${tlHtml}</div>
    ${histHtml}`;

    setTimeout(() => {
        const wrap = box.closest('.flip-wrap');
        if (wrap) {
            const inner = wrap.querySelector('.flip-inner');
            const back = wrap.querySelector('.flip-face.back');
            if (inner && back) inner.style.minHeight = back.scrollHeight + 'px';
        }
    }, 50);
}

function fmtFlowDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('es-CR', {day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('es-CR', {hour:'2-digit',minute:'2-digit'});
}

function fmtFlowMins(min) {
    const t = Math.round(Number(min || 0));
    if (!t || t <= 0) return '';
    if (t < 60) return t + ' min';
    const h = Math.floor(t / 60), m = t % 60;
    return h + 'h' + (m ? ' ' + m + 'min' : '');
}

document.getElementById('filterPills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    renderAll();
});

document.querySelectorAll('.process-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.process-tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        processFilter = tab.dataset.processFilter === 'all' ? '' : tab.dataset.processFilter;
        renderAll();
    });
});

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        orderListEl.style.display = currentView === 'list' ? 'grid' : 'none';
        semaforoViewEl.style.display = currentView === 'sem' ? 'block' : 'none';
        kanbanViewEl.style.display = currentView === 'kanban' ? 'grid' : 'none';
        renderAll();
    });
});

document.addEventListener('click', (e) => {
    const toggleRow = e.target.closest('[data-action="toggle-row"]');
    if (toggleRow) {
        const code = toggleRow.dataset.order;
        const r = document.getElementById(`row-${code}`);
        if (r) {
            const open = r.classList.toggle('is-open');
            if (open) openRows.add(code); else openRows.delete(code);
        }
        return;
    }
    const openDrawerBtn = e.target.closest('[data-action="open-drawer"]');
    if (openDrawerBtn) {
        e.stopPropagation();
        openDrawer(openDrawerBtn.dataset.order);
        return;
    }
    const flipBtn = e.target.closest('[data-action="flip-card"]');
    if (flipBtn) {
        e.stopPropagation();
        flipCard(flipBtn.dataset.order);
        return;
    }
    const stepBtn = e.target.closest('[data-flow-step-index]');
    if (stepBtn) {
        e.stopPropagation();
        const idx = parseInt(stepBtn.dataset.flowStepIndex, 10);
        const box = stepBtn.closest('[id^="flow-"]');
        if (!box || isNaN(idx)) return;
        const code = box.id.replace('flow-', '');
        const steps = flowCache[code];
        if (!steps || !steps[idx]) return;
        const step = steps[idx];
        const isDone = String(step.routeStatus || '').toUpperCase() === 'COMPLETADO';
        stepBtn.disabled = true;
        const prevText = stepBtn.innerHTML;
        stepBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>';
        fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento/marca`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({ processKey: step.processKey, marked: !isDone })
        }).then(r => r.json()).then(() => {
            delete flowCache[code];
            loadFlowPanel(code);
        }).catch(() => {
            stepBtn.disabled = false;
            stepBtn.innerHTML = prevText;
        });
        return;
    }
});

document.querySelectorAll('.priority-opt').forEach(el => {
    el.addEventListener('click', () => setPriority(el.dataset.priority));
});

document.getElementById('bufferSlider')?.addEventListener('input', updateBuffer);
document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);
document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
document.getElementById('calcBtn')?.addEventListener('click', runCalc);
document.getElementById('btnCopy')?.addEventListener('click', copyResult);
document.getElementById('alertBannerClose')?.addEventListener('click', () => {
    document.getElementById('alertBanner').classList.remove('visible');
});
document.getElementById('refreshBtn')?.addEventListener('click', loadData);
sortSelect?.addEventListener('change', renderAll);
searchInput?.addEventListener('input', (e) => { searchTerm = e.target.value; renderAll(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

document.getElementById('ganttLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Copiar sesión a localStorage por si acaso
    try {
        const sessionData = sessionStorage.getItem('erp-user-session') || localStorage.getItem('erp-user-session');
        if (sessionData) localStorage.setItem('erp-user-session', sessionData);
    } catch (_) {}
    // Navegar en la misma ventana para preservar sessionStorage
    window.location.href = '/planificacion/gantt';
});

setInterval(loadData, 60000);
loadData();

// ── Toggle tema ────────────────────────────────────────────
function toggleTheme() {
    const root = document.documentElement;
    const current = root.dataset.themeMode === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('printlab-theme-mode', next); } catch (_) {}
    root.dataset.themeMode = next;
    root.dataset.theme = next;
    root.style.colorScheme = next;
}

// ── Sesión para APIs ───────────────────────────────────────
function sessionHeader() {
    var raw;
    try { raw = localStorage.getItem('erp-user-session'); } catch (_) {}
    if (!raw) return {};
    var s;
    try { s = JSON.parse(raw); } catch (_) { return {}; }
    return {
        'x-erp-session': JSON.stringify({
            id: s.id || s.userId || s.sessionId || '',
            userId: s.userId || s.id || '',
            username: s.username || s.user || '',
            user: s.user || s.username || '',
            name: s.fullName || s.name || s.user || s.username || '',
            fullName: s.fullName || s.name || '',
            photoUrl: s.photoUrl || s.photo_url || '',
            permissionName: s.permissionName || ''
        })
    };
}

// ── Fin ─────────────────────────────────────────────────────