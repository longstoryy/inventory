'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
    const searchParams = useSearchParams()
    const inviteToken = searchParams.get('token')

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        organizationName: '',
    })
    const [invitationData, setInvitationData] = useState<any>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetchingInvite, setFetchingInvite] = useState(!!inviteToken)
    const router = useRouter()

    useEffect(() => {
        if (inviteToken) {
            const fetchInvite = async () => {
                try {
                    const res = await fetch(`/api/auth/invites/${inviteToken}`)
                    const data = await res.json()
                    if (data.success) {
                        setInvitationData(data.data)
                        setForm(prev => ({
                            ...prev,
                            email: data.data.email,
                            organizationName: data.data.organization.name
                        }))
                    } else {
                        setError(data.error || 'Invalid or expired invitation')
                    }
                } catch (err) {
                    setError('Failed to load invitation details')
                } finally {
                    setFetchingInvite(false)
                }
            }
            fetchInvite()
        }
    }, [inviteToken])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const endpoint = inviteToken ? '/api/auth/join' : '/api/auth/signup'
            const payload = inviteToken
                ? { token: inviteToken, name: form.name, password: form.password }
                : form

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json()

            if (data.success) {
                router.push('/login?registered=true')
            } else {
                setError(data.error || 'Submission declined. Review details.')
            }
        } catch {
            setError('Network timeout. Please retry.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-executive-canvas flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
            <div className="w-full max-w-[520px] animate-executive">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-executive-dark flex items-center justify-center shadow-2xl shadow-slate-900/20 mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                </div>

                <div className="executive-card p-12 bg-white/80 backdrop-blur-xl border-white/40">
                    <div className="text-center mb-10">
                        <h1 className="text-2xl font-black text-executive-dark tracking-tight">
                            {inviteToken ? 'Join Organization' : 'Provision Enterprise Site'}
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                            {inviteToken ? `Accept Invitation to ${form.organizationName}` : 'Initialize Organization Registry'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-danger/5 border border-danger/10 rounded-xl text-xs text-danger font-bold text-center">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    className="executive-input"
                                    placeholder="Executive Name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                                <input
                                    type="email"
                                    className="executive-input"
                                    placeholder="name@corp.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {!inviteToken && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization Name</label>
                                <input
                                    className="executive-input"
                                    placeholder="Global Chemicals Ltd"
                                    value={form.organizationName}
                                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
                            <input
                                type="password"
                                className="executive-input"
                                placeholder="Min. 8 characters"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-executive-accent w-full py-4 text-sm font-bold mt-4"
                        >
                            {loading ? 'Processing...' : inviteToken ? 'Accept Invitation & Join' : 'Provision New Enterprise Node'}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Already registered? <Link href="/login" className="text-executive-dark font-black hover:text-executive-accent transition-colors">Return to Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
