import { Request, Response } from 'express';
import { ConsolidatedInvoiceService } from '../services/ConsolidatedInvoiceService';
import { ConsolidatedInvoiceScheduler } from '../services/ConsolidatedInvoiceScheduler';
import { logger } from '../../../common/utils/logger.util';

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
            const id = parseInt(req.params.id, 10);

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

            // Authorization check
            // @ts-ignore
            const userOperatorId = req.user?.assignedOperatorId;
            // @ts-ignore
            const isAdmin = req.user?.role?.includes('ADMIN') || req.user?.role?.includes('MANAGER');

            if (!isAdmin && userOperatorId !== invoice.operatorId) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'You can only view your own consolidated invoices',
                });
                return;
            }

            res.json({
                success: true,
                data: invoice,
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
    async getSchedulerStatus(req: Request, res: Response): Promise<void> {
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
    async triggerScheduler(req: Request, res: Response): Promise<void> {
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
}
