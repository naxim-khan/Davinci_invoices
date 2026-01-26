import { useState, useEffect, useCallback } from 'react';
import type { Invoice } from '../../types/invoice';
import { fetchInvoiceById } from '../../services/invoiceService';
import { SearchBar } from './SearchBar';
import { InvoiceDetails } from './InvoiceDetails';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export function InvoiceViewer() {
    // Initialize from URL query param or default to '23'
    const [invoiceId, setInvoiceId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || '23';
    });
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchInvoice = useCallback(async () => {
        if (!invoiceId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchInvoiceById(invoiceId);
            setInvoice(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setInvoice(null);
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        handleFetchInvoice();
    }, [handleFetchInvoice]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto print:max-w-none print:w-full">
                <SearchBar
                    invoiceId={invoiceId}
                    onInvoiceIdChange={setInvoiceId}
                    onSearch={handleFetchInvoice}
                    loading={loading}
                />

                {error && <ErrorMessage message={error} />}

                {invoice && !loading && <InvoiceDetails invoice={invoice} />}

                {loading && <LoadingSpinner />}

                {!invoice && !loading && !error && <EmptyState />}
            </div>
        </div>
    );
}
