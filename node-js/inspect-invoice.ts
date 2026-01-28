import { prisma } from './src/core/database/prisma.client';

async function inspect() {
    const invoice = await prisma.consolidatedInvoice.findUnique({
        where: { id: 2 },
        include: {
            ClientKYC: true,
            ConsolidatedInvoiceLineItem: true
        }
    });

    console.log(JSON.stringify(invoice, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));

    await prisma.$disconnect();
}

inspect();
