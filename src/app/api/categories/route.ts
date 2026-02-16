import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/categories - Get all categories for the organization
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const categories = await prisma.category.findMany({
            where: {
                organizationId: session.user.organizationId,
                isActive: true,
            },
            include: {
                _count: { select: { products: true } },
                parent: { select: { id: true, name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })

        return NextResponse.json({ success: true, data: categories })
    } catch (error) {
        console.error('Get categories error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, parentId } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Category name is required' },
                { status: 400 }
            )
        }

        // Create category in a transaction to ensure atomic slug generation
        const category = await prisma.$transaction(async (tx) => {
            // Generate slug from name
            const baseSlug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')

            // Check if slug exists and make unique WITHIN ORG
            let slug = baseSlug
            let counter = 1
            while (
                await tx.category.findUnique({
                    where: {
                        organizationId_slug: {
                            organizationId: session.user.organizationId,
                            slug,
                        },
                    },
                })
            ) {
                slug = `${baseSlug}-${counter}`
                counter++
            }

            return await tx.category.create({
                data: {
                    organizationId: session.user.organizationId,
                    name,
                    slug,
                    description,
                    parentId: parentId || null,
                },
            })
        })

        return NextResponse.json({ success: true, data: category }, { status: 201 })
    } catch (error) {
        console.error('Create category error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create category' },
            { status: 500 }
        )
    }
}

// PUT /api/categories - Update a category
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, description, parentId, isActive } = body

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Category ID is required' },
                { status: 400 }
            )
        }

        // Verify category belongs to organization
        const existingCategory = await prisma.category.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        })

        if (!existingCategory) {
            return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                name,
                description,
                parentId,
                isActive,
            },
        })

        return NextResponse.json({ success: true, data: category })
    } catch (error) {
        console.error('Update category error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update category' },
            { status: 500 }
        )
    }
}
