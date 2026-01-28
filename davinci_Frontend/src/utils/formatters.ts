export const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Helper to safely sum otherFeesAmount which can be number, array, or JSON object
export const calculateTotalOtherFees = (otherFees: any): number => {
    if (!otherFees) return 0;

    // If it's an array of fee objects (database format)
    if (Array.isArray(otherFees)) {
        return otherFees.reduce((sum: number, item: any) => {
            if (item && typeof item === 'object') {
                // Prefer USD amount if available, otherwise use original amount
                const amount = item.amount_usd || item.amount || 0;
                return sum + (typeof amount === 'number' ? amount : 0);
            }
            return sum;
        }, 0);
    }

    if (typeof otherFees === 'number') return otherFees;
    if (typeof otherFees === 'object') {
        // Sum all values if it's an object (legacy format)
        return Object.values(otherFees).reduce((sum: number, val: any) => {
            return sum + (typeof val === 'number' ? val : 0);
        }, 0);
    }
    return 0;
};

export const formatCurrency = (amount: number | null | undefined, currency?: string | null) => {
    const val = typeof amount === 'number' ? amount : 0;
    return `${currency || 'USD'} ${val.toFixed(2)}`;
};

export const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        PAID: 'bg-green-100 text-green-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
        OVERDUE: 'bg-red-100 text-red-800',
        DRAFT: 'bg-gray-100 text-gray-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
