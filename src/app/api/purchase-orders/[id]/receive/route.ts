import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateStockAlerts } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

// POST /api/purchase-orders/[id]/receive - Receive items from PO
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId || !session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { items } = body // [{ productId, quantity, expirationDate? }]

        if (!items?.length) {
            return NextResponse.json({ success: false, error: 'No items to receive' }, { status: 400 })
        }

        // Get PO with items
        const po = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                location: { organizationId: session.user.organizationId }
            },
            include: {
                items: true,
                location: true,
                supplier: true,
            },
        })

        if (!po) {
            return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 })
        }

        if (!['SENT', 'PARTIAL'].includes(po.status)) {
            return NextResponse.json({ success: false, error: 'Cannot receive items for this PO status' }, { status: 400 })
        }

        // Process receiving in a transaction
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const poItem = po.items.find(i => i.productId === item.productId)
                if (!poItem) continue

                const remaining = Number(poItem.orderedQuantity) - Number(poItem.receivedQuantity)
                const receiveQty = Math.min(item.quantity, remaining)
                if (receiveQty <= 0) continue

                // Update PO item received quantity
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQuantity: { increment: receiveQty } },
                })

                // Update or create stock level
                const existingStock = await tx.stockLevel.findFirst({
                    where: {
                        productId: item.productId,
                        locationId: po.locationId,
                        expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                    },
                })

                if (existingStock) {
                    await tx.stockLevel.update({
                        where: { id: existingStock.id },
                        data: { quantity: { increment: receiveQty } },
                    })
                } else {
                    await tx.stockLevel.create({
                        data: {
                            productId: item.productId,
                            locationId: po.locationId,
                            quantity: receiveQty,
                            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                        },
                    })
                }
            }

            // Create receiving record
            await tx.receivingRecord.create({
                data: {
                    purchaseOrderId: po.id,
                    receivedById: session.user.id,
                    items: items,
                },
            })

            // Check if all items are fully received
            const updatedItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: po.id },
            })

            const allReceived = updatedItems.every(i => Number(i.receivedQuantity) >= Number(i.orderedQuantity))
            const someReceived = updatedItems.some(i => Number(i.receivedQuantity) > 0)

            let newStatus = po.status
            if (allReceived) {
                newStatus = 'RECEIVED'
            } else if (someReceived) {
                newStatus = 'PARTIAL'
            }

            if (newStatus !== po.status) {
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: {
                        status: newStatus,
                        receivedDate: allReceived ? new Date() : undefined,
                    },
                })
            }

            // 5. Audit log
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: 'RECEIVE_PO',
                    entityType: 'PurchaseOrder',
                    entityId: po.id,
                    entityName: po.poNumber,
                    changes: { items, newStatus },
                },
            })

            // 6. Automated Expense Creation
            let totalReceivedCost = 0
            for (const item of items) {
                const poItem = po.items.find(i => i.productId === item.productId)
                if (poItem) {
                    const remaining = Number(poItem.orderedQuantity) - Number(poItem.receivedQuantity)
                    const receiveQty = Math.min(item.quantity, remaining)
                    if (receiveQty > 0) {
                        totalReceivedCost += (receiveQty * Number(poItem.unitCost))
                    }
                }
            }

            if (totalReceivedCost > 0) {
                // Find 'Supplies' or 'Other' category
                let category = await tx.expenseCategory.findFirst({
                    where: {
                        organizationId: session.user.organizationId,
                        name: { in: ['Supplies', 'Inventory', 'Other'] }
                    }
                })

                if (category) {
                    const expenseCount = await tx.expense.count({
                        where: { category: { organizationId: session.user.organizationId } }
                    })
                    const expenseNumber = `EXP-PO-${String(expenseCount + 1).padStart(5, '0')}`

                    await tx.expense.create({
                        data: {
                            expenseNumber,
                            categoryId: category.id,
                            locationId: po.locationId,
                            supplierId: po.supplierId,
                            amount: totalReceivedCost,
                            expenseDate: new Date(),
                            paymentMethod: 'CASH', // Default to cash for now
                            paymentStatus: 'PAID',
                            description: `PO Received: ${po.poNumber} - ${items.length} items`,
                            createdById: session.user.id,
                        }
                    })
                }
            }
        })

        // 7. Background Alert Generation
        try {
            generateStockAlerts(session.user.organizationId).catch((err: any) => {
                console.error('Safe Alert Generation Background Error:', err)
            })
        } catch (e) {
            console.error('Failed to trigger alert generation:', e)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Receive PO error:', error)
        return NextResponse.json({ success: false, error: 'Failed to receive items' }, { status: 500 })
    }
}
