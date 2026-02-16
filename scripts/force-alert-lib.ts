
import { PrismaClient } from '@prisma/client'
import { generateStockAlerts } from '../src/lib/alerts'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Running Direct Logic Simulation...')
  
  // 1. Find the product with reorderPoint = 1000
  const product = await prisma.product.findFirst({
    where: { reorderPoint: 1000 },
    include: { stockLevels: true }
  })

  if (!product) {
      console.error('❌ Could not find the test product (Reorder Point 1000). Did previous script fail?')
      return
  }

  console.log(`✅ Targeted Product: ${product.name}, OrgID: ${product.organizationId}`)
  console.log(`   Stock: ${JSON.stringify(product.stockLevels)}`)

  // 2. Run the Alert Generation Logic DIRECTLY
  console.log(`🚀 Executing generateStockAlerts("${product.organizationId}")...`)
  const result = await generateStockAlerts(product.organizationId)
  
  console.log('🏁 Result:', result)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
