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

export function Template3({ invoice }: TemplateProps) {
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
        <div className="font-sans text-slate-800 bg-white min-h-screen selection:bg-blue-50">
            {/* Professional Header - KL Theme Integrated */}
            <div className="bg-gradient-to-r from-red-700 to-red-600 h-2 w-full"></div>
            <div className="relative bg-gradient-to-r from-blue-950 to-blue-900 pt-12 pb-10 px-10 border-b-4 border-yellow-500 overflow-hidden shadow-lg">
                {/* Flight Image Watermark */}
                <div className="absolute right-0 -bottom-24 w-96 h-96 opacity-10 pointer-events-none z-0 mix-blend-screen">
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
                <div className="absolute top-6 right-10 z-20 print:hidden flex gap-4">
                    <DownloadPdfButton invoice={invoice} variant="white" />
                </div>

                <div className="relative z-10 flex justify-between items-center text-white">
                    <div className="flex flex-col items-start gap-4">
                        <img
                            src="/assets/logo.png"
                            alt="DaVinci Aero Systems"
                            className="h-14 w-auto brightness-0 invert object-contain"
                        />
                        <div className="flex items-center gap-3">
                            <span className="bg-yellow-500 text-slate-900 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest rounded">Imperial Record</span>
                            <span className="text-blue-300 text-[10px] font-bold uppercase tracking-widest opacity-80">• Regional Operations</span>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="px-6 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl">
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 opacity-60">System ID</p>
                            <p className="text-2xl font-black tracking-tight leading-none">{display(invoice.invoiceNumber)}</p>
                            <div className="mt-3 text-right">
                                <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(invoice.status)} ring-1 ring-white/10`}>
                                    {display(invoice.status)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 space-y-10 print:p-8 print:space-y-8 bg-slate-50/50">

                {/* Information Grid */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-900 rounded-sm transform rotate-45"></div>
                            <h3 className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em]">Billed Entity</h3>
                        </div>
                        <div className="pl-4 border-l-2 border-blue-900/10">
                            <p className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2 leading-none">{display(invoice.clientName)}</p>
                            <p className="text-slate-500 font-medium text-xs leading-relaxed italic max-w-md">{display(invoice.clientAddress)}</p>
                        </div>
                    </div>
                    <div className="space-y-6 md:border-l md:border-slate-100 md:pl-10">
                        <div className="flex justify-between md:block">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1.5 opacity-70">Generation Date</p>
                            <p className="text-sm font-black text-slate-900">{displayDate(invoice.issueDate)}</p>
                        </div>
                        <div className="flex justify-between md:block">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1.5 opacity-70">Settlement Deadline</p>
                            <p className="text-sm font-black text-red-700 underline decoration-red-100 underline-offset-4">{displayDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                </div>

                {/* Map Section */}
                <div data-map-section="true" className="w-full rounded-3xl overflow-hidden shadow-sm border-2 border-white ring-1 ring-slate-100">
                    <MapSection mapHtml={invoice.mapHtml} />
                </div>

                {/* Flight Data */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                    <div className="flex items-center gap-4 mb-10">
                        <h3 className="text-slate-950 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-900 rounded-sm transform rotate-45"></span>
                            Flight Execution Record
                        </h3>
                        <div className="h-px bg-slate-50 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                        <div className="space-y-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Asset Reference</p>
                            <p className="text-xl font-black text-slate-950 tracking-tighter">{display(invoice.flightNumber)}</p>
                            <p className="text-[10px] text-blue-900 font-black uppercase tracking-widest italic">{displayDate(invoice.flightDate)}</p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Aircraft Signature</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">{display(invoice.registrationNumber)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{display(invoice.aircraftModelName)}</p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Operational Route</p>
                            <div className="flex items-center gap-3 text-base font-black text-slate-950">
                                <span className="px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{display(invoice.originIcao)}</span>
                                <span className="text-blue-400 opacity-30">✈</span>
                                <span className="px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{display(invoice.destinationIcao)}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Control FIR</p>
                            <div className="text-sm font-black text-slate-950 uppercase">
                                <p className="truncate leading-none">{display(invoice.firName)}</p>
                                <p className="text-slate-400 text-[9px] mt-2 font-mono">{display(invoice.modeSHex)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charges & Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 break-before-page print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                    {/* Financial Breakdown */}
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-10">
                        <h3 className="text-slate-950 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 pb-5">
                            <span className="w-2 h-2 bg-blue-900 rounded-sm transform rotate-45"></span>
                            Financial Audit
                        </h3>

                        <div className="space-y-8">
                            <div className="space-y-5">
                                <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Primary Service Fees</p>
                                <ul className="space-y-4">
                                    {feeDetails.length > 0 ? feeDetails.map((detail, idx) => (
                                        <li key={idx} className="flex items-start gap-4 text-[12px] font-medium text-slate-600 leading-relaxed italic">
                                            <span className="w-1.5 h-1.5 bg-blue-100 rounded-full mt-1 flex-shrink-0"></span>
                                            {display(detail)}
                                        </li>
                                    )) : (
                                        <li className="text-xs font-medium text-slate-400 italic pl-6">No data provided</li>
                                    )}
                                </ul>
                                <div className="flex justify-between items-center bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
                                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Operational Subtotal</span>
                                    <span className="text-lg font-black text-slate-950">{displayCurrency(invoice.feeAmount)}</span>
                                </div>
                            </div>

                            {otherFeesBreakdown.length > 0 && (
                                <div className="space-y-5 pt-4">
                                    <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Support & Logistics</p>
                                    <div className="space-y-5">
                                        {otherFeesBreakdown.map((fee, idx) => (
                                            <div key={idx} className="flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    <span className="w-1.5 h-1.5 bg-blue-900/10 rounded-full mt-1.5 flex-shrink-0"></span>
                                                    <div>
                                                        <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{fee.label}</p>
                                                        {fee.description && (
                                                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">{fee.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-[13px] font-black text-slate-950 font-mono tracking-tighter">{displayCurrency(fee.amount)}</p>
                                                    {fee.originalAmount && fee.currency && fee.currency !== 'USD' && (
                                                        <p className="text-[9px] text-slate-400 font-black mt-0.5 opacity-60">{fee.currency} {fee.originalAmount.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ancillary Subtotal</span>
                                        <span className="text-lg font-black text-slate-900">{displayCurrency(calculateTotalOtherFees(invoice.otherFeesAmount))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Settlement Controls */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-3xl shadow-xl p-10 text-white relative overflow-hidden flex flex-col items-center">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>

                            <p className="text-blue-200 font-black uppercase text-[10px] tracking-[0.4em] mb-8 relative z-10 flex items-center gap-3">
                                <span className="w-1 h-3 bg-yellow-500"></span>
                                Amount Payable
                            </p>
                            <div className="text-7xl font-black mb-6 tracking-tighter relative z-10 flex items-baseline">
                                <span className="text-3xl font-medium opacity-40 mr-2">$</span>
                                {invoice.totalUsdAmount?.toFixed(2)}
                            </div>
                            <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-10 relative z-10">Institutional Settlement Currency (USD)</p>
                            <PayNowButton invoice={invoice} variant="white" className="scale-110 shadow-2xl relative z-10 font-black uppercase tracking-widest" />
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center opacity-70">Exchange Protocols</p>
                            <div className="flex justify-between text-xs font-black text-slate-800 uppercase tracking-tight">
                                <span className="opacity-40">Original Value</span>
                                <span>{displayCurrency(displaySubtotal, invoice.originalCurrency)}</span>
                            </div>
                            <div className="h-px bg-slate-50"></div>
                            {invoice.fxRate && (
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 italic">Rate Index: <span className="text-blue-900 font-black">{invoice.fxRate.toFixed(4)}</span></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Professionalized Footer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
                    {/* Compliance Terms */}
                    <div className="md:col-span-4 bg-white rounded-3xl p-8 border border-slate-100 italic relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/50 -mr-12 -mt-12 rounded-full"></div>
                        <h3 className="text-slate-950 font-black text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <span className="w-2 h-0.5 bg-blue-900"></span>
                            Settlement Terms
                        </h3>
                        <ul className="space-y-5 text-[10px] font-medium text-slate-500 leading-snug">
                            <li className="flex gap-4">
                                <span className="text-blue-900 font-black italic">I.</span>
                                <span>Settlement timeframe is 30 calendar days from registration.</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-blue-900 font-black italic">II.</span>
                                <span>Late surcharges of 1.5% applied monthly on outstanding depth.</span>
                            </li>
                            <li className="flex gap-4 border-t border-slate-50 pt-5 mt-5">
                                <span className="text-blue-900/50 font-black italic">III.</span>
                                <span>Invoice ID must be cited in all transfer communications.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Banking Instructions */}
                    <div className="md:col-span-5 bg-white rounded-3xl p-8 border border-slate-100">
                        <h3 className="text-slate-950 font-black text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <span className="w-2 h-0.5 bg-blue-900"></span>
                            Banking Instructions
                        </h3>
                        <div className="space-y-6">
                            <div className="flex flex-col gap-1">
                                <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest">Electronic Beneficiary</p>
                                <p className="text-xs font-black text-slate-950 truncate uppercase">{invoice.ClientKYC?.bankName || 'Standard Chartered Bank'}</p>
                            </div>
                            <div className="h-px bg-slate-50"></div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest">Account Number / IBAN</p>
                                <p className="text-sm font-black text-slate-950 font-mono tracking-tighter">{invoice.ClientKYC?.accountNumberIBAN || 'AE220260001018557784601'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest">SWIFT / BIC</p>
                                    <p className="text-xs font-black text-slate-900 font-mono italic">{invoice.ClientKYC?.swiftBICCode || 'EBIDAEADXXX'}</p>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest">Transaction Ref</p>
                                    <p className="text-[10px] font-black text-slate-950 italic opacity-60 leading-none">{invoice.invoiceNumber}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Record */}
                    <div className="md:col-span-3 bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center shadow-xl">
                        <div className="p-2.5 bg-white rounded-2xl shadow-inner">
                            <InvoiceQr invoiceId={invoice.id} size={90} />
                        </div>
                        <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] mt-6 leading-none">Record Verification</p>
                        <p className="text-[8px] font-bold text-yellow-500 uppercase mt-2 tracking-widest italic opacity-60">System Log: {String(invoice.id).slice(-8)}</p>
                    </div>
                </div>

                {/* Global Brand Navigation Footer */}
                <div className="pt-10 pb-4 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <img
                            src="/assets/logo.png"
                            alt=""
                            className="h-8 grayscale opacity-20"
                        />
                        <div className="w-px h-6 bg-slate-200"></div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">DaVinci Aero Systems • APAC Region v4.2</p>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-[8px] font-black text-blue-900/30 uppercase tracking-widest cursor-default">Institutional Billing • Proprietary Document</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
