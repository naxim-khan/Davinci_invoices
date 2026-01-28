import type { Invoice } from '../../types/invoice';
import { formatCurrency, calculateTotalOtherFees } from '../../utils/formatters';
import { formatOtherFeesBreakdown } from '../../utils/invoiceHelpers';
import { PayNowButton } from './PayNowButton';

interface FeesBreakdownSectionProps {
    invoice: Invoice;
}

export function FeesBreakdownSection({ invoice }: FeesBreakdownSectionProps) {
    const totalOtherFees = calculateTotalOtherFees(invoice.otherFeesAmount);
    const otherFeesBreakdown = formatOtherFeesBreakdown(invoice.otherFeesAmount);

    // Calculate subtotal: if totalOriginalAmount is 0 or invalid, calculate it
    const calculatedSubtotal = (invoice.feeAmount || 0) + totalOtherFees;
    const displaySubtotal = invoice.totalOriginalAmount && invoice.totalOriginalAmount > 0
        ? invoice.totalOriginalAmount
        : calculatedSubtotal;

    return (
        <div className="bg-linear-to-br from-emerald-400 to-teal-500 rounded-xl p-4 border border-emerald-300">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-white">Fee Breakdown</h3>
            </div>

            <div className="bg-white/95 backdrop-blur rounded-lg p-3">
                <div className="space-y-2">
                    <div className="flex justify-between py-1.5 text-sm">
                        <span className="text-gray-600">Fee Amount</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(invoice.feeAmount, invoice.originalCurrency)}</span>
                    </div>
                    {/* Other Fees - Show detailed breakdown if available */}
                    {otherFeesBreakdown.length > 0 ? (
                        <>
                            {otherFeesBreakdown.map((fee, index) => (
                                <div key={index} className="py-2 border-b border-emerald-100 last:border-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">{fee.label}</p>
                                            {fee.description && (
                                                <p className="text-xs text-gray-600 mt-1 italic">{fee.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right ml-3">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(fee.amount, 'USD')}
                                            </p>
                                            {fee.originalAmount && fee.currency && fee.currency !== 'USD' && (
                                                <p className="text-xs text-gray-500">
                                                    {fee.currency} {fee.originalAmount.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : totalOtherFees > 0 ? (
                        <div className="flex justify-between py-1.5 text-sm">
                            <span className="text-gray-600">Other Fees</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(totalOtherFees, invoice.originalCurrency)}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between py-1.5 text-sm border-t border-emerald-100">
                        <span className="text-gray-700 font-medium">Subtotal ({invoice.originalCurrency || 'USD'})</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(displaySubtotal, invoice.originalCurrency)}</span>
                    </div>
                    {invoice.fxRate && (
                        <div className="flex justify-between py-1 text-xs text-gray-500">
                            <span>Exchange Rate</span>
                            <span className="font-mono">{invoice.fxRate.toFixed(4)}</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t-2 border-emerald-200">
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center bg-linear-to-r from-emerald-50 to-teal-50 rounded-lg p-2.5">
                            <span className="text-sm font-bold text-emerald-900">Total Amount (USD)</span>
                            <span className="text-xl font-bold text-emerald-700">{formatCurrency(invoice.totalUsdAmount, 'USD')}</span>
                        </div>
                        <div className="flex justify-end">
                            <PayNowButton invoice={invoice} variant="green" className="shadow-md" />
                        </div>
                    </div>
                </div>

                {invoice.feeDescription && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                        <p className="text-sm text-gray-700">{invoice.feeDescription}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
