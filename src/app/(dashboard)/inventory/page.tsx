'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import BottomSheet from '@/components/ui/bottom-sheet'
import PaginationControls from '@/components/ui/pagination-controls'

interface StockLevel {
    id: string
    quantity: number
    expirationDate: string | null
    location: { id: string; name: string; type: string }
}

interface InventoryItem {
    id: string
    name: string
    sku: string
    barcode: string | null
    costPrice: number
    sellingPrice: number
    reorderPoint: number
    trackExpiration: boolean
    categoryName: string | null
    stockLevels: StockLevel[]
    totalStock: number
    isLowStock: boolean
    expiringCount: number
}

interface Location {
    id: string
    name: string
    type: string
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLocation, setSelectedLocation] = useState<string>('')
    const [showLowStock, setShowLowStock] = useState(false)
    const [showExpiring, setShowExpiring] = useState(false)
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null)
    const [adjusting, setAdjusting] = useState(false)
    const [showExpiration, setShowExpiration] = useState(false)
    const [adjustForm, setAdjustForm] = useState({
        locationId: '',
        quantity: 0,
        type: 'SET' as 'SET' | 'ADD' | 'REMOVE',
        reason: '',
        expirationDate: '',
    })

    useEffect(() => {
        fetchLocations()
    }, [])

    useEffect(() => {
        fetchInventory(pagination.page)
    }, [selectedLocation, showLowStock, showExpiring, pagination.page])

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            if (data.success) setLocations(data.data)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchInventory = async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())
            if (selectedLocation) params.append('locationId', selectedLocation)
            if (showLowStock) params.append('lowStock', 'true')
            if (showExpiring) params.append('expiringSoon', 'true')

            const res = await fetch(`/api/inventory?${params}`)
            const data = await res.json()
            if (data.success) {
                setInventory(data.data)
                if (data.pagination) setPagination(prev => ({ ...prev, ...data.pagination }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const openAdjustModal = (product: InventoryItem) => {
        setSelectedProduct(product)
        setShowExpiration(product.trackExpiration)
        setAdjustForm({
            locationId: selectedLocation || locations[0]?.id || '',
            quantity: 0,
            type: 'SET',
            reason: '',
            expirationDate: '',
        })
        setShowAdjustModal(true)
    }

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct) return
        setAdjusting(true)
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    locationId: adjustForm.locationId,
                    quantity: adjustForm.quantity,
                    type: adjustForm.type,
                    reason: adjustForm.reason,
                    expirationDate: adjustForm.expirationDate || null,
                }),
            })
            const data = await res.json()
            if (data.success) {
                fetchInventory(pagination.page)
                setShowAdjustModal(false)
            } else {
                alert(data.error || 'Failed to adjust stock')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to adjust stock')
        } finally {
            setAdjusting(false)
        }
    }

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const totalValue = inventory.reduce((sum, item) => sum + item.totalStock * Number(item.costPrice), 0)

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-24 lg:pb-0 pt-2 relative">

                {/* Sticky Header */}
                <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:top-0 border-b border-slate-100 sm:border-none flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-display font-black text-executive-dark tracking-tighter">Stock</h1>
                    <div className="flex gap-2">
                        <Link href="/products?action=new" className="bg-executive-dark text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                        </Link>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                    <button
                        onClick={() => { setShowLowStock(false); setShowExpiring(false); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${!showLowStock && !showExpiring ? 'bg-executive-dark text-white border-executive-dark' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                        All Items
                    </button>
                    <button 
                        onClick={() => { setShowLowStock(!showLowStock); setShowExpiring(false); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${showLowStock ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                        Low Stock
                    </button>
                    <button
                        onClick={() => { setShowExpiring(!showExpiring); setShowLowStock(false); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${showExpiring ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                        Expiring
                    </button>
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-full px-4 py-2 outline-none"
                    >
                        <option value="">All Locations</option>
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Valuation</p>
                        <p className="font-display font-bold text-lg text-slate-900">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items Listed</p>
                        <p className="font-display font-bold text-lg text-slate-900">{pagination.total}</p>
                    </div>
                </div>

                {/* Inventory List (Cards) */}
                <div className="space-y-3">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div>
                        ))
                    ) : inventory.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                <p className="font-bold text-slate-900">No items found</p>
                            </div>
                        ) : (
                            inventory.map((item) => {
                                    // Logic: If filtering by location, show that location's stock.
                                    // If global, show total stock but indicate if it's split across multiple.
                                    const displayStock = selectedLocation
                                        ? (item.stockLevels.find(sl => sl.location.id === selectedLocation)?.quantity || 0)
                                        : item.totalStock

                                    const locationCount = item.stockLevels.filter(sl => sl.quantity > 0).length
                                    const isMultiLocation = !selectedLocation && locationCount > 1

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openAdjustModal(item)}
                                            className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-slate-300 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${displayStock === 0 ? 'bg-red-100 text-red-600' :
                                                    item.isLowStock ? 'bg-amber-100 text-amber-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 leading-tight mb-1">{item.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                            {item.sku}
                                                        </p>
                                                        {isMultiLocation && (
                                                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                                                                {locationCount} LOCS
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-display font-bold text-xl ${displayStock === 0 ? 'text-red-500' :
                                                    item.isLowStock ? 'text-amber-500' :
                                                        'text-slate-900'
                                                    }`}>
                                                    {displayStock}
                                                </p>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                    {selectedLocation ? 'Loc Stock' : 'Total'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                    )}
                </div>

                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                    totalItems={pagination.total}
                />
            </div>

            {/* Adjust Modal (BottomSheet) */}
            <BottomSheet
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title={selectedProduct?.name || 'Adjust Stock'}
            >
                <div className="pb-4">
                    <p className="text-xs text-slate-500 mb-6">Update inventory levels manually. Use "Audit Reason" for compliance.</p>

                    <form onSubmit={handleAdjust} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Facility Allocation</label>
                            <select
                                required
                                value={adjustForm.locationId}
                                onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })}
                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-executive-dark/10 outline-none font-medium text-sm text-slate-900 appearance-none"
                            >
                                <option value="">Select location...</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                            {adjustForm.locationId && selectedProduct && (
                                <p className="text-[10px] bg-slate-100 inline-block px-2 py-1 rounded-md mt-2 font-medium text-slate-600">
                                    Current at Loc: {selectedProduct.stockLevels.find(sl => sl.location.id === adjustForm.locationId)?.quantity || 0}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Action Type</label>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, type: 'ADD' })}
                                        className={`h-10 rounded-xl text-xs font-bold border transition-colors ${adjustForm.type === 'ADD' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        Add (+)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, type: 'REMOVE' })}
                                        className={`h-10 rounded-xl text-xs font-bold border transition-colors ${adjustForm.type === 'REMOVE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        Remove (-)
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={adjustForm.quantity}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                                    className="w-full h-[88px] px-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-executive-dark/10 outline-none font-display font-black text-4xl text-center text-slate-900 placeholder:text-slate-300"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Reason</label>
                            <input
                                type="text"
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-executive-dark/10 outline-none font-medium text-sm text-slate-900"
                                placeholder="e.g. Broken stock, Gift, Audit..."
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={adjusting}
                            className="w-full h-14 bg-executive-dark text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-98 transition-transform disabled:opacity-50 mt-4"
                        >
                            {adjusting ? 'Processing...' : 'Confirm Adjustment'}
                        </button>
                    </form>
                </div>
            </BottomSheet>
        </DashboardLayout>
    )
}
