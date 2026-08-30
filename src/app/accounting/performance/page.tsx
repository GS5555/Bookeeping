
'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Sale, SaleReturn, PurchaseOrder, Expense, Category, Product } from '@/lib/types';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfQuarter, 
    endOfQuarter, 
    startOfYear, 
    endOfYear, 
    subMonths, 
    subQuarters, 
    subYears,
    isWithinInterval,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { 
    TrendingUp, 
    TrendingDown, 
    CircleDollarSign, 
    ArrowLeftRight, 
    ShoppingCart, 
    Wallet, 
    Scale, 
    Download, 
    Printer, 
    ChevronDown, 
    ChevronUp,
    BarChart3
} from 'lucide-react';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart, ChartType } from '@/components/dashboard/generic-chart';
import { DataTable } from '@/components/data-table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { exportToExcel, downloadGenericReportPdf } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { useIsMounted } from '@/hooks/use-is-mounted';

const STORE_ID = 'store_main';

type PeriodType = 'monthly' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'yearly' | 'custom';

export default function PerformanceReportPage() {
    const isMounted = useIsMounted();
    const firestore = useFirestore();

    const [period, setPeriod] = useState<PeriodType>('monthly');
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [customRange, setCustomRange] = useState({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') });

    // Data Subscriptions
    const salesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc')) : null, [firestore]);
    const { data: sales } = useCollection<Sale>(salesRef);

    const returnsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'salesReturns'), orderBy('returnDate', 'desc')) : null, [firestore]);
    const { data: returns } = useCollection<SaleReturn>(returnsRef);

    const poRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'purchaseOrders'), orderBy('orderDate', 'desc')) : null, [firestore]);
    const { data: purchases } = useCollection<PurchaseOrder>(poRef);

    const expensesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'expenses'), orderBy('date', 'desc')) : null, [firestore]);
    const { data: expenses } = useCollection<Expense>(expensesRef);

    const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesRef);

    // Period Calculation Utility
    const getDateRange = (type: PeriodType, range?: { from: string, to: string }) => {
        const now = new Date();
        const year = now.getFullYear();
        
        switch (type) {
            case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now), prevStart: startOfMonth(subMonths(now, 1)), prevEnd: endOfMonth(subMonths(now, 1)) };
            case 'q1': return { start: new Date(year, 0, 1), end: new Date(year, 2, 31), prevStart: new Date(year - 1, 0, 1), prevEnd: new Date(year - 1, 2, 31) };
            case 'q2': return { start: new Date(year, 3, 1), end: new Date(year, 5, 30), prevStart: new Date(year - 1, 3, 1), prevEnd: new Date(year - 1, 5, 30) };
            case 'q3': return { start: new Date(year, 6, 1), end: new Date(year, 8, 30), prevStart: new Date(year - 1, 6, 1), prevEnd: new Date(year - 1, 8, 30) };
            case 'q4': return { start: new Date(year, 9, 1), end: new Date(year, 11, 31), prevStart: new Date(year - 1, 9, 1), prevEnd: new Date(year - 1, 11, 31) };
            case 'h1': return { start: new Date(year, 0, 1), end: new Date(year, 5, 30), prevStart: new Date(year - 1, 0, 1), prevEnd: new Date(year - 1, 5, 30) };
            case 'h2': return { start: new Date(year, 6, 1), end: new Date(year, 11, 31), prevStart: new Date(year - 1, 6, 1), prevEnd: new Date(year - 1, 11, 31) };
            case 'yearly': return { start: startOfYear(now), end: endOfYear(now), prevStart: startOfYear(subYears(now, 1)), prevEnd: endOfYear(subYears(now, 1)) };
            case 'custom': return { start: startOfDay(new Date(range!.from)), end: endOfDay(new Date(range!.to)), prevStart: null, prevEnd: null };
        }
    };

    const financialData = useMemo(() => {
        if (!sales || !purchases || !expenses || !returns) return null;
        
        const { start, end, prevStart, prevEnd } = getDateRange(period, customRange);
        
        const filterFn = (dateStr: string, s: Date, e: Date) => {
            const d = new Date(dateStr);
            return d >= s && d <= e;
        };

        const currentSales = sales.filter(s => filterFn(s.saleDate, start, end));
        const currentReturns = returns.filter(r => filterFn(r.returnDate, start, end));
        const currentPurchases = purchases.filter(p => filterFn(p.orderDate, start, end));
        const currentExpenses = expenses.filter(e => filterFn(e.date, start, end));

        // Totals
        const totalSales = currentSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const salesReturnAmount = currentReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
        const netSales = totalSales - salesReturnAmount;
        
        const totalPurchases = currentPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
        const opExpenses = currentExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const cogs = currentSales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + (i.costOfGoodsSold * i.quantity), 0), 0);
        
        const grossProfit = netSales - cogs;
        const netProfit = grossProfit - opExpenses;

        // Previous Period for Comparison
        let prevStats = null;
        if (prevStart && prevEnd) {
            const prevSales = sales.filter(s => filterFn(s.saleDate, prevStart, prevEnd));
            const prevTotal = prevSales.reduce((acc, s) => acc + (s.total || 0), 0);
            prevStats = { totalSales: prevTotal };
        }

        // Category Wise Aggregation
        const catMap = new Map();
        currentSales.forEach(sale => {
            sale.items.forEach(item => {
                const catName = categories?.find(c => c.id === item.categoryId)?.name || 'Uncategorized';
                if (!catMap.has(catName)) {
                    catMap.set(catName, { name: catName, qty: 0, cost: 0, sales: 0, profit: 0, products: new Map() });
                }
                const cat = catMap.get(catName);
                cat.qty += item.quantity;
                cat.cost += item.costOfGoodsSold * item.quantity;
                cat.sales += item.totalPrice;
                cat.profit += (item.totalPrice / (1 + (item.gstRate/100))) - (item.costOfGoodsSold * item.quantity);

                // Product Deep Dive
                if (!cat.products.has(item.productId)) {
                    cat.products.set(item.productId, { name: item.productName, sku: item.sku, qty: 0, sales: 0, cost: 0, profit: 0, returns: 0, returnQty: 0 });
                }
                const prod = cat.products.get(item.productId);
                prod.qty += item.quantity;
                prod.sales += item.totalPrice;
                prod.cost += item.costOfGoodsSold * item.quantity;
                prod.profit += (item.totalPrice / (1 + (item.gstRate/100))) - (item.costOfGoodsSold * item.quantity);
            });
        });

        // Add Returns to products
        currentReturns.forEach(ret => {
            ret.items.forEach(item => {
                // Find category/product and update (simplified for now)
                catMap.forEach(cat => {
                    if (cat.products.has(item.productId)) {
                        const prod = cat.products.get(item.productId);
                        prod.returns += item.totalRefund;
                        prod.returnQty += (item.sellableQuantity + item.unsellableQuantity);
                    }
                });
            });
        });

        const receivables = sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + (s.balanceAmount || s.total), 0);
        const payables = purchases.filter(p => p.paymentStatus !== 'Paid').reduce((acc, p) => acc + (p.balanceAmount || p.totalAmount), 0);

        return {
            summary: {
                totalSales, salesReturnAmount, netSales, totalPurchases, opExpenses, cogs, grossProfit, netProfit,
                gpPercent: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
                npPercent: netSales > 0 ? (netProfit / netSales) * 100 : 0,
                receivables, payables,
                salesCount: currentSales.length,
                purchaseCount: currentPurchases.length,
                prevTotalSales: prevStats?.totalSales || 0
            },
            categories: Array.from(catMap.values()),
            transactions: currentSales.flatMap(s => s.items.map(i => ({
                date: s.saleDate,
                invoice: s.invoiceSequence,
                customer: s.customerName,
                product: i.productName,
                category: categories?.find(c => c.id === i.categoryId)?.name || 'N/A',
                qty: i.quantity,
                sales: i.totalPrice,
                cost: i.costOfGoodsSold * i.quantity,
                profit: (i.totalPrice / (1 + (i.gstRate/100))) - (i.costOfGoodsSold * i.quantity)
            })))
        };
    }, [sales, purchases, expenses, returns, period, customRange, categories]);

    const summaryCards: SummaryCardData[] = useMemo(() => {
        if (!financialData) return [];
        const { summary } = financialData;
        const salesChange = summary.prevTotalSales > 0 ? ((summary.totalSales - summary.prevTotalSales) / summary.prevTotalSales) * 100 : 0;

        return [
            { title: "Net Sales", value: `₹${summary.netSales.toLocaleString()}`, icon: CircleDollarSign, description: `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}% vs prev.` },
            { title: "Returns", value: `₹${summary.salesReturnAmount.toLocaleString()}`, icon: ArrowLeftRight, description: "Credit Notes Issued" },
            { title: "Gross Profit", value: `₹${summary.grossProfit.toLocaleString()}`, icon: TrendingUp, description: `${summary.gpPercent.toFixed(1)}% Margin` },
            { title: "Expenses", value: `₹${summary.opExpenses.toLocaleString()}`, icon: Wallet },
            { title: "Net Profit", value: `₹${summary.netProfit.toLocaleString()}`, icon: Scale, description: `${summary.npPercent.toFixed(1)}% Margin` },
        ];
    }, [financialData]);

    const handleExportExcel = () => {
        if (!financialData) return;
        const wb = {
            Summary: [
                { Metric: 'Total Sales', Value: financialData.summary.totalSales },
                { Metric: 'Returns', Value: financialData.summary.salesReturnAmount },
                { Metric: 'COGS', Value: financialData.summary.cogs },
                { Metric: 'Gross Profit', Value: financialData.summary.grossProfit },
                { Metric: 'Expenses', Value: financialData.summary.opExpenses },
                { Metric: 'Net Profit', Value: financialData.summary.netProfit },
            ],
            Transactions: financialData.transactions
        };
        exportToExcel(wb.Summary, `performance_report_${period}`);
    };

    if (!isMounted) return null;

    return (
        <div className="flex flex-col gap-8 pb-12">
            <PageHeader title="Business Performance & Profitability">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                </div>
            </PageHeader>

            {/* PERIOD & CHART SELECTORS */}
            <Card className="border-2 shadow-sm">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Report Period</Label>
                        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                            <SelectTrigger className="h-10 font-bold uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly (Current)</SelectItem>
                                <SelectItem value="q1">Quarterly - Q1 (Jan-Mar)</SelectItem>
                                <SelectItem value="q2">Quarterly - Q2 (Apr-Jun)</SelectItem>
                                <SelectItem value="q3">Quarterly - Q3 (Jul-Sep)</SelectItem>
                                <SelectItem value="q4">Quarterly - Q4 (Oct-Dec)</SelectItem>
                                <SelectItem value="h1">Half Yearly - H1 (Jan-Jun)</SelectItem>
                                <SelectItem value="h2">Half Yearly - H2 (Jul-Dec)</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                                <SelectItem value="custom">Custom Date Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {period === 'custom' && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From</Label>
                                <Input type="date" value={customRange.from} onChange={(e) => setCustomRange(p => ({ ...p, from: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To</Label>
                                <Input type="date" value={customRange.to} onChange={(e) => setCustomRange(p => ({ ...p, to: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Visualization Type</Label>
                        <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                            <SelectTrigger className="h-10"><BarChart3 className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="area">Area Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <PageSummary cards={summaryCards} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GRAPHS */}
                <div className="lg:col-span-2">
                    <GenericChart 
                        title="Sales vs. Profit Trend"
                        description="Performance metrics for the selected period."
                        data={financialData?.transactions.reduce((acc: any[], t) => {
                            const date = format(new Date(t.date), 'dd MMM');
                            const existing = acc.find(x => x.name === date);
                            if (existing) { existing.Sales += t.sales; existing.Profit += t.profit; }
                            else acc.push({ name: date, Sales: t.sales, Profit: t.profit });
                            return acc;
                        }, []) || []}
                        dataKeyX="name"
                        dataKeysY={['Sales', 'Profit']}
                        chartConfig={{ Sales: { label: 'Sales', color: 'hsl(var(--chart-1))' }, Profit: { label: 'Profit', color: 'hsl(var(--chart-2))' } }}
                        chartType={chartType}
                        yAxisFormatter={(v) => `₹${v/1000}k`}
                    />
                </div>

                {/* OUTSTANDING CARDS */}
                <div className="space-y-6">
                    <Card className="border-l-4 border-l-destructive">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Accounts Receivable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-destructive tracking-tighter">₹{financialData?.summary.receivables.toLocaleString()}</p>
                            <p className="text-[10px] font-bold uppercase mt-1">Outstanding from customers</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Accounts Payable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-orange-600 tracking-tighter">₹{financialData?.summary.payables.toLocaleString()}</p>
                            <p className="text-[10px] font-bold uppercase mt-1">Owed to vendors</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Transaction Volume</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div><p className="text-lg font-black">{financialData?.summary.salesCount}</p><p className="text-[9px] uppercase font-bold text-muted-foreground">Invoices</p></div>
                            <div><p className="text-lg font-black">{financialData?.summary.purchaseCount}</p><p className="text-[9px] uppercase font-bold text-muted-foreground">PO Entries</p></div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* CATEGORY WISE PROFITABILITY */}
            <Card className="border-2 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Category-Wise Profitability</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">Performance breakdown by product lines.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                        {financialData?.categories.map((cat, idx) => (
                            <AccordionItem key={idx} value={`cat-${idx}`} className="border-b last:border-none">
                                <AccordionTrigger className="px-6 hover:bg-muted/20 py-4">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 text-left items-center gap-4">
                                        <div className="font-black text-base uppercase tracking-tight">{cat.name}</div>
                                        <div className="hidden md:block"><p className="text-[9px] font-black text-muted-foreground uppercase">Qty Sold</p><p className="font-bold">{cat.qty}</p></div>
                                        <div><p className="text-[9px] font-black text-muted-foreground uppercase">Sales Value</p><p className="font-black text-primary">₹{cat.sales.toLocaleString()}</p></div>
                                        <div className="hidden md:block"><p className="text-[9px] font-black text-muted-foreground uppercase">Gross Profit</p><p className="font-black text-green-600">₹{cat.profit.toLocaleString()}</p></div>
                                        <div><p className="text-[9px] font-black text-muted-foreground uppercase">Margin</p><Badge className="bg-green-100 text-green-700 border-none">{((cat.profit / cat.sales) * 100).toFixed(1)}%</Badge></div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/5 p-6">
                                    <div className="rounded-xl border bg-background overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 border-b">
                                                <tr className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">
                                                    <th className="p-3">Product / SKU</th>
                                                    <th className="p-3 text-right">Sold</th>
                                                    <th className="p-3 text-right">Returns</th>
                                                    <th className="p-3 text-right">Sales (Net)</th>
                                                    <th className="p-3 text-right">Cost</th>
                                                    <th className="p-3 text-right">Profit</th>
                                                    <th className="p-3 text-right">Margin %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {Array.from(cat.products.values()).map((prod: any, pIdx) => (
                                                    <tr key={pIdx} className="hover:bg-muted/10 transition-colors">
                                                        <td className="p-3">
                                                            <p className="font-bold">{prod.name}</p>
                                                            <p className="text-[10px] font-mono text-muted-foreground">{prod.sku}</p>
                                                        </td>
                                                        <td className="p-3 text-right font-bold">{prod.qty}</td>
                                                        <td className="p-3 text-right">
                                                            {prod.returnQty > 0 && <Badge variant="destructive" className="h-5 text-[9px]">{prod.returnQty}</Badge>}
                                                        </td>
                                                        <td className="p-3 text-right font-black">₹{prod.sales.toLocaleString()}</td>
                                                        <td className="p-3 text-right text-muted-foreground">₹{prod.cost.toLocaleString()}</td>
                                                        <td className="p-3 text-right font-black text-green-600">₹{prod.profit.toLocaleString()}</td>
                                                        <td className="p-3 text-right">
                                                            <Badge variant="outline" className="border-green-200 text-green-700">{((prod.profit / prod.sales) * 100).toFixed(1)}%</Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            {/* TRANSACTION LEDGER */}
            <Card className="border-2 shadow-sm">
                <CardHeader className="border-b">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Underlying Transactions</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">All records used for the calculations above.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable 
                        columns={[
                            { accessorKey: 'date', header: 'Date', cell: ({row}) => format(new Date(row.original.date), 'dd MMM yyyy') },
                            { accessorKey: 'invoice', header: 'Inv #' },
                            { accessorKey: 'customer', header: 'Customer' },
                            { accessorKey: 'product', header: 'Product' },
                            { accessorKey: 'category', header: 'Category' },
                            { accessorKey: 'qty', header: 'Qty' },
                            { accessorKey: 'sales', header: 'Sales', cell: ({row}) => <FormattedNumberCell value={row.original.sales} /> },
                            { accessorKey: 'profit', header: 'Profit', cell: ({row}) => <FormattedNumberCell value={row.original.profit} className="text-green-600 font-bold" /> }
                        ]} 
                        data={financialData?.transactions || []} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function Label({ className, children }: { className?: string, children: React.ReactNode }) {
    return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>{children}</label>;
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
}
