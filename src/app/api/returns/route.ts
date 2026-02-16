import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma, ReturnStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/returns - List returns
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const returns = await prisma.return.findMany({
            where: {
                location: { organizationId: session.user.organizationId },
                ...(status && { status: status as ReturnStatus }),
            },
            include: {
                customer: { select: { name: true } },
                sale: { select: { saleNumber: true } },
                createdBy: { select: { name: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: returns })
    } catch (error) {
        console.error('Get returns error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch returns' }, { status: 500 })
    }
}

// POST /api/returns - Create a return
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { saleId, items, reason, returnType, refundAmount, notes } = body

        if (!saleId || !items || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Sale ID and items are required' }, { status: 400 })
        }

        const sale = await prisma.sale.findFirst({
            where: { id: saleId, location: { organizationId: session.user.organizationId } },
            include: { items: true, customer: true }
        })

        if (!sale) {
            return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 })
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Generate return number (Atomic inside transaction)
            const returnCount = await tx.return.count({ where: { location: { organizationId: session.user.organizationId } } })
            const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3)
            const returnNumber = `RET-${orgSlug}-${String(returnCount + 1).padStart(6, '0')}`

            // 2. Create the Return record
            const newReturn = await tx.return.create({
                data: {
                    returnNumber,
                    saleId,
                    customerId: sale.customerId,
                    locationId: sale.locationId,
                    status: 'PROCESSED',
                    returnType: returnType || 'REFUND',
                    reason: reason || 'OTHER',
                    reasonNotes: notes,
                    refundAmount: new Prisma.Decimal(refundAmount || 0),
                    createdById: session.user.id,
                }
            })

            let totalRefund = 0
            const saleTotalAmount = Number(sale.totalAmount)

            for (const item of items) {
                const saleItem = sale.items.find(si => si.productId === item.productId)
                if (!saleItem) continue

                const quantity = Number(item.quantity)

                // Check if this item was already returned
                const previouslyReturned = await tx.returnItem.aggregate({
                    where: { saleItemId: saleItem.id, return: { status: { not: 'REJECTED' } } },
                    _sum: { quantity: true }
                })

                const alreadyReturnedQty = Number(previouslyReturned._sum.quantity || 0)
                if (alreadyReturnedQty + quantity > Number(saleItem.quantity)) {
                    throw new Error(`Cannot return ${quantity} of ${saleItem.productId}. Already returned ${alreadyReturnedQty} of ${saleItem.quantity}.`)
                }

                const unitPrice = Number(saleItem.unitPrice)
                const lineRefund = quantity * unitPrice
                totalRefund += lineRefund

                // 2. Create ReturnItem
                await tx.returnItem.create({
                    data: {
                        returnId: newReturn.id,
                        saleItemId: saleItem.id,
                        productId: item.productId,
                        quantity: new Prisma.Decimal(quantity),
                        returnedQuantity: new Prisma.Decimal(quantity),
                        condition: item.condition || 'GOOD',
                        disposition: item.disposition || 'RETURN_TO_STOCK',
                        unitRefund: new Prisma.Decimal(unitPrice),
                        totalRefund: new Prisma.Decimal(lineRefund),
                    }
                })

                // 3. Stock Restoration
                if (item.disposition === 'RETURN_TO_STOCK') {
                    // Find first stock level at this location (or create one)
                    const stockLevel = await tx.stockLevel.findFirst({
                        where: { productId: item.productId, locationId: sale.locationId },
                    })

                    if (stockLevel) {
                        await tx.stockLevel.update({
                            where: { id: stockLevel.id },
                            data: { quantity: { increment: quantity } }
                        })
                    } else {
                        await tx.stockLevel.create({
                            data: {
                                productId: item.productId,
                                locationId: sale.locationId,
                                quantity: new Prisma.Decimal(quantity)
                            }
                        })
                    }
                }
            }

            // 4. Financial Adjustment
            if (sale.paymentType === 'CREDIT' || sale.paymentType === 'PARTIAL') {
                // Deduct from customer balance
                if (sale.customerId) {
                    const actualDeduction = Math.min(Number(sale.customer?.currentBalance || 0), totalRefund)
                    if (actualDeduction > 0) {
                        await tx.customer.update({
                            where: { id: sale.customerId },
                            data: { currentBalance: { decrement: actualDeduction } }
                        })

                        await tx.creditTransaction.create({
                            data: {
                                customerId: sale.customerId,
                                createdById: session.user.id,
                                type: 'PAYMENT',
                                amount: actualDeduction,
                                balanceAfter: Number(sale.customer?.currentBalance || 0) - actualDeduction,
                                notes: `Return Credit: ${returnNumber} for Sale ${sale.saleNumber}`
                            }
                        })
                    }
                }
            } else if (totalRefund > 0) {
                // Find Active Drawer (Staff personal OR Location shared)
                const activeDrawer = await tx.cashDrawer.findFirst({
                    where: {
                        OR: [
                            { openedById: session.user.id, status: 'OPEN' },
                            { locationId: sale.locationId, status: 'OPEN' }
                        ]
                    },
                    orderBy: { openedAt: 'desc' }
                })

                if (activeDrawer) {
                    await tx.cashDrawer.update({
                        where: { id: activeDrawer.id },
                        data: { currentBalance: { decrement: totalRefund } }
                    })

                    await tx.cashTransaction.create({
                        data: {
                            drawerId: activeDrawer.id,
                            type: 'RETURN_REFUND',
                            amount: -Math.abs(totalRefund), // Ensure negative for OUT
                            balanceBefore: activeDrawer.currentBalance,
                            balanceAfter: Number(activeDrawer.currentBalance) - totalRefund,
                            referenceId: newReturn.id,
                            referenceType: 'Return',
                            description: `Refund: ${returnNumber} for Sale ${sale.saleNumber}`,
                            performedById: session.user.id
                        }
                    })
                }
            }

            // 5. Audit Logging
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: 'CREATE_RETURN',
                    entityType: 'Return',
                    entityId: newReturn.id,
                    entityName: returnNumber,
                    changes: { items, totalRefund },
                }
            })

            // 6. Update Sale Status if fully refunded
            const allReturnsForSale = await tx.returnItem.aggregate({
                where: { saleItem: { saleId: sale.id }, return: { status: { not: 'REJECTED' } } },
                _sum: { totalRefund: true }
            })
            const currentTotalRefunded = Number(allReturnsForSale._sum.totalRefund || 0)

            if (currentTotalRefunded >= saleTotalAmount) {
                await tx.sale.update({
                    where: { id: sale.id },
                    data: { status: 'REFUNDED' }
                })
            }

            return newReturn
        }, { timeout: 20000 })

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        console.error('Create return error:', error)
        return NextResponse.json({ success: false, error: 'Failed to process return' }, { status: 500 })
    }
}

