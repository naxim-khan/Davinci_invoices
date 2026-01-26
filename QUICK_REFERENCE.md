# Quick Reference - Template Selection Implementation

## What Changed?

### Before
```typescript
// InvoiceTemplateSelector.tsx - OLD
const firName = (invoice.firName || '').toUpperCase();
if (matches(/MANILA|RPHI/i)) {
    return <ManilaTemplate />;
}
// Brittle regex matching on FIR name/country
```

### After
```typescript
// InvoiceTemplateSelector.tsx - NEW
const templateId = invoice.invoiceTemplate?.toString().trim() || '';
switch (templateId) {
    case '1': return <ManilaTemplate />;
    case '2': return <KualaLumpurTemplate />;
    case '3': return <BahrainTemplate />;
    default: return <FallbackTemplate />;
}
// Clean, database-driven template selection
```

---

## Modified Files

| File | Change |
|------|--------|
| `davinci_Frontend/src/types/invoice.ts` | ✅ Added `invoiceTemplate: string \| null` |
| `davinci_Frontend/src/components/invoice/InvoiceTemplateSelector.tsx` | ✅ Changed to switch on template ID |
| `node-js/src/modules/invoices/types/invoice.types.ts` | ✅ Added `invoiceTemplate: string \| null` |
| `node-js/src/modules/invoices/services/invoice.service.ts` | ✅ Returns `invoiceTemplate` in response |

---

## Template ID Reference

```
Template ID → FIR → Country → Component
════════════════════════════════════════════
"1"       → MANILA → Philippines → ManilaTemplate
"2"       → KUALA LUMPUR → Malaysia → KualaLumpurTemplate
"3"       → BAHRAIN → Bahrain → BahrainTemplate
null      → (any) → (any) → FallbackTemplate
```

---

## Data Flow (Simplified)

```
1. User visits: /invoices/123

2. Frontend calls: GET /api/invoices/123

3. Backend returns:
   {
     "invoiceNumber": "INV-2024-001",
     "firName": "MANILA",
     "invoiceTemplate": "1",
     ...
   }

4. Frontend InvoiceTemplateSelector checks:
   templateId = "1"  →  <ManilaTemplate />

5. ManilaTemplate renders invoice with Manila branding
```

---

## Key Improvements

✅ **Database-driven** - No hardcoded values
✅ **Type-safe** - Full TypeScript support  
✅ **Maintainable** - Simple switch statement
✅ **Scalable** - Add templates via DB update
✅ **Reliable** - No regex errors

---

## How It Works

### Database Layer
```
FIR Table:
├─ id: 1
├─ firName: "MANILA"
├─ invoiceTemplate: "1"  ← Configuration
```

### API Response
```
GET /api/invoices/123
{
  "invoiceTemplate": "1",  ← Returned by backend
  ...
}
```

### Frontend Selection
```
invoice.invoiceTemplate = "1"
↓
switch("1") {
  case '1': return <ManilaTemplate />  ✓
}
```

---

## Adding a New Template

1. Set `invoiceTemplate = '4'` on FIR in database
2. Create `SingaporeTemplate.tsx` component
3. Import in `InvoiceTemplateSelector.tsx`
4. Add: `case '4': return <SingaporeTemplate />;`

**Done!** No regex changes needed.

---

## Testing

| Test | Expected Result |
|------|-----------------|
| Invoice with `invoiceTemplate: "1"` | Renders ManilaTemplate |
| Invoice with `invoiceTemplate: "2"` | Renders KualaLumpurTemplate |
| Invoice with `invoiceTemplate: "3"` | Renders BahrainTemplate |
| Invoice with `invoiceTemplate: null` | Renders FallbackTemplate |
| Invoice with unknown ID | Renders FallbackTemplate |

---

## Files to Review

### Frontend Changes
- `davinci_Frontend/src/types/invoice.ts` - Type definition
- `davinci_Frontend/src/components/invoice/InvoiceTemplateSelector.tsx` - Selection logic

### Backend Changes
- `node-js/src/modules/invoices/types/invoice.types.ts` - Response type
- `node-js/src/modules/invoices/services/invoice.service.ts` - Service returning field

### Database (No changes needed - field already exists)
- `node-js/prisma/schema.prisma` - FIR.invoiceTemplate field

---

## Deployment Checklist

- [ ] Ensure FIR records have `invoiceTemplate` populated
- [ ] Run backend build: `npm run build`
- [ ] Deploy backend
- [ ] Run frontend build: `npm run build`
- [ ] Deploy frontend
- [ ] Test with each template ID (1, 2, 3, null)
- [ ] Verify PDF generation uses correct template
- [ ] Monitor for any errors

---

## Support

**Issue:** Invoice shows FallbackTemplate instead of expected template
**Solution:** Check FIR record has correct `invoiceTemplate` value

**Issue:** API returns error about missing field
**Solution:** Ensure backend service is updated and redeployed

**Issue:** TypeScript error about invoiceTemplate
**Solution:** Verify frontend type definition is updated

---

## Code References

### Fetch Invoice (Frontend Service)
```typescript
const invoice = await fetchInvoiceById(id);
// Returns: { invoiceTemplate: "1", ... }
```

### Select Template (Frontend Component)
```typescript
const templateId = invoice.invoiceTemplate?.toString().trim() || '';
// Use in switch statement
```

### Return from Backend (Service)
```typescript
return {
  invoiceTemplate: invoice.invoiceTemplate ?? null,
  // ... other fields
}
```

---

## Architecture Overview

```
User Request
    ↓
Frontend Service
    ↓
Backend API (/api/invoices/:id)
    ↓
Prisma (PostgreSQL)
    ↓
Invoice Record (with invoiceTemplate)
    ↓
JSON Response
    ↓
InvoiceTemplateSelector
    ↓
switch(templateId) {
  case '1': ManilaTemplate
  case '2': KualaLumpurTemplate
  case '3': BahrainTemplate
  default: FallbackTemplate
}
    ↓
Rendered Invoice
```

---

**Status:** ✅ Implementation Complete
**Date:** January 22, 2026
**Modified Files:** 4
**Breaking Changes:** None
**Migration Required:** No (field already exists in schema)
