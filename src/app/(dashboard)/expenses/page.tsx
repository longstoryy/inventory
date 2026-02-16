'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import PaginationControls from '@/components/ui/pagination-controls'
import Link from 'next/link'

interface Expense {
    id: string
    expenseNumber: string
    expenseDate: string
    amount: number
    paymentStatus: string
    category: { name: string }
    supplier: { name: string } | null
    description: string
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)

    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => {
        const fetchExpenses = async (page = 1) => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.append('page', page.toString())
                params.append('limit', pagination.limit.toString())

                const res = await fetch(`/api/expenses?${params.toString()}`)
                const data = await res.json()
                if (data.success) {
                    setExpenses(data.data)
                    if (data.pagination) setPagination(prev => ({ ...prev, ...data.pagination }))
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchExpenses(pagination.page)
    }, [pagination.page])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-success/10 text-success border-success/10'
            case 'PENDING': return 'bg-warning/10 text-warning border-warning/10'
            case 'PARTIAL': return 'bg-blue-50 text-blue-600 border-blue-100'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-executive-dark">Operational Expenses</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Track and optimize organizational spending.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/finance"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Petty Cash Source
                        </Link>
                        <Link href="/expenses/new" className="btn-executive-accent text-xs px-6">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                            Register Expense
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="executive-card p-6 bg-white">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expenditure</p>
                        <h4 className="text-2xl font-black text-executive-dark">{formatCurrency(totalExpenses)}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-2">FISCAL PERIOD TO DATE</p>
                    </div>
                </div>

                <div className="executive-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date / Ref</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(8)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6">
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-100 rounded w-24"></div>
                                                    <div className="h-3 bg-slate-50 rounded w-16"></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-50 rounded w-40 mb-2"></div><div className="h-3 bg-slate-50 rounded w-28"></div></td>
                                            <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-5 bg-slate-100 rounded w-20"></div></td>
                                        </tr>
                                    ))
                                ) : expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900">No expenses recorded</p>
                                                <p className="text-xs text-slate-400 mt-1">Start tracking your operational costs.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    expenses.map((e) => (
                                        <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-executive-dark">
                                                        {new Date(e.expenseDate).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{e.expenseNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                    {e.category?.name}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs font-medium text-slate-600 max-w-xs truncate">{e.description || '-'}</div>
                                                {e.supplier && <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{e.supplier.name}</div>}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="text-sm font-black text-executive-dark">{formatCurrency(Number(e.amount))}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(e.paymentStatus)}`}>
                                                    {e.paymentStatus}
                                                </span>
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
