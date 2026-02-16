import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { productSchema } from '@/lib/validators'
import { logAudit } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/products - List products with enterprise filtering
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || searchParams.get('search')
        const categoryId = searchParams.get('categoryId')
        const status = searchParams.get('status')

        // Build enterprise-grade search filter
        const where: Prisma.ProductWhereInput = {
            organizationId: session.user.organizationId,
        }

        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
                { barcode: { contains: query, mode: 'insensitive' } },
            ]
        }

        if (categoryId) where.categoryId = categoryId
        if (status) where.status = status as Prisma.EnumProductStatusFilter

        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 20
        const skip = (page - 1) * limit

        const [products, total] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    stockLevels: { select: { quantity: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.product.count({ where })
        ])

        // Computed virtual fields
        const enrichedProducts = products.map(p => ({
            ...p,
            totalStock: p.stockLevels.reduce((acc: number, level: { quantity: Prisma.Decimal }) => acc + Number(level.quantity), 0)
        }))

        return NextResponse.json({
            success: true,
            data: enrichedProducts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Critical: Product fetch failed', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/products - Create new asset with strict validation
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 })
        }

        const body = await req.json()

        // Strict Validation Step
        const validation = productSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation Error',
                details: validation.error.flatten()
            }, { status: 400 })
        }

        const { categoryId, unit, ...rest } = validation.data

        const product = await prisma.$transaction(async (tx) => {
            // 1. Check plan limits (freshest data)
            const organization = await tx.organization.findUnique({
                where: { id: session.user.organizationId },
                select: { maxProducts: true }
            })

            const productCount = await tx.product.count({
                where: { organizationId: session.user.organizationId, status: 'ACTIVE' }
            })

            if (organization && productCount >= organization.maxProducts) {
                throw new Error(`Product limit reached (${organization.maxProducts}). Please upgrade your plan to add more assets.`)
            }

            // 2. Check for SKU uniqueness within org INSIDE transaction
            const existingSku = await tx.product.findFirst({
                where: {
                    organizationId: session.user.organizationId,
                    sku: rest.sku
                }
            })

            if (existingSku) {
                throw new Error('SKU conflict: This SKU is already active.')
            }

            return await tx.product.create({
                data: {
                    ...rest,
                    unitOfMeasure: unit,
                    organizationId: session.user.organizationId,
                    categoryId: categoryId || null,
                },
            })
        })

        // Audit Log
        await logAudit({
            userId: session.user.id,
            organizationId: session.user.organizationId,
            action: 'product.created',
            entityType: 'Product',
            entityId: product.id,
            entityName: product.name,
            changes: { created: rest }
        })

        return NextResponse.json({ success: true, data: product })
    } catch (error: any) {
        console.error('Critical: Product creation failed', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to create asset record',
            message: error.message
        }, { status: 500 })
    }
}
