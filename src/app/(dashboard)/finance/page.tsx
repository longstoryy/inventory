
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'

interface CashDrawer {
    id: string
    name: string
    status: 'OPEN' | 'CLOSED' | 'PAUSED'
    currentBalance: number
    location: { name: string }
    openedBy?: { name: string }
    openedAt?: string
    expectedBalance?: number
    actualBalance?: number
    discrepancy?: number
    closedAt?: string
    notes?: string
    digitalSales?: { method: string, amount: number }[]
}

interface CashTransaction {
    id: string
    type: string
    amount: number
    balanceAfter: number
    description: string
    createdAt: string
    performedBy: { name: string }
}

export default function FinancialCommandCenter() {
    const [drawers, setDrawers] = useState<CashDrawer[]>([])
    const [loading, setLoading] = useState(true)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [actionDrawer, setActionDrawer] = useState<CashDrawer | null>(null) // For modals
    const [modalMode, setModalMode] = useState<'OPEN' | 'CLOSE' | 'CREATE' | 'TRANSACTIONS' | 'SUMMARY' | null>(null)
    const [transactions, setTransactions] = useState<CashTransaction[]>([])
    const [lastSummary, setLastSummary] = useState<CashDrawer | null>(null)
    const [amountInput, setAmountInput] = useState('')
    const [noteInput, setNoteInput] = useState('')
    const [newDrawerName, setNewDrawerName] = useState('')
    const [newDrawerLocationId, setNewDrawerLocationId] = useState('')
    const [isConfirmed, setIsConfirmed] = useState(false)

    const fetchDrawers = async () => {
        try {
            const res = await fetch('/api/finance/drawers')
            const data = await res.json()
            if (data.success) {
                setDrawers(data.data)
            }
        } catch (error) {
            console.error('Failed to load financial data', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await fetchDrawers()
            // Fetch locations for create modal
            try {
                const res = await fetch('/api/locations')
                const data = await res.json()
                if (data.success) setLocations(data.data)
            } catch (e) {
                console.error('Failed to load locations', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleCreateDrawer = async () => {
        if (!newDrawerName || !newDrawerLocationId) return alert('Please fill in all fields')

        try {
            const res = await fetch('/api/finance/drawers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDrawerName, locationId: newDrawerLocationId })
            })
            const result = await res.json()

            if (result.success) {
                fetchDrawers()
                setModalMode(null)
                setNewDrawerName('')
                setNewDrawerLocationId('')
            } else {
                alert(result.error || 'Failed to create drawer')
            }
        } catch (e) {
            alert('Network error')
        }
    }

    const handleSessionAction = async () => {
        if (!actionDrawer || !modalMode) return

        const endpoint = `/api/finance/drawers/${actionDrawer.id}/session`
        const method = modalMode === 'OPEN' ? 'POST' : 'PUT'
        const payload = modalMode === 'OPEN'
            ? { startingFloat: Number(amountInput), notes: noteInput }
            : { actualBalance: Number(amountInput), notes: noteInput }

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const result = await res.json()

            if (result.success) {
                // Refresh and close
                fetchDrawers()
                if (modalMode === 'CLOSE') {
                    // Show Summary Report
                    setLastSummary(result.data)
                    setModalMode('SUMMARY')
                } else {
                    setModalMode(null)
                    setActionDrawer(null)
                }
                setAmountInput('')
                setNoteInput('')
                setIsConfirmed(false)
            } else {
                alert(result.error || 'Operation failed')
            }
        } catch (e) {
            alert('Network error')
        }
    }


    const handleViewTransactions = async (drawer: CashDrawer) => {
        setActionDrawer(drawer)
        setTransactions([]) // Clear previous
        setModalMode('TRANSACTIONS')

        try {
            const res = await fetch(`/api/finance/drawers/${drawer.id}/transactions`)
            const data = await res.json()
            if (data.success) {
                setTransactions(data.data)
            }
        } catch (e) {
            console.error('Failed to load transactions')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount)
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Financial Command</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Cash Management & Ledger Integrity Protocols.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/sales/new"
                            className="btn-executive text-xs"
                        >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Access POS
                        </Link>
                        <button
                            onClick={() => setModalMode('CREATE')}
                            className="btn-executive-dark text-xs px-8 shadow-2xl shadow-executive-dark/10"
                        >
                            + New Protocol
                        </button>
                    </div>
                </div>

                {/* Drawers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
                        ))
                    ) : drawers.length === 0 ? (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-slate-400 font-bold text-sm">No Cash Registers Configured</p>
                            <button
                                onClick={() => setModalMode('CREATE')}
                                className="mt-4 text-executive-accent font-black text-xs uppercase tracking-widest hover:underline"
                            >
                                + Initialize Register
                            </button>
                        </div>
                    ) : (
                        drawers.map(drawer => (
                            <div key={drawer.id} className="executive-card p-6 relative group overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${drawer.status === 'OPEN'
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${drawer.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                            {drawer.status}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mt-3">{drawer.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{drawer.location.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Balance</p>
                                        <p className="text-xl font-black text-slate-900 mt-1">
                                            {drawer.status === 'OPEN' ? formatCurrency(Number(drawer.currentBalance)) : '—'}
                                        </p>
                                    </div>
                                </div>

                                {drawer.status === 'OPEN' && (
                                    <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="font-medium">Opened by {drawer.openedBy?.name}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-slate-100 pt-4 mt-auto">
                                    {drawer.status === 'CLOSED' ? (
                                        <button
                                            onClick={() => { setActionDrawer(drawer); setModalMode('OPEN'); }}
                                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                        >
                                            Start Shift
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleViewTransactions(drawer)}
                                                className="py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
                                            >
                                                Transactions
                                            </button>
                                            <button
                                                onClick={() => { setActionDrawer(drawer); setModalMode('CLOSE'); }}
                                                className="py-3 bg-white text-danger border border-danger/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-danger/5 transition-all"
                                            >
                                                End Shift
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Action Modal (Open/Close/Create/Transactions/Summary) */}
                <Modal
                    isOpen={!!modalMode && (!!actionDrawer || modalMode === 'CREATE' || modalMode === 'SUMMARY')}
                    onClose={() => setModalMode(null)}
                    title={
                        modalMode === 'OPEN' ? 'Initialize Register' :
                            modalMode === 'CLOSE' ? 'End Shift & Count' :
                                modalMode === 'TRANSACTIONS' ? 'Ledger History' :
                                    modalMode === 'SUMMARY' ? 'Shift Report' :
                                        'New Cash Drawer'
                    }
                    maxWidth={modalMode === 'TRANSACTIONS' ? '2xl' : 'md'}
                >
                    <div className="space-y-6">
                                {modalMode === 'TRANSACTIONS' ? (
                                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                                        {transactions.length === 0 ? (
                                            <p className="text-center text-slate-400 text-sm py-8">No transactions found for this session.</p>
                                        ) : (
                                            transactions.map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${Number(tx.amount) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                }`}>{tx.type.replace(/_/g, ' ')}</span>
                                                            <span className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-700">{tx.description}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">By: {tx.performedBy.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold block ${Number(tx.amount) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">Bal: {formatCurrency(Number(tx.balanceAfter))}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : modalMode === 'SUMMARY' && lastSummary ? (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <p className="text-slate-500 font-medium text-sm">Shift Closed Successfully</p>
                                            <h2 className="text-2xl font-black text-slate-900 mt-1">{new Date().toLocaleDateString()}</h2>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">System Expected</span>
                                                <span className="font-bold text-slate-900">{formatCurrency(Number(lastSummary.expectedBalance))}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Actual Count</span>
                                                <span className="font-bold text-slate-900 border-b-2 border-slate-200">{formatCurrency(Number(lastSummary.actualBalance))}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Discrepancy</span>
                                                <span className={`text-lg font-black ${Number(lastSummary.discrepancy) === 0 ? 'text-emerald-500' :
                                                    Number(lastSummary.discrepancy) > 0 ? 'text-emerald-600' : 'text-red-500'
                                                    }`}>
                                                    {Number(lastSummary.discrepancy) > 0 ? '+' : ''}{formatCurrency(Number(lastSummary.discrepancy))}
                                                </span>
                                            </div>
                                        </div>

                                        {Number(lastSummary.discrepancy) !== 0 && (
                                            <div className={`p-3 rounded-xl text-xs font-bold ${Number(lastSummary.discrepancy) < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {Number(lastSummary.discrepancy) < 0
                                                    ? '⚠️ Shortage Detected. This has been logged for audit.'
                                                    : 'ℹ️ Surplus Detected. Please verify transaction logs.'}
                                            </div>
                                        )}

                                        {lastSummary.digitalSales && lastSummary.digitalSales.length > 0 && (
                                            <div className="pt-2 border-t border-slate-100">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Non-Cash Settlements</p>
                                                {lastSummary.digitalSales.map((d: any) => (
                                                    <div key={d.method} className="flex justify-between items-center text-xs mb-1">
                                                        <span className="font-bold text-slate-600">{d.method}</span>
                                                        <span className="font-medium text-slate-900">{formatCurrency(Number(d.amount))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : modalMode === 'CREATE' ? (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Drawer Name</label>
                                            <input
                                                type="text"
                                                value={newDrawerName}
                                                onChange={(e) => setNewDrawerName(e.target.value)}
                                                className="w-full px-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all"
                                                placeholder="e.g. Main Till, Petty Cash Box"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Assigned Location</label>
                                            <select
                                                value={newDrawerLocationId}
                                                onChange={(e) => setNewDrawerLocationId(e.target.value)}
                                                className="w-full px-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all"
                                            >
                                                <option value="">Select Location...</option>
                                                {locations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                {modalMode === 'OPEN' ? 'Starting Float (GHS)' : 'Closing Count (GHS)'}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₵</span>
                                                <input
                                                    type="number"
                                                    value={amountInput}
                                                    onChange={(e) => setAmountInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-4 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all"
                                                    placeholder="0.00"
                                                    autoFocus
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400">
                                                {modalMode === 'OPEN'
                                                    ? 'Enter the physical cash amount currently in the drawer.'
                                                    : 'Count precisely. Any discrepancy will be logged directly to the audit trail.'
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                                            <textarea
                                                value={noteInput}
                                                onChange={(e) => setNoteInput(e.target.value)}
                                                className="w-full px-4 py-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all resize-none h-24"
                                                placeholder="Any observations..."
                                            />
                                        </div>

                                        {modalMode === 'CLOSE' && (
                                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="confirm-close"
                                                        checked={isConfirmed}
                                                        onChange={(e) => setIsConfirmed(e.target.checked)}
                                                        className="mt-1 w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                    <label htmlFor="confirm-close" className="text-xs font-bold text-orange-800 leading-tight">
                                                        I have counted the physical cash twice and verify this amount is correct.
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-orange-600 font-medium">
                                                    * Once closed, this shift cannot be edited. Discrepancies will be logged.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 -mx-6 -mb-6 mt-6">
                        <button onClick={() => setModalMode(null)} className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors">
                            {modalMode === 'TRANSACTIONS' || modalMode === 'SUMMARY' ? 'Close' : 'Cancel'}
                        </button>
                        {modalMode !== 'TRANSACTIONS' && modalMode !== 'SUMMARY' && (
                            <button
                                onClick={modalMode === 'CREATE' ? handleCreateDrawer : handleSessionAction}
                                disabled={modalMode === 'CLOSE' && !isConfirmed}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold text-white uppercase tracking-widest shadow-lg active:scale-95 transition-all ${modalMode === 'CLOSE'
                                    ? (isConfirmed ? 'bg-danger hover:bg-red-600 shadow-red-500/20' : 'bg-slate-300 cursor-not-allowed')
                                    : 'bg-executive-dark hover:bg-slate-800'
                                    }`}
                            >
                                {modalMode === 'OPEN' ? 'Open Register' : modalMode === 'CLOSE' ? 'Close Register' : 'Create Drawer'}
                            </button>
                        )}
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    )
}
