import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateStockAlerts } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

// GET /api/transfers - Get all transfers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')

        const [transfers, total] = await Promise.all([
            prisma.stockTransfer.findMany({
                where: {
                    sourceLocation: { organizationId: session.user.organizationId },
                    ...(status && { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED' }),
                },
                include: {
                    sourceLocation: { select: { id: true, name: true, type: true } },
                    destinationLocation: { select: { id: true, name: true, type: true } },
                    requestedBy: { select: { id: true, name: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.stockTransfer.count({
                where: {
                    sourceLocation: { organizationId: session.user.organizationId },
                    ...(status && { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED' }),
                }
            })
        ])

        // Map to frontend expected format
        const mappedTransfers = transfers.map((t) => ({
            id: t.id,
            transferNumber: t.transferNumber,
            status: t.status,
            notes: t.notes,
            createdAt: t.createdAt,
            completedAt: t.receivedAt,
            fromLocation: t.sourceLocation,
            toLocation: t.destinationLocation,
            createdBy: t.requestedBy,
            _count: t._count,
        }))

        return NextResponse.json({
            success: true,
            data: mappedTransfers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Get transfers error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 })
    }
}

// POST /api/transfers - Create transfer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sourceLocationId, destinationLocationId, items, notes } = body

        if (!sourceLocationId || !destinationLocationId || !items || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Source, destination, and items are required' }, { status: 400 })
        }

        if (sourceLocationId === destinationLocationId) {
            return NextResponse.json({ success: false, error: 'Source and destination must be different' }, { status: 400 })
        }

        // Verify locations belong to organization
        const [fromLocation, toLocation] = await Promise.all([
            prisma.location.findFirst({ where: { id: sourceLocationId, organizationId: session.user.organizationId } }),
            prisma.location.findFirst({ where: { id: destinationLocationId, organizationId: session.user.organizationId } }),
        ])

        if (!fromLocation || !toLocation) {
            return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
        }

        // Verify stock availability  
        for (const item of items) {
            const stockLevels = await prisma.stockLevel.findMany({
                where: { productId: item.productId, locationId: sourceLocationId },
            })
            const totalStock = stockLevels.reduce((sum, s) => sum + Number(s.quantity), 0)
            if (totalStock < item.requestedQuantity) {
                const product = await prisma.product.findUnique({ where: { id: item.productId } })
                return NextResponse.json({
                    success: false,
                    error: `Insufficient stock for ${product?.name || item.productId}`,
                }, { status: 400 })
            }
        }

        // Generate transfer number
        // Generate transfer number (Scoped to Org)
        const transferCount = await prisma.stockTransfer.count({
            where: { sourceLocation: { organizationId: session.user.organizationId } }
        })
        const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3)
        const transferNumber = `TRF-${orgSlug}-${String(transferCount + 1).padStart(6, '0')}`

        // Create transfer with proper field names
        const transfer = await prisma.stockTransfer.create({
            data: {
                sourceLocationId,
                destinationLocationId,
                transferNumber,
                status: 'DRAFT',
                notes,
                requestedById: session.user.id,
                items: {
                    create: items.map((item: { productId: string; requestedQuantity: number }) => ({
                        productId: item.productId,
                        requestedQuantity: item.requestedQuantity,
                    })),
                },
            },
            include: {
                sourceLocation: { select: { id: true, name: true } },
                destinationLocation: { select: { id: true, name: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
            },
        })

        return NextResponse.json({ success: true, data: transfer }, { status: 201 })
    } catch (error) {
        console.error('Create transfer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create transfer' }, { status: 500 })
    }
}

// PUT /api/transfers - Update transfer status (complete/cancel)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'ID and status required' }, { status: 400 })
        }

        // Verify transfer belongs to org's locations
        const orgLocations = await prisma.location.findMany({
            where: { organizationId: session.user.organizationId },
            select: { id: true },
        })
        const locationIds = orgLocations.map((l) => l.id)

        const transfer = await prisma.stockTransfer.findFirst({
            where: {
                id,
                sourceLocationId: { in: locationIds },
            },
            include: { items: true },
        })

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 })
        }

        if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'Transfer cannot be modified' }, { status: 400 })
        }

        // Map frontend status names to Prisma enum
        const statusMap: Record<string, 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'> = {
            'PENDING': 'PENDING',
            'IN_TRANSIT': 'IN_TRANSIT',
            'COMPLETED': 'RECEIVED',
            'CANCELLED': 'CANCELLED',
        }
        const mappedStatus = statusMap[status] || (status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED')

        if (mappedStatus === 'RECEIVED') {
            // Execute transfer: deduct from source, add to destination
            await prisma.$transaction(async (tx) => {
                for (const item of transfer.items) {
                    // Find stock at source and deduct
                    const sourceStocks = await tx.stockLevel.findMany({
                        where: { productId: item.productId, locationId: transfer.sourceLocationId },
                        orderBy: { expirationDate: 'asc' }, // FIFO by expiration
                    })

                    let remaining = Number(item.requestedQuantity)
                    for (const stock of sourceStocks) {
                        if (remaining <= 0) break
                        const deduct = Math.min(Number(stock.quantity), remaining)
                        if (deduct > 0) {
                            // 1. Deduct from source
                            await tx.stockLevel.update({
                                where: { id: stock.id },
                                data: { quantity: { decrement: deduct } },
                            })

                            // 2. Add to destination (Preserve Batch/Expiration info)
                            const destStock = await tx.stockLevel.findFirst({
                                where: {
                                    productId: item.productId,
                                    locationId: transfer.destinationLocationId,
                                    expirationDate: stock.expirationDate,
                                },
                            })

                            if (destStock) {
                                await tx.stockLevel.update({
                                    where: { id: destStock.id },
                                    data: { quantity: { increment: deduct } },
                                })
                            } else {
                                await tx.stockLevel.create({
                                    data: {
                                        productId: item.productId,
                                        locationId: transfer.destinationLocationId,
                                        quantity: deduct,
                                        expirationDate: stock.expirationDate,
                                        manufacturingDate: stock.manufacturingDate
                                    },
                                })
                            }

                            remaining -= deduct
                        }
                    }

                    // Update item received quantity
                    await tx.stockTransferItem.update({
                        where: { id: item.id },
                        data: { receivedQuantity: item.requestedQuantity },
                    })
                }

                await tx.stockTransfer.update({
                    where: { id },
                    data: { status: 'RECEIVED', receivedAt: new Date() },
                })
            })

            return NextResponse.json({ success: true, message: 'Transfer completed' })
        }

        // Simple status update
        const updated = await prisma.stockTransfer.update({
            where: { id },
            data: { status: mappedStatus },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update transfer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update transfer' }, { status: 500 })
    }
}
