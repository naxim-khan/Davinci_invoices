import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { prisma } from '../src/core/database/prisma.client';
import { logError } from '../src/common/utils/error.util';

/**
 * Configuration
 */
const BATCH_SIZE = 20;
const MAX_CONCURRENT_WORKERS = 5; // To avoid CPU/Network spikes
const OUTPUT_FILE = 'flightData.json';

/**
 * Logger for this script
 */
const logger = {
    info: (msg: string): void => console.log(`[INFO] ${msg}`),
    error: (msg: string, err?: any): void => console.error(`[ERROR] ${msg}`, err || ''),
    success: (msg: string): void => console.log(`[SUCCESS] ${msg}`),
};

/**
 * Fetch top flightIds from FlightProcessingQueue
 */
async function fetchFlightIdsFromQueue(limit: number): Promise<bigint[]> {
    logger.info(`Fetching top ${limit} IDs from FlightProcessingQueue...`);

    const queueEntries = await prisma.flightProcessingQueue.findMany({
        take: limit,
        select: { flightId: true },
        orderBy: { createdAt: 'desc' },
    });

    if (queueEntries.length === 0) {
        throw new Error('No flights found in FlightProcessingQueue');
    }

    const ids = queueEntries.map(e => e.flightId);
    logger.success(`Found ${ids.length} flightId(s)`);
    return ids;
}

/**
 * Run a worker thread for a single flightId
 */
function runWorker(flightId: string): Promise<any> {
    const pinotUrl = process.env.PINOT_HTTP_BROKER_URL;
    const tableName = process.env.PINOT_TABLE_NAME || 'flights';

    if (!pinotUrl) {
        throw new Error('PINOT_HTTP_BROKER_URL not found');
    }

    return new Promise((resolve, reject) => {
        // Use tsx to execute the worker script
        const worker = new Worker(join(__dirname, 'fetch-flight-worker.ts'), {
            workerData: {
                flightId,
                pinotUrl,
                tableName
            },
            execArgv: ['--import', 'tsx']
        });

        worker.on('message', (message) => {
            if (message.success) {
                resolve(message.data);
            } else {
                logger.error(`Worker failed for flight ${message.flightId}: ${message.error}`);
                resolve(null); // Resolve with null to let other workers continue
            }
        });

        worker.on('error', (err) => {
            logger.error(`Worker error: ${err.message}`);
            resolve(null);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                logger.error(`Worker exited with code ${code}`);
                resolve(null);
            }
        });
    });
}

/**
 * Process IDs in a concurrent pool
 */
async function processIdsInPool(ids: bigint[]): Promise<any[]> {
    const results: any[] = [];
    const queue = [...ids];
    const activeWorkers: Promise<any>[] = [];

    logger.info(`Starting multithreaded processing with max ${MAX_CONCURRENT_WORKERS} workers...`);

    while (queue.length > 0 || activeWorkers.length > 0) {
        // Fill pool
        while (activeWorkers.length < MAX_CONCURRENT_WORKERS && queue.length > 0) {
            const id = queue.shift()!;
            const workerPromise = runWorker(id.toString()).then(res => {
                // Remove self from active workers when done
                activeWorkers.splice(activeWorkers.indexOf(workerPromise), 1);
                return res;
            });
            activeWorkers.push(workerPromise);
            results.push(workerPromise);
        }

        // Wait for at least one worker to finish before next loop
        if (activeWorkers.length > 0) {
            await Promise.race(activeWorkers);
        }
    }

    // Filter out potential nulls from failed workers
    const finalResults = (await Promise.all(results)).filter(r => r !== null);
    return finalResults;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    console.log('\n========================================');
    console.log('Multithreaded Flight Data Fetcher');
    console.log('========================================\n');

    const startTime = Date.now();

    try {
        // 1. Fetch flight IDs
        const ids = await fetchFlightIdsFromQueue(BATCH_SIZE);

        // 2. Process in parallel via workers
        const allFlightData = await processIdsInPool(ids);

        // 3. Save merged results to single JSON file
        const filePath = join(process.cwd(), OUTPUT_FILE);
        await writeFile(filePath, JSON.stringify(allFlightData, null, 2), 'utf-8');

        logger.success(`Merged data for ${allFlightData.length} flights saved successfully to ${OUTPUT_FILE}`);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n========================================');
        console.log(`Fetch completed successfully in ${duration}s!`);
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.log('\n========================================');
        logError({ error: (obj: any, msg: string) => console.error(msg, obj) }, 'Flight data fetch failed', error);
        console.log('========================================\n');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
