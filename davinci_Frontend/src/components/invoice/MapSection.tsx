import { useMemo } from 'react';

interface MapSectionProps {
    mapHtml: string;
}

export function MapSection({ mapHtml }: MapSectionProps) {
    // Check if mapHtml is a web URL
    const isUrl = mapHtml.startsWith('http://') || mapHtml.startsWith('https://');

    // Check if mapHtml is actually a file path
    const isFilePath = !isUrl && (mapHtml.includes('\\') || mapHtml.includes(':/') || !mapHtml.includes('<'));

    if (isFilePath) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Flight Route Map</h3>
                <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-6 text-center">
                    <svg className="w-12 h-12 mx-auto text-amber-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-amber-900 font-medium mb-2">Map file reference detected</p>
                    <p className="text-amber-700 text-sm">
                        File: <code className="bg-amber-100 px-2 py-1 rounded">{mapHtml}</code>
                    </p>
                </div>
            </div>
        );
    }

    // Enhanced HTML with basic CSS fixes only
    const enhancedMapHtml = useMemo(() => {
        if (!mapHtml || isUrl || isFilePath) return mapHtml;

        const styleInjection = `
            <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
                .leaflet-container { background: #e6f7ff !important; width: 100% !important; height: 100% !important; }
            </style>
        `;

        if (mapHtml.includes('</body>')) {
            return mapHtml.replace('</body>', `${styleInjection}</body>`);
        }
        return mapHtml + styleInjection;
    }, [mapHtml, isUrl, isFilePath]);

    return (
        <div className="space-y-3 print:block">
            <h3 className="text-[11px] font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-[0.2em] pl-1">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Flight Path Visualization
            </h3>

            <div className="relative w-full rounded-xl border border-gray-200 bg-white overflow-hidden">
                <iframe
                    src={isUrl ? mapHtml : undefined}
                    srcDoc={!isUrl ? enhancedMapHtml : undefined}
                    className="w-full"
                    style={{
                        height: '350px',
                        border: 'none',
                        minHeight: '350px'
                    }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    title="Flight Route Map"
                />
            </div>
        </div>
    );
}