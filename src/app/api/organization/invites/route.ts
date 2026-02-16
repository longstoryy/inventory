import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// GET /api/organization/invites - List pending invitations
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const invites = await prisma.invitation.findMany({
            where: {
                organizationId: session.user.organizationId,
                status: 'PENDING',
                expiresAt: { gte: new Date() }
            },
            include: {
                role: { select: { name: true } },
                invitedBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: invites })
    } catch (error) {
        console.error('Fetch Invites Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 })
    }
}

// POST /api/organization/invites - Send a new invitation
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId || !session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { email, roleId } = body

        if (!email || !roleId) {
            return NextResponse.json({ success: false, error: 'Email and Role are required' }, { status: 400 })
        }

        // 1. Plan Limit Enforcement
        const org = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            select: { maxUsers: true }
        })

        if (!org) throw new Error('Organization not found')

        const activeUserCount = await prisma.user.count({
            where: { organizationId: session.user.organizationId, isActive: true }
        })

        const pendingInviteCount = await prisma.invitation.count({
            where: {
                organizationId: session.user.organizationId,
                status: 'PENDING',
                expiresAt: { gte: new Date() }
            }
        })

        if ((activeUserCount + pendingInviteCount) >= org.maxUsers) {
            return NextResponse.json({
                success: false,
                error: `User limit reached (${org.maxUsers}). Please upgrade your plan to add more team members.`
            }, { status: 403 })
        }

        // 2. Check for duplicate user/invite
        const existingUser = await prisma.user.findFirst({
            where: { organizationId: session.user.organizationId, email }
        })
        if (existingUser) {
            return NextResponse.json({ success: false, error: 'User is already a member of this organization' }, { status: 400 })
        }

        const existingInvite = await prisma.invitation.findFirst({
            where: {
                organizationId: session.user.organizationId,
                email,
                status: 'PENDING',
                expiresAt: { gte: new Date() }
            }
        })
        if (existingInvite) {
            return NextResponse.json({ success: false, error: 'An invitation is already pending for this email' }, { status: 400 })
        }

        // 3. Create Invitation
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        const invitation = await prisma.invitation.create({
            data: {
                organizationId: session.user.organizationId,
                email,
                roleId,
                invitedById: session.user.id,
                token: uuidv4(),
                expiresAt,
                status: 'PENDING'
            }
        })

        // TODO: In a real app, send actual email here.
        // For this demo/setup, we return the record which includes the token.

        return NextResponse.json({
            success: true,
            message: 'Invitation sent successfully',
            data: invitation
        })

    } catch (error: any) {
        console.error('Invite Creation Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
