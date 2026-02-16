import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
            {/* Placeholder for Desktop Sidebar/Header if needed later */}
            <main className="md:pl-64 pt-16 md:pt-0">
                {children}
            </main>
            <MobileBottomNav />
        </div>
    );
}
