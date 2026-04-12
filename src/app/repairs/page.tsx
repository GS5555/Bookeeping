'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import React, { useState, useMemo } from 'react';
import { Repair, Customer, Product } from '@/lib/types';
import { RepairDialog } from './repair-dialog';
import { toast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

const STORE_ID = 'store_main';

export default function RepairsPage() {
    const firestore = useFirestore();
    const repairsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'repairs') : null, [firestore]);
    const { data: repairsData, isLoading: areRepairsLoading } = useCollection<Repair>(repairsCollectionRef);
    
    const customersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersCollectionRef);
    
    const productsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsCollectionRef);


    const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
    const [editingRepair, setEditingRepair] = useState<Repair | undefined>();

    const repairs = useMemo(() => {
        if (!repairsData || !customers || !products) return [];
        return repairsData.map(r => ({
            ...r,
            customerName: customers.find(c => c.id === r.customerId)?.name || 'Unknown',
            productName: products.find(p => p.id === r.productId)?.name || 'Unknown',
        }));
    }, [repairsData, customers, products]);

    const handleAdd = () => {
        setEditingRepair(undefined);
        setIsRepairDialogOpen(true);
    };

    const handleEdit = (repair: Repair) => {
        setEditingRepair(repair);
        setIsRepairDialogOpen(true);
    };

    const handleDelete = async (repairId: string) => {
        if (!firestore) return;
        try {
          await deleteDoc(doc(firestore, 'stores', STORE_ID, 'repairs', repairId));
          toast({ title: "Success!", description: "Repair job deleted successfully." });
        } catch (error) {
          console.error("Error deleting repair job:", error);
          toast({ title: "Error", description: "Could not delete repair job.", variant: "destructive" });
        }
    };

    const handleSuccess = async (repair: Repair) => {
        if (!firestore) return;
        const message = editingRepair ? "Repair job updated successfully." : "Repair job added successfully.";
        
        try {
            const repairDocRef = doc(firestore, 'stores', STORE_ID, 'repairs', repair.id);
            await setDoc(repairDocRef, repair, { merge: true });

            setIsRepairDialogOpen(false);
            setEditingRepair(undefined);
            toast({ title: "Success!", description: message });
        } catch (error) {
            console.error("Error saving repair job:", error);
            toast({ title: "Error", description: "Could not save repair job.", variant: "destructive" });
        }
    }

  return (
    <>
      <PageHeader title="Repairs">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Repair Job
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <RepairDialog
            open={isRepairDialogOpen}
            onOpenChange={setIsRepairDialogOpen}
            repair={editingRepair}
            onSuccess={handleSuccess}
        />
        <Card>
          <CardHeader>
            <CardTitle>Repair Jobs</CardTitle>
            <CardDescription>
              Track and manage all your repair jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns({onEdit: handleEdit, onDelete: handleDelete})} data={repairs || []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
