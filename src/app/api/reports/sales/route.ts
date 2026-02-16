import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface DailySalesRow {
    day: Date
    total: number
}

// GET /api/reports/sales - Sales report with grouping
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateFrom = searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const dateTo = searchParams.get('dateTo') || new Date().toISOString()
        const locationId = searchParams.get('locationId')

        // Get locations for this organization
        const orgLocations = await prisma.location.findMany({
            where: { organizationId: session.user.organizationId },
            select: { id: true, name: true },
        })
        const locationIds = orgLocations.map((l) => l.id)

        const where = {
            locationId: { in: locationId ? [locationId] : locationIds },
            status: 'COMPLETED' as const,
            createdAt: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
            },
        }

        // Calculate previous period for comparison
        const diff = new Date(dateTo).getTime() - new Date(dateFrom).getTime()
        const prevDateFrom = new Date(new Date(dateFrom).getTime() - diff).toISOString()
        const prevDateTo = dateFrom

        const prevWhere = {
            locationId: { in: locationId ? [locationId] : locationIds },
            status: 'COMPLETED' as const,
            createdAt: {
                gte: new Date(prevDateFrom),
                lte: new Date(prevDateTo),
            },
        }

        const [summary, prevSummary, salesByPayment, salesByLocation] = await Promise.all([
            prisma.sale.aggregate({
                where,
                _sum: { totalAmount: true, taxAmount: true, discountAmount: true },
                _count: true,
                _avg: { totalAmount: true },
            }),
            prisma.sale.aggregate({
                where: prevWhere,
                _sum: { totalAmount: true },
                _count: true,
            }),
            prisma.sale.groupBy({
                by: ['paymentMethod'],
                where,
                _sum: { totalAmount: true },
                _count: true,
            }),
            prisma.sale.groupBy({
                by: ['locationId'],
                where,
                _sum: { totalAmount: true },
                _count: true,
            }),
        ])

        const salesByLocationWithNames = salesByLocation.map((s) => ({
            locationId: s.locationId,
            locationName: orgLocations.find((l) => l.id === s.locationId)?.name || 'Unknown',
            _sum: { total: Number(s._sum.totalAmount || 0) },
            _count: s._count,
        }))

        // Top selling products
        const topProducts = await prisma.saleItem.groupBy({
            by: ['productId'],
            where: {
                sale: where,
            },
            _sum: { quantity: true, totalAmount: true },
            orderBy: { _sum: { totalAmount: 'desc' } },
            take: 10,
        })

        const productIds = topProducts.map((p) => p.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, category: { select: { name: true } } },
        })

        const topProductsWithDetails = topProducts.map((tp) => {
            const product = products.find((p) => p.id === tp.productId)
            return {
                productId: tp.productId,
                name: product?.name || 'Unknown',
                sku: product?.sku || '',
                category: product?.category?.name || 'Uncategorized',
                quantitySold: Number(tp._sum.quantity || 0),
                revenue: Number(tp._sum.totalAmount || 0),
            }
        })

        // Top customers
        const topCustomers = await prisma.sale.groupBy({
            by: ['customerId'],
            where: { ...where, customerId: { not: null } },
            _sum: { totalAmount: true },
            _count: true,
            orderBy: { _sum: { totalAmount: 'desc' } },
            take: 10,
        })

        const customerIds = topCustomers.map((c) => c.customerId).filter(Boolean) as string[]
        const customers = await prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
        })

        const topCustomersWithNames = topCustomers.map((tc) => ({
            customerId: tc.customerId,
            name: customers.find((c) => c.id === tc.customerId)?.name || 'Walk-in Customer',
            totalSpent: Number(tc._sum.totalAmount || 0),
            orderCount: tc._count,
        }))

        // Daily revenue trend (last 30 days or period)
        const salesByDay = locationIds.length > 0 ? await prisma.$queryRaw`
            SELECT 
                DATE_TRUNC('day', "createdAt") as day,
                SUM("totalAmount") as total
            FROM "Sale"
            WHERE 
                "locationId" = ANY(${locationIds}::text[])
                AND "status" = 'COMPLETED'
                AND "createdAt" >= ${new Date(dateFrom)}::timestamp
                AND "createdAt" <= ${new Date(dateTo)}::timestamp
            GROUP BY day
            ORDER BY day ASC
        ` : []

        // Calculate profit (Revenue - Cost of Goods Sold) using HISTORICAL costs
        const profitSummary = await prisma.saleItem.findMany({
            where: { sale: where },
            select: { quantity: true, totalAmount: true, costPrice: true }
        }).then((items) => {
            return items.reduce((acc, item) => {
                const revenue = Number(item.totalAmount || 0)
                const cost = Number(item.quantity || 0) * Number(item.costPrice || 0)
                return {
                    revenue: acc.revenue + revenue,
                    cogs: acc.cogs + cost,
                    profit: acc.profit + (revenue - cost)
                }
            }, { revenue: 0, cogs: 0, profit: 0 })
        })

        const revenueGrowth = prevSummary._sum.totalAmount 
            ? ((Number(summary._sum.totalAmount || 0) - Number(prevSummary._sum.totalAmount)) / Number(prevSummary._sum.totalAmount)) * 100 
            : 0

        return NextResponse.json({
            success: true,
            data: {
                period: { from: dateFrom, to: dateTo },
                summary: {
                    totalRevenue: Number(summary._sum.totalAmount || 0),
                    totalTax: Number(summary._sum.taxAmount || 0),
                    totalDiscount: Number(summary._sum.discountAmount || 0),
                    transactionCount: summary._count,
                    averageOrderValue: Number(summary._avg.totalAmount || 0),
                    revenueGrowth: revenueGrowth,
                },
                profitability: profitSummary,
                byPaymentMethod: salesByPayment.map((p) => ({
                    paymentMethod: p.paymentMethod,
                    _sum: { total: Number(p._sum.totalAmount || 0) },
                    _count: p._count,
                })),
                timeSeries: Array.isArray(salesByDay) ? (salesByDay as DailySalesRow[]).map(s => ({
                    date: s.day ? new Date(s.day).toISOString().split('T')[0] : '',
                    revenue: Number(s.total || 0)
                })) : [],
                byLocation: salesByLocationWithNames,
                topProducts: topProductsWithDetails,
                topCustomers: topCustomersWithNames,
            },
        })
    } catch (error) {
        console.error('Sales report error:', error)
        return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
    }
}
