import { useRef, useEffect } from 'react';
import type { Invoice } from '../../types/invoice';
import { InvoiceTemplateSelector } from './InvoiceTemplateSelector';

interface InvoiceDetailsProps {
    invoice: Invoice;
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
    const printRef = useRef<HTMLDivElement>(null);

    // Add print-specific styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                @page {
                    margin: 0;
                    padding: 0;
                    size: A4;
                }
                
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                /* Hide only the download button during print */
                button {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div
            ref={printRef}
            id="invoice-printable"
            className="bg-white border border-gray-100 rounded-xl overflow-hidden"
            data-printable="true"
        >
            <InvoiceTemplateSelector invoice={invoice} />
        </div>
    );
}