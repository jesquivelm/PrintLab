// Abre la vista previa del Reprogramador (reprogramar.html) a pantalla completa.
// Se usa desde el Gantt (Capacidad Finita) y desde Seguimiento (Recalcular).
(function () {
  let capa = null;
  let alAplicar = null;
  function cerrar() { if (capa) { capa.remove(); capa = null; } }
  window.addEventListener('message', (evento) => {
    if (evento.origin !== window.location.origin) return;
    const tipo = evento.data && evento.data.tipo;
    if (tipo === 'reprogramar-cerrar') cerrar();
    if (tipo === 'reprogramar-aplicado' && typeof alAplicar === 'function') alAplicar();
  });
  window.abrirReprogramador = function (onAplicado) {
    alAplicar = onAplicado || null;
    cerrar();
    capa = document.createElement('div');
    capa.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.45);display:flex;align-items:stretch;justify-content:center;padding:18px';
    capa.innerHTML = '<div style="position:relative;flex:1;max-width:1360px;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35);background:#fff">'
      + '<button type="button" aria-label="Cerrar" style="position:absolute;top:10px;right:12px;z-index:2;width:32px;height:32px;border-radius:50%;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:16px">✕</button>'
      + '<iframe src="/planificacion/reprogramar.html" title="Reprogramar producción" style="width:100%;height:100%;border:0;display:block"></iframe></div>';
    capa.querySelector('button').addEventListener('click', cerrar);
    capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
    document.body.appendChild(capa);
  };
})();
