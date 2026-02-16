
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/finance/drawers - List all drawers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const drawers = await prisma.cashDrawer.findMany({
            where: {
                organizationId: session.user.organizationId,
            },
            include: {
                location: { select: { name: true } },
                openedBy: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json({ success: true, data: drawers })
    } catch (error) {
        console.error('Fetch drawers error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch drawers' }, { status: 500 })
    }
}

// POST /api/finance/drawers - Create a new drawer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, locationId } = body

        if (!name || !locationId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const drawer = await prisma.cashDrawer.create({
            data: {
                organizationId: session.user.organizationId,
                name,
                locationId,
                status: 'CLOSED', // Default status
                currentBalance: 0
            }
        })

        return NextResponse.json({ success: true, data: drawer })
    } catch (error) {
        console.error('Create drawer error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create drawer' }, { status: 500 })
    }
}
