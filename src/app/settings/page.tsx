'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, HardDrive, Database, BarChart3, Building2, Cog } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettingsForm } from './company-settings-form';

type Item = Category | SubCategory | Brand | HsnCode | Color | Courier | Company | ExpenseType | Warranty | HandPreference | EnquiryStatus | CustomerType | VendorType | EnquiryType | EnquirySource | FollowUpType;
type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type' | 'Enquiry Type' | 'Enquiry Source' | 'Follow-up Type';

const STORE_ID = 'store_main';

export default function SettingsPage() {
  const firestore = useFirestore();
  
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
      <PageHeader title="Control Center">
        <Button variant="outline" size="sm" onClick={() => exportFullBackup({}, 'backup')} className="h-9 font-black uppercase tracking-widest text-[10px]">
            <Download className="mr-2 h-4 w-4" /> System Backup
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid grid-cols-2 w-full sm:w-[400px] mb-8">
            <TabsTrigger value="company" className="text-xs font-black uppercase tracking-widest">
                <Building2 className="mr-2 h-4 w-4" /> Company
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs font-black uppercase tracking-widest">
                <Cog className="mr-2 h-4 w-4" /> Global Data
            </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
            <Card className="border-2 shadow-sm">
                <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Business Profile</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase">Configure your store's branding and document legal terms.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <CompanySettingsForm />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="global">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 min-w-0 w-full">
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
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-widest">{sec.title}</CardTitle>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
