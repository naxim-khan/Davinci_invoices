# DaVinci Server

Enterprise-grade Express.js + Prisma 7 API Server with advanced architecture patterns.

## 🏗️ Architecture

This project implements a **high-performance, enterprise-level architecture** with:

- **Prisma 7**: Latest database ORM with adapter-based configuration
- **InversifyJS**: Powerful dependency injection container
- **AsyncLocalStorage**: Request-scoped context management
- **TypeScript**: Full type safety and advanced TypeScript features
- **Modular Design**: Domain-driven module organization

## ✨ Key Features

### Core Infrastructure
- ✅ **Dependency Injection** - InversifyJS for loosely coupled architecture
- ✅ **Request Context** - AsyncLocalStorage for request-scoped data
- ✅ **Transaction Management** - Automatic transaction handling with `@Transactional()` decorator
- ✅ **Type Safety** - Strict TypeScript configuration with Prisma types

### Decorators
- `@Transactional()` - Automatic database transaction management
- `@Authenticated()` - Require authentication 
- `@Authorized(...roles)` - Role-based access control
- `@ValidateDto(DtoClass)` - Automatic request validation
- `@CurrentUser()` - Inject authenticated user into parameters

### Middleware
- **Context Middleware** - Sets up AsyncLocal Storage for each request
- **Auth Middleware** - JWT authentication and user injection
- **Error Middleware** - Global error handling with structured responses
- **Logger Middleware** - Request/response logging with correlation IDs
- **Rate Limiting** - Configurable rate limits (API-wide and per-route)

### Security
- Helmet for security headers
- CORS configured for frontend
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on sensitive endpoints

## 📁 Project Structure

```
src/
├── core/                         # Core infrastructure
│   ├── container/               # Dependency injection
│   ├── context/                 # AsyncLocalStorage context
│   ├── database/                # Prisma client & transactions
│   ├── app.ts                   # Express configuration
│   └── server.ts                # Server initialization
│
├── modules/                      # Feature modules
│   ├── auth/                    # Authentication
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── dto/
│   └── users/                   # User management
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       └── dto/
│
└── common/                       # Shared utilities
    ├── constants/               # Application constants
    ├── decorators/              # Custom decorators
    ├── errors/                  # Error classes
    ├── middleware/              # Express middleware
    └── utils/                   # Utility functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Pull existing database schema:**
```bash
npx prisma db pull
npx prisma generate
```

4. **Start development server:**
```bash
npm run dev
```

## 📝 Environment Variables

Required variables (see `.env.example` for complete list):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm test             # Run tests
```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### POST `/api/auth/refresh`
Refresh access token
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### GET `/api/auth/me`
Get current user (requires authentication)

### User Management Endpoints

#### GET `/api/users`
Get all users (Admin only)

#### GET `/api/users/:id`
Get user by ID

#### POST `/api/users`
Create user (Admin only)

#### PUT `/api/users/:id`
Update user

#### DELETE `/api/users/:id`
Delete user (Admin only)

#### POST `/api/users/change-password`
Change own password

## 🗄️ Database (Prisma 7)

This project uses **Prisma 7** with the new adapter-based configuration:

- **No datasource block** in `schema.prisma`
- Database connection configured in `prisma/prisma.config.ts`
- Uses `PrismaPg` adapter for PostgreSQL

### Pull Existing Schema
```bash
npx prisma db pull
npx prisma generate
```

### Create Migration
```bash
npx prisma migrate dev --name migration_name
```

### Prisma Studio
```bash
npx prisma studio
```

## 🎯 Design Patterns

### 1. Dependency Injection
All services and repositories use constructor injection:
```typescript
@injectable()
export class UsersService {
  constructor(
    @inject(TYPES.UsersRepository) private repo: UsersRepository
  ) {}
}
```

### 2. Repository Pattern
Data access is abstracted into repositories:
```typescript
@injectable()
export class UsersRepository {
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

### 3. Transaction Management
Use `@Transactional()` decorator for automatic transactions:
```typescript
@Transactional()
async complexOperation() {
  // All database operations here run in a transaction
}
```

### 4. Request Context
Access request data anywhere using AsyncLocalStorage:
```typescript
const user = asyncContext.getCurrentUser();
const requestId = asyncContext.getRequestId();
```

## 🔒 Security Best Practices

- ✅ Helmet for security headers
- ✅ CORS properly configured
- ✅ JWT with refresh token rotation
- ✅ Bcrypt password hashing
- ✅ Rate limiting on auth endpoints
- ✅ Input validation with class-validator
- ✅ SQL injection prevention (Prisma)
- ✅ Environment variable validation

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5
- **ORM**: Prisma 7 with PostgreSQL adapter
- **DI Container**: InversifyJS
- **Validation**: class-validator
- **Authentication**: JWT (jsonwebtoken)
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Add proper type definitions
4. Write meaningful commit messages
5. Ensure all tests pass

## 📄 License

MIT License

---

**Built with ❤️ using Enterprise-Level Architecture Patterns**
