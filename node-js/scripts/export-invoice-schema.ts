import { prisma } from '../src/core/database/prisma.client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function exportInvoiceSchema() {
    console.log('🔍 Fetching complete invoice data from database...');

    try {
        // Fetch a sample invoice with all its relationships
        const sampleInvoice = await prisma.invoice.findFirst({
            include: {
                ClientKYC: true,
                ConsolidatedInvoice: true,
                ConsolidatedInvoiceLineItem: true,
                InvoiceRevision: true,
                CreditNoteRequest: true,
            },
        });

        // Fetch a sample consolidated invoice with full nested data
        const sampleConsolidatedInvoice = await prisma.consolidatedInvoice.findFirst({
            include: {
                ClientKYC: true,
                ConsolidatedInvoiceLineItem: {
                    include: {
                        Invoice: true,
                    },
                },
                Invoice: true,
            },
        });

        const schemaExport = {
            timestamp: new Date().toISOString(),
            database: 'DaVinci Invoices',
            description: 'Complete invoice schema with nested data structures',
            Invoice: {
                description: 'Individual flight invoice with all relationships',
                sampleData: sampleInvoice,
            },
            ConsolidatedInvoice: {
                description: 'Consolidated invoice grouping multiple flights with full nested data',
                sampleData: sampleConsolidatedInvoice,
            },
        };

        // Convert BigInt to string for JSON serialization
        const jsonOutput = JSON.stringify(schemaExport, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2);

        // Output to console
        console.log('\n📋 COMPLETE INVOICE SCHEMA EXPORT (WITH NESTED DATA):');
        console.log('='.repeat(80));
        console.log(jsonOutput);
        console.log('='.repeat(80));

        // Save to file
        const outputPath = join(process.cwd(), 'invoice-schema-export.json');
        await writeFile(outputPath, jsonOutput, 'utf-8');

        console.log(`\n✅ Complete schema with nested data exported to: ${outputPath}`);
        console.log(`📊 File size: ${(Buffer.byteLength(jsonOutput) / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Error exporting schema:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

exportInvoiceSchema()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
