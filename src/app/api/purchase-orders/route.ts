import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface POItem {
    productId: string
    quantity: number
    unitCost: number
    notes?: string
}

// GET /api/purchase-orders - Get all POs
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
        const supplierId = searchParams.get('supplierId')

        const where: any = {
            location: { organizationId: session.user.organizationId },
            ...(status && { status: status as 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED' }),
            ...(supplierId && { supplierId }),
        }

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { id: true, name: true, code: true } },
                    location: { select: { id: true, name: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.purchaseOrder.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        })
    } catch (error) {
        console.error('Get POs error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

// POST /api/purchase-orders - Create PO
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { supplierId, locationId, items, expectedDate, notes, subtotal, taxAmount, shippingCost, totalAmount } = body

        if (!supplierId || !locationId || !items || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Supplier, location, and items are required' }, { status: 400 })
        }

        // Verify supplier and location
        const [supplier, location] = await Promise.all([
            prisma.supplier.findFirst({ where: { id: supplierId, organizationId: session.user.organizationId } }),
            prisma.location.findFirst({ where: { id: locationId, organizationId: session.user.organizationId } }),
        ])

        if (!supplier || !location) {
            return NextResponse.json({ success: false, error: 'Supplier or location not found' }, { status: 404 })
        }

        // Generate PO number
        const poCount = await prisma.purchaseOrder.count({ where: { location: { organizationId: session.user.organizationId } } })
        const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3)
        const poNumber = `PO-${orgSlug}-${String(poCount + 1).padStart(6, '0')}`

        // Prepare order items
        const orderItems = items.map((item: POItem) => ({
            productId: item.productId,
            orderedQuantity: item.quantity,
            receivedQuantity: 0,
            unitCost: item.unitCost,
            notes: item.notes,
        }))

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                supplierId,
                locationId,
                poNumber,
                status: 'DRAFT',
                subtotal: subtotal || 0,
                taxAmount: taxAmount || 0,
                shippingCost: shippingCost || 0,
                totalAmount: totalAmount || 0,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes,
                createdById: session.user.id,
                items: { create: orderItems },
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
            },
        })

        return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 })
    } catch (error) {
        console.error('Create PO error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create purchase order' }, { status: 500 })
    }
}
