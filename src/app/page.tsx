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
import type { Sale, PurchaseOrder, Product, Customer, Vendor, Expense, InventoryItem, Quotation, Enquiry, Company } from '@/lib/types';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';

import { CustomerFinancials } from '@/app/sales/customer-financials';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EventReminders } from '@/components/dashboard/event-reminders';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { getMonth, format, subMonths, startOfMonth, endOfMonth, isWithinInterval, addDays } from 'date-fns';
import { DataTable } from '@/components/data-table';
import { salesColumns } from '@/app/sales/columns';
import { Users } from 'lucide-react';
import { EnquiryDialog } from '@/app/enquiries/enquiry-dialog';
import { QuotationDialog } from '@/app/quotations/quotation-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useRouter } from 'next/navigation';

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
  const { currentUser } = useCurrentUser();
  const router = useRouter();

  const salesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc')) : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);

  const poRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'purchaseOrders') : null, [firestore]);
  const { data: purchaseOrders } = useCollection<PurchaseOrder>(poRef);
  
  const expensesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'expenses') : null, [firestore]);
  const { data: expenses } = useCollection<Expense>(expensesRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const inventoryRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stores', STORE_ID, 'inventoryItems');
  }, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

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
    
    const purchasesThisMonth = (purchaseOrders || []).filter(p => new Date(p.orderDate) >= currentMonthStart);
    const purchasesLastMonth = (purchaseOrders || []).filter(p => isWithinInterval(new Date(p.orderDate), { start: lastMonthStart, end: lastMonthEnd }));

    const expensesThisMonth = (expenses || []).filter(e => new Date(e.expenseDate) >= currentMonthStart);
    const expensesLastMonth = (expenses || []).filter(e => isWithinInterval(new Date(e.expenseDate), { start: lastMonthStart, end: lastMonthEnd }));

    const totalSales = salesThisMonth.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalSalesLastMonth = salesLastMonth.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const totalPurchases = purchasesThisMonth.reduce((sum, po) => sum + po.totalAmount, 0);
    const totalPurchasesLastMonth = purchasesLastMonth.reduce((sum, po) => sum + po.totalAmount, 0);
    
    const totalExpenses = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpensesLastMonth = expensesLastMonth.reduce((sum, expense) => sum + expense.amount, 0);
    
    const calcPercentageChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    return { 
        totalSales, 
        totalPurchases, 
        totalExpenses, 
        salesChange: calcPercentageChange(totalSales, totalSalesLastMonth),
        purchasesChange: calcPercentageChange(totalPurchases, totalPurchasesLastMonth),
        expensesChange: calcPercentageChange(totalExpenses, totalExpensesLastMonth)
    };
  }, [sales, purchaseOrders, expenses]);

  const salesChartData = useMemo(() => {
    const monthlySales: Record<string, number> = {};
    safeSales.forEach(sale => {
      const month = format(new Date(sale.saleDate), 'MMM');
      monthlySales[month] = (monthlySales[month] || 0) + (sale.total || 0);
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthOrder.map(month => ({ name: month, total: monthlySales[month] || 0 }));
    
  }, [sales]);

  const customerHistory = useMemo(() => {
    if (!selectedHistoryCustomer) return [];
    return safeSales.filter(s => s.customerId === selectedHistoryCustomer);
  }, [selectedHistoryCustomer, safeSales]);


  const salesChartConfig: ChartConfig = {
    total: {
      label: 'Sales',
      color: 'hsl(var(--chart-1))',
    },
  };
  
    const handleSaleSuccess = async (sale: Sale) => {
        if (!firestore || !currentUser) {
            toast({ title: "Error", description: "System is initializing. Please wait.", variant: "destructive" });
            return;
        }

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
                
                const finalSaleData = JSON.parse(JSON.stringify({
                    ...sale,
                    id: saleDocRef.id,
                    invoiceSequence,
                    dueDate: addDays(new Date(sale.saleDate), 30).toISOString(),
                    createdBy: currentUser.id,
                    createdByName: currentUser.displayName,
                }));

                transaction.set(saleDocRef, finalSaleData);
                transaction.update(companyRef, { [numberField]: newNumber });
            });
            toast({ title: "Success!", description: `Invoice created successfully!` });
            setIsSaleDialogOpen(false);
        } catch (error) {
            console.error("Sale transaction failed:", error);
            toast({ 
                title: "Sale Creation Failed", 
                description: (error as Error).message || "An unexpected error occurred while saving the sale.", 
                variant: "destructive" 
            });
        }
  };

  const handlePurchaseSuccess = async (po: PurchaseOrder) => {
    if (!firestore || !currentUser) return;
    try {
      const docRef = doc(collection(firestore, 'stores', STORE_ID, 'purchaseOrders'));
      
      const finalPoData = JSON.parse(JSON.stringify({ 
          ...po, 
          id: docRef.id,
          createdBy: currentUser.id,
          createdByName: currentUser.displayName
      }));

      await setDoc(docRef, finalPoData);
      setIsPurchaseDialogOpen(false);
      toast({ title: "Success!", description: `Purchase Order #${po.purchaseOrderNumber} created.` });
    } catch(e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to create purchase order.", variant: "destructive" });
    }
  };

  const handleProductSuccess = async (product: Product) => {
    if(!firestore) return;
    try {
      const docRef = doc(firestore, 'stores', STORE_ID, 'products', product.id);
      await setDoc(docRef, product, { merge: true });
      setIsProductDialogOpen(false);
      toast({ title: "Success!", description: `Product ${product.name} created.` });
    } catch(e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    }
  };

  const handleCustomerSuccess = async (customer: Customer) => {
     if(!firestore) return;
     try {
        const docRef = doc(firestore, 'stores', STORE_ID, 'customers', customer.id);
        await setDoc(docRef, customer, { merge: true });
        setIsCustomerDialogOpen(false);
        toast({ title: "Success!", description: `Customer ${customer.name} created.` });
     } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to save customer", variant: "destructive" });
     }
  };

  const handleExpenseSuccess = async (expense: Expense) => {
    if(!firestore) return;
    try {
        const docRef = doc(firestore, 'stores', STORE_ID, 'expenses', expense.id);
        await setDoc(docRef, expense, { merge: true });
        setIsExpenseDialogOpen(false);
        toast({ title: "Success!", description: `Expense recorded.` });
    } catch(e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to save expense", variant: "destructive" });
    }
  };

  const handleStockUpdateSuccess = async ({ productId, storeId, quantity }: StockFormValues) => {
        if (!firestore) return;
        try {
            const inventoryCollectionRef = collection(firestore, 'stores', storeId, 'inventoryItems');
            const q = query(inventoryCollectionRef, where("productId", "==", productId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const inventoryDoc = querySnapshot.docs[0];
                const newQuantity = inventoryDoc.data().quantity + quantity;
                await updateDoc(inventoryDoc.ref, { 
                    quantity: newQuantity,
                    lastStockUpdate: new Date().toISOString()
                });
                toast({ title: "Stock Updated!", description: `Stock adjusted by ${quantity}.` });
            } else {
                 const productDetails = products?.find(p => p.id === productId);
                 if(productDetails) {
                    const newInvDocRef = doc(inventoryCollectionRef);
                    await setDoc(newInvDocRef, {
                        ...productDetails,
                        id: newInvDocRef.id,
                        productId: productDetails.id,
                        storeId: storeId,
                        quantity: quantity,
                        locationComment: 'N/A',
                        lastStockUpdate: new Date().toISOString(),
                    });
                    toast({ title: "Stock Entry Created!", description: `${quantity} units added.` });
                }
            }
        } catch(e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update stock.", variant: "destructive" });
        }
        setIsStockDialogOpen(false);
    }

  const handleQuotationSuccess = async (quotation: Quotation) => {
    if (!firestore || !currentUser) return;
    try {
        const quotationDocRef = doc(firestore, 'stores', STORE_ID, 'quotations', quotation.id);
        const finalQuotation: Quotation = { ...quotation, createdBy: currentUser.id };
        await setDoc(quotationDocRef, finalQuotation, { merge: true });
        setIsQuotationDialogOpen(false);
        toast({ title: 'Success!', description: 'Quotation saved successfully.' });
    } catch (error) {
        console.error("Error saving quotation:", error);
        toast({ title: 'Error', description: 'Could not save quotation.', variant: "destructive" });
    }
  };

  const handleEnquirySuccess = async (enquiry: Enquiry) => {
      if (!firestore) return;
      try {
          const enquiryDocRef = doc(firestore, 'stores', STORE_ID, 'enquiries', enquiry.id);
          await setDoc(enquiryDocRef, enquiry, { merge: true });
          setIsEnquiryDialogOpen(false);
          toast({ title: "Success!", description: "Enquiry saved successfully." });
      } catch (error) {
          console.error("Error saving enquiry:", error);
          toast({ title: "Error", description: "Could not save enquiry.", variant: "destructive" });
      }
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <QuickActions
            onNewSale={() => setIsSaleDialogOpen(true)}
            onNewPurchase={() => setIsPurchaseDialogOpen(true)}
            onAddProduct={() => setIsProductDialogOpen(true)}
            onAddCustomer={() => setIsCustomerDialogOpen(true)}
            onAddExpense={() => setIsExpenseDialogOpen(true)}
            onNewStockEntry={() => setIsStockDialogOpen(true)}
            onNewEnquiry={() => setIsEnquiryDialogOpen(true)}
            onNewQuotation={() => setIsQuotationDialogOpen(true)}
        />
        
        <StatsCards stats={dynamicStats} />

        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>
                  Your most recent transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales sales={sales || []} />
              </CardContent>
            </Card>
            <EventReminders customers={customers || []} vendors={vendors || []} />
        </div>
        
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Customer Sale History</CardTitle>
                        <CardDescription>Select a customer to view history.</CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                         <Select value={selectedHistoryCustomer} onValueChange={setSelectedHistoryCustomer}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select customer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {safeCustomers.map(customer => (
                                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {selectedHistoryCustomer ? (
                    <DataTable columns={salesColumns({ onDelete: () => {}, products: safeProducts, customers: safeCustomers, onEdit: () => {} })} data={customerHistory} />
                ) : (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        <Users className="mx-auto h-12 w-12 opacity-20" />
                        <p className="mt-4 text-xs font-medium uppercase tracking-widest">Select a customer to see history</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <GenericChart
          title="Sales Overview"
          description="Monthly sales trends."
          data={salesChartData}
          dataKeyX="name"
          dataKeysY={['total']}
          chartConfig={salesChartConfig}
          chartType="bar"
          yAxisFormatter={(value) => `₹${value / 1000}K`}
          categorical={true}
        />
      </div>
      
      <SaleDialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen} onSuccess={handleSaleSuccess} />
      <PurchaseOrderDialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen} onSuccess={handlePurchaseSuccess} />
      <ProductDialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen} product={undefined} onSuccess={handleProductSuccess} />
      <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={handleCustomerSuccess} />
      <ExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} onSuccess={handleExpenseSuccess} />
      <StockDialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen} onSuccess={handleStockUpdateSuccess} />
      <EnquiryDialog open={isEnquiryDialogOpen} onOpenChange={setIsEnquiryDialogOpen} onSuccess={handleEnquirySuccess} />
      <QuotationDialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen} onSuccess={handleQuotationSuccess} />
    </>
  );
}
