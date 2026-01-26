import { prisma } from '../src/core/database/prisma.client';
import { ConsolidatedInvoiceService } from '../src/modules/invoices/services/ConsolidatedInvoiceService';
import { InvoiceStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

async function testConsolidation() {
    console.log('🚀 Starting Consolidation Test with Real Invoice Data...');

    // 1. Find our test customer (Sky High Logistics)
    const customer = await prisma.clientKYC.findFirst({
        where: { customerId: 'CUST-002' }
    });

    if (!customer) {
        console.error('❌ Test customer CUST-002 not found. Please run seed-client-kyc.ts first.');
        process.exit(1);
    }

    console.log(`✅ Found customer: ${customer.fullLegalNameEntity} (ID: ${customer.id})`);

    // 2. Real invoice data structure based on existing DB entries
    // We attach these to our test customer by overriding operatorId
    const realInvoices = [
        {
            invoiceNumber: "INV-REAL-DUMP-001",
            issueDate: new Date("2026-01-26T00:00:00.000Z"),
            flightDate: new Date("2021-12-19T00:00:00.000Z"),
            clientName: customer.fullLegalNameEntity, // Use customer name for consistency
            operatorId: customer.id,
            status: InvoiceStatus.PENDING,
            feeAmount: 36.33,
            totalUsdAmount: 36.33,
            flightId: BigInt("2762744832"),
            firName: "Sana'a FIR",
            firCountry: "Yemen",
            originIcao: "OYSY",
            destinationIcao: "OMAA",
            registrationNumber: "ET-AUR",
            aircraftModelName: "B738",
            otherFeesAmount: [
                {
                    name: "Meteorology Fee",
                    amount: 130,
                    currency: "AED",
                    amount_usd: 35.40,
                    description: "Meteorology service charge"
                }
            ]
        },
        {
            invoiceNumber: "INV-REAL-DUMP-002",
            issueDate: new Date("2026-01-26T00:00:00.000Z"),
            flightDate: new Date("2021-12-19T00:00:00.000Z"),
            clientName: customer.fullLegalNameEntity,
            operatorId: customer.id,
            status: InvoiceStatus.PENDING,
            feeAmount: 160.0,
            totalUsdAmount: 160.0,
            flightId: BigInt("2762744833"),
            firName: "Sana'a FIR",
            firCountry: "Yemen",
            originIcao: "OMAA",
            destinationIcao: "OYSY",
            registrationNumber: "ET-AVM",
            aircraftModelName: "B738",
            otherFeesAmount: [
                {
                    name: "Tax",
                    amount: 100,
                    currency: "AED",
                    amount_usd: 27.23,
                    description: "Government tax"
                }
            ]
        }
    ];

    console.log('🌱 Creating real-data mock invoices...');
    for (const data of realInvoices) {
        await prisma.invoice.upsert({
            where: { invoiceNumber: data.invoiceNumber },
            update: {},
            create: data as any
        });
        console.log(`   Created: ${data.invoiceNumber} (Flight: ${data.flightId}) - $${data.totalUsdAmount}`);
    }

    // 3. Trigger consolidation
    console.log('\n🔄 Triggering consolidation for this customer...');
    const service = new ConsolidatedInvoiceService();

    // Period covering the issueDate of our new invoices
    const periodStart = startOfDay(new Date("2026-01-01"));
    const periodEnd = endOfDay(new Date());

    const result = await service.generateConsolidatedInvoice(
        customer.id,
        periodStart,
        periodEnd
    );

    if (result.success && result.consolidatedInvoice) {
        console.log('✅ SUCCESS! Consolidated invoice generated using real data structure.');
        console.log('========================================');
        console.log(`Invoice Number: ${result.consolidatedInvoice.invoiceNumber}`);
        console.log(`Flights:        ${result.consolidatedInvoice.totalFlights}`);
        console.log(`Total USD:      $${result.consolidatedInvoice.totalUsd}`);
        console.log('========================================');

        const dbInvoice = await prisma.consolidatedInvoice.findUnique({
            where: { id: result.consolidatedInvoice.id },
            include: { ConsolidatedInvoiceLineItem: true }
        });

        if (dbInvoice) {
            console.log(`Line Items Linked: ${dbInvoice.ConsolidatedInvoiceLineItem.length}`);
            console.log(`Firs Crossed: ${dbInvoice.firsCrossed.join(', ')}`);
        }
    } else {
        console.error('❌ Failed to generate consolidated invoice:', result.error || result.message);
    }

    process.exit(0);
}

testConsolidation()
    .catch(err => {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
