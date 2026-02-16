import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || !session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id: customerId } = await params
        const body = await request.json()
        const { amount, paymentMethod, reference, notes } = body

        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
        }

        // 1. Get Customer and Organization
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                organizationId: session.user.organizationId
            }
        })

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        // 2. Perform Transaction
        const updatedItems = await prisma.$transaction(async (tx) => {
            // A. Update Customer Balance
            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    currentBalance: { decrement: amount },
                    lastPaymentDate: new Date()
                }
            })

            // B. Create Credit Transaction record
            const creditTx = await tx.creditTransaction.create({
                data: {
                    customerId,
                    type: 'PAYMENT',
                    amount,
                    balanceAfter: Number(updatedCustomer.currentBalance),
                    paymentMethod,
                    reference: reference || null,
                    notes: notes || 'Direct debt repayment',
                    createdById: session.user.id
                }
            })

            // C. Cash Management Integration (If CASH)
            if (paymentMethod === 'CASH') {
                // Find Active Drawer (Staff personal OR ANY open drawer in the organization)
                const activeDrawer = await tx.cashDrawer.findFirst({
                    where: {
                        OR: [
                            { openedById: session.user.id, status: 'OPEN' },
                            { organizationId: session.user.organizationId, status: 'OPEN' }
                        ]
                    },
                    orderBy: { openedAt: 'desc' }
                })

                if (activeDrawer) {
                    // Update Drawer Balance
                    await tx.cashDrawer.update({
                        where: { id: activeDrawer.id },
                        data: {
                            currentBalance: { increment: amount }
                        }
                    })

                    // Create Cash Transaction record
                    await tx.cashTransaction.create({
                        data: {
                            drawerId: activeDrawer.id,
                            type: 'SALE_CASH_IN',
                            amount,
                            balanceBefore: activeDrawer.currentBalance,
                            balanceAfter: Number(activeDrawer.currentBalance) + Number(amount),
                            description: `Repayment from ${customer.name} (Ref: ${reference || 'N/A'})`,
                            performedById: session.user.id,
                            referenceId: creditTx.id,
                            referenceType: 'CreditTransaction'
                        }
                    })
                }
            }

            return updatedCustomer
        })

        return NextResponse.json({ success: true, data: updatedItems })
    } catch (error: any) {
        console.error('Repayment error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
