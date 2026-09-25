/* ColorCapture — control compacto para obtener un color digital.
 *
 * UI: un campo HEX + un boton de cuentagotas (icono del catalogo central, clave
 * `colorCapturaPantalla`) + una muestra nativa <input type=color>. Sin paso de
 * "aplicar": al escribir un HEX (Enter/blur), elegir en la muestra o capturar de
 * pantalla, se emite el color de inmediato.
 *
 * Estrategia de captura (Nivel C acordado):
 *   Principal  EyeDropper API           -> cuentagotas global del navegador (Chrome/Edge).
 *              o NSColorPanel (macOS)    -> selector del SO con lupa de pantalla (Safari).
 *   Alterna    Lupa avanzada            -> cuentagotas propio via getDisplayMedia, con
 *                                          lectura HEX/RGB en vivo. Pide compartir pantalla.
 *   Fallback   HEX / RGB manual.
 *
 * No crea formulas ni toca la BD: solo entrega un objeto de color.
 *
 *   const cc = ColorCapture.crear(contenedor, {
 *     diagnostico:false,          // o ?diag=1
 *     compact:true,
 *     onColor(color){ ... }
 *   });
 *
 * color: { hex, rgb:{r,g,b}, espacio, alpha, origen, metodo, capturadoEn, [notaConversion] }
 *   metodo: 'eyedropper' | 'os-color-panel' | 'loupe-avanzada' | 'html-picker' | 'manual'
 */
(function (global) {
  'use strict';

  var ESTILOS_ID = 'color-capture-estilos';
  var ICONO_CLAVE = 'colorCapturaPantalla';
  var ICONO_INLINE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.42-1.42-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.06-8.06 1.42 1.42 1.41-1.41-1.42-1.42 3.12-3.12a1 1 0 0 0-.01-1.41zM6.92 19H5v-1.92l8.06-8.06 1.92 1.92L6.92 19z"/></svg>';

  var _cfgPromise = null;
  function cargarIconoCaptura() {
    if (!_cfgPromise) {
      _cfgPromise = fetch('/api/config/general')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    }
    return _cfgPromise.then(function (cfg) {
      return (cfg && cfg.icons && cfg.icons[ICONO_CLAVE]) || null;
    });
  }
  function pintarIcono(btn, valor) {
    if (valor && /^data:image\/svg/.test(String(valor))) {
      btn.innerHTML = '<span class="cc2-ico cc2-ico-mask" style="-webkit-mask-image:url(\'' + valor + '\');mask-image:url(\'' + valor + '\')"></span>';
    } else if (valor && /^data:image/.test(String(valor))) {
      btn.innerHTML = '<img class="cc2-ico-img" alt="" src="' + valor + '">';
    } else {
      btn.innerHTML = ICONO_INLINE;
    }
  }

  function inyectarEstilos() {
    if (document.getElementById(ESTILOS_ID)) return;
    var s = document.createElement('style');
    s.id = ESTILOS_ID;
    s.textContent = [
      '.cc2{display:flex;flex-direction:column;gap:6px;max-width:360px}',
      '.cc2-field{display:inline-flex;align-items:center;gap:6px}',
      '.cc2-hex{width:120px;border:1px solid var(--app-border);border-radius:6px;padding:6px 8px;font-size:13px;font-variant-numeric:tabular-nums;background:var(--app-surface);color:var(--app-text)}',
      '.cc2-hex:focus{outline:none;border-color:var(--app-primary)}',
      '.cc2-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);color:var(--app-text-muted);cursor:pointer;padding:0}',
      '.cc2-btn:hover{border-color:var(--app-primary);color:var(--app-primary)}',
      '.cc2-btn[disabled]{opacity:.5;cursor:not-allowed}',
      '.cc2-ico{display:inline-block;width:16px;height:16px}',
      '.cc2-ico-mask{background-color:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}',
      '.cc2-ico-img{width:16px;height:16px;object-fit:contain}',
      '.cc2-swatch{width:30px;height:30px;border:1px solid var(--app-border);border-radius:6px;padding:2px;background:var(--app-surface);cursor:pointer}',
      '.cc2-link{align-self:flex-start;background:none;border:0;padding:0;font-size:12px;color:var(--app-primary);cursor:pointer;text-decoration:underline}',
      '.cc2-nota{font-size:11px;color:var(--app-text-muted);line-height:1.4}',
      '.cc2-diag{font-size:11px;border-top:1px dashed var(--app-border);padding-top:8px;color:var(--app-text-muted)}',
      '.cc2-diag dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0}',
      '.cc2-diag dt{font-weight:600}.cc2-diag dd{margin:0;font-variant-numeric:tabular-nums}',
      // Lupa avanzada
      '.cc2-loupe-overlay{position:fixed;inset:0;z-index:99999;background:rgba(10,12,16,.82);cursor:crosshair}',
      '.cc2-loupe-canvas{position:absolute;inset:0;width:100%;height:100%}',
      '.cc2-loupe-head{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:6px 12px;border-radius:999px;pointer-events:none}',
      '.cc2-loupe-lens{position:absolute;width:140px;height:140px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 4px 18px rgba(0,0,0,.5);pointer-events:none}',
      '.cc2-loupe-lens canvas{display:block}',
      '.cc2-loupe-panel{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#fff;color:#1a1a1a;border-radius:10px;padding:10px 14px;box-shadow:0 6px 24px rgba(0,0,0,.35);font-size:13px}',
      '.cc2-loupe-chip{width:34px;height:34px;border-radius:7px;border:1px solid rgba(0,0,0,.15)}',
      '.cc2-loupe-hex{font-weight:700;letter-spacing:.02em;min-width:84px}',
      '.cc2-loupe-rgb{color:#555;font-variant-numeric:tabular-nums;min-width:118px}',
      '.cc2-loupe-cancel{border:1px solid rgba(0,0,0,.18);background:#f4f4f5;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── Deteccion de capacidades ───────────────────────────────────────────
  function detectar() {
    var ua = navigator.userAgent || '';
    var uaData = navigator.userAgentData || null;

    var so = 'Desconocido';
    if (uaData && uaData.platform) so = uaData.platform;
    else if (/Windows/i.test(ua)) so = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) so = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) so = 'iOS';
    else if (/Android/i.test(ua)) so = 'Android';
    else if (/Linux/i.test(ua)) so = 'Linux';

    var navegador = 'Desconocido';
    var version = '';
    if (uaData && Array.isArray(uaData.brands)) {
      var real = uaData.brands.filter(function (b) { return !/Not.?A.?Brand/i.test(b.brand); });
      var elegido = real.find(function (b) { return /Edge/i.test(b.brand); })
        || real.find(function (b) { return /Opera|OPR/i.test(b.brand); })
        || real.find(function (b) { return /Google Chrome/i.test(b.brand); })
        || real.find(function (b) { return /Chromium/i.test(b.brand); })
        || real[0];
      if (elegido) { navegador = elegido.brand; version = elegido.version || ''; }
    }
    if (navegador === 'Desconocido' || /Chromium/i.test(navegador)) {
      if (/Edg\//.test(ua)) { navegador = 'Microsoft Edge'; version = (ua.match(/Edg\/([\d.]+)/) || [])[1] || version; }
      else if (/OPR\//.test(ua)) { navegador = 'Opera'; version = (ua.match(/OPR\/([\d.]+)/) || [])[1] || version; }
      else if (/Firefox\//.test(ua)) { navegador = 'Firefox'; version = (ua.match(/Firefox\/([\d.]+)/) || [])[1] || ''; }
      else if (/Version\/[\d.]+.*(Safari)/.test(ua) && !/Chrome|Chromium|CriOS/.test(ua)) { navegador = 'Safari'; version = (ua.match(/Version\/([\d.]+)/) || [])[1] || ''; }
      else if (/CriOS\//.test(ua)) { navegador = 'Google Chrome (iOS)'; version = (ua.match(/CriOS\/([\d.]+)/) || [])[1] || ''; }
      else if (/Chrome\//.test(ua) && navegador === 'Desconocido') { navegador = 'Google Chrome'; version = (ua.match(/Chrome\/([\d.]+)/) || [])[1] || ''; }
    }

    var eyeDropper = (typeof global.EyeDropper === 'function');
    var probe = document.createElement('input');
    probe.setAttribute('type', 'color');
    var inputColor = (probe.type === 'color');
    var inputP3 = ('colorSpace' in probe);
    var alpha = false;
    try { probe.setAttribute('alpha', ''); alpha = ('alpha' in probe); } catch (e) { alpha = false; }
    var gamutP3 = false;
    try {
      gamutP3 = (global.matchMedia && global.matchMedia('(color-gamut: p3)').matches) ||
           (global.CSS && CSS.supports && CSS.supports('color', 'color(display-p3 1 0 0)'));
    } catch (e) { gamutP3 = false; }
    var displayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    var secureContext = !!global.isSecureContext;

    var capturaGlobal = eyeDropper || (so === 'macOS' && inputColor) || displayMedia;
    var metodoPreferido = eyeDropper ? 'eyedropper'
      : (so === 'macOS' && inputColor) ? 'os-color-panel'
      : displayMedia ? 'loupe-avanzada'
      : inputColor ? 'html-picker'
      : 'manual';

    return {
      so: so, navegador: navegador, version: version,
      eyeDropper: eyeDropper, inputColor: inputColor, inputP3: inputP3, gamutP3: gamutP3, alpha: alpha,
      displayMedia: displayMedia, secureContext: secureContext,
      capturaGlobal: capturaGlobal, metodoPreferido: metodoPreferido
    };
  }

  // ── Conversiones ──────────────────────────────────────────────────────
  function normalizarHex(v) {
    if (typeof v !== 'string') return null;
    var h = v.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map(function (c) { return c + c; }).join('');
    if (/^[0-9a-fA-F]{8}$/.test(h)) h = h.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return '#' + h.toUpperCase();
  }
  function hexARgb(hex) {
    var h = normalizarHex(hex);
    if (!h) return null;
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
  }
  function rgbAHex(r, g, b) {
    function c(x) { x = Math.max(0, Math.min(255, Math.round(Number(x) || 0))); return ('0' + x.toString(16)).slice(-2); }
    return ('#' + c(r) + c(g) + c(b)).toUpperCase();
  }
  function construirColor(hex, extra) {
    var rgb = hexARgb(hex);
    if (!rgb) return null;
    var base = { hex: normalizarHex(hex), rgb: rgb, espacio: 'sRGB', alpha: 1, origen: 'manual', metodo: 'manual', capturadoEn: new Date().toISOString() };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
    return base;
  }
  function nuevoError(tipo, mensaje) { var e = new Error(mensaje); e.ccTipo = tipo; return e; }

  // ── Nivel 1: EyeDropper del navegador ─────────────────────────────────
  function capturarEyeDropper() {
    return new Promise(function (resolve, reject) {
      if (typeof global.EyeDropper !== 'function') { reject(nuevoError('sin-soporte', 'EyeDropper no disponible')); return; }
      var ed;
      try { ed = new global.EyeDropper(); } catch (e) { reject(nuevoError('error', (e && e.message) || 'No fue posible iniciar el cuentagotas')); return; }
      var p;
      try { p = ed.open(); } catch (e) { reject(nuevoError('error', (e && e.message) || 'No fue posible abrir el cuentagotas')); return; }
      p.then(function (res) {
        var hex = normalizarHex(res && res.sRGBHex);
        if (!hex) { reject(nuevoError('error', 'El cuentagotas no devolvio un color valido')); return; }
        resolve(construirColor(hex, { espacio: 'sRGB', origen: 'pantalla', metodo: 'eyedropper' }));
      }).catch(function (e) {
        if (e && (e.name === 'AbortError' || /abort/i.test(e.message || ''))) { reject(nuevoError('cancelado', 'Captura cancelada')); return; }
        reject(nuevoError('error', (e && e.message) || 'Error en el cuentagotas'));
      });
    });
  }

  // ── Nivel 2/3: <input type=color> (en macOS abre el NSColorPanel con lupa) ──
  function capturarInputColor(opciones) {
    opciones = opciones || {};
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'color';
      if (input.type !== 'color') { reject(nuevoError('sin-soporte', 'El selector de color no esta disponible')); return; }
      input.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px';
      input.value = normalizarHex(opciones.inicial) ? normalizarHex(opciones.inicial).toLowerCase() : '#ffffff';
      var espacio = 'sRGB';
      if (opciones.p3 && ('colorSpace' in input)) {
        try { input.setAttribute('colorspace', 'display-p3'); input.colorSpace = 'display-p3'; espacio = 'display-p3'; } catch (e) { espacio = 'sRGB'; }
      }
      var resuelto = false;
      function terminar(hex) {
        if (resuelto) return;
        resuelto = true; limpiar();
        var color = construirColor(hex, {
          espacio: espacio,
          origen: (opciones.metodo === 'os-color-panel') ? 'pantalla' : 'selector',
          metodo: opciones.metodo || 'html-picker'
        });
        if (espacio === 'display-p3') color.notaConversion = 'Valor del selector normalizado a HEX sRGB para el emparejamiento.';
        resolve(color);
      }
      function onChange() { var h = normalizarHex(input.value); if (h) terminar(h); }
      function onFocusVuelta() { setTimeout(function () { if (!resuelto) { resuelto = true; limpiar(); reject(nuevoError('cancelado', 'Selector cerrado sin elegir color')); } }, 400); }
      function limpiar() {
        input.removeEventListener('change', onChange);
        input.removeEventListener('input', onChange);
        global.removeEventListener('focus', onFocusVuelta, true);
        if (input.parentNode) input.parentNode.removeChild(input);
      }
      input.addEventListener('change', onChange);
      input.addEventListener('input', onChange);
      document.body.appendChild(input);
      try { input.showPicker ? input.showPicker() : input.click(); } catch (e) { input.click(); }
      global.addEventListener('focus', onFocusVuelta, true);
    });
  }

  // ── Alterna: lupa avanzada (getDisplayMedia) con lectura en vivo ──────
  function capturarLupeAvanzada() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
      return Promise.reject(nuevoError('sin-soporte', 'Compartir pantalla no disponible'));
    }
    return navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false })
      .catch(function () { throw nuevoError('cancelado', 'Compartir pantalla cancelado'); })
      .then(function (stream) {
        return new Promise(function (resolve, reject) {
          var video = document.createElement('video');
          video.autoplay = true; video.muted = true; video.playsInline = true;
          video.srcObject = stream;

          var overlay = document.createElement('div');
          overlay.className = 'cc2-loupe-overlay';
          overlay.innerHTML = [
            '<canvas class="cc2-loupe-canvas"></canvas>',
            '<div class="cc2-loupe-head">Haz clic en el color que quieras &middot; Esc para cancelar</div>',
            '<div class="cc2-loupe-lens" hidden><canvas width="140" height="140"></canvas></div>',
            '<div class="cc2-loupe-panel">',
            '  <span class="cc2-loupe-chip"></span>',
            '  <span class="cc2-loupe-hex">Mueve el cursor sobre la imagen</span>',
            '  <span class="cc2-loupe-rgb"></span>',
            '  <button type="button" class="cc2-loupe-cancel">Cancelar</button>',
            '</div>'
          ].join('');
          document.body.appendChild(overlay);

          var canvas = overlay.querySelector('.cc2-loupe-canvas');
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          var lens = overlay.querySelector('.cc2-loupe-lens');
          var lensCtx = lens.querySelector('canvas').getContext('2d');
          var chip = overlay.querySelector('.cc2-loupe-chip');
          var hexEl = overlay.querySelector('.cc2-loupe-hex');
          var rgbEl = overlay.querySelector('.cc2-loupe-rgb');

          var raf = 0, cerrado = false, vw = 0, vh = 0, dw = 0, dh = 0, ox = 0, oy = 0;

          function ajustar() {
            canvas.width = overlay.clientWidth;
            canvas.height = overlay.clientHeight;
            vw = video.videoWidth; vh = video.videoHeight;
            if (!vw || !vh) return;
            var escala = Math.min(canvas.width / vw, canvas.height / vh);
            dw = vw * escala; dh = vh * escala;
            ox = (canvas.width - dw) / 2; oy = (canvas.height - dh) / 2;
          }
          function dibujar() {
            if (cerrado) return;
            if (video.videoWidth && video.videoWidth !== vw) ajustar();
            if (vw) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(video, ox, oy, dw, dh); }
            raf = requestAnimationFrame(dibujar);
          }
          function pixelEn(cx, cy) {
            var rect = canvas.getBoundingClientRect();
            var x = cx - rect.left, y = cy - rect.top;
            if (!vw || x < ox || x > ox + dw || y < oy || y > oy + dh) return null;
            var d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
            return { x: x, y: y, r: d[0], g: d[1], b: d[2] };
          }
          function onMove(ev) {
            var p = pixelEn(ev.clientX, ev.clientY);
            if (!p) { lens.hidden = true; return; }
            var hex = rgbAHex(p.r, p.g, p.b);
            chip.style.background = hex;
            hexEl.textContent = hex;
            rgbEl.textContent = 'RGB ' + p.r + ' / ' + p.g + ' / ' + p.b;
            var zoom = 8, size = 140, region = size / zoom;
            lensCtx.imageSmoothingEnabled = false;
            lensCtx.clearRect(0, 0, size, size);
            try { lensCtx.drawImage(canvas, p.x - region / 2, p.y - region / 2, region, region, 0, 0, size, size); } catch (e) {}
            lensCtx.strokeStyle = 'rgba(0,0,0,.45)';
            lensCtx.strokeRect(size / 2 - zoom / 2, size / 2 - zoom / 2, zoom, zoom);
            var lx = p.x + 24, ly = p.y + 24;
            if (lx + 140 > canvas.width) lx = p.x - 164;
            if (ly + 140 > canvas.height) ly = p.y - 164;
            lens.style.left = lx + 'px'; lens.style.top = ly + 'px';
            lens.hidden = false;
          }
          function onClick(ev) {
            var p = pixelEn(ev.clientX, ev.clientY);
            if (!p) return;
            finalizar(rgbAHex(p.r, p.g, p.b));
          }
          function onKey(ev) { if (ev.key === 'Escape') cancelar(); }
          function limpiar() {
            cerrado = true;
            cancelAnimationFrame(raf);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('click', onClick);
            global.removeEventListener('keydown', onKey);
            global.removeEventListener('resize', ajustar);
            try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          }
          function finalizar(hex) {
            if (cerrado) return;
            limpiar();
            resolve(construirColor(hex, { espacio: 'sRGB', origen: 'pantalla', metodo: 'loupe-avanzada' }));
          }
          function cancelar() { if (cerrado) return; limpiar(); reject(nuevoError('cancelado', 'Captura cancelada')); }

          overlay.querySelector('.cc2-loupe-cancel').addEventListener('click', cancelar);
          global.addEventListener('keydown', onKey);
          global.addEventListener('resize', ajustar);
          canvas.addEventListener('mousemove', onMove);
          canvas.addEventListener('click', onClick);
          var track = stream.getVideoTracks()[0];
          if (track) track.addEventListener('ended', cancelar);

          video.play().then(function () { ajustar(); dibujar(); }).catch(function () { dibujar(); });
        });
      });
  }

  // ── Componente compacto ──────────────────────────────────────────────
  function crear(contenedor, opciones) {
    if (typeof contenedor === 'string') contenedor = document.querySelector(contenedor);
    if (!contenedor) throw new Error('ColorCapture.crear: contenedor no encontrado');
    inyectarEstilos();

    opciones = opciones || {};
    var diag = opciones.diagnostico;
    try { if (!diag && new URLSearchParams(global.location.search).has('diag')) diag = true; } catch (e) {}

    var caps = detectar();
    var estado = { color: null, ultimoMetodo: '-', ultimoError: '-', cancelaciones: 0 };

    var raiz = document.createElement('div');
    raiz.className = 'cc2';
    raiz.innerHTML = [
      '<span class="cc2-field">',
      '  <input type="text" class="cc2-hex" data-cc="hex" placeholder="#F4512A" maxlength="9" aria-label="Color HEX" autocomplete="off" spellcheck="false">',
      '  <button type="button" class="cc2-btn" data-cc="capturar" title="Capturar color de pantalla" aria-label="Capturar color de pantalla"></button>',
      '  <input type="color" class="cc2-swatch" data-cc="swatch" value="#ffffff" aria-label="Selector de color">',
      '</span>',
      '<button type="button" class="cc2-link" data-cc="avanzada" hidden>Lupa avanzada</button>',
      '<div class="cc2-nota">El color es una referencia digital para buscar una tinta o formula compatible; no equivale a la tinta fisica, un Pantone fisico ni una prueba de impresion.</div>',
      diag ? '<div class="cc2-diag" data-cc="diag"></div>' : ''
    ].join('');
    contenedor.appendChild(raiz);

    var $ = function (sel) { return raiz.querySelector('[data-cc="' + sel + '"]'); };
    var btn = $('capturar'), hex = $('hex'), swatch = $('swatch'), avanzada = $('avanzada');

    pintarIcono(btn, null);
    cargarIconoCaptura().then(function (v) { if (v) pintarIcono(btn, v); });

    if (!caps.capturaGlobal) btn.disabled = true;
    if (caps.displayMedia) avanzada.hidden = false;
    if (!caps.inputColor) swatch.style.display = 'none';

    function emitir(color) {
      if (!color) return;
      estado.color = color;
      hex.value = color.hex;
      try { swatch.value = color.hex.toLowerCase(); } catch (e) {}
      refrescarDiag();
      if (typeof opciones.onColor === 'function') opciones.onColor(color);
    }
    function manejarError(e) {
      if (e && e.ccTipo === 'cancelado') { estado.cancelaciones++; estado.ultimoError = 'Cancelado por el usuario'; refrescarDiag(); return; }
      estado.ultimoError = (e && e.message) || 'Error desconocido';
      refrescarDiag();
      if (caps.displayMedia && !avanzada.hidden) avanzada.focus();
    }

    async function accionCapturar() {
      btn.disabled = true;
      try {
        var color;
        if (caps.eyeDropper) { estado.ultimoMetodo = 'eyedropper'; color = await capturarEyeDropper(); }
        else if (caps.so === 'macOS' && caps.inputColor) { estado.ultimoMetodo = 'os-color-panel'; color = await capturarInputColor({ inicial: estado.color && estado.color.hex, p3: caps.inputP3, metodo: 'os-color-panel' }); }
        else if (caps.displayMedia) { estado.ultimoMetodo = 'loupe-avanzada'; color = await capturarLupeAvanzada(); }
        else { estado.ultimoMetodo = 'html-picker'; color = await capturarInputColor({ inicial: estado.color && estado.color.hex, p3: caps.inputP3, metodo: 'html-picker' }); }
        estado.ultimoError = '-';
        emitir(color);
      } catch (e) { manejarError(e); }
      finally { btn.disabled = !caps.capturaGlobal ? true : false; }
    }
    async function accionAvanzada() {
      avanzada.disabled = true;
      try {
        estado.ultimoMetodo = 'loupe-avanzada';
        var color = await capturarLupeAvanzada();
        estado.ultimoError = '-';
        emitir(color);
      } catch (e) { manejarError(e); }
      finally { avanzada.disabled = false; }
    }
    function aplicarHex() {
      var h = normalizarHex(hex.value);
      if (!h) { hex.focus(); return; }
      estado.ultimoMetodo = 'manual'; estado.ultimoError = '-';
      emitir(construirColor(h, { espacio: 'sRGB', origen: 'manual', metodo: 'manual' }));
    }
    function aplicarSwatch() {
      var h = normalizarHex(swatch.value);
      if (!h) return;
      estado.ultimoMetodo = (caps.so === 'macOS') ? 'os-color-panel' : 'html-picker';
      estado.ultimoError = '-';
      emitir(construirColor(h, {
        espacio: 'sRGB',
        origen: (caps.so === 'macOS') ? 'pantalla' : 'selector',
        metodo: estado.ultimoMetodo
      }));
    }

    function refrescarDiag() {
      var d = $('diag');
      if (!d) return;
      d.innerHTML = '<dl>'
        + fila('Sistema operativo', caps.so)
        + fila('Navegador', caps.navegador + (caps.version ? ' ' + caps.version : ''))
        + fila('Contexto seguro', caps.secureContext ? 'si' : 'NO (EyeDropper deshabilitado fuera de localhost/https)')
        + fila('EyeDropper', caps.eyeDropper ? 'disponible' : 'no disponible')
        + fila('Selector HTML', caps.inputColor ? 'disponible' : 'no disponible')
        + fila('Lupa avanzada (getDisplayMedia)', caps.displayMedia ? 'disponible' : 'no disponible')
        + fila('Pantalla P3 (gamut)', caps.gamutP3 ? 'si' : 'no')
        + fila('Selector P3 (colorspace)', caps.inputP3 ? 'si' : 'no')
        + fila('Alpha en selector', caps.alpha ? 'si' : 'no')
        + fila('Captura global', caps.capturaGlobal ? 'disponible' : 'no disponible')
        + fila('Metodo preferido', caps.metodoPreferido)
        + fila('Ultimo metodo usado', estado.ultimoMetodo)
        + fila('Ultimo resultado', estado.color ? (estado.color.hex + ' (' + estado.color.espacio + ' / ' + estado.color.metodo + ')') : '-')
        + fila('Ultimo error', estado.ultimoError)
        + fila('Cancelaciones', String(estado.cancelaciones))
        + '</dl>';
    }
    function fila(k, v) { return '<dt>' + k + '</dt><dd>' + String(v).replace(/[<>&]/g, '') + '</dd>'; }

    btn.addEventListener('click', accionCapturar);
    avanzada.addEventListener('click', accionAvanzada);
    swatch.addEventListener('input', aplicarSwatch);
    hex.addEventListener('change', aplicarHex);
    hex.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); aplicarHex(); } });
    refrescarDiag();

    return {
      capacidades: caps,
      getColor: function () { return estado.color; },
      setColor: function (h) { var c = construirColor(h); if (c) emitir(c); },
      destruir: function () { if (raiz.parentNode) raiz.parentNode.removeChild(raiz); }
    };
  }

  // Modo "solo logica": corre la cascada de captura (EyeDropper -> panel del SO -> lupa
  // avanzada -> selector) y devuelve una promesa con el color. Sin UI propia salvo la lupa.
  function capturar(opciones) {
    opciones = opciones || {};
    inyectarEstilos();
    var caps = detectar();
    if (caps.eyeDropper) return capturarEyeDropper();
    if (caps.so === 'macOS' && caps.inputColor) return capturarInputColor({ inicial: opciones.inicial, p3: caps.inputP3, metodo: 'os-color-panel' });
    if (caps.displayMedia) return capturarLupeAvanzada();
    if (caps.inputColor) return capturarInputColor({ inicial: opciones.inicial, p3: caps.inputP3, metodo: 'html-picker' });
    return Promise.reject(nuevoError('sin-soporte', 'Sin metodo de captura disponible'));
  }

  // Pinta el icono del catalogo (clave colorCapturaPantalla) dentro de un boton ya existente,
  // con SVG de respaldo inmediato mientras llega la config.
  function pintarIconoEn(btn) {
    if (!btn) return;
    inyectarEstilos();
    pintarIcono(btn, null);
    cargarIconoCaptura().then(function (v) { if (v) pintarIcono(btn, v); });
  }

  global.ColorCapture = {
    crear: crear, capturar: capturar, pintarIconoEn: pintarIconoEn, detectar: detectar,
    normalizarHex: normalizarHex, hexARgb: hexARgb, rgbAHex: rgbAHex
  };
})(window);
