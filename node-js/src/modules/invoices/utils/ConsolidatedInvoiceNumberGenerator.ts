import { BillingPeriodType } from '@prisma/client';
import { prisma } from '../../../core/database/prisma.client';

/**
 * Consolidated Invoice Number Generator
 *
 * Generates unique invoice numbers in the format:
 * CONS-YYYY-WNN-XXX (Weekly: Year-Week-Sequence)
 * CONS-YYYY-MNN-XXX (Monthly: Year-Month-Sequence)
 */
export class ConsolidatedInvoiceNumberGenerator {

    /**
     * Generate unique consolidated invoice number
     */
    async generate(billingPeriodType: BillingPeriodType, periodStart: Date): Promise<string> {
        const year = periodStart.getFullYear();
        const prefix = process.env.CONSOLIDATION_INVOICE_NUMBER_PREFIX || 'CONS';

        let periodIndicator: string;
        if (billingPeriodType === 'WEEKLY') {
            const weekNumber = this.getWeekNumber(periodStart);
            periodIndicator = `W${weekNumber.toString().padStart(2, '0')}`;
        } else {
            const monthNumber = periodStart.getMonth() + 1;
            periodIndicator = `M${monthNumber.toString().padStart(2, '0')}`;
        }

        // Get last invoice number with this prefix pattern
        const lastInvoice = await prisma.consolidatedInvoice.findFirst({
            where: {
                invoiceNumber: {
                    startsWith: `${prefix}-${year}-${periodIndicator}-`,
                },
            },
            orderBy: {
                invoiceNumber: 'desc',
            },
        });

        let sequence = 1;
        if (lastInvoice) {
            // Extract sequence number from last invoice
            const parts = lastInvoice.invoiceNumber.split('-');
            const lastSequence = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }

        const sequenceStr = sequence.toString().padStart(3, '0');
        return `${prefix}-${year}-${periodIndicator}-${sequenceStr}`;
    }

    /**
     * Get ISO week number
     */
    private getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
}
