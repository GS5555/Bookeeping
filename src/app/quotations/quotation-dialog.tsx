
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Quotation, Product, Customer, Company, Category, SubCategory, Brand, FollowUp, FollowUpType, User } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, ShoppingCart, Trash2, Edit, Save, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";
import { followUpColumns } from "@/app/enquiries/columns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STORE_ID = 'store_main';

const quotationItemSchema = z.object({
    productId: z.string().min(1, "Product is required."),
    productName: z.string(),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
    totalPrice: z.number(),
    hsnCode: z.string(),
    gstRate: z.number(),
    imageUrl: z.string().optional(),
});

const followUpSchema = z.object({
  id: z.string(),
  date: z.string(),
  notes: z.string().min(1, "Follow-up notes cannot be empty."),
  type: z.string().min(1, "Follow-up type is required."),
  nextAction: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  date: z.date({ required_error: "Date is required." }),
  validUntil: z.date({ required_error: "Expiry date is required." }),
  deliveryDate: z.date({ required_error: "Delivery date is required." }),
  items: z.array(quotationItemSchema).min(1, "At least one item is required."),
  termsAndConditions: z.string().optional(),
  status: z.enum(["Draft", "Sent", "Converted", "Expired"]),
  followUps: z.array(followUpSchema).optional(),
});

type QuotationFormValues = z.infer<typeof formSchema>;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Partial<Quotation>;
  onSuccess: (quotation: Omit<Quotation, 'id' | 'quotationNumber'>) => void;
  onConvertToSale: (quotation: Quotation) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
);

export function QuotationDialog({ open, onOpenChange, quotation, onSuccess, onConvertToSale }: QuotationDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!quotation?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);
  const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
  const { data: companyDetails } = useDoc<Company>(companyDocRef);

  const [itemFilters, setItemFilters] = useState<{ categoryId: string; subCategoryId: string; brandId: string }[]>([]);
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);
  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);
  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);
  
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersRef);

  const followUpTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'followUpTypes'), orderBy('name')) : null, [firestore]);
  const { data: followUpTypes } = useCollection<FollowUpType>(followUpTypesRef);

  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedCategories = useMemo(() => categories?.sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const sortedBrands = useMemo(() => brands?.sort((a, b) => a.name.localeCompare(b.name)), [brands]);

  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [newFollowUpType, setNewFollowUpType] = useState("");
  const [nextAction, setNextAction] = useState("");

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      followUps: [],
    },
  });

  const { control, handleSubmit, watch, setValue, reset, getValues } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items") || [];

  const totals = useMemo(() => {
    let subTotal = 0;
    let gstAmount = 0;
    watchedItems.forEach(item => {
        subTotal += (Number(item.totalPrice) || 0);
        gstAmount += (Number(item.totalPrice) || 0) * ((Number(item.gstRate) || 0) / 100);
    });
    return { subTotal, gstAmount, totalAmount: subTotal + gstAmount };
  }, [watchedItems]);

  useEffect(() => {
    if (open) {
      if (quotation && quotation.id) {
        setIsEditing(false);
        reset({
          ...quotation,
          date: quotation.date ? new Date(quotation.date) : new Date(),
          validUntil: quotation.validUntil ? new Date(quotation.validUntil) : addDays(new Date(), 30),
          deliveryDate: quotation.deliveryDate ? new Date(quotation.deliveryDate) : addDays(new Date(), 7),
          items: quotation.items || [],
          followUps: quotation.followUps || [],
          termsAndConditions: quotation.termsAndConditions || companyDetails?.invoiceTerms || '',
          status: quotation.status || 'Draft'
        } as any);
        setItemFilters(quotation.items?.map(() => ({ categoryId: 'all', subCategoryId: 'all', brandId: 'all' })) || []);
      } else {
        setIsEditing(true);
        reset({
          customerId: quotation?.customerId || "",
          date: new Date(),
          validUntil: addDays(new Date(), 30),
          deliveryDate: addDays(new Date(), 7),
          items: quotation?.items || [{ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0, imageUrl: '' }],
          followUps: [],
          termsAndConditions: companyDetails?.invoiceTerms || '',
          status: "Draft",
        });
        setItemFilters(quotation?.items?.map(() => ({ categoryId: 'all', subCategoryId: 'all', brandId: 'all' })) || [{ categoryId: 'all', subCategoryId: 'all', brandId: 'all' }]);
      }
      setNewFollowUpNote("");
      setNewFollowUpType("");
      setNextAction("");
    }
  }, [open, quotation, companyDetails, reset]);
  
  const handleItemsImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!products) {
        toast({ title: "Error", description: "Products are not loaded yet.", variant: "destructive" });
        return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<any>(worksheet);

            const newItems: any[] = [];
            const newFilters: any[] = [];

            json.forEach(row => {
                const sku = row.SKU || row.sku;
                const quantity = Number(row.Quantity || row.quantity);
                if (!sku || !quantity) return;

                const product = products.find(p => p.sku.toLowerCase() === String(sku).toLowerCase());
                if (product) {
                    newItems.push({
                        productId: product.id,
                        productName: product.name,
                        quantity: quantity,
                        unitPrice: product.finalPrice || product.sellingPrice,
                        totalPrice: (product.finalPrice || product.sellingPrice) * quantity,
                        hsnCode: product.hsnCode,
                        gstRate: product.gstRate,
                        imageUrl: product.imageUrl || '',
                    });
                    newFilters.push({
                        categoryId: product.category,
                        subCategoryId: product.subCategory || 'all',
                        brandId: product.brand,
                    });
                }
            });

            if (newItems.length > 0) {
                setValue('items', newItems);
                setItemFilters(newFilters);
                toast({ title: "Import Successful", description: `${newItems.length} items imported.` });
            }
        } catch (error) {
            toast({ title: "Import Failed", description: "Could not read Excel file.", variant: "destructive" });
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleAddFollowUp = () => {
    if (newFollowUpNote.trim() === "" || newFollowUpType.trim() === "" || !currentUser) {
        toast({ title: 'Missing Information', variant: 'destructive'});
        return;
    }
    const currentFollowUps = getValues("followUps") || [];
    const followUp: FollowUp = {
        id: `fu_${Date.now()}`,
        date: new Date().toISOString(),
        notes: newFollowUpNote,
        type: newFollowUpType,
        nextAction: nextAction,
        userId: currentUser.id,
        userName: currentUser.displayName || 'Unknown'
    };
    setValue("followUps", [...currentFollowUps, followUp]);
    setNewFollowUpNote("");
    setNewFollowUpType("");
    setNextAction("");
  };

  const onSubmit = (data: QuotationFormValues) => {
    const customer = customers?.find(c => c.id === data.customerId);
    if (!customer) return;

    const submittedQuotation: Omit<Quotation, 'id' | 'quotationNumber'> = {
      storeId: STORE_ID,
      customerId: data.customerId,
      customerName: customer.name,
      billingAddress: customer.addresses.find(a => a.isPrimary)!,
      ...data,
      date: data.date.toISOString(),
      validUntil: data.validUntil.toISOString(),
      deliveryDate: data.deliveryDate.toISOString(),
      subTotal: totals.subTotal,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      followUps: data.followUps || [],
    };
    onSuccess(submittedQuotation);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{quotation?.id ? "View Quotation" : "Create New Quotation"}</DialogTitle>
              <DialogDescription>Formal proposal for customer review.</DialogDescription>
            </div>
            {quotation?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form id="quotation-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-2">
                {isEditing ? (
                     <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive font-black">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                                <SelectContent>{sortedCustomers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                ) : (
                    <div className="lg:col-span-2">
                        <ReadOnlyField label="Customer" value={customers?.find(c => c.id === getValues('customerId'))?.name} />
                    </div>
                )}
                {isEditing ? (
                    <FormField control={control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date <span className="text-destructive font-black">*</span></FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="w-full pl-3 text-left font-normal h-10">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Date" value={getValues('date') ? format(getValues('date'), "PPP") : 'N/A'} />
                )}
                 {isEditing ? (
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Sent">Sent</SelectItem><SelectItem value="Converted">Converted</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                 ) : (
                    <ReadOnlyField label="Status" value={getValues('status')} />
                 )}
            </div>
            
             <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <FormLabel className="text-lg font-black uppercase tracking-tight">Line Items</FormLabel>
                    {isEditing && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => {append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0, imageUrl: '' }); setItemFilters(prev => [...prev, { categoryId: 'all', subCategoryId: 'all', brandId: 'all' }])}}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                            <input type="file" ref={fileInputRef} onChange={handleItemsImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                        </div>
                    )}
                </div>
                {fields.map((field, index) => {
                    const currentFilters = itemFilters[index] || { categoryId: 'all', subCategoryId: 'all', brandId: 'all' };
                    const filteredSubCategories = subCategories?.filter(sc => currentFilters.categoryId === 'all' || sc.categoryId === currentFilters.categoryId).sort((a,b) => a.name.localeCompare(b.name)) || [];
                    const filteredProducts = products?.filter(p => 
                        (currentFilters.brandId === 'all' || p.brand === currentFilters.brandId) &&
                        (currentFilters.categoryId === 'all' || p.category === currentFilters.categoryId) &&
                        (currentFilters.subCategoryId === 'all' || p.subCategory === currentFilters.subCategoryId)
                    ).sort((a, b) => a.name.localeCompare(b.name)) || [];

                    return (
                        <Card key={field.id} className="border-2 shadow-sm bg-accent/5 overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Item #{index + 1}</span>
                                {isEditing && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                              {isEditing ? (
                               <>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                   <Select value={currentFilters.brandId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], brandId: value }; return newFilters; }); setValue(`items.${index}.productId`, ''); }}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
                                      <SelectContent><SelectItem value="all">All Brands</SelectItem>{sortedBrands?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={currentFilters.categoryId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], categoryId: value, subCategoryId: 'all' }; return newFilters; }); setValue(`items.${index}.productId`, ''); }}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                                        <SelectContent><SelectItem value="all">All Categories</SelectItem>{sortedCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={currentFilters.subCategoryId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].subCategoryId = value; return newFilters; }); setValue(`items.${index}.productId`, ''); }} disabled={!currentFilters.categoryId || currentFilters.categoryId === 'all'}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                                        <SelectContent><SelectItem value="all">All Sub-Categories</SelectItem>{filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}</SelectContent>
                                    </Select>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-2 items-start pt-2">
                                   <FormField control={control} name={`items.${index}.productId`} render={({ field: formField }) => (
                                        <FormItem>
                                          <Select onValueChange={(value) => {
                                                formField.onChange(value);
                                                const product = products?.find(p => p.id === value);
                                                if (product) {
                                                    setValue(`items.${index}.productName`, product.name);
                                                    setValue(`items.${index}.unitPrice`, product.finalPrice || product.sellingPrice);
                                                    setValue(`items.${index}.hsnCode`, product.hsnCode);
                                                    setValue(`items.${index}.gstRate`, product.gstRate);
                                                    setValue(`items.${index}.imageUrl`, product.imageUrl);
                                                    const qty = getValues(`items.${index}.quantity`) || 1;
                                                    setValue(`items.${index}.totalPrice`, (product.finalPrice || product.sellingPrice) * qty);
                                                }
                                            }} value={formField.value}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl>
                                                <SelectContent>{filteredProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                                        <FormItem><FormControl><Input type="number" placeholder="Qty" {...field} onChange={(e) => {field.onChange(e); const p = products?.find(p => p.id === getValues(`items.${index}.productId`)); if(p) setValue(`items.${index}.totalPrice`, (p.finalPrice || p.sellingPrice) * Number(e.target.value))}} className="h-10"/></FormControl></FormItem>
                                    )}/>
                                     <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                                        <FormItem><FormControl><Input type="number" placeholder="Price" {...field} onChange={(e) => {field.onChange(e); const qty = getValues(`items.${index}.quantity`); setValue(`items.${index}.totalPrice`, Number(e.target.value) * qty)}} className="h-10 font-black"/></FormControl></FormItem>
                                    )}/>
                               </div>
                               </>
                               ) : (
                                   <div className="flex justify-between items-center text-sm px-2">
                                      <p className="font-bold flex-1">{field.productName}</p>
                                      <p className="w-24 text-center">Qty: {field.quantity}</p>
                                      <p className="w-32 text-right font-black">₹{field.totalPrice.toLocaleString()}</p>
                                   </div>
                               )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {isEditing ? (
              <FormField control={control} name="termsAndConditions" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Terms & Conditions</FormLabel>
                      <FormControl><Textarea placeholder="Terms and conditions..." {...field} /></FormControl>
                  </FormItem>
              )}/>
            ) : (
              <ReadOnlyField label="Terms & Conditions" value={<div className="whitespace-pre-wrap">{getValues('termsAndConditions')}</div>} />
            )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? (
                    <FormField control={control} name="validUntil" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valid Until <span className="text-destructive font-black">*</span></FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="w-full pl-3 text-left font-normal h-10">{field.value ? format(field.value, "PPP") : <span>Expiry date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Valid Until" value={getValues('validUntil') ? format(getValues('validUntil'), "PPP") : 'N/A'} />
                )}
                {isEditing ? (
                    <FormField control={control} name="deliveryDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Est. Delivery Date <span className="text-destructive font-black">*</span></FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="w-full pl-3 text-left font-normal h-10">{field.value ? format(field.value, "PPP") : <span>Delivery date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Est. Delivery Date" value={getValues('deliveryDate') ? format(getValues('deliveryDate'), "PPP") : 'N/A'} />
                )}
            </div>
            
            <div className="rounded-2xl border-2 border-primary/20 p-6 sm:p-8 bg-primary/5 shadow-inner space-y-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{totals.subTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm border-y py-2 border-primary/10"><span>Tax (GST)</span><span className="font-bold">₹{totals.gstAmount.toLocaleString()}</span></div>
                <div className="flex justify-between items-center pt-4">
                    <span className="text-2xl font-black tracking-tighter uppercase">Estimated Total</span>
                    <span className="text-4xl font-black text-primary tracking-tighter">₹{totals.totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <Separator />
                <h3 className="text-lg font-black uppercase tracking-tight">Follow-up Log</h3>
                <div className="rounded-md border max-h-48 overflow-y-auto">
                    <DataTable columns={followUpColumns({ users: usersData || [] })} data={getValues("followUps") || []} />
                </div>
                 <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                    <Label className="text-[10px] font-bold uppercase tracking-widest">Add New Log Entry</Label>
                    <Textarea value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} placeholder="Interaction notes..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>{followUpTypes?.sort((a,b)=>a.name.localeCompare(b.name)).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={nextAction} onValueChange={setNextAction}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Next Action" /></SelectTrigger>
                              <SelectContent><SelectItem value="Call Back">Call Back</SelectItem><SelectItem value="Send Email">Send Email</SelectItem><SelectItem value="Meeting">Meeting</SelectItem><SelectItem value="None">None</SelectItem></SelectContent>
                          </Select>
                    </div>
                    <Button type="button" size="sm" onClick={handleAddFollowUp} className="h-10">Log Interaction</Button>
                </div>
            </div>
          </form>
        </Form>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 pt-4 border-t bg-muted/5">
            {quotation?.id && quotation.status !== 'Converted' && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                <Button type="button" variant="secondary" onClick={() => onConvertToSale(getValues() as Quotation)} className="w-full sm:w-auto order-1 sm:order-3">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Convert to Sale
                </Button>
            )}
            {isEditing ? (
                <Button type="submit" form="quotation-form" className="w-full sm:w-auto order-2 sm:order-2 font-black uppercase tracking-widest">Save Quotation</Button>
            ) : (
                quotation?.id && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                    <Button type="button" onClick={handleSubmit(onSubmit)} className="w-full sm:w-auto order-2 sm:order-2 font-black uppercase tracking-widest">Save Changes</Button>
                )
            )}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-3 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
