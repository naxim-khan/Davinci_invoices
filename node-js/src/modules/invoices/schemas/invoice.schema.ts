import { z } from 'zod';

/**
 * Schema for validating invoice ID parameter
 * Ensures ID is a positive integer
 */
export const invoiceIdParamSchema = z.object({
    invoiceId: z
        .string()
        .regex(/^\d+$/, 'Invoice ID must be a positive integer')
        .transform((val: string) => parseInt(val, 10))
        .refine((val: number) => val > 0, {
            message: 'Invoice ID must be greater than 0',
        }),
});

export type InvoiceIdParams = z.infer<typeof invoiceIdParamSchema>;
