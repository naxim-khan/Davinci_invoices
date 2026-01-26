# Complete System Architecture - Davinci Platform

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAVINCI PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │  PYTHON BACKEND      │  │   NODE.JS BACKEND    │  │  REACT FRONTEND  │ │
│  │  Stream Processing   │  │  API & Database      │  │  Invoice Display │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. PYTHON BACKEND - Flight Processing (`davinci-stream-processing/`)

### Purpose
Processes flight data, detects FIR crossings, calculates fees, generates visualizations.

### Key Components

#### Input Data
```json
{
  "flightId": 2733035234,
  "positions": [
    {"lat": 22.3193, "lon": 114.2089, "alt": 35000, "ts": 1704211200},
    {"lat": 22.5432, "lon": 114.5678, "alt": 34000, "ts": 1704211260},
    ...
  ],
  "acr": "B-2888",
  "registration": "B-2888",
  "aircraft_type": "A330"
}
```

#### Main Processors
| File | Purpose |
|------|---------|
| `process_flight_with_visuals.py` | Entry point for flight processing |
| `analyse_flight.py` | Analyzes flight path and FIR crossings |
| `detect_overflight.py` | Detects exact FIR boundary crossings |
| `calculate_fees.py` | Calculates overflight fees |
| `visualise_flight.py` | Generates HTML maps |

#### Processing Flow
```
1. Load FIR polygons from combined_firs.geojson
2. For each flight:
   a. Interpolate positions
   b. Check which FIRs are crossed
   c. Calculate entry/exit times
   d. Determine MTOW from aircraft data
   e. Calculate fees per FIR
   f. Generate HTML visualization
3. Output to node.js backend
```

#### Output Data
```json
{
  "flight_id": 2733035234,
  "fir_transits": {
    "MANILA": {
      "fir_name": "MANILA",
      "country": "Philippines",
      "entry_time": "2024-01-01T10:30:00Z",
      "exit_time": "2024-01-01T11:45:00Z",
      "distance_in_fir_nm": 250,
      "time_in_fir_minutes": 75,
      "fee_amount": 1500,
      "fee_currency": "USD"
    }
  },
  "flight_path_data": {...},
  "visualization_html": "..."
}
```

---

## 2. NODE.JS BACKEND - API & Database (`node-js/`)

### Purpose
Manages invoices, provides REST API, handles database operations, integrates with external services.

### Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL DATABASE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐        ┌──────────────────────┐            │
│  │      FIR       │        │      INVOICE         │            │
│  ├────────────────┤        ├──────────────────────┤            │
│  │ id (PK)        │◄───┐   │ id (PK)              │            │
│  │ firName (UK)   │    │   │ invoiceNumber (UK)   │            │
│  │ countryName    │    │   │ firName (FK→FIR)     │            │
│  │ invoiceTemplate│    │   │ firCountry           │            │
│  │ accNo          │    │   │ clientName           │            │
│  │ companyId      │    └───│ issueDate            │            │
│  │ isActive       │        │ dueDate              │            │
│  │ createdAt      │        │ status               │            │
│  │ updatedAt      │        │ totalUsdAmount       │            │
│  │                │        │ flightId (BigInt)    │            │
│  └────────────────┘        │ mapHtml              │            │
│                            │ qrCodeData           │            │
│                            │ logoKey              │            │
│                            │ ...20+ fields        │            │
│                            │ createdAt            │            │
│                            │ updatedAt            │            │
│                            └──────────────────────┘            │
│                                                                 │
│  ┌────────────────┐        ┌──────────────────────┐            │
│  │  CLIENT_KYC    │        │   INVOICE_ERROR      │            │
│  ├────────────────┤        ├──────────────────────┤            │
│  │ id (PK)        │        │ id (PK)              │            │
│  │ customerId(UK) │        │ invoiceNumber (UK)   │            │
│  │ businessName   │        │ status               │            │
│  │ contactEmail   │        │ errorStatus          │            │
│  │ contactPhone   │        │ errorMessage         │            │
│  │ address        │        │ ...same as Invoice   │            │
│  │ bankDetails    │        │                      │            │
│  │ status         │        │ ...                  │            │
│  └────────────────┘        └──────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Tables

#### FIR (Flight Information Region)
```typescript
{
  id: 1,
  firName: "MANILA",                    // Primary key for lookup
  countryName: "Philippines",
  invoiceTemplate: "1",                 // ← Template ID for frontend
  accNo: "RP",
  companyId: "RPHI",
  isActive: true
}
```

#### Invoice
```typescript
{
  id: 123,
  invoiceNumber: "INV-2024-001",
  
  // Flight Info
  flightId: 2733035234n,
  flightNumber: "CX6203",
  flightDate: "2024-01-03T00:00:00Z",
  registrationNumber: "B-2888",
  aircraftModelName: "A330",
  
  // FIR Info - Denormalized for performance
  firName: "MANILA",                    // ← Used to identify FIR
  firCountry: "Philippines",
  invoiceTemplate: "1",                 // ← Retrieved when fetching invoice
  firEntryTimeUtc: "2024-01-03T10:30:00Z",
  firExitTimeUtc: "2024-01-03T11:45:00Z",
  
  // Financial Info
  feeAmount: 1500.00,
  otherFeesAmount: 150.00,
  totalOriginalAmount: 1650.00,
  originalCurrency: "USD",
  fxRate: 1.0,
  totalUsdAmount: 1650.00,
  
  // Presentation
  mapHtml: "<html>...</html>",
  qrCodeData: "INV-2024-001|...",
  logoKey: "manila_logo.png",
  
  // Metadata
  clientName: "Air China",
  clientAddress: "Beijing, China",
  status: "PENDING",
  issueDate: "2024-01-04T00:00:00Z",
  dueDate: "2024-02-03T00:00:00Z",
  createdAt: "2024-01-04T10:30:00Z",
  updatedAt: "2024-01-04T10:30:00Z"
}
```

### API Endpoints

#### Get Invoice for Display/PDF
```
GET /api/invoices/:invoiceId

Response:
{
  "id": 123,
  "invoiceNumber": "INV-2024-001",
  "firName": "MANILA",
  "firCountry": "Philippines",
  "invoiceTemplate": "1",          // ← Used by frontend for template selection
  "totalUsdAmount": 1650.00,
  "mapHtml": "<html>...",
  "qrCodeData": "INV-2024-001|...",
  ... 35 total fields
}
```

#### Download PDF
```
GET /api/invoices/:invoiceId/pdf

Returns: Binary PDF file
```

### Service Architecture

```
InvoiceController (HTTP Layer)
         ↓
InvoiceService (Business Logic)
         ↓
InvoiceRepository (Data Access)
         ↓
Prisma Client (ORM)
         ↓
PostgreSQL Database
```

### Backend Folder Structure
```
node-js/
├── src/
│   ├── core/
│   │   ├── app.ts (Express app setup)
│   │   ├── server.ts (Server startup)
│   │   └── container/ (Dependency injection)
│   ├── modules/
│   │   └── invoices/
│   │       ├── controllers/
│   │       │   └── invoice.controller.ts
│   │       ├── services/
│   │       │   ├── invoice.service.ts (✅ UPDATED)
│   │       │   └── pdf.service.ts
│   │       ├── repositories/
│   │       │   └── invoice.repository.ts
│   │       ├── types/
│   │       │   └── invoice.types.ts (✅ UPDATED)
│   │       ├── schemas/
│   │       │   └── invoice.schema.ts (Zod validation)
│   │       ├── errors/
│   │       │   └── invoice.errors.ts
│   │       ├── routes/
│   │       │   └── invoice.routes.ts
│   │       └── templates/ (PDF templates)
│   └── common/
│       ├── utils/
│       │   ├── logger.util.ts
│       │   └── error.util.ts
│       └── middleware/
├── prisma/
│   └── schema.prisma (✅ FIR model has invoiceTemplate)
├── client.ts (Prisma client)
└── config.ts (Configuration)
```

---

## 3. REACT FRONTEND - Invoice Display (`davinci_Frontend/`)

### Purpose
Display invoices with region-specific templates, enable PDF download, show flight data visualizations.

### Data Flow

```
User navigates to /invoices/:invoiceId
         ↓
InvoiceViewer component mounts
         ↓
useEffect → invoiceService.fetchInvoiceById(invoiceId)
         ↓
HTTP GET /api/invoices/:invoiceId
         ↓
Backend returns Invoice JSON
         ↓
InvoiceViewer receives response
         ↓
Passes invoice to InvoiceTemplateSelector
         ↓
InvoiceTemplateSelector checks invoice.invoiceTemplate:
         ├─ "1" → <ManilaTemplate />
         ├─ "2" → <KualaLumpurTemplate />
         ├─ "3" → <BahrainTemplate />
         └─ other → <FallbackTemplate />
         ↓
Selected template renders invoice
         ↓
User sees formatted invoice with correct branding/layout
```

### Component Hierarchy

```
App.tsx
├── InvoiceViewer.tsx (Main container)
│   ├── InvoiceHeader.tsx
│   ├── InvoiceTemplateSelector.tsx (✅ UPDATED LOGIC)
│   │   ├── ManilaTemplate.tsx
│   │   ├── KualaLumpurTemplate.tsx
│   │   ├── BahrainTemplate.tsx
│   │   └── FallbackTemplate.tsx
│   ├── InvoiceDetails.tsx
│   ├── FlightInfoSection.tsx
│   ├── FirInfoSection.tsx
│   ├── FeesBreakdownSection.tsx
│   ├── MapSection.tsx (displays mapHtml)
│   ├── DownloadPdfButton.tsx
│   └── InvoiceFooter.tsx
```

### Updated Template Selection Logic

**File:** `src/components/invoice/InvoiceTemplateSelector.tsx`

```typescript
import type { Invoice } from '../../types/invoice';
import { FallbackTemplate } from './templates/FallbackTemplate';
import { ManilaTemplate } from './templates/ManilaTemplate';
import { KualaLumpurTemplate } from './templates/KualaLumpurTemplate';
import { BahrainTemplate } from './templates/BahrainTemplate';

export function InvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
    // NEW: Use numeric template ID instead of string matching
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

### Frontend Type Definition

**File:** `src/types/invoice.ts`

```typescript
export interface Invoice {
    id: number;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string | null;
    
    // Flight Info
    flightNumber: string | null;
    registrationNumber: string | null;
    aircraftModelName: string | null;
    flightDate: string | null;
    
    // FIR Info
    firName: string | null;
    firCountry: string | null;
    invoiceTemplate: string | null;    // ← NEW FIELD
    firEntryTimeUtc: string | null;
    firExitTimeUtc: string | null;
    
    // Financial Info
    feeAmount: number;
    totalUsdAmount: number;
    
    // Presentation
    mapHtml: string | null;
    qrCodeData: string | null;
    logoKey: string | null;
    
    // ... 10+ more fields
}
```

### Service Layer

**File:** `src/services/invoiceService.ts`

```typescript
export const fetchInvoiceById = async (invoiceId: string): Promise<Invoice> => {
    const response = await fetch(`/api/invoices/${invoiceId}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invoice');
    }

    return response.json();
};
```

### Frontend Folder Structure
```
davinci_Frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/
│   │   └── invoice.ts (✅ UPDATED)
│   ├── services/
│   │   └── invoiceService.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── ...
│   │   ├── invoice/
│   │   │   ├── InvoiceViewer.tsx
│   │   │   ├── InvoiceTemplateSelector.tsx (✅ UPDATED)
│   │   │   ├── InvoiceHeader.tsx
│   │   │   ├── InvoiceDetails.tsx
│   │   │   ├── FlightInfoSection.tsx
│   │   │   ├── FirInfoSection.tsx
│   │   │   ├── FeesBreakdownSection.tsx
│   │   │   ├── MapSection.tsx
│   │   │   ├── DownloadPdfButton.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── templates/
│   │   │       ├── ManilaTemplate.tsx
│   │   │       ├── KualaLumpurTemplate.tsx
│   │   │       ├── BahrainTemplate.tsx
│   │   │       └── FallbackTemplate.tsx
│   ├── utils/
│   │   └── formatters.ts
│   ├── assets/
│   └── styles/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

---

## Complete Data Journey

```
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: FLIGHT PROCESSING (Python)                                        │
├────────────────────────────────────────────────────────────────────────────┤
│ • Receives flight position data                                            │
│ • Loads FIR polygons                                                       │
│ • Detects which FIRs flight crossed                                        │
│ • Calculates fees                                                          │
│ • Generates HTML visualization                                             │
│ • Sends data to Node.js backend                                            │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: INVOICE CREATION (Node.js Backend)                                │
├────────────────────────────────────────────────────────────────────────────┤
│ • InvoiceService.create() receives flight data                             │
│ • Stores invoice in PostgreSQL with:                                       │
│   - firName: "MANILA"                                                      │
│   - All financial details                                                  │
│   - HTML visualization                                                     │
│   - Client information                                                     │
│ • Invoice ID: 123 (generated)                                              │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: INVOICE RETRIEVAL (Node.js API)                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ • Frontend requests: GET /api/invoices/123                                 │
│ • InvoiceController.getPdfData(123)                                        │
│ • InvoiceService queries database                                          │
│ • Returns Invoice object with:                                             │
│   - invoiceTemplate: "1"    ← From FIR table (NEW!)                       │
│   - All invoice details                                                    │
│ • JSON response sent to frontend                                           │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: TEMPLATE SELECTION (React Frontend)                               │
├────────────────────────────────────────────────────────────────────────────┤
│ • InvoiceViewer receives JSON response                                     │
│ • Calls InvoiceTemplateSelector                                            │
│ • InvoiceTemplateSelector reads invoice.invoiceTemplate: "1"               │
│ • Switches on value:                                                       │
│   case '1': return <ManilaTemplate />                                      │
│ • ManilaTemplate renders with Manila branding/layout                       │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: USER INTERACTION (Frontend)                                       │
├────────────────────────────────────────────────────────────────────────────┤
│ • User sees invoice with correct template                                  │
│ • Can view flight map (from mapHtml)                                       │
│ • Can see all details formatted correctly                                  │
│ • Can download PDF (same template styling applied in PDF)                  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Technologies

### Python Backend
- **Framework**: Custom (uses external libraries)
- **Key Libraries**: 
  - `shapely` - GeoJSON polygon processing
  - `folium` - Map visualization
  - `requests` - HTTP calls to IBA API

### Node.js Backend
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Database**: PostgreSQL
- **Validation**: Zod (type-safe schema validation)
- **Language**: TypeScript

### React Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Generation**: dom-to-image + jsPDF (client-side)

---

## Database Flow Specifically for Templates

```
FIR Table (Master Data)
│
└─ FIR Record (id=1)
   ├── firName: "MANILA"
   ├── countryName: "Philippines"
   └── invoiceTemplate: "1"  ← Configuration
                              
                              ↓
                         
Invoice Table (Transaction Data)
│
└─ Invoice Record (id=123)
   ├── firName: "MANILA"     ← References FIR
   ├── invoiceTemplate: "1"  ← Denormalized copy (for direct access)
   └── ... other data
                              
                              ↓
                         
API Response (JSON)
│
└─ GET /api/invoices/123
   ├── invoiceTemplate: "1"  ← Sent to frontend
   └── ... other data
                              
                              ↓
                         
Frontend Component
│
└─ InvoiceTemplateSelector
   ├── Reads: invoice.invoiceTemplate === "1"
   └── Renders: <ManilaTemplate />
```

---

## Summary of Updates

| Component | File | Change | Impact |
|-----------|------|--------|--------|
| Database | `schema.prisma` | Already has `invoiceTemplate` field in FIR | ✅ No change needed |
| Backend Type | `invoice.types.ts` | ✅ Added `invoiceTemplate` field | Returns field in API |
| Backend Service | `invoice.service.ts` | ✅ Includes `invoiceTemplate` in response | API includes field |
| Frontend Type | `invoice.ts` | ✅ Added `invoiceTemplate` field | TypeScript support |
| Frontend Logic | `InvoiceTemplateSelector.tsx` | ✅ Uses switch on template ID | Template selection |

---

## Next Steps for Deployment

1. **Database Verification**
   - Ensure all FIR records have `invoiceTemplate` field set
   - Run migration if needed: `prisma migrate deploy`

2. **Backend Deployment**
   - Rebuild: `npm run build`
   - Deploy updated services
   - Verify API includes `invoiceTemplate` in response

3. **Frontend Deployment**
   - Rebuild: `npm run build`
   - Deploy new bundle
   - Test with live backend API

4. **Testing**
   - Fetch invoices for each FIR
   - Verify correct template renders
   - Test PDF generation
   - Verify fallback template for unmapped IDs
