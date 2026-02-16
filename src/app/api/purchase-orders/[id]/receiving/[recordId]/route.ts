import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string; recordId: string }>
}

// DELETE /api/purchase-orders/[id]/receiving/[recordId] - Void a receiving record
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id: poId, recordId } = await params

        const record = await prisma.receivingRecord.findFirst({
            where: {
                id: recordId,
                purchaseOrderId: poId,
                purchaseOrder: {
                    location: { organizationId: session.user.organizationId }
                }
            },
            include: {
                purchaseOrder: {
                    include: { items: true }
                }
            }
        })

        if (!record) {
            return NextResponse.json({ success: false, error: 'Receiving record not found' }, { status: 404 })
        }

        const items = record.items as any[]

        await prisma.$transaction(async (tx) => {
            for (const recordItem of items) {
                const expDate = recordItem.expirationDate ? new Date(recordItem.expirationDate) : null

                // 1. Decrement PO item received quantity
                const poItem = record.purchaseOrder.items.find(i => i.productId === recordItem.productId)
                if (poItem) {
                    await tx.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: {
                            receivedQuantity: { decrement: recordItem.quantity }
                        }
                    })
                }

                // 2. Decrement stock level
                const stockLevel = await tx.stockLevel.findFirst({
                    where: {
                        productId: recordItem.productId,
                        locationId: record.purchaseOrder.locationId,
                        expirationDate: expDate
                    }
                })

                if (stockLevel) {
                    const newQty = Number(stockLevel.quantity) - Number(recordItem.quantity)
                    if (newQty <= 0) {
                        await tx.stockLevel.delete({ where: { id: stockLevel.id } })
                    } else {
                        await tx.stockLevel.update({
                            where: { id: stockLevel.id },
                            data: { quantity: newQty }
                        })
                    }
                }
            }

            // 3. Delete the record
            await tx.receivingRecord.delete({ where: { id: recordId } })

            // 4. Re-calculate PO status
            const updatedItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: poId }
            })

            const totalReceived = updatedItems.reduce((sum, i) => sum + Number(i.receivedQuantity), 0)
            const allReceived = updatedItems.every(i => Number(i.receivedQuantity) >= Number(i.orderedQuantity))

            let finalStatus = 'SENT'
            if (totalReceived > 0) {
                finalStatus = allReceived ? 'RECEIVED' : 'PARTIAL'
            }

            await tx.purchaseOrder.update({
                where: { id: poId },
                data: { status: finalStatus as any }
            })
        })

        return NextResponse.json({ success: true, message: 'Receiving record voided and inventory adjusted' })
    } catch (error) {
        console.error('Void receiving record error:', error)
        return NextResponse.json({ success: false, error: 'Failed to void record' }, { status: 500 })
    }
}
