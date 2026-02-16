
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

        // Verify access to drawer
        const drawer = await prisma.cashDrawer.findFirst({
            where: { id, organizationId: session.user.organizationId }
        })

        if (!drawer) {
            return NextResponse.json({ success: false, error: 'Drawer not found' }, { status: 404 })
        }

        const transactions = await prisma.cashTransaction.findMany({
            where: { drawerId: id },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 for performance
            include: {
                performedBy: { select: { name: true } }
            }
        })

        return NextResponse.json({ success: true, data: transactions })
    } catch (error) {
        console.error('Fetch transactions error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 })
    }
}
