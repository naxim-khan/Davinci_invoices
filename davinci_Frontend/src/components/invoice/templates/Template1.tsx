import type { Invoice } from '../../../types/invoice';
import { getStatusColor, formatDate, calculateTotalOtherFees } from '../../../utils/formatters';
import { formatOtherFeesBreakdown } from '../../../utils/invoiceHelpers';
import airplaneImage from '../../../assets/airplane_davinci.png';
import { MapSection } from '../MapSection';

import { DownloadPdfButton } from '../DownloadPdfButton';
import { PayNowButton } from '../PayNowButton';
import InvoiceQr from '../../invoices/utils/InvoiceQr';

interface TemplateProps {
    invoice: Invoice;
}

export function Template1({ invoice }: TemplateProps) {
    const feeDetails = invoice.feeDescription ? invoice.feeDescription.split(',').map(s => s.trim()) : [];
    const otherFeesBreakdown = formatOtherFeesBreakdown(invoice.otherFeesAmount);

    // Calculate subtotal if totalOriginalAmount is 0
    const totalOtherFees = calculateTotalOtherFees(invoice.otherFeesAmount);
    const calculatedSubtotal = (invoice.feeAmount || 0) + totalOtherFees;
    const displaySubtotal = invoice.totalOriginalAmount && invoice.totalOriginalAmount > 0
        ? invoice.totalOriginalAmount
        : calculatedSubtotal;

    // Helper for safe display
    const display = (value: any) => {
        if (value === null || value === undefined || value === '') return 'N/A';
        return value;
    };

    const displayDate = (date: Date | string | null | undefined) => {
        if (!date) return 'N/A';
        if (date instanceof Date) return formatDate(date.toISOString());
        return formatDate(date as string);
    };

    const displayCurrency = (amount: number | null | undefined, currency?: string | null) => {
        if (amount === null || amount === undefined) return 'N/A';
        return `${amount.toFixed(2)}${currency ? ' ' + currency : ''}`;
    };

    return (
        <div className="font-sans text-gray-800 bg-white min-h-screen">
            {/* BAHRAIN HEADER: Minimalist, Red/White, Jagged Edge feel */}
            <div className="relative bg-white pt-12 pb-8 px-8 border-b-8 border-red-600 overflow-hidden shadow-md">
                {/* Flight Image - Full Width, Low Opacity */}
                <div className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none z-0">
                    <img
                        src={airplaneImage}
                        alt=""
                        className="w-full h-full object-cover object-center"
                        style={{ filter: 'grayscale(100%)' }}
                    />
                </div>

                {/* PDF Download Button - Absolute Positioned */}
                <div className="absolute top-6 right-8 z-20 print:hidden">
                    <DownloadPdfButton invoice={invoice} variant="red" />
                </div>
                {/* QR removed from header; will render inside client card */}

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-5xl font-black text-red-600 tracking-tighter uppercase mb-1">Davinci</h1>
                        <div className="flex items-center gap-3">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 uppercase tracking-widest">Bahrain</span>
                            <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Aviation Services</span>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">{display(invoice.invoiceNumber)}</p>
                        </div>
                        <div className="mt-2 text-right">
                            <span className={`inline-block border border-gray-200 text-xs font-bold uppercase px-3 py-1 rounded ${getStatusColor(invoice.status)} bg-white`}>
                                {display(invoice.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 print:p-6 print:space-y-6 bg-gray-50">

                {/* Information Grid - Sparse, Clean typography */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    <div className="md:col-span-2">
                        <h3 className="text-red-600 font-bold uppercase text-xs tracking-[0.2em] mb-2">Client Details</h3>
                        <p className="text-2xl font-light text-gray-900 mb-1">{display(invoice.clientName)}</p>
                        <p className="text-gray-500 font-medium text-sm w-3/4">{display(invoice.clientAddress)}</p>
                    </div>
                    <div className="space-y-4 border-l border-gray-100 pl-8">
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Issue Date</p>
                            <p className="text-lg font-bold text-gray-900">{displayDate(invoice.issueDate)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Payment Due</p>
                            <p className="text-lg font-bold text-red-600">{displayDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Sector Date</p>
                            <p className="text-lg font-bold text-gray-900">{displayDate(invoice.flightDate)}</p>
                        </div>
                    </div>
                </div>

                {/* Map - No Border, Grayscale container background */}
                <div data-map-section="true" className="w-full bg-gray-100 p-0">
                    <MapSection mapHtml={invoice.mapHtml} />
                </div>

                {/* Flight Data - Minimalist Rows with Red Bullets */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-px bg-red-200 flex-1"></div>
                        <h3 className="text-red-900 font-bold uppercase text-xs tracking-[0.2em]">Operational Data</h3>
                        <div className="h-px bg-red-200 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full mb-2"></div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Flight</p>
                            <p className="text-xl font-medium text-gray-900">{display(invoice.flightNumber)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full mb-2"></div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Aircraft / Mode S</p>
                            <p className="text-xl font-medium text-gray-900">{display(invoice.registrationNumber)}</p>
                            <p className="text-xs text-gray-500">{display(invoice.aircraftModelName)} ({display(invoice.act)}) / {display(invoice.modeSHex)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full mb-2"></div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Routing</p>
                            <div className="flex items-center gap-2 text-xl font-medium text-gray-900">
                                <span>{display(invoice.originIcao)}</span>
                                <span className="text-red-400 text-sm">to</span>
                                <span>{display(invoice.destinationIcao)}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full mb-2"></div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Region</p>
                            <div className="text-sm font-medium text-gray-900">
                                <p>{display(invoice.firName)}</p>
                                <p className="text-gray-500 text-xs">IN: {displayDate(invoice.firEntryTimeUtc)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fees - Big Number Style */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg shadow-md border border-red-200 px-8 py-12 flex flex-col items-center justify-center text-center break-before-page print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                    <p className="text-red-700 font-bold uppercase text-xs tracking-[0.3em] mb-4">Total Amount Due</p>
                    <div className="text-6xl font-black text-gray-900 mb-3 tracking-tighter drop-shadow-sm">
                        <span className="text-3xl align-top mr-2 font-bold text-red-600">$</span>
                        {invoice.totalUsdAmount?.toFixed(2)}
                    </div>
                    <div className="mb-6 flex flex-col items-center gap-4">
                        <p className="text-gray-500 text-sm font-medium">United States Dollars</p>
                        <PayNowButton invoice={invoice} variant="red" className="scale-110 shadow-md" />
                    </div>

                    <div className="w-full max-w-2xl border-t border-red-100 pt-6 space-y-4 text-left">
                        {/* Fee Breakdown - Split by comma */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Calculation Details</p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {feeDetails.length > 0 ? feeDetails.map((detail, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>{display(detail)}</span>
                                    </li>
                                )) : (
                                    <li className="flex items-start gap-2">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>N/A</span>
                                    </li>
                                )}
                            </ul>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed border-red-100">
                                <span className="font-bold text-gray-900">Total Calculation</span>
                                <span className="font-mono font-bold text-red-600">${displayCurrency(invoice.feeAmount)}</span>
                            </div>
                        </div>

                        {/* Other Services - Detailed Breakdown */}
                        {otherFeesBreakdown.length > 0 ? (
                            <div className="px-6 space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Other Services</p>
                                {otherFeesBreakdown.map((fee, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-start text-sm">
                                            <span className="flex items-start gap-2 flex-1">
                                                <span className="text-red-400 mt-1">•</span>
                                                <div>
                                                    <p className="font-bold text-gray-900">{fee.label}</p>
                                                    {fee.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{fee.description}</p>
                                                    )}
                                                </div>
                                            </span>
                                            <div className="text-right ml-3">
                                                <p className="font-mono font-bold text-red-600">${fee.amount.toFixed(2)}</p>
                                                {fee.originalAmount && fee.currency && fee.currency !== 'USD' && (
                                                    <p className="text-xs text-gray-500">{fee.currency} {fee.originalAmount.toFixed(2)}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : calculateTotalOtherFees(invoice.otherFeesAmount) > 0 ? (
                            <div className="flex justify-between text-sm text-gray-600 px-6">
                                <span>Other Services</span>
                                <span className="font-mono font-bold">${displayCurrency(calculateTotalOtherFees(invoice.otherFeesAmount))}</span>
                            </div>
                        ) : null}

                        <div className="flex justify-between text-sm text-gray-500 italic px-6">
                            <span>Subtotal ({invoice.originalCurrency || 'USD'})</span>
                            <span>{displayCurrency(displaySubtotal, invoice.originalCurrency)}</span>
                        </div>
                        {invoice.fxRate && (
                            <div className="text-right text-xs text-gray-400 px-6">
                                FX Rate: {invoice.fxRate.toFixed(4)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with QR */}
                <div className="border-t border-gray-100 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-gray-400 gap-4">
                    <div className="space-y-1">
                        <span className="block font-bold uppercase tracking-widest text-red-900">Davinci Billing Services</span>
                        <span className="block">Bahrain Region • billing@davinci-aviation.com</span>
                    </div>
                    <div className="text-right">
                        <span className="block">Payment Terms: 30 Days</span>
                        <span className="block">Bank Transfer / Swift</span>
                    </div>
                    <div className="print:block flex justify-center">
                        <InvoiceQr invoiceId={invoice.id} size={100} />
                    </div>
                </div>
            </div>
        </div>
    );
}
