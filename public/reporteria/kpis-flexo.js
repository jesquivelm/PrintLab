(function () {
    const API = '/api/reporterias/kpis-flexo';
    let datos = null;
    let semanaSel = null;
    let tabActivo = 'dashboard';
    let iconos = {};
    let iconosGeneral = {};

    const $ = (id) => document.getElementById(id);
    const els = {
        status: $('reportStatus'),
        semanaSelect: $('semanaSelect'),
        tabs: $('reportTabs'),
        kpiGrid: $('kpiGrid'),
        dashTable: $('dashTable'),
        dashSemanaTxt: $('dashSemanaTxt'),
        tendTable: $('tendTable'),
        registroBody: $('registroBody'),
        registroEstado: $('registroEstado'),
        registroNotas: $('registroNotas'),
        eventosTable: $('eventosTable'),
        causasFiltro: $('causasFiltro'),
        paretoParoTabla: $('paretoParoTabla'),
        paretoMermaTabla: $('paretoMermaTabla'),
        paretoParo: $('paretoParo'),
        paretoMerma: $('paretoMerma'),
        autoModal: $('autoModal'),
        autoEstadoTxt: $('autoEstadoTxt')
    };

    // Qué es cada insumo del Registro y de dónde sale (tooltip).
    const FUENTE = {
        horas_planificadas: 'Horas de máquina planificadas para la semana. Fuente: Planificación (pendiente de conexión).',
        horas_paro_no_planificado: 'Suma de las horas de paros no planificados registrados en producción durante la semana.',
        velocidad_teorica_m_min: 'Velocidad de máquina del cálculo (promedio de las órdenes de la semana).',
        velocidad_real_m_min: 'Velocidad real promedio capturada en Impresión.',
        unidades_buenas: 'Unidades buenas producidas (millares buenos capturados en Impresión × 1000).',
        unidades_totales: 'Unidades buenas + unidades rechazadas capturadas en Impresión.',
        horas_en_cambios: 'Suma de tiempos de montaje y setup capturados en Impresión.',
        numero_cambios: 'Cantidad de órdenes de Impresión corridas en la semana. Cada motivo del cálculo implica un cambio.',
        merma_arranque_m: 'Metros de merma de montaje/arranque capturados en Impresión.',
        merma_corrida_m: 'Metros de merma en corrida capturados en Impresión.',
        material_usado_m: 'Metros de sustrato consumidos, capturados en Impresión.',
        ordenes_despachadas: 'Órdenes cuyo último proceso se completó dentro de la semana.',
        ordenes_otif: 'De las despachadas, las entregadas en la fecha comprometida y completas (OTIF = On Time In Full).',
        reclamos_cliente: 'Reclamos de cliente registrados en Calidad con origen "Cliente" (pendiente: falta el módulo para registrarlos).',
        reprocesos: 'Cálculos marcados como "Repetición por Error" creados durante la semana.'
    };
    const CALC_AYUDA = {
        disponibilidad_pct: '(Horas planificadas − Horas de paro) ÷ Horas planificadas.',
        rendimiento_pct: 'Velocidad real ÷ Velocidad teórica.',
        calidad_pct: 'Unidades buenas ÷ Unidades totales.',
        oee_pct: 'Disponibilidad × Rendimiento × Calidad.',
        minutos_por_cambio: 'Horas en cambios ÷ Número de cambios, en minutos.',
        merma_total_pct: '(Merma de arranque + Merma en corrida) ÷ Material usado, en metros.',
        otif_pct: 'Órdenes OTIF ÷ Órdenes despachadas. OTIF = a tiempo y completas.',
        ppm_reclamos: 'Reclamos ÷ Órdenes despachadas × 1 000 000.',
        reproceso_pct: 'Reprocesos ÷ Órdenes despachadas.'
    };

    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function sesionHeader() {
        try {
            const raw = localStorage.getItem('erp-user-session') || sessionStorage.getItem('erp-user-session');
            return raw ? { 'x-erp-session': raw } : {};
        } catch (e) { return {}; }
    }
    function fmtPct(v) { return v == null || !isFinite(Number(v)) ? '—' : (Number(v) * 100).toFixed(1) + ' %'; }
    function fmtNum(v, dec) {
        return v == null || !isFinite(Number(v)) ? '—'
            : Number(v).toLocaleString('es-CR', { maximumFractionDigits: dec == null ? 1 : dec });
    }
    function fmtInd(ind, v) { return ind.tipo === 'pct' ? fmtPct(v) : fmtNum(v, ind.clave === 'ppm_reclamos' ? 0 : 1); }
    function filaPorInicio(inicio) {
        return (datos.semanas || []).find((f) => String(f.semana_inicio).slice(0, 10) === inicio) || null;
    }
    function vacio(msg) { return `<div class="report-empty is-block">${esc(msg || 'Sin datos disponibles')}</div>`; }

    // ── Íconos del catálogo (Configuración → Diseño → Iconos, grupo "Reportes") ──
    function marcadoIcono(valor, alt) {
        const n = String(valor || '').trim().toLowerCase();
        if (n.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(n)) {
            return `<span class="icon-svg-mask" role="img" aria-label="${esc(alt)}" style="-webkit-mask-image:url('${esc(valor)}');mask-image:url('${esc(valor)}')"></span>`;
        }
        if (n.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(n)) {
            return `<img src="${esc(valor)}" alt="${esc(alt)}" class="icon-image">`;
        }
        return `<span class="icon-glyph">${esc(valor || '')}</span>`;
    }
    // Aplica valor + color/tamaño configurados en el catálogo de íconos, igual que
    // el resto del sistema (--icon-color / --icon-hover-color / --config-icon-size).
    function pintarIcono(btnId, clave, respaldo, alt) {
        const b = $(btnId);
        if (!b) return;
        b.innerHTML = marcadoIcono(iconos[clave] || respaldo, alt);
        const suf = clave.charAt(0).toUpperCase() + clave.slice(1);
        const color = iconosGeneral['iconColor' + suf];
        const hover = iconosGeneral['iconColorHover' + suf] || color;
        const size = Number(iconosGeneral['iconSize' + suf]);
        if (color) b.style.setProperty('--icon-color', color);
        if (hover) b.style.setProperty('--icon-hover-color', hover);
        if (Number.isFinite(size) && size > 0) b.style.setProperty('--config-icon-size', size + 'px');
    }
    async function cargarIconos() {
        try {
            const r = await fetch('/api/config/shell', { cache: 'no-cache' });
            if (r.ok) { const c = await r.json(); iconos = c.icons || {}; iconosGeneral = c.general || {}; }
        } catch (e) { iconos = {}; iconosGeneral = {}; }
        pintarIcono('btnPdf', 'reporteriaKpiPdf', '⬇', 'Descargar PDF');
        pintarIcono('btnExcel', 'reporteriaKpiExcel', '⬇', 'Descargar Excel');
        pintarIcono('btnAuto', 'reporteriaKpiConfig', '⚙', 'Automatización');
    }

    // ── Carga ────────────────────────────────────────────────────────────
    async function cargar() {
        els.status.textContent = 'Cargando tablero...';
        try {
            const q = '?semanas=12' + (semanaSel ? '&semanaInicio=' + encodeURIComponent(semanaSel) : '');
            const r = await fetch(API + q, { headers: sesionHeader(), cache: 'no-store' });
            datos = await r.json();
            if (!datos.ok) throw new Error(datos.error || 'Error');
            if (!semanaSel && datos.actual) semanaSel = String(datos.actual.semana_inicio).slice(0, 10);
            render();
        } catch (e) {
            els.status.textContent = 'No fue posible cargar: ' + e.message;
        }
    }

    function render() {
        renderSelectorSemana();
        renderDashboard();
        renderRegistro();
        renderEventos();
        renderPareto();
        renderAutomatizacion();
        els.status.textContent = 'Actualizado ' + new Date().toLocaleString('es-CR');
    }

    function renderSelectorSemana() {
        const sems = (datos.semanas || []).slice().reverse();
        els.semanaSelect.innerHTML = sems.map((f) => {
            const ini = String(f.semana_inicio).slice(0, 10);
            const fin = String(f.semana_fin).slice(0, 10);
            const est = f.cerrada ? (f.preliminar ? ' · cerrada (prelim.)' : ' · cerrada') : ' · abierta';
            return `<option value="${ini}"${ini === semanaSel ? ' selected' : ''}>${ini} a ${fin}${est}</option>`;
        }).join('');
    }

    // ── DASHBOARD ────────────────────────────────────────────────────────
    function chipSemana(f) {
        if (!f) return '';
        if (!f.cerrada) return '<span class="kf-chip kf-chip-open">Abierta</span>';
        return f.preliminar
            ? '<span class="kf-chip kf-chip-warn">Cerrada · Preliminar</span>'
            : '<span class="kf-chip kf-chip-ok">Cerrada</span>';
    }
    // Un cero en estos indicadores casi siempre significa "sin captura", no "cero real"
    // (nunca hay 0 reclamos ni 0 min por cambio si de verdad se está midiendo).
    const CLAVES_CERO_SOSPECHOSO = ['ppm_reclamos', 'reproceso_pct', 'minutos_por_cambio'];
    function ceroSospechoso(ind, v) {
        return CLAVES_CERO_SOSPECHOSO.includes(ind.clave) && Number(v) === 0;
    }
    function tieneDato(act, ind) {
        const v = act ? act[ind.clave] : null;
        return v != null && !ceroSospechoso(ind, v);
    }
    // Estado solo si hay dato evaluado y hay meta.
    function estadoIndicador(ind, valor, meta) {
        if (valor == null || meta == null || ceroSospechoso(ind, valor)) return null;
        return ind.mejor === 'alto' ? Number(valor) >= Number(meta) : Number(valor) <= Number(meta);
    }
    function fmtMeta(ind, meta) {
        if (meta == null) return '—';
        return ind.tipo === 'pct' ? fmtPct(meta) : (fmtNum(meta, 0) + (ind.metaUnidad ? ' ' + ind.metaUnidad : ''));
    }

    function renderDashboard() {
        const act = filaPorInicio(semanaSel) || datos.actual;
        const idx = (datos.semanas || []).findIndex((f) => String(f.semana_inicio).slice(0, 10) === semanaSel);
        const ant = idx > 0 ? datos.semanas[idx - 1] : datos.anterior;
        els.dashSemanaTxt.innerHTML = chipSemana(act);

        const hayAlgo = act && datos.indicadores.some((ind) => tieneDato(act, ind));
        if (!hayAlgo) {
            els.kpiGrid.innerHTML = '';
            els.dashTable.innerHTML = vacio('Sin datos disponibles para esta semana.');
        } else {
            els.kpiGrid.innerHTML = datos.indicadores.map((ind) => {
                const con = tieneDato(act, ind);
                const ok = con ? estadoIndicador(ind, act[ind.clave], datos.metas[ind.clave]) : null;
                const valor = con ? fmtInd(ind, act[ind.clave]) : '<span class="kf-nodata">Sin datos</span>';
                const badge = (con && ok != null)
                    ? `<span class="kf-badge ${ok ? 'kf-ok' : 'kf-bad'}">${ok ? 'Cumple Meta' : 'Bajo Meta'}</span>`
                    : '';
                return `<article class="report-kpi">
                    <span class="kf-term" title="${esc(ind.ayuda || '')}">${esc(ind.etiqueta)}</span>
                    <strong>${valor}</strong>
                    ${badge}
                </article>`;
            }).join('');

            const rows = datos.indicadores.map((ind) => {
                const con = tieneDato(act, ind);
                const conAnt = ant && ant[ind.clave] != null && !ceroSospechoso(ind, ant[ind.clave]);
                const ok = con ? estadoIndicador(ind, act[ind.clave], datos.metas[ind.clave]) : null;
                const cumple = (con && ok != null)
                    ? `<span class="kf-badge ${ok ? 'kf-ok' : 'kf-bad'}">${ok ? 'Sí' : 'No'}</span>`
                    : '<span class="kf-nodata">—</span>';
                return `<tr>
                    <td><span class="kf-term" title="${esc(ind.ayuda || '')}">${esc(ind.etiqueta)}</span></td>
                    <td class="num" style="font-weight:700">${con ? fmtInd(ind, act[ind.clave]) : '<span class="kf-nodata">Sin datos</span>'}</td>
                    <td class="num" style="color:#8a97a3">${conAnt ? fmtInd(ind, ant[ind.clave]) : '—'}</td>
                    <td class="num">${fmtMeta(ind, datos.metas[ind.clave])}</td>
                    <td style="text-align:center">${cumple}</td>
                </tr>`;
            }).join('');
            els.dashTable.innerHTML = `<table>
                <thead><tr>
                    <th>Indicador</th>
                    <th class="num">Semana actual</th>
                    <th class="num">Semana anterior</th>
                    <th class="num">Meta</th>
                    <th style="text-align:center">Cumple</th>
                </tr></thead>
                <tbody>${rows}</tbody></table>`;
        }

        const inds = [['oee_pct', 'OEE'], ['disponibilidad_pct', 'Disp.'], ['rendimiento_pct', 'Rend.'], ['calidad_pct', 'Calidad'], ['otif_pct', 'OTIF'], ['merma_total_pct', 'Merma']];
        const sems = (datos.semanas || []).slice(-8);
        const conDato = sems.some((f) => inds.some(([k]) => f[k] != null));
        els.tendTable.innerHTML = conDato
            ? `<table><thead><tr><th>Semana</th>${inds.map(([, e]) => `<th class="num">${e}</th>`).join('')}</tr></thead>
               <tbody>${sems.map((f) => `<tr><td>${String(f.semana_inicio).slice(0, 10)}</td>${inds.map(([k]) => `<td class="num">${fmtPct(f[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`
            : vacio('Sin datos disponibles todavía.');
    }

    // ── REGISTRO SEMANAL (solo lectura) ──────────────────────────────────
    const CAMPOS = [
        ['horas_planificadas', 'Horas planificadas', 'h'],
        ['horas_paro_no_planificado', 'Horas paro no planificado', 'h'],
        ['velocidad_teorica_m_min', 'Velocidad teórica', 'm/min'],
        ['velocidad_real_m_min', 'Velocidad real', 'm/min'],
        ['unidades_buenas', 'Unidades buenas', 'u'],
        ['unidades_totales', 'Unidades totales', 'u'],
        ['horas_en_cambios', 'Horas en cambios', 'h'],
        ['numero_cambios', 'Número de cambios', ''],
        ['merma_arranque_m', 'Merma de arranque', 'm'],
        ['merma_corrida_m', 'Merma en corrida', 'm'],
        ['material_usado_m', 'Material usado', 'm'],
        ['ordenes_despachadas', 'Órdenes despachadas', ''],
        ['ordenes_otif', 'Órdenes OTIF', ''],
        ['reclamos_cliente', 'Reclamos de cliente', ''],
        ['reprocesos', 'Reprocesos', '']
    ];
    const CALCULADOS = [
        ['disponibilidad_pct', 'Disponibilidad', 'pct'],
        ['rendimiento_pct', 'Rendimiento', 'pct'],
        ['calidad_pct', 'Calidad', 'pct'],
        ['oee_pct', 'OEE', 'pct'],
        ['minutos_por_cambio', 'Minutos por cambio', 'num'],
        ['merma_total_pct', '% Merma total', 'pct'],
        ['otif_pct', '% OTIF', 'pct'],
        ['ppm_reclamos', 'PPM reclamos', 'num0'],
        ['reproceso_pct', '% Reproceso', 'pct']
    ];

    function renderRegistro() {
        const f = filaPorInicio(semanaSel);
        if (!f) { els.registroBody.innerHTML = vacio('Sin datos disponibles.'); return; }
        els.registroEstado.innerHTML = chipSemana(f);
        els.registroNotas.value = f.notas || '';
        els.registroNotas.disabled = !!f.cerrada;

        const sinInsumos = CAMPOS.every(([c]) => f[c] == null);
        const aviso = sinInsumos
            ? `<div class="report-empty is-block" style="margin-bottom:12px">Sin datos disponibles para esta semana.</div>`
            : '';

        const insumoRows = CAMPOS.map(([clave, etq, uni]) => {
            const v = f[clave];
            return `<tr>
                <td><span class="kf-term" title="${esc(FUENTE[clave] || '')}">${esc(etq)}</span></td>
                <td class="num">${fmtNum(v, 2)}</td>
                <td style="color:#8a97a3">${esc(uni)}</td>
            </tr>`;
        }).join('');

        const calcRows = CALCULADOS.map(([clave, etq, tipo]) => {
            const v = f[clave];
            const txt = tipo === 'pct' ? fmtPct(v) : (tipo === 'num0' ? fmtNum(v, 0) : fmtNum(v, 1));
            return `<tr>
                <td><span class="kf-term" title="${esc(CALC_AYUDA[clave] || '')}">${esc(etq)}</span></td>
                <td class="num" style="color:#52627a">${txt}</td><td></td>
            </tr>`;
        }).join('');

        els.registroBody.innerHTML = aviso + `<table>
            <thead><tr><th>Insumo</th><th class="num">Valor</th><th>Unidad</th></tr></thead>
            <tbody>${insumoRows}</tbody>
            <thead><tr><th>Calculado</th><th class="num">Valor</th><th></th></tr></thead>
            <tbody>${calcRows}</tbody>
        </table>`;

        $('btnGuardarNota').disabled = !!f.cerrada;
        $('btnCerrarSemana').disabled = !!f.cerrada;
    }

    // ── CAUSAS (bitácora de producción, solo lectura) ────────────────────
    function renderEventos() {
        const filtro = els.causasFiltro.value;
        let evs = (datos.eventos || []);
        if (filtro === 'merma') evs = evs.filter((e) => Number(e.merma_m) > 0);
        // (todos y "paro" muestran todo: la bitácora son paros)
        if (!evs.length) {
            els.eventosTable.innerHTML = vacio('Sin paros ni mermas registrados en producción esta semana.');
            return;
        }
        els.eventosTable.innerHTML = `<table><thead><tr>
            <th>Fecha</th><th>Categoría</th><th>Grupo</th><th class="num">Horas</th><th class="num">Merma (m)</th><th>Operario</th><th>Comentario</th>
            </tr></thead><tbody>${evs.map((e) => `<tr>
            <td>${esc(String(e.fecha).slice(0, 10))}</td>
            <td>${esc(e.categoria)}</td>
            <td style="color:#8a97a3">${esc(e.grupo || '')}</td>
            <td class="num">${fmtNum(e.horas, 2)}</td>
            <td class="num">${Number(e.merma_m) > 0 ? fmtNum(e.merma_m, 2) : '—'}</td>
            <td>${esc(e.operario || '')}</td>
            <td>${esc(e.comentario || '')}</td>
            </tr>`).join('')}</tbody></table>`;
    }

    // ── PARETO (tablas arriba + gráficas abajo, como el Excel) ──────────
    function tablaPareto(lista, campo, cab) {
        const data = (lista || []).slice().sort((a, b) => Number(b[campo]) - Number(a[campo]));
        if (!data.length) return vacio('Sin datos disponibles.');
        const total = data.reduce((s, x) => s + Number(x[campo] || 0), 0);
        return `<table><thead><tr><th>Categoría</th><th class="num">${cab}</th><th class="num">% del total</th></tr></thead>
            <tbody>${data.map((x) => `<tr>
                <td>${esc(x.categoria)}</td>
                <td class="num">${fmtNum(x[campo], 2)}</td>
                <td class="num">${total > 0 ? (Number(x[campo] || 0) / total * 100).toFixed(1) : '0.0'} %</td>
            </tr>`).join('')}
            <tr class="kf-total"><td>Total</td><td class="num">${fmtNum(total, 2)}</td><td class="num">${total > 0 ? '100.0' : '0.0'} %</td></tr>
            </tbody></table>`;
    }
    function barras(lista, campo, sufijo) {
        const data = (lista || []).filter((x) => Number(x[campo]) > 0).sort((a, b) => Number(b[campo]) - Number(a[campo]));
        if (!data.length) return vacio('Sin datos disponibles.');
        const max = Math.max.apply(null, data.map((x) => Number(x[campo])));
        return data.map((x, i) => {
            const pct = Math.max(4, Math.round((Number(x[campo]) / max) * 100));
            return `<div class="report-bar-row" style="--bar-pct:${pct}%;--bar-accent:var(--report-accent-${(i % 6) + 1})">
                <span class="report-bar-label" title="${esc(x.categoria)}">${esc(x.categoria)}</span>
                <span class="report-bar-track"><span class="report-bar-fill"></span></span>
                <strong>${fmtNum(x[campo], 2)} ${sufijo}</strong>
            </div>`;
        }).join('');
    }
    function renderPareto() {
        const c = datos.causas || { paro: [], merma: [] };
        els.paretoParoTabla.innerHTML = tablaPareto(c.paro, 'horas', 'Horas');
        els.paretoMermaTabla.innerHTML = tablaPareto(c.merma, 'metros', 'Metros');
        els.paretoParo.innerHTML = barras(c.paro, 'horas', 'h');
        els.paretoMerma.innerHTML = barras(c.merma, 'metros', 'm');
    }

    // ── AUTOMATIZACIÓN (modal) ──────────────────────────────────────────
    function renderAutomatizacion() {
        const a = datos.automatizacion || {};
        $('autoActivo').checked = !!a.activo;
        $('autoDia').value = String(a.diaSemana || 1);
        $('autoHora').value = a.hora == null ? 7 : a.hora;
        $('autoMinuto').value = a.minuto == null ? 0 : a.minuto;
        document.querySelectorAll('input[name="autoTipo"]').forEach((r) => { r.checked = r.value === (a.tipoReporte || 'ultima_cerrada'); });
        $('autoFmtPdf').checked = (a.formatos || []).indexOf('pdf') >= 0;
        $('autoFmtExcel').checked = (a.formatos || []).indexOf('excel') >= 0;
        $('autoDestinatarios').value = (a.destinatarios || []).join('\n');
        els.autoEstadoTxt.textContent = a.ultimoEnvioEn
            ? ('Último envío: ' + new Date(a.ultimoEnvioEn).toLocaleString('es-CR'))
            : 'Nunca se ha enviado.';
    }
    function abrirModal() { els.autoModal.hidden = false; }
    function cerrarModal() { els.autoModal.hidden = true; }
    function leerAuto() {
        return {
            activo: $('autoActivo').checked,
            diaSemana: Number($('autoDia').value),
            hora: Number($('autoHora').value),
            minuto: Number($('autoMinuto').value),
            tipoReporte: (document.querySelector('input[name="autoTipo"]:checked') || {}).value || 'ultima_cerrada',
            formatos: [$('autoFmtPdf').checked ? 'pdf' : null, $('autoFmtExcel').checked ? 'excel' : null].filter(Boolean),
            destinatarios: $('autoDestinatarios').value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
        };
    }

    // ── Acciones ────────────────────────────────────────────────────────
    async function accion(metodo, url, body, okMsg) {
        els.status.textContent = 'Guardando...';
        try {
            const opts = { method: metodo, headers: Object.assign({}, sesionHeader()) };
            if (body !== null && body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
            const r = await fetch(url, opts);
            const j = await r.json();
            if (j.ok === false) throw new Error(j.error || 'Error');
            els.status.textContent = okMsg || 'Listo.';
            await cargar();
        } catch (e) {
            els.status.textContent = 'Error: ' + e.message;
            alert('Error: ' + e.message);
        }
    }
    function guardarNota() { accion('PATCH', API + '/semana/' + semanaSel, { notas: els.registroNotas.value }, 'Nota guardada.'); }
    function cerrarSemana() {
        if (!confirm('Cerrar la semana congela sus números. ¿Continuar?')) return;
        accion('POST', API + '/semana/' + semanaSel + '/cerrar', {}, 'Semana cerrada.');
    }
    async function enviarAhora() {
        const a = leerAuto();
        if (!a.destinatarios.length) { alert('Agregá al menos un correo destinatario.'); return; }
        els.status.textContent = 'Enviando informe...';
        try {
            const r = await fetch(API + '/enviar', {
                method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, sesionHeader()),
                body: JSON.stringify({ tipoReporte: a.tipoReporte, formatos: a.formatos, destinatarios: a.destinatarios, semanaInicio: semanaSel })
            });
            const j = await r.json();
            if (!j.ok) throw new Error(j.error || 'Error');
            alert('Informe enviado a: ' + (j.destinatarios || []).join(', '));
            cerrarModal(); cargar();
        } catch (e) {
            alert('No se pudo enviar: ' + e.message);
            els.status.textContent = 'Error al enviar.';
        }
    }
    function descargar(fmt) { window.open(API + '/descargar.' + fmt + '?semanaInicio=' + encodeURIComponent(semanaSel || ''), '_blank'); }
    function previewCorreo() { window.open(API + '/correo-preview?semanaInicio=' + encodeURIComponent(semanaSel || ''), '_blank'); }

    function activarTab(nombre) {
        tabActivo = nombre;
        els.tabs.querySelectorAll('.report-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === nombre));
        document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== nombre; });
    }

    document.addEventListener('DOMContentLoaded', () => {
        els.tabs.addEventListener('click', (e) => { const b = e.target.closest('.report-tab'); if (b) activarTab(b.dataset.tab); });
        els.semanaSelect.addEventListener('change', () => { semanaSel = els.semanaSelect.value; cargar(); });
        els.causasFiltro.addEventListener('change', renderEventos);
        $('btnPdf').addEventListener('click', () => descargar('pdf'));
        $('btnExcel').addEventListener('click', () => descargar('xlsx'));
        $('btnAuto').addEventListener('click', abrirModal);
        $('autoModalClose').addEventListener('click', cerrarModal);
        els.autoModal.addEventListener('click', (e) => { if (e.target === els.autoModal) cerrarModal(); });
        $('btnGuardarNota').addEventListener('click', guardarNota);
        $('btnCerrarSemana').addEventListener('click', cerrarSemana);
        $('btnRecalcular').addEventListener('click', () => accion('POST', API + '/recalcular', { semanaInicio: semanaSel }, 'Recalculado desde producción.'));
        $('btnGuardarAuto').addEventListener('click', () => accion('PUT', API + '/automatizacion', leerAuto(), 'Automatización guardada.'));
        $('btnEnviarAhora').addEventListener('click', enviarAhora);
        $('btnPreviewCorreo').addEventListener('click', previewCorreo);
        cargarIconos();
        cargar();
    });
})();
