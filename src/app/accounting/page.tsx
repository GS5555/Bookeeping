
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useMemo } from 'react';
import { Sale, Product, Expense } from '@/lib/types';
import { Scale, TrendingUp, TrendingDown, CircleDollarSign, Banknote } from 'lucide-react';
import { format, getMonth } from 'date-fns';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const STORE_ID = 'store_main';

export default function AccountingPage() {
    const firestore = useFirestore();
    const isMounted = useIsMounted();

    const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
    const { data: sales } = useCollection<Sale>(salesRef);

    const expensesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'expenses') : null, [firestore]);
    const { data: expenses } = useCollection<Expense>(expensesRef);
    
    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsRef);

    const { totalRevenue, totalCogs, grossProfit, totalExpenses, netProfit } = useMemo(() => {
        const relevantSales = sales || [];
        const relevantExpenses = expenses || [];

        const totalRevenue = relevantSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        
        const totalCogs = relevantSales.reduce((acc, sale) => {
            const saleCogs = sale.items.reduce((itemAcc, item) => {
                // Use the accurate cost captured at the time of sale
                return itemAcc + (item.costOfGoodsSold || 0);
            }, 0);
            return acc + saleCogs;
        }, 0);

        const grossProfit = totalRevenue - totalCogs;
        const totalExpensesValue = relevantExpenses.reduce((acc, expense) => acc + expense.amount, 0);
        const netProfit = grossProfit - totalExpensesValue;

        return { totalRevenue, totalCogs, grossProfit, totalExpenses: totalExpensesValue, netProfit };
    }, [sales, expenses, products]);

    const summaryData: SummaryCardData[] = useMemo(() => [
        { title: "Total Revenue", value: isMounted ? `₹${totalRevenue.toLocaleString('en-IN')}` : "₹...", icon: CircleDollarSign },
        { title: "Cost of Goods Sold", value: isMounted ? `₹${totalCogs.toLocaleString('en-IN')}` : "₹...", icon: TrendingDown },
        { title: "Gross Profit", value: isMounted ? `₹${grossProfit.toLocaleString('en-IN')}` : "₹...", icon: TrendingUp },
        { title: "Operating Expenses", value: isMounted ? `₹${totalExpenses.toLocaleString('en-IN')}` : "₹...", icon: Banknote },
        { title: "Net Profit", value: isMounted ? `₹${netProfit.toLocaleString('en-IN')}` : "₹...", icon: Scale, description: `After all costs & expenses` },
    ], [totalRevenue, totalCogs, grossProfit, totalExpenses, netProfit, isMounted]);
    
    const profitChartData = useMemo(() => {
        const relevantSales = sales || [];
        const relevantExpenses = expenses || [];
        
        const monthlyData: Record<number, { revenue: number; cogs: number; expenses: number }> = {};
        
        relevantSales.forEach(sale => {
            const month = getMonth(new Date(sale.saleDate));
            if(!monthlyData[month]) monthlyData[month] = { revenue: 0, cogs: 0, expenses: 0 };
            
            monthlyData[month].revenue += sale.totalAmount;
            
            const saleCogs = sale.items.reduce((acc, item) => {
                 return acc + (item.costOfGoodsSold || 0);
            }, 0);
            monthlyData[month].cogs += saleCogs;
        });

        relevantExpenses.forEach(expense => {
            const month = getMonth(new Date(expense.expenseDate));
            if(!monthlyData[month]) monthlyData[month] = { revenue: 0, cogs: 0, expenses: 0 };
            monthlyData[month].expenses += expense.amount;
        });
        
        return Object.entries(monthlyData).map(([monthIndex, data]) => ({
            name: format(new Date(2024, parseInt(monthIndex)), 'MMM'),
            Revenue: data.revenue,
            NetProfit: data.revenue - data.cogs - data.expenses
        })).sort((a,b) => new Date(`2024 ${a.name}`).getMonth() - new Date(`2024 ${b.name}`).getMonth());

    }, [sales, expenses, products]);

    const chartConfig: ChartConfig = {
        Revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
        NetProfit: { label: 'Net Profit', color: 'hsl(var(--chart-3))' },
    };

    return (
        <>
            <PageHeader title="Accounting Overview" />
            <div className="flex flex-col gap-8">
                <PageSummary cards={summaryData} />
                 <GenericChart
                    title="Financial Performance"
                    description="Monthly revenue and net profit overview."
                    data={profitChartData}
                    dataKeyX="name"
                    dataKeysY={['Revenue', 'NetProfit']}
                    chartConfig={chartConfig}
                    yAxisFormatter={(value) => `₹${value / 1000}k`}
                />
            </div>
        </>
    );
}
