import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/billing - Get billing information
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const organization = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            include: {
                subscription: true,
                plan: true,
            },
        })

        if (!organization) {
            return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
        }

        // Get counts
        const [userCount, productCount, locationCount] = await Promise.all([
            prisma.user.count({ where: { organizationId: session.user.organizationId } }),
            prisma.product.count({ where: { organizationId: session.user.organizationId } }),
            prisma.location.count({ where: { organizationId: session.user.organizationId } }),
        ])

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const offset = (page - 1) * limit

        // Get payment history (paginated)
        const [payments, totalPayments] = organization.subscription?.id
            ? await Promise.all([
                prisma.payment.findMany({
                    where: { subscriptionId: organization.subscription.id },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.payment.count({
                    where: { subscriptionId: organization.subscription.id },
                })
            ])
            : [[], 0]

        return NextResponse.json({
            success: true,
            data: {
                subscription: organization.subscription ? {
                    ...organization.subscription,
                    plan: organization.plan || {
                        name: organization.planName,
                        price: Number(organization.subscription.amount),
                        limits: {
                            maxUsers: organization.maxUsers,
                            maxProducts: organization.maxProducts,
                            maxLocations: organization.maxLocations,
                        },
                    },
                } : null,
                payments,
                usage: {
                    users: userCount,
                    products: productCount,
                    locations: locationCount,
                },
                limits: {
                    maxUsers: organization.maxUsers,
                    maxProducts: organization.maxProducts,
                    maxLocations: organization.maxLocations,
                },
                planName: organization.planName,
                subscriptionStatus: organization.subscriptionStatus,
            },
            pagination: {
                total: totalPayments,
                page,
                limit,
                totalPages: Math.ceil(totalPayments / limit)
            }
        })
    } catch (error) {
        console.error('Get billing error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch billing' }, { status: 500 })
    }
}
