# How to Run the Batch Flight Processing System

## 🎯 Quick Start

```bash
# 1. Activate Python environment (in separate terminal)
cd d:\davinci_server\davinci-stream-processing
.\venv\Scripts\activate

# 2. Run the batch processor (in Node.js terminal)
cd d:\davinci_server\node-js
npm run process-batch
```

---

## 📋 Prerequisites Checklist

Before running, ensure you have:

### ✅ 1. Database Setup
- [ ] NeonDB connection working
- [ ] Flights exist in `FlightProcessingQueue` table
- [ ] `.env` file configured with `DATABASE_URL`

**Check queue status:**
```sql
SELECT COUNT(*) FROM "FlightProcessingQueue";
-- Should return > 0
```

### ✅ 2. Apache Pinot Access
- [ ] Pinot broker accessible
- [ ] `.env` has `PINOT_HTTP_BROKER_URL`
- [ ] `.env` has `PINOT_TABLE_NAME` (default: 'flights')

**Test Pinot connection:**
```bash
curl http://your-pinot-broker:8000/health
```

### ✅ 3. Python Environment
- [ ] Virtual environment created in `davinci-stream-processing/venv/`
- [ ] All dependencies installed
- [ ] Python activated in separate terminal

**Verify Python setup:**
```bash
cd d:\davinci_server\davinci-stream-processing
.\venv\Scripts\activate
python --version  # Should show 3.14.2
pip list | Select-String "shapely|folium|pandas"
```

### ✅ 4. Node.js Environment
- [ ] Dependencies installed (`npm install` completed)
- [ ] TypeScript running via `tsx`

---

## 🚀 Step-by-Step Execution Guide

### Step 1: Prepare Your Workspace

**Terminal 1: Python Environment (Keep Running)**
```powershell
# Navigate to Python project
cd d:\davinci_server\davinci-stream-processing

# Activate virtual environment
.\venv\Scripts\activate

# You should see (venv) in your prompt
# Keep this terminal open during processing
```

**Terminal 2: Node.js Server**
```powershell
# Navigate to Node.js project
cd d:\davinci_server\node-js

# Verify environment variables
cat .env | Select-String "PINOT"
```

---

### Step 2: Verify Queue Has Flights

```sql
-- Connect to your NeonDB and run:
SELECT 
    COUNT(*) as total_flights,
    MIN("createdAt") as oldest,
    MAX("createdAt") as newest
FROM "FlightProcessingQueue";
```

**Expected Result:**
```
total_flights | oldest              | newest
--------------|---------------------|-------------------
25           | 2026-01-15 10:00:00 | 2026-01-16 09:30:00
```

If count is 0, you need to add flights to the queue first.

---

### Step 3: Run the Batch Processor

```bash
npm run process-batch
```

---

## 📊 What Happens During Execution

### Phase 1: Initialization
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛫 Flight Batch Processor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Processing directories ensured
```

**What's happening:**
- Creating `data/processing-logs/` directory
- Creating `data/flight-inputs/` directory
- Validating environment variables

---

### Phase 2: Batch Fetching
```
ℹ️  Fetching batch of 10 flights from queue...
✅ Fetched 10 flight(s) from queue
```

**What's happening:**
- Queries `FlightProcessingQueue` table
- Orders by `createdAt ASC` (oldest first)
- Fetches 10 flights
- If less than 10 exist, fetches all remaining

---

### Phase 3: Sequential Processing

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting Batch #1 (10 flights)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Processing flight 1/10...
============================================================
Processing Flight: 2612937641 (Queue ID: 123)
============================================================
```

**For Each Flight:**

#### Step 1: Pinot Query
```
ℹ️  Step 1/3: Fetching flight data from Pinot...
✅ Flight data fetched successfully
```
- Executes SQL query to Pinot
- Retrieves flight data (positions, timestamps, aircraft info)
- Transforms response to JSON
- **Duration:** ~1-3 seconds

#### Step 2: Python Processing
```
ℹ️  Step 2/3: Processing flight through Python pipeline...
✅ Python processing complete: 3 FIR crossing(s) detected
```
- Spawns Python subprocess
- Writes flight data to `data/flight-inputs/flight_[id]_[timestamp].json`
- Python processes:
  - Analyzes flight trajectory
  - Detects FIR boundary crossings
  - Calculates fees per FIR
  - Generates HTML maps
- Returns: `output_entries` with FIR crossing data
- **Duration:** ~8-15 seconds per flight

#### Step 3: Invoice Creation
```
ℹ️  Step 3/3: Creating invoices for FIR crossings...
✅ Created 3 invoice(s)
```
- For each FIR crossing in `output_entries`:
  - Creates invoice record in database
  - Populates flight details, fees, dates
  - Links to HTML map
- **Duration:** ~1 second per invoice

#### Success Summary
```
✅ Flight processed successfully in 12.45s (3 invoices)
```

---

### Phase 4: Batch Summary & Cleanup

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Batch #1 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Successful: 9/10
❌ Failed: 1/10
📝 Total Invoices Created: 24
⏱️  Total Processing Time: 145.32s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What happens:**
1. **Database Cleanup**: Deletes 9 successful flights from queue
2. **Failed Flight**: 1 failed flight remains in queue for retry
3. **Log Saved**: Creates `batch_[timestamp]_1.json` in `data/processing-logs/`

---

### Phase 5: Next Batch (Automatic)

If more flights exist in queue:
```
ℹ️  Fetching batch of 10 flights from queue...
✅ Fetched 10 flight(s) from queue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting Batch #2 (10 flights)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Process repeats automatically until queue is empty.

---

### Phase 6: Completion

```
✨ Queue is empty - no more flights to process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 All Batches Completed Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Total Flights Processed: 25
✅ Total Invoices Created: 68
✅ Total Batches: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Script exits with code 0 (success).

---

## 🔍 How to Monitor Progress

### Real-Time Console Output
Watch the terminal for:
- ✅ Success indicators (green checkmarks)
- ❌ Error indicators (red X)
- ℹ️ Info messages (blue i)
- Progress: "Processing flight X/10"

### Check Database (During Execution)

**Queue shrinking:**
```sql
-- Run this periodically
SELECT COUNT(*) FROM "FlightProcessingQueue";
-- Should decrease as batches complete
```

**Invoices being created:**
```sql
SELECT COUNT(*) FROM "Invoice" 
WHERE "createdAt" >= CURRENT_DATE;
-- Should increase as flights are processed
```

### Check Processing Logs

**View latest log:**
```powershell
# List logs (newest first)
Get-ChildItem data\processing-logs\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Read latest log
Get-Content data\processing-logs\batch_*.json | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## 📁 Output Files & Locations

### Processing Logs
**Location:** `d:\davinci_server\node-js\data\processing-logs\`

**Format:** `batch_[timestamp]_[number].json`

**Example:** `batch_1737013845_1.json`

### Temporary Flight Data
**Location:** `d:\davinci_server\node-js\data\flight-inputs\`

**Format:** `flight_[flightId]_[timestamp].json`

**Note:** These can be cleaned up after successful processing

### HTML Maps (Python Output)
**Location:** `d:\davinci_server\davinci-stream-processing\output_htmls\`

**Files:**
- `[flightId]_[date].html` - Master map (all FIRs)
- `[flightId]_[date]_[country].html` - Country-specific maps

### Database Records

**Invoices:** `Invoice` table
```sql
SELECT * FROM "Invoice" 
WHERE "flightId" = 2612937641
ORDER BY "createdAt" DESC;
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "No flights found in FlightProcessingQueue"

**Cause:** Queue is empty

**Solution:**
```sql
-- Add flights to queue
INSERT INTO "FlightProcessingQueue" ("flightId", "createdAt", "updatedAt")
VALUES 
  (2612937641, NOW(), NOW()),
  (2612937642, NOW(), NOW()),
  (2612937643, NOW(), NOW());
```

---

### Issue 2: "PINOT_HTTP_BROKER_URL not found"

**Cause:** Missing environment variable

**Solution:**
```bash
# Check .env file
cat .env | Select-String "PINOT"

# Add if missing
echo "PINOT_HTTP_BROKER_URL=http://your-pinot-broker:8000" >> .env
echo "PINOT_TABLE_NAME=flights" >> .env
```

---

### Issue 3: "Python process failed"

**Cause:** Python environment not activated or dependencies missing

**Solution:**
```powershell
# Terminal 1: Activate Python
cd d:\davinci_server\davinci-stream-processing
.\venv\Scripts\activate

# Verify packages
pip list | Select-String "shapely|folium|pandas"

# If missing, reinstall
pip install -r requirements.txt
```

---

### Issue 4: "Failed to start Python process"

**Cause:** Python not found in PATH or venv not activated

**Solution:**
1. Ensure Python terminal is still open with `(venv)` in prompt
2. Don't close the Python terminal while processing
3. If closed, reactivate before running batch processor

---

### Issue 5: Flight Processing Failed with "Pinot query timeout"

**Cause:** Pinot server slow or network issues

**Action:** 
- Failed flight remains in queue
- Will be retried on next run
- Check error in processing log:
```json
{
  "failed": [{
    "errorType": "pinot_fetch",
    "error": "Pinot fetch failed: Connection timeout"
  }]
}
```

---

## 🧪 Test Run Example

Here's a complete test run from start to finish:

### 1. Setup
```powershell
# Terminal 1: Python
cd d:\davinci_server\davinci-stream-processing
.\venv\Scripts\activate

# Terminal 2: Node.js
cd d:\davinci_server\node-js
```

### 2. Add Test Flights
```sql
-- Add 3 test flights
INSERT INTO "FlightProcessingQueue" ("flightId", "createdAt", "updatedAt")
VALUES 
  (2612937641, NOW(), NOW()),
  (2612937642, NOW(), NOW()),
  (2612937643, NOW(), NOW());
```

### 3. Run Processor
```bash
npm run process-batch
```

### 4. Verify Results
```sql
-- Check queue (should be empty if all succeeded)
SELECT COUNT(*) FROM "FlightProcessingQueue";

-- Check invoices created
SELECT COUNT(*) FROM "Invoice" 
WHERE "createdAt" >= CURRENT_DATE;

-- View invoice details
SELECT 
  "invoiceNumber",
  "flightId",
  "firName",
  "totalUsdAmount",
  "status"
FROM "Invoice"
WHERE "createdAt" >= CURRENT_DATE
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 5. Check Logs
```powershell
# View processing log
Get-ChildItem data\processing-logs\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content | ConvertFrom-Json
```

---

## 📊 Understanding Processing Time

**Typical Duration:**
- **1 flight**: ~10-15 seconds
- **10 flights (1 batch)**: ~2-3 minutes
- **100 flights (10 batches)**: ~25-30 minutes

**Breakdown per flight:**
- Pinot query: 1-3 seconds
- Python processing: 8-15 seconds
- Invoice creation: 1 second
- **Total**: ~10-20 seconds

**Factors affecting speed:**
- Pinot response time
- Number of FIR crossings (more = more invoices)
- Network latency
- Database performance

---

## 🎯 Production Best Practices

### 1. Run During Off-Peak Hours
- Less database load
- Faster Pinot queries
- Better for large batches

### 2. Monitor First Few Batches
- Watch for errors
- Verify invoices look correct
- Check processing logs

### 3. Handle Failed Flights
```sql
-- Check which flights failed (still in queue)
SELECT f.* 
FROM "FlightProcessingQueue" f
WHERE f."createdAt" < NOW() - INTERVAL '1 hour'
ORDER BY f."createdAt" ASC;
```

### 4. Clean Up Old Logs
```powershell
# Keep last 100 batch logs, delete older
Get-ChildItem data\processing-logs\*.json | 
  Sort-Object LastWriteTime -Descending | 
  Select-Object -Skip 100 | 
  Remove-Item
```

### 5. Archive HTML Maps
```powershell
# Move old maps to archive
$archiveDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
New-Item -ItemType Directory -Force -Path "d:\davinci_server\davinci-stream-processing\output_htmls\archive\$archiveDate"
Move-Item "d:\davinci_server\davinci-stream-processing\output_htmls\*.html" `
  -Destination "d:\davinci_server\davinci-stream-processing\output_htmls\archive\$archiveDate\"
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check processing logs** in `data/processing-logs/`
2. **Check error type**: `pinot_fetch`, `python_processing`, or `invoice_creation`
3. **Review Python terminal** for error messages
4. **Check Pinot accessibility**: `curl http://pinot-broker:8000/health`
5. **Verify database connection**: Run simple query
6. **Check environment variables**: `cat .env`

---

## ✅ Success Indicators

You know it's working when:
- ✅ Console shows flight processing progress
- ✅ Queue count decreases after each batch
- ✅ Invoice count increases
- ✅ Processing logs are created
- ✅ HTML maps appear in `output_htmls/`
- ✅ Batch summary shows successful flights

**Ready to process flights!** 🚀
