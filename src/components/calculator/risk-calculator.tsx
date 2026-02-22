'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Info, RotateCcw, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RiskCalculator() {
    const [balance, setBalance] = useState<number>(1000);
    const [riskPercent, setRiskPercent] = useState<number>(1);
    const [stopLossPips, setStopLossPips] = useState<number>(20);
    const [rewardRatio, setRewardRatio] = useState<number>(2);
    const [isJpyPair, setIsJpyPair] = useState<boolean>(false);

    const [lotSize, setLotSize] = useState<number>(0);
    const [maxLoss, setMaxLoss] = useState<number>(0);
    const [tpPips, setTpPips] = useState<number>(0);

    useEffect(() => {
        const riskAmount = balance * (riskPercent / 100);
        setMaxLoss(riskAmount);

        const exchangeRate = 16000; // Default conversion for IDR account pip calculation
        let pipValue = 10 * exchangeRate; // Value of 1 pip for 1.0 lot in IDR
        if (isJpyPair) {
            pipValue = 8.5 * exchangeRate; // Rough average for JPY pairs in IDR
        }

        const calculatedLot = riskAmount / (stopLossPips * pipValue);
        setLotSize(Number(calculatedLot.toFixed(2)));

        setTpPips(stopLossPips * rewardRatio);
    }, [balance, riskPercent, stopLossPips, rewardRatio, isJpyPair]);

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Calculator className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold">Input Parameters</h3>
                    </div>
                    <button
                        onClick={() => { setBalance(1000); setRiskPercent(1); setStopLossPips(20); setRewardRatio(2); }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Balance (Rp)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                            <input
                                type="number"
                                value={balance}
                                onChange={(e) => setBalance(Number(e.target.value))}
                                className="w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Risk (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={riskPercent}
                                onChange={(e) => setRiskPercent(Number(e.target.value))}
                                className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SL (Pips)</label>
                            <input
                                type="number"
                                value={stopLossPips}
                                onChange={(e) => setStopLossPips(Number(e.target.value))}
                                className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reward Ratio (1 : X)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rewardRatio}
                            onChange={(e) => setRewardRatio(Number(e.target.value))}
                            className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Currency Group</label>
                        <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl border border-border">
                            <button
                                onClick={() => setIsJpyPair(false)}
                                className={cn(
                                    "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all",
                                    !isJpyPair ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                Standard Pairs
                            </button>
                            <button
                                onClick={() => setIsJpyPair(true)}
                                className={cn(
                                    "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all",
                                    isJpyPair ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                JPY Pairs
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-primary/[0.03] p-8 relative overflow-hidden ring-1 ring-primary/10">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-profit/5 blur-3xl" />

                    <h3 className="relative z-10 mb-8 text-xl font-bold border-b border-primary/10 pb-4">Calculation Results</h3>

                    <div className="relative z-10 grid gap-8 sm:grid-cols-2">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-primary/80">Position Size</p>
                            <p className="text-4xl font-black text-foreground">{lotSize} <span className="text-base font-normal text-muted-foreground">Lots</span></p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-loss/80">Max Risk Amount</p>
                            <p className="text-4xl font-black text-loss">Rp{maxLoss.toLocaleString('id-ID')}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-profit/80">TP Distance</p>
                            <p className="text-4xl font-black text-profit">{tpPips} <span className="text-base font-normal text-muted-foreground">Pips</span></p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-gold/80">Pip Value (approx)</p>
                            <p className="text-4xl font-black text-foreground">Rp{(isJpyPair ? 8.5 * 16000 : 10 * 16000).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-10 rounded-xl bg-secondary/50 p-4 border border-border">
                        <div className="flex gap-4">
                            <div className="p-2 rounded-lg bg-primary/20 h-fit shrink-0">
                                <Info className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed italic">
                                Calculations assume a standard 100k unit contract. Results are estimates to assist your decision process; verify with your platform's specific pip dynamics.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 bg-gradient-to-br from-card to-secondary/20">
                    <h4 className="mb-3 font-bold text-gold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Risk Management Rule
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Consistency over intensity. Most professional traders risk only <span className="text-foreground font-bold italic">0.5% - 2.0%</span> per trade. Protecting your capital is the first step to growing it.
                    </p>
                </div>
            </div>
        </div>
    );
}
