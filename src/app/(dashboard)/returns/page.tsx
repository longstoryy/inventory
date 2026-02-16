'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'

interface Return {
    id: string
    returnNumber: string
    status: string
    reason: string
    refundAmount: number
    createdAt: string
    customer: { name: string } | null
    sale: { saleNumber: string }
    createdBy: { name: string }
    _count: { items: number }
}

export default function ReturnsPage() {
    const [returns, setReturns] = useState<Return[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchReturns = async () => {
            try {
                const res = await fetch('/api/returns')
                const data = await res.json()
                if (data.success) setReturns(data.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchReturns()
    }, [])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-success/10 text-success border-success/10'
            case 'REQUESTED': return 'bg-warning/10 text-warning border-warning/10'
            case 'REJECTED': return 'bg-danger/10 text-danger border-danger/10'
            case 'RECEIVED': return 'bg-blue-50 text-blue-600 border-blue-100'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-executive-dark">Returns & Refunds</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manage product returns and quality control.</p>
                    </div>
                    {/* No "Create Return" button here yet, as it usually starts from a Sale */}
                </div>

                <div className="executive-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Return Ref</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer / Sale</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Refund</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-8 py-8"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : returns.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900">No returns processing</p>
                                                <p className="text-xs text-slate-400 mt-1">Returns initiated from sales will appear here.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    returns.map((r) => (
                                        <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-bold text-executive-dark">{r.returnNumber}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{r.customer?.name || 'Walk-in Customer'}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">REF: {r.sale.saleNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{r.reason}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="text-sm font-black text-executive-dark">{formatCurrency(Number(r.refundAmount))}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(r.status)}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-xs font-medium text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
