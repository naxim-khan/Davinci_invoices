/**
 * Express Request Extensions
 * 
 * This file extends the Express Request type with custom properties
 * used throughout the application.
 */

import { User } from '@prisma/client';

declare global {
    namespace Express {
        /**
         * Extended Express Request interface with custom properties
         */
        interface Request {
            /**
             * Authenticated user attached by auth middleware
             */
            user?: User;

            /**
             * Request correlation ID for distributed tracing
             */
            correlationId?: string;

            /**
             * Request timestamp for logging and metrics
             */
            requestTime?: Date;
        }
    }
}

export { };
