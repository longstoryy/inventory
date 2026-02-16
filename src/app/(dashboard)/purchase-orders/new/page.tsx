'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface Supplier { id: string; code: string; name: string; isActive: boolean }
interface Location { id: string; name: string; type: string }
interface Product { id: string; name: string; sku: string; costPrice: number }
interface OrderItem { productId: string; productName: string; sku: string; quantity: number; unitCost: number }

export default function NewPurchaseOrderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ supplierId: '', locationId: '', expectedDate: '', notes: '' })
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])
    const [showProductPicker, setShowProductPicker] = useState(false)
    const [productSearch, setProductSearch] = useState('')

    useEffect(() => {
        Promise.all([
            fetch('/api/suppliers').then(r => r.json()),
            fetch('/api/locations').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
        ]).then(([s, l, p]) => {
            if (s.success) setSuppliers(s.data)
            if (l.success) setLocations(l.data)
            if (p.success) setProducts(p.data)

            // Handle pre-selected supplier from URL
            const sid = searchParams.get('supplierId')
            if (sid) setFormData(prev => ({ ...prev, supplierId: sid }))

            // Handle pre-selected product from URL
            const pid = searchParams.get('productId')
            if (pid && p.success) {
                const productToSelect = p.data.find((item: Product) => item.id === pid)
                if (productToSelect) {
                    setOrderItems([{
                        productId: productToSelect.id,
                        productName: productToSelect.name,
                        sku: productToSelect.sku,
                        quantity: 1,
                        unitCost: Number(productToSelect.costPrice)
                    }])
                }
            }

            setLoading(false)
        })
    }, [searchParams])

    const addProduct = (p: Product) => {
        const existing = orderItems.find(i => i.productId === p.id)
        if (existing) {
            setOrderItems(orderItems.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            setOrderItems([...orderItems, { productId: p.id, productName: p.name, sku: p.sku, quantity: 1, unitCost: Number(p.costPrice) }])
        }
        setShowProductPicker(false)
    }

    const updateQty = (id: string, qty: number) => qty <= 0 ? setOrderItems(orderItems.filter(i => i.productId !== id)) : setOrderItems(orderItems.map(i => i.productId === id ? { ...i, quantity: qty } : i))
    const updateCost = (id: string, cost: number) => setOrderItems(orderItems.map(i => i.productId === id ? { ...i, unitCost: cost } : i))
    const removeItem = (id: string) => setOrderItems(orderItems.filter(i => i.productId !== id))
    const subtotal = orderItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orderItems.length) return alert('Add at least one product')
        setSaving(true)
        try {
            const res = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    subtotal,
                    taxAmount: 0,
                    shippingCost: 0,
                    totalAmount: subtotal,
                    items: orderItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost }))
                }),
            })
            const data = await res.json()
            if (data.success) router.push('/purchase-orders')
            else alert(data.error || 'Failed to create order')
        } catch { alert('Failed to connect to server') } finally { setSaving(false) }
    }

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>

    return (
        <DashboardLayout>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-executive-dark">New Purchase Order</h1>
                        <p className="text-slate-500 mt-2 text-sm">Create order to replenish inventory.</p>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={saving} className="btn-executive-accent px-8 disabled:opacity-50">{saving ? 'Creating...' : 'Create Order'}</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="executive-card p-6 space-y-5">
                            <h2 className="text-lg font-bold text-executive-dark">Order Details</h2>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Supplier *</label>
                                    <select required value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                                        <option value="">Select supplier</option>
                                        {suppliers.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Location *</label>
                                    <select required value={formData.locationId} onChange={e => setFormData({ ...formData, locationId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                                        <option value="">Select location</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Expected Date</label>
                                <input type="date" value={formData.expectedDate} onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
                            </div>
                        </div>

                        <div className="executive-card p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-executive-dark">Order Items</h2>
                                <button type="button" onClick={() => setShowProductPicker(true)} className="px-4 py-2 text-sm font-bold text-executive-accent hover:bg-executive-accent/10 rounded-lg">+ Add Product</button>
                            </div>
                            {!orderItems.length ? (
                                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                    <p className="text-sm font-bold text-slate-400">No products added</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orderItems.map(item => (
                                        <div key={item.productId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                            <div className="flex-1"><p className="text-sm font-bold">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></div>
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateQty(item.productId, +e.target.value)} className="w-16 h-8 text-center text-sm border rounded-lg" />
                                            <span className="text-xs">@</span>
                                            <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateCost(item.productId, +e.target.value)} className="w-24 h-8 text-center text-sm border rounded-lg" />
                                            <span className="text-sm font-bold w-24 text-right">{formatCurrency(item.quantity * item.unitCost)}</span>
                                            <button type="button" onClick={() => removeItem(item.productId)} className="text-danger">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="executive-card p-6 sticky top-6 h-fit">
                        <h2 className="text-lg font-bold text-executive-dark mb-5">Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="font-bold">{orderItems.length}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Units</span><span className="font-bold">{orderItems.reduce((s, i) => s + i.quantity, 0)}</span></div>
                            <div className="h-px bg-slate-100 my-2"></div>
                            <div className="flex justify-between"><span className="font-bold">Total</span><span className="text-2xl font-black">{formatCurrency(subtotal)}</span></div>
                        </div>
                    </div>
                </div>
            </form>

            {showProductPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Add Product</h2>
                            <button onClick={() => setShowProductPicker(false)} className="p-2 hover:bg-slate-100 rounded-xl">✕</button>
                        </div>
                        <input type="text" placeholder="Search..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full px-4 py-3 rounded-xl border mb-4 text-sm" autoFocus />
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 20).map(p => (
                                <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 text-left">
                                    <div><p className="text-sm font-bold">{p.name}</p><p className="text-xs text-slate-400">{p.sku}</p></div>
                                    <span className="text-sm font-bold text-executive-accent">{formatCurrency(Number(p.costPrice))}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
