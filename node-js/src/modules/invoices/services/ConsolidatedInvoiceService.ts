import { addDays } from 'date-fns';
import { logger } from '../../../common/utils/logger.util';
import { BillingPeriodCalculator } from '../utils/BillingPeriodCalculator';
import { ConsolidatedInvoiceNumberGenerator } from '../utils/ConsolidatedInvoiceNumberGenerator';
import { ConsolidatedInvoiceRepository } from '../repositories/ConsolidatedInvoiceRepository';
import {
    ConsolidationMetrics,
    ConsolidationError,
    ConsolidatedInvoiceGenerationResult,
} from '../types/billing-period.types';

/**
 * Consolidated Invoice Service
 *
 * Core business logic for consolidated invoice generation.
 * Handles automatic and manual consolidation with comprehensive edge case handling.
 */
export class ConsolidatedInvoiceService {
    private repository: ConsolidatedInvoiceRepository;
    private numberGenerator: ConsolidatedInvoiceNumberGenerator;

    constructor() {
        this.repository = new ConsolidatedInvoiceRepository();
        this.numberGenerator = new ConsolidatedInvoiceNumberGenerator();
    }

    /**
     * Generate consolidated invoices for all eligible customers
     * This is the main entry point called by the scheduler
     */
    async generateConsolidatedInvoicesForAllCustomers(referenceDate: Date = new Date()): Promise<ConsolidationMetrics> {
        const startTime = Date.now();
        const errors: ConsolidationError[] = [];
        let customersProcessed = 0;
        let invoicesGenerated = 0;
        let totalInvoicesConsolidated = 0;

        logger.info({
            msg: 'Starting consolidated invoice generation for all customers',
            referenceDate: referenceDate.toISOString(),
        });

        try {
            // Find all customers with billing enabled
            const customers = await this.repository.findEligibleCustomers();
            logger.info({
                msg: 'Found eligible customers for consolidation',
                count: customers.length,
            });

            for (const customer of customers) {
                customersProcessed++;

                try {
                    // Check if today is the end of this customer's billing period
                    const isPeriodEnd = BillingPeriodCalculator.isPeriodEnd(customer, referenceDate);

                    if (!isPeriodEnd) {
                        logger.debug({
                            msg: 'Not period end for customer - skipping',
                            customerId: customer.id,
                            customerName: customer.fullLegalNameEntity,
                            billingPeriodType: customer.billingPeriodType,
                        });
                        continue;
                    }

                    // Generate consolidated invoice for this customer
                    const result = await this.generateConsolidatedInvoice(customer.id, undefined, undefined, referenceDate);

                    if (result.success && result.consolidatedInvoice) {
                        invoicesGenerated++;
                        totalInvoicesConsolidated += result.consolidatedInvoice.totalFlights;

                        logger.info({
                            msg: 'Successfully generated consolidated invoice',
                            customerId: customer.id,
                            customerName: customer.fullLegalNameEntity,
                            invoiceNumber: result.consolidatedInvoice.invoiceNumber,
                            totalFlights: result.consolidatedInvoice.totalFlights,
                            totalUsd: result.consolidatedInvoice.totalUsd,
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({
                        customerId: customer.id,
                        customerName: customer.fullLegalNameEntity,
                        error: errorMessage,
                        timestamp: new Date().toISOString(),
                    });

                    logger.error({
                        msg: 'Failed to generate consolidated invoice for customer',
                        customerId: customer.id,
                        customerName: customer.fullLegalNameEntity,
                        error: errorMessage,
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                }
            }
        } catch (error) {
            logger.error({
                msg: 'Critical error during consolidated invoice generation',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
        }

        const executionTimeMs = Date.now() - startTime;

        const metrics: ConsolidationMetrics = {
            customersProcessed,
            invoicesGenerated,
            totalInvoicesConsolidated,
            errors,
            executionTimeMs,
            timestamp: new Date().toISOString(),
        };

        logger.info({
            msg: 'Consolidated invoice generation completed',
            metrics,
        });

        return metrics;
    }

    /**
     * Generate consolidated invoice for a specific customer and period
     * If period not specified, uses current period from BillingPeriodCalculator
     */
    async generateConsolidatedInvoice(
        customerId: number,
        periodStart?: Date,
        periodEnd?: Date,
        referenceDate: Date = new Date(),
    ): Promise<ConsolidatedInvoiceGenerationResult> {
        try {
            // Get customer
            const customer = await this.repository.findCustomerById(customerId);
            if (!customer) {
                return {
                    success: false,
                    error: `Customer not found: ${customerId}`,
                };
            }

            // Validate customer eligibility
            if (!customer.billingPeriodEnabled) {
                return {
                    success: false,
                    message: 'Customer does not have consolidated billing enabled',
                };
            }

            if (customer.status !== 'APPROVED') {
                return {
                    success: false,
                    message: `Customer status is ${customer.status}, must be APPROVED`,
                };
            }

            if (!customer.billingPeriodType) {
                return {
                    success: false,
                    error: 'Customer billing period type not configured',
                };
            }

            // Calculate billing period if not specified
            let billingPeriodStart = periodStart;
            let billingPeriodEnd = periodEnd;

            if (!billingPeriodStart || !billingPeriodEnd) {
                const period = BillingPeriodCalculator.calculateCurrentPeriod(customer, referenceDate);
                billingPeriodStart = period.start;
                billingPeriodEnd = period.end;
            }

            logger.info({
                msg: 'Generating consolidated invoice',
                customerId: customer.id,
                customerName: customer.fullLegalNameEntity,
                billingPeriodStart: billingPeriodStart.toISOString(),
                billingPeriodEnd: billingPeriodEnd.toISOString(),
                billingPeriodType: customer.billingPeriodType,
            });

            // Check for existing consolidated invoice
            const existing = await this.repository.findExistingConsolidatedInvoice(
                customer.id,
                billingPeriodStart,
                billingPeriodEnd,
            );

            if (existing) {
                logger.warn({
                    msg: 'Period already consolidated - skipping',
                    customerId: customer.id,
                    existingInvoiceNumber: existing.invoiceNumber,
                    billingPeriodStart: billingPeriodStart.toISOString(),
                    billingPeriodEnd: billingPeriodEnd.toISOString(),
                });

                return {
                    success: false,
                    message: `Period already consolidated: ${existing.invoiceNumber}`,
                };
            }

            // Find unconsolidated invoices in period
            const invoices = await this.repository.findUnconsolidatedInvoices(
                customer.id,
                billingPeriodStart,
                billingPeriodEnd,
            );

            if (invoices.length === 0) {
                logger.info({
                    msg: 'No unconsolidated invoices found for period - skipping',
                    customerId: customer.id,
                    billingPeriodStart: billingPeriodStart.toISOString(),
                    billingPeriodEnd: billingPeriodEnd.toISOString(),
                });

                return {
                    success: false,
                    message: 'No unconsolidated invoices found for period',
                };
            }

            // Calculate totals
            const totals = await this.repository.calculatePeriodTotals(invoices);

            // Generate invoice number
            const invoiceNumber = await this.numberGenerator.generate(customer.billingPeriodType, billingPeriodStart);

            // Calculate due date (default: 30 days from issue date)
            const paymentTermsDays = parseInt(process.env.CONSOLIDATION_PAYMENT_TERMS_DAYS || '30', 10);
            const issueDate = new Date();
            const dueDate = addDays(issueDate, paymentTermsDays);

            // Create consolidated invoice
            const consolidatedInvoice = await this.repository.createConsolidatedInvoice({
                invoiceNumber,
                issueDate,
                dueDate,
                operatorId: customer.id,
                billingPeriodStart,
                billingPeriodEnd,
                billingPeriodType: customer.billingPeriodType,
                billedToName: customer.fullLegalNameEntity,
                billedToAddress: customer.billingAddress,
                totalFlights: totals.totalFlights,
                totalFeeUsd: totals.totalFeeUsd,
                totalOtherUsd: totals.totalOtherUsd,
                totalUsd: totals.totalUsd,
                firsCrossed: totals.firsCrossed,
                countries: totals.countries,
                qrCodeData: null, // TODO: Generate QR code if needed
                logoKey: null, // TODO: Add logo if needed
                status: 'PENDING',
                autoGenerated: true,
                invoices,
            });

            return {
                success: true,
                consolidatedInvoice: {
                    id: consolidatedInvoice.id,
                    invoiceNumber: consolidatedInvoice.invoiceNumber,
                    totalFlights: consolidatedInvoice.totalFlights,
                    totalUsd: consolidatedInvoice.totalUsd,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error generating consolidated invoice',
                customerId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Get consolidated invoice by ID
     */
    async getConsolidatedInvoiceById(id: number) {
        return this.repository.findById(id);
    }

    /**
     * Get consolidated invoices for a customer with filters
     */
    async getConsolidatedInvoicesForCustomer(
        customerId: number,
        filters?: {
            startDate?: Date;
            endDate?: Date;
            status?: string;
            billingPeriodType?: 'WEEKLY' | 'MONTHLY';
        },
    ) {
        return this.repository.findByCustomer(customerId, filters);
    }

    /**
     * Recalculate totals for an existing consolidated invoice
     * Called when an included invoice is updated
     */
    async recalculateConsolidatedInvoiceTotals(consolidatedInvoiceId: number): Promise<void> {
        try {
            // 1. Get all invoices for this consolidated invoice
            const invoices = await this.repository.findInvoicesByConsolidatedId(consolidatedInvoiceId);

            if (invoices.length === 0) {
                logger.warn({
                    msg: 'No invoices found for consolidated invoice during recalculation',
                    consolidatedInvoiceId,
                });
                return;
            }

            // 2. Calculate new totals
            const totals = await this.repository.calculatePeriodTotals(invoices);

            // 3. Update consolidated invoice
            await this.repository.updateConsolidatedInvoiceTotals(consolidatedInvoiceId, totals);

            logger.info({
                msg: 'Recalculated consolidated invoice totals',
                consolidatedInvoiceId,
                totalFlights: totals.totalFlights,
                totalUsd: totals.totalUsd,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({
                msg: 'Error recalculating consolidated invoice totals',
                consolidatedInvoiceId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
}
