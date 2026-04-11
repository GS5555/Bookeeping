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
import { Sale, SaleReturn, Customer, Product, User, Company, Store } from '@/lib/types';
import { SaleDialog } from './sale-dialog';
import { ReturnDialog } from './return-dialog';
import { toast } from '@/hooks/use-toast';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { exportToExcel, generateShareText } from '@/lib/actions';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy, limit, deleteDoc, runTransaction } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerFinancials } from './customer-financials';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CustomerLedger } from './customer-ledger';
import { format, addDays, startOfMonth, subMonths, isWithinInterval, endOfMonth } from 'date-fns';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { ShareDialog } from '@/components/share-dialog';

const STORE_ID = 'store_main';

export default function SalesPage() {
    const firestore = useFirestore();
    const { currentUser } = useCurrentUser();
    const isMounted = useIsMounted();
    const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();

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

    const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
    const { data: stores } = useCollection<Store>(storesRef);

    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | undefined>();

    const safeSales = sales || [];
    const safeReturns = returns || [];
    const safeCustomers = customers || [];
    const safeProducts = products || [];
    const safeStores = stores || [];

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
                
                const sanitizedSale = JSON.parse(JSON.stringify({
                    ...sale,
                    id: saleDocRef.id,
                    invoiceSequence,
                    dueDate: addDays(new Date(sale.saleDate), 30).toISOString(),
                    createdBy: currentUser.id,
                    createdByName: currentUser.displayName || 'Staff'
                }));

                transaction.set(saleDocRef, sanitizedSale);
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
            await runTransaction(firestore, async (transaction) => {
                transaction.set(returnDocRef, { ...saleReturn, id: returnDocRef.id });
            });
            setIsReturnDialogOpen(false);
            toast({ title: "Success!", description: "Return processed successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to process return.", variant: "destructive" });
        }
    };

    const dynamicStats = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonth = subMonths(now, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        
        const salesThisMonth = safeSales.filter(s => new Date(s.saleDate) >= currentMonthStart);
        const salesLastMonth = safeSales.filter(s => isWithinInterval(new Date(s.saleDate), { start: lastMonthStart, end: lastMonthEnd }));
        
        const totalRev = salesThisMonth.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalRevLastMonth = salesLastMonth.reduce((acc, s) => acc + (s.total || 0), 0);
        
        const totalRet = safeReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
        
        const calcChange = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? 100 : 0;
            return ((cur - prev) / prev) * 100;
        };

        return {
            totalRev,
            totalRet,
            netRev: totalRev - totalRet,
            avgSale: safeSales.length ? safeSales.reduce((a, s) => a + (s.total || 0), 0) / safeSales.length : 0,
            revenueChange: calcChange(totalRev, totalRevLastMonth)
        };
    }, [safeSales, safeReturns]);

    const summaryData: SummaryCardData[] = useMemo(() => [
        { title: "Total Revenue", value: isMounted ? `₹${dynamicStats.totalRev.toLocaleString('en-IN')}` : '₹...', icon: CircleDollarSign, description: `${dynamicStats.revenueChange.toFixed(1)}% vs last month` },
        { title: "Total Returns", value: isMounted ? `₹${dynamicStats.totalRet.toLocaleString('en-IN')}` : '₹...', icon: ArrowLeftRight },
        { title: "Net Revenue", value: isMounted ? `₹${dynamicStats.netRev.toLocaleString('en-IN')}` : '₹...', icon: TrendingUp },
        { title: "Avg. Sale", value: isMounted ? `₹${dynamicStats.avgSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', icon: ShoppingCart },
    ], [dynamicStats, isMounted]);

    const chartData = useMemo(() => {
        const monthlyData: Record<string, number> = {};
        safeSales.forEach(s => {
            const m = format(new Date(s.saleDate), 'MMM');
            monthlyData[m] = (monthlyData[m] || 0) + (s.total || 0);
        });
        return Object.entries(monthlyData).map(([name, total]) => ({ name, total }));
    }, [safeSales]);

    const chartConfig: ChartConfig = { total: { label: 'Revenue', color: 'hsl(var(--chart-1))' } };

    return (
        <div className="flex flex-col gap-6 sm:gap-8 pb-8 min-w-0 w-full overflow-x-hidden">
            <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
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
                                <DataTable columns={salesColumns({ 
                                    onDelete: handleDeleteSale, 
                                    onEdit: handleEditSale, 
                                    products: safeProducts, 
                                    customers: safeCustomers, 
                                    users: users || [],
                                    onShare: (sale) => {
                                        if (!companyDetails) return;
                                        const text = generateShareText('Invoice', sale.invoiceSequence, sale.customerName, companyDetails.name, `${window.location.origin}/invoice/${sale.id}`);
                                        openShareDialog({title: `Invoice #${sale.invoiceSequence}`, text});
                                    }
                                })} data={safeSales.filter(s => s.saleType === 'GST')} />
                            </TabsContent>
                            <TabsContent value="cash" className="m-0">
                                <DataTable columns={salesColumns({ 
                                    onDelete: handleDeleteSale, 
                                    onEdit: handleEditSale, 
                                    products: safeProducts, 
                                    customers: safeCustomers, 
                                    users: users || [],
                                    onShare: (sale) => {
                                        if (!companyDetails) return;
                                        const text = generateShareText('Invoice', sale.invoiceSequence, sale.customerName, companyDetails.name, `${window.location.origin}/invoice/${sale.id}`);
                                        openShareDialog({title: `Invoice #${sale.invoiceSequence}`, text});
                                    }
                                })} data={safeSales.filter(s => s.saleType === 'Cash')} />
                            </TabsContent>
                            <TabsContent value="returns" className="m-0">
                                <DataTable columns={returnColumns({ customers: safeCustomers, stores: safeStores })} data={safeReturns} />
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
