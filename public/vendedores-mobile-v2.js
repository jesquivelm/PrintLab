/* Formato 2 — App móvil vendedores PrintLab
   Inicio con KPIs de "Tu Actividad" (/api/vendedores/dashboard),
   tres puertas de acción, cotizaciones, prospectos y órdenes. */

const ENDPOINT_DASHBOARD = '/api/vendedores/dashboard';
const ENDPOINT_COTIZACIONES = '/api/cotizaciones';
const ENDPOINT_SOCIOS = '/api/socios';
const ENDPOINT_PRODUCTOS = '/api/productos';
const ENDPOINT_NOTIFICACIONES = '/api/notification-center/threads';
const CLAVE_FOTO = 'erp-vendedores-photo';

const ESTADOS_PROSPECTO = ['PROSPECTO', 'PENDIENTE_INFORMACION', 'SOLICITUD_CLIENTE', 'PENDIENTE_APROBACION', 'ERROR_SINCRONIZACION'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

let datos = {
    dashboard: null,
    cotizaciones: [],
    ordenes: [],
    socios: [],
    productos: [],
    notificaciones: []
};
let pestanaCotizaciones = 'todas';
let pestanaSocios = 'prospectos';
let cotizacionAbierta = null;
let skuAbierto = null;
let socioAbierto = null;
let filtroOrdenesSoloProceso = false;

/* ===== Utilidades ===== */

function leerSesion() {
    if (window.ErpAccess?.readSession) return window.ErpAccess.readSession();
    try {
        return JSON.parse(localStorage.getItem('erp-user-session') || sessionStorage.getItem('erp-user-session') || 'null');
    } catch (_) { return null; }
}

function encabezadosSesion() {
    const s = leerSesion();
    if (!s) return {};
    return { 'x-erp-session': JSON.stringify({ username: s.username || '', name: s.name || '', permissionName: s.permissionName || '' }) };
}

function nombreVendedor() {
    const s = leerSesion();
    return s?.name || s?.fullName || s?.username || 'Vendedor';
}

function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dinero(valor) {
    return '$' + Math.round(Number(valor || 0)).toLocaleString('es-CR');
}

function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '—';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function tiempoRelativo(valor) {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return 'Hace ' + min + ' min';
    const h = Math.floor(min / 60);
    if (h < 24) return 'Hace ' + h + ' h';
    const dias = Math.floor(h / 24);
    if (dias < 7) return 'Hace ' + dias + ' d';
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' });
}

function fechaCorta(valor) {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });
}

function claveMes(desplazamiento = 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + desplazamiento);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function montoMes(filas, clave) {
    const fila = (filas || []).find((r) => r.mes === clave);
    return fila ? Number(fila.monto || 0) : 0;
}

function serieMensual(filas, cantidad) {
    const salida = [];
    for (let i = cantidad - 1; i >= 0; i--) {
        const clave = claveMes(-i);
        salida.push(montoMes(filas, clave));
    }
    return salida;
}

async function pedirJson(url, opciones = {}) {
    const respuesta = await fetch(url, { ...opciones, headers: { ...encabezadosSesion(), ...(opciones.headers || {}) } });
    const datosJson = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datosJson.error || 'No fue posible cargar los datos.');
    return datosJson;
}

function aviso(mensaje, esError = false) {
    const contenedor = document.getElementById('avisos');
    const elemento = document.createElement('div');
    elemento.className = 'aviso' + (esError ? ' error' : '');
    elemento.textContent = mensaje;
    contenedor.appendChild(elemento);
    setTimeout(() => elemento.remove(), 3200);
}

/* ===== Navegación ===== */

function irAVista(nombre) {
    document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.dataset.vista === nombre));
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('activo', b.dataset.vistaDestino === nombre));
    window.scrollTo(0, 0);
}
/* ===== KPIs (Tu Actividad) ===== */

function sparkline(valores, color) {
    const w = 84, h = 24;
    const max = Math.max(...valores), min = Math.min(...valores);
    const n = valores.length;
    const puntos = valores.map((v, i) => [(i / (n - 1)) * w, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
    let d = 'M ' + puntos[0][0] + ',' + puntos[0][1];
    for (let i = 1; i < n; i++) {
        const mx = (puntos[i - 1][0] + puntos[i][0]) / 2;
        d += ' C ' + mx + ',' + puntos[i - 1][1] + ' ' + mx + ',' + puntos[i][1] + ' ' + puntos[i][0] + ',' + puntos[i][1];
    }
    const gid = 'sg' + Math.random().toString(36).slice(2, 8);
    return '<svg class="kpi-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + d + ' L ' + w + ',' + h + ' L 0,' + h + ' Z" fill="url(#' + gid + ')" stroke="none"/>' +
        '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/></svg>';
}

function deltaHtml(actual, anterior) {
    if (!anterior) return '';
    const pct = ((actual - anterior) / anterior) * 100;
    const clase = pct >= 0 ? 'sube' : 'baja';
    const flecha = pct >= 0 ? '▲' : '▼';
    return '<span class="kpi-delta ' + clase + '">' + flecha + ' ' + Math.abs(pct).toFixed(0) + '% vs. mes anterior</span>';
}

function tarjetaKpi({ etiqueta, valor, delta, serie, color, destacada, ancha, accion, activa }) {
    const clase = 'kpi-tarjeta' + (destacada ? ' kpi-destacada' : '') + (ancha ? ' kpi-ancha' : '');
    const interior =
        '<span class="kpi-etiqueta">' + escapeHtml(etiqueta) + '</span>' +
        '<span class="kpi-valor">' + escapeHtml(valor) + '</span>' +
        (delta || serie && serie.length > 1
            ? '<span class="kpi-pie">' + (delta || '') + (serie && serie.length > 1 ? sparkline(serie, color) : '') + '</span>'
            : '');
    if (accion) {
        return '<button type="button" class="' + clase + '" data-ir="' + accion + '" aria-label="' + escapeHtml(etiqueta) + ': ver detalle">' + interior + '</button>';
    }
    return '<article class="' + clase + '">' + interior + '</article>';
}

function pintarKpis() {
    const d = datos.dashboard;
    if (!d) return;
    const esteMes = claveMes(0), mesAnterior = claveMes(-1);
    const cotizado = montoMes(d.ventasMensuales?.cotizadoAceptado, esteMes);
    const cotizadoAntes = montoMes(d.ventasMensuales?.cotizadoAceptado, mesAnterior);
    const facturado = montoMes(d.ventasMensuales?.facturado, esteMes);
    const facturadoAntes = montoMes(d.ventasMensuales?.facturado, mesAnterior);
    const pendientes = (d.cotizacionesPendientesCotizador || []).length;
    const ordenes = (d.ordenesEnProceso || []).length;
    const leads = (d.leads || []).length;

    const serieCot = serieMensual(d.ventasMensuales?.cotizadoAceptado, 6);
    const serieFac = serieMensual(d.ventasMensuales?.facturado, 6);

    const tarjetas = [
        { etiqueta: 'Cotizado este mes', valor: dinero(cotizado), delta: deltaHtml(cotizado, cotizadoAntes), serie: serieCot, color: '#0891b2', destacada: true, ancha: true },
        { etiqueta: 'Facturado este mes', valor: dinero(facturado), delta: deltaHtml(facturado, facturadoAntes), serie: serieFac, color: '#059669' },
        { etiqueta: 'Órdenes en proceso', valor: String(ordenes), accion: 'ordenes' },
        { etiqueta: 'Pendientes por cotizar', valor: String(pendientes), accion: 'cotizaciones-pendientes' },
        { etiqueta: 'Prospectos activos', valor: String(leads), accion: 'prospectos' }
    ];

    document.getElementById('kpiPila').innerHTML = tarjetas.map(tarjetaKpi).join('');

    const hayAlertas = pendientes > 0 || (d.cotizacionesPendientesSeguimiento || []).length > 0;
    document.getElementById('campanaPunto').hidden = !hayAlertas;
}

/* ===== Órdenes ===== */

function progresoOrden(o) {
    const estado = String(o.current_process_status || '').toUpperCase();
    const etiquetas = { RUN: 'En producción', SETUP: 'Preparando', PARO: 'Detenida', PENDIENTE: 'Pendiente', COMPLETADO: 'Por entregar' };
    let pct = 40;
    if (estado === 'COMPLETADO') pct = 100;
    else if (estado === 'RUN') pct = 65;
    else if (estado === 'SETUP') pct = 25;
    else if (estado === 'PENDIENTE') pct = 10;
    const atrasada = estado === 'PARO';
    return { pct, estado: etiquetas[estado] || o.order_status || 'Sin estado', atrasada, proceso: o.current_process_name || '' };
}

function anilloAvance(pct, atrasada) {
    const r = 19, circ = 2 * Math.PI * r;
    const desplazamiento = circ * (1 - pct / 100);
    return '<span class="anillo' + (atrasada ? ' anillo-alerta' : '') + '" aria-hidden="true">' +
        '<svg viewBox="0 0 44 44"><circle class="anillo-fondo" cx="22" cy="22" r="' + r + '" fill="none" stroke-width="4"/>' +
        '<circle class="anillo-avance" cx="22" cy="22" r="' + r + '" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + desplazamiento + '"/></svg>' +
        '<span class="anillo-texto">' + pct + '%</span></span>';
}

function tarjetaOrden(o) {
    const p = progresoOrden(o);
    return '<article class="tarjeta tarjeta-clic" data-orden="' + escapeHtml(o.order_code) + '" role="button" tabindex="0" aria-label="Ver detalle de la orden ' + escapeHtml(o.order_code) + '">' +
        anilloAvance(p.pct, p.atrasada) +
        '<div class="tarjeta-principal">' +
        '<p class="tarjeta-titulo">' + escapeHtml(o.customer_name || 'Sin cliente') + '</p>' +
        '<p class="tarjeta-detalle">' + escapeHtml(o.order_code) + (p.proceso ? ' · ' + escapeHtml(p.proceso) : '') + '</p>' +
        '</div>' +
        '<div class="tarjeta-lateral"><span class="estado ' + (p.atrasada ? 'alerta' : (p.pct === 100 ? 'cotizada' : 'enviada')) + '">' + escapeHtml(p.estado) + '</span></div>' +
        '</article>';
}

function pintarOrdenes() {
    const listaCompleta = document.getElementById('listaOrdenesCompleta');
    const termino = (document.getElementById('buscarOrdenes')?.value || '').trim().toLowerCase();

    let ordenes = datos.ordenes;
    if (filtroOrdenesSoloProceso) {
        ordenes = ordenes.filter((o) => ['RUN', 'SETUP', 'PARO'].includes(String(o.current_process_status || '').toUpperCase()));
    }
    if (termino) {
        ordenes = ordenes.filter((o) => [o.order_code, o.customer_name, o.product_name].join(' ').toLowerCase().includes(termino));
    }

    listaCompleta.innerHTML = ordenes.map(tarjetaOrden).join('') ||
        '<div class="vacio">' + (filtroOrdenesSoloProceso
            ? 'Ninguna orden está en marcha en este momento.'
            : 'Sin órdenes en proceso por ahora.') + '</div>';
}

/* ===== Seguimiento (cotizaciones pendientes de respuesta) ===== */

function pintarSeguimiento() {
    const filas = datos.dashboard?.cotizacionesPendientesSeguimiento || [];
    const seccion = document.getElementById('seccionSeguimiento');
    seccion.hidden = filas.length === 0;
    document.getElementById('conteoSeguimiento').textContent = filas.length;
    document.getElementById('listaSeguimiento').innerHTML = filas.map((f) =>
        '<article class="tarjeta">' +
        '<span class="tarjeta-iniciales tono-magenta">' + escapeHtml(iniciales(f.customer_name)) + '</span>' +
        '<div class="tarjeta-principal">' +
        '<p class="tarjeta-titulo">' + escapeHtml(f.customer_name || 'Sin cliente') + '</p>' +
        '<p class="tarjeta-detalle">' + escapeHtml(f.quote_code) + ' · enviada ' + escapeHtml(tiempoRelativo(f.enviada_en)) + '</p>' +
        '</div>' +
        '<div class="tarjeta-lateral"><span class="estado alerta">Seguir</span></div>' +
        '</article>').join('');
}

/* ===== Cotizaciones ===== */

function estadoCotizacion(q) {
    const sinCotizar = Array.isArray(q.lineas_sin_cotizar) ? q.lineas_sin_cotizar.length : null;
    const totalLineas = Number(q.line_count || 0);
    if (sinCotizar !== null && totalLineas > 0 && sinCotizar < totalLineas) return 'cotizada';
    if (sinCotizar !== null && sinCotizar > 0) return 'espera';
    if (Number(q.quote_total || 0) > 0) return 'cotizada';
    if (q.status === 'enviada') return 'enviada';
    return 'espera';
}

function pintarCotizaciones() {
    const lista = document.getElementById('listaCotizaciones');
    const termino = (document.getElementById('buscarCotizaciones')?.value || '').trim().toLowerCase();
    let cotizaciones = datos.cotizaciones;
    if (termino) {
        cotizaciones = cotizaciones.filter((q) => {
            const raw = q.raw_data || {};
            const titulo = raw['NOMBRE TRABAJO'] || q.job_name || q.product_name || '';
            return [titulo, q.customer_name, q.quote_code].join(' ').toLowerCase().includes(termino);
        });
    }
    if (pestanaCotizaciones !== 'todas') {
        cotizaciones = cotizaciones.filter((q) => estadoCotizacion(q) === pestanaCotizaciones);
    }
    lista.innerHTML = cotizaciones.map((q) => {
        const titulo = q.customer_name || q.quote_code || 'Cotización';
        const estado = estadoCotizacion(q);
        const etiquetas = { espera: 'Por cotizar', enviada: 'Enviada', cotizada: 'Cotizada' };
        const monto = Number(q.quote_total || 0);
        return '<article class="tarjeta tarjeta-clic" data-cotizacion="' + escapeHtml(q.quote_code) + '" role="button" tabindex="0" aria-label="Ver detalle de ' + escapeHtml(titulo) + '">' +
            '<span class="tarjeta-iniciales">' + escapeHtml(iniciales(q.customer_name)) + '</span>' +
            '<div class="tarjeta-principal">' +
            '<p class="tarjeta-titulo">' + escapeHtml(titulo) + '</p>' +
            '<p class="tarjeta-detalle">' + escapeHtml(q.quote_code) + ' · ' + escapeHtml(tiempoRelativo(q.created_on)) + ' · ' + (q.line_count || 0) + ' trabajo(s)</p>' +
            '</div>' +
            '<div class="tarjeta-lateral">' +
            (monto > 0 ? '<div class="tarjeta-monto">' + escapeHtml(dinero(monto)) + '</div>' : '') +
            '<span class="estado ' + estado + '">' + etiquetas[estado] + '</span>' +
            '</div>' +
            '</article>';
    }).join('') || '<div class="vacio">No hay cotizaciones aquí. Toca + para pedir una.</div>';
}

/* ===== Prospectos y clientes ===== */

function esProspecto(s) {
    return ESTADOS_PROSPECTO.includes(String(s.estado_socio || '').toUpperCase());
}

function pintarProspectos() {
    const lista = document.getElementById('listaProspectos');
    const termino = (document.getElementById('buscarProspectos')?.value || '').trim().toLowerCase();
    let socios = datos.socios;
    if (termino) {
        socios = socios.filter((s) => [s.partner_name, s.nombre, s.partner_code, s.tax_id].join(' ').toLowerCase().includes(termino));
    }
    socios = socios.filter((s) => pestanaSocios === 'prospectos' ? esProspecto(s) : !esProspecto(s));
    lista.innerHTML = socios.map((s) => {
        const prospecto = esProspecto(s);
        return '<article class="tarjeta tarjeta-clic" data-socio="' + escapeHtml(s.partner_code) + '" role="button" tabindex="0" aria-label="Ver detalle de ' + escapeHtml(s.partner_name || s.nombre || '') + '">' +
            '<span class="tarjeta-iniciales' + (prospecto ? ' tono-ambar' : ' tono-verde') + '">' + escapeHtml(iniciales(s.partner_name || s.nombre)) + '</span>' +
            '<div class="tarjeta-principal">' +
            '<p class="tarjeta-titulo">' + escapeHtml(s.partner_name || s.nombre || 'Sin nombre') + '</p>' +
            '<p class="tarjeta-detalle">' + escapeHtml(s.email || s.email_facturacion || s.partner_code || '') + '</p>' +
            '</div>' +
            '<div class="tarjeta-lateral"><span class="estado ' + (prospecto ? 'espera' : 'cotizada') + '">' + (prospecto ? 'Prospecto' : 'Cliente') + '</span></div>' +
            '</article>';
    }).join('') || '<div class="vacio">' + (pestanaSocios === 'prospectos'
        ? 'Sin prospectos todavía. Toca + para registrar el primero.'
        : 'Sin clientes todavía.') + '</div>';
}

/* ===== Detalle de cotización ===== */
async function abrirDetalleCotizacion(codigo) {
    const q = datos.cotizaciones.find((x) => x.quote_code === codigo);
    if (!q) return;
    cotizacionAbierta = codigo;
    document.getElementById('detalleTitulo').textContent = codigo;
    document.getElementById('detalleCliente').textContent = q.customer_name || 'Sin cliente';
    document.getElementById('detalleContacto').textContent = q.contact_name || '';
    document.getElementById('detalleFecha').textContent = q.created_on ? new Date(q.created_on).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const etiquetas = { espera: 'Por cotizar', enviada: 'Enviada', cotizada: 'Cotizada' };
    const estado = estadoCotizacion(q);
    const estadoEl = document.getElementById('detalleEstado');
    estadoEl.textContent = etiquetas[estado] || '';
    estadoEl.className = 'estado ' + estado;
    document.getElementById('detalleTotal').textContent = dinero(q.quote_total || 0);
    document.getElementById('detalleLineas').innerHTML = '<div class="cargando">Cargando trabajos…</div>';
    abrirModal('modalDetalleCotizacion');
    try {
        const detalle = await pedirJson(ENDPOINT_COTIZACIONES + '/' + encodeURIComponent(codigo));
        const lineas = detalle.lineas || detalle.items || [];
        document.getElementById('detalleLineas').innerHTML = lineas.map((l) => {
            const raw = l.raw_data || {};
            const nombre = l.job_name || raw['NOMBRE TRABAJO'] || l.product_name || l.product_code || l.line_code;
            const cantidad = Number(l.quantity || 0);
            const total = Number(l.total_cost || 0);
            return '<article class="tarjeta">' +
                '<div class="tarjeta-principal">' +
                '<p class="tarjeta-titulo">' + escapeHtml(nombre) + '</p>' +
                '<p class="tarjeta-detalle">' + (cantidad ? cantidad.toLocaleString('es-CR') + ' unidades · ' : '') + escapeHtml(l.process_type || raw['TIPO IMPRESION'] || '') + '</p>' +
                '</div>' +
                (total > 0 ? '<div class="tarjeta-lateral"><div class="tarjeta-monto">' + escapeHtml(dinero(total)) + '</div></div>' : '') +
                '</article>';
        }).join('') || '<div class="vacio">Esta cotización todavía no tiene trabajos detallados.</div>';
    } catch (_) {
        document.getElementById('detalleLineas').innerHTML = '<div class="vacio">No fue posible cargar los trabajos de esta cotización.</div>';
    }
}

/* ===== Detalle de orden ===== */

function abrirDetalleOrden(codigo) {
    const o = datos.ordenes.find((x) => x.order_code === codigo);
    if (!o) return;
    const p = progresoOrden(o);
    document.getElementById('detalleOrdenTitulo').textContent = codigo;
    document.getElementById('detalleOrdenCliente').textContent = o.customer_name || 'Sin cliente';
    const estadoEl = document.getElementById('detalleOrdenEstado');
    estadoEl.textContent = p.estado;
    estadoEl.className = 'estado ' + (p.atrasada ? 'alerta' : (p.pct === 100 ? 'cotizada' : 'enviada'));
    document.getElementById('detalleOrdenProceso').textContent = p.proceso || '';
    document.getElementById('detalleOrdenFecha').textContent = o.created_at ? fechaCorta(o.created_at) : '';
    const cantidad = Number(o.ordered_quantity || 0);
    document.getElementById('detalleOrdenCantidad').textContent = cantidad ? cantidad.toLocaleString('es-CR') + ' unidades' : '';
    abrirModal('modalDetalleOrden');
}

/* ===== SKU ===== */

function pintarSku() {
    const lista = document.getElementById('listaSku');
    const termino = (document.getElementById('buscarSku')?.value || '').trim().toLowerCase();
    let productos = datos.productos;
    if (termino) {
        productos = productos.filter((p) => [p.product_code, p.product_name, p.client_name].join(' ').toLowerCase().includes(termino));
    }
    lista.innerHTML = productos.map((p) => {
        const total = Number(p.total_price || 0);
        return '<article class="tarjeta tarjeta-clic" data-sku="' + escapeHtml(p.product_code) + '" role="button" tabindex="0" aria-label="Ver detalle del SKU ' + escapeHtml(p.product_code) + '">' +
            '<span class="tarjeta-iniciales tono-verde">' + escapeHtml(iniciales(p.product_name || p.product_code)) + '</span>' +
            '<div class="tarjeta-principal">' +
            '<p class="tarjeta-titulo">' + escapeHtml(p.product_name || p.product_code) + '</p>' +
            '<p class="tarjeta-detalle">' + escapeHtml(p.client_name || 'Sin cliente') + ' · ' + escapeHtml(p.product_code) + '</p>' +
            '</div>' +
            (total > 0
                ? '<div class="tarjeta-lateral"><div class="tarjeta-monto">' + escapeHtml(dinero(total)) + '</div><span class="tarjeta-monto-delta">último precio</span></div>'
                : '') +
            '</article>';
    }).join('') || '<div class="vacio">Sin SKU todavía. Nacen cuando cotizas un trabajo nuevo.</div>';
}

function abrirDetalleSku(codigo) {
    const p = datos.productos.find((x) => x.product_code === codigo);
    if (!p) return;
    skuAbierto = p;
    document.getElementById('detalleSkuTitulo').textContent = p.product_name || codigo;
    document.getElementById('detalleSkuCliente').textContent = p.client_name || 'Sin cliente';
    document.getElementById('detalleSkuTipo').textContent = p.product_type || '';
    document.getElementById('detalleSkuMaterial').textContent = p.material_name || '';
    const medidas = (p.width_inches && p.length_inches) ? p.width_inches + ' × ' + p.length_inches + ' in' : '';
    document.getElementById('detalleSkuMedidas').textContent = medidas;
    document.getElementById('detalleSkuColores').textContent = p.tint_count ? p.tint_count + (Number(p.tint_count) === 1 ? ' color' : ' colores') : '';
    document.getElementById('detalleSkuPrecio').textContent = Number(p.total_price || 0) > 0 ? dinero(p.total_price) : '';
    abrirModal('modalDetalleSku');
}

/* ===== Detalle de cliente / prospecto ===== */

function abrirDetalleSocio(codigo) {
    const s = datos.socios.find((x) => x.partner_code === codigo);
    if (!s) return;
    socioAbierto = s;
    const prospecto = esProspecto(s);
    document.getElementById('detalleSocioTitulo').textContent = s.partner_name || s.nombre || codigo;
    document.getElementById('detalleSocioCodigo').textContent = s.partner_code;
    const estadoEl = document.getElementById('detalleSocioEstado');
    estadoEl.textContent = prospecto ? 'Prospecto' : 'Cliente';
    estadoEl.className = 'estado ' + (prospecto ? 'espera' : 'cotizada');
    document.getElementById('detalleSocioVendedor').textContent = s.salesperson_name || '';
    document.getElementById('detalleSocioCorreo').textContent = s.email || s.email_facturacion || '';
    document.getElementById('detalleSocioTelefono').textContent = s.tax_id ? 'ID: ' + s.tax_id : '';
    document.getElementById('detalleSocioContacto').textContent = '';
    document.getElementById('detalleSocioContactosExtras').innerHTML = '<div class="cargando">Cargando información…</div>';
    abrirModal('modalDetalleSocio');
    pedirJson(ENDPOINT_SOCIOS + '/' + encodeURIComponent(codigo)).then((detalle) => {
        const socio = detalle.socio || {};
        const contactos = detalle.contactos || [];
        document.getElementById('detalleSocioTelefono').textContent = socio.cellular || socio.phone1 || '';
        const principal = contactos[0] || {};
        document.getElementById('detalleSocioContacto').textContent = [principal.first_name, principal.last_name].filter(Boolean).join(' ') || principal.contact_name || socio.contact_person || '';
        document.getElementById('detalleSocioContactosExtras').innerHTML = contactos.slice(principal.email || principal.contact_name ? 1 : 0).map((c) => {
            const nombre = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.contact_name || 'Contacto';
            return '<article class="tarjeta">' +
                '<span class="tarjeta-iniciales">' + escapeHtml(iniciales(nombre)) + '</span>' +
                '<div class="tarjeta-principal">' +
                '<p class="tarjeta-titulo">' + escapeHtml(nombre) + '</p>' +
                '<p class="tarjeta-detalle">' + escapeHtml([c.position, c.email, c.mobile || c.phone].filter(Boolean).join(' · ')) + '</p>' +
                '</div></article>';
        }).join('');
    }).catch(() => {
        document.getElementById('detalleSocioContactosExtras').innerHTML = '';
    });
}

/* ===== Notificaciones ===== */

function pintarNotificaciones() {
    const lista = document.getElementById('listaNotificaciones');
    lista.innerHTML = datos.notificaciones.map((n) =>
        '<article class="tarjeta">' +
        '<span class="tarjeta-iniciales' + (n.unreadCount > 0 ? ' tono-magenta' : '') + '">' + escapeHtml(iniciales(n.customerName || n.productName)) + '</span>' +
        '<div class="tarjeta-principal">' +
        '<p class="tarjeta-titulo">' + escapeHtml(n.customerName || n.productName || 'Conversación') + '</p>' +
        '<p class="tarjeta-detalle">' + escapeHtml(n.documentCode || n.threadCode || '') + '</p>' +
        '</div>' +
        '<div class="tarjeta-lateral"><span class="tarjeta-monto-delta">' + escapeHtml(tiempoRelativo(n.lastMessageAt)) + '</span></div>' +
        '</article>').join('') || '<div class="vacio">Sin notificaciones por ahora.</div>';
}

/* ===== Carga de datos ===== */

async function cargarDatos() {
    const nombre = nombreVendedor();
    const [dashboard, cotizacionesRes, sociosRes, productosRes, notificacionesRes] = await Promise.all([
        pedirJson(ENDPOINT_DASHBOARD).catch(() => null),
        pedirJson(ENDPOINT_COTIZACIONES + '?limit=60').catch(() => ({})),
        pedirJson(ENDPOINT_SOCIOS + '?limit=200').catch(() => ({})),
        pedirJson(ENDPOINT_PRODUCTOS + '?limit=200').catch(() => ({})),
        pedirJson(ENDPOINT_NOTIFICACIONES + '?limit=30').catch(() => ({}))
    ]);

    datos.dashboard = dashboard;
    datos.ordenes = dashboard?.ordenesEnProceso || [];
    datos.cotizaciones = (cotizacionesRes.cotizaciones || []).filter((q) => {
        const sp = String(q.salesperson_name || '').trim();
        return !sp || sp.toLowerCase() === nombre.toLowerCase();
    });
    datos.socios = (sociosRes.socios || []).filter((s) => {
        const sp = String(s.salesperson_name || '').trim();
        return !sp || sp.toLowerCase() === nombre.toLowerCase();
    });
    datos.productos = (productosRes.productos || []).filter((p) => {
        const sp = String(p.salesperson_name || '').trim();
        return !sp || sp.toLowerCase() === nombre.toLowerCase();
    });
    datos.notificaciones = notificacionesRes.items || [];

    pintarKpis();
    pintarOrdenes();
    pintarSeguimiento();
    pintarCotizaciones();
    pintarProspectos();
    pintarSku();
    pintarNotificaciones();
}

/* ===== Modal: pedir cotización (3 pasos) ===== */

let pasoCotizar = 1;

function mostrarPasoCotizar(paso) {
    pasoCotizar = paso;
    document.querySelectorAll('#modalCotizar .panel').forEach((p) => p.classList.toggle('activo', Number(p.dataset.panel) === paso));
    document.querySelectorAll('#modalCotizarPasos .paso').forEach((s) => {
        const n = Number(s.dataset.paso);
        s.classList.toggle('activo', n === paso);
        s.classList.toggle('completo', n < paso);
    });
    document.getElementById('modalCotizarPasos').setAttribute('aria-valuenow', paso);
    document.getElementById('btnCotizarAtras').hidden = paso === 1;
    document.getElementById('btnCotizarSiguiente').hidden = paso === 3;
    document.getElementById('btnCotizarEnviar').hidden = paso !== 3;
}

function validarPasoCotizar(paso) {
    const form = document.getElementById('formCotizar');
    if (paso === 1) {
        if (!form.cliente.value.trim()) { aviso('Escribe el nombre del cliente', true); form.cliente.focus(); return false; }
    }
    if (paso === 2) {
        if (!form.trabajo.value.trim()) { aviso('Describe el trabajo a imprimir', true); form.trabajo.focus(); return false; }
        if (!form.cantidad.value || Number(form.cantidad.value) < 1) { aviso('La cantidad debe ser al menos 1', true); form.cantidad.focus(); return false; }
    }
    return true;
}

function abrirModal(id) { document.getElementById(id).showModal(); }
function cerrarModal(id) { document.getElementById(id).close(); }

function abrirCotizadorConCliente(nombreCliente) {
    const form = document.getElementById('formCotizar');
    form.reset();
    document.getElementById('cotizarAdjuntosLista').innerHTML = '';
    if (nombreCliente) form.cliente.value = nombreCliente;
    mostrarPasoCotizar(1);
    abrirModal('modalCotizar');
}

function leerArchivoBase64(archivo) {
    return new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(String(lector.result).split(',')[1] || '');
        lector.onerror = rechazar;
        lector.readAsDataURL(archivo);
    });
}

async function enviarCotizacion(evento) {
    evento.preventDefault();
    const form = document.getElementById('formCotizar');
    const boton = document.getElementById('btnCotizarEnviar');
    const acabados = '';
    const archivos = Array.from(document.getElementById('cotizarAdjuntos').files || []);
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
        const creacion = await pedirJson(ENDPOINT_COTIZACIONES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: form.cliente.value.trim(),
                contact_name: form.contacto.value.trim(),
                email: form.correo.value.trim(),
                phone: form.celular.value.trim(),
                salesperson_name: nombreVendedor()
            })
        });
        const cotizacion = creacion.cotizacion || {};
        const lineaRes = await pedirJson(ENDPOINT_COTIZACIONES + '/' + encodeURIComponent(cotizacion.quote_code) + '/lineas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_code: form.trabajo.value.trim(),
                product_name: form.trabajo.value.trim(),
                quantity: form.cantidad.value,
                process_type: form.proceso.value,
                total_cost: 0,
                unit_price: 0,
                notes: form.comentarios.value.trim(),
                raw_data: {
                    'NOMBRE TRABAJO': form.trabajo.value.trim(),
                    'CANTIDAD': form.cantidad.value,
                    'TIPO IMPRESION': form.proceso.value,
                    'COMENTARIOS': form.comentarios.value.trim()
                }
            })
        });
        const linea = lineaRes.linea || {};
        for (const archivo of archivos) {
            const base64 = await leerArchivoBase64(archivo);
            await pedirJson(ENDPOINT_COTIZACIONES + '/' + encodeURIComponent(cotizacion.quote_code) +
                '/lineas/' + encodeURIComponent(linea.line_code) + '/adjuntos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: archivo.name,
                    mimeType: archivo.type || 'application/octet-stream',
                    fileExt: archivo.name.includes('.') ? archivo.name.split('.').pop() : '',
                    contentBase64: base64,
                    notes: form.comentarios.value.trim(),
                    uploadedBy: nombreVendedor()
                })
            });
        }
        aviso('Solicitud enviada: ' + cotizacion.quote_code);
        cerrarModal('modalCotizar');
        await cargarDatos();
        irAVista('cotizaciones');
    } catch (error) {
        aviso(error.message || 'No se pudo enviar la solicitud', true);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Enviar solicitud';
    }
}

/* ===== Modal: nuevo prospecto ===== */

function actualizarTiposIdentificacion() {
    const tipo = document.getElementById('prospectoTipoSocio').value;
    const selector = document.getElementById('prospectoTipoIdentificacion');
    const opciones = tipo === 'PERSONA'
        ? [['DPI', 'DPI'], ['PASAPORTE', 'Pasaporte'], ['OTRO', 'Otro']]
        : [['NIT', 'NIT']];
    selector.innerHTML = opciones.map(([valor, texto]) => '<option value="' + valor + '">' + texto + '</option>').join('');
}

async function guardarProspecto(evento) {
    evento.preventDefault();
    const form = document.getElementById('formProspecto');
    const boton = document.getElementById('btnProspectoGuardar');
    const nombreCompleto = form.nombre.value.trim();
    const partesContacto = form.contactoNombre.value.trim().split(/\s+/);
    boton.disabled = true;
    boton.textContent = 'Guardando…';
    try {
        await pedirJson(ENDPOINT_SOCIOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo_socio: form.tipoSocio.value,
                tipo_identificacion: form.tipoIdentificacion.value,
                tax_id: form.identificacion.value.trim(),
                partner_name: nombreCompleto,
                contact_first_name: partesContacto[0] || '',
                contact_last_name: partesContacto.slice(1).join(' '),
                contact_mobile: form.contactoCelular.value.trim(),
                contact_email: form.contactoCorreo.value.trim()
            })
        });
        aviso('Prospecto guardado');
        cerrarModal('modalProspecto');
        await cargarDatos();
        irAVista('prospectos');
    } catch (error) {
        aviso(error.message || 'No se pudo guardar el prospecto', true);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar prospecto';
    }
}

/* ===== Eventos ===== */

function ligarEventos() {
    document.querySelectorAll('[data-vista-destino]').forEach((b) =>
        b.addEventListener('click', () => irAVista(b.dataset.vistaDestino)));

    document.querySelectorAll('[data-abrir]').forEach((b) =>
        b.addEventListener('click', () => {
            const destino = b.dataset.abrir;
            if (destino === 'cotizar') {
                abrirCotizadorConCliente('');
            } else if (destino === 'prospecto') {
                document.getElementById('formProspecto').reset();
                actualizarTiposIdentificacion();
                abrirModal('modalProspecto');
            } else if (destino === 'vista-cotizaciones') {
                irAVista('cotizaciones');
            }
        }));

    // KPIs que llevan a su lista correspondiente
    document.getElementById('kpiPila').addEventListener('click', (e) => {
        const tarjeta = e.target.closest('[data-ir]');
        if (!tarjeta) return;
        const destino = tarjeta.dataset.ir;
        if (destino === 'ordenes') {
            filtroOrdenesSoloProceso = true;
            document.getElementById('buscarOrdenes').value = '';
            irAVista('ordenes');
            pintarOrdenes();
        } else if (destino === 'cotizaciones-pendientes') {
            pestanaCotizaciones = 'espera';
            document.querySelectorAll('[data-pestana]').forEach((x) => {
                const activo = x.dataset.pestana === 'espera';
                x.classList.toggle('activo', activo);
                x.setAttribute('aria-selected', activo ? 'true' : 'false');
            });
            irAVista('cotizaciones');
            pintarCotizaciones();
        } else if (destino === 'prospectos') {
            pestanaSocios = 'prospectos';
            document.querySelectorAll('[data-pestana-socios]').forEach((x) => {
                const activo = x.dataset.pestanaSocios === 'prospectos';
                x.classList.toggle('activo', activo);
                x.setAttribute('aria-selected', activo ? 'true' : 'false');
            });
            irAVista('prospectos');
            pintarProspectos();
        }
    });

    document.querySelectorAll('[data-cerrar]').forEach((b) =>
        b.addEventListener('click', () => cerrarModal(b.dataset.cerrar)));

    document.getElementById('btnNotificaciones').addEventListener('click', () => {
        pintarNotificaciones();
        abrirModal('modalNotificaciones');
    });

    // Tabs de cotizaciones
    document.querySelectorAll('[data-pestana]').forEach((b) =>
        b.addEventListener('click', () => {
            document.querySelectorAll('[data-pestana]').forEach((x) => {
                x.classList.remove('activo');
                x.setAttribute('aria-selected', 'false');
            });
            b.classList.add('activo');
            b.setAttribute('aria-selected', 'true');
            pestanaCotizaciones = b.dataset.pestana;
            pintarCotizaciones();
        }));

    // Tabs de prospectos
    document.querySelectorAll('[data-pestana-socios]').forEach((b) =>
        b.addEventListener('click', () => {
            document.querySelectorAll('[data-pestana-socios]').forEach((x) => {
                x.classList.remove('activo');
                x.setAttribute('aria-selected', 'false');
            });
            b.classList.add('activo');
            b.setAttribute('aria-selected', 'true');
            pestanaSocios = b.dataset.pestanaSocios;
            pintarProspectos();
        }));

    document.getElementById('buscarCotizaciones').addEventListener('input', pintarCotizaciones);
    document.getElementById('buscarProspectos').addEventListener('input', pintarProspectos);
    document.getElementById('buscarOrdenes').addEventListener('input', () => { filtroOrdenesSoloProceso = false; pintarOrdenes(); });
    document.getElementById('buscarSku').addEventListener('input', pintarSku);

    // Detalle de cotización (toque o teclado)
    document.getElementById('listaCotizaciones').addEventListener('click', (e) => {
        const tarjeta = e.target.closest('[data-cotizacion]');
        if (tarjeta) abrirDetalleCotizacion(tarjeta.dataset.cotizacion);
    });
    document.getElementById('listaCotizaciones').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tarjeta = e.target.closest('[data-cotizacion]');
        if (tarjeta) { e.preventDefault(); abrirDetalleCotizacion(tarjeta.dataset.cotizacion); }
    });

    // Detalle de orden
    document.getElementById('listaOrdenesCompleta').addEventListener('click', (e) => {
        const tarjeta = e.target.closest('[data-orden]');
        if (tarjeta) abrirDetalleOrden(tarjeta.dataset.orden);
    });
    document.getElementById('listaOrdenesCompleta').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tarjeta = e.target.closest('[data-orden]');
        if (tarjeta) { e.preventDefault(); abrirDetalleOrden(tarjeta.dataset.orden); }
    });

    // Detalle de SKU y botón cotizar
    document.getElementById('listaSku').addEventListener('click', (e) => {
        const tarjeta = e.target.closest('[data-sku]');
        if (tarjeta) abrirDetalleSku(tarjeta.dataset.sku);
    });
    document.getElementById('listaSku').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tarjeta = e.target.closest('[data-sku]');
        if (tarjeta) { e.preventDefault(); abrirDetalleSku(tarjeta.dataset.sku); }
    });
    document.getElementById('btnSkuCotizar').addEventListener('click', () => {
        const nombre = skuAbierto?.product_name || skuAbierto?.product_code || '';
        cerrarModal('modalDetalleSku');
        abrirCotizadorConCliente(skuAbierto?.client_name || '');
        const form = document.getElementById('formCotizar');
        form.trabajo.value = nombre;
        mostrarPasoCotizar(2);
    });

    // Detalle de cliente/prospecto y botón cotizar
    document.getElementById('listaProspectos').addEventListener('click', (e) => {
        const tarjeta = e.target.closest('[data-socio]');
        if (tarjeta) abrirDetalleSocio(tarjeta.dataset.socio);
    });
    document.getElementById('listaProspectos').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tarjeta = e.target.closest('[data-socio]');
        if (tarjeta) { e.preventDefault(); abrirDetalleSocio(tarjeta.dataset.socio); }
    });
    document.getElementById('btnSocioCotizar').addEventListener('click', () => {
        cerrarModal('modalDetalleSocio');
        abrirCotizadorConCliente(socioAbierto?.partner_name || socioAbierto?.nombre || '');
    });

    // Wizard cotización
    document.getElementById('btnCotizarSiguiente').addEventListener('click', () => {
        if (validarPasoCotizar(pasoCotizar)) mostrarPasoCotizar(pasoCotizar + 1);
    });
    document.getElementById('btnCotizarAtras').addEventListener('click', () => mostrarPasoCotizar(pasoCotizar - 1));
    document.getElementById('formCotizar').addEventListener('submit', enviarCotizacion);
    document.getElementById('cotizarAdjuntos').addEventListener('change', (e) => {
        document.getElementById('cotizarAdjuntosLista').innerHTML =
            Array.from(e.target.files || []).map((f) =>
                '<span class="archivo-chip"><span>' + escapeHtml(f.name) + '</span></span>').join('');
    });

    // Prospecto
    document.getElementById('prospectoTipoSocio').addEventListener('change', actualizarTiposIdentificacion);
    document.getElementById('formProspecto').addEventListener('submit', guardarProspecto);

    // Cerrar modal tocando el fondo
    document.querySelectorAll('dialog.modal-hoja').forEach((d) =>
        d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
}

/* ===== Inicio ===== */

function saludar() {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches');
    document.getElementById('saludoHora').textContent = saludo;
    document.getElementById('saludoNombre').textContent = nombreVendedor();
}

async function iniciar() {
    const sesion = leerSesion();
    if (!sesion?.username) {
        window.location.replace('/login');
        return;
    }
    saludar();
    ligarEventos();
    document.getElementById('kpiPila').innerHTML = '<div class="cargando">Cargando tu actividad…</div>';
    try {
        await cargarDatos();
    } catch (error) {
        aviso(error.message || 'No fue posible cargar tus datos', true);
    }
}

iniciar();
