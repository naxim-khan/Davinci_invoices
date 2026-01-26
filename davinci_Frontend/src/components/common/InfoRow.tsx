interface InfoRowProps {
    label: string;
    value: string | null | undefined;
}

export function InfoRow({ label, value }: InfoRowProps) {
    return (
        <div className="flex justify-between py-1">
            <span className="text-gray-600 text-sm">{label}:</span>
            <span className="text-gray-900 font-medium text-sm">{value || 'N/A'}</span>
        </div>
    );
}
