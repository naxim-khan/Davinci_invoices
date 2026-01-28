
import type { ConsolidatedInvoice } from '../types/consolidated-invoice';

export const fetchConsolidatedInvoiceById = async (id: string): Promise<ConsolidatedInvoice> => {
    const response = await fetch(`/api/invoices/consolidated/${id}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch consolidated invoice');
    }

    const result = await response.json();
    return result.data;
};
