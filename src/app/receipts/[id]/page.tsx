'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface SaleItem {
    id: string
    product: { name: string; sku: string }
    quantity: number
    unitPrice: number
    totalAmount: number
}

interface Sale {
    id: string
    saleNumber: string
    totalAmount: number
    paymentMethod: string
    paymentType: string
    amountPaid: number
    changeGiven: number
    creditAmount: number
    taxAmount: number
    status: string
    createdAt: string
    customer?: { name: string }
    location: { name: string }
    user: { name: string }
    items: SaleItem[]
}

export default function ReceiptPage() {
    const params = useParams()
    const [sale, setSale] = useState<Sale | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchSale = async () => {
            try {
                const res = await fetch(`/api/sales/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setSale(data.data)
                } else {
                    setError(data.error || 'Failed to load sale')
                }
            } catch (e) {
                console.error(e)
                setError('Network error')
            } finally {
                setLoading(false)
            }
        }
        if (params.id) fetchSale()
    }, [params.id])

    // ... (print effect)

    if (loading) return <div className="p-8 text-center font-mono text-xs">Loading Receipt...</div>
    if (error) return <div className="p-8 text-center font-mono text-xs text-red-600">Error: {error} (ID: {params.id})</div>
    if (!sale) return <div className="p-8 text-center font-mono text-xs">Receipt Not Found</div>

    return (
        <>
            <div id="receipt-container" className="p-4 max-w-[80mm] mx-auto bg-white min-h-screen text-slate-900 font-mono text-xs leading-tight">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-xl font-display font-bold uppercase mb-1">Aurum Inventory</h1>
                    {sale.paymentType === 'CREDIT' || sale.paymentType === 'PARTIAL' ? (
                        <div className="inline-block px-3 py-1 bg-slate-900 rounded text-white text-[10px] font-black uppercase tracking-[0.2em] mb-2">Credit Invoice</div>
                    ) : (
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Standard Receipt</p>
                    )}
                    <p className="text-[10px] text-slate-500">Accra, Ghana • +233 555 123 456</p>
                </div>

                {/* Meta */}
                <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{new Date(sale.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Receipt #:</span>
                        <span className="font-bold">{sale.saleNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cashier:</span>
                        <span>{sale.user?.name || 'Staff'}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="mb-4">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-900">
                                <th className="py-1">Item</th>
                                <th className="py-1 text-right">Qty</th>
                                <th className="py-1 text-right">Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item: SaleItem) => (
                                <tr key={item.id}>
                                    <td className="py-1 pr-2">
                                        <div className="font-bold">{item.product.name}</div>
                                        <div className="text-[10px] text-slate-500">{item.product.sku}</div>
                                    </td>
                                    <td className="py-1 text-right align-top">{item.quantity}</td>
                                    <td className="py-1 text-right align-top">
                                        {(item.quantity * item.unitPrice).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 mb-4">
                    <div className="flex justify-between font-bold text-sm">
                        <span>NET TOTAL</span>
                        <span>{Number(sale.totalAmount).toFixed(2)}</span>
                    </div>

                    {sale.paymentType === 'CASH' ? (
                        <div className="space-y-1 mt-2 border-t border-slate-100 pt-2">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Tendered</span>
                                <span>{Number(sale.amountPaid).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-900 font-bold">
                                <span>Change Given</span>
                                <span>{Number(sale.changeGiven).toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 mt-2 border-t border-slate-100 pt-2">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Down Payment ({sale.paymentMethod})</span>
                                <span>{Number(sale.amountPaid).toFixed(2)}</span>
                            </div>
                            {Number(sale.creditAmount) > 0 && (
                                <div className="flex justify-between text-red-600 font-black border-t-2 border-slate-900 pt-1 mt-1 text-sm uppercase">
                                    <span>Bal. Outstanding</span>
                                    <span>{Number(sale.creditAmount).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between text-[10px] text-slate-400 mt-4 border-t border-dotted pt-2">
                        <span>Tax Breakdown (Inc)</span>
                        <span>{Number(sale.taxAmount).toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center space-y-2 mt-8">
                    <div className="border-t border-slate-900 pt-2">
                        <p className="font-bold uppercase text-[10px]">Thank You for Shopping!</p>
                        <p className="text-[9px] text-slate-500">Returns valid within 7 days with receipt.</p>
                    </div>
                    <p className="text-[8px] text-slate-300 mt-4">Powered by Aurum</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    /* HIDE EVERYTHING */
                    body * {
                        visibility: hidden;
                    }
                    /* SHOW ONLY RECEIPT */
                    #receipt-container, #receipt-container * {
                        visibility: visible;
                    }
                    /* POSITION ABSOLUTELY */
                    #receipt-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 10mm; /* Add some padding for the content */
                        background: white;
                        color: black;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Manual Controls (Hidden on Print) */}
            <div className="no-print fixed top-4 right-4 flex flex-col gap-2 items-end z-50">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print / Save PDF
                </button>
                <div className="bg-blue-50 text-blue-700 text-[10px] p-2 rounded-lg max-w-[200px] shadow-sm border border-blue-100">
                    <strong>Tip:</strong> To save as PDF, click the button and select <u>&quot;Save as PDF&quot;</u> in the printer list.
                </div>
            </div>
        </>
    )
}
