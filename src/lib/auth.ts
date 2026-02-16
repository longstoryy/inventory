import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required')
                }

                const user = await prisma.user.findFirst({
                    where: {
                        email: credentials.email,
                        isActive: true,
                    },
                    include: {
                        role: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                subscriptionStatus: true,
                                trialEndsAt: true,
                                subscriptionEndsAt: true,
                                planName: true,
                                maxLocations: true,
                                maxProducts: true,
                                maxUsers: true,
                                features: true,
                                currency: true,
                            }
                        }
                    },
                })

                if (!user) {
                    throw new Error('Invalid email or password')
                }

                // Check organization is active
                if (!user.organization.subscriptionStatus) {
                    throw new Error('Organization subscription is not active')
                }

                const isPasswordValid = await compare(credentials.password, user.passwordHash)

                if (!isPasswordValid) {
                    throw new Error('Invalid email or password')
                }

                // Update last login
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                })

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role.name,
                    permissions: user.role.permissions as string[],
                    defaultLocationId: user.defaultLocationId,
                    isOwner: user.isOwner,
                    organizationId: user.organizationId,
                    organization: {
                        id: user.organization.id,
                        name: user.organization.name,
                        slug: user.organization.slug,
                        subscriptionStatus: user.organization.subscriptionStatus,
                        trialEndsAt: user.organization.trialEndsAt,
                        subscriptionEndsAt: user.organization.subscriptionEndsAt,
                        planName: user.organization.planName,
                        maxLocations: user.organization.maxLocations,
                        maxProducts: user.organization.maxProducts,
                        maxUsers: user.organization.maxUsers,
                        features: (user.organization.features as Record<string, boolean>) || {},
                        currency: user.organization.currency,
                    },
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.permissions = user.permissions
                token.defaultLocationId = user.defaultLocationId
                token.isOwner = user.isOwner
                token.organizationId = user.organizationId
                token.organization = user.organization
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.permissions = token.permissions as string[]
                session.user.defaultLocationId = token.defaultLocationId as string | null
                session.user.isOwner = token.isOwner as boolean
                session.user.organizationId = token.organizationId as string
                session.user.organization = token.organization as OrganizationSession
            }
            return session
        },
    },
}

// Organization data available in session
export interface OrganizationSession {
    id: string
    name: string
    slug: string
    subscriptionStatus: string
    trialEndsAt: Date | null
    subscriptionEndsAt: Date | null
    planName: string
    maxLocations: number
    maxProducts: number
    maxUsers: number
    features: Record<string, boolean>
    currency: string
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
    if (permissions.includes('*')) return true
    return permissions.includes(required)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
    if (permissions.includes('*')) return true
    return required.some(p => permissions.includes(p))
}

/**
 * Check if organization has a specific feature
 */
export function hasFeature(features: Record<string, boolean>, feature: string): boolean {
    return features[feature] === true
}

/**
 * Permission constants
 */
export const Permissions = {
    // Products
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_CREATE: 'products:create',
    PRODUCTS_EDIT: 'products:edit',
    PRODUCTS_DELETE: 'products:delete',

    // Inventory
    INVENTORY_VIEW: 'inventory:view',
    INVENTORY_ADJUST: 'inventory:adjust',

    // Transfers
    TRANSFERS_VIEW: 'transfers:view',
    TRANSFERS_CREATE: 'transfers:create',
    TRANSFERS_APPROVE: 'transfers:approve',

    // POS
    POS_ACCESS: 'pos:access',
    POS_VOID: 'pos:void',
    POS_DISCOUNT: 'pos:discount',
    POS_CREDIT_SALE: 'pos:credit_sale',

    // Purchase Orders
    PO_VIEW: 'po:view',
    PO_CREATE: 'po:create',
    PO_APPROVE: 'po:approve',
    PO_RECEIVE: 'po:receive',

    // Customers
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_MANAGE: 'customers:manage',
    CUSTOMERS_CREDIT: 'customers:credit',

    // Suppliers
    SUPPLIERS_VIEW: 'suppliers:view',
    SUPPLIERS_MANAGE: 'suppliers:manage',

    // Returns
    RETURNS_VIEW: 'returns:view',
    RETURNS_PROCESS: 'returns:process',
    RETURNS_APPROVE: 'returns:approve',

    // Expenses
    EXPENSES_VIEW: 'expenses:view',
    EXPENSES_CREATE: 'expenses:create',
    EXPENSES_APPROVE: 'expenses:approve',

    // Invoices
    INVOICES_VIEW: 'invoices:view',
    INVOICES_CREATE: 'invoices:create',
    INVOICES_SEND: 'invoices:send',

    // Reports
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',

    // Settings
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_MANAGE: 'settings:manage',

    // Billing (owner only usually)
    BILLING_VIEW: 'billing:view',
    BILLING_MANAGE: 'billing:manage',

    // Users
    USERS_VIEW: 'users:view',
    USERS_MANAGE: 'users:manage',

    // Locations
    LOCATIONS_VIEW: 'locations:view',
    LOCATIONS_MANAGE: 'locations:manage',
} as const

/**
 * Feature constants (for subscription tiers)
 */
export const Features = {
    BARCODE_SCANNING: 'barcode_scanning',
    RETURNS: 'returns',
    EXPENSES: 'expenses',
    INVOICES: 'invoices',
    ADVANCED_REPORTS: 'advanced_reports',
    MULTI_CURRENCY: 'multi_currency',
    API_ACCESS: 'api_access',
    CUSTOM_BRANDING: 'custom_branding',
    PRIORITY_SUPPORT: 'priority_support',
} as const

/**
 * Default role permissions
 */
export const RolePermissions: Record<string, string[]> = {
    admin: ['*'], // All permissions
    manager: [
        Permissions.PRODUCTS_VIEW,
        Permissions.PRODUCTS_CREATE,
        Permissions.PRODUCTS_EDIT,
        Permissions.INVENTORY_VIEW,
        Permissions.INVENTORY_ADJUST,
        Permissions.TRANSFERS_VIEW,
        Permissions.TRANSFERS_CREATE,
        Permissions.TRANSFERS_APPROVE,
        Permissions.POS_ACCESS,
        Permissions.POS_DISCOUNT,
        Permissions.POS_CREDIT_SALE,
        Permissions.PO_VIEW,
        Permissions.PO_CREATE,
        Permissions.PO_APPROVE,
        Permissions.PO_RECEIVE,
        Permissions.CUSTOMERS_VIEW,
        Permissions.CUSTOMERS_MANAGE,
        Permissions.CUSTOMERS_CREDIT,
        Permissions.SUPPLIERS_VIEW,
        Permissions.SUPPLIERS_MANAGE,
        Permissions.RETURNS_VIEW,
        Permissions.RETURNS_PROCESS,
        Permissions.RETURNS_APPROVE,
        Permissions.EXPENSES_VIEW,
        Permissions.EXPENSES_CREATE,
        Permissions.INVOICES_VIEW,
        Permissions.INVOICES_CREATE,
        Permissions.INVOICES_SEND,
        Permissions.REPORTS_VIEW,
        Permissions.REPORTS_EXPORT,
        Permissions.LOCATIONS_VIEW,
    ],
    staff: [
        Permissions.PRODUCTS_VIEW,
        Permissions.INVENTORY_VIEW,
        Permissions.INVENTORY_ADJUST,
        Permissions.TRANSFERS_VIEW,
        Permissions.TRANSFERS_CREATE,
        Permissions.POS_ACCESS,
        Permissions.PO_VIEW,
        Permissions.PO_RECEIVE,
        Permissions.CUSTOMERS_VIEW,
        Permissions.RETURNS_VIEW,
        Permissions.RETURNS_PROCESS,
        Permissions.EXPENSES_VIEW,
        Permissions.INVOICES_VIEW,
        Permissions.REPORTS_VIEW,
        Permissions.LOCATIONS_VIEW,
    ],
    viewer: [
        Permissions.PRODUCTS_VIEW,
        Permissions.INVENTORY_VIEW,
        Permissions.TRANSFERS_VIEW,
        Permissions.PO_VIEW,
        Permissions.CUSTOMERS_VIEW,
        Permissions.SUPPLIERS_VIEW,
        Permissions.RETURNS_VIEW,
        Permissions.EXPENSES_VIEW,
        Permissions.INVOICES_VIEW,
        Permissions.REPORTS_VIEW,
        Permissions.LOCATIONS_VIEW,
    ],
}
