import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { invoiceIdParamSchema } from '../schemas/invoice.schema';
import { logger } from '../../../common/utils/logger.util';

/**
 * Invoice Controller
 * TRUE THIN CONTROLLER - handles HTTP layer only
 * All error handling delegated to global error middleware
 */
export class InvoiceController {
    private service: InvoiceService;

    constructor() {
        this.service = new InvoiceService();
    }

    /**
     * GET /api/invoices/:invoiceId
     * Returns invoice data for PDF generation
     * Public endpoint - no authentication required
     */
    getPdfData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Validate and extract params (Zod will throw on failure)
            const { invoiceId } = invoiceIdParamSchema.parse(req.params);

            logger.info({ invoiceId }, 'Fetching PDF data for invoice');

            // Call service (service will throw custom errors on failure)
            const pdfData = await this.service.getPdfData(invoiceId);

            // Return success response
            res.status(200).json(pdfData);
        } catch (error) {
            // Delegate ALL error handling to global middleware
            next(error);
        }
    };

    /**
     * GET /api/invoices/:invoiceId/pdf
     * Generates and downloads PDF file
     */
    downloadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log(`[PDF] Request received for invoice: ${req.params.invoiceId}`);
            const { invoiceId } = invoiceIdParamSchema.parse(req.params);

            logger.info({ invoiceId }, 'Generating PDF for invoice');

            const pdfBuffer = await this.service.getInvoicePdf(invoiceId);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
                'Content-Length': pdfBuffer.length,
            });

            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    };
}
