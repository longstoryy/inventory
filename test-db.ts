
import { PrismaClient } from '@prisma/client'

async function main() {
    const prisma = new PrismaClient()
    console.log('Testing connection...')
    try {
        await prisma.$connect()
        console.log('Connection successful!')
        const result = await prisma.$queryRaw`SELECT 1 as result`
        console.log('Query successful:', result)
    } catch (error) {
        console.error('Connection failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
