'use client'

import { useState, useEffect, use } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'

interface SaleItem {
    id: string
    productId: string
    quantity: number
    unitPrice: number
    totalAmount: number
    product: {
        id: string
        name: string
        sku: string
    }
}

interface SaleDetail {
    id: string
    invoiceNumber: string
    totalAmount: number
    taxAmount: number
    discountAmount: number
    paymentMethod: string
    status: string
    createdAt: string
    customer: { name: string; email: string | null; phone: string | null } | null
    location: { id: string, name: string } | null
    user: { name: string } | null
    items: SaleItem[]
}

const RETURN_REASONS = ['DEFECTIVE', 'WRONG_ITEM', 'CHANGED_MIND', 'DAMAGED', 'EXPIRED', 'OTHER']
const ITEM_CONDITIONS = ['NEW', 'GOOD', 'DAMAGED', 'DEFECTIVE']
const ITEM_DISPOSITIONS = [
    { value: 'RETURN_TO_STOCK', label: 'Return to Stock' },
    { value: 'QUARANTINE', label: 'Quarantine / Inspect' },
    { value: 'DISPOSE', label: 'Dispose / Write-off' },
]

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [sale, setSale] = useState<SaleDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [processingReturn, setProcessingReturn] = useState(false)
    const [returnForm, setReturnForm] = useState({
        reason: 'WRONG_ITEM',
        notes: '',
        items: {} as Record<string, number>, // productId: quantity
        condition: 'GOOD',
        disposition: 'RETURN_TO_STOCK'
    })

    useEffect(() => {
        const fetchSale = async () => {
            try {
                const res = await fetch(`/api/sales/${id}`)
                const data = await res.json()
                if (data.success) setSale(data.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchSale()
    }, [id])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading) return (
        <DashboardLayout>
            <div className="animate-pulse space-y-10">
                <div className="h-20 bg-slate-100 rounded-2xl"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[500px] bg-slate-100 rounded-3xl"></div>
                    <div className="h-[500px] bg-slate-100 rounded-3xl"></div>
                </div>
            </div>
        </DashboardLayout>
    )

    if (!sale) return (
        <DashboardLayout>
            <div className="p-20 text-center">
                <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
                <p className="text-slate-500 mt-2">The requested transaction dossier could not be retrieved.</p>
                <Link href="/sales" className="btn-executive-accent mt-6 inline-block px-8 py-3">Return to Ledger</Link>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Audit Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link href="/sales" className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl shadow-sm transition-all text-slate-400 hover:text-executive-dark">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-executive-dark tracking-tighter">{sale.invoiceNumber}</h1>
                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${sale.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/10' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {sale.status}
                                </span>
                            </div>
                            <p className="text-slate-400 mt-1 font-bold text-[10px] uppercase tracking-[0.2em]">Executed: {new Date(sale.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const initialItems = {} as Record<string, number>
                                sale.items.forEach(item => initialItems[item.product.id || (item as any).productId] = 0)
                                setReturnForm(prev => ({ ...prev, items: initialItems }))
                                setIsReturnModalOpen(true)
                            }}
                            className="btn-executive text-xs hover:text-danger hover:border-danger/30"
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 group-hover:text-danger"><path d="M16 15L12 11M12 11L8 15M12 11V19M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2" /></svg>
                            Issue Return
                        </button>
                        <button className="btn-executive text-xs">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print Receipt
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Item Ledger */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="executive-card overflow-hidden bg-white">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Procured Items Portfolio</h3>
                                <span className="text-[10px] font-bold text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-100">{sale.items.length} LINE ITEMS</span>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-white/50">
                                    <tr className="border-b border-slate-50">
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Details</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Yield</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sale.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-bold text-executive-dark">{item.product.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{item.product.sku}</div>
                                            </td>
                                            <td className="px-8 py-6 text-center text-sm font-black text-slate-600">
                                                {item.quantity}
                                            </td>
                                            <td className="px-8 py-6 text-right text-sm font-medium text-slate-600">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-executive-dark">
                                                {formatCurrency(item.totalAmount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-10 bg-executive-dark text-white ml-auto max-w-sm rounded-tl-3xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-executive-accent/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <span>Subtotal Allocation</span>
                                        <span className="text-white font-black">{formatCurrency(sale.totalAmount - sale.taxAmount + sale.discountAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <span>Frictional Discount</span>
                                        <span className="text-danger font-black">({formatCurrency(sale.discountAmount)})</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <span>Fiscal Levy (V.A.T)</span>
                                        <span className="text-white font-black">{formatCurrency(sale.taxAmount)}</span>
                                    </div>
                                    <div className="h-[1px] bg-white/10 my-6"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-executive-accent uppercase tracking-[0.2em]">Total Settled</span>
                                        <span className="text-3xl font-black text-white">{formatCurrency(sale.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meta Sidebar */}
                    <div className="space-y-8">
                        {/* Entity Registry */}
                        <div className="executive-card p-8 bg-white">
                            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-8">Counterparty Registry</h3>
                            <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-executive-dark flex items-center justify-center text-white text-lg font-black">
                                    {sale.customer?.name.charAt(0) || 'G'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-executive-dark truncate">{sale.customer?.name || 'Authorized Guest'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Registered Client</p>
                                </div>
                            </div>
                            <div className="mt-8 space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Comm Channel</span>
                                    <span className="text-xs font-bold text-slate-600">{sale.customer?.email || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Contact</span>
                                    <span className="text-xs font-bold text-slate-600">{sale.customer?.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Execution Parameters */}
                        <div className="executive-card p-8 bg-white">
                            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-8">Operational Parameters</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Origin Node</p>
                                    <p className="text-sm font-black text-executive-dark">{sale.location?.name || 'Global HQ'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Executing Officer</p>
                                    <p className="text-sm font-black text-executive-dark">{sale.user?.name || 'System Auto'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Settlement Protocol</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-executive-accent"></div>
                                        <p className="text-sm font-black text-executive-dark uppercase italic tracking-tighter">{sale.paymentMethod}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Return Modal */}
            {isReturnModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-executive-dark">Process Item Return</h2>
                                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Sale Ref: {sale.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setIsReturnModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors shadow-sm">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                            {/* Products to Return */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Items & Quantities</h3>
                                <div className="space-y-3">
                                    {sale.items.map((item) => {
                                        const pid = (item as any).productId || (item.product as any).id || (item as any).id
                                        return (
                                            <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-executive-dark truncate">{item.product.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">SKU: {item.product.sku} · Purchased: {item.quantity}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                                                        <button
                                                            disabled={!returnForm.items[pid]}
                                                            onClick={() => setReturnForm(f => ({ ...f, items: { ...f.items, [pid]: Math.max(0, (f.items[pid] || 0) - 1) } }))}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-executive-dark rounded-lg hover:bg-slate-50 disabled:opacity-30"
                                                        >
                                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M20 12H4" /></svg>
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-black text-executive-dark">{returnForm.items[pid] || 0}</span>
                                                        <button
                                                            disabled={(returnForm.items[pid] || 0) >= item.quantity}
                                                            onClick={() => setReturnForm(f => ({ ...f, items: { ...f.items, [pid]: Math.min(item.quantity, (f.items[pid] || 0) + 1) } }))}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-executive-dark rounded-lg hover:bg-slate-50 disabled:opacity-30"
                                                        >
                                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Return Parameters */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Primary Reason</label>
                                    <select
                                        value={returnForm.reason}
                                        onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-executive-accent/5 outline-none transition-all"
                                    >
                                        {RETURN_REASONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stock Disposition</label>
                                    <select
                                        value={returnForm.disposition}
                                        onChange={e => setReturnForm(f => ({ ...f, disposition: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-executive-accent/5 outline-none transition-all"
                                    >
                                        {ITEM_DISPOSITIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Internal Notes / Audit Context</label>
                                <textarea
                                    value={returnForm.notes}
                                    onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Enter details about the item condition or customer feedback..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium h-24 focus:ring-4 focus:ring-executive-accent/5 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Refund Volume</p>
                                <p className="text-2xl font-black text-executive-dark">
                                    {formatCurrency(
                                        Object.entries(returnForm.items).reduce((acc, [pid, qty]) => {
                                            const item = sale.items.find(i => (i as any).productId === pid || (i.product as any).id === pid)
                                            return acc + (qty * (item?.unitPrice || 0))
                                        }, 0)
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsReturnModalOpen(false)}
                                    className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-executive-dark transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={processingReturn || !Object.values(returnForm.items).some(q => q > 0)}
                                    onClick={async () => {
                                        setProcessingReturn(true)
                                        try {
                                            const items = Object.entries(returnForm.items)
                                                .filter(([_, qty]) => qty > 0)
                                                .map(([pid, qty]) => ({
                                                    productId: pid,
                                                    quantity: qty,
                                                    condition: returnForm.condition,
                                                    disposition: returnForm.disposition
                                                }))

                                            const res = await fetch('/api/returns', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    saleId: sale.id,
                                                    items,
                                                    reason: returnForm.reason,
                                                    notes: returnForm.notes,
                                                    refundAmount: Object.entries(returnForm.items).reduce((acc, [pid, qty]) => {
                                                        const item = sale.items.find(i => (i as any).productId === pid || (i.product as any).id === pid)
                                                        return acc + (qty * (item?.unitPrice || 0))
                                                    }, 0)
                                                })
                                            })

                                            const data = await res.json()
                                            if (data.success) {
                                                window.location.reload()
                                            } else {
                                                alert(data.error || 'Failed to process return')
                                            }
                                        } catch (err) {
                                            console.error(err)
                                        } finally {
                                            setProcessingReturn(false)
                                        }
                                    }}
                                    className="btn-executive-accent px-10 py-3 disabled:opacity-50"
                                >
                                    {processingReturn ? 'Processing...' : 'Authorize Return'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
