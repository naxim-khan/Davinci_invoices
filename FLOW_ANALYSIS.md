# Davinci System - Flow Analysis & Template Selection Update

## System Overview

The Davinci system is a flight invoice processing platform with three main components:

1. **Frontend** (`davinci_Frontend/`) - React TypeScript app for invoice viewing
2. **Backend** (`node-js/`) - Node.js/Express server for invoice management and data processing
3. **Stream Processing** (`davinci-stream-processing/`) - Python service for flight analysis and FIR detection

---

## End-to-End Flow

### 1. **Flight Data Processing (Python Backend)**
```
Flight Data → Flight Processing Service → FIR Detection → Fee Calculation → Invoice Generation
```

**Key Files:**
- `davinci-stream-processing/process_flight_with_visuals.py` - Main flight processor
- `davinci-stream-processing/analyse_flight.py` - FIR crossing analysis
- `davinci-stream-processing/detect_overflight.py` - FIR segment detection

**Process:**
1. Receives flight data with position coordinates
2. Loads FIR polygons from `combined_firs.geojson`
3. Detects which FIRs the flight crossed
4. Calculates fees based on FIR regulations
5. Generates HTML visualization maps
6. Sends data to backend for invoice creation

---

### 2. **Invoice Data Model (Backend - Node.js)**

**Database Schema (`node-js/prisma/schema.prisma`):**

#### **FIR Table**
```prisma
model FIR {
  id              Int      @id @default(autoincrement())
  firName         String   @unique        // e.g., "MANILA", "KUALA LUMPUR"
  countryName     String?                // e.g., "Philippines", "Malaysia"
  companyId       String?
  invoiceTemplate String?               // Template ID: "1", "2", "3", etc.
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  User            User[]
}
```

#### **Invoice Table**
```prisma
model Invoice {
  id                  Int           @id @default(autoincrement())
  invoiceNumber       String        @unique
  issueDate           DateTime
  dueDate             DateTime?
  status              InvoiceStatus @default(PENDING)
  clientName          String
  clientAddress       String?
  
  // Flight Information
  flightNumber        String?
  flightId            BigInt
  flightDate          DateTime?
  registrationNumber  String?
  aircraftModelName   String?
  
  // FIR Information
  firName             String?       // FK reference to FIR.firName
  firCountry          String?
  firEntryTimeUtc     DateTime?
  firExitTimeUtc      DateTime?
  
  // Fee Information
  feeAmount           Float?
  otherFeesAmount     Float?
  totalOriginalAmount Float?
  originalCurrency    String?
  fxRate              Float?
  totalUsdAmount      Float?
  
  // Presentation
  mapHtml             String?
  qrCodeData          String?
  logoKey             String?
  
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}
```

**Key Point:** The Invoice table stores `firName` which can be used to look up the corresponding FIR record and its `invoiceTemplate` field.

---

### 3. **Backend API Flow (Node.js Express)**

#### **Invoice Service** (`src/modules/invoices/services/invoice.service.ts`)

**Endpoint:** `GET /api/invoices/:invoiceId`

```typescript
// Flow:
1. InvoiceController.getPdfData() receives request
2. Calls InvoiceService.getPdfData(invoiceId)
3. InvoiceRepository.findById(invoiceId) queries database
4. transformToPdfData() converts Invoice entity to InvoicePdfDataResponse
5. Returns JSON response to frontend
```

**Database Query Result:**
```typescript
const invoice: Invoice = {
  id: 123,
  invoiceNumber: "INV-2024-001",
  firName: "MANILA",
  firCountry: "Philippines",
  invoiceTemplate: "1",           // ← NEW FIELD
  // ... other fields
}
```

**API Response:**
```json
{
  "id": 123,
  "invoiceNumber": "INV-2024-001",
  "firName": "MANILA",
  "firCountry": "Philippines",
  "invoiceTemplate": "1",
  // ... other fields
}
```

---

### 4. **Frontend Template Selection (React)**

**File:** `davinci_Frontend/src/components/invoice/InvoiceTemplateSelector.tsx`

#### **Old Logic (Name/Country Based)**
```typescript
// BEFORE - Brittle regex matching
const firName = (invoice.firName || '').toUpperCase();
const firCountry = (invoice.firCountry || '').toUpperCase();

if (matches(/MANILA|RPHI/i)) {
  return <ManilaTemplate invoice={invoice} />;
}
if (matches(/KUALA LUMPUR|WMFC/i)) {
  return <KualaLumpurTemplate invoice={invoice} />;
}
if (matches(/BAHRAIN|OBBB/i)) {
  return <BahrainTemplate invoice={invoice} />;
}
return <FallbackTemplate invoice={invoice} />;
```

**Problems:**
- ❌ Regex matching is fragile and error-prone
- ❌ Case-sensitive data could break matching
- ❌ Different naming conventions across systems (MANILA vs RPHI)
- ❌ No centralized configuration
- ❌ Requires code change to add new templates

#### **New Logic (Template ID Based)**
```typescript
// AFTER - Reliable numeric mapping
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

**Advantages:**
- ✅ Single source of truth (FIR table's `invoiceTemplate` field)
- ✅ Database-driven configuration
- ✅ No regex complexity
- ✅ Add new templates via database update (no code change)
- ✅ Type-safe mapping

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLIGHT PROCESSING (Python)                   │
├─────────────────────────────────────────────────────────────────┤
│ Flight Data → FIR Detection → Fee Calculation → HTML Visualization
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. InvoiceService receives flight data                         │
│  2. Creates Invoice record in database                          │
│     - Sets firName (from flight processing)                     │
│     - Stores all invoice details                                │
│                                                                 │
│  3. Later: GET /api/invoices/:id is called                      │
│     - Queries Invoice table                                     │
│     - Returns invoiceTemplate field (via FIR relationship)      │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TypeScript)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. invoiceService.fetchInvoiceById(invoiceId)                  │
│     - Calls /api/invoices/:id                                   │
│     - Receives Invoice with invoiceTemplate field               │
│                                                                 │
│  2. InvoiceTemplateSelector.tsx processes response              │
│     - Reads invoice.invoiceTemplate value                       │
│     - Switches on template ID:                                  │
│        • "1" → <ManilaTemplate />                               │
│        • "2" → <KualaLumpurTemplate />                          │
│        • "3" → <BahrainTemplate />                              │
│        • other → <FallbackTemplate />                           │
│                                                                 │
│  3. Selected template renders invoice                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Updated Files & Changes

### 1. **Frontend Type Definition**
**File:** `davinci_Frontend/src/types/invoice.ts`

**Change:**
```diff
  export interface Invoice {
      id: number;
      // ... other fields
      firName: string | null;
      firCountry: string | null;
+     invoiceTemplate: string | null;  // NEW FIELD
      firEntryTimeUtc: string | null;
      // ... rest of fields
  }
```

**Purpose:** TypeScript interface now includes the `invoiceTemplate` field returned from backend.

---

### 2. **Frontend Template Selector**
**File:** `davinci_Frontend/src/components/invoice/InvoiceTemplateSelector.tsx`

**Old Approach:**
- Pattern matching on `firName` and `firCountry` using regex
- Multiple error-prone string comparisons

**New Approach:**
```typescript
export function InvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
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
}
```

**Benefits:**
- Uses database-stored template ID
- Clear, maintainable switch statement
- No string manipulation or regex
- Easy to extend with new templates

---

### 3. **Backend Type Definition**
**File:** `node-js/src/modules/invoices/types/invoice.types.ts`

**Change:**
```diff
  export interface InvoicePdfDataResponse {
      id: number;
      // ... other fields
      firName: string | null;
      firCountry: string | null;
+     invoiceTemplate: string | null;  // FIR template ID
      firEntryTimeUtc: string | null;
      // ... rest of fields
  }
```

**Purpose:** TypeScript interface for API response now includes template field.

---

### 4. **Backend Service Implementation**
**File:** `node-js/src/modules/invoices/services/invoice.service.ts`

**Change:**
```diff
  private transformToPdfData(invoice: Invoice): InvoicePdfDataResponse {
      return {
          id: invoice.id,
          // ... other fields
          firName: invoice.firName ?? null,
          firCountry: invoice.firCountry ?? null,
+         invoiceTemplate: invoice.invoiceTemplate ?? null,
          firEntryTimeUtc: invoice.firEntryTimeUtc ? invoice.firEntryTimeUtc.toISOString() : null,
          // ... rest of fields
      };
  }
```

**Purpose:** Service now includes `invoiceTemplate` when transforming Invoice entity to response DTO.

---

## Template ID Mapping

| Template ID | FIR Name | Country | Template Component |
|---|---|---|---|
| `"1"` | MANILA | Philippines | `ManilaTemplate` |
| `"2"` | KUALA LUMPUR | Malaysia | `KualaLumpurTemplate` |
| `"3"` | BAHRAIN | Bahrain | `BahrainTemplate` |
| `null` or other | Any other FIR | Any country | `FallbackTemplate` |

---

## How to Add a New Template

### Step 1: Update FIR Configuration (Database)
```sql
UPDATE "FIR" 
SET "invoiceTemplate" = '4' 
WHERE "firName" = 'SINGAPORE' AND "countryName" = 'Singapore';
```

### Step 2: Create Template Component
```typescript
// File: davinci_Frontend/src/components/invoice/templates/SingaporeTemplate.tsx
export function SingaporeTemplate({ invoice }: { invoice: Invoice }) {
    // Implement template UI
    return <div>Singapore Invoice Template</div>;
}
```

### Step 3: Import in InvoiceTemplateSelector
```typescript
import { SingaporeTemplate } from './templates/SingaporeTemplate';
```

### Step 4: Add Case to Switch Statement
```typescript
case '4':
    return <SingaporeTemplate invoice={invoice} />;
```

**Done!** No need to modify the original FIR matching logic.

---

## Key Design Principles

1. **Single Source of Truth**: Template configuration lives in the FIR database table
2. **Type Safety**: Full TypeScript support across all layers
3. **Maintainability**: Database-driven approach eliminates code-based matching logic
4. **Scalability**: Add new templates without modifying core selection logic
5. **Reliability**: Numeric IDs are more reliable than string pattern matching

---

## Testing Checklist

- [ ] Fetch an invoice with `invoiceTemplate: "1"` → should render ManilaTemplate
- [ ] Fetch an invoice with `invoiceTemplate: "2"` → should render KualaLumpurTemplate
- [ ] Fetch an invoice with `invoiceTemplate: "3"` → should render BahrainTemplate
- [ ] Fetch an invoice with `invoiceTemplate: null` → should render FallbackTemplate
- [ ] Fetch an invoice with unknown template ID → should render FallbackTemplate
- [ ] Verify PDF generation uses correct template
- [ ] Check that FIR records have `invoiceTemplate` properly set

---

## Related Files

### Backend
- `node-js/prisma/schema.prisma` - Database schema (FIR and Invoice models)
- `node-js/services/InvoiceService.ts` - Legacy service (reference)
- `node-js/src/modules/invoices/controllers/invoice.controller.ts` - API endpoint handler
- `node-js/src/modules/invoices/repositories/invoice.repository.ts` - Database queries

### Frontend
- `davinci_Frontend/src/services/invoiceService.ts` - API client
- `davinci_Frontend/src/components/invoice/InvoiceViewer.tsx` - Main invoice display
- `davinci_Frontend/src/components/invoice/templates/` - Template components

### Processing
- `davinci-stream-processing/process_flight_with_visuals.py` - Flight processing
- `davinci-stream-processing/analyse_flight.py` - FIR analysis
