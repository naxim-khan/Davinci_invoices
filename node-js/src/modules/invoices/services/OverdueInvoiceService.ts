import { logger } from '../../../common/utils/logger.util';
import { OverdueInvoiceRepository } from '../repositories/OverdueInvoiceRepository';

/**
 * Metrics returned from overdue invoice marking operation
 */
export interface OverdueInvoiceMetrics {
    totalFound: number;
    totalUpdated: number;
    executionTimeMs: number;
    timestamp: string;
    errors: string[];
}

/**
 * Overdue Invoice Service
 * 
 * Contains business logic for identifying and marking overdue invoices.
 * This service is idempotent and safe to run multiple times.
 */
export class OverdueInvoiceService {
    private repository: OverdueInvoiceRepository;

    constructor() {
        this.repository = new OverdueInvoiceRepository();
    }

    /**
     * Mark all overdue invoices (PENDING or DRAFT status, dueDate < now)
     * 
     * This operation is idempotent - safe to run multiple times.
     * Only invoices with status=PENDING or DRAFT will be updated.
     * Excludes: PAID, CANCELLED, and already OVERDUE invoices.
     * 
     * @returns Metrics about the operation
     */
    async markOverdueInvoices(): Promise<OverdueInvoiceMetrics> {
        const startTime = Date.now();
        const errors: string[] = [];

        logger.info({
            msg: 'Starting overdue invoice marking process',
            timestamp: new Date().toISOString(),
        });

        try {
            // Step 1: Find all PENDING or DRAFT invoices past their due date
            logger.info('Querying for overdue invoices (PENDING or DRAFT status)...');
            const overdueInvoiceIds = await this.repository.findPendingOverdueInvoices();

            logger.info({
                msg: 'Found overdue invoices',
                count: overdueInvoiceIds.length,
            });

            if (overdueInvoiceIds.length === 0) {
                const executionTimeMs = Date.now() - startTime;
                logger.info({
                    msg: 'No overdue invoices found',
                    executionTimeMs,
                });

                return {
                    totalFound: 0,
                    totalUpdated: 0,
                    executionTimeMs,
                    timestamp: new Date().toISOString(),
                    errors: [],
                };
            }

            // Step 2: Get invoice details for logging (before update)
            const invoiceDetails = await this.repository.getOverdueInvoiceDetails(
                overdueInvoiceIds,
            );

            logger.info({
                msg: 'Overdue invoice details',
                invoices: invoiceDetails.map((inv) => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    clientName: inv.clientName,
                    dueDate: inv.dueDate?.toISOString(),
                    currentStatus: inv.status,
                })),
            });

            // Step 3: Mark invoices as OVERDUE
            logger.info('Updating invoice statuses to OVERDUE...');
            const updatedCount = await this.repository.markAsOverdue(overdueInvoiceIds);

            const executionTimeMs = Date.now() - startTime;

            logger.info({
                msg: 'Overdue invoice marking completed',
                totalFound: overdueInvoiceIds.length,
                totalUpdated: updatedCount,
                executionTimeMs,
            });

            // Log discrepancy if counts don't match (could happen if status changed mid-operation)
            if (updatedCount < overdueInvoiceIds.length) {
                const warningMsg = `Some invoices were not updated (found: ${overdueInvoiceIds.length}, updated: ${updatedCount}). This may indicate concurrent modifications.`;
                logger.warn({
                    msg: warningMsg,
                    totalFound: overdueInvoiceIds.length,
                    totalUpdated: updatedCount,
                });
                errors.push(warningMsg);
            }

            return {
                totalFound: overdueInvoiceIds.length,
                totalUpdated: updatedCount,
                executionTimeMs,
                timestamp: new Date().toISOString(),
                errors,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error({
                msg: 'Error marking overdue invoices',
                error: errorMessage,
                executionTimeMs,
            });

            errors.push(errorMessage);

            return {
                totalFound: 0,
                totalUpdated: 0,
                executionTimeMs,
                timestamp: new Date().toISOString(),
                errors,
            };
        }
    }
}
