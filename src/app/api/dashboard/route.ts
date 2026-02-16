import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RevenueTrendRow {
    day: Date
    total: number
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 120 * 1000 // 2 minutes

// GET /api/dashboard - Get dashboard stats
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = session.user.organizationId

        // Check cache
        const cached = cache.get(orgId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ success: true, data: cached.data })
        }

        const today = new Date()
        const startOfDay = new Date()
        startOfDay.setUTCHours(0, 0, 0, 0)

        const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
        const startOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
        const endOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0, 23, 59, 59, 999))

        // Optimized Data Fetching: Multi-query Raw SQL execution
        const [coreMetrics, operationalData] = await Promise.all([
            // 1. Core aggregates (Counts + Financials)
            prisma.$queryRaw<any[]>`
                WITH org_locs AS (SELECT id FROM "Location" WHERE "organizationId" = ${orgId}),
                today_sales AS (
                    SELECT "totalAmount", "amountPaid", "creditAmount", id
                    FROM "Sale" 
                    WHERE "locationId" IN (SELECT id FROM org_locs) 
                    AND "status" = 'COMPLETED' 
                    AND "createdAt" >= ${startOfDay}
                ),
                month_sales AS (
                    SELECT "totalAmount", "createdAt" 
                    FROM "Sale" 
                    WHERE "locationId" IN (SELECT id FROM org_locs) 
                    AND "status" = 'COMPLETED' 
                    AND "createdAt" >= ${startOfLastMonth}
                )
                SELECT 
                    (SELECT COUNT(*)::int FROM "Product" WHERE "organizationId" = ${orgId} AND "status" = 'ACTIVE') as "countProducts",
                    (SELECT COUNT(*)::int FROM "Customer" WHERE "organizationId" = ${orgId} AND "isActive" = true) as "countCustomers",
                    (SELECT COUNT(*)::int FROM "Supplier" WHERE "organizationId" = ${orgId} AND "isActive" = true) as "countSuppliers",
                    (SELECT COUNT(*)::int FROM "PurchaseOrder" po JOIN "Location" l ON po."locationId" = l.id WHERE l."organizationId" = ${orgId} AND po."status" IN ('DRAFT', 'SENT', 'PARTIAL')) as "countPendingPOs",
                    (SELECT COUNT(*)::int FROM "StockTransfer" st JOIN "Location" l ON st."sourceLocationId" = l.id WHERE l."organizationId" = ${orgId} AND st."status" IN ('PENDING', 'IN_TRANSIT')) as "countPendingTransfers",
                    (SELECT COUNT(*)::int FROM "StockLevel" sl JOIN "Product" p ON sl."productId" = p.id WHERE p."organizationId" = ${orgId} AND p."trackExpiration" = true AND sl."expirationDate" <= ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} AND sl."expirationDate" >= ${new Date()}) as "countExpiring",
                    (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM today_sales) as "todayRevenue",
                    (SELECT COUNT(*)::int FROM today_sales) as "todayCount",
                    (SELECT COALESCE(SUM("amountPaid"), 0)::float FROM today_sales) as "todayPaid",
                    (SELECT COALESCE(SUM("creditAmount"), 0)::float FROM today_sales) as "todayCredit",
                    (SELECT COALESCE(SUM(si.quantity * si."costPrice"), 0)::float FROM "SaleItem" si WHERE si."saleId" IN (SELECT id FROM today_sales)) as "todayCogs",
                    (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM month_sales WHERE "createdAt" >= ${startOfMonth}) as "monthRevenue",
                    (SELECT COUNT(*)::int FROM month_sales WHERE "createdAt" >= ${startOfMonth}) as "monthCount",
                    (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM month_sales WHERE "createdAt" < ${startOfMonth} AND "createdAt" <= ${endOfLastMonth}) as "lastMonthRevenue",
                    (SELECT COALESCE(SUM("refundAmount"), 0)::float FROM "Return" WHERE "locationId" IN (SELECT id FROM org_locs) AND "status" = 'PROCESSED' AND "requestedAt" >= ${startOfDay}) as "todayRefunds",
                    (SELECT COALESCE(SUM("amount"), 0)::float FROM "CreditTransaction" ct JOIN "Customer" c ON ct."customerId" = c.id WHERE c."organizationId" = ${orgId} AND ct."type" = 'PAYMENT' AND ct."createdAt" >= ${startOfDay}) as "todayCreditPayments",
                    (SELECT COALESCE(SUM("amount"), 0)::float FROM "Expense" e JOIN "ExpenseCategory" ec ON e."categoryId" = ec.id WHERE ec."organizationId" = ${orgId} AND e."expenseDate" >= ${startOfDay} AND e."paymentStatus" = 'PAID') as "todayExpenses"
            `,
            // 2. Lists (Recent Sales, Top Products, Low Stock, Trends)
            Promise.all([
                prisma.sale.findMany({
                    where: { location: { organizationId: orgId } },
                    include: { customer: { select: { name: true } }, location: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                }),
                prisma.$queryRaw<any[]>`
                    SELECT si."productId", p.name, p.sku, SUM(si.quantity)::float as qty, SUM(si."totalAmount")::float as total
                    FROM "SaleItem" si
                    JOIN "Sale" s ON si."saleId" = s.id
                    JOIN "Product" p ON si."productId" = p.id
                    WHERE s."locationId" IN (SELECT id FROM "Location" WHERE "organizationId" = ${orgId})
                    AND s."createdAt" >= ${startOfMonth} AND s."status" = 'COMPLETED'
                    GROUP BY si."productId", p.name, p.sku
                    ORDER BY total DESC LIMIT 5
                `,
                prisma.$queryRaw<any[]>`
                    SELECT p.id as "productId", p.name, p.sku, l.id as "locationId", l.name as "locationName", SUM(sl.quantity)::float as qty, p."reorderPoint"::float
                    FROM "StockLevel" sl
                    JOIN "Product" p ON sl."productId" = p.id
                    JOIN "Location" l ON sl."locationId" = l.id
                    WHERE p."organizationId" = ${orgId} AND p.status = 'ACTIVE'
                    GROUP BY p.id, p.name, p.sku, l.id, l.name, p."reorderPoint"
                    HAVING SUM(sl.quantity) <= p."reorderPoint"
                    ORDER BY qty ASC LIMIT 10
                `,
                prisma.$queryRaw<any[]>`
                    SELECT DATE_TRUNC('day', "createdAt") as day, SUM("totalAmount")::float as total
                    FROM "Sale"
                    WHERE "locationId" IN (SELECT id FROM "Location" WHERE "organizationId" = ${orgId})
                    AND "status" = 'COMPLETED' AND "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
                    GROUP BY day ORDER BY day ASC
                `
            ])
        ])
        const m = coreMetrics[0] || {}
        const [recentSales, topProductsRaw, lowStockItemsRaw, revenueTrendRaw] = operationalData

        // Calculations
        const adjTodayRevenue = Number(m.todayRevenue || 0) - Number(m.todayRefunds || 0)
        const totalCollections = Number(m.todayCreditPayments || 0) + Number(m.todayPaid || 0) - Number(m.todayRefunds || 0)
        const grossProfit = adjTodayRevenue - Number(m.todayCogs || 0)
        const totalExpenses = Number(m.todayExpenses || 0)
        const netProfit = grossProfit - totalExpenses

        // Growth
        const lastMonthTotal = Number(m.lastMonthRevenue || 0)
        const thisMonthTotal = Number(m.monthRevenue || 0)
        const growth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

        const resultData = {
            overview: {
                totalProducts: m.countProducts,
                totalCustomers: m.countCustomers,
                totalSuppliers: m.countSuppliers,
                lowStockCount: lowStockItemsRaw.length,
                expiringProducts: m.countExpiring,
            },
            sales: {
                today: {
                    total: adjTodayRevenue,
                    count: m.todayCount,
                    collections: totalCollections,
                    credit: m.todayCredit,
                    grossProfit,
                    netProfit,
                    totalExpenses
                },
                thisMonth: { total: thisMonthTotal, count: m.monthCount, growth: growth.toFixed(1) },
            },
            pending: { purchaseOrders: m.countPendingPOs, transfers: m.countPendingTransfers },
            recentSales: recentSales.map(s => ({
                id: s.id,
                invoiceNumber: s.saleNumber,
                total: Number(s.totalAmount),
                createdAt: s.createdAt,
                customer: s.customer,
                location: s.location,
            })),
            topProducts: topProductsRaw.map(tp => ({
                productId: tp.productId,
                name: tp.name,
                sku: tp.sku,
                quantity: tp.qty,
                total: tp.total
            })),
            revenueTrend: revenueTrendRaw.map(s => ({
                date: s.day ? s.day.toISOString().split('T')[0] : '',
                revenue: Number(s.total || 0)
            })),
            lowStockItems: lowStockItemsRaw.map(item => ({
                id: `${item.productId}-${item.locationId}`,
                product: { id: item.productId, name: item.name, sku: item.sku },
                quantity: item.qty,
                location: { id: item.locationId, name: item.locationName }
            }))
        }

        // Cache result
        cache.set(orgId, { data: resultData, timestamp: Date.now() })

        return NextResponse.json({ success: true, data: resultData })
    } catch (error) {
        console.error('Dashboard error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
