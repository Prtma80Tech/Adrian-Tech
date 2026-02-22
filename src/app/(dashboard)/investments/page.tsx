import React from 'react';
import { InvestmentManager } from '@/components/investments/investment-manager';

export default function InvestmentsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Investments</h1>
                <p className="text-muted-foreground mt-2">Manage your stocks, crypto, and gold holdings in one place.</p>
            </div>

            <InvestmentManager />
        </div>
    );
}
