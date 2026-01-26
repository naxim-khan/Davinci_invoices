import { ConsolidatedInvoiceService } from '../src/modules/invoices/services/ConsolidatedInvoiceService';
import type { ConsolidationMetrics } from '../src/modules/invoices/types/billing-period.types';

async function runManualConsolidation() {
    console.log('🚀 Starting manual consolidated invoice generation...');

    const service = new ConsolidatedInvoiceService();

    try {
        const result: ConsolidationMetrics =
            await service.generateConsolidatedInvoicesForAllCustomers(new Date());

        console.log('✅ Consolidation job completed!');
        console.log('========================================');
        console.log(`Total Customers Processed: ${result.customersProcessed}`);
        console.log(`Invoices Generated:         ${result.invoicesGenerated}`);
        console.log(`Total Fees Billed:          ${result.totalInvoicesConsolidated}`);
        console.log(`Errors Encountered:         ${result.errors.length}`);
        console.log(`Execution Time:             ${result.executionTimeMs}ms`);
        console.log('========================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Critical error during manual consolidation:', error);
        process.exit(1);
    }
}

runManualConsolidation();
