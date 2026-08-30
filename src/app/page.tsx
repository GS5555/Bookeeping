'use client';
import { PageHeader } from '@/components/layout/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { QuickActions } from '@/components/dashboard/quick-actions';

import { useState, useMemo } from 'react';
import { SaleDialog } from '@/app/sales/sale-dialog';
import { PurchaseOrderDialog } from '@/app/purchases/purchase-order-dialog';
import { ProductDialog } from '@/app/products/product-dialog';
import { CustomerDialog } from '@/app/customers/customer-dialog';
import { ExpenseDialog } from '@/app/expenses/expense-dialog';
import { StockDialog, StockFormValues } from '@/app/inventory/stock-dialog';
import { toast } from '@/hooks/use-toast';
import type { Sale, PurchaseOrder, Product, Customer, Vendor, Expense, InventoryItem, Company } from '@/lib/types';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';

import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { format, subMonths, startOfMonth, isWithinInterval, endOfMonth, addDays } from 'date-fns';
import { DataTable } from '@/components/data-table';
import { salesColumns } from '@/app/sales/columns';
import { Users } from 'lucide-react';
import { EnquiryDialog } from '@/app/enquiries/enquiry-dialog';
import { QuotationDialog } from '@/app/quotations/quotation-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { generateShareText } from '@/lib/actions';
import { ShareDialog } from '@/components/share-dialog';
import { FullPageLoader } from '@/components/full-page-loader';
import { EventReminders } from '@/components/dashboard/event-reminders';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STORE_ID = 'store_main';

export default function Dashboard() {
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isEnquiryDialogOpen, setIsEnquiryDialogOpen] = useState(false);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  
  const firestore = useFirestore();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();

  const salesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc')) : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);

  const poRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'purchaseOrders'), orderBy('orderDate', 'desc')) : null, [firestore]);
  const { data: purchaseOrders } = useCollection<PurchaseOrder>(poRef);
  
  const expensesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'expenses'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: expenses } = useCollection<Expense>(expensesRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
  const { data: companyDetails } = useDoc<Company>(companyDocRef);

  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string>('');
  
  const safeSales = sales || [];
  const safeCustomers = customers || [];
  const safeProducts = products || [];

  const dynamicStats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonth = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);
    
    const salesThisMonth = safeSales.filter(s => new Date(s.saleDate) >= currentMonthStart);
    const salesLastMonth = safeSales.filter(s => isWithinInterval(new Date(s.saleDate), { start: lastMonthStart, end: lastMonthEnd }));
    
    const totalSales = salesThisMonth.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalSalesLastMonth = salesLastMonth.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const purchasesThisMonth = (purchaseOrders || []).filter(p => new Date(p.orderDate) >= currentMonthStart);
    const totalPurchases = purchasesThisMonth.reduce((sum, po) => sum + po.totalAmount, 0);

    const expensesThisMonth = (expenses || []).filter(e => new Date(e.date) >= currentMonthStart);
    const totalExpenses = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);
    
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return { 
        totalSales, totalPurchases, totalExpenses, 
        salesChange: calcChange(totalSales, totalSalesLastMonth),
        purchasesChange: 0,
        expensesChange: 0
    };
  }, [safeSales, purchaseOrders, expenses]);

  const salesChartData = useMemo(() => {
    const monthlySales: Record<string, number> = {};
    safeSales.forEach(sale => {
      const month = format(new Date(sale.saleDate), 'MMM');
      monthlySales[month] = (monthlySales[month] || 0) + (sale.total || 0);
    });
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthOrder.map(month => ({ name: month, total: monthlySales[month] || 0 }));
  }, [safeSales]);

  const customerHistory = useMemo(() => {
    if (!selectedHistoryCustomer) return [];
    return safeSales.filter(s => s.customerId === selectedHistoryCustomer);
  }, [selectedHistoryCustomer, safeSales]);

  const salesChartConfig: ChartConfig = { total: { label: 'Sales', color: 'hsl(var(--chart-1))' } };

  if (isUserLoading) return <FullPageLoader />;

  return (
    <>
      <PageHeader title="Dashboard" />
      <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
      <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <QuickActions onNewSale={() => setIsSaleDialogOpen(true)} onNewPurchase={() => setIsPurchaseDialogOpen(true)} onAddProduct={() => setIsProductDialogOpen(true)} onAddCustomer={() => setIsCustomerDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} onNewStockEntry={() => setIsStockDialogOpen(true)} onNewEnquiry={() => setIsEnquiryDialogOpen(true)} onNewQuotation={() => setIsQuotationDialogOpen(true)} />
        <StatsCards stats={dynamicStats} />
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Recent Sales</CardTitle><CardDescription>Latest transactions.</CardDescription></CardHeader><CardContent><RecentSales sales={sales || []} /></CardContent></Card>
            <EventReminders customers={customers || []} vendors={vendors || []} />
        </div>
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div><CardTitle>Customer Sale History</CardTitle><CardDescription>Select a customer to view history.</CardDescription></div>
                    <div className="w-full max-w-sm"><Select value={selectedHistoryCustomer} onValueChange={setSelectedHistoryCustomer}><SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger><SelectContent>{safeCustomers.map(customer => (<SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>))}</SelectContent></Select></div>
                </div>
            </CardHeader>
            <CardContent>
                {selectedHistoryCustomer ? (
                    <DataTable columns={salesColumns({ 
                        onDelete: () => {}, 
                        products: safeProducts, 
                        customers: safeCustomers, 
                        onEdit: () => {}, 
                        onShare: (sale) => { 
                            if (!companyDetails) return; 
                            const text = generateShareText('Invoice', sale.invoiceSequence, sale.customerName, companyDetails.name, `${window.location.origin}/invoice/${sale.id}`); 
                            openShareDialog({title: `Invoice #${sale.invoiceSequence}`, text}); 
                        } 
                    })} data={customerHistory} />
                ) : (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg"><Users className="mx-auto h-12 w-12 opacity-20" /><p className="mt-4 text-xs font-medium uppercase tracking-widest">Select a customer</p></div>
                )}
            </CardContent>
        </Card>
        <GenericChart title="Sales Overview" description="Monthly sales trends." data={salesChartData} dataKeyX="name" dataKeysY={['total']} chartConfig={salesChartConfig} chartType="bar" yAxisFormatter={(v) => `₹${v / 1000}K`} categorical={true} />
      </div>
      <SaleDialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen} onSuccess={(sale) => setIsSaleDialogOpen(false)} />
      <PurchaseOrderDialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen} onSuccess={(po) => setIsPurchaseDialogOpen(false)} />
      <ProductDialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen} product={undefined} onSuccess={(p) => setIsProductDialogOpen(false)} />
      <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => setIsCustomerDialogOpen(false)} />
      <ExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} onSuccess={(e) => setIsExpenseDialogOpen(false)} />
      <StockDialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen} onSuccess={(s) => setIsStockDialogOpen(false)} />
      <EnquiryDialog open={isEnquiryDialogOpen} onOpenChange={setIsEnquiryDialogOpen} onSuccess={(e) => setIsEnquiryDialogOpen(false)} />
      <QuotationDialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen} onSuccess={(q) => setIsQuotationDialogOpen(false)} />
    </>
  );
}