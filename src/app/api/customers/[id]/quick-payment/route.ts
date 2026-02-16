import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PaymentMethod } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/customers/[id]/quick-payment - Auto-apply payment to invoices (FIFO)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: customerId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId || !session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, paymentMethod, reference, notes } = body

        // Validate
        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, error: 'Invalid payment amount' }, { status: 400 })
        }

        if (!paymentMethod) {
            return NextResponse.json({ success: false, error: 'Payment method is required' }, { status: 400 })
        }

        // Verify customer exists and belongs to organization
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                organizationId: session.user.organizationId
            }
        })

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        // Get unpaid invoices ordered by due date (FIFO)
        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                customerId: customerId,
                status: { in: ['SENT', 'OVERDUE'] },
                balanceDue: { gt: 0 }
            },
            orderBy: { dueDate: 'asc' }
        })

        if (unpaidInvoices.length === 0) {
            return NextResponse.json({ success: false, error: 'No unpaid invoices found' }, { status: 400 })
        }

        // Apply payment in transaction
        const result = await prisma.$transaction(async (tx) => {
            let remainingAmount = amount
            const paymentsApplied: Array<{ invoiceId: string; amount: number; invoiceNumber: string }> = []

            for (const invoice of unpaidInvoices) {
                if (remainingAmount <= 0) break

                const paymentAmount = Math.min(remainingAmount, Number(invoice.balanceDue))

                // Update invoice
                const newAmountPaid = Number(invoice.amountPaid) + paymentAmount
                const newBalance = Number(invoice.balanceDue) - paymentAmount
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        amountPaid: newAmountPaid,
                        balanceDue: newBalance,
                        status: newBalance === 0 ? 'PAID' : invoice.status,
                        paidAt: newBalance === 0 ? new Date() : null
                    }
                })

                paymentsApplied.push({
                    invoiceId: invoice.id,
                    amount: paymentAmount,
                    invoiceNumber: invoice.invoiceNumber
                })

                remainingAmount -= paymentAmount
            }

            // Update customer balance
            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    currentBalance: { decrement: amount },
                    lastPaymentDate: new Date()
                }
            })

            // Create credit transaction record
            const appliedToInvoices = paymentsApplied.map(p => p.invoiceNumber).join(', ')
            const creditTx = await tx.creditTransaction.create({
                data: {
                    customerId: customerId,
                    type: 'PAYMENT',
                    amount,
                    balanceAfter: Number(updatedCustomer.currentBalance),
                    paymentMethod: paymentMethod as PaymentMethod,
                    reference: reference || null,
                    notes: notes || `Quick payment applied to: ${appliedToInvoices}`,
                    createdById: session.user.id
                }
            })

            // If CASH payment, add to active cash drawer
            if (paymentMethod === 'CASH') {
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
                    await tx.cashDrawer.update({
                        where: { id: activeDrawer.id },
                        data: {
                            currentBalance: { increment: amount }
                        }
                    })

                    // Create cash transaction record
                    await tx.cashTransaction.create({
                        data: {
                            drawerId: activeDrawer.id,
                            type: 'SALE_CASH_IN',
                            amount,
                            balanceBefore: activeDrawer.currentBalance,
                            balanceAfter: Number(activeDrawer.currentBalance) + Number(amount),
                            description: `Quick payment from ${customer.name} (${appliedToInvoices})`,
                            performedById: session.user.id,
                            referenceId: creditTx.id,
                            referenceType: 'CreditTransaction'
                        }
                    })
                }
            }

            return { paymentsApplied }
        })

        return NextResponse.json({
            success: true,
            data: result.paymentsApplied,
            message: `Payment applied to ${result.paymentsApplied.length} invoice(s)`
        })
    } catch (error) {
        console.error('Quick payment error:', error)
        return NextResponse.json({ success: false, error: 'Failed to process payment' }, { status: 500 })
    }
}
