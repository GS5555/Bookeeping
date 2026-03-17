
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table';
import { salesReportColumns, expensesReportColumns, inventoryReportColumns, purchaseReportColumns, gstReportColumns, returnsReportColumns, stockTransferColumns, priceHistoryReportColumns, quotationsReportColumns, enquiriesReportColumns } from './columns';
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
import { CalendarIcon, Download, FileDown, Users } from 'lucide-react';
import { addDays, format, startOfMonth, startOfYear, eachMonthOfInterval } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { exportToExcel, downloadGenericReportPdf, exportFullBackup, downloadPurchaseOrder } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerFinancials } from '@/app/sales/customer-financials';
import { VendorFinancials } from './vendor-financials';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, PurchaseOrder, Expense, InventoryItem, SaleReturn, StockTransfer, Customer, Vendor, Product, Store, Company, Category, SubCategory, Quotation, Enquiry } from '@/lib/types';
import { mockStockTransfers } from '@/lib/mock-data';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';

type ReportType = 'sales' | 'purchases' | 'expenses' | 'inventory' | 'gst' | 'returns' | 'stockTransfers' | 'cashSales' | 'priceHistory' | 'quotations' | 'enquiries';
const STORE_ID = 'store_main';

export default function ReportsPage() {
    const [tab, setTab] = useState<ReportType>('sales');
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfYear(new Date()),
        to: new Date(),
    });
    const [vendorFilter, setVendorFilter] = useState<string>('all');
    const [salesStatusFilter, setSalesStatusFilter] = useState('all');

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

    const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersRef);
    
    const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
    const { data: vendors } = useCollection<Vendor>(vendorsRef);

    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsRef);

    const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
    const { data: stores } = useCollection<Store>(storesRef);

    const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'companies') : null, [firestore]);
    const { data: companies } = useCollection<Company>(companiesRef);
    
    const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesRef);

    const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
    const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

    const safeSales = sales || [];
    const safeExpenses = expenses || [];
    const safePurchaseOrders = purchaseOrders || [];
    const safeReturns = returns || [];
    const safeQuotations = quotations || [];
    const safeEnquiries = enquiries || [];
    const safeCustomers = customers || [];
    const safeVendors = vendors || [];
    const safeInventory = inventory || [];
    const mainCompany = useMemo(() => companies?.find(c => c.id === 'main_company'), [companies]);

    const filterByDate = (items: any[], dateKey: string) => {
        if (!items) return [];
        return items.filter(item => {
            const itemDate = new Date(item[dateKey]);
            if (!date?.from || !date?.to) return true;
            return itemDate >= date.from && itemDate <= addDays(date.to, 1);
        });
    }

    const getFilename = (prefix: string) => {
        if (!date?.from || !date?.to) return prefix;
        return `${prefix}_${format(date.from, 'yyyy-MM-dd')}_to_${format(date.to, 'yyyy-MM-dd')}`;
    };

    const filteredSales = useMemo(() => {
        let salesToFilter = filterByDate(safeSales, 'saleDate');
        if (salesStatusFilter !== 'all') {
            salesToFilter = salesToFilter.filter(s => s.invoiceStatus === salesStatusFilter);
        }
        return salesToFilter;
    }, [safeSales, date, salesStatusFilter]);

    const enrichedSales = useMemo(() => {
        return filteredSales.map(s => {
            const customer = safeCustomers.find(c => c.id === s.customerId);
            const firstItem = s.items?.[0];
            const category = categories?.find(c => c.id === firstItem?.categoryId);
            const subCategory = subCategories?.find(sc => sc.id === firstItem?.subCategoryId);
            return {
                ...s,
                storeName: 'Main Store',
                referenceName: customer?.referenceName,
                referenceContact: customer?.referenceContact,
                categoryName: category?.name || 'N/A',
                subCategoryName: subCategory?.name || 'N/A',
            };
        });
    }, [filteredSales, safeCustomers, categories, subCategories]);

    const handleExportExcel = () => {
        const dataMap: Record<ReportType, any[]> = {
            sales: enrichedSales,
            cashSales: enrichedSales.filter(s => s.saleType === 'Cash'),
            expenses: filterByDate(safeExpenses, 'date'),
            inventory: safeInventory,
            purchases: filterByDate(safePurchaseOrders, 'orderDate'),
            gst: enrichedSales.filter(s => s.saleType === 'GST'),
            returns: filterByDate(safeReturns, 'returnDate'),
            stockTransfers: filterByDate(mockStockTransfers, 'date'),
            priceHistory: [],
            quotations: filterByDate(safeQuotations, 'date'),
            enquiries: filterByDate(safeEnquiries, 'date'),
        };
        exportToExcel(dataMap[tab], getFilename(`${tab}_report`));
    };

    const handleExportPdf = () => {
       const actionMap = {
            sales: () => downloadGenericReportPdf('Sales Report', [['Invoice #', 'Date', 'Customer', 'Type', 'Amount']], enrichedSales.map(s => [s.invoiceSequence, format(new Date(s.saleDate), 'dd/MM/yy'), s.customerName, s.saleType, `Rs.${s.totalAmount}`]), getFilename('sales_report')),
            // Add other PDF actions as needed following the same filename pattern
       };
       if ((actionMap as any)[tab]) (actionMap as any)[tab]();
       else toast({ title: "PDF Export", description: "This report PDF export is being refined." });
    };

    const chartConfig: ChartConfig = { total: { label: 'Amount', color: 'hsl(var(--chart-1))' } };

  return (
    <>
      <PageHeader title="Reports & Analytics">
         <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Export Excel</Button>
         <Button variant="outline" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4" />Export PDF</Button>
      </PageHeader>
       <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Global Filters</CardTitle>
                    <CardDescription>Select a date range for all report calculations.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row gap-4 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full lg:w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={(value) => setTab(value as ReportType)}>
                <TabsList className="flex-wrap h-auto justify-start">
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="gst">GST Sales</TabsTrigger>
                    <TabsTrigger value="returns">Returns</TabsTrigger>
                    <TabsTrigger value="purchases">Purchases</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <TabsContent value="sales">
                        <DataTable columns={salesReportColumns} data={enrichedSales} />
                    </TabsContent>
                    {/* Other tab contents... */}
                  </CardContent>
                </Card>
            </Tabs>
       </div>
    </>
  );
}

    