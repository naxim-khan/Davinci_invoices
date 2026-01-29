
import { Client } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_lyb1iA2OJZpq@ep-plain-water-adbwo5ah-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Check InvoiceError table
        const errorRes = await client.query('SELECT COUNT(*) FROM "InvoiceError"');
        console.log(`Total InvoiceError records: ${errorRes.rows[0].count}`);

        const lastErrorRes = await client.query('SELECT * FROM "InvoiceError" ORDER BY "createdAt" DESC LIMIT 1');
        if (lastErrorRes.rows.length > 0) {
            console.log('Most recent InvoiceError:');
            console.log(JSON.stringify(lastErrorRes.rows[0], null, 2));
        } else {
            console.log('No InvoiceError records found.');
        }

        // Check Invoice table
        const invoiceRes = await client.query('SELECT COUNT(*) FROM "Invoice"');
        console.log(`Total Invoice records: ${invoiceRes.rows[0].count}`);

        if (parseInt(invoiceRes.rows[0].count) > 0) {
            const lastInvoiceRes = await client.query('SELECT * FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 1');
            console.log('Most recent Invoice:');
            console.log(JSON.stringify(lastInvoiceRes.rows[0], null, 2));
        } else {
            console.log('No Invoice records found.');
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await client.end();
    }
}

main();
