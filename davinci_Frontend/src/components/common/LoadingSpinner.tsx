export function LoadingSpinner() {
    return (
        <div className="bg-white shadow-lg rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
    );
}
