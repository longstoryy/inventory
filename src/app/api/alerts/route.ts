import prisma from '@/lib/prisma-optimized';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { type, message, urgent } = await req.json();

        const alert = await prisma.alert.create({
            data: {
                type,
                message,
                urgent: urgent || false,
                read: false,
                createdAt: new Date(),
            }
        });

        return NextResponse.json(alert);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const alerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return NextResponse.json(alerts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}
