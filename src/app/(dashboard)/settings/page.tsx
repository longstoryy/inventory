'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Modal from '@/components/ui/modal'

interface User {
    id: string
    name: string
    email: string
    role: { name: string }
    lastLoginAt: string | null
}

interface Organization {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    city: string | null
    country: string | null
    currency: string
    planName: string
    subscriptionStatus: string
    subscriptionEndsAt: string | null
    users: User[]
}

interface Invite {
    id: string
    email: string
    role: { name: string }
    status: string
    createdAt: string
    expiresAt: string
    token: string
}

interface Role {
    id: string
    name: string
    description?: string
}

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        currency: ''
    })
    const [invites, setInvites] = useState<Invite[]>([])
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteForm, setInviteForm] = useState({ email: '', roleId: '' })
    const [roles, setRoles] = useState<Role[]>([])

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await fetch('/api/organization')
                const data = await res.json()
                if (data.success) {
                    setOrg(data.data)
                    setFormData({
                        name: data.data.name || '',
                        email: data.data.email || '',
                        phone: data.data.phone || '',
                        address: data.data.address || '',
                        city: data.data.city || '',
                        country: data.data.country || '',
                        currency: data.data.currency || 'GHS'
                    })
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        const fetchInvites = async () => {
            try {
                const res = await fetch('/api/organization/invites')
                const data = await res.json()
                if (data.success) setInvites(data.data)
            } catch (err) { console.error(err) }
        }

        const fetchRoles = async () => {
            try {
                const res = await fetch('/api/roles')
                const data = await res.json()
                if (data.success) setRoles(data.data)
            } catch (err) { console.error(err) }
        }

        fetchOrg()
        fetchInvites()
        fetchRoles()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/organization', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                alert('Settings updated successfully')
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to update settings')
        } finally {
            setSaving(false)
        }
    }

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/organization/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inviteForm)
            })
            const data = await res.json()
            if (data.success) {
                alert('Invitation sent!')
                setShowInviteModal(false)
                setInviteForm({ email: '', roleId: '' })
                // Refresh invites
                const resInv = await fetch('/api/organization/invites')
                const dataInv = await resInv.json()
                if (dataInv.success) setInvites(dataInv.data)
            } else {
                alert(data.error)
            }
        } catch {
            alert('Failed to send invitation')
        }
    }

    if (loading) return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="animate-pulse space-y-2">
                    <div className="h-10 bg-slate-100 rounded-lg w-64"></div>
                    <div className="h-4 bg-slate-50 rounded w-48"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[600px] bg-white rounded-3xl animate-pulse"></div>
                    <div className="space-y-8">
                        <div className="h-96 bg-slate-900 rounded-3xl animate-pulse"></div>
                        <div className="h-48 bg-white rounded-3xl animate-pulse"></div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )

    if (!org) return null

    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-executive-dark tracking-tighter">Institution Configuration</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Calibrate organizational parameters and governing credentials.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="executive-card p-6 sm:p-10 bg-white">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Profile</h3>
                                <span className="text-[10px] font-black text-executive-accent uppercase">Operational Master</span>
                            </div>
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                        <input
                                            type="text"
                                            className="executive-input"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                                        <input
                                            type="email"
                                            className="executive-input"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                        <input
                                            type="text"
                                            className="executive-input"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency Code</label>
                                        <input
                                            type="text"
                                            className="executive-input uppercase font-black"
                                            value={formData.currency}
                                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                            maxLength={3}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                                    <textarea
                                        className="executive-input h-24 resize-none"
                                        value={formData.address || ''}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                                        <input
                                            type="text"
                                            className="executive-input"
                                            value={formData.city || ''}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Country</label>
                                        <input
                                            type="text"
                                            className="executive-input"
                                            value={formData.country || ''}
                                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-50 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-executive-dark px-12 py-4 shadow-2xl shadow-executive-dark/10"
                                    >
                                        {saving ? 'Processing...' : 'Persist Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Current Members */}
                        <div className="executive-card p-8 bg-executive-dark text-white border-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-executive-accent/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Personnel Registry</h3>
                                <div className="space-y-6">
                                    {org.users.map(u => (
                                        <div key={u.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-executive-accent">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black">{u.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">{u.email}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 rounded text-[9px] font-black uppercase text-executive-accent bg-executive-accent/10 border border-executive-accent/20 tracking-tighter">
                                                {u.role.name}
                                            </span>
                                        </div>
                                    ))}

                                    {invites.length > 0 && (
                                        <div className="pt-6 border-t border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Pending Provisions</p>
                                            <div className="space-y-5">
                                                {invites.map(inv => (
                                                    <div key={inv.id} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-4 opacity-70">
                                                            <div className="w-10 h-10 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-xs font-black">?</div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-300">{inv.email}</p>
                                                                <p className="text-[8px] uppercase tracking-widest text-slate-500">Expires: {new Date(inv.expiresAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const link = `${window.location.origin}/signup?token=${inv.token}`;
                                                                    navigator.clipboard.writeText(link);
                                                                    alert('Invite link copied to clipboard!');
                                                                }}
                                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-executive-accent transition-colors border border-white/10"
                                                                title="Copy Credentials"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="w-full mt-10 py-4 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                                >
                                    + Provision New Access
                                </button>
                            </div>
                        </div>

                        <div className="executive-card p-10 bg-white border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Subscription Protocol</h3>
                            <div className="flex items-end justify-between mb-4">
                                <span className="text-4xl font-black text-executive-dark uppercase tracking-tighter">{org.planName}</span>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${org.subscriptionStatus === 'ACTIVE' ? 'text-success bg-success/10 border-success/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
                                    {org.subscriptionStatus}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight italic">Terminal Validity: {org.subscriptionEndsAt ? new Date(org.subscriptionEndsAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            <Modal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Access Provisioning"
                maxWidth="md"
            >
                <div className="mb-8">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Generate staff authentication credentials</p>
                </div>

                <form onSubmit={handleSendInvite} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Email Address</label>
                        <input
                            type="email"
                            required
                            className="executive-input"
                            placeholder="institutional@node.com"
                            value={inviteForm.email}
                            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Privilege Level</label>
                        <select
                            required
                            className="executive-input font-bold"
                            value={inviteForm.roleId}
                            onChange={e => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                        >
                            <option value="">Select Protocol...</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="flex-1 py-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-executive-primary py-4 text-xs font-bold uppercase tracking-widest shadow-xl shadow-executive-dark/20"
                        >
                            Authorize
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
