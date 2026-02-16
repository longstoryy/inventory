import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')?.trim()

        if (!q || q.length < 2) {
            return NextResponse.json({ success: true, data: { products: [], customers: [], sales: [], orders: [] } })
        }

        const orgId = session.user.organizationId

        const [products, customers, sales, orders] = await Promise.all([
            prisma.product.findMany({
                where: {
                    organizationId: orgId,
                    status: 'ACTIVE',
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    sellingPrice: true,
                    category: { select: { name: true } }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.customer.findMany({
                where: {
                    organizationId: orgId,
                    isActive: true,
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } },
                        { phone: { contains: q, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    currentBalance: true
                },
                orderBy: { name: 'asc' }
            }),
            prisma.sale.findMany({
                where: {
                    location: { organizationId: orgId },
                    saleNumber: { contains: q, mode: 'insensitive' }
                },
                take: 5,
                select: {
                    id: true,
                    saleNumber: true,
                    totalAmount: true,
                    status: true,
                    createdAt: true,
                    customer: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.purchaseOrder.findMany({
                where: {
                    location: { organizationId: orgId },
                    poNumber: { contains: q, mode: 'insensitive' }
                },
                take: 5,
                select: {
                    id: true,
                    poNumber: true,
                    status: true,
                    totalAmount: true,
                    supplier: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ])

        return NextResponse.json({
            success: true,
            data: {
                products: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    price: Number(p.sellingPrice),
                    category: p.category?.name || 'Uncategorized',
                    type: 'product'
                })),
                customers: customers.map(c => ({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    balance: Number(c.currentBalance),
                    type: 'customer'
                })),
                sales: sales.map(s => ({
                    id: s.id,
                    number: s.saleNumber,
                    amount: Number(s.totalAmount),
                    status: s.status,
                    customer: s.customer?.name || 'Walk-in',
                    date: s.createdAt,
                    type: 'sale'
                })),
                orders: orders.map(o => ({
                    id: o.id,
                    number: o.poNumber,
                    amount: Number(o.totalAmount),
                    status: o.status,
                    supplier: o.supplier.name,
                    type: 'order'
                }))
            }
        })
    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
    }
}
