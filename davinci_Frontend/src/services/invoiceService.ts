import type { Invoice } from '../types/invoice';

export const fetchInvoiceById = async (invoiceId: string): Promise<Invoice> => {
    const response = await fetch(`/api/invoices/${invoiceId}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invoice');
    }

    return response.json();
};
