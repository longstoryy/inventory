import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma, InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/invoices - List invoices
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')
        const customerId = searchParams.get('customerId')

        const where = {
            location: { organizationId: session.user.organizationId },
            ...(status && { status: status as InvoiceStatus }),
            ...(customerId && { customerId }),
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, email: true } },
                    sale: { select: { saleNumber: true } },
                    createdBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.invoice.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: invoices,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        })
    } catch (error) {
        console.error('Get invoices error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 })
    }
}

// POST /api/invoices - Create invoice
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { saleId, dueDate, notes } = body

        if (!saleId || !dueDate) {
            return NextResponse.json({ success: false, error: 'Sale ID and due date are required' }, { status: 400 })
        }

        // Fetch sale details
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { location: true, customer: true }
        })

        if (!sale) {
            return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 })
        }

        if (sale.location.organizationId !== session.user.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
        }

        if (!sale.customerId) {
            return NextResponse.json({ success: false, error: 'Sale must have a customer to invoice' }, { status: 400 })
        }

        // Generate invoice number
        const settings = await prisma.invoiceSettings.findUnique({
            where: { organizationId: session.user.organizationId }
        })
        const prefix = settings?.prefix || 'INV'
        const nextNum = settings?.nextNumber || 1
        const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3)
        const invoiceNumber = `${prefix}-${orgSlug}-${String(nextNum).padStart(6, '0')}`

        // Create Invoice
        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    saleId: sale.id,
                    customerId: sale.customerId!,
                    locationId: sale.locationId,
                    status: 'SENT', // Assuming created invoices are sent immediately in this flow
                    dueDate: new Date(dueDate),
                    subtotal: sale.subtotal,
                    taxAmount: sale.taxAmount,
                    discountAmount: sale.discountAmount,
                    totalAmount: sale.totalAmount,
                    amountPaid: sale.amountPaid,
                    balanceDue: Number(sale.totalAmount) - Number(sale.amountPaid),
                    createdById: session.user.id,
                    notes,
                }
            })

            // Update next number
            await tx.invoiceSettings.upsert({
                where: { organizationId: session.user.organizationId },
                update: { nextNumber: { increment: 1 } },
                create: { organizationId: session.user.organizationId, nextNumber: 2 }
            })

            return newInvoice
        })

        return NextResponse.json({ success: true, data: invoice }, { status: 201 })

    } catch (error) {
        console.error('Create invoice error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 })
    }
}
