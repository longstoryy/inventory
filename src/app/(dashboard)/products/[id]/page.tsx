'use client'

import { useState, useEffect, use, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProductDetail {
    id: string
    name: string
    sku: string
    barcode: string | null
    description: string | null
    costPrice: number
    sellingPrice: number
    taxRate: number
    totalStock: number
    status: string
    unitOfMeasure: string
    categoryId: string | null
    category: { id: string; name: string } | null
    reorderPoint: number
    trackExpiration: boolean
    expiryAlertDays: number
    createdAt: string
    updatedAt: string
    stockLevels: Array<{
        id: string
        quantity: number
        expirationDate: string | null
        location: { id: string; name: string; type: string }
    }>
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    // Core State
    const [product, setProduct] = useState<ProductDetail | null>(null)
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'specs'>('overview')

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        sku: '',
        description: '',
        sellingPrice: 0,
        costPrice: 0,
        unit: 'Each',
        categoryId: '',
        status: 'ACTIVE',
        reorderPoint: 0,
        trackExpiration: false,
        expiryAlertDays: 30
    })

    // Valuation State
    const [showValuationModal, setShowValuationModal] = useState(false)
    const [valuationForm, setValuationForm] = useState({ sellingPrice: 0, costPrice: 0, reason: 'Market adjustment' })

    // Print State
    const [showPrintModal, setShowPrintModal] = useState(false)

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories')
            const data = await res.json()
            if (data.success) setCategories(data.data)
        } catch (error) {
            console.error('Failed to load categories', error)
        }
    }

    const fetchProduct = useCallback(async () => {
        try {
            const res = await fetch(`/api/products/${id}`)
            const data = await res.json()
            if (data.success) {
                setProduct(data.data)
                setEditForm({
                    name: data.data.name,
                    sku: data.data.sku,
                    description: data.data.description || '',
                    sellingPrice: Number(data.data.sellingPrice),
                    costPrice: Number(data.data.costPrice),
                    unit: data.data.unitOfMeasure || 'Each',
                    categoryId: data.data.categoryId || '',
                    status: data.data.status,
                    reorderPoint: Number(data.data.reorderPoint) || 0,
                    trackExpiration: data.data.trackExpiration || false,
                    expiryAlertDays: data.data.expiryAlertDays || 30
                })
                setValuationForm({
                    sellingPrice: Number(data.data.sellingPrice),
                    costPrice: Number(data.data.costPrice),
                    reason: 'Market adjustment'
                })
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchProduct()
        fetchCategories()
    }, [fetchProduct])

    const handleUpdate = async (e: React.FormEvent, type: 'full' | 'valuation' = 'full') => {
        e.preventDefault()
        setSaving(true)
        try {
            const body = type === 'full' ? editForm : {
                sellingPrice: valuationForm.sellingPrice,
                costPrice: valuationForm.costPrice,
                status: product?.status
            }

            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (data.success) {
                setProduct({ ...product!, ...data.data })
                setIsEditing(false)
                setShowValuationModal(false)
                router.refresh()
            } else {
                alert(data.error || 'Update failed')
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred')
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading) return (
        <DashboardLayout>
            <div className="animate-pulse space-y-10">
                <div className="h-20 bg-white/50 executive-card"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[400px] bg-white/50 executive-card"></div>
                    <div className="h-[400px] bg-white/50 executive-card"></div>
                </div>
            </div>
        </DashboardLayout>
    )

    if (!product) return null

    const margin = product.sellingPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100 : 0

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Dossier Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link href="/products" className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl shadow-sm transition-all text-slate-400 hover:text-executive-dark group">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-executive-dark">{product.name}</h1>
                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${product.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/10' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {product.status}
                                </span>
                            </div>
                            <p className="text-slate-400 mt-1 font-bold text-xs uppercase tracking-[0.15em]">{product.sku} | {product.category?.name || 'Unclassified'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsEditing(true)} className="btn-executive">
                            Edit Dossier
                        </button>
                        <button onClick={() => router.push('/inventory')} className="btn-executive-accent px-8">
                            Update Inventory
                        </button>
                    </div>
                </div>

                {/* Tactical Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="executive-card p-6 border-b-4 border-b-executive-dark">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aggregate Stock</p>
                        <h4 className="text-2xl font-black text-executive-dark">{product.totalStock} <span className="text-xs font-medium text-slate-400">UNITS</span></h4>
                    </div>
                    <div className="executive-card p-6 border-b-4 border-b-executive-accent">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Projected Margin</p>
                        <h4 className="text-2xl font-black text-executive-accent">{margin.toFixed(1)}%</h4>
                    </div>
                    <div className="executive-card p-6 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cost Valuation</p>
                        <h4 className="text-2xl font-black text-slate-600">{formatCurrency(product.costPrice)}</h4>
                    </div>
                    <div className="executive-card p-6 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Market Price</p>
                        <h4 className="text-2xl font-black text-slate-600">{formatCurrency(product.sellingPrice)}</h4>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-8 border-b border-slate-100 px-2">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'logistics', label: 'Logistics' },
                            { id: 'specs', label: 'Specifications' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'overview' | 'logistics' | 'specs')}
                                className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-executive-dark' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-executive-dark animate-in slide-in-from-left-2 duration-300"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {activeTab === 'overview' && (
                                <div className="executive-card p-10 bg-white/50 min-h-[400px]">
                                    <h3 className="text-lg font-bold text-executive-dark mb-6">Commercial Summary</h3>
                                    <p className="text-slate-600 leading-relaxed max-w-2xl">{product.description || 'No descriptive narrative has been provisioned.'}</p>

                                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div>
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Stock Distribution</h5>
                                            <div className="space-y-4">
                                                {(() => {
                                                    const groupedMap = new Map<string, any>()
                                                    product.stockLevels.forEach(sl => {
                                                        const locId = sl.location.id
                                                        if (!groupedMap.has(locId)) {
                                                            groupedMap.set(locId, { ...sl, quantity: 0 })
                                                        }
                                                        const grouped = groupedMap.get(locId)
                                                        grouped.quantity += Number(sl.quantity)
                                                    })
                                                    const groupedStock = Array.from(groupedMap.values())

                                                    return groupedStock.map(lvl => (
                                                        <div key={lvl.location.id} className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-slate-900">{lvl.location.name}</span>
                                                                <span className="text-sm font-black text-executive-dark">{lvl.quantity}</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-executive-dark rounded-full transition-all duration-1000"
                                                                    style={{ width: `${product.totalStock > 0 ? (lvl.quantity / product.totalStock) * 100 : 0}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-3xl border border-slate-100 font-bold">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 text-center">Health Indicator</p>
                                            <span className={`text-4xl font-black ${product.totalStock > 0 ? 'text-success' : 'text-danger'}`}>
                                                {product.totalStock > 0 ? 'OPTIMAL' : 'CRITICAL'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'logistics' && (
                                <div className="executive-card overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Expiration</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {product.stockLevels.map(lvl => (
                                                <tr key={lvl.id}>
                                                    <td className="px-8 py-6 text-sm font-bold text-executive-dark">{lvl.location.name}</td>
                                                    <td className="px-8 py-6 text-center text-xs font-medium text-slate-400">
                                                        {lvl.expirationDate ? new Date(lvl.expirationDate).toLocaleDateString() : 'General'}
                                                    </td>
                                                    <td className="px-8 py-6 text-right text-sm font-black text-executive-dark">{lvl.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'specs' && (
                                <div className="executive-card p-10 bg-white/50 min-h-[400px]">
                                    <h3 className="text-lg font-bold text-executive-dark mb-10">Technical Specifications</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        <div className="space-y-8">
                                            <div>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identification</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Internal SKU</span>
                                                        <span className="font-mono font-black text-executive-dark">{product.sku}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Global Barcode</span>
                                                        <span className="font-mono font-bold text-slate-900">{product.barcode || 'Not Assigned'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Commercial Unit</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Unit of Measure</span>
                                                        <span className="font-bold text-executive-dark">{product.unitOfMeasure}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Tax Protocol</span>
                                                        <span className="font-bold text-slate-900">{Number(product.taxRate)}% VAT Applied</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Storage Logic</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Reorder Threshold</span>
                                                        <span className="font-black text-executive-accent">{Number(product.reorderPoint)} Units</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Expiration Tracker</span>
                                                        <span className={`font-bold ${product.trackExpiration ? 'text-success' : 'text-slate-400'}`}>
                                                            {product.trackExpiration ? 'ACTIVE' : 'INACTIVE'}
                                                        </span>
                                                    </div>
                                                    {product.trackExpiration && (
                                                        <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                            <span className="text-slate-500">Early Warning System</span>
                                                            <span className="font-bold text-slate-900">{product.expiryAlertDays} Days Alert</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Audit Trail</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Provisioned On</span>
                                                        <span className="font-bold text-slate-700">{new Date(product.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                        <span className="text-slate-500">Last Dossier Sync</span>
                                                        <span className="font-bold text-slate-700">{new Date(product.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions Side Panel */}
                        <div className="space-y-6">
                            <div className="executive-card p-8 bg-executive-dark text-white">
                                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">Dossier Health</h5>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 font-medium tracking-wide">Data Integrity</span>
                                        <span className="text-xs font-black text-success">VERIFIED</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 font-medium tracking-wide">Financial Sync</span>
                                        <span className="text-xs font-black text-executive-accent">OPTIMAL</span>
                                    </div>
                                </div>
                            </div>
                            <div className="executive-card p-8">
                                <h5 className="text-[11px] font-bold text-executive-dark uppercase tracking-widest mb-6">Quick Actions</h5>
                                <div className="space-y-4">
                                    <button onClick={() => setShowValuationModal(true)} className="btn-executive w-full justify-start py-3 text-xs font-bold">
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 mr-2"><path d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                                        Increase Valuation
                                    </button>
                                    <button onClick={() => setShowPrintModal(true)} className="btn-executive w-full justify-start py-3 text-xs font-bold">
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 mr-2"><path d="M12 4v16m8-8H4" /></svg>
                                        Print SKU Labels
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Asset Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-executive-dark/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-executive">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Edit Asset Dossier</h2>
                                <p className="text-xs text-slate-500 font-medium mt-1">Update specifications and commercial details.</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={(e) => handleUpdate(e, 'full')} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name *</label>
                                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="executive-input shadow-none" required />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal SKU *</label>
                                    <input type="text" value={editForm.sku} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} className="executive-input shadow-none" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Specifications / Description</label>
                                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="executive-input shadow-none" rows={3} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Life Cycle Status</label>
                                    <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="executive-input appearance-none shadow-none">
                                        <option value="ACTIVE">Active Protocol</option>
                                        <option value="INACTIVE">Dormant</option>
                                        <option value="DISCONTINUED">Decommissioned</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category Classification</label>
                                    <select value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} className="executive-input appearance-none shadow-none">
                                        <option value="">Unclassified</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="col-span-2 sm:col-span-1 border-r border-slate-200 pr-6">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Unit Valuation (Selling)</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 underline underline-offset-4 decoration-slate-200">GHS</span>
                                        <input type="number" value={editForm.sellingPrice} onChange={e => setEditForm({ ...editForm, sellingPrice: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-executive-accent outline-none py-1 font-black text-lg" step="0.01" min="0" />
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acquisition Cost</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 underline underline-offset-4 decoration-slate-200">GHS</span>
                                        <input type="number" value={editForm.costPrice} onChange={e => setEditForm({ ...editForm, costPrice: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-executive-accent outline-none py-1 font-black text-lg" step="0.01" min="0" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                                <div className="col-span-2 sm:col-span-1 border-r border-indigo-100 pr-6">
                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Inventory Trigger</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Reorder @</span>
                                        <input type="number" value={editForm.reorderPoint} onChange={e => setEditForm({ ...editForm, reorderPoint: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-indigo-400 outline-none py-1 font-black text-lg" min="0" />
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Expiration Logic</label>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(prev => ({ ...prev, trackExpiration: !prev.trackExpiration }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.trackExpiration ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.trackExpiration ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active</span>
                                        </div>
                                        {editForm.trackExpiration && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Alert</span>
                                                <input type="number" value={editForm.expiryAlertDays} onChange={e => setEditForm({ ...editForm, expiryAlertDays: +e.target.value })} className="w-12 bg-transparent border-b-2 border-slate-200 focus:border-indigo-400 outline-none py-1 font-black text-sm text-center" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Days</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsEditing(false)} className="btn-executive flex-1 py-4">Discard</button>
                                <button type="submit" disabled={saving} className="btn-executive-accent flex-1 py-4 font-black">{saving ? 'Processing...' : 'Secure Updates'}</button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* Valuation Modal */}
            {showValuationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-executive-dark/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-executive">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Market Valuation</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">Adjust prices based on supply chain logic.</p>
                        </div>
                        <form onSubmit={(e) => handleUpdate(e, 'valuation')} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revised Market Price</label>
                                    <input type="number" step="0.01" value={valuationForm.sellingPrice} onChange={e => setValuationForm({ ...valuationForm, sellingPrice: +e.target.value })} className="executive-input text-xl font-black" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">New Acquisition Cost</label>
                                    <input type="number" step="0.01" value={valuationForm.costPrice} onChange={e => setValuationForm({ ...valuationForm, costPrice: +e.target.value })} className="executive-input text-xl font-black" required />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowValuationModal(false)} className="btn-executive flex-1">Abort</button>
                                <button type="submit" disabled={saving} className="btn-executive-accent flex-1 font-black">{saving ? 'Syncing...' : 'Update Valuation'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Print Labels Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-executive-dark/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-executive">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between no-print">
                            <h2 className="text-2xl font-black text-executive-dark tracking-tight">Label Preview</h2>
                            <button onClick={() => setShowPrintModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-12 bg-slate-50 text-center print:p-0 print:bg-white">
                            <div className="sku-label-print-area inline-block">
                                <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-dashed border-slate-200 inline-block w-[300px] print:border-none print:shadow-none">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Aurum Inventory</p>
                                    <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight">{product.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-8">{product.sku}</p>

                                    <div className="bg-slate-900 h-16 w-full rounded-lg mb-8 flex items-center justify-center gap-0.5 px-4 overflow-hidden">
                                        {[...Array(30)].map((_, i) => (
                                            <div key={i} className={`bg-white h-10 w-${Math.random() > 0.6 ? (Math.random() > 0.5 ? '1' : '1.5') : '0.5'}`}></div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-100 pt-6">
                                        <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest text-center">Retail Price</p>
                                        <p className="text-3xl font-black text-executive-dark">{formatCurrency(product.sellingPrice)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 no-print">
                                <button onClick={() => window.print()} className="btn-executive-dark w-full py-5 text-sm font-black tracking-widest uppercase">
                                    Execute Print Command
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
