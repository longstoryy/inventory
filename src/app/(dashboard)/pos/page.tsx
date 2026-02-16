'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
    id: string
    name: string
    sku: string
    sellingPrice: number
    costPrice: number
    taxRate: number
}

interface Customer {
    id: string
    name: string
    creditLimit: number
    currentBalance: number
    creditStatus: string
}

interface Location {
    id: string
    name: string
}

interface CartItem {
    productId: string
    name: string
    sku: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    total: number
}

export default function POSPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedLocation, setSelectedLocation] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [amountPaid, setAmountPaid] = useState('')
    const [isCredit, setIsCredit] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (search.length >= 2) {
            searchProducts()
        } else {
            setProducts([])
        }
    }, [search])

    const fetchData = async () => {
        try {
            const [locRes, custRes] = await Promise.all([
                fetch('/api/locations'),
                fetch('/api/customers'),
            ])
            const [locData, custData] = await Promise.all([locRes.json(), custRes.json()])
            if (locData.success) {
                setLocations(locData.data)
                if (locData.data.length > 0) setSelectedLocation(locData.data[0].id)
            }
            if (custData.success) setCustomers(custData.data)
        } catch (error) {
            console.error('Fetch data error:', error)
        } finally {
            setLoading(false)
        }
    }

    const searchProducts = async () => {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=10`)
        const data = await res.json()
        if (data.success) setProducts(data.data)
    }

    const addToCart = (product: Product) => {
        const existing = cart.find((item) => item.productId === product.id)
        if (existing) {
            setCart(cart.map((item) =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice * (1 + item.tax / 100) - item.discount }
                    : item
            ))
        } else {
            const tax = product.sellingPrice * (product.taxRate / 100)
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                quantity: 1,
                unitPrice: product.sellingPrice,
                discount: 0,
                tax: product.taxRate,
                total: product.sellingPrice + tax,
            }])
        }
        setSearch('')
        setProducts([])
    }

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart(cart.filter((item) => item.productId !== productId))
        } else {
            setCart(cart.map((item) =>
                item.productId === productId
                    ? { ...item, quantity, total: quantity * item.unitPrice * (1 + item.tax / 100) - item.discount }
                    : item
            ))
        }
    }

    const removeItem = (productId: string) => {
        setCart(cart.filter((item) => item.productId !== productId))
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const totalTax = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.tax / 100), 0)
    const grandTotal = subtotal + totalTax
    const paidValue = parseFloat(amountPaid) || 0
    const change = !isCredit && paidValue > grandTotal ? paidValue - grandTotal : 0

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount)

    const handleCheckout = async () => {
        if (!selectedLocation) { setError('Target node selection required.'); return }
        if (cart.length === 0) { setError('Payload registry is empty.'); return }
        if (isCredit && !selectedCustomer) { setError('Counterparty profiling required for credit terminal.'); return }

        setProcessing(true)
        setError('')

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: selectedLocation,
                    customerId: selectedCustomer || null,
                    items: cart.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                    })),
                    paymentMethod: isCredit ? 'CREDIT' : paymentMethod,
                    amountPaid: isCredit ? 0 : (parseFloat(amountPaid) || grandTotal),
                    isCredit,
                }),
            })
            const data = await res.json()
            if (!data.success) {
                setError(data.error)
                return
            }
            alert(`Transaction Finalized. Invoice: ${data.data.invoiceNumber}`)
            setCart([])
            setAmountPaid('')
            setSelectedCustomer('')
            setIsCredit(false)
        } catch {
            setError('Operational failure during transaction commitment.')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Booting POS Terminal...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Point of Sale</h1>
                    <p className="text-sm text-slate-500">Process sales and manage cart items.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Store Branch</span>
                        <select
                            className="bg-transparent border-none text-sm font-semibold text-slate-900 focus:ring-0 cursor-pointer p-0"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                    <div className="w-px h-8 bg-zinc-200 mx-2" />
                    <button
                        className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                        onClick={() => router.push('/sales')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-6">
                {/* Product Search & Cart */}
                <div className="flex-1 flex flex-col min-w-0 gap-6">
                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-indigo-600 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                        <input
                            type="text"
                            className="form-input !pl-14 !py-4 !text-lg !rounded-xl !bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium"
                            placeholder="Search products by name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {products.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 border-b border-zinc-50 last:border-none transition-colors group/item text-left"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover/item:bg-white group-hover/item:text-indigo-600 transition-all border border-transparent group-hover/item:border-zinc-200">
                                                <span className="text-[10px] font-bold">{product.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-zinc-900">{product.name}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{product.sku}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-indigo-600">{formatCurrency(product.sellingPrice)}</div>
                                            <div className="text-[9px] font-bold text-zinc-400 uppercase">Available Unit Price</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 bg-white border border-zinc-200 rounded-3xl shadow-sm flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Current Cart ({cart.length} items)</h3>
                            {cart.length > 0 && (
                                <button
                                    className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors"
                                    onClick={() => setCart([])}
                                >
                                    Clear Cart
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 divide-y divide-zinc-50">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                    </div>
                                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Cart is empty</h4>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mt-1">Search for products to add to cart</p>
                                </div>
                            ) : cart.map((item) => (
                                <div key={item.productId} className="py-5 flex items-center gap-6 group hover:bg-zinc-50/50 -mx-6 px-6 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-zinc-900 truncate">{item.name}</div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-0.5">{item.sku} • {formatCurrency(item.unitPrice)}/unit</div>
                                    </div>
                                    <div className="flex items-center bg-zinc-100 rounded-2xl p-1 gap-4 border border-zinc-200">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-zinc-600 hover:text-indigo-600 transition-all active:scale-95 border border-zinc-100"
                                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        >-</button>
                                        <span className="text-xs font-bold text-zinc-900 w-6 text-center">{item.quantity}</span>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-zinc-600 hover:text-indigo-600 transition-all active:scale-95 border border-zinc-100"
                                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        >+</button>
                                    </div>
                                    <div className="w-28 text-right font-bold text-zinc-900">{formatCurrency(item.total)}</div>
                                    <button
                                        className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        onClick={() => removeItem(item.productId)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Checkout Panel */}
                <div className="w-[420px] flex flex-col gap-6">
                    {/* Customer Selection */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Customer Details</label>
                        <select
                            className="form-select !bg-zinc-50 border-transparent hover:border-zinc-200 font-bold text-xs !rounded-2xl py-3"
                            value={selectedCustomer}
                            onChange={(e) => {
                                setSelectedCustomer(e.target.value)
                                if (!e.target.value) setIsCredit(false)
                            }}
                        >
                            <option value="">Walk-in Customer</option>
                            {customers.map((cust) => (
                                <option key={cust.id} value={cust.id}>{cust.name}</option>
                            ))}
                        </select>

                        {selectedCustomer && (
                            <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                <div>
                                    <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Available Credit</div>
                                    <div className="font-bold text-indigo-700 text-sm">
                                        {formatCurrency(customers.find(c => c.id === selectedCustomer)?.creditLimit || 0)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsCredit(!isCredit)}>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isCredit ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-200'}`}>
                                        {isCredit && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Sell on Credit</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Control */}
                    {!isCredit && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col min-h-0">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {['CASH', 'CARD', 'MOBILE_MONEY'].map((method) => (
                                    <button
                                        key={method}
                                        className={`py-3 px-1 rounded-2xl text-[10px] font-bold text-center border-2 transition-all uppercase tracking-tighter ${paymentMethod === method ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200'}`}
                                        onClick={() => setPaymentMethod(method)}
                                    >
                                        {method.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2 flex-grow">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Amount Paid</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-400 font-bold">GH₵</div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input !pl-16 !py-5 !text-2xl font-bold bg-zinc-50 border-transparent focus:!bg-white focus:!border-indigo-200 focus:ring-0 !rounded-2xl"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder={grandTotal.toFixed(2)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Totals & Commit */}
                    <div className="bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="space-y-3 mb-8 opacity-60">
                                <div className="flex justify-between text-[11px] font-semibold uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-semibold uppercase tracking-widest">
                                    <span>Tax</span>
                                    <span>{formatCurrency(totalTax)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-8 pt-6 border-t border-white/10">
                                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">Total Amount</div>
                                <div className="text-4xl font-bold tracking-tight">{formatCurrency(grandTotal)}</div>
                            </div>

                            {change > 0 && (
                                <div className="mb-8 p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5 animate-pulse">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Client Change Liquidity</span>
                                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(change)}</span>
                                </div>
                            )}

                            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold rounded-2xl flex items-center gap-3 animate-shake"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>{error}</div>}

                            <button
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-5 rounded-xl text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:shadow-none"
                                onClick={handleCheckout}
                                disabled={processing || cart.length === 0}
                            >
                                {processing ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Processing Sale...
                                    </div>
                                ) : (
                                    `Complete Sale`
                                )}
                            </button>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    )
}
