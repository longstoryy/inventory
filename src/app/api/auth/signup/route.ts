import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { RolePermissions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const signupSchema = z.object({
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validation = signupSchema.safeParse(body)

        if (!validation.success) {
            const firstIssue = validation.error.issues?.[0]
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: firstIssue?.message || 'Validation error'
                    }
                },
                { status: 400 }
            )
        }

        const { organizationName, name, email, password, phone } = validation.data

        // Check if email already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        })

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' }
                },
                { status: 400 }
            )
        }

        // Generate slug from organization name
        const baseSlug = organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        // Check if slug exists and make unique
        let slug = baseSlug
        let counter = 1
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`
            counter++
        }

        // Hash password
        const passwordHash = await hash(password, 12)

        // Calculate trial end date (14 days)
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + 14)

        // Create organization, admin role, and user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create organization
            const organization = await tx.organization.create({
                data: {
                    name: organizationName,
                    slug,
                    email: email.toLowerCase(),
                    phone,
                    currency: 'GHS',
                    timezone: 'Africa/Accra',
                    planName: 'trial',
                    subscriptionStatus: 'TRIALING',
                    trialEndsAt,
                    maxLocations: 1,
                    maxProducts: 100,
                    maxUsers: 2,
                    maxStorageMb: 1024,
                    features: {
                        pos: true,
                        purchases: true,
                        credit_sales: true,
                        expiration_alerts: true,
                        basic_reports: true,
                    },
                },
            })

            // Create admin role for this organization
            const adminRole = await tx.role.create({
                data: {
                    organizationId: organization.id,
                    name: 'admin',
                    description: 'Full access to all features',
                    permissions: RolePermissions.admin,
                    isSystem: true,
                },
            })

            // Create manager role
            await tx.role.create({
                data: {
                    organizationId: organization.id,
                    name: 'manager',
                    description: 'Manage inventory and staff',
                    permissions: RolePermissions.manager,
                    isSystem: true,
                },
            })

            // Create staff role
            await tx.role.create({
                data: {
                    organizationId: organization.id,
                    name: 'staff',
                    description: 'Day-to-day operations',
                    permissions: RolePermissions.staff,
                    isSystem: true,
                },
            })

            // Create owner user
            const user = await tx.user.create({
                data: {
                    organizationId: organization.id,
                    email: email.toLowerCase(),
                    passwordHash,
                    name,
                    phone,
                    roleId: adminRole.id,
                    isOwner: true,
                },
            })

            // Create default location
            await tx.location.create({
                data: {
                    organizationId: organization.id,
                    name: 'Main Store',
                    type: 'STORE',
                },
            })

            // Create default expense categories
            const defaultExpenseCategories = [
                'Rent',
                'Utilities',
                'Supplies',
                'Transport',
                'Salaries',
                'Marketing',
                'Other',
            ]

            for (const catName of defaultExpenseCategories) {
                await tx.expenseCategory.create({
                    data: {
                        organizationId: organization.id,
                        name: catName,
                    },
                })
            }

            // Create invoice settings
            await tx.invoiceSettings.create({
                data: {
                    organizationId: organization.id,
                    prefix: 'INV',
                    nextNumber: 1,
                },
            })

            return { organization, user }
        })

        return NextResponse.json({
            success: true,
            data: {
                organizationId: result.organization.id,
                userId: result.user.id,
                slug: result.organization.slug,
                trialEndsAt: result.organization.trialEndsAt,
            },
        })
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            {
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'An error occurred during signup' }
            },
            { status: 500 }
        )
    }
}
