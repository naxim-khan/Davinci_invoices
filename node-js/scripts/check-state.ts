import { prisma } from '../src/core/database/prisma.client';

async function check() {
    try {
        const total = await prisma.flightProcessingQueue.count();
        const pending = await prisma.flightProcessingQueue.count({
            where: { id: { gt: 200 } }
        });
        const invoices = await prisma.invoice.count();
        const errors = await prisma.invoiceError.count();

        console.log('--- DB Status ---');
        console.log(`Total queue entries: ${total}`);
        console.log(`Pending entries (ID > 200): ${pending}`);
        console.log(`Total invoices: ${invoices}`);
        console.log(`Total invoice errors: ${errors}`);
        console.log('-----------------');
    } catch (err) {
        console.error('Failed to check counts:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
