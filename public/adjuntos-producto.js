/* ═══════════════════════════════════════════════════════════════════════════
   Adjuntos del Producto — visor compartido
   Se usa en Cotización, Cálculo, Orden de Producción y Documento de Producto.
   Tabla con los archivos del producto (solicitud, cotización, orden y
   producción). La barra de la tabla lleva el título a la izquierda y los
   íconos de adjuntar / grabar audio a la derecha. Cada fila tiene íconos para
   ver (modal ampliable), descargar y eliminar. Los archivos viven en disco en
   el servidor; aquí solo se listan, se suben y se descargan.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var ORIGEN_ETIQUETA = {
        solicitud: 'Solicitud',
        cotizacion: 'Cotización',
        orden: 'Orden',
        produccion: 'Producción'
    };
    var TIPO_ETIQUETA = {
        arte: 'Arte',
        estampado: 'Imagen del Estampado',
        orden_compra: 'Orden de Compra',
        lista_empaque: 'Lista de Empaque',
        referencia: 'Referencia del Cliente',
        audio: 'Audio',
        foto: 'Foto',
        otro: 'Otro'
    };
    var TIPOS_ORDEN = ['arte', 'estampado', 'orden_compra', 'lista_empaque', 'referencia', 'audio', 'foto', 'otro'];

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function formatoTamano(bytes) {
        var n = Number(bytes || 0);
        if (!n) return '';
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatoFecha(valor) {
        if (!valor) return '';
        var d = new Date(valor);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function leerArchivoBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var result = String(reader.result || '');
                var comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
            reader.readAsDataURL(file);
        });
    }

    function construirQuery(contexto) {
        var p = [];
        if (contexto.cotizacion) p.push('cotizacion=' + encodeURIComponent(contexto.cotizacion));
        if (contexto.linea) p.push('linea=' + encodeURIComponent(contexto.linea));
        if (contexto.orden) p.push('orden=' + encodeURIComponent(contexto.orden));
        if (contexto.producto) p.push('producto=' + encodeURIComponent(contexto.producto));
        return p.join('&');
    }

    // ── Modal de vista previa (imagen / PDF / audio / video), ampliable ───────
    var modalEl = null;
    function asegurarModal() {
        if (modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.className = 'adj-prod-modal';
        modalEl.hidden = true;
        modalEl.innerHTML =
            '<div class="adj-prod-modal-backdrop" data-adj-modal-cerrar></div>' +
            '<div class="adj-prod-modal-panel">' +
                '<div class="adj-prod-modal-head">' +
                    '<span class="adj-prod-modal-titulo"></span>' +
                    '<div class="adj-prod-modal-acc">' +
                        '<a class="adj-prod-modal-btn" data-adj-modal-descargar target="_blank" rel="noopener" title="Descargar" aria-label="Descargar">⇩</a>' +
                        '<button type="button" class="adj-prod-modal-btn" data-adj-modal-max title="Maximizar" aria-label="Maximizar">⤢</button>' +
                        '<button type="button" class="adj-prod-modal-btn" data-adj-modal-cerrar title="Cerrar" aria-label="Cerrar">✕</button>' +
                    '</div>' +
                '</div>' +
                '<div class="adj-prod-modal-body"></div>' +
            '</div>';
        document.body.appendChild(modalEl);
        function cerrar() {
            modalEl.hidden = true;
            modalEl.querySelector('.adj-prod-modal-body').innerHTML = '';
            modalEl.querySelector('.adj-prod-modal-panel').classList.remove('es-max');
        }
        modalEl.querySelectorAll('[data-adj-modal-cerrar]').forEach(function (b) { b.addEventListener('click', cerrar); });
        modalEl.querySelector('[data-adj-modal-max]').addEventListener('click', function () {
            modalEl.querySelector('.adj-prod-modal-panel').classList.toggle('es-max');
        });
        document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !modalEl.hidden) cerrar(); });
        return modalEl;
    }

    function abrirVistaPrevia(item) {
        var m = asegurarModal();
        var titulo = m.querySelector('.adj-prod-modal-titulo');
        var body = m.querySelector('.adj-prod-modal-body');
        var descargar = m.querySelector('[data-adj-modal-descargar]');
        titulo.textContent = item.nombre || 'Adjunto';
        descargar.href = item.descargarUrl || '#';
        var mime = String(item.mime || '').toLowerCase();
        var ext = (String(item.nombre).split('.').pop() || '').toLowerCase();
        var url = item.descargarUrl || '';
        var urlInline = url && item.fuente === 'producto' ? (url + (url.indexOf('?') >= 0 ? '&' : '?') + 'inline=1') : url;
        var html;
        if (item.esImagen || /^(png|jpe?g|webp|gif|bmp|svg)$/.test(ext)) {
            html = '<div class="adj-prod-modal-img"><img src="' + esc(urlInline) + '" alt="' + esc(item.nombre) + '"></div>';
        } else if (mime.indexOf('pdf') >= 0 || ext === 'pdf') {
            html = '<iframe class="adj-prod-modal-frame" src="' + esc(urlInline) + '" title="' + esc(item.nombre) + '"></iframe>';
        } else if (item.esAudio || /^(mp3|wav|ogg|m4a|webm)$/.test(ext) && mime.indexOf('audio') >= 0) {
            html = '<div class="adj-prod-modal-media"><audio controls autoplay src="' + esc(urlInline) + '"></audio></div>';
        } else if (mime.indexOf('video') >= 0 || /^(mp4|mov|webm|mkv)$/.test(ext)) {
            html = '<div class="adj-prod-modal-media"><video controls src="' + esc(urlInline) + '"></video></div>';
        } else {
            html = '<div class="adj-prod-modal-noprev">Este tipo de archivo no se puede mostrar aquí.' +
                '<a class="adj-prod-btn adj-prod-btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Descargar para verlo</a></div>';
        }
        body.innerHTML = html;
        m.hidden = false;
    }

    function crear(opciones) {
        opciones = opciones || {};
        var contenedor = opciones.contenedor;
        if (!contenedor) throw new Error('AdjuntosProducto.crear necesita un contenedor.');
        var contexto = opciones.contexto || {};
        var origenSubida = opciones.origenSubida || null;
        var origenesVisibles = Array.isArray(opciones.origenesVisibles) && opciones.origenesVisibles.length
            ? opciones.origenesVisibles.slice() : null;
        var permitirEliminar = opciones.permitirEliminar !== false;
        var titulo = opciones.titulo == null ? 'Adjuntos del Producto' : opciones.titulo;
        var headers = typeof opciones.sessionHeaders === 'function' ? opciones.sessionHeaders : function () { return {}; };
        var renderizarIcono = typeof opciones.renderizarIcono === 'function' ? opciones.renderizarIcono : null;

        var estado = { items: [], cargando: false, filtroOrigen: '', filtroTipo: '', error: '' };
        var grabadora = null;
        var trozosAudio = [];
        var archivoPendiente = null;

        contenedor.classList.add('adj-prod-root');
        contenedor.innerHTML =
            '<div class="adj-prod-title-text"></div>' +
            '<div class="adj-prod-subrow">' +
                '<span class="adj-prod-sub"></span>' +
                '<span class="adj-prod-tools"></span>' +
            '</div>' +
            '<div class="adj-prod-filtros"></div>' +
            '<div class="adj-prod-form" hidden></div>' +
            '<div class="adj-prod-tabla-wrap"><div class="adj-prod-tabla"></div></div>';

        var elTitleText = contenedor.querySelector('.adj-prod-title-text');
        var elRight = contenedor.querySelector('.adj-prod-tools');
        var elSub = contenedor.querySelector('.adj-prod-sub');
        var elFiltros = contenedor.querySelector('.adj-prod-filtros');
        var elForm = contenedor.querySelector('.adj-prod-form');
        var elTabla = contenedor.querySelector('.adj-prod-tabla');

        elTitleText.textContent = titulo || '';
        if (!titulo) elTitleText.hidden = true;
        elSub.textContent = 'Incluye archivos de la solicitud, la cotización, la orden y producción.';

        if (origenSubida) {
            elRight.innerHTML =
                '<label class="quote-request-icon-action adj-prod-icon-action" data-adj="adjuntar" title="Adjuntar Archivo" aria-label="Adjuntar Archivo">' +
                    '<span data-adj-icon="adjuntar">📎</span>' +
                    '<input type="file" hidden>' +
                '</label>' +
                '<button type="button" class="quote-request-icon-action adj-prod-icon-action" data-adj="audio" title="Grabar Audio" aria-label="Grabar Audio">' +
                    '<span data-adj-icon="audio">●</span>' +
                '</button>' +
                '<span class="adj-prod-rec" hidden><span class="adj-prod-rec-dot"></span>Grabando…</span>';
            var fileInput = elRight.querySelector('input[type="file"]');
            fileInput.addEventListener('change', function () {
                var f = fileInput.files && fileInput.files[0];
                if (f) { archivoPendiente = f; abrirFormulario(f.name); }
                fileInput.value = '';
            });
            elRight.querySelector('[data-adj="audio"]').addEventListener('click', alternarGrabacion);
            if (renderizarIcono) {
                try {
                    renderizarIcono(elRight.querySelector('[data-adj-icon="adjuntar"]'), 'adjuntar');
                    renderizarIcono(elRight.querySelector('[data-adj-icon="audio"]'), 'audio');
                } catch (e) { /* íconos con formato propio del host */ }
            }
            construirFormulario();
        }

        function construirFormulario() {
            var tipoDefecto = origenSubida === 'produccion' ? 'arte' : 'referencia';
            var opcionesTipo = TIPOS_ORDEN.map(function (t) {
                return '<option value="' + t + '"' + (t === tipoDefecto ? ' selected' : '') + '>' + esc(TIPO_ETIQUETA[t]) + '</option>';
            }).join('');
            elForm.innerHTML =
                '<div class="adj-prod-form-nombre"></div>' +
                '<label class="adj-prod-campo"><span>Tipo de Documento</span>' +
                    '<select class="adj-prod-tipo">' + opcionesTipo + '</select></label>' +
                '<label class="adj-prod-campo"><span>Nota (opcional)</span>' +
                    '<input type="text" class="adj-prod-nota" maxlength="200" placeholder="Ej. versión final aprobada"></label>' +
                '<div class="adj-prod-form-acciones">' +
                    '<button type="button" class="adj-prod-btn adj-prod-btn-primary" data-adj="guardar">Guardar</button>' +
                    '<button type="button" class="adj-prod-btn" data-adj="cancelar">Cancelar</button>' +
                    '<span class="adj-prod-form-estado"></span>' +
                '</div>';
            elForm.querySelector('[data-adj="cancelar"]').addEventListener('click', cerrarFormulario);
            elForm.querySelector('[data-adj="guardar"]').addEventListener('click', guardarDesdeFormulario);
        }

        function abrirFormulario(nombre) {
            elForm.hidden = false;
            elForm.querySelector('.adj-prod-form-nombre').textContent = 'Archivo: ' + nombre;
            fijarEstadoForm('');
        }
        function cerrarFormulario() {
            elForm.hidden = true;
            archivoPendiente = null;
        }
        function fijarEstadoForm(texto, tipo) {
            var el = elForm.querySelector('.adj-prod-form-estado');
            if (!el) return;
            el.textContent = texto || '';
            el.className = 'adj-prod-form-estado' + (tipo ? ' es-' + tipo : '');
        }

        async function guardarDesdeFormulario() {
            if (!archivoPendiente) { fijarEstadoForm('Elige un archivo primero.', 'error'); return; }
            var tipo = elForm.querySelector('.adj-prod-tipo').value;
            var nota = elForm.querySelector('.adj-prod-nota').value.trim();
            fijarEstadoForm('Subiendo…');
            try {
                var base64 = await leerArchivoBase64(archivoPendiente);
                await enviarArchivo({ nombre: archivoPendiente.name, mime: archivoPendiente.type || 'application/octet-stream', tipoDocumento: tipo, notas: nota, contenidoBase64: base64 });
                cerrarFormulario();
                await recargar();
            } catch (err) {
                fijarEstadoForm(err.message || 'No se pudo guardar.', 'error');
            }
        }

        async function alternarGrabacion() {
            var ind = elRight.querySelector('.adj-prod-rec');
            var btn = elRight.querySelector('[data-adj="audio"]');
            if (grabadora && grabadora.state === 'recording') { grabadora.stop(); return; }
            try {
                var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                grabadora = new MediaRecorder(stream);
                trozosAudio = [];
                grabadora.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozosAudio.push(ev.data); };
                grabadora.onstop = async function () {
                    stream.getTracks().forEach(function (t) { t.stop(); });
                    if (ind) ind.hidden = true;
                    if (btn) btn.classList.remove('es-grabando');
                    var blob = new Blob(trozosAudio, { type: grabadora.mimeType || 'audio/webm' });
                    var nombre = 'audio-' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm';
                    try {
                        var base64 = await leerArchivoBase64(blob);
                        await enviarArchivo({ nombre: nombre, mime: blob.type || 'audio/webm', tipoDocumento: 'audio', notas: '', contenidoBase64: base64 });
                        await recargar();
                    } catch (err) { estado.error = err.message || 'No se pudo guardar el audio.'; pintar(); }
                };
                grabadora.start();
                if (ind) ind.hidden = false;
                if (btn) btn.classList.add('es-grabando');
            } catch (err) {
                estado.error = 'No se pudo acceder al micrófono.';
                pintar();
            }
        }

        function enviarArchivo(datos) {
            var cuerpo = Object.assign({
                origen: origenSubida,
                cotizacion: contexto.cotizacion || '',
                linea: contexto.linea || '',
                orden: contexto.orden || '',
                producto: contexto.producto || ''
            }, datos);
            return fetch('/api/adjuntos-producto', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, headers()),
                body: JSON.stringify(cuerpo)
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                    if (!r.ok) throw new Error(j.error || 'No se pudo guardar el adjunto.');
                    return j;
                });
            });
        }

        function recategorizar(item, nuevoTipo) {
            if (nuevoTipo === item.tipoDocumento) return Promise.resolve();
            return fetch('/api/adjuntos-producto/' + encodeURIComponent(item.id), {
                method: 'PATCH',
                headers: Object.assign({ 'Content-Type': 'application/json' }, headers()),
                body: JSON.stringify({ tipoDocumento: nuevoTipo })
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                    if (!r.ok) throw new Error(j.error || 'No se pudo cambiar la categoría.');
                    item.tipoDocumento = nuevoTipo;
                    pintar();
                });
            }).catch(function (err) { estado.error = err.message || 'No se pudo cambiar la categoría.'; pintar(); });
        }

        function eliminar(item) {
            if (item.fuente !== 'producto') {
                alert('Este archivo viene de una pantalla anterior. Elimínalo desde donde se subió.');
                return;
            }
            if (!window.confirm('¿Eliminar "' + item.nombre + '"?')) return;
            fetch('/api/adjuntos-producto/' + encodeURIComponent(item.id), { method: 'DELETE', headers: headers() })
                .then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (j) {
                        if (!r.ok) throw new Error(j.error || 'No se pudo eliminar.');
                        recargar();
                    });
                }).catch(function (err) { estado.error = err.message || 'No se pudo eliminar.'; pintar(); });
        }

        function recargar() {
            estado.cargando = true;
            estado.error = '';
            pintar();
            var query = construirQuery(contexto);
            if (origenesVisibles) query += '&origenes=' + encodeURIComponent(origenesVisibles.join(','));
            return fetch('/api/adjuntos-producto?' + query, { headers: headers() })
                .then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (j) {
                        if (!r.ok) throw new Error(j.error || 'No se pudieron cargar los adjuntos.');
                        estado.items = Array.isArray(j.items) ? j.items : [];
                        estado.cargando = false;
                        pintar();
                        return j;
                    });
                })
                .catch(function (err) {
                    estado.cargando = false;
                    estado.error = err.message || 'No se pudieron cargar los adjuntos.';
                    estado.items = [];
                    pintar();
                });
        }

        function itemsFiltrados() {
            return estado.items.filter(function (it) {
                if (estado.filtroOrigen && it.origen !== estado.filtroOrigen) return false;
                if (estado.filtroTipo && it.tipoDocumento !== estado.filtroTipo) return false;
                return true;
            });
        }

        function pintarFiltros() {
            var origenes = {};
            var tipos = {};
            estado.items.forEach(function (it) {
                origenes[it.origen] = (origenes[it.origen] || 0) + 1;
                tipos[it.tipoDocumento] = (tipos[it.tipoDocumento] || 0) + 1;
            });
            var html = '';
            if (Object.keys(origenes).length > 1) {
                html += '<div class="adj-prod-filtro-grupo"><span class="adj-prod-filtro-lbl">Origen</span>';
                html += '<button type="button" class="adj-prod-chip' + (estado.filtroOrigen ? '' : ' es-activo') + '" data-forigen="">Todos</button>';
                Object.keys(ORIGEN_ETIQUETA).forEach(function (o) {
                    if (!origenes[o]) return;
                    html += '<button type="button" class="adj-prod-chip' + (estado.filtroOrigen === o ? ' es-activo' : '') + '" data-forigen="' + o + '">' + esc(ORIGEN_ETIQUETA[o]) + ' (' + origenes[o] + ')</button>';
                });
                html += '</div>';
            }
            if (Object.keys(tipos).length > 1) {
                html += '<div class="adj-prod-filtro-grupo"><span class="adj-prod-filtro-lbl">Tipo</span>';
                html += '<button type="button" class="adj-prod-chip' + (estado.filtroTipo ? '' : ' es-activo') + '" data-ftipo="">Todos</button>';
                TIPOS_ORDEN.forEach(function (t) {
                    if (!tipos[t]) return;
                    html += '<button type="button" class="adj-prod-chip' + (estado.filtroTipo === t ? ' es-activo' : '') + '" data-ftipo="' + t + '">' + esc(TIPO_ETIQUETA[t]) + ' (' + tipos[t] + ')</button>';
                });
                html += '</div>';
            }
            elFiltros.innerHTML = html;
            elFiltros.querySelectorAll('[data-forigen]').forEach(function (b) {
                b.addEventListener('click', function () { estado.filtroOrigen = b.getAttribute('data-forigen'); pintar(); });
            });
            elFiltros.querySelectorAll('[data-ftipo]').forEach(function (b) {
                b.addEventListener('click', function () { estado.filtroTipo = b.getAttribute('data-ftipo'); pintar(); });
            });
        }

        function tarjetaItem(item) {
            var ext = (String(item.nombre).split('.').pop() || '').toUpperCase().slice(0, 4) || 'DOC';
            var vistaPrevia;
            if (item.esImagen && item.descargarUrl) {
                vistaPrevia = '<img src="' + esc(item.descargarUrl) + '" alt="" loading="lazy">';
            } else if (item.esAudio) {
                vistaPrevia = '<div class="adj-prod-card-tile"><strong>AUDIO</strong><span>' + esc(ext) + '</span></div>';
            } else {
                vistaPrevia = '<div class="adj-prod-card-tile"><strong>' + esc(ext) + '</strong><span>' + esc(TIPO_ETIQUETA[item.tipoDocumento] || 'Documento') + '</span></div>';
            }
            var meta = [formatoTamano(item.tamanoBytes), item.subidoPor, formatoFecha(item.creadoEn)].filter(Boolean).join(' · ');
            var tipoCelda = item.fuente === 'producto'
                ? '<select class="adj-prod-tipo-select" title="Cambiar categoría">' + TIPOS_ORDEN.map(function (t) {
                    return '<option value="' + t + '"' + (t === item.tipoDocumento ? ' selected' : '') + '>' + esc(TIPO_ETIQUETA[t]) + '</option>';
                }).join('') + '</select>'
                : '<span class="adj-prod-badge es-tipo">' + esc(TIPO_ETIQUETA[item.tipoDocumento] || item.tipoDocumento) + '</span>';
            var origenBadge = '<span class="adj-prod-badge es-origen-' + esc(item.origen) + '">' + esc(ORIGEN_ETIQUETA[item.origen] || item.origen) +
                (item.fuente === 'heredado' ? ' <em title="' + esc(item.heredadoDe || '') + '">·heredado</em>' : '') + '</span>';
            var descargar = item.descargarUrl
                ? '<a class="adj-prod-card-action" href="' + esc(item.descargarUrl) + '" target="_blank" rel="noopener" title="Descargar" aria-label="Descargar"><span data-adj-icon="descargar">⇩</span></a>'
                : '';
            var borrar = (permitirEliminar && item.fuente === 'producto')
                ? '<button type="button" class="adj-prod-card-remove" title="Eliminar" aria-label="Eliminar">✕</button>'
                : '';
            var card = document.createElement('div');
            card.className = 'adj-prod-card';
            card.innerHTML =
                '<button type="button" class="adj-prod-card-preview" title="Ver" aria-label="Ver ' + esc(item.nombre) + '">' + vistaPrevia + '</button>' +
                '<div class="adj-prod-card-body">' +
                    '<div class="adj-prod-card-meta">' +
                        '<span class="adj-prod-card-name" title="' + esc(item.nombre) + '">' + esc(item.nombre) + '</span>' +
                        '<span class="adj-prod-card-size">' + esc(meta) + '</span>' +
                        (item.notas ? '<span class="adj-prod-card-note" title="' + esc(item.notas) + '">' + esc(item.notas) + '</span>' : '') +
                    '</div>' +
                    '<div class="adj-prod-card-tags">' + tipoCelda + origenBadge + '</div>' +
                '</div>' +
                '<div class="adj-prod-card-actions">' + descargar + borrar + '</div>';
            card.querySelector('.adj-prod-card-preview').addEventListener('click', function () { abrirVistaPrevia(item); });
            var btnBorrar = card.querySelector('.adj-prod-card-remove');
            if (btnBorrar) btnBorrar.addEventListener('click', function () { eliminar(item); });
            var selTipo = card.querySelector('.adj-prod-tipo-select');
            if (selTipo) selTipo.addEventListener('change', function () { recategorizar(item, selTipo.value); });
            if (renderizarIcono) {
                try {
                    var d = card.querySelector('[data-adj-icon="descargar"]');
                    if (d) renderizarIcono(d, 'descargar');
                } catch (e) { /* íconos con formato propio del host */ }
            }
            return card;
        }

        function pintar() {
            pintarFiltros();
            var lista = itemsFiltrados();
            if (estado.cargando) {
                elTabla.innerHTML = '<div class="adj-prod-vacio">Cargando adjuntos…</div>';
                return;
            }
            if (estado.error) {
                elTabla.innerHTML = '<div class="adj-prod-vacio es-error">' + esc(estado.error) + '</div>';
                return;
            }
            if (!lista.length) {
                elTabla.innerHTML = '<div class="adj-prod-vacio">' +
                    (estado.items.length ? 'Ningún adjunto coincide con el filtro.' : 'Este producto todavía no tiene adjuntos.') +
                    '</div>';
                return;
            }
            elTabla.innerHTML = '';
            lista.forEach(function (it) { elTabla.appendChild(tarjetaItem(it)); });
        }

        recargar();

        return {
            recargar: recargar,
            fijarContexto: function (nuevo) { contexto = Object.assign({}, contexto, nuevo || {}); return recargar(); },
            elemento: contenedor
        };
    }

    window.AdjuntosProducto = { crear: crear };
})();
