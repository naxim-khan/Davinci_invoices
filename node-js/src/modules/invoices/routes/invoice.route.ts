import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';

/**
 * Invoice Routes
 * Defines all invoice-related endpoints
 */
const router = Router();
const invoiceController = new InvoiceController();

/**
 * GET /api/invoices/:invoiceId
 * Get invoice data for PDF generation
 * Public endpoint - no authentication required
 */
// Get invoice data
router.get('/:invoiceId', invoiceController.getPdfData);

/**
 * GET /api/invoices/:invoiceId/pdf
 * Download invoice PDF
 */
router.get('/:invoiceId/pdf', invoiceController.downloadPdf);

export default router;
