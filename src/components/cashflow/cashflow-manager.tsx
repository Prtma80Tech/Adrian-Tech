'use client';

import React from 'react';
import {
    Plus,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    ChevronRight,
    Filter,
    ShieldCheck,
    AlertTriangle,
    Wallet,
    X,
    Save,
    Trash2,
    BookOpen,
    TrendingUp,
    Gem,
    Layers,
    RotateCcw
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { mockCashflow } from '@/lib/mock-data';
import { formatCurrency, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function CashflowManager() {
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [isActionModalOpen, setIsActionModalOpen] = React.useState(false);
    const [isAllocationModalOpen, setIsAllocationModalOpen] = React.useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = React.useState(false);
    const [actionType, setActionType] = React.useState<'Deposit' | 'Withdraw' | 'Delete' | 'Allocation' | 'Return' | null>(null);
    const [pinInput, setPinInput] = React.useState(['', '', '', '', '', '']);
    const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
    const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [isHydrated, setIsHydrated] = React.useState(false);

    const [formData, setFormData] = React.useState({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        allocation: 'General' as 'Trading' | 'Investment-Stocks' | 'Investment-Crypto' | 'Investment-Gold' | 'General'
    });

    const [investmentData, setInvestmentData] = React.useState<any[]>([]);
    const [tradingJournalData, setTradingJournalData] = React.useState<any[]>([]);
    const [exchangeRate, setExchangeRate] = React.useState(16000);

    // Initialize from Supabase
    React.useEffect(() => {
        const fetchCashflow = async () => {
            const { data, error } = await supabase
                .from('cashflows')
                .select('*')
                .order('date', { ascending: false });

            if (!error && data) {
                setTransactions(data);
            }
        };

        const fetchInvestmentData = async () => {
            const { data } = await supabase.from('investments').select('*');
            if (data) {
                const mapped = data.map((t: any) => ({
                    ...t,
                    entryPrice: t.entry_price,
                    currentPrice: t.current_price,
                    change24h: t.change24h,
                }));
                setInvestmentData(mapped);
            }
        };

        const fetchTradingData = async () => {
            const { data } = await supabase.from('trades').select('*');
            if (data) setTradingJournalData(data);
        };

        fetchCashflow();
        fetchInvestmentData();
        fetchTradingData();

        const savedRate = localStorage.getItem('usd_idr_rate');
        if (savedRate) {
            setExchangeRate(parseFloat(savedRate));
        }

        setIsHydrated(true);

        // Standard storage events for exchange rate etc
        const handleStorageChange = () => {
            const updatedRate = localStorage.getItem('usd_idr_rate');
            if (updatedRate) setExchangeRate(parseFloat(updatedRate));

            // Re-fetch cloud data if other components changed them
            fetchCashflow();
            fetchInvestmentData();
            fetchTradingData();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const totalIncome = transactions.filter(c => c.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(c => c.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const savings = totalIncome - totalExpense;

    const getBucketBalance = (bucket: string) => {
        // First get the raw cash allocation from transactions
        // For Trading, we only count Fund Allocations (Capital) and ignore Trading Results to avoid double counting
        const cashAllocation = transactions
            .filter(t => t.allocation === bucket && t.category !== 'Trading Result')
            .reduce((acc: number, t: any) => t.type === 'Income' ? acc + t.amount : acc - t.amount, 0);

        // For Trading bucket, we reflect Equity = Capital + Journal Profits
        if (bucket === 'Trading') {
            const totalProfitIDR = tradingJournalData.reduce((acc, t) => acc + (t.result || 0), 0);
            return cashAllocation + totalProfitIDR;
        }

        // For investments, we reflect only the remaining Cash (Investment Capital)
        // following the logic that "Fund Allocated" represents buying power/unused cash
        if (bucket.startsWith('Investment-')) {
            return cashAllocation;
        }

        return cashAllocation;
    };

    const availableBalance = getBucketBalance('General');
    const tradingBalance = getBucketBalance('Trading');
    const stocksBalance = getBucketBalance('Investment-Stocks');
    const cryptoBalance = getBucketBalance('Investment-Crypto');
    const goldBalance = getBucketBalance('Investment-Gold');
    const totalAllocated = tradingBalance + stocksBalance + cryptoBalance + goldBalance;

    const flowChartData = React.useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();

        // Group transactions by month
        const data = months.map((month, index) => {
            const monthIncome = transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === index && d.getFullYear() === currentYear && t.type === 'Income';
                })
                .reduce((sum, t) => sum + t.amount, 0);

            const monthExpense = transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === index && d.getFullYear() === currentYear && t.type === 'Expense';
                })
                .reduce((sum, t) => sum + t.amount, 0);

            return { month, income: monthIncome, expense: monthExpense };
        });

        // Simplified: return only months that have data, or at least last 5 months
        const monthsWithData = data.filter(d => d.income > 0 || d.expense > 0);
        if (monthsWithData.length === 0) {
            // Default view if no data
            return data.slice(0, 5);
        }
        return data.filter((_, i) => i <= new Date().getMonth());
    }, [transactions]);

    const openActionModal = (type: 'Deposit' | 'Withdraw') => {
        setActionType(type);
        setFormData({
            amount: '',
            category: type === 'Deposit' ? 'Deposit' : 'Withdraw',
            description: '',
            date: new Date().toISOString().split('T')[0],
            allocation: 'General'
        });
        setIsActionModalOpen(true);
    };

    const handleActionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionModalOpen(false);
        setPinInput(['', '', '', '', '', '']);
        setIsSecurityModalOpen(true);
    };

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pinInput];
        newPin[index] = value;
        setPinInput(newPin);

        if (value && index < 5) {
            pinRefs.current[index + 1]?.focus();
        }

        if (newPin.every(digit => digit !== '')) {
            verifyPin(newPin.join(''));
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
        }
    };

    const verifyPin = async (enteredPin: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('pin')
            .eq('id', user.id)
            .single();

        const correctPin = profile?.pin || "123456";

        if (enteredPin === correctPin) {
            if (actionType === 'Delete') {
                confirmDelete();
            } else {
                confirmTransaction();
            }
        } else {
            alert("Invalid PIN. Action Denied.");
            setPinInput(['', '', '', '', '', '']);
            pinRefs.current[0]?.focus();
        }
    };

    const confirmDelete = async () => {
        if (transactionToDelete) {
            const { error } = await supabase
                .from('cashflows')
                .delete()
                .eq('id', transactionToDelete);

            if (error) {
                console.error("Error deleting cashflow:", error);
                alert("Gagal menghapus data di Cloud.");
                return;
            }

            setTransactions(transactions.filter(t => t.id !== transactionToDelete));
            setTransactionToDelete(null);
            setIsSecurityModalOpen(false);
            setActionType(null);
        }
    };

    const confirmTransaction = async () => {
        const userId = (await supabase.auth.getUser()).data.user?.id;

        if (actionType === 'Allocation' || actionType === 'Return') {
            const amount = parseFloat(formData.amount);
            const isReturn = actionType === 'Return';

            const source = isReturn ? formData.allocation : 'General';
            const target = isReturn ? 'General' : formData.allocation;

            // 1. Withdrawal from Source
            const withdrawal = {
                user_id: userId,
                type: 'Expense',
                amount: amount,
                category: 'Re-Allocation',
                description: isReturn ? `Returned from ${formData.allocation}` : `Allocated to ${formData.allocation}`,
                date: formData.date,
                allocation: source
            };

            // 2. Deposit to target
            const deposit = {
                user_id: userId,
                type: 'Income',
                amount: amount,
                category: 'Re-Allocation',
                description: isReturn ? `Received from ${formData.allocation}` : `Received from General Balance`,
                date: formData.date,
                allocation: target
            };

            const { data, error } = await supabase
                .from('cashflows')
                .insert([deposit, withdrawal])
                .select();

            if (!error && data) {
                setTransactions([...data, ...transactions]);
                setIsAllocationModalOpen(false);
            } else {
                console.error("Error creating allocation:", error);
                alert("Gagal membuat alokasi di Cloud.");
            }
        } else {
            const newTransaction = {
                user_id: userId,
                type: actionType === 'Deposit' ? 'Income' : 'Expense',
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description,
                date: formData.date,
                allocation: 'General'
            };

            const { data, error } = await supabase
                .from('cashflows')
                .insert([newTransaction])
                .select();

            if (!error && data) {
                setTransactions([data[0], ...transactions]);
                setIsActionModalOpen(false);
            } else {
                console.error("Error creating transaction:", error);
                alert("Gagal menyimpan transaksi ke Cloud.");
            }
        }
        setIsSecurityModalOpen(false);
        setActionType(null);
    };

    return (
        <div className="space-y-12">
            {/* Action Buttons Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Capital Flow</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Manage your liquidity and transit</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => openActionModal('Deposit')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-profit text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-profit/20 group"
                    >
                        <ArrowUpCircle className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                        Deposit Funds
                    </button>
                    <button
                        onClick={() => openActionModal('Withdraw')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-loss text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-loss/20 group"
                    >
                        <ArrowDownCircle className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
                        Withdraw Funds
                    </button>
                </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-primary/5 p-6 border-primary/20">
                    <div className="flex items-center gap-3 text-primary mb-4">
                        <Wallet className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase tracking-wider">Net Savings</span>
                    </div>
                    <h4 className="text-2xl font-black italic">{formatCurrency(savings)}</h4>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Pooled Capital</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3 text-profit mb-4">
                        <ArrowUpCircle className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase tracking-wider">Unallocated</span>
                    </div>
                    <h4 className="text-2xl font-bold">{formatCurrency(availableBalance)}</h4>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Available to Allocate</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3 text-gold mb-4">
                        <Layers className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase tracking-wider">Allocated</span>
                    </div>
                    <h4 className="text-2xl font-bold">{formatCurrency(totalAllocated)}</h4>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Distributed to Buckets</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3 text-loss mb-4">
                        <ArrowDownCircle className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase tracking-wider">Total Expense</span>
                    </div>
                    <h4 className="text-2xl font-bold">{formatCurrency(totalExpense)}</h4>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">External Spending</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Income vs Expense Chart */}
                <div className="rounded-2xl border border-border bg-card p-6 overflow-hidden">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-lg font-bold">Flow Analysis</h3>
                        <button className="text-xs text-primary hover:underline text-left">View Detailed Report</button>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={flowChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                                <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#1f1f1f' }}
                                    contentStyle={{ backgroundColor: '#121212', border: '1px solid #1f1f1f', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="rounded-2xl border border-white/5 bg-[#0d0d0e]/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 p-8 gap-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Fund Allocation</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Distribute your savings to specific buckets</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Trading Journal', bucket: 'Trading', balance: tradingBalance, usdValue: tradingBalance / exchangeRate, icon: BookOpen, color: 'text-primary' },
                                { label: 'Stocks (Invest)', bucket: 'Investment-Stocks', balance: stocksBalance, icon: TrendingUp, color: 'text-profit' },
                                { label: 'Crypto (Invest)', bucket: 'Investment-Crypto', balance: cryptoBalance, icon: Gem, color: 'text-purple-400' },
                                { label: 'Digital Gold', bucket: 'Investment-Gold', balance: goldBalance, icon: Gem, color: 'text-gold' },
                            ].map((item) => (
                                <div key={item.bucket} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={cn("p-3 rounded-xl bg-white/5", item.color)}>
                                            <item.icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setFormData({ ...formData, allocation: item.bucket as any, amount: '' });
                                                    setActionType('Return');
                                                    setIsAllocationModalOpen(true);
                                                }}
                                                className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-loss/20 hover:text-loss transition-all border border-white/5"
                                                title="Return to General"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setFormData({ ...formData, allocation: item.bucket as any, amount: '' });
                                                    setActionType('Allocation');
                                                    setIsAllocationModalOpen(true);
                                                }}
                                                className="px-4 py-2 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all border border-white/5"
                                            >
                                                Allocate
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <h5 className="text-xl font-black text-white italic tracking-tight">{formatCurrency(item.balance)}</h5>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="rounded-2xl border border-white/5 bg-[#0d0d0e]/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 p-8 gap-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white italic tracking-tight">Ledger History</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Real-time transaction log</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors border border-white/5">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                        {transactions.length > 0 ? transactions.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={cn(
                                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all",
                                        item.type === 'Income'
                                            ? "bg-profit/10 text-profit border-profit/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                            : "bg-loss/10 text-loss border-loss/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                    )}>
                                        {item.type === 'Income' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-black text-sm text-white tracking-tight uppercase group-hover:text-primary transition-colors">{item.category}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">{item.description || 'No description'} • {item.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className={cn(
                                        "font-black text-lg italic tracking-tighter",
                                        item.type === 'Income' ? "text-profit text-glow-profit" : "text-loss text-glow-loss"
                                    )}>
                                        {item.type === 'Income' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTransactionToDelete(item.id);
                                            setActionType('Delete');
                                            setPinInput(['', '', '', '', '', '']);
                                            setIsSecurityModalOpen(true);
                                        }}
                                        className="p-2 rounded-lg bg-loss/10 text-loss hover:bg-loss hover:text-white transition-all border border-loss/20 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <Wallet className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No transactions yet</p>
                                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mt-2">Deposit funds to start your journey</p>
                            </div>
                        )}
                    </div>
                    <button className="w-full border-t border-white/5 py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:bg-white/5 hover:text-white transition-all">
                        Archive Access
                    </button>
                </div>
            </div>

            {/* Action Modal (Deposit/Withdraw) */}
            {isActionModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative border-b border-white/5 bg-white/[0.01] p-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "flex h-14 w-14 items-center justify-center rounded-[1.25rem] ring-1 shadow-inner",
                                        actionType === 'Deposit' ? "bg-profit/10 text-profit ring-profit/20" : "bg-loss/10 text-loss ring-loss/20"
                                    )}>
                                        <Wallet className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{actionType} Funds</h3>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Financial transit configuration</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="rounded-full bg-white/5 p-2.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleActionSubmit} className="p-10 space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Transaction Amount</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            placeholder="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-8 py-6 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black text-3xl italic"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/20 font-black text-2xl">Rp</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Category</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Salary, Rent"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add transaction notes..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/20 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="flex-1 rounded-2xl border border-white/5 py-4 font-black text-muted-foreground/40 hover:bg-white/5 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={cn(
                                        "flex-[2] rounded-2xl py-4 font-black text-white transition-all shadow-2xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95",
                                        actionType === 'Deposit' ? "bg-profit shadow-profit/20 hover:bg-profit/90" : "bg-loss shadow-loss/20 hover:bg-loss/90"
                                    )}
                                >
                                    <Save className="h-4 w-4" />
                                    Authorize {actionType}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Allocation Modal */}
            {isAllocationModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative border-b border-white/5 bg-white/[0.01] p-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "flex h-14 w-14 items-center justify-center rounded-[1.25rem] ring-1 shadow-inner",
                                        actionType === 'Return' ? "bg-loss/10 text-loss ring-loss/20" : "bg-gold/10 text-gold ring-gold/20"
                                    )}>
                                        {actionType === 'Return' ? <RotateCcw className="h-7 w-7" /> : <Layers className="h-7 w-7" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                            {actionType === 'Return' ? 'Return Capital' : 'Allocate Funds'}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                                            {actionType === 'Return'
                                                ? `Move back from ${formData.allocation} to General`
                                                : `Move from General to ${formData.allocation}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAllocationModalOpen(false)}
                                    className="rounded-full bg-white/5 p-2.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); setPinInput(['', '', '', '', '', '']); setIsSecurityModalOpen(true); }} className="p-10 space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">
                                        {actionType === 'Return' ? 'Return Amount' : 'Allocation Amount'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            max={actionType === 'Return' ? getBucketBalance(formData.allocation) : availableBalance}
                                            placeholder="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-8 py-6 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black text-3xl italic"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/20 font-black text-2xl">Rp</div>
                                    </div>
                                    {actionType === 'Allocation' && parseFloat(formData.amount) > availableBalance && (
                                        <p className="text-[9px] text-loss font-black uppercase tracking-widest mt-2 ml-2">Insufficient unallocated balance</p>
                                    )}
                                    {actionType === 'Return' && parseFloat(formData.amount) > getBucketBalance(formData.allocation) && (
                                        <p className="text-[9px] text-loss font-black uppercase tracking-widest mt-2 ml-2">Cannot return more than current bucket balance</p>
                                    )}
                                </div>

                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-muted-foreground">Source</span>
                                        <span className="text-white">{actionType === 'Return' ? formData.allocation : 'General Balance'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-muted-foreground">Target</span>
                                        <span className="text-primary">{actionType === 'Return' ? 'General Balance' : formData.allocation}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAllocationModalOpen(false)}
                                    className="flex-1 rounded-2xl border border-white/5 py-4 font-black text-muted-foreground/40 hover:bg-white/5 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em]"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!formData.amount || parseFloat(formData.amount) <= 0 || (actionType === 'Allocation' ? parseFloat(formData.amount) > availableBalance : parseFloat(formData.amount) > getBucketBalance(formData.allocation))}
                                    type="submit"
                                    className={cn(
                                        "flex-1 rounded-2xl py-4 font-black text-white hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-30 disabled:hover:scale-100",
                                        actionType === 'Return' ? "bg-loss shadow-loss/20" : "bg-primary shadow-primary/25"
                                    )}
                                >
                                    Authorize {actionType === 'Return' ? 'Return' : 'Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Security PIN Modal */}
            {isSecurityModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <ShieldCheck className="h-10 w-10" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                {actionType === 'Delete' ? 'Confirm Deletion' : 'Secure Authorization'}
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                {actionType === 'Delete'
                                    ? "Verify identity to remove this transaction record"
                                    : `Verify your identity to process this ${actionType?.toLowerCase()}`}
                            </p>
                        </div>

                        <div className="flex justify-between gap-3">
                            {[0, 1, 2, 3, 4, 5].map((idx) => (
                                <input
                                    key={idx}
                                    ref={el => { pinRefs.current[idx] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus={idx === 0}
                                    value={pinInput[idx]}
                                    onChange={(e) => handlePinChange(idx, e.target.value)}
                                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                    className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all italic shadow-inner"
                                />
                            ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 justify-center text-[10px] font-black uppercase tracking-widest text-primary/80 bg-primary/5 py-2 rounded-xl">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Encrypted transaction processing</span>
                            </div>
                            <button
                                onClick={() => setIsSecurityModalOpen(false)}
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                            >
                                Cancel Authorization
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
