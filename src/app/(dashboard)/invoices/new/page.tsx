'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Sale {
    id: string
    saleNumber: string
    totalAmount: number
    customer: { name: string } | null
    createdAt: string
}

export default function NewInvoicePage() {
    const router = useRouter()
    const [sales, setSales] = useState<Sale[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        saleId: '',
        dueDate: '',
        notes: ''
    })

    // Set default due date to 30 days from now
    useEffect(() => {
        const date = new Date()
        date.setDate(date.getDate() + 30)
        setFormData(prev => ({ ...prev, dueDate: date.toISOString().split('T')[0] }))
    }, [])

    // Fetch un-invoiced sales with customers
    useEffect(() => {
        const fetchSales = async () => {
            try {
                // Ideally this API would filter for sales that don't satisfy isFullyPaid or don't have invoices
                // For now, we fetch recent sales. In a real app, use a specific param like ?pending_invoice=true
                const res = await fetch('/api/sales')
                const data = await res.json()
                if (data.success) {
                    // Filter frontend-side for demo: only sales with customers
                    const validSales = data.data.filter((s: Sale) => s.customer)
                    setSales(validSales)
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchSales()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                router.push('/invoices')
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to generate invoice')
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    return (
        <DashboardLayout>
            <div className="max-w-xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/invoices" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-executive-dark transition-colors">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-executive-dark">Generate Invoice</h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">Create a formal invoice from an existing sale.</p>
                    </div>
                </div>

                <div className="executive-card p-10 bg-white">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Sale Transaction</label>
                            <select
                                className="executive-input"
                                value={formData.saleId}
                                onChange={e => setFormData({ ...formData, saleId: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select Credit Sale</option>
                                {sales.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.saleNumber} - {s.customer?.name} ({formatCurrency(Number(s.totalAmount))})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 font-medium">Only sales linked to registered customers can be invoiced.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Due Date</label>
                            <input
                                type="date"
                                className="executive-input"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes / Terms</label>
                            <textarea
                                className="executive-input h-24 resize-none"
                                placeholder="Additional payment terms or instructions..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-executive-primary px-8"
                            >
                                {submitting ? 'Generating...' : 'Create Invoice'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    )
}
