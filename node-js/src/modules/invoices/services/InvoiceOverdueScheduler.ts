import * as cron from 'node-cron';
import { logger } from '../../../common/utils/logger.util';
import { withLock } from '../../../common/utils/distributed-lock.util';
import { OverdueInvoiceService } from './OverdueInvoiceService';

/**
 * Invoice Overdue Scheduler
 *
 * Automatically runs the overdue invoice marking job on a scheduled basis.
 * Uses node-cron for scheduling and distributed locks for safe execution.
 *
 * Default schedule: Every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
 */
export class InvoiceOverdueScheduler {
    private static instance: InvoiceOverdueScheduler;
    private cronJob: cron.ScheduledTask | null = null;
    private isRunning: boolean = false;
    private overdueService: OverdueInvoiceService;

    private readonly LOCK_IDENTIFIER = 'invoice-overdue-marking-job';
    private readonly LOCK_TIMEOUT_MS = 5000;
    private readonly CRON_SCHEDULE = process.env.OVERDUE_CRON_SCHEDULE || '0 * * * *';

    private constructor() {
        this.overdueService = new OverdueInvoiceService();
    }

    public static getInstance(): InvoiceOverdueScheduler {
        if (!InvoiceOverdueScheduler.instance) {
            InvoiceOverdueScheduler.instance = new InvoiceOverdueScheduler();
        }
        return InvoiceOverdueScheduler.instance;
    }

    public start(): void {
        if (this.isRunning) {
            logger.warn({ msg: 'Invoice overdue scheduler is already running' });
            return;
        }

        logger.info({
            msg: 'Starting invoice overdue scheduler',
            schedule: this.CRON_SCHEDULE,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        logger.info({ msg: 'Invoice overdue scheduler started successfully' });
    }

    public stop(): void {
        if (!this.isRunning || !this.cronJob) {
            logger.warn({ msg: 'Invoice overdue scheduler is not running' });
            return;
        }

        logger.info({ msg: 'Stopping invoice overdue scheduler' });
        this.cronJob.stop();
        this.isRunning = false;
        logger.info({ msg: 'Invoice overdue scheduler stopped successfully' });
    }

    private async executeJob(): Promise<void> {
        const jobStartTime = Date.now();

        logger.info({ msg: '========================================' });
        logger.info({ msg: 'SCHEDULED INVOICE OVERDUE JOB - START', timestamp: new Date().toISOString() });
        logger.info({ msg: '========================================' });

        try {
            const result = await withLock(
                this.LOCK_IDENTIFIER,
                async () => {
                    return await this.overdueService.markOverdueInvoices();
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
                    totalFound: metrics.totalFound,
                    totalUpdated: metrics.totalUpdated,
                    executionTimeMs: metrics.executionTimeMs,
                    totalJobTimeMs,
                    timestamp: metrics.timestamp,
                    errors: metrics.errors.length > 0 ? metrics.errors : undefined,
                },
            });
            logger.info({ msg: '========================================' });

            if (metrics.errors.length > 0) {
                logger.warn({ msg: 'Job completed with warnings', errorCount: metrics.errors.length, errors: metrics.errors });
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

    public getStatus(): { isRunning: boolean; schedule: string; timezone: string } {
        return {
            isRunning: this.isRunning,
            schedule: this.CRON_SCHEDULE,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }
}
