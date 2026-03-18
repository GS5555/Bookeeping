'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { PurchaseOrder, Product, Vendor, Store, Courier, Category, SubCategory, HandPreference, Company } from "@/lib/types";
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
import { CalendarIcon, PlusCircle, Trash2, Search, Upload, FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, setDoc } from "firebase/firestore";
import { VendorDialog } from "@/app/vendors/vendor-dialog";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import * as XLSX from 'xlsx';
import { exportToExcel } from "@/lib/actions";

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

const poItemSchema = z.object({
    productId: z.string().min(1, "Product is required."),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
    unitCost: z.coerce.number().min(0, "Unit cost cannot be negative."),
    color1: z.string().optional(),
    color2: z.string().optional(),
    hsnCode: z.string(),
    gstRate: z.number(),
    imageUrl: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  purchaseType: z.enum(["GST", "Cash"]),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedDeliveryDate: z.date({ required_error: "Expected delivery date is required." }),
  items: z.array(poItemSchema).min(1, "At least one item is required."),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"]),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]),
  amountPaid: z.coerce.number().min(0).optional(),
  comments: z.string().optional(),
  courierCompany: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingLink: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
  numberOfBoxes: z.coerce.number().int().min(1, "Number of boxes must be at least 1.").default(1),
});

type POFormValues = z.infer<typeof formSchema>;

interface PODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (po: Omit<PurchaseOrder, 'id' | 'purchaseOrderNumber'>) => void;
}

export function PurchaseOrderDialog({ open, onOpenChange, onSuccess }: PODialogProps) {
  const firestore = useFirestore();
  const [isVendorDialogOpen] = useState(false);
  const [itemFilters, setItemFilters] = useState<{ categoryId: string; subCategoryId: string; handPreference: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const vendorsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name')) : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores } = useCollection<Store>(storesRef);

  const couriersRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'couriers') : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const handPreferencesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'handPreferences') : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);
  
  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedVendors = useMemo(() => vendors?.sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const sortedCouriers = useMemo(() => couriers?.sort((a, b) => a.name.localeCompare(b.name)), [couriers]);
  const sortedCategories = useMemo(() => categories?.sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  
  const form = useForm<POFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      purchaseType: "GST",
      orderDate: new Date(),
      expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      items: [],
      paymentMethod: 'Other',
      paymentStatus: 'Unpaid',
      comments: '',
      courierCompany: "",
      trackingNumber: "",
      trackingLink: "",
      numberOfBoxes: 1,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const handleAppend = useCallback(() => {
    append({ productId: "", quantity: 1, unitCost: 0, color1: '', color2: '', hsnCode: '', gstRate: 0, imageUrl: '' });
    setItemFilters(prev => [...prev, { categoryId: 'all', subCategoryId: 'all', handPreference: 'all' }]);
  }, [append]);

  const handleRemove = (index: number) => {
    remove(index);
    setItemFilters(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDownloadSample = () => {
    if (!products || !categories || !subCategories) {
        toast({
            title: "Data not ready",
            description: "Please wait a moment for all product data to load before downloading.",
            variant: 'destructive',
        });
        return;
    }

    const dataForSample = products.map(product => {
        const category = categories.find(c => c.id === product.category);
        const subCategory = subCategories.find(sc => sc.id === product.subCategory);
        return {
            'SKU': product.sku,
            'Product Name': product.name,
            'Category': category?.name || 'N/A',
            'Sub-Category': subCategory?.name || 'N/A',
            'PurchasePrice': product.purchasePrice,
            'Quantity': '', // Leave blank for user input
        }
    });

    exportToExcel(dataForSample, 'po_items_import_sample');
  }


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!products) {
        toast({ title: "Products not loaded", description: "Please wait a moment and try again.", variant: "destructive" });
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
                toast({ title: "Empty File", description: "The imported file has no data.", variant: "destructive" });
                return;
            }

            const newItems: z.infer<typeof poItemSchema>[] = [];
            const notFoundSkus: string[] = [];

            for (const row of json) {
                const sku = row.SKU || row.sku;
                const quantity = Number(row.Quantity || row.quantity);
                const unitCost = Number(row['PurchasePrice'] || row.purchaseprice || row['UnitCost'] || row.unitcost);

                if (!sku || !quantity || quantity <= 0) continue;

                const product = products.find(p => p.sku.toLowerCase() === String(sku).toLowerCase());

                if (product) {
                    newItems.push({
                        productId: product.id,
                        quantity: quantity,
                        unitCost: unitCost > 0 ? unitCost : product.purchasePrice,
                        color1: product.color1 || '',
                        color2: product.color2 || '',
                        hsnCode: product.hsnCode,
                        gstRate: product.gstRate,
                        imageUrl: product.imageUrl || '',
                    });
                } else {
                    notFoundSkus.push(sku);
                }
            }

            if (newItems.length > 0) {
                replace(newItems); // Replace all existing items with imported ones
                toast({
                    title: "Items Imported",
                    description: `${newItems.length} items have been added to the purchase order.`
                });
            } else {
                 toast({
                    title: "No Items Added",
                    description: "No valid items were found in the imported file.",
                    variant: "destructive"
                });
            }

            if (notFoundSkus.length > 0) {
                toast({
                    title: "Some Products Not Found",
                    description: `The following SKUs were not found: ${notFoundSkus.join(', ')}`,
                    variant: "destructive",
                });
            }

        } catch (error) {
            console.error("Error importing items:", error);
            toast({
                title: "Import Error",
                description: "Failed to read or parse the file. Please ensure it's a valid Excel file.",
                variant: "destructive",
            });
        } finally {
            if (event.target) event.target.value = ''; // Reset file input
        }
    };
    reader.readAsArrayBuffer(file);
  };


  const watchedItems = form.watch("items");
  const watchedVendorId = form.watch("vendorId");
  const watchedCourierCompany = form.watch("courierCompany");
  const watchedPurchaseType = form.watch("purchaseType");
  const watchedPaymentStatus = form.watch("paymentStatus");
  const watchedAmountPaid = form.watch("amountPaid");
  const { setValue, reset } = form;

  useEffect(() => {
    if (open) {
        reset({
            vendorId: "",
            purchaseType: "GST",
            orderDate: new Date(),
            expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            items: [],
            paymentMethod: 'Other',
            paymentStatus: 'Unpaid',
            comments: '',
            courierCompany: "",
            trackingNumber: "",
            trackingLink: "",
            numberOfBoxes: 1,
        });
        setItemFilters([]);
        handleAppend();
    }
  }, [open, reset, handleAppend]);

  useEffect(() => {
    if (watchedCourierCompany && couriers) {
      const courier = couriers.find(c => c.name === watchedCourierCompany);
      if (courier && courier.trackingUrl) {
        setValue('trackingLink', courier.trackingUrl);
      }
    }
  }, [watchedCourierCompany, couriers, setValue]);
  

  const { subTotal, totalAmount, cgstAmount, sgstAmount, igstAmount, gstAmount } = useMemo(() => {
    if (!vendors || !stores) return { subTotal: 0, totalAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, gstAmount: 0 };
    
    const vendor = vendors.find(v => v.id === watchedVendorId);
    const deliveryStore = stores.find(s => s.id === STORE_ID);

    const isInterState = (vendor && deliveryStore) 
        ? vendor.addresses.find(a => a.isPrimary)?.state !== deliveryStore.state 
        : false;

    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    watchedItems.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const unitCost = Number(item.unitCost) || 0;
        
        const itemTotal = quantity * unitCost;
        subTotal += itemTotal;

        if (watchedPurchaseType === 'GST') {
            const gstRate = Number(item.gstRate) || 0;
            const itemGst = itemTotal * (gstRate / 100);
            if (isInterState) {
                totalIgst += itemGst;
            } else {
                totalCgst += itemGst / 2;
                totalSgst += itemGst / 2;
            }
        }
    });
    
    const totalGst = totalIgst + totalCgst + totalSgst;
    const finalTotalAmount = subTotal + totalGst;

    return { 
        subTotal, 
        totalAmount: finalTotalAmount, 
        cgstAmount: totalCgst, 
        sgstAmount: totalSgst, 
        igstAmount: totalIgst, 
        gstAmount: totalGst 
    };
  }, [watchedItems, watchedVendorId, vendors, stores, watchedPurchaseType]);

  const balanceAmount = useMemo(() => {
    if (watchedPaymentStatus === 'Partially Paid') {
        return totalAmount - (Number(watchedAmountPaid) || 0);
    }
    return 0;
  }, [watchedPaymentStatus, totalAmount, watchedAmountPaid]);


  const onSubmit = (data: POFormValues) => {
    if (data.paymentStatus === 'Partially Paid') {
        if (!data.amountPaid || data.amountPaid <= 0) {
            toast({ title: "Invalid Amount", description: "Amount paid must be greater than zero for partial payments.", variant: "destructive" });
            return;
        }
        if (data.amountPaid >= totalAmount) {
            toast({ title: "Invalid Amount", description: "For partial payment, paid amount must be less than the total. To fully pay, select 'Paid'.", variant: "destructive" });
            return;
        }
    }
    
    if (!vendors || !products) return;
    const vendor = vendors.find(v => v.id === data.vendorId);
    if (!vendor) return;

    const poItems = data.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
            productId: item.productId,
            productName: product?.name || 'Unknown Product',
            color1: product?.color1,
            color2: product?.color2,
            imageUrl: product?.imageUrl,
            quantity: item.quantity,
            quantityReceived: 0,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            hsnCode: item.hsnCode,
            gstRate: item.gstRate,
        }
    });
    
    const amountPaidValue = data.paymentStatus === 'Partially Paid' 
        ? (data.amountPaid || 0) 
        : (data.paymentStatus === 'Paid' ? totalAmount : 0);
    const balanceAmountValue = totalAmount - amountPaidValue;

    const submittedPO: Omit<PurchaseOrder, 'id' | 'purchaseOrderNumber'> = {
      storeId: STORE_ID,
      deliveryStoreId: STORE_ID,
      vendorId: vendor.id,
      vendorName: vendor.name || 'Unknown Vendor',
      purchaseType: data.purchaseType,
      orderDate: data.orderDate.toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate.toISOString(),
      paymentDueDate: new Date(new Date().setDate(data.orderDate.getDate() + 30)).toISOString(),
      status: 'Pending',
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      items: poItems,
      subTotal,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      amountPaid: amountPaidValue,
      balanceAmount: balanceAmountValue,
      comments: data.comments,
      courierCompany: data.courierCompany,
      trackingNumber: data.trackingNumber,
      trackingLink: data.trackingLink,
      numberOfBoxes: data.numberOfBoxes,
    };
    onSuccess(submittedPO);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Fill in the details to create a new purchase order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="po-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor <span className="text-destructive font-black">*</span></FormLabel>
                        <div className="flex items-center gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select a vendor" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sortedVendors?.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="purchaseType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Purchase Type</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="GST" /></FormControl>
                                    <FormLabel className="font-normal">GST</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                    <FormLabel className="font-normal">Cash</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                 <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Date <span className="text-destructive font-black">*</span></FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-10",!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                         <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expected Delivery <span className="text-destructive font-black">*</span></FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-10",!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < form.getValues("orderDate")} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <FormLabel className="text-lg font-black uppercase tracking-tight">Line Items</FormLabel>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleAppend}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleDownloadSample}>
                            <FileText className="mr-2 h-4 w-4" /> Sample
                        </Button>
                         <Button type="button" variant="outline" size="sm" onClick={handleImportClick}>
                            <Upload className="mr-2 h-4 w-4" /> Import
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    </div>
                </div>
                {fields.map((field, index) => {
                    const currentFilters = itemFilters[index] || { categoryId: 'all', subCategoryId: 'all', handPreference: 'all' };
                    const filteredSubCategories = subCategories?.filter(sc => currentFilters.categoryId === 'all' || sc.categoryId === currentFilters.categoryId).sort((a,b) => a.name.localeCompare(b.name)) || [];
                    const filteredProducts = products?.filter(p =>
                        (currentFilters.categoryId === 'all' || p.category === currentFilters.categoryId) &&
                        (currentFilters.subCategoryId === 'all' || p.subCategory === currentFilters.subCategoryId) &&
                        (currentFilters.handPreference === 'all' || p.handPreference === currentFilters.handPreference)
                    ).sort((a,b) => a.name.localeCompare(b.name)) || [];

                    return (
                         <Card key={field.id} className="border-2 shadow-sm overflow-hidden bg-accent/5">
                           <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item #{index + 1}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                           </CardHeader>
                           <CardContent className="p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                     <Select value={currentFilters.categoryId} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], categoryId: value, subCategoryId: 'all' }; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {sortedCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                     <Select value={currentFilters.subCategoryId} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].subCategoryId = value; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }} disabled={!filteredSubCategories || filteredSubCategories.length === 0}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sub-Categories</SelectItem>
                                            {filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={currentFilters.handPreference} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].handPreference = value; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Hand" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Preferences</SelectItem>
                                            {handPreferences?.map(hp => <SelectItem key={hp.id} value={hp.name}>{hp.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                    <div className="sm:col-span-6">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.productId`}
                                            render={({ field: formField }) => (
                                                <FormItem>
                                                    <Select onValueChange={(value) => {
                                                        formField.onChange(value);
                                                        const product = products?.find(p => p.id === value);
                                                        if (product) {
                                                            setValue(`items.${index}.unitCost`, product.purchasePrice);
                                                            setValue(`items.${index}.hsnCode`, product.hsnCode);
                                                            setValue(`items.${index}.gstRate`, product.gstRate);
                                                            setValue(`items.${index}.imageUrl`, product.imageUrl);
                                                        }
                                                    }} value={formField.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Product" /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {filteredProducts?.map(product => (
                                                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="Qty" {...field} className="h-10"/></FormControl><FormMessage /></FormItem>}
                                        />
                                    </div>
                                    <div className="sm:col-span-4">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.unitCost`}
                                            render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="Unit Cost" {...field} className="h-10 font-black"/></FormControl><FormMessage /></FormItem>}
                                        />
                                    </div>
                                </div>
                           </CardContent>
                        </Card>
                    )
                })}
                 <FormMessage>{form.formState.errors.items?.message}</FormMessage>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mode of Payment</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select a payment method" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                                <SelectItem value="NEFT">NEFT</SelectItem>
                                <SelectItem value="RTGS">RTGS</SelectItem>
                                <SelectItem value="IMPS">IMPS</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Paid">Paid</SelectItem>
                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {watchedPaymentStatus === 'Partially Paid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Balance Amount</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-muted font-bold text-destructive">
                    ₹{balanceAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comments / Special Instructions</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="e.g., Please use heavy duty packaging."
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <Separator />
            <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Shipping & Tracking
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                        control={form.control}
                        name="courierCompany"
                        render={({ field }) => (
                            <FormItem className="lg:col-span-2">
                            <FormLabel className="text-[10px] font-bold uppercase">Courier Company</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select a courier" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sortedCouriers?.map(courier => (
                                        <SelectItem key={courier.id} value={courier.name}>{courier.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="trackingNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Tracking No.</FormLabel>
                            <FormControl>
                                <Input placeholder="AWB Number" {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="numberOfBoxes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">No. of Boxes</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} className="h-9" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="trackingLink"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase">Tracking Link</FormLabel>
                        <FormControl>
                            <Input placeholder="https://..." {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-2 rounded-lg border-2 border-primary/20 bg-primary/5 p-6 sm:p-8 shadow-inner">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Summary</h4>
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                { watchedPurchaseType === 'GST' && (
                    <div className="space-y-1 border-y py-3 border-primary/10 my-2">
                        { igstAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>IGST</span><span>₹{igstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div> }
                        { cgstAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>CGST</span><span>₹{cgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div> }
                        { sgstAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>SGST</span><span>₹{sgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div> }
                    </div>
                )}
                <div className="flex justify-between items-center pt-2">
                    <span className="text-xl font-black tracking-tighter uppercase">Total Amount</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            <DialogFooter className="p-0 border-t-0 bg-transparent flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Create PO</Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}