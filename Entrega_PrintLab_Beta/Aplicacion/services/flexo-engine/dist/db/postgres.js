import { Pool } from "pg";
import { loadLocalEnv } from "./env.js";
let pool = null;
function getConfig() {
    loadLocalEnv();
    return {
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME ?? "mayaprint_flexo_web",
        user: process.env.DB_USER ?? "postgres",
        password: process.env.DB_PASSWORD ?? "",
        schema: process.env.DB_SCHEMA ?? "public"
    };
}
export function getPostgresPool() {
    if (pool) {
        return pool;
    }
    const config = getConfig();
    pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: 10,
        idleTimeoutMillis: 10000
    });
    return pool;
}
export async function checkDatabaseHealth() {
    const config = getConfig();
    try {
        const db = getPostgresPool();
        const nowResult = await db.query("select now()::text as now");
        const tablesResult = await db.query(`
        select tablename
        from pg_tables
        where schemaname = $1
        order by tablename
      `, [config.schema]);
        return {
            ok: true,
            database: config.database,
            host: config.host,
            port: config.port,
            schema: config.schema,
            now: nowResult.rows[0]?.now,
            tableCount: tablesResult.rows.length,
            tables: tablesResult.rows.map((row) => row.tablename)
        };
    }
    catch (error) {
        return {
            ok: false,
            database: config.database,
            host: config.host,
            port: config.port,
            schema: config.schema,
            error: error instanceof Error ? error.message : "No se pudo conectar a PostgreSQL."
        };
    }
}
