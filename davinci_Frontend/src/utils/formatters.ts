export const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export const formatCurrency = (amount: number, currency?: string | null) => {
    return `${currency || 'USD'} ${amount.toFixed(2)}`;
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
