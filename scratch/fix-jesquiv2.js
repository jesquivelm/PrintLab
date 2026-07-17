const { query } = require('../db/postgres');

async function main() {
    await query(`UPDATE admin_users SET photo_url = '' WHERE LOWER(TRIM(username)) = 'jesquiv'`);
    console.log('photo_url cleared for jesquiv');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
