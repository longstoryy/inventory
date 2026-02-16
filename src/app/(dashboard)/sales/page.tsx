'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { useDebounce } from '@/hooks/use-debounce'
import PaginationControls from '@/components/ui/pagination-controls'

interface Sale {
    id: string
    invoiceNumber: string
    total: number
    paymentMethod: string
    status: string
    createdAt: string
    customer: { name: string } | null
    location: { name: string } | null
    user: { name: string } | null
    _count: { items: number }
}

export default function SalesPage() {
    const router = useRouter()
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
    
    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 500)

    useEffect(() => {
        fetchSales(pagination.page)
    }, [debouncedSearch, pagination.page])

    const fetchSales = async (page = 1) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())
            if (debouncedSearch) params.append('q', debouncedSearch)

            const res = await fetch(`/api/sales?${params.toString()}`)

            if (!res.ok) {
                if (res.status === 401) { router.push('/login'); return; }
                throw new Error(`Server returned ${res.status} ${res.statusText}`)
            }

            const data = await res.json()
            if (data.success) {
                setSales(data.data)
                if (data.pagination) setPagination(data.pagination)
            } else {
                setError(data.error || 'Failed to fetch sales')
            }
        } catch (err: any) {
            console.error('Fetch failed:', err)
            setError(err.message || 'Connection failed')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success/10 text-success border-success/10'
            case 'VOID': return 'bg-danger/10 text-danger border-danger/10'
            case 'REFUNDED': return 'bg-amber-100 text-amber-700 border-amber-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {error && (
                    <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">{error}</span>
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Revenue Ledger</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Verified historical records of institutional revenue and fiscal deployments.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/finance"
                            className="btn-executive text-xs"
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18m-7 5h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            Cash Desk
                        </Link>
                        <button 
                            onClick={() => {
                                if (sales.length === 0) return;
                                const headers = ['Invoice Number', 'Customer', 'Location', 'Total', 'Payment', 'Status', 'Date'];
                                const rows = sales.map(s => [
                                    s.invoiceNumber,
                                    s.customer?.name || 'Walk-in',
                                    s.location?.name || 'Unknown',
                                    s.total,
                                    s.paymentMethod,
                                    s.status,
                                    new Date(s.createdAt).toLocaleDateString()
                                ]);
                                const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                const url = URL.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", `revenue_ledger_${new Date().toISOString().split('T')[0]}.csv`);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="btn-executive-dark text-xs px-8"
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                            Export Audit
                        </button>
                        <Link href="/sales/new" className="btn-executive-accent text-xs px-10 shadow-2xl shadow-executive-accent/10">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                            Terminal Start
                        </Link>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <div className="relative">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            className="w-full pl-16 pr-8 py-4 bg-white rounded-2xl text-sm font-black text-executive-dark outline-none focus:ring-2 focus:ring-executive-accent/20 transition-all border border-slate-200 placeholder:text-slate-300 shadow-sm"
                            placeholder="Search by Invoice Identifier..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Revenue Stream</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice Node</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity / Customer</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution Point</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Fiscal Volume</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Protocol</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(8)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-24 mb-2"></div><div className="h-3 bg-slate-50 rounded w-32"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                                            <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded w-20"></div></td>
                                            <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto mb-1"></div><div className="h-3 bg-slate-50 rounded w-10 ml-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded w-16"></div></td>
                                            <td className="px-8 py-6"><div className="h-6 bg-slate-100 rounded-lg w-20"></div></td>
                                            <td className="px-8 py-6"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-32 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <p className="text-sm font-bold text-slate-900">No transactions recorded</p>
                                                <p className="text-xs text-slate-400 mt-1">Initialize a terminal transaction to begin revenue tracking.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map((sale) => (
                                        <tr 
                                            key={sale.id} 
                                            onClick={() => router.push(`/sales/${sale.id}`)}
                                            className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors tracking-tighter">{sale.invoiceNumber}</div>
                                                <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{new Date(sale.createdAt).toLocaleDateString()} {"//"} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="text-sm font-black text-executive-dark">{sale.customer?.name || 'Authorized Guest'}</div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {sale.location?.name || 'Global HQ'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="text-sm font-black text-executive-dark">{formatCurrency(sale.total)}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{sale._count.items} Units</div>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{sale.paymentMethod}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(sale.status)}`}>
                                                    {sale.status}
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
