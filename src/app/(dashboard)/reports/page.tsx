import React from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Financial Reports</h1>
                    <p className="text-muted-foreground mt-2">Deep dive into your portfolio performance and tax summaries.</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-bold hover:bg-border transition-all">
                    <Download className="h-5 w-5" />
                    Export CSV
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-xl font-bold">Monthly Performance Report</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">Detailed breakdown of P/L, DRAWDOWN, and SHARPE RATIO.</p>
                    <button className="rounded-lg bg-primary px-8 py-2 text-sm font-bold text-white">Generate Report</button>
                </div>
                <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
                    <Filter className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-xl font-bold">Tax Summary 2024</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">Consolidated view of capital gains and dividends for tax filing.</p>
                    <button className="rounded-lg bg-secondary px-8 py-2 text-sm font-bold">Coming Soon</button>
                </div>
            </div>
        </div>
    );
}
