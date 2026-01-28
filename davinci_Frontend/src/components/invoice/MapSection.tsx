import { useMemo, useEffect } from 'react';

interface MapSectionProps {
    mapHtml: string | null;
}

export function MapSection({ mapHtml }: MapSectionProps) {
    // Diagnostic log to see what's coming from the API
    useEffect(() => {
        console.log('MapSection Content:', mapHtml?.slice(0, 100) + ((mapHtml?.length ?? 0) > 100 ? '...' : ''));
    }, [mapHtml]);

    // Backend origin for relative paths
    const backendOrigin = 'http://localhost:3000';

    // Check if mapHtml is a web URL (including relative ones)
    const isUrl = useMemo(() => {
        if (!mapHtml) return false;
        // Explicit protocols or absolute paths
        if (mapHtml.startsWith('http://') || mapHtml.startsWith('https://') || mapHtml.startsWith('/')) {
            return true;
        }
        // Relative paths like "maps/route.html"
        if (mapHtml.startsWith('./') || (mapHtml.includes('.') && !mapHtml.includes('<') && !mapHtml.includes('\\') && mapHtml.length < 255)) {
            return true;
        }
        return false;
    }, [mapHtml]);

    // Resolve the final URL if it is one
    const resolvedUrl = useMemo(() => {
        if (!isUrl || !mapHtml) return undefined;
        if (mapHtml.startsWith('http')) return mapHtml;
        // If it starts with /api, the Vite proxy handles it
        if (mapHtml.startsWith('/api')) return mapHtml;
        // Otherwise, prepend backend origin for relative paths
        const cleanPath = mapHtml.startsWith('./') ? mapHtml.slice(2) : (mapHtml.startsWith('/') ? mapHtml.slice(1) : mapHtml);
        return `${backendOrigin}/${cleanPath}`;
    }, [isUrl, mapHtml]);

    // Check if mapHtml is actually a file path
    const isFilePath = useMemo(() => {
        if (!mapHtml || isUrl) return false;
        return (mapHtml.includes('\\') || mapHtml.includes(':/') || !mapHtml.includes('<'));
    }, [mapHtml, isUrl]);

    // Show fallback if no mapHtml provided
    if (!mapHtml || mapHtml.trim() === '') {
        return (
            <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-[0.2em] pl-1">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Flight Path Visualization
                </h3>
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 p-6 text-center shadow-sm">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-gray-700 font-medium mb-1">Flight Route Map</p>
                    <p className="text-gray-500 text-sm">
                        Map visualization not available for this flight
                    </p>
                </div>
            </div>
        );
    }

    if (isFilePath) {
        return (
            <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-[0.2em] pl-1">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Flight Path Visualization
                </h3>
                <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-6 text-center shadow-sm">
                    <svg className="w-12 h-12 mx-auto text-amber-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-amber-900 font-medium mb-1">Local Reference Detected</p>
                    <p className="text-amber-600 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
                        Preview unavailable in cloud mode<br />
                        <span className="opacity-60 text-[9px] font-mono mt-1 block">{mapHtml}</span>
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
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; }
                #map, .leaflet-container { background: #f8fafc !important; width: 100% !important; height: 100% !important; }
            </style>
        `;

        // Robust HTML structure injection
        if (mapHtml.includes('<head>')) {
            return mapHtml.replace('<head>', `<head>${styleInjection}`);
        } else if (mapHtml.includes('</body>')) {
            return mapHtml.replace('</body>', `${styleInjection}</body>`);
        } else if (mapHtml.includes('<html>')) {
            return mapHtml.replace('<html>', `<html><head>${styleInjection}</head>`);
        }

        return `<!DOCTYPE html><html><head>${styleInjection}</head><body>${mapHtml}</body></html>`;
    }, [mapHtml, isUrl, isFilePath]);

    return (
        <div className="space-y-3 print:block">
            <h3 className="text-[11px] font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-[0.2em] pl-1">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Flight Path Visualization
            </h3>

            <div className="relative w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-inner">
                <iframe
                    src={resolvedUrl}
                    srcDoc={!isUrl ? enhancedMapHtml : undefined}
                    className="w-full"
                    style={{
                        height: '400px',
                        border: 'none',
                        minHeight: '400px'
                    }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    title="Flight Route Map"
                />
            </div>
        </div>
    );
}