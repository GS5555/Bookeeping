
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerFinancialsData } from './customer-financials';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { useIsMounted } from '@/hooks/use-is-mounted';

interface PendingInvoicesDialogProps {
  data: CustomerFinancialsData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingInvoicesDialog({ data, open, onOpenChange }: PendingInvoicesDialogProps) {
  const isMounted = useIsMounted();
  
  if (!data) return null;

  const { customer, pendingInvoices, totalPendingAmount } = data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pending Invoices for {customer.name}</DialogTitle>
          <DialogDescription>
            Total pending amount: {isMounted ? `₹${totalPendingAmount.toLocaleString('en-IN')}` : <Skeleton className="h-4 w-24 inline-block" />}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvoices.map((invoice) => {
                if (!isMounted) {
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    </TableRow>
                  );
                }
                const isOverdue = isPast(new Date(invoice.dueDate));
                const status = isOverdue ? 'Overdue' : 'Pending';
                return (
                    <TableRow key={invoice.id} className={cn(status === 'Overdue' && 'bg-destructive/10')}>
                        <TableCell>
                            <Link 
                              href={`/invoice/${invoice.id}`}
                              className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto")}
                            >
                                #{invoice.invoiceSequence}
                            </Link>
                        </TableCell>
                        <TableCell>{format(new Date(invoice.saleDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          {/* Fix: Use 'total' instead of 'totalAmount' to match interface */}
                          <FormattedNumberCell value={invoice.total} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={isOverdue ? 'destructive' : 'secondary'}>{status}</Badge>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
