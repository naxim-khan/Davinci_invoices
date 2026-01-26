import 'reflect-metadata';
import { Application } from 'express';
import express from 'express';
import { logger } from '../common/utils/logger.util';
import { logError } from '../common/utils/error.util';

/**
 * Create and configure a simple Express server
 * 
 * This is a clean Express 5 setup without dependency injection.
 * DI container (TSyringe or Awilix) can be added later if needed.
 * 
 * @returns Promise<Application> - Configured Express application
 */
export async function createServer(): Promise<Application> {
    try {
        logger.info('🚀 Initializing server...');

        // Create Express app
        const app: Application = express();

        logger.info('✅ Server initialized successfully');

        return app;
    } catch (error) {
        logError(logger, '❌ Failed to initialize server', error);
        throw error;
    }
}
