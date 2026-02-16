import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { paymentType, referenceId, amount, email, metadata = {} } = body

        if (!paymentType || !referenceId || !amount || !email) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // 1. Specific Validation based on Payment Type
        if (paymentType === 'INVOICE') {
            const invoice = await prisma.invoice.findFirst({
                where: { id: referenceId },
                include: { location: true }
            })

            if (!invoice || invoice.location.organizationId !== session.user.organizationId) {
                return new NextResponse('Invoice not found', { status: 404 })
            }

            if (invoice.status === 'PAID') {
                return new NextResponse('Invoice already paid', { status: 400 })
            }
        }

        // 2. Initialize Paystack Transaction
        // Note: Paystack expects amount in Kobo/Pesewas (cent units)
        const amountInPesewas = Math.round(Number(amount) * 100)

        const response = await paystack.initializeTransaction({
            email,
            amount: amountInPesewas,
            callback_url: `${process.env.NEXTAUTH_URL}/payments/verify`,
            metadata: {
                ...metadata,
                paymentType,
                referenceId,
                organizationId: session.user.organizationId,
                userId: session.user.id
            }
        })

        if (!response.status) {
            return new NextResponse(response.message || 'Initialization failed', { status: 400 })
        }

        return NextResponse.json(response.data)

    } catch (error: any) {
        console.error('[PAYMENTS_INITIALIZE]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}
