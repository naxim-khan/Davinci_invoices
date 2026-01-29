import logger from '../utils/logger';
import config from '../config';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { SQSMessage } from './SQSService';
import { TrackedFlight } from '../types/trackedFlight';
import FlightProcessingService from './FlightProcessingService';
import InvoiceService from './InvoiceService';
import InvoiceErrorService from './InvoiceErrorService';
import { InvoiceStatus, ErrorStatus } from '@prisma/client';
import S3Service from './S3Service';
import {
  ProcessingOutputEntry,
  ProcessingError,
} from '../types/processing'; // Import FeeDetails
import {
  OperatorMatchErrorTypes,
  OperatorLookupResult,
} from '../constants/operatorMatchErrors';
import { prisma } from '../src/core/database/prisma.client'; // Import prisma for database access

interface FlightMessage {
  flightId: string;
  service: string;
  timestamp: string;
  flightData?: TrackedFlight;
}

export class SQSMessageHandler {
  private pinotBrokerUrl: string;
  private outputDir: string;
  private flightProcessingService: FlightProcessingService;

  constructor() {
    this.pinotBrokerUrl = config.pinot.brokerUrl;
    this.outputDir = path.join(process.cwd(), 'data', 'processed-flights');
    // Use test file for now - set to false when ready for real flight data
    this.flightProcessingService = new FlightProcessingService(false);
  }

  /**
   * Ensure the output directory exists
   */
  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error: any) {
      logger.error(`Failed to create output directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main handler for processing SQS messages
   */
  async handleMessage(message: SQSMessage): Promise<number> {
    try {
      logger.info(`Processing SQS message: ${message.messageId}`);

      // Parse the message body
      const data = JSON.parse(message.body) as FlightMessage;
      logger.info({ flightId: data.flightId, service: data.service }, `Message data summary:`);

      // Extract flightId
      const { flightId } = data;

      if (!flightId) {
        throw new Error('Missing flightId in message');
      }

      let flightData: TrackedFlight | null = null;

      // Use data passed from worker if available
      if ((data as any).flightData) {
        flightData = (data as any).flightData as TrackedFlight;
        logger.info(`Using provided flight data for flight: ${flightId}`);
      } else {
        // Query Pinot for flight data
        logger.info(`Querying Pinot for flight: ${flightId}`);
        flightData = await this.getFlightFromPinot(flightId);
      }

      if (!flightData) {
        logger.warn(`No flight data found for flightId: ${flightId}`);
        return 0;
      }

      // Process the flight data
      const invoiceCount = await this.processFlightData(flightData, data);

      logger.info(`[V] Successfully processed message: ${message.messageId} for flight: ${flightId}`);
      return invoiceCount;
    } catch (error: any) {
      logger.error(`[X] Error processing SQS message: ${message.messageId}`, error);
      throw error; // This will prevent message deletion and allow retry
    }
  }

  /**
   * Query Pinot directly to get flight data by flightId
   */
  private async getFlightFromPinot(flightId: string): Promise<TrackedFlight | null> {
    try {
      // Query Pinot for all data for this flight
      const sql = `SELECT * FROM tracked_flights WHERE flightId = '${flightId}' LIMIT 1`;
      // const sql = `SELECT * FROM tracked_flights WHERE flightId = '2605577812' LIMIT 1`;

      logger.info(`Executing Pinot query for flightId: ${flightId}`);

      // Make direct HTTP request to Pinot broker
      const response = await axios.post(`${this.pinotBrokerUrl}/query/sql`, { sql });
      const result = response.data;

      // Extract the flight data from Pinot response
      if (result?.resultTable?.rows && result.resultTable.rows.length > 0) {
        const columnNames = result.resultTable.dataSchema.columnNames;
        const row = result.resultTable.rows[0];

        // Convert row array to object
        const flightData: TrackedFlight = {
          flightId: flightId, // Explicitly set it from argument
        } as TrackedFlight;
        columnNames.forEach((columnName: string, index: number) => {
          flightData[columnName] = row[index];
        });

        // Parse positions field if it exists and is a string
        if (flightData.positions && typeof flightData.positions === 'string') {
          try {
            const parsedPositions = JSON.parse(flightData.positions);
            flightData.positions = parsedPositions;
            logger.info(`Parsed ${(flightData.positions as any[]).length} positions for flight ${flightId}`);
          } catch (parseError) {
            logger.error(parseError as Error, `Failed to parse positions field for flight ${flightId}:`);
            flightData.positions = [];
          }
        }

        logger.info(`Found flight data with ${flightData.positions?.length || 0} positions`);
        return flightData;
      }

      return null;
    } catch (error: any) {
      logger.error(`Error querying Pinot for flight ${flightId}:`, error.message);
      throw new Error(`Pinot query failed: ${error.message}`);
    }
  }

  /**
   * Process the flight data
   * Add your custom business logic here
   */
  private async processFlightData(
    flightData: TrackedFlight,
    messageData: FlightMessage,
  ): Promise<number> {
    logger.info(`Processing flight data for ${messageData.flightId}`);
    let invoiceCount = 0;

    // Normalize positions to include all required fields with proper types (gnd as boolean, etc.)
    const normalizedFlightData = this.normalizeFlightDataPositions(flightData);

    // Log the positions data
    if (normalizedFlightData.positions && Array.isArray(normalizedFlightData.positions)) {
      logger.info(`Flight has ${normalizedFlightData.positions.length} position records`);
    }

    // Process flight with Python function (fee calculation, HTML maps, etc.)
    try {
      logger.info('Calling Python flight processing function...');
      const processingResult =
        await this.flightProcessingService.processFlight(normalizedFlightData);

      if (processingResult.success) {
        logger.info({
          masterFile: processingResult.master_file,
          outputEntriesCount: processingResult.output_entries?.length || 0,
          countriesProcessed: processingResult.output_entries?.map((e) => e.country) || [],
        }, '[V] Flight processing completed successfully');

        // Log output entries summary
        if (processingResult.output_entries && processingResult.output_entries.length > 0) {
          processingResult.output_entries.forEach((entry: ProcessingOutputEntry, index: number) => {
            const feeUsd = entry.fee_details?.fee_usd;
            logger.info({
              country: entry.country,
              firName: entry.fir_name || entry.fir_label,
              feeUsd: feeUsd,
              mapHtml: entry.map_html,
            }, `Output Entry ${index + 1}:`);
          });
        }

        // Log errors if any (data quality issues, not failures)
        if (processingResult.errors && processingResult.errors.length > 0) {
          logger.warn(
            {
              errorSummary: processingResult.error_summary,
              errorCount: processingResult.errors.length,
            },
            `Flight processing completed with ${processingResult.errors.length} data quality errors:`,
          );
        }

        // Create invoices for successful output entries
        if (processingResult.output_entries && processingResult.output_entries.length > 0) {
          logger.info(`🔄 Starting invoice creation for ${processingResult.output_entries.length} output entries...`);
          const invoices = await this.createInvoicesFromOutputEntries(processingResult.output_entries);
          invoiceCount += invoices.length;
          await this.saveInvoicesToFile(String(normalizedFlightData.flightId), invoices);
        } else {
          logger.warn('⚠️ No output_entries found in processing result - no invoices will be created');
        }

        // Create invoices for errors (even when success is true, there might be data quality errors)
        if (processingResult.errors && processingResult.errors.length > 0) {
          const errorInvoicesCount = await this.createInvoicesFromErrors(processingResult.errors);
          invoiceCount += errorInvoicesCount;
        }
      } else {
        const isNoOutput = processingResult.error_message?.includes('No output entries');
        const logFn = isNoOutput ? logger.warn.bind(logger) : logger.error.bind(logger);
        const statusIcon = isNoOutput ? '[-]' : '[X]';

        logFn({
          errorMessage: processingResult.error_message,
          errorTraceback: processingResult.error_traceback,
        }, `${statusIcon} Flight processing failed - no invoices will be created:`);

        // Even when processing fails, create invoices for errors if they exist
        if (processingResult.errors && processingResult.errors.length > 0) {
          logger.info(
            `Creating invoices for ${processingResult.errors.length} error(s) despite processing failure`,
          );
          const errorInvoicesCount = await this.createInvoicesFromErrors(processingResult.errors);
          invoiceCount += errorInvoicesCount;
        }

        // Don't throw - we still want to save the flight data even if processing fails
      }
    } catch (error: any) {
      logger.error('Error calling Python flight processing function:', error);
      // Don't throw - we still want to save the flight data even if processing fails
    }

    // Save flight data to file (normalized positions will be saved)
    await this.saveFlightToFile(normalizedFlightData);

    // Log relevant flight information
    logger.info({
      flightId: normalizedFlightData.flightId,
      messageTimestamp: messageData.timestamp,
      service: messageData.service,
      positionsCount: normalizedFlightData.positions?.length || 0,
      invoicesCreated: invoiceCount
    }, `Flight processed:`);

    return invoiceCount;
  }

  /**
   * Helper functions to convert values to proper types
   */
  private toStringValue(value: unknown, defaultValue: string = ''): string {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }

  private toNumber(value: unknown, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private toNullableNumber(value: unknown, defaultValue: null = null): number | null {
    if (value === null || value === undefined) return defaultValue;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private toBoolean(value: unknown, defaultValue: boolean = false): boolean {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }

  private toNullableString(value: unknown, defaultValue: null = null): string | null {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }

  /**
   * Normalize a position object to include all required fields with proper types
   */
  private normalizePosition(position: Record<string, unknown>): Record<string, unknown> {
    return {
      svd: this.toStringValue(position.svd ?? null, ''),
      lat: this.toStringValue(position.lat ?? null, ''),
      lon: this.toStringValue(position.lon ?? null, ''),
      fal: this.toNullableNumber(position.fal ?? position.alt ?? position.altbaro ?? null, null),
      track: this.toNumber(position.track ?? position.fhd ?? null, 0),
      fhd: this.toNullableNumber(position.fhd ?? null, null),
      fgs: this.toNumber(position.fgs ?? position.spd ?? null, 0),
      fvr: this.toNullableNumber(position.fvr ?? position.vsi ?? null, null),
      sq: this.toNumber(position.sq ?? null, 0),
      gnd: this.toBoolean(position.gnd ?? position.onground ?? null, false), // Convert to boolean
      altbaro: this.toNullableNumber(position.altbaro ?? position.alt ?? null, null),
      altgps: this.toNullableNumber(position.altgps ?? position.geomalt ?? null, null),
      nic: this.toNumber(position.nic ?? null, 0),
      nicbaro: this.toNumber(position.nicbaro ?? null, 0),
      nacp: this.toNumber(position.nacp ?? null, 0),
      nacv: this.toNumber(position.nacv ?? null, 0),
      sil: this.toNumber(position.sil ?? null, 0),
      silType: this.toNullableString(position.silType ?? position.siltype ?? null, null),
      repType: this.toStringValue(position.repType ?? position.reptype ?? null, 'position'),
      so: this.toStringValue(position.so ?? null, 'ADSB'),
      stcenla: this.toNumber(position.stcenla ?? null, 0),
      stcenlo: this.toNumber(position.stcenlo ?? null, 0),
    };
  }

  /**
   * Normalize all positions in flight data
   */
  private normalizeFlightDataPositions(flightData: TrackedFlight): TrackedFlight {
    if (!flightData.positions || !Array.isArray(flightData.positions)) {
      return flightData;
    }

    return {
      ...flightData,
      positions: (flightData.positions as Array<Record<string, unknown>>).map((pos) => this.normalizePosition(pos)),
    } as TrackedFlight;
  }

  /**
   * Calculate due date (10 calendar days after issue date)
   */
  private calculateDueDate(issueDate: Date): Date {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 10);
    return dueDate;
  }

  /**
   * Create invoices from successful output entries
   */
  private async createInvoicesFromOutputEntries(outputEntries: ProcessingOutputEntry[]): Promise<any[]> {
    const issueDate = new Date(); // Current date as issue date
    const dueDate = this.calculateDueDate(issueDate);
    const createdInvoices: any[] = [];

    for (const entry of outputEntries) {
      try {
        // Upload mapHtml to S3 if available
        let mapHtmlUrl: string | undefined = undefined;
        if (entry.map_html) {
          try {
            // Check if it's a valid file path
            const filePath = entry.map_html;
            try {
              await fs.access(filePath);
              // File exists, upload to S3
              const s3Url = await S3Service.uploadFile(filePath);
              if (s3Url) {
                mapHtmlUrl = s3Url;
                logger.info(`Uploaded mapHtml to S3: ${s3Url}`);
              } else {
                logger.warn(`S3 upload skipped for ${filePath} (S3 not configured)`);
                // Fallback to file path if S3 is not configured
                mapHtmlUrl = filePath;
              }
            } catch (fileError) {
              // File doesn't exist, might already be a URL
              logger.warn(`MapHtml file not found: ${filePath}, treating as URL`);
              mapHtmlUrl = filePath; // Assume it's already a URL
            }
          } catch (uploadError: any) {
            logger.error({
              filePath: entry.map_html,
            }, `Failed to upload mapHtml to S3: ${uploadError.message}`);
            // Fallback to original path/URL
            mapHtmlUrl = entry.map_html;
          }
        }

        logger.info(`Creating invoice from output entry for flight ${entry.flight_id}, country ${entry.country}`);
        const invoiceData: any = {
          issueDate,
          dueDate, // Ensure dueDate is passed here
          status: InvoiceStatus.PENDING,
          flightId: entry.flight_id,

          // Customer info (B-C)
          clientName:
            entry.aircraft_data?.operatorName || entry.aircraft_data?.ownerName || 'Unknown Operator',
          clientAddress: null, // Address not available in output yet

          // Flight / FIR metadata (F-P)
          mapHtml: mapHtmlUrl,
          flightNumber: entry.flight_data?.cs || entry.flight_data?.ident || 'Unknown',
          originIcao: entry.takeoff_airport_icao || undefined,
          destinationIcao: entry.landing_airport_icao || undefined,
          originIata: entry.takeoff_airport_iata || undefined,
          destinationIata: entry.landing_airport_iata || undefined,
          registrationNumber: entry.aircraft_data?.registration || undefined,
          aircraftModelName:
            entry.aircraft_data?.aircraftModelName || entry.aircraft_data?.model || null, // Map from model if available
          act: entry.act || entry.flight_data?.act || undefined, // Aircraft Type ICAO code
          modeSHex: entry.flight_data?.ms || undefined, // Mode S hex code
          alic: entry.flight_data?.alic || undefined, // Aircraft License ICAO code
          flightDate: entry.flight_date ? new Date(entry.flight_date) : new Date(issueDate),
          firName: entry.fir_label || entry.fir_name || undefined,
          firCountry: entry.country || undefined,
          firEntryTimeUtc: entry.earliest_entry_time
            ? new Date(entry.earliest_entry_time)
            : null,
          firExitTimeUtc: entry.latest_exit_time ? new Date(entry.latest_exit_time) : null,

          // Fee breakdown / FX (Q-V)
          feeDescription: entry.fee_details?.calculation_description || undefined,
          feeAmount: entry.fee_details?.fee || undefined,
          otherFeesAmount: entry.fee_details?.other_fees || [], // Pass the array directly (handled as 'any' in Service)
          totalOriginalAmount:
            entry.fee_details?.fee && entry.fee_details?.other_fees !== undefined
              ? entry.fee_details.fee +
              (Array.isArray(entry.fee_details.other_fees) ? 0 : entry.fee_details.other_fees || 0)
              : undefined,
          originalCurrency: entry.fee_details?.currency || undefined,
          fxRate: entry.fee_details?.fx_rate || entry.fee_details?.fx_rate_usd || undefined, // Map fx_rate_usd
          totalUsdAmount:
            entry.fee_details?.total_amount_usd !== undefined
              ? Number(entry.fee_details.total_amount_usd)
              : undefined,

          // Check for existing invoice to determine replacment/revision status
          // (Logic simpler here: new invoices are distinct)
          currentRevisionNumber: 0,
          revisionRequired: false,
          isReplacement: false,
          originalInvoiceId: null,
          replacementSuffix: null,
        };

        // Extract IBA and JetNet operator IDs from aircraft_data
        // These can be at the top-level if flattened, or nested in currentState.operator.id
        const operatorIds = entry.aircraft_data?.currentState?.operator?.id;
        const ibaOperatorId = entry.aircraft_data?.ibaOperatorId
          || (operatorIds?.iba ? String(operatorIds.iba) : undefined);
        const jetnetOperatorId = entry.aircraft_data?.jetnetOperatorId
          || (operatorIds?.jetnet ? String(operatorIds.jetnet) : undefined);

        // Lookup Operator ID (ClientKYC) - prioritizes IBA ID, then JetNet ID, then name match
        const lookupResult = await this.lookupOperatorId(
          invoiceData.clientName,
          ibaOperatorId,
          jetnetOperatorId
        );

        if (lookupResult.operatorId) {
          // Operator matched - populate operatorId and store the IBA/JetNet IDs used
          invoiceData.operatorId = lookupResult.operatorId;
          invoiceData.ibaId = ibaOperatorId;
          invoiceData.jetnetId = jetnetOperatorId;
        } else {
          // No operator match found - create an InvoiceError instead
          logger.warn(
            `No operator match for flight ${entry.flight_id}, creating error invoice with type: ${lookupResult.error}`
          );
          await this.createOperatorMatchError(entry, lookupResult);
          continue; // Skip creating normal invoice
        }

        const invoice = await InvoiceService.create(invoiceData);
        createdInvoices.push(invoice);

        // Log detailed invoice creation summary
        logger.info({
          invoiceNumber: invoice.invoiceNumber,
          flightId: entry.flight_id,
          country: entry.country,
          registration: entry.aircraft_data?.registration || 'N/A',
          operator: invoiceData.clientName,
          totalUsd: invoiceData.totalUsdAmount?.toFixed(2) || '0.00',
          currency: entry.fee_details?.currency || 'USD',
        }, `✓ 💾 INVOICE SAVED: ${invoice.invoiceNumber} | ${entry.country} | ${entry.aircraft_data?.registration || 'N/A'} | $${invoiceData.totalUsdAmount?.toFixed(2) || '0.00'} USD`);
      } catch (error: any) {
        logger.error({
          entry: entry.country,
          flightId: entry.flight_id,
        }, `Failed to create invoice for output entry: ${error.message}`);
        // Continue with other entries even if one fails
      }
    }

    // Log batch summary
    if (createdInvoices.length > 0) {
      logger.info({
        invoicesCreated: createdInvoices.length,
        totalOutputEntries: outputEntries.length,
      }, `📊 INVOICE BATCH SUMMARY: ${createdInvoices.length} invoices saved to DB (out of ${outputEntries.length} entries processed)`);
    }

    return createdInvoices;
  }

  /**
   * Create error invoice records from errors
   */
  private async createInvoicesFromErrors(errors: ProcessingError[]): Promise<number> {
    const issueDate = new Date(); // Current date as issue date
    const dueDate = this.calculateDueDate(issueDate);
    let count = 0;

    for (const error of errors) {
      try {
        logger.info({ error }, `Creating invoice error record from error:`);
        const errorInvoiceData = {
          issueDate,
          dueDate,
          status: InvoiceStatus.DRAFT,
          flightId: error.flight_id,

          // Customer info (B-C)
          clientName:
            error.aircraft_data?.operatorName || error.flight_data?.alna || 'Unknown Operator',

          // Flight / FIR metadata (F-P) - from error object
          mapHtml: undefined, // Errors don't have map_html
          flightNumber: error.flight_data?.cs || undefined,
          originIcao: error.flight_data?.aporgic || error.flight_data?.aptkoic || undefined,
          destinationIcao: error.flight_data?.apdstic || error.flight_data?.aplngic || undefined,
          originIata: error.flight_data?.aporgia || error.flight_data?.aptkoia || undefined,
          destinationIata: error.flight_data?.apdstia || error.flight_data?.aplngia || undefined,
          registrationNumber: error.registration || error.flight_data?.acr || undefined,
          aircraftModelName: error.flight_data?.acd || undefined,
          act: error.flight_data?.act || undefined, // Aircraft Type ICAO code
          modeSHex: error.flight_data?.ms || undefined, // Mode S hex code
          alic: error.flight_data?.alic || undefined, // Aircraft License ICAO code
          flightDate: undefined, // Not available in error object
          firName: undefined, // Not available in error object
          firCountry: error.country || undefined,
          firEntryTimeUtc: undefined, // Not available in error object
          firExitTimeUtc: undefined, // Not available in error object

          // Fee breakdown / FX (Q-V) - often missing for errors; store as nulls
          feeDescription: undefined,
          feeAmount: undefined,
          otherFeesAmount: undefined,
          totalOriginalAmount: undefined,
          originalCurrency: undefined,
          fxRate: undefined,
          totalUsdAmount: undefined,

          // IBA and JetNet operator IDs (if available)
          // Extract from both flattened and nested structure
          ibaId: error.aircraft_data?.ibaOperatorId
            || (error.aircraft_data?.currentState?.operator?.id?.iba
              ? String(error.aircraft_data.currentState.operator.id.iba) : undefined),
          jetnetId: error.aircraft_data?.jetnetOperatorId
            || (error.aircraft_data?.currentState?.operator?.id?.jetnet
              ? String(error.aircraft_data.currentState.operator.id.jetnet) : undefined),

          // Error handling
          hasError: true,
          errorType: error.error_type || error.error_type_detected || 'UNKNOWN_ERROR',
          errorMessage:
            error.error_message || error.error_details || 'An error occurred during processing',
          errorStatus: ErrorStatus.PENDING,
        };

        const invoice = await InvoiceErrorService.create(errorInvoiceData);
        count++;
        logger.info(
          `✓ Created error invoice ${invoice.invoiceNumber} for flight ${error.flight_data?.cs || error.flight_id || 'unknown'} - ${error.country || 'unknown country'}`,
        );
      } catch (error: any) {
        logger.error({
          errorType: error.error_type,
          flightId: error.flight_id,
        }, `Failed to create invoice for error entry: ${error.message}`);
        // Continue with other errors even if one fails
      }
    }
    return count;
  }

  /**
   * Create an error invoice for operator match failures
   * Called when an output entry cannot be matched to a ClientKYC record
   */
  private async createOperatorMatchError(
    entry: ProcessingOutputEntry,
    lookupResult: OperatorLookupResult
  ): Promise<void> {
    const issueDate = new Date();
    const dueDate = this.calculateDueDate(issueDate);

    try {
      const errorInvoiceData = {
        issueDate,
        dueDate,
        status: InvoiceStatus.DRAFT,
        flightId: entry.flight_id,

        // Customer info
        clientName:
          entry.aircraft_data?.operatorName || entry.aircraft_data?.ownerName || 'Unknown Operator',

        // Flight / FIR metadata
        flightNumber: entry.flight_data?.cs || entry.flight_data?.ident || 'Unknown',
        originIcao: entry.takeoff_airport_icao || undefined,
        destinationIcao: entry.landing_airport_icao || undefined,
        originIata: entry.takeoff_airport_iata || undefined,
        destinationIata: entry.landing_airport_iata || undefined,
        registrationNumber: entry.aircraft_data?.registration || undefined,
        aircraftModelName:
          entry.aircraft_data?.aircraftModelName || entry.aircraft_data?.model || null,
        act: entry.act || entry.flight_data?.act || undefined,
        modeSHex: entry.flight_data?.ms || undefined,
        alic: entry.flight_data?.alic || undefined,
        flightDate: entry.flight_date ? new Date(entry.flight_date) : new Date(issueDate),
        firName: entry.fir_label || entry.fir_name || undefined,
        firCountry: entry.country || undefined,
        firEntryTimeUtc: entry.earliest_entry_time
          ? new Date(entry.earliest_entry_time)
          : null,
        firExitTimeUtc: entry.latest_exit_time ? new Date(entry.latest_exit_time) : null,

        // Fee breakdown (preserve even though invoice is in error)
        feeDescription: entry.fee_details?.calculation_description || undefined,
        feeAmount: entry.fee_details?.fee || undefined,
        otherFeesAmount: typeof entry.fee_details?.other_fees === 'number' ? entry.fee_details.other_fees : 0,
        totalOriginalAmount:
          entry.fee_details?.fee && entry.fee_details?.other_fees !== undefined
            ? entry.fee_details.fee +
            (Array.isArray(entry.fee_details.other_fees) ? 0 : entry.fee_details.other_fees || 0)
            : undefined,
        originalCurrency: entry.fee_details?.currency || undefined,
        fxRate: entry.fee_details?.fx_rate || entry.fee_details?.fx_rate_usd || undefined,
        totalUsdAmount:
          entry.fee_details?.total_amount_usd !== undefined
            ? Number(entry.fee_details.total_amount_usd)
            : undefined,

        // IBA and JetNet operator IDs (for potential manual resolution)
        ibaId: lookupResult.attemptedIbaId,
        jetnetId: lookupResult.attemptedJetnetId,

        // Error handling
        hasError: true,
        errorType: lookupResult.error || 'OPERATOR_MATCH_FAILED',
        errorMessage: `Operator matching failed: ${lookupResult.error}. Attempted IBA ID: ${lookupResult.attemptedIbaId || 'none'}, JetNet ID: ${lookupResult.attemptedJetnetId || 'none'}`,
        errorStatus: ErrorStatus.PENDING,
      };

      const errorInvoice = await InvoiceErrorService.create(errorInvoiceData);
      logger.info(
        `✓ Created operator match error invoice ${errorInvoice.invoiceNumber} for flight ${entry.flight_data?.cs || entry.flight_id} - ${entry.country} (error: ${lookupResult.error})`
      );
    } catch (err: any) {
      logger.error({
        flightId: entry.flight_id,
        country: entry.country,
        error: lookupResult.error,
      }, `Failed to create operator match error invoice: ${err.message}`);
    }
  }
  /**
   * Helper to look up operator ID from ClientKYC table
   * Prioritizes IBA ID match, then JetNet ID match, then falls back to name match
   */
  private async lookupOperatorId(
    clientName: string,
    ibaOperatorId?: string,
    jetnetOperatorId?: string
  ): Promise<OperatorLookupResult> {
    try {
      // 1. Try IBA ID match first (if available)
      if (ibaOperatorId) {
        const client = await prisma.clientKYC.findFirst({
          where: { ibaId: ibaOperatorId },
          select: { id: true },
        });
        if (client) {
          logger.debug(`Matched operator by IBA ID: ${ibaOperatorId}`);
          return {
            operatorId: client.id,
            matchMethod: 'iba_id',
            attemptedIbaId: ibaOperatorId,
            attemptedJetnetId: jetnetOperatorId,
          };
        }
      }

      // 2. Try JetNet ID match (if available)
      if (jetnetOperatorId) {
        const client = await prisma.clientKYC.findFirst({
          where: { jetnetId: jetnetOperatorId },
          select: { id: true },
        });
        if (client) {
          logger.debug(`Matched operator by JetNet ID: ${jetnetOperatorId}`);
          return {
            operatorId: client.id,
            matchMethod: 'jetnet_id',
            attemptedIbaId: ibaOperatorId,
            attemptedJetnetId: jetnetOperatorId,
          };
        }
      }

      // 3. Fall back to name matching
      if (clientName && clientName !== 'Unknown Operator') {
        const client = await prisma.clientKYC.findFirst({
          where: {
            OR: [
              {
                fullLegalNameEntity: {
                  equals: clientName,
                  mode: 'insensitive',
                },
              },
              {
                tradingBrandName: {
                  equals: clientName,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: { id: true },
        });
        if (client) {
          logger.debug(`Matched operator by name: ${clientName}`);
          return {
            operatorId: client.id,
            matchMethod: 'name_match',
            attemptedIbaId: ibaOperatorId,
            attemptedJetnetId: jetnetOperatorId,
          };
        }
      }

      // 4. No match found - determine error type
      let errorType: string;
      if (!ibaOperatorId && !jetnetOperatorId) {
        errorType = OperatorMatchErrorTypes.OPERATOR_ID_NOT_FOUND;
      } else {
        errorType = OperatorMatchErrorTypes.OPERATOR_ID_MISMATCH;
      }

      logger.warn(`No operator match found for: name="${clientName}", ibaId="${ibaOperatorId}", jetnetId="${jetnetOperatorId}", error=${errorType}`);
      return {
        operatorId: null,
        matchMethod: 'none',
        error: errorType as any,
        attemptedIbaId: ibaOperatorId,
        attemptedJetnetId: jetnetOperatorId,
      };
    } catch (error: any) {
      logger.error(`Failed to lookup operator ID for ${clientName}: ${error.message}`);
      return {
        operatorId: null,
        matchMethod: 'none',
        error: OperatorMatchErrorTypes.CLIENT_KYC_NOT_FOUND,
        attemptedIbaId: ibaOperatorId,
        attemptedJetnetId: jetnetOperatorId,
      };
    }
  }

  /**
   * Save invoices to a JSONL file
   */
  private async saveInvoicesToFile(flightId: string, invoices: any[]): Promise<void> {
    try {
      await this.ensureOutputDir();
      const filename = 'sqs.json';
      const filepath = path.join(this.outputDir, filename);

      // Create a record with flightId and invoices
      const record = {
        flightId,
        timestamp: new Date().toISOString(),
        invoices: invoices
      };

      await fs.appendFile(filepath, JSON.stringify(record, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ) + '\n', 'utf-8');

      logger.info(`✓ Saved invoices to: ${filepath}`);
    } catch (error: any) {
      logger.error(`Failed to save invoices: ${error.message}`);
    }
  }

  /**
   * Save flight data to a single JSONL file (JSON Lines format)
   * Each flight is appended as a single line in the file
   * Positions are normalized to include all required fields with proper types
   */
  private async saveFlightToFile(flightData: TrackedFlight): Promise<void> {
    try {
      // Ensure output directory exists
      await this.ensureOutputDir();

      // Use a single JSONL file for all flights
      const filename = 'flights.jsonl';
      const filepath = path.join(this.outputDir, filename);

      // Convert flight data to a single-line JSON string
      const jsonLine = JSON.stringify(flightData);

      // Append the flight as a new line (JSONL format)
      await fs.appendFile(filepath, jsonLine + '\n', 'utf-8');

      logger.info(`✓ Saved flight data to: ${filepath}`);
    } catch (error: any) {
      logger.error(`Failed to save flight data to file: ${error.message}`);
      // Don't throw - we don't want file save failures to prevent message processing
    }
  }
}

export default SQSMessageHandler;
