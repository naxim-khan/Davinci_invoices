/**
 * Global Type Definitions
 * 
 * This file contains all global type definitions used across the application.
 * These types extend or augment third-party libraries and provide application-wide
 * type safety without using 'any' or other risky types.
 */

// Express type extensions will be added here when needed
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT?: string;
            DATABASE_URL: string;
            JWT_SECRET: string;
            JWT_REFRESH_SECRET: string;
            JWT_EXPIRES_IN?: string;
            JWT_REFRESH_EXPIRES_IN?: string;
            API_PREFIX?: string;
            FRONTEND_URL?: string;
            RATE_LIMIT_WINDOW_MS?: string;
            RATE_LIMIT_MAX_REQUESTS?: string;
            LOG_LEVEL?: string;
            LOG_FILE_PATH?: string;
        }
    }
}

export { };
