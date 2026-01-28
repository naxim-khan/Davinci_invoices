
import type { Invoice } from './invoice';

export interface ConsolidatedInvoice {
    id: number;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    billedToName: string;
    billedToAddress: string;
    totalFlights: number;
    totalUsd: number;
    totalFeeUsd: number;
    totalOtherUsd: number;
    status: string;
    qrCodeData?: string;
    invoices: Invoice[];
    ClientKYC?: {
        beneficiaryName: string | null;
        accountNumberIBAN: string | null;
        bankName: string | null;
        bankAddress: string | null;
        swiftBICCode: string | null;
    };
    summary?: {
        baseOperations: number;
        ancillaryCharges: number;
        totalBalance: number;
    };
}
