const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/printlab'
});
(async () => {
    try {
        const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'flexo_orders' AND column_name = 'raw_data'");
        console.log('Column type:', r.rows);
        const o = await pool.query("SELECT order_code, raw_data FROM flexo_orders WHERE order_code = $1 LIMIT 1", ['OP-000006']);
        if (o.rows.length) {
            const row = o.rows[0];
            console.log('Order:', row.order_code);
            console.log('raw_data type:', typeof row.raw_data);
            console.log('raw_data keys:', Object.keys(row.raw_data || {}));
            const rd = row.raw_data || {};
            console.log('Has line_snapshot:', !!rd.line_snapshot);
            console.log('line_snapshot keys:', Object.keys(rd.line_snapshot || {}));
            const ls = rd.line_snapshot || {};
            console.log('line_snapshot.raw_data keys:', Object.keys(ls.raw_data || {}));
        }
        await pool.end();
    } catch(e) { console.error(e); await pool.end(); }
})();
