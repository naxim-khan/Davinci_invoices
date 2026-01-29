/**
 * Comprehensive Analysis of Today's Flight & Invoice Processing
 * 
 * This script provides a detailed summary of all processing activity today.
 */

// Suppress useless node warnings
process.env.NODE_NO_WARNINGS = '1';

import 'dotenv/config';
import { prisma } from '../src/core/database/prisma.client';

/**
 * Get start and end of today in local time
 */
function getTodayDateRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return { start, end };
}

async function main() {
    try {
        const { start, end } = getTodayDateRange();

        // 1. Success Invoices
        const successfulInvoicesCount = await prisma.invoice.count({
            where: { createdAt: { gte: start, lte: end } }
        });

        const successfulFlightIds = await prisma.invoice.groupBy({
            by: ['flightId'],
            where: { createdAt: { gte: start, lte: end } }
        });

        // 2. Invoice Errors
        const errorCount = await prisma.invoiceError.count({
            where: { createdAt: { gte: start, lte: end } }
        });

        const errorFlightIds = await prisma.invoiceError.groupBy({
            by: ['flightId'],
            where: { createdAt: { gte: start, lte: end } }
        });

        // 3. Consolidated Invoices
        const consolidatedCount = await prisma.consolidatedInvoice.count({
            where: { createdAt: { gte: start, lte: end } }
        });

        // 4. Audit Logs (Flight & Invoice categories)
        const auditFlightLogs = await prisma.auditLog.count({
            where: {
                createdAt: { gte: start, lte: end },
                category: { in: ['FLIGHT', 'INVOICE', 'CONSOLIDATED_INVOICE'] as any }
            }
        });

        // 5. Reprocess Jobs
        const reprocessJobs = await prisma.reprocessJob.count({
            where: { createdAt: { gte: start, lte: end } }
        });

        // 6. Queue Activity
        const queueAddedToday = await prisma.flightProcessingQueue.count({
            where: { createdAt: { gte: start, lte: end } }
        });

        console.log('\n==================================================');
        console.log(`COMPREHENSIVE ANALYSIS: ${new Date().toLocaleDateString()}`);
        console.log('==================================================');

        console.log(`\n--- INVOICE GENERATION ---`);
        console.log(`Standard Invoices:      ${successfulInvoicesCount}`);
        console.log(`Consolidated Invoices:  ${consolidatedCount}`);
        console.log(`Unique Flights (Success): ${successfulFlightIds.length}`);

        console.log(`\n--- ERROR TRACKING ---`);
        console.log(`Invoice Errors logged:  ${errorCount}`);
        console.log(`Unique Flights (Error):   ${errorFlightIds.length}`);

        const totalUniqueFlights = new Set([
            ...successfulFlightIds.map(f => f.flightId.toString()),
            ...errorFlightIds.map(f => f.flightId.toString())
        ]).size;

        console.log(`\n--- TOTAL IMPACT ---`);
        console.log(`Total Unique Flights Touched: ${totalUniqueFlights}`);

        console.log(`\n--- SYSTEM ACTIVITY ---`);
        console.log(`Audit Log Entries:      ${auditFlightLogs}`);
        console.log(`Reprocessing Jobs:      ${reprocessJobs}`);
        console.log(`Flights Added to Queue:  ${queueAddedToday}`);
        console.log('==================================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Error during analysis:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
