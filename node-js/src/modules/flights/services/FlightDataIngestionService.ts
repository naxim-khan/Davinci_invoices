import { Worker } from 'worker_threads';
import { join } from 'path';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { prisma } from '../../../core/database/prisma.client';
import { logger } from '../../../common/utils/logger.util';
import { SQSMessageHandler } from '../../../../services/SQSMessageHandler';

/**
 * Configuration for Ingestion Service
 */
const CONFIG = {
    BATCH_SIZE: 10, // number of flights to process in each batch
    POLL_INTERVAL_MS: 30000, // 30 seconds
    MAX_CONCURRENT_WORKERS: 5,
    OUTPUT_DIR: join(process.cwd(), 'data', 'ingested-flights'),
    BENCHMARK_FILE: join(process.cwd(), 'benchmarks', 'results.json'),
    THREAD_METRICS_FILE: join(process.cwd(), 'benchmarks', 'thread_metrics.json'),
    SEQUENTIAL_MODE: false, // Set to false to test parallel performance
    TOTAL_SCAN_LIMIT: 200, // Maximum records to attempt in testing. Set to null for unlimited.
};

export class FlightDataIngestionService {
    private static instance: FlightDataIngestionService;
    private isRunning: boolean = false;
    private isProcessing: boolean = false;
    private pollTimer: NodeJS.Timeout | null = null;
    private batchCount: number = 0;
    private totalThreadsSpawned: number = 0;
    private totalProcessedCount: number = 0;
    private activeThreadsCount: number = 0;
    private totalInvoicesCreated: number = 0;

    private constructor() { }

    public static getInstance(): FlightDataIngestionService {
        if (!FlightDataIngestionService.instance) {
            FlightDataIngestionService.instance = new FlightDataIngestionService();
        }
        return FlightDataIngestionService.instance;
    }

    /**
     * Start the background service
     */
    public async start(): Promise<void> {
        if (this.isRunning) return;

        logger.info('[INGESTION] Starting FlightDataIngestionService...');
        this.isRunning = true;

        // Ensure directories exist
        try {
            await mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
            await mkdir(join(process.cwd(), 'benchmarks'), { recursive: true });
        } catch (err) {
            logger.error(err, 'Failed to initialize ingestion directories');
        }

        // Start polling loop
        this.runCycle();
    }

    /**
     * Stop the background service gracefully
     */
    public async stop(): Promise<void> {
        logger.info('[INGESTION] Stopping FlightDataIngestionService...');
        this.isRunning = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Internal cycle handler
     */
    private async runCycle(): Promise<void> {
        if (!this.isRunning) return;

        if (this.isProcessing) {
            logger.debug('[INGESTION] Processing already in progress, skipping cycle');
        } else if (CONFIG.TOTAL_SCAN_LIMIT !== null && this.totalProcessedCount >= CONFIG.TOTAL_SCAN_LIMIT) {
            logger.info(`[INGESTION] Scan limit of ${CONFIG.TOTAL_SCAN_LIMIT} reached (${this.totalProcessedCount}). Stopping service.`);
            this.stop();
        } else {
            try {
                await this.processNextBatch();
            } catch (error: any) {
                // If database connection failed, we might want to wait longer before next attempt
                const isConnError = error.code === 'ECONNREFUSED' || error.message?.includes('connection');
                const nextInterval = isConnError ? CONFIG.POLL_INTERVAL_MS * 2 : CONFIG.POLL_INTERVAL_MS;

                logger.error({
                    err: { message: error.message, code: error.code }
                }, '[INGESTION] Cycle failed - will retry');

                this.scheduleNextRun(nextInterval);
                return;
            }
        }

        this.scheduleNextRun(CONFIG.POLL_INTERVAL_MS);
    }

    /**
     * Helper to schedule next run only if limit not reached and service is running
     */
    private scheduleNextRun(ms: number): void {
        const limitReached = CONFIG.TOTAL_SCAN_LIMIT !== null && this.totalProcessedCount >= CONFIG.TOTAL_SCAN_LIMIT;
        if (this.isRunning && !limitReached) {
            this.pollTimer = setTimeout(() => this.runCycle(), ms);
        } else if (limitReached && this.isRunning) {
            this.printSummary();
            this.stop();
        }
    }

    /**
     * Print summary when scan limit is reached
     */
    private printSummary(): void {
        console.log('\n' + '='.repeat(60));
        console.log('         FLIGHT DATA INGESTION - SESSION SUMMARY');
        console.log('='.repeat(60));
        console.log(`  Total Flights Processed:  ${this.totalProcessedCount}`);
        console.log(`  Total Invoices Created:   ${this.totalInvoicesCreated}`);
        console.log(`  Total Batches:            ${this.batchCount}`);
        console.log(`  Total Threads Spawned:    ${this.totalThreadsSpawned}`);
        console.log('='.repeat(60) + '\n');
    }

    /**
     * Process a batch of flights
     */
    private async processNextBatch(): Promise<void> {
        this.isProcessing = true;
        const startTime = performance.now();

        try {
            // Calculate remaining records if limit exists
            let takeSize = CONFIG.BATCH_SIZE;
            if (CONFIG.TOTAL_SCAN_LIMIT !== null) {
                const remaining = CONFIG.TOTAL_SCAN_LIMIT - this.totalProcessedCount;
                if (remaining <= 0) {
                    this.isProcessing = false;
                    return;
                }
                takeSize = Math.min(CONFIG.BATCH_SIZE, remaining);
            }

            // Fetch next batch of flights from the queue
            const queueEntries = await prisma.flightProcessingQueue.findMany({
                take: takeSize,
                select: { id: true, flightId: true },
                orderBy: { id: 'asc' },
            });

            if (queueEntries.length === 0) {
                this.isProcessing = false;
                return;
            }

            // Immediately increment processed count (records "scanned")
            this.totalProcessedCount += queueEntries.length;

            this.batchCount++;
            logger.info(`[INGESTION] Processing Batch #${this.batchCount}. Scanned ${queueEntries.length} new records. Total scanned this session: ${this.totalProcessedCount}/${CONFIG.TOTAL_SCAN_LIMIT || '∞'}`);

            const successfulIds: number[] = [];

            if (CONFIG.SEQUENTIAL_MODE) {
                // SEQUENTIAL MODE: Process one by one
                for (const queueEntry of queueEntries) {
                    const flightStartTime = performance.now();
                    try {
                        await this.processSingleFlight(queueEntry);
                        successfulIds.push(queueEntry.id);

                        const flightEndTime = performance.now();
                        const flightDuration = Math.round(flightEndTime - flightStartTime);

                        // 1. Existing benchmark log
                        await this.saveBenchmarkResult({
                            flightId: queueEntry.flightId.toString(),
                            mode: 'SINGLE_THREAD',
                            durationMs: flightDuration,
                            timestamp: new Date().toISOString(),
                            status: 'SUCCESS'
                        });

                        // 2. Add to the new thread_metrics file for comparison
                        await this.saveThreadMetrics({
                            threadNo: ++this.totalThreadsSpawned,
                            workerThreadId: 'Main Thread',
                            flightId: queueEntry.flightId.toString(),
                            status: 'SUCCESS',
                            durationMs: flightDuration,
                            concurrentAtSpawn: 1
                        });
                    } catch (err) {
                        const flightEndTime = performance.now();
                        const flightDuration = Math.round(flightEndTime - flightStartTime);
                        logger.error(`[INGESTION] Processing failed for Flight ${queueEntry.flightId}: ${err instanceof Error ? err.message : String(err)}`);

                        await this.saveBenchmarkResult({
                            flightId: queueEntry.flightId.toString(),
                            mode: 'SINGLE_THREAD',
                            durationMs: flightDuration,
                            timestamp: new Date().toISOString(),
                            status: 'FAILED'
                        });

                        await this.saveThreadMetrics({
                            threadNo: ++this.totalThreadsSpawned,
                            workerThreadId: 'Main Thread',
                            flightId: queueEntry.flightId.toString(),
                            status: 'FAILED',
                            error: err instanceof Error ? err.message : String(err),
                            durationMs: flightDuration,
                            concurrentAtSpawn: 1
                        });
                    }
                }
            } else {
                // PARALLEL MODE: Process using workers
                const results = await this.processInParallel(queueEntries);
                logger.info(`[DEBUG] Parallel results length: ${results.length}`);
                results.forEach((res, index) => {
                    const status = res ? (res.success ? 'SUCCESS' : 'FAILED') : 'NULL';
                    logger.info(`[DEBUG] Result ${index} (Flight ${queueEntries[index].flightId}): ${status}`);

                    // Check explicit success flag from worker
                    if (res && res.success === true) {
                        successfulIds.push(queueEntries[index].id);
                    }
                });
                logger.info(`[DEBUG] successfulIds length: ${successfulIds.length}`);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Log batch summary result
            await this.saveBenchmarkResult({
                batchSize: queueEntries.length,
                mode: CONFIG.SEQUENTIAL_MODE ? 'BATCH_SEQUENTIAL' : 'BATCH_PARALLEL',
                durationMs: Math.round(duration),
                timestamp: new Date().toISOString()
            });

            logger.info(`[BENCHMARK] Batch of ${queueEntries.length} took ${Math.round(duration)}ms (${CONFIG.SEQUENTIAL_MODE ? 'Sequential' : 'Parallel'})`);

            // Delete successfully processed entries from the queue
            if (successfulIds.length > 0) {
                await prisma.flightProcessingQueue.deleteMany({
                    where: {
                        id: { in: successfulIds }
                    }
                });
                logger.info(`[INGESTION] Deleted ${successfulIds.length} successfully processed entries.`);
            }

        } finally {
            this.isProcessing = false;
        }
    }

    private async processInParallel(entries: { flightId: bigint }[]): Promise<any[]> {
        const results: any[] = [];
        const queue = [...entries];
        const activePromises: Promise<any>[] = [];

        while (queue.length > 0 || activePromises.length > 0) {
            while (activePromises.length < CONFIG.MAX_CONCURRENT_WORKERS && queue.length > 0) {
                const entry = queue.shift()!;
                const promise = this.spawnWorker(entry.flightId.toString()).then(res => {
                    activePromises.splice(activePromises.indexOf(promise), 1);
                    return res;
                });
                activePromises.push(promise);
                results.push(promise);
            }

            if (activePromises.length > 0) {
                await Promise.race(activePromises);
            }
        }

        return (await Promise.all(results));
    }

    /**
     * Process a single flight using SQSMessageHandler
     */
    private async processSingleFlight(queueEntry: { id: number; flightId: bigint }): Promise<void> {
        const handler = new SQSMessageHandler();
        const invoiceCount = await handler.handleMessage({
            messageId: `internal-${queueEntry.flightId}`,
            body: JSON.stringify({
                flightId: queueEntry.flightId.toString(),
                service: 'automated-ingestion',
                timestamp: new Date().toISOString()
            }),
            receiptHandle: 'internal'
        });
        this.totalInvoicesCreated += invoiceCount;
        logger.info(`[INGESTION] Automated processing successful for Flight ${queueEntry.flightId}. created ${invoiceCount} invoices.`);
    }

    /**
     * Save benchmark result to file
     */
    private async saveBenchmarkResult(result: any): Promise<void> {
        try {
            let results = [];
            try {
                const data = await readFile(CONFIG.BENCHMARK_FILE, 'utf-8');
                results = JSON.parse(data);
            } catch (e) {
                // File doesn't exist yet
            }
            results.push(result);
            await writeFile(CONFIG.BENCHMARK_FILE, JSON.stringify(results, null, 2));
        } catch (err) {
            logger.error(err, 'Failed to save benchmark result');
        }
    }

    /**
     * Save thread-specific metrics to a separate file
     */
    private async saveThreadMetrics(result: any): Promise<void> {
        try {
            let metrics = [];
            try {
                const data = await readFile(CONFIG.THREAD_METRICS_FILE, 'utf-8');
                metrics = JSON.parse(data);
            } catch (e) { }

            metrics.push({
                ...result,
                batchNo: this.batchCount,
                timestamp: new Date().toISOString()
            });

            await writeFile(CONFIG.THREAD_METRICS_FILE, JSON.stringify(metrics, null, 2));
        } catch (err) {
            logger.error(err, 'Failed to save thread metrics');
        }
    }

    private spawnWorker(flightId: string): Promise<any> {
        return new Promise((resolve) => {
            const pinotUrl = process.env.PINOT_HTTP_BROKER_URL;
            const tableName = process.env.PINOT_TABLE_NAME || 'flights';

            if (!pinotUrl) {
                logger.error('PINOT_HTTP_BROKER_URL not configured');
                return resolve(null);
            }

            // Path to the worker. In TS-node/tsx environment, we point to the .mts file
            const workerPath = join(__dirname, '../workers/flight-ingestion.worker.mts');

            const worker = new Worker(workerPath, {
                workerData: { flightId, pinotUrl, tableName },
                execArgv: ['--import', 'tsx']
            });

            this.totalThreadsSpawned++;
            this.activeThreadsCount++;
            const currentThreadNo = this.totalThreadsSpawned;
            const threadStartTime = performance.now();

            worker.on('message', async (message) => {
                this.activeThreadsCount--;
                const threadEndTime = performance.now();
                const durationMs = Math.round(threadEndTime - threadStartTime);

                if (message.success) {
                    await this.saveThreadMetrics({
                        threadNo: currentThreadNo,
                        workerThreadId: worker.threadId,
                        flightId: flightId,
                        status: 'SUCCESS',
                        durationMs,
                        concurrentAtSpawn: this.activeThreadsCount + 1
                    });

                    // Process flight data through SQSMessageHandler to create invoices
                    if (message.data) {
                        try {
                            const handler = new SQSMessageHandler();
                            const invoiceCount = await handler.handleMessage({
                                messageId: `worker-${flightId}`,
                                body: JSON.stringify({
                                    flightId: flightId,
                                    flightData: message.data,
                                    service: 'parallel-ingestion',
                                    timestamp: new Date().toISOString()
                                }),
                                receiptHandle: 'worker'
                            });
                            this.totalInvoicesCreated += invoiceCount;
                            logger.info(`[INGESTION] Invoice processing completed for Flight ${flightId}. Created ${invoiceCount} invoices.`);
                        } catch (handlerError: any) {
                            logger.error(`[INGESTION] Invoice creation failed for Flight ${flightId}: ${handlerError.message}`);
                        }
                    }

                    // Return explicit success object for queue deletion
                    resolve({ success: true, flightId });
                } else {
                    logger.error(`Worker failed for flight ${flightId}: ${message.error}`);
                    await this.saveThreadMetrics({
                        threadNo: currentThreadNo,
                        workerThreadId: worker.threadId,
                        flightId: flightId,
                        status: 'FAILED',
                        error: message.error,
                        durationMs,
                        concurrentAtSpawn: this.activeThreadsCount + 1
                    });
                    // Return explicit failure object
                    resolve({ success: false, flightId });
                }
            });

            worker.on('error', async (err) => {
                this.activeThreadsCount--;
                const threadEndTime = performance.now();
                const durationMs = Math.round(threadEndTime - threadStartTime);

                logger.error(`Worker thread error: ${err.message}`);
                await this.saveThreadMetrics({
                    threadNo: currentThreadNo,
                    workerThreadId: worker.threadId,
                    flightId: flightId,
                    status: 'CRASHED',
                    error: err.message,
                    durationMs,
                    concurrentAtSpawn: this.activeThreadsCount + 1
                });
                resolve({ success: false, flightId });
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    logger.debug(`Worker exited with code ${code}`);
                }
                // If resolving hasn't happened yet (e.g. crash without error event?), this safe-guards.
                // However, standard flow handles it in 'message' or 'error'.
                // We shouldn't double-resolve, but promises ignore subsequent calls.
                // resolve({ success: false, flightId }); 
            });
        });
    }
}
