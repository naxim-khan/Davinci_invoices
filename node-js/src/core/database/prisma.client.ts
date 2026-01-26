import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

/**
 * Singleton Prisma Client with PostgreSQL Adapter (Prisma 7)
 * 
 * This module creates a single instance of PrismaClient with the PrismaPg adapter.
 * The adapter is required in Prisma 7 for direct database connections.
 */

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10s for remote connections
    ssl: {
        rejectUnauthorized: false
    }
});

// Log pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Global type for Prisma's global object
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// Create Prisma Client instance
const prismaClientSingleton = () => {
    return new PrismaClient({
        adapter,
        log: process.env.PRISMA_LOG_QUERIES === 'true'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });
};

// Use global variable in development to prevent multiple instances
export const prisma = globalThis.__prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
});

export type PrismaTransactionClient = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
