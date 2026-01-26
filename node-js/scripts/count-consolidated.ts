import { prisma } from '../src/core/database/prisma.client';

async function count() {
    const count = await prisma.consolidatedInvoice.count();
    console.log(`TOTAL_CONSOLIDATED_INVOICES: ${count}`);
    const lineItems = await prisma.consolidatedInvoiceLineItem.count();
    console.log(`TOTAL_LINE_ITEMS: ${lineItems}`);
    process.exit(0);
}

count().catch(err => {
    console.error(err);
    process.exit(1);
});
