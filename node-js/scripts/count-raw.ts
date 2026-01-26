import { Pool } from 'pg';
import 'dotenv/config';

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        const res = await pool.query('SELECT COUNT(*) FROM "ConsolidatedInvoice"');
        console.log(`TOTAL_COUNT_IS:${res.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
