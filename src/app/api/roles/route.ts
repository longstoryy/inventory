import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/roles - List available roles for the organization
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const roles = await prisma.role.findMany({
            where: {
                OR: [
                    { organizationId: session.user.organizationId },
                    { isSystem: true, organizationId: null } // System-wide roles if any
                ]
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ success: true, data: roles })
    } catch (error) {
        console.error('Fetch Roles Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 })
    }
}
