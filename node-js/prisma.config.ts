import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 Configuration
 * 
 * In Prisma 7, the datasource connection URL is configured here
 * instead of in schema.prisma. The DATABASE_URL is loaded from
 * environment variables using the env() helper.
 */
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
