import { prisma } from '../src/core/database/prisma.client';
import { BillingPeriodType, KYCStatus } from '@prisma/client';

async function seedClientKYC() {
    console.log('🌱 Seeding Client KYC data with complete mock information...');

    const clients = [
        {
            customerId: 'CUST-001',
            fullLegalNameEntity: 'Global Airways Ltd',
            tradingBrandName: 'Global Air',
            entityType: 'Corporation',
            countryOfIncorporation: 'United Kingdom',
            companyRegistrationNo: 'UK12345678',
            dateOfIncorporation: new Date('2010-05-15'),
            registeredAddress: '123 Aviation Way, London, UK',
            billingAddress: 'Accounts Dept, 123 Aviation Way, London, UK',
            status: KYCStatus.APPROVED,

            // Financial & Bank Details
            accountNumberIBAN: 'GB29NWBK60161331926819',
            swiftBICCode: 'NWBKGB2L',
            bankName: 'National Westminster Bank',
            bankAddress: '250 Bishopsgate, London, UK',
            beneficiaryName: 'Global Airways Ltd',
            currencyOfAccount: 'USD',

            // Primary Contact
            primaryContactName: 'John Smith',
            primaryContactEmail: 'john.smith@globalair.com',
            primaryContactPhone: '+44 20 7123 4567',
            primaryContactTitle: 'Account Director',

            // Authorized Signatory
            authorizedSignatoryName: 'Robert Wilson',
            authorizedSignatoryEmail: 'r.wilson@globalair.com',
            authorizedSignatoryPhone: '+44 20 7123 4568',
            authorizedSignatoryTitle: 'CEO',

            // Finance Contact
            financeContactName: 'Jane Doe',
            financeContactEmail: 'j.doe@globalair.com',
            financeContactPhone: '+44 20 7123 4569',
            financeContactTitle: 'CFO',

            // Billing Configuration
            billingPeriodEnabled: true,
            billingPeriodType: BillingPeriodType.MONTHLY,
            billingPeriodStartDay: 1,

            // Tax Information
            taxIdentificationNumber: 'VAT-UK-998877',
            taxRegistrationStatus: 'REGISTERED',
            countryOfTaxResidence: 'United Kingdom',

            website: 'https://globalair.com',
            jetnetId: 'JN-GA-100'
        },
        {
            customerId: 'CUST-002',
            fullLegalNameEntity: 'Sky High Logistics',
            tradingBrandName: 'Sky Logistics',
            entityType: 'Private Limited',
            countryOfIncorporation: 'United Arab Emirates',
            companyRegistrationNo: 'UAE-987654',
            dateOfIncorporation: new Date('2015-09-20'),
            registeredAddress: 'Building 4, Dubai World Central, Dubai, UAE',
            billingAddress: 'Finance Office, Building 4, DWC, Dubai, UAE',
            status: KYCStatus.APPROVED,

            // Financial & Bank Details
            accountNumberIBAN: 'AE1203300000000987654321',
            swiftBICCode: 'EBIDAEAD',
            bankName: 'Emirates NBD',
            bankAddress: 'Deira, Dubai, UAE',
            beneficiaryName: 'Sky High Logistics FZ LLC',
            currencyOfAccount: 'USD',

            // Primary Contact
            primaryContactName: 'Ahmed Hassan',
            primaryContactEmail: 'ahmed.h@skylogistics.com',
            primaryContactPhone: '+971 4 888 1234',
            primaryContactTitle: 'Operations Manager',

            // Authorized Signatory
            authorizedSignatoryName: 'Khalid Mansour',
            authorizedSignatoryEmail: 'k.mansour@skylogistics.com',
            authorizedSignatoryPhone: '+971 4 888 1235',
            authorizedSignatoryTitle: 'Managing Director',

            // Finance Contact
            financeContactName: 'Fatima Al-Sayed',
            financeContactEmail: 'finance@skylogistics.com',
            financeContactPhone: '+971 4 888 1236',
            financeContactTitle: 'Head of Accounts',

            // Billing Configuration
            billingPeriodEnabled: true,
            billingPeriodType: BillingPeriodType.WEEKLY,
            billingPeriodStartDay: 2, // Tuesday (Today is Monday, so a Tuesday-Monday cycle ends today)

            // Tax Information
            taxIdentificationNumber: 'TRN-100200300',
            taxRegistrationStatus: 'REGISTERED',
            countryOfTaxResidence: 'UAE',

            website: 'https://skylogistics.ae',
            jetnetId: 'JN-SL-200'
        },
        {
            customerId: 'CUST-003',
            fullLegalNameEntity: 'Fast Jet Charter',
            tradingBrandName: 'FastJet',
            entityType: 'LLC',
            countryOfIncorporation: 'USA',
            companyRegistrationNo: 'DE-55443322',
            dateOfIncorporation: new Date('2018-03-10'),
            registeredAddress: '789 Executive Blvd, New Castle, DE, USA',
            billingAddress: '789 Executive Blvd, New Castle, DE, USA',
            status: KYCStatus.UNDER_REVIEW,

            // Financial & Bank Details
            accountNumberIBAN: 'US1234567890123456',
            swiftBICCode: 'CHASEUS33',
            bankName: 'JP Morgan Chase',
            bankAddress: '270 Park Ave, New York, NY, USA',
            beneficiaryName: 'Fast Jet Charter LLC',
            currencyOfAccount: 'USD',

            // Primary Contact
            primaryContactName: 'Sarah Johnson',
            primaryContactEmail: 's.johnson@fastjet.com',
            primaryContactPhone: '+1 302 555 0199',
            primaryContactTitle: 'Charter Lead',

            // Authorized Signatory
            authorizedSignatoryName: 'Michael Brown',
            authorizedSignatoryEmail: 'm.brown@fastjet.com',
            authorizedSignatoryPhone: '+1 302 555 0200',
            authorizedSignatoryTitle: 'President',

            // Finance Contact
            financeContactName: 'David Miller',
            financeContactEmail: 'billing@fastjet.com',
            financeContactPhone: '+1 302 555 0201',
            financeContactTitle: 'Finance Controller',

            // Billing Configuration
            billingPeriodEnabled: false,

            // Tax Information
            taxIdentificationNumber: 'EIN-45-6789012',
            taxRegistrationStatus: 'PENDING',
            countryOfTaxResidence: 'USA',

            website: 'https://fastjet-charter.com',
            jetnetId: 'JN-FJ-300'
        }
    ];

    for (const client of clients) {
        await prisma.clientKYC.upsert({
            where: { customerId: client.customerId },
            update: client,
            create: client,
        });
        console.log(`✅ Upserted complete record for: ${client.fullLegalNameEntity} (${client.customerId})`);
    }

    console.log('🎉 Full Client KYC seeding completed!');
}

seedClientKYC()
    .catch((e) => {
        console.error('❌ Error seeding Client KYC:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
