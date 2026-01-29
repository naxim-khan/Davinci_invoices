/**
 * Response Utility Functions
 * 
 * Helper functions for sending standardized API responses.
 * These ensure consistent response format across all endpoints.
 */

import { Response } from 'express';
import {
    ApiSuccessResponse,
    ApiErrorResponse,
    ResponseMeta,
    ProcessingApiResponse,
    ProcessingErrorEntry,
} from '../../../types/apiResponse';

/**
 * Centralized error codes for consistent error handling
 */
export const ErrorCodes = {
    // Client errors (4xx)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',

    // Server errors (5xx)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

    // Business logic errors
    OPERATOR_NOT_FOUND: 'OPERATOR_NOT_FOUND',
    INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
    FLIGHT_PROCESSING_ERROR: 'FLIGHT_PROCESSING_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Send a successful API response
 * 
 * @param res - Express response object
 * @param data - The response data payload
 * @param meta - Optional metadata (pagination, counts, etc.)
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    meta?: ResponseMeta,
    statusCode = 200
): void {
    const response: ApiSuccessResponse<T> = {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };

    if (meta && Object.keys(meta).length > 0) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
}

/**
 * Send an error API response
 * 
 * @param res - Express response object
 * @param code - Error code from ErrorCodes
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (default: 500)
 * @param details - Optional additional error details
 */
export function sendError(
    res: Response,
    code: string,
    message: string,
    statusCode = 500,
    details?: Record<string, unknown>
): void {
    const response: ApiErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
            // Include stack trace only in development
            ...(process.env.NODE_ENV === 'development' && {
                stack: new Error().stack,
            }),
        },
        timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
}

/**
 * Send a paginated list response
 * 
 * @param res - Express response object
 * @param data - Array of items
 * @param total - Total count of items (before pagination)
 * @param page - Current page number
 * @param pageSize - Items per page
 */
export function sendPaginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    pageSize: number
): void {
    sendSuccess(res, data, {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    });
}

/**
 * Send a processing result response (matches Python processing format)
 * 
 * @param res - Express response object
 * @param outputEntries - Processed output entries
 * @param errors - Any processing errors
 * @param masterFile - Optional master file path
 */
export function sendProcessingResult<T>(
    res: Response,
    outputEntries: T[],
    errors: ProcessingErrorEntry[] = [],
    masterFile: string | null = null
): void {
    // Calculate error summary
    const errorSummary: Record<string, number> = {};
    for (const error of errors) {
        const errorType = error.error_type || 'UNKNOWN_ERROR';
        errorSummary[errorType] = (errorSummary[errorType] || 0) + 1;
    }

    const response: ProcessingApiResponse<T> = {
        success: errors.length === 0,
        output_entries: outputEntries,
        master_file: masterFile,
        error_message: errors.length > 0
            ? `${errors.length} error(s) occurred during processing`
            : null,
        errors,
        error_summary: errorSummary,
    };

    res.status(errors.length === 0 ? 200 : 207).json(response);
}

/**
 * Common error response helpers
 */
export const sendBadRequest = (
    res: Response,
    message: string,
    details?: Record<string, unknown>
): void => sendError(res, ErrorCodes.BAD_REQUEST, message, 400, details);

export const sendUnauthorized = (
    res: Response,
    message = 'Authentication required'
): void => sendError(res, ErrorCodes.UNAUTHORIZED, message, 401);

export const sendForbidden = (
    res: Response,
    message = 'Access denied'
): void => sendError(res, ErrorCodes.FORBIDDEN, message, 403);

export const sendNotFound = (
    res: Response,
    resource = 'Resource'
): void => sendError(res, ErrorCodes.NOT_FOUND, `${resource} not found`, 404);

export const sendInternalError = (
    res: Response,
    message = 'An unexpected error occurred',
    details?: Record<string, unknown>
): void => sendError(res, ErrorCodes.INTERNAL_ERROR, message, 500, details);

export const sendValidationError = (
    res: Response,
    message: string,
    details?: Record<string, unknown>
): void => sendError(res, ErrorCodes.VALIDATION_ERROR, message, 422, details);
