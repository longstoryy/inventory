import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { saleSchema } from "@/lib/validation"
import { formatErrorResponse, AuthenticationError, ValidationError } from "@/lib/errors"

/**
 * GET /api/sales
 * List all sales for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const sales = await prisma.sale.findMany({
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
        user: {
          select: {
            id: true,
            name: true,
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
      take: 100, // Limit for performance
    })

    return NextResponse.json(sales)
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * POST /api/sales
 * Create a new sale
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request.headers)
    if (!user) {
      throw new AuthenticationError()
    }

    const body = await request.json()
    const validation = saleSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.flatten().fieldErrors)
    }

    const { items, customerId, type, invoiceNo, discount, taxAmount, notes } = validation.data

    // Calculate totals
    let subtotal = 0
    items.forEach((item) => {
      const itemSubtotal = (item.price * item.quantity) - (item.discount || 0) + (item.tax || 0)
      subtotal += itemSubtotal
    })

    const total = subtotal - discount + taxAmount

    // Create sale with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate invoice number if not provided
      const finalInvoiceNo = invoiceNo || `INV-${Date.now()}`

      // Create sale
      const sale = await tx.sale.create({
        data: {
          organizationId: user.organizationId,
          userId: user.userId,
          customerId: customerId || null,
          invoiceNo: finalInvoiceNo,
          type: type || 'CASH',
          status: type === 'CASH' ? 'PAID' : 'OPEN',
          subtotal,
          taxAmount: taxAmount || 0,
          discount: discount || 0,
          total,
          paid: type === 'CASH' ? total : 0,
          notes,
        },
      })

      // Create sale items and update stock
      for (const item of items) {
        const itemSubtotal = (item.price * item.quantity) - (item.discount || 0) + (item.tax || 0)

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            batchId: item.batchId || null,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            tax: item.tax || 0,
            subtotal: itemSubtotal,
          },
        })

        // Update batch quantity if batchId is provided
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: {
              quantity: {
                decrement: item.quantity
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
            delta: -item.quantity,
            reason: 'SALE',
            refTable: 'sales',
            refId: sale.id,
          },
        })
      }

      // Update customer credit balance if credit sale
      if (type === 'CREDIT' && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            creditBalance: {
              increment: total
            }
          },
        })
      }

      return sale
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}
