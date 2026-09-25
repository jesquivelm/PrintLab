/* Selector de dirección por país (Mesoamérica, catálogo Open Admin Data).
   Al elegir un país, las etiquetas y los desplegables se adaptan a la
   estructura real de ese país:
     - 2 niveles: Departamento/Estado → Municipio (GT, HN, NI, MX) o Distrito → Localidad (BZ)
     - 3 niveles: Departamento → Distrito → Municipio (SV) · Provincia → Cantón → Distrito (CR) · Provincia → Distrito → Corregimiento (PA)
   Todos los desplegables usan el componente animado estándar (desplegable.js).

   Uso en el HTML: envolver los campos de dirección en un contenedor con
   data-direccion-pais="prefijo" y marcar cada campo con data-dir-pais / data-dir-n1 /
   data-dir-n2 / data-dir-n3 según corresponda. Ver orden-produccion.html y socios. */
(function () {
    'use strict';

    var CACHE_PAISES = null;
    var cachesHijos = new Map(); // clave: PAIS:idPadre → lista

    function escapar(texto) {
        var div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    async function cargarPaises() {
        if (CACHE_PAISES) return CACHE_PAISES;
        var respuesta = await fetch('/api/geografia/paises');
        if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo de países.');
        var datos = await respuesta.json();
        CACHE_PAISES = (datos.paises || []).filter(function (p) { return p.cargado; });
        return CACHE_PAISES;
    }

    async function cargarHijos(codigoPais, idPadre) {
        var clave = codigoPais + ':' + idPadre;
        if (cachesHijos.has(clave)) return cachesHijos.get(clave);
        var respuesta = await fetch('/api/geografia/' + encodeURIComponent(codigoPais) + '/hijos/' + encodeURIComponent(idPadre));
        if (!respuesta.ok) return [];
        var datos = await respuesta.json();
        var lista = datos.divisiones || [];
        cachesHijos.set(clave, lista);
        return lista;
    }

    async function cargarPrimerNivel(codigoPais) {
        var clave = codigoPais + ':raiz';
        if (cachesHijos.has(clave)) return cachesHijos.get(clave);
        var respuesta = await fetch('/api/geografia/' + encodeURIComponent(codigoPais) + '/primer-nivel');
        if (!respuesta.ok) return [];
        var datos = await respuesta.json();
        var lista = datos.divisiones || [];
        cachesHijos.set(clave, lista);
        return lista;
    }

    function llenarSelect(select, lista, nombreSeleccionado) {
        if (!select) return;
        var actual = nombreSeleccionado != null ? nombreSeleccionado : select.value;
        select.innerHTML = '<option value=""></option>' + lista.map(function (d) {
            return '<option value="' + escapar(d.nombre) + '" data-id-origen="' + escapar(d.id_origen) + '"' +
                (d.nombre === actual ? ' selected' : '') + '>' + escapar(d.nombre) + '</option>';
        }).join('');
        if (actual && lista.some(function (d) { return d.nombre === actual; })) select.value = actual;
        else select.value = '';
    }

    // Nombre de la división seleccionada (el value es el nombre).
    function valorSelect(select) {
        return select ? String(select.value || '').trim() : '';
    }

    function crearBloque(contenedor) {
        var prefijo = contenedor.dataset.direccionPais;
        var campos = {
            pais: contenedor.querySelector('[data-dir-pais]'),
            n1: contenedor.querySelector('[data-dir-n1]'),
            n2: contenedor.querySelector('[data-dir-n2]'),
            n3: contenedor.querySelector('[data-dir-n3]')
        };
        var etiquetas = {
            n1: contenedor.querySelector('[data-dir-etiqueta-n1]'),
            n2: contenedor.querySelector('[data-dir-etiqueta-n2]'),
            n3: contenedor.querySelector('[data-dir-etiqueta-n3]')
        };
        var grupos = {
            n2: contenedor.querySelector('[data-dir-grupo-n2]'),
            n3: contenedor.querySelector('[data-dir-grupo-n3]')
        };
        var info = { paises: [], niveles: [] };

        function mostrarNivel(nivel, visible) {
            if (grupos[nivel]) grupos[nivel].hidden = !visible;
            else if (campos[nivel] && campos[nivel].closest('.field')) campos[nivel].closest('.field').hidden = !visible;
        }

        function etiqueta(nivel, texto) {
            if (etiquetas[nivel]) etiquetas[nivel].textContent = texto;
        }

        // Aplica la estructura del país: etiquetas, visibilidad y niveles.
        function aplicarEstructura(codigoPais) {
            var pais = info.paises.find(function (p) { return p.codigo === codigoPais; });
            var niveles = pais ? pais.niveles : [];
            info.niveles = niveles;
            if (campos.n1) campos.n1.innerHTML = '<option value=""></option>';
            if (campos.n2) campos.n2.innerHTML = '<option value=""></option>';
            if (campos.n3) campos.n3.innerHTML = '<option value=""></option>';
            if (niveles.length >= 1) etiqueta('n1', niveles[0].nombreNivel);
            mostrarNivel('n2', niveles.length >= 2);
            if (niveles.length >= 2) etiqueta('n2', niveles[1].nombreNivel);
            mostrarNivel('n3', niveles.length >= 3);
            if (niveles.length >= 3) etiqueta('n3', niveles[2].nombreNivel);
        }

        async function llenarNivel1(nombreGuardado) {
            var codigo = codigoPaisActual();
            var pais = info.paises.find(function (p) { return p.codigo === codigo; });
            if (!pais) { llenarSelect(campos.n1, [], nombreGuardado); return; }
            var divisiones = await cargarPrimerNivel(pais.codigo);
            llenarSelect(campos.n1, divisiones, nombreGuardado);
        }

        async function llenarNivel2(nombreGuardado) {
            var codigo = codigoPaisActual();
            var padre = campos.n1 ? campos.n1.selectedOptions[0] : null;
            var idPadre = padre ? padre.dataset.idOrigen : '';
            if (!codigo || !idPadre) { llenarSelect(campos.n2, []); return; }
            var divisiones = await cargarHijos(codigo, idPadre);
            llenarSelect(campos.n2, divisiones, nombreGuardado);
        }

        async function llenarNivel3(nombreGuardado) {
            var codigo = codigoPaisActual();
            var padre = campos.n2 ? campos.n2.selectedOptions[0] : null;
            var idPadre = padre ? padre.dataset.idOrigen : '';
            if (!codigo || !idPadre) { llenarSelect(campos.n3, []); return; }
            var divisiones = await cargarHijos(codigo, idPadre);
            llenarSelect(campos.n3, divisiones, nombreGuardado);
        }

        function dispararCambio() {
            contenedor.dispatchEvent(new Event('direccion-cambio', { bubbles: true }));
        }

        async function init() {
            info.paises = await cargarPaises();
            if (campos.pais && campos.pais.options.length <= 1) {
                campos.pais.innerHTML = '<option value=""></option>' + info.paises.map(function (p) {
                    return '<option value="' + escapar(p.nombre) + '" data-codigo="' + escapar(p.codigo) + '">' + escapar(p.nombre) + '</option>';
                }).join('');
            }
            aplicarEstructura(codigoPaisActual());
            campos.pais.addEventListener('change', async function () {
                aplicarEstructura(codigoPaisActual());
                await llenarNivel1('');
                llenarSelect(campos.n2, []);
                llenarSelect(campos.n3, []);
                dispararCambio();
            });
            if (campos.n1) campos.n1.addEventListener('change', async function () {
                await llenarNivel2('');
                llenarSelect(campos.n3, []);
                dispararCambio();
            });
            if (campos.n2) campos.n2.addEventListener('change', async function () {
                await llenarNivel3('');
                dispararCambio();
            });
            if (campos.n3) campos.n3.addEventListener('change', dispararCambio);
        }

        function codigoPaisActual() {
            if (!campos.pais || !campos.pais.value) return '';
            var opcion = campos.pais.selectedOptions[0];
            return opcion ? (opcion.dataset.codigo || '') : '';
        }

        // Coloca los valores guardados de una dirección y reconstruye la cascada.
        async function colocar(direccion) {
            await bloque.listo;
            direccion = direccion || {};
            var nombrePais = String(direccion.pais || '').trim();
            // Normaliza siglas históricas de SAP (GT, SV…) al nombre del país.
            var MAPA_SIGLAS = { GT: 'Guatemala', SV: 'El Salvador', HN: 'Honduras', BZ: 'Belice', NI: 'Nicaragua', CR: 'Costa Rica', PA: 'Panamá', MX: 'México' };
            if (MAPA_SIGLAS[nombrePais.toUpperCase()]) nombrePais = MAPA_SIGLAS[nombrePais.toUpperCase()];
            if (campos.pais) campos.pais.value = nombrePais;
            aplicarEstructura(codigoPaisActual());
            await llenarNivel1(direccion.departamento || '');
            await llenarNivel2(direccion.subnivel || '');
            await llenarNivel3(direccion.zona || '');
        }

        // Valores actuales del bloque para guardar.
        function colectar() {
            return {
                pais: valorSelect(campos.pais),
                departamento: valorSelect(campos.n1),
                subnivel: valorSelect(campos.n2),
                zona: valorSelect(campos.n3)
            };
        }

        var bloque = { init: init, colocar: colocar, colectar: colectar, campos: campos };
        bloque.listo = init();
        return bloque;
    }

    var bloques = new Map();

    window.ERPDireccionPais = {
        preparar: function (contenedor) {
            if (!contenedor || bloques.has(contenedor)) return bloques.get(contenedor);
            var bloque = crearBloque(contenedor);
            bloques.set(contenedor, bloque);
            bloque.init();
            return bloque;
        },
        bloqueDe: function (contenedor) { return bloques.get(contenedor) || null; }
    };
})();
