const bcrypt = require('bcrypt');
const { query } = require('../db/postgres');

async function main() {
    const hash = await bcrypt.hash('admin', 12);
    await query(`UPDATE admin_users SET password = $1, must_change_password = FALSE WHERE LOWER(TRIM(username)) = 'admin'`, [hash]);
    console.log('Admin password reset to: admin');
    console.log('Hash:', hash);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
