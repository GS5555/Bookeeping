
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerFinancialsData } from './customer-financials';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface CustomerFinancialsCardProps {
    data: CustomerFinancialsData;
    onClick: () => void;
    onSendReminder: () => void;
}

export function CustomerFinancialsCard({ data, onClick, onSendReminder }: CustomerFinancialsCardProps) {
  const { customer, pendingInvoices, totalPendingAmount } = data;
  const isMounted = useIsMounted();

  const handleReminderClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent the card's onClick from firing
      onSendReminder();
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow flex flex-col" onClick={onClick}>
        <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>{pendingInvoices.length} Pending Invoice(s)</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-2xl font-bold text-destructive">
               {isMounted ? `₹${totalPendingAmount.toLocaleString('en-IN')}` : <Skeleton className="h-8 w-32" />}
            </div>
        </CardContent>
         <CardFooter className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Click card to view details</p>
            <Button size="sm" variant="outline" onClick={handleReminderClick}>
                <Mail className="mr-2 h-4 w-4" />
                Send Reminder
            </Button>
        </CardFooter>
    </Card>
  )
}
