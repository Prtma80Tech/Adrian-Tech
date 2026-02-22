import React from 'react';
import { CashflowManager } from '@/components/cashflow/cashflow-manager';

export default function CashflowPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Cashflow</h1>
                <p className="text-muted-foreground mt-2">Track your income and expenses to manage your personal runway.</p>
            </div>

            <CashflowManager />
        </div>
    );
}
