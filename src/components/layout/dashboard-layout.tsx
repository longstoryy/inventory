'use client'

// Dashboard Layout - Hydration Fix Force Update
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Breadcrumbs from './breadcrumbs'
import GlobalSearch from '../global-search'
import MobileBottomNav from './mobile-bottom-nav'
import BottomSheet from '../ui/bottom-sheet'
import QuickActionsSheet from '../dashboard/quick-actions-sheet'

import { MAIN_NAV_ITEMS } from '@/config/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { data: session } = useSession()

    const navItems = MAIN_NAV_ITEMS

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-executive-dark border-r border-slate-800/50 transition-transform duration-300 lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex shrink-0 h-20 items-center px-8 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-executive-accent flex items-center justify-center shadow-lg shadow-executive-accent/20 border border-white/10">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                        </div>
                        <span className="font-display font-black text-2xl text-white tracking-widest uppercase">Aurum</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-display font-bold uppercase tracking-widest transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-r from-executive-accent/20 to-transparent text-white border-l-2 border-executive-accent'
                                    : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
                                    }`}
                            >
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                </svg>
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="shrink-0 p-4 border-t border-slate-800">
                    <Link href="/settings/profile" className="flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-slate-800 transition-colors group">
                        <div className="w-9 h-9 rounded-full bg-slate-700 group-hover:bg-slate-600 flex items-center justify-center text-sm font-semibold text-white transition-colors">
                            {session?.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-executive-accent transition-colors">{session?.user?.name || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate">My Profile</p>
                        </div>
                        <svg width="16" height="16" className="text-slate-600 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {
                isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    />
                )
            }

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
                <header className="h-20 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
                    <div className="flex items-center gap-3 sm:gap-6 flex-1">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>

                        {/* Navigation Arrows */}
                        <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-slate-100">
                            <button
                                onClick={() => router.back()}
                                title="Go Back"
                                className="p-2 text-slate-400 hover:text-executive-dark hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={() => router.forward()}
                                title="Go Forward"
                                className="p-2 text-slate-400 hover:text-executive-dark hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Global Search */}
                        <div className={`${isSidebarOpen ? 'hidden md:flex' : 'flex'} md:flex items-center max-w-md w-full ml-auto md:ml-0`}>
                            <GlobalSearch />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">

                        <button className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-executive-accent rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center gap-3 md:pl-2 md:border-l border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-executive-dark flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-transform active:scale-95 cursor-pointer">
                                {session?.user?.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-screen-2xl mx-auto w-full animate-executive pb-24 md:pb-10">
                    <Breadcrumbs />
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
                onOpenMenu={() => setIsSidebarOpen(true)}
                onOpenAction={() => setIsActionSheetOpen(true)}
            />

            {/* Quick Actions Sheet */}
            <BottomSheet
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                title="Quick Actions"
            >
                <QuickActionsSheet onClose={() => setIsActionSheetOpen(false)} />
            </BottomSheet>

            {/* Mobile Sidebar Overlay */}
            {
                isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-[60] bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    />
                )
            }
        </div >
    )
}
