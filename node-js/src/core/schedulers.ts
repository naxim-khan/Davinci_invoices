import { logger } from '../common/utils/logger.util';
import { ConsolidatedInvoiceScheduler } from '../modules/invoices/services/ConsolidatedInvoiceScheduler';
import { InvoiceOverdueScheduler } from '../modules/invoices/services/InvoiceOverdueScheduler';

/**
 * Initialize and start all schedulers
 */
export function initializeSchedulers(): void {
    logger.info('Initializing schedulers...');

    // Initialize Invoice Overdue Scheduler (existing)
    try {
        const overdueScheduler = InvoiceOverdueScheduler.getInstance();
        overdueScheduler.start();
        logger.info('✅ Invoice Overdue Scheduler started');
    } catch (error) {
        logger.error({
            msg: 'Failed to start Invoice Overdue Scheduler',
            error: error instanceof Error ? error.message : String(error),
        });
    }

    // Initialize Consolidated Invoice Scheduler (new)
    const consolidationEnabled = process.env.CONSOLIDATION_ENABLED !== 'false';

    if (consolidationEnabled) {
        try {
            const consolidatedScheduler = ConsolidatedInvoiceScheduler.getInstance();
            consolidatedScheduler.start();
            logger.info('✅ Consolidated Invoice Scheduler started');
        } catch (error) {
            logger.error({
                msg: 'Failed to start Consolidated Invoice Scheduler',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    } else {
        logger.info('ℹ️  Consolidated Invoice Scheduler is disabled');
    }
}

/**
 * Stop all schedulers gracefully
 */
export function stopSchedulers(): void {
    logger.info('Stopping schedulers...');

    try {
        const overdueScheduler = InvoiceOverdueScheduler.getInstance();
        overdueScheduler.stop();
        logger.info('✅ Invoice Overdue Scheduler stopped');
    } catch (error) {
        logger.error({
            msg: 'Error stopping Invoice Overdue Scheduler',
            error: error instanceof Error ? error.message : String(error),
        });
    }

    try {
        const consolidatedScheduler = ConsolidatedInvoiceScheduler.getInstance();
        consolidatedScheduler.stop();
        logger.info('✅ Consolidated Invoice Scheduler stopped');
    } catch (error) {
        logger.error({
            msg: 'Error stopping Consolidated Invoice Scheduler',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
