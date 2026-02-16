'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import PaginationControls from '@/components/ui/pagination-controls'

interface PurchaseOrder {
    id: string
    poNumber: string
    status: string
    totalAmount: number
    expectedDate: string | null
    createdAt: string
    supplier: { name: string; code: string }
    location: { name: string }
    _count: { items: number }
}

export default function PurchaseOrdersPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => {
        fetchOrders(pagination.page)
    }, [pagination.page])

    const fetchOrders = async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())

            const res = await fetch(`/api/purchase-orders?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setOrders(data.data)
                if (data.pagination) setPagination(data.pagination)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'RECEIVED': return 'bg-success/10 text-success border-success/10'
            case 'CANCELLED': return 'bg-danger/10 text-danger border-danger/10'
            case 'SENT': return 'bg-mechanical-blue/10 text-mechanical-blue border-mechanical-blue/10'
            case 'PARTIAL': return 'bg-amber-100 text-amber-700 border-amber-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Procurement Hub</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manage institutional supply chains and acquisition commitments.</p>
                    </div>
                    <Link href="/purchase-orders/new" className="btn-executive-dark px-10 text-xs shadow-2xl shadow-executive-dark/10">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Initialize Procurement
                    </Link>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Procurement Stream</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">PO Identifier</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provisioning Entity</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destination Node</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Commitment Value</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expected Yield</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-24 mb-2"></div><div className="h-3 bg-slate-50 rounded w-20"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-40 mb-2"></div><div className="h-3 bg-slate-50 rounded w-16"></div></td>
                                            <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                                            <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto mb-1"></div><div className="h-3 bg-slate-50 rounded w-16 ml-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded w-20"></div></td>
                                            <td className="px-8 py-6"><div className="h-6 bg-slate-100 rounded-lg w-24"></div></td>
                                            <td className="px-8 py-6"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-32 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <p className="text-sm font-bold text-slate-900">No procurement logs discovered</p>
                                                <p className="text-xs text-slate-400 mt-1">Initiate a purchase order to begin supply chain tracking.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr 
                                            key={order.id} 
                                            onClick={() => router.push(`/purchase-orders/${order.id}`)}
                                            className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors tracking-tighter">{order.poNumber}</div>
                                                <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark">{order.supplier.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{order.supplier.code}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {order.location.name}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="text-sm font-black text-executive-dark">{formatCurrency(order.totalAmount)}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{order._count.items} Line Items</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                                                    {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'Unscheduled'}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    <div className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-executive-dark hover:text-white transition-all shadow-sm">
                                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                    totalItems={pagination.total}
                />
            </div>
        </DashboardLayout>
    )
}
