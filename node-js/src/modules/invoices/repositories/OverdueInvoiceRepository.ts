import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../../core/database/prisma.client';

/**
 * Overdue Invoice Repository
 * 
 * Handles database operations for identifying and marking overdue invoices.
 * Pure data access layer - no business logic.
 */
export class OverdueInvoiceRepository {
    /**
     * Find all PENDING or DRAFT invoices that are past their due date
     * Excludes: PAID, CANCELLED, and already OVERDUE invoices
     * 
     * @returns Array of overdue invoice IDs
     */
    async findPendingOverdueInvoices(): Promise<number[]> {
        const now = new Date();

        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: {
                    in: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT],
                },
                dueDate: {
                    lt: now, // less than current time
                    not: null, // exclude invoices without due dates
                },
            },
            select: {
                id: true,
            },
            // Use the existing composite index: @@index([status, dueDate])
            orderBy: {
                dueDate: 'asc', // Oldest overdue first
            },
        });

        return overdueInvoices.map((invoice) => invoice.id);
    }

    /**
     * Mark invoices as OVERDUE
     * 
     * Updates only if current status is PENDING or DRAFT (idempotency check).
     * This ensures the operation is safe to run multiple times.
     * Excludes: PAID, CANCELLED, and already OVERDUE invoices.
     * 
     * @param invoiceIds - Array of invoice IDs to mark as overdue
     * @returns Number of invoices actually updated
     */
    async markAsOverdue(invoiceIds: number[]): Promise<number> {
        if (invoiceIds.length === 0) {
            return 0;
        }

        const result = await prisma.invoice.updateMany({
            where: {
                id: { in: invoiceIds },
                status: {
                    in: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT],
                }, // Idempotency: only update if still PENDING or DRAFT
            },
            data: {
                status: InvoiceStatus.OVERDUE,
                updatedAt: new Date(),
            },
        });

        return result.count;
    }

    /**
     * Get details of overdue invoices for logging/auditing
     * 
     * @param invoiceIds - Array of invoice IDs
     * @returns Invoice details (id, invoiceNumber, clientName, dueDate, status)
     */
    async getOverdueInvoiceDetails(invoiceIds: number[]): Promise<
        Array<{
            id: number;
            invoiceNumber: string;
            clientName: string;
            dueDate: Date | null;
            status: InvoiceStatus;
        }>
    > {
        if (invoiceIds.length === 0) {
            return [];
        }

        return await prisma.invoice.findMany({
            where: {
                id: { in: invoiceIds },
            },
            select: {
                id: true,
                invoiceNumber: true,
                clientName: true,
                dueDate: true,
                status: true,
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
    }
}
