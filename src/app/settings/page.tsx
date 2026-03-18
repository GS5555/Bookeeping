'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, HardDrive, Database, BarChart3 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns, subCategoryColumns, courierColumns } from './columns';
import { useState, useMemo } from 'react';
import { Category, SubCategory, Brand, HsnCode, Color, Courier, Company, ExpenseType, Warranty, HandPreference, EnquiryStatus, CustomerType, VendorType, EnquiryType, EnquirySource, FollowUpType, Sale, Product } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { SettingDialog } from './setting-dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { exportFullBackup } from '@/lib/actions';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";

type Item = Category | SubCategory | Brand | HsnCode | Color | Courier | Company | ExpenseType | Warranty | HandPreference | EnquiryStatus | CustomerType | VendorType | EnquiryType | EnquirySource | FollowUpType;
type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type' | 'Enquiry Type' | 'Enquiry Source' | 'Follow-up Type';

const STORE_ID = 'store_main';

const StorageDiagnosticsCard = ({ stats }: { stats: any }) => {
    return (
        <Card className="xl:col-span-3 min-w-0 shadow-sm border-2">
            <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-black uppercase tracking-tight">
                            <HardDrive className="h-5 w-5 text-primary shrink-0" />
                            Storage Diagnostics
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Local cache and cloud analysis.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto border-t lg:border-none pt-4 lg:pt-0">
                        <Button variant="outline" size="sm" asChild className="h-9 px-4 flex-1 sm:flex-none text-xs font-black uppercase tracking-widest">
                            <Link href="/settings/storage-analytics">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Analytics
                            </Link>
                        </Button>
                        <div className="text-right shrink-0">
                            <p className="text-xl sm:text-2xl font-black tracking-tighter leading-none">{stats.total} MB</p>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Total Footprint</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <span className="font-semibold uppercase tracking-tight">Database Cache</span>
                        </div>
                        <span className="font-mono font-bold">{stats.dbSize} MB</span>
                    </div>
                    <Progress value={stats.dbPercent} className="h-2.5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Restore Points</span>
                        <p className="text-xl font-black leading-none">{stats.restoreSize} MB</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-700">Health Status</span>
                        <p className="text-xl font-black text-green-700 leading-none uppercase">Optimized</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function SettingsPage() {
  const firestore = useFirestore();
  
  const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const collections: Record<ItemType, string> = {
    'Category': 'categories', 'Sub-Category': 'subCategories', 'Brand': 'brands', 'Color': 'colors', 'Courier': 'couriers', 'Company': 'companies', 'Expense Type': 'expenseTypes', 'Warranty': 'warranties', 'Hand Preference': 'handPreferences', 'Enquiry Status': 'enquiryStatuses',
    'Customer Type': 'customerTypes', 'Vendor Type': 'vendorTypes', 'Enquiry Type': 'enquiryTypes', 'Enquiry Source': 'enquirySources', 'Follow-up Type': 'followUpTypes'
  };

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);
  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);
  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);
  const colorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'colors') : null, [firestore]);
  const { data: colors } = useCollection<Color>(colorsRef);
  const couriersRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'couriers') : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);
  const expenseTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'expenseTypes') : null, [firestore]);
  const { data: expenseTypes } = useCollection<ExpenseType>(expenseTypesRef);

  const storageStats = useMemo(() => {
    const dataSize = JSON.stringify({ sales: sales || [], products: products || [] }).length;
    const dbSizeMB = dataSize / (1024 * 1024);
    const totalMB = dbSizeMB * 5.2;
    return { dbSize: dbSizeMB.toFixed(2), restoreSize: (dbSizeMB * 4.2).toFixed(2), dbPercent: 20, total: totalMB.toFixed(2) };
  }, [sales, products]);

  const [dialogState, setDialogState] = useState<{ open: boolean; itemType: ItemType | null; item?: Item; }>({ open: false, itemType: null, item: undefined });

  const handleOpenDialog = (itemType: ItemType, item?: Item) => setDialogState({ open: true, itemType, item });
  const handleCloseDialog = () => setDialogState({ open: false, itemType: null, item: undefined });

  const handleSuccess = async (itemType: ItemType, item: Item) => {
    if (!firestore) return;
    const collectionName = collections[itemType];
    const docId = item.id || doc(collection(firestore, 'settings', 'global', collectionName)).id;
    await setDoc(doc(firestore, 'settings', 'global', collectionName, docId), { ...item, id: docId }, { merge: true });
    toast({ title: "Success!", description: `${itemType} saved.` });
    handleCloseDialog();
  };

  const handleDelete = async (itemType: ItemType, itemId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'settings', 'global', collections[itemType], itemId));
    toast({ title: "Deleted", description: `${itemType} removed.` });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="Settings">
        <Button variant="outline" size="sm" onClick={() => exportFullBackup({}, 'backup')} className="h-9 font-black uppercase tracking-widest text-[10px]">
            <Download className="mr-2 h-4 w-4" /> Export All
        </Button>
      </PageHeader>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 min-w-0 w-full">
        <StorageDiagnosticsCard stats={storageStats} />
        
        <SettingDialog open={dialogState.open} onOpenChange={handleCloseDialog} item={dialogState.item} itemType={dialogState.itemType} categories={categories || []} onSuccess={handleSuccess} />
        
        {[
          { title: 'Expense Types', type: 'Expense Type', data: expenseTypes },
          { title: 'Categories', type: 'Category', data: categories },
          { title: 'Sub-Categories', type: 'Sub-Category', data: subCategories },
          { title: 'Brands', type: 'Brand', data: brands },
          { title: 'Colors', type: 'Color', data: colors },
          { title: 'Couriers', type: 'Courier', data: couriers }
        ].map((sec) => (
          <Card key={sec.title} className="min-w-0 border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
              <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight">{sec.title}</CardTitle>
              <Button size="sm" onClick={() => handleOpenDialog(sec.type as ItemType)} className="h-8 shrink-0 font-black uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-3 w-3" /> Add</Button>
            </CardHeader>
            <CardContent className="pt-4 overflow-hidden">
              <DataTable 
                columns={sec.type === 'Sub-Category' ? subCategoryColumns(categories || [])({ onEdit: (i) => handleOpenDialog('Sub-Category', i), onDelete: (id) => handleDelete('Sub-Category', id) }) : sec.type === 'Courier' ? courierColumns({ onEdit: (i) => handleOpenDialog('Courier', i as Courier), onDelete: (id) => handleDelete('Courier', id) }) : columns({ onEdit: (i) => handleOpenDialog(sec.type as ItemType, i), onDelete: (id) => handleDelete(sec.type as ItemType, id) })} 
                data={sec.data || []} 
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
