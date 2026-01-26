interface SearchBarProps {
    invoiceId: string;
    onInvoiceIdChange: (value: string) => void;
    onSearch: () => void;
    loading: boolean;
}

export function SearchBar({ invoiceId, onInvoiceIdChange, onSearch, loading }: SearchBarProps) {
    return (
        <div className="bg-white rounded-2xl p-6 mb-6 border border-emerald-100 print:hidden">
            <h1 className="text-3xl font-extrabold text-emerald-950 mb-5 tracking-tight">Invoice Viewer</h1>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={invoiceId}
                        onChange={(e) => onInvoiceIdChange(e.target.value)}
                        placeholder="Enter Invoice ID (e.g. 23)"
                        className="w-full px-5 py-3 border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:outline-none transition-all duration-200 bg-emerald-50/30 font-medium"
                    />
                </div>
                <button
                    onClick={onSearch}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-300 disabled:to-teal-300 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 cursor-pointer flex items-center gap-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                    {loading ? 'Fetching...' : 'Fetch Invoice'}
                </button>
            </div>
        </div>
    );
}
