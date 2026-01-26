import type { Invoice } from '../../../types/invoice';
import { InvoiceHeader } from '../InvoiceHeader';
import { ClientInfoSection } from '../ClientInfoSection';
import { FlightInfoSection } from '../FlightInfoSection';
import { FirInfoSection } from '../FirInfoSection';
import { FeesBreakdownSection } from '../FeesBreakdownSection';
import { InvoiceFooter } from '../InvoiceFooter';
import { MapSection } from '../MapSection';

interface TemplateProps {
    invoice: Invoice;
}

export function FallbackTemplate({ invoice }: TemplateProps) {
    return (
        <>
            <InvoiceHeader invoice={invoice} />
            <div className="p-8 space-y-2 bg-gradient-to-br from-gray-50 to-white">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
                    <ClientInfoSection invoice={invoice} />
                </div>

                {/* Render map after client information if available */}
                {invoice.mapHtml && (
                    <div data-map-section="true" className="rounded-lg overflow-hidden shadow-sm border border-gray-100">
                        <MapSection
                            mapHtml={invoice.mapHtml}
                        />
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <FlightInfoSection invoice={invoice} />
                </div>

                {/* Page break for PDF */}
                <div style={{ pageBreakBefore: 'always' }} className="print-page-break" />

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <FirInfoSection invoice={invoice} />
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <FeesBreakdownSection invoice={invoice} />
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 pt-2">
                    <InvoiceFooter invoice={invoice} />
                </div>
            </div>
        </>
    );
}
