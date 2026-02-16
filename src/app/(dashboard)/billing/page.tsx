'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import PaginationControls from '@/components/ui/pagination-controls'

interface BillingData {
    subscription: {
        id: string
        status: string
        planName: string
        amount: number
        currentPeriodEnd: string | null
    } | null
    payments: Array<{
        id: string
        amount: number
        status: string
        createdAt: string
    }>
    usage: {
        users: number
        products: number
        locations: number
    }
    limits: {
        maxUsers: number
        maxProducts: number
        maxLocations: number
    }
    planName: string
    subscriptionStatus: string
}

interface Plan {
    id: string
    name: string
    displayName: string
    monthlyPrice: number
    maxUsers: number
    maxProducts: number
    maxLocations: number
    features: string[]
}

export default function BillingPage() {
    const [data, setData] = useState<BillingData | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [upgrading, setUpgrading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

    useEffect(() => {
        fetchBilling(pagination.page)
        fetchPlans()
    }, [pagination.page])

    const fetchBilling = async (page = 1) => {
        setLoading(page === 1 && !data)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pagination.limit.toString())

            const res = await fetch(`/api/billing?${params.toString()}`)
            const result = await res.json()
            if (result.success) {
                setData(result.data)
                if (result.pagination) setPagination(prev => ({ ...prev, ...result.pagination }))
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/plans')
            const result = await res.json()
            if (result.success) setPlans(result.data || [])
        } catch (err) { console.error(err) }
    }

    const handleUpgrade = async (planId: string) => {
        setUpgrading(true)
        setSelectedPlan(planId)
        try {
            const res = await fetch('/api/billing/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            })
            const result = await res.json()
            if (result.success) {
                fetchBilling(pagination.page)
                alert('Plan upgraded successfully!')
            } else {
                alert(result.error || 'Failed to upgrade')
            }
        } catch { alert('Failed to upgrade') }
        finally { setUpgrading(false); setSelectedPlan(null) }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading && !data) return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="animate-pulse space-y-2">
                    <div className="h-10 bg-slate-100 rounded-lg w-64"></div>
                    <div className="h-4 bg-slate-50 rounded w-48"></div>
                </div>

                <div className="executive-card p-10 h-32 animate-pulse bg-white/50 border-none shadow-none"></div>

                <div className="executive-card p-10 h-48 animate-pulse bg-white/50 border-none shadow-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="executive-card h-80 animate-pulse bg-white/50 border-none shadow-none"></div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-executive-dark">Fiscal Subscriptions</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Provision institutional capacity and manage service commitments.</p>
                    </div>
                </div>

                {/* Current Plan */}
                <div className="executive-card p-10 bg-executive-dark text-white border-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-executive-accent/10 blur-3xl -mr-32 -mt-32 rounded-full"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h2 className="text-3xl font-black uppercase tracking-tighter">{data?.planName || 'Free Tier'}</h2>
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-widest ${data?.subscriptionStatus === 'ACTIVE' ? 'bg-success/20 text-success border-success/20' : 'bg-warning/20 text-warning border-warning/20'}`}>
                                    {data?.subscriptionStatus || 'N/A'}
                                </span>
                            </div>
                            {data?.subscription?.currentPeriodEnd && (
                                <p className="text-sm text-slate-400 font-medium">
                                    {formatCurrency(Number(data.subscription.amount))} / month commitment • Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="btn-executive text-xs bg-white/10 hover:bg-white/20 border-white/10 text-white">Download Last Invoice</button>
                        </div>
                    </div>
                </div>

                {/* Usage */}
                {data && (
                    <div className="executive-card p-10 bg-white">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Capacity Allocation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-sm font-bold text-slate-900">Personnel Seats</span>
                                    <span className="text-xs font-black text-executive-dark">{data.usage.users} / {data.limits.maxUsers}</span>
                                </div>
                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-executive-dark rounded-full transition-all duration-1000" style={{ width: `${Math.min((data.usage.users / data.limits.maxUsers) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-sm font-bold text-slate-900">Asset Registrations</span>
                                    <span className="text-xs font-black text-executive-dark">{data.usage.products.toLocaleString()} / {data.limits.maxProducts.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-executive-accent rounded-full transition-all duration-1000" style={{ width: `${Math.min((data.usage.products / data.limits.maxProducts) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-sm font-bold text-slate-900">Fulfillment Nodes</span>
                                    <span className="text-xs font-black text-executive-dark">{data.usage.locations} / {data.limits.maxLocations}</span>
                                </div>
                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((data.usage.locations / data.limits.maxLocations) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Plans */}
                {plans.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Service Commitments</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {plans.map((plan) => {
                                const isCurrentPlan = data?.planName?.toLowerCase() === plan.name.toLowerCase()
                                return (
                                    <div key={plan.id} className={`executive-card p-8 bg-white transition-all duration-500 hover:shadow-2xl hover:shadow-executive-dark/5 ${isCurrentPlan ? 'border-executive-accent ring-1 ring-executive-accent shadow-xl shadow-executive-accent/5' : ''}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-black text-executive-dark uppercase tracking-tighter">{plan.displayName}</h3>
                                            {isCurrentPlan && <span className="text-[10px] font-black text-executive-accent bg-executive-accent/5 px-2 py-1 rounded uppercase tracking-[0.2em]">Active</span>}
                                        </div>
                                        <div className="mb-8">
                                            <span className="text-4xl font-black text-executive-dark tracking-tighter">{formatCurrency(Number(plan.monthlyPrice))}</span>
                                            <span className="text-slate-400 text-xs font-bold uppercase ml-2 tracking-widest">/ Period</span>
                                        </div>
                                        <ul className="space-y-4 mb-10">
                                            <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success">
                                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                {plan.maxUsers} Personnel Seats
                                            </li>
                                            <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success">
                                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                {plan.maxProducts.toLocaleString()} Registrations
                                            </li>
                                            <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success">
                                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                {plan.maxLocations} Nodes
                                            </li>
                                        </ul>
                                        <button
                                            onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                                            disabled={isCurrentPlan || upgrading}
                                            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${isCurrentPlan
                                                ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                                : 'bg-executive-dark text-white hover:bg-executive-accent shadow-xl shadow-executive-dark/10'
                                                }`}
                                        >
                                            {upgrading && selectedPlan === plan.id ? 'Processing...' : isCurrentPlan ? 'Current Tier' : 'Upgrade Plan'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Payment History */}
                {data?.payments && data.payments.length > 0 && (
                    <div className="executive-card overflow-hidden bg-white">
                        <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit History / Fiscal Cycles</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white border-b border-slate-100">
                                        <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cycle Date</th>
                                        <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction Volume</th>
                                        <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Code</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-10 py-6 text-sm font-bold text-executive-dark">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                            <td className="px-10 py-6 text-sm font-black text-executive-dark">{formatCurrency(Number(payment.amount))}</td>
                                            <td className="px-10 py-6">
                                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-[0.1em] ${payment.status === 'SUCCESS' ? 'bg-success/10 text-success border-success/10' :
                                                    payment.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                        'bg-danger/10 text-danger border-danger/10'
                                                    }`}>{payment.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <PaginationControls
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                            totalItems={pagination.total}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
