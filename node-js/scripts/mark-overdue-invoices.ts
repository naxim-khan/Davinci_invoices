/**
 * Mark Overdue Invoices - Standalone Cron Job Script
 * 
 * This script marks invoices as OVERDUE when:
 * - status = PENDING or DRAFT
 * - dueDate < current_time
 * - Excludes: PAID, CANCELLED, and already OVERDUE invoices
 * 
 * Features:
 * - Distributed locking for safe horizontal scaling
 * - Idempotent operations (safe to run multiple times)
 * - Structured logging and metrics
 * - Graceful error handling
 * - Independent of API server process
 * 
 * Usage:
 *   tsx scripts/mark-overdue-invoices.ts
 *   npm run mark-overdue
 * 
 * Recommended Scheduling:
 *   - Run every hour via cron/K8s CronJob/Windows Task Scheduler
 *   - Example cron: 0 * * * * (every hour at minute 0)
 */

// Suppress node warnings
process.env.NODE_NO_WARNINGS = '1';

import 'dotenv/config';
import { prisma } from '../src/core/database/prisma.client';
import { logger } from '../src/common/utils/logger.util';
import { withLock } from '../src/common/utils/distributed-lock.util';
import { OverdueInvoiceService } from '../src/modules/invoices/services/OverdueInvoiceService';

/**
 * Lock identifier for this job
 * Ensures only one instance runs at a time across all deployments
 */
const LOCK_IDENTIFIER = 'invoice-overdue-marking-job';

/**
 * Lock acquisition timeout (5 seconds)
 * If another instance is running, this job will exit gracefully
 */
const LOCK_TIMEOUT_MS = 5000;

/**
 * Main execution function
 */
async function main(): Promise<void> {
    const jobStartTime = Date.now();

    logger.info({
        msg: '========================================',
    });
    logger.info({
        msg: 'INVOICE OVERDUE MARKING JOB - START',
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development',
    });
    logger.info({
        msg: '========================================',
    });

    try {
        // Test database connection
        logger.info('Testing database connection...');
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        logger.info('Database connection successful');

        // Execute job within distributed lock
        const result = await withLock(
            LOCK_IDENTIFIER,
            async () => {
                const service = new OverdueInvoiceService();
                return await service.markOverdueInvoices();
            },
            LOCK_TIMEOUT_MS,
        );

        // Handle lock acquisition failure
        if (!result.lockAcquired) {
            logger.warn({
                msg: 'Another instance is already running this job. Exiting gracefully.',
                lockIdentifier: LOCK_IDENTIFIER,
            });
            process.exit(0);
            return;
        }

        // Handle execution failure
        if (!result.success || !result.result) {
            logger.error({
                msg: 'Job execution failed',
                error: result.error?.message || 'Unknown error',
            });
            process.exit(1);
            return;
        }

        // Success - log metrics
        const metrics = result.result;
        const totalJobTimeMs = Date.now() - jobStartTime;

        logger.info({
            msg: '========================================',
        });
        logger.info({
            msg: 'JOB COMPLETED SUCCESSFULLY',
            metrics: {
                totalFound: metrics.totalFound,
                totalUpdated: metrics.totalUpdated,
                executionTimeMs: metrics.executionTimeMs,
                totalJobTimeMs,
                timestamp: metrics.timestamp,
                errors: metrics.errors.length > 0 ? metrics.errors : undefined,
            },
        });
        logger.info({
            msg: '========================================',
        });

        // Exit with warning code if there were partial errors
        if (metrics.errors.length > 0) {
            logger.warn({
                msg: 'Job completed with warnings',
                errorCount: metrics.errors.length,
            });
            process.exit(0); // Still exit successfully for cron scheduling
        }

        process.exit(0);
    } catch (error) {
        const totalJobTimeMs = Date.now() - jobStartTime;

        logger.error({
            msg: 'CRITICAL ERROR - Job failed',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            totalJobTimeMs,
        });

        process.exit(1);
    } finally {
        // Always disconnect from database
        await prisma.$disconnect();
        logger.info('Database disconnected');
    }
}

/**
 * Graceful shutdown handler
 */
const shutdown = async (): Promise<void> => {
    logger.info('Received shutdown signal, cleaning up...');
    await prisma.$disconnect();
    process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error({
        msg: 'Unhandled Promise Rejection',
        reason: String(reason),
        promise: String(promise),
    });
    process.exit(1);
});

// Run the job
main();
