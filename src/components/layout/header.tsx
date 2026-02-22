'use client';

import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
    totalBalance: number;
    onMenuClick: () => void;
}

export function Header({ totalBalance, onMenuClick }: HeaderProps) {
    const [user, setUser] = React.useState({ name: 'Trial User', avatar: '' });

    React.useEffect(() => {
        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                if (!error && data) {
                    setUser({
                        name: data.name || 'Pro Member',
                        avatar: data.avatar_url || ''
                    });
                }
            }
        };

        loadUser();
        window.addEventListener('storage', loadUser);
        return () => window.removeEventListener('storage', loadUser);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 md:px-8 backdrop-blur">
            <div className="flex w-full items-center justify-between gap-4">
                <div className="flex items-center gap-2 md:gap-8">
                    <button
                        onClick={onMenuClick}
                        className="p-2 -ml-2 rounded-lg hover:bg-secondary lg:hidden"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-wider">Balance</span>
                        <span className="text-sm md:text-lg font-bold text-foreground">
                            {formatCurrency(totalBalance)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button className="relative rounded-full p-2 hover:bg-secondary">
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                    </button>

                    <div className="h-8 w-[1px] bg-border hidden md:block" />

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden md:flex flex-col items-end text-sm">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">Pro Member</span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 cursor-pointer hover:bg-primary/30 transition-colors overflow-hidden border border-primary/10">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-6 w-6 text-primary" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
