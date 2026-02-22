'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    TrendingUp,
    Wallet,
    Layers,
    BarChart3,
    Calculator,
    Settings,
    LogOut,
    LineChart,
    X,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: BookOpen, label: 'Trading Journal', href: '/trading-journal' },
    { icon: TrendingUp, label: 'Investments', href: '/investments' },
    { icon: Wallet, label: 'Cashflow', href: '/cashflow' },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: Calculator, label: 'Calculator', href: '/calculator' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    // Close sidebar on navigation (mobile)
    useEffect(() => {
        onClose();
    }, [pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card transition-transform duration-300 lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col px-3 py-4">
                    <div className="mb-10 flex items-center justify-between px-4">
                        <div className="flex items-center">
                            <LineChart className="mr-2 h-8 w-8 text-primary" />
                            <span className="text-xl font-bold tracking-tight text-foreground">VantageFlow</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden p-1 hover:bg-secondary rounded-md">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.label}
                                </Link>
                            );
                        })}

                        {/* Futuristic Mini Calendar Section */}
                        <div className="mt-4 px-2 pb-4">
                            <div className="relative group rounded-2xl border border-white/5 bg-[#0d0d0e]/40 p-4 backdrop-blur-xl overflow-hidden transition-all hover:border-primary/20">
                                {/* Glow Effect */}
                                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{new Date().toLocaleDateString('en-US', { month: 'long' })}</span>
                                        <span className="text-xl font-black text-white italic tracking-tighter">{new Date().getFullYear()}</span>
                                    </div>
                                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <span className="text-[10px] font-black text-primary">{new Date().getDate()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-[8px] font-black uppercase text-muted-foreground/30 text-center mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {(() => {
                                        const now = new Date();
                                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                        const days = [];

                                        // Empty slots before 1st
                                        for (let i = 0; i < firstDay; i++) {
                                            days.push(<div key={`empty-${i}`} className="h-6 w-full" />);
                                        }

                                        // Days of month
                                        for (let i = 1; i <= daysInMonth; i++) {
                                            const isToday = i === now.getDate();
                                            days.push(
                                                <div key={i} className={cn(
                                                    "h-6 w-full flex items-center justify-center rounded-lg text-[9px] font-bold transition-all",
                                                    isToday
                                                        ? "bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-110 z-10"
                                                        : "text-muted-foreground/60 hover:bg-white/5 hover:text-white"
                                                )}>
                                                    {i}
                                                </div>
                                            );
                                        }
                                        return days;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </nav>

                    <div className="mt-auto border-t border-border pt-4">
                        <button className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                            <LogOut className="mr-3 h-5 w-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
