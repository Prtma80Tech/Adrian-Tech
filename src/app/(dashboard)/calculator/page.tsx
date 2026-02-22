import React from 'react';
import { RiskCalculator } from '@/components/calculator/risk-calculator';

export default function CalculatorPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Risk Management Calculator</h1>
                <p className="text-muted-foreground mt-2">Calculate your position size and manage your risk effectively.</p>
            </div>

            <RiskCalculator />
        </div>
    );
}
