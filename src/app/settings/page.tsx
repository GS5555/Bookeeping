
'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Building2, Cog, UserCog, HardDrive, Database } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns, subCategoryColumns, courierColumns, basicColumns } from './columns';
import { useState } from 'react';
import { Category, SubCategory, Brand, HsnCode, Color, Courier, Company, ExpenseType, Warranty, HandPreference, EnquiryStatus, CustomerType, VendorType, EnquiryType, EnquirySource, FollowUpType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { SettingDialog } from './setting-dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { exportFullBackup } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettingsForm } from './company-settings-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';

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
  const warrantiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'warranties') : null, [firestore]);
  const { data: warranties } = useCollection<Warranty>(warrantiesRef);
  const handPreferencesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'handPreferences') : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);
  const enquiryStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'enquiryStatuses') : null, [firestore]);
  const { data: enquiryStatuses } = useCollection<EnquiryStatus>(enquiryStatusesRef);

  const [dialogState, setDialogState] = useState<{ open: boolean; itemType: ItemType | null; item?: Item; }>({ open: false, itemType: null, item: undefined });
  const [accordionValue, setAccordionValue] = useState<string>("company-profile");

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
    <div className="flex flex-col gap-6 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="Control Center">
        <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase tracking-widest text-[10px]">
            <Link href="/users">
                <UserCog className="mr-2 h-4 w-4" /> Manage Users
            </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportFullBackup({}, 'backup')} className="h-9 font-black uppercase tracking-widest text-[10px]">
            <Download className="mr-2 h-4 w-4" /> System Backup
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex-wrap h-auto justify-start bg-muted/20 p-1 rounded-xl mb-8 gap-1">
            <TabsTrigger value="company" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background">
                <Building2 className="mr-2 h-4 w-4" /> Company
            </TabsTrigger>
            <TabsTrigger value="global" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background">
                <Cog className="mr-2 h-4 w-4" /> Master Data
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background">
                <HardDrive className="mr-2 h-4 w-4" /> Storage
            </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="w-full">
                <AccordionItem value="company-profile" className="border-2 rounded-xl shadow-sm bg-card overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-muted/5">
                        <div className="flex flex-col items-start text-left gap-1">
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Business Profile</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Manage your store's branding, logo, and legal terms.</CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 py-8 border-t">
                        <CompanySettingsForm onSaveSuccess={() => setAccordionValue("")} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
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
                { title: 'Couriers', type: 'Courier', data: couriers },
                { title: 'Warranties', type: 'Warranty', data: warranties },
                { title: 'Hand Preferences', type: 'Hand Preference', data: handPreferences },
                { title: 'Enquiry Statuses', type: 'Enquiry Status', data: enquiryStatuses },
                ].map((sec) => (
                <Card key={sec.title} className="min-w-0 border-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest">{sec.title}</CardTitle>
                    <Button size="sm" onClick={() => handleOpenDialog(sec.type as ItemType)} className="h-8 shrink-0 font-black uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-3 w-3" /> Add</Button>
                    </CardHeader>
                    <CardContent className="pt-4 overflow-hidden px-0">
                    <DataTable 
                        columns={
                            sec.type === 'Sub-Category' ? subCategoryColumns(categories || [])({ onEdit: (i) => handleOpenDialog('Sub-Category', i), onDelete: (id) => handleDelete('Sub-Category', id) }) : 
                            sec.type === 'Courier' ? courierColumns({ onEdit: (i) => handleOpenDialog('Courier', i as Courier), onDelete: (id) => handleDelete('Courier', id) }) : 
                            sec.type === 'Category' ? columns({ onEdit: (i) => handleOpenDialog('Category', i), onDelete: (id) => handleDelete('Category', id) }) :
                            basicColumns({ onEdit: (i) => handleOpenDialog(sec.type as ItemType, i), onDelete: (id) => handleDelete(sec.type as ItemType, id) })
                        } 
                        data={sec.data || []} 
                    />
                    </CardContent>
                </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="diagnostics">
            <Card className="border-2 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Database className="h-6 w-6 text-primary" />
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">System Storage Diagnostics</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase">Monitor database footprint and storage optimization recommendations.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button asChild className="font-black uppercase tracking-widest">
                        <Link href="/settings/storage-analytics">Open Storage Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
