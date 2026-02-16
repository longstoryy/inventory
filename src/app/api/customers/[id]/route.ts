import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/customers/[id] - Get single customer with transactions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const customer = await prisma.customer.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                _count: { select: { sales: true } },
                creditTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        sale: { select: { id: true, saleNumber: true } },
                    },
                },
            },
        })

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: customer })
    } catch (error) {
        console.error('Get customer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch customer' }, { status: 500 })
    }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, email, phone, address, city, country, taxId, creditLimit, paymentTerms, notes, isActive } = body

        // Verify customer belongs to org
        const existing = await prisma.customer.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                city,
                country,
                taxId,
                creditLimit: creditLimit !== undefined ? creditLimit : undefined,
                paymentTerms,
                notes,
                isActive,
            },
            include: {
                _count: { select: { sales: true } },
                creditTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        sale: { select: { saleNumber: true } },
                    },
                },
            },
        })

        return NextResponse.json({ success: true, data: customer })
    } catch (error) {
        console.error('Update customer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update customer' }, { status: 500 })
    }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const existing = await prisma.customer.findFirst({
            where: { id, organizationId: session.user.organizationId },
            include: { _count: { select: { sales: true } } },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        if (existing._count.sales > 0) {
            return NextResponse.json({ success: false, error: 'Cannot delete customer with sales history' }, { status: 400 })
        }

        await prisma.customer.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete customer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete customer' }, { status: 500 })
    }
}
