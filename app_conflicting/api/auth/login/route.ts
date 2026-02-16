import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { registerSchema, loginSchema } from '@/lib/validation'
import { formatErrorResponse, ConflictError, AuthenticationError, ValidationError } from '@/lib/errors'
import { verifyPassword } from '@/lib/auth'

/**
 * POST /api/auth/register
 * Register a new user and organization
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Handle registration
        if (request.nextUrl.pathname.endsWith('/register')) {
            const validation = registerSchema.safeParse(body)

            if (!validation.success) {
                throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
            }

            const { organizationName, email, password, name } = validation.data

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email },
            })

            if (existingUser) {
                throw new ConflictError('User with this email already exists')
            }

            // Create organization and user in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create organization
                const organization = await tx.organization.create({
                    data: {
                        name: organizationName,
                        slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    },
                })

                // Hash password
                const passwordHash = await hashPassword(password)

                // Create user (first user is always admin)
                const user = await tx.user.create({
                    data: {
                        organizationId: organization.id,
                        email,
                        passwordHash,
                        name,
                        role: 'ADMIN',
                    },
                })

                return { organization, user }
            })

            // Generate JWT token
            const token = generateToken({
                userId: result.user.id,
                email: result.user.email,
                organizationId: result.organization.id,
                role: result.user.role,
            })

            return NextResponse.json({
                token,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    organizationId: result.organization.id,
                    organizationName: result.organization.name,
                },
            }, { status: 201 })
        }

        // Handle login
        if (request.nextUrl.pathname.endsWith('/login')) {
            const validation = loginSchema.safeParse(body)

            if (!validation.success) {
                throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
            }

            const { email, password } = validation.data

            // Find user with organization
            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    organization: true,
                },
            })

            if (!user || !user.active) {
                throw new AuthenticationError('Invalid email or password')
            }

            // Verify password
            const isValidPassword = await verifyPassword(password, user.passwordHash)

            if (!isValidPassword) {
                throw new AuthenticationError('Invalid email or password')
            }

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
                organizationId: user.organizationId,
                role: user.role,
            })

            return NextResponse.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId,
                    organizationName: user.organization.name,
                },
            })
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
        const errorResponse = formatErrorResponse(error)
        return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
    }
}
