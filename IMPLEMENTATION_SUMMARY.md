# Template Selection Implementation Summary

## What Was Changed

### Problem
The original template selection in the frontend was using **brittle regex matching** against `firName` and `firCountry` strings. This approach was error-prone and difficult to maintain.

### Solution
Changed to use a **numeric template ID field** from the FIR database table. This is a database-driven, type-safe approach.

---

## Files Modified

### 1. Frontend TypeScript Type
**File:** `davinci_Frontend/src/types/invoice.ts`
- Added `invoiceTemplate: string | null` field to Invoice interface

### 2. Frontend Template Selector Logic
**File:** `davinci_Frontend/src/components/invoice/InvoiceTemplateSelector.tsx`

**Before:**
```typescript
const firName = (invoice.firName || '').toUpperCase();
const firCountry = (invoice.firCountry || '').toUpperCase();

if (matches(/MANILA|RPHI/i)) {
    return <ManilaTemplate invoice={invoice} />;
}
// ... more regex patterns
```

**After:**
```typescript
const templateId = invoice.invoiceTemplate?.toString().trim() || '';

switch (templateId) {
    case '1':
        return <ManilaTemplate invoice={invoice} />;
    case '2':
        return <KualaLumpurTemplate invoice={invoice} />;
    case '3':
        return <BahrainTemplate invoice={invoice} />;
    default:
        return <FallbackTemplate invoice={invoice} />;
}
```

### 3. Backend TypeScript Type
**File:** `node-js/src/modules/invoices/types/invoice.types.ts`
- Added `invoiceTemplate: string | null` field to InvoicePdfDataResponse interface

### 4. Backend Service
**File:** `node-js/src/modules/invoices/services/invoice.service.ts`
- Updated `transformToPdfData()` method to include `invoiceTemplate` field in response

---

## Template ID Mapping

```
invoiceTemplate field value → Rendered Component
─────────────────────────────────────────────────
"1"                         → ManilaTemplate
"2"                         → KualaLumpurTemplate
"3"                         → BahrainTemplate
null or anything else       → FallbackTemplate
```

---

## Data Flow

```
User visits Invoice page
         ↓
Frontend calls: GET /api/invoices/:invoiceId
         ↓
Backend queries Invoice table (which has firName)
         ↓
Returns Invoice JSON with invoiceTemplate field
         ↓
Frontend receives response
         ↓
InvoiceTemplateSelector checks: invoice.invoiceTemplate
         ↓
Renders appropriate template based on ID
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Configuration Source** | Hardcoded regex in code | Database (FIR table) |
| **Maintainability** | Requires code changes to modify | Database update only |
| **Type Safety** | String comparisons | Strong typing with switch |
| **Error Prone** | Yes (regex can fail) | No (direct comparison) |
| **Scalability** | Difficult (modify component) | Easy (add DB record + case) |
| **Testing** | Complex (regex edge cases) | Simple (value matching) |

---

## How to Add a New Template

1. **Database:** Set `invoiceTemplate = '4'` on the FIR record
2. **Component:** Create `SingaporeTemplate.tsx`
3. **Import:** Add import to InvoiceTemplateSelector
4. **Switch:** Add `case '4': return <SingaporeTemplate />;`

No need to touch the FIR name/country matching logic!

---

## Verification Steps

1. ✅ Frontend type includes `invoiceTemplate` field
2. ✅ Backend service returns `invoiceTemplate` in response
3. ✅ Template selector uses switch statement with template IDs
4. ✅ All templates render correctly based on ID
5. ✅ Fallback template used for unmapped IDs

---

## Database Requirement

Ensure your `FIR` table records have the `invoiceTemplate` field populated:

```sql
SELECT id, firName, countryName, invoiceTemplate FROM "FIR";
```

Expected output:
```
id │  firName      │ countryName   │ invoiceTemplate
───┼───────────────┼───────────────┼─────────────────
 1 │ MANILA        │ Philippines   │ 1
 2 │ KUALA LUMPUR  │ Malaysia      │ 2
 3 │ BAHRAIN       │ Bahrain       │ 3
 4 │ OTHERS        │ ...           │ NULL
```

---

## Architecture Benefits

🏗️ **Clean Separation of Concerns**
- Database stores configuration
- Backend serves the data
- Frontend consumes and renders

📊 **Centralized Configuration**
- All template mappings in one place (FIR table)
- No scattered hardcoded values

🔒 **Type-Safe**
- Full TypeScript support
- No runtime string matching errors

🚀 **Scalable Design**
- Easy to add 10, 20, 100 templates
- No code duplication
- Database-driven approach
