'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet Panel (Mobile) / Modal (Desktop) */}
            <div className={`
                relative w-full sm:max-w-lg sm:rounded-2xl bg-white 
                rounded-t-[2rem] sm:rounded-b-2xl
                shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] sm:shadow-2xl
                pointer-events-auto 
                transform transition-transform duration-300 ease-out 
                animate-in slide-in-from-bottom sm:zoom-in-95
                max-h-[85vh] flex flex-col pb-safe-area-bottom
            `}>
                
                {/* Drag Handle (Mobile Only) */}
                <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing sm:hidden" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                {title && (
                    <div className="px-6 py-2 pb-4 flex items-center justify-between border-b border-slate-50">
                        <h3 className="text-lg font-display font-bold text-executive-dark">
                            {title}
                        </h3>
                        <button 
                            onClick={onClose}
                            className="hidden sm:block p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                        >
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
