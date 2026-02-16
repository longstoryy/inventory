import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { returnSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/returns
 * List all returns for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const returns = await prisma.return.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        sale: {
          select: {
            id: true,
            invoiceNo: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            batch: {
              select: {
                id: true,
                lotNo: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(returns)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/returns
 * Create a new return
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = returnSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    const { items, customerId, saleId, type, reason, notes } = validation.data

    // Calculate total amount
    let totalAmount = 0
    items.forEach((item) => {
      totalAmount += item.price * item.quantity
    })

    // Create return with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate return number
      const returnNo = `RET-${Date.now()}`

      // Create return
      const returnRecord = await tx.return.create({
        data: {
          organizationId: user.organizationId,
          customerId: customerId || null,
          saleId: saleId || null,
          returnNo,
          type: type || 'REFUND',
          status: 'PENDING',
          totalAmount,
          reason,
          notes,
        },
      })

      // Create return items and update stock
      for (const item of items) {
        await tx.returnItem.create({
          data: {
            returnId: returnRecord.id,
            productId: item.productId,
            batchId: item.batchId || null,
            quantity: item.quantity,
            price: item.price,
            amount: item.price * item.quantity,
            reason: item.reason,
          },
        })

        // Update batch quantity (return stock)
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: {
              quantity: {
                increment: item.quantity
              }
            },
          })
        }

        // Create stock ledger entry
        await tx.stockLedger.create({
          data: {
            organizationId: user.organizationId,
            productId: item.productId,
            batchId: item.batchId || null,
            delta: item.quantity, // Positive for returns
            reason: 'RETURN',
            refTable: 'returns',
            refId: returnRecord.id,
          },
        })
      }

      // Update customer credit balance if refund
      if (type === 'REFUND' && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            creditBalance: {
              decrement: totalAmount
            }
          },
        })
      }

      return returnRecord
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
