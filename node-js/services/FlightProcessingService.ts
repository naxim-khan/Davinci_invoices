import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import logger from '../utils/logger';
import { TrackedFlight } from '../types/trackedFlight';
import { ValidationError } from '../utils/error.util';

import { ProcessFlightResult } from '../types/processing';

export class FlightProcessingService {
  private pythonScriptDir: string;
  private outputDir: string;
  private flightDataDir: string;
  private useTestFile: boolean;

  constructor(useTestFile: boolean = true) {
    this.pythonScriptDir = path.join(process.cwd(), '..', 'davinci-stream');
    this.outputDir = path.join(this.pythonScriptDir, 'output_htmls');
    this.flightDataDir = path.join(process.cwd(), 'data', 'flight-inputs');
    this.useTestFile = useTestFile;
  }

  /**
   * Process flight data using Python process_flight_entry function
   * @param flightData - TrackedFlight data from Pinot (optional if using test file)
   * @returns Processed flight result with HTML maps and fee calculations
   */
  async processFlight(flightData?: TrackedFlight): Promise<ProcessFlightResult> {
    if (this.useTestFile) {
      logger.info('Using test file for flight processing');
      return this.processFlightFromFile();
    }

    if (!flightData) {
      throw new ValidationError('Flight data is required when not using test file');
    }

    logger.info(`Processing flight ${flightData.flightId} with Python function`);
    return this.processFlightFromData(flightData);
  }

  /**
   * Process flight from test file (for testing)
   */
  private async processFlightFromFile(): Promise<ProcessFlightResult> {
    const testFlightFile = path.join(this.pythonScriptDir, 'input_flights', 'single_flight.json');

    logger.info(`Processing test flight from: ${testFlightFile}`);

    const pythonScript = `
import json
import sys
from pathlib import Path
from process_flight_with_visuals import process_flight_entry

try:
    # Read flight data from file
    flight_file = Path(sys.argv[1])
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not flight_file.exists():
        error_result = {
            "success": False,
            "output_entries": [],
            "master_file": None,
            "error_message": f"Test file not found: {flight_file}"
        }
        print(json.dumps(error_result, indent=2, default=str))
        sys.exit(1)
    
    # Process the flight
    result = process_flight_entry(
        flight_data=str(flight_file),
        output_dir=output_dir,
        debug=False  # Silent mode for subprocess
    )
    
    # Output as JSON
    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    error_result = {
        "success": False,
        "output_entries": [],
        "master_file": None,
        "error_message": str(e),
        "error_traceback": None
    }
    import traceback
    error_result["error_traceback"] = traceback.format_exc()
    print(json.dumps(error_result, indent=2, default=str))
    sys.exit(1)
    `;

    return this.executePythonScript(pythonScript, [testFlightFile, this.outputDir]);
  }

  /**
   * Process flight from actual flight data
   * Uses file in app folder to avoid E2BIG error (command line argument size limit)
   */
  private async processFlightFromData(flightData: TrackedFlight): Promise<ProcessFlightResult> {
    // Convert TrackedFlight to format expected by Python function
    logger.info({
      flightId: flightData.flightId,
      positionsCount: flightData.positions?.length || 0,
    }, `Converting flight data for Python processing`);

    // Ensure flight data directory exists
    try {
      await fs.mkdir(this.flightDataDir, { recursive: true });
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';
      logger.error(`Failed to create flight data directory: ${errorMessage}`);
      throw error;
    }

    // Create file in app folder to store flight data (avoids E2BIG error)
    const flightFile = path.join(
      this.flightDataDir,
      `flight_${flightData.flightId || Date.now()}_${Date.now()}.json`,
    );

    // Write flight data to file
    await fs.writeFile(flightFile, JSON.stringify(flightData, null, 2), 'utf-8');

    // Verify file was written and get its size
    const stats = await fs.stat(flightFile);
    logger.info({
      path: flightFile,
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      exists: true,
    }, `Wrote flight data to file`);

    const pythonScript = `
import json
import sys
from pathlib import Path
from process_flight_with_visuals import process_flight_entry

try:
    # Read flight data from file
    flight_file = Path(sys.argv[1])
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not flight_file.exists():
        error_result = {
            "success": False,
            "output_entries": [],
            "master_file": None,
            "error_message": f"Flight data file not found: {flight_file}"
        }
        print(json.dumps(error_result, indent=2, default=str))
        sys.exit(1)
    
    # Process the flight
    result = process_flight_entry(
        flight_data=str(flight_file),
        output_dir=output_dir,
        debug=False  # Silent mode for subprocess
    )
    
    # Output as JSON
    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    error_result = {
        "success": False,
        "output_entries": [],
        "master_file": None,
        "error_message": str(e),
        "error_traceback": None
    }
    import traceback
    error_result["error_traceback"] = traceback.format_exc()
    print(json.dumps(error_result, indent=2, default=str))
    sys.exit(1)
    `;

    const result = await this.executePythonScript(pythonScript, [flightFile, this.outputDir]);

    return result;
  }

  /**
   * Execute Python script and return result
   */
  private async executePythonScript(script: string, args: string[]): Promise<ProcessFlightResult> {
    return new Promise((resolve, reject) => {
      const python = spawn('python', ['-c', script, ...args], {
        cwd: this.pythonScriptDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          logger.error({
            exitCode: code,
            stderr: stderr.substring(0, 1000), // Limit stderr to first 1000 chars
            stdout: stdout.substring(0, 500), // Limit stdout to first 500 chars
          }, 'Python process exited with non-zero code');
          const error = new Error(
            `Python process exited with code ${code}\nStderr: ${stderr.substring(0, 2000)}`,
          );
          reject(error);
          return;
        }

        try {
          // Python may print status messages before JSON output
          // Extract only the JSON part (from first '{' to end)
          const jsonStart = stdout.indexOf('{');
          if (jsonStart === -1) {
            throw new Error('No JSON object found in Python output');
          }
          const jsonOutput = stdout.substring(jsonStart);

          const result = JSON.parse(jsonOutput) as ProcessFlightResult;
          logger.info({
            success: result.success,
            outputEntriesCount: result.output_entries?.length || 0,
            hasErrors: (result.errors?.length || 0) > 0,
          }, 'Python process completed successfully');
          resolve(result);
        } catch (parseError: unknown) {
          const parseErrorMessage =
            parseError && typeof parseError === 'object' && 'message' in parseError
              ? String(parseError.message)
              : 'Unknown parse error';
          logger.error({
            parseError: parseErrorMessage,
            stdoutLength: stdout.length,
            stdoutPreview: stdout.substring(0, 500),
            stderrPreview: stderr.substring(0, 500),
          }, 'Failed to parse Python output as JSON');
          const error = new Error(
            `Failed to parse Python output as JSON: ${parseErrorMessage}\nOutput (first 1000 chars): ${stdout.substring(0, 1000)}\nStderr (first 1000 chars): ${stderr.substring(0, 1000)}`,
          );
          reject(error);
        }
      });

      python.on('error', (error) => {
        logger.error({ error }, 'Failed to start Python process:');
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Unknown error';
        reject(new Error(`Failed to start Python process: ${errorMessage}`));
      });
    });
  }
}

export default FlightProcessingService;
