import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT /api/alerts/[id] - Update alert (snooze or resolve)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { action } = body // 'snooze' or 'resolve'

        const alert = await prisma.stockAlert.findUnique({ where: { id } })
        if (!alert) {
            return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 })
        }

        let updateData: Record<string, unknown> = {}

        if (action === 'snooze') {
            const snoozedUntil = new Date()
            snoozedUntil.setHours(snoozedUntil.getHours() + 24)
            updateData = { status: 'SNOOZED', snoozedUntil }
        } else if (action === 'resolve') {
            updateData = { status: 'RESOLVED', resolvedAt: new Date() }
        }

        const updated = await prisma.stockAlert.update({
            where: { id },
            data: updateData,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                location: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update alert error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update alert' }, { status: 500 })
    }
}
