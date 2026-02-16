import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

// GET /api/locations - Get all locations for the organization
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = session.user.organizationId

        // Check cache
        const cached = cache.get(orgId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ success: true, data: cached.data })
        }

        const locations = await prisma.location.findMany({
            where: {
                organizationId: orgId,
                isActive: true,
            },
            include: {
                _count: { select: { stockLevels: true } },
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        })

        // Cache result
        cache.set(orgId, { data: locations, timestamp: Date.now() })

        return NextResponse.json({ success: true, data: locations })
    } catch (error) {
        console.error('Get locations error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch locations' },
            { status: 500 }
        )
    }
}

// POST /api/locations - Create a new location
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, type, address, city, country, phone, email } = body

        if (!name || !type) {
            return NextResponse.json(
                { success: false, error: 'Name and type are required' },
                { status: 400 }
            )
        }

        // Check organization location limit from database (freshest data)
        const organization = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            select: { maxLocations: true }
        })

        if (!organization) {
            return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
        }

        const locationCount = await prisma.location.count({
            where: { organizationId: session.user.organizationId, isActive: true },
        })

        if (locationCount >= organization.maxLocations) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Location limit reached (${organization.maxLocations}). Please upgrade your plan.`,
                },
                { status: 403 }
            )
        }

        const location = await prisma.location.create({
            data: {
                organizationId: session.user.organizationId,
                name,
                type,
                address,
                city,
                country,
                phone,
                email,
            },
        })

        return NextResponse.json({ success: true, data: location }, { status: 201 })
    } catch (error) {
        console.error('Create location error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create location' },
            { status: 500 }
        )
    }
}

// PUT /api/locations - Update a location
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.organizationId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, type, address, city, country, phone, email, isActive } = body

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Location ID is required' },
                { status: 400 }
            )
        }

        // Verify location belongs to organization
        const existingLocation = await prisma.location.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        })

        if (!existingLocation) {
            return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
        }

        const location = await prisma.location.update({
            where: { id },
            data: {
                name,
                type,
                address,
                city,
                country,
                phone,
                email,
                isActive,
            },
        })

        return NextResponse.json({ success: true, data: location })
    } catch (error) {
        console.error('Update location error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update location' },
            { status: 500 }
        )
    }
}
