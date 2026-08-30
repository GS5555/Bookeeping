'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Sale, SaleReturn, PurchaseOrder, Expense, Category, Company } from '@/lib/types';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfYear, 
    endOfYear, 
    subMonths, 
    subYears,
    startOfDay,
    endOfDay
} from 'date-fns';
import { 
    TrendingUp, 
    TrendingDown, 
    CircleDollarSign, 
    ArrowLeftRight, 
    Wallet, 
    Scale, 
    Download, 
    Printer, 
    BarChart3,
    FileSpreadsheet,
    FileText as FileTextIcon,
    ChevronDown
} from 'lucide-react';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart, ChartType } from '@/components/dashboard/generic-chart';
import { DataTable } from '@/components/data-table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { exportMultiSheetExcel, downloadDetailedManagementReport } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

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

    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

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

        const totalSales = currentSales.reduce((acc, s) => acc + (s.total || 0), 0);
        const salesReturnAmount = currentReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
        const netSales = totalSales - salesReturnAmount;
        const totalPurchases = currentPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
        const opExpenses = currentExpenses.reduce((acc, e) => acc + e.amount, 0);
        const cogs = currentSales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + (i.costOfGoodsSold * i.quantity), 0), 0);
        const grossProfit = netSales - cogs;
        const netProfit = grossProfit - opExpenses;

        let prevStats = null;
        if (prevStart && prevEnd) {
            const prevSales = sales.filter(s => filterFn(s.saleDate, prevStart, prevEnd));
            prevStats = { totalSales: prevSales.reduce((acc, s) => acc + (s.total || 0), 0) };
        }

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

        currentReturns.forEach(ret => {
            ret.items.forEach(item => {
                catMap.forEach(cat => {
                    if (cat.products.has(item.productId)) {
                        const prod = cat.products.get(item.productId);
                        prod.returns += item.totalRefund;
                        prod.returnQty += (item.sellableQuantity + item.unsellableQuantity);
                    }
                });
            });
        });

        return {
            summary: {
                totalSales, salesReturnAmount, netSales, totalPurchases, opExpenses, cogs, grossProfit, netProfit,
                gpPercent: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
                npPercent: netSales > 0 ? (netProfit / netSales) * 100 : 0,
                salesCount: currentSales.length,
                purchaseCount: currentPurchases.length,
                prevTotalSales: prevStats?.totalSales || 0
            },
            categories: Array.from(catMap.values()),
            salesLines: currentSales.flatMap(s => s.items.map(i => ({
                Date: format(new Date(s.saleDate), 'dd-MM-yyyy'), Invoice: s.invoiceSequence, Customer: s.customerName, Product: i.productName, SKU: i.sku, HSN: i.hsnCode, Qty: i.quantity, Rate: i.unitPrice, Tax: i.gstRate, Total: i.totalPrice, Cost: i.costOfGoodsSold * i.quantity, Profit: (i.totalPrice / (1 + (i.gstRate/100))) - (i.costOfGoodsSold * i.quantity)
            }))),
            purchaseLines: currentPurchases.flatMap(p => p.items.map(i => ({
                Date: format(new Date(p.orderDate), 'dd-MM-yyyy'), PO: p.purchaseOrderNumber, Vendor: p.vendorName, Product: i.productName, SKU: i.sku, Qty: i.quantity, UnitCost: i.unitCost, TotalCost: i.totalCost
            }))),
            returnLines: currentReturns.flatMap(r => r.items.map(i => ({
                Date: format(new Date(r.returnDate), 'dd-MM-yyyy'), ReturnSlip: r.returnSequence, Customer: r.customerName, Product: i.productName, Qty: i.sellableQuantity + i.unsellableQuantity, Refund: i.totalRefund, Reason: i.reason
            }))),
            expenseLines: currentExpenses.map(e => ({
                Date: format(new Date(e.date), 'dd-MM-yyyy'), Category: e.category, Type: e.expenseType, Vendor: e.vendor, Description: e.description, Amount: e.amount
            }))
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

    const handleDetailedExcel = () => {
        if (!financialData) return;
        const sheets = {
            Summary: [
                { Metric: 'Total Gross Sales', Value: financialData.summary.totalSales },
                { Metric: 'Sales Returns', Value: financialData.summary.salesReturnAmount },
                { Metric: 'Net Sales', Value: financialData.summary.netSales },
                { Metric: 'COGS', Value: financialData.summary.cogs },
                { Metric: 'Gross Profit', Value: financialData.summary.grossProfit },
                { Metric: 'Operating Expenses', Value: financialData.summary.opExpenses },
                { Metric: 'Net Profit', Value: financialData.summary.netProfit },
                { Metric: 'Net Profit Margin %', Value: financialData.summary.npPercent.toFixed(2) + '%' },
            ],
            'Sales Items': financialData.salesLines,
            'Return Items': financialData.returnLines,
            'Purchase Items': financialData.purchaseLines,
            'Expense Ledger': financialData.expenseLines,
            'Category Analysis': financialData.categories.map(c => ({ Category: c.name, QtySold: c.qty, SalesValue: c.sales, GrossProfit: c.profit, Margin: ((c.profit/c.sales)*100).toFixed(1) + '%' })),
            'Product Performance': financialData.categories.flatMap(c => Array.from(c.products.values()).map((p: any) => ({ ...p, category: c.name }))),
        };
        exportMultiSheetExcel(sheets, `detailed_audit_${period}_${Date.now()}`);
    };

    const handleDetailedPdf = () => {
        if (!financialData || !companyDetails) return;
        const { summary, categories: cats, salesLines, expenseLines } = financialData;
        const sections = [
            { 
                title: 'EXECUTIVE FINANCIAL SUMMARY', 
                headers: [['Metric', 'Amount (INR)', 'Percentage']], 
                data: [
                    ['Total Revenue (Gross)', formatCurrency(summary.totalSales), '100%'],
                    ['Sales Returns', formatCurrency(summary.salesReturnAmount), ((summary.salesReturnAmount/summary.totalSales)*100).toFixed(1)+'%'],
                    ['Net Sales Revenue', formatCurrency(summary.netSales), ''],
                    ['Cost of Goods Sold (COGS)', formatCurrency(summary.cogs), ((summary.cogs/summary.netSales)*100).toFixed(1)+'%'],
                    ['Gross Profit Margin', formatCurrency(summary.grossProfit), summary.gpPercent.toFixed(1)+'%'],
                    ['Operating Expenses', formatCurrency(summary.opExpenses), ((summary.opExpenses/summary.netSales)*100).toFixed(1)+'%'],
                    ['NET OPERATING PROFIT', formatCurrency(summary.netProfit), summary.npPercent.toFixed(1)+'%'],
                ],
                colStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
            },
            {
                title: 'CATEGORY PERFORMANCE AUDIT',
                headers: [['Category', 'Qty', 'Revenue (Net)', 'Profit', 'Margin %']],
                data: cats.map(c => [c.name, c.qty, formatCurrency(c.sales), formatCurrency(c.profit), ((c.profit/c.sales)*100).toFixed(1)+'%']),
                colStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
            },
            {
                title: 'DETAILED SALES LEDGER (LINE ITEMS)',
                headers: [['Date', 'Invoice', 'Customer', 'Product', 'Qty', 'Tax %', 'Sales Value', 'Line Profit']],
                data: salesLines.map(s => [s.Date, s.Invoice, s.Customer, s.Product, s.Qty, s.Tax+'%', formatCurrency(s.Total), formatCurrency(s.Profit)]),
                colStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } }
            },
            {
                title: 'OPERATIONAL EXPENSE AUDIT',
                headers: [['Date', 'Category', 'Description', 'Vendor', 'Amount']],
                data: expenseLines.map(e => [e.Date, e.Category, e.Description, e.Vendor, formatCurrency(e.Amount)]),
                colStyles: { 4: { halign: 'right' } }
            }
        ];

        downloadDetailedManagementReport(
            'Management Audit Report',
            period.toUpperCase() + ' PERFORMANCE',
            sections as any,
            companyDetails,
            `management_audit_${period}`
        );
    };

    if (!isMounted) return null;

    return (
        <div className="flex flex-col gap-8 pb-12">
            <PageHeader title="Business Performance & Profitability">
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default" className="font-black uppercase tracking-widest bg-orange-600 hover:bg-orange-700 shadow-lg">
                                <Download className="mr-2 h-4 w-4" />
                                Export Detailed Audit
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Data Reconciliation</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleDetailedExcel} className="cursor-pointer">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                <span className="font-bold">Excel Workbook (8 Sheets)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDetailedPdf} className="cursor-pointer">
                                <FileTextIcon className="mr-2 h-4 w-4 text-destructive" />
                                <span className="font-bold">Management PDF Report</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.print()} className="cursor-pointer">
                                <Printer className="mr-2 h-4 w-4" />
                                <span className="font-medium">Print Analysis</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </PageHeader>

            {/* PERIOD & CHART SELECTORS */}
            <Card className="border-2 shadow-sm">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Report Period</Label>
                        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                            <SelectTrigger className="h-10 font-bold uppercase border-muted-foreground/30"><SelectValue /></SelectTrigger>
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
                                <Input type="date" value={customRange.from} onChange={(e) => setCustomRange(p => ({ ...p, from: e.target.value }))} className="border-muted-foreground/30" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To</Label>
                                <Input type="date" value={customRange.to} onChange={(e) => setCustomRange(p => ({ ...p, to: e.target.value }))} className="border-muted-foreground/30" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Visualization Type</Label>
                        <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                            <SelectTrigger className="h-10 border-muted-foreground/30"><BarChart3 className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
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
                <div className="lg:col-span-2">
                    <GenericChart 
                        title="Sales vs. Profit Trend"
                        description="Net revenue and profitability metrics for selected period."
                        data={financialData?.transactions.reduce((acc: any[], t) => {
                            const date = format(new Date(t.date), 'dd MMM');
                            const existing = acc.find(x => x.name === date);
                            if (existing) { existing.Sales += t.sales; existing.Profit += t.profit; }
                            else acc.push({ name: date, Sales: t.sales, Profit: t.profit });
                            return acc;
                        }, []) || []}
                        dataKeyX="name"
                        dataKeysY={['Sales', 'Profit']}
                        chartConfig={{ Sales: { label: 'Revenue', color: 'hsl(var(--chart-1))' }, Profit: { label: 'Net Profit', color: 'hsl(var(--chart-2))' } }}
                        chartType={chartType}
                        yAxisFormatter={(v) => `₹${v/1000}k`}
                    />
                </div>

                <div className="space-y-6">
                    <Card className="border-l-4 border-l-destructive bg-destructive/5 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Accounts Receivable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-destructive tracking-tighter">₹{financialData?.summary.receivables?.toLocaleString() || '0'}</p>
                            <p className="text-[9px] font-bold uppercase mt-1 opacity-70 italic">Uncollected Customer Payments</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500 bg-orange-50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Accounts Payable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-orange-600 tracking-tighter">₹{financialData?.summary.payables?.toLocaleString() || '0'}</p>
                            <p className="text-[9px] font-bold uppercase mt-1 opacity-70 italic">Outstanding Vendor Dues</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-2 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Product Category Drill-Down</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">Aggregated performance by line of business.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                        {financialData?.categories.map((cat, idx) => (
                            <AccordionItem key={idx} value={`cat-${idx}`} className="border-b last:border-none">
                                <AccordionTrigger className="px-6 hover:bg-muted/20 py-4 transition-all group">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 text-left items-center gap-4">
                                        <div className="font-black text-base uppercase tracking-tight text-primary">{cat.name}</div>
                                        <div className="hidden md:block"><p className="text-[9px] font-black text-muted-foreground uppercase">Units Sold</p><p className="font-bold">{cat.qty}</p></div>
                                        <div><p className="text-[9px] font-black text-muted-foreground uppercase">Net Revenue</p><p className="font-black text-foreground">₹{cat.sales.toLocaleString()}</p></div>
                                        <div className="hidden md:block"><p className="text-[9px] font-black text-muted-foreground uppercase">Gross Profit</p><p className="font-black text-green-600">₹{cat.profit.toLocaleString()}</p></div>
                                        <div><p className="text-[9px] font-black text-muted-foreground uppercase">Margin</p><Badge className="bg-green-100 text-green-700 border-none font-black">{((cat.profit / cat.sales) * 100).toFixed(1)}%</Badge></div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/5 p-6 border-t">
                                    <div className="rounded-xl border bg-background overflow-hidden shadow-inner">
                                        <table className="w-full text-[11px] font-medium">
                                            <thead className="bg-muted/50 border-b">
                                                <tr className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">
                                                    <th className="p-3">Product Profile</th>
                                                    <th className="p-3 text-right">Qty</th>
                                                    <th className="p-3 text-right">Returns</th>
                                                    <th className="p-3 text-right">Net Sales</th>
                                                    <th className="p-3 text-right">Landed Cost</th>
                                                    <th className="p-3 text-right">Margin INR</th>
                                                    <th className="p-3 text-right">Margin %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {Array.from(cat.products.values()).map((prod: any, pIdx) => (
                                                    <tr key={pIdx} className="hover:bg-muted/10 transition-colors">
                                                        <td className="p-3">
                                                            <p className="font-black text-xs uppercase">{prod.name}</p>
                                                            <p className="text-[9px] font-mono text-muted-foreground">SKU: {prod.sku}</p>
                                                        </td>
                                                        <td className="p-3 text-right font-bold">{prod.qty}</td>
                                                        <td className="p-3 text-right">
                                                            {prod.returnQty > 0 ? <Badge variant="destructive" className="h-5 text-[9px] font-black">{prod.returnQty}</Badge> : '-'}
                                                        </td>
                                                        <td className="p-3 text-right font-black">₹{prod.sales.toLocaleString()}</td>
                                                        <td className="p-3 text-right text-muted-foreground">₹{prod.cost.toLocaleString()}</td>
                                                        <td className="p-3 text-right font-black text-green-600">₹{prod.profit.toLocaleString()}</td>
                                                        <td className="p-3 text-right">
                                                            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50/50 font-black text-[10px]">{((prod.profit / prod.sales) * 100).toFixed(1)}%</Badge>
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

            <Card className="border-2 shadow-sm">
                <CardHeader className="border-b bg-muted/10">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Audit Ledger</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">Base transactions used for Period Calculations.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable 
                        columns={[
                            { accessorKey: 'date', header: 'Date', cell: ({row}) => format(new Date(row.original.date), 'dd MMM yyyy') },
                            { accessorKey: 'invoice', header: 'Inv #' },
                            { accessorKey: 'customer', header: 'Customer' },
                            { accessorKey: 'product', header: 'Product' },
                            { accessorKey: 'category', header: 'Category' },
                            { accessorKey: 'qty', header: 'Qty', cell: ({row}) => <span className="font-bold">{row.original.qty}</span> },
                            { accessorKey: 'sales', header: 'Gross Value', cell: ({row}) => <FormattedNumberCell value={row.original.sales} /> },
                            { accessorKey: 'profit', header: 'Margin INR', cell: ({row}) => <FormattedNumberCell value={row.original.profit} className={cn("font-black", row.original.profit >= 0 ? "text-green-600" : "text-destructive")} /> }
                        ]} 
                        data={financialData?.transactions || []} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
