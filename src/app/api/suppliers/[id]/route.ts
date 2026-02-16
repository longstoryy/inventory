import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/suppliers/[id] - Get single supplier with contacts, products, and orders
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

        const supplier = await prisma.supplier.findFirst({
            where: { id, organizationId: session.user.organizationId },
            include: {
                contacts: { orderBy: { isPrimary: 'desc' } },
                products: {
                    include: { product: { select: { name: true, sku: true } } },
                },
                purchaseOrders: {
                    orderBy: { orderDate: 'desc' },
                    take: 20,
                    select: { id: true, poNumber: true, status: true, totalAmount: true, orderDate: true },
                },
            },
        })

        if (!supplier) {
            return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: supplier })
    } catch (error) {
        console.error('Get supplier error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch supplier' }, { status: 500 })
    }
}

// PUT /api/suppliers/[id] - Update supplier
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
        const { name, email, phone, address, city, country, website, taxId, paymentTerms, leadTimeDays, notes, isActive } = body

        const existing = await prisma.supplier.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: { name, email, phone, address, city, country, website, taxId, paymentTerms, leadTimeDays, notes, isActive },
            include: {
                contacts: { orderBy: { isPrimary: 'desc' } },
                products: { include: { product: { select: { name: true, sku: true } } } },
                purchaseOrders: { orderBy: { orderDate: 'desc' }, take: 20, select: { id: true, poNumber: true, status: true, totalAmount: true, orderDate: true } },
            },
        })

        return NextResponse.json({ success: true, data: supplier })
    } catch (error) {
        console.error('Update supplier error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update supplier' }, { status: 500 })
    }
}

// DELETE /api/suppliers/[id] - Delete supplier
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

        const existing = await prisma.supplier.findFirst({
            where: { id, organizationId: session.user.organizationId },
            include: { _count: { select: { purchaseOrders: true } } },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
        }

        if (existing._count.purchaseOrders > 0) {
            return NextResponse.json({ success: false, error: 'Cannot delete supplier with purchase orders' }, { status: 400 })
        }

        await prisma.supplier.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete supplier error:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete supplier' }, { status: 500 })
    }
}
