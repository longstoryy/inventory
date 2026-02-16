import { Home, Package, ShoppingCart, Settings, ArrowLeftRight, Bell } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
}

export const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Transfers', href: '/transfers', icon: ArrowLeftRight },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export interface QuickAction {
    label: string;
    href: string;
    icon: string; // SVG path
    quickAccess: boolean;
}

export const QUICK_ACTIONS: QuickAction[] = [
    {
        label: 'New Sale',
        href: '/sales/new',
        icon: 'M12 4v16m8-8H4',
        quickAccess: true
    },
    {
        label: 'Stock In',
        href: '/purchase-orders/new',
        icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        quickAccess: true
    },
    {
        label: 'Add Item',
        href: '/products?action=new',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        quickAccess: true
    },
    {
        label: 'Scan Item',
        href: '/scan',
        icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M9 17h.01M9 14h.01M3 13a4 4 0 014-4h4v-1a1 1 0 011-1h4a1 1 0 011 1v1h1a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z',
        quickAccess: true
    }
];
