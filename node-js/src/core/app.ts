import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '../common/utils/logger.util';

/**
 * Configure Express Application
 * 
 * This function configures all global middleware for the Express app.
 * All middleware is applied in the correct order for optimal security and performance.
 * 
 * @param app - Express Application instance
 */
export function configureApp(app: Application): void {
    // Security middleware - must be first
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            },
        },
    }));

    // CORS configuration
    const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    app.use(
        cors({
            origin: corsOrigin,
            credentials: true,
        }),
    );

    // Compression for response bodies
    app.use(compression());

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    logger.info('✅ App middleware configured successfully');
}

/**
 * Configure error handling
 * 
 * This function must be called AFTER all routes are registered.
 * It sets up the global error handling middleware.
 * 
 * @param app - Express Application instance
 */
export function configureErrorHandling(app: Application): void {
    // 404 handler for undefined routes
    app.use((_req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${_req.method} ${_req.path} not found`,
            path: _req.path,
            timestamp: new Date().toISOString(),
        });
    });

    // Global error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error({ err }, 'Unhandled error');

        res.status(500).json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
        });
    });

    logger.info('✅ Error handling configured successfully');
}
