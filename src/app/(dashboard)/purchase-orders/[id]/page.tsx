'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface POItem { id: string; productId: string; orderedQuantity: number; receivedQuantity: number; unitCost: number; product: { name: string; sku: string } }
interface ReceivingRecord { id: string; receivedAt: string; items: any[]; notes: string | null; receivedBy: { name: string } }
interface PurchaseOrder {
    id: string; poNumber: string; status: string; orderDate: string; expectedDate: string | null; receivedDate: string | null
    subtotal: number; taxAmount: number; shippingCost: number; totalAmount: number; notes: string | null
    supplier: { id: string; name: string; code: string }; location: { id: string; name: string }; createdBy: { name: string }
    items: POItem[]
    receivingRecords: ReceivingRecord[]
}

export default function PurchaseOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [po, setPO] = useState<PurchaseOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [receiving, setReceiving] = useState(false)
    const [voiding, setVoiding] = useState<string | null>(null)
    const [receiveQty, setReceiveQty] = useState<Record<string, number>>({})
    const [batchData, setBatchData] = useState<Record<string, { quantity: number; expirationDate: string }[]>>({})
    const [activeBatchItemId, setActiveBatchItemId] = useState<string | null>(null)

    useEffect(() => { fetchPO() }, [params.id])

    const fetchPO = async () => {
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`)
            const data = await res.json()
            if (data.success) {
                setPO(data.data)
                // Initialize quantities and batches
                const qty: Record<string, number> = {}
                const batches: Record<string, { quantity: number; expirationDate: string }[]> = {}
                
                data.data.items.forEach((i: POItem) => {
                    const rem = Number(i.orderedQuantity) - Number(i.receivedQuantity)
                    const initialQty = rem > 0 ? rem : 0
                    qty[i.id] = initialQty
                    batches[i.id] = [{ quantity: initialQty, expirationDate: '' }]
                })
                setReceiveQty(qty)
                setBatchData(batches)
            } else { alert('PO not found'); router.push('/purchase-orders') }
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const handleReceive = async () => {
        if (!po) return
        
        // Build items list from batchData
        const itemsToReceive: any[] = []
        Object.keys(batchData).forEach(itemId => {
            batchData[itemId].forEach(batch => {
                if (batch.quantity > 0) {
                    itemsToReceive.push({
                        itemId,
                        quantity: batch.quantity,
                        expirationDate: batch.expirationDate || null
                    })
                }
            })
        })

        if (!itemsToReceive.length) return alert('No items to receive')

        const totalQty = itemsToReceive.reduce((sum, i) => sum + i.quantity, 0)
        if (!confirm(`Are you sure you want to receive ${totalQty} units? This will instantly update your inventory.`)) return

        setReceiving(true)
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECEIVED', receivedItems: itemsToReceive }),
            })
            const data = await res.json()
            if (data.success) { fetchPO(); alert('Items received successfully!') }
            else alert(data.error || 'Failed')
        } catch { alert('Failed') } finally { setReceiving(false) }
    }

    const voidRecord = async (recordId: string) => {
        if (!confirm('CAUTION: Voiding this record will REMOVE the items from your inventory and revert this order\'s status. Proceed?')) return
        setVoiding(recordId)
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}/receiving/${recordId}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) { fetchPO(); alert('Record voided successfully') }
            else alert(data.error || 'Failed to void')
        } catch { alert('Failed to connect') } finally { setVoiding(null) }
    }

    const updateStatus = async (status: string) => {
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            const data = await res.json()
            if (data.success) fetchPO()
            else alert(data.error || 'Failed')
        } catch { alert('Failed') }
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)
    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'RECEIVED': return 'bg-success/10 text-success border-success/10'
            case 'CANCELLED': return 'bg-danger/10 text-danger border-danger/10'
            case 'SENT': case 'PARTIAL': return 'bg-blue-50 text-blue-600 border-blue-100'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    if (loading) return <DashboardLayout><div className="executive-card h-96 animate-pulse bg-white/50"></div></DashboardLayout>
    if (!po) return <DashboardLayout><p>PO not found</p></DashboardLayout>

    const canReceive = ['SENT', 'PARTIAL'].includes(po.status)

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/purchase-orders')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-executive-dark tracking-tighter">{po.poNumber}</h1>
                                <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-widest ${getStatusStyle(po.status)}`}>{po.status}</span>
                            </div>
                            <p className="text-slate-500 mt-1 text-sm font-medium">From {po.supplier.name} • To {po.location.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {po.status === 'DRAFT' && (
                            <button onClick={() => updateStatus('SENT')} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Mark as Sent</button>
                        )}
                        {canReceive && (
                            <button onClick={handleReceive} disabled={receiving} className="btn-executive-accent px-8 py-3.5 shadow-xl shadow-executive-accent/20 disabled:opacity-50">
                                {receiving ? 'Processing...' : 'Receive Selected Items'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Order Date</p><p className="text-lg font-bold text-executive-dark">{new Date(po.orderDate).toLocaleDateString()}</p></div>
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expected Arrival</p><p className="text-lg font-bold text-executive-dark">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</p></div>
                    <div className="executive-card p-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Categories</p><p className="text-lg font-bold text-executive-dark">{po.items.length}</p></div>
                    <div className="executive-card p-6 bg-slate-50"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Commitment</p><p className="text-2xl font-black text-executive-accent">{formatCurrency(Number(po.totalAmount))}</p></div>
                </div>

                <div className="executive-card overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h2 className="text-sm font-bold text-executive-dark uppercase tracking-widest">Ordered Asset Ledger</h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Items: {po.items.reduce((a, b) => a + Number(b.orderedQuantity), 0)}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Details</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordered</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{canReceive ? 'Pending' : 'Status'}</th>
                                    {canReceive && <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receive Now</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {po.items.map(item => {
                                    const remaining = Number(item.orderedQuantity) - Number(item.receivedQuantity)
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="py-5 px-6">
                                                <p className="font-bold text-executive-dark">{item.product.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{item.product.sku}</p>
                                            </td>
                                            <td className="py-5 px-6 text-right font-medium text-slate-600">{Number(item.orderedQuantity)}</td>
                                            <td className="py-5 px-6 text-right">
                                                <span className={`font-black ${Number(item.receivedQuantity) >= Number(item.orderedQuantity) ? 'text-success' : 'text-slate-900'}`}>{Number(item.receivedQuantity)}</span>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                {remaining > 0 ? (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-warning/10 text-warning uppercase">{remaining} Pending</span>
                                                ) : <span className="text-[10px] font-bold px-2 py-1 rounded bg-success/10 text-success uppercase">Complete</span>}
                                            </td>
                                            {canReceive && (
                                                 <td className="py-5 px-6 text-right">
                                                     {remaining > 0 ? (
                                                         <div className="flex items-center justify-end gap-2">
                                                             <input
                                                                 type="number"
                                                                 min="0"
                                                                 max={remaining}
                                                                 value={batchData[item.id]?.reduce((a, b) => a + b.quantity, 0) || 0}
                                                                 onChange={e => {
                                                                     const val = Math.min(+e.target.value, remaining)
                                                                     setBatchData({ ...batchData, [item.id]: [{ quantity: val, expirationDate: '' }] })
                                                                 }}
                                                                 className="w-20 px-2 py-1.5 text-center text-sm font-bold border rounded-lg focus:ring-2 focus:ring-executive-accent outline-none transition-all"
                                                             />
                                                             <button
                                                                 onClick={() => setActiveBatchItemId(item.id)}
                                                                 title="Split into different expiry dates"
                                                                 className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-executive-accent transition-all"
                                                             >
                                                                 <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M7 11V7a5 5 0 0110 0v4m-11 4h12l1 5H6l1-5z" /><path d="M12 11V7" /></svg>
                                                             </button>
                                                         </div>
                                                     ) : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="text-success ml-auto"><path d="M5 13l4 4L19 7" /></svg>}
                                                 </td>
                                             )}
                                         </tr>
                                     )
                                 })}
                             </tbody>
                         </table>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Receiving Records */}
                     <div className="executive-card overflow-hidden">
                         <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                             <h3 className="text-sm font-bold text-executive-dark uppercase tracking-widest">Reception Audit Log</h3>
                         </div>
                         <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                             {po.receivingRecords?.length > 0 ? (
                                 po.receivingRecords.map(rec => (
                                     <div key={rec.id} className="p-5 hover:bg-slate-50/50 transition-all group">
                                         <div className="flex items-center justify-between">
                                             <div>
                                                 <p className="text-xs font-black text-executive-dark">Reception event on {new Date(rec.receivedAt).toLocaleDateString()} at {new Date(rec.receivedAt).toLocaleTimeString()}</p>
                                                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Officer: {rec.receivedBy?.name || 'Unknown'}</p>
                                             </div>
                                             <button
                                                 onClick={() => voidRecord(rec.id)}
                                                 disabled={!!voiding}
                                                 className="p-2 text-slate-300 hover:text-danger hover:bg-danger/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                 title="Void & Reverse Inventory Increase"
                                             >
                                                 {voiding === rec.id ? <div className="w-4 h-4 border-2 border-danger border-t-transparent animate-spin rounded-full"></div> : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                             </button>
                                         </div>
                                         <div className="mt-4 flex flex-wrap gap-2">
                                             {rec.items.map((it: any, idx: number) => (
                                                 <span key={idx} className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-100 rounded-md text-slate-600">
                                                     {it.quantity} units of {po.items.find(i => i.productId === it.productId)?.product.name || 'Unknown'} {it.expirationDate && `(Exp: ${new Date(it.expirationDate).toLocaleDateString()})`}
                                                 </span>
                                             ))}
                                         </div>
                                     </div>
                                 ))
                             ) : (
                                 <div className="p-10 text-center text-slate-400 text-xs italic">No reception sessions recorded yet.</div>
                             )}
                         </div>
                     </div>

                     <div className="space-y-6">
                         <div className="executive-card p-6">
                             <h2 className="text-sm font-bold text-executive-dark uppercase tracking-widest mb-6">Financial Allocation</h2>
                             <div className="space-y-3">
                                 <div className="flex justify-between text-xs font-bold text-slate-400"><span>Pre-Tax Allocation</span><span>{formatCurrency(Number(po.subtotal))}</span></div>
                                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Fiscal Levy (VAT)</span><span>{formatCurrency(Number(po.taxAmount))}</span></div>
                                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Logistics Surcharge</span><span>{formatCurrency(Number(po.shippingCost))}</span></div>
                                 <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                                     <span className="text-[10px] font-black uppercase text-executive-accent tracking-widest">Total Committed Capital</span>
                                     <span className="text-2xl font-black text-executive-dark">{formatCurrency(Number(po.totalAmount))}</span>
                                 </div>
                             </div>
                         </div>

                         {po.notes && (
                             <div className="executive-card p-6 border-l-4 border-l-executive-accent">
                                 <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Directives</h2>
                                 <p className="text-sm text-slate-600 font-medium italic">"{po.notes}"</p>
                             </div>
                         )}
                     </div>
                 </div>
             </div>

             {/* Batch Split Modal */}
             {activeBatchItemId && (
                 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                         <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-white">
                             <div>
                                 <h3 className="text-2xl font-black text-executive-dark tracking-tighter">Smart Multi-Batch Receive</h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                     {po.items.find(i => i.id === activeBatchItemId)?.product.name}
                                 </p>
                             </div>
                             <button onClick={() => setActiveBatchItemId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                 <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                         </div>

                         <div className="p-8 space-y-6">
                             {/* UX Guidance Note */}
                             <div className="p-4 bg-executive-accent/5 rounded-2xl border border-executive-accent/10 flex gap-4">
                                 <div className="w-10 h-10 rounded-full bg-executive-accent/10 flex items-center justify-center flex-shrink-0 text-executive-accent">
                                     <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 </div>
                                 <div>
                                     <p className="text-xs font-bold text-executive-dark tracking-tight">Logistics Tip</p>
                                     <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                         Receiving mixed stock? Split them here to track unique expiration dates. The system will auto-apply **FEFO** (First Expired, First Out) during sales.
                                     </p>
                                 </div>
                             </div>

                             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                 {batchData[activeBatchItemId]?.map((batch, idx) => (
                                     <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-2 duration-300">
                                         <div className="flex-1">
                                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Quantity</label>
                                             <input
                                                 type="number"
                                                 value={batch.quantity}
                                                 onChange={e => {
                                                     const newBatches = [...batchData[activeBatchItemId]]
                                                     newBatches[idx].quantity = +e.target.value
                                                     setBatchData({ ...batchData, [activeBatchItemId]: newBatches })
                                                 }}
                                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-executive-dark outline-none focus:border-executive-accent transition-all"
                                             />
                                         </div>
                                         <div className="flex-[1.5]">
                                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Expiration Date</label>
                                             <input
                                                 type="date"
                                                 value={batch.expirationDate}
                                                 onChange={e => {
                                                     const newBatches = [...batchData[activeBatchItemId]]
                                                     newBatches[idx].expirationDate = e.target.value
                                                     setBatchData({ ...batchData, [activeBatchItemId]: newBatches })
                                                 }}
                                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-executive-dark outline-none focus:border-executive-accent transition-all"
                                             />
                                         </div>
                                         <button
                                             onClick={() => {
                                                 const newBatches = batchData[activeBatchItemId].filter((_, i) => i !== idx)
                                                 setBatchData({ ...batchData, [activeBatchItemId]: newBatches.length ? newBatches : [{ quantity: 0, expirationDate: '' }] })
                                             }}
                                             className="mt-5 p-2 text-slate-300 hover:text-danger transition-colors"
                                         >
                                             <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                         </button>
                                     </div>
                                 ))}
                             </div>

                             <button
                                 onClick={() => {
                                     setBatchData({
                                         ...batchData,
                                         [activeBatchItemId]: [...batchData[activeBatchItemId], { quantity: 0, expirationDate: '' }]
                                     })
                                 }}
                                 className="w-full py-3 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-executive-accent hover:text-executive-accent hover:bg-executive-accent/5 transition-all"
                             >
                                 + Split into another batch
                             </button>

                             <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                 <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total to receive</p>
                                     <p className="text-2xl font-black text-executive-dark">
                                         {batchData[activeBatchItemId]?.reduce((a, b) => a + b.quantity, 0)} units
                                     </p>
                                 </div>
                                 <button
                                     onClick={() => setActiveBatchItemId(null)}
                                     className="btn-executive-accent px-8 py-3.5 shadow-xl shadow-executive-accent/20"
                                 >
                                     Preserve & Close
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
         </DashboardLayout>
     )
 }
