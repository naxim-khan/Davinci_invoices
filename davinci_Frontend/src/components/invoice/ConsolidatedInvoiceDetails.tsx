import { ConsolidatedInvoiceTemplateSelector } from './ConsolidatedInvoiceTemplateSelector';
import type { ConsolidatedInvoice } from '../../types/consolidated-invoice';

interface ConsolidatedInvoiceDetailsProps {
    invoice: ConsolidatedInvoice;
}

export function ConsolidatedInvoiceDetails({ invoice }: ConsolidatedInvoiceDetailsProps) {
    return <ConsolidatedInvoiceTemplateSelector invoice={invoice} />;
}
