import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.util';
import { InvoiceError } from '../../modules/invoices/errors/invoice.errors';

/**
 * Global Error Handler Middleware
 * Centralizes all error handling logic
 * This is where HTTP mapping, logging, and response formatting happens
 * 
 * Must be registered AFTER all routes in the Express app
 */
export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const validationErrors = error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
        }));

        logger.warn({ err: error, path: req.path }, 'Validation error');

        res.status(400).json({
            error: 'Validation Error',
            message: 'Request validation failed',
            details: validationErrors,
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // Handle custom application errors (InvoiceError, etc.)
    if (error instanceof InvoiceError) {
        logger.info({ err: error, path: req.path }, 'Application error');

        res.status(error.statusCode).json({
            error: getErrorName(error.statusCode),
            message: error.message,
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // Handle standard Error instances (unexpected)
    if (error instanceof Error) {
        const err = error as Error;
        logger.error({ err }, 'Unexpected error');

        res.status(500).json({
            error: 'Internal Server Error',
            message:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : 'An unexpected error occurred',
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // Handle completely unknown error types
    logger.error({ err: error, path: req.path }, 'Unknown error type');

    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        path: req.path,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Get human-readable error name from HTTP status code
 */
function getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        500: 'Internal Server Error',
        503: 'Service Unavailable',
    };

    return errorNames[statusCode] ?? 'Error';
}
