# Consolidated Invoice Generation System - Configuration Guide

## Environment Variables

Add these variables to your `.env` file to configure the consolidated invoice generation system:

```env
# ============================================
# Consolidated Invoice Generation Settings
# ============================================

# Enable/disable consolidated invoice generation (default: true)
CONSOLIDATION_ENABLED=true

# Cron schedule for consolidation job (default: daily at 1:00 AM UTC)
# Format: "minute hour day month dayOfWeek"
# Examples:
#   "0 1 * * *"     - Daily at 1:00 AM
#   "0 2 * * 0"     - Weekly on Sunday at 2:00 AM
#   "0 0 1 * *"     - Monthly on 1st at midnight
CONSOLIDATION_CRON_SCHEDULE="0 1 * * *"

# Distributed lock timeout in milliseconds (default: 60000 = 1 minute)
# Prevents duplicate runs in multi-instance deployments
CONSOLIDATION_LOCK_TIMEOUT_MS=60000

# Invoice number prefix (default: "CONS")
# Format: CONS-YYYY-WNN-XXX (Weekly) or CONS-YYYY-MNN-XXX (Monthly)
CONSOLIDATION_INVOICE_NUMBER_PREFIX="CONS"

# Payment terms in days (default: 30)
# Number of days until consolidated invoice is due
CONSOLIDATION_PAYMENT_TERMS_DAYS=30
```

## Default Values

If environment variables are not set, the system uses these defaults:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `CONSOLIDATION_ENABLED` | `true` | System is enabled by default |
| `CONSOLIDATION_CRON_SCHEDULE` | `"0 1 * * *"` | Runs daily at 1:00 AM UTC |
| `CONSOLIDATION_LOCK_TIMEOUT_MS` | `60000` | 1 minute lock timeout |
| `CONSOLIDATION_INVOICE_NUMBER_PREFIX` | `"CONS"` | Invoice number prefix |
| `CONSOLIDATION_PAYMENT_TERMS_DAYS` | `30` | 30 days payment terms |

## Cron Schedule Examples

```bash
# Every day at 1:00 AM UTC
CONSOLIDATION_CRON_SCHEDULE="0 1 * * *"

# Every day at 2:30 AM UTC
CONSOLIDATION_CRON_SCHEDULE="30 2 * * *"

# Every Sunday at midnight UTC
CONSOLIDATION_CRON_SCHEDULE="0 0 * * 0"

# Every Monday at 6:00 AM UTC
CONSOLIDATION_CRON_SCHEDULE="0 6 * * 1"

# First day of every month at midnight UTC
CONSOLIDATION_CRON_SCHEDULE="0 0 1 * *"

# Every 6 hours
CONSOLIDATION_CRON_SCHEDULE="0 */6 * * *"
```

## Production Recommendations

### For WEEKLY Billing Customers
- Run **daily** to check all customers
- Schedule: `"0 1 * * *"` (daily at 1 AM)
- Lock timeout: `60000` (1 minute should be sufficient)

### For MONTHLY Billing Customers
- Run **daily** to avoid missing month-end dates
- Schedule: `"0 1 * * *"` (daily at 1 AM)
- Lock timeout: `90000` (1.5 minutes for larger volumes)

### Multi-Instance Deployment
- Ensure `CONSOLIDATION_LOCK_TIMEOUT_MS` is set appropriately
- Default 60 seconds should handle most cases
- Increase if processing large volumes (1000+ customers)

### Monitoring
Enable detailed logging by ensuring your logger is configured for the `info` level.

## Disabling the System

To temporarily disable consolidated invoice generation:

```env
CONSOLIDATION_ENABLED=false
```

This will prevent the scheduler from starting, but won't affect existing data.

## Customer Configuration

Customers must have these fields configured in the `ClientKYC` table:

```sql
UPDATE ClientKYC SET
  billingPeriodEnabled = true,
  billingPeriodType = 'WEEKLY',  -- or 'MONTHLY'
  billingPeriodStartDay = 1,     -- 1 = Monday for WEEKLY, 1 = 1st for MONTHLY
  status = 'APPROVED'
WHERE id = <customer_id>;
```

## Testing

To test the scheduler manually:

1. **Check Status** (via logs or API if enabled):
   - Scheduler running: Check application logs for "Consolidated invoice scheduler started successfully"

2. **Manual Trigger** (requires code execution):
   ```typescript
   import { ConsolidatedInvoiceScheduler } from './src/modules/invoices/services/ConsolidatedInvoiceScheduler';
   
   const scheduler = ConsolidatedInvoiceScheduler.getInstance();
   await scheduler.triggerManually();
   ```

3. **Test with Specific Customer**:
   ```typescript
   import { ConsolidatedInvoiceService } from './src/modules/invoices/services/ConsolidatedInvoiceService';
   
   const service = new ConsolidatedInvoiceService();
   const result = await service.generateConsolidatedInvoice(
     42, // customer ID
     new Date('2026-01-20'), // period start (optional)
     new Date('2026-01-26')  // period end (optional)
   );
   console.log(result);
   ```

## Troubleshooting

### Scheduler not running
- Check: `CONSOLIDATION_ENABLED=true` in `.env`
- Check logs for startup errors
- Verify cron schedule is valid: Use online cron validator

### No invoices generated
- Check customer has `billingPeriodEnabled = true`
- Check customer `status = 'APPROVED'`
- Check there are unconsolidated invoices in the period
- Check logs for "No unconsolidated invoices found"

### Duplicate invoices
- Distributed lock should prevent this
- Check only one instance is running scheduler
- Verify `CONSOLIDATION_LOCK_TIMEOUT_MS` is set correctly

### Lock timeout errors
- Increase `CONSOLIDATION_LOCK_TIMEOUT_MS`
- Check database connection stability
- Verify no long-running queries blocking

## Log Messages

Key log messages to monitor:

**Success:**
```
✅ Consolidated invoice scheduler started successfully
Consolidated invoice generated successfully
SCHEDULED JOB COMPLETED SUCCESSFULLY
```

**Warnings:**
```
Period already consolidated - skipping
No unconsolidated invoices found for period
Skipped execution - another instance is already running
```

**Errors:**
```
Failed to generate consolidated invoice for customer
CRITICAL ERROR - Scheduled job failed
Transaction rolled back
```
