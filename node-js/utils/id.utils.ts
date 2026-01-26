/**
 * Generate a unique number with a prefix (e.g., INV-123456789)
 */
export function generateUniqueNumber(prefix: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}${random}`;
}
