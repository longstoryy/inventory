import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/expenses/categories - List categories
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const categories = await prisma.expenseCategory.findMany({
            where: { organizationId: session.user.organizationId },
            orderBy: { name: 'asc' },
            include: { _count: { select: { expenses: true } } }
        })

        return NextResponse.json({ success: true, data: categories })
    } catch (error) {
        console.error('Get expense categories error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
    }
}

// POST /api/expenses/categories - Create category
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, budgetAmount, budgetPeriod } = body

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
        }

        const category = await prisma.expenseCategory.create({
            data: {
                organizationId: session.user.organizationId,
                name,
                budgetAmount: budgetAmount ? Number(budgetAmount) : null,
                budgetPeriod,
            }
        })

        return NextResponse.json({ success: true, data: category }, { status: 201 })
    } catch (error) {
        console.error('Create expense category error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
    }
}
