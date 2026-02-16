'use client'

import Link from 'next/link'

export default function QuickActionsSheet({ onClose }: { onClose: () => void }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <Link href="/sales/new" onClick={onClose} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-executive-accent/10 flex items-center justify-center text-executive-accent group-hover:bg-executive-accent group-hover:text-white transition-colors">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="font-display font-bold text-sm text-executive-dark">New Sale</span>
            </Link>
             <Link href="/purchase-orders/new" onClick={onClose} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </div>
                <span className="font-display font-bold text-sm text-executive-dark">Stock In</span>
            </Link>
             <Link href="/products?action=new" onClick={onClose} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span className="font-display font-bold text-sm text-executive-dark">Add Item</span>
            </Link>
             <button onClick={() => { alert('Use handheld scanner'); onClose(); }} className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M9 17h.01M9 14h.01M3 13a4 4 0 014-4h4v-1a1 1 0 011-1h4a1 1 0 011 1v1h1a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" /></svg>
                </div>
                <span className="font-display font-bold text-sm text-executive-dark">Scan Item</span>
            </button>
        </div>
    )
}
