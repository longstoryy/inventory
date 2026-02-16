'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
    type: 'product' | 'customer' | 'sale' | 'order'
    id: string
    name?: string
    sku?: string
    price?: number
    category?: string
    email?: string
    phone?: string
    balance?: number
    number?: string
    amount?: number
    status?: string
    customer?: string
    supplier?: string
    date?: string
}

interface SearchResults {
    products: SearchResult[]
    customers: SearchResult[]
    sales: SearchResult[]
    orders: SearchResult[]
}

export default function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>({ products: [], customers: [], sales: [], orders: [] })
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Debounced search
    useEffect(() => {
        if (query.length < 2) {
            setResults({ products: [], customers: [], sales: [], orders: [] })
            setIsOpen(false)
            return
        }

        setLoading(true)
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                if (data.success) {
                    setResults(data.data)
                    setIsOpen(true)
                    setSelectedIndex(0)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    // CMD+K / CTRL+K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const allResults = [
        ...results.products,
        ...results.customers,
        ...results.sales,
        ...results.orders
    ]

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || allResults.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % allResults.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            handleSelect(allResults[selectedIndex])
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false)
        setQuery('')
        
        switch (result.type) {
            case 'product':
                router.push(`/products/${result.id}`)
                break
            case 'customer':
                router.push(`/customers/${result.id}`)
                break
            case 'sale':
                router.push(`/sales/${result.id}`)
                break
            case 'order':
                router.push(`/purchase-orders/${result.id}`)
                break
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getIcon = (type: string) => {
        switch (type) {
            case 'product': return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
            case 'customer': return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
            case 'sale': return 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'
            case 'order': return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
            default: return 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
        }
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative group">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-executive-accent transition-colors" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products, orders, customers... (⌘K)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:border-executive-accent focus:ring-4 focus:ring-executive-accent/5 outline-none transition-all"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-executive-accent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {isOpen && allResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {results.products.length > 0 && (
                        <div>
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Products</p>
                            </div>
                            {results.products.map((item, idx) => {
                                const globalIdx = idx
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${selectedIndex === globalIdx ? 'bg-executive-accent/5' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="1.5"><path d={getIcon('product')} /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.sku} • {item.category}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price || 0)}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {results.customers.length > 0 && (
                        <div>
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Customers</p>
                            </div>
                            {results.customers.map((item, idx) => {
                                const globalIdx = results.products.length + idx
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${selectedIndex === globalIdx ? 'bg-executive-accent/5' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="1.5"><path d={getIcon('customer')} /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.phone || item.email}</p>
                                        </div>
                                        {item.balance !== undefined && item.balance > 0 && (
                                            <p className="text-xs font-bold text-orange-600">Bal: {formatCurrency(item.balance)}</p>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {results.sales.length > 0 && (
                        <div>
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Sales</p>
                            </div>
                            {results.sales.map((item, idx) => {
                                const globalIdx = results.products.length + results.customers.length + idx
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${selectedIndex === globalIdx ? 'bg-executive-accent/5' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth="1.5"><path d={getIcon('sale')} /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{item.number}</p>
                                            <p className="text-xs text-slate-500">{item.customer}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(item.amount || 0)}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {results.orders.length > 0 && (
                        <div>
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Purchase Orders</p>
                            </div>
                            {results.orders.map((item, idx) => {
                                const globalIdx = results.products.length + results.customers.length + results.sales.length + idx
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${selectedIndex === globalIdx ? 'bg-executive-accent/5' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="1.5"><path d={getIcon('order')} /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{item.number}</p>
                                            <p className="text-xs text-slate-500">{item.supplier}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(item.amount || 0)}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
