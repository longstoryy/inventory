'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface Variant {
    id: string
    name: string
    sku: string
    options: Record<string, string>
    price: number
    costPrice: number
    isActive: boolean
    stockLevels: { quantity: number; location: { name: string } }[]
}

interface Product {
    id: string
    name: string
    sku: string
    hasVariants: boolean
    variantOptions: Record<string, string[]> | null
    variants: Variant[]
}

export default function ProductVariantsPage() {
    const params = useParams()
    const router = useRouter()
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        sku: '',
        price: 0,
        costPrice: 0,
        options: {} as Record<string, string>,
    })

    useEffect(() => { fetchProduct() }, [params.id])

    const fetchProduct = async () => {
        try {
            const res = await fetch(`/api/products/${params.id}`)
            const data = await res.json()
            if (data.success) setProduct(data.data)
            else router.push('/products')
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const enableVariants = async () => {
        if (!product) return
        try {
            const res = await fetch(`/api/products/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hasVariants: true,
                    variantOptions: { Size: ['S', 'M', 'L'], Color: ['Black', 'White'] },
                }),
            })
            const data = await res.json()
            if (data.success) fetchProduct()
        } catch { alert('Failed') }
    }

    const resetForm = () => {
        setForm({ name: '', sku: '', price: product?.variants[0]?.price || 0, costPrice: product?.variants[0]?.costPrice || 0, options: {} })
        setEditingId(null)
    }

    const openCreate = () => { resetForm(); setShowModal(true) }

    const openEdit = (v: Variant) => {
        setForm({
            name: v.name,
            sku: v.sku,
            price: Number(v.price),
            costPrice: Number(v.costPrice),
            options: v.options || {},
        })
        setEditingId(v.id)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return alert('Name is required')
        setSaving(true)
        try {
            const url = editingId ? `/api/products/${params.id}/variants/${editingId}` : `/api/products/${params.id}/variants`
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success) {
                fetchProduct()
                setShowModal(false)
                resetForm()
            } else {
                alert(data.error || 'Failed to save')
            }
        } catch { alert('Failed to save') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this variant?')) return
        try {
            const res = await fetch(`/api/products/${params.id}/variants/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) fetchProduct()
            else alert(data.error || 'Failed')
        } catch { alert('Failed') }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading) return (
        <DashboardLayout>
            <div className="bg-white rounded-2xl border border-slate-100 h-96 animate-pulse"></div>
        </DashboardLayout>
    )

    if (!product) return null

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                        <p className="text-slate-500 text-sm">{product.sku} • Manage product variants</p>
                    </div>
                </div>

                {!product.hasVariants ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="1.5"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">No Variants Configured</h2>
                        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Enable variants to manage different sizes, colors, or other product options.</p>
                        <button onClick={enableVariants} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800">Enable Variants</button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-500">{product.variants.length} variant(s)</p>
                            <button onClick={openCreate} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 flex items-center gap-2">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                Add Variant
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Variant</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Options</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Price</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Stock</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {product.variants.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">No variants created yet.</td></tr>
                                    ) : product.variants.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-slate-900">{v.name}</p>
                                                <p className="text-xs text-slate-400">{v.sku}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(v.options || {}).map(([key, val]) => (
                                                        <span key={key} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">{key}: {val}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(v.price))}</p>
                                                <p className="text-xs text-slate-400">Cost: {formatCurrency(Number(v.costPrice))}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {v.stockLevels?.reduce((s, l) => s + Number(l.quantity), 0) || 0}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEdit(v)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Variant' : 'Add Variant'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="e.g. Medium / Black" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                                <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" required />
                            </div>
                            {product?.variantOptions && Object.entries(product.variantOptions).map(([key, values]) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{key}</label>
                                    <select value={form.options[key] || ''} onChange={e => setForm({ ...form, options: { ...form.options, [key]: e.target.value } })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                                        <option value="">Select {key}</option>
                                        {(values as string[]).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" step="0.01" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                                    <input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: +e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" step="0.01" min="0" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
