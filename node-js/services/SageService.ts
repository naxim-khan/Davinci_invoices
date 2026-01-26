export interface InvoiceUpsertRequest {
    statusId: number;
    invoiceId: string;
    issueDate: string;
    dueDate: string;
    total: {
        totExcl: number;
        totTax: number;
        totIncl: number;
        currency: string;
        fxRate: number;
    };
    customer: {
        customerId: string;
        customerName: string;
        companyId: string;
    };
    notes?: string;
    invUrl?: string;
    lineItems: any[];
}

export interface InvoiceCancelRequest {
    statusId: number;
    invoiceId: string;
    issueDate: string;
    customer: {
        customerId: string;
        customerName: string;
        companyId: string;
    };
}

/**
 * Mock SageService to satisfy dependencies
 */
export class SageService {
    static async invoiceUpsert(data: InvoiceUpsertRequest): Promise<void> {
        console.log(`[SageService] invoiceUpsert: ${data.invoiceId}`);
    }

    static async invoiceCancel(data: InvoiceCancelRequest): Promise<void> {
        console.log(`[SageService] invoiceCancel: ${data.invoiceId}`);
    }
}

export default SageService;
