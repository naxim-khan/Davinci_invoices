import type { Invoice } from '../../types/invoice';

interface PayNowButtonProps {
    invoice: Invoice;
    className?: string;
    variant?: 'green' | 'blue' | 'red' | 'gold' | 'white';
}

export function PayNowButton({ invoice, className = '', variant = 'green' }: PayNowButtonProps) {
    const paymentUrl = `https://portal.davinci-aviation.com/pay/${invoice.id}`;

    // Variant styles
    const styles = {
        green: 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700',
        blue: 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700',
        red: 'bg-red-600 text-white border-red-700 hover:bg-red-700',
        gold: 'bg-yellow-500 text-blue-950 border-yellow-600 hover:bg-yellow-400',
        white: 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50',
    };

    const selectedStyle = styles[variant] || styles.green;

    return (
        <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
                inline-flex items-center gap-3 px-4 py-1.5 rounded-lg font-bold border shadow-sm transition-all duration-200
                active:scale-95 no-underline hover:shadow-md
                print:block print:no-underline print:px-4 print:py-1.5 print:border-2
                ${selectedStyle}
                ${className}
            `}
            style={{ textDecoration: 'none' }}
        >
            {/* Credit Card Icon */}
            <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>

            <div className="flex items-baseline gap-2 leading-none">
                <span className="text-xs uppercase tracking-widest font-semibold opacity-90">Pay Now</span>
                <span className="text-base font-mono">
                    ${invoice.totalUsdAmount?.toFixed(2) ?? '0.00'}
                </span>
            </div>
        </a>
    );
}
