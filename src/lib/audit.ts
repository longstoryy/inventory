import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

interface AuditParams {
    userId: string
    organizationId: string // Ensure we can filter by org (Note: Schema might need orgId?)
    action: string
    entityType: string
    entityId: string
    entityName?: string
    changes?: Record<string, unknown> | null
}

export async function logAudit(params: AuditParams) {
    try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        // Note: The current AuditLog model in schema doesn't have organizationId explicitly, 
        // but it links to User which has organizationId. 
        // For performance in queries, we might want to add orgId to AuditLog in the future.
        // For now, we rely on the User relation.

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                entityName: params.entityName,
                changes: params.changes ? JSON.stringify(params.changes) : undefined,
                ipAddress: ip,
                userAgent: userAgent,
            }
        })
    } catch (error) {
        console.error('Failed to write audit log:', error)
        // We do not throw here to prevent non-critical logging failure from blocking business logic
    }
}
