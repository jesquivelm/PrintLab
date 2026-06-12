process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://avnadmin:AVNS_QGAq_P9d_jwB8zutIp6@printlab-server-printlab.f.aivencloud.com:26628/printlab?sslmode=require'
});

async function main() {
    try {
        // Check what changed in general config recently
        console.log('=== RECENT GENERAL CONFIG CHANGES ===');
        const audit = await pool.query(
            "SELECT id, field_key, field_label, old_value_display, new_value_display, changed_by, changed_at FROM audit_log WHERE module_key = 'configuracion' ORDER BY id DESC LIMIT 20"
        );
        audit.rows.forEach(row => {
            const oldPreview = (row.old_value_display || '').substring(0, 80);
            const newPreview = (row.new_value_display || '').substring(0, 80);
            console.log(`#${row.id} | ${row.changed_at} | ${row.field_key}: "${oldPreview}" -> "${newPreview}"`);
        });

    } catch (e) {
        console.log('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}

main();
