require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

async function main() {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : 'undefined')
    
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set in .env')
        return
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    
    console.log('Testing connection...')
    try {
        await prisma.$connect()
        console.log('Connection successful!')
        const result = await prisma.$queryRawUnsafe('SELECT 1 as result')
        console.log('Query successful:', result)
        
        // Let's also check if any tables exist
        const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")
        console.log('Tables in public schema:', tables)
        
    } catch (error) {
        console.error('Connection failed:', error)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

main()
