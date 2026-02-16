import prisma from '@/lib/prisma'
import { StockLevel, Location as PrismaLocation, AlertType, AlertStatus } from '@prisma/client'

// Keep track of running scans to prevent slamming the database
const activeScans = new Set<string>()

/**
 * Generates or updates stock alerts for a specific organization.
 * Scans for low stock, out of stock, and expiring items.
 */
export async function generateStockAlerts(organizationId: string) {
    // Basic throttle: Don't run multiple concurrent scans for the same org
    if (activeScans.has(organizationId)) {
        console.log(`Scan already in progress for org ${organizationId}, skipping...`)
        return { created: 0, resolved: 0 }
    }

    activeScans.add(organizationId)
    
    try {
        const now = new Date()
        let createdCount = 0
        let resolvedCount = 0

        // Fetch products and their stock levels
        const products = await prisma.product.findMany({
            where: { organizationId, status: 'ACTIVE' },
            include: {
                stockLevels: {
                    include: { location: true }
                }
            }
        })

        // Define a type for the aggregated stock data per location
        interface LocationStockData {
            quantity: number;
            expiringStock: StockLevel[];
            location: PrismaLocation;
        }

        for (const product of products) {
            // Group stock by location with proper typing
            const stockByLocation = product.stockLevels.reduce((acc: Record<string, LocationStockData>, sl) => {
                const locId = sl.locationId
                if (!acc[locId]) {
                    acc[locId] = {
                        quantity: 0,
                        expiringStock: [] as typeof sl[], // Correctly types expiringStock as an array of StockLevel
                        location: sl.location
                    }
                }
                acc[locId].quantity += Number(sl.quantity)
                if (product.trackExpiration && sl.expirationDate) {
                    const daysToExpiry = Math.ceil((new Date(sl.expirationDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
                    if (daysToExpiry <= product.expiryAlertDays) {
                        acc[locId].expiringStock.push(sl)
                    }
                }
                return acc
            }, {})

            for (const locId in stockByLocation) {
                const locData = stockByLocation[locId]
                const totalQty = locData.quantity
                const threshold = Number(product.reorderPoint)

                // --- Check for LOW_STOCK / OUT_OF_STOCK ---
                if (totalQty <= threshold) {
                    const alertType = totalQty <= 0 ? AlertType.OUT_OF_STOCK : AlertType.LOW_STOCK

                    const existingAlert = await prisma.stockAlert.findFirst({
                        where: {
                            productId: product.id,
                            locationId: locId,
                            alertType: { in: [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK] },
                            status: { in: [AlertStatus.ACTIVE, AlertStatus.SNOOZED] }
                        }
                    })

                    if (!existingAlert) {
                        // Create new alert
                        await prisma.stockAlert.create({
                            data: {
                                productId: product.id,
                                locationId: locId,
                                alertType,
                                currentQuantity: totalQty,
                                thresholdQuantity: threshold,
                                status: AlertStatus.ACTIVE
                            }
                        })
                        createdCount++
                    } else if (existingAlert.alertType !== alertType) {
                        // Upgrade/Downgrade alert (e.g. LOW -> OUT)
                        await prisma.stockAlert.update({
                            where: { id: existingAlert.id },
                            data: {
                                alertType,
                                currentQuantity: totalQty,
                                status: AlertStatus.ACTIVE, // Wake up on severity change
                                snoozedUntil: null
                            }
                        })
                    } else {
                        // Same alert type exists
                        const shouldWakeUp = existingAlert.status === AlertStatus.SNOOZED && existingAlert.snoozedUntil && new Date() > existingAlert.snoozedUntil
                        
                        await prisma.stockAlert.update({
                            where: { id: existingAlert.id },
                            data: { 
                                currentQuantity: totalQty,
                                status: shouldWakeUp ? AlertStatus.ACTIVE : existingAlert.status,
                                snoozedUntil: shouldWakeUp ? null : existingAlert.snoozedUntil
                            }
                        })
                    }
                } else {
                    // Stock is healthy, resolve any existing alerts
                    const result = await prisma.stockAlert.updateMany({
                        where: {
                            productId: product.id,
                            locationId: locId,
                            alertType: { in: [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK] },
                            status: { in: [AlertStatus.ACTIVE, AlertStatus.SNOOZED] }
                        },
                        data: {
                            status: AlertStatus.RESOLVED,
                            resolvedAt: now,
                            currentQuantity: totalQty
                        }
                    })
                    if (result.count > 0) resolvedCount += result.count
                }

                // --- Check for EXPIRING_SOON ---
                if (locData.expiringStock.length > 0) {
                    const earliestExp = new Date(Math.min(...locData.expiringStock.map((s: { expirationDate: Date | null }) => {
                        if (!s.expirationDate) return Infinity
                        return new Date(s.expirationDate).getTime()
                    })))

                    const existingExpAlert = await prisma.stockAlert.findFirst({
                        where: {
                            productId: product.id,
                            locationId: locId,
                            alertType: AlertType.EXPIRING_SOON,
                            status: { in: [AlertStatus.ACTIVE, AlertStatus.SNOOZED] }
                        }
                    })

                    if (!existingExpAlert) {
                        await prisma.stockAlert.create({
                            data: {
                                productId: product.id,
                                locationId: locId,
                                alertType: AlertType.EXPIRING_SOON,
                                currentQuantity: totalQty,
                                thresholdQuantity: 0,
                                expirationDate: earliestExp,
                                status: AlertStatus.ACTIVE
                            }
                        })
                        createdCount++
                    } else {
                         // Check snooze expiry
                         const shouldWakeUp = existingExpAlert.status === AlertStatus.SNOOZED && existingExpAlert.snoozedUntil && new Date() > existingExpAlert.snoozedUntil
                         
                         await prisma.stockAlert.update({
                            where: { id: existingExpAlert.id },
                            data: {
                                currentQuantity: totalQty,
                                expirationDate: earliestExp,
                                status: shouldWakeUp ? AlertStatus.ACTIVE : existingExpAlert.status,
                                snoozedUntil: shouldWakeUp ? null : existingExpAlert.snoozedUntil
                            }
                        })
                    }
                } else {
                    const result = await prisma.stockAlert.updateMany({
                        where: {
                            productId: product.id,
                            locationId: locId,
                            alertType: AlertType.EXPIRING_SOON,
                            status: { in: [AlertStatus.ACTIVE, AlertStatus.SNOOZED] }
                        },
                        data: {
                            status: AlertStatus.RESOLVED,
                            resolvedAt: now
                        }
                    })
                    if (result.count > 0) resolvedCount += result.count
                }
            }
        }

        return { created: createdCount, resolved: resolvedCount }
    } catch (error) {
        console.error(`Error generating alerts for org ${organizationId}:`, error)
        throw error
    } finally {
        activeScans.delete(organizationId)
    }
}
