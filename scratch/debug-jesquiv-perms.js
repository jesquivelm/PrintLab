const { query } = require('../db/postgres');

async function main() {
    const r = await query(`SELECT u.id, u.username, u.permission_id, p.permission_name, p.module_permissions
        FROM admin_users u
        LEFT JOIN admin_permissions p ON p.id = u.permission_id
        WHERE LOWER(TRIM(u.username)) = 'jesquiv'`);
    const u = r.rows[0];
    console.log('User:', u.username, 'permission_id:', u.permission_id);
    console.log('Permission name:', u.permission_name);
    console.log('Module permissions:', JSON.stringify(u.module_permissions));
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
