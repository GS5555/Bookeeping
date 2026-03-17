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
import { Combobox } from "@/components/ui/combobox";
import * as XLSX from 'xlsx';

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
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
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

  const watchedItems = watch("items");
  const watchedFollowUps = watch("followUps");

  const { subTotal, gstAmount, totalAmount } = useMemo(() => {
    let subTotal = 0;
    let gstAmount = 0;
    watchedItems.forEach(item => {
        subTotal += item.totalPrice;
        gstAmount += item.totalPrice * (item.gstRate / 100);
    });
    return { subTotal, gstAmount, totalAmount: subTotal + gstAmount };
  }, [watchedItems]);

  useEffect(() => {
    if (open) {
      if (quotation && quotation.id) { // Existing quotation
        setIsEditing(false); // Start in view mode
        reset({
          ...quotation,
          date: quotation.date ? new Date(quotation.date) : new Date(),
          validUntil: quotation.validUntil ? new Date(quotation.validUntil) : addDays(new Date(), 30),
          deliveryDate: quotation.deliveryDate ? new Date(quotation.deliveryDate) : addDays(new Date(), 7),
          items: quotation.items || [],
          followUps: quotation.followUps || [],
          termsAndConditions: quotation.termsAndConditions || companyDetails?.invoiceTerms || '',
          status: quotation.status || 'Draft'
        });
        setItemFilters(quotation.items?.map(() => ({ categoryId: 'all', subCategoryId: 'all', brandId: 'all' })) || []);
      } else { // New quotation
        setIsEditing(true); // Start in edit mode
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
        toast({ title: "Error", description: "Products are not loaded yet. Please try again.", variant: "destructive" });
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

            if (json.length === 0) {
                toast({ title: "Import Failed", description: "The Excel file is empty.", variant: "destructive" });
                return;
            }

            const newItems: QuotationFormValues['items'] = [];
            const newFilters: { categoryId: string; subCategoryId: string; brandId: string }[] = [];
            const notFoundSkus: string[] = [];

            json.forEach(row => {
                const sku = row.SKU || row.sku;
                const quantity = Number(row.Quantity || row.quantity);

                if (!sku || !quantity || quantity <= 0) return;

                const product = products.find(p => p.sku.toLowerCase() === String(sku).toLowerCase());

                if (product) {
                    newItems.push({
                        productId: product.id,
                        productName: product.name,
                        quantity: quantity,
                        unitPrice: product.sellingPrice,
                        totalPrice: product.sellingPrice * quantity,
                        hsnCode: product.hsnCode,
                        gstRate: product.gstRate,
                        imageUrl: product.imageUrl || '',
                    });
                    newFilters.push({
                        categoryId: product.category,
                        subCategoryId: product.subCategory || 'all',
                        brandId: product.brand,
                    });
                } else {
                    notFoundSkus.push(String(sku));
                }
            });

            if (newItems.length > 0) {
                setValue('items', newItems);
                setItemFilters(newFilters);
                toast({
                    title: "Items Imported",
                    description: `${newItems.length} items have been added to the quotation.`
                });
            }
            
            if (notFoundSkus.length > 0) {
                toast({
                    title: "Some Products Not Found",
                    description: `The following SKUs were not found: ${notFoundSkus.join(', ')}`,
                    variant: "destructive"
                });
            }

        } catch (error) {
            console.error("Error importing items:", error);
            toast({
                title: "Import Error",
                description: "Failed to read or parse the Excel file.",
                variant: "destructive",
            });
        } finally {
            // Reset file input so the same file can be selected again
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleAddFollowUp = () => {
    if (newFollowUpNote.trim() === "" || newFollowUpType.trim() === "" || !currentUser) {
        toast({ title: 'Missing Information', description: 'Please provide a note and select a follow-up type.', variant: 'destructive'});
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
        userName: currentUser.displayName || 'Unknown User'
    };
    setValue("followUps", [...currentFollowUps, followUp]);
    setNewFollowUpNote("");
    setNewFollowUpType("");
    setNextAction("");
  };


  const onSubmit = (data: QuotationFormValues) => {
    const customer = customers?.find(c => c.id === data.customerId);
    if (!customer) return;

    const latestFollowUp = data.followUps && data.followUps.length > 0 
      ? data.followUps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
      : quotation?.latestFollowUp;
    
    const submittedQuotation: Omit<Quotation, 'id' | 'quotationNumber'> = {
      storeId: STORE_ID,
      customerId: data.customerId,
      customerName: customer.name,
      billingAddress: customer.addresses.find(a => a.isPrimary)!,
      ...data,
      date: data.date.toISOString(),
      validUntil: data.validUntil.toISOString(),
      deliveryDate: data.deliveryDate.toISOString(),
      subTotal,
      gstAmount,
      totalAmount,
      followUps: data.followUps || [],
      latestFollowUp: latestFollowUp,
    };
    onSuccess(submittedQuotation);
  };
  
  const dialogTitle = quotation?.id ? "View Quotation" : "Create New Quotation";
  const dialogDescription = quotation?.id 
    ? `Viewing quotation #${quotation.quotationNumber}` 
    : "Fill in the details to create a new quotation for a customer.";
    
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {quotation?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form id="quotation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {isEditing ? (
                     <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                            <FormLabel>Customer</FormLabel>
                            <Combobox
                                options={customers?.map(c => ({ value: c.id, label: c.name })) || []}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a customer..."
                                searchPlaceholder="Search customers..."
                                notFoundText="No customer found."
                            />
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
                        <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Date" value={format(getValues('date'), "PPP")} />
                )}
                 {isEditing ? (
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Sent">Sent</SelectItem><SelectItem value="Converted">Converted</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                 ) : (
                    <ReadOnlyField label="Status" value={getValues('status')} />
                 )}
            </div>
            
             <div className="space-y-4">
                <FormLabel>Items</FormLabel>
                {fields.map((field, index) => {
                     const currentFilters = itemFilters[index] || { brandId: 'all', categoryId: 'all', subCategoryId: 'all' };
                     const filteredSubCategories = subCategories?.filter(sc => currentFilters.categoryId === 'all' || sc.categoryId === currentFilters.categoryId).sort((a,b) => a.name.localeCompare(b.name)) || [];
                    const filteredProducts = products?.filter(p => 
                        (currentFilters.brandId === 'all' || p.brand === currentFilters.brandId) &&
                        (currentFilters.categoryId === 'all' || p.category === currentFilters.categoryId) &&
                        (currentFilters.subCategoryId === 'all' || p.subCategory === currentFilters.subCategoryId)
                    ).sort((a, b) => a.name.localeCompare(b.name)) || [];
                    const selectedProduct = products?.find(p => p.id === field.productId);

                    return (
                        <div key={field.id} className="space-y-3 border p-3 rounded-lg relative">
                            {isEditing && <div className="flex justify-end sm:absolute sm:top-2 sm:right-2">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                           </div>}
                          {isEditing ? (
                           <>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                               <Select value={currentFilters.brandId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], brandId: value }; return newFilters; }); setValue(`items.${index}.productId`, ''); }}>
                                  <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                                  <SelectContent><SelectItem value="all">All Brands</SelectItem>{brands?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={currentFilters.categoryId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], categoryId: value, subCategoryId: 'all' }; return newFilters; }); setValue(`items.${index}.productId`, ''); }}>
                                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={currentFilters.subCategoryId} onValueChange={(value) => { setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].subCategoryId = value; return newFilters; }); setValue(`items.${index}.productId`, ''); }} disabled={!currentFilters.categoryId || currentFilters.categoryId === 'all'}>
                                    <SelectTrigger><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Sub-Categories</SelectItem>{filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}</SelectContent>
                                </Select>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-2 items-start">
                               <FormField control={control} name={`items.${index}.productId`} render={({ field: formField }) => (
                                    <FormItem><FormLabel className="sr-only">Product</FormLabel><Select onValueChange={(value) => {
                                        formField.onChange(value);
                                        const product = products?.find(p => p.id === value);
                                        if (product) {
                                            setValue(`items.${index}.productName`, product.name);
                                            setValue(`items.${index}.unitPrice`, product.sellingPrice);
                                            setValue(`items.${index}.hsnCode`, product.hsnCode);
                                            setValue(`items.${index}.gstRate`, product.gstRate);
                                            setValue(`items.${index}.imageUrl`, product.imageUrl);
                                            const qty = getValues(`items.${index}.quantity`) || 1;
                                            setValue(`items.${index}.totalPrice`, product.sellingPrice * qty);
                                        }
                                    }} value={formField.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl><SelectContent>{filteredProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                                    <FormItem><FormLabel className="sr-only">Quantity</FormLabel><FormControl><Input type="number" placeholder="Qty" {...field} onChange={(e) => {field.onChange(e); const p = products?.find(p => p.id === getValues(`items.${index}.productId`)); if(p) setValue(`items.${index}.totalPrice`, p.sellingPrice * Number(e.target.value))}} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                                    <FormItem><FormLabel className="sr-only">Unit Price</FormLabel><FormControl><Input type="number" placeholder="Unit Price" {...field} onChange={(e) => {field.onChange(e); const qty = getValues(`items.${index}.quantity`); setValue(`items.${index}.totalPrice`, Number(e.target.value) * qty)}} /></FormControl><FormMessage /></FormItem>
                                )}/>
                           </div>
                           </>
                           ) : (
                               <div className="grid grid-cols-4 gap-4 items-center">
                                  <p className="font-medium col-span-2">{selectedProduct?.name}</p>
                                  <p>Qty: {field.quantity}</p>
                                  <p className="text-right">Total: ₹{field.totalPrice.toLocaleString()}</p>
                               </div>
                           )}
                        </div>
                    );
                })}
                {isEditing && (
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => {append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0, imageUrl: '' }); setItemFilters(prev => [...prev, { categoryId: 'all', subCategoryId: 'all', brandId: 'all' }])}}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4" /> Import Items
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleItemsImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    </div>
                )}
            </div>

            {isEditing ? (
              <FormField control={control} name="termsAndConditions" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Terms &amp; Conditions</FormLabel>
                      <FormControl><Textarea placeholder="Enter terms line by line" {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
            ) : (
              <ReadOnlyField label="Terms & Conditions" value={<div className="whitespace-pre-wrap">{getValues('termsAndConditions')}</div>} />
            )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? (
                    <FormField control={control} name="validUntil" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Valid Until</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick expiry date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Valid Until" value={format(getValues('validUntil'), "PPP")} />
                )}
                {isEditing ? (
                    <FormField control={control} name="deliveryDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Est. Delivery Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick delivery date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                ) : (
                    <ReadOnlyField label="Est. Delivery Date" value={format(getValues('deliveryDate'), "PPP")} />
                )}
            </div>
            
            <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-medium">Summary</h4>
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between"><span>GST</span><span>₹{gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            </div>

            <div className="space-y-4 pt-4">
                <Separator />
                <h3 className="text-lg font-medium">Follow-ups ({watchedFollowUps?.length || 0})</h3>
                <div className="rounded-md border max-h-48 overflow-y-auto">
                    <DataTable columns={followUpColumns({ users: usersData || [] })} data={watchedFollowUps || []} />
                </div>
                 <div className="space-y-4 p-4 border rounded-lg">
                    <Label htmlFor="new-follow-up">Add Follow-up</Label>
                    <Textarea id="new-follow-up" value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} placeholder="e.g., Called customer, sent quotation..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                            <SelectTrigger><SelectValue placeholder="Select Follow-up Type..." /></SelectTrigger>
                            <SelectContent>
                                {followUpTypes?.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={nextAction} onValueChange={setNextAction}>
                              <SelectTrigger><SelectValue placeholder="Select Next Action..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Call Back">Call Back</SelectItem>
                                <SelectItem value="Send Email">Send Email</SelectItem>
                                <SelectItem value="Schedule Meeting">Schedule Meeting</SelectItem>
                                <SelectItem value="No Action">No Action</SelectItem>
                              </SelectContent>
                          </Select>
                    </div>
                    <Button type="button" size="sm" onClick={handleAddFollowUp}>Add Note</Button>
                </div>
            </div>
          </form>
        </Form>
        <DialogFooter className="sm:justify-between pt-4">
            <div>
            {quotation?.id && quotation.status !== 'Converted' && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                <Button type="button" variant="secondary" onClick={() => onConvertToSale(getValues() as Quotation)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Convert to Sale
                </Button>
            )}
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                {isEditing && (
                    <Button type="submit" form="quotation-form">Save Changes</Button>
                )}
                {!isEditing && quotation?.id && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                    <Button type="button" onClick={handleSubmit(onSubmit)}>Save Follow-up</Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
