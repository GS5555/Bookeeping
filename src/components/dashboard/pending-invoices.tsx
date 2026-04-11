'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { isPast, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { Sale, Customer } from '@/lib/types';
import Link from 'next/link';

interface PendingInvoicesProps {
    sales: Sale[];
    customers: Customer[];
}

export function PendingInvoices({ sales, customers }: PendingInvoicesProps) {
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const isMounted = useIsMounted();

  const pendingSales = useMemo(() => {
    return sales
      .filter(s => {
        // Fix: Use 'status' instead of 'invoiceStatus'
        const isPending = s.status === 'pending' || (s.balanceAmount && s.balanceAmount > 0);
        const customerMatch = selectedCustomer === 'all' || s.customerId === selectedCustomer;
        return isPending && customerMatch;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [sales, selectedCustomer]);

  const customersWithPending = useMemo(() => {
    const pendingIds = new Set(sales.filter(s => s.status !== 'paid').map(s => s.customerId));
    return customers.filter(c => pendingIds.has(c.id));
  }, [sales, customers]);

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'paid': 'default',
    'pending': 'destructive',
    'cancelled': 'secondary',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className='flex-1'>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>
                {pendingSales.length} invoices require attention.
                </CardDescription>
            </div>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full sm:w-[180px] text-xs h-8">
                    <SelectValue placeholder="Filter by debtor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Debtors</SelectItem>
                    {customersWithPending.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
            <div className="space-y-6">
                {pendingSales.length > 0 ? pendingSales.map(sale => {
                    return (
                        <div key={sale.id} className="flex items-center">
                            <div className="flex-1 space-y-1">
                                <p className="font-medium text-sm leading-none">{sale.customerName}</p>
                                <Link
                                    href={`/invoice/${sale.id}`}
                                    target="_blank"
                                    className="text-xs text-muted-foreground hover:underline hover:text-primary"
                                >
                                    #{sale.invoiceSequence}
                                </Link>
                                {isMounted ? (() => {
                                    const isOverdue = sale.dueDate ? isPast(new Date(sale.dueDate)) : false;
                                    return (
                                        <p className={cn("text-[10px] font-medium", isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                            {sale.dueDate ? `Due ${formatDistanceToNow(new Date(sale.dueDate), { addSuffix: true })}` : 'No due date'}
                                        </p>
                                    )
                                })() : (
                                    <Skeleton className="h-4 w-24" />
                                )}
                            </div>
                            <div className="ml-auto text-right">
                                {/* Fix: Use 'total' instead of 'totalAmount' */}
                                <p className="font-medium text-sm">₹{(sale.total || 0).toLocaleString()}</p>
                                <Badge variant={statusVariant[sale.status]} className="text-[10px] h-5 px-1.5 uppercase">{sale.status}</Badge>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-center text-muted-foreground pt-10">
                        <p>No pending invoices.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
