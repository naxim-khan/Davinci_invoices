/**
 * Error Utility Functions
 * Provides helper functions for error handling and logging
 */

/**
 * Application Error Interface
 */
export interface AppError {
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
}

export class ValidationError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class InternalServerError extends Error {
    statusCode = 500;
    constructor(message: string) {
        super(message);
        this.name = 'InternalServerError';
    }
}

/**
 * Logger Interface
 */
export interface Logger {
    error: (obj: object, msg: string) => void;
}

/**
 * Convert unknown error to AppError
 * @param error - Unknown error object
 * @returns AppError with message and optional stack
 */
export function toAppError(error: unknown): AppError {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
        };
    }

    if (typeof error === 'string') {
        return {
            message: error,
        };
    }

    if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        return {
            message: errorObj.message?.toString() || 'An unknown error occurred',
            stack: errorObj.stack?.toString(),
            code: errorObj.code?.toString(),
            statusCode: typeof errorObj.statusCode === 'number' ? errorObj.statusCode : undefined,
        };
    }

    return {
        message: 'An unknown error occurred',
    };
}

/**
 * Get error message from unknown error
 * @param error - Unknown error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
    return toAppError(error).message;
}

/**
 * Log error with structured format
 * @param logger - Logger instance
 * @param message - Error message
 * @param error - Unknown error object
 */
export function logError(logger: Logger, message: string, error: unknown): void {
    const appError = toAppError(error);
    logger.error(
        {
            message: appError.message,
            stack: appError.stack,
            code: appError.code,
            statusCode: appError.statusCode,
        },
        message,
    );
}
