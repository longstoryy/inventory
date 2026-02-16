
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- DIAGNOSTIC CHECK ---')
  
  // 1. Check Products with high reorder points
  const anomalousProducts = await prisma.product.findMany({
    where: { reorderPoint: { gte: 500 } },
    select: { id: true, name: true, organizationId: true, reorderPoint: true,stockLevels: true }
  })
  
  console.log(`\n1. Products with Reorder Point >= 500: Found ${anomalousProducts.length}`)
  anomalousProducts.forEach(p => {
    console.log(`   - Product: ${p.name} (Org: ${p.organizationId})`)
    console.log(`     ReorderPoint: ${p.reorderPoint}`)
    console.log(`     StockLevels: ${JSON.stringify(p.stockLevels)}`)
  })

  // 2. Check ANY Stock Alerts
  const allAlerts = await prisma.stockAlert.findMany({
      include: { product: true }
  })
  console.log(`\n2. Total Stock Alerts in DB: ${allAlerts.length}`)
  allAlerts.forEach(a => {
      console.log(`   - Alert: ${a.alertType} for ${a.product.name} (Status: ${a.status})`)
      console.log(`     Org: ${a.product.organizationId}`)
  })

  // 3. User Session context (We can't check session easily from script, but we can verify if Org IDs line up)
  // We'll just list distinct Organization IDs to see if we have multi-tenancy confusion
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } })
  console.log(`\n3. Organizations:`)
  orgs.forEach(o => console.log(`   - ${o.name} (${o.id})`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
