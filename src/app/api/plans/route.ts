import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/plans - Get all available plans
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        })

        return NextResponse.json({ success: true, data: plans })
    } catch (error) {
        console.error('Get plans error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch plans' }, { status: 500 })
    }
}
