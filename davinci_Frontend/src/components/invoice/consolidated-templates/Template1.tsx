import { QRCodeSVG } from 'qrcode.react';
import type { ConsolidatedInvoice } from '../../../types/consolidated-invoice';

interface TemplateProps {
    invoice: ConsolidatedInvoice;
}

export function Template1({ invoice }: TemplateProps) {
    // Helper to format currency safely
    const formatCurrency = (amount: number | undefined | null, currency: string = 'USD') => {
        if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    // Helper to format date
    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Helper to format time
    const formatTime = (dateString: string | undefined | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    };

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div id="consolidated-invoice-printable" className="bg-white border border-slate-200 rounded-lg overflow-hidden print:border-none print:rounded-none selection:bg-emerald-50 text-slate-900 font-sans">
            {/* Minimalist Top Bar */}
            <div className="h-1.5 bg-emerald-500/30 w-full"></div>

            {/* Refined Header - Professional Minimalist */}
            <div className="p-8 border-b border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-50">
                    <div>
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-9 h-9 bg-emerald-50/50 border border-emerald-100/50 rounded flex items-center justify-center font-black text-lg text-emerald-600 italic">D</div>
                            <div className="text-left">
                                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase leading-none">Davinci Server</h1>
                                <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Institutional Billing</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Consolidated Invoice</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                                    {invoice.status || 'PENDING'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">•</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{invoice.totalFlights || 0} SECTORS</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded flex flex-col items-end">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">REFERENCE NO</p>
                            <p className="text-lg font-black tracking-tight text-slate-950">{invoice.invoiceNumber}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Issued: {formatDate(invoice.issueDate)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                        <h3 className="text-emerald-600/80 text-[9px] font-black uppercase tracking-[0.2em] border-b border-emerald-50 w-fit">Billing Recipient</h3>
                        <div className="pl-0.5">
                            <p className="text-base font-black text-slate-900 uppercase tracking-tight">{invoice.billedToName}</p>
                            <p className="text-slate-400 text-xs leading-relaxed italic font-medium">{invoice.billedToAddress}</p>
                        </div>
                    </div>
                    <div className="md:text-right space-y-3 flex flex-col items-end">
                        <h3 className="text-emerald-600/80 text-[9px] font-black uppercase tracking-[0.2em] border-b border-emerald-50 w-fit">Accounting Cycle</h3>
                        <div className="flex items-center gap-3 text-slate-900 bg-slate-50/30 px-3.5 py-2.5 rounded border border-slate-100/30">
                            <div className="text-left">
                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Start</p>
                                <p className="text-xs font-black">{formatDate(invoice.billingPeriodStart)}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-200/50"></div>
                            <div className="text-right">
                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">End</p>
                                <p className="text-xs font-black">{formatDate(invoice.billingPeriodEnd)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Itemized Table */}
            <div className="bg-white">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3 text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Ref</span>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset/Callsign</span>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Execution Date</span>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp (UTC)</span>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">URL</span>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Settlement (USD)</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                        {invoice.invoices?.map((inv) => (
                            <tr key={inv.id} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-bold text-slate-900 tracking-tight">{inv.invoiceNumber}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-black text-emerald-600 italic tracking-tighter">{inv.flightNumber || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-medium text-slate-500">{formatDate(inv.flightDate?.toString())}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[11px] text-slate-400 font-mono tracking-tighter uppercase">{formatTime(inv.flightDate?.toString())}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <a href={`/?id=${inv.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
                                        View Link
                                    </a>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-[14px] text-slate-950 font-black tracking-tight border-b border-emerald-100">
                                        {formatCurrency(inv.totalUsdAmount || 0)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {/* Dummy rows for demonstration */}
                        {['E456', 'F789', 'G012', 'H345', 'I678', 'J901', 'K234', 'L567', 'M890', 'N123', 'O456', 'P789', 'Q012', 'R345', 'S678', 'T901'].map((callsign, idx) => (
                            <tr key={`dummy-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-bold text-slate-900 tracking-tight">INV-VWZ0TW</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-black text-emerald-600 italic tracking-tighter">{callsign}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[13px] font-medium text-slate-500">January 3, 2026</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-[11px] text-slate-400 font-mono tracking-tighter uppercase">11:30 UTC</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <a href="#" className="text-[11px] text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
                                        View Link
                                    </a>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-[14px] text-slate-950 font-black tracking-tight border-b border-emerald-100">
                                        $92.83
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Financial & Banking Settlement */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-100">
                {/* Settlement Summary */}
                <div className="p-9 border-r border-slate-100 bg-white">
                    <h3 className="text-slate-950 font-black text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-500"></span>
                        Executive Summary
                    </h3>
                    <div className="space-y-5">
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Operations</span>
                            <span className="text-[13px] font-black text-slate-900 tracking-tight">
                                {formatCurrency(invoice.summary?.baseOperations ?? invoice.totalFeeUsd)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ancillary Charges</span>
                            <span className="text-[13px] font-black text-slate-900 tracking-tight">
                                {formatCurrency(invoice.summary?.ancillaryCharges ?? invoice.totalOtherUsd)}
                            </span>
                        </div>
                        <div className="pt-6 border-t border-slate-50">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-lg font-black text-slate-950 tracking-tighter uppercase leading-none">Total Balance</span>
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Settlement in USD Only</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                                        {formatCurrency(invoice.summary?.totalBalance ?? invoice.totalUsd)}
                                    </div>
                                    <div className="h-0.5 bg-emerald-500 w-1/3 ml-auto mt-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banking Instructions */}
                <div className="p-12 pb-2 bg-slate-50/30">
                    <h3 className="text-slate-900 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Banking Instructions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                        <div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Beneficiary</p>
                            <p className="text-xs font-black text-slate-900 uppercase leading-snug">{invoice.ClientKYC?.beneficiaryName || 'Nazeem Fast Logistics INC'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">SWIFT / BIC</p>
                            <p className="text-xs font-black text-emerald-700 font-mono tracking-widest italic">{invoice.ClientKYC?.swiftBICCode || 'EBIDAEADXXX'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <div className="h-px bg-slate-200/50 mb-2"></div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Account Number / IBAN</p>
                            <p className="text-base font-black text-slate-900 font-mono tracking-tight">{invoice.ClientKYC?.accountNumberIBAN || 'AE220260001018557784601'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Bank Information</p>
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase italic">
                                {invoice.ClientKYC?.bankName || 'Emirates NBD Bank'}
                                <br />
                                {invoice.ClientKYC?.bankAddress || 'Dubai Corporate Center, UAE'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification & Compliance */}
            <div className="p-8 pb-2 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-12 bg-white border-2">
                <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-400 text-[10px]">!</div>
                        <h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.3em]">Compliance & Terms</h3>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed">
                        <li>• SETTLEMENT DUE WITHIN 30 CALENDAR DAYS</li>
                        <li>• 1.5% LATE SURCHARGE MAY APPLY MONTHLY</li>
                        <li>• REFERENCE INVOICE ID ON ALL TRANSFERS</li>
                        <li>• DISPUTES MUST BE LOGGED WITHIN 7 DAYS</li>
                    </ul>
                </div>

                <div className="flex flex-col items-center">
                    <div className="p-2 border border-slate-100 rounded-lg bg-white shadow-sm">
                        <QRCodeSVG value={currentUrl} size={80} level="H" marginSize={1} fgColor="#064e3b" />
                    </div>
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-3 italic">Digital Verification Record</p>
                </div>
            </div>

            {/* Clean Professional Footer */}
            <div className="bg-emerald-50/30 p-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-100">
                <div className="text-left">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Davinci Aviation Billing</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">System Version 4.0.2 • Secure Cryptographic Signature</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest italic decoration-emerald-200 underline underline-offset-4">Confidential Financial Document</p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; margin: 0 !important; padding: 0 !important; }
                    #consolidated-invoice-printable { border: none !important; border-radius: 0 !important; width: 100% !important; min-height: 100vh !important; box-shadow: none !important; }
                    .print\\:hidden { display: none !important; }
                }
            `}} />
        </div>
    );
}
