// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: unknown
    }
    meta?: {
        total?: number
        page?: number
        limit?: number
        totalPages?: number
    }
}

// Pagination
export interface PaginationParams {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
    items: T[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

// Form States
export interface FormState {
    isLoading: boolean
    isSubmitting: boolean
    errors: Record<string, string>
}

// Select Option
export interface SelectOption {
    value: string
    label: string
    disabled?: boolean
}

// Table Column Definition
export interface TableColumn<T> {
    key: keyof T | string
    header: string
    sortable?: boolean
    width?: string
    render?: (item: T) => React.ReactNode
}

// Navigation Item
export interface NavItem {
    label: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
    permissions?: string[]
    children?: NavItem[]
}

// Dashboard KPI
export interface KpiCard {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    icon?: React.ComponentType<{ className?: string }>
    color?: 'blue' | 'green' | 'yellow' | 'red'
}

// Chart Data
export interface ChartDataPoint {
    label: string
    value: number
    [key: string]: string | number
}

// Status Badge Variants
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray'

// Location Types (for easier use in components)
export type LocationType = 'WAREHOUSE' | 'STORE' | 'VIRTUAL'

// Product Status
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'

// Order Statuses
export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'
export type SaleStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'VOID'
export type TransferStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'INSPECTED' | 'PROCESSED' | 'REJECTED'

// Payment Method
export type PaymentMethod = 'CASH' | 'CARD' | 'CREDIT' | 'BANK_TRANSFER' | 'MULTIPLE'

// Common Entity Props
export interface BaseEntity {
    id: string
    createdAt: Date | string
    updatedAt: Date | string
}

// Simplified types for common operations
export interface ProductBasic {
    id: string
    name: string
    sku: string
    sellingPrice: number | string
    imageUrl?: string | null
}

export interface LocationBasic {
    id: string
    name: string
    type: LocationType
}

export interface CustomerBasic {
    id: string
    code: string
    name: string
    email?: string | null
}

export interface SupplierBasic {
    id: string
    code: string
    name: string
}
