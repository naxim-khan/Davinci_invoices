# DaVinci Server - Setup Guide

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (already set up)
- npm >= 9.0.0

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js and InversifyJS
- Prisma 7 with PostgreSQL adapter
- TypeScript and development tools
- Validation, authentication, and logging libraries

### 2. Configure Environment

Your `.env` file should already be configured. Verify it contains:

```env
DATABASE_URL=postgresql://...  # Your existing database
JWT_SECRET=...                  # Your JWT secret
JWT_REFRESH_SECRET=...          # Your refresh token secret  
MAIL_HOST=smtp.gmail.com
MAIL_USER=iusmandev@gmail.com
# ... other variables
```

### 3. Pull Database Schema

Since you're connecting to an **existing database**, pull the schema:

```bash
npx prisma db pull
```

This will introspect your database and generate the `schema.prisma` file with your existing tables.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

This generates the TypeScript types and Prisma Client based on your schema.

### 5. Build the Project

```bash
npm run build
```

### 6. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📡 API Endpoints

Once running, you can access:

- **API Base URL**: `http://localhost:3000/api`
- **Auth endpoints**: `/api/auth/login`, `/api/auth/register`, etc.
- **User endpoints**: `/api/users`, `/api/users/:id`, etc.

## 🔍 Verify Setup

Test the server is running:

```bash
curl http://localhost:3000/api/auth/me
```

You should get an auth error (expected - requires JWT token).

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start with hot-reload

# Building
npm run build            # Compile TypeScript

# Production
npm start                # Run compiled code

# Database
npx prisma studio        # Open Prisma Studio GUI
npx prisma db pull       # Pull schema from database
npx prisma generate      # Regenerate Prisma Client

# Code Quality
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
```

## 🔧 Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Verify `DATABASE_URL` in `.env` is correct
2. Ensure your database server is running
3. Check network/firewall settings

### TypeScript Errors

If you get TypeScript compilation errors:

```bash
npx prisma generate  # Regenerate types
npm run build        # Rebuild project
```

### Port Already in Use

If port 3000 is occupied, change it in `.env`:

```env
PORT=8080
```

## 📚 Next Steps

1. **Pull your database schema**: `npx prisma db pull`
2. **Review generated schema**: Check `prisma/schema.prisma`
3. **Generate client**: `npx prisma generate`
4. **Start server**: `npm run dev`
5. **Test endpoints**: Use Postman or curl

## 🏗️ Architecture Overview

This project uses:

- **InversifyJS** - Dependency injection
- **AsyncLocalStorage** - Request context
- **Prisma 7** - Database ORM with adapter pattern
- **Custom Decorators** - `@Transactional`, `@Authenticated`, `@Authorized`
- **Modular Structure** - Domain-driven design

For more details, see [README.md](./README.md).
