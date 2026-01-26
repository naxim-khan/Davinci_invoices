import type { Invoice } from '../../types/invoice';

interface FlightInfoSectionProps {
    invoice: Invoice;
}

export function FlightInfoSection({ invoice }: FlightInfoSectionProps) {
    const flightDetails = [
        {
            label: 'Flight Number',
            value: invoice.flightNumber,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        },
        {
            label: 'Aircraft',
            value: invoice.aircraftModelName,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        },
        {
            label: 'Registration',
            value: invoice.registrationNumber,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
        },
        {
            label: 'Origin ICAO',
            value: invoice.originIcao,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        },
        {
            label: 'Destination ICAO',
            value: invoice.destinationIcao,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        },
        {
            label: 'Origin IATA',
            value: invoice.originIata,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        },
        {
            label: 'Destination IATA',
            value: invoice.destinationIata,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        },
        {
            label: 'Aircraft Type',
            value: invoice.act,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
            label: 'Mode S Hex',
            value: invoice.modeSHex,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        },
        {
            label: 'ALIC',
            value: invoice.alic,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        },
    ];

    return (
        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <h3 className="text-sm font-semibold text-emerald-900">Flight Information</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {flightDetails.map((detail, index) => (
                    <div key={index} className="bg-white rounded-lg p-2.5 border border-emerald-100/50 hover:border-emerald-200 transition-colors">
                        <p className="text-xs text-emerald-600/80 font-medium flex items-center gap-1.5">
                            <span className="text-emerald-500">{detail.icon}</span>
                            {detail.label}
                        </p>
                        <p className="text-sm text-gray-900 font-medium mt-0.5 truncate" title={detail.value || 'N/A'}>
                            {detail.value || 'N/A'}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
