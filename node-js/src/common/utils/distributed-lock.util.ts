import { prisma } from '../../core/database/prisma.client';
import { logger } from './logger.util';

/**
 * Distributed Lock Utility using PostgreSQL Advisory Locks
 * 
 * Ensures only one instance can execute critical sections in horizontally scaled deployments.
 * Uses PostgreSQL's session-level advisory locks for distributed coordination.
 * 
 * @see https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
 */

export interface LockResult {
    acquired: boolean;
    lockKey: number;
}

export interface LockExecutionResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    lockAcquired: boolean;
}

/**
 * Convert a string identifier to a numeric lock key
 * PostgreSQL advisory locks require bigint keys
 * 
 * @param identifier - String identifier (e.g., 'invoice-overdue-job')
 * @returns Numeric lock key
 */
function stringToLockKey(identifier: string): number {
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        const char = identifier.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure positive number within PostgreSQL bigint range
    return Math.abs(hash);
}

/**
 * Attempt to acquire a PostgreSQL advisory lock (non-blocking)
 * 
 * @param lockIdentifier - Unique identifier for the lock (e.g., 'invoice-overdue-job')
 * @param timeoutMs - Maximum time to wait for lock acquisition (default: 5000ms)
 * @returns Lock result with acquisition status
 */
export async function acquireLock(
    lockIdentifier: string,
    timeoutMs: number = 5000,
): Promise<LockResult> {
    const lockKey = stringToLockKey(lockIdentifier);
    const startTime = Date.now();

    logger.info({
        msg: 'Attempting to acquire distributed lock',
        lockIdentifier,
        lockKey,
        timeoutMs,
    });

    try {
        // Try to acquire lock with retry logic
        while (Date.now() - startTime < timeoutMs) {
            // pg_try_advisory_lock returns true if lock acquired, false otherwise
            const result = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
                SELECT pg_try_advisory_lock(${lockKey}) as pg_try_advisory_lock
            `;

            const acquired = result[0]?.pg_try_advisory_lock ?? false;

            if (acquired) {
                logger.info({
                    msg: 'Distributed lock acquired successfully',
                    lockIdentifier,
                    lockKey,
                    elapsedMs: Date.now() - startTime,
                });
                return { acquired: true, lockKey };
            }

            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Timeout reached without acquiring lock
        logger.warn({
            msg: 'Failed to acquire distributed lock - timeout reached',
            lockIdentifier,
            lockKey,
            timeoutMs,
        });
        return { acquired: false, lockKey };
    } catch (error) {
        logger.error({
            msg: 'Error attempting to acquire distributed lock',
            lockIdentifier,
            lockKey,
            error: error instanceof Error ? error.message : String(error),
        });
        return { acquired: false, lockKey };
    }
}

/**
 * Release a PostgreSQL advisory lock
 * 
 * @param lockKey - Numeric lock key returned from acquireLock
 */
export async function releaseLock(lockKey: number): Promise<void> {
    try {
        // pg_advisory_unlock returns true if lock was held, false if not
        const result = await prisma.$queryRaw<Array<{ pg_advisory_unlock: boolean }>>`
            SELECT pg_advisory_unlock(${lockKey}) as pg_advisory_unlock
        `;

        const released = result[0]?.pg_advisory_unlock ?? false;

        if (released) {
            logger.info({
                msg: 'Distributed lock released successfully',
                lockKey,
            });
        } else {
            logger.warn({
                msg: 'Lock was not held during release attempt',
                lockKey,
            });
        }
    } catch (error) {
        logger.error({
            msg: 'Error releasing distributed lock',
            lockKey,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Execute a function within a distributed lock context
 * Automatically acquires lock, executes function, and releases lock
 * 
 * @param lockIdentifier - Unique identifier for the lock
 * @param fn - Async function to execute within lock
 * @param timeoutMs - Lock acquisition timeout (default: 5000ms)
 * @returns Execution result with success status
 * 
 * @example
 * ```typescript
 * const result = await withLock('invoice-overdue-job', async () => {
 *   return await markOverdueInvoices();
 * });
 * 
 * if (result.success) {
 *   console.log('Job completed:', result.result);
 * }
 * ```
 */
export async function withLock<T>(
    lockIdentifier: string,
    fn: () => Promise<T>,
    timeoutMs: number = 5000,
): Promise<LockExecutionResult<T>> {
    const lockResult = await acquireLock(lockIdentifier, timeoutMs);

    if (!lockResult.acquired) {
        logger.warn({
            msg: 'Skipping execution - could not acquire lock (another instance may be running)',
            lockIdentifier,
        });
        return {
            success: false,
            lockAcquired: false,
        };
    }

    try {
        logger.info({
            msg: 'Executing function within distributed lock',
            lockIdentifier,
        });

        const result = await fn();

        logger.info({
            msg: 'Function execution completed successfully',
            lockIdentifier,
        });

        return {
            success: true,
            result,
            lockAcquired: true,
        };
    } catch (error) {
        logger.error({
            msg: 'Error during function execution within lock',
            lockIdentifier,
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            lockAcquired: true,
        };
    } finally {
        // Always release lock, even if function throws
        await releaseLock(lockResult.lockKey);
    }
}
