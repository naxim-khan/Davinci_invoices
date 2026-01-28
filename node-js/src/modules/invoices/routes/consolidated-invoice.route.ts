import { Router } from 'express';
import { ConsolidatedInvoiceController } from '../controllers/consolidated-invoice.controller';

const router = Router();
const controller = new ConsolidatedInvoiceController();

/**
 * Consolidated Invoice Routes
 *
 * @route   GET /api/invoices/consolidated
 * @desc    List consolidated invoices with filters
 * @access  Requires CONSOLIDATED_INVOICE_VIEW permission
 */
router.get('/', (req, res) => controller.list(req, res));

/**
 * @route   GET /api/invoices/consolidated/:id
 * @desc    Get single consolidated invoice by ID
 * @access  Requires CONSOLIDATED_INVOICE_VIEW permission
 */
router.get('/:id', (req, res) => controller.getById(req, res));

/**
 * @route   GET /api/invoices/consolidated/:id/pdf
 * @desc    Download consolidated invoice PDF
 * @access  Requires CONSOLIDATED_INVOICE_VIEW permission
 */
router.get('/:id/pdf', (req, res) => controller.downloadPdf(req, res));

/**
 * @route   POST /api/invoices/consolidated/generate
 * @desc    Manually trigger consolidated invoice generation
 * @access  Requires CONSOLIDATED_INVOICE_EDIT or SYSTEM_ADMIN permission
 */
router.post('/generate', (req, res) => controller.generate(req, res));

/**
 * @route   GET /api/invoices/consolidated/scheduler/status
 * @desc    Get scheduler status
 * @access  Requires SYSTEM_ADMIN permission
 */
router.get('/scheduler/status', (req, res) => controller.getSchedulerStatus(req, res));

/**
 * @route   POST /api/invoices/consolidated/scheduler/trigger
 * @desc    Manually trigger scheduler job
 * @access  Requires SYSTEM_ADMIN permission
 */
router.post('/scheduler/trigger', (req, res) => controller.triggerScheduler(req, res));

export default router;
