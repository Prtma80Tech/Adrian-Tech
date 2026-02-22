'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    PieChart as PieChartIcon,
    TrendingUp,
    Activity
} from 'lucide-react';
import { TVChart } from '@/components/dashboard/tv-chart';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line } from 'recharts';
import { supabase } from '@/lib/supabase';



export default function DashboardPage() {
    const [mounted, setMounted] = React.useState(false);
    const [assets, setAssets] = React.useState<any[]>([]);
    const [totalWealth, setTotalWealth] = React.useState(0);
    const [totalPL, setTotalPL] = React.useState(0);
    const [dailyProfit, setDailyProfit] = React.useState(0);
    const [trades, setTrades] = React.useState<any[]>([]);
    const [cashflow, setCashflow] = React.useState<any[]>([]);

    React.useEffect(() => {
        setMounted(true);

        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Cashflow
            const { data: cashflowData } = await supabase
                .from('cashflows')
                .select('*')
                .eq('user_id', user.id);

            if (cashflowData) {
                setCashflow(cashflowData);
                const wealth = cashflowData.reduce((acc: number, t: any) =>
                    t.type === 'Income' ? acc + t.amount : acc - t.amount, 0);
                setTotalWealth(wealth);
            }

            // 2. Fetch Assets
            const { data: assetData } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', user.id);

            let investmentPL = 0;
            let todayInvestmentProfit = 0;
            const todayStr = new Date().toISOString().split('T')[0];

            if (assetData) {
                const mappedAssets = assetData.map(item => ({
                    id: item.id,
                    name: item.name,
                    symbol: item.symbol,
                    type: item.type,
                    quantity: item.quantity,
                    avgBuyPrice: item.avg_buy_price,
                    currentPrice: item.current_price,
                    status: item.status,
                    history: item.history || [],
                    dividends: item.dividends || 0,
                    allocatedCost: item.allocated_cost || (item.avg_buy_price * item.quantity)
                }));
                setAssets(mappedAssets);

                mappedAssets.forEach(asset => {
                    // Total P/L calculation
                    investmentPL += (asset.currentPrice - asset.avgBuyPrice) * asset.quantity;

                    // Daily Profit calculation for running assets
                    if ((asset.status || 'Running') === 'Running') {
                        const todayCandle = asset.history.find((c: any) => c.time === todayStr);
                        if (todayCandle) {
                            todayInvestmentProfit += (asset.currentPrice - todayCandle.open) * asset.quantity;
                        }
                    }
                });
            }

            // 3. Fetch Trades
            const { data: tradeData } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', user.id);

            let tradingPL = 0;
            let todayTradingProfit = 0;

            if (tradeData) {
                setTrades(tradeData);
                tradeData.forEach((trade: any) => {
                    if (trade.result) {
                        tradingPL += trade.result;
                        if (trade.date === todayStr) {
                            todayTradingProfit += trade.result;
                        }
                    }
                });
            }

            setTotalPL(investmentPL + tradingPL);
            setDailyProfit(todayInvestmentProfit + todayTradingProfit);
        };

        fetchData();
        window.addEventListener('storage', fetchData);
        return () => window.removeEventListener('storage', fetchData);
    }, []);

    const dynamicStats = useMemo(() => {
        const netWorth = totalWealth + totalPL; // Cash Balance + Unrealized P/L
        return [
            { label: 'Total Wealth', value: netWorth, change: 0, icon: Wallet, color: 'text-primary' },
            { label: 'Daily Profit', value: dailyProfit, change: netWorth > 0 ? (dailyProfit / netWorth * 100) : 0, icon: TrendingUp, color: dailyProfit >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Total P/L', value: totalPL, change: netWorth > 0 ? (totalPL / netWorth * 100) : 0, icon: Activity, color: totalPL >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Asset Count', value: assets.length, change: 0, icon: PieChartIcon, color: 'text-gold' },
        ];
    }, [totalWealth, assets, dailyProfit, totalPL]);

    const chartData = useMemo(() => {
        if (!mounted || cashflow.length === 0) {
            const now = new Date().toISOString().split('T')[0];
            const val = totalWealth + totalPL;
            return [{ time: now, value: val, open: val, high: val, low: val, close: val }];
        }

        // 1. Sort transactions by date (Oldest first)
        // For same-day transactions, use timestamp if available, fallback to index
        const chronologicalTransactions = [...cashflow]
            .map((t, i) => ({ ...t, originalIndex: i }))
            .sort((a, b) => {
                const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateDiff !== 0) return dateDiff;

                // If both have timestamps, use them
                if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;

                // Fallback: higher index means earlier (since newest-first)
                return b.originalIndex - a.originalIndex;
            });

        // 2. Group by Date
        const groupedByDate = chronologicalTransactions.reduce((acc: any, t: any) => {
            if (!acc[t.date]) acc[t.date] = [];
            acc[t.date].push(t);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort();
        let runningBalance = 0;
        const result: any[] = [];

        sortedDates.forEach((date, idx) => {
            const dayTransactions = groupedByDate[date];
            const open = runningBalance;
            let dayHigh = runningBalance;
            let dayLow = runningBalance;

            dayTransactions.forEach((t: any) => {
                runningBalance += (t.type === 'Income' ? t.amount : -t.amount);
                dayHigh = Math.max(dayHigh, runningBalance);
                dayLow = Math.min(dayLow, runningBalance);
            });

            // For the VERY last day (usually today), we add the unrealized P/L
            const isLastDay = idx === sortedDates.length - 1;
            let close = runningBalance;
            let high = dayHigh;
            let low = dayLow;

            if (isLastDay) {
                const netWorthToday = runningBalance + totalPL;
                high = Math.max(high, netWorthToday);
                low = Math.min(low, netWorthToday);
                close = netWorthToday;
            }

            result.push({
                time: date,
                open: open,
                high: high,
                low: low,
                close: close,
                value: close // for line chart mode
            });
        });

        // Ensure continuity and fill gaps
        const filledResult: any[] = [];
        if (result.length > 0) {
            const firstDate = new Date(result[0].time);
            const lastDataDate = new Date(result[result.length - 1].time);
            const today = new Date();

            // Loop until the latest of Today OR the last transaction date
            const endDate = lastDataDate > today ? lastDataDate : today;
            let prevPoint = result[0];

            for (let d = new Date(firstDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const found = result.find(r => r.time === dateStr);

                if (found) {
                    filledResult.push(found);
                    prevPoint = found;
                } else {
                    filledResult.push({
                        time: dateStr,
                        open: prevPoint.close,
                        high: prevPoint.close,
                        low: prevPoint.close,
                        close: prevPoint.close,
                        value: prevPoint.close
                    });
                }
            }
        }

        return filledResult;
    }, [cashflow, totalPL, totalWealth, mounted]);

    const allocationData = useMemo(() => {
        // 1. Get Market values of Active Assets
        const assetValues = assets
            .filter((a: any) => (a.status || 'Running') === 'Running')
            .reduce((acc: any, a: any) => {
                acc[a.type] = (acc[a.type] || 0) + (a.currentPrice * a.quantity);
                return acc;
            }, {});

        // 2. Get Cash Balances from Cashflow buckets
        const cashBalances = cashflow.reduce((acc: any, t: any) => {
            const bucket = t.allocation || 'General';
            acc[bucket] = (acc[bucket] || 0) + (t.type === 'Income' ? t.amount : -t.amount);
            return acc;
        }, {});

        // buckets: 'Trading', 'Investment-Stocks', 'Investment-Crypto', 'Investment-Gold', 'General'
        const tradingValue = cashBalances['Trading'] || 0;
        const stocksValue = (assetValues['Stocks'] || 0) + (cashBalances['Investment-Stocks'] || 0);
        const cryptoValue = (assetValues['Crypto'] || 0) + (cashBalances['Investment-Crypto'] || 0);
        const goldValue = (assetValues['Digital Gold'] || 0) + (cashBalances['Investment-Gold'] || 0);
        const generalValue = cashBalances['General'] || 0;

        const total = Math.max(0, tradingValue) + Math.max(0, stocksValue) + Math.max(0, cryptoValue) + Math.max(0, goldValue) + Math.max(0, generalValue);
        if (total === 0) return [];

        const colors: Record<string, string> = {
            'Trading': '#22c55e',
            'Stocks': '#3b82f6',
            'Crypto': '#a855f7',
            'Gold': '#fbbf24',
            'Cash': '#64748b'
        };

        const categories = [
            { name: 'Trading', value: tradingValue, color: colors['Trading'] },
            { name: 'Stocks', value: stocksValue, color: colors['Stocks'] },
            { name: 'Crypto', value: cryptoValue, color: colors['Crypto'] },
            { name: 'Gold', value: goldValue, color: colors['Gold'] },
            { name: 'Cash', value: generalValue, color: colors['Cash'] }
        ].filter(c => c.value > 0);

        return categories.map(c => ({
            ...c,
            value: Math.round((c.value / total) * 100)
        }));
    }, [assets, cashflow]);

    const innerRadius = mounted && typeof window !== 'undefined' && window.innerWidth < 640 ? 60 : 80;
    const outerRadius = mounted && typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 100;

    // Performance Per Category Calculations
    const performanceData = useMemo(() => {
        // 1. Trading Performance
        const tradingCapital = cashflow
            .filter((t: any) => t.allocation === 'Trading' && t.category !== 'Trading Result')
            .reduce((acc: number, t: any) => t.type === 'Income' ? acc + t.amount : acc - t.amount, 0);

        const tradingPL = trades.reduce((acc: number, t: any) => acc + (t.result || 0), 0);
        const tradingPct = tradingCapital > 0 ? (tradingPL / tradingCapital) * 100 : 0;

        // 2. Investment Performance by Asset
        const assetPerformance = assets
            .filter((a: any) => (a.status || 'Running') === 'Running')
            .map(asset => {
                const cost = asset.allocatedCost || (asset.avgBuyPrice * asset.quantity);
                const currentVal = asset.currentPrice * asset.quantity;
                const totalReturn = currentVal + (asset.dividends || 0);
                const netProfit = totalReturn - cost;
                const pct = cost > 0 ? (netProfit / cost) * 100 : 0;
                return {
                    ...asset,
                    profit: netProfit,
                    pct
                };
            });

        return {
            trading: { capital: tradingCapital, profit: tradingPL, pct: tradingPct },
            assets: assetPerformance
        };
    }, [cashflow, trades, assets]);

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {dynamicStats.map((item) => (
                    <div key={item.label} className="rounded-xl border border-border bg-card p-5 md:p-6 transition-all hover:border-primary/50 group">
                        <div className="mb-4 flex items-center justify-between">
                            <div className={`rounded-lg bg-secondary p-2 transition-colors group-hover:bg-primary/10 ${item.color}`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            {item.change !== 0 && (
                                <div className={`flex items-center text-xs font-medium ${item.change > 0 ? 'text-profit' : 'text-loss'}`}>
                                    {item.change > 0 ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    {Math.abs(item.change)}%
                                </div>
                            )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
                        <h4 className="text-xl md:text-2xl font-bold mt-1">{formatCurrency(item.value)}</h4>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 md:gap-8">
                {/* Main Area: Chart & Performance */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    {/* Main Chart */}
                    <div className="overflow-hidden">
                        <TVChart data={chartData} />
                    </div>

                    {/* Performance Tracking List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Trading Performance Card */}
                        <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Trading Perf.</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Growth relative to capital</p>
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-black italic shadow-lg",
                                    performanceData.trading.pct >= 0 ? "bg-profit/10 text-profit shadow-profit/10" : "bg-loss/10 text-loss shadow-loss/10"
                                )}>
                                    {performanceData.trading.pct >= 0 ? '+' : ''}{performanceData.trading.pct.toFixed(2)}%
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Current P/L</span>
                                    <p className={cn("text-xl font-black italic", performanceData.trading.profit >= 0 ? "text-profit" : "text-loss")}>
                                        {performanceData.trading.profit >= 0 ? '+' : ''}{formatCurrency(performanceData.trading.profit, 'IDR')}
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Base Capital</span>
                                    <p className="text-sm font-bold text-white">{formatCurrency(performanceData.trading.capital, 'IDR')}</p>
                                </div>
                            </div>
                            <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-1000", performanceData.trading.pct >= 0 ? "bg-profit" : "bg-loss")}
                                    style={{ width: `${Math.min(100, Math.max(5, Math.abs(performanceData.trading.pct)))}%` }}
                                />
                            </div>
                        </div>

                        {/* Investment Category Quick Stats */}
                        <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white italic mb-6">Asset Growth</h3>
                            <div className="space-y-4">
                                {['Stocks', 'Crypto', 'Digital Gold'].map(type => {
                                    const typeAssets = performanceData.assets.filter(a => a.type === type);
                                    const totalProfit = typeAssets.reduce((acc, a) => acc + a.profit, 0);
                                    const totalCost = typeAssets.reduce((acc, a) => acc + (a.allocatedCost || (a.avgBuyPrice * a.quantity)), 0);
                                    const avgPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

                                    return (
                                        <div key={type} className="flex items-center justify-between group cursor-default">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                    type === 'Stocks' ? "bg-blue-500/10 text-blue-500" :
                                                        type === 'Crypto' ? "bg-purple-500/10 text-purple-500" : "bg-gold/10 text-gold"
                                                )}>
                                                    <TrendingUp className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">{type}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("text-sm font-black italic", avgPct >= 0 ? "text-profit" : "text-loss")}>
                                                    {avgPct >= 0 ? '+' : ''}{avgPct.toFixed(2)}%
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground/40">{typeAssets.length} Assets</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Asset Performance List */}
                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Portfolio Performance</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Market flow status for active holdings</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <Activity className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {performanceData.assets.length > 0 ? performanceData.assets.map((asset) => (
                                <div key={asset.id} className="group relative flex items-center justify-between rounded-[1.25rem] border border-white/5 bg-[#0a0a0b] p-4 pr-8 transition-all hover:bg-white/[0.04] hover:border-white/10 overflow-hidden">
                                    {/* Asset Identity */}
                                    <div className="flex items-center gap-6 w-1/4 shrink-0">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] text-lg font-black italic text-white/90 ring-1 ring-white/5 group-hover:text-primary group-hover:ring-primary/40 transition-all">
                                            {asset.symbol[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-white italic tracking-tight">{asset.symbol}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">{asset.type}</span>
                                        </div>
                                    </div>

                                    {/* Sparkline Chart */}
                                    <div className="flex-grow h-14 mx-4 min-w-[150px] opacity-60 group-hover:opacity-100 transition-opacity">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={asset.history || []}>
                                                <defs>
                                                    <filter id={`glow-${asset.symbol}`} x="-20%" y="-20%" width="140%" height="140%">
                                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                    </filter>
                                                </defs>
                                                <Line
                                                    type="monotone"
                                                    dataKey="close"
                                                    stroke={asset.pct >= 0 ? "#22c55e" : "#ef4444"}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    filter={`url(#glow-${asset.symbol})`}
                                                    isAnimationActive={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Performance Meta */}
                                    <div className="text-right w-1/4 shrink-0 flex flex-col items-end gap-1">
                                        <div className={cn(
                                            "text-lg font-black italic transition-all",
                                            asset.pct >= 0 ? "text-profit text-glow-profit" : "text-loss text-glow-loss"
                                        )}>
                                            {asset.pct >= 0 ? '+' : ''}{asset.pct.toFixed(2)}%
                                        </div>
                                        <div className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest group-hover:text-muted-foreground/60">
                                            {formatCurrency(asset.profit, 'IDR')}
                                        </div>
                                    </div>

                                    {/* Hover Decor */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity",
                                        asset.pct >= 0 ? "bg-profit" : "bg-loss"
                                    )} />
                                </div>
                            )) : (
                                <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-white/[0.02] flex items-center justify-center">
                                        <TrendingUp className="h-8 w-8 text-muted-foreground opacity-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40">Zero Presence Detected</p>
                                        <p className="text-[10px] text-muted-foreground/20 font-bold uppercase">Initialize your portfolio to track performance logs</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    {/* Investment ROI / Balik Modal Progress (Breakeven Status) */}
                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Breakeven Status</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 tracking-widest">ROI and Recovery Analysis</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="space-y-8 pr-2">
                            {performanceData.assets && performanceData.assets.length > 0 ? (
                                performanceData.assets.map((asset: any) => {
                                    const totalCost = asset.allocatedCost || (asset.avgBuyPrice * asset.quantity);
                                    const currentVal = asset.currentPrice * asset.quantity;
                                    const totalReturn = currentVal + (asset.dividends || 0);
                                    const roiProgress = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

                                    return (
                                        <div key={asset.id} className="group space-y-4 mb-8 last:mb-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-[#121214] flex items-center justify-center text-white ring-1 ring-white/10 group-hover:ring-primary/40 transition-all font-black text-xs shadow-inner">
                                                        {asset.symbol.substring(0, 4)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white italic tracking-tight leading-none mb-1">{asset.symbol}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                                            {formatCurrency(asset.avgBuyPrice, 'IDR')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={cn(
                                                        "text-sm font-black italic tracking-tighter",
                                                        asset.pct >= 0 ? "text-profit text-glow-profit" : "text-loss text-glow-loss"
                                                    )}>
                                                        {asset.pct >= 0 ? '+' : ''}{formatCurrency(asset.profit, 'IDR')}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                                                        {asset.pct >= 0 ? '+' : ''}{asset.pct.toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ROI Performance Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em]">
                                                    <span className="text-muted-foreground/20 italic">ROI Performance</span>
                                                    <span className={cn(
                                                        "transition-colors",
                                                        asset.pct >= 0 ? "text-profit" : "text-loss"
                                                    )}>
                                                        {asset.pct >= 0 ? '+' : ''}{asset.pct.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            asset.pct >= 0 ? "bg-profit shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "bg-loss shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                                                        )}
                                                        style={{ width: `${Math.min(100, Math.abs(asset.pct))}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1 opacity-20 group-hover:opacity-100 transition-all duration-300">
                                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Dividend Rewards</span>
                                                <span className="text-[10px] font-black text-white italic tracking-tighter">{formatCurrency(asset.dividends || 0, 'IDR')}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-20 italic">No Active Performance Logs</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Asset Allocation */}
                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl flex flex-col">
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-8">Asset Allocation</h3>

                        {/* Allocation Progress Bars */}
                        <div className="space-y-6 mb-8">
                            {allocationData.map((item) => (
                                <div key={item.name} className="space-y-2 group">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                                        <span className="text-muted-foreground/60 group-hover:text-white transition-colors">{item.name}</span>
                                        <span className="text-white">{item.value}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                            style={{
                                                width: `${item.value}%`,
                                                backgroundColor: item.color,
                                                boxShadow: `0 0 12px ${item.color}40`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-[250px] md:h-[300px] w-full mt-4 relative">
                            {/* Center Label for Pie Chart */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Total Portfolio</span>
                                <span className="text-xl font-black text-white italic">100%</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={innerRadius}
                                        outerRadius={outerRadius}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={4}
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 space-y-4">
                            {allocationData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}60` }} />
                                        <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.1em] group-hover:text-white transition-colors">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-white italic tracking-tighter">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card/50">
                    <h3 className="text-lg font-bold">Portfolio Details</h3>
                    <Link href="/investments" className="text-xs text-primary font-bold hover:underline">View All</Link>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead>
                            <tr className="bg-secondary/30 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4">Quantity</th>
                                <th className="px-6 py-4">Avg Buy</th>
                                <th className="px-6 py-4">Current</th>
                                <th className="px-6 py-4">P/L</th>
                                <th className="px-6 py-4">Weight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {assets.length > 0 ? assets.map((asset) => {
                                const profit = (asset.currentPrice - asset.avgBuyPrice) * asset.quantity;
                                const profitPct = ((asset.currentPrice - asset.avgBuyPrice) / asset.avgBuyPrice) * 100;

                                return (
                                    <tr key={asset.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-primary font-bold text-xs ring-1 ring-border">
                                                {asset.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground">{asset.name}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase">{asset.symbol} • {asset.type}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{asset.quantity.toLocaleString('id-ID')}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{formatCurrency(asset.avgBuyPrice, 'IDR')}</td>
                                        <td className="px-6 py-4 font-bold">{formatCurrency(asset.currentPrice, 'IDR')}</td>
                                        <td className="px-6 py-4">
                                            <div className={cn("font-bold text-sm", profit >= 0 ? "text-profit" : "text-loss")}>
                                                {profit >= 0 ? '+' : ''}{formatCurrency(profit, 'IDR')}
                                            </div>
                                            <div className={cn("text-[10px] font-bold", profit >= 0 ? "text-profit/80" : "text-loss/80")}>
                                                {profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 md:w-20 bg-secondary h-1.5 rounded-full overflow-hidden shrink-0">
                                                    <div
                                                        className="bg-primary h-full transition-all"
                                                        style={{ width: `${Math.random() * 30 + 10}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-bold italic">{(Math.random() * 15 + 5).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                        No assets found. Start by allocating funds from Cash Flow.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
