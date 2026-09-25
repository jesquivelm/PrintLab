/* ========================================
   Centro de Capacitación — App Logic
   Integrado con PrintLab
   ======================================== */

(function () {
    'use strict';

    let datos = null;
    let vistaActual = 'index';
    let categoriaActual = null;
    let articuloActual = null;
    let editando = false;

    const main = document.getElementById('mainContent');
    const searchInput = document.getElementById('searchInput');

    /* ---- Permisos ---- */
    function canEdit() {
        try {
            if (window.ErpAccess && window.ErpAccess.canEditModule) {
                return window.ErpAccess.canEditModule('capacitacion')
                    || window.ErpAccess.canEditModule('configuracion-general');
            }
        } catch (e) { }
        try {
            const raw = localStorage.getItem('erp-user-session') || sessionStorage.getItem('erp-user-session');
            if (!raw) return false;
            const session = JSON.parse(raw);
            const pn = String(session?.permissionName || '').toLowerCase();
            return /administrador|implementador|admin|implement/.test(pn);
        } catch (e) { }
        return false;
    }

    function sessionHeaders() {
        try {
            const raw = localStorage.getItem('erp-user-session') || sessionStorage.getItem('erp-user-session');
            if (!raw) return {};
            const session = JSON.parse(raw);
            return { 'x-erp-session': JSON.stringify(session) };
        } catch (e) {
            return {};
        }
    }

    /* ---- Iconos de lápiz y menú: leídos del catálogo de iconos configurado ---- */
    const PENCIL_ICON_URL = '/assets/bootstrap/icons-lineEdit.svg';
    const MENU_ICON_URL = '/assets/bootstrap/icons-topMenu.svg';

    function iconoCatalogo(clave, respaldo) {
        const valor = iconosDashboard[clave];
        if (typeof valor === 'string' && valor.trim()) return valor;
        return respaldo;
    }

    function htmlIcono(clave, respaldo, altText) {
        const valor = iconoCatalogo(clave, respaldo);
        if (/^(data:|https?:|\/)/.test(valor)) {
            return `<span class="cc-icon-mask" role="img" aria-label="${altText}" style="-webkit-mask-image:url('${valor}');mask-image:url('${valor}');"></span>`;
        }
        return `<span class="cc-icon-glyph">${valor}</span>`;
    }

    /* ---- Iconos del dashboard (mismas imágenes que el inicio) ---- */
    const ICONOS_DASHBOARD = {
        login: 'dashboardSettings',
        socios: 'dashboardBusinessPartners',
        productos: 'dashboardProducts',
        cotizaciones: 'dashboardQuotes',
        costos: 'dashboardCosts',
        ordenes: 'dashboardOrders',
        produccion: 'dashboardProduction',
        calidad: 'dashboardCalidad',
        tintas: 'dashboardInks',
        planificacion: 'dashboardPlanning',
        facturacion: 'dashboardFacturacionFel',
        reporteria: 'dashboardReports',
        inventarios: 'dashboardInventory',
        notificaciones: 'dashboardNotifications',
        configuracion: 'dashboardSettings'
    };

    let iconosDashboard = {};

    async function cargarIconosDashboard() {
        try {
            const resp = await fetch('/api/config/shell', { cache: 'no-cache' });
            const config = await resp.json();
            iconosDashboard = config?.icons || {};
        } catch (e) {
            iconosDashboard = {};
        }
    }

    function iconoModulo(cat) {
        const key = ICONOS_DASHBOARD[cat.id];
        const ruta = key ? iconosDashboard[key] : '';
        if (ruta) {
            return `<img src="${ruta}" alt="${cat.nombre}" class="cc-module-icon-img">`;
        }
        return cat.icono || '□';
    }

    /* ---- Cargar datos ---- */
    async function cargarDatos() {
        try {
            const base = location.pathname.includes('/capacitacion') ? '/capacitacion' : '';
            const resp = await fetch(base + '/contenido.json', { cache: 'no-cache' });
            datos = await resp.json();
            ordenarDatos();
            renderizar();
        } catch (e) {
            main.innerHTML = '<div class="cc-no-results"><div class="cc-no-results-icon">&#9888;</div><p>No se pudo cargar el contenido.</p></div>';
        }
    }

    function ordenarDatos() {
        datos.categorias.sort((a, b) => a.orden - b.orden);
        datos.articulos.sort((a, b) => a.orden - b.orden);
    }

    /* ---- Router por hash ---- */
    function leerHash() {
        const hash = location.hash.replace('#', '').trim();
        if (!hash) {
            vistaActual = 'index';
            categoriaActual = null;
            articuloActual = null;
            return;
        }
        const partes = hash.split('/');
        if (partes.length === 1) {
            vistaActual = 'categoria';
            categoriaActual = partes[0];
            articuloActual = null;
        } else if (partes.length === 2) {
            vistaActual = 'articulo';
            categoriaActual = partes[0];
            articuloActual = partes[1];
        }
    }

    /* ---- Renderizado principal ---- */
    function renderizar() {
        if (!datos) return;
        leerHash();
        searchInput.value = '';
        ocultarResultadosBusqueda();
        switch (vistaActual) {
            case 'index': renderIndex(); break;
            case 'categoria': renderCategoria(categoriaActual); break;
            case 'articulo': renderArticulo(categoriaActual, articuloActual); break;
            default: renderIndex();
        }
        window.scrollTo(0, 0);
    }

    /* ---- Vista: Index (módulos) ---- */
    function renderIndex() {
        document.title = 'Centro de Capacitación';
        let html = '<div class="cc-hero"><h1>¿Cómo uso PrintLab?</h1><p>Encuentra respuestas a tus preguntas. Elige un módulo para empezar.</p></div>';
        html += '<div class="cc-modules-grid">';
        datos.categorias.forEach(cat => {
            const count = datos.articulos.filter(a => a.categoria === cat.id).length;
            html += `
                <a class="cc-module-card" href="#${cat.id}">
                    <span class="cc-module-icon">${iconoModulo(cat)}</span>
                    <span class="cc-module-name">${cat.nombre}</span>
                    <span class="cc-module-desc">${cat.descripcion}</span>
                    <span class="cc-module-count">${count} ${count === 1 ? 'artículo' : 'artículos'}</span>
                </a>`;
        });
        html += '</div>';
        main.innerHTML = html;
    }

    /* ---- Vista: Categoría ---- */
    function renderCategoria(catId) {
        const cat = datos.categorias.find(c => c.id === catId);
        if (!cat) { renderIndex(); return; }
        document.title = 'Centro de Capacitación';
        const arts = datos.articulos.filter(a => a.categoria === catId);
        const userCanEdit = canEdit();

        let html = `<div class="cc-category-header">
            <div class="cc-category-icon">${iconoModulo(cat)}</div>
            <div class="cc-category-headline">
                <h1 class="cc-category-title">${cat.nombre}</h1>
                <div class="cc-header-actions">
                    ${userCanEdit ? `<button class="cc-icon-btn" id="ccEditBtn" title="Editar este módulo" data-cat-id="${catId}">${htmlIcono('lineEdit', PENCIL_ICON_URL, 'Editar')}</button>` : ''}
                    <button class="cc-icon-btn" id="ccMenuBtn" title="Volver al menú principal">${htmlIcono('topMenu', MENU_ICON_URL, 'Volver al menú')}</button>
                </div>
            </div>
            <p class="cc-category-desc">${cat.descripcion}</p>
        </div>`;

        if (arts.length === 0) {
            html += '<div class="cc-no-results"><p>Este módulo no tiene artículos todavía.</p></div>';
        } else {
            html += '<div class="cc-articles-list">';
            arts.forEach((art, i) => {
                html += `
                    <a class="cc-article-card" href="#${catId}/${art.id}">
                        <div class="cc-article-num">Paso ${i + 1}</div>
                        <div class="cc-article-title">${art.titulo}</div>
                        <div class="cc-article-subtitle">${art.subtitulo || ''}</div>
                    </a>`;
            });
            html += '</div>';
        }
        main.innerHTML = html;

        if (userCanEdit) {
            const btn = document.getElementById('ccEditBtn');
            if (btn) btn.addEventListener('click', abrirEditor);
        }
        const menuBtn = document.getElementById('ccMenuBtn');
        if (menuBtn) menuBtn.addEventListener('click', function () { location.hash = ''; });
    }

    /* ---- Vista: Artículo ---- */
    function renderArticulo(catId, artId) {
        const cat = datos.categorias.find(c => c.id === catId);
        const art = datos.articulos.find(a => a.id === artId && a.categoria === catId);
        if (!cat || !art) { renderIndex(); return; }

        document.title = 'Centro de Capacitación';

        const arts = datos.articulos.filter(a => a.categoria === catId);
        const idx = arts.findIndex(a => a.id === artId);
        const prev = idx > 0 ? arts[idx - 1] : null;
        const next = idx < arts.length - 1 ? arts[idx + 1] : null;
        const userCanEdit = canEdit();

        let html = `<div class="cc-article-view">`;

        html += `<div class="cc-article-meta">
            <a class="cc-article-category-badge" href="#${catId}">${cat.nombre}</a>
            <h1 class="cc-article-view-title">${art.titulo}</h1>
            ${art.subtitulo ? `<p class="cc-article-view-subtitle">${art.subtitulo}</p>` : ''}
            <div class="cc-header-actions">
                ${userCanEdit ? `<button class="cc-icon-btn" id="ccEditBtn" title="Editar este artículo" data-art-id="${artId}" data-cat-id="${catId}">${htmlIcono('lineEdit', PENCIL_ICON_URL, 'Editar')}</button>` : ''}
                <button class="cc-icon-btn" id="ccMenuBtn" title="Volver al menú principal">${htmlIcono('topMenu', MENU_ICON_URL, 'Volver al menú')}</button>
            </div>
        </div>`;

        /* Renderizar contenido con imágenes inline */
        html += `<div class="cc-article-content">${renderContenido(art)}</div>`;

        /* Navegación anterior/siguiente */
        html += '<div class="cc-nav-footer">';
        if (prev) {
            html += `<a class="cc-nav-btn" href="#${catId}/${prev.id}">
                <span><span class="cc-nav-btn-label">← Anterior</span><span class="cc-nav-btn-title">${prev.titulo}</span></span>
            </a>`;
        } else {
            html += `<a class="cc-nav-btn" href="#${catId}">
                <span><span class="cc-nav-btn-label">← Volver</span><span class="cc-nav-btn-title">${cat.nombre}</span></span>
            </a>`;
        }
        if (next) {
            html += `<a class="cc-nav-btn cc-nav-btn--next" href="#${catId}/${next.id}">
                <span><span class="cc-nav-btn-label">Siguiente →</span><span class="cc-nav-btn-title">${next.titulo}</span></span>
            </a>`;
        } else {
            html += `<a class="cc-nav-btn cc-nav-btn--next" href="#">
                <span><span class="cc-nav-btn-label">Salir →</span><span class="cc-nav-btn-title">Volver al menú</span></span>
            </a>`;
        }
        html += '</div>';

        html += '</div>';
        main.innerHTML = html;

        if (userCanEdit) {
            const btn = document.getElementById('ccEditBtn');
            if (btn) btn.addEventListener('click', abrirEditor);
        }
        const menuBtn = document.getElementById('ccMenuBtn');
        if (menuBtn) menuBtn.addEventListener('click', function () { location.hash = ''; });
    }

    /* ---- Renderizar contenido con imágenes inline ---- */
    function renderContenido(art) {
        let contenido = art.contenido || '';
        if (art.imagenes && art.imagenes.length > 0) {
            art.imagenes.forEach((img, i) => {
                const marcador = '{{img:' + i + '}}';
                const esGif = img.tipo === 'gif' || (img.ruta && img.ruta.endsWith('.gif'));
                const cls = esGif ? 'cc-article-img cc-article-img--gif' : 'cc-article-img';
                const etiqueta = esGif ? '<span class="cc-gif-badge">Animación</span>' : '';
                const replazo = `<figure class="${cls}">
                    ${etiqueta}
                    <img src="${img.ruta}" alt="${img.descripcion || ''}" loading="lazy" class="cc-img-zoomable">
                    ${img.descripcion ? `<figcaption>${img.descripcion}</figcaption>` : ''}
                </figure>`;
                contenido = contenido.split(marcador).join(replazo);
            });
        }
        contenido = contenido.replace(/\{\{img:\d+\}\}/g, '');

        /* Videos */
        if (art.videos && art.videos.length > 0) {
            art.videos.forEach(vid => {
                contenido += `<div class="cc-article-video">
                    ${vid.titulo ? `<div class="cc-article-video-title">${vid.titulo}</div>` : ''}
                    <video controls preload="metadata">
                        <source src="${vid.ruta}" type="video/mp4">
                        Tu navegador no puede reproducir videos.
                    </video>
                    <button class="cc-video-expand-btn" title="Cambiar tamaño del video" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                </div>`;
            });
        }

        return contenido;
    }

    /* ---- Botón de agrandar/achicar video ---- */
    main.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.cc-video-expand-btn');
        if (!btn) return;
        const video = btn.parentElement.querySelector('video');
        if (video) video.classList.toggle('cc-video--grande');
    });

    /* ---- Zoom de imágenes (tocar para ampliar) ---- */
    function abrirZoomImagen(src, alt) {
        let overlay = document.getElementById('ccImgZoomOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ccImgZoomOverlay';
            overlay.className = 'cc-img-zoom-overlay';
            overlay.innerHTML = '<img alt="">';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', function () {
                overlay.classList.remove('cc-img-zoom-overlay--open');
            });
            document.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape') overlay.classList.remove('cc-img-zoom-overlay--open');
            });
        }
        overlay.querySelector('img').src = src;
        overlay.querySelector('img').alt = alt || '';
        overlay.classList.add('cc-img-zoom-overlay--open');
    }

    main.addEventListener('click', function (ev) {
        if (ev.target.classList && ev.target.classList.contains('cc-img-zoomable')) {
            abrirZoomImagen(ev.target.src, ev.target.alt);
        }
    });

    /* ---- Guardar cambios en el servidor ---- */
    async function guardarDatos() {
        const base = location.pathname.includes('/capacitacion') ? '/capacitacion' : '';
        const resp = await fetch(base + '/api/contenido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify(datos)
        });
        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || 'No se pudo guardar');
        }
    }

    /* ---- Subir archivos (arrastrar o botón) ---- */
    async function subirArchivo(file, modulo) {
        const base = location.pathname.includes('/capacitacion') ? '/capacitacion' : '';
        const form = new FormData();
        form.append('archivo', file);
        form.append('modulo', modulo || 'general');
        const resp = await fetch(base + '/api/archivos', {
            method: 'POST',
            headers: sessionHeaders(),
            body: form
        });
        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || 'No se pudo subir el archivo');
        }
        return resp.json();
    }

    function insertarEnCursor(div, texto) {
        div.focus();
        document.execCommand('insertText', false, texto);
    }

    async function agregarArchivoAObjetivo(file, modulo) {
        if (!objetivoEdicion) return;
        const resultado = await subirArchivo(file, modulo);
        if (resultado.tipo === 'imagen') {
            const marcador = '{{img:' + siguienteIndiceImagen(objetivoEdicion) + '}}';
            objetivoEdicion.imagenes = objetivoEdicion.imagenes || [];
            objetivoEdicion.imagenes.push({ ruta: resultado.ruta, descripcion: file.name.replace(/\.[^.]+$/, '') });
            insertarEnCursor(textareaEditor, marcador);
        } else {
            const marcador = '{{vid:' + siguienteIndiceVideo(objetivoEdicion) + '}}';
            objetivoEdicion.videos = objetivoEdicion.videos || [];
            objetivoEdicion.videos.push({ ruta: resultado.ruta, titulo: file.name.replace(/\.[^.]+$/, '') });
            insertarEnCursor(textareaEditor, '\n' + marcador + '\n');
        }
    }

    function siguienteIndiceImagen(art) {
        const contenido = art.contenido || '';
        let max = -1;
        (contenido.match(/\{\{img:\d+\}\}/g) || []).forEach(m => {
            const n = parseInt(m.replace(/\D/g, ''), 10);
            if (n > max) max = n;
        });
        return max + 1;
    }

    function siguienteIndiceVideo(art) {
        let max = -1;
        (art.videos || []).forEach((v, i) => { if (i > max) max = i; });
        return max + 1;
    }

    /* ---- Editor visual (tipo Word): edita el formato, no el código ---- */
    function limpiarHtmlContenido(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html || '';
        temp.querySelectorAll('div, span, font').forEach(el => {
            while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
            el.remove();
        });
        temp.querySelectorAll('*').forEach(el => {
            [...el.attributes].forEach(attr => {
                if (!['href', 'src', 'alt', 'title'].includes(attr.name)) el.removeAttribute(attr.name);
            });
        });
        return temp.innerHTML;
    }

    function comandoFormato(comando, valor) {
        document.execCommand(comando, false, valor || null);
        textareaEditor.focus();
    }

    function aplicarFormatoBloque(div, etiqueta) {
        const tag = etiqueta === 'titulo' ? 'H2' : etiqueta === 'subtitulo' ? 'H3' : 'P';
        comandoFormato('formatBlock', tag);
    }

    let objetivoEdicion = null;
    let textareaEditor = null;

    /* ---- Formato tipo Word (comandos visuales) ---- */

    /* ---- Insertar imagen/video con vista previa ---- */
    async function manejarArchivosSeleccionados(files, modulo) {
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
            try {
                await agregarArchivoAObjetivo(file, modulo);
            } catch (err) {
                alert('No se pudo subir ' + file.name + ': ' + err.message);
            }
        }
        actualizarVistaPreviaEditor();
    }

    function actualizarVistaPreviaEditor() {
        const cont = document.getElementById('ccEditMediaPreview');
        if (!cont || !objetivoEdicion) return;
        let html = '';
        (objetivoEdicion.imagenes || []).forEach((img, i) => {
            const usada = (objetivoEdicion.contenido || '').includes('{{img:' + i + '}}');
            html += `<div class="cc-edit-media-thumb">
                <img src="${img.ruta}" alt="" title="${img.descripcion || ''}">
                <span class="cc-edit-media-name">${img.descripcion || 'imagen ' + (i + 1)}</span>
                ${usada ? '' : '<span class="cc-edit-media-warn">no colocada en el texto</span>'}
            </div>`;
        });
        (objetivoEdicion.videos || []).forEach((vid, i) => {
            const usada = (objetivoEdicion.contenido || '').includes('{{vid:' + i + '}}');
            html += `<div class="cc-edit-media-thumb cc-edit-media-thumb--video">
                <video src="${vid.ruta}" muted preload="metadata"></video>
                <span class="cc-edit-media-name">${vid.titulo || 'video ' + (i + 1)}</span>
                ${usada ? '' : '<span class="cc-edit-media-warn">no colocado en el texto</span>'}
            </div>`;
        });
        cont.innerHTML = html || '<span class="cc-edit-media-empty">Aún no hay imágenes ni videos. Arrástralos o usa el botón de arriba.</span>';
    }

    function configurarArrastre(textarea, modulo) {
        textarea.addEventListener('dragover', function (ev) { ev.preventDefault(); textarea.classList.add('cc-edit-dragover'); });
        textarea.addEventListener('dragleave', function () { textarea.classList.remove('cc-edit-dragover'); });
        textarea.addEventListener('drop', function (ev) {
            ev.preventDefault();
            textarea.classList.remove('cc-edit-dragover');
            if (!objetivoEdicion) return;
            manejarArchivosSeleccionados(ev.dataTransfer?.files || [], modulo);
        });
    }

    function abrirEditor(e) {
        const btn = e.currentTarget;
        const catId = btn.dataset.catId;
        const artId = btn.dataset.artId;
        let objetivo = null;
        let tipoObjetivo = 'articulo';

        if (artId) {
            objetivo = datos.articulos.find(a => a.id === artId && a.categoria === catId);
            if (!objetivo) return;
        } else {
            objetivo = datos.categorias.find(c => c.id === catId);
            if (!objetivo) return;
            tipoObjetivo = 'categoria';
        }

        editando = true;
        objetivoEdicion = objetivo;
        const overlay = document.getElementById('editOverlay');
        const editor = document.getElementById('editTextarea');
        textareaEditor = editor;
        const titulo = overlay.querySelector('h3');
        editor.innerHTML = objetivo.contenido || '<p></p>';
        titulo.textContent = tipoObjetivo === 'categoria'
            ? `Editar módulo: ${objetivo.nombre}`
            : 'Editar artículo';
        overlay.classList.add('cc-edit-overlay--open');

        if (!editor.dataset.dragReady) {
            editor.dataset.dragReady = '1';
            configurarArrastre(editor, objetivo.categoria || catId || 'general');
        }

        /* Botón de insertar imagen/video (abre el selector de archivos) */
        document.getElementById('editInsertMedia').onclick = function () {
            document.getElementById('editMediaFile').click();
        };
        document.getElementById('editMediaFile').onchange = function () {
            manejarArchivosSeleccionados(this.files, objetivo.categoria || catId || 'general');
            this.value = '';
        };

        /* Barra de formato tipo Word (comandos visuales, sin código) */
        document.getElementById('fmtBloque').onchange = function () {
            if (this.value) aplicarFormatoBloque(editor, this.value);
            this.selectedIndex = 0;
        };
        document.getElementById('fmtNegrita').onclick = function () { comandoFormato('bold'); };
        document.getElementById('fmtCursiva').onclick = function () { comandoFormato('italic'); };
        document.getElementById('fmtLista').onclick = function () { comandoFormato('insertUnorderedList'); };

        document.getElementById('editClose').onclick = cerrarEditor;
        document.getElementById('editCancel').onclick = cerrarEditor;
        document.getElementById('editSave').onclick = async function () {
            objetivo.contenido = limpiarHtmlContenido(editor.innerHTML);
            try {
                await guardarDatos();
                objetivoEdicion = null;
                cerrarEditor();
                if (tipoObjetivo === 'categoria') {
                    renderCategoria(catId);
                } else {
                    renderArticulo(catId, artId);
                }
            } catch (err) {
                alert('No se pudo guardar: ' + err.message);
            }
        };

        overlay.addEventListener('click', function handler(ev) {
            if (ev.target === overlay) {
                cerrarEditor();
                overlay.removeEventListener('click', handler);
            }
        });

        actualizarVistaPreviaEditor();
    }

    function cerrarEditor() {
        editando = false;
        objetivoEdicion = null;
        document.getElementById('editOverlay').classList.remove('cc-edit-overlay--open');
    }

    /* ---- Búsqueda con resultados desplegables (no cambia la página) ---- */
    const resultadosBox = document.getElementById('searchResults');

    function ocultarResultadosBusqueda() {
        if (resultadosBox) {
            resultadosBox.classList.remove('cc-search-results--open');
            resultadosBox.innerHTML = '';
        }
    }

    function extractoResumen(texto, termino) {
        const limpio = String(texto || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const pos = limpio.toLowerCase().indexOf(termino);
        if (pos === -1) return limpio.slice(0, 90);
        const desde = Math.max(0, pos - 30);
        return (desde > 0 ? '…' : '') + limpio.slice(desde, pos + termino.length + 60) + '…';
    }

    function buscarDesplegable(termino) {
        if (!datos || !resultadosBox) return;
        termino = termino.trim().toLowerCase();
        if (termino.length < 2) { ocultarResultadosBusqueda(); return; }

        const resultados = datos.articulos.filter(a => {
            const texto = (a.titulo + ' ' + (a.subtitulo || '') + ' ' + a.contenido).toLowerCase();
            return texto.includes(termino);
        }).slice(0, 8);

        let html = '';
        if (resultados.length === 0) {
            html = '<div class="cc-search-result-empty">No encontramos nada con esas palabras.</div>';
        } else {
            resultados.forEach(art => {
                const cat = datos.categorias.find(c => c.id === art.categoria);
                const resumen = extractoResumen((art.titulo + '. ' + art.subtitulo + ' ' + art.contenido), termino);
                html += `<a class="cc-search-result-item" href="#${art.categoria}/${art.id}">
                    <div class="cc-search-result-top">
                        <span class="cc-search-result-cat">${cat ? cat.nombre : ''}</span>
                        <span class="cc-search-result-title">${art.titulo}</span>
                    </div>
                    <div class="cc-search-result-sub">${resumen}</div>
                </a>`;
            });
        }
        resultadosBox.innerHTML = html;
        resultadosBox.classList.add('cc-search-results--open');
    }

    searchInput.addEventListener('input', function () { buscarDesplegable(this.value); });
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { this.value = ''; ocultarResultadosBusqueda(); this.blur(); }
    });
    document.addEventListener('click', function (ev) {
        if (resultadosBox && !ev.target.closest('.cc-search-wrap')) {
            ocultarResultadosBusqueda();
        }
    });
    if (resultadosBox) {
        resultadosBox.addEventListener('click', function () {
            searchInput.value = '';
            ocultarResultadosBusqueda();
        });
    }

    /* ---- Eventos ---- */
    window.addEventListener('hashchange', () => { if (datos) renderizar(); });

    /* ---- Tema Apple fijo ---- */
    function aplicarTemaApple() {
        document.body.classList.add('cc-apple-theme');
    }

    (function configurarTemaApple() {
        aplicarTemaApple();
    })();

    /* ---- Iniciar ---- */
    (async function iniciar() {
        await cargarIconosDashboard();
        cargarDatos();
    })();
})();
