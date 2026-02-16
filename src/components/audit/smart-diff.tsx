import React from 'react'

interface SmartDiffProps {
    changes: Record<string, any> | null
}

export default function SmartDiff({ changes }: SmartDiffProps) {
    if (!changes || Object.keys(changes).length === 0) return null

    const formatValue = (val: any) => {
        if (val === null) return 'null'
        if (typeof val === 'boolean') return val ? 'True' : 'False'
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
    }

    const formatKey = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            {Object.entries(changes).map(([key, value]) => {
                // Handling different diff formats
                // Case A: { field: { old: X, new: Y } } (Ideal)
                // Case B: { field: "new value" } (Simple update)
                // Case C: { field: [old, new] } (Array style)
                
                let fromVal, toVal

                if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
                    fromVal = value.old
                    toVal = value.new
                } else if (Array.isArray(value) && value.length === 2) {
                    fromVal = value[0]
                    toVal = value[1]
                } else {
                    toVal = value
                }

                if (fromVal !== undefined) {
                    return (
                        <div key={key} className="text-xs flex flex-wrap gap-1 items-center">
                            <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">{formatKey(key)}:</span>
                            <span className="line-through text-slate-400 decoration-slate-300">{formatValue(fromVal)}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-executive-dark">{formatValue(toVal)}</span>
                        </div>
                    )
                }

                return (
                    <div key={key} className="text-xs flex flex-wrap gap-1 items-center">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">{formatKey(key)}:</span>
                        <span className="font-bold text-executive-dark">{formatValue(toVal)}</span>
                    </div>
                )
            })}
        </div>
    )
}
