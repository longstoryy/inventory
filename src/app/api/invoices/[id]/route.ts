import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/invoices/[id] - Get invoice details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: id,
                location: { organizationId: session.user.organizationId }
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        currentBalance: true
                    }
                },
                sale: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        name: true,
                                        sku: true
                                    }
                                }
                            }
                        }
                    }
                },
                createdBy: {
                    select: { name: true }
                }
            }
        })

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
        }

        // Get payment history from CreditTransactions for this customer
        const payments = await prisma.creditTransaction.findMany({
            where: {
                customerId: invoice.customerId,
                type: 'PAYMENT',
                createdAt: { gte: invoice.createdAt } // Only payments after invoice creation
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        // Calculate total paid from invoice field
        const totalPaid = Number(invoice.amountPaid)

        return NextResponse.json({
            success: true,
            data: {
                ...invoice,
                payments,
                totalPaid
            }
        })
    } catch (error) {
        console.error('Get invoice error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 })
    }
}

// PATCH /api/invoices/[id] - Update invoice
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { status, dueDate, notes } = body

        // Verify ownership
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: id,
                location: { organizationId: session.user.organizationId }
            }
        })

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
        }

        const updated = await prisma.invoice.update({
            where: { id: id },
            data: {
                ...(status && { status }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(notes !== undefined && { notes })
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update invoice error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 })
    }
}
