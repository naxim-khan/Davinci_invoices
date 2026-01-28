/**
 * Helper functions for invoice data formatting and display
 */

export interface FeeLineItem {
    label: string;
    amount: number; // USD amount
    originalAmount?: number; // Original amount in local currency
    currency?: string; // Original currency
    description?: string; // Fee description
}

/**
 * Formats the otherFeesAmount field (which can be number, object, or null)
 * into an array of line items for display
 */
export function formatOtherFeesBreakdown(otherFeesAmount: any): FeeLineItem[] {
    // Debug logging
    console.log('formatOtherFeesBreakdown called with:', otherFeesAmount);
    console.log('Type:', typeof otherFeesAmount);
    console.log('Is Array:', Array.isArray(otherFeesAmount));

    if (!otherFeesAmount) {
        console.log('No otherFeesAmount, returning empty array');
        return [];
    }

    // If it's an array of fee objects (database format)
    // Example: [{ "name": "Tax", "amount": 100, "currency": "AED", "amount_usd": 27.23, "description": "..." }]
    if (Array.isArray(otherFeesAmount)) {
        console.log('otherFeesAmount is an array, processing fee objects');
        console.log('Raw array items:', JSON.stringify(otherFeesAmount, null, 2));
        const result = otherFeesAmount
            .filter((item: any) => item && typeof item === 'object' && item.name && typeof item.amount === 'number')
            .map((item: any) => {
                console.log('Processing item:', item);
                console.log('  - name:', item.name);
                console.log('  - description:', item.description);
                console.log('  - amount:', item.amount);
                console.log('  - amount_usd:', item.amount_usd);
                console.log('  - currency:', item.currency);
                return {
                    label: item.name,
                    amount: item.amount_usd || item.amount || 0, // USD amount for display
                    originalAmount: item.amount, // Original amount
                    currency: item.currency, // Currency code
                    description: item.description // Description if available
                };
            });
        console.log('Formatted array breakdown result:', JSON.stringify(result, null, 2));
        return result;
    }

    // If it's just a number, return a single generic line item
    if (typeof otherFeesAmount === 'number') {
        console.log('otherFeesAmount is a number:', otherFeesAmount);
        return [{ label: 'Other Fees', amount: otherFeesAmount }];
    }

    // If it's an object (legacy format), convert each key-value pair to a line item
    if (typeof otherFeesAmount === 'object') {
        console.log('otherFeesAmount is an object:', Object.entries(otherFeesAmount));
        const result = Object.entries(otherFeesAmount)
            .filter(([_, value]) => typeof value === 'number')
            .map(([key, value]) => ({
                label: formatFeeLabel(key),
                amount: value as number
            }));
        console.log('Formatted object breakdown result:', result);
        return result;
    }

    console.log('otherFeesAmount type not handled, returning empty array');
    return [];
}

/**
 * Converts camelCase or snake_case keys to readable labels
 * e.g., "landingFee" -> "Landing Fee", "parking_fee" -> "Parking Fee"
 */
function formatFeeLabel(key: string): string {
    // Replace underscores with spaces
    let label = key.replace(/_/g, ' ');

    // Insert space before capital letters (for camelCase)
    label = label.replace(/([A-Z])/g, ' $1');

    // Capitalize first letter of each word
    label = label
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return label;
}
