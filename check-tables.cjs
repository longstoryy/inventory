
const { PrismaClient } = require('@prisma/client')

async function main() {
    const prisma = new PrismaClient()
    try {
        const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
        console.log('Tables found:', tables.map(t => t.table_name))
    } catch (error) {
        console.error('Failed to list tables:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
