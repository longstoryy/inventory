'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface CreditTransaction {
    id: string
    type: 'CREDIT' | 'PAYMENT' | 'ADJUSTMENT'
    amount: number
    balanceAfter: number
    reference: string | null
    notes: string | null
    createdAt: string
    sale?: { id: string, saleNumber: string }
}

interface Customer {
    id: string
    code: string
    name: string
    type: 'INDIVIDUAL' | 'BUSINESS'
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    country: string | null
    taxId: string | null
    creditLimit: number
    currentBalance: number
    creditStatus: 'GOOD' | 'WARNING' | 'BLOCKED'
    paymentTerms: string | null
    notes: string | null
    isActive: boolean
    _count: { sales: number }
    creditTransactions: CreditTransaction[]
}

export default function CustomerDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<Partial<Customer>>({})
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'CASH', reference: '', notes: '' })
    const [processingPayment, setProcessingPayment] = useState(false)
    
    // New Tab State
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PRICES'>('OVERVIEW')

    useEffect(() => {
        fetchCustomer()
    }, [params.id])

    const fetchCustomer = async () => {
        try {
            const res = await fetch(`/api/customers/${params.id}`)
            const data = await res.json()
            if (data.success) {
                setCustomer(data.data)
                setForm(data.data)
            } else {
                alert('Customer not found')
                router.push('/customers')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!form.name?.trim()) return alert('Name is required')
        setSaving(true)
        try {
            const res = await fetch(`/api/customers/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success) {
                setCustomer(data.data)
                setForm(data.data)
                setEditing(false)
            } else {
                alert(data.error || 'Failed to update customer')
            }
        } catch { alert('Failed to save') }
        finally { setSaving(false) }
    }

    const handleRecordPayment = async () => {
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            alert('Please enter a valid amount')
            return
        }
        setProcessingPayment(true)
        try {
            const res = await fetch(`/api/customers/${params.id}/quick-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(paymentForm.amount),
                    paymentMethod: paymentForm.method,
                    reference: paymentForm.reference,
                    notes: paymentForm.notes
                }),
            })
            const data = await res.json()
            if (data.success) {
                setShowPaymentModal(false)
                setPaymentForm({ amount: '', method: 'CASH', reference: '', notes: '' })
                fetchCustomer() // Refresh data
                // Show success message with details
                const appliedTo = data.data.map((p: any) => `${p.invoiceNumber} (GHS ${p.amount})`).join(', ')
                alert(`✅ Payment recorded!\n\nApplied to: ${appliedTo}`)
            } else {
                alert(data.error || 'Failed to record payment')
            }
        } catch { alert('Network error') } finally { setProcessingPayment(false) }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)
    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'GOOD': return 'bg-success/10 text-success border-success/10'
            case 'WARNING': return 'bg-warning/10 text-warning border-warning/10'
            case 'BLOCKED': return 'bg-danger/10 text-danger border-danger/10'
            default: return 'bg-slate-100 text-slate-500'
        }
    }
    const getTransactionStyle = (t: string) => {
        switch (t) {
            case 'CREDIT': return 'text-danger'
            case 'PAYMENT': return 'text-success'
            default: return 'text-slate-600'
        }
    }

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>
    if (!customer) return <DashboardLayout><p>Customer not found</p></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-executive-dark">{customer.name}</h1>
                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase ${getStatusStyle(customer.creditStatus)}`}>{customer.creditStatus}</span>
                            </div>
                            <p className="text-slate-500 mt-1 text-sm">{customer.code} • {customer.type}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        {editing ? (
                            <>
                                <button onClick={() => setEditing(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="btn-executive-accent px-8 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => router.push(`/sales/new?customerId=${customer.id}`)}
                                    className="px-6 py-3 rounded-xl bg-executive-dark text-white font-bold text-sm hover:bg-executive-accent transition-all flex items-center gap-2"
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    Initialize Sale
                                </button>
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="px-6 py-3 rounded-xl bg-success text-white font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Record Payment
                                </button>
                                <button onClick={() => setEditing(true)} className="btn-executive-accent px-8">Edit Customer</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'OVERVIEW' ? 'border-executive-dark text-executive-dark' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('PRICES')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'PRICES' ? 'border-executive-dark text-executive-dark' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Price List
                    </button>
                </div>

                {/* Repayment Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-executive-dark">Record Repayment</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            {/* UX Guidance Note */}
                            <div className="p-4 bg-blue-50 border-b border-blue-100">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs font-bold text-blue-900">💡 Quick Payment Mode</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            This payment will <strong>automatically apply</strong> to the customer&apos;s oldest outstanding invoices first (FIFO). For specific invoice payments, visit the invoice detail page.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="font-bold text-slate-500">Current Outstanding</span>
                                        <span className="font-black text-danger">{formatCurrency(Number(customer.currentBalance))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500">Balance After</span>
                                        <span className="font-black text-executive-dark">{formatCurrency(Math.max(0, Number(customer.currentBalance) - Number(paymentForm.amount || 0)))}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₵</span>
                                        <input
                                            type="number"
                                            value={paymentForm.amount}
                                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-executive-accent"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['CASH', 'MOMO', 'CARD'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setPaymentForm({ ...paymentForm, method: m })}
                                                className={`py-2 text-xs font-bold rounded-lg border uppercase ${paymentForm.method === m ? 'bg-executive-dark text-white border-executive-dark' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference (Optional)</label>
                                    <input
                                        value={paymentForm.reference}
                                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-executive-accent"
                                        placeholder="e.g. TRX-12345"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                                    <textarea
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-executive-accent h-20 resize-none"
                                        placeholder="Any additional details..."
                                    />
                                </div>
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={processingPayment}
                                    className="w-full py-4 bg-success text-white rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {processingPayment ? 'Processing...' : 'Record Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total Sales</p><p className="text-3xl font-black text-executive-dark">{customer._count.sales}</p></div>
                            <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Credit Limit</p><p className="text-3xl font-black text-executive-dark">{formatCurrency(Number(customer.creditLimit))}</p></div>
                            <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Current Balance</p><p className={`text-3xl font-black ${Number(customer.currentBalance) > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Number(customer.currentBalance))}</p></div>
                            <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Available Credit</p><p className="text-3xl font-black text-success">{formatCurrency(Math.max(0, Number(customer.creditLimit) - Number(customer.currentBalance)))}</p></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 executive-card p-6">
                                <h2 className="text-lg font-bold text-executive-dark mb-5">Contact Information</h2>
                                {editing ? (
                                    <div className="space-y-4">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label><input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label><input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country</label><input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        </div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax ID</label><input value={form.taxId || ''} onChange={e => setForm({ ...form, taxId: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credit Limit</label><input type="number" value={form.creditLimit || 0} onChange={e => setForm({ ...form, creditLimit: +e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-sm">
                                        <div><span className="text-slate-400">Email:</span> <span className="font-medium">{customer.email || '—'}</span></div>
                                        <div><span className="text-slate-400">Phone:</span> <span className="font-medium">{customer.phone || '—'}</span></div>
                                        <div><span className="text-slate-400">Address:</span> <span className="font-medium">{customer.address || '—'}</span></div>
                                        <div><span className="text-slate-400">City:</span> <span className="font-medium">{customer.city || '—'}</span></div>
                                        <div><span className="text-slate-400">Country:</span> <span className="font-medium">{customer.country || '—'}</span></div>
                                        <div><span className="text-slate-400">Tax ID:</span> <span className="font-medium">{customer.taxId || '—'}</span></div>
                                        <div><span className="text-slate-400">Payment Terms:</span> <span className="font-medium">{customer.paymentTerms || '—'}</span></div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-2 executive-card p-6">
                                <h2 className="text-lg font-bold text-executive-dark mb-5">Credit History</h2>
                                {customer.creditTransactions?.length ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="border-b"><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Date</th><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Type</th><th className="text-left py-2 text-xs font-bold text-slate-400 uppercase">Document</th><th className="text-right py-2 text-xs font-bold text-slate-400 uppercase">Amount</th><th className="text-right py-2 text-xs font-bold text-slate-400 uppercase">Balance</th></tr></thead>
                                            <tbody>
                                                {customer.creditTransactions.map(tx => (
                                                    <tr key={tx.id} className="border-b border-slate-50">
                                                        <td className="py-3">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                        <td className={`py-3 font-bold ${getTransactionStyle(tx.type)}`}>{tx.type}</td>
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-500 font-mono text-xs">{tx.sale?.saleNumber || tx.reference || '—'}</span>
                                                                {tx.sale?.id && (
                                                                    <button
                                                                        onClick={() => window.open(`/receipts/${tx.sale!.id}`, 'Receipt', 'width=400,height=600')}
                                                                        className="p-1 px-2 bg-slate-100 text-[9px] font-black text-executive-accent hover:bg-executive-accent hover:text-white rounded transition-all uppercase"
                                                                        title="View Items Bought"
                                                                    >
                                                                        Observe Items
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={`py-3 text-right font-bold ${getTransactionStyle(tx.type)}`}>{tx.type === 'PAYMENT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}</td>
                                                        <td className="py-3 text-right font-bold">{formatCurrency(Number(tx.balanceAfter))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center"><p className="text-sm text-slate-400">No credit transactions yet.</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'PRICES' && (
                     <CustomerPriceList customerId={customer.id} />
                )}
            </div>
        </DashboardLayout>
    )
}

function CustomerPriceList({ customerId }: { customerId: string }) {
    const [prices, setPrices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [products, setProducts] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [newPrice, setNewPrice] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchPrices()
    }, [customerId])

    useEffect(() => {
        if (showAdd && searchTerm.length > 2) {
            const timer = setTimeout(fetchProducts, 500)
            return () => clearTimeout(timer)
        }
    }, [searchTerm, showAdd])

    const fetchPrices = async () => {
        try {
            const res = await fetch(`/api/customers/${customerId}/prices`)
            const data = await res.json()
            if (data.success) setPrices(data.data)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/api/products?search=${searchTerm}`)
            const data = await res.json()
            if (data.success) setProducts(data.data)
        } catch (err) { console.error(err) }
    }

    const handleSavePrice = async () => {
        if (!selectedProduct || !newPrice) return
        setSaving(true)
        try {
            const res = await fetch(`/api/customers/${customerId}/prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: selectedProduct.id, price: newPrice })
            })
            const data = await res.json()
            if (data.success) {
                setShowAdd(false)
                setSearchTerm('')
                setSelectedProduct(null)
                setNewPrice('')
                fetchPrices()
            } else {
                alert('Failed to save')
            }
        } catch (err) { alert('Error saving') }
        finally { setSaving(false) }
    }

    const handleDelete = async (productId: string) => {
        if(!confirm('Remove this special price?')) return
        try {
            const res = await fetch(`/api/customers/${customerId}/prices?productId=${productId}`, { method: 'DELETE' })
            if (res.ok) fetchPrices()
        } catch(err) { alert('Failed to delete') }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-executive-dark">Wholesale & Special Prices</h2>
                <button onClick={() => setShowAdd(true)} className="btn-executive-dark flex items-center gap-2 px-4 py-2 text-sm">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg>
                    Add Special Price
                </button>
            </div>

            {showAdd && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Add New Price Rule</h3>
                        <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search product to add..."
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-executive-accent"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {products.length > 0 && searchTerm && !selectedProduct && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-10 p-1">
                                    {products.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => { setSelectedProduct(p); setSearchTerm(p.name); setProducts([]) }}
                                            className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex justify-between items-center group"
                                        >
                                            <span className="font-medium text-slate-700 text-sm">{p.name}</span>
                                            <span className="text-xs text-slate-400">Std: {formatCurrency(p.sellingPrice)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedProduct && (
                             <div className="flex items-center gap-4 animate-in fade-in">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">GHS</span>
                                    <input 
                                        type="number" 
                                        placeholder="Special Price"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-executive-accent outline-none ring-2 ring-executive-accent/10 font-bold text-executive-dark"
                                        value={newPrice}
                                        onChange={e => setNewPrice(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button onClick={handleSavePrice} disabled={saving} className="btn-executive-accent px-6 py-3 text-sm">
                                    {saving ? 'Saving...' : 'Save Price'}
                                </button>
                            </div>
                        )}
                    </div>
                    {selectedProduct && (
                         <div className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100 inline-block">
                            Selected: <span className="font-bold text-slate-700">{selectedProduct.name}</span> • Standard Price: <span className="line-through decoration-danger">{formatCurrency(selectedProduct.sellingPrice)}</span>
                         </div>
                    )}
                </div>
            )}

            <div className="executive-card overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="py-4 px-6 font-bold text-slate-400 uppercase text-xs">Product</th>
                            <th className="py-4 px-6 font-bold text-slate-400 uppercase text-xs">Standard Price</th>
                            <th className="py-4 px-6 font-bold text-executive-dark uppercase text-xs">Customer Price</th>
                            <th className="py-4 px-6 font-bold text-slate-400 uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading prices...</td></tr>
                        ) : prices.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">No special prices set for this customer.</td></tr>
                        ) : (
                            prices.map(item => (
                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-slate-700">{item.product.name}</td>
                                    <td className="py-4 px-6 text-slate-400 line-through decoration-slate-300">{formatCurrency(item.product.sellingPrice)}</td>
                                    <td className="py-4 px-6 font-bold text-success">{formatCurrency(item.price)}</td>
                                    <td className="py-4 px-6 text-right">
                                        <button onClick={() => handleDelete(item.product.id)} className="text-slate-400 hover:text-danger p-2 hover:bg-danger/10 rounded-lg transition-all">
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
