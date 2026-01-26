import * as cron from 'node-cron';
import { logger } from '../../../common/utils/logger.util';
import { withLock } from '../../../common/utils/distributed-lock.util';
import { ConsolidatedInvoiceService } from './ConsolidatedInvoiceService';

/**
 * Consolidated Invoice Scheduler
 *
 * Automatically runs the consolidated invoice generation job on a scheduled basis.
 * Uses node-cron for scheduling and distributed locks for safe execution in multi-instance deployments.
 *
 * Default schedule: Daily at 1:00 AM UTC
 */
export class ConsolidatedInvoiceScheduler {
    private static instance: ConsolidatedInvoiceScheduler;
    private cronJob: cron.ScheduledTask | null = null;
    private isRunning: boolean = false;
    private consolidatedInvoiceService: ConsolidatedInvoiceService;

    private readonly LOCK_IDENTIFIER = 'consolidated-invoice-generation-job';
    private readonly LOCK_TIMEOUT_MS = parseInt(process.env.CONSOLIDATION_LOCK_TIMEOUT_MS || '60000', 10);
    private readonly CRON_SCHEDULE = process.env.CONSOLIDATION_CRON_SCHEDULE || '0 1 * * *';

    private constructor() {
        this.consolidatedInvoiceService = new ConsolidatedInvoiceService();
    }

    public static getInstance(): ConsolidatedInvoiceScheduler {
        if (!ConsolidatedInvoiceScheduler.instance) {
            ConsolidatedInvoiceScheduler.instance = new ConsolidatedInvoiceScheduler();
        }
        return ConsolidatedInvoiceScheduler.instance;
    }

    public start(): void {
        if (this.isRunning) {
            logger.warn({ msg: 'Consolidated invoice scheduler is already running' });
            return;
        }

        logger.info({
            msg: 'Starting consolidated invoice scheduler',
            schedule: this.CRON_SCHEDULE,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lockTimeout: this.LOCK_TIMEOUT_MS,
        });

        if (!cron.validate(this.CRON_SCHEDULE)) {
            logger.error({ msg: 'Invalid cron schedule expression', schedule: this.CRON_SCHEDULE });
            throw new Error(`Invalid cron schedule: ${this.CRON_SCHEDULE}`);
        }

        this.cronJob = cron.schedule(
            this.CRON_SCHEDULE,
            async () => {
                await this.executeJob();
            },
            {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        );

        this.isRunning = true;
        logger.info({ msg: 'Consolidated invoice scheduler started successfully' });
    }

    public stop(): void {
        if (!this.isRunning || !this.cronJob) {
            logger.warn({ msg: 'Consolidated invoice scheduler is not running' });
            return;
        }

        logger.info({ msg: 'Stopping consolidated invoice scheduler' });
        this.cronJob.stop();
        this.isRunning = false;
        logger.info({ msg: 'Consolidated invoice scheduler stopped successfully' });
    }

    private async executeJob(): Promise<void> {
        const jobStartTime = Date.now();

        logger.info({ msg: '========================================' });
        logger.info({ msg: 'SCHEDULED CONSOLIDATED INVOICE JOB - START', timestamp: new Date().toISOString() });
        logger.info({ msg: '========================================' });

        try {
            const result = await withLock(
                this.LOCK_IDENTIFIER,
                async () => {
                    return await this.consolidatedInvoiceService.generateConsolidatedInvoicesForAllCustomers();
                },
                this.LOCK_TIMEOUT_MS,
            );

            if (!result.lockAcquired) {
                logger.warn({
                    msg: 'Skipped execution - another instance is already running this job',
                    lockIdentifier: this.LOCK_IDENTIFIER,
                });
                return;
            }

            if (!result.success || !result.result) {
                logger.error({ msg: 'Scheduled job execution failed', error: result.error?.message || 'Unknown error' });
                return;
            }

            const metrics = result.result;
            const totalJobTimeMs = Date.now() - jobStartTime;

            logger.info({ msg: '========================================' });
            logger.info({
                msg: 'SCHEDULED JOB COMPLETED SUCCESSFULLY',
                metrics: {
                    customersProcessed: metrics.customersProcessed,
                    invoicesGenerated: metrics.invoicesGenerated,
                    totalInvoicesConsolidated: metrics.totalInvoicesConsolidated,
                    executionTimeMs: metrics.executionTimeMs,
                    totalJobTimeMs,
                    timestamp: metrics.timestamp,
                    errors: metrics.errors.length > 0 ? metrics.errors : undefined,
                },
            });
            logger.info({ msg: '========================================' });

            if (metrics.errors.length > 0) {
                logger.warn({
                    msg: 'Job completed with errors',
                    errorCount: metrics.errors.length,
                    errors: metrics.errors,
                });
            }
        } catch (error) {
            const totalJobTimeMs = Date.now() - jobStartTime;
            logger.error({
                msg: 'CRITICAL ERROR - Scheduled job failed',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                totalJobTimeMs,
            });
        }
    }

    public getStatus(): { isRunning: boolean; schedule: string; timezone: string; lockTimeout: number } {
        return {
            isRunning: this.isRunning,
            schedule: this.CRON_SCHEDULE,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lockTimeout: this.LOCK_TIMEOUT_MS,
        };
    }

    /**
     * Manually trigger the job (for testing or admin use)
     */
    public async triggerManually(): Promise<void> {
        logger.info({ msg: 'Manually triggering consolidated invoice generation job' });
        await this.executeJob();
    }
}
