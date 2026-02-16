'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pathMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'products': 'Products',
    'categories': 'Categories',
    'inventory': 'Inventory Ledger',
    'locations': 'Locations',
    'alerts': 'Stock Alerts',
    'sales': 'Sales Registry',
    'new': 'New Addition',
    'customers': 'Customer Relations',
    'suppliers': 'Vendors & Suppliers',
    'transfers': 'Stock Transfers',
    'purchase-orders': 'Procurement POs',
    'finance': 'Treasury & Cash',
    'expenses': 'Operating Expenses',
    'invoices': 'Invoicing Center',
    'reports': 'Intelligence Hub',
    'billing': 'Subscription Management',
    'settings': 'System Control',
    'profile': 'My Account',
}

const Breadcrumbs = () => {
    const pathname = usePathname()
    if (!pathname || pathname === '/dashboard') return null

    const segments = pathname.split('/').filter(Boolean)

    return (
        <nav className="flex items-center space-x-2 text-xs font-medium mb-6">
            <Link
                href="/dashboard"
                className="text-slate-400 hover:text-executive-accent transition-colors flex items-center gap-1.5"
            >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Portal
            </Link>

            {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join('/')}`
                const isLast = index === segments.length - 1
                const label = pathMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

                // Skip if it looks like a hash or UUID (too long for breadcrumb)
                if (segment.length > 20) return null

                return (
                    <React.Fragment key={href}>
                        <svg width="12" height="12" className="text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M9 18l6-6-6-6" />
                        </svg>

                        {isLast ? (
                            <span className="text-executive-dark font-bold">{label}</span>
                        ) : (
                            <Link
                                href={href}
                                className="text-slate-400 hover:text-executive-accent transition-colors"
                            >
                                {label}
                            </Link>
                        )}
                    </React.Fragment>
                )
            })}
        </nav>
    )
}

export default Breadcrumbs
