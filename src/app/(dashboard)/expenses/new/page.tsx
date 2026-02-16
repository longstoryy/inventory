'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Category {
    id: string
    name: string
}

export default function NewExpensePage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'CASH',
        paymentStatus: 'PAID'
    })

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/expenses/categories')
                const data = await res.json()
                if (data.success) {
                    setCategories(data.data)
                    if (data.data.length > 0) {
                        setFormData(prev => ({ ...prev, categoryId: data.data[0].id }))
                    }
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                router.push('/expenses')
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to save expense')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/expenses" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-executive-dark transition-colors">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-executive-dark">Register Expense</h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">Capture a new operational cost.</p>
                    </div>
                </div>

                <div className="executive-card p-10 bg-white">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</label>
                                <select
                                    className="executive-input"
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount (GHS)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="executive-input"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</label>
                                <input
                                    type="date"
                                    className="executive-input"
                                    value={formData.expenseDate}
                                    onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Method</label>
                                <select
                                    className="executive-input"
                                    value={formData.paymentMethod}
                                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="MOBILE_MONEY">Mobile Money</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                            <textarea
                                className="executive-input h-24 resize-none"
                                placeholder="Details about this expense..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-executive-primary px-8"
                            >
                                {submitting ? 'Saving...' : 'Save Record'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    )
}
