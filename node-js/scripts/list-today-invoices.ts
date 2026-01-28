/**
 * List Today's Invoices Script
 * 
 * This script fetches and displays all invoices created today.
 * 
 * Usage: npm run list-today-invoices
 */

// Suppress useless node warnings (like PG SSL warnings)
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

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        const { start, end } = getTodayDateRange();

        // Fetch invoices created today
        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                flightId: true,
                clientName: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (invoices.length === 0) {
            console.log('No invoices created today.');
        } else {
            console.log('Today\'s Invoices:');
            invoices.forEach(invoice => { // Changed inv to invoice
                console.log(`${invoice.id} | Flight: ${invoice.flightId} | ${invoice.clientName || 'Unknown'}`); // Updated log format
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
