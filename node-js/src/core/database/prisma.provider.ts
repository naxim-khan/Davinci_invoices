import { injectable } from 'inversify';
import { prisma, PrismaTransactionClient } from './prisma.client';
import { transactionManager } from './transaction.manager';

/**
 * Prisma Provider
 * 
 * This provider returns the appropriate Prisma client based on the current context.
 * If we're in a transaction (via @Transactional decorator), it returns the transaction client.
 * Otherwise, it returns the global Prisma client.
 */
@injectable()
export class PrismaProvider {
    /**
     * Get the Prisma client for the current context
     * 
     * If we're in a transaction context (set by @Transactional decorator),
     * this returns the transaction client. Otherwise, returns the global client.
     */
    getClient(): PrismaTransactionClient {
        const transactionClient = transactionManager.getTransaction();
        return transactionClient ?? prisma;
    }

    /**
     * Get the global Prisma client
     * This bypasses any transaction context
     */
    getGlobalClient(): PrismaTransactionClient {
        return prisma;
    }
}
