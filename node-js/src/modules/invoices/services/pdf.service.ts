import { chromium, Browser } from 'playwright';
import { logger } from '../../../common/utils/logger.util';

export class PdfService {
    private static browser: Browser | null = null;

    /**
     * Get or launch the browser instance (Singleton)
     */
    private async getBrowser(): Promise<Browser> {
        if (!PdfService.browser || !PdfService.browser.isConnected()) {
            logger.info('Launching new Playwright browser instance...');
            PdfService.browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        return PdfService.browser;
    }

    /**
     * Generate Invoice PDF by visiting the frontend
     * @param invoiceId The ID of the invoice to render
     * @returns PDF Buffer
     */
    public async generateInvoicePdf(invoiceId: number): Promise<Buffer> {
        const browser = await this.getBrowser();
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        try {
            // Construct Frontend URL
            // We use port 5174 as we started a dedicated instance for PDF generation there to ensure reliability
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            const targetUrl = `${frontendUrl}/invoice?id=${invoiceId}`;

            logger.info({ targetUrl }, 'Navigating to frontend for PDF generation');

            // Navigate to the invoice page
            await page.goto(targetUrl, { waitUntil: 'networkidle' });

            // Wait for the invoice content to load (look for the printable area or a specific data element)
            // We wait for the invoice-printable ID which confirms data is loaded
            await page.waitForSelector('#invoice-printable', { timeout: 30000 });

            // Hide the "Print / Save PDF" button and any other interactive elements that shouldn't be in the PDF
            // usage of evaluate allows us to manipulate DOM before printing
            await page.evaluate(() => {
                // @ts-ignore - document/window are available in browser context
                const buttons = document.querySelectorAll('button');
                // @ts-ignore
                buttons.forEach(b => b.style.display = 'none');

                // Add a marker class to body if allowed, though print styles should handle it
                // @ts-ignore
                document.body.classList.add('is-printing-pdf');
            });

            // Give a small buffer for any maps or images to finalize rendering
            await page.waitForTimeout(2000);

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px',
                },
            });

            return Buffer.from(pdfBuffer);

        } catch (error) {
            logger.error({ error, invoiceId }, 'Failed to generate invoice PDF via frontend');
            throw error;
        } finally {
            await page.close();
            await context.close();
        }
    }
    /**
     * Generate Consolidated Invoice PDF by visiting the frontend
     */
    public async generateConsolidatedInvoicePdf(consolidatedInvoiceId: number): Promise<Buffer> {
        const browser = await this.getBrowser();
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        try {
            // Construct Frontend URL
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            // Assuming the frontend route for consolidated invoice is /consolidated-invoice?id=X
            const targetUrl = `${frontendUrl}/consolidated-invoice?id=${consolidatedInvoiceId}`;

            logger.info({ targetUrl }, 'Navigating to frontend for Consolidated PDF generation');

            // Navigate to the invoice page
            await page.goto(targetUrl, { waitUntil: 'networkidle' });

            // Wait for the content to load
            await page.waitForSelector('#consolidated-invoice-printable', { timeout: 30000 });

            // Hide buttons and interactive elements
            await page.evaluate(() => {
                // @ts-ignore
                const buttons = document.querySelectorAll('button');
                // @ts-ignore
                buttons.forEach(b => b.style.display = 'none');
                // @ts-ignore
                document.body.classList.add('is-printing-pdf');
            });

            // Buffer for rendering
            await page.waitForTimeout(2000);

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px',
                },
            });

            return Buffer.from(pdfBuffer);

        } catch (error) {
            logger.error({ error, consolidatedInvoiceId }, 'Failed to generate consolidated invoice PDF via frontend');
            throw error;
        } finally {
            await page.close();
            await context.close();
        }
    }
}
