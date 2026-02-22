import React from 'react';
import { TradingJournal } from '@/components/trading/trading-journal';

export default function JournalPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Trading Journal</h1>
                <p className="text-muted-foreground mt-2">Log and analyze your forex trades to improve your edge.</p>
            </div>

            <TradingJournal />
        </div>
    );
}
