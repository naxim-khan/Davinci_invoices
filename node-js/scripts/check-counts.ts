import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/core/database/prisma.client';

async function main() {
    console.log('--- Database Record Counts ---');
    try {
        const queueCount = await prisma.flightProcessingQueue.count();
        console.log(`FlightProcessingQueue: ${queueCount}`);

        const flightCount = await prisma.invoice.count(); // Assuming flights are processed into Invoices or similar based on schema
        console.log(`Invoices: ${flightCount}`);

        const userCount = await prisma.user.count();
        console.log(`Users: ${userCount}`);

        const auditCount = await prisma.auditLog.count();
        console.log(`AuditLogs: ${auditCount}`);

    } catch (err) {
        console.error('Error counting records:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
