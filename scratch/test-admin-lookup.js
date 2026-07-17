const { query } = require('../db/postgres');

async function main() {
    const r = await query(`SELECT id, username, password, is_active, locked_until, must_change_password, login_attempts FROM admin_users WHERE LOWER(TRIM(username)) = LOWER(TRIM('admin'))`);
    console.log('Rows:', r.rows.length);
    if (r.rows.length) {
        const u = r.rows[0];
        console.log('User:', u.username, 'ID:', u.id, 'Active:', u.is_active, 'Locked:', u.locked_until, 'Must change:', u.must_change_password, 'Attempts:', u.login_attempts);
        console.log('Password hash:', u.password ? u.password.substring(0, 20) + '...' : 'NULL');
    } else {
        console.log('User NOT FOUND');
    }
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
