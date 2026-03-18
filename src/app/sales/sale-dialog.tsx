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
import { Sale, Customer, Product, Coupon, InventoryItem, Brand, HandPreference, Warranty, Store, Category, SubCategory, Courier, Address } from "@/lib/types";
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
import { CalendarIcon, PlusCircle, Trash2, AlertCircle, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { CustomerDialog } from "@/app/customers/customer-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";

const STORE_ID = 'store_main';

const saleItemSchema = z.object({
    productId: z.string().optional(),
    brandId: z.string().optional(),
    handPreference: z.string().default('Normal'),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1.").default(1),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").default(0),
    hsnCode: z.string().optional(),
    gstRate: z.number().default(0),
    color1: z.string().optional(),
    color2: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  storeId: z.string().min(1, "Store is required."),
  saleDate: z.date({ required_error: "Sale date is required." }),
  saleType: z.enum(["GST", "Cash"], { required_error: "Sale type is required." }),
  warrantyId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one product must be selected."),
  useDifferentShipping: z.boolean().default(false),
  shippingAddressId: z.string().optional(),
  couponCode: z.string().optional(),
  manualDiscountPercentage: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other", "Sponsored", "Replacement"]),
  paymentDetails: z.string().optional(),
  invoiceStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]),
  amountPaid: z.coerce.number().min(0).optional(),
  courierCompany: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingLink: z.string().url("Invalid tracking URL").or(z.literal("")).optional(),
  numberOfBoxes: z.coerce.number().int().min(1).default(1),
});

type SaleFormValues = z.infer<typeof formSchema>;

interface SaleDialogProps {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Partial<Sale>;
  onSuccess: (sale: Sale) => void;
}

export function SaleDialog({ open, onOpenChange, sale, onSuccess }: SaleDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: allProducts } = useCollection<Product>(productsRef);

  const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores } = useCollection<Store>(storesRef);

  const couriersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'couriers'), orderBy('name')) : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);

  const couponsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'coupons') : null, [firestore]);
  const { data: coupons } = useCollection<Coupon>(couponsRef);

  const warrantiesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'warranties'), orderBy('name')) : null, [firestore]);
  const { data: warranties } = useCollection<Warranty>(warrantiesRef);

  const handPreferencesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'handPreferences'), orderBy('name')) : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);

  const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categoriesData } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategoriesData } = useCollection<SubCategory>(subCategoriesRef);

  const sortedProducts = useMemo(() => allProducts?.sort((a, b) => a.name.localeCompare(b.name)), [allProducts]);
  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      storeId: STORE_ID,
      saleDate: new Date(),
      saleType: "GST",
      items: [{ productId: "", brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' }],
      useDifferentShipping: false,
      couponCode: "",
      manualDiscountPercentage: 0,
      paymentMethod: "Cash",
      paymentDetails: "",
      invoiceStatus: "Paid",
      numberOfBoxes: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { setValue, watch, reset } = form;

  const watchedItems = watch("items") || [];
  const watchedCouponCode = watch("couponCode");
  const watchedSaleType = watch("saleType");
  const watchedCustomerId = watch("customerId");
  const watchedStoreId = watch("storeId");
  const watchedManualDiscount = watch("manualDiscountPercentage");
  const watchedUseDifferentShipping = watch("useDifferentShipping");

  const selectedCustomer = useMemo(() => customers?.find(c => c.id === watchedCustomerId), [customers, watchedCustomerId]);
  const customerAddresses = useMemo(() => selectedCustomer?.addresses || [], [selectedCustomer]);
  const primaryAddress = useMemo(() => customerAddresses.find(a => a.isPrimary) || customerAddresses[0], [customerAddresses]);

  const totals = useMemo(() => {
    const subTotalVal = watchedItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    
    let couponDiscountValue = 0;
    const coupon = coupons?.find(c => c.code === watchedCouponCode && c.isActive);
    if(coupon && subTotalVal >= coupon.minPurchaseAmount) {
      couponDiscountValue = coupon.discountType === 'percentage' ? (subTotalVal * coupon.discountValue) / 100 : coupon.discountValue;
    }
    const manualDiscountValue = (subTotalVal * (Number(watchedManualDiscount) || 0)) / 100;
    const totalDiscountValue = Math.min(subTotalVal, couponDiscountValue + manualDiscountValue);
    
    const taxableValue = subTotalVal - totalDiscountValue;
    const discountRatio = subTotalVal > 0 ? totalDiscountValue / subTotalVal : 0;

    let cgstVal = 0, sgstVal = 0, igstVal = 0;
    if(watchedSaleType === 'GST' && subTotalVal > 0) {
        const store = stores?.find(s => s.id === watchedStoreId);
        const isInterState = primaryAddress?.state !== store?.state;
        
        watchedItems.forEach(item => {
            if (!item.productId) return;
            const itemLineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            const itemTaxableValue = itemLineTotal * (1 - discountRatio);
            const itemGstTotal = itemTaxableValue * ((Number(item.gstRate) || 0) / 100);
            
            if (isInterState) igstVal += itemGstTotal;
            else {
                cgstVal += itemGstTotal / 2;
                sgstVal += itemGstTotal / 2;
            }
        });
    }
    
    const rawTotal = taxableValue + cgstVal + sgstVal + igstVal;
    const finalRounded = Math.round(rawTotal);
    return { 
        subTotal: subTotalVal, totalDiscount: totalDiscountValue, totalAmount: finalRounded, 
        cgstAmount: cgstVal, sgstAmount: sgstVal, igstAmount: igstVal, roundOff: finalRounded - rawTotal 
    };
  }, [watchedItems, watchedCouponCode, watchedManualDiscount, watchedSaleType, watchedStoreId, primaryAddress, coupons, stores]);

  const balanceDue = useMemo(() => {
    const status = watch('invoiceStatus');
    const amountPaid = Number(watch('amountPaid')) || 0;
    return status === 'Partially Paid' ? totals.totalAmount - amountPaid : 0;
  }, [watch, totals.totalAmount]);

  useEffect(() => {
    if (open) {
      if (sale && sale.id) {
        reset({
          ...sale,
          saleDate: sale.saleDate ? new Date(sale.saleDate) : new Date(),
        } as any);
      } else {
        reset({
          customerId: sale?.customerId || "",
          storeId: STORE_ID,
          saleDate: new Date(),
          saleType: "GST",
          items: sale?.items || [{ productId: "", brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' }],
          useDifferentShipping: false,
          couponCode: "",
          manualDiscountPercentage: 0,
          paymentMethod: "Cash",
          paymentDetails: "",
          invoiceStatus: "Paid",
          numberOfBoxes: 1,
        });
      }
    }
  }, [open, sale, reset]);

  const handleProductSelect = (value: string, index: number) => {
    const product = allProducts?.find(p => p.id === value);
    if (!product) return;

    const existingIndex = watchedItems.findIndex((item, i) => item.productId === value && i !== index);

    if (existingIndex > -1) {
        const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
        remove(index);
        toast({ title: "Item Consolidated", description: `Increased quantity for "${product.name}".` });
    } else {
        setValue(`items.${index}.productId`, product.id);
        setValue(`items.${index}.brandId`, product.brand);
        setValue(`items.${index}.categoryId`, product.category);
        setValue(`items.${index}.subCategoryId`, product.subCategory || '');
        setValue(`items.${index}.unitPrice`, product.finalPrice || product.sellingPrice);
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.gstRate`, product.gstRate);
        setValue(`items.${index}.handPreference`, (product.handPreference && product.handPreference !== 'Blank') ? product.handPreference : 'Normal');
        
        if (index === watchedItems.length - 1) {
            append({ productId: "", brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' });
        }
    }
  }

  const handleFormSubmit = (data: SaleFormValues) => {
    if (!customers || !allProducts || !brands || !currentUser) return;
    
    const validItems = data.items.filter(i => i.productId && i.productId !== "").map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        const brand = brands.find(b => b.id === item.brandId);
        return {
            ...item,
            productName: product?.name || 'Unknown',
            brandName: brand?.name || 'Unknown',
            totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
            hsnCode: item.hsnCode || product?.hsnCode || '',
            gstRate: item.gstRate || product?.gstRate || 0,
            costOfGoodsSold: 0,
            discount: 0,
        };
    });

    if (validItems.length === 0) {
        toast({ title: "Validation Error", description: "At least one valid product must be selected.", variant: "destructive" });
        return;
    }

    const customer = customers.find(c => c.id === data.customerId);
    const billingAddress = customer?.addresses.find(a => a.isPrimary) || customer?.addresses[0];
    const shippingAddress = data.useDifferentShipping 
        ? customer?.addresses.find(a => a.id === data.shippingAddressId) 
        : billingAddress;
    
    if (!customer || !billingAddress) {
        toast({ title: "Error", description: "Customer profile is incomplete.", variant: "destructive" });
        return;
    }

    const finalSale: Sale = {
      id: sale?.id || `sale_${Date.now()}`,
      storeId: data.storeId,
      customerId: customer.id,
      customerName: customer.name,
      customerGstNumber: customer.gstNumber || '',
      billingAddress,
      shippingAddress,
      saleDate: data.saleDate.toISOString(),
      saleTime: format(new Date(), 'HH:mm'),
      dueDate: format(addDays(data.saleDate, 30), "yyyy-MM-dd"),
      saleType: data.saleType,
      items: validItems as any,
      subTotal: totals.subTotal,
      gstAmount: totals.cgstAmount + totals.sgstAmount + totals.igstAmount,
      cgstAmount: totals.cgstAmount, sgstAmount: totals.sgstAmount, igstAmount: totals.igstAmount,
      totalAmount: totals.totalAmount, amountPaid: data.amountPaid || 0, balanceAmount: balanceDue,
      invoiceStatus: data.invoiceStatus, paymentMethod: data.paymentMethod,
      invoiceSequence: sale?.invoiceSequence || `INV-${Date.now().toString().slice(-5)}`,
      createdBy: currentUser.id, createdByName: currentUser.displayName,
      courierCompany: data.courierCompany,
      trackingNumber: data.trackingNumber,
      trackingLink: data.trackingLink,
      numberOfBoxes: data.numberOfBoxes,
    } as Sale;
    
    onSuccess(finalSale);
  };

  const validationErrors = Object.entries(form.formState.errors).map(([key, value]) => {
      if (key === 'items') return 'At least one valid product must be added.';
      return (value as any)?.message;
  }).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{sale?.id ? "Edit Sale" : "New Sale"}</DialogTitle>
            <DialogDescription>Create a compliant TAX INVOICE or Retail Receipt.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form id="sale-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                <div className="space-y-4">
                    <FormField control={form.control} name="customerId" render={({ field }) => ( 
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Customer <span className="text-destructive font-black">*</span>
                        </FormLabel>
                        <div className="flex items-center gap-2">
                        <FormControl>
                            <Combobox
                                options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a customer"
                                searchPlaceholder="Search customers..."
                                notFoundText="No customer found."
                            />
                        </FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)} className="shrink-0 h-10 w-10"><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )} />

                    {selectedCustomer && (
                        <div className="p-4 rounded-lg bg-muted/30 border space-y-2 animate-in fade-in duration-300">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                        <MapPin className="h-3 w-3" /> Billing Address
                                    </div>
                                    <p className="text-sm font-medium">
                                        {primaryAddress?.street}, {primaryAddress?.city}, {primaryAddress?.state} {primaryAddress?.zip}
                                    </p>
                                </div>
                                {selectedCustomer.gstNumber && (
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">GSTIN</div>
                                        <Badge variant="outline" className="font-mono text-xs border-primary/30 bg-primary/5 text-primary">{selectedCustomer.gstNumber}</Badge>
                                    </div>
                                )}
                            </div>
                            <div className="pt-2 flex items-center gap-2">
                                <FormField control={form.control} name="useDifferentShipping" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <Label className="text-xs font-bold uppercase cursor-pointer">Ship to different address?</Label>
                                    </FormItem>
                                )} />
                            </div>
                            {watchedUseDifferentShipping && (
                                <FormField control={form.control} name="shippingAddressId" render={({ field }) => (
                                    <FormItem className="pt-2">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Select shipping address" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {customerAddresses.map(addr => (
                                                    <SelectItem key={addr.id} value={addr.id}>
                                                        {addr.street}, {addr.city}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <FormField control={form.control} name="saleDate" render={({ field }) => ( 
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Sale Date <span className="text-destructive font-black">*</span>
                        </FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" className="w-full pl-3 text-left font-normal h-10">
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
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="saleType" render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="GST" /></FormControl><FormLabel className="font-normal">GST Invoice</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Retail Receipt</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="warrantyId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warranty</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="No Warranty" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="none">None</SelectItem>{warranties?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                  <FormLabel className="text-lg font-black uppercase tracking-tight">Invoice Items</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
              </div>
              {fields.map((field, index) => {
                  const selectedProdId = watchedItems[index]?.productId;
                  const invItem = inventory?.find(i => i.productId === selectedProdId);
                  const stock = invItem?.stockBatches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
                  const product = allProducts?.find(p => p.id === selectedProdId);
                  const category = categoriesData?.find(c => c.id === product?.category);
                  const subCategory = subCategoriesData?.find(sc => sc.id === product?.subCategory);
                  
                  return (
                      <Card key={field.id} className={cn("border-2 shadow-sm overflow-hidden", selectedProdId ? "bg-primary/[0.03] border-primary/20" : "bg-card")}>
                          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 px-4 bg-muted/20 border-b gap-2">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item #{index + 1}</span>
                                  {selectedProdId && (
                                      <div className="flex flex-wrap gap-1">
                                          <Badge variant="outline" className="text-[10px] uppercase h-5 bg-blue-100 text-blue-700 border-blue-200">SKU: {product?.sku}</Badge>
                                          <Badge variant="outline" className="text-[10px] uppercase h-5 bg-purple-100 text-purple-700 border-purple-200">CAT: {category?.name}</Badge>
                                          {subCategory && <Badge variant="outline" className="text-[10px] uppercase h-5 bg-indigo-100 text-indigo-700 border-indigo-200">SUB: {subCategory.name}</Badge>}
                                          <Badge variant="outline" className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-1.5 h-5 border-orange-200">STOCK: {stock}</Badge>
                                      </div>
                                  )}
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive self-end sm:self-center" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                          </CardHeader>
                          <CardContent className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                  <div className="col-span-1 sm:col-span-5">
                                      <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                          <FormItem>
                                              <FormControl>
                                                  <Combobox
                                                      options={sortedProducts?.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })) || []}
                                                      value={f.value || ""}
                                                      onChange={(val) => handleProductSelect(val, index)}
                                                      placeholder="Select a product"
                                                      searchPlaceholder="Search products..."
                                                      notFoundText="No product found."
                                                  />
                                              </FormControl>
                                          </FormItem>
                                      )} />
                                  </div>
                                  <div className="col-span-1 sm:col-span-2">
                                      <FormField control={form.control} name={`items.${index}.handPreference`} render={({ field: f }) => ( <FormItem><Select onValueChange={f.onChange} value={f.value}><FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent>{handPreferences?.map(hp => <SelectItem key={hp.id} value={hp.name}>{hp.name}</SelectItem>)}</SelectContent></Select></FormItem> )} />
                                  </div>
                                  <div className="col-span-1 sm:col-span-2">
                                      <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => ( <FormItem><FormControl><Input type="number" {...f} className="h-10" /></FormControl></FormItem> )} />
                                  </div>
                                  <div className="col-span-1 sm:col-span-3">
                                      <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => ( <FormItem><FormControl><Input type="number" {...f} className="h-10 font-black" /></FormControl></FormItem> )} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  )
              })}
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Shipping & Logistics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="courierCompany" render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                            <FormLabel className="text-[10px] font-bold uppercase">Courier Company</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Courier" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sortedCouriers?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Tracking #</FormLabel>
                            <FormControl><Input placeholder="AWB Number" {...field} className="h-9" /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="numberOfBoxes" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Boxes</FormLabel>
                            <FormControl><Input type="number" {...field} className="h-9" /></FormControl>
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="trackingLink" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase">Tracking Link</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} className="h-9" /></FormControl>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-4 sm:p-6 rounded-xl border">
                <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Discounts & Method</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="paymentMethod" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-bold uppercase">Mode</FormLabel><Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="NEFT">NEFT</SelectItem></Select></FormItem>)} />
                      <FormField control={form.control} name="invoiceStatus" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-bold uppercase">Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Partially Paid">Partial</SelectItem></Select></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="manualDiscountPercentage" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-bold uppercase">Disc. (%)</FormLabel><FormControl><Input type="number" {...field} className="h-8" /></FormControl></FormItem> )} />
                      <FormField control={form.control} name="couponCode" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-bold uppercase">Coupon</FormLabel><FormControl><Input placeholder="Code" {...field} className="h-8" /></FormControl></FormItem> )} />
                    </div>
                </div>
                <div className="space-y-4 text-right">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Final Settlement</h4>
                    <FormField control={form.control} name="amountPaid" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-bold uppercase">Paid (₹)</FormLabel><FormControl><Input type="number" {...field} className="h-8 text-right" /></FormControl></FormItem> )} />
                    <div className="bg-muted p-2 rounded border border-dashed text-[10px] font-black uppercase inline-flex items-center gap-2">
                        <span className="text-muted-foreground">Balance Due:</span>
                        <span className="text-destructive font-bold text-sm">₹{balanceDue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border-2 border-primary/20 p-6 sm:p-8 bg-primary/5 shadow-inner space-y-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{totals.subTotal.toLocaleString()}</span></div>
                { totals.totalDiscount > 0 && <div className="flex justify-between text-sm text-destructive"><span>Discount</span><span className="font-bold">-₹{totals.totalDiscount.toLocaleString()}</span></div>}
                { watchedSaleType === 'GST' && (
                    <div className="space-y-1 border-y py-3 border-primary/10">
                        <div className="flex justify-between text-xs text-muted-foreground"><span>CGST + SGST</span><span>₹{(totals.cgstAmount + totals.sgstAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        { totals.igstAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>IGST</span><span>₹{totals.igstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>}
                    </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t-2 border-primary/20">
                    <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase">Net Payable</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">₹{totals.totalAmount.toLocaleString()}</span>
                </div>
            </div>

            {validationErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive space-y-2">
                    <p className="text-sm font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Please fix errors before saving:</p>
                    <ul className="list-disc list-inside text-xs">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
          </form>
        </Form>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-4 sm:p-6 pt-4 border-t bg-muted/10">
            <Button type="submit" form="sale-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Invoice</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
        <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => { setValue('customerId', c.id); setIsCustomerDialogOpen(false); }} />
      </DialogContent>
    </Dialog>
  );
}
