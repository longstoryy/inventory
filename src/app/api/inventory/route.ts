import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateStockAlerts } from '@/lib/alerts'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/inventory - Get stock levels with filters
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = session.user.organizationId
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const locationId = searchParams.get('locationId')
        const lowStock = searchParams.get('lowStock') === 'true'
        const expiringSoon = searchParams.get('expiringSoon') === 'true'
        const query = searchParams.get('q') || searchParams.get('search')
        const offset = (page - 1) * limit

        // SQL calculation for expiration alert date
        const alertDays = 30 // Could be dynamic per product, but for global view we use a standard
        const alertDate = new Date()
        alertDate.setDate(alertDate.getDate() + alertDays)

        // Optimized Raw Query for Inventory Aggregation
        const inventoryItems: any[] = await prisma.$queryRaw`
            SELECT 
                p.id, 
                p.name, 
                p.sku, 
                p."unitOfMeasure",
                p."reorderPoint",
                p."trackExpiration",
                p."expiryAlertDays",
                c.name as "categoryName",
                SUM(CAST(sl.quantity AS FLOAT)) as "totalStock",
                (SUM(CAST(sl.quantity AS FLOAT)) <= CAST(p."reorderPoint" AS FLOAT)) as "isLowStock",
                COALESCE(SUM(CASE 
                    WHEN p."trackExpiration" = true 
                    AND sl."expirationDate" IS NOT NULL 
                    AND sl."expirationDate" <= ${alertDate} 
                    AND sl.quantity > 0 
                    THEN CAST(sl.quantity AS FLOAT) 
                    ELSE 0 
                END), 0) as "expiringCount"
            FROM "Product" p
            LEFT JOIN "Category" c ON p."categoryId" = c.id
            JOIN "StockLevel" sl ON p.id = sl."productId"
            JOIN "Location" l ON sl."locationId" = l.id
            WHERE p."organizationId" = ${orgId} 
            AND p.status = 'ACTIVE'
            ${locationId ? Prisma.sql`AND sl."locationId" = ${locationId}` : Prisma.empty}
            ${query ? Prisma.sql`AND (p.name ILIKE ${'%' + query + '%'} OR p.sku ILIKE ${'%' + query + '%'})` : Prisma.empty}
            GROUP BY p.id, p.name, p.sku, p."unitOfMeasure", p."reorderPoint", p."trackExpiration", p."expiryAlertDays", c.name
            HAVING 1=1
            ${lowStock ? Prisma.sql`AND SUM(CAST(sl.quantity AS FLOAT)) <= CAST(p."reorderPoint" AS FLOAT)` : Prisma.empty}
            ${expiringSoon ? Prisma.sql`AND COALESCE(SUM(CASE WHEN p."trackExpiration" = true AND sl."expirationDate" <= ${alertDate} AND sl.quantity > 0 THEN CAST(sl.quantity AS FLOAT) ELSE 0 END), 0) > 0` : Prisma.empty}
            ORDER BY p.name ASC
            LIMIT ${limit} OFFSET ${offset}
        `

        const totalCount: any[] = await prisma.$queryRaw`
            SELECT COUNT(*) FROM (
                SELECT p.id
                FROM "Product" p
                JOIN "StockLevel" sl ON p.id = sl."productId"
                WHERE p."organizationId" = ${orgId} 
                AND p.status = 'ACTIVE'
                ${locationId ? Prisma.sql`AND sl."locationId" = ${locationId}` : Prisma.empty}
                ${query ? Prisma.sql`AND (p.name ILIKE ${'%' + query + '%'} OR p.sku ILIKE ${'%' + query + '%'})` : Prisma.empty}
                GROUP BY p.id
                HAVING 1=1
                ${lowStock ? Prisma.sql`AND SUM(CAST(sl.quantity AS FLOAT)) <= CAST(p."reorderPoint" AS FLOAT)` : Prisma.empty}
                ${expiringSoon ? Prisma.sql`AND COALESCE(SUM(CASE WHEN p."trackExpiration" = true AND sl."expirationDate" <= ${alertDate} AND sl.quantity > 0 THEN CAST(sl.quantity AS FLOAT) ELSE 0 END), 0) > 0` : Prisma.empty}
            ) as sub
        `
        const total = Number(totalCount[0].count)

        // Format BigInt/Decimal types for JSON
        const formattedData = inventoryItems.map(item => ({
            ...item,
            totalStock: Number(item.totalStock || 0),
            expiringCount: Number(item.expiringCount || 0),
            reorderPoint: Number(item.reorderPoint || 0)
        }))

        return NextResponse.json({
            success: true,
            data: formattedData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Get inventory error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 })
    }
}


// POST /api/inventory - Adjust stock
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { productId, locationId, quantity, type, reason, expirationDate } = body

        if (!productId || !locationId || quantity === undefined || !type) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        // Verify product and location belong to org
        const [product, location] = await Promise.all([
            prisma.product.findFirst({ where: { id: productId, organizationId: session.user.organizationId } }),
            prisma.location.findFirst({ where: { id: locationId, organizationId: session.user.organizationId } }),
        ])

        if (!product || !location) {
            return NextResponse.json({ success: false, error: 'Product or location not found' }, { status: 404 })
        }

        // Execute adjustment in a transaction to prevent race conditions
        const stockLevel = await prisma.$transaction(async (tx) => {
            const expDate = expirationDate ? new Date(expirationDate) : null

            // 1. Fetch current stock level INSIDE transaction
            let currentSL = await tx.stockLevel.findFirst({
                where: { productId, locationId, expirationDate: expDate },
            })

            const previousQty = currentSL?.quantity || 0
            let newQty: number

            // 2. Calculate new quantity
            if (type === 'SET') {
                newQty = quantity
            } else if (type === 'ADD') {
                newQty = Number(previousQty) + quantity
            } else if (type === 'REMOVE') {
                newQty = Number(previousQty) - quantity
                if (newQty < 0) throw new Error('Insufficient stock for this batch')
            } else {
                throw new Error('Invalid adjustment type')
            }

            // 3. Update or Create
            let updatedSL
            if (currentSL) {
                updatedSL = await tx.stockLevel.update({
                    where: { id: currentSL.id },
                    data: { quantity: newQty },
                })
            } else {
                updatedSL = await tx.stockLevel.create({
                    data: { productId, locationId, quantity: newQty, expirationDate: expDate },
                })
            }

            // 4. Update product expiration tracking if needed
            if (expDate && !product.trackExpiration) {
                await tx.product.update({
                    where: { id: productId },
                    data: { trackExpiration: true }
                })
            }

            // 5. Create audit log INSIDE transaction
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: 'STOCK_ADJUSTMENT',
                    entityType: 'StockLevel',
                    entityId: updatedSL.id,
                    entityName: `${product.name} @ ${location.name}`,
                    changes: {
                        type,
                        productId,
                        locationId,
                        previousQuantity: Number(previousQty),
                        newQuantity: newQty,
                        reason,
                    },
                },
            })

            return updatedSL
        }, { timeout: 10000 })

        // 6. Background Alert Generation
        try {
            generateStockAlerts(session.user.organizationId).catch((err: any) => {
                console.error('Safe Alert Generation Background Error:', err)
            })
        } catch (e) {
            console.error('Failed to trigger alert generation:', e)
        }

        return NextResponse.json({ success: true, data: stockLevel })
    } catch (error: any) {
        console.error('Adjust stock error:', error)
        return NextResponse.json({ success: false, error: error.message || 'Failed to adjust stock' }, { status: 500 })
    }
}
