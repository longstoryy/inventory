import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/products/[id]/variants - Get all variants for a product
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

        // Verify product ownership to prevent cross-tenant leaks
        const product = await prisma.product.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        const variants = await prisma.productVariant.findMany({
            where: { productId: id },
        })

        return NextResponse.json({ success: true, data: variants })
    } catch (error) {
        console.error('Get variants error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch variants' }, { status: 500 })
    }
}

// POST /api/products/[id]/variants - Create a new variant
export async function POST(
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
        const { name, sku, price, costPrice, options } = body

        // Verify product belongs to org
        const product = await prisma.product.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        // Create variant in a transaction
        const variant = await prisma.$transaction(async (tx) => {
            // Check SKU uniqueness WITHIN ORG
            const existingSku = await tx.productVariant.findFirst({
                where: {
                    sku,
                    product: { organizationId: session.user.organizationId }
                },
            })

            if (existingSku) {
                throw new Error('SKU already exists in your organization')
            }

            return await tx.productVariant.create({
                data: {
                    productId: id,
                    name,
                    sku,
                    sellingPrice: price || product.sellingPrice,
                    costPrice: costPrice || product.costPrice,
                    attributes: options || {},
                },
            })
        })

        return NextResponse.json({ success: true, data: variant })
    } catch (error) {
        console.error('Create variant error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create variant' }, { status: 500 })
    }
}
