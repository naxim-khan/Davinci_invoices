/**
 * Batch Flight Processing Script
 * 
 * This script orchestrates the complete flight processing pipeline:
 * 1. Fetches 10 flights at a time from FlightProcessingQueue
 * 2. For each flight:
 *    - Fetches flight data from Apache Pinot
 *    - Processes through FlightProcessingService (Python pipeline)
 *    - Creates invoices for each FIR crossing
 * 3. Tracks processing status in JSON log files
 * 4. Deletes successfully processed flights from queue
 * 5. Continues with next batch until queue is empty
 *
 * Usage: npm run process-batch
 */

// Suppress useless node warnings (like PG SSL warnings)
process.env.NODE_NO_WARNINGS = '1';

import 'dotenv/config';
import { writeFile, mkdir, appendFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '../src/core/database/prisma.client';
import { logError, toAppError, getErrorMessage } from '../src/common/utils/error.util';
import FlightProcessingService from '../services/FlightProcessingService';
import { InvoiceStatus } from '@prisma/client';
import { TrackedFlight } from '../types/trackedFlight';

// Helper to generate unique invoice number
function generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}${random}`;
}

/**
 * Processing Log Types
 */
interface ProcessedFlight {
    queueId: number;
    flightId: string;
    status: 'success' | 'failed';
    invoicesCreated?: number;
    errorInvoicesCreated?: number; // New field
    processingTimeMs?: number;
    timestamp: string;
    error?: string;
    errorType?: 'pinot_fetch' | 'python_processing' | 'invoice_creation' | 'unknown';
}

interface BatchProcessingLog {
    batchId: string;
    batchNumber: number;
    startTime: string;
    endTime?: string;
    totalFlights: number;
    successCount: number;
    failureCount: number;
    totalInvoicesCreated: number;
    totalErrorInvoicesCreated: number; // New field
    processed: ProcessedFlight[];
    failed: ProcessedFlight[];
    totalProcessingTimeMs: number;
}

/**
 * Pinot Response Types
 */
interface PinotResponse {
    resultTable: {
        dataSchema: {
            columnNames: string[];
            columnDataTypes: string[];
        };
        rows: Array<Array<any>>;
    };
    exceptions: Array<{ errorCode: number; message: string }>;
    numDocsScanned: number;
    totalDocs: number;
    timeUsedMs: number;
}

interface AircraftData {
    operator?: string;
    owner?: string;
    company_name?: string;
    registration?: string;
    mtow_kg?: number;
    [key: string]: any;
}

interface OutputEntry {
    aircraft_data?: AircraftData;
    map_html?: string;
    flight_number?: string;
    origin_icao?: string;
    destination_icao?: string;
    registration?: string;
    aircraft_model?: string;
    flight_date?: string;
    fir_name?: string;
    country?: string;
    entry_time_utc?: string;
    exit_time_utc?: string;
    fee_description?: string;
    fee_amount?: number;
    total_fee_original?: number;
    original_currency?: string;
    fx_rate?: number;
    total_fee_usd?: number;
    [key: string]: any;
}

interface FlightData extends TrackedFlight {
    flightId: string;
}

/**
 * Logger for this script
 */
/**
 * Logger for this script
 */
const logger = {
    info: (msg: string): void => console.log(`[INFO] ${msg}`),
    success: (msg: string): void => console.log(`[SUCCESS] ${msg}`),
    error: (msg: string): void => console.error(`[ERROR] ${msg}`),
    warn: (msg: string): void => console.warn(`[WARN] ${msg}`),
    debug: (msg: string): void => console.log(`[DEBUG] ${msg}`),
    header: (msg: string): void => {
        console.log(`\n============================================================`);
        console.log(`${msg}`);
        console.log(`============================================================`);
    },
    divider: (): void => console.log(`------------------------------------------------------------`),
};

/**
 * Configuration
 */
const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args[0]) || 10;
const MAX_BATCHES = parseInt(args[1]) || 10;
const PROCESSING_LOGS_DIR = join(process.cwd(), 'data', 'processing-logs');
const FLIGHT_INPUTS_DIR = join(process.cwd(), 'data', 'flight-inputs');
const ERROR_INVOICES_DIR = join(process.cwd(), 'data', 'error-invoices');
const PINOT_RAW_DIR = join(process.cwd(), 'data', 'pinot-raw'); // New directory for raw data

/**
 * Ensure required directories exist
 */
async function ensureDirectories(): Promise<void> {
    await mkdir(PROCESSING_LOGS_DIR, { recursive: true });
    await mkdir(FLIGHT_INPUTS_DIR, { recursive: true });
    await mkdir(ERROR_INVOICES_DIR, { recursive: true });
    await mkdir(PINOT_RAW_DIR, { recursive: true });
    logger.success('Processing directories ensured');
}

/**
 * Fetch batch of flights from queue
 */
async function fetchFlightBatch(): Promise<Array<{ id: number; flightId: bigint }>> {
    try {
        logger.info(`Fetching batch of ${BATCH_SIZE} flights from queue...`);

        const batch = await prisma.flightProcessingQueue.findMany({
            select: {
                id: true,
                flightId: true,
            },
            orderBy: {
                createdAt: 'asc', // Process oldest first
            },
            take: BATCH_SIZE,
        });

        logger.success(`Fetched ${batch.length} flight(s) from queue`);
        return batch;
    } catch (error) {
        logger.error(`Failed to fetch from queue: ${getErrorMessage(error)}`);
        throw error;
    }
}

/**
 * Query Apache Pinot for flight data
 */
async function queryPinotForFlightData(flightId: bigint): Promise<FlightData> {
    const pinotUrl = process.env.PINOT_HTTP_BROKER_URL;
    const tableName = process.env.PINOT_TABLE_NAME || 'flights';

    if (!pinotUrl) {
        throw new Error('PINOT_HTTP_BROKER_URL not found in environment variables');
    }

    const sql = `SELECT * FROM ${tableName} WHERE flightId = ${flightId} LIMIT 1`;

    logger.debug(`Querying Pinot: ${sql}`);

    const response = await fetch(`${pinotUrl}/query/sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
        throw new Error(
            `Pinot query failed with status ${response.status}: ${response.statusText}`,
        );
    }

    const data = (await response.json()) as PinotResponse;

    if (data.exceptions && data.exceptions.length > 0) {
        throw new Error(`Pinot query error: ${data.exceptions.map((e) => e.message).join(', ')}`);
    }

    if (!data.resultTable || !data.resultTable.rows || data.resultTable.rows.length === 0) {
        throw new Error(`No flight data found in Pinot for flightId: ${flightId}`);
    }

    // Transform Pinot response to structured JSON
    const columnNames = data.resultTable.dataSchema.columnNames;
    const row = data.resultTable.rows[0];

    const flightData: FlightData = {
        flightId: flightId.toString(),
    };

    columnNames.forEach((columnName, index) => {
        let value = row[index] as any;
        const originalType = typeof value;

        // Parse JSON strings for positions or other JSON columns
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                // Not a valid JSON, keep as string
            }
        }

        if (columnName === 'positions') {
            logger.debug(`Column "positions" - Original Type: ${originalType}, Parsed Type: ${typeof value}, Array: ${Array.isArray(value)}`);

            // Handle array of JSON strings (common for positions in some Pinot versions)
            if (Array.isArray(value)) {
                value = value.map(item => {
                    if (typeof item === 'string' && (item.trim().startsWith('{') || item.trim().startsWith('['))) {
                        try {
                            return JSON.parse(item);
                        } catch (e) {
                            return item;
                        }
                    }
                    return item;
                });
            }

            if (Array.isArray(value) && value.length > 0) {
                logger.debug(`First position type: ${typeof value[0]}`);
            }
        }

        (flightData as any)[columnName] = value;
    });

    return flightData;
}

/**
 * Process single flight through the complete pipeline
 */
async function processSingleFlight(
    queueId: number,
    flightId: bigint,
): Promise<ProcessedFlight> {
    const startTime = Date.now();
    const flightIdStr = flightId.toString();

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Processing Flight: ${flightIdStr} (Queue ID: ${queueId})`);
    logger.info(`${'='.repeat(60)}`);

    const result: ProcessedFlight = {
        queueId,
        flightId: flightIdStr,
        status: 'failed',
        timestamp: new Date().toISOString(),
    };

    try {
        // Step 1: Fetch flight data from Pinot
        logger.info('Step 1/3: Fetching flight data from Pinot...');
        let flightData: FlightData;
        try {
            flightData = await queryPinotForFlightData(flightId);
            logger.success('Flight data fetched successfully');

            // Save raw Pinot data for cross-checking
            const rawFileName = `raw_flight_${flightIdStr}_${Date.now()}.json`;
            await writeFile(join(PINOT_RAW_DIR, rawFileName), JSON.stringify(flightData, null, 2));
            logger.debug(`Raw Pinot data archived: ${rawFileName}`);
        } catch (error) {
            const appError = toAppError(error);
            result.error = `Pinot fetch failed: ${appError.message}`;
            result.errorType = 'pinot_fetch';
            logger.error(result.error);
            return result;
        }

        // Step 2: Process through Python pipeline
        logger.info('Step 2/3: Processing flight through Python pipeline...');
        const flightProcessor = new FlightProcessingService(false); // useTestFile = false
        let processedResult;
        try {
            processedResult = await flightProcessor.processFlight(flightData as any);

            if (!processedResult.success) {
                // Check if it's just a case of no FIR crossings
                if (processedResult.error_message?.includes('No output entries generated')) {
                    logger.warn('No FIR crossings detected - no invoices created');
                    // Treat as success so it's removed from queue
                    const processingTime = Date.now() - startTime;
                    result.status = 'success';
                    result.invoicesCreated = 0;
                    result.processingTimeMs = processingTime;
                    return result;
                }

                // Real failure - Create Error Invoice
                const errorFileName = `error_python_${flightIdStr}_${Date.now()}.json`;
                await writeFile(join(ERROR_INVOICES_DIR, errorFileName), JSON.stringify(processedResult, null, 2));
                result.errorInvoicesCreated = 1;
                logger.warn(`Error invoice saved: ${errorFileName}`);

                result.error = `Python processing failed: ${processedResult.error_message || 'Unknown error'}`;
                result.errorType = 'python_processing';
                logger.error(result.error);
                if (processedResult.error_traceback) {
                    console.error('Python Traceback:', processedResult.error_traceback);
                }
                return result;
            }

            logger.success(
                `Python processing complete: ${processedResult.output_entries?.length || 0} FIR crossing(s) detected`,
            );
        } catch (error) {
            const appError = toAppError(error);
            result.error = `Python processing failed: ${appError.message}`;
            result.errorType = 'python_processing';
            logger.error(result.error);
            return result;
        }

        // Step 3: Create invoices for each FIR crossing
        logger.info('Step 3/3: Creating invoices for FIR crossings...');
        let invoicesCreated = 0;

        if (processedResult.output_entries && processedResult.output_entries.length > 0) {
            const entries = processedResult.output_entries as unknown as OutputEntry[];
            const createdInvoices: any[] = [];
            try {
                for (const entry of entries) {
                    // Align clientName resolution with SQSMessageHandler fallback pattern
                    const clientName = (entry.aircraft_data?.operatorName) ||
                        (entry.aircraft_data?.operator) ||
                        (entry.aircraft_data?.ownerName) ||
                        (entry.aircraft_data?.owner) ||
                        (flightData.alna) || // Pinot Airline Name fallback
                        'Unknown Operator';

                    if (clientName === 'Unknown Operator') {
                        logger.error(`Unknown Operator for flight ${flightIdStr}. Aircraft Data: ${JSON.stringify(entry.aircraft_data)}`);
                    }

                    // Map fee breakdown (Q-V) using fee_details standard
                    const feeDetails = entry.fee_details as any || {};
                    const feeAmount = feeDetails.fee ?? (entry as any).fee_amount ?? null;
                    const otherFeesAmount = feeDetails.other_fees ?? null;
                    const totalOriginalAmount = feeAmount !== null ? Number(feeAmount) + Number(otherFeesAmount || 0) : null;
                    const totalUsdAmount = feeDetails.total_amount_usd
                        ? Number(feeDetails.total_amount_usd)
                        : feeDetails.fee_usd !== null
                            ? Number(feeDetails.fee_usd) + Number(feeDetails.other_fees_usd || 0)
                            : (entry as any).total_fee_usd ? Number((entry as any).total_fee_usd) : null;

                    // Create invoice directly with Prisma using standardized fields
                    const invoice = await prisma.invoice.create({
                        data: {
                            invoiceNumber: generateInvoiceNumber(),
                            flightId: flightId,
                            issueDate: new Date(),
                            updatedAt: new Date(),
                            status: InvoiceStatus.PENDING,
                            clientName,
                            mapHtml: entry.map_html || processedResult.master_file || null,

                            // Flight / FIR metadata (F-P) aligned with SQSMessagerHandler
                            flightNumber: (entry as any).flight_data?.cs || (entry as any).flight_number || null,
                            originIcao: (entry as any).takeoff_airport_icao || (entry as any).origin_icao || null,
                            destinationIcao: (entry as any).landing_airport_icao || (entry as any).destination_icao || null,
                            originIata: (entry as any).takeoff_airport_iata || (entry as any).origin_iata || null,
                            destinationIata: (entry as any).landing_airport_iata || (entry as any).destination_iata || null,
                            registrationNumber: entry.aircraft_data?.registration || (entry as any).registration || null,
                            aircraftModelName: entry.aircraft_data?.aircraftModelName || (entry as any).aircraft_model || null,
                            act: (entry as any).act || (entry as any).flight_data?.act || null,
                            modeSHex: (entry as any).flight_data?.ms || null,
                            alic: (entry as any).flight_data?.alic || null,

                            flightDate: (entry as any).flight_date ? new Date((entry as any).flight_date) : null,
                            firName: (entry as any).fir_label || (entry as any).fir_name || null,
                            firCountry: entry.country || null,
                            firEntryTimeUtc: (entry as any).earliest_entry_time ? new Date((entry as any).earliest_entry_time) :
                                ((entry as any).entry_time_utc ? new Date((entry as any).entry_time_utc) : null),
                            firExitTimeUtc: (entry as any).latest_exit_time ? new Date((entry as any).latest_exit_time) :
                                ((entry as any).exit_time_utc ? new Date((entry as any).exit_time_utc) : null),

                            // Fee breakdown / FX (Q-V)
                            feeDescription: feeDetails.calculation_description || (entry as any).fee_description || null,
                            feeAmount: feeAmount !== null ? Number(feeAmount) : null,
                            otherFeesAmount: otherFeesAmount,
                            totalOriginalAmount: totalOriginalAmount,
                            originalCurrency: feeDetails.currency || (entry as any).original_currency || null,
                            fxRate: feeDetails.fx_rate ? Number(feeDetails.fx_rate) : ((entry as any).fx_rate ? Number((entry as any).fx_rate) : null),
                            totalUsdAmount: totalUsdAmount,
                        },
                    });
                    createdInvoices.push(invoice);
                    invoicesCreated++;
                }

                // Save invoices to sqs.json for consistency/debugging
                try {
                    const outputDir = join(process.cwd(), 'data', 'processed-flights');
                    await mkdir(outputDir, { recursive: true });
                    const filepath = join(outputDir, 'sqs.json');

                    const record = {
                        flightId: flightIdStr,
                        timestamp: new Date().toISOString(),
                        invoices: createdInvoices
                    };

                    await appendFile(filepath, JSON.stringify(record, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    ) + '\n', 'utf-8');
                    logger.success(`Saved items to: ${filepath}`);
                } catch (saveError) {
                    logger.warn(`Failed to save items to file: ${getErrorMessage(saveError)}`);
                }

                // Save flight data to flights.jsonl (mirroring SQSMessageHandler)
                try {
                    const outputDir = join(process.cwd(), 'data', 'processed-flights');
                    const filepath = join(outputDir, 'flights.jsonl');
                    const jsonLine = JSON.stringify(flightData);
                    await appendFile(filepath, jsonLine + '\n', 'utf-8');
                    logger.success(`Saved flight data to: ${filepath}`);
                } catch (saveError) {
                    logger.warn(`Failed to save flight data to file: ${getErrorMessage(saveError)}`);
                }

                logger.success(`Created ${invoicesCreated} invoice(s)`);
            } catch (error) {
                const appError = toAppError(error);

                // Create Error Invoice for DB failure
                const errorFileName = `error_db_${flightIdStr}_${Date.now()}.json`;
                await writeFile(join(ERROR_INVOICES_DIR, errorFileName), JSON.stringify({
                    flightId: flightIdStr,
                    error: appError.message,
                    entries: entries
                }, null, 2));
                result.errorInvoicesCreated = entries.length;
                logger.warn(`Error invoice saved: ${errorFileName}`);

                result.error = `Invoice creation failed: ${appError.message}`;
                result.errorType = 'invoice_creation';
                logger.error(result.error);
                return result;
            }
        } else {
            logger.warn('No FIR crossings detected - no invoices created');
        }

        // Success!
        const processingTime = Date.now() - startTime;
        result.status = 'success';
        result.invoicesCreated = invoicesCreated;
        result.processingTimeMs = processingTime;
        delete result.error;
        delete result.errorType;

        logger.success(
            `Flight processed successfully in ${(processingTime / 1000).toFixed(2)}s (${invoicesCreated} invoices)`,
        );

        return result;
    } catch (error) {
        const appError = toAppError(error);
        result.error = `Unexpected error: ${appError.message}`;
        result.errorType = 'unknown';
        logger.error(result.error);
        return result;
    }
}

/**
 * Process a batch of flights
 */
async function processBatch(
    batchNumber: number,
    flights: Array<{ id: number; flightId: bigint }>,
): Promise<BatchProcessingLog> {
    const batchId = `batch_${Date.now()}_${batchNumber}`;
    const startTime = new Date().toISOString();

    logger.header(`Batch #${batchNumber} - Processing ${flights.length} flights`);

    const log: BatchProcessingLog = {
        batchId,
        batchNumber,
        startTime,
        totalFlights: flights.length,
        successCount: 0,
        failureCount: 0,
        totalInvoicesCreated: 0,
        totalErrorInvoicesCreated: 0,
        processed: [],
        failed: [],
        totalProcessingTimeMs: 0,
    };

    const batchStartTime = Date.now();

    // Process flights sequentially
    for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        logger.info(`[${i + 1}/${flights.length}] Processing Flight: ${flight.flightId} (Queue ID: ${flight.id})`);

        const result = await processSingleFlight(flight.id, flight.flightId);

        // Accumulate error invoices regardless of success/failure
        log.totalErrorInvoicesCreated += result.errorInvoicesCreated || 0;

        if (result.status === 'success') {
            log.processed.push(result);
            log.successCount++;
            log.totalInvoicesCreated += result.invoicesCreated || 0;
        } else {
            log.failed.push(result);
            log.failureCount++;
        }
    }

    log.totalProcessingTimeMs = Date.now() - batchStartTime;
    log.endTime = new Date().toISOString();

    // Delete successfully processed flights from queue
    if (log.successCount > 0) {
        const successfulQueueItems = log.processed.map((p) => ({
            id: p.queueId,
            flightId: p.flightId
        }));
        const successfulQueueIds = successfulQueueItems.map(item => item.id);

        logger.info(`\nDeleting ${successfulQueueIds.length} successfully processed flights from queue...`);

        // Show info about deleted items
        const firstItem = successfulQueueItems[0];
        const lastItem = successfulQueueItems[successfulQueueItems.length - 1];
        logger.info(`Cleaning up queue IDs: ${firstItem.id} (Flight: ${firstItem.flightId}) to ${lastItem.id} (Flight: ${lastItem.flightId})`);

        await prisma.flightProcessingQueue.deleteMany({
            where: {
                id: { in: successfulQueueIds },
            },
        });

        logger.success(`Deleted ${successfulQueueIds.length} flight(s) from queue`);
    }

    // Save batch processing log
    const logFileName = `${batchId}.json`;
    const logFilePath = join(PROCESSING_LOGS_DIR, logFileName);
    await writeFile(logFilePath, JSON.stringify(log, null, 2), 'utf-8');
    logger.success(`Batch log saved: ${logFileName}`);

    // Print batch summary
    console.log(`\nBatch #${batchNumber} Summary`);
    logger.divider();
    console.log(`  Success Rate:  ${log.successCount}/${log.totalFlights} (${((log.successCount / log.totalFlights) * 100).toFixed(1)}%)`);
    console.log(`  Invoices:      ${log.totalInvoicesCreated} created`);
    console.log(`  Errors:        ${log.totalErrorInvoicesCreated} error invoices tracked`);
    console.log(`  Time:          ${(log.totalProcessingTimeMs / 1000).toFixed(2)}s`);
    logger.divider();

    return log;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    console.log('\n============================================================');
    console.log('Flight Batch Processor');
    console.log('============================================================\n');

    try {
        // Ensure directories exist
        await ensureDirectories();

        // Note: Environment validation removed as FlightProcessingService doesn't have validateEnvironment method
        // The Python environment will be tested when the first flight is processed

        let batchNumber = 1;
        let totalProcessed = 0;
        let totalInvoices = 0;
        let totalErrorInvoices = 0;
        let totalFailures = 0;
        const pipelineStartTime = Date.now();

        logger.info(`Run Configuration - Batch Size: ${BATCH_SIZE}, Max Batches: ${MAX_BATCHES}`);

        // Process batches
        while (batchNumber <= MAX_BATCHES) {
            // Fetch next batch
            const flightBatch = await fetchFlightBatch();

            if (flightBatch.length === 0) {
                logger.info('Queue is empty - all flights processed');
                break;
            }

            // Process the batch
            const batchLog = await processBatch(batchNumber, flightBatch);

            // Update totals
            totalProcessed += batchLog.successCount;
            totalFailures += batchLog.failureCount;
            totalInvoices += batchLog.totalInvoicesCreated;
            totalErrorInvoices += batchLog.totalErrorInvoicesCreated;

            // If we fetched fewer than BATCH_SIZE, we reached the end
            if (flightBatch.length < BATCH_SIZE) {
                break;
            }

            batchNumber++;
        }

        const totalExecutionTimeMs = Date.now() - pipelineStartTime;
        const actualBatches = Math.min(batchNumber, MAX_BATCHES);

        if (batchNumber > MAX_BATCHES) {
            logger.warn(`Reached limit of ${MAX_BATCHES} batches. Stopping run.`);
        }

        // Final summary
        logger.header('Pipeline Execution Summary');
        console.log(`  Processed Info:`);
        console.log(`    Total Batches:           ${actualBatches}`);
        console.log(`    Total Flights Processed: ${totalProcessed + totalFailures}`);
        console.log(`    Successfully Processed:  ${totalProcessed}`);
        console.log(`    Failed Processing:       ${totalFailures}`);
        console.log(`    Overall Success Rate:    ${(((totalProcessed) / (totalProcessed + totalFailures || 1)) * 100).toFixed(1)}%`);

        console.log(`\n  Output Stats:`);
        console.log(`    Invoices Generated:      ${totalInvoices}`);
        console.log(`    Error Invoices Tracked:  ${totalErrorInvoices}`);

        console.log(`\n  Performance Metrics:`);
        console.log(`    Total Execution Time:    ${(totalExecutionTimeMs / 1000).toFixed(2)}s`);
        console.log(`    Avg Time Per Batch:      ${(totalExecutionTimeMs / 1000 / actualBatches || 0).toFixed(2)}s`);
        console.log(`    Avg Time Per Flight:     ${(totalExecutionTimeMs / 1000 / (totalProcessed + totalFailures || 1)).toFixed(2)}s`);

        logger.divider();
        console.log('Pipeline completed successfully!\n');

        process.exit(0);
    } catch (error) {
        console.log('\n============================================================');
        logError({ error: (obj: object, msg: string) => console.error(msg, obj) }, 'Batch processing failed', error);
        console.log('============================================================\n');

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
