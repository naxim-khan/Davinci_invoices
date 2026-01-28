export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'DRAFT' | 'OVERDUE';

export interface ClientKYC {
    beneficiaryName: string | null;
    accountNumberIBAN: string | null;
    bankName: string | null;
    bankAddress: string | null;
    swiftBICCode: string | null;
}

export interface Invoice {
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
    invoiceTemplate: number | null; // FIR template ID
    firEntryTimeUtc: string | null; // ISO string
    firExitTimeUtc: string | null; // ISO string
    feeDescription: string | null;
    feeAmount: number; // default 0
    otherFeesAmount: any; // JSON type from database: number | object | null
    totalOriginalAmount: number; // default 0
    originalCurrency: string | null;
    fxRate: number | null;
    totalUsdAmount: number; // default 0
    qrCodeData: string | null;
    logoKey: string | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    act: string | null;
    flightId: string; // BigInt converted to string
    modeSHex: string | null;
    alic: string | null;
    operatorId: number | null;
    includedInConsolidatedInvoiceId: number | null;
    isReplacement: boolean;
    revisionRequired: boolean;
    currentRevisionNumber: number;
    originalInvoiceId: number | null;
    replacementSuffix: number | null;
    ClientKYC?: ClientKYC | null;
}
