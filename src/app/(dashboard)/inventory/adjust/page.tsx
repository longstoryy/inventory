'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface Location { id: string; name: string; type: string }
interface Product { id: string; name: string; sku: string; stockLevels: { locationId: string; quantity: number }[] }

export default function InventoryAdjustPage() {
    const router = useRouter()
    const [locations, setLocations] = useState<Location[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form State
    const [locationId, setLocationId] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [search, setSearch] = useState('')
    const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD')
    const [quantity, setQuantity] = useState(1)
    const [reason, setReason] = useState('Correction')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        Promise.all([
            fetch('/api/locations').then(r => r.json()),
            fetch('/api/inventory').then(r => r.json()),
        ]).then(([loc, inv]) => {
            if (loc.success) setLocations(loc.data)
            if (inv.success) setProducts(inv.data)
            setLoading(false)
        })
    }, [])

    const getCurrentStock = (p: Product | null) => {
        if (!p || !locationId) return 0
        const sl = p.stockLevels?.find(s => s.locationId === locationId)
        return sl ? Number(sl.quantity) : 0
    }

    const currentStock = getCurrentStock(selectedProduct)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct || !locationId) return
        setSaving(true)

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    productId: selectedProduct.id,
                    quantity,
                    type: adjustType,
                    reason,
                    notes
                }),
            })
            const data = await res.json()
            if (data.success) {
                alert('Inventory adjusted successfully')
                setSelectedProduct(null)
                setQuantity(1)
                setNotes('')
                // Refresh inventory
                fetch('/api/inventory').then(r => r.json()).then(res => res.success && setProducts(res.data))
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to adjust inventory')
        } finally {
            setSaving(false)
        }
    }

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-executive-dark">Stock Correction</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manually adjust inventory levels for breakage, theft, or audit corrections.</p>
                    </div>
                    <button onClick={() => router.back()} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Back</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Context Selection */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="executive-card p-6 space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Target Location</label>
                            <select
                                value={locationId}
                                onChange={e => { setLocationId(e.target.value); setSelectedProduct(null); }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-executive-accent outline-none"
                            >
                                <option value="">Select a location...</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            {!locationId && <p className="text-xs text-amber-600 font-bold">Select a location to begin.</p>}
                        </div>

                        {locationId && (
                            <div className="executive-card p-6 flex flex-col h-[500px]">
                                <h3 className="text-sm font-bold text-executive-dark mb-4 uppercase tracking-widest">Product Catalog</h3>
                                <input
                                    type="text"
                                    placeholder="Search SKU or Name..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm mb-4"
                                />
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {filteredProducts.slice(0, 20).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedProduct(p)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedProduct?.id === p.id
                                                ? 'bg-executive-dark text-white border-executive-dark'
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="font-bold text-sm truncate">{p.name}</div>
                                            <div className={`text-xs mt-0.5 ${selectedProduct?.id === p.id ? 'text-slate-400' : 'text-slate-500'}`}>{p.sku}</div>
                                            <div className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${selectedProduct?.id === p.id ? 'text-executive-accent' : 'text-slate-400'}`}>
                                                Current: {getCurrentStock(p)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Action Panel */}
                    <div className="md:col-span-2">
                        {selectedProduct ? (
                            <form onSubmit={handleSubmit} className="executive-card p-10 bg-white">
                                <div className="flex items-start justify-between mb-8 pb-8 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-2xl font-bold text-executive-dark">{selectedProduct.name}</h2>
                                        <p className="text-slate-500 font-medium mt-1">{selectedProduct.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                                        <p className="text-4xl font-black text-executive-dark">{currentStock}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Operation</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            {['ADD', 'REMOVE', 'SET'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setAdjustType(t as 'ADD' | 'REMOVE' | 'SET')}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adjustType === t
                                                        ? 'bg-white shadow text-executive-dark'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            {adjustType === 'SET' ? 'New Total Quantity' : 'Adjustment Amount'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xl font-bold text-executive-dark outline-none focus:border-executive-accent"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Reason Code</label>
                                    <select
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-executive-accent"
                                    >
                                        <option value="Correction">Inventory Count Correction</option>
                                        <option value="Damage">Damaged / Expired Stock</option>
                                        <option value="Theft">Loss / Theft</option>
                                        <option value="Return">Customer Return (Restock)</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Audit Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:border-executive-accent"
                                        placeholder="Optional details for the audit log..."
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Projected New Level</p>
                                        <p className={`text-2xl font-black ${(adjustType === 'ADD' ? currentStock + quantity : adjustType === 'REMOVE' ? currentStock - quantity : quantity) < 0
                                            ? 'text-danger'
                                            : 'text-success'
                                            }`}>
                                            {adjustType === 'ADD' ? currentStock + quantity : adjustType === 'REMOVE' ? currentStock - quantity : quantity}
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving || !quantity}
                                        className="btn-executive-primary px-10 py-4 text-base shadow-xl disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {saving ? 'Processing...' : 'Confirm Adjustment'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center executive-card p-10 bg-slate-50/50 border-dashed">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                    <svg width="32" height="32" className="text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">No Product Selected</h3>
                                <p className="text-slate-500 text-sm mt-2 max-w-xs text-center">Select a location and a product from the left to begin an adjustment transaction.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
