// import { UserRole } from '@prisma/client';

/**
 * Application Constants
 */
export const APP_CONSTANTS = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MIN_PASSWORD_LENGTH: 8,
    JWT_TOKEN_TYPE: 'Bearer',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
    // Authentication
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // System
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Admin roles that have elevated permissions
 */
// export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

// /**
//  * All user roles ordered by permission level
//  */
// export const ALL_ROLES: UserRole[] = [
//     UserRole.SUPER_ADMIN,
//     UserRole.ADMIN,
//     UserRole.MANAGER,
//     UserRole.STAFF,
//     UserRole.USER,
// ];
