
'use client';

import { useMemo, useState } from 'react';
import { Vendor, PurchaseOrder } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VendorFinancialsCard } from './vendor-financials-card';
import { PendingPOsDialog } from './pending-pos-dialog';

interface VendorFinancialsProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
}

export interface VendorFinancialsData {
  vendor: Vendor;
  pendingPOs: PurchaseOrder[];
  totalPendingAmount: number;
}

export function VendorFinancials({ purchaseOrders, vendors }: VendorFinancialsProps) {
  const [selectedVendorData, setSelectedVendorData] = useState<VendorFinancialsData | null>(null);

  const vendorData = useMemo(() => {
    const pendingPOs = purchaseOrders.filter(po => po.paymentStatus === 'Unpaid' || po.paymentStatus === 'Partially Paid');
    const vendorMap = new Map<string, VendorFinancialsData>();

    pendingPOs.forEach(po => {
      const vendor = vendors.find(v => v.id === po.vendorId);
      if (!vendor) return;

      if (!vendorMap.has(vendor.id)) {
        vendorMap.set(vendor.id, {
          vendor,
          pendingPOs: [],
          totalPendingAmount: 0,
        });
      }

      const data = vendorMap.get(vendor.id)!;
      data.pendingPOs.push(po);
      data.totalPendingAmount += po.totalAmount;
    });

    return Array.from(vendorMap.values());
  }, [purchaseOrders, vendors]);

  if (vendorData.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-8">
            <p>No pending payments to vendors found.</p>
        </div>
    );
  }

  return (
    <>
        <PendingPOsDialog 
            data={selectedVendorData}
            open={!!selectedVendorData}
            onOpenChange={(open) => !open && setSelectedVendorData(null)}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendorData.map(data => (
                <VendorFinancialsCard 
                    key={data.vendor.id} 
                    data={data}
                    onClick={() => setSelectedVendorData(data)} 
                />
            ))}
        </div>
    </>
  );
}
