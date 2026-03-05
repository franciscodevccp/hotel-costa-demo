/**
 * Sistema de Logging para la aplicación
 * En desarrollo: muestra logs en consola
 * En producción: preparado para integración con servicios externos
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    error(message: string, context?: LogContext): void {
        const formatted = this.formatMessage('error', message, context);

        if (this.isDevelopment) {
            console.error(formatted);
        }

        // TODO: En producción, enviar a servicio de logging (Sentry, LogRocket, etc.)
        // Example: sendToLoggingService('error', formatted);
    }

    warn(message: string, context?: LogContext): void {
        const formatted = this.formatMessage('warn', message, context);

        if (this.isDevelopment) {
            console.warn(formatted);
        }

        // TODO: En producción, enviar a servicio de logging
    }

    info(message: string, context?: LogContext): void {
        const formatted = this.formatMessage('info', message, context);

        if (this.isDevelopment) {
            console.info(formatted);
        }

        // TODO: En producción, enviar a servicio de logging
    }

    debug(message: string, context?: LogContext): void {
        // Debug solo en desarrollo
        if (this.isDevelopment) {
            const formatted = this.formatMessage('debug', message, context);
            console.debug(formatted);
        }
    }
}

// Exportar instancia singleton
export const logger = new Logger();
