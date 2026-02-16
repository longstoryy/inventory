'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'
import PaginationControls from '@/components/ui/pagination-controls'

interface Supplier {
    id: string
    code: string
    name: string
    email: string | null
    phone: string | null
    paymentTerms: string | null
    leadTimeDays: number
    isActive: boolean
    _count: { purchaseOrders: number; products: number }
}

export default function SuppliersPage() {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        paymentTerms: 'NET_30',
        leadTimeDays: 7,
        isActive: true,
    })

    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => { fetchSuppliers(pagination.page) }, [pagination.page])

    const fetchSuppliers = async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())

            const res = await fetch(`/api/suppliers?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setSuppliers(data.data)
                if (data.pagination) setPagination(prev => ({ ...prev, ...data.pagination }))
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const resetForm = () => {
        setForm({ name: '', code: '', email: '', phone: '', address: '', city: '', country: '', paymentTerms: 'NET_30', leadTimeDays: 7, isActive: true })
        setEditingId(null)
    }

    const openCreate = () => { resetForm(); setShowModal(true) }

    const openEdit = (s: Supplier) => {
        setForm({
            name: s.name,
            code: s.code,
            email: s.email || '',
            phone: s.phone || '',
            address: '',
            city: '',
            country: '',
            paymentTerms: s.paymentTerms || 'NET_30',
            leadTimeDays: s.leadTimeDays,
            isActive: s.isActive,
        })
        setEditingId(s.id)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return alert('Name is required')
        setSaving(true)
        try {
            const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers'
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
            })
            const data = await res.json()
            if (data.success) {
                fetchSuppliers()
                setShowModal(false)
                resetForm()
            } else {
                alert(data.error || 'Failed to save')
            }
        } catch { alert('Failed to save') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this supplier?')) return
        try {
            const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) fetchSuppliers()
            else alert(data.error || 'Failed to delete')
        } catch { alert('Failed to delete') }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Procurement Partners</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manage institutional procurement relationships and supply chain logistics.</p>
                    </div>
                    <button onClick={openCreate} className="btn-executive-dark px-10 text-xs shadow-2xl shadow-executive-dark/10">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                        Onboard Protocol
                    </button>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Procurement Stream</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partner Identification</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Communications</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commercial Protocol</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Procurement Volume</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
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
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-40 mb-2"></div><div className="h-3 bg-slate-50 rounded w-28"></div></td>
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-50 rounded w-24"></div></td>
                                            <td className="px-6 py-5 text-center"><div className="h-4 bg-slate-100 rounded w-12 mx-auto"></div></td>
                                            <td className="px-6 py-5 text-center"><div className="h-3 w-3 bg-slate-100 rounded-full mx-auto"></div></td>
                                            <td className="px-6 py-5 text-right"><div className="h-8 bg-slate-50 rounded w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : suppliers.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-all duration-300 group border-b border-slate-50 last:border-0">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-6 cursor-pointer" onClick={() => router.push(`/suppliers/${s.id}`)}>
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-executive-dark group-hover:bg-executive-dark group-hover:text-white transition-all duration-500 shadow-sm shadow-slate-900/5">
                                                    {s.code?.split('-')[1] || s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors">{s.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{s.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-xs font-black text-executive-dark truncate max-w-[200px]">{s.email || 'NO_IDENTIFIER'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{s.phone || 'NO_METRIC'}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-executive-dark uppercase tracking-widest">{s.paymentTerms?.replace('_', ' ') || 'GENERAL'}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Settle Period</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-executive-dark">{s._count.purchaseOrders.toLocaleString()}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Orders</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <div className="flex justify-center">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white ring-2 ring-slate-100 ${s.isActive ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    onClick={() => router.push(`/purchase-orders/new?supplierId=${s.id}`)}
                                                    className="w-10 h-10 flex items-center justify-center bg-executive-accent/10 text-executive-accent rounded-xl hover:bg-executive-accent hover:text-white transition-all shadow-sm"
                                                    title="Quick Procurement"
                                                >
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                                </button>
                                                <button onClick={() => openEdit(s)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-executive-dark hover:text-white transition-all shadow-sm" title="Modify Partner Profiles">
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
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
                    onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                    totalItems={pagination.total}
                />
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm() }}
                title={editingId ? 'Modify Partner Profile' : 'Partner Onboarding'}
                maxWidth="xl"
            >
                <div className="mb-6">
                    <p className="text-xs text-slate-500 font-medium">Initialize procurement relationship parameters.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legal Entity Name *</label>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="executive-input" placeholder="e.g. Global Supplies Inc." required />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Supplier Code *</label>
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="executive-input" placeholder="e.g. SUP-001" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Official Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="executive-input" placeholder="procurement@entity.com" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Support Liaison</label>
                                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="executive-input" placeholder="+233 XXX XX XX" />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operational Status</label>
                                    <p className="text-xs text-slate-500 font-medium">{form.isActive ? 'Partner is active and authorized for procurement.' : 'Partner is suspended. New orders are blocked.'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-transparent focus:ring-executive-accent/20 ${form.isActive ? 'bg-success' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Settlement Protocol</label>
                                    <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className="executive-input bg-white appearance-none">
                                        <option value="COD">Cash on Fulfillment (COD)</option>
                                        <option value="NET_15">15-Day Maturity (Net 15)</option>
                                        <option value="NET_30">30-Day Maturity (Net 30)</option>
                                        <option value="NET_60">60-Day Maturity (Net 60)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Target Lead Time (Days)</label>
                                    <div className="flex items-center gap-3">
                                        <input type="number" value={form.leadTimeDays} onChange={e => setForm({ ...form, leadTimeDays: +e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-executive-accent outline-none" min="1" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-executive flex-1 py-4">Discard</button>
                                <button type="submit" disabled={saving} className="btn-executive-accent flex-1 py-4">{saving ? 'Syncing...' : 'Authorize Partner Registration'}</button>
                            </div>
                        </form>
            </Modal>
        </DashboardLayout>
    )
}
