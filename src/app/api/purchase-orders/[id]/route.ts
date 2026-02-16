import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/purchase-orders/[id] - Get single PO
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const order = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                location: { organizationId: session.user.organizationId }
            },
            include: {
                supplier: true,
                location: true,
                createdBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
                    },
                },
                receivingRecords: {
                    include: {
                        receivedBy: { select: { name: true } }
                    },
                    orderBy: { receivedAt: 'desc' }
                }
            },
        })

        if (!order) {
            return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: order })
    } catch (error) {
        console.error('Get PO error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch purchase order' }, { status: 500 })
    }
}

// PUT /api/purchase-orders/[id] - Update PO status or receive goods
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { status, receivedItems, notes } = body

        const order = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                location: { organizationId: session.user.organizationId }
            },
            include: { items: true },
        })

        if (!order) {
            return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 })
        }

        // Handle receiving goods
        if (status === 'RECEIVED' && receivedItems) {
            await prisma.$transaction(async (tx) => {
                const receivingItems = []

                for (const received of receivedItems) {
                    const item = order.items.find((i) => i.id === received.itemId)
                    if (!item) continue

                    const expDate = received.expirationDate ? new Date(received.expirationDate) : null

                    // Update PO item received quantity
                    await tx.purchaseOrderItem.update({
                        where: { id: received.itemId },
                        data: {
                            receivedQuantity: { increment: received.quantity },
                            expirationDate: expDate
                        },
                    })

                    // Add to stock Level (considering expiration date as part of the unique key)
                    const stockLevel = await tx.stockLevel.findFirst({
                        where: {
                            productId: item.productId,
                            locationId: order.locationId,
                            expirationDate: expDate
                        },
                    })

                    if (stockLevel) {
                        await tx.stockLevel.update({
                            where: { id: stockLevel.id },
                            data: {
                                quantity: { increment: received.quantity },
                            },
                        })
                    } else {
                        await tx.stockLevel.create({
                            data: {
                                productId: item.productId,
                                locationId: order.locationId,
                                quantity: received.quantity,
                                expirationDate: expDate,
                            },
                        })
                    }

                    receivingItems.push({
                        productId: item.productId,
                        quantity: received.quantity,
                        expirationDate: received.expirationDate,
                        notes: received.notes
                    })
                }

                // Create receiving record
                await tx.receivingRecord.create({
                    data: {
                        purchaseOrderId: id,
                        receivedById: session.user.id,
                        receivedAt: new Date(),
                        items: receivingItems,
                        notes,
                    }
                })

                // Determine final PO status
                const updatedItems = await tx.purchaseOrderItem.findMany({
                    where: { purchaseOrderId: id }
                })

                const allReceived = updatedItems.every(i => Number(i.receivedQuantity) >= Number(i.orderedQuantity))
                const finalStatus = allReceived ? 'RECEIVED' : 'PARTIAL'

                await tx.purchaseOrder.update({
                    where: { id },
                    data: {
                        status: finalStatus,
                        receivedDate: new Date()
                    },
                })
            })

            return NextResponse.json({ success: true, message: 'Goods received successfully' })
        }

        // Simple status update
        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update PO error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update purchase order' }, { status: 500 })
    }
}
