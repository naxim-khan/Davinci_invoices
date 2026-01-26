import { BillingPeriodType } from '@prisma/client';

export interface BillingPeriod {
    start: Date;
    end: Date;
    type: BillingPeriodType;
    description: string;
}

export interface ConsolidationMetrics {
    customersProcessed: number;
    invoicesGenerated: number;
    totalInvoicesConsolidated: number;
    errors: ConsolidationError[];
    executionTimeMs: number;
    timestamp: string;
}

export interface ConsolidationError {
    customerId: number;
    customerName: string;
    error: string;
    timestamp: string;
}

export interface ConsolidatedInvoiceGenerationResult {
    success: boolean;
    consolidatedInvoice?: {
        id: number;
        invoiceNumber: string;
        totalFlights: number;
        totalUsd: number;
    };
    message?: string;
    error?: string;
}
