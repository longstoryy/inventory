'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QUICK_ACTIONS } from '@/config/navigation'

interface DashboardData {
    overview: {
        totalProducts: number
        totalCustomers: number
        totalSuppliers: number
        lowStockCount: number
        expiringProducts: number
    }
    sales: {
        today: { total: number; count: number; collections: number; credit: number; grossProfit: number; netProfit: number; totalExpenses: number }
        thisMonth: { total: number; count: number; growth: string }
    }
    pending: {
        purchaseOrders: number
        transfers: number
    }
    recentSales: Array<{
        id: string
        invoiceNumber: string
        total: number
        createdAt: string
        customer: { name: string } | null
        location: { name: string } | null
    }>
    lowStockItems?: Array<{
        id: string
        product: { id: string; name: string; sku: string }
        quantity: number
        location: { id: string; name: string }
    }>
    pendingOrders?: Array<{
        id: string
        poNumber: string
        supplier: { name: string }
        totalAmount: number
        status: string
    }>
    revenueTrend?: Array<{ date: string; revenue: number }>
    topProducts?: Array<{
        productId: string
        name: string
        sku: string
        quantity: number
    }>
}

export default function DashboardPage() {
    const router = useRouter()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch('/api/dashboard')
                const result = await res.json()
                if (result.success) setData(result.data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading || !data) return (
        <div className="space-y-6 animate-pulse max-w-lg mx-auto pb-24 lg:pb-0 pt-6">
            <div className="h-48 bg-slate-200 rounded-[1.5rem] w-full"></div>
            <div className="flex gap-4 overflow-hidden">
                <div className="h-24 w-24 bg-slate-200 rounded-2xl flex-shrink-0"></div>
                <div className="h-24 w-24 bg-slate-200 rounded-2xl flex-shrink-0"></div>
                <div className="h-24 w-24 bg-slate-200 rounded-2xl flex-shrink-0"></div>
            </div>
            <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
                <div className="h-20 bg-slate-200 rounded-2xl w-full"></div>
                <div className="h-20 bg-slate-200 rounded-2xl w-full"></div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 pb-32 lg:pb-0 animate-executive max-w-lg mx-auto pt-2 sm:pt-6">

            {/* Asset Card */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-executive-dark text-white p-6 shadow-2xl shadow-executive-dark/20 group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-executive-accent/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        Total Revenue Today
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-white mb-8">
                        {formatCurrency(data.sales.today.total)}
                    </h2>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Transactions</p>
                            <p className="text-lg font-bold text-white">{data.sales.today.count}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Net Profit</p>
                            <p className={`text-lg font-bold ${data.sales.today.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {data.sales.today.netProfit > 0 ? '+' : ''}{formatCurrency(data.sales.today.netProfit)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {/* Quick Access */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Quick Access</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
                    {QUICK_ACTIONS.filter(item => item.quickAccess).map((action, index) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="snap-start flex flex-col items-center gap-2 min-w-[72px] group"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform group-active:scale-95 ${index === 0 ? 'bg-executive-dark text-white border-executive-dark' :
                                    index === 1 ? 'bg-white text-executive-dark border-slate-200' :
                                        'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                                </svg>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 text-center leading-tight max-w-[72px]">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Attention Needed */}
            {(data.overview.lowStockCount > 0 || data.pending.purchaseOrders > 0) && (
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Attention Needed</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
                        {data.overview.lowStockCount > 0 && (
                            <Link href="/inventory?filter=low" className="snap-start min-w-[160px] p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-start gap-3 active:scale-98 transition-transform">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-display font-bold text-slate-900">{data.overview.lowStockCount}</p>
                                    <p className="text-xs font-bold text-amber-700">Low Stock Items</p>
                                </div>
                            </Link>
                        )}
                        {data.pending.purchaseOrders > 0 && (
                            <Link href="/purchase-orders" className="snap-start min-w-[160px] p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-start gap-3 active:scale-98 transition-transform">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-display font-bold text-slate-900">{data.pending.purchaseOrders}</p>
                                    <p className="text-xs font-bold text-blue-700">Pending Orders</p>
                                </div>
                            </Link>
                        )}
                        {data.pending.transfers > 0 && (
                            <Link href="/transfers" className="snap-start min-w-[160px] p-4 rounded-2xl bg-cyan-50 border border-cyan-100 flex flex-col items-start gap-3 active:scale-98 transition-transform">
                                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-display font-bold text-slate-900">{data.pending.transfers}</p>
                                    <p className="text-xs font-bold text-cyan-700">Transfers</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                    <Link href="/sales" className="text-xs font-bold text-executive-dark bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">View All</Link>
                </div>
                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    {data.recentSales.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No recent transactions.</div>
                    ) : (
                        data.recentSales.map((sale, i) => (
                            <Link key={sale.id} href={`/sales/${sale.id}`} className={`flex items-center justify-between p-5 hover:bg-slate-50 transition-colors active:bg-slate-100 ${i !== data.recentSales.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 mb-0.5">{sale.customer?.name || 'Walk-in Customer'}</p>
                                        <p className="text-[11px] text-slate-400 font-medium">{new Date(sale.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {sale.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900">{formatCurrency(sale.total)}</p>
                                    <span className="text-[10px] font-semibold text-emerald-600">Sale</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
