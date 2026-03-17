'use client';

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { useMemo } from "react"
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { Sale } from "@/lib/types";
import Link from 'next/link';

interface RecentSalesProps {
    sales: Sale[];
}

export function RecentSales({ sales }: RecentSalesProps) {
    const isMounted = useIsMounted();

    const recentSales = useMemo(() => {
        return [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).slice(0, 5);
    }, [sales]);

    if (sales.length === 0) {
        return <div className="text-center text-sm text-muted-foreground">No sales recorded yet.</div>
    }

    return (
        <div className="space-y-8">
            {recentSales.map(sale => (
                <div className="flex items-center" key={sale.id}>
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{sale.customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="font-medium text-sm leading-none">{sale.customerName}</p>
                        <Link 
                            href={`/invoice/${sale.id}`}
                            target="_blank"
                            className="text-xs text-muted-foreground hover:underline hover:text-primary"
                        >
                            Invoice #{sale.invoiceSequence}
                        </Link>
                    </div>
                    {isMounted ? (
                        <div className="ml-auto font-medium text-green-600">+₹{sale.totalAmount.toLocaleString('en-IN')}</div>
                    ) : (
                        <Skeleton className="h-5 w-20 ml-auto" />
                    )}
                </div>
            ))}
        </div>
    )
}