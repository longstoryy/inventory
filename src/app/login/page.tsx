'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (res?.error) {
                setError('Authentication failed. Please check your credentials.')
            } else {
                router.push('/dashboard')
            }
        } catch {
            setError('System error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-executive-dark to-slate-50 opacity-10 pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-executive-accent/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-40 -left-20 w-72 h-72 bg-executive-dark/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-executive">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-executive-dark flex items-center justify-center shadow-2xl shadow-executive-dark/20 mb-6 rotate-3 hover:rotate-6 transition-transform duration-500">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                    </div>
                    <h1 className="text-4xl font-display font-black text-executive-dark tracking-tighter">Aurum<span className="text-executive-accent">.</span></h1>
                    <p className="text-slate-500 font-medium text-sm mt-3 tracking-wide">Enterprise Inventory Control</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100">
                    <div className="mb-8">
                        <h2 className="text-xl font-display font-bold text-executive-dark">Welcome Back</h2>
                        <p className="text-sm text-slate-400 mt-1">Please enter your credentials to access the dashboard.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-2">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-executive-dark ml-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium text-executive-dark focus:bg-white focus:ring-2 focus:ring-executive-dark/10 focus:border-executive-dark transition-all outline-none placeholder:text-slate-400"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-executive-dark uppercase tracking-wider">Password</label>
                                <a href="#" className="text-xs font-bold text-executive-accent hover:text-executive-accent-dark transition-colors">Forgot?</a>
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium text-executive-dark focus:bg-white focus:ring-2 focus:ring-executive-dark/10 focus:border-executive-dark transition-all outline-none placeholder:text-slate-400"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-executive-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-executive-dark/20 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying Access...
                                </span>
                            ) : 'Sign In to Dashboard'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        Don't have an account? <Link href="/signup" className="text-executive-dark font-bold hover:text-executive-accent transition-colors">Create Organization</Link>
                    </p>
                </div>

                <div className="mt-12 flex justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Trust indicators/logos could go here */}
                </div>
            </div>
        </div>
    )
}
