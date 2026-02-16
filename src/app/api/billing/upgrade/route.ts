import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/billing/upgrade - Upgrade subscription plan
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { planId } = body

        // Get the plan
        const plan = await prisma.plan.findFirst({
            where: {
                OR: [
                    { id: planId },
                    { name: { equals: planId, mode: 'insensitive' } },
                ],
                isActive: true,
            },
        })

        if (!plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
        }

        const organization = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            include: { subscription: true },
        })

        if (!organization) {
            return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
        }

        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        // Execute upgrade in a single transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update organization with new plan limits
            await tx.organization.update({
                where: { id: organization.id },
                data: {
                    planId: plan.id,
                    planName: plan.name,
                    subscriptionStatus: 'ACTIVE',
                    maxLocations: plan.maxLocations,
                    maxProducts: plan.maxProducts,
                    maxUsers: plan.maxUsers,
                    maxStorageMb: plan.maxStorageMb,
                    subscriptionEndsAt: periodEnd,
                },
            })

            // 2. Manage subscription record
            if (organization.subscription) {
                // Update existing subscription
                await tx.subscription.update({
                    where: { id: organization.subscription.id },
                    data: {
                        planId: plan.id,
                        planName: plan.name,
                        amount: plan.monthlyPrice,
                        billingCycle: 'MONTHLY',
                        status: 'ACTIVE',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                })
            } else {
                // Create new subscription
                await tx.subscription.create({
                    data: {
                        organizationId: organization.id,
                        planId: plan.id,
                        planName: plan.name,
                        amount: plan.monthlyPrice,
                        billingCycle: 'MONTHLY',
                        status: 'ACTIVE',
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                })
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Upgrade error:', error)
        return NextResponse.json({ success: false, error: 'Failed to upgrade' }, { status: 500 })
    }
}
