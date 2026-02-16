import prisma from '@/lib/prisma-optimized';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // Logic to generate system alerts based on inventory levels
    try {
        const lowStockItems = await prisma.product.findMany({
            where: {
                quantity: {
                    lt: 10 // Threshold
                }
            }
        });

        const alerts = await Promise.all(lowStockItems.map((item: any) =>
            prisma.alert.create({
                data: {
                    type: 'LOW_STOCK',
                    message: `Item ${item.name} is running low (${item.quantity} remaining).`,
                    urgent: true,
                    read: false
                }
            })
        ));

        return NextResponse.json({ generated: alerts.length });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate alerts' }, { status: 500 });
    }
}
