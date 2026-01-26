import { Request, Response, NextFunction } from 'express';

/**
 * Placeholder auth middleware
 * TODO: Implement proper JWT authentication
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Placeholder - should verify JWT token and attach user to request
    next();
}
