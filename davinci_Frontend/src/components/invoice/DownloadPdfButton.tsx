import { useState } from 'react';
import type { Invoice } from '../../types/invoice';

interface DownloadPdfButtonProps {
    invoice: Invoice;
    className?: string;
    variant?: 'emerald' | 'blue' | 'red' | 'gold'; // Basic theme support
}

export function DownloadPdfButton({ invoice, className = '', variant = 'emerald' }: DownloadPdfButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            // Using window.location.origin to support both dev and prod if on same domain, 
            // otherwise fallback to specific URL logic if needed. 
            // For now matching the original hardcoded localhost:3000 logic or relative path.
            // Original code used: http://localhost:3000/api/invoices/${invoice.id}/pdf
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

    // Color definitions based on variant
    const colorClasses = {
        emerald: "bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-100",
        blue: "bg-white text-blue-900 hover:bg-blue-50 border-blue-100",
        red: "bg-white text-red-700 hover:bg-red-50 border-red-100",
        gold: "bg-blue-950 text-yellow-500 hover:bg-blue-900 border-yellow-600",
    };

    const baseClasses = "print:hidden group relative px-6 py-2.5 rounded-xl font-bold transition-all duration-200 border shadow-sm hover:shadow-md active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed";
    const selectedColor = colorClasses[variant] || colorClasses.emerald;

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={`${baseClasses} ${selectedColor} ${className}`}
        >
            {isGenerating ? (
                <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    );
}
