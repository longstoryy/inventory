import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT /api/products/[id]/variants/[variantId] - Update variant
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; variantId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id, variantId } = await params
        const body = await request.json()
        const { name, sku, price, costPrice, options, isActive } = body

        // Verify product belongs to org
        const product = await prisma.product.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        const variant = await prisma.productVariant.update({
            where: { id: variantId },
            data: { name, sku, price, costPrice, options, isActive },
            include: {
                stockLevels: { include: { location: { select: { name: true } } } },
            },
        })

        return NextResponse.json({ success: true, data: variant })
    } catch (error) {
        console.error('Update variant error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update variant' }, { status: 500 })
    }
}

// DELETE /api/products/[id]/variants/[variantId] - Delete variant
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; variantId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id, variantId } = await params

        // Verify product belongs to org
        const product = await prisma.product.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        await prisma.productVariant.delete({ where: { id: variantId } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete variant error:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete variant' }, { status: 500 })
    }
}
