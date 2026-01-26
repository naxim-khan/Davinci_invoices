import { Role } from '@prisma/client';

/**
 * Current user interface extracted from JWT
 */
export interface CurrentUser {
    id: number;
    email: string;
    name: string;
    role: Role;
}

/**
 * Request Context Interface
 * 
 * This interface defines the shape of data stored in AsyncLocalStorage
 * for each request. It can be accessed anywhere in the application without
 * explicitly passing it through function parameters.
 */
export interface RequestContext {
    requestId: string;
    traceId?: string;
    user?: CurrentUser;
    startTime: number;
    path?: string;
    method?: string;
}
