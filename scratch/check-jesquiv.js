const bcrypt = require('bcrypt');
const { query } = require('../db/postgres');

async function main() {
    const r = await query(`SELECT id, username, password, locked_until, login_attempts, must_change_password, is_active FROM admin_users WHERE LOWER(TRIM(username)) = 'jesquiv'`);
    const u = r.rows[0];
    console.log('User:', u.username, 'ID:', u.id, 'Active:', u.is_active, 'Locked:', u.locked_until, 'Must change:', u.must_change_password, 'Attempts:', u.login_attempts);
    const pw = u.password;
    console.log('Password hash:', pw ? pw.substring(0, 25) + '...' : 'NULL');
    console.log('Is hashed:', pw && pw.startsWith('$2'));
    if (pw && pw.startsWith('$2')) {
        const match = await bcrypt.compare('1234', pw);
        console.log('bcrypt.compare("1234", hash):', match);
    } else {
        console.log('Plaintext match:', pw === '1234');
    }
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
