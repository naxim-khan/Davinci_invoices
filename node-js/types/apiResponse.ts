/**
 * Standard API Response Interfaces
 * 
 * All API responses should conform to these structures for consistency
 * across the application and ease of frontend consumption.
 */

/**
 * Base response metadata for pagination and counts
 */
export interface ResponseMeta {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    [key: string]: unknown;
}

/**
 * Standard error object structure
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string; // Only included in development mode
}

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta?: ResponseMeta;
    timestamp: string;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
    success: false;
    error: ApiError;
    timestamp: string;
}

/**
 * Paginated list response with required pagination metadata
 */
export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
    meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

/**
 * Union type for any API response
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Processing output response (matches Python processing format)
 */
export interface ProcessingApiResponse<T> {
    success: boolean;
    output_entries: T[];
    master_file: string | null;
    error_message: string | null;
    errors: ProcessingErrorEntry[];
    error_summary: Record<string, number>;
}

/**
 * Processing error entry structure
 */
export interface ProcessingErrorEntry {
    flight_id?: string;
    country?: string;
    error_type?: string;
    error_message?: string;
    error_details?: string;
    [key: string]: unknown;
}
