'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'

interface AuditLog {
    id: string
    action: string
    entityType: string
    entityName: string | null
    entityId: string | null
    createdAt: string
    user: { name: string, email: string } | null
    changes: string | null
    ipAddress: string | null
}

export default function SecuritySettingsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)

    useEffect(() => {
        fetchLogs()
    }, [page])

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/audit-logs?page=${page}`)
            const data = await res.json()
            if (data.success) setLogs(data.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Link href="/settings" className="p-2 -ml-2 text-slate-400 hover:text-executive-dark transition-colors">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                            </Link>
                            <h1 className="text-3xl font-bold text-executive-dark">Security & Audit</h1>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Detailed chronological record of system events and user actions.</p>
                    </div>
                </div>

                <div className="executive-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-50 rounded-full animate-pulse w-3/4"></div></td></tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">No system events recorded.</td></tr>
                                ) : logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-600">{new Date(log.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] font-medium text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                    {(log.user?.name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{log.user?.name || 'System'}</p>
                                                    <p className="text-[9px] text-slate-400">{log.ipAddress || 'Internal'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-900">{log.entityName || log.entityId}</p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{log.entityType}</p>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-500 font-mono">
                                            {log.changes ? (
                                                <span className="truncate max-w-[200px] block" title={log.changes}>
                                                    {log.changes.substring(0, 50)}...
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
