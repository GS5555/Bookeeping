'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CircleDollarSign, PlusCircle, Undo2, BarChart3, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/data-table';
import { salesColumns } from './columns';
import { useState, useMemo } from 'react';
import { Sale, SaleReturn, Customer, Product, Company, User, Payment } from '@/lib/types';
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

export default function SalesPage() {
  const firestore = useFirestore();
  const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();
  const { currentUser } = useCurrentUser();

  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string>('');
  const [selectedPendingCustomer, setSelectedPendingCustomer] = useState<string>('');

  const salesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'sales'), orderBy('saleDate', 'desc')) : null, [firestore]);
  const { data: salesData } = useCollection<Sale>(salesRef);
  const returnsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'salesReturns'), orderBy('returnDate', 'desc')) : null, [firestore]);
  const { data: returnsData } = useCollection<SaleReturn>(returnsRef);
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customersData } = useCollection<Customer>(customersRef);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: productsData } = useCollection<Product>(productsRef);
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

  const handleSaleSuccess = async (sale: Sale) => {
    if (!firestore || !currentUser) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const companyRef = doc(firestore, 'settings', 'global', 'companies', 'main_company');
            const companyDoc = await transaction.get(companyRef);
            let companyData = companyDoc.exists() ? companyDoc.data() : { lastInvoiceNumber: 0, lastBillNumber: 0 };
            const isGst = sale.saleType === 'GST';
            const numberField = isGst ? 'lastInvoiceNumber' : 'lastBillNumber';
            const prefix = isGst ? 'INV' : 'BILL';
            const newNumber = (companyData[numberField] || 0) + 1;
            const seq = `${prefix}-${new Date().getFullYear()}-${String(newNumber).padStart(5, '0')}`;
            const saleDocRef = doc(collection(firestore, 'stores', STORE_ID, 'sales'));
            transaction.set(saleDocRef, { ...sale, id: saleDocRef.id, invoiceSequence: seq, createdBy: currentUser.id, createdByName: currentUser.displayName });
            transaction.update(companyRef, { [numberField]: newNumber });
        });
        toast({ title: "Invoice Created" });
        setIsSaleDialogOpen(false);
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const summaryData: SummaryCardData[] = useMemo(() => {
    const rev = safeSales.reduce((a, s) => a + s.totalAmount, 0);
    const ret = safeReturns.reduce((a, r) => a + r.totalRefundAmount, 0);
    return [
        { title: "Total Revenue", value: isMounted ? `₹${rev.toLocaleString('en-IN')}` : '...', icon: CircleDollarSign },
        { title: "Total Returns", value: isMounted ? `₹${ret.toLocaleString('en-IN')}` : '...', icon: Undo2 },
        { title: "Net Revenue", value: isMounted ? `₹${(rev - ret).toLocaleString('en-IN')}` : '...', icon: CircleDollarSign },
        { title: "Avg Sale", value: isMounted ? `₹${(safeSales.length ? rev/safeSales.length : 0).toLocaleString('en-IN', {maximumFractionDigits:0})}` : '...', icon: ReceiptText },
    ];
  }, [safeSales, safeReturns, isMounted]);

  const comparisonData = useMemo(() => {
    const now = new Date();
    const cur = safeSales.filter(s => new Date(s.saleDate) >= startOfMonth(now)).reduce((a,s) => a + s.totalAmount, 0);
    const prev = safeSales.filter(s => isWithinInterval(new Date(s.saleDate), { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) })).reduce((a,s) => a + s.totalAmount, 0);
    return [ { name: format(subMonths(now, 1), 'MMM'), total: prev }, { name: format(now, 'MMM'), total: cur } ];
  }, [safeSales]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="Sales & Returns">
        <Button variant="outline" size="sm" onClick={() => setIsPaymentDialogOpen(true)}><ReceiptText className="mr-2 h-4 w-4" /> Pay</Button>
        <Button variant="outline" size="sm" onClick={() => setIsReturnDialogOpen(true)}><Undo2 className="mr-2 h-4 w-4" /> Return</Button>
        <Button size="sm" onClick={() => setIsSaleDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> New Sale</Button>
      </PageHeader>
      
      <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
      <PageSummary cards={summaryData} />

      <div className="grid grid-cols-1 gap-6 sm:gap-8 min-w-0 w-full">
          <Card className="min-w-0 border-2 shadow-sm">
              <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" /> Monthly Delta</CardTitle></CardHeader>
              <CardContent className="pt-6 min-w-0 h-[300px]">
                  <GenericChart title="" description="" data={comparisonData} dataKeyX="name" dataKeysY={['total']} chartConfig={{total:{label:'Amount', color:'hsl(var(--chart-1))'}}} chartType="bar" categorical={true} yAxisFormatter={(v) => `₹${v.toLocaleString()}`} />
              </CardContent>
          </Card>

          <Tabs defaultValue="gst" className="w-full min-w-0">
              <Card className="min-w-0 border-2 shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b pb-2 sm:pb-0">
                      <CardTitle className="text-xl">Registry</CardTitle>
                      <TabsList className="grid grid-cols-3 w-full sm:w-[240px] h-9 mb-2 sm:mb-0"><TabsTrigger value="gst" className="text-[10px] font-bold">GST</TabsTrigger><TabsTrigger value="cash" className="text-[10px] font-bold">CASH</TabsTrigger><TabsTrigger value="returns" className="text-[10px] font-bold">RET</TabsTrigger></TabsList>
                  </CardHeader>
                  <CardContent className="pt-4 min-w-0 overflow-x-auto">
                      <TabsContent value="gst" className="m-0"><DataTable columns={salesColumns({ onDelete: (id) => deleteDoc(doc(firestore!, 'stores', STORE_ID, 'sales', id)), onEdit: (s) => { setEditingSale(s); setIsSaleDialogOpen(true); }, products: safeProducts, customers: safeCustomers, users: safeUsers })} data={safeSales.filter(s => s.saleType === 'GST')} /></TabsContent>
                      <TabsContent value="cash" className="m-0"><DataTable columns={salesColumns({ onDelete: (id) => deleteDoc(doc(firestore!, 'stores', STORE_ID, 'sales', id)), onEdit: (s) => { setEditingSale(s); setIsSaleDialogOpen(true); }, products: safeProducts, customers: safeCustomers, users: safeUsers })} data={safeSales.filter(s => s.saleType === 'Cash')} /></TabsContent>
                      <TabsContent value="returns" className="m-0"><DataTable columns={returnColumns({customers: safeCustomers, stores: []})} data={safeReturns} /></TabsContent>
                  </CardContent>
              </Card>
          </Tabs>

          <CustomerLedger sales={safeSales} returns={safeReturns} customers={safeCustomers} />
          
          <Card className="min-w-0 border-2 shadow-sm">
              <CardHeader className="border-b pb-4"><CardTitle>Accounts Receivable</CardTitle></CardHeader>
              <CardContent className="pt-6 min-w-0 overflow-x-auto">
                  <CustomerFinancials sales={safeSales} customers={safeCustomers} companyDetails={companyDetails || null} />
              </CardContent>
          </Card>
      </div>

      <SaleDialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen} sale={editingSale} onSuccess={handleSaleSuccess} />
      <ReturnDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen} onSuccess={(r) => { firestore && setDoc(doc(collection(firestore, 'stores', STORE_ID, 'salesReturns')), r).then(() => setIsReturnDialogOpen(false)) }} />
      <PaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} onSuccess={() => setIsPaymentDialogOpen(false)} />
    </div>
  );
}
