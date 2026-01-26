# Consolidated Invoice System - Usage Guide

## Overview

The Consolidated Invoice System automatically groups individual flight invoices into a single consolidated invoice per billing period (weekly or monthly) for customers who have this feature enabled.

---

## For Administrators

### Enabling Consolidated Billing for a Customer

1. **Update Customer Configuration:**

```sql
UPDATE ClientKYC SET
  billingPeriodEnabled = true,
  billingPeriodType = 'WEEKLY',  -- or 'MONTHLY'
  billingPeriodStartDay = 1,     -- See table below
  status = 'APPROVED'
WHERE customerId = 'OP-12345';
```

2. **Billing Period Start Day Values:**

**For WEEKLY billing:**
| Value | Day of Week |
|-------|-------------|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

**For MONTHLY billing:**
| Value | Description |
|-------|-------------|
| 1 | 1st of month |
| 15 | 15th of month |
| 28 | 28th of month (safe for all months) |

**Example: Weekly billing starting Monday**
```sql
billingPeriodType = 'WEEKLY'
billingPeriodStartDay = 1  -- Monday
```

**Example: Monthly billing starting 1st of month**
```sql
billingPeriodType = 'MONTHLY'
billingPeriodStartDay = 1  -- 1st
```

---

### Manual Generation

To manually generate a consolidated invoice for a specific customer and period:

```typescript
import { ConsolidatedInvoiceService } from './src/modules/invoices/services/ConsolidatedInvoiceService';

const service = new ConsolidatedInvoiceService();

// Generate for current period (auto-calculated)
const result = await service.generateConsolidatedInvoice(42);

// Generate for specific period
const result = await service.generateConsolidatedInvoice(
  42,                          // Customer ID
  new Date('2026-01-20'),     // Period start
  new Date('2026-01-26')      // Period end
);

if (result.success) {
  console.log('Invoice generated:', result.consolidatedInvoice);
} else {
  console.log('Error:', result.message || result.error);
}
```

---

### Checking System Status

```typescript
import { ConsolidatedInvoiceScheduler } from './src/modules/invoices/services/ConsolidatedInvoiceScheduler';

const scheduler = ConsolidatedInvoiceScheduler.getInstance();
const status = scheduler.getStatus();

console.log(status);
// Output:
// {
//   isRunning: true,
//   schedule: '0 1 * * *',
//   timezone: 'UTC',
//   lockTimeout: 60000
// }
```

---

### Manually Trigger Scheduler

```typescript
import { ConsolidatedInvoiceScheduler } from './src/modules/invoices/services/ConsolidatedInvoiceScheduler';

const scheduler = ConsolidatedInvoiceScheduler.getInstance();
await scheduler.triggerManually();
```

---

## How It Works

### Automatic Process

1. **Scheduler runs daily** at 1:00 AM UTC (configurable)
2. **For each customer** with `billingPeriodEnabled = true`:
   - Calculate their billing period based on type and start day
   - Check if today is the END of their billing period
   - If yes, generate consolidated invoice
   - If no, skip and check again next day
3. **Invoice generation**:
   - Find all unconsolidated invoices in the period
   - Calculate totals (flights, amounts, FIRs, countries)
   - Create consolidated invoice with line items
   - Mark individual invoices as consolidated
   - Update customer tracking fields

### Example Timeline - WEEKLY Billing

**Customer Configuration:**
- `billingPeriodType = 'WEEKLY'`
- `billingPeriodStartDay = 1` (Monday)
- `billingPeriodEnabled = true`

**Week of Jan 20-26, 2026:**

| Date | Event |
|------|-------|
| Mon Jan 20 | Period starts |
| Jan 20-25 | Customer flies 10 flights → 10 individual invoices created |
| Sun Jan 26 @ 1:00 AM | Scheduler runs |
| Sun Jan 26 @ 1:00 AM | Consolidated invoice `CONS-2026-W04-001` generated |
| Sun Jan 26 | Customer receives ONE invoice for all 10 flights |

**Next Week (Jan 27 - Feb 2):**
- Process repeats
- New consolidated invoice generated on Feb 2

---

### Example Timeline - MONTHLY Billing

**Customer Configuration:**
- `billingPeriodType = 'MONTHLY'`
- `billingPeriodStartDay = 1` (1st of month)
- `billingPeriodEnabled = true`

**January 2026:**

| Date | Event |
|------|-------|
| Jan 1 | Period starts |
| Jan 1-31 | Customer flies 50 flights → 50 individual invoices created |
| Jan 31 @ 1:00 AM | Scheduler runs |
| Jan 31 @ 1:00 AM | Consolidated invoice `CONS-2026-M01-001` generated |
| Jan 31 | Customer receives ONE invoice for all 50 flights |

**February 2026:**
- Process repeats
- New consolidated invoice generated on Feb 28

---

## Database Structure

### ConsolidatedInvoice Table

Each consolidated invoice contains:
- Invoice number (e.g., `CONS-2026-W04-001`)
- Billing period dates
- Customer information
- Totals (flights, amounts)
- Aggregated data (FIRs crossed, countries)
- Status (PENDING, PAID, OVERDUE, etc.)

### ConsolidatedInvoiceLineItem Table

Each line item represents one flight:
- Link to original invoice
- Flight details (ACT, date, time)
- Individual amount
- URL to view original invoice

### Invoice Table Updates

Individual invoices get marked:
- `includedInConsolidatedInvoiceId` → Set to consolidated invoice ID
- Prevents re-consolidation
- Maintains link to consolidated invoice

---

## Important Notes

### Edge Cases Handled

✅ **0 flights in period** → No invoice generated (not a $0 invoice)  
✅ **Period already consolidated** → Skipped automatically  
✅ **Cancelled invoices** → Excluded from consolidation  
✅ **Late-arriving invoices** → Included in next period  
✅ **Multi-instance deployment** → Distributed locking prevents duplicates  
✅ **Transaction failures** → Automatic rollback, no partial data  

### Customer Disables Billing

If a customer disables consolidated billing mid-period:
- Existing unconsolidated invoices: Included in final consolidated invoice (optional)
- Future flights: Receive individual invoices immediately

### Payment

- Consolidated invoices have their own payment tracking
- Status updates: `PENDING` → `PAID` or `OVERDUE`
- Payment applies to entire consolidated invoice, not individual flights

### Reporting

Query consolidated invoices:
```sql
-- All consolidated invoices for a customer
SELECT * FROM ConsolidatedInvoice
WHERE operatorId = 42
ORDER BY issueDate DESC;

-- Invoices in a specific period
SELECT * FROM ConsolidatedInvoice
WHERE operatorId = 42
  AND billingPeriodStart >= '2026-01-01'
  AND billingPeriodEnd <= '2026-12-31';

-- Line items (flights) in a consolidated invoice
SELECT * FROM ConsolidatedInvoiceLineItem
WHERE consolidatedInvoiceId = 500
ORDER BY date ASC;
```

---

## Troubleshooting

### Customer not getting consolidated invoices

**Check:**
1. `billingPeriodEnabled = true`
2. `status = 'APPROVED'`
3. `billingPeriodType` is set (WEEKLY or MONTHLY)
4. Customer has flights in the period
5. Check logs for errors

### Invoices generated at wrong time

**Check:**
1. `billingPeriodStartDay` is correct
2. Scheduler timezone setting
3. Customer timezone vs server timezone

### Duplicate invoices

**This should not happen** due to:
- Duplicate detection (`findExistingConsolidatedInvoice`)
- Distributed locking
- Transaction safety

If it occurs, check:
- Database constraints
- Lock timeout configuration
- Multiple scheduler instances running

---

## Support

For issues or questions:
1. Check application logs for detailed error messages
2. Review customer configuration in database
3. Verify scheduler is running
4. Check environment variables

Key log search terms:
- `"Consolidated invoice"`
- `"SCHEDULED JOB"`
- `"Period already consolidated"`
- `"No unconsolidated invoices found"`
