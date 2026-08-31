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
  AlertDialogTrigger,
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
  
  const collections: Record<string, string> = {
    'Category': 'categories', 'Sub-Category': 'subCategories', 'Brand': 'brands', 'Color': 'colors', 'Courier': 'couriers', 'Company': 'companies', 'Expense Type': 'expenseTypes', 'Warranty': 'warranties', 'Hand Preference': 'handPreferences', 'Enquiry Status': 'enquiryStatuses',
    'Customer Type': 'customerTypes', 'Vendor Type': 'vendorTypes', 'Enquiry Type': 'enquiryTypes', 'Enquiry Source': 'enquirySources', 'Follow-up Type': 'followUpTypes'
  };

  const companyDocRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, 
  [firestore]);
  const { data: companyDetails } = useDoc<Company>(companyDocRef);

  // Lookup data collections
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

  // User Management Hooks
  const allUsersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsersData, isLoading: areAllUsersLoading } = useCollection<User>(allUsersRef);

  const logsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100)) : null, [firestore]);
  const { data: activityLogs } = useCollection<ActivityLog>(logsRef);

  const [dialogState, setDialogState] = useState<{ open: boolean; itemType: ItemType | null; item?: any; }>({ open: false, itemType: null, item: undefined });

  const handleOpenDialog = (itemType: ItemType, item?: any) => setDialogState({ open: true, itemType, item });
  const handleCloseDialog = () => setDialogState({ open: false, itemType: null, item: undefined });

  const handleSuccess = async (itemType: ItemType, item: any) => {
    if (!firestore) return;
    const collectionName = collections[itemType];
    const docId = item.id || doc(collection(firestore, 'settings', 'global', collectionName)).id;
    await setDoc(doc(firestore, 'settings', 'global', collectionName, docId), { ...item, id: docId }, { merge: true });
    toast({ title: "Success!", description: `${itemType} saved.` });
    handleCloseDialog();
  };

  const handleMasterDelete = async (itemType: ItemType, itemId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'settings', 'global', collections[itemType], itemId));
    toast({ title: "Deleted", description: `${itemType} removed.` });
  };

  // User Management Handlers (Mentioned: converting viewer to admin / pending to approved)
  const handleRoleChange = async (userId: string, newRole: any) => {
    if (!firestore || !currentUser) return;
    if (currentUser.id === userId) {
        toast({ title: "Action Denied", description: "You cannot change your own role.", variant: "destructive" });
        return;
    }
    try {
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, { role: newRole });
        toast({ title: "Role Updated", description: `User role changed to ${newRole}.` });
    } catch (e) {
        console.error("Role update failed:", e);
        toast({ title: "Error", description: "Could not update user role. Check security rules.", variant: "destructive" });
    }
  };

  const handleApprovalChange = async (userId: string, isApproved: boolean) => {
    if (!firestore || !currentUser) return;
    if (currentUser.id === userId) {
        toast({ title: "Action Denied", description: "You cannot toggle your own status.", variant: "destructive" });
        return;
    }
    try {
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, { isApproved });
        toast({ title: "Status Updated", description: `User ${isApproved ? 'approved' : 'suspended'}.` });
    } catch (e) {
        console.error("Approval update failed:", e);
        toast({ title: "Error", description: "Could not update approval status.", variant: "destructive" });
    }
  };

  const confirmDeleteUsers = async () => {
    if (!firestore || rowsToDelete.length === 0) return;
    const batch = writeBatch(firestore);
    rowsToDelete.forEach(u => {
        if (u.id !== currentUser?.id) batch.delete(doc(firestore, 'users', u.id));
    });
    try {
        await batch.commit();
        toast({ title: "Users Deleted", description: "Profiles removed from database." });
        setIsDeleteDialogOpen(false);
        setRowsToDelete([]);
    } catch (e) {
        toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  if (isUserLoading) return <FullPageLoader />;
  if (currentUser?.role !== 'admin') return <div className="flex items-center justify-center h-96"><ShieldAlert className="mr-2" /> Access Denied</div>;

  return (
    <div className="flex flex-col gap-6 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="Settings">
        <Button variant="outline" size="sm" onClick={() => exportFullBackup({}, 'backup')} className="h-9 font-bold uppercase tracking-tight text-xs">
            <Download className="mr-2 h-4 w-4" /> Export All
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto justify-start bg-transparent gap-4 p-0 mb-8 border-b rounded-none w-full">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 text-sm font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="master" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 text-sm font-semibold">Master Data</TabsTrigger>
            <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 text-sm font-semibold">Team Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* COMPANY PROFILE CARD */}
                <Card className="border-none bg-card shadow-lg p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                                <Building2 className="h-5 w-5 text-orange-500" />
                                Company Profile
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Store Branding and Identity Settings.</p>
                        </div>
                        <Button onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs h-9 px-4">
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
                                    <div className="relative h-32 w-32 border bg-muted rounded-lg overflow-hidden flex items-center justify-center p-2">
                                        {companyDetails?.logoUrl ? (
                                            <Image src={companyDetails.logoUrl} alt="Logo" fill className="object-contain p-2" />
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-muted-foreground">No Logo</span>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Company Name</p>
                                        <p className="text-sm font-black uppercase leading-tight">{companyDetails?.name || 'Cricket Store Manager'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Short Name</p>
                                        <p className="text-sm font-black uppercase">{companyDetails?.shortName || 'CSM'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GSTIN</p>
                                        <p className="text-sm font-black text-orange-500 uppercase">{companyDetails?.gstin || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Email Address</p>
                                        <p className="text-xs font-bold break-all">{companyDetails?.email || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Phone Number</p>
                                        <p className="text-sm font-bold">{companyDetails?.phone || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Website</p>
                                        <p className="text-xs font-bold text-blue-500 truncate">{companyDetails?.website || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* STORAGE DIAGNOSTICS CARD */}
                <Card className="border-none bg-card shadow-lg p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                            <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                                <HardDrive className="h-5 w-5 text-orange-500" />
                                Storage Diagnostics
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Local Cache and Cloud Analysis.</p>
                        </div>
                        <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase tracking-widest text-[9px]">
                            <Link href="/settings/storage-analytics">
                                <LineChart className="mr-2 h-3 w-3" />
                                Analytics
                            </Link>
                        </Button>
                    </div>

                    <div className="space-y-10 flex-1">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-3xl font-black tracking-tighter">0.40 MB</p>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Footprint</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2"><Database className="h-3 w-3" /> Database Cache</div>
                                <span className="text-muted-foreground">0.08 MB</span>
                            </div>
                            <Progress value={20} className="h-2 bg-muted" />
                        </div>
                    </div>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="master" className="m-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
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
                <Card key={sec.title} className="border-none bg-card shadow-md overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-muted/10 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest">{sec.title}</CardTitle>
                        <Button size="sm" onClick={() => handleOpenDialog(sec.type as ItemType)} className="h-7 px-3 bg-orange-500 hover:bg-orange-600 text-[9px] font-black uppercase tracking-widest"><PlusCircle className="mr-1 h-3 w-3" /> Add</Button>
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete {rowsToDelete.length} user profile(s). Access will be revoked immediately.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteUsers} className="bg-destructive text-white">Delete Profiles</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <Users2 className="h-5 w-5 text-primary" />
                        Team & Access Control
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Approve accounts and assign roles.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase tracking-widest text-[9px] flex-1 sm:flex-none">
                        <Link href="/make-admin"><ShieldCheck className="mr-2 h-4 w-4" /> Reset Admin</Link>
                    </Button>
                    <Button onClick={() => setIsAddUserDialogOpen(true)} className="h-9 font-black uppercase tracking-widest text-[9px] flex-1 sm:flex-none">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:w-[300px] mb-4">
                    <TabsTrigger value="list" className="text-[10px] font-black uppercase tracking-widest">Active Users</TabsTrigger>
                    <TabsTrigger value="logs" className="text-[10px] font-black uppercase tracking-widest">System Logs</TabsTrigger>
                </TabsList>
                
                <Card className="border-none shadow-lg overflow-hidden">
                    <TabsContent value="list" className="m-0">
                        <DataTable 
                            columns={userColumns({
                                onRoleChange: handleRoleChange,
                                onApprovalChange: handleApprovalChange,
                                currentUserId: currentUser?.id
                            })} 
                            data={allUsersData || []} 
                            onDeleteSelected={(rows) => { setRowsToDelete(rows); setIsDeleteDialogOpen(true); }}
                        />
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