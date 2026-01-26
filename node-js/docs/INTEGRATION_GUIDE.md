# Integration Guide - Consolidated Invoice Scheduler

## Step 1: Add Environment Variables

Add these variables to your `.env` file:

```env
# Consolidated Invoice Generation
CONSOLIDATION_ENABLED=true
CONSOLIDATION_CRON_SCHEDULE="0 1 * * *"
CONSOLIDATION_LOCK_TIMEOUT_MS=60000
CONSOLIDATION_INVOICE_NUMBER_PREFIX="CONS"
CONSOLIDATION_PAYMENT_TERMS_DAYS=30
```

## Step 2: Initialize the Scheduler

### Option A: Add to Existing index.ts (Recommended)

Add this import at the top of `src/index.ts`:

```typescript
import { ConsolidatedInvoiceScheduler } from './modules/invoices/services/ConsolidatedInvoiceScheduler';
```

Add this code after line 136 (after the InvoiceOverdueScheduler start):

```typescript
// Start consolidated invoice scheduler
const consolidationEnabled = process.env.CONSOLIDATION_ENABLED !== 'false';
if (consolidationEnabled) {
    ConsolidatedInvoiceScheduler.getInstance().start();
    logger.info('Consolidated invoice scheduler initialized');
} else {
    logger.info('Consolidated invoice scheduler is disabled');
}
```

Add this code in the shutdown function (after line 146):

```typescript
// Stop consolidated invoice scheduler
ConsolidatedInvoiceScheduler.getInstance().stop();
```

### Option B: Use the Schedulers Module

Replace lines 136-146 in `src/index.ts` with:

```typescript
import { initializeSchedulers, stopScheduler} from './core/schedulers';

// In the app.listen callback:
initializeSchedulers();

// In the shutdown function:
stopSchedulers();
```

## Step 3: Configure Customer for Consolidated Billing

In your database, update a customer to enable consolidated billing:

```sql
UPDATE "ClientKYC" SET
  "billingPeriodEnabled" = true,
  "billingPeriodType" = 'WEEKLY',  -- or 'MONTHLY'
  "billingPeriodStartDay" = 1,     -- 1=Monday for WEEKLY, 1=1st for MONTHLY
  "status" = 'APPROVED'
WHERE id = <customer_id>;
```

## Step 4: Test the Setup

### Check Scheduler Status

View application logs for:
```
✅ Consolidated Invoice Scheduler started
```

### Manual Test

Create a test script `test-consolidation.ts`:

```typescript
import { ConsolidatedInvoiceService } from './src/modules/invoices/services/ConsolidatedInvoiceService';

async function test() {
  const service = new ConsolidatedInvoiceService();
  
  // Test with a customer that has billing enabled
  const result = await service.generateConsolidatedInvoice(
    1, // Replace with actual customer ID
    new Date('2026-01-20'),
    new Date('2026-01-26')
  );
  
  console.log(result);
}

test().catch(console.error);
```

Run:
```bash
npx tsx test-consolidation.ts
```

## Step 5: Verify in Database

Check that data was created:

```sql
-- View consolidated invoices
SELECT * FROM "ConsolidatedInvoice" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- View line items for a consolidated invoice
SELECT * FROM "ConsolidatedInvoiceLineItem" 
WHERE "consolidatedInvoiceId" = <id>
ORDER BY date ASC;

-- Check which individual invoices are consolidated
SELECT * FROM "Invoice" 
WHERE "includedInConsolidatedInvoiceId" IS NOT NULL
LIMIT 10;
```

## Step 6: Monitor Logs

Key messages to watch for:

✅ **Success:**
- `Consolidated invoice scheduler started successfully`
- `Consolidated invoice generated successfully`
- `SCHEDULED JOB COMPLETED SUCCESSFULLY`

⚠️ **Info:**
- `No unconsolidated invoices found for period`
- `Period already consolidated - skipping`
- `Not period end for customer - skipping`

❌ **Errors:**
- `Failed to generate consolidated invoice`
- `CRITICAL ERROR - Scheduled job failed`

## Troubleshooting

### Scheduler doesn't start
- Check `CONSOLIDATION_ENABLED=true` in `.env`
- Check logs for initialization errors
- Verify cron expression is valid

### No invoices generated
1. Check customer configuration in database
2. Check customer has unconsolidated invoices in period
3. Check today is actually the period end day
4. Review logs for skip messages

### Want to disable temporarily
Set in `.env`:
```env
CONSOLIDATION_ENABLED=false
```

Then restart the application.

## Complete Integration Code

Here's the complete code to add to `src/index.ts`:

```typescript
// Add import at top (around line 15)
import { ConsolidatedInvoiceScheduler } from './modules/invoices/services/ConsolidatedInvoiceScheduler';

// Add after line 136 (in app.listen callback)
// Start invoice overdue scheduler (runs every hour)
InvoiceOverdueScheduler.getInstance().start();
logger.info('Invoice overdue scheduler initialized');

// Start consolidated invoice scheduler (NEW)
const consolidationEnabled = process.env.CONSOLIDATION_ENABLED !== 'false';
if (consolidationEnabled) {
    ConsolidatedInvoiceScheduler.getInstance().start();
    logger.info('Consolidated invoice scheduler initialized');
}

// Update shutdown function (around line 145-146)
const shutdown = async (): Promise<void> => {
    logger.info('[SHUTDOWN] Signal received, shutting down gracefully...');

    // Stop background services
    await FlightDataIngestionService.getInstance().stop();
    InvoiceOverdueScheduler.getInstance().stop();
    ConsolidatedInvoiceScheduler.getInstance().stop(); // NEW

    await prisma.$disconnect();
    process.exit(0);
};
```

That's it! The system is now ready to automatically generate consolidated invoices.
