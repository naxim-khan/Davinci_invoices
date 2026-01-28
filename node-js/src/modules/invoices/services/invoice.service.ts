import { Invoice } from '@prisma/client';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PdfService } from './pdf.service';
import { InvoicePdfDataResponse } from '../types/invoice.types';
import { InvoiceNotFoundError } from '../errors/invoice.errors';

/**
 * Invoice Service
 * Contains all business logic for invoice operations
 * No direct database access - uses repository pattern
 */
export class InvoiceService {
    private repository: InvoiceRepository;
    private pdfService: PdfService;

    constructor() {
        this.repository = new InvoiceRepository();
        this.pdfService = new PdfService();
    }

    /**
     * Generate binary PDF for an invoice
     * 
     * @param invoiceId - Invoice ID
     * @returns Buffer containing PDF data
     */
    async getInvoicePdf(invoiceId: number): Promise<Buffer> {
        // We verify the invoice exists first
        const invoice = await this.repository.findById(invoiceId);
        if (!invoice) {
            throw new InvoiceNotFoundError(invoiceId);
        }

        // Delegate to PDF Service (it will visit the frontend)
        return this.pdfService.generateInvoicePdf(invoiceId);
    }

    /**
     * Get invoice data formatted for PDF generation
     * Handles all null values safely and formats dates to ISO strings
     * Joins with FIR table to get invoiceTemplate
     * 
     * @param invoiceId - Invoice ID to fetch
     * @returns PDF-ready invoice data
     * @throws InvoiceNotFoundError if invoice doesn't exist
     */
    async getPdfData(invoiceId: number): Promise<InvoicePdfDataResponse> {
        // Fetch invoice from repository with FIR template
        const invoice = await this.repository.findByIdWithTemplate(invoiceId);

        if (!invoice) {
            throw new InvoiceNotFoundError(invoiceId);
        }

        // Transform to PDF-ready structure with safe null handling
        return this.transformToPdfData(invoice);
    }

    /**
     * Transform raw invoice entity to flat response structure
     * Matches database schema exactly - no grouping
     * All dates converted to ISO strings, safe null handling
     * 
     * @param invoice - Raw invoice from database with template
     * @returns Flat invoice data
     */
    private transformToPdfData(invoice: Invoice & { invoiceTemplate: string | null }): InvoicePdfDataResponse {
        return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate.toISOString(),
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            status: invoice.status,
            clientName: invoice.clientName,
            clientAddress: invoice.clientAddress ?? null,
            mapHtml: invoice.mapHtml ?? null,
            flightNumber: invoice.flightNumber ?? null,
            originIcao: invoice.originIcao ?? null,
            destinationIcao: invoice.destinationIcao ?? null,
            originIata: invoice.originIata ?? null,
            destinationIata: invoice.destinationIata ?? null,
            registrationNumber: invoice.registrationNumber ?? null,
            aircraftModelName: invoice.aircraftModelName ?? null,
            flightDate: invoice.flightDate ? invoice.flightDate.toISOString() : null,
            firName: invoice.firName ?? null,
            firCountry: invoice.firCountry ?? null,
            firEntryTimeUtc: invoice.firEntryTimeUtc ? invoice.firEntryTimeUtc.toISOString() : null,
            firExitTimeUtc: invoice.firExitTimeUtc ? invoice.firExitTimeUtc.toISOString() : null,
            feeDescription: invoice.feeDescription ?? null,
            feeAmount: invoice.feeAmount ?? 0,
            // otherFeesAmount: invoice.otherFeesAmount ?? 0,
            otherFeesAmount: invoice.otherFeesAmount ?? null, // Json type - can be object or null
            totalOriginalAmount: invoice.totalOriginalAmount ?? 0,
            originalCurrency: invoice.originalCurrency ?? null,
            fxRate: invoice.fxRate ?? null,
            totalUsdAmount: invoice.totalUsdAmount ?? 0,
            qrCodeData: invoice.qrCodeData ?? null,
            logoKey: invoice.logoKey ?? null,
            createdAt: invoice.createdAt.toISOString(),
            updatedAt: invoice.updatedAt.toISOString(),
            act: invoice.act ?? null,
            flightId: invoice.flightId.toString(), // Convert BigInt to string
            modeSHex: invoice.modeSHex ?? null,
            alic: invoice.alic ?? null,
            operatorId: invoice.operatorId ?? null,
            includedInConsolidatedInvoiceId: invoice.includedInConsolidatedInvoiceId ?? null,
            invoiceTemplate: invoice.invoiceTemplate ?? null,
            isReplacement: invoice.isReplacement ?? false,
            revisionRequired: invoice.revisionRequired ?? false,
            currentRevisionNumber: invoice.currentRevisionNumber ?? 0,
            originalInvoiceId: invoice.originalInvoiceId ?? null,
            replacementSuffix: invoice.replacementSuffix ?? null,
        };
    }
}
