/**
 * Dependency Injection Identifiers
 * 
 * These symbols are used to identify dependencies in the InversifyJS container.
 * Using symbols instead of strings provides type safety and prevents collisions.
 */
export const TYPES = {
    // Core
    PrismaProvider: Symbol.for('PrismaProvider'),

    // Services
    AuthService: Symbol.for('AuthService'),
    UsersService: Symbol.for('UsersService'),

    // Repositories
    AuthRepository: Symbol.for('AuthRepository'),
    UsersRepository: Symbol.for('UsersRepository'),
};
