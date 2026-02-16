import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { expenseSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/expenses
 * List all expenses for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
      },
      orderBy: { expenseDate: "desc" },
      take: 100,
    })

    return NextResponse.json(expenses)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = expenseSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    const expense = await prisma.expense.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        category: validation.data.category,
        amount: validation.data.amount,
        description: validation.data.description,
        vendor: validation.data.vendor,
        expenseDate: new Date(validation.data.expenseDate),
        notes: validation.data.notes,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
