'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Download, 
    Building2, 
    HardDrive, 
    Database, 
    Edit, 
    LineChart, 
    Users2, 
    Trash2, 
    AlertTriangle, 
    ShieldAlert,
    ShieldCheck,
    Activity
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns as masterColumns, subCategoryColumns, courierColumns, basicColumns } from './columns';
import { useState, useMemo } from 'react';
import { 
    Category, 
    SubCategory, 
    Brand, 
    Color, 
    Courier, 
    Company, 
    ExpenseType, 
    Warranty, 
    HandPreference, 
    EnquiryStatus, 
    CustomerType, 
    VendorType, 
    EnquiryType, 
    EnquirySource, 
    FollowUpType,
    ActivityLog,
    User
} from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { SettingDialog } from './setting-dialog';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, query, orderBy, getDocs, writeBatch, updateDoc, limit } from 'firebase/firestore';
import { exportFullBackup } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettingsForm } from './company-settings-form';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { columns as userColumns } from '@/app/users/columns';
import { columns as logColumns } from '@/app/users/log-columns';
import { AddUserDialog } from '@/app/users/add-user-dialog';
import { FullPageLoader } from '@/components/full-page-loader';

type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type' | 'Enquiry Type' | 'Enquiry Source' | 'Follow-up Type';

const STORE_ID = 'store_main';

export default function SettingsPage() {
  const firestore = useFirestore();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<User[]>([]);
  
  const masterCollections: Record<string, string> = {
    'Category': 'categories', 'Sub-Category': 'subCategories', 'Brand': 'brands', 'Color': 'colors', 'Courier': 'couriers', 'Company': 'companies', 'Expense Type': 'expenseTypes', 'Warranty': 'warranties', 'Hand Preference': 'handPreferences', 'Enquiry Status': 'enquiryStatuses',
    'Customer Type': 'customerTypes', 'Vendor Type': 'vendorTypes', 'Enquiry Type': 'enquiryTypes', 'Enquiry Source': 'enquirySources', 'Follow-up Type': 'followUpTypes'
  };

  const companyDocRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, 
  [firestore]);
  const { data: companyDetails } = useDoc<Company>(companyDocRef);

  // Master lookup collections
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

  // User Management
  const allUsersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsersData, isLoading: areAllUsersLoading } = useCollection<User>(allUsersRef);

  const logsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100)) : null, [firestore]);
  const { data: activityLogs } = useCollection<ActivityLog>(logsRef);

  const [dialogState, setDialogState] = useState<{ open: boolean; itemType: ItemType | null; item?: any; }>({ open: false, itemType: null, item: undefined });

  const handleOpenDialog = (itemType: ItemType, item?: any) => setDialogState({ open: true, itemType, item });
  const handleCloseDialog = () => setDialogState({ open: false, itemType: null, item: undefined });

  const handleMasterSuccess = async (itemType: ItemType, item: any) => {
    if (!firestore) return;
    const collectionName = masterCollections[itemType];
    const docId = item.id || doc(collection(firestore, 'settings', 'global', collectionName)).id;
    await setDoc(doc(firestore, 'settings', 'global', collectionName, docId), { ...item, id: docId }, { merge: true });
    toast({ title: "Success!", description: `${itemType} saved.` });
    handleCloseDialog();
  };

  const handleMasterDelete = async (itemType: ItemType, itemId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'settings', 'global', masterCollections[itemType], itemId));
    toast({ title: "Deleted", description: `${itemType} removed.` });
  };

  // User Rights Logic
  const handleRoleChange = async (userId: string, newRole: any) => {
    if (!firestore || !currentUser) return;
    if (currentUser.id === userId) {
        toast({ title: "Self-Update Denied", description: "You cannot change your own access level.", variant: "destructive" });
        return;
    }
    try {
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, { role: newRole });
        toast({ title: "Access Updated", description: `User role successfully changed to ${newRole}.` });
    } catch (e) {
        console.error("Role update failed:", e);
        toast({ title: "Update Failed", description: "Database permissions blocked this change.", variant: "destructive" });
    }
  };

  const handleApprovalChange = async (userId: string, isApproved: boolean) => {
    if (!firestore || !currentUser) return;
    if (currentUser.id === userId) {
        toast({ title: "Self-Update Denied", description: "You cannot toggle your own approval status.", variant: "destructive" });
        return;
    }
    try {
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, { isApproved });
        toast({ title: "Status Synchronized", description: `User profile is now ${isApproved ? 'Approved' : 'Suspended'}.` });
    } catch (e) {
        console.error("Approval update failed:", e);
        toast({ title: "Update Failed", description: "Database permissions blocked this change.", variant: "destructive" });
    }
  };

  const confirmDeleteUsers = async () => {
    if (!firestore || rowsToDelete.length === 0) return;
    const batch = writeBatch(firestore);
    let count = 0;
    rowsToDelete.forEach(u => {
        const isMaster = u.email === 'admin@example.com' || u.email === 'ghanshyam.saini@gmail.com';
        if (u.id !== currentUser?.id && !isMaster) {
            batch.delete(doc(firestore, 'users', u.id));
            count++;
        }
    });
    try {
        await batch.commit();
        toast({ title: "Profiles Removed", description: `Successfully deleted ${count} user account(s).` });
        setIsDeleteDialogOpen(false);
        setRowsToDelete([]);
    } catch (e) {
        console.error("Delete failed:", e);
        toast({ title: "Delete Failed", description: "Check permissions or console for details.", variant: "destructive" });
    }
  };

  // Purge Utilities
  const handleClearTransactions = async () => {
    if (!firestore) return;
    const collectionsToClear = [
        'sales', 'purchaseOrders', 'expenses', 'salesReturns', 'quotations', 'enquiries', 'repairs'
    ];
    
    setIsScanning(true);
    try {
        const batch = writeBatch(firestore);
        let totalDeleted = 0;

        for (const colName of collectionsToClear) {
            const colRef = collection(firestore, 'stores', STORE_ID, colName);
            const snapshot = await getDocs(colRef);
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
                totalDeleted++;
            });
        }

        if (totalDeleted > 0) {
            await batch.commit();
            toast({ title: "Transactions Purged", description: `${totalDeleted} operational records removed.` });
        } else {
            toast({ title: "No Data Found", description: "Transactional database is already empty." });
        }
    } catch (error) {
        console.error("Purge Error:", error);
        toast({ title: "Error", description: "Purge process failed. Check console.", variant: "destructive" });
    } finally {
        setIsScanning(false);
    }
  };

  const handleClearMasterRegistry = async () => {
    if (!firestore) return;
    const collectionsToClear = ['products', 'customers', 'vendors', 'inventoryItems'];
    
    setIsScanning(true);
    try {
        const batch = writeBatch(firestore);
        let totalDeleted = 0;

        for (const colName of collectionsToClear) {
            const colRef = collection(firestore, 'stores', STORE_ID, colName);
            const snapshot = await getDocs(colRef);
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
                totalDeleted++;
            });
        }

        if (totalDeleted > 0) {
            await batch.commit();
            toast({ title: "Registry Wiped", description: `${totalDeleted} master records removed.` });
        } else {
            toast({ title: "No Data Found", description: "Master registry is already clean." });
        }
    } catch (error) {
        console.error("Purge Error:", error);
        toast({ title: "Error", description: "Purge process failed.", variant: "destructive" });
    } finally {
        setIsScanning(false);
    }
  };

  if (isUserLoading) return <FullPageLoader />;

  return (
    <div className="flex flex-col gap-6 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="System Settings">
        <Button variant="outline" size="sm" onClick={() => exportFullBackup({}, 'backup')} className="h-9 font-black uppercase tracking-widest text-[10px]">
            <Download className="mr-2 h-4 w-4" /> Full System Backup
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto justify-start bg-transparent gap-6 p-0 mb-8 border-b rounded-none w-full">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-black uppercase tracking-widest">Profile & Maintenance</TabsTrigger>
            <TabsTrigger value="master" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-black uppercase tracking-widest">Master Data</TabsTrigger>
            <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-black uppercase tracking-widest">Team Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* COMPANY PROFILE */}
                <Card className="border-2 shadow-sm p-6">
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                            <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                                <Building2 className="h-5 w-5 text-primary" />
                                Store Profile
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Public identity and branding details.</p>
                        </div>
                        <Button onClick={() => setIsEditingProfile(!isEditingProfile)} variant="outline" size="sm" className="font-black uppercase tracking-widest text-[10px] h-9">
                            <Edit className="mr-2 h-4 w-4" />
                            {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                        </Button>
                    </div>

                    {isEditingProfile ? (
                        <CompanySettingsForm onSaveSuccess={() => setIsEditingProfile(false)} />
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="flex justify-center md:justify-start">
                                    <div className="relative h-32 w-32 border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center p-2 bg-muted/20">
                                        {companyDetails?.logoUrl ? (
                                            <Image src={companyDetails.logoUrl} alt="Logo" fill className="object-contain p-2" />
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-muted-foreground text-center">Brand<br/>Logo</span>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Business Name</p>
                                        <p className="text-sm font-black uppercase leading-tight">{companyDetails?.name || 'Cricket Store'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GSTIN</p>
                                        <p className="text-sm font-black text-primary uppercase">{companyDetails?.gstin || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Address</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed">{companyDetails?.address || 'Not Set'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* SYSTEM MAINTENANCE */}
                <Card className="border-2 shadow-sm p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                            <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                System Maintenance
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wipe records and start clean.</p>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="p-4 rounded-xl bg-destructive/5 border-2 border-destructive/20 space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-tighter">Purge Financial History</p>
                                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                    Removes all Sales, POs, Expenses, and Leads. Registry items (Products/Vendors) are safe.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="w-full font-black uppercase tracking-widest text-[10px] h-9" disabled={isScanning}>
                                        <Trash2 className="mr-2 h-3 w-3" />
                                        Clear Transaction Data
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will delete all sales and financial history. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearTransactions} className="bg-destructive text-white">Confirm Purge</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="p-4 rounded-xl bg-orange-50 border-2 border-orange-200 space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-tighter text-orange-800">Empty Master Registry</p>
                                <p className="text-[10px] text-orange-600 font-medium leading-relaxed">
                                    Wipe all Products, Customers, and Vendors to start with your own inventory.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full border-orange-400 text-orange-700 font-black uppercase tracking-widest text-[10px] h-9" disabled={isScanning}>
                                        <Database className="mr-2 h-3 w-3" />
                                        Empty Master Registry
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Wipe Master Data?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove your entire product and contact database. Proceed with caution.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearMasterRegistry} className="bg-orange-600 text-white">Wipe Registry</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </Card>
            </div>

            {/* QUICK MASTER DATA GRID */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {[
                    { title: 'Expense Types', type: 'Expense Type', data: expenseTypes },
                    { title: 'Categories', type: 'Category', data: categories },
                    { title: 'Brands', type: 'Brand', data: brands },
                ].map((sec) => (
                    <Card key={sec.title} className="border-2 shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-muted/20 border-b">
                            <CardTitle className="text-xs font-black uppercase tracking-widest">{sec.title}</CardTitle>
                            <Button size="sm" onClick={() => handleOpenDialog(sec.type as ItemType)} className="h-7 px-3 bg-primary hover:bg-primary/90 text-[9px] font-black uppercase tracking-widest">
                                <PlusCircle className="mr-1 h-3 w-3" /> Add
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable 
                                columns={basicColumns({ onEdit: (i) => handleOpenDialog(sec.type as ItemType, i), onDelete: (id) => handleMasterDelete(sec.type as ItemType, id) })} 
                                data={(sec.data || []).slice(0, 5)} 
                                initialPageSize={5}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="master" className="m-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                <SettingDialog open={dialogState.open} onOpenChange={handleCloseDialog} item={dialogState.item} itemType={dialogState.itemType} categories={categories || []} onSuccess={handleMasterSuccess} />
                
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
                <Card key={sec.title} className="border-2 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-muted/20 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest">{sec.title}</CardTitle>
                        <Button size="sm" onClick={() => handleOpenDialog(sec.type as ItemType)} className="h-7 px-3 bg-primary hover:bg-primary/90 text-[9px] font-black uppercase tracking-widest"><PlusCircle className="mr-1 h-3 w-3" /> Add</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                    <DataTable 
                        columns={
                            sec.type === 'Sub-Category' ? subCategoryColumns(categories || [])({ onEdit: (i) => handleOpenDialog('Sub-Category', i), onDelete: (id) => handleMasterDelete('Sub-Category', id) }) : 
                            sec.type === 'Courier' ? courierColumns({ onEdit: (i) => handleOpenDialog('Courier', i as Courier), onDelete: (id) => handleMasterDelete('Courier', id) }) : 
                            sec.type === 'Category' ? masterColumns({ onEdit: (i) => handleOpenDialog('Category', i), onDelete: (id) => handleMasterDelete('Category', id) }) :
                            basicColumns({ onEdit: (i) => handleOpenDialog(sec.type as ItemType, i), onDelete: (id) => handleMasterDelete(sec.type as ItemType, id) })
                        } 
                        data={sec.data || []} 
                    />
                    </CardContent>
                </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="users" className="m-0 space-y-8">
            <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User Access?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently remove {rowsToDelete.length} user profile(s). Access will be revoked immediately. Master admins cannot be deleted.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteUsers} className="bg-destructive text-white font-black uppercase text-xs tracking-widest">Delete Profiles</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Users2 className="h-6 w-6 text-primary" />
                        Team & Access Control
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Approve accounts and assign roles.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase tracking-widest text-[9px] flex-1 sm:flex-none">
                        <Link href="/make-admin"><ShieldCheck className="mr-2 h-4 w-4" /> Reset Master Admin</Link>
                    </Button>
                    <Button onClick={() => setIsAddUserDialogOpen(true)} className="h-9 font-black uppercase tracking-widest text-[9px] flex-1 sm:flex-none">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Staff Member
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:w-[300px] mb-6">
                    <TabsTrigger value="list" className="text-[10px] font-black uppercase tracking-widest">Staff Directory</TabsTrigger>
                    <TabsTrigger value="logs" className="text-[10px] font-black uppercase tracking-widest">Audit Logs</TabsTrigger>
                </TabsList>
                
                <Card className="border-2 shadow-sm overflow-hidden">
                    <TabsContent value="list" className="m-0">
                        {areAllUsersLoading ? <div className="p-12 text-center animate-pulse font-black uppercase tracking-widest text-muted-foreground">Loading Team Data...</div> : (
                            <DataTable 
                                columns={userColumns({
                                    onRoleChange: handleRoleChange,
                                    onApprovalChange: handleApprovalChange,
                                    currentUserId: currentUser?.id
                                })} 
                                data={allUsersData || []} 
                                onDeleteSelected={(rows) => { setRowsToDelete(rows); setIsDeleteDialogOpen(true); }}
                            />
                        )}
                    </TabsContent>
                    <TabsContent value="logs" className="m-0">
                        <DataTable columns={logColumns} data={activityLogs || []} />
                    </TabsContent>
                </Card>
            </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}