'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, Gem, X, Save, Landmark, PieChart, Activity, Globe, ChevronUp, ChevronDown, Trash2, XCircle, RotateCcw, Edit3, ShieldCheck, AlertTriangle, Coins, Calendar, Clock } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Asset } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

// Professional Candlestick Component for Assets
function CandlestickChart({ history, timeframe }: { history?: any[], timeframe: string }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const aggregateData = (dailyData: any[], resolution: string) => {
        if (!dailyData || dailyData.length === 0) return [];
        if (resolution === '1D') return dailyData;

        const result: any[] = [];
        let currentGroup: any[] = [];
        const getGroupKey = (dateStr: string) => {
            const date = new Date(dateStr);
            if (resolution === '1W') {
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                return `${d.getUTCFullYear()}-W${weekNo}`;
            }
            if (resolution === '1M') return `${date.getFullYear()}-${date.getMonth()}`;
            if (resolution === '1Y') return `${date.getFullYear()}`;
            return dateStr;
        };

        let lastKey = '';
        dailyData.forEach((item) => {
            const key = getGroupKey(item.time);
            if (key !== lastKey && currentGroup.length > 0) {
                result.push({
                    time: currentGroup[0].time,
                    open: currentGroup[0].open,
                    high: Math.max(...currentGroup.map(g => g.high)),
                    low: Math.min(...currentGroup.map(g => g.low)),
                    close: currentGroup[currentGroup.length - 1].close,
                });
                currentGroup = [];
            }
            currentGroup.push(item);
            lastKey = key;
        });

        if (currentGroup.length > 0) {
            result.push({
                time: currentGroup[0].time,
                open: currentGroup[0].open,
                high: Math.max(...currentGroup.map(g => g.high)),
                low: Math.min(...currentGroup.map(g => g.low)),
                close: currentGroup[currentGroup.length - 1].close,
            });
        }
        return result;
    };

    const displayData = useMemo(() => {
        return aggregateData(history || [], timeframe);
    }, [history, timeframe]);

    useEffect(() => {
        if (!chartContainerRef.current || displayData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#a1a1aa',
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            grid: {
                vertLines: { color: '#1f1f1f', style: 2, visible: true },
                horzLines: { color: '#1f1f1f', style: 2, visible: true }
            },
            timeScale: {
                visible: true,
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#2D2D2D',
                barSpacing: 10,
            },
            rightPriceScale: {
                visible: true,
                borderVisible: false,
                borderColor: '#2D2D2D',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            crosshair: {
                mode: 1, // Magnet mode
                vertLine: {
                    color: '#3b82f6',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#3b82f6',
                },
                horzLine: {
                    color: '#3b82f6',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#3b82f6',
                },
            },
            handleScroll: true,
            handleScale: true,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            priceFormat: {
                type: 'price',
                precision: 0,
                minMove: 1,
            },
        });

        series.setData(displayData);
        chart.timeScale().fitContent();

        // Add CSS to hide the Lightweight Charts branding if desired, though usually kept for compliance
        // Here we just ensure the container looks sharp

        const handleResize = () => {
            if (chartContainerRef.current && chart) {
                chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [displayData]);

    return (
        <div className="relative h-full w-full bg-black/20 rounded-xl border border-white/5 overflow-hidden flex flex-col justify-end">
            <div className="absolute top-1 left-2 z-20">
                <span className="text-[7px] font-black uppercase tracking-widest text-primary/40">Market Real-Time Flow</span>
            </div>
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
}

export function InvestmentManager() {
    const [activeTab, setActiveTab] = useState<'Stocks' | 'Crypto' | 'Digital Gold'>('Stocks');
    const [statusFilter, setStatusFilter] = useState<'Running' | 'Closed'>('Running');
    const [currentTimeframe, setCurrentTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
    const [isTakeProfitModalOpen, setIsTakeProfitModalOpen] = useState(false);
    const [dividendAmount, setDividendAmount] = useState('');
    const [takeProfitFee, setTakeProfitFee] = useState('');
    const [securityAction, setSecurityAction] = useState<'delete' | 'close' | 'restore' | 'edit' | 'take-profit' | 'dividend' | 'restore-dividend' | 'reset' | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [pinInput, setPinInput] = useState(['', '', '', '', '', '']);
    const [newChangeValue, setNewChangeValue] = useState('');
    const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [capitalByTab, setCapitalByTab] = useState({
        'Stocks': 0,
        'Crypto': 0,
        'Digital Gold': 0
    });
    const [allocatedFunds, setAllocatedFunds] = useState(0); // For current tab compatibility
    const [isHydrated, setIsHydrated] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        sector: '',
        quantity: '',
        avgBuyPrice: '',
        currentPrice: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseAmount: '',
        tax: '',
    });

    const syncAllocations = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: transactions, error } = await supabase
            .from('cashflows')
            .select('*')
            .eq('user_id', user.id);

        if (transactions && !error) {
            const allocations = {
                'Stocks': 0,
                'Crypto': 0,
                'Digital Gold': 0
            };
            const map: Record<string, keyof typeof allocations> = {
                'Investment-Stocks': 'Stocks',
                'Investment-Crypto': 'Crypto',
                'Investment-Gold': 'Digital Gold'
            };

            transactions.forEach((t: any) => {
                const key = map[t.allocation];
                if (key) {
                    if (t.type === 'Income') allocations[key] += t.amount;
                    else allocations[key] -= t.amount;
                }
            });
            setCapitalByTab(allocations);
            setAllocatedFunds(allocations[activeTab as keyof typeof allocations] || 0);
        }
    };

    // Load from Supabase on start
    useEffect(() => {
        const fetchAssets = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mappedAssets: Asset[] = data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    symbol: item.symbol,
                    type: item.type,
                    quantity: item.quantity,
                    avgBuyPrice: item.avg_buy_price,
                    currentPrice: item.current_price,
                    status: item.status,
                    dividends: item.dividends,
                    sector: item.sector || '',
                    change24h: item.change24h || item.change_24h || 0,
                    previousChange24h: item.previous_change24h || 0,
                    history: item.history || [],
                    previousDividends: item.previous_dividends || 0,
                    allocatedCost: item.allocated_cost || (item.avg_buy_price * item.quantity)
                }));
                setAssets(mappedAssets);
            }
        };

        fetchAssets();
        syncAllocations();
        setIsHydrated(true);
    }, [activeTab]);

    // Auto-generate new candle on day change
    useEffect(() => {
        if (!isHydrated || assets.length === 0) return;

        const checkAndCreateNewCandles = () => {
            const today = new Date().toISOString().split('T')[0];
            let hasChanged = false;

            const updatedAssets = assets.map(asset => {
                const history = [...(asset.history || [])];
                const lastIdx = history.length - 1;

                if (lastIdx >= 0 && history[lastIdx].time !== today) {
                    // It's a new day! Create a new candle starting from previous close
                    const prevClose = history[lastIdx].close;
                    history.push({
                        time: today,
                        open: prevClose,
                        high: prevClose,
                        low: prevClose,
                        close: prevClose
                    });
                    hasChanged = true;
                    return { ...asset, history };
                }
                return asset;
            });

            if (hasChanged) {
                setAssets(updatedAssets);
            }
        };

        // Check immediately and then every minute to catch the day flip
        checkAndCreateNewCandles();
        const interval = setInterval(checkAndCreateNewCandles, 60000);
        return () => clearInterval(interval);
    }, [isHydrated, assets.length]); // We only trigger when asset count changes or hydrated



    const groupedGlobalStats = useMemo(() => {
        const categories: { type: 'Stocks' | 'Crypto' | 'Digital Gold', icon: any, color: string }[] = [
            { type: 'Stocks', icon: Landmark, color: 'text-blue-400' },
            { type: 'Crypto', icon: Coins, color: 'text-orange-400' },
            { type: 'Digital Gold', icon: Gem, color: 'text-yellow-400' }
        ];

        return categories.map(cat => {
            const allAssets = assets.filter(a => a.type === cat.type);
            const runningAssets = allAssets.filter(a => (a.status || 'Running') === 'Running');
            const closedAssets = allAssets.filter(a => a.status === 'Closed');

            const marketValue = runningAssets.reduce((acc, asset) => acc + (asset.currentPrice * asset.quantity), 0);
            const totalCost = allAssets.reduce((acc, asset) => acc + (asset.avgBuyPrice * asset.quantity), 0);
            const totalPL = allAssets.reduce((acc, asset) => acc + ((asset.currentPrice - asset.avgBuyPrice) * asset.quantity), 0);
            const yieldPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
            const capital = capitalByTab[cat.type] || 0;

            return {
                type: cat.type,
                icon: cat.icon,
                color: cat.color,
                capital,
                holding: marketValue,
                pl: totalPL,
                yield: yieldPct,
                runningCount: runningAssets.length,
                closedCount: closedAssets.length
            };
        });
    }, [assets, capitalByTab]);

    const totalPortfolioStats = useMemo(() => {
        const runningAssets = assets.filter(a => (a.status || 'Running') === 'Running');
        const totalHolding = runningAssets.reduce((acc, asset) => acc + (asset.currentPrice * asset.quantity), 0);
        const totalCost = assets.reduce((acc, asset) => acc + (asset.avgBuyPrice * asset.quantity), 0);
        const totalPL = assets.reduce((acc, asset) => acc + ((asset.currentPrice - asset.avgBuyPrice) * asset.quantity), 0);
        const yieldPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
        const totalCapital = Object.values(capitalByTab).reduce((a, b) => a + b, 0);

        return {
            holding: totalHolding,
            pl: totalPL,
            yield: yieldPct,
            capital: totalCapital
        };
    }, [assets, capitalByTab]);

    const instrumentStats = useMemo(() => {
        const filtered = assets.filter(a =>
            a.type === activeTab &&
            ((a.status || 'Running') === statusFilter)
        );
        const totalHolding = filtered.reduce((acc, asset) => acc + (asset.currentPrice * asset.quantity), 0);
        const totalCost = filtered.reduce((acc, asset) => acc + (asset.avgBuyPrice * asset.quantity), 0);
        const unrealizedPL = totalHolding - totalCost;
        const yieldPct = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;
        const totalDividends = filtered.reduce((acc, asset) => acc + (asset.dividends || 0), 0);

        const stats = [
            { label: `${activeTab} Holding`, value: formatCurrency(totalHolding, 'IDR'), icon: Wallet, color: 'text-primary' },
            { label: `${activeTab} P/L`, value: `${unrealizedPL >= 0 ? '+' : ''}${formatCurrency(unrealizedPL, 'IDR')}`, icon: TrendingUp, color: unrealizedPL >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Allocated Cost', value: formatCurrency(totalCost, 'IDR'), icon: DollarSign, color: 'text-gold' },
            { label: 'Instrument Yield', value: `${yieldPct >= 0 ? '+' : ''}${yieldPct.toFixed(2)}%`, icon: Gem, color: yieldPct >= 0 ? 'text-profit' : 'text-loss' },
        ];

        if (activeTab === 'Stocks') {
            stats.push({ label: 'Total Dividends', value: formatCurrency(totalDividends, 'IDR'), icon: Coins, color: 'text-gold' });
        }

        return stats;
    }, [assets, activeTab, statusFilter]);

    const filteredAssets = assets.filter(asset =>
        asset.type === activeTab &&
        ((asset.status || 'Running') === statusFilter)
    );

    const cleanNumber = (val: string) => {
        if (!val) return 0;
        let sanitized = val.toString();

        // Handle Indonesian format: dots as thousands, comma as decimal
        if (sanitized.includes(',') && sanitized.includes('.')) {
            // Standard IDR: 1.200,50 -> 1200.50
            sanitized = sanitized.replace(/\./g, '').replace(',', '.');
        } else if (sanitized.includes(',')) {
            // Simplified decimal: 1200,50 -> 1200.50
            sanitized = sanitized.replace(',', '.');
        } else if (sanitized.includes('.')) {
            const parts = sanitized.split('.');
            // If it's like 12.000 it's likely thousands, if it's 0.001 it's decimal
            if (parts[0] !== '0' && parts[1].length === 3) {
                sanitized = sanitized.replace(/\./g, '');
            }
        }

        return parseFloat(sanitized) || 0;
    };

    const handleAddInvestment = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Anda harus login untuk menambah investasi.");
            return;
        }

        let qty = 0;
        let buyPrice = 0;
        let currPrice = 0;
        let totalCost = 0;
        const purchaseDate = formData.purchaseDate || new Date().toISOString().split('T')[0];

        if (activeTab === 'Crypto' || activeTab === 'Digital Gold') {
            const originalPrice = cleanNumber(formData.avgBuyPrice);
            const buyAmountTotal = cleanNumber(formData.purchaseAmount);
            const taxAmount = cleanNumber(formData.tax);
            const netAmount = buyAmountTotal - taxAmount;

            qty = originalPrice > 0 ? netAmount / originalPrice : 0;
            buyPrice = originalPrice;
            currPrice = originalPrice;
            totalCost = buyAmountTotal;
        } else {
            qty = cleanNumber(formData.quantity);
            buyPrice = cleanNumber(formData.avgBuyPrice);
            currPrice = cleanNumber(formData.currentPrice || formData.avgBuyPrice);
            const brokerFee = cleanNumber(formData.tax);
            totalCost = Math.round(qty * buyPrice) + brokerFee;
        }

        if (totalCost > allocatedFunds) {
            alert(`Insufficient funds! Total cost (${formatCurrency(totalCost)}) exceeds allocated balance (${formatCurrency(allocatedFunds)}).`);
            return;
        }

        const initialCandle = {
            time: purchaseDate,
            open: buyPrice,
            high: Math.max(buyPrice, currPrice),
            low: Math.min(buyPrice, currPrice),
            close: currPrice
        };

        const newAssetDB = {
            user_id: user.id,
            name: (activeTab === 'Crypto' || activeTab === 'Digital Gold') ? formData.symbol.toUpperCase() : formData.name,
            symbol: formData.symbol.toUpperCase(),
            type: activeTab,
            sector: activeTab === 'Crypto' ? 'Crypto' : (activeTab === 'Digital Gold' ? 'Gold' : (formData.sector || 'General')),
            quantity: qty,
            avg_buy_price: buyPrice,
            current_price: currPrice,
            status: 'Running',
            history: [initialCandle],
            dividends: 0,
            allocated_cost: totalCost,
            // change24h and previous_change24h removed from insert to be more defensive
        };

        const { data, error } = await supabase
            .from('investments')
            .insert([newAssetDB])
            .select();

        if (error) {
            console.error("Supabase Error:", error);
            alert(`Gagal menyimpan investasi: ${error.message}`);
            return;
        }

        const savedItem = data[0];
        const newAssetUI: Asset = {
            id: savedItem.id,
            name: savedItem.name,
            symbol: savedItem.symbol,
            type: savedItem.type,
            quantity: savedItem.quantity,
            avgBuyPrice: savedItem.avg_buy_price,
            currentPrice: savedItem.current_price,
            status: savedItem.status,
            history: savedItem.history,
            dividends: savedItem.dividends,
            sector: savedItem.sector,
            change24h: savedItem.change24h,
            previousChange24h: savedItem.previous_change24h
        };

        setAssets(prev => [newAssetUI, ...prev]);

        // Sync to Cash Flow Cloud
        const map: Record<string, string> = {
            'Stocks': 'Investment-Stocks',
            'Crypto': 'Investment-Crypto',
            'Digital Gold': 'Investment-Gold'
        };
        const sourceAllocation = map[activeTab];

        const purchaseTransaction = {
            user_id: user.id,
            type: 'Expense',
            amount: totalCost,
            category: 'Asset Purchase',
            description: `Bought ${qty.toFixed(6)} ${newAssetUI.symbol}`,
            date: purchaseDate,
            allocation: sourceAllocation
        };

        const { error: cfError } = await supabase.from('cashflows').insert([purchaseTransaction]);
        if (cfError) {
            console.error("Cashflow Insert Error:", cfError);
            alert("Investasi disimpan, tapi gagal memotong saldo. Periksa Cashflow Anda.");
        }

        await syncAllocations();
        window.dispatchEvent(new Event('storage'));

        setIsAddModalOpen(false);
        setFormData({
            name: '',
            symbol: '',
            sector: '',
            quantity: '',
            avgBuyPrice: '',
            currentPrice: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseAmount: '',
            tax: '',
        });
    };

    const openSecurityCheck = (asset: Asset, action: 'delete' | 'close' | 'restore' | 'edit' | 'take-profit' | 'dividend' | 'restore-dividend' | 'reset') => {
        if (action === 'edit') {
            setSelectedAsset(asset);
            if (asset.type === 'Crypto' || asset.type === 'Digital Gold') {
                setNewChangeValue(asset.currentPrice.toString());
            } else {
                setNewChangeValue(asset.change24h?.toString() || '0');
            }
            setIsEditModalOpen(true);
            return;
        }

        if (action === 'take-profit') {
            setSelectedAsset(asset);
            setTakeProfitFee('0');
            setIsTakeProfitModalOpen(true);
            return;
        }

        setSelectedAsset(asset);
        setSecurityAction(action);
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
            executeSecuredAction();
        } else {
            alert("Invalid PIN. Access Denied.");
            setPinInput(['', '', '', '', '', '']);
            pinRefs.current[0]?.focus();
        }
    };

    const executeSecuredAction = async () => {
        if (!selectedAsset && securityAction !== 'reset') return;

        if (securityAction === 'delete' || securityAction === 'close') {
            if (selectedAsset) {
                const { error } = await supabase
                    .from('investments')
                    .delete()
                    .eq('id', selectedAsset.id);

                if (error) {
                    console.error("Error deleting investment:", error);
                    alert("Gagal menghapus data di Cloud.");
                    return;
                }

                // 1. Remove from assets
                setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));

                // 2. Sync to Cash Flow (Return funds)
                const savedCashflow = localStorage.getItem('cashflow_data');
                if (savedCashflow) {
                    const transactions = JSON.parse(savedCashflow);
                    const targetTxId = `buy-${selectedAsset.id}`;

                    const txToReverse = transactions.find((t: any) => t.id === targetTxId);
                    if (txToReverse) {
                        const updatedCashflow = transactions.filter((t: any) => t.id !== targetTxId);
                        localStorage.setItem('cashflow_data', JSON.stringify(updatedCashflow));
                        syncAllocations();
                        window.dispatchEvent(new Event('storage'));
                    }
                }
            }
        } else if (securityAction === 'restore') {
            if (selectedAsset) {
                const oldChange = selectedAsset.previousChange24h || 0;
                const currentChange = selectedAsset.change24h || 0;
                const refPrice = selectedAsset.currentPrice / (1 + currentChange / 100);
                const restoredPrice = refPrice * (1 + oldChange / 100);

                const today = new Date().toISOString().split('T')[0];
                const updatedHistory = [...(selectedAsset.history || [])];
                if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].time === today) {
                    updatedHistory[updatedHistory.length - 1].close = restoredPrice;
                }

                const { error } = await supabase
                    .from('investments')
                    .update({
                        current_price: restoredPrice,
                        change24h: oldChange,
                        previous_change24h: currentChange,
                        history: updatedHistory
                    })
                    .eq('id', selectedAsset.id);

                if (!error) {
                    setAssets(assets.map(a => {
                        if (a.id === selectedAsset.id) {
                            return { ...a, change24h: oldChange, currentPrice: restoredPrice, previousChange24h: currentChange, history: updatedHistory };
                        }
                        return a;
                    }));
                }
            }
        } else if (securityAction === 'take-profit') {
            if (selectedAsset) {
                const rawReturn = Math.round(selectedAsset.currentPrice * selectedAsset.quantity);
                const fee = cleanNumber(takeProfitFee);

                const { error } = await supabase
                    .from('investments')
                    .update({ status: 'Closed' })
                    .eq('id', selectedAsset.id);

                if (error) {
                    console.error("Error closing investment:", error);
                    alert("Gagal menutup investasi di Cloud.");
                    return;
                }

                // 1. Mark as closed in state
                setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, status: 'Closed' } : a));

                // 2. Add settlement to Cash Flow Cloud
                const map: Record<string, string> = {
                    'Stocks': 'Investment-Stocks',
                    'Crypto': 'Investment-Crypto',
                    'Digital Gold': 'Investment-Gold'
                };
                const targetAllocation = map[selectedAsset.type];
                const today = new Date().toISOString().split('T')[0];
                const userId = (await supabase.auth.getUser()).data.user?.id;

                if (selectedAsset.type === 'Stocks') {
                    const settlementTx = {
                        user_id: userId,
                        type: 'Income',
                        amount: rawReturn,
                        category: 'Asset Settlement',
                        description: `Take Profit ${selectedAsset.quantity} ${selectedAsset.symbol}`,
                        date: today,
                        allocation: targetAllocation
                    };

                    const feeTx = {
                        user_id: userId,
                        type: 'Expense',
                        amount: fee,
                        category: 'Broker Fee',
                        description: `Take Profit Fee ${selectedAsset.symbol}`,
                        date: today,
                        allocation: targetAllocation
                    };

                    await supabase.from('cashflows').insert([settlementTx, feeTx]);
                } else {
                    const netReturn = rawReturn - fee;
                    const settlementTx = {
                        user_id: userId,
                        type: 'Income',
                        amount: netReturn,
                        category: 'Asset Settlement',
                        description: `Take Profit ${selectedAsset.symbol} (Net after tax)`,
                        date: today,
                        allocation: targetAllocation
                    };

                    await supabase.from('cashflows').insert([settlementTx]);
                }

                syncAllocations();
                window.dispatchEvent(new Event('storage'));
            }
        } else if (securityAction === 'dividend') {
            if (selectedAsset && dividendAmount) {
                const amount = cleanNumber(dividendAmount);
                const newDividendTotal = (selectedAsset.dividends || 0) + amount;

                const { error } = await supabase
                    .from('investments')
                    .update({
                        dividends: newDividendTotal,
                        previous_dividends: amount
                    })
                    .eq('id', selectedAsset.id);

                if (error) {
                    console.error("Error recording dividend:", error);
                    alert("Gagal mencatat dividen di Cloud.");
                    return;
                }

                // Sync to Cash Flow Cloud
                const map: Record<string, string> = {
                    'Stocks': 'Investment-Stocks',
                    'Crypto': 'Investment-Crypto',
                    'Digital Gold': 'Investment-Gold'
                };
                const targetAllocation = map[selectedAsset.type];
                const userId = (await supabase.auth.getUser()).data.user?.id;

                const dividendTx = {
                    user_id: userId,
                    type: 'Income',
                    amount: amount,
                    category: 'Dividend',
                    description: `Dividend from ${selectedAsset.symbol}`,
                    date: new Date().toISOString().split('T')[0],
                    allocation: targetAllocation
                };

                await supabase.from('cashflows').insert([dividendTx]);
                syncAllocations();

                // Update asset's dividend total
                setAssets(prev => prev.map(a =>
                    a.id === selectedAsset.id
                        ? { ...a, dividends: (a.dividends || 0) + amount, previousDividends: amount }
                        : a
                ));

                window.dispatchEvent(new Event('storage'));
            }
        } else if (securityAction === 'restore-dividend') {
            if (selectedAsset && selectedAsset.previousDividends) {
                const amountToRevert = selectedAsset.previousDividends;

                const { error } = await supabase
                    .from('investments')
                    .update({
                        dividends: (selectedAsset.dividends || 0) - amountToRevert,
                        previous_dividends: 0
                    })
                    .eq('id', selectedAsset.id);

                if (error) {
                    console.error("Error reverting dividend:", error);
                    alert("Gagal membatalkan dividen di Cloud.");
                    return;
                }

                // Remove from Cash Flow Cloud
                const descMatch = `Dividend from ${selectedAsset.symbol}`;
                await supabase.from('cashflows').delete().eq('description', descMatch);

                syncAllocations();

                setAssets(prev => prev.map(a =>
                    a.id === selectedAsset.id
                        ? { ...a, dividends: (a.dividends || 0) - amountToRevert, previousDividends: 0 }
                        : a
                ));

                window.dispatchEvent(new Event('storage'));
                alert(`Successfully reverted previous dividend of ${formatCurrency(amountToRevert, 'IDR')}`);
            }
        } else if (securityAction === 'reset') {
            const { error } = await supabase
                .from('investments')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all matching user_id (RLS handles this)

            if (error) {
                console.error("Error resetting investments:", error);
                alert("Gagal mereset data di Cloud.");
                return;
            }

            setAssets([]);
            localStorage.removeItem('investment_data');
            alert("All investment records cleared. Dashboard will now show a clean slate.");
        }

        setIsSecurityModalOpen(false);
        setIsTakeProfitModalOpen(false);
        setSecurityAction(null);
        setSelectedAsset(null);
        setDividendAmount('');
        setTakeProfitFee('');
    };

    const handleUpdateChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset) return;

        const today = new Date().toISOString().split('T')[0];

        // Find actual asset in current state
        const a = assets.find(item => item.id === selectedAsset.id);
        if (!a) return;

        // Calculate Reference Price (Price at 0% change)
        const currentChange = a.change24h || 0;
        const refPrice = a.currentPrice / (1 + currentChange / 100);

        let newPrice = 0;
        let newChangeDigit = 0;

        if (selectedAsset.type === 'Crypto' || selectedAsset.type === 'Digital Gold') {
            newPrice = cleanNumber(newChangeValue);
            newChangeDigit = refPrice > 0 ? ((newPrice / refPrice) - 1) * 100 : 0;
        } else {
            newChangeDigit = parseFloat(newChangeValue) || 0;
            newPrice = refPrice * (1 + newChangeDigit / 100);
        }

        // Update history
        const updatedHistory = [...(a.history || [])];
        const lastIdx = updatedHistory.length - 1;

        if (lastIdx >= 0 && updatedHistory[lastIdx].time === today) {
            updatedHistory[lastIdx].close = newPrice;
            updatedHistory[lastIdx].high = Math.max(updatedHistory[lastIdx].high, newPrice);
            updatedHistory[lastIdx].low = Math.min(updatedHistory[lastIdx].low, newPrice);
        } else {
            const prevClose = lastIdx >= 0 ? updatedHistory[lastIdx].close : a.avgBuyPrice;
            updatedHistory.push({
                time: today,
                open: prevClose,
                high: Math.max(prevClose, newPrice),
                low: Math.min(prevClose, newPrice),
                close: newPrice
            });
        }

        const updatedData = {
            current_price: newPrice,
            change24h: newChangeDigit,
            previous_change24h: a.change24h,
            history: updatedHistory
        };

        const { error } = await supabase
            .from('investments')
            .update(updatedData)
            .eq('id', a.id);

        if (error) {
            console.error("Error updating investment:", error);
            alert("Gagal mengupdate data di Cloud.");
            return;
        }

        setAssets(assets.map(item => {
            if (item.id === selectedAsset.id) {
                return {
                    ...item,
                    previousChange24h: item.change24h,
                    change24h: newChangeDigit,
                    currentPrice: newPrice,
                    history: updatedHistory
                };
            }
            return item;
        }));

        setIsEditModalOpen(false);
        setSelectedAsset(null);
    };

    const handleTakeProfitFeeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsTakeProfitModalOpen(false);
        setSecurityAction('take-profit');
        setPinInput(['', '', '', '', '', '']);
        setIsSecurityModalOpen(true);
    };

    const handleDividend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset || !dividendAmount) return;
        const amount = cleanNumber(dividendAmount);
        if (amount <= 0) return;

        setIsDividendModalOpen(false);
        setSecurityAction('dividend');
        setPinInput(['', '', '', '', '', '']);
        setIsSecurityModalOpen(true);
    };


    return (
        <div className="space-y-12">
            {/* Global Stats */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 ml-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Portfolio Accumulation Index</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {groupedGlobalStats.map((group) => (
                        <div key={group.type} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0b]/60 p-6 backdrop-blur-xl transition-all hover:bg-white/[0.02] hover:border-primary/30">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 h-32 w-32 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl bg-white/5", group.color)}>
                                        <group.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">
                                        {group.type} <span className="text-[10px] text-muted-foreground/40 ml-1">Index</span>
                                    </h3>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">Available Capital</span>
                                    <span className="text-xs font-bold text-gold italic">{formatCurrency(group.capital, 'IDR')}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-2 border-t border-white/5 pt-6">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />
                                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">Running Assets</p>
                                    </div>
                                    <p className="text-2xl font-black italic text-white tracking-tighter">
                                        {group.runningCount} <span className="text-[10px] not-italic text-muted-foreground/20 ml-1 uppercase">Positions</span>
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">Closed / Settled</p>
                                    </div>
                                    <p className="text-2xl font-black italic text-white/40 tracking-tighter">
                                        {group.closedCount} <span className="text-[10px] not-italic text-muted-foreground/10 ml-1 uppercase">History</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Separate Summaries per Instrument */}
                <div className="mt-6 space-y-3">
                    {/* Global Total Row - High Contrast */}
                    <div className="flex flex-wrap items-center gap-4 px-6 py-2.5 rounded-2xl bg-primary/20 border border-primary/30 backdrop-blur-xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Global Portfolio Total:</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex gap-2 items-baseline">
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Market Value:</span>
                                <span className="text-sm font-black italic text-white">{formatCurrency(totalPortfolioStats.holding, 'IDR')}</span>
                            </div>
                            <div className="flex gap-2 items-baseline">
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Total P/L:</span>
                                <span className={cn("text-sm font-black italic", totalPortfolioStats.pl >= 0 ? 'text-profit' : 'text-loss')}>
                                    {totalPortfolioStats.pl >= 0 ? '+' : ''}{formatCurrency(totalPortfolioStats.pl, 'IDR')}
                                </span>
                            </div>
                            <div className="flex gap-2 items-baseline">
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Avg Yield:</span>
                                <span className={cn("text-sm font-black italic", totalPortfolioStats.yield >= 0 ? 'text-profit' : 'text-loss')}>
                                    {totalPortfolioStats.yield >= 0 ? '+' : ''}{totalPortfolioStats.yield.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Instrument Specific Rows */}
                    {groupedGlobalStats.map((group) => (
                        <div key={`full-summary-${group.type}`} className="flex flex-wrap items-center gap-4 px-6 py-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md transition-all hover:bg-white/[0.05] hover:border-white/20">
                            <div className="flex items-center gap-3 min-w-[200px]">
                                <group.icon className={cn("h-3.5 w-3.5", group.color)} />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{group.type} Summary:</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">Value:</span>
                                    <span className="text-xs font-black italic text-white/90">{formatCurrency(group.holding, 'IDR')}</span>
                                </div>
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">P/L:</span>
                                    <span className={cn("text-xs font-black italic", group.pl >= 0 ? 'text-profit' : 'text-loss')}>
                                        {group.pl >= 0 ? '+' : ''}{formatCurrency(group.pl, 'IDR')}
                                    </span>
                                </div>
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">Yield:</span>
                                    <span className={cn("text-xs font-black italic", group.yield >= 0 ? 'text-profit' : 'text-loss')}>
                                        {group.yield >= 0 ? '+' : ''}{group.yield.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                {/* Custom Tabs & Add Button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 w-fit">
                            {['Stocks', 'Crypto', 'Digital Gold'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={cn(
                                        "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                                        activeTab === tab
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5 w-fit">
                            {[
                                { id: 'Running', label: 'Hold / Running' },
                                { id: 'Closed', label: 'Closed' }
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setStatusFilter(s.id as any)}
                                    className={cn(
                                        "px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all rounded-lg",
                                        statusFilter === s.id
                                            ? "bg-white/20 text-white"
                                            : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/80 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 group"
                    >
                        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/20 group-hover:rotate-90 transition-transform duration-500">
                            <Plus className="h-4 w-4" />
                        </div>
                        Add New {activeTab}
                    </button>

                    <button
                        onClick={() => {
                            setSecurityAction('reset' as any);
                            setPinInput(['', '', '', '', '', '']);
                            setIsSecurityModalOpen(true);
                        }}
                        className="px-6 py-3.5 rounded-2xl border border-loss/20 bg-loss/5 text-loss text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-loss hover:text-white"
                    >
                        Reset All Data
                    </button>
                </div>

                {/* Instrument Specific Stats */}
                <div className={cn(
                    "grid grid-cols-1 gap-4 sm:grid-cols-2",
                    instrumentStats.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
                )}>
                    {instrumentStats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all hover:border-white/10">
                            <p className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest">{stat.label}</p>
                            <div className="mt-2 flex items-center justify-between">
                                <h4 className="text-lg font-black italic text-white tracking-tight">{stat.value}</h4>
                                <stat.icon className={cn("h-4 w-4 opacity-50", stat.color)} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Assets Grid - Single Column Wide Layout */}
                <div className="grid gap-6 grid-cols-1">
                    {filteredAssets.length > 0 ? (
                        [...filteredAssets].map((asset) => {
                            const dailyChange = asset.change24h || 0;
                            const profit = (asset.currentPrice - asset.avgBuyPrice) * asset.quantity;
                            const profitPct = asset.avgBuyPrice > 0 ? ((asset.currentPrice - asset.avgBuyPrice) / asset.avgBuyPrice) * 100 : 0;
                            const isPositive = profit >= 0;

                            return (
                                <div key={asset.id} className="group relative flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-[#0d0d0e] p-8 transition-all hover:bg-[#121214] hover:border-white/20 hover:shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                                    {/* Glassmorphism Background Elements */}
                                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all" />

                                    {/* 1. TOP HEADER SECTION (Name, Sector, Price, Percentage) */}
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-white tracking-tight leading-none">{asset.name}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{asset.symbol}</span>
                                                    <div className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider",
                                                        asset.type === 'Stocks' ? "bg-primary/10 text-primary border-primary/20" :
                                                            asset.type === 'Crypto' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                                "bg-gold/10 text-gold border-gold/20"
                                                    )}>
                                                        {asset.sector}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5",
                                                        asset.status === 'Closed' ? "text-muted-foreground/40" : "text-profit"
                                                    )}>
                                                        {asset.status === 'Closed' ? '(Closed)' : '(Hold/Running)'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

                                            <div className="space-y-1">
                                                <div className="text-2xl font-black italic tracking-tighter text-white">
                                                    {formatCurrency(asset.currentPrice, 'IDR')}
                                                </div>
                                                <div className={cn(
                                                    "flex items-center gap-1.5 text-xs font-black uppercase tracking-widest",
                                                    dailyChange >= 0 ? "text-profit text-glow-profit" : "text-loss text-glow-loss"
                                                )}>
                                                    {dailyChange >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    <span className="tabular-nums">{Math.abs(dailyChange).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {asset.status !== 'Closed' && (
                                                <div className="flex gap-2">
                                                    {asset.type === 'Stocks' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAsset(asset);
                                                                    setDividendAmount('');
                                                                    setIsDividendModalOpen(true);
                                                                }}
                                                                className="px-4 py-2 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-black transition-all border border-gold/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                                            >
                                                                <Coins className="h-3 w-3" />
                                                                Dividend
                                                            </button>
                                                            {(asset.previousDividends || 0) > 0 && (
                                                                <button
                                                                    onClick={() => openSecurityCheck(asset, 'restore-dividend')}
                                                                    className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                                                    title="Restore Last Dividend"
                                                                >
                                                                    <RotateCcw className="h-3 w-3" />
                                                                    Restore Div
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => openSecurityCheck(asset, 'take-profit')}
                                                        className="px-4 py-2 rounded-lg bg-profit/20 text-profit hover:bg-profit hover:text-white transition-all border border-profit/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                                    >
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Take Profit
                                                    </button>
                                                </div>
                                            )}
                                            {asset.status !== 'Closed' && (
                                                <>
                                                    <button
                                                        onClick={() => openSecurityCheck(asset, 'restore')}
                                                        className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-black transition-all border border-gold/20"
                                                        title="Restore Previous"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openSecurityCheck(asset, 'edit')}
                                                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                                                        title="Edit Change"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => openSecurityCheck(asset, 'delete')}
                                                className="p-2 rounded-lg bg-loss/10 text-loss hover:bg-loss hover:text-white transition-all border border-loss/20"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. BODY SECTION (Wide Chart on LEFT, Detailed Stats on RIGHT) */}
                                    <div className="flex flex-col xl:flex-row gap-8 items-stretch relative z-10">
                                        {/* Chart - Left Side (Expanded) */}
                                        <div className="flex-[2.5] flex flex-col gap-4">
                                            <div className="h-80 md:h-96">
                                                <CandlestickChart history={asset.history} timeframe={currentTimeframe} />
                                            </div>
                                            <div className="flex flex-col gap-6 mt-4">
                                                {/* Timeframe Selector - Aligned Left */}
                                                <div className="flex items-center gap-1.5 self-start bg-black/40 p-1.5 rounded-xl border border-white/5">
                                                    {['1D', '1W', '1M', '1Y'].map(tf => (
                                                        <button
                                                            key={tf}
                                                            onClick={() => setCurrentTimeframe(tf as any)}
                                                            className={cn(
                                                                "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                currentTimeframe === tf
                                                                    ? "bg-primary text-white font-bold"
                                                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                                            )}
                                                        >
                                                            {tf}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Combined Stats Bar - Aligned to Bottom */}
                                                <div className="mt-auto flex items-stretch bg-black/40 rounded-[1.5rem] border border-white/5 overflow-hidden divide-x divide-white/5">
                                                    <div className="flex-1 flex flex-col justify-center px-8 py-5 transition-all hover:bg-white/[0.02] group/stat">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary transition-colors group-hover/stat:bg-primary group-hover/stat:text-white">
                                                                <Wallet className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/stat:text-primary/60 transition-colors">Market Value / Holding</span>
                                                        </div>
                                                        <span className="text-2xl font-black italic text-white tracking-tighter leading-none group-hover/stat:scale-[1.02] origin-left transition-transform">
                                                            {formatCurrency(asset.currentPrice * asset.quantity, 'IDR')}
                                                        </span>
                                                    </div>

                                                    <div className="flex-1 flex flex-col justify-center px-8 py-5 transition-all hover:bg-white/[0.02] group/cost">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-1.5 rounded-lg bg-gold/10 text-gold transition-colors group-hover/cost:bg-gold group-hover/cost:text-black">
                                                                <Gem className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/cost:text-gold/60 transition-colors">Allocated Cost</span>
                                                        </div>
                                                        <span className="text-2xl font-black italic text-white tracking-tighter leading-none group-hover/cost:scale-[1.02] origin-left transition-transform">
                                                            {formatCurrency(asset.avgBuyPrice * asset.quantity, 'IDR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <div className="flex flex-col justify-between h-full gap-4">
                                                <div className="rounded-2xl bg-black/40 p-5 border border-white/5 flex flex-col justify-center">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Buy Price</p>
                                                    <p className="text-sm font-bold text-white/90">{formatCurrency(asset.avgBuyPrice, 'IDR')}</p>
                                                </div>
                                                <div className="rounded-2xl bg-black/40 p-5 border border-white/5 flex flex-col justify-center">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Total P/L</p>
                                                    <div className="flex items-end justify-between">
                                                        <p className={cn("text-lg font-black italic tracking-tighter", isPositive ? "text-profit" : "text-loss")}>
                                                            {formatCurrency(profit, 'IDR')}
                                                        </p>
                                                        <span className={cn("text-[10px] font-black mb-1", isPositive ? "text-profit/60" : "text-loss/60")}>
                                                            {isPositive ? '+' : ''}{profitPct.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-black/40 p-5 border border-white/5 flex flex-col justify-center">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Total Qty</p>
                                                    <p className="text-sm font-black text-white">
                                                        {(asset.type === 'Crypto' || asset.type === 'Digital Gold')
                                                            ? asset.quantity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
                                                            : asset.quantity.toLocaleString('id-ID')} {asset.type === 'Digital Gold' ? 'Grams' : 'Units'}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl bg-black/40 p-5 border border-white/5 flex flex-col justify-center">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Opening Date</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                                                        {asset.history && asset.history.length > 0
                                                            ? new Date(asset.history[0].time).toLocaleDateString('id-ID', {
                                                                weekday: 'long',
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })
                                                            : '-'}
                                                    </p>
                                                </div>
                                                {asset.type === 'Stocks' && (
                                                    <>
                                                        <div className="rounded-2xl bg-gold/5 p-5 border border-gold/10 flex flex-col justify-center">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/40 mb-1">Total Dividends</p>
                                                            <p className="text-sm font-black text-gold">{formatCurrency(asset.dividends || 0, 'IDR')}</p>
                                                        </div>
                                                        <div className="rounded-2xl bg-black/40 p-5 border border-white/5 flex flex-col justify-center">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Value in Lots</p>
                                                            <p className="text-sm font-black text-white">{(asset.quantity / 100).toFixed(2)} Lots</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.02]">
                            <Landmark className="h-16 w-16 text-muted-foreground mb-6 opacity-20" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">No {activeTab} Assets</h3>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2 opacity-60">Deposit and allocate funds to start investing</p>
                        </div>
                    )}
                </div>

                {/* Modals */}
                {/* Add Investment Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                        <div className="w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="relative border-b border-white/5 bg-white/[0.01] p-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                                            <Landmark className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Add {activeTab}</h3>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Configure your new position</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="rounded-full bg-white/5 p-2.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all ring-1 ring-white/5"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleAddInvestment} className="p-10 space-y-8">
                                <div className="space-y-6">
                                    {(activeTab === 'Crypto' || activeTab === 'Digital Gold') ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">
                                                        {activeTab === 'Crypto' ? 'Coin Name' : 'Gold Type / Provider'}
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder={activeTab === 'Crypto' ? "e.g. BTC" : "e.g. ANTAM"}
                                                        value={formData.symbol}
                                                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black uppercase placeholder:text-muted-foreground/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Date Purchased</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        value={formData.purchaseDate}
                                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">
                                                    {activeTab === 'Crypto' ? 'Original Coin Price (Harga Asli)' : 'Gold Price Per Gram (Harga per Gram)'}
                                                </label>
                                                <input
                                                    required
                                                    type="number"
                                                    placeholder={activeTab === 'Crypto' ? "e.g. 1000000000" : "e.g. 2801593"}
                                                    value={formData.avgBuyPrice}
                                                    onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                                                    className="w-full rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-6 py-5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black text-2xl italic"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gold ml-2">Purchase Amount (Budget)</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        placeholder="e.g. 300000"
                                                        value={formData.purchaseAmount}
                                                        onChange={(e) => setFormData({ ...formData, purchaseAmount: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-loss ml-2">Tax Deduction (Pajak)</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        placeholder="e.g. 3000"
                                                        value={formData.tax}
                                                        onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Company Name</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="e.g. Nvidia Corp"
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Ticker Symbol</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="NVDA"
                                                        value={formData.symbol}
                                                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black uppercase placeholder:text-muted-foreground/30"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Sector / Industry</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Technology"
                                                    value={formData.sector}
                                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/30"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Shares Count</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.0001"
                                                    placeholder="0.00"
                                                    value={formData.quantity}
                                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                    className="w-full rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-6 py-5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black text-2xl italic"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gold ml-2">Buy Price (Rp)</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0"
                                                        value={formData.avgBuyPrice}
                                                        onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-profit ml-2">Current Market (Rp)</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0"
                                                        value={formData.currentPrice}
                                                        onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                                                        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-loss ml-2">Broker Fee / Tax (Rp)</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0"
                                                    value={formData.tax}
                                                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                                                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                                                />
                                                <p className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-widest ml-2">Fee will be deducted from available capital</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 rounded-2xl border border-white/5 py-4 font-black text-muted-foreground/40 hover:bg-white/5 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] rounded-2xl bg-primary py-4 font-black text-white hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        <Save className="h-4 w-4" />
                                        Confirm Portfolio Entry
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
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-loss/10 text-loss ring-1 ring-loss/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                <ShieldCheck className="h-10 w-10" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Security Verification</h3>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                    {securityAction === 'delete' ? "Confirm permanent deletion of this asset" :
                                        securityAction === 'close' ? "Verify identity to close this investment" :
                                            securityAction === 'dividend' ? "Confirm recording of dividend income" :
                                                securityAction === 'restore-dividend' ? "Authorization to revert previous dividend" :
                                                    securityAction === 'take-profit' ? "Confirm take profit and close position" :
                                                        "Authorization required to restore previous data"}
                                </p>
                            </div>

                            <div className="flex justify-between gap-3">
                                {pinInput.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => { pinRefs.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        autoFocus={idx === 0}
                                        value={digit}
                                        onChange={(e) => handlePinChange(idx, e.target.value)}
                                        onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                        className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all italic shadow-inner"
                                    />
                                ))}
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 justify-center text-[10px] font-black uppercase tracking-widest text-loss/80 bg-loss/5 py-2 rounded-xl">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>This action cannot be undone</span>
                                </div>
                                <button
                                    onClick={() => setIsSecurityModalOpen(false)}
                                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                                >
                                    Cancel Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Performance Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                        <div className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Edit3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Edit Performance</h3>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                                        {(selectedAsset?.type === 'Crypto' || selectedAsset?.type === 'Digital Gold') ? 'Update Current Asset Price' : 'Update Daily Change %'}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateChange} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">
                                        {(selectedAsset?.type === 'Crypto' || selectedAsset?.type === 'Digital Gold') ? `New ${selectedAsset.type} Price` : 'New Change Percentage (%)'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            autoFocus
                                            value={newChangeValue}
                                            onChange={(e) => setNewChangeValue(e.target.value)}
                                            className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black text-3xl italic text-center"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-xl">
                                            {(selectedAsset?.type === 'Crypto' || selectedAsset?.type === 'Digital Gold') ? 'Rp' : '%'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 rounded-xl border border-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] rounded-xl bg-primary py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Update Price
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Dividend Modal */}
                {isDividendModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                        <div className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center ring-1 ring-gold/20">
                                    <Coins className="h-8 w-8 text-gold" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Record Dividend</h4>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Incoming Dividend from {selectedAsset?.symbol}</p>
                                </div>

                                <form onSubmit={handleDividend} className="w-full space-y-4">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={dividendAmount}
                                                onChange={(e) => setDividendAmount(e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white text-2xl font-black italic focus:outline-none focus:ring-2 focus:ring-gold/50"
                                            />
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/20 text-xs font-bold pointer-events-none">Rp</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsDividendModalOpen(false)}
                                            className="flex-1 rounded-xl bg-white/5 py-4 text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] rounded-xl bg-gold py-4 text-[9px] font-black text-black uppercase tracking-widest shadow-lg shadow-gold/20 hover:scale-[1.02] transition-all"
                                        >
                                            Record Dividend
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Take Profit Modal */}
                {isTakeProfitModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                        <div className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#0d0d0e] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="h-16 w-16 rounded-full bg-profit/10 flex items-center justify-center ring-1 ring-profit/20">
                                    <ShieldCheck className="h-8 w-8 text-profit" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Settlement Tax / Fee</h4>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Closing {selectedAsset?.symbol} position
                                    </p>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2 px-4 italic">
                                        {selectedAsset?.type === 'Stocks'
                                            ? "Broker fee will be deducted from your Available Capital"
                                            : "Pajak/Fee will be deducted from your total profit"}
                                    </p>
                                </div>

                                <form onSubmit={handleTakeProfitFeeSubmit} className="w-full space-y-4">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={takeProfitFee}
                                                onChange={(e) => setTakeProfitFee(e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white text-2xl font-black italic focus:outline-none focus:ring-2 focus:ring-profit/50"
                                            />
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/20 text-xs font-bold pointer-events-none">Rp</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsTakeProfitModalOpen(false);
                                                setSelectedAsset(null);
                                            }}
                                            className="flex-1 rounded-xl bg-white/5 py-4 text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] rounded-xl bg-profit py-4 text-[9px] font-black text-white uppercase tracking-widest shadow-lg shadow-profit/20 hover:scale-[1.02] transition-all"
                                        >
                                            Next: Verify PIN
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
