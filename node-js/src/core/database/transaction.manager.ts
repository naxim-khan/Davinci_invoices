import { AsyncLocalStorage } from 'async_hooks';
import { PrismaTransactionClient } from './prisma.client';

/**
 * Context interface for transaction management
 */
interface TransactionContext {
    transaction?: PrismaTransactionClient;
}

/**
 * Transaction Manager using AsyncLocalStorage
 * 
 * This allows us to maintain transaction state across async operations
 * without explicitly passing the transaction client through function parameters.
 */
class TransactionManager {
    private storage = new AsyncLocalStorage<TransactionContext>();

    /**
     * Get the current transaction client if we're in a transaction context
     */
    getTransaction(): PrismaTransactionClient | undefined {
        return this.storage.getStore()?.transaction;
    }

    /**
     * Set the current transaction client
     */
    setTransaction(transaction: PrismaTransactionClient): void {
        const store = this.storage.getStore();
        if (store) {
            store.transaction = transaction;
        }
    }

    /**
     * Run a function within a transaction context
     */
    run<T>(transaction: PrismaTransactionClient, callback: () => T): T {
        return this.storage.run({ transaction }, callback);
    }

    /**
     * Check if we're currently in a transaction
     */
    isInTransaction(): boolean {
        return this.getTransaction() !== undefined;
    }
}

export const transactionManager = new TransactionManager();
