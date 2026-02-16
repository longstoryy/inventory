
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        console.log('Fetching Receipt ID:', id)
        console.log('Session Org:', session.user.organizationId)

        const sale = await prisma.sale.findFirst({
            where: {
                id,
                location: {
                    organizationId: session.user.organizationId
                }
            },
            include: {
                items: { include: { product: true } },
                user: { select: { name: true } },
                customer: { select: { name: true } }
            }
        })

        if (!sale) {
            console.log('Receipt not found in DB')
            return NextResponse.json({ success: false, error: 'Sale not found in DB' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: sale })
    } catch (error: any) {
        console.error('Fetch sale error:', error)
        return NextResponse.json({ success: false, error: `Failed: ${error.message}` }, { status: 500 })
    }
}
