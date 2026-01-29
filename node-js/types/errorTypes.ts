/**
 * Global type utilities for error handling
 * Provides type-safe error handling patterns for the application
 */

/**
 * Type guard to check if an error is an Error instance
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Type guard to check if an error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

/**
 * Extract error message from unknown error type
 * Safe to use in catch blocks with unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }
    if (hasMessage(error)) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
}

/**
 * Extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
    if (isError(error)) {
        return error.stack;
    }
    return undefined;
}

/**
 * Common application error interface
 */
export interface AppError extends Error {
    code?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return isError(error) && 'code' in error;
}

/**
 * Create a standardized error object from unknown error
 */
export function toAppError(error: unknown, defaultMessage = 'An error occurred'): AppError {
    if (isAppError(error)) {
        return error;
    }

    const appError: AppError = new Error(getErrorMessage(error) || defaultMessage);

    if (isError(error)) {
        appError.stack = error.stack;
        if ('code' in error) {
            appError.code = String((error as { code: unknown }).code);
        }
    }

    return appError;
}
