'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import PaginationControls from '@/components/ui/pagination-controls'

interface Invoice {
    id: string
    invoiceNumber: string
    customer: { name: string; email: string | null }
    sale: { saleNumber: string }
    totalAmount: number
    balanceDue: number
    status: string
    dueDate: string
    createdAt: string
}

export default function InvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => {
        const fetchInvoices = async (page = 1) => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.append('page', page.toString())
                params.append('limit', pagination.limit.toString())

                const res = await fetch(`/api/invoices?${params.toString()}`)
                const data = await res.json()
                if (data.success) {
                    setInvoices(data.data)
                    if (data.pagination) setPagination(prev => ({ ...prev, ...data.pagination }))
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchInvoices(pagination.page)
    }, [pagination.page])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-success/10 text-success border-success/10'
            case 'SENT': return 'bg-blue-50 text-blue-600 border-blue-100'
            case 'OVERDUE': return 'bg-danger/10 text-danger border-danger/10'
            case 'DRAFT': return 'bg-slate-100 text-slate-500 border-slate-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Fiscal Ledger</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manage institutional billing and receivables architecture.</p>
                    </div>
                    <Link href="/invoices/new" className="btn-executive-dark px-10 text-xs shadow-2xl shadow-executive-dark/10">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                        Issue Protocol
                    </Link>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Billing Stream</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Billing Node</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity / Client</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Cycle</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Volume</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Exposure</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(8)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-100 rounded w-32"></div>
                                                    <div className="h-3 bg-slate-50 rounded w-24"></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-100 rounded w-28"></div>
                                                    <div className="h-3 bg-slate-50 rounded w-20"></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                                            <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                                            <td className="px-8 py-6 text-center"><div className="h-5 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-32 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900">No invoices generated</p>
                                                <p className="text-xs text-slate-400 mt-1">Create invoices from sales to track payments.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr 
                                            key={inv.id} 
                                            onClick={() => router.push(`/invoices/${inv.id}`)}
                                            className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors tracking-tighter">{inv.invoiceNumber}</div>
                                                <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">REF: {inv.sale.saleNumber}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark">{inv.customer.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{inv.customer.email || 'SYSTEM_LOG'}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issued: {new Date(inv.createdAt).toLocaleDateString()}</div>
                                                <div className="text-[10px] font-black text-danger uppercase tracking-widest mt-1">Lapse: {new Date(inv.dueDate).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="text-sm font-black text-slate-600">{formatCurrency(Number(inv.totalAmount))}</div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="text-sm font-black text-executive-dark">{formatCurrency(Number(inv.balanceDue))}</div>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(inv.status)}`}>
                                                    {inv.status}
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
                    onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                    totalItems={pagination.total}
                />
            </div>
        </DashboardLayout>
    )
}
