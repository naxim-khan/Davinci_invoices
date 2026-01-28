import type { Invoice } from '../../types/invoice';

interface InvoiceFooterProps {
    invoice: Invoice;
}

export function InvoiceFooter({ invoice }: InvoiceFooterProps) {
    return (
        <div className="mt-6 border-t-2 border-emerald-200">
            {/* Payment Terms & Notes */}
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-4 mt-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-emerald-900">Payment Terms & Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <p className="text-emerald-700 font-medium">Payment Instructions:</p>
                        <p className="text-gray-700">Payment is due within 30 days of invoice date.</p>
                        <p className="text-gray-700">Please reference invoice number in payment details.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-emerald-700 font-medium">Accepted Payment Methods:</p>
                        <p className="text-gray-700">• Bank Transfer (Wire/ACH)</p>
                        <p className="text-gray-700">• International Swift Transfer</p>
                    </div>
                </div>
            </div>

            {/* Company Information Footer */}
            <div className="bg-linear-to-r from-emerald-400 to-teal-500 rounded-b-lg mt-4 p-6 pt-2 text-white">
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                    {/* Company Info */}
                    <div>
                        <h4 className="font-bold text-base mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            DaVinci Aviation Services
                        </h4>
                        <p className="text-emerald-50">Your trusted partner for</p>
                        <p className="text-emerald-50">aviation navigation services</p>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Contact Us
                        </h4>
                        <p className="text-emerald-50 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            +1 (555) 123-4567
                        </p>
                        <p className="text-emerald-50 flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            billing@davinci-aviation.com
                        </p>
                    </div>

                    {/* Additional Info */}
                    <div>
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Support
                        </h4>
                        <p className="text-emerald-50">Business Hours:</p>
                        <p className="text-emerald-50">Mon-Fri: 9:00 AM - 6:00 PM UTC</p>
                        <p className="text-emerald-50 mt-1 text-xs">Invoice ID: {String(invoice.id)}</p>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-2 pt-4 border-t border-emerald-300/30 flex justify-between items-center text-xs">
                    <p className="text-emerald-100">© 2026 DaVinci Aviation Services. All rights reserved.</p>
                    <p className="text-emerald-100">Generated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
}
