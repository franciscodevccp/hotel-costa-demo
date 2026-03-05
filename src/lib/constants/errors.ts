/**
 * Códigos de error centralizados para la aplicación
 */

export const ERROR_CODES = {
    // Errores de autenticación
    AUTH_FAILED: 'auth',
    AUTH_PROFILE_NOT_FOUND: 'profile',
    AUTH_NO_PROFILE: 'no_profile',

    // Errores de base de datos
    DB_ERROR: 'db_error',

    // Errores generales
    UNKNOWN: 'unknown',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Mensajes de error user-friendly
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ERROR_CODES.AUTH_FAILED]: 'Error al iniciar sesión. Por favor, verifica tus credenciales.',
    [ERROR_CODES.AUTH_PROFILE_NOT_FOUND]: 'No se pudo cargar tu perfil de usuario. Por favor, contacta al administrador.',
    [ERROR_CODES.AUTH_NO_PROFILE]: 'Tu cuenta no está vinculada a un perfil. Por favor, contacta al administrador.',
    [ERROR_CODES.DB_ERROR]: 'Error de base de datos. Por favor, intenta nuevamente.',
    [ERROR_CODES.UNKNOWN]: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
};

/**
 * Obtener mensaje de error user-friendly
 */
export function getErrorMessage(code?: ErrorCode | string): string {
    if (!code) return ERROR_MESSAGES[ERROR_CODES.UNKNOWN];

    const errorCode = code as ErrorCode;
    return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN];
}
