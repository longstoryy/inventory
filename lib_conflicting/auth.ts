import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authConfig } from './config'

const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

/**
 * JWT payload interface
 */
export interface JWTPayload {
    userId: string
    email: string
    organizationId: string
    role: string
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, authConfig.jwtSecret, {
        expiresIn: authConfig.jwtExpiresIn,
    })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, authConfig.jwtSecret) as JWTPayload
        return decoded
    } catch (error) {
        return null
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    return authHeader.substring(7)
}

/**
 * Get user from request headers
 */
export async function getUserFromRequest(headers: Headers): Promise<JWTPayload | null> {
    const authHeader = headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
        return null
    }

    return verifyToken(token)
}
