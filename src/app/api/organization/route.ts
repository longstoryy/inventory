import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/organization - Get organization details
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const organization = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: { select: { name: true } },
                        lastLoginAt: true
                    }
                }
            }
        })

        return NextResponse.json({ success: true, data: organization })
    } catch (error) {
        console.error('Get organization error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch organization' }, { status: 500 })
    }
}

// PUT /api/organization - Update organization details
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin/Owner should update settings
        // simplified check: if user has 'admin' role or isOwner
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { role: true }
        })

        if (!user?.isOwner && user?.role.name !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { name, email, phone, address, city, country, currency } = body

        const updatedOrg = await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: {
                name,
                email,
                phone,
                address,
                city,
                country,
                currency
            }
        })

        return NextResponse.json({ success: true, data: updatedOrg })
    } catch (error) {
        console.error('Update organization error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update organization' }, { status: 500 })
    }
}
