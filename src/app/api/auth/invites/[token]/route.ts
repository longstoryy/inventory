import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params

        const invitation = await prisma.invitation.findUnique({
            where: { token },
            select: {
                id: true,
                email: true,
                status: true,
                expiresAt: true,
                organization: {
                    select: {
                        name: true
                    }
                },
                role: {
                    select: {
                        name: true
                    }
                }
            }
        })

        if (!invitation) {
            return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 })
        }

        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: 'Invitation already used or revoked' }, { status: 400 })
        }

        if (new Date() > invitation.expiresAt) {
            return NextResponse.json({ success: false, error: 'Invitation has expired' }, { status: 400 })
        }

        return NextResponse.json({ success: true, data: invitation })
    } catch (error) {
        console.error('Fetch Invitation Error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
