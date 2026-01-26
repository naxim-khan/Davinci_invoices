# Consolidated Invoice Generation System

## 🎯 Overview

This system automatically generates consolidated invoices for customers on a **WEEKLY** or **MONTHLY** billing cycle. Instead of receiving individual invoices for each flight, customers receive one consolidated invoice per billing period.

## 📁 Files Created

### **Core Business Logic**
| File | Purpose |
|------|---------|
| `src/modules/invoices/types/billing-period.types.ts` | TypeScript type definitions |
| `src/modules/invoices/utils/BillingPeriodCalculator.ts` | Calculate billing periods (WEEKLY/MONTHLY) |
| `src/modules/invoices/utils/ConsolidatedInvoiceNumberGenerator.ts` | Generate unique invoice numbers |
| `src/modules/invoices/repositories/ConsolidatedInvoiceRepository.ts` | Database operations |
| `src/modules/invoices/services/ConsolidatedInvoiceService.ts` | Business logic |
| `src/modules/invoices/services/ConsolidatedInvoiceScheduler.ts` | Automated scheduler |

### **API Layer** (Created but not integrated yet)
| File | Purpose |
|------|---------|
| `src/modules/invoices/controllers/consolidated-invoice.controller.ts` | HTTP request handlers |
| `src/modules/invoices/routes/consolidated-invoice.route.ts` | API route definitions |

### **Integration**
| File | Purpose |
|------|---------|
| `src/core/schedulers.ts` | Initialize all schedulers |

### **Documentation**
| File | Purpose |
|------|---------|
| `docs/CONSOLIDATED_INVOICE_CONFIG.md` | Environment variable configuration guide |
| `docs/CONSOLIDATED_INVOICE_USAGE.md` | Administrator usage guide |
| `docs/INTEGRATION_GUIDE.md` | Step-by-step integration instructions |
| `.env.consolidation.example` | Example environment variables |

---

## 🚀 Quick Start

### 1. Add Environment Variables

Add to your `.env` (or copy from `.env.consolidation.example`):

```env
CONSOLIDATION_ENABLED=true
CONSOLIDATION_CRON_SCHEDULE="0 1 * * *"
CONSOLIDATION_LOCK_TIMEOUT_MS=60000
CONSOLIDATION_INVOICE_NUMBER_PREFIX="CONS"
CONSOLIDATION_PAYMENT_TERMS_DAYS=30
```

### 2. Initialize the Scheduler

Add to `src/index.ts` after line 136:

```typescript
import { ConsolidatedInvoiceScheduler } from './modules/invoices/services/ConsolidatedInvoiceScheduler';

// In app.listen callback (after InvoiceOverdueScheduler.start())
const consolidationEnabled = process.env.CONSOLIDATION_ENABLED !== 'false';
if (consolidationEnabled) {
    ConsolidatedInvoiceScheduler.getInstance().start();
    logger.info('Consolidated invoice scheduler initialized');
}

// In shutdown function (after InvoiceOverdueScheduler.stop())
ConsolidatedInvoiceScheduler.getInstance().stop();
```

### 3. Enable for a Customer

```sql
UPDATE "ClientKYC" SET
  "billingPeriodEnabled" = true,
  "billingPeriodType" = 'WEEKLY',  -- or 'MONTHLY'
  "billingPeriodStartDay" = 1,     -- 1=Monday (WEEKLY) or 1st (MONTHLY)
  "status" = 'APPROVED'
WHERE id = <customer_id>;
```

### 4. Restart Application

The scheduler will automatically start and run according to the cron schedule (default: daily at 1:00 AM UTC).

---

## 📊 How It Works

### Automatic Process (Daily Scheduler)

```
1:00 AM UTC - Scheduler runs daily
     ↓
For each customer with billingPeriodEnabled = true:
     ├─ Calculate their billing period (WEEKLY or MONTHLY)
     ├─ Is today the END of their period? 
     │   ├─ YES → Generate consolidated invoice
     │   └─ NO  → Skip, check again tomorrow
     ↓
Generate consolidated invoice:
     ├─ Find all unconsolidated invoices in period
     ├─ Calculate totals (flights, amounts, FIRs, countries)
     ├─ Create ConsolidatedInvoice record
     ├─ Create ConsolidatedInvoiceLineItem for each flight
     ├─ Mark individual invoices as consolidated
     └─ Update customer tracking fields
```

### Example: WEEKLY Billing (Monday-Sunday)

**Customer Config:** `billingPeriodType='WEEKLY'`, `billingPeriodStartDay=1` (Monday)

| Date | Event |
|------|-------|
| Mon Jan 20 | Period starts |
| Jan 20-25 | 10 flights → 10 individual invoices created |
| Sun Jan 26 @ 1 AM | **Scheduler runs** |
| Sun Jan 26 @ 1 AM | **Consolidated invoice generated:** `CONS-2026-W04-001` |
| Sun Jan 26 | Customer receives **ONE invoice** for all 10 flights |

### Example: MONTHLY Billing (1st-31st)

**Customer Config:** `billingPeriodType='MONTHLY'`, `billingPeriodStartDay=1` (1st)

| Date | Event |
|------|-------|
| Jan 1 | Period starts |
| Jan 1-31 | 50 flights → 50 individual invoices created |
| Jan 31 @ 1 AM | **Scheduler runs** |
| Jan 31 @ 1 AM | **Consolidated invoice generated:** `CONS-2026-M01-001` |
| Jan 31 | Customer receives **ONE invoice** for all 50 flights |

---

## 🛡️ Edge Cases Handled

✅ **0 flights in period** → No invoice generated  
✅ **Period already consolidated** → Skipped automatically  
✅ **Cancelled invoices** → Excluded from consolidation  
✅ **Late-arriving invoices** → Included in next period  
✅ **Multi-instance deployment** → Distributed locking prevents duplicates  
✅ **Transaction failures** → Automatic rollback (no partial data)  
✅ **Month boundaries** → Weeks can span months correctly  
✅ **Leap years** → February handled automatically  
✅ **Variable month lengths** → 28-31 days handled correctly  

---

## 📋 Database Tables Used

### Existing Tables (No Changes)

**`ClientKYC`** - Customer configuration
- `billingPeriodEnabled` - Enable/disable consolidated billing
- `billingPeriodType` - WEEKLY or MONTHLY
- `billingPeriodStartDay` - Which day to start billing period
- `lastConsolidatedInvoiceGeneratedAt` - Timestamp tracking
- `lastBillingPeriodEnd` - Last period end date

**`Invoice`** - Individual flight invoices
- `includedInConsolidatedInvoiceId` - Links to consolidated invoice

**`ConsolidatedInvoice`** - Master consolidated invoices
- All totals and aggregated data

**`ConsolidatedInvoiceLineItem`** - Individual flight line items
- Links back to original invoices

---

## 🧪 Manual Testing

### Generate Consolidated Invoice Manually

```typescript
import { ConsolidatedInvoiceService } from './src/modules/invoices/services/ConsolidatedInvoiceService';

const service = new ConsolidatedInvoiceService();

// Auto-calculate current period
const result = await service.generateConsolidatedInvoice(42); // customer ID

// Specific period
const result = await service.generateConsolidatedInvoice(
  42,
  new Date('2026-01-20'),
  new Date('2026-01-26')
);

console.log(result);
```

### Trigger Scheduler Manually

```typescript
import { ConsolidatedInvoiceScheduler } from './src/modules/invoices/services/ConsolidatedInvoiceScheduler';

const scheduler = ConsolidatedInvoiceScheduler.getInstance();
await scheduler.triggerManually();
```

### Check Scheduler Status

```typescript
import { ConsolidatedInvoiceScheduler } from './src/modules/invoices/services/ConsolidatedInvoiceScheduler';

const scheduler = ConsolidatedInvoiceScheduler.getInstance();
const status = scheduler.getStatus();
console.log(status);
// { isRunning: true, schedule: '0 1 * * *', timezone: 'UTC', lockTimeout: 60000 }
```

---

## 📝 Logs to Monitor

### Success Messages
```
✅ Consolidated Invoice Scheduler started
Consolidated invoice generated successfully
SCHEDULED JOB COMPLETED SUCCESSFULLY
```

### Info Messages
```
No unconsolidated invoices found for period - skipping
Period already consolidated - skipping
Not period end for customer - skipping
```

### Error Messages
```
Failed to generate consolidated invoice for customer
CRITICAL ERROR - Scheduled job failed
Transaction rolled back
```

---

## 📚 Full Documentation

- **[CONSOLIDATED_INVOICE_CONFIG.md](./docs/CONSOLIDATED_INVOICE_CONFIG.md)** - Complete environment configuration guide
- **[CONSOLIDATED_INVOICE_USAGE.md](./docs/CONSOLIDATED_INVOICE_USAGE.md)** - Administrator usage guide with examples
- **[INTEGRATION_GUIDE.md](./docs/INTEGRATION_GUIDE.md)** - Step-by-step integration instructions

---

## ⚙️ Architecture Summary

### Single Scheduler for Both Types
- Runs **daily** at configurable time (default: 1 AM UTC)
- Checks **each customer individually**: "Is today YOUR period end?"
- No separate weekly/monthly schedulers needed
- Handles different customer periods automatically

### Transaction Safety
All database operations wrapped in transactions:
```typescript
await prisma.$transaction(async (tx) => {
  // Create consolidated invoice
  // Create line items
  // Update individual invoices
  // Update customer tracking
  // If ANY step fails → ENTIRE transaction rolls back
});
```

### Distributed Locking
Multi-instance safe via distributed locks:
```typescript
withLock('consolidated-invoice-generation-job', async () => {
  // Only ONE instance can run this at a time
  // Other instances skip gracefully
}, timeout);
```

---

## 🔌 API Routes (Created but Not Integrated)

These routes are created but need to be mounted in your main app:

```typescript
import consolidatedInvoiceRouter from './modules/invoices/routes/consolidated-invoice.route';

// Add to your Express app
app.use('/api/invoices/consolidated', consolidatedInvoiceRouter);
```

**Available endpoints:**
- `GET /api/invoices/consolidated` - List consolidated invoices
- `GET /api/invoices/consolidated/:id` - Get single invoice
- `POST /api/invoices/consolidated/generate` - Manual generation
- `GET /api/invoices/consolidated/scheduler/status` - Scheduler status
- `POST /api/invoices/consolidated/scheduler/trigger` - Manual trigger

---

## ✅ Status

**Core Implementation:** ✅ Complete  
**Scheduler:** ✅ Complete  
**Documentation:** ✅ Complete  
**API Routes:** ✅ Created (not integrated)  
**Testing:** ⏳ Pending  

---

## 🎓 Next Steps

1. **Add environment variables** to `.env`
2. **Initialize scheduler** in `src/index.ts`
3. **Enable for test customer** in database
4. **Restart application** and monitor logs
5. **Test manually** with ConsolidatedInvoiceService
6. **(Optional)** Integrate API routes
7. **Monitor production** logs after deployment

---

## 🆘 Support

Check the detailed documentation:
- Configuration issues → `CONSOLIDATED_INVOICE_CONFIG.md`
- Usage questions → `CONSOLIDATED_INVOICE_USAGE.md`
- Integration help → `INTEGRATION_GUIDE.md`

Monitor application logs for detailed error messages and execution traces.
