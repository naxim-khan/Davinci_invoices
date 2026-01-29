/**
 * List Today's Invoice Errors Script
 * 
 * This script fetches and displays all invoice errors created today.
 * 
 * Usage: npm run list-today-invoice-errors
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

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        const { start, end } = getTodayDateRange();

        // Fetch invoice errors created today
        const errors = await prisma.invoiceError.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                flightId: true,
                errorType: true,
                errorMessage: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (errors.length === 0) {
            console.log('No invoice errors created today.');
        } else {
            console.log('\n--- Today\'s Invoice Errors ---');
            console.log('Flight ID | Error Type | Message');
            console.log('--------------------------------------------------');
            errors.forEach(err => {
                const flightIdStr = err.flightId.toString();
                console.log(`${flightIdStr} | ${err.errorType || 'N/A'} | ${err.errorMessage || 'N/A'}`);
            });
            console.log('--------------------------------------------------');
            console.log(`Total Errors Found: ${errors.length}\n`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fetching invoice errors:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
