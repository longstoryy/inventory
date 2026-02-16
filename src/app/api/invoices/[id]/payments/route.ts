import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PaymentMethod } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/invoices/[id]/payments - Record payment on invoice
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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

        // Get invoice with ownership check
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: id,
                location: { organizationId: session.user.organizationId }
            },
            include: { customer: true }
        })

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
        }

        // Check if already paid
        if (invoice.status === 'PAID' || Number(invoice.balanceDue) === 0) {
            return NextResponse.json({ success: false, error: 'Invoice is already paid' }, { status: 400 })
        }

        // Check if payment exceeds balance
        if (amount > Number(invoice.balanceDue)) {
            return NextResponse.json({ 
                success: false, 
                error: `Payment amount (GHS ${amount}) exceeds balance due (GHS ${invoice.balanceDue})` 
            }, { status: 400 })
        }

        // Execute payment in transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update invoice
            const newAmountPaid = Number(invoice.amountPaid) + amount
            const newBalance = Number(invoice.balanceDue) - amount
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    amountPaid: newAmountPaid,
                    balanceDue: newBalance,
                    status: newBalance === 0 ? 'PAID' : invoice.status,
                    paidAt: newBalance === 0 ? new Date() : null
                }
            })

            // 2. Update customer balance
            const updatedCustomer = await tx.customer.update({
                where: { id: invoice.customerId },
                data: {
                    currentBalance: { decrement: amount },
                    lastPaymentDate: new Date()
                }
            })

            // 3. Create credit transaction record
            const creditTx = await tx.creditTransaction.create({
                data: {
                    customerId: invoice.customerId,
                    type: 'PAYMENT',
                    amount,
                    balanceAfter: Number(updatedCustomer.currentBalance),
                    paymentMethod: paymentMethod as PaymentMethod,
                    reference: reference || `INV:${invoice.invoiceNumber}`,
                    notes: notes || `Payment for invoice ${invoice.invoiceNumber}`,
                    createdById: session.user.id
                }
            })

            // 4. If CASH payment, add to active cash drawer
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
                            description: `Payment for ${invoice.invoiceNumber} from ${invoice.customer.name}`,
                            performedById: session.user.id,
                            referenceId: creditTx.id,
                            referenceType: 'CreditTransaction'
                        }
                    })
                }
            }

            return { creditTx, invoice: updatedInvoice }
        })

        return NextResponse.json({ 
            success: true, 
            data: result.creditTx,
            invoice: result.invoice
        })
    } catch (error) {
        console.error('Record payment error:', error)
        return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 })
    }
}
