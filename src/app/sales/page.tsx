'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Calculator, CircleDollarSign, PlusCircle, Undo2, BarChart3, AlertCircle, Users, LayoutGrid, Trophy, ReceiptText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/data-table';
import { salesColumns } from './columns';
import { useState, useMemo } from 'react';
import { Sale, SaleReturn, Customer, Product, Company, User, Category, Payment } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { SaleDialog } from './sale-dialog';
import { returnColumns } from './return-columns';
import { ReturnDialog } from './return-dialog';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { collection, doc, query, orderBy, runTransaction, setDoc, deleteDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { generateShareText } from '@/lib/actions';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { ShareDialog } from '@/components/share-dialog';
import { CustomerLedger } from './customer-ledger';
import { CustomerFinancials } from './customer-financials';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentDialog } from './payment-dialog';

const STORE_ID = 'store_main';

type AggregationType = 'monthly' | 'quarterly' | 'annual';
type ComparisonType = 'month' | 'quarter' | 'year';

export default function SalesPage() {
  const firestore = useFirestore();
  const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();
  const { currentUser } = useCurrentUser();

  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonType>('month');
  const [revenueAggregation, setRevenueAggregation] = useState<AggregationType>('monthly');
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string>('');
  const [selectedPendingCustomer, setSelectedPendingCustomer] = useState<string>('');

  const salesCollectionRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc'));
  }, [firestore]);
  const { data: salesData } = useCollection<Sale>(salesCollectionRef);

  const returnsCollectionRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'stores', STORE_ID, 'salesReturns'), orderBy('returnDate', 'desc'));
  }, [firestore]);
  const { data: returnsData } = useCollection<SaleReturn>(returnsCollectionRef);
  
  const customersCollectionRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customersData } = useCollection<Customer>(customersCollectionRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: productsData } = useCollection<Product>(productsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categoriesData } = useCollection<Category>(categoriesRef);

  const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
  const { data: companyDetails } = useDoc<Company>(companyDocRef);
  
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersRef);

  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | undefined>();

  const isMounted = useIsMounted();
  const safeSales = salesData || [];
  const safeReturns = returnsData || [];
  const safeCustomers = customersData || [];
  const safeProducts = productsData || [];
  const safeUsers = usersData || [];
  const safeCategories = categoriesData || [];

  const handlePaymentSuccess = async (payment: Payment) => {
    if (!firestore) return;
    try {
        const batch = writeBatch(firestore);
        const payRef = doc(firestore, 'stores', STORE_ID, 'customers', payment.customerId, 'payments', payment.id);
        batch.set(payRef, payment);

        const salesRef = collection(firestore, 'stores', STORE_ID, 'sales');
        const q = query(
            salesRef, 
            where('customerId', '==', payment.customerId),
            where('invoiceStatus', 'in', ['Unpaid', 'Partially Paid']),
            orderBy('saleDate', 'asc')
        );
        
        const snapshot = await getDocs(q);
        let remainingPayment = payment.amount;

        for (const saleDoc of snapshot.docs) {
            if (remainingPayment <= 0) break;

            const saleData = saleDoc.data() as Sale;
            const currentPaid = saleData.amountPaid || 0;
            const total = saleData.totalAmount;
            const needed = total - currentPaid;

            const saleRef = doc(firestore, 'stores', STORE_ID, 'sales', saleDoc.id);

            if (remainingPayment >= needed) {
                batch.update(saleRef, { amountPaid: total, balanceAmount: 0, invoiceStatus: 'Paid' });
                remainingPayment -= needed;
            } else {
                const newPaid = currentPaid + remainingPayment;
                batch.update(saleRef, { amountPaid: newPaid, balanceAmount: total - newPaid, invoiceStatus: 'Partially Paid' });
                remainingPayment = 0;
            }
        }

        await batch.commit();
        setIsPaymentDialogOpen(false);
        toast({ title: "Payment Recorded", description: `Applied to pending invoices.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to process payment settlement.", variant: "destructive" });
    }
  }

  const handleSaleSuccess = async (sale: Sale) => {
    if (!firestore || !currentUser) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const companyRef = doc(firestore, 'settings', 'global', 'companies', 'main_company');
            const companyDoc = await transaction.get(companyRef);
            
            let companyData;
            if (!companyDoc.exists()) {
                companyData = {
                    id: 'main_company',
                    name: 'Cricket Store',
                    shortName: 'CS',
                    invoicePrefix: 'INV',
                    lastInvoiceNumber: 0,
                    lastBillNumber: 0,
                };
                transaction.set(companyRef, companyData);
            } else {
                companyData = companyDoc.data();
            }
            
            const isGst = sale.saleType === 'GST';
            const numberField = isGst ? 'lastInvoiceNumber' : 'lastBillNumber';
            const prefix = isGst ? (companyData.invoicePrefix || 'INV') : 'BILL';
            const lastNumber = companyData[numberField] || 0;
            const newNumber = lastNumber + 1;
            const invoiceSequence = `${prefix}-${new Date().getFullYear()}-${String(newNumber).padStart(5, '0')}`;
            
            const saleDocRef = doc(collection(firestore, 'stores', STORE_ID, 'sales'));
            const finalSaleData: Sale = {
                ...sale,
                id: saleDocRef.id,
                invoiceSequence,
                dueDate: addDays(new Date(sale.saleDate), 30).toISOString(),
                createdBy: currentUser.id,
                createdByName: currentUser.displayName,
            } as Sale;

            transaction.set(saleDocRef, finalSaleData);
            transaction.update(companyRef, { [numberField]: newNumber });
        });
        toast({ title: "Success!", description: `Invoice created successfully!` });
        setIsSaleDialogOpen(false);
    } catch (error) {
        console.error("Sale creation failed:", error);
        toast({ title: "Error", description: (error as Error).message || "Failed to create sale.", variant: "destructive" });
    }
  }

  const handleDelete = async (saleId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'stores', STORE_ID, 'sales', saleId));
      toast({ title: "Sale Deleted" });
    } catch (error) {
       console.error(error);
       toast({ title: "Error", variant: "destructive" });
    }
  }

  const summaryData: SummaryCardData[] = useMemo(() => {
    const totalRevenue = safeSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalRefunds = safeReturns.reduce((acc, saleReturn) => acc + saleReturn.totalRefundAmount, 0);
    const averageSale = safeSales.length > 0 ? totalRevenue / safeSales.length : 0;
    
    return [
        { title: "Total Revenue", value: isMounted ? `₹${totalRevenue.toLocaleString('en-IN')}` : '₹...', icon: CircleDollarSign },
        { title: "Total Returns", value: isMounted ? `₹${totalRefunds.toLocaleString('en-IN')}` : '₹...', icon: Undo2 },
        { title: "Net Revenue", value: isMounted ? `₹${(totalRevenue - totalRefunds).toLocaleString('en-IN')}` : '₹...', icon: CircleDollarSign },
        { title: "Average Sale", value: isMounted ? `₹${averageSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', icon: Calculator },
    ];
  }, [safeSales, safeReturns, isMounted]);

  const salesByCategoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    safeSales.forEach(sale => {
        sale.items.forEach(item => {
            const category = safeCategories.find(c => c.id === item.categoryId);
            const label = category?.name || 'Uncategorized';
            categoryMap[label] = (categoryMap[label] || 0) + item.totalPrice;
        });
    });
    return Object.entries(categoryMap).map(([name, total]) => ({ name, total }));
  }, [safeSales, safeCategories]);

  const topProductsData = useMemo(() => {
    const productMap: Record<string, number> = {};
    safeSales.forEach(sale => {
        sale.items.forEach(item => {
            productMap[item.productName] = (productMap[item.productName] || 0) + item.totalPrice;
        });
    });
    return Object.entries(productMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [safeSales]);

  const revenueChartData = useMemo(() => {
    const aggregateMap: Record<string, number> = {};
    safeSales.forEach(sale => {
        const key = format(new Date(sale.saleDate), 'MMM yyyy');
        aggregateMap[key] = (aggregateMap[key] || 0) + sale.totalAmount;
    });
    return Object.entries(aggregateMap).map(([name, total]) => ({ name, total }));
  }, [safeSales]);

  const customersWithPending = useMemo(() => {
    const pendingIds = new Set(safeSales.filter(s => s.invoiceStatus !== 'Paid').map(s => s.customerId));
    return safeCustomers.filter(c => pendingIds.has(c.id));
  }, [safeSales, safeCustomers]);

  const customersForFinancials = useMemo(() => {
    if (!selectedPendingCustomer || selectedPendingCustomer === 'all') return customersWithPending;
    return customersWithPending.filter(c => c.id === selectedPendingCustomer);
  }, [customersWithPending, selectedPendingCustomer]);

  const comparisonChartData = useMemo(() => {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    const currentTotal = safeSales.filter(s => new Date(s.saleDate) >= currentStart).reduce((acc, s) => acc + s.totalAmount, 0);
    const prevTotal = safeSales.filter(s => isWithinInterval(new Date(s.saleDate), { start: prevStart, end: prevEnd })).reduce((acc, s) => acc + s.totalAmount, 0);

    return [ { name: format(prevStart, 'MMMM'), total: prevTotal }, { name: format(currentStart, 'MMMM'), total: currentTotal } ];
  }, [safeSales]);

  const chartConfigBase: ChartConfig = { total: { label: 'Amount', color: 'hsl(var(--chart-1))' } };

  return (
    <>
      <PageHeader title="Sales & Returns">
        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}><ReceiptText className="mr-2 h-4 w-4" />Receive Payment</Button>
        <Button variant="outline" onClick={() => setIsReturnDialogOpen(true)}><Undo2 className="mr-2 h-4 w-4" />New Return</Button>
        <Button onClick={() => { setEditingSale(undefined); setIsSaleDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />New Sale</Button>
      </PageHeader>
      
      <div className="flex flex-col gap-8">
        <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
        <PageSummary cards={summaryData} />

        <div className="grid grid-cols-1 gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Performance Delta</CardTitle>
                        <CardDescription>Comparative performance vs previous period.</CardDescription>
                    </div>
                    <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonType)}>
                        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="month">Month-over-Month</SelectItem><SelectItem value="quarter">Quarter-over-Quarter</SelectItem><SelectItem value="year">Year-over-Year</SelectItem></SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <GenericChart title="" description="" data={comparisonChartData} dataKeyX="name" dataKeysY={['total']} chartConfig={chartConfigBase} chartType="bar" categorical={true} yAxisFormatter={(v) => `₹${v.toLocaleString()}`} />
                </CardContent>
            </Card>

            <Tabs defaultValue="gst">
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b">
                        <div>
                            <CardTitle>Transaction Registry</CardTitle>
                            <CardDescription>Registry of all finalized transactions.</CardDescription>
                        </div>
                        <TabsList className="grid grid-cols-3 w-[300px]">
                            <TabsTrigger value="gst">GST</TabsTrigger>
                            <TabsTrigger value="cash">Cash</TabsTrigger>
                            <TabsTrigger value="returns">Returns</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <TabsContent value="gst">
                            <DataTable columns={salesColumns({ onDelete: handleDelete, onEdit: (s) => { setEditingSale(s); setIsSaleDialogOpen(true); }, products: safeProducts, customers: safeCustomers, users: safeUsers, onShare: (sale) => openShareDialog({title: `Invoice #${sale.invoiceSequence}`, text: generateShareText('Invoice', sale.invoiceSequence, sale.customerName, companyDetails?.name || 'our store', `${window.location.origin}/invoice/${sale.id}`)}) })} data={safeSales.filter(sale => sale.saleType === 'GST')} />
                        </TabsContent>
                        <TabsContent value="cash">
                            <DataTable columns={salesColumns({ onDelete: handleDelete, onEdit: (s) => { setEditingSale(s); setIsSaleDialogOpen(true); }, products: safeProducts, customers: safeCustomers, users: safeUsers, onShare: (sale) => openShareDialog({title: `Invoice #${sale.invoiceSequence}`, text: generateShareText('Invoice', sale.invoiceSequence, sale.customerName, companyDetails?.name || 'our store', `${window.location.origin}/invoice/${sale.id}`)}) })} data={safeSales.filter(sale => sale.saleType === 'Cash')} />
                        </TabsContent>
                        <TabsContent value="returns">
                            <DataTable columns={returnColumns({customers: safeCustomers, stores: []})} data={safeReturns} />
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Customer Sale History</CardTitle>
                        <CardDescription>View all transactions for a specific client profile.</CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                        <Select value={selectedHistoryCustomer} onValueChange={setSelectedHistoryCustomer}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select customer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {safeCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {selectedHistoryCustomer ? (
                        <DataTable columns={salesColumns({ onDelete: handleDelete, onEdit: (s) => { setEditingSale(s); setIsSaleDialogOpen(true); }, products: safeProducts, customers: safeCustomers, users: safeUsers })} data={safeSales.filter(s => s.customerId === selectedHistoryCustomer)} />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                            <p>Select a customer above to generate history.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CustomerLedger sales={safeSales} returns={safeReturns} customers={safeCustomers} />

            <Card className="flex flex-col">
                <CardHeader className="border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle><AlertCircle className="inline h-5 w-5 mr-2 text-destructive" /> Pending Invoices</CardTitle>
                            <CardDescription>Accounts receivable requiring immediate attention.</CardDescription>
                        </div>
                        <div className="w-full max-w-xs">
                            <Select value={selectedPendingCustomer} onValueChange={setSelectedPendingCustomer}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Filter debtors..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Debtors</SelectItem>
                                    {customersWithPending.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1">
                    <CustomerFinancials sales={safeSales} customers={customersForFinancials} companyDetails={companyDetails || null} />
                </CardContent>
            </Card>
        </div>

        <SaleDialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen} sale={editingSale} onSuccess={handleSaleSuccess} />
        <ReturnDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen} onSuccess={(r) => { firestore && setDoc(doc(collection(firestore, 'stores', STORE_ID, 'salesReturns')), r).then(() => setIsReturnDialogOpen(false)) }} />
        <PaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} onSuccess={handlePaymentSuccess} />
      </div>
    </>
  );
}