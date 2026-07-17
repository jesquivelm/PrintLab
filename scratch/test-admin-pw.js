const bcrypt = require('bcrypt');
const { query } = require('../db/postgres');

async function main() {
    const r = await query(`SELECT password FROM admin_users WHERE LOWER(TRIM(username)) = 'admin'`);
    const pw = r.rows[0].password;
    console.log('Stored hash:', pw);
    console.log('Starts with $2:', pw.startsWith('$2'));
    console.log('Length:', pw.length);
    const match = await bcrypt.compare('admin', pw);
    console.log('bcrypt.compare("admin", hash):', match);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
