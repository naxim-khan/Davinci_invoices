import { Container } from 'inversify';
import { TYPES } from './identifiers';

// Core
import { PrismaProvider } from '../database/prisma.provider';

// Auth Module
import { AuthService } from '../../modules/auth/services/auth.service';
import { AuthRepository } from '../../modules/auth/repositories/auth.repository';

// Users Module
import { UsersService } from '../../modules/users/services/users.service';
import { UsersRepository } from '../../modules/users/repositories/users.repository';

/**
 * InversifyJS Container Configuration
 * 
 * This container manages all dependency injection bindings.
 * All services, repositories, and providers are registered here.
 */
const container = new Container();

// ==========================================
// CORE BINDINGS
// ==========================================
container.bind<PrismaProvider>(TYPES.PrismaProvider).to(PrismaProvider).inSingletonScope();

// ==========================================
// AUTH MODULE BINDINGS
// ==========================================
container.bind<AuthService>(TYPES.AuthService).to(AuthService);
container.bind<AuthRepository>(TYPES.AuthRepository).to(AuthRepository);

// ==========================================
// USERS MODULE BINDINGS
// ==========================================
container.bind<UsersService>(TYPES.UsersService).to(UsersService);
container.bind<UsersRepository>(TYPES.UsersRepository).to(UsersRepository);

export { container };
