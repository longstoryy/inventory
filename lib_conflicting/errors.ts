/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public errors?: Record<string, string[]>) {
        super(message, 400, 'VALIDATION_ERROR')
        this.name = 'ValidationError'
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR')
        this.name = 'AuthenticationError'
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR')
        this.name = 'AuthorizationError'
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND')
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT')
        this.name = 'ConflictError'
    }
}

/**
 * Format error response for API
 */
export function formatErrorResponse(error: unknown) {
    if (error instanceof AppError) {
        return {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
            ...(error instanceof ValidationError && error.errors ? { errors: error.errors } : {}),
        }
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: any }

        if (prismaError.code === 'P2002') {
            return {
                error: 'A record with this value already exists',
                code: 'UNIQUE_CONSTRAINT',
                statusCode: 409,
            }
        }

        if (prismaError.code === 'P2025') {
            return {
                error: 'Record not found',
                code: 'NOT_FOUND',
                statusCode: 404,
            }
        }
    }

    // Default error
    console.error('Unhandled error:', error)
    return {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
    }
}
