'use strict';

/**
 * Licenciamiento de PrintLab.
 *
 * - La "pastilla" es un token firmado (Ed25519) con formato:  PL1.<payloadB64Url>.<firmaB64Url>
 *   El payload lleva: cliente, tipo, emitida, inicio, exp, avisar, gracia.
 * - La llave privada vive SOLO en poder del proveedor (nunca en este repo).
 * - La llave publica va embebida aqui (PUBLIC_KEY_EMBEBIDA) y puede sobrescribirse
 *   por instalacion mediante el flujo de rescate (public_key_override en el archivo de estado).
 * - Todo el modulo esta disenado para "fail-open": si algo falla al evaluar, la app
 *   sigue 100% funcional. El unico modo que limita acciones es RESTRINGIDO, y solo se
 *   alcanza con un veredicto limpio de "vencida + gracia agotada".
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const ESTADO_PATH = path.join(CONFIG_DIR, 'licenciamiento.json');

// Llave publica embebida (formato SPKI en base64). Vacia = sin llave configurada.
// Se define una vez con el generador (generador-licencia.html) y se pega aqui.
const PUBLIC_KEY_EMBEBIDA = '';

const MS_DIA = 86400000;
const RESCATE_VENTANA_DIAS_DEFAULT = 21;
const RESCATE_MAX_USOS_DEFAULT = 3;

const ESTADO_BASE = Object.freeze({
    pastilla: '',
    public_key_override: '',
    marca_agua: '',
    rescate: Object.freeze({ ventana_hasta: '', usos: [] }),
    rescate_intentos: Object.freeze([])
});

// ---------------------------------------------------------------------------
// Utilidades de fecha (granularidad de dia, en UTC para evitar lios de zona)
// ---------------------------------------------------------------------------

function aYmd(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

function ymdAMs(ymd) {
    const t = Date.parse(String(ymd) + 'T00:00:00Z');
    return Number.isNaN(t) ? NaN : t;
}

function diffDias(ymdA, ymdB) {
    return Math.round((ymdAMs(ymdA) - ymdAMs(ymdB)) / MS_DIA);
}

function sumarDias(ymd, dias) {
    return aYmd(new Date(ymdAMs(ymd) + dias * MS_DIA));
}

function esYmdValido(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) && !Number.isNaN(ymdAMs(valor));
}

// ---------------------------------------------------------------------------
// Archivo de estado (persistencia local, escritura atomica)
// ---------------------------------------------------------------------------

function cargarEstadoArchivo() {
    try {
        const raw = fs.readFileSync(ESTADO_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizarEstado(parsed);
    } catch (error) {
        return normalizarEstado({});
    }
}

function normalizarEstado(obj) {
    const src = obj && typeof obj === 'object' ? obj : {};
    const rescate = src.rescate && typeof src.rescate === 'object' ? src.rescate : {};
    return {
        pastilla: typeof src.pastilla === 'string' ? src.pastilla : '',
        public_key_override: typeof src.public_key_override === 'string' ? src.public_key_override : '',
        marca_agua: typeof src.marca_agua === 'string' ? src.marca_agua : '',
        rescate: {
            ventana_hasta: typeof rescate.ventana_hasta === 'string' ? rescate.ventana_hasta : '',
            usos: Array.isArray(rescate.usos) ? rescate.usos.slice(-50) : []
        },
        rescate_intentos: Array.isArray(src.rescate_intentos) ? src.rescate_intentos.slice(-50) : []
    };
}

function guardarEstadoArchivo(estado) {
    const normalizado = normalizarEstado(estado);
    try {
        if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
        const tmp = ESTADO_PATH + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(normalizado, null, 2), 'utf8');
        fs.renameSync(tmp, ESTADO_PATH);
    } catch (error) {
        // fail-open: si no se puede persistir, no se rompe la app
    }
    return normalizado;
}

// ---------------------------------------------------------------------------
// Verificacion criptografica de la pastilla
// ---------------------------------------------------------------------------

function resolverLlavePublica(estado) {
    const b64 = (estado && estado.public_key_override) || PUBLIC_KEY_EMBEBIDA || '';
    if (!b64) return null;
    try {
        return crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });
    } catch (error) {
        return null;
    }
}

function verificarPastilla(token, llavePublica) {
    const limpio = String(token || '').trim();
    const m = limpio.match(/^PL1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (!m) return { ok: false, motivo: 'formato_invalido' };
    if (!llavePublica) return { ok: false, motivo: 'sin_llave_publica' };

    const parteFirmada = 'PL1.' + m[1];
    let firmaOk = false;
    try {
        firmaOk = crypto.verify(null, Buffer.from(parteFirmada, 'utf8'), llavePublica, Buffer.from(m[2], 'base64url'));
    } catch (error) {
        return { ok: false, motivo: 'firma_ilegible' };
    }
    if (!firmaOk) return { ok: false, motivo: 'firma_invalida' };

    let payload;
    try {
        payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
    } catch (error) {
        return { ok: false, motivo: 'payload_ilegible' };
    }

    if (!payload || typeof payload !== 'object') return { ok: false, motivo: 'payload_invalido' };
    if (!esYmdValido(payload.exp)) return { ok: false, motivo: 'exp_invalida' };
    const avisar = Number(payload.avisar);
    const gracia = Number(payload.gracia);
    if (!Number.isFinite(avisar) || avisar < 0) return { ok: false, motivo: 'avisar_invalido' };
    if (!Number.isFinite(gracia) || gracia < 0) return { ok: false, motivo: 'gracia_invalida' };

    return {
        ok: true,
        payload: {
            cliente: String(payload.cliente || ''),
            tipo: String(payload.tipo || ''),
            emitida: esYmdValido(payload.emitida) ? payload.emitida : '',
            inicio: esYmdValido(payload.inicio) ? payload.inicio : '',
            exp: payload.exp,
            avisar: Math.round(avisar),
            gracia: Math.round(gracia)
        }
    };
}

// ---------------------------------------------------------------------------
// Marca de agua (defensa contra retroceso del reloj del servidor)
// ---------------------------------------------------------------------------

/**
 * Devuelve el "hoy" efectivo: la fecha mas avanzada entre el reloj del servidor,
 * la marca de agua del archivo y una marca externa opcional (ej. mirror en BD).
 */
function calcularHoy(estado, marcaExternaIso) {
    const candidatos = [Date.now()];
    if (estado && estado.marca_agua) {
        const t = Date.parse(estado.marca_agua);
        if (!Number.isNaN(t)) candidatos.push(t);
    }
    if (marcaExternaIso) {
        const t = Date.parse(marcaExternaIso);
        if (!Number.isNaN(t)) candidatos.push(t);
    }
    return new Date(Math.max(...candidatos));
}

function relojEstaDesfasado(estado, marcaExternaIso) {
    const marca = Math.max(
        estado && estado.marca_agua ? Date.parse(estado.marca_agua) || 0 : 0,
        marcaExternaIso ? Date.parse(marcaExternaIso) || 0 : 0
    );
    if (!marca) return false;
    return Date.now() < marca - 2 * MS_DIA;
}

// ---------------------------------------------------------------------------
// Evaluacion de estado
// ---------------------------------------------------------------------------

function evaluar(estado, opciones) {
    const opts = opciones || {};
    const marcaExterna = opts.marcaExternaIso || '';
    const hoyDate = calcularHoy(estado, marcaExterna);
    const hoy = aYmd(hoyDate);
    const desfasado = relojEstaDesfasado(estado, marcaExterna);

    const base = {
        estado: 'NORMAL',
        permiteCrearOrden: true,
        etiqueta: 'Licencia vigente',
        mensaje: '',
        diasRestantes: null,
        exp: null,
        cliente: '',
        tipo: '',
        emitida: '',
        marcaAgua: hoyDate.toISOString(),
        relojDesfasado: desfasado,
        rescate: {
            ventanaHasta: (estado.rescate && estado.rescate.ventana_hasta) || '',
            usos: (estado.rescate && Array.isArray(estado.rescate.usos)) ? estado.rescate.usos.length : 0,
            maxUsos: RESCATE_MAX_USOS_DEFAULT
        }
    };

    // Ventana de rescate activa -> funcion completa
    const ventana = estado.rescate && estado.rescate.ventana_hasta;
    if (esYmdValido(ventana) && diffDias(ventana, hoy) >= 0) {
        const dias = diffDias(ventana, hoy);
        return Object.assign(base, {
            estado: 'RESCATE',
            etiqueta: 'Acceso de emergencia',
            mensaje: `Acceso de emergencia activo. Vence en ${dias} dia(s).`,
            diasRestantes: dias
        });
    }

    const llave = resolverLlavePublica(estado);
    const verif = verificarPastilla(estado.pastilla, llave);
    if (!verif.ok) {
        // Sin pastilla valida -> fail-open silencioso (solo se ve en el panel)
        return Object.assign(base, {
            estado: 'SIN_LICENCIA',
            etiqueta: 'Sin licencia registrada',
            mensaje: '',
            motivo: verif.motivo
        });
    }

    const p = verif.payload;
    base.exp = p.exp;
    base.cliente = p.cliente;
    base.tipo = p.tipo;
    base.emitida = p.emitida;

    const avisarDesde = sumarDias(p.exp, -p.avisar);
    const diasHastaVencer = diffDias(p.exp, hoy);

    if (diffDias(hoy, avisarDesde) < 0) {
        return Object.assign(base, { estado: 'NORMAL', diasRestantes: diasHastaVencer });
    }

    if (diasHastaVencer >= 0) {
        const txt = diasHastaVencer === 0
            ? 'Tu licencia vence hoy. Contacta a tu proveedor para renovarla.'
            : `Tu licencia vence en ${diasHastaVencer} dia(s). Contacta a tu proveedor para renovarla.`;
        return Object.assign(base, {
            estado: 'AVISO',
            etiqueta: 'Licencia por vencer',
            mensaje: txt,
            diasRestantes: diasHastaVencer
        });
    }

    // Vencida
    const diasVencida = diffDias(hoy, p.exp);
    const restantesGracia = p.gracia - diasVencida;
    if (restantesGracia >= 0) {
        return Object.assign(base, {
            estado: 'GRACIA',
            etiqueta: 'Licencia vencida (periodo de gracia)',
            mensaje: `Licencia vencida. Te quedan ${restantesGracia} dia(s) antes de que se limite la creacion de ordenes.`,
            diasRestantes: restantesGracia
        });
    }

    return Object.assign(base, {
        estado: 'RESTRINGIDO',
        permiteCrearOrden: false,
        etiqueta: 'Licencia vencida',
        mensaje: 'Licencia vencida. La creacion de ordenes esta deshabilitada. Contacta a tu proveedor.',
        diasRestantes: 0
    });
}

// ---------------------------------------------------------------------------
// API de alto nivel
// ---------------------------------------------------------------------------

/**
 * Evalua el estado actual. NUNCA lanza: ante cualquier error devuelve fail-open.
 */
function estadoActual(opciones) {
    try {
        const estado = cargarEstadoArchivo();
        return evaluar(estado, opciones || {});
    } catch (error) {
        return {
            estado: 'ERROR',
            permiteCrearOrden: true,
            etiqueta: 'Licenciamiento no disponible',
            mensaje: '',
            diasRestantes: null,
            exp: null,
            cliente: '',
            tipo: '',
            marcaAgua: new Date().toISOString(),
            relojDesfasado: false,
            rescate: { ventanaHasta: '', usos: 0, maxUsos: RESCATE_MAX_USOS_DEFAULT },
            error: String(error && error.message || error)
        };
    }
}

/**
 * Aplica una pastilla nueva. Devuelve { ok, estado } o { ok:false, motivo }.
 */
function aplicarPastilla(token) {
    const estado = cargarEstadoArchivo();
    const llave = resolverLlavePublica(estado);
    const verif = verificarPastilla(token, llave);
    if (!verif.ok) return { ok: false, motivo: verif.motivo };

    estado.pastilla = String(token).trim();
    // La fecha de emision de la pastilla es prueba de que el tiempo avanzo al menos hasta ahi
    const marcaActual = estado.marca_agua ? Date.parse(estado.marca_agua) || 0 : 0;
    const candidatoEmision = verif.payload.emitida ? ymdAMs(verif.payload.emitida) : 0;
    estado.marca_agua = new Date(Math.max(Date.now(), marcaActual, candidatoEmision)).toISOString();
    guardarEstadoArchivo(estado);
    return { ok: true, estado: estadoActual(), payload: verif.payload };
}

/**
 * Avanza la marca de agua al maximo entre su valor actual y el reloj del servidor.
 */
function avanzarMarcaAgua(marcaExternaIso) {
    const estado = cargarEstadoArchivo();
    const candidatos = [Date.now()];
    if (estado.marca_agua) { const t = Date.parse(estado.marca_agua); if (!Number.isNaN(t)) candidatos.push(t); }
    if (marcaExternaIso) { const t = Date.parse(marcaExternaIso); if (!Number.isNaN(t)) candidatos.push(t); }
    const nueva = new Date(Math.max(...candidatos)).toISOString();
    if (nueva !== estado.marca_agua) {
        estado.marca_agua = nueva;
        guardarEstadoArchivo(estado);
    }
    return nueva;
}

/**
 * Reemplaza la llave publica de esta instalacion (flujo de rescate).
 */
function reemplazarLlavePublica(publicKeyB64) {
    const limpio = String(publicKeyB64 || '').replace(/\s+/g, '');
    if (!limpio) return { ok: false, motivo: 'vacia' };
    try {
        crypto.createPublicKey({ key: Buffer.from(limpio, 'base64'), format: 'der', type: 'spki' });
    } catch (error) {
        return { ok: false, motivo: 'llave_invalida' };
    }
    const estado = cargarEstadoArchivo();
    estado.public_key_override = limpio;
    guardarEstadoArchivo(estado);
    return { ok: true };
}

/**
 * Abre una ventana de acceso de emergencia (flujo de rescate).
 */
function reanimar(datosUso) {
    const estado = cargarEstadoArchivo();
    const usos = Array.isArray(estado.rescate.usos) ? estado.rescate.usos : [];
    if (usos.length >= RESCATE_MAX_USOS_DEFAULT) {
        return { ok: false, motivo: 'sin_usos_disponibles', usos: usos.length, maxUsos: RESCATE_MAX_USOS_DEFAULT };
    }
    const hoy = aYmd(new Date());
    estado.rescate.ventana_hasta = sumarDias(hoy, RESCATE_VENTANA_DIAS_DEFAULT);
    estado.rescate.usos = usos.concat([{
        ts: new Date().toISOString(),
        usuario: String(datosUso && datosUso.usuario || ''),
        ip: String(datosUso && datosUso.ip || ''),
        ventana_hasta: estado.rescate.ventana_hasta
    }]).slice(-50);
    guardarEstadoArchivo(estado);
    return {
        ok: true,
        ventanaHasta: estado.rescate.ventana_hasta,
        usos: estado.rescate.usos.length,
        maxUsos: RESCATE_MAX_USOS_DEFAULT
    };
}

/**
 * Verifica una firma hecha por el proveedor (con la llave privada) contra la
 * llave publica de esta instalacion. Se usa para el ingreso a /licencia/rescate
 * por desafio-respuesta, sin ningun secreto almacenado en el servidor del cliente.
 */
function verificarFirmaProveedor(mensaje, firmaBase64) {
    const estado = cargarEstadoArchivo();
    const llave = resolverLlavePublica(estado);
    if (!llave) return false;
    try {
        return crypto.verify(null, Buffer.from(String(mensaje), 'utf8'), llave, Buffer.from(String(firmaBase64 || ''), 'base64'));
    } catch (error) {
        return false;
    }
}

function registrarIntentoRescate(datos) {
    const estado = cargarEstadoArchivo();
    estado.rescate_intentos = (Array.isArray(estado.rescate_intentos) ? estado.rescate_intentos : []).concat([{
        ts: new Date().toISOString(),
        ok: Boolean(datos && datos.ok),
        ip: String(datos && datos.ip || '')
    }]).slice(-50);
    guardarEstadoArchivo(estado);
}

/**
 * Detalle completo para el panel / flujo de rescate (incluye historial).
 */
function detalle(opciones) {
    const estado = cargarEstadoArchivo();
    const evaluado = estadoActual(opciones || {});
    const llave = resolverLlavePublica(estado);
    return Object.assign({}, evaluado, {
        llavePublicaConfigurada: Boolean(llave),
        llavePublicaPropia: Boolean(estado.public_key_override),
        historialRescate: estado.rescate.usos || [],
        intentosRescate: estado.rescate_intentos || []
    });
}

module.exports = {
    ESTADO_PATH,
    RESCATE_VENTANA_DIAS_DEFAULT,
    RESCATE_MAX_USOS_DEFAULT,
    cargarEstadoArchivo,
    guardarEstadoArchivo,
    verificarPastilla,
    estadoActual,
    detalle,
    aplicarPastilla,
    avanzarMarcaAgua,
    reemplazarLlavePublica,
    reanimar,
    registrarIntentoRescate,
    verificarFirmaProveedor
};
