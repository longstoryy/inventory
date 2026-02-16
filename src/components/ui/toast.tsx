"use client"

import * as React from "react"
// Simple toast implementation as placeholder

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
    toast: (options: { title: string; description?: string; variant?: ToastType }) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<any[]>([]);

    const toast = React.useCallback(({ title, description, variant }: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, title, description, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((t) => (
                    <div key={t.id} className="bg-white border rounded shadow p-4 min-w-[200px]">
                        <h4 className="font-bold">{t.title}</h4>
                        {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
