
export interface ConsolidatedInvoicePdfOptions {
    consolidatedInvoiceId: number;
    waitForSelector?: string;
    generateQrCode?: boolean;
}

export interface ConsolidatedInvoicePdfResponse {
    buffer: Buffer;
    filename: string;
}
