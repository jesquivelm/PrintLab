const bcrypt = require('bcrypt');
const { query } = require('../db/postgres');

async function main() {
    const hash = await bcrypt.hash('1234', 12);
    await query(`UPDATE admin_users SET password = $1, must_change_password = FALSE, login_attempts = 0, locked_until = NULL WHERE LOWER(TRIM(username)) = 'jesquiv'`, [hash]);
    console.log('jesquiv password reset to 1234');

    const r = await query(`SELECT photo_url, LENGTH(photo_url) AS len FROM admin_users WHERE LOWER(TRIM(username)) = 'jesquiv'`);
    console.log('photo_url length:', r.rows[0].len, 'bytes');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
