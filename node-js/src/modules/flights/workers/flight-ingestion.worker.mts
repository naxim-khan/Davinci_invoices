import { parentPort, workerData } from 'worker_threads';
import 'dotenv/config';

/**
 * Pinot Query Response Type
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

/**
 * Flight Data Structure
 */
interface FlightData {
    flightId: string;
    [key: string]: any;
}

/**
 * Query Apache Pinot for flight data
 */
async function queryPinot(flightId: bigint, pinotUrl: string, tableName: string): Promise<FlightData> {
    const sql = `SELECT * FROM ${tableName} WHERE flightId = ${flightId} LIMIT 1`;

    const response = await fetch(`${pinotUrl}/query/sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
        throw new Error(`Pinot query failed with status ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as PinotResponse;

    if (data.exceptions && data.exceptions.length > 0) {
        throw new Error(`Pinot query error: ${data.exceptions.map((e) => e.message).join(', ')}`);
    }

    if (!data.resultTable || !data.resultTable.rows || data.resultTable.rows.length === 0) {
        throw new Error(`No flight data found in Pinot for flightId: ${flightId}`);
    }

    const columnNames = data.resultTable.dataSchema.columnNames;
    const row = data.resultTable.rows[0];

    const flightData: FlightData = {
        flightId: flightId.toString(),
    };

    columnNames.forEach((columnName, index) => {
        let value = row[index];
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            try {
                value = JSON.parse(value);
            } catch (e) { }
        }
        flightData[columnName] = value;
    });

    return flightData;
}

/**
 * Worker Entry Point
 */
async function runWorker() {
    try {
        const { flightId, pinotUrl, tableName } = workerData;

        // 1. Fetch from Pinot
        const flightData = await queryPinot(BigInt(flightId), pinotUrl, tableName);

        // Note: For background ingestion, we might just store the raw data 
        // OR we can import FlightProcessingService if we want to run Python too.
        // For now, mirroring the "fetch-flight-data" logic which focuses on Pinot data.

        parentPort?.postMessage({
            success: true,
            data: flightData
        });
    } catch (error: any) {
        parentPort?.postMessage({
            success: false,
            error: error.message,
            flightId: workerData.flightId
        });
    }
}

runWorker();
