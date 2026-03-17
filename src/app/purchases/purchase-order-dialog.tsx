

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
import { CalendarIcon, PlusCircle, Trash2, Search, Upload, FileText } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
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
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [itemFilters, setItemFilters] = useState<{ categoryId: string; subCategoryId: string; handPreference: string }[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<Product | null>(null);
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
  
  // This is the correct way to handle the product selection to avoid race conditions.
  useEffect(() => {
    if (productToAdd) {
        append({
            productId: productToAdd.id,
            quantity: 1,
            unitCost: productToAdd.purchasePrice,
            color1: productToAdd.color1 || '',
            color2: productToAdd.color2 || '',
            hsnCode: productToAdd.hsnCode,
            gstRate: productToAdd.gstRate,
            imageUrl: productToAdd.imageUrl || '',
        });
        setItemFilters(prev => [...prev, {
            categoryId: productToAdd.category,
            subCategoryId: productToAdd.subCategory || 'all',
            handPreference: productToAdd.handPreference || 'all',
        }]);
        toast({ title: "Product Added", description: `${productToAdd.name} added to purchase order.` });
        setProductToAdd(null); // Reset the state to prevent re-triggering
    }
  }, [productToAdd, append, setValue]);


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

  const handleNewVendorSuccess = async (vendor: Vendor) => {
    if (!firestore) return;
    try {
        const vendorDocRef = doc(firestore, 'stores', STORE_ID, 'vendors', vendor.id);
        await setDoc(vendorDocRef, vendor, { merge: true });
        setIsVendorDialogOpen(false);
        setValue('vendorId', vendor.id, { shouldValidate: true });
        toast({ title: "Success!", description: `Vendor ${vendor.name} created and selected.` });
    } catch (error) {
        console.error("Error saving new vendor:", error);
        toast({ title: "Error", description: "Could not save the new vendor.", variant: "destructive" });
    }
  };
  
  return (
    <>
    <VendorDialog
        open={isVendorDialogOpen}
        onOpenChange={setIsVendorDialogOpen}
        onSuccess={handleNewVendorSuccess}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Fill in the details to create a new purchase order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="po-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <div className="flex items-center gap-2">
                            <Combobox
                                options={vendors?.map(v => ({ value: v.id, label: v.name })) || []}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a vendor..."
                                searchPlaceholder="Search vendors..."
                                notFoundText="No vendor found."
                            />
                             <Button type="button" variant="outline" size="icon" onClick={() => setIsVendorDialogOpen(true)}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
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
                        <FormLabel>Purchase Type</FormLabel>
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
                            <FormLabel>Order Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
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
                            <FormLabel>Expected Delivery</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
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
                <div className="space-y-2">
                    <FormLabel>Items</FormLabel>
                    <div className="flex flex-wrap items-center gap-2">
                        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto justify-start">
                                    <Search className="mr-2 h-4 w-4" />
                                    Search to add a product...
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search product by name or SKU..." />
                                    <CommandList>
                                        <CommandEmpty>No products found.</CommandEmpty>
                                        <CommandGroup>
                                            {sortedProducts?.map(product => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={`${product.name} ${product.sku}`}
                                                    onSelect={() => {
                                                        setProductToAdd(product);
                                                        setProductSearchOpen(false);
                                                    }}
                                                >
                                                    {product.name}
                                                    <span className="ml-auto text-xs text-muted-foreground">{product.sku}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleAppend}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item Manually
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleDownloadSample}>
                            <FileText className="mr-2 h-4 w-4" /> Download Sample
                        </Button>
                         <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleImportClick}>
                            <Upload className="mr-2 h-4 w-4" /> Import Items
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    </div>
                    <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
                </div>
                <Separator/>
                {fields.map((field, index) => {
                    const currentFilters = itemFilters[index] || { categoryId: 'all', subCategoryId: 'all', handPreference: 'all' };

                    const filteredSubCategories = subCategories?.filter(sc => currentFilters.categoryId === 'all' || sc.categoryId === currentFilters.categoryId).sort((a,b) => a.name.localeCompare(b.name)) || [];

                    const filteredProducts = products?.filter(p =>
                        (currentFilters.categoryId === 'all' || p.category === currentFilters.categoryId) &&
                        (currentFilters.subCategoryId === 'all' || p.subCategory === currentFilters.subCategoryId) &&
                        (currentFilters.handPreference === 'all' || p.handPreference === currentFilters.handPreference)
                    ).sort((a,b) => a.name.localeCompare(b.name)) || [];

                    const colorText = [watchedItems[index]?.color1, watchedItems[index]?.color2].filter(Boolean).join(' / ');

                    return (
                         <div key={field.id} className="space-y-3 border p-3 rounded-lg bg-accent/10">
                           <div className="flex justify-end sm:hidden">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                           </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                     <Select value={currentFilters.categoryId} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index] = { ...newFilters[index], categoryId: value, subCategoryId: 'all' }; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {sortedCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                     <Select value={currentFilters.subCategoryId} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].subCategoryId = value; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }} disabled={!filteredSubCategories || filteredSubCategories.length === 0}>
                                        <SelectTrigger><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sub-Categories</SelectItem>
                                            {filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={currentFilters.handPreference} onValueChange={(value) => {
                                        setItemFilters(prev => { const newFilters = [...prev]; newFilters[index].handPreference = value; return newFilters; });
                                        setValue(`items.${index}.productId`, '');
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Hand" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Preferences</SelectItem>
                                            {handPreferences?.map(hp => <SelectItem key={hp.id} value={hp.name}>{hp.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2 items-start">
                                <div className="grid grid-cols-4 md:grid-cols-12 gap-x-2 gap-y-4 items-start">
                                    <div className="col-span-4 md:col-span-6">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.productId`}
                                            render={({ field: formField }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Product</FormLabel>
                                                    <Select onValueChange={(value) => {
                                                        formField.onChange(value);
                                                        const product = products?.find(p => p.id === value);
                                                        if (product) {
                                                            setValue(`items.${index}.unitCost`, product.purchasePrice);
                                                            setValue(`items.${index}.color1`, product.color1);
                                                            setValue(`items.${index}.color2`, product.color2);
                                                            setValue(`items.${index}.hsnCode`, product.hsnCode);
                                                            setValue(`items.${index}.gstRate`, product.gstRate);
                                                            setValue(`items.${index}.imageUrl`, product.imageUrl);
                                                        }
                                                    }} value={formField.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
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
                                    <div className="col-span-4 md:col-span-2">
                                        <p className="text-xs font-medium text-muted-foreground truncate">Color: {colorText || 'N/A'}</p>
                                        <p className="text-xs font-medium text-muted-foreground">HSN: {watchedItems[index]?.hsnCode || 'N/A'}</p>
                                        <p className="text-xs font-medium text-muted-foreground">GST: {watchedItems[index]?.gstRate || 0}%</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => <FormItem><FormLabel className="sr-only">Quantity</FormLabel><FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.unitCost`}
                                            render={({ field }) => <FormItem><FormLabel className="sr-only">Unit Cost</FormLabel><FormControl><Input type="number" placeholder="Unit Cost" {...field} /></FormControl><FormMessage /></FormItem>}
                                        />
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="hidden sm:flex" onClick={() => handleRemove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
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
                        <FormLabel>Mode of Payment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Balance Amount</FormLabel>
                  <FormControl>
                    <Input type="text" readOnly value={`₹${balanceAmount.toLocaleString('en-IN')}`} className="font-bold bg-muted" />
                  </FormControl>
                </FormItem>
              </div>
            )}

            <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Comments / Special Instructions</FormLabel>
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
            <div className="space-y-2">
                <h4 className="font-medium text-sm">Shipping Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                        control={form.control}
                        name="courierCompany"
                        render={({ field }) => (
                            <FormItem className="lg:col-span-2">
                            <FormLabel>Courier Company</FormLabel>
                            <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a courier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedCouriers?.map(courier => (
                                            <SelectItem key={courier.id} value={courier.name}>{courier.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="trackingNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tracking No.</FormLabel>
                            <FormControl>
                                <Input placeholder="AWB Number" {...field} />
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
                            <FormLabel>No. of Boxes</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
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
                        <FormLabel>Tracking Link</FormLabel>
                        <FormControl>
                            <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-medium">Summary</h4>
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                { watchedPurchaseType === 'GST' && (
                    <>
                        { igstAmount > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{igstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div> }
                        { cgstAmount > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{cgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div> }
                        { sgstAmount > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{sgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div> }
                    </>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Create PO</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
