import { Response } from 'express';

/**
 * Send a success response
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    message: string,
    statusCode: number = 200,
): void {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
