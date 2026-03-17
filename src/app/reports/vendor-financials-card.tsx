
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { VendorFinancialsData } from './vendor-financials';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMounted } from '@/hooks/use-is-mounted';

interface VendorFinancialsCardProps {
    data: VendorFinancialsData;
    onClick: () => void;
}

export function VendorFinancialsCard({ data, onClick }: VendorFinancialsCardProps) {
  const { vendor, pendingPOs, totalPendingAmount } = data;
  const isMounted = useIsMounted();

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardHeader>
            <CardTitle>{vendor.name}</CardTitle>
            <CardDescription>{pendingPOs.length} Pending PO(s)</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-destructive">
                {isMounted ? `₹${totalPendingAmount.toLocaleString('en-IN')}` : <Skeleton className="h-8 w-32" />}
            </div>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">Click to view details</p>
        </CardFooter>
    </Card>
  );
}
