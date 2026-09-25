const API = '/api/inventario-pt';
const SESSION_STORAGE_KEY = 'erp-user-session';
const TABLES = ['resumen', 'lotes', 'entradas', 'existencias', 'reservas', 'solicitudes', 'despachos', 'movimientos', 'reportes', 'bodegas'];

let iptCatalogo = { productos: [], ordenes: [], clientes: [], maquinas: [], usuarios: [], unidades: [], bodegas: [], lotes: [], existencias: [] };
let iptLotesCache = [];
let iptSolicitudesCache = [];
let iptDespachosCache = [];

function iptGetSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function iptHeaders(extra = {}) {
    const session = iptGetSession();
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (session && session.username) {
        headers['x-erp-session'] = JSON.stringify(session);
    }
    return headers;
}

async function iptApi(url, options = {}) {
    const response = await fetch(url, { ...options, headers: iptHeaders(options.headers) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible completar la operación.');
    }
    return payload;
}

function iptRows(payload) {
    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload.rows) ? payload.rows : [];
}

function iptEscape(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function iptNum(value, decimals = 2) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('es-CR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function iptDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function iptDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function iptBadge(value) {
    const estados = {
        LIBERADO: ['ok', 'LIBERADO'], APROBADO: ['ok', 'APROBADO'], DESPACHADO: ['ok', 'DESPACHADO'],
        APROBADO_CON_OBSERVACIONES: ['warn', 'APROBADO C/OBS.'], ACTIVA: ['ok', 'ACTIVA'], PARCIAL: ['warn', 'PARCIAL'],
        RESERVADA: ['info', 'RESERVADA'], PREPARADA: ['info', 'PREPARADA'], EN_PREPARACION: ['info', 'EN PREPARACIÓN'],
        PENDIENTE: ['warn', 'PENDIENTE'], BORRADOR: ['mut', 'BORRADOR'], EN_INSPECCION: ['info', 'EN INSPECCIÓN'],
        PENDIENTE_INTEGRACION: ['warn', 'PENDIENTE SAP'],
        RECHAZADO: ['bad', 'RECHAZADO'], BLOQUEADO: ['bad', 'BLOQUEADO'], CANCELADA: ['bad', 'CANCELADA'],
        VENCIDA: ['bad', 'VENCIDA'], UTILIZADA: ['mut', 'UTILIZADA'], ERROR: ['bad', 'ERROR'],
        DESPACHADA: ['ok', 'DESPACHADA'], DESPACHADA_PARCIAL: ['warn', 'DESPACHADA PARCIAL'],
        REINTENTO_PROGRAMADO: ['warn', 'REINTENTO PROGRAMADO'], PROCESADA: ['ok', 'PROCESADA'],
        DISPONIBLE: ['ok', 'DISPONIBLE'], PARCIALMENTE_RESERVADO: ['warn', 'PARCIALMENTE RESERVADO'], AGOTADO: ['bad', 'AGOTADO']
    };
    const item = estados[String(value || '').toUpperCase()];
    return item ? `<span class="badge ${item[0]}">${item[1]}</span>` : `<span class="badge mut">${iptEscape(value || '')}</span>`;
}

function iptNotify(title, message, type) {
    const colors = { success: '#1e7d46', warning: '#a5710b', info: '#0b81b8', danger: '#c0392b' };
    const c = colors[type || 'info'] || colors.info;
    const el = document.createElement('div');
    el.className = 'notif-item';
    el.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 14px;background:#fff;border:1px solid #e2ebf2;border-radius:12px;box-shadow:0 8px 24px rgba(11,40,60,.14);margin-bottom:8px';
    el.innerHTML = `<div style="font-size:18px;line-height:1;color:${c};margin-top:2px">●</div><div><div style="font-weight:700;color:${c};font-size:12.5px">${iptEscape(title)}</div><div style="color:#44607a;font-size:12.5px;margin-top:2px">${iptEscape(message)}</div></div>`;
    let area = document.getElementById('iptNotifArea');
    if (!area) {
        area = document.createElement('div');
        area.id = 'iptNotifArea';
        area.style.cssText = 'position:fixed;top:14px;right:14px;z-index:1400;display:grid;gap:8px;max-width:380px';
        document.body.appendChild(area);
    }
    area.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
}

// ── MODAL ──────────────────────────────────────────────────────────────

function iptOpenModal(title, bodyHtml, footHtml = '') {
    document.getElementById('iptModalTitle').textContent = title;
    document.getElementById('iptModalBody').innerHTML = bodyHtml;
    document.getElementById('iptModalFoot').innerHTML = footHtml;
    document.getElementById('iptModalBackdrop').classList.add('is-open');
}

function iptCloseModal() {
    document.getElementById('iptModalBackdrop').classList.remove('is-open');
}

function iptModalFoot(buttons) {
    const map = {
        close: '<button type="button" class="ipt-btn ghost" data-close-modal>Cerrar</button>',
        save: '<button type="button" class="ipt-btn" id="iptModalSave">Guardar</button>',
        ok: '<button type="button" class="ipt-btn" data-close-modal>OK</button>'
    };
    return buttons.map((key) => map[key] || '').join('');
}

function iptFormHtml(fields) {
    const fieldHtml = (field) => {
        const id = 'iptF_' + field.name;
        let input = '';
        if (field.type === 'select') {
            const selected = field.value !== undefined && field.value !== null ? String(field.value) : '';
            const options = (field.options || []).map((opt) => {
                const val = opt.value !== undefined ? opt.value : opt;
                const label = opt.label !== undefined ? opt.label : opt;
                return `<option value="${iptEscape(val)}" ${String(val) === selected ? 'selected' : ''}>${iptEscape(label)}</option>`;
            }).join('');
            input = `<select id="${id}" ${field.required ? 'required' : ''}>${field.placeholder ? `<option value="">${iptEscape(field.placeholder)}</option>` : ''}${options}</select>`;
        } else if (field.type === 'checkbox') {
            input = `<input type="checkbox" id="${id}" ${field.value ? 'checked' : ''}>`;
        } else if (field.type === 'textarea') {
            input = `<textarea id="${id}" ${field.required ? 'required' : ''} placeholder="${iptEscape(field.placeholder || '')}">${iptEscape(field.value || '')}</textarea>`;
        } else {
            const value = field.value !== undefined && field.value !== null ? field.value : '';
            input = `<input type="${field.type || 'text'}" id="${id}" value="${iptEscape(value)}" ${field.required ? 'required' : ''} placeholder="${iptEscape(field.placeholder || '')}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.step !== undefined ? `step="${field.step}"` : ''}>`;
        }
        return `<div class="ipt-field ${field.full ? 'full' : ''}"><label>${iptEscape(field.label)}</label>${input}</div>`;
    };
    return `<div class="ipt-form-grid">${fields.map(fieldHtml).join('')}</div>`;
}

function iptFormValues(fields) {
    const values = {};
    for (const field of fields) {
        const el = document.getElementById('iptF_' + field.name);
        if (!el) continue;
        let value = el.value;
        if (field.type === 'number') value = value === '' ? null : Number(value);
        if (field.type === 'checkbox') value = el.checked;
        values[field.name] = value;
    }
    return values;
}

function iptConfirm(message) {
    return window.confirm(message);
}

// ── TABS ───────────────────────────────────────────────────────────────

function iptSwitchTab(name) {
    TABLES.forEach((tab) => {
        document.getElementById('panel-' + tab).classList.toggle('is-active', tab === name);
    });
    document.querySelectorAll('#iptTabs .ipt-tab').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.panel === name);
    });
    if (name === 'resumen') iptLoadResumen();
    if (name === 'lotes') iptLoadLotes();
    if (name === 'entradas') iptLoadEntradas();
    if (name === 'existencias') iptLoadExistencias();
    if (name === 'reservas') iptLoadReservas();
    if (name === 'solicitudes') iptLoadSolicitudes();
    if (name === 'despachos') iptLoadDespachos();
    if (name === 'movimientos') iptLoadMovimientos();
    if (name === 'bodegas') iptLoadBodegas();
}

// ── CATÁLOGOS ──────────────────────────────────────────────────────────

async function iptLoadCatalogos() {
    try {
        const [productos, ordenes, clientes, maquinas, usuarios, unidades, bodegas] = await Promise.all([
            iptApi(`${API}/catalogos/productos`), iptApi(`${API}/catalogos/ordenes`),
            iptApi(`${API}/catalogos/clientes`), iptApi(`${API}/catalogos/maquinas`),
            iptApi(`${API}/catalogos/usuarios`), iptApi(`${API}/catalogos/unidades`),
            iptApi(`${API}/bodegas`)
        ]);
        iptCatalogo.productos = iptRows(productos);
        iptCatalogo.ordenes = iptRows(ordenes);
        iptCatalogo.clientes = iptRows(clientes);
        iptCatalogo.maquinas = iptRows(maquinas);
        iptCatalogo.usuarios = iptRows(usuarios);
        iptCatalogo.unidades = iptRows(unidades).map((u) => u.unidad || u);
        iptCatalogo.bodegas = iptRows(bodegas);
        const existSelect = document.getElementById('iptExistBodega');
        existSelect.innerHTML = '<option value="">Todas las bodegas</option>' + iptCatalogo.bodegas.map((b) => `<option value="${b.id}">${iptEscape(b.nombre)}</option>`).join('');
    } catch (error) {
        iptNotify('Catálogos', error.message, 'danger');
    }
}

function iptProductoOptions() {
    return iptCatalogo.productos.map((p) => ({ value: p.id, label: `${p.product_code} — ${p.product_name}` }));
}

function iptLoteOptions(estado = 'LIBERADO') {
    return iptLotesCache
        .filter((l) => !estado || String(l.estado_calidad).toUpperCase() === estado)
        .map((l) => ({ value: l.id, label: `${l.codigo_lote} (${l.product_code || ''} ${l.product_name || ''})` }));
}

function iptExistenciaOptions(conDisponibilidad = false) {
    return iptCatalogo.existencias
        .filter((e) => !conDisponibilidad || Number(e.cantidad_disponible) > 0)
        .map((e) => ({ value: e.id, label: `${e.product_code || ''} — Lote ${e.codigo_lote || ''} — ${e.bodega_nombre || ''} (disp. ${iptNum(e.cantidad_disponible)})` }));
}

// ── RESUMEN ────────────────────────────────────────────────────────────

async function iptLoadResumen() {
    try {
        const data = await iptApi(`${API}/dashboard`);
        const t = data.totales || {};
        const kpis = [
            { label: 'Cantidad Física', value: iptNum(t.fisica), sub: `${t.registros} existencias` },
            { label: 'Reservada', value: iptNum(t.reservada), sub: 'comprometida' },
            { label: 'Bloqueada', value: iptNum(t.bloqueada), sub: 'control de calidad' },
            { label: 'En Despacho', value: iptNum(t.en_despacho), sub: 'preparación' },
            { label: 'Disponible', value: iptNum(t.disponible), sub: 'para venta' },
            { label: 'Solicitudes', value: data.solicitudes_pendientes?.total || 0, sub: `${data.solicitudes_pendientes?.pendiente || 0} pendientes` },
            { label: 'Despachos Hoy', value: data.despachos_del_dia || 0, sub: 'confirmados' },
            { label: 'SAP Pendientes', value: data.sap?.pendientes || 0, sub: `${data.sap?.errores || 0} con error` }
        ];
        document.getElementById('iptKpis').innerHTML = kpis.map((k) => `
            <div class="ipt-kpi">
                <div class="ipt-kpi-label">${k.label}</div>
                <div class="ipt-kpi-value">${k.value}</div>
                <small>${k.sub}</small>
            </div>`).join('');

        const actividad = data.actividad_reciente || [];
        document.getElementById('iptActividadBody').innerHTML = actividad.length
            ? actividad.map((a) => `<tr><td>${iptBadge(a.tipo_movimiento)}</td><td class="num">${iptNum(a.cantidad)}</td><td>${iptEscape(a.product_name || a.product_code || '')}</td><td>${iptEscape(iptDateTime(a.fecha_movimiento))}</td></tr>`).join('')
            : '<tr><td colspan="4" class="ipt-empty">Sin actividad reciente.</td></tr>';

        const porBodega = data.inventario_por_bodega || [];
        document.getElementById('iptResumenBodegaBody').innerHTML = porBodega.length
            ? porBodega.map((b) => `<tr><td>${iptEscape(b.bodega)}</td><td class="num">${iptNum(b.fisica)}</td><td class="num">${iptNum(b.disponible)}</td></tr>`).join('')
            : '<tr><td colspan="3" class="ipt-empty">Sin inventario por bodega.</td></tr>';

        const serie = data.serie_mensual || [];
        document.getElementById('iptSerieBody').innerHTML = serie.length
            ? serie.map((s) => `<tr><td>${iptEscape(s.mes)}</td><td class="num">${s.entradas}</td><td class="num">${s.salidas}</td></tr>`).join('')
            : '<tr><td colspan="3" class="ipt-empty">Sin movimiento mensual.</td></tr>';
    } catch (error) {
        iptNotify('Resumen', error.message, 'danger');
    }
}

// ── LOTES ──────────────────────────────────────────────────────────────

async function iptLoadLotes() {
    try {
        const q = document.getElementById('iptLotesBusqueda').value.trim();
        const estado = document.getElementById('iptLotesEstado').value;
        const params = new URLSearchParams({ limit: '200' });
        if (estado) params.set('estado_calidad', estado);
        const payload = await iptApi(`${API}/lotes?${params.toString()}`);
        const items = iptRows(payload);
        iptLotesCache = items;
        const filtered = q
            ? items.filter((l) => [l.codigo_lote, l.product_code, l.product_name, l.order_code, l.cliente_nombre].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())))
            : items;
        document.getElementById('iptLotesBody').innerHTML = filtered.length ? filtered.map((l) => `
            <tr>
                <td><strong>${iptEscape(l.codigo_lote)}</strong></td>
                <td>${iptEscape(l.product_code || '')} ${iptEscape(l.product_name || '')}</td>
                <td>${iptEscape(l.order_code || '')}</td>
                <td class="num">${iptNum(l.cantidad_producida)}</td>
                <td class="num">${iptNum(l.cantidad_aprobada)}</td>
                <td class="num">${iptNum(l.cantidad_rechazada)}</td>
                <td>${iptBadge(l.estado_calidad)}</td>
                <td>${l.fecha_liberacion ? iptEscape(iptDate(l.fecha_liberacion)) : '—'}</td>
                <td><div class="row-actions">
                    <button data-action="detalle" data-id="${l.id}">Detalle</button>
                    ${['PENDIENTE', 'EN_INSPECCION'].includes(l.estado_calidad) ? `<button data-action="calidad" data-id="${l.id}">Calidad</button>` : ''}
                    ${l.estado_calidad === 'APROBADO' || l.estado_calidad === 'APROBADO_CON_OBSERVACIONES' ? `<button data-action="liberar" data-id="${l.id}">Liberar</button>` : ''}
                    ${l.estado_calidad === 'LIBERADO' ? `<button data-action="bloquear-lote" data-id="${l.id}">Bloquear</button>` : ''}
                    ${l.estado_calidad === 'BLOQUEADO' ? `<button data-action="desbloquear-lote" data-id="${l.id}">Desbloquear</button>` : ''}
                    <button data-action="editar" data-id="${l.id}">Editar</button>
                </div></td>
            </tr>`).join('') : '<tr><td colspan="9" class="ipt-empty">No hay lotes registrados.</td></tr>';
    } catch (error) {
        document.getElementById('iptLotesBody').innerHTML = `<tr><td colspan="9" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenLoteNuevo() {
    const fields = [
        { name: 'producto_id', label: 'Producto', type: 'select', options: iptProductoOptions(), required: true },
        { name: 'orden_produccion_id', label: 'Orden de Producción', type: 'select', options: iptCatalogo.ordenes.map((o) => ({ value: o.id, label: `${o.order_code} — ${o.customer_name || ''} — ${o.product_code || ''}` })) },
        { name: 'cantidad_producida', label: 'Cantidad Producida', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'fecha_produccion', label: 'Fecha Producción', type: 'date', required: true },
        { name: 'turno', label: 'Turno', type: 'text', placeholder: 'A, B o C' },
        { name: 'maquina_id', label: 'Máquina', type: 'select', options: iptCatalogo.maquinas.map((m) => ({ value: m.id, label: m.nombre })) },
        { name: 'operador_id', label: 'Operador', type: 'select', options: iptCatalogo.usuarios.map((u) => ({ value: u.id, label: u.full_name || u.username })) },
        { name: 'numero_rollos', label: 'Número de Rollos', type: 'number', min: 0 },
        { name: 'numero_cajas', label: 'Número de Cajas', type: 'number', min: 0 },
        { name: 'notas', label: 'Notas', type: 'textarea', full: true }
    ];
    iptOpenModal('Nuevo Lote de Producción', iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.producto_id || !values.cantidad_producida || !values.fecha_produccion) {
            iptNotify('Lote', 'Producto, cantidad y fecha son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/lotes`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Lote', 'Lote creado correctamente.', 'success');
            iptLoadLotes();
        } catch (error) {
            iptNotify('Lote', error.message, 'danger');
        }
    });
}

function iptOpenLoteCalidad(lote) {
    const fields = [
        { name: 'estado', label: 'Estado', type: 'select', options: ['APROBADO', 'APROBADO_CON_OBSERVACIONES', 'RECHAZADO', 'EN_INSPECCION', 'BLOQUEADO'], required: true },
        { name: 'cantidad_aprobada', label: 'Cantidad Aprobada', type: 'number', min: 0, step: '0.0001', value: lote.cantidad_aprobada || '' },
        { name: 'cantidad_rechazada', label: 'Cantidad Rechazada', type: 'number', min: 0, step: '0.0001', value: lote.cantidad_rechazada || '' },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true }
    ];
    iptOpenModal(`Control de Calidad — ${lote.codigo_lote}`, iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        try {
            await iptApi(`${API}/lotes/${lote.id}/calidad`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Calidad', 'Resultado de calidad registrado.', 'success');
            iptLoadLotes();
        } catch (error) {
            iptNotify('Calidad', error.message, 'danger');
        }
    });
}

function iptOpenLoteEditar(lote) {
    const editables = [
        { name: 'fecha_produccion', label: 'Fecha Producción', type: 'date', value: (lote.fecha_produccion || '').slice(0, 10) },
        { name: 'turno', label: 'Turno', type: 'text', value: lote.turno || '' },
        { name: 'maquina_id', label: 'Máquina', type: 'select', options: iptCatalogo.maquinas.map((m) => ({ value: m.id, label: m.nombre })), value: lote.maquina_id || '' },
        { name: 'operador_id', label: 'Operador', type: 'select', options: iptCatalogo.usuarios.map((u) => ({ value: u.id, label: u.full_name || u.username })), value: lote.operador_id || '' },
        { name: 'numero_rollos', label: 'Número de Rollos', type: 'number', min: 0, value: lote.numero_rollos || '' },
        { name: 'numero_cajas', label: 'Número de Cajas', type: 'number', min: 0, value: lote.numero_cajas || '' },
        { name: 'notas', label: 'Notas', type: 'textarea', full: true, value: lote.notas || '' }
    ];
    iptOpenModal(`Editar Lote ${lote.codigo_lote}`, iptFormHtml(editables), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(editables);
        try {
            await iptApi(`${API}/lotes/${lote.id}`, { method: 'PATCH', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Lote', 'Lote actualizado.', 'success');
            iptLoadLotes();
        } catch (error) {
            iptNotify('Lote', error.message, 'danger');
        }
    });
}

async function iptOpenLoteDetalle(lote) {
    try {
        const detalle = await iptApi(`${API}/lotes/${lote.id}`);
        const movimientos = (detalle.movimientos || []).slice(0, 15);
        const inventarios = detalle.inventarios || [];
        iptOpenModal(`Lote ${detalle.codigo_lote}`, `
            <div class="ipt-detail-grid">
                <div><span>Producto</span><span>${iptEscape(detalle.product_code || '')} ${iptEscape(detalle.product_name || '')}</span></div>
                <div><span>Cliente</span><span>${iptEscape(detalle.cliente_nombre || '—')}</span></div>
                <div><span>Orden</span><span>${iptEscape(detalle.order_code || '—')}</span></div>
                <div><span>Fecha Producción</span><span>${iptEscape(iptDate(detalle.fecha_produccion))}</span></div>
                <div><span>Producida</span><span>${iptNum(detalle.cantidad_producida)}</span></div>
                <div><span>Aprobada</span><span>${iptNum(detalle.cantidad_aprobada)}</span></div>
                <div><span>Rechazada</span><span>${iptNum(detalle.cantidad_rechazada)}</span></div>
                <div><span>Enviada a Bodega</span><span>${iptNum(detalle.cantidad_enviada_bodega)}</span></div>
                <div><span>Estado Calidad</span><span>${iptBadge(detalle.estado_calidad)}</span></div>
                <div><span>Liberación</span><span>${detalle.fecha_liberacion ? iptEscape(iptDateTime(detalle.fecha_liberacion)) : '—'}</span></div>
            </div>
            <div class="ipt-sub-section">Existencias del Lote</div>
            <div class="ipt-tbl-wrap"><table class="ipt-table"><thead><tr><th>Bodega</th><th class="num">Física</th><th class="num">Reservada</th><th class="num">Bloqueada</th><th class="num">Disponible</th><th>Estado</th></tr></thead><tbody>
                ${inventarios.length ? inventarios.map((i) => `<tr><td>${iptEscape(i.bodega_nombre || '')}</td><td class="num">${iptNum(i.cantidad_fisica)}</td><td class="num">${iptNum(i.cantidad_reservada)}</td><td class="num">${iptNum(i.cantidad_bloqueada)}</td><td class="num">${iptNum(i.cantidad_disponible)}</td><td>${iptBadge(i.estado)}</td></tr>`).join('') : '<tr><td colspan="6" class="ipt-empty">Sin existencias.</td></tr>'}
            </tbody></table></div>
            <div class="ipt-sub-section">Movimientos Recientes</div>
            <div class="ipt-tbl-wrap"><table class="ipt-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th class="num">Cantidad</th><th>Documento</th></tr></thead><tbody>
                ${movimientos.length ? movimientos.map((m) => `<tr><td>${iptEscape(iptDateTime(m.fecha_movimiento))}</td><td>${iptBadge(m.tipo_movimiento)}</td><td class="num">${iptNum(m.cantidad)}</td><td>${iptEscape(m.referencia_externa || m.documento_tipo || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="ipt-empty">Sin movimientos.</td></tr>'}
            </tbody></table></div>
        `, iptModalFoot(['close']));
    } catch (error) {
        iptNotify('Lote', error.message, 'danger');
    }
}

async function iptLoteAction(action, lote) {
    if (action === 'calidad') return iptOpenLoteCalidad(lote);
    if (action === 'editar') return iptOpenLoteEditar(lote);
    if (action === 'detalle') return iptOpenLoteDetalle(lote);
    if (action === 'liberar') {
        if (!iptConfirm(`¿Liberar el lote ${lote.codigo_lote} para inventario?`)) return;
    } else if (action === 'bloquear-lote' || action === 'desbloquear-lote') {
        const motivo = prompt(action === 'bloquear-lote' ? 'Motivo del bloqueo:' : 'Motivo del desbloqueo:');
        if (!motivo || !motivo.trim()) return;
        try {
            await iptApi(`${API}/lotes/${lote.id}/${action === 'bloquear-lote' ? 'bloquear' : 'desbloquear'}`, { method: 'POST', body: JSON.stringify({ motivo: motivo.trim() }) });
            iptNotify('Lote', action === 'bloquear-lote' ? 'Lote bloqueado.' : 'Lote desbloqueado.', 'success');
            return iptLoadLotes();
        } catch (error) {
            return iptNotify('Lote', error.message, 'danger');
        }
    }
    try {
        await iptApi(`${API}/lotes/${lote.id}/${action}`, { method: 'POST', body: '{}' });
        iptNotify('Lote', action === 'liberar' ? 'Lote liberado para inventario.' : 'Operación completada.', 'success');
        iptLoadLotes();
    } catch (error) {
        iptNotify('Lote', error.message, 'danger');
    }
}

// ── ENTRADAS ───────────────────────────────────────────────────────────

async function iptLoadEntradas() {
    try {
        const q = document.getElementById('iptEntradasBusqueda').value.trim();
        const payload = await iptApi(`${API}/movimientos?limit=300`);
        let items = iptRows(payload).filter((m) => m.tipo_movimiento === 'ENTRADA_PRODUCCION' || m.tipo_movimiento === 'TRANSFERENCIA_ENTRADA' || m.tipo_movimiento === 'AJUSTE_POSITIVO');
        if (q) {
            items = items.filter((m) => [m.codigo_lote, m.product_code, m.product_name, m.referencia_externa].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptEntradasBody').innerHTML = items.length ? items.map((m) => `
            <tr>
                <td>${iptEscape(iptDateTime(m.fecha_movimiento))}</td>
                <td>${iptEscape(m.codigo_lote || '')}</td>
                <td>${iptEscape(m.product_code || '')} ${iptEscape(m.product_name || '')}</td>
                <td>${iptEscape(m.order_code || '')}</td>
                <td>${iptEscape(m.bodega_nombre || '')}</td>
                <td class="num">${iptNum(m.cantidad)}</td>
                <td>${iptEscape(m.unidad || '')}</td>
                <td>${iptEscape(m.motivo || '')}</td>
            </tr>`).join('') : '<tr><td colspan="8" class="ipt-empty">Sin entradas registradas.</td></tr>';
    } catch (error) {
        document.getElementById('iptEntradasBody').innerHTML = `<tr><td colspan="8" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenEntradaNueva() {
    const fields = [
        { name: 'lote_id', label: 'Lote (LIBERADO)', type: 'select', options: iptLoteOptions('LIBERADO'), required: true },
        { name: 'bodega_id', label: 'Bodega', type: 'select', options: iptCatalogo.bodegas.map((b) => ({ value: b.id, label: `${b.codigo_bodega} — ${b.nombre}` })), required: true },
        { name: 'ubicacion_id', label: 'Ubicación', type: 'select', options: [], placeholder: 'Sin ubicación específica' },
        { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'fecha', label: 'Fecha', type: 'date', required: true },
        { name: 'notas', label: 'Notas', type: 'textarea', full: true }
    ];
    iptOpenModal('Registrar Entrada a Bodega', iptFormHtml(fields), iptModalFoot(['close', 'save']));
    const bodegaSelect = document.getElementById('iptF_bodega_id');
    const ubicacionSelect = document.getElementById('iptF_ubicacion_id');
    const loteSelect = document.getElementById('iptF_lote_id');
    const renderUbicaciones = () => {
        const bodega = iptCatalogo.bodegas.find((b) => String(b.id) === String(bodegaSelect.value));
        const opciones = (bodega?.ubicaciones || []).filter((u) => u.activo).map((u) => ({ value: u.id, label: `${u.codigo_ubicacion} — ${u.nombre || ''}` }));
        ubicacionSelect.innerHTML = '<option value="">Sin ubicación específica</option>' + opciones.map((o) => `<option value="${o.value}">${iptEscape(o.label)}</option>`).join('');
    };
    bodegaSelect.addEventListener('change', renderUbicaciones);
    loteSelect.addEventListener('change', () => {
        const lote = iptLotesCache.find((l) => String(l.id) === String(loteSelect.value));
        const fecha = document.getElementById('iptF_fecha');
        if (lote && !fecha.value) fecha.value = (lote.fecha_produccion || '').slice(0, 10);
    });
    renderUbicaciones();
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.lote_id || !values.bodega_id || !values.cantidad || !values.fecha) {
            iptNotify('Entrada', 'Lote, bodega, cantidad y fecha son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/entradas`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Entrada', 'Entrada registrada correctamente.', 'success');
            iptLoadEntradas();
        } catch (error) {
            iptNotify('Entrada', error.message, 'danger');
        }
    });
}

// ── EXISTENCIAS ────────────────────────────────────────────────────────

async function iptLoadExistencias() {
    try {
        const q = document.getElementById('iptExistBusqueda').value.trim();
        const bodegaId = document.getElementById('iptExistBodega').value;
        const params = new URLSearchParams({ limit: '300' });
        if (bodegaId) params.set('bodega_id', bodegaId);
        const payload = await iptApi(`${API}/existencias?${params.toString()}`);
        let items = iptRows(payload);
        iptCatalogo.existencias = items;
        if (q) {
            items = items.filter((e) => [e.product_code, e.product_name, e.codigo_lote, e.order_code, e.bodega_nombre, e.cliente_nombre].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptExistBody').innerHTML = items.length ? items.map((e) => `
            <tr>
                <td>${iptEscape(e.product_code || '')} ${iptEscape(e.product_name || '')}</td>
                <td>${iptEscape(e.codigo_lote || '')}</td>
                <td>${iptEscape(e.order_code || '')}</td>
                <td>${iptEscape(e.bodega_nombre || '')}</td>
                <td>${iptEscape(e.ubicacion_nombre || e.codigo_ubicacion || '—')}</td>
                <td class="num">${iptNum(e.cantidad_fisica)}</td>
                <td class="num">${iptNum(e.cantidad_reservada)}</td>
                <td class="num">${iptNum(e.cantidad_bloqueada)}</td>
                <td class="num">${iptNum(e.cantidad_en_despacho)}</td>
                <td class="num"><strong>${iptNum(e.cantidad_disponible)}</strong></td>
                <td>${iptEscape(e.unidad_inventario || '')}</td>
                <td>${iptBadge(e.estado)}</td>
                <td><div class="row-actions">
                    <button data-action="ajustar" data-id="${e.id}">Ajustar</button>
                    <button data-action="bloquear" data-id="${e.id}">Bloquear</button>
                    ${Number(e.cantidad_bloqueada) > 0 ? `<button data-action="desbloquear" data-id="${e.id}">Desbloquear</button>` : ''}
                    <button data-action="transferir" data-id="${e.id}">Transferir</button>
                </div></td>
            </tr>`).join('') : '<tr><td colspan="13" class="ipt-empty">Sin existencias registradas.</td></tr>';
    } catch (error) {
        document.getElementById('iptExistBody').innerHTML = `<tr><td colspan="13" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenExistenciaAjustar(existencia, accion) {
    const esPositivo = accion === 'ajustar';
    const fields = [
        { name: 'tipo', label: 'Tipo de Ajuste', type: 'select', options: [{ value: 'AJUSTE_POSITIVO', label: 'Ajuste Positivo (incremento)' }, { value: 'AJUSTE_NEGATIVO', label: 'Ajuste Negativo (decremento)' }] },
        { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'motivo', label: 'Motivo', type: 'textarea', full: true, required: true, placeholder: esPositivo ? '' : 'Mínimo 5 caracteres (obligatorio para ajustes negativos)' }
    ];
    iptOpenModal(`Ajustar Existencia (${existencia.product_code || ''} — Lote ${existencia.codigo_lote || ''})`, iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.cantidad || !values.motivo || String(values.motivo).trim().length < 5) {
            iptNotify('Ajuste', 'Cantidad y motivo (mínimo 5 caracteres) son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/existencias/${existencia.id}/ajustar`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Ajuste', 'Ajuste aplicado.', 'success');
            iptLoadExistencias();
        } catch (error) {
            iptNotify('Ajuste', error.message, 'danger');
        }
    });
}

function iptOpenExistenciaBloquear(existencia, accion) {
    const fields = [
        { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'motivo', label: 'Motivo', type: 'textarea', full: true, required: true }
    ];
    iptOpenModal(`${accion === 'bloquear' ? 'Bloquear' : 'Desbloquear'} Cantidad (${existencia.product_code || ''} — Lote ${existencia.codigo_lote || ''})`, iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.cantidad || !values.motivo) {
            iptNotify('Bloqueo', 'Cantidad y motivo son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/existencias/${existencia.id}/${accion}`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Existencia', accion === 'bloquear' ? 'Cantidad bloqueada.' : 'Cantidad desbloqueada.', 'success');
            iptLoadExistencias();
        } catch (error) {
            iptNotify('Existencia', error.message, 'danger');
        }
    });
}

function iptOpenTransferencia(origen) {
    const fields = [
        { name: 'inventario_pt_id', label: 'Origen', type: 'select', options: iptExistenciaOptions(true), required: true, value: origen ? origen.id : '' },
        { name: 'bodega_destino_id', label: 'Bodega Destino', type: 'select', options: iptCatalogo.bodegas.map((b) => ({ value: b.id, label: `${b.codigo_bodega} — ${b.nombre}` })), required: true },
        { name: 'ubicacion_destino_id', label: 'Ubicación Destino', type: 'select', options: [], placeholder: 'Sin ubicación específica' },
        { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'motivo', label: 'Motivo', type: 'textarea', full: true, required: true }
    ];
    iptOpenModal('Transferencia entre Bodegas', iptFormHtml(fields), iptModalFoot(['close', 'save']));
    const bodegaSelect = document.getElementById('iptF_bodega_destino_id');
    const ubicacionSelect = document.getElementById('iptF_ubicacion_destino_id');
    const renderUbicaciones = () => {
        const bodega = iptCatalogo.bodegas.find((b) => String(b.id) === String(bodegaSelect.value));
        const opciones = (bodega?.ubicaciones || []).filter((u) => u.activo).map((u) => ({ value: u.id, label: `${u.codigo_ubicacion} — ${u.nombre || ''}` }));
        ubicacionSelect.innerHTML = '<option value="">Sin ubicación específica</option>' + opciones.map((o) => `<option value="${o.value}">${iptEscape(o.label)}</option>`).join('');
    };
    bodegaSelect.addEventListener('change', renderUbicaciones);
    renderUbicaciones();
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.inventario_pt_id || !values.bodega_destino_id || !values.cantidad || !values.motivo) {
            iptNotify('Transferencia', 'Origen, destino, cantidad y motivo son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/transferencias`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Transferencia', 'Transferencia completada.', 'success');
            iptLoadExistencias();
        } catch (error) {
            iptNotify('Transferencia', error.message, 'danger');
        }
    });
}

// ── RESERVAS ───────────────────────────────────────────────────────────

async function iptLoadReservas() {
    try {
        const q = document.getElementById('iptReservaBusqueda').value.trim();
        const estado = document.getElementById('iptReservaEstado').value;
        const params = new URLSearchParams({ limit: '300' });
        if (estado) params.set('estado', estado);
        const payload = await iptApi(`${API}/reservas?${params.toString()}`);
        let items = iptRows(payload);
        if (q) {
            items = items.filter((r) => [r.numero_reserva, r.codigo_lote, r.product_code, r.product_name, r.cliente_nombre].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptReservaBody').innerHTML = items.length ? items.map((r) => `
            <tr>
                <td><strong>${iptEscape(r.numero_reserva)}</strong></td>
                <td>${iptEscape(r.product_code || '')} ${iptEscape(r.product_name || '')}</td>
                <td>${iptEscape(r.codigo_lote || '')}</td>
                <td>${iptEscape(r.cliente_nombre || '—')}</td>
                <td class="num">${iptNum(r.cantidad_reservada)}</td>
                <td>${iptEscape(r.unidad || '')}</td>
                <td>${iptEscape(iptDate(r.fecha_reserva))}</td>
                <td>${r.fecha_expiracion ? iptEscape(iptDate(r.fecha_expiracion)) : '—'}</td>
                <td>${iptBadge(r.estado)}</td>
                <td><div class="row-actions">
                    ${['ACTIVA', 'PARCIAL'].includes(r.estado) ? `<button data-action="liberar" data-id="${r.id}">Liberar</button><button data-action="cancelar" data-id="${r.id}">Cancelar</button>` : ''}
                </div></td>
            </tr>`).join('') : '<tr><td colspan="10" class="ipt-empty">Sin reservas registradas.</td></tr>';
    } catch (error) {
        document.getElementById('iptReservaBody').innerHTML = `<tr><td colspan="10" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenReservaNueva() {
    const fields = [
        { name: 'inventario_pt_id', label: 'Existencia (disponible)', type: 'select', options: iptExistenciaOptions(true), required: true },
        { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0.0001, step: '0.0001', required: true },
        { name: 'cliente_id', label: 'Cliente', type: 'select', options: iptCatalogo.clientes.map((c) => ({ value: c.id, label: `${c.partner_code || ''} — ${c.partner_name || ''}` })) },
        { name: 'pedido_id', label: 'Pedido / Orden', type: 'select', options: iptCatalogo.ordenes.map((o) => ({ value: o.id, label: `${o.order_code} — ${o.product_code || ''}` })) },
        { name: 'fecha_expiracion', label: 'Fecha de Expiración', type: 'date' },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true }
    ];
    iptOpenModal('Nueva Reserva', iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.inventario_pt_id || !values.cantidad) {
            iptNotify('Reserva', 'Existencia y cantidad son obligatorias.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/reservas`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Reserva', 'Reserva creada.', 'success');
            iptLoadReservas();
        } catch (error) {
            iptNotify('Reserva', error.message, 'danger');
        }
    });
}

async function iptReservaAction(id, accion) {
    if (!iptConfirm(`¿${accion === 'liberar' ? 'Liberar' : 'Cancelar'} la reserva?`)) return;
    try {
        await iptApi(`${API}/reservas/${id}/${accion}`, { method: 'POST', body: '{}' });
        iptNotify('Reserva', accion === 'liberar' ? 'Reserva liberada.' : 'Reserva cancelada.', 'success');
        iptLoadReservas();
    } catch (error) {
        iptNotify('Reserva', error.message, 'danger');
    }
}

// ── SOLICITUDES ────────────────────────────────────────────────────────

async function iptLoadSolicitudes() {
    try {
        const q = document.getElementById('iptSolicitudBusqueda').value.trim();
        const estado = document.getElementById('iptSolicitudEstado').value;
        const params = new URLSearchParams({ limit: '200' });
        if (estado) params.set('estado', estado);
        const payload = await iptApi(`${API}/solicitudes?${params.toString()}`);
        let items = iptRows(payload);
        iptSolicitudesCache = items;
        if (q) {
            items = items.filter((s) => [s.numero_solicitud, s.cliente_nombre, s.transportista].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptSolicitudBody').innerHTML = items.length ? items.map((s) => `
            <tr>
                <td><strong>${iptEscape(s.numero_solicitud)}</strong></td>
                <td>${iptEscape(s.cliente_nombre || '—')}</td>
                <td>${iptEscape(s.bodega_nombre || '—')}</td>
                <td>${s.fecha_programada ? iptEscape(iptDate(s.fecha_programada)) : '—'}</td>
                <td>${iptEscape(s.transportista || '—')}</td>
                <td>${iptBadge(s.estado)}</td>
                <td><div class="row-actions">
                    <button data-action="detalle" data-id="${s.id}">Detalle</button>
                    ${s.estado === 'BORRADOR' ? `<button data-action="pendiente" data-id="${s.id}">Enviar</button>` : ''}
                    ${s.estado === 'PENDIENTE' ? `<button data-action="aprobar" data-id="${s.id}">Aprobar</button>` : ''}
                    ${['PENDIENTE', 'BORRADOR'].includes(s.estado) ? `<button data-action="cancelar" data-id="${s.id}">Cancelar</button>` : ''}
                    ${['APROBADA'].includes(s.estado) ? `<button data-action="reservar" data-id="${s.id}">Reservar</button>` : ''}
                </div></td>
            </tr>`).join('') : '<tr><td colspan="7" class="ipt-empty">Sin solicitudes registradas.</td></tr>';
    } catch (error) {
        document.getElementById('iptSolicitudBody').innerHTML = `<tr><td colspan="7" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenSolicitudNueva() {
    const lineasHtml = () => `
        <div class="ipt-lineas" id="iptLineas">
            <div class="ipt-linea">
                <select class="iptLineaProducto"><option value="">Producto...</option>${iptProductoOptions().map((o) => `<option value="${o.value}">${iptEscape(o.label)}</option>`).join('')}</select>
                <input type="number" class="iptLineaCantidad" min="0.0001" step="0.0001" placeholder="Cantidad">
                <button type="button" class="ipt-btn ghost iptLineaDel" title="Quitar línea">×</button>
            </div>
        </div>`;
    const fields = [
        { name: 'cliente_id', label: 'Cliente', type: 'select', options: iptCatalogo.clientes.map((c) => ({ value: c.id, label: `${c.partner_code || ''} — ${c.partner_name || ''}` })) },
        { name: 'bodega_id', label: 'Bodega', type: 'select', options: iptCatalogo.bodegas.map((b) => ({ value: b.id, label: `${b.codigo_bodega} — ${b.nombre}` })) },
        { name: 'fecha_programada', label: 'Fecha Programada', type: 'date' },
        { name: 'transportista', label: 'Transportista', type: 'text' },
        { name: 'direccion_entrega', label: 'Dirección de Entrega', type: 'text', full: true },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true }
    ];
    iptOpenModal('Nueva Solicitud de Despacho', iptFormHtml(fields) + `<div class="ipt-sub-section">Líneas</div>${lineasHtml()}`, iptModalFoot(['close', 'save']));
    const lineasWrap = document.getElementById('iptLineas');
    const addLinea = () => {
        const fila = document.createElement('div');
        fila.className = 'ipt-linea';
        fila.innerHTML = `<select class="iptLineaProducto"><option value="">Producto...</option>${iptProductoOptions().map((o) => `<option value="${o.value}">${iptEscape(o.label)}</option>`).join('')}</select><input type="number" class="iptLineaCantidad" min="0.0001" step="0.0001" placeholder="Cantidad"><button type="button" class="ipt-btn ghost iptLineaDel" title="Quitar línea">×</button>`;
        lineasWrap.appendChild(fila);
    };
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'ipt-btn ghost';
    addBtn.textContent = '+ Agregar línea';
    addBtn.style.marginTop = '6px';
    lineasWrap.after(addBtn);
    addBtn.addEventListener('click', addLinea);
    lineasWrap.addEventListener('click', (event) => {
        const del = event.target.closest('.iptLineaDel');
        if (del && lineasWrap.children.length > 1) del.closest('.ipt-linea').remove();
    });
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        const lineas = [];
        document.querySelectorAll('.ipt-linea').forEach((fila) => {
            const producto = fila.querySelector('.iptLineaProducto').value;
            const cantidad = Number(fila.querySelector('.iptLineaCantidad').value || 0);
            if (producto && cantidad > 0) lineas.push({ producto_id: producto, cantidad_solicitada: cantidad, unidad: 'UN' });
        });
        if (!lineas.length) {
            iptNotify('Solicitud', 'Debe agregar al menos una línea con producto y cantidad.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/solicitudes`, { method: 'POST', body: JSON.stringify({ ...values, lineas }) });
            iptCloseModal();
            iptNotify('Solicitud', 'Solicitud creada en estado BORRADOR.', 'success');
            iptLoadSolicitudes();
        } catch (error) {
            iptNotify('Solicitud', error.message, 'danger');
        }
    });
}

async function iptOpenSolicitudDetalle(solicitud) {
    try {
        const detalle = await iptApi(`${API}/solicitudes/${solicitud.id}`);
        const lineas = detalle.detalle || [];
        iptOpenModal(`Solicitud ${detalle.numero_solicitud}`, `
            <div class="ipt-detail-grid">
                <div><span>Cliente</span><span>${iptEscape(detalle.cliente_nombre || '—')}</span></div>
                <div><span>Bodega</span><span>${iptEscape(detalle.bodega_nombre || '—')}</span></div>
                <div><span>Fecha Programada</span><span>${detalle.fecha_programada ? iptEscape(iptDate(detalle.fecha_programada)) : '—'}</span></div>
                <div><span>Transportista</span><span>${iptEscape(detalle.transportista || '—')}</span></div>
                <div><span>Dirección</span><span>${iptEscape(detalle.direccion_entrega || '—')}</span></div>
                <div><span>Estado</span><span>${iptBadge(detalle.estado)}</span></div>
            </div>
            <div class="ipt-sub-section">Líneas</div>
            <div class="ipt-tbl-wrap"><table class="ipt-table"><thead><tr><th>Producto</th><th>Lote</th><th class="num">Solicitada</th><th class="num">Reservada</th><th class="num">Preparada</th><th class="num">Despachada</th><th>Reserva</th></tr></thead><tbody>
                ${lineas.length ? lineas.map((l) => `<tr><td>${iptEscape(l.product_code || '')} ${iptEscape(l.product_name || '')}</td><td>${iptEscape(l.codigo_lote || '—')}</td><td class="num">${iptNum(l.cantidad_solicitada)}</td><td class="num">${iptNum(l.cantidad_reservada)}</td><td class="num">${iptNum(l.cantidad_preparada)}</td><td class="num">${iptNum(l.cantidad_despachada)}</td><td>${iptEscape(l.numero_reserva || '—')}</td></tr>`).join('') : '<tr><td colspan="7" class="ipt-empty">Sin líneas.</td></tr>'}
            </tbody></table></div>
        `, iptModalFoot(['close']));
    } catch (error) {
        iptNotify('Solicitud', error.message, 'danger');
    }
}

async function iptSolicitudAction(solicitud, accion) {
    if (accion === 'detalle') return iptOpenSolicitudDetalle(solicitud);
    if (accion === 'reservar') {
        if (!iptConfirm(`¿Reservar inventario para ${solicitud.numero_solicitud}?`)) return;
        try {
            await iptApi(`${API}/solicitudes/${solicitud.id}/reservar`, { method: 'POST', body: '{}' });
            iptNotify('Solicitud', 'Inventario reservado.', 'success');
            return iptLoadSolicitudes();
        } catch (error) {
            return iptNotify('Solicitud', error.message, 'danger');
        }
    }
    const estados = { pendiente: 'PENDIENTE', aprobar: 'APROBADA', cancelar: 'CANCELADA' };
    const destino = estados[accion];
    if (!destino) return;
    try {
        await iptApi(`${API}/solicitudes/${solicitud.id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: destino }) });
        iptNotify('Solicitud', `Solicitud movida a ${destino}.`, 'success');
        iptLoadSolicitudes();
    } catch (error) {
        iptNotify('Solicitud', error.message, 'danger');
    }
}

// ── DESPACHOS ──────────────────────────────────────────────────────────

async function iptLoadDespachos() {
    try {
        const q = document.getElementById('iptDespachoBusqueda').value.trim();
        const payload = await iptApi(`${API}/despachos?limit=200`);
        let items = iptRows(payload);
        iptDespachosCache = items;
        if (q) {
            items = items.filter((d) => [d.numero_despacho, d.cliente_nombre, d.transportista, d.numero_guia, d.numero_solicitud].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptDespachoBody').innerHTML = items.length ? items.map((d) => `
            <tr>
                <td><strong>${iptEscape(d.numero_despacho)}</strong></td>
                <td>${iptEscape(d.numero_solicitud || '—')}</td>
                <td>${iptEscape(d.cliente_nombre || '—')}</td>
                <td>${iptEscape(d.transportista || '—')}</td>
                <td>${iptEscape(d.numero_guia || '—')}</td>
                <td>${iptEscape(iptDateTime(d.fecha_despacho))}</td>
                <td>${d.fecha_confirmacion ? iptEscape(iptDateTime(d.fecha_confirmacion)) : '—'}</td>
                <td>${iptBadge(d.estado)}</td>
                <td><div class="row-actions">
                    <button data-action="detalle" data-id="${d.id}">Detalle</button>
                    ${['EN_PREPARACION', 'DESPACHADO_PARCIAL'].includes(d.estado) ? `<button data-action="confirmar" data-id="${d.id}">Confirmar</button>` : ''}
                    ${['EN_PREPARACION'].includes(d.estado) ? `<button data-action="cancelar" data-id="${d.id}">Cancelar</button>` : ''}
                    ${d.estado === 'DESPACHADO' ? `<button data-action="reversar" data-id="${d.id}">Reversar</button>` : ''}
                    <button data-action="sap" data-id="${d.id}">Enviar SAP</button>
                </div></td>
            </tr>`).join('') : '<tr><td colspan="9" class="ipt-empty">Sin despachos registrados.</td></tr>';
    } catch (error) {
        document.getElementById('iptDespachoBody').innerHTML = `<tr><td colspan="9" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenDespachoNuevo() {
    const solicitudesAptas = iptSolicitudesCache.filter((s) => ['RESERVADA', 'EN_PREPARACION', 'PREPARADA', 'APROBADA'].includes(s.estado));
    const fields = [
        { name: 'solicitud_id', label: 'Solicitud', type: 'select', options: solicitudesAptas.map((s) => ({ value: s.id, label: `${s.numero_solicitud} — ${s.cliente_nombre || ''}` })), required: true },
        { name: 'transportista', label: 'Transportista', type: 'text' },
        { name: 'vehiculo', label: 'Vehículo', type: 'text' },
        { name: 'numero_guia', label: 'Número de Guía', type: 'text' },
        { name: 'direccion_entrega', label: 'Dirección de Entrega', type: 'text', full: true },
        { name: 'autorizar_sin_reserva', label: 'Autorizar sin reserva', type: 'checkbox' }
    ];
    iptOpenModal('Nuevo Despacho', iptFormHtml(fields) + `<div class="ipt-sub-section">Nota</div><p style="font-size:12px;color:#7a8fa3">Se despachan las líneas completas de la solicitud. Para despachos parciales ajuste las cantidades desde el detalle de la solicitud.</p>`, iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.solicitud_id) {
            iptNotify('Despacho', 'Debe seleccionar una solicitud.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/despachos`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Despacho', 'Despacho creado en preparación.', 'success');
            iptLoadDespachos();
        } catch (error) {
            iptNotify('Despacho', error.message, 'danger');
        }
    });
}

async function iptOpenDespachoDetalle(despacho) {
    try {
        const detalle = await iptApi(`${API}/despachos/${despacho.id}`);
        const lineas = detalle.detalle || [];
        iptOpenModal(`Despacho ${detalle.numero_despacho}`, `
            <div class="ipt-detail-grid">
                <div><span>Solicitud</span><span>${iptEscape(detalle.numero_solicitud || '—')}</span></div>
                <div><span>Cliente</span><span>${iptEscape(detalle.cliente_nombre || '—')}</span></div>
                <div><span>Transportista</span><span>${iptEscape(detalle.transportista || '—')}</span></div>
                <div><span>Guía</span><span>${iptEscape(detalle.numero_guia || '—')}</span></div>
                <div><span>Dirección</span><span>${iptEscape(detalle.direccion_entrega || '—')}</span></div>
                <div><span>Estado</span><span>${iptBadge(detalle.estado)}</span></div>
            </div>
            <div class="ipt-sub-section">Líneas</div>
            <div class="ipt-tbl-wrap"><table class="ipt-table"><thead><tr><th>Producto</th><th>Lote</th><th class="num">Cantidad</th><th>Unidad</th></tr></thead><tbody>
                ${lineas.length ? lineas.map((l) => `<tr><td>${iptEscape(l.product_code || '')} ${iptEscape(l.product_name || '')}</td><td>${iptEscape(l.codigo_lote || '—')}</td><td class="num">${iptNum(l.cantidad_despachada)}</td><td>${iptEscape(l.unidad || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="ipt-empty">Sin líneas.</td></tr>'}
            </tbody></table></div>
        `, iptModalFoot(['close']));
    } catch (error) {
        iptNotify('Despacho', error.message, 'danger');
    }
}

async function iptDespachoAction(despacho, accion) {
    if (accion === 'detalle') return iptOpenDespachoDetalle(despacho);
    const confirmaciones = {
        confirmar: '¿Confirmar la salida física del despacho?',
        cancelar: '¿Cancelar el despacho?',
        reversar: '¿Reversar el despacho (requiere motivo)? Esta acción revierte la confirmación.'
    };
    let body = '{}';
    if (accion === 'reversar') {
        const motivo = prompt('Motivo de la reversión:');
        if (!motivo || !motivo.trim()) return;
        body = JSON.stringify({ motivo: motivo.trim() });
    }
    if (!iptConfirm(confirmaciones[accion])) return;
    try {
        await iptApi(`${API}/despachos/${despacho.id}/${accion}`, { method: 'POST', body });
        iptNotify('Despacho', 'Operación completada.', 'success');
        iptLoadDespachos();
    } catch (error) {
        iptNotify('Despacho', error.message, 'danger');
    }
}

async function iptEnviarSap(despacho) {
    if (!iptConfirm(`¿Enviar ${despacho.numero_despacho} a SAP (salida de inventario)?`)) return;
    try {
        const resultado = await iptApi(`${API}/sap/enviar`, { method: 'POST', body: JSON.stringify({ despacho_id: despacho.id }) });
        iptNotify('SAP', resultado.total_enviadas ? `${resultado.total_enviadas} línea(s) enviada(s).` : 'Ninguna línea enviada.', resultado.total_enviadas ? 'success' : 'warning');
    } catch (error) {
        iptNotify('SAP', error.message, 'danger');
    }
}

async function iptOpenIntegraciones() {
    try {
        const payload = await iptApi(`${API}/sap/integraciones?limit=200`);
        const items = iptRows(payload);
        const head = '<tr><th>Operación</th><th>Despacho</th><th>Producto</th><th>Lote</th><th class="num">Cantidad</th><th>Estado</th><th class="num">Intentos</th><th>DocEntry</th><th>Lote SAP</th><th>Mensaje</th><th>Acciones</th></tr>';
        const body = items.length ? items.map((i) => `
            <tr>
                <td>${iptEscape(i.tipo_documento_sap || '')}<div style="font-size:10px;color:#7a8fa3">${iptEscape((i.operacion_uuid || '').slice(0, 8))}</div></td>
                <td>${iptEscape(i.numero_despacho || '')}</td>
                <td>${iptEscape(i.product_code || '')}</td>
                <td>${iptEscape(i.codigo_lote || '')}</td>
                <td class="num">${iptNum(i.cantidad_enviada)}</td>
                <td>${iptBadge(i.estado)}</td>
                <td class="num">${i.intentos || 0}</td>
                <td>${i.sap_doc_entry != null ? iptEscape(String(i.sap_doc_entry)) : '—'}</td>
                <td>${iptEscape(i.sap_batch_number || '—')}</td>
                <td style="max-width:220px;white-space:normal">${iptEscape((i.mensaje_respuesta || '').slice(0, 120))}</td>
                <td><div class="row-actions">
                    <button data-action="payload" data-id="${i.id}">Payload</button>
                    ${['ERROR', 'PENDIENTE', 'REINTENTO_PROGRAMADO'].includes(i.estado) ? `<button data-action="reintentar" data-id="${i.id}">Reintentar</button><button data-action="cancelar" data-id="${i.id}">Cancelar</button>` : ''}
                </div></td>
            </tr>`).join('') : '<tr><td colspan="11" class="ipt-empty">Sin integraciones registradas.</td></tr>';
        iptOpenModal('Integraciones SAP', `<div class="ipt-tbl-wrap"><table class="ipt-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`, iptModalFoot(['close']));
        document.querySelectorAll('#iptModalBody [data-action]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const accion = btn.dataset.action;
                const integracion = items.find((i) => String(i.id) === btn.dataset.id);
                if (!integracion) return;
                if (accion === 'payload') {
                    try {
                        const p = await iptApi(`${API}/sap/${integracion.id}/payload`);
                        iptOpenModal('Payload SAP', `<pre style="background:#f4f7fa;border-radius:10px;padding:12px;font-size:11.5px;overflow:auto;white-space:pre-wrap">${iptEscape(JSON.stringify(p.payload || p, null, 2))}</pre>`, iptModalFoot(['close']));
                    } catch (error) {
                        iptNotify('SAP', error.message, 'danger');
                    }
                } else {
                    if (!iptConfirm(accion === 'reintentar' ? '¿Reintentar el envío a SAP?' : '¿Cancelar la integración?')) return;
                    try {
                        await iptApi(`${API}/sap/${integracion.id}/${accion}`, { method: 'POST', body: '{}' });
                        iptNotify('SAP', accion === 'reintentar' ? 'Reintento programado.' : 'Integración cancelada.', 'success');
                        iptOpenIntegraciones();
                    } catch (error) {
                        iptNotify('SAP', error.message, 'danger');
                    }
                }
            });
        });
    } catch (error) {
        iptNotify('SAP', error.message, 'danger');
    }
}

// ── MOVIMIENTOS ────────────────────────────────────────────────────────

async function iptLoadMovimientos() {
    try {
        const q = document.getElementById('iptMovBusqueda').value.trim();
        const tipo = document.getElementById('iptMovTipo').value;
        const params = new URLSearchParams({ limit: '300' });
        if (tipo) params.set('tipo', tipo);
        const payload = await iptApi(`${API}/movimientos?${params.toString()}`);
        let items = iptRows(payload);
        if (q) {
            items = items.filter((m) => [m.product_code, m.product_name, m.codigo_lote, m.referencia_externa, m.motivo].some((v) => String(v || '').toLowerCase().includes(q.toLowerCase())));
        }
        document.getElementById('iptMovBody').innerHTML = items.length ? items.map((m) => `
            <tr>
                <td>${iptEscape(iptDateTime(m.fecha_movimiento))}</td>
                <td>${iptBadge(m.tipo_movimiento)}</td>
                <td>${iptEscape(m.product_code || '')} ${iptEscape(m.product_name || '')}</td>
                <td>${iptEscape(m.codigo_lote || '')}</td>
                <td class="num">${iptNum(m.cantidad)}</td>
                <td>${iptEscape(m.unidad || '')}</td>
                <td>${iptEscape(m.documento_tipo || '')}</td>
                <td>${iptEscape(m.referencia_externa || '')}</td>
                <td>${iptEscape(m.motivo || '')}</td>
            </tr>`).join('') : '<tr><td colspan="9" class="ipt-empty">Sin movimientos registrados.</td></tr>';
    } catch (error) {
        document.getElementById('iptMovBody').innerHTML = `<tr><td colspan="9" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

// ── REPORTES ───────────────────────────────────────────────────────────

async function iptCargarReporte() {
    const tipo = document.getElementById('iptReporteTipo').value;
    const filtro = document.getElementById('iptReporteFiltro').value;
    const params = new URLSearchParams();
    if (filtro) {
        if (tipo === 'trazabilidad_lote') params.set('lote_id', filtro);
    }
    try {
        const payload = await iptApi(`${API}/reportes/${tipo}?${params.toString()}`);
        const columnas = payload.columnas || [];
        const filas = payload.filas || [];
        document.getElementById('iptReporteHead').innerHTML = `<tr>${columnas.map((c) => `<th>${iptEscape(c)}</th>`).join('')}</tr>`;
        document.getElementById('iptReporteBody').innerHTML = filas.length
            ? filas.map((fila) => `<tr>${columnas.map((c) => `<td>${iptEscape(fila[c] != null ? fila[c] : '')}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${columnas.length || 1}" class="ipt-empty">Sin datos para este reporte.</td></tr>`;
        window.__iptUltimoReporte = { tipo, params: params.toString() };
    } catch (error) {
        document.getElementById('iptReporteBody').innerHTML = `<tr><td class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

async function iptActualizarFiltroReporte() {
    const tipo = document.getElementById('iptReporteTipo').value;
    const filtro = document.getElementById('iptReporteFiltro');
    if (tipo === 'trazabilidad_lote') {
        filtro.hidden = false;
        filtro.innerHTML = '<option value="">Seleccione lote...</option>' + iptLoteOptions(null).map((o) => `<option value="${o.value}">${iptEscape(o.label)}</option>`).join('');
    } else {
        filtro.hidden = true;
        filtro.innerHTML = '';
    }
    if (filtro.hidden) await iptCargarReporte();
}

async function iptExportarReporte(formato) {
    const ultimo = window.__iptUltimoReporte;
    if (!ultimo) {
        iptNotify('Reporte', 'Genere el reporte primero.', 'warning');
        return;
    }
    try {
        const url = `${API}/reportes/${ultimo.tipo}/exportar?formato=${formato}${ultimo.params ? '&' + ultimo.params : ''}`;
        const response = await fetch(url, { headers: iptHeaders() });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'No fue posible exportar el reporte.');
        }
        const blob = await response.blob();
        const nombre = (response.headers.get('Content-Disposition') || '').match(/filename="?([^";]+)"?/i);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombre ? nombre[1] : `reporte-${ultimo.tipo}.${formato === 'xlsx' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (error) {
        iptNotify('Reporte', error.message, 'danger');
    }
}

// ── BODEGAS ────────────────────────────────────────────────────────────

async function iptLoadBodegas() {
    try {
        const payload = await iptApi(`${API}/bodegas`);
        const items = iptRows(payload);
        document.getElementById('iptBodegaBody').innerHTML = items.length ? items.map((b) => `
            <tr>
                <td><strong>${iptEscape(b.codigo_bodega || '—')}</strong></td>
                <td>${iptEscape(b.nombre || '')}</td>
                <td>${iptEscape(b.codigo_sap || '—')}</td>
                <td>${iptEscape(b.ubicacion || '—')}</td>
                <td>${b.activo ? '<span class="badge ok">Activa</span>' : '<span class="badge mut">Inactiva</span>'}</td>
                <td>${(b.ubicaciones || []).map((u) => `${iptEscape(u.codigo_ubicacion)}${u.activo ? '' : ' (inactiva)'}`).join(', ') || '—'}</td>
                <td><div class="row-actions">
                    <button data-action="editar" data-id="${b.id}">Editar</button>
                    <button data-action="ubicacion" data-id="${b.id}">+ Ubicación</button>
                </div></td>
            </tr>`).join('') : '<tr><td colspan="7" class="ipt-empty">Sin bodegas registradas.</td></tr>';
    } catch (error) {
        document.getElementById('iptBodegaBody').innerHTML = `<tr><td colspan="7" class="ipt-empty">${iptEscape(error.message)}</td></tr>`;
    }
}

function iptOpenBodegaNueva() {
    const fields = [
        { name: 'codigo_bodega', label: 'Código de Bodega', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'codigo_sap', label: 'Código SAP', type: 'text' },
        { name: 'ubicacion', label: 'Ubicación Física', type: 'text' }
    ];
    iptOpenModal('Nueva Bodega', iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.codigo_bodega || !values.nombre) {
            iptNotify('Bodega', 'Código y nombre son obligatorios.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/bodegas`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Bodega', 'Bodega creada.', 'success');
            iptLoadBodegas();
            iptLoadCatalogos();
        } catch (error) {
            iptNotify('Bodega', error.message, 'danger');
        }
    });
}

async function iptOpenBodegaEditar(bodega) {
    const fields = [
        { name: 'codigo_bodega', label: 'Código de Bodega', type: 'text', required: true, value: bodega.codigo_bodega || '' },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true, value: bodega.nombre || '' },
        { name: 'codigo_sap', label: 'Código SAP', type: 'text', value: bodega.codigo_sap || '' },
        { name: 'ubicacion', label: 'Ubicación Física', type: 'text', value: bodega.ubicacion || '' },
        { name: 'activo', label: 'Activa', type: 'checkbox', value: bodega.activo !== false }
    ];
    iptOpenModal(`Editar Bodega ${bodega.codigo_bodega || ''}`, iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        try {
            await iptApi(`${API}/bodegas/${bodega.id}`, { method: 'PATCH', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Bodega', 'Bodega actualizada.', 'success');
            iptLoadBodegas();
            iptLoadCatalogos();
        } catch (error) {
            iptNotify('Bodega', error.message, 'danger');
        }
    });
}

async function iptOpenBodegaUbicacion(bodega) {
    const fields = [
        { name: 'codigo_ubicacion', label: 'Código de Ubicación', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text' }
    ];
    iptOpenModal(`Nueva Ubicación en ${bodega.nombre || ''}`, iptFormHtml(fields), iptModalFoot(['close', 'save']));
    document.getElementById('iptModalSave').addEventListener('click', async () => {
        const values = iptFormValues(fields);
        if (!values.codigo_ubicacion) {
            iptNotify('Ubicación', 'El código de ubicación es obligatorio.', 'warning');
            return;
        }
        try {
            await iptApi(`${API}/bodegas/${bodega.id}/ubicaciones`, { method: 'POST', body: JSON.stringify(values) });
            iptCloseModal();
            iptNotify('Ubicación', 'Ubicación creada.', 'success');
            iptLoadBodegas();
        } catch (error) {
            iptNotify('Ubicación', error.message, 'danger');
        }
    });
}

// ── EVENTOS ────────────────────────────────────────────────────────────

document.getElementById('iptTabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.ipt-tab');
    if (btn) iptSwitchTab(btn.dataset.panel);
});

document.getElementById('iptRefreshBtn').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.classList.add('is-loading');
    btn.disabled = true;
    try {
        await iptLoadCatalogos();
        const active = document.querySelector('.ipt-tab.is-active')?.dataset.panel || 'resumen';
        iptSwitchTab(active);
    } finally {
        btn.classList.remove('is-loading');
        btn.disabled = false;
    }
});

document.getElementById('iptModalClose').addEventListener('click', iptCloseModal);
document.getElementById('iptModalBackdrop').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) iptCloseModal();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') iptCloseModal();
});

document.getElementById('iptLotesBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const lote = iptLotesCache.find((l) => String(l.id) === btn.dataset.id);
    if (lote) iptLoteAction(btn.dataset.action, lote);
});

document.getElementById('iptExistBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const existencia = iptCatalogo.existencias.find((e) => String(e.id) === btn.dataset.id);
    if (!existencia) return;
    if (btn.dataset.action === 'ajustar') iptOpenExistenciaAjustar(existencia, 'ajustar');
    if (btn.dataset.action === 'bloquear') iptOpenExistenciaBloquear(existencia, 'bloquear');
    if (btn.dataset.action === 'desbloquear') iptOpenExistenciaBloquear(existencia, 'desbloquear');
    if (btn.dataset.action === 'transferir') iptOpenTransferencia(existencia);
});

document.getElementById('iptReservaBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (btn) iptReservaAction(btn.dataset.id, btn.dataset.action);
});

document.getElementById('iptSolicitudBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const solicitud = iptSolicitudesCache.find((s) => String(s.id) === btn.dataset.id);
    if (solicitud) iptSolicitudAction(solicitud, btn.dataset.action);
});

document.getElementById('iptDespachoBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const despacho = iptDespachosCache.find((d) => String(d.id) === btn.dataset.id);
    if (!despacho) return;
    if (btn.dataset.action === 'sap') iptEnviarSap(despacho);
    else iptDespachoAction(despacho, btn.dataset.action);
});

document.getElementById('iptBodegaBody').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const bodega = iptCatalogo.bodegas.find((b) => String(b.id) === btn.dataset.id);
    if (!bodega) return;
    if (btn.dataset.action === 'editar') iptOpenBodegaEditar(bodega);
    if (btn.dataset.action === 'ubicacion') iptOpenBodegaUbicacion(bodega);
});

const inputIds = ['iptLotesBusqueda', 'iptLotesEstado', 'iptEntradasBusqueda', 'iptExistBusqueda', 'iptReservaBusqueda', 'iptReservaEstado', 'iptSolicitudBusqueda', 'iptSolicitudEstado', 'iptDespachoBusqueda', 'iptMovBusqueda', 'iptMovTipo', 'iptExistBodega'];
inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evento = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evento, () => {
        const panel = el.closest('.ipt-panel');
        if (!panel) return;
        if (panel.id === 'panel-lotes') iptLoadLotes();
        if (panel.id === 'panel-entradas') iptLoadEntradas();
        if (panel.id === 'panel-existencias') iptLoadExistencias();
        if (panel.id === 'panel-reservas') iptLoadReservas();
        if (panel.id === 'panel-solicitudes') iptLoadSolicitudes();
        if (panel.id === 'panel-despachos') iptLoadDespachos();
        if (panel.id === 'panel-movimientos') iptLoadMovimientos();
    });
});

document.getElementById('iptLoteNuevoBtn').addEventListener('click', iptOpenLoteNuevo);
document.getElementById('iptEntradaNuevaBtn').addEventListener('click', iptOpenEntradaNueva);
document.getElementById('iptExistTransferirBtn').addEventListener('click', () => iptOpenTransferencia(null));
document.getElementById('iptReservaNuevaBtn').addEventListener('click', iptOpenReservaNueva);
document.getElementById('iptReservaVencidasBtn').addEventListener('click', async () => {
    try {
        const resultado = await iptApi(`${API}/reservas/procesar-vencidas`, { method: 'POST', body: '{}' });
        iptNotify('Reservas', `${resultado.liberadas || 0} reserva(s) vencida(s) liberada(s).`, 'success');
        iptLoadReservas();
    } catch (error) {
        iptNotify('Reservas', error.message, 'danger');
    }
});
document.getElementById('iptSolicitudNuevaBtn').addEventListener('click', iptOpenSolicitudNueva);
document.getElementById('iptDespachoNuevoBtn').addEventListener('click', iptOpenDespachoNuevo);
document.getElementById('iptIntegracionesBtn').addEventListener('click', iptOpenIntegraciones);
document.getElementById('iptBodegaNuevaBtn').addEventListener('click', iptOpenBodegaNueva);
document.getElementById('iptReporteTipo').addEventListener('change', iptActualizarFiltroReporte);
document.getElementById('iptReporteFiltro').addEventListener('change', iptCargarReporte);
document.getElementById('iptReporteCargarBtn').addEventListener('click', iptCargarReporte);
document.getElementById('iptReporteCsvBtn').addEventListener('click', () => iptExportarReporte('csv'));
document.getElementById('iptReporteXlsxBtn').addEventListener('click', () => iptExportarReporte('xlsx'));

// ── INIT ───────────────────────────────────────────────────────────────

(async function iptInit() {
    try {
        await iptLoadCatalogos();
        iptLoadResumen();
    } catch (error) {
        iptNotify('Inicio', error.message, 'danger');
    }
})();
