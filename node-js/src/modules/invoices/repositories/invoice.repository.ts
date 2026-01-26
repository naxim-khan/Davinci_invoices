import { Invoice } from '@prisma/client';
import { prisma } from '../../../core/database/prisma.client';

/**
 * Invoice Repository
 * Handles all database operations for invoices
 * Pure data access layer - no business logic
 */
export class InvoiceRepository {
    /**
     * Find invoice by ID
     * @param id - Invoice ID
     * @returns Invoice entity or null if not found
     */
    async findById(id: number): Promise<Invoice | null> {
        return await prisma.invoice.findUnique({
            where: { id },
        });
    }

    /**
     * Find invoice by ID with FIR template data
     * Joins with FIR table to get invoiceTemplate based on firName
     * @param id - Invoice ID
     * @returns Invoice data with invoiceTemplate from FIR table
     */
    async findByIdWithTemplate(id: number): Promise<(Invoice & { invoiceTemplate: string | null }) | null> {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
        });

        if (!invoice) {
            return null;
        }

        // If invoice has firName, fetch the template from FIR table
        if (invoice.firName) {
            const fir = await prisma.fIR.findUnique({
                where: { firName: invoice.firName },
                select: { invoiceTemplate: true },
            });

            return {
                ...invoice,
                invoiceTemplate: fir?.invoiceTemplate?.toString() ?? null,
            };
        }

        return {
            ...invoice,
            invoiceTemplate: null,
        };
    }
}
