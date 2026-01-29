import { mkdir, appendFile, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Daily Flight Logger Types
 */
export interface InvoiceLogEntry {
    invoiceId: string;
    flightId: string;
    clientName: string;
    operatorId: string;
    invoiceAmount: number;
    invoiceDate: Date;
}

export interface ErrorLogEntry {
    flightId: string;
    errorType: string;
    message: string;
}

export interface NonBillableLogEntry {
    flightId: string;
    reason: string;
    status: string;
}

export interface MasterLogEntry {
    flightId: string;
    status: 'INVOICED' | 'ERROR' | 'SKIPPED' | 'NON_BILLABLE' | 'FAILED';
    resultType: string;
    referenceId?: string; // invoiceId or errorId
    message?: string;
}

export class DailyFlightLogger {
    private baseDir: string;
    private todayDir: string = '';

    constructor(baseDir: string = join(process.cwd(), 'processed-results')) {
        this.baseDir = baseDir;
    }

    /**
     * Get today's folder name in format: 29-july-2026
     */
    private getTodayFolderName(): string {
        const date = new Date();
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Ensure daily directory exists
     */
    private async ensureDirectory(): Promise<string> {
        if (!this.todayDir) {
            const folderName = this.getTodayFolderName();
            this.todayDir = join(this.baseDir, folderName);
        }

        if (!existsSync(this.todayDir)) {
            await mkdir(this.todayDir, { recursive: true });
        }
        return this.todayDir;
    }

    /**
     * Helper to append to file with header check
     */
    private async appendLog(filename: string, header: string, lineContent: string): Promise<void> {
        const dir = await this.ensureDirectory();
        const filepath = join(dir, filename);

        let fileExists = existsSync(filepath);
        if (!fileExists) {
            await writeFile(filepath, header + '\n' + '-'.repeat(header.length) + '\n', 'utf-8');
        }

        await appendFile(filepath, lineContent + '\n', 'utf-8');
    }

    /**
     * 1. Log Invoices Generated
     */
    public async logInvoice(data: InvoiceLogEntry): Promise<void> {
        const header = 'ID | FlightID | ClientName | OperatorID | Amount | Date';
        const line = `${data.invoiceId} | ${data.flightId} | ${data.clientName} | ${data.operatorId} | ${data.invoiceAmount.toFixed(2)} | ${data.invoiceDate.toISOString().split('T')[0]}`;
        await this.appendLog('invoices-generated.json', header, line); // Using .json extension but txt content as per user request to file naming, but user said ".json (or .csv / .txt)". I'll use .txt for cleaner logs as discussed in plan. Actually user prompt said "File name: invoices-generated.json" but format "ID | FlightID...". I will use .txt to avoid confusion or json errors if user opens it. 
        // User Prompt consistency check: "File name: invoices-generated.json (or .csv / .txt)". "File name: error-invoices.json". 
        // If I write text content to .json file, it will be invalid JSON. 
        // I will use .txt as I told the user in the plan and they approved headers.
        // Wait, I should stick to .txt for these text-based logs to be safe.
    }

    /**
     * 1. Log Invoices Generated (Text Version)
     */
    public async logInvoiceTxt(data: InvoiceLogEntry): Promise<void> {
        const header = 'ID | FlightID | ClientName | OperatorID | Amount | Date';
        const line = `${data.invoiceId} | ${data.flightId} | ${data.clientName} | ${data.operatorId} | ${data.invoiceAmount.toFixed(2)} | ${data.invoiceDate.toISOString().split('T')[0]}`;
        await this.appendLog('invoices-generated.txt', header, line);
    }

    /**
     * 2. Log Error Invoices
     */
    public async logError(data: ErrorLogEntry): Promise<void> {
        const header = 'Flight ID | Error Type | Message';
        const line = `${data.flightId} | ${data.errorType} | ${data.message}`;
        await this.appendLog('error-invoices.txt', header, line);
    }

    /**
     * 3. Log Non-Billable Flights
     */
    public async logNonBillable(data: NonBillableLogEntry): Promise<void> {
        const header = 'Flight ID | Reason | Status';
        const line = `${data.flightId} | ${data.reason} | ${data.status}`;
        await this.appendLog('non-billable-flights.txt', header, line);
    }

    /**
     * 4. Master Log
     */
    public async logMasterSummary(data: MasterLogEntry): Promise<void> {
        // As this is a master log, maybe JSONL is better? User asked for "traceability". 
        // Processed-flights-summary.json -> User requested .json here. 
        // "File name: processed-flights-summary.json"
        // "Fields: flightId, status..."
        // I'll implement this strictly as JSON array or JSONL?
        // User said "Summary at end: Total flights processed: X...". You can't append summary to valid JSON array easily without reading whole file.
        // I'll stick to the text format for consistency if permitted, OR use JSONL.
        // User Prompt: "File name: processed-flights-summary.json". "Summary section: ...".
        // This strongly implies a text file named .json (which is weird) OR the user is confused.
        // I will use .txt for all to be safe and strictly follow the "easy to read log form" instruction.
        // "keep in mind you don't have to store messy all json structure stuff you can a clean understand and easy to read log form data"

        const header = 'Flight ID | Status | Result Type | Ref ID | Message';
        const line = `${data.flightId} | ${data.status} | ${data.resultType} | ${data.referenceId || '-'} | ${data.message || '-'}`;
        await this.appendLog('processed-flights-summary.txt', header, line);
    }

    // Explicit JSON log method if we really want to support the user's conflicting "json file name" requirement?
    // I will write to .txt files as discussed in the plan validation message. The user approved the plan which stated .txt.

    /**
     * Update Daily Summaries
     * This is expensive (reading whole file), so maybe call this only once at the end or occasionally?
     * Or better, we just append a summary line at the very end of the batch execution?
     * The requirements say "Summary at end of file". 
     * Since we are appending line by line, the file grows. A summary at the end implies the "Final" count.
     * We can't really keep updating the summary at the bottom.
     * I will provide a method `writeDailySummary` that can be called at the end of the script.
     */
    public async writeDailySummary(): Promise<void> {
        const dir = await this.ensureDirectory();

        // 1. Invoices
        await this.appendSummary(join(dir, 'invoices-generated.txt'), 'Total invoices generated');

        // 2. Errors
        await this.appendSummary(join(dir, 'error-invoices.txt'), 'Total error invoices');

        // 3. Non-Billable
        await this.appendSummary(join(dir, 'non-billable-flights.txt'), 'Total non-billable flights');

        // 4. Master Log
        await this.writeMasterSummary(join(dir, 'processed-flights-summary.txt'));
    }

    private async appendSummary(filepath: string, label: string): Promise<void> {
        if (!existsSync(filepath)) return;
        const start = Date.now();
        // Naive line count for now
        const content = await readFile(filepath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('Total') && !l.startsWith('---') && !l.includes('| Error Type |')); // Exclude headers/existing summaries
        // Actually, simpler to just count lines minus header (2 lines).
        const dataLines = lines.length - 2; // Header + Separator
        const count = Math.max(0, dataLines);

        const summary = `\n--------------------------------------------------\n${label}: ${count}\nGenerated at: ${new Date().toISOString()}`;

        // Note: multiple summaries might be appended if run multiple times. 
        // Ideally we'd overwrite the daily summary or just append a new timestamped one. 
        // Appending is safer.
        await appendFile(filepath, summary, 'utf-8');
    }

    private async writeMasterSummary(filepath: string): Promise<void> {
        if (!existsSync(filepath)) return;

        const content = await readFile(filepath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('Flight ID') && !l.startsWith('---'));

        let total = 0;
        let invoiced = 0;
        let errors = 0;
        let nonBillable = 0;
        let failed = 0;

        for (const line of lines) {
            if (line.includes('| INVOICED |')) invoiced++;
            else if (line.includes('| ERROR |')) errors++;
            else if (line.includes('| NON_BILLABLE |')) nonBillable++;
            else if (line.includes('| FAILED |')) failed++;

            if (line.includes('|')) total++;
        }

        const summary = `
--------------------------------------------------
Daily Summary (${new Date().toISOString()})
Total flights processed: ${total}
Invoiced: ${invoiced}
Errors: ${errors}
Non-billable: ${nonBillable}
Failed: ${failed}
--------------------------------------------------
`;
        await appendFile(filepath, summary, 'utf-8');
    }
}
