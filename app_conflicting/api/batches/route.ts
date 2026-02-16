import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { batchSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/batches
 * List all batches for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const batches = await prisma.batch.findMany({
      where: {
        product: {
          organizationId: user.organizationId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(batches)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/batches
 * Create a new batch
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = batchSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    // Verify product belongs to user's organization
    const product = await prisma.product.findFirst({
      where: {
        id: validation.data.productId,
        organizationId: user.organizationId,
      },
    })

    if (!product) {
      throw new ValidationError('Product not found or access denied')
    }

    // Create batch in a transaction with stock ledger entry
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          ...validation.data,
          expiryDate: validation.data.expiryDate ? new Date(validation.data.expiryDate) : null,
        },
      })

      // Create stock ledger entry for receiving inventory
      await tx.stockLedger.create({
        data: {
          organizationId: user.organizationId,
          productId: validation.data.productId,
          batchId: batch.id,
          delta: validation.data.quantity,
          reason: 'PURCHASE',
          notes: 'Initial batch receipt',
        },
      })

      return batch
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
