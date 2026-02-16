import { z } from 'zod'

// Shared schemas
export const idSchema = z.string().uuid()

// Product Schemas
export const productSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    sku: z.string().min(1, "SKU is required").max(50),
    description: z.string().optional(),
    sellingPrice: z.number().min(0),
    costPrice: z.number().min(0),
    unit: z.string().default("Each"),
    categoryId: z.string().uuid().optional().or(z.literal("")),
    reorderPoint: z.number().min(0).optional().default(0),
    // Additional fields for enterprise tracking
    trackExpiration: z.boolean().optional().default(false),
    expiryAlertDays: z.number().optional().default(30),
})

export type ProductForm = z.infer<typeof productSchema>

// Expense Schemas
export const expenseSchema = z.object({
    categoryId: z.string().uuid("Invalid category ID"),
    amount: z.number().positive("Amount must be positive"),
    expenseDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
    description: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'MULTIPLE']),
})

// Sales Schemas
export const saleItemSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
})

export const saleSchema = z.object({
    customerId: z.string().uuid().optional().or(z.literal("")),
    items: z.array(saleItemSchema).min(1, "At least one item is required"),
    paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'MULTIPLE']), // Adjusted to match Prisma Enum
    amountPaid: z.number().min(0),
    status: z.enum(['PENDING', 'COMPLETED', 'REFUNDED', 'VOID']).default('COMPLETED'),
})
