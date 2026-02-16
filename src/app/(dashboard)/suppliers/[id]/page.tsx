'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface SupplierContact { id: string; name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean }
interface SupplierProduct { id: string; productId: string; supplierSku: string | null; unitCost: number; leadTimeDays: number; product: { name: string; sku: string } }
interface PurchaseOrder { id: string; poNumber: string; status: string; totalAmount: number; orderDate: string }

interface Supplier {
    id: string; code: string; name: string; email: string | null; phone: string | null; address: string | null
    city: string | null; country: string | null; website: string | null; taxId: string | null
    paymentTerms: string | null; leadTimeDays: number; notes: string | null; isActive: boolean
    contacts: SupplierContact[]; products: SupplierProduct[]; purchaseOrders: PurchaseOrder[]
}

export default function SupplierDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [supplier, setSupplier] = useState<Supplier | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<Partial<Supplier>>({})
    const [activeTab, setActiveTab] = useState<'info' | 'products' | 'orders'>('info')

    useEffect(() => { fetchSupplier() }, [params.id])

    const fetchSupplier = async () => {
        try {
            const res = await fetch(`/api/suppliers/${params.id}`)
            const data = await res.json()
            if (data.success) { setSupplier(data.data); setForm(data.data) }
            else { alert('Supplier not found'); router.push('/suppliers') }
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/suppliers/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success) { setSupplier(data.data); setEditing(false) }
            else alert(data.error || 'Failed')
        } catch { alert('Failed') } finally { setSaving(false) }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)
    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'RECEIVED': return 'bg-success/10 text-success'
            case 'CANCELLED': return 'bg-danger/10 text-danger'
            case 'SENT': case 'PARTIAL': return 'bg-blue-50 text-blue-600'
            default: return 'bg-slate-100 text-slate-500'
        }
    }

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>
    if (!supplier) return <DashboardLayout><p>Supplier not found</p></DashboardLayout>

    const totalOrders = supplier.purchaseOrders?.reduce((s, o) => s + Number(o.totalAmount), 0) || 0

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-4xl font-bold text-executive-dark">{supplier.name}</h1>
                            <p className="text-slate-500 mt-1 text-sm">{supplier.code} • {supplier.city || 'No location'}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {editing ? (
                            <>
                                <button onClick={() => setEditing(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="btn-executive-accent px-8 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => router.push(`/purchase-orders/new?supplierId=${supplier.id}`)}
                                    className="px-6 py-3 rounded-xl bg-executive-dark text-white font-bold text-sm hover:bg-executive-accent transition-all flex items-center gap-2"
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    Initialize Procurement
                                </button>
                                <button onClick={() => setEditing(true)} className="btn-executive-accent px-8">Edit Supplier</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total Orders</p><p className="text-3xl font-black text-executive-dark">{supplier.purchaseOrders?.length || 0}</p></div>
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Order Value</p><p className="text-3xl font-black text-executive-dark">{formatCurrency(totalOrders)}</p></div>
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Products Supplied</p><p className="text-3xl font-black text-executive-dark">{supplier.products?.length || 0}</p></div>
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Lead Time</p><p className="text-3xl font-black text-executive-dark">{supplier.leadTimeDays} days</p></div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    {(['info', 'products', 'orders'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white shadow text-executive-dark' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'info' ? 'Information' : tab === 'products' ? 'Products' : 'Purchase Orders'}
                        </button>
                    ))}
                </div>

                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="executive-card p-6">
                            <h2 className="text-lg font-bold text-executive-dark mb-5">Contact Details</h2>
                            {editing ? (
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Website</label><input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label><input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label><input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country</label><input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Time (days)</label><input type="number" value={form.leadTimeDays || 0} onChange={e => setForm({ ...form, leadTimeDays: +e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Terms</label><input value={form.paymentTerms || ''} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div><span className="text-slate-400">Email:</span> <span className="font-medium">{supplier.email || '—'}</span></div>
                                    <div><span className="text-slate-400">Phone:</span> <span className="font-medium">{supplier.phone || '—'}</span></div>
                                    <div><span className="text-slate-400">Website:</span> <span className="font-medium">{supplier.website || '—'}</span></div>
                                    <div><span className="text-slate-400">Address:</span> <span className="font-medium">{supplier.address || '—'}</span></div>
                                    <div><span className="text-slate-400">City/Country:</span> <span className="font-medium">{[supplier.city, supplier.country].filter(Boolean).join(', ') || '—'}</span></div>
                                    <div><span className="text-slate-400">Payment Terms:</span> <span className="font-medium">{supplier.paymentTerms || '—'}</span></div>
                                </div>
                            )}
                        </div>
                        <div className="executive-card p-6">
                            <h2 className="text-lg font-bold text-executive-dark mb-5">Contacts</h2>
                            {supplier.contacts?.length ? (
                                <div className="space-y-3">{supplier.contacts.map(c => (
                                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center justify-between"><p className="font-bold text-sm">{c.name}</p>{c.isPrimary && <span className="text-[9px] font-bold bg-executive-accent/10 text-executive-accent px-2 py-0.5 rounded">PRIMARY</span>}</div>
                                        <p className="text-xs text-slate-400">{c.role}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-slate-500"><span>{c.email}</span><span>{c.phone}</span></div>
                                    </div>
                                ))}</div>
                            ) : <p className="text-sm text-slate-400">No contacts added.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="executive-card p-6">
                        <h2 className="text-lg font-bold text-executive-dark mb-5">Supplied Products</h2>
                        {supplier.products?.length ? (
                            <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Product</th><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Supplier SKU</th><th className="text-right py-2 text-xs font-bold text-slate-400 uppercase">Unit Cost</th><th className="text-right py-2 text-xs font-bold text-slate-400 uppercase">Lead Time</th></tr></thead>
                                <tbody>{supplier.products.map(p => (
                                    <tr key={p.id} className="border-b border-slate-50"><td className="py-3"><p className="font-bold">{p.product.name}</p><p className="text-xs text-slate-400">{p.product.sku}</p></td><td className="py-3 text-slate-500">{p.supplierSku || '—'}</td><td className="py-3 text-right font-bold">{formatCurrency(Number(p.unitCost))}</td><td className="py-3 text-right text-slate-500">{p.leadTimeDays} days</td></tr>
                                ))}</tbody></table>
                        ) : <p className="text-sm text-slate-400 text-center py-8">No products linked to this supplier.</p>}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="executive-card p-6">
                        <h2 className="text-lg font-bold text-executive-dark mb-5">Purchase Orders</h2>
                        {supplier.purchaseOrders?.length ? (
                            <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">PO Number</th><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Date</th><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Status</th><th className="text-right py-2 text-xs font-bold text-slate-400 uppercase">Total</th></tr></thead>
                                <tbody>{supplier.purchaseOrders.map(o => (
                                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/purchase-orders/${o.id}`)}><td className="py-3 font-bold">{o.poNumber}</td><td className="py-3 text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td><td className="py-3"><span className={`px-2 py-0.5 text-[9px] font-black rounded ${getStatusStyle(o.status)}`}>{o.status}</span></td><td className="py-3 text-right font-bold">{formatCurrency(Number(o.totalAmount))}</td></tr>
                                ))}</tbody></table>
                        ) : <p className="text-sm text-slate-400 text-center py-8">No purchase orders from this supplier.</p>}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
