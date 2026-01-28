
export function Home() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-4xl font-extrabold text-emerald-950 mb-2">
                    Davinci Server
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Invoice Management System
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-4 border border-emerald-100">
                    <a
                        href="/invoice"
                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                    >
                        Single Invoice Viewer
                    </a>

                    <a
                        href="/consolidated-invoice"
                        className="w-full flex justify-center py-4 px-4 border border-emerald-200 rounded-xl shadow-sm text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                    >
                        Consolidated Invoice Viewer
                    </a>
                </div>
            </div>
        </div>
    );
}
