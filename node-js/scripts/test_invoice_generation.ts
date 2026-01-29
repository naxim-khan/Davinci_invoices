
import { FlightProcessingService } from '../services/FlightProcessingService';
import { TrackedFlight } from '../types/trackedFlight';

async function runTest() {
    console.log("Starting test...");

    const processingService = new FlightProcessingService(false);

    // Construct a synthetic flight that crosses Kabul FIR
    // Path: South of Afghanistan (Pakistan) -> North of Afghanistan (Tajikistan)
    // Kabul FIR is roughly 30N-38N, 60E-75E
    const syntheticFlight: TrackedFlight = {
        flightId: "999999999", // String to avoid BigInt serialization issues in this script
        positions: [
            {
                lat: 30.0,
                lon: 69.0,
                // @ts-ignore
                svd: "2026-01-28T10:00:00Z",
                altitude: 35000,
                fgs: 450,
                fvr: 0,
                gnd: false
            },
            {
                lat: 32.0,
                lon: 69.0,
                // @ts-ignore
                svd: "2026-01-28T10:30:00Z",
                altitude: 35000,
                fgs: 450,
                fvr: 0,
                gnd: false
            },
            {
                lat: 34.0,
                lon: 69.0,
                // @ts-ignore
                svd: "2026-01-28T11:00:00Z",
                altitude: 35000,
                fgs: 450,
                fvr: 0,
                gnd: false
            },
            {
                lat: 36.0,
                lon: 69.0,
                // @ts-ignore
                svd: "2026-01-28T11:30:00Z",
                altitude: 35000,
                fgs: 450,
                fvr: 0,
                gnd: false
            },
            {
                lat: 38.0,
                lon: 69.0,
                // @ts-ignore
                svd: "2026-01-28T12:00:00Z",
                altitude: 35000,
                fgs: 450,
                fvr: 0,
                gnd: false
            }
        ],
        acd: "B777",
        acr: "TEST-001",
        act: "B77W",
        alia: "TST",
        alic: "TEST",
        alna: "Test Airlines",
        aporgia: "KHI",
        apdstia: "TAS",
        isDeleted: false
    };

    try {
        console.log("Processing flight...");
        const result = await processingService.processFlight(syntheticFlight);
        console.log("\n--- Processing Result ---");
        console.log(`Success: ${result.success}`);
        console.log(`Invoices Generated: ${result.output_entries.length}`);
        if (result.output_entries.length > 0) {
            console.log("Output Entries:", JSON.stringify(result.output_entries, null, 2));
        }
        if (result.error_message) {
            console.error("Error:", result.error_message);
        }
    } catch (error) {
        console.error("Test failed with exception:", error);
    }
}

runTest();
