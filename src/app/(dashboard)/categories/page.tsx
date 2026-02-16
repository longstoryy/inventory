'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import Modal from '@/components/ui/modal'

interface Category {
    id: string
    name: string
    description: string | null
    isActive: boolean
    _count?: { products: number }
    parent?: { id: string; name: string } | null
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [form, setForm] = useState({ name: '', description: '', parentId: '' })
    const [submitting, setSubmitting] = useState(false)

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories')
            const data = await res.json()
            if (data.success) setCategories(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const method = editing ? 'PUT' : 'POST'
            const body = editing ? { ...form, id: editing.id } : form
            const res = await fetch('/api/categories', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                setEditing(null)
                setForm({ name: '', description: '', parentId: '' })
                fetchCategories()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    const openEdit = (cat: Category) => {
        setEditing(cat)
        setForm({ name: cat.name, description: cat.description || '', parentId: cat.parent?.id || '' })
        setShowModal(true)
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-executive-dark">Classifications</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Define your inventory architecture and hierarchy.</p>
                    </div>
                    <button
                        onClick={() => { setEditing(null); setForm({ name: '', description: '', parentId: '' }); setShowModal(true); }}
                        className="btn-executive-accent px-8"
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                        Add Classification
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="executive-card h-48 animate-pulse bg-white/50"></div>
                        ))
                    ) : categories.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-slate-400 font-medium">No classifications defined yet.</p>
                        </div>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="executive-card p-8 group hover:bg-slate-50/50 transition-all cursor-pointer relative">
                                <Link href={`/products?categoryId=${cat.id}`} className="absolute inset-0 z-10" />
                                <div className="flex items-start justify-between mb-6 relative z-20">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-executive-dark border border-slate-100 group-hover:bg-executive-dark group-hover:text-white transition-all duration-300">
                                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); openEdit(cat); }} className="text-slate-300 hover:text-executive-accent transition-colors">
                                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-executive-dark relative z-20">{cat.name}</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-2 relative z-20">{cat.description || 'No descriptive tactical data.'}</p>

                                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between relative z-20">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Products</div>
                                        <div className="text-sm font-black text-executive-dark">{cat._count?.products || 0}</div>
                                    </div>
                                    {cat.parent && (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                                            Part of {cat.parent.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Premium Modal Backdrop */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Modify Classification' : 'Initialize Classification'}
                maxWidth="lg"
            >
                <div className="mb-6">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Registry Configuration</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classification Name</label>
                                <input
                                    className="executive-input"
                                    required
                                    placeholder="e.g., Industrial Solvents"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contextual Description</label>
                                <textarea
                                    className="executive-input min-h-[100px] py-3"
                                    placeholder="Define the scope of this classification..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Hierarchy (Optional)</label>
                                <select
                                    className="executive-input"
                                    value={form.parentId}
                                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                                >
                                    <option value="">Top-Level Classification</option>
                                    {categories.filter(c => c.id !== editing?.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-executive flex-1">Abort</button>
                                <button type="submit" disabled={submitting} className="btn-executive-accent flex-1">
                                    {submitting ? 'Processing...' : editing ? 'Update Record' : 'Commit Classification'}
                                </button>
                            </div>
                        </form>
            </Modal>
        </DashboardLayout>
    )
}
