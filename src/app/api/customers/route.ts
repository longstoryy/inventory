import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/customers - Get all customers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const creditStatus = searchParams.get('creditStatus')

        const where = {
            organizationId: session.user.organizationId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(creditStatus && { creditStatus: creditStatus as 'GOOD' | 'WARNING' | 'BLOCKED' }),
        }

        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 20
        const skip = (page - 1) * limit

        const [customers, total] = await prisma.$transaction([
            prisma.customer.findMany({
                where,
                orderBy: { name: 'asc' },
                include: {
                    _count: { select: { sales: true, creditTransactions: true } },
                },
                skip,
                take: limit,
            }),
            prisma.customer.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: customers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Get customers error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 })
    }
}

// POST /api/customers - Create customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, email, phone, address, creditLimit } = body

        if (!name) {
            return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 })
        }

        // Generate customer code
        const customerCount = await prisma.customer.count({
            where: { organizationId: session.user.organizationId },
        })
        const code = `CUST-${String(customerCount + 1).padStart(4, '0')}`

        const customer = await prisma.customer.create({
            data: {
                organizationId: session.user.organizationId,
                code,
                name,
                email,
                phone,
                address,
                creditLimit: creditLimit || 0,
            },
        })

        return NextResponse.json({ success: true, data: customer }, { status: 201 })
    } catch (error) {
        console.error('Create customer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create customer' }, { status: 500 })
    }
}

// PUT /api/customers - Update customer
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, email, phone, address, creditLimit, creditStatus, isActive } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Customer ID required' }, { status: 400 })
        }

        const existing = await prisma.customer.findFirst({
            where: { id, organizationId: session.user.organizationId },
        })

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                creditLimit,
                creditStatus: creditStatus as 'GOOD' | 'WARNING' | 'BLOCKED' | undefined,
                isActive,
            },
        })

        return NextResponse.json({ success: true, data: customer })
    } catch (error) {
        console.error('Update customer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update customer' }, { status: 500 })
    }
}
