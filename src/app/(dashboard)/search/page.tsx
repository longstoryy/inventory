'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface ProductResult { id: string; name: string; sku: string; sellingPrice: number }
interface CustomerResult { id: string; name: string; email: string; phone: string }
interface OrderResult { id: string; poNumber: string; status: string; totalAmount: number }
interface SearchResults {
    products: ProductResult[]
    customers: CustomerResult[]
    orders: OrderResult[]
}

export default function SearchPage() {
    const searchParams = useSearchParams()
    const q = searchParams.get('q') || ''
    const [results, setResults] = useState<SearchResults>({ products: [], customers: [], orders: [] })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let isMounted = true

        const searchProducts = async () => {
            if (q) {
                if (isMounted) setLoading(true)
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
                    const data = await res.json()
                    if (isMounted && data.success) {
                        setResults(data.data)
                    }
                } catch (error) {
                    if (isMounted) {
                        console.error('Search failed:', error)
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false)
                    }
                }
            } else {
                if (isMounted) {
                    setResults({ products: [], customers: [], orders: [] })
                    setLoading(false)
                }
            }
        }

        searchProducts()

        return () => {
            isMounted = false
        }
    }, [q])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-executive-dark">Search Results</h1>
                    <p className="text-slate-500 mt-1">Showing results for &quot;{q}&quot;</p>
                </div>

                {loading ? (
                    <div className="executive-card p-10 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-executive-accent rounded-full animate-spin"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Products */}
                        <div className="executive-card p-6">
                            <h2 className="text-lg font-bold text-executive-dark mb-4 border-b pb-2">Products ({results.products.length})</h2>
                            {!results.products.length && <p className="text-sm text-slate-400">No products found.</p>}
                            <div className="space-y-3">
                                {results.products.map((p) => (
                                    <Link key={p.id} href={`/products/${p.id}`} className="block p-3 hover:bg-slate-50 rounded-lg group transition-colors">
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 group-hover:text-executive-accent transition-colors">{p.name}</p>
                                                <p className="text-xs text-slate-400">{p.sku}</p>
                                            </div>
                                            <p className="text-sm font-bold text-executive-accent">{formatCurrency(p.sellingPrice)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Customers */}
                        <div className="executive-card p-6">
                            <h2 className="text-lg font-bold text-executive-dark mb-4 border-b pb-2">Customers ({results.customers.length})</h2>
                            {!results.customers.length && <p className="text-sm text-slate-400">No customers found.</p>}
                            <div className="space-y-3">
                                {results.customers.map((c) => (
                                    <Link key={c.id} href={`/customers/${c.id}`} className="block p-3 hover:bg-slate-50 rounded-lg group transition-colors">
                                        <p className="font-bold text-sm text-slate-900 group-hover:text-executive-accent transition-colors">{c.name}</p>
                                        <p className="text-xs text-slate-400">{c.email} • {c.phone}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Orders */}
                        <div className="executive-card p-6 md:col-span-2">
                            <h2 className="text-lg font-bold text-executive-dark mb-4 border-b pb-2">Purchase Orders ({results.orders.length})</h2>
                            {!results.orders.length && <p className="text-sm text-slate-400">No orders found.</p>}
                            <div className="space-y-3">
                                {results.orders.map((o) => (
                                    <Link key={o.id} href={`/purchase-orders/${o.id}`} className="block p-3 hover:bg-slate-50 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{o.poNumber}</p>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 uppercase">{o.status}</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">{formatCurrency(o.totalAmount)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
