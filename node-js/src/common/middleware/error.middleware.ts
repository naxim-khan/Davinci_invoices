import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.util';
import { sendError, sendValidationError, ErrorCodes } from '../utils/response.util';
import { InvoiceError } from '../../modules/invoices/errors/invoice.errors';

/**
 * Global Error Handler Middleware
 * Centralizes all error handling logic
 * Uses standardized response format from response.util.ts
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

        sendValidationError(res, 'Request validation failed', {
            errors: validationErrors,
            path: req.path,
        });
        return;
    }

    // Handle custom application errors (InvoiceError, etc.)
    if (error instanceof InvoiceError) {
        logger.info({ err: error, path: req.path }, 'Application error');

        sendError(
            res,
            getErrorCode(error.statusCode),
            error.message,
            error.statusCode,
            { path: req.path }
        );
        return;
    }

    // Handle standard Error instances (unexpected)
    if (error instanceof Error) {
        const err = error as Error;
        logger.error({ err }, 'Unexpected error');

        sendError(
            res,
            ErrorCodes.INTERNAL_ERROR,
            process.env.NODE_ENV === 'development'
                ? err.message
                : 'An unexpected error occurred',
            500,
            { path: req.path }
        );
        return;
    }

    // Handle completely unknown error types
    logger.error({ err: error, path: req.path }, 'Unknown error type');

    sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        'An unexpected error occurred',
        500,
        { path: req.path }
    );
}

/**
 * Get error code from HTTP status code
 */
function getErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
        400: ErrorCodes.BAD_REQUEST,
        401: ErrorCodes.UNAUTHORIZED,
        403: ErrorCodes.FORBIDDEN,
        404: ErrorCodes.NOT_FOUND,
        409: ErrorCodes.CONFLICT,
        422: ErrorCodes.VALIDATION_ERROR,
        500: ErrorCodes.INTERNAL_ERROR,
        503: ErrorCodes.SERVICE_UNAVAILABLE,
    };

    return errorCodes[statusCode] ?? ErrorCodes.INTERNAL_ERROR;
}
