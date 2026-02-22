import { Asset, Trade, Cashflow, Account } from './types';

export const mockAssets: Asset[] = [
    { id: '1', name: 'Apple Inc.', type: 'Stocks', quantity: 10, avgBuyPrice: 150, currentPrice: 185.92, symbol: 'AAPL' },
    { id: '2', name: 'Bitcoin', type: 'Crypto', quantity: 0.05, avgBuyPrice: 30000, currentPrice: 64200.50, symbol: 'BTC' },
    { id: '3', name: 'Digital Gold (Antam)', type: 'Digital Gold', quantity: 25, avgBuyPrice: 1000000, currentPrice: 1250000, symbol: 'GOLD' },
    { id: '4', name: 'Ethereum', type: 'Crypto', quantity: 1.2, avgBuyPrice: 1800, currentPrice: 3450.20, symbol: 'ETH' },
];

export const mockTrades: Trade[] = [
    {
        id: '1',
        pair: 'EUR/USD',
        type: 'Buy',
        lot: 0.1,
        entryPrice: 1.0850,
        exitPrice: 1.0920,
        stopLoss: 1.0820,
        takeProfit: 1.0950,
        result: 1120000,
        date: '2026-02-12', // This week
        status: 'Closed',
        screenshotUrl: 'https://images.unsplash.com/photo-1611974717482-4828c89f5d34?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: '2',
        pair: 'GBP/JPY',
        type: 'Sell',
        lot: 0.05,
        entryPrice: 190.50,
        stopLoss: 191.00,
        takeProfit: 188.50,
        result: -450000,
        date: '2026-02-13', // This week
        status: 'Closed',
        screenshotUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: '3',
        pair: 'XAU/USD',
        type: 'Buy',
        lot: 0.02,
        entryPrice: 2035.50,
        exitPrice: 2045.20,
        stopLoss: 2025.00,
        takeProfit: 2055.00,
        result: 3104000,
        date: '2026-01-20', // This year, but last month
        status: 'Closed',
        screenshotUrl: 'https://images.unsplash.com/photo-1640341719941-bd566213756d?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: '4',
        pair: 'BTC/USD',
        type: 'Sell',
        lot: 0.01,
        entryPrice: 65200,
        stopLoss: 66500,
        takeProfit: 62000,
        result: -1920000,
        date: '2025-12-25', // Last year
        status: 'Closed',
        screenshotUrl: 'https://images.unsplash.com/photo-1644659147025-2428ba365f5f?auto=format&fit=crop&q=80&w=800'
    }
];

export const mockCashflow: Cashflow[] = [
    { id: '1', type: 'Income', amount: 15000000, category: 'Salary', date: '2024-03-01', description: 'Monthly Salary' },
    { id: '2', type: 'Expense', amount: 2000000, category: 'Rent', date: '2024-03-02', description: 'Apartment rent' },
    { id: '3', type: 'Expense', amount: 500000, category: 'Food', date: '2024-03-03', description: 'Groceries' },
];

export const mockAccounts: Account[] = [
    { id: '1', name: 'IC Markets', platform: 'MetaTrader 5', type: 'Forex', balance: 2500 },
    { id: '2', name: 'Indodax', platform: 'Mobile App', type: 'Crypto', balance: 15000000 },
    { id: '3', name: 'Peluang', platform: 'Peluang App', type: 'Digital Gold', balance: 5000000 },
];
