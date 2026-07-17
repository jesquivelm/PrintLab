const { query } = require('../db/postgres');

async function main() {
    const perms = await query(`SELECT id, permission_name FROM admin_permissions ORDER BY id`);
    console.log('Permissions:');
    perms.rows.forEach(p => console.log(`  ${p.id}: ${p.permission_name}`));

    const users = await query(`SELECT id, username, permission_id, full_name FROM admin_users ORDER BY id`);
    console.log('\nUsers:');
    users.rows.forEach(u => console.log(`  ${u.id}: ${u.username} (${u.full_name}) -> permission_id=${u.permission_id}`));

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
