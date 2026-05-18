require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL no está definido. Configura la variable de entorno en el panel del servicio o en tu archivo .env local.');
}

function readDatabaseUrl(value) {
    try {
        return new URL(value);
    } catch (error) {
        return null;
    }
}

function normalizeConnectionStringForPg(value) {
    const parsed = readDatabaseUrl(value);
    if (!parsed) return value;
    if (parsed.searchParams.has('sslmode') && !parsed.searchParams.has('uselibpqcompat')) {
        parsed.searchParams.set('uselibpqcompat', 'true');
    }
    return parsed.toString();
}

function resolveSslConfig(value) {
    const parsed = readDatabaseUrl(value);
    const host = String(parsed?.hostname || '').toLowerCase();
    const sslMode = String(process.env.PGSSLMODE || parsed?.searchParams.get('sslmode') || '').toLowerCase();

    if (['disable', 'false', '0'].includes(sslMode)) return false;
    if (['require', 'prefer', 'no-verify'].includes(sslMode)) return { rejectUnauthorized: false };
    if (['verify-ca', 'verify-full'].includes(sslMode)) return true;
    if (process.env.NODE_ENV === 'production' || host.includes('render.com') || host.includes('neon.tech')) {
        return { rejectUnauthorized: false };
    }
    return false;
}

function shouldEnableChannelBinding(value) {
    const parsed = readDatabaseUrl(value);
    const setting = String(process.env.PGCHANNELBINDING || parsed?.searchParams.get('channel_binding') || '').toLowerCase();
    return ['require', 'prefer', 'true', '1'].includes(setting);
}

const poolConnectionString = normalizeConnectionStringForPg(connectionString);

const pool = new Pool({
    connectionString: poolConnectionString,
    ssl: resolveSslConfig(connectionString),
    enableChannelBinding: shouldEnableChannelBinding(connectionString)
});

/**
 * Ejecuta una consulta simple
 */
async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error('Error en ejecución de query:', error.message);
        throw error;
    }
}

/**
 * Ejecuta un conjunto de operaciones dentro de una transacción SQL
 */
async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transacción fallida, realizando ROLLBACK:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    query,
    withTransaction
};
