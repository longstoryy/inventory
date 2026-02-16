import { NextResponse } from 'next/server'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'
import { PaymentMethod, CreditTransactionType, InvoiceStatus } from '@prisma/client'

export async function POST(req: Request) {
    try {
        const body = await req.text()
        const signature = req.headers.get('x-paystack-signature')

        if (!signature || !paystack.verifyWebhookSignature(body, signature)) {
            return new NextResponse('Invalid signature', { status: 401 })
        }

        const event = JSON.parse(body)

        // Only handle successful charges for now
        if (event.event === 'charge.success') {
            const { metadata, amount, reference } = event.data
            const { paymentType, referenceId, organizationId, userId } = metadata

            if (paymentType === 'INVOICE') {
                await handleInvoicePayment(referenceId, amount / 100, reference, organizationId, userId)
            }
        }

        return new NextResponse('OK', { status: 200 })
    } catch (error: any) {
        console.error('[PAYSTACK_WEBHOOK]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}

async function handleInvoicePayment(
    invoiceId: string,
    amount: number,
    reference: string,
    organizationId: string,
    userId: string
) {
    await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true, sale: true }
        })

        if (!invoice) throw new Error('Invoice not found')

        // 1. Update Invoice
        const newAmountPaid = Number(invoice.amountPaid) + amount
        const newBalanceDue = Number(invoice.totalAmount) - newAmountPaid
        const isFullyPaid = newBalanceDue <= 0

        await tx.invoice.update({
            where: { id: invoiceId },
            data: {
                amountPaid: newAmountPaid,
                balanceDue: Math.max(0, newBalanceDue),
                status: isFullyPaid ? InvoiceStatus.PAID : invoice.status,
                paidAt: isFullyPaid ? new Date() : invoice.paidAt
            }
        })

        // 2. Update Sale (if applicable)
        await tx.sale.update({
            where: { id: invoice.saleId },
            data: {
                amountPaid: { increment: amount }
            }
        })

        // 3. Record Credit Transaction (History)
        await tx.creditTransaction.create({
            data: {
                customerId: invoice.customerId,
                saleId: invoice.saleId,
                type: CreditTransactionType.PAYMENT,
                amount: amount,
                balanceAfter: Number(invoice.customer.currentBalance) - amount, // Simplified
                paymentMethod: PaymentMethod.MOBILE_MONEY,
                reference: reference,
                notes: `Invoice Payment via Paystack (${reference})`,
                createdById: userId
            }
        })

        // 4. Update Customer Balance
        await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
                currentBalance: { decrement: amount },
                lastPaymentDate: new Date()
            }
        })
    })
}
