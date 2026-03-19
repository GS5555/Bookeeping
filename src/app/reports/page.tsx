
'use client';
import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table';
import { 
    salesReportColumns, 
    expensesReportColumns, 
    inventoryReportColumns, 
    purchaseReportColumns, 
    gstReportColumns, 
    returnsReportColumns, 
    quotationsReportColumns, 
    enquiriesReportColumns 
} from './columns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileDown } from 'lucide-react';
import { addDays, format, startOfYear, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { exportToExcel, downloadGenericReportPdf } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, PurchaseOrder, Expense, InventoryItem, SaleReturn, Customer, Product, Quotation, Enquiry } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

type ReportType = 'sales' | 'purchases' | 'expenses' | 'inventory' | 'gst' | 'returns' | 'cashSales' | 'quotations' | 'enquiries';
const STORE_ID = 'store_main';

export default function ReportsPage() {
    const [tab, setTab] = useState<ReportType>('sales');
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfYear(new Date()),
        to: new Date(),
    });

    const firestore = useFirestore();

    const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
    const { data: sales } = useCollection<Sale>(salesRef);

    const expensesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'expenses') : null, [firestore]);
    const { data: expenses } = useCollection<Expense>(expensesRef);

    const poRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'purchaseOrders') : null, [firestore]);
    const { data: purchaseOrders } = useCollection<PurchaseOrder>(poRef);

    const returnsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'salesReturns') : null, [firestore]);
    const { data: returns } = useCollection<SaleReturn>(returnsRef);
    
    const quotationsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'quotations') : null, [firestore]);
    const { data: quotations } = useCollection<Quotation>(quotationsRef);
    
    const enquiriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'enquiries') : null, [firestore]);
    const { data: enquiries } = useCollection<Enquiry>(enquiriesRef);

    const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
    const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsRef);

    const filterByDate = (items: any[], dateKey: string) => {
        if (!items) return [];
        return items.filter(item => {
            const itemDate = new Date(item[dateKey]);
            if (!date?.from) return true;
            const from = startOfDay(date.from);
            const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
            return itemDate >= from && itemDate <= to;
        });
    }

    const reportData = useMemo(() => {
        const safeSales = filterByDate(sales || [], 'saleDate');
        const safeExpenses = filterByDate(expenses || [], 'date');
        const safePOs = filterByDate(purchaseOrders || [], 'orderDate');
        const safeReturns = filterByDate(returns || [], 'returnDate');
        const safeQuotes = filterByDate(quotations || [], 'date');
        const safeEnquiries = filterByDate(enquiries || [], 'date');

        // Merged Inventory logic
        const mergedInventory = (products || []).map(p => {
            const invItem = (inventory || []).find(i => i.productId === p.id);
            const totalStock = invItem?.stockBatches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
            return {
                ...p,
                quantity: totalStock,
                storeName: 'Main Store'
            };
        });

        return {
            sales: safeSales,
            cashSales: safeSales.filter(s => s.saleType === 'Cash'),
            gst: safeSales.filter(s => s.saleType === 'GST'),
            purchases: safePOs,
            expenses: safeExpenses,
            returns: safeReturns,
            inventory: mergedInventory,
            quotations: safeQuotes,
            enquiries: safeEnquiries
        };
    }, [sales, expenses, purchaseOrders, returns, quotations, enquiries, inventory, products, date]);

    const getFilename = (prefix: string) => {
        if (!date?.from || !date?.to) return prefix;
        return `${prefix}_${format(date.from, 'yyyy-MM-dd')}_to_${format(date.to, 'yyyy-MM-dd')}`;
    };

    const handleExportExcel = () => {
        const currentData = reportData[tab];
        if (!currentData || currentData.length === 0) {
            toast({ title: "Export Error", description: "No data available for the selected range.", variant: "destructive" });
            return;
        }
        exportToExcel(currentData, getFilename(`${tab}_report`));
    };

    const handleExportPdf = () => {
       const actionMap = {
            sales: () => downloadGenericReportPdf('Sales Report', [['Invoice #', 'Date', 'Customer', 'Type', 'Amount']], reportData.sales.map(s => [s.invoiceSequence, format(new Date(s.saleDate), 'dd/MM/yy'), s.customerName, s.saleType, `Rs.${s.totalAmount}`]), getFilename('sales_report')),
            gst: () => downloadGenericReportPdf('GST Sales Report', [['Invoice #', 'Date', 'Customer', 'Subtotal', 'Tax', 'Total']], reportData.gst.map(s => [s.invoiceSequence, format(new Date(s.saleDate), 'dd/MM/yy'), s.customerName, s.subTotal, s.gstAmount, s.totalAmount]), getFilename('gst_sales_report')),
            purchases: () => downloadGenericReportPdf('Purchases Report', [['PO #', 'Date', 'Vendor', 'Status', 'Total']], reportData.purchases.map(p => [p.purchaseOrderNumber, format(new Date(p.orderDate), 'dd/MM/yy'), p.vendorName, p.status, p.totalAmount]), getFilename('purchases_report')),
            inventory: () => downloadGenericReportPdf('Inventory Report', [['Product', 'SKU', 'Store', 'Stock']], reportData.inventory.map(i => [i.name, i.sku, i.storeName, i.quantity]), getFilename('inventory_report')),
       };
       if ((actionMap as any)[tab]) (actionMap as any)[tab]();
       else toast({ title: "PDF Export", description: "This report PDF export is coming soon." });
    };

  return (
    <>
      <PageHeader title="Reports & Analytics">
         <Button variant="outline" onClick={handleExportExcel} disabled={!reportData[tab]?.length}><Download className="mr-2 h-4 w-4" />Excel</Button>
         <Button variant="outline" onClick={handleExportPdf} disabled={!reportData[tab]?.length}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
      </PageHeader>
       <div className="flex flex-col gap-8">
            <Card className="border-2 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Global Date Filter</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">Filter all reports by transaction date.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full sm:w-[300px] justify-start text-left font-normal h-10 border-muted-foreground/50",!date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={(value) => setTab(value as ReportType)} className="w-full">
                <TabsList className="flex-wrap h-auto justify-start bg-transparent gap-2 p-0">
                    <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">All Sales</TabsTrigger>
                    <TabsTrigger value="gst" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">GST Sales</TabsTrigger>
                    <TabsTrigger value="returns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Returns</TabsTrigger>
                    <TabsTrigger value="purchases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Purchases</TabsTrigger>
                    <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Expenses</TabsTrigger>
                    <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Inventory</TabsTrigger>
                    <TabsTrigger value="quotations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Quotations</TabsTrigger>
                    <TabsTrigger value="enquiries" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Enquiries</TabsTrigger>
                </TabsList>
                
                <Card className="mt-6 border-2 shadow-sm min-w-0">
                  <CardContent className="p-0 sm:p-6 min-w-0 overflow-hidden">
                    <TabsContent value="sales" className="m-0"><DataTable columns={salesReportColumns} data={reportData.sales} /></TabsContent>
                    <TabsContent value="gst" className="m-0"><DataTable columns={gstReportColumns} data={reportData.gst} /></TabsContent>
                    <TabsContent value="returns" className="m-0"><DataTable columns={returnsReportColumns({ customers: [], stores: [], companyDetails: null })} data={reportData.returns} /></TabsContent>
                    <TabsContent value="purchases" className="m-0"><DataTable columns={purchaseReportColumns} data={reportData.purchases} /></TabsContent>
                    <TabsContent value="expenses" className="m-0"><DataTable columns={expensesReportColumns} data={reportData.expenses} /></TabsContent>
                    <TabsContent value="inventory" className="m-0"><DataTable columns={inventoryReportColumns} data={reportData.inventory} /></TabsContent>
                    <TabsContent value="quotations" className="m-0"><DataTable columns={quotationsReportColumns} data={reportData.quotations} /></TabsContent>
                    <TabsContent value="enquiries" className="m-0"><DataTable columns={enquiriesReportColumns} data={reportData.enquiries} /></TabsContent>
                  </CardContent>
                </Card>
            </Tabs>
       </div>
    </>
  );
}
