import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { token, name, password, phone } = body

        if (!token || !name || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Verify token
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: { organization: true }
        })

        if (!invitation) {
            return NextResponse.json({ success: false, error: 'Invalid invitation token' }, { status: 400 })
        }

        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: 'Invitation has already been used or revoked' }, { status: 400 })
        }

        if (new Date() > invitation.expiresAt) {
            return NextResponse.json({ success: false, error: 'Invitation has expired' }, { status: 400 })
        }

        // 2. Hash password
        const passwordHash = await hash(password, 12)

        // 3. Create User and Update Invitation in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if user already exists (might have signed up independently meanwhile)
            const existingUser = await tx.user.findFirst({
                where: { email: invitation.email.toLowerCase() }
            })

            if (existingUser) {
                throw new Error('An account with this email already exists')
            }

            const user = await tx.user.create({
                data: {
                    organizationId: invitation.organizationId,
                    email: invitation.email.toLowerCase(),
                    passwordHash,
                    name,
                    phone: phone || null,
                    roleId: invitation.roleId,
                    isOwner: false,
                    isActive: true
                }
            })

            await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' }
            })

            return user
        })

        return NextResponse.json({
            success: true,
            message: 'Successfully joined the organization',
            data: {
                userId: result.id,
                organizationName: invitation.organization.name
            }
        })

    } catch (error: any) {
        console.error('Join Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
