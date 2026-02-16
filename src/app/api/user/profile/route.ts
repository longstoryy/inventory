import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email || !session?.user?.organizationId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({
            where: {
                organizationId_email: {
                    organizationId: session.user.organizationId,
                    email: session.user.email
                }
            },
            select: { id: true, name: true, email: true, role: { select: { name: true } } }
        })

        return NextResponse.json({ success: true, data: user })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email || !session?.user?.organizationId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { name, currentPassword, newPassword } = body

        const user = await prisma.user.findUnique({
            where: {
                organizationId_email: {
                    organizationId: session.user.organizationId,
                    email: session.user.email
                }
            }
        })
        if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

        const updateData: { name: string; passwordHash?: string } = { name }

        if (newPassword) {
            if (!currentPassword) return NextResponse.json({ success: false, error: 'Current password required to set new password' }, { status: 400 })
            const valid = await compare(currentPassword, user.passwordHash)
            if (!valid) return NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 400 })
            updateData.passwordHash = await hash(newPassword, 12)
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: { id: true, name: true, email: true }
        })

        return NextResponse.json({ success: true, data: updatedUser })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
    }
}
