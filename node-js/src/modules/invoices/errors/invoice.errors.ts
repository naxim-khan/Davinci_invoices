/**
 * Custom Error Classes for Invoice Module
 * Production-grade error handling with proper HTTP status codes
 */

/**
 * Base class for custom invoice errors
 */
export abstract class InvoiceError extends Error {
    abstract statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Thrown when an invoice is not found
 * Maps to HTTP 404 Not Found
 */
export class InvoiceNotFoundError extends InvoiceError {
    statusCode = 404;

    constructor(invoiceId: number) {
        super(`Invoice with ID ${invoiceId} not found`);
    }
}

/**
 * Thrown when invoice validation fails
 * Maps to HTTP 400 Bad Request
 */
export class InvoiceValidationError extends InvoiceError {
    statusCode = 400;

    constructor(message: string) {
        super(message);
    }
}
