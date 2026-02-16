import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Calculate trial end date (14 days)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // Create demo organization
    const organization = await prisma.organization.upsert({
        where: { slug: 'demo-company' },
        update: {},
        create: {
            name: 'Demo Company',
            slug: 'demo-company',
            email: 'admin@demo.com',
            currency: 'GHS',
            timezone: 'Africa/Accra',
            planName: 'trial',
            subscriptionStatus: 'TRIALING',
            trialEndsAt,
            maxLocations: 3,
            maxProducts: 500,
            maxUsers: 5,
            maxStorageMb: 5120,
            features: {
                pos: true,
                purchases: true,
                credit_sales: true,
                expiration_alerts: true,
                basic_reports: true,
                barcode_scanning: true,
                returns: true,
                expenses: true,
                invoices: true,
                advanced_reports: true,
            },
        },
    })

    console.log('✅ Organization created')

    // Create roles for this organization
    const adminRole = await prisma.role.upsert({
        where: {
            organizationId_name: {
                organizationId: organization.id,
                name: 'admin'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'admin',
            description: 'Full system access',
            permissions: ['*'],
            isSystem: true,
        },
    })

    const managerRole = await prisma.role.upsert({
        where: {
            organizationId_name: {
                organizationId: organization.id,
                name: 'manager'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'manager',
            description: 'Manage inventory and staff',
            permissions: [
                'products:view', 'products:create', 'products:edit',
                'inventory:view', 'inventory:adjust',
                'transfers:view', 'transfers:create', 'transfers:approve',
                'pos:access', 'pos:discount', 'pos:credit_sale',
                'po:view', 'po:create', 'po:approve', 'po:receive',
                'customers:view', 'customers:manage', 'customers:credit',
                'suppliers:view', 'suppliers:manage',
                'returns:view', 'returns:process', 'returns:approve',
                'expenses:view', 'expenses:create',
                'invoices:view', 'invoices:create', 'invoices:send',
                'reports:view', 'reports:export',
                'locations:view',
            ],
            isSystem: true,
        },
    })

    const staffRole = await prisma.role.upsert({
        where: {
            organizationId_name: {
                organizationId: organization.id,
                name: 'staff'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'staff',
            description: 'Day-to-day operations',
            permissions: [
                'products:view',
                'inventory:view', 'inventory:adjust',
                'transfers:view', 'transfers:create',
                'pos:access',
                'po:view', 'po:receive',
                'customers:view',
                'returns:view', 'returns:process',
                'expenses:view',
                'invoices:view',
                'reports:view',
                'locations:view',
            ],
            isSystem: true,
        },
    })

    console.log('✅ Roles created')

    // Create locations
    const warehouse = await prisma.location.upsert({
        where: { id: 'main-warehouse' },
        update: {},
        create: {
            id: 'main-warehouse',
            organizationId: organization.id,
            name: 'Main Warehouse',
            type: 'WAREHOUSE',
            address: '123 Industrial Ave',
            city: 'Accra',
            country: 'Ghana',
            phone: '+233 20 000 0001',
        },
    })

    const store = await prisma.location.upsert({
        where: { id: 'main-store' },
        update: {},
        create: {
            id: 'main-store',
            organizationId: organization.id,
            name: 'Main Store',
            type: 'STORE',
            address: '456 Market Street',
            city: 'Accra',
            country: 'Ghana',
            phone: '+233 20 000 0002',
        },
    })

    console.log('✅ Locations created')

    // Create users
    const hashedPassword = await hash('admin123', 12)

    await prisma.user.upsert({
        where: {
            organizationId_email: {
                organizationId: organization.id,
                email: 'admin@demo.com'
            }
        },
        update: { passwordHash: hashedPassword },
        create: {
            organizationId: organization.id,
            email: 'admin@demo.com',
            passwordHash: hashedPassword,
            name: 'Admin User',
            roleId: adminRole.id,
            defaultLocationId: warehouse.id,
            isOwner: true,
        },
    })

    await prisma.user.upsert({
        where: {
            organizationId_email: {
                organizationId: organization.id,
                email: 'manager@demo.com'
            }
        },
        update: { passwordHash: await hash('manager123', 12) },
        create: {
            organizationId: organization.id,
            email: 'manager@demo.com',
            passwordHash: await hash('manager123', 12),
            name: 'Manager User',
            roleId: managerRole.id,
            defaultLocationId: store.id,
        },
    })

    await prisma.user.upsert({
        where: {
            organizationId_email: {
                organizationId: organization.id,
                email: 'staff@demo.com'
            }
        },
        update: { passwordHash: await hash('staff123', 12) },
        create: {
            organizationId: organization.id,
            email: 'staff@demo.com',
            passwordHash: await hash('staff123', 12),
            name: 'Staff User',
            roleId: staffRole.id,
            defaultLocationId: store.id,
        },
    })

    console.log('✅ Users created')

    // Create sample categories
    const agrochemicalsCategory = await prisma.category.upsert({
        where: {
            organizationId_slug: {
                organizationId: organization.id,
                slug: 'agrochemicals'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'Agrochemicals',
            slug: 'agrochemicals',
            description: 'Pesticides, herbicides, fungicides',
        },
    })

    const fertilizersCategory = await prisma.category.upsert({
        where: {
            organizationId_slug: {
                organizationId: organization.id,
                slug: 'fertilizers'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'Fertilizers',
            slug: 'fertilizers',
            description: 'Organic and synthetic fertilizers',
        },
    })

    const seedsCategory = await prisma.category.upsert({
        where: {
            organizationId_slug: {
                organizationId: organization.id,
                slug: 'seeds'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'Seeds',
            slug: 'seeds',
            description: 'Crop and vegetable seeds',
        },
    })

    console.log('✅ Categories created')

    // Create expense categories
    const defaultExpenseCategories = ['Rent', 'Utilities', 'Supplies', 'Transport', 'Salaries', 'Marketing', 'Other']

    for (const catName of defaultExpenseCategories) {
        await prisma.expenseCategory.upsert({
            where: {
                organizationId_name: {
                    organizationId: organization.id,
                    name: catName
                }
            },
            update: {},
            create: {
                organizationId: organization.id,
                name: catName,
            },
        })
    }

    console.log('✅ Expense categories created')

    // Create invoice settings
    await prisma.invoiceSettings.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
            organizationId: organization.id,
            prefix: 'INV',
            nextNumber: 1,
        },
    })

    console.log('✅ Invoice settings created')

    // Create sample products
    const product1 = await prisma.product.upsert({
        where: {
            organizationId_sku: {
                organizationId: organization.id,
                sku: 'PEST-001'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'Roundup Herbicide 1L',
            description: 'Non-selective herbicide for weed control',
            sku: 'PEST-001',
            barcode: '8901234567890',
            categoryId: agrochemicalsCategory.id,
            costPrice: 45.00,
            sellingPrice: 65.00,
            taxRate: 0,
            reorderPoint: 20,
            reorderQuantity: 50,
            trackExpiration: true,
            expiryAlertDays: 90,
        },
    })

    const product2 = await prisma.product.upsert({
        where: {
            organizationId_sku: {
                organizationId: organization.id,
                sku: 'FERT-001'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'NPK Fertilizer 50kg',
            description: '15-15-15 balanced fertilizer',
            sku: 'FERT-001',
            barcode: '8901234567891',
            categoryId: fertilizersCategory.id,
            costPrice: 180.00,
            sellingPrice: 220.00,
            taxRate: 0,
            reorderPoint: 30,
            reorderQuantity: 100,
            trackExpiration: true,
            expiryAlertDays: 180,
        },
    })

    const product3 = await prisma.product.upsert({
        where: {
            organizationId_sku: {
                organizationId: organization.id,
                sku: 'SEED-001'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'Maize Seeds (Hybrid) 5kg',
            description: 'High-yield hybrid maize seeds',
            sku: 'SEED-001',
            barcode: '8901234567892',
            categoryId: seedsCategory.id,
            costPrice: 85.00,
            sellingPrice: 120.00,
            taxRate: 0,
            reorderPoint: 25,
            reorderQuantity: 60,
            trackExpiration: true,
            defaultShelfLifeDays: 365,
            expiryAlertDays: 60,
        },
    })

    console.log('✅ Products created')

    // Create stock levels with expiration dates
    const expirationDate1 = new Date()
    expirationDate1.setMonth(expirationDate1.getMonth() + 12)

    const expirationDate2 = new Date()
    expirationDate2.setMonth(expirationDate2.getMonth() + 18)

    await prisma.stockLevel.upsert({
        where: {
            productId_locationId_expirationDate: {
                productId: product1.id,
                locationId: warehouse.id,
                expirationDate: expirationDate1,
            }
        },
        update: { quantity: 100 },
        create: {
            productId: product1.id,
            locationId: warehouse.id,
            quantity: 100,
            expirationDate: expirationDate1,
        },
    })

    await prisma.stockLevel.upsert({
        where: {
            productId_locationId_expirationDate: {
                productId: product1.id,
                locationId: store.id,
                expirationDate: expirationDate1,
            }
        },
        update: { quantity: 25 },
        create: {
            productId: product1.id,
            locationId: store.id,
            quantity: 25,
            expirationDate: expirationDate1,
        },
    })

    await prisma.stockLevel.upsert({
        where: {
            productId_locationId_expirationDate: {
                productId: product2.id,
                locationId: warehouse.id,
                expirationDate: expirationDate2,
            }
        },
        update: { quantity: 200 },
        create: {
            productId: product2.id,
            locationId: warehouse.id,
            quantity: 200,
            expirationDate: expirationDate2,
        },
    })

    await prisma.stockLevel.upsert({
        where: {
            productId_locationId_expirationDate: {
                productId: product3.id,
                locationId: warehouse.id,
                expirationDate: expirationDate1,
            }
        },
        update: { quantity: 80 },
        create: {
            productId: product3.id,
            locationId: warehouse.id,
            quantity: 80,
            expirationDate: expirationDate1,
        },
    })

    console.log('✅ Stock levels created')

    // Create sample supplier
    await prisma.supplier.upsert({
        where: {
            organizationId_code: {
                organizationId: organization.id,
                code: 'SUP-001'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            code: 'SUP-001',
            name: 'AgroChemicals Ltd.',
            email: 'orders@agrochem.com',
            phone: '+233 30 000 0001',
            address: '123 Industrial Zone',
            city: 'Tema',
            country: 'Ghana',
            paymentTerms: 'Net 30',
            leadTimeDays: 7,
        },
    })

    console.log('✅ Supplier created')

    // Create sample customer
    await prisma.customer.upsert({
        where: {
            organizationId_code: {
                organizationId: organization.id,
                code: 'CUST-001'
            }
        },
        update: {},
        create: {
            organizationId: organization.id,
            code: 'CUST-001',
            type: 'BUSINESS',
            name: 'Kofi Farms Ltd.',
            email: 'buying@kofifarms.com',
            phone: '+233 24 000 0001',
            address: '456 Farm Road',
            city: 'Kumasi',
            country: 'Ghana',
            creditLimit: 5000.00,
            currentBalance: 0,
            creditStatus: 'GOOD',
        },
    })

    console.log('✅ Customer created')

    // Create subscription plans
    await prisma.plan.upsert({
        where: { name: 'starter' },
        update: {},
        create: {
            name: 'starter',
            displayName: 'Starter',
            description: 'Perfect for small businesses',
            monthlyPrice: 50.00,
            annualPrice: 500.00,
            currency: 'GHS',
            maxLocations: 1,
            maxProducts: 100,
            maxUsers: 2,
            maxStorageMb: 1024,
            features: {
                pos: true,
                purchases: true,
                credit_sales: true,
                expiration_alerts: true,
                basic_reports: true,
            },
            sortOrder: 1,
        },
    })

    await prisma.plan.upsert({
        where: { name: 'professional' },
        update: {},
        create: {
            name: 'professional',
            displayName: 'Professional',
            description: 'For growing businesses',
            monthlyPrice: 120.00,
            annualPrice: 1200.00,
            currency: 'GHS',
            maxLocations: 3,
            maxProducts: 500,
            maxUsers: 5,
            maxStorageMb: 5120,
            features: {
                pos: true,
                purchases: true,
                credit_sales: true,
                expiration_alerts: true,
                basic_reports: true,
                barcode_scanning: true,
                returns: true,
                expenses: true,
                invoices: true,
                advanced_reports: true,
            },
            sortOrder: 2,
        },
    })

    await prisma.plan.upsert({
        where: { name: 'business' },
        update: {},
        create: {
            name: 'business',
            displayName: 'Business',
            description: 'For established businesses',
            monthlyPrice: 250.00,
            annualPrice: 2500.00,
            currency: 'GHS',
            maxLocations: 10,
            maxProducts: 2000,
            maxUsers: 15,
            maxStorageMb: 20480,
            features: {
                pos: true,
                purchases: true,
                credit_sales: true,
                expiration_alerts: true,
                basic_reports: true,
                barcode_scanning: true,
                returns: true,
                expenses: true,
                invoices: true,
                advanced_reports: true,
                multi_currency: true,
                api_access: true,
            },
            sortOrder: 3,
        },
    })

    await prisma.plan.upsert({
        where: { name: 'enterprise' },
        update: {},
        create: {
            name: 'enterprise',
            displayName: 'Enterprise',
            description: 'For large operations',
            monthlyPrice: 500.00,
            annualPrice: 5000.00,
            currency: 'GHS',
            maxLocations: 999,
            maxProducts: 99999,
            maxUsers: 999,
            maxStorageMb: 102400,
            features: {
                pos: true,
                purchases: true,
                credit_sales: true,
                expiration_alerts: true,
                basic_reports: true,
                barcode_scanning: true,
                returns: true,
                expenses: true,
                invoices: true,
                advanced_reports: true,
                multi_currency: true,
                api_access: true,
                priority_support: true,
                custom_branding: true,
            },
            sortOrder: 4,
        },
    })

    console.log('✅ Subscription plans created')

    console.log('')
    console.log('🎉 Database seeded successfully!')
    console.log('')
    console.log('📧 Login credentials:')
    console.log('   Admin:   admin@demo.com / admin123')
    console.log('   Manager: manager@demo.com / manager123')
    console.log('   Staff:   staff@demo.com / staff123')
    console.log('')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
