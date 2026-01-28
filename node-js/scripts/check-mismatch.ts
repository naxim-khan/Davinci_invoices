import { Pool } from 'pg';
import 'dotenv/config';

async function checkInvoicesAndOperators() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Invoice Operator Check ---');
        const res = await pool.query(`
            SELECT "operatorId", COUNT(*) as invoice_count 
            FROM "Invoice" 
            GROUP BY "operatorId"
        `);
        console.table(res.rows);

        console.log('\n--- ClientKYC Table Content ---');
        const clients = await pool.query('SELECT * FROM "ClientKYC"');
        console.log(`Actual ClientKYC count: ${clients.rowCount ?? 0}`);
        if ((clients.rowCount ?? 0) > 0) {
            console.table(clients.rows.map(r => ({
                id: r.id,
                name: r.fullLegalNameEntity,
                status: r.status,
                billingEnabled: r.billingPeriodEnabled
            })));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkInvoicesAndOperators();
