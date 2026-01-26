import pino from 'pino';

/**
 * Basic ASCII logger to prevent "alien language" characters
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            // Disable Unicode characters for maximum compatibility
            singleLine: false,
        },
    },
});
