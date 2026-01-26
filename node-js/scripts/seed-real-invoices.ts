import { prisma } from '../src/core/database/prisma.client';
import { InvoiceStatus } from '@prisma/client';
import { subDays } from 'date-fns';

async function seedRealInvoices() {
    console.log('🌱 Seeding real invoice data for test customers...');

    // 1. Get our test customers
    const cust1 = await prisma.clientKYC.findUnique({ where: { customerId: 'CUST-001' } });
    const cust2 = await prisma.clientKYC.findUnique({ where: { customerId: 'CUST-002' } });

    if (!cust1 || !cust2) {
        console.error('❌ Test customers not found. Run seed-client-kyc.ts first.');
        process.exit(1);
    }

    // 2. Fetch some real invoices to copy their structure
    const templates = await prisma.invoice.findMany({
        take: 5,
        orderBy: { id: 'desc' },
        where: {
            NOT: {
                invoiceNumber: { startsWith: 'INV-REAL' }
            }
        }
    });

    if (templates.length === 0) {
        console.warn('⚠️ No template invoices found in DB. Falling back to basic structure.');
    }

    const customers = [cust1, cust2];
    let createdCount = 0;

    for (const customer of customers) {
        console.log(`\n📄 Generating invoices for ${customer.fullLegalNameEntity}...`);

        // Create 3 invoices for each customer
        for (let i = 1; i <= 3; i++) {
            const template = templates[i % templates.length] || {};
            const invoiceNumber = `INV-REAL-SEED-${customer.id}-${i}-${Math.floor(Math.random() * 1000)}`;

            // Dates within the last 5 days (inside current period)
            const date = subDays(new Date(), i);

            await prisma.invoice.upsert({
                where: { invoiceNumber },
                update: {},
                create: {
                    invoiceNumber,
                    issueDate: date,
                    dueDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000),
                    status: InvoiceStatus.PENDING,
                    clientName: customer.fullLegalNameEntity,
                    clientAddress: customer.billingAddress,
                    operatorId: customer.id,
                    flightId: BigInt(Date.now() + createdCount),
                    flightDate: date,
                    feeAmount: template.feeAmount || (50 + Math.random() * 200),
                    totalUsdAmount: template.totalUsdAmount || (50 + Math.random() * 200),
                    firName: template.firName || 'Dubai FIR',
                    firCountry: template.firCountry || 'UAE',
                    otherFeesAmount: template.otherFeesAmount || [],
                    // Copy other fields if they exist in template
                    act: template.act,
                    originIcao: template.originIcao,
                    destinationIcao: template.destinationIcao,
                    registrationNumber: template.registrationNumber,
                    aircraftModelName: template.aircraftModelName,
                }
            });

            console.log(`   ✅ Created: ${invoiceNumber}`);
            createdCount++;
        }
    }

    console.log(`\n🎉 Seeded ${createdCount} real invoices for testing.`);
}

seedRealInvoices()
    .catch((e) => {
        console.error('❌ Error seeding real invoices:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
