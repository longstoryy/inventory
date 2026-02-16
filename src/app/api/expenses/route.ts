import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CashDrawerStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/expenses - Get all expenses
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const categoryId = searchParams.get('categoryId')
        const locationId = searchParams.get('locationId')
        const supplierId = searchParams.get('supplierId')

        const where = {
            category: { organizationId: session.user.organizationId },
            ...(categoryId && { categoryId }),
            ...(locationId && { locationId }),
            ...(supplierId && { supplierId }),
        }

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: {
                    category: true,
                    location: { select: { id: true, name: true } },
                    supplier: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                },
                orderBy: { expenseDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.expense.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: expenses,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        })
    } catch (error) {
        console.error('Get expenses error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch expenses' }, { status: 500 })
    }
}

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            categoryId,
            locationId,
            supplierId,
            amount,
            expenseDate,
            paymentMethod,
            paymentStatus,
            description,
            isRecurring,
            recurringFrequency,
        } = body

        if (!categoryId || !amount || !expenseDate) {
            return NextResponse.json({ success: false, error: 'Category, amount, and date are required' }, { status: 400 })
        }

        // Transaction: Verify Ownership + Create Expense + Handle Cash Logic
        const result = await prisma.$transaction(async (tx) => {
            // 1. Ownership Verification
            const category = await tx.expenseCategory.findFirst({
                where: { id: categoryId, organizationId: session.user.organizationId }
            })
            if (!category) throw new Error('Invalid expense category')

            if (locationId) {
                const location = await tx.location.findFirst({
                    where: { id: locationId, organizationId: session.user.organizationId }
                })
                if (!location) throw new Error('Invalid location')
            }

            if (supplierId) {
                const supplier = await tx.supplier.findFirst({
                    where: { id: supplierId, organizationId: session.user.organizationId }
                })
                if (!supplier) throw new Error('Invalid supplier')
            }

            // 2. Generate expense number (Atomic inside transaction)
            const expenseCount = await tx.expense.count({
                where: { category: { organizationId: session.user.organizationId } }
            })
            const orgSlug = session.user.organization.slug.toUpperCase().substring(0, 3)
            const expenseNumber = `EXP-${orgSlug}-${String(expenseCount + 1).padStart(6, '0')}`

            // 3. Create the Expense Record
            const expense = await tx.expense.create({
                data: {
                    expenseNumber,
                    categoryId,
                    locationId,
                    supplierId,
                    amount,
                    expenseDate: new Date(expenseDate),
                    paymentMethod: paymentMethod || 'CASH',
                    paymentStatus: paymentStatus || 'PAID',
                    description,
                    isRecurring: isRecurring || false,
                    recurringFrequency,
                    createdById: session.user.id,
                },
                include: {
                    category: true,
                    location: { select: { id: true, name: true } },
                    supplier: { select: { id: true, name: true } },
                },
            })

            // 4. If 'CASH' and 'PAID', deduct from Active Drawer
            if (paymentMethod === 'CASH' && paymentStatus === 'PAID') {
                const activeDrawer = await tx.cashDrawer.findFirst({
                    where: {
                        OR: [
                            { openedById: session.user.id, status: CashDrawerStatus.OPEN },
                            ...(locationId ? [{ locationId: locationId, status: CashDrawerStatus.OPEN }] : [])
                        ],
                        organizationId: session.user.organizationId // Explicit extra safety
                    },
                    orderBy: { openedAt: 'desc' }
                })

                if (activeDrawer) {
                    await tx.cashDrawer.update({
                        where: { id: activeDrawer.id },
                        data: {
                            currentBalance: { decrement: amount }
                        }
                    })

                    await tx.cashTransaction.create({
                        data: {
                            drawerId: activeDrawer.id,
                            type: 'EXPENSE_CASH_OUT',
                            amount: -Math.abs(Number(amount)),
                            balanceBefore: activeDrawer.currentBalance,
                            balanceAfter: Number(activeDrawer.currentBalance) - Number(amount),
                            referenceId: expense.id,
                            referenceType: 'Expense',
                            description: `Expense: ${expenseNumber} - ${description || 'No desc'}`,
                            performedById: session.user.id
                        }
                    })
                }
            }

            return expense
        }, { timeout: 15000 })

        return NextResponse.json({ success: true, data: result }, { status: 201 })
    } catch (error) {
        console.error('Create expense error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create expense' }, { status: 500 })
    }
}
