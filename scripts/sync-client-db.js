require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const CLIENT_DB_URL = 'postgresql://postgres:Rmaya!9A@192.168.1.48:5433/printlab?sslmode=disable';
const REF_DB_URL = process.env.DATABASE_URL;
const REF_DUMP_FILE = path.join(process.env.TEMP || '/tmp', 'printlab_ref_schema.sql');

const refPool = new Pool({ connectionString: REF_DB_URL });
const clientPool = new Pool({ connectionString: CLIENT_DB_URL });

// ============================================================
// UTILIDADES
// ============================================================
async function query(pool, text, params) {
  try {
    return (await pool.query(text, params)).rows;
  } catch (err) {
    console.error(`  [ERROR] ${err.message}`);
    throw err;
  }
}

async function execSafe(pool, text, label) {
  try {
    await pool.query(text);
    if (label) console.log(`  [OK] ${label}`);
    return true;
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error(`  [ERROR] ${label || text.substring(0, 80)}: ${err.message}`);
    }
    return false;
  }
}

// ============================================================
// PARSE pg_dump OUTPUT
// ============================================================
function parsePgDump(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Extract CREATE TYPE statements (single or multi-line up to ;)
  const typeBlocks = extractBlocks(lines, /^CREATE\s+TYPE\s+(public\.\w+|tintas\.\w+)/);

  // Extract CREATE TABLE statements
  const tableBlocks = extractBlocks(lines, /^CREATE\s+TABLE\s+(public\.\w+|tintas\.\w+)/);

  // Extract CREATE INDEX statements
  const indexBlocks = extractBlocks(lines, /^CREATE\s+(UNIQUE\s+)?INDEX\s+/);

  // Extract CREATE VIEW statements
  const viewBlocks = extractBlocks(lines, /^CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+(public\.\w+|tintas\.\w+)/);

  // Extract ALTER TABLE statements (constraints, defaults)
  const alterBlocks = extractBlocks(lines, /^ALTER\s+TABLE\s+ONLY\s+(public\.\w+|tintas\.\w+)/);

  return { typeBlocks, tableBlocks, indexBlocks, viewBlocks, alterBlocks };
}

function extractBlocks(lines, startPattern) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (startPattern.test(lines[i])) {
      let sql = lines[i];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().endsWith(';')) {
        sql += '\n' + lines[j];
        j++;
      }
      if (j < lines.length) {
        sql += '\n' + lines[j];
        i = j;
      }
      blocks.push(sql);
    }
    i++;
  }
  return blocks;
}

// ============================================================
// DESCUBRIR SCHEMA DEL CLIENTE
// ============================================================
async function discoverClientInfo() {
  const schemas = (await query(clientPool, `
    SELECT schema_name FROM information_schema.schemata 
    WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','pg_temp_1','pg_toast_temp_1')
  `)).map(s => s.schema_name);

  const tables = await query(clientPool, `
    SELECT table_schema, table_name FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' AND table_schema IN ('public','tintas')
  `);
  const existingTablesSet = new Set(tables.map(t => `${t.table_schema}.${t.table_name}`));

  const allCols = await query(clientPool, `
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema IN ('public','tintas')
  `);
  const colsByTable = {};
  for (const col of allCols) {
    const key = `${col.table_schema}.${col.table_name}`;
    if (!colsByTable[key]) colsByTable[key] = new Set();
    colsByTable[key].add(col.column_name);
  }

  return { existingSchemas: schemas, existingTablesSet, colsByTable };
}

// ============================================================
// FASE 2: APLICAR DDL (SAFE)
// ============================================================
async function applyDdlToClient(parsed, clientInfo) {
  const newTables = [];

  // 2a: Schemas
  console.log('\n--- FASE 2a: Schemas ---');
  for (const s of ['tintas']) {
    if (!clientInfo.existingSchemas.includes(s)) {
      console.log(`  Creando schema ${s}...`);
      await execSafe(clientPool, `CREATE SCHEMA ${s}`, `schema ${s}`);
    }
  }

  // 2b: Types
  console.log('\n--- FASE 2b: Tipos Enum ---');
  for (const sql of parsed.typeBlocks) {
    const nameMatch = sql.match(/CREATE TYPE\s+((public|tintas)\.(\w+))/);
    if (!nameMatch) continue;
    const [fullName, , schema, typeName] = nameMatch;

    const existing = await query(clientPool, `
      SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = $1 AND t.typname = $2 AND t.typtype = 'e'
    `, [schema, typeName]);

    if (existing.length === 0) {
      console.log(`  Creando tipo ${fullName}...`);
      await execSafe(clientPool, sql, `tipo ${fullName}`);
    } else {
      const valMatch = sql.match(/\(([^)]+)\)/);
      if (valMatch) {
        const newValues = valMatch[1].split(',').map(v => v.trim().replace(/^'(.*)'$/, '$1'));
        const existingVals = await query(clientPool, `
          SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1
        `, [typeName]);
        const existingSet = new Set(existingVals.map(r => r.enumlabel));
        for (const val of newValues) {
          if (!existingSet.has(val)) {
            console.log(`    Añadiendo '${val}' a ${typeName}...`);
            await execSafe(clientPool, `ALTER TYPE ${fullName} ADD VALUE IF NOT EXISTS '${val.replace(/'/g, "''")}'`);
          }
        }
      }
    }
  }

  // 2c: Tables
  console.log('\n--- FASE 2c: Tablas ---');
  for (const sql of parsed.tableBlocks) {
    const match = sql.match(/CREATE TABLE\s+((public|tintas)\.(\w+))/);
    if (!match) continue;
    const fullName = match[1];
    const tblName = match[3];

    if (clientInfo.existingTablesSet.has(fullName)) {
      console.log(`  [SKIP] ${fullName} ya existe`);
      continue;
    }

    // Skip _old tables if client has non-old version
    if (tblName.endsWith('_old')) {
      const base = tblName.replace(/_old$/, '');
      if (clientInfo.existingTablesSet.has(`public.${base}`)) {
        console.log(`  [SKIP] ${fullName} (cliente tiene ${base})`);
        continue;
      }
    }

    console.log(`  Creando tabla ${fullName}...`);
    const createSql = sql.replace(/^CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS');
    const ok = await execSafe(clientPool, createSql, `tabla ${fullName}`);
    if (ok) newTables.push(fullName);
  }

  return newTables;
}

// ============================================================
// FASE 3: APLICAR CONSTRAINTS (solo tablas nuevas)
// ============================================================
async function applyConstraints(parsed) {
  console.log('\n--- FASE 3: Constraints y defaults ---');

  // For each ALTER TABLE, check if it references a table that exists
  // and apply the constraint
  let applied = 0;
  let skipped = 0;

  for (const sql of parsed.alterBlocks) {
    // Extract the target table
    const tableMatch = sql.match(/ALTER TABLE ONLY\s+((public|tintas)\.(\w+))/);
    if (!tableMatch) continue;
    const fullName = tableMatch[1];
    const schema = tableMatch[2];

    // Check table exists in client
    const exists = await query(clientPool, `
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
      AND table_type = 'BASE TABLE'
    `, [schema, fullName.split('.')[1]]);

    if (exists.length === 0) continue;

    // For ALTER COLUMN SET DEFAULT (sequences)
    if (sql.includes('ALTER COLUMN') && sql.includes('SET DEFAULT')) {
      const seqMatch = sql.match(/nextval\('([^']+)'/);
      if (seqMatch) {
        const seqName = seqMatch[1];
        // Check if sequence exists
        const seqExists = await query(clientPool, `
          SELECT 1 FROM pg_class WHERE relname = $1 AND relkind = 'S'
        `, [seqName]);
        if (seqExists.length === 0) {
          // Need to create the sequence
          const seqParts = seqName.split('.');
          const seqSchema = seqParts.length > 1 ? seqParts[0] : 'public';
          const seqShortName = seqParts.length > 1 ? seqParts[1] : seqName;
          const seqSql = `CREATE SEQUENCE IF NOT EXISTS ${seqSchema}.${seqShortName}`;
          await execSafe(clientPool, seqSql, `secuencia ${seqName}`);
        }
      }
    }

    const ok = await execSafe(clientPool, sql, `constraint on ${fullName}`);
    if (ok) applied++; else skipped++;
  }

  console.log(`  Constraints aplicados: ${applied}, omitidos (ya existen): muchos`);
}

// ============================================================
// FASE 4: AÑADIR COLUMNAS FALTANTES
// ============================================================
async function addMissingColumns(clientInfo) {
  console.log('\n--- FASE 4: Columnas faltantes ---');

  const refCols = await query(refPool, `
    SELECT c.table_schema, c.table_name, c.column_name,
           c.ordinal_position, c.column_default, c.is_nullable,
           c.data_type, c.character_maximum_length,
           c.numeric_precision, c.numeric_scale,
           c.udt_name, c.is_identity, c.identity_generation
    FROM information_schema.columns c
    WHERE c.table_schema IN ('public', 'tintas')
    ORDER BY c.table_schema, c.table_name, c.ordinal_position
  `);

  let added = 0, errors = 0;

  for (const col of refCols) {
    const key = `${col.table_schema}.${col.table_name}`;
    if (!clientInfo.existingTablesSet.has(key)) continue;
    if (col.table_name.endsWith('_old')) {
      const base = col.table_name.replace(/_old$/, '');
      if (clientInfo.existingTablesSet.has(`public.${base}`)) continue;
    }
    const clientCols = clientInfo.colsByTable[key];
    if (!clientCols || !clientCols.has(col.column_name)) {
      const typeDef = refTypeToDdl(col);
      const defVal = col.column_default && !col.column_default.startsWith('nextval')
        ? col.column_default.replace(/::[\w\s\[\]\.]+$/g, '') : null;
      let sql = `ALTER TABLE ${key} ADD COLUMN IF NOT EXISTS ${col.column_name} ${typeDef}`;
      if (defVal) sql += ` DEFAULT ${defVal}`;

      try {
        await clientPool.query(sql);
        added++;
      } catch {
        // Try without default/not null
        try {
          await clientPool.query(`ALTER TABLE ${key} ADD COLUMN IF NOT EXISTS ${col.column_name} ${typeDef}`);
          added++;
        } catch (e2) {
          errors++;
        }
      }
    }
  }

  console.log(`  Columnas añadidas: ${added}, Errores: ${errors}`);
  return { added, errors };
}

function refTypeToDdl(col) {
  const map = {
    'integer': 'INTEGER', 'bigint': 'BIGINT', 'smallint': 'SMALLINT',
    'boolean': 'BOOLEAN', 'text': 'TEXT', 'uuid': 'UUID', 'jsonb': 'JSONB',
    'json': 'JSON', 'date': 'DATE', 'bytea': 'BYTEA',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'time without time zone': 'TIME', 'time with time zone': 'TIMETZ',
    'real': 'REAL', 'double precision': 'DOUBLE PRECISION',
    'numeric': col.numeric_scale <= 0 && col.numeric_precision <= 18 && col.numeric_precision > 0
      ? 'BIGINT' : `NUMERIC(${col.numeric_precision || 18},${col.numeric_scale || 6})`,
    'decimal': `DECIMAL(${col.numeric_precision || 18},${col.numeric_scale || 6})`,
    'character varying': col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR',
    'character': col.character_maximum_length ? `CHAR(${col.character_maximum_length})` : 'CHAR',
  };
  if (map[col.data_type]) return map[col.data_type];
  if (col.udt_name && col.table_schema === 'tintas') return `tintas.${col.udt_name}`;
  return col.udt_name || col.data_type;
}

// ============================================================
// FASE 5: RE-CREAR ÍNDICES
// ============================================================
async function recreateIndexes(parsed) {
  console.log('\n--- FASE 5: Índices ---');

  const existingIndexes = new Set(
    (await query(clientPool, `SELECT indexname FROM pg_indexes WHERE schemaname IN ('public','tintas')`))
      .map(r => r.indexname)
  );

  let created = 0;
  for (const sql of parsed.indexBlocks) {
    const nameMatch = sql.match(/INDEX\s+(\w+)/);
    if (!nameMatch) continue;
    const idxName = nameMatch[1];
    if (existingIndexes.has(idxName)) continue;

    // Check table exists
    const tableMatch = sql.match(/ON\s+((public|tintas)\.\w+)/);
    if (!tableMatch) continue;
    const tableExists = await query(clientPool, `
      SELECT 1 FROM information_schema.tables WHERE table_type = 'BASE TABLE'
      AND (table_schema || '.' || table_name) = $1
    `, [tableMatch[1]]);
    if (tableExists.length === 0) continue;

    const idxSql = sql.replace(/^CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS');
    const ok = await execSafe(clientPool, idxSql, `índice ${idxName}`);
    if (ok) created++;
  }

  console.log(`  Índices creados: ${created}`);
}

// ============================================================
// FASE 6: VISTAS
// ============================================================
async function syncViews(parsed) {
  console.log('\n--- FASE 6: Vistas ---');
  for (const sql of parsed.viewBlocks) {
    const nameMatch = sql.match(/VIEW\s+((public|tintas)\.\w+)/);
    if (nameMatch) {
      await execSafe(clientPool, sql, `vista ${nameMatch[1]}`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const startTime = Date.now();
  console.log('========================================');
  console.log('  SINCRONIZACIÓN DE BASE DE DATOS');
  console.log('  Origen:  localhost:5432/printlab');
  console.log('  Destino: 192.168.1.48:5433/printlab');
  console.log('========================================');

  try {
    if (!fs.existsSync(REF_DUMP_FILE)) {
      throw new Error(`No se encuentra ${REF_DUMP_FILE}. Ejecuta pg_dump primero.`);
    }
    const parsed = parsePgDump(REF_DUMP_FILE);
    console.log(`\nDump parseado: Types=${parsed.typeBlocks.length}, Tables=${parsed.tableBlocks.length}, Indexes=${parsed.indexBlocks.length}, Views=${parsed.viewBlocks.length}, Alter=${parsed.alterBlocks.length}`);

    console.log('\n[INFO] Descubriendo schema del cliente...');
    const clientInfo = await discoverClientInfo();
    console.log(`  Tablas: ${clientInfo.existingTablesSet.size}, Schemas: ${clientInfo.existingSchemas.join(', ')}`);

    const newTables = await applyDdlToClient(parsed, clientInfo);
    console.log(`  Tablas nuevas creadas: ${newTables.length}`);

    await applyConstraints(parsed);

    await addMissingColumns(clientInfo);

    await recreateIndexes(parsed);

    await syncViews(parsed);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================`);
    console.log(`  SINCRONIZACIÓN COMPLETADA (${elapsed}s)`);
    console.log(`========================================`);

  } catch (err) {
    console.error(`\n[FATAL] ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await refPool.end();
    await clientPool.end();
  }
}

main();
