
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/customers/[id]/prices
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const prices = await prisma.customerPrice.findMany({
            where: { customerId: id },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        sellingPrice: true,
                        imageUrl: true
                    }
                }
            },
            orderBy: { product: { name: 'asc' } }
        })

        return NextResponse.json({ success: true, data: prices })
    } catch (error) {
        console.error('Error fetching customer prices:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch prices' }, { status: 500 })
    }
}

// POST /api/customers/[id]/prices
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { productId, price } = body

        if (!productId || price === undefined) {
            return NextResponse.json({ error: 'Product and Price are required' }, { status: 400 })
        }

        const specialPrice = await prisma.customerPrice.upsert({
            where: {
                customerId_productId: {
                    customerId: id,
                    productId
                }
            },
            update: {
                price: Number(price)
            },
            create: {
                customerId: id,
                productId,
                price: Number(price)
            }
        })

        return NextResponse.json({ success: true, data: specialPrice })
    } catch (error) {
        console.error('Error saving customer price:', error)
        return NextResponse.json({ success: false, error: 'Failed to save price' }, { status: 500 })
    }
}

// DELETE /api/customers/[id]/prices?productId=...
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        await prisma.customerPrice.delete({
            where: {
                customerId_productId: {
                    customerId: id,
                    productId
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting customer price:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete price' }, { status: 500 })
    }
}
