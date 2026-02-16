'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import PaginationControls from '@/components/ui/pagination-controls'
import SmartDiff from '@/components/audit/smart-diff'

interface AuditLog {
    id: string
    action: string
    entityType: string
    entityId: string
    entityName: string | null
    changes: Record<string, unknown> | null
    ipAddress: string | null
    createdAt: string
    user: { id: string; name: string; email: string }
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => { fetchLogs(pagination.page) }, [pagination.page])

    const fetchLogs = async (pageNumber = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(pageNumber), limit: String(pagination.limit) })
            const res = await fetch(`/api/audit-logs?${params}`)
            const data = await res.json()
            if (data.success) {
                setLogs(data.data)
                setPagination(prev => ({
                    ...prev,
                    total: data.total || 0,
                    totalPages: Math.ceil((data.total || 0) / prev.limit)
                }))
            }
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const getActionColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-red-100 text-red-600'
        if (action.includes('CREATE') || action.includes('Add')) return 'bg-emerald-100 text-emerald-600'
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-600'
        return 'bg-slate-100 text-slate-500'
    }

    const getActionIcon = (action: string) => {
        if (action.includes('DELETE')) return <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        if (action.includes('CREATE')) return <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        if (action.includes('UPDATE')) return <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        return <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    }

    // Group logs by date (Today, Yesterday, Date)
    const groupedLogs = logs.reduce((acc, log) => {
        const date = new Date(log.createdAt)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        let key = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        if (date.toDateString() === today.toDateString()) key = 'Today'
        if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday'

        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {} as Record<string, AuditLog[]>)

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-24 lg:pb-0 pt-2 max-w-lg mx-auto">
                <div className="flex items-center justify-between px-1 sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent">
                    <h1 className="text-2xl font-display font-black text-executive-dark tracking-tighter">Activity</h1>
                </div>

                {/* Timeline */}
                {loading && logs.length === 0 ? (
                    <div className="space-y-8 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="pl-4 border-l-2 border-slate-200 ml-4 space-y-6">
                                <div className="ml-6 h-24 bg-slate-200 rounded-2xl"></div>
                                <div className="ml-6 h-24 bg-slate-200 rounded-2xl"></div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 font-bold">No activity recorded.</div>
                    ) : (
                            <div className="space-y-10">
                                {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                                    <div key={date}>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 bg-slate-200/50 inline-block px-3 py-1 rounded-full">{date}</h3>
                                        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                                            {dateLogs.map((log) => (
                                                <div key={log.id} className="ml-8 relative group">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[41px] top-4 w-6 h-6 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-sm ${getActionColor(log.action)}`}>
                                                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                            {getActionIcon(log.action)}
                                                        </svg>
                                                    </div>

                                                    {/* Card */}
                                                    <div
                                                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                        className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm active:scale-[0.99] transition-all cursor-pointer hover:border-slate-300"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${getActionColor(log.action).replace('bg-', 'bg-opacity-10 border-')
                                                                    }`}>
                                                                    {log.action.split('_')[0]}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">{log.entityType}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-slate-600 leading-relaxed mb-1">
                                                            <span className="font-bold text-executive-dark">{log.user.name}</span>
                                                            {' '}performed action on{' '}
                                                            <span className="font-bold text-executive-dark">{log.entityName || log.entityId}</span>
                                                        </p>

                                                        {/* Expanded Details */}
                                                        {expanded === log.id && log.changes && (
                                                            <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                                                {/* Human Readable Diff */}
                                                                <SmartDiff changes={log.changes} />

                                                                {/* Raw JSON Toggle (optional, for admins) */}
                                                                <div className="mt-3 group/raw">
                                                                    <div className="text-[9px] text-slate-300 font-bold uppercase tracking-widest cursor-pointer hover:text-executive-accent transition-colors">Raw Payload</div>
                                                                    <div className="hidden group-hover/raw:block bg-slate-900 text-slate-400 p-3 rounded-xl overflow-x-auto mt-1 absolute z-10 w-64 shadow-xl">
                                                                        <pre className="text-[8px] font-mono leading-tight">{JSON.stringify(log.changes, null, 2)}</pre>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                    </div>
                )}

                {!loading && logs.length > 0 && (
                    <PaginationControls
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(p: number) => setPagination(prev => ({ ...prev, page: p }))}
                        totalItems={pagination.total}
                    />
                )}
            </div>
        </DashboardLayout>
    )
}
