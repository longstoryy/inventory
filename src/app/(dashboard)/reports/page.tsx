'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, Title, AreaChart, BarChart, DonutChart, Text, Flex, BadgeDelta, Grid, Metric, ProgressBar, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react'

interface ReportData {
    summary: {
        totalRevenue: number
        totalTax: number
        transactionCount: number
        averageOrderValue: number
        revenueGrowth: number
    }
    profitability: {
        revenue: number
        cogs: number
        profit: number
    }
    timeSeries: Array<{
        date: string
        revenue: number
    }>
    topProducts: Array<{
        name: string
        quantitySold: number
        revenue: number
    }>
    byPaymentMethod: Array<{
        paymentMethod: string
        _sum: { total: number }
    }>
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch('/api/reports/sales')
                const d = await res.json()
                if (d.success) setData(d.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchReport()
    }, [])

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n)

    if (loading) return (
        <DashboardLayout>
            <div className="animate-pulse space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
                </div>
                <div className="h-[450px] bg-slate-100 rounded-3xl"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="h-[400px] bg-slate-100 rounded-3xl"></div>
                    <div className="h-[400px] bg-slate-100 rounded-3xl"></div>
                </div>
            </div>
        </DashboardLayout>
    )

    if (!data) return (
        <DashboardLayout>
            <div className="h-full flex flex-col items-center justify-center executive-card p-10 bg-slate-50/50 border-dashed">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                    <svg width="32" height="32" className="text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Failed to Load Reports</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-xs text-center">We couldn&apos;t generate the analytics at this moment. Please try refreshing.</p>
                <button onClick={() => location.reload()} className="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Reload Page</button>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-executive-dark tracking-tighter">Executive Intelligence</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Verified performance analytics and institutional intelligence.</p>
                    </div>
                    <button 
                        onClick={() => {
                            if (!data) return;
                            const headers = ['Date', 'Revenue'];
                            const rows = data.timeSeries.map(s => [s.date, s.revenue]);
                            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="btn-executive text-xs"
                    >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                        Export Intelligence
                    </button>
                </div>

                {/* Performance Metrics */}
                <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
                    <Card className="executive-card p-6 !border-none !ring-0" decoration="top" decorationColor="slate">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</Text>
                        <Flex className="mt-2" justifyContent="start" alignItems="baseline">
                            <Metric className="text-2xl font-black text-slate-900">{formatCurrency(data.summary.totalRevenue)}</Metric>
                            <BadgeDelta deltaType={data.summary.revenueGrowth >= 0 ? "moderateIncrease" : "moderateDecrease"} className="ml-3">
                                {data.summary.revenueGrowth.toFixed(1)}%
                            </BadgeDelta>
                        </Flex>
                        <Text className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue vs 100k Target</Text>
                        <ProgressBar value={Math.min(100, (data.summary.totalRevenue / 100000) * 100)} color="emerald" className="mt-2" />
                    </Card>

                    <Card className="executive-card p-6 !border-none !ring-0">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Throughput</Text>
                        <Metric className="mt-2 text-2xl font-black text-slate-900">{data.summary.transactionCount}</Metric>
                        <Text className="mt-1 text-[10px] font-bold text-success uppercase">Active Transactions</Text>
                    </Card>

                    <Card className="executive-card p-6 !border-none !ring-0">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency (AOV)</Text>
                        <Metric className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(data.summary.averageOrderValue)}</Metric>
                        <Text className="mt-1 text-[10px] font-bold text-slate-400 uppercase">Avg Ticket Value</Text>
                    </Card>

                    <Card className="executive-card p-6 !border-none !ring-0 bg-executive-dark text-white">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</Text>
                        <Metric className="mt-2 text-2xl font-black text-white">{formatCurrency(data.profitability.profit)}</Metric>
                        <Text className="mt-1 text-[10px] font-bold text-executive-accent uppercase">
                            {data.profitability.revenue > 0
                                ? `${((data.profitability.profit / data.profitability.revenue) * 100).toFixed(1)}% Gross Margin`
                                : '0% Margin'}
                        </Text>
                    </Card>
                </Grid>

                {/* Revenue Trend Chart */}
                <Card className="executive-card p-8 !border-none !ring-0 bg-white">
                    <Title className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-10">Revenue Trajectory // 30-Day Cycle</Title>
                    <AreaChart
                        className="h-80 mt-4"
                        data={data.timeSeries}
                        index="date"
                        categories={["revenue"]}
                        colors={["slate"]}
                        valueFormatter={formatCurrency}
                        showLegend={false}
                        showGridLines={false}
                        curveType="monotone"
                    />
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Yield Assets */}
                    <Card className="executive-card p-8 !border-none !ring-0 bg-white">
                        <Title className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-10">Primary Yield Assets</Title>
                        <BarChart
                            className="h-72 mt-4"
                            data={data.topProducts.slice(0, 5)}
                            index="name"
                            categories={["revenue"]}
                            colors={["amber"]}
                            valueFormatter={formatCurrency}
                            layout="vertical"
                            showLegend={false}
                        />
                    </Card>

                    {/* Method Distribution */}
                    <Card className="executive-card p-8 !border-none !ring-0 bg-white overflow-hidden">
                        <Title className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-10">Execution Channel Distribution</Title>
                        <DonutChart
                            className="h-72 mt-4"
                            data={data.byPaymentMethod.map(m => ({ name: m.paymentMethod, value: m._sum.total }))}
                            category="value"
                            index="name"
                            colors={["slate", "amber", "gray"]}
                            valueFormatter={formatCurrency}
                        />
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            {data.byPaymentMethod.map((m, i) => (
                                <div key={m.paymentMethod} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-slate-900' : i === 1 ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{m.paymentMethod}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
