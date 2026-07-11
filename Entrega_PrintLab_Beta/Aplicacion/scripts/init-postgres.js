require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db/postgres');

async function main() {
    const schemaDir = path.join(__dirname, '..', 'sql');
    const schemaPaths = [
        path.join(schemaDir, 'schema.sql'),
        path.join(schemaDir, 'schema_flexo_core.sql')
    ];

    for (const schemaPath of schemaPaths) {
        if (!fs.existsSync(schemaPath)) {
            continue;
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log(`Esquema aplicado: ${path.basename(schemaPath)}`);
    }

    console.log('Esquema Postgres inicializado correctamente.');
}

main()
    .catch((error) => {
        console.error('Error inicializando esquema:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
