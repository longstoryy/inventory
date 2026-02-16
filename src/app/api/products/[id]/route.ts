import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { productSchema } from '@/lib/validators'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Helper to validate ownership
async function validateOwnership(id: string, organizationId: string) {
    const product = await prisma.product.findUnique({
        where: { id },
    })

    if (!product || product.organizationId !== organizationId) return null
    return product
}

// GET /api/products/[id] - Get single dossier
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { id } = await params

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: { select: { id: true, name: true } },
                stockLevels: {
                    include: {
                        location: { select: { id: true, name: true, type: true } },
                    },
                },
                supplierProducts: {
                    include: {
                        supplier: { select: { id: true, name: true, code: true } },
                    },
                },
            },
        })

        if (!product || product.organizationId !== session.user.organizationId) {
            return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
        }

        const totalStock = product.stockLevels.reduce((acc, level) => acc + Number(level.quantity), 0)

        return NextResponse.json({ success: true, data: { ...product, totalStock } })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 })
    }
}

// PUT /api/products/[id] - Update asset
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const body = await req.json()

        const validation = productSchema.partial().safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: validation.error.flatten() }, { status: 400 })
        }

        const existing = await validateOwnership(id, session.user.organizationId)
        if (!existing) return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 404 })

        const { categoryId, unit, ...rest } = validation.data

        const updateData: any = {
            ...rest,
            categoryId: categoryId === "" ? null : categoryId // Handle empty string from UI
        }

        if (unit) {
            updateData.unitOfMeasure = unit
        }

        const updated = await prisma.product.update({
            where: { id },
            data: updateData
        })

        // Capture changes
        await logAudit({
            userId: session.user.id,
            organizationId: session.user.organizationId,
            action: 'product.updated',
            entityType: 'Product',
            entityId: id,
            entityName: updated.name,
            changes: {
                from: { name: existing.name, price: existing.sellingPrice, sku: existing.sku },
                to: { name: updated.name, price: updated.sellingPrice, sku: updated.sku }
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update failed:', error)
        return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 })
    }
}

// DELETE /api/products/[id] - Archive asset
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const existing = await validateOwnership(id, session.user.organizationId)
        if (!existing) return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 404 })

        // Check for dependencies
        const hasTransactions = await prisma.saleItem.findFirst({ where: { productId: id } }) ||
            await prisma.purchaseOrderItem.findFirst({ where: { productId: id } }) ||
            await prisma.stockLevel.findFirst({ where: { productId: id, quantity: { gt: 0 } } })

        if (hasTransactions) {
            await prisma.product.update({
                where: { id },
                data: { status: 'DISCONTINUED' }
            })

            await logAudit({
                userId: session.user.id,
                organizationId: session.user.organizationId,
                action: 'product.discontinued',
                entityType: 'Product',
                entityId: id,
                entityName: existing.name,
            })

            return NextResponse.json({ success: true, message: 'Asset discontinued due to existing history.' })
        }

        await prisma.product.delete({ where: { id } })

        await logAudit({
            userId: session.user.id,
            organizationId: session.user.organizationId,
            action: 'product.deleted',
            entityType: 'Product',
            entityId: id,
            entityName: existing.name,
        })

        return NextResponse.json({ success: true, message: 'Asset record expunged.' })

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
    }
}
