import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.interface.ts',
                'src/**/*.dto.ts',
                'src/**/*.enum.ts',
                'src/**/index.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@core': path.resolve(__dirname, './src/core'),
            '@modules': path.resolve(__dirname, './src/modules'),
            '@common': path.resolve(__dirname, './src/common'),
        },
    },
});
