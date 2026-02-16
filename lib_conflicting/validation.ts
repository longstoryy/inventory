import { z } from 'zod'

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const registerSchema = z.object({
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU is required'),
    category: z.string().optional(),
    hazardClass: z.string().optional(),
    unit: z.string().default('bottle'),
    reorderLevel: z.number().min(0).default(0),
    description: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().url().optional(),
})

export const batchSchema = z.object({
    productId: z.string().cuid('Invalid product ID'),
    lotNo: z.string().min(1, 'Lot number is required'),
    expiryDate: z.string().optional(),
    quantity: z.number().min(0, 'Quantity must be positive'),
    cost: z.number().min(0).optional(),
    location: z.string().optional(),
})

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const customerSchema = z.object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    creditLimit: z.number().min(0).default(0),
    notes: z.string().optional(),
})

// ============================================
// SALE SCHEMAS
// ============================================

export const saleItemSchema = z.object({
    productId: z.string().cuid('Invalid product ID'),
    batchId: z.string().cuid('Invalid batch ID').optional(),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    price: z.number().min(0, 'Price must be positive'),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
})

export const saleSchema = z.object({
    customerId: z.string().cuid('Invalid customer ID').optional(),
    type: z.enum(['CASH', 'CREDIT']).default('CASH'),
    invoiceNo: z.string().optional(),
    items: z.array(saleItemSchema).min(1, 'At least one item is required'),
    discount: z.number().min(0).default(0),
    taxAmount: z.number().min(0).default(0),
    notes: z.string().optional(),
})

// ============================================
// RETURN SCHEMAS
// ============================================

export const returnItemSchema = z.object({
    productId: z.string().cuid('Invalid product ID'),
    batchId: z.string().cuid('Invalid batch ID').optional(),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    price: z.number().min(0),
    reason: z.string().optional(),
})

export const returnSchema = z.object({
    saleId: z.string().cuid('Invalid sale ID').optional(),
    customerId: z.string().cuid('Invalid customer ID').optional(),
    type: z.enum(['REFUND', 'EXCHANGE']).default('REFUND'),
    items: z.array(returnItemSchema).min(1, 'At least one item is required'),
    reason: z.string().optional(),
    notes: z.string().optional(),
})

// ============================================
// EXPENSE SCHEMAS
// ============================================

export const expenseSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.number().min(0.01, 'Amount must be positive'),
    description: z.string().optional(),
    vendor: z.string().optional(),
    expenseDate: z.string(), // ISO date string
    notes: z.string().optional(),
})

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const paymentSchema = z.object({
    customerId: z.string().cuid('Invalid customer ID'),
    saleId: z.string().cuid('Invalid sale ID').optional(),
    amount: z.number().min(0.01, 'Amount must be positive'),
    method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY']).default('CASH'),
    reference: z.string().optional(),
    notes: z.string().optional(),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProductInput = z.infer<typeof productSchema>
export type BatchInput = z.infer<typeof batchSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type SaleInput = z.infer<typeof saleSchema>
export type SaleItemInput = z.infer<typeof saleItemSchema>
export type ReturnInput = z.infer<typeof returnSchema>
export type ReturnItemInput = z.infer<typeof returnItemSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
