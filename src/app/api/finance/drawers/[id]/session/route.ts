
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/finance/drawers/[id]/session - OPEN A DRAWER
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { startingFloat, notes } = body

        // Verify User belongs to Org
        const drawer = await prisma.cashDrawer.findFirst({
            where: { id, organizationId: session.user.organizationId }
        })

        if (!drawer) {
            return NextResponse.json({ success: false, error: 'Drawer not found' }, { status: 404 })
        }

        if (drawer.status === 'OPEN') {
            return NextResponse.json({ success: false, error: 'Drawer is already open' }, { status: 400 })
        }

        // Transaction: Open Drawer and Log Initial Float
        await prisma.$transaction(async (tx) => {
            // Update Drawer State
            await tx.cashDrawer.update({
                where: { id },
                data: {
                    status: 'OPEN',
                    openedAt: new Date(),
                    openedById: session.user.id,
                    startingFloat: startingFloat || 0,
                    currentBalance: startingFloat || 0,
                    closedAt: null,
                    closedById: null,
                    actualBalance: null,
                    discrepancy: null,
                    notes: notes
                }
            })

            // Log Transaction (Opening Float)
            if (startingFloat > 0) {
                await tx.cashTransaction.create({
                    data: {
                        drawerId: id,
                        type: 'OPENING_FLOAT',
                        amount: startingFloat,
                        balanceBefore: 0,
                        balanceAfter: startingFloat,
                        description: `Opening Float by ${session.user.name}`,
                        performedById: session.user.id
                    }
                })
            }
        })

        return NextResponse.json({ success: true, message: 'Drawer opened successfully' })

    } catch (error) {
        console.error('Open drawer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to open drawer' }, { status: 500 })
    }
}

// PUT /api/finance/drawers/[id]/session - CLOSE A DRAWER
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { actualBalance, notes } = body // The physical count

        const drawer = await prisma.cashDrawer.findFirst({
            where: { id, organizationId: session.user.organizationId }
        })

        if (!drawer) return NextResponse.json({ success: false, error: 'Drawer not found' }, { status: 404 })
        if (drawer.status !== 'OPEN') return NextResponse.json({ success: false, error: 'Drawer is not open' }, { status: 400 })

        const systemExpected = Number(drawer.currentBalance)
        const counted = Number(actualBalance)
        const discrepancy = counted - systemExpected

        // Calculate Digital Settlements (Non-Cash Sales during this shift)
        const digitalSales = await prisma.sale.groupBy({
            by: ['paymentMethod'],
            where: {
                locationId: drawer.locationId,
                userId: session.user.id, // Only sales by this cashier
                createdAt: {
                    gte: drawer.openedAt // Since drawer opened
                },
                paymentMethod: {
                    not: 'CASH'
                }
            },
            _sum: {
                totalAmount: true
            }
        })

        // Transaction: Close Drawer
        await prisma.$transaction(async (tx) => {
            // Log Closing Count (if needed, or just update the drawer record)
            await tx.cashDrawer.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                    closedById: session.user.id,
                    expectedBalance: systemExpected,
                    actualBalance: counted,
                    discrepancy: discrepancy,
                    notes: notes ? `${drawer.notes || ''} | Closing Note: ${notes}` : drawer.notes
                }
            })
        })

        return NextResponse.json({
            success: true,
            data: {
                expectedBalance: systemExpected,
                actualBalance: counted,
                discrepancy,
                digitalSales: digitalSales.map(g => ({
                    method: g.paymentMethod,
                    amount: g._sum.totalAmount || 0
                }))
            }
        })

    } catch (error) {
        console.error('Close drawer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to close drawer' }, { status: 500 })
    }
}
