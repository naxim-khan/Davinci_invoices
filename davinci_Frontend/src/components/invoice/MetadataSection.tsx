import type { Invoice } from '../../types/invoice';
import { InfoRow } from '../common/InfoRow';
import { formatDate } from '../../utils/formatters';

interface MetadataSectionProps {
    invoice: Invoice;
}

export function MetadataSection({ invoice }: MetadataSectionProps) {
    return (
        <div className="pt-4 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
                <InfoRow label="Created" value={formatDate(invoice.createdAt)} />
                <InfoRow label="Updated" value={formatDate(invoice.updatedAt)} />
            </div>
        </div>
    );
}
