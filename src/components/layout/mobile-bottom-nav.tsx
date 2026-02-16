'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '@/config/navigation';
import styles from './mobile-bottom-nav.module.css';

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.nav}>
            {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.link} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={20} />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
