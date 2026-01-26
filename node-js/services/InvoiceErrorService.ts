import { prisma } from '../src/core/database/prisma.client';
import { generateUniqueNumber } from '../utils/id.utils';

/**
 * Service to handle InvoiceError persistence
 */
export class InvoiceErrorService {
    /**
     * Create an InvoiceError record
     */
    static async create(data: any) {
        console.log(`[InvoiceErrorService] Creating error record for flight ${data.flightId}`);

        // Fallback to minimal persistence if matching schema
        try {
            const errorRecord = await (prisma as any).invoiceError.create({
                data: {
                    ...data,
                    invoiceNumber: generateUniqueNumber('ERR'),
                    flightId: typeof data.flightId === 'bigint' ? data.flightId : BigInt(data.flightId),
                }
            });
            return errorRecord;
        } catch (error) {
            console.error('[InvoiceErrorService] Failed to persist error record:', error);
            return { invoiceNumber: generateUniqueNumber('ERR') };
        }
    }
}

export default InvoiceErrorService;
