import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { productSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/products
 * List all products for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
      },
      include: {
        batches: {
          where: {
            quantity: {
              gt: 0
            }
          },
          orderBy: {
            expiryDate: 'asc'
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(products)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = productSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    const product = await prisma.product.create({
      data: {
        ...validation.data,
        organizationId: user.organizationId,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
