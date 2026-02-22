export type AssetType = 'Forex' | 'Stocks' | 'Crypto' | 'Digital Gold' | 'Cash';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  symbol: string;
  sector?: string;
  change24h?: number;
  previousChange24h?: number;
  status?: 'Running' | 'Closed';
  history?: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  dividends?: number;
  previousDividends?: number;
  allocatedCost?: number;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'Buy' | 'Sell';
  lot: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  result?: number;
  date: string;
  notes?: string;
  screenshotUrl?: string;
  status: 'Open' | 'Closed';
}

export interface Cashflow {
  id: string;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  date: string;
  description: string;
  allocation?: 'Trading' | 'Investment-Stocks' | 'Investment-Crypto' | 'Investment-Gold' | 'General';
}

export interface Account {
  id: string;
  name: string;
  platform: string;
  type: AssetType;
  balance: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  pin?: string;
}
