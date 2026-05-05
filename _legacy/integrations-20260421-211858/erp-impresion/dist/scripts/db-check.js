import { checkDatabaseHealth } from "../db/postgres.js";
async function main() {
    const result = await checkDatabaseHealth();
    if (!result.ok) {
        console.error("PostgreSQL no responde.");
        console.error(`Base: ${result.database}`);
        console.error(`Host: ${result.host}:${result.port}`);
        console.error(`Schema: ${result.schema}`);
        console.error(`Detalle: ${result.error}`);
        process.exitCode = 1;
        return;
    }
    console.log("PostgreSQL conectado correctamente.");
    console.log(`Base: ${result.database}`);
    console.log(`Host: ${result.host}:${result.port}`);
    console.log(`Schema: ${result.schema}`);
    console.log(`Fecha servidor: ${result.now}`);
    console.log(`Tablas detectadas: ${result.tableCount}`);
    for (const tableName of result.tables ?? []) {
        console.log(`- ${tableName}`);
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
