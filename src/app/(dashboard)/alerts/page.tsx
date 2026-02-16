'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import PaginationControls from '@/components/ui/pagination-controls'

interface StockAlert {
    id: string
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRING_SOON' | 'EXPIRED'
    status: 'ACTIVE' | 'SNOOZED' | 'RESOLVED'
    currentQuantity: number
    thresholdQuantity: number
    expirationDate: string | null
    snoozedUntil: string | null
    createdAt: string
    product: { id: string; name: string; sku: string }
    location: { id: string; name: string } | null
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<StockAlert[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => {
        fetchAlerts(pagination.page)
    }, [pagination.page])

    const fetchAlerts = async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())

            const res = await fetch(`/api/alerts?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setAlerts(data.data)
                if (data.pagination) setPagination(prev => ({ ...prev, ...data.pagination }))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const resolveAlert = async (id: string) => {
        try {
            const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                fetchAlerts(pagination.page)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const getAlertBadge = (type: string) => {
        const styles = {
            'LOW_STOCK': 'bg-amber-100 text-amber-700 border-amber-200',
            'OUT_OF_STOCK': 'bg-red-100 text-red-700 border-red-200 font-bold',
            'EXPIRING_SOON': 'bg-orange-100 text-orange-700 border-orange-200',
            'EXPIRED': 'bg-rose-100 text-rose-700 border-rose-200 font-bold',
            'OVERSTOCK': 'bg-blue-100 text-blue-700 border-blue-200'
        }
        return styles[type as keyof typeof styles] || 'bg-slate-100 text-slate-700'
    }

    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-executive-dark">Attention Protocols</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Critical node alerts and asset health monitoring.</p>
                    </div>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active System Notifications</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Asset</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Location</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alert Classification</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Metric</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Reference</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && alerts.length === 0 ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-10 py-6"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                            <td className="px-10 py-6"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                            <td className="px-10 py-6"><div className="h-6 bg-slate-50 rounded-lg w-24"></div></td>
                                            <td className="px-10 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                                            <td className="px-10 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                                            <td className="px-10 py-6 text-right"><div className="h-8 bg-slate-50 rounded-xl w-20 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : alerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-20 text-center">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">All systems operational. No active alerts.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    alerts.map((alert) => (
                                        <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-10 py-6">
                                                <p className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors">{alert.product.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{alert.product.sku}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{alert.location?.name || 'Central Node'}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-widest ${getAlertBadge(alert.alertType)}`}>
                                                    {alert.alertType.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <span className={`text-sm font-black ${alert.status === 'ACTIVE' ? 'text-executive-dark' : 'text-slate-400'}`}>
                                                    {alert.alertType === 'EXPIRING_SOON' || alert.alertType === 'EXPIRED'
                                                        ? alert.expirationDate ? new Date(alert.expirationDate).toLocaleDateString() : 'N/A'
                                                        : alert.currentQuantity
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                    {alert.alertType.includes('STOCK') ? `Limit: ${alert.thresholdQuantity}` : 'Date Log'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                {alert.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => resolveAlert(alert.id)}
                                                        className="px-4 py-2 bg-executive-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-executive-accent shadow-xl shadow-executive-dark/5 transition-all"
                                                    >
                                                        Resolve
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black text-success uppercase tracking-widest flex items-center justify-end gap-1">
                                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                                        Resolved
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationControls
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                        totalItems={pagination.total}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
