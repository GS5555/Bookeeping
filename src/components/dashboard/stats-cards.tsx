'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
    stats: {
        totalSales: number;
        totalPurchases: number;
        totalExpenses: number;
        salesChange: number;
        purchasesChange: number;
        expensesChange: number;
    }
}

const cardColorClasses = [
    { bg: 'bg-chart-1/20', text: 'text-chart-1', border: 'border-chart-1/30' },
    { bg: 'bg-chart-2/20', text: 'text-chart-2', border: 'border-chart-2/30' },
    { bg: 'bg-chart-8/20', text: 'text-chart-8', border: 'border-chart-8/30' },
    { bg: 'bg-chart-4/20', text: 'text-chart-4', border: 'border-chart-4/30' },
];

export function StatsCards({ stats }: StatsCardsProps) {
    const isMounted = useIsMounted();

    const formatPercentage = (value: number) => {
        if (!isFinite(value)) return null;
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}% vs. last month`;
    }

    const formattedStats = useMemo(() => {
        return [
            { title: 'Sales (This Month)', value: isMounted ? `₹${stats.totalSales.toLocaleString('en-IN')}` : '₹...', icon: DollarSign, description: formatPercentage(stats.salesChange) },
            { title: 'Purchases (This Month)', value: isMounted ? `₹${stats.totalPurchases.toLocaleString('en-IN')}` : '₹...', icon: ShoppingCart, description: formatPercentage(stats.purchasesChange) },
            { title: 'Expenses (This Month)', value: isMounted ? `₹${stats.totalExpenses.toLocaleString('en-IN')}` : '₹...', icon: Wallet, description: formatPercentage(stats.expensesChange) },
        ];
    }, [isMounted, stats]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {formattedStats.map((stat, index) => {
        const colorClasses = cardColorClasses[index % cardColorClasses.length];
        return (
            <Card key={stat.title} className={cn(colorClasses.bg, colorClasses.border)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", colorClasses.text)}>
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn("h-4 w-4", colorClasses.text)} />
              </CardHeader>
              <CardContent className={cn(colorClasses.text)}>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.description && (
                    <p className={cn("text-xs opacity-80", colorClasses.text)}>
                        {stat.description}
                    </p>
                )}
              </CardContent>
            </Card>
        )
      })}
    </div>
  );
}
