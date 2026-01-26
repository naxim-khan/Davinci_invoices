import { Pool } from 'pg';
import 'dotenv/config';

async function checkEligibility() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- ClientKYC Status Check ---');
        const clients = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN "billingPeriodEnabled" = true THEN 1 ELSE 0 END) as enabled,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN "billingPeriodEnabled" = true AND status = 'APPROVED' AND "billingPeriodType" IN ('WEEKLY', 'MONTHLY') THEN 1 ELSE 0 END) as eligible
            FROM "ClientKYC"
        `);
        console.log(`Total Customers: ${clients.rows[0].total}`);
        console.log(`Billing Enabled: ${clients.rows[0].enabled}`);
        console.log(`Status Approved: ${clients.rows[0].approved}`);
        console.log(`Fully Eligible:  ${clients.rows[0].eligible}`);

        if (clients.rows[0].eligible === '0') {
            console.log('\n--- Sample of Non-Eligible Customers ---');
            const sample = await pool.query(`
                SELECT "fullLegalNameEntity", status, "billingPeriodEnabled", "billingPeriodType"
                FROM "ClientKYC"
                LIMIT 3
             `);
            console.table(sample.rows);
        }

        console.log('\n--- Unconsolidated Invoices Check ---');
        const invoices = await pool.query(`
            SELECT COUNT(*) as count 
            FROM "Invoice" 
            WHERE "includedInConsolidatedInvoiceId" IS NULL 
            AND status != 'CANCELLED'
        `);
        console.log(`Unconsolidated Invoices: ${invoices.rows[0].count}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkEligibility();
