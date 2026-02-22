'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [totalBalance, setTotalBalance] = useState(0);

    const fetchBalance = async () => {
        const { data, error } = await supabase
            .from('cashflows')
            .select('amount, type');

        if (!error && data) {
            const wealth = data.reduce((acc: number, t: any) =>
                t.type === 'Income' ? acc + t.amount : acc - t.amount, 0);
            setTotalBalance(wealth);
        }
    };

    useEffect(() => {
        fetchBalance();

        // Listen for storage events (for cross-tab sync if needed) or custom triggers
        window.addEventListener('storage', fetchBalance);
        return () => window.removeEventListener('storage', fetchBalance);
    }, [pathname]);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const isUnlocked = sessionStorage.getItem('vantage_unlocked') === 'true';

            if (user) {
                // Check if profile has a PIN
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('pin')
                    .eq('id', user.id)
                    .single();

                if (profile?.pin && !isUnlocked) {
                    router.push('/login');
                } else {
                    setIsAuthorized(true);
                }
            } else {
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    if (!isAuthorized) {
        return <div className="min-h-screen bg-background" />; // Short loading state
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="lg:pl-64 flex flex-col min-h-screen">
                <Header
                    totalBalance={totalBalance}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-700">
                    {children}
                </main>
            </div>
        </div>
    );
}
