import 'reflect-metadata';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './common/utils/logger.util';
import { getErrorMessage } from './common/utils/error.util';
import { prisma } from './core/database/prisma.client';
import { FlightDataIngestionService } from './modules/flights/services/FlightDataIngestionService';
import { InvoiceOverdueScheduler } from './modules/invoices/services/InvoiceOverdueScheduler';
import { ConsolidatedInvoiceScheduler } from './modules/invoices/services/ConsolidatedInvoiceScheduler';
import invoiceRouter from './modules/invoices/routes/invoice.route';
import { errorHandler } from './common/middleware/error.middleware';

/**
 * Application Entry Point - Simple Express 5 Server
 */
async function bootstrap(): Promise<void> {
    try {
        // Validate required environment variables
        const requiredEnvVars: Array<keyof NodeJS.ProcessEnv> = [
            'DATABASE_URL',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
        ];
        const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

        if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        // Test database connection
        logger.info('[DATABASE] Connecting...');
        await prisma.$connect();
        logger.info('[DATABASE] Connected successfully');

        // Create Express app
        const app = express();

        // Security middleware - must be first
        app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                    },
                },
            }),
        );

        // CORS configuration
        app.use(
            cors({
                origin: true, // Allow any origin
                credentials: true,
            }),
        );

        // Compression for response bodies
        app.use(compression());

        // Body parsing middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Hello World Route
        app.get('/', (_req: Request, res: Response) => {
            res.json({
                message: 'Hello World! 🚀',
                status: 'Server is running',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
            });
        });

        // API Health Check
        app.get('/api/health', async (_req: Request, res: Response) => {
            try {
                // Check database connection
                await prisma.$queryRaw`SELECT 1`;

                res.json({
                    status: 'healthy',
                    database: 'connected',
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    database: 'disconnected',
                    error: getErrorMessage(error),
                    timestamp: new Date().toISOString(),
                });
            }
        });

        // API Root
        app.get('/api', (_req: Request, res: Response) => {
            res.json({
                message: 'Welcome to DaVinci Server API',
                version: '1.0.0',
                endpoints: {
                    health: '/api/health',
                    root: '/',
                },
            });
        });

        // Mount invoice routes
        app.use('/api/invoices', invoiceRouter);

        // Global error handling middleware (must be AFTER all routes)
        app.use(errorHandler);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            logger.info('========================================');
            logger.info(`SERVER STARTUP`);
            logger.info(`Port: ${PORT}`);
            logger.info(`Root: http://localhost:${PORT}/`);
            logger.info(`API:  http://localhost:${PORT}/api`);
            logger.info(`Env:  ${process.env.NODE_ENV || 'development'}`);
            logger.info('========================================');

            // Start background services
            FlightDataIngestionService.getInstance().start().catch(err => {
                logger.error(err, 'Failed to start FlightDataIngestionService');
            });

            // Start invoice overdue scheduler (runs every hour)
            InvoiceOverdueScheduler.getInstance().start();
            logger.info('Invoice overdue scheduler initialized');

            // Start consolidated invoice scheduler (runs daily at 1 AM)
            const consolidationEnabled = process.env.CONSOLIDATION_ENABLED !== 'false';
            if (consolidationEnabled) {
                ConsolidatedInvoiceScheduler.getInstance().start();
                logger.info('Consolidated invoice scheduler initialized');
            } else {
                logger.info('Consolidated invoice scheduler is disabled');
            }
        });

        // Graceful shutdown
        const shutdown = async (): Promise<void> => {
            logger.info('[SHUTDOWN] Signal received, shutting down gracefully...');

            // Stop background services
            await FlightDataIngestionService.getInstance().stop();
            InvoiceOverdueScheduler.getInstance().stop();
            ConsolidatedInvoiceScheduler.getInstance().stop();

            await prisma.$disconnect();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        logger.error(error, '[FATAL] Failed to start application');
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Start the application
bootstrap();
