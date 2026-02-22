'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Maximize2, Minimize2, Settings2 } from 'lucide-react';

interface TVChartProps {
    data: any[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export function TVChart({ data, colors = {} }: TVChartProps) {
    const {
        backgroundColor = 'transparent',
        lineColor = '#3b82f6',
        textColor = '#a1a1aa',
        areaTopColor = 'rgba(59, 130, 246, 0.3)',
        areaBottomColor = 'rgba(59, 130, 246, 0.0)',
    } = colors;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const [timeframe, setTimeframe] = useState('1D');

    const aggregateData = (dailyData: any[], resolution: string) => {
        if (!dailyData || dailyData.length === 0) return [];
        if (resolution === '1D') return dailyData;

        const result: any[] = [];
        let currentGroup: any[] = [];

        const getGroupKey = (dateStr: string) => {
            const date = new Date(dateStr);
            if (resolution === '1W') {
                // Group by Week (Year and Week number)
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                return `${d.getUTCFullYear()}-W${weekNo}`;
            }
            if (resolution === '1M') {
                return `${date.getFullYear()}-${date.getMonth()}`;
            }
            if (resolution === '1Y') {
                return `${date.getFullYear()}`;
            }
            return dateStr;
        };

        let lastKey = '';

        dailyData.forEach((item) => {
            const key = getGroupKey(item.time);
            if (key !== lastKey && currentGroup.length > 0) {
                // Process finished group
                result.push({
                    time: currentGroup[0].time,
                    open: currentGroup[0].open,
                    high: Math.max(...currentGroup.map(g => g.high)),
                    low: Math.min(...currentGroup.map(g => g.low)),
                    close: currentGroup[currentGroup.length - 1].close,
                    value: currentGroup[currentGroup.length - 1].close
                });
                currentGroup = [];
            }
            currentGroup.push(item);
            lastKey = key;
        });

        // Last group
        if (currentGroup.length > 0) {
            result.push({
                time: currentGroup[0].time,
                open: currentGroup[0].open,
                high: Math.max(...currentGroup.map(g => g.high)),
                low: Math.min(...currentGroup.map(g => g.low)),
                close: currentGroup[currentGroup.length - 1].close,
                value: currentGroup[currentGroup.length - 1].close
            });
        }

        return result;
    };

    const displayData = React.useMemo(() => {
        return aggregateData(data, timeframe);
    }, [data, timeframe]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#1f1f1f' },
                horzLines: { color: '#1f1f1f' },
            },
            timeScale: {
                borderColor: '#1f1f1f',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#1f1f1f',
            },
        });

        setChartInstance(chart);

        const handleResize = () => {
            if (chartContainerRef.current && chart) {
                chart.applyOptions({
                    width: chartContainerRef.current.offsetWidth,
                    height: window.innerWidth < 640 ? 300 : 400
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            setChartInstance(null);
            seriesRef.current = null;
        };
    }, [backgroundColor, textColor]);

    useEffect(() => {
        if (!chartInstance) return;

        if (seriesRef.current) {
            try {
                chartInstance.removeSeries(seriesRef.current);
            } catch (err) {
                console.warn('Failed to remove series:', err);
            }
            seriesRef.current = null;
        }

        const series = chartInstance.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });
        series.setData(displayData);
        seriesRef.current = series;

        // Fit content when data changes
        chartInstance.timeScale().fitContent();
    }, [chartInstance, displayData]);

    return (
        <div className="relative rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Portfolio Performance</h3>
                    <p className="text-sm text-muted-foreground">Historical asset value growth</p>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full" />

            <div className="mt-4 flex gap-4">
                {['1D', '1W', '1M', '1Y', 'ALL'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`text-xs font-bold transition-all px-2 py-1 rounded-md ${timeframe === tf
                            ? 'bg-primary/20 text-primary'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                            }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>
        </div>
    );
}
