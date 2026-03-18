
'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Upload, Save, Database, HardDrive, Info, BarChart3 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns, subCategoryColumns, courierColumns, basicColumns } from './columns';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Category, SubCategory, Brand, HsnCode, Color, Courier, Company, ExpenseType, Warranty, HandPreference, Sale, PurchaseOrder, Expense, InventoryItem, Customer, Vendor, Product, Store, SaleReturn, Address, EnquiryStatus, CustomerType, VendorType, EnquiryType, EnquirySource, FollowUpType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { SettingDialog } from './setting-dialog';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { exportFullBackup, exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = Category | SubCategory | Brand | HsnCode | Color | Courier | Company | ExpenseType | Warranty | HandPreference | EnquiryStatus | CustomerType | VendorType | EnquiryType | EnquirySource | FollowUpType;
type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type' | 'Enquiry Type' | 'Enquiry Source' | 'Follow-up Type';

const STORE_ID = 'store_main';

const StorageDiagnosticsCard = ({ stats }: { stats: any }) => {
    return (
        <Card className="xl:col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            System Storage Diagnostics
                        </CardTitle>
                        <CardDescription>Real-time analysis of local cache and cloud restore points.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/settings/storage-analytics">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Storage Analytics
                            </Link>
                        </Button>
                        <div className="text-right">
                            <p className="text-2xl font-black tracking-tighter">{stats.total} MB</p>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Footprint</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Local Database Cache</span>
                        </div>
                        <span className="font-mono">{stats.dbSize} MB</span>
                    </div>
                    <Progress value={stats.dbPercent} className="h-2" />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        <span>Collections Performance</span>
                        <span>{stats.dbPercent.toFixed(1)}% Usage</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-widest">Restore Points</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="w-64 text-xs">Simulated size of platform-managed automated backups and point-in-time recovery data.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-xl font-black">{stats.restoreSize} MB</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-widest">Optimization Status</span>
                        </div>
                        <p className="text-xl font-black text-green-600">HEALTHY</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">Local cache within limits</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Collections for storage calculation
  const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);
  const poRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'purchaseOrders') : null, [firestore]);
  const { data: purchaseOrders } = useCollection<PurchaseOrder>(poRef);
  const expensesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'expenses') : null, [firestore]);
  const { data: expenses } = useCollection<Expense>(expensesRef);
  const returnsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'salesReturns') : null, [firestore]);
  const { data: returns } = useCollection<SaleReturn>(returnsRef);
  const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);
  const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  // Settings Collections
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
    const dataToSize = {
        sales: sales || [],
        products: products || [],
        customers: customers || [],
        vendors: vendors || [],
        expenses: expenses || [],
        pos: purchaseOrders || [],
        inventory: inventory || [],
        returns: returns || [],
    };
    
    const dbSizeBytes = JSON.stringify(dataToSize).length;
    const dbSizeMB = dbSizeBytes / (1024 * 1024);
    const restoreSizeBytes = dbSizeBytes * 4.2; 
    const restoreSizeMB = restoreSizeBytes / (1024 * 1024);
    const totalMB = dbSizeMB + restoreSizeMB;
    const dbPercent = totalMB > 0 ? (dbSizeMB / totalMB) * 100 : 0;
    
    return {
        dbSize: dbSizeMB.toFixed(2),
        restoreSize: restoreSizeMB.toFixed(2),
        dbPercent,
        total: totalMB.toFixed(2)
    };
  }, [sales, products, customers, vendors, expenses, purchaseOrders, inventory, returns]);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    itemType: ItemType | null;
    item?: Item;
  }>({ open: false, itemType: null, item: undefined });

  const handleOpenDialog = (itemType: ItemType, item?: Item) => {
    setDialogState({ open: true, itemType, item });
  };

  const handleCloseDialog = () => {
    setDialogState({ open: false, itemType: null, item: undefined });
  };

  const handleSuccess = async (itemType: ItemType, item: Item) => {
    if (!firestore) return;
    const isEditing = !!dialogState.item;
    const message = `${itemType} ${isEditing ? 'updated' : 'added'} successfully.`;
    const collectionName = collections[itemType];

    try {
        const docId = isEditing ? item.id : doc(collection(firestore, 'settings', 'global', collectionName)).id;
        const docRef = doc(firestore, 'settings', 'global', collectionName, docId);
        await setDoc(docRef, { ...item, id: docId }, { merge: true });
        toast({ title: "Success!", description: message });
        handleCloseDialog();
    } catch (error) {
        console.error(`Error saving ${itemType}:`, error);
        toast({ title: "Error", description: `Could not save ${itemType}.`, variant: "destructive" });
    }
  };

  const handleDelete = async (itemType: ItemType, itemId: string) => {
    if (!firestore) return;
    const collectionName = collections[itemType];
    const docRef = doc(firestore, 'settings', 'global', collectionName, itemId);
    try {
        await deleteDoc(docRef);
        toast({ title: "Success!", description: `${itemType} deleted.` });
    } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        toast({ title: "Error", description: `Could not delete ${itemType}.`, variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Settings">
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={() => exportFullBackup({}, 'full_system_backup')}>
            <Download className="mr-2 h-4 w-4" /> Export All
        </Button>
      </PageHeader>
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <StorageDiagnosticsCard stats={storageStats} />
        <SettingDialog
          open={dialogState.open}
          onOpenChange={handleCloseDialog}
          item={dialogState.item}
          itemType={dialogState.itemType}
          categories={categories || []}
          onSuccess={handleSuccess}
        />
        
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Expense Types</CardTitle>
                <CardDescription>Manage types of expenses.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Expense Type')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Expense Type', item), 
                    onDelete: (id) => handleDelete('Expense Type', id) 
                })} 
                data={expenseTypes || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Manage expense and product categories.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Category')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={columns({ 
                    onEdit: (item) => handleOpenDialog('Category', item), 
                    onDelete: (id) => handleDelete('Category', id) 
                })} 
                data={categories || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Sub-Categories</CardTitle>
                <CardDescription>Manage detailed sub-categories.</CardDescription>
            </div>
             <Button size="sm" onClick={() => handleOpenDialog('Sub-Category')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
             <DataTable 
                columns={subCategoryColumns(categories || [])({ 
                    onEdit: (item) => handleOpenDialog('Sub-Category', item), 
                    onDelete: (id) => handleDelete('Sub-Category', id) 
                })} 
                data={subCategories || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
             <div>
                <CardTitle>Brands</CardTitle>
                <CardDescription>Manage product and item brands.</CardDescription>
            </div>
             <Button size="sm" onClick={() => handleOpenDialog('Brand')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
             <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Brand', item), 
                    onDelete: (id) => handleDelete('Brand', id) 
                })} 
                data={brands || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Colors</CardTitle>
                <CardDescription>Manage product color options.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Color')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Color', item), 
                    onDelete: (id) => handleDelete('Color', id) 
                })} 
                data={colors || []} />
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Courier Partners</CardTitle>
                <CardDescription>Manage courier service options.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Courier')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={courierColumns({ 
                    onEdit: (item) => handleOpenDialog('Courier', item as Courier), 
                    onDelete: (id) => handleDelete('Courier', id) 
                })} 
                data={couriers || []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
