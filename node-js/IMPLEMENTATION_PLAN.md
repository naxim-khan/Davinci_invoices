# Flight Processing System - Batch Processing Implementation

## Overview

The current system fetches ONE flight from the `FlightProcessingQueue` table, retrieves flight data from Apache Pinot, and stores it in `flightData.json` for testing. This plan implements a production-ready batch processing system that:

1. Fetches 10 flights at a time from the database
2. Processes them sequentially (one at a time) through the Python pipeline
3. Tracks processing status with robust error handling
4. Deletes successfully processed entries from the database
5. Continues with the next batch automatically

## Current Data Flow

### 1. **Database Layer** (`FlightProcessingQueue`)
- **Location**: NeonDB (PostgreSQL)
- **Schema**: `flightId` (BigInt, unique), `createdAt`, `updatedAt`
- **Purpose**: Queue of flights waiting to be processed

### 2. **Data Fetching** (`fetch-flight-data.ts`)
- **Current**: Fetches ONE `flightId` from queue
- **Queries**: Apache Pinot using `PINOT_HTTP_BROKER_URL`
- **Stores**: Raw flight data in `flightData.json`

### 3. **Flight Processing** (`FlightProcessingService.ts`)
- **Responsibility**: Node.js → Python bridge
- **Process**:
  1. Writes flight data to file in `data/flight-inputs/`
  2. Spawns Python process with `process_flight_with_visuals.py`
  3. Executes Python analysis: flight path → FIR detection → fee calculation
  4. Returns: HTML maps + processed output entries

### 4. **Python Processing** (`process_flight_with_visuals.py`)
- **Main Function**: `process_flight_entry()`
- **Sub-processes**:
  - `analyse_flight_entry()` - Flight analysis & FIR crossing detection
  - `visualise_flight_from_output()` - HTML map generation
  - Fee calculations via `calculate_fees.py`
- **Output**:
  ```json
  {
    "success": boolean,
    "output_entries": [...], // FIR crossing data with fees
    "master_file": "path/to/html",
    "errors": [...],
    "map_html": "country-specific-map.html"
  }
  ```

### 5. **Invoice Generation** (`InvoiceService.ts`)
- **Function**: `InvoiceService.create()`
- **Input**: Each `output_entry` from Python processing
- **Creates**: Invoice record in database with:
  - Flight details (number, registration, dates)
  - FIR crossing info (entry/exit times, country)
  - Fee calculations (amount, currency, FX rate)
  - Map HTML reference

## Proposed Changes

### Core Script: `scripts/process-flight-batch.ts` (NEW)

A new production-grade batch processor that orchestrates the entire pipeline:

#### 1. **Batch Fetching**
```typescript
// Fetch 10 flights at once, ordered by creation time
const flightBatch = await prisma.flightProcessingQueue.findMany({
  select: { id: true, flightId: true },
  orderBy: { createdAt: 'asc' },
  take: 10
});
```

#### 2. **Sequential Processing Loop**
For each flight in the batch:
1. Fetch flight data from Pinot
2. Process through `FlightProcessingService`
3. Generate invoices for each FIR crossing
4. Track success/failure in processing log

#### 3. **Processing Status Tracker**
```json
// data/processing-logs/batch_[timestamp].json
{
  "batchId": "unique-id",
  "startTime": "ISO-8601",
  "endTime": "ISO-8601",
  "totalFlights": 10,
  "processed": [
    {
      "queueId": 123,
      "flightId": "2612937641",
      "status": "success",
      "invoicesCreated": 3,
      "processingTime": "5.2s",
      "timestamp": "..."
    }
  ],
  "failed": [
    {
      "queueId": 124,
      "flightId": "...",
      "status": "failed",
      "error": "Pinot query timeout",
      "timestamp": "..."
    }
  ]
}
```

#### 4. **Database Cleanup**
```typescript
// Delete only successfully processed entries
await prisma.flightProcessingQueue.deleteMany({
  where: {
    id: { in: successfulQueueIds }
  }
});
```

#### 5. **Batch Iteration**
After completing a batch:
- Check if more flights exist in queue
- If yes: Start processing next batch automatically
- If no: Exit gracefully with summary

---

### Modified Files

#### `scripts/fetch-flight-data.ts` → `scripts/process-flight-batch.ts`
**Changes**:
- Rename and expand to handle batch processing
- Add sequential processing loop (10 flights → process 1 → next → ...)
- Integrate `FlightProcessingService` to process each flight
- Integrate `InvoiceService.create()` for each FIR crossing
- Add batch processing log tracker
- Add database cleanup logic
- Add continuous batch iteration

#### `package.json`
**Changes**:
- Add new script: `"process-batch": "tsx scripts/process-flight-batch.ts"`

#### `FlightProcessingService.ts` (No Changes)
- Already handles single flight processing correctly
- Will be called in loop by batch processor

#### `InvoiceService.ts` (No Changes)
- Already has `create()` function ready to use
- Will be called for each processed FIR crossing

---

## Detailed Implementation Steps

### Phase 1: Setup & Infrastructure
1. ✅ Create `data/processing-logs/` directory
2. ✅ Create batch processing log schema (TypeScript interfaces)
3. ✅ Set up Python venv and install requirements

### Phase 2: Batch Processor Implementation
1. Create `scripts/process-flight-batch.ts`
2. Implement batch fetching (10 flights)
3. Implement sequential processing loop
4. Integrate FlightProcessingService
5. Integrate InvoiceService for each output_entry
6. Implement processing log tracker
7. Implement database cleanup
8. Add error handling & retries
9. Add batch iteration logic

### Phase 3: Logging & Monitoring  
1. Add detailed console logging
2. Add batch summary statistics
3. Add error categorization (Pinot failure, Python error, Invoice creation failure)
4. Save processing logs to JSON files

---

## Verification Plan

### Automated Testing

#### 1. Database Query Test
**Purpose**: Verify batch fetching works correctly
```bash
# Run modified fetch script with dry-run mode
npm run process-batch -- --dry-run
```
**Expected**: Should log 10 flightIds without processing

#### 2. Single Flight Integration Test  
**Purpose**: Verify end-to-end processing for one flight
```bash
# Process one flight manually
npm run process-batch -- --limit 1
```
**Expected**:
- Flight data fetched from Pinot ✓
- Python processing successful ✓
- HTML maps generated ✓
- Invoices created ✓
- Queue entry deleted ✓
- Processing log created ✓

### Manual Testing

#### 3. Batch Processing Test
**Steps**:
1. Ensure at least 25 flights exist in `FlightProcessingQueue`
2. Run: `npm run process-batch`
3. Observe console output for progress
4. Verify:
   - Processes exactly 10 flights
   - All successful flights deleted from queue
   - Failed flights remain in queue
   - Processing log created in `data/processing-logs/`
   - Invoices created in database
5. Run command again
6. Verify: Next batch of 10 flights is processed

#### 4. Error Handling Test
**Steps**:
1. Temporarily disable Pinot connection (wrong URL in `.env`)
2. Run batch processor
3. Verify:
   - Errors logged appropriately
   - Failed flights NOT deleted from queue
   - Processing continues for remaining flights
   - Batch summary shows partial success

#### 5. Empty Queue Test
**Steps**:
1. Process all flights until queue is empty
2. Run batch processor on empty queue
3. Verify: Graceful exit with "No flights to process" message

---

## User Review Required

> [!IMPORTANT]
> **Processing Flow Confirmation**
> 
> Please confirm this processing flow matches your requirements:
> 1. Fetch 10 flights → Process sequentially (#1, #2, ... #10)
> 2. For each flight: Pinot fetch → Python processing → Invoice creation
> 3. Delete successful flights from queue
> 4. Auto-start next batch if more flights exist
>
> Is this the desired behavior, or do you need any modifications?

> [!WARNING]
> **Invoice Creation Logic**
> 
> Each flight can cross multiple FIRs, resulting in multiple invoices per flight.
> For example, flight ABC123 crossing 3 FIRs = 3 separate invoices.
> 
> Is this the expected behavior, or should invoices be consolidated per flight?

---

## Risk Mitigation

### 1. **Database Transaction Safety**
- Only delete flights after ALL related invoices are successfully created
- Use transaction to ensure atomicity

### 2. **Python Process Failures**
- Wrap each Python call in try-catch
- Log errors to processing log
- Continue with next flight (don't fail entire batch)

### 3. **Pinot Query Failures**
- Implement timeout (30s per flight)
- Retry once before marking as failed
- Log specific error (timeout vs. not found vs. query error)

### 4. **File System Organization**
- Clean up old flight input files after successful processing
- Rotate processing logs (keep last 100 batches)

---

## Success Criteria

✅ System processes 10 flights per batch sequentially  
✅ Failed flights remain in queue for retry  
✅ Successful flights deleted from queue  
✅ Processing logs maintained for audit trail  
✅ Invoices created for all FIR crossings  
✅ Automatic batch iteration until queue empty  
✅ Graceful error handling without crashing
