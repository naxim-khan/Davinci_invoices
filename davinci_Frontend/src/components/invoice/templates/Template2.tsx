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

export function Template2({ invoice }: TemplateProps) {
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
        <div className="font-sans text-gray-900 bg-white min-h-screen">
            {/* MANILA HEADER: Blue Background, Yellow/Red Accents */}
            <div className="relative bg-gradient-to-r from-blue-900 to-blue-800 px-8 py-8 text-white overflow-hidden border-b-4 border-yellow-400 shadow-lg">
                {/* Flight Image Watermark - Same positioning units, different visual context */}
                <div className="absolute right-0 -bottom-24 w-80 h-80 opacity-40 pointer-events-none z-0 mix-blend-overlay print:opacity-30">
                    <img
                        src={airplaneImage}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{
                            maskImage: 'linear-gradient(to left, black 60%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, black 60%, transparent 100%)'
                        }}
                    />
                </div>

                {/* PDF Download Button - Absolute Positioned to not affect layout */}
                <div className="absolute top-6 right-6 z-20 print:hidden">
                    <DownloadPdfButton invoice={invoice} variant="blue" />
                </div>
                {/* QR removed from header; will render inside client card */}

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {/* Logo Icon */}
                        <div className="bg-yellow-400/20 p-2 rounded-lg backdrop-blur-md border border-yellow-400/30 shadow-lg">
                            <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight uppercase text-yellow-400">DAVINCI</h2>
                        </div>
                        <p className="text-blue-200 text-xs font-medium tracking-wider">PREMIUM AVIATION BILLING</p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 pt-1">
                        <div className="flex items-center justify-end gap-3 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getStatusColor(invoice.status)} ring-1 ring-white/20 bg-white/10 backdrop-blur-md`}>
                                {display(invoice.status)}
                            </span>
                        </div>
                        <div>
                            <p className="text-xl font-bold">Invoice #{display(invoice.invoiceNumber)}</p>
                            <p className="text-blue-200 text-xs">ID: {display(invoice.id)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-6 print:p-6 print:space-y-5 bg-gray-50">

                {/* Client & Dates - Horizontal Layout */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between relative">
                    <div className="flex-1 space-y-1">
                        <h3 className="text-[10px] uppercase tracking-widest text-red-600 font-bold mb-1">Billed To</h3>
                        <p className="text-base font-bold text-gray-900">{display(invoice.clientName)}</p>
                        <p className="text-gray-500 text-xs max-w-xs leading-relaxed">{display(invoice.clientAddress)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-0.5">Date of Issue</p>
                            <p className="font-mono text-sm font-medium">{displayDate(invoice.issueDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-0.5">Due Date</p>
                            <p className="font-mono text-sm font-medium">{displayDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-0.5">Flight Date</p>
                            <p className="font-mono text-sm font-medium">{displayDate(invoice.flightDate)}</p>
                        </div>
                    </div>
                </div>

                {/* Map Section - Clean, No Border */}
                {invoice.mapHtml && (
                    <div data-map-section="true" className="w-full">
                        <MapSection mapHtml={invoice.mapHtml} />
                    </div>
                )}

                {/* Flight Info - Grid Layout with Blue Accents */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 border-l-4 border-blue-600 pl-3">Flight Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-0 bg-white">
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Flight No.</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.flightNumber)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Registration</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.registrationNumber)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Aircraft</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.aircraftModelName)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Type / Mode S</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.act)} <span className="text-[10px] font-normal text-gray-500">/ {display(invoice.modeSHex)}</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Route</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.originIcao)} → {display(invoice.destinationIcao)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">FIR / Country</p>
                            <p className="font-bold text-sm text-gray-900">{display(invoice.firName)} <span className="text-[10px] font-normal text-gray-500">({display(invoice.firCountry)})</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Entry (UTC)</p>
                            <p className="font-mono text-xs">{displayDate(invoice.firEntryTimeUtc)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-500 font-medium">Exit (UTC)</p>
                            <p className="font-mono text-xs">{displayDate(invoice.firExitTimeUtc)}</p>
                        </div>
                    </div>
                </div>

                {/* Fees - Clean Table Style */}
                <div className="break-before-page print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                    <div className="bg-blue-900 text-white rounded-t-lg p-2 flex justify-between items-center">
                        <span className="font-bold uppercase tracking-wider text-xs">Financial Breakdown</span>
                        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 space-y-3">
                        {/* Fee Description List */}
                        <div className="pb-3 border-b border-gray-100 border-dashed">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Calculation Breakdown</p>
                            <ul className="space-y-0.5">
                                {feeDetails.length > 0 ? feeDetails.map((detail, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex gap-2">
                                        <span className="text-blue-400">•</span>
                                        {detail}
                                    </li>
                                )) : (
                                    <li className="text-sm text-gray-600 flex gap-2">
                                        <span className="text-blue-400">•</span>
                                        N/A
                                    </li>
                                )}
                            </ul>
                            <div className="flex justify-between items-center mt-2 pt-2">
                                <span className="text-gray-600 font-bold text-sm">Fee Subtotal</span>
                                <span className="font-mono font-bold text-gray-900">${displayCurrency(invoice.feeAmount)}</span>
                            </div>
                        </div>

                        {/* Always show "Additional Fees" section, putting N/A if 0 or null? 
                            User said "if missing field data print N/A". 
                            Usually "0" is not missing, it is 0. 
                            However, if the user requested "each field name should be populated", 
                            I should probably keep sections visible even if empty/zero if they are "fields".
                            But "Additional Fees" is conditional in original logic. 
                            If I should show it always, I'll remove condition. 
                            I will assume "Other Fees" is a field. */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 border-dashed">
                            <span className="text-gray-600 font-medium text-sm">Additional Fees</span>
                            <span className="font-mono font-bold text-gray-900">${displayCurrency(invoice.otherFeesAmount || 0)}</span>
                        </div>

                        {/* Subtotal and FX */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 border-dashed bg-gray-50 px-2 rounded">
                            <span className="text-gray-600 font-medium text-[10px] uppercase">Subtotal ({invoice.originalCurrency || 'USD'})</span>
                            <span className="font-mono font-bold text-sm text-gray-700">{displayCurrency(invoice.totalOriginalAmount, invoice.originalCurrency)}</span>
                        </div>

                        <div className="flex justify-end text-[10px] text-gray-400 italic px-2">
                            Exchange Rate: {invoice.fxRate ? invoice.fxRate.toFixed(4) : 'N/A'}
                        </div>


                        <div className="flex justify-between items-center pt-2">
                            <div className="text-left">
                                <p className="text-blue-900 font-black uppercase text-base">Total Due</p>
                                <p className="text-[10px] text-gray-400">Payment Terms: 30 Days</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="font-mono font-black text-xl text-blue-600">${displayCurrency(invoice.totalUsdAmount)} <span className="text-[10px] text-gray-400 font-medium align-top">USD</span></span>
                                <PayNowButton invoice={invoice} variant="blue" className="shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Company Info (Missing in V1) */}
                <div className="border-t-2 border-blue-900 pt-4 mt-6">
                    <div className="flex flex-col md:flex-row justify-between text-xs text-gray-600">
                        <div className="mb-2 md:mb-0">
                            <h4 className="font-bold text-blue-900 uppercase tracking-widest mb-1">DaVinci Aviation Services</h4>
                            <p>Your trusted partner for aviation navigation services.</p>
                            <p>billing@davinci-aviation.com | +1 (555) 123-4567</p>
                        </div>
                        <div className="text-right">
                            <h4 className="font-bold text-blue-900 uppercase tracking-widest mb-1">Payment Methods</h4>
                            <p>Bank Transfer (Wire/ACH)</p>
                            <p>International Swift Transfer</p>
                        </div>
                    </div>
                    <div className="text-center text-[10px] text-gray-400 mt-4">
                        Invoice ID: {display(invoice.id)} • Generated: {new Date().toLocaleDateString()}
                    </div>
                    <div className="mt-4 flex justify-center">
                        <div className="print:block">
                            <InvoiceQr invoiceId={invoice.id} size={100} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
