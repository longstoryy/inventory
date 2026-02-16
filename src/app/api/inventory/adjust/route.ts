import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { productId, locationId, quantity, type, reason, notes } = body

        if (!productId || !locationId || !quantity || !type) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { stockLevels: { where: { locationId } } }
        })

        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
        }

        const currentStock = product.stockLevels[0]
        const currentQty = currentStock ? Number(currentStock.quantity) : 0
        const adjustmentQty = Number(quantity)

        // Calculate new quantity
        let newQty = currentQty
        if (type === 'ADD') {
            newQty += adjustmentQty
        } else if (type === 'REMOVE') {
            newQty -= adjustmentQty
        } else if (type === 'SET') {
            newQty = adjustmentQty
        }

        if (newQty < 0) {
            return NextResponse.json({ success: false, error: 'Resulting stock cannot be negative' }, { status: 400 })
        }

        // Update or create stock level
        await prisma.stockLevel.upsert({
            where: {
                productId_locationId_expirationDate: {
                    productId,
                    locationId,
                    expirationDate: null // Assumes non-expiring for simple adjustment for now
                }
            },
            update: {
                quantity: newQty,
                updatedAt: new Date()
            },
            create: {
                productId,
                locationId,
                quantity: newQty,
                reservedQuantity: 0
            }
        })

        // TODO: In a future update, add an InventoryTransaction log here

        return NextResponse.json({ success: true, data: { newQty } })

    } catch (error) {
        console.error('Inventory adjustment error:', error)
        return NextResponse.json({ success: false, error: 'Failed to adjust inventory' }, { status: 500 })
    }
}
