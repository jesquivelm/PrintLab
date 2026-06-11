/* ── CONSTANTES ── */
const API='/api';
const LABELS={orden_creada:'Creación de Orden',solicitud_vendedor:'Solicitud de Vendedor',planeacion:'Planificación',diseno:'Diseño',preprensa:'Preprensa',visto_bueno:'Visto Bueno',planchas:'Planchas',impresion:'Impresión',laminado:'Laminado',troquelado:'Troquelado',estampado:'Estampado',barnizado:'Barniz',embosado:'Embosado',numeracion:'Numeración',rebobinado:'Rebobinado',empaque:'Empaque'};
const ICONS={orden_creada:'+',solicitud_vendedor:'→',planeacion:'✓',diseno:'✏',preprensa:'⬛',visto_bueno:'✓',planchas:'▣',impresion:'◼',laminado:'◧',troquelado:'◈',estampado:'◆',barnizado:'◐',embosado:'◉',numeracion:'#',rebobinado:'↻',empaque:'□'};
const TRACKING_BASE_KEYS=['orden_creada','solicitud_vendedor','planeacion'];
const WORK_HRS=8;
const WORK_DAYS=new Set([1,2,3,4,5,6]);
const Q_FACTOR={normal:1,premium:.45,urgent:.05};
const DEFAULT_Q={normal:16,premium:6,urgent:0};
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
const flipState={};
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
  if(d.getHours()<8)d.setHours(8,0,0,0);
  while(rem>0){
    const avail=Math.min(rem,16-d.getHours());
    d.setHours(d.getHours()+avail);
    rem-=avail;
    if(rem>0){d.setDate(d.getDate()+1);d.setHours(8,0,0,0);while(!WORK_DAYS.has(d.getDay()))d.setDate(d.getDate()+1)}
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
    return{key,label:LABELS[key]||p.label||p.processName||key,icon:ICONS[key]||'·',
      status:p.status?normalizeStepStatus(p.status):(l.status?normalizeStepStatus(l.status):(i===0?'active':'pending')),
      endDate:l.endDate||null,machine:l.machineName||p.machineName||null,
      hrs:l.durationHours?Math.round(l.durationHours):null,
      ordersAhead:l.ordersAhead??null,daysAhead:l.daysAhead??null,quoted:p.quoted};
  });
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
  if(cursor.getHours()>=16){cursor.setDate(cursor.getDate()+1);cursor.setHours(8,0,0,0)}
  if(cursor.getHours()<8)cursor.setHours(8,0,0,0);
  while(!WORK_DAYS.has(cursor.getDay()))cursor.setDate(cursor.getDate()+1);

  let totalProc=0,totalQ=0;
  const detail=steps.map(s=>{
    const procH=s.hrs||8;
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
    <div class="process-name-cell"><div class="process-icon ${st}">${esc(s.icon)}</div>
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
          <span class="proc-panel-title">Procesos planificados</span>
          <button class="proc-flip-btn" id="flipbtn-${esc(o.orderCode)}" onclick="event.stopPropagation();flipCard('${esc(o.orderCode)}')" title="Ver flujo de producción real">
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
                ${steps.length?steps.map(s=>renderProcessRow({...s,hoursStr:s.hrs?`${s.hrs}h`:null})).join('')
                  :`<div style="padding:16px 0;color:var(--text3);font-size:12px">No hay procesos configurados.</div>`}
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
  const t=allOrders.length,run=allOrders.filter(o=>orderStatus(o)==='running').length,
    risk=allOrders.filter(o=>orderStatus(o)==='risk').length,
    late=allOrders.filter(o=>orderStatus(o)==='late').length,
    done=allOrders.filter(o=>orderStatus(o)==='done').length,
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
}

function toggleRow(code){
  const r=document.getElementById(`row-${code}`);if(!r)return;
  const open=r.classList.toggle('is-open');
  if(open)openRows.add(code);else openRows.delete(code);
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
        <span style="font-size:14px">${esc(s.icon)}</span>
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
  const{earlyEnd,lateEnd,totalProc,totalQ,bufH,conf,priority,bufferDays}=r;
  const dateCls=priority==='premium'?'premium':priority==='urgent'?'urgent':'';
  const earlyStr=capitalise(fmtLong(earlyEnd));
  const lateStr=capitalise(fmtLong(lateEnd));
  const confLabel={high:'Alta confianza',med:'Confianza media'}[conf];
  const confDot=conf==='high'?'◉':'◎';

  document.getElementById('resDateBig').textContent=earlyStr;
  document.getElementById('resDateBig').className='result-date-big'+( dateCls?' '+dateCls:'');
  document.getElementById('resRange').textContent=bufferDays>0
    ?`Rango: ${earlyStr} – ${lateStr}`
    :`Sin colchon — fecha fija`;
  document.getElementById('resConf').textContent=`${confDot} ${confLabel}`;
  document.getElementById('resConf').className='result-confidence '+conf;

  const breakdown=[];
  if(totalProc>0)breakdown.push({cls:'var(--accent)',name:'Produccion',detail:`${buildSteps(drawerOrder).length} procesos en secuencia`,hrs:totalProc});
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
    let res=await fetch(`${API}/planificacion/seguimiento`).catch(()=>null);
    if(!res||!res.ok)res=await fetch(`${API}/planificacion/lanzamiento`);
    const data=await res.json();
    if(!data.ok)throw new Error(data.error||'Error al cargar ordenes.');
    allOrders=data.items||[];
    updateSummary();renderAll();
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
  openRows.forEach(code=>{const r=document.getElementById(`row-${code}`);if(r)r.classList.add('is-open')});
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
  if(btn)btn.classList.add('active');renderAll();
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
loadData();

function flipCard(code) {
  const wrap = document.getElementById(`flip-${code}`);
  const btn  = document.getElementById(`flipbtn-${code}`);
  if (!wrap) return;

  const isFlipped = wrap.classList.toggle('flipped');
  flipState[code] = isFlipped ? 'back' : 'front';

  if (btn) {
    btn.classList.toggle('active', isFlipped);
    btn.innerHTML = isFlipped
      ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver planificado`
      : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 4l0 2-2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 8l0-2 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Ver flujo real`;
  }

  if (isFlipped) {
    const front = wrap.querySelector('.flip-face.front');
    const back  = wrap.querySelector('.flip-face.back');
    if (front && back) {
      wrap.querySelector('.flip-inner').style.minHeight = (back.scrollHeight || 200) + 'px';
    }
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
    await loadTrackingUserPhotos();
    const res = await fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/flow`, { headers: sessionHeader() });
    if (!res.ok) throw new Error('no-flow');
    const data = await res.json();
    const steps = data.steps || data.items || [];
    flowCache[code] = steps;
    renderFlowPanel(box, steps, data.history || []);
  } catch(e) {
    const order = allOrders.find(o => o.orderCode === code);
    if (order) {
      const steps = buildFlowFromOrder(order);
      flowCache[code] = steps;
      renderFlowPanel(box, steps);
    } else {
      box.innerHTML = '<div class="flow-empty">No se pudo cargar el flujo de producción.</div>';
    }
  }
}

function buildFlowFromOrder(order) {
  const cl  = Array.isArray(order.processChecklist)   ? order.processChecklist   : [];
  const lr  = Array.isArray(order.processLoadSummary) ? order.processLoadSummary : [];
  const hasBase = cl.some(p => TRACKING_BASE_KEYS.includes(stepKey(p)));
  const fixed = !hasBase && Array.isArray(order.steps)
    ? order.steps.filter(s => TRACKING_BASE_KEYS.includes(stepKey(s))).map(s => ({
        key: s.processKey,
        selected: true,
        base: true,
        label: s.processName,
        status: normalizeStepStatus(s.routeStatus),
        completedBy: s.completedBy,
        completedAt: s.completedAt,
        startedBy: s.startedBy,
        startedAt: s.startedAt
      }))
    : [];
  return [...fixed, ...cl].filter(p => p.selected || p.base || p.quoted).filter(p => stepKey(p) !== 'acabados')
    .map(p => {
      const key = stepKey(p);
      const load = lr.find(r => r.processKey === key) || {};
      const st   = normalizeStepStatus(p.status || 'pending');
      return {
        processKey:   key,
        processName:  LABELS[key] || p.label || p.processName || key,
        routeStatus:  st === 'done' || st === 'complete' ? 'COMPLETADO'
                    : st === 'active' || st === 'running' ? 'RUN' : 'PENDIENTE',
        completedBy:  p.completedBy  || load.completedBy  || '',
        completedAt:  p.completedAt  || load.completedAt  || '',
        startedBy:    p.startedBy    || load.startedBy    || '',
        startedAt:    p.startedAt    || load.startedAt    || '',
        planned: {
          machineName: load.machineName || p.machineName || '',
          minutes:     load.durationHours ? Math.round(load.durationHours * 60) : 0,
          quantity:    0
        }
      };
    });
}

function renderFlowPanel(box, steps, hist) {
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
    const initials    = markerName ? markerName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : (isDone ? '✓' : '');
    let nodeCls = 'flow-tl-node';
    if (isDone)    nodeCls += ' done';
    else if (isActive)  nodeCls += ' active';
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
      nodeInner += `<span class="flow-tl-badge">✓</span>`;
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
    const machine   = s.planned?.machineName || '';
    const machHtml  = machine ? `<div class="flow-step-machine">◼ ${esc(machine)}</div>` : '';
    const mins      = s.planned?.minutes || 0;
    const timeHtml  = mins > 0 ? `<div class="flow-step-hint">⏱ ${fmtFlowMins(mins)}</div>` : '';

    tlHtml += `<div class="flow-tl-row">
      <div class="flow-tl-left">
        <button type="button" class="${nodeCls}" data-flow-step-index="${i}">${nodeInner}</button>
        ${connector}
      </div>
      <div class="flow-tl-content">
        <div class="flow-step-name ${titleCls}">${esc(s.processName||'Proceso')}</div>
        ${metaHtml}${machHtml}${timeHtml}
      </div>
    </div>`;
  });

  let histHtml = '';
  if (hist && hist.length) {
    const rows = hist.slice(0,6).map(h =>
      `<div class="flow-hist-row"><span class="flow-hist-date">${esc(h.ts||h.date||'')}</span><span>${esc(h.msg||h.message||'')}</span></div>`
    ).join('');
    histHtml = `<div class="flow-hist"><div class="flow-hist-title">Historial</div>${rows}</div>`;
  }

  box.innerHTML = `
    <div class="flow-panel-head">
      <div class="flow-panel-title">Flujo de producción</div>
      <span class="flow-panel-counter" style="background:${cntBg};color:${cntClr}">${doneCount}/${total}</span>
    </div>
    <div class="flow-progress"><div class="flow-progress-fill" style="width:${pct}%"></div></div>
    <div class="flow-tl">${tlHtml}</div>
    ${histHtml}`;

  setTimeout(() => {
    const wrap = box.closest('.flip-wrap');
    if (wrap) {
      const inner = wrap.querySelector('.flip-inner');
      const back  = wrap.querySelector('.flip-face.back');
      if (inner && back) inner.style.minHeight = back.scrollHeight + 'px';
    }
  }, 50);
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
