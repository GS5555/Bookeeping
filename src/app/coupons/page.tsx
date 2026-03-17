
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PercentSquare, PlusCircle, Power, Pointer } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import { useState, useMemo } from 'react';
import { Coupon } from '@/lib/types';
import { CouponDialog } from './coupon-dialog';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, deleteDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

export default function CouponsPage() {
  const firestore = useFirestore();
  const couponsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stores', STORE_ID, 'coupons'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);
  const { data: coupons, isLoading: areCouponsLoading } = useCollection<Coupon>(couponsCollectionRef);

  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>();
  const isMounted = useIsMounted();

  const handleAdd = () => {
    setEditingCoupon(undefined);
    setIsCouponDialogOpen(true);
  };
  
  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsCouponDialogOpen(true);
  };

  const handleDelete = async (couponId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'stores', STORE_ID, 'coupons', couponId));
      toast({ title: "Success!", description: "Coupon deleted successfully." });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({ title: "Error", description: "Could not delete coupon.", variant: "destructive" });
    }
  };

  const handleSuccess = async (coupon: Coupon) => {
    if (!firestore) return;
    const isEditing = !!editingCoupon;
    const message = isEditing ? "Coupon updated successfully." : "Coupon added successfully.";
    
    try {
      const couponDocRef = doc(firestore, 'stores', STORE_ID, 'coupons', coupon.id);
      await setDoc(couponDocRef, coupon, { merge: true });
      setIsCouponDialogOpen(false);
      setEditingCoupon(undefined);
      toast({ title: "Success!", description: message });
    } catch (error) {
       console.error("Error saving coupon:", error);
       toast({ title: "Error", description: "Could not save coupon.", variant: "destructive" });
    }
  }

  const safeCoupons = coupons || [];

  const summaryData: SummaryCardData[] = useMemo(() => {
    const totalCoupons = safeCoupons.length;
    const activeCoupons = safeCoupons.filter(c => c.isActive).length;
    const totalUses = safeCoupons.reduce((acc, c) => acc + c.timesUsed, 0);

    return [
      { title: "Total Coupons", value: totalCoupons.toString(), icon: PercentSquare },
      { title: "Active Coupons", value: activeCoupons.toString(), icon: Power, description: `${totalCoupons - activeCoupons} inactive` },
      { title: "Total Times Used", value: isMounted ? totalUses.toLocaleString() : "...", icon: Pointer },
    ];
  }, [safeCoupons, isMounted]);

  const chartData = useMemo(() => {
    return safeCoupons.map(c => ({
        name: c.code,
        usage: (c.timesUsed / c.maxUses) * 100,
    }));
  }, [safeCoupons]);

  const chartConfig: ChartConfig = useMemo(() => ({
    usage: { label: 'Usage (%)', color: 'hsl(var(--chart-1))' },
  }), []);


  return (
    <>
      <PageHeader title="Coupon Management">
        <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Coupon
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />
        <GenericChart
            title="Coupon Usage"
            description="Percentage of maximum uses for each coupon."
            data={chartData}
            dataKeyX="name"
            dataKeysY={['usage']}
            chartConfig={chartConfig}
            yAxisFormatter={(value) => `${value}%`}
            categorical
        />
        <CouponDialog 
            open={isCouponDialogOpen} 
            onOpenChange={setIsCouponDialogOpen} 
            coupon={editingCoupon}
            onSuccess={handleSuccess}
        />
        <Card>
          <CardHeader>
            <CardTitle>Coupons</CardTitle>
            <CardDescription>
              Manage your promotional coupons and discounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns({ onEdit: handleEdit, onDelete: handleDelete })} data={safeCoupons} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
