import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { customerSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/customers
 * List all customers for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(customers)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = customerSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    const customer = await prisma.customer.create({
      data: {
        ...validation.data,
        organizationId: user.organizationId,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
