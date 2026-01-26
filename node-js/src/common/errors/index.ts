import { HTTP_STATUS } from '../constants';

/**
 * Base Error Class
 * 
 * All custom errors extend this base class.
 */
export class BaseError extends Error {
    public statusCode: number;
    public code: string;
    public details?: unknown;

    constructor(message: string, statusCode: number, code: string, details?: unknown) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * HTTP Error
 */
export class HttpError extends BaseError {
    constructor(message: string, statusCode: number, code: string, details?: unknown) {
        super(message, statusCode, code, details);
    }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends BaseError {
    constructor(message: string = 'Validation failed', details?: unknown) {
        super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', details);
    }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Unauthorized', details?: unknown) {
        super(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED', details);
    }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends BaseError {
    constructor(message: string = 'Forbidden', details?: unknown) {
        super(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN', details);
    }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends BaseError {
    constructor(message: string = 'Resource not found', details?: unknown) {
        super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', details);
    }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends BaseError {
    constructor(message: string = 'Resource conflict', details?: unknown) {
        super(message, HTTP_STATUS.CONFLICT, 'CONFLICT', details);
    }
}
