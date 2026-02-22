'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
    Plus,
    Filter,
    Image as ImageIcon,
    CheckCircle2,
    Clock,
    TrendingUp,
    TrendingDown,
    BarChart3,
    X,
    LayoutGrid,
    Target,
    Activity,
    Save,
    Upload,
    Trash2,
    AlertTriangle,
    FileImage,
    Calendar,
    Wallet,
    Settings2,
    RefreshCw
} from 'lucide-react';
import { Trade } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type FilterTab = 'all' | 'weekly' | 'monthly' | 'yearly';

export function TradingJournal() {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [tradingCapital, setTradingCapital] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(16825);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Initialize from localStorage
    // Load from Supabase on start
    React.useEffect(() => {
        const fetchTrades = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (!error && data) {
                // Map snake_case from DB to camelCase for UI
                const mappedTrades = data.map((t: any) => ({
                    id: t.id,
                    pair: t.pair,
                    type: t.type,
                    lot: t.lot,
                    entryPrice: t.entry_price,
                    exitPrice: t.exit_price,
                    stopLoss: t.stop_loss,
                    takeProfit: t.take_profit,
                    result: t.result,
                    date: t.date,
                    status: t.status,
                    screenshotUrl: t.screenshot_url,
                    notes: t.notes
                }));
                setTrades(mappedTrades);
            }
        };

        const syncFromCashflow = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('cashflows')
                .select('*')
                .eq('user_id', user.id);

            if (!error && data) {
                const forTrading = data
                    .filter((t: any) => t.allocation === 'Trading' && t.category !== 'Trading Result')
                    .reduce((acc: number, t: any) => t.type === 'Income' ? acc + t.amount : acc - t.amount, 0);
                setTradingCapital(forTrading);
            }
        };

        fetchTrades();
        syncFromCashflow();

        const savedRate = localStorage.getItem('usd_idr_rate');
        if (savedRate) {
            setExchangeRate(parseFloat(savedRate));
        }

        setIsHydrated(true);
    }, []);

    // Sync exchange rate to localStorage
    React.useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('usd_idr_rate', exchangeRate.toString());
        }
    }, [exchangeRate, isHydrated]);

    const [isDragging, setIsDragging] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial date for form
    const getTodayStr = () => new Date().toISOString().split('T')[0];

    // Form State
    const [formData, setFormData] = useState({
        pair: '',
        type: 'Buy' as 'Buy' | 'Sell',
        lot: '',
        entryPrice: '',
        stopLoss: '',
        takeProfit: '',
        result: '',
        date: getTodayStr(),
    });

    const filteredTrades = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return trades.filter(trade => {
            const tradeDate = new Date(trade.date);

            if (activeTab === 'all') return true;

            if (activeTab === 'weekly') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return tradeDate >= startOfWeek;
            }

            if (activeTab === 'monthly') {
                return tradeDate.getMonth() === today.getMonth() &&
                    tradeDate.getFullYear() === today.getFullYear();
            }

            if (activeTab === 'yearly') {
                return tradeDate.getFullYear() === today.getFullYear();
            }

            return true;
        });
    }, [activeTab, trades]);

    const stats = useMemo(() => {
        if (trades.length === 0) {
            return [
                { label: 'Trading Capital', value: formatCurrency(tradingCapital, 'IDR'), icon: Wallet, color: 'text-gold' },
                { label: 'Win Rate', value: '0%', icon: CheckCircle2, color: 'text-profit' },
                { label: 'Total Trades', value: '0', icon: BarChart3, color: 'text-primary' },
                { label: 'Avg Result', value: formatCurrency(0, 'IDR'), icon: TrendingUp, color: 'text-profit' },
            ];
        }

        const closedTrades = trades.filter(t => t.result !== undefined);
        const winningTrades = closedTrades.filter(t => (t.result || 0) > 0);
        const winRate = closedTrades.length > 0
            ? Math.round((winningTrades.length / closedTrades.length) * 100)
            : 0;

        const totalProfit = closedTrades.reduce((acc, t) => acc + (t.result || 0), 0);
        const avgProfit = closedTrades.length > 0 ? totalProfit / closedTrades.length : 0;

        return [
            { label: 'Total P/L', value: formatCurrency(totalProfit, 'IDR'), icon: Activity, color: totalProfit >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Win Rate', value: `${winRate}%`, icon: CheckCircle2, color: 'text-profit' },
            { label: 'Total Trades', value: trades.length.toString(), icon: BarChart3, color: 'text-primary' },
            { label: 'Avg Result', value: formatCurrency(avgProfit, 'IDR'), icon: TrendingUp, color: 'text-profit' },
        ];
    }, [trades, tradingCapital]);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const handleAddTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        const tradeDate = formData.date;

        const newTradeDB = {
            user_id: (await supabase.auth.getUser()).data.user?.id,
            pair: formData.pair.toUpperCase(),
            type: formData.type,
            lot: parseFloat(formData.lot) || 0,
            entry_price: parseFloat(formData.entryPrice) || 0,
            stop_loss: parseFloat(formData.stopLoss) || 0,
            take_profit: parseFloat(formData.takeProfit) || 0,
            result: parseFloat(formData.result) || 0,
            date: tradeDate,
            status: 'Closed' as const,
            screenshot_url: previewImage || 'https://images.unsplash.com/photo-1611974717482-4828c89f5d34?auto=format&fit=crop&q=80&w=800'
        };

        const { data, error } = await supabase
            .from('trades')
            .insert([newTradeDB])
            .select();

        if (error) {
            console.error("Error adding trade:", error);
            alert("Gagal menyimpan trade ke Cloud. Pastikan Anda sudah Login.");
            return;
        }

        const savedTrade = data[0];
        const newTradeUI: Trade = {
            id: savedTrade.id,
            pair: savedTrade.pair,
            type: savedTrade.type,
            lot: savedTrade.lot,
            entryPrice: savedTrade.entry_price,
            stopLoss: savedTrade.stop_loss,
            takeProfit: savedTrade.take_profit,
            result: savedTrade.result,
            date: savedTrade.date,
            status: savedTrade.status,
            screenshotUrl: savedTrade.screenshot_url
        };

        setTrades([newTradeUI, ...trades]);

        // Sync to Cash Flow Cloud
        const journalTransaction = {
            user_id: savedTrade.user_id,
            type: (newTradeUI.result || 0) >= 0 ? 'Income' : 'Expense',
            amount: Math.abs(newTradeUI.result || 0),
            category: 'Trading Result',
            description: `${newTradeUI.type} ${newTradeUI.pair} (${formatCurrency(newTradeUI.result || 0, 'IDR')})`,
            date: tradeDate,
            allocation: 'Trading'
        };

        await supabase.from('cashflows').insert([journalTransaction]);
        window.dispatchEvent(new Event('storage'));

        setIsAddModalOpen(false);
        setFormData({
            pair: '',
            type: 'Buy',
            lot: '',
            entryPrice: '',
            stopLoss: '',
            takeProfit: '',
            result: '',
            date: getTodayStr(),
        });
        setPreviewImage(null);
    };

    const confirmDelete = async () => {
        if (tradeToDelete) {
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('id', tradeToDelete);

            if (error) {
                console.error("Error deleting trade:", error);
                alert("Gagal menghapus data dari Cloud.");
                return;
            }

            // Remove corresponding cashflow entry
            // Note: Since we don't have a reliable way to link them without a foreign key or external ID in cashflow,
            // we should have added an 'external_id' column or similar. 
            // For now, we'll use a description match which is the current logic's best effort.
            const trade = trades.find(t => t.id === tradeToDelete);
            if (trade) {
                const descMatch = `${trade.type} ${trade.pair} (${formatCurrency(trade.result || 0, 'IDR')})`;
                await supabase.from('cashflows').delete().eq('description', descMatch);
            }

            const updatedTrades = trades.filter(t => t.id !== tradeToDelete);
            setTrades(updatedTrades);
            window.dispatchEvent(new Event('storage'));
            setTradeToDelete(null);
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Trading Journal</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Local Broker (IDR Mode)</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-4 backdrop-blur-md">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Trading Capital</span>
                        <h4 className="text-xl font-black text-white italic tracking-tighter">
                            {formatCurrency(tradingCapital, 'IDR')}
                        </h4>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Equity</span>
                        <h4 className="text-xl font-black text-gold italic tracking-tighter">
                            {formatCurrency(tradingCapital + trades.reduce((acc, t) => acc + (t.result || 0), 0), 'IDR')}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border bg-card p-6 transition-all hover:bg-secondary/10 group relative overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className={cn("rounded-lg bg-secondary p-2", stat.color)}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                <h4 className="text-xl font-bold">{stat.value}</h4>
                                {stat.subValue && (
                                    <p className="text-[9px] font-bold text-muted-foreground/40 mt-0.5">{stat.subValue}</p>
                                )}
                            </div>
                        </div>

                    </div>
                ))}
            </div>

            <div className="space-y-6">
                <div className="flex flex-col border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex rounded-xl bg-secondary/50 p-1 self-start">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'weekly', label: 'Weekly' },
                            { id: 'monthly', label: 'Monthly' },
                            { id: 'yearly', label: 'Yearly' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as FilterTab)}
                                className={cn(
                                    "rounded-lg px-5 py-2 text-[11px] font-black uppercase tracking-tight transition-all",
                                    activeTab === tab.id
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2 text-xs font-bold hover:bg-secondary transition-all">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            History Entry
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
                        >
                            <Plus className="h-4 w-4" />
                            New Entry
                        </button>
                    </div>
                </div>

                {/* Grid Layout History */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTrades.length > 0 ? (
                        filteredTrades.map((trade) => (
                            <div key={trade.id} className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/50 shadow-xl">
                                <img
                                    src={trade.screenshotUrl}
                                    alt={trade.pair}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                />

                                <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                                    <span className={cn(
                                        "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                        "bg-zinc-500/20 text-zinc-300 backdrop-blur-md ring-1 ring-zinc-500/50"
                                    )}>
                                        {trade.status}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setTradeToDelete(trade.id)}
                                    className="absolute left-4 bottom-24 z-20 h-8 w-8 items-center justify-center rounded-lg bg-loss/20 text-loss opacity-0 backdrop-blur-md transition-all hover:bg-loss hover:text-white group-hover:opacity-100 flex ring-1 ring-loss/30"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                {trade.result !== undefined && (
                                    <div className="absolute right-4 top-4 z-10 text-right">
                                        <div className={cn(
                                            "text-xl font-black italic",
                                            trade.result >= 0 ? "text-profit text-glow-profit" : "text-loss text-glow-loss"
                                        )}>
                                            {trade.result >= 0 ? '+' : ''}{formatCurrency(trade.result, 'IDR')}
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{trade.date}</p>
                                    </div>
                                )}

                                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 backdrop-blur-[2px] transition-all group-hover:backdrop-blur-none group-hover:from-black/95">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight">{trade.pair}</h3>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                                                    trade.type === 'Buy' ? "bg-profit text-white" : "bg-loss text-white"
                                                )}>
                                                    {trade.type}
                                                </span>
                                                <span className="text-xs font-bold text-muted-foreground">{trade.lot} Lots</span>
                                            </div>
                                        </div>

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur hover:bg-primary transition-all cursor-pointer">
                                            <ImageIcon className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Entry</p>
                                            <p className="text-xs font-black text-white">{trade.entryPrice}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-bold text-loss uppercase opacity-60">Stop Loss</p>
                                            <p className="text-xs font-black text-white">{trade.stopLoss}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-bold text-profit uppercase opacity-60">Take Profit</p>
                                            <p className="text-xs font-black text-white">{trade.takeProfit}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
                            <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Belum ada data pada filter ini</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Trade Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="relative border-b border-white/5 bg-white/[0.02] p-6 md:p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Log Final Result</h3>
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Final Trade Data Entry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="rounded-full bg-white/5 p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleAddTrade} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pair & Type */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Pair</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. EUR/USD or XAU/USD"
                                            value={formData.pair}
                                            onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'Buy' })}
                                            className={cn(
                                                "rounded-xl py-3 text-xs font-black uppercase tracking-widest transition-all",
                                                formData.type === 'Buy' ? "bg-profit text-white shadow-lg shadow-profit/20" : "bg-white/5 text-muted-foreground"
                                            )}
                                        >
                                            Buy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'Sell' })}
                                            className={cn(
                                                "rounded-xl py-3 text-xs font-black uppercase tracking-widest transition-all",
                                                formData.type === 'Sell' ? "bg-loss text-white shadow-lg shadow-loss/20" : "bg-white/5 text-muted-foreground"
                                            )}
                                        >
                                            Sell
                                        </button>
                                    </div>
                                </div>

                                {/* Lot & Result */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Lot Size</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.lot}
                                            onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gold ml-1">Profit / Loss Result (IDR)</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                placeholder="0"
                                                value={formData.result}
                                                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                                className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase tracking-widest pointer-events-none">Rp</span>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase tracking-widest pointer-events-none">IDR</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trade Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entry Price</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.0001"
                                        placeholder="0.0000"
                                        value={formData.entryPrice}
                                        onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-loss ml-1">Stop Loss</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.0001"
                                        placeholder="0.0000"
                                        value={formData.stopLoss}
                                        onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-profit ml-1">Take Profit</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.0001"
                                        placeholder="0.0000"
                                        value={formData.takeProfit}
                                        onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-center"
                                    />
                                </div>
                            </div>

                            {/* Drag & Drop Image Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Screenshot Chart</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed h-48 transition-all cursor-pointer overflow-hidden",
                                        isDragging ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]",
                                        previewImage && "border-none"
                                    )}
                                >
                                    {previewImage ? (
                                        <>
                                            <img src={previewImage} className="h-full w-full object-cover" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <p className="text-white text-xs font-bold uppercase tracking-widest">Ganti Gambar</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 rounded-2xl bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                                                <FileImage className="h-8 w-8" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">Drag & Drop Image</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">atau klik untuk pilih dari folder</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        hidden
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                    />
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="bg-white/[0.02] p-6 md:p-8 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="flex-1 rounded-2xl border border-white/10 py-4 font-bold text-muted-foreground hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTrade}
                                className="flex-[2] rounded-2xl bg-primary py-4 font-black text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Save className="h-5 w-5" />
                                Confirm & Save Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Rate Adjustment Modal */}
            {isRateModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                                <RefreshCw className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Exchange Rate</h4>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current USD to IDR conversion price</p>
                            </div>
                            <div className="w-full space-y-2">
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                                        className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white text-2xl font-black italic focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/20 text-xs font-bold pointer-events-none">Rp</span>
                                </div>
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Data defaults as configured in settings</p>
                            </div>
                            <button
                                onClick={() => setIsRateModalOpen(false)}
                                className="w-full rounded-2xl bg-primary py-4 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                            >
                                Apply Exchange Rate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {tradeToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-loss/10 text-loss ring-4 ring-loss/5 animate-bounce">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Delete Exit Entry?</h3>
                                <p className="text-sm text-muted-foreground font-medium">Data audit yang sudah dihapus tidak dapat dipulihkan kembali.</p>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setTradeToDelete(null)}
                                className="flex-1 rounded-2xl bg-white/5 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-white/10 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 rounded-2xl bg-loss py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-loss/20 hover:bg-loss/90 transition-all"
                            >
                                Hapus Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
