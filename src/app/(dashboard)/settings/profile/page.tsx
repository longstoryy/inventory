'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface UserProfile {
    id: string
    name: string
    email: string
    role: { name: string }
}

export default function ProfilePage() {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')

    useEffect(() => {
        fetch('/api/user/profile')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setUser(data.data)
                    setName(data.data.name)
                }
            })
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, currentPassword, newPassword }),
            })
            const data = await res.json()
            if (data.success) {
                alert('Profile updated successfully')
                setCurrentPassword('')
                setNewPassword('')
            } else {
                alert(data.error)
            }
        } catch {
            alert('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-executive-dark">My Profile</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Manage your personal account credentials.</p>
                </div>

                <div className="executive-card p-10 bg-white">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                            <div className="w-20 h-20 rounded-2xl bg-executive-dark flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                {user?.name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-executive-dark">{user?.name}</h2>
                                <p className="text-sm text-slate-400 font-mono">{user?.role?.name} Account</p>
                                <p className="text-sm text-slate-400">{user?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-executive-accent outline-none"
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-executive-dark mb-4">Security</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Password (Optional)</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-executive-accent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            placeholder="Required to save changes"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-executive-accent outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-executive-primary px-8 py-3 disabled:opacity-50"
                            >
                                {saving ? 'Saving Changes...' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    )
}
