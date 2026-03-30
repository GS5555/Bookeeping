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
import { Sale, Customer, Product, Coupon, Brand, Courier, Store, Category, SubCategory, InventoryItem } from "@/lib/types";
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
import { CalendarIcon, PlusCircle, Trash2, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, setDoc } from "firebase/firestore";
import { CustomerDialog } from "@/app/customers/customer-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const STORE_ID = 'store_main';

const saleItemSchema = z.object({
    productId: z.string().optional(),
    sku: z.string().default(''),
    productName: z.string().default(''),
    brandId: z.string().optional(),
    handPreference: z.string().default('Normal'),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1.").default(1),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").default(0),
    hsnCode: z.string().optional().default(""),
    gstRate: z.number().default(0),
    color1: z.string().optional().default(""),
    color2: z.string().optional().default(""),
    categoryId: z.string().optional().default(""),
    subCategoryId: z.string().optional().default(""),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  storeId: z.string().min(1, "Store is required."),
  saleDate: z.date({ required_error: "Sale date is required." }),
  saleType: z.enum(["GST", "Cash", "Retail"], { required_error: "Sale type is required." }).default("GST"),
  items: z.array(saleItemSchema).min(1, "At least one product must be selected."),
  useDifferentShipping: z.boolean().default(false),
  shippingAddressId: z.string().optional().default(""),
  couponCode: z.string().optional().default(""),
  manualDiscountPercentage: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other", "Sponsored", "Replacement"]).default("Cash"),
  status: z.enum(["paid", "pending", "cancelled"]).default("paid"),
  amountPaid: z.coerce.number().min(0).optional().default(0),
  courierCompany: z.string().optional().default(""),
  trackingNumber: z.string().optional().default(""),
  trackingLink: z.string().url("Invalid tracking URL").or(z.literal("")).optional().default(""),
  numberOfBoxes: z.coerce.number().int().min(1).default(1),
  comments: z.string().optional().default(""),
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

  const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const storesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores } = useCollection<Store>(storesRef);

  const couriersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'couriers'), orderBy('name')) : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);

  const couponsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'coupons') : null, [firestore]);
  const { data: coupons } = useCollection<Coupon>(couponsRef);

  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const sortedProducts = useMemo(() => [...(allProducts || [])].sort((a, b) => a.name.localeCompare(b.name)), [allProducts]);
  const sortedCustomers = useMemo(() => [...(customers || [])].sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      storeId: STORE_ID,
      saleDate: new Date(),
      saleType: "GST",
      items: [{ productId: "", sku: '', productName: '', brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' }],
      useDifferentShipping: false,
      couponCode: "",
      manualDiscountPercentage: 0,
      paymentMethod: "Cash",
      status: "paid",
      numberOfBoxes: 1,
      comments: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { setValue, watch, reset, getValues } = form;

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

  const calculateTotals = (items: any[], type: string, storeId: string, custAddress: any, couponCode: string, manualDisc: number) => {
    const subTotalVal = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    
    let couponDiscountValue = 0;
    const coupon = coupons?.find(c => c.code === couponCode && c.isActive);
    if(coupon && subTotalVal >= coupon.minPurchaseAmount) {
      couponDiscountValue = coupon.discountType === 'percentage' ? (subTotalVal * coupon.discountValue) / 100 : coupon.discountValue;
    }
    
    const manualDiscountValue = (subTotalVal * (Number(manualDisc) || 0)) / 100;
    const totalDiscountValue = Math.min(subTotalVal, couponDiscountValue + manualDiscountValue);
    const taxableValue = subTotalVal - totalDiscountValue;
    
    const discountRatio = subTotalVal > 0 ? totalDiscountValue / subTotalVal : 0;

    let cgstVal = 0, sgstVal = 0, igstVal = 0;
    if(type === 'GST' && subTotalVal > 0) {
        const store = stores?.find(s => s.id === storeId);
        const isInterState = custAddress?.state !== store?.state;
        items.forEach(item => {
            if (!item.productId) return;
            const itemLineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            const itemTaxableValue = itemLineTotal * (1 - discountRatio);
            const itemGstTotal = itemTaxableValue * ((Number(item.gstRate) || 0) / 100);
            
            if (isInterState) {
                igstVal += itemGstTotal;
            } else {
                cgstVal += itemGstTotal / 2;
                sgstVal += itemGstTotal / 2;
            }
        });
    }
    
    const gstTotal = cgstVal + sgstVal + igstVal;
    const rawTotal = taxableValue + gstTotal;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    return { 
        subTotal: subTotalVal, 
        totalDiscount: totalDiscountValue, 
        couponDiscount: couponDiscountValue,
        manualDiscountAmount: manualDiscountValue,
        gstAmount: gstTotal,
        total: roundedTotal,
        roundOffAmount: roundOff,
        cgstAmount: cgstVal, 
        sgstAmount: sgstVal, 
        igstAmount: igstVal 
    };
  };

  const totals = useMemo(() => {
    return calculateTotals(watchedItems, watchedSaleType, watchedStoreId, primaryAddress, watchedCouponCode, watchedManualDiscount);
  }, [watchedItems, watchedCouponCode, watchedManualDiscount, watchedSaleType, watchedStoreId, primaryAddress, coupons, stores]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = allProducts?.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = watchedItems.findIndex((item, i) => item.productId === productId && i !== index);
    
    if (existingIndex > -1) {
        const currentQty = Number(getValues(`items.${existingIndex}.quantity`)) || 0;
        setValue(`items.${existingIndex}.quantity`, currentQty + (Number(getValues(`items.${index}.quantity`)) || 1));
        remove(index);
        toast({ title: "Item consolidated", description: `${product.name} quantity updated.` });
    } else {
        setValue(`items.${index}.productId`, product.id);
        setValue(`items.${index}.sku`, product.sku);
        setValue(`items.${index}.productName`, product.name);
        setValue(`items.${index}.brandId`, product.brand);
        setValue(`items.${index}.unitPrice`, product.finalPrice || product.sellingPrice);
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.gstRate`, product.gstRate);
        setValue(`items.${index}.categoryId`, product.category);
        setValue(`items.${index}.subCategoryId`, product.subCategory || '');
        
        if (index === fields.length - 1) {
            append({ productId: "", sku: '', productName: '', brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' });
        }
    }
  };

  const handleFormSubmit = (data: SaleFormValues) => {
    if (!customers || !allProducts || !brands || !currentUser) return;

    const validItems = data.items.filter(i => i.productId && i.productId !== "").map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        const brand = brands.find(b => b.id === item.brandId);
        return {
            ...item,
            productId: item.productId!,
            sku: item.sku || product?.sku || '',
            productName: product?.name || 'Unknown',
            brandName: brand?.name || 'Unknown',
            totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
            costOfGoodsSold: 0,
            discount: 0,
        };
    });

    if (validItems.length === 0) {
        toast({ title: "Validation Error", description: "Please select at least one product.", variant: "destructive" });
        return;
    }

    const customer = customers.find(c => c.id === data.customerId);
    const billingAddress = customer?.addresses.find(a => a.isPrimary) || customer?.addresses[0];

    const finalTotals = calculateTotals(validItems, data.saleType, data.storeId, billingAddress, data.couponCode, data.manualDiscountPercentage);

    const finalSale = JSON.parse(JSON.stringify({
      ...data,
      id: sale?.id || `sale_${Date.now()}`,
      customerName: customer?.name || 'Unknown',
      customerGstNumber: customer?.gstNumber || '',
      billingAddress: billingAddress!,
      items: validItems,
      subTotal: finalTotals.subTotal,
      gstAmount: finalTotals.gstAmount,
      cgstAmount: finalTotals.cgstAmount,
      sgstAmount: finalTotals.sgstAmount,
      igstAmount: finalTotals.igstAmount,
      couponDiscount: finalTotals.couponDiscount,
      manualDiscountAmount: finalTotals.manualDiscountAmount,
      roundOffAmount: finalTotals.roundOffAmount,
      total: finalTotals.total,
      balanceAmount: finalTotals.total - (data.status === 'paid' ? finalTotals.total : (data.amountPaid || 0)),
      saleDate: data.saleDate.toISOString(),
      courierCompany: data.courierCompany || "",
      trackingNumber: data.trackingNumber || "",
      trackingLink: data.trackingLink || "",
      comments: data.comments || "",
    }));

    onSuccess(finalSale);
  };

  useEffect(() => {
    if (open && sale) {
        reset({
            ...sale,
            saleDate: sale.saleDate ? new Date(sale.saleDate) : new Date(),
        } as any);
    } else if (open) {
        reset();
        append({ productId: "", sku: '', productName: '', brandId: "", handPreference: 'Normal', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0, color1: '', color2: '', categoryId: '', subCategoryId: '' });
    }
  }, [open, sale, reset, append]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] flex flex-col p-0" 
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer *</FormLabel>
                            <div className="flex items-center gap-2">
                                <Combobox
                                    options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Search customers..."
                                    searchPlaceholder="Type name..."
                                    notFoundText="No customer found."
                                />
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)} className="shrink-0 h-10 w-10"><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                        </FormItem>
                    )} />
                    {selectedCustomer && (
                        <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest"><MapPin className="h-3 w-3" /> Billing Address</div>
                                    <p className="text-sm font-medium">{primaryAddress?.street}, {primaryAddress?.city}</p>
                                </div>
                                {selectedCustomer.gstNumber && <Badge variant="outline" className="font-mono text-xs border-primary/30 bg-primary/5 text-primary">GSTIN: {selectedCustomer.gstNumber}</Badge>}
                            </div>
                            <FormField control={form.control} name="useDifferentShipping" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2 border-t">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <Label className="text-xs font-bold uppercase cursor-pointer">Ship to different address?</Label>
                                </FormItem>
                            )} />
                            {watchedUseDifferentShipping && (
                                <FormField control={form.control} name="shippingAddressId" render={({ field }) => (
                                    <FormItem className="pt-2">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select shipping address" /></SelectTrigger></FormControl>
                                            <SelectContent>{customerAddresses.map(addr => <SelectItem key={addr.id} value={addr.id}>{addr.street}, {addr.city}</SelectItem>)}</SelectContent>
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sale Date *</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full pl-3 text-left font-normal h-10 border-muted-foreground/50 bg-background">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="saleType" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="GST" /></FormControl><FormLabel className="font-normal">GST</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )} />
                </div>
            </div>

            <div className="space-y-4">
              <FormLabel className="text-lg font-black uppercase tracking-tight border-b pb-2 block">Invoice Items</FormLabel>
              {fields.map((field, index) => {
                  const selectedProdId = watchedItems[index]?.productId;
                  const product = allProducts?.find(p => p.id === selectedProdId);
                  const category = categories?.find(c => c.id === product?.category);
                  const subCategory = subCategories?.find(sc => sc.id === product?.subCategory);
                  const stockItem = inventory?.find(i => i.productId === selectedProdId);
                  const currentStock = stockItem?.stockBatches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
                  
                  return (
                      <Card key={field.id} className={cn("border-2 shadow-sm", selectedProdId ? "bg-primary/[0.03] border-primary/20" : "bg-card")}>
                          <CardHeader className="py-2 px-4 bg-muted/20 flex flex-row justify-between items-center">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Item #{index + 1}</span>
                                {product && (
                                    <div className="flex gap-1 flex-wrap">
                                        <Badge className="text-[9px] font-black h-5 bg-blue-100 text-blue-700 border-blue-200 uppercase">SKU: {product.sku}</Badge>
                                        <Badge className="text-[9px] font-black h-5 bg-green-100 text-green-700 border-green-200 uppercase">GST: {product.gstRate}%</Badge>
                                        <Badge className={cn("text-[9px] font-black h-5 uppercase", currentStock < 10 ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200")}>
                                            Stock: {currentStock}
                                        </Badge>
                                        {category && <Badge className="text-[9px] font-black h-5 bg-purple-100 text-purple-700 border-purple-200 uppercase">CAT: {category.name}</Badge>}
                                        {subCategory && <Badge className="text-[9px] font-black h-5 bg-orange-100 text-orange-700 border-orange-200 uppercase">SUB: {subCategory.name}</Badge>}
                                    </div>
                                )}
                             </div>
                             <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                          </CardHeader>
                          <CardContent className="p-4 grid grid-cols-12 gap-3 items-end overflow-visible">
                              <div className="col-span-12 sm:col-span-6 overflow-visible">
                                  <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                      <FormItem>
                                          <Combobox
                                              options={sortedProducts?.map(p => ({ 
                                                  value: p.id, 
                                                  label: `${p.name} (${p.sku})`,
                                                  searchTerms: `${p.name} ${p.sku}`.toLowerCase()
                                              })) || []}
                                              value={f.value || ""}
                                              onChange={(val) => handleProductSelect(val, index)}
                                              placeholder="Search Name or SKU..."
                                              searchPlaceholder="Type name or SKU..."
                                              notFoundText="No results."
                                          />
                                      </FormItem>
                                  )} />
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => <Input type="number" {...f} className="h-10 border-muted-foreground/50"/>} />
                              </div>
                              <div className="col-span-8 sm:col-span-4">
                                  <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => <Input type="number" {...f} className="h-10 font-black border-muted-foreground/50 bg-background" />} />
                              </div>
                          </CardContent>
                      </Card>
                  );
              })}
            </div>

            <Separator />

            <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping & Logistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="courierCompany" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-9 border-muted-foreground/50 bg-background"><SelectValue placeholder="Select Courier" /></SelectTrigger></FormControl>
                                <SelectContent>{couriers?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="trackingNumber" render={({ field }) => <FormItem><FormControl><Input placeholder="Tracking #" {...field} className="h-9 border-muted-foreground/50 bg-background" /></FormControl></FormItem>} />
                    <FormField control={form.control} name="numberOfBoxes" render={({ field }) => <FormItem><FormControl><Input type="number" {...field} className="h-9 border-muted-foreground/50 bg-background" /></FormControl></FormItem>} />
                </div>
            </div>

            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 space-y-3 shadow-sm">
                <div className="flex justify-between text-sm font-medium"><span>Subtotal</span><span className="font-bold">₹{totals.subTotal.toLocaleString()}</span></div>
                {totals.totalDiscount > 0 && <div className="flex justify-between text-sm text-destructive"><span>Discount</span><span className="font-bold">-₹{totals.totalDiscount.toLocaleString()}</span></div>}
                {watchedSaleType === 'GST' && (
                    <>
                        <div className="flex justify-between text-xs text-muted-foreground"><span>CGST</span><span>₹{totals.cgstAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs text-muted-foreground"><span>SGST</span><span>₹{totals.sgstAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs text-muted-foreground"><span>IGST</span><span>₹{totals.igstAmount.toLocaleString()}</span></div>
                    </>
                )}
                {Math.abs(totals.roundOffAmount) > 0.01 && (
                    <div className="flex justify-between text-xs italic text-muted-foreground border-t pt-2 mt-2">
                        <span>Round Off Adjustment</span>
                        <span className={cn("font-bold", totals.roundOffAmount < 0 ? "text-destructive" : "text-green-600")}>
                            {totals.roundOffAmount < 0 ? '-' : '+'}₹{Math.abs(totals.roundOffAmount).toFixed(2)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t-2 border-primary/20">
                    <span className="text-xl font-black uppercase tracking-tight">Net Payable</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">₹{totals.total.toLocaleString()}</span>
                </div>
            </div>
          </form>
        </Form>
        <DialogFooter className="p-4 border-t bg-muted/10">
            <Button type="submit" form="sale-form" className="font-black uppercase tracking-widest px-8">Save Invoice</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
        <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => { setValue('customerId', c.id); setIsCustomerDialogOpen(false); }} />
      </DialogContent>
    </Dialog>
  );
}
