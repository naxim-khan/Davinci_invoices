import { useState } from 'react';
import type { Invoice } from '../../types/invoice';
import { getStatusColor } from '../../utils/formatters';
import airplaneImage from '../../assets/airplane_davinci.png';
import InvoiceQr from '../invoices/utils/InvoiceQr';

interface InvoiceHeaderProps {
    invoice: Invoice;
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`http://localhost:3000/api/invoices/${invoice.id}/pdf`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status} ${response.statusText}: ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error: any) {
            console.error('Download failed:', error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-white overflow-hidden">
            {/* Davinci Flight Image Watermark */}
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

            {/* Decorative background circle */}
            <div className="absolute left-[-5%] top-[-60%] w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex justify-between items-center z-10">
                <div className="flex items-center gap-6">
                    {/* Branding/Logo Box */}
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 group hover:bg-white/20 transition-all duration-500">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold tracking-tight">DAVINCI</h2>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/20 ${getStatusColor(invoice.status)}`}>
                                {invoice.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-emerald-50/80 font-medium text-sm">
                            <p className="flex items-center gap-1.5 bg-black/5 px-2.5 py-1 rounded-md">
                                <span className="text-emerald-200/60 font-bold uppercase text-[10px] tracking-wider">ID</span>
                                {invoice.id}
                            </p>
                            <p className="flex items-center gap-1.5">
                                Invoice #{invoice.invoiceNumber}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="print:hidden group relative px-6 py-2.5 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all duration-200 border border-emerald-100 shadow-sm hover:shadow-md active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm">Preparing PDF...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span className="text-sm">Print / Save PDF</span>
                            </>
                        )}
                    </button>
                    
                    {/* QR Code - Right Corner with Rounded Background */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
                        <InvoiceQr invoiceId={invoice.id} size={80} />
                    </div>
                </div>
            </div>
        </div>
    );
}
