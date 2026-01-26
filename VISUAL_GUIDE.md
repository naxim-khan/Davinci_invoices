# Visual Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DAVINCI INVOICE SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐   │
│  │  PYTHON          │     │  NODE.JS         │     │  REACT           │   │
│  │  PROCESSING      │────▶│  BACKEND         │────▶│  FRONTEND        │   │
│  │                  │     │                  │     │                  │   │
│  │ • FIR Detection  │     │ • REST API       │     │ • Invoice View   │   │
│  │ • Fee Calc       │     │ • Database       │     │ • Templates      │   │
│  │ • Visualize      │     │ • Invoice Mgmt   │     │ • PDF Export     │   │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

```
                    ┌─────────────────────────┐
                    │      FIR TABLE          │
                    ├─────────────────────────┤
                    │ id: 1                   │
                    │ firName: "MANILA"       │
                    │ countryName: "PH"       │
                    │ invoiceTemplate: "1"  ◄─┼──┐
                    └─────────────────────────┘  │
                                                │
                                                │ Referenced by
                                                │
                    ┌─────────────────────────┐  │
                    │   INVOICE TABLE         │  │
                    ├─────────────────────────┤  │
                    │ id: 123                 │  │
                    │ invoiceNumber: "INV..." │  │
                    │ firName: "MANILA"   ────┼──┘
                    │ firCountry: "PH"        │
                    │ invoiceTemplate: "1"    │ ◄─ KEY FIELD
                    │ totalUsdAmount: 1650    │
                    │ ...20+ more fields      │
                    └─────────────────────────┘
```

---

## Template Mapping Flow

```
                    INVOICE DATA
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Read invoiceTemplate field     │
        │ Value: "1", "2", "3", or null │
        └────────────────────────────────┘
                         │
            ┌────────────┼────────────┬──────────────┐
            │            │            │              │
            ▼            ▼            ▼              ▼
        case "1"     case "2"     case "3"      default
            │            │            │              │
            ▼            ▼            ▼              ▼
        MANILA      KUALA LUMPUR   BAHRAIN      FALLBACK
        TEMPLATE    TEMPLATE       TEMPLATE     TEMPLATE
            │            │            │              │
            └────────────┴────────────┴──────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ RENDER INVOICE   │
                  │ WITH TEMPLATE    │
                  └──────────────────┘
```

---

## Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER BROWSER                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ GET /invoices/123                                                   │ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ┌──────────────────────────────────────────────────────────┐  │ │ │
│ │ │ │ InvoiceViewer Component                                  │  │ │ │
│ │ │ └──────────────────────────────────────────────────────────┘  │ │ │
│ │ │               ▲                          │                    │ │ │
│ │ │               │                          │ passes invoice     │ │ │
│ │ │ fetchData()   │                          │ to selector        │ │ │
│ │ │               │                          ▼                    │ │ │
│ │ │          ┌────────────┐      ┌─────────────────────────────┐ │ │ │
│ │ │          │   JSON     │      │ InvoiceTemplateSelector     │ │ │ │
│ │ │          │   Response │      │ ┌───────────────────────┐   │ │ │ │
│ │ │          └────────────┘      │ │ switch(templateId)    │   │ │ │ │
│ │ │                              │ │  case '1': Manila     │   │ │ │ │
│ │ │                              │ │  case '2': KL         │   │ │ │ │
│ │ │                              │ │  case '3': Bahrain    │   │ │ │ │
│ │ │                              │ │  default: Fallback    │   │ │ │ │
│ │ │                              │ └───────────────────────┘   │ │ │ │
│ │ │                              └─────────────────────────────┘ │ │ │
│ │ │                                         │                    │ │ │
│ │ │                                         ▼                    │ │ │
│ │ │                              ┌─────────────────────┐        │ │ │
│ │ │                              │ ManilaTemplate      │        │ │ │
│ │ │                              │ KualaLumpurTemplate │        │ │ │
│ │ │                              │ BahrainTemplate     │        │ │ │
│ │ │                              │ FallbackTemplate    │        │ │ │
│ │ │                              └─────────────────────┘        │ │ │
│ │ └────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ HTTP Call                                                              │
│ ├─ GET /api/invoices/123                                              │
│ │  ├─ Request Header: Authorization: Bearer <token>                   │
│ │  └─ Response Code: 200 OK                                           │
│ │     Body: {                                                          │
│ │       "id": 123,                                                     │
│ │       "invoiceNumber": "INV-2024-001",                               │
│ │       "firName": "MANILA",                                           │
│ │       "invoiceTemplate": "1",  ◄─ TEMPLATE ID                       │
│ │       "totalUsdAmount": 1650,                                        │
│ │       "mapHtml": "<html>...",                                        │
│ │       ...36 total fields                                             │
│ │     }                                                                │
│ └                                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Code Comparison

### BEFORE (Regex-Based)
```typescript
// ❌ BRITTLE APPROACH
export function InvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
    const firName = (invoice.firName || '').toUpperCase();
    const firCountry = (invoice.firCountry || '').toUpperCase();
    
    const matches = (pattern: RegExp) => 
        pattern.test(firName) || pattern.test(firCountry);

    // Multiple regex checks - error prone
    if (matches(/MANILA|RPHI/i)) {           // ← String dependency
        return <ManilaTemplate invoice={invoice} />;
    }
    if (matches(/KUALA LUMPUR|WMFC/i)) {     // ← Multiple patterns
        return <KualaLumpurTemplate invoice={invoice} />;
    }
    if (matches(/BAHRAIN|OBBB/i)) {          // ← Case sensitive
        return <BahrainTemplate invoice={invoice} />;
    }
    return <FallbackTemplate invoice={invoice} />;
}
```

### AFTER (Database-Driven)
```typescript
// ✅ CLEAN APPROACH
export function InvoiceTemplateSelector({ invoice }: TemplateSelectorProps) {
    const templateId = invoice.invoiceTemplate?.toString().trim() || '';

    // Single configuration source - database
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

---

## How to Add a New Template

```
                    CURRENT STATE
        ┌──────────────────────────────────┐
        │  3 Templates Configured          │
        │  ├─ MANILA (1)                   │
        │  ├─ KUALA LUMPUR (2)             │
        │  └─ BAHRAIN (3)                  │
        └──────────────────────────────────┘
                         │
                         │ Want to add SINGAPORE?
                         ▼
        ┌──────────────────────────────────┐
        │ STEP 1: Update Database          │
        │ UPDATE FIR                       │
        │ SET invoiceTemplate = '4'        │
        │ WHERE firName = 'SINGAPORE'      │
        └──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │ STEP 2: Create Component         │
        │ Create SingaporeTemplate.tsx    │
        │ Export function component        │
        └──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │ STEP 3: Import in Selector       │
        │ import SingaporeTemplate          │
        │ from './templates/...'            │
        └──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │ STEP 4: Add to Switch            │
        │ case '4':                        │
        │  return <SingaporeTemplate />    │
        └──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │ ✅ DONE! No regex changes!       │
        │                                  │
        │ 4 Templates Now Configured:      │
        │  ├─ MANILA (1)                   │
        │  ├─ KUALA LUMPUR (2)             │
        │  ├─ BAHRAIN (3)                  │
        │  └─ SINGAPORE (4) ← NEW          │
        └──────────────────────────────────┘
```

---

## Deployment Timeline

```
┌─ DEVELOPMENT ──────────────────────────────────────────────────────┐
│                                                                    │
│ ┌─────────────┐     ┌──────────────┐     ┌────────────────────┐  │
│ │   Code      │────▶│    Build     │────▶│     Test Locally   │  │
│ │   Changes   │     │              │     │                    │  │
│ │   (4 files) │     │  • Frontend  │     │  • Unit Tests      │  │
│ │             │     │  • Backend   │     │  • E2E Tests       │  │
│ └─────────────┘     └──────────────┘     └────────────────────┘  │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌─ STAGING ──────────────────────────────────────────────────────────┐
│                                                                    │
│ ┌──────────────────┐     ┌────────────────────────────┐           │
│ │   Deploy to      │────▶│  Test with Real Database   │           │
│ │   Staging Env    │     │  & External Services      │           │
│ │                  │     │                            │           │
│ │ • Backend API    │     │  ✅ All Templates Work    │           │
│ │ • Frontend Build │     │  ✅ PDF Generation OK     │           │
│ └──────────────────┘     └────────────────────────────┘           │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌─ PRODUCTION ────────────────────────────────────────────────────────┐
│                                                                    │
│ ┌──────────────┐     ┌─────────────────────────────────┐          │
│ │   Deploy     │────▶│  Monitor Performance & Errors   │          │
│ │   to Prod    │     │  - Check logs                   │          │
│ │              │     │  - Monitor API latency          │          │
│ │ • Gradual    │     │  - Track template rendering     │          │
│ │   Rollout    │     │  - Validate PDF output          │          │
│ └──────────────┘     └─────────────────────────────────┘          │
│                                                                    │
│              ┌──────────────────────────────────────┐             │
│              │   ✅ Live & Working                  │             │
│              │   All Users See Correct Template     │             │
│              │   System Fully Operational           │             │
│              └──────────────────────────────────────┘             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Files Changed Overview

```
davinci_Frontend/
├── src/
│   ├── types/
│   │   └── invoice.ts  ───────────────────┐
│   │       Added: invoiceTemplate field   │
│   │                                       │
│   └── components/                        │
│       └── invoice/                       │
│           ├── InvoiceTemplateSelector.tsx ◄─┐
│           │   CHANGED: Logic rewritten     │
│           │   Before: Regex matching       │
│           │   After: Switch on ID         │
│           │                               │
│           ├── ManilaTemplate.tsx          │
│           │   No changes                  │
│           ├── KualaLumpurTemplate.tsx     │
│           │   No changes                  │
│           ├── BahrainTemplate.tsx         │
│           │   No changes                  │
│           └── FallbackTemplate.tsx        │
│               No changes                  │
│                                           │
node-js/                                   │
├── src/                                   │
│   └── modules/                           │
│       └── invoices/                      │
│           ├── types/                     │
│           │   └── invoice.types.ts ◄─────┼──┐
│           │       Added: invoiceTemplate │  │
│           │                              │  │
│           └── services/                  │  │
│               └── invoice.service.ts ◄───┘  │
│                   CHANGED: Return field     │
│                                             │
└── prisma/                                   │
    └── schema.prisma                         │
        No changes (already has field)        │
```

---

## Key Files at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│ CHANGED FILES (Total: 4)                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1️⃣  davinci_Frontend/src/types/invoice.ts                     │
│    ├─ Added: invoiceTemplate: string | null                   │
│    └─ Lines: +1                                                │
│                                                                 │
│ 2️⃣  davinci_Frontend/src/components/invoice/                  │
│     InvoiceTemplateSelector.tsx                               │
│    ├─ Changed: Complete logic rewrite                          │
│    ├─ Before: Regex matching                                  │
│    ├─ After: Switch on template ID                            │
│    └─ Lines: ~15                                              │
│                                                                 │
│ 3️⃣  node-js/src/modules/invoices/types/invoice.types.ts      │
│    ├─ Added: invoiceTemplate: string | null                   │
│    └─ Lines: +1                                                │
│                                                                 │
│ 4️⃣  node-js/src/modules/invoices/services/invoice.service.ts │
│    ├─ Added: invoiceTemplate return in response               │
│    └─ Lines: +1                                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Total Lines Modified: ~18                                       │
│ Total Lines Added: ~18                                          │
│ Total Lines Removed: ~10                                        │
│ Breaking Changes: 0                                             │
│ Database Migrations: 0                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

```
✅ Implementation Success Metrics

Task                                Status
─────────────────────────────────── ───────
1. Frontend type updated            ✅
2. Template selector rewritten      ✅
3. Backend type updated             ✅
4. Service returns field            ✅
5. TypeScript compiles              ✅
6. All 4 templates work             ✅
7. Fallback template works          ✅
8. PDF generation works             ✅
9. No breaking changes              ✅
10. Documentation complete          ✅
```

---

**Status: ✅ COMPLETE AND READY FOR DEPLOYMENT**
