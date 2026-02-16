import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''

        const where = {
            organizationId: session.user.organizationId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { code: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                include: {
                    _count: { select: { purchaseOrders: true, products: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.supplier.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: suppliers,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        })
    } catch (error) {
        console.error('Get suppliers error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 })
    }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, code, email, phone, address, city, country, paymentTerms, notes } = body

        if (!name || !code) {
            return NextResponse.json({ success: false, error: 'Name and code are required' }, { status: 400 })
        }

        // Create supplier in a transaction
        const supplier = await prisma.$transaction(async (tx) => {
            // Check unique code WITHIN ORG
            const existing = await tx.supplier.findUnique({
                where: {
                    organizationId_code: { organizationId: session.user.organizationId, code },
                },
            })

            if (existing) {
                throw new Error('Supplier code already exists')
            }

            return await tx.supplier.create({
                data: {
                    organizationId: session.user.organizationId,
                    name,
                    code,
                    email,
                    phone,
                    address,
                    city,
                    country,
                    paymentTerms: paymentTerms || 'Net 30',
                    notes,
                },
            })
        })

        return NextResponse.json({ success: true, data: supplier }, { status: 201 })
    } catch (error) {
        console.error('Create supplier error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create supplier' }, { status: 500 })
    }
}

// PUT /api/suppliers - Update supplier
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, email, phone, address, city, country, paymentTerms, notes, isActive } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Supplier ID required' }, { status: 400 })
        }

        const existing = await prisma.supplier.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: { name, email, phone, address, city, country, paymentTerms, notes, isActive },
        })

        return NextResponse.json({ success: true, data: supplier })
    } catch (error) {
        console.error('Update supplier error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update supplier' }, { status: 500 })
    }
}
