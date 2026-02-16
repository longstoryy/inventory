import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateStockAlerts } from '@/lib/alerts'
import { SaleStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface SalesQueryWhere {
    location: { organizationId: string }
    locationId?: string
    customerId?: string
    status?: SaleStatus
    createdAt?: {
        gte?: Date
        lte?: Date
    }
    invoiceNumber?: {
        contains: string
        mode: 'insensitive'
    }
    OR?: Array<{
        saleNumber?: { contains: string; mode: 'insensitive' }
        customer?: { name: { contains: string; mode: 'insensitive' } }
    }>
}

// GET /api/sales - Get sales history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (!prisma) {
            console.error('Prisma client not initialized - Check DATABASE_URL')
            return NextResponse.json({ success: false, error: 'Database connection unavailable' }, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        let page = parseInt(searchParams.get('page') || '1')
        if (isNaN(page) || page < 1) page = 1

        let limit = parseInt(searchParams.get('limit') || '20')
        if (isNaN(limit) || limit < 1) limit = 20

        const query = searchParams.get('q') || searchParams.get('invoiceNumber')
        const locationId = searchParams.get('locationId')
        const customerId = searchParams.get('customerId')
        const status = searchParams.get('status')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const where: any = {
            location: { organizationId: session.user.organizationId },
        }

        if (locationId) where.locationId = locationId
        if (customerId) where.customerId = customerId
        if (status) where.status = status

        if (dateFrom && !isNaN(Date.parse(dateFrom))) {
            where.createdAt = { gte: new Date(dateFrom) }
        }
        if (dateTo && !isNaN(Date.parse(dateTo))) {
            where.createdAt = { ...where.createdAt, lte: new Date(dateTo) }
        }

        if (query) {
            where.OR = [
                { saleNumber: { contains: query, mode: 'insensitive' } },
                { customer: { name: { contains: query, mode: 'insensitive' } } }
            ]
        }

        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true } },
                    location: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.sale.count({ where }),
        ])

        const mappedSales = sales.map((s) => ({
            id: s.id,
            invoiceNumber: s.saleNumber,
            total: Number(s.totalAmount),
            paymentMethod: s.paymentMethod,
            status: s.status,
            createdAt: s.createdAt,
            customer: s.customer,
            location: s.location,
            user: s.user,
            _count: s._count,
        }))

        return NextResponse.json({
            success: true,
            data: mappedSales,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error('Get sales error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch sales server-side' }, { status: 500 })
    }
}

// POST /api/sales - Create a new sale (POS transaction)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, customerId, items, paymentMethod, amountPaid, notes, isCredit } = body

        if (!locationId || !items || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Location and items are required' }, { status: 400 })
        }

        // Verify location belongs to org
        const location = await prisma.location.findFirst({
            where: { id: locationId, organizationId: session.user.organizationId, isActive: true },
        })
        if (!location) {
            return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
        }

        // Verify customer credit if credit sale
        let customer = null
        if (customerId) {
            customer = await prisma.customer.findFirst({
                where: { id: customerId, organizationId: session.user.organizationId },
            })
            if (!customer) {
                return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
            }
            if ((isCredit || paymentMethod === 'CREDIT') && (customer.creditStatus === 'BLOCKED' || !customer.isActive)) {
                return NextResponse.json({ success: false, error: 'Customer credit is restricted' }, { status: 400 })
            }
        } else if (isCredit || paymentMethod === 'CREDIT') {
            return NextResponse.json({ success: false, error: 'Customer required for credit sales' }, { status: 400 })
        }

        // Map UI payment methods to Prisma Enums
        const paymentMethodEnumMap: Record<string, 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER'> = {
            'CASH': 'CASH',
            'MOMO': 'MOBILE_MONEY',
            'MOBILE_MONEY': 'MOBILE_MONEY',
            'CARD': 'CARD',
            'BANK': 'BANK_TRANSFER',
            'CREDIT': 'CASH',
        }
        const mappedMethod = paymentMethodEnumMap[paymentMethod] || 'CASH'

        interface ValidatedItem {
            productId: string
            quantity: number
            unitPrice: number
            costPrice: number
            discountAmount: number
            taxAmount: number
            totalAmount: number
        }

        // Execute sale with transaction to ensure atomicity
        const sale = await prisma.$transaction(async (tx) => {
            // 1. Generate sale number (Scoped to Org)
            const saleCount = await tx.sale.count({
                where: { location: { organizationId: session.user.organizationId } }
            })
            const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3) // Use short code
            const saleNumber = `INV-${orgSlug}-${String(saleCount + 1).padStart(6, '0')}`

            // 2. Validate products and calculate totals
            let subtotal = 0
            let totalTax = 0
            const validatedItems: ValidatedItem[] = []

            for (const item of items) {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, organizationId: session.user.organizationId },
                })
                if (!product) throw new Error(`Product ${item.productId} not found`)

                // ATOMIC STOCK VERIFICATION
                const stockLevels = await tx.stockLevel.findMany({
                    where: { productId: item.productId, locationId },
                    orderBy: { expirationDate: 'asc' }
                })
                const totalStock = stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0)
                if (totalStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${totalStock}`)
                }

                const unitPrice = item.unitPrice || Number(product.sellingPrice)
                const discount = item.discount || 0
                const lineTotal = (unitPrice * item.quantity) - discount
                const tax = lineTotal * (Number(product.taxRate) / 100)

                subtotal += lineTotal
                totalTax += tax
                validatedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice,
                    costPrice: Number(product.costPrice),
                    discountAmount: discount,
                    taxAmount: tax,
                    totalAmount: lineTotal + tax,
                })
            }

            const grandTotal = subtotal + totalTax

            // Payment Calculations
            const isActuallyCredit = isCredit || paymentMethod === 'CREDIT'
            const paid = Number(amountPaid) || (isActuallyCredit ? 0 : grandTotal)
            const creditAmount = isActuallyCredit ? Math.max(0, grandTotal - paid) : 0
            const changeGiven = !isActuallyCredit && paid > grandTotal ? paid - grandTotal : 0
            let paymentType: 'CASH' | 'CREDIT' | 'PARTIAL' = 'CASH'
            if (isActuallyCredit) {
                paymentType = paid > 0 ? 'PARTIAL' : 'CREDIT'
            }

            // 3. Create sale record
            const newSale = await tx.sale.create({
                data: {
                    locationId,
                    userId: session.user.id,
                    customerId: customerId || null,
                    saleNumber,
                    subtotal,
                    taxAmount: totalTax,
                    discountAmount: 0,
                    totalAmount: grandTotal,
                    paymentType,
                    paymentMethod: mappedMethod,
                    amountPaid: paid,
                    changeGiven,
                    creditAmount,
                    status: 'COMPLETED',
                    notes,
                    items: {
                        create: validatedItems,
                    },
                },
                include: {
                    items: { include: { product: { select: { name: true, sku: true } } } },
                    customer: { select: { id: true, name: true } },
                },
            })

            // 4. Deduct stock items (FIFO)
            for (const item of validatedItems) {
                const stockLevels = await tx.stockLevel.findMany({
                    where: { productId: item.productId, locationId },
                    orderBy: { expirationDate: 'asc' },
                })

                let remaining = item.quantity
                for (const sl of stockLevels) {
                    if (remaining <= 0) break
                    const deduct = Math.min(Number(sl.quantity), remaining)
                    await tx.stockLevel.update({
                        where: { id: sl.id },
                        data: { quantity: { decrement: deduct } },
                    })
                    remaining -= deduct
                }

                if (remaining > 0) {
                    throw new Error(`Critical: Concurrent stock change detected for ${item.productId}.`)
                }
            }

            // 5. Update customer balance if credit sale
            if (customerId && creditAmount > 0 && customer) {
                const updatedCustomer = await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        currentBalance: { increment: creditAmount },
                        creditStatus: customer.creditStatus === 'BLOCKED' 
                            ? 'BLOCKED'
                            : (Number(customer.currentBalance) + creditAmount) > Number(customer.creditLimit)
                                ? 'WARNING'
                                : 'GOOD',
                    },
                })

                await tx.creditTransaction.create({
                    data: {
                        customerId,
                        saleId: newSale.id,
                        createdById: session.user.id,
                        type: 'CREDIT',
                        amount: creditAmount,
                        balanceAfter: Number(updatedCustomer.currentBalance),
                        notes: `Credit sale: ${saleNumber}`,
                    },
                })
            }

            // 6. Cash Management integration
            const cashReceived = paid - changeGiven
            if (paymentMethod === 'CASH' && cashReceived > 0) {
                const activeDrawer = await tx.cashDrawer.findFirst({
                    where: {
                        OR: [
                            { openedById: session.user.id, status: 'OPEN' },
                            { locationId: locationId, status: 'OPEN' }
                        ]
                    },
                    orderBy: { openedAt: 'desc' }
                })

                if (activeDrawer) {
                    await tx.cashDrawer.update({
                        where: { id: activeDrawer.id },
                        data: { currentBalance: { increment: cashReceived } }
                    })

                    await tx.cashTransaction.create({
                        data: {
                            drawerId: activeDrawer.id,
                            type: 'SALE_CASH_IN',
                            amount: cashReceived,
                            balanceBefore: activeDrawer.currentBalance,
                            balanceAfter: Number(activeDrawer.currentBalance) + cashReceived,
                            referenceId: newSale.id,
                            referenceType: 'Sale',
                            description: `Sale: ${saleNumber}`,
                            performedById: session.user.id
                        }
                    })
                }
            }

            return newSale
        }, { timeout: 20000 })

        // 7. Background Alert Generation (Don't block the response)
        try {
            generateStockAlerts(session.user.organizationId).catch((err: unknown) => {
                console.error('Safe Alert Generation Background Error:', err)
            })
        } catch (e) {
            console.error('Failed to trigger alert generation:', e)
        }

        return NextResponse.json({
            success: true,
            data: {
                ...sale,
                invoiceNumber: sale.saleNumber,
                total: Number(sale.totalAmount),
            },
        }, { status: 201 })
    } catch (error: unknown) {
        console.error('Create sale error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create sale'
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }
}
