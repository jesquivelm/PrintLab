/* ── CONSTANTES ── */
const API='/api';
const LABELS={orden_creada:'Creación de Orden',solicitud_vendedor:'Solicitud de Vendedor',planeacion:'Seguimiento',diseno:'Diseño',preprensa:'Preprensa',visto_bueno:'Aprobaciones',programacion:'Planeación',sellos:'Sellos',tintas:'Tintas',impresion:'Impresión',laminado:'Laminado',troquelado:'Troquelado',estampado:'Estampado',barnizado:'Barniz',embosado:'Embosado',numeracion:'Numeración',rebobinado:'Rebobinado',empaque:'Empaque'};
const PROCESS_ICON_KEYS={orden_creada:'produccionCreacionOrden',solicitud_vendedor:'produccionSolicitudVendedor',planeacion:'produccionPlanificacion',diseno:'produccionDiseno',preprensa:'produccionPreprensa',visto_bueno:'produccionVistoBueno',programacion:'produccionPlanificacion',sellos:'produccionSellos',tintas:'produccionTintas',impresion:'produccionImpresion',laminado:'produccionLaminado',troquelado:'produccionTroquelado',estampado:'produccionEstampado',barnizado:'produccionBarniz',embosado:'produccionEmbozado',numeracion:'produccionNumerado',rebobinado:'produccionRebobinado',empaque:'produccionEmpaque'};
const ICONS={orden_creada:'+',solicitud_vendedor:'→',planeacion:'✓',diseno:'✏',preprensa:'⬛',visto_bueno:'✓',programacion:'▤',sellos:'▣',tintas:'◍',impresion:'◼',laminado:'◧',troquelado:'◈',estampado:'◆',barnizado:'◐',embosado:'◉',numeracion:'#',rebobinado:'↻',empaque:'□'};
let trackingConfig={icons:{},general:{}};
let operatorAllowedProcessKeys=null;
function readTrackingUserSession(){try{return JSON.parse(localStorage.getItem('erp-user-session')||sessionStorage.getItem('erp-user-session')||'null')}catch(e){return null}}
function isTrackingImplementerSession(session){return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(String(session?.permissionName||'').trim())}
function normalizeTrackingAreaText(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim()}
const TRACKING_OPERATOR_PROCESS_GROUPS={diseno:['diseno','preprensa'],preprensa:['diseno','preprensa'],tintas:['tintas'],impresion:['impresion'],prensa:['impresion'],prensas:['impresion'],rebobinado:['rebobinado'],empaque:['empaque']};
function getOperatorAllowedProcessKeys(session){return TRACKING_OPERATOR_PROCESS_GROUPS[normalizeTrackingAreaText(session?.process)]||null}
function applyTrackingRoleBasedProcessView(){
  const session=readTrackingUserSession();
  if(!session||isTrackingImplementerSession(session))return;
  const keys=getOperatorAllowedProcessKeys(session);
  if(!keys){console.warn('Seguimiento: no se pudo determinar el área del operario a partir del campo Proceso ("'+(session?.process||'')+'"); se muestra la tira de procesos completa.');return}
  operatorAllowedProcessKeys=keys;
  const tabs=document.querySelector('.process-tabs');
  if(tabs)tabs.style.display='none';
}
function matchesTrackingActiveProcess(o){
  if(operatorAllowedProcessKeys)return Array.isArray(o.activeProcessKeys)&&o.activeProcessKeys.some(k=>operatorAllowedProcessKeys.includes(k));
  if(currentProcessFilter==='all')return true;
  return Array.isArray(o.activeProcessKeys)&&o.activeProcessKeys.includes(currentProcessFilter);
}
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
    return`<span class="process-icon-glyph" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;font-size:${Math.round(size*.85)}px;color:${color};--ic-h:${hc}">${esc(v||fallback||'·')}</span>`;
}
function processIcon(processKey){const cfg=processIconConfig(processKey);if(!cfg)return`<span>${esc(ICONS[processKey]||'·')}</span>`;const color=isDarkMode()?cfg.color2:cfg.color1;return iconMarkup(cfg.value,ICONS[processKey]||'·',LABELS[processKey]||processKey,cfg.size,color,cfg.hover)}

// Ícono grande para cuando una combinación de filtros no tiene ninguna orden —
// configurable desde Configuración → Diseño → Íconos (grupo "Seguimiento y Producción").
// Tamaño por defecto más grande (48) que el resto de íconos de proceso (18), para
// que llame la atención y no parezca que la pantalla está rota.
function trackingEmptyStateIcon(){
  const key='produccionFiltrosSinCoincidencias';
  const suffix=key.charAt(0).toUpperCase()+key.slice(1);
  const g=trackingConfig.general||{};
  const value=trackingConfig.icons?.[key]||'';
  const color=isDarkMode()?(g[`iconColor2${suffix}`]||'#ffffff'):(g[`iconColor${suffix}`]||'#1e516d');
  const hover=g[`iconColorHover${suffix}`]||'#0b81b8';
  const size=Number(g[`iconSize${suffix}`])||48;
  return iconMarkup(value,'🗃','Sin coincidencias',size,color,hover);
}

// Etiquetas en español de los filtros activos, para armar el mensaje de "sin resultados".
const PROCESS_FILTER_LABELS={all:'Todos',pending_planning:'Seguimiento',diseno:'Diseño',preprensa:'Preprensa',visto_bueno:'Aprobaciones',programacion:'Planificación',tintas:'Tintas',impresion:'Impresión',rebobinado:'Rebobinado',empaque:'Empaque'};
const STATUS_FILTER_LABELS={all:'Todas',late:'Atrasadas',risk:'Riesgo',running:'En Producción',done:'Listas',impact:'Impactadas',detenida:'Detenidas',anulada:'Anuladas'};
function trackingEmptyStateMessage(){
  if(calSelectedKey)return calSelectedKey===CAL_OVERDUE_KEY?'No hay órdenes vencidas.':'No hay entregas programadas para ese día.';
  const parts=[];
  if(currentProcessFilter&&currentProcessFilter!=='all')parts.push(`el proceso "${PROCESS_FILTER_LABELS[currentProcessFilter]||currentProcessFilter}"`);
  if(currentFilter&&currentFilter!=='all')parts.push(`el estado "${STATUS_FILTER_LABELS[currentFilter]||currentFilter}"`);
  if(searchTerm&&searchTerm.trim())parts.push(`la búsqueda "${esc(searchTerm.trim())}"`);
  if(!parts.length)return 'Todavía no hay ninguna orden registrada.';
  const filtrosTexto=parts.length===1?parts[0]:parts.slice(0,-1).join(', ')+' y '+parts[parts.length-1];
  return`Tienes seleccionado ${filtrosTexto}.<br>Ahora mismo no hay ninguna orden que cumpla con ${parts.length>1?'esos filtros a la vez':'ese filtro'}.`;
}
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
let currentProcessFilter='all';
let searchTerm='';
let drawerOrder=null;
let drawerPriority='normal';
let drawerBuffer=2;
let drawerResult=null;
const flowCache={};

function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function fmtDate(v){if(!v)return null;const d=parseDisplayDate(v);return isNaN(d)?String(v):d.toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function fmtShort(v){if(!v)return null;const d=parseDisplayDate(v);return isNaN(d)?String(v):d.toLocaleDateString('es-CR',{day:'2-digit',month:'short'})}
function fmtLong(d){return d.toLocaleDateString('es-CR',{weekday:'short',day:'2-digit',month:'long'})}
function capitalise(s){return s.charAt(0).toUpperCase()+s.slice(1)}
// Una fecha de entrega "2026-10-02" es un día del calendario, no una hora UTC:
// si se lee con new Date() directo, en Costa Rica se corre al día anterior.
function deliveryDateKey(v){
  if(!v)return null;
  const m=String(v).match(/^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.0+)?Z)?$/);
  if(m)return m[1];
  const d=new Date(v);
  if(isNaN(d))return null;
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// Fechas sin hora ("2026-10-02") se muestran tal cual, sin correrse un día por la zona horaria.
function parseDisplayDate(v){if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return new Date(v+'T12:00:00');return new Date(v)}
function daysUntil(v){const k=deliveryDateKey(v);if(!k)return null;const d=new Date(k+'T00:00:00');const n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/86400000)}
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
  // "En Producción" = la orden ya la liberó Planeación al Gantt y no ha
  // terminado — no depende de que una máquina esté trabajándola justo ahora.
  if(o.planningStatus==='EN_GANTT')return'running';
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
      startDate:l.startDate||null,endDate:l.endDate||null,machine:l.machineName||p.machineName||null,
      hrs:l.durationHours?Math.round(l.durationHours):null,
      ordersAhead:l.ordersAhead??null,daysAhead:l.daysAhead??null,quoted:p.quoted};
  });
}

function orderCurrentStepKey(o){
  const steps=buildSteps(o);
  if(!steps.length)return null;
  const current=steps.find(s=>s.status!=='done'&&s.status!=='complete');
  return(current||steps[steps.length-1]).key;
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

// Proceso actual según el flujo real (mismo criterio que las pestañas y que Producción).
const PROC_FLOW_ORDER=['diseno','preprensa','visto_bueno','programacion','sellos','tintas','impresion','laminado','troquelado','estampado','barnizado','embosado','numeracion','rebobinado','empaque'];
function orderProcLabel(o){
  const keys=Array.isArray(o.activeProcessKeys)?o.activeProcessKeys.slice():[];
  if(!keys.length)return currentProcLabel(buildSteps(o));
  keys.sort((a,b)=>PROC_FLOW_ORDER.indexOf(a)-PROC_FLOW_ORDER.indexOf(b));
  const labels=keys.map(k=>LABELS[k]||k);
  return labels.length>1?`${labels[0]} +${labels.length-1}`:labels[0];
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

  // Fecha real: si Planeación ya calculó cuándo termina cada paso pendiente
  // (orden_proceso.fecha_plan_fin), esa es la verdad — no la simulación de
  // arriba, que solo sirve de respaldo para órdenes que aún no tienen ese
  // cálculo real (p. ej. todavía en Diseño/Preprensa/Aprobación).
  const realEndCandidates=steps
    .filter(s=>s.status!=='done'&&s.status!=='complete'&&s.endDate)
    .map(s=>new Date(s.endDate))
    .filter(d=>!isNaN(d));
  const realEnd=realEndCandidates.length?new Date(Math.max(...realEndCandidates.map(d=>d.getTime()))):null;

  const bufH=bufferDays*WORK_HRS;
  const earlyEnd=realEnd||new Date(cursor);
  const lateEnd=addWorkHours(earlyEnd,bufH);

  const hasLoad=!!realEnd||(order.processLoadSummary||[]).length>=steps.length*.6;
  const conf=realEnd?'high':hasLoad?'med':'low';

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

function fmtHourMin(v){if(!v)return'';const d=new Date(v);if(isNaN(d))return'';return d.toLocaleString('es-CR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function fmtEspera(ms){if(!(ms>0))return'';const h=ms/3600000;if(h<1)return`${Math.round(h*60)} min`;if(h<48)return`${Math.round(h*10)/10} h`;return`${Math.round(h/24)} d`}

function detAgo(iso){
  if(!iso)return'';
  const ms=Date.now()-new Date(iso).getTime();
  if(!(ms>0))return'recién';
  const min=Math.floor(ms/60000);
  if(min<60)return`hace ${min} min`;
  const h=Math.floor(min/60);
  if(h<24)return`hace ${h} h`;
  const d=Math.floor(h/24);
  return`hace ${d} d`;
}

function renderOrderCard(o){
  const steps=buildSteps(o);
  const status=orderStatus(o);
  const det=o.detencion;
  const detBanner=det?`<div class="tracking-detencion-banner${det.estado==='ANULADA'?' is-anulada':''}"><strong>${det.estado==='ANULADA'?'Orden anulada':'Orden detenida'}</strong>${det.motivoEtiqueta?' — '+esc(det.motivoEtiqueta):''}${det.descripcion?'<span class="tdb-meta">'+esc(det.descripcion)+'</span>':''}<span class="tdb-meta">${det.por?'Por '+esc(det.por)+' · ':''}${detAgo(det.desde)}</span></div>`:'';
  const noPlanBanner=o.arrancoSinProgramar?`<div class="tracking-noplan-banner"><strong>Arrancó en piso sin programarse</strong> en el Gantt${o.arrancoSinProgramarProceso?' — proceso: '+esc(o.arrancoSinProgramarProceso):''}<span class="tdb-meta">${o.arrancoSinProgramarEn?detAgo(o.arrancoSinProgramarEn):''}</span></div>`:'';
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

  const orderLate=status==='late';
  const flowSteps=steps;
  const currentIdx=flowSteps.findIndex(s=>s.status!=='done'&&s.status!=='complete');
  const dots=flowSteps.map((s,i)=>{
    const isDone=s.status==='done'||s.status==='complete';
    const isCurrent=i===currentIdx;
    const start=s.startDate?new Date(s.startDate):null;
    const startOk=start&&!isNaN(start);
    let sev='pending';
    const tip=[];
    if(isDone){
      sev='done';
      tip.push(s.hrs?`Duracion: ${s.hrs} h`:'Completado');
    }else if(isCurrent){
      const waitMs=startOk?Date.now()-start.getTime():0;
      sev=s.status==='late'||orderLate||waitMs>4*3600000?'late':waitMs>0?'risk':'active';
      if(startOk)tip.push(`Programado: ${fmtHourMin(start)}`);
      if(s.hrs)tip.push(`Estimado: ${s.hrs} h`);
      if(waitMs>0)tip.push(`Esperando: ${fmtEspera(waitMs)}`);
    }else{
      if(startOk)tip.push(`Programado: ${fmtHourMin(start)}`);
      if(s.hrs)tip.push(`Estimado: ${s.hrs} h`);
    }
    const prevDone=i>0&&(flowSteps[i-1].status==='done'||flowSteps[i-1].status==='complete');
    const line=i>0?`<div class="step-line${prevDone?' done':''}"></div>`:'';
    const tipHtml=`<b>${esc(s.label)}</b>${tip.map(t=>'<br>'+esc(t)).join('')}`;
    const check=isDone?'<svg class="step-check" viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
    return`${line}<div class="step-pip-wrap" tabindex="0" data-tip="${esc(tipHtml)}"><div class="step-pip ${sev}">${check}</div></div>`;
  }).join('');

  const impactTag=imp?`<span class="impact-tag">↑${imp.days}d · ${fmtShort(imp.newDate)}</span>`:'';
  const pctCls=status==='late'?'late':status==='running'?'running':status==='risk'?'risk':'';

  return`<div class="order-row ${rowCls}${imp?' has-impact':''}" id="row-${esc(o.orderCode)}" data-code="${esc(o.orderCode)}" data-status="${esc(status)}">
    <div class="order-head">
      <div class="order-identity">
        <div class="order-code">${esc(o.orderCode)}${impactTag}</div>
        <div class="order-customer">${esc(o.customerName||'Sin cliente')}</div>
      </div>
      <div class="order-progress-inline">
        <div class="order-timeline">${dots}</div>
        <div class="order-pct ${pctCls}">${pct}%</div>
        <span class="order-status-badge ${status}">${stLabel}</span>
        <div class="order-eta">
          <div class="order-eta-label">Entrega${daysLabel?' · '+daysLabel:''}</div>
          <div class="order-eta-date ${etaCls}">${eta||'Sin fecha'}</div>
          ${sl?`<div style="font-size:10px;color:var(--accent);margin-top:2px">Est. ${fmtShort(sl.earlyEnd)}</div>`:''}
        </div>
      </div>
      <div class="order-head-right">
        <a class="hdr-btn" href="/orden-produccion/${esc(o.orderCode)}" onclick="return openOrderModal(event,'${esc(o.orderCode)}')">Ver orden</a>
        <button type="button" class="hdr-btn" onclick="event.stopPropagation();openLiberarInventario('${esc(o.orderCode)}')" title="Liberar insumos de inventario contra SAP">Liberar inventario</button>
        <button class="btn-estimate${hasEst?' has-estimate':''}" onclick="event.stopPropagation();openDrawer('${esc(o.orderCode)}')">${hasEst?'◈ Estimada':'◎ Estimar'}</button>
      </div>
    </div>
    ${detBanner}
    ${noPlanBanner}
  </div>`;
}

// Pestaña "Arte" del modal de la orden (openOrderModal).
function sgArtHtml(o){
  const art=o.artwork||null;
  const artSrc=art&&art.isImage?(art.downloadUrl||art.value||''):'';
  return artSrc
    ? `<img src="${esc(artSrc)}" alt="Arte ${esc(o.orderCode)}" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'No se pudo cargar el arte'}))">`
    : `<span class="ph">${esc(art?(art.label||'Arte adjunto'):'Sin arte adjunto')}</span>`;
}

function updateSummary(){
  const isAnulada=o=>o.detencion&&o.detencion.estado==='ANULADA';
  const isDetenida=o=>o.detencion&&o.detencion.estado==='DETENIDA';
  const visibles=allOrders.filter(o=>!isAnulada(o));
  const active=visibles.filter(o=>!isPendingPlanning(o));
  const pending=visibles.filter(isPendingPlanning);
  const cd=document.getElementById('countDetenida');if(cd)cd.textContent=allOrders.filter(isDetenida).length;
  const ca=document.getElementById('countAnulada');if(ca)ca.textContent=allOrders.filter(isAnulada).length;
  // Los números de arriba deben coincidir siempre con lo que la lista de abajo
  // realmente muestra — si hay una pestaña de proceso seleccionada (ej. "Impresión"),
  // el conteo se calcula solo sobre esas órdenes, no sobre todas.
  const visibleForStatus=active.filter(matchesTrackingActiveProcess);
  const t=visibleForStatus.length,run=visibleForStatus.filter(o=>orderStatus(o)==='running').length,
    risk=visibleForStatus.filter(o=>orderStatus(o)==='risk').length,
    late=visibleForStatus.filter(o=>orderStatus(o)==='late').length,
    done=visibleForStatus.filter(o=>orderStatus(o)==='done').length,
    imp=visibleForStatus.filter(o=>!!impacts[o.orderCode]).length;
  document.getElementById('statTotal').textContent=t;
  document.getElementById('statRunning').textContent=run;
  document.getElementById('statRisk').textContent=risk;
  document.getElementById('statLate').textContent=late;
  document.getElementById('statDone').textContent=done;
  document.getElementById('countAll').textContent=t;
  document.getElementById('countLate').textContent=late;
  const clt=document.getElementById('countLateTop');if(clt)clt.textContent=late;
  document.getElementById('countRisk').textContent=risk;
  document.getElementById('countRunning').textContent=run;
  document.getElementById('countDone').textContent=done;
  document.getElementById('countImpact').textContent=imp;
  const countPP=document.getElementById('countPendingPlanning');
  if(countPP)countPP.textContent=pending.length;
  renderPendingPlanningSummary(pending);
  updateProcessTabCounts(active, pending);
}

// Contador por pestaña de proceso — mismo criterio que el filtro (activeProcessKeys).
function updateProcessTabCounts(active, pending){
  document.querySelectorAll('.process-tab[data-process-filter]').forEach(tab=>{
    const key=tab.dataset.processFilter;
    let n;
    if(key==='all') n=active.length;
    else if(key==='pending_planning') n=pending.length;
    else n=active.filter(o=>Array.isArray(o.activeProcessKeys)&&o.activeProcessKeys.includes(key)).length;
    let badge=tab.querySelector('.pt-count');
    if(!badge){ badge=document.createElement('span'); badge.className='pt-count'; tab.appendChild(document.createTextNode(' ')); tab.appendChild(badge); }
    badge.textContent=n;
    badge.style.opacity=n?'1':'.4';
  });
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
  document.getElementById('lockToggle').checked=!!order.fechaComprometidaBloqueada;

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

// ── Ventana flotante reutilizable ──
// Cualquier .oam-overlay/.oam-panel puede volverse una ventana que se arrastra
// desde su encabezado y se redimensiona desde la esquina — sin tapar ni bloquear
// lo que está detrás. Se activa una sola vez por ventana (initFloatingWindow),
// y solo "arma" el modo flotante (position:fixed con left/top propios) la primera
// vez que alguien la mueve o la redimensiona; antes de eso se ve/abre igual que
// cualquier otro modal centrado.
function initFloatingWindow(overlayId,opts){
  const overlay=document.getElementById(overlayId);
  const panel=document.getElementById(opts.panelId);
  const handle=panel?.querySelector('.oam-resize-handle');
  const header=panel?.querySelector('.oam-header');
  if(!overlay||!panel||!header)return;
  const minWidth=opts.minWidth||600;
  const minHeight=opts.minHeight||360;
  let drag=null,resize=null;

  function armFloating(){
    if(panel.classList.contains('is-floating'))return;
    const r=panel.getBoundingClientRect();
    panel.style.left=r.left+'px';
    panel.style.top=r.top+'px';
    panel.style.width=r.width+'px';
    panel.style.height=r.height+'px';
    panel.classList.add('is-floating');
    overlay.classList.add('is-floating');
  }

  header.addEventListener('pointerdown',(e)=>{
    if(e.target.closest('button,.oam-tab'))return;
    armFloating();
    const r=panel.getBoundingClientRect();
    drag={startX:e.clientX,startY:e.clientY,origLeft:r.left,origTop:r.top,pointerId:e.pointerId};
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove',(e)=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    const maxLeft=Math.max(0,window.innerWidth-60);
    const maxTop=Math.max(0,window.innerHeight-40);
    panel.style.left=Math.min(Math.max(-panel.offsetWidth+80,drag.origLeft+dx),maxLeft)+'px';
    panel.style.top=Math.min(Math.max(0,drag.origTop+dy),maxTop)+'px';
  });
  const endDrag=(e)=>{if(drag&&drag.pointerId===e.pointerId)drag=null};
  header.addEventListener('pointerup',endDrag);
  header.addEventListener('pointercancel',endDrag);

  if(handle){
    handle.addEventListener('pointerdown',(e)=>{
      e.stopPropagation();
      armFloating();
      const r=panel.getBoundingClientRect();
      resize={startX:e.clientX,startY:e.clientY,origW:r.width,origH:r.height,pointerId:e.pointerId};
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove',(e)=>{
      if(!resize||resize.pointerId!==e.pointerId)return;
      const dx=e.clientX-resize.startX,dy=e.clientY-resize.startY;
      panel.style.width=Math.max(minWidth,resize.origW+dx)+'px';
      panel.style.height=Math.max(minHeight,resize.origH+dy)+'px';
    });
    const endResize=(e)=>{if(resize&&resize.pointerId===e.pointerId)resize=null};
    handle.addEventListener('pointerup',endResize);
    handle.addEventListener('pointercancel',endResize);
  }

  // Al cerrar, se vuelve a dejar en su posición y tamaño centrados de siempre —
  // la próxima vez que se abra, abre "de fábrica" y no donde quedó la última vez.
  overlay._resetFloating=function(){
    panel.classList.remove('is-floating');
    overlay.classList.remove('is-floating');
    panel.style.left='';panel.style.top='';panel.style.width=opts.defaultWidth||'';panel.style.height=opts.defaultHeight||'';
  };
  overlay._armFloating=armFloating;
}
initFloatingWindow('orderViewModal',{panelId:'orderViewPanel',minWidth:760,minHeight:420,defaultWidth:'96vw',defaultHeight:'92vh'});

let orderModalCode=null;
function openOrderModal(e,code){
  if(e)e.preventDefault();
  const overlay=document.getElementById('orderViewModal');
  const frame=document.getElementById('orderViewFrame');
  if(!overlay||!frame)return false;
  orderModalCode=code;
  document.getElementById('orderViewTitle').textContent=code;
  frame.src=`/orden-produccion/${encodeURIComponent(code)}`;
  document.getElementById('orderViewFlow').innerHTML='';
  document.getElementById('orderViewArt').innerHTML='';
  switchOrderModalTab('orden');
  overlay.classList.add('open');
  // Flota desde que abre (no bloquea lo que está detrás) — el layout centrado ya
  // está calculado en cuanto se agrega la clase "open" (la transición solo anima
  // la opacidad/escala), así que se puede leer su posición y "soltarla" ya mismo.
  overlay._armFloating?.();
  return false;
}
function switchOrderModalTab(tab){
  document.querySelectorAll('.oam-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.oamTab===tab));
  document.getElementById('orderViewFrame').style.display=tab==='orden'?'block':'none';
  document.getElementById('orderViewFlow').style.display=tab==='flujo'?'block':'none';
  document.getElementById('orderViewArt').style.display=tab==='arte'?'flex':'none';
  if(!orderModalCode)return;
  if(tab==='flujo'){
    const box=document.getElementById('orderViewFlow');
    box.innerHTML=`<div class="flow-panel" id="flow-${esc(orderModalCode)}"><div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div></div>`;
    loadFlowPanel(orderModalCode,true);
  } else if(tab==='arte'){
    const order=allOrders.find(o=>o.orderCode===orderModalCode);
    document.getElementById('orderViewArt').innerHTML=order?sgArtHtml(order):'';
  }
}
function closeOrderModal(){
  const overlay=document.getElementById('orderViewModal');
  if(!overlay)return;
  overlay.classList.remove('open');
  overlay._resetFloating?.();
  document.getElementById('orderViewFrame').src='about:blank';
  orderModalCode=null;
  if(!document.getElementById('drawer').classList.contains('open'))document.body.style.overflow='';
}
function closeOrdersAheadModal(){
  document.getElementById('ordersAheadModal').classList.remove('open');
  if(!document.getElementById('drawer').classList.contains('open')){
    document.body.style.overflow='';
  }
}

function setPriority(p,persist){
  const previous=drawerPriority;
  drawerPriority=p;
  ['normal','premium','urgent'].forEach(id=>{
    const el=document.getElementById(`opt-${id}`)||document.querySelector(`.priority-opt[data-priority="${id}"]`);
    if(el)el.className='priority-opt'+(id===p?` sel-${id}`:'');
  });
  // Solo cuando la persona lo elige a mano (no cuando el cajón se abre y pone
  // un valor por defecto) se actualiza la prioridad real de la orden. Normal
  // y Cliente A son solo para ver "qué pasaría"; Urgente sí mueve la fila real.
  if(persist&&drawerOrder&&(p==='urgent'||previous==='urgent')){
    const real=p==='urgent'?'urgente':'normal';
    if(p==='urgent'&&!confirm(`Esto va a marcar la orden ${drawerOrder.orderCode} como urgente DE VERDAD en el sistema — va a saltar delante de las demás en la cola real. ¿Confirma?`)){
      drawerPriority=previous;
      setPriority(previous,false);
      return;
    }
    fetch(`${API}/planificacion/${encodeURIComponent(drawerOrder.orderCode)}/prioridad`,{
      method:'PATCH',
      headers:Object.assign({'Content-Type':'application/json'},sessionHeader()),
      body:JSON.stringify({prioridad:real})
    }).catch(()=>null);
  }
  if(drawerResult)runCalc();
}

function updateBuffer(){
  drawerBuffer=parseInt(document.getElementById('bufferSlider').value)||0;
  document.getElementById('bufferVal').textContent=drawerBuffer===0?'0d':`+${drawerBuffer}d`;
  if(drawerResult)runCalc();
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
  if(!drawerOrder)return;
  const on=document.getElementById('lockToggle').checked;
  if(on&&drawerResult){
    softLocks[drawerOrder.orderCode]={earlyEnd:drawerResult.earlyEnd,lateEnd:drawerResult.lateEnd,priority:drawerPriority};
  }else{
    delete softLocks[drawerOrder.orderCode];
    delete impacts[drawerOrder.orderCode];
    if(drawerOrder._impacted){delete drawerOrder._impacted;renderList()}
  }
  // Bloqueo suave real: esto es lo que hace que el recálculo de Planeación
  // avise en vez de mover en silencio una fecha ya prometida al cliente.
  drawerOrder.fechaComprometidaBloqueada=on;
  fetch(`${API}/planificacion/${encodeURIComponent(drawerOrder.orderCode)}/bloqueo-comprometido`,{
    method:'PATCH',
    headers:Object.assign({'Content-Type':'application/json'},sessionHeader()),
    body:JSON.stringify({bloqueada:on})
  }).catch(()=>null);
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
    if(!data.fechaEntregaIgnorada)drawerOrder.promisedDeliveryDate=dateInputValue(committedEnd);
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

async function recalcularPlanificacion(){
  const btn=document.getElementById('recalcBtn');
  const original=btn.textContent;
  btn.textContent='Revisando...';btn.disabled=true;
  try{
    const res=await fetch(`${API}/planificacion/proyeccion/previsualizar`);
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false)throw new Error(data.error||'No fue posible revisar los cambios.');
    mostrarVistaPreviaRecalculo(data);
  }catch(error){
    alert(error.message||'No fue posible revisar los cambios.');
  }finally{
    btn.textContent=original;btn.disabled=false;
  }
}

function mostrarVistaPreviaRecalculo(data){
  const cambios=Array.isArray(data.cambios)?data.cambios:[];
  const riesgo=data.totalEnRiesgoDeCompromiso||0;
  const body=document.getElementById('recalcPreviewBody');
  const applyBtn=document.getElementById('recalcPreviewApplyBtn');

  if(!cambios.length){
    body.innerHTML=`<div class="oam-empty">Revisé las ${data.totalOrdenesRevisadas||0} órdenes activas.<br><strong>Ninguna fecha cambiaría</strong> si aplica el recálculo ahora — está todo al día.</div>`;
    applyBtn.style.display='none';
  }else{
    applyBtn.style.display='';
    let html=`<div class="oam-summary">
      <div class="oam-summary-row">
        <div class="oam-summary-item"><div class="oam-si-icon">📋</div><div><div class="oam-si-val">${data.totalOrdenesRevisadas||0}</div><div class="oam-si-lbl">Revisadas</div></div></div>
        <div class="oam-summary-item"><div class="oam-si-icon">🔄</div><div><div class="oam-si-val">${cambios.length}</div><div class="oam-si-lbl">Cambiarían de fecha</div></div></div>
        <div class="oam-summary-item ${riesgo?'oam-si-buffer':''}"><div class="oam-si-icon">${riesgo?'⚠':'✓'}</div><div><div class="oam-si-val">${riesgo}</div><div class="oam-si-lbl">Con fecha comprometida en riesgo</div></div></div>
      </div>
      <div class="oam-summary-eta">${riesgo
        ?`<strong>Ojo:</strong> ${riesgo} orden${riesgo>1?'es':''} ya tenían una fecha prometida al cliente y, con este recálculo, ya no se alcanzaría. Revíselas antes de avisarle a nadie.`
        :'Ninguna de las órdenes con fecha ya prometida a un cliente se ve afectada.'}</div>
    </div>`;
    html+=`<div class="oam-section-title">Detalle orden por orden</div>`;
    cambios.forEach(c=>{
      const flechaColor=c.seAtrasa?'var(--pl-red,#E24B4A)':'var(--accent)';
      const diasTxt=c.diasDiferencia>0?`+${c.diasDiferencia}d`:`${c.diasDiferencia}d`;
      html+=`<div class="oam-order" style="grid-template-columns:1fr 1.4fr 70px">
        <div class="oam-order-left">
          <div class="oam-order-code">${esc(c.codigoOrden)}${c.enRiesgoDeCompromiso?' ⚠':''}</div>
          <div class="oam-order-customer">${esc(c.cliente||'Sin cliente')}${c.enRiesgoDeCompromiso?' · Fecha comprometida: '+esc(fmtDate(c.fechaComprometida)||''):''}</div>
        </div>
        <div style="font-size:12px;color:var(--text2);text-align:center">${esc(fmtShort(c.fechaAntes)||'sin fecha')} → ${esc(fmtShort(c.fechaDespues)||'sin fecha')}</div>
        <div style="text-align:right;font-weight:700;font-family:'DM Mono',monospace;color:${flechaColor}">${diasTxt}</div>
      </div>`;
    });
    body.innerHTML=html;
  }
  document.getElementById('recalcPreviewModal').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeRecalcPreviewModal(){
  document.getElementById('recalcPreviewModal').classList.remove('open');
  document.body.style.overflow='';
}

async function confirmarRecalculoAplicado(){
  const btn=document.getElementById('recalcPreviewApplyBtn');
  btn.textContent='Aplicando...';btn.disabled=true;
  try{
    const res=await fetch(`${API}/planificacion/proyeccion/aplicar`,{method:'POST',headers:sessionHeader()});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false)throw new Error(data.error||'No fue posible aplicar el recálculo.');
    closeRecalcPreviewModal();
    await loadData();
    alert('Listo, se aplicaron los cambios.');
  }catch(error){
    alert(error.message||'No fue posible aplicar el recálculo.');
  }finally{
    btn.textContent='Sí, aplicar los cambios';btn.disabled=false;
  }
}

let seguimientoCargadoUnaVez=false;
async function loadData(){
  const btn=document.getElementById('refreshBtn');
  btn.textContent='...';btn.disabled=true;
  try{
    const segRes=await fetch(`${API}/planificacion/seguimiento`).catch(()=>null);
    const parseRes=async r=>{
      if(!r)return{ok:false,error:'Sin respuesta del servidor.'};
      let body=null;
      try{body=await r.json();}catch(_){}
      if(body&&typeof body==='object')return body;
      return{ok:false,error:`Respuesta invalida del servidor (HTTP ${r.status}).`};
    };
    const segData=await parseRes(segRes);
    if(!segData.ok)throw new Error(segData.error||'Error al cargar ordenes.');
    allOrders=Array.isArray(segData.items)?segData.items:[];
    seguimientoCargadoUnaVez=true;
    const scrollY=window.scrollY;
    const activeCode=document.activeElement&&document.activeElement.id==='searchInput'?'searchInput':null;
    updateSummary();renderCalendarStrip();renderAll();
    window.scrollTo(0,scrollY);
    if(activeCode)document.getElementById(activeCode)?.focus();
    document.getElementById('liveIndicator').style.background='#1D9E75';
  }catch(err){
    document.getElementById('liveIndicator').style.background='#EF9F27';
    // Si ya se habían cargado órdenes, un refresco lento no borra lo que se ve:
    // se queda la última información y se vuelve a intentar en el próximo ciclo.
    if(seguimientoCargadoUnaVez)return;
    allOrders=[];
    updateSummary();
    renderLoadError(err);
  }finally{btn.textContent='↻ Actualizar';btn.disabled=false}
}

// Sin datos inventados: si la primera carga falla, se muestra un aviso suave y un
// boton para reintentar. Nunca se rellena la pantalla con ordenes de ejemplo.
function renderLoadError(){
  document.getElementById('kanbanView').style.display='none';
  const box=document.getElementById('orderList');
  box.style.display='grid';
  box.innerHTML=`<div class="empty-state">`
    +`<div style="font-size:14px;color:var(--text3);max-width:440px;text-align:center;line-height:1.5">`
    +`Seguimos esperando al servidor.<br>`
    +`<span style="font-size:12px;opacity:.75">La conexión está lenta y las órdenes todavía no llegan. Toca el botón para intentarlo de nuevo.</span></div>`
    +`<button onclick="loadData()" style="display:inline-block;margin-top:14px;padding:7px 16px;border:1px solid var(--border2,#cfd8df);border-radius:8px;background:var(--surface,#fff);color:var(--text2,#334);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer">Reintentar</button>`
    +`</div>`;
}

let currentView='list';

function setView(v){
  currentView=v;
  document.querySelectorAll('.view-btn[data-view]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.view===v);
  });
  document.getElementById('orderList').style.display=v==='list'?'grid':'none';
  document.getElementById('kanbanView').style.display=v==='kanban'?'grid':'none';
  renderAll();
}

function renderAll(){
  const term=norm(searchTerm);
  const sort=document.getElementById('sortSelect').value;
  let filtered=allOrders.filter(o=>{
    const match=!term||norm([o.orderCode,o.customerName,o.jobName,o.productName].join(' ')).includes(term);
    if(!match)return false;
    if(calSelectedKey)return matchesCalendarSelection(o);
    const det=o.detencion&&o.detencion.estado;
    if(currentFilter==='detenida')return det==='DETENIDA';
    if(currentFilter==='anulada')return det==='ANULADA';
    if(det==='ANULADA')return false;
    if(currentProcessFilter==='pending_planning')return isPendingPlanning(o);
    if(isPendingPlanning(o))return false;
    if(!matchesTrackingActiveProcess(o))return false;
    if(currentFilter==='pending_planning')return isPendingPlanning(o);
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
  else renderKanban(filtered);
}

function renderList(orders){
  const term=norm(searchTerm);
  const sort=document.getElementById('sortSelect').value;

  if(!orders){
    orders=allOrders.filter(o=>{
      const match=!term||norm([o.orderCode,o.customerName,o.jobName,o.productName].join(' ')).includes(term);
      if(!match)return false;
      if(calSelectedKey)return matchesCalendarSelection(o);
      const det=o.detencion&&o.detencion.estado;
      if(currentFilter==='detenida')return det==='DETENIDA';
      if(currentFilter==='anulada')return det==='ANULADA';
      if(det==='ANULADA')return false;
      if(currentProcessFilter==='pending_planning')return isPendingPlanning(o);
      if(isPendingPlanning(o))return false;
      if(!matchesTrackingActiveProcess(o))return false;
      if(currentFilter==='pending_planning')return isPendingPlanning(o);
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
    box.innerHTML=`<div class="empty-state"><div class="empty-state-icon-big">${trackingEmptyStateIcon()}</div><div class="tracking-empty-msg">${trackingEmptyStateMessage()}</div></div>`;
    return;
  }
  box.innerHTML=orders.map(renderOrderCard).join('');
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
        <div class="kc-process">${esc(orderProcLabel(o))}</div>
        <div class="kc-pips">${pips}</div>
        ${sl?`<div class="kc-est">◈ Est. ${fmtShort(sl.earlyEnd)}${drawerBuffer>0?` – ${fmtShort(sl.lateEnd)}`:''}</div>`:''}
        ${imp?`<div class="kc-impact">⚠ Desplazada → ${fmtShort(imp.newDate)}</div>`:''}
        <div class="kc-bottom">
          <div class="kc-eta ${etaCls}">${eta||'Sin fecha'}${daysLabel?' · '+daysLabel:''}</div>
          <div style="display:flex;gap:4px">
            <a class="kc-btn" href="/orden-produccion/${esc(o.orderCode)}" onclick="event.stopPropagation();return openOrderModal(event,'${esc(o.orderCode)}')">Ver orden</a>
            <button class="kc-btn" onclick="event.stopPropagation();openDrawer('${esc(o.orderCode)}')">${sl?'◈':'◎'} Estimar</button>
          </div>
        </div>
      </div>`;
    }).join('');
  });
}

function setFilter(f,btn){
  clearCalendarSelection();
  currentFilter=f;
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderPendingPlanningSummary(allOrders.filter(isPendingPlanning));
  renderAll();
}

function setProcessFilter(f,btn){
  clearCalendarSelection();
  currentProcessFilter=f;
  document.querySelectorAll('.process-tab').forEach(t=>t.classList.remove('is-active'));
  if(btn)btn.classList.add('is-active');
  // "Todos" es el único botón visible que puede sacar a alguien de Detenidas/Anuladas
  // (las demás pastillas de estado quedaron ocultas pero no eliminadas), así que también
  // limpia ese filtro para no dejar a nadie atrapado viendo solo detenidas o anuladas.
  if(f==='all'){
    currentFilter='all';
    document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
    document.querySelector('.filter-pill[data-filter="all"]')?.classList.add('active');
  }
  updateSummary();
  renderAll();
}

function navShellAware(e,route,label){
  if(window.parent&&window.parent!==window&&window.location.search.includes('shell=1')){
    e.preventDefault();
    window.parent.postMessage({type:'erp-open-tab',route:route+(route.includes('?')?'&':'?')+'shell=1',label:label},window.location.origin);
    return false;
  }
  return true;
}

function abrirOrdenEnPlanificacion(codigoOrden){
  const ruta=`/planificacion/gantt?orderCode=${encodeURIComponent(codigoOrden)}`;
  if(window.parent&&window.parent!==window&&window.location.search.includes('embebido=1')){
    window.parent.postMessage({tipo:'planificacion-abrir-orden',codigoOrden:codigoOrden},window.location.origin);
    return;
  }
  window.location.href=ruta;
}
document.getElementById('searchInput').addEventListener('input',e=>{searchTerm=e.target.value;renderAll()});
document.getElementById('ganttLink').addEventListener('click',e=>{navShellAware(e,'/planificacion/gantt','Gantt')});
document.getElementById('btnGantt')?.addEventListener('click',e=>{e.preventDefault();abrirOrdenEnPlanificacion(drawerOrder?.orderCode||'')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeOrderModal();}});
document.querySelectorAll('.priority-opt[data-priority]').forEach(opt=>{
  opt.addEventListener('click',()=>setPriority(opt.dataset.priority,true));
});
document.querySelectorAll('.view-btn[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>setView(btn.dataset.view));
});
document.querySelectorAll('.filter-pill[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>setFilter(btn.dataset.filter,btn));
});
document.querySelectorAll('.process-tab[data-process-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>setProcessFilter(btn.dataset.processFilter,btn));
});
document.getElementById('bufferSlider')?.addEventListener('input',updateBuffer);
document.getElementById('lockToggle')?.addEventListener('change',updateLock);
document.getElementById('drawerClose')?.addEventListener('click',closeDrawer);
document.getElementById('drawerOverlay')?.addEventListener('click',closeDrawer);
document.getElementById('calcBtn')?.addEventListener('click',runCalc);
document.getElementById('btnSetDate')?.addEventListener('click',setDateInOrder);
document.getElementById('refreshBtn')?.addEventListener('click',loadData);
document.getElementById('recalcBtn')?.addEventListener('click',recalcularPlanificacion);
document.getElementById('sortSelect')?.addEventListener('change',renderAll);
setInterval(loadData,60000);
applyTrackingRoleBasedProcessView();

// Arrastrar con el mouse para desplazar el calendario de feriados/fines de semana.
(function initCalStripDrag(){
  const strip=document.getElementById('calAlertStrip');
  if(!strip)return;
  let dragging=false,startX=0,startScroll=0,moved=false;
  strip.addEventListener('mousedown',e=>{
    dragging=true;moved=false;startX=e.pageX;startScroll=strip.scrollLeft;
    strip.classList.add('dragging');
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const dx=e.pageX-startX;
    if(Math.abs(dx)>3)moved=true;
    strip.scrollLeft=startScroll-dx;
  });
  window.addEventListener('mouseup',()=>{
    if(!dragging)return;
    dragging=false;strip.classList.remove('dragging');
  });
  // Evita que un arrastre se interprete como clic en un día del calendario.
  strip.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
})();
fetch('/api/config/shell').then(r=>r.ok?r.json():{}).catch(()=>({})).then(cfg=>{trackingConfig=cfg||trackingConfig;loadData()});

function computeAlertDayCount(){
  const strip=document.getElementById('calAlertStrip');
  const width=(strip&&strip.clientWidth)||document.body.clientWidth||1200;
  const cardWidth=96,gap=8,padding=48;
  const usable=Math.max(0,width-padding);
  const count=Math.floor((usable+gap)/(cardWidth+gap));
  return Math.min(30,Math.max(4,count));
}

// ── Calendario de entregas ──
// Cada orden cae en un solo día: el de su fecha de entrega. Las que ya pasaron su
// fecha sin terminarse se juntan en el cuadro "Vencidas" al inicio de la tira.
const CAL_MAX_DAYS=92; // ~3 meses hacia adelante como máximo
const CAL_OVERDUE_KEY='vencidas';
let calEventsByDate=new Map();
let calFetchedDays=0;
let calFetchPending=null;
let calSelectedKey=null;

function localDateKey(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function calTodayKey(){return localDateKey(new Date())}
function calAddDays(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return localDateKey(d)}
function calDaysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)}
function orderDeliveryKey(o){return deliveryDateKey(o.promisedDeliveryDate||o.scheduledDeliveryDate)}
function isCalendarOrder(o){
  if(o.detencion&&o.detencion.estado==='ANULADA')return false;
  if(operatorAllowedProcessKeys&&!matchesTrackingActiveProcess(o))return false;
  return true;
}
function matchesCalendarSelection(o){
  if(!isCalendarOrder(o))return false;
  const key=orderDeliveryKey(o);
  if(!key)return false;
  if(calSelectedKey===CAL_OVERDUE_KEY)return key<calTodayKey()&&orderStatus(o)!=='done';
  return key===calSelectedKey;
}

function buildCalendarBuckets(){
  const today=calTodayKey();
  const byDay=new Map();
  const overdue={total:0,late:0,risk:0};
  let lastKey=null;
  allOrders.filter(isCalendarOrder).forEach(o=>{
    const key=orderDeliveryKey(o);
    if(!key)return;
    const st=orderStatus(o);
    if(key<today){if(st!=='done'){overdue.total++;overdue.late++;}return;}
    if(calDaysBetween(today,key)>=CAL_MAX_DAYS)return;
    if(!byDay.has(key))byDay.set(key,{total:0,late:0,risk:0});
    const b=byDay.get(key);
    b.total++;
    if(st==='late')b.late++;
    else if(st==='risk')b.risk++;
    if(!lastKey||key>lastKey)lastKey=key;
  });
  const needed=lastKey?calDaysBetween(today,lastKey)+1:0;
  const dayCount=Math.min(CAL_MAX_DAYS,Math.max(computeAlertDayCount(),needed));
  return{today,byDay,overdue,dayCount};
}

function calPlural(n,one,many){return`${n} ${n===1?one:many}`}
function calDotMarkup(b){
  const problems=b.late+b.risk;
  const hover=`<span class="cal-deliv">${b.total?calPlural(b.total,'entrega','entregas'):'Sin entregas'}</span>`;
  if(!problems)return`<div class="cal-status">${hover}</div>`;
  const cls=b.late?'is-late':'is-risk';
  return`<div class="cal-status has-dot"><span class="cal-dot ${cls}">${problems>9?'9+':problems}</span>${hover}</div>`;
}
function calTitle(b){
  const parts=[b.total?calPlural(b.total,'entrega','entregas'):'Sin entregas'];
  if(b.late)parts.push(calPlural(b.late,'atrasada','atrasadas'));
  if(b.risk)parts.push(calPlural(b.risk,'en riesgo','en riesgo'));
  return parts.join(' · ');
}

function renderCalendarStrip(){
  const strip=document.getElementById('calAlertStrip');
  if(!strip||!calFetchedDays)return;
  const{today,byDay,overdue,dayCount}=buildCalendarBuckets();
  if(dayCount>calFetchedDays){loadCalendarAlert(dayCount);}
  if(calSelectedKey&&calSelectedKey!==CAL_OVERDUE_KEY&&calSelectedKey<today)calSelectedKey=null;
  const tiles=[];
  if(overdue.total){
    const sel=calSelectedKey===CAL_OVERDUE_KEY?' is-selected':'';
    tiles.push(`<button type="button" class="cal-alert-day is-overdue${sel}" data-cal-key="${CAL_OVERDUE_KEY}" title="${esc(calPlural(overdue.total,'orden pasó','órdenes pasaron')+' su fecha de entrega sin terminarse')}">
        <div class="cal-alert-day-label">Antes de hoy</div>
        <div class="cal-alert-day-date">Vencidas</div>
        <div class="cal-status has-dot"><span class="cal-dot is-late">${overdue.total>9?'9+':overdue.total}</span><span class="cal-deliv">${calPlural(overdue.total,'orden','órdenes')}</span></div>
      </button>`);
  }
  for(let i=0;i<Math.min(dayCount,calFetchedDays);i++){
    const key=calAddDays(today,i);
    const dt=new Date(key+'T12:00:00');
    const dowLabel=dt.toLocaleDateString('es-CR',{weekday:'short'});
    const dateLabel=dt.toLocaleDateString('es-CR',{day:'2-digit',month:'short'});
    const events=calEventsByDate.get(key)||[];
    const isWeekend=dt.getDay()===0||dt.getDay()===6;
    const b=byDay.get(key)||{total:0,late:0,risk:0};
    const cls=['cal-alert-day'];
    if(i===0)cls.push('is-today');
    if(isWeekend)cls.push('is-weekend');
    if(events.length)cls.push('has-event');
    if(calSelectedKey===key)cls.push('is-selected');
    let tag='';
    let title=calTitle(b);
    if(events.length){
      const names=[...new Set(events.map(e=>e.description||e.exceptionType))].join(', ');
      tag=`<div class="cal-alert-day-tag">⚠ ${esc(names.length>18?names.slice(0,18)+'…':names)}</div>`;
      title+=` — ${names}`;
    }else if(isWeekend){
      tag=`<div class="cal-alert-day-tag">Fin de semana</div>`;
    }
    tiles.push(`<button type="button" class="${cls.join(' ')}" data-cal-key="${key}" title="${esc(title)}">
        <div class="cal-alert-day-label">${i===0?'Hoy':capitalise(dowLabel)}</div>
        <div class="cal-alert-day-date">${dateLabel}</div>
        ${calDotMarkup(b)}
        ${tag}
      </button>`);
  }
  const scroll=strip.scrollLeft;
  strip.innerHTML=tiles.join('');
  strip.scrollLeft=scroll;
  strip.classList.add('visible');
  renderCalendarSelectionBar();
}

function renderCalendarSelectionBar(){
  const bar=document.getElementById('calSelectionBar');
  if(!bar)return;
  if(!calSelectedKey){bar.classList.remove('visible');bar.innerHTML='';return;}
  const n=allOrders.filter(matchesCalendarSelection).length;
  const label=calSelectedKey===CAL_OVERDUE_KEY
    ?'Órdenes vencidas (su fecha de entrega ya pasó y no están terminadas)'
    :`Entregas del ${new Date(calSelectedKey+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'2-digit',month:'long'})}`;
  bar.innerHTML=`<span><strong>${esc(label)}</strong> · ${calPlural(n,'orden','órdenes')}</span><button type="button" class="cal-selection-clear" id="calSelectionClear">✕ Ver todas</button>`;
  bar.classList.add('visible');
  document.getElementById('calSelectionClear').addEventListener('click',()=>selectCalendarDay(null));
}

function selectCalendarDay(key){
  calSelectedKey=calSelectedKey===key?null:key;
  renderCalendarStrip();
  renderAll();
}
// Al elegir otro filtro (proceso o estado) se suelta el día seleccionado.
function clearCalendarSelection(){
  if(!calSelectedKey)return;
  calSelectedKey=null;
  renderCalendarStrip();
}

document.getElementById('calAlertStrip')?.addEventListener('click',e=>{
  const tile=e.target.closest('[data-cal-key]');
  if(tile)selectCalendarDay(tile.dataset.calKey);
});

async function loadCalendarAlert(minDays){
  const strip=document.getElementById('calAlertStrip');
  if(!strip)return;
  const dias=Math.min(CAL_MAX_DAYS,Math.max(minDays||0,calFetchedDays,computeAlertDayCount()));
  if(calFetchPending===dias)return;
  calFetchPending=dias;
  try{
    const res=await fetch(`${API}/planificacion/calendarios/proximos-eventos?dias=${dias}`,{headers:sessionHeader()});
    const data=await res.json();
    if(!data.ok||!Array.isArray(data.data?.days)){if(!calFetchedDays)strip.classList.remove('visible');return;}
    calEventsByDate=new Map(data.data.days.map(d=>[d.date,d.events||[]]));
    calFetchedDays=data.data.days.length;
    renderCalendarStrip();
  }catch(e){if(!calFetchedDays)strip.classList.remove('visible');}
  finally{calFetchPending=null;}
}
loadCalendarAlert();
setInterval(()=>loadCalendarAlert(),15*60000);
let calAlertResizeTimer=null;
window.addEventListener('resize',()=>{
  clearTimeout(calAlertResizeTimer);
  calAlertResizeTimer=setTimeout(renderCalendarStrip,250);
});
new MutationObserver(()=>renderAll()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

const TRACKING_FIXED_KEYS = new Set(['orden_creada','solicitud_vendedor','planeacion']);
const TRACKING_MACHINE_KEYS = new Set(['sellos','impresion','acabados','barnizado','laminado','troquelado','estampado','embosado','numeracion','rebobinado']);

async function loadFlowPanel(code, silent) {
  const box = document.getElementById(`flow-${code}`);
  if (!box) return;
  if (!silent) box.innerHTML = '<div class="flow-loading"><div class="spinner"></div> Cargando flujo...</div>';
  try {
    await loadTrackingUserPhotos();
    const res = await fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento`, { headers: sessionHeader() });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'no-flow');
    const steps = (Array.isArray(data.steps) ? data.steps : []).filter(s => s.processKey !== 'barnizado' && s.processKey !== 'troquelado');
    flowCache[code] = steps;
    renderFlowPanel(box, code, steps);
    bindTrackingAvatarFallback(box);
  } catch(e) {
    box.innerHTML = '<div class="flow-empty">No pudimos traer el flujo de producción en este momento. Revisa la conexión y ábrelo de nuevo.</div>';
  }
}

function renderFlowPanel(box, code, steps) {
  if (!steps || !steps.length) {
    box.innerHTML = '<div class="flow-empty">No hay flujo de producción registrado para esta orden.</div>';
    return;
  }
  // Configuración ESTIMADA por proceso (solo lectura) — se muestra bajo cada paso.
  const procCfg = ((allOrders || []).find(o => o.orderCode === code) || {}).procesoConfig || {};
  const doneCount = steps.filter(s => String(s.routeStatus||'').toUpperCase() === 'COMPLETADO').length;
  const total = steps.length;

  let nextPendingIndex = -1;
  for (let np = 0; np < steps.length; np++) {
    const npStatus = String(steps[np].routeStatus || 'PENDIENTE').toUpperCase();
    if (npStatus !== 'COMPLETADO' && !['RUN','SETUP'].includes(npStatus) && npStatus !== 'PARO') { nextPendingIndex = np; break; }
  }

  let tlHtml = '';
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const status = String(s.routeStatus || 'PENDIENTE').toUpperCase();
    const isDone = status === 'COMPLETADO';
    const isActive = ['RUN','SETUP'].includes(status);
    const isStopped = status === 'PARO';
    const isNextPending = i === nextPendingIndex;
    const isLast = i === steps.length - 1;

    let nodeClass = isDone ? 'tl-node done' : (isActive ? 'tl-node avail in-progress' : (isStopped ? 'tl-node warn' : 'tl-node locked'));
    const markerName = String(s.completedBy || s.startedBy || '').trim();
    const markerPhoto = String(s.completedByPhoto || s.startedByPhoto || '').trim();
    const hasMarkerPhoto = Boolean(markerPhoto || trackingUserPhotos.get(trackingUserLookupKey(markerName)));
    let nodeInner = '';
    if (isDone && markerName) {
      nodeClass += ' has-avatar' + (hasMarkerPhoto ? ' has-photo' : '');
      nodeInner = `<span class="tl-avatar-clip">${trackingAvatarMarkup(markerName, markerPhoto)}</span><span class="tl-node-badge"><i class="ti ti-check" style="font-size:12px;"></i></span>`;
    } else if (isDone) {
      nodeInner = '<i class="ti ti-check" style="font-size:20px;"></i>';
    } else if (isNextPending) {
      nodeInner = '<i class="ti ti-circle-dotted" style="font-size:20px;opacity:.5;"></i><span class="tl-node-badge badge-pending"><i class="ti ti-arrow-right" style="font-size:11px;"></i></span>';
    } else if (isActive) {
      nodeInner = '<div style="width:16px;height:16px;border-radius:50%;background:var(--flow-blue);"></div>';
    } else {
      nodeInner = '<div style="width:12px;height:12px;border-radius:50%;background:var(--ink-5);opacity:.5;"></div>';
    }

    const solid = isDone && !isLast && steps[i+1] && String(steps[i+1].routeStatus||'').toUpperCase() === 'COMPLETADO';
    const line = isLast ? '' : `<div class="tl-connector ${solid ? 'solid' : 'dashed'}"></div>`;

    let detailRows = '';
    if (TRACKING_MACHINE_KEYS.has(s.processKey) && s.planned && s.planned.machineName) {
      detailRows += `<span class="flow-detail-row"><i class="ti ti-cpu" style="font-size:11px;"></i>${esc(s.planned.machineName)}</span>`;
    }
    if (!isDone && s.planned && s.planned.scheduledStart) {
      detailRows += `<span class="flow-detail-row"><i class="ti ti-calendar-event" style="font-size:11px;"></i>Programado: ${formatDate(s.planned.scheduledStart, true)}</span>`;
    }
    if (s.processKey === 'sellos') {
      const planSource = (s.actual && s.actual.planSourceLabel) || (s.planned && s.planned.planSource);
      const planDias = (s.actual && s.actual.diasEstimados) || (s.planned && s.planned.diasEstimados);
      if (planSource) detailRows += `<span class="flow-detail-row"><i class="ti ti-layers-subtract" style="font-size:11px;"></i>${esc(planSource)}</span>`;
      if (planDias > 0) detailRows += `<span class="flow-detail-row"><i class="ti ti-calendar" style="font-size:11px;"></i>${planDias}${planDias===1?' día est.':' días est.'}</span>`;
    }
    const plannedTime = s.planned && s.planned.minutes > 0 ? fmtFlowTime(s.planned.minutes) : '';
    const showTimeInTitle = isDone && plannedTime && s.processKey !== 'empaque';
    if (plannedTime && !showTimeInTitle) {
      detailRows += `<span class="flow-detail-row"><i class="ti ti-clock" style="font-size:11px;"></i>${plannedTime}</span>`;
    }
    // Configuración estimada de este proceso (solo lectura).
    const stepCfg = procCfg[s.processKey];
    if (Array.isArray(stepCfg) && stepCfg.length) {
      detailRows += stepCfg.map(r => `<span class="flow-detail-row flow-cfg-row"><b>${esc(r.k)}:</b>&nbsp;${esc(r.v)}</span>`).join('');
    }

    const markerDate = s.completedAt || s.startedAt || '';
    const metaParts = [];
    if (markerName) metaParts.push(esc(markerName));
    if (markerDate) metaParts.push(formatDate(markerDate, true));
    const metaHtml = metaParts.length ? `<div class="tl-step-meta">${metaParts.join(' · ')}</div>` : '';
    const titleStateClass = isDone ? 'done' : (isActive ? 'active' : (isStopped ? 'stopped' : 'pending'));
    const titleText = esc(s.processName || 'Proceso') + (showTimeInTitle ? ` <span class="tl-title-time">(${plannedTime})</span>` : '');
    const advertenciaPillHtml = s.advertencia ? `<button type="button" class="production-state-pill is-alert" style="margin-left:8px;min-height:22px;padding:0 9px;font-size:11px;border:0;cursor:pointer;vertical-align:middle;" onclick="event.stopPropagation();showFlowStepAdvertencia(&quot;${esc(s.advertencia)}&quot;)">⚠ Advertencia</button>` : '';
    const titleHtml = `<div class="tl-step-title ${titleStateClass}">${titleText}${advertenciaPillHtml}</div>`;
    const hintHtml = (!isDone && !isActive && !isStopped) ? `<div class="tl-step-hint">${isNextPending ? 'Siguiente paso' : 'Pendiente'}</div>` : '';
    const detailHtml = detailRows ? `<div class="flow-detail-stack">${detailRows}</div>` : '';
    const contentHtml = `<div class="tl-step-grid"><div class="tl-step-main">${titleHtml}${metaHtml}${hintHtml}${detailHtml}</div></div>`;

    tlHtml += `<div class="tl-row">
      <div class="tl-col-left"><button type="button" class="${nodeClass}" data-flow-step-index="${i}" aria-label="${isDone ? 'Quitar marca de ' : 'Marcar '}${esc(s.processName || 'Proceso')}">${nodeInner}</button>${line}</div>
      <div class="tl-content">${contentHtml}</div>
    </div>`;
  }

  box.innerHTML = `<div class="fp-panel">
    <div class="fp-panel-head"><div><div class="fp-panel-title">Flujo de Producción</div><div class="fp-panel-sub">${doneCount} de ${total} etapas completas</div></div>
    <span class="fp-counter" style="background:${doneCount===total?'var(--green-light)':(doneCount>0?'var(--amber-light)':'var(--ink-7)')};color:${doneCount===total?'var(--green)':(doneCount>0?'var(--amber)':'var(--ink-4)')};">${doneCount}/${total}</span></div>
    <div class="fp-progress"><div class="fp-progress-fill" style="width:${Math.round(doneCount/total*100)}%;background:linear-gradient(90deg,var(--green),#34d399);"></div></div>
    <div class="fp-body" style="padding-top:0;">${tlHtml}</div>
  </div>`;
}

function showFlowStepAdvertencia(text) {
  alert(text || 'Sin detalle.');
}

function formatDate(value, withTime = false) {
  if (!value) return '';
  const dateOnly = !withTime && String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-CR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtFlowTime(min) {
  const total = Math.round(Number(min || 0));
  if (!Number.isFinite(total) || total <= 0) return '—';
  if (total < 60) return total + ' min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h + ' h' + (m ? ' ' + m + ' min' : '');
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

function seguimientoTieneAccesoImplementador() {
    var raw;
    try { raw = localStorage.getItem('erp-user-session'); } catch (_) {}
    if (!raw) return false;
    var s;
    try { s = JSON.parse(raw); } catch (_) { return false; }
    var permissionName = String(s.permissionName || '').toLowerCase();
    return permissionName.includes('admin') || permissionName.includes('implement');
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

        // Special intercept: empaque step marking opens the PT lote form
        if (step.processKey === 'empaque' && !isDone) {
            stepBtn.disabled = false;
            openEmpaqueLoteForm(code, stepBtn);
            return;
        }

        // Special intercept: diseño/preprensa piden capturar cuántos artes se
        // hicieron (con imagen de referencia) antes de marcar el paso completo.
        if ((step.processKey === 'diseno' || step.processKey === 'preprensa') && !isDone) {
            stepBtn.disabled = false;
            openArtesForm(code, step.processKey, stepBtn);
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
            if (p && p.ok === false && p.error) { stepBtn.disabled = false; stepBtn.innerHTML = prevText; alert(p.error); return; }
            delete flowCache[code];
            loadFlowPanel(code);
        }).catch(() => {
            stepBtn.disabled = false;
            stepBtn.innerHTML = prevText;
        });
        return;
    }
});

// ── Inventory Verification Modal (Liberar Inventario contra SAP) ──
let pendingVerifCode = '';
let pendingVerifStepBtn = null;
let pendingVerifProcessKey = 'impresion';
let currentVerifMaterials = [];
let verifSapSearchTimers = {};
let verifSapItemsCache = {};

function openInventoryVerification(code, processKey, stepBtn) {
    pendingVerifCode = code;
    pendingVerifStepBtn = stepBtn;
    pendingVerifProcessKey = processKey || 'impresion';
    currentVerifMaterials = [];
    verifSapItemsCache = {};
    const modal = document.getElementById('inventoryVerificationModal');
    if (!modal) return;
    const title = document.getElementById('invVerifTitle');
    const completeBtn = document.getElementById('invVerifCompleteBtn');
    if (stepBtn) {
        if (title) title.textContent = 'Verificación de Inventario';
        document.getElementById('invVerifSubtitle').textContent = 'Verificando materiales para orden ' + code;
        if (completeBtn) { completeBtn.style.display = ''; completeBtn.disabled = true; }
    } else {
        if (title) title.textContent = 'Liberar Inventario';
        document.getElementById('invVerifSubtitle').textContent = 'Insumos requeridos por la orden ' + code + ' — selecciona el ítem de SAP y descarga cada línea';
        if (completeBtn) completeBtn.style.display = 'none';
    }
    document.getElementById('invVerifBody').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:120px"><div class="spinner"></div></div>';
    modal.classList.add('open');
    loadVerificationMaterials(code, processKey);
}

function openLiberarInventario(code) {
    openInventoryVerification(code, 'impresion', null);
}

function closeInventoryVerification() {
    const modal = document.getElementById('inventoryVerificationModal');
    if (modal) modal.classList.remove('open');
    pendingVerifCode = '';
    pendingVerifStepBtn = null;
    currentVerifMaterials = [];
}

// ── Formulario de Lote PT al finalizar Empaque ──
function ensureEmpaqueLoteModal() {
    let modal = document.getElementById('empaqueLoteModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'oam-overlay';
    modal.id = 'empaqueLoteModal';
    modal.innerHTML = `
      <div class="oam-panel" style="max-width:520px">
        <div class="oam-header">
          <div>
            <div class="oam-title">Finalizar Empaque</div>
            <div class="oam-subtitle" id="empaqueLoteSubtitle">Datos del lote de producto terminado</div>
          </div>
          <button type="button" class="oam-close" onclick="closeEmpaqueLoteForm()">×</button>
        </div>
        <div class="oam-body">
          <div class="cr-form" style="display:grid;gap:10px">
            <label>Cantidad Producida *<input type="number" id="empLoteCantidad" min="0" step="0.01" class="cr-input"></label>
            <label>Fecha Producción *<input type="date" id="empLoteFecha" class="cr-input"></label>
            <label>Turno<input type="text" id="empLoteTurno" class="cr-input" placeholder="A, B o C"></label>
            <label>Número de Rollos<input type="number" id="empLoteRollos" min="0" class="cr-input"></label>
            <label>Número de Cajas<input type="number" id="empLoteCajas" min="0" class="cr-input"></label>
            <label>Notas<textarea id="empLoteNotas" class="cr-textarea"></textarea></label>
          </div>
        </div>
        <div class="oam-footer" style="display:flex;gap:8px">
          <button type="button" class="btn-secondary" onclick="closeEmpaqueLoteForm()" style="margin:0;flex:1">Cancelar</button>
          <button type="button" class="btn-commit" id="empaqueLoteSubmitBtn" style="flex:1">Finalizar Empaque</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('empaqueLoteSubmitBtn').addEventListener('click', submitEmpaqueLoteForm);
    return modal;
}

let pendingEmpaqueCode = '';
let pendingEmpaqueStepBtn = null;

function openEmpaqueLoteForm(code, stepBtn) {
    pendingEmpaqueCode = code;
    pendingEmpaqueStepBtn = stepBtn;
    const modal = ensureEmpaqueLoteModal();
    document.getElementById('empaqueLoteSubtitle').textContent = 'Datos del lote de producto terminado — orden ' + code;
    document.getElementById('empLoteCantidad').value = '';
    document.getElementById('empLoteFecha').value = new Date().toISOString().slice(0, 10);
    document.getElementById('empLoteTurno').value = '';
    document.getElementById('empLoteRollos').value = '';
    document.getElementById('empLoteCajas').value = '';
    document.getElementById('empLoteNotas').value = '';
    modal.classList.add('open');
}

function closeEmpaqueLoteForm() {
    const modal = document.getElementById('empaqueLoteModal');
    if (modal) modal.classList.remove('open');
    pendingEmpaqueCode = '';
    pendingEmpaqueStepBtn = null;
}

function submitEmpaqueLoteForm() {
    const cantidad = Number(document.getElementById('empLoteCantidad').value);
    const fecha = document.getElementById('empLoteFecha').value;
    if (!(cantidad > 0) || !fecha) {
        alert('Debes ingresar la Cantidad Producida y la Fecha de Producción.');
        return;
    }
    const code = pendingEmpaqueCode;
    const stepBtn = pendingEmpaqueStepBtn;
    const submitBtn = document.getElementById('empaqueLoteSubmitBtn');
    submitBtn.disabled = true;
    fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento/completar`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({
            processKey: 'empaque',
            loteData: {
                cantidad_producida: cantidad,
                fecha_produccion: fecha,
                turno: document.getElementById('empLoteTurno').value || null,
                numero_rollos: document.getElementById('empLoteRollos').value || null,
                numero_cajas: document.getElementById('empLoteCajas').value || null,
                notas: document.getElementById('empLoteNotas').value || null
            }
        })
    }).then(r => r.json()).then(async (p) => {
        submitBtn.disabled = false;
        if (p && p.ok === false && p.error) { alert(p.error); return; }
        closeEmpaqueLoteForm();
        await preguntarProductoTerminadoYFacturaSap(code, cantidad);
        if (stepBtn) { delete flowCache[code]; loadFlowPanel(code); }
    }).catch((err) => {
        submitBtn.disabled = false;
        alert(err.message || 'No fue posible completar Empaque.');
    });
}

// ── Captura de Artes Reales (Diseño / Preprensa) ──
// Antes de marcar Diseño o Preprensa como completado, se piden los artes que
// realmente se hicieron (nombre + imagen de referencia opcional). La imagen
// se redimensiona en el navegador antes de enviarse — es solo una vista
// previa, no el archivo final de impresión — y el servidor la comprime de
// nuevo por seguridad (ver guardarImagenArte en server.js).
let pendingArtesCode = '';
let pendingArtesProcessKey = '';
let pendingArtesStepBtn = null;
let artesRowSeq = 0;

const ARTES_PROCESS_LABELS = { diseno: 'Diseño', preprensa: 'Preprensa' };

function ensureArtesModal() {
    let modal = document.getElementById('artesModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'oam-overlay';
    modal.id = 'artesModal';
    modal.innerHTML = `
      <div class="oam-panel" style="max-width:560px">
        <div class="oam-header">
          <div>
            <div class="oam-title" id="artesModalTitle">Finalizar</div>
            <div class="oam-subtitle" id="artesModalSubtitle">Artes realizados en este proceso</div>
          </div>
          <button type="button" class="oam-close" onclick="closeArtesForm()">×</button>
        </div>
        <div class="oam-body">
          <div id="artesRows" style="display:flex;flex-direction:column;gap:10px"></div>
          <button type="button" class="btn-secondary" style="margin-top:10px" onclick="addArteRow()">+ Agregar arte</button>
        </div>
        <div class="oam-footer" style="display:flex;gap:8px">
          <button type="button" class="btn-secondary" onclick="closeArtesForm()" style="margin:0;flex:1">Cancelar</button>
          <button type="button" class="btn-commit" id="artesSubmitBtn" style="flex:1">Finalizar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('artesSubmitBtn').addEventListener('click', submitArtesForm);
    return modal;
}

function arteRowMarkup(rowId) {
    return `
      <div class="cr-form" data-arte-row="${rowId}" style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:8px;border:1px solid var(--ink-8, #2a2a2a);border-radius:8px">
        <img data-arte-thumb style="width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--ink-9,#1a1a1a);display:none">
        <input type="text" class="cr-input" data-arte-nombre placeholder="Nombre del arte" style="margin:0">
        <div style="display:flex;gap:6px;align-items:center">
          <label class="btn-secondary" style="margin:0;cursor:pointer;padding:6px 10px">
            Imagen<input type="file" accept="image/*" data-arte-file style="display:none">
          </label>
          <button type="button" class="oam-close" data-arte-remove title="Quitar">×</button>
        </div>
      </div>`;
}

function addArteRow() {
    const rowId = 'arte-' + (artesRowSeq++);
    const container = document.getElementById('artesRows');
    const wrap = document.createElement('div');
    wrap.innerHTML = arteRowMarkup(rowId);
    const rowEl = wrap.firstElementChild;
    container.appendChild(rowEl);
    const fileInput = rowEl.querySelector('[data-arte-file]');
    const thumb = rowEl.querySelector('[data-arte-thumb]');
    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        resizeImageToDataUrl(file, 480).then((dataUrl) => {
            rowEl.dataset.arteImagen = dataUrl;
            thumb.src = dataUrl;
            thumb.style.display = 'block';
        }).catch(() => {});
    });
    rowEl.querySelector('[data-arte-remove]').addEventListener('click', () => rowEl.remove());
}

function resizeImageToDataUrl(file, maxDim) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = () => {
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function openArtesForm(code, processKey, stepBtn) {
    pendingArtesCode = code;
    pendingArtesProcessKey = processKey;
    pendingArtesStepBtn = stepBtn;
    const modal = ensureArtesModal();
    const label = ARTES_PROCESS_LABELS[processKey] || processKey;
    document.getElementById('artesModalTitle').textContent = 'Finalizar ' + label;
    document.getElementById('artesModalSubtitle').textContent = 'Artes realizados — orden ' + code;
    document.getElementById('artesRows').innerHTML = '';
    addArteRow();
    modal.classList.add('open');
}

function closeArtesForm() {
    const modal = document.getElementById('artesModal');
    if (modal) modal.classList.remove('open');
    pendingArtesCode = '';
    pendingArtesProcessKey = '';
    pendingArtesStepBtn = null;
}

function submitArtesForm() {
    const rows = [...document.querySelectorAll('#artesRows [data-arte-row]')];
    const artes = rows.map((row) => ({
        nombre: row.querySelector('[data-arte-nombre]').value.trim(),
        imagenBase64: row.dataset.arteImagen || null
    })).filter((a) => a.nombre || a.imagenBase64);
    if (!artes.length) {
        alert('Agrega al menos un arte con nombre o imagen.');
        return;
    }
    const code = pendingArtesCode;
    const processKey = pendingArtesProcessKey;
    const stepBtn = pendingArtesStepBtn;
    const submitBtn = document.getElementById('artesSubmitBtn');
    submitBtn.disabled = true;
    fetch(`${API}/ordenes-produccion/${encodeURIComponent(code)}/seguimiento/completar`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
        body: JSON.stringify({ processKey, artes })
    }).then(r => r.json()).then((p) => {
        submitBtn.disabled = false;
        if (p && p.ok === false && p.error) { alert(p.error); return; }
        closeArtesForm();
        if (stepBtn) { delete flowCache[code]; loadFlowPanel(code); }
    }).catch((err) => {
        submitBtn.disabled = false;
        alert(err.message || 'No fue posible completar el paso.');
    });
}

async function preguntarProductoTerminadoYFacturaSap(code, cantidad) {
    if (window.confirm('Lote de Producto Terminado creado. ¿Deseas registrar la entrada de Producto Terminado en SAP?')) {
        try {
            var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/producto-terminado-sap', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
                body: JSON.stringify({ cantidad: cantidad })
            });
            var result = await res.json();
            if (!res.ok) throw new Error(result.error || 'No fue posible registrar el Producto Terminado en SAP.');
            alert('Producto Terminado registrado en SAP. DocEntry: ' + (result.docEntry || '(sin DocEntry)'));
        } catch (e) {
            alert((e.message || 'No fue posible registrar el Producto Terminado en SAP.') + '\n\nPuedes intentarlo más tarde.');
        }
    }

    // Facturación queda gateada al implementador hasta que Finanzas confirme
    // que Empaque es el actor correcto para disparar un documento fiscal.
    if (seguimientoTieneAccesoImplementador()) {
        if (window.confirm('(Solo implementador — pendiente aprobación de Finanzas) ¿Deseas crear la Factura en SAP para esta orden?')) {
            try {
                var facturaRes = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/factura-sap', { method: 'POST', headers: sessionHeader() });
                var facturaResult = await facturaRes.json();
                if (!facturaRes.ok) throw new Error(facturaResult.error || 'No fue posible crear la Factura en SAP.');
                alert('Factura creada en SAP. DocEntry: ' + (facturaResult.docEntry || '(sin DocEntry)'));
            } catch (e) {
                alert(e.message || 'No fue posible crear la Factura en SAP.');
            }
        }
    }
}

async function loadVerificationMaterials(code, processKey) {
    try {
        const pKey = processKey || 'impresion';
        const res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/materiales-verificacion?process=' + encodeURIComponent(pKey), { headers: sessionHeader() });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error al cargar los insumos de la orden.');
        const prevByKey = {};
        (currentVerifMaterials || []).forEach(function(m) { if (m && m.key) prevByKey[m.key] = m; });
        currentVerifMaterials = (data.materials || []).map(function(m) {
            const prev = prevByKey[m.key];
            if (prev && m.kind !== 'checklist' && !m.sapItemCode) {
                m.sapItemCode = prev.sapItemCode || '';
                m.sapItemLabel = prev.sapItemLabel || '';
                m.sapItemName = prev.sapItemName || '';
                m.sapAvailableQty = prev.sapAvailableQty != null ? prev.sapAvailableQty : null;
            }
            return m;
        });
        renderVerificationMaterials();
    } catch (e) {
        document.getElementById('invVerifBody').innerHTML = '<div class="inv-empty">No fue posible cargar los insumos: ' + escHtml(e.message) + '</div>';
    }
}

function verifFamilyLabel(family) {
    var map = { sustrato: 'Sustrato', tinta: 'Tinta', barniz: 'Barniz', laminado: 'Laminante', foil: 'Foil', goma_laminante: 'Goma Laminante', goma_foil: 'Goma Foil', cores: 'Cores', cajas: 'Cajas', troquel: 'Troquel', sello: 'Sellos', material: 'Insumo' };
    return map[family] || (family || 'Insumo');
}

function verifTintaTipoLabel(tipo) {
    var map = { cmyk: 'Proceso', blanco: 'Blanca', pantone: 'Directa' };
    return map[tipo] || '';
}

function verifSapOptionLabel(item) {
    var code = item.ItemCode || item.itemCode || '';
    var name = item.ItemName || item.itemName || '';
    return code + (name ? ' — ' + name : '');
}

function verifSapSearchHint(family) {
    var map = { tinta: 'tinta' };
    return map[family] || '';
}

async function searchSapItemsForRow(i, term) {
    var datalist = document.getElementById('sapItemsList-' + i);
    if (!datalist) return;
    try {
        var q = encodeURIComponent(term || '');
        var res = await fetch(API + '/sap/items?source=local&top=25&search=' + q, { headers: sessionHeader() });
        var data = await res.json();
        var rows = (data && data.value) || [];
        verifSapItemsCache[i] = rows;
        datalist.innerHTML = rows.map(function(item) {
            return '<option value="' + escHtml(verifSapOptionLabel(item)) + '"></option>';
        }).join('');
        applySapMatchToRow(i);
    } catch (e) {
        // Catálogo local de SAP no disponible; el usuario puede escribir el código manualmente.
    }
}

function applySapMatchToRow(i) {
    var mat = currentVerifMaterials[i];
    if (!mat || !mat.sapItemCode) return;
    var list = verifSapItemsCache[i] || [];
    var found = list.find(function(item) {
        return (item.ItemCode || item.itemCode || '') === mat.sapItemCode;
    });
    mat.sapItemName = found ? (found.ItemName || found.itemName || '') : (mat.sapItemName || '');
    mat.sapAvailableQty = found ? Number(found.AvailableQuantity ?? found.availableQuantity ?? found.OnHand ?? found.onHand ?? 0) : mat.sapAvailableQty;
    var sapInput = document.getElementById('sapInput-' + i);
    if (sapInput && mat.sapItemCode) sapInput.value = mat.sapItemCode + (mat.sapItemName ? ' — ' + mat.sapItemName : '');
    var availEl = document.getElementById('sapAvail-' + i);
    if (availEl && mat.sapAvailableQty != null) {
        var short = Number(mat.sapAvailableQty).toLocaleString('es-CR', { maximumFractionDigits: 2 });
        var low = Number(mat.sapAvailableQty) < Number(mat.plannedQuantity || 0);
        availEl.textContent = short;
        availEl.className = 'inv-item-qty' + (low ? ' inv-qty-low' : '');
    }
}

function onSapItemInput(i, value) {
    var mat = currentVerifMaterials[i];
    if (!mat) return;
    var match = /^(\S+)\s+—/.exec(value || '');
    var typedCode = (match ? match[1] : (value || '').trim());
    mat.sapItemCode = typedCode;
    mat.sapItemLabel = value || '';
    mat.sapItemName = '';
    mat.sapAvailableQty = null;
    var actionBtn = document.getElementById('sapAction-' + i);
    var availEl = document.getElementById('sapAvail-' + i);
    if (availEl) { availEl.textContent = ''; availEl.className = 'inv-item-qty'; }
    if (actionBtn) actionBtn.disabled = !typedCode;
    if (typedCode) applySapMatchToRow(i);
    clearTimeout(verifSapSearchTimers[i]);
    verifSapSearchTimers[i] = setTimeout(function() { searchSapItemsForRow(i, value); }, 250);
}

function renderVerificationMaterials() {
    const body = document.getElementById('invVerifBody');
    const mats = currentVerifMaterials;
    const completeBtn = document.getElementById('invVerifCompleteBtn');
    const requestAllBtn = document.getElementById('invVerifRequestAllBtn');
    if (!mats || !mats.length) {
        body.innerHTML = '<div class="inv-empty">No se encontraron insumos (sustrato, tintas, barniz, laminante, foil, troquel o sellos) registrados en esta orden.</div>';
        if (completeBtn && pendingVerifStepBtn) completeBtn.disabled = false;
        if (requestAllBtn) requestAllBtn.style.display = 'none';
        return;
    }
    let html = '<div class="inv-table-header"><span>Insumo</span><span>Necesidad</span><span>Ítem SAP</span><span>Disponible</span><span>Acción</span></div><div class="inv-list">';
    var allDone = true;
    var sapRowCount = 0;
    var missingSapSelection = false;
    mats.forEach(function(m, i) {
        if (m.kind === 'checklist') {
            if (!m.checked) allDone = false;
            var who = m.checked ? (escHtml(m.checkedBy || '') + (m.checkedAt ? ' · ' + new Date(m.checkedAt).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')) : 'No vive en inventario SAP — confirmo que está disponible/aprobado';
            html += '<div class="inv-item">' +
                '<div class="inv-item-name">' + escHtml(verifFamilyLabel(m.materialFamily)) + '</div>' +
                '<div></div>' +
                '<label class="inv-plate-check" title="' + escHtml(who) + '">' +
                    '<input type="checkbox" ' + (m.checked ? 'checked' : '') + ' onchange="togglePlateChecklist(\'' + escHtml(m.approvalKey) + '\', this.checked)">' +
                '</label>' +
                '<div></div>' +
                '<div></div>' +
            '</div>';
            return;
        }
        sapRowCount++;
        var st = (m.verificationStatus || 'PENDIENTE').toUpperCase();
        var hasCode = !!m.sapItemCode;
        var availLow = m.sapAvailableQty != null && Number(m.sapAvailableQty) < Number(m.plannedQuantity || 0);
        if (st !== 'SUPLIDO') allDone = false;
        if (st !== 'SUPLIDO' && (!hasCode || availLow)) missingSapSelection = true;
        var qty = Number(m.plannedQuantity || 0).toLocaleString('es-CR', { maximumFractionDigits: 2 });
        var unit = escHtml(m.unitCode || '');
        var name = escHtml(m.materialName || m.sapItemCode || 'Insumo');
        var canDischarge = hasCode && !availLow;
        var disabledAttr = canDischarge ? '' : ' disabled';
        var disabledTitle = availLow ? ' title="El disponible en SAP es menor a lo requerido — no se puede descargar esta cantidad."' : '';
        var actionHtml = '';
        if (st === 'SUPLIDO') {
            actionHtml = '<span class="inv-item-action suplido">✓ Descargado</span>';
        } else if (st === 'ERROR') {
            actionHtml = '<button type="button" id="sapAction-' + i + '" class="inv-item-action error"' + disabledAttr + disabledTitle + ' onclick="solicitarMaterial(' + i + ')">Reintentar</button>';
        } else {
            actionHtml = '<button type="button" id="sapAction-' + i + '" class="inv-item-action"' + disabledAttr + disabledTitle + ' onclick="solicitarMaterial(' + i + ')">Descargar</button>';
        }
        var currentLabel = m.sapItemLabel || (m.sapItemCode ? (m.sapItemCode + (m.sapItemName ? ' — ' + m.sapItemName : '')) : '');
        var errorHtml = (st === 'ERROR' && m.sapError) ? '<div class="inv-item-error">' + escHtml(m.sapError) + '</div>' : '';
        var availText = m.sapAvailableQty != null ? Number(m.sapAvailableQty).toLocaleString('es-CR', { maximumFractionDigits: 2 }) : '';
        html += '<div class="inv-item">' +
            '<div class="inv-item-name">' + name + '</div>' +
            '<div class="inv-item-qty">' + qty + ' ' + unit + '</div>' +
            '<div>' +
                '<input type="text" id="sapInput-' + i + '" class="inv-sap-select" list="sapItemsList-' + i + '" placeholder="Buscar código o nombre en SAP..." value="' + escHtml(currentLabel) + '" oninput="onSapItemInput(' + i + ', this.value)">' +
                '<datalist id="sapItemsList-' + i + '"></datalist>' +
                errorHtml +
            '</div>' +
            '<div class="inv-item-qty' + (availLow ? ' inv-qty-low' : '') + '" id="sapAvail-' + i + '">' + availText + '</div>' +
            '<div>' + actionHtml + '</div>' +
        '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
    mats.forEach(function(m, i) {
        if (m.kind === 'checklist') return;
        var term = m.sapItemLabel || m.sapItemCode || verifSapSearchHint(m.materialFamily) || '';
        searchSapItemsForRow(i, term);
    });
    if (completeBtn && pendingVerifStepBtn) completeBtn.disabled = !allDone;
    if (requestAllBtn) {
        requestAllBtn.style.display = sapRowCount ? '' : 'none';
        requestAllBtn.disabled = missingSapSelection;
        requestAllBtn.title = missingSapSelection ? 'Selecciona un ítem de SAP con disponible suficiente en todas las filas pendientes antes de descargar todo.' : '';
    }
}

async function togglePlateChecklist(approvalKey, checked) {
    try {
        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(pendingVerifCode) + '/materiales-aprobacion', {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({ approvalKey: approvalKey, checked: checked })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
        await loadVerificationMaterials(pendingVerifCode, pendingVerifProcessKey);
    } catch (e) {
        alert(e.message || 'No fue posible actualizar la verificación de sellos.');
        await loadVerificationMaterials(pendingVerifCode, pendingVerifProcessKey);
    }
}

async function solicitarTodosMateriales() {
    var btn = document.getElementById('invVerifRequestAllBtn');
    var pending = [];
    currentVerifMaterials.forEach(function(m, i) {
        if (m.kind === 'checklist') return;
        var st = (m.verificationStatus || 'PENDIENTE').toUpperCase();
        var availLow = m.sapAvailableQty != null && Number(m.sapAvailableQty) < Number(m.plannedQuantity || 0);
        if ((st === 'PENDIENTE' || st === 'ERROR') && m.sapItemCode && !availLow) pending.push(i);
    });
    if (!pending.length) return;
    if (btn) btn.disabled = true;
    for (var p = 0; p < pending.length; p++) {
        await solicitarMaterial(pending[p]);
    }
    if (btn) btn.disabled = false;
}

async function solicitarMaterial(index) {
    var mat = currentVerifMaterials[index];
    if (!mat) return;
    if (!mat.sapItemCode) {
        alert('Debes seleccionar un ítem de SAP antes de hacer la descarga.');
        return;
    }
    if (mat.sapAvailableQty != null && Number(mat.sapAvailableQty) < Number(mat.plannedQuantity || 0)) {
        alert('El disponible en SAP (' + mat.sapAvailableQty + ') es menor a lo requerido (' + mat.plannedQuantity + '). No se puede descargar esta cantidad.');
        return;
    }
    var body = document.getElementById('invVerifBody');
    var btns = body ? body.querySelectorAll('.inv-item-action') : [];
    btns.forEach(function(b) { b.disabled = true; });
    try {
        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(pendingVerifCode) + '/materiales-verificacion/solicitar', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({
                processKey: pendingVerifProcessKey,
                sapItemCode: mat.sapItemCode,
                materialName: mat.materialName,
                materialFamily: mat.materialFamily,
                quantity: mat.plannedQuantity,
                unitCode: mat.unitCode
            })
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok || !data.ok) {
            throw new Error((data && (data.error || (data.verification && data.verification.sapError))) || 'No fue posible conectar con el servidor.');
        }
        await loadVerificationMaterials(pendingVerifCode, pendingVerifProcessKey);
    } catch (e) {
        mat.verificationStatus = 'ERROR';
        mat.sapError = e.message || 'Sin conexión con el servidor.';
        renderVerificationMaterials();
    }
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

async function ejecutarLiberacionParcial() {
    var code = pendingVerifCode;
    var btn = document.getElementById('invVerifPartialBtn');
    if (!code) { closeInventoryVerification(); return; }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Liberando...';
    }

    try {
        if (Array.isArray(currentVerifMaterials)) {
            for (var i = 0; i < currentVerifMaterials.length; i++) {
                var m = currentVerifMaterials[i];
                if (m && m.kind === 'checklist' && m.approvalKey && !m.checked) {
                    await togglePlateChecklist(m.approvalKey, true).catch(function() {});
                }
            }
        }

        var res = await fetch(API + '/ordenes-produccion/' + encodeURIComponent(code) + '/planeacion/liberacion-parcial', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, sessionHeader()),
            body: JSON.stringify({ processKey: 'planeacion', marked: true })
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok || !data.ok) {
            throw new Error((data && data.error) || 'No fue posible registrar la liberación parcial.');
        }

        closeInventoryVerification();
        delete flowCache[code];
        loadFlowPanel(code);
    } catch (e) {
        alert(e.message || 'Error al ejecutar la liberación parcial.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Liberación Parcial';
        }
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
        var errorHint = (st === 'ERROR' && item.sap_error) ? '<div class="inv-item-error">' + escHtml(item.sap_error) + '</div>' : '';
        html += '<div class="pl-item">' +
            '<div><div class="pl-order-code" onclick="closePendingList();searchByOrder(\'' + escHtml(item.order_code) + '\')">' + code + '</div>' +
            '<div class="pl-material">' + name + '</div>' + errorHint + '</div>' +
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
    document.getElementById('invVerifRequestAllBtn')?.addEventListener('click', solicitarTodosMateriales);
    document.getElementById('invVerifPartialBtn')?.addEventListener('click', ejecutarLiberacionParcial);
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
.step-tip-portal{position:fixed;background:var(--text);color:var(--surface);border-radius:7px;padding:7px 10px;font-size:11.5px;line-height:1.45;white-space:nowrap;pointer-events:none;z-index:9999;box-shadow:0 8px 20px rgba(20,26,46,.18);opacity:0;transform:translate(-50%,-100%) translateY(-8px);transition:opacity .12s}
.step-tip-portal.show{opacity:1}
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// Tooltip de los puntitos del flujo: flota fuera de la tarjeta (position:fixed en <body>)
// para que nunca quede recortado por el overflow:hidden de .order-row.
(function initStepTipPortal(){
  const portal = document.createElement('div');
  portal.className = 'step-tip-portal';
  document.body.appendChild(portal);
  function show(wrap){
    const tip = wrap.getAttribute('data-tip');
    if (!tip) return;
    portal.innerHTML = tip;
    const r = wrap.querySelector('.step-pip').getBoundingClientRect();
    portal.style.left = (r.left + r.width / 2) + 'px';
    portal.style.top = r.top + 'px';
    portal.classList.add('show');
  }
  function hide(){ portal.classList.remove('show'); }
  document.addEventListener('mouseover', (e) => { const w = e.target.closest('.step-pip-wrap'); if (w) show(w); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('.step-pip-wrap')) hide(); });
  document.addEventListener('focusin', (e) => { const w = e.target.closest('.step-pip-wrap'); if (w) show(w); });
  document.addEventListener('focusout', (e) => { if (e.target.closest('.step-pip-wrap')) hide(); });
})();
