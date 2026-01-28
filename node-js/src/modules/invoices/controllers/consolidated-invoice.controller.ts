import { Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { ConsolidatedInvoiceService } from '../services/ConsolidatedInvoiceService';
import { ConsolidatedInvoiceScheduler } from '../services/ConsolidatedInvoiceScheduler';
import { PdfService } from '../services/pdf.service';
import { logger } from '../../../common/utils/logger.util';
import { prisma } from '../../../core/database/prisma.client';

/**
 * Consolidated Invoice Controller
 *
 * Handles HTTP requests for consolidated invoice operations.
 */
export class ConsolidatedInvoiceController {
    private consolidatedInvoiceService: ConsolidatedInvoiceService;

    constructor() {
        this.consolidatedInvoiceService = new ConsolidatedInvoiceService();
    }

    /**
     * GET /api/invoices/consolidated
     * List consolidated invoices with filters
     */
    async list(req: Request, res: Response): Promise<void> {
        try {
            const {
                operatorId,
                startDate,
                endDate,
                status,
                billingPeriodType,
            } = req.query;

            // Authorization: Operators can only see their own invoices
            // @ts-ignore - Assuming auth middleware sets req.user
            const userOperatorId = req.user?.assignedOperatorId;
            // @ts-ignore
            const isAdmin = req.user?.role?.includes('ADMIN') || req.user?.role?.includes('MANAGER');

            let targetOperatorId: number | undefined;

            if (operatorId) {
                targetOperatorId = parseInt(operatorId as string, 10);

                // If user is not admin, they can only view their own invoices
                if (!isAdmin && userOperatorId !== targetOperatorId) {
                    res.status(403).json({
                        error: 'Forbidden',
                        message: 'You can only view your own consolidated invoices',
                    });
                    return;
                }
            } else if (userOperatorId && !isAdmin) {
                // If no operatorId specified and user is operator, default to their own
                targetOperatorId = userOperatorId;
            }

            if (!targetOperatorId) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'operatorId is required',
                });
                return;
            }

            const filters = {
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                status: status as string | undefined,
                billingPeriodType: billingPeriodType as 'WEEKLY' | 'MONTHLY' | undefined,
            };

            const invoices = await this.consolidatedInvoiceService.getConsolidatedInvoicesForCustomer(
                targetOperatorId,
                filters,
            );

            res.json({
                success: true,
                data: invoices,
                meta: {
                    total: invoices.length,
                },
            });
        } catch (error) {
            logger.error({
                msg: 'Error listing consolidated invoices',
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to retrieve consolidated invoices',
            });
        }
    }

    /**
     * GET /api/invoices/consolidated/:id
     * Get single consolidated invoice with details
     */
    async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid invoice ID',
                });
                return;
            }

            const invoice = await this.consolidatedInvoiceService.getConsolidatedInvoiceById(id);

            if (!invoice) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Consolidated invoice not found',
                });
                return;
            }



            // Public endpoint - no authentication check required

            // Transform and serialize for frontend
            // 1. Handle BigInt serialization and ensure numbers for amounts
            const serialized = JSON.parse(JSON.stringify(invoice, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v
            ));

            // Ensure totals are valid numbers (prevent NaN in frontend)
            serialized.totalUsd = typeof invoice.totalUsd === 'number' ? invoice.totalUsd : 0;
            serialized.totalFeeUsd = typeof invoice.totalFeeUsd === 'number' ? invoice.totalFeeUsd : 0;
            serialized.totalOtherUsd = typeof invoice.totalOtherUsd === 'number' ? invoice.totalOtherUsd : 0;

            // Add default template (allows frontend to "pick the design")
            serialized.invoiceTemplate = "1";

            // 1.5 Add Executive Summary for frontend display
            serialized.summary = {
                baseOperations: serialized.totalFeeUsd || 0,
                ancillaryCharges: serialized.totalOtherUsd || 0,
                totalBalance: serialized.totalUsd || 0
            };

            // 2. Map ConsolidatedInvoiceLineItem to flattened 'invoices' array for frontend
            if (serialized.ConsolidatedInvoiceLineItem) {
                serialized.invoices = serialized.ConsolidatedInvoiceLineItem.map((item: any) => ({
                    id: item.invoiceId,
                    invoiceNumber: item.invoiceNumber,
                    flightNumber: item.act, // Using valid 'act' from line item
                    flightDate: item.date,
                    totalUsdAmount: typeof item.totalUsd === 'number' ? item.totalUsd : 0,
                }));
                delete serialized.ConsolidatedInvoiceLineItem;
            }

            res.json({
                success: true,
                data: serialized,
            });
        } catch (error) {
            logger.error({
                msg: 'Error retrieving consolidated invoice',
                invoiceId: req.params.id,
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to retrieve consolidated invoice',
            });
        }
    }

    /**
     * POST /api/invoices/consolidated/generate
     * Manually trigger consolidated invoice generation
     */
    async generate(req: Request, res: Response): Promise<void> {
        try {
            const { operatorId, periodStart, periodEnd } = req.body;

            if (!operatorId) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'operatorId is required',
                });
                return;
            }

            const result = await this.consolidatedInvoiceService.generateConsolidatedInvoice(
                parseInt(operatorId, 10),
                periodStart ? new Date(periodStart) : undefined,
                periodEnd ? new Date(periodEnd) : undefined,
            );

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Consolidated invoice generated successfully',
                    consolidatedInvoice: result.consolidatedInvoice,
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || result.error,
                });
            }
        } catch (error) {
            logger.error({
                msg: 'Error generating consolidated invoice',
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to generate consolidated invoice',
            });
        }
    }

    /**
     * GET /api/invoices/consolidated/scheduler/status
     * Get scheduler status
     */
    async getSchedulerStatus(_req: Request, res: Response): Promise<void> {
        try {
            const scheduler = ConsolidatedInvoiceScheduler.getInstance();
            const status = scheduler.getStatus();

            res.json({
                success: true,
                data: status,
            });
        } catch (error) {
            logger.error({
                msg: 'Error getting scheduler status',
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to get scheduler status',
            });
        }
    }

    /**
     * POST /api/invoices/consolidated/scheduler/trigger
     * Manually trigger scheduler job
     */
    async triggerScheduler(_req: Request, res: Response): Promise<void> {
        try {
            const scheduler = ConsolidatedInvoiceScheduler.getInstance();

            // Trigger asynchronously and return immediately
            scheduler.triggerManually().catch((error) => {
                logger.error({
                    msg: 'Error in manual scheduler trigger',
                    error: error instanceof Error ? error.message : String(error),
                });
            });

            res.json({
                success: true,
                message: 'Scheduler job triggered successfully',
            });
        } catch (error) {
            logger.error({
                msg: 'Error triggering scheduler',
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to trigger scheduler',
            });
        }
    }

    /**
     * GET /api/invoices/consolidated/:id/pdf
     * Download consolidated invoice PDF
     */
    async downloadPdf(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid invoice ID',
                });
                return;
            }

            // 1. Get Invoice Data
            const invoice = await this.consolidatedInvoiceService.getConsolidatedInvoiceById(id);

            if (!invoice) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Consolidated invoice not found',
                });
                return;
            }

            // Public endpoint - no authentication check required
            // (Removed strict operator ID check for viewer compatibility)

            // 2. Generate QR Code if missing
            if (!invoice.qrCodeData) {
                logger.info({ msg: 'Generating QR code for consolidated invoice', id });
                // Generate QR containing the invoice number or a verification URL
                const qrData = invoice.invoiceNumber;
                const qrCodeData = await QRCode.toDataURL(qrData);

                // Update database
                await prisma.consolidatedInvoice.update({
                    where: { id: invoice.id },
                    data: { qrCodeData },
                });
            }

            // 3. Generate PDF
            const pdfService = new PdfService();
            const pdfBuffer = await pdfService.generateConsolidatedInvoicePdf(id);

            // 4. Send Response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
            res.send(pdfBuffer);

        } catch (error) {
            logger.error({
                msg: 'Error downloading consolidated invoice PDF',
                invoiceId: req.params.id,
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to generate PDF',
            });
        }
    }
}
