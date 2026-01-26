import type { Invoice } from '../../../types/invoice';
import { getStatusColor, formatDate } from '../../../utils/formatters';
import airplaneImage from '../../../assets/airplane_davinci.png';
import { MapSection } from '../MapSection';

import { DownloadPdfButton } from '../DownloadPdfButton';
import { PayNowButton } from '../PayNowButton';
import InvoiceQr from '../../invoices/utils/InvoiceQr';

interface TemplateProps {
    invoice: Invoice;
}

export function Template3({ invoice }: TemplateProps) {
    const feeDetails = invoice.feeDescription ? invoice.feeDescription.split(',').map(s => s.trim()) : [];

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
        <div className="font-serif text-gray-900 bg-white min-h-screen">
            {/* KL HEADER: Royal, Stacked Layout (Red Top, Blue Main) */}
            <div className="bg-gradient-to-r from-red-700 to-red-600 h-3 w-full shadow-md"></div>
            <div className="relative bg-gradient-to-r from-blue-950 to-blue-900 text-white px-8 py-8 overflow-hidden shadow-lg">
                {/* Flight Image - Positioned slightly differently */}
                <div className="absolute right-0 -bottom-16 w-96 h-96 opacity-20 pointer-events-none z-0 mix-blend-screen print:opacity-20">
                    <img
                        src={airplaneImage}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{
                            maskImage: 'linear-gradient(to top left, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to top left, black 50%, transparent 100%)'
                        }}
                    />
                </div>

                {/* PDF Download Button - Absolute Positioned */}
                <div className="absolute top-6 right-6 z-20 print:hidden">
                    <DownloadPdfButton invoice={invoice} variant="gold" />
                </div>
                {/* QR removed from header; will render inside client card */}

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            {/* Gold Circle Logo */}
                            <div className="w-14 h-14 rounded-full border-2 border-yellow-500 flex items-center justify-center bg-blue-950">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-serif text-yellow-500 tracking-widest uppercase">Davinci</h1>
                                <p className="text-blue-200 text-[10px] uppercase tracking-[0.3em]">Imperial Aviation Billing</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-2 flex flex-col items-end pt-4">
                        <div className="inline-block border border-yellow-500 px-3 py-1">
                            <span className="block text-yellow-500 text-[10px] uppercase font-bold tracking-widest">Invoice Number</span>
                            <span className="block text-xl font-bold text-white leading-none">#{display(invoice.invoiceNumber)}</span>
                        </div>
                        <div className="flex justify-end items-center gap-2 mt-1">
                            <span className="text-blue-300 text-[10px]">STATUS:</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${getStatusColor(invoice.status)} bg-white text-blue-900`}>
                                {display(invoice.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yellow Separation Bar */}
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-1.5 w-full shadow-sm"></div>

            <div className="p-8 space-y-7 print:p-6 print:space-y-6 bg-gray-50">

                {/* Client Info - Traditional Formal Layout */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 grid md:grid-cols-2 gap-8 relative">
                    <div>
                        <h3 className="text-blue-900 border-b border-blue-900 pb-1 mb-2 text-xs font-bold uppercase tracking-widest">Bill To</h3>
                        <p className="text-lg font-bold text-gray-900 mb-1">{display(invoice.clientName)}</p>
                        <p className="text-gray-600 font-sans text-sm">{display(invoice.clientAddress)}</p>
                    </div>
                    <div className="space-y-2 font-sans text-sm">
                        <div className="flex justify-between border-b border-gray-200 pb-0.5">
                            <span className="text-gray-500 uppercase font-bold text-[10px]">Issue Date</span>
                            <span className="font-bold text-gray-900">{displayDate(invoice.issueDate)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-0.5">
                            <span className="text-gray-500 uppercase font-bold text-[10px]">Due Date</span>
                            <span className="font-bold text-red-700">{displayDate(invoice.dueDate)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-0.5">
                            <span className="text-gray-500 uppercase font-bold text-[10px]">Flight Date</span>
                            <span className="font-bold text-gray-900">{displayDate(invoice.flightDate)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-0.5">
                            <span className="text-gray-500 uppercase font-bold text-[10px]">Internal ID</span>
                            <span className="font-bold text-gray-900">{display(invoice.id)}</span>
                        </div>
                    </div>
                </div>

                {/* Map - Full Width, No Border */}
                {invoice.mapHtml && (
                    <div data-map-section="true" className="w-full bg-gray-50">
                        <MapSection mapHtml={invoice.mapHtml} />
                    </div>
                )}

                {/* Flight Details - Table Style */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-blue-950 text-yellow-500 px-4 py-2 uppercase font-bold tracking-widest text-xs mb-0 border-b-2 border-yellow-500">
                        Flight Particulars
                    </div>
                    <table className="w-full font-sans text-sm border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 px-2 font-bold text-gray-500 w-1/4">Flight Number</td>
                                <td className="py-2 px-2 font-bold text-blue-900">{display(invoice.flightNumber)}</td>
                                <td className="py-2 px-2 font-bold text-gray-500 w-1/4">Registration</td>
                                <td className="py-2 px-2 font-bold text-gray-900">{display(invoice.registrationNumber)}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 px-2 font-bold text-gray-500">Route</td>
                                <td className="py-2 px-2 font-bold text-gray-900" colSpan={3}>
                                    {display(invoice.originIcao)} <span className="text-yellow-600 px-2">✈</span> {display(invoice.destinationIcao)}
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 px-2 font-bold text-gray-500">Aircraft Type</td>
                                <td className="py-2 px-2 font-bold text-gray-900">{display(invoice.act)} ({display(invoice.aircraftModelName)})</td>
                                <td className="py-2 px-2 font-bold text-gray-500">Mode S</td>
                                <td className="py-2 px-2 font-bold text-gray-900">{display(invoice.modeSHex)}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 px-2 font-bold text-gray-500">Entry / Exit</td>
                                <td className="py-2 px-2 font-bold text-gray-900">
                                    IN: {displayDate(invoice.firEntryTimeUtc)}
                                </td>
                                <td className="py-2 px-2 font-bold text-gray-500">Region</td>
                                <td className="py-2 px-2 font-bold text-gray-900">{display(invoice.firName)} ({display(invoice.firCountry)})</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Fees - Minimalist Right Aligned */}
                <div className="break-before-page print:break-before-page bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4" style={{ pageBreakBefore: 'always' }}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b-2 border-blue-950 pb-3">Charges Summary</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fee Details */}
                        <div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Breakdown</h4>
                                <ul className="space-y-2 text-sm text-gray-600 font-sans">
                                    {feeDetails.length > 0 ? feeDetails.map((detail, idx) => (
                                        <li key={idx} className="flex gap-3 items-start">
                                            <span className="text-blue-900 font-bold">•</span>
                                            <span className="flex-1">{display(detail)}</span>
                                        </li>
                                    )) : (
                                        <li className="flex gap-3 items-start">
                                            <span className="text-blue-900 font-bold">•</span>
                                            <span>N/A</span>
                                        </li>
                                    )}
                                </ul>
                                <div className="pt-3 border-t border-blue-200 space-y-2 text-sm font-sans">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 font-medium">Base Fees</span>
                                        <span className="font-bold text-blue-900">${displayCurrency(invoice.feeAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 font-medium">Other Charges</span>
                                        <span className="font-bold text-blue-900">${displayCurrency(invoice.otherFeesAmount || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Summary */}
                        <div className="flex flex-col justify-between space-y-4">
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <div className="flex justify-between items-center text-sm font-sans mb-2">
                                    <span className="text-gray-600 font-medium">Subtotal ({invoice.originalCurrency || 'USD'})</span>
                                    <span className="font-bold text-gray-900">{displayCurrency(invoice.totalOriginalAmount, invoice.originalCurrency)}</span>
                                </div>
                                <div className="text-center text-xs text-gray-500 pt-2 border-t border-yellow-200">
                                    <p>FX Rate: <span className="font-mono font-bold">{invoice.fxRate ? invoice.fxRate.toFixed(4) : 'N/A'}</span></p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-950 to-blue-900 rounded-lg p-4 text-white space-y-3">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-bold text-blue-100 mb-1">Total Amount Payable</p>
                                    <p className="text-3xl font-black">${displayCurrency(invoice.totalUsdAmount)}</p>
                                </div>
                                <PayNowButton invoice={invoice} variant="gold" className="w-full shadow-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Simple Centered with QR */}
                <div className="pt-6 border-t border-gray-100 font-sans text-[10px] text-gray-500 flex justify-between items-center">
                    <div className="text-center flex-1">
                        <h4 className="font-bold text-blue-900 uppercase tracking-widest mb-0.5">DaVinci Aviation Services</h4>
                        <p className="mb-1">billing@davinci-aviation.com | +1 (555) 123-4567</p>
                        <p className="border-t border-gray-200 inline-block pt-1 px-4 italic">Thank you for your business</p>
                    </div>
                    <div className="print:block hidden">
                        <InvoiceQr invoiceId={invoice.id} size={100} />
                    </div>
                </div>
            </div>
        </div>
    );
}
