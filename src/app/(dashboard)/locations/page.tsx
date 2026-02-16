'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'

interface Location {
    id: string
    name: string
    type: 'WAREHOUSE' | 'STORE' | 'VIRTUAL'
    address: string | null
    city: string | null
    country: string | null
    phone: string | null
    email: string | null
    isActive: boolean
    _count: { stockLevels: number }
}

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        type: 'WAREHOUSE' as 'WAREHOUSE' | 'STORE' | 'VIRTUAL',
        address: '',
        city: '',
        country: '',
        phone: '',
        email: '',
    })

    const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    useEffect(() => {
        fetchLocations()
    }, [])

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            if (data.success) setLocations(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = '/api/locations'
            const method = editingLocation ? 'PUT' : 'POST'
            const body = editingLocation
                ? { ...formData, id: editingLocation.id }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.success) {
                fetchLocations()
                closeModal()
            } else if (data.error && data.error.includes('limit reached')) {
                setShowUpgradeModal(true)
            } else {
                alert(data.error || 'Failed to save location')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to save location')
        } finally {
            setSaving(false)
        }
    }

    const openCreateModal = () => {
        setEditingLocation(null)
        setFormData({
            name: '',
            type: 'WAREHOUSE',
            address: '',
            city: '',
            country: '',
            phone: '',
            email: '',
        })
        setShowModal(true)
    }

    const openEditModal = (loc: Location) => {
        setEditingLocation(loc)
        setFormData({
            name: loc.name,
            type: loc.type,
            address: loc.address || '',
            city: loc.city || '',
            country: loc.country || '',
            phone: loc.phone || '',
            email: loc.email || '',
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingLocation(null)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'WAREHOUSE':
                return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
            case 'STORE':
                return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
            default:
                return 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
        }
    }

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'WAREHOUSE':
                return 'bg-blue-50 text-blue-600 border-blue-100'
            case 'STORE':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100'
            default:
                return 'bg-purple-50 text-purple-600 border-purple-100'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-executive-dark">Locations</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">
                            Manage warehouses, stores, and virtual locations across your organization.
                        </p>
                    </div>
                    <button onClick={openCreateModal} className="btn-executive-accent px-8">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                        Add Location
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="executive-card h-48 animate-pulse bg-white/50"></div>
                        ))
                    ) : locations.length === 0 ? (
                        <div className="col-span-full executive-card py-20 text-center bg-white/50 border-dashed">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5">
                                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-slate-900">No locations configured</p>
                            <p className="text-xs text-slate-400 mt-1">Add your first warehouse or store to get started.</p>
                        </div>
                    ) : (
                        locations.map((loc) => (
                            <div
                                key={loc.id}
                                onClick={() => openEditModal(loc)}
                                className="executive-card p-6 cursor-pointer group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTypeStyle(loc.type)}`}>
                                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={getTypeIcon(loc.type)} />
                                        </svg>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${getTypeStyle(loc.type)}`}>
                                        {loc.type}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-executive-dark mb-1 group-hover:text-executive-accent transition-colors">
                                    {loc.name}
                                </h3>
                                {(loc.city || loc.country) && (
                                    <p className="text-xs text-slate-400 mb-4">
                                        {[loc.city, loc.country].filter(Boolean).join(', ')}
                                    </p>
                                )}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
                                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        <span className="text-xs font-bold text-slate-500">
                                            {loc._count.stockLevels} SKUs
                                        </span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${loc.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingLocation ? 'Edit Location' : 'New Location'}
                maxWidth="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Location Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                    placeholder="Main Warehouse"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Type *
                                </label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'WAREHOUSE' | 'STORE' | 'VIRTUAL' })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                >
                                    <option value="WAREHOUSE">Warehouse</option>
                                    <option value="STORE">Store</option>
                                    <option value="VIRTUAL">Virtual</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                        placeholder="Accra"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                        placeholder="Ghana"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                    placeholder="123 Industrial Ave"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                        placeholder="+233 XX XXX XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/20 outline-none transition-all text-sm"
                                        placeholder="warehouse@company.com"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 btn-executive-accent disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
                                </button>
                            </div>
                        </form>
            </Modal>

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 text-center animate-executive">
                        <div className="w-20 h-20 bg-executive-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="2">
                                <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-executive-dark tracking-tight mb-4">Expand Operations</h2>
                        <p className="text-slate-500 text-base leading-relaxed mb-10">
                            Your organization has reached its current node capacity. To synchronize more locations, please upgrade to a higher enterprise tier.
                        </p>
                        <div className="space-y-4">
                            <button
                                onClick={() => (window.location.href = '/billing')}
                                className="w-full py-4 bg-executive-dark text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                            >
                                VIEW PREMIUM PLANS
                            </button>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="w-full py-4 bg-transparent text-slate-400 rounded-2xl font-bold text-sm hover:text-slate-600 transition-all"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
