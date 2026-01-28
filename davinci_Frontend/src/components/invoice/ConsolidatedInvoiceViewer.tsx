
import { useState, useEffect, useCallback } from 'react';
import type { ConsolidatedInvoice } from '../../types/consolidated-invoice';
import { fetchConsolidatedInvoiceById } from '../../services/consolidatedInvoiceService';
import { ConsolidatedInvoiceTemplateSelector } from './ConsolidatedInvoiceTemplateSelector';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function ConsolidatedInvoiceViewer() {
    const [invoiceId, setInvoiceId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || '';
    });
    const [invoice, setInvoice] = useState<ConsolidatedInvoice | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchInvoice = useCallback(async () => {
        if (!invoiceId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchConsolidatedInvoiceById(invoiceId);
            setInvoice(data);

            // Update URL without refreshing
            const url = new URL(window.location.href);
            url.searchParams.set('id', invoiceId);
            window.history.pushState({}, '', url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setInvoice(null);
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    const handleDownloadPdf = async () => {
        if (!invoiceId) return;
        setDownloading(true);
        try {
            window.location.href = `/api/invoices/consolidated/${invoiceId}/pdf`;
        } catch (err) {
            console.error('Failed to download PDF:', err);
            alert('Failed to download PDF. Please try again.');
        } finally {
            // Give it some time before resetting state as it redirects/triggers download
            setTimeout(() => setDownloading(false), 2000);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initialId = params.get('id');
        if (initialId) {
            handleFetchInvoice();
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto print:max-w-none print:w-full">
                {/* Refined Search Bar */}
                <div className="bg-white rounded-lg p-8 mb-8 border border-slate-200 shadow-sm print:hidden">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex-1 w-full">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Consolidated Aviation Billing</h1>
                            <p className="text-sm text-slate-500 font-medium">View and download your consolidated flight records</p>

                            <div className="mt-8 flex gap-3">
                                <input
                                    type="text"
                                    value={invoiceId}
                                    onChange={(e) => setInvoiceId(e.target.value)}
                                    placeholder="Enter Invoice Reference ID"
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50 font-medium text-slate-900"
                                />
                                <button
                                    onClick={handleFetchInvoice}
                                    disabled={loading || !invoiceId}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 transition-all flex items-center gap-2"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search'}
                                </button>
                            </div>
                        </div>

                        {invoice && (
                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={downloading}
                                    className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3 disabled:bg-emerald-400"
                                >
                                    {downloading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    )}
                                    <span className="uppercase tracking-widest text-xs">Download official PDF</span>
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="w-full px-6 py-3 border border-emerald-100 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50/50 transition-all text-xs uppercase tracking-widest"
                                >
                                    Print Document
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {error && <ErrorMessage message={error} />}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <LoadingSpinner />
                        <p className="mt-4 text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Retrieving Secure Record</p>
                    </div>
                )}

                {invoice && !loading && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                        <ConsolidatedInvoiceTemplateSelector invoice={invoice} />
                    </div>
                )}
            </div>
        </div>
    );
}


