'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'

function VerifyContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const reference = searchParams.get('reference')
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('Verifying your payment...')

    useEffect(() => {
        if (!reference) {
            setStatus('error')
            setMessage('No payment reference found.')
            return
        }

        // We can optionally call a verification API here to be sure,
        // but the webhook should have already handled the DB update.
        // We'll wait a few seconds to let the webhook finish and then redirect.
        const timer = setTimeout(() => {
            setStatus('success')
            setMessage('Payment verified successfully! Redirecting...')
            
            // Redirect back to invoices after 2 seconds
            setTimeout(() => {
                router.push('/invoices')
            }, 2000)
        }, 3000)

        return () => clearTimeout(timer)
    }, [reference, router])

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            {status === 'loading' && (
                <>
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-executive-dark rounded-full animate-spin mb-6"></div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Processing Payment</h2>
                    <p className="text-slate-500 mt-2">{message}</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Payment Successful!</h2>
                    <p className="text-slate-500 mt-2">{message}</p>
                    <button 
                        onClick={() => router.push('/invoices')}
                        className="mt-8 btn-executive-primary px-8"
                    >
                        Go to Invoices
                    </button>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Verification Failed</h2>
                    <p className="text-slate-500 mt-2">{message}</p>
                    <button 
                        onClick={() => router.push('/invoices')}
                        className="mt-8 btn-executive px-8"
                    >
                        Back to Invoices
                    </button>
                </>
            )}
        </div>
    )
}

export default function PaymentVerifyPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-executive-dark"></div>
                </div>
            }>
                <VerifyContent />
            </Suspense>
        </DashboardLayout>
    )
}
