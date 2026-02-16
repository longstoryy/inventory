'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'
import { useDebounce } from '@/hooks/use-debounce'
import PaginationControls from '@/components/ui/pagination-controls'

interface Customer {
    id: string
    code: string
    name: string
    type: 'INDIVIDUAL' | 'BUSINESS'
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    creditStatus: string
    currentBalance: number
    creditLimit: number
    isActive: boolean
    _count: { sales: number }
}

export default function CustomersPage() {
    const router = useRouter()
    
    // Data State
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    // Filter State
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 500)

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
        email: '',
        phone: '',
        address: '',
        city: '',
        creditLimit: 0,
    })

    useEffect(() => { 
        fetchCustomers(pagination.page) 
    }, [debouncedSearch, pagination.page])

    const fetchCustomers = async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())
            if (debouncedSearch) params.append('search', debouncedSearch)

            const res = await fetch(`/api/customers?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setCustomers(data.data)
                if (data.pagination) {
                    setPagination(prev => ({ ...prev, ...data.pagination }))
                }
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const resetForm = () => {
        setForm({ name: '', type: 'INDIVIDUAL', email: '', phone: '', address: '', city: '', creditLimit: 0 })
        setEditingId(null)
    }

    const openCreate = () => { resetForm(); setShowModal(true) }

    const openEdit = (c: Customer) => {
        setForm({
            name: c.name,
            type: c.type,
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            creditLimit: Number(c.creditLimit),
        })
        setEditingId(c.id)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return alert('Name is required')
        setSaving(true)
        try {
            const url = editingId ? `/api/customers/${editingId}` : '/api/customers'
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success) {
                fetchCustomers()
                setShowModal(false)
                resetForm()
            } else {
                alert(data.error || 'Failed to save')
            }
        } catch { alert('Failed to save') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this customer?')) return
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) fetchCustomers()
            else alert(data.error || 'Failed to delete')
        } catch { alert('Failed to delete') }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'GOOD': return 'bg-success/10 text-success'
            case 'WARNING': return 'bg-warning/10 text-warning'
            case 'BLOCKED': return 'bg-danger/10 text-danger'
            default: return 'bg-slate-100 text-slate-600'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Account Registry</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Manage professional client associations and institutional credit terms.</p>
                    </div>
                    <button onClick={openCreate} className="btn-executive-dark px-10 text-xs shadow-2xl shadow-executive-dark/10">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                        New Account
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-slate-50 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100">
                    <div className="relative">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-executive-accent transition-colors">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            className="w-full pl-16 pr-8 py-4 bg-white rounded-2xl text-sm font-black text-executive-dark outline-none focus:ring-2 focus:ring-executive-accent/20 transition-all border border-slate-200 placeholder:text-slate-300 shadow-sm"
                            placeholder="Universal Registry Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="executive-card overflow-hidden bg-white">
                    <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Client Stream</h2>
                        <div className="flex gap-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync Operational</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identity Protocol</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engagement Matrix</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Fiscal Leverage</th>
                                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance</th>
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
                                            <td className="px-6 py-5 text-right"><div className="h-8 bg-slate-50 rounded w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">No accounts found in registry.</td></tr>
                                ) : (
                                    customers.map((c) => (
                                        <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="hover:bg-slate-50/50 transition-all duration-300 group cursor-pointer">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-executive-dark group-hover:bg-executive-dark group-hover:text-white transition-all duration-500 shadow-sm shadow-slate-900/5">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                        <p className="text-sm font-black text-executive-dark group-hover:text-executive-accent transition-colors">{c.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{c.code} • {c.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                            <td className="px-10 py-6">
                                                <p className="text-xs font-black text-executive-dark truncate max-w-[200px]">{c.email || 'NO_IDENTIFIER'}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{c.phone || 'NO_METRIC'}</p>
                                        </td>
                                            <td className="px-10 py-6 text-right">
                                                <p className={`text-sm font-black ${Number(c.currentBalance) > 0 ? 'text-danger' : 'text-executive-dark'}`}>
                                                {formatCurrency(c.currentBalance)}
                                            </p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CAP: {formatCurrency(c.creditLimit)}</p>
                                        </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getStatusStyle(c.creditStatus)}`}>
                                                {c.creditStatus}
                                            </span>
                                        </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/sales/new?customerId=${c.id}`); }}
                                                        className="w-10 h-10 flex items-center justify-center bg-executive-accent/10 text-executive-accent rounded-xl hover:bg-executive-accent hover:text-white transition-all"
                                                        title="Initiate Protocol"
                                                >
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(c); }}
                                                        className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-executive-dark hover:text-white transition-all"
                                                        title="Modify Profile"
                                                >
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                            </div>
                                        </td>
                                        </tr>
                                    )))}
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

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm() }}
                title={editingId ? 'Modify Account' : 'New Client Registry'}
                maxWidth="xl"
            >
                <div className="mb-6">
                    <p className="text-xs text-slate-500 font-medium">Provide the required identity and fiscal parameters.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legal Name</label>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="executive-input" placeholder="Full Individual or Entity Name" required />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Classification</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'INDIVIDUAL' | 'BUSINESS' })} className="executive-input appearance-none">
                                        <option value="INDIVIDUAL">Individual Professional</option>
                                        <option value="BUSINESS">Corporate Entity</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="executive-input" placeholder="client@organization.com" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Primary Contact</label>
                                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="executive-input" placeholder="+233 XXX XXX XXX" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Street Address</label>
                                    <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="executive-input" placeholder="123 Silk St" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">City</label>
                                    <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="executive-input" placeholder="Accra" />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fiscal Controls</label>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase">Limit:</span>
                                    <input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: +e.target.value })} className="flex-1 bg-transparent border-b-2 border-slate-200 focus:border-executive-accent outline-none py-1 font-black text-lg transition-colors" min="0" step="0.01" />
                                    <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">GHS</span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-executive flex-1 py-4">Discard Changes</button>
                                <button type="submit" disabled={saving} className="btn-executive-accent flex-1 py-4">{saving ? 'Syncing...' : 'Commit Registry'}</button>
                            </div>
                        </form>
            </Modal>
        </DashboardLayout>
    )
}
