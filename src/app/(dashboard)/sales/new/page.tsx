'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRouter, useSearchParams } from 'next/navigation'

interface Product {
    id: string
    name: string
    sku: string
    sellingPrice: number
    totalStock: number
    categoryId?: string
    category?: { id: string, name: string }
}

interface CartItem extends Product {
    quantity: number
    unitPrice: number
}

interface Location {
    id: string
    name: string
}

interface Category {
    id: string
    name: string
}

export default function NewSalePage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Data State
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    // UI State
    const [selectedLocation, setSelectedLocation] = useState('')
    const [customerId, setCustomerId] = useState('')
    const [activeCategory, setActiveCategory] = useState('ALL')
    const [search, setSearch] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [lastSaleData, setLastSaleData] = useState<any>(null)
    
    // Edit Modal State
    const [editingItem, setEditingItem] = useState<CartItem | null>(null)
    const [editPrice, setEditPrice] = useState('')

    // Cart & Payment State
    const [cart, setCart] = useState<CartItem[]>([])
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [amountTendered, setAmountTendered] = useState('')
    const [partialPaymentMethod, setPartialPaymentMethod] = useState('CASH')
    const [partialAmount, setPartialAmount] = useState('0')

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchData = async () => {
            const [pRes, lRes, cRes, catRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/locations'),
                fetch('/api/customers'),
                fetch('/api/categories')
            ])

            const [pData, lData, cData, catData] = await Promise.all([
                pRes.json(), lRes.json(), cRes.json(), catRes.json()
            ])

            if (pData.success) setProducts(pData.data)

            if (lData.success) {
                setLocations(lData.data)
                if (lData.data.length > 0) setSelectedLocation(lData.data[0].id)
            }

            if (cData.success) setCustomers(cData.data)
            if (catData.success) setCategories(catData.data)

            // Pre-select customer
            const cid = searchParams.get('customerId')
            if (cid) setCustomerId(cid)
        }
        fetchData()
    }, [searchParams])

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'F2') searchInputRef.current?.focus()
            if (e.key === 'Escape') setAmountTendered('')
        }
        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [])

    // Customer Pricing State
    const [customerPrices, setCustomerPrices] = useState<Record<string, number>>({})

    // ... existing refs ...

    useEffect(() => {
        if (customerId) {
            fetch(`/api/customers/${customerId}/prices`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const prices: Record<string, number> = {}
                        data.data.forEach((p: any) => prices[p.productId] = Number(p.price))
                        setCustomerPrices(prices)
                    }
                })
        } else {
            setCustomerPrices({})
        }
    }, [customerId])

    // Update cart when customer prices change
    useEffect(() => {
        setCart(prev => prev.map(item => {
            // If item has a manual price override (different from standard AND different from special), keep it? 
            // For simplicity, we auto-apply special price if available, else revert to standard sellingPrice
            // OR we only update if the current price matches standard price? 
            // Let's force update to special price if available, otherwise keep current (if manual) or reset to standard?
            // Safer approach: If special price exists, apply it. If not, should we revert? 
            // Let's just apply special price if it exists.
            if (customerPrices[item.id]) {
                return { ...item, unitPrice: customerPrices[item.id] }
            }
            // If no special price, but we just switched from a customer with special price to one without, 
            // we might want to revert to standard price. 
            // But if user manually edited, we shouldn't overwrite.
            // Complex logic. simple v1: Always apply special price if exists.
            return item
        }))
    }, [customerPrices])


    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'ALL' ||
            p.categoryId === activeCategory ||
            p.category?.id === activeCategory
        return matchesSearch && matchesCategory
    })

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            const price = customerPrices[product.id] || Number(product.sellingPrice)
            
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            }
            return [...prev, { ...product, quantity: 1, unitPrice: price }]
        })
    }

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) }
            }
            return item
        }).filter(item => item.quantity > 0))
    }
    
    const updatePrice = (id: string, newPrice: number) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, unitPrice: newPrice } : item))
        setEditingItem(null)
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const changeDue = paymentMethod === 'CASH' && amountTendered
        ? Number(amountTendered) - cartTotal
        : 0

    const handleCheckout = async () => {
        if (cart.length === 0 || !selectedLocation) return
        if (paymentMethod === 'CASH' && Number(amountTendered) < cartTotal) {
            alert('Amount tendered is less than total')
            return
        }

        setSubmitting(true)
        const payload = {
            locationId: selectedLocation,
            customerId: customerId || null,
            paymentMethod: paymentMethod === 'CREDIT' ? partialPaymentMethod : paymentMethod,
            isCredit: paymentMethod === 'CREDIT',
            amountPaid: paymentMethod === 'CASH'
                ? Number(amountTendered)
                : (paymentMethod === 'CREDIT' ? Number(partialAmount) : cartTotal),
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                unitPrice: item.sellingPrice, // Send original price as base
                discount: (item.sellingPrice - item.unitPrice) * item.quantity // Discount is the difference
            }))
        }

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (data.success) {
                setLastSaleData({ ...data.data, changeDue }) // Store sale data for receipt
                setShowReceipt(true)
                // Clear state
                setCart([])
                setAmountTendered('')
                setSearch('')
            } else {
                alert(data.error || 'Transaction Declined')
            }
        } catch (err) {
            console.error(err)
            alert('Connection failure')
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    return (
        <DashboardLayout>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">

                {/* === LEFT PANEL: CATALOG === */}
                <div className="lg:col-span-8 flex flex-col space-y-4 h-full">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-executive-dark rounded-xl flex items-center justify-center text-white">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">Register Terminal</h1>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href="/finance"
                                className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Manage Register
                            </Link>
                            <select
                                value={selectedLocation}
                                onChange={e => setSelectedLocation(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2 outline-none focus:border-executive-accent"
                            >
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <input
                                ref={searchInputRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search Product (F2)"
                                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-4 py-2 w-64 outline-none focus:border-executive-accent focus:ring-2 focus:ring-executive-accent/10 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveCategory('ALL')}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === 'ALL'
                                ? 'bg-executive-dark text-white'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.id
                                    ? 'bg-executive-dark text-white'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-executive-accent hover:shadow-lg transition-all text-left flex flex-col h-32 group"
                                >
                                    <div className="flex-1">
                                        <h3 className="text-xs font-bold text-slate-700 group-hover:text-executive-dark line-clamp-2 leading-tight mb-1">{product.name}</h3>
                                        <p className="text-[10px] font-medium text-slate-400">{product.totalStock} in stock</p>
                                    </div>
                                    <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center">
                                        <span className="text-sm font-black text-slate-900">{formatCurrency(product.sellingPrice)}</span>
                                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-executive-accent group-hover:text-white transition-colors">
                                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* === RIGHT PANEL: CART & PAY === */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden h-full">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Current Sale</span>
                        </div>
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-lg px-2 py-1 outline-none w-40"
                        >
                            <option value="">Guest Customer</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                <p className="text-xs font-bold uppercase tracking-widest mt-2">Empty Cart</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-start group">
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center text-xs transition-colors">▲</button>
                                            <span className="text-xs font-black text-slate-700">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500 flex items-center justify-center text-xs transition-colors">▼</button>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 leading-tight w-32 line-clamp-2">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {customerPrices[item.id] && (
                                                        <span className="bg-executive-dark text-white px-1 rounded text-[9px] font-bold mr-1">SPL</span>
                                                    )}
                                                    {item.unitPrice < item.sellingPrice && !customerPrices[item.id] && (
                                                        <span className="line-through decoration-danger mr-1">{formatCurrency(item.sellingPrice)}</span>
                                                    )}
                                                    {formatCurrency(item.unitPrice)} /unit
                                                </p>
                                                <button 
                                                    onClick={() => { setEditingItem(item); setEditPrice(item.unitPrice.toString()) }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-executive-dark transition-all"
                                                    title="Edit Price / Discount"
                                                >
                                                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Payment Deck */}
                    <div className="bg-white p-5 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
                        {/* Totals */}
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span>{formatCurrency(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between items-end pb-4 border-b border-slate-100">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Total Due</span>
                                <span className="text-3xl font-black text-executive-dark">{formatCurrency(cartTotal)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="space-y-4">
                            {/* Method Selector */}
                            <div className="grid grid-cols-3 gap-2">
                                {['CASH', 'MOMO', 'CARD', 'CREDIT'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setPaymentMethod(m)}
                                        disabled={m === 'CREDIT' && !customerId}
                                        className={`py-2 text-[10px] font-black rounded-lg border uppercase tracking-widest transition-all ${paymentMethod === m
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : m === 'CREDIT' && !customerId
                                                ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed'
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                        title={m === 'CREDIT' && !customerId ? 'Select a customer to use credit' : ''}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* Credit / Partial Payment Details */}
                            {paymentMethod === 'CREDIT' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Down Payment Method</span>
                                        <div className="flex gap-1">
                                            {['CASH', 'MOMO', 'CARD'].map(pm => (
                                                <button
                                                    key={pm}
                                                    type="button"
                                                    onClick={() => setPartialPaymentMethod(pm)}
                                                    className={`px-3 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all ${partialPaymentMethod === pm ? 'bg-executive-dark text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                                                >
                                                    {pm}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid Now</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₵</span>
                                            <input
                                                type="number"
                                                value={partialAmount}
                                                onChange={e => setPartialAmount(e.target.value)}
                                                className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-executive-accent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-400 uppercase tracking-widest">Balance to Credit</span>
                                        <span className="font-black text-danger">{formatCurrency(Math.max(0, cartTotal - Number(partialAmount)))}</span>
                                    </div>
                                </div>
                            )}

                            {/* Cash Tendered Input (Only for Cash) */}
                            {paymentMethod === 'CASH' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₵</span>
                                        <input
                                            type="number"
                                            value={amountTendered}
                                            onChange={e => setAmountTendered(e.target.value)}
                                            placeholder="Enter Tendered"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 outline-none focus:border-executive-accent"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change Due</span>
                                        <span className={`text-lg font-black ${changeDue >= 0 ? 'text-emerald-500' : 'text-danger'}`}>
                                            {formatCurrency(changeDue)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Process Button */}
                            <button
                                onClick={handleCheckout}
                                disabled={submitting || cart.length === 0}
                                className="w-full py-4 bg-executive-accent hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Processing...' : `Pay ${formatCurrency(cartTotal)}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* === RECEIPT MODAL === */}
            {showReceipt && lastSaleData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Sale Complete</h2>
                                <p className="text-slate-400 font-medium text-sm mt-1">{lastSaleData.saleNumber}</p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                {lastSaleData.paymentType === 'CASH' ? (
                                    <>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Total Paid</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(lastSaleData.totalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Change</span>
                                            <span className="font-black text-emerald-600 text-lg">{formatCurrency(lastSaleData.changeGiven || lastSaleData.changeDue || 0)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Down Payment ({lastSaleData.paymentMethod?.replace('_', ' ')})</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(lastSaleData.amountPaid)}</span>
                                        </div>
                                        {Number(lastSaleData.creditAmount) > 0 && (
                                            <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2">
                                                <span className="text-danger font-black uppercase tracking-widest text-[10px]">Bal. Outstanding</span>
                                                <span className="font-black text-danger text-lg">{formatCurrency(Number(lastSaleData.creditAmount))}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => window.open(`/receipts/${lastSaleData.id}`, '_blank', 'width=400,height=600')}
                                    className="py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Print Receipt
                                </button>
                                <button
                                    onClick={() => setShowReceipt(false)}
                                    className="py-3 bg-executive-dark text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg transition-all"
                                >
                                    New Sale
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === PRICE EDIT MODAL === */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Adjust Price</h3>
                            <p className="text-xs text-slate-500 mt-1">{editingItem.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">New Unit Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₵</span>
                                    <input
                                        type="number"
                                        value={editPrice}
                                        onChange={e => setEditPrice(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 outline-none focus:border-executive-accent"
                                        autoFocus
                                    />
                                </div>
                                {Number(editPrice) < editingItem.sellingPrice && (
                                    <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        Discount: {(((editingItem.sellingPrice - Number(editPrice)) / editingItem.sellingPrice) * 100).toFixed(1)}% off
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setEditingItem(null)} className="py-3 btn-executive">Cancel</button>
                                <button onClick={() => updatePrice(editingItem.id, Number(editPrice))} className="py-3 btn-executive-accent">Apply Change</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
