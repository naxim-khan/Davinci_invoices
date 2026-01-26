import type { Invoice } from '../../types/invoice';
import { formatDate } from '../../utils/formatters';

interface ClientInfoSectionProps {
    invoice: Invoice;
}

export function ClientInfoSection({ invoice }: ClientInfoSectionProps) {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            {/* Client Details Card */}
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-emerald-900">Client Information</h3>
                </div>
                <div className="space-y-2">
                    <div>
                        <p className="text-xs text-emerald-600 font-medium">Name</p>
                        <p className="text-sm text-gray-900 font-medium">{invoice.clientName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600 font-medium">Address</p>
                        <p className="text-sm text-gray-700">{invoice.clientAddress || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Date Details Card */}
            <div className="bg-linear-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-teal-900">Important Dates</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-xs text-teal-600 font-medium">Issue Date</p>
                        <p className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-teal-600 font-medium">Due Date</p>
                        <p className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-teal-600 font-medium">Flight Date</p>
                        <p className="text-sm text-gray-900">{formatDate(invoice.flightDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
