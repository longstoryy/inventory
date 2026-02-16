import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined | null
}

function createPrismaClient(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.warn('DATABASE_URL not set, skipping Prisma client initialization')
    return null
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const prismaBase = globalForPrisma.prisma ?? createPrismaClient()
const prisma = prismaBase as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaBase
}

export { prisma }
export default prisma
