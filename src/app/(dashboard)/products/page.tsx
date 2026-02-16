'use client'



import { useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import Link from 'next/link'

import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'

import { useDebounce } from '@/hooks/use-debounce'

import PaginationControls from '@/components/ui/pagination-controls'



interface Product {

    id: string

    name: string

    sku: string

    category: { name: string } | null

    sellingPrice: number

    costPrice: number

    totalStock: number

    status: string

}



interface Category {

    id: string

    name: string

}



export default function ProductsPage() {

    const router = useRouter()



    // Data State

    const [products, setProducts] = useState<Product[]>([])

    const [categories, setCategories] = useState<Category[]>([])

    const [loading, setLoading] = useState(true)

    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })



    // Filter State

    const [search, setSearch] = useState('')

    const debouncedSearch = useDebounce(search, 500)

    const [selectedCategory, setSelectedCategory] = useState('')

    const [selectedStatus, setSelectedStatus] = useState('')



    // Modal State

    const [showModal, setShowModal] = useState(false)

    const [saving, setSaving] = useState(false)

    const initialForm = {

        name: '',

        sku: '',

        description: '',

        sellingPrice: 0,

        costPrice: 0,

        unit: 'Each',

        categoryId: '',

        reorderPoint: 0,

        trackExpiration: false,

        expiryAlertDays: 30

    }

    const [form, setForm] = useState(initialForm)



    // Initial Load

    useEffect(() => {

        fetchCategories()

    }, [])



    // Fetch Products on Deps Change

    useEffect(() => {

        fetchProducts(pagination.page)

    }, [debouncedSearch, selectedCategory, selectedStatus, pagination.page])



    const fetchCategories = async () => {

        try {

            const res = await fetch('/api/categories')

            const data = await res.json()

            if (data.success) setCategories(data.data)

        } catch (error) {

            console.error('Failed to fetch categories:', error)

        }

    }



    const fetchProducts = async (page = 1) => {

        setLoading(true)

        try {

            const params = new URLSearchParams()

            params.append('page', page.toString())

            params.append('limit', pagination.limit.toString())

            if (debouncedSearch) params.append('q', debouncedSearch)

            if (selectedCategory) params.append('categoryId', selectedCategory)

            if (selectedStatus) params.append('status', selectedStatus)



            const res = await fetch(`/api/products?${params.toString()}`)

            const data = await res.json()

            if (data.success) {

                setProducts(data.data)

                if (data.pagination) {

                    setPagination(prev => ({ ...prev, ...data.pagination }))

                }

            }

        } catch (err) {

            console.error(err)

        } finally {

            setLoading(false)

        }

    }



    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault()

        if (!form.name.trim() || !form.sku.trim()) return alert('Name and SKU are required')

        setSaving(true)

        try {

            const res = await fetch('/api/products', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify(form),

            })

            const data = await res.json()

            if (data.success) {

                fetchProducts()

                setShowModal(false)

                setForm(initialForm)

            } else {

                alert(data.message || data.error || 'Failed to create product')

            }

        } catch { alert('Failed to create product') }

        finally { setSaving(false) }

    }



    const handleDelete = async (id: string) => {

        if (!confirm('Archive this asset? This action will set status to Discontinued.')) return

        try {

            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })

            const data = await res.json()

            if (data.success) fetchProducts()

            else alert(data.error || 'Failed to archive')

        } catch { alert('Failed to archive') }

    }



    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)



    const getStatusStyle = (status: string) => {

        switch (status) {

            case 'ACTIVE': return 'bg-success/10 text-success'

            case 'DISCONTINUED': return 'bg-danger/10 text-danger'

            case 'INACTIVE': return 'bg-slate-100 text-slate-500'

            default: return 'bg-slate-100 text-slate-600'

        }

    }



    return (

        <DashboardLayout>

            <div className="space-y-8">

                {/* Header */}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                    <div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Asset Catalog</h1>

                        <p className="text-slate-500 mt-2 text-sm font-medium">Master registry of institutional assets and real-time valuations.</p>

                    </div>

                    <button onClick={() => setShowModal(true)} className="btn-executive-dark px-10 text-xs shadow-2xl shadow-executive-dark/10">

                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>

                        Initialize Asset

                    </button>

                </div>



                {/* Filters Toolbar */}

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row gap-6 items-center">

                    <div className="relative flex-1 w-full">

                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">

                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                        </svg>

                        <input

                            type="text"

                            className="w-full pl-16 pr-8 py-4 bg-white rounded-2xl text-sm font-black text-executive-dark outline-none focus:ring-2 focus:ring-executive-accent/20 transition-all border border-slate-200 placeholder:text-slate-300 shadow-sm"

                            placeholder="Universal Asset Search..."

                            value={search}

                            onChange={(e) => setSearch(e.target.value)}

                        />

                    </div>

                    <div className="flex gap-4 w-full md:w-auto">

                        <select

                            className="executive-input min-w-[180px]"

                            value={selectedCategory}

                            onChange={(e) => setSelectedCategory(e.target.value)}

                        >

                            <option value="">Classification...</option>

                            {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}

                        </select>

                        <select

                            className="executive-input min-w-[180px]"

                            value={selectedStatus}

                            onChange={(e) => setSelectedStatus(e.target.value)}

                        >

                            <option value="">Protocol Status...</option>

                            <option value="ACTIVE">Active Protocol</option>

                            <option value="INACTIVE">Dormant Node</option>

                            <option value="DISCONTINUED">Decommissioned</option>

                        </select>

                    </div>

                </div>



                {/* Data Table */}

                <div className="executive-card overflow-hidden bg-white">

                    <div className="p-10 border-b border-slate-100 bg-slate-50/50">

                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Asset Registry</h2>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full text-left">

                            <thead>

                                <tr className="bg-white border-b border-slate-100">

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset Identification</th>

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classification</th>

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Market Valuation</th>

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Operational Stock</th>

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Status</th>

                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Operations</th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-50">

                                {loading ? (

                                    [...Array(8)].map((_, i) => (

                                        <tr key={i} className="animate-pulse">

                                            <td className="px-8 py-6">

                                                <div className="flex items-center gap-4">

                                                    <div className="w-11 h-11 bg-slate-100 rounded-xl"></div>

                                                    <div className="space-y-2">

                                                        <div className="h-4 bg-slate-100 rounded w-32"></div>

                                                        <div className="h-3 bg-slate-50 rounded w-20"></div>

                                                    </div>

                                                </div>

                                            </td>

                                            <td className="px-6 py-5"><div className="h-4 bg-slate-50 rounded w-24"></div></td>

                                            <td className="px-6 py-5 text-right"><div className="h-4 bg-slate-50 rounded w-20 ml-auto mb-2"></div><div className="h-3 bg-slate-50 rounded w-16 ml-auto"></div></td>

                                            <td className="px-6 py-5 text-center"><div className="h-4 bg-slate-50 rounded w-12 mx-auto"></div></td>

                                            <td className="px-6 py-5"><div className="h-5 bg-slate-50 rounded w-16"></div></td>

                                            <td className="px-6 py-5 text-right"><div className="h-8 bg-slate-50 rounded w-24 ml-auto"></div></td>

                                        </tr>

                                    ))

                                ) : products.length === 0 ? (

                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">No assets matching criteria.</td></tr>

                                ) : products.map((p) => (

                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all duration-300 group border-b border-slate-50 last:border-0 text-left">

                                        <td className="px-10 py-6">

                                            <div className="flex items-center gap-6 cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>

                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-executive-dark group-hover:bg-executive-dark group-hover:text-white transition-all duration-500 shadow-sm shadow-slate-900/5">

                                                    {p.name.charAt(0)}

                                                </div>

                                                <div>

                                                    <p className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors">{p.name}</p>

                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{p.sku}</p>

                                                </div>

                                            </div>

                                        </td>

                                        <td className="px-10 py-6">

                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category?.name || 'GENERIC'}</span>

                                        </td>

                                        <td className="px-10 py-6 text-right">

                                            <p className="text-sm font-black text-executive-dark">{formatCurrency(Number(p.sellingPrice))}</p>

                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">COST: {formatCurrency(Number(p.costPrice))}</p>

                                        </td>

                                        <td className="px-10 py-6 text-center">

                                            <div className="flex flex-col items-center">

                                                <span className={`text-sm font-black ${Number(p.totalStock) <= 0 ? 'text-danger' : 'text-executive-dark'}`}>

                                                    {Number(p.totalStock).toLocaleString()}

                                                </span>

                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Yield</span>

                                            </div>

                                        </td>

                                        <td className="px-10 py-6">

                                            <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(p.status)}`}>

                                                {p.status}

                                            </span>

                                        </td>

                                        <td className="px-10 py-6 text-right">

                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">

                                                <button

                                                    onClick={() => router.push(`/purchase-orders/new?productId=${p.id}`)}

                                                    className="w-10 h-10 flex items-center justify-center bg-executive-accent/10 text-executive-accent rounded-xl hover:bg-executive-accent hover:text-white transition-all shadow-sm"

                                                    title="Quick Reorder"

                                                >

                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>

                                                </button>

                                                <button onClick={() => router.push(`/products/${p.id}`)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-executive-dark hover:text-white transition-all shadow-sm" title="View Details">

                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>

                                                </button>

                                                <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-danger hover:text-white transition-all shadow-sm" title="Archive">

                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>

                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))}

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



            {/* Create Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Initialize Asset"
                maxWidth="2xl"
            >
                <div className="mb-6">
                    <p className="text-xs text-slate-500 font-medium">Define the technical and fiscal parameters for the new catalog entry.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="grid grid-cols-2 gap-6">

                                <div className="col-span-2 sm:col-span-1">

                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name *</label>

                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="executive-input" placeholder="e.g. High-Performance Processor" required />

                                </div>

                                <div className="col-span-2 sm:col-span-1">

                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal SKU *</label>

                                    <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="executive-input" placeholder="INV-XXX-YYYY" required />

                                </div>

                            </div>



                            <div className="grid grid-cols-2 gap-6">

                                <div className="col-span-2 sm:col-span-1">

                                    <div className="flex justify-between items-center mb-2">

                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>

                                        <Link href="/categories" target="_blank" className="text-[10px] font-bold text-executive-accent hover:underline uppercase tracking-widest">+ New Category</Link>

                                    </div>

                                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="executive-input appearance-none">

                                        <option value="">Unclassified</option>

                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}

                                    </select>

                                </div>

                                <div className="col-span-2 sm:col-span-1">

                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit of Measure</label>

                                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="executive-input appearance-none">

                                        <option value="Each">Each</option>

                                        <option value="Kg">Kilogram (KG)</option>

                                        <option value="L">Liter (L)</option>

                                        <option value="M">Meter (M)</option>

                                    </select>

                                </div>

                            </div>



                            <div>

                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Specifications / Description</label>

                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="executive-input" rows={2} placeholder="Provide technical specifications and usage protocols..." />

                            </div>



                            <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">

                                <div className="col-span-2 sm:col-span-1 border-r border-slate-200 pr-6">

                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Unit Valuation (Selling)</label>

                                    <div className="flex items-center gap-3">

                                        <span className="text-xs font-bold text-slate-400">GHS</span>

                                        <input type="number" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-executive-accent outline-none py-1 font-black text-lg" step="0.01" min="0" />

                                    </div>

                                </div>

                                <div className="col-span-2 sm:col-span-1">

                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acquisition Cost</label>

                                    <div className="flex items-center gap-3">

                                        <span className="text-xs font-bold text-slate-400">GHS</span>

                                        <input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-executive-accent outline-none py-1 font-black text-lg" step="0.01" min="0" />

                                    </div>

                                </div>

                            </div>



                            <div className="grid grid-cols-2 gap-6 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">

                                <div className="col-span-2 sm:col-span-1 border-r border-indigo-100 pr-6">

                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Inventory Trigger</label>

                                    <div className="flex items-center gap-3">

                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Reorder @</span>

                                        <input type="number" value={form.reorderPoint} onChange={e => setForm({ ...form, reorderPoint: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-indigo-400 outline-none py-1 font-black text-lg" min="0" />

                                    </div>

                                </div>

                                <div className="col-span-2 sm:col-span-1">

                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Expiration Logic</label>

                                    <div className="flex items-center justify-between gap-4">

                                        <div className="flex items-center gap-2">

                                            <button

                                                type="button"

                                                onClick={() => setForm(prev => ({ ...prev, trackExpiration: !prev.trackExpiration }))}

                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.trackExpiration ? 'bg-indigo-500' : 'bg-slate-300'}`}

                                            >

                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.trackExpiration ? 'translate-x-6' : 'translate-x-1'}`} />

                                            </button>

                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active</span>

                                        </div>

                                        {form.trackExpiration && (

                                            <div className="flex items-center gap-2">

                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Alert</span>

                                                <input type="number" value={form.expiryAlertDays} onChange={e => setForm({ ...form, expiryAlertDays: +e.target.value })} className="w-12 bg-transparent border-b-2 border-slate-200 focus:border-indigo-400 outline-none py-1 font-black text-sm text-center" />

                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Days</span>

                                            </div>

                                        )}

                                    </div>

                                </div>

                            </div>



                            <div className="flex gap-4 pt-4">

                                <button type="button" onClick={() => setShowModal(false)} className="btn-executive flex-1 py-4">Discard</button>

                                <button type="submit" disabled={saving} className="btn-executive-accent flex-1 py-4">{saving ? 'Processing...' : 'Sync Asset to Catalog'}</button>

                            </div>

                        </form>
            </Modal>

        </DashboardLayout>

    )

}

