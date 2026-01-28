
import { prisma } from '../src/core/database/prisma.client';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function verify() {
    // 1. Read sqs.json
    const sqsData = await readFile(join(process.cwd(), 'data', 'processed-flights', 'sqs.json'), 'utf-8');
    const lines = sqsData.trim().split('\n');
    const lastLine = lines[lines.length - 1]; // Get latest
    const rawRecord = JSON.parse(lastLine);
    const flightId = rawRecord.flightId;
    const rawInvoice = rawRecord.invoices[0]; // Now we expect invoices

    console.log(`Checking Flight: ${flightId}`);

    // 2. Fetch Invoice
    const invoice = await prisma.invoice.findFirst({
        where: { flightId: flightId },
        orderBy: { id: 'desc' }
    });

    if (!invoice) {
        console.error('Invoice not found in DB!');
        return;
    }

    console.log(`Found Invoice ID: ${invoice.id}, Number: ${invoice.invoiceNumber}`);

    // 3. Compare
    const mismatches: any[] = [];

    // Helper to compare
    const check = (field: string, dbVal: any, rawVal: any) => {
        // Normalize undefined/null for comparison
        const db = dbVal === null ? 'null' : (dbVal instanceof Date ? dbVal.toISOString() : (typeof dbVal === 'bigint' ? dbVal.toString() : dbVal));
        const raw = rawVal === undefined || rawVal === null ? 'null' : (typeof rawVal === 'bigint' ? rawVal.toString() : rawVal);

        // Strict equality won't work for everything
        if (db != raw) { // loose equality
            // Handle special cases
            if (field === 'flightDate' && db && raw) {
                if (new Date(dbVal).toISOString().split('T')[0] === new Date(rawVal).toISOString().split('T')[0]) return;
            }
            if (field === 'otherFeesAmount') {
                if (JSON.stringify(dbVal) === JSON.stringify(rawVal)) return;
            }
            if (field === 'createdAt' || field === 'updatedAt' || field === 'id' || field === 'invoiceNumber') return; // Ignore generated fields if needed, or expected to mismatch if re-created

            mismatches.push({ field, db, raw });
        }
    };

    // Compare all relevant fields
    check('flightNumber', invoice.flightNumber, rawInvoice.flightNumber);
    check('originIcao', invoice.originIcao, rawInvoice.originIcao);
    check('destinationIcao', invoice.destinationIcao, rawInvoice.destinationIcao);
    check('registrationNumber', invoice.registrationNumber, rawInvoice.registrationNumber);
    check('feeAmount', invoice.feeAmount, rawInvoice.feeAmount);
    check('otherFeesAmount', invoice.otherFeesAmount, rawInvoice.otherFeesAmount);
    check('totalUsdAmount', invoice.totalUsdAmount, rawInvoice.totalUsdAmount);
    check('clientName', invoice.clientName, rawInvoice.clientName);

    console.log('--- Comparison Results ---');
    if (mismatches.length === 0) {
        console.log('✅ All checked fields match perfectly!');
    } else {
        console.log('⚠️ Mismatches found:');
        console.table(mismatches);
    }

    console.log('\n--- DB Data ---');
    console.log(JSON.stringify(invoice, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    console.log('\n--- Raw Invoice (Partial) ---');
    console.log(JSON.stringify({
        flightNumber: rawInvoice.flightNumber,
        totalUsdAmount: rawInvoice.totalUsdAmount
    }, null, 2));

}

verify().finally(() => prisma.$disconnect());
