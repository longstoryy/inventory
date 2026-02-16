require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        console.log('Checking Organization count...')
        const orgCount = await prisma.organization.count()
        console.log('Organizations:', orgCount)

        console.log('Checking User count...')
        const userCount = await prisma.user.count()
        console.log('Users:', userCount)
        
        if (orgCount > 0) {
            const orgs = await prisma.organization.findMany({ take: 1 })
            console.log('Sample Org ID:', orgs[0].id)
        }
        
    } catch (error) {
        console.error('Check failed:', error)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

main()
