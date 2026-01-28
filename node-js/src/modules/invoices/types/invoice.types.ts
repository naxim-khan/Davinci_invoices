import { InvoiceStatus } from '@prisma/client';

/**
 * Invoice response for PDF generation
 * Flat structure matching database schema - no grouping
 * All dates are ISO strings, nullable fields preserved
 */
export interface InvoicePdfDataResponse {
    id: number;
    invoiceNumber: string;
    issueDate: string; // ISO string
    dueDate: string | null; // ISO string or null
    status: InvoiceStatus;
    clientName: string;
    clientAddress: string | null;
    mapHtml: string | null;
    flightNumber: string | null;
    originIcao: string | null;
    destinationIcao: string | null;
    originIata: string | null;
    destinationIata: string | null;
    registrationNumber: string | null;
    aircraftModelName: string | null;
    flightDate: string | null; // ISO string
    firName: string | null;
    firCountry: string | null;
    invoiceTemplate: string | null; // FIR template ID: "1" (Manila), "2" (KL), "3" (Bahrain), etc.
    firEntryTimeUtc: string | null; // ISO string
    firExitTimeUtc: string | null; // ISO string
    feeDescription: string | null;
    feeAmount: number; // default 0
    otherFeesAmount: any; // JSON type from database
    totalOriginalAmount: number; // default 0
    originalCurrency: string | null;
    fxRate: number | null;
    totalUsdAmount: number; // default 0
    qrCodeData: string | null;
    logoKey: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    act: string | null;
    flightId: string; // BigInt converted to string for JSON
    modeSHex: string | null;
    alic: string | null;
    operatorId: number | null;
    includedInConsolidatedInvoiceId: number | null;
    isReplacement: boolean; // default false
    revisionRequired: boolean; // default false
    currentRevisionNumber: number; // default 0
    originalInvoiceId: number | null;
    replacementSuffix: number | null;
}
