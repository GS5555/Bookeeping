'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CircleDollarSign, Clock, PlusCircle, Truck, Download, Mail, Printer, Share } from 'lucide-react';
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
import { PurchaseOrder, InventoryItem, Product, Vendor, Company, User, PriceHistoryEntry } from '@/lib/types';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PurchaseOrderDialog } from './purchase-order-dialog';
import { UpdatePoStatusDialog, ReceivedStockInfo } from './update-po-status-dialog';
import { exportToExcel, downloadBulkPurchaseOrders, generatePurchaseOrderEmailBody, generateShareText } from '@/lib/actions';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { collection, doc, query, where, writeBatch, getDocs, orderBy, limit, deleteDoc, updateDoc, setDoc, runTransaction } from 'firebase/firestore';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { ShareDialog } from '@/components/share-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

export default function PurchasesPage() {
    const firestore = useFirestore();
    const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();
    const { currentUser } = useCurrentUser();
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    
    const poCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'purchaseOrders'), orderBy('orderDate', sortOrder), limit(50));
    }, [firestore, sortOrder]);
    const { data: purchaseOrdersData, isLoading: arePOsLoading } = useCollection<PurchaseOrder>(poCollectionRef);

    const productsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsCollectionRef);

    const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
    const { data: vendorsData, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);
    
    const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: usersData } = useCollection<User>(usersRef);


    const [isPODialogOpen, setIsPODialogOpen] = useState(false);
    const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<PurchaseOrder | undefined>();
    const isMounted = useIsMounted();

    const safeVendors = vendorsData || [];
    const safeUsers = usersData || [];

    const purchaseOrders = useMemo(() => {
        if (!purchaseOrdersData || !usersData) return [];
        return purchaseOrdersData.map(po => ({
            ...po,
            createdByName: usersData.find(u => u.id === po.createdBy)?.displayName || 'Unknown User'
        }));
    }, [purchaseOrdersData, usersData]);

    const handleDelete = async (poId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'stores', STORE_ID, 'purchaseOrders', poId));
            toast({
                title: "Purchase Order Deleted",
                description: "The purchase order has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting PO:", error);
            toast({ title: "Error", description: "Could not delete purchase order.", variant: "destructive" });
        }
    }

    const handleAddPurchaseOrder = () => {
        setEditingPO(undefined);
        setIsPODialogOpen(true);
    }

    const handleOpenReceiveStock = (po: PurchaseOrder) => {
        setEditingPO(po);
        setIsUpdateStatusDialogOpen(true);
    }
    
    const handleSuccess = async (po: Omit<PurchaseOrder, 'id' | 'purchaseOrderNumber'>) => {
        if (!firestore || !currentUser || !products) {
            toast({ title: "Error", description: "Core data is not loaded yet.", variant: "destructive" });
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const companyDocRef = doc(firestore, 'settings', 'global', 'companies', 'main_company');
                const companyDoc = await transaction.get(companyDocRef);
                if (!companyDoc.exists()) throw new Error("Company details not found.");
                
                const companyData = companyDoc.data();
                const isGst = po.purchaseType === 'GST';
                const numberField = isGst ? 'lastGstPoNumber' : 'lastCashPoNumber';
                const prefix = isGst ? 'POGST' : 'POCSH';
                
                // Data Integrity Fix: Ensure numbering fields default to 0
                const lastNumber = (companyData && companyData[numberField]) ? Number(companyData[numberField]) : 0;
                const newNumber = lastNumber + 1;
                const purchaseOrderNumber = `${prefix}-${new Date().getFullYear()}-${String(newNumber).padStart(5, '0')}`;

                const poDocRef = doc(collection(firestore, 'stores', STORE_ID, 'purchaseOrders'));
                const finalPO: PurchaseOrder = {
                    ...po,
                    id: poDocRef.id,
                    purchaseOrderNumber,
                    createdBy: currentUser.id,
                    createdByName: currentUser.displayName || 'Unknown User'
                } as PurchaseOrder;

                // Price update logic
                for (const item of finalPO.items) {
                    const product = products.find(p => p.id === item.productId);
                    if (product && product.purchasePrice !== item.unitCost) {
                        const productRef = doc(firestore, 'stores', STORE_ID, 'products', product.id);
                        const newPriceHistoryEntry: PriceHistoryEntry = {
                            purchasePrice: item.unitCost,
                            sellingPrice: product.sellingPrice,
                            date: new Date().toISOString(),
                        };
                        const updatedPriceHistory = [...(product.priceHistory || []), newPriceHistoryEntry];
                        transaction.update(productRef, {
                            purchasePrice: item.unitCost,
                            priceHistory: updatedPriceHistory
                        });
                    }
                }

                transaction.set(poDocRef, finalPO);
                transaction.update(companyDocRef, { [numberField]: newNumber });
            });

            setIsPODialogOpen(false);
            toast({
                title: "Success!",
                description: `Purchase Order created successfully.`
            });
        } catch(error) {
            console.error("Error creating PO and updating prices:", error);
            toast({ title: "Error", description: (error as Error).message || "Could not create purchase order or update prices.", variant: "destructive" });
        }
    }

    const handleStatusUpdateSuccess = async (receivedInfo: ReceivedStockInfo, purchaseOrder: PurchaseOrder) => {
        if (!firestore) return;
        const batch = writeBatch(firestore);

        const inventoryCollectionRef = collection(firestore, 'stores', purchaseOrder.deliveryStoreId, 'inventoryItems');
        
        for (const itemToReceive of receivedInfo.items) {
            if (itemToReceive.quantityToReceive > 0) {
                const q = query(inventoryCollectionRef, where("productId", "==", itemToReceive.productId));
                const querySnapshot = await getDocs(q);

                const newBatch = {
                    date: receivedInfo.receiptDate.toISOString(),
                    quantity: itemToReceive.quantityToReceive,
                    purchasePrice: purchaseOrder.items.find(i => i.productId === itemToReceive.productId)!.unitCost,
                    vendorId: purchaseOrder.vendorId,
                    invoiceNumber: receivedInfo.invoiceNumber,
                };
                
                if (!querySnapshot.empty) {
                    const inventoryDoc = querySnapshot.docs[0];
                    const existingBatches = inventoryDoc.data().stockBatches || [];
                    batch.update(inventoryDoc.ref, {
                        stockBatches: [...existingBatches, newBatch],
                        lastStockUpdate: new Date().toISOString()
                    });
                } else {
                     const newInvDocRef = doc(inventoryCollectionRef);
                     batch.set(newInvDocRef, {
                        id: newInvDocRef.id,
                        productId: itemToReceive.productId,
                        storeId: purchaseOrder.deliveryStoreId,
                        stockBatches: [newBatch],
                        locationComment: 'N/A',
                        lastStockUpdate: new Date().toISOString()
                     });
                }
            }
        }

        // 2. Update Purchase Order
        const poDocRef = doc(firestore, 'stores', STORE_ID, 'purchaseOrders', purchaseOrder.id);
        const poToUpdate = { ...purchaseOrder };
        let totalOrdered = 0;
        let totalReceived = 0;

        poToUpdate.items.forEach((item: any) => {
            const receivedItem = receivedInfo.items.find(ri => ri.productId === item.productId);
            if(receivedItem) {
                item.quantityReceived = (item.quantityReceived || 0) + receivedItem.quantityToReceive;
            }
            totalOrdered += item.quantity;
            totalReceived += item.quantityReceived;
        });

        if (totalReceived >= totalOrdered) {
            poToUpdate.status = 'Received';
        } else if (totalReceived > 0) {
            poToUpdate.status = 'Partially Received';
        }

        batch.update(poDocRef, { items: poToUpdate.items, status: poToUpdate.status });
        
        await batch.commit();

        // 3. Close dialog and show toast
        setIsUpdateStatusDialogOpen(false);
        setEditingPO(undefined);
        toast({
            title: "Stock Received!",
            description: `Inventory updated for PO #${purchaseOrder.purchaseOrderNumber}.`
        });
    }


    const handleMarkAsFullyReceived = (poToUpdate: PurchaseOrder) => {
        const receivedInfo: ReceivedStockInfo = {
            poId: poToUpdate.id,
            receiptDate: new Date(),
            items: poToUpdate.items.map(item => ({
                productId: item.productId,
                quantityToReceive: item.quantity - (item.quantityReceived || 0)
            })).filter(item => item.quantityToReceive > 0)
        };

        if (receivedInfo.items.length === 0) {
            toast({
                title: "Already Received",
                description: `PO #${poToUpdate.purchaseOrderNumber} has already been fully received.`,
                variant: "default"
            });
            return;
        }

        handleStatusUpdateSuccess(receivedInfo, poToUpdate);
    };

    const handleUpdateShippingStatus = async (poId: string, status: 'Pending' | 'Shipped' | 'Cancelled') => {
        if (!firestore) return;
        try {
            const poDocRef = doc(firestore, 'stores', STORE_ID, 'purchaseOrders', poId);
            await updateDoc(poDocRef, { status });
            toast({
                title: "Status Updated",
                description: `Purchase order status changed to ${status}.`,
            });
        } catch (error) {
            console.error("Error updating PO status:", error);
            toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
        }
    };

    const handleBulkAction = (action: 'email' | 'print' | 'download' | 'share', selectedPOs: PurchaseOrder[]) => {
        if (!companyDetails) {
            toast({ title: "Error", description: "Company details not loaded.", variant: "destructive" });
            return;
        }
        if (action === 'share') {
             const message = selectedPOs.map(po => {
                return generateShareText('Purchase Order', po.purchaseOrderNumber, po.vendorName, companyDetails?.name || 'our store', `${window.location.origin}/purchase-order/${po.id}`);
            }).join('\n\n');
            openShareDialog({title: 'Your Purchase Orders', text: message});
        } else if (action === 'email') {
            selectedPOs.forEach(po => {
                const subject = `Purchase Order #${po.purchaseOrderNumber} from ${companyDetails.name}`;
                const body = generatePurchaseOrderEmailBody(po, companyDetails);
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
            });
        } else if (action === 'print') {
            selectedPOs.forEach(po => {
                 window.open(`/purchase-order/${po.id}`, '_blank');
            });
        } else if (action === 'download') {
            downloadBulkPurchaseOrders(selectedPOs, safeVendors, companyDetails);
        }
    };

    const handleExport = () => {
        if (!products) return;
        const dataToExport = purchaseOrders.flatMap(po => 
            po.items.map(item => ({
                'PO Number': po.purchaseOrderNumber,
                'Vendor': po.vendorName,
                'Order Date': format(new Date(po.orderDate), 'yyyy-MM-dd'),
                'Status': po.status,
                'Product Name': item.productName,
                'SKU': products.find(p => p.id === item.productId)?.sku || '',
                'Quantity': item.quantity,
                'Unit Cost': item.unitCost,
                'Total Cost': item.totalCost,
                'Comments': po.comments || '',
            }))
        );
        exportToExcel(dataToExport, 'purchase_orders_export');
    };

    const summaryData: SummaryCardData[] = useMemo(() => {
        const totalAmount = purchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0);
        const receivedCount = purchaseOrders.filter(po => po.status === 'Received').length;
        const pendingCount = purchaseOrders.filter(po => po.status === 'Pending' || po.status === 'Shipped' || po.status === 'Partially Received').length;
        
        return [
            { title: "Total POs", value: purchaseOrders.length.toString(), icon: Truck },
            { title: "Total Purchase Value", value: isMounted ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹...', icon: CircleDollarSign },
            { title: "POs Received", value: receivedCount.toString(), icon: CheckCircle2 },
            { title: "Pending Delivery", value: pendingCount.toString(), icon: Clock },
        ];
    }, [purchaseOrders, isMounted]);

    const chartData = useMemo(() => {
        const sortedPOs = [...purchaseOrders].sort((a,b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
        return sortedPOs.map(po => ({
            name: format(new Date(po.orderDate), 'MMM dd'),
            amount: po.totalAmount,
        }));
    }, [purchaseOrders]);

    const chartConfig: ChartConfig = useMemo(() => ({
        amount: { label: 'Amount', color: 'hsl(var(--chart-1))' },
    }), []);

  return (
    <>
      <PageHeader title="Purchases">
         <Button variant="outline" onClick={handleExport} size="sm" disabled={purchaseOrders.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
        <Button onClick={handleAddPurchaseOrder}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
        <PageSummary cards={summaryData} />
        <PurchaseOrderDialog 
            open={isPODialogOpen}
            onOpenChange={setIsPODialogOpen}
            onSuccess={handleSuccess}
        />
        {editingPO && (
            <UpdatePoStatusDialog
                open={isUpdateStatusDialogOpen}
                onOpenChange={setIsUpdateStatusDialogOpen}
                purchaseOrder={editingPO}
                onSuccess={(info) => handleStatusUpdateSuccess(info, editingPO)}
            />
        )}
         <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Purchase Orders</CardTitle>
                    <CardDescription>
                    Create and manage your purchase orders.
                    </CardDescription>
                </div>
                 <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'desc' | 'asc')}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Sort by date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Newest to Oldest</SelectItem>
                        <SelectItem value="asc">Oldest to Newest</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={columns({ 
                    vendors: safeVendors,
                    users: safeUsers,
                    onDelete: handleDelete, 
                    onReceiveStock: handleOpenReceiveStock, 
                    onMarkAsFullyReceived: handleMarkAsFullyReceived, 
                    onUpdateShippingStatus: handleUpdateShippingStatus,
                    onShare: (po) => {
                        const text = generateShareText('Purchase Order', po.purchaseOrderNumber, po.vendorName, companyDetails?.name || 'our store', `${window.location.origin}/purchase-order/${po.id}`);
                        openShareDialog({title: `Purchase Order #${po.purchaseOrderNumber}`, text});
                    }
                })} 
                data={purchaseOrders}
                onBulkAction={handleBulkAction}
                onDeleteSelected={(pos) => pos.forEach(po => handleDelete(po.id))} 
            />
          </CardContent>
        </Card>
        <GenericChart
            title="Purchase Orders Over Time"
            description="Total value of purchase orders placed over time."
            data={chartData}
            dataKeyX="name"
            dataKeysY={['amount']}
            chartConfig={chartConfig}
            yAxisFormatter={(value) => `₹${(value / 1000).toLocaleString()}k`}
        />
      </div>
    </>
  );
}
