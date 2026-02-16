import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/transfers/[id]
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

        const transfer = await prisma.stockTransfer.findFirst({
            where: {
                id,
                OR: [
                    { sourceLocation: { organizationId: session.user.organizationId } },
                    { destinationLocation: { organizationId: session.user.organizationId } }
                ]
            },
            include: {
                sourceLocation: { select: { id: true, name: true, type: true } },
                destinationLocation: { select: { id: true, name: true, type: true } },
                requestedBy: { select: { name: true } },
                approvedBy: { select: { name: true } },
                items: {
                    include: { product: { select: { name: true, sku: true } } },
                },
            },
        })

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: transfer })
    } catch (error) {
        console.error('Get transfer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch transfer' }, { status: 500 })
    }
}

// PUT /api/transfers/[id] - Update status
export async function PUT(
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
        const { status } = body

        const transfer = await prisma.stockTransfer.findFirst({
            where: {
                id,
                OR: [
                    { sourceLocation: { organizationId: session.user.organizationId } },
                    { destinationLocation: { organizationId: session.user.organizationId } }
                ]
            },
            include: { items: true },
        })

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 })
        }

        // Handle status transitions
        const updateData: Record<string, unknown> = { status }

        if (status === 'APPROVED') {
            updateData.approvedById = session.user.id
        } else if (status === 'IN_TRANSIT') {
            updateData.shippedAt = new Date()
            // Update shipped quantities and deduct from source
            await prisma.$transaction(async (tx) => {
                for (const item of transfer.items) {
                    await tx.stockTransferItem.update({
                        where: { id: item.id },
                        data: { shippedQuantity: item.requestedQuantity },
                    })
                    // Deduct from source location
                    await tx.stockLevel.updateMany({
                        where: { productId: item.productId, locationId: transfer.sourceLocationId },
                        data: { quantity: { decrement: Number(item.requestedQuantity) } },
                    })
                }
            })
        } else if (status === 'RECEIVED') {
            updateData.receivedAt = new Date()
            // Update received quantities and add to destination
            await prisma.$transaction(async (tx) => {
                for (const item of transfer.items) {
                    await tx.stockTransferItem.update({
                        where: { id: item.id },
                        data: { receivedQuantity: item.requestedQuantity },
                    })
                    // Add to destination location
                    const existingStock = await tx.stockLevel.findFirst({
                        where: { productId: item.productId, locationId: transfer.destinationLocationId },
                    })
                    if (existingStock) {
                        await tx.stockLevel.update({
                            where: { id: existingStock.id },
                            data: { quantity: { increment: Number(item.requestedQuantity) } },
                        })
                    } else {
                        await tx.stockLevel.create({
                            data: {
                                productId: item.productId,
                                locationId: transfer.destinationLocationId,
                                quantity: Number(item.requestedQuantity),
                            },
                        })
                    }
                }
            })
        }

        const updated = await prisma.stockTransfer.update({
            where: { id },
            data: updateData,
            include: {
                sourceLocation: { select: { id: true, name: true, type: true } },
                destinationLocation: { select: { id: true, name: true, type: true } },
                requestedBy: { select: { name: true } },
                approvedBy: { select: { name: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
            },
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: `TRANSFER_${status}`,
                entityType: 'StockTransfer',
                entityId: id,
                entityName: transfer.transferNumber,
                changes: { previousStatus: transfer.status, newStatus: status },
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update transfer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update transfer' }, { status: 500 })
    }
}
