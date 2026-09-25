require('dotenv').config();
const { Pool } = require('pg');

// ============================================================
// CONFIGURACION
// ============================================================
const CLIENT_DB_URL = 'postgresql://postgres:Rmaya!9A@192.168.1.48:5433/printlab?sslmode=disable';
const LOCAL_DB_URL = process.env.DATABASE_URL;

const clientPool = new Pool({ connectionString: CLIENT_DB_URL });
const localPool = new Pool({ connectionString: LOCAL_DB_URL });

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
    console.error(`  [ERROR] ${label || text.substring(0, 80)}: ${err.message}`);
    return false;
  }
}

// ============================================================
// FASE 1: SYNC ADMIN_USERS
// Traer usuarios del cliente que no existen en local.
// Asignar IDs nuevos para evitar conflicto con empacador1/jmendez/impresor2.
// ============================================================
async function syncAdminUsers() {
  console.log('\n--- FASE 1: admin_users ---');

  const localUsers = await query(localPool, 'SELECT id, username FROM admin_users');
  const localUsernames = new Set(localUsers.map(u => u.username));
  const localMaxId = Math.max(...localUsers.map(u => u.id));

  const clientUsers = await query(clientPool, 'SELECT * FROM admin_users ORDER BY id');
  const missingUsers = clientUsers.filter(u => !localUsernames.has(u.username));

  if (missingUsers.length === 0) {
    console.log('  No hay usuarios faltantes.');
    return;
  }

  console.log(`  Usuarios faltantes: ${missingUsers.length}`);
  let nextId = localMaxId + 1;

  for (const user of missingUsers) {
    const newId = nextId++;
    console.log(`  INSERTANDO: ${user.username} (${user.full_name}) -> nuevo id: ${newId}`);

    const sql = `
      INSERT INTO admin_users (
        id, full_name, username, password, department, process, photo_url,
        created_at, updated_at, permission_id, signature_url, email, phone,
        phone_secondary, notify_email, notify_whatsapp, notify_sms, is_active,
        floating_button_config, sap_salesperson_code, sap_salesperson_name,
        default_landing, login_attempts, locked_until, pin_hash, pin_created_at,
        pin_attempts, recovery_responsible_departments, must_change_password,
        firma_ancho, firma_alto, firma_offset_x, firma_offset_y, genero
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32, $33, $34
      )
      ON CONFLICT (id) DO NOTHING
    `;

    await localPool.query(sql, [
      newId, user.full_name, user.username, user.password,
      user.department, user.process, user.photo_url,
      user.created_at, user.updated_at, user.permission_id,
      user.signature_url, user.email, user.phone,
      user.phone_secondary, user.notify_email, user.notify_whatsapp,
      user.notify_sms, user.is_active,
      user.floating_button_config || '{}', user.sap_salesperson_code,
      user.sap_salesperson_name, user.default_landing,
      user.login_attempts || 0, user.locked_until,
      user.pin_hash, user.pin_created_at,
      user.pin_attempts || 0, user.recovery_responsible_departments || '{}',
      user.must_change_password || false,
      user.firma_ancho, user.firma_alto, user.firma_offset_x, user.firma_offset_y,
      user.genero
    ]);

    console.log(`    -> OK (id: ${newId})`);
  }
}

// ============================================================
// FASE 2: SYNC FLEXO_PRODUCTS
// Traer productos del cliente que no existen en local (por product_code).
// Copiar solo columnas que existen en ambas tablas.
// ============================================================
async function syncFlexoProducts() {
  console.log('\n--- FASE 2: flexo_products ---');

  const localProducts = await query(localPool, 'SELECT product_code FROM flexo_products');
  const localCodes = new Set(localProducts.map(p => p.product_code));

  const clientProducts = await query(clientPool, 'SELECT * FROM flexo_products');
  const missingProducts = clientProducts.filter(p => !localCodes.has(p.product_code));

  if (missingProducts.length === 0) {
    console.log('  No hay productos faltantes.');
    return;
  }

  console.log(`  Productos faltantes: ${missingProducts.length}`);

  // Get column names that exist in BOTH tables
  const localCols = await query(localPool, `
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'flexo_products' ORDER BY ordinal_position
  `);
  const localColNames = new Set(localCols.map(c => c.column_name));

  const clientCols = await query(clientPool, `
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'flexo_products' ORDER BY ordinal_position
  `);

  const sharedCols = clientCols.filter(c => localColNames.has(c.column_name));
  const colNames = sharedCols.map(c => c.column_name);

  for (const product of missingProducts) {
    // Filter to only shared columns
    const filteredCols = colNames.filter(c => product[c] !== undefined);
    const values = filteredCols.map(c => product[c]);
    const placeholders = filteredCols.map((_, i) => `$${i + 1}`);

    // Check if product_code already exists (race condition guard)
    const exists = await query(localPool, 'SELECT 1 FROM flexo_products WHERE product_code = $1', [product.product_code]);
    if (exists.length > 0) {
      console.log(`  [SKIP] ${product.product_code} ya existe`);
      continue;
    }

    const sql = `
      INSERT INTO flexo_products (${filteredCols.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    try {
      await localPool.query(sql, values);
      console.log(`  [OK] ${product.product_code} (${product.product_name || ''})`);
    } catch (err) {
      console.error(`  [ERROR] ${product.product_code}: ${err.message}`);
    }
  }
}

// ============================================================
// FASE 3: SYNC FLEXO_ORDINES (OP-000316 del cliente?)
// Verificar si hay ordenes del cliente que no existan en local.
// ============================================================
async function syncFlexoOrders() {
  console.log('\n--- FASE 3: flexo_orders ---');

  const localOrders = await query(localPool, 'SELECT order_code FROM flexo_orders');
  const localCodes = new Set(localOrders.map(o => o.order_code));

  const clientOrders = await query(clientPool, 'SELECT order_code FROM flexo_orders');
  const missingOrders = clientOrders.filter(o => !localCodes.has(o.order_code));

  if (missingOrders.length === 0) {
    console.log('  No hay ordenes faltantes del cliente.');
    return;
  }

  console.log(`  Ordenes faltantes: ${missingOrders.length}`);

  // Get shared columns
  const localCols = await query(localPool, `
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'flexo_orders' ORDER BY ordinal_position
  `);
  const localColNames = new Set(localCols.map(c => c.column_name));

  const clientCols = await query(clientPool, `
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'flexo_orders' ORDER BY ordinal_position
  `);

  const sharedCols = clientCols.filter(c => localColNames.has(c.column_name));
  const colNames = sharedCols.map(c => c.column_name);

  for (const orderCode of missingOrders.map(o => o.order_code)) {
    const clientRow = (await query(clientPool, 'SELECT * FROM flexo_orders WHERE order_code = $1', [orderCode]))[0];
    if (!clientRow) continue;

    const filteredCols = colNames.filter(c => clientRow[c] !== undefined);
    const values = filteredCols.map(c => clientRow[c]);
    const placeholders = filteredCols.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO flexo_orders (${filteredCols.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    try {
      await localPool.query(sql, values);
      console.log(`  [OK] ${orderCode}`);
    } catch (err) {
      console.error(`  [ERROR] ${orderCode}: ${err.message}`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const startTime = Date.now();
  console.log('========================================');
  console.log('  SINCRONIZACION DE DATOS');
  console.log('  Origen:  192.168.1.48:5433/printlab (cliente)');
  console.log('  Destino: localhost:5432/printlab (local)');
  console.log('  Modo: SOLO DATOS (sin cambios de esquema)');
  console.log('========================================');

  try {
    await syncAdminUsers();
    await syncFlexoProducts();
    await syncFlexoOrders();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================`);
    console.log(`  SINCRONIZACION COMPLETADA (${elapsed}s)`);
    console.log(`========================================`);

  } catch (err) {
    console.error(`\n[FATAL] ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await clientPool.end();
    await localPool.end();
  }
}

main();
