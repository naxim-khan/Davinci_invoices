import type { Invoice } from '../../types/invoice';
import { formatDate } from '../../utils/formatters';

interface FirInfoSectionProps {
    invoice: Invoice;
}

export function FirInfoSection({ invoice }: FirInfoSectionProps) {
    return (
        <div className="bg-gradient-to-br from-teal-50/50 to-cyan-50/50 rounded-xl p-4 border border-teal-100">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-teal-900">FIR Information</h3>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-2.5 border border-teal-100/50">
                    <p className="text-xs text-teal-600/80 font-medium">FIR Name</p>
                    <p className="text-sm text-gray-900 font-medium mt-0.5">{invoice.firName || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-teal-100/50">
                    <p className="text-xs text-teal-600/80 font-medium">Country</p>
                    <p className="text-sm text-gray-900 font-medium mt-0.5">{invoice.firCountry || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-teal-100/50">
                    <p className="text-xs text-teal-600/80 font-medium">Entry Time (UTC)</p>
                    <p className="text-sm text-gray-900 font-medium mt-0.5">{formatDate(invoice.firEntryTimeUtc)}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-teal-100/50">
                    <p className="text-xs text-teal-600/80 font-medium">Exit Time (UTC)</p>
                    <p className="text-sm text-gray-900 font-medium mt-0.5">{formatDate(invoice.firExitTimeUtc)}</p>
                </div>
            </div>
        </div>
    );
}
