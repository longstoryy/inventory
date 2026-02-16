
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding a product to simulate Low Stock...')
  
  // 1. Find the first active product
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
    include: { stockLevels: true }
  })

  if (!product) {
    console.error('❌ No active products found! systematic failure.')
    return
  }

  console.log(`✅ Found Product: ${product.name} (ID: ${product.id})`)
  
  // 2. Set Reorder Point to 1000 (Force immediate "Low Stock" status)
  await prisma.product.update({
    where: { id: product.id },
    data: { reorderPoint: 1000 }
  })
  console.log(`📉 Set Reorder Point to 1000 (Current Stock is significantly lower)`)

  console.log('🚀 Triggering Alert Generation via API...')
  try {
      // We can't easily fetch localhost from here without a fetch polyfill or similar in this env, 
      // but we can call the logic directly if we import it, OR just let the user know to refresh if we rely on the background job.
      // However, to be certain, let's just use the library function directly if possible, or use fetch if available (Node 18+ has fetch).
      
      const response = await fetch('http://localhost:3000/api/alerts/generate', {
          method: 'POST'
      })
      const result = await response.json()
      console.log('✅ Generation Result:', result)
  } catch (e) {
      console.log('⚠️ Could not hit API (server might be busy), but DB is updated. Visiting the alerts page usually triggers a check or you can wait for the cron.')
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
