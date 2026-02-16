'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'

interface Invoice {
    id: string
    invoiceNumber: string
    totalAmount: number
    balanceDue: number
    totalPaid: number
    status: string
    dueDate: string
    createdAt: string
    notes: string | null
    customer: {
        id: string
        name: string
        email: string | null
        phone: string | null
        currentBalance: number
    }
    sale: {
        saleNumber: string
        items: Array<{
            id: string
            quantity: number
            unitPrice: number
            product: {
                name: string
                sku: string
            }
        }>
    }
    payments: Array<{
        id: string
        amount: number
        paymentMethod: string
        reference: string | null
        notes: string | null
        createdAt: string
    }>
    createdBy: {
        name: string
    }
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [paying, setPaying] = useState(false)

    useEffect(() => {
        fetchInvoice()
    }, [id])

    const fetchInvoice = async () => {
        try {
            const res = await fetch(`/api/invoices/${id}`)
            const data = await res.json()
            if (data.success) {
                setInvoice(data.data)
                // Pre-fill payment amount with balance due
                setPaymentForm(prev => ({ ...prev, amount: Number(data.data.balanceDue) }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!invoice || paymentForm.amount <= 0) return

        setSubmitting(true)
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentForm)
            })
            const data = await res.json()
            
            if (data.success) {
                // Refresh invoice
                await fetchInvoice()
                setShowPaymentModal(false)
                // Reset form
                setPaymentForm({
                    amount: 0,
                    paymentMethod: 'CASH',
                    reference: '',
                    notes: ''
                })
                alert('Payment recorded successfully!')
            } else {
                alert(data.error || 'Failed to record payment')
            }
        } catch (err) {
            alert('Failed to record payment')
        } finally {
            setSubmitting(false)
        }
    }

    const handlePayOnline = async () => {
        if (!invoice) return
        
        // Validation: Paystack needs an email
        if (!invoice.customer.email) {
            alert('Mobile Money/Card payments require a customer email address. Please update the customer profile first.')
            return
        }

        setPaying(true)
        try {
            const res = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentType: 'INVOICE',
                    referenceId: invoice.id,
                    amount: invoice.balanceDue,
                    email: invoice.customer.email
                })
            })

            const data = await res.json()
            if (data.authorization_url) {
                // Redirect to Paystack checkout
                window.location.href = data.authorization_url
            } else {
                alert('Failed to initialize payment gateway')
            }
        } catch (err) {
            console.error(err)
            alert('An error occurred while connecting to the payment gateway')
        } finally {
            setPaying(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/30'
            case 'SENT': return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/30'
            case 'OVERDUE': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/30'
            case 'DRAFT': return 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/30'
            default: return 'bg-slate-50 text-slate-600 border-slate-200'
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[600px]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-executive-dark rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium animate-pulse">Retrieving invoice details...</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (!invoice) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Invoice Not Found</h3>
                    <p className="text-slate-500 max-w-sm mb-6">The invoice you are looking for does not exist or has been deleted.</p>
                    <Link href="/invoices" className="btn-executive">
                        ← Back to Invoices
                    </Link>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 no-print">
                            <Link href="/invoices" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors group">
                                <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Invoice Details</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">
                                {invoice.invoiceNumber}
                            </h1>
                            <span className={`px-4 py-1.5 text-xs font-bold rounded-full border ring-1 uppercase tracking-widest ${getStatusStyle(invoice.status)}`}>
                                {invoice.status}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500 border-l-2 border-slate-200 pl-4">
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Created By</span>
                                <span className="font-medium text-slate-700">{invoice.createdBy.name}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Issue Date</span>
                                <span className="font-medium text-slate-700">{formatDate(invoice.createdAt)}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</span>
                                <span className={`font-medium ${new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {formatDate(invoice.dueDate)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {invoice.status !== 'PAID' && Number(invoice.balanceDue) > 0 && (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => window.print()}
                                className="btn-executive hidden md:flex"
                            >
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print
                            </button>
                            <button 
                                onClick={handlePayOnline}
                                disabled={paying}
                                className="btn-executive-dark px-8 py-3 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20"
                            >
                                {paying ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3-3v8a3 3 0 003 3z" />
                                    </svg>
                                )}
                                Pay Online
                            </button>
                            <button 
                                onClick={() => setShowPaymentModal(true)}
                                className="btn-executive-accent px-8 py-3 shadow-lg shadow-executive-accent/20 hover:shadow-executive-accent/30"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Record Payment
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Customer & Sale Info */}
                        <div className="executive-card p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Client Information</h2>
                                <Link 
                                    href={`/customers/${invoice.customer.id}`}
                                    className="text-xs font-bold text-executive-accent hover:text-executive-accent-dark hover:underline flex items-center gap-1"
                                >
                                    View Profile 
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m-6-6L10 14" /></svg>
                                </Link>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                                    <p className="text-lg font-bold text-slate-900">{invoice.customer.name}</p>
                                    <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                                        <p>{invoice.customer.email || 'No email'}</p>
                                        <p>{invoice.customer.phone || 'No phone'}</p>
                                    </div>
                                </div>
                                <div className="border-l border-slate-100 pl-8">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Status</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm text-slate-500">Current Balance:</span>
                                        <span className="text-lg font-bold text-slate-900">{formatCurrency(Number(invoice.customer.currentBalance))}</span>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Related Sale</p>
                                        <Link href={`/sales`} className="text-sm font-medium text-blue-600 hover:underline">
                                            #{invoice.sale.saleNumber}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="executive-card p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoice Items</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest py-4 px-6">Product</th>
                                            <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-4 px-6 w-24">Qty</th>
                                            <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest py-4 px-6 w-32">Unit Price</th>
                                            <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest py-4 px-6 w-32">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {invoice.sale.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-5 px-6">
                                                    <p className="font-bold text-slate-900 group-hover:text-executive-dark transition-colors">{item.product.name}</p>
                                                    <p className="text-xs text-slate-400 font-mono mt-0.5">{item.product.sku}</p>
                                                </td>
                                                <td className="py-5 px-6 text-center text-sm font-medium text-slate-700">{item.quantity}</td>
                                                <td className="py-5 px-6 text-right text-sm text-slate-600 tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                                                <td className="py-5 px-6 text-right text-sm font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50/50 border-t border-slate-100">
                                        <tr>
                                            <td colSpan={3} className="py-4 px-6 text-right text-sm font-medium text-slate-500">Subtotal</td>
                                            <td className="py-4 px-6 text-right text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(Number(invoice.totalAmount))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="executive-card p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payment History</h2>
                                <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                                    {invoice.payments.length} Transaction{invoice.payments.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            
                            {invoice.payments.length === 0 ? (
                                <div className="text-center py-12 px-6">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-slate-100">
                                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">No Payments Recorded</h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">This invoice is currently unpaid. Use the 'Record Payment' button to log transactions.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {invoice.payments.map((payment) => (
                                        <div key={payment.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center ring-1 ring-emerald-100">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(payment.amount))}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="uppercase tracking-wider font-semibold">{payment.paymentMethod.replace('_', ' ')}</span>
                                                        {payment.reference && (
                                                            <>
                                                                <span className="w-1 H-1 rounded-full bg-slate-300"></span>
                                                                <span className="font-mono">{payment.reference}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
                                                <p className="text-sm font-medium text-slate-700">{formatDate(payment.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="executive-card p-6 bg-gradient-to-br from-white to-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Payment Summary</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium text-slate-600">Total Amount</span>
                                    <span className="text-lg font-bold text-slate-900">{formatCurrency(Number(invoice.totalAmount))}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium text-slate-600">Total Paid</span>
                                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(invoice.totalPaid)}</span>
                                </div>
                                
                                <div className="my-6 border-t border-slate-200 border-dashed"></div>
                                
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Due</p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-3xl font-display font-black tracking-tight ${Number(invoice.balanceDue) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(Number(invoice.balanceDue))}
                                        </span>
                                        {Number(invoice.balanceDue) > 0 && (
                                            <span className="flex h-3 w-3 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Card */}
                        {invoice.notes && (
                            <div className="executive-card p-6">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Notes</h2>
                                <p className="text-sm text-slate-600 leading-relaxed italic bg-amber-50/50 p-4 rounded-lg border border-amber-100 text-amber-900">
                                    "{invoice.notes}"
                                </p>
                            </div>
                        )}

                        {/* Help / UX Tip */}
                        {invoice.status !== 'PAID' && Number(invoice.balanceDue) > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 no-print">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">Payment Tip</p>
                                        <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                            You can record <strong>partial payments</strong> (e.g., GHS 20 today). 
                                            For <strong>split payments</strong> (MoMo + Cash), please record separate transactions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-executive ring-1 ring-slate-900/5">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 font-display">Record Payment</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">Invoice #{invoice.invoiceNumber}</p>
                            </div>
                            <button 
                                onClick={() => setShowPaymentModal(false)} 
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Amount to Pay
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 group-focus-within:text-executive-dark transition-colors">GHS</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={Number(invoice.balanceDue)}
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: +e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-14 pr-4 py-3 text-lg font-bold text-slate-900 focus:bg-white focus:border-executive-dark focus:ring-1 focus:ring-executive-dark/10 transition-all outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs">
                                    <span className="text-slate-400">Balance Due:</span>
                                    <span className="font-bold text-slate-700">{formatCurrency(Number(invoice.balanceDue))}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentForm.paymentMethod}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-executive-dark focus:ring-1 focus:ring-executive-dark/10 transition-all outline-none appearance-none"
                                    required
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="MOBILE_MONEY">Mobile Money</option>
                                    <option value="CARD">Card</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Reference <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-executive-dark focus:ring-1 focus:ring-executive-dark/10 transition-all outline-none"
                                        placeholder="Ref No."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Notes <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-executive-dark focus:ring-1 focus:ring-executive-dark/10 transition-all outline-none"
                                        placeholder="Remarks"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="w-full btn-executive-accent py-4 text-base shadow-xl shadow-executive-accent/20 hover:shadow-executive-accent/30 hover:-translate-y-0.5 transition-all"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        'Confirm Payment'
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-full mt-3 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
