/* ── CONSTANTES ── */
const API='/api';
const LABELS={orden_creada:'Creación de Orden',solicitud_vendedor:'Solicitud de Vendedor',planeacion:'Planificación',diseno:'Diseño',preprensa:'Preprensa',visto_bueno:'Visto Bueno',planchas:'Planchas',impresion:'Impresión',laminado:'Laminado',troquelado:'Troquelado',estampado:'Estampado',barnizado:'Barniz',embosado:'Embosado',numeracion:'Numeración',rebobinado:'Rebobinado',empaque:'Empaque'};
const PROCESS_ICON_KEYS={orden_creada:'produccionCreacionOrden',solicitud_vendedor:'produccionSolicitudVendedor',planeacion:'produccionPlanificacion',diseno:'produccionDiseno',preprensa:'produccionPreprensa',visto_bueno:'produccionVistoBueno',planchas:'produccionPlanchas',impresion:'produccionImpresion',laminado:'produccionLaminado',troquelado:'produccionTroquelado',estampado:'produccionEstampado',barnizado:'produccionBarniz',embosado:'produccionEmbozado',numeracion:'produccionNumerado',rebobinado:'produccionRebobinado',empaque:'produccionEmpaque'};
const ICONS={orden_creada:'+',solicitud_vendedor:'→',planeacion:'✓',diseno:'✏',preprensa:'⬛',visto_bueno:'✓',planchas:'▣',impresion:'◼',laminado:'◧',troquelado:'◈',estampado:'◆',barnizado:'◐',embosado:'◉',numeracion:'#',rebobinado:'↻',empaque:'□'};
let trackingConfig={icons:{},general:{}};
function isDarkMode(){return document.documentElement.getAttribute('data-theme')==='dark'}
function getIconConfig(key){const suffix=key.charAt(0).toUpperCase()+key.slice(1);const g=trackingConfig.general||{};return{value:trackingConfig.icons?.[key]||'',color1:g[`iconColor${suffix}`]||'#1e516d',color2:g[`iconColor2${suffix}`]||'#ffffff',hover:g[`iconColorHover${suffix}`]||'#0b81b8',size:Number(g[`iconSize${suffix}`])||18}}
function processIconConfig(processKey){const iconKey=PROCESS_ICON_KEYS[processKey];if(!iconKey)return null;const cfg=getIconConfig(iconKey);if(!cfg.value)return null;return cfg}
function iconMarkup(value,fallback,altText,size,color,hoverColor){
    const v=String(value||'').trim();
    const hc=hoverColor||color;
    if(/\.svg(\?|#|$)/i.test(v)||v.startsWith('data:image/svg+xml')){
        const safe=esc(v);
        return`<span class="process-icon-svg" role="img" aria-label="${esc(altText||'')}" style="display:inline-flex;width:${size}px;height:${size}px;-webkit-mask-image:url('${safe}');mask-image:url('${safe}');-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain;background-color:${color};--ic-h:${hc}"></span>`;
    }
    if(/^(\/|data:image\/)/i.test(v)){
        return`<img class="process-icon-img" src="${esc(v)}" alt="${esc(altText||'')}" style="width:${size}px;height:${size}px;object-fit:contain;display:block">`;
    }
    return`<span class="process-icon-glyph" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;font-size:${Math.round(size*.85)}px;color:${color};--ic-h:${hc}">${esc(v||'·')}</span>`;
}
function processIcon(processKey){const cfg=processIconConfig(processKey);if(!cfg)return`<span>${esc(ICONS[processKey]||'·')}</span>`;const color=isDarkMode()?cfg.color2:cfg.color1;return iconMarkup(cfg.value,ICONS[processKey]||'·',LABELS[processKey]||processKey,cfg.size,color,cfg.hover)}
const TRACKING_BASE_KEYS=['orden_creada','solicitud_vendedor','planeacion'];
const WORK_HRS=8;
const WORK_START=8;   // hora de inicio de jornada
const WORK_END=16;    // hora de fin de jornada (8h laborales: 08:00–16:00)
const WORK_DAYS=new Set([1,2,3,4,5,6]);
const Q_FACTOR={normal:1,premium:.45,urgent:.05};
const DEFAULT_Q={normal:0,premium:0,urgent:0};
const softLocks={};
const impacts={};

let allOrders=[];
let currentFilter='all';
let searchTerm='';
let drawerOrder=null;
let drawerPriority='normal';
let drawerBuffer=2;
let drawerResult=null;
const openRows=new Set();
const flowCache={};

function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function fmtDate(v){if(!v)return null;const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function fmtShort(v){if(!v)return null;const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('es-CR',{day:'2-digit',month:'short'})}
function fmtLong(d){return d.toLocaleDateString('es-CR',{weekday:'short',day:'2-digit',month:'long'})}
function capitalise(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function daysUntil(v){if(!v)return null;const d=new Date(v);if(isNaN(d))return null;const n=new Date();n.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.round((d-n)/86400000)}
function formatNumber(v,d){return Number(v||0).toLocaleString('es-CR',d!=null?{minimumFractionDigits:d,maximumFractionDigits:d}:{})}
function dateInputValue(v){const d=new Date(v);if(isNaN(d))return'';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function stepKey(p){return p?.key||p?.processKey||''}
function normalizeStepStatus(v){
  const s=norm(v);
  if(['completado','completa','complete','done','listo'].includes(s))return'done';
  if(['run','setup','active','running','en proceso'].includes(s))return'active';
  if(['paro','late','atrasado'].includes(s))return'late';
  return'pending';
}

function addWorkHours(from,hours){
  let d=new Date(from),rem=hours;
  while(!WORK_DAYS.has(d.getDay()))d.setDate(d.getDate()+1);
  if(d.getHours()<WORK_START)d.setHours(WORK_START,0,0,0);
  if(d.getHours()>=WORK_END){d.setDate(d.getDate()+1);d.setHours(WORK_START,0,0,0);while(!WORK_DAYS.has(d.getDay()))d.setDate(d.getDate()+1)}
  while(rem>0){
    const avail=Math.min(rem,WORK_END-d.getHours());
    d.setHours(d.getHours()+avail);
    rem-=avail;
    if(rem>0){d.setDate(d.getDate()+1);d.setHours(WORK_START,0,0,0);while(!WORK_DAYS.has(d.getDay()))d.setDate(d.getDate()+1)}
  }
  return d;
}

function orderStatus(o){
  const procs=Array.isArray(o.processChecklist)?o.processChecklist:[];
  const load=Array.isArray(o.processLoadSummary)?o.processLoadSummary:[];
  const days=daysUntil(o.promisedDeliveryDate||o.scheduledDeliveryDate);
  if(procs.length&&procs.every(p=>p.status==='done'||p.status==='complete'))return'done';
  if(load.some(r=>r.isLate)||days!==null&&days<0)return'late';
  if(days!==null&&days<=2)return'risk';
  if(procs.some(p=>p.status==='running'||p.status==='active'))return'running';
  return'ok';
}

function isPendingPlanning(o){
  return o.planningStatus==='PENDIENTE_PLANIFICACION';
}

function buildSteps(o){
  const cl=Array.isArray(o.processChecklist)?o.processChecklist:[];
  const lr=Array.isArray(o.processLoadSummary)?o.processLoadSummary:[];
  const hasBase=cl.some(p=>TRACKING_BASE_KEYS.includes(stepKey(p)));
  const flowBase=!hasBase&&Array.isArray(o.steps)
    ?o.steps.filter(s=>TRACKING_BASE_KEYS.includes(stepKey(s))).map(s=>({
      key:s.processKey,selected:true,base:true,label:s.processName,status:normalizeStepStatus(s.routeStatus),
      completedAt:s.completedAt,startedAt:s.startedAt
    }))
    :[];
  const sel=[...flowBase,...cl].filter(p=>p.selected||p.base||p.quoted).filter(p=>stepKey(p)!=='acabados');
  return sel.map((p,i)=>{
    const key=stepKey(p);
    const l=lr.find(r=>r.processKey===key)||{};
    return{key,label:LABELS[key]||p.label||p.processName||key,icon:processIcon(key),
      status:p.status?normalizeStepStatus(p.status):(l.status?normalizeStepStatus(l.status):(i===0?'active':'pending')),
      endDate:l.endDate||null,machine:l.machineName||p.machineName||null,
      hrs:l.durationHours?Math.round(l.durationHours):null,
      ordersAhead:l.ordersAhead??null,daysAhead:l.daysAhead??null,quoted:p.quoted};
  });
}

function findOrdersAhead(order,steps,detail){
  const currentCode=order.orderCode;
  const result=[];
  const lr=Array.isArray(order.processLoadSummary)?order.processLoadSummary:[];
  steps.forEach((s,idx)=>{
    const load=lr.find(r=>r.processKey===s.key)||{};
    const machine=load.machineName||s.machine||'';
    const d=detail[idx]||{};
    const procH=d.procH||s.hrs||8;
    const qH=d.qH||0;
    const ahead=[];
    allOrders.forEach(o=>{
      if(o.orderCode===currentCode)return;
      const oLr=Array.isArray(o.processLoadSummary)?o.processLoadSummary:[];
      const oLoad=oLr.find(r=>r.processKey===s.key)||{};
      const oMachine=oLoad.machineName||'';
      if(oMachine!==machine)return;
      const oSteps=buildSteps(o);
      const oStep=oSteps.find(st=>st.key===s.key);
      if(!oStep)return;
      const isDone=oStep.status==='done'||oStep.status==='complete';
      const isRunning=oStep.status==='active'||oStep.status==='running';
      const isLate=oStep.status==='late';
      if(isDone)return;
      const oQty=Number(o.orderedQuantity||0);
      const oProcH=oStep.hrs||8;
      const eta=o.promisedDeliveryDate||o.scheduledDeliveryDate||'';
      ahead.push({
        orderCode:o.orderCode,
        customerName:o.customerName||'',
        orderedQuantity:oQty,
        procH:oProcH,
        eta:eta,
        status:isRunning?'running':isLate?'late':'pending',
        machine:machine
      });
    });
    ahead.sort((a,b)=>{
      const da=a.eta?new Date(a.eta).getTime():Infinity;
      const db=b.eta?new Date(b.eta).getTime():Infinity;
      return da-db;
    });
    result.push({
      processKey:s.key,
      processLabel:s.label,
      machine:machine,
      procH:procH,
      qH:qH,
      start:d.start||null,
      end:d.end||null,
      orders:ahead
    });
  });
  return result;
}

function calcPct(steps){
  if(!steps.length)return 0;
  const done=steps.filter(s=>s.status==='done'||s.status==='complete').length;
  const active=steps.filter(s=>s.status==='active'||s.status==='running').length;
  return Math.round((done+active*.5)/steps.length*100);
}

function currentProcLabel(steps){
  const a=steps.find(s=>s.status==='active'||s.status==='running');
  if(a)return a.label;
  const p=steps.find(s=>s.status==='pending');
  return p?`Siguiente: ${p.label}`:'Terminada';
}

function estimate(order,priority,bufferDays){
  const steps=buildSteps(order);
  const qf=Q_FACTOR[priority];
  const dq=DEFAULT_Q[priority];
  let cursor=new Date();
  if(cursor.getHours()>=WORK_END){cursor.setDate(cursor.getDate()+1);cursor.setHours(WORK_START,0,0,0)}
  if(cursor.getHours()<WORK_START)cursor.setHours(WORK_START,0,0,0);
  while(!WORK_DAYS.has(cursor.getDay()))cursor.setDate(cursor.getDate()+1);

  let totalProc=0,totalQ=0;
  const detail=steps.map(s=>{
    // Bug 3: completed steps get zero time, just carry current cursor as start/end
    if(s.status==='done'||s.status==='complete'){
      return{...s,procH:0,qH:0,start:new Date(cursor),end:new Date(cursor)};
    }
    // Bug 4 fix: use planned minutes as fallback before inventing 8h
    const procH=s.hrs||(s.plannedMinutes?Math.round(s.plannedMinutes/60):null)||8;
    const rawQ=s.daysAhead!=null?s.daysAhead*WORK_HRS:dq;
    const qH=rawQ*qf;
    cursor=addWorkHours(cursor,qH);
    const start=new Date(cursor);
    cursor=addWorkHours(cursor,procH);
    totalProc+=procH;totalQ+=qH;
    return{...s,procH,qH,start,end:new Date(cursor)};
  });

  const bufH=bufferDays*WORK_HRS;
  const earlyEnd=new Date(cursor);
  const lateEnd=addWorkHours(cursor,bufH);

  const hasLoad=(order.processLoadSummary||[]).length>=steps.length*.6;
  const conf=hasLoad?'high':'med';

  return{detail,earlyEnd,lateEnd,totalProc,totalQ,bufH,conf,priority,bufferDays};
}

function simulateImpact(urgentOrder){
  Object.keys(softLocks).forEach(code=>{
    const order=allOrders.find(o=>o.orderCode===code);
    if(!order)return;
    const lock=softLocks[code];
    const shifted=addWorkHours(new Date(lock.earlyEnd),2*WORK_HRS);
    const diffDays=Math.round((shifted-new Date(lock.earlyEnd))/86400000);
    if(diffDays>=1){
      impacts[code]={prevDate:lock.earlyEnd,newDate:shifted,days:diffDays};
      order._impacted=true;
    }
  });
  showImpactAlert();
}

function showImpactAlert(){
  const n=Object.keys(impacts).length;
  if(!n)return;
  const banner=document.getElementById('alertBanner');
  document.getElementById('alertCount').textContent=n;
  document.getElementById('alertTitle').textContent=`${n} orden${n>1?'es':''} desplazada${n>1?'s':''} por una urgencia`;
  document.getElementById('alertMsg').textContent='Revisá las órdenes marcadas en rojo y comunicá el cambio al cliente.';
  banner.classList.add('visible');
  document.getElementById('countImpact').textContent=n;
  renderAll();
}

function dismissAlert(){
  document.getElementById('alertBanner').classList.remove('visible');
}

function renderProcessRow(s){
  const isLate=s.status==='late'||(s.endDate&&daysUntil(s.endDate)<0);
  const st=isLate?'late':s.status;
  const stLabel={done:'Listo',active:'En proceso',running:'En proceso',pending:'Pendiente',late:'Atrasado'}[st]||st;
  const pct=st==='done'?100:st==='active'||st==='running'?55:st==='late'?90:0;
  return`<div class="process-row">
    <div class="process-name-cell"><div class="process-icon ${st}">${s.icon}</div>
      <div><div class="process-label">${esc(s.label)}</div>${s.ordersAhead!=null?`<div class="process-sublabel">${s.ordersAhead} ord. delante</div>`:''}</div></div>
    <div class="duration-cell"><div class="duration-track"><div class="duration-fill ${st}" style="width:${pct}%"></div></div>${s.hoursStr?`<div class="duration-hours">${esc(s.hoursStr)}</div>`:''}</div>
    <div class="process-date-cell ${isLate?'late':!s.endDate?'pending':''}">${esc(s.endDate?fmtShort(s.endDate):'—')}</div>
    <div class="process-machine-cell">${esc(s.machine||'—')}</div>
    <div><span class="ps-badge ${st}"><span class="ps-dot"></span>${esc(stLabel)}</span></div>
  </div>`;
}

function renderOrderCard(o){
  const steps=buildSteps(o);
  const status=orderStatus(o);
  const pct=calcPct(steps);
  const days=daysUntil(o.promisedDeliveryDate||o.scheduledDeliveryDate);
  const eta=fmtDate(o.promisedDeliveryDate||o.scheduledDeliveryDate);
  const etaCls=status==='late'?'late':status==='risk'?'risk':'';
  const rowCls=status==='late'?'is-late':status==='risk'?'is-risk':'is-ok';
  const sl=softLocks[o.orderCode];
  const imp=impacts[o.orderCode];
  const hasEst=!!sl;
  const daysLabel=days===null?'':days<0?`hace ${Math.abs(days)}d`:days===0?'Hoy':`${days}d`;
  const stLabel={done:'Lista',running:'En proceso',ok:'En cola',risk:'En riesgo',late:'Atrasada'}[status]||status;

  const pips=steps.slice(0,8).map(s=>{
    const sc=s.status==='done'||s.status==='complete'?'done':s.status==='active'||s.status==='running'?'active':'pending';
    return`<div class="step-pip ${sc}" title="${esc(s.label)}"></div>`;
  }).join('');

  const impactTag=imp?`<span class="impact-tag">↑${imp.days}d · ${fmtShort(imp.newDate)}</span>`:'';

  return`<div class="order-row ${rowCls}${imp?' has-impact':''}" id="row-${esc(o.orderCode)}" data-code="${esc(o.orderCode)}" data-status="${esc(status)}">
    <div class="order-head" onclick="toggleRow('${esc(o.orderCode)}')">
      <div>
        <div class="order-code">${esc(o.orderCode)}${impactTag}</div>
        <div class="order-customer">${esc(o.customerName||'Sin cliente')}</div>
      </div>
      <div class="order-job">${esc(currentProcLabel(steps))}</div>
      <div class="order-eta">
        <div class="order-eta-label">Entrega${daysLabel?' · '+daysLabel:''}</div>
        <div class="order-eta-date ${etaCls}">${eta||'Sin fecha'}</div>
        ${sl?`<div style="font-size:10px;color:var(--accent);margin-top:2px">Est. ${fmtShort(sl.earlyEnd)}</div>`:''}
      </div>
      <button class="btn-estimate${hasEst?' has-estimate':''}" onclick="event.stopPropagation();openDrawer('${esc(o.orderCode)}')">${hasEst?'◈ Estimada':'◎ Estimar'}</button>
      <span class="order-status-badge ${status}">${stLabel}</span>
      <div class="order-toggle"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="order-progress-row">
      <div class="order-progress-track"><div class="order-progress-fill ${status}" style="width:${pct}%"></div></div>
      <div class="order-progress-steps">${pips}</div>
      <div class="order-pct ${status==='late'?'late':status==='running'?'running':status==='risk'?'risk':''}">${pct}%</div>
    </div>
    <div class="order-detail" id="detail-${esc(o.orderCode)}">
      <div class="proc-panel">
        <div class="proc-panel-header">
          <span class="proc-panel-title">Flujo de producción</span>
        </div>
        <div class="flow-panel" id="flow-${esc(o.orderCode)}">
          <div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div>
        </div>
      </div>
      ${imp?`<div style="padding:10px 20px;background:var(--red-bg);border-top:1px solid var(--red-border)">
        <span style="font-size:12px;color:var(--red);font-weight:600">⚠ Fecha desplazada por urgencia</span>
        <span style="font-size:11px;color:var(--red);margin-left:8px">Fecha anterior: ${fmtShort(imp.prevDate)} → Nueva estimacion: ${fmtShort(imp.newDate)}</span>
      </div>`:''}
      <div class="order-info-bar">
        <div class="info-cell"><div class="info-cell-label">Trabajo</div><div class="info-cell-value">${esc(o.jobName||o.productName||'—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Cantidad</div><div class="info-cell-value">${o.orderedQuantity?Number(o.orderedQuantity).toLocaleString('es-CR'):'—'}</div></div>
        <div class="info-cell"><div class="info-cell-label">Maquina</div><div class="info-cell-value">${esc(o.machineName||'—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Sustrato</div><div class="info-cell-value">${esc(o.materialName||'—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Tintas</div><div class="info-cell-value">${esc(o.tintDescription||'—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Vendedor</div><div class="info-cell-value">${esc(o.salespersonName||'—')}</div></div>
        <div class="info-cell"><div class="info-cell-label">Acciones</div><div class="info-cell-value" style="display:flex;gap:6px;margin-top:4px">
          <a class="hdr-btn" href="/orden-produccion/${esc(o.orderCode)}" style="font-size:11px;padding:4px 10px">Ver orden</a>
          <a class="hdr-btn" href="/planificacion/gantt?orderCode=${esc(o.orderCode)}" style="font-size:11px;padding:4px 10px">Gantt</a>
        </div></div>
      </div>
    </div>
  </div>`;
}

function updateSummary(){
  const active=allOrders.filter(o=>!isPendingPlanning(o));
  const pending=allOrders.filter(isPendingPlanning);
  const t=active.length,run=active.filter(o=>orderStatus(o)==='running').length,
    risk=active.filter(o=>orderStatus(o)==='risk').length,
    late=active.filter(o=>orderStatus(o)==='late').length,
    done=active.filter(o=>orderStatus(o)==='done').length,
    imp=Object.keys(impacts).length;
  document.getElementById('statTotal').textContent=t;
  document.getElementById('statRunning').textContent=run;
  document.getElementById('statRisk').textContent=risk;
  document.getElementById('statLate').textContent=late;
  document.getElementById('statDone').textContent=done;
  document.getElementById('countAll').textContent=t;
  document.getElementById('countLate').textContent=late;
  document.getElementById('countRisk').textContent=risk;
  document.getElementById('countRunning').textContent=run;
  document.getElementById('countDone').textContent=done;
  document.getElementById('countImpact').textContent=imp;
  const countPP=document.getElementById('countPendingPlanning');
  if(countPP)countPP.textContent=pending.length;
  renderPendingPlanningSummary(pending);
}

function renderPendingPlanningSummary(pending){
  const box=document.getElementById('pendingPlanningSummary');
  if(!box)return;
  if(currentFilter!=='pending_planning'||!pending.length){box.style.display='none';box.innerHTML='';return;}
  let sumDays=0,late=0,urgent=0,normal=0;
  pending.forEach(o=>{
    const d=daysUntil(o.promisedDeliveryDate||o.scheduledDeliveryDate);
    const buf=d==null?0:d;
    sumDays+=buf;
    if(d!=null&&d<0)late++;
    else if(d!=null&&d<=2)urgent++;
    else normal++;
  });
  const avg=pending.length?(sumDays/pending.length):0;
  box.style.display='flex';
  box.innerHTML=`
    <div class="pp-stat"><span class="pp-stat-num">${pending.length}</span><span class="pp-stat-label">Pendientes de planificación</span></div>
    <div class="pp-stat ${late?'pp-late':''}"><span class="pp-stat-num">${late}</span><span class="pp-stat-label">Atrasadas</span></div>
    <div class="pp-stat ${urgent?'pp-risk':''}"><span class="pp-stat-num">${urgent}</span><span class="pp-stat-label">≤ 2 días</span></div>
    <div class="pp-stat"><span class="pp-stat-num">${normal}</span><span class="pp-stat-label">Resto</span></div>
    <div class="pp-stat"><span class="pp-stat-num">${sumDays}d</span><span class="pp-stat-label">Suma de colchones</span></div>
    <div class="pp-stat"><span class="pp-stat-num">${avg.toFixed(1)}d</span><span class="pp-stat-label">Promedio</span></div>
  `;
}

function toggleRow(code){
  const r=document.getElementById(`row-${code}`);if(!r)return;
  const open=r.classList.toggle('is-open');
  if(open){openRows.add(code);loadFlowPanel(code);}else openRows.delete(code);
}

function openDrawer(code){
  const order=allOrders.find(o=>o.orderCode===code);
  if(!order)return;
  drawerOrder=order;
  drawerResult=null;
  document.getElementById('drawerCode').textContent=code+' · '+(order.customerName||'');
  document.getElementById('resultSection').style.display='none';
  document.getElementById('btnSetDate').style.display='none';
  document.getElementById('btnSetDate').disabled=false;
  document.getElementById('btnSetDate').textContent='Establecer fecha en orden';
  document.getElementById('btnGantt').style.display='none';
  document.getElementById('btnGantt').href=`/planificacion/gantt?orderCode=${code}`;
  document.getElementById('calcBtnText').textContent='Calcular fecha estimada';

  const tier=String(order.customerTier||order.clientTier||'').toUpperCase();
  setPriority(tier==='A'?'premium':'normal');
  updateBuffer();

  const steps=buildSteps(order);
  const lr=Array.isArray(order.processLoadSummary)?order.processLoadSummary:[];
  document.getElementById('drawerProcesses').innerHTML=steps.length
    ?steps.map(s=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);font-size:12px">
        <span style="font-size:14px">${s.icon}</span>
        <span style="flex:1;font-weight:500;color:var(--text)">${esc(s.label)}</span>
        ${s.hrs?`<span style="color:var(--text3);font-family:'DM Mono',monospace;font-size:11px">${s.hrs}h</span>`:''}
        ${s.machine?`<span style="color:var(--text3);font-size:11px">${esc(s.machine)}</span>`:''}
        ${s.ordersAhead!=null?`<span style="color:var(--amber);font-size:10px;font-weight:600">${s.ordersAhead} delante</span>`:''}
      </div>`).join('')
    :`<div style="color:var(--text3);font-size:12px;padding:8px">No hay procesos configurados en esta orden.</div>`;

  const drawer=document.getElementById('drawer');
  document.getElementById('drawerOverlay').classList.add('open');
  drawer.classList.add('open');
  drawer.style.transform='translateX(0)';
  document.body.style.overflow='hidden';
  setTimeout(runCalc, 200);
}

function closeDrawer(){
  document.getElementById('drawerOverlay').classList.remove('open');
  const drawer=document.getElementById('drawer');
  drawer.classList.remove('open');
  drawer.style.transform='';
  document.body.style.overflow='';
}

function buildProductionQueue(currentOrder){
  const currentCode=currentOrder.orderCode;
  const queue=[];
  allOrders.forEach(order=>{
    if(order.orderCode===currentCode)return;
    const status=orderStatus(order);
    if(status==='done')return;
    const steps=buildSteps(order);
    const activeStep=steps.find(s=>s.status==='active'||s.status==='running')||steps.find(s=>s.status==='pending');
    if(!activeStep)return;
    const lr=Array.isArray(order.processLoadSummary)?order.processLoadSummary:[];
    const load=lr.find(r=>r.processKey===activeStep.key)||{};
    const machine=load.machineName||activeStep.machine||'';
    const durationHours=Number(load.durationHours||activeStep.hrs||0);
    const eta=order.promisedDeliveryDate||order.scheduledDeliveryDate||'';
    let queueHours=0;
    let ordersAhead=0;
    allOrders.forEach(other=>{
      if(other.orderCode===order.orderCode)return;
      if(other.orderCode===currentCode)return;
      const oStatus=orderStatus(other);
      if(oStatus==='done')return;
      const oSteps=buildSteps(other);
      const oActive=oSteps.find(s=>s.status==='active'||s.status==='running')||oSteps.find(s=>s.status==='pending');
      if(!oActive)return;
      const oLr=Array.isArray(other.processLoadSummary)?other.processLoadSummary:[];
      const oLoad=oLr.find(r=>r.processKey===oActive.key)||{};
      const oMachine=oLoad.machineName||oActive.machine||'';
      if(oMachine!==machine)return;
      const oEta=other.promisedDeliveryDate||other.scheduledDeliveryDate||'';
      if(oEta&&eta&&oEta<=eta){
        ordersAhead++;
        queueHours+=Number(oLoad.durationHours||oActive.hrs||0);
      }
    });
    queue.push({
      orderCode:order.orderCode,
      customerName:order.customerName||'',
      jobName:order.jobName||order.productName||'',
      orderedQuantity:Number(order.orderedQuantity||0),
      currentProcess:activeStep.label,
      processKey:activeStep.key,
      machine:machine,
      durationHours:durationHours,
      queueHours:queueHours,
      ordersAhead:ordersAhead,
      eta:eta,
      status:status
    });
  });
  queue.sort((a,b)=>b.queueHours-a.queueHours);
  return queue;
}

function openOrdersAheadModal(){
  if(!drawerResult||!drawerOrder)return;
  const{totalProc,totalQ,bufH,priority,bufferDays}=drawerResult;
  const queue=buildProductionQueue(drawerOrder);
  const el=document.getElementById('ordersAheadModal');
  const body=document.getElementById('ordersAheadBody');
  const earlyStr=capitalise(fmtLong(drawerResult.earlyEnd));
  const lateStr=capitalise(fmtLong(drawerResult.lateEnd));
  const totalOrders=queue.length;
  const totalQueueH=queue.reduce((s,o)=>s+o.queueHours,0);

  let html=`
    <div class="oam-summary">
      <div class="oam-summary-row">
        <div class="oam-summary-item oam-si-proc"><div class="oam-si-icon">⚙</div><div><div class="oam-si-val">${Math.round(totalProc)}h</div><div class="oam-si-lbl">Produccion</div></div></div>
        <div class="oam-summary-item oam-si-queue"><div class="oam-si-icon">⏳</div><div><div class="oam-si-val">${Math.round(totalQueueH)}h</div><div class="oam-si-lbl">En cola</div></div></div>
        <div class="oam-summary-item oam-si-buffer"><div class="oam-si-icon">🛡</div><div><div class="oam-si-val">${Math.round(bufH)}h</div><div class="oam-si-lbl">Colchon</div></div></div>
      </div>
      <div class="oam-summary-eta"><strong>Entrega estimada:</strong> ${earlyStr}${bufferDays>0?' – '+lateStr:''}</div>
    </div>`;

  if(!totalOrders){
    html+=`<div class="oam-empty">No hay otras ordenes compitiendo por las mismas maquinas en este momento.</div>`;
  }else{
    html+=`<div class="oam-section-title">${totalOrders} orden${totalOrders!==1?'es':''} en la cola de produccion</div>`;
    queue.forEach(o=>{
      const qty=o.orderedQuantity;
      const eta=o.eta?fmtShort(o.eta):'Sin fecha';
      const stCls=o.status==='running'?'oam-st-running':o.status==='late'?'oam-st-late':'oam-st-pending';
      const stLbl=o.status==='running'?'Procesando':o.status==='late'?'Atrasada':'En cola';
      html+=`<div class="oam-order">
        <div class="oam-order-left">
          <div class="oam-order-code">${esc(o.orderCode)}</div>
          <div class="oam-order-customer">${esc(o.customerName||'Sin cliente')}${o.jobName?' · '+esc(o.jobName):''}</div>
        </div>
        <div class="oam-order-qty"><div class="oam-order-qty-val">${formatNumber(qty)}</div><div class="oam-order-qty-lbl">piezas</div></div>
        <div class="oam-order-hrs"><div class="oam-order-hrs-val">${o.durationHours}h</div><div class="oam-order-hrs-lbl">produccion</div></div>
        <div class="oam-order-status"><span class="${stCls}">${stLbl}</span><div class="oam-order-eta">${esc(eta)}</div></div>
      </div>`;
    });
  }
  body.innerHTML=html;
  el.classList.add('open');
  document.body.style.overflow='hidden';
}

function closeOrdersAheadModal(){
  document.getElementById('ordersAheadModal').classList.remove('open');
  if(!document.getElementById('drawer').classList.contains('open')){
    document.body.style.overflow='';
  }
}

function setPriority(p){
  drawerPriority=p;
  ['normal','premium','urgent'].forEach(id=>{
    const el=document.getElementById(`opt-${id}`)||document.querySelector(`.priority-opt[data-priority="${id}"]`);
    if(el)el.className='priority-opt'+(id===p?` sel-${id}`:'');
  });
}

function updateBuffer(){
  drawerBuffer=parseInt(document.getElementById('bufferSlider').value)||0;
  document.getElementById('bufferVal').textContent=drawerBuffer===0?'0d':`+${drawerBuffer}d`;
}

function runCalc(){
  if(!drawerOrder)return;
  const btn=document.getElementById('calcBtn');
  const sp=document.getElementById('calcSpinner');
  const tx=document.getElementById('calcBtnText');
  btn.disabled=true;sp.style.display='block';tx.textContent='Calculando...';
  setTimeout(()=>{
    try{
      const r=estimate(drawerOrder,drawerPriority,drawerBuffer);
      drawerResult=r;
      renderDrawerResult(r);
    }catch(e){console.error(e)}
    finally{btn.disabled=false;sp.style.display='none';tx.textContent='Recalcular'}
  },500);
}

function renderDrawerResult(r){
  const{earlyEnd,lateEnd,totalProc,totalQ,bufH,conf,priority,bufferDays,detail}=r;
  const dateCls=priority==='premium'?'premium':priority==='urgent'?'urgent':'';
  const earlyStr=capitalise(fmtLong(earlyEnd));
  const lateStr=capitalise(fmtLong(lateEnd));

  document.getElementById('resDateBig').textContent=earlyStr;
  document.getElementById('resDateBig').className='result-date-big'+( dateCls?' '+dateCls:'');
  document.getElementById('resRange').textContent=bufferDays>0
    ?`Rango: ${earlyStr} – ${lateStr}`
    :`Sin colchon — fecha fija`;

  const steps=buildSteps(drawerOrder);
  const groups=findOrdersAhead(drawerOrder,steps,detail);
  const totalAhead=groups.reduce((s,g)=>s+g.orders.length,0);
  const confEl=document.getElementById('resConf');
  if(totalQ>0){
    confEl.innerHTML=`<button class="btn-orders-ahead" onclick="openOrdersAheadModal()"><span class="orders-ahead-dot"></span>${totalAhead} orden${totalAhead!==1?'es':''} en cola · Ver detalle</button>`;
  }else{
    confEl.innerHTML=`<span class="orders-ahead-dot" style="background:var(--accent)"></span>Sin ordenes en cola`;
  }
  confEl.className='result-confidence';

  const breakdown=[];
  if(totalProc>0)breakdown.push({cls:'var(--accent)',name:'Produccion',detail:`${steps.length} procesos en secuencia`,hrs:totalProc});
  if(totalQ>0)breakdown.push({cls:'#F5A623',name:'Espera en cola',detail:priority==='urgent'?'Entrada directa':priority==='premium'?'Cola reducida ~55%':'Cola actual de maquinas',hrs:totalQ});
  if(bufH>0)breakdown.push({cls:'var(--blue)',name:'Colchon de seguridad',detail:`${bufferDays}d habil${bufferDays!==1?'es':''} de margen`,hrs:bufH});

  document.getElementById('resBreakdown').innerHTML=breakdown.map(b=>`
    <div class="breakdown-item">
      <div class="breakdown-dot" style="background:${b.cls}"></div>
      <div class="breakdown-label"><strong style="color:var(--text)">${esc(b.name)}</strong><br><span style="font-size:10px">${esc(b.detail)}</span></div>
      <div class="breakdown-hrs">${Math.round(b.hrs)}h</div>
    </div>`).join('');

  let note='';
  if(totalQ>totalProc)note=`<div class="queue-warning"><strong>⚠ La cola supera la producción</strong>Considera subir la prioridad si la fecha es critica para el cliente.</div>`;
  if(priority==='premium')note=`<div class="premium-note"><strong>◈ Cliente A — prioridad activada</strong>Fecha calculada adelantando ~55% de la cola. Confirma disponibilidad con planificacion.</div>`;
  if(priority==='urgent')note=`<div class="premium-note" style="background:var(--red-bg);border-color:var(--red-border);color:var(--red)"><strong>⚡ Urgente — entrada directa</strong>Requiere autorizacion de planificacion. Puede desplazar otras ordenes con bloqueo suave.</div>`;
  document.getElementById('resNote').innerHTML=note;

  document.getElementById('resultSection').style.display='block';
  document.getElementById('btnSetDate').style.display='flex';
  document.getElementById('btnGantt').style.display='block';

  if(document.getElementById('lockToggle').checked){
    softLocks[drawerOrder.orderCode]={earlyEnd,lateEnd,priority};
    const btn=document.querySelector(`#row-${drawerOrder.orderCode} .btn-estimate`);
    if(btn){btn.textContent='◈ Estimada';btn.classList.add('has-estimate')}
    if(priority==='urgent'){
      setTimeout(()=>{simulateImpact(drawerOrder);updateSummary();},800);
    }
  }

  const etaLine=document.querySelector(`#row-${drawerOrder.orderCode} .order-eta`);
  if(etaLine){
    const estLine=etaLine.querySelector('div:last-child');
    if(estLine&&estLine.style.color==='var(--accent)'){
      estLine.textContent=`Est. ${fmtShort(earlyEnd)}`;
    }else{
      const d=document.createElement('div');
      d.style.cssText='font-size:10px;color:var(--accent);margin-top:2px';
      d.textContent=`Est. ${fmtShort(earlyEnd)}`;
      etaLine.appendChild(d);
    }
  }
}

function updateLock(){
  if(!drawerResult)return;
  const on=document.getElementById('lockToggle').checked;
  if(on&&drawerOrder){
    softLocks[drawerOrder.orderCode]={earlyEnd:drawerResult.earlyEnd,lateEnd:drawerResult.lateEnd,priority:drawerPriority};
  }else if(drawerOrder){
    delete softLocks[drawerOrder.orderCode];
    delete impacts[drawerOrder.orderCode];
    if(drawerOrder._impacted){delete drawerOrder._impacted;renderList()}
  }
}

async function setDateInOrder(){
  if(!drawerResult||!drawerOrder)return;
  const btn=document.getElementById('btnSetDate');
  const{earlyEnd,lateEnd,bufferDays,conf}=drawerResult;
  const committedEnd=bufferDays>0?lateEnd:earlyEnd;
  btn.disabled=true;
  btn.textContent='Guardando fecha...';
  try{
    const response=await fetch(`${API}/ordenes-produccion/${encodeURIComponent(drawerOrder.orderCode)}/details`,{
      method:'PATCH',
      headers:Object.assign({'Content-Type':'application/json'},sessionHeader()),
      body:JSON.stringify({planningControl:{
        promisedDeliveryDate:dateInputValue(committedEnd),
        scheduledDeliveryDate:dateInputValue(earlyEnd),
        estimatePriority:drawerPriority,
        deliveryBufferBusinessDays:bufferDays,
        estimatedProductionEndDate:earlyEnd.toISOString(),
        estimatedDeliveryDateEarly:earlyEnd.toISOString(),
        estimatedDeliveryDateLate:lateEnd.toISOString(),
        estimatedAt:new Date().toISOString(),
        estimatedBy:'',
        estimationConfidence:conf
      }})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false)throw new Error(data.error||'No fue posible guardar la fecha.');
    drawerOrder.promisedDeliveryDate=dateInputValue(committedEnd);
    drawerOrder.scheduledDeliveryDate=dateInputValue(earlyEnd);
    drawerOrder.productionEndDate=earlyEnd.toISOString();
    drawerOrder.estimatedDeliveryDateEarly=earlyEnd.toISOString();
    drawerOrder.estimatedDeliveryDateLate=lateEnd.toISOString();
    softLocks[drawerOrder.orderCode]={earlyEnd,lateEnd,priority:drawerPriority};
    btn.textContent='Fecha establecida en la orden';
    updateSummary();
    renderAll();
  }catch(error){
    btn.disabled=false;
    btn.textContent='Establecer fecha en orden';
    alert(error.message||'No fue posible guardar la fecha en la orden.');
  }
}

async function loadData(){
  const btn=document.getElementById('refreshBtn');
  btn.textContent='...';btn.disabled=true;
  try{
    const [segRes,lanRes]=await Promise.all([
      fetch(`${API}/planificacion/seguimiento`).catch(()=>null),
      fetch(`${API}/planificacion/lanzamiento`).catch(()=>null)
    ]);
    const segData=segRes&&segRes.ok?await segRes.json():{ok:false,items:[]};
    const lanData=lanRes&&lanRes.ok?await lanRes.json():{ok:false,items:[]};
    if(!segData.ok&&!lanData.ok)throw new Error(segData.error||lanData.error||'Error al cargar ordenes.');
    const byCode=new Map();
    (segData.items||[]).forEach(o=>byCode.set(o.orderCode,o));
    (lanData.items||[]).forEach(o=>{if(!byCode.has(o.orderCode))byCode.set(o.orderCode,o)});
    allOrders=Array.from(byCode.values());
    const listBox=document.getElementById('orderList');
    const scrollY=listBox?listBox.scrollTop:0;
    updateSummary();renderAll();
    if(listBox)listBox.scrollTop=scrollY;
    document.getElementById('liveIndicator').style.background='#1D9E75';
  }catch(err){
    document.getElementById('liveIndicator').style.background='#E24B4A';
    loadDemoData();
  }finally{btn.textContent='↻ Actualizar';btn.disabled=false}
}

function loadDemoData(){
  const today=new Date();
  const dd=o=>{const d=new Date(today);d.setDate(d.getDate()+o);return d.toISOString().split('T')[0]};
  allOrders=[
    {orderCode:'ORD-2044',customerName:'Envases del Pacifico',customerTier:'B',jobName:'Etiqueta Mango 500ml',promisedDeliveryDate:dd(-1),machineName:'Flexo 4',orderedQuantity:85000,materialName:'BOPP Trans. 40u',tintDescription:'CMYK + Blanco',salespersonName:'M. Vargas',
      processChecklist:[{key:'diseno',selected:true,status:'done'},{key:'preprensa',selected:true,status:'done'},{key:'impresion',selected:true,status:'active'},{key:'laminado',selected:true,status:'pending'},{key:'troquelado',selected:true,status:'pending'}],
      processLoadSummary:[{processKey:'impresion',machineName:'Flexo 4',endDate:dd(-1),ordersAhead:0,daysAhead:0,isLate:true,durationHours:18},{processKey:'laminado',machineName:'Laminadora 1',endDate:dd(0),ordersAhead:1,daysAhead:.5,durationHours:4},{processKey:'troquelado',machineName:'Troquel A',endDate:dd(1),ordersAhead:2,daysAhead:1,durationHours:3}]},
    {orderCode:'ORD-2041',customerName:'Lacteos La Meseta',customerTier:'A',jobName:'Flow Pack Queso 250g',promisedDeliveryDate:dd(1),machineName:'Flexo 2',orderedQuantity:120000,materialName:'PE Termo 60u',tintDescription:'3 Tintas',salespersonName:'K. Montero',
      processChecklist:[{key:'diseno',selected:true,status:'done'},{key:'impresion',selected:true,status:'active'},{key:'empaque',selected:true,status:'pending'}],
      processLoadSummary:[{processKey:'impresion',machineName:'Flexo 2',endDate:dd(1),ordersAhead:0,durationHours:24},{processKey:'empaque',machineName:'Emp. 3',endDate:dd(2),ordersAhead:1,durationHours:2}]},
    {orderCode:'ORD-2038',customerName:'Cafe Britt',customerTier:'B',jobName:'Bolsa Cafe Molido Premium',promisedDeliveryDate:dd(3),machineName:'Flexo 1',orderedQuantity:45000,materialName:'PET/FOIL/PE',tintDescription:'CMYK',salespersonName:'A. Solis',
      processChecklist:[{key:'diseno',selected:true,status:'done'},{key:'preprensa',selected:true,status:'done'},{key:'impresion',selected:true,status:'done'},{key:'laminado',selected:true,status:'active'},{key:'barnizado',selected:true,status:'pending'},{key:'empaque',selected:true,status:'pending'}],
      processLoadSummary:[{processKey:'laminado',machineName:'Laminadora 2',endDate:dd(2),ordersAhead:0,durationHours:8},{processKey:'barnizado',machineName:'Barniz UV',endDate:dd(3),ordersAhead:1,durationHours:2},{processKey:'empaque',machineName:'Emp. 1',endDate:dd(3),ordersAhead:0,durationHours:1}]},
    {orderCode:'ORD-2036',customerName:'Pepsico CR',customerTier:'B',jobName:'Bolsa Papas Fritas XL',promisedDeliveryDate:dd(5),machineName:'Flexo 3',orderedQuantity:200000,materialName:'BOPP Metalizado',tintDescription:'6 Tintas',salespersonName:'R. Jimenez',
      processChecklist:[{key:'diseno',selected:true,status:'done'},{key:'preprensa',selected:true,status:'done'},{key:'impresion',selected:true,status:'pending'},{key:'laminado',selected:true,status:'pending'},{key:'troquelado',selected:true,status:'pending'},{key:'empaque',selected:true,status:'pending'}],
      processLoadSummary:[{processKey:'impresion',machineName:'Flexo 3',endDate:dd(4),ordersAhead:2,durationHours:36},{processKey:'laminado',machineName:'Laminadora 1',endDate:dd(5),ordersAhead:1,durationHours:6},{processKey:'troquelado',machineName:'Troquel B',endDate:dd(6),ordersAhead:0,durationHours:3},{processKey:'empaque',machineName:'Emp. 2',endDate:dd(6),ordersAhead:0,durationHours:2}]},
    {orderCode:'ORD-2033',customerName:'Dos Pinos',customerTier:'A',jobName:'Etiqueta Leche Descremada',promisedDeliveryDate:dd(7),machineName:'Flexo 4',orderedQuantity:300000,materialName:'PP Blanco 60u',tintDescription:'5 Tintas + Barniz',salespersonName:'M. Vargas',
      processChecklist:[{key:'diseno',selected:true,status:'done'},{key:'preprensa',selected:true,status:'done'},{key:'impresion',selected:true,status:'done'},{key:'barnizado',selected:true,status:'done'},{key:'troquelado',selected:true,status:'done'},{key:'empaque',selected:true,status:'done'}],
      processLoadSummary:[]},
  ];
  updateSummary();renderAll();
  document.getElementById('liveIndicator').style.background='#F5A623';
}

let currentView='list';

function setView(v){
  currentView=v;
  document.querySelectorAll('.view-btn[data-view]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.view===v);
  });
  document.getElementById('orderList').style.display=v==='list'?'grid':'none';
  document.getElementById('semaforoView').style.display=v==='sem'?'block':'none';
  document.getElementById('kanbanView').style.display=v==='kanban'?'grid':'none';
  renderAll();
}

function renderAll(){
  const term=norm(searchTerm);
  const sort=document.getElementById('sortSelect').value;
  let filtered=allOrders.filter(o=>{
    const match=!term||norm([o.orderCode,o.customerName,o.jobName,o.productName].join(' ')).includes(term);
    if(!match)return false;
    if(currentFilter==='pending_planning')return isPendingPlanning(o);
    if(isPendingPlanning(o))return false;
    if(currentFilter==='all')return true;
    if(currentFilter==='impact')return!!impacts[o.orderCode];
    return orderStatus(o)===currentFilter;
  });
  filtered.sort((a,b)=>{
    if(sort==='eta')return String(a.promisedDeliveryDate||'').localeCompare(String(b.promisedDeliveryDate||''));
    if(sort==='status'){const r={late:0,risk:1,running:2,ok:3,done:4};return(r[orderStatus(a)]??9)-(r[orderStatus(b)]??9)}
    if(sort==='progress')return calcPct(buildSteps(b))-calcPct(buildSteps(a));
    return String(a.orderCode||'').localeCompare(String(b.orderCode||''));
  });
  if(currentView==='list')renderList(filtered);
  else if(currentView==='sem')renderSemaforo(filtered);
  else renderKanban(filtered);
}

function renderList(orders){
  const term=norm(searchTerm);
  const sort=document.getElementById('sortSelect').value;

  if(!orders){
    orders=allOrders.filter(o=>{
      const match=!term||norm([o.orderCode,o.customerName,o.jobName,o.productName].join(' ')).includes(term);
      if(!match)return false;
      if(currentFilter==='pending_planning')return isPendingPlanning(o);
      if(isPendingPlanning(o))return false;
      if(currentFilter==='all')return true;
      if(currentFilter==='impact')return!!impacts[o.orderCode];
      return orderStatus(o)===currentFilter;
    });
    orders.sort((a,b)=>{
      if(sort==='eta')return String(a.promisedDeliveryDate||'').localeCompare(String(b.promisedDeliveryDate||''));
      if(sort==='status'){const r={late:0,risk:1,running:2,ok:3,done:4};return(r[orderStatus(a)]??9)-(r[orderStatus(b)]??9)}
      if(sort==='progress')return calcPct(buildSteps(b))-calcPct(buildSteps(a));
      return String(a.orderCode||'').localeCompare(String(b.orderCode||''));
    });
  }

  const box=document.getElementById('orderList');
  if(!orders.length){
    box.innerHTML=`<div class="empty-state"><div class="empty-state-icon">◎</div><div style="font-size:14px;color:var(--text3)">No hay ordenes que coincidan.</div></div>`;
    return;
  }
  box.innerHTML=orders.map(renderOrderCard).join('');
  openRows.forEach(code=>{const r=document.getElementById(`row-${code}`);if(r){r.classList.add('is-open');loadFlowPanel(code,true);}});
}

function renderSemaforo(orders){
  const box=document.getElementById('semaforoList');
  if(!orders.length){
    box.innerHTML=`<div class="empty-state"><div class="empty-state-icon">◎</div><div style="font-size:14px">No hay ordenes que coincidan.</div></div>`;
    return;
  }
  const stLabels={done:'Lista',running:'En proceso',ok:'En cola',risk:'En riesgo',late:'Atrasada'};
  box.innerHTML=orders.map(o=>{
    const steps=buildSteps(o);
    const status=orderStatus(o);
    const pct=calcPct(steps);
    const days=daysUntil(o.promisedDeliveryDate||o.scheduledDeliveryDate);
    const eta=fmtShort(o.promisedDeliveryDate||o.scheduledDeliveryDate);
    const etaCls=status==='late'?'late':status==='risk'?'risk':'ok';
    const rowCls=status==='late'?'is-late':status==='risk'?'is-risk':'is-ok';
    const imp=impacts[o.orderCode];
    const sl=softLocks[o.orderCode];
    const hasEst=!!sl;
    const daysLabel=days===null?'':days<0?`Hace ${Math.abs(days)}d`:days===0?'Hoy':`En ${days}d`;

    const maxPips=Math.min(steps.length,12);
    const pips=steps.slice(0,maxPips).map(s=>{
      const sc=s.status==='done'||s.status==='complete'?'done':
               s.status==='active'||s.status==='running'?'active':
               (status==='late'&&s.status==='active')?'late':'pending';
      return`<div class="sem-stage ${sc}" title="${esc(s.label)}"></div>`;
    }).join('');

    return`<div class="sem-row ${rowCls}${imp?' has-impact':''}" onclick="openDrawer('${esc(o.orderCode)}')">
      <div>
        <div class="sem-code">${esc(o.orderCode)}${imp?`<span style="font-size:9px;color:var(--red);font-weight:700;margin-left:4px">↑${imp.days}d</span>`:''}</div>
        <div class="sem-customer">${esc(o.customerName||'—')}</div>
      </div>
      <div class="sem-process">${esc(currentProcLabel(steps))}</div>
      <div class="sem-stages">${pips}</div>
      <div class="sem-light">
        <div class="sem-dot ${status}"></div>
        <span class="sem-label">${esc(stLabels[status]||status)}</span>
      </div>
      <div class="sem-dates">
        <div class="sem-eta ${etaCls}">${eta||'—'}</div>
        <div class="sem-days">${esc(daysLabel)}</div>
        ${sl?`<div class="sem-est">Est. ${fmtShort(sl.earlyEnd)}</div>`:''}
        ${imp?`<div style="font-size:10px;color:var(--red);font-weight:600">→ ${fmtShort(imp.newDate)}</div>`:''}
      </div>
      <button class="sem-btn${hasEst?' has-estimate':''}" onclick="event.stopPropagation();openDrawer('${esc(o.orderCode)}')">${hasEst?'◈ Est.':'◎ Estimar'}</button>
    </div>`;
  }).join('');
}

function renderKanban(orders){
  const cols={ok:[],running:[],alert:[]};
  orders.forEach(o=>{
    const s=orderStatus(o);
    if(s==='done')return;
    if(s==='late'||s==='risk'||impacts[o.orderCode])cols.alert.push(o);
    else if(s==='running')cols.running.push(o);
    else cols.ok.push(o);
  });

  ['ok','running','alert'].forEach(col=>{
    const box=document.getElementById(`kcol-${col}`);
    const cnt=document.getElementById(`kcCount-${col}`);
    cnt.textContent=cols[col].length;
    if(!cols[col].length){
      box.innerHTML=`<div class="kanban-empty">Sin ordenes</div>`;
      return;
    }
    box.innerHTML=cols[col].map(o=>{
      const steps=buildSteps(o);
      const status=orderStatus(o);
      const pct=calcPct(steps);
      const days=daysUntil(o.promisedDeliveryDate||o.scheduledDeliveryDate);
      const eta=fmtShort(o.promisedDeliveryDate||o.scheduledDeliveryDate);
      const etaCls=status==='late'?'late':status==='risk'?'risk':'ok';
      const rowCls=status==='late'?'is-late':status==='risk'?'is-risk':'is-ok';
      const imp=impacts[o.orderCode];
      const sl=softLocks[o.orderCode];
      const daysLabel=days===null?'':days<0?`hace ${Math.abs(days)}d`:days===0?'Hoy':`${days}d`;

      const maxPips=Math.min(steps.length,8);
      const pips=steps.slice(0,maxPips).map(s=>{
        const sc=s.status==='done'||s.status==='complete'?'done':s.status==='active'||s.status==='running'?'active':'pending';
        return`<div class="kc-pip ${sc}" title="${esc(s.label)}"></div>`;
      }).join('');

      return`<div class="kanban-card ${rowCls}${imp?' has-impact':''}" onclick="openDrawer('${esc(o.orderCode)}')">
        <div class="kc-code">${esc(o.orderCode)}${imp?`<span class="impact-tag" style="font-size:9px;padding:1px 5px;margin-left:5px">+${imp.days}d</span>`:''}</div>
        <div class="kc-customer">${esc(o.customerName||'—')}</div>
        <div class="kc-process">${esc(currentProcLabel(steps))}</div>
        <div class="kc-pips">${pips}</div>
        ${sl?`<div class="kc-est">◈ Est. ${fmtShort(sl.earlyEnd)}${drawerBuffer>0?` – ${fmtShort(sl.lateEnd)}`:''}</div>`:''}
        ${imp?`<div class="kc-impact">⚠ Desplazada → ${fmtShort(imp.newDate)}</div>`:''}
        <div class="kc-bottom">
          <div class="kc-eta ${etaCls}">${eta||'Sin fecha'}${daysLabel?' · '+daysLabel:''}</div>
          <button class="kc-btn" onclick="event.stopPropagation();openDrawer('${esc(o.orderCode)}')">${sl?'◈':'◎'} Estimar</button>
        </div>
      </div>`;
    }).join('');
  });
}

function setFilter(f,btn){
  currentFilter=f;
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderPendingPlanningSummary(allOrders.filter(isPendingPlanning));
  renderAll();
}

document.getElementById('searchInput').addEventListener('input',e=>{searchTerm=e.target.value;renderAll()});
document.getElementById('ganttLink').addEventListener('click',e=>{
  if(window.parent&&window.location.search.includes('shell=1')){
    e.preventDefault();
    window.parent.postMessage({type:'erp-open-tab',route:'/planificacion/gantt?shell=1',label:'Gantt'},'*');
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
document.querySelectorAll('.priority-opt[data-priority]').forEach(opt=>{
  opt.addEventListener('click',()=>setPriority(opt.dataset.priority));
});
document.querySelectorAll('.view-btn[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>setView(btn.dataset.view));
});
document.querySelectorAll('.filter-pill[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>setFilter(btn.dataset.filter,btn));
});
document.getElementById('bufferSlider')?.addEventListener('input',updateBuffer);
document.getElementById('lockToggle')?.addEventListener('change',updateLock);
document.getElementById('drawerClose')?.addEventListener('click',closeDrawer);
document.getElementById('drawerOverlay')?.addEventListener('click',closeDrawer);
document.getElementById('calcBtn')?.addEventListener('click',runCalc);
document.getElementById('btnSetDate')?.addEventListener('click',setDateInOrder);
document.getElementById('refreshBtn')?.addEventListener('click',loadData);
document.getElementById('sortSelect')?.addEventListener('change',renderAll);
setInterval(loadData,60000);
fetch('/api/config/shell').then(r=>r.ok?r.json():{}).catch(()=>({})).then(cfg=>{trackingConfig=cfg||trackingConfig;loadData()});
new MutationObserver(()=>renderAll()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

const TRACKING_FIXED_KEYS = new Set(['orden_creada','solicitud_vendedor','planeacion']);
const TRACKING_MACHINE_KEYS = new Set(['planchas','impresion','acabados','barnizado','laminado','troquelado','estampado','embosado','numeracion','rebobinado']);

async function loadFlowPanel(code, silent) {
  const box = document.getElementById(`flow-${code}`);
  if (!box) return;
  if (!silent) box.innerHTML = '<div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div>';
  try {
    await loadTrackingUserPhotos();
    const res = await fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento`, { headers: sessionHeader() });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'no-flow');
    const steps = Array.isArray(data.steps) ? data.steps : [];
    flowCache[code] = steps;
    renderFlowPanel(box, code, steps);
    bindTrackingAvatarFallback(box);
  } catch(e) {
    box.innerHTML = '<div class="flow-empty">No se pudo cargar el flujo de producción.</div>';
  }
}

function renderFlowPanel(box, code, steps) {
  if (!steps || !steps.length) {
    box.innerHTML = '<div class="flow-empty">No hay flujo de producción registrado para esta orden.</div>';
    return;
  }
  const doneCount = steps.filter(s => String(s.routeStatus||'').toUpperCase() === 'COMPLETADO').length;
  const total = steps.length;
  const pct   = Math.round(doneCount / total * 100);

  const cntBg  = doneCount === total ? 'var(--accent-bg)' : doneCount > 0 ? 'var(--amber-bg)' : 'var(--surface2)';
  const cntClr = doneCount === total ? 'var(--accent)'    : doneCount > 0 ? 'var(--amber)'    : 'var(--text3)';

  let tlHtml = '';
  steps.forEach((s, i) => {
    const status   = String(s.routeStatus || 'PENDIENTE').toUpperCase();
    const isDone   = status === 'COMPLETADO';
    const isActive = ['RUN','SETUP'].includes(status);
    const isStopped= status === 'PARO';
    const isLast   = i === steps.length - 1;

    const markerName  = String(s.completedBy || s.startedBy || '').trim();
    const markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim() || (markerName ? trackingUserPhotos.get(trackingUserLookupKey(markerName)) : '');
    let nodeCls = 'flow-tl-node';
    if (isDone)    nodeCls += ' done';
    else if (isActive)  nodeCls += ' active';
    else if (isStopped) nodeCls += ' stopped';

    let nodeInner = '';
    if (markerName) {
      const hasPhoto = Boolean(markerPhoto);
      nodeCls += ' has-avatar' + (hasPhoto ? ' has-photo' : '');
      nodeInner = `<span class="flow-tl-avatar-clip">${trackingAvatarMarkup(markerName, markerPhoto)}</span><span class="flow-tl-badge">✓</span>`;
    } else if (isDone) {
      nodeInner = `<span>✓</span>`;
    } else if (isActive) {
      nodeInner = `<span style="font-size:9px;font-weight:700">▶</span>`;
    } else {
      nodeInner = `<span style="font-size:10px;color:var(--text3)">${i+1}</span>`;
    }

    const nextDone = !isLast && String(steps[i+1]?.routeStatus||'').toUpperCase() === 'COMPLETADO';
    const connector = isLast ? '' : `<div class="flow-tl-connector ${isDone && nextDone ? 'solid' : 'dashed'}"></div>`;

    const titleCls  = isDone?'done':isActive?'active':isStopped?'stopped':'pending';
    const markerDate= s.completedAt || s.startedAt || '';
    const metaParts = [];
    if (markerName) metaParts.push(esc(markerName));
    if (markerDate) metaParts.push(fmtFlowDate(markerDate));
    const metaHtml = metaParts.length ? `<div class="flow-step-meta">${metaParts.join(' · ')}</div>` : '';
    const machine   = TRACKING_MACHINE_KEYS.has(s.processKey) ? (s.planned?.machineName || '') : '';
    const machHtml  = machine ? `<div class="flow-step-machine">◼ ${esc(machine)}</div>` : '';
    const mins      = s.planned?.minutes || 0;
    const timeHtml  = mins > 0 ? `<div class="flow-step-hint">⏱ ${fmtFlowMins(mins)}</div>` : '';
    const pctHtml   = `<div class="flow-step-pct">${isDone?'100%':isActive?'~50%':'0%'}</div>`;

    tlHtml += `<div class="flow-tl-row">
      <div class="flow-tl-left">
        <button type="button" class="${nodeCls}" data-flow-step-index="${i}" title="${isDone?'Quitar marca':'Marcar completado'}">${nodeInner}</button>
        ${connector}
      </div>
      <div class="flow-tl-content">
        <div class="flow-step-name ${titleCls}">${esc(s.processName||'Proceso')}</div>
        ${metaHtml}${machHtml}${timeHtml}${pctHtml}
      </div>
    </div>`;
  });

  box.innerHTML = `
    <div class="flow-panel-head">
      <div class="flow-panel-title">Flujo de producción</div>
      <span class="flow-panel-counter" style="background:${cntBg};color:${cntClr}">${doneCount}/${total} · ${pct}%</span>
    </div>
    <div class="flow-progress"><div class="flow-progress-fill" style="width:${pct}%"></div></div>
    <div class="flow-tl">${tlHtml}</div>`;
}

function fmtFlowDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('es-CR',{day:'2-digit',month:'short'}) + ' ' +
         d.toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'});
}

function fmtFlowMins(min) {
  const t = Math.round(Number(min||0));
  if (!t || t <= 0) return '';
  if (t < 60) return t + ' min';
  const h = Math.floor(t/60), m = t%60;
  return h + 'h' + (m ? ' ' + m + 'min' : '');
}

// ── Sesion para APIs ──
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

// ── USER PHOTOS ──
let trackingUserPhotos = new Map();
function trackingUserLookupKey(v) { return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); }
function escHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function initialsFromName(name) { const p=String(name||'').trim().split(/\s+/).filter(Boolean); return (p[0]?.[0]||'U')+(p[1]?.[0]||''); }
function trackingAvatarMarkup(name, photoOverride) {
    const photo = String(photoOverride||'').trim() || trackingUserPhotos.get(trackingUserLookupKey(name));
    const initials = escHtml(initialsFromName(name).toUpperCase());
    if (!photo) return initials;
    return `<img class="tracking-avatar-image" src="${escHtml(photo)}" alt="${escHtml(name||'Usuario')}" data-tracking-avatar-img><span class="tracking-avatar-fallback" hidden>${initials}</span>`;
}
async function loadTrackingUserPhotos() {
    try {
        const r = await fetch(`${API}/admin-users`, { headers: sessionHeader() });
        const users = r.ok ? await r.json() : [];
        const map = new Map();
        users.forEach(u => {
            const photo = String(u.photoUrl||u.photo_url||'').trim();
            [u.name,u.fullName,u.full_name,u.username,u.sapSalespersonName,u.sap_salesperson_name].forEach(v => {
                const k = trackingUserLookupKey(v);
                if (k && photo && !map.has(k)) map.set(k, photo);
            });
        });
        trackingUserPhotos = map;
    } catch(_) {}
}
function bindTrackingAvatarFallback(root) {
    (root || document).querySelectorAll?.('[data-tracking-avatar-img]').forEach(img => {
        img.addEventListener('error', () => {
            img.hidden = true;
            const fb = img.parentElement?.querySelector('.tracking-avatar-fallback');
            if (fb) fb.hidden = false;
        }, { once: true });
    });
}

// ── Flow step marking ──
document.addEventListener('click', (e) => {
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
        const isFixed = TRACKING_FIXED_KEYS.has(step.processKey);

        // Special intercept: planeacion step marking opens verification modal
        if (step.processKey === 'planeacion' && !isDone) {
            stepBtn.disabled = false;
            openInventoryVerification(code, step.processKey, stepBtn);
            return;
        }

        stepBtn.disabled = true;
        const prevText = stepBtn.innerHTML;
        stepBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>';
        const req = isFixed
            ? fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento/marca`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
                body: JSON.stringify({ processKey: step.processKey, marked: !isDone })
              })
            : fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento/completar`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
                body: JSON.stringify({ processKey: step.processKey })
              });

        req.then(r => r.json()).then((p) => {
            if (p && p.ok === false && p.error) { stepBtn.disabled = false; stepBtn.innerHTML = prevText; return; }
            delete flowCache[code];
            loadFlowPanel(code);
        }).catch(() => {
            stepBtn.disabled = false;
            stepBtn.innerHTML = prevText;
        });
        return;
    }
});

// ── Inventory Verification Modal ──
let pendingVerifCode = '';
let pendingVerifStepBtn = null;
let currentVerifMaterials = [];

function openInventoryVerification(code, processKey, stepBtn) {
    pendingVerifCode = code;
    pendingVerifStepBtn = stepBtn;
    currentVerifMaterials = [];
    const modal = document.getElementById('inventoryVerificationModal');
    if (!modal) return;
    document.getElementById('invVerifSubtitle').textContent = 'Verificando materiales para orden ' + code;
    document.getElementById('invVerifBody').innerHTML = '<div class="spinner"></div>';
    document.getElementById('invVerifCompleteBtn').disabled = true;
    modal.classList.add('open');
    loadVerificationMaterials(code, processKey);
}

function closeInventoryVerification() {
    const modal = document.getElementById('inventoryVerificationModal');
    if (modal) modal.classList.remove('open');
    pendingVerifCode = '';
    pendingVerifStepBtn = null;
    currentVerifMaterials = [];
}

async function loadVerificationMaterials(code, processKey) {
    try {
        const pKey = processKey || 'impresion';
        const res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/materiales-verificacion?process=' + encodeURIComponent(pKey), { headers: sessionHeader() });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error al cargar materiales');
        currentVerifMaterials = data.materials || [];
        renderVerificationMaterials();
    } catch (e) {
        document.getElementById('invVerifBody').innerHTML = '<div class="inv-empty">Error al cargar materiales: ' + escHtml(e.message) + '</div>';
    }
}

function renderVerificationMaterials() {
    const body = document.getElementById('invVerifBody');
    const mats = currentVerifMaterials;
    if (!mats || !mats.length) {
        body.innerHTML = '<div class="inv-empty">No hay materiales que verificar para esta orden.</div>';
        document.getElementById('invVerifCompleteBtn').disabled = false;
        return;
    }
    const statusLabel = { PENDIENTE: 'Pendiente', SOLICITADO: 'Solicitado', SUPLIDO: 'Suplido', ERROR: 'Error' };
    const statusClass = function(s) { return (s || 'PENDIENTE').toLowerCase(); };
    let html = '<div class="inv-table-header"><span>Material</span><span>Cantidad</span><span>Estado</span><span>Acción</span></div>';
    var allDone = true;
    mats.forEach(function(m, i) {
        var st = (m.verificationStatus || 'PENDIENTE').toUpperCase();
        if (st !== 'SUPLIDO') allDone = false;
        var qty = Number(m.plannedQuantity || 0).toLocaleString('es-CR', { maximumFractionDigits: 2 });
        var unit = escHtml(m.unitCode || '');
        var name = escHtml(m.materialName || m.sapItemCode || '');
        var fam = escHtml(m.materialFamily || '');
        var actionHtml = '';
        if (st === 'SUPLIDO') {
            actionHtml = '<span class="inv-item-action suplido">✓ Suplido</span>';
        } else if (st === 'SOLICITADO') {
            actionHtml = '<button type="button" class="inv-item-action" onclick="suplirMaterial(' + i + ')">Suplido</button>';
        } else if (st === 'ERROR') {
            actionHtml = '<button type="button" class="inv-item-action error" onclick="solicitarMaterial(' + i + ')">Reintentar</button>';
        } else {
            actionHtml = '<button type="button" class="inv-item-action" onclick="solicitarMaterial(' + i + ')">Solicitar en SAP</button>';
        }
        html += '<div class="inv-item">' +
            '<div class="inv-item-name">' + name + ' <small>' + fam + '</small></div>' +
            '<div class="inv-item-qty">' + qty + ' ' + unit + '</div>' +
            '<div class="inv-item-status ' + statusClass(st) + '">' + (statusLabel[st] || 'Pendiente') + '</div>' +
            '<div>' + actionHtml + '</div>' +
        '</div>';
    });
    body.innerHTML = html;
    document.getElementById('invVerifCompleteBtn').disabled = !allDone;
}

async function solicitarMaterial(index) {
    var mat = currentVerifMaterials[index];
    if (!mat) return;
    var body = document.getElementById('invVerifBody');
    var btns = body ? body.querySelectorAll('.inv-item-action') : [];
    btns.forEach(function(b) { b.disabled = true; });
    try {
        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(pendingVerifCode) + '/materiales-verificacion/solicitar', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({
                processKey: 'impresion',
                sapItemCode: mat.sapItemCode,
                materialName: mat.materialName,
                materialFamily: mat.materialFamily,
                quantity: mat.plannedQuantity,
                unitCode: mat.unitCode
            })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || data.verification && data.verification.sapError || 'Error al solicitar en SAP');
        await loadVerificationMaterials(pendingVerifCode, 'impresion');
    } catch (e) {
        mat.verificationStatus = 'ERROR';
        mat.sapError = e.message;
        renderVerificationMaterials();
    }
    btns.forEach(function(b) { b.disabled = false; });
}

async function suplirMaterial(index) {
    var mat = currentVerifMaterials[index];
    if (!mat || !mat.verificationId) return;
    try {
        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(pendingVerifCode) + '/materiales-verificacion/' + encodeURIComponent(mat.verificationId) + '/suplir', {
            method: 'POST',
            headers: sessionHeader()
        });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
        mat.verificationStatus = 'SUPLIDO';
        renderVerificationMaterials();
    } catch (e) {
        //
    }
}

async function completeAndMarkVerification() {
    var code = pendingVerifCode;
    var btn = pendingVerifStepBtn;
    if (!code && !btn) { closeInventoryVerification(); return; }
    closeInventoryVerification();
    if (!btn || !code) return;
    btn.disabled = true;
    var prevText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>';
    try {
        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/seguimiento/marca', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({ processKey: 'planeacion', marked: true })
        });
        var result = await res.json();
        if (result && result.ok === false && result.error) {
            btn.disabled = false;
            btn.innerHTML = prevText;
            return;
        }
        delete flowCache[code];
        loadFlowPanel(code);
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = prevText;
    }
}

// ── Pending List ──
function openPendingList() {
    var modal = document.getElementById('pendingListModal');
    if (!modal) return;
    document.getElementById('pendingListBody').innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text3)">Cargando...</div>';
    modal.classList.add('open');
    loadPendingList();
}

function closePendingList() {
    var modal = document.getElementById('pendingListModal');
    if (modal) modal.classList.remove('open');
}

async function loadPendingList() {
    try {
        var res = await fetch(API + '/inventario/solicitudes-pendientes', { headers: sessionHeader() });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
        renderPendingList(data.items || []);
    } catch (e) {
        document.getElementById('pendingListBody').innerHTML = '<div class="inv-empty">Error: ' + escHtml(e.message) + '</div>';
    }
}

function renderPendingList(items) {
    var body = document.getElementById('pendingListBody');
    if (!items || !items.length) {
        body.innerHTML = '<div class="inv-empty">No hay solicitudes pendientes de materiales.</div>';
        return;
    }
    var statusLabel = { PENDIENTE: 'Pendiente', SOLICITADO: 'Solicitado', ERROR: 'Error' };
    var html = '';
    items.forEach(function(item) {
        var st = (item.verification_status || 'PENDIENTE').toUpperCase();
        var qty = Number(item.planned_quantity || 0).toLocaleString('es-CR', { maximumFractionDigits: 2 });
        var unit = escHtml(item.unit_code || '');
        var name = escHtml(item.material_name || item.sap_item_code || '');
        var code = escHtml(item.order_code || '');
        html += '<div class="pl-item">' +
            '<div><div class="pl-order-code" onclick="closePendingList();searchByOrder(\'' + escHtml(item.order_code) + '\')">' + code + '</div>' +
            '<div class="pl-material">' + name + '</div></div>' +
            '<div class="pl-qty">' + qty + ' ' + unit + '</div>' +
            '<div class="pl-status inv-item-status ' + st.toLowerCase() + '">' + (statusLabel[st] || st) + '</div>' +
        '</div>';
    });
    body.innerHTML = html;
}

function searchByOrder(code) {
    searchTerm = code;
    var input = document.getElementById('searchInput');
    if (input) input.value = code;
    renderAll();
}

// ── Event listeners for new buttons ──
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('pendingListBtn')?.addEventListener('click', openPendingList);
    document.getElementById('invVerifCompleteBtn')?.addEventListener('click', completeAndMarkVerification);
});

(function injectSeguimientoStyles(){
  const css = `
.flow-step-pct{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:2px}
.flow-tl-node[data-flow-step-index]{cursor:pointer}
#pendingPlanningSummary{display:none;gap:14px;flex-wrap:wrap;padding:10px 16px;margin-bottom:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}
.pp-stat{display:flex;flex-direction:column;align-items:flex-start;min-width:64px}
.pp-stat-num{font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:var(--text)}
.pp-stat-label{font-size:10px;color:var(--text3)}
.pp-stat.pp-late .pp-stat-num{color:var(--red,#E24B4A)}
.pp-stat.pp-risk .pp-stat-num{color:var(--amber,#F5A623)}
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
