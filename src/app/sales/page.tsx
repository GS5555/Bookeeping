
'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, TrendingUp, CircleDollarSign, ArrowLeftRight, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { salesColumns } from './columns';
import { returnColumns } from './return-columns';
import React, { useState, useMemo } from 'react';
import { Sale, SaleReturn, Customer, Product, User, Company } from '@/lib/types';
import { SaleDialog } from './sale-dialog';
import { ReturnDialog } from './return-dialog';
import { toast } from '@/hooks/use-toast';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { exportToExcel } from '@/lib/actions';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy, limit, deleteDoc, setDoc, runTransaction, where, getDocs } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerFinancials } from './customer-financials';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CustomerLedger } from './customer-ledger';
import { format } from 'date-fns';

const STORE_ID = 'store_main';

export default function SalesPage() {
    const firestore = useFirestore();
    const { currentUser } = useCurrentUser();
    const isMounted = useIsMounted();

    const salesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc'), limit(100)) : null, [firestore]);
    const { data: sales, isLoading: areSalesLoading } = useCollection<Sale>(salesRef);

    const returnsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'salesReturns'), orderBy('returnDate', 'desc'), limit(100)) : null, [firestore]);
    const { data: returns, isLoading: areReturnsLoading } = useCollection<SaleReturn>(returnsRef);

    const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersRef);

    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsRef);
    
    const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users } = useCollection<User>(usersRef);

    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | undefined>();

    const safeSales = sales || [];
    const safeReturns = returns || [];
    const safeCustomers = customers || [];
    const safeProducts = products || [];

    const handleAddSale = () => {
        setEditingSale(undefined);
        setIsSaleDialogOpen(true);
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSale(sale);
        setIsSaleDialogOpen(true);
    };

    const handleAddReturn = () => {
        setIsReturnDialogOpen(true);
    };

    const handleDeleteSale = async (saleId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'stores', STORE_ID, 'sales', saleId));
            toast({ title: "Success!", description: "Sale deleted successfully." });
        } catch (error) {
            console.error("Error deleting sale:", error);
            toast({ title: "Error", description: "Could not delete sale.", variant: "destructive" });
        }
    };

    const handleSaleSuccess = async (sale: Sale) => {
        if (!firestore || !currentUser) return;
        try {
            await runTransaction(firestore, async (transaction) => {
                const companyRef = doc(firestore, 'settings', 'global', 'companies', 'main_company');
                const companyDoc = await transaction.get(companyRef);
                
                let companyData = companyDoc.exists() ? companyDoc.data() : { lastInvoiceNumber: 0, lastBillNumber: 0 };
                const isGst = sale.saleType === 'GST';
                const numberField = isGst ? 'lastInvoiceNumber' : 'lastBillNumber';
                const newNumber = (companyData[numberField] || 0) + 1;
                const prefix = isGst ? (companyData.invoicePrefix || 'INV') : 'BILL';
                const invoiceSequence = `${prefix}-${new Date().getFullYear()}-${String(newNumber).padStart(5, '0')}`;
                
                const saleDocRef = doc(collection(firestore, 'stores', STORE_ID, 'sales'));
                const finalSale = { 
                    ...sale, 
                    id: saleDocRef.id, 
                    invoiceSequence, 
                    createdBy: currentUser.id,
                    createdByName: currentUser.displayName 
                };

                transaction.set(saleDocRef, finalSale);
                transaction.update(companyRef, { [numberField]: newNumber });
            });
            setIsSaleDialogOpen(false);
            toast({ title: "Success!", description: "Sale recorded successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save sale.", variant: "destructive" });
        }
    };

    const handleReturnSuccess = async (saleReturn: SaleReturn) => {
        if (!firestore) return;
        try {
            const returnDocRef = doc(collection(firestore, 'stores', STORE_ID, 'salesReturns'));
            await setDoc(returnDocRef, { ...saleReturn, id: returnDocRef.id });
            setIsReturnDialogOpen(false);
            toast({ title: "Success!", description: "Return processed successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to process return.", variant: "destructive" });
        }
    };

    const summaryData: SummaryCardData[] = useMemo(() => {
        const totalRev = safeSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalRet = safeReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
        return [
            { title: "Total Revenue", value: isMounted ? `₹${totalRev.toLocaleString('en-IN')}` : '₹...', icon: CircleDollarSign },
            { title: "Total Returns", value: isMounted ? `₹${totalRet.toLocaleString('en-IN')}` : '₹...', icon: ArrowLeftRight },
            { title: "Net Revenue", value: isMounted ? `₹${(totalRev - totalRet).toLocaleString('en-IN')}` : '₹...', icon: TrendingUp },
            { title: "Avg. Sale", value: isMounted ? `₹${(safeSales.length ? totalRev / safeSales.length : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', icon: ShoppingCart },
        ];
    }, [safeSales, safeReturns, isMounted]);

    const chartData = useMemo(() => {
        const monthlyData: Record<string, number> = {};
        safeSales.forEach(s => {
            const m = format(new Date(s.saleDate), 'MMM');
            monthlyData[m] = (monthlyData[m] || 0) + s.totalAmount;
        });
        return Object.entries(monthlyData).map(([name, total]) => ({ name, total }));
    }, [safeSales]);

    const chartConfig: ChartConfig = { total: { label: 'Revenue', color: 'hsl(var(--chart-1))' } };

    return (
        <div className="flex flex-col gap-6 sm:gap-8 pb-8 min-w-0 w-full overflow-x-hidden">
            <PageHeader title="Sales & Returns">
                <Button variant="outline" onClick={() => exportToExcel(safeSales, 'sales_export')} size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={handleAddReturn} variant="outline" size="sm">New Return</Button>
                <Button onClick={handleAddSale} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Sale</Button>
            </PageHeader>

            <div className="flex flex-col gap-8 min-w-0 w-full">
                <PageSummary cards={summaryData} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                    <CustomerFinancials sales={safeSales} customers={safeCustomers} companyDetails={companyDetails || null} />
                    <CustomerLedger sales={safeSales} returns={safeReturns} customers={safeCustomers} />
                </div>

                <Tabs defaultValue="gst" className="w-full min-w-0">
                    <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
                        <TabsTrigger value="gst">GST Sales</TabsTrigger>
                        <TabsTrigger value="cash">Cash Sales</TabsTrigger>
                        <TabsTrigger value="returns">Returns</TabsTrigger>
                    </TabsList>
                    <Card className="mt-4 overflow-hidden border-2 shadow-sm">
                        <CardContent className="p-0 sm:p-6 min-w-0">
                            <TabsContent value="gst" className="m-0">
                                <DataTable columns={salesColumns({ onDelete: handleDeleteSale, onEdit: handleEditSale, products: safeProducts, customers: safeCustomers, users: users || [] })} data={safeSales.filter(s => s.saleType === 'GST')} />
                            </TabsContent>
                            <TabsContent value="cash" className="m-0">
                                <DataTable columns={salesColumns({ onDelete: handleDeleteSale, onEdit: handleEditSale, products: safeProducts, customers: safeCustomers, users: users || [] })} data={safeSales.filter(s => s.saleType === 'Cash')} />
                            </TabsContent>
                            <TabsContent value="returns" className="m-0">
                                <DataTable columns={returnColumns({ customers: safeCustomers, stores: [] })} data={safeReturns} />
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>

                <GenericChart title="Revenue Trend" description="Monthly sales performance." data={chartData} dataKeyX="name" dataKeysY={['total']} chartConfig={chartConfig} yAxisFormatter={(v) => `₹${v/1000}k`} />
            </div>

            <SaleDialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen} sale={editingSale} onSuccess={handleSaleSuccess} />
            <ReturnDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen} onSuccess={handleReturnSuccess} />
        </div>
    );
}
