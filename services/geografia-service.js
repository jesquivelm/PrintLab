// Catálogo geográfico de Mesoamérica (8 países) en tabla propia.
// Fuente viva: Open Admin Data (https://api.openadmindata.org, CC BY-IGO/CC BY 4.0).
// Todos los identificadores y columnas están en español, según convención del proyecto.
'use strict';

const PAISES = [
    { codigo: 'GT', iso3: 'GTM', nombre: 'Guatemala' },
    { codigo: 'SV', iso3: 'SLV', nombre: 'El Salvador' },
    { codigo: 'HN', iso3: 'HND', nombre: 'Honduras' },
    { codigo: 'BZ', iso3: 'BLZ', nombre: 'Belice' },
    { codigo: 'NI', iso3: 'NIC', nombre: 'Nicaragua' },
    { codigo: 'CR', iso3: 'CRI', nombre: 'Costa Rica' },
    { codigo: 'PA', iso3: 'PAN', nombre: 'Panamá' },
    { codigo: 'MX', iso3: 'MEX', nombre: 'México' }
];

// Nombres en español de los niveles que devuelve la API, por clave original.
const NOMBRES_NIVEL = {
    department: 'Departamento',
    state: 'Estado',
    province: 'Provincia',
    district: 'Distrito',
    canton: 'Cantón',
    municipality: 'Municipio',
    locality: 'Localidad',
    corregimiento: 'Corregimiento'
};

const URL_API = 'https://api.openadmindata.org/api/v1/countries/{codigo}.json';

let pgQuery = null;
let sincronizacionEnCurso = null;

function configurarDeps({ pgQuery: q }) {
    pgQuery = q;
}

async function crearTablaSiNoExiste() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS divisiones_geograficas (
            id BIGSERIAL PRIMARY KEY,
            codigo_pais CHAR(2) NOT NULL,
            nivel SMALLINT NOT NULL,
            clave_nivel VARCHAR(50) NOT NULL,
            nombre_nivel VARCHAR(100) NOT NULL,
            id_origen VARCHAR(100) NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            nombre_ingles VARCHAR(150),
            id_padre VARCHAR(100),
            nombre_padre VARCHAR(150),
            codigo_postal VARCHAR(30),
            latitud DECIMAL(10,7),
            longitud DECIMAL(10,7),
            origen VARCHAR(20) NOT NULL DEFAULT 'api',
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(codigo_pais, nivel, id_origen)
        )`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS ix_divisiones_padre ON divisiones_geograficas(codigo_pais, id_padre)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS ix_divisiones_nivel ON divisiones_geograficas(codigo_pais, nivel)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS ix_divisiones_nombre ON divisiones_geograficas(codigo_pais, nivel, nombre)`);
}

async function paisesGuardados() {
    const r = await pgQuery(`SELECT DISTINCT codigo_pais FROM divisiones_geograficas ORDER BY 1`);
    return r.rows.map(x => x.codigo_pais);
}

// Descarga un país y devuelve [{nivel, claveNivel, nombreNivel, idOrigen, nombre, ...}]
async function descargarPais(codigo) {
    const url = URL_API.replace('{codigo}', codigo.toLowerCase());
    const respuesta = await fetch(url, { headers: { 'User-Agent': 'PrintLab-ERP-Geografia/1.0' } });
    if (!respuesta.ok) throw new Error(`Open Admin Data respondió ${respuesta.status} para ${codigo.toUpperCase()}`);
    const datos = await respuesta.json();
    const niveles = (datos.meta && datos.meta.levels) || [];
    const contenido = datos.data || {};
    const filas = [];
    niveles.forEach((nivelMeta, indice) => {
        const clave = nivelMeta.key;
        const registros = Array.isArray(contenido[clave]) ? contenido[clave] : [];
        registros.forEach(r => {
            filas.push({
                nivel: indice + 1,
                claveNivel: clave,
                nombreNivel: NOMBRES_NIVEL[clave] || nivelMeta.name_local || clave,
                idOrigen: String(r.id || ''),
                nombre: r.name_local || r.name_en || '',
                nombreIngles: r.name_en || null,
                idPadre: r.parent_id ? String(r.parent_id) : null,
                nombrePadre: r.parent_name_local || r.parent_name_en || null,
                latitud: typeof r.lat === 'number' ? r.lat : null,
                longitud: typeof r.lon === 'number' ? r.lon : null
            });
        });
    });
    return filas;
}

// Sincroniza los países indicados (o los 8). Es idempotente: actualiza lo que cambió,
// conserva los registros creados a mano y marca los que desaparecieron de la API.
async function sincronizarPaises(codigos) {
    if (!pgQuery) throw new Error('Servicio geográfico sin base de datos configurada.');
    const lista = (codigos && codigos.length ? codigos : PAISES.map(p => p.codigo)).map(c => c.toUpperCase());
    const resumen = { paises: [], nuevos: 0, actualizados: 0, eliminados: 0, errores: [] };
    for (const codigo of lista) {
        try {
            const filas = await descargarPais(codigo);
            const actuales = await pgQuery(
                `SELECT id_origen, nivel, nombre, id_padre FROM divisiones_geograficas WHERE codigo_pais=$1 AND origen='api'`,
                [codigo]
            );
            const mapaActual = new Map(actuales.rows.map(r => [r.id_origen, r]));
            for (const f of filas) {
                const previo = mapaActual.get(f.idOrigen);
                if (!previo) {
                    await pgQuery(
                        `INSERT INTO divisiones_geograficas
                            (codigo_pais, nivel, clave_nivel, nombre_nivel, id_origen, nombre, nombre_ingles, id_padre, nombre_padre, latitud, longitud, origen)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'api')
                         ON CONFLICT (codigo_pais, nivel, id_origen) DO NOTHING`,
                        [codigo, f.nivel, f.claveNivel, f.nombreNivel, f.idOrigen, f.nombre, f.nombreIngles, f.idPadre, f.nombrePadre, f.latitud, f.longitud]
                    );
                    resumen.nuevos++;
                } else if (previo.nombre !== f.nombre || (previo.id_padre || '') !== (f.idPadre || '')) {
                    await pgQuery(
                        `UPDATE divisiones_geograficas
                            SET nombre=$2, nombre_ingles=$3, id_padre=$4, nombre_padre=$5, actualizado_en=NOW()
                          WHERE codigo_pais=$1 AND id_origen=$6`,
                        [codigo, f.nombre, f.nombreIngles, f.idPadre, f.nombrePadre, f.idOrigen]
                    );
                    resumen.actualizados++;
                }
                mapaActual.delete(f.idOrigen);
            }
            // Lo que quedó en el mapa ya no existe en la API (pero no se borra si fue editado a mano).
            for (const sobrante of mapaActual.values()) {
                const tocado = await pgQuery(
                    `SELECT 1 FROM divisiones_geograficas WHERE codigo_pais=$1 AND id_origen=$2 AND origen='manual' LIMIT 1`,
                    [codigo, sobrante.id_origen]
                );
                if (!tocado.rows.length) {
                    await pgQuery(
                        `DELETE FROM divisiones_geograficas WHERE codigo_pais=$1 AND id_origen=$2 AND nivel=$3 AND origen='api'`,
                        [codigo, sobrante.id_origen, sobrante.nivel]
                    );
                    resumen.eliminados++;
                }
            }
            resumen.paises.push({ codigo, recibidos: filas.length });
        } catch (error) {
            resumen.errores.push({ codigo, mensaje: error.message });
        }
    }
    return resumen;
}

// Sincronización automática en segundo plano: al arrancar y cada 24 horas.
async function sincronizacionAutomatica() {
    if (!sincronizacionEnCurso) {
        sincronizacionEnCurso = sincronizarPaises()
            .then(resumen => {
                if (resumen.errores.length) {
                    console.warn('[geografia] Sincronización con avisos:', JSON.stringify(resumen.errores));
                }
            })
            .catch(error => console.warn('[geografia] Sincronización falló:', error.message))
            .finally(() => { sincronizacionEnCurso = null; });
    }
    return sincronizacionEnCurso;
}

function programarSincronizacionPeriodica() {
    // Primera pasada a los 20 segundos de arrancar (no bloquea el arranque),
    // y luego cada 24 horas.
    setTimeout(() => { sincronizacionAutomatica(); }, 20 * 1000);
    setInterval(() => { sincronizacionAutomatica(); }, 24 * 60 * 60 * 1000);
}

// Catálogo completo para las pantallas: países con sus niveles y conteos.
async function catalogoPaises() {
    const r = await pgQuery(`
        SELECT codigo_pais,
               MAX(nombre) FILTER (WHERE nivel = 0) IS NULL AS dummy,
               nivel, clave_nivel, nombre_nivel, COUNT(*) AS total
        FROM divisiones_geograficas
        GROUP BY codigo_pais, nivel, clave_nivel, nombre_nivel
        ORDER BY codigo_pais, nivel`);
    const porPais = new Map();
    for (const fila of r.rows) {
        if (!porPais.has(fila.codigo_pais)) porPais.set(fila.codigo_pais, []);
        porPais.get(fila.codigo_pais).push({
            nivel: fila.nivel, clave: fila.clave_nivel, nombreNivel: fila.nombre_nivel, total: Number(fila.total)
        });
    }
    return PAISES.map(p => ({
        codigo: p.codigo, iso3: p.iso3, nombre: p.nombre,
        cargado: porPais.has(p.codigo),
        niveles: porPais.get(p.codigo) || []
    }));
}

// Hijos directos de una división (p. ej. municipios de un departamento).
async function hijos(codigoPais, idPadre) {
    const r = await pgQuery(
        `SELECT id, id_origen, nombre, clave_nivel, nombre_nivel
           FROM divisiones_geograficas
          WHERE codigo_pais=$1 AND id_padre=$2
          ORDER BY nombre`,
        [String(codigoPais || '').toUpperCase(), idPadre == null ? null : String(idPadre)]
    );
    return r.rows;
}

// Nivel 1 de un país (departamentos/estados/provincias/distritos según el país).
async function primerNivel(codigoPais) {
    const r = await pgQuery(
        `SELECT id, id_origen, nombre, clave_nivel, nombre_nivel
           FROM divisiones_geograficas
          WHERE codigo_pais=$1 AND nivel=1
          ORDER BY nombre`,
        [String(codigoPais || '').toUpperCase()]
    );
    return r.rows;
}

// Búsqueda por nombre dentro de un país (para cajas de búsqueda).
async function buscar(codigoPais, texto, limite = 25) {
    const t = String(texto || '').trim();
    if (!t) return [];
    const r = await pgQuery(
        `SELECT id, id_origen, nombre, nombre_nivel, id_padre, nombre_padre
           FROM divisiones_geograficas
          WHERE codigo_pais=$1 AND nombre ILIKE $2
          ORDER BY nivel, nombre
          LIMIT $3`,
        [String(codigoPais || '').toUpperCase(), '%' + t + '%', Math.min(Number(limite) || 25, 100)]
    );
    return r.rows;
}

// CRUD manual (Configuración → Geografía): crear, renombrar, eliminar.
async function crearDivision({ codigoPais, idPadre, nombre, nivel, claveNivel, nombreNivel }) {
    const codigo = String(codigoPais || '').toUpperCase();
    if (!codigo || !nombre) throw new Error('País y nombre son obligatorios.');
    let nivelFinal = Number(nivel);
    let claveFinal = claveNivel, nombreNivelFinal = nombreNivel;
    if (idPadre) {
        const padre = await pgQuery(
            `SELECT nivel, clave_nivel, nombre_nivel FROM divisiones_geograficas WHERE codigo_pais=$1 AND id_origen=$2 ORDER BY id LIMIT 1`,
            [codigo, String(idPadre)]
        );
        if (!padre.rows.length) throw new Error('La división padre no existe.');
        nivelFinal = padre.rows[0].nivel + 1;
        claveFinal = claveFinal || padre.rows[0].clave_nivel + '_custom';
        nombreNivelFinal = nombreNivelFinal || padre.rows[0].nombre_nivel;
    }
    nivelFinal = nivelFinal || 1;
    const idOrigen = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
    const r = await pgQuery(
        `INSERT INTO divisiones_geograficas
            (codigo_pais, nivel, clave_nivel, nombre_nivel, id_origen, nombre, id_padre, origen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'manual')
         RETURNING *`,
        [codigo, nivelFinal, claveFinal || 'personalizado', nombreNivelFinal || 'Personalizado', idOrigen, nombre, idPadre || null]
    );
    return r.rows[0];
}

async function renombrarDivision(id, nombreNuevo) {
    const nombre = String(nombreNuevo || '').trim();
    if (!nombre) throw new Error('El nombre no puede quedar vacío.');
    const r = await pgQuery(
        `UPDATE divisiones_geograficas SET nombre=$2, origen='manual', actualizado_en=NOW() WHERE id=$1 RETURNING *`,
        [Number(id), nombre]
    );
    if (!r.rows.length) throw new Error('La división no existe.');
    return r.rows[0];
}

async function eliminarDivision(id) {
    const r = await pgQuery(`SELECT * FROM divisiones_geograficas WHERE id=$1`, [Number(id)]);
    if (!r.rows.length) throw new Error('La división no existe.');
    const div = r.rows[0];
    const hijosCount = await pgQuery(
        `SELECT COUNT(*)::int AS total FROM divisiones_geograficas WHERE codigo_pais=$1 AND id_padre=$2`,
        [div.codigo_pais, div.id_origen]
    );
    if (hijosCount.rows[0].total > 0) {
        throw new Error(`"${div.nombre}" tiene ${hijosCount.rows[0].total} subdivisiones. Elimínelas primero.`);
    }
    await pgQuery(`DELETE FROM divisiones_geograficas WHERE id=$1`, [Number(id)]);
    return div;
}

module.exports = {
    PAISES,
    configurarDeps,
    crearTablaSiNoExiste,
    sincronizarPaises,
    sincronizacionAutomatica,
    programarSincronizacionPeriodica,
    catalogoPaises,
    primerNivel,
    hijos,
    buscar,
    crearDivision,
    renombrarDivision,
    eliminarDivision
};
