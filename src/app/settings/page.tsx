
'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Upload, Save, Signature, PercentSquare, Ticket, Users2, Notebook } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns, subCategoryColumns, courierColumns, basicColumns } from './columns';
import { useState, useEffect, useRef } from 'react';
import { Category, SubCategory, Brand, HsnCode, Color, Courier, Company, ExpenseType, Warranty, HandPreference, Sale, PurchaseOrder, Expense, InventoryItem, Customer, Vendor, Product, Store, SaleReturn, Address, EnquiryStatus, User, CustomerType, VendorType, EnquiryType, EnquirySource, FollowUpType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { SettingDialog } from './setting-dialog';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { exportFullBackup } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
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


type Item = Category | SubCategory | Brand | HsnCode | Color | Courier | Company | ExpenseType | Warranty | HandPreference | EnquiryStatus | CustomerType | VendorType | EnquiryType | EnquirySource | FollowUpType;
type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type' | 'Enquiry Type' | 'Enquiry Source' | 'Follow-up Type';

const defaultWarranties: Omit<Warranty, 'id'>[] = [
    { name: '1 Month', duration: '1m' },
    { name: '3 Months', duration: '3m' },
    { name: '6 Months', duration: '6m' },
    { name: '1 Year', duration: '1y' },
    { name: '2 Years', duration: '2y' },
];

const STORE_ID = 'store_main';

const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  shortName: z.string().min(1, "Short name is required"),
  address: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  displayLogo: z.boolean().default(false),
  invoiceTerms: z.string().optional(),
  invoicePrefix: z.string().max(3, "Prefix must be 3 characters or less").optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

const signatureFormSchema = z.object({
  signatureUrl: z.string().url("Please provide a valid URL.").optional().or(z.literal('')),
  useSignature: z.boolean().default(false),
  noSignatureText: z.string().min(1, "This message cannot be empty."),
});

type SignatureFormValues = z.infer<typeof signatureFormSchema>;

const CompanyDetailsCard = () => {
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading } = useDoc<Company>(companyDocRef);
    const logoFileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companyFormSchema),
        defaultValues: {
            name: '',
            shortName: '',
            address: '',
            gstin: '',
            email: '',
            phone: '',
            website: '',
            logoUrl: '',
            displayLogo: false,
            invoiceTerms: '',
            invoicePrefix: 'INV',
        },
    });
    const watchedLogoUrl = form.watch('logoUrl');

    const { reset } = form;
    useEffect(() => {
        if(companyDetails) {
            reset({
                name: companyDetails.name || '',
                shortName: companyDetails.shortName || '',
                address: companyDetails.address || '',
                gstin: companyDetails.gstin || '',
                email: companyDetails.email || '',
                phone: companyDetails.phone || '',
                website: companyDetails.website || '',
                logoUrl: companyDetails.logoUrl || '',
                displayLogo: companyDetails.displayLogo || false,
                invoiceTerms: companyDetails.invoiceTerms || '',
                invoicePrefix: 'INV',
            });
        }
    }, [companyDetails, reset]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue('logoUrl', reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: CompanyFormValues) => {
        if (!firestore || !companyDocRef) return;
        try {
            await setDoc(companyDocRef, { ...(companyDetails || {}), ...data, id: 'main_company' }, { merge: true });
            toast({ title: 'Success!', description: 'Company details updated.' });
        } catch (error) {
            console.error('Error updating company details:', error);
            toast({ title: 'Error', description: 'Could not update company details.', variant: 'destructive' });
        }
    };

    return (
        <Card className="xl:col-span-3">
            <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>Manage your primary company information. This will be reflected across the application, including on invoices and the sidebar.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name</FormLabel>
                                    <FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="shortName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Short Name</FormLabel>
                                    <FormControl><Input placeholder="YC" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl><Textarea placeholder="123 Business Rd, Suite 100" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="gstin" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GSTIN</FormLabel>
                                    <FormControl><Input placeholder="Your GST Number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="contact@company.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl><Input placeholder="Your contact number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="website" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Website</FormLabel>
                                    <FormControl><Input placeholder="https://yourcompany.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                         <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Company Logo</FormLabel>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder="https://example.com/logo.png" {...field} />
                                    </FormControl>
                                    <input type="file" ref={logoFileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                                    <Button type="button" variant="outline" onClick={() => logoFileInputRef.current?.click()}>Browse</Button>
                                </div>
                                <FormDescription>
                                    Paste a URL or browse to upload a logo.
                                </FormDescription>
                                {watchedLogoUrl && (
                                    <div className="flex justify-center p-2 border rounded-md w-24 h-24">
                                        <Image src={watchedLogoUrl} alt="Logo preview" width={80} height={80} className="rounded-md object-contain" />
                                    </div>
                                )}
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name="displayLogo"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Display Logo in Sidebar</FormLabel>
                                        <FormDescription>
                                            If enabled, the logo will be shown instead of the company short name when the sidebar is collapsed.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name="invoiceTerms" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Invoice Terms & Conditions</FormLabel>
                                <FormControl><Textarea placeholder="Enter terms and conditions, one per line." className="h-32" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="invoicePrefix" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Invoice Prefix</FormLabel>
                                <FormControl><Input placeholder="INV" {...field} /></FormControl>
                                <FormDescription>
                                    Set a 3-letter prefix for GST invoices. Defaults to INV.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="flex justify-end">
                            <Button type="submit"><Save className="mr-2 h-4 w-4"/>Save Details</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

const SignatureCard = () => {
    const firestore = useFirestore();
    const signatureDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'signatures', 'main_signature') : null, [firestore]);
    const { data: signatureDetails, isLoading } = useDoc<SignatureFormValues>(signatureDocRef);
    const signatureFileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<SignatureFormValues>({
        resolver: zodResolver(signatureFormSchema),
        defaultValues: {
            signatureUrl: '',
            useSignature: false,
            noSignatureText: 'This is a computer-generated document and does not require a signature.',
        }
    });

    const { reset, watch } = form;
    const watchedSignatureUrl = watch('signatureUrl');

    useEffect(() => {
        if (signatureDetails) {
            reset(signatureDetails);
        }
    }, [signatureDetails, reset]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue('signatureUrl', reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const onSubmit = async (data: SignatureFormValues) => {
        if (!firestore || !signatureDocRef) return;
        try {
            await setDoc(signatureDocRef, data, { merge: true });
            toast({ title: 'Success!', description: 'Signature settings updated.' });
        } catch (error) {
            console.error('Error updating signature settings:', error);
            toast({ title: 'Error', description: 'Could not update signature settings.', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Document Signature</CardTitle>
                <CardDescription>Manage the signature that appears on invoices, quotations, and other documents.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="signatureUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Signature Image</FormLabel>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder="https://example.com/signature.png" {...field} />
                                    </FormControl>
                                    <input type="file" ref={signatureFileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png, image/jpeg" />
                                    <Button type="button" variant="outline" onClick={() => signatureFileInputRef.current?.click()}>Browse</Button>
                                </div>
                                <FormDescription>
                                    Paste a URL or upload a signature image (PNG with transparent background recommended).
                                </FormDescription>
                                {watchedSignatureUrl && (
                                    <div className="flex justify-center p-2 border rounded-md w-48 h-24 bg-white">
                                        <Image src={watchedSignatureUrl} alt="Signature preview" width={180} height={80} className="rounded-md object-contain" />
                                    </div>
                                )}
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name="useSignature"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Use Signature on Documents</FormLabel>
                                        <FormDescription>
                                            If enabled, your name and signature will appear. Otherwise, the text below will be shown.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="noSignatureText"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Fallback Text</FormLabel>
                                 <FormControl>
                                    <Textarea placeholder="Enter the text to show when signatures are disabled." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit"><Save className="mr-2 h-4 w-4"/>Save Signature Settings</Button>
                        </div>
                    </form>
                 </Form>
            </CardContent>
        </Card>
    )
}

const QuickLinksCard = () => {
    const buttonClassName = "h-auto py-4 flex flex-col items-center justify-center gap-2 rounded-md bg-card hover:bg-muted/80 border border-border/50 shadow-sm text-foreground transition-colors";
    return (
        <Card className="xl:col-span-3">
            <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Navigate to other management pages from here.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Link href="/coupons" className={buttonClassName}>
                        <PercentSquare className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">Coupons</span>
                    </Link>
                     <Link href="/support" className={buttonClassName}>
                        <Ticket className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">Support</span>
                    </Link>
                     <Link href="/users" className={buttonClassName}>
                        <Users2 className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">Users</span>
                    </Link>
                    <Link href="/notes" className={buttonClassName}>
                        <Notebook className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">My Notes</span>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);


  // Collections for settings
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
  const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'companies') : null, [firestore]);
  const { data: companies } = useCollection<Company>(companiesRef);
  const expenseTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'expenseTypes') : null, [firestore]);
  const { data: expenseTypes } = useCollection<ExpenseType>(expenseTypesRef);
  const warrantiesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'warranties'), orderBy('name')) : null, [firestore]);
  const { data: warranties, isLoading: areWarrantiesLoading } = useCollection<Warranty>(warrantiesRef);
  const handPreferencesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'handPreferences') : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);
  const enquiryStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'enquiryStatuses') : null, [firestore]);
  const { data: enquiryStatuses } = useCollection<EnquiryStatus>(enquiryStatusesRef);
  const customerTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'customerTypes') : null, [firestore]);
  const { data: customerTypes } = useCollection<CustomerType>(customerTypesRef);
  const vendorTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'vendorTypes') : null, [firestore]);
  const { data: vendorTypes } = useCollection<VendorType>(vendorTypesRef);
  const enquiryTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'enquiryTypes') : null, [firestore]);
  const { data: enquiryTypes } = useCollection<EnquiryType>(enquiryTypesRef);
  const enquirySourcesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'enquirySources') : null, [firestore]);
  const { data: enquirySources } = useCollection<EnquirySource>(enquirySourcesRef);
  const followUpTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'followUpTypes') : null, [firestore]);
  const { data: followUpTypes } = useCollection<FollowUpType>(followUpTypesRef);

  // Collections for full backup
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
    const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
    const { data: stores } = useCollection<Store>(storesRef);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    itemType: ItemType | null;
    item?: Item;
  }>({ open: false, itemType: null, item: undefined });

  useEffect(() => {
    if (!firestore || areWarrantiesLoading || warranties === null) return;
    
    if (warranties.length === 0) {
        console.log("No warranties found, populating default set.");
        const batch = writeBatch(firestore);
        const warrantiesCollection = collection(firestore, 'settings', 'global', 'warranties');
        defaultWarranties.forEach(warranty => {
            const docRef = doc(warrantiesCollection);
            batch.set(docRef, { ...warranty, id: docRef.id });
        });
        batch.commit().catch(err => console.error("Failed to populate default warranties:", err));
    }
  }, [warranties, areWarrantiesLoading, firestore]);

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

  const handleExportAll = () => {
    if (!products || !brands || !categories || !subCategories || !vendors || !inventory) {
      toast({
        title: "Data Still Loading",
        description: "Please wait a moment for all data to load before exporting.",
        variant: "destructive"
      });
      return;
    }

    const allData = {
      Sales: sales || [],
      Customers: customers || [],
      Vendors: vendors || [],
      Products: products.map(p => ({
        ...p,
        brand: brands.find(b => b.id === p.brand)?.name || p.brand,
        category: categories.find(c => c.id === p.category)?.name || p.category,
        subCategory: subCategories.find(sc => sc.id === p.subCategory)?.name || p.subCategory,
        vendor: vendors.find(v => v.id === p.vendorId)?.name || p.vendorId,
      })),
      Inventory: products.map(p => {
        const invItem = inventory.find(i => i.productId === p.id);
        const landingPrice = (p.purchasePrice || 0) + (p.miscellaneousCost || 0);
        return {
          'SKU': p.sku,
          'Product Name': p.name,
          'Brand': brands.find(b => b.id === p.brand)?.name || p.brand,
          'Quantity': invItem?.quantity || 0,
          'Purchase Price': p.purchasePrice || 0,
          'Miscellaneous Cost': p.miscellaneousCost || 0,
          'Landing Price': landingPrice,
          'Selling Price': p.sellingPrice || 0,
        };
      }),
      Purchases: purchaseOrders || [],
      Expenses: expenses || [],
      Returns: returns || [],
      Stores: stores || [],
      Companies: companies || [],
      'Expense Types': expenseTypes || [],
      Categories: categories || [],
      'Sub-Categories': subCategories || [],
      Brands: brands || [],
      Colors: colors || [],
      Couriers: couriers || [],
      Warranties: warranties || [],
      'Hand Preferences': handPreferences || [],
    };
    exportFullBackup(allData, 'full_system_backup');
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            const batch = writeBatch(firestore);
            let importCount = 0;

            for (const sheetName of workbook.SheetNames) {
                const collectionName = sheetName.toLowerCase().replace(/ /g, '');
                const targetCollection = Object.values(collections).find(c => c.toLowerCase() === collectionName);
                
                if (targetCollection) {
                    const collectionRef = collection(firestore, 'settings', 'global', targetCollection);
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json<any>(worksheet);

                    json.forEach(item => {
                        const docId = item.id || doc(collectionRef).id;
                        const docRef = doc(collectionRef, docId);
                        batch.set(docRef, { ...item, id: docId }, { merge: true });
                        importCount++;
                    });
                }
            }
            
            if (importCount > 0) {
                await batch.commit();
                toast({
                    title: "Import Successful!",
                    description: `${importCount} settings records have been imported/updated.`
                });
            } else {
                 toast({
                    title: "Nothing to Import",
                    description: "No matching setting sheets found in the file.",
                    variant: 'default',
                });
            }

        } catch (error) {
            console.error("Import Error:", error);
            toast({
                title: "Import Error",
                description: "There was an error processing the file. Please ensure it's a valid Excel file with correct sheet names.",
                variant: "destructive",
            });
        }
    };
    reader.readAsArrayBuffer(file);
    if (event.target) event.target.value = '';
  };
  
  const handleClearData = async () => {
    if (!firestore) return;
    setIsLoading(true);
    setIsConfirmDialogOpen(false);

    try {
        const collectionsToDelete = ['sales', 'purchaseOrders', 'salesReturns'];
        let deletedDocsCount = 0;
        
        for (const collectionName of collectionsToDelete) {
            const collectionRef = collection(firestore, 'stores', STORE_ID, collectionName);
            const snapshot = await getDocs(collectionRef);
            if (snapshot.empty) continue;

            const batch = writeBatch(firestore);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedDocsCount += snapshot.size;
        }

        if (deletedDocsCount > 0) {
          toast({
              title: "System Reset Successful",
              description: "All sales, purchase orders, and sales returns have been deleted.",
          });
        } else {
           toast({
              title: "No Data to Clear",
              description: "All transactional data collections were already empty.",
          });
        }

    } catch (error) {
        console.error("Error clearing data:", error);
        toast({
            title: "Error",
            description: "Could not clear all data. Please check the console for details.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <>
      <PageHeader title="Settings">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" /> Export All
        </Button>
      </PageHeader>
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <QuickLinksCard />
        <CompanyDetailsCard />
        <SignatureCard />
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
                <CardTitle>Other Companies</CardTitle>
                <CardDescription>Manage your other company entities.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Company')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Company', item), 
                    onDelete: (id) => handleDelete('Company', id) 
                })} 
                data={companies?.filter(c => c.id !== 'main_company') || []} />
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Warranty Options</CardTitle>
                <CardDescription>Manage warranty durations for sales.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Warranty')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={columns({ 
                    onEdit: (item) => handleOpenDialog('Warranty', item), 
                    onDelete: (id) => handleDelete('Warranty', id) 
                })} 
                data={warranties || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Hand Preferences</CardTitle>
                <CardDescription>Manage options for hand preference.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Hand Preference')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Hand Preference', item), 
                    onDelete: (id) => handleDelete('Hand Preference', id) 
                })} 
                data={handPreferences || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Enquiry Statuses</CardTitle>
                <CardDescription>Manage the statuses for customer enquiries.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Enquiry Status')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Enquiry Status', item), 
                    onDelete: (id) => handleDelete('Enquiry Status', id) 
                })} 
                data={enquiryStatuses || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Enquiry Types</CardTitle>
                <CardDescription>Manage the types for customer enquiries.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Enquiry Type')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Enquiry Type', item), 
                    onDelete: (id) => handleDelete('Enquiry Type', id) 
                })} 
                data={enquiryTypes || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Enquiry Sources</CardTitle>
                <CardDescription>Manage the sources for customer enquiries.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Enquiry Source')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Enquiry Source', item), 
                    onDelete: (id) => handleDelete('Enquiry Source', id) 
                })} 
                data={enquirySources || []} />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Follow-up Types</CardTitle>
                <CardDescription>Manage the types for enquiry and quotation follow-ups.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Follow-up Type')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Follow-up Type', item), 
                    onDelete: (id) => handleDelete('Follow-up Type', id) 
                })} 
                data={followUpTypes || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Customer Types</CardTitle>
                <CardDescription>Manage the types for customers.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Customer Type')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Customer Type', item), 
                    onDelete: (id) => handleDelete('Customer Type', id) 
                })} 
                data={customerTypes || []} />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Vendor Types</CardTitle>
                <CardDescription>Manage the types for vendors.</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog('Vendor Type')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={basicColumns({ 
                    onEdit: (item) => handleOpenDialog('Vendor Type', item), 
                    onDelete: (id) => handleDelete('Vendor Type', id) 
                })} 
                data={vendorTypes || []} />
          </CardContent>
        </Card>
        
        <Card className="xl:col-span-3">
            <CardHeader>
                <CardTitle className="text-destructive">System Reset</CardTitle>
                <CardDescription>
                    Permanently delete all transactional data. This action is irreversible and intended for moving from a testing environment to a live one.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isLoading}>
                            {isLoading ? 'Deleting...' : 'Delete All Transactions'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all **Sales**, **Purchase Orders**, and **Sales Returns**. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearData}>
                                I understand, delete the data
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>

      </div>
    </>
  );
}
